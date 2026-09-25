// Content audit probe for Goat out: promised vs built vs dealt. READ-ONLY on the project.
// node probe.js [seeds]      (ROOT=<dir> to point at another copy, e.g. a HEAD export)
const fs = require('fs'), path = require('path');
const { load } = require('./load.js');
const SEEDS = Number(process.argv[2] || 200);
const L = load(['js/shop.js', 'js/talismans.js', 'js/beasts.js']);
if (L.failed.length) console.log('LOAD FAILED:', L.failed);
const g = L.grab;
const LEVELS = g('LEVELS'), TUNING = g('TUNING'), BOONS = g('BOONS'), ARTIFACTS = g('ARTIFACTS'), BOON_BASE = g('BOON_BASE'),
  BOON_SLOTS = g('BOON_SLOTS'), generateLevel = g('generateLevel'), roomsOf = g('roomsOf'), RNG = g('RNG'), stockFor = g('stockFor'),
  DARK = g('DARK_LEVEL'), tripLevel = g('tripLevel'), ROOM_TEMPLATES = g('ROOM_TEMPLATES'), THREAT = g('THREAT'), Beast = g('Beast');
const kindOf = (s) => (s.champion ? 'champion' : s.kind);
const out = {};

// ---------- 1. every level, over the seeds ----------
function sweep(def, label, seeds = SEEDS) {
  const r = { label, n: 0, fails: 0, kinds: {}, bosses: {}, coops: {}, coopSeeds: 0, heals: [], mills: [], roles: {}, tpls: {},
    shrooms: 0, gates: [], shopGate: 0, vault: 0, fork: 0, budget: [], placed: [], lost: [], bossBonus: 0, roomBonus: 0, dealt: [], men: [], maxMen: 0 };
  const shopLevel = TUNING.shop.levels.includes(g('levelIndexOf')(def));
  for (let s = 1; s <= seeds; s++) {
    let lv;
    const seed = (s * 7717) >>> 0;
    try { lv = generateLevel(def, seed); } catch (e) { r.fails++; continue; }
    if (!lv) { r.fails++; continue; }
    r.n++;
    for (const sp of lv.spawns) { const k = kindOf(sp); r.kinds[k] = (r.kinds[k] || 0) + 1; if (sp.boss) r.bosses[k + (sp.elite ? '(elite)' : '')] = (r.bosses[k + (sp.elite ? '(elite)' : '')] || 0) + 1; }
    r.men.push(lv.spawns.length);
    const per = {}; for (const sp of lv.spawns) per[sp.roomIndex || 0] = (per[sp.roomIndex || 0] || 0) + 1;
    r.maxMen = Math.max(r.maxMen, ...Object.values(per), 0);
    const coops = lv.props.filter((p) => p.kind === 'coop');
    if (coops.length) r.coopSeeds++;
    for (const c of coops) r.coops[c.holds] = (r.coops[c.holds] || 0) + 1;
    r.heals.push(lv.props.filter((p) => p.kind === 'heal').length);
    r.mills.push(lv.props.filter((p) => p.kind === 'mill').length);
    if (lv.props.some((p) => p.kind === 'shrooms')) r.shrooms++;
    if (lv.forkTile) r.fork++;
    for (const room of lv.rooms) { r.roles[room.role] = (r.roles[room.role] || 0) + 1; r.tpls[room.tpl.name] = (r.tpls[room.tpl.name] || 0) + 1; }
    r.gates.push((lv.gates || []).length);
    if ((lv.gates || []).some((x) => x.shop)) r.shopGate++;
    if (lv.vault) r.vault++;
    // ---- the souls, exactly as game.startLevel spends them ----
    const bosses = lv.spawns.map((sp, i) => ({ i, room: sp.roomIndex === undefined ? 0 : sp.roomIndex })).filter((b) => lv.spawns[b.i].boss).sort((a, b) => a.room - b.room);
    let soulsHere = def.souls === undefined ? bosses.length + (lv.vault ? 1 : 0) : def.souls;
    if (lv.shop && def.souls !== undefined) soulsHere = Math.max(0, soulsHere - 1);
    let budget = soulsHere, placed = 0;
    for (const gt of (lv.gates || [])) { if (gt.shop || budget <= 0) continue; placed++; budget--; }
    if (lv.vault && budget > 0) { placed++; budget--; }
    const souled = new Set();
    for (let n = bosses.length - 1; n >= 0 && budget > 0; n--) { souled.add(bosses[n].i); placed++; budget--; }
    const luck = new RNG(((seed >>> 0) ^ 0x51ed) >>> 0), S = TUNING.soul;
    const spare = bosses.filter((b) => !souled.has(b.i));
    let extra = 0;
    if (spare.length && luck.chance(S.bossChance)) { luck.int(0, spare.length - 1); r.bossBonus++; extra++; }
    const intro = lv.plan ? lv.plan.introRooms : new Set();
    const fights = lv.rooms.filter((rm) => (rm.role === 'canon' || rm.role === 'mix' || rm.role === 'trap') && !intro.has(rm.index) && (per[rm.index] || 0) >= 2);
    if (fights.length && luck.chance(S.roomChance)) { r.roomBonus++; extra++; }
    r.budget.push(soulsHere); r.placed.push(placed); r.lost.push(soulsHere - placed); r.dealt.push(placed + extra);
    r.shopLevel = shopLevel;
  }
  return r;
}
const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const mm = (a) => a.length ? `${Math.min(...a)}..${Math.max(...a)}` : '-';
const fmt = (r) => {
  const k = Object.entries(r.kinds).map(([k, v]) => `${k} ${(v / r.n).toFixed(1)}`).join(', ');
  const b = Object.entries(r.bosses).map(([k, v]) => `${k} ${(v / r.n).toFixed(2)}`).join(', ');
  return `${r.label}: n=${r.n} fails=${r.fails}\n    kinds/seed: ${k}\n    bosses/seed: ${b}\n    men/seed ${avg(r.men).toFixed(1)}, most in one room ${r.maxMen}` +
    `\n    coops: in ${r.coopSeeds}/${r.n} seeds, holds ${JSON.stringify(r.coops)}` +
    `\n    heal props ${avg(r.heals).toFixed(2)} (${mm(r.heals)}), mills ${avg(r.mills).toFixed(2)} (${mm(r.mills)}), shrooms ${r.shrooms}/${r.n}, fork ${r.fork}/${r.n}` +
    `\n    gates ${mm(r.gates)}, shop gate ${r.shopGate}/${r.n}, vault ${r.vault}/${r.n}` +
    `\n    SOULS budget ${mm(r.budget)}, placed ${mm(r.placed)} avg ${avg(r.placed).toFixed(2)}, lost (budget with no spot) ${avg(r.lost).toFixed(2)}, boss bonus ${r.bossBonus}/${r.n}, room bonus ${r.roomBonus}/${r.n}, dealt avg ${avg(r.dealt).toFixed(2)} (${mm(r.dealt)})` +
    `\n    roles ${JSON.stringify(Object.fromEntries(Object.entries(r.roles).map(([k, v]) => [k, +(v / r.n).toFixed(2)])))}`;
};
const levelRuns = LEVELS.map((d) => sweep(d, d.name));
const darkRun = sweep(DARK, 'THE DARK (fork)');
const tripRuns = [];
for (let li = TUNING.shroom.from + 1; li < LEVELS.length; li++) tripRuns.push(sweep(tripLevel(li), 'TRIP for ' + LEVELS[li].name, 60));
console.log('==== LEVELS (' + LEVELS.length + ') over ' + SEEDS + ' seeds ====');
for (const r of levelRuns) console.log(fmt(r));
console.log(fmt(darkRun));
for (const r of tripRuns) console.log(fmt(r));

