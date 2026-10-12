// node rooms.cjs [zoom] → rooms.png: three looks for the FACTORY floor's canon, each as a dressed room with the goat and a
// clubman in it for scale, and under each its floor tile, wall cap and wall face. Concept art only.
const L = require('./lib.cjs'), M = require('./machines.cjs');
const { fs, Img, text, Grid, F, D, TT, OL, hash, toImg, putUnit, LOOKS, room } = L;

const Z = +(process.argv[2] || 2), RW = 14, RH = 9, pad = 20;
const at = (g, mg, tx, ty, dx = 0, dy = 0) => g.blit(mg, Math.round(tx * TT + dx), Math.round(ty * TT + dy));
// an overhead rail across the room with hooks and what hangs on them, drawn over everything
const rail = (g, d, ty, x0, x1, hang) => {
  const y = ty * TT + 4; d.rect(x0, y, x1 - x0, 4, F.iron[2]); d.hl(x0, y, x1 - x0, F.iron[4]); d.hl(x0, y + 3, x1 - x0, F.iron[0]); d.rivets(x0 + 4, y + 2, x1 - 4, y + 2, 10, F.iron[0]);
  hang.forEach(([tx, v]) => { const m = M.hookRail(v), c = new Grid(m.w, m.h); for (let yy = 6; yy < m.h; yy++) for (let xx = 18; xx < m.w; xx++) if (m.get(xx, yy)) c.set(xx, yy, m.get(xx, yy)); g.blit(c, Math.round(tx * TT) - 27, y - 6); });
};
// a butcher's block: a thick table of timber, a cleaver in it
const block = (d, x, y) => { d.rect(x, y + 6, 36, 20, F.timber[1]); d.rect(x, y, 36, 8, F.timber[3]); d.hl(x, y, 36, F.timber[2]); for (let i = 6; i < 36; i += 8) d.vl(x + i, y, 8, F.timber[2]); d.blood(x + 20, y + 4, 7, 2, 3); d.rect(x + 6, y - 4, 2, 9, F.iron[4]); d.rect(x + 4, y - 7, 8, 4, F.iron[3]); d.rect(x + 1, y + 26, 34, 2, OL); };
// a boiler: a standing drum with its own fire door, a gauge and a stack
const boiler = (d, x, y) => { d.cyl(x, y + 8, 40, 40, F.iron); d.ell(x + 20, y + 8, 20, 6, F.iron[3]); d.ring(x + 20, y + 8, 20, 6, 1, F.iron[4]); for (const yy of [y + 20, y + 34]) d.rivets(x + 2, yy, x + 38, yy, 5, F.iron[4], F.iron[0]); d.rect(x + 13, y + 26, 14, 14, F.iron[1]); d.rect(x + 15, y + 28, 10, 10, F.coal[0]); for (let xx = x + 16; xx < x + 25; xx += 3) d.flame(xx, y + 38, 6 + hash(xx, 3) % 4, 1.5); d.ell(x + 20, y + 16, 3.5, 3.5, F.glass[3]); d.ring(x + 20, y + 16, 3.5, 3.5, 1, F.brass[3]); d.line(x + 20, y + 16, x + 22, y + 14, F.blood[3]); d.rect(x + 32, y - 6, 5, 16, F.iron[2]); d.steam(x + 34, y - 10, 5, 0.7); };

