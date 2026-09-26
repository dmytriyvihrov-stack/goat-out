// The cult's signs (`output/pixel-ominous-decals-2026-09-23`) as pixel sprites: each source PNG is
// pixel art enlarged by an image generator, a grid of fat cells that drifts a little. This finds the
// grid's step and phase on each axis (where the ink changes colour, taken modulo a trial step, piles
// up at one phase when the step is right), takes the colour at the middle of every cell, squeezes the
// colours to a few, and writes `js/decal-pixels.js`: a palette and rows of letters per sign, drawn by
// `Renderer.drawOmens` (render.js). Run: `node tools/pack-decals.js` (add `--show` to print them).
const fs = require('fs'), path = require('path');
const { decode } = require('./png-harden.js');
const root = path.join(__dirname, '..'), src = path.join(root, 'output', 'pixel-ominous-decals-2026-09-23');
const manifest = JSON.parse(fs.readFileSync(path.join(src, 'manifest.json'), 'utf8'));
// `every`: keep every n-th cell (the ritual circle is drawn twice as fine as the rest).
const EVERY = { 'floor-large': 2 };
const COLORS = 4;
// A step to start the search from where the run lengths mislead (thin outlines on a light fill).
const STEP = {};
// Cells across for a sign whose grid will not lock (the wall sign: a light fill with thin edges).
const CELLS = { 'wall-watcher': 26 };

const ink = (px, o) => px[o + 3] >= 128;
const key = (px, o) => (ink(px, o) ? ((px[o] >> 4) << 8) | ((px[o + 1] >> 4) << 4) | (px[o + 2] >> 4) : -1);

// Positions along one axis where the colour changes, gathered over every row (or column).
function edges(img, axis) {
  const { W, H, px } = img, out = [];
  const A = axis === 'x' ? W : H, B = axis === 'x' ? H : W;
  for (let b = 0; b < B; b += 3) {
    let prev = null;
    for (let a = 0; a < A; a++) {
      const o = axis === 'x' ? (b * W + a) * 4 : (a * W + b) * 4, k = key(img.px, o);
      if (prev !== null && k !== prev) out.push(a);
      prev = k;
    }
  }
  return out;
}
// The step and phase that put the most edges on grid lines: the resultant length of the edges'
// phases on a circle of one step. Searched round the run length the histogram suggests.
function grid(pos, lo, hi) {
  let best = { r: -1 };
  for (let s = lo; s <= hi; s += 0.02) {
    let cx = 0, cy = 0;
    for (const p of pos) { const a = (p / s) * 2 * Math.PI; cx += Math.cos(a); cy += Math.sin(a); }
    const r = Math.hypot(cx, cy) / pos.length;
    if (r > best.r) best = { r, s, phase: ((Math.atan2(cy, cx) / (2 * Math.PI)) * s + s) % s };
  }
  return best;
}
function runGuess(img) {
  const { W, H, px } = img, runs = {};
  for (let y = 0; y < H; y += 5) {
    let run = 0, prev = null;
    for (let x = 0; x < W; x++) {
      const k = key(px, (y * W + x) * 4);
      if (k === prev) run++; else { if (prev !== null && prev >= 0 && run > 6) runs[run] = (runs[run] || 0) + 1; run = 1; prev = k; }
    }
  }
  return +Object.entries(runs).sort((a, b) => b[1] - a[1])[0][0];
}

