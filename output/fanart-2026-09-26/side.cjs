// node side.cjs [scale] → side.png: fan art, not game art. The goat (LONG HORNS, THE ORACLE, the
// FIRE AMULET) in profile, cornered in the cult's hall by everybody at once — the ogre looming at the
// back — drawn side-on like a stage, flat colours and a black outline, off the game's own cast.
const fs = require('fs'), { Img } = require('../pixel-claude-2026-09-24/png.cjs');
const { Grid } = require('../../js/prop-pixels.js');

const W = 320, H = 180, K = +(process.argv[2] || 6);
const OL = '#140f12';
const C = {
  // the goat
  f1: '#f1e9da', f2: '#d3c6b0', f3: '#a4977f', hoof: '#2b2220', pink: '#d8988c', eye: '#1c1410', iris: '#d6a53a',
  an0: '#4f3421', an1: '#74512f', an2: '#9a7247', an3: '#dccaa8',
  eye3: '#a46cff', eye3w: '#f6efff', leather: '#5a3a22', gold: '#e0a52e', gold2: '#ffd86b', flame: '#f26b1d',
  // the ogre (OGRE_PIXELS.P)
  h0: '#262d22', h1: '#39442f', h2: '#505f41', h3: '#6a7b55', h4: '#8a9a6f',
  q0: '#440f13', q1: '#6e191d', q2: '#9c2528', q3: '#c23d36', q4: '#dc6048',
  w0: '#35200f', w1: '#553219', w2: '#744624', w3: '#8f5c33',
  c0: '#8c8166', c1: '#c6ba98', c2: '#ebe1c4',
  i1: '#303038', i2: '#51505b', i3: '#878692', e1: '#f0a832', m: '#170c0a',
  // the men
  skin: '#b98a68', skin2: '#94664a', hide: '#6b4a36', hide2: '#4e3426', apron: '#8b6b4c',
  coat: '#6a4a2c', coat2: '#4c3420', hat: '#5a3a20', hat2: '#3f2814',
  pr1: '#3e2766', pr2: '#5b3a8a', pr3: '#7a55b0', void: '#0e0a14', glow: '#c79bff',
  wf0: '#4a2bb0', wf1: '#7a6cff', wf2: '#b8c4ff', wf3: '#f2f4ff',
  dog1: '#b07a45', dog2: '#8a5a30', dog3: '#d2a26a', dogd: '#3a2a22',
  blood: '#8e1a1c', blood2: '#5e1012', straw: '#c9a24a', straw2: '#8f7030',
};

// A pen over a grid: unit coordinates from a foot point, scaled, optionally mirrored later.
function pen(g, ax, ay, k = 1) {
  const X = (x) => ax + x * k, Y = (y) => ay + y * k;
  return {
    k, X, Y,
    ell: (x, y, rx, ry, c, only) => g.ell(X(x), Y(y), rx * k, ry * k, c, only),
    poly: (pts, c) => g.poly(pts.map(([x, y]) => [X(x), Y(y)]), c),
    bar: (x0, y0, x1, y1, t, c) => g.bar(X(x0), Y(y0), X(x1), Y(y1), t * k, c),
    line: (x0, y0, x1, y1, c, only) => g.line(X(x0), Y(y0), X(x1), Y(y1), c, only),
    px: (x, y, c) => g.set(Math.floor(X(x)), Math.floor(Y(y)), c),
    rect: (x, y, w, h, c, only) => g.rect(Math.round(X(x)), Math.round(Y(y)), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)), c, only),
    // recolour `from` pixels where the local-space test holds
    tone: (test, c, from) => g.tone((x, y) => test((x + 0.5 - ax) / k, (y + 0.5 - ay) / k), c, from),
  };
}
const sprite = (w, h, ax, ay, k, draw) => { const g = new Grid(w, h); draw(pen(g, ax, ay, k), g); g.outline(OL); return { g, ax, ay }; };

// Stamp a sprite onto the scene with its foot on (x, y); `flip` turns it to face left.
function stamp(scene, s, x, y, flip) {
  for (let j = 0; j < s.g.h; j++) for (let i = 0; i < s.g.w; i++) {
    const c = s.g.get(i, j); if (!c) continue;
    const dx = flip ? s.ax - i : i - s.ax;
    scene.set(x + dx, y + j - s.ay, c);
  }
}

