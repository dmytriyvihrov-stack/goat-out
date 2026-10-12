// node enemy.cjs [zoom] → enemy.png: four looks for THE FACTORY's mechanical man, the kind that fire and poison do nothing to.
// Each twice, front view: as he stands, and in his second state (stoked, wound down, fed, charged). Then a strip at world size
// beside the goat, a clubman and the ogre. Drawn on the game's Grid with the villain sheet's recipe. Concept art only.
const L = require('./lib.cjs'), OG = require('../../js/ogre-pixels.js');
const { fs, Img, text, Grid, F, D, OL, hash, toImg, atlasImg } = L;

const W = 64, H = 86, FOOT = 84, TX = 0.62;   // texels, and world px a texel on the strip (~53 world px to the crown)
const mk = () => { const g = new Grid(W, H); return [g, new D(g)]; };
const rivetRow = (d, x0, x1, y, T = F.iron) => d.rivets(x0, y, x1, y, 4, T[4], T[0]);
const ironFoot = (d, cx) => { d.rect(cx - 6, FOOT - 3, 12, 3, F.iron[1]); d.hl(cx - 6, FOOT - 3, 12, F.iron[3]); };
const lens = (d, x, y, on) => { d.ell(x, y, 2.5, 2.5, on ? F.fire[2] : F.glass[1]); d.ring(x, y, 2.5, 2.5, 1, F.brass[2]); d.dot(x - 1, y - 1, on ? F.fire[3] : F.glass[3]); };
const gauge = (d, x, y, r, hot) => { d.ell(x, y, r, r, F.glass[3]); d.ring(x, y, r, r, 1, F.brass[3]); const a = hot ? -0.3 : -2.4; d.line(x, y, x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r - 1), hot ? F.blood[3] : F.coal[0]); d.dot(x, y, F.brass[0]); if (hot) d.ring(x, y, r + 1.5, r + 1.5, 1, F.blood[3]); };

