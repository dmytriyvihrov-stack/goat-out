// The goat as the real deal makes him. For each run seed: every level is started headless with the
// real `startLevel` (which sets `soulsHere`, the lit bonus boss and `bonusRoom`), every soul it gives
// up is opened with the real `openBoonChoice` and taken with the real `takeBoon` (slots, `needs`,
// the active lean, the alternation), picked by a strategy. Power is balance.js's own formula
// (hearts x BOON_POWER.heart + sum of BOON_POWER over the boons held), read at the head of each level.
const { load } = require('./load.js');
const root = process.argv[2], RUNS = +(process.argv[3] || 40), STRAT = process.argv[4] || 'random';
const L = load(root, { quiet: true, seed: +(process.argv[5] || 99) });
L.run(`window.game = new Game(document.getElementById('game'));`);
const g = L.grab('game'), LEVELS = L.grab('LEVELS'), BOONS = L.grab('BOONS'), BP = L.grab('BOON_POWER'), TUNING = L.grab('TUNING');
g.frame = function () {};
if (process.env.RC !== undefined) TUNING.soul.roomChance = +process.env.RC;
if (process.env.BC !== undefined) TUNING.soul.bossChance = +process.env.BC;
console.log("WHAT-IF in memory: roomChance", TUNING.soul.roomChance, "bossChance", TUNING.soul.bossChance);
if (process.env.SOULS) for (const kv of process.env.SOULS.split(',')) { const [i, n] = kv.split(':').map(Number); LEVELS[i].souls = n; }
console.log('souls per level', JSON.stringify(LEVELS.map((d) => d.souls)));
const pw = (b) => BP[b.id] === undefined ? 1 : BP[b.id];
const perLevel = LEVELS.map(() => ({ power: 0, boons: 0, dealt: 0, heals: 0, authored: 0, bonus: 0, shop: 0 }));
const offered = {}, taken = {}, firstOffered = {};
for (const b of BOONS) { offered[b.id] = 0; taken[b.id] = 0; }
let deals = 0;
for (let run = 0; run < RUNS; run++) {
  g.boons = []; g.lastBoonActive = false; g.henHearts = 0; g.beasts = {}; g.artifact = null; g.settings.easy = false; g.applyBoons();
  for (let li = 0; li < LEVELS.length; li++) {
    const P = perLevel[li];
    P.power += TUNING.goat.hp * BP.heart + g.boons.reduce((a, b) => a + pw(b), 0);
    P.boons += g.boons.length;
    g.tripAt = -1; g.darkAt = -1; g.startLevel(li, (run + 1) * 104729 + li * 7919, true, false);
    const authored = LEVELS[li].souls - (g.level.shop ? 1 : 0);
    const bonus = g.soulsHere - authored + (g.bonusRoom >= 0 ? 1 : 0);
    P.authored += authored; P.bonus += bonus; P.shop += g.level.shop ? 1 : 0;
    const n = authored + bonus;
    for (let k = 0; k < n; k++) {
      g.levelIndex = li; g.state = 'play'; g.boonChoice = null;
      const hpBefore = g.goat.hp; g.goat.hp = 1;
      g.openBoonChoice();
      if (!g.boonChoice) { P.heals++; g.goat.hp = hpBefore; continue; }
      g.goat.hp = hpBefore;
      P.dealt++; deals++;
      const ch = g.boonChoice;
      for (const b of ch) offered[b.id]++;
      let i;
      if (STRAT === 'power') { i = 0; for (let j = 1; j < ch.length; j++) if (pw(ch[j]) > pw(ch[i])) i = j; }
      else i = Math.floor(Math.random() * ch.length);
      taken[ch[i].id]++;
      g.boonArm = 0; g.takeBoon(i);
    }
  }
}
const rows = LEVELS.map((d, li) => {
  const P = perLevel[li];
  return { level: d.name, powerAtHead: +(P.power / RUNS).toFixed(2), boonsHeld: +(P.boons / RUNS).toFixed(1),
    soulsHere: +((P.authored + P.bonus) / RUNS).toFixed(2), bonus: +(P.bonus / RUNS).toFixed(2), shopLevel: P.shop > 0,
    wastedToHeal: +(P.heals / RUNS).toFixed(2) };
});
console.log(`strategy ${STRAT}, ${RUNS} runs`);
console.table(rows);
const ids = BOONS.map((b) => b.id);
const tbl = ids.map((id) => ({ id, active: !!BOONS.find((b) => b.id === id).active, skill: BOONS.find((b) => b.id === id).skill || '-', power: BP[id] === undefined ? '1 (default)' : BP[id],
  offeredPerRun: +(offered[id] / RUNS).toFixed(2), takenPerRun: +(taken[id] / RUNS).toFixed(2), pickRateWhenOffered: offered[id] ? +(taken[id] / offered[id]).toFixed(2) : '-' }));
if (!process.env.NOTBL) console.table(tbl.sort((a, b) => b.offeredPerRun - a.offeredPerRun));
