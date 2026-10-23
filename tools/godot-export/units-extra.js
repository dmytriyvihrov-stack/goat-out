// ВЫГРУЗКА, the units' missing pictures (Godot move, fin-art-units, 23 Oct 2026): writes output/godot-export/sprites/units-extra/.
//   node tools/godot-export/units-extra.js        serves the bake page, then open
//   http://localhost:8796/units-extra.html         (keep the pane visible; it logs DONE when every file is written)
// Like sprites.js + bake.html: the game's own scripts are loaded in the page and their own draw code paints every picture, so
// nothing is redrawn by hand. The page is this file's own (PAGE below), so the export stays one script. Reads js/*.js, never edits them.
//
// What it writes (all under units-extra/):
//   beasts/<name>.png          PROP_PIXELS sprites made by js/beasts-more.js (rabbit, husky, fish tank), 1 texel = 1 png px
//   goat-dress.png|json        overlays on each frame of units/goat.json, at the goat's own png px (worldPerPx the same):
//                              mark (THE MARK's bolt), wound<n> (n hearts lost), armour (the tortoise's iron),
//                              horns_<shape>_<antlers>_<look> (PIXEL_ART.horns: moose/gazelle/none, antlers 0/1, lava/venom/none)
//   heaven/god-<kind>.png      Heaven.animalGod: the animal lit from inside and ringed in gold (headY in heaven.json)
//   heaven/sil-<kind>-<live>.png  Heaven.animalSil: the stand's pictogram, lit / dim / ghost (box and fit in heaven.json)
//   heaven/white-wisp.png      Heaven.whiteWisp: the soul a sacrifice is counted in
//   data.json                  the cell art Godot paints itself, because JS paints it live: CAPE_PIXELS (views coloured per
//                              cape, the wind, the clasp, the charms), PIXEL_FACE / PIXEL_NECK / PIXEL_FACE_ART, the collar,
//                              HEAVEN_CRACKS, MIRROR_GLYPHS, the halo, the sign and the ask mark's grids
const fs = require('fs'), path = require('path'), http = require('http');
const root = path.resolve(__dirname, '..', '..'), out = path.join(root, 'output', 'godot-export', 'sprites', 'units-extra');

