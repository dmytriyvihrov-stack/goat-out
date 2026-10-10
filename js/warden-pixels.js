// THE WARDEN (10 Oct 2026, the user's villain: "Lord Humungus, a hard follower of the meat cult", the B · BONE look of
// output/villain-2026-10-10/phases.png): the man who took the ewe. A hand-placed pixel unit on `PROP_PIXELS.Grid` in the
// ogre's recipe (js/ogre-pixels.js): a bodybuilder in a sawn goat's skull for a mask with the cult's sign painted on its
// brow, red leather X harness studded with bone and a small corrupted soul set where it crosses (the user's, so he reads
// as a strong one in his first form), the shieldman's board of beast skulls on his LEFT arm, the sawn-off slung over his
// left shoulder and a sword's hilt over his right. Five views drawn (front, front diagonal, side, back diagonal, back)
// and mirrored for the other three; the mirrored views draw the board and the sword on the other arm first, so he is
// right-handed from every side. Three stances (standing, a stride either way) and the poses `idle`, `raise` (the right
// hand up: the chair slid out by it, js/endboss.js), `carry` (the same hand up under the platter), `windup` (the sword
// drawn back), `swing` (the sword out), `aim` (the gun at the shoulder) off `e.state` (js/warden.js). Render only;
// node-requirable for a sheet (output/villain-2026-10-10/ingame.cjs).
const WARDEN_PIXELS = (() => {
  const { Grid } = typeof PROP_PIXELS !== 'undefined' ? PROP_PIXELS : require('./prop-pixels.js');
  const OL = '#1a1411', W = 60, H = 76, FOOT = 74;
  const R = {
    skin: ['#5a3222', '#8a5236', '#b87a54', '#d89c70', '#f0c49a'],
    dim: ['#4a2a1c', '#6e4028', '#8e5a3a', '#a86c48', '#b87a54'],
    red: ['#440f13', '#6e191d', '#9c2528', '#c23d36', '#dc6048'],
    rlea: ['#2a0c0e', '#4a1418', '#6e1e22', '#8a2a2c', '#a63c38'],
    iron: ['#1e1e24', '#303038', '#51505b', '#878692', '#b4b3bd'],
    bone: ['#6e6650', '#8c8166', '#c6ba98', '#ebe1c4', '#fff7e2'],
    lea: ['#15100d', '#241a14', '#332419', '#44301f', '#55402a'],
    hide: ['#2a170c', '#46280f', '#653a17', '#86512a', '#a46c3c'],
    soul: '#b47cd0', soulHi: '#e6c4ff', soulDk: '#6a3d7a', eye: '#0d0a0c',
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
  // A leg from the hip to the sole, `lift` px off the floor on a stride; a boot of hide over the shin.
  const leg = (g, hx, fx, top, T, w, lift = 0) => {
    limb(g, hx, top, fx, FOOT - 2 - lift, w, T); vol(g, fx, FOOT - 1.6 - lift, w * 0.75, 2, T);
    g.tone((x, y) => y >= FOOT - 7 - lift && y <= FOOT - lift && Math.abs(x - fx) <= w * 0.8, R.hide[2], T); g.hl(Math.round(fx - w * 0.6), FOOT - 7 - lift, Math.round(w * 1.2), R.hide[3], true);
  };
  const arm = (g, sx, sy, ex, ey, fx, fy, T, t) => { vol(g, sx, sy, t * 0.8, t * 0.75, T); limb(g, sx, sy, ex, ey, t, T); vol(g, ex, ey, t * 0.55, t * 0.55, T); limb(g, ex, ey, fx, fy, t * 0.9, T); vol(g, fx, fy, t * 0.7, t * 0.65, T); };
  const bracer = (g, fx, fy, ex, ey) => { const T = R.lea, mx = (fx + ex) / 2, my = (fy + ey) / 2; g.bar(fx + (ex - fx) * 0.2, fy + (ey - fy) * 0.2, mx + (ex - mx) * 0.4, my + (ey - my) * 0.4, 4.2, T[2], T[3], T[1]); dot(g, mx, my, R.iron[3]); };
  // The board: skulls of beasts riveted on a round of iron; `edge` draws it edge-on (seen from the side or behind).
  const board = (g, x, y, r, edge) => {
    if (edge) { g.bar(x, y - r, x, y + r, 3, R.iron[2], R.iron[3], R.iron[1]); for (let k = -r + 2; k < r; k += 3) dot(g, x, y + k, R.iron[4]); return; }
    g.ell(x, y, r, r * 1.05, R.iron[2]); g.ring(x, y, r, r * 1.05, 1, R.iron[1]);
    for (const [ox, oy, s] of [[-r * 0.4, -r * 0.3, 2.2], [r * 0.35, -r * 0.2, 1.9], [0, r * 0.45, 2]]) { vol(g, x + ox, y + oy, s, s * 1.1, R.bone); dot(g, x + ox - 0.7, y + oy - 0.3, R.eye); dot(g, x + ox + 0.7, y + oy - 0.3, R.eye); }
    for (let a = 0; a < 6.28; a += 0.9) dot(g, x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r * 1.05 - 1), R.iron[4]);
  };
  // The sword: a blade of iron from the grip at (x0, y0) toward (x1, y1), its guard across the grip.
  const sword = (g, x0, y0, x1, y1) => {
    const l = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / l, uy = (y1 - y0) / l;
    g.bar(x0 - ux * 3, y0 - uy * 3, x0, y0, 2, R.hide[2], R.hide[3], R.hide[1]); vol(g, x0 - ux * 4, y0 - uy * 4, 1.5, 1.5, R.iron);
    g.bar(x0 - uy * 2.5, y0 + ux * 2.5, x0 + uy * 2.5, y0 - ux * 2.5, 1.6, R.iron[3], R.iron[4], R.iron[2]);
    g.bar(x0, y0, x1, y1, 2.6, R.iron[3], R.iron[4], R.iron[2]); dot(g, x1, y1, R.iron[4]);
  };
  // The sawn-off: two short barrels and a stock of wood; held from (x0, y0) toward (x1, y1).
  const gun = (g, x0, y0, x1, y1) => {
    const l = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / l, uy = (y1 - y0) / l;
    g.bar(x0 - ux * 4, y0 - uy * 4, x0, y0, 3, R.hide[2], R.hide[3], R.hide[1]);
    g.bar(x0, y0, x1, y1, 3, R.iron[2], R.iron[3], R.iron[1]); dot(g, x1 - uy * 0.8, y1 + ux * 0.8, R.iron[0]); dot(g, x1 + uy * 0.8, y1 - ux * 0.8, R.iron[0]);
  };
  const belt = (g, cx, y, w) => { const c = R.rlea; g.rect(cx - w, y, 2 * w + 1, 2, c[2]); g.hl(cx - w, y, 2 * w + 1, c[3]); for (let x = cx - w + 1; x <= cx + w; x += 3) dot(g, x, y + 1, R.iron[3]); };
  const loin = (g, cx, y, w, h) => { const T = R.lea; g.poly([[cx - w, y], [cx + w, y], [cx + w - 1.5, y + h], [cx, y + h + 1.5], [cx - w + 1.5, y + h]], T[2]); g.tone((x, yy) => x > cx + 2 && yy > y && yy <= y + h + 2 && Math.abs(x - cx) <= w, T[1], [T[2]]); g.hl(cx - w, y, 2 * w, T[3]); for (let yy = y + 2; yy < y + h; yy += 2.5) for (let x = cx - w + 2; x < cx + w - 1; x += 2.5) dot(g, x, yy, R.iron[3]); };
  // The harness: two straps crossing on the chest (or the back), studs of bone, and on the chest the soul in its ring.
  const harness = (g, cx, y0, y1, soul) => {
    const T = R.rlea; g.bar(cx - 9, y0, cx + 6, y1, 2.6, T[2], T[3], T[1]); g.bar(cx + 9, y0, cx - 6, y1, 2.6, T[2], T[3], T[1]);
    for (let t = 0.12; t < 0.95; t += 0.18) { dot(g, cx - 9 + 15 * t, y0 + (y1 - y0) * t, R.bone[3]); dot(g, cx + 9 - 15 * t, y0 + (y1 - y0) * t, R.bone[3]); }
    const my = y0 + (y1 - y0) * 0.6;
    if (soul) { g.ring(cx, my, 3.2, 3.2, 1.2, R.bone[2]); g.ell(cx, my, 2.1, 2.1, R.soul); dot(g, cx - 0.6, my - 0.6, R.soulHi); dot(g, cx + 0.5, my + 0.6, R.soulDk); }
    else g.ring(cx, my, 2.4, 2.4, 1, R.iron[3]);
  };
  // The mask: a goat's skull sawn flat for a face plate, the sign in red on the brow, its horns cut short. `turn` swings it.
  const mask = (g, cx, cy, turn) => {
    g.poly([[cx - 5, cy - 4], [cx + 5, cy - 4], [cx + 5, cy + 2], [cx + 2.5, cy + 7.5], [cx - 2.5, cy + 7.5], [cx - 5, cy + 2]], R.bone[2]);
    g.tone((x, y) => x > cx + 2 && y > cy - 4 && y < cy + 8 && Math.abs(x - cx) <= 5, R.bone[1], [R.bone[2]]); g.tone((x, y) => x < cx - 2 && y < cy + 1 && y > cy - 5 && Math.abs(x - cx) <= 5, R.bone[3], [R.bone[2]]);
    dot(g, cx - 2.5 - turn * 0.5, cy - 0.5, R.eye, 2); dot(g, cx + 2.5 - turn, cy - 0.5, R.eye, 2); dot(g, cx - turn * 0.5, cy + 3, R.bone[0]); g.hl(cx - 2, cy + 6, 5, R.bone[0]); for (const x of [cx - 1.5, cx, cx + 1.5]) g.vl(Math.round(x), cy + 5, 1, R.bone[4]);
    g.vl(cx - turn * 0.5, cy - 4, 3, R.red[3]); g.hl(cx - 1 - turn * 0.5, cy - 3, 3, R.red[3]);
    g.bar(cx - 4, cy - 4, cx - 6, cy - 8, 1.8, R.bone[2], R.bone[3], R.bone[1]); g.bar(cx + 4, cy - 4, cx + 6, cy - 8, 1.8, R.bone[2], R.bone[3], R.bone[1]);
  };
  const head = (g, cx, cy, T) => { vol(g, cx, cy + 6, 3.5, 2.5, T); vol(g, cx, cy, 6, 6.5, T); g.hl(cx - 6, cy - 3, 12, R.rlea[2]); };
  const torso = (g, cx, T, turn) => {
    vol(g, cx, 40, 8.5, 7.5, T); vol(g, cx, 30, 12 - turn, 8.5, T);
    g.vl(cx - turn * 2, 31, 10, T[1]); for (const y of [36, 40]) { g.hl(cx - 4 - turn * 2, y, 3, T[1]); g.hl(cx + 2 - turn * 2, y, 3, T[1]); }
    vol(g, cx - 12 + turn, 25, 6, 5.5, T); vol(g, cx + 12 - turn, 25, 6, 5.5, T);
  };
  const soulSpark = (g, x, y) => { for (let i = 0; i < 7; i++) { const a = i * 0.9, r = 4 + (i % 3); dot(g, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, i % 2 ? R.soul : R.soulHi); } };

  // ---- the front and the front diagonal (`turn` 1: head and chest swung toward his right hand) ----
  // `m`: mirrored afterwards, so the board goes on the other arm and the right hand is the other one.
  function front(o, turn, m) {
    const g = new Grid(W, H), cx = 30 - turn * 2, s = o.step, T = R.skin, p = o.pose, lift = (k) => Math.max(0, k) * 3;
    const L = m ? -1 : 1;   // the viewer's side his LEFT arm (the board) is on: right of him (+1), or left when mirrored
    const up = p === 'raise' || p === 'carry', aim = p === 'aim', wind = p === 'windup', swing = p === 'swing';
    leg(g, cx - 5, cx - 8 - turn, 52, T, 6.5, lift(s)); leg(g, cx + 5, cx + 8 - turn, 52, T, 6.5, lift(-s));
    loin(g, cx - turn, 47, 9, 8);
    torso(g, cx, T, turn);
    // slung on his back: the gun's barrels up over his left shoulder, the sword's hilt over his right (not while in hand)
    if (!aim) { g.bar(cx + 14 * L, 22, cx + 12 * L, 13, 2.6, R.iron[2], R.iron[3], R.iron[1]); vol(g, cx + 12 * L, 12, 1.7, 1.7, R.iron); dot(g, cx + 11.5 * L, 12, R.iron[0]); dot(g, cx + 13 * L, 11.5, R.iron[0]); }
    if (!wind && !swing) { g.bar(cx - 14 * L, 22, cx - 12 * L, 12, 2, R.hide[2], R.hide[3], R.hide[1]); g.bar(cx - 15.5 * L, 15, cx - 9 * L, 13.5, 1.6, R.iron[3], R.iron[4], R.iron[2]); vol(g, cx - 11.5 * L, 10.5, 1.6, 1.6, R.iron); }
    // the left arm: hangs with the board, or both hands on the gun
    const lx = cx + 14 * L;
    if (aim) { arm(g, lx, 27, cx + 6 * L, 36, cx + 2 * L, 44, T, 5.5); }
    else { arm(g, lx, 27, cx + 19 * L, 39, cx + 18 * L, 52, T, 5.5); bracer(g, cx + 18 * L, 52, cx + 19 * L, 39); }
    harness(g, cx - turn, 23, 47, true); belt(g, cx - turn, 46, 10);
    if (!aim) board(g, cx + 20 * L, 44, 6.5);
    // the right arm: hanging, up (the raise), back with the sword, out with it, or forward on the gun
    const rx = cx - 14 * L;
    if (up) { arm(g, rx, 27, cx - 20 * L, 20, cx - 17 * L, 7, T, 5.5); bracer(g, cx - 17 * L, 7, cx - 20 * L, 20); vol(g, cx - 17 * L, 6, 3.8, 3.4, T); for (const [dx, dy] of [[-3, -2.5], [-1.5, -3.5], [0.5, -3.5], [2.5, -2.5]]) limb(g, cx - 17 * L + dx * 0.6 * L, 5, cx - 17 * L + dx * L, 3 + dy, 1.6, T); if (p === 'raise') soulSpark(g, cx - 17 * L, 3); }
    else if (wind) { arm(g, rx, 27, cx - 22 * L, 22, cx - 20 * L, 12, T, 5.5); sword(g, cx - 20 * L, 12, cx - 26 * L, 2); }
    else if (swing) { arm(g, rx, 27, cx - 14 * L, 40, cx - 2 * L, 48, T, 5.5); sword(g, cx - 2 * L, 48, cx + 14 * L, 60); }
    else if (aim) {
      // the gun pointed at the camera: the stock up at his shoulder foreshortened, both hands on it, and the two muzzles looked down
      arm(g, rx, 27, cx - 8 * L, 36, cx - 3 * L, 42, T, 5.5);
      g.bar(cx + 3 * L, 29, cx - 1 * L, 39, 3.4, R.hide[2], R.hide[3], R.hide[1]);
      g.ell(cx, 44.5, 6.2, 3.6, R.iron[2]); g.ring(cx, 44.5, 6.2, 3.6, 1, R.iron[1]);
      for (const sg of [-1, 1]) { g.ell(cx + sg * 2.6, 44.5, 2.4, 2.4, R.iron[3]); g.ell(cx + sg * 2.6, 44.5, 1.3, 1.3, R.iron[0]); }
      dot(g, cx - 4.5, 42.5, R.iron[4]);
    }
    else { arm(g, rx, 27, cx - 19 * L, 39, cx - 18 * L, 52, T, 5.5); bracer(g, cx - 18 * L, 52, cx - 19 * L, 39); }
    head(g, cx - turn * 2, 13, T);
    mask(g, cx - turn * 2, 13, turn);
    return g;
  }
  // ---- side on, facing left: the board on the near (left) arm unless mirrored, the sword arm far ----
  function side(o, m) {
    const g = new Grid(W, H), cx = 30, s = o.step, T = R.skin, p = o.pose, near = !m;
    const up = p === 'raise' || p === 'carry', aim = p === 'aim', wind = p === 'windup', swing = p === 'swing';
    // the far arm first: the sword's (board's when mirrored), then the far leg
    const farT = R.dim;
    if (near) { if (wind) { arm(g, cx + 2, 27, cx + 12, 20, cx + 16, 10, farT, 5); sword(g, cx + 16, 10, cx + 24, 0); } else if (swing) { arm(g, cx + 2, 27, cx - 4, 38, cx - 12, 44, farT, 5); sword(g, cx - 12, 44, cx - 30, 44); } else if (up) { arm(g, cx + 2, 27, cx + 8, 18, cx + 6, 6, farT, 5); } else if (!aim) arm(g, cx + 2, 27, cx + 4, 40, cx + 3, 52, farT, 5); }
    else { if (!aim) { arm(g, cx + 2, 27, cx + 4, 40, cx + 3, 52, farT, 5); board(g, cx + 4, 44, 6.5, true); } }
    leg(g, cx + 2, cx + 3 - s * 3, 52, farT, 6, Math.max(0, -s) * 3);
    // the body in profile: the chest forward, the back a little hunched, the belt and the loincloth
    vol(g, cx - 1, 41, 7, 7.5, T); vol(g, cx, 30, 9, 9, T); vol(g, cx - 4, 27, 5, 5, T);
    g.poly([[cx - 7, 47], [cx + 7, 47], [cx + 6, 55], [cx, 56.5], [cx - 6, 55]], R.lea[2]); for (let yy = 49; yy < 55; yy += 2.5) for (let x = cx - 5; x < cx + 6; x += 2.5) dot(g, x, yy, R.iron[3]);
    belt(g, cx, 46, 8);
    g.bar(cx - 7, 24, cx + 5, 46, 2.4, R.rlea[2], R.rlea[3], R.rlea[1]); for (let t = 0.15; t < 0.95; t += 0.2) dot(g, cx - 7 + 12 * t, 24 + 22 * t, R.bone[3]);   // the one strap seen
    // slung on his back: the gun and the sword, their ends up over the shoulders
    if (!aim) { g.bar(cx + 7, 24, cx + 9, 12, 2.6, R.iron[2], R.iron[3], R.iron[1]); vol(g, cx + 9, 11, 1.7, 1.7, R.iron); }
    if (!wind && !swing) { g.bar(cx + 5, 22, cx + 4, 11, 2, R.hide[2], R.hide[3], R.hide[1]); vol(g, cx + 4, 9.5, 1.6, 1.6, R.iron); g.bar(cx + 1, 13, cx + 8, 13, 1.6, R.iron[3], R.iron[4], R.iron[2]); }
    leg(g, cx - 3, cx - 4 + s * 3, 52, T, 6, Math.max(0, s) * 3);
    // the head: in profile, the skull's muzzle forward, one horn stub, the strap round the back
    vol(g, cx - 3, 19, 3.5, 2.5, T); vol(g, cx - 4, 13, 6, 6.5, T); g.vl(cx + 1, 9, 8, R.rlea[2]);
    g.poly([[cx - 10, 9], [cx - 2, 9], [cx - 2, 20], [cx - 6, 20.5], [cx - 11, 16], [cx - 12, 12]], R.bone[2]); g.tone((x, y) => y > 15 && x < cx - 2 && x > cx - 12 && y < 21, R.bone[1], [R.bone[2]]);
    dot(g, cx - 8, 12.5, R.eye, 2); dot(g, cx - 11, 16, R.bone[0]); g.vl(cx - 9, 18, 2, R.bone[4]); g.vl(cx - 7, 18, 2, R.bone[4]); g.vl(cx - 5, 9, 3, R.red[3]);
    g.bar(cx - 3, 9, cx - 2, 5, 1.8, R.bone[2], R.bone[3], R.bone[1]);
    // the near arm: the board (or the sword when mirrored), the raise, the gun forward
    if (aim) { arm(g, cx + 2, 28, cx - 4, 35, cx - 12, 37, farT, 4.5); arm(g, cx - 3, 27, cx - 9, 34, cx - 13, 36, T, 5.5); gun(g, cx - 13, 36, cx - 30, 36); }
    else if (near) { if (up) { arm(g, cx - 3, 27, cx - 6, 38, cx - 5, 50, T, 5.5); board(g, cx - 5, 44, 6.5); } else { arm(g, cx - 3, 27, cx - 6, 38, cx - 5, 50, T, 5.5); bracer(g, cx - 5, 50, cx - 6, 38); board(g, cx - 5, 44, 6.5); } }
    else { if (wind) { arm(g, cx - 3, 27, cx + 6, 22, cx + 10, 12, T, 5.5); sword(g, cx + 10, 12, cx + 18, 2); } else if (swing) { arm(g, cx - 3, 27, cx - 10, 36, cx - 16, 42, T, 5.5); sword(g, cx - 16, 42, cx - 34, 42); } else if (up) { arm(g, cx - 3, 27, cx - 9, 18, cx - 7, 6, T, 5.5); if (p === 'raise') soulSpark(g, cx - 7, 3); } else { arm(g, cx - 3, 27, cx - 6, 38, cx - 5, 50, T, 5.5); bracer(g, cx - 5, 50, cx - 6, 38); } }
    return g;
  }
  // ---- the back and the back diagonal: the harness crossed on his back, the gun across it, the board edge-on on his left ----
  function back(o, turn, m) {
    const g = new Grid(W, H), cx = 30 + turn * 2, s = o.step, T = R.skin, p = o.pose, lift = (k) => Math.max(0, k) * 3;
    const L = m ? 1 : -1;   // from behind his left arm is on the viewer's left (-1), or the right when mirrored
    const up = p === 'raise' || p === 'carry', aim = p === 'aim', wind = p === 'windup', swing = p === 'swing';
    // the arms first: they hang behind what the camera sees of him
    const lx = cx + 14 * L, rx = cx - 14 * L;
    if (aim) arm(g, lx, 27, cx + 6 * L, 36, cx + 2 * L, 44, T, 5.5); else { arm(g, lx, 27, cx + 19 * L, 39, cx + 18 * L, 52, T, 5.5); bracer(g, cx + 18 * L, 52, cx + 19 * L, 39); }
    if (up) { arm(g, rx, 27, cx - 20 * L, 20, cx - 17 * L, 7, T, 5.5); if (p === 'raise') soulSpark(g, cx - 17 * L, 3); }
    else if (wind) { arm(g, rx, 27, cx - 22 * L, 22, cx - 20 * L, 12, T, 5.5); sword(g, cx - 20 * L, 12, cx - 26 * L, 2); }
    else if (swing) { arm(g, rx, 27, cx - 16 * L, 38, cx - 8 * L, 30, T, 5.5); sword(g, cx - 8 * L, 30, cx + 6 * L, 20); }
    else if (aim) { arm(g, rx, 27, cx - 8 * L, 36, cx - 2 * L, 40, T, 5.5); gun(g, cx - 2 * L, 40, cx - 2 * L, 26); }
    else { arm(g, rx, 27, cx - 19 * L, 39, cx - 18 * L, 52, T, 5.5); bracer(g, cx - 18 * L, 52, cx - 19 * L, 39); }
    leg(g, cx - 5, cx - 8 + turn, 52, T, 6.5, lift(-s)); leg(g, cx + 5, cx + 8 + turn, 52, T, 6.5, lift(s));
    loin(g, cx + turn, 47, 9, 8);
    vol(g, cx, 40, 8.5, 7.5, T); vol(g, cx, 30, 12 - turn, 8.5, T); vol(g, cx - 12 + turn, 25, 6, 5.5, T); vol(g, cx + 12 - turn, 25, 6, 5.5, T);
    g.vl(cx + turn * 2, 28, 12, T[1]);   // the spine
    harness(g, cx + turn, 23, 47, false); belt(g, cx + turn, 46, 10);
    // the gun across his back on its strap, the sword beside it, unless they are in his hands
    if (!aim) { g.bar(cx - 8 * L, 42, cx + 10 * L, 18, 3, R.iron[2], R.iron[3], R.iron[1]); g.bar(cx + 10 * L, 18, cx + 13 * L, 12, 2.6, R.iron[2], R.iron[3], R.iron[1]); vol(g, cx + 13 * L, 11, 1.7, 1.7, R.iron); g.bar(cx - 8 * L, 42, cx - 12 * L, 47, 3, R.hide[2], R.hide[3], R.hide[1]); }
    if (!wind && !swing) { g.bar(cx - 6 * L, 40, cx - 12 * L, 12, 2.6, R.iron[3], R.iron[4], R.iron[2]); g.bar(cx - 12 * L, 12, cx - 13 * L, 7, 2, R.hide[2], R.hide[3], R.hide[1]); vol(g, cx - 13 * L, 6, 1.6, 1.6, R.iron); g.bar(cx - 15 * L, 12, cx - 9 * L, 12, 1.6, R.iron[3], R.iron[4], R.iron[2]); }
    if (!aim) board(g, cx + 21 * L, 44, 6.5, true);
    // the back of the head: bald, the strap of the mask round it, the horn stubs over the top
    vol(g, cx + turn * 2, 19, 3.5, 2.5, T); vol(g, cx + turn * 2, 13, 6, 6.5, T); g.hl(cx - 6 + turn * 2, 10, 12, R.rlea[2]);
    const hx = cx + turn * 2; g.bar(hx - 4, 9, hx - 6, 5, 1.8, R.bone[2], R.bone[3], R.bone[1]); g.bar(hx + 4, 9, hx + 6, 5, 1.8, R.bone[2], R.bone[3], R.bone[1]);
    if (turn) { g.vl(hx - 6 * L, 11, 5, R.bone[2]); g.vl(hx - 7 * L, 12, 3, R.bone[3]); }   // the diagonal from behind: the skull's edge past his cheek
    return g;
  }

  const finish = (g) => g.outline(OL).clean(OL);
  // The eight facings `PIXEL_ART.draw` numbers (0 S, 1 SW, 2 W, 3 NW, 4 N, 5 NE, 6 E, 7 SE): five drawn, three mirrored.
  const VIEWS = [['front', 0], ['front', 1], ['side', 0], ['back', 1], ['back', 0], ['back', 1, true], ['side', 0, true], ['front', 1, true]];
  const cache = new Map();
  function sprite(d, pose, step) {
    const key = d + pose + step; let v = cache.get(key); if (v) return v;
    const [kind, turn, flip] = VIEWS[d], o = { pose: pose || 'idle', step: step || 0 }, m = !!flip;
    const g = finish(kind === 'front' ? front(o, turn, m) : kind === 'side' ? side(o, m) : back(o, turn, m));
    v = { g, flip: m }; cache.set(key, v); return v;
  }
  return { W, H, FOOT, sprite, VIEWS };
})();
if (typeof module !== 'undefined') module.exports = WARDEN_PIXELS;

