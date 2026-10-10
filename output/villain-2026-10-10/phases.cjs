// node phases.cjs [zoom] → phases.png: the two the user picked (10 Oct 2026: "I like Humungus"), three options each.
// PHASE ONE, the man: THE WARDEN three ways. PHASE TWO, the monster: THE FLAYED three ways, at x1.6 with the soul in
// him. Each option carries what the fight asks of him (the gun, the board, the things he throws; the witchfire, the
// pull, the open ribs). The strip at the foot sets them at world size by the goat, a clubman and the ogre.
const fs = require('fs');
const C = require('./concepts.cjs');
const { W, H, FOOT, K, TX, R, V, D, leg, arm, bracer, harness, belt, loin, eyes, corruptBody, toImg, atlasImg, hash, OG, Grid, Img, text } = C;
const OL = '#1a1411', cx = 30;
const RLEA = ['#2a0c0e', '#4a1418', '#6e1e22', '#8a2a2c', '#a63c38'];   // red leather, the cult's harness

// ---- shared bodies ----
function humungus(d, T, legsBoot) {
  leg(d, cx - 5, cx - 8, 52, T, 6.5, legsBoot || R.lea); leg(d, cx + 5, cx + 8, 52, T, 6.5, legsBoot || R.lea);
}
function torso(d, T) {
  d.vol(cx, 40, 8.5, 7.5, T); d.vol(cx, 30, 12, 8.5, T);
  d.vl(cx, 31, 10, T[1]); for (const y of [36, 40]) { d.hl(cx - 4, y, 3, T[1]); d.hl(cx + 2, y, 3, T[1]); }
  d.vol(cx - 12, 25, 6, 5.5, T); d.vol(cx + 12, 25, 6, 5.5, T);
}
// the sawn-off: a short double barrel, iron, the stock wood
const gun = (d, x, y, a) => { const dx = Math.cos(a), dy = Math.sin(a); d.bar(x, y, x + dx * 7, y + dy * 7, 2.4, R.iron[2], R.iron[3], R.iron[1]); d.bar(x, y, x - dx * 4, y - dy * 4, 2.8, R.hide[2], R.hide[3], R.hide[1]); d.dot(x + dx * 7, y + dy * 7, R.iron[0]); d.dot(x + dx * 7 + dy, y + dy * 7 - dx, R.iron[0]); };
// the shieldman's board: skulls of beasts riveted on a round of iron
const board = (d, x, y, r) => { d.ell(x, y, r, r * 1.05, R.iron[2]); d.ring(x, y, r, r * 1.05, 1, R.iron[1]); for (const [ox, oy, s] of [[-r * 0.4, -r * 0.3, 2.2], [r * 0.35, -r * 0.2, 1.9], [0, r * 0.45, 2]]) { d.vol(x + ox, y + oy, s, s * 1.1, R.bone); d.dot(x + ox - 0.7, y + oy - 0.3, '#0d0a0c'); d.dot(x + ox + 0.7, y + oy - 0.3, '#0d0a0c'); } for (let a = 0; a < 6.28; a += 0.9) d.dot(x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r * 1.05 - 1), R.iron[4]); };
const ironMask = (d, co) => {
  d.poly([[cx - 5, 10], [cx + 5, 10], [cx + 5.5, 16], [cx + 3, 20], [cx - 3, 20], [cx - 5.5, 16]], R.mask[2]);
  d.tone((x, y) => x > cx + 2 && y > 10, R.mask[1], [R.mask[2]]); d.tone((x, y) => x < cx - 2 && y < 15, R.mask[3], [R.mask[2]]);
  d.hl(cx - 4.5, 12, 3, co ? V.eye : '#0d0a0c'); d.hl(cx + 1.5, 12, 3, co ? V.eye : '#0d0a0c');
  for (const y of [15, 17, 19]) for (const x of [cx - 2.5, cx, cx + 2.5]) if (y < 19 || x === cx) d.dot(x, y, co && y < 19 ? V.glow : R.mask[0]);
};

