// node render.cjs [scale] → sheet.png: the goat (the build's own atlas frames, js/pixel-assets.js) in six
// facings wearing each cape (js/cape-pixels.js), and with three talismans' charms on his collar, on the
// dark of the game. Rows: no cape, then every cape; the last row is the collar alone with one, two and
// three charms. `scale` is image px per atlas px (a sprite cell is three of them). Also walk.png: the
// back and side views through the four steps of his run, to see the hem swing.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..', '..');
const { decode, Img, text } = require(path.join(root, 'output/pixel-claude-2026-09-24/png.cjs'));
const ctx = { console, Math, Uint8Array, Int16Array, Int32Array, Float32Array };
vm.createContext(ctx);
for (const f of ['js/tuning.js', 'js/rng.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
vm.runInContext(fs.readFileSync(path.join(root, 'js/pixel-assets.js'), 'utf8').replace('const PIXEL_ASSETS', 'globalThis.PIXEL_ASSETS'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/cape-pixels.js'), 'utf8').replace('const CAPE_PIXELS', 'globalThis.CAPE_PIXELS'), ctx);
const NECK = JSON.parse(/const PIXEL_NECK = (\[.*\]);/.exec(fs.readFileSync(path.join(root, 'js/pixel-art.js'), 'utf8'))[1]);
const A = vm.runInContext('PIXEL_ASSETS', ctx), CP = vm.runInContext('CAPE_PIXELS', ctx), TUNING = vm.runInContext('TUNING', ctx);
const CAPES = vm.runInContext('CAPES', ctx), ARTIFACTS = vm.runInContext('ARTIFACTS', ctx);
const atlas = decode(Buffer.from(A.src.split(',')[1], 'base64'));
for (let i = 3; i < atlas.data.length; i += 4) atlas.data[i] = atlas.data[i] >= 128 ? 255 : 0;   // as PIXEL_ART.init hardens it
const S = +(process.argv[2] || 3), K = S * 112 / 34;   // image px per atlas px, per world px
const u = A.units.goat;

// A canvas-shaped thing over an Img: world px from (ox, oy), the goat's feet.
const fake = (img, ox, oy) => ({ fillStyle: '#000', imageSmoothingEnabled: false,
  fillRect(x, y, w, h) { const x0 = Math.round(ox + x * K), y0 = Math.round(oy + y * K); img.fill(x0, y0, Math.round(ox + (x + w) * K) - x0, Math.round(oy + (y + h) * K) - y0, this.fillStyle); } });
const MIRROR = { 5: 3 };
function goat(img, d, ox, oy, frame) {
  const fd = MIRROR[d] !== undefined ? MIRROR[d] : d, flip = MIRROR[d] !== undefined, f = frame || u.idle[fd];
  const tmp = { w: f[2], h: f[3], data: Buffer.alloc(f[2] * f[3] * 4) };
  for (let y = 0; y < f[3]; y++) for (let x = 0; x < f[2]; x++) {
    const sx = flip ? f[2] - 1 - x : x, o = ((f[1] + y) * atlas.w + f[0] + sx) * 4, q = (y * f[2] + x) * 4;
    atlas.data.copy(tmp.data, q, o, o + 4);
  }
  const fx = flip ? f[2] - f[4] : f[4];
  img.blit(tmp, 0, 0, f[2], f[3], Math.round(ox - fx * S), Math.round(oy - f[5] * S), f[2] * S, f[3] * S);
}
// The collar as the game strokes it (a ring's near half), plotted in dots, then the charms on it.
function collar(img, d, ox, oy, ids) {
  const C = TUNING.goat.collar, q = CP.ring(d, NECK[d], C), c = fake(img, ox, oy);
  for (let k = 0; k <= 60; k++) { const p = CP.ringAt(q, k / 60); c.fillStyle = C.leather; c.fillRect(p.x - C.w / 2, p.y - C.w / 2, C.w, C.w); }
  if (q.back || !ids.length) return;
  const at = TUNING.talisman.charm.at[ids.length - 1];
  ids.forEach((id, k) => { const p = CP.ringAt(q, at[k]); CP.charm(c, id, p.x, p.y + TUNING.talisman.charm.drop); });
}
const angleOf = (d) => (d + 2) * Math.PI / 4;   // the facing `PIXEL_ART.draw` reads as view d
function wearing(img, d, ox, oy, cape, ids, frame, step = -1) {
  const c = fake(img, ox, oy);
  // the pixel shadow under him, as GOAT GRID draws it
  c.fillStyle = 'rgba(0,0,0,0)';
  img.fill(Math.round(ox - 11 * K), Math.round(oy - 2 * K), Math.round(22 * K), Math.round(4 * K), '#00000055');
  if (cape) CP.draw(c, cape, 'behind', angleOf(d), step);
  goat(img, d, ox, oy, frame);
  if (cape) CP.draw(c, cape, 'over', angleOf(d), step);
  collar(img, d, ox, oy, ids);
  if (cape) CP.clasp(c, cape, angleOf(d), NECK[d]);
}

const VIEWS = [[0, 'S FRONT'], [1, 'SW'], [2, 'W SIDE'], [3, 'NW'], [4, 'N BACK'], [7, 'SE']];
const cw = Math.round(48 * K), ch = Math.round(46 * K), pad = 20, left = 210, top = 40;
const rows = [[null, 'NO CAPE'], ...CAPES.map((c) => [c.id, c.name])];
const three = ARTIFACTS.slice(0, 3).map((a) => a.id);
const img = new Img(left + VIEWS.length * (cw + pad) + pad, top + (rows.length + 1) * (ch + pad) + pad, '#17121a');
text(img, 'GOAT OUT · CAPES ON HIM, AND THREE CHARMS ON THE COLLAR (' + three.join(', ') + ')', pad, 12, '#efe6d0', 3);
VIEWS.forEach(([d, name], i) => text(img, name, left + i * (cw + pad) + 10, top - 2, '#c9a24e', 3));
rows.forEach(([id, name], r) => {
  const y0 = top + 14 + r * (ch + pad);
  img.fill(pad, y0, left + VIEWS.length * (cw + pad) - pad, ch, r % 2 ? '#2a2026' : '#241b22');
  name.split(' ').reduce((acc, w) => { const last = acc[acc.length - 1]; if (last && (last + ' ' + w).length <= 11) acc[acc.length - 1] = last + ' ' + w; else acc.push(w); return acc; }, [])
    .forEach((l, k) => text(img, l, pad + 8, y0 + 16 + k * 22, id ? CAPES.find((c) => c.id === id).color : '#efe6d0', 3));
  if (id) CP.icon(fake(img, pad + 80, y0 + ch - 60), id, 0, 0, 5);   // the folded cape: chip, shelf, floor
  VIEWS.forEach(([d], i) => wearing(img, d, left + i * (cw + pad) + cw / 2, y0 + ch - Math.round(5 * K), id, three));
});
// the collar alone: one, two, three charms, front and front-diagonal
{
  const y0 = top + 14 + rows.length * (ch + pad);
  img.fill(pad, y0, left + VIEWS.length * (cw + pad) - pad, ch, '#241b22');
  text(img, 'CHARMS', pad + 8, y0 + 16, '#efe6d0', 3);
  [[0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [7, 2]].forEach(([d, n], i) => wearing(img, d, left + i * (cw + pad) + cw / 2, y0 + ch - Math.round(5 * K), null, ARTIFACTS.slice(3, 3 + n).map((a) => a.id)));
}
fs.writeFileSync(path.join(__dirname, 'sheet.png'), img.png());

// The run: the back, side and front-diagonal views over the four steps of his walk, the hem swinging.
{
  const W2 = 4 * (cw + pad) + left + pad, H2 = top + 3 * (ch + pad) + pad, im = new Img(W2, H2, '#17121a');
  text(im, 'THE RUN · CLOAK OF SIGNS · FOUR STEPS', pad, 12, '#efe6d0', 3);
  [[4, 'N BACK'], [2, 'W SIDE'], [1, 'SW']].forEach(([d, name], r) => {
    const y0 = top + 14 + r * (ch + pad); im.fill(pad, y0, W2 - pad * 2, ch, '#241b22'); text(im, name, pad + 8, y0 + 16, '#c9a24e', 3);
    for (let k = 0; k < 4; k++) wearing(im, d, left + k * (cw + pad) + cw / 2, y0 + ch - Math.round(5 * K), 'symbols', [], u.walk[d][k], k);
  });
  fs.writeFileSync(path.join(__dirname, 'walk.png'), im.png());
}
console.log('sheet.png', img.w, img.h);