// ---------------------------------------------------------------- the goat, facing right
function goat() {
  return sprite(110, 100, 45, 92, 1.6, (p) => {
    const { f1, f2, f3, hoof } = C;
    // far legs, in shade
    p.bar(-8, -10, -9, -1, 2.6, f3); p.bar(9, -10, 10, -1, 2.6, f3);
    p.rect(-10.5, -1.5, 3, 1.5, hoof); p.rect(8.8, -1.5, 3, 1.5, hoof);
    // tail flicked up, the barrel of him, chest and rump
    p.poly([[-12, -18], [-16, -24], [-14, -25], [-10, -20]], f1);
    p.ell(0, -14, 13, 6.5, f1); p.ell(8, -15, 6, 6.5, f1); p.ell(-8, -14.5, 6, 6.5, f1);
    // near legs, short and planted: he is braced
    p.ell(-8, -11, 5, 5, f1); p.bar(-8, -8, -10, -4, 3, f1); p.bar(-10, -4, -8, -1, 2.8, f1);
    p.bar(6, -10, 6.5, -1, 3, f1);
    p.rect(-9.8, -1.5, 3.2, 1.5, hoof); p.rect(4.8, -1.5, 3.2, 1.5, hoof);
    // a thick neck, head carried low and forward
    p.poly([[4, -19], [12, -27], [19, -25], [13, -12]], f1);
    // head: a big skull and a square muzzle
    p.ell(17.5, -25, 6.5, 5.5, f1);
    p.poly([[18, -29], [26, -25], [26.5, -20.5], [19, -20]], f1); p.ell(24.8, -22, 3, 2.8, f1);
    // ear hanging back
    p.poly([[14, -28], [7.5, -27], [7, -25], [13.5, -25.5]], f2); p.line(13, -26.5, 9, -26, C.pink);
    // beard
    p.poly([[19.5, -20], [24, -20], [21, -14]], f2);
    // shading: belly, under the jaw and neck
    p.tone((x, y) => y > -10 && x > -14 && x < 14, f2, [f1]);
    p.tone((x, y) => x > 11 && x < 19 && y > -20 && y < -12, f2, [f1]);
    // the collar and the FIRE AMULET on it
    p.bar(10.5, -25.5, 15, -16.5, 2, C.leather);
    p.line(13.5, -17.5, 13.5, -15, C.leather);
    p.ell(13.6, -12.8, 2.4, 2.7, C.gold); p.px(13.5, -13.5, C.flame); p.px(13.5, -12.3, C.gold2);
    // face: nostril, mouth, the bar-pupil eye
    p.px(26.8, -23, C.eye); p.line(22.5, -19.9, 25.5, -19.9, f3);
    p.rect(19.4, -26.4, 2.2, 1.2, C.iris); p.rect(20, -26.4, 1, 1.2, C.eye);
    // THE ORACLE: the third eye, open on his brow
    p.ell(20.5, -29.3, 1.9, 1.3, C.eye3w); p.rect(20, -29.9, 1.2, 1.2, C.eye3);
    // LONG HORNS: stag antlers, spread back and up, the far one darker behind
    const antler = (ox, oy, c, tip) => {
      p.bar(15 + ox, -29 + oy, 11 + ox, -35 + oy, 2.4, c); p.bar(11 + ox, -35 + oy, 6 + ox, -41 + oy, 2.1, c);
      p.bar(6 + ox, -41 + oy, 0 + ox, -44 + oy, 1.8, c);
      p.bar(15.5 + ox, -31 + oy, 21 + ox, -34 + oy, 1.7, c);        // brow tine, forward over the eyes
      p.bar(11.5 + ox, -35.5 + oy, 15 + ox, -41 + oy, 1.6, c);       // bez tine, up
      p.bar(7 + ox, -40.5 + oy, 9 + ox, -47 + oy, 1.6, c);           // trez tine, up
      p.bar(2 + ox, -43 + oy, 2 + ox, -48 + oy, 1.4, c);             // crown
      for (const [x, y] of [[21, -34], [15, -41], [9, -47], [2, -48], [0, -44]]) p.px(x + ox, y + oy, tip);
    };
    antler(-2.5, 0.5, C.an0, C.an1); antler(0, 0, C.an1, C.an3);
    p.tone((x, y) => y < -36 && x > 4, C.an2, [C.an1]);
  });
}

