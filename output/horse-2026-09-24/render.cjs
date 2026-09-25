// node render.cjs [zoom] → sheet.png: every facing of the horse (rows, 0 S .. 7 SE) by every frame
// (standing, the gallop or trot, the kick) at `zoom`x nearest-neighbour, on the dark of the game;
// the last row is the side view at world size beside the ogre, 4 screen px a world px, for scale.
const fs = require('fs'), { Img, text } = require('../pixel-claude-2026-09-24/png.cjs');
const H = require('../../js/horse-pixels.js'), O = require('../../js/ogre-pixels.js');

const toImg = (g, flip) => { const im = new Img(g.w, g.h); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(flip ? g.w - 1 - x : x, y); if (c) im.fill(x, y, 1, 1, c); } return im; };
const Z = +(process.argv[2] || 6), pad = 16, cw = H.W * Z, ch = H.H * Z + 18, names = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
const cols = 1 + 4 + 1, S = 4, scaleH = Math.ceil(Math.max(O.H * 1.4, H.H * H.TX) * S) + 30;
const img = new Img(pad + cols * (cw + pad) + 40, pad + 8 * (ch + pad) + scaleH + pad, '#2b2622');
for (let d = 0; d < 8; d++) {
  const y = pad + d * (ch + pad), kind = H.VIEWS[d][0], cells = [['idle', 0, 'stand']];
  for (let f = 1; f <= H.FRAMES[kind]; f++) cells.push(['idle', f, (kind === 'side' ? 'gallop ' : 'trot ') + f]);
  cells.push(['kick', 0, 'kick']);
  text(img, names[d], 4, y + 4, '#d8ccb0', 2);
  cells.forEach(([pose, f, label], i) => {
    const sp = H.sprite(d, pose, f), g = sp.g, x = pad + 24 + (i === cells.length - 1 ? cols - 1 : i) * (cw + pad);
    img.blit(toImg(g, sp.flip), 0, 0, g.w, g.h, x, y, g.w * Z, g.h * Z);
    img.fill(x, y + H.FOOT * Z, g.w * Z, 1, '#5a4d40');   // the ground line: his soles stand on it
    text(img, label, x, y + g.h * Z + 6, '#d8ccb0', 1);
  });
}
// scale strip: horse side (standing and a gallop) and the ogre side, both at their world size
const y0 = pad + 8 * (ch + pad) + scaleH - 20;
let x = pad + 24;
for (const [sp, k, label] of [[H.sprite(2, 'idle', 0), H.TX, 'horse'], [H.sprite(2, 'idle', 1), H.TX, 'gallop'], [H.sprite(2, 'kick', 0), H.TX, 'kick'], [O.sprite(2, 'idle', 0), 1.4, 'ogre']]) {
  const g = sp.g, w = Math.round(g.w * k * S), h = Math.round(g.h * k * S), foot = (label === 'ogre' ? O.FOOT : H.FOOT) * k * S;
  img.blit(toImg(g, sp.flip), 0, 0, g.w, g.h, x, Math.round(y0 - foot), w, h, true);
  text(img, label, x, y0 + 6, '#d8ccb0', 1); x += w + pad;
}
img.fill(pad, y0, x - pad, 1, '#5a4d40');
fs.writeFileSync(__dirname + '/sheet.png', img.png());
// measured: the side view's drawn extent in world px
const box = (g) => { let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.get(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x1 - x0 + 1, y1 - y0 + 1]; };
for (const [d, f, pose] of [[2, 0, 'idle'], [2, 1, 'idle'], [2, 0, 'kick'], [0, 0, 'idle'], [4, 0, 'idle'], [1, 0, 'idle']]) { const [w, h] = box(H.sprite(d, pose, f).g); console.log(names[d], pose, f, 'texels', w, 'x', h, 'world', (w * H.TX).toFixed(1), 'x', (h * H.TX).toFixed(1)); }
console.log('sheet.png', img.w, img.h);
