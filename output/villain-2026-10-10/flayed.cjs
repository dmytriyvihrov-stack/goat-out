// node flayed.cjs [zoom] → flayed.png: THE FLAYED as the game draws him (js/flayed-pixels.js, the ogre's body re-skinned), the eight
// facings standing, the slam's pose, beside the ogre himself and the Warden at world size.
const fs = require('fs'), { Img, text } = require('../pixel-claude-2026-09-24/png.cjs');
const C = require('./concepts.cjs'), FP = require('../../js/flayed-pixels.js'), OG = require('../../js/ogre-pixels.js'), WP = require('../../js/warden-pixels.js');
const Z = +(process.argv[2] || 4), pad = 14, S = 3;
const img = new Img(pad + 9 * (FP.W * Z + pad) + 20, FP.H * Z + 330, '#2b2622');
text(img, 'THE FLAYED · js/flayed-pixels.js · the eight facings, then the slam', pad, 6, '#e8d8b0', 2);
let x = pad;
const flipImg = (g, flip) => { const im = new Img(g.w, g.h); for (let y = 0; y < g.h; y++) for (let xx = 0; xx < g.w; xx++) { const c = g.get(flip ? g.w - 1 - xx : xx, y); if (c) im.fill(xx, y, 1, 1, c); } return im; };
for (let d = 0; d < 8; d++) { const sp = FP.sprite(d, 'idle', 0); img.blit(flipImg(sp.g, sp.flip), 0, 0, sp.g.w, sp.g.h, x, 30, sp.g.w * Z, sp.g.h * Z); text(img, ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'][d], x, 34 + sp.g.h * Z, '#a89a80', 2); x += sp.g.w * Z + pad; }
{ const sp = FP.sprite(0, 'up', 0); img.blit(flipImg(sp.g, sp.flip), 0, 0, sp.g.w, sp.g.h, x, 30, sp.g.w * Z, sp.g.h * Z); text(img, 'slam', x, 34 + sp.g.h * Z, '#a89a80', 2); }
const y0 = 30 + FP.H * Z + 250; x = pad;
text(img, 'AT WORLD SIZE: clubman, the Warden, the ogre, the Flayed', pad, y0 - 230, '#e8d8b0', 2);
const put = (im, k, foot, label) => { const w = Math.round(im.w * k * S), h = Math.round(im.h * k * S); img.blit(im, 0, 0, im.w, im.h, x, Math.round(y0 - foot * k * S), w, h, true); text(img, label, x, y0 + 6, '#d8ccb0', 2); x += w + pad; };
let a = C.atlasImg('clubman', 0); put(a.im, a.k, a.foot, 'man');
{ const sp = WP.sprite(0, 'idle', 0); put(flipImg(sp.g, sp.flip), 0.72, WP.FOOT + 1, 'warden'); }
const og = OG.sprite(0, 'idle', 0); put(flipImg(og.g, og.flip), 1.4, OG.FOOT, 'ogre');
const fl = FP.sprite(0, 'idle', 0); put(flipImg(fl.g, fl.flip), 1.4, FP.FOOT, 'flayed');
fs.writeFileSync(__dirname + '/flayed.png', img.png()); console.log('flayed.png', img.w, img.h);
