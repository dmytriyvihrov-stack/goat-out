// Renders every skill-rail icon of js/skill-icons.js to sheet.png, big and at chip size.
// node output/skill-icons-2026-09-24/render.cjs [scale]
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { SKILL_ICONS } = require('../../js/skill-icons.js');
const BIG = +(process.argv[2] || 10), SMALL = 2, N = SKILL_ICONS.N + 2;
const base = { headbuttRecovery: 1, rollCooldown: 1, shieldBullets: 2, screamRadius: 7 };
const V = (id, label, mods, fire) => ({ id, label, mods: Object.assign({}, base, mods), fire });
const icons = [
  V('butt', 'butt bare', {}), V('butt', 'LONG HORNS', { antlers: true }), V('butt', 'SPLASH', { splash: true }),
  V('butt', 'BOMB CHARGE', { bomb: true }), V('butt', 'bare + IRON SKULL', { headbuttRecovery: 0.5 }), V('butt', 'SPLASH + SKULL', { splash: true, headbuttRecovery: 0.5 }),
  V('grab', 'grab things', {}), V('grab', 'BY THE COLLAR', { grabMen: true }), V('grab', 'COLLAR + DEVOUR', { grabMen: true, devour: true }),
  V('grab', 'VENOM JAW', { venomHold: 2 }), V('grab', 'CHARGED', { chargeHold: 2 }), V('grab', 'COLLAR+JAW+SHIELD+COLD', { grabMen: true, shieldBullets: 4, livingShield: true, coldEye: {} }),
  V('roll', 'roll', {}), V('roll', 'DEAD WEIGHT', { rollStun: 1 }), V('roll', 'SOUR TUMBLE', { venomRoll: true }),
  V('roll', 'LEAPFROG', { leapfrog: {} }), V('roll', 'LOOSE JOINTS', { rollCooldown: 0.45 }), V('roll', 'LEAPFROG+JOINTS', { leapfrog: {}, rollCooldown: 0.45 }),
  V('scream', 'call', {}), V('scream', 'FULL THROAT', { screamStun: true }), V('scream', 'FULL THROAT + RAW', { screamStun: true, screamRadius: 13 }),
  V('scream', 'DRAGON BREATH', { breath: true }, true), V('scream', 'VENOM SPIT', { spit: true }),
];
global.BOON_BASE = { shieldBullets: 2, screamRadius: 7 };
const cols = 6, pad = 8, cellW = N * BIG + pad, rowsN = Math.ceil(icons.length / cols);
const smallH = N * SMALL + pad * 2;
const W = cols * cellW + pad, H = rowsN * (cellW + smallH) + pad;
const px = Buffer.alloc(W * H * 4);
const hex = (c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { if (i < 0 || j < 0 || i >= W || j >= H) continue; const o = (j * W + i) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255; } };
rect(0, 0, W, H, [40, 34, 36]);
icons.forEach((ic, n) => {
  const cx = pad + (n % cols) * cellW, cy = pad + Math.floor(n / cols) * (cellW + smallH);
  const cells = SKILL_ICONS.cells(SKILL_ICONS.layers(ic.id, ic.mods, ic.fire));
  rect(cx, cy, N * BIG, N * BIG, [52, 44, 46]);
  const chip = [24, 20, 22];
  rect(cx, cy + N * BIG + pad, N * SMALL + 8, N * SMALL + 8, chip);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const c = cells[j][i]; if (!c) continue;
    const rgb = hex(c);
    rect(cx + i * BIG, cy + j * BIG, BIG, BIG, rgb);
    rect(cx + 4 + i * SMALL, cy + N * BIG + pad + 4 + j * SMALL, SMALL, SMALL, rgb);
  }
  console.log(n + 1, ic.label);
});
// PNG
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const raw = Buffer.alloc((W * 4 + 1) * H); for (let j = 0; j < H; j++) px.copy(raw, j * (W * 4 + 1) + 1, j * W * 4, (j + 1) * W * 4);
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
fs.writeFileSync(path.join(__dirname, 'sheet.png'), png);
console.log('wrote', path.join(__dirname, 'sheet.png'), W + 'x' + H);
