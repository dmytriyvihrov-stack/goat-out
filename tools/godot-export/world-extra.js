// ВЫГРУЗКА, the world's missing pictures (Godot port, fin-art-world, 23 Oct 2026): writes output/godot-export/sprites/world-extra/.
//   node tools/godot-export/world-extra.js
// What sprites.js left out, because it read js/prop-pixels.js alone and without TUNING:
//   props/<name>.png + props.json   every PROP_PIXELS sprite as the page has it (TUNING loaded, js/factory-props.js's
//                                   sprites added: the gas cylinder, the gears, the wall fixtures, the post, the bits),
//                                   1 texel = 1 px; @ is ~ in file names, as in sprites.js.
//   factory/floor-<look>.png        THE FACTORY's floors (`FACTORY_PIXELS.FLOORS`): 144 texels square, before `quiet`
//                                   (the port pulls them to their mean with its own `machine.floor`).
//   factory/cap-<look>.png          the walls' cap sheets as `FACTORY_PIXELS.wallCap` bakes them (192 px, 3 tiles).
//   env/<name>.png                  the packed env items as `PIXEL_ENV.study` recolours them (`ENV_STUDY`: the hay a step
//                                   down, the brazier lit again for THE LIT PASS), one atlas px a px.
//   mouse.png + mouse.json          the mouse's one frame off the units' atlas (`PIXEL_ART.icon('mouse')`), its foot.
//   factory/face-<look>.png         the walls' face strip source, one texel a px (`paintFace`'s 480 x 18, IRON's rows).
// The page code is run as it is, in a sandbox, through a canvas of solid fills (every painter here sets one hex colour
// per cell, which is all the shim draws). Reads js/*.js, never edits them.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..', '..'), out = path.join(root, 'output', 'godot-export', 'sprites', 'world-extra');
const { Img, decode } = require(path.join(root, 'output', 'pixel-claude-2026-09-24', 'png.cjs'));
const mk = (...p) => { const d = path.join(out, ...p); fs.mkdirSync(d, { recursive: true }); return d; };
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const writePng = (file, w, h, rgba) => { const im = new Img(w, h); im.data.set(rgba); fs.writeFileSync(file, im.png()); };

// ---- a canvas of solid fills: fillRect in one hex or rgba() colour, drawImage point-sampled, image data ----
class Canvas {
  constructor() { this._w = 0; this._h = 0; this.data = Buffer.alloc(0); }
  set width(v) { this._w = v; this.data = Buffer.alloc(this._w * this._h * 4); } get width() { return this._w; }
  set height(v) { this._h = v; this.data = Buffer.alloc(this._w * this._h * 4); } get height() { return this._h; }
  getContext() { return new Ctx(this); }
}
const rgbaOf = (s) => {
  if (s[0] === '#') return [...hex(s), 1];
  const m = /rgba?\(([^)]+)\)/.exec(s), v = m[1].split(',').map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1];
};
class Ctx {
  constructor(c) { this.c = c; this.fillStyle = '#000000'; this.imageSmoothingEnabled = false; }
  fillRect(x, y, w, h) {
    const c = this.c, [r, g, b, a] = rgbaOf(this.fillStyle);
    for (let j = Math.max(0, Math.round(y)); j < Math.min(c.height, Math.round(y + h)); j++) for (let i = Math.max(0, Math.round(x)); i < Math.min(c.width, Math.round(x + w)); i++) {
      const o = (j * c.width + i) * 4, d = c.data;
      if (a >= 1) { d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255; continue; }
      d[o] = Math.round(d[o] * (1 - a) + r * a); d[o + 1] = Math.round(d[o + 1] * (1 - a) + g * a); d[o + 2] = Math.round(d[o + 2] * (1 - a) + b * a); d[o + 3] = Math.max(d[o + 3], Math.round(a * 255));
    }
  }
  drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh) {
    if (sw === undefined) { dx = sx; dy = sy; sx = 0; sy = 0; sw = src.width; sh = src.height; dw = sw; dh = sh; }
    else if (dx === undefined) { dx = sx; dy = sy; dw = sw; dh = sh; sx = 0; sy = 0; sw = src.width; sh = src.height; }
    const c = this.c;
    for (let j = 0; j < Math.ceil(dh); j++) for (let i = 0; i < Math.ceil(dw); i++) {
      const X = Math.floor(dx) + i, Y = Math.floor(dy) + j; if (X < 0 || Y < 0 || X >= c.width || Y >= c.height) continue;
      const u = Math.floor(sx + (i + 0.5) * sw / dw), v = Math.floor(sy + (j + 0.5) * sh / dh); if (u < 0 || v < 0 || u >= src.width || v >= src.height) continue;
      const si = (v * src.width + u) * 4, o = (Y * c.width + X) * 4; if (!src.data[si + 3]) continue;
      for (let k = 0; k < 4; k++) c.data[o + k] = src.data[si + k];
    }
  }
  getImageData(x, y, w, h) { return { data: this.c.data }; }
  putImageData() {}
}
const canvasPng = (c, file) => writePng(file, c.width, c.height, c.data);

