// The art layer over the primitive renderer: room floors and walls out of the pixel swatches, every
// unit through `character()` (a pixel sprite in a frame of leans, collar and wounds), and the few
// painted props no pixel sprite exists for yet. Collision radii never read any of it.
// `propsAtlas` in js/painted-assets.js — four columns, four rows, 128px cells.
const ATLAS_CELL = {
  'cage-bars': [0, 0], 'cage-broken': [128, 0], 'mill-hub': [256, 0], 'mill-arm': [384, 0],
  'spikes-idle': [0, 128], 'spikes-arming': [128, 128], 'spikes-up': [256, 128], 'weapon-stand': [384, 128],
  sword: [0, 256], shield: [128, 256], 'healing-grass': [256, 256], 'soul-wisp': [384, 256],
  'secret-wall': [0, 384], 'crate-debris': [128, 384], 'brazier-unlit': [256, 384], worktable: [384, 384],
};
// How far below a tile's centre a thing standing on that tile puts its feet: the middle of the tile
// in a camera tilted this little, not its bottom or top edge.
const PROP_FOOT = 3;

class PaintedArt extends AltarArt {
  constructor() {
    super(); this.images = {}; this.loaded = 0; this.failed = [];
    const entries = Object.entries(PAINTED_ASSETS);
    this.ready = false;
    for (const [key, asset] of entries) {
      const image = new Image(); this.images[key] = image;
      image.onload = () => { this.loaded++; this.ready = this.loaded === entries.length; };
      image.onerror = () => { this.failed.push(key); console.error('Art asset failed:', key); };
      image.src = asset.src;
    }
  }

