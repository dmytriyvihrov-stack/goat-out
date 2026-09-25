// Which items of the environment atlas can any code path name? Reads the live registries in a vm
// (PIXEL_ENV_ID, PIXEL_FLOORS, PIXEL_ROOMS, PIXEL_LITTER, the GOAT GRID decor list) plus every literal
// PIXEL_ENV.draw name in js/, then reports atlas items nothing names, with their share of the atlas.
// --plant adds a fake item to the atlas to prove an unnamed item is reported.
const fs = require('fs'), vm = require('vm'), path = require('path');
const G = process.argv[2], PLANT = process.argv.includes('--plant');
const ctx = { console, Math, Image: class { set src(v) {} } }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(G, 'js/pixel-env-assets.js'), 'utf8'), ctx);
const pa = fs.readFileSync(path.join(G, 'js/pixel-art.js'), 'utf8');
vm.runInContext(pa.slice(pa.indexOf('const PIXEL_ENV_ID'), pa.indexOf('const PIXEL_ENV = {')), ctx);
const R = (n) => vm.runInContext(n, ctx);
const items = R('PIXEL_ENV_ASSETS.items'); if (PLANT) items['planted-99'] = [0, 0, 50, 50];
const ID = R('PIXEL_ENV_ID'), FL = R('PIXEL_FLOORS'), RO = R('PIXEL_ROOMS'), LI = R('PIXEL_LITTER');
const named = new Set();
const add = (n) => named.add(ID[n] || n);
Object.values(ID).forEach((v) => named.add(v));
Object.values(FL).flat().forEach(add);
for (const [k, v] of Object.entries(RO)) { if (k === 'lift') continue; if (k === 'wall') { add(v.top); add(v.face); continue; } v.floor.forEach(add); add(v.boards); }
Object.values(LI).forEach((l) => l.ids.forEach(add));
// literal names in code
for (const f of fs.readdirSync(path.join(G, 'js'))) {
  const t = fs.readFileSync(path.join(G, 'js', f), 'utf8');
  for (const m of t.matchAll(/PIXEL_ENV\.draw\(\s*\w+\s*,\s*'([^']+)'/g)) add(m[1]);
  if (f === 'goat-grid.js') { const blk = t.slice(t.indexOf("decor: { name: 'DECOR'"), t.indexOf('].map(([id, w, flat])')); for (const m of blk.matchAll(/\['([^']+)'/g)) add(m[1]); }
}
const area = (k) => items[k][2] * items[k][3];
const all = Object.keys(items), tot = all.reduce((s, k) => s + area(k), 0);
const orphan = all.filter((k) => !named.has(k)), missing = [...named].filter((k) => !items[k]);
console.log('atlas items', all.length, '| named by code', all.length - orphan.length, '| never named', orphan.length,
  '(' + (100 * orphan.reduce((s, k) => s + area(k), 0) / tot).toFixed(1) + '% of item area)');
console.log('never named:', orphan.map((k) => k + ' ' + items[k][2] + 'x' + items[k][3]).join(', '));
console.log('named but not in atlas (would draw nothing):', missing.join(', ') || '-');
