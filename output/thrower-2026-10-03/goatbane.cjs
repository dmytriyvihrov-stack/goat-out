// node goatbane.cjs → goatbane.png + goatbane.html: THE THROWER, the look the user picked (3 Oct 2026,
// "green goat skull bane, just the top, take it as the base and polish the design"). A brute of the cult
// with a goat's skull for a face, a tank of the green on his back, a hose over his shoulders into a port
// screwed into the one huge arm; the green has taken that arm, the skin going sick toward the fist, the
// veins standing up and lit by every beat. Three views (front, side facing east, back) and the poses he
// needs (standing, a stride, the goat overhead, a man overhead, the throw), eight frames of pulse each.
// The goat and the clubman he lifts are the game's own, cut out of the unit atlas, so the scale is true.
// Concept art only: nothing in js/ loads this.
const fs = require('fs'), path = require('path');
const { Img, text, decode } = require('../pixel-claude-2026-09-24/png.cjs');
const { Grid } = require('../../js/prop-pixels.js');
const SP = require('../../js/spartan-pixels.js'), OG = require('../../js/ogre-pixels.js');

const W = 76, H = 76, FOOT = 74, UP = 38, N = 8, OL = '#1a1411', TX = 0.92;
const R = {
  skin: ['#5a3222', '#8a5236', '#b87a54', '#d89c70', '#f0c49a'],
  sick: ['#26301f', '#43503a', '#66724f', '#89936c', '#a9b38b'],   // what the green makes of his arm
  red: ['#440f13', '#6e191d', '#9c2528', '#c23d36', '#dc6048'],
  iron: ['#1e1e24', '#303038', '#51505b', '#878692', '#b4b3bd'],
  bone: ['#5e5642', '#8c8166', '#c6ba98', '#ebe1c4', '#fff7e2'],
  lea: ['#1c1210', '#2c1d18', '#3e2a22', '#56392c', '#6e4a38'],
  pants: ['#14151a', '#1f2128', '#2c2f38', '#3a3e4a', '#4a4f5c'],
  wrap: ['#4e4636', '#6e6450', '#948870', '#b4a88c', '#cfc4a8'],
};
const J = { rest: '#2f5a1c', mid: '#5c9a2a', lit: '#9fd84a', peak: '#e4ffa0', glass: ['#12260e', '#2f5a1c', '#5c9a2a', '#9fd84a', '#e4ffa0'] };   // TUNING venom ramp

const lit = (T, dx, dy, n) => { const l = -(dx * 0.55 + dy * 0.83); return n > 0.82 && l < -0.45 ? T[0] : n > 0.55 && l < -0.2 ? T[1] : n > 0.72 && l > 0.55 ? T[4] : n > 0.4 && l > 0.3 ? T[3] : T[2]; };
const vol = (g, cx, cy, rx, ry, T, test) => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, n = Math.hypot(dx, dy);
    if (n > 1 || (test && !test(x, y))) continue; g.set(x, y, lit(T, dx, dy, n));
  }
};
const limb = (g, x0, y0, x1, y1, t, T) => g.bar(x0, y0, x1, y1, t, T[2], T[3], T[1]);
const hash = (x, y) => ((Math.imul(x + 5, 73856093) ^ Math.imul(y + 3, 19349663)) >>> 0) % 100;
const mix = (a, b, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - k) + parseInt(b.substr(i, 2), 16) * k).toString(16).padStart(2, '0')).join('');
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// The heartbeat: the arm's swell per frame, and where the wave is (0 the tank, 1 the knuckles).
const SWELL = [0, 0, 0, 0.4, 1, 0.7, 0.3, 0];
const waveAt = f => f / (N - 1) * 1.25 - 0.1;
const shade = (t, f, rest) => { const d = waveAt(f) - t; return d >= 0 && d < 0.1 ? J.peak : d >= 0.1 && d < 0.26 ? J.lit : d < 0 && d > -0.06 ? J.lit : d >= 0.26 && d < 0.4 ? J.mid : rest; };

