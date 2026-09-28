// The Discord server's icon: the goat's head in three-quarter view, looking down and to the right,
// as a pixel portrait on a 48 grid — chunky pixels, clean shading steps, no dither on the hide.
// Lava horns (TUNING.goat.hornLooks.lava), THE ORACLE's third eye (TUNING.goat.face.eye), acid on the
// breath (hornLooks.venom / face.foam). Everything sits inside the circle Discord crops the icon to.
//   node output/discord-icon-2026-09-28/render.cjs   -> icon-780.png, icon-1040.png beside it
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const N = 52, C = 25.5, OX = 2, OY = 5;

const LAVA = ['#2a0a05', '#6a1608', '#c0390f', '#ff8a24', '#ffd45a', '#fff4b8'];
const BONE = ['#3e2c20', '#6d5540', '#9c8263', '#c7b08a', '#e8d9b6', '#faf1dc'];
const VEN = ['#1c3a12', '#3f7a22', '#79c036', '#bff06a', '#efffc0'];
const EYE = { iris: '#9a5cff', irisHi: '#cda6ff', pupil: '#16091f', white: '#f4ecff', edge: '#2a1030' };
const INK = '#150b07', BG = '#0d0a0c';

const grid = Array.from({ length: N * N }, () => null);   // { c, part }
const set = (x, y, c, part) => { x = Math.round(x) + OX; y = Math.round(y) + OY; if (x >= 0 && y >= 0 && x < N && y < N) grid[y * N + x] = { c, part }; };
const at = (x, y) => (x >= 0 && y >= 0 && x < N && y < N ? grid[y * N + x] : null);
const get = (x, y) => at(x + OX, y + OY);
const each = (fn) => { for (let y = -OY; y < N - OY; y++) for (let x = -OX; x < N - OX; x++) fn(x, y, x + 0.5, y + 0.5); };
const q = (ramp, v) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(v)))];
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const ell = (u, v, cx, cy, rx, ry) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2;
const rot = (u, v, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a), dx = u - cx, dy = v - cy; return [cx + dx * c + dy * s, cy - dx * s + dy * c]; };
// distance from a point to a segment, how far along it the nearest point is, and which side it is on
const seg = (u, v, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), t = Math.max(0, Math.min(1, ((u - a[0]) * dx + (v - a[1]) * dy) / (L * L)));
  return { d: Math.hypot(u - a[0] - dx * t, v - a[1] - dy * t), t, across: ((u - a[0]) * dy - (v - a[1]) * dx) / L }; };

// ---- the shapes of the head, turned to his left (our right) and down ----
const SKULL = [21, 23, 8.6, 7.6];
const SNOUT = { a: [23, 25], b: [32.2, 33.2], w0: 5.8, w1: 3.9 };
const CHEEK = [20, 29, 6.4, 4.8];
const headIn = (u, v) => {
  if (ell(u, v, ...SKULL) <= 1 || ell(u, v, ...CHEEK) <= 1) return true;
  const s = seg(u, v, SNOUT.a, SNOUT.b); return s.d <= SNOUT.w0 + (SNOUT.w1 - SNOUT.w0) * s.t;
};
const neckIn = (u, v) => v > 28 && u > 11 - (v - 28) * 0.2 && u < 25 - (v - 28) * 0.05 && !(v < 34 && u > 23);
const EARS = { near: [9.6, 25.6, 5.8, 2.3, -0.5], far: [31.2, 18.6, 4, 1.7, 0.4] };
const earIn = (u, v, e) => ell(...rot(u, v, e[0], e[1], e[4]), e[0], e[1], e[2], e[3]) <= 1;
// horns: a cubic each, fat at the root, sweeping back over his head
const bez = (p, t) => { const m = 1 - t; return [0, 1].map((k) => m * m * m * p[0][k] + 3 * m * m * t * p[1][k] + 3 * m * t * t * p[2][k] + t * t * t * p[3][k]); };
const HORNS = {
  far: { p: [[25.8, 17.2], [27.5, 9.5], [25.5, 3.5], [21.2, 2.2]], r0: 2.3, r1: 0.7 },
  near: { p: [[16.2, 18.2], [12.5, 10.5], [7.5, 8], [4.2, 11.5]], r0: 3.1, r1: 0.8 },
};
for (const h of Object.values(HORNS)) { h.pts = []; for (let i = 0; i <= 160; i++) { const t = i / 160; h.pts.push({ t, p: bez(h.p, t), r: h.r0 + (h.r1 - h.r0) * t }); } }
const hornAt = (u, v, h) => { let best = null; for (const k of h.pts) { const d = Math.hypot(u - k.p[0], v - k.p[1]); if (d <= k.r && (!best || k.t > best.t)) best = { t: k.t, d, r: k.r, dy: v - k.p[1] }; } return best; };

