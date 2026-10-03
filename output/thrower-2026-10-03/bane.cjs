// node bane.cjs → bane.png + bane.html: THE THROWER as a one-armed Bane (3 Oct 2026, the user's: "a bit
// like Bane, veins pulsing green or violet in the arm, Bane with one arm"). A masked brute, a tank on his
// back, a hose over his shoulders into the one huge arm; what is pumped runs down the hose and the veins
// as a wave, and the arm swells on the beat. Green is the game's poison (TUNING venom ramp), violet the
// cult's witchfire (PALETTE.witch). Six looks x two colours x three poses (standing, a man up, the goat
// up), eight frames each. Concept art only: nothing in js/ loads this.
const fs = require('fs'), { Img, text } = require('../pixel-claude-2026-09-24/png.cjs');
const { Grid } = require('../../js/prop-pixels.js');

const W = 58, H = 72, FOOT = 70, UP = 12, N = 8, OL = '#1a1411';
const R = {
  skin: ['#5a3222', '#8a5236', '#b87a54', '#d89c70', '#f0c49a'],
  dusk: ['#3a2218', '#5e3a28', '#86563a', '#a8724e', '#c49068'],
  pale: ['#4a3438', '#76585c', '#a2817f', '#c4a39b', '#e2c7bb'],
  fur: ['#24160f', '#432a1b', '#644027', '#875a36', '#a8794c'],
  red: ['#440f13', '#6e191d', '#9c2528', '#c23d36', '#dc6048'],
  iron: ['#1e1e24', '#303038', '#51505b', '#878692', '#b4b3bd'],
  bone: ['#6e6650', '#8c8166', '#c6ba98', '#ebe1c4', '#fff7e2'],
  lea: ['#1c1210', '#2c1d18', '#3e2a22', '#56392c', '#6e4a38'],
  pants: ['#14151a', '#1f2128', '#2c2f38', '#3a3e4a', '#4a4f5c'],
  brown: ['#2a170c', '#46280f', '#653a17', '#86512a', '#a46c3c'],
  wool: ['#7a7062', '#a89c88', '#d0c6b2', '#ebe3d2', '#fffaf0'],
};
// what runs in him: [vein at rest, vein lit, the wave's crest, the glass and hose]
const JUICE = {
  green: { rest: '#2f5a1c', mid: '#5c9a2a', lit: '#9fd84a', peak: '#e4ffa0', glass: ['#12260e', '#2f5a1c', '#5c9a2a', '#9fd84a', '#e4ffa0'] },
  violet: { rest: '#3e2a7a', mid: '#5f44c8', lit: '#7d5cff', peak: '#d8ccff', glass: ['#1c1240', '#3e2a7a', '#5f44c8', '#7d5cff', '#bfe6ff'] },
};

const lit = (T, dx, dy, n) => { const l = -(dx * 0.55 + dy * 0.83); return n > 0.82 && l < -0.45 ? T[0] : n > 0.55 && l < -0.2 ? T[1] : n > 0.72 && l > 0.55 ? T[4] : n > 0.4 && l > 0.3 ? T[3] : T[2]; };
const vol = (g, cx, cy, rx, ry, T, test) => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, n = Math.hypot(dx, dy);
    if (n > 1 || (test && !test(x, y))) continue; g.set(x, y, lit(T, dx, dy, n));
  }
};
const limb = (g, x0, y0, x1, y1, t, T) => g.bar(x0, y0, x1, y1, t, T[2], T[3], T[1]);
const hash = (x, y) => ((Math.imul(x + 5, 73856093) ^ Math.imul(y + 3, 19349663)) >>> 0) % 100;

