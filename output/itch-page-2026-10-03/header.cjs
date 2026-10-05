// node header.cjs [scale] → header.png. The itch page's header: the side-on fan art of the hall
// (output/fanart-2026-09-26/side2.cjs, copied) with two banners and two chains taken down to make
// room on the wall for the title, DOOMED GOAT, in bone with old blood running off it.
// Every figure is built out of parts (a leg, an arm, a hood), each part shaded as a solid lit from the
// upper left — lit rim toward the light, shadow on the far side and underneath, the part in front
// edged darker where it crosses the one behind — then outlined, and hand details go on last.
const fs = require('fs'), { Img } = require('../pixel-claude-2026-09-24/png.cjs'), { LOGO, SMALL, layout } = require('./font.cjs');

const W = 480, H = 270, K = +(process.argv[2] || 2), FLOOR = 214;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

// Ramps, deep → highlight; shadows lean cool, lights lean warm.
const M = {
  fur: ['#5d5466', '#9a8f93', '#d6ccbd', '#efe7d8', '#fffaf0'],
  furFar: ['#453e4e', '#6f6770', '#a39a92', '#bdb3a6', '#cfc6b8'],
  beard: ['#4e4650', '#7d7478', '#aba196', '#c7bdae', '#d8cfc0'],
  hoof: ['#0e0a0b', '#1c1616', '#2c2322', '#3e3230', '#524441'],
  antler: ['#26170f', '#46301f', '#6c4b2d', '#916a42', '#c4a57a'],
  antlerFar: ['#1c110b', '#2f2016', '#48321f', '#5e422a', '#7a5a3a'],
  leather: ['#1a0f0a', '#321f15', '#4f3322', '#6d4a31', '#8c6440'],
  gold: ['#4a2c08', '#8a5a14', '#d09a2a', '#f0c050', '#fff0a0'],
  red: ['#2a0810', '#561019', '#8a1d23', '#b3342e', '#d65a44'],
  redFar: ['#1e060b', '#3e0c13', '#621519', '#7e2222', '#963a30'],
  bone: ['#3e342e', '#7e725c', '#bdb090', '#dcd1b2', '#f4eed8'],
  skin: ['#3a201c', '#744634', '#a8735a', '#c99272', '#e2b18e'],
  skinFar: ['#2a1614', '#52322a', '#7a5242', '#946652', '#aa7a62'],
  hide: ['#1c120c', '#3a261a', '#5a3d2a', '#7a5638', '#976d48'],
  apron: ['#2a1c14', '#4e3828', '#77593f', '#977656', '#b4916a'],
  wood: ['#1c0f08', '#3a2112', '#5c381d', '#7e522b', '#9f6c3a'],
  iron: ['#121118', '#28272f', '#45444f', '#6e6e7a', '#a8aab6'],
  ogre: ['#161c12', '#2b3524', '#465537', '#627352', '#86976a'],
  ogreFar: ['#10150d', '#1f271a', '#323d28', '#445237', '#566649'],
  belly: ['#2b3524', '#465537', '#6a7a54', '#86976a', '#a3b283'],
  purple: ['#1a0e2c', '#2f1c52', '#4b2f80', '#6849a8', '#8d6fcc'],
  purpleFar: ['#120a20', '#211439', '#34215a', '#462e76', '#5a4092'],
  coat: ['#1a1109', '#342414', '#553b24', '#735234', '#906a44'],
  coatFar: ['#120c07', '#23180e', '#3a2818', '#4e3722', '#62462e'],
  hat: ['#140c06', '#2a1a0e', '#452c17', '#5e3e22', '#77512e'],
  dog: ['#261509', '#53301a', '#8a582f', '#b27a46', '#d4a068'],
  dogFar: ['#1c0f07', '#3a2212', '#5e3c20', '#7a5130', '#946640'],
  dogDark: ['#1d120b', '#33221a', '#4a3324', '#5e4230', '#735340'],
  straw: ['#4a3710', '#7a5e22', '#a88638', '#c9a24a', '#e6c46c'],
  void: ['#07050b', '#07050b', '#0b0812', '#0b0812', '#0b0812'],
  witch: ['#2a1470', '#4a2bb0', '#7a6cff', '#b8c4ff', '#f2f4ff'],
  lava: ["#3a0d06", "#8f1e0a", "#e0521a", "#ffb43a", "#fff0a0"],
  lavaFar: ["#2a0904", "#5e1406", "#a8360e", "#d0621e", "#e88a3a"],
  clover: ["#1e2e12", "#3e5a26", "#6a8c3a", "#8fb04e", "#c2dc7a"],
  venom: ["#12260e", "#2f5a1c", "#5c9a2a", "#9fd84a", "#e4ffa0"],
  fire: ['#6a1a08', '#c2410f', '#f26b1d', '#ffa53a', '#ffe08a'],
};

