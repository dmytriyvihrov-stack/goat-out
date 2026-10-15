const root = __dirname + '/../../js/';
global.ART_PASS = { ink: true };
const PP = require(root + 'prop-pixels.js'); const { sprites, P } = PP;
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (c) => { const [r, g, b] = hex(c); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const sat = (c) => { const [r, g, b] = hex(c); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
const edge = (g) => { let n = 0, L = 0, S = 0, same = 0; for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(x, y); if (!c) continue; if (g.get(x - 1, y) && g.get(x + 1, y) && g.get(x, y - 1) && g.get(x, y + 1)) continue; n++; L += lum(c); S += sat(c); } return { edgeLum: +(L / n).toFixed(3), edgeSat: +(S / n).toFixed(2) }; };
const changed = (a, b) => { let n = 0, d = 0; for (let i = 0; i < a.p.length; i++) { if (!!a.p[i] !== !!b.p[i]) return 'SILHOUETTE CHANGED'; if (a.p[i]) { n++; if (a.p[i] !== b.p[i]) d++; } } return +(d / n * 100).toFixed(1); };
const rows = [];
for (const name of ['barrel', 'bomb', 'altar', 'shield', 'sword', 'pail', 'gong', 'suit', 'armor', 'coop-front', 'stool', 'key', 'trophy', 'mill-arm', 'platter', 'spire', 'door-wood']) { const g = sprites[name], k = g.ink(P.ol); rows.push([name, edge(g), edge(k), changed(g, k)]); }
const U = { ogre: [require(root + 'ogre-pixels.js'), (M) => M.sprite(2, 'idle', 0).g, 'P'], spartan: [require(root + 'spartan-pixels.js'), (M) => M.sprite(2, 0).g, 'P'], warden: [require(root + 'warden-pixels.js'), (M) => M.sprite(2, 'idle', 0).g, 'OL'], flayed: [require(root + 'flayed-pixels.js'), (M) => M.sprite(2, 'idle', 0).g, 'OL'], horse: [require(root + 'horse-pixels.js'), (M) => M.sprite(2, undefined, 0).g, 'P'], thrower: [require(root + 'thrower-pixels.js'), (M) => M.sprite('S', 'idle', 0, 0), 'OL'] };
for (const [id, [M, get, key]] of Object.entries(U)) { try { const g = get(M), ol = key === 'P' ? M.P.ol : M.OL, k = g.ink(ol); rows.push([id, edge(g), edge(k), changed(g, k)]); } catch (e) { rows.push([id, e.message.slice(0, 60)]); } }
for (const r of rows) console.log(r[0].padEnd(12), typeof r[1] === 'string' ? r[1] : `edge lum ${r[1].edgeLum} -> ${r[2].edgeLum}   sat ${r[1].edgeSat} -> ${r[2].edgeSat}   pixels changed ${r[3]}%`);
