// node zoom.cjs → zoom.png: the three robes of js/shaman-pixels.js large (front, diagonal, side, back, the two casts),
// the atlas mage and clubman at the same texel size on the left of each row to hold them to one look.
const fs = require('fs'), { decode, Img } = require('../pixel-claude-2026-09-24/png.cjs');
const S = require('../../js/shaman-pixels.js');
const src = fs.readFileSync(__dirname + '/../../js/pixel-assets.js', 'utf8');
const A = JSON.parse(src.match(/const PIXEL_ASSETS = (\{.*?\});/s)[1].replace(/"image":"data:image\/png;base64,[^"]*"/, '"image":""'));
const at = decode(Buffer.from(src.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)[1], 'base64'));
const Z = 6, pad = 10, cells = [[0, 'idle'], [1, 'idle'], [2, 'idle'], [3, 'idle'], [4, 'idle'], [0, 'raise'], [2, 'call']];
const ch = (S.H + S.UP) * Z, cw = S.W * Z;
const img = new Img(Math.round(pad + 2 * 100 * Z / 3) + cells.length * (cw + pad) + 40, pad + 3 * (ch + pad), '#2b2622');
for (let look = 0; look < 3; look++) {
  const y0 = pad + look * (ch + pad); let x = pad;
  // the cast: an atlas px is a third of a texel; drawn so a texel is Z px, feet on the shaman's sole row
  for (const u of ['mage', 'clubman']) {
    const f = A.units[u].idle[0], k = Z / 3;
    for (let j = 0; j < f[3]; j++) for (let i = 0; i < f[2]; i++) { const q = ((f[1] + j) * at.w + f[0] + i) * 4; if (at.data[q + 3] < 128) continue;
      img.fill(Math.round(x + i * k), Math.round(y0 + (S.FOOT + S.UP) * Z - f[5] * k + j * k), Math.ceil(k), Math.ceil(k), '#' + [0, 1, 2].map((o) => at.data[q + o].toString(16).padStart(2, '0')).join('')); }
    x += f[2] * k + pad;
  }
  for (const [d, pose] of cells) {
    const sp = S.sprite(d, look, 0, pose, pose === 'raise' ? 1 : 0, d === 1 ? 1 : 0), g = sp.g;
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const c = g.get(sp.flip ? g.w - 1 - i : i, j); if (c) img.fill(x + i * Z, y0 + j * Z, Z, Z, c); }
    x += cw + pad;
  }
}
fs.writeFileSync(__dirname + '/zoom.png', img.png()); console.log(img.w, img.h);
