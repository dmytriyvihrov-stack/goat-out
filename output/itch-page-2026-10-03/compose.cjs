// node compose.cjs → header.png: the scene the game drew (tools/shots/itch-scene.png, made by scene.js
// at 3 screen px a world px) with the title laid over its top on the same grid: every mark below is one
// world px, a 3x3 block, so the letters, their edge and the blood are the game's own pixel size.
const fs = require('fs'), path = require('path'), { Img, decode } = require('../pixel-claude-2026-09-24/png.cjs'), { LOGO, SMALL, layout } = require('./font.cjs');
const K = 3, src = decode(fs.readFileSync(path.join(__dirname, '../../tools/shots/itch-scene.png')));
const W = Math.floor(src.w / K), H = Math.floor(src.h / K);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const RED = ['#2a0810', '#561019', '#8a1d23', '#b3342e', '#d65a44'], BONE = ['#3e342e', '#7e725c', '#bdb090', '#dcd1b2', '#f4eed8'], INK = '#120406';
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

// What is laid over each world px: a colour, or a tint toward one (darkening keeps the art under it).
const over = new Array(W * H).fill(null);
const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) over[y * W + x] = { c }; };
const tint = (x, y, c, t) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const o = over[y * W + x]; if (o && o.c) o.c = mix(o.c, c, t); else over[y * W + x] = { tint: c, t: Math.min(0.9, (o ? o.t : 0) + t) }; };
const solid = (x, y) => { const o = over[y * W + x]; return o && o.c; };

const CX = Math.round(W / 2), words = [[layout(LOGO, 'DOOMED', 2), 7], [layout(LOGO, 'GOAT', 2), 35]];
const tag = layout(SMALL, 'BREAK THE BARS AND GO GET THEM', 1), ty = 64;
const masks = words.map(([m, y]) => ({ m, x: Math.round(CX - m.w / 2), y }));
const on = (x, y) => masks.some((k) => k.m.on(x - k.x, y - k.y));
// the triangle sigil, a world px thick, either side of the shorter word
const sig = new Set();
const tri = (cx, top, h) => { for (let y = 0; y < h; y++) { const half = (y / (h - 1)) * h * 0.55; for (let x = -Math.ceil(half) - 1; x <= Math.ceil(half) + 1; x++) if (Math.abs(Math.abs(x) - half) < 0.8 || y === h - 1) sig.add((cx + x) + ',' + (top + y)); } sig.add(cx + ',' + (top + Math.round(h * 0.64))); };
const g = masks[1]; tri(g.x - 12, g.y + 5, 14); tri(g.x + g.m.w + 11, g.y + 5, 14);
const tx = Math.round(CX - tag.w / 2);
const any = (x, y) => on(x, y) || sig.has(x + ',' + y) || tag.on(x - tx, y - ty);

// the dark the title stands in: deepest behind the words, stepped and dithered out like the game's light
for (let y = 0; y < 86; y++) for (let x = 0; x < W; x++) {
  const d = Math.hypot((x - CX) / 128, (y - 34) / 50) + ((x + y) % 2 ? 0.05 : -0.05);
  if (d < 1) tint(x, y, '#07040a', d < 0.5 ? 0.62 : d < 0.75 ? 0.45 : 0.25);
}
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!any(x, y) && any(x - 1, y - 2)) tint(x, y, '#000000', 0.7);
for (let y = 0; y < 80; y++) for (let x = 0; x < W; x++) { if (any(x, y)) continue; let n = false; for (let j = -1; j <= 1 && !n; j++) for (let i = -1; i <= 1; i++) if (any(x + i, y + j)) { n = true; break; } if (n) set(x, y, INK); }
for (const k of masks) for (let y = 0; y < k.m.h; y++) for (let x = 0; x < k.m.w; x++) {
  if (!k.m.on(x, y)) continue;
  const f = y / k.m.h, d = (x + y) % 2;
  let c = f < 0.3 ? BONE[3] : f < 0.38 ? (d ? BONE[3] : BONE[2]) : f < 0.64 ? BONE[2] : f < 0.72 ? (d ? BONE[2] : BONE[1]) : BONE[1];
  if (!k.m.on(x, y - 1)) c = BONE[4]; else if (!k.m.on(x - 1, y)) c = mix(c, BONE[4], 0.4);
  if (!k.m.on(x, y + 1)) c = BONE[0]; else if (!k.m.on(x + 1, y)) c = mix(c, BONE[0], 0.4);
  if (hash(x + k.x, y * 7 + k.y) < 0.04) c = mix(c, BONE[0], 0.5);
  set(k.x + x, k.y + y, c);
}
for (const s of sig) { const [x, y] = s.split(',').map(Number); set(x, y, sig.has(x + ',' + (y - 1)) ? BONE[2] : BONE[4]); }
for (let y = 0; y < tag.h; y++) for (let x = 0; x < tag.w; x++) if (tag.on(x, y)) set(tx + x, ty + y, y < 2 ? '#f0c050' : '#d09a2a');
// old blood: splashes on the faces, runs off the bottoms of the strokes, a drop at each end
const all = []; for (const k of masks) for (let y = 0; y < k.m.h; y++) for (let x = 0; x < k.m.w; x++) if (k.m.on(x, y)) all.push([k.x + x, k.y + y]);
for (let n = 0; n < 5; n++) { const [px, py] = all[Math.floor(hash(n * 31, 17) * all.length)]; for (let j = -1; j <= 1; j++) for (let i = -2; i <= 2; i++) if ((i / 2.2) ** 2 + (j / 1.4) ** 2 + hash(px + i, py + j) * 0.5 < 1 && on(px + i, py + j)) set(px + i, py + j, i === 0 && j === 0 ? RED[3] : RED[2]); }
for (const k of masks) for (let x = 0; x < k.m.w; x++) for (let y = 0; y < k.m.h; y++) {
  if (!k.m.on(x, y) || k.m.on(x, y + 1) || hash(k.x + x, 91) > 0.09) continue;
  const X = k.x + x, Y = k.y + y;
  let L = 2 + Math.floor(hash(X, Y) * 5); for (let j = 1; j <= L + 2; j++) if (on(X, Y + j)) { L = j - 3; break; }   // never runs onto the next word
  if (L < 1) continue;
  set(X, Y, RED[2]); set(X, Y - 1, RED[2]);
  for (let j = 1; j <= L; j++) set(X, Y + j, j < 2 ? RED[3] : RED[2]);
  set(X, Y + L + 1, RED[1]); set(X, Y + L, RED[4]);
}

const out = new Img(src.w, src.h); out.data = Buffer.from(src.data);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const o = over[y * W + x]; if (!o) continue;
  const c = o.c ? hex(o.c) : hex(o.tint), t = o.c ? 1 : o.t;
  for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) { const p = ((y * K + j) * src.w + x * K + i) * 4; for (let n = 0; n < 3; n++) out.data[p + n] = Math.round(out.data[p + n] + (c[n] - out.data[p + n]) * t); out.data[p + 3] = 255; }
}
fs.writeFileSync(path.join(__dirname, 'header.png'), out.png());
console.log('header.png', out.w, out.h);
