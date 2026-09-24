// node crop.cjs out.png zoom name:x,y,w,h ... → each crop old | new side by side, rows stacked.
const fs = require('fs'), { decode, Img, text } = require('./png.cjs');
const [out, zs, ...specs] = process.argv.slice(2), Z = +zs, S = __dirname + '/../../tools/shots/';
const rows = specs.map(s => { const [n, r] = s.split(':'); return [n, ...r.split(',').map(Number)]; });
const W = Math.max(...rows.map(r => r[3])) * Z * 2 + 60, H = rows.reduce((a, r) => a + r[4] * Z + 40, 20);
const img = new Img(W, H, '#15110f'); let y = 20;
for (const [n, x, yy, w, h] of rows) {
  const o = decode(fs.readFileSync(S + 'pp-' + n + '-old.png')), nw = decode(fs.readFileSync(S + 'pp-' + n + '-new.png'));
  text(img, 'BYLO / OLD', 20, y, '#8c7d60', 2); text(img, 'STALO / NEW', 40 + w * Z, y, '#e0bf6c', 2);
  img.blit(o, x, yy, w, h, 20, y + 16, w * Z, h * Z); img.blit(nw, x, yy, w, h, 40 + w * Z, y + 16, w * Z, h * Z);
  y += h * Z + 40;
}
fs.writeFileSync(__dirname + '/' + out, img.png()); console.log(out, W, H);
