// node line.cjs [zoom] → line.png: THE LINE, the floor's spine. The cult's works is a slaughter line, and the floor is its
// eight stations in order: the goat lands at the far end (the ovens) and runs the line BACKWARDS, up through the rendering
// house, the saw, the scalding tanks, the bleeding room, the stunning box and the pens, to the loading dock, where the
// trucks of the prologue stand and the way out is the dock gate. Each station a small lit room with its machine. Concept art only.
const L = require('./lib.cjs'), M = require('./machines.cjs'), E = require('./enemy.cjs');
const { fs, Img, text, Grid, F, D, TX, TT, TILE, TILT, OL, hash, toImg, LOOKS, room, shadow, light, motes, cellsPx, layRoom, unit } = L;

const Z = +(process.argv[2] || 2), RW = 8, RH = 6, pad = 14, W2P = Z / TX;
const at = (g, mg, tx, ty, dx = 0, dy = 0) => g.blit(mg, Math.round(tx * TT + dx), Math.round(ty * TT + dy));
const wp = (ox, oy, tx, ty) => [ox + tx * TILE * W2P, oy + ty * TILE * W2P * TILT];
const lampG = () => { const g = new Grid(14, 20), d = new D(g); d.rect(6, 0, 2, 4, F.iron[2]); d.rect(2, 4, 10, 12, F.iron[1]); d.rect(3, 5, 8, 10, F.fire[2]); d.rect(5, 7, 4, 6, F.fire[3]); for (let x = 3; x < 11; x += 2) d.vl(x, 5, 10, F.iron[2]); d.hl(2, 4, 10, F.iron[3]); return g.outline(OL); };
const lampLight = (ox, oy, tx) => { const [x, y] = wp(ox, oy, tx, 0.9); return { x, y, r: 5.5 * TILE * W2P, c: [0.75, 0.6, 0.3], k: 1.1, sy: TILT }; };
const engine = (img, look, state, ox, oy, wx, wy, k = 1) => { const g = E.sprite(E.LOOKS[look], state), s = E.TX * W2P * k, w = Math.round(g.w * s), h = Math.round(g.h * s), px = ox + wx * W2P, py = oy + wy * W2P * TILT; shadow(img, px, py + 2, w * 0.4, w * 0.16, 0.5); img.blit(toImg(g), 0, 0, g.w, g.h, Math.round(px - w / 2), Math.round(py - (E.FOOT + 1) * s), w, h, true); };
// the truck of the prologue at the dock, from above: a cab, a flatbed with the cage on it, wheels
function truck() {
  const g = new Grid(70, 34), d = new D(g);
  d.rect(2, 6, 18, 22, F.rust[2]); d.rect(4, 8, 14, 8, F.glass[1]); d.hl(4, 8, 14, F.glass[3]); d.rect(2, 6, 18, 2, F.rust[3]); d.rect(0, 10, 2, 14, F.iron[1]);   // the cab, its windscreen, the bumper
  d.rect(20, 4, 48, 26, F.timber[2]); for (let x = 22; x < 68; x += 6) d.vl(x, 4, 26, F.timber[1]); d.hl(20, 4, 48, F.timber[3]); d.hl(20, 29, 48, F.timber[0]);   // the flatbed
  d.rect(26, 7, 36, 20, F.coal[1]); for (let x = 27; x < 62; x += 4) d.vl(x, 7, 20, F.iron[3]); for (let y = 8; y < 27; y += 5) d.hl(26, y, 36, F.iron[3]);   // the cage, empty
  for (const [x, y] of [[6, 2], [6, 29], [40, 2], [40, 29], [58, 2], [58, 29]]) { d.rect(x, y, 8, 3, F.coal[0]); d.hl(x + 1, y + 1, 6, F.coal[2]); }   // the wheels
  d.dot(1, 12, F.fire[3]); d.dot(1, 22, F.fire[3]);
  return g.outline(OL);
}

