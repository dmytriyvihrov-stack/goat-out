// node page.cjs → the itch page's smaller art, every pixel on the header's grid (2 screen px a texel):
//   bg.png          a seamless tile of the hall's purple brick, darkened, an old sigil and old blood on it
//   h-<name>.png    section headings: a red cult cloth hung sideways, swallow tails, gold trim, bone letters
//   divider.png     a row of the game's small signs: skull, sigil, drop, flame, soul, grass, horn
//   bg-motifs.png   a seamless tile of those signs scattered faint on the dark (the reference's confetti)
//   hook.png        the goat's portrait out of the header with a word bubble
//   discord.png     the server's goat in a round frame beside a violet cloth
//   h-thanks.png    the last cloth
const fs = require('fs'), { Img, decode } = require('../pixel-claude-2026-09-24/png.cjs'), { SMALL, layout } = require('./font.cjs');
const K = 2;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const RED = ['#2a0810', '#561019', '#8a1d23', '#b3342e', '#d65a44'], BONE = ['#3e342e', '#7e725c', '#bdb090', '#dcd1b2', '#f4eed8'];
const GOLD = ['#4a2c08', '#8a5a14', '#d09a2a', '#f0c050'], INK = '#120406';

// A canvas of hex strings (null = clear) written out at K.
class Pic {
  constructor(w, h) { this.w = w; this.h = h; this.px = new Array(w * h).fill(null); }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c; }
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y * this.w + x] : null; }
  tint(x, y, c, t) { const o = this.get(x, y); if (o) this.set(x, y, mix(o, c, t)); }
  save(name, K = 2) {
    const buf = Buffer.alloc(this.w * this.h * 4);
    this.px.forEach((c, i) => { if (!c) return; const [r, g, b] = hex(c); buf.set([r, g, b, 255], i * 4); });
    const out = new Img(this.w * K, this.h * K);
    out.blit({ w: this.w, h: this.h, data: buf }, 0, 0, this.w, this.h, 0, 0, this.w * K, this.h * K);
    fs.writeFileSync(__dirname + '/' + name, out.png());
    console.log(name, out.w, out.h);
  }
}
// Edge everything drawn in INK, then letters in bone with their own edge and a shadow down-right.
const edge = (p) => { const add = []; for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (!p.get(x, y)) for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (p.get(x + i, y + j)) { add.push([x, y]); break; } for (const [x, y] of add) p.set(x, y, INK); };
function letters(p, m, ox, oy, ramp = BONE) {
  const on = (x, y) => m.on(x - ox, y - oy);
  for (let y = oy - 2; y < oy + m.h + 4; y++) for (let x = ox - 2; x < ox + m.w + 4; x++) if (!on(x, y) && on(x - 1, y - 2)) p.tint(x, y, '#000000', 0.6);
  for (let y = oy - 1; y <= oy + m.h; y++) for (let x = ox - 1; x <= ox + m.w; x++) { if (on(x, y)) continue; let n = false; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) n = n || on(x + i, y + j); if (n) p.set(x, y, INK); }
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.on(x, y)) { const f = y / m.h; p.set(ox + x, oy + y, !m.on(x, y - 1) ? ramp[4] : !m.on(x, y + 1) ? ramp[1] : f < 0.5 ? ramp[3] : ramp[2]); }
}
const sigil = (p, cx, top, h, c = BONE[3]) => {
  for (let y = 0; y < h; y++) { const half = (y / (h - 1)) * h * 0.55; for (let x = -Math.ceil(half) - 1; x <= Math.ceil(half) + 1; x++) if (Math.abs(Math.abs(x) - half) < 0.9 || y === h - 1) p.set(cx + x, top + y, c); }
  p.set(cx, top + Math.round(h * 0.64), c);
};