// ---- PHASE ONE: the man, three ways ----
const MEN = [
  { name: 'A · IRON', sub: 'as drawn: iron mask, X harness, the sawn-off in his belt', draw(d) {
    const T = R.skin; humungus(d, T); loin(d, cx, 47, 9, 8, R.red, true); torso(d, T);
    arm(d, cx - 14, 27, cx - 19, 39, cx - 18, 52, T, 5.5); arm(d, cx + 14, 27, cx + 19, 39, cx + 18, 52, T, 5.5);
    bracer(d, cx - 18, 52, cx - 19, 39, R.lea); bracer(d, cx + 18, 52, cx + 19, 39, R.lea);
    harness(d, cx, 23, 47, R.lea); belt(d, cx, 46, 10, R.lea);
    gun(d, cx + 5, 47, -1.25);                                                                      // the grip up out of the belt
    d.vol(cx, 19, 3.5, 2.5, T); d.vol(cx, 13, 6, 6.5, T); d.hl(cx - 6, 10.5, 12, R.lea[2]); d.hl(cx - 5, 8, 10, R.lea[1]);
    ironMask(d, false);
  } },
  { name: 'B · BONE', sub: 'the mask a sawn goat skull, red leather, the skull board on his arm, the gun slung', draw(d) {
    const T = R.skin; humungus(d, T, R.hide); loin(d, cx, 47, 9, 8, R.lea, true); torso(d, T);
    d.bar(cx - 8, 24, cx + 10, 48, 2.2, R.iron[2], R.iron[3], R.iron[1]); d.bar(cx + 14, 22, cx + 12, 14, 2.6, R.iron[2], R.iron[3], R.iron[1]); d.vol(cx + 12, 13, 1.6, 1.6, R.iron);   // the gun's strap, its barrels over the shoulder
    arm(d, cx - 14, 27, cx - 19, 39, cx - 18, 50, T, 5.5); arm(d, cx + 14, 27, cx + 19, 39, cx + 18, 52, T, 5.5);
    bracer(d, cx + 18, 52, cx + 19, 39, R.lea);
    d.bar(cx - 9, 23, cx + 6, 47, 2.6, RLEA[2], RLEA[3], RLEA[1]); d.bar(cx + 9, 23, cx - 6, 47, 2.6, RLEA[2], RLEA[3], RLEA[1]);
    for (let t = 0.12; t < 0.95; t += 0.18) { d.dot(cx - 9 + 15 * t, 23 + 24 * t, R.bone[3]); d.dot(cx + 9 - 15 * t, 23 + 24 * t, R.bone[3]); }   // studs of bone
    d.ring(cx, 37.4, 2.6, 2.6, 1.1, R.bone[2]); belt(d, cx, 46, 10, RLEA);
    board(d, cx - 20, 44, 6.5);
    d.vol(cx, 19, 3.5, 2.5, T); d.vol(cx, 13, 6, 6.5, T); d.hl(cx - 6, 10.5, 12, RLEA[2]);
    d.poly([[cx - 5, 9], [cx + 5, 9], [cx + 5, 15], [cx + 2.5, 20.5], [cx - 2.5, 20.5], [cx - 5, 15]], R.bone[2]);            // the skull's face plate
    d.tone((x, y) => x > cx + 2 && y > 9, R.bone[1], [R.bone[2]]); d.tone((x, y) => x < cx - 2 && y < 14, R.bone[3], [R.bone[2]]);
    d.dot(cx - 2.5, 12.5, '#0d0a0c', 1.8); d.dot(cx + 2.5, 12.5, '#0d0a0c', 1.8); d.dot(cx, 16, R.bone[0]); d.hl(cx - 2, 19, 5, R.bone[0]); for (const x of [cx - 1.5, cx, cx + 1.5]) d.vl(x, 18, 1.5, R.bone[4]);
    d.vl(cx, 9.5, 3, R.red[3]); d.hl(cx - 1.5, 10.5, 4, R.red[3]);                                                            // the cult's sign painted on the brow
    d.bar(cx - 4, 9, cx - 6, 5, 1.8, R.bone[2], R.bone[3], R.bone[1]); d.bar(cx + 4, 9, cx + 6, 5, 1.8, R.bone[2], R.bone[3], R.bone[1]);   // the skull's own horns, sawn short
  } },
  { name: 'C · WAR', sub: 'a full helm with a red crest, a spiked shoulder, a bandolier of shells, chains, a hook', draw(d) {
    const T = R.tan; humungus(d, T); loin(d, cx, 47, 9, 8, R.lea, false); torso(d, T);
    arm(d, cx - 14, 27, cx - 19, 39, cx - 18, 52, T, 5.5); arm(d, cx + 14, 27, cx + 19, 39, cx + 18, 52, T, 5.5);
    bracer(d, cx - 18, 52, cx - 19, 39, R.iron); bracer(d, cx + 18, 52, cx + 19, 39, R.iron);
    d.bar(cx - 9, 23, cx + 7, 48, 3, R.lea[2], R.lea[3], R.lea[1]); for (let t = 0.1; t < 0.95; t += 0.11) d.dot(cx - 9 + 16 * t, 23 + 25 * t, R.gold[3], 1.2);   // the bandolier, brass shells along it
    belt(d, cx, 46, 10, R.lea);
    for (const x of [cx - 7, cx - 4]) { d.vl(x, 48, 8, R.iron[2]); d.dot(x, 56, R.iron[3]); }                                 // chains off the belt
    d.vl(cx + 7, 48, 5, R.iron[2]); d.dot(cx + 7, 53, R.iron[3]); d.dot(cx + 8, 54, R.iron[3]); d.dot(cx + 9, 53, R.iron[3]);   // the hook
    gun(d, cx + 11, 50, 1.2);                                                                       // the gun in a holster on the hip
    d.vol(cx - 13, 24, 7, 6, R.iron); for (const [x, y] of [[cx - 18, 20], [cx - 14, 18], [cx - 10, 19]]) d.bar(x, y + 2, x, y - 2, 1.6, R.iron[3], R.iron[4], R.iron[1]);   // the spiked pauldron
    d.vol(cx, 19, 3.5, 2.5, T);
    d.vol(cx, 13, 6.2, 6.8, R.iron); d.tone((x, y) => x < cx - 2 && y < 14, R.iron[3], [R.iron[2]]);                           // the helm, the whole head in iron
    d.hl(cx - 4.5, 13, 9, '#0d0a0c'); d.dot(cx - 2.5, 13, '#f0a832'); d.dot(cx + 2.5, 13, '#f0a832');                           // one slit, his eyes in it
    for (const y of [16, 18]) d.hl(cx - 3, y, 7, R.iron[0]); d.dot(cx - 5.5, 15, R.iron[4]); d.dot(cx + 5.5, 15, R.iron[4]);
    for (let x = cx - 1; x <= cx + 1; x++) d.vl(x, 4, 4.5, R.red[3]); d.vl(cx, 3, 1, R.red[4]); d.hl(cx - 2, 7, 5, R.red[2]);   // the crest
  } },
];