class Sprite {
  // Local space: x forward (the way he faces), y up is negative, the foot on (0, 0). `flip` mirrors
  // him to face left before anything is shaded, so the light stays on the upper left of the world.
  constructor(w, h, ax, ay, flip, k = 1) {
    Object.assign(this, { w, h, ax, ay, flip, k });
    this.part = new Int16Array(w * h); this.mats = [null]; this.opts = [null]; this.det = new Array(w * h).fill(null); this.cur = 0;
  }
  gx(x) { return this.ax + (this.flip ? -x : x) * this.k; }
  gy(y) { return this.ay + y * this.k + (this.dy || 0); }
  begin(mat, o = {}) { this.mats.push(M[mat] || mat); this.opts.push(o); this.cur = this.mats.length - 1; return this; }
  fill(x0, y0, x1, y1, test) {
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(this.h - 1, Math.ceil(y1)); y++)
      for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(this.w - 1, Math.ceil(x1)); x++)
        if (test(x + 0.5, y + 0.5)) this.part[y * this.w + x] = this.cur;
    return this;
  }
  ell(x, y, rx, ry) { const cx = this.gx(x), cy = this.gy(y), a = rx * this.k, b = ry * this.k; return this.fill(cx - a, cy - b, cx + a, cy + b, (px, py) => ((px - cx) / a) ** 2 + ((py - cy) / b) ** 2 <= 1); }
  poly(pts) {
    const P = pts.map(([x, y]) => [this.gx(x), this.gy(y)]), xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
    return this.fill(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), (px, py) => {
      let inside = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside; }
      return inside;
    });
  }
  // A limb: a tapering capsule from one joint to the next.
  cap(x0, y0, x1, y1, r0, r1 = r0) {
    const ax = this.gx(x0), ay = this.gy(y0), bx = this.gx(x1), by = this.gy(y1), R0 = r0 * this.k, R1 = r1 * this.k, R = Math.max(R0, R1);
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    return this.fill(Math.min(ax, bx) - R, Math.min(ay, by) - R, Math.max(ax, bx) + R, Math.max(ay, by) + R, (px, py) => {
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)), qx = ax + dx * t - px, qy = ay + dy * t - py;
      return qx * qx + qy * qy <= (R0 + (R1 - R0) * t) ** 2;
    });
  }
  // Hand details: exact pixels in local space, laid over the shading.
  d(x, y, c) { const X = Math.floor(this.gx(x) + (this.flip ? -0.001 : 0)), Y = Math.floor(this.gy(y)); if (X >= 0 && Y >= 0 && X < this.w && Y < this.h) this.det[Y * this.w + X] = c; return this; }
  dl(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * this.k * 2 + 1; for (let i = 0; i <= n; i++) this.d(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); return this; }
  dr(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.d(x + i, y + j, c); return this; }

  bake() {
    const { w, h, part } = this, lx = -1, out = new Array(w * h).fill(null);
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : part[y * w + x]);
    const box = this.mats.map(() => [1e9, 1e9, -1e9, -1e9]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = part[y * w + x]; if (!k) continue; const b = box[k]; b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = part[y * w + x]; if (!k) continue;
      const R = this.mats[k], o = this.opts[k], same = (dx, dy) => at(x + dx, y + dy) === k;
      if (o.flat) { out[y * w + x] = R[2]; continue; }
      const b = box[k], bw = b[2] - b[0] + 1, bh = b[3] - b[1] + 1;
      const fx = lx < 0 ? (x - b[0]) / bw : (b[2] - x) / bw, fy = (y - b[1]) / bh;
      // the broad form: lit toward the upper left, dark toward the lower right
      let t = 2;
      if (bw > 5 && bh > 5) { const f = fx * 0.55 + fy * 0.75; t = f < 0.38 ? 3 : f > 0.95 ? 1 : 2; }
      // the edges: a lit rim toward the light, a shadow band away from it
      const litE = !same(0, -1) || !same(lx, 0), shE = !same(0, 1) || !same(-lx, 0) || !same(-lx * 2, 0) || !same(0, 2);
      if (litE && !shE) t = Math.min(4, t + 1);
      else if (shE && !litE) t = Math.max(0, Math.min(t, 1) - (!same(0, 1) && !same(-lx, 1) ? 0 : 0));
      if (!same(0, -1) && !same(lx, 0) && !same(lx, -1) && !o.matte && bw > 4) t = 4;
      // where this part crosses one drawn before it, it gets a dark edge: the arm is off the body
      if (!o.noEdge) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = at(x + dx, y + dy); if (j && j < k && !this.opts[j].noEdge) { t = this.mats[j] === R ? Math.min(t, 1) : 0; break; } }
      if (o.cap !== undefined) t = Math.min(t, o.cap);
      if (o.floor !== undefined) t = Math.max(t, o.floor);
      out[y * w + x] = R[t];
    }
    // the outline round the whole figure: the darkest of the part it touches, darker still
    const res = out.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (part[y * w + x]) continue;
      let n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = at(x + dx, y + dy); if (j && !this.opts[j].noLine) { n = j; break; } }
      if (n) res[y * w + x] = mix(this.mats[n][0], '#000000', 0.45);
    }
    for (let i = 0; i < w * h; i++) if (this.det[i] && (part[i] || res[i])) res[i] = this.det[i];
    this.px = res; return this;
  }
}

// ---------------------------------------------------------------- the goat, facing right
function goat() {
  const s = new Sprite(120, 110, 50, 104, false, 1);
  // the far legs, in shade
  s.begin('furFar').ell(-17, -22, 6, 8).cap(-17, -17, -20, -9, 2.4, 2).cap(-20, -9, -19, -3, 1.9, 1.7);
  s.begin('furFar').cap(14, -22, 15, -10, 2.8, 2.2).cap(15, -10, 16, -3, 2, 1.8);
  s.begin('hoof').ell(-19, -1.8, 2.6, 2);
  s.begin('hoof').ell(16.5, -1.8, 2.6, 2);
  // tail up: he is angry
  s.begin('fur').poly([[-24, -33], [-31, -43], [-28, -45], [-21, -36]]);
  // the barrel, the rump, the deep chest
  s.begin('fur').ell(0, -27, 21, 9.5).ell(-15, -28, 10, 10.5).ell(14, -27, 10, 11);
  // near hind leg: thigh, hock, cannon
  s.begin('fur').ell(-14, -23, 7.5, 10).cap(-13, -16, -17, -9, 3, 2.3).cap(-17, -9, -15, -3, 2.1, 1.9);
  // near foreleg, braced
  s.begin('fur').cap(11, -24, 11, -10, 3.4, 2.6).cap(11, -10, 12, -3, 2.3, 2);
  s.begin('hoof').ell(-14.5, -1.8, 2.8, 2);
  s.begin('hoof').ell(12.5, -1.8, 2.8, 2);
  // a thick neck, the head carried low and forward to butt
  s.begin('fur').poly([[7, -35], [19, -47], [28, -45], [23, -25], [12, -22]]);
  s.begin('fur').ell(29, -45, 8, 7).poly([[29, -50], [41, -44], [42, -38], [30, -36]]).ell(39, -40, 4, 3.8);
  s.begin('fur', { matte: true }).poly([[25, -48], [16, -46.5], [15, -43.5], [24, -44]]);
  s.begin('beard').poly([[32, -37], [39, -37], [34, -27]]);
  // the collar and the LUCKY CLOVER hanging off it
  s.begin('leather', { noEdge: true }).cap(19, -45, 25, -29, 1.7);
  s.begin('gold', { noEdge: true }).cap(24.5, -29, 24.5, -27, 0.8);
  for (const [x, y] of [[23, -25.5], [26, -25.5], [23, -22.5], [26, -22.5]]) s.begin('clover', { noEdge: true }).ell(x, y, 1.9, 1.9);
  s.begin('clover', { noEdge: true }).cap(24.5, -24, 26.5, -19.5, 0.6);
  // the horns, lava: a goat's own horns, thick and swept back, burning from inside
  const horn = (ox, oy, mat) => s.begin(mat).cap(27 + ox, -51 + oy, 25 + ox, -60 + oy, 3.4, 3).cap(25 + ox, -60 + oy, 19 + ox, -67 + oy, 3, 2.3)
    .cap(19 + ox, -67 + oy, 12 + ox, -69 + oy, 2.3, 1.4).cap(12 + ox, -69 + oy, 8 + ox, -65.5 + oy, 1.4, 0.6);
  horn(-4, 1.5, 'lavaFar'); horn(0, 0, 'lava');
  // the face
  s.dr(30, -47.5, 3, 2, '#d9a53a').dr(30, -47, 3, 1, '#16100c').d(33, -47.5, '#6a5040');   // amber eye, a bar for a pupil
  s.dl(29, -49, 33, -49, '#8a7f7a');                                                          // the lid
  s.d(42, -41, '#1a1210').d(41, -41, '#3a2e2a');                                              // nostril
  s.dl(36, -37.5, 41, -38, '#8a7f78');                                                        // mouth
  s.dl(24, -46.5, 18, -45.5, '#c98a80');                                                      // inside the ear
  // the clover's veins
  s.d(24.5, -24, '#3e5a26').d(23.5, -24, '#a8c070').d(25.5, -23, '#a8c070');
  // the horn's rings, split open on the fire inside
  for (const [x0, y0, x1, y1] of [[24.5, -55, 28.5, -56], [23.5, -59, 27.5, -61], [21, -62, 23.5, -66], [18, -65, 19.5, -69], [15, -66, 15.5, -70.5]]) s.dl(x0, y0, x1, y1, '#8f1e0a');
  for (const [x0, y0, x1, y1] of [[25, -53, 26.5, -58], [22, -63, 24, -61], [17, -67.5, 14, -68.5]]) s.dl(x0, y0, x1, y1, '#fff0a0');
  // VENOM SPIT: froth in the mouth and down the beard
  for (const [x, y, c] of [[41, -38, '#d4f59a'], [42, -37, '#9fd84a'], [40, -37, '#e4ffa0'], [38, -36, '#9fd84a'], [36, -35, '#5c9a2a'], [34, -32, '#9fd84a'], [35, -30, '#d4f59a'], [34, -28, '#5c9a2a'], [43, -38, '#d4f59a']]) s.d(x, y, c);
  return s.bake();
}