function pack(item) {
  const img = decode(fs.readFileSync(path.join(src, item.file)));
  // The run-length guess, and its double and half: an outline one cell wide votes for the cell,
  // a thick stroke for two. Whichever locks the edges best is the grid.
  const g0 = STEP[item.id] || runGuess(img), ex = edges(img, 'x'), ey = edges(img, 'y');
  const lock = (g) => { const x = grid(ex, g * 0.85, g * 1.18), y = grid(ey, g * 0.85, g * 1.18); return { x, y, r: x.r + y.r }; };
  const best = [g0, g0 * 2, g0 / 2].filter((g) => g >= 6).map(lock).sort((a, b) => b.r - a.r)[0];
  let gx = best.x, gy = best.y;
  // A sign that locks no grid at all is cut to `CELLS` across its measured box instead.
  if (CELLS[item.id]) { const [x0, y0, w] = item.rect, st = w / CELLS[item.id]; gx = { s: st, phase: x0 % st, r: 0 }; gy = { s: st, phase: y0 % st, r: 0 }; }
  const every = EVERY[item.id] || 1;
  const cells = [];
  let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
  for (let j = 0; ; j += every) {
    const y = Math.round(gy.phase + (j + 0.5 * every) * gy.s); if (y >= img.H) break;
    for (let i = 0; ; i += every) {
      const x = Math.round(gx.phase + (i + 0.5 * every) * gx.s); if (x >= img.W) break;
      // Every pixel of the cell's inner part votes, so a grid that drifts a little still lands on
      // the colour the cell was painted: ink if most of it is, in the colour most of the ink is.
      const votes = {}, half = gx.s * every * 0.32;
      let n = 0, inked = 0;
      for (let dy = -half; dy <= half; dy += 2) for (let dx = -half; dx <= half; dx += 2) {
        const yy = Math.min(img.H - 1, Math.max(0, Math.round(y + dy))), xx = Math.min(img.W - 1, Math.max(0, Math.round(x + dx)));
        const o = (yy * img.W + xx) * 4; n++;
        if (!ink(img.px, o)) continue;
        inked++;
        const k = [img.px[o] >> 3 << 3, img.px[o + 1] >> 3 << 3, img.px[o + 2] >> 3 << 3].join(',');
        votes[k] = (votes[k] || 0) + 1;
      }
      const c = inked * 2 >= n ? Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0] : '';
      if (!c) continue;
      const ci = i / every, cj = j / every;
      cells.push({ i: ci, j: cj, rgb: c.split(',').map(Number) });
      minX = Math.min(minX, ci); maxX = Math.max(maxX, ci); minY = Math.min(minY, cj); maxY = Math.max(maxY, cj);
    }
  }
  // A few colours: k-means over the cells, seeded from the darkest, lightest and in between.
  const lum = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  const sorted = cells.map((c) => c.rgb).sort((a, b) => lum(a) - lum(b));
  let pal = Array.from({ length: COLORS }, (_, k) => sorted[Math.floor((k + 0.5) / COLORS * sorted.length)].slice());
  for (let it = 0; it < 12; it++) {
    const sum = pal.map(() => [0, 0, 0, 0]);
    for (const c of cells) {
      let b = 0, bd = 1e9;
      pal.forEach((p, k) => { const d = (p[0] - c.rgb[0]) ** 2 + (p[1] - c.rgb[1]) ** 2 + (p[2] - c.rgb[2]) ** 2; if (d < bd) { bd = d; b = k; } });
      c.k = b; sum[b][0] += c.rgb[0]; sum[b][1] += c.rgb[1]; sum[b][2] += c.rgb[2]; sum[b][3]++;
    }
    pal = pal.map((p, k) => (sum[k][3] ? sum[k].slice(0, 3).map((v) => Math.round(v / sum[k][3])) : p));
  }
  const w = maxX - minX + 1, h = maxY - minY + 1, rows = Array.from({ length: h }, () => Array(w).fill('.'));
  for (const c of cells) rows[c.j - minY][c.i - minX] = 'abcdefgh'[c.k];
  const hex = (p) => '#' + p.map((v) => v.toString(16).padStart(2, '0')).join('');
  return { id: item.id, surface: item.surface, w, h, pal: pal.map(hex), rows: rows.map((r) => r.join('')),
    fit: `step ${gx.s.toFixed(2)} x ${gy.s.toFixed(2)}, lock ${gx.r.toFixed(2)} / ${gy.r.toFixed(2)}` };
}

const out = {};
for (const item of manifest.items) {
  const p = pack(item);
  console.log(`${p.id}: ${p.w}x${p.h} cells, ${p.fit}, palette ${p.pal.join(' ')}`);
  if (process.argv.includes('--show')) console.log(p.rows.join('\n'));
  out[p.id] = { surface: p.surface, w: p.w, h: p.h, pal: p.pal, rows: p.rows };
}
const body = '// Generated by tools/pack-decals.js from output/pixel-ominous-decals-2026-09-23. Never edit by hand.\n' +
  '// Each sign: a palette and rows of letters (a = pal[0] ...), \'.\' clear. Drawn by Renderer.drawOmens.\n' +
  'const DECAL_PIXELS = ' + JSON.stringify(out, null, 1).replace(/\n\s*/g, ' ') + ';\n' +
  "if (typeof module !== 'undefined') module.exports = DECAL_PIXELS;\n";
fs.writeFileSync(path.join(root, 'js', 'decal-pixels.js'), body);
console.log('js/decal-pixels.js written,', body.length, 'bytes');
