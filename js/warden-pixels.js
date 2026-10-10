// THE WARDEN (10 Oct 2026, the user's villain: "Lord Humungus, a hard follower of the meat cult", the B · BONE look of
// output/villain-2026-10-10/phases.png): the man who took the ewe. A hand-placed pixel unit on `PROP_PIXELS.Grid` in the
// ogre's recipe: a bodybuilder in a sawn goat's skull for a mask with the cult's sign painted on its brow, red leather
// X harness studded with bone, the shieldman's board of beast skulls on his left arm, the sawn-off slung over his
// shoulder, a sword's hilt over the other, and at the harness's crossing a small corrupted soul in a ring of bone (the
// user's, 10 Oct 2026: "so it reads as a strong one even in his first form"). FRONT VIEW ONLY so far: he only stands at the head of THE LAST SUPPER and walks out of it (js/endboss.js);
// the eight facings come with his fight (phase one, DESIGN.md there). Poses: `idle`, `raise` (the hand up, the chair
// slid out by it), `carry` (the platter over his head on the way out). Render only. Node-requirable for a sheet.
const WARDEN_PIXELS = (() => {
  const { Grid } = typeof PROP_PIXELS !== 'undefined' ? PROP_PIXELS : require('./prop-pixels.js');
  const OL = '#1a1411', W = 60, H = 76, FOOT = 74, cx = 30;
  const R = {
    skin: ['#5a3222', '#8a5236', '#b87a54', '#d89c70', '#f0c49a'],
    red: ['#440f13', '#6e191d', '#9c2528', '#c23d36', '#dc6048'],
    rlea: ['#2a0c0e', '#4a1418', '#6e1e22', '#8a2a2c', '#a63c38'],
    iron: ['#1e1e24', '#303038', '#51505b', '#878692', '#b4b3bd'],
    bone: ['#6e6650', '#8c8166', '#c6ba98', '#ebe1c4', '#fff7e2'],
    lea: ['#15100d', '#241a14', '#332419', '#44301f', '#55402a'],
    hide: ['#2a170c', '#46280f', '#653a17', '#86512a', '#a46c3c'],
    soul: '#b47cd0', soulHi: '#e6c4ff',
  };
  const lit = (T, dx, dy, n) => { const l = -(dx * 0.55 + dy * 0.83); return n > 0.82 && l < -0.45 ? T[0] : n > 0.55 && l < -0.2 ? T[1] : n > 0.72 && l > 0.55 ? T[4] : n > 0.4 && l > 0.3 ? T[3] : T[2]; };
  const vol = (g, x, y, rx, ry, T, test) => {
    for (let j = Math.floor(y - ry); j <= y + ry; j++) for (let i = Math.floor(x - rx); i <= x + rx; i++) {
      const dx = (i + 0.5 - x) / rx, dy = (j + 0.5 - y) / ry, n = Math.hypot(dx, dy);
      if (n > 1 || (test && !test(i, j))) continue; g.set(i, j, lit(T, dx, dy, n));
    }
  };
  const limb = (g, x0, y0, x1, y1, t, T) => g.bar(x0, y0, x1, y1, t, T[2], T[3], T[1]);
  const dot = (g, x, y, c, s = 1) => { const w = Math.max(1, Math.round(s)); g.rect(Math.round(x - (w - 1) / 2), Math.round(y - (w - 1) / 2), w, w, c); };
  const leg = (g, hx, fx, top, T, w, boot) => { limb(g, hx, top, fx, FOOT - 2, w, T); vol(g, fx, FOOT - 1.6, w * 0.75, 2, T); g.tone((x, y) => y >= FOOT - 7 && Math.abs(x - fx) <= w * 0.8, boot[2], T); g.hl(Math.round(fx - w * 0.6), FOOT - 7, Math.round(w * 1.2), boot[3], true); };
  const arm = (g, sx, sy, ex, ey, fx, fy, T, t) => { vol(g, sx, sy, t * 0.8, t * 0.75, T); limb(g, sx, sy, ex, ey, t, T); vol(g, ex, ey, t * 0.55, t * 0.55, T); limb(g, ex, ey, fx, fy, t * 0.9, T); vol(g, fx, fy, t * 0.7, t * 0.65, T); };
  const bracer = (g, fx, fy, ex, ey, T) => { const mx = (fx + ex) / 2, my = (fy + ey) / 2; g.bar(fx + (ex - fx) * 0.2, fy + (ey - fy) * 0.2, mx + (ex - mx) * 0.4, my + (ey - my) * 0.4, 4.2, T[2], T[3], T[1]); dot(g, mx, my, R.iron[3]); };
  // the shieldman's board: skulls of beasts riveted on a round of iron
  const board = (g, x, y, r) => {
    g.ell(x, y, r, r * 1.05, R.iron[2]); g.ring(x, y, r, r * 1.05, 1, R.iron[1]);
    for (const [ox, oy, s] of [[-r * 0.4, -r * 0.3, 2.2], [r * 0.35, -r * 0.2, 1.9], [0, r * 0.45, 2]]) { vol(g, x + ox, y + oy, s, s * 1.1, R.bone); dot(g, x + ox - 0.7, y + oy - 0.3, '#0d0a0c'); dot(g, x + ox + 0.7, y + oy - 0.3, '#0d0a0c'); }
    for (let a = 0; a < 6.28; a += 0.9) dot(g, x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r * 1.05 - 1), R.iron[4]);
  };
  const belt = (g, y, w, c) => { g.rect(cx - w, y, 2 * w + 1, 2, c[2]); g.hl(cx - w, y, 2 * w + 1, c[3]); for (let x = cx - w + 1; x <= cx + w; x += 3) dot(g, x, y + 1, R.iron[3]); };

  // The one view, in a pose. The right arm (his right, the viewer's left) is the one that rises.
  function front(pose) {
    const g = new Grid(W, H), T = R.skin, up = pose === 'raise' || pose === 'carry';
    leg(g, cx - 5, cx - 8, 52, T, 6.5, R.hide); leg(g, cx + 5, cx + 8, 52, T, 6.5, R.hide);
    // the studded loincloth
    g.poly([[cx - 9, 47], [cx + 9, 47], [cx + 7.5, 55], [cx, 56.5], [cx - 7.5, 55]], R.lea[2]); g.tone((x, y) => x > cx + 2 && y > 47, R.lea[1], [R.lea[2]]); g.hl(cx - 9, 47, 18, R.lea[3]);
    for (let yy = 49; yy < 55; yy += 2.5) for (let x = cx - 7; x < cx + 8; x += 2.5) dot(g, x, yy, R.iron[3]);
    // the torso: abs, the chest, the deltoids
    vol(g, cx, 40, 8.5, 7.5, T); vol(g, cx, 30, 12, 8.5, T);
    g.vl(cx, 31, 10, T[1]); for (const y of [36, 40]) { g.hl(cx - 4, y, 3, T[1]); g.hl(cx + 2, y, 3, T[1]); }
    vol(g, cx - 12, 25, 6, 5.5, T); vol(g, cx + 12, 25, 6, 5.5, T);
    // slung on his back: the gun's barrels up over his left shoulder, a sword's hilt over his right
    g.bar(cx + 14, 22, cx + 12, 13, 2.6, R.iron[2], R.iron[3], R.iron[1]); vol(g, cx + 12, 12, 1.7, 1.7, R.iron); dot(g, cx + 11.5, 12, R.iron[0]); dot(g, cx + 13, 11.5, R.iron[0]);
    g.bar(cx - 14, 22, cx - 12, 12, 2, R.hide[2], R.hide[3], R.hide[1]); g.bar(cx - 15.5, 15, cx - 9, 13.5, 1.6, R.iron[3], R.iron[4], R.iron[2]); vol(g, cx - 11.5, 10.5, 1.6, 1.6, R.iron);   // grip, cross-guard, pommel
    // the arms: the left hangs with the board; the right hangs, or is up with the palm out
    arm(g, cx + 14, 27, cx + 19, 39, cx + 18, 52, T, 5.5); bracer(g, cx + 18, 52, cx + 19, 39, R.lea);
    if (up) {
      arm(g, cx - 14, 27, cx - 20, 20, cx - 17, 7, T, 5.5); bracer(g, cx - 17, 7, cx - 20, 20, R.lea);
      vol(g, cx - 17, 6, 3.8, 3.4, T); for (const [dx, dy] of [[-3, -2.5], [-1.5, -3.5], [0.5, -3.5], [2.5, -2.5]]) limb(g, cx - 17 + dx * 0.6, 5, cx - 17 + dx, 3 + dy, 1.6, T);   // the open hand
    } else arm(g, cx - 14, 27, cx - 19, 39, cx - 18, 50, T, 5.5);
    // the X harness of red leather, studs of bone, the ring where it crosses
    g.bar(cx - 9, 23, cx + 6, 47, 2.6, R.rlea[2], R.rlea[3], R.rlea[1]); g.bar(cx + 9, 23, cx - 6, 47, 2.6, R.rlea[2], R.rlea[3], R.rlea[1]);
    for (let t = 0.12; t < 0.95; t += 0.18) { dot(g, cx - 9 + 15 * t, 23 + 24 * t, R.bone[3]); dot(g, cx + 9 - 15 * t, 23 + 24 * t, R.bone[3]); }
    // where the straps cross, a corrupted soul set in a ring of bone: violet, a white spark in it
    g.ring(cx, 37.4, 3.2, 3.2, 1.2, R.bone[2]); g.ell(cx, 37.4, 2.1, 2.1, R.soul); dot(g, cx - 0.6, 36.8, R.soulHi); dot(g, cx + 0.5, 38, '#6a3d7a');
    belt(g, 46, 10, R.rlea);
    board(g, cx - 20, 44, 6.5);   // on the left arm, which hangs in every pose
    // the neck, the bald head, the strap round it
    vol(g, cx, 19, 3.5, 2.5, T); vol(g, cx, 13, 6, 6.5, T); g.hl(cx - 6, 10, 12, R.rlea[2]);
    // the mask: a goat's skull sawn flat for a face plate, the cult's sign in red on the brow, its horns cut short
    g.poly([[cx - 5, 9], [cx + 5, 9], [cx + 5, 15], [cx + 2.5, 20.5], [cx - 2.5, 20.5], [cx - 5, 15]], R.bone[2]);
    g.tone((x, y) => x > cx + 2 && y > 9, R.bone[1], [R.bone[2]]); g.tone((x, y) => x < cx - 2 && y < 14, R.bone[3], [R.bone[2]]);
    dot(g, cx - 2.5, 12.5, '#0d0a0c', 2); dot(g, cx + 2.5, 12.5, '#0d0a0c', 2); dot(g, cx, 16, R.bone[0]); g.hl(cx - 2, 19, 5, R.bone[0]); for (const x of [cx - 1.5, cx, cx + 1.5]) g.vl(Math.round(x), 18, 1, R.bone[4]);
    g.vl(cx, 9, 3, R.red[3]); g.hl(cx - 1, 10, 3, R.red[3]);
    g.bar(cx - 4, 9, cx - 6, 5, 1.8, R.bone[2], R.bone[3], R.bone[1]); g.bar(cx + 4, 9, cx + 6, 5, 1.8, R.bone[2], R.bone[3], R.bone[1]);
    // the raised hand: the violet off the palm (what slides the chair)
    if (pose === 'raise') for (let i = 0; i < 7; i++) { const a = i * 0.9, r = 4 + (i % 3); dot(g, cx - 17 + Math.cos(a) * r, 3 + Math.sin(a) * r * 0.6, i % 2 ? R.soul : R.soulHi); }
    return g.outline(OL).clean(OL);
  }
  const cache = new Map();
  function sprite(pose) { let g = cache.get(pose); if (!g) { g = front(pose); cache.set(pose, g); } return g; }
  return { W, H, FOOT, sprite };
})();
if (typeof module !== 'undefined') module.exports = WARDEN_PIXELS;

