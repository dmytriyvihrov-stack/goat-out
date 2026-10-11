// node engines.cjs [zoom] → engines.png: THE RENDERED, the second pass on the mechanical man (11 Oct 2026). Not a steampunk
// robot: the cult's iron is driven by what it rendered. Every engine is a shell round a glass window, and in the window burns
// the soul of an animal that went down the line: a dog in the small one, a goat in the man-sized one, a bull in the boss.
// Fire feeds the soul-flame (STOKED), poison finds no blood; water and steam put it out and the soul goes up, white, to
// heaven (`Motes`), and the seer's witchfire CORRUPTS it (violet), and the engine turns on its own cult. Concept art only.
const L = require('./lib.cjs'), OG = require('../../js/ogre-pixels.js');
const { fs, Img, text, Grid, F, D, OL, hash, toImg, atlasImg } = L;

const SOUL = ['#5a7a98', '#8fb8d8', '#c8e6f4', '#f4fbff'], VIOL = ['#4a2a5e', '#7c44c4', '#ae82ec', '#e6d6ff'], CRACK = '#1d2a36';
const rivetRow = (d, x0, x1, y, T = F.iron) => d.rivets(x0, y, x1, y, 4, T[4], T[0]);
const ironFoot = (d, cx, w = 12) => { d.rect(cx - w / 2, d.g.h - 3, w, 3, F.iron[1]); d.hl(cx - w / 2, d.g.h - 3, w, F.iron[3]); };
const gauge = (d, x, y, r, hot) => { d.ell(x, y, r, r, F.glass[3]); d.ring(x, y, r, r, 1, F.brass[3]); const a = hot ? -0.3 : -2.4; d.line(x, y, x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r - 1), hot ? F.blood[3] : F.coal[0]); d.dot(x, y, F.brass[0]); };
// the window: a brass-rimmed glass port, and what burns behind it. `soul(d, cx, cy, r)` draws the animal's ghost in flame.
function port(d, cx, cy, rx, ry, state, soul) {
  const T = state === 'corrupt' ? VIOL : SOUL;
  d.ell(cx, cy, rx, ry, state === 'quenched' ? F.coal[0] : T[0]);
  if (state !== 'quenched') { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, n = Math.hypot(dx, dy); if (n > 1) continue; if (n < 0.45) d.dot(x, y, T[2]); else if (n < 0.75 && hash(x, y * 3) < 60) d.dot(x, y, T[1]); } soul(d, cx, cy, Math.min(rx, ry), T); }
  else { d.line(cx - rx * 0.6, cy - ry * 0.5, cx + rx * 0.2, cy + ry * 0.6, F.glass[1]); d.line(cx + rx * 0.2, cy + ry * 0.6, cx + rx * 0.7, cy - ry * 0.1, F.glass[1]); d.line(cx - rx * 0.1, cy - ry * 0.9, cx + rx * 0.2, cy - ry * 0.2, F.glass[1]); }
  d.ring(cx, cy, rx + 1, ry + 1, 2, F.brass[2]); d.ring(cx, cy, rx + 1, ry + 1, 1, F.brass[3]);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; d.dot(cx + Math.cos(a) * (rx + 1), cy + Math.sin(a) * (ry + 1), F.brass[0]); }
  if (state === 'quenched') { d.steam(cx, cy - ry - 4, 4, 0.6); }
}
// the ghosts: a few white strokes in the flame, read at a glance as the animal that was
const ghostDog = (d, cx, cy, r, T) => { d.ell(cx, cy + 1, r * 0.45, r * 0.35, T[3]); d.poly([[cx - r * 0.5, cy - r * 0.1], [cx - r * 0.3, cy - r * 0.6], [cx - r * 0.15, cy - r * 0.15]], T[3]); d.poly([[cx + r * 0.5, cy - r * 0.1], [cx + r * 0.3, cy - r * 0.6], [cx + r * 0.15, cy - r * 0.15]], T[3]); d.dot(cx - r * 0.2, cy, T[0]); d.dot(cx + r * 0.2, cy, T[0]); d.ell(cx, cy + r * 0.3, r * 0.12, r * 0.1, T[0]); };
const ghostGoat = (d, cx, cy, r, T) => { d.ell(cx, cy + 1, r * 0.35, r * 0.45, T[3]); d.line(cx - r * 0.25, cy - r * 0.3, cx - r * 0.55, cy - r * 0.8, T[3]); d.line(cx + r * 0.25, cy - r * 0.3, cx + r * 0.55, cy - r * 0.8, T[3]); d.line(cx - r * 0.2, cy - r * 0.3, cx - r * 0.5, cy - r * 0.75, T[2]); d.dot(cx - r * 0.15, cy - r * 0.05, T[0]); d.dot(cx + r * 0.15, cy - r * 0.05, T[0]); d.vl(cx, cy + r * 0.45, r * 0.25, T[2]); };
const ghostBull = (d, cx, cy, r, T) => { d.ell(cx, cy + 2, r * 0.45, r * 0.4, T[3]); d.line(cx - r * 0.4, cy - r * 0.2, cx - r * 0.85, cy - r * 0.6, T[3]); d.line(cx - r * 0.85, cy - r * 0.6, cx - r * 0.7, cy - r * 0.9, T[3]); d.line(cx + r * 0.4, cy - r * 0.2, cx + r * 0.85, cy - r * 0.6, T[3]); d.line(cx + r * 0.85, cy - r * 0.6, cx + r * 0.7, cy - r * 0.9, T[3]); d.dot(cx - r * 0.2, cy, T[0]); d.dot(cx + r * 0.2, cy, T[0]); d.ring(cx, cy + r * 0.3, r * 0.1, r * 0.08, 1, T[0]); d.dot(cx - r * 0.18, cy + r * 0.3, T[0]); d.dot(cx + r * 0.18, cy + r * 0.3, T[0]); };
// the soul leaving a quenched shell: a white mote with the ghost in it, rising
const leaving = (d, cx, cy, r, ghost) => { d.ell(cx, cy, r, r * 1.1, SOUL[1]); d.ell(cx, cy, r * 0.7, r * 0.8, SOUL[2]); ghost(d, cx, cy, r * 0.9, SOUL); for (let k = 1; k <= 3; k++) d.dot(cx + (k % 2 ? -2 : 2), cy + r + 2 + k * 3, SOUL[1]); };

