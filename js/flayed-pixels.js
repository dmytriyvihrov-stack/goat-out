// THE FLAYED (10 Oct 2026, the user's second phase of the villain, output/villain-2026-10-10/phases.png A · CAGE "with the
// fire fists"): the ogre's own body (js/ogre-pixels.js, every view and stride) with the hide taken off. Each of the ogre's
// sprites is laid again with its colours swapped, hide to meat, the cult's red to dark leather, the eyes violet, fibres
// hashed over the meat, an iron cage over the head and the corrupted soul lit through the chest on the front views. The fire
// off his fists is the game's own particles (`Warden.fistFire`). Render only; node-requirable for a sheet.
const FLAYED_PIXELS = (() => {
  const O = typeof OGRE_PIXELS !== 'undefined' ? OGRE_PIXELS : require('./ogre-pixels.js');
  const { Grid } = typeof PROP_PIXELS !== 'undefined' ? PROP_PIXELS : require('./prop-pixels.js');
  const P = O.P;
  const MEAT = ['#4a1414', '#761f1f', '#a42e2a', '#c74b3e', '#e07060'], SINEW = ['#a88478', '#d0ad9c'];
  const LEA = ['#15100d', '#241a14', '#332419', '#44301f', '#55402a'];
  const IRON = ['#303038', '#51505b', '#878692'], SOUL = '#b47cd0', SOUL_HI = '#e6c4ff', EYE = '#d2a0f0';
  const MAP = {
    [P.h0]: MEAT[0], [P.h1]: MEAT[1], [P.h2]: MEAT[2], [P.h3]: MEAT[3], [P.h4]: MEAT[4],
    [P.k1]: SINEW[0], [P.k2]: SINEW[1],
    [P.q0]: LEA[0], [P.q1]: LEA[1], [P.q2]: LEA[2], [P.q3]: LEA[3], [P.q4]: LEA[4],
    [P.e1]: EYE,
  };
  const hash = (x, y) => ((Math.imul(x + 5, 73856093) ^ Math.imul(y + 3, 19349663)) >>> 0) % 100;
  const cache = new Map();
  function sprite(d, pose, step) {
    const key = d + pose + step; let v = cache.get(key); if (v) return v;
    const src = O.sprite(d, pose, step), g0 = src.g, g = new Grid(g0.w, g0.h);
    let x0 = g0.w, x1 = -1, y0 = g0.h;
    for (let y = 0; y < g0.h; y++) for (let x = 0; x < g0.w; x++) {
      const c = g0.get(x, y); if (!c) continue;
      let m = MAP[c] || c;
      // fibres: short dark strokes and a pale sinew here and there over the meat
      if (MEAT.includes(m)) { const h = hash(x * 3, y); if (h < 22) m = MEAT[0]; else if (h > 93) m = SINEW[1]; }
      g.set(x, y, m);
      if (c !== P.ol) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); }
    }
    // the cage: three bars across the top of him and three down it, over whatever is there
    const hw = Math.max(6, Math.round((x1 - x0) * 0.42)), cx = Math.round((x0 + x1) / 2);
    // (the top rows are the horns: the bars start under them, over the head itself)
    for (const dy of [6, 10, 14]) for (let x = cx - hw; x <= cx + hw; x++) if (g.get(x, y0 + dy)) g.set(x, y0 + dy, dy === 10 ? IRON[2] : IRON[1]);
    for (const dx of [-hw, 0, hw]) for (let y = y0 + 4; y <= y0 + 16; y++) if (g.get(cx + dx, y)) g.set(cx + dx, y, IRON[1]);
    // the soul in the open chest, on the views that show his front
    const front = O.VIEWS[d][0] === 'front';
    if (front) { const sy = O.FOOT - 27; g.ell(cx, sy, 3.6, 3, SOUL, true); g.ell(cx, sy, 1.8, 1.4, SOUL_HI, true); g.ring(cx, sy, 5, 4.2, 1, MEAT[0], true); }
    v = { g, flip: src.flip }; cache.set(key, v); return v;
  }
  return { W: O.W, H: O.H, FOOT: O.FOOT, sprite, VIEWS: O.VIEWS };
})();
if (typeof module !== 'undefined') module.exports = FLAYED_PIXELS;

// In the page: baked and drawn exactly as the ogre is (same size, same strides).
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