// ---------------------------------------------------------------- the men, facing right (flipped to face him)
function clubman(flip, pose) {
  // The windup: the club swung back over his shoulder with both hands, so the mask faces the goat.
  const s = new Sprite(80, 120, 36, 114, flip, 1), up = pose === 'high' ? 5 : 0;
  s.begin('wood').cap(-7, -79 - up, -19, -100 - up, 2.1, 2.5).ell(-20.5, -103 - up, 5.2, 5.6);
  s.begin('redFar').cap(-2, -52, -9, -66, 3, 2.6).cap(-9, -66, -6, -76 - up, 2.6, 2.4);
  s.begin('skinFar').ell(-6, -77 - up, 2.6, 2.6);
  s.begin('leather').ell(-6, -1.8, 4.5, 2.2);
  s.begin('leather').ell(7, -1.8, 4.5, 2.2);
  s.begin('red').poly([[-14, -1], [-12, -30], [-11, -48], [-8, -56], [9, -56], [12, -48], [13, -30], [16, -1], [10, -3], [4, -1], [-2, -3], [-8, -1]]);
  s.begin('straw', { noEdge: true }).cap(-11, -35, 12, -35, 1.2).cap(10, -35, 12, -26, 1, 0.7);
  s.dy = -4;
  s.begin('red').ell(1, -64, 10, 10).poly([[-9, -66], [-13, -54], [-2, -56]]);
  s.begin('bone').poly([[3, -72], [9, -72], [12.5, -65], [10.5, -63], [11.5, -58], [5, -55], [3, -60]]);
  s.dy = 0;
  s.begin('red').cap(-4, -51, -12, -62, 3.8, 3.3).cap(-12, -62, -8, -77 - up, 3.3, 2.9);     // near arm, up and back behind the hood
  s.begin('skin').ell(-7.5, -79 - up, 3, 3);
  s.dy = -4;
  s.dr(7, -68, 2, 3, '#140c0c').d(9, -67, '#140c0c');
  s.dl(7, -59, 10, -59.5, '#3a2e26');
  s.dl(4, -71, 6, -62, '#9c2528');
  s.dy = 0;
  for (const [x, y] of [[-23, -105], [-17, -102], [-20, -99], [-19, -107]]) s.d(x, y - up, '#9a9aa6');
  return s.bake();
}
function butcher(flip) {
  // A slab of a man: shoulders like a yoke, a gut under the apron, the cleaver cocked back over his head.
  const s = new Sprite(110, 150, 55, 144, flip, 1);
  s.dy = -8;
  s.begin('iron').poly([[-30, -101], [-11, -107], [-9, -92], [-27, -87]]);
  s.begin('wood').cap(-11, -98, -4, -95, 1.7);
  s.begin('skinFar').cap(-10, -64, 2, -56, 4.4, 4).cap(2, -56, 14, -60, 4, 3.4);            // far arm reaching for him
  s.begin('skinFar').ell(16, -60.5, 3.6, 3.4);
  s.begin('iron', { noEdge: true }).cap(19, -62, 23, -66, 0.9).cap(23, -66, 25, -62, 0.9).cap(25, -62, 24, -60, 0.8);
  s.dy = 0;
  s.begin('hide').cap(-8, -36, -11, -6, 6, 5);
  s.begin('hide').cap(8, -36, 12, -6, 6, 5);
  s.begin('leather').ell(-12, -2.6, 7, 3).cap(-11, -9, -11, -4, 5.4);
  s.begin('leather').ell(13, -2.6, 7, 3).cap(12, -9, 12, -4, 5.4);
  s.dy = -8;
  s.begin('hide').poly([[-16, -70], [14, -71], [20, -58], [21, -40], [16, -26], [-12, -26], [-17, -42]]);
  s.begin('apron').poly([[6, -62], [18, -56], [22, -40], [17, -18], [0, -18], [3, -40]]);
  s.begin('leather', { noEdge: true }).cap(-15, -28, 18, -28, 1.6);
  s.begin('leather').ell(2, -74, 8.5, 9);
  s.begin('bone').poly([[5, -83], [14, -82], [26, -74], [26, -67], [20, -64], [9, -65], [5, -72]]);
  s.begin('bone').cap(6, -81, 0, -88, 2.3, 1.7).cap(0, -88, -6, -87, 1.7, 0.9);
  s.begin('bone').cap(13, -82, 17, -90, 1.9, 1.4).cap(17, -90, 22, -91, 1.4, 0.8);
  s.begin('skin').cap(-8, -66, -15, -78, 4.2, 3.6).cap(-15, -78, -9, -92, 3.6, 3);          // near arm up and back
  s.begin('skin').ell(-8.5, -94, 3.4, 3.4);
  s.dr(12, -78, 3, 3, '#140c0c').d(13, -77, '#c23d36');
  s.d(24, -72, '#2a221c').d(25, -70, '#2a221c').dl(18, -66.5, 24, -67.5, '#6e624e');
  s.dl(-30, -101, -27, -87, '#d0d2dc').dl(-29, -98, -28, -90, '#8e1a1c').d(-26, -87, '#8e1a1c');
  s.d(-16, -100, '#28272f');
  for (const [x, y] of [[10, -44], [14, -36], [8, -30], [16, -26], [12, -22], [6, -24]]) s.d(x, y, '#6e1216');
  s.dl(6, -62, -2, -74, '#3a2418');
  s.dl(-10, -60, -4, -48, '#3a261a').dl(-6, -64, 0, -54, '#3a261a');                           // the hide's seams
  return s.bake();
}
function hunter(flip) {
  // Aimed, cheek on the stock: a long muzzle-loader, brass-banded, a sling hanging under it.
  const s = new Sprite(120, 110, 40, 104, flip, 1);
  s.begin('coatFar').cap(-3, -56, -6, -48, 3, 2.6).cap(-6, -48, 5, -51, 2.6, 2.3);           // far arm, hand on the wrist of the stock
  s.begin('hat').cap(-4, -28, -7, -4, 3.5, 3).ell(-8, -2.2, 5, 2.4);
  s.begin('hat').cap(5, -28, 9, -4, 3.5, 3).ell(10, -2.2, 5, 2.4);
  s.begin('coat').poly([[-14, -8], [-11, -40], [-9, -56], [8, -57], [11, -40], [14, -8], [6, -12], [0, -9], [-6, -12]]);
  s.begin('coatFar', { noEdge: true }).poly([[-10, -58], [9, -59], [13, -48], [-13, -46]]);   // the capelet over his shoulders
  s.begin('leather', { noEdge: true }).cap(-9, -56, 9, -30, 1.3).cap(-10, -30, 11, -30, 1.4);  // bandolier and belt
  s.begin('red', { noEdge: true }).ell(2, -59, 7.5, 3);
  s.begin('hat').ell(3, -65, 8, 8.5);
  s.begin('bone').poly([[8, -69], [26, -63], [8, -58.5]]);
  s.begin('hat').ell(3, -73, 17, 2.6);
  s.begin('hat').poly([[-6, -73], [-5, -85], [11, -85], [12, -73]]);
  // the rifle: butt in the shoulder, a curved stock, the lock, a long barrel
  s.begin('wood').poly([[-12, -53], [-2, -57], [7, -56.5], [7, -53], [0, -52], [-8, -47], [-12, -48.5]]);
  s.begin('wood').cap(7, -54.5, 36, -56, 1.9, 1.6);
  s.begin('iron').cap(7, -56.6, 49, -58, 1.15, 1.05);
  s.begin('iron').poly([[5, -57], [10, -57], [10, -53.5], [5, -53.5]]);
  s.begin('leather', { noEdge: true }).cap(-4, -50, 12, -46, 0.7).cap(12, -46, 30, -54.5, 0.7);
  s.begin('coat').cap(1, -55, 8, -46, 3.2, 2.8).cap(8, -46, 25, -54, 2.8, 2.3);             // near arm under the forestock
  s.begin('skin').ell(26, -54.5, 2.4, 2.2);
  s.begin('skinFar').ell(6, -51.5, 2.2, 2);
  // brass: bands, trigger guard, the butt plate; the hammer cocked
  for (const x of [17, 30, 36]) s.dl(x, -58, x, -54.5, '#d09a2a');
  s.dl(-12, -53, -12, -48.5, '#d09a2a').dl(7, -52, 10, -51, '#d09a2a').d(10, -52, '#d09a2a');
  s.d(6, -58, '#6e6e7a').d(5, -59, '#a8aab6').d(9, -56, '#a8aab6');
  s.d(49, -59, '#a8aab6').d(48, -59, '#6e6e7a');                                               // the muzzle and the front sight
  s.dl(-9, -52, 4, -55.5, '#9f6c3a').dl(12, -55.5, 34, -56.5, '#7e522b');                      // grain
  // the mask, the lens, the band on the hat, cartridges on the bandolier
  s.dr(6, -68, 3, 3, '#6e1216').d(7, -67, '#e05a48');
  s.dl(9, -61, 22, -62.5, '#8e8266');
  s.dr(-5, -76, 17, 2, '#8a1d23');
  for (const t of [0.2, 0.35, 0.5, 0.65]) s.d(-9 + 18 * t, -56 + 26 * t, '#c9a24a');
  return s.bake();
}
function seer(flip) {
  const s = new Sprite(80, 130, 30, 124, flip, 1);
  s.begin('wood', { noEdge: true }).cap(19, 0, 21, -92, 1.4).cap(21, -92, 17, -97, 1.2);
  s.begin('purpleFar').poly([[-8, -52], [-20, -20], [-16, -2], [-8, -30]]);                  // the robe's back, blowing
  s.begin('purple').poly([[-14, -1], [-11, -36], [-9, -56], [9, -56], [11, -36], [16, -1], [8, -3], [0, -1], [-7, -3]]);
  s.begin('gold', { noEdge: true }).cap(-10, -36, 11, -36, 1.1);
  s.begin('purple').ell(1, -64, 10, 11).poly([[-8, -68], [-9, -88], [5, -72]]);
  s.begin('void', { flat: true }).ell(6, -63, 5.2, 7);
  s.begin('purple').poly([[2, -52], [18, -60], [21, -52], [8, -44]]);
  s.begin('skinFar').ell(20.5, -58, 2.4, 2.4);
  s.begin('witch', { noLine: true }).poly([[16, -96], [20, -112], [26, -97], [21, -93]]);
  s.dr(7, -65, 2, 1, '#c79bff').d(10, -65, '#c79bff');                                      // two points of light in the hood
  s.dl(20, -95, 21, -106, '#b8c4ff').dl(20, -97, 22, -99, '#f2f4ff');
  for (const [x, y] of [[-11, -8], [-5, -6], [2, -5], [9, -7], [14, -9]]) s.d(x, y, '#a46cff');
  return s.bake();
}
function hound(flip) {
  // One animal, not a kit of sticks: the near side is a single part so the light runs over it whole.
  const s = new Sprite(110, 64, 50, 58, flip, 1);
  s.begin('dogFar').cap(12, -22, 22, -12, 3, 2.2).cap(22, -12, 29, -4, 2.2, 1.8).ell(31, -3, 3.4, 2);
  s.begin('dogFar').ell(-15, -22, 6, 8).cap(-17, -17, -24, -9, 2.8, 2).cap(-24, -9, -30, -4, 2, 1.8).ell(-31, -2.8, 3.4, 2);
  s.begin('dog')
    .poly([[-18, -29], [-30, -36], [-31, -33], [-17, -25]])                      // tail out behind, stiff
    .ell(0, -25, 18, 7.5).ell(12, -25, 9, 9).ell(-14, -25, 8.5, 8.5)
    .ell(-14, -21, 6.5, 8.5).cap(-16, -16, -21, -9, 3.2, 2.4).cap(-21, -9, -27, -4, 2.4, 2).ell(-28.5, -2.8, 3.6, 2.2)
    .cap(13, -20, 21, -11, 3.4, 2.6).cap(21, -11, 27, -4, 2.6, 2.1).ell(29, -2.8, 3.6, 2.2)
    .poly([[8, -31], [20, -37], [26, -30], [17, -20]])
    .ell(25, -33, 7.5, 6.5).poly([[27, -38], [42, -34], [41, -31], [28, -30]])
    .poly([[27, -29], [39, -24], [38, -21.5], [26, -24.5]]);
  s.begin('dogDark', { noEdge: true, flat: true }).ell(-3, -30.5, 15, 3.4).ell(22, -37.5, 5, 2.2);
  s.begin('dogDark').poly([[19, -37], [11, -44], [15, -44], [22, -38]]);
  s.begin('red', { noEdge: true }).cap(18, -38, 20, -26, 1.7);
  s.dl(28, -29.5, 40, -29.5, '#2a0a0e').dl(28, -28, 38, -24.5, '#2a0a0e').dl(29, -27, 36, -26, '#b3342e');
  for (const [x, y] of [[30, -30.5], [33, -30.5], [36, -30.5], [39, -30.5], [31, -26], [35, -25]]) s.d(x, y, '#efe6d0');
  s.dr(27, -35, 2, 1, '#e8b030').d(28, -35, '#140c0a').dl(26, -36.5, 30, -36, '#1d1512');
  s.d(42, -34.5, '#140c0a').d(19, -32, '#a8aab6');
  for (const [x, y] of [[-6, -18], [0, -19], [6, -19]]) s.dl(x, y, x + 2, y + 1, '#6a4020');   // ribs under the hide
  return s.bake();
}

