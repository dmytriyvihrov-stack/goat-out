// node render.cjs → sheet.png: every sprite at 6x, nearest-neighbour, on the dark of the game.
const fs = require('fs'), { Img, text } = require('./png.cjs'), { sprites } = require('../../js/prop-pixels.js');

const toImg = g => { const im = new Img(g.w, g.h); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(x, y); if (c) im.fill(x, y, 1, 1, c); } return im; };
const Z = +(process.argv[2] || 6), names = process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(sprites), W = 1500, pad = 16;
let x = pad, y = pad, rowH = 0; const place = [];
for (const n of names) {
  const g = sprites[n], w = Math.max(g.w * Z, n.length * 8), h = g.h * Z + 18;
  if (x + w > W - pad) { x = pad; y += rowH + pad; rowH = 0; }
  place.push([n, x, y]); x += w + pad; rowH = Math.max(rowH, h);
}
const img = new Img(W, y + rowH + pad, '#2b2622');
for (const [n, px, py] of place) { const g = sprites[n], s = toImg(g); img.blit(s, 0, 0, g.w, g.h, px, py, g.w * Z, g.h * Z); text(img, n, px, py + g.h * Z + 6, '#d8ccb0', 1); }
fs.writeFileSync(__dirname + '/sheet.png', img.png());
console.log('sheet.png', img.w, img.h);
