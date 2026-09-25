// The ogre (the Butcher's kind since 1.66): a hand-placed pixel unit in the recipe of `PROP_PIXELS`,
// since the Pixel 2.5 atlas has no body for him. A hunched two-legged half-beast a head and a half
// taller than the brute — olive hide, tusks, stub horns, a broken shackle on each wrist, no weapon but
// his fists — and he is the cult's: its red hood with his horns through it, a ragged red mantle over
// his shoulders with the cult's sign on the back, a red loincloth, its red bars on his chest.
// Five views are drawn (front, front-diagonal, side, back-diagonal, back) and mirrored for the other
// three; each in three stances (standing, a stride either way) and two poses (`idle`, and `up` — both
// fists over his head, which is his slam and his crouch, so the blow reads on the body and not only
// on the floor). Render only: nothing in the simulation reads any of this.
const OGRE_PIXELS = (() => {
  const { Grid } = typeof PROP_PIXELS !== 'undefined' ? PROP_PIXELS : require('./prop-pixels.js');
  const P = {
    ol: '#1a1411',
    h0: '#262d22', h1: '#39442f', h2: '#505f41', h3: '#6a7b55', h4: '#8a9a6f',
    k1: '#77795a', k2: '#95966f',
    q0: '#440f13', q1: '#6e191d', q2: '#9c2528', q3: '#c23d36', q4: '#dc6048',
    w0: '#35200f', w1: '#553219', w2: '#744624',
    c0: '#8c8166', c1: '#c6ba98', c2: '#ebe1c4',
    i1: '#303038', i2: '#51505b', i3: '#878692',
    e1: '#f0a832', m: '#170c0a',
  };
  const W = 50, H = 54, FOOT = 52;   // the grid, and the row his soles stand on
  const HIDE = [P.h0, P.h1, P.h2, P.h3, P.h4], DIM = [P.h0, P.h0, P.h1, P.h2, P.h2], RED = [P.q0, P.q1, P.q2, P.q3, P.q4];

  // Every round part of him is its own ball, lit from the upper left the way the atlas lights every
  // unit: a lit cap toward the light, a dark rim away from it. `test` limits it (a hood over a head).
  const lit = (T, dx, dy, n) => {
    const l = -(dx * 0.55 + dy * 0.83);
    return n > 0.82 && l < -0.45 ? T[0] : n > 0.55 && l < -0.2 ? T[1] : n > 0.72 && l > 0.55 ? T[4] : n > 0.4 && l > 0.3 ? T[3] : T[2];
  };
  const vol = (g, cx, cy, rx, ry, dim, T, test) => {
    T = T || (dim ? DIM : HIDE);
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, n = Math.hypot(dx, dy);
      if (n > 1 || (test && !test(x, y))) continue;
      g.set(x, y, lit(T, dx, dy, n));
    }
  };
  const leg = (g, x0, y0, x1, lift, dim, toe) => {
    vol(g, x0, y0 + 1, 5.5, 5, dim);
    g.bar(x0, y0 + 3, x1, FOOT - 4 - lift, 6.5, dim ? P.h1 : P.h2, dim ? null : P.h3, dim ? P.h0 : P.h1);
    g.ell(x1 + toe, FOOT - 2 - lift, 5, 2.6, dim ? P.h0 : P.h1);
    for (const t of [-3, -1, 1]) g.set(x1 + toe + t + Math.sign(toe), FOOT - 1 - lift, P.c0);   // claws
  };
  const shackle = (g, x, y, far) => {
    x = Math.round(x); y = Math.round(y);
    g.rect(x - 3, y, 7, 2, far ? P.i1 : P.i2);
    if (!far) { g.hl(x - 2, y, 3, P.i3); g.set(x + 3, y + 2, P.i2); g.set(x + 3, y + 3, P.i1); }   // a link of the chain he broke
  };
  // One arm from the shoulder to the fist through an elbow; `far` is the arm behind the body.
  const arm = (g, sx, sy, ex, ey, fx, fy, far) => {
    const c = far ? P.h1 : P.h2, lt = far ? null : P.h3, dk = far ? P.h0 : P.h1;
    vol(g, sx, sy, 6, 5.5, far);
    g.bar(sx, sy, ex, ey, 7, c, lt, dk); g.bar(ex, ey, fx, fy, 6, c, lt, dk);
    const l = Math.hypot(fx - ex, fy - ey) || 1;
    shackle(g, fx - (fx - ex) / l * 5.5, fy - (fy - ey) / l * 5.5 - 1, far);
    vol(g, fx, fy, 4.8, 4.3, far);
    g.hl(Math.round(fx - 3), Math.round(fy - 1), 6, dk);   // the knuckles
  };
  // A leather belt all the way round and one red flap hanging from it.
  const loin = (g, cx, y, half, back) => {
    g.poly([[cx - 4, y], [cx + 4, y], [cx + 3, y + 10], [cx + 1, y + 12], [cx - 1, y + 11], [cx - 3, y + 10]], P.q2);
    g.vl(cx - 3, y + 1, 8, P.q3, true); g.vl(cx + 2, y + 1, 9, P.q1, true); g.set(cx, y + 11, P.q1);
    g.rect(cx - half, y - 1, half * 2 + 1, 3, P.w0); g.hl(cx - half + 1, y - 1, half * 2 - 1, P.w2); g.hl(cx - half + 1, y, half * 2 - 1, P.w1);
    if (!back) { g.ell(cx, y, 2.2, 1.8, P.c1); g.set(cx - 1, y, P.m); g.set(cx + 1, y, P.m); }   // a skull for a buckle
  };
  // A stub of a horn, thick at the root and hooking up and out.
  const horn = (g, x, y, dir) => {
    g.bar(x, y, x + dir * 3, y - 2, 3.4, P.c1, P.c2, P.c0); g.bar(x + dir * 3, y - 2, x + dir * 4, y - 5, 2.2, P.c2);
  };
  // The cult's hood, pulled over a head too big for it: the crown and the sides are red, the face
  // looks out of the front, and the point stands up behind the horns.
  const hood = (g, hx, hy, face) => {
    vol(g, hx, hy - 1, 8.5, 7.8, false, RED, (x, y) => !face || y < hy - 3 || Math.abs(x + 0.5 - hx) > 5.5);
    g.poly([[hx - 2, hy - 7], [hx + 2, hy - 7], [hx + 1, hy - 11], [hx - 1, hy - 11]], P.q2); g.vl(hx - 1, hy - 10, 3, P.q3);
    if (face) g.hl(hx - 5, hy - 3, 11, P.q1);   // the lip of the hood over the brow
  };
  // The mantle: red cloth over the shoulders inside his own outline, ragged along the hem. `hem(x)`
  // is the row it hangs down to at each column.
  const mantle = (g, x0, x1, top, hem) => {
    for (let x = x0; x <= x1; x++) {
      const b = hem(x) - ((x * 7) % 3 === 0 ? 1 : 0);
      for (let y = top; y <= b; y++) if (g.get(x, y)) g.set(x, y, y === b ? P.q1 : (x - x0) < 3 || y - top < 2 ? P.q3 : P.q2);
    }
  };
  // The cult's sign on his back: an eye in a triangle, in bone.
  const sigil = (g, cx, y) => {
    g.line(cx, y, cx - 4, y + 7, P.c1); g.line(cx, y, cx + 4, y + 7, P.c1); g.hl(cx - 4, y + 7, 9, P.c1);
    g.hl(cx - 1, y + 4, 3, P.c1); g.set(cx, y + 4, P.m);
  };

  // Front and the front diagonal (`turn` 1: head and gut swung toward his right hand, the far arm
  // tucked behind the gut).
  function front(o, turn) {
    const g = new Grid(W, H), cx = 25 - turn * 2, s = o.step, up = o.pose === 'up', lift = (k) => Math.max(0, k) * 3;
    if (up) arm(g, cx + 12, 23, cx + 14, 13, cx + 5 - turn, 8, true);
    else if (turn) arm(g, cx + 12, 24, cx + 13, 33, cx + 11, 42, true);
    leg(g, cx - 6, 40, cx - 7 - turn, lift(s), false, -turn);
    leg(g, cx + 6, 40, cx + 7 - turn, lift(-s), !!turn, -turn);
    vol(g, cx, 30, 14 - turn, 11);                              // the barrel of him
    g.ell(cx - turn * 3, 34, 9, 7, P.k1);                       // the gut
    g.ell(cx - turn * 3 - 2, 32, 4, 3, P.k2, true);
    vol(g, cx - 12 + turn, 23, 7, 6);                           // the shoulders, higher than his head
    if (!turn) vol(g, cx + 12, 23, 7, 6);
    for (const k of [-3, 0, 3]) g.vl(cx - turn * 3 + k, 26, 3, P.q2, true);   // the cult's bars, painted on
    mantle(g, cx - 19 + turn, cx + 19 - turn, 17, (x) => 22 + Math.round(Math.max(0, 8 - Math.abs(x - cx + turn * 3)) * 0.5));
    loin(g, cx - turn * 2, 38, 10 - turn, false);
    // the head: small, low, sunk between the shoulders and thrust forward
    const hx = cx - turn * 4, hy = 17;
    vol(g, hx, hy, 6.5, 6);
    hood(g, hx, hy, true);
    horn(g, hx - 6, hy - 4, -1); horn(g, hx + 6, hy - 4, 1);
    g.set(hx - 3, hy - 1, P.e1); g.set(hx + 3 - turn, hy - 1, P.e1); g.set(hx - 3, hy - 2, P.m); g.set(hx + 3 - turn, hy - 2, P.m);
    g.set(hx - turn, hy, P.h1); g.set(hx - turn, hy + 1, P.h0);   // nose
    vol(g, hx, hy + 4, 6, 3);                                    // the jaw, jutting
    g.hl(hx - 4, hy + 4, 9, P.m, true); g.hl(hx - 3, hy + 5, 7, P.q1, true);
    g.vl(hx - 4, hy + 1, 3, P.c2); g.vl(hx + 4 - turn, hy + 1, 3, P.c2); g.set(hx - 4, hy + 3, P.c1); g.set(hx + 4 - turn, hy + 3, P.c1);
    if (up) arm(g, cx - 12 + turn, 23, cx - 14 + turn, 13, cx - 5 - turn, 8, false);
    else {
      arm(g, cx - 12 + turn, 24, cx - 14 + turn * 2, 33, cx - 15 + turn * 3, 42 - lift(-s) / 2, false);
      if (!turn) arm(g, cx + 12, 24, cx + 14, 33, cx + 15, 42 - lift(s) / 2, false);
    }
    return g;
  }

  // Side on, facing left: bent over, the head out in front of the shoulders on a thick neck, the hump
  // and the mantle behind; the far leg and arm a tone darker.
  function side(o) {
    const g = new Grid(W, H), s = o.step, up = o.pose === 'up';
    if (up) arm(g, 30, 22, 30, 12, 21, 7, true);
    else arm(g, 30, 23, 31, 32, 29 - s * 2, 41, true);
    leg(g, 30, 39, 30 - s * 2, Math.max(0, -s) * 3, true, -2);
    vol(g, 28, 29, 12, 11);                                     // the barrel
    vol(g, 32, 22, 9, 7);                                       // the hump
    g.ell(21, 33, 6, 7, P.k1); g.ell(20, 31, 3, 3, P.k2, true); // the gut
    for (const k of [0, 3]) g.vl(21 + k, 26, 3, P.q2, true);
    mantle(g, 22, 42, 15, (x) => 22 + Math.round((x - 22) * 0.45));
    sigil(g, 36, 20);
    loin(g, 27, 37, 9, false);
    leg(g, 24, 39, 23 + s * 2, Math.max(0, s) * 3, false, -2);
    vol(g, 21, 21, 6, 5.5);                                     // the neck
    const hx = 15, hy = 19;
    vol(g, hx, hy, 6.5, 6);
    hood(g, hx + 2, hy, false);
    vol(g, hx - 1, hy + 1, 5, 4.5, false, HIDE, (x) => x < hx + 1);   // the face, out of the hood
    horn(g, hx + 3, hy - 5, 1);
    g.set(hx - 3, hy - 1, P.e1); g.set(hx - 3, hy - 2, P.m); g.hl(hx - 5, hy - 3, 5, P.q1);
    vol(g, hx - 3, hy + 3, 5, 3); g.hl(hx - 7, hy + 3, 7, P.m, true); g.hl(hx - 6, hy + 4, 5, P.q1, true);
    g.vl(hx - 6, hy, 3, P.c2); g.set(hx - 6, hy + 2, P.c1);
    if (up) arm(g, 24, 22, 22, 12, 15, 7, false);
    else arm(g, 23, 23, 20, 32, 18 + s, 41, false);
    return g;
  }

  // Back and the back diagonal: the hood and its point, the mantle over the hump with the cult's
  // sign on it, the horns over the top.
  function back(o, turn) {
    const g = new Grid(W, H), cx = 25 - turn * 2, s = o.step, up = o.pose === 'up', lift = (k) => Math.max(0, k) * 3;
    const hx = cx - turn * 3, hy = up ? 18 : 17;
    leg(g, cx - 6, 40, cx - 7 + turn, lift(-s), false, turn);
    leg(g, cx + 6, 40, cx + 7 + turn, lift(s), false, turn);
    vol(g, cx, 29, 14 - turn, 11);
    vol(g, cx, 22, 11 - turn, 6);
    vol(g, cx - 12 + turn, 23, 7, 6);
    vol(g, cx + 12 - turn, 23, 7, 6);
    g.line(cx - 7, 30, cx - 3, 36, P.h1, true); g.line(cx + 7, 30, cx + 3, 36, P.h1, true);
    mantle(g, cx - 19 + turn, cx + 19 - turn, 16, (x) => 33 - Math.round(Math.abs(x - cx) * 0.25));
    sigil(g, cx - turn, 21);
    loin(g, cx, 38, 10, true);
    if (up) {
      arm(g, cx - 12 + turn, 23, cx - 14 + turn, 13, cx - 5, 8, false);
      arm(g, cx + 12 - turn, 23, cx + 14 - turn, 13, cx + 5, 8, false);
    }
    hood(g, hx, hy, false);
    horn(g, hx - 6, hy - 4, -1); horn(g, hx + 6, hy - 4, 1);
    if (!up) {
      arm(g, cx - 12 + turn, 24, cx - 14 + turn, 33, cx - 15 + turn, 42 - lift(s) / 2, false);
      arm(g, cx + 12 - turn, 24, cx + 14 - turn, 33, cx + 15 - turn * 2, 42 - lift(-s) / 2, false);
    }
    return g;
  }

  const finish = (g) => g.outline(P.ol).clean(P.ol);
  // The eight facings `PIXEL_ART.draw` numbers (0 S, 1 SW, 2 W, 3 NW, 4 N, 5 NE, 6 E, 7 SE): five
  // drawn, three of them mirrored.
  const VIEWS = [['front', 0], ['front', 1], ['side', 0], ['back', 1], ['back', 0], ['back', 1, true], ['side', 0, true], ['front', 1, true]];
  const cache = new Map();
  function sprite(d, pose, step) {
    const key = d + pose + step; let v = cache.get(key); if (v) return v;
    const [kind, turn, flip] = VIEWS[d], o = { pose, step };
    const g = finish(kind === 'front' ? front(o, turn) : kind === 'side' ? side(o) : back(o, turn));
    v = { g, flip: !!flip }; cache.set(key, v); return v;
  }
  return { P, W, H, FOOT, sprite, VIEWS };
})();
if (typeof module !== 'undefined') module.exports = OGRE_PIXELS;

