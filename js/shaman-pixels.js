// THE SHAMAN's body (6 Oct 2026, js/shaman.js). The reference the user sent is the Mesolithic shaman of Bad
// Dürrenberg (deer antlers, boar tusks, crane and turtle in her grave). Two rounds of three looks, and he took the
// crane's skull: the skull for a face, its long beak down his chest, a fan of its feathers behind his head with
// the crane's red on top, a turtle's shell on his back (round his sides from the front, all of him from behind),
// his eyes burning green in the sockets, and a staff with a small skull whose eyes burn red. All of it in the
// cast's own look: the atlas's mage and clubman (js/pixel-assets.js) are squat, a head as big as the body, two or
// three flat tones a colour, each outlined in a dark step of its own hue (never black), about 36 texels tall.
// The robe's colour is one of `ROBES` (`ART_PASS.shaman`, the ART tab's SHAMAN button; the first two rounds are
// in output/shaman-2026-10-06/).
// Five views (front, front diagonal, side, back diagonal, back) mirrored for the other three, a stride, and the
// two casts: `raise` (the staff up and shaken, `j`) and `call` (the staff up, the free hand out). `f` flickers the
// burning eyes. Render only: nothing in the simulation reads it.
const SHAMAN_PIXELS = (() => {
  const { Grid } = typeof PROP_PIXELS !== 'undefined' ? PROP_PIXELS : require('./prop-pixels.js');
  const W = 38, H = 48, FOOT = 46, UP = 8;   // drawn `UP` rows down so the staff raised and the feathers fit
  // His robe, three to pick from (6 Oct 2026, "the colour of his robe a bit different" from the crane's grey).
  const ROBES = [
    ['DUSK', ['#2e3452', '#454e78', '#646f9e']],
    ['SOOT', ['#26211e', '#3a332e', '#524840']],
    ['OCHRE', ['#6e4420', '#98602c', '#bc8240']],
  ];
  const LOOKS = ROBES.map((x) => x[0]);
  // Ramps of three, dark to light, as the cast is painted; `OL` is each hue's outline (`outline` below).
  const R = {
    shell: ['#2f4a24', '#4b6e33', '#6f9446'], scute: '#22361b',
    bone: ['#a89878', '#d8ccae', '#f4ecd6'],
    skin: ['#b8805a', '#e0aa7c', '#f4c89a'],
    wood: ['#4a2e1c', '#6e4428', '#946038'],
    boot: ['#2e2018', '#463024', '#5a4030'],
    wing: ['#1c1c22', '#9aa0aa', '#e8eaee'],       // a feather: its black tip, its grey, its white
    crown: '#c0392b', void: '#0c0a0e',
    // burning: the core and the glow, two flickers each; his own eyes green, the staff's skull red
    eye: [['#b8ffd0', '#3cd47a'], ['#e6fff0', '#5ae89a']],   // PALETTE.spirit's greens
    skullEye: [['#ff7a5a', '#d0281e'], ['#ffc0a0', '#ff4a2a']],
  };
  const lit = (T, dx, dy, n) => { const l = -(dx * 0.6 + dy * 0.8); return n > 0.78 && l < -0.25 ? T[0] : l > 0.45 && n > 0.35 ? T[2] : T[1]; };
  const vol = (g, cx, cy, rx, ry, T, test) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, n = Math.hypot(dx, dy);
      if (n > 1 || (test && !test(x, y))) continue;
      g.set(x, y, lit(T, dx, dy, n));
    }
  };
  const OL = new Map();   // every colour's own outline: its ramp's dark step pushed darker
  const darker = (c, k) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(c.substr(i, 2), 16) * k).toString(16).padStart(2, '0')).join('');
  const olOf = (c) => { let o = OL.get(c); if (!o) { o = darker(c, c === R.void ? 1 : 0.42); OL.set(c, o); } return o; };
  // The cast's outline: an empty pixel touching the figure takes the darkened colour of what it touches
  // (the darkest neighbour wins), so the purple mage is ringed in purple and the bone in brown.
  function outline(g) {
    const add = [];
    const lum = (c) => parseInt(c.substr(1, 2), 16) + parseInt(c.substr(3, 2), 16) + parseInt(c.substr(5, 2), 16);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (g.get(x, y)) continue;
      let best = null;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = g.get(x + dx, y + dy); if (v && (!best || lum(v) < lum(best))) best = v; }
      if (best) add.push([x, y, olOf(best)]);
    }
    for (const [x, y, c] of add) g.set(x, y, c);
    return g;
  }

  // ---- what every look has ----
  const feet = (g, cx, s, side) => {
    const l = (k) => Math.max(0, k) * 1.5;
    if (side) { vol(g, cx - 1 + s * 1.5, 44.6 - l(s), 2.6, 1.6, R.boot); vol(g, cx - 1 - s * 1.5, 44.6 - l(-s), 2.6, 1.6, R.boot); return; }
    vol(g, cx - 3.5, 44.6 - l(s), 2.8, 1.7, R.boot); vol(g, cx + 3.5, 44.6 - l(-s), 2.8, 1.7, R.boot);
  };
  // The robe, short, with a ragged hem of tufts. Narrower than the first cut (the user's, same day: "less bulk").
  const robe = (g, cx, T, w = 7.2) => {
    vol(g, cx, 37, w, 8, T, (x, y) => y >= 28 && y <= 43);
    for (let x = Math.round(cx - w + 1); x <= cx + w - 1; x += 2) g.set(x, 44, T[0]);
  };
  // A sleeve: a lump of the robe off his shoulder down to the hand.
  const sleeve = (g, x, y0, y1, T) => vol(g, x, (y0 + y1) / 2, 2.4, (y1 - y0) / 2 + 1, T);
  // The shell: behind him, bigger than he is, its rim showing round his sides from the front.
  const shellBehind = (g, cx, cy, rx, ry) => { vol(g, cx, cy, rx, ry, R.shell); };
  // The shell seen whole (his back, or the side): plates (scutes) in a dark line pattern, a lit rim.
  // A turtle's plates: a row of hexagons down the middle, a row of half-plates either side.
  const shellWhole = (g, cx, cy, rx, ry) => {
    vol(g, cx, cy, rx, ry, R.shell);
    const hex = (hx, hy, a, b) => {
      const P = [[-a, 0], [-a / 2, -b], [a / 2, -b], [a, 0], [a / 2, b], [-a / 2, b]];
      for (let i = 0; i < 6; i++) { const p = P[i], q = P[(i + 1) % 6]; g.line(hx + p[0], hy + p[1], hx + q[0], hy + q[1], R.scute, true); }
    };
    const a = Math.max(2, rx * 0.3), b = Math.max(1.6, ry * 0.26);
    for (const k of [-1, 0, 1]) hex(cx, cy + k * b * 2, a, b);
    for (const sd of [-1, 1]) for (const k of [-0.5, 0.5]) hex(cx + sd * a * 1.5, cy + k * b * 2, a, b);
    g.ring(cx, cy, rx, ry, 1.2, R.shell[0], true);
  };
  const hand = (g, x, y) => vol(g, x, y, 1.9, 1.7, R.skin);
  // The staff, and the skull on it with its eyes burning (`f` the flicker); a tuft of feathers under the skull.
  // `top` the skull's top row; `j` shakes it a column either way. The skull looks where he looks (the user's:
  // "the skull looks your way, with the shaman"): `view` 'F' both eyes, 'S' in profile facing left with one eye
  // and its jaw out in front, 'B' the back of it.
  const staff = (g, x, top, j, f, view = 'F') => {
    g.rect(x, top + 5, 2, FOOT - 2 - (top + 5) - (top < UP ? UP - top : 0), R.wood[1]);
    g.vl(x, top + 5, FOOT - 2 - (top + 5) - (top < UP ? UP - top : 0), R.wood[2]);
    const sx = x + j, E = R.skullEye[f || 0];
    if (view === 'S') {
      vol(g, sx + 1.5, top + 2.2, 2.8, 2.6, R.bone); g.rect(sx - 2, top + 3, 3, 2, R.bone[1]); g.hl(sx - 2, top + 5, 3, R.bone[0]);
      g.set(sx - 1, top + 2, E[0]); g.set(sx - 1, top + 3, E[1]);
    } else if (view === 'B') {
      vol(g, sx + 1, top + 2.2, 3, 2.6, R.bone); g.hl(sx - 1, top + 4, 4, R.bone[0]); g.set(sx + 1, top + 1, R.bone[0]);
    } else {
      vol(g, sx + 1, top + 2.2, 3, 2.6, R.bone);
      g.rect(sx - 1, top + 4, 4, 1, R.bone[0]); g.set(sx, top + 5, R.bone[1]); g.set(sx + 2, top + 5, R.bone[1]);
      g.set(sx, top + 2, E[0]); g.set(sx + 2, top + 2, E[0]); g.set(sx, top + 3, E[1]); g.set(sx + 2, top + 3, E[1]);
    }
    g.set(sx + 1 - j, top + 6, R.wing[2]); g.set(sx + 2 - j, top + 7, R.wing[1]); g.set(sx + 2 - j, top + 8, R.wing[0]);
  };
  const eyes = (g, xs, y, f) => { const E = R.eye[f || 0]; for (const x of xs) { g.set(x, y, E[0]); g.set(x + 1, y, E[1]); } };
  // A feather off (x, y) along angle `a`, `L` long: grey, white along its lit edge, its last third black.
  const feather = (g, x, y, a, L, dim) => {
    const ux = Math.cos(a), uy = Math.sin(a);
    for (let s = 0; s <= L; s += 0.5) {
      const px = x + ux * s, py = y + uy * s, tip = s > L * 0.78;
      g.set(px, py, tip ? R.wing[0] : dim ? R.wing[1] : R.wing[2]);
      if (!tip && s > 1) g.set(px - uy * 0.9, py + ux * 0.9, R.wing[1]);
    }
  };

  // ---- the head, per view: 'F' front (with `turn`), 'S' side facing left, 'B' back ----
  function head(g, view, hx, turn, f) {
    const HY = 20;
    if (view === 'B') {
      for (let i = 0; i < 7; i++) feather(g, hx + turn * 0.5, HY - 2, -Math.PI * (0.04 + 0.153 * i), 15 - Math.abs(i - 3) * 1.1, true);
      vol(g, hx + turn * 0.5, HY, 7.2, 6.4, R.bone);
      g.rect(Math.round(hx - 1 + turn * 0.5), HY - 6, 3, 1, R.crown);
      return;
    }
    if (view === 'S') {
      for (let i = 0; i < 5; i++) feather(g, hx + 3, HY - 2, -Math.PI * (0.02 + 0.15 * i), 14.5 - Math.abs(i - 2) * 1.3, i > 2);
      vol(g, hx + 0.5, HY, 6.4, 6.2, R.bone);
      g.rect(hx - 1, HY - 6, 3, 1, R.crown);
      g.rect(hx - 3, HY - 1, 3, 3, R.void); eyes(g, [hx - 3], HY, f);
      // the beak out and down in front of him
      g.line(hx - 5, HY + 2, hx - 11, HY + 8, R.bone[1]); g.line(hx - 5, HY + 3, hx - 10, HY + 8, R.bone[0]); g.line(hx - 4, HY + 1, hx - 11, HY + 7, R.bone[2]);
      g.rect(hx - 4, HY + 5, 5, 2, R.void);
      return;
    }
    for (let i = 0; i < 7; i++) feather(g, hx - turn, HY - 2, -Math.PI * (0.04 + 0.153 * i), 15.5 - Math.abs(i - 3) * 1.1, i === 0 || i === 6);
    vol(g, hx - turn * 0.5, HY, 7.2, 6.4, R.bone);
    g.rect(Math.round(hx - 1 - turn), HY - 6, 3, 1, R.crown);
    // the sockets, the eyes burning in them, the void under the skull's rim
    const ex = Math.round(hx - turn);
    g.rect(ex - 5, HY - 1, 3, 3, R.void); g.rect(ex + 2 - turn, HY - 1, 3, 3, R.void);
    eyes(g, [ex - 5, ex + 2 - turn], HY, f);
    g.rect(ex - 4, HY + 5, 9 - turn, 2, R.void);
    // the beak, down the middle of his chest
    for (let y = HY + 1; y <= HY + 11; y++) { const w = y < HY + 7 ? 2 : 1; g.rect(ex - (w > 1 ? 1 : 0), y, w, 1, y < HY + 4 ? R.bone[2] : R.bone[1]); if (w > 1) g.set(ex, y, R.bone[0]); }
  }
  const robeOf = (look) => (ROBES[look] || ROBES[0])[1];

  // ---- the views ----
  function front(g, o, turn) {
    const cx = 17, look = o.look, up = o.pose === 'raise' || o.pose === 'call';
    shellBehind(g, cx - turn * 0.5, 33, 9, 8.2);
    feet(g, cx - turn * 0.5, o.step);
    robe(g, cx - turn * 0.5, robeOf(look));
    const T = robeOf(look);
    if (o.pose !== 'call') sleeve(g, cx - 7 + turn, 30, 35, [T[0], T[0], T[1]]);
    sleeve(g, cx + 7 - turn, 30, up ? 31 : 34, [T[0], T[0], T[1]]);
    g.hl(Math.round(cx - 6 - turn * 0.5), 35, 13 - turn, R.wood[1], true); g.set(Math.round(cx - turn), 35, R.bone[2]);   // the belt
    if (o.pose === 'call') { vol(g, cx - 9 + turn, 31, 3, 2, robeOf(look)); hand(g, cx - 12 + turn, 30); }
    else hand(g, cx - 7.5 + turn, 37 - (o.step < 0 ? 1 : 0));
    const sx = cx + 10 - turn, top = up ? UP - 6 : UP + 2;
    staff(g, sx, top, o.j || 0, o.f, 'F');
    hand(g, sx + 0.5, up ? 24 : 35);
    head(g, 'F', cx, turn, o.f);
  }
  function side(g, o) {
    const cx = 18, look = o.look, up = o.pose === 'raise' || o.pose === 'call';
    shellWhole(g, cx + 4, 34, 6.5, 8.5);
    feet(g, cx, o.step, true);
    robe(g, cx - 1.5, robeOf(look), 5.6);
    g.hl(cx - 7, 35, 10, R.wood[1], true);
    const sx = cx - 8, top = up ? UP - 6 : UP + 2;
    staff(g, sx, top, o.j || 0, o.f, 'S');
    if (o.pose === 'call') { vol(g, cx - 5, 31, 3, 2, robeOf(look)); hand(g, cx - 12, 30); }
    sleeve(g, cx - 4, 30, up ? 31 : 34, [robeOf(look)[0], robeOf(look)[1], robeOf(look)[2]]);
    hand(g, sx + 0.5, up ? 24 : 35);
    head(g, 'S', cx, 0, o.f);
  }
  function back(g, o, turn) {
    const cx = 17, look = o.look, up = o.pose === 'raise' || o.pose === 'call';
    feet(g, cx + turn * 0.5, -o.step);
    robe(g, cx + turn * 0.5, robeOf(look));
    const sx = cx - 11 + turn, top = up ? UP - 6 : UP + 2;
    staff(g, sx, top, o.j || 0, o.f, 'B');
    hand(g, sx + 0.5, up ? 24 : 35);
    if (o.pose === 'call') hand(g, cx + 12, 30); else hand(g, cx + 7.5, 37);
    shellWhole(g, cx + turn * 0.5, 34, 9, 8.6);
    head(g, 'B', cx, turn, o.f);
  }

  // Drawn on a grid `UP` rows deep at the top (`Off`), so the staff raised over his head is not cut off.
  class Off extends Grid { set(x, y, c) { return super.set(x, Math.round(y) + UP, c); } get(x, y) { return super.get(x, Math.round(y) + UP); } }
  // The eight facings `PIXEL_ART.draw` numbers (0 S, 1 SW, 2 W, 3 NW, 4 N, 5 NE, 6 E, 7 SE).
  const VIEWS = [['front', 0], ['front', 1], ['side', 0], ['back', 1], ['back', 0], ['back', 1, true], ['side', 0, true], ['front', 1, true]];
  const cache = new Map();
  function sprite(d, look, step, pose, j, f) {
    const key = [d, look, step, pose, j || 0, f || 0].join(':'); let v = cache.get(key); if (v) return v;
    const [kind, turn, flip] = VIEWS[d], o = { look, step, pose, j, f }, g0 = new Off(W, H + UP);
    if (kind === 'front') front(g0, o, turn); else if (kind === 'side') side(g0, o); else back(g0, o, turn);
    const g = new Grid(W, H + UP); g.p = g0.p; outline(g);
    v = { g, flip: !!flip }; cache.set(key, v); return v;
  }
  return { R, W, H, FOOT, UP, LOOKS, ROBES, sprite, VIEWS };
})();
if (typeof module !== 'undefined') module.exports = SHAMAN_PIXELS;

