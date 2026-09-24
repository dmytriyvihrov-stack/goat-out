// World: tile grid, fire simulation, line of sight, flow field for chasing, noise events, persistent decals.
const DECAL_SCALE = 0.34;

// The eight octants a shadowcast is split into: [xx, xy, yx, yy] for each. One pass of the same
// routine per octant is the whole of the algorithm.
const VIS_OCTANTS = [
  [1, 0, 0, -1], [0, 1, -1, 0], [0, -1, -1, 0], [-1, 0, 0, -1],
  [-1, 0, 0, 1], [0, -1, 1, 0], [0, 1, 1, 0], [1, 0, 0, 1],
];

// Blocky cult pictograms, drawn cell by cell so they read as stamped pixel art. The cult is a
// butcher's cult, and its marks are the tools and the cuts: the skull of the last goat (the sign
// under the pen), the cleaver, the hook (beside the altar and on the title), the rack of ribs, the
// crossed bones. All of them in blood.
const CULT_GLYPHS = [
  ['##.......##', '.##.....##.', '..#######..', '.#########.', '.##..#..##.', '.##..#..##.', '..#######..', '...#####...', '...#.#.#...', '....###....', '.....#.....'],
  ['...........', '#######....', '#.#########', '#######.###', '#######....', '#######....', '#######....', '#######....', '.######....', '..#####....', '...........'],
  ['....###....', '....#.#....', '....###....', '.....#.....', '.....#.....', '.....#.....', '.#...#.....', '.#...#.....', '.##.##.....', '..###......', '...........'],
  ['.....#.....', '.###.#.###.', '#....#....#', '.###.#.###.', '#....#....#', '.###.#.###.', '#....#....#', '..##.#.##..', '.....#.....', '....###....', '.....#.....'],
  ['##.......##', '###.....###', '.##.....##.', '..##...##..', '...##.##...', '....###....', '...##.##...', '..##...##..', '.##.....##.', '###.....###', '##.......##'],
];

class World {
  constructor(level) {
    // Its own copy of the grid: play mutates it (a clamp, a niche still behind its wall, the rat
    // ogre's breach) and the level as generated is what the rules and the room plans read.
    this.level = level; this.W = level.W; this.H = level.H; this.tiles = level.tiles.slice();
    const n = this.W * this.H;
    this.fire = new Float32Array(n);      // seconds of burning left
    this.fireKind = new Uint8Array(n);    // 0 ordinary flame, 1 the Seer's witchfire
    this.spread = new Float32Array(n);    // spread accumulator
    // Poison lying on the floor, seconds left a tile, and the tiles that have any — a puddle is a
    // handful of tiles in a world of thirty thousand, so `js/status.js` walks the set, not the grid.
    this.poison = new Float32Array(n);
    this.poisonOn = new Set();
    this.flow = new Int16Array(n).fill(-1);
    // The field a chasing man actually walks (`Enemy.pickWaypoint`). `flow` is the one everything
    // else asks — is this floor reachable, how far is it — and stays stone-and-holes only; `route`
    // also steps round the tiles standing furniture is in (`furn`, laid by the game each time the
    // fields are rebuilt), and `routeW` is the same for a body wider than a tile (the Butcher, the rat
    // ogre): only floor that sits in some two-by-two of open floor, so no route takes him at a gap he
    // cannot fit through. That one is filled on demand (`wideWanted`), since most floors have nobody
    // that size awake on them.
    this.route = new Int16Array(n).fill(-1);
    this.routeW = new Int16Array(n).fill(-1);
    this.furn = new Uint8Array(n); this.furnList = [];
    this.wideWanted = false;
    this.flowTimer = 0;
    this.noises = [];
    this.decal = document.createElement('canvas');
    this.decal.width = Math.ceil(this.W * TILE * DECAL_SCALE);
    this.decal.height = Math.ceil(this.H * TILE * DECAL_SCALE);
    this.dctx = this.decal.getContext('2d');
    this.dctx.scale(DECAL_SCALE, DECAL_SCALE);
    this.stains = new Map();
    this.fireSfxTimer = 0;
    // What the goat can see from where he is standing. One byte a tile, rebuilt every step by
    // `computeVis`, and the box it last filled so the clear costs the same as the cast.
    this.vis = new Uint8Array(n);
    this.visBox = null;
    // Things that are not stone but are as good as it to an eye: a shut door, the gong, the hub of
    // the wheel. The cone the cult sees down already stops at them (`game.sees`), and now so does
    // the goat's own — standing at a shut door and seeing the room behind it was the one place the
    // two disagreed. The list is a handful long, so it is cleared by what was last in it.
    this.visBlock = new Uint8Array(n);
    this.visBlockList = [];
    // THE CAVE. `round` is the radius every corner of the rock is rounded to, in the collision
    // (`collideCircle`) exactly as the renderer draws it; 0 everywhere else. `grass` is one byte a
    // tile of tall grass, which fire burns off and a headbutt cuts. `block` is a boulder standing on
    // a tile: the flow field walks round it the way it walks round stone, and it clears when the
    // boulder breaks.
    this.round = level.def && level.def.cave ? TUNING.cave.roundR : 0;
    this.grass = new Uint8Array(n);
    for (const i of (level.grass || [])) this.grass[i] = 1;
    this.block = new Uint8Array(n);
    this.paintGlyphs(level);
  }

  // Cult sign painted straight onto the floor, as blocky pixel pictograms.
  paintGlyphs(level) {
    const rng = new RNG(level.seed ^ 0x9e37);
    for (const room of level.rooms) {
      if (room.index === 0) continue;
      const count = 1 + (rng.next() * 2 | 0);
      for (let i = 0; i < count; i++) {
        const tx = rng.int(room.x + 2, room.x + room.w - 3), ty = rng.int(room.y + 2, room.y + room.h - 3);
        if (this.tileAt(tx, ty) === T.WALL) continue;
        this.pixelGlyph((tx + 0.5) * TILE, (ty + 0.5) * TILE, rng.float(2.4, 4.6) * TILE,
          CULT_GLYPHS[rng.int(0, CULT_GLYPHS.length - 1)], rng.float(0.1, 0.2), PALETTE.blood);
      }
      if (rng.chance(0.5)) {
        const tx = rng.int(room.x + 1, room.x + room.w - 2), ty = rng.int(room.y + 1, room.y + room.h - 2);
        if (this.tileAt(tx, ty) !== T.WALL) {
          this.dctx.globalAlpha = 0.16;
          for (let k = 0; k < 5; k++) this.dot((tx + 0.5) * TILE + rng.float(-20, 20), (ty + 0.5) * TILE + rng.float(-20, 20), rng.float(3, 8), PALETTE.bloodDark);
          this.dctx.globalAlpha = 1;
        }
      }
    }
    this.paintStartRoom(level, rng);
  }

