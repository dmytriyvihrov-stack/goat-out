// node concepts.cjs [zoom] → sheet.png: five looks for THE VILLAIN (10 Oct 2026, the user's: "a hard follower of
// the meat cult, Lord Humungus; he took the ewe to sacrifice her; after a corrupted soul he is bigger than a man").
// Each look twice, front view, on the game's Grid, outlined like every unit: as the man he is, and corrupted,
// drawn again at ×K (not scaled: every part is laid at the larger size), the soul lit in him. The last strip sets
// them all at world size beside the goat, a clubman and the ogre. Concept art only: nothing in js/ loads this.
const fs = require('fs'), { Img, text, decode } = require('../pixel-claude-2026-09-24/png.cjs');
const { Grid } = require('../../js/prop-pixels.js');
const OG = require('../../js/ogre-pixels.js');

const W = 60, H = 76, FOOT = 74, OL = '#1a1411', K = 1.6;
const R = {
  skin: ['#5a3222', '#8a5236', '#b87a54', '#d89c70', '#f0c49a'],
  tan: ['#4e2a1c', '#7a4a2e', '#a86a44', '#c98a5e', '#e4ad82'],
  pale: ['#4a3438', '#76585c', '#a2817f', '#c4a39b', '#e2c7bb'],
  meat: ['#4a1414', '#761f1f', '#a42e2a', '#c74b3e', '#e07060'],
  sinew: ['#7a5a52', '#a88478', '#d0ad9c', '#e8cdbd', '#fbeadf'],
  red: ['#440f13', '#6e191d', '#9c2528', '#c23d36', '#dc6048'],
  iron: ['#1e1e24', '#303038', '#51505b', '#878692', '#b4b3bd'],
  mask: ['#4a4a50', '#6c6c74', '#90909a', '#b2b2ba', '#d2d2d8'],
  bone: ['#6e6650', '#8c8166', '#c6ba98', '#ebe1c4', '#fff7e2'],
  lea: ['#15100d', '#241a14', '#332419', '#44301f', '#55402a'],
  hide: ['#2a170c', '#46280f', '#653a17', '#86512a', '#a46c3c'],
  wolf: ['#2a2a2c', '#45454a', '#66666c', '#8c8c92', '#b4b4b8'],
  gold: ['#6e4a10', '#9a6c18', '#c99424', '#e8b73c', '#fbd96e'],
  soul: ['#2e1a3a', '#4a2a5e', '#6a3d7a', '#9a60b8', '#d2a0f0'],
  link: ['#3a1c14', '#5e2c1e', '#80402a', '#9e5636', '#b8704a'],
};
const V = { vein: '#6a3d7a', glow: '#b47cd0', hot: '#e6c4ff', eye: '#d2a0f0' };
const lit = (T, dx, dy, n) => { const l = -(dx * 0.55 + dy * 0.83); return n > 0.82 && l < -0.45 ? T[0] : n > 0.55 && l < -0.2 ? T[1] : n > 0.72 && l > 0.55 ? T[4] : n > 0.4 && l > 0.3 ? T[3] : T[2]; };
const hash = (x, y) => ((Math.imul(x + 5, 73856093) ^ Math.imul(y + 3, 19349663)) >>> 0) % 100;