// ---------- 2. souls per run ----------
const authored = LEVELS.reduce((a, d, i) => a + (d.souls || 0) - (TUNING.shop.levels.includes(i) ? 1 : 0), 0);
const rawSum = LEVELS.reduce((a, d) => a + (d.souls || 0), 0);
const placedRun = levelRuns.reduce((a, r) => a + avg(r.placed), 0);
const dealtRun = levelRuns.reduce((a, r) => a + avg(r.dealt), 0);
const minRun = levelRuns.reduce((a, r) => a + Math.min(...r.dealt), 0), maxRun = levelRuns.reduce((a, r) => a + Math.max(...r.dealt), 0);
const forkIdx = DARK.darkOf;
const dealtFork = dealtRun - avg(levelRuns[forkIdx].dealt) + avg(darkRun.dealt);
console.log(`\n==== SOULS A RUN ====\n  sum of LEVELS[].souls ${rawSum}; less one per mouse level (${TUNING.shop.levels.length}) = authored ${authored}; placed avg ${placedRun.toFixed(2)}; with seeded surprises dealt avg ${dealtRun.toFixed(2)} (range ${minRun}..${maxRun}); via THE FORK ${dealtFork.toFixed(2)}`);
console.log(`  mice: ${TUNING.shop.levels.map((i) => LEVELS[i].name).join(', ')} (talisman instead of a soul)`);