// ---------------------------------------------------------------- the ogre, facing right
function ogre() {
  return sprite(150, 150, 60, 142, 1, (p) => {
    const c = C;
    // far leg and far arm, in shade
    p.ell(-12, -26, 11, 14, c.h1); p.bar(-10, -16, -14, -4, 10, c.h1); p.ell(-12, -3, 11, 4, c.h1);
    p.bar(-2, -86, 22, -62, 13, c.h1); p.bar(22, -62, 34, -44, 12, c.h1); p.ell(36, -38, 8, 7, c.h1);
    // the hump and the belly
    p.ell(-6, -72, 30, 28, c.h2); p.ell(6, -56, 21, 18, c.h3); p.ell(-10, -86, 22, 16, c.h2);
    // the red loincloth, ragged
    p.poly([[-26, -50], [20, -48], [21, -30], [15, -25], [10, -32], [4, -23], [-2, -31], [-8, -24], [-14, -32], [-20, -25], [-26, -34]], c.q2);
    p.line(-26, -48, 20, -46, c.q3);
    // near leg
    p.ell(4, -28, 11, 13, c.h2); p.bar(6, -18, 10, -5, 10, c.h2); p.ell(12, -3, 12, 4, c.h2);
    for (const x of [20, 23]) p.poly([[x, -3], [x + 3, -1], [x, 0]], c.c1);
    // the red bars the cult paints on his chest
    p.bar(-2, -70, 12, -58, 2.5, c.q3); p.bar(-6, -63, 8, -51, 2.5, c.q3);
    // the mantle over his back, with the cult's sign
    p.poly([[-6, -104], [-30, -96], [-40, -74], [-38, -50], [-34, -57], [-29, -48], [-25, -57], [-19, -52], [-16, -64], [-4, -80], [8, -96]], c.q2);
    p.tone((x, y) => y > -64 || x < -33, c.q1, [c.q2]);
    p.poly([[-26, -86], [-18, -70], [-34, -70]], c.c1); p.poly([[-26, -82], [-21, -72], [-31, -72]], c.q2);
    p.ell(-26, -75.5, 2, 2, c.c1);
    // head hung forward, jaw thrust out, tusks up
    p.ell(26, -85, 13, 11, c.h3);
    p.poly([[15, -81], [39, -81], [41, -73], [36, -69], [19, -70]], c.h2);
    p.ell(40, -87, 3.5, 3.5, c.h3); p.px(42, -87, c.m);
    p.line(17, -80, 39, -80, c.m);
    p.poly([[34, -81], [36, -91], [38, -81]], c.c2); p.poly([[27, -81], [28.5, -87], [30, -81]], c.c1);
    // the hood over his crown and nape, horns through it
    p.poly([[4, -96], [12, -104], [24, -100], [33, -95], [30, -91], [22, -93], [14, -88], [6, -84]], c.q3);
    p.tone((x, y) => y > -94 && x < 20, c.q2, [c.q3]);
    p.bar(20, -98, 18, -108, 4, c.c1); p.bar(18, -108, 11, -114, 3, c.c1); p.px(10, -115, c.c2);
    p.bar(28, -97, 31, -106, 3, c.c0); p.px(32, -108, c.c1);
    // brow and the one eye we see, lit
    p.bar(27, -89, 36, -88, 2, c.h1); p.rect(32, -87, 2, 2, c.e1); p.px(33, -86, c.m);
    // near arm: hanging, fist the size of the goat's head, a broken shackle on the wrist
    p.bar(8, -84, 18, -62, 15, c.h2); p.bar(18, -62, 22, -42, 13, c.h2); p.ell(23, -35, 9.5, 8.5, c.h3);
    p.line(18, -35, 30, -36, c.h1); p.line(20, -31, 30, -32, c.h1);
    p.bar(14, -47, 31, -47, 4, c.i2); p.px(18, -47, c.i3); p.px(26, -47, c.i3);
    // the broken chain swinging off it
    for (const [x, y] of [[32, -44], [33, -40], [33, -36]]) { p.rect(x - 1, y - 1, 3, 3, c.i2); p.px(x, y, c.i1); }
    // light from the upper left, shade underneath
    p.tone((x, y) => y > -46 && x < 0, c.h1, [c.h2, c.h3]);
    p.tone((x, y) => (x + 6) * 0.4 + (y + 96) < 0, c.h4, [c.h2, c.h3]);
    p.tone((x, y) => y < -60 && y > -98 && x > -30 && x < -8 && (x - y) % 7 === 0, c.h1, [c.h2]);
  });
}