// Every drawing call goes through D, which lays it at k× its size, so the corrupted one is drawn
// bigger and not blown up (blown-up pixels are the one thing that would give it away).
class D {
  constructor(g, k) { this.g = g; this.k = k; }
  s(v) { return v * this.k; }
  vol(cx, cy, rx, ry, T, test) {
    const g = this.g, k = this.k; cx *= k; cy *= k; rx *= k; ry *= k;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, n = Math.hypot(dx, dy);
      if (n > 1 || (test && !test(x / k, y / k))) continue; g.set(x, y, lit(T, dx, dy, n));
    }
    return this;
  }
  limb(x0, y0, x1, y1, t, T) { const k = this.k; this.g.bar(x0 * k, y0 * k, x1 * k, y1 * k, t * k, T[2], T[3], T[1]); return this; }
  bar(x0, y0, x1, y1, t, c, l, d) { const k = this.k; this.g.bar(x0 * k, y0 * k, x1 * k, y1 * k, t * k, c, l, d); return this; }
  poly(pts, c) { const k = this.k; this.g.poly(pts.map(([x, y]) => [x * k, y * k]), c); return this; }
  rect(x, y, w, h, c, only) { const k = this.k; this.g.rect(Math.round(x * k), Math.round(y * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)), c, only); return this; }
  hl(x, y, n, c, only) { return this.rect(x, y, n, 1 / this.k, c, only); }
  vl(x, y, n, c, only) { return this.rect(x, y, 1 / this.k, n, c, only); }
  dot(x, y, c, sz = 1) { const k = this.k, w = Math.max(1, Math.round(sz * k)); this.g.rect(Math.round(x * k - (w - 1) / 2), Math.round(y * k - (w - 1) / 2), w, w, c); return this; }
  ell(cx, cy, rx, ry, c, only) { const k = this.k; this.g.ell(cx * k, cy * k, rx * k, ry * k, c, only); return this; }
  ring(cx, cy, rx, ry, t, c, only) { const k = this.k; this.g.ring(cx * k, cy * k, rx * k, ry * k, Math.max(1, t * k), c, only); return this; }
  line(x0, y0, x1, y1, c, only) { const k = this.k; this.g.line(x0 * k, y0 * k, x1 * k, y1 * k, c, only); return this; }
  tone(test, c, from) { const k = this.k; this.g.tone((x, y) => test(x / k, y / k), c, from); return this; }
  // veins and fibres: a hash over the grid's own pixels, so they stay a pixel wide at any size
  speck(test, T, n, c) { const g = this.g, k = this.k; for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const v = g.get(x, y); if (v && T.includes(v) && hash(x * 3, y) < n && test(x / k, y / k)) g.set(x, y, c); } return this; }
  get(x, y) { return this.g.get(Math.round(x * this.k), Math.round(y * this.k)); }
}

// ---- shared parts (plain units, cx the middle) ----
const leg = (d, hx, fx, top, T, w, boot) => { d.limb(hx, top, fx, FOOT - 2, w, T); d.vol(fx, FOOT - 1.6, w * 0.75, 2, T); if (boot) { d.tone((x, y) => y >= FOOT - 7 && Math.abs(x - fx) <= w * 0.8, boot[2], T); d.hl(fx - w * 0.6, FOOT - 7, w * 1.2, boot[3], true); } };
const arm = (d, sx, sy, ex, ey, fx, fy, T, t, fist) => { d.vol(sx, sy, t * 0.8, t * 0.75, T); d.limb(sx, sy, ex, ey, t, T); d.vol(ex, ey, t * 0.55, t * 0.55, T); d.limb(ex, ey, fx, fy, t * 0.9, T); d.vol(fx, fy, t * 0.7, t * 0.65, fist || T); };
const bracer = (d, fx, fy, ex, ey, T) => { const mx = (fx + ex) / 2, my = (fy + ey) / 2; d.bar(fx + (ex - fx) * 0.2, fy + (ey - fy) * 0.2, mx + (ex - mx) * 0.4, my + (ey - my) * 0.4, 4.2, T[2], T[3], T[1]); d.dot(mx, my, R.iron[3]); };
// the harness: two straps crossed over the chest, a ring where they meet, studs along them
const harness = (d, cx, y0, y1, c, stud) => {
  const T = R.lea; d.bar(cx - 9, y0, cx + 6, y1, 2.6, T[2], T[3], T[1]); d.bar(cx + 9, y0, cx - 6, y1, 2.6, T[2], T[3], T[1]);
  for (let t = 0.12; t < 0.95; t += 0.18) { d.dot(cx - 9 + 15 * t, y0 + (y1 - y0) * t, stud || R.iron[3]); d.dot(cx + 9 - 15 * t, y0 + (y1 - y0) * t, stud || R.iron[3]); }
  d.ring(cx, y0 + (y1 - y0) * 0.6, 2.6, 2.6, 1.1, R.iron[3]);
};
const belt = (d, cx, y, w, c) => { d.rect(cx - w, y, 2 * w + 1, 2.2, c[2]); d.hl(cx - w, y, 2 * w + 1, c[3]); for (let x = cx - w + 1; x <= cx + w; x += 3) d.dot(x, y + 1, R.iron[3]); };
const loin = (d, cx, y, w, h, T, studs) => { d.poly([[cx - w, y], [cx + w, y], [cx + w - 1.5, y + h], [cx, y + h + 1.5], [cx - w + 1.5, y + h]], T[2]); d.tone((x, yy) => x > cx + 2 && yy > y, T[1], [T[2]]); d.hl(cx - w, y, 2 * w, T[3]); if (studs) for (let yy = y + 2; yy < y + h; yy += 2.5) for (let x = cx - w + 2; x < cx + w - 1; x += 2.5) d.dot(x, yy, R.iron[3]); };
const eyes = (d, cx, y, c, gap = 2.5) => { d.dot(cx - gap, y, c); d.dot(cx + gap, y, c); };
// the soul in him: lit through the chest, a ring of it, and his veins gone violet
const corruptBody = (d, cx, cy, T, box) => { d.speck((x, y) => box ? box(x, y) : true, T, 11, V.vein); d.ell(cx, cy, 3.6, 2.8, V.glow, true); d.ell(cx, cy, 1.8, 1.3, V.hot, true); d.ring(cx, cy, 5, 4, 1, V.vein, true); };