// The heartbeat: how swollen the arm is on each frame, and where the wave is (0 the tank, 1 the knuckles).
const SWELL = [0, 0, 0, 0.4, 1, 0.7, 0.3, 0];
const waveAt = f => f / (N - 1) * 1.25 - 0.1;
const mix = (a, b, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - k) + parseInt(b.substr(i, 2), 16) * k).toString(16).padStart(2, '0')).join('');
const shade = (J, t, f, skin) => { const d = waveAt(f) - t; return d >= 0 && d < 0.1 ? J.peak : d >= 0.1 && d < 0.26 ? J.lit : d < 0 && d > -0.06 ? J.lit : d >= 0.26 && d < 0.4 ? J.mid : skin ? mix(skin, J.rest, 0.45) : J.rest; };

// THE ARM: shoulder, elbow, fist; a bicep and a forearm as balls on the bones, so it reads as muscle, not
// a pipe. Returns the bones, so the veins can be laid along them after the flesh.
function bigArm(g, sx, sy, T, k, up) {
  const E = up ? [sx - 8 * k, sy - 4 * k] : [sx - 5 * k, sy + 10 * k];
  const F = up ? [sx - 2 * k, sy - 15 * k] : [sx - 6 * k, Math.min(FOOT - 5 * k, sy + 22 * k)];
  vol(g, sx, sy, 6 * k, 5.4 * k, T);                                   // the shoulder, a boulder
  limb(g, sx, sy, E[0], E[1], 7 * k, T);
  vol(g, (sx + E[0]) / 2 - (up ? 1 : 1.5) * k, (sy + E[1]) / 2, 4.6 * k, 4.4 * k, T);   // the bicep
  limb(g, E[0], E[1], F[0], F[1], 7.5 * k, T);
  vol(g, E[0] * 0.65 + F[0] * 0.35, E[1] * 0.65 + F[1] * 0.35, 4.6 * k, 4.6 * k, T);   // the forearm, fat at the top
  vol(g, F[0], F[1], 5.4 * k, 4.8 * k, T);                             // the fist
  if (!up) for (const t of [-2, 0, 2]) g.set(Math.round(F[0] + t * k), Math.round(F[1] + 3.6 * k), T[0]);
  return { S: [sx, sy], E, F, k, T };
}
// The veins: three that run the length of him, wandering, and short forks off them; every pixel keeps how
// far down the arm it is (t), so the wave can be drawn running down them.
function veins(g, arm, J, f, t0) {
  const { S, E, F, k, T } = arm, out = new Map();
  const L1 = Math.hypot(E[0] - S[0], E[1] - S[1]), L2 = Math.hypot(F[0] - E[0], F[1] - E[1]), L = L1 + L2;
  const seg = (A, B, off, ph, tA, tB, w) => {
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]), nx = -(B[1] - A[1]) / len, ny = (B[0] - A[0]) / len;
    for (let s = 0; s <= len; s += 0.4) {
      const u = s / len, wob = Math.sin(u * 6.3 + ph) * 1.1 * k + Math.sin(u * 13 + ph * 2) * 0.4;
      const x = Math.round(A[0] + (B[0] - A[0]) * u + nx * (off * w + wob)), y = Math.round(A[1] + (B[1] - A[1]) * u + ny * (off * w + wob));
      if (!T.includes(g.get(x, y))) continue;
      const t = t0 + (1 - t0) * (tA + (tB - tA) * u), key = x + ',' + y;
      if (!out.has(key) || out.get(key).t > t) out.set(key, { x, y, t });
      // a fork now and then, a short run off sideways
      if (hash(x * 7, y * 3) < 2) for (let j = 1; j <= 3; j++) { const fx = x + Math.round(nx * j * Math.sign(off || 1)), fy = y + j; if (T.includes(g.get(fx, fy))) out.set(fx + ',' + fy, { x: fx, y: fy, t: t + j * 0.01 }); }
    }
  };
  for (const [off, ph] of [[-0.22, 0.5], [0.2, 3.1]]) {
    seg(S, E, off, ph, 0, L1 / L, 7 * k);
    seg(E, F, off * 0.9, ph + 1.3, L1 / L, (L - 3 * k) / L, 7.5 * k);
  }
  // a vein stands up off the muscle: its own line, and a lit pixel above it where the skin is
  for (const v of out.values()) { if (T.includes(g.get(v.x, v.y - 1)) && !out.has(v.x + ',' + (v.y - 1))) g.set(v.x, v.y - 1, T[3]); }
  for (const v of out.values()) g.set(v.x, v.y, shade(J, v.t, f, T[1]));
  // the knuckles light when the wave arrives
  const d = waveAt(f) - 1;
  if (d > -0.08 && d < 0.2) for (const t of [-2, 0, 2]) g.set(Math.round(F[0] + t * k), Math.round(F[1] + (arm.up ? -2 : 1.5) * k), d < 0.08 ? J.peak : J.lit);
}
// The hose from the tank over his shoulders into the big arm's shoulder: rubber, with the stuff showing
// through it in a line, running with the wave.
function hose(g, pts, J, f, t1) {
  const path = [];
  for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2); for (let s = 0; s <= n; s++) path.push([a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n]); }
  for (const [x, y] of path) { g.set(x, y - 1, '#2a2a30'); g.set(x, y, '#2a2a30'); g.set(x, y + 1, '#18181c'); }
  path.forEach(([x, y], i) => { const t = i / (path.length - 1) * t1; g.set(x, y, shade(J, t, f)); });
}
// The tank on his back, seen over his left shoulder: glass, iron bands, the stuff inside, a bubble rising.
function tank(g, x, y, J, f) {
  const G = J.glass;
  g.rect(x, y, 8, 13, G[1]); g.rect(x + 1, y + 2 + (f % 3 === 0 ? 0 : 1), 6, 11, G[2]); g.vl(x + 1, y + 3, 9, G[3]); g.vl(x + 6, y + 2, 11, G[1]);
  g.set(x + 3 + (f & 1), y + 11 - f, G[4]);
  for (const r of [y, y + 6, y + 12]) g.hl(x - 1, r, 10, r === y ? R.iron[3] : R.iron[2]);
  g.rect(x + 3, y - 2, 2, 2, R.iron[2]);
}
const eyes = (g, x, y, c, gap = 2) => { g.set(x - gap + 1, y, c); g.set(x + gap - 1, y, c); };

