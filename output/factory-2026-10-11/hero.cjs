// node hero.cjs [zoom] → hero.png: three scenes of THE FACTORY as a frame of play would show them: the room squashed by TILT,
// a shadow under every foot, lit by what burns in it, the tells in amber cells and the blows in white, the action mid-beat.
// One scene a look: THE BLEEDING ROOM, THE RENDERING ROOM, THE PRESS. Concept art only.
const L = require('./lib.cjs'), M = require('./machines.cjs'), E = require('./enemy.cjs');
const { fs, Img, text, Grid, F, D, TX, TT, TILE, TILT, OL, hash, toImg, LOOKS, room, shadow, light, motes, cellsPx, ringPx, layRoom, unit } = L;

const Z = +(process.argv[2] || 3), RW = 16, RH = 10, pad = 20;
const at = (g, mg, tx, ty, dx = 0, dy = 0) => g.blit(mg, Math.round(tx * TT + dx), Math.round(ty * TT + dy));
const W2P = Z / TX;   // px a world px
// a caged lantern on the far wall: a bracket, the cage, the flame; the light itself is laid on the image after
function lamp() { const g = new Grid(14, 20), d = new D(g); d.rect(6, 0, 2, 4, F.iron[2]); d.rect(2, 4, 10, 12, F.iron[1]); d.rect(3, 5, 8, 10, F.fire[2]); d.rect(5, 7, 4, 6, F.fire[3]); for (let x = 3; x < 11; x += 2) d.vl(x, 5, 10, F.iron[2]); d.hl(2, 4, 10, F.iron[3]); d.rect(4, 16, 6, 2, F.iron[2]); return g.outline(OL); }
// a plank door standing open in a side wall, folded along it
function doorOpen() { const g = new Grid(8, 44), d = new D(g); d.rect(1, 1, 6, 42, F.timber[2]); d.vl(1, 1, 42, F.timber[3]); d.vl(6, 1, 42, F.timber[0]); d.vl(4, 1, 42, F.timber[1]); for (const y of [6, 36]) { d.rect(1, y, 6, 3, F.timber[3]); d.dot(2, y + 1, F.iron[3]); d.dot(5, y + 1, F.iron[3]); } return g.outline(OL); }
// a patch of floor on fire: flames in a cluster, the tile under them scorched
function fireTiles(d, tx, ty, w, h, seed) { d.rect(tx * TT, ty * TT, w * TT, h * TT, F.coal[1]); for (let k = 0; k < w * h * 5; k++) { const x = tx * TT + hash(k, seed) % (w * TT), y = ty * TT + 4 + hash(seed, k * 3) % (h * TT - 4); d.flame(x, y, 7 + hash(k, 9) % 8, 2.5 + (hash(k, 2) % 2)); } }
// an engine (the mechanical man) laid in a room at world (wx, wy): drawn on its own grid at its sheet's texel size
function engine(img, look, state, ox, oy, wx, wy) { const g = E.sprite(E.LOOKS[look], state), s = E.TX * W2P, w = Math.round(g.w * s), h = Math.round(g.h * s), px = ox + wx * W2P, py = oy + wy * W2P * TILT; shadow(img, px, py + 2, w * 0.4, w * 0.16, 0.5); img.blit(toImg(g), 0, 0, g.w, g.h, Math.round(px - w / 2), Math.round(py - (E.FOOT + 1) * s), w, h, true); return { x: px, y: py }; }
// cells, rings and splatter go on AFTER the light, as the game's floor marks do: a tell is never dimmed by the room
const FX = []; const cellsL = (...a) => FX.push(() => cellsPx(img, ...a)); const ringL = (...a) => FX.push(() => ringPx(img, ...a)); const fillL = (...a) => FX.push(() => img.fill(...a));
const wp = (ox, oy, tx, ty) => [ox + tx * TILE * W2P, oy + ty * TILE * W2P * TILT];   // tile coords → px on the tilted room

