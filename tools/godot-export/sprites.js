// ВЫГРУЗКА, part 1 (Godot move, session 1): writes output/godot-export/sprites/ for the port.
//   node tools/godot-export/sprites.js            props + decals + atlases (all node), then serves the browser bake
//   node tools/godot-export/sprites.js --no-serve props + decals + atlases only
// The units (PIXEL_UNIT and the hand-built ones) need a canvas, so they are baked in the page: open
//   http://localhost:8795/tools/godot-export/bake.html   (this script is its server; POST /put writes under
//   output/godot-export/sprites/, so tools/serve.js stays untouched). The page also compares game vs file.
// Reads js/*.js only through vm / require, never edits them.
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http');
const root = path.resolve(__dirname, '..', '..'), out = path.join(root, 'output', 'godot-export', 'sprites');
const { Img } = require(path.join(root, 'output', 'pixel-claude-2026-09-24', 'png.cjs'));
const mk = (...p) => { const d = path.join(out, ...p); fs.mkdirSync(d, { recursive: true }); return d; };
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
// a script of js/ that is a plain `const NAME = ...` file, evaluated in a sandbox, the const handed back
const grab = (file, name) => vm.runInNewContext(fs.readFileSync(path.join(root, 'js', file), 'utf8') + '\n;' + name, {});
const writePng = (file, w, h, rgba) => { const im = new Img(w, h); im.data.set(rgba); fs.writeFileSync(file, im.png()); };

// ---- PROP_PIXELS: every Grid sprite as a PNG of its own (1 texel = 1 px) and one packed sheet ----
function props(src = 'prop-pixels.js', tag = 'props') {
  const P = require(path.join(root, 'js', src)), names = Object.keys(P.sprites).sort();
  const dir = mk(tag), pk = [], meta = {};
  let x = 1, y = 1, rowH = 0; const W = 2048;   // shelf pack
  for (const n of names) {
    const g = P.sprites[n], rgba = Buffer.alloc(g.w * g.h * 4);
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const c = g.get(i, j); if (!c) continue; const [r, gg, b] = hex(c), o = (j * g.w + i) * 4; rgba[o] = r; rgba[o + 1] = gg; rgba[o + 2] = b; rgba[o + 3] = 255; }
    writePng(path.join(dir, n.replace('@', '~') + '.png'), g.w, g.h, rgba);
    if (x + g.w + 1 > W) { x = 1; y += rowH + 1; rowH = 0; }
    pk.push({ n, x, y, g, rgba }); meta[n] = { file: tag + '/' + n.replace('@', '~') + '.png', w: g.w, h: g.h, rect: [x, y, g.w, g.h] };
    x += g.w + 1; rowH = Math.max(rowH, g.h);
  }
  const H = y + rowH + 1, sheet = Buffer.alloc(W * H * 4);
  for (const s of pk) for (let j = 0; j < s.g.h; j++) s.rgba.copy(sheet, ((s.y + j) * W + s.x) * 4, j * s.g.w * 4, (j + 1) * s.g.w * 4);
  writePng(path.join(out, tag + '.png'), W, H, sheet);
  fs.writeFileSync(path.join(out, tag + '.json'), JSON.stringify({ note: 'PROP_PIXELS.sprites, 1 texel = 1 png px, no anchor (the game fits each by code: PROP_FOOT, PAINTED_SIZE). Names with @pass/@lit/@dim are the art-pass variants; @ is ~ in file names.', sheet: tag + '.png', sheetSize: [W, H], count: names.length, sprites: meta }, null, 1));
  return names.length;
}

// ---- DECAL_PIXELS: palette + rows of letters ----
function decals() {
  const D = grab('decal-pixels.js', 'DECAL_PIXELS'), dir = mk('decals'), meta = {};
  for (const n in D) {
    const s = D[n], rgba = Buffer.alloc(s.w * s.h * 4);
    s.rows.forEach((row, j) => { for (let i = 0; i < s.w; i++) { const ch = row[i]; if (!ch || ch === '.') continue; const [r, g, b] = hex(s.pal[ch.charCodeAt(0) - 97]), o = (j * s.w + i) * 4; rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b; rgba[o + 3] = 255; } });
    writePng(path.join(dir, n + '.png'), s.w, s.h, rgba);
    meta[n] = { file: 'decals/' + n + '.png', w: s.w, h: s.h, surface: s.surface };
  }
  fs.writeFileSync(path.join(out, 'decals.json'), JSON.stringify(meta, null, 1));
  return Object.keys(D).length;
}

// ---- the three packed atlases: the PNG out of the data URI, the frame table beside it ----
function atlas(file, name, outName) {
  const A = grab(file, name), src = A.src || Object.values(A).find(v => typeof v === 'string' && v.startsWith('data:image'));
  fs.writeFileSync(path.join(out, outName + '.png'), Buffer.from(src.replace(/^data:image\/png;base64,/, ''), 'base64'));
  const meta = Object.assign({}, A); for (const k in meta) if (typeof meta[k] === 'string' && meta[k].startsWith('data:')) delete meta[k];
  fs.writeFileSync(path.join(out, outName + '.json'), JSON.stringify(meta));
  return A;
}
function atlases() {
  const env = atlas('pixel-env-assets.js', 'PIXEL_ENV_ASSETS', 'env-atlas'), fac = atlas('factory-assets.js', 'FACTORY_ASSETS', 'factory-atlas');
  const un = atlas('pixel-assets.js', 'PIXEL_ASSETS', 'unit-atlas-source');   // the raw packed atlas, for reference; the baked units are in units/
  return { env: Object.keys(env.items || {}).length, factory: Object.keys(fac.items || {}).length, units: Object.keys(un.units).length };
}

// ---- the server for the browser bake ----
function serve(port) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
  http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'POST' && u.pathname === '/put') {
      const rel = (u.searchParams.get('path') || '').replace(/\\/g, '/');
      if (!/^[\w\-./~ ]+$/.test(rel) || rel.includes('..')) { res.writeHead(400); return res.end('bad path'); }
      const chunks = []; req.on('data', c => chunks.push(c));
      req.on('end', () => {
        let body = Buffer.concat(chunks);
        if (rel.endsWith('.png')) body = Buffer.from(body.toString().replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const f = path.join(out, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, body);
        res.writeHead(200, { 'Access-Control-Allow-Origin': '*' }); res.end('ok ' + body.length);
      });
      return;
    }
    let p = path.join(root, decodeURIComponent(u.pathname));
    if (u.pathname.startsWith('/out/')) p = path.join(out, decodeURIComponent(u.pathname.slice(5)));   // the written files, for the comparison
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(res);
  }).listen(port, () => console.log('bake server on http://localhost:' + port + '/tools/godot-export/bake.html'));
}

fs.mkdirSync(out, { recursive: true });
console.log('props', props(), 'heaven', props('heaven-pixels.js', 'heaven'), 'decals', decals(), 'atlases', JSON.stringify(atlases()));
if (!process.argv.includes('--no-serve')) serve(+(process.env.PORT || 8795));