// ---- the five ----
const LOOKS = [
  { name: 'THE WARDEN', sub: 'Humungus as he is: iron mask, harness, bare chest', draw(d, co) {
    const cx = 30, T = R.skin;
    leg(d, cx - 5, cx - 8, 52, T, 6.5, R.lea); leg(d, cx + 5, cx + 8, 52, T, 6.5, R.lea);
    loin(d, cx, 47, 9, 8, R.red, true);
    d.vol(cx, 40, 8.5, 7.5, T);                                              // belly and abs
    d.vol(cx, 30, 12, 8.5, T);                                               // the chest
    d.hl(cx - 1, 34, 1, T[1]); d.vl(cx, 31, 10, T[1]); for (const y of [36, 40]) { d.hl(cx - 4, y, 3, T[1]); d.hl(cx + 2, y, 3, T[1]); }   // abs
    d.vol(cx - 12, 25, 6, 5.5, T); d.vol(cx + 12, 25, 6, 5.5, T);            // deltoids
    arm(d, cx - 14, 27, cx - 19, 39, cx - 18, 52, T, 5.5); arm(d, cx + 14, 27, cx + 19, 39, cx + 18, 52, T, 5.5);
    bracer(d, cx - 18, 52, cx - 19, 39, R.lea); bracer(d, cx + 18, 52, cx + 19, 39, R.lea);
    harness(d, cx, 23, 47, R.lea); belt(d, cx, 46, 10, R.lea);
    d.vol(cx, 19, 3.5, 2.5, T);                                              // the neck
    d.vol(cx, 13, 6, 6.5, T);                                                // bald head
    d.hl(cx - 6, 10.5, 12, R.lea[2]); d.hl(cx - 5, 8, 10, R.lea[1]);           // bald: only the mask's straps round the skull
    d.poly([[cx - 5, 10], [cx + 5, 10], [cx + 5.5, 16], [cx + 3, 20], [cx - 3, 20], [cx - 5.5, 16]], R.mask[2]);   // the mask plate
    d.tone((x, y) => x > cx + 2 && y > 10, R.mask[1], [R.mask[2]]); d.tone((x, y) => x < cx - 2 && y < 15, R.mask[3], [R.mask[2]]);
    d.hl(cx - 4.5, 12, 3, '#0d0a0c'); d.hl(cx + 1.5, 12, 3, '#0d0a0c');     // eye slits
    for (const y of [15, 17, 19]) for (const x of [cx - 2.5, cx, cx + 2.5]) if (y < 19 || x === cx) d.dot(x, y, R.mask[0]);   // the breathing holes
    d.hl(cx - 7, 11.5, 2, R.lea[3]); d.hl(cx + 5, 11.5, 2, R.lea[3]);        // strap to the cap
    if (co) {
      corruptBody(d, cx, 32, T, (x, y) => y > 20);
      d.hl(cx - 4.5, 12, 3, V.eye); d.hl(cx + 1.5, 12, 3, V.eye); for (const y of [15, 17]) for (const x of [cx - 2.5, cx, cx + 2.5]) d.dot(x, y, V.glow);
      d.line(cx + 2, 10, cx + 4, 19, V.vein, true);                           // the plate cracked by what is behind it
      d.bar(cx - 4, 9, cx - 7, 4, 2, R.bone[2], R.bone[3], R.bone[1]); d.bar(cx + 4, 9, cx + 7, 4, 2, R.bone[2], R.bone[3], R.bone[1]);   // horns through the cap
    }
  } },
  { name: 'THE ABBOT', sub: 'the high priest: goat skull helm, horn crown, bone apron, a cleaver', draw(d, co) {
    const cx = 30, T = R.tan, hn = co ? 7 : 5;
    leg(d, cx - 4, cx - 6, 52, T, 5.5, R.hide); leg(d, cx + 4, cx + 6, 52, T, 5.5, R.hide);
    d.poly([[cx - 9, 36], [cx + 9, 36], [cx + 11, 60], [cx - 11, 60]], R.red[2]); d.tone((x, y) => x > cx + 4, R.red[1], [R.red[2]]);   // red robe to the knee
    d.vol(cx, 29, 10, 8, T);
    d.vol(cx - 10, 24, 5, 4.5, T); d.vol(cx + 10, 24, 5, 4.5, T);
    arm(d, cx - 12, 26, cx - 17, 38, cx - 17, 52, T, 4.6); arm(d, cx + 12, 26, cx + 16, 38, cx + 15, 50, T, 4.6);
    // the bone apron: ribs sewn in rows, hooks on chains off the belt
    d.poly([[cx - 7, 32], [cx + 7, 32], [cx + 8, 58], [cx - 8, 58]], R.bone[2]); d.tone((x, y) => x > cx + 3, R.bone[1], [R.bone[2]]);
    for (let y = 34; y < 57; y += 3) { d.hl(cx - 6, y, 12, R.bone[3]); d.hl(cx - 6, y + 1, 12, R.bone[0]); }
    d.vl(cx, 33, 24, R.bone[1]); belt(d, cx, 44, 9, R.lea);
    for (const x of [cx - 6, cx + 6]) { d.vl(x, 46, 6, R.iron[2]); d.dot(x, 52, R.iron[3]); d.dot(x + (x < cx ? -1 : 1), 53, R.iron[3]); }   // the hooks
    bracer(d, cx - 17, 52, cx - 17, 38, R.hide);
    // the cleaver, its edge on the floor
    d.rect(cx + 14, 50, 2, 14, R.hide[2]); d.poly([[cx + 12, 60], [cx + 24, 60], [cx + 26, 72], [cx + 10, 72]], R.iron[2]); d.hl(cx + 10, 71, 16, R.iron[4]); d.tone((x, y) => y > 60 && y < 66 && x > cx + 14, R.iron[3], [R.iron[2]]);
    d.vol(cx, 19, 3, 2.5, T);
    // the goat's skull worn whole over his head, the crown of horns fanned off it
    d.vol(cx, 13, 5.5, 6.5, R.bone); d.poly([[cx - 2.5, 16], [cx + 2.5, 16], [cx + 1.5, 21], [cx - 1.5, 21]], R.bone[1]);   // the muzzle
    d.dot(cx - 2.5, 13, '#0d0a0c', 1.6); d.dot(cx + 2.5, 13, '#0d0a0c', 1.6); d.hl(cx - 1, 19, 3, R.bone[0]);
    for (let i = 0; i < hn; i++) { const a = -Math.PI * (0.15 + 0.7 * i / (hn - 1)), L = co ? 13 : 9; d.bar(cx + Math.cos(a) * 4, 9 + Math.sin(a) * 3, cx + Math.cos(a) * (4 + L), 7 + Math.sin(a) * L, 2.2, R.bone[2], R.bone[3], R.bone[1]); }
    eyes(d, cx, 13, co ? V.eye : R.red[4], 2.5);
    if (co) {
      corruptBody(d, cx, 29, T, (x, y) => y > 20 && y < 34);
      d.speck((x, y) => y > 32 && y < 58 && Math.abs(x - cx) < 8, R.bone, 6, V.vein);
      for (const x of [cx - 10, cx + 10]) { d.vol(x, 47, 2.2, 2.6, R.bone); d.dot(x - 0.8, 46.5, V.eye); d.dot(x + 0.8, 46.5, V.eye); }   // skulls hung off the belt
    }
  } },
  { name: 'THE FLAYED', sub: 'he took his own skin off for the god: muscle, sinew, a cage of iron for a face', draw(d, co) {
    const cx = 30, T = R.meat;
    leg(d, cx - 5, cx - 8, 52, T, 6, R.lea); leg(d, cx + 5, cx + 8, 52, T, 6, R.lea);
    loin(d, cx, 47, 9, 7, R.lea);
    d.vol(cx, 40, 8.5, 7.5, T); d.vol(cx, 30, 12, 8.5, T);
    d.vol(cx - 12, 25, 6, 5.5, T); d.vol(cx + 12, 25, 6, 5.5, T);
    arm(d, cx - 14, 27, cx - 19, 39, cx - 18, 52, T, 5.5); arm(d, cx + 14, 27, cx + 19, 39, cx + 18, 52, T, 5.5);
    // fibres: short vertical strokes over every muscle, sinew pale at the joints
    d.speck((x, y) => true, T, 26, T[0]); d.speck((x, y) => true, T, 9, R.sinew[2]);
    for (const [x, y] of [[cx - 14, 27], [cx + 14, 27], [cx - 19, 39], [cx + 19, 39], [cx - 5, 52], [cx + 5, 52]]) d.ell(x, y, 1.8, 1.4, R.sinew[3], true);
    for (const y of [27, 30, 33]) { d.hl(cx - 6, y, 4, R.sinew[1], true); d.hl(cx + 3, y, 4, R.sinew[1], true); }   // ribs showing
    harness(d, cx, 23, 47, R.lea, R.sinew[4]);                                 // the studs are stitches into the meat
    belt(d, cx, 46, 10, R.lea);
    d.vol(cx, 19, 3.5, 2.5, T);
    d.vol(cx, 13, 6, 6.5, T); d.speck((x, y) => y < 20, T, 20, T[0]);
    eyes(d, cx, 13, '#fff7e2', 2.5); d.dot(cx - 2.5, 13, '#0d0a0c', 0.7); d.dot(cx + 2.5, 13, '#0d0a0c', 0.7);   // lidless eyes
    d.hl(cx - 3, 18, 7, R.sinew[4]); for (let x = cx - 3; x <= cx + 3; x += 1.5) d.vl(x, 17, 2, T[0]);               // the teeth, no lips
    for (const y of [9, 13, 17]) d.hl(cx - 6, y, 13, R.iron[3]); for (const x of [cx - 6, cx - 2, cx + 2, cx + 6]) d.vl(x, 7, 13, R.iron[2]);   // the cage
    d.dot(cx - 6, 9, R.iron[4]); d.dot(cx + 6, 9, R.iron[4]);
    if (co) {
      corruptBody(d, cx, 31, T, (x, y) => y > 20);
      d.speck((x, y) => true, R.sinew, 30, V.glow);                             // the sinew lit
      eyes(d, cx, 13, V.eye, 2.5);
    }
  } },
  { name: 'THE WOLF SHEPHERD', sub: 'a wolf in the pelt: the crook with the hook, the old man\'s bells on his harness', draw(d, co) {
    const cx = 30, T = R.skin, Wf = R.wolf;
    leg(d, cx - 5, cx - 8, 52, T, 6.5, R.hide); leg(d, cx + 5, cx + 8, 52, T, 6.5, R.hide);
    loin(d, cx, 47, 9, 8, R.hide);
    d.vol(cx, 40, 8.5, 7.5, T); d.vol(cx, 30, 12, 8.5, T);
    d.vol(cx - 12, 25, 6, 5.5, T); d.vol(cx + 12, 25, 6, 5.5, T);
    arm(d, cx - 14, 27, cx - 19, 39, cx - 18, 52, T, 5.5); arm(d, cx + 14, 27, cx + 19, 39, cx + 17, 48, T, 5.5);
    // the pelt: the hide over the shoulders, its legs hanging down the back, the wolf's head over his own
    d.poly([[cx - 16, 21], [cx + 16, 21], [cx + 14, 30], [cx + 8, 26], [cx, 29], [cx - 8, 26], [cx - 14, 30]], Wf[2]); d.tone((x, y) => y > 21 && x > cx + 6, Wf[1], [Wf[2]]);
    d.speck((x, y) => y > 20 && y < 31, Wf, 30, Wf[3]); d.speck((x, y) => y > 20 && y < 31, Wf, 12, Wf[0]);
    for (const x of [cx - 15, cx + 15]) { d.limb(x, 28, x + (x < cx ? -1 : 1), 38, 2.6, Wf); d.vol(x + (x < cx ? -1 : 1), 39, 1.6, 1.4, Wf); }   // the forelegs of the pelt
    harness(d, cx, 23, 47, R.lea); belt(d, cx, 46, 10, R.lea);
    for (const [x, y] of [[cx - 5, 30], [cx - 1, 36], [cx + 3, 30], [cx + 5, 38]]) { d.vol(x, y, 1.6, 1.8, R.gold); d.dot(x, y + 1.6, R.gold[0]); }   // the bells
    d.vol(cx, 19, 3.5, 2.5, T);
    d.vol(cx, 14, 5.5, 6, T);
    d.poly([[cx - 4, 15], [cx + 4, 15], [cx + 3.5, 20], [cx - 3.5, 20]], R.lea[2]); for (const y of [16, 18]) d.hl(cx - 3, y, 7, R.lea[3]); for (const x of [cx - 2, cx, cx + 2]) d.vl(x, 15, 5, R.lea[0]);   // the leather muzzle
    eyes(d, cx, 13, co ? V.eye : '#f0a832', 2.5);
    d.vol(cx, 8, 7, 4.5, Wf, (x, y) => y <= 11); d.poly([[cx - 7, 9], [cx + 7, 9], [cx + 6, 12], [cx + 2, 11], [cx, 12.5], [cx - 2, 11], [cx - 6, 12]], Wf[1]);   // the wolf's head on his brow, the upper jaw over it
    for (const x of [cx - 4.5, cx - 1.5, cx + 1.5, cx + 4.5]) d.vl(x, 11, 1.5, R.bone[3]);                                                                      // its teeth
    d.bar(cx - 5, 6, cx - 7, 2, 2.4, Wf[2], Wf[3], Wf[1]); d.bar(cx + 5, 6, cx + 7, 2, 2.4, Wf[2], Wf[3], Wf[1]);                                            // the ears
    d.dot(cx - 3, 7, co ? V.eye : R.bone[3]); d.dot(cx + 3, 7, co ? V.eye : R.bone[3]);                                                                      // its eyes, glass or lit
    // the crook: a shaft to the floor, its hook iron
    d.bar(cx + 21, 24, cx + 21, 72, 2, R.hide[2], R.hide[3], R.hide[1]); d.ring(cx + 20, 20, 4, 4.5, 1.6, R.iron[3]); d.rect(cx + 16, 20, 4, 5, null); d.dot(cx + 16.5, 23, R.iron[4]);
    if (co) {
      corruptBody(d, cx, 36, T, (x, y) => y > 30);
      d.speck((x, y) => y > 24 && y < 50 && Math.abs(x - cx) < 10, T, 35, Wf[1]);   // the fur grows down over his chest: he is becoming the wolf
      d.vol(cx - 18, 52, 3.5, 3.2, Wf); d.vol(cx + 17, 48, 3.5, 3.2, Wf); for (const [x, y] of [[cx - 20, 54], [cx - 17, 55], [cx + 15, 50], [cx + 19, 50]]) d.dot(x, y, R.bone[3]);   // claws
    }
  } },
  { name: 'THE GLUTTON', sub: 'he eats what is sacrificed: the belly, the apron, a hog\'s iron mask, sausages for a chain', draw(d, co) {
    const cx = 30, T = R.pale;
    leg(d, cx - 5, cx - 7, 56, T, 5, R.lea); leg(d, cx + 5, cx + 7, 56, T, 5, R.lea);
    d.vol(cx, 40, 15, 13, T);                                                 // the belly
    d.vol(cx, 27, 12, 6.5, T);
    d.vol(cx - 13, 25, 5.5, 5, T); d.vol(cx + 13, 25, 5.5, 5, T);
    arm(d, cx - 15, 27, cx - 21, 38, cx - 20, 50, T, 5); arm(d, cx + 15, 27, cx + 21, 38, cx + 20, 50, T, 5);
    d.vol(cx, 40, 15, 13, T);                                                 // the belly again, in front of the arms
    d.ell(cx, 39, 2, 1.2, T[1]);                                              // the navel
    d.poly([[cx - 9, 34], [cx + 9, 34], [cx + 12, 60], [cx - 12, 60]], R.hide[3]); d.tone((x, y) => x > cx + 4 && y > 34, R.hide[2], [R.hide[3]]);   // the apron
    d.speck((x, y) => y > 34 && y < 60 && Math.abs(x - cx) < 11, R.hide, 14, R.red[1]);                                                            // stained
    d.line(cx - 9, 34, cx - 12, 24, R.hide[1]); d.line(cx + 9, 34, cx + 12, 24, R.hide[1]);                                                           // its straps
    for (let t = 0; t <= 1; t += 0.11) { const x = cx - 12 + 24 * t, y = 24 + Math.sin(t * Math.PI) * 10; d.vol(x, y, 1.8, 1.4, R.link); }               // a chain of sausages
    d.hl(cx - 11, 53, 22, R.lea[2]); d.hl(cx - 11, 54, 22, R.lea[1]);
    d.rect(cx + 18, 44, 1.5, 10, R.hide[2]); d.poly([[cx + 16, 52], [cx + 24, 52], [cx + 25, 60], [cx + 15, 60]], R.iron[2]); d.hl(cx + 15, 59, 10, R.iron[4]);   // a small cleaver
    d.vol(cx, 20, 4.5, 2.5, T);                                               // no neck, a fold
    d.vol(cx, 14, 6.5, 6, T); d.vol(cx, 18, 5, 2.5, T);                       // the jowls
    // the hog's mask: a snout plate with two holes, a grille for the mouth, riveted to a band
    d.poly([[cx - 6, 10], [cx + 6, 10], [cx + 6, 16], [cx + 4, 21], [cx - 4, 21], [cx - 6, 16]], R.iron[2]); d.tone((x, y) => x < cx - 2 && y < 15, R.iron[3], [R.iron[2]]);
    d.vol(cx, 16, 3.2, 2.2, R.iron); d.dot(cx - 1.2, 16, R.iron[0]); d.dot(cx + 1.2, 16, R.iron[0]);   // the snout
    for (const x of [cx - 2.5, cx - 0.5, cx + 1.5]) d.vl(x, 19, 2, R.iron[0]);                           // the grille
    d.hl(cx - 4.5, 12.5, 3, '#0d0a0c'); d.hl(cx + 1.5, 12.5, 3, '#0d0a0c');
    d.dot(cx - 6, 11, R.iron[4]); d.dot(cx + 6, 11, R.iron[4]); d.dot(cx - 5, 18, R.iron[4]); d.dot(cx + 5, 18, R.iron[4]);
    d.bar(cx - 5, 9, cx - 6, 5, 1.8, R.iron[2], R.iron[3], R.iron[1]); d.bar(cx + 5, 9, cx + 6, 5, 1.8, R.iron[2], R.iron[3], R.iron[1]);   // its ears
    if (co) {
      d.speck((x, y) => y > 22, T, 10, V.vein);
      d.ell(cx, 41, 7, 6, V.glow, true); d.ell(cx, 41, 3.5, 3, V.hot, true); d.ring(cx, 41, 9, 8, 1, V.vein, true);   // the souls he swallowed, lit through the belly
      for (const [x, y] of [[cx - 4, 38], [cx + 3, 44], [cx + 5, 37]]) d.dot(x, y, V.hot, 1.5);                       // faces pressing out
      d.hl(cx - 4.5, 12.5, 3, V.eye); d.hl(cx + 1.5, 12.5, 3, V.eye); d.dot(cx - 1.2, 16, V.glow); d.dot(cx + 1.2, 16, V.glow);
    }
  } },
];