const LOOKS = [
  { name: 'A  THE STOKER', sub: 'a furnace on legs: boiler body, firebox belly, stovepipe head, a shovel; fire feeds him', states: ['COLD', 'STOKED'],
    draw(d, s) {
      const cx = 32;
      for (const lx of [cx - 9, cx + 9]) { d.cyl(lx - 4, 60, 8, 22, F.iron); ironFoot(d, lx); d.hl(lx - 4, 68, 8, F.iron[0]); }   // the legs, cast iron
      d.vol(cx, 44, 17, 19, F.iron);                                                                                            // the boiler
      for (const y of [30, 40, 58]) rivetRow(d, cx - 15, cx + 15, y); d.hl(cx - 16, 50, 32, F.iron[0], true);
      d.rect(cx - 8, 44, 16, 12, F.coal[0]); for (let y = 46; y < 56; y += 3) d.hl(cx - 7, y, 14, F.iron[2]);                   // the firebox and its grate
      for (let y = 45; y < 56; y += 2) for (let x = cx - 7; x < cx + 7; x += 2) if (hash(x, y) < (s ? 75 : 35)) d.dot(x, y, s ? (hash(y, x) < 40 ? F.fire[3] : F.fire[2]) : F.fire[0]);
      d.rect(cx - 9, 56, 18, 2, F.iron[3]); d.rect(cx - 3, 43, 6, 2, F.brass[3]);                                                 // the door's sill and latch
      d.vol(cx - 19, 30, 6, 6, F.iron); d.vol(cx + 19, 30, 6, 6, F.iron);                                                       // shoulder bosses
      d.bar(cx - 21, 33, cx - 25, 50, 5, F.iron[2], F.iron[3], F.iron[0]); d.bar(cx - 25, 50, cx - 24, 64, 4.5, F.iron[2], F.iron[3], F.iron[0]);   // left arm, the shovel
      d.bar(cx - 24, 62, cx - 24, 78, 2, F.timber[2], F.timber[3], F.timber[0]); d.poly([[cx - 29, 76], [cx - 19, 76], [cx - 20, 84], [cx - 28, 84]], F.iron[3]); d.hl(cx - 28, 77, 8, F.iron[4]);
      d.bar(cx + 21, 33, cx + 26, 48, 5, F.iron[2], F.iron[3], F.iron[0]); d.bar(cx + 26, 48, cx + 22, 62, 4.5, F.iron[2], F.iron[3], F.iron[0]);   // right arm, the tongs
      d.line(cx + 22, 62, cx + 19, 74, F.iron[3]); d.line(cx + 23, 62, cx + 26, 74, F.iron[3]); d.dot(cx + 19, 75, F.iron[4]); d.dot(cx + 26, 75, F.iron[4]);
      d.cyl(cx - 6, 8, 12, 18, F.iron); d.ell(cx, 8, 8, 3, F.iron[3]); d.ring(cx, 8, 8, 3, 1, F.iron[4]); d.ell(cx, 7, 5, 1.5, F.coal[0]);   // the stovepipe head and its cap
      gauge(d, cx, 17, 4, s); d.rect(cx - 7, 24, 14, 3, F.brass[2]); rivetRow(d, cx - 5, cx + 5, 25, F.brass);
      if (s) { for (let k = 0; k < 4; k++) d.flame(cx - 3 + k * 2, 6, 6 + hash(k, 1) % 5, 1.5); d.steam(cx + 21, 22, 4, 0.7); d.steam(cx - 21, 22, 3, 0.7); d.tone((x, y) => y > 28 && y < 60 && Math.abs(x - cx) < 15 && hash(x, y) < 12, F.fire[0], [F.iron[2], F.iron[1]]); }
      else d.steam(cx + 22, 20, 2.5, 0.5);
    } },
  { name: 'B  THE WOUND MAN', sub: 'a clockwork butcher: brass bones, a glass skull, iron apron, a cleaver, the key in his back', states: ['WOUND', 'WOUND DOWN'],
    draw(d, s) {
      const cx = 32, B = s ? F.iron : F.brass, G = s ? F.iron : F.brass;
      for (const lx of [cx - 7, cx + 7]) { d.bar(lx, 58, lx, 74, 3.5, B[2], B[3], B[0]); d.ell(lx, 66, 2.5, 2.5, B[3]); d.dot(lx, 66, B[0]); d.bar(lx, 74, lx, 82, 3, B[2], B[3], B[0]); ironFoot(d, lx); }   // the legs, their knee gears
      d.rect(cx - 12, 52, 24, 8, F.iron[1]); d.hl(cx - 12, 52, 24, F.iron[3]); rivetRow(d, cx - 10, cx + 10, 56);                // the pelvis box
      d.rect(cx - 11, 60, 22, 14, F.iron[2]); d.hl(cx - 11, 60, 22, F.iron[3]); d.vl(cx, 60, 14, F.iron[0]); rivetRow(d, cx - 9, cx + 9, 63); d.rect(cx - 11, 72, 22, 2, F.iron[0]);   // the apron plates
      if (!s) d.blood(cx + 4, 66, 4, 3, 6);
      d.vol(cx, 40, 12, 13, B);                                                                                                // the chest drum
      for (let y = 32; y < 50; y += 4) d.hl(cx - 10, y, 20, B[0], true);                                                          // the ribs' seams
      d.rect(cx - 5, 36, 10, 9, F.coal[0]); d.gear(cx, 40.5, 3, 6, s ? F.iron : F.brass, s ? 0 : 0.3); d.ring(cx, 40.5, 5.5, 5, 1, B[3]);   // the window on the works
      d.vol(cx - 15, 30, 5, 5, B); d.vol(cx + 15, 30, 5, 5, B);
      d.bar(cx - 16, 33, cx - 22, 48, 4, B[2], B[3], B[0]); d.bar(cx - 22, 48, cx - 20, 62, 3.5, B[2], B[3], B[0]);                // left arm, the hook
      d.line(cx - 20, 62, cx - 20, 68, F.iron[4]); d.line(cx - 20, 68, cx - 17, 71, F.iron[4]); d.line(cx - 17, 71, cx - 14, 68, F.iron[4]); d.dot(cx - 14, 67, F.iron[3]);
      d.bar(cx + 16, 33, cx + 23, 46, 4, B[2], B[3], B[0]); d.bar(cx + 23, 46, cx + 22, 58, 3.5, B[2], B[3], B[0]);                // right arm, the cleaver
      d.poly([[cx + 20, 58], [cx + 24, 58], [cx + 24, 64], [cx + 31, 64], [cx + 31, 76], [cx + 20, 76]], F.iron[3]); d.vl(cx + 30, 65, 11, F.iron[4]); d.rect(cx + 20, 58, 4, 6, F.timber[2]);
      if (!s) d.blood(cx + 26, 74, 3, 2, 2);
      d.vol(cx, 15, 9, 10, s ? F.glass : F.glass);                                                                              // the glass skull
      d.ring(cx, 15, 9, 10, 1, B[3]); d.rect(cx - 9, 22, 18, 4, B[2]); d.hl(cx - 9, 22, 18, B[4]);                                 // its brass rim and jaw plate
      d.gear(cx - 3, 13, 2.5, 6, s ? F.iron : F.brass, s ? 0 : 0.6); d.gear(cx + 3, 17, 2, 5, s ? F.iron : F.brass, s ? 0 : -0.2);  // the works behind the glass
      lens(d, cx - 4, 21, !s); lens(d, cx + 4, 21, !s);
      for (let x = cx - 6; x < cx + 7; x += 3) d.vl(x, 26, 3, B[1]);                                                               // teeth of the jaw plate
      d.bar(cx + 12, 20, cx + 20, 10, 3.5, B[2], B[3], B[0]); d.ring(cx + 23, 7, 4, 4, 1.5, B[3]); d.ring(cx + 23, 7, 1.5, 1.5, 1, B[1]);   // the key over his shoulder
      d.hl(cx + 17, 13, 3, B[0]); d.hl(cx + 15, 16, 3, B[0]);
      if (s) { d.tone((x, y) => hash(x, y) < 20, F.rust[1], [F.iron[2]]); d.tone((x, y) => hash(x * 2, y) < 25, F.iron[1], [F.iron[3]]); }
    } },
  { name: 'C  THE MAW', sub: 'the grinder on legs: a hopper for a face, two toothed rollers, a boiler belly, a chimney; it eats', states: ['HUNGRY', 'FED'],
    draw(d, s) {
      const cx = 30;
      for (const lx of [cx - 11, cx + 11]) { d.bar(lx, 60, lx, 72, 5, F.rust[2], F.rust[3], F.rust[0]); d.bar(lx, 72, lx + (lx < cx ? -2 : 2), 80, 4, F.iron[2], F.iron[3], F.iron[0]); d.rect(lx - 5 + (lx < cx ? -2 : 2), FOOT - 4, 10, 4, F.iron[1]); d.hl(lx - 5 + (lx < cx ? -2 : 2), FOOT - 4, 10, F.iron[3]); d.ring(lx, 66, 3, 3, 1, F.iron[4]); }   // piston legs, iron hooves
      d.vol(cx, 48, 19, 16, F.iron); for (const y of [40, 56]) rivetRow(d, cx - 16, cx + 16, y); d.rect(cx - 18, 47, 36, 2, F.iron[0], true);   // the belly
      gauge(d, cx - 10, 50, 3.5, s); d.rect(cx + 2, 46, 10, 8, F.coal[0]); for (let x = cx + 3; x < cx + 12; x += 2) for (let y = 47; y < 54; y += 2) if (hash(x, y) < (s ? 70 : 30)) d.dot(x, y, F.fire[s ? 2 : 0]);   // the gauge and the firebox
      d.cyl(cx + 20, 10, 7, 32, F.iron); d.ell(cx + 23, 10, 4, 2, F.iron[3]); d.ring(cx + 23, 10, 4, 2, 1, F.iron[4]);                 // the chimney
      d.poly([[cx - 20, 16], [cx + 16, 16], [cx + 12, 36], [cx - 16, 36]], F.iron[3]); d.poly([[cx - 18, 17], [cx + 14, 17], [cx + 11, 34], [cx - 15, 34]], F.coal[0]);   // the hopper mouth
      for (const rx of [cx - 9, cx + 4]) { d.cyl(rx - 5, 21, 10, 8, F.iron, true); for (let k = 0; k < 5; k++) d.dot(rx - 4 + k * 2 + (s ? 1 : 0), 21 + (k % 2) * 6, F.iron[4]); }   // the rollers' teeth
      for (let x = cx - 16; x < cx + 13; x += 3) d.poly([[x, 34], [x + 3, 34], [x + 1.5, 38]], F.iron[4]);                        // the teeth of the lip
      d.rect(cx - 17, 36, 30, 4, F.iron[2]); rivetRow(d, cx - 15, cx + 11, 38);
      lens(d, cx - 13, 12, s); lens(d, cx + 10, 12, s); d.rect(cx - 16, 9, 30, 3, F.brass[2]);                                     // two lamps for eyes over the brow bar
      d.gear(cx + 24, 46, 5, 7, F.brass, s ? 0.5 : 0); d.bar(cx + 24, 46, cx + 30, 38, 2.5, F.iron[2], F.iron[3], F.iron[0]);        // the crank
      if (s) { d.blood(cx - 2, 26, 8, 3, 4); d.blood(cx - 4, 40, 6, 2, 7); for (let k = 0; k < 3; k++) d.dot(cx - 10 + k * 7, 41, F.meat[3]); d.steam(cx + 23, 2, 6, 0.9); d.steam(cx + 28, 8, 4, 0.7); d.tone((x, y) => y > 2 && y < 12 && Math.abs(x - cx - 24) < 8, F.coal[2], [F.steam[1], F.steam[2]]); }
      else { d.steam(cx + 23, 4, 3, 0.5); d.tone((x, y) => y < 8, F.steam[0], [F.steam[1], F.steam[2]]); }
    } },
  { name: 'D  THE IRON HOUND', sub: 'a boiler on four pistons with a hinged brass jaw and a stack for a tail; it must build steam to dart', states: ['IDLE', 'CHARGED'],
    draw(d, s) {
      const cx = 30, by = 56;
      for (const [lx, ly] of [[cx - 15, by + 10], [cx + 13, by + 12], [cx - 9, by + 14], [cx + 7, by + 16]]) { d.bar(lx, ly - 10, lx, ly + 10, 3.5, F.iron[2], F.iron[3], F.iron[0]); d.ring(lx, ly, 2.5, 2.5, 1, F.brass[3]); d.rect(lx - 3, FOOT - 3 - (ly < by + 13 ? 6 : 0), 7, 3, F.iron[1]); if (s) d.steam(lx, ly - 2, 2, 0.5); }   // the pistons, back pair first
      d.vol(cx, by, 24, 13, F.iron); for (const x of [cx - 12, cx, cx + 12]) d.rivets(x, by - 11, x, by + 11, 4, F.iron[4], F.iron[0]);   // the boiler, lying
      gauge(d, cx + 8, by - 2, 3.5, s);
      d.cyl(cx + 20, by - 30, 5, 24, F.iron); d.ell(cx + 22, by - 30, 3, 1.5, F.iron[3]); d.steam(cx + 22, by - 36, s ? 6 : 3, s ? 1 : 0.5);   // the stack for a tail
      d.vol(cx - 12, by - 14, 12, 9, F.brass); d.hl(cx - 22, by - 14, 20, F.brass[0], true);                                        // the head, a brass wedge
      d.poly([[cx - 23, by - 12], [cx - 1, by - 12], [cx - 3, by - 4], [cx - 21, by - 4]], F.brass[2]); d.hl(cx - 22, by - 12, 21, F.brass[4]);   // the jaw, hinged
      for (let x = cx - 20; x < cx - 2; x += 3) d.poly([[x, by - 12], [x + 3, by - 12], [x + 1.5, by - 9]], F.bone[4]); for (let x = cx - 19; x < cx - 3; x += 3) d.poly([[x, by - 4], [x + 3, by - 4], [x + 1.5, by - 7]], F.bone[4]);
      d.dot(cx - 23, by - 13, F.brass[0]); d.dot(cx - 1, by - 13, F.brass[0]);
      lens(d, cx - 18, by - 18, s); lens(d, cx - 6, by - 18, s);
      d.ring(cx - 12, by - 23, 3, 2, 1, F.brass[3]); d.ring(cx - 12, by - 23, 1, 1, 1, F.coal[0]);                                   // the whistle on the brow
      d.rect(cx - 4, by - 10, 8, 4, F.lea[2]); d.dot(cx, by - 8, F.iron[4]);                                                        // the collar, leather, the one thing a goat's teeth could take
      if (s) { d.tone((x, y) => Math.abs(x - cx) < 24 && Math.abs(y - by) < 12 && hash(x, y) < 10, F.fire[0], [F.iron[2]]); d.steam(cx - 24, by - 6, 3, 0.6); d.steam(cx + 2, by - 14, 3, 0.6); }
    } },
];

