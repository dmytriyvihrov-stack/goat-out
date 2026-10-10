// THE FLAYED (10 Oct 2026, the user's second phase of the villain, output/villain-2026-10-10/phases.png A · CAGE "with the fire
// fists"): the Warden with the soul swallowed and the skin off. A hand-placed pixel unit of his own in the ogre's recipe
// (js/ogre-pixels.js: five views mirrored to eight, a stride, the `up` pose with the fists overhead for the slam and the
// crouch), a size over the ogre. Meat with the fibres hashed in and sinew pale at every joint, lidless violet eyes and teeth
// with no lips, an iron cage bolted round the head, the ribs showing, and what he kept of the man: the red X harness
// stitched into the chest with the soul lit at its crossing, now the size of a fist, the studded loincloth, the hide boots.
// The fire off his fists is the game's own particles (`Warden.fistFire`). Render only; node-requirable for a sheet.
const FLAYED_PIXELS = (() => {
  const { Grid } = typeof PROP_PIXELS !== 'undefined' ? PROP_PIXELS : require('./prop-pixels.js');
  const OL = '#1a1411', W = 54, H = 62, FOOT = 60;
  const MEAT = ['#4a1414', '#761f1f', '#a42e2a', '#c74b3e', '#e07060'], DIM = ['#3a0e0e', '#5a1818', '#7a2222', '#962c28', '#a43030'];
  const SINEW = ['#7a5a52', '#a88478', '#d0ad9c', '#e8cdbd', '#fbeadf'];
  const RLEA = ['#2a0c0e', '#4a1418', '#6e1e22', '#8a2a2c', '#a63c38'], LEA = ['#15100d', '#241a14', '#332419', '#44301f', '#55402a'];
  const HIDE = ['#2a170c', '#46280f', '#653a17', '#86512a', '#a46c3c'], IRON = ['#1e1e24', '#303038', '#51505b', '#878692', '#b4b3bd'];
  const BONE = ['#6e6650', '#8c8166', '#c6ba98', '#ebe1c4', '#fff7e2'];
  const SOUL = '#b47cd0', SOUL_HI = '#e6c4ff', SOUL_DK = '#6a3d7a', EYE = '#d2a0f0', MOUTH = '#1a0608';
  const lit = (T, dx, dy, n) => { const l = -(dx * 0.55 + dy * 0.83); return n > 0.82 && l < -0.45 ? T[0] : n > 0.55 && l < -0.2 ? T[1] : n > 0.72 && l > 0.55 ? T[4] : n > 0.4 && l > 0.3 ? T[3] : T[2]; };
  const vol = (g, x, y, rx, ry, T, test) => {
    for (let j = Math.floor(y - ry); j <= y + ry; j++) for (let i = Math.floor(x - rx); i <= x + rx; i++) {
      const dx = (i + 0.5 - x) / rx, dy = (j + 0.5 - y) / ry, n = Math.hypot(dx, dy);
      if (n > 1 || (test && !test(i, j))) continue; g.set(i, j, lit(T, dx, dy, n));
    }
  };
  const hash = (x, y) => ((Math.imul(x + 5, 73856093) ^ Math.imul(y + 3, 19349663)) >>> 0) % 100;
  const dot = (g, x, y, c, s = 1) => { const w = Math.max(1, Math.round(s)); g.rect(Math.round(x - (w - 1) / 2), Math.round(y - (w - 1) / 2), w, w, c); };
  const limb = (g, x0, y0, x1, y1, t, T) => g.bar(x0, y0, x1, y1, t, T[2], T[3], T[1]);
  // the fibres: dark strokes and pale sinew hashed over every meat pixel, laid last over the body
  const fibres = (g) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = g.get(x, y); if (!MEAT.includes(c) && !DIM.includes(c)) continue; const h = hash(x * 3, y); if (h < 13) g.set(x, y, (DIM.includes(c) ? DIM : MEAT)[0]); else if (h > 96) g.set(x, y, SINEW[2]); } };
  const joint = (g, x, y, r) => g.ell(x, y, r, r * 0.8, SINEW[3], true);
  // A leg from the hip to the sole, the foot in a hide boot, `lift` px up on a stride.
  const leg = (g, hx, fx, top, T, w, lift = 0, toe = 0) => {
    limb(g, hx, top, fx, FOOT - 3 - lift, w, T); joint(g, (hx + fx) / 2, (top + FOOT - 3 - lift) / 2, 2.2);
    g.ell(fx + toe, FOOT - 1.8 - lift, w * 0.9, 2.6, HIDE[2]); g.ell(fx + toe, FOOT - 2.6 - lift, w * 0.7, 1.4, HIDE[3]);
    g.rect(Math.round(fx - w * 0.6), FOOT - 7 - lift, Math.round(w * 1.2), 3, HIDE[1]);
  };
  // One arm from the shoulder through the elbow to a fist as big as his head; `T` the meat (dim when far).
  const arm = (g, sx, sy, ex, ey, fx, fy, T) => {
    vol(g, sx, sy, 7, 6.5, T); limb(g, sx, sy, ex, ey, 8, T); joint(g, ex, ey, 2.6); limb(g, ex, ey, fx, fy, 7.5, T);
    vol(g, fx, fy, 6, 5.5, T); const l = Math.hypot(fx - ex, fy - ey) || 1, ux = (fx - ex) / l, uy = (fy - ey) / l;
    for (const k of [-3, -1, 1, 3]) dot(g, fx + k * -uy * 0.9 + ux * 3.5, fy + k * ux * 0.9 + uy * 3.5, SINEW[3]);   // the knuckles, pale
  };
  const loin = (g, cx, y, w) => { g.poly([[cx - w, y], [cx + w, y], [cx + w - 2, y + 9], [cx, y + 11], [cx - w + 2, y + 9]], LEA[2]); g.tone((x, yy) => x > cx + 2 && yy > y && yy < y + 12 && Math.abs(x - cx) <= w, LEA[1], [LEA[2]]); g.rect(cx - w, y - 1, 2 * w + 1, 2, RLEA[2]); g.hl(cx - w, y - 1, 2 * w + 1, RLEA[3]); for (let yy = y + 2; yy < y + 9; yy += 2.5) for (let x = cx - w + 2; x < cx + w - 1; x += 2.5) dot(g, x, yy, IRON[3]); };
  // The harness he kept: two straps crossing, studs of bone, the soul big at the crossing (`soul`), or the straps alone on his back.
  const harness = (g, cx, y0, y1, soul) => {
    g.bar(cx - 11, y0, cx + 8, y1, 2.8, RLEA[2], RLEA[3], RLEA[1]); g.bar(cx + 11, y0, cx - 8, y1, 2.8, RLEA[2], RLEA[3], RLEA[1]);
    for (let t = 0.1; t < 0.95; t += 0.16) { dot(g, cx - 11 + 19 * t, y0 + (y1 - y0) * t, BONE[3]); dot(g, cx + 11 - 19 * t, y0 + (y1 - y0) * t, BONE[3]); }
    const my = y0 + (y1 - y0) * 0.58;
    if (soul) { g.ring(cx, my, 5, 4.6, 1.4, BONE[2]); g.ell(cx, my, 3.6, 3.2, SOUL); g.ell(cx - 0.8, my - 0.8, 1.6, 1.3, SOUL_HI); dot(g, cx + 1.5, my + 1.5, SOUL_DK); }
  };
  // The ribs showing through the chest, three arcs a side, pale.
  const ribs = (g, cx, y) => { for (let k = 0; k < 3; k++) { g.hl(cx - 9, y + k * 3, 5, SINEW[1], true); g.hl(cx + 5, y + k * 3, 5, SINEW[1], true); } };
  // The cage: bars across and down round the head, a ring at the top, bolts at the corners.
  const cage = (g, hx, hy, w, h) => {
    for (const dy of [-h * 0.55, 0, h * 0.55]) for (let x = hx - w; x <= hx + w; x++) if (g.get(x, Math.round(hy + dy))) g.set(x, Math.round(hy + dy), dy === 0 ? IRON[3] : IRON[2]);
    for (const dx of [-w, 0, w]) for (let y = hy - h; y <= hy + h; y++) if (g.get(Math.round(hx + dx), y)) g.set(Math.round(hx + dx), y, IRON[2]);
    g.hl(Math.round(hx - w), Math.round(hy - h), Math.round(2 * w + 1), IRON[3]);
    for (const [dx, dy] of [[-w, -h * 0.55], [w, -h * 0.55], [-w, h * 0.55], [w, h * 0.55]]) dot(g, hx + dx, hy + dy, IRON[4]);
  };
  // The head: a ball of meat sunk between the shoulders, lidless eyes, the teeth, in its cage. `face` 1 front, 0 back, -1 side.
  const head = (g, hx, hy, face, turn = 0) => {
    vol(g, hx, hy, 7, 6.5, MEAT);
    if (face === 1) {
      dot(g, hx - 3 - turn, hy - 1, SINEW[4], 2); dot(g, hx + 3 - turn, hy - 1, SINEW[4], 2); dot(g, hx - 3 - turn, hy - 1, EYE); dot(g, hx + 3 - turn, hy - 1, EYE);
      g.hl(hx - 4 - turn, hy + 3, 9, MOUTH); for (let x = hx - 4 - turn; x <= hx + 4 - turn; x += 1.5) g.vl(Math.round(x), hy + 2, 1, SINEW[4]); for (let x = hx - 3.5 - turn; x <= hx + 4 - turn; x += 1.5) g.vl(Math.round(x), hy + 4, 1, SINEW[4]);
    } else if (face === -1) {
      dot(g, hx - 4, hy - 1, SINEW[4], 2); dot(g, hx - 4, hy - 1, EYE); g.hl(hx - 7, hy + 3, 6, MOUTH); for (let x = hx - 7; x <= hx - 2; x += 1.5) g.vl(Math.round(x), hy + 2, 1, SINEW[4]);
    }
    cage(g, hx - (face === -1 ? 1 : 0), hy, 8, 7);
  };

  // Front and the front diagonal (`turn` 1: the head and the chest swung toward his right hand).
  function front(o, turn) {
    const g = new Grid(W, H), cx = 27 - turn * 2, s = o.step, up = o.pose === 'up', lift = (k) => Math.max(0, k) * 3;
    if (up) arm(g, cx + 14 - turn, 24, cx + 19 - turn, 14, cx + 9 - turn, 6, DIM);
    else if (turn) arm(g, cx + 13, 25, cx + 16, 37, cx + 13, 49, DIM);
    leg(g, cx - 7, cx - 8 - turn, 42, MEAT, 8, lift(s), -turn); leg(g, cx + 7, cx + 8 - turn, 42, MEAT, 8, lift(-s), -turn);
    loin(g, cx - turn, 41, 11 - turn);
    vol(g, cx - turn, 36, 11, 8, MEAT);                                   // the gut
    vol(g, cx, 28, 15 - turn, 11, MEAT);                                  // the barrel of him
    ribs(g, cx - turn * 2, 22);
    harness(g, cx - turn, 19, 44, true);
    vol(g, cx - 14 + turn, 21, 7.5, 6.5, MEAT); if (!turn) vol(g, cx + 14, 21, 7.5, 6.5, MEAT);   // the shoulders, over his head
    head(g, cx - turn * 3, 14, 1, turn);
    if (up) arm(g, cx - 14 + turn, 24, cx - 19 + turn, 14, cx - 9 + turn, 6, MEAT);
    else {
      arm(g, cx - 14 + turn, 25, cx - 18 + turn * 2, 37, cx - 16 + turn * 3, 49 - lift(-s) / 2, MEAT);
      if (!turn) arm(g, cx + 14, 25, cx + 18, 37, cx + 16, 49 - lift(s) / 2, MEAT);
    }
    fibres(g);
    return g;
  }
  // Side on, facing left: hunched, the head out in front of the shoulders, the far arm and leg a tone darker.
  function side(o) {
    const g = new Grid(W, H), s = o.step, up = o.pose === 'up';
    if (up) arm(g, 32, 22, 33, 12, 24, 5, DIM); else arm(g, 32, 24, 34, 36, 31 - s * 2, 48, DIM);
    leg(g, 32, 42, 32 - s * 3, DIM, 7.5, Math.max(0, -s) * 3, -2);
    vol(g, 29, 28, 13, 12, MEAT); vol(g, 34, 20, 9, 7, MEAT);           // the barrel and the hump
    vol(g, 21, 35, 7, 8, MEAT);                                           // the gut
    g.bar(16, 22, 36, 44, 2.8, RLEA[2], RLEA[3], RLEA[1]); for (let t = 0.1; t < 0.95; t += 0.16) dot(g, 16 + 20 * t, 22 + 22 * t, BONE[3]);   // one strap seen
    for (let k = 0; k < 3; k++) g.vl(37, 24 + k * 4, 2, SINEW[1]);      // the spine's knobs
    loin(g, 27, 40, 9);
    leg(g, 25, 42, 24 + s * 3, MEAT, 7.5, Math.max(0, s) * 3, -2);
    vol(g, 20, 19, 6, 5.5, MEAT);                                         // the neck
    head(g, 14, 17, -1);
    if (up) arm(g, 25, 21, 24, 11, 17, 5, MEAT); else arm(g, 24, 23, 21, 36, 19 + s, 48, MEAT);
    fibres(g);
    return g;
  }
  // Back and the back diagonal: the spine, the straps crossing on his back, the cage from behind.
  function back(o, turn) {
    const g = new Grid(W, H), cx = 27 + turn * 2, s = o.step, up = o.pose === 'up', lift = (k) => Math.max(0, k) * 3;
    if (up) { arm(g, cx - 14 + turn, 24, cx - 19 + turn, 14, cx - 9 + turn, 6, MEAT); arm(g, cx + 14 - turn, 24, cx + 19 - turn, 14, cx + 9 - turn, 6, MEAT); }
    else { arm(g, cx - 14 + turn, 25, cx - 18 + turn * 2, 37, cx - 16 + turn * 3, 49 - lift(s) / 2, MEAT); arm(g, cx + 14 - turn, 25, cx + 18 - turn * 2, 37, cx + 16 - turn * 3, 49 - lift(-s) / 2, MEAT); }
    leg(g, cx - 7, cx - 8 + turn, 42, MEAT, 8, lift(-s), turn); leg(g, cx + 7, cx + 8 + turn, 42, MEAT, 8, lift(s), turn);
    loin(g, cx + turn, 41, 11 - turn);
    vol(g, cx, 28, 15 - turn, 11, MEAT); vol(g, cx + turn, 20, 11 - turn, 7, MEAT);
    for (let k = 0; k < 5; k++) g.hl(cx + turn * 2 - 1, 20 + k * 4, 3, SINEW[1]);   // the spine
    harness(g, cx + turn, 19, 44, false);
    vol(g, cx - 14 + turn, 21, 7.5, 6.5, MEAT); vol(g, cx + 14 - turn, 21, 7.5, 6.5, MEAT);
    head(g, cx + turn * 3, 14, 0);
    if (turn) { dot(g, cx + turn * 3 - 6, 13, SINEW[4], 2); dot(g, cx + turn * 3 - 6, 13, EYE); }   // the diagonal: one eye past his cheek
    fibres(g);
    return g;
  }

  const finish = (g) => g.outline(OL).clean(OL);
  const VIEWS = [['front', 0], ['front', 1], ['side', 0], ['back', 1], ['back', 0], ['back', 1, true], ['side', 0, true], ['front', 1, true]];
  const cache = new Map();
  function sprite(d, pose, step) {
    const key = d + pose + step; let v = cache.get(key); if (v) return v;
    const [kind, turn, flip] = VIEWS[d], o = { pose: pose || 'idle', step: step || 0 };
    const g = finish(kind === 'front' ? front(o, turn) : kind === 'side' ? side(o) : back(o, turn));
    v = { g, flip: !!flip }; cache.set(key, v); return v;
  }
  return { W, H, FOOT, sprite, VIEWS };
})();
if (typeof module !== 'undefined') module.exports = FLAYED_PIXELS;

