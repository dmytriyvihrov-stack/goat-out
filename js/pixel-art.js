// Pixel 2.5 — the art of the game (output/pixel-mid-2026-09-23, packed by tools/pack-pixel.ps1 into
// js/pixel-assets.js). Every unit is drawn off this atlas; `PaintedArt` is only the frame round it
// (shadows, leans, the collar, the wounds) plus the handful of props no pixel sprite exists for yet.
// Nothing in the simulation reads any of this.
//
// A frame is [x, y, w, h, footX, footY] in atlas px, and a unit's whole `sourceExtent` (its largest
// frame) is PIXEL_ASSETS.target px — so `EXTENT` below is simply how many world px that is. The foot
// point is drawn at the origin, which is where every caller has already put the shadow.
const PIXEL_EXTENT = {
  goat: 34, clubman: 36, brute: 38, mage: 38, hound: 40, hunter: 38, butcher: 48, wraith: 38,
  chicken: 22, ratogre: 70, mouse: 26, goose: 28, raven: 22, turtle: 28, 'sheep-pet': 32,
};
// The painted slot names this pass fills. `sheep` is the goat's old slot name, not a sheep.
const PIXEL_UNIT = {
  sheep: 'goat', clubman: 'clubman', brute: 'brute', mage: 'mage', hound: 'hound', hunter: 'hunter',
  butcher: 'butcher', wraith: 'wraith', chicken: 'chicken', ratogre: 'ratogre',
};

// The throat of the pixel goat in each of his eight idle facings, world px from the foot (the same
// index `draw` picks). Measured off the atlas frame by frame: a talisman hung off one offset for all
// eight floated beside his head on the side views and sat on his cheek on the diagonals. Facings 3–5
// are his back: the charm is under his chin and out of sight, so only the cord across the nape shows.
// Re-measured on a world-px grid: the diagonals had the throat on the chest (SE) and the back views
// had the nape at the crown of the head, which put the collar round his horns.
// The two front diagonals came in and down a little more (23 Sep): at [±3.5, -8] the ring sat on
// his cheek and read as a hook through the mouth rather than a collar under the jaw.
const PIXEL_NECK = [[0, -6.3], [-2.2, -6.8], [-6.6, -11.7], [-1.5, -17], [0, -16.5], [1.5, -17], [6.6, -11.7], [2.2, -6.8]];
// The rest of his face per facing, the same way and in the same units: `mouth` under the muzzle,
// `nose` one point per nostril the camera can see, `brow` between and above the eyes. The back
// views have no face; their `nose` is the front of the head beyond the crown, so steam still rises
// from the far side of him.
const PIXEL_FACE = [
  { mouth: [0.1, -7.6], nose: [[-0.7, -9.3], [0.8, -9.3]], brow: [0.2, -16] },
  { mouth: [-8.4, -7.2], nose: [[-9.4, -8.3], [-8, -8.7]], brow: [-6.4, -14.8] },
  { mouth: [-14.8, -12], nose: [[-15.9, -13.9]], brow: [-10.6, -18.3] },
  { mouth: null, nose: [[-5.6, -23.5]], brow: null },
  { mouth: null, nose: [[0, -24]], brow: null },
  { mouth: null, nose: [[6.3, -23.5]], brow: null },
  { mouth: [14.4, -12.4], nose: [[15.7, -14.2]], brow: [10.6, -18.6] },
  { mouth: [8.4, -7.5], nose: [[9.1, -8.5], [7.7, -8.9]], brow: [6.4, -14.7] },
];
// What the souls put on his face, drawn by hand one sprite pixel a character, facing right
// (`PIXEL_ART.face` mirrors them for the facings to the left). `at` is the cell that sits on the
// `PIXEL_FACE` point; the outline is added round whatever is filled. `t` tube, `w` rim, `i` the
// dark inside a bell, `g`/`d` froth light and dark, `v` iris, `p` pupil, `h` a glint, `o` a lid.
const PIXEL_FACE_ART = {
  throat: {                                        // [calm, shouting] per view
    front: [{ rows: ['www', 'wiw', 'www'], at: [1, 0] },
      { rows: ['.www.', 'wiiiw', 'wiiiw', 'wiiiw', '.www.'], at: [2, 0] }],
    diag: [{ rows: ['.www', 'twiw', '.www'], at: [0, 1] },
      { rows: ['..www.', '.wiiiw', 'twiiiw', '.wiiiw', '..www.'], at: [0, 2] }],
    side: [{ rows: ['..ww', 'ttwi', '..ww'], at: [0, 1] },
      { rows: ['...ww', '..wii', 'ttwii', '..wii', '...ww'], at: [0, 2] }],
  },
  foam: [
    { rows: ['..g..', 'gggg.', '.g.d.'], at: [1, 1] },
    { rows: ['.d...', 'ggggg', '..g..'], at: [1, 1] },
    { rows: ['...g.', 'gggg.', '.d.g.'], at: [1, 1] },
    { rows: ['g....', 'ggggg', '...d.'], at: [1, 1] },
  ],
  eye: { front: { rows: ['.v.', 'hpv', 'vpv', '.v.'], at: [1, 2] }, side: { rows: ['v', 'p', 'p', 'v'], at: [0, 2] } },
  eyeShut: { rows: ['ooo'], at: [1, 0] },
};