// ---------------------------------------------------------------- the ogre, facing right (flipped)
function ogre(flip) {
  const s = new Sprite(160, 200, 70, 194, flip, 1.5);
  s.begin('ogreFar').ell(-12, -27, 11, 14).cap(-11, -18, -15, -5, 5, 4.4).ell(-12, -3, 11, 4);
  s.begin('ogreFar').cap(-2, -86, 22, -63, 7, 6.4).cap(22, -63, 34, -45, 6.4, 5.6).ell(37, -39, 8, 7);
  s.begin('ogre').ell(-6, -72, 30, 28).ell(-10, -86, 22, 16);
  s.begin('belly').ell(6, -57, 20, 18);
  s.begin('red').poly([[-26, -50], [20, -48], [21, -30], [15, -25], [10, -32], [4, -23], [-2, -31], [-8, -24], [-14, -32], [-20, -25], [-26, -34]]);
  s.begin('ogre').ell(4, -29, 11, 13).cap(7, -19, 10, -6, 5.2, 4.6).ell(13, -3, 13, 4.2);
  s.begin('red').poly([[-6, -104], [-30, -96], [-40, -74], [-38, -50], [-34, -57], [-29, -48], [-25, -57], [-19, -52], [-16, -64], [-4, -80], [8, -96]]);
  s.begin('ogre').ell(26, -85, 13, 11).ell(40, -87, 3.6, 3.6);
  s.begin('ogre').poly([[15, -81], [39, -81], [41, -73], [36, -69], [19, -70]]);
  s.begin('bone').poly([[34, -81], [36, -91], [38, -81]]);
  s.begin('bone').poly([[27, -81], [28.5, -87], [30, -81]]);
  s.begin('red').poly([[4, -96], [12, -104], [24, -100], [33, -95], [30, -91], [22, -93], [14, -88], [6, -84]]);
  s.begin('bone').cap(20, -98, 18, -108, 2.2, 1.8).cap(18, -108, 11, -114, 1.8, 0.9);
  s.begin('bone').cap(28, -97, 31, -106, 1.8, 0.9);
  s.begin('ogre').cap(8, -84, 18, -62, 7.6, 6.8).cap(18, -62, 22, -44, 6.8, 6.2);
  s.begin('ogre').ell(24, -36, 9.5, 8.5);
  s.begin('iron').cap(14, -47, 31, -47, 2.2);
  for (const [x, y] of [[33, -43], [34, -39.5], [34, -36]]) s.begin('iron', { noEdge: true }).ell(x, y, 1.5, 1.7);
  // the mantle's folds
  for (const [x0, y0, x1, y1] of [[-8, -98, -30, -56], [-14, -94, -35, -60], [0, -92, -20, -56], [-22, -92, -38, -70]]) s.dl(x0, y0, x1, y1, '#561019');
  for (const [x0, y0, x1, y1] of [[-7, -99, -29, -58], [1, -93, -19, -58]]) s.dl(x0, y0, x1, y1, '#b3342e');
  // the face: brow, the eye lit, the underbite
  s.dl(27, -89, 36, -88, '#161c12').dl(27, -90, 35, -89.5, '#161c12');
  s.dr(32, -87.5, 2, 1.5, '#f0a832').d(33, -87, '#ffe08a');
  s.dl(17, -80.5, 39, -80.5, '#0e0a08').d(42, -87.5, '#0e0a08');
  // the cult's red bars on his chest, the sign on his back
  for (const o of [0, 5]) s.dl(-2 - o, -70 + o * 1.4, 12 - o, -58 + o * 1.4, '#b3342e');
  const sign = [[-26, -87], [-17, -70], [-35, -70]];
  for (let i = 0; i < 3; i++) s.dl(...sign[i], ...sign[(i + 1) % 3], '#dcd1b2');
  s.d(-26, -76, '#dcd1b2').d(-25, -76, '#dcd1b2').d(-26, -75, '#dcd1b2').d(-25, -75, '#dcd1b2');
  // knuckles, toes, scars
  s.dl(18, -36, 31, -37, '#2b3524').dl(19, -32, 31, -33, '#2b3524');
  for (const x of [21, 24.5]) s.dl(x, -2, x + 2, -1, '#dcd1b2');
  s.dl(-4, -92, 6, -82, '#2b3524').dl(0, -90, 4, -84, '#86976a');
  for (const x of [17, 22, 27]) s.d(x, -47, '#a8aab6');
  // warts and old scars on the hide; the swell of the shoulder and the forearm
  for (let k = 0; k < 40; k++) { const x = -30 + ((k * 37) % 60), y = -98 + ((k * 53) % 70); if (s.part[Math.floor(s.gy(y)) * s.w + Math.floor(s.gx(x))]) s.d(x, y, k % 3 ? '#2b3524' : '#86976a'); }
  s.dl(10, -80, 16, -66, '#86976a').dl(19, -58, 21, -48, '#86976a').dl(-2, -44, 10, -42, '#2b3524');
  return s.bake();
}