// ---- what he lifts: cut out of the game's own unit atlas, one art pixel a texel ----
const ATLAS = (() => {
  const src = fs.readFileSync(path.join(__dirname, '../../js/pixel-assets.js'), 'utf8'), i = src.indexOf('{');
  let d = 0, j = i; for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && !--d) break; }
  const A = JSON.parse(src.slice(i, j + 1));
  return { A, img: decode(Buffer.from(A.src.split(',')[1], 'base64')) };
})();
const hex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
// A frame of the atlas back to its art pixels (three texels a pixel): the phase of the cells is found by
// the one that keeps each cell most of one colour.
function unit(name, dir) {
  const [x, y, w, h] = ATLAS.A.units[name].idle[dir], im = ATLAS.img, at = (i, j) => (j * im.w + i) * 4;
  let best = null;
  for (let py = 0; py < 3; py++) for (let px = 0; px < 3; px++) {
    let err = 0;
    for (let cy = y + py; cy + 2 < y + h; cy += 3) for (let cx = x + px; cx + 2 < x + w; cx += 3) {
      const o = at(cx + 1, cy + 1); if (im.data[o + 3] < 128) continue;
      for (const [u, v] of [[0, 0], [2, 0], [0, 2], [2, 2]]) { const q = at(cx + u, cy + v); err += Math.abs(im.data[q] - im.data[o]) + Math.abs(im.data[q + 1] - im.data[o + 1]); }
    }
    if (!best || err < best.err) best = { err, px, py };
  }
  const gw = Math.floor((w - best.px) / 3), gh = Math.floor((h - best.py) / 3), g = new Grid(gw, gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const o = at(x + best.px + i * 3 + 1, y + best.py + j * 3 + 1); if (im.data[o + 3] >= 128) g.set(i, j, hex(im.data[o], im.data[o + 1], im.data[o + 2])); }
  return g.trim();
}
const GOAT = unit('goat', 2), CLUB = unit('clubman', 2);
// Stamp a cut sprite into a grid: `turn` 'flip' is on its back (legs up), 'rot' is lying along his fist.
function stamp(g, s, cx, bottom, turn) {
  const rot = turn === 'rot' || turn === 'rot2', w = rot ? s.h : s.w, h = rot ? s.w : s.h, x0 = Math.round(cx - w / 2), y0 = Math.round(bottom - h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const c = turn === 'flip' ? s.get(i, s.h - 1 - j) : turn === 'rot' ? s.get(j, s.h - 1 - i) : turn === 'rot2' ? s.get(s.w - 1 - j, i) : s.get(i, j);
    if (c) g.set(x0 + i, y0 + j, c);
  }
}