// ---- PHASE TWO: the monster, three ways (k = K) ----
const flayedBody = (d, T) => {
  humungus(d, T); loin(d, cx, 47, 9, 7, R.lea); torso(d, T);
  arm(d, cx - 14, 27, cx - 19, 39, cx - 18, 52, T, 5.5); arm(d, cx + 14, 27, cx + 19, 39, cx + 18, 52, T, 5.5);
  d.speck((x, y) => true, T, 26, T[0]); d.speck((x, y) => true, T, 9, R.sinew[2]);
  for (const [x, y] of [[cx - 14, 27], [cx + 14, 27], [cx - 19, 39], [cx + 19, 39], [cx - 5, 52], [cx + 5, 52]]) d.ell(x, y, 1.8, 1.4, R.sinew[3], true);
  for (const y of [27, 30, 33]) { d.hl(cx - 6, y, 4, R.sinew[1], true); d.hl(cx + 3, y, 4, R.sinew[1], true); }
};
const flayedHead = (d, T) => { d.vol(cx, 19, 3.5, 2.5, T); d.vol(cx, 13, 6, 6.5, T); d.speck((x, y) => y < 20, T, 20, T[0]); };
const witchfire = (d, x, y, r) => { for (let i = 0; i < 14; i++) { const a = hash(i, Math.round(x)) / 100 * 6.28, rr = r * (0.5 + hash(i + 7, Math.round(y)) / 200); d.dot(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8 - r * 0.3, i % 3 ? V.glow : V.hot, i % 4 ? 1 : 1.6); } };
const MONSTERS = [
  { name: 'A · CAGE', sub: 'as drawn: the meat, the iron cage, the soul through the ribs', draw(d) {
    const T = R.meat; flayedBody(d, T); harness(d, cx, 23, 47, R.lea, R.sinew[4]); belt(d, cx, 46, 10, R.lea); flayedHead(d, T);
    eyes(d, cx, 13, V.eye, 2.5); d.hl(cx - 3, 18, 7, R.sinew[4]); for (let x = cx - 3; x <= cx + 3; x += 1.5) d.vl(x, 17, 2, T[0]);
    for (const y of [9, 13, 17]) d.hl(cx - 6, y, 13, R.iron[3]); for (const x of [cx - 6, cx - 2, cx + 2, cx + 6]) d.vl(x, 7, 13, R.iron[2]);
    corruptBody(d, cx, 31, T, (x, y) => y > 20); d.speck((x, y) => true, R.sinew, 30, V.glow);
  } },
  { name: 'B · MASK', sub: 'the man\'s own mask still on, too small now, sunk into the meat; the sign carved in, runes down the arms, witchfire in his hands', draw(d) {
    const T = R.meat; flayedBody(d, T); harness(d, cx, 23, 47, R.lea, R.sinew[4]); belt(d, cx, 46, 10, R.lea); flayedHead(d, T);
    d.vol(cx, 13.5, 7, 7, T); d.speck((x, y) => y < 21, T, 24, T[0]);                                         // the head swollen round the mask
    d.poly([[cx - 4, 11], [cx + 4, 11], [cx + 4.5, 15.5], [cx + 2.5, 19], [cx - 2.5, 19], [cx - 4.5, 15.5]], R.mask[2]); d.tone((x, y) => x > cx + 1.5 && y > 11, R.mask[1], [R.mask[2]]);
    d.hl(cx - 3.5, 13, 2.5, V.eye); d.hl(cx + 1.5, 13, 2.5, V.eye); for (const y of [15.5, 17.5]) for (const x of [cx - 1.8, cx + 1.8]) d.dot(x, y, V.glow);
    d.line(cx + 1, 11, cx + 3, 18.5, V.vein, true); d.line(cx - 3, 11, cx - 4, 15, R.mask[0], true);           // cracked both ways
    d.speck((x, y) => y > 8 && y < 21 && Math.abs(x - cx) > 3.5, R.mask, 40, T[1]);                           // the meat grown over its edges
    d.vl(cx, 30, 5, V.hot); d.hl(cx - 2, 32, 5, V.hot); d.dot(cx - 2, 29, V.glow); d.dot(cx + 2, 29, V.glow); d.hl(cx - 1, 35, 3, V.glow);   // the sign carved in the chest, lit
    for (const s of [-1, 1]) for (let t = 0.1; t < 0.9; t += 0.16) d.dot(cx + s * (14 + 5 * t), 27 + 12 * t, t > 0.5 ? V.hot : V.glow, 1.3);   // runes down each upper arm
    witchfire(d, cx - 18, 52, 6); witchfire(d, cx + 18, 52, 6);
    corruptBody(d, cx, 40, T, (x, y) => y > 20);
  } },
  { name: 'C · HIDE', sub: 'his own skin hung off his back for a cape, its face a hood; hooks through the shoulders; the ribs opened like doors on the soul', draw(d) {
    const T = R.meat, Sk = R.skin;
    // the skin behind him: a cape to the knees, the arms of it hanging loose, the hands at the ends
    d.poly([[cx - 14, 23], [cx + 14, 23], [cx + 15, 44], [cx + 10, 58], [cx - 10, 58], [cx - 15, 44]], Sk[1]); d.tone((x, y) => x < cx - 6 && y < 40, Sk[2], [Sk[1]]);
    d.speck((x, y) => y > 22 && y < 60, Sk, 14, Sk[0]); d.speck((x, y) => y > 22 && y < 60, Sk, 6, R.meat[1]);
    for (const s of [-1, 1]) { d.limb(cx + s * 15, 25, cx + s * 21, 42, 2.6, Sk); d.vol(cx + s * 21, 44, 1.8, 1.6, Sk); for (let f = -1; f <= 1; f++) d.vl(cx + s * 21 + f * 0.9, 45, 2, Sk[0]); }   // its arms hang off his shoulders, the hands empty
    flayedBody(d, T); belt(d, cx, 46, 10, R.lea);
    for (const s of [-1, 1]) { d.bar(cx + s * 12, 20, cx + s * 12, 27, 1.8, R.iron[3], R.iron[4], R.iron[1]); d.dot(cx + s * 12, 19, R.iron[3]); d.dot(cx + s * 13, 18, R.iron[3]); d.vl(cx + s * 12, 27, 7, R.iron[2]); }   // hooks through the shoulders, chains off them
    // the ribs opened: two doors of bone, the soul between them
    d.rect(cx - 7, 27, 14, 10, '#1a0608'); d.ell(cx, 32, 4, 3.4, V.glow); d.ell(cx, 32, 2, 1.6, V.hot); d.ring(cx, 32, 5.5, 4.6, 1, V.vein);
    for (const s of [-1, 1]) { d.poly([[cx + s * 7, 26], [cx + s * 12, 24], [cx + s * 13, 36], [cx + s * 7, 38]], R.bone[2]); for (const y of [27, 30, 33, 36]) d.hl(cx + s * 7 + (s < 0 ? -5 : 0), y, 5, R.bone[0]); }
    d.speck((x, y) => y > 24 && y < 38 && Math.abs(x - cx) > 7 && Math.abs(x - cx) < 13, R.bone, 30, R.meat[1]);
    flayedHead(d, T);
    d.vol(cx, 10.5, 7, 5, Sk, (x, y) => y <= 12.5); d.vol(cx - 6.5, 14, 1.6, 4, Sk); d.vol(cx + 6.5, 14, 1.6, 4, Sk);                     // the scalp as a hood, its sides down past his ears
    d.speck((x, y) => y < 19, Sk, 14, Sk[0]);
    eyes(d, cx, 13.5, V.eye, 2.5); d.hl(cx - 3, 18, 7, R.sinew[4]); for (let x = cx - 3; x <= cx + 3; x += 1.5) d.vl(x, 17, 2, T[0]);          // his red face in the hood, lidless, no lips
    d.poly([[cx - 4, 19.5], [cx + 4, 19.5], [cx + 3.5, 26], [cx, 28], [cx - 3.5, 26]], Sk[1]); d.tone((x, y) => x > cx + 1 && y > 19, Sk[0], [Sk[1]]);   // his old face hangs slack under the chin
    d.dot(cx - 1.8, 22, '#0d0a0c', 1.4); d.dot(cx + 1.8, 22, '#0d0a0c', 1.4); d.hl(cx - 1.5, 25, 4, Sk[0]); d.hl(cx - 6, 12, 12, R.lea[1]);   // its empty eyes, its mouth, the strap that holds it on
    for (const s of [-1, 1]) { d.vl(cx + s * 18, 48, 8, R.iron[2]); d.dot(cx + s * 18, 56, R.iron[3]); d.dot(cx + s * 19, 57, R.iron[3]); d.dot(cx + s * 20, 56, R.iron[3]); }   // the butcher's hooks in his hands
    d.speck((x, y) => y > 20, T, 11, V.vein);
  } },
];