  // Grid pictogram: every cell is a hard square, no curves. Quasimorph reads this way.
  pixelGlyph(cx, cy, size, rows, alpha, color) {
    const c = this.dctx, n = rows.length;
    // Snap every cell to whole decal pixels, or the upscale turns hard squares into mush.
    const px = 1 / DECAL_SCALE;
    const cell = Math.max(px, Math.round(size / n * DECAL_SCALE) * px);
    const x0 = Math.round((cx - cell * n / 2) * DECAL_SCALE) * px;
    const y0 = Math.round((cy - cell * n / 2) * DECAL_SCALE) * px;
    c.save(); c.globalAlpha = alpha; c.fillStyle = color;
    for (let r = 0; r < n; r++) {
      for (let q = 0; q < rows[r].length; q++) {
        if (rows[r][q] !== '#') continue;
        c.fillRect(x0 + q * cell, y0 + r * cell, cell, cell);
      }
    }
    c.restore(); c.globalAlpha = 1;
  }

  // A tapered horn on the decal canvas: base, a control point for the sweep, and the tip.
  hornDecal(bx, by, cx, cy, tx, ty, w, color) {
    const c = this.dctx, dx = tx - bx, dy = ty - by, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    c.fillStyle = color; c.beginPath();
    c.moveTo(bx + nx * w, by + ny * w);
    c.quadraticCurveTo(cx + nx * w * 0.55, cy + ny * w * 0.55, tx, ty);
    c.quadraticCurveTo(cx - nx * w * 0.55, cy - ny * w * 0.55, bx - nx * w, by - ny * w);
    c.closePath(); c.fill();
  }

  // The room you wake in. The altar stands ready off to one side, with the straps, the knife and
  // what is left of the goat that went before you. You are in the pen in the middle of it.
  // Every later level arrives up a flight of stairs into a bare room, and gets none of this.
  paintStartRoom(level, rng) {
    const c = this.dctx, sx = level.start.x, sy = level.start.y;
    if (!level.def || !level.def.ritual) {
      // the top of the stairs: stone worn smooth by whoever came up before
      c.save(); c.globalAlpha = 0.16; c.fillStyle = PALETTE.ash;
      c.beginPath(); c.ellipse(sx + 8, sy, 42, 27, 0, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1; c.restore();
      return;
    }
    if (levelIndexOf(level.def) === 0) {
      // Static objects keep full world-pixel detail; blood still lands on the normal decal layer.
      this.ritualArt = new AltarArt().makeRitual(level);
      this.pixelGlyph(sx, sy, 8.5 * TILE, CULT_GLYPHS[0], 0.12, PALETTE.blood);
      return;
    }
    const ax = sx - 4 * TILE, ay = sy - 0.2 * TILE;      // the altar, beside you, still waiting
    this.pixelGlyph(sx, sy, 8.5 * TILE, CULT_GLYPHS[0], 0.2, PALETTE.blood);
    this.pixelGlyph(ax, ay, 4.6 * TILE, CULT_GLYPHS[2], 0.13, PALETTE.blood);

    // the floor of the pen: trodden dirt and old straw
    if (level.def && level.def.startCage) {
      const C = TUNING.prop.cage, hw = C.halfW * TILE, hh = C.halfH * TILE;
      c.save();
      c.globalAlpha = 0.22; c.fillStyle = PALETTE.ash;
      c.fillRect(sx - hw, sy - hh, hw * 2, hh * 2);
      c.globalAlpha = 0.3; c.strokeStyle = PALETTE.hayDark; c.lineWidth = 2.4; c.lineCap = 'round';
      for (let k = 0; k < 46; k++) {
        const px = sx + rng.float(-hw + 5, hw - 5), py = sy + rng.float(-hh + 5, hh - 5), a = rng.float(0, Math.PI);
        c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a) * 11, py + Math.sin(a) * 11); c.stroke();
      }
      c.globalAlpha = 1; c.restore();
    }

    // the slab
    c.save();
    c.fillStyle = 'rgba(150,140,128,0.5)'; c.fillRect(ax - 52, ay - 30, 104, 60);
    c.fillStyle = 'rgba(190,180,166,0.45)'; c.fillRect(ax - 52, ay - 30, 104, 7);
    c.strokeStyle = 'rgba(26,16,22,0.45)'; c.lineWidth = 3; c.strokeRect(ax - 52, ay - 30, 104, 60);
    // straps, open and waiting for whatever they drag up next
    c.strokeStyle = '#5a4230'; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(ax - 34, ay - 30); c.lineTo(ax - 34, ay - 4); c.lineTo(ax - 46, ay + 8); c.stroke();
    c.beginPath(); c.moveTo(ax + 30, ay - 30); c.lineTo(ax + 30, ay - 2); c.lineTo(ax + 44, ay + 10); c.stroke();
    c.beginPath(); c.moveTo(ax - 30, ay + 30); c.lineTo(ax - 24, ay + 12); c.stroke();
    c.beginPath(); c.moveTo(ax + 26, ay + 30); c.lineTo(ax + 18, ay + 14); c.stroke();
    c.restore();