// ---- the game's scripts in one sandbox, as the page loads them (tuning first, the props, the factory's) ----
const ctx = { console, Math, document: { createElement: () => new Canvas() }, Image: class { set src(v) {} } };
vm.createContext(ctx);
const load = (file, names) => vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8') + '\n;' + names.map((n) => `globalThis.${n}=${n};`).join(''), ctx, { filename: file });
load('tuning.js', ['TILE', 'TILT', 'PALETTE', 'TUNING']);
load('prop-pixels.js', ['PROP_PIXELS']);
load('factory-props.js', ['FACTORY_PROPS']);
load('factory-assets.js', ['FACTORY_ASSETS']);
load('factory-pixels.js', ['FACTORY_PIXELS']);
// THE FISH's tank pieces (js/beasts-more.js) are PROP_PIXELS sprites too; only its sprites are wanted here, so a load
// that trips on something of the page's is let go and whatever it registered first is kept.
try { load('beasts-more.js', []); } catch (e) { console.log('beasts-more.js: ' + e.message.split('\n')[0]); }
load('pixel-env-assets.js', ['PIXEL_ENV_ASSETS']);
load('pixel-assets.js', ['PIXEL_ASSETS']);

// ---- every PROP_PIXELS sprite, one PNG each ----
function props() {
  const S = ctx.PROP_PIXELS.sprites, dir = mk('props'), meta = {};
  for (const n of Object.keys(S).sort()) {
    const g = S[n], rgba = Buffer.alloc(g.w * g.h * 4);
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const c = g.get(i, j); if (!c) continue; const [r, gg, b] = hex(c), o = (j * g.w + i) * 4; rgba[o] = r; rgba[o + 1] = gg; rgba[o + 2] = b; rgba[o + 3] = 255; }
    const file = n.replace('@', '~') + '.png';
    writePng(path.join(dir, file), g.w, g.h, rgba);
    meta[n] = { file: 'props/' + file, w: g.w, h: g.h };
  }
  fs.writeFileSync(path.join(out, 'props.json'), JSON.stringify({ note: 'PROP_PIXELS.sprites with TUNING and js/factory-props.js loaded, 1 texel = 1 png px; @ is ~ in file names.', sprites: meta }, null, 1));
  return Object.keys(meta).length;
}

// ---- THE FACTORY's floors and walls ----
function factory() {
  const F = ctx.FACTORY_PIXELS, A = ctx.FACTORY_ASSETS, dir = mk('factory');
  const png = decode(Buffer.from(A.src.replace(/^data:image\/png;base64,/, ''), 'base64')), atlas = new Canvas();
  atlas.width = png.w; atlas.height = png.h; atlas.data.set(png.data || png.rgba);
  F.image = atlas; F.ready = true;
  const looks = {};
  for (const L of F.FLOORS) {
    let c;
    if (L.paint) c = F.paintFloor(L.paint);
    else { const it = A.items[L.item]; c = new Canvas(); c.width = it[2]; c.height = it[3]; c.getContext('2d').drawImage(atlas, it[0], it[1], it[2], it[3], 0, 0, it[2], it[3]); }
    canvasPng(c, path.join(dir, 'floor-' + L.name.toLowerCase() + '.png')); looks['floor-' + L.name] = [c.width, c.height];
  }
  for (const L of F.WALLS) {
    const def = { wlook: L.name }, cap = F.wallCap(def);
    canvasPng(cap, path.join(dir, 'cap-' + L.name.toLowerCase() + '.png')); looks['cap-' + L.name] = [cap.width, cap.height];
    let face;
    if (L.paint) {
      const src = F.paintFace(L.paint); face = new Canvas(); face.width = src.width / 2; face.height = src.height / 2;
      face.getContext('2d').drawImage(src, 0, 0, src.width, src.height, 0, 0, face.width, face.height);
    } else {
      const it = A.items[L.item], fh = L.face[1] - L.face[0] + 1; face = new Canvas(); face.width = L.w; face.height = fh;
      face.getContext('2d').drawImage(atlas, it[0] + L.x0, it[1] + L.face[0], L.w, fh, 0, 0, L.w, fh); F.unyellow(face);
    }
    canvasPng(face, path.join(dir, 'face-' + L.name.toLowerCase() + '.png')); looks['face-' + L.name] = [face.width, face.height];
  }
  fs.writeFileSync(path.join(out, 'factory.json'), JSON.stringify({ note: 'floors: 144 texels a 6 x 6 patch of tiles, before quiet (TUNING.machine.floor). caps: 192 px = 3 tiles of 64. faces: one texel a px, stretched to a tile row of F64 px (IRON: its 70-wide rows laid end to end).', floors: F.FLOORS.map((f) => f.name), walls: F.WALLS.map((w) => w.name), sizes: looks }, null, 1));
  return Object.keys(looks).length;
}

