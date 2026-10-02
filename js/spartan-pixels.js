// The shieldman (2 Oct 2026, the user's, twice over: "a bare torso, no club, a shield of bones", then
// "fatter, funnier, square rather than strong and amazing"): a hand-placed pixel unit in the recipe of
// `OGRE_PIXELS`, since the atlas's clubman is a robe and a club. A fat man of the cult with his belly
// out, a bronze helmet a size too small perched on a big round head with a red crest standing up off
// it, a week of stubble, a red cape and a red loincloth, hairy bare legs and bare feet, and no weapon
// but the pile of skulls on his right arm (`PaintedArt.board`, js/prop-pixels.js `boneShield`). The
// man you want to punch. Five views (front, front diagonal, side, back diagonal, back) mirrored for the
// other three, standing or in a stride either way. Render only: nothing in the simulation reads it.
const SPARTAN_PIXELS = (() => {
  const { Grid } = typeof PROP_PIXELS !== 'undefined' ? PROP_PIXELS : require('./prop-pixels.js');
  const P = {
    ol: '#1a110d',
    s0: '#5a3222', s1: '#8a5236', s2: '#b87a54', s3: '#d89c70', s4: '#f0c49a',
    b0: '#4a3113', b1: '#76521d', b2: '#a0752d', b3: '#c49843', b4: '#e0bf6c',
    q0: '#3e0c12', q1: '#681520', q2: '#94222a', q3: '#b8352f', q4: '#d65a40',
    h1: '#7c1620', h2: '#b02a2c', h3: '#de503c',
    d: '#120b0a', hr: '#3e2618', st: '#6e4a36', w: '#efe6d0',
  };
  const W = 36, H = 40, FOOT = 38;   // the grid, and the row his soles stand on
  const SKIN = [P.s0, P.s1, P.s2, P.s3, P.s4], DIM = [P.s0, P.s0, P.s1, P.s2, P.s2], BRONZE = [P.b0, P.b1, P.b2, P.b3, P.b4];
  // Lit from the upper left like every unit: a lit cap toward the light, a dark rim away from it.
  const lit = (T, dx, dy, n) => {
    const l = -(dx * 0.55 + dy * 0.83);
    return n > 0.82 && l < -0.45 ? T[0] : n > 0.55 && l < -0.2 ? T[1] : n > 0.72 && l > 0.55 ? T[4] : n > 0.4 && l > 0.3 ? T[3] : T[2];
  };
  const vol = (g, cx, cy, rx, ry, T, test) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, n = Math.hypot(dx, dy);
      if (n > 1 || (test && !test(x, y))) continue;
      g.set(x, y, lit(T, dx, dy, n));
    }
  };
  // A fixed scatter (a hash, not an RNG, so every bake is the same man): his hair, his stubble.
  const hash = (x, y) => ((Math.imul(x + 5, 73856093) ^ Math.imul(y + 3, 19349663)) >>> 0) % 100;
  const hairy = (g, x0, y0, x1, y1, n, c) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const v = g.get(x, y); if (v && SKIN.includes(v) && hash(x, y) < n) g.set(x, y, c || P.hr); }
  };
  // Leg hair as short strokes, two pixels tall and leaning, so it reads as hair and not as dirt.
  const hairs = (g, x0, y0, x1, y1, n) => {
    for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x++) {
      if (hash(x, y) >= n || !SKIN.includes(g.get(x, y)) || !SKIN.includes(g.get(x + 1, y + 1))) continue;
      g.set(x, y, P.hr); g.set(x + 1, y + 1, P.st);
    }
  };
  // A short thick leg, bare and hairy, and a bare foot with its toes. `lift` raises it in a stride.
  const leg = (g, x0, x1, lift, dim) => {
    g.bar(x0, 29, x1, FOOT - 2 - lift, 5, dim ? P.s1 : P.s2, dim ? null : P.s3, P.s1);
    hairs(g, Math.round(Math.min(x0, x1) - 3), 30, Math.round(Math.max(x0, x1) + 3), FOOT - 4 - lift, 48);
    vol(g, x1, FOOT - 1.2 - lift, 3, 1.5, dim ? DIM : SKIN);
    for (const t of [-2, 0, 2]) g.set(Math.round(x1 + t), FOOT - 1 - lift, P.s1);
  };
  // A chubby arm off the shoulder to the hand through the elbow.
  const arm = (g, sx, sy, ex, ey, fx, fy, dim) => {
    vol(g, sx, sy, 3, 2.8, dim ? DIM : SKIN);
    g.bar(sx, sy, ex, ey, 3.8, dim ? P.s1 : P.s2, dim ? null : P.s3, P.s1);
    g.bar(ex, ey, fx, fy, 3.4, dim ? P.s1 : P.s2, dim ? null : P.s3, P.s1);
    vol(g, fx, fy + 0.5, 2, 1.8, dim ? DIM : SKIN);
  };
  // The cult's red round his middle, a cloth and a cord, never leather. (Less fat, 2 Oct 2026: "a bit less".)
  const loin = (g, cx, half) => {
    g.poly([[cx - half, 26], [cx + half + 1, 26], [cx + half - 1, 32], [cx + 2, 33], [cx - 1, 32], [cx - half + 1, 31]], P.q2);
    g.vl(cx - half + 1, 27, 4, P.q3, true); g.vl(cx + half - 1, 27, 4, P.q1, true); g.hl(cx - half, 26, half * 2 + 1, P.q1);
  };
  // The belly: the biggest ball of him, a navel in it, a dark line where it hangs over the cloth.
  const belly = (g, cx, cy, rx, ry, navel) => {
    vol(g, cx, cy, rx, ry, SKIN);
    if (navel !== null) { g.set(navel, cy + 2, P.s0); g.set(navel, cy + 1, P.s1); }
    for (let x = Math.round(cx - rx + 2); x <= cx + rx - 2; x++) if (g.get(x, Math.round(cy + ry - 1))) g.set(x, Math.round(cy + ry - 1), P.s1);
  };
  // The head: big and round, the helmet a size too small sat on top of it, the face out under it, eyes
  // close together, a nose, a mouth, a week of stubble, and the crest standing up off the helmet.
  const headFront = (g, hx, turn) => {
    vol(g, hx, 8.5, 5.4, 4.8, SKIN);
    hairy(g, hx - 5, 10, hx + 5, 13, 45, P.st);                          // the stubble
    vol(g, hx - turn * 0.5, 5.2, 4.4, 3.3, BRONZE, (x, y) => y <= 6);     // the helmet, perched
    g.hl(Math.round(hx - 4 - turn * 0.5), 6, 9, P.b1); g.hl(Math.round(hx - 3 - turn * 0.5), 3, 4, P.b4, true);
    const ex = hx - turn;
    g.set(ex - 2, 8, P.hr); g.set(ex + 1, 8, P.hr);                       // the brows
    g.set(ex - 2, 9, P.d); g.set(ex + 1, 9, P.d);                         // the eyes
    g.set(ex - 1, 10, P.s1); g.set(ex - 1, 9, P.s3);                      // the nose
    g.hl(ex - 2, 12, 3, P.s0);                                            // the mouth, a flat line
    for (let x = Math.round(hx - turn * 0.5) - 1; x <= Math.round(hx - turn * 0.5) + 1; x++) g.vl(x, 0, 3, P.h2);
    g.vl(Math.round(hx - turn * 0.5) - 1, 0, 2, P.h3); g.set(Math.round(hx - turn * 0.5) + 1, 2, P.h1);
  };

  function front(o, turn) {
    const g = new Grid(W, H), cx = 18, s = o.step, lift = (k) => Math.max(0, k) * 2;
    // the cape behind him, seen at his shoulders and down both sides
    g.poly([[cx - 8, 12], [cx + 8, 12], [cx + 12 - turn, 31], [cx - 12 + turn, 31]], P.q1);
    g.tone((x, y) => x < cx - 7, P.q2, [P.q1]); g.hl(cx - 11, 31, 23, P.q0, true);
    leg(g, cx - 4, cx - 4 - turn, lift(s), false);
    leg(g, cx + 4, cx + 4 - turn, lift(-s), !!turn);
    loin(g, cx - turn, 6);
    vol(g, cx - turn * 0.5, 15.5, 8.5, 4.5, SKIN);                       // the shoulders and chest
    g.hl(cx - 5 - turn, 17, 3, P.s1, true); g.hl(cx + 2 - turn, 17, 3, P.s1, true);
    belly(g, cx - turn, 22, 8.3, 6.4, cx - turn);
    hairy(g, cx - 1 - turn, 16, cx - turn, 18, 60);                       // a tuft on the chest
    arm(g, cx - 9, 14.5, cx - 11 + turn, 19, cx - 11 + turn, 23 - lift(-s) / 2, false);
    arm(g, cx + 9, 14.5, cx + 11 - turn, 19, cx + 11 - turn, 23 - lift(s) / 2, !!turn);
    headFront(g, cx - turn, turn);
    return g;
  }

  // Side on, facing left: the belly out in front of everything, the cape down his back, the nose out
  // under the brim, the crest an arc from brow to nape.
  function side(o) {
    const g = new Grid(W, H), cx = 18, s = o.step;
    g.poly([[cx + 2, 11], [cx + 6, 12], [cx + 10, 31], [cx + 3, 32]], P.q2);
    g.tone((x, y) => x >= cx + 6, P.q1, [P.q2]);
    arm(g, cx + 2, 14.5, cx + 3 + s, 19, cx + 2 + s * 2, 23, true);
    leg(g, cx + 2, cx + 2 + s * 2, Math.max(0, -s) * 2, true);
    loin(g, cx + 1, 4);
    vol(g, cx + 1, 16, 5, 4.5, SKIN);                                     // the chest
    belly(g, cx - 1.5, 22, 6.4, 6.4, null);                               // and what is in front of it
    leg(g, cx - 1, cx - 1 - s * 2, Math.max(0, s) * 2, false);
    // the head in profile: the nose out front, the stubble, the helmet perched, the crest
    vol(g, cx, 8.5, 5, 4.8, SKIN);
    hairy(g, cx - 5, 10, cx + 2, 13, 45, P.st);
    g.set(cx - 5, 9, P.s2); g.set(cx - 6, 10, P.s2); g.set(cx - 5, 10, P.s1);   // the nose
    g.set(cx - 3, 9, P.d); g.set(cx - 3, 8, P.hr); g.hl(cx - 5, 12, 2, P.s0);
    vol(g, cx + 0.5, 5.2, 4.5, 3.3, BRONZE, (x, y) => y <= 6);
    g.hl(cx - 4, 6, 9, P.b1); g.hl(cx - 2, 3, 4, P.b4, true);
    for (const [x, y0] of [[cx - 3, 2], [cx - 2, 1], [cx - 1, 0], [cx, 0], [cx + 1, 0], [cx + 2, 0], [cx + 3, 1], [cx + 4, 2]]) g.vl(x, y0, 3, P.h2);
    g.hl(cx - 1, 0, 4, P.h3); g.tone((x, y) => y >= 2 && x >= cx + 2, P.h1, [P.h2]);
    arm(g, cx - 1, 14.5, cx - 2 - s, 19, cx - 1 - s * 2, 23, false);
    return g;
  }

  // Back and the back diagonal: the cape over his back, his sides out past it both ways (he is wider
  // than the cape), the helmet on the back of his head and the crest down its middle.
  function back(o, turn) {
    const g = new Grid(W, H), cx = 18, s = o.step, lift = (k) => Math.max(0, k) * 2;
    leg(g, cx - 4, cx - 4 + turn, lift(-s), false);
    leg(g, cx + 4, cx + 4 + turn, lift(s), false);
    loin(g, cx + turn, 6);
    vol(g, cx, 21, 8.8, 7, SKIN);                                          // the back of him, wide
    arm(g, cx - 9 + turn, 14.5, cx - 11 + turn, 19, cx - 11 + turn, 23 - lift(s) / 2, false);
    arm(g, cx + 9, 14.5, cx + 11, 19, cx + 11, 23 - lift(-s) / 2, false);
    g.poly([[cx - 6 + turn, 11], [cx + 6, 11], [cx + 8, 28], [cx + 3, 29], [cx, 28], [cx - 3, 29], [cx - 8 + turn, 28]], P.q2);
    for (const x of [cx - 4, cx, cx + 4]) g.line(x, 14, x + Math.sign(x - cx), 27, P.q1, true);
    g.hl(cx - 5 + turn, 11, 11 - turn, P.q3, true);
    const hx = cx + turn;
    vol(g, hx, 8.5, 5.4, 4.8, SKIN); hairy(g, hx - 5, 11, hx + 5, 13, 25, P.hr);
    vol(g, hx, 5.4, 4.6, 3.4, BRONZE, (x, y) => y <= 7);
    g.hl(hx - 4, 7, 9, P.b1); g.tone((x, y) => y <= 4, P.b3, [P.b2]);
    for (let x = hx - 1; x <= hx + 1; x++) g.vl(x, 0, 4, P.h2);
    g.vl(hx, 0, 3, P.h3); g.vl(hx + 1, 1, 3, P.h1);
    return g;
  }

  const finish = (g) => g.outline(P.ol).clean(P.ol);
  // The eight facings `PIXEL_ART.draw` numbers (0 S, 1 SW, 2 W, 3 NW, 4 N, 5 NE, 6 E, 7 SE).
  const VIEWS = [['front', 0], ['front', 1], ['side', 0], ['back', 1], ['back', 0], ['back', 1, true], ['side', 0, true], ['front', 1, true]];
  const cache = new Map();
  function sprite(d, step) {
    const key = d + ':' + step; let v = cache.get(key); if (v) return v;
    const [kind, turn, flip] = VIEWS[d], o = { step };
    const g = finish(kind === 'front' ? front(o, turn) : kind === 'side' ? side(o) : back(o, turn));
    v = { g, flip: !!flip }; cache.set(key, v); return v;
  }
  return { P, W, H, FOOT, sprite, VIEWS };
})();
if (typeof module !== 'undefined') module.exports = SPARTAN_PIXELS;

