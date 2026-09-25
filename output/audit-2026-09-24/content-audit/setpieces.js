// Set pieces: how many men the Great Hall, the Gallery and the killbox actually hold; mills in the hall.
const { load } = require('./load.js');
const L = load(); const g = L.grab;
const LEVELS = g('LEVELS'), gen = g('generateLevel'), GH = g('GREAT_HALL_TEMPLATE');
const N = Number(process.argv[2] || 60);
console.log('GREAT_HALL_TEMPLATE', GH.rows[0].length, 'x', GH.rows.length, 'mills in template', GH.rows.join('').split('').filter((c) => c === 'M').length);
for (const li of LEVELS.map((d, i) => i).filter((i) => LEVELS[i].hallAt !== undefined || LEVELS[i].galleryAt !== undefined || LEVELS[i].killboxAt !== undefined)) {
  const d = LEVELS[li], acc = { hall: [], gallery: [], killbox: [], hallMills: [] };
  for (let s = 1; s <= N; s++) {
    const lv = gen(d, s * 7717);
    const per = (ri) => lv.spawns.filter((sp) => sp.roomIndex === ri);
    for (const r of lv.rooms) {
      if (r.isHall) { acc.hall.push(per(r.index).length); acc.hallMills.push(lv.props.filter((p) => p.kind === 'mill' && p.x >= r.x * 32 && p.x <= (r.x + r.w) * 32).length); }
      if (r.isGallery) acc.gallery.push(per(r.index).filter((sp) => sp.kind === 'hunter').length + '/' + per(r.index).length);
      if (r.isKillbox) acc.killbox.push(per(r.index).map((sp) => sp.kind).join('+'));
    }
  }
  const mm = (a) => a.length ? `${Math.min(...a)}..${Math.max(...a)} avg ${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)}` : 'none';
  const kb = {}; for (const k of acc.killbox) kb[k] = (kb[k] || 0) + 1;
  const gl = {}; for (const k of acc.gallery) gl[k] = (gl[k] || 0) + 1;
  console.log(`${d.name}: hall men ${mm(acc.hall)} (in ${acc.hall.length}/${N}), hall mills ${mm(acc.hallMills)}; gallery hunters/men ${JSON.stringify(gl)}; killbox ${JSON.stringify(kb)} (in ${acc.killbox.length}/${N})`);
}