// ---------------------------------------------------------------- the brick tile
{
  const W = 240, H = 220, p = new Pic(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const row = Math.floor(y / 11), sh = (row % 2) * 12, bx = (x + sh) % 24, by = y % 11, id = Math.floor((x + sh) / 24) % 10;
    const v = hash(id, row % 20), base = v < 0.33 ? '#1d1720' : v < 0.66 ? '#211a24' : '#1b1620';
    let c = base;
    if (by === 10 || bx === 23) c = '#0f0b11';
    else if (by === 0 || bx === 0) c = mix(base, '#6a5670', 0.16);
    else if (by === 9 || bx === 22) c = mix(base, '#000000', 0.25);
    else if (hash(x, y) < 0.06) c = mix(base, '#000000', 0.18);
    if (v > 0.965 && by > 0 && by < 10 && bx > 0 && bx < 23) c = '#0c090e';
    p.set(x, y, c);
  }
  // an old sigil daubed on the stone, half worn away, and a splash of old blood under another spot
  for (let k = 0; k < 2; k++) { const s = new Pic(30, 30); sigil(s, 15, 2, 24, '#4a1418'); s.px.forEach((c, i) => { const x = i % 30, y = (i / 30) | 0; if (c && hash(x + k * 50, y) > 0.3) p.set([52, 176][k] + x, [40, 140][k] + y, c); }); }
  for (const [x0, y0, r] of [[150, 60, 6], [30, 170, 4]]) for (let j = -r * 2; j <= r * 3; j++) for (let i = -r; i <= r; i++) { const d = (i / r) ** 2 + (j / (r * 1.4)) ** 2; if ((d < 1 && hash(x0 + i, y0 + j) < 0.75) || (j > 0 && Math.abs(i - (x0 % 3) + 1) < 1 && j < r * 3 * hash(i, x0))) p.set(x0 + i, y0 + j, hash(i, j) < 0.5 ? '#2c0b0f' : '#3a0d12'); }
  p.save('bg.png');
}

// ---------------------------------------------------------------- section cloths
function cloth(name, label) {
  const m = layout(SMALL, label, 2, 1), W = Math.max(300, m.w + 116), H = 40, p = new Pic(W, H);
  const wave = (x) => Math.round(Math.sin(x / 23) * 1.2);
  // the tails behind, lower and darker, a notch cut out of each end
  for (const side of [0, 1]) for (let i = 0; i < 40; i++) {
    const x = side ? W - 1 - i : i, notch = Math.abs(i < 12 ? (12 - i) : 0);
    for (let y = 12 + wave(x); y < 38 + wave(x); y++) {
      const mid = 25 + wave(x); if (Math.abs(y - mid) < notch * 0.9) continue;
      p.set(x, y, y < 14 + wave(x) ? RED[2] : y > 35 + wave(x) ? RED[0] : RED[1]);
    }
  }
  // where the cloth folds behind the body: a dark wedge
  for (const side of [0, 1]) for (let j = 0; j < 8; j++) for (let i = 0; i <= j; i++) p.set(side ? W - 41 + i : 40 - i, 30 + j + wave(40), RED[0]);
  // the body
  for (let x = 32; x < W - 32; x++) for (let y = 4 + wave(x); y < 32 + wave(x); y++) {
    const r = y - wave(x);
    let c = r < 6 ? RED[3] : r > 29 ? RED[0] : r > 27 ? RED[1] : RED[2];
    if ((x + 9) % 37 === 0 && r > 6 && r < 28) c = mix(RED[2], RED[0], 0.45);           // the folds
    if ((x + 10) % 37 === 0 && r > 6 && r < 28) c = RED[3];
    if (r === 7 || r === 26) c = (x % 3) ? GOLD[2] : GOLD[1];                          // the trim
    p.set(x, y, c);
  }
  edge(p);
  const ox = Math.round(W / 2 - m.w / 2), oy = 18 - Math.round(m.h / 2) + wave(W / 2);
  letters(p, m, ox, oy);
  sigil(p, ox - 14, oy + 1, 12, BONE[3]); sigil(p, ox + m.w + 13, oy + 1, 12, BONE[3]);
  p.save('h-' + name + '.png');
}
for (const [n, l] of [['thanks', 'THANKS FOR PLAYING'], ['story', 'THE STORY'], ['features', 'WHAT YOU DO'], ['allies', 'YOUR ALLIES'], ['playtest', 'HELP THE GOAT'], ['discord', 'JOIN THE HERD'], ['inspired', 'INSPIRED BY']]) cloth(n, l);