// In the page: baked once to a canvas, `UP` px a texel, drawn smoothed at `TX` world px a texel with his soles on the
// origin, inside the frame `PaintedArt.character` has already leaned. The pose off his state (js/warden.js) or `e.pose`.
if (typeof document !== 'undefined') {
  const UP = 4, baked = new Map();
  WARDEN_PIXELS.TX = 0.72;
  WARDEN_PIXELS.canvas = (sp) => {
    let c = baked.get(sp); if (c) return c;
    const g = sp.g; c = document.createElement('canvas'); c.width = g.w * UP; c.height = g.h * UP;
    const x = c.getContext('2d');
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const v = g.get(i, j); if (v) { x.fillStyle = v; x.fillRect(i * UP, j * UP, UP, UP); } }
    baked.set(sp, c); return c;
  };
  WARDEN_PIXELS.poseOf = (e) => {
    if (!e) return 'idle';
    if (e.state === 'windup') return 'windup';
    if (e.state === 'swing') return 'swing';
    if (e.state === 'aim') return 'aim';
    if (e.state === 'recover' && e.gunCd > TUNING.warden.gun.reload - TUNING.warden.gun.recover) return 'aim';   // broken open to reload, the gun still up
    return e.pose || 'idle';
  };
  WARDEN_PIXELS.draw = (ctx, angle, moving, t, x, e) => {
    const P = WARDEN_PIXELS, d = (Math.round(angle / (Math.PI / 4)) + 14) % 8, pose = P.poseOf(e);
    const step = moving && (pose === 'idle' || pose === 'carry') ? [0, 1, 0, -1][Math.floor(t * 6 + (x || 0) * 0.05) % 4] : 0;
    const sp = P.sprite(d, pose, step), k = P.TX, bob = step ? 0 : moving ? k : 0;
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.save(); if (sp.flip) ctx.scale(-1, 1);
    ctx.drawImage(P.canvas(sp), -P.W / 2 * k, -P.FOOT * k + bob, P.W * k, P.H * k);
    ctx.restore(); ctx.imageSmoothingEnabled = smooth;
  };
}