// ---- THE ARM ----
// `dir` -1 is the arm on the left of the picture (the front), +1 on the right (the back); O(v) is v
// texels outward from his body (toward his side), negative across in front of him.
function armBones(pose, sx, sy, k, dir) {
  const O = v => sx + v * k * dir;
  if (pose === 'goat' || pose === 'man') return { S: [sx, sy], E: [O(6), sy - 5 * k], F: [O(-0.5), sy - 16 * k], up: true };
  if (pose === 'throw') return { S: [sx, sy], E: [O(8), sy + 1.5 * k], F: [O(15.5), sy + 0.5 * k], open: true };   // flung out to the side: it has just let go
  return { S: [sx, sy], E: [O(1.6), sy + 10 * k], F: [O(1.2), sy + 21 * k] };
}
// A limb as a tapered slab, every pixel lit by which side of it faces the upper left.
function taper(g, A, B, wA, wB, T) {
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const x0 = Math.floor(Math.min(A[0], B[0]) - Math.max(wA, wB)), x1 = Math.ceil(Math.max(A[0], B[0]) + Math.max(wA, wB));
  const y0 = Math.floor(Math.min(A[1], B[1]) - Math.max(wA, wB)), y1 = Math.ceil(Math.max(A[1], B[1]) + Math.max(wA, wB));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5 - A[0], py = y + 0.5 - A[1], u = (px * dx + py * dy) / (L * L);
    if (u < 0 || u > 1) continue;
    const c = (px * nx + py * ny) / ((wA + (wB - wA) * u) / 2);
    if (Math.abs(c) > 1) continue;
    g.set(x, y, lit(T, c * nx, c * ny, Math.abs(c)));
  }
}
// The flesh on a grid of its own, the veins on it, then the green laid into its shadows down the arm,
// so the flesh stays flesh and the veins carry the colour. Returns the bones.
function bigArm(g, pose, sx, sy, k, dir, f, dim) {
  const T = dim ? [R.skin[0], R.skin[0], R.skin[1], R.skin[2], R.skin[2]] : R.skin, b = armBones(pose, sx, sy, k, dir);
  const { S, E, F } = b, a = new Grid(g.w, g.h);
  a.set = g.set.bind(a); a.get = g.get.bind(a);                      // the same headroom offset as the picture
  const ang = Math.atan2(F[1] - E[1], F[0] - E[0]), cos = Math.cos(ang), sin = Math.sin(ang);
  const W1 = [F[0] - cos * 2.6 * k, F[1] - sin * 2.6 * k];             // the wrist
  taper(a, S, E, 7.4 * k, 6 * k, T);                                   // the upper arm
  vol(a, S[0] * 0.55 + E[0] * 0.45 + dir * 0.6 * k, S[1] * 0.55 + E[1] * 0.45, 4.2 * k, 4.6 * k, T);   // the bicep
  taper(a, E, W1, 9.6 * k, 6.6 * k, T);                                // the forearm, the biggest thing on him, narrowing to the wrist
  vol(a, E[0], E[1], 3.6 * k, 3.6 * k, T);
  vol(a, S[0], S[1], 5.6 * k, 5 * k, T);                               // the deltoid over it all
  // the veins: two down the forearm, one over the bicep, wandering a little, forking now and then
  const L1 = Math.hypot(E[0] - S[0], E[1] - S[1]), L2 = Math.hypot(F[0] - E[0], F[1] - E[1]), L = L1 + L2, vs = new Map(), t0 = 0.34;
  const seg = (A, B, off, ph, tA, tB, w) => {
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]), nx = -(B[1] - A[1]) / len, ny = (B[0] - A[0]) / len;
    for (let s = 0; s <= len; s += 0.4) {
      const u = s / len, wob = Math.sin(u * 5 + ph) * 0.8 * k;
      const x = Math.round(A[0] + (B[0] - A[0]) * u + nx * (off * w + wob)), y = Math.round(A[1] + (B[1] - A[1]) * u + ny * (off * w + wob));
      if (!T.includes(a.get(x, y))) continue;
      const t = t0 + (1 - t0) * (tA + (tB - tA) * u), key = x + ',' + y;
      if (!vs.has(key) || vs.get(key).t > t) vs.set(key, { x, y, t });
      if (hash(x * 7, y * 3) < 3) for (let j = 1; j <= 3; j++) { const fx = x + Math.round(nx * j * Math.sign(off)), fy = y + Math.round(ny * j * Math.sign(off)) + (j > 1 ? 1 : 0); if (T.includes(a.get(fx, fy))) vs.set(fx + ',' + fy, { x: fx, y: fy, t: t + j * 0.01 }); }
    }
  };
  if (!dim) {
    seg([S[0] * 0.8 + E[0] * 0.2, S[1] * 0.8 + E[1] * 0.2], E, 0.05, 0.4, 0.1, L1 / L, 7 * k);
    seg(E, W1, -0.3, 1.8, L1 / L, 0.97, 8 * k);
    seg(E, W1, 0.25, 4.0, L1 / L + 0.03, 1, 8 * k);
  }
  // the fist: a block of knuckles, two balls across the line of the arm; or the hand open, letting go
  const ax = -sin, ay = cos;
  if (!b.open) {
    for (const q of [-1.4, 1.4]) vol(a, F[0] + ax * q * k, F[1] + ay * q * k, 4.2 * k, 4.2 * k, T);
    const kx = F[0] + cos * 3.4 * k, ky = F[1] + sin * 3.4 * k;      // the row of knuckles at its far edge
    for (const t of [-2.7, -0.9, 0.9, 2.7]) { const x = Math.round(kx + ax * t * k), y = Math.round(ky + ay * t * k); if (a.get(x, y)) a.set(x, y, T[1]); }
    a.set(Math.round(F[0] - ax * dir * 4 * k), Math.round(F[1] - ay * dir * 4 * k), T[3]);   // the thumb's knuckle
  } else {
    vol(a, F[0], F[1], 4 * k, 3.6 * k, T);                             // the palm
    const m0 = [F[0] + cos * 2.4 * k, F[1] + sin * 2.4 * k], m1 = [F[0] + cos * 6.4 * k, F[1] + sin * 6.4 * k];
    taper(a, m0, m1, 7.2 * k, 6 * k, T);                               // the fingers together, spread a little
    for (const t of [-1.5, 0, 1.5]) a.line(Math.round(m0[0] + ax * t * k + cos * k), Math.round(m0[1] + ay * t * k + sin * k), Math.round(m1[0] + ax * t * 1.2 * k), Math.round(m1[1] + ay * t * 1.2 * k), T[1], true);
    taper(a, [F[0] - ax * 3 * k, F[1] - ay * 3 * k], [F[0] - ax * 5.4 * k + cos * 2 * k, F[1] - ay * 5.4 * k + sin * 2 * k], 2.8 * k, 2.2 * k, T);   // the thumb
  }
  for (const v of vs.values()) if (T.includes(a.get(v.x, v.y - 1)) && !vs.has(v.x + ',' + (v.y - 1))) a.set(v.x, v.y - 1, T[3]);
  const along = (x, y) => {
    const pr = (A, B) => { const dx = B[0] - A[0], dy = B[1] - A[1], u = Math.max(0, Math.min(1, ((x - A[0]) * dx + (y - A[1]) * dy) / (dx * dx + dy * dy))); return [u, Math.hypot(A[0] + dx * u - x, A[1] + dy * u - y)]; };
    const [u1, d1] = pr(S, E), [u2, d2] = pr(E, F); return d1 < d2 ? u1 * L1 / L : (L1 + u2 * L2) / L;
  };
  for (let y = -UP; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const c = a.get(x, y); if (!c) continue;
    const i = T.indexOf(c);
    g.set(x, y, i >= 0 && i <= 1 ? mix(c, R.sick[i], 0.75 * smooth(0.35, 1, along(x, y))) : c);
  }
  for (const v of vs.values()) g.set(v.x, v.y, shade(v.t, f, mix(R.sick[1], J.rest, 0.5)));
  const d = waveAt(f) - 1;                                             // the knuckles light when the wave arrives
  if (!dim && !b.open && d > -0.08 && d < 0.2) for (const t of [-2.7, -0.9, 0.9, 2.7]) g.set(Math.round(F[0] + cos * 3.4 * k + ax * t * k), Math.round(F[1] + sin * 3.4 * k + ay * t * k), d < 0.08 ? J.peak : J.lit);
  return b;
}
// The hose: rubber, with the green showing in a line down it, running with the wave.
function hose(g, pts, f, t1, thick) {
  const p = [];
  for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2); for (let s = 0; s <= n; s++) p.push([a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n]); }
  for (const [x, y] of p) { g.set(x, y - 1, '#34343c'); g.set(x, y, '#26262c'); g.set(x, y + 1, '#16161a'); if (thick) g.set(x, y + 2, '#16161a'); }
  p.forEach(([x, y], i) => { if (i % 5 === 4) return; g.set(x, y, shade(i / (p.length - 1) * t1, f, J.rest)); });   // ribbed: a dark band every few
}
// The port screwed into his shoulder, where the hose goes in.
const port = (g, x, y, f) => { g.ell(x, y, 2.8, 2.4, R.iron[2]); g.ell(x, y, 1.6, 1.3, R.iron[0]); g.set(Math.round(x), Math.round(y), shade(0.33, f, J.mid)); g.set(Math.round(x) - 2, Math.round(y) - 1, R.iron[4]); };
// The tank: glass between iron bands, the green in it with a bubble rising, a valve wheel on top.
function tank(g, x, y, w, h, f) {
  const G = J.glass, top = y + 2 + (f % 3 === 0 ? 0 : 1);
  g.rect(x, y, w, h, G[1]); g.rect(x + 1, top, w - 2, h - (top - y) - 1, G[2]); g.vl(x + 1, top + 1, h - 5, G[3]); g.vl(x + w - 2, y + 2, h - 3, G[1]);
  g.set(x + 2 + (f & 1), y + h - 3 - (f % 6), G[4]); g.set(x + w - 3, y + h - 2 - ((f + 3) % 6), G[3]);
  for (const r of [y, y + Math.round(h / 2), y + h - 1]) { g.hl(x - 1, r, w + 2, R.iron[2]); g.hl(x - 1, r, 2, R.iron[3]); }
  g.vl(x + (w >> 1), y - 3, 3, R.iron[2]); g.hl(x + (w >> 1) - 2, y - 4, 5, R.iron[3]); g.set(x + (w >> 1), y - 4, R.iron[1]);
}

