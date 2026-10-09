// The art layer over the primitive renderer: room floors and walls out of the pixel swatches, every
// unit through `character()` (a pixel sprite in a frame of leans, collar and wounds), and the few
// painted props no pixel sprite exists for yet. Collision radii never read any of it.
// `ATLAS_CELL` is the old painted atlas's layout (four by four, 128px cells), kept because the pixel props are fitted to it.
const ATLAS_CELL = {
  'cage-bars': [0, 0], 'cage-broken': [128, 0], 'mill-hub': [256, 0], 'mill-arm': [384, 0],
  'spikes-idle': [0, 128], 'spikes-arming': [128, 128], 'spikes-up': [256, 128], 'weapon-stand': [384, 128],
  sword: [0, 256], shield: [128, 256], 'healing-grass': [256, 256], 'soul-wisp': [384, 256],
  'secret-wall': [0, 384], 'crate-debris': [128, 384], 'brazier-unlit': [256, 384], worktable: [384, 384],
};
// The carpets' grain (`PaintedArt.carpet`): `CARPET_N` texels a tile (1.6 world px, the props' size),
// baked at `CARPET_UP` canvas px a texel. Each weave is a palette: the edge, the border band and its
// motif, the pale guard lines, the field and its lattice, the medallion and the head in it, the
// fringe, the dust it wears toward, and the stain. Colours of one sprite each, so not in PALETTE.
const CARPET_N = 20, CARPET_UP = 4;
const CARPET_STYLES = [
  // Soft and dark (2 Oct 2026: "much softer colors, less bright, dark green and dark blue"): two greens
  // and two blues, each with its border in the other, the motif only a step off the band it sits in.
  { edge: '#0f1712', border: '#1e2b22', motif: '#34463a', guard: '#425244', field: '#24342a', lattice: '#203026', medal: '#19251d', emblem: '#4c5c4e', fringe: '#6a6a5e', fringeDk: '#4e4e46', dust: '#3a3e38', blood: '#24100f', bloodRim: '#2c1413' },
  { edge: '#0d121a', border: '#1c2430', motif: '#363f4c', guard: '#414955', field: '#222a35', lattice: '#1e2530', medal: '#171d26', emblem: '#4c5462', fringe: '#68686c', fringeDk: '#4c4c52', dust: '#36383e', blood: '#22100f', bloodRim: '#2a1414' },
  { edge: '#0e1416', border: '#1c252e', motif: '#38424c', guard: '#425050', field: '#223228', lattice: '#1e2c24', medal: '#192433', emblem: '#4c5c58', fringe: '#6a6a62', fringeDk: '#4e4e48', dust: '#383c3a', blood: '#24100f', bloodRim: '#2c1413' },
  { edge: '#0e1512', border: '#1e2c24', motif: '#36483c', guard: '#405050', field: '#212a34', lattice: '#1d252f', medal: '#1b2922', emblem: '#4c5c56', fringe: '#686a66', fringeDk: '#4c4e4a', dust: '#36393c', blood: '#22100f', bloodRim: '#2a1414' },
];
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// How far below a tile's centre a thing standing on that tile puts its feet: the middle of the tile
// in a camera tilted this little, not its bottom or top edge.
// The shade gathered under a brazier's three feet (`drawProp`).
const BRAZIER_POOL=[[0,'rgba(0,0,0,0.42)'],[0.6,'rgba(0,0,0,0.2)'],[1,'rgba(0,0,0,0)']];
const PROP_FOOT = 3;
// Where the shieldman's board sits on him at each of the eight facings (0 east, 2 toward the camera, 6 away
// from it): its middle in px off his feet, which view of it (`mshield<look>-f` face, `-s` edge, `-b` back), whether
// it goes under him, and mirrored (`PaintedArt.board`). `k`: world px a texel. On his right arm (2 Oct 2026, the
// user's), so from the front his belly shows beside it.
const BOARD_POSE = Object.assign([
  { v: 's', x: 9, y: -15, under: false },
  { v: 'f', x: 1, y: -12, under: false },
  { v: 'f', x: -10, y: -14, under: false },
  { v: 'f', x: -12, y: -14, under: false, flip: true },
  { v: 's', x: -10, y: -15, under: true, flip: true },
  { v: 'b', x: -3, y: -18, under: true, flip: true },
  { v: 'b', x: 10, y: -16, under: true },
  { v: 'b', x: 12, y: -15, under: true },
], { k: 0.8 });
// The painted props' own sizes, kept after their images went (1.74, `js/painted-assets.js` retired):
// the pixel sprites that replaced them are fitted into the box the painting filled, and a caller
// that gives only a width takes its height off these proportions.
const PAINTED_SIZE = {
  altar: [384, 237], banner: [135, 192], gong: [192, 190], cagePostTight: [20, 128], cageBrokenTight: [128, 40],
  slabWoodClosed: [26, 116], slabIronClosed: [26, 116], slabVaultClosed: [26, 116], slabSoulClosed: [26, 116],
};

// The states a man may stand about in and breathe (`TUNING.menIdle`).
const MEN_IDLE = new Set(['idle', 'wander', 'noticed', 'investigate', 'chase', 'orbit', 'patrol']);
// A body again as flat venom green (~139,210,0 whatever its colours): the poison's tint on a man and on the goat
// (`status.look.tint` / `goatTint`), laid over the sprite the way the hit flash is, masked to its own pixels.
const POISON_FILTER = 'brightness(0) invert(0.6) sepia(1) saturate(6) hue-rotate(35deg)';
class PaintedArt extends AltarArt {
  // Nothing to load since 1.74: every prop is a pixel sprite (`js/prop-pixels.js`), and the painted
  // images these methods once drew are gone. `images` stays empty for the few that still ask it.
  constructor() {
    super(); this.images = {}; this.failed = []; this.ready = true;
  }