// ---------------------------------------------------------------- the men, facing right
function clubman(high) {
  return sprite(60, 80, 25, 70, 1, (p) => {
    const c = C, lift = high ? 4 : 0;
    // the robe: shoulders, a rope belt, sleeves
    p.poly([[-10, 0], [-9, -18], [-8, -29], [-5, -34], [6, -34], [9, -29], [10, -18], [12, 0]], c.q2);
    p.tone((x) => x < -3, c.q1, [c.q2]);
    p.rect(-10, -2, 22, 2, c.q1);
    p.rect(-6, 0, 4, 1, c.hide2); p.rect(4, 0, 5, 1, c.hide2);
    p.line(-8, -22, 9, -22, c.straw); p.line(6, -22, 7, -16, c.straw);
    // the hood, round, and the white mask in it
    p.ell(0.5, -40, 7.5, 7.5, c.q2); p.ell(-3, -38, 5, 6, c.q1);
    p.ell(4, -39.5, 4, 5, c.c1); p.rect(5.5, -42, 2, 2, c.m); p.rect(2.5, -42, 1, 2, c.m); p.line(4, -36, 6.5, -36, c.c0);
    p.tone((x, y) => x < 3 && y < -44, c.q3, [c.q2]);
    // both hands on the club, raised in front: the windup
    p.bar(-1, -30, 8, -37 - lift, 3.2, c.q2); p.bar(4, -30, 10, -35 - lift, 3, c.q3);
    p.ell(9.5, -36.5 - lift, 2, 2, c.skin);
    p.bar(9.5, -36.5 - lift, 15, -53 - lift, 3.2, c.w2); p.ell(15.5, -54 - lift, 3.8, 3.8, c.w2);
    p.px(14, -56 - lift, c.w3); p.px(17, -53 - lift, c.i3); p.px(13, -52 - lift, c.i3); p.px(16, -57 - lift, c.i3);
  });
}
function butcher() {
  return sprite(80, 90, 32, 80, 1, (p) => {
    const c = C;
    // legs short and wide apart, boots
    p.bar(-6, -16, -9, -1, 6, c.hide2); p.bar(6, -16, 9, -1, 6, c.hide2);
    p.rect(-13, -2, 8, 2, c.m); p.rect(6, -2, 9, 2, c.m);
    // the far arm, hanging, a hook in it
    p.bar(-6, -36, -12, -22, 5, c.skin2); p.ell(-12, -20, 3, 3, c.skin2); p.bar(-12, -18, -11, -13, 1.5, c.i2); p.px(-10, -13, c.i2);
    // the bulk of him: a barrel of a chest, a leather apron
    p.ell(0, -27, 13, 14, c.hide); p.ell(1, -38, 13, 8, c.hide);
    p.poly([[3, -36], [13, -30], [12, -12], [-2, -12]], c.apron);
    p.tone((x) => x < -6, c.hide2, [c.hide]);
    p.line(3, -36, -4, -44, c.w1);
    for (const [x, y] of [[7, -26], [9, -20], [5, -18], [10, -15]]) p.px(x, y, c.blood);
    // the skull he wears for a face, horned
    p.ell(3, -46, 6, 6, c.hide2);
    p.ell(7, -47, 5.5, 5.5, c.c1); p.poly([[8, -50], [16, -46], [15, -41], [8, -41]], c.c1);
    p.rect(8, -49, 2, 2, c.m); p.px(15, -45, c.m); p.line(10, -42, 14, -42, c.c0);
    p.bar(4, -51, -1, -56, 2.5, c.c2); p.bar(-1, -56, -5, -55, 2, c.c2);
    p.bar(9, -52, 12, -57, 2, c.c1); p.px(13, -58, c.c2);
    // the near arm up and forward, the cleaver over the goat
    // the near arm raised, the cleaver high over the skull, edge toward the goat
    p.bar(6, -38, 12, -54, 5.5, c.skin); p.ell(12.5, -56, 3, 3, c.skin);
    p.bar(12.5, -56, 11, -61, 2.2, c.w1);
    p.poly([[5, -61], [18, -63], [19, -74], [6, -72]], c.i2);
    p.line(18, -63, 19, -74, c.i3); p.line(6, -72, 19, -74, c.i3); p.px(8, -69, c.i1);
    p.line(18, -66, 19, -72, c.blood); p.px(17, -62, c.blood);
  });
}
function hunter() {
  return sprite(70, 80, 25, 70, 1, (p) => {
    const c = C;
    p.rect(-5, -8, 3, 8, c.hat2); p.rect(3, -8, 3, 8, c.hat2);
    p.poly([[-8, -6], [-6, -32], [6, -32], [9, -6], [2, -8], [-2, -8]], c.coat); p.tone((x, y) => x < -3, c.coat2, [c.coat]);
    p.line(0, -30, 1, -8, c.coat2);
    p.ell(2, -37, 5, 5, c.hat2);
    p.poly([[5, -40], [15, -36.5], [5, -34]], c.c1); p.line(6, -35, 14, -36.5, c.c0); p.rect(4, -40, 2, 2, c.q3);
    p.rect(-4, -48, 11, 6, c.hat); p.rect(-9, -43, 21, 2, c.hat); p.rect(-4, -44, 11, 1, c.q3);
    p.rect(-4, -48, 11, 1, c.hat2);
    // the rifle at his shoulder, aimed
    p.bar(-3, -30, 5, -32, 3.5, c.w2); p.bar(5, -32, 30, -33, 2, c.i1); p.px(30, -34, c.i2);
    p.bar(2, -30, 8, -31, 2.5, c.coat); p.bar(10, -30, 16, -32, 2.5, c.coat); p.ell(16, -32, 1.5, 1.5, c.skin);
  });
}
function seer() {
  return sprite(60, 90, 25, 80, 1, (p) => {
    const c = C;
    p.bar(11, 0, 12, -54, 2, c.w1);
    p.poly([[-9, 0], [-6, -30], [-4, -40], [4, -40], [7, -30], [10, 0]], c.pr2);
    p.tone((x, y) => x < -2, c.pr1, [c.pr2]); p.tone((x, y) => x > 4 && y > -30, c.pr3, [c.pr2]);
    p.line(-5, -26, 7, -26, c.gold);
    p.ell(1, -45, 7, 8, c.pr2); p.poly([[-5, -49], [-3, -62], [3, -50]], c.pr2); p.tone((x, y) => x < -1, c.pr1, [c.pr2]);
    p.ell(3.5, -44, 4, 5, c.void); p.px(5, -45, c.glow); p.px(6, -45, c.glow);
    p.bar(3, -36, 11, -32, 3, c.pr2); p.ell(11.5, -32, 1.8, 1.8, c.skin2);
    // witchfire on the staff
    p.poly([[9, -55], [12, -66], [15, -55], [12, -52]], c.wf0); p.poly([[10.5, -56], [12, -63], [13.5, -56], [12, -54]], c.wf1);
    p.px(12, -57, c.wf3); p.px(12, -58, c.wf2);
  });
}
function hound() {
  return sprite(60, 40, 22, 34, 1, (p) => {
    const c = C;
    p.bar(-8, -10, -13, -1, 2.5, c.dog2); p.bar(8, -10, 12, -1, 2.5, c.dog2);           // far legs, reaching
    p.poly([[-12, -14], [-20, -22], [-18, -23], [-10, -16]], c.dog1);                      // tail up
    p.ell(0, -12, 12, 5, c.dog1); p.ell(9, -13, 5, 6, c.dog1);
    p.ell(-2, -15, 9, 3, c.dogd);
    p.bar(-9, -10, -16, -3, 3, c.dog1); p.bar(-16, -3, -18, -1, 2.5, c.dog1);
    p.bar(7, -9, 16, -4, 3, c.dog1); p.bar(16, -4, 19, -3, 2.5, c.dog1);
    p.ell(15, -17, 5, 4, c.dog1);
    p.poly([[16, -20], [24, -17], [23, -15], [17, -15]], c.dog1);
    p.poly([[17, -15], [23, -14], [22, -11], [17, -12]], c.dog1);
    p.poly([[18, -15], [24, -16], [23, -13]], c.m); p.px(20, -15, c.c2); p.px(22, -15, c.c2);
    p.poly([[12, -20], [11, -25], [15, -21]], c.dogd); p.px(17, -19, c.m); p.px(24, -17, c.m);
    p.bar(10, -18, 11, -13, 2, c.q3);
    p.tone((x, y) => y > -10, c.dog3, [c.dog1]);
  });
}