    // What is left of the one that came before, about your own size: they have done this before,
    // and to something like you.
    const bx = sx - 4.9 * TILE, by = sy + 1.7 * TILE;
    c.save(); c.translate(bx, by); c.rotate(-0.12); c.scale(0.7, 0.7);
    c.fillStyle = 'rgba(122,31,24,0.5)';
    for (let k = 0; k < 14; k++) c.beginPath(), c.arc(rng.float(-46, 52), rng.float(-30, 30), rng.float(8, 20), 0, Math.PI * 2), c.fill();
    c.strokeStyle = '#bdb298'; c.lineWidth = 6;                                                   // spine, nose to tail
    c.beginPath(); c.moveTo(-14, -2); c.lineTo(58, 3); c.stroke();
    c.strokeStyle = '#cfc3a8'; c.lineWidth = 4.5;                                                 // ribs, opened out
    for (let k = 0; k < 7; k++) {
      const rx = -4 + k * 9.5;
      c.beginPath(); c.moveTo(rx, -3); c.quadraticCurveTo(rx + 9, -12, rx + 5, -21); c.stroke();
      c.beginPath(); c.moveTo(rx, 2); c.quadraticCurveTo(rx + 9, 12, rx + 5, 22); c.stroke();
    }
    c.strokeStyle = '#c8bda2'; c.lineWidth = 4;                                                   // hind legs, splayed
    c.beginPath(); c.moveTo(52, 2); c.lineTo(64, -16); c.lineTo(58, -26); c.stroke();
    c.beginPath(); c.moveTo(52, 4); c.lineTo(66, 18); c.lineTo(61, 29); c.stroke();
    c.fillStyle = '#d8cdb4';                                                                      // skull and long jaw
    c.beginPath(); c.ellipse(-22, -4, 16, 11, -0.25, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(-38, 0, 9.5, 6.5, -0.15, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1a1016'; c.fillRect(-27, -8, 5, 3.6);                                         // eye socket
    // the horns: short, thick at the root, curving back off the crown and stopping well short of the
    // ribs. Lying on its side, one shows above the skull and the other below it.
    this.hornDecal(-21, -11, -16, -25, -4, -23, 4.4, '#b3a78e');
    this.hornDecal(-19, 4, -14, 18, -3, 16, 4.4, '#a89b80');
    c.restore();

    // The tools they work with, laid out on the floor beside the altar where anyone can read them.
    const tx0 = sx - 3.6 * TILE, ty0 = sy - 2.3 * TILE;
    c.save(); c.translate(tx0, ty0);
    c.fillStyle = 'rgba(122,31,24,0.45)';
    c.beginPath(); c.ellipse(2, 10, 38, 13, 0.06, 0, Math.PI * 2); c.fill();

    // a cleaver: a heavy rectangle with a bite out of the back and a short handle
    c.save(); c.translate(-34, 0); c.rotate(0.18);
    c.fillStyle = '#c9c2b5'; c.fillRect(-14, -11, 26, 20);
    c.fillStyle = '#0f0b0e'; c.beginPath(); c.arc(8, -11, 4.5, 0, Math.PI * 2); c.fill();          // rivet hole
    c.fillStyle = '#7a1f18'; c.fillRect(-14, 5, 26, 4);                                            // the edge, wet
    c.fillStyle = '#4a3420'; c.fillRect(12, -5, 18, 9);
    c.fillStyle = PALETTE.ochre; c.fillRect(12, -5, 3.5, 9);
    c.restore();

    // a boning knife
    c.save(); c.translate(6, -6); c.rotate(-0.12);
    c.fillStyle = '#c9c2b5';
    c.beginPath(); c.moveTo(-16, -3.5); c.lineTo(12, -4.5); c.lineTo(26, 0); c.lineTo(12, 3.5); c.lineTo(-16, 2.5); c.closePath(); c.fill();
    c.fillStyle = '#7a1f18'; c.fillRect(0, -4, 18, 7);
    c.fillStyle = '#4a3420'; c.fillRect(-30, -5.5, 15, 11);
    c.restore();

    // a bone saw: a straight blade with teeth you can count
    c.save(); c.translate(4, 20); c.rotate(0.05);
    c.fillStyle = '#b9b2a4'; c.fillRect(-30, -4, 52, 6);
    c.fillStyle = '#b9b2a4';
    for (let k = 0; k < 13; k++) {
      c.beginPath(); c.moveTo(-30 + k * 4, 2); c.lineTo(-27.8 + k * 4, 6.5); c.lineTo(-25.6 + k * 4, 2); c.closePath(); c.fill();
    }
    c.fillStyle = '#4a3420'; c.fillRect(22, -7, 16, 12);
    c.fillStyle = '#2e2a26'; c.fillRect(22, -7, 16, 3);
    c.restore();

    // a meat hook, hanging point down
    c.save(); c.translate(40, -10);
    c.strokeStyle = '#9a948a'; c.lineWidth = 4.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, -14); c.lineTo(0, 4); c.quadraticCurveTo(0, 16, -11, 14); c.stroke();
    c.fillStyle = '#7a1f18'; c.beginPath(); c.arc(-12, 15, 3.2, 0, Math.PI * 2); c.fill();
    c.restore();
    c.restore();

    // The other cage. Whatever they put in it stopped waiting a while ago.
    const D = TUNING.prop.deadCage, dw = D.halfW * TILE, dh = D.halfH * TILE;
    c.save(); c.translate(sx + D.dx * TILE, sy + D.dy * TILE);
    c.globalAlpha = 0.22; c.fillStyle = PALETTE.ash; c.fillRect(-dw, -dh, dw * 2, dh * 2);
    c.globalAlpha = 0.3; c.strokeStyle = PALETTE.hayDark; c.lineWidth = 2.4; c.lineCap = 'round';
    for (let k = 0; k < 18; k++) {
      const px = rng.float(-dw + 5, dw - 5), py = rng.float(-dh + 5, dh - 5), a = rng.float(0, Math.PI);
      c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a) * 10, py + Math.sin(a) * 10); c.stroke();
    }
    c.globalAlpha = 1;
    // the pool, dried at the edges
    c.fillStyle = 'rgba(122,31,24,0.3)'; c.beginPath(); c.ellipse(3, 7, 27, 13, 0.1, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(122,31,24,0.55)'; c.beginPath(); c.ellipse(1, 6, 19, 9, 0.1, 0, Math.PI * 2); c.fill();
    // a sheep on its side, legs out straight, head thrown back
    c.rotate(0.22);
    c.strokeStyle = '#3a322f'; c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(7, 4); c.lineTo(12, 18); c.moveTo(2, 5); c.lineTo(6, 19);
    c.moveTo(-8, 5); c.lineTo(-5, 19); c.moveTo(-12, 4); c.lineTo(-10, 18);
    c.stroke();
    c.fillStyle = '#a49b8a';
    for (let k = 0; k < 7; k++) { c.beginPath(); c.arc(-13 + k * 4.6, -6.5 + (k % 2) * 1.5, 4.2, 0, Math.PI * 2); c.fill(); }
    c.beginPath(); c.ellipse(-1, 0, 15.5, 8.2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.16)'; c.beginPath(); c.ellipse(-1, 4, 14, 4.2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#4a3f3a';                                                                      // the face, dark
    c.beginPath(); c.ellipse(18, -6, 7.5, 5, -0.55, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(12, -10, 4, 2.2, 0.5, 0, Math.PI * 2); c.fill();                      // an ear
    c.strokeStyle = '#d8cdb4'; c.lineWidth = 1.6;                                                  // the eye, crossed out
    c.beginPath(); c.moveTo(17, -9); c.lineTo(21, -5); c.moveTo(21, -9); c.lineTo(17, -5); c.stroke();
    c.restore();
  }

  idx(tx, ty) { return ty * this.W + tx; }
  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return T.WALL;
    return this.tiles[ty * this.W + tx];
  }
  isSolid(tx, ty) { return this.tileAt(tx, ty) === T.WALL; }
  tileAtPx(x, y) { return this.tileAt(Math.floor(x / TILE), Math.floor(y / TILE)); }
  // A drop stops nothing and holds nobody up. It is deliberately not solid: walking into one is
  // the whole point of it, and everything that must not walk into one is kept out by the flow
  // field and by `hazardAt` instead.
  isPitPx(x, y) { return this.tileAtPx(x, y) === T.PIT; }
  isBurningPx(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return false;
    return this.fire[this.idx(tx, ty)] > 0;
  }
  isPoisonPx(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return false;
    return this.poison[this.idx(tx, ty)] > 0;
  }
  // A tile of poison. Not on stone and not over a drop: there is nothing there for it to lie on.
  poisonTile(tx, ty, t) {
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return;
    const i = this.idx(tx, ty), k = this.tiles[i];
    if (k === T.WALL || k === T.PIT) return;
    this.poison[i] = Math.max(this.poison[i], t); this.poisonOn.add(i);
  }
  // Witchfire burns through a coat that ordinary fire cannot touch.
  isWitchPx(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return false;
    const i = this.idx(tx, ty);
    return this.fire[i] > 0 && this.fireKind[i] === 1;
  }

  // Push a circle out of solid tiles. Returns the strongest impact speed into a wall (0 if none).
  collideCircle(e) {
    if (this.caveF) return this.collideMid(e);
    if (this.round) return this.collideRound(e);
    return this.collideTiles(e);
  }
  collideTiles(e) {
    let impact = 0, hit = false;
    const r = e.r;
    const tx0 = Math.floor((e.x - r) / TILE), tx1 = Math.floor((e.x + r) / TILE);
    const ty0 = Math.floor((e.y - r) / TILE), ty1 = Math.floor((e.y + r) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (!this.isSolid(tx, ty)) continue;
        const cx = clamp(e.x, tx * TILE, (tx + 1) * TILE), cy = clamp(e.y, ty * TILE, (ty + 1) * TILE);
        let dx = e.x - cx, dy = e.y - cy;
        let d = Math.hypot(dx, dy);
        if (d >= r) continue;
        let nx, ny;
        if (d < 0.001) {
          // Centre inside the tile: push along the axis of least penetration.
          const px = e.x - (tx + 0.5) * TILE, py = e.y - (ty + 0.5) * TILE;
          if (Math.abs(px) > Math.abs(py)) { nx = Math.sign(px) || 1; ny = 0; } else { nx = 0; ny = Math.sign(py) || 1; }
          d = 0;
        } else { nx = dx / d; ny = dy / d; }
        const vn = e.vx * nx + e.vy * ny;
        if (vn < 0) { impact = Math.max(impact, -vn); e.vx -= vn * nx; e.vy -= vn * ny; }
        e.x += nx * (r - d); e.y += ny * (r - d);
        hit = true;
      }
    }
    e.wallHit = hit;
    return impact;
  }

  // The cave's rock. The same push as `collideCircle`, against the shape the renderer draws: every
  // outside corner of a wall tile (both of the tiles either side of it open) is a quarter circle of
  // `round`, and every inside corner of the floor (both of those tiles stone) is filled in by one.
  // A body sliding along a bend in the rock goes round it rather than catching on each step of the
  // grid, which is the whole of what the cave feels like underfoot.
  collideRound(e) {
    let impact = 0, hit = false;
    const r = e.r, R = this.round;
    const push = (nx, ny, depth) => {
      const vn = e.vx * nx + e.vy * ny;
      if (vn < 0) { impact = Math.max(impact, -vn); e.vx -= vn * nx; e.vy -= vn * ny; }
      e.x += nx * depth; e.y += ny * depth; hit = true;
    };
    const tx0 = Math.floor((e.x - r) / TILE), tx1 = Math.floor((e.x + r) / TILE);
    const ty0 = Math.floor((e.y - r) / TILE), ty1 = Math.floor((e.y + r) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const x0 = tx * TILE, y0 = ty * TILE, x1 = x0 + TILE, y1 = y0 + TILE;
        if (!this.isSolid(tx, ty)) {
          // An inside corner of the floor: inside the quarter of the tile nearest it, a body has to
          // stay within `R - r` of the circle's centre. Only matters when the fillet is bigger than
          // him; smaller, the two walls already keep him further out than it would.
          if (R <= r) continue;
          for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            if (!this.isSolid(tx + sx, ty) || !this.isSolid(tx, ty + sy)) continue;
            const cx = sx < 0 ? x0 + R : x1 - R, cy = sy < 0 ? y0 + R : y1 - R;
            if ((e.x - cx) * sx <= 0 || (e.y - cy) * sy <= 0) continue;
            const dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy);
            if (d <= R - r) continue;
            push(-dx / d, -dy / d, d - (R - r));
          }
          continue;
        }
        // Which corner of this wall tile he is off, and whether that corner is an outside one.
        const sx = e.x < x0 + R ? -1 : e.x > x1 - R ? 1 : 0;
        const sy = e.y < y0 + R ? -1 : e.y > y1 - R ? 1 : 0;
        if (sx && sy && !this.isSolid(tx + sx, ty) && !this.isSolid(tx, ty + sy)) {
          const cx = sx < 0 ? x0 + R : x1 - R, cy = sy < 0 ? y0 + R : y1 - R;
          const dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy) || 0.001;
          if (d - R >= r) continue;
          push(dx / d, dy / d, r - (d - R));
          continue;
        }
        const cx = clamp(e.x, x0, x1), cy = clamp(e.y, y0, y1);
        const dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy);
        if (d >= r) continue;
        if (d < 0.001) {
          const px = e.x - (tx + 0.5) * TILE, py = e.y - (ty + 0.5) * TILE;
          if (Math.abs(px) > Math.abs(py)) push(Math.sign(px) || 1, 0, r); else push(0, Math.sign(py) || 1, r);
        } else push(dx / d, dy / d, r - d);
      }
    }
    e.wallHit = hit;
    return impact;
  }

  // ---------- the cave cut the second way ----------
  // `TUNING.cave.shape === 'mid'`: the rock's edge is not tied to the edges of the tiles. Every tile
  // has a value — stone 1, floor `caveF` (0 to `cave.midMax`) — sampled at its centre, and the edge
  // of the rock is where that field crosses one half, marched square by square between the centres
  // of four tiles. Floor at nought puts the edge on the tile's own border; floor near one half pulls
  // it almost to the middle of the tile. The field only ever grows the rock into the floor, never
  // the floor into the rock, so every tile the rest of the game calls stone is still stone here and
  // the flow field, the line of sight and the fire need not know. `buildCaveField` lays the floor
  // values once a level, off a slow noise, so the edge sits on the grid in one stretch of cave and
  // wanders through the middle of the tiles in the next.
  buildCaveField(props, start) {
    const C = TUNING.cave, W = this.W, H = this.H, f = new Float32Array(W * H);
    const solid = (x, y) => x < 0 || y < 0 || x >= W || y >= H || this.isSolid(x, y);
    const hash = (x, y) => { let n = (x * 374761393 + y * 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const sm = (t) => t * t * (3 - 2 * t);
    const noise = (x, y) => {
      const x0 = Math.floor(x), y0 = Math.floor(y), fx = sm(x - x0), fy = sm(y - y0);
      const a = hash(x0, y0), b = hash(x0 + 1, y0), c = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1);
      return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
    };
    // Where something was put down, the floor stays whole: rock grown over a crate, a rack or a door
    // is furniture sunk in stone.
    const keep = new Set();
    for (const p of props) keep.add(Math.floor(p.y / TILE) * W + Math.floor(p.x / TILE));
    const sx = Math.floor(start.x / TILE), sy = Math.floor(start.y / TILE);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (solid(x, y) || this.tiles[i] !== T.FLOOR || keep.has(i)) continue;
      if (Math.abs(x - sx) <= 2 && Math.abs(y - sy) <= 2) continue;
      // A way two tiles wide keeps both of them: grown into from both sides it would stop fitting a man.
      if ((solid(x - 1, y) || solid(x - 2, y)) && (solid(x + 1, y) || solid(x + 2, y))) continue;
      if ((solid(x, y - 1) || solid(x, y - 2)) && (solid(x, y + 1) || solid(x, y + 2))) continue;
      const m = clamp((noise(x / C.midScale, y / C.midScale) - C.midFrom) / (1 - C.midFrom), 0, 1);
      f[i] = C.midMax * sm(m) * (0.7 + 0.3 * hash(x * 3 + 1, y * 7 + 2));
    }
    this.caveF = f;
  }
  // ---------- how much of the rock is worth drawing ----------
  // A cave used to be painted everywhere the camera could reach: every tile of solid rock in the
  // window went into the path and was filled, so a room read as a small dark hole in a great pale
  // field of stone nobody can walk into — a huge piece of the level shown for nothing. That is not
  // what the square-walled floors do: there a wall tile is drawn only if something open stands next
  // to it and everything behind it is fog. `caveNear` is the same rule with a cave's thickness —
  // rock within `TUNING.cave.band` tiles of open floor — and `drawCaveMid` marches nothing else.
  buildCaveBand() {
    const W = this.W, H = this.H, band = TUNING.cave.band, n = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!this.isSolid(x, y)) n[y * W + x] = 1;
    // grown one ring a pass, so the cost is the world and not the world times the square of the band
    for (let k = 0; k < band; k++) {
      const p = n.slice();
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (p[y * W + x]) continue;
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
          const ax = x + dx, ay = y + dy;
          if (ax < 0 || ay < 0 || ax >= W || ay >= H) continue;
          if (p[ay * W + ax]) { near = true; break; }
        }
        if (near) n[y * W + x] = 1;
      }
    }
    this.caveNear = n;
  }
  caveNearAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return 0;
    return this.caveNear ? this.caveNear[ty * this.W + tx] : 1;
  }
  // The rock's outline is the same outline every frame and only a wall coming down changes it, so
  // the renderer keeps what it marched and `caveEpoch` is how it knows when to throw that away.
  // Everything that turns a tile of this world from stone to floor or back says so here.
  caveDirty() {
    this.caveEpoch = (this.caveEpoch || 0) + 1;
    if (this.round) this.buildCaveBand();
  }
  // The field at a tile's centre. `extra` is a set of tile indices to count as stone (the renderer's
  // unbroken secret walls, which are props rather than tiles).
  caveV(tx, ty, extra) {
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return 1;
    const i = ty * this.W + tx;
    if (this.isSolid(tx, ty) || (extra && extra.has(i))) return 1;
    return this.caveF[i];
  }
  // One square of the march, between the centres of tiles (i, j) and (i + 1, j + 1). Pushes the
  // outline of its stone onto `poly` (a flat list of points, clockwise on screen) and each stretch of
  // edge onto `segs` as [x1, y1, x2, y2], wound so that (dy, -dx) points off the stone; either may be null. A square with
  // stone on two opposite corners joins them, the way two diagonal wall tiles already block the gap.
  marchCell(i, j, extra, poly, segs) {
    const T2 = TILE, L = 0.5;
    const x0 = (i + 0.5) * T2, y0 = (j + 0.5) * T2, x1 = x0 + T2, y1 = y0 + T2;
    const cs = [[x0, y0, this.caveV(i, j, extra)], [x1, y0, this.caveV(i + 1, j, extra)],
      [x1, y1, this.caveV(i + 1, j + 1, extra)], [x0, y1, this.caveV(i, j + 1, extra)]];
    if (cs[0][2] <= L && cs[1][2] <= L && cs[2][2] <= L && cs[3][2] <= L) return false;
    const pts = [], cross = [];
    for (let k = 0; k < 4; k++) {
      const p = cs[k], q = cs[(k + 1) & 3], ps = p[2] > L, qs = q[2] > L;
      if (ps) { pts.push(p[0], p[1]); cross.push(false); }
      if (ps !== qs) { const t = (p[2] - L) / (p[2] - q[2]); pts.push(lerp(p[0], q[0], t), lerp(p[1], q[1], t)); cross.push(true); }
    }
    if (poly) poly.push(pts);
    if (segs) {
      const n = cross.length;
      for (let k = 0; k < n; k++) {
        const k2 = (k + 1) % n;
        if (cross[k] && cross[k2]) segs.push([pts[k * 2], pts[k * 2 + 1], pts[k2 * 2], pts[k2 * 2 + 1]]);
      }
    }
    return true;
  }
  // `collideCircle` against that edge: every stretch of it near him, pushed out along its own outward
  // side. Only if he has somehow got his centre into a tile of stone does the plain tile push run.
  collideMid(e) {
    let impact = 0, hit = false;
    const r = e.r, segs = [];
    const i0 = Math.floor((e.x - r) / TILE - 0.5), i1 = Math.floor((e.x + r) / TILE - 0.5);
    const j0 = Math.floor((e.y - r) / TILE - 0.5), j1 = Math.floor((e.y + r) / TILE - 0.5);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.marchCell(i, j, null, null, segs);
    for (let pass = 0; pass < 2; pass++) {
      for (const [ax, ay, bx, by] of segs) {
        const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
        if (l2 < 1e-6) continue;
        const t = clamp(((e.x - ax) * dx + (e.y - ay) * dy) / l2, 0, 1);
        const px = ax + dx * t, py = ay + dy * t, ll = Math.sqrt(l2), onx = dy / ll, ony = -dx / ll;
        const vx = e.x - px, vy = e.y - py, d = Math.hypot(vx, vy), side = vx * onx + vy * ony;
        let nx, ny, depth;
        if (side >= 0) {
          if (d >= r) continue;
          if (d < 0.001) { nx = onx; ny = ony; } else { nx = vx / d; ny = vy / d; }
          depth = r - d;
        } else {
          if (t <= 0 || t >= 1 || -side > r * 2) continue;
          nx = onx; ny = ony; depth = r - side;
        }
        const vn = e.vx * nx + e.vy * ny;
        if (vn < 0) { impact = Math.max(impact, -vn); e.vx -= vn * nx; e.vy -= vn * ny; }
        e.x += nx * depth; e.y += ny * depth; hit = true;
      }
    }
    if (this.isSolid(Math.floor(e.x / TILE), Math.floor(e.y / TILE))) { impact = Math.max(impact, this.collideTiles(e)); hit = true; }
    e.wallHit = hit;
    return impact;
  }

  // ---------- what can be seen from where he is standing ----------
  // Symmetric recursive shadowcasting over the eight octants. A room is opened by walking into it
  // and never closes again — that is `room.seen`, and it is the other half of the fog. This is the
  // half that moves: a partition, a pillar or the corner of a stub wall keeps what is behind it dark
  // until he steps round to where it can be seen from. `vis` is one byte a tile and the renderer
  // paints everything outside it down; nothing else in the game reads it, so the cult's own eyes are
  // untouched — a man behind a pillar can still hear you.
  // `throughWalls` is THE ORACLE, as a radius in tiles: inside it nothing stays dark, wall or no
  // wall; past it the ordinary cast still decides. It used to be the whole of `radius` through
  // stone, which lit every corner of every room in reach and took the not-knowing out of the fog
  // entirely. It is the only thing in the game that reads `game.mods` — everything else about the
  // fog is blind to boons on purpose — because it is a different sense, not a sharper eye.
  computeVis(px, py, radius, throughWalls) {
    const v = this.vis, W = this.W, H = this.H;
    // Clear only what the last pass lit: the world is 420 by 78 tiles and this runs every step.
    const b = this.visBox;
    if (b) for (let y = b.y0; y <= b.y1; y++) v.fill(0, y * W + b.x0, y * W + b.x1 + 1);
    const cx = Math.floor(px / TILE), cy = Math.floor(py / TILE);
    this.visBox = { x0: Math.max(0, cx - radius), y0: Math.max(0, cy - radius),
      x1: Math.min(W - 1, cx + radius), y1: Math.min(H - 1, cy + radius) };
    if (cx < 0 || cy < 0 || cx >= W || cy >= H) return;
    if (throughWalls > 0) {
      const r = Math.min(throughWalls, radius), r2 = r * r;
      for (let ty = Math.max(0, cy - r); ty <= Math.min(H - 1, cy + r); ty++) {
        const dy = ty - cy, row = ty * W;
        for (let tx = Math.max(0, cx - r); tx <= Math.min(W - 1, cx + r); tx++) { const dx = tx - cx; if (dx * dx + dy * dy <= r2) v[row + tx] = 1; }
      }
    }
    v[cy * W + cx] = 1;
    // He can always see the ring of tiles he is standing in the middle of, wall or not: a goat with
    // his nose against a partition is not blind, he is against a partition.
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const tx = cx + dx, ty = cy + dy;
      if (tx >= 0 && ty >= 0 && tx < W && ty < H) v[ty * W + tx] = 1;
    }
    for (const m of VIS_OCTANTS) this.castVis(cx, cy, 1, 1, 0, radius, m[0], m[1], m[2], m[3]);
  }
  castVis(cx, cy, row, start, end, radius, xx, xy, yx, yy) {
    if (start < end) return;
    const v = this.vis, W = this.W, H = this.H, r2 = radius * radius;
    let newStart = 0;
    for (let i = row; i <= radius; i++) {
      let blocked = false;
      for (let dx = -i, dy = -i; dx <= 0; dx++) {
        const tx = cx + dx * xx + dy * xy, ty = cy + dx * yx + dy * yy;
        const lSlope = (dx - 0.5) / (dy + 0.5), rSlope = (dx + 0.5) / (dy - 0.5);
        if (start < rSlope) continue;
        if (end > lSlope) break;
        const inside = tx >= 0 && ty >= 0 && tx < W && ty < H;
        if (dx * dx + dy * dy <= r2 && inside) v[ty * W + tx] = 1;
        const solid = !inside || this.isSolid(tx, ty) || this.visBlock[ty * W + tx] === 1;
        if (blocked) {
          if (solid) { newStart = rSlope; continue; }
          blocked = false; start = newStart;
        } else if (solid && i < radius) {
          blocked = true;
          this.castVis(cx, cy, i + 1, start, lSlope, radius, xx, xy, yx, yy);
          newStart = rSlope;
        }
      }
      if (blocked) break;
    }
  }
  // The tiles that are as good as stone to look at this step. Given as tile indices, cleared by the
  // list it replaces rather than by wiping the world.
  setVisBlocks(list) {
    for (const i of this.visBlockList) this.visBlock[i] = 0;
    this.visBlockList = list;
    for (const i of list) this.visBlock[i] = 1;
  }

  // Is any floor of this box in his line of sight? The fog asks it of every room he has not opened:
  // seeing the outside of a room's wall is not seeing the room, so the wall tiles do not count.
  anyFloorSeen(box) {
    const b = this.visBox; if (!b) return false;
    const x0 = Math.max(box.x, b.x0), x1 = Math.min(box.x + box.w - 1, b.x1);
    const y0 = Math.max(box.y, b.y0), y1 = Math.min(box.y + box.h - 1, b.y1);
    for (let y = y0; y <= y1; y++) {
      const row = y * this.W;
      for (let x = x0; x <= x1; x++) if (this.vis[row + x] === 1 && !this.isSolid(x, y)) return true;
    }
    return false;
  }

  seesTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return false;
    return this.vis[ty * this.W + tx] === 1;
  }

  los(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy);
    const steps = Math.ceil(d / 6);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.isSolid(Math.floor((x0 + dx * t) / TILE), Math.floor((y0 + dy * t) / TILE))) return false;
    }
    return true;
  }

  // What a man may put a boot on: stone stops him and so does a hole, which is why no route the
  // flow field offers anybody ever crosses one.
  walkable(i) { const t = this.tiles[i]; return t !== T.WALL && t !== T.PIT && !this.block[i]; }
  walkableAt(tx, ty) { const t = this.tileAt(tx, ty); return t !== T.WALL && t !== T.PIT; }
  // BFS distance field from a point; enemies descend it.
  computeFlow(px, py) {
    const W = this.W, H = this.H, flow = this.flow;
    flow.fill(-1);
    const sx = clamp(Math.floor(px / TILE), 0, W - 1), sy = clamp(Math.floor(py / TILE), 0, H - 1);
    const q = new Int32Array(W * H); let head = 0, tail = 0;
    const s = sy * W + sx; flow[s] = 0; q[tail++] = s;
    while (head < tail) {
      const i = q[head++]; const d = flow[i];
      if (d > 90) continue;
      const cx = i % W, cy = (i / W) | 0;
      if (cx > 0 && this.walkable(i - 1) && flow[i - 1] < 0) { flow[i - 1] = d + 1; q[tail++] = i - 1; }
      if (cx < W - 1 && this.walkable(i + 1) && flow[i + 1] < 0) { flow[i + 1] = d + 1; q[tail++] = i + 1; }
      if (cy > 0 && this.walkable(i - W) && flow[i - W] < 0) { flow[i - W] = d + 1; q[tail++] = i - W; }
      if (cy < H - 1 && this.walkable(i + W) && flow[i + W] < 0) { flow[i + W] = d + 1; q[tail++] = i + W; }
    }
    this.computeRoute(this.route, sx, sy, q, (j) => this.open(j));
    if (this.wideWanted) {
      // The wide field is laid on the corners of the grid, not its tiles: a corner with all four
      // tiles round it open is somewhere a body up to a tile across can stand, and the step to the
      // next such corner crosses two tiles of open floor on either side of it. Two tiles that are
      // each in a two-by-two of floor can still meet only across a single tile's pinch (two stubs of
      // wall offset from each other), and that pinch stopped the Butcher dead; corner to corner cannot.
      const gx = px / TILE, gy = py / TILE;
      let s = -1, bd = Infinity;
      for (let cy = Math.floor(gy) - 1; cy <= Math.floor(gy) + 2; cy++) for (let cx = Math.floor(gx) - 1; cx <= Math.floor(gx) + 2; cx++) {
        if (!this.corner(cx, cy)) continue;
        const d = (cx - gx) * (cx - gx) + (cy - gy) * (cy - gy);
        if (d < bd) { bd = d; s = cy * W + cx; }
      }
      if (s >= 0) this.computeRoute(this.routeW, s % W, (s / W) | 0, q, (j) => this.corner(j % W, (j / W) | 0));
      else this.routeW.fill(-1);
    }
  }
  // A corner of the grid (the top-left corner of tile cx, cy) with open floor in all four tiles round it.
  corner(cx, cy) {
    if (cx < 1 || cy < 1 || cx >= this.W || cy >= this.H) return false;
    const i = cy * this.W + cx, W = this.W;
    return this.open(i) && this.open(i - 1) && this.open(i - W) && this.open(i - W - 1);
  }
  // The tiles standing furniture is in: every tile whose middle is inside a blocking prop's own
  // circle. Doors are not furniture (they are opened), and neither is anything on the move.
  setFurniture(props) {
    for (const i of this.furnList) this.furn[i] = 0;
    const list = this.furnList; list.length = 0;
    for (const p of props) {
      if (p.kind === 'door' || p.flung || p.held || !p.blocking) continue;
      const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE), k = Math.ceil(p.r / TILE);
      for (let y = ty - k; y <= ty + k; y++) for (let x = tx - k; x <= tx + k; x++) {
        if (x < 0 || y < 0 || x >= this.W || y >= this.H) continue;
        if (Math.hypot((x + 0.5) * TILE - p.x, (y + 0.5) * TILE - p.y) >= p.r + 2) continue;
        const i = y * this.W + x;
        if (!this.furn[i]) { this.furn[i] = 1; list.push(i); }
      }
    }
  }
  open(i) { return this.walkable(i) && !this.furn[i]; }
  computeRoute(flow, sx, sy, q, ok) {
    const W = this.W, H = this.H;
    flow.fill(-1);
    let head = 0, tail = 0;
    const s = sy * W + sx; flow[s] = 0; q[tail++] = s;
    while (head < tail) {
      const i = q[head++]; const d = flow[i];
      if (d > 90) continue;
      const cx = i % W, cy = (i / W) | 0;
      if (cx > 0 && flow[i - 1] < 0 && ok(i - 1)) { flow[i - 1] = d + 1; q[tail++] = i - 1; }
      if (cx < W - 1 && flow[i + 1] < 0 && ok(i + 1)) { flow[i + 1] = d + 1; q[tail++] = i + 1; }
      if (cy > 0 && flow[i - W] < 0 && ok(i - W)) { flow[i - W] = d + 1; q[tail++] = i - W; }
      if (cy < H - 1 && flow[i + W] < 0 && ok(i + W)) { flow[i + W] = d + 1; q[tail++] = i + W; }
    }
  }
  // One step down a field from tile (tx, ty): the neighbour nearer the goat, diagonals only where
  // both sides of the corner are floor. Returns its index, or -1 at the bottom or off the field.
  flowStep(tx, ty, field) {
    const f = field || this.flow, here = f[ty * this.W + tx];
    if (here < 0) return -1;
    let best = here, bi = -1;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = tx + dx, ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= this.W || ny >= this.H) continue;
      if (dx && dy && (!this.walkableAt(tx + dx, ty) || !this.walkableAt(tx, ty + dy))) continue;
      const d = f[ny * this.W + nx];
      if (d >= 0 && d < best) { best = d; bi = ny * this.W + nx; }
    }
    return bi;
  }
  flowDist(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return -1;
    return this.flow[this.idx(tx, ty)];
  }
  // Direction toward the neighbouring tile with the lowest distance (no corner cutting).
  flowDir(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    const here = this.flowDist(x, y);
    if (here < 0) return null;
    let best = here, bx = 0, by = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      // No cutting a corner past stone, and none past a hole either: the diagonal that clips the
      // lip of a drop is a step into it.
      if (dx && dy && (!this.walkableAt(tx + dx, ty) || !this.walkableAt(tx, ty + dy))) continue;
      const nx = tx + dx, ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= this.W || ny >= this.H) continue;
      const d = this.flow[this.idx(nx, ny)];
      if (d >= 0 && d < best) { best = d; bx = dx; by = dy; }
    }
    if (best === here) return null;
    const cx = (tx + bx + 0.5) * TILE, cy = (ty + by + 0.5) * TILE;
    const vx = cx - x, vy = cy - y, l = Math.hypot(vx, vy) || 1;
    return { x: vx / l, y: vy / l };
  }

  // ---- fire ----
  // Hay catches on its own and spreads. `force` lights any walkable tile (a spilled oil pool)
  // which burns out without spreading and leaves a scorch mark.
  ignite(tx, ty, force, dur, witch) {
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return false;
    const i = this.idx(tx, ty);
    if (this.fire[i] > 0) return false;
    const t = this.tiles[i];
    if (t === T.HAY) { this.fire[i] = TUNING.fire.burn; this.fireKind[i] = witch ? 1 : 0; this.spread[i] = 0; return true; }
    // Tall grass is fuel the way hay is: it catches from anything and it carries the fire on.
    if (this.grass[i]) { this.fire[i] = TUNING.grass.burn; this.fireKind[i] = witch ? 1 : 0; this.spread[i] = 0; return true; }
    if (force && t !== T.WALL && t !== T.PIT) { this.fire[i] = dur || TUNING.fire.pool; this.fireKind[i] = witch ? 1 : 0; this.spread[i] = 0; return true; }
    return false;
  }
  // A breathed cone of flame: short-lived on bare floor, but it sets hay going properly.
  igniteCone(x, y, dirx, diry, range, halfAngle, dur) {
    const r = Math.ceil(range / TILE);
    const cx = Math.floor(x / TILE), cy = Math.floor(y / TILE);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const wx = (cx + dx + 0.5) * TILE - x, wy = (cy + dy + 0.5) * TILE - y;
      const d = Math.hypot(wx, wy);
      if (d > range || d < 1) continue;
      if ((wx * dirx + wy * diry) / d < Math.cos(halfAngle)) continue;
      if (!this.los(x, y, (cx + dx + 0.5) * TILE, (cy + dy + 0.5) * TILE)) continue;
      this.ignite(cx + dx, cy + dy, true, dur);
    }
  }
  ignitePx(x, y, force) { return this.ignite(Math.floor(x / TILE), Math.floor(y / TILE), force); }
  // A round pool of flame: a smashed oil lamp, a Seer's rune, or coals knocked out of a brazier.
  // `dur` overrides how long it burns; without it a pool lasts `fire.pool`, witchfire `fire.witch`.
  ignitePool(x, y, radiusTiles, witch, dur) {
    const cx = Math.floor(x / TILE), cy = Math.floor(y / TILE), r = Math.ceil(radiusTiles);
    if (!dur) dur = witch ? TUNING.fire.witch : undefined;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.hypot(dx, dy) <= radiusTiles) this.ignite(cx + dx, cy + dy, true, dur, witch);
    }
  }
  updateFire(dt) {
    const W = this.W;
    for (let i = 0; i < this.fire.length; i++) {
      if (this.fire[i] <= 0) continue;
      // Tall grass burns rather than vanishing: it stands alight for `grass.burn`, carries the fire
      // to the grass next to it faster than hay does, and is gone only once it has burnt out.
      const wasHay = this.tiles[i] === T.HAY, wasGrass = this.grass[i] === 1;
      this.fire[i] -= dt;
      if (wasHay || wasGrass) {
        this.spread[i] += dt;
        if (this.spread[i] >= (wasGrass ? TUNING.grass.spread : TUNING.fire.spread)) {
          this.spread[i] = 0;
          const tx = i % W, ty = (i / W) | 0, wk = this.fireKind[i] === 1;
          // Hay lit by witchfire burns as witchfire: the whole patch goes cold blue.
          this.ignite(tx + 1, ty, false, 0, wk); this.ignite(tx - 1, ty, false, 0, wk);
          this.ignite(tx, ty + 1, false, 0, wk); this.ignite(tx, ty - 1, false, 0, wk);
        }
      }
      if (this.fire[i] <= 0) {
        const witch = this.fireKind[i] === 1;
        this.fire[i] = 0; this.fireKind[i] = 0;
        if (wasGrass) this.grass[i] = 0;
        if (wasHay) this.tiles[i] = T.ASH;
        else this.scorch((i % W + 0.5) * TILE, (((i / W) | 0) + 0.5) * TILE, TILE * 0.55, witch);
      }
    }
  }

  // ---- noise ----
  emitNoise(x, y, radiusTiles, kind) { this.noises.push({ x, y, r: radiusTiles * TILE, kind: kind || 'noise' }); }

  // ---- decals (persistent paint) ----
  // Allocate detailed paint only where something happened, rather than a full-resolution world.
  paintStain(x,y,r,paint) {
    const size=TUNING.effects.stainTile;
    for(let ty=Math.floor((y-r)/size);ty<=Math.floor((y+r)/size);ty++)
      for(let tx=Math.floor((x-r)/size);tx<=Math.floor((x+r)/size);tx++) {
        if(tx<0||ty<0||tx*size>=this.W*TILE||ty*size>=this.H*TILE)continue;
        const key=tx+','+ty;let tile=this.stains.get(key);
        if(!tile) {
          if(this.stains.size>=TUNING.effects.maxStainTiles) {
            const [oldKey,old]=this.stains.entries().next().value;
            this.dctx.drawImage(old.canvas,old.x,old.y);this.stains.delete(oldKey);
          }
          const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
          tile={canvas,x:tx*size,y:ty*size};this.stains.set(key,tile);
        }
        const c=tile.canvas.getContext('2d');c.save();c.translate(-tile.x,-tile.y);paint(c);c.restore();
      }
  }

  splat(x, y, dirx, diry, size, color) {
    // No direction (a body dropped straight down, a piece of gore landing) is a round pool: with a
    // zero vector every cell measured zero from the centre and the stain came out a hard square.
    const d=Math.hypot(dirx,diry);if(d){dirx/=d;diry/=d;}else{const a=Math.random()*Math.PI*2;dirx=Math.cos(a);diry=Math.sin(a);}
    const droplets=[];
    for(let i=0;i<12;i++) {
      const t = Math.random();
      const t2 = d ? t * size * 2 : 0, ox = dirx * t2 + (Math.random() - 0.5) * size * (d ? 1 : 2), oy = diry * t2 + (Math.random() - 0.5) * size * (d ? 1 : 2);
      droplets.push([ox,oy,size*(0.035+Math.random()*0.12)]);
    }
    // Cells on the world grid, not a painted splash: a lobed pool stretched along the blow with a
    // darker rim and a wet glint, and the drops it threw, each a little disc of cells.
    const px=TUNING.effects.pixel,R=size*0.6,seed=(x*7+y*13)|0,body=color||PALETTE.bloodDark;
    this.paintStain(x,y,size*3,c=>{
      c.save();c.globalAlpha=0.85;
      const x0=Math.round(x/px)*px,y0=Math.round(y/px)*px,span=Math.ceil(R*1.5/px)*px;
      for(let oy=-span;oy<=span;oy+=px)for(let ox=-span;ox<=span;ox+=px){
        const al=ox*dirx+oy*diry,ac=-ox*diry+oy*dirx,dd=Math.hypot(al/(R*1.2),ac/(R*0.85));
        const lim=0.72+CombatFX.noise((x0+ox)*0.2,(y0+oy)*0.2,seed)*0.5;if(dd>=lim)continue;
        c.fillStyle=dd>lim-0.14?'#4f140f':dd<0.3&&CombatFX.bayer(ox/px,oy/px)<0.2?PALETTE.blood:body;
        c.fillRect(x0+ox,y0+oy,px,px);
      }
      c.fillStyle=body;
      for(const [ox,oy,r] of droplets)CombatFX.cellDisc(c,x+ox,y+oy,Math.max(px*0.6,r));
      c.restore();
    });
  }
  body(x, y, r, angle, color) {
    const c = this.dctx; c.save(); c.translate(x, y); c.rotate(angle);
    c.fillStyle = color || PALETTE.ink; c.beginPath(); c.ellipse(0, 0, r * 1.5, r * 0.8, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  dot(x, y, r, color) {
    const paint=c=>{c.fillStyle=color;CombatFX.cellDisc(c,x,y,r);};
    if(color===PALETTE.blood||color===PALETTE.bloodDark)this.paintStain(x,y,r,paint);else paint(this.dctx);
  }
  scorch(x, y, r, witch) {
    // Soot in cells: solid at the heart, ordered-dithered out to nothing at the edge, so a burnt
    // patch sits in the floor's own pixels instead of a soft airbrushed blot.
    const px=TUNING.effects.pixel,seed=(x*3+y*5)|0;
    this.paintStain(x,y,r,c=>{
      const x0=Math.round(x/px)*px,y0=Math.round(y/px)*px,span=Math.ceil(r/px)*px;
      c.fillStyle=witch?'rgba(38,26,64,0.8)':'rgba(20,14,12,0.8)';c.beginPath();
      for(let oy=-span;oy<=span;oy+=px)for(let ox=-span;ox<=span;ox+=px){
        const d=Math.hypot(ox,oy)/r+(CombatFX.noise((x0+ox)*0.15,(y0+oy)*0.15,seed)-0.5)*0.35;
        if(d<1&&CombatFX.bayer(ox/px,oy/px)<1.35-d*1.4)c.rect(x0+ox,y0+oy,px,px);
      }
      c.fill();
    });
  }
}