// ---------------------------------------------------------------- props
function brazier() {
  const s = new Sprite(40, 70, 20, 64, false, 1);
  s.begin('iron', { noEdge: true }).cap(0, -18, -8, 0, 1.2).cap(0, -18, 8, 0, 1.2).cap(0, -20, 0, -2, 1.2);
  s.begin('iron').poly([[-10, -26], [10, -26], [7, -17], [-7, -17]]);
  s.begin('fire', { noLine: true, flat: true }).poly([[-8, -26], [-5, -38], [-2, -31], [0, -46], [3, -32], [6, -39], [8, -26]]);
  s.dl(-10, -26, 10, -26, '#a8aab6');
  for (const [x0, y0, x1, y1, c] of [[-4, -26, -1, -34, '#ffa53a'], [-2, -26, 0, -40, '#ffa53a'], [3, -26, 3, -32, '#ffa53a'], [-1, -27, 0, -33, '#ffe08a'], [1, -27, 1, -30, '#fff4c0']]) s.dl(x0, y0, x1, y1, c);
  return s.bake();
}
function banner(sway) {
  const s = new Sprite(44, 110, 22, 104, false, 1);
  s.begin('wood').cap(-16, -98, 16, -98, 1.4);
  s.begin('red', { cap: 3 }).poly([[-13, -96], [13, -96], [13 + sway, -14], [0 + sway, -24], [-13 + sway, -14]]);
  for (const x of [-8, -1, 6]) s.dl(x, -95, x + sway * 0.8, -20, '#6a151b');               // the folds
  for (const x of [-10, -3, 4, 11]) s.dl(x + 1, -95, x + 1 + sway * 0.8, -20, '#a52d2b');
  const sg = [[0, -80], [9, -58], [-9, -58]];
  for (let i = 0; i < 3; i++) s.dl(...sg[i], ...sg[(i + 1) % 3], '#d4c8a6');
  s.dr(-1, -66, 2, 2, '#d4c8a6');
  for (const x of [-12, -8, -4, 0, 4, 8, 12]) s.d(x + sway * 0.9, -15 - Math.abs(x) * 0.8, '#d0a24a');
  return s.bake();
}

// ---------------------------------------------------------------- the hall
const scene = new Array(W * H).fill('#000000');
const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) scene[y * W + x] = c; };
const get = (x, y) => scene[Math.max(0, Math.min(H - 1, y)) * W + Math.max(0, Math.min(W - 1, x))];
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const tint = (x, y, c, t) => set(x, y, mix(get(x, y), c, t));

