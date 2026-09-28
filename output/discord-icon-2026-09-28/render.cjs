// The Discord server's icon: the goat's face, front on, as a hand-built pixel portrait on a 64 grid.
// Lava horns (TUNING.goat.hornLooks.lava), THE ORACLE's third eye (TUNING.goat.face.eye), acid on the
// breath (hornLooks.venom / face.foam). Everything sits inside the circle Discord crops the icon to.
//   node output/discord-icon-2026-09-28/render.cjs   -> icon-512.png, icon-1024.png beside it
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const N = 64, C = 31.5;
// design space is a little larger than the grid, pulled in so the horns clear the circle
const K = 0.8, D = (v) => C + (v - C) / K;

const LAVA = ['#2a0a05', '#5c1407', '#8f1e0a', '#e0521a', '#ffb43a', '#fff0a0'];
const BONE = ['#4a3828', '#7a634a', '#a78f6c', '#cdb892', '#e9dcbc', '#f7efdc'];
const VEN = ['#12260e', '#2f5a1c', '#5c9a2a', '#9fd84a', '#d4f59a', '#f0ffd0'];
const EYE = { iris: '#a46cff', irisHi: '#cfa8ff', pupil: '#16091f', white: '#f6efff', edge: '#24160e' };
const INK = '#160c08', BG = '#0d0a0c';

const grid = Array.from({ length: N * N }, () => null);   // { c, part }
const set = (x, y, c, part) => { if (x >= 0 && y >= 0 && x < N && y < N) grid[y * N + x] = { c, part }; };
const get = (x, y) => (x >= 0 && y >= 0 && x < N && y < N ? grid[y * N + x] : null);
const each = (fn) => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) fn(x, y, D(x + 0.5), D(y + 0.5)); };
const q = (ramp, v) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(v)))];
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const dither = (x, y) => (bayer[y & 3][x & 3] + 0.5) / 16;

// ---- shapes in design space ----
const ell = (u, v, cx, cy, rx, ry) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2;
const rot = (u, v, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a), dx = u - cx, dy = v - cy; return [cx + dx * c + dy * s, cy - dx * s + dy * c]; };
const headIn = (u, v) => {
  if (ell(u, v, C, 26.5, 11.5, 10.5) <= 1) return true;               // skull
  if (v >= 26 && v <= 45) { const t = (v - 26) / 19, w = 11 + (6.2 - 11) * t; if (Math.abs(u - C) <= w) return true; }
  return ell(u, v, C, 45, 6.6, 4.4) <= 1;                              // muzzle end
};
const earIn = (u, v, side) => { const cx = C + side * 14.5, [ru, rv] = rot(u, v, cx, 27.5, side * 0.42); return ell(ru, rv, cx, 27.5, 7.6, 3.1) <= 1; };
const neckIn = (u, v) => v >= 36 && Math.abs(u - C) <= 8.5 + (v - 36) * 0.38;
// a horn: a cubic from the crown up and outward, fat at the root, thin at the tip
const bez = (p, t) => { const m = 1 - t; return [0, 1].map((k) => m * m * m * p[0][k] + 3 * m * m * t * p[1][k] + 3 * m * t * t * p[2][k] + t * t * t * p[3][k]); };
const HORN = [[25, 18.8], [23.5, 6.5], [15, 1.5], [9.5, 6]];
const hornPts = []; for (let i = 0; i <= 200; i++) { const t = i / 200; hornPts.push({ t, p: bez(HORN, t), r: 3.9 * (1 - t) + 0.9 * t }); }
const hornAt = (u, v, side) => {
  const uu = side < 0 ? u : 2 * C - u; let best = null;
  for (const h of hornPts) { const d = Math.hypot(uu - h.p[0], v - h.p[1]); if (d <= h.r && (!best || h.t > best.t)) best = { t: h.t, d, r: h.r, dx: uu - h.p[0] }; }
  return best;
};

// ---- the neck and ears go down first, behind the face ----
each((x, y, u, v) => { if (neckIn(u, v)) set(x, y, q(BONE, 0.9 - (u - C) / 16 - (v - 44) * 0.03 + (dither(x, y) - 0.5) * 0.3), 'neck'); });
for (const side of [-1, 1]) each((x, y, u, v) => {
  if (!earIn(u, v, side)) return;
  const cx = C + side * 14.5, inner = ell(...rot(u, v, cx, 28.2, side * 0.42), cx, 28.2, 5.2, 1.3) <= 1;
  set(x, y, inner ? (v > 28.6 ? '#b86a6a' : '#e19a94') : q(BONE, 2.6 - side * 0.5 - (v - 27) * 0.35), 'ear');
});

