// node crop.cjs x y w h out.png → a region of sheet.png, for a close look.
const fs = require('fs'), { Img, decode } = require('../pixel-claude-2026-09-24/png.cjs');
const [x, y, w, h] = process.argv.slice(2, 6).map(Number), out = process.argv[6];
const src = decode(fs.readFileSync(__dirname + '/sheet.png')), img = new Img(w, h);
img.blit(src, x, y, w, h, 0, 0, w, h);
fs.writeFileSync(out, img.png());
