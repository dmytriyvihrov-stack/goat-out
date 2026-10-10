// node ingame.cjs [zoom] → ingame.png: the game's own WARDEN sprite (js/warden-pixels.js): the eight facings standing, each
// pose on the front and the side, the stride, and the man at world size beside the atlas clubman and the ogre.
const fs = require('fs'), { Img, text } = require('../pixel-claude-2026-09-24/png.cjs');
const C = require('./concepts.cjs'), WP = require('../../js/warden-pixels.js'), OG = require('../../js/ogre-pixels.js');
const Z = +(process.argv[2] || 4), pad = 12, S = 3, TX = 0.72, DIRS = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
const flipImg = (g, flip) => { const im = new Img(g.w, g.h); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(flip ? g.w - 1 - x : x, y); if (c) im.fill(x, y, 1, 1, c); } return im; };
const cw = WP.W * Z + pad, ch = WP.H * Z + 24;
const img = new Img(pad + 8 * cw + 20, 30 + ch * 4 + WP.H * TX * S + 90, '#2b2622');
const row = (y, label, cells) => { text(img, label, pad, y - 14, '#e8d8b0', 2); cells.forEach(([d, pose, step, name], i) => { const sp = WP.sprite(d, pose, step); img.blit(flipImg(sp.g, sp.flip), 0, 0, sp.g.w, sp.g.h, pad + i * cw, y, sp.g.w * Z, sp.g.h * Z); text(img, name, pad + i * cw, y + WP.H * Z + 4, '#a89a80', 2); }); };
row(30, 'THE WARDEN · the eight facings, standing', DIRS.map((n, d) => [d, 'idle', 0, n]));
row(30 + ch, 'the poses on the front: idle, the hand up, the sword back, the sword out, the gun; and the stride', [[0, 'idle', 0, 'idle'], [0, 'raise', 0, 'raise'], [0, 'windup', 0, 'windup'], [0, 'swing', 0, 'swing'], [0, 'aim', 0, 'aim'], [0, 'idle', 1, 'step +'], [0, 'idle', -1, 'step -'], [1, 'raise', 0, 'SW raise']]);
row(30 + ch * 2, 'the same from the side (W) and mirrored (E)', [[2, 'idle', 0, 'W idle'], [2, 'raise', 0, 'W raise'], [2, 'windup', 0, 'W windup'], [2, 'swing', 0, 'W swing'], [2, 'aim', 0, 'W aim'], [6, 'idle', 0, 'E idle'], [6, 'windup', 0, 'E windup'], [6, 'aim', 0, 'E aim']]);
row(30 + ch * 3, 'from behind (N, NW, NE): the harness, the gun across his back, the board edge-on', [[4, 'idle', 0, 'N idle'], [4, 'raise', 0, 'N raise'], [4, 'windup', 0, 'N windup'], [4, 'aim', 0, 'N aim'], [3, 'idle', 0, 'NW idle'], [5, 'idle', 0, 'NE idle'], [3, 'swing', 0, 'NW swing'], [4, 'idle', 1, 'N step']]);
const y0 = img.h - 30; let x = pad;
const put = (im, k, foot, label) => { const w = Math.round(im.w * k * S), h = Math.round(im.h * k * S); img.blit(im, 0, 0, im.w, im.h, x, Math.round(y0 - foot * k * S), w, h, true); text(img, label, x, y0 + 6, '#d8ccb0', 2); x += w + pad; };
let a = C.atlasImg('clubman', 0); put(a.im, a.k, a.foot, 'man');
for (let d = 0; d < 8; d++) { const sp = WP.sprite(d, 'idle', 0); put(flipImg(sp.g, sp.flip), TX, WP.FOOT + 1, DIRS[d]); }
const og = OG.sprite(0, 'idle', 0); put(flipImg(og.g, og.flip), 1.4, OG.FOOT, 'ogre');
fs.writeFileSync(__dirname + '/ingame.png', img.png()); console.log('ingame.png', img.w, img.h);