const PIXEL_ART = {
  image: null,
  init() {
    if (typeof PIXEL_ASSETS === 'undefined') return;
    // The packer's downscale leaves every edge of every unit half transparent. Point-sampled, those
    // half pixels came and went from frame to frame, so the goat and the cult read as cut out with
    // blunt scissors, a soft rim round each. The alpha is hardened once, on load: a pixel is the unit
    // or it is not. A canvas stands in for the image from then on (`naturalWidth` is what `ready` asks).
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'), x = c.getContext('2d');
      c.width = img.naturalWidth; c.height = img.naturalHeight; x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height), a = d.data;
      for (let i = 3; i < a.length; i += 4) a[i] = a[i] >= 128 ? 255 : 0;
      x.putImageData(d, 0, 0); c.naturalWidth = c.width; c.naturalHeight = c.height;
      this.image = c;
    };
    this.image = img; img.src = PIXEL_ASSETS.src;
  },
  get ready() { return !!this.image && this.image.naturalWidth > 0; },
  // The unit a painted slot draws as, or null before the atlas has loaded or for a slot with no art.
  unit(key) { return this.ready ? PIXEL_UNIT[key] || null : null; },

  // One frame, foot at the origin, `scale` extra on top of the unit's own size. Smoothing off: at
  // this camera the atlas is close to one texel a screen pixel and a blur only muddies the outline.
  frame(ctx, f, id, scale = 1, flip = false) {
    const k = PIXEL_EXTENT[id] / PIXEL_ASSETS.target * scale;
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    if (flip) { ctx.save(); ctx.scale(-1, 1); }
    ctx.drawImage(this.image, f[0], f[1], f[2], f[3], -f[4] * k, -f[5] * k, f[2] * k, f[3] * k);
    if (flip) ctx.restore();
    ctx.imageSmoothingEnabled = smooth;
  },

  // Eight facings off the same index the painted sheets use; the goat alone has a walk cycle, and
  // standing still is his own idle frame rather than a phase of the stride.
  draw(ctx, id, angle, moving, t, x) {
    const u = PIXEL_ASSETS.units[id]; if (!u) return false;
    const d = (Math.round(angle / (Math.PI / 4)) + 14) % 8;
    const f = moving && u.walk ? u.walk[d][Math.floor(t * 8 + (x || 0) * 0.05) % 4] : u.idle[d];
    this.frame(ctx, f, id);
    return true;
  },

  // The horns of whichever goat frame `draw` just put down, found off the atlas rather than
  // measured by hand: dark warm pixels in the top of the frame, kept only in blobs of `minBlob` or
  // more (the outline round his nose passes the colour test and fails the size one). Each blob is
  // one horn, with its own base — the centroid of its lowest rows, where it grows out of the head —
  // so a horn is scaled from its root and not from the middle of the frame. Cached per frame.
  hornsOf(f) {
    this.hornCache = this.hornCache || new Map();
    if (this.hornCache.has(f)) return this.hornCache.get(f);
    const w = f[2], h = f[3], c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(this.image, f[0], f[1], w, h, 0, 0, w, h);
    const D = x.getImageData(0, 0, w, h).data, on = new Uint8Array(w * h), seen = new Uint8Array(w * h), out = [];
    for (let i = 0; i < w * h; i++) { const r = D[i * 4], b = D[i * 4 + 2];
      on[i] = D[i * 4 + 3] > 200 && r < 72 && r >= 26 && r > b + 8 && i / w < h * 0.6 ? 1 : 0; }
    for (let s = 0; s < w * h; s++) {
      if (!on[s] || seen[s]) continue;
      const blob = [], st = [s]; seen[s] = 1;
      while (st.length) { const i = st.pop(); blob.push(i); const px = i % w, py = (i / w) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = px + dx, ny = py + dy, j = ny * w + nx;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h && on[j] && !seen[j]) { seen[j] = 1; st.push(j); } } }
      let y1 = 0, y0 = h; for (const i of blob) { const py = (i / w) | 0; y1 = Math.max(y1, py); y0 = Math.min(y0, py); }
      // A horn reaches up toward the top of the frame; the outline of a snout on a side view does not.
      if (blob.length < 14 || y0 > h * 0.3) continue;
      let bx = 0, by = 0, n = 0, tx = 0, ty = h;
      for (const i of blob) { const px = i % w, py = (i / w) | 0;
        if (py >= y1 - 2) { bx += px; by += py; n++; }
        if (py < ty) { ty = py; tx = px; } }
      const hc = document.createElement('canvas'); hc.width = w; hc.height = h;
      const hx = hc.getContext('2d'), id = hx.createImageData(w, h);
      for (const i of blob) for (let k = 0; k < 4; k++) id.data[i * 4 + k] = D[i * 4 + k];
      hx.putImageData(id, 0, 0);
      out.push({ canvas: hc, blob, base: [bx / n, by / n], tip: [tx, ty], y0, y1, w, h });
    }
    this.hornCache.set(f, out);
    return out;
  },
  // A horn painted over in one of the three looks the butt souls give him: `lava` (BOMB CHARGE)
  // or `venom` (SPLASH), each pixel taking its place on a ramp off how bright the original was and
  // how far toward the tip it is, so the shading of the drawn horn survives the new colour.
  hornSkin(horn, look) {
    horn.skins = horn.skins || {};
    if (horn.skins[look]) return horn.skins[look];
    const { w, h, blob, y0, y1 } = horn, c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), src = horn.canvas.getContext('2d').getImageData(0, 0, w, h).data, id = x.createImageData(w, h);
    const ramp = TUNING.goat.hornLooks[look].ramp.map((s) => [1, 3, 5].map((k) => parseInt(s.slice(k, k + 2), 16)));
    for (const i of blob) {
      // A crust with bright seams in it: a hashed pixel here and there lights up past the ramp it
      // sits on, which reads as cracks at this size rather than as a smooth gradient.
      const px = i % w, py = (i / w) | 0, nz = ((((px / 3) | 0) * 73856093 ^ ((py / 3) | 0) * 19349663) >>> 0) % 1000 / 1000;
      const lum = (src[i * 4] + src[i * 4 + 1] + src[i * 4 + 2]) / 3 / 72, tipward = 1 - (py - y0) / Math.max(1, y1 - y0);
      const v = clamp(lum * 0.3 + tipward * 0.45 + (nz > 0.8 ? 0.4 : 0), 0, 0.999) * (ramp.length - 1);
      const a = ramp[v | 0], b = ramp[(v | 0) + 1], t = v - (v | 0);
      for (let k = 0; k < 3; k++) id.data[i * 4 + k] = a[k] + (b[k] - a[k]) * t;
      id.data[i * 4 + 3] = 255;
    }
    x.putImageData(id, 0, 0);
    return (horn.skins[look] = c);
  },
  // A stag's antler grown out of one horn blob, on the art's own pixel grid (`antler.cell` atlas
  // px) so it reads as drawn with the goat and not pasted over him. The beam leaves the root along
  // the horn and bends outward — away from the other horn, or back over his body when both horns
  // are one behind the other on a side view — and each tine turns off it toward the sky. Shaded off
  // `ramp` (a look's ramp if he has one: lava antlers, venom antlers), dark root to pale tip, lit
  // on its upper edge and outlined like the sprite. Cached per horn per ramp; `pad` is how far past
  // the frame the canvas reaches, since an antler is bigger than the frame's own headroom.
  antlerOf(hn, spread, back, look) {
    const key = 'antler:' + (look || '');
    hn.skins = hn.skins || {};
    if (hn.skins[key]) return hn.skins[key];
    const A = TUNING.goat.hornLooks.antler, C = A.cell, [bx, by] = hn.base, [tx, ty] = hn.tip;
    const L = Math.max(6, Math.hypot(tx - bx, ty - by)), ux = (tx - bx) / L, uy = (ty - by) / L;
    const s = back || spread || 1;
    let nx = -uy, ny = ux; if (nx * s < 0) { nx = -nx; ny = -ny; }
    const B = L * A.len, pad = Math.ceil(B + A.w0) + C;
    const W = Math.ceil((hn.w + pad * 2) / C), Hh = Math.ceil((hn.h + pad * 2) / C);
    const val = new Float32Array(W * Hh).fill(-1);
    // Stamp a disc of radius `r` (atlas px) at (x, y), keeping the larger tipward value per cell.
    const stamp = (x, y, r, v) => {
      const cx = (x + pad) / C, cy = (y + pad) / C, rc = r / C;
      for (let j = Math.floor(cy - rc); j <= Math.ceil(cy + rc); j++) for (let i = Math.floor(cx - rc); i <= Math.ceil(cx + rc); i++) {
        if (i < 0 || j < 0 || i >= W || j >= Hh) continue;
        if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 > rc * rc + 0.15) continue;
        const k = j * W + i; if (val[k] < v) val[k] = v;
      } };
    // The beam as a quadratic curve: along the horn, then out by `bend`.
    const p1x = bx + ux * B * 0.55, p1y = by + uy * B * 0.55;
    const p2x = bx + (ux * (1 - A.bend) + nx * A.bend) * B, p2y = by + (uy * (1 - A.bend) + ny * A.bend) * B;
    const at = (q) => [(1 - q) ** 2 * bx + 2 * (1 - q) * q * p1x + q * q * p2x, (1 - q) ** 2 * by + 2 * (1 - q) * q * p1y + q * q * p2y];
    const tan = (q) => { const dx = 2 * (1 - q) * (p1x - bx) + 2 * q * (p2x - p1x), dy = 2 * (1 - q) * (p1y - by) + 2 * q * (p2y - p1y), l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
    const line = (x0, y0, dx, dy, len, r0, r1, v0, v1) => {
      const n = Math.ceil(len / (C * 0.4));
      for (let i = 0; i <= n; i++) { const q = i / n; stamp(x0 + dx * len * q, y0 + dy * len * q, (r0 + (r1 - r0) * q) / 2, v0 + (v1 - v0) * q); } };
    const n = Math.ceil(B / (C * 0.4));
    for (let i = 0; i <= n; i++) { const q = i / n, [x, y] = at(q); stamp(x, y, (A.w0 + (A.w1 - A.w0) * q) / 2, q * 0.85); }
    // Tines: each turns off the beam by `tineTurn`, whichever way points more at the sky.
    const turn = (dx, dy, a) => [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
    A.tines.forEach((q, i) => {
      const [x, y] = at(q), [dx, dy] = tan(q), l = turn(dx, dy, A.tineTurn), r = turn(dx, dy, -A.tineTurn), [ex, ey] = l[1] < r[1] ? l : r;
      line(x, y, ex, ey, B * A.tineLen[i], A.tineW, A.w1 * 0.7, 0.35 + q * 0.4, 1);
    });
    // The crown: the beam ends in a fork, one point either side of its own tip.
    const [ex, ey] = at(1), [dx, dy] = tan(1);
    for (const a of [A.tineTurn * 0.5, -A.tineTurn * 0.5]) { const [fx, fy] = turn(dx, dy, a); line(ex, ey, fx, fy, B * A.fork, A.w1, A.w1 * 0.6, 0.85, 1); }
    const ramp = (look ? TUNING.goat.hornLooks[look].ramp : A.ramp).map((c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)));
    const c = document.createElement('canvas'); c.width = W * C; c.height = Hh * C;
    const x = c.getContext('2d');
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i, v = val[k];
      const on = (a, b) => a >= 0 && b >= 0 && a < W && b < Hh && val[b * W + a] >= 0;
      if (v < 0) {
        if (on(i + 1, j) || on(i - 1, j) || on(i, j + 1) || on(i, j - 1)) { x.fillStyle = A.outline; x.fillRect(i * C, j * C, C, C); }
        continue;
      }
      const lit = on(i, j - 1) ? 0 : 0.18, dark = on(i, j + 1) ? 0 : -0.12;
      const r = clamp(v + lit + dark, 0, 0.999) * (ramp.length - 1), a = ramp[r | 0], b = ramp[(r | 0) + 1], f = r - (r | 0);
      x.fillStyle = `rgb(${[0, 1, 2].map((q) => Math.round(a[q] + (b[q] - a[q]) * f)).join(',')})`;
      x.fillRect(i * C, j * C, C, C);
    }
    return (hn.skins[key] = { canvas: c, pad });
  },
  // His horns as the souls on the headbutt have made them, over the frame `draw` just drew with
  // the same foot and scale: LONG HORNS makes each one an antler (`antlerOf`), BOMB CHARGE runs
  // lava down them and SPLASH venom, with a glow for the one and a drip for the other.
  horns(ctx, id, angle, moving, t, x, mods) {
    const H = TUNING.goat.hornLooks, antler = !!mods.antlers;
    const look = mods.bomb ? 'lava' : mods.splash ? 'venom' : null;
    if (!antler && !look) return;
    const u = PIXEL_ASSETS.units[id], d = (Math.round(angle / (Math.PI / 4)) + 14) % 8;
    const f = moving && u.walk ? u.walk[d][Math.floor(t * 8 + (x || 0) * 0.05) % 4] : u.idle[d];
    const k = PIXEL_EXTENT[id] / PIXEL_ASSETS.target, smooth = ctx.imageSmoothingEnabled;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.translate(-f[4] * k, -f[5] * k); ctx.scale(k, k);
    const all = this.hornsOf(f), mid = all.reduce((s, h) => s + h.base[0], 0) / (all.length || 1);
    // Which way is "back" on this facing: away from his nose. 0 on the straight front and back views.
    const back = [0, 1, 1, 1, 0, -1, -1, -1][d];
    for (const hn of all) {
      const [bx, by] = hn.base;
      if (look) { ctx.shadowColor = H[look].glow; ctx.shadowBlur = H[look].blur * (0.75 + 0.25 * Math.sin(t * 7 + bx)); }
      if (antler) {
        const spread = Math.abs(bx - mid) > 4 ? Math.sign(bx - mid) : 0, a = this.antlerOf(hn, spread, back, look);
        ctx.drawImage(a.canvas, -a.pad, -a.pad);
      } else ctx.drawImage(this.hornSkin(hn, look), 0, 0);
      ctx.shadowBlur = 0;
      // A drop gathering at the tip and letting go, once every `drip` seconds, out of step per horn.
      if (look === 'venom') {
        const p = ((t + bx * 0.13) % H.venom.drip) / H.venom.drip, [tx, ty] = hn.tip;
        ctx.fillStyle = H.venom.glow; ctx.globalAlpha = p < 0.6 ? p / 0.6 : 1 - (p - 0.6) / 0.4;
        ctx.fillRect(Math.round(tx), Math.round(ty + (p < 0.6 ? 1 : 1 + (p - 0.6) * 30)), 2, 2);
        ctx.globalAlpha = 1;
      }
    }
    ctx.imageSmoothingEnabled = smooth; ctx.restore();
  },

  // His face as the scream souls and THE ORACLE have made it, over the frame just drawn, in world px
  // off the foot (`PIXEL_FACE`). Drawn by hand, pixel by pixel (`PIXEL_FACE_ART`), on the sprite's
  // own grid: at this size a shape computed from an ellipse comes out as noise. Only what stays on
  // him is here; what leaves him — the drip, the steam, the flame — is `PaintedArt.goatFx`.
  face(ctx, angle, t, mods, g) {
    const d = (Math.round(angle / (Math.PI / 4)) + 14) % 8, P = PIXEL_FACE[d], F = TUNING.goat.face, A = PIXEL_FACE_ART;
    const view = d === 0 ? 'front' : d === 2 || d === 6 ? 'side' : 'diag', flip = d === 1 || d === 2;
    // THE FULL THROAT: the mouth drawn out into a horn's bell, a size up while he is shouting.
    if (mods.screamStun && P.mouth) {
      const T = F.throat, s = A.throat[view][(g.screaming || 0) > 0 ? 1 : 0];
      this.sprite(ctx, s, P.mouth[0], P.mouth[1], { t: T.tube, w: T.rim, i: T.inside }, flip, T.edge);
    }
    // VENOM SPIT: a froth at his lips, pixel bubbles rising out of it and popping out of step.
    if (mods.spit && P.mouth) {
      const V = F.foam, fr = A.foam[Math.floor(t * V.rate) % A.foam.length];
      this.sprite(ctx, fr, P.mouth[0], P.mouth[1], { g: V.color, d: V.dark }, flip, V.dark);
    }
    // THE ORACLE: a third eye, upright, between the two he was born with. It blinks on its own.
    if (mods.oracle && P.brow) {
      const E = F.eye, shut = (t % E.blink) < 0.14, s = shut ? A.eyeShut : A.eye[view === 'side' ? 'side' : 'front'];
      this.sprite(ctx, s, P.brow[0], P.brow[1], { v: E.iris, p: E.pupil, h: E.white, o: E.edge }, flip, shut ? null : E.edge);
    }
  },
  // One hand-drawn piece (`{ rows, at }`: a character grid and the cell of it that lands on the
  // point), mirrored with `flip`, painted on the grid of `face.cell` world px and ringed in `edge`.
  sprite(ctx, s, x, y, pal, flip, edge) {
    const C = TUNING.goat.face.cell, rows = s.rows, w = rows[0].length, h = rows.length;
    const i0 = Math.floor(x / C) - (flip ? w - 1 - s.at[0] : s.at[0]), j0 = Math.floor(y / C) - s.at[1];
    const at = (i, j) => { if (i < 0 || j < 0 || i >= w || j >= h) return null; const c = rows[j][flip ? w - 1 - i : i]; return c === '.' ? null : pal[c]; };
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
      const c = at(i, j) || (edge && (at(i + 1, j) || at(i - 1, j) || at(i, j + 1) || at(i, j - 1)) ? edge : null);
      if (c) { ctx.fillStyle = c; ctx.fillRect((i0 + i) * C, (j0 + j) * C, C, C); }
    }
  },

  // The allies were drawn once, facing SE; turned to face left they are mirrored, which is fine for
  // an animal with no mark on one side.
  icon(ctx, id, flip, scale = 1) {
    const u = PIXEL_ASSETS.units[id]; if (!u) return false;
    this.frame(ctx, u.idle[0], id, scale, flip);
    return true;
  },
};
PIXEL_ART.init();

