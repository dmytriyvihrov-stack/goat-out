// node glyphs.cjs → glyphs.png: the cult's floor pictograms as the game reads them from js/world.js.
const fs = require('fs'), vm = require('vm'), { Img } = require('./png.cjs');
const src = fs.readFileSync(__dirname + '/../../js/world.js', 'utf8'), m = src.match(/const CULT_GLYPHS = (\[[\s\S]*?\n\]);/);
const G = vm.runInNewContext(m[1]), Z = 12, pad = 24;
const img = new Img(G.length * (11 * Z + pad) + pad, 11 * Z + pad * 2, '#3a2a2c');
G.forEach((rows, k) => rows.forEach((row, y) => [...row].forEach((c, x) => {
  if (c === '#') img.fill(pad + k * (11 * Z + pad) + x * Z, pad + y * Z, Z, Z, '#b8894e');
})));
fs.writeFileSync(__dirname + '/glyphs.png', img.png()); console.log(G.length, 'glyphs');