// In the page: baked and drawn as the ogre is, a size over him (`TX`), the `up` pose through a slam or a leap.
if (typeof document !== 'undefined') {
  const UP = 4, baked = new Map();
  FLAYED_PIXELS.TX = 1.4;
  FLAYED_PIXELS.canvas = (sp) => {
    let c = baked.get(sp); if (c) return c;
    const g = sp.g; c = document.createElement('canvas'); c.width = g.w * UP; c.height = g.h * UP;
    const x = c.getContext('2d');
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const v = g.get(i, j); if (v) { x.fillStyle = v; x.fillRect(i * UP, j * UP, UP, UP); } }
    baked.set(sp, c); return c;
  };
  FLAYED_PIXELS.draw = (ctx, angle, moving, t, x, pose) => {
    const F = FLAYED_PIXELS, d = (Math.round(angle / (Math.PI / 4)) + 14) % 8;
    const step = moving && pose !== 'up' ? [0, 1, 0, -1][Math.floor(t * 5 + (x || 0) * 0.05) % 4] : 0;
    const sp = F.sprite(d, pose || 'idle', step), k = F.TX, bob = step ? 0 : moving ? k : 0;
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.save(); if (sp.flip) ctx.scale(-1, 1);
    ctx.drawImage(F.canvas(sp), -F.W / 2 * k, -F.FOOT * k + bob, F.W * k, F.H * k);
    ctx.restore(); ctx.imageSmoothingEnabled = smooth;
  };
}
