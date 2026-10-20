// ВЫГРУЗКА, session 3: js/tuning.js (and QUESTS from js/heaven.js) -> Godot Resources.
// Evaluates every expression, writes output/godot-export/data/**/*.tres, the class scripts in
// output/godot-export/data/classes/, a generated tuning.gd and getters.json (code that stays code,
// for session 14). Read-only on js/*.js. Run: node tools/godot-export/tuning.js
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'output', 'godot-export');
const DATA = path.join(OUT, 'data');

const ctx = { console, Math, Set, Map, Uint8Array, Int16Array, Int32Array, Float32Array, Object, Array, JSON };
vm.createContext(ctx);
for (const f of ['js/rng.js', 'js/tuning.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
// QUESTS lives in heaven.js, a literal that reads only TUNING; cut it out by brace matching.
{
  const src = fs.readFileSync(path.join(ROOT, 'js/heaven.js'), 'utf8');
  const i = src.indexOf('const QUESTS = {');
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) { j = k; break; } }
  vm.runInContext(src.slice(i, j + 1).replace('const QUESTS', 'var QUESTS') + ';', ctx);
}
const G = (n) => vm.runInContext(n, ctx);

const getters = []; // { path, kind } code that does not export
const warnings = [];

// ---- plain data out of JS values (functions and accessors dropped and listed) ----
function plain(v, p) {
  const t = typeof v;
  if (v === null) return null;
  if (t === 'function') { getters.push({ path: p, kind: 'function' }); return undefined; }
  if (t === 'number') { if (!isFinite(v)) warnings.push('nonfinite ' + p); return v; }
  if (t === 'string' || t === 'boolean') return v;
  if (t === 'undefined') return undefined;
  if (v instanceof ctx.Set) return [...v].map((x, i) => plain(x, p + '[' + i + ']'));
  if (Array.isArray(v)) return v.map((x, i) => { const r = plain(x, p + '[' + i + ']'); return r === undefined ? null : r; });
  if (t === 'object') {
    const o = {};
    for (const k of Object.keys(v)) {
      const d = Object.getOwnPropertyDescriptor(v, k);
      if (d.get) { getters.push({ path: p + '.' + k, kind: 'getter' }); continue; }
      const r = plain(v[k], p + '.' + k);
      if (r !== undefined) o[k] = r;
    }
    return o;
  }
  warnings.push('odd ' + t + ' ' + p);
  return undefined;
}

// ---- GDScript literal writer ----
const num = (n) => (n === Infinity ? 'inf' : n === -Infinity ? '-inf' : Number.isNaN(n) ? 'nan' : Number.isInteger(n) ? String(n) : String(+n.toPrecision(15)));
const fnum = (n) => { const s = num(n); return /^-?\d+$/.test(s) ? s + '.0' : s; };
const str = (s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"';
function lit(v) {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return num(v);
  if (typeof v === 'string') return str(v);
  if (Array.isArray(v)) return '[' + v.map((x) => lit(x)).join(', ') + ']';
  return '{' + Object.keys(v).map((k) => str(k) + ': ' + lit(v[k])).join(', ') + '}';
}

// ---- naming ----
const KEYWORDS = new Set('if elif else for while match break continue pass return class class_name extends is in as self signal func static const enum var breakpoint preload await yield assert void true false null and or not super trait namespace PI TAU INF NAN'.split(' '));
const RESERVED = new Set(['script', 'name', 'resource_local_to_scene', 'resource_path', 'resource_name', 'resource_scene_unique_id']);
const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^A-Za-z0-9_]/g, '_').toLowerCase();
const pascal = (s) => snake(s).split('_').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
// A keyword or a reserved Resource property gets a trailing underscore; a non-identifier goes to `extra`.
const fieldName = (k) => (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? null : KEYWORDS.has(k) || RESERVED.has(k) ? k + '_' : k);

