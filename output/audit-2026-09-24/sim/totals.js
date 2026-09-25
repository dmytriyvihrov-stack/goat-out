// Level threat totals on two disjoint seed sets (balance.js's 1..25 and 26..50), to size the
// sample noise under balance.js's ladder. Same generator, same seed formula (s * 7717). Read-only.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = process.argv[2];
const ctx = { console, Math, Uint8Array, Int16Array, Int32Array, Float32Array }; vm.createContext(ctx);
for (const f of ['js/tuning.js', 'js/rng.js', 'js/rooms.js', 'js/gen.js', 'js/rules.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const g = (n) => vm.runInContext(n, ctx);
const LEVELS = g('LEVELS'), generateLevel = g('generateLevel'), roomsOf = g('roomsOf');
const tot = (def, a, b) => { let s = 0; for (let k = a; k <= b; k++) s += roomsOf(generateLevel(def, k * 7717)).reduce((x, r) => x + (r.threat || 0), 0); return s / (b - a + 1); };
for (const d of LEVELS) console.log(d.name.padEnd(22), tot(d, 1, 25).toFixed(1).padStart(6), tot(d, 26, 50).toFixed(1).padStart(6));