  stamp(ctx, key, x, y, w, h, anchor = 0.5) {
    const image = this.images[key]; if (!image || !image.naturalWidth) return;
    if (h === undefined) h = w * image.naturalHeight / image.naturalWidth;
    const smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, x - w / 2, y - h * anchor, w, h);
    ctx.imageSmoothingEnabled = smooth;
  }

  // Crops one cell out of a sprite sheet, the shared primitive under every animated stamp below,
  // used for the expansion pack's walk cycles, fire loops, door states and props atlas.
  drawFrame(ctx, image, sx, sy, sw, sh, x, y, w, h, anchor = 0.5) {
    if (!image || !image.naturalWidth) return false;
    const smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, sx, sy, sw, sh, x - w / 2, y - h * anchor, w, h);
    ctx.imageSmoothingEnabled = smooth;
    return true;
  }

  // objects/atlas.png: one 128px cell per named prop. `h` defaults to `w`, every cell is square.
  atlas(ctx, name, x, y, w, h, anchor = 0.5) {
    const cell = ATLAS_CELL[name]; if (!cell) return false;
    return this.drawFrame(ctx, this.images.propsAtlas, cell[0], cell[1], 128, 128, x, y, w, h === undefined ? w : h, anchor);
  }

  // The three lit fixtures each get one 8-frame, 10fps loop: the whole fixture animates in the
  // sheet, so nothing else is drawn under it.
  fire(renderer, key, x, y, w, anchor = 0.875) {
    const col = Math.floor(renderer.t * 10) % 8;
    return this.drawFrame(renderer.ctx, this.images[key], col * 128, 0, 128, 128, x, y, w, w, anchor);
  }

  // The mill arm's source art is one fixed-proportion beam, not a tileable strip, so it is stretched
  // to the tuned arm length rather than repeated. `x` is the inner edge (by the hub), `len` the span
  // out to the iron tip; height is cosmetic only, collision stays on `TUNING.mill`, untouched.
  millArm(ctx, x, len) {
    const image = this.images.propsAtlas; if (!image || !image.naturalWidth) return false;
    const cell = ATLAS_CELL['mill-arm'];
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, cell[0], cell[1], 128, 128, x, -15, len, 30);
    ctx.imageSmoothingEnabled = smooth;
    return true;
  }

  // A pixel swatch multiplied by one of the level's colours, baked once into a canvas of its own:
  // multiplying per tile per frame doubled the cost of every floor.
  swatch(id, tint) {
    this.swatches ||= new Map();
    const key = id + tint; let c = this.swatches.get(key); if (c) return c;
    const f = PIXEL_ENV_ASSETS.items[id]; c = document.createElement('canvas'); c.width = f[2]; c.height = f[3];
    const x = c.getContext('2d'); x.drawImage(PIXEL_ENV.image, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = PIXEL_ENV.lift(tint, PIXEL_ROOMS.lift); x.fillRect(0, 0, f[2], f[3]);
    this.swatches.set(key, c); return c;
  }
  rooms(def) { return PIXEL_ROOMS[def.canon && def.canon.id] || PIXEL_ROOMS.stone; }
  // One swatch a canon, in the level's one floor colour, on every tile. A floor is ground to run
  // over: a tile in a second swatch, or in `floorAlt` one tile in five, read as a thing lying on it
  // (24 Sep 2026: "so much noise it reads almost as an obstacle"), and two swatches never shared an
  // edge. A swatch whose edges do not meet themselves (`mirror`: the Yard's cobbles) is laid flipped
  // on every other column and row, so each seam joins a column of texels to its own mirror image
  // and the stones carry on across it. `h` is no longer read; `tx`, `ty` are the tile.
  floorSwatch(def, h, boards, tx = 0, ty = 0) {
    const R = this.rooms(def), id = boards ? R.boards : R.floor, base = this.swatch(id, def.floor);
    // The floor as one seamless sheet in world space (`FLOOR_SHEET`), unless the ART tab asks for the
    // packed swatch stamped a tile at a time.
    const kind = ART_PASS.floors && (boards ? 'boards' : R.sheet);
    if (kind) return FLOOR_SHEET.tile(base, kind, id + def.floor + kind, tx, ty);
    const flip = !boards && R.mirror ? (tx & 1) | (ty & 1) << 1 : 0;
    if (!flip) return base;
    this.flips ||= new Map();
    const key = id + def.floor + flip; let c = this.flips.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
    const x = c.getContext('2d');
    x.translate(flip & 1 ? c.width : 0, flip & 2 ? c.height : 0); x.scale(flip & 1 ? -1 : 1, flip & 2 ? -1 : 1);
    x.drawImage(base, 0, 0);
    this.flips.set(key, c); return c;
  }

  // Every sheet a floor will draw, painted before the floor is entered: its floor, its boards, its
  // wall's cap and brick face. `prepare` does the same on a floor's first frame, and there it froze
  // that frame for 0.15–0.45 s (measured 26 Sep 2026); this runs it while the title or the cards
  // after a floor are up instead (`Game`), so the floor opens on a frame that is already paid for.
  // The cave and the trip draw their own ground and need none. Returns false while the atlas loads.
  warmLevel(def) {
    if (def && def.cave && !def.shroom && PIXEL_ENV.ready && ART_PASS.cave && def.floor) PIXEL_ENV.caveTile(def.floor, 0, 0);
    if (!def || def.cave || def.shroom || !PIXEL_ENV.ready) return !!(def && (def.cave || def.shroom));
    this.floorSwatch(def, 0, false, 0, 0); this.floorSwatch(def, 0, true, 0, 0);
    const W = PIXEL_ROOMS.wall;
    if (ART_PASS.floors) FLOOR_SHEET.faceStrip(this.swatch(W.face, def.wall), 'face' + def.wall, W.faceH, 0);
    this.wallCap(def);
    return true;
  }

  // The cap of every wall is one sheet of coursed stone, `sheet` tiles square and seamless at its
  // borders, laid in world space: each wall tile shows the part of the sheet over it, so a run of
  // wall reads as one piece of masonry, not as one square stamped again every tile. Its colour is
  // the old cap swatch's in the level's `wallTop`, so a level keeps the wall it was tuned with.
  wallCap(def) {
    this.caps ||= new Map();
    let c = this.caps.get(def.wallTop); if (c) return c;
    const W = PIXEL_ROOMS.wall, S = W.sheet * 64, C = W.course, M = 2, lo = W.block[0], hi = W.block[1];
    const d = this.swatch(W.top, def.wallTop).getContext('2d').getImageData(0, 0, 64, 64).data, avg = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) avg[k] += d[i + k] / (d.length / 4);
    const tone = (m) => 'rgb(' + avg.map((v) => Math.min(255, Math.round(v * m))).join(',') + ')';
    c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    // a block that runs off the sheet's right edge comes back on its left, so every course wraps
    const put = (m, bx, by, bw, bh) => {
      x.fillStyle = tone(m); bx = ((bx % S) + S) % S;
      x.fillRect(bx, by, bw, bh); if (bx + bw > S) x.fillRect(bx - S, by, bw, bh);
    };
    x.fillStyle = tone(0.62); x.fillRect(0, 0, S, S);
    for (let row = 0, k = 0; row < S / C; row++) {
      const y = row * C, start = this.hash(row, 7, 911) % S, joints = [start];
      for (let at = start; ;) {
        const len = lo + this.hash(row, k++, 912) % (hi - lo + 1);
        if (at + len + lo > start + S) break;
        joints.push(at += len);
      }
      joints.push(start + S);
      for (let j = 0; j + 1 < joints.length; j++) {
        const bx = joints[j] + M, bw = joints[j + 1] - joints[j] - M, h = this.hash(row, j, 913), t = [0.93, 1, 1, 1.06][h % 4];
        put(t, bx, y + M, bw, C - M);
        put(t * 1.1, bx, y + M, bw, 2);
        put(t * 0.88, bx, y + C - 2, bw, 2);
        for (let q = 0; q < 1 + (h >>> 4) % 3; q++) {
          const g = this.hash(row * 31 + j, q, 914);
          put(t * 0.86, bx + 2 + g % Math.max(1, bw - 6), y + M + 3 + (g >>> 8) % (C - M - 7), 2, 2);
        }
      }
    }
    this.caps.set(def.wallTop, c); return c;
  }

  // Bits name the exposed sides, not the room edge: N=1, E=2, S=4, W=8; then an open diagonal whose
  // two sides are both stone, NE=16, SE=32, SW=64, NW=128, the inside corners, where an edge turns
  // with neither tile open on that side.
  // The camera looks north and down, so a wall shows its brick face on ONE side only: the south one,
  // facing the lens. That is the far wall of a room and the front of every block, one height for all
  // of them, so a face runs on unbroken from tile to tile and round the foot of an L. Every other
  // exposed side is only the edge of the cap: a dark outline where it drops to the floor, a lit lip
  // inside it on the north and west (the light is from the top left), a shaded one on the east.
  // This is only that overlay, `wallCap` goes down under it.
  wallTile(def, mask) {
    this.wallTiles ||= new Map();
    // With the sheets on (`ART_PASS.floors`) the brick face is not in this overlay: `drawWall` lays it
    // from one strip in world space first, and the lips and shadows here go over it as before.
    const strip = ART_PASS.floors, key = def.wall + '|' + mask + (strip ? '|s' : '');
    if (this.wallTiles.has(key)) return this.wallTiles.get(key);
    const W = PIXEL_ROOMS.wall, T = 64, F = W.faceH, o = 2, tile = document.createElement('canvas');
    tile.width = tile.height = T;
    const c = tile.getContext('2d'), n = mask & 1, e = mask & 2, s = mask & 4, w = mask & 8;
    const capB = s ? T - F : T, x0 = w ? o : 0, x1 = e ? T - o : T, y0 = n ? o : 0, lipB = capB - (s ? o : 0);
    const band = (style, bx, by, bw, bh) => { if (bw > 0 && bh > 0) { c.fillStyle = style; c.fillRect(bx, by, bw, bh); } };
    if (n) band('rgba(232,210,186,0.24)', x0, y0, x1 - x0, o);
    if (w) band('rgba(232,210,186,0.14)', x0, y0 + (n ? o : 0), o, lipB - y0 - (n ? o : 0));
    if (e) band('rgba(10,7,12,0.24)', x1 - o, y0 + (n ? o : 0), o, lipB - y0 - (n ? o : 0));
    if (s) {
      if (!strip) {
        c.save(); c.beginPath(); c.rect(0, capB, T, F); c.clip();
        c.drawImage(this.swatch(W.face, def.wall), 0, capB - W.faceFrom, T, T);
        c.restore();
      }
      // the lower third in the floor's shadow, a flat step and not a gradient; then the lit lip of
      // the cap over the face, the shadow line under it, and the foot
      band('rgba(10,7,12,0.14)', 0, T - (F / 3 | 0), T, F / 3 | 0);
      band('rgba(232,210,186,0.3)', x0, capB - o, x1 - x0, o);
      band('rgba(8,5,10,0.55)', 0, capB, T, o);
      band('rgba(8,5,10,0.5)', 0, T - o, T, o);
    }
    // the outline where the stone drops to the floor: the open sides, then the inside corners
    const ink = 'rgba(8,5,10,0.62)';
    if (n) band(ink, 0, 0, T, o);
    if (w) band(ink, 0, n ? o : 0, o, T - (n ? o : 0));
    if (e) band(ink, T - o, n ? o : 0, o, T - (n ? o : 0));
    if (mask & 16) band(ink, T - o, 0, o, o);
    if (mask & 128) band(ink, 0, 0, o, o);
    // An open diagonal below: the neighbour's face ends against this cap, so the outline of the arm
    // running south carries on up beside that face as far as the neighbour's cap.
    if (mask & 32) band(ink, T - o, T - F - o, o, F + o);
    if (mask & 64) band(ink, 0, T - F - o, o, F + o);
    this.wallTiles.set(key, tile); return tile;
  }

  // `tx`, `ty` pick the cap's part of the sheet; left out, they are read off the position.
  drawWall(ctx, def, x, y, mask, tx = Math.round(x / TILE), ty = Math.round(y / TILE)) {
    const P = PIXEL_ROOMS.wall.sheet;
    ctx.drawImage(this.wallCap(def), ((tx % P) + P) % P * 64, ((ty % P) + P) % P * 64, 64, 64, x, y, TILE, TILE);
    if (ART_PASS.floors && (mask & 4)) {
      const W = PIXEL_ROOMS.wall, F = W.faceH;
      ctx.drawImage(FLOOR_SHEET.faceStrip(this.swatch(W.face, def.wall), 'face' + def.wall, F, tx), x, y + (64 - F) / 64 * TILE, TILE, F / 64 * TILE);
    }
    ctx.drawImage(this.wallTile(def, mask), x, y, TILE, TILE);
  }

  // `box` is a region of tiles to paint instead of the view: a chunk being baked, or one painted live
  // while it waits its turn (`Renderer.drawRoomsBaked`).
  drawTiles(renderer, game, cam, box) {
    this.prepare(game);
    const ctx = renderer.ctx, wd = game.world, b = box || renderer.visibleTiles(cam), lvDef = game.level.def;
    // THE SHOWROOM lays each floor's stone in its own stretch of the world (`level.zones`).
    const zones = game.level.zones, zoneDefs = game.level.zoneDefs;
    let def = lvDef;
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    // A wall that gives (`carveSecret`) stands on a floor tile until it is broken, and is drawn as a
    // prop; to its neighbours it is stone, or the niche behind it showed a face of its own over it.
    const shut = this.shutWalls ||= new Set(); shut.clear();
    for (const p of game.props) if (p.kind === 'secret' && !p.broken) shut.add(Math.floor(p.y / TILE) * wd.W + Math.floor(p.x / TILE));
    const stone = (x, y) => wd.isSolid(x, y) || (shut.size > 0 && shut.has(y * wd.W + x));
    // Litter is for bare floor: a brazier or a table stood on a scatter of pebbles read as a bug
    // (29 Sep 2026, "the brazier on stones"). The tiles under standing furniture get none.
    const under = this.underFurniture ||= new Set(); under.clear();
    for (const p of game.props) if (p.blocking && !p.item && p.kind !== 'door') under.add(Math.floor(p.y / TILE) * wd.W + Math.floor(p.x / TILE));
    for (let y=b.y0; y<=b.y1; y++) for (let x=b.x0; x<=b.x1; x++) {
      const t=wd.tileAt(x,y), px=x*TILE, py=y*TILE, h=this.hash(x,y,game.level.seed);
      if (zones) def = zoneDefs[zones[y*wd.W+x]] || lvDef;
      // (the wall that gives is drawn here as well as by its prop, so its smoothed edges fall on stone)
      if (t===T.WALL||(shut.size>0&&shut.has(y*wd.W+x))) {
        const n=!stone(x,y-1),s=!stone(x,y+1),w=!stone(x-1,y),e=!stone(x+1,y);
        if (!(n||s||w||e||!stone(x-1,y-1)||!stone(x+1,y-1)||!stone(x-1,y+1)||!stone(x+1,y+1))) continue;
        // A wall tile with floor on all four sides is a template's `P`, a pillar standing in the room,
        // and it is drawn as one rather than as a cube of the room's wall. It runs up over the tile
        // behind it, which this row-by-row pass has already drawn, so nothing paints over its top.
        if (n&&s&&w&&e) {
          ctx.drawImage(this.floorSwatch(def,h,false,x,y),px,py,TILE+PIXEL_ROOMS.bleed,TILE+PIXEL_ROOMS.bleed);
          renderer.shadow(px+16,py+27,13,5);
          PIXEL_ENV.draw(ctx,'pillar',px+16,py+31,27);
          continue;
        }
        // an open diagonal counts only where both its sides are stone: an inside corner of the outline
        let m=(n?1:0)|(e?2:0)|(s?4:0)|(w?8:0);
        if(!n&&!e&&!stone(x+1,y-1))m|=16; if(!s&&!e&&!stone(x+1,y+1))m|=32;
        if(!s&&!w&&!stone(x-1,y+1))m|=64; if(!n&&!w&&!stone(x-1,y-1))m|=128;
        this.drawWall(ctx,def,px,py,m,x,y);
        if (s&&x%5===1&&h%3!==0&&!w&&!e) this.stamp(ctx,'banner',px+16,py+18,13,17,0.2);
        continue;
      }
      if (t===T.PIT) continue;
      const wood=this.boards[y*wd.W+x];
      // Half a pixel over onto the next tile, which is drawn after it: two smoothed tiles edge to
      // edge on a fractional pixel each cover it only partly, and the dark under them showed through
      // as a grid line round every tile.
      ctx.drawImage(this.floorSwatch(def,h,wood,x,y),px,py,TILE+PIXEL_ROOMS.bleed,TILE+PIXEL_ROOMS.bleed);
      ctx.fillStyle=PALETTE.altar.shadow;
      // The wall's shadow on the floor under it. Not a pillar's: that has its own round shadow at its
      // foot, and a hard strip beside it drew a square round the pillar's tile, a tile edge to the eye.
      const post=(sx,sy)=>!stone(sx,sy-1)&&!stone(sx,sy+1)&&!stone(sx-1,sy)&&!stone(sx+1,sy);
      if(stone(x,y-1)&&!post(x,y-1))ctx.fillRect(px,py,32,5);
      if(stone(x-1,y)&&!post(x-1,y))ctx.fillRect(px,py,3,32);
      if(t===T.HAY)PIXEL_ENV.draw(ctx,'hay',px+16,py+29,33);
      else if(t===T.FLOOR&&!wood&&!wd.isSolid(x,y-1)&&!under.has(y*wd.W+x))PIXEL_ENV.litter(ctx,'room',x,y);
      else if(t===T.ASH)this.ashTile(ctx,px,py,h);
      else if(t===T.EXIT)renderer.drawStairs(px,py,x-game.level.exitTile.x0,true,game.level.def,Renderer.forkRow(game.level,y));
      else if(t===T.ENTRY)renderer.drawStairs(px,py,x-game.level.entry.x0,false,game.level.def);
      else if(wd.isSolid(x,y-1)&&h%5===0)this.straw(ctx,px+16,py+6,h,false);
    }
    // The carpets (`layCarpets`, gen.js) over the floor they lie on, whole, after every tile: each has a
    // tile of plain floor round it, so nothing standing up out of the next row is painted over.
    const cps = game.level.carpets;
    if (cps) for (const c of cps) {
      if (c.x + c.w < b.x0 || c.x > b.x1 || c.y + c.h < b.y0 || c.y > b.y1) continue;
      ctx.drawImage(this.carpet(c), c.x * TILE, c.y * TILE, c.w * TILE, c.h * TILE);
    }
    ctx.imageSmoothingEnabled = smooth;
  }

  // One carpet as pixels, `CARPET_N` texels a tile, baked once at `CARPET_UP` a texel and drawn smoothed
  // like a prop. A long rug: fringe on its two short ends, a dark edge, a border band of the cult's
  // horns and lozenges between two pale guard lines, a field with a lattice in it and a lozenge
  // medallion with the horned head in the middle, worn pale where feet go, and now and then a stain
  // nobody got out (`c.blood`). Its own hash off `c.seed`: the same carpet every time it is baked.
  carpet(c) {
    const cache = this.carpetCache ||= new WeakMap();
    if (cache.has(c)) return cache.get(c);
    const N = CARPET_N, long = c.w >= c.h, LW = (long ? c.w : c.h) * N, SW = (long ? c.h : c.w) * N;
    const P = CARPET_STYLES[c.style % CARPET_STYLES.length], px = new Array(LW * SW);   // a colour per texel, by index (a Map of 7200 was most of the bake)
    let s = c.seed >>> 0; const r = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    // u runs along the rug, v across it; the canvas is turned to fit the way the rug lies.
    const set = (u, v, col) => { if (u >= 0 && v >= 0 && u < LW && v < SW && col) px[long ? v * LW + u : u * SW + v] = col; };
    const FR = 3, u0 = FR, u1 = LW - FR - 1, v0 = 1, v1 = SW - 3;   // the woven part; v1 + 1 is its shadow
    for (let u = u0; u <= u1; u++) for (let v = v0; v <= v1; v++) {
      const eu = Math.min(u - u0, u1 - u), ev = Math.min(v - v0, v1 - v), e = Math.min(eu, ev);
      let col;
      if (e === 0) col = P.edge;
      else if (e === 1 || e === 6) col = P.guard;
      else if (e < 6) {
        // The border: a horn (a V) and a lozenge in turn, along whichever side this is.
        const along = ev <= eu ? u - u0 : v - v0, k = ((along % 10) + 10) % 10, d = e - 3.5;
        const horn = k < 5 && Math.abs(Math.abs(k - 2) - (d + 1.5)) < 0.6;
        const loz = k >= 5 && Math.abs(k - 7.5) + Math.abs(d) <= 1.6;
        col = horn || loz ? P.motif : P.border;
      } else {
        // The field: a lattice of diamonds, a lozenge medallion in the middle with the horned head.
        const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, du = Math.abs(u - cu), dv = Math.abs(v - cv);
        const mR = Math.min(((u1 - u0) / 2 - 8) / 1.6, (v1 - v0) / 2 - 8), m = du / 1.6 + dv;
        if (mR > 5 && m <= mR) col = m >= mR - 1 ? P.guard : P.medal;
        else col = ((u + v) % 9 === 0 || ((u - v) % 9 + 9) % 9 === 0) ? P.lattice : P.field;
        if (mR > 5 && m <= mR - 3) {
          // The head: two horns sweeping up and out, a long face, two eyes; 9 x 9 about the middle.
          const x = Math.round(long ? u - cu : v - cv), y = Math.round(long ? v - cv : u - cu), ax = Math.abs(x);
          if ((y === -4 && (ax === 4 || ax === 3)) || (y === -3 && (ax === 3 || ax === 2)) || (y === -2 && ax <= 2 && ax >= 1)
            || (y >= -1 && y <= 2 && ax <= 1 && !(y === 0 && ax === 1)) || (y === 3 && ax === 0)) col = P.emblem;
        }
      }
      set(u, v, col);
    }
    // Wear: a few pale patches where the cult walks it, and a speckle of thread gone.
    const wear = (col, k) => { const a = hexRgb(col), b = hexRgb(P.dust); return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * k)).join(',')})`; };
    const worn = new Map();
    for (let n = 0; n < 2 + Math.floor(r() * 3); n++) {
      const wu = u0 + 4 + r() * (u1 - u0 - 8), wv = v0 + 3 + r() * (v1 - v0 - 6), wr = 3 + r() * 4;
      for (let u = Math.floor(wu - wr); u <= wu + wr; u++) for (let v = Math.floor(wv - wr); v <= wv + wr; v++) {
        const d = Math.hypot((u - wu) / 1.4, v - wv) / wr; if (d < 1 && r() < 1 - d * 0.7) worn.set(long ? v * LW + u : u * SW + v, 0.22 + 0.18 * (1 - d));
      }
    }
    for (let n = 0; n < LW * SW * 0.02; n++) { const u = u0 + Math.floor(r() * (u1 - u0)), v = v0 + Math.floor(r() * (v1 - v0)); worn.set(long ? v * LW + u : u * SW + v, 0.3); }
    for (const [i, k] of worn) if (px[i]) px[i] = wear(px[i], k);
    // A stain: a blot of old blood, ragged at its rim.
    if (c.blood) {
      const bu = u0 + 8 + r() * (u1 - u0 - 16), bv = v0 + 5 + r() * (v1 - v0 - 10), br = 3 + r() * 4;
      for (let u = Math.floor(bu - br - 2); u <= bu + br + 2; u++) for (let v = Math.floor(bv - br); v <= bv + br; v++) {
        const d = Math.hypot((u - bu) / 1.3, v - bv) / br + (r() - 0.5) * 0.35;
        if (d < 1) set(u, v, d < 0.6 ? P.blood : P.bloodRim);
      }
    }
    // The fringe: threads off both short ends, a few short or gone; and the rug's own shadow under its near edge.
    for (const end of [0, 1]) for (let v = v0 + 1; v < v1; v += 2) {
      const n = r() < 0.12 ? 0 : 1 + Math.floor(r() * 3);
      for (let k = 1; k <= n; k++) set(end ? u1 + k : u0 - k, v, k === n ? P.fringeDk : P.fringe);
    }
    for (let u = u0 + 1; u <= u1; u++) set(u, v1 + 1, 'rgba(10,6,8,0.38)');
    const W = long ? LW : SW, H = long ? SW : LW;
    // Texels go into an image a pixel each and are scaled up once, unsmoothed: a fillStyle parsed and a
    // fillRect per texel cost 5-9 ms a rug (2 Oct 2026), paid inside the frame that baked its room.
    const one = document.createElement('canvas'); one.width = W; one.height = H;
    const o = one.getContext('2d'), img = o.createImageData(W, H), d = img.data, rgba = new Map();
    const parse = (col) => {
      let q = rgba.get(col); if (q) return q;
      if (col[0] === '#') q = [...hexRgb(col), 255];
      else { const n = col.slice(col.indexOf('(') + 1, -1).split(',').map(Number); q = [n[0], n[1], n[2], n.length > 3 ? Math.round(n[3] * 255) : 255]; }
      rgba.set(col, q); return q;
    };
    let last = null, q = null;   // a run of one colour is parsed once
    for (let i = 0; i < px.length; i++) { const col = px[i]; if (!col) continue; if (col !== last) { q = parse(col); last = col; } const j = i * 4; d[j] = q[0]; d[j + 1] = q[1]; d[j + 2] = q[2]; d[j + 3] = q[3]; }
    o.putImageData(img, 0, 0);
    const cv = document.createElement('canvas'); cv.width = W * CARPET_UP; cv.height = H * CARPET_UP;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(one, 0, 0, cv.width, cv.height);
    cache.set(c, cv);
    return cv;
  }

  drawRitual(renderer, game) {
    const ctx=renderer.ctx, wd=game.world;
    // The stone base, candles and the two earlier sacrifices' bones are the procedural layer
    // underneath. Bones, not ghost sheep. The altar itself is a real Prop now, see drawProp, and
    // draws in its own turn through the ordinary prop pass, not here.
    if (wd.ritualArt) ctx.drawImage(wd.ritualArt.canvas, wd.ritualArt.x, wd.ritualArt.y);
    // The corner store (a barrel, straw) is real furniture on the floor now, put down with the
    // altar in `Game.startLevel`; painted into the wall band it read as stuck in the stone.
  }

  drawProp(renderer,p) {
    if(!this.ready)return super.drawProp(renderer,p);
    const ctx=renderer.ctx;
    // The ritual altar: a real, blocking, breakable table tagged only so it keeps its own art
    // instead of the plain procedural table every other one falls back to.
    if(p.kind==='table'&&p.isAltar){
      ctx.save();ctx.translate(p.x,p.y);
      if(p.flung)ctx.rotate(Math.atan2(p.vy,p.vx));
      renderer.shadow(0,8,48,15);
      this.stamp(ctx,'altar',0,0,108,undefined,0.58);
      ctx.restore();return true;
    }
    // Lit fixtures: the whole fixture is an animated loop now, so the old static bowl/post is gone.
    if(p.kind==='brazier'&&p.roast){renderer.drawRoast(p);return true;}
    // The pixel brazier's coals are painted in, so only the flame over them moves; it still drops
    // when the coals are knocked out and builds back, which is how the bowl says when it is ready.
    if(p.kind==='brazier'&&PIXEL_ENV.ready){
      const w=p.r*2.7;
      // Standing in the middle of its tile: the feet on the tile's centre, not on its bottom edge.
      const foot=p.y+PROP_FOOT;
      // A soft pool gathered under the three feet, not the hard disc every body stands on: the bowl
      // is the light in the room, so what is under it is small, and a wide flat ellipse lit orange by
      // its own fire read as a plate the brazier was standing on.
      glowDisc(ctx,p.x,foot-1,w*0.24,BRAZIER_POOL,1,0.34);
      const h=PIXEL_ENV.draw(ctx,'brazier',p.x,foot,w);
      const heat=p.spillCd>0?0.4+0.6*(1-p.spillCd/TUNING.prop.brazier.spillCd):1;
      renderer.flame(p.x,foot-h*0.72,(9+(p.phase*2.5%2.5))*heat,p.phase*10,!!p.witch);   // a mage's bowl burns violet (js/endboss.js)
      return true;
    }
    if(p.kind==='lamp'){
      const w=34;
      // On the middle of its tile: it used to stand ten pixels up, on the tile's top edge. The sprite
      // is anchored at 0.875, so its base sits a shade under the translated origin.
      ctx.save();ctx.translate(p.x,p.y+PROP_FOOT-4);
      renderer.shadow(0,2.5,8,4);
      this.fire(renderer,'lanternFire',0,0,w);
      ctx.restore();return true;
    }
    // The two already-painted, level-agnostic objects: same art, no longer level-one only.
    if(p.kind==='crate'&&PIXEL_ENV.ready){
      const w=p.r*2.7;
      ctx.save();ctx.translate(p.x,p.y-(p.held?6:0));
      if(p.flung)ctx.rotate(Math.atan2(p.vy,p.vx)*0.4);
      renderer.shadow(0,p.r*0.7,w*0.44,6);
      PIXEL_ENV.draw(ctx,'crate',0,p.r*0.9,w);
      ctx.restore();return true;
    }
    // The barrel is Enter the Gungeon's since 1.79, a pixel sprite of its own with the powder heap on its
    // lid and a skull on its staves: js/prop-pixels.js draws it, standing, lying and rolling.
    if(p.kind==='bell'){
      const w=p.r*2.7,sz=PAINTED_SIZE.gong;
      ctx.save();ctx.translate(p.x,p.y);
      if(p.rung>0)ctx.rotate(Math.sin(renderer.t*28)*0.035);
      const h=w*sz[1]/sz[0];
      renderer.shadow(0,3,w*0.44,Math.min(9,h*0.15));
      this.stamp(ctx,'gong',0,0,w,h,0.68);
      ctx.restore();return true;
    }
    if(p.kind==='table'){
      const a=p.flung?Math.atan2(p.vy,p.vx):0;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);
      renderer.shadow(0,p.r*0.6,p.r*1.05,p.r*0.5);
      const drew=PIXEL_ENV.ready?PIXEL_ENV.draw(ctx,'table',0,p.r*0.75,p.r*2.7):0;
      ctx.restore();
      return drew?true:super.drawProp(renderer,p);
    }
    if(p.kind==='cage'){
      const h=TUNING.prop.cage.height,sgn=Math.round(p.x/7)%2?1:-1;
      const lean=(p.hits||0)*0.05*sgn+(p.wobble>0?Math.sin(renderer.t*62)*0.06:0)+(p.gate||0)*1.5;
      renderer.shadow(p.x,p.y,5,3);
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(lean);
      // The connecting rail belongs to the assembled fence; the art contains just one post.
      if(p.axis==='h'){ctx.fillStyle='#3c3730';ctx.fillRect(-15,-h+3,30,4);ctx.fillStyle='#6a635b';ctx.fillRect(-15,-h+3,30,1.5);}
      this.stamp(ctx,'cagePostTight',0,0,7,h,1);ctx.restore();return true;
    }
    if(p.kind==='chicken'&&PIXEL_ART.ready){
      const flying=p.birdState==='flying',stunned=p.birdState==='stunned';
      if(hyp(p.vx||0,p.vy||0)>2)p.artFacing=Math.atan2(p.vy,p.vx);
      const angle=p.artFacing??Math.PI/4;
      renderer.shadow(p.x,p.y,8,3.5);ctx.save();ctx.translate(p.x,p.y);
      if(stunned)ctx.rotate(Math.PI*0.4);
      if(flying){ctx.save();ctx.rotate(angle);ctx.fillStyle='rgba(232,221,200,0.3)';for(let k=1;k<=3;k++)ctx.fillRect(-k*7,-2,4,2);ctx.restore();}
      this.character(renderer,{facing:angle},'chicken',28);ctx.restore();
      if(stunned)renderer.drawStars(p.x,p.y,PIXEL_EXTENT.chicken,Math.min(1,p.birdT*2));return true;
    }
    if(p.kind==='weapon'){
      const up=p.inStand;
      if(up){
        const gl=ctx.createRadialGradient(p.x,p.y-12,0,p.x,p.y-12,40);
        const a=0.14+0.05*Math.sin(renderer.t*2.6+p.phase);
        gl.addColorStop(0,`rgba(239,230,208,${a})`);gl.addColorStop(1,'rgba(239,230,208,0)');
        ctx.fillStyle=gl;ctx.beginPath();ctx.arc(p.x,p.y-12,40,0,Math.PI*2);ctx.fill();
        renderer.shadow(p.x,p.y,14,6);
        this.atlas(ctx,'weapon-stand',p.x,p.y,44,undefined,0.78);
      } else renderer.shadow(p.x,p.y,10,5);
      ctx.save();
      ctx.translate(p.x,p.y-(up?24:0));
      // The shieldman's skulls (`Enemy.dropShield`) stay facing the camera, whole pixels, a quarter turn
      // at most in the air: turned by any angle they would smear.
      if(p.skulls){const nm='mshield'+(ART_PASS.shield||0)+'-f',sg=PROP_PIXELS.sprites[nm],k=0.72;
        PROP_PIXELS.draw(ctx,nm,-sg.w*k/2,-sg.h*k/2,k,p.flung?Math.floor((p.spin||0)/(Math.PI/2)):0);}
      else{
      ctx.rotate(up?(p.weapon==='sword'?-Math.PI/2:0):p.flung?p.spin:(p.facing||0));
      // One size, whatever it is doing: racked, lying or in his mouth. It used to draw bigger on the
      // stand than anywhere else it is ever seen, which read as the object changing size the moment
      // you took it rather than as the same blade wherever it is.
      this.atlas(ctx,p.halberd?'halberd':p.weapon,0,0,p.halberd?34:p.weapon==='sword'?24:22*TUNING.prop.weapon.shieldScale,undefined,0.5);}
      ctx.restore();
      // What is left in a shield you are carrying: three studs, one per man or bullet it has in it.
      if(p.weapon==='shield'&&p.held&&p.uses>0){
        const n=p.skulls?TUNING.shieldman.drop:TUNING.prop.weapon.uses.shield;   // the shieldman's board has its own (`shieldman.drop`)
        for(let k=0;k<n;k++){
          ctx.fillStyle=k<p.uses?PALETTE.bone:'rgba(239,230,208,0.22)';
          ctx.fillRect(p.x-(n*5-2)/2+k*5,p.y-30,3.2,3.2);
        }
      }
      return true;
    }
    if(p.kind==='heal'){
      // Only the rarer, bigger patch, the one a secret sometimes gives up, is painted; the
      // ordinary sprout a level's own rhythm hands out has no atlas art of its own yet and falls
      // back to the smaller primitive tuft `Renderer.drawProp` draws.
      if(!p.big)return super.drawProp(renderer,p);
      // v2's tighter, static 23px patch (brief item F) tested as too quiet to read as a heal spot in
      // a moving crowd, reverted to the original atlas stamp: bigger, with its own shadow and a slow
      // bob, so it still finds the eye the way the wisp or a lamp's firelight does.
      const bob=Math.sin(renderer.t*2.4+p.phase)*2;
      renderer.shadow(p.x,p.y+4,11,5);
      this.atlas(ctx,'healing-grass',p.x,p.y+bob,44,undefined,0.72);
      if(p.graze>0){
        const frac=clamp(p.graze/TUNING.prop.heal.grazeTime,0,1);
        ctx.strokeStyle='rgba(168,189,108,0.85)';ctx.lineWidth=2.4;ctx.lineCap='round';
        ctx.beginPath();ctx.arc(p.x,p.y+bob,17,-Math.PI/2,-Math.PI/2+frac*Math.PI*2);ctx.stroke();
      }
      return true;
    }
    if(p.kind==='spike'){
      const S=TUNING.prop.spike,r=p.r,state=p.spikeState,arming=state==='armed';
      const shud=arming?Math.sin(renderer.t*70)*1.1*clamp(1-p.spikeT/S.arm,0,1):0;
      // Down still shows teeth (it is retracting, not safe yet); idle and rest share the flat plate.
      const name=state==='up'||state==='down'?'spikes-up':arming?'spikes-arming':'spikes-idle';
      ctx.save();ctx.translate(p.x+shud,p.y);
      // A whole tile, squashed like the floor, see the spike branch in AltarArt/Renderer for why.
      this.atlas(ctx,name,0,0,r*2.2,r*2.2*TILT,0.5);
      ctx.restore();
      return true;
    }
    if(p.kind==='bomb'){
      // No painted asset for this one, a rare find drawn plainly, primitive on purpose: a dark
      // shell and a fuse that shortens and sparks faster the closer it is to going off, which is
      // the whole of how a player who has never seen one before reads "this is about to go off."
      const armed=p.fuseT>=0, pct=armed?clamp(p.fuseT/TUNING.prop.bomb.fuse,0,1):1;
      renderer.shadow(p.x,p.y,p.r*0.9,p.r*0.4);
      ctx.save();ctx.translate(p.x,p.y-(p.held?6:0));
      if(p.flung)ctx.rotate(Math.atan2(p.vy,p.vx)*0.3);
      ctx.fillStyle='#1c1a1e';ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#332e33';ctx.beginPath();ctx.arc(-p.r*0.28,-p.r*0.28,p.r*0.4,0,Math.PI*2);ctx.fill();
      const fuseLen=4*pct+2;
      ctx.strokeStyle='#5a4a3a';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(0,-p.r);ctx.lineTo(p.r*0.3,-p.r-fuseLen);ctx.stroke();
      if(armed){
        // Pixel sparks off the tip, more of them and further out the closer it is to going.
        const c=2,tx=Math.round(p.r*0.3/c)*c,ty=Math.round((-p.r-fuseLen)/c)*c,n=2+Math.round(5*(1-pct));
        ctx.fillStyle=PALETTE.fireHi;ctx.fillRect(tx-c/2,ty-c/2,c,c);
        const f=Math.floor(renderer.t*(18+30*(1-pct)));
        for(let k=0;k<n;k++){
          const h=Math.imul(f*31+k,2654435761)>>>0,reach=2+(h%(3+Math.round(6*(1-pct))));
          const a=(h>>>8)%628/100;
          ctx.fillStyle=k%2?PALETTE.fire:PALETTE.fireHi;
          ctx.fillRect(tx+Math.round(Math.cos(a)*reach/c)*c-c/2,ty+Math.round(Math.sin(a)*reach/c)*c-c/2,c,c);
        }
      }
      ctx.restore();return true;
    }
    if(p.kind==='secret'){
      // The sealed niche must share the same facing as the surrounding room wall.
      // It is a tile of the wall, so it is drawn flat like the tiles either side of it: a prop stands
      // counter-squashed (`Renderer.drawProp`), which made it a notch taller than the wall it is in.
      ctx.save();ctx.translate(p.x,p.y);ctx.scale(1,TILT);ctx.translate(-p.x,-p.y);ctx.imageSmoothingEnabled=true;
      this.drawWall(ctx,renderer.game.level.def,p.x-TILE/2,p.y-TILE/2,p.wallSide==='up'?4:p.wallSide==='right'?8:1);
      ctx.restore();
      // The crack tells still have to be drawn: the art carries none, and they're what the blow count
      // reads as (see `Renderer.wallCrack` / CLAUDE.md's "A wall that gives").
      renderer.wallCrack(p.x,p.y,p.hits||0);
      return true;
    }
    return false;
  }

  // The wisp's painted body: `Renderer.soulWisp` keeps its own halo (before) and orbiting sparks
  // (after) procedural, those are what read as motion, and the art has no frames to animate them.
  soulWispBody(ctx, w) {
    return this.atlas(ctx, 'soul-wisp', 0, 0, w, undefined, 0.56);
  }

  // 1.66: the butcher (the brute until 1.72) wears the old Butcher's sheet (skull, apron, cleaver) and that kind is
  // the ogre, drawn by js/ogre-pixels.js (`butcher.scale` a size up). The red-robed `brute` sheet is
  // unused for now.
  characterKey(e) { if(e.kind==='butcher')return 'ogre'; if(e.kind==='ratogre')return 'ratogre'; return e.kind==='bearer'?(e.champion?'butcher':e.shieldman?'spartan':e.thrower?'thrower':e.shaman?'shaman':'clubman'):e.kind==='seer'?'mage':e.kind==='dog'?'hound':['hunter','wraith'].includes(e.kind)?e.kind:null; }

  // The art is a top-down slab at the collision footprint, with no frame or square padding.
  doorSlab(ctx,p,wdt,hgt) {
    const type=p.gate?'Soul':p.vault&&!p.vaultEmpty?'Vault':p.iron?'Iron':'Wood',key='slab'+type+'Closed';
    ctx.save();if(!p.vertical)ctx.rotate(Math.PI/2);
    this.stamp(ctx,key,0,0,13,58);ctx.restore();return true;
  }

  brokenPost(game,p) {
    const ctx=game.world.dctx;ctx.save();ctx.globalAlpha=0.8;
    this.stamp(ctx,'cageBrokenTight',p.x,p.y,22,7,0.5);ctx.restore();
  }

  brokenDoor(game,p) {
    const type=p.gate?'Soul':p.vault&&!p.vaultEmpty?'Vault':p.iron?'Iron':'Wood',image=this.images['slab'+type];
    if(!image?.naturalWidth)return;
    const ctx=game.world.dctx;ctx.save();ctx.translate(p.x,p.y);if(!p.vertical)ctx.rotate(Math.PI/2);
    ctx.globalAlpha=0.75;this.drawFrame(ctx,image,384,0,128,128,0,0,64,64);ctx.restore();
  }

  // The body of a man's blow, off how far through each state he is (`renderer.windP`): the windup a coil away from the
  // goat that builds and trembles at the end, the swing a snap through to a lunge with a stretch at its middle, the
  // recover a drift home with a slump (the opening). Null for anything else, which keeps its own lean.
  attackPose(renderer,e,angle){
    const A=TUNING.enemyAnim,st=e.state,gm=renderer.game;
    // a shot's kick, whatever state he is in now: back off the muzzle and settling, eased out
    if(e.shotAt!==undefined&&gm&&gm.timer-e.shotAt<A.recoil.time&&gm.timer>=e.shotAt){
      const u=(gm.timer-e.shotAt)/A.recoil.time,k=(1-u)*(1-u),c=Math.cos(angle),s=Math.sin(angle);
      return {x:-c*A.recoil.kick*k,y:-s*A.recoil.kick*k,r:-(c>=0?1:-1)*A.recoil.tilt*k,sx:1,sy:1};
    }
    if(st==='cast'&&e.kind==='seer'&&!e.byEar){
      const C=A.cast,p=renderer.windP(e,(TUNING.seer||{}).castWind||0.6),k=p*p*(3-2*p),sh=p>C.shakeFrom?Math.sin(renderer.t*64+(e.y||0))*C.shake:0;
      return {x:sh,y:-C.lift*k,r:0,sx:1-C.stretch*0.5*k,sy:1+C.stretch*k};
    }
    const cfg=TUNING[e.kind]||{},dur=(k)=>{const v=e.atk?e.atk(k):cfg[k];return v>0?v:0.4;};
    const cx=Math.cos(angle),cy=Math.sin(angle),side=cx>=0?1:-1,W=A.windup,S=A.swing,R=A.recover;
    // The hook swung round and the ogre's fists going up: the club's own coil on their own clocks (9 Oct 2026),
    // so the two blows that matter most wind up with the whole body and not with the 2 px nudge they had. Their
    // swings and recovers keep their own look (the rope's flight, the quake), which is why only the winds are here.
    // The leap's crouch (`hopwind`) is the ogre's own pose and is left alone.
    if(st==='hookwind'||st==='slamwind'){
      const hw=((TUNING.champion||{}).hook||{}).wind,sw=(cfg.slam||{}).wind,d=st==='hookwind'?hw:sw;
      const p=renderer.windP(e,d>0?d:0.6),k=p*p*(3-2*p);
      const sh=p>W.shakeFrom?Math.sin(renderer.t*70+(e.x||0))*W.shake:0;
      return {x:-cx*W.back*k+sh,y:-cy*W.back*k,r:-side*W.tilt*k*0.6,sx:1+W.wide*k,sy:1-W.squat*k};
    }
    if(st!=='windup'&&st!=='swing'&&st!=='recover')return null;
    if(st==='windup'){
      const p=renderer.windP(e,dur('windup')),k=p*p*(3-2*p);
      const sh=p>W.shakeFrom?Math.sin(renderer.t*70+(e.x||0))*W.shake:0;
      return {x:-cx*W.back*k+sh,y:-cy*W.back*k,r:-side*W.tilt*k,sx:1+W.wide*k,sy:1-W.squat*k};
    }
    if(st==='swing'){
      e.poseSwungAt=renderer.t;   // render only: the recover that follows is this blow's (a slam's, a hook's, a cast's is not)
      const q=renderer.windP(e,dur('swing')),k=1-Math.pow(1-q,3),l=-W.back+(S.lunge+W.back)*k,s=Math.sin(q*Math.PI)*S.stretch;
      return {x:cx*l,y:cy*l,r:side*S.tilt*k,sx:1+s,sy:1-s*0.6};
    }
    if(!(renderer.t-(e.poseSwungAt??-99)<dur('recover')*((renderer.game&&renderer.game.mods&&renderer.game.mods.enemySlow)||1)+0.3))return null;
    const r=renderer.windP(e,dur('recover')),u=Math.min(1,r/R.settle),k=u*u*(3-2*u),sl=R.slump*Math.sin(Math.PI*Math.min(1,r*1.25));
    return {x:cx*S.lunge*(1-k),y:cy*S.lunge*(1-k),r:side*S.tilt*(1-k),sx:1+sl*0.5,sy:1-sl};
  }

  // A man going down and getting up (`TUNING.enemyAnim.down`, 9 Oct 2026): over the first `time` s of the floor he
  // tips past the lie and bounces back onto it, squashed as he lands; lying, he holds it; for the last `up` s he
  // rises through a crouch. Render only: when the state began and how long it was given are read off his timer the
  // frame it starts (`lieState` / `lieFull`, as `windupGlow` does for a windup), so the simulation feels nothing.
  knockdown(ctx,e,D){
    D=D||TUNING.enemyAnim.down;
    if(e.lieState!==e.state||e.timer>e.lieFull){e.lieState=e.state;e.lieFull=Math.max(1e-3,e.timer||0);}
    const since=e.lieFull-(e.timer||0),left=Math.max(0,e.timer||0);
    if(since<D.time){const u=since/D.time,b=Renderer.backOut(u),sq=D.squash*Math.sin(u*Math.PI);ctx.rotate(D.lie*b+(D.over-D.lie)*Math.sin(u*Math.PI));ctx.scale(1+sq,1-sq);return;}
    if(left<D.up){const v=1-left/D.up,k=Math.sin(v*Math.PI);ctx.rotate(D.lie*(1-v*v));ctx.scale(1+D.crouch*k,1-D.crouch*k);return;}
    ctx.rotate(D.lie);if(D.flat)ctx.scale(1+D.flat,1-D.flat);
  }

  // Every unit is a pixel sprite now (`PIXEL_ART`); what is left here is the lean of a windup or a
  // swing, the tip of a man on the floor, the wraith's fade and the rat ogre's grow-in.
  character(renderer,e,key,width) {
    const ctx=renderer.ctx, angle=e.facing||0, moving=hyp(e.vx||0,e.vy||0)>30;
    const pixel=PIXEL_ART.unit(key); if(!pixel)return;
    ctx.save();
    if(key==='ratogre'&&e.state==='emerge'){const k=1-Math.max(0,e.timer)/TUNING.ratogre.emerge;ctx.scale(0.4+0.6*k,0.4+0.6*k);ctx.globalAlpha*=0.5+0.5*k;}
    if(key==='wraith'){
      const born=e.state==='manifest'?1-Math.max(0,e.timer)/TUNING.wraith.manifest:(e.ghosted?0:1);
      ctx.globalAlpha*=0.35+born*0.65;const puff=1.12-born*0.12;ctx.scale(puff,puff);
    }
    // The shieldman's leap: crouched behind the board, then thrown forward behind it.
    if(e.state==='bashwind'){ctx.translate(Math.cos(angle)*-3,1);ctx.scale(1.08,0.9);}
    if(e.state==='bash'){ctx.translate(Math.cos(angle)*4,-3);ctx.rotate(Math.cos(angle)*0.2);}
    // A man's blow moves his whole body (`attackPose`, `TUNING.enemyAnim`): a coil, a snap, a slump. The goat and the
    // butcher's hook and the ogre's slam keep the old fixed lean.
    const pose=e.kind&&key!=='sheep'?this.attackPose(renderer,e,angle):null;
    if(pose){ctx.translate(pose.x,pose.y);ctx.rotate(pose.r);ctx.scale(pose.sx,pose.sy);}
    else{
      if(e.state==='windup'||e.state==='hookwind'||e.state==='slamwind'){ctx.translate(Math.cos(angle)*-2,Math.sin(angle)*-2);ctx.rotate(-0.13);}
      if(e.state==='swing'){ctx.translate(Math.cos(angle)*3,Math.sin(angle)*3);ctx.rotate(0.17);}
    }
    // The dart: stretched along his run, with a few cells of speed trailing off his hip (9 Oct 2026; it was a
    // stroked line, the last smooth mark left on a body).
    if(e.state==='dart'){ctx.scale(1.17,0.85);
      const px=TUNING.juice.marks.px,a0=ctx.globalAlpha;ctx.fillStyle=PALETTE.bone;
      for(let k=0;k<3;k++){ctx.globalAlpha=a0*(0.45-k*0.13);ctx.fillRect(Math.round((-width*0.4-k*px*2)/px)*px,4,px*2,px);}
      ctx.globalAlpha=a0;}
    if(e.state==='floored'||e.state==='stunned'){if(e.kind&&key!=='sheep')this.knockdown(ctx,e);else ctx.rotate(0.7);}
    if(e.liftedBy)ctx.rotate(Math.cos(e.liftedBy.facing)<0?1.45:-1.45);   // across the thrower's fist (js/thrower.js)
    // The hound has no stride on the sheet: running, he bounces (`dog.gait`, `dog.bob`), or he is a
    // picture of a dog sliding round the floor.
    if(key==='hound'&&moving){const G=TUNING.dog;ctx.translate(0,-Math.abs(Math.sin(renderer.t*G.gait*Math.PI+e.x*0.02))*G.bob);}
    // A man standing still breathes and shifts his weight (`TUNING.menIdle`), never a statue; off as soon as he moves or acts.
    // THE SHOWROOM's figures (`e.statue`, js/showroom.js) are the one thing that does stand like a statue.
    if(key!=='sheep'&&e.kind&&!moving&&!e.dead&&!e.statue&&MEN_IDLE.has(e.state)){const M=TUNING.menIdle,b=(1-Math.cos(renderer.t*Math.PI*2/M.period+(e.x||0)*0.13))/2;
      ctx.rotate(Math.sin(renderer.t*Math.PI*2/M.swayPeriod+(e.y||0)*0.07)*M.sway);ctx.scale(1-M.wide*b,1+M.amp*b);}
    // The ogre has no atlas body: his own hand-drawn one (js/ogre-pixels.js), fists up through a slam or a leap.
    // The shieldman's board, under him when it is seen past him from behind and over him otherwise (`board`).
    if(e.shield)this.board(renderer,e,false);
    if(key==='ogre'&&typeof OGRE_PIXELS!=='undefined'&&OGRE_PIXELS.draw)OGRE_PIXELS.draw(ctx,angle,moving,renderer.t,e.x,e.state==='slamwind'||e.state==='hopwind'||e.state==='hop'?'up':'idle');
    // The shieldman is Leonidas (2 Oct 2026): bare-chested under a Corinthian helmet, his own body (js/spartan-pixels.js).
    else if(key==='spartan'&&typeof SPARTAN_PIXELS!=='undefined'&&SPARTAN_PIXELS.draw)SPARTAN_PIXELS.draw(ctx,angle,moving,renderer.t,e.x);
    // The thrower is a one-armed Bane in a goat's skull, the green pulsing in his arm (js/thrower-pixels.js).
    else if(key==='thrower'&&typeof THROWER_PIXELS!=='undefined'&&THROWER_PIXELS.draw)THROWER_PIXELS.draw(ctx,angle,moving,renderer.t,e.x,e);
    // The shaman in his pelt and headdress, the rattle up through either cast (js/shaman-pixels.js).
    else if(key==='shaman'&&typeof SHAMAN_PIXELS!=='undefined'&&SHAMAN_PIXELS.draw)SHAMAN_PIXELS.draw(ctx,angle,moving,renderer.t,e.x,e);
    else{
      // The goat's cape (js/cape-pixels.js): behind his frame on the front view, over it on the rest, in
      // step with his stride. `capeId` is lent by `drawGoat` for the one draw.
      // The wind in it (`TUNING.cape.wind`): his speed over his stride, and the clock.
      const cs=key==='sheep'&&this.capeId?(moving?Math.floor(renderer.t*8+(e.x||0)*0.05)%4:-1):null;
      const cw=cs!==null?{t:renderer.t,k:moving?Math.min(1,Math.hypot(e.vx||0,e.vy||0)/TUNING.goat.speed):0}:null;
      if(cs!==null)CAPE_PIXELS.draw(ctx,this.capeId,'behind',angle,cs,cw);
      PIXEL_ART.draw(ctx,pixel,angle,moving,renderer.t,e.x);
      if(cs!==null)CAPE_PIXELS.draw(ctx,this.capeId,'over',angle,cs,cw);
    }
    if(e.shield)this.board(renderer,e,true);
    // His horns as the butt souls have made them, in the same lean as the frame (`drawGoat` sets it).
    if(key==='sheep'&&this.hornMods){PIXEL_ART.horns(ctx,pixel,angle,moving,renderer.t,e.x,this.hornMods);PIXEL_ART.face(ctx,angle,renderer.t,this.hornMods,e);}
    ctx.restore();
  }

  // The shieldman's board on his off arm (`Enemy.giveShield`, the sprites `mshield<look>-*` in js/prop-pixels.js):
  // its face toward the camera, edge on from the side, its back seen past him from behind, which is the one
  // view drawn under him (`front` false). Off his facing as one of eight (`BOARD_POSE`), mirrored on the
  // left of the picture; a blow on it (`jolt`) shudders it. Inside `character`'s own frame, so it leans
  // with his windup and his swing and goes down with him.
  // Up, it is at his chest between him and where he faces; down (`Enemy.shieldUp` false: dazed, floored,
  // alight, `sh.low` easing it) it hangs at his knees a quarter turned, points to the floor, so the
  // moment it can be gone through is one the picture says. Its design is `ART_PASS.shield`.
  board(renderer,e,front) {
    const sh=e.shield;if(!sh||typeof PROP_PIXELS==='undefined'||!PROP_PIXELS.draw)return;
    const o=((Math.round((e.facing||0)/(Math.PI/4))%8)+8)%8,B=BOARD_POSE[o];
    if(B.under===front)return;
    const name='mshield'+(ART_PASS.shield||0)+'-'+B.v,g=PROP_PIXELS.sprites[name];if(!g)return;
    const S=TUNING.shieldman,low=sh.low||0,q=low>0.5?1:0;
    const k=BOARD_POSE.k,w=g.w*k,h=g.h*k,shake=sh.jolt>0?Math.round(Math.sin(renderer.t*70)*1.5):0;
    // His blow up close (`shieldman.strike`): the board drawn in toward him through the windup and rammed
    // out `thrust` px along his facing in the swing, whole pixels, so the clubman's wedge has a weapon in it.
    const th=e.state==='windup'?-S.strike.thrust/2:e.state==='swing'?S.strike.thrust:0,tx=Math.round(Math.cos(e.facing||0)*th),ty=Math.round(Math.sin(e.facing||0)*th*0.6);
    const ctx=renderer.ctx;ctx.save();ctx.translate(B.x+shake+tx+Math.round(S.side*low)*(B.flip?-1:1),B.y+ty+Math.round(S.low*low));if(B.flip)ctx.scale(-1,1);
    PROP_PIXELS.draw(ctx,name,q?-h/2:-w/2,q?-w/2:-h/2,k,q);
    ctx.restore();
  }

  // A cord round the neck with the talisman hanging off it, placed off the facing: the neck of the
  // eight-way sheep sits a little way toward the head from the cell's centre, and the pendant hangs
  // toward the camera from there. One drawing per artifact (`Renderer.artifactIcon`), small.
  // A charm knotted into the wool at the back of his neck, not a pendant at his throat: the sheep
  // sheet already paints a bell there (the one he was born with, see `CLAUDE.md`), and stacking a
  // second small ornament on the exact same few pixels buried the talisman under it rather than
  // beside it. `-cx` puts the charm behind him the same way `+cx` is his own nose: opposite
  // whichever of the eight painted facings is on screen, which is the one spot this sprite was
  // actually checked, facing by facing, to be open fur rather than the bell, the face or the tail.
  // Up to three talismans (`arts`, in the order taken) hang on it as charms side by side (6 Oct 2026), each
  // a few hand-placed pixels of its own shape and colour (`CAPE_PIXELS.charm`), along the ring's near half
  // at `TUNING.talisman.charm.at`.
  collar(renderer,g,arts) {
    const ctx=renderer.ctx,a=g.facing,cx=Math.cos(a),sy=Math.sin(a);
    // The pixel goat has no bell: the charms hang at his throat on a cord, per facing (`PIXEL_NECK`).
    if(PIXEL_ART.unit('sheep')){
      // One collar for every talisman, turned with him. It is a ring round the neck seen from the
      // camera: an ellipse whose short axis lies along the way he faces (squashed to a band on a side
      // view, opened to a curve under the chin from the front), and only its near half is drawn, the
      // half toward the camera, because the rest is behind his neck. It was one fixed smile of cord at
      // every facing, which lay across the neck like a mouth on the side views. Its front sits on the
      // throat point `PIXEL_NECK` measured; the ring's shape is `CAPE_PIXELS.ring`.
      const d=(Math.round(a/(Math.PI/4))+14)%8,C=TUNING.goat.collar,q=CAPE_PIXELS.ring(d,PIXEL_NECK[d],C);
      const {cx,cy,R,r,rot}=q;
      ctx.save();ctx.lineCap='round';
      ctx.strokeStyle=C.edge;ctx.lineWidth=C.w+1.2;
      ctx.beginPath();ctx.ellipse(cx,cy,R,r,rot,0,Math.PI);ctx.stroke();
      ctx.strokeStyle=C.leather;ctx.lineWidth=C.w;
      ctx.beginPath();ctx.ellipse(cx,cy,R,r,rot,0.08,Math.PI-0.08);ctx.stroke();
      // From behind the charms are under his chin, out of sight: a fleck of each at the ring's ends.
      if(q.back){arts.slice(0,2).forEach((art,k)=>{ctx.fillStyle=(Shop.def(art.id)||{}).color||PALETTE.bone;ctx.fillRect(cx+(k?1:-1)*R*0.55-0.8,cy+r*0.6-0.8,1.6,1.6);});}
      else{
        const T=TUNING.talisman.charm,at=T.at[Math.min(arts.length,T.at.length)-1];
        arts.slice(0,at.length).forEach((art,k)=>{const p=CAPE_PIXELS.ringAt(q,at[k]);CAPE_PIXELS.charm(ctx,art.id,p.x,p.y+T.drop);});
      }
      ctx.restore();return;
    }
    const art=arts[0],nx=-cx*7,ny=-6+sy*3;
    ctx.save();
    ctx.strokeStyle='#5a3d24';ctx.lineWidth=1.5;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(nx-3,ny-2);ctx.lineTo(nx+3,ny+2);ctx.moveTo(nx+3,ny-2);ctx.lineTo(nx-3,ny+2);ctx.stroke();
    renderer.artifactIcon(art.id,nx,ny,3.3,art.tier);
    ctx.restore();
  }

  // One blot of blood in his wool per heart he has lost, big enough to count from across a room.
  // They used to be small dark drops about his hooves, which read as something spilt on the floor
  // rather than as him. On the pixel goat they are masked to the sprite itself, painted into a
  // scratch canvas, then cut by the same frame with `destination-in`, so blood is only ever on him.
  wounds(renderer,g,miss) {
    const ctx=renderer.ctx,W=TUNING.goat.wounds,n=Math.min(miss,W.spots.length);
    // Smaller the more he faces the camera (`W.front`): +y is toward it. In twentieths, so the baked
    // blots below can be kept per frame of him.
    const face=Math.round((1-(1-W.front)*Math.max(0,Math.sin(g.facing||0)))*20)/20;
    const blot=(c,k)=>{const[x,y]=W.spots[k],r=(W.r+k*W.grow)*face;
      c.fillStyle=PALETTE.bloodDark;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.arc(x+r*0.7,y+r*0.35,r*0.6,0,Math.PI*2);c.fill();
      c.fillStyle=PALETTE.blood;c.beginPath();c.arc(x-r*0.2,y-r*0.2,r*0.45,0,Math.PI*2);c.fill();};
    const unit=PIXEL_ART.unit('sheep');
    if(!unit){ctx.save();ctx.globalAlpha*=0.8;for(let k=0;k<n;k++)blot(ctx,k);ctx.restore();return;}
    // 48 world px square round the foot at 2x, which holds the whole goat on every facing. Baked once
    // per frame of him (facing, step, blots) and kept: repainted and redrawn every frame, the scratch
    // canvas cost an upload a frame for as long as he was hurt.
    const S=2,B=48,ox=24,oy=40,moving=hyp(g.vx||0,g.vy||0)>30,u=PIXEL_ASSETS.units[unit];
    const [dir,flip]=PIXEL_ART.facing(unit,g.facing||0),step=moving&&u&&u.walk?Math.floor(renderer.t*8+(g.x||0)*0.05)%4:-1;
    const cache=this.woundCache||(this.woundCache=new Map()),key=n+'|'+dir+'|'+flip+'|'+step+'|'+face;
    let cv=cache.get(key);
    if(!cv){
      if(cache.size>=W.cache)cache.clear();
      cv=document.createElement('canvas');cv.width=cv.height=B*S;
      const c=cv.getContext('2d');
      c.setTransform(S,0,0,S,ox*S,oy*S);
      for(let k=0;k<n;k++)blot(c,k);
      c.globalCompositeOperation='destination-in';
      PIXEL_ART.draw(c,unit,g.facing||0,moving,renderer.t,g.x);
      cache.set(key,cv);
    }
    ctx.save();ctx.globalAlpha*=W.alpha;
    // The same lean `character()` gives a windup or a swing, or the blots slide off him mid-blow.
    const a=g.facing||0;
    if(g.state==='windup'){ctx.translate(Math.cos(a)*-2,Math.sin(a)*-2);ctx.rotate(-0.13);}
    if(g.state==='swing'){ctx.translate(Math.cos(a)*3,Math.sin(a)*3);ctx.rotate(0.17);}
    if(g.state==='stunned')ctx.rotate(0.7);
    ctx.drawImage(cv,-ox,-oy,B,B);ctx.restore();
  }

  // The tortoise's iron (`TUNING.prop.tortoise.armour`): rows of plate over his body in cells on the
  // sprite's own grid, lit along each row's top, a dark seam between rows and a rivet now and then, his
  // head and legs left bare, then cut to his own silhouette exactly as the wounds are. Baked per frame of him.
  armour(renderer,g) {
    const unit=PIXEL_ART.unit('sheep');if(!unit)return;
    const ctx=renderer.ctx,A=TUNING.prop.tortoise.armour,S=2,B=48,ox=24,oy=40,moving=hyp(g.vx||0,g.vy||0)>30,u=PIXEL_ASSETS.units[unit];
    const [dir,flip]=PIXEL_ART.facing(unit,g.facing||0),step=moving&&u&&u.walk?Math.floor(renderer.t*8+(g.x||0)*0.05)%4:-1;
    const d=(Math.round((g.facing||0)/(Math.PI/4))+14)%8,cache=this.armourCache||(this.armourCache=new Map()),key=d+'|'+dir+'|'+flip+'|'+step;
    let cv=cache.get(key);
    if(!cv){
      if(cache.size>=96)cache.clear();
      cv=document.createElement('canvas');cv.width=cv.height=B*S;
      const c=cv.getContext('2d');c.setTransform(S,0,0,S,ox*S,oy*S);
      // The head, left bare: up from the throat point (`PIXEL_NECK`) and toward the way this frame faces,
      // wider facing the camera, where the face is most of what is seen of him.
      // Everything above the head is bare too (ears, horns), and seen from the front or the back the
      // coat starts lower (`low`), at the shoulders and the rump, where the ears stand out to the sides.
      const [nx,ny]=PIXEL_NECK[d],fa=(d+2)*Math.PI/4,front=Math.max(0,Math.sin(fa));
      const hx=nx+Math.cos(fa)*2.5,hy=ny-3-2.5*front,hr=A.head+A.headFront*front;
      const k=A.cell,y0=A.band[0]+A.low*Math.abs(Math.sin(fa)),y1=A.band[1],rows=Math.ceil((y1-y0)/k),cols=Math.ceil(2*A.wide/k);
      const on=(q,r)=>{
        if(r<0||r>=rows||q<0||q>=cols)return false;
        const dx=-A.wide+(q+0.5)*k-hx,dy=y0+(r+0.5)*k-hy;
        return hyp(dx,dy)>=hr&&!(dy<0&&Math.abs(dx)<hr);
      };
      // Plates laid like bricks (`plate` cells wide, `seam` rows tall, every other row half a plate
      // over): each lit along its top and left, dark along its bottom and right, a rivet at its top
      // corner, and the rim of the whole coat dark, so it reads as iron on him and not as stripes.
      const [pw,ph]=[A.plate,A.seam];
      for(let r=0;r<rows;r++)for(let q=0;q<cols;q++){
        if(!on(q,r))continue;
        const rr=r%ph,qq=(q+(Math.floor(r/ph)%2?pw>>1:0))%pw;
        let col=A.mid;
        if(rr===0||qq===0)col=A.lit;
        if(rr===ph-1||qq===pw-1)col=A.dark;
        if(rr===1&&qq===1)col=A.lit;
        if(!on(q,r-1)||!on(q,r+1)||!on(q-1,r)||!on(q+1,r))col=A.rim;
        c.fillStyle=col;c.fillRect(-A.wide+q*k,y0+r*k,k+0.05,k+0.05);
      }
      // Cut to him a texel in from his edge (his silhouette, and the same moved a texel each way), so
      // his own dark outline stays round the iron and he still reads as the goat in it.
      c.globalCompositeOperation='destination-in';
      for(const [sx,sy] of [[0,0],[k,0],[-k,0],[0,k],[0,-k]]){c.save();c.translate(sx,sy);PIXEL_ART.draw(c,unit,g.facing||0,moving,renderer.t,g.x);c.restore();}
      cache.set(key,cv);
    }
    ctx.save();ctx.globalAlpha*=A.alpha;
    const a=g.facing||0;   // the lean `character()` gives a windup or a swing, as the wounds take it
    if(g.state==='windup'){ctx.translate(Math.cos(a)*-2,Math.sin(a)*-2);ctx.rotate(-0.13);}
    if(g.state==='swing'){ctx.translate(Math.cos(a)*3,Math.sin(a)*3);ctx.rotate(0.17);}
    if(g.state==='stunned')ctx.rotate(0.7);
    ctx.imageSmoothingEnabled=false;ctx.drawImage(cv,-ox,-oy,B,B);ctx.restore();
  }

  // What leaves his face and stays in the world a moment (`TUNING.goat.face`): VENOM SPIT's drop off
  // the chin and the splat it makes, DRAGON BREATH's steam off a nostril and now and then a lick of
  // flame. A point is where it stands on the floor plus `z` screen px above it, so a drop let go
  // of mid-run falls where it was let go of, not after him. Cosmetic: nothing reads it back.
  goatFx(renderer,g,game) {
    const ctx=renderer.ctx,F=TUNING.goat.face,m=game.mods||{},t=renderer.t,fx=this.fx||(this.fx=[]);
    // A new floor starts clean (the old one's splats hung at its coordinates), and nothing drips or
    // drifts under the pause (the GOAT GRID's stub state is 'grid' and runs).
    if(this.fxLevel!==game.level){this.fxLevel=game.level;fx.length=0;}
    const run=game.state!=='paused',dt=run?clamp(t-(this.fxT??t),0,0.1):0;this.fxT=t;
    const d=(Math.round((g.facing||0)/(Math.PI/4))+14)%8,P=PIXEL_FACE[d],fa=(d+2)*Math.PI/4,ux=Math.cos(fa),uy=Math.sin(fa);
    const live=run&&PIXEL_ART.unit('sheep')&&!['roll','falling','ko'].includes(g.state)&&!game.stairFx;
    const at=([x,y])=>({x:g.x+x,y:g.y+1,z:-y});
    if(live&&m.spit&&P.mouth){
      const V=F.foam;if(this.dripAt===undefined||this.dripAt>t+V.drip+V.dripVary)this.dripAt=t+V.drip*Math.random();
      if(t>=this.dripAt){this.dripAt=t+V.drip+Math.random()*V.dripVary;fx.push({kind:'drop',...at(P.mouth),vz:0,age:0,life:3});}
    }
    if(live&&m.breath){
      const S=F.steam;
      if(this.fireAt===undefined||this.fireAt>t+S.fire+S.fireVary)this.fireAt=t+S.fire*Math.random();
      if(t>=this.fireAt){this.fireUntil=t+S.fireTime;this.fireAt=t+S.fire+Math.random()*S.fireVary;}
      const fire=t<(this.fireUntil||0),gap=fire?S.fireGap:S.gap;
      // Stale after a roll, a fall or the stairs (nothing puffs then): start again from now, not
      // with every missed puff out of one nostril in a single frame.
      if(!(this.puffAt<=t+gap)||this.puffAt<t-gap)this.puffAt=t;
      while(this.puffAt<=t){
        this.puffAt+=gap;this.nostril=((this.nostril||0)+1)%P.nose.length;
        const p=at(P.nose[this.nostril]),j=Math.random()-0.5;
        if(fire)fx.push({kind:'flame',...p,vx:(ux+j*0.5)*S.fireSpeed,vy:(uy+j*0.5)*S.fireSpeed*0.5,vz:6+Math.random()*8,age:0,life:S.fireLife*(0.7+Math.random()*0.5)});
        else fx.push({kind:'steam',...p,vx:ux*S.drift+j*3,vy:uy*S.drift*0.5,vz:S.rise*(0.8+Math.random()*0.4),age:0,life:S.life*(0.8+Math.random()*0.4)});
      }
    }
    for(let i=fx.length-1;i>=0;i--){
      const p=fx[i];p.age+=dt;
      if(p.kind==='drop'){p.vz-=F.foam.fall*dt;p.z+=p.vz*dt;if(p.z<=0){fx[i]={kind:'splat',x:p.x,y:p.y,z:0,age:0,life:F.foam.splatLife};continue;}}
      else if(p.kind!=='splat'){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;}
      if(p.age>=p.life||fx.length>80)fx.splice(i,1);
    }
    if(!fx.length)return;
    // Square pixels of the sprite's own size (`face.cell`), heights snapped to it, like everything
    // else on him: a round puff beside a pixel goat reads as a different game.
    const C=F.cell,cell=(i,j,z)=>ctx.fillRect(i*C-C/2,Math.round(-z/C)*C+j*C-C/2,C,C);
    for(const p of fx){
      const k=p.age/p.life;
      ctx.save();ctx.translate(p.x,p.y);ctx.scale(1,1/TILT);
      if(p.kind==='drop'){ctx.fillStyle=F.foam.color;cell(0,-1,p.z);ctx.fillStyle=F.foam.dark;cell(0,0,p.z);}
      else if(p.kind==='splat'){ctx.globalAlpha*=0.85*(k<0.6?1:(1-k)/0.4);const n=Math.round(F.foam.splat/C);
        ctx.fillStyle=F.foam.dark;for(let i=-n;i<=n;i++)cell(i,0,0);ctx.fillStyle=F.foam.color;cell(0,0,0);}
      else if(p.kind==='steam'){const S=F.steam,n=Math.min(3,1+Math.floor(k*3));ctx.fillStyle=`rgba(${S.color},${S.alpha*(1-k)*(k<0.15?k/0.15:1)})`;
        if(n===1)cell(0,0,p.z);else if(n===2){cell(0,0,p.z);cell(1,0,p.z);cell(0,-1,p.z);cell(1,-1,p.z);}
        else{cell(0,0,p.z);cell(-1,0,p.z);cell(1,0,p.z);cell(0,-1,p.z);cell(0,1,p.z);}}
      else{ctx.fillStyle=k<0.3?PALETTE.fireHi:k<0.65?PALETTE.fire:PALETTE.blood;ctx.globalAlpha*=k<0.6?1:0.6;cell(0,0,p.z);if(k<0.25){cell(0,-1,p.z);}}
      ctx.restore();
    }
  }

  drawGoat(renderer,g,game) {
    const ctx=renderer.ctx;
    if(g.state==='shell'&&g.shell&&typeof Shell!=='undefined'){Shell.draw(renderer,game,g);return;}   // TURTLEIZE: the crystal in his place
    for(const t of g.trail){ctx.save();ctx.globalAlpha=t.life/(t.max||TUNING.goat.trail.life)*0.12;ctx.translate(t.x,t.y);ctx.scale(1,1/TILT);this.character(renderer,{facing:t.a},'sheep',40);ctx.restore();}
    // A fidget (`Goat.update`, `goat.idle`) as a 0..1 through it, and how high a pronk has him.
    const I=TUNING.goat.idle,fid=g.fidget,fk=fid?clamp(fid.t/fid.dur,0,1):0;
    // A pronk off the fidget, or a LEAPFROG vault: the same lift off his shadow, in whole pixels.
    const lp=g.leap,hop=lp?Math.sin(clamp(lp.t/lp.time,0,1)*Math.PI)*lp.h
      :fid&&fid.kind==='hop'&&fk>0.2&&fk<0.8?Math.sin((fk-0.2)/0.6*Math.PI)*I.hop.h:0;
    // Coming down out of heaven his shadow grows under him as he nears the floor (`Heaven.dropShadow`).
    const dropK=game&&game.revive&&game.revive.dive&&typeof Motes!=='undefined'?Motes.diveShadow(game):game&&(game.dropIn||(game.heaven&&game.heaven.jump))&&typeof Heaven!=='undefined'?Heaven.dropShadow(game):1;
    const sh=Math.max(0.2,1-hop*0.03)*dropK;   // a leap higher than ~26 px would hand `ellipse` a negative radius
    if(g.state!=='carried'&&sh>0.01)renderer.shadow(g.x,g.y,16*sh,7*sh);   // over the thrower's head he has no floor under him
    ctx.save();ctx.translate(g.x,g.y);ctx.scale(1,1/TILT);
    if(game&&game.dropIn&&typeof Heaven!=='undefined')Heaven.drawShaft(ctx,game);
    if(g.jitter)ctx.translate(g.jitter.x,g.jitter.y);
    // Weight in the stride: a hop per hoof-fall in step with the walk frames, in whole pixels, and
    // the lean `Goat.update` smooths into a change of pace. Turned about the hooves.
    const FE=TUNING.goat.feel,spd=hyp(g.vx||0,g.vy||0);
    if(g.state==='idle'&&spd>30){const k=Math.min(1,spd/(TUNING.goat.speed||1));ctx.translate(0,-Math.round(Math.abs(Math.sin((renderer.t*8+(g.x||0)*0.05)*Math.PI/2))*FE.bob*k));}
    if(g.lean)ctx.rotate(g.lean);
    if(hop)ctx.translate(0,-Math.round(hop));
    if(fid){
      if(fid.kind==='hop'){if(fk<0.2)ctx.scale(1.07,0.91);else if(fk<0.8)ctx.scale(0.96,1.05);else ctx.scale(1.06,0.93);}
      else if(fid.kind==='shake')ctx.rotate(Math.sin(fid.t*I.shake.freq)*I.shake.amp*(1-fk));
      else if(fid.kind==='paw'){const n=I.paw.scrapes,s=Math.sin(fk*n*Math.PI);ctx.translate(Math.cos(g.facing)*I.paw.dist*s,Math.sin(g.facing)*I.paw.dist*s*TILT);}
      else if(fid.kind==='stretch'){const k=Math.sin(fk*Math.PI);ctx.scale(1+I.stretch.long*k,1-I.stretch.low*k);}
      else if(fid.kind==='sniff'){const S=I.sniff,k=Math.sin(fk*Math.PI),d=Math.max(0,Math.sin(fk*S.sniffs*Math.PI*2));ctx.rotate(Math.cos(g.facing)*S.lean*k);ctx.scale(1+S.dip*0.5*k,1-S.dip*k*(0.6+0.4*d));}
      else if(fid.kind==='scratch'){const S=I.scratch,k=Math.sin(fk*Math.PI);ctx.rotate(-Math.cos(g.facing)*S.lean*k+Math.sin(fid.t*S.freq)*S.amp*k);}
    }
    const fx=game.stairFx,climb=fx?clamp(fx.dir>0?fx.t:1-fx.t,0,1):0;
    if(climb>0){ctx.translate(0,-TUNING.stairs.rise*climb);ctx.scale(1-0.22*climb,1-0.22*climb);ctx.globalAlpha=1-climb*0.55;}
    // Heaven's own moments (js/heaven.js): out of the light, over the edge, down onto a floor.
    // HELLDIVE's lift and fall (js/motes.js) the same way.
    const hv=game.revive&&game.revive.dive&&typeof Motes!=='undefined'?Motes.diveLook(game):typeof Heaven!=='undefined'&&(game.heaven||game.dropIn)?Heaven.goatLook(game):null;
    if(hv){ctx.translate(0,hv.dy);if(hv.sy)ctx.scale(1/Math.sqrt(hv.sy),hv.sy);if(hv.spin)ctx.rotate(hv.spin);ctx.scale(hv.s*(hv.sx||1),hv.s);ctx.globalAlpha*=hv.a;}
    // Over the thrower's head on his back, legs up; and turning over in the air from his throw (js/thrower.js).
    if(g.state==='carried'){ctx.translate(0,-26);ctx.scale(1,-1);ctx.rotate(Math.sin(renderer.t*9)*0.08);}
    if(g.state==='tossed'){ctx.translate(0,-12);ctx.rotate(renderer.t*16*(Math.cos(g.facing)<0?-1:1));ctx.translate(0,12);}
    if(g.state==='falling'){const F=TUNING.fall,d=clamp((F.time+F.back-g.timer)/F.time,0,1);ctx.translate(0,d*26);ctx.rotate(d*1.5);ctx.scale(1-0.72*d,1-0.72*d);ctx.globalAlpha=1-d;}
    // A vault is not a tumble: stretched out long at the top of it rather than spun.
    if(g.state==='roll'){if(lp){const k=Math.sin(clamp(lp.t/lp.time,0,1)*Math.PI);ctx.scale(1+0.1*k,1-0.06*k);}else{ctx.rotate(g.rollSpin);ctx.scale(0.88,0.88);}}
    // The bite (BY THE COLLAR) is the same crouch as the headbutt's windup, on its own clock.
    if(g.state==='windup'||g.state==='bite'){const W=g.state==='bite'?TUNING.goat.grab.bite:TUNING.goat.headbutt.windup,k=clamp(1-(g.timer||0)/W,0,1),a=g.aim||{x:0,y:0};
      ctx.translate(-a.x*FE.pull*k,-a.y*FE.pull*k*TILT);ctx.scale(0.85,1.1);}
    // The lunge stretched along the way the head goes, not along the screen (9 Oct 2026).
    if(g.state==='lunge'){const a=g.aim?Math.atan2(g.aim.y*TILT,g.aim.x):0;ctx.rotate(a);ctx.scale(1.15,0.9);ctx.rotate(-a);}
    // Knocked over (`goat.knock`): he tips past his side and bounces onto it, lies, and rises through a crouch;
    // `ko` is the opening scene, where he is out cold and does not move at all.
    if(g.state==='stunned')this.knockdown(ctx,g,TUNING.goat.knock);
    else if(g.state==='ko'){ctx.rotate(0.9);ctx.scale(1.1,0.8);}
    // The squash spring (game.squashGoat): a landed blow, a blow taken, the end of a roll.
    if(g.sqLeft){const a=g.sqLeft*Math.cos(TUNING.juice.squash.freq*g.sqT);ctx.scale(1+a,1-a);}
    if(g.invuln>0&&Math.floor(renderer.t*30)%2===0)ctx.globalAlpha*=0.5;
    // Standing still he breathes: taller and a touch narrower from the hooves up, then back.
    if(g.state==='idle'&&hyp(g.vx||0,g.vy||0)<=30){const B=TUNING.goat.breathe,b=(1-Math.cos(renderer.t*Math.PI*2/B.period))/2;ctx.scale(1-B.wide*b,1+B.amp*b);}
    // Sneaking (the STEALTH test, `goat.sneakK`): low and a touch wider, from the hooves up.
    if(g.sneakK>0){const C=TUNING.stealth.crouch,k=g.sneakK;ctx.scale(1+C.wide*k,1-C.low*k);}
    // Grazing (`goat.grazeK`): head down over the front hooves, a lean toward the way he faces on a
    // side view, a squash from the hooves up on every view, and a nibble in it.
    if(g.grazeK>0){const P=TUNING.goat.grazePose,k=g.grazeK*g.grazeK*(3-2*g.grazeK),n=1+P.nibble*Math.max(0,Math.sin(renderer.t*P.rate*Math.PI*2));
      ctx.rotate(Math.cos(g.facing)*P.lean*k*n);ctx.scale(1+P.wide*k,1-P.squash*k*n);}
    // A glance is one facing aside and back; the facing is lent for the drawing and handed back.
    const f0=g.facing,look=fid&&fid.kind==='look'&&fk>0.12&&fk<0.88;
    if(look)g.facing=f0+fid.dir*Math.PI/4;
    try{
      this.hornMods=game.mods;this.capeId=game.cape&&game.cape.id;this.character(renderer,g,'sheep',40);
      // The blood is in his wool; the collar is over it, since a talisman has to read at any health.
      // A blow taken (`hurtLook`): the same goat again as a white silhouette, then a red one that blinks.
      if(g.hurtT>0){const H=TUNING.juice.hurtLook,k=clamp(g.hurtT/H.life,0,1);
        ctx.save();
        if(g.hurtT>H.life-H.white){ctx.globalAlpha*=0.92;ctx.filter='brightness(0) invert(1)';}
        else{ctx.globalAlpha*=0.78*Math.min(1,k*3)*(Math.floor(renderer.t*H.blink)%2?1:0.35);ctx.filter='brightness(0) invert(0.4) sepia(1) saturate(40) hue-rotate(-20deg) brightness(0.85)';}   // a flat blood red (~217,50,48), whatever his wool
        this.character(renderer,g,'sheep',40);ctx.restore();}
      // Poisoned (`Status.goat`, the ring full): the same goat again flat venom green, breathing, for as long as the slow
      // lasts, so the slow is seen on him and not only in the ring at his feet (9 Oct 2026).
      if(g.poisoned>0){const L=TUNING.status.look,k=Math.min(1,g.poisoned*3);
        ctx.save();ctx.globalAlpha*=L.goatTint*k*(0.7+0.3*Math.sin(renderer.t*6));ctx.filter=POISON_FILTER;this.character(renderer,g,'sheep',40);ctx.restore();}
      if(g.maxHp-g.hp>0)this.wounds(renderer,g,g.maxHp-g.hp);
      if(g.armour>0)this.armour(renderer,g);
      if((game.artifacts||[]).length)this.collar(renderer,g,game.artifacts);
      // the cape's clasp at his throat, over the collar, on the front view (the others carry it in the cloth)
      if(this.capeId&&PIXEL_ART.unit('sheep'))CAPE_PIXELS.clasp(ctx,this.capeId,g.facing,PIXEL_NECK[CAPE_PIXELS.view(g.facing)]);
      if(g.onFire)renderer.goatFlame(g);
    }finally{g.facing=f0;this.hornMods=null;this.capeId=null;ctx.restore();}   // a throw mid-glance must not leave the goat turned, nor the transform on the stack
    this.goatFx(renderer,g,game);
    if(g.dazed>0&&!(game.intro&&game.intro.fade>0))renderer.drawStars(g.x,g.y,PIXEL_EXTENT.goat+2,Math.min(1,g.dazed*1.5));
    // and the bubbles off him, in cells, the same as off a poisoned man
    if(g.poisoned>0&&!g.dead&&!renderer.silPass){ctx.save();ctx.translate(g.x,g.y);ctx.scale(1,1/TILT);renderer.drawBubbles(0,0,30,Math.min(1,g.poisoned*3),g.x);ctx.restore();}
    if((game.touch.active||(game.pad&&game.pad.active))&&game.state==='play'){const a=game.input.aim;ctx.fillStyle=PALETTE.bone;ctx.beginPath();ctx.arc(g.x+a.x*34,g.y+a.y*34,2,0,Math.PI*2);ctx.fill();}
  }
}