// ---------------------------------------------------------------- props
function brazier() {
  return sprite(40, 60, 18, 52, 1, (p) => {
    const c = C;
    p.bar(0, -16, -7, 0, 2, c.i1); p.bar(0, -16, 7, 0, 2, c.i1); p.bar(0, -18, 0, -2, 2, c.i1);
    p.poly([[-9, -22], [9, -22], [6, -15], [-6, -15]], c.i1); p.line(-9, -22, 9, -22, c.i2);
    p.poly([[-7, -22], [-4, -34], [-1, -27], [1, -40], [3, -28], [5, -33], [7, -22]], c.flame);
    p.poly([[-4, -22], [-1, -30], [1, -34], [3, -26], [4, -22]], c.e1);
    p.poly([[-1, -22], [1, -28], [2, -22]], c.gold2);
  });
}
function banner() {
  return sprite(30, 70, 13, 64, 1, (p) => {
    const c = C;
    p.rect(-11, -62, 24, 2, c.w1);
    p.poly([[-9, -60], [11, -60], [11, -12], [1, -20], [-9, -12]], c.q2);
    p.tone((x) => x > 7, c.q1, [c.q2]);
    p.poly([[1, -50], [8, -34], [-6, -34]], c.c1); p.poly([[1, -46], [5, -36], [-3, -36]], c.q2); p.ell(1, -39.5, 1.6, 1.6, c.c1);
  });
}