// ---------------------------------------------------------------- the small signs
// Each is rows of letters: one letter a colour, '.' clear. Edged in INK by `edge` wherever they land.
const SIGNS = {
  skull: { c: { a: BONE[4], b: BONE[2], k: '#1a1012', h: '#c9a24a' }, r: ['h.......h', 'hh.aaa.hh', '.haaaaah.', '.aaaaaaa.', 'aakaaakaa', 'aakkakkab', '.aaaaaab.', '..akakb..', '..abbbb..'] },
  sigil: { c: { a: BONE[3] }, r: ['....a....', '...a.a...', '...a.a...', '..a...a..', '..a.a.a..', '.a.....a.', '.a.....a.', 'aaaaaaaaa'] },
  drop: { c: { a: RED[2], b: RED[3], c: RED[4], d: RED[1] }, r: ['...a...', '...a...', '..aba..', '..aba..', '.abbaa.', '.acbaad', 'aabaaad', '.aaaad.', '..ddd..'] },
  flame: { c: { a: '#c2410f', b: '#ffa53a', c: '#ffe08a' }, r: ['...a....', '..aa..a.', '..aba.a.', '.abba.aa', '.abcbaba', 'aabccbba', 'abcccbba', '.abccba.', '..aaaa..'] },
  soul: { c: { a: '#4b2f80', b: '#8d6fcc', c: '#ecd8ff' }, r: ['...a.....', '..ab.....', '..abba...', '.abcba...', '.abccba..', 'abcccba..', 'abccba...', '.abba....', '..aa.....'] },
  grass: { c: { a: '#5e7a2a', b: '#9fc24a', c: '#f0e8a0' }, r: ['.b...b...', '.b.c.b..b', 'ab.b.ab.b', 'ab.ba.bab', '.abab.ab.', '.ababab..', '..abab...', '..aaaa...'] },
  horn: { c: { a: '#c2410f', b: '#ff7a2a', c: '#ffe08a' }, r: ['.....aa..', '....abba.', '...abca..', '...abba..', '..abba...', '..abba...', '.abba....', '.aba.....', 'aba......'] },
};
const stamp = (p, name, x0, y0) => { const S = SIGNS[name]; S.r.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') p.set(x0 + x, y0 + y, S.c[ch]); })); };
{
  const W = 200, H = 18, order = ['skull', 'sigil', 'drop', 'flame', 'soul', 'grass', 'horn', 'sigil', 'skull'], p = new Pic(W, H);
  const step = 22, x0 = Math.round(W / 2 - (order.length - 1) * step / 2);
  order.forEach((n, i) => { const S = SIGNS[n]; stamp(p, n, x0 + i * step - Math.floor(S.r[0].length / 2), 9 - Math.floor(S.r.length / 2)); });
  edge(p); p.save('divider.png', 3);
}
{
  // a tile: the signs on a jittered grid, drawn wrapped so the tile joins on every side
  const W = 240, H = 240, p = new Pic(W, H), names = Object.keys(SIGNS);
  for (let i = 0; i < W * H; i++) { const x = i % W, y = (i / W) | 0; p.px[i] = hash(x * 7, y * 3) < 0.035 ? '#181015' : '#140d12'; }
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    const n = names[Math.floor(hash(gx * 13, gy * 7) * names.length)], S = SIGNS[n];
    const x = gx * 40 + (gy % 2) * 20 + Math.floor(hash(gx, gy) * 14), y = gy * 40 + Math.floor(hash(gy, gx * 5) * 14);
    S.r.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') p.set((x + i) % W, (y + j) % H, mix(S.c[ch], '#140d12', 0.62)); }));
  }
  p.save('bg-motifs.png', 3);
}