// What he lifts: one of his own, or the goat.
function clubman(g, x, y) {
  const top = y - 9;
  g.ell(x - 1, top, 9, 3.6, R.red[2]); g.hl(Math.round(x - 9), Math.round(top - 2), 16, R.red[3], true); g.hl(Math.round(x - 8), Math.round(top + 2), 15, R.red[1], true);
  vol(g, x + 10, top - 0.5, 3, 3, R.skin); g.set(Math.round(x + 11), Math.round(top - 1), '#120b0a');
  limb(g, x - 9, top, x - 14, top - 5, 2.2, R.skin); limb(g, x - 8, top + 1, x - 15, top + 2, 2.2, R.skin);
  limb(g, x + 4, top + 2, x + 7, top + 7, 2, R.skin);
  g.line(Math.round(x + 6), Math.round(top - 3), Math.round(x + 12), Math.round(top - 9), R.brown[2]);
}
function goat(g, x, y) {
  const top = y - 8, Wl = R.wool;
  for (const [lx, d] of [[-6, -1], [-3, 1], [3, -1], [6, 1]]) { limb(g, x + lx, top + 1, x + lx + d, top + 7, 1.8, Wl); g.set(Math.round(x + lx + d), Math.round(top + 8), '#2a2420'); }
  vol(g, x, top, 9, 4.2, Wl);
  vol(g, x + 10, top - 2, 3.4, 3, Wl); g.set(Math.round(x + 12), Math.round(top - 1), Wl[1]);   // the head, the muzzle
  g.set(Math.round(x + 10), Math.round(top - 2), '#120b0a');
  g.line(Math.round(x + 9), Math.round(top - 5), Math.round(x + 6), Math.round(top - 7), R.bone[1]); g.line(Math.round(x + 10), Math.round(top - 5), Math.round(x + 8), Math.round(top - 8), R.bone[2]);   // horns
  g.set(Math.round(x - 9), Math.round(top - 2), Wl[3]); g.set(Math.round(x - 10), Math.round(top - 3), Wl[2]);   // the tail
}