// ---------------------------------------------------------------- the hall
const scene = new Grid(W, H);
const FLOOR = 146;
const hash = (x, y) => { let h = x * 374761393 + y * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
for (let y = 0; y < FLOOR; y++) for (let x = 0; x < W; x++) {
  const row = Math.floor(y / 8), bx = (x + (row % 2) * 8) % 16, by = y % 8;
  let col = hash(Math.floor((x + (row % 2) * 8) / 16), row) < 0.5 ? '#302533' : '#352a39';
  if (by === 7 || bx === 15) col = '#1d1621'; else if (by === 0) col = '#3e3243';
  scene.set(x, y, col);
}
// a red dado along the wall and the dark where it meets the floor
for (let x = 0; x < W; x++) { for (let y = 112; y < 118; y++) scene.set(x, y, y === 112 ? '#7a2226' : '#551518'); scene.set(x, 118, '#1d1621'); }
for (let x = 0; x < W; x++) for (let y = FLOOR - 4; y < FLOOR; y++) scene.set(x, y, y < FLOOR - 2 ? '#211a24' : '#161117');
// the floor: flags, joints, straw, old blood
for (let y = FLOOR; y < H; y++) for (let x = 0; x < W; x++) {
  const band = y < 156 ? 0 : y < 168 ? 1 : 2, off = [0, 11, 5][band], wd = [18, 24, 32][band];
  let col = hash(Math.floor((x + off) / wd), band + 9) < 0.5 ? '#3a2e25' : '#40332a';
  if (y === 156 || y === 168 || (x + off) % wd === 0) col = '#261d17';
  if (y === FLOOR) col = '#4c3d31';
  scene.set(x, y, col);
}
// the cult's circle on the floor, seen edge-on
scene.ring(170, 163, 92, 9.5, 1.4, '#6e1518');
for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, x = 170 + Math.cos(a) * 92, y = 163 + Math.sin(a) * 9.5; scene.rect(Math.round(x) - 1, Math.round(y), 3, 1, '#6e1518'); }
for (let k = 0; k < 60; k++) { const x = Math.floor(hash(k, 1) * W), y = FLOOR + 2 + Math.floor(hash(k, 2) * 32); scene.line(x, y, x + 2 + Math.floor(hash(k, 3) * 3), y - (hash(k, 4) < 0.5 ? 1 : 0), hash(k, 5) < 0.5 ? C.straw : C.straw2); }
for (const [x, y, r] of [[96, 172, 5], [104, 175, 2.5], [202, 176, 4], [40, 176, 2]]) scene.ell(x, y, r * 1.8, r * 0.6, C.blood2);
// stone pillars at both edges
for (const x0 of [0, W - 14]) for (let y = 0; y < FLOOR; y++) for (let x = x0; x < x0 + 14; x++) {
  const e = x === x0 || x === x0 + 13, band = y % 22 < 2;
  scene.set(x, y, e ? '#1d1621' : band ? '#2a2230' : x - x0 < 4 ? '#5a5060' : x - x0 > 10 ? '#3c3444' : '#4a4252');
}
// the firelight: soft stepped rings of warm tint round each bowl, dithered where one step meets the next
const FIRES = [[34, 116], [300, 120]];
const mix = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16)); const A = p(a), B = p(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const STEPS = [[20, 0.2], [34, 0.13], [50, 0.07], [70, 0.03]];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  let t = 0;
  for (const [fx, fy] of FIRES) {
    const d = Math.hypot(x - fx, (y - fy) * 1.3) + ((x + y) % 2 ? 1.5 : -1.5);
    for (const [r, v] of STEPS) if (d < r) { t = Math.max(t, v); break; }
  }
  if (t) scene.set(x, y, mix(scene.get(x, y), "#ff9a3c", t));
}

