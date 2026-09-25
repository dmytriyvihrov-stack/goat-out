const { load } = require('./load.js');
const g = load(['js/tuning.js', 'js/rng.js', 'js/rooms.js', 'js/gen.js', 'js/rules.js']);
const LEVELS = g('LEVELS'), gen = g('generateLevel');
for (const def of LEVELS) {
  let dogs = 0, S = 12;
  for (let s = 1; s <= S; s++) { const L = gen(def, s * 7717); dogs += L.spawns.filter((x) => x.kind === 'dog').length; }
  console.log(def.name.padEnd(22), 'hounds/level', (dogs / S).toFixed(1));
}