// ---------------------------------------------------------------- the hook
const pick = (img, x, y, k) => { const i = ((y * k) * img.w + x * k) * 4; return '#' + [0, 1, 2].map((n) => img.data[i + n].toString(16).padStart(2, '0')).join(''); };
{
  const W = 300, H = 92, p = new Pic(W, H), hd = decode(fs.readFileSync(__dirname + '/../../tools/shots/itch-goat.png'));   // scene.js: ITCH_SCENE('itch-goat', ...) at 4x
  // the portrait: the game's own goat, a square round him, in an iron frame
  const PX = 6, PY = 4, S = 84, sx = 50, sy = 58;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(PX + x, PY + y, pick(hd, sx + x, sy + y, 2));
  for (let i = -2; i < S + 2; i++) for (const [x, y] of [[PX + i, PY - 1], [PX + i, PY + S], [PX - 1, PY + i], [PX + S, PY + i]]) p.set(x, y, '#6e6e7a');
  for (let i = -2; i < S + 2; i++) for (const [x, y] of [[PX + i, PY - 2], [PX + i, PY + S + 1], [PX - 2, PY + i], [PX + S + 1, PY + i]]) p.set(x, y, '#45444f');
  for (const [x, y] of [[PX - 3, PY - 3], [PX + S, PY - 3], [PX - 3, PY + S], [PX + S, PY + S]]) for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) p.set(x + i, y + j, i + j === 1 ? '#a8aab6' : '#28272f');
  // the bubble, its tail at his mouth
  const BX = 112, BY = 8, BW = 182, BH = 72;
  for (let y = BY; y < BY + BH; y++) for (let x = BX; x < BX + BW; x++) {
    const dx = Math.min(x - BX, BX + BW - 1 - x), dy = Math.min(y - BY, BY + BH - 1 - y);
    if (dx < 3 && dy < 3 && Math.hypot(3 - dx, 3 - dy) > 3.2) continue;
    p.set(x, y, dy < 3 && y > BY + 10 ? BONE[2] : BONE[4]);
  }
  for (let j = 0; j < 12; j++) for (let i = 0; i <= 12 - j; i++) p.set(BX - 1 - i + j, BY + 42 + j, BONE[4]);
  edge(p);
  ['THEY TOOK', 'MY WIFE.', 'I HAVE HORNS.'].forEach((l, i) => { const m = layout(SMALL, l, 2, 1), ox = BX + Math.round(BW / 2 - m.w / 2), oy = BY + 6 + i * 21; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.on(x, y)) p.set(ox + x, oy + y, i === 2 ? RED[2] : INK); });
  p.save('hook.png');
}

// ---------------------------------------------------------------- the discord button
{
  const W = 300, H = 64, p = new Pic(W, H), ic = decode(fs.readFileSync(__dirname + '/../discord-icon-2026-09-28/icon-final.png'));
  const R = 28, CX = 40, CY = 32, f = ic.w / (R * 2);
  for (let y = -R; y < R; y++) for (let x = -R; x < R; x++) if (Math.hypot(x + 0.5, y + 0.5) < R) p.set(CX + x, CY + y, pick(ic, Math.floor((x + R + 0.5) * f), Math.floor((y + R + 0.5) * f), 1));
  for (let a = 0; a < 720; a++) { const t = a / 720 * Math.PI * 2; for (const [r, c] of [[R, '#8d6fcc'], [R + 1, '#4b2f80']]) p.set(CX + Math.cos(t) * r, CY + Math.sin(t) * r, c); }
  const VI = ['#1a0e2c', '#2f1c52', '#4b2f80', '#6849a8', '#8d6fcc'];
  for (let x = 74; x < 290; x++) for (let y = 14; y < 50; y++) { const r = y - 14; p.set(x, y, r < 3 ? VI[4] : r > 32 ? VI[1] : r === 6 || r === 29 ? ((x % 3) ? GOLD[2] : GOLD[1]) : VI[3]); }
  edge(p);
  const m = layout(SMALL, 'JOIN ON DISCORD', 2, 1); letters(p, m, Math.round(182 - m.w / 2), 25);
  p.save('discord.png');
}
