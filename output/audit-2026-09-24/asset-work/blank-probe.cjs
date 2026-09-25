// Blank named rects of an embedded atlas in memory and re-encode, to measure what unused regions cost.
const fs = require('fs'), path = require('path'), { decode, encode } = require('./png-lib.cjs');
const G = process.argv[2];
const b64 = (b) => Math.ceil(b.length / 3) * 4, kib = (n) => (n / 1024).toFixed(1) + ' KiB';
const measure = (label, buf, rects, harden) => {
  const d = decode(buf), px = Buffer.from(d.px);
  for (let i = 0; i < d.W * d.H; i++) if (px[i * 4 + 3] === 0 || (harden && px[i * 4 + 3] < 128)) px.writeUInt32BE(0, i * 4); else if (harden) px[i * 4 + 3] = 255;
  const base = encode(d.W, d.H, (y) => px.slice(y * d.W * 4, (y + 1) * d.W * 4), 4, 6);
  for (const [x, y, w, h] of rects) for (let j = y; j < y + h; j++) px.fill(0, (j * d.W + x) * 4, (j * d.W + x + w) * 4);
  const cut = encode(d.W, d.H, (y) => px.slice(y * d.W * 4, (y + 1) * d.W * 4), 4, 6);
  console.log(label.padEnd(44), 'embedded now', kib(b64(buf)), '| re-encoded', kib(b64(base)), '| with rects blanked', kib(b64(cut)), '| rects cost', kib(b64(base) - b64(cut)));
};
// env atlas: the seven items no code names
const envText = fs.readFileSync(path.join(G, 'js/pixel-env-assets.js'), 'utf8');
const env = JSON.parse(envText.slice(envText.indexOf('{'), envText.lastIndexOf('}') + 1));
const envBuf = Buffer.from(env.src.split(',')[1], 'base64');
const packed = fs.readFileSync(path.join(G, 'output/pixel-environment-2026-09-23/atlas-packed.png'));
console.log('env atlas embedded == output/.../atlas-packed.png:', Buffer.compare(envBuf, packed) === 0, '(', envBuf.length, 'vs', packed.length, 'bytes )');
const unnamed = ['floors-15', 'room-props-06', 'room-props-08', 'cave-props-03', 'cave-props-04', 'cave-props-07', 'cave-props-08'];
measure('pixel-env: 7 unnamed items', envBuf, unnamed.map((k) => env.items[k]), false);
// painted propsAtlas: the six cells no code names; the slabs' three unused cells of four
const pt = fs.readFileSync(path.join(G, 'js/painted-assets.js'), 'utf8');
const grab = (k) => Buffer.from(new RegExp('"' + k + '":\{[^}]*?"src":"data:image/png;base64,([A-Za-z0-9+/=]+)"').exec(pt)[1], 'base64');
const cells = { 'cage-bars': [0, 0], 'cage-broken': [128, 0], 'secret-wall': [0, 384], 'crate-debris': [128, 384], 'brazier-unlit': [256, 384], worktable: [384, 384] };
measure('painted propsAtlas: 6 cells nothing names', grab('propsAtlas'), Object.values(cells).map(([x, y]) => [x, y, 128, 128]), false);
let slabAll = 0;
for (const s of ['slabWood', 'slabIron', 'slabVault', 'slabSoul']) measure('painted ' + s + ': cells 0-2 (only 384.. is read)', grab(s), [[0, 0, 384, 128]], false);