// ---- the head, lit from the upper left, darker to its rim ----
const headMask = new Uint8Array(N * N);
each((x, y, u, v) => { if (headIn(u, v)) headMask[y * N + x] = 1; });
const rim = new Float32Array(N * N).fill(99);   // steps to the head's edge
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (headMask[y * N + x]) {
  let d = 99; for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) { const xx = x + i, yy = y + j; if (xx < 0 || yy < 0 || xx >= N || yy >= N || !headMask[yy * N + xx]) d = Math.min(d, Math.hypot(i, j)); }
  rim[y * N + x] = d;
}
each((x, y, u, v) => {
  if (!headMask[y * N + x]) return;
  const r = rim[y * N + x], lx = -(u - C) / 11, ly = -(v - 26) / 22;
  let l = 3.1 + lx * 0.9 + ly * 0.7 - (r < 1.6 ? 1.3 : r < 2.6 ? 0.55 : 0) + (dither(x, y) - 0.5) * 0.35;
  // the bridge of the nose catches the light, the cheeks under the eyes fall off
  if (Math.abs(u - C) < 1.4 && v > 30 && v < 42) l += 0.9;
  if (Math.abs(Math.abs(u - C) - 8) < 2.2 && v > 32 && v < 40) l -= 0.7;
  if (v > 41) l -= (v - 41) * 0.22;
  set(x, y, q(BONE, l), 'head');
});
// a tuft of beard below the chin
each((x, y, u, v) => { if (v > 48 && v < 55 && Math.abs(u - C) < 3.2 - (v - 48) * 0.4 && !get(x, y)?.part?.startsWith('horn')) set(x, y, q(BONE, 2.2 - (v - 48) * 0.25 + hash(x, y) * 0.8), 'head'); });

// ---- the horns: black rock with every ridge glowing, the tip molten ----
for (const side of [-1, 1]) each((x, y, u, v) => {
  const h = hornAt(u, v, side); if (!h) return;
  const ridge = Math.sin(h.t * 34) > 0.55, edge = h.d > h.r - 0.9, lit = -h.dx * side * 0.25;
  let l = 1.2 + lit + h.t * 1.6 + (ridge ? 2.2 : 0) - (edge ? 0.8 : 0) + (dither(x, y) - 0.5) * 0.6;
  if (h.t > 0.86) l = 4.4 + (h.t - 0.86) * 8;
  set(x, y, q(LAVA, l), 'horn');
});

// ---- the eyes: amber, the goat's bar of a pupil, a hot rim ----
for (const side of [-1, 1]) {
  const ex = C + side * 7.4, ey = 29.6;
  each((x, y, u, v) => {
    const e = ell(u, v, ex, ey, 4.1, 3.4);
    if (e > 1.3 || e <= 1 && false) return;
    if (e > 1) { if (headMask[y * N + x]) set(x, y, BONE[0], 'head'); return; }   // socket shadow
    const bar = Math.abs(v - ey) < 0.62 && Math.abs(u - ex) < 3.1;
    set(x, y, bar ? '#120606' : v < ey - 2 ? '#ffb43a' : v < ey - 0.6 ? '#fff0a0' : v > ey + 1.9 ? '#b8360f' : '#f07a1e', 'eye');
  });
}
// brows: a dark ridge over each eye, lower toward the middle, so he glares
for (const side of [-1, 1]) { const ex = C + side * 7.4, ey = 29.6; each((x, y, u, v) => { if (Math.abs(u - ex) > 3.9) return; const bv = ey - 4.9 + (u - ex) * -side * 0.3; const g = get(x, y); if (Math.abs(v - bv) < 0.8 && headMask[y * N + x] && !(g && g.part === 'eye')) set(x, y, BONE[0], 'head'); }); }
// a glint in each
for (const side of [-1, 1]) { const gx = Math.round((C + side * 7.4 - 1.4 - C) * K + C), gy = Math.round((28.2 - C) * K + C); set(gx, gy, '#fff4d0', 'eye'); }

// ---- THE ORACLE, upright in the brow ----
const TX = C, TY = 20.4;
each((x, y, u, v) => {
  const e = ell(u, v, TX, TY, 2.9, 4.6); if (e > 1.45) return;
  if (e > 1) { set(x, y, EYE.edge, 'eye'); return; }
  const d = Math.hypot(u - TX, (v - TY) * 0.8);
  const slit = Math.abs(u - TX) < 0.55 && Math.abs(v - TY) < 1.9;
  set(x, y, slit ? EYE.pupil : d < 2.5 ? (v < TY - 0.6 ? EYE.irisHi : EYE.iris) : EYE.white, 'eye');
});

// the third eye lights the brow round it
each((x, y, u, v) => { const g = get(x, y); if (!g || g.part !== 'head') return; const e = ell(u, v, TX, TY, 2.9, 4.6); if (e > 1.45 && e < 2.3 && dither(x, y) < 0.55) set(x, y, e < 1.9 ? '#b9a3d6' : '#a0908f', 'head'); });
// ---- nostrils and the mouth open on the breath ----
for (const side of [-1, 1]) each((x, y, u, v) => { if (ell(u, v, C + side * 2.6, 43.2, 1.3, 0.9) <= 1) set(x, y, '#2a1810', 'head'); });
each((x, y, u, v) => { if (ell(u, v, C, 47.6, 4.2, 1.2) <= 1) set(x, y, v < 47.3 ? '#1a0b09' : '#3d1f18', 'head'); });