// the wall: bricks of the cult's purple stone, a few gone, a few cracked
for (let y = 0; y < FLOOR; y++) for (let x = 0; x < W; x++) {
  const row = Math.floor(y / 11), sh = (row % 2) * 12, bx = (x + sh) % 24, by = y % 11, id = Math.floor((x + sh) / 24);
  const v = hash(id, row), base = v < 0.33 ? '#2c2230' : v < 0.66 ? '#322736' : '#2a2331';
  let c = base;
  if (by === 10 || bx === 23) c = '#18121b';
  else if (by === 0 || bx === 0) c = mix(base, '#6a5670', 0.25);
  else if (by === 9 || bx === 22) c = mix(base, '#000000', 0.25);
  else if (hash(x, y) < 0.06) c = mix(base, '#000000', 0.18);
  if (v > 0.965 && by > 0 && by < 10 && bx > 0 && bx < 23) c = '#140f16';
  if (v > 0.9 && v < 0.93 && by > 1 && Math.abs(bx - 6 - by) < 1) c = '#18121b';
  set(x, y, c);
}
// the ceiling beam and its chains
for (let y = 0; y < 14; y++) for (let x = 0; x < W; x++) set(x, y, y === 13 ? '#0e0806' : y === 12 ? '#2a180e' : (x + y * 3) % 37 === 0 ? '#2a180e' : y < 3 ? '#4a2c18' : '#3a2212');
for (const [cx, n] of [[370, 6]]) for (let i = 0; i < n; i++) { const y = 14 + i * 3; set(cx, y, '#45444f'); set(cx, y + 1, '#6e6e7a'); set(cx + (i % 2 ? 1 : -1), y + 2, '#28272f'); }
// the dado: a band of red along the wall, a trim above it
for (let x = 0; x < W; x++) {
  for (let y = 172; y < 182; y++) set(x, y, y === 172 ? '#8a2a28' : y === 173 ? '#6a1b1e' : y === 181 ? '#2a0a0e' : (x % 16 === 0) ? '#3e0c13' : '#521218');
  set(x, 171, '#120c10'); set(x, 182, '#120c10');
}
// where wall meets floor
for (let x = 0; x < W; x++) for (let y = FLOOR - 6; y < FLOOR; y++) set(x, y, y < FLOOR - 3 ? '#1c151d' : '#120d12');
// the floor: flags getting bigger toward us, joints, straw, old blood
const ROWS = [[FLOOR, 12, 30, 0], [FLOOR + 12, 18, 42, 13], [FLOOR + 30, 26, 58, 7]];
for (const [y0, hh, wd, off] of ROWS) for (let y = y0; y < y0 + hh && y < H; y++) for (let x = 0; x < W; x++) {
  const id = Math.floor((x + off) / wd), v = hash(id, y0), base = v < 0.5 ? '#3a2e26' : '#41342a';
  let c = base;
  if (y === y0) c = '#1c1512'; else if (y === y0 + 1) c = mix(base, '#8a7058', 0.35);
  else if ((x + off) % wd === 0) c = '#1c1512'; else if ((x + off) % wd === 1) c = mix(base, '#8a7058', 0.2);
  else if (hash(x * 3, y) < 0.05) c = mix(base, '#000000', 0.2);
  set(x, y, c);
}
// the cult's circle, painted on the flags in old blood, seen edge-on round the crowd
for (let a = 0; a < Math.PI * 2; a += 0.002) { const x = 300 + Math.cos(a) * 170, y = 243 + Math.sin(a) * 15; if (hash(Math.round(x), 7) > 0.12) { set(x, y, '#5a1216'); set(x, y + 1, '#40090e'); } }
for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2, x = 300 + Math.cos(a) * 170, y = 243 + Math.sin(a) * 15; for (let i = -2; i <= 2; i++) set(x + i, y - 2, '#5a1216'); set(x, y - 3, '#5a1216'); set(x, y - 4, '#5a1216'); }
for (let k = 0; k < 140; k++) { const x = hash(k, 1) * W, y = FLOOR + 3 + hash(k, 2) * (H - FLOOR - 4), l = 2 + Math.floor(hash(k, 3) * 4), up = hash(k, 4) < 0.5 ? -1 : 1, c = hash(k, 5) < 0.5 ? '#c9a24a' : '#8f7030'; for (let i = 0; i < l; i++) set(x + i, y + (i > l / 2 ? up : 0), c); }
for (const [x, y, r] of [[150, 256, 7], [160, 262, 3], [270, 262, 5], [60, 262, 3], [340, 250, 4]]) for (let j = -r; j <= r; j++) for (let i = -r * 2; i <= r * 2; i++) if ((i / (r * 2)) ** 2 + (j / (r * 0.45)) ** 2 <= 1) set(x + i, y + j, hash(x + i, y + j) < 0.3 ? '#4a0c10' : '#5e1012');
// pillars at both edges, with capitals
for (const x0 of [0, W - 22]) for (let y = 0; y < FLOOR; y++) for (let x = x0; x < x0 + 22; x++) {
  const i = x - x0, cap = y > 14 && y < 24, e = i === 0 || i === 21;
  let c = i < 5 ? '#5e5566' : i < 12 ? '#4b4454' : i < 18 ? '#3b3544' : '#2c2733';
  if (y % 30 === 0) c = '#221d28';
  if (cap) c = y === 15 ? '#6e6576' : y === 23 ? '#1a151e' : '#524a5c';
  if (e) c = '#120c10';
  set(x, y, c);
}

// the light of the bowls on the wall and the floor: stepped, dithered at each step
const FIRES = [[30, 170], [468, 170]];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  let t = 0;
  for (const [fx, fy] of FIRES) { const d = Math.hypot(x - fx, (y - fy) * (y > FLOOR ? 2.4 : 1.2)) + ((x + y) % 2 ? 2 : -2); for (const [r, v] of [[18, 0.26], [34, 0.17], [55, 0.1], [85, 0.05]]) if (d < r) { t = Math.max(t, v); break; } }
  if (t) tint(x, y, '#ff9440', t);
}
// the dark gathers up under the beam and in the corners
for (let y = 14; y < 60; y++) for (let x = 0; x < W; x++) { const t = (60 - y) / 46 * 0.45; if (hash(x, y) < 0.5 + t) tint(x, y, '#07040a', t); }

function place(s, x, y) {
  for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) { const c = s.px[j * s.w + i]; if (c) set(x + i - s.ax, y + j - s.ay, c); }
}
// a pool of shadow under each foot
const shadow = (x, y, rx) => { for (let j = -3; j <= 3; j++) for (let i = -rx; i <= rx; i++) { const d = (i / rx) ** 2 + (j / 3.2) ** 2; if (d <= 1) tint(x + i, y + j, '#050306', d < 0.45 ? 0.55 : 0.32); } };

place(banner(2), 420, 152);
place(brazier(), 30, 228); place(brazier(), 468, 228);

