// How often each canon template is drawn, and its ground, per level that can draw it.
const { load } = require('./load.js');
const L = load(); const g = L.grab;
const LEVELS = g('LEVELS'), gen = g('generateLevel'), RT = g('ROOM_TEMPLATES'), groundOf = g('groundOf');
const N = Number(process.argv[2] || 100), canon = process.argv[3] || 'funnel';
const tpls = RT.filter((t) => t.canon === canon);
console.log(`ROOT ${L.ROOT}\n${canon}: ${tpls.map((t) => `${t.name} ground ${(t.ground !== undefined ? t.ground : groundOf(t)).toFixed(2)} ${t.rows[0].length}x${t.rows.length}${t.needs ? ' needs ' + t.needs : ''}`).join(' | ')}`);
for (const d of LEVELS) {
  if (!(d.canon && d.canon.id === canon) && !(d.known && d.known.has(canon))) continue;
  const c = {};
  for (let s = 1; s <= N; s++) { const lv = gen(d, s * 7717 + 3); for (const r of lv.rooms) if (r.tpl.canon === canon || tpls.some((t) => t.name === r.tpl.name)) c[r.tpl.name] = (c[r.tpl.name] || 0) + 1; }
  console.log(`  ${d.name} (${d.canon.id === canon ? 'canon' : 'mix'}): ${tpls.map((t) => `${t.name} ${c[t.name] || 0}`).join(', ')}`);
}
