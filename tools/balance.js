// Balance report. Reads the same numbers the game does and prints what they actually produce:
// what you meet in each room of each level, in what order, how hard each room is, and which rooms
// are the level's canon and which are the mix.
//
//   node tools/balance.js            the report
//   node tools/balance.js --seeds 40 sample more seeds per level
//   node tools/balance.js --quiet    rule checks only
//
// The rules it enforces are the design, not a style guide, and they are written once, in
// `js/rules.js`, where the dev drawer's RULES page reads the same list: every kind met alone, the run
// opening on one man, the caps, at least half of a level's ordinary rooms on its canon, the mix never
// ahead of the run, set pieces teaching nothing, milk on a rhythm, and the rest. This runs that list
// over many seeds of every level, adds the two things a single level cannot know about itself —
// that threat rises on average, and that every level is harder than the one before — and exits
// non-zero when anything is broken, so it can run as a test.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ctx = { console, Math, Uint8Array, Int16Array, Int32Array, Float32Array };
vm.createContext(ctx);
for (const f of ['js/tuning.js', 'js/rng.js', 'js/rooms.js', 'js/gen.js', 'js/rules.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}

// `const` inside a vm script lives in the context's lexical scope, not on the sandbox object, so
// the values have to be fetched by evaluating their names inside it.
const grab = (name) => vm.runInContext(name, ctx);
const LEVELS = grab('LEVELS'), CANON = grab('CANON');
const generateLevel = grab('generateLevel'), checkRules = grab('checkRules'), roomsOf = grab('roomsOf');

const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : def;
};
const SEEDS = arg('seeds', 25);
const QUIET = process.argv.includes('--quiet');
const ORDINARY = new Set(['canon', 'mix', 'trap']);

const fails = [];
const fail = (msg) => { fails.push(msg); };
const levelThreat = [];

for (let li = 0; li < LEVELS.length; li++) {
  const def = LEVELS[li];
  const runs = [], seen = new Set();
  let canonMin = 1, canonSum = 0, ordSum = 0;
  let gEarly = 0, gLate = 0, gSeeds = 0;
  for (let s = 1; s <= SEEDS; s++) {
    const L = generateLevel(def, s * 7717);
    const rooms = roomsOf(L);
    runs.push(rooms);
    // ---- every per-level rule, from the one list the game itself reads ----
    // `rises` is the one rule a single seed cannot be held to: one room filled a man short of its
    // budget is noise, not a broken curve, so here it is judged on the average below instead.
    // `ground` joins `rises` as a rule one seed cannot answer: the draw picks at random inside a
    // window of the pool, so a single level running the other way is noise. Both are judged below,
    // on the average of every seed.
    const drawnRooms = rooms.filter((r) => ORDINARY.has(r.role) && r.drawn);
    if (drawnRooms.length >= 4) {
      const t = Math.floor(drawnRooms.length / 3) || 1;
      gEarly += drawnRooms.slice(0, t).reduce((a, r) => a + r.ground, 0) / t;
      gLate += drawnRooms.slice(-t).reduce((a, r) => a + r.ground, 0) / t;
      gSeeds++;
    }
    for (const r of checkRules(L)) {
      if (r.ok !== false || r.rule.id === 'rises' || r.rule.id === 'ground') continue;
      const msg = `${def.name}: ${r.rule.id} — ${r.why}`;
      if (!seen.has(msg)) { seen.add(msg); fail(msg); }
    }
    const o = rooms.filter((r) => ORDINARY.has(r.role)), c = o.filter((r) => r.role === 'canon').length;
    if (o.length) canonMin = Math.min(canonMin, c / o.length);
    canonSum += c; ordSum += o.length;
  }

  // ---- the shape of the level, averaged over the seeds ----
  const width = Math.max(...runs.map((r) => r.length));
  const avg = [];
  for (let i = 0; i < width; i++) {
    const cells = runs.map((r) => r[i]).filter(Boolean);
    const first = runs[0][i];
    avg.push({
      index: i,
      threat: +(cells.reduce((a, c) => a + c.threat, 0) / cells.length).toFixed(1),
      men: +(cells.reduce((a, c) => a + c.men.length, 0) / cells.length).toFixed(1),
      ground: +(cells.reduce((a, c) => a + c.ground, 0) / cells.length).toFixed(2),
      pressure: +(cells.reduce((a, c) => a + c.pressure, 0) / cells.length).toFixed(1),
      role: cells[0].role,
      tpl: first ? first.name : '',
      sample: first ? first.men.join(' ') + (first.cell && first.cell.intro ? `  (meets ${first.cell.intro})` : '') : '',
    });
  }
  const total = +(avg.reduce((a, c) => a + c.threat, 0)).toFixed(1);
  // The peak that matters is an ordinary room: a Great Hall is a set piece, not the level's baseline.
  const plainPeak = Math.max(...avg.filter((c) => ORDINARY.has(c.role)).map((c) => c.threat), 0);
  levelThreat.push({ name: def.name, total, peak: Math.max(...avg.map((c) => c.threat)), plainPeak });

  // ---- threat rises within a level, on average (the per-seed version is in rules.js) ----
  const ordinary = avg.filter((c) => ORDINARY.has(c.role) && c.threat > 0);
  if (ordinary.length >= 4) {
    const third = Math.floor(ordinary.length / 3) || 1;
    const early = ordinary.slice(0, third).reduce((a, c) => a + c.threat, 0) / third;
    const late = ordinary.slice(-third).reduce((a, c) => a + c.threat, 0) / third;
    if (late <= early * 1.2) fail(`${def.name}: threat barely grows on average (${early.toFixed(1)} → ${late.toFixed(1)})`);
  }
  // ---- and the floor opens up: GEN_RULES.ground, over the rooms the draw chose, on every seed ----
  if (gSeeds) {
    const a = gEarly / gSeeds, b = gLate / gSeeds;
    if (b <= a) fail(`${def.name}: the floor does not open up (${a.toFixed(2)} → ${b.toFixed(2)})`);
  }

  if (!QUIET) {
    console.log(`\n${def.name}  (${def.rooms} rooms, curve ${def.encounters.from} → ${def.encounters.to})`);
    const intro = (def.encounters.introduce || []).map(([k, at]) => `${k}@${at}`).join(' ');
    console.log(`  introduces: ${intro || '(nothing new)'}   pool: ${def.encounters.kinds.join(', ')}`);
    if (def.canon) {
      console.log(`  canon: ${def.canon.name} — ${(canonSum / SEEDS).toFixed(1)} of ${(ordSum / SEEDS).toFixed(1)} ordinary rooms, worst seed ${Math.round(canonMin * 100)}% (needs ${Math.round(CANON.share * 100)}%)`);
    }
    for (const c of avg) {
      if (!c.men && (c.role === 'pen' || c.role === 'calm' || c.role === 'rest')) { console.log(`  ${String(c.index).padStart(2)}  —        ${c.role.toUpperCase().padEnd(7)} ${c.tpl}`); continue; }
      const bar = '#'.repeat(Math.round(c.threat));
      console.log(`  ${String(c.index).padStart(2)}  ${c.threat.toFixed(1).padStart(5)}  ${bar.padEnd(20)} ${c.men.toFixed(1)} men  gr ${c.ground.toFixed(2)}  ${c.role.toUpperCase().padEnd(7)} ${c.tpl.padEnd(10)} ${c.sample}`);
    }
    const ordGround = avg.filter((c) => ORDINARY.has(c.role) && c.threat > 0);
    const gAvg = ordGround.length ? ordGround.reduce((a, c) => a + c.ground, 0) / ordGround.length : 0;
    console.log(`  total threat ${total} · ground ${gAvg.toFixed(2)} avg · pressure ${avg.reduce((a, c) => a + c.pressure, 0).toFixed(1)}`);
  }
}

// ---- every level is harder than the one before ----
for (let i = 1; i < levelThreat.length; i++) {
  const a = levelThreat[i - 1], b = levelThreat[i];
  if (b.total <= a.total) fail(`${b.name} (${b.total}) is not harder than ${a.name} (${a.total})`);
  if (b.plainPeak < a.plainPeak) fail(`${b.name}'s worst ordinary room (${b.plainPeak}) is easier than ${a.name}'s (${a.plainPeak})`);
}

console.log('\n--- level totals ---');
for (const l of levelThreat) console.log(`  ${l.name.padEnd(22)} total ${String(l.total).padStart(6)}   worst room ${String(l.peak).padStart(5)}   worst ordinary room ${l.plainPeak}`);

// ---- the third column: what the goat is by then ----
// Threat is only half of the curve. The other half is what he is carrying when he walks in: the
// hearts he starts with plus the souls every level before this one hands out (the same sum LEVELS
// deals on the title screen), each at its average `BOON_POWER`. The ratio is threat over that; it
// should never fall from one level to the next, or a level has got easier for the goat it meets.
// Reported, not failed: the weights are a guess, and a fall is a question for a person, not a test.
const BOONS = grab('BOONS'), BOON_POWER = grab('BOON_POWER'), TUNING = grab('TUNING');
const perSoul = BOONS.reduce((a, b) => a + (BOON_POWER[b.id] || 1), 0) / BOONS.length;
if (!QUIET) console.log(`\n--- threat over power (a soul is worth ${perSoul.toFixed(2)} on average, a heart ${BOON_POWER.heart}) ---`);
let soulsIn = 0, lastRatio = 0;
const falls = [];
for (let li = 0; li < levelThreat.length; li++) {
  const l = levelThreat[li];
  const power = TUNING.goat.hp * BOON_POWER.heart + soulsIn * perSoul, ratio = l.total / power;
  const mark = li && ratio < lastRatio ? '  ▼ easier for him than the last' : '';
  if (mark) falls.push(l.name);
  if (!QUIET) console.log(`  ${l.name.padEnd(22)} souls in ${String(soulsIn).padStart(2)}   power ${power.toFixed(1).padStart(5)}   threat/power ${ratio.toFixed(1).padStart(5)}${mark}`);
  soulsIn += LEVELS[li].souls || 0; lastRatio = ratio;
}
if (falls.length) console.log(`  (not a failure, since the weights are a guess, but ${falls.join(', ')} ${falls.length > 1 ? 'ask' : 'asks'} less of the goat than the level before)`);

// ---- THE TRIP ----
// Not in LEVELS, so none of the above saw it: every level a tuft can send the run to, played as the
// trip, held to the same per-level list over the same seeds, with its threat beside the level it
// stands in for.
const tripLevel = grab('tripLevel');
if (!QUIET) console.log('\n--- the trip, in place of ---');
for (let li = TUNING.shroom.from + 1; li < LEVELS.length; li++) {
  const def = tripLevel(li), seen = new Set();
  let total = 0, men = 0;
  for (let s = 1; s <= SEEDS; s++) {
    let L;
    try { L = generateLevel(def, s * 7717); } catch (e) { fail(`THE TRIP (for ${LEVELS[li].name}): does not generate — ${e.message}`); break; }
    const rooms = roomsOf(L);
    total += rooms.reduce((a, r) => a + r.threat, 0); men += L.spawns.length;
    for (const r of checkRules(L)) {
      if (r.ok !== false || r.rule.id === 'rises' || r.rule.id === 'ground') continue;
      const msg = `THE TRIP (for ${LEVELS[li].name}): ${r.rule.id} — ${r.why}`;
      if (!seen.has(msg)) { seen.add(msg); fail(msg); }
    }
  }
  if (!QUIET) console.log(`  ${LEVELS[li].name.padEnd(22)} total ${(total / SEEDS).toFixed(1).padStart(6)}   men ${(men / SEEDS).toFixed(1)}   (the level itself ${levelThreat[li] ? levelThreat[li].total.toFixed(1) : '?'})`);
}

// ---- THE DARK ----
// Not in LEVELS either: every level played with the lamps out, held to the same list, its threat
// beside the level it darkens (it is meant to come in under it) and how many of its rooms stay black.
const darkLevel = grab('darkLevel');
if (!QUIET) console.log('\n--- the dark, of ---');
for (let li = 0; li < LEVELS.length; li++) {
  const def = darkLevel(li), seen = new Set();
  let total = 0, men = 0, black = 0, lamps = 0;
  for (let s = 1; s <= SEEDS; s++) {
    let L;
    try { L = generateLevel(def, s * 7717); } catch (e) { fail(`THE DARK (of ${LEVELS[li].name}): does not generate — ${e.message}`); break; }
    total += roomsOf(L).reduce((a, r) => a + r.threat, 0); men += L.spawns.length;
    black += L.rooms.filter((r) => r.unlit).length; lamps += L.props.filter((p) => p.darkLamp).length;
    for (const r of checkRules(L)) {
      if (r.ok !== false || r.rule.id === 'rises' || r.rule.id === 'ground') continue;
      const msg = `THE DARK (of ${LEVELS[li].name}): ${r.rule.id} — ${r.why}`;
      if (!seen.has(msg)) { seen.add(msg); fail(msg); }
    }
  }
  if (!QUIET) console.log(`  ${LEVELS[li].name.padEnd(22)} total ${(total / SEEDS).toFixed(1).padStart(6)}   men ${(men / SEEDS).toFixed(1)}   lamps ${(lamps / SEEDS).toFixed(1)}   black rooms ${(black / SEEDS).toFixed(1)}   (the level itself ${levelThreat[li] ? levelThreat[li].total.toFixed(1) : '?'})`);
  // The floor every run plays dark (`dark.runAt`) stands in the ladder in place of the lit one, so it
  // is held to the ladder: above the floor before it, under the floor after.
  if (li === TUNING.dark.runAt) {
    const t = total / SEEDS, lo = levelThreat[li - 1], hi = levelThreat[li + 1];
    if (lo && t <= lo.total) fail(`THE DARK (of ${LEVELS[li].name}), the run's dark floor: ${t.toFixed(1)} is not above ${LEVELS[li - 1].name} (${lo.total.toFixed(1)})`);
    if (hi && t >= hi.total) fail(`THE DARK (of ${LEVELS[li].name}), the run's dark floor: ${t.toFixed(1)} is not under ${LEVELS[li + 1].name} (${hi.total.toFixed(1)})`);
  }
}

if (fails.length) {
  console.log(`\n${fails.length} RULE FAILURES:`);
  for (const f of fails.slice(0, 25)) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log('\nall balance rules hold');
