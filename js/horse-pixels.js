// The horse: a hand-placed pixel unit in the recipe of `PROP_PIXELS` and `OGRE_PIXELS`, the escort
// that is freed and gallops for the stairs. A farm horse the cult kept, not a charger: a bay with a
// black mane, tail and lower legs, a thin blaze and one white sock, a frayed rope halter with the end
// of its lead hanging off the jaw. Every round part is its own lit volume (a ball or a tapered
// capsule), lit from the upper left like the atlas lights every unit, and the legs are two bones
// solved to where each hoof has to be, so a frame is a list of hoof spots and not a drawing.
// Five views are drawn (front, front diagonal, side, back diagonal, back) and mirrored for the other
// three. The side and both diagonals stand or gallop (four frames); the front and back stand or trot
// (two frames). `kick` is the blow he lands on a door or a man: a buck on the side and diagonals (head
// down, rump up, both hind hooves out behind), a rear from the front, the heels up from behind.
// Render only: nothing in the simulation reads any of this.
const HORSE_PIXELS = (() => {
  const { Grid } = typeof PROP_PIXELS !== 'undefined' ? PROP_PIXELS : require('./prop-pixels.js');
  const P = {
    ol: '#1a1210',
    h0: '#2f190e', h1: '#4f2b15', h2: '#72411f', h3: '#945a2c', h4: '#b3773f',
    m0: '#130d0b', m1: '#211612', m2: '#31221b', m3: '#443026', m4: '#5d4433',
    f0: '#2b2421', f1: '#403632', f2: '#5e5149',
    p0: '#948a74', p1: '#c4b99e', p2: '#e2d8bf',
    r0: '#5f4b2d', r1: '#8c7448', r2: '#b89d68',
    e: '#0b0706',
  };
  const W = 50, H = 41, FOOT = 39, GROUND = FOOT - 1;   // the grid, the row his soles stand on, their last row
  const HIDE = [P.h0, P.h1, P.h2, P.h3, P.h4], DIM = [P.h0, P.h0, P.h1, P.h2, P.h2];
  const MANE = [P.m0, P.m1, P.m2, P.m3, P.m4], MDIM = [P.m0, P.m0, P.m1, P.m2, P.m2];
  const HOOF = [P.f0, P.f0, P.f1, P.f2, P.f2], PALE = [P.p0, P.p1, P.p1, P.p2, P.p2];

  // The ogre's light: a lit cap toward the upper left, a dark rim away from it.
  const lit = (T, dx, dy, n) => {
    const l = -(dx * 0.55 + dy * 0.83);
    return n > 0.82 && l < -0.45 ? T[0] : n > 0.55 && l < -0.2 ? T[1] : n > 0.72 && l > 0.55 ? T[4] : n > 0.4 && l > 0.3 ? T[3] : T[2];
  };
  const ball = (g, cx, cy, rx, ry, T) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, n = Math.hypot(dx, dy);
      if (n <= 1) g.set(x, y, lit(T, dx, dy, n));
    }
  };
  // A tapered capsule, shaded round its own axis: a neck, a head, a leg bone, a lock of tail.
  const cap = (g, x0, y0, x1, y1, r0, r1, T) => {
    const vx = x1 - x0, vy = y1 - y0, L2 = vx * vx + vy * vy || 1, R = Math.max(r0, r1);
    for (let y = Math.floor(Math.min(y0, y1) - R); y <= Math.max(y0, y1) + R; y++) for (let x = Math.floor(Math.min(x0, x1) - R); x <= Math.max(x0, x1) + R; x++) {
      const px = x + 0.5, py = y + 0.5, t = Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / L2));
      const r = r0 + (r1 - r0) * t, dx = (px - x0 - vx * t) / r, dy = (py - y0 - vy * t) / r, n = Math.hypot(dx, dy);
      if (n <= 1) g.set(x, y, lit(T, dx, dy, n));
    }
  };
  const chain = (g, pts, T) => { for (let i = 1; i < pts.length; i++) cap(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], pts[i - 1][2], pts[i][2], T); };

  // A leg from the elbow or stifle `a` to the hoof's sole `f`, through a knee (front, `bend` -1: it
  // folds forward) or a hock (hind, `bend` 1: it points back) found by two-bone reach. The upper bone
  // is hide, the cannon below the joint is black, then the hoof; `sock` whitens the pastern.
  function leg(g, ax, ay, fx, fy, L1, L2, bend, o) {
    let dx = fx - ax, dy = fy - ay, d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    if (d > L1 + L2 - 0.05) { d = L1 + L2 - 0.05; fx = ax + ux * d; fy = ay + uy * d; }
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const jx = ax + ux * a + bend * uy * h, jy = ay + uy * a - bend * ux * h;
    const cl = Math.hypot(fx - jx, fy - jy) || 1, cx = (fx - jx) / cl, cy = (fy - jy) / cl;
    const hx = fx - cx * 1.6, hy = fy - cy * 1.6;
    cap(g, ax, ay, jx, jy, o.r0, o.r1, o.far ? DIM : HIDE);
    cap(g, jx, jy, hx, hy, o.r1 * 0.8, 1.05, o.far ? MDIM : MANE);
    if (o.sock) cap(g, hx - cx * 1.8, hy - cy * 1.8, hx, hy, 1.1, 1.15, PALE);
    cap(g, hx, hy, fx - cx * 0.5, fy - cy * 0.5, 1.15, 1.3, HOOF);
  }

  // The head in profile, facing left: `poll` between the ears, `ang` the line from there to the
  // muzzle. `at(u, v)`: u along that line, v toward the front of the face.
  function head(g, px, py, ang, o) {
    const dx = Math.cos(ang), dy = Math.sin(ang), qx = -dy, qy = dx;
    const at = (u, v) => [px + dx * u + qx * v, py + dy * u + qy * v];
    const el = Math.hypot(qx - dx, qy - dy), ex = (qx - dx) / el, ey = (qy - dy) / el;   // the ears point up-back off the poll
    const ear = (u, v, T) => { const [bx, by] = at(u, v); cap(g, bx, by, bx + ex * 3.2, by + ey * 3.2, 1.15, 0.5, T); };
    ear(0.2, -1.4, DIM);
    const [jx, jy] = at(2, -1.4); ball(g, jx, jy, 3, 3, HIDE);           // the jowl
    const [ax, ay] = at(0, 0), [bx, by] = at(7.6, 0);
    cap(g, ax, ay, bx, by, 2.8, 2.0, HIDE);
    ear(-0.4, 0.4, HIDE);
    const [fx0, fy0] = at(-0.2, 1.5), [fx1, fy1] = at(1.4, 2.3); cap(g, fx0, fy0, fx1, fy1, 0.8, 0.8, MANE);   // forelock
    if (o.face) {
      const [e1, e2] = at(2.4, 0.9); g.set(e1, e2, P.e);
      if (o.blaze) { const [b0, b1] = at(2.2, 2.2), [b2, b3] = at(7.4, 1.5); g.line(b0, b1, b2, b3, P.p1, true); }
      const [n1, n2] = at(7.4, 0.5); g.set(n1, n2, P.m0);
      const [m1, m2] = at(8.0, -1.0); g.set(m1, m2, P.m1);
    }
    // the halter: a noseband, a cheek strap up to a crownpiece behind the ears, all of rope
    const [s0, s1] = at(5.4, 2.6), [s2, s3] = at(5.1, -2.4), [c0, c1] = at(0.8, -2.8), [k0, k1] = at(-0.5, 1.2);
    g.line(s0, s1, s2, s3, P.r1, true); g.line(s2, s3, c0, c1, P.r0, true); g.line(c0, c1, k0, k1, P.r1, true);
    const [l0, l1] = at(5.4, -2.9); g.set(l0, l1, P.r2);
    // the end of the lead, cut and frayed: it hangs standing and streams back at a run
    const lx = Math.round(l0), ly = Math.round(l1);
    const run = o.run ? [[1, 1], [2, 1], [3, 2], [4, 2], [5, 3]] : [[0, 1], [0, 2], [1, 3], [1, 4]];
    for (const [i, j] of run) g.set(lx + i, ly + j, P.r1);
    const [ti, tj] = run[run.length - 1];
    g.set(lx + ti + 1, ly + tj + 1, P.r2); g.set(lx + ti - 1, ly + tj + 1, P.r0);
  }

  // The neck from the withers `(bx, by)` to the poll `(tx, ty)`, and the mane along its crest,
  // lying on the near side standing and lifting off it at a run.
  function neck(g, bx, by, tx, ty, o) {
    cap(g, bx, by, tx, ty, 4.6, 3, HIDE);
    const l = Math.hypot(tx - bx, ty - by), ax = (tx - bx) / l, ay = (ty - by) / l, nx = -ay, ny = ax;   // n: toward the crest
    const c0x = bx + nx * 3.6, c0y = by + ny * 3.6, c1x = tx + nx * 2.4, c1y = ty + ny * 2.4;
    cap(g, c0x, c0y, c1x, c1y, 1.5, 1.2, MANE);
    for (let k = 1; k <= 4; k++) {
      const t = k / 5, sx = c0x + (c1x - c0x) * t, sy = c0y + (c1y - c0y) * t;
      if (o.run) { g.set(sx + nx * 1.6 + 0.8, sy + ny * 1.6 + 0.3, P.m2); if (k % 2) g.set(sx + nx * 2.4 + 1.6, sy + ny * 2.4 + 0.6, P.m2); }
      else g.line(sx, sy, sx - nx * (k % 2 ? 2.6 : 1.8), sy - ny * (k % 2 ? 2.6 : 1.8), P.m1, true);
    }
  }

  // Hoof spots per frame, as [ahead of the leg's top (negative is toward the head), lift off the
  // ground]; `by` lifts the whole body (the gallop's hang in the air), `head` swings the neck, `tail`
  // picks a lie of the tail. 0 is standing, 1..4 the gallop: stretched out, the lead fore down, all
  // four gathered under him, the hinds down and the fores reaching.
  const GAIT = [
    { fn: [0, 0], ff: [3, 0], hn: [1, 0], hf: [-2.5, 0], by: 0, head: 0, tail: 0 },
    { fn: [-7, 3], ff: [-5, 1], hn: [6, 0], hf: [8, 2], by: 0, head: 1, tail: 1 },
    { fn: [-3, 0], ff: [-1, 1], hn: [4, 4], hf: [2, 5], by: 0, head: 0, tail: 2 },
    { fn: [4, 5], ff: [2, 4], hn: [-5, 2], hf: [-3, 0], by: -1, head: -1, tail: 1 },
    { fn: [-3, 5], ff: [0, 3], hn: [-1, 0], hf: [1, 1], by: 0, head: 0, tail: 2 },
  ];
  const KICK = { fn: [-1, 0], ff: [1.5, 0], hn: [11, 8], hf: [9, 10], by: 0, head: 'kick', tail: 3 };
  const NECK = { 0: [9, 7.5, 2.3], 1: [8, 8.5, 2.12], '-1': [9.5, 7, 2.38], kick: [7.5, 15, 1.75] };
  const TAIL = [
    [[38, 15, 1.6], [40.5, 19, 2.1], [40.8, 27, 1.8], [40.2, 31, 1.1]],
    [[38, 15, 1.6], [42, 15.5, 2.1], [46, 18, 1.6], [48.5, 21, 1]],
    [[38, 15, 1.6], [42, 17, 2.1], [45.5, 21, 1.7], [47, 25.5, 1]],
    [[38, 14, 1.6], [41, 10, 2.1], [45, 9, 1.6], [48, 11, 1]],
  ];

  // Side on, facing left, and the two diagonals off the same drawing: `turn` 1 swings the head toward
  // the camera (the body foreshortened, the rump further off and so higher up the grid, the far legs
  // showing left of the near ones), `turn` -1 swings it away (the rump nearest, the face gone).
  function side(o, turn) {
    const g = new Grid(W, H), kick = o.pose === 'kick', f = kick ? KICK : GAIT[o.frame], run = kick || o.frame > 0;
    const cx = 25, sx = turn ? 0.74 : 1, slope = turn * -0.08, tilt = kick ? -0.28 : 0;
    const X = (x) => cx + (x - cx) * sx;
    const Yb = (y, x) => y + f.by + (x - cx) * (slope + tilt);
    const Yg = (y, x) => y + (x - cx) * slope;
    const far = turn === 1 ? [-2.5, -1] : turn === -1 ? [2.5, -1] : [0, -1];
    const limb = (lx, ly, foot, hind, isFar) => {
      const ox = isFar ? far[0] : 0, oy = isFar ? far[1] : 0, gx = lx + foot[0];
      leg(g, X(lx) + ox, Yb(ly, lx) + oy, X(gx) + ox, Yg(GROUND - foot[1], gx) + oy, hind ? 8 : 7, hind ? 8 : 7.5, hind ? 1 : -1,
        { r0: hind ? 2.6 : 2.2, r1: 1.5, far: isFar, sock: hind && !isFar });
    };
    const tail = () => chain(g, TAIL[f.tail].map(([x, y, r]) => [X(x), Yb(y, x), r]), MANE);
    const front = () => {
      const [nx, ny, ang] = NECK[f.head];
      neck(g, X(16.5), Yb(17, 16.5), X(nx), Yb(ny, nx), { run });
      head(g, X(nx), Yb(ny, nx), ang + turn * 0.12, { face: turn !== -1, blaze: turn !== -1, run });
    };
    if (turn !== -1) tail(); else front();
    limb(15, 24, f.ff, false, true);
    limb(33, 22.5, f.hf, true, true);
    const rs = turn === -1 ? 1.12 : 1, cs = turn === 1 ? 1.15 : 1;
    ball(g, X(23.5), Yb(20, 23.5), 10 * sx, 6.2, HIDE);           // the barrel
    ball(g, X(32), Yb(18.5, 32), 6.5 * rs, 6.5, HIDE);            // the quarters
    ball(g, X(17.5), Yb(14.5, 17.5), 4 * sx, 2.5, HIDE);          // the withers
    ball(g, X(14), Yb(19, 14), 5 * cs, 6, HIDE);                  // the chest
    if (turn !== -1) front();
    limb(15, 24, f.fn, false, false);
    limb(33, 22.5, f.hn, true, false);
    if (turn === -1) tail();
    return g;
  }

  // A leg seen end on (front and back): straight down through the knee or hock; lifted, the cannon
  // is foreshortened and the hoof turns its sole to the camera.
  function post(g, x, top, joint, lift, o) {
    const T = o.far ? DIM : HIDE, D = o.far ? MDIM : MANE, foot = GROUND - (o.far ? 2 : 0) - lift;
    cap(g, x, top, x + (o.out || 0) * 0.5, joint, o.r0, 1.6, T);
    const jx = x + (o.out || 0) * 0.5, hy = lift ? joint + (foot - joint) * 0.45 : foot - 1.6;
    cap(g, jx, joint, jx + (o.out || 0) * 0.5, hy, 1.3, 1.05, D);
    if (o.sock) cap(g, jx, hy - 1.8, jx, hy, 1.1, 1.15, PALE);
    cap(g, jx + (o.out || 0) * 0.5, hy, jx + (o.out || 0) * 0.5, hy + (lift ? 1 : 1.1), lift ? 1.7 : 1.3, lift ? 1.7 : 1.45, HOOF);
  }

  // Head on: the long face coming at the camera between the ears, the chest, the fores in front and
  // the hinds behind them. Trotting, a diagonal pair lifts. The kick rears: fores folded, body up.
  function front(o) {
    const g = new Grid(W, H), cx = 25, s = o.frame === 1 ? 1 : o.frame === 2 ? -1 : 0, rear = o.pose === 'kick';
    const by = rear ? -3 : s ? -1 : 0;
    for (const k of [-1, 1]) post(g, cx + k * 5, 24 + by, 30 + by / 2, s === -k ? 2 : 0, { far: true, r0: 2.2 });
    ball(g, cx, 19.5 + by, 8.5, 5.5, DIM);                         // the barrel behind the chest
    ball(g, cx, 21 + by, 7, 6.5, HIDE);                            // the chest
    for (const k of [-1, 1]) {
      if (rear) {                                                    // folded at the knee, hooves hanging
        cap(g, cx + k * 4, 24 + by, cx + k * 5.5, 27 + by, 2.2, 1.6, HIDE);
        cap(g, cx + k * 5.5, 27 + by, cx + k * 4.8, 30.5 + by, 1.3, 1.05, MANE);
        ball(g, cx + k * 4.8, 31.5 + by, 1.7, 1.4, HOOF);
      }
      else post(g, cx + k * 4, 25 + by, 31 + by / 2, s === k ? 3 : 0, { r0: 2.2 });
    }
    const hy = by + (rear ? 3 : 1);   // whole rows: the face is painted over what is drawn
    cap(g, cx, 18 + hy, cx, 11 + hy, 5, 4, HIDE);                  // the neck
    cap(g, cx - 3.4, 3.2 + hy, cx - 4.2, 0.4 + hy, 1.15, 0.5, HIDE); cap(g, cx + 3.4, 3.2 + hy, cx + 4.2, 0.4 + hy, 1.15, 0.5, HIDE);
    ball(g, cx, 6.5 + hy, 4.2, 3.6, HIDE);                          // the brow
    cap(g, cx, 7 + hy, cx, 13.5 + hy, 3.6, 2.6, HIDE);              // the face
    ball(g, cx, 14 + hy, 3.1, 2.3, HIDE);                           // the muzzle
    g.rect(cx - 1, 2.5 + hy, 2, 3, P.m2); g.set(cx - 2, 3.5 + hy, P.m1); g.set(cx + 1, 4.5 + hy, P.m1);   // forelock
    g.set(cx - 4, 7 + hy, P.e); g.set(cx + 3, 7 + hy, P.e);
    g.vl(cx - 1, 6 + hy, 6, P.p1, true); g.vl(cx, 7 + hy, 3, P.p2, true); g.vl(cx - 1, 12 + hy, 2, P.p0, true);   // the blaze
    g.set(cx - 2, 15 + hy, P.m0); g.set(cx + 1, 15 + hy, P.m0);
    g.hl(cx - 3, 11 + hy, 7, P.r1, true); g.set(cx - 3, 11 + hy, P.r2);   // noseband
    g.vl(cx - 4, 5 + hy, 6, P.r0, true); g.vl(cx + 3, 5 + hy, 6, P.r0, true);
    g.hl(cx - 1, 16 + hy, 2, P.r1);                                 // the knot under the chin, the lead off it
    for (const [i, j] of [[0, 17], [0, 18], [1, 19], [1, 20]]) g.set(cx + i, j + hy, P.r1);
    g.set(cx, 21 + hy, P.r0); g.set(cx + 2, 21 + hy, P.r2);
    return g;
  }

  // From behind: the quarters and the tail down between them, the hinds planted either side, the
  // neck and ears over the top with the mane down it. The kick throws both heels up at the camera.
  function back(o) {
    const g = new Grid(W, H), cx = 25, s = o.frame === 1 ? 1 : o.frame === 2 ? -1 : 0, kick = o.pose === 'kick';
    const by = s ? -1 : 0, rb = kick ? -3 : by, hb = (kick ? 4 : by) + 1;
    for (const k of [-1, 1]) post(g, cx + k * 3.5, 24 + by, 30 + by / 2, s === -k ? 2 : 0, { far: true, r0: 2 });
    cap(g, cx, 18 + hb, cx, 10 + hb, 5, 3.8, HIDE);                // the neck
    cap(g, cx - 3.2, 5 + hb, cx - 4.2, 1.8 + hb, 1.15, 0.5, HIDE); cap(g, cx + 3.2, 5 + hb, cx + 4.2, 1.8 + hb, 1.15, 0.5, HIDE);
    ball(g, cx, 7.5 + hb, 3.8, 3.4, HIDE);                          // the back of the head
    g.hl(cx - 3, 5 + hb, 7, P.r1, true);                            // the halter's crownpiece
    cap(g, cx, 6 + hb, cx, 16 + hb, 1.3, 1.8, MANE);                // the mane down the neck
    for (const [i, j] of [[-2, 9], [2, 11], [-2, 13], [2, 15]]) g.set(cx + i, j + hb, P.m1);
    ball(g, cx, 20 + rb, 8.5, 5.5, HIDE);                           // the barrel
    ball(g, cx - 3.6, 19.5 + rb, 5.2, 6.4, HIDE); ball(g, cx + 3.6, 19.5 + rb, 5.2, 6.4, HIDE);   // the quarters
    for (const k of [-1, 1]) {
      if (kick) {
        cap(g, cx + k * 5, 23 + rb, cx + k * 6, 27 + rb, 2.6, 1.8, HIDE);
        cap(g, cx + k * 6, 27 + rb, cx + k * 6.5, 30 + rb, 1.4, 1.2, MANE);
        ball(g, cx + k * 6.5, 31.5 + rb, 2, 1.7, HOOF); g.set(cx + k * 6.5 - 0.5, 31.5 + rb, P.f0);   // the sole, turned up at the camera
      } else post(g, cx + k * 5, 25 + by, 31 + by / 2, s === k ? 3 : 0, { r0: 2.6, sock: k < 0 });
    }
    const sw = s * 1.2;
    chain(g, kick ? [[cx, 14 + rb, 2], [cx, 9 + rb, 2.3], [cx + 1, 5 + rb, 1.6], [cx + 1, 3 + rb, 1]]
      : [[cx, 14 + rb, 2], [cx, 21 + rb, 2.3], [cx + sw, 29 + rb, 1.8], [cx + sw * 1.5, 32 + rb, 1]], MANE);
    return g;
  }

  const finish = (g) => g.outline(P.ol).clean(P.ol);
  // The eight facings `PIXEL_ART.draw` numbers (0 S, 1 SW, 2 W, 3 NW, 4 N, 5 NE, 6 E, 7 SE): five
  // drawn, three of them mirrored.
  const VIEWS = [['front', 0], ['side', 1], ['side', 0], ['side', -1], ['back', 0], ['side', -1, true], ['side', 0, true], ['side', 1, true]];
  // Frames per view kind: the gallop has four, the trot two; frame 0 is standing.
  const FRAMES = { front: 2, side: 4, back: 2 };
  const cache = new Map();
  function sprite(d, pose, frame) {
    pose = pose === 'kick' ? 'kick' : 'idle'; frame = pose === 'kick' ? 0 : frame | 0;
    const key = d + pose + frame; let v = cache.get(key); if (v) return v;
    const [kind, turn, flip] = VIEWS[d], o = { pose, frame };
    const g = finish(kind === 'front' ? front(o) : kind === 'back' ? back(o) : side(o, turn));
    v = { g, flip: !!flip }; cache.set(key, v); return v;
  }
  // Which frame a heading, a clock and a pose show: a gallop at `GALLOP` frames a second, a trot at
  // `TROT`, and standing or kicking is one held frame.
  const GALLOP = 8, TROT = 6;
  const facing = (angle) => (Math.round(angle / (Math.PI / 4)) + 14) % 8;
  const frameAt = (d, moving, t, pose) => {
    if (pose === 'kick' || !moving) return 0;
    const kind = VIEWS[d][0], n = FRAMES[kind];
    return 1 + Math.floor(Math.max(0, t) * (kind === 'side' ? GALLOP : TROT)) % n;
  };
  return { P, W, H, FOOT, VIEWS, FRAMES, sprite, facing, frameAt, TX: 1.25 };
})();
if (typeof module !== 'undefined') module.exports = HORSE_PIXELS;