const sprite = (look, k) => { const g = new Grid(Math.round(W * k), Math.round(H * k)); look.draw(new D(g, k)); g.outline(OL); g.clean(OL); return g; };
const Z = +(process.argv[2] || 4), pad = 16, S = 3;
const manW = W * Z + pad, monW = Math.round(W * K * Z) + pad, rowH = Math.round(H * K * Z) + 70, manRowH = H * Z + 110;
let stripW = pad; const add = (pw, k) => { stripW += Math.round(pw * k * S) + pad; };
add(C.W * 0 + 85, 34 / 112); add(96, 36 / 112); for (let i = 0; i < 3; i++) add(W, TX); add(OG.W, 1.4); for (let i = 0; i < 3; i++) add(W * K, TX);
const img = new Img(Math.max(stripW + pad, pad + 3 * monW + 40), pad + manRowH + rowH + 40 + Math.round(H * K * TX * S) + 110, '#2b2622');
const legend = (L, x, y) => { text(img, L.name, x, y, '#e8d8b0', 2); text(img, L.sub, x + 90, y, '#a89a80', 2); };
text(img, 'PHASE ONE · THE MAN: THE WARDEN three ways', pad, 6, '#e8d8b0', 3);
MEN.forEach((L, i) => { const g = sprite(L, 1), x = pad + i * monW, y = 40; img.blit(toImg(g), 0, 0, g.w, g.h, x, y, g.w * Z, g.h * Z); text(img, L.name, x, y + g.h * Z + 6, '#e8d8b0', 2); img.fill(x, y + g.h * Z, g.w * Z, 1, '#5a4d40'); legend(L, pad, 40 + g.h * Z + 24 + i * 14); });
const y2 = pad + manRowH + 10;
text(img, 'PHASE TWO · THE MONSTER: THE FLAYED three ways (x' + K + ')', pad, y2, '#e8d8b0', 3);
MONSTERS.forEach((L, i) => { const g = sprite(L, K), x = pad + i * monW, y = y2 + 36; img.blit(toImg(g), 0, 0, g.w, g.h, x, y, g.w * Z, g.h * Z); text(img, L.name, x, y + g.h * Z + 6, '#e8d8b0', 2); img.fill(x, y + g.h * Z, g.w * Z, 1, '#5a4d40'); legend(L, pad, y2 + 36 + g.h * Z + 24 + i * 14); });
// the strip
const y0 = img.h - 40; let x = pad;
text(img, 'AT WORLD SIZE: goat, clubman, the three men, the ogre, the three monsters', pad, y0 - Math.round(H * K * TX * S) - 30, '#e8d8b0', 2);
const put = (im, k, foot, label) => { const w = Math.round(im.w * k * S), h = Math.round(im.h * k * S); img.blit(im, 0, 0, im.w, im.h, x, Math.round(y0 - foot * k * S), w, h, true); text(img, label, x, y0 + 6, '#d8ccb0', 2); x += w + pad; };
let a = atlasImg('goat', 7); put(a.im, a.k, a.foot, 'goat'); a = atlasImg('clubman', 0); put(a.im, a.k, a.foot, 'man');
MEN.forEach((L, i) => put(toImg(sprite(L, 1)), TX, FOOT + 1, 'ABC'[i]));
const og = OG.sprite(0, 'idle', 0); put(toImg(og.g), 1.4, OG.FOOT, 'ogre');
MONSTERS.forEach((L, i) => put(toImg(sprite(L, K)), TX, (FOOT + 1) * K, 'ABC'[i] + '*'));
img.fill(pad, y0, x - pad, 1, '#5a4d40');
fs.writeFileSync(__dirname + '/phases.png', img.png()); console.log('phases.png', img.w, img.h);
