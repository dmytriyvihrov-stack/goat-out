// What the mix half of each level is made of: plain rooms vs each earlier canon, over the seeds.
const { load } = require('./load.js');
const L = load(); const g = L.grab;
const LEVELS = g('LEVELS'), gen = g('generateLevel'), RT = g('ROOM_TEMPLATES'), DARK = g('DARK_LEVEL');
const N = Number(process.argv[2] || 80);
const byName = {}; for (const t of RT) if (!byName[t.name] || t.canon) byName[t.name] = t;
for (const d of [...LEVELS, DARK]) {
  const c = {}; let mix = 0;
  for (let s = 1; s <= N; s++) { const lv = gen(d, s * 7717 + 11); for (const r of lv.rooms) if (r.role === 'mix') { mix++; const k = r.tpl.canon || 'plain'; c[k] = (c[k] || 0) + 1; } }
  console.log(`${d.name.padEnd(20)} mix rooms/seed ${(mix / N).toFixed(1)}  known [${[...(d.known || [])]}]  ${Object.entries(c).map(([k, v]) => `${k} ${(v / mix * 100).toFixed(0)}%`).join(', ')}`);
}