// ---- the skull: a goat's, long, sockets lit green, horns ridged and swept back ----
function horn(g, pts, w0) {
  pts.forEach((p, i) => { if (!i) return; const q = pts[i - 1], w = w0 * (1 - i / pts.length * 0.7); g.bar(q[0], q[1], p[0], p[1], w, R.bone[2], R.bone[3], R.bone[1]); });
  pts.forEach((p, i) => { if (i % 1 === 0 && i > 0 && i < pts.length - 1) g.set(Math.round(p[0]), Math.round(p[1]), R.bone[1]); });   // the rings on it
}
function skullFront(g, cx, cy, f) {
  horn(g, [[cx - 3, cy - 4], [cx - 6, cy - 8], [cx - 10, cy - 10], [cx - 13, cy - 9], [cx - 14, cy - 6]], 3.6);
  horn(g, [[cx + 3, cy - 4], [cx + 6, cy - 8], [cx + 10, cy - 10], [cx + 13, cy - 9], [cx + 14, cy - 6]], 3.6);
  vol(g, cx, cy - 1, 5.4, 4.6, R.bone);                               // the brain case
  g.poly([[cx - 4.5, cy + 1], [cx + 4.5, cy + 1], [cx + 3, cy + 7], [cx + 1.5, cy + 9], [cx - 1.5, cy + 9], [cx - 3, cy + 7]], R.bone[2]);   // the long face down to the muzzle
  g.tone((x, y) => x >= cx + 2, R.bone[1], [R.bone[2]]); g.tone((x, y) => x <= cx - 2 && y < cy + 5, R.bone[3], [R.bone[2]]);
  for (const ex of [cx - 3, cx + 2]) { g.rect(ex, cy, 2, 2, '#0e0a08'); g.set(ex + (ex < cx ? 1 : 0), cy + 1, shade(0.12, f, J.mid)); g.set(ex + (ex < cx ? 1 : 0), cy, J.lit); }   // the sockets, lit
  g.set(cx - 1, cy + 4, '#0e0a08'); g.set(cx, cy + 4, '#0e0a08'); g.set(cx, cy + 5, '#2a201a');   // the nose's hole
  for (let x = cx - 1; x <= cx + 1; x++) g.set(x, cy + 8, x === cx ? R.bone[1] : R.bone[4]);   // the teeth
  g.vl(cx, cy - 4, 3, R.bone[1]);                                     // the seam up the brow
}

