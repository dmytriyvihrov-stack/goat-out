// node crop.cjs → mage-zoom.png: the atlas mage and clubman, front and side, large, to read their pixel grain.
const fs = require('fs'), { decode, Img } = require('../pixel-claude-2026-09-24/png.cjs');
const src = fs.readFileSync(__dirname + '/../../js/pixel-assets.js', 'utf8');
const A = JSON.parse(src.match(/const PIXEL_ASSETS = (\{.*?\});/s)[1].replace(/"image":"data:image\/png;base64,[^"]*"/, '"image":""'));
const at = decode(Buffer.from(src.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)[1], 'base64'));
const img = new Img(4 * 120 * 3, 120 * 3, '#2b2622'); let x = 0;
for (const [u, d] of [['mage', 0], ['mage', 2], ['clubman', 0], ['mage', 4]]) {
  const f = A.units[u].idle[d];
  for (let j = 0; j < f[3]; j++) for (let i = 0; i < f[2]; i++) { const k = ((f[1] + j) * at.w + f[0] + i) * 4; if (at.data[k + 3] < 128) continue; img.fill(x + i * 3, j * 3, 3, 3, '#' + [0, 1, 2].map((o) => at.data[k + o].toString(16).padStart(2, '0')).join('')); }
  x += 120 * 3;
}
fs.writeFileSync(__dirname + '/mage-zoom.png', img.png());