// light from the upper left: a clean step per band, never dithered
const lit = (u, v, cx, cy, rx, ry) => -((u - cx) / rx) * 0.9 - ((v - cy) / ry) * 0.9;

// ---- far things first: far horn, far ear, neck ----
each((x, y, u, v) => { const h = hornAt(u, v, HORNS.far); if (!h) return;
  const ridge = Math.sin(h.t * 26) > 0.5; let l = 0.8 + h.t * 1.2 + (ridge ? 1.8 : 0) - (h.dy > h.r * 0.4 ? 0.8 : 0); if (h.t > 0.85) l = 3.6 + (h.t - 0.85) * 8;
  set(x, y, q(LAVA, l), 'hornfar'); });
each((x, y, u, v) => { if (!earIn(u, v, EARS.far)) return; set(x, y, v > EARS.far[1] + 0.3 ? BONE[1] : BONE[2], 'ear'); });
each((x, y, u, v) => { if (!neckIn(u, v)) return; set(x, y, q(BONE, 1.6 - (u - 13) / 10 - (v - 34) / 14), 'neck'); });

// ---- the head ----
const HM = new Set(); const hk = (x, y) => x * 1000 + y;
each((x, y, u, v) => { if (headIn(u, v)) HM.add(hk(x, y)); });
const inHead = (x, y) => HM.has(hk(x, y));
const edgeOf = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([i, j]) => !inHead(x + i, y + j));
each((x, y, u, v) => {
  if (!inHead(x, y)) return;
  let l = 2.8 + lit(u, v, 20, 22, 11, 12);
  const s = seg(u, v, SNOUT.a, SNOUT.b);
  // the bridge of the nose: a lit band down the top of the snout; its underside falls away
  if (s.t > 0.05 && s.t < 0.92) { if (s.across < -1 && s.across > -3.2) l += 0.8; if (s.across > 2.2) l -= 0.9; }
  if (ell(u, v, ...CHEEK) <= 1 && v > 29.5) l -= 0.7;     // under the jaw
  if (edgeOf(x, y)) l -= 1;                                // a darker rim inside the ink
  set(x, y, q(BONE, l), 'head');
});
// the muzzle is a shade pinker and darker at the very end
each((x, y, u, v) => { if (inHead(x, y) && Math.hypot(u - 32.4, v - 33.4) < 3.2) set(x, y, Math.hypot(u - 34.2, v - 32.6) < 1.8 ? '#4a3530' : Math.hypot(u - 31.4, v - 32.4) < 1.8 ? BONE[3] : BONE[2], 'head'); });
// beard
for (const [x, y, c] of [[27, 38, 2], [28, 38, 2], [27, 39, 2], [28, 39, 1], [27, 40, 1], [28, 40, 1], [27, 41, 1], [26, 39, 1], [27, 42, 0]]) set(x, y, BONE[c], 'head');

// ---- near ear, near horn ----
each((x, y, u, v) => { if (!earIn(u, v, EARS.near)) return;
  const inner = ell(...rot(u, v, 9.8, 26.1, -0.5), 9.8, 26.1, 4, 0.9) <= 1;
  set(x, y, inner ? '#d88f88' : q(BONE, 3 - (v - 24) * 0.45), 'ear'); });
each((x, y, u, v) => { const h = hornAt(u, v, HORNS.near); if (!h) return;
  const ridge = Math.sin(h.t * 26) > 0.45; let l = 1.3 + h.t * 1.2 + (ridge ? 2 : 0) + (h.dy < -h.r * 0.3 ? 0.7 : 0) - (h.dy > h.r * 0.4 ? 0.9 : 0);
  if (h.t > 0.85) l = 3.8 + (h.t - 0.85) * 9;
  set(x, y, q(LAVA, l), 'horn'); });