// ---- THE FRONT ----
function front(g, o) {
  const cx = 38, f = o.f, k = 1.32 * (1 + 0.07 * SWELL[f]), st = o.pose === 'walk' ? 1 : 0, T = R.skin;
  tank(g, cx + 9, 11, 9, 15, f);                                       // over his left shoulder, behind him
  for (const [hx, fx, lift] of [[cx - 4, cx - 5, st * 2], [cx + 6, cx + 7, 0]]) {   // trousers and wrapped boots
    limb(g, hx, 47, fx, FOOT - 4 - lift, 7.4, R.pants);
    g.rect(Math.round(fx - 4), FOOT - 7 - lift, 9, 7, R.lea[2]); g.hl(Math.round(fx - 4), FOOT - 7 - lift, 9, R.lea[3]); g.hl(Math.round(fx - 4), FOOT - 4 - lift, 9, R.wrap[1]); g.hl(Math.round(fx - 4), FOOT - 1 - lift, 10, R.lea[0]);
  }
  vol(g, cx + 1, 41, 9, 6.8, T);                                       // the gut
  vol(g, cx + 1, 31.5, 13.5, 8.8, T);                                  // the chest, a V
  g.hl(cx - 7, 36, 7, T[1], true); g.hl(cx + 2, 36, 7, T[1], true); g.vl(cx + 1, 32, 5, T[1], true);
  for (const y of [39, 42]) { g.set(cx - 1, y, T[1]); g.set(cx + 3, y, T[1]); }
  g.line(cx + 4, 31, cx + 6, 33, R.red[1]); g.line(cx + 6, 31, cx + 4, 33, R.red[1]);   // the cult's mark, burnt in
  g.line(cx - 9, 26, cx + 7, 45, R.lea[2]); g.line(cx - 8, 26, cx + 8, 45, R.lea[2]);   // the harness
  g.rect(cx - 9, 45, 21, 3, R.lea[1]); g.hl(cx - 9, 45, 21, R.lea[3]); g.rect(cx, 45, 3, 3, R.iron[3]);   // the belt
  g.poly([[cx - 4, 48], [cx + 6, 48], [cx + 5, 58], [cx + 1, 60], [cx - 3, 58]], R.red[2]);   // the cult's red down the front
  g.vl(cx - 3, 49, 9, R.red[3], true); g.vl(cx + 5, 49, 9, R.red[1], true); g.hl(cx - 3, 57, 9, R.red[1], true);
  // the small arm, a strong man's, bound in leather at the forearm
  vol(g, cx + 14, 28, 4.2, 3.8, T); limb(g, cx + 14, 28, cx + 17, 36, 5, T); limb(g, cx + 17, 36, cx + 16, 44, 4.4, T); vol(g, cx + 16, 45, 2.8, 2.6, T);
  g.rect(cx + 14, 39, 5, 3, R.lea[2]); g.hl(cx + 14, 39, 5, R.lea[3]);
  if (o.pose === 'goat') stamp(g, GOAT, cx - 13, 9 - 8, 'flip');
  if (o.pose === 'man') stamp(g, CLUB, cx - 13, 9 - 7, 'rot');
  const b = o.pose === 'throw' ? null : bigArm(g, o.pose, cx - 13, 27, k, -1, f);
  hose(g, [[cx + 13, 8], [cx + 6, 15], [cx - 2, 21], [cx - 9, 24]], f, 0.33, true);
  port(g, cx - 9, 24, f);
  // the red mantle round his neck, the skull's straps under it
  g.poly([[cx - 7, 23], [cx + 9, 23], [cx + 10, 27], [cx + 5, 29], [cx + 1, 27], [cx - 3, 29], [cx - 8, 27]], R.red[2]);
  g.hl(cx - 7, 23, 17, R.red[3], true); g.tone((x, y) => x > cx + 5, R.red[1], [R.red[2]]);
  for (const [x, l] of [[cx - 6, 2], [cx - 1, 3], [cx + 3, 2], [cx + 8, 2]]) g.vl(x, 28, l, R.red[1]);
  skullFront(g, cx + 1, 15, f);
  if (o.pose === 'throw') {
    // the swing it came round: an arc from over his head down to the open hand, brightest at the hand
    const S0 = [cx - 13, 27], rr = 15.8 * k;
    for (let an = -1.55; an > -3.1; an -= 0.02) for (const dr of [0, 1]) { const x = Math.round(S0[0] + Math.cos(an) * (rr + dr)), y = Math.round(S0[1] + Math.sin(an) * (rr + dr)); if (!g.get(x, y)) g.set(x, y, an > -2.0 ? '#4a4038' : an > -2.5 ? '#7a6c58' : '#bdb196'); }
    bigArm(g, 'throw', cx - 13, 27, k, -1, f); port(g, cx - 9, 24, f);
  }
}

