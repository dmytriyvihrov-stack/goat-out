// ВЫГРУЗКА, session 4: every spoken or shown line of the cult, the god, the animals and the HUD -> one JSON.
// Reads js/*.js and tools/god-talk.html (TRIGGERS) only; writes output/godot-export/data/lines.json.
// Entry: { speaker, occasion, value: string | [string] }. Keys are source paths ('HEAVEN_TALK.intro').
// Run: node tools/godot-export/lines.js
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'output', 'godot-export', 'data');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const ctx = { console, Math, Set, Map, Uint8Array, Int16Array, Int32Array, Float32Array, Object, Array, JSON };
vm.createContext(ctx);
for (const f of ['js/rng.js', 'js/tuning.js']) vm.runInContext(rd(f), ctx, { filename: f });
const G = (n) => vm.runInContext(n, ctx);

// ---- cut a top-level `const NAME = {...}` / `[...]` out of a file by bracket matching (strings and comments aware)
function cut(file, name) {
  const src = rd(file), m = new RegExp('^(?:const|var|let) ' + name + ' = ', 'm').exec(src);
  if (!m) throw new Error('no ' + name + ' in ' + file);
  const i = m.index + m[0].length, open = src[i], close = open === '{' ? '}' : ']';
  let d = 0, q = null, j = i;
  for (; j < src.length; j++) {
    const c = src[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
    if (c === '/' && src[j + 1] === '/') { while (src[j] !== '\n') j++; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === open) d++; else if (c === close && --d === 0) break;
  }
  return { text: src.slice(i, j + 1), src: src.slice(m.index, j + 1) };
}
const loaded = {};
function load(file, name) {
  if (!loaded[name]) { const c = cut(file, name); loaded[name] = { v: vm.runInContext('(' + c.text + ')', ctx), src: c.src }; }
  return loaded[name];
}
// the comment block over each top-level key (indent 2) of a block's source, for the occasion
function notesOf(src) {
  const notes = {}; let buf = [];
  for (const line of src.split('\n')) {
    const c = /^ {2}\/\/ ?(.*)$/.exec(line), k = /^ {2}(?:'([^']+)'|(\w+)):/.exec(line);
    if (c) buf.push(c[1]); else if (k) { notes[k[1] || k[2]] = buf.join(' ').trim(); buf = []; } else if (!/^\s*$/.test(line)) buf = [];
  }
  return notes;
}
// A line-by-line read, not an eval: god-talk.html's own literal has an unescaped apostrophe in hornsNow.
function triggers() {
  const h = rd('tools/god-talk.html'), i = h.indexOf('const TRIGGERS = {'), o = {};
  for (const line of h.slice(i, h.indexOf('\n};', i)).split('\n')) {
    const m = /^\s*'([\w.]+)': '(.*)',\s*$/.exec(line);
    if (m) o[m[1]] = m[2].split("\\'").join("'");
  }
  return o;
}
const TRIG = triggers();

// ---- walk: a string, or a list of strings, is one entry; a list of lists is one entry per inner list
const entries = {}; let leafCount = 0;
function put(key, value, meta) {
  if (entries[key]) throw new Error('duplicate key ' + key);
  entries[key] = Object.assign({}, meta, { value });
  leafCount += Array.isArray(value) ? value.length : 1;
}
function walk(v, key, metaOf) {
  if (typeof v === 'string') return put(key, v, metaOf(key));
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x === 'string')) return put(key, v.slice(), metaOf(key));
    return v.forEach((x, i) => walk(x, key + '.' + i, metaOf));
  }
  if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], key + '.' + k, metaOf);
}
const sources = {}; // name -> { count, from }
function take(name, from, v, metaOf) {
  const before = leafCount; walk(v, name, metaOf); sources[name] = { count: leafCount - before, from };
}

