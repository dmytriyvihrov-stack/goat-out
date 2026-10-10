// node ingame.cjs [zoom] → ingame.png: the game's own WARDEN sprite (js/warden-pixels.js) in its three poses, at the
// sheet's zoom and at world size beside the atlas clubman and the ogre.
const fs = require('fs'), { Img, text } = require('../pixel-claude-2026-09-24/png.cjs');
const C = require('./concepts.cjs'), WP = require('../../js/warden-pixels.js'), OG = require('../../js/ogre-pixels.js');
const Z = +(process.argv[2] || 5), pad = 16, S = 3, TX = 0.72, poses = ['idle', 'raise', 'carry'];
const img = new Img(pad + poses.length * (WP.W * Z + pad) + 420, WP.H * Z + 150, '#2b2622');
text(img, 'THE WARDEN · js/warden-pixels.js · idle, the hand up, the platter carried', pad, 6, '#e8d8b0', 2);
let x = pad;
poses.forEach((p) => { const g = WP.sprite(p), im = C.toImg(g); img.blit(im, 0, 0, g.w, g.h, x, 30, g.w * Z, g.h * Z); text(img, p, x, 34 + g.h * Z, '#a89a80', 2); x += g.w * Z + pad; });
const y0 = 30 + WP.H * Z; x += 20;
const put = (im, k, foot, label) => { const w = Math.round(im.w * k * S), h = Math.round(im.h * k * S); img.blit(im, 0, 0, im.w, im.h, x, Math.round(y0 - foot * k * S), w, h, true); text(img, label, x, y0 + 6, '#d8ccb0', 2); x += w + pad; };
let a = C.atlasImg('clubman', 0); put(a.im, a.k, a.foot, 'man');
put(C.toImg(WP.sprite('idle')), TX, WP.FOOT + 1, 'warden');
const og = OG.sprite(0, 'idle', 0); put(C.toImg(og.g), 1.4, OG.FOOT, 'ogre');
fs.writeFileSync(__dirname + '/ingame.png', img.png()); console.log('ingame.png', img.w, img.h);