// ---- THE BACK: the tank is the picture ----
function back(g, o) {
  const cx = 38, f = o.f, k = 1.32 * (1 + 0.07 * SWELL[f]), T = R.skin;
  for (const [hx, fx] of [[cx - 5, cx - 6], [cx + 5, cx + 6]]) { limb(g, hx, 47, fx, FOOT - 4, 7.4, R.pants); g.rect(Math.round(fx - 4), FOOT - 7, 9, 7, R.lea[2]); g.hl(Math.round(fx - 4), FOOT - 4, 9, R.wrap[1]); g.hl(Math.round(fx - 4), FOOT - 1, 10, R.lea[0]); }
  vol(g, cx, 41, 9, 6.8, T); vol(g, cx, 31.5, 13.5, 8.8, T);
  g.vl(cx, 27, 17, T[1], true);                                        // the spine
  g.hl(cx - 9, 34, 5, T[1], true); g.hl(cx + 5, 34, 5, T[1], true);   // the shoulder blades
  g.rect(cx - 10, 45, 21, 3, R.lea[1]); g.hl(cx - 10, 45, 21, R.lea[3]);
  g.poly([[cx - 5, 48], [cx + 5, 48], [cx + 4, 57], [cx - 4, 57]], R.red[1]);
  // the small arm on the left now
  vol(g, cx - 14, 28, 4.2, 3.8, T); limb(g, cx - 14, 28, cx - 17, 36, 5, T); limb(g, cx - 17, 36, cx - 16, 44, 4.4, T); vol(g, cx - 16, 45, 2.8, 2.6, T); g.rect(cx - 19, 39, 5, 3, R.lea[2]);
  // the harness carries the tank: straps over both shoulders down to the belt
  g.line(cx - 8, 25, cx - 5, 45, R.lea[2]); g.line(cx + 8, 25, cx + 5, 45, R.lea[2]);
  tank(g, cx - 6, 25, 12, 18, f);
  g.rect(cx - 7, 30, 14, 2, R.lea[1]); g.rect(cx - 7, 38, 14, 2, R.lea[1]);   // its straps across
  if (o.pose === 'goat') stamp(g, GOAT, cx + 11, 9 - 12, 'flip');
  const b = bigArm(g, o.pose === 'throw' ? 'idle' : o.pose, cx + 12, 27, k, 1, f);
  hose(g, [[cx, 21], [cx + 4, 20], [cx + 8, 22], [cx + 10, 24]], f, 0.33, true);
  port(g, cx + 10, 24, f);
  g.poly([[cx - 8, 22], [cx + 8, 22], [cx + 9, 26], [cx + 3, 30], [cx, 28], [cx - 3, 30], [cx - 9, 26]], R.red[2]); g.tone((x, y) => x > cx + 3, R.red[1], [R.red[2]]);
  // the skull from behind: the back of it, its straps, the horns sweeping back toward us and down
  vol(g, cx, 15, 5.4, 5, R.bone); g.hl(cx - 5, 16, 11, R.lea[2], true); g.vl(cx, 10, 6, R.lea[2], true);
  horn(g, [[cx - 3, 11], [cx - 6, 8], [cx - 10, 7], [cx - 13, 9], [cx - 13, 12]], 3.6);
  horn(g, [[cx + 3, 11], [cx + 6, 8], [cx + 10, 7], [cx + 13, 9], [cx + 13, 12]], 3.6);
  vol(g, cx, 21, 4.4, 2.4, T);                                         // the nape
}