function gdType(vals) {
  const ts = new Set(vals.map((v) => (v === null ? 'null' : Array.isArray(v) ? 'Array' : typeof v === 'number' ? 'float' : typeof v === 'string' ? 'String' : typeof v === 'boolean' ? 'bool' : 'Dictionary')));
  ts.delete('null');
  return ts.size === 1 ? [...ts][0] : 'Variant';
}
const tfield = (v, t) => (t === 'float' && typeof v === 'number' ? fnum(v) : lit(v));

const classes = {};
const manifest = [];

function writeFile(rel, text) { const f = path.join(DATA, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text.replace(/\r?\n/g, '\n')); }

// One class for a set of objects of one shape (a single object is a set of one).
function emitSet(group, cls, doc, entries, refs) {
  const seen = new Map();
  for (const e of entries) for (const k of Object.keys(e.obj)) if (!seen.has(k)) seen.set(k, []);
  for (const e of entries) for (const k of Object.keys(e.obj)) seen.get(k).push(e.obj[k]);
  const fields = [], extra = new Set();
  for (const [k, vals] of seen) { const n = fieldName(k); if (n) fields.push({ k, n, t: gdType(vals) }); else extra.add(k); }
  let gd = `class_name ${cls}\nextends Resource\n## ${doc}\n## Generated by tools/godot-export/tuning.js in the JS repo (session 3). Edit the .tres, not this file.\n\n`;
  for (const f of fields) gd += `@export var ${f.n}: ${f.t}\n`;
  for (const r of refs || []) gd += `@export var ${r.name}: Resource\n`;
  if (extra.size) gd += '@export var extra: Dictionary = {}  # keys that are no GDScript identifier\n';
  classes[cls] = gd;
  const clsFile = `classes/${snake(cls)}.gd`;
  for (const e of entries) {
    let t = `[gd_resource type="Resource" script_class="${cls}" format=3]\n\n[ext_resource type="Script" path="res://data/${clsFile}" id="1_s"]\n`;
    (e.refs || []).forEach((r, i) => { t += `[ext_resource type="Resource" path="res://data/${r.path}" id="${i + 2}_r"]\n`; });
    t += '\n[resource]\nscript = ExtResource("1_s")\n';
    for (const f of fields) if (f.k in e.obj) t += `${f.n} = ${tfield(e.obj[f.k], f.t)}\n`;
    (e.refs || []).forEach((r, i) => { t += `${r.name} = ExtResource("${i + 2}_r")\n`; });
    if (extra.size) { const x = {}; for (const k of extra) if (k in e.obj) x[k] = e.obj[k]; t += `extra = ${lit(x)}\n`; }
    const rel = `${group}/${e.file || snake(e.key)}.tres`;
    writeFile(rel, t);
    manifest.push({ group, key: e.key, cls, path: 'data/' + rel });
  }
}

// ---- 1. TUNING: one resource per block ----
const T = plain(G('TUNING'), 'TUNING');
const scalars = {};
const tuningKeys = [];
for (const k of Object.keys(T)) {
  if (T[k] !== null && typeof T[k] === 'object' && !Array.isArray(T[k])) {
    emitSet('tuning', pascal(k) + 'Tuning', `TUNING.${k}`, [{ key: k, obj: T[k] }]);
    tuningKeys.push(k);
  } else scalars[k] = T[k];
}
emitSet('tuning', 'TuningScalars', 'The single numbers directly under TUNING', [{ key: 'scalars', obj: scalars }]);

