// Budget vs bought: for every ordinary room, the threat the level's curve handed it (plan cell
// `threat`, gen.js planEncounters) against the threat of the men it actually got (rules.js roomsOf),
// and the most any room on that level could buy under its caps. Same seeds as tools/balance.js.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = process.argv[2]; const SEEDS = +(process.argv[3] || 25);
const ctx = { console, Math, Uint8Array, Int16Array, Int32Array, Float32Array };
vm.createContext(ctx);
for (const f of ['js/tuning.js', 'js/rng.js', 'js/rooms.js', 'js/gen.js', 'js/rules.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const g = (n) => vm.runInContext(n, ctx);
const LEVELS = g('LEVELS'), THREAT = g('THREAT'), ENCOUNTER = g('ENCOUNTER'), generateLevel = g('generateLevel'), roomsOf = g('roomsOf');
const ORD = new Set(['canon', 'mix', 'trap']);
function ceiling(def) {
  const E = def.encounters, caps = Object.assign({}, ENCOUNTER.cap, E.cap || {});
  const kinds = [...new Set([...E.kinds, ...(E.introduce || []).map(([k]) => k)])].sort((a, b) => THREAT[b] - THREAT[a]);
  let men = caps.men, t = 0; const pick = [];
  for (const k of kinds) {
    const c = k === ENCOUNTER.cheap.kind ? Math.min(caps[k] || 99, ENCOUNTER.cheap.min) : (caps[k] || 99);
    const n = Math.min(c, men); men -= n; t += n * THREAT[k]; if (n) pick.push(`${n} ${k}`);
  }
  return { t, pick: pick.join(', '), capMen: caps.men };
}
const defs = LEVELS.slice();
try { defs.push(g('darkLevel')()); } catch (e) {}
const out = [];
for (const def of defs) {
  let bud = 0, got = 0, rooms = 0, starved = 0, atCeil = 0; const c = ceiling(def);
  let maxBudget = 0;
  for (let s = 1; s <= SEEDS; s++) {
    const L = generateLevel(def, s * 7717);
    for (const r of roomsOf(L)) {
      if (!ORD.has(r.role) || !r.cell || r.cell.threat === undefined || r.cell.intro) continue;
      rooms++; bud += r.cell.threat; got += r.threat; maxBudget = Math.max(maxBudget, r.cell.threat);
      if (r.cell.threat - r.threat > 1) starved++;
      if (r.threat >= c.t - 0.05) atCeil++;
    }
  }
  out.push({ level: def.name, curve: `${def.encounters.from}->${def.encounters.to}`, capMen: c.capMen, ceiling: +c.t.toFixed(1), ceilingMen: c.pick,
    maxBudget: +maxBudget.toFixed(1), budgetPerRoom: +(bud / rooms).toFixed(2), boughtPerRoom: +(got / rooms).toFixed(2),
    lostPct: Math.round((1 - got / bud) * 100), starvedPct: Math.round(starved / rooms * 100), atCeilingPct: Math.round(atCeil / rooms * 100) });
}
console.table(out);
