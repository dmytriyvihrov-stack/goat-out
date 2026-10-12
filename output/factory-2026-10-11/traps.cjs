// node traps.cjs [zoom] → traps.png: twelve traps and mechanisms of the FACTORY floor, each as a 9 x 6 room diagram: the machine,
// the goat, a man, the tell in amber cells, the kill in red, the motion as an arrow. Under each, how it kills (pillar 3: the
// geometry kills, the goat only puts a man where it is) and what the goat can do with it. Concept art only.
const L = require('./lib.cjs'), M = require('./machines.cjs');
const { fs, Img, text, Grid, F, D, TT, TILE, OL, hash, toImg, putUnit, LOOKS, room } = L;

const Z = +(process.argv[2] || 2), RW = 9, RH = 6, pad = 16, capH = 62;
// captions wrap on words at `cols` characters (the sheet's font is 8 px a character at k = 2)
const wrap = (lines, cols = 52) => { const out = []; for (const w of lines.join(' ').split(' ')) { if (out.length && (out[out.length - 1] + ' ' + w).length <= cols) out[out.length - 1] += ' ' + w; else out.push(w); } return out; };
const at = (g, mg, tx, ty, dx = 0, dy = 0) => g.blit(mg, Math.round(tx * TT + dx), Math.round(ty * TT + dy));
// the game's cells: a 2 x 2 texel dot every 4 texels over a rect of tiles
const cells = (d, tx, ty, w, h, c, step = 4) => { for (let y = ty * TT + 1; y < (ty + h) * TT; y += step) for (let x = tx * TT + 1; x < (tx + w) * TT; x += step) d.rect(x, y, 2, 2, c); };
const arrow = (d, x0, y0, x1, y1, c) => { d.line(x0, y0, x1, y1, c); d.line(x0 + 1, y0, x1 + 1, y1, c); const a = Math.atan2(y1 - y0, x1 - x0); for (const s of [-1, 1]) d.line(x1, y1, x1 - Math.cos(a + s * 0.6) * 6, y1 - Math.sin(a + s * 0.6) * 6, c); };
const stars = (d, x, y) => { for (let k = 0; k < 3; k++) { const a = k * 2.1; d.rect(x + Math.cos(a) * 6 - 1, y + Math.sin(a) * 3 - 1, 2, 2, F.amberHi); } };
const slabV = (d, x, y0, y1, w) => { d.rect(x, y0, w, y1 - y0, F.iron[2]); d.vl(x, y0, y1 - y0, F.iron[4]); d.vl(x + w - 1, y0, y1 - y0, F.iron[0]); for (let y = y0 + 4; y < y1; y += 8) d.rivets(x + 3, y, x + w - 4, y, 6, F.iron[3], F.iron[0]); };
const slabH = (d, y, x0, x1, h) => { d.rect(x0, y, x1 - x0, h, F.iron[2]); d.hl(x0, y, x1 - x0, F.iron[4]); d.hl(x0, y + h - 1, x1 - x0, F.iron[0]); for (let x = x0 + 4; x < x1; x += 8) d.rivets(x, y + 3, x, y + h - 4, 6, F.iron[3], F.iron[0]); };
const ram = (d, x0, y, x1) => { for (let yy = y - 2; yy <= y + 2; yy++) d.hl(Math.min(x0, x1), yy, Math.abs(x1 - x0), yy === y - 2 ? F.rust[4] : yy === y + 2 ? F.rust[0] : F.rust[2]); };
const door = (d, tx, ty, side) => { if (side === 'e') { d.rect((tx + 1) * TT - 1, ty * TT, 1, 2 * TT, F.coal[0]); d.rect(tx * TT + 20, ty * TT + 2, 4, 2 * TT - 4, F.timber[2]); } else { d.rect(tx * TT, ty * TT, 2 * TT, 1, F.coal[0]); d.rect(tx * TT + 2, ty * TT, 2 * TT - 4, 5, F.timber[2]); } };

