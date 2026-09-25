// Replays tools/pack-pixel.ps1's shelf-pack arithmetic off the CURRENT manifest (no images, no
// writes) and compares every frame rect with js/pixel-assets.js. A mismatch = the generated file is
// stale against its source. --plant nudges one manifest rect to prove a mismatch is reported.
const fs = require('fs'), path = require('path');
const G = process.argv[2], PLANT = process.argv.includes('--plant');
const m = JSON.parse(fs.readFileSync(path.join(G, 'output/pixel-mid-2026-09-23/manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
if (PLANT) m.units[0].idle[0].rect[2] += 9;
const t = fs.readFileSync(path.join(G, 'js/pixel-assets.js'), 'utf8');
const A = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
const Target = A.target, Width = 2048, pad = 2, jobs = [];
for (const u of m.units) {
  const k = Target / u.sourceExtent;
  u.idle.forEach((f, d) => jobs.push([u.id, 'idle', d, 0, f, k]));
  if (u.walk) u.walk.forEach((row, d) => row.forEach((f, p) => jobs.push([u.id, 'walk', d, p, f, k])));
}
// PowerShell [int][math]::Ceiling and [math]::Round (banker's rounding, to 1 decimal)
const bank1 = (v) => { const x = v * 10, f = Math.floor(x), r = x - f; const n = Math.abs(r - 0.5) < 1e-9 ? (f % 2 === 0 ? f : f + 1) : Math.round(x); return n / 10; };
let x = 0, y = 0, row = 0, bad = 0, n = 0;
for (const [id, slot, d, p, f, k0] of jobs) {
  const s = k0 * (f.relativeScale ? f.relativeScale : 1), w = Math.ceil(f.rect[2] * s), h = Math.ceil(f.rect[3] * s);
  if (x + w + pad > Width) { x = 0; y += row + pad; row = 0; }
  const want = [x, y, w, h, bank1(f.sourceAnchor[0] * s), bank1(f.sourceAnchor[1] * s)];
  const got = slot === 'idle' ? A.units[id].idle[d] : A.units[id].walk[d][p];
  n++;
  if (!got || want.some((v, i) => Math.abs(v - got[i]) > 0.051)) { if (bad++ < 5) console.log('MISMATCH', id, slot, d, p, 'manifest->', JSON.stringify(want), 'file', JSON.stringify(got)); }
  x += w + pad; if (h > row) row = h;
}
console.log('frames replayed', n, '| in file', Object.values(A.units).reduce((s, u) => s + u.idle.length + (u.walk ? u.walk.flat().length : 0), 0), '| mismatches', bad, '| atlas height', y + row);
const idsM = m.units.map((u) => u.id).sort().join(), idsA = Object.keys(A.units).sort().join();
console.log('unit ids equal:', idsM === idsA);
