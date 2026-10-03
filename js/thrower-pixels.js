// THE THROWER's body (3 Oct 2026, js/thrower.js): the one-armed Bane of the cult the user chose out of the
// concept passes in output/thrower-2026-10-03/ ("green goat skull Bane, just the top"; then "the butcher's
// size, it must read as a mask, the other arm really puny"). A goat's skull strapped over his own head
// (his chin, mouth and ears show under it), a tank of the green on his back and a hose over his shoulders
// into an iron port in his shoulder; the arm it feeds huge, Popeye's forearm and a block of a fist, the
// veins standing up on it and lit by a wave that runs down from the tank on every beat while the arm
// swells (`N` frames of it); the other arm a stick. Built on the PROP_PIXELS Grid like the ogre and the
// shieldman, but in four views drawn, not five mirrored: the big arm is his right whichever way he faces,
// so the left view is its own picture (the arm on the far side of him) and only then mirrored. Poses:
// idle, walk (a step either way), up (over his head: the lift, the carry, the aim, the goat held), the fist
// back and the blow, and the throw's follow-through. Render only: nothing in the simulation reads it.
// Grown out of the concept pass output/thrower-2026-10-03/thrower.cjs; this file is the one to edit now.
const THROWER_PIXELS = (() => {
  const { Grid } = typeof PROP_PIXELS !== 'undefined' ? PROP_PIXELS : require('./prop-pixels.js');
  const W = 68, H = 60, FOOT = 58, UP = 14, N = 4, OL = '#1a1411';
  const R = {
    skin: ['#5a3222', '#8a5236', '#b87a54', '#d89c70', '#f0c49a'],
    sick: ['#26301f', '#43503a', '#66724f', '#89936c', '#a9b38b'],   // what the green makes of his arm
    red: ['#440f13', '#6e191d', '#9c2528', '#c23d36', '#dc6048'],
    iron: ['#1e1e24', '#303038', '#51505b', '#878692', '#b4b3bd'],
    bone: ['#5e5642', '#8c8166', '#c6ba98', '#ebe1c4', '#fff7e2'],
    lea: ['#1c1210', '#2c1d18', '#3e2a22', '#56392c', '#6e4a38'],
    pants: ['#14151a', '#1f2128', '#2c2f38', '#3a3e4a', '#4a4f5c'],
    wrap: ['#4e4636', '#6e6450', '#948870', '#b4a88c', '#cfc4a8'],
  };
  const J = { rest: '#2f5a1c', mid: '#5c9a2a', lit: '#9fd84a', peak: '#e4ffa0', glass: ['#12260e', '#2f5a1c', '#5c9a2a', '#9fd84a', '#e4ffa0'] };   // TUNING venom ramp

  const lit = (T, dx, dy, n) => { const l = -(dx * 0.55 + dy * 0.83); return n > 0.82 && l < -0.45 ? T[0] : n > 0.55 && l < -0.2 ? T[1] : n > 0.72 && l > 0.55 ? T[4] : n > 0.4 && l > 0.3 ? T[3] : T[2]; };
  const vol = (g, cx, cy, rx, ry, T, test) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, n = Math.hypot(dx, dy);
      if (n > 1 || (test && !test(x, y))) continue; g.set(x, y, lit(T, dx, dy, n));
    }
  };
  const limb = (g, x0, y0, x1, y1, t, T) => g.bar(x0, y0, x1, y1, t, T[2], T[3], T[1]);
  const hash = (x, y) => ((Math.imul(x + 5, 73856093) ^ Math.imul(y + 3, 19349663)) >>> 0) % 100;
  const mix = (a, b, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - k) + parseInt(b.substr(i, 2), 16) * k).toString(16).padStart(2, '0')).join('');
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };


  // The heartbeat over `N` frames: the arm's swell, and where the wave is (0 the tank, 1 the knuckles).
  const SWELL = [0, 0.5, 1, 0.3];
  const waveAt = f => f / (N - 1) * 1.25 - 0.1;
  const shade = (t, f, rest) => { const d = waveAt(f) - t; return d >= 0 && d < 0.1 ? J.peak : d >= 0.1 && d < 0.26 ? J.lit : d < 0 && d > -0.06 ? J.lit : d >= 0.26 && d < 0.4 ? J.mid : rest; };

  // ---- THE ARM ----
  // `dir` -1 is the arm on the left of the picture (the front), +1 on the right (the back); O(v) is v
  // texels outward from his body (toward his side), negative across in front of him.
  function armBones(pose, sx, sy, k, dir) {
    const O = v => sx + v * k * dir;
    if (pose === 'goat' || pose === 'man' || pose === 'up') return { S: [sx, sy], E: [O(6), sy - 5 * k], F: [O(-0.5), sy - 16 * k], up: true };
    if (pose === 'punch') return { S: [sx, sy], E: [O(8), sy + 1.5 * k], F: [O(15.5), sy + 0.5 * k] };   // the blow, straight out
    if (pose === 'punchwind') return { S: [sx, sy], E: [O(-6), sy + 4 * k], F: [O(-3), sy - 6 * k] };   // the fist drawn back past his ear
    if (pose === 'throw') return { S: [sx, sy], E: [O(8), sy + 1.5 * k], F: [O(15.5), sy + 0.5 * k], open: true };   // flung out to the side: it has just let go
    return { S: [sx, sy], E: [O(1.6), sy + 10 * k], F: [O(1.2), sy + 21 * k] };
  }
  // A limb as a tapered slab, every pixel lit by which side of it faces the upper left.
  function taper(g, A, B, wA, wB, T) {
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    const x0 = Math.floor(Math.min(A[0], B[0]) - Math.max(wA, wB)), x1 = Math.ceil(Math.max(A[0], B[0]) + Math.max(wA, wB));
    const y0 = Math.floor(Math.min(A[1], B[1]) - Math.max(wA, wB)), y1 = Math.ceil(Math.max(A[1], B[1]) + Math.max(wA, wB));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5 - A[0], py = y + 0.5 - A[1], u = (px * dx + py * dy) / (L * L);
      if (u < 0 || u > 1) continue;
      const c = (px * nx + py * ny) / ((wA + (wB - wA) * u) / 2);
      if (Math.abs(c) > 1) continue;
      g.set(x, y, lit(T, c * nx, c * ny, Math.abs(c)));
    }
  }
  // The flesh on a grid of its own, the veins on it, then the green laid into its shadows down the arm,
  // so the flesh stays flesh and the veins carry the colour. Returns the bones.
  function bigArm(g, pose, sx, sy, k, dir, f, dim) {
    const T = dim ? [R.skin[0], R.skin[0], R.skin[1], R.skin[2], R.skin[2]] : R.skin, b = armBones(pose, sx, sy, k, dir);
    const { S, E, F } = b, a = new Grid(g.w, g.h);
    a.set = g.set.bind(a); a.get = g.get.bind(a);                      // the same headroom offset as the picture
    const ang = Math.atan2(F[1] - E[1], F[0] - E[0]), cos = Math.cos(ang), sin = Math.sin(ang);
    const W1 = [F[0] - cos * 2.6 * k, F[1] - sin * 2.6 * k];             // the wrist
    taper(a, S, E, 7.4 * k, 6 * k, T);                                   // the upper arm
    vol(a, S[0] * 0.55 + E[0] * 0.45 + dir * 0.6 * k, S[1] * 0.55 + E[1] * 0.45, 4.2 * k, 4.6 * k, T);   // the bicep
    taper(a, E, W1, 9.6 * k, 6.6 * k, T);                                // the forearm, the biggest thing on him, narrowing to the wrist
    vol(a, E[0], E[1], 3.6 * k, 3.6 * k, T);
    vol(a, S[0], S[1], 5.6 * k, 5 * k, T);                               // the deltoid over it all
    // the veins: two down the forearm, one over the bicep, wandering a little, forking now and then
    const L1 = Math.hypot(E[0] - S[0], E[1] - S[1]), L2 = Math.hypot(F[0] - E[0], F[1] - E[1]), L = L1 + L2, vs = new Map(), t0 = 0.34;
    const seg = (A, B, off, ph, tA, tB, w) => {
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]), nx = -(B[1] - A[1]) / len, ny = (B[0] - A[0]) / len;
      for (let s = 0; s <= len; s += 0.4) {
        const u = s / len, wob = Math.sin(u * 5 + ph) * 0.8 * k;
        const x = Math.round(A[0] + (B[0] - A[0]) * u + nx * (off * w + wob)), y = Math.round(A[1] + (B[1] - A[1]) * u + ny * (off * w + wob));
        if (!T.includes(a.get(x, y))) continue;
        const t = t0 + (1 - t0) * (tA + (tB - tA) * u), key = x + ',' + y;
        if (!vs.has(key) || vs.get(key).t > t) vs.set(key, { x, y, t });
        if (hash(x * 7, y * 3) < 3) for (let j = 1; j <= 3; j++) { const fx = x + Math.round(nx * j * Math.sign(off)), fy = y + Math.round(ny * j * Math.sign(off)) + (j > 1 ? 1 : 0); if (T.includes(a.get(fx, fy))) vs.set(fx + ',' + fy, { x: fx, y: fy, t: t + j * 0.01 }); }
      }
    };
    if (!dim) {
      seg([S[0] * 0.8 + E[0] * 0.2, S[1] * 0.8 + E[1] * 0.2], E, 0.05, 0.4, 0.1, L1 / L, 7 * k);
      seg(E, W1, -0.3, 1.8, L1 / L, 0.97, 8 * k);
      seg(E, W1, 0.25, 4.0, L1 / L + 0.03, 1, 8 * k);
    }
    // the fist: a block of knuckles, two balls across the line of the arm; or the hand open, letting go
    const ax = -sin, ay = cos;
    if (!b.open) {
      for (const q of [-1.4, 1.4]) vol(a, F[0] + ax * q * k, F[1] + ay * q * k, 4.2 * k, 4.2 * k, T);
      const kx = F[0] + cos * 3.4 * k, ky = F[1] + sin * 3.4 * k;      // the row of knuckles at its far edge
      for (const t of [-2.7, -0.9, 0.9, 2.7]) { const x = Math.round(kx + ax * t * k), y = Math.round(ky + ay * t * k); if (a.get(x, y)) a.set(x, y, T[1]); }
      a.set(Math.round(F[0] - ax * dir * 4 * k), Math.round(F[1] - ay * dir * 4 * k), T[3]);   // the thumb's knuckle
    } else {
      vol(a, F[0], F[1], 4 * k, 3.6 * k, T);                             // the palm
      const m0 = [F[0] + cos * 2.4 * k, F[1] + sin * 2.4 * k], m1 = [F[0] + cos * 6.4 * k, F[1] + sin * 6.4 * k];
      taper(a, m0, m1, 7.2 * k, 6 * k, T);                               // the fingers together, spread a little
      for (const t of [-1.5, 0, 1.5]) a.line(Math.round(m0[0] + ax * t * k + cos * k), Math.round(m0[1] + ay * t * k + sin * k), Math.round(m1[0] + ax * t * 1.2 * k), Math.round(m1[1] + ay * t * 1.2 * k), T[1], true);
      taper(a, [F[0] - ax * 3 * k, F[1] - ay * 3 * k], [F[0] - ax * 5.4 * k + cos * 2 * k, F[1] - ay * 5.4 * k + sin * 2 * k], 2.8 * k, 2.2 * k, T);   // the thumb
    }
    for (const v of vs.values()) if (T.includes(a.get(v.x, v.y - 1)) && !vs.has(v.x + ',' + (v.y - 1))) a.set(v.x, v.y - 1, T[3]);
    const along = (x, y) => {
      const pr = (A, B) => { const dx = B[0] - A[0], dy = B[1] - A[1], u = Math.max(0, Math.min(1, ((x - A[0]) * dx + (y - A[1]) * dy) / (dx * dx + dy * dy))); return [u, Math.hypot(A[0] + dx * u - x, A[1] + dy * u - y)]; };
      const [u1, d1] = pr(S, E), [u2, d2] = pr(E, F); return d1 < d2 ? u1 * L1 / L : (L1 + u2 * L2) / L;
    };
    for (let y = -UP; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const c = a.get(x, y); if (!c) continue;
      const i = T.indexOf(c);
      g.set(x, y, i >= 0 && i <= 1 ? mix(c, R.sick[i], 0.75 * smooth(0.35, 1, along(x, y))) : c);
    }
    for (const v of vs.values()) g.set(v.x, v.y, shade(v.t, f, mix(R.sick[1], J.rest, 0.5)));
    const d = waveAt(f) - 1;                                             // the knuckles light when the wave arrives
    if (!dim && !b.open && d > -0.08 && d < 0.2) for (const t of [-2.7, -0.9, 0.9, 2.7]) g.set(Math.round(F[0] + cos * 3.4 * k + ax * t * k), Math.round(F[1] + sin * 3.4 * k + ay * t * k), d < 0.08 ? J.peak : J.lit);
    return b;
  }
  // The hose: rubber, with the green showing in a line down it, running with the wave.
  function hose(g, pts, f, t1, thick) {
    const p = [];
    for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2); for (let s = 0; s <= n; s++) p.push([a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n]); }
    for (const [x, y] of p) { g.set(x, y - 1, '#34343c'); g.set(x, y, '#26262c'); g.set(x, y + 1, '#16161a'); if (thick) g.set(x, y + 2, '#16161a'); }
    p.forEach(([x, y], i) => { if (i % 5 === 4) return; g.set(x, y, shade(i / (p.length - 1) * t1, f, J.rest)); });   // ribbed: a dark band every few
  }
  // The port screwed into his shoulder, where the hose goes in.
  const port = (g, x, y, f) => { g.ell(x, y, 2.8, 2.4, R.iron[2]); g.ell(x, y, 1.6, 1.3, R.iron[0]); g.set(Math.round(x), Math.round(y), shade(0.33, f, J.mid)); g.set(Math.round(x) - 2, Math.round(y) - 1, R.iron[4]); };
  // The tank: glass between iron bands, the green in it with a bubble rising, a valve wheel on top.
  function tank(g, x, y, w, h, f) {
    const G = J.glass, top = y + 2 + (f % 3 === 0 ? 0 : 1);
    g.rect(x, y, w, h, G[1]); g.rect(x + 1, top, w - 2, h - (top - y) - 1, G[2]); g.vl(x + 1, top + 1, h - 5, G[3]); g.vl(x + w - 2, y + 2, h - 3, G[1]);
    g.set(x + 2 + (f & 1), y + h - 3 - (f % 6), G[4]); g.set(x + w - 3, y + h - 2 - ((f + 3) % 6), G[3]);
    for (const r of [y, y + Math.round(h / 2), y + h - 1]) { g.hl(x - 1, r, w + 2, R.iron[2]); g.hl(x - 1, r, 2, R.iron[3]); }
    g.vl(x + (w >> 1), y - 3, 3, R.iron[2]); g.hl(x + (w >> 1) - 2, y - 4, 5, R.iron[3]); g.set(x + (w >> 1), y - 4, R.iron[1]);
  }

  // ---- the head: his own, the goat's skull worn over it as a mask ----
  const HORN = (g, pts, w0) => {
    pts.forEach((p, i) => { if (!i) return; const q = pts[i - 1], w = w0 * (1 - i / pts.length * 0.65); g.bar(q[0], q[1], p[0], p[1], w, R.bone[2], R.bone[3], R.bone[1]); });
    pts.forEach((p, i) => { if (i > 0 && i < pts.length - 1) g.set(Math.round(p[0]), Math.round(p[1]), R.bone[1]); });   // the rings on it
  };
  const stubble = (g, x0, y0, x1, y1, n) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (R.skin.includes(g.get(x, y)) && hash(x, y) < n) g.set(x, y, '#3e2618'); };
  // Front: the skull covers him from the crown to the upper lip, strapped on round the back of his head;
  // under it his own mouth and stubbled chin, his ears beside it, his eyes lit green in its sockets.
  function headFront(g, cx, f) {
    vol(g, cx, 13.6, 4.4, 5.2, R.skin);                                  // his head, the jaw well under the mask
    for (const s of [-1, 1]) { g.set(cx + s * 4.6, 13, R.skin[2]); g.set(cx + s * 4.6, 14, R.skin[1]); }   // his ears
    stubble(g, cx - 3, 16, cx + 3, 19, 55);
    g.hl(cx - 1, 17, 3, '#4a2418'); g.set(cx - 2, 16.6, '#4a2418');       // his mouth, set hard, turned down
    HORN(g, [[cx - 2, 8], [cx - 5, 5], [cx - 9, 4], [cx - 12, 6], [cx - 12, 9]], 3);
    HORN(g, [[cx + 2, 8], [cx + 5, 5], [cx + 9, 4], [cx + 12, 6], [cx + 12, 9]], 3);
    vol(g, cx, 10, 4.6, 3.4, R.bone);                                    // the skull's brain case on his crown
    g.poly([[cx - 4, 11], [cx + 4.5, 11], [cx + 3, 14], [cx + 1.8, 15.2], [cx - 1.4, 15.2], [cx - 2.6, 14]], R.bone[2]);   // its face, down to his lip
    for (let x = cx - 3; x <= cx + 3; x++) { const y = x >= cx - 1 && x <= cx + 1 ? 16 : 15; if (R.skin.includes(g.get(x, y))) g.set(x, y, R.skin[1]); }   // the shadow it throws on his face
    g.tone((x, y) => x >= cx + 2, R.bone[1], [R.bone[2]]); g.tone((x, y) => x <= cx - 2 && y < 14, R.bone[3], [R.bone[2]]);
    for (const ex of [cx - 2, cx + 2]) { g.set(ex - (ex < cx ? 1 : 0), 12, '#0e0a08'); g.set(ex - (ex < cx ? 0 : 1), 12, '#0e0a08'); g.set(ex - (ex < cx ? 0 : 1), 12, shade(0.1, f, J.lit)); }   // the sockets, his eyes in them
    g.set(cx, 14, '#0e0a08');                                            // the nose's hole
    g.hl(cx - 1, 15, 3, R.bone[4]);                                      // its teeth, over his own lip
    for (const s of [-1, 1]) { g.line(cx + s * 4, 11, cx + s * 4.6, 15, R.lea[3]); g.set(cx + s * 4, 12, R.iron[3]); }   // the straps down past his ears, a rivet
  }
  function headSide(g, cx, f) {
    vol(g, cx, 14, 4.2, 4.8, R.skin);
    g.set(cx - 1, 14, R.skin[1]); g.set(cx - 1, 13, R.skin[2]);         // his ear
    vol(g, cx + 3, 17.2, 2.4, 1.8, R.skin); stubble(g, cx, 16, cx + 5, 19, 55); g.set(cx + 4, 16, '#4a2418');   // his chin out under the snout
    HORN(g, [[cx - 1, 8], [cx - 5, 5], [cx - 9, 6], [cx - 11, 10], [cx - 9, 13]], 3.2);
    vol(g, cx + 0.5, 10.5, 4.6, 3.2, R.bone);
    g.poly([[cx + 1, 9.5], [cx + 7, 12.5], [cx + 8.4, 14.5], [cx + 7.5, 16], [cx + 2, 16], [cx + 0.5, 13]], R.bone[2]);   // the snout, long, out past his face
    g.tone((x, y) => y >= 15, R.bone[1], [R.bone[2]]); g.hl(cx + 2, 11, 4, R.bone[3], true);
    g.set(cx + 2, 12, '#0e0a08'); g.set(cx + 3, 12, shade(0.1, f, J.lit));
    g.set(cx + 7, 14, '#0e0a08'); g.hl(cx + 4, 16, 3, R.bone[4]);
    g.line(cx - 2, 13, cx + 1, 14, R.lea[3]); g.set(cx - 1, 13, R.iron[3]);   // the strap round the back of his head
  }
  function headBack(g, cx) {
    vol(g, cx, 14, 4.4, 4.8, R.skin);
    stubble(g, cx - 4, 11, cx + 4, 18, 30);                              // cropped hair
    for (const s of [-1, 1]) g.set(cx + s * 4.6, 14, R.skin[1]);
    HORN(g, [[cx - 2, 9], [cx - 5, 6], [cx - 9, 5], [cx - 12, 7], [cx - 12, 10]], 3);
    HORN(g, [[cx + 2, 9], [cx + 5, 6], [cx + 9, 5], [cx + 12, 7], [cx + 12, 10]], 3);
    vol(g, cx, 10, 4.6, 3, R.bone, (x, y) => y <= 11);                   // the back of the skull, sat on his crown
    g.hl(cx - 4, 13, 9, R.lea[2]); g.hl(cx - 4, 12, 9, R.lea[3], true); g.vl(cx, 11, 3, R.lea[2]);   // the straps that hold it, buckled
    g.rect(cx - 1, 12, 2, 2, R.iron[3]);
  }

  // The puny one: a thin arm, wasted, bound at the wrist, the green took nothing from it because it gave it nothing.
  const PUNY = R.skin.map(c => mix(c, '#9a8a80', 0.3));
  const punyArm = (g, S, E, F, dim) => {
    const T = dim ? PUNY.map(c => mix(c, '#000000', 0.25)) : PUNY;
    vol(g, S[0], S[1], 2.4, 2.2, T); taper(g, S, E, 2.6, 2.2, T); taper(g, E, F, 2.2, 1.8, T); vol(g, E[0], E[1], 1.3, 1.3, T);
    vol(g, F[0], F[1] + 0.5, 1.4, 1.3, T);
    const w = [E[0] * 0.35 + F[0] * 0.65, E[1] * 0.35 + F[1] * 0.65]; g.set(w[0] - 1, w[1], R.wrap[2]); g.set(w[0], w[1], R.wrap[3]); g.set(w[0] + 1, w[1], R.wrap[2]);
  };
  const boots = (g, fx, lift, dim) => {
    const x = Math.round(fx - 3.5);
    g.rect(x, FOOT - 5 - lift, 8, 5, dim ? R.lea[1] : R.lea[2]); g.hl(x, FOOT - 5 - lift, 8, dim ? R.lea[2] : R.lea[3]); g.hl(x, FOOT - 3 - lift, 8, R.wrap[dim ? 0 : 1]); g.hl(x, FOOT - 1 - lift, 9, R.lea[0]);
  };
  // The arm's pose for a view: 'up' is anything over his head; the back hides a blow.
  const armPose = (pose, view) => pose === 'up' ? 'goat' : view === 'N' || pose === 'walk' ? 'idle' : pose;

  // ---- THE FRONT ----
  function front(g, o) {
    const cx = 36, f = o.f, k = 1.05 * (1 + 0.07 * SWELL[f]), T = R.skin, st = o.step || 0;
    tank(g, cx + 7, 9, 7, 12, f);                                      // over his left shoulder, behind him
    for (const [hx, fx, lift] of [[cx - 4, cx - 4.5, Math.max(0, st) * 2], [cx + 4, cx + 5, Math.max(0, -st) * 2]]) { limb(g, hx, 40, fx, FOOT - 3 - lift, 6.4, R.pants); boots(g, fx, lift); }
    g.poly([[cx - 3, 40], [cx + 5, 40], [cx + 4, 48], [cx + 1, 50], [cx - 2, 48]], R.red[2]);   // the cult's red down the front
    g.vl(cx - 2, 41, 7, R.red[3], true); g.vl(cx + 4, 41, 7, R.red[1], true);
    vol(g, cx + 0.5, 34, 7.6, 5.6, T);                                 // the gut
    vol(g, cx + 0.5, 27, 11, 7.2, T);                                  // the chest
    g.hl(cx - 6, 30, 6, T[1], true); g.hl(cx + 1, 30, 6, T[1], true); g.vl(cx, 27, 4, T[1], true);
    for (const y of [33, 35]) { g.set(cx - 2, y, T[1]); g.set(cx + 2, y, T[1]); }
    g.line(cx + 4, 26, cx + 6, 28, R.red[1]); g.line(cx + 6, 26, cx + 4, 28, R.red[1]);   // the cult's mark, burnt in
    g.line(cx - 8, 21, cx + 6, 38, R.lea[2]);                           // one strap: the tank's
    g.rect(cx - 7, 38, 16, 2, R.lea[1]); g.hl(cx - 7, 38, 16, R.lea[3]); g.rect(cx, 38, 2, 2, R.iron[3]);
    punyArm(g, [cx + 10.5, 22.5], [cx + 12, 28.5 - st * 0.5], [cx + 11.5, 34 - st * 0.5]);
    if (o.pose === 'throw') {
      const S0 = [cx - 11, 22], rr = 15.5 * k;                          // the swing it came round, brightest at the hand
      for (let an = -1.55; an > -3.1; an -= 0.02) for (const dr of [0, 1]) { const x = Math.round(S0[0] + Math.cos(an) * (rr + dr)), y = Math.round(S0[1] + Math.sin(an) * (rr + dr)); if (!g.get(x, y)) g.set(x, y, an > -2.0 ? '#4a4038' : an > -2.5 ? '#7a6c58' : '#bdb196'); }
    }
    bigArm(g, armPose(o.pose, 'S'), cx - 11, 22, k, -1, f);
    hose(g, [[cx + 10, 6], [cx + 5, 10], [cx - 2, 15], [cx - 7, 19]], f, 0.33);
    port(g, cx - 7.5, 19.5, f);
    g.poly([[cx - 7, 19.6], [cx + 8, 19.6], [cx + 8.5, 22], [cx + 4, 24], [cx + 1, 22.5], [cx - 2, 24], [cx - 7.5, 22]], R.red[2]);   // the red mantle under his chin
    g.hl(cx - 6, 20, 14, R.red[3], true); g.tone((x, y) => x > cx + 4, R.red[1], [R.red[2]]);
    headFront(g, cx, f);
  }

  // ---- THE SIDE, facing east. `far`: the big arm on the far side of him (the left view, mirrored after),
  // drawn dim behind his body, and the puny one toward us. The arm is his right whichever way he faces.
  function side(g, o, far) {
    const cx = 30, f = o.f, k = 1.05 * (1 + 0.07 * SWELL[f]), T = R.skin, s = (o.step || 0) * 2.5, ap = armPose(o.pose, far ? 'W' : 'E');
    tank(g, cx - 12, 18, 6, 15, f); g.rect(cx - 6, 21, 3, 2, R.lea[1]); g.rect(cx - 6, 29, 3, 2, R.lea[1]);
    // the far arm hangs from a shoulder set forward, so its fist shows past his belly: the arm is the man
    if (far) bigArm(g, ap, cx + 4, 22, k, 1, f, true);
    else punyArm(g, [cx + 1, 22.5], [cx + 2.5 - s * 0.5, 28.5], [cx + 3.5 - s * 0.5, 34], true);
    for (const [fx, near] of [[cx - 1.5 - s, false], [cx + 1.5 + s, true]]) { limb(g, cx, 40, fx, FOOT - 3, 6.4, near ? R.pants : R.pants.map(c => mix(c, '#000000', 0.3))); boots(g, fx + 1, 0, !near); }
    vol(g, cx + 2, 34, 7, 5.8, T);                                     // gut out in front
    vol(g, cx, 27, 8.6, 7.4, T);                                       // the chest and back, thick
    g.rect(cx - 6, 38, 14, 2, R.lea[1]); g.hl(cx - 6, 38, 14, R.lea[3]);
    g.poly([[cx + 4, 40], [cx + 8, 40], [cx + 7, 48], [cx + 4, 48]], R.red[2]);
    g.line(cx - 5, 20, cx - 5, 38, R.lea[2]);
    if (!far) { bigArm(g, ap, cx - 1, 22, k, 1, f); hose(g, [[cx - 9, 16], [cx - 5, 18], [cx - 2, 19]], f, 0.33); port(g, cx - 1.5, 19.5, f); }
    else { hose(g, [[cx - 9, 16], [cx - 5, 17], [cx - 2, 17.5]], f, 0.33); punyArm(g, [cx - 0.5, 22.5], [cx + 1.5 + s * 0.5, 28.5], [cx + 2.5 + s * 0.5, 34]); }
    g.poly([[cx - 7, 18], [cx + 4, 18], [cx + 5, 22], [cx - 1, 23.5], [cx - 8, 22]], R.red[2]); g.tone((x, y) => x < cx - 3, R.red[1], [R.red[2]]);
    headSide(g, cx + 1, f);
  }

  // ---- THE BACK: the tank is the picture ----
  function back(g, o) {
    const cx = 36, f = o.f, k = 1.05 * (1 + 0.07 * SWELL[f]), T = R.skin, st = o.step || 0;
    for (const [hx, fx, lift] of [[cx - 4, cx - 5, Math.max(0, -st) * 2], [cx + 4, cx + 5, Math.max(0, st) * 2]]) { limb(g, hx, 40, fx, FOOT - 3 - lift, 6.4, R.pants); boots(g, fx, lift); }
    vol(g, cx, 34, 7.6, 5.6, T); vol(g, cx, 27, 11, 7.2, T);
    g.vl(cx, 22, 15, T[1], true); g.hl(cx - 8, 28, 4, T[1], true); g.hl(cx + 5, 28, 4, T[1], true);
    g.rect(cx - 8, 38, 16, 2, R.lea[1]); g.hl(cx - 8, 38, 16, R.lea[3]);
    g.poly([[cx - 4, 40], [cx + 4, 40], [cx + 3, 47], [cx - 3, 47]], R.red[1]);
    punyArm(g, [cx - 10.5, 22.5], [cx - 12, 28.5], [cx - 11.5, 34]);
    g.line(cx - 6, 20, cx - 4, 38, R.lea[2]); g.line(cx + 6, 20, cx + 4, 38, R.lea[2]);
    tank(g, cx - 5, 21, 10, 15, f);
    g.rect(cx - 6, 25, 12, 2, R.lea[1]); g.rect(cx - 6, 31, 12, 2, R.lea[1]);
    bigArm(g, armPose(o.pose, 'N'), cx + 11, 22, k, 1, f);
    hose(g, [[cx, 18], [cx + 4, 17], [cx + 7, 18.5]], f, 0.33);
    port(g, cx + 7.5, 19.5, f);
    g.poly([[cx - 7, 18], [cx + 7, 18], [cx + 8, 21], [cx + 3, 24], [cx, 22.5], [cx - 3, 24], [cx - 8, 21]], R.red[2]); g.tone((x, y) => x > cx + 3, R.red[1], [R.red[2]]);
    headBack(g, cx);
  }

  // Drawn `UP` rows down so a fist over his head is not cut off by the top of the grid.
  class Off extends Grid { set(x, y, c) { return super.set(x, Math.round(y) + UP, c); } get(x, y) { return super.get(x, Math.round(y) + UP); } }
  // Where his feet are across each view's grid (the left view is the mirrored right one).
  const ANCHOR = { S: 36.5, E: 30.5, N: 36.5, W: W - 30.5 };
  const cache = new Map();
  // One picture of him: `view` S E N W, `pose` idle walk up punchwind punch throw, `step` -1 0 1, `f` the pulse 0..N-1.
  function sprite(view, pose, step, f) {
    const key = view + pose + step + f; let g = cache.get(key); if (g) return g;
    const o = new Off(W, H + UP), opt = { f, pose, step };
    if (view === 'S') front(o, opt); else if (view === 'N') back(o, opt); else side(o, opt, view === 'W');
    g = new Grid(W, H + UP); g.p = o.p;
    if (view === 'W') { const m = new Grid(W, H + UP); for (let y = 0; y < g.h; y++) for (let x = 0; x < W; x++) m.p[y * W + x] = g.p[y * W + W - 1 - x]; g = m; }
    g.outline(OL); g.clean(OL);
    cache.set(key, g); return g;
  }
  return { W, H, FOOT, UP, N, ANCHOR, sprite };
})();
if (typeof module !== 'undefined') module.exports = THROWER_PIXELS;