const DIAGRAMS = [
  { name: '1  THE PRESS LANE', look: 'bone', cap: ['Two slabs on rams either side of a two-tile lane, a lever at its', 'mouth. Thrown: the slabs close over press.time s and open again.', 'Between them is paste, man or goat. The roll carries him through.'],
    deco(d, g) { slabV(d, 2 * TT, 1 * TT, 5 * TT, 16); slabV(d, 6 * TT - 16, 1 * TT, 5 * TT, 16); for (const y of [2 * TT, 4 * TT]) { ram(d, 1 * TT, y, 2 * TT); ram(d, 6 * TT, y, 7 * TT); }
      cells(d, 3, 1, 2, 4, F.amber, 6); d.blood(4 * TT + 10, 3 * TT, 4, 10, 3); at(g, M.lever(1), 4, 5, 2, -14); door(d, 4, 0, 'n'); },
    units: [[4.1, 2.6, 'clubman'], [4.2, 5.5, 'goat']], after(d) { arrow(d, 2 * TT + 20, 3 * TT, 3 * TT + 6, 3 * TT, F.amberHi); arrow(d, 6 * TT - 20, 3 * TT, 5 * TT - 6, 3 * TT, F.amberHi); } },
  { name: '2  THE CLOSING ROOM', look: 'render', cap: ['The squeezing walls. Both long walls are slabs: once he is a', 'tile in they grind inward a tile every step s and stop at a', 'two-tile lane. A man against one as it moves dies on it.'],
    deco(d, g) { slabH(d, 1 * TT, 1 * TT, 8 * TT, 20); slabH(d, 5 * TT - 20, 1 * TT, 8 * TT, 20); for (const x of [2 * TT, 4 * TT, 6 * TT]) { for (let yy = -2; yy <= 2; yy++) { d.vl(x + yy, 0 * TT + 10, 14, yy === -2 ? F.rust[4] : yy === 2 ? F.rust[0] : F.rust[2]); d.vl(x + yy, 5 * TT, 14, yy === -2 ? F.rust[4] : yy === 2 ? F.rust[0] : F.rust[2]); } }
      cells(d, 1, 1, 7, 1, F.amber, 6); cells(d, 1, 4, 7, 1, F.amber, 6); d.blood(6 * TT + 6, 1 * TT + 22, 10, 4, 5); door(d, 8, 2, 'e'); },
    units: [[6.3, 2.2, 'clubman'], [3.0, 3.0, 'goat']], after(d) { arrow(d, 4 * TT + 8, 1 * TT + 22, 4 * TT + 8, 2 * TT + 6, F.amberHi); arrow(d, 4 * TT + 8, 5 * TT - 22, 4 * TT + 8, 4 * TT - 6, F.amberHi); } },
  { name: '3  THE BELT INTO THE GRINDER', look: 'render', cap: ['A belt lane across the room, a tile a second toward the mouth.', 'A man floored onto it rides to the grinder and goes in whole.', 'The goat rides too unless he steps off. The cult reads it as a wheel.'],
    deco(d, g) { for (let k = 0; k < 3; k++) at(g, M.conveyor(k), 1 + k * 2, 3); at(g, M.grinder(1), 7, 2, 0, -10); cells(d, 7, 2, 1, 2, F.blood[3], 5); },
    units: [[3.6, 3.75, 'clubman'], [4.6, 1.9, 'goat']], after(d) { for (const x of [2, 4, 6]) arrow(d, x * TT - 10, 3 * TT + 12, x * TT + 10, 3 * TT + 12, F.amberHi); } },
  { name: '4  THE SAW LANE', look: 'kill', cap: ['A slot across the floor, a blade on a carriage going up and', 'down it, saw.speed tiles a second. The cells ahead of it are', 'the tell. On the slot when it passes: a man is cut, the goat a heart.'],
    deco(d, g) { d.rect(4 * TT + 10, 1 * TT, 4, 4 * TT, F.coal[0]); d.vl(4 * TT + 9, 1 * TT, 4 * TT, F.iron[3]); d.vl(4 * TT + 14, 1 * TT, 4 * TT, F.iron[1]); cells(d, 4, 1, 1, 2, F.amber, 6); at(g, M.saw(1), 4, 3, -12, -4); d.blood(4 * TT + 12, 2 * TT + 10, 8, 3, 7); },
    units: [[4.5, 2.1, 'clubman'], [2.3, 4.4, 'goat']], after(d) { arrow(d, 4 * TT + 12, 3 * TT - 4, 4 * TT + 12, 1 * TT + 12, F.amberHi); } },
  { name: '5  THE STEAM MAIN', look: 'render', cap: ['The pipe runs along the far wall with a valve wheel on it. A', 'headbutt on the wheel opens it steam.for s: a jet two tiles', 'down the lane. Scalds a man a heart, puts out any fire it meets.'],
    deco(d, g) { at(g, M.steamValve(2), 2, 0, 0, 14); cells(d, 3, 1, 1, 2, F.steam[3], 5); cells(d, 3, 1, 1, 2, F.steam[1], 10); at(g, M.vat(0), 6, 3, 6, 0); },
    units: [[3.5, 2.6, 'clubman'], [4.8, 1.5, 'goat']], after(d) { arrow(d, 3 * TT + 12, 1 * TT + 4, 3 * TT + 12, 3 * TT - 2, F.steam[3]); } },
  { name: '6  THE HOOK LINE', look: 'kill', cap: ['Hooks going round the room on an overhead rail, a tile a second.', 'A body flung into one is caught and carried to the vat at the', 'end. Under a hook standing up, a man is lifted too; the roll ducks it.'],
    deco(d, g) { const y = 1 * TT + 4; d.rect(1 * TT, y, 7 * TT, 4, F.iron[2]); d.hl(1 * TT, y, 7 * TT, F.iron[4]); d.rect(7 * TT, y, 4, 3 * TT, F.iron[2]); d.rect(1 * TT, y + 3 * TT, 7 * TT, 4, F.iron[2]); d.rect(1 * TT, y, 4, 3 * TT, F.iron[2]);
      for (const [tx, ty] of [[3, 1], [6, 1], [2, 4]]) { d.vl(tx * TT, ty * TT + 8, 6, F.iron[4]); d.hook(tx * TT, ty * TT + 14, F.iron[4], F.iron[2]); }
      at(g, M.vat(1), 7, 3, -22, -2); cells(d, 2, 1, 5, 1, F.amber, 8); d.vl(5 * TT, 1 * TT + 8, 6, F.iron[4]); d.hook(5 * TT, 1 * TT + 14, F.iron[4], F.iron[2]); },
    units: [[5.0, 2.4, 'clubman'], [3.4, 3.6, 'goat']], after(d) { arrow(d, 3 * TT + 10, 1 * TT + 6, 4 * TT + 10, 1 * TT + 6, F.amberHi); arrow(d, 7 * TT + 2, 2 * TT, 7 * TT + 2, 3 * TT, F.amberHi); d.rect(5 * TT - 6, 1 * TT + 18, 12, 2, F.blood[3]); } },
  { name: '7  THE HATCH', look: 'bone', cap: ['A two-leaf iron trap over the chute, the lever a few tiles off.', 'Thrown, the leaves drop for hatch.open s: a drop that is there', 'and then not. Whoever stands on it falls. The cult avoids it only when open.'],
    deco(d, g) { at(g, M.hatch(1), 4, 2, 4, 4); at(g, M.lever(1), 1, 4, 4, -10); cells(d, 4, 2, 2, 2, F.blood[3], 8); },
    units: [[5.0, 3.1, 'clubman'], [1.8, 4.1, 'goat']], after(d) { arrow(d, 2 * TT, 4 * TT - 6, 4 * TT - 2, 3 * TT + 6, F.amberHi); } },
  { name: '8  THE HAMMER', look: 'bone', cap: ['A stamp on a rhythm over a two-tile plate in the one way through.', 'Its shadow grows for hammer.wind s, then it comes down: a man', 'under it is flat, the goat loses a heart. Cross between the beats.'],
    deco(d, g) { at(g, M.hammer(0), 3, 0, 8, 8); cells(d, 3, 2, 2, 2, F.amber, 6); d.rect(2 * TT, 1 * TT, 1 * TT, 4 * TT, F.iron[1]); d.rect(6 * TT, 1 * TT, 1 * TT, 4 * TT, F.iron[1]); for (let y = 1 * TT; y < 5 * TT; y += 6) { d.rivets(2 * TT + 4, y, 2 * TT + 20, y, 8, F.iron[3]); d.rivets(6 * TT + 4, y, 6 * TT + 20, y, 8, F.iron[3]); } door(d, 4, 0, 'n'); },
    units: [[4.1, 3.5, 'clubman'], [4.3, 5.2, 'goat']], after(d) { d.ring(4 * TT + 8, 3 * TT + 2, 14, 7, 1, F.amberHi); } },
  { name: '9  THE FURNACE DOOR', look: 'render', cap: ['An iron door in the wall. Butted open it breathes a tongue of', 'fire three tiles into the room for furnace.breath s and lights', 'the coal dust on the floor. A body flung into it burns outright.'],
    deco(d, g) { at(g, M.furnace(1), 3, 0, 2, -4); for (let k = 0; k < 3; k++) { cells(d, 3, 1 + k, 2, 1, k < 2 ? F.fire[2] : F.fire[0], 5); } for (let x = 3 * TT + 4; x < 5 * TT; x += 5) d.flame(x, 2 * TT + 8, 10 + hash(x, 2) % 8, 2.5); for (let tx = 1; tx < 8; tx++) for (let k = 0; k < 4; k++) if (hash(tx, k) < 60) d.dot(tx * TT + hash(k, tx) % 20, 4 * TT + hash(tx, k * 3) % 20, F.coal[0]); },
    units: [[3.8, 3.4, 'clubman'], [6.0, 1.8, 'goat']], after(d) { stars(d, 3.8 * TT, 2 * TT + 4); } },
  { name: '10  THE VAT TIPPED', look: 'kill', cap: ['A tub of boiling fat on a trestle. A body flung in is gone in a', 'burst of steam. A headbutt tips it: a spill of scald two tiles', 'across, a heart and a slow to anyone in it, then a slick that stays.'],
    deco(d, g) { at(g, M.vat(0), 2, 1, 0, -2); d.ell(5 * TT + 10, 3 * TT, 30, 18, F.fat[1]); d.ell(5 * TT + 6, 3 * TT - 2, 24, 13, F.fat[2]); for (let k = 0; k < 10; k++) d.ring(4 * TT + hash(k, 1) % 60, 2 * TT + 8 + hash(k, 4) % 30, 2, 1.5, 1, F.fat[3]); d.steam(5 * TT, 2 * TT - 4, 6, 0.6); d.steam(6 * TT + 6, 2 * TT, 5, 0.6); cells(d, 4, 2, 3, 2, F.blood[3], 10); },
    units: [[5.6, 3.5, 'clubman'], [1.5, 3.9, 'goat']], after(d) { arrow(d, 1.5 * TT + 8, 3.5 * TT, 2 * TT + 14, 2.6 * TT, F.amberHi); } },
  { name: '11  THE SORTING GATES', look: 'bone', cap: ['Stockyard gates on pivots make the room a pen of lanes. A', 'headbutt swings one: shut a lane on a man\'s face (dazed), cut', 'the pack in two, open a way the cult has not got. No lever at all.'],
    deco(d, g) { for (const [tx, ty, o] of [[3, 1, 0], [3, 3, 1], [6, 1, 1], [6, 3, 0]]) at(g, M.gate(o), tx, ty, -2, -8); d.rect(3 * TT - 2, 1 * TT, 3, 4 * TT, F.iron[1]); d.rect(6 * TT - 2, 1 * TT, 3, 4 * TT, F.iron[1]); },
    units: [[4.6, 2.3, 'clubman'], [2.2, 2.6, 'goat'], [7.4, 3.9, 'clubman']], after(d) { stars(d, 4.6 * TT, 1 * TT + 8); } },
  { name: '12  THE WHISTLE', look: 'render', cap: ['A steam whistle in every room on the far wall. A headbutt on its', 'cord, or the room\'s own clock: a shriek whistle.for s that deafens', 'the room: no footstep is heard, every man turns to it. Stealth, bought.'],
    deco(d, g) { at(g, M.whistle(1), 4, 0, 4, -2); d.vl(4 * TT + 16, 0 * TT + 30, 24, F.lea[3]); d.ell(4 * TT + 16, 2 * TT + 8, 2, 2, F.blood[2]); for (let k = 1; k <= 3; k++) d.ring(4 * TT + 16, 1 * TT, 10 * k, 6 * k, 1, F.steam[2]); },
    units: [[2.0, 3.2, 'clubman'], [7.0, 2.4, 'clubman'], [4.7, 4.3, 'goat']], after(d) { for (const [x, y] of [[2.0, 1.6], [7.0, 0.8]]) { d.rect(x * TT - 2, y * TT, 3, 6, F.amberHi); d.rect(x * TT - 2, y * TT + 7, 3, 2, F.amberHi); } d.ell(4.7 * TT, 4.3 * TT - 30, 6, 3, F.steam[3]); d.ell(4.7 * TT, 4.3 * TT - 30, 2, 2, F.coal[0]); } },
];

