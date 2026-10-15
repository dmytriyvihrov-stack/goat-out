const path = require('path'); const root = __dirname + '/../../js/';
const PP = require(root + 'prop-pixels.js'); const { sprites } = PP;
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (c) => { const [r, g, b] = hex(c); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const sat = (c) => { const [r, g, b] = hex(c); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
const stat = (g) => {
  let n = 0, edge = 0, edgeDark = 0, lSum = 0, rSum = 0, tSum = 0, bSum = 0, ln = 0, rn = 0, tn = 0, bn = 0, satSum = 0, lumSum = 0; const cols = new Set(); let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(x, y); if (!c) continue; n++; cols.add(c); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(x, y); if (!c) continue; const L = lum(c); satSum += sat(c); lumSum += L;
    const isEdge = !g.get(x - 1, y) || !g.get(x + 1, y) || !g.get(x, y - 1) || !g.get(x, y + 1); if (isEdge) { edge++; if (L < 0.02) edgeDark++; continue; }
    if (x < cx - 1) { lSum += L; ln++; } else if (x > cx + 1) { rSum += L; rn++; } if (y < cy - 1) { tSum += L; tn++; } else if (y > cy + 1) { bSum += L; bn++; } }
  return { w: maxX - minX + 1, h: maxY - minY + 1, n, colours: cols.size, edgeDark: edge ? +(edgeDark / edge).toFixed(2) : 0, lr: ln && rn ? +((lSum / ln) / (rSum / rn)).toFixed(2) : null, tb: tn && bn ? +((tSum / tn) / (bSum / bn)).toFixed(2) : null, sat: +(satSum / n).toFixed(2), lum: +(lumSum / n).toFixed(3) };
};
const rows = [];
for (const [name, g] of Object.entries(sprites)) { if (!g || !g.get) continue; if (/-lie|-up[0-9]|-bit|lantern[1-9]|-f$|-s$|-b$|@/.test(name)) continue; rows.push([name, stat(g)]); }
const units = {}; for (const f of ['ogre', 'spartan', 'thrower', 'shaman', 'warden', 'flayed', 'horse', 'pig']) { try { units[f] = require(root + f + '-pixels.js'); } catch (e) { units[f] = 'ERR ' + e.message.slice(0, 80); } }
const uRows = []; for (const [f, U] of Object.entries(units)) { if (typeof U === 'string') { uRows.push([f, U]); continue; } const sp = U.sprite || U.grid || U.frame; let g = null; try { g = sp ? sp(0, 0, 0, 'idle') : null; } catch (e) { uRows.push([f, 'sprite() ' + e.message.slice(0, 60)]); continue; } if (g && g.get) uRows.push([f, Object.assign({ TX: U.TX }, stat(g))]); else uRows.push([f, 'keys ' + Object.keys(U).join(',')]); }
const fmt = (r) => typeof r[1] === 'string' ? r[0] + ' ' + r[1] : r[0].padEnd(18) + Object.entries(r[1]).map(([k, v]) => k + '=' + v).join(' ');
console.log('--- units'); uRows.forEach((r) => console.log(fmt(r)));
console.log('--- props'); rows.forEach((r) => console.log(fmt(r)));
