// node machines.cjs [zoom] → machines.png: every machine and fitting of the FACTORY floor as a sprite on the game's Grid, the
// moving ones in two or three frames. Exported for traps.cjs, which lays them in room diagrams. Concept art only.
const L = require('./lib.cjs'), { fs, Img, text, Grid, F, D, TT, OL, hash, toImg } = L;

const mk = (w, h) => { const g = new Grid(w, h); return [g, new D(g)]; };
const fin = (g) => g.outline(OL);

// 1. THE BELT: two tiles of conveyor lying left to right. Slats on a dark band between two rollers; `f` shifts them.
function conveyor(f = 0) {
  const [g, d] = mk(48, 24);
  d.rect(2, 4, 44, 16, F.lea[2]); d.rect(2, 4, 44, 2, F.lea[3]); d.rect(2, 18, 44, 2, F.lea[0]);
  for (let x = 3 + (f * 3) % 8; x < 46; x += 8) { d.vl(x, 5, 14, F.lea[0]); d.vl(x + 1, 5, 14, F.lea[4]); }
  d.cyl(0, 2, 4, 20, F.iron); d.cyl(44, 2, 4, 20, F.iron);           // the rollers, their axles
  d.rect(0, 0, 48, 2, F.iron[1]); d.rect(0, 22, 48, 2, F.iron[1]); d.hl(0, 0, 48, F.iron[3]);
  d.rivets(4, 1, 44, 1, 8, F.iron[4]); d.rivets(4, 23, 44, 23, 8, F.iron[0]);
  if (f === 2) d.blood(26, 12, 5, 3, 2);
  return fin(g);
}
// its end: the mouth the belt feeds (a half roller and the lip of what takes it)
// 2. THE HOOK RAIL: a length of overhead rail, two hooks, and what hangs on the second: nothing, a side of meat, a goat.
function hookRail(v = 0) {
  const [g, d] = mk(40, 56);
  d.rect(0, 2, 40, 4, F.iron[2]); d.hl(0, 2, 40, F.iron[4]); d.hl(0, 5, 40, F.iron[0]); d.rivets(3, 4, 37, 4, 8, F.iron[0]);
  for (const x of [9, 27]) { d.rect(x - 1, 6, 3, 5, F.iron[3]); d.ell(x, 12, 2.5, 2.5, F.iron[3]); d.ell(x, 12, 1, 1, F.iron[0]); }   // trolleys
  d.hook(8, 14, F.iron[4], F.iron[2]);
  if (v === 0) { d.hook(26, 14, F.iron[4], F.iron[2]); }
  if (v === 1) {   // a side of meat: ribs, fat on the back, the hook through the shank
    d.vl(27, 14, 6, F.iron[4]); d.vol(27, 34, 7, 14, F.meat); d.tone((x, y) => x > 30 && y < 36, F.fat[2], [F.meat[2], F.meat[3]]);
    for (let y = 26; y < 44; y += 3) d.line(21, y, 29, y + 1, F.fat[1], true); d.blood(27, 50, 4, 2, 5);
  }
  if (v === 2) {   // a goat, by the hind legs: the cult's own sacrifice hung to drain
    d.vl(27, 14, 4, F.iron[4]); d.line(25, 18, 29, 18, F.bone[2]); d.bar(24, 18, 23, 28, 2.5, F.bone[2], F.bone[3], F.bone[1]); d.bar(30, 18, 31, 28, 2.5, F.bone[2], F.bone[3], F.bone[1]);
    d.vol(27, 36, 7, 10, F.bone); d.vol(27, 48, 4.5, 4, F.bone); d.dot(25, 48, OL); d.dot(29, 48, OL);
    d.line(23, 46, 20, 54, F.bone[1]); d.line(31, 46, 34, 54, F.bone[1]); d.bar(24, 30, 22, 42, 2, F.bone[2], F.bone[3], F.bone[1]); d.bar(30, 30, 32, 42, 2, F.bone[2], F.bone[3], F.bone[1]);
    d.blood(27, 54, 3, 1.5, 9); d.vl(27, 51, 3, F.blood[2]);
  }
  return fin(g);
}
// 3. THE GRINDER: a hopper over two toothed rollers, an iron box, the flywheel beside, mince out of the spout.
function grinder(f = 0) {
  const [g, d] = mk(52, 48);
  d.rect(8, 22, 30, 22, F.iron[2]); d.hl(8, 22, 30, F.iron[3]); d.rect(8, 40, 30, 4, F.iron[1]); d.rivets(10, 24, 36, 24, 6, F.iron[4], F.iron[0]);
  d.poly([[4, 6], [42, 6], [36, 22], [10, 22]], F.iron[3]); d.poly([[6, 7], [40, 7], [35, 20], [11, 20]], F.coal[0]);   // the hopper and its throat
  for (const cx of [17, 29]) { d.cyl(cx - 5, 10, 10, 9, F.iron, true); for (let k = 0; k < 5; k++) d.dot(cx - 4 + k * 2 + (f % 2), 10 + (k % 2) * 7, F.iron[4]); }   // the rollers' teeth
  d.blood(23, 12, 6, 2, 4); d.rect(20, 17, 6, 3, F.meat[2]); d.dot(21, 15, F.meat[3]);
  d.gear(45, 32, 6, 8, F.brass, f * 0.4); d.rect(38, 31, 5, 3, F.iron[1]);
  d.rect(14, 44, 10, 3, F.iron[1]); d.rect(16, 47, 6, 1, F.meat[1]); for (let k = 0; k < 4; k++) d.dot(14 + k * 3 + (f % 2), 45 + (k % 2), F.meat[3]);   // the spout and the mince
  return fin(g);
}
// 4. THE PRESS: two iron slabs on pistons either side of a two-tile lane, seen from above; `p` 0 open, 1 closing, 2 shut.
function press(p = 0) {
  const [g, d] = mk(72, 48), gap = [24, 12, 2][p], mid = 36;
  d.rect(0, 0, 72, 48, F.conc[2]); for (let y = 0; y < 48; y += 24) for (let x = 0; x < 72; x += 24) { d.hl(x, y, 24, F.conc[4]); d.vl(x + 23, y, 24, F.conc[0]); }
  const slab = (x0, x1) => { d.rect(x0, 2, x1 - x0, 44, F.iron[2]); d.hl(x0, 2, x1 - x0, F.iron[4]); d.rect(x0, 42, x1 - x0, 4, F.iron[0]); for (let y = 6; y < 42; y += 6) d.rivets(x0 + 2, y, x1 - 3, y, 6, F.iron[3], F.iron[0]); };
  slab(mid - gap - 14, mid - gap); slab(mid + gap, mid + gap + 14);
  for (const y of [12, 36]) { d.cyl(0, y - 3, mid - gap - 14, 6, F.rust, true); d.cyl(mid + gap + 14, y - 3, 72 - (mid + gap + 14), 6, F.rust, true); }   // the pistons' rams
  if (p === 2) { d.blood(mid, 24, 3, 14, 3); d.blood(mid, 10, 5, 3, 8); d.blood(mid, 40, 5, 3, 6); }
  if (p === 1) for (let y = 4; y < 44; y += 6) { d.dot(mid - gap - 2, y, F.amber); d.dot(mid + gap + 1, y + 3, F.amber); }
  return g;
}
// 5. THE SAW: a slot in the floor, a carriage, a circular blade standing in it; `f` turns the teeth.
function saw(f = 0) {
  const [g, d] = mk(48, 32);
  d.rect(0, 20, 48, 4, F.coal[0]); d.hl(0, 19, 48, F.iron[3]); d.hl(0, 24, 48, F.iron[1]);   // the slot
  d.rect(14, 24, 20, 5, F.iron[2]); d.hl(14, 24, 20, F.iron[3]); d.rivets(16, 26, 32, 26, 4, F.iron[4]);   // the carriage
  const cx = 24, cy = 14; d.ring(cx, cy, 4.5, 11, 1, F.iron[4]); d.ell(cx, cy, 3.5, 10, F.iron[3]); d.ell(cx, cy, 1.5, 2, F.iron[0]);
  for (let k = 0; k < 12; k++) { const a = f * 0.5 + k * Math.PI / 6, x = cx + Math.cos(a) * 4.5, y = cy + Math.sin(a) * 11; d.dot(x, y, F.iron[4]); d.dot(x + Math.cos(a), y + Math.sin(a) * 1.4, k % 2 ? F.blood[2] : F.iron[4]); }
  if (f) d.blood(cx + 10, cy + 2, 3, 2, f);
  return fin(g);
}
// 6. THE STEAM MAIN: a pipe along a wall's foot, a brass valve wheel, the nozzle; `f` 0 shut, 1 and 2 the jet.
function steamValve(f = 0) {
  const [g, d] = mk(72, 36);
  d.pipe(0, 8, 71, 8, 6, F.patina, 3); d.rect(28, 2, 10, 14, F.iron[2]); d.hl(28, 2, 10, F.iron[3]);
  d.ring(33, 6, 5, 5, 1.5, F.brass[3]); d.line(28, 6, 38, 6, F.brass[2]); d.line(33, 1, 33, 11, F.brass[2]); d.ell(33, 6, 1.5, 1.5, F.brass[4]);   // the wheel
  d.rect(31, 14, 4, 6, F.iron[3]); d.rect(30, 20, 6, 2, F.iron[4]);   // the nozzle, down into the lane
  if (f) { d.steam(33, 28, 6 + f * 2, f === 1 ? 0.8 : 1.2); if (f === 2) { d.steam(26, 32, 4, 0.7); d.steam(41, 31, 4, 0.7); } }
  return fin(g);
}
// 7. THE RENDERING VAT: an iron tub seen from above, boiling fat in it, a bone up, steam.
function vat(f = 0) {
  const [g, d] = mk(44, 44);
  d.ell(22, 24, 20, 17, F.iron[2]); d.ring(22, 24, 20, 17, 3, F.iron[3]); d.ring(22, 24, 20, 17, 1, F.iron[4]);
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; d.dot(22 + Math.cos(a) * 18.5, 24 + Math.sin(a) * 15.5, F.iron[0]); }
  d.ell(22, 24, 16, 13, F.fat[1]); d.ell(21, 23, 14, 11, F.fat[2]);
  for (let k = 0; k < 7; k++) { const x = 10 + hash(k, f) % 24, y = 15 + hash(k + 4, f * 3) % 16; d.ring(x, y, 2, 1.5, 1, F.fat[3]); }
  d.bar(14, 20, 24, 27, 2.5, F.bone[2], F.bone[3], F.bone[1]); d.dot(13, 19, F.bone[3]); d.dot(25, 28, F.bone[3]);
  d.ell(29, 19, 3, 2, F.meat[2]);
  d.steam(14, 8, 5, 0.6); d.steam(30, 6, 6, 0.6);
  return fin(g);
}
// 8. THE HATCH: a two-leaf iron trap in the floor; shut, or open onto the chute's dark.
function hatch(open = 0) {
  const [g, d] = mk(40, 40);
  d.rect(2, 2, 36, 36, F.iron[1]); d.hl(2, 2, 36, F.iron[3]); d.vl(2, 2, 36, F.iron[3]);   // the frame
  if (!open) { d.rect(4, 4, 16, 32, F.iron[2]); d.rect(20, 4, 16, 32, F.iron[2]); d.vl(19, 4, 32, F.iron[0]); d.vl(20, 4, 32, F.iron[4]); for (let y = 8; y < 36; y += 7) { d.rivets(6, y, 16, y, 5, F.iron[4], F.iron[0]); d.rivets(23, y, 33, y, 5, F.iron[4], F.iron[0]); } d.rect(10, 18, 3, 4, F.iron[0]); d.rect(27, 18, 3, 4, F.iron[0]); }
  else { d.rect(4, 4, 32, 32, F.coal[0]); d.poly([[4, 4], [36, 4], [30, 14], [10, 14]], F.coal[2]); d.poly([[4, 36], [36, 36], [30, 26], [10, 26]], F.coal[1]); d.rect(0, 4, 4, 32, F.iron[2]); d.rect(36, 4, 4, 32, F.iron[2]); d.rivets(1, 8, 1, 34, 7, F.iron[4]); d.rivets(38, 8, 38, 34, 7, F.iron[4]); for (let y = 15; y < 26; y += 3) d.hl(12, y, 16, y % 2 ? F.coal[1] : F.coal[0]); }
  return g;
}
// 9. THE FLYWHEEL: a big wheel on a shaft, a belt down to a small gear; `f` turns it.
function flywheel(f = 0) {
  const [g, d] = mk(52, 44);
  d.rect(4, 36, 44, 6, F.iron[1]); d.hl(4, 36, 44, F.iron[3]);
  d.ring(18, 20, 15, 15, 3, F.iron[3]); d.ring(18, 20, 15, 15, 1, F.iron[4]);
  for (let k = 0; k < 6; k++) { const a = f * 0.3 + k * Math.PI / 3; d.bar(18, 20, 18 + Math.cos(a) * 12, 20 + Math.sin(a) * 12, 2.2, F.iron[2], F.iron[3], F.iron[1]); }
  d.ell(18, 20, 3.5, 3.5, F.brass[2]); d.ell(18, 20, 1.5, 1.5, F.brass[0]);
  d.gear(42, 30, 5, 7, F.brass, -f * 0.9);
  d.line(18, 5, 42, 25, F.lea[1]); d.line(18, 35, 42, 35, F.lea[1]); d.line(19, 6, 43, 26, F.lea[3]);   // the belt
  d.rect(36, 34, 12, 3, F.iron[2]);
  return fin(g);
}
// 10. THE FURNACE: an iron door in a brick box, its grate; open, the fire.
function furnace(open = 0) {
  const [g, d] = mk(40, 44);
  d.rect(0, 0, 40, 44, F.brick[1]); for (let j = 0; j < 44; j += 4) for (let i = (j / 4 % 2) * 4; i < 40; i += 8) d.rect(i, j, 7, 3, hash(i, j) < 30 ? F.brick[2] : F.brick[1]);
  d.rect(6, 6, 28, 32, F.iron[1]); d.hl(6, 6, 28, F.iron[3]); d.rivets(8, 8, 32, 8, 6, F.iron[4], F.iron[0]); d.rivets(8, 36, 32, 36, 6, F.iron[4], F.iron[0]);
  if (!open) { d.rect(10, 10, 20, 24, F.iron[2]); for (let y = 14; y < 32; y += 4) d.hl(12, y, 16, F.coal[0]); for (let y = 15; y < 32; y += 4) for (let x = 13; x < 28; x += 2) if (hash(x, y) < 40) d.dot(x, y, F.fire[0]); d.rect(27, 20, 3, 5, F.brass[3]); }
  else { d.rect(10, 10, 20, 24, F.coal[0]); for (let x = 12; x < 29; x += 3) d.flame(x, 33, 10 + hash(x, 1) % 10, 2.5); d.rect(10, 30, 20, 4, F.coal[1]); for (let x = 11; x < 29; x += 2) d.dot(x, 31 + (x % 2), F.fire[2]); d.poly([[30, 10], [38, 6], [38, 38], [30, 34]], F.iron[2]); d.vl(37, 7, 31, F.iron[3]); }
  d.rect(14, 38, 12, 6, F.iron[0]); d.rect(16, 40, 8, 4, F.coal[1]); d.dot(18, 42, F.fire[1]); d.dot(22, 41, F.fire[0]);   // the ash pan
  return fin(g);
}
// 11. STACKED CAGES: the animals waiting their turn, three cages high.
function cages() {
  const [g, d] = mk(44, 48);
  const cage = (x, y, w, h, who) => { d.rect(x, y, w, h, F.coal[1]); who(x, y, w, h); for (let i = x + 2; i < x + w; i += 4) d.vl(i, y, h, F.iron[3]); d.rect(x, y, w, 2, F.iron[2]); d.rect(x, y + h - 2, w, 2, F.iron[2]); d.hl(x, y, w, F.iron[4]); };
  cage(2, 32, 40, 16, (x, y, w, h) => { d.vol(x + 12, y + 9, 7, 5, F.skin); d.dot(x + 10, y + 9, OL); d.dot(x + 14, y + 9, OL); d.rect(x + 11, y + 11, 3, 2, F.meat[3]); d.vol(x + 30, y + 9, 6, 5, F.skin); });   // pigs
  cage(2, 16, 40, 16, (x, y, w, h) => { d.vol(x + 10, y + 8, 6, 6, F.bone); d.dot(x + 8, y + 7, F.brass[4]); d.dot(x + 12, y + 7, F.brass[4]); d.line(x + 7, y + 3, x + 4, y + 1, F.bone[1]); d.line(x + 13, y + 3, x + 16, y + 1, F.bone[1]); d.vol(x + 28, y + 9, 6, 6, F.bone); d.dot(x + 26, y + 8, F.brass[4]); d.dot(x + 30, y + 8, F.brass[4]); });   // goats
  cage(2, 0, 40, 16, (x, y, w, h) => { for (const cx of [8, 20, 32]) { d.vol(x + cx, y + 10, 4, 3.5, F.bone); d.dot(x + cx + 1, y + 7, F.blood[3]); d.dot(x + cx + 3, y + 10, F.brass[3]); } });   // hens
  return fin(g);
}
// 13. THE DRAIN: a round floor grate, blood running in from two gutters.
function drain() {
  const [g, d] = mk(24, 24);
  d.rect(0, 10, 24, 4, F.blood[1]); d.hl(0, 11, 24, F.blood[2]); d.rect(10, 0, 4, 24, F.blood[1]); d.vl(11, 0, 24, F.blood[2]);
  d.ell(12, 12, 9, 9, F.iron[2]); d.ring(12, 12, 9, 9, 1, F.iron[3]); d.ell(12, 12, 7, 7, F.coal[0]);
  for (let k = -1; k <= 1; k++) { d.hl(6, 12 + k * 3, 12, F.iron[3]); d.vl(12 + k * 3, 6, 12, F.iron[3]); }
  d.dot(9, 12, F.blood[2]); d.dot(12, 9, F.blood[2]);
  return g;
}
// 14. THE TALLY: a slate on the wall, the heads counted in chalk, a goat's head drawn beside the count.
function tally() {
  const [g, d] = mk(34, 26);
  d.rect(0, 0, 34, 26, F.timber[2]); d.rect(2, 2, 30, 22, F.coal[1]); d.hl(0, 0, 34, F.timber[3]);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) d.vl(5 + k * 2 + r * 1, 5 + r * 6, 4, F.bone[3]); for (let r = 0; r < 3; r++) d.line(4 + r, 10 + r * 6, 13 + r, 4 + r * 6, F.bone[3]);
  d.ell(24, 13, 4, 3.5, F.bone[3]); d.line(21, 10, 19, 6, F.bone[3]); d.line(27, 10, 29, 6, F.bone[3]); d.dot(23, 12, F.coal[1]); d.dot(26, 12, F.coal[1]);
  d.line(16, 20, 30, 20, F.blood[3]);
  return fin(g);
}
// 15. THE LEVER: a brass plate in the floor, the handle up or thrown.
function lever(down = 0) {
  const [g, d] = mk(20, 28);
  d.rect(2, 18, 16, 8, F.brass[2]); d.hl(2, 18, 16, F.brass[4]); d.rect(2, 24, 16, 2, F.brass[0]); d.rivets(4, 20, 16, 20, 6, F.brass[0]);
  d.rect(8, 14, 4, 6, F.iron[2]);
  if (!down) { d.bar(10, 16, 10, 2, 2.5, F.iron[3], F.iron[4], F.iron[1]); d.ell(10, 2, 2.5, 2.5, F.blood[2]); d.dot(9, 1, F.blood[3]); }
  else { d.bar(10, 16, 18, 8, 2.5, F.iron[3], F.iron[4], F.iron[1]); d.ell(18, 8, 2.5, 2.5, F.blood[2]); d.dot(17, 7, F.blood[3]); }
  return fin(g);
}
// 16. THE HAMMER: a stamp hanging in an iron frame over its plate, up and come down.
function hammer(down = 0) {
  const [g, d] = mk(44, 52);
  d.rect(6, 40, 32, 10, F.iron[2]); d.hl(6, 40, 32, F.iron[3]); d.rect(6, 48, 32, 2, F.iron[0]); d.rivets(8, 42, 36, 42, 7, F.iron[4], F.iron[0]);   // the anvil plate
  d.rect(2, 2, 5, 46, F.iron[1]); d.rect(37, 2, 5, 46, F.iron[1]); d.rect(2, 0, 40, 5, F.iron[2]); d.hl(2, 0, 40, F.iron[3]);   // the frame
  const hy = down ? 24 : 6;
  d.rect(20, 5, 4, hy, F.iron[3]); d.rect(12, hy + 4, 20, 14, F.rust[2]); d.hl(12, hy + 4, 20, F.rust[3]); d.rect(12, hy + 15, 20, 3, F.rust[0]); d.rivets(14, hy + 8, 30, hy + 8, 4, F.rust[4]);   // the head
  if (down) { d.blood(22, 40, 8, 2, 4); d.steam(6, 36, 3, 0.5); d.steam(38, 36, 3, 0.5); } else for (let y = 22; y < 40; y += 4) d.dot(22, y, F.amber);
  return fin(g);
}
// 17. THE OFFAL BARROW and 18. THE BONE PILE.
function barrow() {
  const [g, d] = mk(34, 26);
  d.poly([[2, 8], [32, 8], [28, 20], [6, 20]], F.timber[2]); d.hl(2, 8, 30, F.timber[3]); d.rect(4, 16, 26, 2, F.iron[1]);
  d.blood(17, 9, 13, 4, 2); d.ell(12, 8, 3, 2, F.meat[2]); d.ell(21, 7, 3.5, 2, F.meat[3]); d.ell(17, 10, 2, 1.5, F.meat[1]); d.ring(25, 9, 2, 1.5, 1, F.fat[2]);
  d.ell(10, 22, 3.5, 3.5, F.iron[1]); d.ring(10, 22, 3.5, 3.5, 1, F.iron[3]); d.line(28, 14, 33, 11, F.timber[3]);
  return fin(g);
}
function bonePile() {
  const [g, d] = mk(40, 22);
  d.ell(20, 14, 18, 7, F.dust[0]);
  for (let k = 0; k < 9; k++) { const x = 5 + hash(k, 2) % 30, y = 8 + hash(k, 5) % 10, a = hash(k, 7) / 100 * Math.PI; d.bar(x - Math.cos(a) * 4, y - Math.sin(a) * 2, x + Math.cos(a) * 4, y + Math.sin(a) * 2, 2, F.bone[2], F.bone[3], F.bone[1]); d.dot(x - Math.cos(a) * 4.5, y - Math.sin(a) * 2.5, F.bone[3]); }
  d.vol(14, 9, 4, 3.5, F.bone); d.dot(12, 9, OL); d.dot(16, 9, OL); d.line(11, 6, 9, 3, F.bone[1]); d.line(17, 6, 19, 3, F.bone[1]);   // a goat's skull on top
  return fin(g);
}
// 19. THE WHISTLE: a brass steam whistle on a bracket off the pipe; `f` the shriek.
function whistle(f = 0) {
  const [g, d] = mk(28, 36);
  d.pipe(0, 30, 27, 30, 5, F.patina, 1); d.rect(11, 20, 6, 10, F.brass[2]); d.vl(11, 20, 10, F.brass[4]);
  d.cyl(8, 6, 12, 14, F.brass); d.rect(8, 10, 12, 2, F.coal[0]); d.ell(14, 6, 6, 2, F.brass[3]); d.ell(14, 4, 2, 2, F.brass[4]);
  if (f) { d.steam(6, 11, 4, 0.8); d.steam(22, 11, 4, 0.8); d.steam(14, 0, 5, 0.6); }
  return fin(g);
}
// 20. THE WINCH: a drum of chain on a frame, a crank, the chain running off up.
function winch() {
  const [g, d] = mk(34, 32);
  d.rect(2, 26, 30, 5, F.iron[1]); d.hl(2, 26, 30, F.iron[3]); d.rect(4, 10, 4, 16, F.iron[2]); d.rect(26, 10, 4, 16, F.iron[2]);
  d.cyl(8, 10, 18, 12, F.rust, true); for (let x = 9; x < 26; x += 2) d.vl(x, 11, 10, x % 4 ? F.iron[2] : F.iron[0]);
  d.gear(30, 16, 3.5, 6, F.brass); d.line(30, 16, 33, 8, F.iron[3]); d.ell(33, 7, 1.5, 1.5, F.blood[2]);
  for (let y = 0; y < 10; y += 3) d.ring(12, y + 1, 1.5, 1.5, 1, F.iron[3]);   // the chain going up
  return fin(g);
}
// 21. THE SORTING GATE: a swing gate of bars on a pivot, from above: a bar with its hinge ring; shut across, or swung open.
function gate(open = 0) {
  const [g, d] = mk(40, 40);
  d.ell(6, 20, 3.5, 3.5, F.iron[2]); d.ring(6, 20, 3.5, 3.5, 1, F.iron[4]); d.dot(6, 20, F.iron[0]);
  const x1 = open ? 6 + 26 * 0.5 : 36, y1 = open ? 20 - 26 * 0.86 : 20;
  d.bar(6, 20, x1, y1, 4, F.iron[2], F.iron[4], F.iron[0]);
  for (let t = 0.15; t < 1; t += 0.17) d.dot(6 + (x1 - 6) * t, 20 + (y1 - 20) * t, F.iron[0]);
  d.ell(x1, y1, 2, 2, F.iron[3]); d.dot(x1, y1, F.iron[4]);
  return fin(g);
}
// 22. THE SCALE: a hanging balance, a pan with a head on it.
function scale() {
  const [g, d] = mk(28, 44);
  d.vl(14, 0, 8, F.iron[3]); d.ell(14, 10, 6, 5, F.brass[2]); d.ring(14, 10, 6, 5, 1, F.brass[4]); d.vl(14, 7, 3, F.blood[3]); d.dot(13, 9, F.brass[0]);
  d.line(14, 15, 5, 30, F.iron[3]); d.line(14, 15, 23, 30, F.iron[3]); d.vl(14, 15, 3, F.iron[3]);
  d.ell(14, 33, 11, 3.5, F.brass[2]); d.ring(14, 33, 11, 3.5, 1, F.brass[4]);
  d.vol(14, 29, 4.5, 4, F.bone); d.dot(12, 29, OL); d.dot(16, 29, OL); d.line(11, 26, 9, 23, F.bone[1]); d.line(17, 26, 19, 23, F.bone[1]);
  d.rect(2, 38, 24, 4, F.iron[1]); d.rect(4, 42, 20, 2, F.iron[0]);
  return fin(g);
}