// ---- 2. loose tables (consts outside TUNING) ----
const globalsObj = {};
for (const n of ['TILE', 'TILT', 'SLOW', 'GOAT_CD', 'PACE', 'CULT_PACE', 'BOON_CARDS', 'BUILD']) globalsObj[n.toLowerCase()] = G(n);
const tableNames = ['PALETTE', 'BOON_BASE', 'BOON_SLOTS', 'BOON_SETS', 'BOON_POWER', 'THREAT', 'ENCOUNTER', 'GROUND', 'CANON', 'CORRIDOR', 'STACK', 'VAULT', 'BIG_ROOM', 'DOORS', 'EASY', 'MILK_OFFER', 'LEVEL_MODS', 'ROOM_LEVELS', 'QUESTS', 'BEAST_CARD', 'TRIP_LEVELS', 'BOON_TEXT', 'CAPE_RARITY'];
const tables = [];
emitSet('tables', 'GlobalsTable', 'TILE, TILT, SLOW, GOAT_CD, PACE and the other single numbers of js/tuning.js', [{ key: 'globals', obj: globalsObj }]);
tables.push('globals');
for (const n of tableNames) {
  let v; try { v = G(n); } catch (e) { warnings.push('missing table ' + n); continue; }
  emitSet('tables', pascal(n) + 'Table', n, [{ key: n.toLowerCase(), obj: plain(v, n) }]);
  tables.push(n.toLowerCase());
}
const lists = {};
for (const n of ['BOON_FIRST', 'RARITY', 'RETIRED_CANONS', 'BOON_OFF']) lists[n.toLowerCase()] = plain(G(n), n);
emitSet('tables', 'ListsTable', 'BOON_FIRST, RARITY, RETIRED_CANONS, BOON_OFF', [{ key: 'lists', obj: lists }]);
tables.push('lists');

// ---- 3. souls, talismans, capes, mirror, levels ----
const BOONS = G('BOONS'), ARTS = G('ARTIFACTS'), CAPES = G('CAPES'), MIRROR = G('MIRROR'), LEVELS = G('LEVELS');
// Two souls share the id 'hooves' in the JS (MULE KICK and SURE HOOVES); the later one is keyed hooves_2.
const soulIds = new Set();
const souls = BOONS.map((b) => { let key = b.id; for (let n = 2; soulIds.has(key); n++) { key = b.id + '_' + n; warnings.push('duplicate soul id ' + b.id + ' -> ' + key); } soulIds.add(key); return { key, obj: plain(b, 'BOONS.' + b.id) }; });
emitSet('souls', 'SoulData', 'One soul (BOONS entry). Params are data; desc/stat getters and apply stay code (getters.json).', souls);
const arts = ARTS.map((a) => ({ key: a.id, obj: plain(a, 'ARTIFACTS.' + a.id) }));
emitSet('talismans', 'TalismanData', 'One talisman (ARTIFACTS entry); tiers[].params are the numbers.', arts);
const capes = CAPES.map((a) => ({ key: a.id, obj: plain(a, 'CAPES.' + a.id) }));
emitSet('capes', 'CapeData', 'One cape (CAPES entry).', capes);
const mirror = MIRROR.map((a) => ({ key: a.id, obj: plain(a, 'MIRROR.' + a.id) }));
emitSet('mirror', 'MirrorData', 'One MIRROR row of heaven (value/tell/apply stay code).', mirror);
const levels = [];
LEVELS.forEach((l, i) => levels.push({ key: 'level' + i, file: 'level' + i, obj: Object.assign({ index: i }, plain(l, 'LEVELS[' + i + ']')) }));
for (const [n, label] of [['DARK_LEVEL', 'dark'], ['FACTORY_LEVEL', 'factory'], ['SNOW_LEVEL', 'snow']]) levels.push({ key: label, file: label, obj: Object.assign({ index: -1 }, plain(G(n), n)) });
emitSet('levels', 'LevelData', 'One level definition (LEVELS[i], then DARK_LEVEL, FACTORY_LEVEL, SNOW_LEVEL with index -1).', levels);

