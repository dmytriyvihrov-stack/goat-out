// Shared by the four sheets of the FACTORY floor study (11 Oct 2026): the palette, a shaded-volume drawer, the goat and a
// clubman off the atlas for scale, the three canon looks' floor and wall tiles, and every machine as a sprite on the game's
// own `Grid` (js/prop-pixels.js). One texel is TX world px everywhere here (a tile is 24 texels), so a machine drawn on the
// props sheet is the same picture laid in a room diagram. Concept art only: nothing in js/ loads this.
const fs = require('fs'), path = require('path');
const { Img, text, decode } = require('../pixel-claude-2026-09-24/png.cjs');
const { P, Grid } = require('../../js/prop-pixels.js');

const TILE = 32, TX = 4 / 3, TT = 24;   // world px a tile, world px a texel, texels a tile
const OL = '#1a1411';

// the factory's own colours beside the game's P: rust, brass, copper patina, glazed tile, concrete, meat, steam
const F = {
  rust: ['#2e170d', '#5a2e16', '#8a4a22', '#b06a34', '#cf8c4e'],
  iron: ['#1e1e24', '#303038', '#51505b', '#7a7984', '#a9a8b2'],
  brass: ['#4a360c', '#7c5c16', '#ad8524', '#d1a93c', '#f0cf6a'],
  patina: ['#15332a', '#235444', '#3a7a62', '#5aa082', '#8cc6a8'],
  tile: ['#6e736c', '#9ea49a', '#c6cbc2', '#e2e6dd', '#f4f6f0'],
  grout: '#4a4f49',
  conc: ['#3d3c37', '#55544d', '#6e6d64', '#878679', '#a09e90'],
  dust: ['#8a846e', '#b0a98f', '#cfc8ad'],
  brick: ['#2a1612', '#4a241c', '#6a3428', '#83463a'],
  timber: ['#2a1a10', '#4a2e1a', '#6e4826', '#8e6236'],
  meat: ['#4a1414', '#761f1f', '#a42e2a', '#c74b3e', '#e07060'],
  fat: ['#8a7a4e', '#b8a66a', '#dccb8a', '#efe4b0'],
  blood: ['#4a0d14', '#7c1620', '#b02a2c', '#de503c'],
  steam: ['#9aa4ad', '#c3cbd2', '#e4e9ee', '#ffffff'],
  glass: ['#2b3a4a', '#4a6e8a', '#7fb0cc', '#c8ecf8'],
  coal: ['#0f0d0e', '#221d1e', '#3a3233'],
  fire: ['#b43e1a', '#e27826', '#f5b43a', '#fde58a'],
  venom: ['#3d5a1c', '#6f8f2a', '#8fb33a', '#d6f07a'],
  amber: '#f2a233', amberHi: '#ffe08a', hit: '#fffaf0',
  soul: ['#2e1a3a', '#4a2a5e', '#6a3d7a', '#9a60b8', '#d2a0f0'],
  bone: ['#6e6650', '#8c8166', '#c6ba98', '#ebe1c4', '#fff7e2'],
  lea: ['#15100d', '#241a14', '#332419', '#44301f', '#55402a'],
  skin: ['#5a3222', '#8a5236', '#b87a54', '#d89c70', '#f0c49a'],
};
const hash = (x, y) => ((Math.imul(x + 5, 73856093) ^ Math.imul(y + 3, 19349663)) >>> 0) % 100;
// a lit volume: light from the top left, the rim dark
const lit = (T, dx, dy, n) => { const l = -(dx * 0.55 + dy * 0.83); return n > 0.82 && l < -0.45 ? T[0] : n > 0.55 && l < -0.2 ? T[1] : n > 0.72 && l > 0.55 ? T[4] : n > 0.4 && l > 0.3 ? T[3] : T[2]; };

