// Per-unit share of the unit atlas, read off the live PIXEL_ASSETS / PIXEL_EXTENT in a vm context.
const fs = require('fs'), vm = require('vm'), path = require('path');
const G = process.argv[2];
const ctx = { console, Math }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(G, 'js/pixel-assets.js'), 'utf8'), ctx);
const src = fs.readFileSync(path.join(G, 'js/pixel-art.js'), 'utf8');
vm.runInContext(src.slice(0, src.indexOf('const PIXEL_NECK')), ctx);   // PIXEL_EXTENT, PIXEL_UNIT only
const A = vm.runInContext('PIXEL_ASSETS', ctx), E = vm.runInContext('PIXEL_EXTENT', ctx);
const W = 2048, H = Math.max(...Object.values(A.units).flatMap(u => [...u.idle, ...(u.walk || []).flat()]).map(f => f[1] + f[3]));
let total = 0; const rows = [];
for (const [id, u] of Object.entries(A.units)) {
  const fr = [...u.idle, ...(u.walk || []).flat()], area = fr.reduce((s, f) => s + f[2] * f[3], 0);
  total += area;
  rows.push({ id, idle: u.idle.length, walk: u.walk ? u.walk.length + 'x' + u.walk[0].length : '-', frames: fr.length, area,
    extent: E[id], atlasPxPerWorldPx: +(A.target / E[id]).toFixed(2) });
}
console.log('atlas', W + 'x' + H, 'target', A.target, 'units', rows.length, 'frame area', total, '(' + (100 * total / (W * H)).toFixed(1) + '% of atlas)');
for (const r of rows.sort((a, b) => b.area - a.area)) console.log(r.id.padEnd(10), ('idle ' + r.idle).padEnd(8), ('walk ' + r.walk).padEnd(9), String(r.frames).padStart(3) + ' fr',
  String(r.area).padStart(8), (100 * r.area / total).toFixed(1).padStart(5) + '%', ' extent', r.extent, ' atlas px / world px', r.atlasPxPerWorldPx);
