// Renders every Foley recipe in node (vm) and checks it is sound: non-empty, finite, not silent.
// Then checks every recipe name audio.js asks `foley(` for exists. --plant asks for a missing name.
const fs = require('fs'), vm = require('vm'), path = require('path');
const G = process.argv[2], PLANT = process.argv.includes('--plant');
const ctx = { console, Math, Float32Array }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(G, 'js/foley.js'), 'utf8'), ctx);
const F = vm.runInContext('Foley', ctx), names = Object.keys(F.recipes);
let bad = 0, secs = 0;
for (const n of names) {
  let x; try { x = F.render(n, {}); } catch (e) { console.log('THREW', n, e.message); bad++; continue; }
  const d = x && x.length !== undefined ? x : x && x.data; // finish() may wrap
  const arr = d instanceof Float32Array ? d : (x && x.buf) || x;
  let peak = 0, nan = 0; for (let i = 0; i < arr.length; i++) { const v = arr[i]; if (!Number.isFinite(v)) nan++; else if (Math.abs(v) > peak) peak = Math.abs(v); }
  secs += arr.length / F.rateOf(n);
  if (!arr.length || nan || peak < 1e-4) { console.log('BAD', n, 'len', arr.length, 'nan', nan, 'peak', peak); bad++; }
}
const audio = fs.readFileSync(path.join(G, 'js/audio.js'), 'utf8') + (PLANT ? "\nthis.foley('nosuchsound')" : '');
const asked = new Set([...audio.matchAll(/foley\(\s*'([a-zA-Z]+)'/g)].map((m) => m[1]));
const missing = [...asked].filter((n) => !names.includes(n));
console.log('recipes', names.length, '| rendered bad', bad, '| total rendered', secs.toFixed(1), 's | literal names asked by audio.js', asked.size, '| missing', missing.join(', ') || '-');