// ---- 4. enemy kinds: THREAT + ENCOUNTER weight/cap + the TUNING block of the kind ----
const THREAT = G('THREAT'), ENC = G('ENCOUNTER');
const blockOf = { bearer: 'bearer', dog: 'dog', hunter: 'hunter', wraith: 'wraith', seer: 'seer', champion: 'champion', butcher: 'butcher', shield: 'shieldman', thrower: 'thrower', shaman: 'shaman', sawbot: 'sawbot', welder: 'welder', automaton: 'automaton', arm: 'arm', sweeper: 'sweeper', shieldgen: 'shieldgen', cartridge: 'cartridge' };
const kinds = [];
for (const k of Object.keys(THREAT)) {
  const b = blockOf[k];
  const ok = b && tuningKeys.includes(b);
  if (!ok) warnings.push('kind without a TUNING block: ' + k);
  const obj = { kind: k, threat: THREAT[k] };
  if (ENC.weight[k] !== undefined) obj.encounter_weight = ENC.weight[k]; else warnings.push('no ENCOUNTER weight: ' + k);
  if (ENC.cap[k] !== undefined) obj.encounter_cap = ENC.cap[k];
  kinds.push({ key: k, obj, refs: ok ? [{ name: 'tuning', path: `tuning/${snake(b)}.tres` }] : [] });
}
emitSet('kinds', 'EnemyKindData', 'One kind of man: THREAT, ENCOUNTER weight and cap, and its TUNING block as `tuning`.', kinds, [{ name: 'tuning' }]);

// ---- classes and tuning.gd ----
for (const c of Object.keys(classes)) writeFile(`classes/${snake(c)}.gd`, classes[c]);

const L = [];
L.push('extends Node',
  '## Every gameplay number, read from the Resources in res://data/ (ground rule 2: no literal in code).',
  '## GENERATED by tools/godot-export/tuning.js (session 3): one typed var per TUNING block (`Tuning.goat.roll`),',
  '## the loose tables of js/tuning.js, and the souls, talismans, capes, levels and kinds by id.',
  '## Numbers are float; a nested object is a Dictionary (dot access works: Tuning.goat.roll.speed).', '');
for (const k of tuningKeys) L.push(`var ${fieldName(k)}: ${pascal(k)}Tuning = preload("res://data/tuning/${snake(k)}.tres")`);
L.push('var scalars: TuningScalars = preload("res://data/tuning/scalars.tres")', '');
for (const t of tables) L.push(`var ${t}_table: ${pascal(t)}Table = preload("res://data/tables/${snake(t)}.tres")`);
L.push('');
const dict = (name, arr, grp) => { L.push(`var ${name}: Dictionary = {`); for (const e of arr) L.push(`\t"${e.key}": preload("res://data/${grp}/${e.file || snake(e.key)}.tres"),`); L.push('}'); };
dict('souls', souls, 'souls'); dict('talismans', arts, 'talismans'); dict('capes', capes, 'capes'); dict('mirror', mirror, 'mirror'); dict('kinds', kinds, 'kinds');
L.push('', '## LEVELS in run order (0..7); the three test floors follow by name.', 'var levels: Array[LevelData] = [');
levels.slice(0, LEVELS.length).forEach((e) => L.push(`\tpreload("res://data/levels/${e.file}.tres"),`));
L.push(']', 'var test_levels: Dictionary = {');
levels.slice(LEVELS.length).forEach((e) => L.push(`\t"${e.key}": preload("res://data/levels/${e.file}.tres"),`));
L.push('}', '');
writeFile('tuning.gd', L.join('\n'));

// getters list for session 14
const byField = {};
for (const g of getters) { const f = g.path.replace(/^[A-Za-z_]+\.[A-Za-z_0-9]+/, '$').replace(/\[\d+\]/g, '[]') + ':' + g.kind; byField[f] = (byField[f] || 0) + 1; }
fs.writeFileSync(path.join(OUT, 'getters.json'), JSON.stringify({ note: 'JS code that did not export (stays code, session 14): souls desc/stat/apply/unlock, talismans tell/say/apply/need/desc/detail, capes tell/say/apply/desc/detail, mirror value/tell/apply/hint, BOON_SETS gain. Source of truth stays js/tuning.js.', count: getters.length, byField, all: getters }, null, 1));
const summary = { blocks: tuningKeys.length, scalars: Object.keys(scalars), tables: tables.length, souls: souls.length, talismans: arts.length, capes: capes.length, mirror: mirror.length, levels: levels.length, kinds: kinds.length, getters: getters.length, files: manifest.length, warnings };
fs.writeFileSync(path.join(OUT, 'tuning-summary.json'), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary));