// ---- the body every look shares: a V of a man, harness, trousers, boots, the small arm, the tank ----
function body(g, o) {
  const cx = 30, J = o.J, f = o.f, sw = SWELL[f], T = o.skin;
  if (o.tank !== false) tank(g, cx + 9, 13, J, f);
  // legs: trousers and boots
  for (const [hx, fx] of [[cx - 4, cx - 5], [cx + 6, cx + 7]]) { limb(g, hx, 46, fx, FOOT - 4, 7, o.pants || R.pants); g.rect(Math.round(fx - 4), FOOT - 6, 9, 6, R.lea[1]); g.hl(Math.round(fx - 4), FOOT - 6, 9, R.lea[3]); g.hl(Math.round(fx - 4), FOOT - 1, 10, R.lea[0]); }
  g.rect(cx - 8, 44, 18, 3, R.lea[1]); g.hl(cx - 8, 44, 18, R.lea[3]); g.rect(cx, 44, 3, 3, R.iron[3]);   // the belt and its buckle
  // the torso: a V, pecs, a stack of abs
  vol(g, cx + 1, 40, 8.5, 6.5, T);
  vol(g, cx + 1, 31, 13, 8.5, T);
  if (o.fur) vol(g, cx + 1, 30, 13.5, 8, o.fur, (x, y) => y < 33 || x < cx - 6 || x > cx + 8);
  g.hl(cx - 7, 35, 7, T[1], true); g.hl(cx + 2, 35, 7, T[1], true); g.vl(cx + 1, 31, 5, T[1], true);
  for (const y of [38, 41]) { g.set(cx - 1, y, T[1]); g.set(cx + 3, y, T[1]); }
  if (o.harness !== false) {                                          // straps over the chest, a ring where they cross
    g.line(cx - 9, 26, cx + 7, 43, o.strap || R.lea[2]); g.line(cx - 8, 26, cx + 8, 43, o.strap || R.lea[2]);
    g.ell(cx, 34, 1.6, 1.6, R.iron[3]); g.set(cx, 34, R.iron[1]);
  }
  // the small arm, still a strong man's
  vol(g, cx + 13, 28, 4, 3.6, T); limb(g, cx + 13, 28, cx + 16, 36, 4.8, T); limb(g, cx + 16, 36, cx + 15, 44, 4.2, T); vol(g, cx + 15, 45, 2.6, 2.4, T);
  if (o.cuff) { g.hl(cx + 13, 41, 5, R.iron[3], true); g.hl(cx + 13, 42, 5, R.iron[2], true); }
  if (o.pose !== 'idle') (o.pose === 'goat' ? goat : clubman)(g, cx - 13, 6);
  const arm = bigArm(g, cx - 11, 27, T, 1.32 * (1 + 0.07 * sw), o.pose !== 'idle'); arm.up = o.pose !== 'idle';
  veins(g, arm, J, f, 0.32);
  if (o.tank !== false) hose(g, [[cx + 12, 11], [cx + 6, 9], [cx - 4, 14], [cx - 11, 21]], J, f, 0.32);
  vol(g, cx + 1, 25, 5.5, 3.4, T);                                    // the neck, as wide as the head
  return cx;
}

