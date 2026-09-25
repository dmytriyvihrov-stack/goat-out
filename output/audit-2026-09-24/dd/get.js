// node get.js "EXPR" ... : evaluates expressions inside the loaded tuning/gen context and prints JSON
const { load } = require('./load.js');
const g = load(['js/tuning.js', 'js/rng.js', 'js/rooms.js', 'js/gen.js', 'js/rules.js']);
for (const e of process.argv.slice(2)) { let v; try { v = g(e); } catch (err) { v = 'ERR ' + err.message; } console.log(e + ' => ' + String(JSON.stringify(v, (k, x) => typeof x === "function" ? "fn" : x)).slice(0, 1200)); }
