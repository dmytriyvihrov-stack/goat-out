// node concepts.cjs [zoom] → sheet.png: seven looks for THE THROWER (3 Oct 2026, the user's: "an enemy who
// throws things, men and the goat too, one arm much bigger than the other, half bigfoot or a dwarf").
// Each look in three poses (standing, a crate overhead, a clubman overhead), front view, on the game's
// Grid, outlined like every unit; the last row sets them at world size beside the shieldman and the ogre.
// Concept art only: nothing in js/ loads this.
const fs = require('fs'), { Img, text } = require('../pixel-claude-2026-09-24/png.cjs');
const { Grid } = require('../../js/prop-pixels.js');
const SP = require('../../js/spartan-pixels.js'), OG = require('../../js/ogre-pixels.js');

const W = 52, H = 68, FOOT = 66, OL = '#1a1411';
const R = {
  fur: ['#24160f', '#432a1b', '#644027', '#875a36', '#a8794c'],
  skin: ['#5a3222', '#8a5236', '#b87a54', '#d89c70', '#f0c49a'],
  pale: ['#4a3438', '#76585c', '#a2817f', '#c4a39b', '#e2c7bb'],
  graft: ['#232c1c', '#38452a', '#51633b', '#6c814f', '#8ca36a'],
  troll: ['#1f2526', '#343f3f', '#4d5b58', '#6a7a73', '#8b9c91'],
  ape: ['#17151a', '#28242c', '#3c3642', '#544c59', '#706776'],
  red: ['#440f13', '#6e191d', '#9c2528', '#c23d36', '#dc6048'],
  iron: ['#1e1e24', '#303038', '#51505b', '#878692', '#b4b3bd'],
  bone: ['#6e6650', '#8c8166', '#c6ba98', '#ebe1c4', '#fff7e2'],
  lea: ['#2a170c', '#46280f', '#653a17', '#86512a', '#a46c3c'],
  beard: ['#3c3a36', '#5e5b55', '#85817a', '#aaa59c', '#d0cbc1'],
  moss: ['#1c2a14', '#2c4320', '#40602c', '#5a7e3a', '#78a04c'],
};
const lit = (T, dx, dy, n) => { const l = -(dx * 0.55 + dy * 0.83); return n > 0.82 && l < -0.45 ? T[0] : n > 0.55 && l < -0.2 ? T[1] : n > 0.72 && l > 0.55 ? T[4] : n > 0.4 && l > 0.3 ? T[3] : T[2]; };
const vol = (g, cx, cy, rx, ry, T, test) => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, n = Math.hypot(dx, dy);
    if (n > 1 || (test && !test(x, y))) continue; g.set(x, y, lit(T, dx, dy, n));
  }
};
const limb = (g, x0, y0, x1, y1, t, T) => g.bar(x0, y0, x1, y1, t, T[2], T[3], T[1]);
const hash = (x, y) => ((Math.imul(x + 5, 73856093) ^ Math.imul(y + 3, 19349663)) >>> 0) % 100;
// fur as short leaning strokes over a ramp, so it reads as hair and not dirt
const shag = (g, T, x0, y0, x1, y1, n, c1, c2) => {
  for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x++) {
    if (hash(x, y) >= n || !T.includes(g.get(x, y)) || !T.includes(g.get(x, y + 1))) continue;
    g.set(x, y, c1); g.set(x, y + 1, c2);
  }
};
const leg = (g, hx, fx, top, T, w, foot) => { limb(g, hx, top, fx, FOOT - 2, w, T); vol(g, fx + (foot || 0), FOOT - 1.4, w * 0.7, 1.8, T); };

