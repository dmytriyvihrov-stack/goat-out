// Balance report. Reads the same numbers the game does and prints what they actually produce:
// what you meet in each room of each level, in what order, and how hard each room is.
//
//   node tools/balance.js            the report
//   node tools/balance.js --seeds 40 sample more seeds per level
//   node tools/balance.js --quiet    rule checks only
//
// The rules it enforces are the design, not a style guide:
//   1. A kind is met alone: the room that first holds a kind holds nothing else.
//   2. The first fighting room of the run is one man.
//   3. Threat per room rises across a level, and every level is harder than the one before it.
//   4. No room breaks the per-room caps.
// It exits non-zero when one is broken, so it can run as a test.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ctx = { console, Math, Uint8Array, Int16Array, Int32Array, Float32Array };
vm.createContext(ctx);
for (const f of ['js/tuning.js', 'js/rng.js', 'js/rooms.js', 'js/gen.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}

// `const` inside a vm script lives in the context's lexical scope, not on the sandbox object, so
// the values have to be fetched by evaluating their names inside it.
const grab = (name) => vm.runInContext(name, ctx);
const LEVELS = grab('LEVELS'), THREAT = grab('THREAT'), ENCOUNTER = grab('ENCOUNTER');
const generateLevel = grab('generateLevel');

const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : def;
};
const SEEDS = arg('seeds', 25);
const QUIET = process.argv.includes('--quiet');

// One run of one level, reduced to what the player meets room by room.
function walk(levelIndex, seed) {
  const L = generateLevel(LEVELS[levelIndex], seed);
  const byRoom = new Map();
  for (const s of L.spawns) {
    const r = s.roomIndex === undefined ? -1 : s.roomIndex;
    if (!byRoom.has(r)) byRoom.set(r, []);
    byRoom.get(r).push(s.champion ? 'champion' : s.boss ? s.kind + '*' : s.kind);
  }
  return L.rooms.map((room) => {
    const men = (byRoom.get(room.index) || []).slice().sort();
    const threat = men.reduce((a, k) => a + (THREAT[k.replace('*', '')] || 1) * (k.endsWith('*') ? 1.6 : 1), 0);
    return { index: room.index, tpl: room.tpl.name, men, threat: +threat.toFixed(1),
      arena: !!room.arena, hall: !!room.isHall, gallery: !!room.isGallery };
  });
}

const fails = [];
const fail = (msg) => { fails.push(msg); };
const levelThreat = [];

for (let li = 0; li < LEVELS.length; li++) {
  const def = LEVELS[li];
  const runs = [];
  for (let s = 1; s <= SEEDS; s++) runs.push(walk(li, s * 7717));

  // ---- rule 1: a kind is met alone, the first time the RUN shows it ----
  // Only the kinds this level is the first to show: everything else the player already knows.
  const newHere = new Set((def.encounters.introduce || []).map(([k]) => k));
  for (const a of (def.arenas || [])) if (!def.met.has(a.boss) && !def.encounters.kinds.includes(a.boss)) newHere.add(a.boss);
  for (const k of newHere) if (def.met.has(k)) fail(`${def.name}: introduces ${k}, but an earlier level already showed it`);
  for (const rooms of runs) {
    const met = new Set();
    for (const room of rooms) {
      const kinds = new Set(room.men.map((m) => m.replace('*', '')));
      for (const k of kinds) {
        if (met.has(k)) continue;
        met.add(k);
        if (!newHere.has(k)) continue;
        if (room.men.length !== 1) fail(`${def.name}: first ${k} of the run arrives with ${room.men.join(', ')} (room ${room.index})`);
      }
    }
    // and nothing new turns up before the room that introduces it
    for (const k of newHere) {
      const rooms2 = rooms.filter((r) => r.men.some((m) => m.replace('*', '') === k));
      if (rooms2.length && rooms2[0].men.length !== 1) fail(`${def.name}: ${k} appears in a crowd before its own room`);
    }
  }
  // ---- rule 2: the run opens with one man ----
  if (li === 0) {
    for (const rooms of runs) {
      const first = rooms.find((r) => r.men.length);
      if (!first || first.men.length !== 1) fail(`${def.name}: the first fighting room holds ${first ? first.men.join(', ') : 'nobody'}`);
    }
  }
  // ---- rule 4: caps ----
  for (const rooms of runs) {
    for (const room of rooms) {
      const count = {};
      for (const m of room.men) { const k = m.replace('*', ''); count[k] = (count[k] || 0) + 1; }
      const caps = Object.assign({}, ENCOUNTER.cap, def.encounters.cap || {});
      for (const [k, n] of Object.entries(count)) {
        const cap = caps[k];
        // The Hall and the Gallery are set pieces: a wall of bodies and a row of rifles are the point.
        if (room.hall || (room.gallery && k === 'hunter')) continue;
        if (cap && n > cap) fail(`${def.name} room ${room.index}: ${n}x ${k} (cap ${cap})`);
      }
      const cap = room.hall ? ENCOUNTER.hallCap : caps.men + 2;   // +2: a boss and his escort
      if (room.men.length > cap) fail(`${def.name} room ${room.index}: ${room.men.length} men (cap ${cap})`);
    }
  }

  // ---- the shape of the level, averaged over the seeds ----
  const width = Math.max(...runs.map((r) => r.length));
  const avg = [];
  for (let i = 0; i < width; i++) {
    const cells = runs.map((r) => r[i]).filter(Boolean);
    avg.push({
      index: i,
      threat: +(cells.reduce((a, c) => a + c.threat, 0) / cells.length).toFixed(1),
      men: +(cells.reduce((a, c) => a + c.men.length, 0) / cells.length).toFixed(1),
      tag: cells[0].arena ? 'ARENA' : cells[0].hall ? 'HALL' : cells[0].gallery ? 'GALLERY'
        : cells[0].killbox ? 'KILLBOX' : cells[0].mill ? 'MILL' : '',
      sample: runs[0][i] ? runs[0][i].men.join(' ') : '',
    });
  }
  const total = +(avg.reduce((a, c) => a + c.threat, 0)).toFixed(1);
  // The peak that matters is an ordinary room: a Great Hall is a set piece, not the level's baseline.
  const plainPeak = Math.max(...avg.filter((c) => !c.tag).map((c) => c.threat), 0);
  levelThreat.push({ name: def.name, total, peak: Math.max(...avg.map((c) => c.threat)), plainPeak });

  // ---- rule 3a: threat rises within a level (compare the first and last thirds of ordinary rooms) ----
  const ordinary = avg.filter((c) => !c.tag && c.threat > 0);
  if (ordinary.length >= 4) {
    const third = Math.floor(ordinary.length / 3) || 1;
    const early = ordinary.slice(0, third).reduce((a, c) => a + c.threat, 0) / third;
    const late = ordinary.slice(-third).reduce((a, c) => a + c.threat, 0) / third;
    if (late <= early * 1.2) fail(`${def.name}: threat barely grows (${early.toFixed(1)} → ${late.toFixed(1)})`);
  }

  if (!QUIET) {
    console.log(`\n${def.name}  (${def.rooms} rooms, curve ${def.encounters.from} → ${def.encounters.to})`);
    const intro = (def.encounters.introduce || []).map(([k, at]) => `${k}@${at}`).join(' ');
    console.log(`  introduces: ${intro || '(nothing new)'}   pool: ${def.encounters.kinds.join(', ')}`);
    for (const c of avg) {
      if (!c.men && !c.tag) { console.log(`  ${String(c.index).padStart(2)}  —`); continue; }
      const bar = '#'.repeat(Math.round(c.threat));
      console.log(`  ${String(c.index).padStart(2)}  ${c.threat.toFixed(1).padStart(5)}  ${bar.padEnd(20)} ${c.men.toFixed(1)} men  ${c.tag.padEnd(8)} ${c.sample}`);
    }
    console.log(`  total threat ${total}`);
  }
}

// ---- rule 3b: every level is harder than the one before ----
for (let i = 1; i < levelThreat.length; i++) {
  const a = levelThreat[i - 1], b = levelThreat[i];
  if (b.total <= a.total) fail(`${b.name} (${b.total}) is not harder than ${a.name} (${a.total})`);
  if (b.plainPeak < a.plainPeak) fail(`${b.name}'s worst ordinary room (${b.plainPeak}) is easier than ${a.name}'s (${a.plainPeak})`);
}

console.log('\n--- level totals ---');
for (const l of levelThreat) console.log(`  ${l.name.padEnd(22)} total ${String(l.total).padStart(6)}   worst room ${String(l.peak).padStart(5)}   worst ordinary room ${l.plainPeak}`);

if (fails.length) {
  console.log(`\n${fails.length} RULE FAILURES:`);
  for (const f of fails.slice(0, 25)) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log('\nall balance rules hold');