const cellW = RW * TT * Z, cellH = RH * TT * Z, cols = 3, rows = Math.ceil(DIAGRAMS.length / cols);
const W = pad + cols * (cellW + pad), H = pad + 30 + rows * (cellH + 24 + capH + pad);
const img = new Img(W, H, '#2b2622');
text(img, 'THE FACTORY  ·  traps and mechanisms  ·  amber cells the tell, red cells the kill, arrows the motion', pad, 8, '#e8d8b0', 2);
DIAGRAMS.forEach((T, i) => {
  const x = pad + (i % cols) * (cellW + pad), y = pad + 30 + Math.floor(i / cols) * (cellH + 24 + capH + pad);
  text(img, T.name, x, y, '#e8d8b0', 2);
  const g = room(T.look, RW, RH, T.deco), d = new D(g); if (T.after) T.after(d, g);
  img.blit(toImg(g), 0, 0, g.w, g.h, x, y + 18, cellW, cellH);
  for (const [tx, ty, u] of T.units) putUnit(img, u, u === 'goat' ? 7 : 0, x, y + 18, tx * TILE, ty * TILE, Z);
  wrap(T.cap).forEach((line, k) => text(img, line, x, y + 18 + cellH + 6 + k * 12, '#c8b898', 2));
});
fs.writeFileSync(__dirname + '/traps.png', img.png());
console.log('traps.png', W, H);