const CAST = [
  [ogre(true), 364, 232, 44], [seer(true), 446, 234, 12], [hunter(true), 410, 240, 12],
  [clubman(true, 'high'), 332, 251, 12], [butcher(true), 288, 249, 18], [clubman(true, 'low'), 242, 246, 12],
  [hound(true), 198, 252, 26], [goat(), 88, 250, 26],
];
// a low haze over the floor, warm by the bowls and violet by him, dithered
for (let y = FLOOR + 10; y < H; y++) for (let x = 0; x < W; x++) if ((x + y * 3) % 4 === 0) { const wv = Math.max(0, 1 - Math.hypot(x - 70, y - 244) / 90), ww = Math.max(0, 1 - Math.min(Math.abs(x - 30), Math.abs(x - 468)) / 110); if (wv > 0.05) tint(x, y, "#9a6cff", wv * 0.3); else if (ww > 0.05) tint(x, y, "#ffa050", ww * 0.18); }
for (const [, x, y, r] of CAST) shadow(x, y, r);
// witchfire behind him: the seer's violet flame caught on the flags at his back
{ const WF = ["#1e0a38", "#4a178a", "#7a34d8", "#b074ff", "#ecd8ff"], fillPoly = (P, c) => { const ys = P.map((p) => p[1]); for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) for (let x = 0; x < W; x++) { let inn = false; const px = x + 0.5, py = y + 0.5; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inn = !inn; } if (inn) set(x, y, c); } };
  // its light on the wall and the floor round it, stepped and dithered like the bowls'
  for (let y = 150; y < H; y++) for (let x = 0; x < 190; x++) { const d = Math.hypot(x - 70, (y - 222) * (y > FLOOR ? 2.2 : 1.1)) + ((x + y) % 2 ? 2 : -2); let t = 0; for (const [r, v] of [[26, 0.3], [44, 0.2], [66, 0.11], [92, 0.05]]) if (d < r) { t = v; break; } if (t) tint(x, y, "#8a5cff", t); }
  // scorched flags under it
  for (let i = -30; i <= 30; i++) for (let j = -2; j <= 2; j++) if ((i / 30) ** 2 + (j / 2.4) ** 2 <= 1 && hash(i, j + 50) < 0.7) tint(70 + i, 243 + j, "#0a0610", 0.5);
  const TONGUES = [[34, 18, 4, 3], [42, 34, 5, -3], [51, 50, 6, 4], [60, 62, 7, -2], [70, 56, 7, 5], [80, 66, 7, -4], [90, 52, 6, 3], [99, 40, 6, -2], [107, 24, 5, 2]];
  // each tongue a curve: fat and round at the root, bending as it thins to a tip; four layers, the
  // hottest innermost and lowest
  const base = 244;
  for (const [layer, k] of [[0, 1], [1, 0.72], [2, 0.46], [3, 0.24]]) for (const [xc, h, w, lean] of TONGUES) {
    const hh = h * k, ww = w * (0.45 + k * 0.55) * 1.25;
    for (let y = Math.floor(base - hh); y <= base; y++) {
      const f = (base - y) / hh, cx = xc + lean * f * f * 1.6 + Math.sin(f * 5 + xc) * f * 1.2;
      const half = ww * Math.pow(Math.max(0, 1 - f), 0.55) * (f < 0.15 ? 0.85 + f : 1);
      for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) if (Math.abs(x + 0.5 - cx) <= half) set(x, y, WF[layer + 1]);
    }
  }
  // flame torn off the tips, still burning as it rises
  for (const [x, y, r] of [[62, 178, 2.2], [82, 170, 2.4], [53, 190, 1.6], [92, 186, 1.8], [71, 184, 1.4]]) for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const d = (i / r) ** 2 + (j / (r * 1.5)) ** 2; if (d <= 1) set(x + i, y + j, d < 0.3 ? WF[3] : WF[2]); }
  for (let x = 30; x < 112; x++) { set(x, 244, WF[1]); if (x % 3) set(x, 243, WF[2]); }
  // sparks off it, violet
  for (let k = 0; k < 26; k++) { const x = 32 + hash(k, 31) * 78, y = 200 - hash(k, 32) * 70; set(x, y, hash(k, 33) < 0.5 ? WF[3] : WF[4]); if (hash(k, 34) < 0.3) set(x, y + 1, WF[1]); }
}
// the light of each fire caught on the edge of whoever faces it: warm from the bowls, violet off the
// witchfire at his back — one pixel of rim, two steps of strength
const LIGHTS = [[30, 196, "#ffb060", 150, 0.6], [468, 196, "#ffb060", 150, 0.6], [70, 214, "#c08cff", 110, 0.75]];
function rim(s, x0, y0) {
  for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) {
    if (!s.part[j * s.w + i]) continue;
    const wx = x0 + i - s.ax, wy = y0 + j - s.ay;
    for (const [lx, ly, c, r, str] of LIGHTS) {
      const dx = lx - wx, dy = ly - wy, d = Math.hypot(dx, dy); if (d > r || d < 1) continue;
      const nx = Math.round(dx / d * 1.4), ny = Math.round(dy / d * 1.4), ii = i + nx, jj = j + ny;
      const out = ii < 0 || jj < 0 || ii >= s.w || jj >= s.h || !s.part[jj * s.w + ii];
      if (out) { const a = (1 - d / r) * str; tint(wx, wy, c, a > 0.4 ? 0.55 : a > 0.2 ? 0.38 : 0.22); }
    }
  }
}
for (const [s, x, y] of CAST) { place(s, x, y); rim(s, x, y); }

// the lava horns glow on whatever is round them
{ const gx = 88 + 20, gy = 250 - 62; for (let y = gy - 26; y < gy + 26; y++) for (let x = gx - 30; x < gx + 30; x++) { const d = Math.hypot((x - gx) / 30, (y - gy) / 24) + ((x + y) % 2 ? 0.05 : -0.05); if (d < 1) tint(x, y, "#ff7a2a", d < 0.45 ? 0.2 : d < 0.75 ? 0.12 : 0.06); } }
// VENOM SPIT: a glob in the air at the hound, a trail of drops behind it, a hissing pool where they fell
{ const G = M.venom;
  for (let j = -4; j <= 4; j++) for (let i = -5; i <= 5; i++) { const d = (i / 5) ** 2 + (j / 4) ** 2; if (d <= 1) set(144 + i, 213 + j, d < 0.25 ? G[4] : d < 0.55 ? G[3] : G[2]); else if (d < 1.35) set(144 + i, 213 + j, "#0c1a08"); }
  for (const [x, y, r] of [[137, 211, 1.5], [133, 210, 1.1]]) for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (i * i + j * j <= r * r) set(x + i, y + j, G[3]);
  for (const [x, y] of [[142, 219], [143, 225], [141, 232], [142, 240]]) { set(x, y, G[3]); set(x, y + 1, G[2]); }
  for (let j = -2; j <= 2; j++) for (let i = -12; i <= 12; i++) { const d = (i / 12) ** 2 + (j / 2.4) ** 2; if (d <= 1) set(142 + i, 256 + j, d < 0.4 ? G[3] : G[2]); }
  for (const [x, y] of [[134, 251], [144, 249], [150, 252]]) { set(x, y, G[4]); set(x + 1, y - 2, G[3]); }
  for (let y = 196; y < 234; y++) for (let x = 126; x < 170; x++) { const d = Math.hypot(x - 144, (y - 213) * 1.2); if (d > 6 && d < 16 && (x + y) % 2) tint(x, y, "#9fd84a", 0.12); } }