const LOOKS = [
  { name: 'THE KETTLE', sub: 'hound-sized: a squat boiler on four pistons, a dog\'s soul in the port; the hound\'s ring and dart, built up as steam', W: 56, H: 50, ghost: ghostDog, states: ['BURNING', 'QUENCHED', 'CORRUPTED'],
    draw(d, s) {
      const cx = 26, by = 30, st = ['burn', 'quenched', 'corrupt'][s];
      for (const [lx, ly] of [[cx - 13, by + 8], [cx + 11, by + 10], [cx - 7, by + 12], [cx + 5, by + 14]]) { d.bar(lx, ly - 8, lx, ly + 6, 3, F.iron[2], F.iron[3], F.iron[0]); d.ring(lx, ly - 1, 2, 2, 1, F.brass[3]); d.rect(lx - 3, ly + 5, 7, 2, F.iron[1]); }
      d.vol(cx, by, 20, 11, F.iron); for (const x of [cx - 10, cx + 10]) d.rivets(x, by - 9, x, by + 9, 4, F.iron[4], F.iron[0]);
      d.cyl(cx + 16, by - 24, 4, 18, F.iron); d.steam(cx + 18, by - 28, s === 1 ? 2 : 4, s === 1 ? 0.3 : 0.8);
      d.vol(cx - 10, by - 10, 10, 7, F.brass); d.poly([[cx - 20, by - 8], [cx - 1, by - 8], [cx - 3, by - 2], [cx - 18, by - 2]], F.brass[2]); for (let x = cx - 18; x < cx - 2; x += 3) d.poly([[x, by - 8], [x + 3, by - 8], [x + 1.5, by - 5]], F.bone[4]);
      port(d, cx - 10, by - 13, 5, 4, st, this.ghost); gauge(d, cx + 6, by - 2, 2.5, s === 0);
      if (s === 1) leaving(d, cx - 10, by - 30, 5, this.ghost);
      if (s === 2) d.tone((x, y) => hash(x, y) < 14 && Math.abs(x - cx) < 20, VIOL[1], [F.iron[2]]);
    } },
  { name: 'THE STOKER', sub: 'man-sized: the furnace automaton, a goat\'s soul in the port where the firebox was; the clubman\'s swing, faster off fire', W: 64, H: 86, ghost: ghostGoat, states: ['BURNING', 'QUENCHED', 'CORRUPTED'],
    draw(d, s) {
      const cx = 32, st = ['burn', 'quenched', 'corrupt'][s];
      for (const lx of [cx - 9, cx + 9]) { d.cyl(lx - 4, 60, 8, 22, F.iron); ironFoot(d, lx); d.hl(lx - 4, 68, 8, F.iron[0]); }
      d.vol(cx, 44, 17, 19, F.iron); for (const y of [30, 58]) rivetRow(d, cx - 15, cx + 15, y);
      port(d, cx, 45, 9, 8, st, this.ghost);
      d.vol(cx - 19, 30, 6, 6, F.iron); d.vol(cx + 19, 30, 6, 6, F.iron);
      d.bar(cx - 21, 33, cx - 25, 50, 5, F.iron[2], F.iron[3], F.iron[0]); d.bar(cx - 25, 50, cx - 24, 64, 4.5, F.iron[2], F.iron[3], F.iron[0]);
      d.bar(cx - 24, 62, cx - 24, 78, 2, F.timber[2], F.timber[3], F.timber[0]); d.poly([[cx - 29, 76], [cx - 19, 76], [cx - 20, 84], [cx - 28, 84]], F.iron[3]); d.hl(cx - 28, 77, 8, F.iron[4]);
      d.bar(cx + 21, 33, cx + 26, 48, 5, F.iron[2], F.iron[3], F.iron[0]); d.bar(cx + 26, 48, cx + 22, 62, 4.5, F.iron[2], F.iron[3], F.iron[0]);
      d.line(cx + 22, 62, cx + 19, 74, F.iron[3]); d.line(cx + 23, 62, cx + 26, 74, F.iron[3]); d.dot(cx + 19, 75, F.iron[4]); d.dot(cx + 26, 75, F.iron[4]);
      d.cyl(cx - 6, 8, 12, 18, F.iron); d.ell(cx, 8, 8, 3, F.iron[3]); d.ring(cx, 8, 8, 3, 1, F.iron[4]); d.ell(cx, 7, 5, 1.5, F.coal[0]);
      gauge(d, cx, 17, 4, s === 0 || s === 2); d.rect(cx - 7, 24, 14, 3, F.brass[2]); rivetRow(d, cx - 5, cx + 5, 25, F.brass);
      if (s === 0) { d.steam(cx + 22, 20, 2.5, 0.5); for (let k = 0; k < 3; k++) d.flame(cx - 2 + k * 2, 6, 4 + hash(k, 1) % 3, 1.2); }
      if (s === 1) { leaving(d, cx, 2, 7, this.ghost); d.tone((x, y) => y > 28 && hash(x, y) < 20, F.iron[1], [F.iron[2], F.iron[3]]); }
      if (s === 2) { d.tone((x, y) => y > 28 && y < 60 && Math.abs(x - cx) < 15 && hash(x, y) < 14, VIOL[1], [F.iron[2], F.iron[1]]); for (let k = 0; k < 3; k++) d.poly([[cx - 2 + k * 2, 6], [cx + k * 2, 6], [cx - 1 + k * 2, 2 - hash(k, 2) % 3]], VIOL[2]); }
    } },
  { name: 'THE ENGINE', sub: 'the floor\'s last man, ogre-sized: a walking boiler with two fire doors, hooks for hands, four stacks, a bull\'s soul in the belly; the ogre\'s leap and slam, a ring of scald on landing', W: 100, H: 116, ghost: ghostBull, states: ['BURNING', 'QUENCHED', 'CORRUPTED'],
    draw(d, s) {
      const cx = 50, st = ['burn', 'quenched', 'corrupt'][s];
      for (const lx of [cx - 18, cx + 18]) { d.cyl(lx - 7, 80, 14, 32, F.iron); ironFoot(d, lx, 20); for (const y of [88, 100]) d.hl(lx - 7, y, 14, F.iron[0]); d.ring(lx, 84, 3, 3, 1, F.brass[3]); }
      d.vol(cx, 56, 32, 30, F.iron); for (const y of [34, 48, 70, 80]) d.rivets(cx - 29, y, cx + 29, y, 5, F.iron[4], F.iron[0]);
      port(d, cx, 60, 15, 13, st, this.ghost);
      for (const dx of [-24, 12]) { d.rect(cx + dx, 36, 12, 10, F.iron[1]); d.rect(cx + dx + 2, 38, 8, 6, s === 1 ? F.coal[0] : F.fire[0]); for (let x = cx + dx + 3; x < cx + dx + 10; x += 2) d.dot(x, 40 + (x % 2), s === 1 ? F.coal[2] : s === 2 ? VIOL[2] : F.fire[2]); d.hl(cx + dx, 36, 12, F.iron[3]); }   // two fire doors on the chest
      d.vol(cx - 36, 40, 10, 9, F.iron); d.vol(cx + 36, 40, 10, 9, F.iron);
      d.bar(cx - 40, 46, cx - 46, 70, 8, F.iron[2], F.iron[3], F.iron[0]); d.bar(cx - 46, 70, cx - 42, 92, 7, F.iron[2], F.iron[3], F.iron[0]);
      d.bar(cx + 40, 46, cx + 46, 70, 8, F.iron[2], F.iron[3], F.iron[0]); d.bar(cx + 46, 70, cx + 42, 92, 7, F.iron[2], F.iron[3], F.iron[0]);
      for (const hx of [cx - 42, cx + 42]) { d.vl(hx, 92, 8, F.iron[4]); d.line(hx, 100, hx + 5, 106, F.iron[4]); d.line(hx + 5, 106, hx + 10, 100, F.iron[4]); d.line(hx - 1, 92, hx - 1, 99, F.iron[3]); }   // the hooks
      for (const [sx, h] of [[cx - 26, 30], [cx - 12, 36], [cx + 6, 36], [cx + 20, 30]]) { d.cyl(sx, 26 - h + 10, 6, h, F.iron); d.ell(sx + 3, 36 - h, 4, 1.5, F.iron[3]); d.steam(sx + 3, 32 - h, s === 1 ? 2 : 4, s === 1 ? 0.3 : 0.9); }   // four stacks
      d.rect(cx - 10, 16, 20, 14, F.iron[2]); d.hl(cx - 10, 16, 20, F.iron[3]); gauge(d, cx, 23, 5, s !== 1); d.rect(cx - 12, 29, 24, 3, F.brass[2]);   // the head: a gauge in an iron box
      d.gear(cx + 30, 26, 8, 9, F.brass, s * 0.4); d.rect(cx + 20, 24, 10, 4, F.iron[1]);
      if (s === 1) { leaving(d, cx, 4, 10, this.ghost); d.tone((x, y) => y > 30 && hash(x, y) < 22, F.iron[1], [F.iron[2], F.iron[3]]); }
      if (s === 2) d.tone((x, y) => y > 30 && y < 90 && Math.abs(x - cx) < 32 && hash(x, y) < 12, VIOL[1], [F.iron[2], F.iron[1]]);
      if (s === 0) d.tone((x, y) => y > 30 && y < 90 && Math.abs(x - cx) < 32 && hash(x, y) < 6, F.fire[0], [F.iron[2]]);
    } },
];
const sprite = (Lk, s) => { const g = new Grid(Lk.W, Lk.H), d = new D(g); Lk.draw(d, s); return g.outline(OL); };
module.exports = { LOOKS, sprite, SOUL, VIOL };
if (require.main !== module) return;