// In the page: each sprite baked once to a canvas, `UP` px a texel, and drawn smoothed at `TX` world
// px a texel with his soles on the origin — inside the frame `PaintedArt.character` has already leaned.
if (typeof document !== 'undefined') {
  const UP = 4, baked = new Map();
  OGRE_PIXELS.TX = 1.4;
  OGRE_PIXELS.canvas = (sp) => {
    let c = baked.get(sp); if (c) return c;
    const g = sp.g; c = document.createElement('canvas'); c.width = g.w * UP; c.height = g.h * UP;
    const x = c.getContext('2d');
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const v = g.get(i, j); if (v) { x.fillStyle = v; x.fillRect(i * UP, j * UP, UP, UP); } }
    baked.set(sp, c); return c;
  };
  // `pose` 'up' for the slam and the crouch; walking, a stride one way, standing, the other way.
  OGRE_PIXELS.draw = (ctx, angle, moving, t, x, pose) => {
    const O = OGRE_PIXELS, d = (Math.round(angle / (Math.PI / 4)) + 14) % 8;
    const step = moving && pose !== 'up' ? [0, 1, 0, -1][Math.floor(t * 5 + (x || 0) * 0.05) % 4] : 0;
    const sp = O.sprite(d, pose || 'idle', step), k = O.TX, bob = step ? 0 : moving ? k : 0;
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.save(); if (sp.flip) ctx.scale(-1, 1);
    ctx.drawImage(O.canvas(sp), -O.W / 2 * k, -O.FOOT * k + bob, O.W * k, O.H * k);
    ctx.restore(); ctx.imageSmoothingEnabled = smooth;
  };
}