// THE ARM: shoulder → elbow → fist, the fist a ball as wide as his head; `up` lifts it overhead.
// Returns the fist so the pose can put what he holds on it.
function bigArm(g, sx, sy, T, k, up, fistT) {
  const fT = fistT || T;
  if (!up) {
    const ex = sx - 5 * k, ey = sy + 10 * k, fx = sx - 6 * k, fy = Math.min(FOOT - 5 * k, sy + 22 * k);
    vol(g, sx, sy, 5.5 * k, 5 * k, T);
    limb(g, sx, sy, ex, ey, 7 * k, T); limb(g, ex, ey, fx, fy, 8 * k, T);
    vol(g, ex, ey, 4 * k, 4 * k, T);
    vol(g, fx, fy, 5.2 * k, 4.6 * k, fT);
    for (const t of [-2, 0, 2]) g.set(Math.round(fx + t * k), Math.round(fy + 3.5 * k), fT[0]);
    return [fx, fy];
  }
  const ex = sx - 7 * k, ey = sy - 5 * k, fx = sx - 2 * k, fy = sy - 15 * k;
  vol(g, sx, sy, 5.5 * k, 5 * k, T);
  limb(g, sx, sy, ex, ey, 7 * k, T); limb(g, ex, ey, fx, fy, 8 * k, T);
  vol(g, ex, ey, 4 * k, 4 * k, T);
  vol(g, fx, fy, 5.2 * k, 4.6 * k, fT);
  return [fx, fy];
}
const smallArm = (g, sx, sy, T, dx, len) => { vol(g, sx, sy, 2.4, 2.2, T); limb(g, sx, sy, sx + dx, sy + len * 0.5, 2.8, T); limb(g, sx + dx, sy + len * 0.5, sx + dx * 0.6, sy + len, 2.6, T); vol(g, sx + dx * 0.6, sy + len + 0.6, 1.8, 1.6, T); };

// What he holds overhead: a crate, or a clubman lying across his fist with legs kicking.
function crate(g, x, y) {
  const C = R.lea, x0 = Math.round(x - 7), y0 = Math.round(y - 13);
  g.rect(x0, y0, 15, 11, C[3]); g.rect(x0, y0 + 9, 15, 2, C[1]); g.rect(x0 + 13, y0, 2, 11, C[2]);
  for (const j of [3, 6]) g.hl(x0, y0 + j, 15, C[2]);
  g.line(x0 + 1, y0 + 1, x0 + 13, y0 + 9, C[4]); g.rect(x0, y0, 15, 1, C[4]);
}
function clubman(g, x, y) {
  const top = y - 9;
  g.ell(x - 1, top, 9, 3.6, R.red[2]); g.hl(Math.round(x - 9), Math.round(top - 2), 16, R.red[3], true); g.hl(Math.round(x - 8), Math.round(top + 2), 15, R.red[1], true);
  vol(g, x + 10, top - 0.5, 3, 3, R.skin); g.set(Math.round(x + 11), Math.round(top - 1), '#120b0a');
  limb(g, x - 9, top, x - 14, top - 5, 2.2, R.skin); limb(g, x - 8, top + 1, x - 15, top + 2, 2.2, R.skin);   // legs kicking
  limb(g, x + 4, top + 2, x + 7, top + 7, 2, R.skin);                                                       // an arm hanging
  g.line(Math.round(x + 6), Math.round(top - 3), Math.round(x + 12), Math.round(top - 9), R.lea[2]);        // his club still in hand
}
const held = (g, f, what) => { if (what === 'crate') crate(g, f[0], f[1]); else if (what === 'man') clubman(g, f[0], f[1]); };
const eyes = (g, x, y, c, gap = 3) => { g.set(x - gap + 1, y, c); g.set(x + gap - 1, y, c); };