// ---- the god, the shepherd, death tips
{
  const H = load('js/heaven.js', 'HEAVEN_TALK'), S = load('js/heaven.js', 'SHEPHERD_TALK'), D = load('js/heaven.js', 'DEATH_TIPS');
  const trig = (p) => {
    const q = p.split('.');
    if (q[1] === 'killer') return (q[0] === 'DEATH_TIPS' ? 'At the foot of a floor tried again after a death to ' : 'The next talk after a death to ') + (q[2] || '').toUpperCase() + '.';
    if (q[1] === 'deaths') return 'The next talk once his tally of deaths reaches ' + q[2] + ' (once).';
    return TRIG[q.slice(0, 2).join('.')] || '';
  };
  take('HEAVEN_TALK', 'js/heaven.js', H.v, (p) => ({ speaker: 'THE GOD', occasion: trig(p) }));
  take('SHEPHERD_TALK', 'js/heaven.js', S.v, (p) => ({ speaker: 'THE SHEPHERD', occasion: trig(p) }));
  take('DEATH_TIPS', 'js/heaven.js', D.v, (p) => ({ speaker: 'A DEATH', occasion: trig(p) }));
}
// ---- animals
{
  const BH = load('js/tuning.js', 'BEAST_HELLO'), BA = load('js/tuning.js', 'BEAST_ANSWER'), BC = load('js/tuning.js', 'BEAST_CHAT');
  const HB = load('js/heaven-home.js', 'HEAVEN_BANTER'), SS = load('js/heaven-home.js', 'STAND_STORY');
  const who = (k) => k.toUpperCase();
  take('BEAST_HELLO', 'js/tuning.js', BH.v, (p) => ({ speaker: who(p.split('.')[1]), occasion: 'The animal is let out of its coop: page 1 its sound, then its terms, then its reward hint (a box, a verb turns the page).' }));
  take('BEAST_ANSWER', 'js/tuning.js', BA.v, () => ({ speaker: 'THE GOAT / THE ANIMAL', occasion: 'After an animal has said its terms: yes (BAAAH) or no (bah); refused, it goes its way and says one of `refused`.' }));
  const EV = { kill: 'a man is put down near it', big: 'a boss or an ogre goes down', clear: "the room's last man falls", fight: 'the cult has seen him', hurt: 'he lost a heart', last: 'his last heart', soul: 'he swallowed a soul', stairs: 'the last room, the stairs', idle: 'he stands about with nobody after him', ouch: 'it is hurt and alive', carried: 'it is carried', thrown: 'it is thrown (the hen: kicked)', stun: 'it is butted', poison: 'it is poisoned', stray: 'left behind, it calls', left: 'its last word on the farewell plate when the clamp walls it in', again: 'first page of its terms when it has been up in heaven before' };
  take('BEAST_CHAT', 'js/tuning.js', BC.v, (p) => { const q = p.split('.'); return { speaker: who(q[1]), occasion: 'On the road, over the animal: ' + (EV[q[2]] || q[2]) + '.' }; });
  take('HEAVEN_BANTER', 'js/heaven-home.js', HB.v, (p) => ({ speaker: p.split('.')[1].replace('|', ' + ').toUpperCase(), occasion: 'Up in heaven, two free animals talk to each other while the goat is near (a pair of lines, first speaker first).' }));
  take('STAND_STORY', 'js/heaven-home.js', SS.v, () => ({ speaker: 'THE GOD', occasion: 'A broken animal stand, on the pointer: what broke it.' }));
}
// ---- the cult, the HUD
{
  const B = load('js/tuning.js', 'BARKS'), n = notesOf(B.src);
  take('BARKS', 'js/tuning.js', B.v, (p) => { const k = p.split('.')[1]; return { speaker: 'THE CULT (per kind where nested)', occasion: n[k] || '' }; });
  const BO = load('js/tuning.js', 'BOSS_HINTS');
  take('BOSS_HINTS', 'js/tuning.js', BO.v, (p) => ({ speaker: 'HUD', occasion: p.endsWith('.name') ? "The boss bar's name of that kind." : "The boss bar's one line the fight turns on, shown a few seconds once a floor per man." }));
  const K = load('js/tuning.js', 'KILLED_BY');
  take('KILLED_BY', 'js/tuning.js', K.v, () => ({ speaker: 'HUD', occasion: 'The killer named on the death card and the run, keyed by the run code token.' }));
  const C = load('js/render.js', 'CONTROL_LINES'), cn = notesOf(C.src);
  take('CONTROL_LINES', 'js/render.js', C.v, (p) => ({ speaker: 'FLOOR WORDS', occasion: (cn[p.split('.')[1]] || '') + ' Key lists: index = block (0 move in the pen, 1 grab/throw in the ambush, 2 headbutt at the sentry, 3 roll, 4 BAAH in THE YARD, 5 roll over the chasm, 6 stealth in THE YARD).' }));
  const T = load('js/text-edit.js', 'TEXT_EDITS');
  take('TEXT_EDITS', 'js/text-edit.js', T.v, () => ({ speaker: 'ANY', occasion: 'A drawn string replaced by another, in every build (key = the original).' }));
}
// ---- TUNING.prop.<kind>: the mouse's, animals' and trophy lines (talk / lines / thanks / spite / practice)
{
  const T = G('TUNING'), pick = {};
  const want = /^(talk|lines|thanks|spite|practice)$/;
  for (const k of ['trophy', 'mouse', 'crow', 'horse', 'pig', 'husky']) {
    const o = T.prop[k]; if (!o) continue;
    for (const f of Object.keys(o)) if (want.test(f)) { pick[k] = pick[k] || {}; pick[k][f] = o[f]; }
  }
  take('TUNING.prop', 'js/tuning.js', pick, (p) => {
    const q = p.split('.'), k = q[2];
    return { speaker: k === 'trophy' ? 'THE STAG' : k === 'mouse' ? 'THE MOUSE' : k.toUpperCase(), occasion: 'TUNING.prop.' + k + '.' + q.slice(3).join('.') + (q[3] === 'talk' ? ' (the animal box, a page a line)' : q[3] === 'lines' ? ' (over the head, by event)' : '') };
  });
  // other spoken text left in TUNING: the end-boss scenes, the Warden, the thrower, the thanks card, the trip, the stealth word
  const extra = { endBoss: T.endBoss, warden: { turn: T.warden && T.warden.turn, gloat: T.warden && T.warden.gloat }, thrower: { pant: T.thrower && T.thrower.pant }, thanks: { lines: T.thanks && T.thanks.lines }, shroom: { phase: T.shroom.phase, banner: T.shroom.banner, back: T.shroom.back }, stealth: { denyText: T.stealth.denyText } };
  const keep = (o) => { // only strings that read as words, never ids, colours or paths
    if (typeof o === 'string') return (/[A-Za-z]{2,}[ .,!?'-]/.test(o) || /^[A-Z][A-Z ]+$/.test(o)) ? o : undefined;
    if (Array.isArray(o)) { const r = o.map(keep).filter((x) => x !== undefined); return r.length ? r : undefined; }
    if (o && typeof o === 'object') { const r = {}; for (const k of Object.keys(o)) { const x = keep(o[k]); if (x !== undefined) r[k] = x; } return Object.keys(r).length ? r : undefined; }
  };
  take('TUNING.misc', 'js/tuning.js', keep(extra), (p) => ({ speaker: 'SCENE', occasion: 'TUNING.' + p.split('.').slice(2).join('.') }));
}
// The intro's own words are BARKS.intro / BARKS.bless; TUNING.intro holds numbers only.

// ---- write, then verify the count read back from the file against the count over the sources
fs.mkdirSync(OUT, { recursive: true });
const file = path.join(OUT, 'lines.json');
fs.writeFileSync(file, JSON.stringify({ generator: 'tools/godot-export/lines.js', sources, entries }, null, 1) + '\n');
let back = 0;
for (const e of Object.values(JSON.parse(fs.readFileSync(file, 'utf8')).entries)) back += Array.isArray(e.value) ? e.value.length : 1;
const total = Object.values(sources).reduce((a, s) => a + s.count, 0);
for (const [k, s] of Object.entries(sources)) console.log(k.padEnd(16), s.count);
console.log('entries', Object.keys(entries).length, '| lines over sources', total, '| lines in file', back, back === total ? 'OK' : 'MISMATCH');
if (back !== total) process.exit(1);
