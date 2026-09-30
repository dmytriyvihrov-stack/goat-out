// node render.cjs [zoom] → sheet.png: every facing of the pig (rows, 0 S .. 7 SE) by every frame
// (standing, the trot, the two chew frames of rooting) at `zoom`x nearest-neighbour, on the dark of
// the game; the last row is the side view at world size beside the horse, 4 screen px a world px,
// for scale.
const fs = require('fs'), { Img, text } = require('../pixel-claude-2026-09-24/png.cjs');
const G = require('../../js/pig-pixels.js'), Hs = require('../../js/horse-pixels.js');

const toImg = (g, flip) => { const im = new Img(g.w, g.h); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(flip ? g.w - 1 - x : x, y); if (c) im.fill(x, y, 1, 1, c); } return im; };
const Z = +(process.argv[2] || 8), pad = 16, cw = G.W * Z, ch = G.H * Z + 18, names = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
const cols = 1 + 4 + 2, S = 4, scaleH = Math.ceil(Hs.H * Hs.TX * S) + 30;
const img = new Img(pad + cols * (cw + pad) + 40, pad + 8 * (ch + pad) + scaleH + pad, '#2b2622');
for (let d = 0; d < 8; d++) {
  const y = pad + d * (ch + pad), kind = G.VIEWS[d][0], cells = [['idle', 0, 'stand', 0]];
  for (let f = 1; f <= G.FRAMES[kind]; f++) cells.push(['idle', f, 'trot ' + f, f]);
  for (let f = 0; f < G.FRAMES.eat; f++) cells.push(['eat', f, 'eat ' + (f + 1), 5 + f]);
  text(img, names[d], 4, y + 4, '#d8ccb0', 2);
  cells.forEach(([pose, f, label, col]) => {
    const sp = G.sprite(d, pose, f), g = sp.g, x = pad + 24 + col * (cw + pad);
    img.blit(toImg(g, sp.flip), 0, 0, g.w, g.h, x, y, g.w * Z, g.h * Z);
    img.fill(x, y + G.FOOT * Z, g.w * Z, 1, '#5a4d40');   // the ground line: his soles stand on it
    text(img, label, x, y + g.h * Z + 6, '#d8ccb0', 1);
  });
}
// scale strip: pig side (standing, a trot, rooting) and the horse side, each at its world size
const y0 = pad + 8 * (ch + pad) + scaleH - 20;
let x = pad + 24;
for (const [sp, k, foot, label] of [[G.sprite(2, 'idle', 0), G.TX, G.FOOT, 'pig'], [G.sprite(2, 'idle', 1), G.TX, G.FOOT, 'trot'], [G.sprite(2, 'eat', 0), G.TX, G.FOOT, 'eat'], [G.sprite(1, 'idle', 0), G.TX, G.FOOT, 'sw'], [Hs.sprite(2, 'idle', 0), Hs.TX, Hs.FOOT, 'horse']]) {
  const g = sp.g, w = Math.round(g.w * k * S), h = Math.round(g.h * k * S);
  img.blit(toImg(g, sp.flip), 0, 0, g.w, g.h, x, Math.round(y0 - foot * k * S), w, h, true);
  text(img, label, x, y0 + 6, '#d8ccb0', 1); x += w + pad;
}
img.fill(pad, y0, x - pad, 1, '#5a4d40');
fs.writeFileSync(__dirname + '/sheet.png', img.png());
// measured: each view's drawn extent in world px
const box = (g) => { let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.get(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x1 - x0 + 1, y1 - y0 + 1, x0, y0, x1, y1]; };
for (const [d, f, pose] of [[2, 0, 'idle'], [2, 1, 'idle'], [2, 0, 'eat'], [0, 0, 'idle'], [4, 0, 'idle'], [1, 0, 'idle'], [3, 0, 'idle']]) { const [w, h, a, b, c, e] = box(G.sprite(d, pose, f).g); console.log(names[d], pose, f, 'texels', w, 'x', h, `(${a},${b})-(${c},${e})`, 'world', (w * G.TX).toFixed(1), 'x', (h * G.TX).toFixed(1)); }
console.log('sheet.png', img.w, img.h);