// In the page: each sprite baked once to a canvas, `BAKE` px a texel, drawn smoothed at `TX` world px a texel with
// his soles on the origin, inside the frame `PaintedArt.character` has already leaned. The cast's own size: the
// atlas mage stands 38 world px.
if (typeof document !== 'undefined') {
  const BAKE = 4, baked = new Map();
  SHAMAN_PIXELS.TX = 1.0;
  SHAMAN_PIXELS.canvas = (sp) => {
    let c = baked.get(sp); if (c) return c;
    const g = sp.g; c = document.createElement('canvas'); c.width = g.w * BAKE; c.height = g.h * BAKE;
    const x = c.getContext('2d');
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const v = g.get(i, j); if (v) { x.fillStyle = v; x.fillRect(i * BAKE, j * BAKE, BAKE, BAKE); } }
    baked.set(sp, c); return c;
  };
  // What his state shows (js/shaman.js): the staff up and shaken through the spirit's windup, up with the
  // other hand out at the goat through the call's.
  SHAMAN_PIXELS.poseOf = (e) => (e && e.state === 'shspirit' ? 'raise' : e && e.state === 'shcall' ? 'call' : 'idle');
  SHAMAN_PIXELS.draw = (ctx, angle, moving, t, x, e) => {
    const S = SHAMAN_PIXELS, d = (Math.round(angle / (Math.PI / 4)) % 8 + 14) % 8, pose = S.poseOf(e);
    const ph = Math.floor(t * 6 + (x || 0) * 0.05) % 4, step = moving && pose === 'idle' ? [0, 1, 0, -1][ph] : 0;
    const j = pose === 'raise' ? (Math.floor(t * 14) % 2 ? 1 : -1) : 0;
    // the eyes burn: a flicker that quickens through a cast
    const f = Math.floor(t * (pose === 'idle' ? 5 : 12) + (x || 0) * 0.07) % 2;
    const sp = S.sprite(d, ART_PASS.shaman || 0, step, pose, j, f), k = S.TX;
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.save(); if (moving) ctx.rotate(step * 0.04); if (sp.flip) ctx.scale(-1, 1);
    ctx.drawImage(S.canvas(sp), -S.W / 2 * k, -(S.FOOT + S.UP) * k, S.W * k, (S.H + S.UP) * k);
    ctx.restore(); ctx.imageSmoothingEnabled = smooth;
  };
}