const SCENES = [
  { name: 'THE BLEEDING ROOM', look: 'kill', sub: 'the hook line over the gutters: a man butted up into it, two more coming through the door',
    deco(d, g) {
      for (let tx = 1; tx < RW - 1; tx++) LOOKS.kill.gutter(d, tx * TT, 5 * TT, false); for (let ty = 1; ty < 5; ty++) LOOKS.kill.gutter(d, 8 * TT, ty * TT, true);
      at(g, M.drain(), 8, 5); at(g, M.furnace(0), 12, 0, 2, -6); at(g, M.tally(), 2, 0, 2, 2); at(g, M.steamValve(0), 5, 0, 0, 14);
      at(g, lamp(), 4, 0, 4, 2); at(g, lamp(), 10, 0, 6, 2);
      at(g, M.cages(), 1, 6, 2, -4); at(g, M.vat(0), 13, 6, 4, 4); at(g, M.barrow(), 11, 7, 0, 4); at(g, M.winch(), 1, 2, 2, 0);
      d.blood(10 * TT, 8 * TT, 9, 4, 5); d.blood(4 * TT + 10, 3 * TT, 7, 3, 8); d.blood(6 * TT, 7 * TT + 6, 5, 2, 2);
      at(g, doorOpen(), 15, 6, -8, -8); d.rect(15 * TT, 6 * TT, TT, 2 * TT, F.coal[0]);
      // the rail across the room and what hangs on it, over everything
      const y = 2 * TT + 4; d.rect(TT, y, (RW - 2) * TT, 4, F.iron[2]); d.hl(TT, y, (RW - 2) * TT, F.iron[4]); d.hl(TT, y + 3, (RW - 2) * TT, F.iron[0]); d.rivets(TT + 4, y + 2, (RW - 1) * TT - 4, y + 2, 10, F.iron[0]);
      for (const [tx, v] of [[3, 1], [5.5, 2], [11, 1], [13, 2], [8.6, 0]]) { const m = M.hookRail(v), c = new Grid(m.w, m.h); for (let yy = 6; yy < m.h; yy++) for (let xx = 18; xx < m.w; xx++) if (m.get(xx, yy)) c.set(xx, yy, m.get(xx, yy)); g.blit(c, Math.round(tx * TT) - 27, y - 6); }
    },
    play(img, ox, oy) {
      unit(img, 'goat', 6, ox, oy, 5.4 * TILE, 7.2 * TILE, Z);
      // the horn wave: an arc of white cells ahead of him, and the man it met in the air, a slash of white across him
      const [gx, gy] = wp(ox, oy, 5.4, 7.2); for (let k = -4; k <= 4; k++) { const a = -0.35 + k * 0.17; cellsL(gx + Math.cos(a) * 1.6 * TILE * W2P, gy + Math.sin(a) * 1.6 * TILE * W2P * TILT - 8, 3, 3, F.hit, 6, 3); }
      const m = unit(img, 'clubman', 2, ox, oy, 8.6 * TILE, 5.6 * TILE, Z, { air: 26 });
      for (let k = 0; k < 7; k++) cellsL(m.x - 30 + k * 9, m.y - 44 - k * 5, 3, 3, F.hit, 6, 3);
      for (let k = 0; k < 6; k++) { const [r, g, b] = Img.hex(F.blood[3]); fillL(Math.round(m.x - 20 + hash(k, 3) % 40), Math.round(m.y - 50 + hash(k, 8) % 30), 3, 3, F.blood[3]); }
      unit(img, 'clubman', 4, ox, oy, 13.6 * TILE, 7.0 * TILE, Z); unit(img, 'hound', 4, ox, oy, 12.4 * TILE, 3.6 * TILE, Z);
      unit(img, 'hunter', 3, ox, oy, 2.6 * TILE, 4.2 * TILE, Z);
    },
    lights(ox, oy) { const [l1x, l1y] = wp(ox, oy, 4.7, 0.9), [l2x, l2y] = wp(ox, oy, 10.9, 0.9), [fx, fy] = wp(ox, oy, 13, 1), [vx, vy] = wp(ox, oy, 14, 7); return [{ x: l1x, y: l1y, r: 7 * TILE * W2P, c: [0.75, 0.6, 0.3], k: 1.1, sy: TILT }, { x: l2x, y: l2y, r: 7 * TILE * W2P, c: [0.75, 0.6, 0.3], k: 1.1, sy: TILT }, { x: fx, y: fy, r: 3 * TILE * W2P, c: [0.6, 0.2, 0.05], k: 0.8 }, { x: vx, y: vy, r: 3 * TILE * W2P, c: [0.3, 0.4, 0.5], k: 0.8 }]; },
    ambient: [0.40, 0.42, 0.50] },
  { name: 'THE RENDERING ROOM', look: 'render', sub: 'the belt carries a floored man to the grinder; a STOKER walks out of the fire, lit by it; the steam main jetting',
    deco(d, g) {
      at(g, M.steamValve(2), 3, 0, 0, 15); at(g, M.steamValve(0), 9, 0, 0, 15); at(g, lamp(), 1, 0, 6, 2); at(g, M.whistle(0), 14, 0, 4, -4);
      const bx = 12 * TT, by = 1 * TT; const bd = new D(g, bx, by);   // the boiler, its fire door open
      bd.cyl(0, 8, 40, 40, F.iron); bd.ell(20, 8, 20, 6, F.iron[3]); bd.ring(20, 8, 20, 6, 1, F.iron[4]); for (const yy of [20, 34]) bd.rivets(2, yy, 38, yy, 5, F.iron[4], F.iron[0]);
      bd.rect(13, 24, 14, 16, F.coal[0]); for (let xx = 15; xx < 26; xx += 3) bd.flame(xx, 39, 9 + hash(xx, 3) % 6, 2); bd.poly([[27, 24], [34, 20], [34, 44], [27, 40]], F.iron[2]); bd.ell(20, 16, 3.5, 3.5, F.glass[3]); bd.ring(20, 16, 3.5, 3.5, 1, F.brass[3]); bd.line(20, 16, 22, 14, F.blood[3]); bd.rect(32, -6, 5, 16, F.iron[2]); bd.steam(34, -10, 5, 0.7);
      at(g, M.vat(1), 2, 2, 4, 0); at(g, M.vat(0), 4, 3, 6, 6); at(g, M.flywheel(1), 13, 4, 0, 0); at(g, M.winch(), 1, 5, 4, 0); at(g, M.barrow(), 9, 4, 0, 0);
      fireTiles(d, 8, 2, 2, 1, 4);
      for (let k = 0; k < 6; k++) at(g, M.conveyor(k % 3), 1 + k * 2, 7); at(g, M.grinder(1), 13, 6, 0, -8);
      at(g, M.lever(1), 11, 5, 0, 0); d.blood(14 * TT, 8 * TT + 8, 8, 3, 2);
      at(g, doorOpen(), 0, 3, 6, -8); d.rect(0, 3 * TT, TT, 2 * TT, F.coal[0]);
    },
    play(img, ox, oy) {
      unit(img, 'clubman', 2, ox, oy, 6.8 * TILE, 7.55 * TILE, Z, { lying: 'cw' });
      const [ax, ay] = wp(ox, oy, 3, 7.5); for (const x of [3, 5.3, 9.5, 11.8]) { const [px, py] = wp(ox, oy, x, 7.5); for (let k = 0; k < 3; k++) cellsL(px + k * 7, py - 4, 3, 3, F.amber, 6, 3); cellsL(px + 21, py - 8, 3, 3, F.amber, 6, 3); cellsL(px + 21, py, 3, 3, F.amber, 6, 3); }
      unit(img, 'goat', 2, ox, oy, 5.2 * TILE, 5.6 * TILE, Z);
      engine(img, 0, 1, ox, oy, 8.9 * TILE, 3.5 * TILE);
      engine(img, 3, 1, ox, oy, 11.2 * TILE, 2.9 * TILE);
      unit(img, 'clubman', 1, ox, oy, 1.6 * TILE, 3.9 * TILE, Z);
      // the steam jet's cells under the open valve
      const [sx, sy] = wp(ox, oy, 3.4, 0.9); for (let k = 0; k < 9; k++) for (let j = -1; j <= 1; j++) cellsL(sx + j * 9 + (k % 2) * 4, sy + 18 + k * 8, 3, 3, k < 5 ? F.steam[3] : F.steam[2], 6, 3, 220 - k * 18);
    },
    lights(ox, oy) { const [fx, fy] = wp(ox, oy, 12.8, 2.0), [lx, ly] = wp(ox, oy, 1.6, 0.9), [bx, by] = wp(ox, oy, 9, 2.6), [ex, ey] = wp(ox, oy, 8.9, 2.4), [v1x, v1y] = wp(ox, oy, 3, 2.4), [gx, gy] = wp(ox, oy, 14.5, 6.6); return [{ x: fx, y: fy, r: 7.5 * TILE * W2P, c: [1.0, 0.55, 0.15], k: 1.3 }, { x: lx, y: ly, r: 6 * TILE * W2P, c: [0.7, 0.55, 0.3], k: 1, sy: TILT }, { x: bx, y: by, r: 4 * TILE * W2P, c: [0.9, 0.5, 0.1], k: 1.2 }, { x: ex, y: ey, r: 2.2 * TILE * W2P, c: [0.8, 0.4, 0.1], k: 0.9 }, { x: v1x, y: v1y, r: 3.5 * TILE * W2P, c: [0.3, 0.42, 0.5], k: 0.9 }, { x: gx, y: gy, r: 2.5 * TILE * W2P, c: [0.5, 0.2, 0.1], k: 0.6 }]; },
    ambient: [0.36, 0.33, 0.38] },
  { name: 'THE PRESS', look: 'bone', sub: 'the closing room mid-stroke: a man against the wall as it moves, the goat rolling the lane, the hatch open behind him, the hammer ahead',
    deco(d, g) {
      // the two long walls are slabs on rams, a tile and a half in already
      const inset = 1.5 * TT; const slab = (y0, y1) => { d.rect(TT, y0, (RW - 2) * TT, y1 - y0, F.iron[2]); d.hl(TT, y0, (RW - 2) * TT, F.iron[4]); d.hl(TT, y1 - 1, (RW - 2) * TT, F.iron[0]); for (let x = TT + 6; x < (RW - 1) * TT; x += 10) d.rivets(x, y0 + 4, x, y1 - 5, 7, F.iron[3], F.iron[0]); };
      slab(TT, TT + inset); slab((RH - 1) * TT - inset, (RH - 1) * TT);
      for (const x of [3 * TT, 6 * TT, 9 * TT, 12 * TT]) for (let yy = -2; yy <= 2; yy++) { const c = yy === -2 ? F.rust[4] : yy === 2 ? F.rust[0] : F.rust[2]; d.vl(x + yy, 12, TT - 12, c); d.vl(x + yy, (RH - 1) * TT, 12, c); }
      at(g, lamp(), 4, 0, 4, 2); at(g, lamp(), 11, 0, 4, 2); at(g, M.tally(), 7, 0, 2, 2);
      at(g, M.hatch(1), 3, 4, 2, -2); at(g, M.hammer(0), 12, 2, 6, 4); at(g, M.bonePile(), 9, 3, 0, 0); at(g, M.lever(0), 1, 5, 4, 0);
      d.rect(12 * TT + 6, 4 * TT + 8, 36, 20, F.iron[1]); d.hl(12 * TT + 6, 4 * TT + 8, 36, F.iron[3]);   // the hammer's plate
      at(g, doorOpen(), 15, 4, -8, -8); d.rect(15 * TT, 4 * TT, TT, 2 * TT, F.coal[0]);
      d.blood(10 * TT, (RH - 1) * TT - inset - 2, 14, 5, 6); d.blood(10 * TT + 20, (RH - 1) * TT - inset - 10, 5, 3, 3);
    },
    play(img, ox, oy) {
      // the tell along both faces, the kill on the man against the far slab
      const [t0x, t0y] = wp(ox, oy, 1, 2.5), [t1x, t1y] = wp(ox, oy, 1, 7.5); cellsL(t0x, t0y - 4, 14 * TILE * W2P, 3, F.amber, 8, 3); cellsL(t1x, t1y - 2, 14 * TILE * W2P, 3, F.amber, 8, 3);
      unit(img, 'clubman', 1, ox, oy, 10.2 * TILE, 7.3 * TILE, Z, { tint: [1.3, 0.6, 0.6] });
      const [kx, ky] = wp(ox, oy, 10.2, 7.3); for (let k = 0; k < 8; k++) fillL(Math.round(kx - 24 + hash(k, 5) % 48), Math.round(ky - 36 + hash(k, 2) % 30), 3, 3, F.blood[3]);
      // a man half into the open hatch: the top of his sprite only
      const a = L.atlasImg('clubman', 0), s = a.k * Z / TX, [hx, hy] = wp(ox, oy, 3.9, 5.2); img.blit(a.im, 0, 0, a.im.w, Math.round(a.im.h * 0.55), Math.round(hx - a.im.w * s / 2), Math.round(hy - a.foot * s), Math.round(a.im.w * s), Math.round(a.im.h * 0.55 * s), true);
      // the goat rolling: his sprite and a smear of pale cells behind him down the lane
      const r = unit(img, 'goat', 6, ox, oy, 7.0 * TILE, 5.0 * TILE, Z); for (let k = 1; k <= 5; k++) cellsL(r.x - 14 - k * 11, r.y - 16 + (k % 2) * 6, 3, 3, F.bone[3], 6, 3, 230 - k * 35);
      unit(img, 'clubman', 4, ox, oy, 13.3 * TILE, 5.0 * TILE, Z); ringL(...wp(ox, oy, 13.1, 5.3), 1.1 * TILE * W2P, F.amber, 22);
      unit(img, 'butcher', 4, ox, oy, 14.6 * TILE, 3.2 * TILE, Z);
    },
    lights(ox, oy) { const [l1x, l1y] = wp(ox, oy, 4.6, 0.9), [l2x, l2y] = wp(ox, oy, 11.6, 0.9), [dx, dy] = wp(ox, oy, 15.5, 5); return [{ x: l1x, y: l1y, r: 7 * TILE * W2P, c: [0.8, 0.65, 0.35], k: 1.1, sy: TILT }, { x: l2x, y: l2y, r: 7 * TILE * W2P, c: [0.8, 0.65, 0.35], k: 1.1, sy: TILT }, { x: dx, y: dy, r: 4 * TILE * W2P, c: [0.35, 0.3, 0.25], k: 0.6 }]; },
    ambient: [0.44, 0.42, 0.40] },
];

const sw = RW * TT * Z, sh = Math.round(RH * TT * Z * TILT), W = pad * 2 + sw, H = pad + SCENES.length * (sh + 56) + 10;
const img = new Img(W, H, '#1a1411');
SCENES.forEach((S, i) => {
  const ox = pad, oy = pad + 30 + i * (sh + 56);
  text(img, S.name, ox, oy - 22, '#e8d8b0', 3); text(img, S.sub, ox, oy + sh + 6, '#a89a80', 2);
  const g = room(S.look, RW, RH, S.deco); layRoom(img, g, ox, oy, Z);
  // the cult and the goat go on before the light, so the light falls on them too
  S.play(img, ox, oy);
  light(img, ox, oy, sw, sh, S.lights(ox, oy), S.ambient, 12);
  for (const f of FX) f(); FX.length = 0;
  // the fog's edge: the room's far corners sink a little, the way a lit room's do under the shade
  motes(img, ox, oy, sw, sh, 70, 11 + i);
});
fs.writeFileSync(__dirname + '/hero.png', img.png());
console.log('hero.png', W, H);