const STATIONS = [
  { n: 1, name: 'THE OVENS', look: 'bone', say: 'he lands here, at the end of the line: bone meal, the press, the furnaces; the hottest room on the floor',
    deco(d, g) { at(g, M.furnace(1), 2, 0, 0, -4); at(g, M.furnace(0), 5, 0, 0, -4); at(g, M.press(1), 2, 2, 0, 4); at(g, M.bonePile(), 1, 4, 0, 6); at(g, M.lever(0), 6, 4, 0, 0); at(g, lampG(), 4, 0, 6, 2); },
    play(img, ox, oy) { unit(img, 'goat', 7, ox, oy, 1.6 * TILE, 4.6 * TILE, Z); unit(img, 'clubman', 6, ox, oy, 6.2 * TILE, 2.9 * TILE, Z); },
    lights(ox, oy) { const [f1x, f1y] = wp(ox, oy, 2.7, 1), [f2x, f2y] = wp(ox, oy, 5.7, 1); return [{ x: f1x, y: f1y, r: 5 * TILE * W2P, c: [1, 0.5, 0.12], k: 1.3 }, { x: f2x, y: f2y, r: 2.5 * TILE * W2P, c: [0.6, 0.25, 0.05], k: 0.7 }, lampLight(ox, oy, 4.3)]; }, amb: [0.36, 0.32, 0.34] },
  { n: 2, name: 'THE RENDERING HOUSE', look: 'render', say: 'the grinder and the vats; the belt that fed them runs the other way now, and so does he',
    deco(d, g) { at(g, M.vat(1), 1, 1, 4, 4); at(g, M.grinder(0), 5, 1, 6, -2); for (let k = 0; k < 2; k++) at(g, M.conveyor(k), 1 + k * 2, 4); at(g, M.steamValve(1), 2, 0, 0, 14); at(g, lampG(), 6, 0, 4, 2); },
    play(img, ox, oy) { engine(img, 0, 1, ox, oy, 4.6 * TILE, 3.3 * TILE); unit(img, 'clubman', 2, ox, oy, 2.4 * TILE, 4.7 * TILE, Z, { lying: 'cw' }); },
    lights(ox, oy) { const [sx, sy] = wp(ox, oy, 4.6, 2.4), [vx, vy] = wp(ox, oy, 2, 1.6); return [{ x: sx, y: sy, r: 3.5 * TILE * W2P, c: [0.9, 0.45, 0.1], k: 1.1 }, { x: vx, y: vy, r: 3 * TILE * W2P, c: [0.3, 0.42, 0.5], k: 0.9 }, lampLight(ox, oy, 6.3)]; }, amb: [0.36, 0.33, 0.38] },
  { n: 3, name: 'THE SPLITTING ROOM', look: 'bone', say: 'the saw lane across the one way through; a hound on the far side of it, waiting for the blade to pass',
    deco(d, g) { d.rect(4 * TT + 10, 1 * TT, 4, 4 * TT, F.coal[0]); d.vl(4 * TT + 9, 1 * TT, 4 * TT, F.iron[3]); at(g, M.saw(1), 4, 2, -12, -4); at(g, M.hookRail(1), 1, 0, 4, 4); at(g, M.barrow(), 6, 4, -4, 0); at(g, lampG(), 2, 0, 6, 2); at(g, lampG(), 6, 0, 2, 2); },
    play(img, ox, oy) { unit(img, 'hound', 4, ox, oy, 6.2 * TILE, 3.2 * TILE, Z); unit(img, 'goat', 6, ox, oy, 2.4 * TILE, 3.6 * TILE, Z); },
    post(img, ox, oy) { const [x, y] = wp(ox, oy, 4.3, 1.1); for (let k = 0; k < 5; k++) cellsPx(img, x, y + k * 9, 3, 3, F.amber, 6, 3); },
    lights(ox, oy) { return [lampLight(ox, oy, 2.3), lampLight(ox, oy, 6.3)]; }, amb: [0.42, 0.40, 0.40] },
  { n: 4, name: 'THE SCALDING TANKS', look: 'render', say: 'four tanks and the steam main over them; the one room where the cult cannot use fire, and he can use the steam',
    deco(d, g) { at(g, M.vat(0), 1, 1, 4, 2); at(g, M.vat(1), 4, 1, 6, 0); at(g, M.vat(1), 1, 3, 8, 6); at(g, M.vat(0), 5, 3, 2, 4); at(g, M.steamValve(2), 3, 0, 0, 14); at(g, M.whistle(0), 7, 0, -2, -4); },
    play(img, ox, oy) { unit(img, 'mage', 4, ox, oy, 6.4 * TILE, 2.3 * TILE, Z); engine(img, 3, 0, ox, oy, 4.2 * TILE, 4.6 * TILE, 0.9); },
    lights(ox, oy) { const [ax, ay] = wp(ox, oy, 2, 2), [bx, by] = wp(ox, oy, 5.5, 4); return [{ x: ax, y: ay, r: 3.5 * TILE * W2P, c: [0.35, 0.5, 0.6], k: 1 }, { x: bx, y: by, r: 3.5 * TILE * W2P, c: [0.35, 0.5, 0.6], k: 1 }, { x: wp(ox, oy, 3.4, 0.9)[0], y: wp(ox, oy, 3.4, 0.9)[1], r: 3 * TILE * W2P, c: [0.5, 0.55, 0.6], k: 1, sy: TILT }]; }, amb: [0.34, 0.36, 0.42] },
  { n: 5, name: 'THE BLEEDING ROOM', look: 'kill', say: 'white tile, the gutters, the hook line going round; the floor turns cold and bright from here on',
    deco(d, g) { for (let tx = 1; tx < RW - 1; tx++) LOOKS.kill.gutter(d, tx * TT, 3 * TT, false); at(g, M.drain(), 4, 3); at(g, M.tally(), 5, 0, 4, 2); at(g, lampG(), 2, 0, 6, 2);
      const y = 1 * TT + 4; d.rect(TT, y, (RW - 2) * TT, 4, F.iron[2]); d.hl(TT, y, (RW - 2) * TT, F.iron[4]); for (const [tx, v] of [[2, 1], [4, 2], [6, 1]]) { const m = M.hookRail(v), c = new Grid(m.w, m.h); for (let yy = 6; yy < m.h; yy++) for (let xx = 18; xx < m.w; xx++) if (m.get(xx, yy)) c.set(xx, yy, m.get(xx, yy)); g.blit(c, Math.round(tx * TT) - 27, y - 6); } },
    play(img, ox, oy) { unit(img, 'butcher', 4, ox, oy, 6 * TILE, 4.2 * TILE, Z); unit(img, 'clubman', 0, ox, oy, 2 * TILE, 4.4 * TILE, Z); },
    lights(ox, oy) { return [lampLight(ox, oy, 2.3), { x: wp(ox, oy, 6, 0.9)[0], y: wp(ox, oy, 6, 0.9)[1], r: 5 * TILE * W2P, c: [0.6, 0.6, 0.65], k: 1, sy: TILT }]; }, amb: [0.42, 0.44, 0.52] },
  { n: 6, name: 'THE STUNNING BOX', look: 'kill', say: 'the knocking pen: the hammer over the one lane, gates either side of it; cross between the beats',
    deco(d, g) { at(g, M.hammer(1), 3, 0, 4, 6); d.rect(2 * TT, 1 * TT, 10, 4 * TT, F.iron[1]); d.rect(6 * TT - 10, 1 * TT, 10, 4 * TT, F.iron[1]); at(g, M.gate(1), 1, 3, 0, -6); at(g, M.gate(0), 6, 2, 0, 0); at(g, lampG(), 1, 0, 4, 2); at(g, lampG(), 6, 0, 6, 2); },
    play(img, ox, oy) { unit(img, 'hunter', 3, ox, oy, 6.8 * TILE, 3.9 * TILE, Z); unit(img, 'goat', 6, ox, oy, 1.8 * TILE, 4.4 * TILE, Z); },
    lights(ox, oy) { return [lampLight(ox, oy, 1.3), lampLight(ox, oy, 6.5)]; }, amb: [0.42, 0.44, 0.52] },
  { n: 7, name: 'THE PENS', look: 'kill', say: 'cages to the walls and the sorting gates between: the animals waiting, and the run\'s escort shut in among them',
    deco(d, g) { at(g, M.cages(), 1, 0, 0, 10); at(g, M.cages(), 6, 0, -2, 10); at(g, M.cages(), 1, 3, 0, 4); at(g, M.gate(0), 3, 1, 0, 4); at(g, M.gate(1), 4, 3, 0, -2); at(g, M.scale(), 6, 3, 4, -4); at(g, lampG(), 4, 0, 0, 2); },
    play(img, ox, oy) { unit(img, 'clubman', 0, ox, oy, 4.4 * TILE, 4.6 * TILE, Z); unit(img, 'clubman', 2, ox, oy, 6 * TILE, 2.2 * TILE, Z); },
    lights(ox, oy) { return [lampLight(ox, oy, 4.1)]; }, amb: [0.44, 0.45, 0.52] },
  { n: 8, name: 'THE LOADING DOCK', look: 'kill', say: 'the trucks of the prologue at the dock, the gate the way out, and the floor\'s last man standing in it with a bull\'s soul in his boiler',
    deco(d, g) { at(g, truck(), 4, 0, 4, 4); d.rect(1 * TT, 3 * TT + 10, 6 * TT, 6, F.iron[2]); d.hl(1 * TT, 3 * TT + 10, 6 * TT, F.iron[4]); d.rect(1 * TT, 3 * TT + 16, 6 * TT, 2, F.iron[0]);   // the dock's lip
      d.rect(1 * TT, 1 * TT, 3 * TT, 2 * TT + 10, F.coal[0]); for (let y = 1 * TT + 2; y < 3 * TT + 10; y += 5) d.hl(1 * TT + 2, y, 3 * TT - 4, F.coal[2]);   // the open night past the dock, the yard
      at(g, M.winch(), 6, 4, 4, 0); at(g, lampG(), 7, 0, 0, 2); },
    play(img, ox, oy) { engine(img, 2, 1, ox, oy, 4 * TILE, 4.9 * TILE, 1.25); },
    post(img, ox, oy) { const [x, y] = wp(ox, oy, 2.5, 1.2); for (let k = 0; k < 10; k++) cellsPx(img, x - 40 + hash(k, 3) % 80, y - 10 + hash(k, 7) % 40, 2, 2, F.steam[3], 6, 2, 150); },
    lights(ox, oy) { const [nx, ny] = wp(ox, oy, 2.5, 1.5), [bx, by] = wp(ox, oy, 4, 3.9); return [{ x: nx, y: ny, r: 4 * TILE * W2P, c: [0.3, 0.4, 0.6], k: 1.1 }, { x: bx, y: by, r: 3 * TILE * W2P, c: [0.9, 0.45, 0.1], k: 1.1 }, lampLight(ox, oy, 7.1)]; }, amb: [0.34, 0.36, 0.46] },
];

