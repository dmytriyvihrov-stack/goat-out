// node ingame.cjs → ingame.png: js/thrower-pixels.js, every view (rows S E N W) by every pose, pulse frame 2.
const fs = require('fs'), { Img, text } = require('../pixel-claude-2026-09-24/png.cjs');
const P = require('../../js/thrower-pixels.js');
const toImg = (g) => { const im = new Img(g.w, g.h); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(x, y); if (c) im.fill(x, y, 1, 1, c); } return im; };
const Z = 4, pad = 10, cells = [['idle', 0, 2], ['walk', 1, 2], ['walk', -1, 2], ['up', 0, 2], ['punchwind', 0, 2], ['punch', 0, 2], ['throw', 0, 2], ['idle', 0, 0]];
const cw = P.W * Z, ch = (P.H + P.UP) * Z;
const img = new Img(pad + 30 + cells.length * (cw + pad), pad + 4 * (ch + 30), '#2b2622');
['S', 'E', 'N', 'W'].forEach((v, r) => {
  const y = pad + r * (ch + 30); text(img, v, 4, y + 6, '#e8d8b0', 3);
  cells.forEach(([pose, step, f], c) => {
    const g = P.sprite(v, pose, step, f), x = pad + 30 + c * (cw + pad);
    img.blit(toImg(g), 0, 0, g.w, g.h, x, y, cw, ch);
    img.fill(x, y + (P.FOOT + P.UP) * Z, cw, 1, '#5a4d40'); img.fill(Math.round(x + P.ANCHOR[v] * Z), y + (P.FOOT + P.UP) * Z - 6, 1, 12, '#c04030');
    if (!r) text(img, pose + (step ? (step > 0 ? '+' : '-') : '') + ' f' + f, x, y + ch + 4, '#a89a80', 2);
  });
});
fs.writeFileSync(__dirname + '/ingame.png', img.png()); console.log('ingame.png', img.w, img.h);
