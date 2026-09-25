// The real scoreFor, asked: when does a body beat a second?
const { load } = require('./load.js');
const L = load(process.argv[2], { quiet: true, seed: 1 });
L.run(`window.game = new Game(document.getElementById('game'));`);
const g = L.grab('game'), LEVELS = L.grab('LEVELS'), S = L.grab('TUNING').score, gen = L.grab('generateLevel');
if (process.env.KM) { S.killMul = +process.env.KM; S.killCap = +process.env.KC; console.log('WHAT-IF (scratch, in memory)'); }
console.log('TUNING.score', JSON.stringify(S));
const rows = LEVELS.map((d, li) => {
  let men = 0; for (let s = 1; s <= 25; s++) men += gen(d, s * 7717).spawns.length; men /= 25;
  const par = d.rooms * S.perRoom, capKills = Math.ceil((S.killCap - 1) / S.killMul);
  const run0 = g.scoreFor(0, par, li), runFast = g.scoreFor(0, par / S.fastCap, li);
  const k = Math.min(Math.round(men), 999);
  // How slow may a run that kills everybody be and still beat the zero-kill run at par, and the one at the pace cap?
  let slowVsPar = par, slowVsFast = par;
  while (g.scoreFor(k, slowVsPar + 0.5, li) > run0) slowVsPar += 0.5;
  while (g.scoreFor(k, slowVsFast + 0.5, li) > runFast) slowVsFast += 0.5;
  return { level: d.name, rooms: d.rooms, parS: par, men: +men.toFixed(1), killsToCap: capKills,
    zeroKillAtPar: run0, zeroKillAtFastCap: runFast, clearAtPar: g.scoreFor(k, par, li),
    clearBeatsParRunnerUpTo: (slowVsPar / par).toFixed(2) + 'x par', clearBeatsFastestRunnerUpTo: (slowVsFast / par).toFixed(2) + 'x par',
    firstKillWorthS: +(S.killMul * par).toFixed(1) };
});
console.table(rows);
