// The pig: a hand-placed pixel unit in the recipe of `HORSE_PIXELS`, an escort the cult kept fat for
// the knife and never quite fed. A pink farm pig gone grubby: a round barrel of a body on short legs
// with dark trotters, floppy ears hanging forward over small dark eyes, a flat snout with two
// nostrils, a tail in a tight curl, mud up the legs and under the belly. Every round part is its own
// lit volume (a ball or a tapered capsule) lit from the upper left like the atlas lights every unit,
// and the legs are two short bones solved to where each trotter has to be, so a frame is a list of
// trotter spots and not a drawing. Five views are drawn (front, front diagonal, side, back diagonal,
// back) and mirrored for the other three. The side and both diagonals stand or trot (four frames);
// the front and back stand or trot (two frames). `eat` is the pig rooting: head down, the snout on
// the floor, a two-frame chew held whether it moves or not. Render only: nothing in the simulation
// reads any of this.
const PIG_PIXELS = (() => {
  const { Grid } = typeof PROP_PIXELS !== 'undefined' ? PROP_PIXELS : require('./prop-pixels.js');
  const P = {
    ol: '#1f1315',
    k0: '#5c3033', k1: '#8a4d4a', k2: '#b46d62', k3: '#d08c7a', k4: '#e9ae97',
    s0: '#a8645c', s1: '#dc9c89', s2: '#f2c2ad',
    u0: '#3b2b1e', u1: '#5a432b', u2: '#7a5e3e',
    f0: '#241a18', f1: '#382a25', f2: '#56443b',
    n: '#3a1a1e', e: '#0e0808',
  };
  const W = 36, H = 26, FOOT = 24, GROUND = FOOT - 1;   // the grid, the row his soles stand on, their last row
  const HIDE = [P.k0, P.k1, P.k2, P.k3, P.k4], DIM = [P.k0, P.k0, P.k1, P.k2, P.k2];
  // The ears a step darker than the hide round them, so a flap reads against the face it hangs over.
  const EAR = [P.k0, P.k0, P.k1, P.k1, P.k3];
  // A flap seen face on is thin: fewer steps across it, or the light stripes it.
  const FLAP = [P.k1, P.k1, P.k2, P.k3, P.k3];
  const SNOUT = [P.k1, P.s0, P.s1, P.s2, P.s2], HOOF = [P.f0, P.f0, P.f1, P.f2, P.f2];

  // The horse's light: a lit cap toward the upper left, a dark rim away from it.
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
  // A tapered capsule, shaded round its own axis: an ear, a snout, a leg bone.
  const cap = (g, x0, y0, x1, y1, r0, r1, T) => {
    const vx = x1 - x0, vy = y1 - y0, L2 = vx * vx + vy * vy || 1, R = Math.max(r0, r1);
    for (let y = Math.floor(Math.min(y0, y1) - R); y <= Math.max(y0, y1) + R; y++) for (let x = Math.floor(Math.min(x0, x1) - R); x <= Math.max(x0, x1) + R; x++) {
      const px = x + 0.5, py = y + 0.5, t = Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / L2));
      const r = r0 + (r1 - r0) * t, dx = (px - x0 - vx * t) / r, dy = (py - y0 - vy * t) / r, n = Math.hypot(dx, dy);
      if (n <= 1) g.set(x, y, lit(T, dx, dy, n));
    }
  };
  // An ear seen from the front: the flap, inked dark where it lies over the face and the flank (its
  // sides and underside, never the crown it hangs from), so it reads as a thing lying over the cheek
  // and not as shading on it.
  function flap(g, x0, y0, x1, y1, r0, r1) {
    const was = g.p.slice(); cap(g, x0, y0, x1, y1, r0, r1, FLAP);
    const mine = (x, y) => x >= 0 && y >= 0 && x < W && y < H && g.p[y * W + x] !== was[y * W + x];
    const ink = [];                                                  // gathered first: inked pixels are not the flap
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mine(x, y)) for (const [i, j] of [[1, 0], [-1, 0], [0, 1]]) {
      if (!mine(x + i, y + j) && was[(y + j) * W + x + i]) ink.push([x + i, y + j]);
    }
    for (const [x, y] of ink) g.set(x, y, P.k0);
  }
  // The tail's curl as whole pixels off its root, pale, ringed dark where it lies over the body so
  // it reads as a spring on the rump and not a pink blot in pink: the shadow falls only down and right
  // of it, away from the light (a full ring read as a keyhole). The outline rings the rest.
  function curl(g, x, y, pts, flip) {
    const at = pts.map(([i, j]) => [x + (flip ? -i : i), y + j]), on = new Set(at.map(([a, b]) => a + ',' + b));
    for (const [a, b] of at) for (const [i, j] of [[1, 0], [0, 1], [1, 1]]) {
      if (!on.has((a + i) + ',' + (b + j)) && g.get(a + i, b + j)) g.set(a + i, b + j, P.k0);
    }
    at.forEach(([a, b], k) => g.set(a, b, k < 2 ? P.k3 : P.k4));
  }
  // Mud: lower legs and the belly's underside go brown in a fixed scatter (a hash, not an RNG, so
  // every bake is the same pig), thicker the nearer the floor. Only over hide, and never over what
  // `head` painted (a mask kept by `track`), so the snout on the floor stays a pink snout.
  const hash = (x, y) => ((Math.imul(x + 11, 73856093) ^ Math.imul(y + 7, 19349663)) >>> 0) % 100;
  function mud(g, from) {
    for (let y = from; y < H; y++) for (let x = 0; x < W; x++) {
      const v = g.get(x, y); if (!v || !HIDE.includes(v) || (g.keep && g.keep[y * W + x])) continue;
      const h = hash(x, y), p = 8 + (y - from) * 11;
      if (h < p) g.set(x, y, h < p * 0.35 ? P.u1 : v === P.k0 ? P.u0 : P.u2);
    }
    return g;
  }
  // Runs `fn` and marks every pixel it changed as kept clean of mud (`on`) or open to it again.
  function track(g, on, fn) {
    const was = g.p.slice(); fn(); g.keep = g.keep || new Uint8Array(W * H);   // not `clean`: that is Grid's own method
    for (let i = 0; i < was.length; i++) if (g.p[i] !== was[i]) g.keep[i] = on ? 1 : 0;
  }

  // A leg from the shoulder or ham `a` to the trotter's sole `f`, through a knee found by two-bone
  // reach (`bend` -1 folds it forward, the fore; 1 back, the hind). Pink down to a dark trotter.
  function leg(g, ax, ay, fx, fy, L1, L2, bend, o) {
    let dx = fx - ax, dy = fy - ay, d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    if (d > L1 + L2 - 0.05) { d = L1 + L2 - 0.05; fx = ax + ux * d; fy = ay + uy * d; }
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const jx = ax + ux * a + bend * uy * h, jy = ay + uy * a - bend * ux * h;
    const cl = Math.hypot(fx - jx, fy - jy) || 1, cx = (fx - jx) / cl, cy = (fy - jy) / cl;
    const hx = fx - cx * 1.3, hy = fy - cy * 1.3;
    cap(g, ax, ay, jx, jy, o.r0, 1.4, o.far ? DIM : HIDE);
    cap(g, jx, jy, hx, hy, 1.35, 1.15, o.far ? DIM : HIDE);
    cap(g, hx, hy, fx - cx * 0.4, fy - cy * 0.4, 1.15, 1.3, HOOF);
  }

  // The head in profile, facing left, round the crown `(hx, hy)`. `down` swings it to the floor to
  // root (the snout pointing at the ground), `face` 1 turns the snout's disc toward the camera (the
  // front diagonal), -1 turns the face away (only the crown and the ears are left), `chew` nudges the
  // snout and jaw a pixel. The ears flop forward off the crown over the eyes.
  function head(g, hx, hy, o) {
    const dn = o.down ? 1 : 0, ch = o.chew ? 1 : 0;
    if (o.face !== -1) cap(g, hx + 2.2, hy - 2.8, hx + 0.6, hy - 4.2 + dn, 1.4, 0.8, EAR);   // the far ear, a flop behind the near one
    ball(g, hx + 1.4, hy + 1.8 - dn * 0.4, 3.4, 2.8, HIDE);           // the jowl
    ball(g, hx, hy, 3.9, 3.6, HIDE);                                  // the crown
    if (o.face !== -1) {
      // the snout: a short thick cylinder, then the flat disc at its end with the nostrils in it
      const sx = dn ? hx - 2 : hx - 3.2, sy = dn ? hy + 3 : hy + 1.4;
      const ex = dn ? sx - 0.6 - ch : sx - 2.2 - ch, ey = dn ? sy + 2 : sy + 0.4;
      cap(g, sx, sy, ex, ey, 2.3, 2, HIDE);
      const rx = Math.round(ex), ry = Math.round(ey);
      if (o.face === 1) {                                             // the disc turned toward the camera
        ball(g, ex - 0.6, ey + 0.4, 1.8, 2.1, SNOUT);
        if (dn) { g.set(rx - 2, ry + 1, P.n); g.set(rx, ry + 1, P.n); } else { g.set(rx - 1, ry - 1, P.n); g.set(rx - 1, ry + 1, P.n); }
      } else if (dn) {                                                // the disc on the floor, seen edge on
        g.hl(rx - 2, ry + 1, 4, P.s1, true); g.hl(rx - 2, ry + 2, 4, P.s2, true); g.set(rx - 2, ry + 1, P.n);
      } else {                                                        // the disc end on, a pale rim
        g.vl(rx - 2, ry - 1, 3, P.s2, true); g.vl(rx - 1, ry - 1, 3, P.s1, true); g.set(rx - 2, ry, P.n);
      }
      if (!dn) g.hl(Math.round(sx) - 1, Math.round(sy) + 2 + ch, 3, P.k0, true);   // the mouth under it
      g.set(hx - 1.2, hy - 0.8 + dn, P.e);                            // the eye
      if (o.face === 1) g.set(hx + 1.4, hy - 1 + dn, P.e);
    }
    // the near ear: a flap off the crown hanging forward and down, over the eye's brow
    const ax = hx + 1.2, ay = hy - 3, bx = hx - 3 - ch * 0.5, by = hy - 0.6 + dn * 2;
    cap(g, ax, ay, bx, by, 1.9, 0.8, EAR);
    if (o.face === -1) cap(g, hx + 3, hy - 2.6, hx + 5.4, hy - 1.2, 1.6, 0.8, EAR);   // from behind both ears show
  }

  // Trotter spots per frame, as [ahead of the leg's top (negative is toward the head), lift off the
  // ground]; `by` lifts the whole body (the trot's bounce). 0 is standing, 1..4 the trot: a diagonal
  // pair up, all four under him, the other pair up, all four under him again.
  const GAIT = [
    { fn: [0, 0], ff: [1.5, 0], hn: [0.5, 0], hf: [-1.5, 0], by: 0 },
    { fn: [-2.5, 2], ff: [1.5, 0], hn: [1.5, 0], hf: [-3, 2], by: 0 },
    { fn: [0, 0], ff: [0.5, 0], hn: [0, 0], hf: [-0.5, 0], by: -1 },
    { fn: [1.5, 0], ff: [-2.5, 2], hn: [-3, 2], hf: [1.5, 0], by: 0 },
    { fn: [0.5, 0], ff: [0, 0], hn: [-0.5, 0], hf: [0, 0], by: -1 },
  ];
  // Rooting: the fores a step forward and splayed to take the lowered front, the hinds planted.
  const EAT = { fn: [-1.5, 0], ff: [0, 0], hn: [0.5, 0], hf: [-1, 0], by: 0 };
  // The curl, off its root on the rump: out, up and round once.
  const TAIL = [[0, 0], [1, -1], [2, -2], [3, -2], [4, -1], [4, 0], [3, 1], [2, 0]];
  // From behind it is end on: a short stem and one small loop round a dark eye, or it reads as a
  // snail on the rump.
  const BACK_TAIL = [[1, 1], [1, 0], [0, -1], [0, -2], [0, -3], [1, -3], [2, -3], [2, -2], [2, -1]];

  // Side on, facing left, and the two diagonals off the same drawing: `turn` 1 swings the head toward
  // the camera (the body foreshortened, the rump further off and so higher up the grid, the far legs
  // showing left of the near ones), `turn` -1 swings it away (the rump nearest, the face gone).
  function side(o, turn) {
    const g = new Grid(W, H), eat = o.pose === 'eat', f = eat ? EAT : GAIT[o.frame], chew = eat && o.frame === 1;
    const cx = 18, sx = turn ? 0.8 : 1, slope = turn * -0.07, tilt = eat ? -0.08 : 0;
    const X = (x) => cx + (x - 17) * sx;   // drawn on a 17 middle, set a texel in so the snout and the curl both keep an outline
    const Yb = (y, x) => y + f.by + (x - 17) * (slope + tilt);
    const Yg = (y, x) => y + (x - 17) * slope;
    const far = turn === 1 ? [-2, -1] : turn === -1 ? [2, -1] : [1, -1];
    const limb = (lx, ly, foot, hind, isFar) => {
      const ox = isFar ? far[0] : 0, oy = isFar ? far[1] : 0, gx = lx + foot[0];
      leg(g, X(lx) + ox, Yb(ly, lx) + oy, X(gx) + ox, Yg(GROUND - foot[1], gx) + oy, 3.4, 3.8, hind ? 1 : -1,
        { r0: hind ? 2.3 : 2, far: isFar });
    };
    const tail = () => curl(g, Math.round(X(28.6)), Math.round(Yb(8.6, 28.6)), TAIL);
    const face = turn === -1 ? -1 : turn === 1 ? 1 : 0;
    const hx = X(turn === -1 ? 7.5 : 6.5);
    const top = () => track(g, true, () => head(g, hx, eat ? Yb(15.4, 7) : Yb(11.2, 7), { down: eat, chew, face }));
    if (turn === -1) top();
    limb(12, 16, f.ff, false, true);
    limb(23.5, 16, f.hf, true, true);
    const rs = turn === -1 ? 1.12 : 1, cs = turn === 1 ? 1.1 : 1;
    ball(g, X(18), Yb(12.4, 18), 10.2 * sx, 5.6, HIDE);            // the barrel
    ball(g, X(24), Yb(12, 24), 5.4 * rs, 5.8, HIDE);               // the ham
    ball(g, X(12.2), Yb(12.4, 12.2), 5 * cs, 5.2, HIDE);           // the shoulder
    if (turn !== -1) tail();
    if (turn !== -1) top();
    track(g, false, () => { limb(12, 16, f.fn, false, false); limb(23.5, 16, f.hn, true, false); });
    if (turn === -1) tail();
    return mud(g, 17);
  }

  // A leg seen end on (front and back): straight down; lifted, it is shorter and the trotter turns
  // its sole to the camera.
  function post(g, x, top, lift, o) {
    const T = o.far ? DIM : HIDE, foot = GROUND - (o.far ? 1 : 0) - lift, hy = foot - 1.4;
    cap(g, x, top, x, hy, o.r0, 1.35, T);
    cap(g, x, hy, x, hy + 1.1, lift ? 1.5 : 1.25, lift ? 1.5 : 1.4, HOOF);
    if (!lift) g.set(x, foot, P.f0);                                 // the cleft between the two toes
  }

  // Head on: the broad face low in front of the body, the snout's disc and its two nostrils at the
  // camera, the ears flopped outward and forward, the fores in front and the hinds behind them.
  // Trotting, a diagonal pair lifts. Rooting, the head drops to the floor and the back rises over it.
  function front(o) {
    const g = new Grid(W, H), cx = 18, eat = o.pose === 'eat', s = eat ? 0 : o.frame === 1 ? 1 : o.frame === 2 ? -1 : 0;
    const by = s ? -1 : 0, ch = eat && o.frame === 1 ? 1 : 0;
    for (const k of [-1, 1]) post(g, cx + k * 6, 15 + by, s === -k ? 1.5 : 0, { far: true, r0: 2 });
    ball(g, cx, 11.5 + by - (eat ? 1 : 0), 8.6, 6.2, DIM);          // the back and flanks, wider than the head behind it
    for (const k of [-1, 1]) post(g, cx + k * 3.2, 18 + by, s === k ? 2 : 0, { r0: 2 });   // from under the chest, or the bones stripe the belly
    const hy = by + (eat ? 5 : 0);
    track(g, true, () => {
      ball(g, cx, 14.2 + hy, 5.4, 2.8, HIDE);                        // the jowls
      ball(g, cx, 11.6 + hy, 4.9, 4.2, HIDE);                        // the face
      for (const k of [-1, 1]) flap(g, cx + k * 3.6, 8.2 + hy, cx + k * 7, (eat ? 12 : 11) + hy, 1.5, 1);   // the ears, out past the cheeks
      ball(g, cx + ch * 0.6, 14.8 + hy, 2.5, 1.9, SNOUT);             // the snout's disc
      g.set(cx - 2 + ch, 14.8 + hy, P.n); g.set(cx + 1 + ch, 14.8 + hy, P.n);
      g.set(cx - 3, 11.6 + hy, P.e); g.set(cx + 2, 11.6 + hy, P.e);   // the eyes, clear of the ears
    });
    return mud(g, 19);
  }

  // From behind: the round rump and the tail curled on top of it, the hinds planted either side, the
  // back of the head and the ears showing over the shoulders. Rooting, the head goes out of sight.
  function back(o) {
    const g = new Grid(W, H), cx = 18, eat = o.pose === 'eat', s = eat ? 0 : o.frame === 1 ? 1 : o.frame === 2 ? -1 : 0;
    const by = s ? -1 : 0, ch = eat && o.frame === 1 ? 1 : 0;
    for (const k of [-1, 1]) post(g, cx + k * 4.6, 15 + by, s === -k ? 1.5 : 0, { far: true, r0: 1.9 });
    if (!eat) {
      ball(g, cx, 6.8 + by, 3.4, 2.4, DIM);                          // the back of the head, just over the shoulders
      for (const k of [-1, 1]) ball(g, cx + k * 3, 6 + by, 1.9, 1.5, EAR);   // the backs of the ears, two bumps
    }
    ball(g, cx, 12 + by, 8.6, 6, HIDE);                               // the barrel
    for (const k of [-1, 1]) ball(g, cx + k * 3.4, 13 + by, 4.8, 5.4, HIDE);   // the hams
    g.vl(cx, 14 + by, 5, P.k1, true);                                 // the cleft between them
    for (const k of [-1, 1]) post(g, cx + k * 4.2, 16.5 + by, s === k ? 2 : 0, { r0: 2.2 });
    curl(g, cx + ch, Math.round(12 + by), BACK_TAIL, ch === 1);   // right of the middle, on the half in shade, where a pale curl shows
    return mud(g, 18);
  }

  const finish = (g) => g.outline(P.ol).clean(P.ol);
  // The eight facings `PIXEL_ART.draw` numbers (0 S, 1 SW, 2 W, 3 NW, 4 N, 5 NE, 6 E, 7 SE): five
  // drawn, three of them mirrored.
  const VIEWS = [['front', 0], ['side', 1], ['side', 0], ['side', -1], ['back', 0], ['side', -1, true], ['side', 0, true], ['side', 1, true]];
  // Frames per view kind: the trot has four side on and two end on; frame 0 is standing. `eat` has
  // two in every view, the chew.
  const FRAMES = { front: 2, side: 4, back: 2, eat: 2 };
  const cache = new Map();
  function sprite(d, pose, frame) {
    pose = pose === 'eat' ? 'eat' : 'idle'; frame = pose === 'eat' ? (frame | 0) % 2 : frame | 0;
    const key = d + pose + frame; let v = cache.get(key); if (v) return v;
    const [kind, turn, flip] = VIEWS[d], o = { pose, frame };
    const g = finish(kind === 'front' ? front(o) : kind === 'back' ? back(o) : side(o, turn));
    v = { g, flip: !!flip }; cache.set(key, v); return v;
  }
  // Which frame a heading, a clock and a pose show: a trot at `TROT` frames a second side on and
  // `TROT_END` end on, standing one held frame, the chew at `CHEW` whether he moves or not.
  const TROT = 9, TROT_END = 6, CHEW = 4;
  const facing = (angle) => (Math.round(angle / (Math.PI / 4)) + 14) % 8;
  const frameAt = (d, moving, t, pose) => {
    if (pose === 'eat') return Math.floor(Math.max(0, t) * CHEW) % 2;
    if (!moving) return 0;
    const kind = VIEWS[d][0], n = FRAMES[kind];
    return 1 + Math.floor(Math.max(0, t) * (kind === 'side' ? TROT : TROT_END)) % n;
  };
  return { P, W, H, FOOT, VIEWS, FRAMES, sprite, facing, frameAt, TX: 1.1 };
})();
if (typeof module !== 'undefined') module.exports = PIG_PIXELS;