// ---------- 3. boons ----------
const mods0 = () => Object.assign({}, BOON_BASE);
function modsOf(boons) { const m = mods0(); for (const b of boons) if (b.active) b.apply(m, b.params || {}); for (const b of boons) if (!b.active) b.apply(m, b.params || {}); return m; }
function boonOpen(boons, m, b, li) {
  if (boons.includes(b) || (b.needs && !m[b.needs]) || li < (b.minLevel || 0)) return false;
  if (b.key) return true;
  const cap = !b.skill ? BOON_SLOTS.general : b.active ? BOON_SLOTS.active : BOON_SLOTS.passive;
  return boons.filter((o) => !o.key && o.skill === b.skill && !!o.active === !!b.active).length < cap;
}
// the most a build can hold: greedily fill every slot
function capacity() {
  const skills = [...new Set(BOONS.map((b) => b.skill))];
  let n = 0; const detail = {};
  for (const sk of skills) {
    const A = BOONS.filter((b) => b.skill === sk && b.active && !b.key).length, P = BOONS.filter((b) => b.skill === sk && !b.active).length, K = BOONS.filter((b) => b.skill === sk && b.key).length;
    const c = sk === undefined ? Math.min(P, BOON_SLOTS.general) : Math.min(A, BOON_SLOTS.active) + Math.min(P, BOON_SLOTS.passive) + K;
    detail[String(sk)] = `${c} (actives ${A}, passives ${P}, keys ${K})`; n += c;
  }
  return { n, detail };
}
const cap = capacity();
console.log(`\n==== BOONS ====\n  registry ${BOONS.length} (actives ${BOONS.filter((b) => b.active).length}, passives ${BOONS.filter((b) => !b.active).length}); slots ${JSON.stringify(BOON_SLOTS)}; most one build can hold ${cap.n}: ${JSON.stringify(cap.detail)}`);
// A run's offers, the way openBoonChoice deals them, picking a random card each time.
function simRun(nSouls, rng) {
  const boons = []; let lastActive = false, fallback = 0; const offered = new Set();
  for (let s = 0; s < nSouls; s++) {
    const m = modsOf(boons), li = Math.min(LEVELS.length - 1, Math.floor(s / 2));
    const actives = BOONS.filter((b) => b.active && boonOpen(boons, m, b, li)), passives = BOONS.filter((b) => !b.active && boonOpen(boons, m, b, li));
    if (!actives.length && !passives.length) { fallback++; continue; }
    const shut = !m.grabMen || !(m.screamStun || m.breath || m.spit), hasActive = boons.some((b) => b.active);
    let pool, other;
    if (actives.length && (!hasActive || (shut ? rng() < 0.75 : !lastActive))) { pool = actives.slice(); other = passives.slice(); lastActive = true; }
    else if (passives.length) { pool = passives.slice(); other = actives.slice(); lastActive = false; }
    else { pool = actives.slice(); other = []; lastActive = true; }
    const pick = [];
    while (pick.length < 3 && pool.length) pick.push(pool.splice((rng() * pool.length) | 0, 1)[0]);
    while (pick.length < 3 && other.length) pick.push(other.splice((rng() * other.length) | 0, 1)[0]);
    for (const p of pick) offered.add(p.id);
    boons.push(pick[(rng() * pick.length) | 0]);
  }
  return { held: boons.length, fallback, offered };
}
let seedv = 12345; const rnd = () => { seedv = (seedv * 1664525 + 1013904223) >>> 0; return seedv / 4294967296; };
for (const n of [13, Math.round(dealtRun), 25]) {
  const R = 2000; let held = 0, fb = 0, fbRuns = 0; const off = {};
  for (let i = 0; i < R; i++) { const x = simRun(n, rnd); held += x.held; fb += x.fallback; if (x.fallback) fbRuns++; for (const id of x.offered) off[id] = (off[id] || 0) + 1; }
  const never = BOONS.filter((b) => !off[b.id]).map((b) => b.id);
  const rare = BOONS.map((b) => [b.id, off[b.id] || 0]).sort((a, b) => a[1] - b[1]).slice(0, 5).map(([k, v]) => `${k} ${(v / R * 100).toFixed(0)}%`);
  console.log(`  ${n} souls: holds ${(held / R).toFixed(1)} boons, ${(fb / R).toFixed(2)} souls/run fall back to +1 heart (in ${(fbRuns / R * 100).toFixed(0)}% of runs); never offered: [${never}]; least offered (share of runs): ${rare.join(', ')}`);
}
// mods each boon's `needs` names: does anything set it?
for (const b of BOONS.filter((b) => b.needs)) {
  const setters = BOONS.filter((o) => { const m = mods0(); const before = m[b.needs]; o.apply(m, o.params || {}); return !before && m[b.needs]; }).map((o) => o.id);
  console.log(`  ${b.id} needs ${b.needs}: set by [${setters}]`);
}

