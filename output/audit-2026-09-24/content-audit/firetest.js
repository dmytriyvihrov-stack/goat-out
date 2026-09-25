// Prove the probe's checks fire: a fake boon nothing can open, and a fake room template no level can draw.
const { load } = require('./load.js');
const vm = require('vm');
const L = load(); const g = L.grab;
vm.runInContext(`BOONS.push({ id: 'fakeboon', skill: 'butt', active: false, needs: 'noSuchMod', name: 'FAKE', apply: (m) => { m.fake = true; } });
ROOM_TEMPLATES.push({ name: 'fakeroom', canon: 'zzz', rows: ROOM_TEMPLATES[0].rows });`, L.ctx);
const BOONS = g('BOONS'), BOON_BASE = g('BOON_BASE'), SLOTS = g('BOON_SLOTS');
const m = Object.assign({}, BOON_BASE);
const open = BOONS.filter((b) => !(b.needs && !m[b.needs]));
console.log('fake boon open with base mods?', open.some((b) => b.id === 'fakeboon'), '(expect false)');
const setters = BOONS.filter((o) => { const mm = Object.assign({}, BOON_BASE); o.apply(mm, o.params || {}); return !!mm.noSuchMod; }).map((o) => o.id);
console.log('setters of noSuchMod:', setters, '(expect [])');
const gen = g('generateLevel'), LEVELS = g('LEVELS'); const drawn = new Set();
for (const d of LEVELS) for (let s = 1; s <= 4; s++) { const lv = gen(d, s * 7717); for (const r of lv.rooms) drawn.add(r.tpl.name); }
console.log('fakeroom drawn?', drawn.has('fakeroom'), '(expect false); a real canon room drawn?', drawn.has('cloister'));
