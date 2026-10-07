// node eat.cjs [zoom] → eat.png: every facing standing beside both frames of grazing (`eat`, 7 Oct 2026).
const { Img, text } = require('../pixel-claude-2026-09-24/png.cjs');
const H = require('../../js/horse-pixels.js');
const toImg = (g, flip) => { const im = new Img(g.w, g.h); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(flip ? g.w - 1 - x : x, y); if (c) im.fill(x, y, 1, 1, c); } return im; };
const Z = +(process.argv[2] || 5), pad = 12, cw = H.W * Z, ch = H.H * Z + 14;
const img = new Img(pad + 3 * (cw + pad) + 30, pad + 8 * (ch + pad), '#2b2622');
for (let d = 0; d < 8; d++) [['idle', 0], ['eat', 0], ['eat', 1]].forEach(([pose, f], i) => {
  const sp = H.sprite(d, pose, f), g = sp.g, x = pad + 24 + i * (cw + pad), y = pad + d * (ch + pad);
  img.blit(toImg(g, sp.flip), 0, 0, g.w, g.h, x, y, g.w * Z, g.h * Z);
  img.fill(x, y + H.FOOT * Z, g.w * Z, 1, '#5a4d40');
  if (!i) text(img, String(d), 4, y + 4, '#d8ccb0', 2);
});
require('fs').writeFileSync(__dirname + '/eat.png', img.png());