const PAGE = String.raw`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>units-extra bake</title>
<style>body{background:#1b1714;color:#d8ccb0;font:13px monospace;margin:8px}pre{white-space:pre-wrap}</style></head>
<body><pre id="log">loading scripts...</pre>
<script>
const LIST = 'tuning text-edit rng rooms gen showroom rules juice foley audio world input entities enemies waves endboss warden sacrifice gapcross thrower shaman coward factory machines snow status shop capes shell talismans beasts altar-art painted-art pixel-assets pixel-env-assets decal-pixels pixel-art skill-icons render prologue-art prop-pixels cape-pixels ogre-pixels spartan-pixels thrower-pixels shaman-pixels warden-pixels flayed-pixels factory-assets factory-pixels horse-pixels pig-pixels beasts-more small-art-study beast-chat heaven-pixels combat-fx scatter factory-props heaven heaven-home motes codex cheer dark goat-grid juice-preview'.split(' ');
const logEl = document.getElementById('log'), log = (s) => { logEl.textContent += '\n' + s; console.log(s); };
const loadAll = () => LIST.reduce((p, n) => p.then(() => new Promise((ok) => { const s = document.createElement('script'); s.src = '/js/' + n + '.js'; s.async = false; s.onload = ok; s.onerror = () => { log('FAILED ' + n); ok(); }; document.body.appendChild(s); })), Promise.resolve());
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
const put = (p, body) => fetch('/put?path=' + encodeURIComponent(p), { method: 'POST', body }).then((r) => r.text());
const png = (p, c) => put(p, c.toDataURL('image/png'));
const hashOf = (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 2166136261; for (let i = 0; i < d.length; i += 4) h = Math.imul(h ^ (d[i] | d[i + 1] << 8 | d[i + 2] << 16 | d[i + 3] << 24), 16777619); return c.width + 'x' + c.height + ':' + (h >>> 0); };
const trimmed = (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3]) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null; const o = mkc(x1 - x0 + 1, y1 - y0 + 1); o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height); return { c: o, x0, y0 }; };
const DIRS = [0, 1, 2, 3, 4, 5, 6, 7], ang = (d) => (d + 2) * Math.PI / 4;   // as bake.html: packed index d <- heading

// ---------- the beasts' own sprites (js/beasts-more.js puts them on PROP_PIXELS) ----------
async function beasts() {
  const names = ['rabbit-sit', 'rabbit-hop', 'husky-stand', 'husky-sing', 'fish-0', 'fish-1', 'fish-2', 'fish-3', 'fish-broken'], meta = {};
  for (const n of names) {
    const g = PROP_PIXELS.sprites[n]; if (!g) { log('no sprite ' + n); continue; }
    const c = mkc(g.w, g.h), x = c.getContext('2d');
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const col = g.get(i, j); if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } }
    await png('beasts/' + n + '.png', c); meta[n] = { w: g.w, h: g.h };
  }
  return meta;
}

// ---------- the goat's overlays, frame by frame of units/goat.json ----------
// One canvas per overlay at the goat sheet's own scale (atlas px: world px * target / extent), the foot where his is.
function goatDress() {
  const u = PIXEL_ASSETS.units.goat, G = PIXEL_ART.gaitCfg('goat'), k = PIXEL_EXTENT.goat / PIXEL_ASSETS.target, s = 1 / k;
  const P = new PaintedArt(), cells = [], W = 400, H = 400, FX = W / 2, FY = H * 0.78;
  const shot = (fn) => { const c = mkc(W, H), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.translate(FX, FY); x.scale(s, s); fn(x); const t = trimmed(c); return t && { c: t.c, foot: [FX - t.x0, FY - t.y0] }; };
  const shapes = [null, 'moose', 'gazelle'], looks = [null, 'lava', 'venom'];
  const spots = TUNING.goat.wounds.spots.length;
  for (const d of DIRS) {
    const a = ang(d), seq = [['idle', 0, false, null]];
    if (u.walk && G) for (let st = 0; st < G.steps; st++) seq.push(['walk' + st, (st + 0.5) * 0.5 / G.steps, true, null]);
    for (const [anim, t, moving, phase] of seq) {
      const R = { ctx: null, t };
      const g = { facing: a, vx: moving ? 80 : 0, vy: 0, x: 0, y: 0, state: 'idle' };
      const add = (layer, r) => { if (r) cells.push(Object.assign(r, { dir: d, anim: layer + '_' + anim })); };
      // THE MARK: the bolt 'PIXEL_ART.draw' lays over the frame while 'markOn'
      add('mark', shot((x) => {
        const [dd, flip] = PIXEL_ART.facing('goat', a), f = moving && u.walk ? u.walk[dd][Math.floor(t * 8) % 4] : u.idle[dd], m = PIXEL_ART.marks && PIXEL_ART.marks.get(f);
        if (!m) return; if (flip) x.scale(-1, 1); x.drawImage(m, -f[4] * k, -f[5] * k, f[2] * k, f[3] * k);
      }));
      for (let n = 1; n <= spots; n++) add('wound' + n, shot((x) => { R.ctx = x; P.woundCache = new Map(); P.wounds(R, g, n); }));
      add('armour', shot((x) => { R.ctx = x; P.armourCache = new Map(); P.armour(R, g); }));
      for (const shape of shapes) for (const ant of [0, 1]) for (const look of looks) {
        if (!shape && !ant && !look) continue;
        const mods = { antlers: !!ant, horn: shape ? { look: shape } : null, bomb: look === 'lava', splash: look === 'venom' };
        add('horns_' + (shape || 'none') + '_' + ant + '_' + (look || 'none'), shot((x) => PIXEL_ART.horns(x, 'goat', a, moving, t, 0, mods)));
      }
    }
  }
  return { cells, info: { worldPerPx: k, note: 'Overlays on units/goat.json frames: anim <layer>_<goat anim>, the same dir; foot is the goat foot. mark: THE MARK (markOn). wound<n>: n hearts lost (TUNING.goat.wounds, alpha baked). armour: the tortoise\'s iron (prop.tortoise.armour, alpha baked). horns_<moose|gazelle|none>_<antlers 0|1>_<lava|venom|none>: PIXEL_ART.horns at t of the frame (glow pulse and the venom drip are frozen there); with a shape the goat frame under it is bare_.' } };
}

async function emit(name, cells, info) {
  const seen = new Map(), uniq = [];
  for (const c of cells) { const key = hashOf(c.c); if (seen.has(key)) c.same = seen.get(key); else { seen.set(key, c); uniq.push(c); } }
  let W = 2048, x = 1, y = 1, rowH = 0; uniq.sort((a, b) => b.c.height - a.c.height);
  for (const c of uniq) { if (x + c.c.width + 1 > W) { x = 1; y += rowH + 1; rowH = 0; } c.rect = [x, y, c.c.width, c.c.height]; x += c.c.width + 1; rowH = Math.max(rowH, c.c.height); }
  const sheet = mkc(W, y + rowH + 1), sx = sheet.getContext('2d'); for (const c of uniq) sx.drawImage(c.c, c.rect[0], c.rect[1]);
  const frames = cells.map((c) => ({ dir: c.dir, anim: c.anim, rect: (c.same || c).rect, foot: c.foot.map((v) => +v.toFixed(3)) }));
  await png(name + '.png', sheet);
  await put(name + '.json', JSON.stringify(Object.assign({ unit: name, sheet: name + '.png', sheetSize: [sheet.width, sheet.height], frameCount: cells.length, uniqueFrames: uniq.length }, info, { frames })));
  return name + ' ' + cells.length + ' frames, ' + uniq.length + ' unique, ' + sheet.width + 'x' + sheet.height;
}

// ---------- heaven's baked pictures ----------
async function heaven() {
  const R = Object.create(Renderer.prototype); R.ctx = mkc(4, 4).getContext('2d'); R.t = 0; R.painted = new PaintedArt(); R.shadow = () => {};
  const kinds = ['tortoise', 'goose', 'crow', 'chicken', 'horse', 'pig', 'rabbit', 'husky', 'fish'], meta = { gods: {}, sils: {} };
  for (const kind of kinds) {
    const img = Heaven.animalGod(R, kind);
    if (img) { await png('heaven/god-' + kind + '.png', img); meta.gods[kind] = { w: img.width, h: img.height, headY: img.headY }; } else log('no god ' + kind);
    for (const live of ['lit', 'dim', 'ghost']) {
      const sil = Heaven.animalSil(R, kind, live === 'ghost' ? 'ghost' : live === 'lit');
      if (sil) { await png('heaven/sil-' + kind + '-' + live + '.png', sil); meta.sils[kind + '-' + live] = { w: sil.width, h: sil.height, box: sil.box, fit: !!sil.fit, headY: sil.headY }; }
    }
  }
  // the white wisp needs window.game.renderer (Heaven.whiteWisp): lend it this one
  window.game = { renderer: R }; R.painted.ready = R.painted.ready || PIXEL_ART.ready;
  const w = Heaven.whiteWisp(); if (w) { await png('heaven/white-wisp.png', w); meta.wisp = { w: w.width, h: w.height, at: [32, 0.56 * 64] }; } else log('no white wisp');
  delete window.game;
  return meta;
}

// ---------- the cell art Godot paints itself ----------
function data() {
  const C = CAPE_PIXELS, capes = {};
  for (const id of Object.keys(C.LOOKS)) {
    const L = C.LOOKS[id], views = {};
    for (const v of Object.keys(C.VIEWS)) {
      const V = C.VIEWS[v], w = V.rows[0].length, n = V.rows.length;
      // the cloth's letters coloured as CAPE_PIXELS.draw does first ('cloth'), so the pattern travels with the cells
      const col = (ch, i, j) => { if ((ch === 'b' || ch === 'c') && L.pat) { const p = L.pat(i - Math.floor(w / 2), j, n); if (p) return p; } if (ch === 'h' && L.fray && i % 2) return L.a; return L[ch] || null; };
      views[v] = V.rows.map((r, j) => [...r].map((ch, i) => (ch === '.' ? '.' : col(ch, i, j) || '.')));
    }
    capes[id] = { edge: L.edge, k: L.k, K: L.K, views };
  }
  const views = {}; for (const v of Object.keys(C.VIEWS)) { const V = C.VIEWS[v]; views[v] = { at: V.at, knot: V.knot || 1, layer: V.layer, w: V.rows[0].length, h: V.rows.length }; }
  // the wind's defaults (CAPE_PIXELS keeps WIND inside its closure: read back the one number set TUNING may not override)
  return {
    note: 'Cell art Godot paints itself (the JS draws it live). Cells are TUNING.goat.face.cell world px, from the goat foot.',
    cape: { viewOf: C.VIEW_OF, views, looks: capes, clasp: ['k.k', '.K.', 'k.k'], charmEdge: '#24160e', charms: C.CHARMS, folded: C.FOLDED,
      wind: { from: 0.25, trail: 3, rise: 4, riseWave: 1.2, idleRise: 0.8, spread: 2, lift: 1, wave: 1.4, freq: 11, phase: 0.9, idle: 0.6, idleFreq: 2.4 }, windTuning: TUNING.cape && TUNING.cape.wind },
    face: { PIXEL_FACE, PIXEL_NECK, PIXEL_FACE_ART, face: TUNING.goat.face, collar: TUNING.goat.collar, charm: TUNING.talisman.charm },
    heaven: { cracks: HEAVEN_CRACKS, mirrorGlyphs: MIRROR_GLYPHS, ask: ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'] },
  };
}

(async () => {
  await loadAll(); log('scripts ok');
  for (let i = 0; i < 400 && !(PIXEL_ART.ready && PIXEL_ART.marks); i++) await new Promise((r) => setTimeout(r, 50));
  if (!PIXEL_ART.ready) { log('atlas not ready'); return; }
  const b = await beasts(); log('beasts ' + Object.keys(b).join(' '));
  const gd = goatDress(); log(await emit('goat-dress', gd.cells, gd.info));
  const hv = await heaven(); log('heaven gods ' + Object.keys(hv.gods).join(' ') + ', sils ' + Object.keys(hv.sils).length);
  const D = data(); D.beasts = b; D.heavenBaked = hv;
  await put('data.json', JSON.stringify(D, null, 1));
  window.BAKE_DONE = true; log('DONE');
})().catch((e) => { log('ERROR ' + e.message + '\n' + e.stack); window.BAKE_ERR = String(e); });
</script></body></html>`;

function serve(port) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
  http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/units-extra.html') { res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); return res.end(PAGE); }
    if (req.method === 'POST' && u.pathname === '/put') {
      const rel = (u.searchParams.get('path') || '').replace(/\\/g, '/');
      if (!/^[\w\-./~ ]+$/.test(rel) || rel.includes('..')) { res.writeHead(400); return res.end('bad path'); }
      const chunks = []; req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        let body = Buffer.concat(chunks);
        if (rel.endsWith('.png')) body = Buffer.from(body.toString().replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const f = path.join(out, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, body);
        res.writeHead(200); res.end('ok ' + body.length);
      });
      return;
    }
    const p = path.join(root, decodeURIComponent(u.pathname));
    if (!p.startsWith(path.join(root, 'js')) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(res);
  }).listen(port, () => console.log('units-extra bake on http://localhost:' + port + '/units-extra.html'));
}

fs.mkdirSync(out, { recursive: true });
serve(+(process.env.PORT || 8796));