const Z = +(process.argv[2] || 4), pad = 16, S = 3, TX = 0.62;
let W = pad, blocks = [];
for (const Lk of LOOKS) { const w = 3 * Lk.W * Z + 4 * pad; blocks.push({ x: W, w }); W += w; }
const H0 = Math.max(...LOOKS.map((l) => l.H)) * Z + 110, stripH = Math.round(116 * TX * S) + 70;
const img = new Img(W + pad, pad + 30 + H0 + stripH, '#1a1411');
text(img, 'THE RENDERED  ·  the cult\'s iron is driven by what it rendered: a soul burns in every engine', pad, 8, '#e8d8b0', 2);
LOOKS.forEach((Lk, i) => {
  const bx = blocks[i].x, by = pad + 30, base = by + 46 + Math.max(...LOOKS.map((l) => l.H)) * Z;
  text(img, 'ABC'[i] + '  ' + Lk.name, bx, by, '#e8d8b0', 3); const sub = Lk.sub.split(';'); text(img, sub[0], bx, by + 22, '#a89a80', 1); if (sub[1]) text(img, sub[1].trim(), bx, by + 30, '#a89a80', 1);
  [0, 1, 2].forEach((s) => { const g = sprite(Lk, s), x = bx + s * (Lk.W * Z + pad); img.fill(x - 4, base - Lk.H * Z - 4, Lk.W * Z + 8, Lk.H * Z + 8, '#2b2622'); img.blit(toImg(g), 0, 0, g.w, g.h, x, base - g.h * Z, g.w * Z, g.h * Z); text(img, Lk.states[s], x, base + 8, s === 2 ? '#ae82ec' : s === 1 ? '#c8e6f4' : '#e8b060', 2); });
});
// the strip at world size
const y0 = pad + 30 + H0 + stripH - 30; let x = pad;
text(img, 'AT WORLD SIZE: goat, hound, clubman, the three, the ogre  ·  BURNING: fire feeds it. QUENCHED: steam or water, the soul goes up to heaven. CORRUPTED: a seer\'s witchfire, it turns on the cult', pad, y0 - stripH + 40, '#e8d8b0', 2);
const put = (im, k, foot, label) => { const w = Math.round(im.w * k * S), h = Math.round(im.h * k * S); img.blit(im, 0, 0, im.w, im.h, x, Math.round(y0 - foot * k * S), w, h, true); text(img, label, x, y0 + 6, '#d8ccb0', 2); x += w + pad; };
let a = atlasImg('goat', 7); put(a.im, a.k, a.foot, 'goat'); a = atlasImg('hound', 0); put(a.im, a.k, a.foot, 'hound'); a = atlasImg('clubman', 0); put(a.im, a.k, a.foot, 'man');
LOOKS.forEach((Lk, i) => put(toImg(sprite(Lk, 0)), TX, Lk.H - 2, 'ABC'[i]));
const og = OG.sprite(0, 'idle', 0); put(toImg(og.g), 1.4, OG.FOOT, 'ogre');
img.fill(pad, y0, x - pad, 1, '#5a4d40');
fs.writeFileSync(__dirname + '/engines.png', img.png());
console.log('engines.png', img.w, img.h);