// In the page: baked once to a canvas, `UP` px a texel, drawn smoothed at `TX` world px a texel with his soles on the
// origin, inside the frame `PaintedArt.character` has already leaned. The facing is ignored: one view (see the head).
if (typeof document !== 'undefined') {
  const UP = 4, baked = new Map();
  WARDEN_PIXELS.TX = 0.72;
  WARDEN_PIXELS.canvas = (g) => {
    let c = baked.get(g); if (c) return c;
    c = document.createElement('canvas'); c.width = g.w * UP; c.height = g.h * UP;
    const x = c.getContext('2d');
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const v = g.get(i, j); if (v) { x.fillStyle = v; x.fillRect(i * UP, j * UP, UP, UP); } }
    baked.set(g, c); return c;
  };
  WARDEN_PIXELS.draw = (ctx, angle, moving, t, x, e) => {
    const P = WARDEN_PIXELS, g = P.sprite((e && e.pose) || 'idle'), k = P.TX;
    const step = moving ? [0, 1, 0, -1][Math.floor(t * 5 + (x || 0) * 0.05) % 4] : 0;
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.save(); if (moving) ctx.rotate(step * 0.04);
    ctx.drawImage(P.canvas(g), -P.W / 2 * k, -P.FOOT * k, P.W * k, P.H * k);
    ctx.restore(); ctx.imageSmoothingEnabled = smooth;
  };
}