// ---- THE SIDE, facing east: the big arm toward us, the tank on his back ----
function side(g, o) {
  const cx = 37, f = o.f, k = 1.32 * (1 + 0.07 * SWELL[f]), T = R.skin, s = o.pose === 'walk' ? 3 : 0;
  tank(g, cx - 14, 22, 8, 19, f); g.rect(cx - 7, 27, 3, 2, R.lea[1]); g.rect(cx - 7, 36, 3, 2, R.lea[1]);
  // the far (small) arm, dim
  limb(g, cx + 1, 28, cx + 3 - s, 37, 4.6, [R.skin[0], R.skin[0], R.skin[1], R.skin[1], R.skin[1]]); limb(g, cx + 3 - s, 37, cx + 4 - s, 44, 4, [R.skin[0], R.skin[0], R.skin[1], R.skin[1], R.skin[1]]);
  for (const [fx, near] of [[cx - 2 - s, false], [cx + 1 + s, true]]) {
    const P = near ? R.pants : R.pants.map(c => mix(c, '#000000', 0.3));
    limb(g, cx - 1, 47, fx, FOOT - 4, 7, P);
    g.rect(Math.round(fx - 3), FOOT - 7, 8, 7, near ? R.lea[2] : R.lea[1]); g.hl(Math.round(fx - 3), FOOT - 4, 8, R.wrap[near ? 1 : 0]); g.hl(Math.round(fx - 3), FOOT - 1, 9, R.lea[0]);
  }
  vol(g, cx + 1.5, 41, 8, 7, T);                                       // gut out in front
  vol(g, cx - 0.5, 31.5, 10.5, 9, T);                                  // the chest and the back, as thick as he is wide
  g.rect(cx - 7, 45, 15, 3, R.lea[1]); g.hl(cx - 7, 45, 15, R.lea[3]);
  g.poly([[cx + 3, 48], [cx + 8, 48], [cx + 7, 58], [cx + 4, 58]], R.red[2]);
  g.line(cx - 6, 25, cx - 6, 45, R.lea[2]);                            // the strap down his back
  if (o.pose === 'goat') stamp(g, GOAT, cx + 1, 9 - 12, 'flip');
  if (o.pose === 'man') stamp(g, CLUB, cx + 1, 9 - 12, 'rot');
  const pose = o.pose === 'throw' ? 'side-throw' : o.pose;
  const b = pose === 'side-throw' ? (() => { const bb = bigArm(g, 'idle', cx - 1, 27, k, 1, f); return bb; })() : bigArm(g, o.pose, cx - 1, 27, k, o.pose === 'goat' || o.pose === 'man' ? -1 : -1, f);
  hose(g, [[cx - 10, 19], [cx - 6, 21], [cx - 2, 23]], f, 0.33, true);
  port(g, cx - 2, 23, f);
  g.poly([[cx - 8, 22], [cx + 4, 22], [cx + 5, 27], [cx - 2, 29], [cx - 9, 27]], R.red[2]); g.tone((x, y) => x < cx - 4, R.red[1], [R.red[2]]);
  // the skull in profile: the brain case, the long face out to the east, the horn swept back over his nape
  horn(g, [[cx - 1, 11], [cx - 5, 8], [cx - 9, 9], [cx - 11, 13], [cx - 10, 17]], 3.8);
  vol(g, cx, 15, 5, 4.8, R.bone);
  g.poly([[cx + 2, 12], [cx + 10, 17], [cx + 10, 20], [cx + 6, 21], [cx + 1, 19]], R.bone[2]);
  g.tone((x, y) => y >= 19, R.bone[1], [R.bone[2]]); g.hl(cx + 3, 13, 5, R.bone[3], true);
  g.rect(cx + 2, 14, 2, 2, '#0e0a08'); g.set(cx + 3, 15, shade(0.12, f, J.mid)); g.set(cx + 3, 14, J.lit);
  g.set(cx + 9, 18, '#0e0a08'); for (const x of [cx + 6, cx + 8]) g.set(x, 20, R.bone[4]);
}

const VIEWS = { front, side, back };
class Off extends Grid { set(x, y, c) { return super.set(x, Math.round(y) + UP, c); } get(x, y) { return super.get(x, Math.round(y) + UP); } }
const sprite = (view, pose, f) => { const o = new Off(W, H + UP); VIEWS[view](o, { f, pose }); const g = new Grid(W, H + UP); g.p = o.p; g.outline(OL); g.clean(OL); return g; };
const toImg = g => { const im = new Img(g.w, g.h); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(x, y); if (c) im.fill(x, y, 1, 1, c); } return im; };
// crop a sprite to what is drawn, keeping its feet row
const crop = (g, keepTop) => { let y0 = g.h; for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.get(x, y)) { y0 = Math.min(y0, y); } return keepTop ? Math.min(y0, keepTop) : y0; };

// ---- the sheet ----
const Z = 4, pad = 14;
const CELLS = [
  ['THE LOOK', [['front', 'idle', 4, 'front'], ['side', 'idle', 4, 'side'], ['back', 'idle', 4, 'back']]],
  ['WHAT HE DOES', [['front', 'walk', 1, 'stride'], ['front', 'goat', 4, 'the goat up'], ['front', 'man', 4, 'a man up'], ['front', 'throw', 6, 'the throw'], ['side', 'goat', 4, 'side · goat up']]],
];
const top = UP - 36;   // how much headroom the rows keep (the lifts need all of it)
const cw = W * Z, ch = (H + UP - top) * Z;
const pulseZ = 2.5, pulseW = Math.round(W * pulseZ), pulseH = Math.round((H + 2) * pulseZ);
const img = new Img(pad + 5 * (cw + pad), pad + CELLS.length * (ch + 50) + (pulseH + 50) + 360, '#2b2622');
let y = pad;
for (const [title, row] of CELLS) {
  text(img, title, pad, y, '#e8d8b0', 3);
  row.forEach(([v, p, f, label], j) => {
    const g = sprite(v, p, f), x = pad + j * (cw + pad);
    img.blit(toImg(g), 0, top, g.w, g.h - top, x, y + 26, g.w * Z, (g.h - top) * Z);
    img.fill(x, y + 26 + (FOOT + UP - top) * Z, g.w * Z, 1, '#5a4d40');
    text(img, label, x, y + 26 + ch + 4, '#a89a80', 2);
  });
  y += ch + 50;
}
text(img, 'THE PULSE · EIGHT FRAMES', pad, y, '#e8d8b0', 3);
for (let f = 0; f < N; f++) { const g = sprite('front', 'idle', f), x = pad + f * (pulseW + 6); img.blit(toImg(g), 0, UP - 2, g.w, H + 2, x, y + 26, pulseW, pulseH); }
y += pulseH + 60;
// world size beside the goat, a clubman, the shieldman and the ogre (4 screen px a world px)
text(img, 'AT GAME SIZE', pad, y, '#e8d8b0', 3);
const S = 4, y0 = y + 300; let x = pad;
const put = (g, k, foot, label) => { const w = Math.round(g.w * k * S), h = Math.round(g.h * k * S); img.blit(toImg(g), 0, 0, g.w, g.h, x, Math.round(y0 - foot * k * S), w, h, true); text(img, label, x, y0 + 8, '#d8ccb0', 2); x += w + pad * 2; };
put(GOAT, 34 / 112 * 3, GOAT.h, 'goat'); put(CLUB, 36 / 112 * 3, CLUB.h, 'clubman');
const sp = SP.sprite(0, 0); put(sp.g, 0.92, SP.FOOT, 'shieldman');
put(sprite('front', 'idle', 4), TX, FOOT + UP, 'him'); put(sprite('side', 'idle', 4), TX, FOOT + UP, 'him');
const og = OG.sprite(0, 'idle', 0); put(og.g, 1.4, OG.FOOT, 'ogre');
img.fill(pad, y0, x - pad, 1, '#5a4d40');
fs.writeFileSync(__dirname + '/goatbane.png', img.png());