// Drawing on a Grid at an offset, with shaded volumes beside the Grid's own calls.
class D {
  constructor(g, ox = 0, oy = 0) { this.g = g; this.ox = ox; this.oy = oy; }
  vol(cx, cy, rx, ry, T, test) {
    const g = this.g; cx += this.ox; cy += this.oy;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, n = Math.hypot(dx, dy);
      if (n > 1 || (test && !test(x - this.ox, y - this.oy))) continue; g.set(x, y, lit(T, dx, dy, n));
    }
    return this;
  }
  // a cylinder standing up (lit left to right) or lying (lit top to bottom)
  cyl(x, y, w, h, T, lying) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const t = lying ? (j + 0.5) / h : (i + 0.5) / w; const c = t < 0.12 ? T[3] : t < 0.3 ? T[4] : t < 0.6 ? T[3] : t < 0.82 ? T[2] : T[1];
      this.g.set(this.ox + x + i, this.oy + y + j, c);
    }
    return this;
  }
  rect(x, y, w, h, c, only) { this.g.rect(Math.round(this.ox + x), Math.round(this.oy + y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), c, only); return this; }
  hl(x, y, n, c, only) { return this.rect(x, y, n, 1, c, only); }
  vl(x, y, n, c, only) { return this.rect(x, y, 1, n, c, only); }
  dot(x, y, c) { this.g.set(this.ox + x, this.oy + y, c); return this; }
  line(x0, y0, x1, y1, c, only) { this.g.line(this.ox + x0, this.oy + y0, this.ox + x1, this.oy + y1, c, only); return this; }
  bar(x0, y0, x1, y1, t, c, l, d) { this.g.bar(this.ox + x0, this.oy + y0, this.ox + x1, this.oy + y1, t, c, l, d); return this; }
  poly(pts, c) { this.g.poly(pts.map(([x, y]) => [x + this.ox, y + this.oy]), c); return this; }
  ell(cx, cy, rx, ry, c, only) { this.g.ell(this.ox + cx, this.oy + cy, rx, ry, c, only); return this; }
  ring(cx, cy, rx, ry, t, c, only) { this.g.ring(this.ox + cx, this.oy + cy, rx, ry, t, c, only); return this; }
  tone(test, c, from) { this.g.tone((x, y) => test(x - this.ox, y - this.oy), c, from); return this; }
  // rivets along a line, every `gap`
  rivets(x0, y0, x1, y1, gap, c, c2) { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / gap)); for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; this.dot(x, y, c); if (c2) this.dot(x + 1, y + 1, c2); } return this; }
  // a toothed wheel seen face on
  gear(cx, cy, r, teeth, T, phase = 0) {
    this.ell(cx, cy, r, r, T[2]);
    for (let k = 0; k < teeth; k++) { const a = phase + k * 2 * Math.PI / teeth; this.bar(cx + Math.cos(a) * (r - 1), cy + Math.sin(a) * (r - 1), cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2), 2.2, T[2], T[3], T[1]); }
    this.ring(cx, cy, r, r, 1, T[3]); this.ring(cx, cy, r * 0.55, r * 0.55, 1, T[1]); this.ell(cx, cy, r * 0.25, r * 0.25, T[0]);
    for (let k = 0; k < 4; k++) { const a = phase + k * Math.PI / 2 + 0.4; this.line(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3, cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, T[1]); }
    return this;
  }
  // a pipe run with its collar joints
  pipe(x0, y0, x1, y1, t, T, joints = 2) {
    this.bar(x0, y0, x1, y1, t, T[2], T[4], T[0]);
    for (let k = 1; k <= joints; k++) { const u = k / (joints + 1), x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a); this.bar(x - nx * (t / 2 + 1), y - ny * (t / 2 + 1), x + nx * (t / 2 + 1), y + ny * (t / 2 + 1), 2.5, T[3], T[4], T[1]); }
    return this;
  }
  // a hook hanging from a point
  hook(x, y, c, c2) { this.vl(x, y, 4, c); this.line(x, y + 4, x + 2, y + 6, c); this.line(x + 2, y + 6, x + 4, y + 4, c); this.dot(x + 4, y + 3, c2 || c); return this; }
  // steam: a soft cloud of three tones, dithered at the edge
  steam(cx, cy, r, k = 1) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r * 1.3); x <= cx + r * 1.3; x++) {
      const dx = (x + 0.5 - cx) / (r * 1.3), dy = (y + 0.5 - cy) / r, n = Math.hypot(dx, dy); if (n > 1) continue;
      if (n > 0.75 && hash(x, y) > 45 * k) continue;
      this.dot(x, y, n < 0.35 ? F.steam[3] : n < 0.65 ? F.steam[2] : F.steam[1]);
    }
    return this;
  }
  flame(cx, by, h, w) { this.poly([[cx - w, by], [cx + w, by], [cx + w * 0.4, by - h * 0.6], [cx, by - h], [cx - w * 0.4, by - h * 0.6]], F.fire[1]); this.poly([[cx - w * 0.5, by], [cx + w * 0.5, by], [cx, by - h * 0.55]], F.fire[2]); this.poly([[cx - w * 0.25, by], [cx + w * 0.25, by], [cx, by - h * 0.3]], F.fire[3]); return this; }
  blood(cx, cy, rx, ry, seed = 1) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, n = Math.hypot(dx, dy); if (n > 1 || (n > 0.7 && hash(x * seed, y) > 55)) continue; this.dot(x, y, n < 0.4 ? F.blood[2] : F.blood[1]); } return this; }
  outline(c = OL) { this.g.outline(c); return this; }
}

