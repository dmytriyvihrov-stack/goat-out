// World: tile grid, fire simulation, line of sight, flow field for chasing, noise events, persistent decals.
const DECAL_SCALE = 0.34;

// Blocky cult pictograms, drawn cell by cell so they read as stamped pixel art.
const CULT_GLYPHS = [
  ['#.......#', '.#.....#.', '..#####..', '.##...##.', '##..#..##', '.##...##.', '..#####..', '...#.#...', '..#...#..'],
  ['....#....', '...###...', '..##.##..', '.##...##.', '##.###.##', '#.##.##.#', '##.....##', '.#######.', '.........'],
  ['....#....', '.#..#..#.', '..#####..', '.##...##.', '##..#..##', '.##...##.', '..#####..', '.#..#..#.', '....#....'],
  ['#.#.#.#.#', '#.#.#.#.#', '#######.#', '#.#.#.#.#', '#.#.#.#.#', '#.#######', '#.#.#.#.#', '#.#.#.#.#', '#.#.#.#.#'],
  ['.#.#.#...', '.#.#.#.#.', '.#.#.#.#.', '.#######.', '.#######.', '..#####..', '...###...', '....#....', '....#....'],
  ['..#####..', '.#.....#.', '#..###..#', '#.#...#.#', '#.#.#.#.#', '#.#...#.#', '#..###..#', '.#.....#.', '..#####..'],
];