// ---------- 4. talismans ----------
console.log(`\n==== TALISMANS (ARTIFACTS ${ARTIFACTS.length}) ====`);
const tierOf = (li) => { const v = TUNING.shop.levels.filter((l) => l <= li).length; return Math.max(1, Math.min(3, v)); };
console.log(`  shop levels ${TUNING.shop.levels.map((i) => LEVELS[i].name + '→tier ' + tierOf(i)).join(', ')}; wares ${TUNING.shop.wares}; crow gift tier ${TUNING.prop.crow.giftTier}`);
const seen = {}; let pairQ = 0, R = 0;
for (const li of TUNING.shop.levels) for (let s = 1; s <= 4000; s++) {
  const st = stockFor(LEVELS[li], new RNG(s * 131 + li)); R++;
  for (const w of st) { seen[w.id] = seen[w.id] || {}; seen[w.id][w.tier] = (seen[w.id][w.tier] || 0) + 1; }
  const ids = st.map((w) => w.id); if (['boomerang', 'symbols', 'effigy'].filter((q) => ids.includes(q)).length > 1) pairQ++;
}
const neverShelved = ARTIFACTS.filter((a) => !seen[a.id]).map((a) => a.id);
console.log(`  shelves rolled ${R}; never shelved: [${neverShelved}]; each id's share of shelves: ` + ARTIFACTS.map((a) => `${a.id} ${((Object.values(seen[a.id] || {}).reduce((x, y) => x + y, 0)) / R * 100).toFixed(1)}%`).join(', '));
console.log(`  shelves offering two Q verbs at once (boomerang/symbols/effigy): ${(pairQ / R * 100).toFixed(1)}%`);
const TZ = ['mason', 'domino', 'echo', 'spade', 'grease', 'awl', 'mask', 'effigy', 'spur', 'moth', 'bell', 'sandal', 'scapegoat', 'tallow', 'mirror', 'cup', 'tally'];
console.log(`  ARTIFACTS_TZ.md ids ${TZ.length}; in registry ${TZ.filter((id) => ARTIFACTS.some((a) => a.id === id)).length}; missing [${TZ.filter((id) => !ARTIFACTS.some((a) => a.id === id))}]; extra (older) [${ARTIFACTS.filter((a) => !TZ.includes(a.id)).map((a) => a.id)}]`);
// tiers each id can be met at in a run: mice + crow
const crowLevels = LEVELS.map((d, i) => (d.beasts || []).includes('crow') ? i : -1).filter((i) => i >= 0);
console.log(`  crow on levels [${crowLevels.map((i) => LEVELS[i].name)}]${(DARK.beasts || []).includes('crow') ? ' + THE DARK' : ''}; a crow saved on the last level (${LEVELS[LEVELS.length - 1].name}) has no next stairs`);
// hooks: every key an artifact's apply writes, and whether any other file reads mods.<key>
const src = fs.readdirSync(path.join(L.ROOT, 'js')).filter((f) => f.endsWith('.js') && !/assets/.test(f) && f !== 'tuning.js').map((f) => fs.readFileSync(path.join(L.ROOT, 'js', f), 'utf8')).join('\n');
const unread = [];
for (const a of [...ARTIFACTS, ...BOONS]) {
  const keys = [...new Set([...a.apply.toString().matchAll(/\bm\.([A-Za-z_]\w*)\s*(?:=|\+=|\*=|-=)/g)].map((x) => x[1]))];
  const miss = keys.filter((k) => !new RegExp('mods\\.' + k + '\\b|mods\\[\\s*[\'"]' + k + '|\\b' + k + '\\b').test(src));
  if (miss.length) unread.push(`${a.id}: ${miss}`);
}
console.log(`  mods written by an apply that no other js file names: ${unread.length ? unread.join(' | ') : 'none'}`);

