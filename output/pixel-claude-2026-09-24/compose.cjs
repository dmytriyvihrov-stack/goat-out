// node compose.cjs → compose.png: the layered props put together the way the game stacks them.
const fs = require('fs'), { Img, text } = require('./png.cjs'), { sprites: S } = require('../../js/prop-pixels.js');
const Z = 6, img = new Img(1500, 420, '#2b2622');
const put = (name, x, y) => { const g = S[name]; for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const c = g.get(i, j); if (c) img.fill((x + i) * Z, (y + j) * Z, Z, Z, c); } };
// rack + sword: the sword's crossguard just above the rail
put('rack-back', 2, 4); put('sword-up', 2 + 9, 4); put('rack-base', 2, 4);
put('rack-back', 30, 4); put('shield', 30 + 3, 4 + 1); put('rack-base', 30, 4);
put('coop-back', 58, 4); put('coop-cracked', 58, 4);
put('roast-back', 100 + 20, 4 + 22); put('roast-sticks', 100, 4); put('roast-croc', 100 + 5, 4 + 3); put('roast-front', 100 + 20, 4 + 22);
fs.writeFileSync(__dirname + '/compose.png', img.png());