  stamp(ctx, key, x, y, w, h, anchor = 0.5) {
    const image = this.images[key]; if (!image || !image.naturalWidth) return;
    if (h === undefined) h = w * image.naturalHeight / image.naturalWidth;
    const smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, x - w / 2, y - h * anchor, w, h);
    ctx.imageSmoothingEnabled = smooth;
  }

  // Crops one cell out of a sprite sheet — the shared primitive under every animated stamp below,
  // used for the expansion pack's walk cycles, fire loops, door states and props atlas.
  drawFrame(ctx, image, sx, sy, sw, sh, x, y, w, h, anchor = 0.5) {
    if (!image || !image.naturalWidth) return false;
    const smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, sx, sy, sw, sh, x - w / 2, y - h * anchor, w, h);
    ctx.imageSmoothingEnabled = smooth;
    return true;
  }

  // objects/atlas.png: one 128px cell per named prop. `h` defaults to `w` — every cell is square.
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
  // out to the iron tip; height is cosmetic only — collision stays on `TUNING.mill`, untouched.
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
  // two sides are both stone, NE=16, SE=32, SW=64, NW=128 — the inside corners, where an edge turns
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

  drawTiles(renderer, game, cam) {
    this.prepare(game);
    const ctx = renderer.ctx, wd = game.world, b = renderer.visibleTiles(cam), def = game.level.def;
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    // A wall that gives (`carveSecret`) stands on a floor tile until it is broken, and is drawn as a
    // prop; to its neighbours it is stone, or the niche behind it showed a face of its own over it.
    const shut = this.shutWalls ||= new Set(); shut.clear();
    for (const p of game.props) if (p.kind === 'secret' && !p.broken) shut.add(Math.floor(p.y / TILE) * wd.W + Math.floor(p.x / TILE));
    const stone = (x, y) => wd.isSolid(x, y) || (shut.size > 0 && shut.has(y * wd.W + x));
    for (let y=b.y0; y<=b.y1; y++) for (let x=b.x0; x<=b.x1; x++) {
      const t=wd.tileAt(x,y), px=x*TILE, py=y*TILE, h=this.hash(x,y,game.level.seed);
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
      else if(t===T.FLOOR&&!wood&&!wd.isSolid(x,y-1))PIXEL_ENV.litter(ctx,'room',x,y);
      else if(t===T.ASH){ctx.fillStyle=PALETTE.altar.ash;ctx.globalAlpha=0.6;ctx.fillRect(px+3,py+5,26,23);ctx.globalAlpha=1;}
      else if(t===T.EXIT)renderer.drawStairs(px,py,x-game.level.exitTile.x0,true,game.level.def,Renderer.forkRow(game.level,y));
      else if(t===T.ENTRY)renderer.drawStairs(px,py,x-game.level.entry.x0,false,game.level.def);
      else if(wd.isSolid(x,y-1)&&h%5===0)this.straw(ctx,px+16,py+6,h,false);
    }
    ctx.imageSmoothingEnabled = smooth;
  }

  drawRitual(renderer, game) {
    const ctx=renderer.ctx, wd=game.world, R=game.level.rooms[0];
    // The stone base, candles and the two earlier sacrifices' bones are the procedural layer
    // underneath. Bones, not ghost sheep. The altar itself is a real Prop now — see drawProp — and
    // draws in its own turn through the ordinary prop pass, not here.
    if (wd.ritualArt) ctx.drawImage(wd.ritualArt.canvas, wd.ritualArt.x, wd.ritualArt.y);
    // Room-edge storage is inset into the solid wall band, never an invisible obstacle on a path.
    const yy=(R.y+0.7)*TILE;
    PIXEL_ENV.draw(ctx,'barrel',(R.x+1.4)*TILE,yy+9,22);
    PIXEL_ENV.draw(ctx,'hay',(R.x+2.4)*TILE,yy+14,35);
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
      const sr=w*0.24,sg=ctx.createRadialGradient(p.x,foot-1,0,p.x,foot-1,sr);
      sg.addColorStop(0,'rgba(0,0,0,0.42)');sg.addColorStop(0.6,'rgba(0,0,0,0.2)');sg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.save();ctx.translate(p.x,foot-1);ctx.scale(1,0.34);ctx.translate(-p.x,-(foot-1));
      ctx.fillStyle=sg;ctx.beginPath();ctx.arc(p.x,foot-1,sr,0,Math.PI*2);ctx.fill();ctx.restore();
      const h=PIXEL_ENV.draw(ctx,'brazier',p.x,foot,w);
      const heat=p.spillCd>0?0.4+0.6*(1-p.spillCd/TUNING.prop.brazier.spillCd):1;
      renderer.flame(p.x,foot-h*0.72,(9+(p.phase*2.5%2.5))*heat,p.phase*10);
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
    // A barrel of lamp oil. Standing, the sprite as drawn; knocked over, it lies on its side, and
    // rolling it goes end for end off how far it has come — whole quarter turns, so its pixels stay
    // square. Lit, one small flame sits on it for the whole fuse and the barrel shivers as it runs out.
    if(p.kind==='barrel'&&PIXEL_ENV.ready){
      const B=TUNING.prop.barrel,w=B.draw,lit=p.oilT>=0;
      ctx.save();ctx.translate(p.x,p.y);
      let top;
      if(p.lying){
        renderer.shadow(0,p.r*0.55,w*0.62,5);
        ctx.save();ctx.translate(0,p.r*0.15);
        ctx.rotate(Math.floor(p.spinD/(B.spinEvery*TILE))%2?-Math.PI/2:Math.PI/2);
        PIXEL_ENV.draw(ctx,'barrel',0,0,w,0.5);
        ctx.restore();top=-w*0.35;
      }else{
        renderer.shadow(0,p.r*0.6,w*0.44,6);
        const shiver=lit?Math.sin(renderer.t*60)*(1-p.oilT/B.fuse)*1.2:p.wobble>0?Math.sin(renderer.t*50)*p.wobble*4:0;
        top=p.r*0.8-PIXEL_ENV.draw(ctx,'barrel',shiver,p.r*0.8,w);
      }
      if(lit&&!renderer.silPass&&!renderer.baking)renderer.flame(0,top+2,B.fuseDraw,p.phase*10,p.oilWitch);
      ctx.restore();return true;
    }
    if(p.kind==='bell'){
      const w=p.r*2.7,img=this.images.gong;
      ctx.save();ctx.translate(p.x,p.y);
      if(p.rung>0)ctx.rotate(Math.sin(renderer.t*28)*0.035);
      const h=w*img.naturalHeight/img.naturalWidth;
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
    if(p.kind==='cage'&&this.images.cagePostTight?.naturalWidth){
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
      if(Math.hypot(p.vx||0,p.vy||0)>2)p.artFacing=Math.atan2(p.vy,p.vx);
      const angle=p.artFacing??Math.PI/4;
      renderer.shadow(p.x,p.y,8,3.5);ctx.save();ctx.translate(p.x,p.y);
      if(stunned)ctx.rotate(Math.PI*0.4);
      if(flying){ctx.save();ctx.rotate(angle);ctx.fillStyle='rgba(232,221,200,0.3)';for(let k=1;k<=3;k++)ctx.fillRect(-k*7,-2,4,2);ctx.restore();}
      this.character(renderer,{facing:angle},'chicken',28);ctx.restore();
      if(stunned)renderer.drawStars(p.x,p.y,14,Math.min(1,p.birdT*2));return true;
    }
    if(p.kind==='weapon'){
      if(!this.images.propsAtlas||!this.images.propsAtlas.naturalWidth)return super.drawProp(renderer,p);
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
      ctx.rotate(up?(p.weapon==='sword'?-Math.PI/2:0):p.flung?p.spin:(p.facing||0));
      // One size, whatever it is doing: racked, lying or in his mouth. It used to draw bigger on the
      // stand than anywhere else it is ever seen, which read as the object changing size the moment
      // you took it rather than as the same blade wherever it is.
      this.atlas(ctx,p.weapon,0,0,p.weapon==='sword'?24:22*TUNING.prop.weapon.shieldScale,undefined,0.5);
      ctx.restore();
      // What is left in a shield you are carrying: three studs, one per man or bullet it has in it.
      if(p.weapon==='shield'&&p.held&&p.uses>0){
        const n=TUNING.prop.weapon.uses.shield;
        for(let k=0;k<n;k++){
          ctx.fillStyle=k<p.uses?PALETTE.bone:'rgba(239,230,208,0.22)';
          ctx.fillRect(p.x-(n*5-2)/2+k*5,p.y-30,3.2,3.2);
        }
      }
      return true;
    }
    if(p.kind==='heal'){
      // Only the rarer, bigger patch — the one a secret sometimes gives up — is painted; the
      // ordinary sprout a level's own rhythm hands out has no atlas art of its own yet and falls
      // back to the smaller primitive tuft `Renderer.drawProp` draws.
      if(!p.big||!this.images.propsAtlas||!this.images.propsAtlas.naturalWidth)return super.drawProp(renderer,p);
      // v2's tighter, static 23px patch (brief item F) tested as too quiet to read as a heal spot in
      // a moving crowd — reverted to the original atlas stamp: bigger, with its own shadow and a slow
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
      if(!this.images.propsAtlas||!this.images.propsAtlas.naturalWidth)return super.drawProp(renderer,p);
      const S=TUNING.prop.spike,r=p.r,state=p.spikeState,arming=state==='armed';
      const shud=arming?Math.sin(renderer.t*70)*1.1*clamp(1-p.spikeT/S.arm,0,1):0;
      // Down still shows teeth (it is retracting, not safe yet); idle and rest share the flat plate.
      const name=state==='up'||state==='down'?'spikes-up':arming?'spikes-arming':'spikes-idle';
      ctx.save();ctx.translate(p.x+shud,p.y);
      // A whole tile, squashed like the floor — see the spike branch in AltarArt/Renderer for why.
      this.atlas(ctx,name,0,0,r*2.2,r*2.2*TILT,0.5);
      ctx.restore();
      return true;
    }
    if(p.kind==='bomb'){
      // No painted asset for this one — a rare find drawn plainly, primitive on purpose: a dark
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
      this.drawWall(ctx,renderer.game.level.def,p.x-TILE/2,p.y-TILE/2,p.wallSide==='up'?4:1);
      ctx.restore();
      // The crack tells still have to be drawn: the art carries none, and they're what the blow count
      // reads as (see `Renderer.wallCrack` / CLAUDE.md's "A wall that gives").
      renderer.wallCrack(p.x,p.y,p.hits||0);
      return true;
    }
    return false;
  }

  // The wisp's painted body: `Renderer.soulWisp` keeps its own halo (before) and orbiting sparks
  // (after) procedural — those are what read as motion, and the art has no frames to animate them.
  soulWispBody(ctx, w) {
    return this.atlas(ctx, 'soul-wisp', 0, 0, w, undefined, 0.56);
  }

  // 1.66: the brute wears the Butcher's old sheet (skull, apron, cleaver) and the Butcher's kind is
  // the ogre, drawn by js/ogre-pixels.js (`butcher.scale` a size up). The red-robed `brute` sheet is
  // unused for now.
  characterKey(e) { if(e.kind==='butcher')return 'ogre'; if(e.kind==='ratogre')return 'ratogre'; return e.kind==='bearer'?(e.champion?'butcher':'clubman'):e.kind==='seer'?'mage':e.kind==='dog'?'hound':['hunter','wraith'].includes(e.kind)?e.kind:null; }

  // The art is a top-down slab at the collision footprint, with no frame or square padding.
  doorSlab(ctx,p,wdt,hgt) {
    const type=p.gate?'Soul':p.vault?'Vault':p.iron?'Iron':'Wood',key='slab'+type+'Closed';
    if(!this.images[key]?.naturalWidth)return false;
    ctx.save();if(!p.vertical)ctx.rotate(Math.PI/2);
    this.stamp(ctx,key,0,0,13,58);ctx.restore();return true;
  }

  brokenPost(game,p) {
    if(!this.images.cageBrokenTight?.naturalWidth)return;
    const ctx=game.world.dctx;ctx.save();ctx.globalAlpha=0.8;
    this.stamp(ctx,'cageBrokenTight',p.x,p.y,22,7,0.5);ctx.restore();
  }

  brokenDoor(game,p) {
    const type=p.gate?'Soul':p.vault?'Vault':p.iron?'Iron':'Wood',image=this.images['slab'+type];
    if(!image?.naturalWidth)return;
    const ctx=game.world.dctx;ctx.save();ctx.translate(p.x,p.y);if(!p.vertical)ctx.rotate(Math.PI/2);
    ctx.globalAlpha=0.75;this.drawFrame(ctx,image,384,0,128,128,0,0,64,64);ctx.restore();
  }

  // Every unit is a pixel sprite now (`PIXEL_ART`); what is left here is the lean of a windup or a
  // swing, the tip of a man on the floor, the wraith's fade and the rat ogre's grow-in.
  character(renderer,e,key,width) {
    const ctx=renderer.ctx, angle=e.facing||0, moving=Math.hypot(e.vx||0,e.vy||0)>30;
    const pixel=PIXEL_ART.unit(key); if(!pixel)return;
    ctx.save();
    if(key==='ratogre'&&e.state==='emerge'){const k=1-Math.max(0,e.timer)/TUNING.ratogre.emerge;ctx.scale(0.4+0.6*k,0.4+0.6*k);ctx.globalAlpha*=0.5+0.5*k;}
    if(key==='wraith'){
      const born=e.state==='manifest'?1-Math.max(0,e.timer)/TUNING.wraith.manifest:(e.ghosted?0:1);
      ctx.globalAlpha*=0.35+born*0.65;const puff=1.12-born*0.12;ctx.scale(puff,puff);
    }
    if(e.state==='windup'||e.state==='chargewind'||e.state==='slamwind'){ctx.translate(Math.cos(angle)*-2,Math.sin(angle)*-2);ctx.rotate(-0.13);}
    if(e.state==='swing'){ctx.translate(Math.cos(angle)*3,Math.sin(angle)*3);ctx.rotate(0.17);}
    if(e.state==='dart'){ctx.scale(1.17,0.85);ctx.strokeStyle=PALETTE.bone;ctx.globalAlpha*=0.45;ctx.beginPath();ctx.moveTo(-width*0.4,5);ctx.lineTo(-width*0.7,5);ctx.stroke();ctx.globalAlpha/=0.45;}
    if(e.state==='floored'||e.state==='stunned')ctx.rotate(0.7);
    // The hound has no stride on the sheet: running, he bounces (`dog.gait`, `dog.bob`), or he is a
    // picture of a dog sliding round the floor.
    if(key==='hound'&&moving){const G=TUNING.dog;ctx.translate(0,-Math.abs(Math.sin(renderer.t*G.gait*Math.PI+e.x*0.02))*G.bob);}
    // The ogre has no atlas body: his own hand-drawn one (js/ogre-pixels.js), fists up through a slam or a leap.
    if(key==='ogre'&&typeof OGRE_PIXELS!=='undefined'&&OGRE_PIXELS.draw)OGRE_PIXELS.draw(ctx,angle,moving,renderer.t,e.x,e.state==='slamwind'||e.state==='hopwind'||e.state==='hop'?'up':'idle');
    else PIXEL_ART.draw(ctx,pixel,angle,moving,renderer.t,e.x);
    // His horns as the butt souls have made them, in the same lean as the frame (`drawGoat` sets it).
    if(key==='sheep'&&this.hornMods){PIXEL_ART.horns(ctx,pixel,angle,moving,renderer.t,e.x,this.hornMods);PIXEL_ART.face(ctx,angle,renderer.t,this.hornMods,e);}
    ctx.restore();
  }

  // A cord round the neck with the talisman hanging off it, placed off the facing: the neck of the
  // eight-way sheep sits a little way toward the head from the cell's centre, and the pendant hangs
  // toward the camera from there. One drawing per artifact (`Renderer.artifactIcon`), small.
  // A charm knotted into the wool at the back of his neck, not a pendant at his throat: the sheep
  // sheet already paints a bell there (the one he was born with — see `CLAUDE.md`), and stacking a
  // second small ornament on the exact same few pixels buried the talisman under it rather than
  // beside it. `-cx` puts the charm behind him the same way `+cx` is his own nose: opposite
  // whichever of the eight painted facings is on screen, which is the one spot this sprite was
  // actually checked, facing by facing, to be open fur rather than the bell, the face or the tail.
  collar(renderer,g,art) {
    const ctx=renderer.ctx,a=g.facing,cx=Math.cos(a),sy=Math.sin(a);
    // The pixel goat has no bell: the charm hangs at his throat on a cord, per facing (`PIXEL_NECK`).
    if(PIXEL_ART.unit('sheep')){
      // One collar for every talisman, turned with him; only the pendant changes. It is a ring round
      // the neck seen from the camera: an ellipse whose short axis lies along the way he faces
      // (squashed to a band on a side view, opened to a curve under the chin from the front), and
      // only its near half is drawn — the half toward the camera — because the rest is behind his
      // neck. It was one fixed smile of cord at every facing, which lay across the neck like a
      // mouth on the side views. Its front sits on the throat point `PIXEL_NECK` measured.
      const d=(Math.round(a/(Math.PI/4))+14)%8,[nx,ny]=PIXEL_NECK[d],back=d>=3&&d<=5,C=TUNING.goat.collar;
      const col=(ARTIFACTS.find((x)=>x.id===art.id)||{}).color||PALETTE.bone;
      const fa=(d+2)*(Math.PI/4);                    // the facing this frame was drawn at
      // A diagonal frame shows the head nearly side-on, so the ring turns further toward a side view
      // than the world angle says (`C.flat` on the vertical part of the facing).
      let vx=Math.cos(fa),vy=Math.sin(fa)*(Math.abs(Math.cos(fa))>0.1?C.flat:1);
      const vl=Math.hypot(vx,vy)||1;vx/=vl;vy/=vl;
      if(vy<-0.1){vx=-vx;vy=-vy;}                    // the near side of the ring
      // On the two front diagonals the ring rises toward the nape, behind the jaw, and dips at the
      // throat under the chin; turned the plain way it rose toward his face and sat on it like a hook.
      if(d===1||d===7)vx=-vx;
      const R=C.r,r=C.r*C.depth*Math.abs(vy)+C.thin,cx=nx-vx*r,cy=ny-vy*r;
      const rot=Math.atan2(-vx,vy);                  // u = (vy, -vx), so the arc 0..π is the near half
      ctx.save();ctx.lineCap='round';
      ctx.strokeStyle=C.edge;ctx.lineWidth=C.w+1.2;
      ctx.beginPath();ctx.ellipse(cx,cy,R,r,rot,0,Math.PI);ctx.stroke();
      ctx.strokeStyle=C.leather;ctx.lineWidth=C.w;
      ctx.beginPath();ctx.ellipse(cx,cy,R,r,rot,0.08,Math.PI-0.08);ctx.stroke();
      if(back){ctx.fillStyle=col;ctx.fillRect(cx-R*0.55-0.8,cy+r*0.6-0.8,1.6,1.6);ctx.fillRect(cx+R*0.55-0.8,cy+r*0.6-0.8,1.6,1.6);}
      else{
        // The ring the pendant hangs from, then the pendant itself, below the front of the collar.
        ctx.strokeStyle=C.edge;ctx.lineWidth=1;ctx.beginPath();ctx.arc(nx,ny+1.3,1.1,0,Math.PI*2);ctx.stroke();
        renderer.artifactIcon(art.id,nx,ny+C.drop,C.icon,art.tier);
      }
      ctx.restore();return;
    }
    const nx=-cx*7,ny=-6+sy*3;
    ctx.save();
    ctx.strokeStyle='#5a3d24';ctx.lineWidth=1.5;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(nx-3,ny-2);ctx.lineTo(nx+3,ny+2);ctx.moveTo(nx+3,ny-2);ctx.lineTo(nx-3,ny+2);ctx.stroke();
    renderer.artifactIcon(art.id,nx,ny,3.3,art.tier);
    ctx.restore();
  }

  // One blot of blood in his wool per heart he has lost, big enough to count from across a room.
  // They used to be small dark drops about his hooves, which read as something spilt on the floor
  // rather than as him. On the pixel goat they are masked to the sprite itself — painted into a
  // scratch canvas, then cut by the same frame with `destination-in` — so blood is only ever on him.
  wounds(renderer,g,miss) {
    const ctx=renderer.ctx,W=TUNING.goat.wounds,n=Math.min(miss,W.spots.length);
    // Smaller the more he faces the camera (`W.front`): +y is toward it.
    const face=1-(1-W.front)*Math.max(0,Math.sin(g.facing||0));
    const blot=(c,k)=>{const[x,y]=W.spots[k],r=(W.r+k*W.grow)*face;
      c.fillStyle=PALETTE.bloodDark;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.arc(x+r*0.7,y+r*0.35,r*0.6,0,Math.PI*2);c.fill();
      c.fillStyle=PALETTE.blood;c.beginPath();c.arc(x-r*0.2,y-r*0.2,r*0.45,0,Math.PI*2);c.fill();};
    const unit=PIXEL_ART.unit('sheep');
    if(!unit){ctx.save();ctx.globalAlpha*=0.8;for(let k=0;k<n;k++)blot(ctx,k);ctx.restore();return;}
    // 48 world px square round the foot at 2x, which holds the whole goat on every facing.
    const S=2,B=48,ox=24,oy=40;
    const cv=this.woundCanvas||(this.woundCanvas=document.createElement('canvas'));
    if(cv.width!==B*S){cv.width=B*S;cv.height=B*S;}
    const c=cv.getContext('2d');
    c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';c.clearRect(0,0,cv.width,cv.height);
    c.setTransform(S,0,0,S,ox*S,oy*S);
    for(let k=0;k<n;k++)blot(c,k);
    c.globalCompositeOperation='destination-in';
    PIXEL_ART.draw(c,unit,g.facing||0,Math.hypot(g.vx||0,g.vy||0)>30,renderer.t,g.x);
    c.globalCompositeOperation='source-over';
    ctx.save();ctx.globalAlpha*=W.alpha;
    // The same lean `character()` gives a windup or a swing, or the blots slide off him mid-blow.
    const a=g.facing||0;
    if(g.state==='windup'){ctx.translate(Math.cos(a)*-2,Math.sin(a)*-2);ctx.rotate(-0.13);}
    if(g.state==='swing'){ctx.translate(Math.cos(a)*3,Math.sin(a)*3);ctx.rotate(0.17);}
    if(g.state==='stunned')ctx.rotate(0.7);
    ctx.drawImage(cv,-ox,-oy,B,B);ctx.restore();
  }

  // What leaves his face and stays in the world a moment (`TUNING.goat.face`): VENOM SPIT's drop off
  // the chin and the splat it makes, DRAGON BREATH's steam off a nostril and now and then a lick of
  // flame. A point is where it stands on the floor plus `z` screen px above it, so a drop let go
  // of mid-run falls where it was let go of, not after him. Cosmetic: nothing reads it back.
  goatFx(renderer,g,game) {
    const ctx=renderer.ctx,F=TUNING.goat.face,m=game.mods||{},t=renderer.t,fx=this.fx||(this.fx=[]);
    const dt=clamp(t-(this.fxT??t),0,0.1);this.fxT=t;
    const d=(Math.round((g.facing||0)/(Math.PI/4))+14)%8,P=PIXEL_FACE[d],fa=(d+2)*Math.PI/4,ux=Math.cos(fa),uy=Math.sin(fa);
    const live=PIXEL_ART.unit('sheep')&&!['roll','falling','ko'].includes(g.state)&&!game.stairFx;
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
    for(const t of g.trail){ctx.save();ctx.globalAlpha=t.life/(t.max||TUNING.goat.trail.life)*0.12;ctx.translate(t.x,t.y);ctx.scale(1,1/TILT);this.character(renderer,{facing:t.a},'sheep',40);ctx.restore();}
    // A fidget (`Goat.update`, `goat.idle`) as a 0..1 through it, and how high a pronk has him.
    const I=TUNING.goat.idle,fid=g.fidget,fk=fid?clamp(fid.t/fid.dur,0,1):0;
    // A pronk off the fidget, or a LEAPFROG vault: the same lift off his shadow, in whole pixels.
    const lp=g.leap,hop=lp?Math.sin(clamp(lp.t/lp.time,0,1)*Math.PI)*lp.h
      :fid&&fid.kind==='hop'&&fk>0.2&&fk<0.8?Math.sin((fk-0.2)/0.6*Math.PI)*I.hop.h:0;
    const sh=Math.max(0.2,1-hop*0.03);   // a leap higher than ~26 px would hand `ellipse` a negative radius
    renderer.shadow(g.x,g.y,16*sh,7*sh);
    ctx.save();ctx.translate(g.x,g.y);ctx.scale(1,1/TILT);
    if(g.jitter)ctx.translate(g.jitter.x,g.jitter.y);
    // Weight in the stride: a hop per hoof-fall in step with the walk frames, in whole pixels, and
    // the lean `Goat.update` smooths into a change of pace. Turned about the hooves.
    const FE=TUNING.goat.feel,spd=Math.hypot(g.vx||0,g.vy||0);
    if(g.state==='idle'&&spd>30){const k=Math.min(1,spd/(TUNING.goat.speed||1));ctx.translate(0,-Math.round(Math.abs(Math.sin((renderer.t*8+(g.x||0)*0.05)*Math.PI/2))*FE.bob*k));}
    if(g.lean)ctx.rotate(g.lean);
    if(hop)ctx.translate(0,-Math.round(hop));
    if(fid){
      if(fid.kind==='hop'){if(fk<0.2)ctx.scale(1.07,0.91);else if(fk<0.8)ctx.scale(0.96,1.05);else ctx.scale(1.06,0.93);}
      else if(fid.kind==='shake')ctx.rotate(Math.sin(fid.t*I.shake.freq)*I.shake.amp*(1-fk));
      else if(fid.kind==='paw'){const n=I.paw.scrapes,s=Math.sin(fk*n*Math.PI);ctx.translate(Math.cos(g.facing)*I.paw.dist*s,Math.sin(g.facing)*I.paw.dist*s*TILT);}
    }
    const fx=game.stairFx,climb=fx?clamp(fx.dir>0?fx.t:1-fx.t,0,1):0;
    if(climb>0){ctx.translate(0,-TUNING.stairs.rise*climb);ctx.scale(1-0.22*climb,1-0.22*climb);ctx.globalAlpha=1-climb*0.55;}
    if(g.state==='falling'){const F=TUNING.fall,d=clamp((F.time+F.back-g.timer)/F.time,0,1);ctx.translate(0,d*26);ctx.rotate(d*1.5);ctx.scale(1-0.72*d,1-0.72*d);ctx.globalAlpha=1-d;}
    // A vault is not a tumble: stretched out long at the top of it rather than spun.
    if(g.state==='roll'){if(lp){const k=Math.sin(clamp(lp.t/lp.time,0,1)*Math.PI);ctx.scale(1+0.1*k,1-0.06*k);}else{ctx.rotate(g.rollSpin);ctx.scale(0.88,0.88);}}
    if(g.state==='windup'){const W=TUNING.goat.headbutt.windup,k=clamp(1-(g.timer||0)/W,0,1),a=g.aim||{x:0,y:0};
      ctx.translate(-a.x*FE.pull*k,-a.y*FE.pull*k*TILT);ctx.scale(0.85,1.1);}
    if(g.state==='lunge')ctx.scale(1.15,0.92);
    if(g.state==='ko'||g.state==='stunned'){ctx.rotate(0.9);ctx.scale(1.1,0.8);}
    // The squash spring (game.squashGoat): a landed blow, a blow taken, the end of a roll.
    if(g.sqLeft){const a=g.sqLeft*Math.cos(TUNING.juice.squash.freq*g.sqT);ctx.scale(1+a,1-a);}
    if(g.invuln>0&&Math.floor(renderer.t*30)%2===0)ctx.globalAlpha*=0.5;
    // Standing still he breathes: taller and a touch narrower from the hooves up, then back.
    if(g.state==='idle'&&Math.hypot(g.vx||0,g.vy||0)<=30){const B=TUNING.goat.breathe,b=(1-Math.cos(renderer.t*Math.PI*2/B.period))/2;ctx.scale(1-B.wide*b,1+B.amp*b);}
    // A glance is one facing aside and back; the facing is lent for the drawing and handed back.
    const f0=g.facing,look=fid&&fid.kind==='look'&&fk>0.12&&fk<0.88;
    if(look)g.facing=f0+fid.dir*Math.PI/4;
    try{
      this.hornMods=game.mods;this.character(renderer,g,'sheep',40);
      // The blood is in his wool; the collar is over it, since a talisman has to read at any health.
      if(g.maxHp-g.hp>0)this.wounds(renderer,g,g.maxHp-g.hp);
      if(game.artifact)this.collar(renderer,g,game.artifact);
      if(g.onFire)renderer.flame(0,-6,12,1,g.witchFire);
    }finally{g.facing=f0;this.hornMods=null;}   // a throw mid-glance must not leave the simulation's goat turned
    ctx.restore();
    this.goatFx(renderer,g,game);
    if(g.dazed>0&&!(game.intro&&game.intro.fade>0))renderer.drawStars(g.x,g.y,30,Math.min(1,g.dazed*1.5));
    if(game.touch.active&&game.state==='play'){const a=game.input.aim;ctx.fillStyle=PALETTE.bone;ctx.beginPath();ctx.arc(g.x+a.x*34,g.y+a.y*34,2,0,Math.PI*2);ctx.fill();}
  }
}