// embers off the bowls, rising
for (let k = 0; k < 40; k++) { const side = k % 2 ? 30 : 468, x = side + (hash(k, 11) - 0.5) * 40, y = 190 - hash(k, 12) * 150; set(x, y, hash(k, 13) < 0.5 ? '#ffa53a' : '#ffe08a'); if (hash(k, 14) < 0.3) set(x, y + 1, '#c2410f'); }
// ---------------------------------------------------------------- the title
// Bone letters lit from above, edged near-black, dropped a shadow down-right, old blood running off
// them; the cult's triangle either side of the shorter word; a line of ochre under it all.
{
  const BONE = M.bone, RED = M.red, INK = '#120406';
  const CX = 176, words = [[layout(LOGO, 'DOOMED', 4), 24], [layout(LOGO, 'GOAT', 4), 80]];
  const tag = layout(SMALL, 'BREAK THE BARS AND GO GET THEM', 1);
  // a dark pool behind the words so they read off the bricks, stepped and dithered like the light
  for (let y = 10; y < 160; y++) for (let x = 22; x < 336; x++) {
    const d = Math.hypot((x - CX) / 158, (y - 84) / 74) + ((x + y) % 2 ? 0.04 : -0.04);
    if (d < 1) tint(x, y, '#06030a', d < 0.55 ? 0.5 : d < 0.8 ? 0.34 : 0.18);
  }
  const masks = words.map(([m, y]) => ({ m, x: Math.round(CX - m.w / 2), y }));
  // the triangle sigil, two pixels thick, its dot
  const tri = (cx, top, h) => { const pts = []; for (let y = 0; y < h; y++) { const half = (y / (h - 1)) * (h * 0.55); for (let x = -Math.ceil(half) - 1; x <= Math.ceil(half) + 1; x++) { const edge = Math.abs(Math.abs(x) - half) < 1.2 || y >= h - 2; if (edge) pts.push([cx + x, top + y]); } } for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) pts.push([cx + i, top + Math.round(h * 0.62) + j]); return pts; };
  const g = masks[1];
  const sig = new Set([...tri(g.x - 22, g.y + 10, 26), ...tri(g.x + g.m.w + 21, g.y + 10, 26)].map(([x, y]) => x + ',' + y));
  const tx = Math.round(CX - tag.w / 2), ty = 140;
  const on = (x, y) => masks.some((k) => k.m.on(x - k.x, y - k.y));
  const onAny = (x, y) => on(x, y) || sig.has(x + ',' + y) || tag.on(x - tx, y - ty);
  const box = [30, 18, 324, 152];
  // drop shadow, then the edge, then the fill
  for (let y = box[1]; y < box[3]; y++) for (let x = box[0]; x < box[2]; x++) if (!onAny(x, y) && onAny(x - 2, y - 3)) tint(x, y, '#000000', 0.72);
  for (let y = box[1]; y < box[3]; y++) for (let x = box[0]; x < box[2]; x++) {
    if (onAny(x, y)) continue;
    let n = false; for (let j = -1; j <= 1 && !n; j++) for (let i = -1; i <= 1; i++) if (onAny(x + i, y + j)) { n = true; break; }
    if (n) set(x, y, INK);
  }
  for (const k of masks) for (let y = 0; y < k.m.h; y++) for (let x = 0; x < k.m.w; x++) {
    if (!k.m.on(x, y)) continue;
    const f = y / k.m.h, dith = (x + y) % 2;
    let c = f < 0.3 ? BONE[3] : f < 0.36 ? (dith ? BONE[3] : BONE[2]) : f < 0.66 ? BONE[2] : f < 0.72 ? (dith ? BONE[2] : BONE[1]) : BONE[1];
    if (!k.m.on(x, y - 1)) c = BONE[4];
    else if (!k.m.on(x - 1, y)) c = mix(c, BONE[4], 0.4);
    if (!k.m.on(x, y + 1)) c = BONE[0];
    else if (!k.m.on(x + 1, y) || !k.m.on(x, y + 2)) c = mix(c, BONE[0], 0.45);
    if (hash(x + k.x, y * 7 + k.y) < 0.035) c = mix(c, BONE[0], 0.5);           // wear
    set(k.x + x, k.y + y, c);
  }
  for (const s of sig) { const [x, y] = s.split(',').map(Number); set(x, y, sig.has(x + ',' + (y - 1)) ? BONE[2] : BONE[4]); }
  for (let y = 0; y < tag.h; y++) for (let x = 0; x < tag.w; x++) if (tag.on(x, y)) set(tx + x, ty + y, y < 2 ? '#f0c050' : '#d09a2a');
  // old blood: a few splashes on the faces, and runs off the bottoms of the strokes
  const SPL = [[0, 5, 6], [1, 2, 4], [3, 8, 9], [5, 3, 5], [7, 6, 7], [8, 1, 3]];
  const all = masks.flatMap((k) => { const pts = []; for (let y = 0; y < k.m.h; y++) for (let x = 0; x < k.m.w; x++) if (k.m.on(x, y)) pts.push([k.x + x, k.y + y]); return pts; });
  for (const [a, b, c] of SPL) {
    const [px, py] = all[Math.floor(hash(a * 31, b * 17 + c) * all.length)];
    for (let j = -2; j <= 2; j++) for (let i = -3; i <= 3; i++) { const d = (i / 2.6) ** 2 + (j / 1.8) ** 2 + hash(px + i, py + j) * 0.6; if (d < 1 && on(px + i, py + j)) set(px + i, py + j, d < 0.35 ? RED[3] : RED[2]); }
  }
  const drips = [];
  for (const k of masks) for (let x = 0; x < k.m.w; x++) for (let y = 0; y < k.m.h; y++) if (k.m.on(x, y) && !k.m.on(x, y + 1) && hash(k.x + x, 91) < 0.11) drips.push([k.x + x, k.y + y]);
  for (const [x, y] of drips) {
    const L = 3 + Math.floor(hash(x, y) * 13), wide = hash(x, 3) < 0.4;
    for (let j = -2; j <= 0; j++) if (on(x, y + j)) { set(x, y + j, RED[2]); if (wide && on(x + 1, y + j)) set(x + 1, y + j, RED[2]); }
    for (let j = 1; j <= L; j++) { set(x, y + j, j < 3 ? RED[3] : RED[2]); if (wide && j < L - 1) set(x + 1, y + j, RED[1]); set(x - 1, y + j, mix(get(x - 1, y + j), INK, 0.5)); }
    set(x, y + L + 1, RED[1]); set(x + 1, y + L + 1, RED[1]); set(x, y + L + 2, RED[1]); set(x + 1, y + L + 2, RED[0]); set(x, y + L, RED[4]);
  }
}

// the corners darkened, stepped
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot((x - W / 2) / (W * 0.62), (y - H * 0.55) / (H * 0.7)); if (d > 0.8) tint(x, y, '#000000', d > 0.98 ? 0.4 : d > 0.9 ? 0.25 : 0.12); }

const buf = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) { const [r, g, b] = hex(scene[i]); buf[i * 4] = r; buf[i * 4 + 1] = g; buf[i * 4 + 2] = b; buf[i * 4 + 3] = 255; }
const out = new Img(W * K, H * K);
out.blit({ w: W, h: H, data: buf }, 0, 0, W, H, 0, 0, W * K, H * K);
fs.writeFileSync(__dirname + '/header.png', out.png());
console.log('header.png', out.w, out.h);