const toImg = (g) => { const im = new Img(g.w, g.h); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(x, y); if (c) im.fill(x, y, 1, 1, c); } return im; };

// the atlas, for the goat and a clubman at world size: `k` world px per atlas px
const src = fs.readFileSync(path.join(__dirname, '../../js/pixel-assets.js'), 'utf8');
const A = JSON.parse(src.match(/const PIXEL_ASSETS = (\{.*?\});/s)[1].replace(/"image":"data:image\/png;base64,[^"]*"/, '"image":""'));
const at = decode(Buffer.from(src.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)[1], 'base64'));
const EXT = { goat: 34, clubman: 36, mage: 38 };
const atlasImg = (u, d) => { const f = A.units[u].idle[d], im = new Img(f[2], f[3]); for (let j = 0; j < f[3]; j++) for (let i = 0; i < f[2]; i++) { const k = ((f[1] + j) * at.w + f[0] + i) * 4; if (at.data[k + 3] < 128) continue; im.fill(i, j, 1, 1, '#' + [0, 1, 2].map((o) => at.data[k + o].toString(16).padStart(2, '0')).join('')); } return { im, foot: f[5], k: EXT[u] / A.target }; };

// Lays an atlas unit on the sheet with its feet at world point (wx, wy) of a diagram whose texel origin is (ox, oy) px and
// zoom Z px a texel. A unit's world height is EXT[u], so its px scale is Z / TX world→px times k atlas→world.
const putUnit = (img, u, d, ox, oy, wx, wy, Z, tint) => {
  const a = atlasImg(u, d), s = a.k * Z / TX, w = Math.round(a.im.w * s), h = Math.round(a.im.h * s);
  if (tint) { for (let i = 0; i < a.im.data.length; i += 4) if (a.im.data[i + 3]) { a.im.data[i] = a.im.data[i] * 0.5 + 180 * 0.5; a.im.data[i + 1] *= 0.5; a.im.data[i + 2] *= 0.5; } }
  img.blit(a.im, 0, 0, a.im.w, a.im.h, Math.round(ox + wx * Z / TX - w / 2), Math.round(oy + wy * Z / TX - a.foot * s), w, h, true);
};