// ---- the packed env items recoloured (`PIXEL_ENV.study`), and the mouse's frame ----
// ENV_STUDY lives in js/pixel-art.js beside page code; its object literal is cut out and evaluated alone.
function studies() {
  const src = fs.readFileSync(path.join(root, 'js', 'pixel-art.js'), 'utf8'), a = src.indexOf('const ENV_STUDY = {'), b = src.indexOf('\n};', a) + 3;
  const ENV_STUDY = vm.runInNewContext(src.slice(a, b) + '\n;ENV_STUDY', { Math, Uint8ClampedArray });
  const ids = vm.runInNewContext(src.slice(src.indexOf('const PIXEL_ENV_ID = {'), src.indexOf('\n};', src.indexOf('const PIXEL_ENV_ID = {')) + 3) + '\n;PIXEL_ENV_ID', {});
  const E = ctx.PIXEL_ENV_ASSETS, png = decode(Buffer.from(E.src.replace(/^data:image\/png;base64,/, ''), 'base64')), dir = mk('env'), meta = {};
  for (const name in ENV_STUDY) {
    const R = ENV_STUDY[name], f = E.items[ids[name] || name], a8 = new Uint8ClampedArray(f[2] * f[3] * 4), d = png.data || png.rgba;
    for (let y = 0; y < f[3]; y++) for (let x = 0; x < f[2]; x++) for (let k = 0; k < 4; k++) a8[(y * f[2] + x) * 4 + k] = d[((f[1] + y) * png.w + f[0] + x) * 4 + k];
    if (R.v !== undefined) for (let i = 0; i < a8.length; i += 4) {
      if (!a8[i + 3]) continue;
      const grey = Math.max(a8[i], a8[i + 1], a8[i + 2]) * (1 - R.s);
      for (let k = 0; k < 3; k++) a8[i + k] = Math.round((a8[i + k] * R.s + grey) * R.v);
    }
    if (R.relight) R.relight(a8, f[2], f[3]);
    writePng(path.join(dir, name + '.png'), f[2], f[3], Buffer.from(a8));
    meta[name] = { item: ids[name] || name, w: f[2], h: f[3], pass: R.pass || name };
  }
  fs.writeFileSync(path.join(out, 'env.json'), JSON.stringify({ note: 'PIXEL_ENV.study: the packed item recoloured by ENV_STUDY, drawn in its place while ART_PASS[pass] is on.', items: meta }, null, 1));
  const U = ctx.PIXEL_ASSETS, up = decode(Buffer.from(U.src.replace(/^data:image\/png;base64,/, ''), 'base64')), m = U.units.mouse.idle[0], mr = Buffer.alloc(m[2] * m[3] * 4), ud = up.data || up.rgba;
  for (let y = 0; y < m[3]; y++) ud.copy(mr, y * m[2] * 4, ((m[1] + y) * up.w + m[0]) * 4, ((m[1] + y) * up.w + m[0] + m[2]) * 4);
  writePng(path.join(out, 'mouse.png'), m[2], m[3], mr);
  fs.writeFileSync(path.join(out, 'mouse.json'), JSON.stringify({ note: 'PIXEL_ASSETS.units.mouse.idle[0]: one frame for every heading; foot is the point drawn at the entity origin; world px = png px * PIXEL_EXTENT.mouse / target.', target: U.target, foot: [m[4], m[5]], w: m[2], h: m[3] }, null, 1));
  return Object.keys(meta).length;
}

fs.mkdirSync(out, { recursive: true });
console.log('props', props(), 'factory', factory(), 'studies', studies());