// ---- eyes: every pixel placed ----
const put = (ox, oy, rows, pal) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') set(ox + i, oy + j, pal[ch], 'eye'); }));
const AMBER = { k: INK, d: '#8a2a0c', o: '#e8641a', y: '#ffc43a', w: '#fff4c0', b: BONE[0] };
// near eye: a brow ridge over it, the goat's bar of a pupil, a hot glint
put(15, 20, ['bbbbb.', '.kkkkk', 'kwyyok', 'kkkkkd', 'kooodk', '.kkkk.'], AMBER);
// far eye, turned away: narrower
put(26, 20, ['bbb', 'kkk', 'yok', 'kkk', 'odk'], AMBER);
// THE ORACLE: upright, a little toward the far side of the brow
put(21, 13, ['.e.', 'ewe', 'wIw', 'IpI', 'IpH', 'ewe', '.e.'], { e: EYE.edge, w: EYE.white, I: EYE.iris, H: EYE.irisHi, p: EYE.pupil });
// nostril and the open mouth
set(34, 32, INK, 'head'); set(33, 31, '#5a3a30', 'head');
for (const [x, y] of [[28, 36], [29, 36], [30, 36], [31, 36], [32, 35], [33, 35]]) set(x, y, '#2a1210', 'head');

// ---- acid: froth at the lips, the breath rolling out down and right, drips ----
const PUFFS = [[34.5, 38, 3], [38.5, 39.5, 3.2], [34, 41.5, 2.3], [41.5, 42, 2.4], [37.5, 43, 2.1]];
each((x, y, u, v) => {
  let best = null; for (const [px, py, pr] of PUFFS) { const d = Math.hypot(u - px, v - py) / pr; if (d <= 1 && (!best || d < best.k)) best = { k: d, dy: (v - py) / pr, dx: (u - px) / pr }; }
  if (!best) return;
  const l = 2.4 - best.dy * 1.3 - best.dx * 0.5 - (best.k > 0.75 ? 0.9 : 0);
  set(x, y, q(VEN, l), 'acid');
});
for (const [x, y, c] of [[29, 37, 3], [30, 37, 4], [31, 37, 3], [32, 36, 4], [33, 36, 3], [28, 37, 2]]) set(x, y, VEN[c], 'acid');
for (const [x, y0, len] of [[29, 38, 3], [31, 38, 4], [36, 44, 2], [40, 43, 3]]) { for (let k = 0; k < len; k++) set(x, y0 + k, VEN[k === len - 1 ? 4 : 2], 'acid'); }

// ---- outline: ink round the silhouette; the horns' roots dark where they sit on the skull ----
const shape = grid.map((g) => !!g);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  if (shape[y * N + x]) continue;
  const X = x - OX, Y = y - OY;
  if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([i, j]) => { const xx = x + i, yy = y + j; return xx >= 0 && yy >= 0 && xx < N && yy < N && shape[yy * N + xx]; })) set(X, Y, INK, 'ink');
}
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const g = at(x, y); if (!g || !g.part.startsWith('horn')) continue;
  if ([[1, 0], [-1, 0], [0, 1]].some(([i, j]) => { const o = at(x + i, y + j); return o && (o.part === 'head' || o.part === 'ear'); })) grid[y * N + x] = { c: LAVA[0], part: g.part };
}

// ---- flames off both tips ----
const FLAME = ['.1.', '121', '232', '343'];
for (const h of [HORNS.far, HORNS.near]) { const [tx, ty] = bez(h.p, 1);
  FLAME.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') set(Math.round(tx) - 1 + i, Math.round(ty) - 5 + j, LAVA[+ch + 1], 'flame'); })); }

// ---- behind him: flat bands of a fire below the frame, a few embers, red round the horns ----
const px = new Array(N * N);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const g = grid[y * N + x]; if (g) { px[y * N + x] = g.c; continue; }
  const X = x - OX, Y = y - OY;
  const glow = 1 - Math.hypot(x + 0.5 - C, (y + 0.5 - 54) * 0.9) / 34;
  let c = BG; void glow;
  let near = 99; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const o = get(X + i, Y + j); if (o && (o.part.startsWith('horn') || o.part === 'flame')) near = Math.min(near, Math.hypot(i, j)); }
  if (near <= 1.5) c = '#3a0d06';
  let acid = 99; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const o = get(X + i, Y + j); if (o && o.part === 'acid') acid = Math.min(acid, Math.hypot(i, j)); }
  if (acid <= 1.5) c = '#132a0c';
  if (hash(x, y) > 0.975 && y > 12) c = hash(y, x) > 0.5 ? '#ffc43a' : '#e8641a';
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
png(15, path.join(__dirname, 'icon-780.png'));
png(20, path.join(__dirname, 'icon-1040.png'));
console.log('written');
