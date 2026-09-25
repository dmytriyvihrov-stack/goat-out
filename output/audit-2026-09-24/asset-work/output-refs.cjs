const fs = require('fs'), path = require('path');
const G = process.argv[2];
for (const d of ['output/pixel-mid-2026-09-23', 'output/pixel-environment-2026-09-23', 'output/pixel-ominous-decals-2026-09-23']) {
  const D = path.join(G, d), m = JSON.parse(fs.readFileSync(path.join(D, 'manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
  const refs = new Set(); JSON.stringify(m, (k, v) => { if (k === 'file') refs.add(v); return v; });
  const pngs = []; const walk = (p) => { for (const f of fs.readdirSync(p)) { const q = path.join(p, f); if (fs.statSync(q).isDirectory()) walk(q); else if (f.endsWith('.png')) pngs.push(path.relative(D, q).split(path.sep).join('/')); } }; walk(D);
  const un = pngs.filter((p) => !refs.has(p));
  console.log(d, '| manifest names', refs.size, 'files | pngs on disk', pngs.length, '| never named:', un.map((p) => p + ' (' + fs.statSync(path.join(D, p)).size + ')').join(', ') || '-', '| named but missing:', [...refs].filter((r) => !fs.existsSync(path.join(D, r))).join(', ') || '-');
}