// props at the back
stamp(scene, banner(), 72, 78); stamp(scene, banner(), 152, 72); stamp(scene, banner(), 290, 80);
// a rack of swords on the wall, one gone
for (const x of [110, 116, 128]) { scene.rect(x, 94, 1, 20, C.i3); scene.rect(x - 2, 98, 5, 1, C.w2); scene.rect(x, 91, 1, 3, C.w2); }
scene.rect(106, 113, 28, 2, C.w1); scene.rect(106, 91, 28, 1, C.w1);
stamp(scene, brazier(), 34, 150); stamp(scene, brazier(), 300, 154);

// the cast: the back row first, then who is nearer
stamp(scene, ogre(), 250, 158, true);
stamp(scene, seer(), 302, 162, true);
stamp(scene, hunter(), 277, 168, true);
stamp(scene, clubman(false), 216, 174, true);
stamp(scene, butcher(), 180, 171, true);
stamp(scene, clubman(true), 146, 168, true);
stamp(scene, hound(), 116, 174, true);
stamp(scene, goat(), 56, 174, false);

// the rifle line on the goat: the one telegraph kept, as the game draws it
for (let x = 96; x < 244; x += 5) scene.rect(x, 135, 3, 1, "#d33a2c");

const out = new Img(W * K, H * K);
out.blit({ w: W, h: H, data: (() => { const b = Buffer.alloc(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = scene.get(x, y) || '#000000'; const i = (y * W + x) * 4; b[i] = parseInt(c.substr(1, 2), 16); b[i + 1] = parseInt(c.substr(3, 2), 16); b[i + 2] = parseInt(c.substr(5, 2), 16); b[i + 3] = 255; } return b; })() }, 0, 0, W, H, 0, 0, W * K, H * K);
fs.writeFileSync(__dirname + '/side.png', out.png());
console.log('side.png', out.w, out.h);