// In the page: each sprite baked once to a canvas, `UP` px a texel, and drawn smoothed at `TX` world
// px a texel with his hooves on the origin — the ctx is already at his foot point and counter-squashed.
if (typeof document !== 'undefined') {
  const UP = 4, baked = new Map();
  HORSE_PIXELS.canvas = (sp) => {
    let c = baked.get(sp); if (c) return c;
    const g = sp.g; c = document.createElement('canvas'); c.width = g.w * UP; c.height = g.h * UP;
    const x = c.getContext('2d');
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const v = g.get(i, j); if (v) { x.fillStyle = v; x.fillRect(i * UP, j * UP, UP, UP); } }
    baked.set(sp, c); return c;
  };
  // `angle` his heading (atan2 of his velocity), `moving` gallops or trots him on `t`, `pose` 'kick'
  // holds the buck (the rear head on, the heels up from behind).
  HORSE_PIXELS.draw = (ctx, angle, moving, t, pose) => {
    const O = HORSE_PIXELS, d = O.facing(angle || 0), sp = O.sprite(d, pose, O.frameAt(d, moving, t || 0, pose)), k = O.TX;
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.save(); if (sp.flip) ctx.scale(-1, 1);
    ctx.drawImage(O.canvas(sp), -O.W / 2 * k, -O.FOOT * k, O.W * k, O.H * k);
    ctx.restore(); ctx.imageSmoothingEnabled = smooth;
  };
}