const sprite = (look, co) => { const k = co ? K : 1, g = new Grid(Math.round(W * k), Math.round(H * k)); look.draw(new D(g, k), co); g.outline(OL); g.clean(OL); return g; };
const toImg = (g) => { const im = new Img(g.w, g.h); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(x, y); if (c) im.fill(x, y, 1, 1, c); } return im; };

// the atlas, for the goat and a clubman at world size
const src = fs.readFileSync(__dirname + '/../../js/pixel-assets.js', 'utf8');
const A = JSON.parse(src.match(/const PIXEL_ASSETS = (\{.*?\});/s)[1].replace(/"image":"data:image\/png;base64,[^"]*"/, '"image":""'));
const at = decode(Buffer.from(src.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)[1], 'base64'));
const EXT = { goat: 34, clubman: 36 };
const atlasImg = (u, d) => { const f = A.units[u].idle[d], im = new Img(f[2], f[3]); for (let j = 0; j < f[3]; j++) for (let i = 0; i < f[2]; i++) { const k = ((f[1] + j) * at.w + f[0] + i) * 4; if (at.data[k + 3] < 128) continue; im.fill(i, j, 1, 1, '#' + [0, 1, 2].map((o) => at.data[k + o].toString(16).padStart(2, '0')).join('')); } return { im, foot: f[5], k: EXT[u] / A.target }; };