const cw = RW * TT * Z, ch = Math.round(RH * TT * Z * TILT), cols = 4, rows = 2, capH = 40;
const W = pad + cols * (cw + pad), H = pad + 44 + rows * (ch + 22 + capH + pad);
const img = new Img(W, H, '#1a1411');
text(img, 'THE LINE  ·  the floor is the cult\'s slaughter line, and he runs it backwards: from the ovens to the loading dock', pad, 10, '#e8d8b0', 2);
text(img, 'a middle gate (the mouse) between 4 and 5; the escort\'s cage in 7; the way out is the dock gate in 8', pad, 26, '#a89a80', 2);
const wrap = (s, n = 42) => { const out = []; for (const w of s.split(' ')) { if (out.length && (out[out.length - 1] + ' ' + w).length <= n) out[out.length - 1] += ' ' + w; else out.push(w); } return out; };
STATIONS.forEach((S, i) => {
  const ox = pad + (i % cols) * (cw + pad), oy = pad + 44 + 18 + Math.floor(i / cols) * (ch + 22 + capH + pad);
  text(img, S.n + '  ' + S.name, ox, oy - 16, '#e8d8b0', 2);
  const g = room(S.look, RW, RH, S.deco); layRoom(img, g, ox, oy, Z);
  S.play(img, ox, oy); light(img, ox, oy, cw, ch, S.lights(ox, oy), S.amb, 12); if (S.post) S.post(img, ox, oy); motes(img, ox, oy, cw, ch, 30, 5 + i);
  // the belt between stations, the line itself, drawn as a strip under the caption
  wrap(S.say, 41).forEach((line, k) => text(img, line, ox, oy + ch + 6 + k * 12, '#c8b898', 2));
  if (i % cols < cols - 1) { const y = oy + ch / 2; img.fill(ox + cw, y - 3, pad, 6, '#3a2e26'); img.fill(ox + cw, y - 1, pad, 2, '#8a6a3a'); }
});
fs.writeFileSync(__dirname + '/line.png', img.png());
console.log('line.png', W, H);