// ---- the live page ----
const strips = {};
for (const v of Object.keys(VIEWS)) for (const p of ['idle', 'walk', 'goat', 'man', 'throw']) {
  const im = new Img(W * N, H + UP);
  for (let f = 0; f < N; f++) { const s = toImg(sprite(v, p, f)); im.blit(s, 0, 0, s.w, s.h, f * W, 0, s.w, s.h); }
  strips[v + '|' + p] = 'data:image/png;base64,' + im.png().toString('base64');
}
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Goat Skull Bane</title><style>
:root{--bg:#2b2622;--card:#342e29;--ink:#e8d8b0;--dim:#a89a80;--line:#4a4038}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.4 system-ui,sans-serif;padding:16px}
h1{font-size:20px;margin:0 0 4px}p{color:var(--dim);margin:0 0 12px;max-width:760px}
.bar{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
button{background:#3e3630;color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:7px 12px;font:inherit;cursor:pointer}
button.on{border-color:var(--ink);background:#55493f}
.stage{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end}
canvas{image-rendering:pixelated;background:#231f1c;border-radius:6px;max-width:100%}
.lab{color:var(--dim);font-size:13px;margin-top:4px}
</style></head><body>
<h1>Бейн в козьем черепе</h1>
<p>Бак зелёного на спине, шланг через плечи в порт, вкрученный в плечо. По шлангу и венам бежит волна, рука набухает на ударе, кожа к кулаку зеленеет: зелёное её съело. Глаза в черепе горят тем же.</p>
<div class="bar" id="views"><button data-v="front" class="on">спереди</button><button data-v="side">сбоку</button><button data-v="back">сзади</button><button data-v="all">все три</button></div>
<div class="bar" id="poses"><button data-p="idle" class="on">стоит</button><button data-p="walk">шаг</button><button data-p="goat">поднял козла</button><button data-p="man">поднял человека</button><button data-p="throw">бросок</button></div>
<div class="bar" id="zoom"><button data-z="2">x2</button><button data-z="4" class="on">x4</button><button data-z="6">x6</button></div>
<div class="stage" id="stage"></div>
<script>
const STRIPS=${JSON.stringify(strips)}, W=${W}, H=${H + UP}, N=${N};
const DUR=[110,110,110,90,180,130,110,260];
let view='front', pose='idle', z=4, f=0;
const cache={}; const im=k=>{if(!cache[k]){const i=new Image();i.src=STRIPS[k];cache[k]=i}return cache[k]};
const names={front:'спереди',side:'сбоку',back:'сзади'};
let cvs=[];
function build(){const st=document.getElementById('stage');st.innerHTML='';cvs=(view==='all'?['front','side','back']:[view]).map(v=>{const d=document.createElement('div');const c=document.createElement('canvas');c.width=W*z;c.height=H*z;d.appendChild(c);const l=document.createElement('div');l.className='lab';l.textContent=names[v];d.appendChild(l);st.appendChild(d);return {v,c}})}
function group(id,key,set){document.querySelectorAll('#'+id+' button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#'+id+' button').forEach(x=>x.classList.toggle('on',x===b));set(b.dataset[key]);build()})}
group('views','v',v=>view=v);group('poses','p',p=>pose=p);group('zoom','z',v=>z=+v);
build();
function tick(){for(const {v,c} of cvs){const i=im(v+'|'+pose),x=c.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,c.width,c.height);if(i.complete)x.drawImage(i,f*W,0,W,H,0,0,W*z,H*z)}const d=DUR[f];f=(f+1)%N;setTimeout(tick,d)}tick();
</script></body></html>`;
fs.writeFileSync(__dirname + '/goatbane.html', html);
console.log('goatbane.png', img.w, img.h, 'html', (html.length / 1024).toFixed(0) + ' KB', 'goat', GOAT.w + 'x' + GOAT.h, 'club', CLUB.w + 'x' + CLUB.h);