// In the page: each picture baked once to a canvas, `BAKE` px a texel, drawn smoothed at `TX` world px a
// texel with his feet on the origin, inside the frame `PaintedArt.character` has already leaned. Baked as
// asked for (a view, a pose, a step, a beat of the pulse), so only what is seen is ever painted.
if (typeof document !== 'undefined') {
  const BAKE = 2, baked = new Map();
  THROWER_PIXELS.TX = 0.84;
  THROWER_PIXELS.canvas = (g) => {
    let c = baked.get(g); if (c) return c;
    c = document.createElement('canvas'); c.width = g.w * BAKE; c.height = g.h * BAKE;
    const x = c.getContext('2d');
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const v = g.get(i, j); if (v) { x.fillStyle = v; x.fillRect(i * BAKE, j * BAKE, BAKE, BAKE); } }
    baked.set(g, c); return c;
  };
  // What his state shows (js/thrower.js): over his head through the lift, the carry, the aim and the goat
  // held; the fist back in a windup, out in the blow and the grab; the follow-through just after a throw.
  THROWER_PIXELS.poseOf = (e) => {
    if (e.twFollow > 0) return 'throw';
    if (e.state === 'twlift' || e.state === 'twcarry' || e.state === 'twaim' || e.state === 'twhold') return 'up';
    if (e.state === 'windup') return 'punchwind';
    if (e.state === 'swing' || e.state === 'twgrab') return 'punch';
    return 'idle';
  };
  // The pulse quickens through every tell (`TUNING.thrower.pulse`): the heart is how he says what is coming.
  THROWER_PIXELS.draw = (ctx, angle, moving, t, x, e) => {
    const P = THROWER_PIXELS, U = TUNING.thrower.pulse, pose = e ? P.poseOf(e) : 'idle';
    const view = typeof Thrower !== 'undefined' ? Thrower.viewOf(angle) : 'S';
    const tell = e && (e.state === 'windup' || e.state === 'twgrab' || e.state === 'twaim' || e.state === 'twlift');
    const f = Math.floor(t * (tell ? U.tell : U.rest) + (x || 0) * 0.01) % P.N;
    const ph = Math.floor(t * 4.5 + (x || 0) * 0.05) % 4, step = moving && (pose === 'idle' || pose === 'up') ? [0, 1, 0, -1][ph] : 0;
    const g = P.sprite(view, pose === 'idle' && moving ? 'walk' : pose, step, f), k = P.TX;
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.save(); if (moving) ctx.rotate(step * 0.04);
    ctx.drawImage(P.canvas(g), -P.ANCHOR[view] * k, -(P.FOOT + P.UP) * k, P.W * k, (P.H + P.UP) * k);
    ctx.restore(); ctx.imageSmoothingEnabled = smooth;
  };
}