const LOOKS = [
  { name: 'the pump', ru: 'НАСОС', note: 'кожаная маска, решётка на рту, две трубки от маски', colour: 'green', draw(g, o) {
    const cx = body(g, { ...o, skin: R.skin });
    vol(g, cx + 1, 20, 4.6, 5, R.lea);                                // the mask over the whole head
    eyes(g, cx + 1, 19, '#f0e0b0'); g.set(cx - 1, 18, R.lea[0]); g.set(cx + 3, 18, R.lea[0]);
    g.rect(cx - 1, 22, 5, 3, R.iron[3]); for (const x of [cx, cx + 2]) g.vl(x, 22, 3, R.iron[1]);   // the grille
    g.line(cx - 2, 23, cx - 5, 27, R.iron[2]); g.line(cx + 4, 23, cx + 7, 27, R.iron[2]);   // tubes off it
    g.set(cx - 5, 27, o.J.lit); g.set(cx + 7, 27, o.J.lit);
  } },
  { name: 'cult luchador', ru: 'ЛУЧАДОР КУЛЬТА', note: 'маска сшита из красной рясы, швы, белая кайма у глаз', colour: 'violet', draw(g, o) {
    const cx = body(g, { ...o, skin: R.dusk, strap: R.red[1] });
    vol(g, cx + 1, 20, 4.8, 5.2, R.red);
    for (const y of [16, 18, 20, 22]) g.set(cx + 1, y, R.red[0]);     // the seam up the middle
    g.rect(cx - 2, 18, 2, 2, R.bone[3]); g.rect(cx + 3, 18, 2, 2, R.bone[3]); g.set(cx - 1, 19, '#120b0a'); g.set(cx + 3, 19, '#120b0a');
    g.hl(cx - 1, 23, 5, R.red[0]); g.set(cx + 1, 24, R.dusk[1]);      // a slot for the mouth
    g.line(cx - 3, 15, cx - 5, 12, R.red[3]); g.line(cx + 5, 15, cx + 7, 12, R.red[3]);   // two red tufts like horns
  } },
  { name: 'the muzzled', ru: 'В НАМОРДНИКЕ', note: 'лысый, железная клетка на лице, кандалы на малой руке', colour: 'green', draw(g, o) {
    const cx = body(g, { ...o, skin: R.pale, cuff: true });
    vol(g, cx + 1, 20, 4.6, 5, R.pale);
    eyes(g, cx + 1, 19, '#120b0a'); g.set(cx - 1, 17, R.pale[1]); g.set(cx + 3, 17, R.pale[1]);
    g.hl(cx - 3, 21, 9, R.iron[3]); g.hl(cx - 3, 25, 9, R.iron[2]); for (const x of [cx - 3, cx - 1, cx + 1, cx + 3, cx + 5]) g.vl(x, 21, 5, R.iron[2]);   // the cage
    g.line(cx - 4, 21, cx - 5, 15, R.lea[3]); g.line(cx + 6, 21, cx + 7, 15, R.lea[3]);   // its straps round the skull
  } },
  { name: 'goat skull bane', ru: 'КОЗИЙ ЧЕРЕП', note: 'череп козы вместо маски, трубки уходят в зубы', colour: 'violet', draw(g, o) {
    const cx = body(g, { ...o, skin: R.skin });
    vol(g, cx + 1, 20, 5, 5.4, R.bone);
    g.bar(cx - 3, 17, cx - 7, 11, 2.4, R.bone[2], R.bone[3], R.bone[1]); g.bar(cx + 5, 17, cx + 9, 11, 2.4, R.bone[2], R.bone[3], R.bone[1]);
    g.set(cx - 1, 19, '#120b0a'); g.set(cx + 3, 19, '#120b0a'); g.set(cx - 1, 20, o.J.lit); g.set(cx + 3, 20, o.J.lit);
    g.vl(cx + 1, 21, 3, R.bone[1]); g.hl(cx - 1, 24, 5, R.bone[1]); for (const x of [cx - 1, cx + 1, cx + 3]) g.set(x, 25, R.bone[4]);
    g.line(cx - 2, 25, cx - 5, 28, R.iron[2]); g.line(cx + 4, 25, cx + 7, 28, R.iron[2]);
  } },
  { name: 'gas mask', ru: 'ПРОТИВОГАЗ', note: 'круглые стёкла, фильтр-хобот, шланг к баку', colour: 'green', draw(g, o) {
    const cx = body(g, { ...o, skin: R.dusk, pants: R.brown });
    vol(g, cx + 1, 20, 4.8, 5.2, R.lea);
    for (const ex of [cx - 1, cx + 3]) { g.ell(ex + 0.5, 19.5, 1.6, 1.6, R.iron[3]); g.set(ex, 19, o.J.lit); }   // the round glass, lit from inside
    vol(g, cx + 1, 24, 2.4, 2.4, R.iron); g.set(cx + 1, 25, R.iron[0]);   // the filter snout
    g.line(cx + 3, 25, cx + 8, 22, '#2a2a30'); g.line(cx + 8, 22, cx + 10, 14, '#2a2a30');   // its own hose back to the tank
  } },
  { name: 'bigfoot bane', ru: 'БИГФУТ-БЕЙН', note: 'первая идея: шерсть на плечах, маска и бак поверх', colour: 'violet', draw(g, o) {
    const cx = body(g, { ...o, skin: R.dusk, fur: R.fur, harness: false });
    vol(g, cx + 1, 20, 5.4, 5.6, R.fur);
    vol(g, cx + 1, 21, 3.6, 3.6, R.iron);                              // an iron face plate in the fur
    eyes(g, cx + 1, 20, o.J.lit); g.hl(cx - 1, 23, 5, R.iron[0]);
    for (let y = 22; y < 56; y += 2) for (let x = cx - 26; x < cx + 20; x++) { const v = g.get(x, y); if (R.fur.includes(v) && hash(x, y) < 18) { g.set(x, y, R.fur[0]); g.set(x, y + 1, R.fur[1]); } }
  } },
];