// The environment half of the same pass (output/pixel-environment-2026-09-23, packed by
// tools/pack-pixel-env.ps1 into js/pixel-env-assets.js): the furniture of a room, the things that
// stand in a cave, flat litter for the floor, and the floor and wall swatches of every level.
// Collision never reads any of it:
// a sprite is only ever the picture of a prop whose radius and tile were decided somewhere else.
const PIXEL_ENV_ID = {
  crate: 'room-props-01', barrel: 'room-props-02', hay: 'room-props-03', table: 'room-props-04',
  pillar: 'room-props-05', brazier: 'room-props-07', planks: 'room-props-09', rubble: 'room-props-10',
  straw: 'room-props-11', rug: 'room-props-12', boulder: 'cave-props-01', stalagmites: 'cave-props-02',
  shrooms: 'cave-props-05', crystals: 'cave-props-06', pebbles: 'cave-props-09', moss: 'cave-props-10',
  puddle: 'cave-props-11', crack: 'cave-props-12',
};
// Weighted swatch lists. The cave is mostly its two plain stones, so the damp, mossy and dark ones
// read as places rather than as a checkerboard; the trip is the mushroom soil it was painted for.
const PIXEL_FLOORS = {
  cave: ['floors-09', 'floors-09', 'floors-09', 'floors-10', 'floors-09', 'floors-10', 'floors-09', 'floors-10', 'floors-13', 'floors-14', 'floors-11'],
  trip: ['floors-16', 'floors-16', 'floors-16', 'floors-16', 'floors-16', 'floors-11'],
};
// A swatch is multiplied by the level's own floor colour. The swatches are one pale grey for every
// cave, and a cave reads as a dark floor under pale rock: untinted, the floor went the rock's grey
// and the rock stopped reading as rock. `PIXEL_FLOOR_LIFT` brightens the colour it is multiplied by,
// since the swatch's own darkness is already on top of it.
const PIXEL_FLOOR_LIFT = 1.25;
// The swatches a level's rooms are built of, by its canon: the floor of an ordinary room (a list,
// picked per tile off a hash), the boards of a store room, and the cap and brick face of every wall.
// Each is multiplied by the level's own colour (`floor`/`floorAlt`, `wallTop`/`wall`) brightened by
// `lift`, so a level keeps the palette it was tuned in and only gains the texture.
const PIXEL_ROOMS = {
  lift: 1.6,
  wall: { top: 'floors-04', face: 'floors-08' },
  stone: { floor: ['floors-01', 'floors-01', 'floors-02'], boards: 'floors-06' },
  fire: { floor: ['floors-03'], boards: 'floors-06' },
  line: { floor: ['floors-03', 'floors-03', 'floors-12'], boards: 'floors-06' },
  open: { floor: ['floors-07'], boards: 'floors-05' },
  funnel: { floor: ['floors-04'], boards: 'floors-06' },
  drop: { floor: ['floors-05'], boards: 'floors-05' },
  niche: { floor: ['floors-02', 'floors-01', 'floors-01'], boards: 'floors-06' },
  hollow: { floor: ['floors-09', 'floors-10'], boards: 'floors-06' },
};
// Litter is a few tiles in a hundred: at more than that a floor stops being a floor.
const PIXEL_LITTER = {
  room: { rate: 0.022, ids: ['planks', 'rubble', 'straw', 'straw', 'rubble', 'rug'], size: 24 },
  cave: { rate: 0.035, ids: ['pebbles', 'pebbles', 'moss', 'puddle', 'crack', 'moss'], size: 24 },
};

