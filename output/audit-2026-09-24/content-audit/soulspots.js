// Where the authored souls land, spent exactly as game.startLevel spends them: gates, vault, last bosses.
const { load } = require('./load.js');
const L = load(); const g = L.grab;
const LEVELS = g('LEVELS'), gen = g('generateLevel'), DARK = g('DARK_LEVEL');
const N = Number(process.argv[2] || 50);
const tot = { gate: 0, vault: 0, boss: 0, vaultMilk: 0, levels: 0 };
for (const d of [...LEVELS, DARK]) {
  const c = { gate: 0, vault: 0, boss: 0, vaultMilk: 0 };
  for (let s = 1; s <= N; s++) {
    const lv = gen(d, s * 9973 + 5);
    let budget = d.souls - (lv.shop ? 1 : 0);
    for (const gt of lv.gates) { if (gt.shop || budget <= 0) continue; c.gate++; budget--; }
    if (lv.vault) { if (budget > 0) { c.vault++; budget--; } else c.vaultMilk++; }
    const bosses = lv.spawns.filter((sp) => sp.boss).length;
    for (let n = bosses - 1; n >= 0 && budget > 0; n--) { c.boss++; budget--; }
  }
  console.log(`${d.name.padEnd(20)} over ${N}: gate souls ${c.gate}, vault souls ${c.vault}, boss souls ${c.boss}, vault left as big grass ${c.vaultMilk}`);
  for (const k of Object.keys(c)) tot[k] += c[k];
}
console.log('ALL', JSON.stringify(tot));