class World {
  constructor(level) {
    this.level = level; this.W = level.W; this.H = level.H; this.tiles = level.tiles;
    const n = this.W * this.H;
    this.fire = new Float32Array(n);      // seconds of burning left
    this.spread = new Float32Array(n);    // spread accumulator
    this.flow = new Int16Array(n).fill(-1);
    this.flowTimer = 0;
    this.noises = [];
    this.decal = document.createElement('canvas');
    this.decal.width = Math.ceil(this.W * TILE * DECAL_SCALE);
    this.decal.height = Math.ceil(this.H * TILE * DECAL_SCALE);
    this.dctx = this.decal.getContext('2d');
    this.dctx.scale(DECAL_SCALE, DECAL_SCALE);
    this.fireSfxTimer = 0;
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
          CULT_GLYPHS[rng.int(0, CULT_GLYPHS.length - 1)], rng.float(0.07, 0.15), PALETTE.ochre);
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
    const c = this.dctx, n = rows.length, cell = size / n;
    c.save(); c.globalAlpha = alpha; c.fillStyle = color;
    for (let r = 0; r < n; r++) {
      for (let q = 0; q < rows[r].length; q++) {
        if (rows[r][q] !== '#') continue;
        c.fillRect(Math.round(cx - size / 2 + q * cell), Math.round(cy - size / 2 + r * cell), Math.ceil(cell), Math.ceil(cell));
      }
    }
    c.restore(); c.globalAlpha = 1;
  }

  // The room you wake in: the slab, the cut straps, the goat that went before you, and the knife.
  paintStartRoom(level, rng) {
    const c = this.dctx, sx = level.start.x, sy = level.start.y;
    this.pixelGlyph(sx, sy, 8.5 * TILE, CULT_GLYPHS[0], 0.2, PALETTE.ochre);
    this.pixelGlyph(sx, sy, 5.2 * TILE, CULT_GLYPHS[2], 0.13, PALETTE.blood);

    // the slab
    c.save();
    c.fillStyle = 'rgba(150,140,128,0.5)'; c.fillRect(sx - 52, sy - 30, 104, 60);
    c.fillStyle = 'rgba(190,180,166,0.45)'; c.fillRect(sx - 52, sy - 30, 104, 7);
    c.strokeStyle = 'rgba(26,16,22,0.45)'; c.lineWidth = 3; c.strokeRect(sx - 52, sy - 30, 104, 60);
    // cut straps, hanging loose off both sides
    c.strokeStyle = '#5a4230'; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sx - 34, sy - 30); c.lineTo(sx - 34, sy - 4); c.lineTo(sx - 46, sy + 8); c.stroke();
    c.beginPath(); c.moveTo(sx + 30, sy - 30); c.lineTo(sx + 30, sy - 2); c.lineTo(sx + 44, sy + 10); c.stroke();
    c.beginPath(); c.moveTo(sx - 30, sy + 30); c.lineTo(sx - 24, sy + 12); c.stroke();
    c.beginPath(); c.moveTo(sx + 26, sy + 30); c.lineTo(sx + 18, sy + 14); c.stroke();
    c.restore();

    // what is left of the goat that came before: skull, ribs, a dried pool
    const bx = sx - 3.1 * TILE, by = sy + 2.5 * TILE;
    c.save();
    c.fillStyle = 'rgba(122,31,24,0.5)';
    for (let k = 0; k < 9; k++) c.beginPath(), c.arc(bx + rng.float(-30, 34), by + rng.float(-22, 22), rng.float(6, 15), 0, Math.PI * 2), c.fill();
    c.fillStyle = '#d8cdb4';
    c.beginPath(); c.ellipse(bx - 12, by - 6, 11, 8, -0.3, 0, Math.PI * 2); c.fill();          // skull
    c.beginPath(); c.ellipse(bx - 1, by - 4, 6, 4.5, -0.2, 0, Math.PI * 2); c.fill();          // snout
    c.strokeStyle = '#c8bda2'; c.lineWidth = 3.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx - 17, by - 12); c.quadraticCurveTo(bx - 26, by - 22); c.stroke();
    c.beginPath(); c.moveTo(bx - 17, by - 12); c.quadraticCurveTo(bx - 27, by - 20, bx - 20, by - 26); c.stroke();
    c.beginPath(); c.moveTo(bx - 8, by - 15); c.quadraticCurveTo(bx - 16, by - 26, bx - 8, by - 30); c.stroke();
    c.fillStyle = '#1a1016'; c.fillRect(bx - 14, by - 8, 3, 2.4);
    c.strokeStyle = '#cfc3a8'; c.lineWidth = 3;                                                  // ribs
    for (let k = 0; k < 5; k++) {
      const rx = bx + 8 + k * 8;
      c.beginPath(); c.moveTo(rx, by - 10); c.quadraticCurveTo(rx + 5, by, rx, by + 10); c.stroke();
    }
    c.strokeStyle = '#bdb298'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(bx + 6, by); c.lineTo(bx + 44, by + 2); c.stroke();                  // spine
    c.restore();

    // the knife, dropped where they left it
    const kx = sx + 2.2 * TILE, ky = sy + 1.9 * TILE;
    c.save(); c.translate(kx, ky); c.rotate(0.55);
    c.fillStyle = 'rgba(122,31,24,0.55)';
    c.beginPath(); c.ellipse(6, 6, 20, 11, 0.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c9c2b5'; c.beginPath();
    c.moveTo(-22, -4); c.lineTo(12, -5); c.lineTo(26, 0); c.lineTo(12, 4); c.lineTo(-22, 3); c.closePath(); c.fill();
    c.fillStyle = '#7a1f18'; c.fillRect(-2, -4, 20, 8);
    c.fillStyle = '#4a3420'; c.fillRect(-34, -6, 14, 12);
    c.fillStyle = PALETTE.ochre; c.fillRect(-22, -6, 4, 12);
    c.restore();
  }

  idx(tx, ty) { return ty * this.W + tx; }
  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return T.WALL;
    return this.tiles[ty * this.W + tx];
  }
  isSolid(tx, ty) { return this.tileAt(tx, ty) === T.WALL; }
  tileAtPx(x, y) { return this.tileAt(Math.floor(x / TILE), Math.floor(y / TILE)); }
  isBurningPx(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return false;
    return this.fire[this.idx(tx, ty)] > 0;
  }

  // Push a circle out of solid tiles. Returns the strongest impact speed into a wall (0 if none).
  collideCircle(e) {
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

  los(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy);
    const steps = Math.ceil(d / 6);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.isSolid(Math.floor((x0 + dx * t) / TILE), Math.floor((y0 + dy * t) / TILE))) return false;
    }
    return true;
  }

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
      if (cx > 0 && this.tiles[i - 1] !== T.WALL && flow[i - 1] < 0) { flow[i - 1] = d + 1; q[tail++] = i - 1; }
      if (cx < W - 1 && this.tiles[i + 1] !== T.WALL && flow[i + 1] < 0) { flow[i + 1] = d + 1; q[tail++] = i + 1; }
      if (cy > 0 && this.tiles[i - W] !== T.WALL && flow[i - W] < 0) { flow[i - W] = d + 1; q[tail++] = i - W; }
      if (cy < H - 1 && this.tiles[i + W] !== T.WALL && flow[i + W] < 0) { flow[i + W] = d + 1; q[tail++] = i + W; }
    }
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
      if (dx && dy && (this.isSolid(tx + dx, ty) || this.isSolid(tx, ty + dy))) continue;
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
  ignite(tx, ty, force, dur) {
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return false;
    const i = this.idx(tx, ty);
    if (this.fire[i] > 0) return false;
    const t = this.tiles[i];
    if (t === T.HAY) { this.fire[i] = TUNING.fire.burn; this.spread[i] = 0; return true; }
    if (force && t !== T.WALL) { this.fire[i] = dur || TUNING.fire.pool; this.spread[i] = 0; return true; }
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
  // A round pool of flame, used by a smashed oil lamp.
  ignitePool(x, y, radiusTiles) {
    const cx = Math.floor(x / TILE), cy = Math.floor(y / TILE), r = Math.ceil(radiusTiles);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.hypot(dx, dy) <= radiusTiles) this.ignite(cx + dx, cy + dy, true);
    }
  }
  updateFire(dt) {
    const W = this.W;
    for (let i = 0; i < this.fire.length; i++) {
      if (this.fire[i] <= 0) continue;
      const wasHay = this.tiles[i] === T.HAY;
      this.fire[i] -= dt;
      if (wasHay) {
        this.spread[i] += dt;
        if (this.spread[i] >= TUNING.fire.spread) {
          this.spread[i] = 0;
          const tx = i % W, ty = (i / W) | 0;
          this.ignite(tx + 1, ty); this.ignite(tx - 1, ty); this.ignite(tx, ty + 1); this.ignite(tx, ty - 1);
        }
      }
      if (this.fire[i] <= 0) {
        this.fire[i] = 0;
        if (wasHay) this.tiles[i] = T.ASH;
        else this.scorch((i % W + 0.5) * TILE, (((i / W) | 0) + 0.5) * TILE, TILE * 0.55);
      }
    }
  }

  // ---- noise ----
  emitNoise(x, y, radiusTiles, kind) { this.noises.push({ x, y, r: radiusTiles * TILE, kind: kind || 'noise' }); }

  // ---- decals (persistent paint) ----
  splat(x, y, dirx, diry, size, color) {
    const c = this.dctx; c.fillStyle = color || PALETTE.blood;
    for (let i = 0; i < 7; i++) {
      const t = Math.random();
      const ox = dirx * t * size * 2 + (Math.random() - 0.5) * size, oy = diry * t * size * 2 + (Math.random() - 0.5) * size;
      const rr = size * (0.25 + Math.random() * 0.45) * (1 - t * 0.6);
      c.beginPath(); c.arc(x + ox, y + oy, rr, 0, Math.PI * 2); c.fill();
    }
  }
  body(x, y, r, angle, color) {
    const c = this.dctx; c.save(); c.translate(x, y); c.rotate(angle);
    c.fillStyle = color || PALETTE.ink; c.beginPath(); c.ellipse(0, 0, r * 1.5, r * 0.8, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  dot(x, y, r, color) { const c = this.dctx; c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  scorch(x, y, r) {
    const c = this.dctx; c.fillStyle = 'rgba(20,14,12,0.7)';
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
}