const POSES = ['idle', 'man', 'goat'];
class Off extends Grid { set(x, y, c) { return super.set(x, Math.round(y) + UP, c); } get(x, y) { return super.get(x, y + UP); } }
const sprite = (look, colour, pose, f) => { const o = new Off(W, H + UP); look.draw(o, { J: JUICE[colour], f, pose }); const g = new Grid(W, H + UP); g.p = o.p; g.outline(OL); g.clean(OL); return g; };
const toImg = g => { const im = new Img(g.w, g.h); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(x, y); if (c) im.fill(x, y, 1, 1, c); } return im; };

// strips for the page: one PNG per look x colour x pose, eight frames across
const strips = {};
for (const L of LOOKS) for (const c of Object.keys(JUICE)) for (const p of POSES) {
  const im = new Img(W * N, H + UP);
  for (let f = 0; f < N; f++) { const s = toImg(sprite(L, c, p, f)); im.blit(s, 0, 0, s.w, s.h, f * W, 0, s.w, s.h); }
  strips[`${L.name}|${c}|${p}`] = 'data:image/png;base64,' + im.png().toString('base64');
}

// the still sheet: per look, its pulse at frames 0 2 4 5 in its own colour, the other colour, the man and the goat up
const Z = 4, pad = 12, cw = W * Z, ch = (H + UP) * Z;
const cells = L => [[L.colour, 'idle', 0, 'rest'], [L.colour, 'idle', 3, 'pump'], [L.colour, 'idle', 4, 'beat'], [L.colour === 'green' ? 'violet' : 'green', 'idle', 4, 'other'], [L.colour, 'man', 4, 'a man up'], [L.colour, 'goat', 4, 'the goat up']];
const img = new Img(pad + 6 * (cw + pad), pad + LOOKS.length * (ch + 44), '#2b2622');
LOOKS.forEach((L, i) => {
  const by = pad + i * (ch + 44);
  text(img, (i + 1) + '. ' + L.name, pad, by, '#e8d8b0', 3);
  cells(L).forEach(([c, p, f, label], j) => {
    const g = sprite(L, c, p, f), x = pad + j * (cw + pad), y = by + 24;
    img.blit(toImg(g), 0, 0, g.w, g.h, x, y, g.w * Z, g.h * Z);
    img.fill(x, y + (FOOT + UP) * Z, g.w * Z, 1, '#5a4d40');
    text(img, label, x, y + ch - 2, '#a89a80', 2);
  });
});
fs.writeFileSync(__dirname + '/bane.png', img.png());