// In the page: each sprite baked once to a canvas, `UP` px a texel, and drawn smoothed at `TX` world
// px a texel with his trotters on the origin — the ctx is already at his foot point and counter-squashed.
if (typeof document !== 'undefined') {
  const UP = 4, baked = new Map();
  PIG_PIXELS.canvas = (sp) => {
    let c = baked.get(sp); if (c) return c;
    const g = sp.g; c = document.createElement('canvas'); c.width = g.w * UP; c.height = g.h * UP;
    const x = c.getContext('2d');
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const v = g.get(i, j); if (v) { x.fillStyle = v; x.fillRect(i * UP, j * UP, UP, UP); } }
    baked.set(sp, c); return c;
  };
  // `angle` his heading (atan2 of his velocity), `moving` trots him on `t`, `pose` 'eat' holds him
  // rooting with his snout on the floor, chewing on `t`.
  PIG_PIXELS.draw = (ctx, angle, moving, t, pose) => {
    const O = PIG_PIXELS, d = O.facing(angle || 0), sp = O.sprite(d, pose, O.frameAt(d, moving, t || 0, pose)), k = O.TX;
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.save(); if (sp.flip) ctx.scale(-1, 1);
    ctx.drawImage(O.canvas(sp), -O.W / 2 * k, -O.FOOT * k, O.W * k, O.H * k);
    ctx.restore(); ctx.imageSmoothingEnabled = smooth;
  };
}
