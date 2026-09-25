// Design-drift scan: numbers the docs state, held against the value the code pays.
// node claims.js [docDir]   (docDir defaults to the project; pass a scratch copy to prove a mutation is caught)
const fs = require('fs'), path = require('path');
const { load, root } = require('./load.js');
const g = load(['js/tuning.js', 'js/rng.js', 'js/rooms.js', 'js/gen.js', 'js/rules.js']);
const docDir = process.argv[2] || root;
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, 'twenty-one': 21, first: 1, second: 2, third: 3, fourth: 4, fifth: 5 };
const num = (s) => { const k = s.toLowerCase(); return k in WORDS ? WORDS[k] : parseFloat(k); };
const N = '(\\d+(?:\\.\\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|twenty-one)';
const ORDN = '(first|second|third|fourth|fifth)';
const T = () => g('TUNING');
const shopNet = () => { const L = g('LEVELS'), s = T().shop.levels; return L.reduce((a, d, i) => a + (d.souls || 0) - (s.includes(i) ? 1 : 0), 0); };
const lv = (name) => g('LEVELS').find((l) => l.name === name);
// [doc, what, regex with one number group, code truth (fn), tolerance (fraction of truth), truth source]
const C = [
  ['README.md', 'levels in the game (intro)', `\\b${N} levels, one life`, () => g('LEVELS').length, 0, 'LEVELS.length'],
  ['README.md', 'levels in the game (What is in)', `\\*\\*${N} levels\\.\\*\\*`, () => g('LEVELS').length, 0, 'LEVELS.length'],
  ['README.md', 'pen blows, first time', `${N} blows the first time`, () => T().prop.cage.hits, 0, 'TUNING.prop.cage.hits'],
  ['README.md', 'pen blows, every run after', `Every run after that, ${N}`, () => T().prop.cage.againHits, 0, 'TUNING.prop.cage.againHits'],
  ['README.md', 'pen blows (A pen, not an altar)', `${N} headbutts take the bars apart`, () => T().prop.cage.hits, 0, 'TUNING.prop.cage.hits'],
  ['README.md', 'hearts', `${N} hearts, no regeneration`, () => T().goat.hp, 0, 'TUNING.goat.hp'],
  ['README.md', 'Great Hall width', `one room ${N} by \\d+ tiles`, () => g('GREAT_HALL_TEMPLATE').rows[0].length, 0, 'GREAT_HALL_TEMPLATE'],
  ['README.md', 'Great Hall height', `one room \\d+ by ${N} tiles`, () => g('GREAT_HALL_TEMPLATE').rows.length, 0, 'GREAT_HALL_TEMPLATE'],
  ['README.md', 'enemy types', `\\*\\*${N} enemy types`, () => Object.keys(g('THREAT')).length, 0, 'THREAT keys'],
  ['README.md', 'brute blows', `take ${N} killing blows`, () => T().champion.hp, 0, 'TUNING.champion.hp'],
  ['README.md', 'Butcher hits', `the Butcher, who takes ${N} hits`, () => T().butcher.hp, 0, 'TUNING.butcher.hp'],
  ['README.md', 'souls on level one', `authored number of souls\\*\\* — ${N} on the first`, () => g('LEVELS')[0].souls, 0, 'LEVELS[0].souls'],
  ['README.md', 'stands in a boss room', `always ${N} in a boss room`, () => g('ARENA_TEMPLATE').rows.join('').split('w').length - 1, 0, "ARENA_TEMPLATE 'w' count"],
  ['README.md', 'carried shield turns bullets', `a shield turns ${N} bullets`, () => T().prop.weapon.uses.shield, 0, 'TUNING.prop.weapon.uses.shield'],
  ['README.md', 'milk per level (fewest)', `\\*\\*${N} milk bowls per level`, () => Math.min(...g('LEVELS').map((l) => Math.max(l.heals || 0, Math.ceil((l.rooms - 1) / T().prop.heal.every)))), 0, 'max(heals, ceil((rooms-1)/heal.every)), fewest over levels'],
  ['README.md', 'shield worth (Stands of arms)', `a shield is worth ${N} men or`, () => T().prop.weapon.uses.shield, 0, 'TUNING.prop.weapon.uses.shield'],
  ['CONCEPT.md', 'goat accel', `Momentum-heavy: ${N} s to top speed`, () => T().goat.accel, 0, 'TUNING.goat.accel'],
  ['CONCEPT.md', 'goat decel', `s to top speed, ${N} s to stop`, () => T().goat.decel, 0, 'TUNING.goat.decel'],
  ['CONCEPT.md', 'headbutt windup', `lunge, ${N} s windup`, () => T().goat.headbutt.windup, 0, 'TUNING.goat.headbutt.windup'],
  ['CONCEPT.md', 'headbutt recovery', `windup, ${N} s recovery`, () => T().goat.headbutt.recovery, 0, 'TUNING.goat.headbutt.recovery'],
  ['CONCEPT.md', 'grab cooldown', `empty for about ${N} s`, () => T().goat.grab.cooldown, 0.05, 'TUNING.goat.grab.cooldown'],
  ['CONCEPT.md', 'roll cooldown', `about ${N} s before the next one`, () => T().goat.roll.cooldown, 0.05, 'TUNING.goat.roll.cooldown'],
  ['CONCEPT.md', 'bearer windup', `Melee\\. ${N} s windup`, () => T().bearer.windup, 0, 'TUNING.bearer.windup'],
  ['CONCEPT.md', 'brute blows', `built twice over: ${N} killing blows`, () => T().champion.hp, 0, 'TUNING.champion.hp'],
  ['CONCEPT.md', 'brute arena blows', `killing blows, ${N} when he is the one in the arena`, () => T().champion.bossHp, 0, 'TUNING.champion.bossHp'],
  ['CONCEPT.md', 'seer blink distance', `blinks ${N} tiles clear`, () => T().seer.blinkDist, 0.1, 'TUNING.seer.blinkDist'],
  ['CONCEPT.md', 'seer blink trigger', `if you get within ${N}\\.`, () => T().seer.blinkRange, 0.1, 'TUNING.seer.blinkRange'],
  ['CONCEPT.md', 'seer hp', `Takes ${N} of anything`, () => T().seer.hp, 0, 'TUNING.seer.hp'],
  ['CONCEPT.md', 'hunter keep min', `Keeps ${N} to \\w+ tiles away`, () => T().hunter.keepMin, 0, 'TUNING.hunter.keepMin'],
  ['CONCEPT.md', 'hunter keep max', `Keeps \\w+ to ${N} tiles away`, () => T().hunter.keepMax, 0, 'TUNING.hunter.keepMax'],
  ['CONCEPT.md', 'hunter aim', `aims for ${N} s`, () => T().hunter.aimTime, 0, 'TUNING.hunter.aimTime'],
  ['CONCEPT.md', 'Butcher hits', `\\*\\*Butcher\\*\\* \\| Heavy\\. ${N} hits`, () => T().butcher.hp, 0, 'TUNING.butcher.hp'],
  ['CONCEPT.md', 'arena bosses absorb', `they absorb ${N} hits`, () => T().elite.hp, 0, 'TUNING.elite.hp (Butcher bosses are not elite and keep 4, gen.js:770)'],
  ['CONCEPT.md', 'cap: mages', `room readable: ${N} mage`, () => g('ENCOUNTER').cap.seer, 0, 'ENCOUNTER.cap.seer'],
  ['CONCEPT.md', 'cap: rifles', `one champion, ${N} rifles`, () => g('ENCOUNTER').cap.hunter, 0, 'ENCOUNTER.cap.hunter'],
  ['CONCEPT.md', 'cap: men', `rifles, ${N} men\\.`, () => g('ENCOUNTER').cap.men, 0, 'ENCOUNTER.cap.men'],
  ['CONCEPT.md', 'levels (Levels section)', `^${N} levels\\. Every level`, () => g('LEVELS').length, 0, 'LEVELS.length'],
  ['CONCEPT.md', 'killbox levels', `late on the ${N} levels that have rifles`, () => g('LEVELS').filter((l) => l.killboxAt != null).length, 0, 'LEVELS with killboxAt'],
  ['CONCEPT.md', 'rooms THE ALTAR', `\\*\\*THE ALTAR\\*\\* \\| ${N} \\|`, () => lv('THE ALTAR').rooms, 0, 'LEVELS[THE ALTAR].rooms'],
  ['CONCEPT.md', 'rooms THE YARD', `\\*\\*THE YARD\\*\\* \\| ${N} \\|`, () => lv('THE YARD').rooms, 0, 'LEVELS[..].rooms'],
  ['CONCEPT.md', 'rooms THE ROAD', `\\*\\*THE ROAD\\*\\* \\| ${N} \\|`, () => lv('THE ROAD').rooms, 0, 'LEVELS[..].rooms'],
  ['CONCEPT.md', 'rooms THE THRESHING FLOOR', `\\*\\*THE THRESHING FLOOR\\*\\* \\| ${N} \\|`, () => lv('THE THRESHING FLOOR').rooms, 0, 'LEVELS[..].rooms'],
  ['CONCEPT.md', 'rooms THE BRIDGE', `\\*\\*THE BRIDGE\\*\\* \\| ${N} \\|`, () => lv('THE BRIDGE').rooms, 0, 'LEVELS[..].rooms'],
  ['CONCEPT.md', 'rooms THE RAFTERS', `\\*\\*THE RAFTERS\\*\\* \\| ${N} \\|`, () => lv('THE RAFTERS').rooms, 0, 'LEVELS[..].rooms'],
  ['CONCEPT.md', 'rooms THE OSSUARY', `\\*\\*THE OSSUARY\\*\\* \\| ${N} \\|`, () => lv('THE OSSUARY').rooms, 0, 'LEVELS[..].rooms'],
  ['CONCEPT.md', 'rooms THE CAVE', `\\*\\*THE CAVE\\*\\* \\| ${N} \\|`, () => lv('THE CAVE').rooms, 0, 'LEVELS[..].rooms'],
  ['CONCEPT.md', 'Great Hall width', `single room ${N} by \\d+ tiles`, () => g('GREAT_HALL_TEMPLATE').rows[0].length, 0, 'GREAT_HALL_TEMPLATE'],
  ['CONCEPT.md', 'stair door blows', `iron door in front of its stairs: ${N} blows`, () => T().prop.door.stairHits, 0, 'TUNING.prop.door.stairHits'],
  ['CONCEPT.md', 'pen blows', `${N} blows anywhere on your`, () => T().prop.cage.hits, 0, 'TUNING.prop.cage.hits'],
  ['CONCEPT.md', 'brazier rebuild', `bowl takes ${N} seconds to build`, () => T().prop.brazier.spillCd, 0, 'TUNING.prop.brazier.spillCd'],
  ['CONCEPT.md', 'door blows', `Doors\\*\\* block corridors and take ${N} blows`, () => T().prop.door.hits, 0, 'TUNING.prop.door.hits (iron 3, vault 4)'],
  ['CONCEPT.md', 'spikes from level', `Spike floors\\*\\*, from the ${ORDN} level on`, () => 1 + g('LEVELS').findIndex((l) => l.spikes > 0), 0, 'first LEVELS entry with spikes > 0'],
  ['CONCEPT.md', 'shield worth', `A shield is worth ${N}`, () => T().prop.weapon.uses.shield, 0, 'TUNING.prop.weapon.uses.shield'],
  ['CONCEPT.md', 'souls on level one', `authored number of them\\*\\*: ${N} on level one`, () => g('LEVELS')[0].souls, 0, 'LEVELS[0].souls'],
  ['CONCEPT.md', 'souls a run (budget)', `, ${N} across a run against`, shopNet, 0, 'sum(LEVELS.souls) minus one per shop level (game.js:1235)'],
  ['CONCEPT.md', 'boons in the deck', `across a run against ${N} boons`, () => g('BOONS').length, 0, 'BOONS.length'],
  ['CONCEPT.md', 'combo window', `Kills inside ${N} s of each other`, () => T().juice.comboWindow, 0, 'TUNING.juice.comboWindow'],
  ['CLAUDE.md', 'souls per level', `\`levelDef.souls\` = ${N}`, () => g('LEVELS')[0].souls, 0, 'LEVELS[*].souls'],
  ['CLAUDE.md', 'artifacts', `\`ARTIFACTS\`: ${N}, three tiers`, () => g('ARTIFACTS').length, 0, 'ARTIFACTS.length'],
  ['CLAUDE.md', 'talismans (file map)', `the ${N} talismans from`, () => g('ARTIFACTS').length - 4, 0, 'ARTIFACTS.length - 4 original'],
  ['CLAUDE.md', 'canon min rooms', `\`CANON.minRooms\` \\(${N}\\)`, () => g('CANON').minRooms, 0, 'CANON.minRooms'],
  ['CLAUDE.md', 'secret hits', `\`TUNING.prop.secret.hits\` \\(${N}\\)`, () => T().prop.secret.hits, 0, 'TUNING.prop.secret.hits'],
  ['CLAUDE.md', 'stair hits', `\`stairHits\` ${N}`, () => T().prop.door.stairHits, 0, 'TUNING.prop.door.stairHits'],
  ['CLAUDE.md', 'vault hits', `\`vaultHits\` ${N}`, () => T().prop.door.vaultHits, 0, 'TUNING.prop.door.vaultHits'],
  ['CLAUDE.md', 'clock door time', `shuts on \`clockEase\` at ${N} s`, () => T().score.perRoom, 0, 'TUNING.score.perRoom'],
  ['CLAUDE.md', 'spike run min', `\`spike.run\` \\(${N}–\\d+ per room`, () => T().prop.spike.run[0], 0, 'TUNING.prop.spike.run[0]'],
  ['CLAUDE.md', 'boon slots active', `\`BOON_SLOTS\` \\(${N} active`, () => g('BOON_SLOTS').active, 0, 'BOON_SLOTS.active'],
  ['CLAUDE.md', 'shop wares', `${N} \`ware\`s \`shop.spread\` apart`, () => T().shop.wares + 1, 0, 'TUNING.shop.wares + the pail'],
  ['MUSIC.md', 'bpm', `one ${N} BPM clock`, () => 118, 0, 'audio.js:189 this.bpm'],
  ['MUSIC.md', 'family cap', `original cap of ${N} enemies per family`, () => T().audio.layers.maxPerFamily, 0, 'TUNING.audio.layers.maxPerFamily'],
  ['MUSIC.md', 'pursuit radius (tiles)', `pursuers within ${N} tiles`, () => T().audio.layers.pursuitRadius / g('TILE'), 0, 'layers.pursuitRadius / TILE'],
  ['MUSIC.md', 'fade seconds', `note gains ease over ${N} seconds`, () => T().audio.layers.fadeSeconds, 0, 'layers.fadeSeconds'],
  ['MUSIC.md', 'queue cap', `queue is capped at ${N} entries`, () => T().audio.layers.eventQueueCap, 0, 'layers.eventQueueCap'],
  ['MUSIC.md', 'grass radius (tiles)', `grass within ${N} tiles`, () => T().audio.layers.grassRadius / g('TILE'), 0, 'layers.grassRadius / TILE'],
  ['MUSIC.md', 'grass voices', `up to ${N} patches`, () => T().audio.layers.grassVoices, 0, 'layers.grassVoices'],
  ['MUSIC.md', 'late theme from level', `levels ${N}\\+ have a second progression`, () => T().audio.layers.lateFromLevel, 0, 'layers.lateFromLevel'],
  ['MUSIC.md', 'spotted bars', `begins \\*\\*${N} bars of spotted`, () => T().audio.layers.spottedBars, 0, 'layers.spottedBars'],
  ['MUSIC.md', 'mill cap', `Mills cap at ${N}`, () => T().audio.layers.maxMills, 0, 'layers.maxMills'],
  ['tuning.js (comment over LEVELS)', 'souls a run', `is ${N} across a run against`, shopNet, 0, 'sum(LEVELS.souls) minus shop levels'],
  ['tuning.js (comment over LEVELS)', 'boons', `across a run against ${N} boons`, () => g('BOONS').length, 0, 'BOONS.length'],
  ['JUICE.md', 'rumble longest (ms)', `\\| \\d+–${N} ms \\|`, () => 80, 0, 'largest vibe(n) in js/*.js (grep: 80, game.js:2272)'],
  ['JUICE.md', 'rumble shortest (ms)', `\\| ${N}–\\d+ ms \\|`, () => 6, 0, 'smallest vibe(n) in js/*.js (grep: 6)'],
];
const docs = {};
const text = (d) => docs[d] || (docs[d] = d.startsWith('tuning.js') ? fs.readFileSync(path.join(root, 'js/tuning.js'), 'utf8') : fs.readFileSync(path.join(docDir, d), 'utf8'));
let found = 0, bad = 0; const rows = [];
const entities = new Set(C.map((c) => c[0] + '|' + c[1].replace(/ \(.*\)$/, '')));
for (const [doc, what, re, truth, tol, src] of C) {
  const t = text(doc).replace(/\r\n/g, '\n'), m = new RegExp(re.replace(/ /g, '\\s+'), 'mi').exec(t);
  if (!m) { rows.push(['NOT FOUND', doc, what, '', '', src]); continue; }
  found++;
  const raw = m.slice(1).find((x) => x !== undefined);
  const said = num(raw);
  const line = t.slice(0, m.index).split('\n').length;
  const v = truth(); const ok = Math.abs(said - v) <= Math.abs(v) * tol + 1e-9;
  if (!ok) bad++;
  rows.push([ok ? 'ok' : 'CONFLICT', `${doc}:${line}`, what, raw, +v.toFixed(3), src]);
}
for (const r of rows) console.log(r.join(' | '));
console.log(`claims ${C.length}, located ${found}, compared ${found}, conflicts ${bad}`);