const Z = +(process.argv[2] || 4), pad = 16, TX = 0.68, S = 3;     // TX: world px a texel (plain: ~50 px to the crown, the butcher's ~44 and the ogre's ~70 between)
const blockW = Math.round(W * Z + W * K * Z) + 3 * pad, blockH = Math.round(H * K * Z) + 80, perRow = 3, rows = Math.ceil(LOOKS.length / perRow);
const stripH = Math.round(H * K * TX * S) + 60;
const stripW = (() => { let w = pad; const add = (pw, k) => { w += Math.round(pw * k * S) + pad; }; add(A.units.goat.idle[7][2], EXT.goat / A.target); add(A.units.clubman.idle[0][2], EXT.clubman / A.target); for (let i = 0; i < 5; i++) add(W, TX); add(OG.W, 1.4); for (let i = 0; i < 5; i++) add(W * K, TX); return w + pad; })();
const img = new Img(Math.max(stripW, pad + perRow * blockW), pad + rows * blockH + stripH + pad, '#2b2622');
text(img, 'THE VILLAIN · five looks · the man, and the same man with a corrupted soul in him (x' + K + ')', pad, 4, '#e8d8b0', 2);
LOOKS.forEach((L, i) => {
  const bx = pad + (i % perRow) * blockW, by = pad + 24 + Math.floor(i / perRow) * blockH;
  text(img, (i + 1) + '. ' + L.name, bx, by, '#e8d8b0', 3); text(img, L.sub, bx, by + 22, '#a89a80', 2);
  const base = by + 44 + Math.round(H * K * Z);
  [false, true].forEach((co, j) => {
    const g = sprite(L, co), x = bx + (j ? W * Z + pad : 0), y = base - g.h * Z;
    img.blit(toImg(g), 0, 0, g.w, g.h, x, y, g.w * Z, g.h * Z);
    text(img, co ? 'CORRUPTED' : 'THE MAN', x, base + 4, '#a89a80', 2);
  });
  img.fill(bx, base, blockW - pad, 1, '#5a4d40');
});
// the scale strip: the goat, a clubman, every look as the man, the ogre, every look corrupted
const y0 = pad + 24 + rows * blockH + stripH - 36; let x = pad;
text(img, 'AT WORLD SIZE: goat, clubman, the five men, the ogre, the five corrupted', pad, y0 - stripH + 40, '#e8d8b0', 2);
const put = (im, k, foot, label) => { const w = Math.round(im.w * k * S), h = Math.round(im.h * k * S); img.blit(im, 0, 0, im.w, im.h, x, Math.round(y0 - foot * k * S), w, h, true); text(img, label, x, y0 + 6, '#d8ccb0', 2); x += w + pad; };
let a = atlasImg('goat', 7); put(a.im, a.k, a.foot, 'goat'); a = atlasImg('clubman', 0); put(a.im, a.k, a.foot, 'man');
LOOKS.forEach((L, i) => put(toImg(sprite(L, false)), TX, FOOT + 1, String(i + 1)));
const og = OG.sprite(0, 'idle', 0); const ogi = toImg(og.g); put(ogi, 1.4, OG.FOOT, 'ogre');
LOOKS.forEach((L, i) => put(toImg(sprite(L, true)), TX, (FOOT + 1) * K, (i + 1) + '*'));
img.fill(pad, y0, x - pad, 1, '#5a4d40');
fs.writeFileSync(__dirname + '/sheet.png', img.png());
console.log('sheet.png', img.w, img.h);