const MACHINES = { conveyor, hookRail, grinder, press, saw, steamValve, vat, hatch, flywheel, furnace, cages, drain, tally, lever, hammer, barrow, bonePile, whistle, winch, gate, scale };
module.exports = Object.assign({ MACHINES }, MACHINES);
if (require.main !== module) return;

// ---- the sheet ----
const Z = +(process.argv[2] || 4), pad = 18, labelH = 30;
const ROWS = [
  ['THE BELT  3 frames', [conveyor(0), conveyor(1), conveyor(2)], 'a lane that carries whatever stands or lies on it one tile a second'],
  ['THE HOOK RAIL  empty, a side, a goat', [hookRail(0), hookRail(1), hookRail(2)], 'overhead; the hooks go round the room on a clock'],
  ['THE GRINDER  2 frames', [grinder(0), grinder(1)], 'where the belt ends; takes a body whole, gives mince'],
  ['THE PRESS  open, closing, shut', [press(0), press(1), press(2)], 'two slabs on rams either side of a lane; the amber is the tell'],
  ['THE SAW  2 frames', [saw(0), saw(1)], 'a blade on a carriage in a slot across the floor, back and forth'],
  ['THE STEAM MAIN  shut, the jet', [steamValve(0), steamValve(1), steamValve(2)], 'a headbutt on the wheel opens it for a beat; scalds whoever is in the lane'],
  ['THE RENDERING VAT  2 frames', [vat(0), vat(1)], 'boiling fat; a body thrown in is gone; butted over it spills'],
  ['THE HATCH  shut, open', [hatch(0), hatch(1)], 'a two-leaf trap over the chute; a lever opens it under whoever stands there'],
  ['THE FLYWHEEL  2 frames', [flywheel(0), flywheel(1)], 'the room\'s engine; its belt is what the lever stops'],
  ['THE FURNACE  shut, open', [furnace(0), furnace(1)], 'in the wall; opened, a tongue of fire into the room'],
  ['THE HAMMER  up, down', [hammer(0), hammer(1)], 'a stamp on a rhythm over its plate; the amber dots are the beat'],
  ['THE WHISTLE  2 frames', [whistle(0), whistle(1)], 'the floor\'s alarm and its clock: one shriek a room'],
  ['FITTINGS', [cages(), drain(), tally(), lever(0), lever(1)], 'the cages, the drain, the tally board, the lever up and thrown'],
  ['MORE FITTINGS', [barrow(), bonePile(), winch(), gate(0), gate(1), scale()], 'the offal barrow, the bone pile, the winch, the sorting gate shut and swung, the scale'],
];
const rowW = Math.max(...ROWS.map(([, gs]) => gs.reduce((a, g) => a + g.w * Z + pad, 0)));
const rowH = (gs) => Math.max(...gs.map((g) => g.h)) * Z;
const W = pad * 2 + rowW, H = pad + 40 + ROWS.reduce((a, [, gs]) => a + rowH(gs) + labelH + pad + 14, 0);
const img = new Img(W, H, '#2b2622');
text(img, 'THE FACTORY  ·  the machines and fittings  ·  one texel = 4/3 world px, a tile is 24 texels', pad, 10, '#e8d8b0', 2);
let y = pad + 40;
for (const [name, gs, note] of ROWS) {
  text(img, name, pad, y, '#e8d8b0', 2); text(img, note, pad, y + 14, '#a89a80', 1);
  const h = rowH(gs); let x = pad;
  for (const g of gs) { img.fill(x - 4, y + labelH - 4, g.w * Z + 8, h + 8, '#3a3230'); img.blit(toImg(g), 0, 0, g.w, g.h, x, y + labelH + h - g.h * Z, g.w * Z, g.h * Z); x += g.w * Z + pad; }
  y += h + labelH + pad + 14; img.fill(pad, y - 8, W - 2 * pad, 1, '#5a4d40');
}
fs.writeFileSync(__dirname + '/machines.png', img.png());
console.log('machines.png', W, H);