// ---- the seven ----
const LOOKS = [
  { name: 'half bigfoot', draw(g, pose) {          // fur, hunched, knuckles on the floor, the cult's red over his shoulders
    const cx = 27, T = R.fur;
    leg(g, cx - 2, cx - 4, 46, T, 6); leg(g, cx + 7, cx + 8, 46, T, 6, 1);
    vol(g, cx + 2, 40, 10, 10, T);                                    // belly and hips
    vol(g, cx + 1, 31, 12, 9, T);                                     // the hump of the back
    smallArm(g, cx + 11, 30, T, 3, 13);
    g.poly([[cx - 9, 25], [cx + 12, 25], [cx + 14, 33], [cx + 2, 36], [cx - 10, 32]], R.red[2]);   // a ragged red mantle
    for (const x of [cx - 8, cx - 3, cx + 4, cx + 10]) g.vl(x, 32, 3, R.red[1], true);
    g.hl(cx - 8, 25, 20, R.red[3], true);
    if (pose !== 'idle') held(g, [cx - 8, 9], pose);
    const f = bigArm(g, cx - 8, 28, T, 1.15, pose !== 'idle');
    vol(g, cx + 3, 22, 6.5, 6, T);                                    // head sunk in the shoulders
    vol(g, cx + 3, 24, 4.2, 3.2, ['#2a1a14', '#3e2a20', '#5a4032', '#6e5040', '#80604c']);   // the bare face
    eyes(g, cx + 3, 23, '#f0a832'); g.hl(cx + 2, 26, 3, '#170c0a');
    shag(g, T, cx - 20, 14, cx + 22, 60, 22, T[0], T[1]);
    return f;
  } },
  { name: 'the dwarf', draw(g, pose) {             // short, square, a beard to the belt, the arm in iron bands
    const cx = 28, T = R.skin;
    leg(g, cx - 4, cx - 5, 54, R.lea, 5.5); leg(g, cx + 5, cx + 6, 54, R.lea, 5.5, 1);
    vol(g, cx, 47, 11, 9, R.red);                                     // red smock, wide as he is tall
    g.hl(cx - 10, 53, 21, R.lea[1], true); g.hl(cx - 10, 52, 21, R.lea[2], true);   // belt
    vol(g, cx + 1, 40, 11, 6, R.red);
    smallArm(g, cx + 10, 40, T, 2, 9);
    if (pose !== 'idle') held(g, [cx - 8, 21], pose);
    const f = bigArm(g, cx - 8, 39, T, 1.1, pose !== 'idle', R.iron);
    for (let k = 0; k < 3; k++) g.ell(f[0] + (pose === 'idle' ? 1 : -2) * (k - 1) * 3 + (pose === 'idle' ? 2 : -3), f[1] + (pose === 'idle' ? -7 : 8) + k * (pose === 'idle' ? -4 : 4), 4.2, 1.2, R.iron[2], true);
    vol(g, cx + 1, 32, 6, 5.6, T);                                    // a big head
    vol(g, cx + 1, 29, 6.4, 3.6, R.red, (x, y) => y <= 30);           // red hood
    g.poly([[cx - 5, 34], [cx + 7, 34], [cx + 5, 47], [cx + 1, 51], [cx - 3, 47]], R.beard[2]);     // the beard
    g.tone((x, y) => x > cx + 2, R.beard[1], [R.beard[2]]); g.tone((x, y) => x < cx - 1 && y < 40, R.beard[3], [R.beard[2]]);
    eyes(g, cx + 1, 32, '#120b0a'); g.set(cx + 1, 33, T[1]); g.set(cx, 31, R.beard[1]); g.set(cx + 3, 31, R.beard[1]);
    return f;
  } },
  { name: 'the grafted', draw(g, pose) {           // a cultist in his robe, one arm sewn on from something else
    const cx = 27, T = R.skin, G = R.graft;
    g.poly([[cx - 7, 27], [cx + 9, 27], [cx + 12, 64], [cx - 10, 64]], R.red[2]);     // the robe to the floor
    g.tone((x, y) => x > cx + 5, R.red[1], [R.red[2]]); g.tone((x, y) => x < cx - 4, R.red[3], [R.red[2]]);
    g.hl(cx - 10, 64, 23, R.red[0]); g.hl(cx - 4, 40, 10, R.lea[1]);
    smallArm(g, cx + 8, 29, R.red, 2, 13); vol(g, cx + 10, 43, 1.8, 1.6, T);
    if (pose !== 'idle') held(g, [cx - 7, 13], pose);
    const f = bigArm(g, cx - 7, 30, G, 1.15, pose !== 'idle');
    for (let y = 26; y <= 35; y += 2) { g.set(cx - 3, y, '#c9b98e'); g.set(cx - 2, y + 1, '#c9b98e'); }   // the stitches at the shoulder
    for (const t of [-3, 0, 3]) { const cx2 = Math.round(f[0] + t), cy2 = Math.round(f[1] + (pose === 'idle' ? 5 : -5)); g.set(cx2, cy2, R.bone[3]); g.set(cx2, cy2 + (pose === 'idle' ? 1 : -1), R.bone[2]); }
    vol(g, cx + 1, 22, 5, 5, R.red);                                  // the hood
    vol(g, cx + 1, 23.5, 3, 3, ['#1a0c0c', '#2a1414', '#3a1c1c', '#3a1c1c', '#4a2424']);
    eyes(g, cx + 1, 23, '#f0a832', 2);
    return f;
  } },
  { name: 'the swollen penitent', draw(g, pose) {  // bald and pale, the arm swollen violet by the rite, chains on it
    const cx = 27, T = R.pale, V = '#6a3d7a';
    leg(g, cx - 3, cx - 4, 44, T, 5); leg(g, cx + 5, cx + 6, 44, T, 5, 1);
    g.poly([[cx - 6, 42], [cx + 8, 42], [cx + 6, 51], [cx + 1, 53], [cx - 4, 51]], R.red[2]); g.hl(cx - 6, 42, 15, R.red[1]);
    vol(g, cx + 1, 35, 8, 8.5, T);                                    // a lean chest
    for (const y of [32, 35, 38]) g.hl(cx - 2, y, 6, T[1], true);     // ribs
    g.set(cx + 1, 30, R.red[2]); g.vl(cx + 1, 29, 4, R.red[2]); g.hl(cx - 1, 31, 5, R.red[2]);   // the sign cut on his chest
    smallArm(g, cx + 8, 29, T, 2, 13);
    if (pose !== 'idle') held(g, [cx - 8, 10], pose);
    const f = bigArm(g, cx - 8, 30, T, 1.25, pose !== 'idle');
    for (let y = 0; y < H; y++) for (let x = 0; x < cx - 4; x++) { const v = g.get(x, y); if (T.includes(v) && hash(x * 3, y) < 9) g.set(x, y, V); }   // veins
    g.ell(f[0], f[1] + (pose === 'idle' ? -9 : 9), 6.5, 1.3, R.iron[3], true); g.ell(f[0] + 1, f[1] + (pose === 'idle' ? -12 : 12), 6.5, 1.3, R.iron[2], true);
    vol(g, cx + 1, 22, 4.6, 5, T);                                    // bald small head
    eyes(g, cx + 1, 22, '#120b0a', 2); g.hl(cx, 25, 3, T[0]); g.set(cx - 1, 19, T[4]);
    return f;
  } },
  { name: 'bog troll', draw(g, pose) {             // grey green, long nose, moss on the hump, a fist like a stone
    const cx = 28, T = R.troll;
    leg(g, cx - 3, cx - 6, 46, T, 6.5); leg(g, cx + 7, cx + 9, 46, T, 6.5, 1);
    vol(g, cx + 2, 41, 10, 8, T);
    g.poly([[cx - 6, 42], [cx + 11, 42], [cx + 9, 50], [cx - 4, 50]], R.lea[2]);     // a hide round his middle
    vol(g, cx + 1, 31, 12, 10, T);
    smallArm(g, cx + 12, 31, T, 3, 14);
    if (pose !== 'idle') held(g, [cx - 9, 10], pose);
    const f = bigArm(g, cx - 9, 29, T, 1.3, pose !== 'idle', R.iron.map((c, i) => [T[0], T[1], '#5f6460', '#7d8279', '#9da197'][i]));
    vol(g, cx - 2, 24, 13, 4, R.moss, (x, y) => T.includes(g.get(x, y)) && y <= 26);   // moss on the hump
    vol(g, cx + 4, 22, 5.5, 5, T);                                    // head forward, low
    g.bar(cx + 4, 23, cx + 4, 29, 2.6, T[3], T[4], T[2]);            // the long nose
    eyes(g, cx + 4, 21, '#d8e070', 3); g.hl(cx + 2, 25, 1, T[0]); g.set(cx + 7, 26, R.bone[3]);   // one tusk
    return f;
  } },
  { name: 'goat skull ape', draw(g, pose) {       // a black ape in a goat's skull, the other arm chained to his belt
    const cx = 27, T = R.ape;
    leg(g, cx - 3, cx - 5, 47, T, 6); leg(g, cx + 6, cx + 8, 47, T, 6, 1);
    vol(g, cx + 1, 40, 10, 9, T);
    vol(g, cx + 1, 30, 13, 9, T);
    vol(g, cx + 1, 38, 5.5, 5, ['#2c2630', '#3e3644', '#544a5a', '#62586a', '#706776']);   // bare chest
    g.hl(cx - 7, 46, 17, R.red[2]); g.hl(cx - 7, 47, 17, R.red[1]);   // red girdle
    smallArm(g, cx + 12, 30, T, 1, 14); g.line(cx + 13, 45, cx + 7, 47, R.iron[3]); g.set(cx + 10, 46, R.iron[2]);   // chained to it
    if (pose !== 'idle') held(g, [cx - 9, 10], pose);
    const f = bigArm(g, cx - 9, 28, T, 1.25, pose !== 'idle');
    shag(g, T, cx - 22, 18, cx + 18, 60, 14, T[0], T[3]);
    // the goat's skull for a face, its horns back over his head
    vol(g, cx + 2, 22, 5, 5.5, R.bone);
    g.bar(cx - 2, 19, cx - 6, 14, 2.4, R.bone[2], R.bone[3], R.bone[1]); g.bar(cx + 6, 19, cx + 10, 14, 2.4, R.bone[2], R.bone[3], R.bone[1]);
    g.set(cx, 21, '#120b0a'); g.set(cx + 4, 21, '#120b0a'); g.set(cx, 22, '#d23028'); g.set(cx + 4, 22, '#d23028');
    g.vl(cx + 2, 24, 3, R.bone[1]); g.hl(cx + 1, 27, 3, R.bone[1]);
    return f;
  } },
  { name: 'the porter', draw(g, pose) {            // a man of the cult's yard: apron, a basket of rubbish on his back, one arm grown huge with it
    const cx = 27, T = R.skin;
    g.rect(cx - 2, 18, 14, 16, R.lea[3]); for (let y = 19; y < 34; y += 3) g.hl(cx - 2, y, 14, R.lea[2]); for (let x = cx; x < cx + 12; x += 3) g.vl(x, 18, 16, R.lea[1], true);   // the basket
    g.rect(cx - 1, 15, 4, 4, R.lea[2]); g.rect(cx + 4, 13, 5, 6, R.bone[2]); g.set(cx + 6, 15, '#120b0a');   // a stick, a skull in it
    leg(g, cx - 3, cx - 4, 46, R.lea, 4.5); leg(g, cx + 5, cx + 6, 46, R.lea, 4.5, 1);
    vol(g, cx + 1, 36, 8, 10, T);
    g.poly([[cx - 5, 32], [cx + 7, 32], [cx + 9, 52], [cx - 7, 52]], R.lea[2]); g.tone((x, y) => x > cx + 4, R.lea[1], [R.lea[2]]);   // the apron
    g.line(cx - 5, 27, cx + 7, 40, R.lea[1]); g.line(cx + 7, 27, cx - 5, 40, R.lea[1]);   // the harness
    smallArm(g, cx + 8, 29, T, 2, 13);
    if (pose !== 'idle') held(g, [cx - 8, 10], pose);
    const f = bigArm(g, cx - 8, 29, T, 1.2, pose !== 'idle');
    g.ell(f[0], f[1] + (pose === 'idle' ? -8 : 8), 5, 3, R.lea[2], true); g.ell(f[0], f[1] + (pose === 'idle' ? -8 : 8), 5, 1, R.lea[3], true);   // the bracer
    vol(g, cx + 1, 22, 4.8, 5, T);
    vol(g, cx + 1, 18.5, 5, 2.6, R.red, (x, y) => y <= 19);            // a red cap
    eyes(g, cx + 1, 22, '#120b0a', 2); g.hl(cx, 25, 3, T[0]); for (let x = cx - 3; x <= cx + 5; x++) if (hash(x, 24) < 50) g.set(x, 24 + (hash(x, 25) & 1), R.lea[1]);
    return f;
  } },
];