// In the page: each sprite baked once to a canvas, `UP` px a texel, drawn smoothed at `TX` world px a
// texel with his soles on the origin, inside the frame `PaintedArt.character` has already leaned.
if (typeof document !== 'undefined') {
  const UP = 4, baked = new Map();
  SPARTAN_PIXELS.TX = 0.92;
  SPARTAN_PIXELS.canvas = (sp) => {
    let c = baked.get(sp); if (c) return c;
    const g = sp.g; c = document.createElement('canvas'); c.width = g.w * UP; c.height = g.h * UP;
    const x = c.getContext('2d');
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const v = g.get(i, j); if (v) { x.fillStyle = v; x.fillRect(i * UP, j * UP, UP, UP); } }
    baked.set(sp, c); return c;
  };
  // A fat man waddles: his stride is slower than a clubman's and he rocks from foot to foot with it.
  SPARTAN_PIXELS.draw = (ctx, angle, moving, t, x) => {
    const S = SPARTAN_PIXELS, d = (Math.round(angle / (Math.PI / 4)) % 8 + 14) % 8;
    const ph = Math.floor(t * 5 + (x || 0) * 0.05) % 4, step = moving ? [0, 1, 0, -1][ph] : 0;
    const sp = S.sprite(d, step), k = S.TX;
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.save(); if (moving) ctx.rotate(step * 0.06); if (sp.flip) ctx.scale(-1, 1);
    ctx.drawImage(S.canvas(sp), -S.W / 2 * k, -S.FOOT * k, S.W * k, S.H * k);
    ctx.restore(); ctx.imageSmoothingEnabled = smooth;
  };
}
