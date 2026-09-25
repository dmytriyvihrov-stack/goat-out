// Read-only probe of Goat out for the playtest go/no-go. Writes nothing to the project.
const fs = require('fs'), vm = require('vm'), path = require('path'), { execSync } = require('child_process');
const ROOT = process.argv[2];
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const out = (k, v) => console.log(`## ${k}\n${typeof v === 'string' ? v : JSON.stringify(v, null, 1)}\n`);

// A. syntax, every js/ and tools/ file
const files = [...fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f),
  ...fs.readdirSync(path.join(ROOT, 'tools')).filter(f => /\.(c?js)$/.test(f)).map(f => 'tools/' + f)];
const syntaxFails = [];
for (const f of files) { try { execSync(`node --check "${path.join(ROOT, f)}"`, { stdio: 'pipe' }); } catch (e) { syntaxFails.push(f); } }
out('A syntax', { checked: files.length, fails: syntaxFails });

// B. the payload a zip would carry: index.html + every script it loads
const srcsOf = (f) => (rd(f).match(/<script src="([^"]+)"><\/script>/g) || []).map(s => s.match(/src="([^"]+)"/)[1]);
const srcs = srcsOf('index.html'), artSrcs = srcsOf('artifact.html');
const onDisk = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f);
const caseBad = srcs.filter(s => !onDisk.includes(s));
const unloaded = onDisk.filter(f => !srcs.includes(f));
let total = fs.statSync(path.join(ROOT, 'index.html')).size, largest = ['index.html', total];
const hits = { absPath: [], relAsset: [], external: [], fetch: [] };
const absRe = new RegExp('[A-Z]:\\\\\\\\|Google Диск|file://');
for (const s of srcs) {
  const p = path.join(ROOT, s), sz = fs.statSync(p).size, t = fs.readFileSync(p, 'utf8');
  total += sz; if (sz > largest[1]) largest = [s, sz];
  if (absRe.test(t)) hits.absPath.push(s);
  const rel = t.match(/['"`](?:\.\/)?(?:assets|tools|output)\/[^'"`]+['"`]/g); if (rel) hits.relAsset.push([s, rel.slice(0, 3)]);
  const ext = (t.match(/https?:\/\/[a-z0-9.-]+/gi) || []).filter(u => !/w3\.org/.test(u)); if (ext.length) hits.external.push([s, [...new Set(ext)]]);
  const fe = t.match(/fetch\([^)]{0,40}/g); if (fe) hits.fetch.push([s, fe]);
}
const htmlExt = [...new Set((rd('index.html').match(/https?:\/\/[a-z0-9.-]+/gi) || []))];
out('B payload', { scripts: srcs.length, sameListInArtifactHtml: srcs.join() === artSrcs.join(), caseOrMissing: caseBad, jsNotLoaded: unloaded,
  files: srcs.length + 1, totalMB: +(total / 1048576).toFixed(2), largest: [largest[0], +(largest[1] / 1048576).toFixed(2) + ' MB'],
  indexHtmlExternal: htmlExt, ...hits, charset: /<meta charset="utf-8">/i.test(rd('index.html')), title: rd('index.html').match(/<title>([^<]*)/)[1] });

// C. generator sweep: every level, the trip in place of each, the dark floor
const ctx = { console, Math, Uint8Array, Int16Array, Int32Array, Float32Array };
vm.createContext(ctx);
for (const f of ['js/tuning.js', 'js/rng.js', 'js/rooms.js', 'js/gen.js', 'js/rules.js']) vm.runInContext(rd(f), ctx, { filename: f });
const g = (n) => vm.runInContext(n, ctx);
const LEVELS = g('LEVELS'), gen = g('generateLevel'), tripLevel = g('tripLevel'), darkLevel = g('darkLevel');
const sweep = (def, n) => { let fails = 0, first = null; for (let s = 1; s <= n; s++) { try { gen(def, s * 1337); } catch (e) { fails++; first = first || String(e).slice(0, 120); } } return { fails, n, first }; };
const C = {};
LEVELS.forEach((d, i) => { C[`L${i + 1} ${d.name}`] = sweep(d, 250); });
for (let i = 1; i < LEVELS.length; i++) C[`T${i + 1} trip in place of ${LEVELS[i].name}`] = sweep(tripLevel(i), 60);
C['THE DARK'] = sweep(darkLevel.length ? darkLevel(4) : darkLevel(), 120);
out('C generator sweep', C);
out('C levels', { count: LEVELS.length, names: LEVELS.map(d => d.name), BUILD: g('BUILD'), shroom: { chance: g('TUNING.shroom.chance'), from: g('TUNING.shroom.from') }, darkOf: g('typeof DARK_LEVEL !== "undefined" ? DARK_LEVEL.darkOf : null'), easy: g('typeof EASY !== "undefined" ? EASY : null') });

// D. the run code: load the Game class without a page and call runCode / replayCode on stand-ins
const gctx = { console, Math, Uint8Array, Int16Array, Int32Array, Float32Array, encodeURIComponent,
  window: { addEventListener() {} }, document: {}, navigator: {}, localStorage: { getItem() { return null; }, setItem() {} } };
vm.createContext(gctx);
vm.runInContext(rd('js/tuning.js'), gctx, { filename: 'tuning.js' });
vm.runInContext(rd('js/game.js') + '\n;globalThis.__Game = Game;', gctx, { filename: 'game.js' });
const Game = gctx.__Game, GL = vm.runInContext('LEVELS', gctx), DARK = vm.runInContext('darkLevel.length ? darkLevel(4) : darkLevel()', gctx), TRIP = vm.runInContext('tripLevel(2)', gctx);
const stand = (def, li, extra = {}) => Object.assign({ level: { def }, levelIndex: li, runSeed: 123456789, seedDeaths: 1, goatRoom: 6, kills: 9,
  timer: 241.4, boons: [{}, {}, {}], lastGap: 0.8, firstKill: { kind: 'bearer', cause: 'wall', t: 14.2 } }, extra);
const by = { kind: 'dog' };
const codes = {
  lit_L5: Game.prototype.runCode.call(stand(GL[4], 4), by),
  dark_L5: Game.prototype.runCode.call(stand(DARK, 4), by),
  trip_L3: Game.prototype.runCode.call(stand(TRIP, 2), by),
  easy_god_L2: Game.prototype.runCode.call(stand(GL[1], 1, { settings: { easy: true }, dev: { god: true, open: true } }), by),
  normal_L2: Game.prototype.runCode.call(stand(GL[1], 1, { settings: { easy: false }, dev: { god: false } }), by),
  clear_card_L1: Game.prototype.runCode.call(stand(GL[0], 0, { seedDeaths: 0, lastGap: null }), null),
};
const calls = [];
const rstub = { startAtLevel: (li, trip, dark) => calls.push({ startAtLevel: [li, trip, dark === undefined ? 'undefined' : dark] }), startLevel: (...a) => calls.push({ startLevel: a.slice(0, 1) }), levelSeed: (i) => i };
Game.prototype.replayCode.call(rstub, codes.dark_L5);
const src = Game.prototype.runCode.toString();
out('D run code', { codes, darkEqualsLit: codes.lit_L5 === codes.dark_L5, easyEqualsNormal: codes.easy_god_L2 === codes.normal_L2,
  replayOfDarkCode: calls, runCodeReads: { easy: /easy/.test(src), dev: /dev/.test(src), startedFromLevels: /jump|levels|askedSeed/i.test(src) } });

// E. audio: every foley recipe renders to a non-silent buffer in node
const fctx = { console, Math, Uint8Array, Int16Array, Int32Array, Float32Array };
vm.createContext(fctx);
try {
  vm.runInContext(rd('js/tuning.js'), fctx); vm.runInContext(rd('js/foley.js') + '\n;globalThis.__F = Foley;', fctx);
  const F = fctx.__F, names = Object.keys(F.recipes), silent = [], errs = [];
  for (const n of names) { try { const b = F.render(n, {}); let pk = 0; for (let i = 0; i < b.length; i++) pk = Math.max(pk, Math.abs(b[i])); if (!(pk > 0.001)) silent.push(n); } catch (e) { errs.push(n + ': ' + String(e).slice(0, 80)); } }
  out('E foley', { recipes: names.length, silent, errors: errs });
} catch (e) { out('E foley', 'could not load: ' + e); }