// ---- the acid: froth at the lips, drips, and the cloud he breathes out ----
const PUFFS = [[C, 55.5, 5.8], [C - 6.5, 57.5, 4.4], [C + 6.8, 57, 4.6], [C - 12, 60.5, 3.6], [C + 12.5, 60.2, 3.8], [C - 2.5, 61, 4.2], [C + 3.5, 60.5, 4]];
each((x, y, u, v) => {
  let inside = null;
  for (const [px, py, pr] of PUFFS) { const d = Math.hypot(u - px, v - py); if (d <= pr && (!inside || d / pr < inside.k)) inside = { k: d / pr, dy: v - py, pr }; }
  if (!inside) return;
  const l = 3.3 - inside.dy / inside.pr * 1.4 - (inside.k > 0.8 ? 1.1 : 0) + (dither(x, y) - 0.5) * 0.9;
  set(x, y, q(VEN, l), 'acid');
});
each((x, y, u, v) => { if (ell(u, v, C, 48.9, 5.4, 1.4) <= 1) set(x, y, hash(x, y) > 0.45 ? VEN[4] : VEN[3], 'acid'); });   // froth
// drips off the lips and the cloud, each a line with a bead on its end
for (let [dx, len] of [[-4.6, 5], [4.2, 7], [-13.5, 3.5], [12.8, 4.5], [0.8, 2.5]]) {
  const x0 = Math.round((C + dx - C) * K + C), y0 = Math.round((dx > -6 && dx < 6 ? 49.5 : 62) * K + C - C * K); len = Math.round(len);
  for (let k = 0; k < len; k++) set(x0, y0 + k, k === len - 1 ? VEN[4] : VEN[3], 'acid');
  set(x0, y0 + len, VEN[2], 'acid');
}

// ---- outlines: the silhouette in ink, the horns' own root where they cross the skull ----
const shape = grid.map((g) => !!g);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  if (shape[y * N + x]) continue;
  if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([i, j]) => { const xx = x + i, yy = y + j; return xx >= 0 && yy >= 0 && xx < N && yy < N && shape[yy * N + xx]; })) set(x, y, INK, 'ink');
}
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const g = get(x, y); if (!g || g.part !== 'horn') continue;
  if ([[1, 0], [-1, 0], [0, 1]].some(([i, j]) => { const o = get(x + i, y + j); return o && o.part === 'head'; })) set(x, y, LAVA[0], 'horn');
}

// ---- flames off the horn tips ----
const FLAME = ['..1..', '.121.', '.121.', '12321', '13431', '13431', '.232.'];
for (const side of [-1, 1]) {
  const tip = bez(HORN, 1), tx = Math.round(((side < 0 ? tip[0] : 2 * C - tip[0]) - C) * K + C), ty = Math.round((tip[1] - C) * K + C);
  FLAME.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') set(tx - 2 + i, ty - 7 + j, LAVA[+ch + 1], 'flame'); }));
}

// ---- the dark behind him: a fire below the frame, embers, a halo off the horns ----
const px = new Array(N * N);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const g = grid[y * N + x]; if (g) { px[y * N + x] = g.c; continue; }
  const glow = Math.max(0, 1 - Math.hypot(x - C, (y - 70) * 0.85) / 46) + (dither(x, y) - 0.5) * 0.18;
  let c = glow > 0.62 ? '#4a1109' : glow > 0.42 ? '#2e0c09' : glow > 0.22 ? '#1c0b0b' : BG;
  // the horns throw a little red round themselves
  let acid = 99; for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const o = get(x + i, y + j); if (o && o.part === 'acid') acid = Math.min(acid, Math.hypot(i, j)); }
  if (acid <= 2.3 && dither(x, y) < 0.6) c = '#12260e';
  let near = 99; for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const o = get(x + i, y + j); if (o && (o.part === 'horn' || o.part === 'flame')) near = Math.min(near, Math.hypot(i, j)); }
  if (near <= 2.3 && dither(x, y) < 0.75) c = '#3a0d06'; else if (near <= 3.2 && dither(x, y) < 0.35) c = '#2a0a05';
  if (hash(x, y) > 0.985 && y > 20) c = hash(y, x) > 0.5 ? '#ffb43a' : '#e0521a';
  px[y * N + x] = c;
}

// ---- PNG out ----
function png(scale, file) {
  const W = N * scale, raw = Buffer.alloc((W * 3 + 1) * W);
  for (let y = 0; y < W; y++) { raw[y * (W * 3 + 1)] = 0; for (let x = 0; x < W; x++) {
    const c = px[Math.floor(y / scale) * N + Math.floor(x / scale)], o = y * (W * 3 + 1) + 1 + x * 3;
    raw[o] = parseInt(c.slice(1, 3), 16); raw[o + 1] = parseInt(c.slice(3, 5), 16); raw[o + 2] = parseInt(c.slice(5, 7), 16);
  } }
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([l, td, cr]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(W, 4); ih[8] = 8; ih[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}
png(8, path.join(__dirname, 'icon-512.png'));
png(16, path.join(__dirname, 'icon-1024.png'));
console.log('written');