// the live page: every look pulsing, colour and pose switched for all at once or per card
const looks = LOOKS.map(L => ({ name: L.name, ru: L.ru, note: L.note, colour: L.colour }));
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>One-armed Bane</title><style>
:root{--bg:#2b2622;--card:#342e29;--ink:#e8d8b0;--dim:#a89a80;--line:#4a4038}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.4 system-ui,sans-serif;padding:16px}
h1{font-size:20px;margin:0 0 4px}p.sub{color:var(--dim);margin:0 0 14px}
.bar{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
button{background:#3e3630;color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:7px 12px;font:inherit;cursor:pointer}
button.on{border-color:var(--ink);background:#55493f}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px}
.card h2{font-size:16px;margin:0}.card p{color:var(--dim);margin:2px 0 6px;font-size:13px;min-height:36px}
canvas{display:block;width:100%;image-rendering:pixelated;background:#231f1c;border-radius:4px}
.row{display:flex;gap:6px;margin-top:8px}.row button{padding:4px 9px;font-size:13px}
.g{color:#9fd84a}.v{color:#9d86ff}
</style></head><body>
<h1>Бейн с одной рукой</h1>
<p class="sub">Бак на спине, шланг через плечи в огромную руку, по венам бежит волна, рука набухает на ударе. <span class="g">Зелёный</span> это яд игры, <span class="v">фиолетовый</span> это ведьмин огонь культа.</p>
<div class="bar"><button data-all="green">все зелёные</button><button data-all="violet">все фиолетовые</button><button data-all="own" class="on">каждый своим</button>
<span style="width:12px"></span><button data-pose="idle" class="on">стоит</button><button data-pose="man">поднял человека</button><button data-pose="goat">поднял козла</button></div>
<div class="grid" id="grid"></div>
<script>
const STRIPS=${JSON.stringify(strips)}, LOOKS=${JSON.stringify(looks)}, W=${W}, H=${H + UP}, N=${N};
const DUR=[110,110,110,90,180,130,110,260];
let pose='idle';
const cards=LOOKS.map((L,i)=>{const d=document.createElement('div');d.className='card';
d.innerHTML='<h2>'+(i+1)+'. '+L.ru+'</h2><p>'+L.note+'</p><canvas width="'+W*4+'" height="'+H*4+'"></canvas><div class="row"><button data-c="green">зелёный</button><button data-c="violet">фиолетовый</button></div>';
document.getElementById('grid').appendChild(d);const c={L,el:d,cv:d.querySelector('canvas'),colour:L.colour,imgs:{}};
d.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{c.colour=b.dataset.c;mark(c)});mark(c);return c});
function mark(c){c.el.querySelectorAll('[data-c]').forEach(b=>b.classList.toggle('on',b.dataset.c===c.colour))}
function img(k){if(!img.cache[k]){const im=new Image();im.src=STRIPS[k];img.cache[k]=im}return img.cache[k]}img.cache={};
document.querySelectorAll('[data-all]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-all]').forEach(x=>x.classList.toggle('on',x===b));
cards.forEach(c=>{c.colour=b.dataset.all==='own'?c.L.colour:b.dataset.all;mark(c)})});
document.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>{pose=b.dataset.pose;document.querySelectorAll('[data-pose]').forEach(x=>x.classList.toggle('on',x===b))});
let f=0;function tick(){for(const c of cards){const im=img(c.L.name+'|'+c.colour+'|'+pose),x=c.cv.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,c.cv.width,c.cv.height);if(im.complete)x.drawImage(im,f*W,0,W,H,0,0,W*4,H*4)}
const d=DUR[f];f=(f+1)%N;setTimeout(tick,d)}tick();
</script></body></html>`;
fs.writeFileSync(__dirname + '/bane.html', html);
console.log('bane.png', img.w, img.h, 'bane.html', (html.length / 1024).toFixed(0) + ' KB');