const sprite = (Lk, s) => { const [g, d] = mk(); Lk.draw(d, s); return g.outline(OL); };
module.exports = { LOOKS, sprite, W, H, FOOT, TX };
if (require.main !== module) return;

const Z = +(process.argv[2] || 4), pad = 16, S = 3;
const blockW = 2 * W * Z + 3 * pad, blockH = H * Z + 86, perRow = 2, rows = Math.ceil(LOOKS.length / perRow);
const stripH = Math.round(H * TX * S) + 60;
const img = new Img(pad + perRow * blockW, pad + 30 + rows * blockH + stripH + pad, '#2b2622');
text(img, 'THE FACTORY  ·  the mechanical man, four looks  ·  fire and poison do nothing to him', pad, 8, '#e8d8b0', 2);
LOOKS.forEach((Lk, i) => {
  const bx = pad + (i % perRow) * blockW, by = pad + 30 + Math.floor(i / perRow) * blockH;
  text(img, Lk.name, bx, by, '#e8d8b0', 3); text(img, Lk.sub, bx, by + 22, '#a89a80', 1);
  const base = by + 42 + H * Z;
  [0, 1].forEach((s) => { const g = sprite(Lk, s), x = bx + s * (W * Z + pad); img.fill(x - 4, base - H * Z - 4, W * Z + 8, H * Z + 8, '#3a3230'); img.blit(toImg(g), 0, 0, g.w, g.h, x, base - g.h * Z, g.w * Z, g.h * Z); text(img, Lk.states[s], x, base + 8, '#a89a80', 2); });
  img.fill(bx, base + 24, blockW - pad, 1, '#5a4d40');
});
// the strip at world size: the goat, a clubman, the four, the ogre
const y0 = pad + 30 + rows * blockH + stripH - 30; let x = pad;
text(img, 'AT WORLD SIZE: goat, clubman, the four, the ogre', pad, y0 - stripH + 36, '#e8d8b0', 2);
const put = (im, k, foot, label) => { const w = Math.round(im.w * k * S), h = Math.round(im.h * k * S); img.blit(im, 0, 0, im.w, im.h, x, Math.round(y0 - foot * k * S), w, h, true); text(img, label, x, y0 + 6, '#d8ccb0', 2); x += w + pad; };
let a = atlasImg('goat', 7); put(a.im, a.k, a.foot, 'goat'); a = atlasImg('clubman', 0); put(a.im, a.k, a.foot, 'man');
LOOKS.forEach((Lk, i) => put(toImg(sprite(Lk, 0)), TX, FOOT + 1, 'ABCD'[i]));
const og = OG.sprite(0, 'idle', 0); put(toImg(og.g), 1.4, OG.FOOT, 'ogre');
img.fill(pad, y0, x - pad, 1, '#5a4d40');
fs.writeFileSync(__dirname + '/enemy.png', img.png());
console.log('enemy.png', img.w, img.h);