// ---------------------------------------------------------------- the three looks: a floor tile and a wall each
// Every painter fills one tile (TT x TT texels) at texel (x, y) of grid g; (tx, ty) is the tile's place for the hash.
const LOOKS = {
  kill: { name: 'A  THE KILLING FLOOR', sub: 'glazed tile, blood gutters to a drain, riveted iron plate over brick, hooks on a rail',
    floor(d, x, y, tx, ty) {
      d.rect(x, y, TT, TT, F.grout);
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const h = hash(tx * 4 + i, ty * 4 + j); const c = h < 8 ? F.tile[1] : h < 30 ? F.tile[2] : F.tile[3]; d.rect(x + i * 6 + 1, y + j * 6 + 1, 5, 5, c); d.dot(x + i * 6 + 1, y + j * 6 + 1, F.tile[4]); if (h > 92) d.dot(x + i * 6 + 3, y + j * 6 + 3, F.tile[1]); }
    },
    gutter(d, x, y, vertical) { if (vertical) { d.rect(x + 9, y, 6, TT, F.tile[0]); d.rect(x + 10, y, 4, TT, F.blood[1]); d.vl(x + 11, y, TT, F.blood[2]); } else { d.rect(x, y + 9, TT, 6, F.tile[0]); d.rect(x, y + 10, TT, 4, F.blood[1]); d.hl(x, y + 11, TT, F.blood[2]); } },
    // the far wall: a cap of dark iron, a face of riveted plates
    wall(d, x, y, face) {
      d.rect(x, y, TT, TT, F.iron[1]); d.hl(x, y, TT, F.iron[2]); d.rect(x, y + 7, TT, 1, F.iron[0]);
      if (!face) { for (let j = 2; j < TT; j += 6) for (let i = 2; i < TT; i += 6) d.dot(x + i, y + j, F.iron[0]); return; }
      d.rect(x, y + 8, TT, TT - 8, F.brick[1]);
      for (let j = 8; j < TT; j += 4) for (let i = (j / 4 % 2) * 4; i < TT; i += 8) { d.rect(x + i, y + j, 7, 3, hash(x + i, y + j) < 30 ? F.brick[2] : F.brick[1]); }
      d.rect(x, y + 9, TT, 11, F.iron[2]); d.hl(x, y + 9, TT, F.iron[3]); d.hl(x, y + 19, TT, F.iron[1]);
      d.rivets(x + 2, y + 11, x + 22, y + 11, 5, F.iron[4], F.iron[0]); d.rivets(x + 2, y + 17, x + 22, y + 17, 5, F.iron[4], F.iron[0]);
      if (hash(x, y) < 40) d.blood(x + 6 + hash(y, x) % 10, y + 22, 3, 1.5, 3);
    },
    bg: '#5a5e58' },
  render: { name: 'B  THE RENDERING HOUSE', sub: 'rusted iron plate, grating over the offal pits, black brick, copper pipes gone green, boilers and steam',
    floor(d, x, y, tx, ty) {
      const h = hash(tx, ty);
      if (h < 22) {   // a grating over the dark: a hazard to look into, the floor you cannot fall through
        d.rect(x, y, TT, TT, F.coal[1]); for (let j = 1; j < TT; j += 4) d.hl(x, y + j, TT, F.iron[2]); for (let i = 1; i < TT; i += 4) d.vl(x + i, y, TT, F.iron[2]); d.rect(x, y, TT, 1, F.iron[3]); d.rect(x, y, 1, TT, F.iron[3]); return;
      }
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
        const hh = hash(tx * 2 + i, ty * 2 + j), c = hh < 35 ? F.rust[1] : hh < 70 ? F.rust[2] : F.rust[3];
        d.rect(x + i * 12, y + j * 12, 12, 12, c); d.hl(x + i * 12, y + j * 12, 12, F.rust[3]); d.vl(x + i * 12, y + j * 12, 12, F.rust[3]); d.hl(x + i * 12, y + j * 12 + 11, 12, F.rust[0]); d.vl(x + i * 12 + 11, y + j * 12, 12, F.rust[0]);
        d.dot(x + i * 12 + 2, y + j * 12 + 2, F.iron[3]); d.dot(x + i * 12 + 9, y + j * 12 + 9, F.iron[3]); d.dot(x + i * 12 + 9, y + j * 12 + 2, F.iron[3]); d.dot(x + i * 12 + 2, y + j * 12 + 9, F.iron[3]);
        if (hh > 80) d.rect(x + i * 12 + 4, y + j * 12 + 5, 4, 3, F.rust[0]);
      }
    },
    wall(d, x, y, face) {
      d.rect(x, y, TT, TT, F.coal[1]); d.hl(x, y, TT, F.coal[2]);
      if (!face) { for (let j = 3; j < TT; j += 5) for (let i = 1; i < TT; i += 7) d.rect(x + i, y + j, 5, 2, hash(x + i, y + j) < 50 ? F.brick[0] : F.coal[2]); return; }
      d.rect(x, y + 7, TT, TT - 7, F.brick[0]);
      for (let j = 8; j < TT; j += 4) for (let i = (j / 4 % 2) * 4; i < TT; i += 8) d.rect(x + i, y + j, 7, 3, hash(x + i, y + j) < 25 ? F.brick[2] : F.brick[1]);
      d.pipe(x, y + 12, x + TT - 1, y + 12, 4, F.patina, 1); if (hash(x, y) < 50) { d.rect(x + 9, y + 15, 2, 6, F.patina[1]); d.blood(x + 10, y + 22, 2, 1.5, 7); }
      d.pipe(x, y + 19, x + TT - 1, y + 19, 2, F.rust, 0);
    },
    bg: '#2a2022' },
  bone: { name: 'C  THE BONE MILL', sub: 'concrete under bone dust, duckboards, timber and iron bands, chutes and gears, the bone pile',
    floor(d, x, y, tx, ty) {
      const h = hash(tx, ty);
      if (ty % 3 === 1 && h < 60) {   // a run of duckboards, the only wood on the floor
        d.rect(x, y, TT, TT, F.timber[1]); for (let j = 0; j < TT; j += 4) { d.hl(x, y + j, TT, F.timber[3]); d.hl(x, y + j + 3, TT, F.timber[0]); } d.vl(x + 5, y, TT, F.timber[0]); d.vl(x + 18, y, TT, F.timber[0]); return;
      }
      const c = h < 30 ? F.conc[2] : h < 70 ? F.conc[3] : F.conc[1];
      d.rect(x, y, TT, TT, c); d.hl(x, y + TT - 1, TT, F.conc[0]); d.vl(x + TT - 1, y, TT, F.conc[0]); d.hl(x, y, TT, F.conc[4]);
      if (h > 50) for (let k = 0; k < 6; k++) d.dot(x + hash(k, tx + ty * 7) % 22 + 1, y + hash(k + 9, tx * 3) % 22 + 1, F.dust[1]);
      if (h > 85) d.line(x + 3, y + 20, x + 14, y + 9, F.conc[0]);
      if (h % 17 === 3) { d.hl(x + 6, y + 14, 6, F.bone[3]); d.dot(x + 5, y + 13, F.bone[3]); d.dot(x + 12, y + 15, F.bone[3]); }
    },
    wall(d, x, y, face) {
      d.rect(x, y, TT, TT, F.timber[1]); d.hl(x, y, TT, F.timber[2]); d.rect(x, y + 7, TT, 1, F.timber[0]);
      if (!face) { d.rect(x + 2, y + 2, TT - 4, 3, F.iron[1]); d.rivets(x + 3, y + 3, x + 20, y + 3, 6, F.iron[3]); return; }
      d.rect(x, y + 8, TT, TT - 8, F.timber[2]); for (let i = 0; i < TT; i += 6) d.vl(x + i, y + 8, TT - 8, F.timber[1]);
      d.rect(x, y + 11, TT, 3, F.iron[1]); d.rivets(x + 2, y + 12, x + 22, y + 12, 5, F.iron[3]); d.rect(x, y + 18, TT, 3, F.iron[1]); d.rivets(x + 2, y + 19, x + 22, y + 19, 5, F.iron[3]);
      if (hash(x, y) < 35) { d.rect(x + 8, y + 14, 8, 4, F.dust[1]); d.hl(x + 9, y + 15, 6, F.dust[2]); }
    },
    bg: '#3a352c' },
};

// A room of w x h tiles of a look on its own Grid: the far wall's face along the top, caps on the three other sides.
function room(look, w, h, deco) {
  const L = LOOKS[look], g = new Grid(w * TT, h * TT), d = new D(g);
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    const x = tx * TT, y = ty * TT, edge = tx === 0 || tx === w - 1 || ty === h - 1;
    if (ty === 0) L.wall(d, x, y, true); else if (edge) L.wall(d, x, y, false); else L.floor(d, x, y, tx, ty);
  }
  // the wall caps' dark rim where they meet floor
  for (let ty = 1; ty < h - 1; ty++) { d.vl(TT - 1, ty * TT, TT, OL); d.vl((w - 1) * TT, ty * TT, TT, OL); }
  d.hl(TT, (h - 1) * TT, (w - 2) * TT, OL); d.hl(TT, TT, (w - 2) * TT, OL);
  if (deco) deco(d, g);
  return g;
}

module.exports = { fs, path, Img, text, P, Grid, F, D, TX, TT, TILE, OL, hash, lit, toImg, atlasImg, putUnit, LOOKS, room };
