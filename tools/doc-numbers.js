// The docs' numbers, held against the numbers the code pays — the way `balance.js` holds the
// generator to its promises. A document read by a player or by the next session that says "six
// levels" or "three blows" while the build deals eight and seven teaches the wrong game; on 24 Sep
// 2026 a one-off scan found 28 such sentences, some wrong for eight releases.
//
//   node tools/doc-numbers.js     every claim below: OK, WRONG (exit 1) or GONE (the sentence moved)
//
// A claim is a sentence pattern with one number in it, where it lives, and the value it must match
// (read off TUNING, LEVELS and the rest, never typed in). GONE is a warning: rewrite the pattern to
// the new sentence, or drop the claim if the doc no longer says it. Words count as numbers.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(__dirname, '..');
const ctx = { console, Math, Uint8Array, Int16Array, Int32Array, Float32Array };
vm.createContext(ctx);
for (const f of ['js/tuning.js', 'js/rng.js', 'js/rooms.js', 'js/gen.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const g = (name) => vm.runInContext(name, ctx);
const T = g('TUNING'), LEVELS = g('LEVELS');

const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, 'twenty-one': 21, 'twenty-two': 22, 'twenty-three': 23, 'twenty-four': 24, 'twenty-five': 25,
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 };
const N = '(\\d+(?:\\.\\d+)?|' + Object.keys(WORDS).sort((a, b) => b.length - a.length).join('|') + ')';
const num = (s) => { const k = s.toLowerCase(); return k in WORDS ? WORDS[k] : parseFloat(k); };
const lv = (name) => LEVELS.find((l) => l.name === name);
const slots = () => {
  const S = g('BOON_SLOTS'), n = {};
  for (const b of g('BOONS')) { const k = b.key ? 'key' : (b.skill || '') + (b.active ? 'A' : 'P'); n[k] = (n[k] || 0) + 1; }
  let c = n.key || 0;
  for (const [k, v] of Object.entries(n)) if (k !== 'key') c += Math.min(v, k.length === 1 ? S.general : k.endsWith('A') ? S.active : S.passive);
  return c;
};

// [file, what, pattern (one number group; case-insensitive), truth, tolerance as a fraction of it]
const CLAIMS = [
  ['README.md', 'floors', `${N} floors, one life on each`, () => LEVELS.length],
  ['README.md', 'floors (What is in)', `\\*\\*${N} floors, each built round one idea`, () => LEVELS.length],
  ['README.md', 'pen blows, the first time', `${N} blows the first time ever`, () => T.prop.cage.hits],
  ['README.md', 'pen blows, every run after', `Every run after that, ${N}`, () => T.prop.cage.againHits],
  ['README.md', 'hearts', `${N} hearts, no regeneration`, () => T.goat.hp],
  ['README.md', 'hearts on EASY MODE', `\\(${N} on EASY MODE\\)`, () => T.goat.hp + g('EASY').maxHp],
  ['README.md', 'enemy types', `\\*\\*${N} enemy types`, () => Object.keys(g('THREAT')).length],
  ['README.md', 'brute blows', `who take ${N}\\s+killing blows`, () => T.champion.hp],
  ['README.md', 'ogre hits', `half-beast, who takes ${N}`, () => T.butcher.hp],
  ['README.md', 'souls a floor', `\\*\\*Souls\\.\\*\\* ${N} on every floor`, () => LEVELS[1].souls],
  ['README.md', 'talismans', `\\*\\*Talismans\\.\\*\\* ${N} of them`, () => g('ARTIFACTS').length],
  ['README.md', 'mouse strikes', `after the ${N} time is not a mouse`, () => T.shop.strikes],
  ['CONCEPT.md', 'goat: to top speed', `Momentum-heavy: ${N} s to top speed`, () => T.goat.accel],
  ['CONCEPT.md', 'goat: to stop', `s to top speed, ${N} s to stop`, () => T.goat.decel],
  ['CONCEPT.md', 'headbutt windup', `lunge, ${N} s windup`, () => T.goat.headbutt.windup],
  ['CONCEPT.md', 'headbutt recovery', `windup, ${N} s recovery`, () => T.goat.headbutt.recovery],
  ['CONCEPT.md', 'mouth empty after a throw', `empty for about ${N} s`, () => T.goat.grab.cooldown, 0.08],
  ['CONCEPT.md', 'roll cooldown', `about ${N} s before the next one`, () => T.goat.roll.cooldown, 0.08],
  ['CONCEPT.md', 'hearts', `^${N} hearts, no regeneration`, () => T.goat.hp],
  ['CONCEPT.md', 'brute blows', `built twice over: ${N} killing blows`, () => T.champion.hp],
  ['CONCEPT.md', 'brute blows in the ring', `killing blows, ${N} when he is the one in the arena`, () => T.champion.bossHp],
  ['CONCEPT.md', 'seer blink distance', `blinks ${N} tiles clear`, () => T.seer.blinkDist, 0.15],
  ['CONCEPT.md', 'seer blink trigger', `if you get within ${N}\\.`, () => T.seer.blinkRange, 0.15],
  ['CONCEPT.md', 'seer takes', `Takes ${N} of anything`, () => T.seer.hp],
  ['CONCEPT.md', 'rifle keeps at least', `Keeps ${N} to \\w+ tiles away`, () => T.hunter.keepMin],
  ['CONCEPT.md', 'rifle keeps at most', `Keeps \\w+ to ${N} tiles away`, () => T.hunter.keepMax],
  ['CONCEPT.md', 'ogre hits', `Nothing knocks him back\\. ${N} hits`, () => T.butcher.hp],
  ['CONCEPT.md', 'elite hits', `in the ring absorbs ${N} hits`, () => T.elite.hp],
  ['CONCEPT.md', 'brute in the ring', `a brute in the ring takes ${N}`, () => T.champion.bossHp],
  ['CONCEPT.md', 'cap: mages', `room readable: one\\s+mage|room readable: ${N}\\s+mage`, () => g('ENCOUNTER').cap.seer],
  ['CONCEPT.md', 'cap: rifles', `one champion, ${N} rifles`, () => g('ENCOUNTER').cap.hunter],
  ['CONCEPT.md', 'cap: men', `rifles, ${N} men`, () => g('ENCOUNTER').cap.men],
  ['CONCEPT.md', 'floors', `^${N} floors, and two more`, () => LEVELS.length],
  ['CONCEPT.md', 'killbox floors', `late on the ${N} floors that have rifles`, () => LEVELS.filter((l) => l.killboxAt != null).length],
  ...LEVELS.map((l) => ['CONCEPT.md', 'rooms, ' + l.name, `\\| \\*\\*${l.name}\\*\\* \\| ${N} \\|`, () => l.rooms]),
  ['CONCEPT.md', 'rooms, THE DARK', `\\*\\*THE DARK\\*\\* \\| ${N} \\|`, () => g('DARK_LEVEL').rooms],
  ['CONCEPT.md', 'Great Hall width', `a single room ${N} by \\d+ tiles`, () => g('GREAT_HALL_TEMPLATE').rows[0].length],
  ['CONCEPT.md', 'Great Hall height', `a single room \\d+ by ${N} tiles`, () => g('GREAT_HALL_TEMPLATE').rows.length],
  ['CONCEPT.md', 'stairs door blows', `iron door in front of its stairs: ${N} blows`, () => T.prop.door.stairHits],
  ['CONCEPT.md', 'iron door blows', `an iron one \\(from THE YARD on\\) takes\\s+${N}`, () => T.prop.door.ironHits],
  ['CONCEPT.md', 'pen blows', `The pen\\*\\* in the first room takes ${N} blows`, () => T.prop.cage.hits],
  ['CONCEPT.md', 'pen blows (first room)', `${N} blows anywhere on your`, () => T.prop.cage.hits],
  ['CONCEPT.md', 'dead cage blows', `cage with a sheep in it that stopped waiting a while ago — ${N} blows`, () => T.prop.deadCage.hits],
  ['CONCEPT.md', 'souls a run', `— ${N} across a run`, () => LEVELS.reduce((a, d, i) => a + (d.souls || 0) - (T.shop.levels.includes(i) ? 1 : 0), 0)],
  ['CONCEPT.md', 'boons', `against ${N} boons`, () => g('BOONS').length],
  ['CONCEPT.md', 'cards a build holds', `a build that holds ${N}`, slots],
  ['CONCEPT.md', 'kill streak window', `Kills inside ${N} s of each other stack`, () => T.juice.comboWindow || T.combo && T.combo.window, 0.05],
  ['CLAUDE.md', 'artifacts', `\`ARTIFACTS\`: ${N}, three tiers`, () => g('ARTIFACTS').length],
  ['CLAUDE.md', 'souls a floor', `\`levelDef.souls\` = ${N}`, () => LEVELS[1].souls],
  ['CLAUDE.md', 'canon minimum', `A canon needs \`CANON.minRooms\` \\(${N}\\)`, () => g('CANON').minRooms],
];

let wrong = 0, gone = 0, ok = 0;
const text = {};
for (const [file, what, pat, truth, tol = 0] of CLAIMS) {
  const src = text[file] || (text[file] = fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n'));
  const re = new RegExp(pat, 'im'), m = src.match(re);
  if (!m) { gone++; console.log(`GONE   ${file}: ${what} — the sentence it reads is not there any more`); continue; }
  const said = m.slice(1).find((x) => x !== undefined), want = truth();
  if (said === undefined) { ok++; continue; }   // an alternative with no number in it matched
  if (want === undefined || want === null || Number.isNaN(want)) { gone++; console.log(`GONE   ${file}: ${what} — the code no longer has the value it names`); continue; }
  const n = num(said), line = src.slice(0, m.index).split('\n').length;
  if (Math.abs(n - want) > Math.abs(want) * tol + 1e-9) { wrong++; console.log(`WRONG  ${file}:${line}: ${what} — says ${said}, the code pays ${+(+want).toFixed(3)}`); }
  else ok++;
}
console.log(`${ok} right, ${wrong} wrong, ${gone} gone, of ${CLAIMS.length}`);
process.exit(wrong ? 1 : 0);