const PIXEL_ENV = {
  image: null,
  init() {
    if (typeof PIXEL_ENV_ASSETS === 'undefined') return;
    this.image = new Image(); this.image.src = PIXEL_ENV_ASSETS.src;
  },
  get ready() { return !!this.image && this.image.naturalWidth > 0; },
  // `w` world px wide, height off the sprite's own proportions; (x, y) is where `ay` of its height
  // lands — 1 is its foot, 0.5 its middle. Smoothing on: the atlas is two to three texels a screen
  // pixel here, and point-sampled at that ratio the outline crawls every time the camera moves.
  draw(ctx, name, x, y, w, ay = 1) {
    const f = PIXEL_ENV_ASSETS.items[PIXEL_ENV_ID[name] || name]; if (!f) return 0;
    const h = w * f[3] / f[2];
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.image, f[0], f[1], f[2], f[3], x - w / 2, y - h * ay, w, h);
    ctx.imageSmoothingEnabled = smooth;
    return h;
  },
  floor(ctx, list, tx, ty, tint) {
    const ids = PIXEL_FLOORS[list], f = PIXEL_ENV_ASSETS.items[ids[Math.floor(farHash(tx * 7 + 3, ty * 5 - 1) * ids.length)]];
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.image, f[0], f[1], f[2], f[3], tx * TILE, ty * TILE, TILE, TILE);
    ctx.imageSmoothingEnabled = smooth;
    if (tint) {
      const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = this.lift(tint); ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      ctx.globalCompositeOperation = op;
    }
  },
  lift(c, by = PIXEL_FLOOR_LIFT) {
    const cache = this.lifted || (this.lifted = {}), key = c + by;
    if (cache[key]) return cache[key];
    const n = parseInt(c.slice(1), 16), k = (v) => Math.min(255, Math.round(v * by));
    return (cache[key] = `rgb(${k(n >> 16)},${k((n >> 8) & 255)},${k(n & 255)})`);
  },
  // A piece of litter on a tile, or nothing. Off a hash of the tile, so it is the same floor every frame.
  litter(ctx, list, tx, ty) {
    const L = PIXEL_LITTER[list];
    if (farHash(tx * 29 + 11, ty * 31 - 5) > L.rate) return;
    const name = L.ids[Math.floor(farHash(tx - 13, ty + 17) * L.ids.length)];
    this.draw(ctx, name, (tx + 0.5) * TILE, (ty + 0.5) * TILE, name === 'rug' ? L.size * 1.5 : L.size, 0.5);
  },
};
PIXEL_ENV.init();