// drawn 10 rows down so what he lifts overhead is not cut off by the top of the grid
const UPPAD = 10;
class Off extends Grid { set(x, y, c) { return super.set(x, Math.round(y) + UPPAD, c); } get(x, y) { return super.get(x, y + UPPAD); } }
const sprite = (look, pose) => { const o = new Off(W, H + UPPAD); look.draw(o, pose); const g = new Grid(W, H + UPPAD); g.p = o.p; g.outline(OL); g.clean(OL); return g; };
const toImg = (g, flip) => { const im = new Img(g.w, g.h); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(flip ? g.w - 1 - x : x, y); if (c) im.fill(x, y, 1, 1, c); } return im; };

const Z = +(process.argv[2] || 5), pad = 14, cw = W * Z, ch = (H + 10) * Z + 20, poses = [['idle', 'stands'], ['crate', 'a crate up'], ['man', 'a man up']];
const TX = 1.0, S = 4, scaleH = Math.round(OG.H * 1.4 * S) + 40, perRow = 2;
const rows = Math.ceil(LOOKS.length / perRow), blockW = 3 * (cw + pad) + 30;
const img = new Img(Math.max(pad + perRow * blockW, 2010), pad + rows * (ch + 40) + scaleH + pad, '#2b2622');
LOOKS.forEach((L, i) => {
  const bx = pad + (i % perRow) * blockW, by = pad + Math.floor(i / perRow) * (ch + 40);
  text(img, (i + 1) + '. ' + L.name, bx, by, '#e8d8b0', 3);
  poses.forEach(([p, label], j) => {
    const g = sprite(L, p), x = bx + j * (cw + pad), y = by + 26;
    img.blit(toImg(g), 0, 0, g.w, g.h, x, y, g.w * Z, g.h * Z);
    img.fill(x, y + (FOOT + UPPAD) * Z, g.w * Z, 1, '#5a4d40');
    text(img, label, x, y + g.h * Z + 4, '#a89a80', 2);
  });
});
// scale strip at world size: the shieldman, every look standing, the ogre
const y0 = pad + rows * (ch + 40) + scaleH - 20;
let x = pad;
const put = (g, flip, k, foot, label) => { const w = Math.round(g.w * k * S), h = Math.round(g.h * k * S); img.blit(toImg(g, flip), 0, 0, g.w, g.h, x, Math.round(y0 - foot * k * S), w, h, true); text(img, label, x, y0 + 6, '#d8ccb0', 2); x += w + pad; };
const sp = SP.sprite(0, 0); put(sp.g, sp.flip, 0.92, SP.FOOT, 'man');
LOOKS.forEach((L, i) => put(sprite(L, 'idle'), false, TX, FOOT + UPPAD, String(i + 1)));
const og = OG.sprite(0, 'idle', 0); put(og.g, og.flip, 1.4, OG.FOOT, 'ogre');
img.fill(pad, y0, x - pad, 1, '#5a4d40');
fs.writeFileSync(__dirname + '/sheet.png', img.png());
console.log('sheet.png', img.w, img.h);
