// node atlas.cjs → atlas-cast.png: the atlas's mage, clubman and hunter (S, SW, W, N) beside the shaman at the same height,
// to hold the shaman to the cast's own look.
const fs = require('fs'), { decode, Img, text } = require('../pixel-claude-2026-09-24/png.cjs');
const src = fs.readFileSync(__dirname + '/../../js/pixel-assets.js', 'utf8');
const A = JSON.parse(src.match(/const PIXEL_ASSETS = (\{.*?\});/s)[1].replace(/"image":"data:image\/png;base64,[^"]*"/, '"image":""'));
const b64 = src.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)[1], at = decode(Buffer.from(b64, 'base64'));
const units = ['mage', 'clubman', 'hunter', 'brute'], dirs = [0, 1, 2, 4], Z = 3;
const img = new Img(dirs.length * units.length * 120 * Z / 2 + 40, 130 * Z / 1 + 40, '#2b2622');
let x = 10;
for (const u of units) for (const d of dirs) {
  const f = A.units[u] && A.units[u].idle[d]; if (!f) continue;
  for (let j = 0; j < f[3]; j++) for (let i = 0; i < f[2]; i++) {
    const k = ((f[1] + j) * at.w + f[0] + i) * 4; const a = at.data[k + 3]; if (a < 128) continue;
    img.fill(x + i * Z / 2 | 0, 10 + j * Z / 2 | 0, Math.ceil(Z / 2), Math.ceil(Z / 2), '#' + [0, 1, 2].map((o) => at.data[k + o].toString(16).padStart(2, '0')).join(''));
  }
  x += f[2] * Z / 2 + 8;
}
fs.writeFileSync(__dirname + '/atlas-cast.png', img.png()); console.log(Object.keys(A.units).join(' '), at.w, at.h);