const ROOMS = [
  ['kill', (d, g) => {
    LOOKS.kill.gutter(d, 1 * TT, 5 * TT, false); for (let tx = 2; tx < RW - 1; tx++) LOOKS.kill.gutter(d, tx * TT, 5 * TT, false);
    for (let ty = 1; ty < 5; ty++) LOOKS.kill.gutter(d, 7 * TT, ty * TT, true);
    at(g, M.drain(), 7, 5); at(g, M.furnace(0), 10, 0, 2, -6); at(g, M.tally(), 3, 0, 4, 2); at(g, M.cages(), 1, 6, 0, -4);
    at(g, M.vat(0), 12, 1, -8, 2); block(d, 4 * TT, 6 * TT + 4); at(g, M.lever(0), 12, 6, 2, 2); at(g, M.barrow(), 10, 6, 0, 4);
    at(g, M.steamValve(0), 6, 0, 0, 14);
    d.blood(9 * TT, 7 * TT, 8, 4, 5); d.blood(3 * TT + 10, 3 * TT, 6, 3, 8);
    rail(g, d, 2, TT, (RW - 1) * TT, [[3, 1], [5, 2], [9, 1], [11, 0]]);
  }, [[1.9, 7.5, 'goat'], [8.6, 7.2, 'clubman']]],
  ['render', (d, g) => {
    at(g, M.steamValve(0), 2, 0, 0, 15); at(g, M.steamValve(1), 8, 0, 0, 15); at(g, M.whistle(1), 12, 0, 4, -4);
    boiler(d, 11 * TT, 1 * TT); at(g, M.vat(1), 2, 2, 0, 0); at(g, M.vat(0), 4, 3, 2, 4); at(g, M.flywheel(0), 8, 2, 4, 0);
    for (let tx = 1; tx < 7; tx++) at(g, M.conveyor(tx % 3), 1 + (tx - 1) * 2, 7, 0, 0); at(g, M.grinder(1), 12, 6, -2, -8);
    at(g, M.barrow(), 7, 5, 0, 0); at(g, M.lever(1), 10, 5, 0, 0); at(g, M.winch(), 1, 5, 2, 0);
    rail(g, d, 1, 5 * TT, 11 * TT, [[6, 1], [8, 2]]);
  }, [[3.2, 6.3, 'goat'], [9.1, 4.1, 'clubman']]],
  ['bone', (d, g) => {
    at(g, M.press(1), 5, 3); at(g, M.hatch(1), 2, 2); at(g, M.hatch(0), 11, 6); at(g, M.bonePile(), 10, 1, 0, 6); at(g, M.bonePile(), 2, 6, 6, 4);
    at(g, M.hammer(0), 1, 0, 2, -2); at(g, M.saw(1), 8, 6, 0, -4); at(g, M.cages(), 12, 2, -4, 0); at(g, M.scale(), 9, 0, 6, 4);
    for (let tx = 0; tx < 3; tx++) at(g, M.conveyor(tx), 2 + tx * 2, 5, 0, 0); at(g, M.grinder(0), 8, 4, -2, -6);
    d.gear(5 * TT + 8, 0 * TT + 12, 9, 10, F.brass, 0.2); d.gear(6 * TT + 6, 0 * TT + 16, 5, 7, F.brass, 0.5);
    at(g, M.lever(0), 4, 2, 0, 0); at(g, M.tally(), 12, 0, 2, 2);
  }, [[1.9, 7.4, 'goat'], [4.4, 8.0, 'clubman']]],
];

const roomW = RW * TT * Z, roomH = RH * TT * Z, swW = TT * 4 + 20, swH = TT * 4 + 30, colW = roomW + pad;
const W = pad + ROOMS.length * colW, H = pad + 30 + roomH + 20 + swH + 60;
const img = new Img(W, H, '#2b2622');
text(img, 'THE FACTORY  ·  three looks for the canon, a 14 x 9 room each, the goat and a clubman at world size', pad, 8, '#e8d8b0', 2);
ROOMS.forEach(([look, deco, units], i) => {
  const Lk = LOOKS[look], x = pad + i * colW, y = pad + 30;
  text(img, Lk.name, x, y - 16, '#e8d8b0', 2);
  const g = room(look, RW, RH, deco);
  img.blit(toImg(g), 0, 0, g.w, g.h, x, y, roomW, roomH);
  for (const [tx, ty, u] of units) putUnit(img, u, u === 'goat' ? 7 : 0, x, y, tx * L.TILE, ty * L.TILE, Z);
  text(img, Lk.sub, x, y + roomH + 6, '#a89a80', 1);
  // the swatches: four floor tiles, a wall cap, a wall face
  const sg = new Grid(TT * 4 + 6, TT * 2 + 4), sd = new D(sg);
  for (let k = 0; k < 4; k++) Lk.floor(sd, k * TT + (k > 1 ? 4 : 0), TT + 4, k + 3, 7); Lk.wall(sd, 0, 0, false); Lk.wall(sd, TT + 2, 0, true);
  const sy = y + roomH + 22; img.blit(toImg(sg), 0, 0, sg.w, sg.h, x, sy, sg.w * 4, sg.h * 4);
  text(img, 'CAP  FACE          FLOOR', x, sy + sg.h * 4 + 4, '#a89a80', 1);
});
fs.writeFileSync(__dirname + '/rooms.png', img.png());
console.log('rooms.png', W, H);