// ---------- 5. escorts ----------
console.log(`\n==== ESCORTS ====\n  Beast.KINDS [${Beast.KINDS}] + chicken (Prop.updateBird); BEAST_CARD [${Object.keys(g('BEAST_CARD'))}]`);
const promised = {}; LEVELS.forEach((d, i) => (d.beasts || []).forEach((k) => { promised[k] = promised[k] || []; promised[k].push(d.name); }));
console.log('  levelDef.beasts: ' + JSON.stringify(promised));
for (const r of [...levelRuns, darkRun]) console.log(`  ${r.label}: coops in ${r.coopSeeds}/${r.n}, ${JSON.stringify(r.coops)}`);

// ---------- 6. rooms: templates built vs drawn ----------
const drawn = {}; for (const r of [...levelRuns, darkRun, ...tripRuns]) for (const [k, v] of Object.entries(r.tpls)) drawn[k] = (drawn[k] || 0) + v;
const names = ROOM_TEMPLATES.map((t) => t.name);
const neverDrawn = ROOM_TEMPLATES.filter((t) => !drawn[t.name]).map((t) => `${t.name}${t.canon ? '[canon ' + t.canon + ']' : ''}${t.tag ? '[tag ' + t.tag + ']' : ''}${t.needs ? '[needs ' + t.needs + ']' : ''}`);
const canonCount = {}; for (const t of ROOM_TEMPLATES) if (t.canon) canonCount[t.canon] = (canonCount[t.canon] || 0) + 1;
console.log(`\n==== ROOMS ====\n  ROOM_TEMPLATES ${ROOM_TEMPLATES.length} (dup names: ${names.length - new Set(names).size}); per canon ${JSON.stringify(canonCount)}; minRooms ${g('CANON').minRooms}`);
console.log(`  never drawn over ${SEEDS} seeds x ${LEVELS.length} levels + THE DARK + trips: [${neverDrawn.join(', ')}]`);
const rare = ROOM_TEMPLATES.filter((t) => drawn[t.name] && drawn[t.name] < SEEDS * 0.05).map((t) => `${t.name} ${drawn[t.name]}`);
console.log(`  drawn fewer than ${SEEDS * 0.05} times in all: [${rare.join(', ')}]`);
fs.writeFileSync(path.join(__dirname, 'probe-out.json'), JSON.stringify({ levelRuns, darkRun, tripRuns, drawn }, (k, v) => v instanceof Set ? [...v] : v));
