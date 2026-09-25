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
  chicken: 22, ratogre: 70, ogre: 66, mouse: 26, goose: 28, raven: 22, turtle: 28, 'sheep-pet': 32,
};
// The painted slot names this pass fills. `sheep` is the goat's old slot name, not a sheep.
const PIXEL_UNIT = {
  sheep: 'goat', clubman: 'clubman', brute: 'brute', mage: 'mage', hound: 'hound', hunter: 'hunter',
  butcher: 'butcher', wraith: 'wraith', chicken: 'chicken', ratogre: 'ratogre', ogre: 'ogre',   // the ogre draws off js/ogre-pixels.js, not the atlas
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

// A second look, held beside the first so the two can be compared in the running game (the ART tab,
// or `#aspacked` for all of it off): nothing of the packed art or the tuned palettes is replaced. `on` is the art pass as
// a whole — the seer's staff in witchfire's own colours, windups in amber cells, the Yard's floor and
// the cave's rock a step darker, the milk grass gold at the tips — and `hunter` / `clubman` pick a
// study off `PIXEL_STUDY`, 0 being the art as packed. All of it is the game's look since 25 Sep 2026
// (the user saw each before/after and took it): the pass on, the hunter in BROWN + BAND (his own
// brown, the cult's red only on the band, the quill and the sign), the clubman SLIM, the floors and
// wall faces as sheets. `#aspacked` starts the page with every one of them off.
const ART_PASS = {
  on: false, hunter: 7, clubman: 1, floors: true,
  // A level's `artPass` colours in place of its own, and back: the tuned ones are kept on the level
  // the first time it is switched, so switching off is exact.
  set(on) {
    this.on = !!on;
    for (const def of LEVELS) {
      if (!def.artPass) continue;
      def.asPacked ||= Object.fromEntries(Object.keys(def.artPass).map((k) => [k, def[k]]));
      Object.assign(def, this.on ? def.artPass : def.asPacked);
    }
  },
};
// Five-step ramps, dark to light, each hue-shifted: the shadow leans cool and the light leans warm, so
// a cloth reads painted rather than as one hue slid from black to white.
const RAMP = {
  cult: ['#3a0c1c', '#6f1422', '#a8212a', '#cf3a2e', '#e25a3b'],
  crimson: ['#20070f', '#43101e', '#6a1728', '#922437', '#b8424b'],
  brown: ['#24130c', '#43271a', '#654028', '#86593a', '#a87a52'],
  slate: ['#10161f', '#1f3142', '#31506a', '#4a7289', '#7aa0a6'],
  loden: ['#12170d', '#232d18', '#384627', '#526537', '#76874f'],
  pale: ['#4b3f30', '#7d6c54', '#a99675', '#cdbb95', '#e8dbb6'],
  pitch: ['#0c0b0f', '#19171d', '#28252d', '#39353f', '#504a56'],
  steel: ['#1d2f3d', '#35566b', '#5a8196', '#86aab5', '#b9d3d2'],
  witch: ['#4b35b8', '#7d5cff', '#bfe6ff', '#f6fcff'],   // CombatFX.bands(true) less its darkest
};
// The studies the ART tab switches between, each a recipe over one packed unit: `parts` recolours a
// class of its pixels (`STUDY_PARTS`) onto a ramp, keeping the share of light each had, cut to the
// ramp's steps; `slim` takes that share of columns out of the body. `rule` is the colour idea the
// study tests, in a line, shown on the tab and on the study sheet.
const PIXEL_STUDY = {
  hunter: [
    { name: 'AS PACKED', rule: 'one brown, hat to boot: analogous to every warm floor, so he wears the floor he stands on' },
    { name: 'CULT ACCENT', rule: '60-30-10: the brown coat stays, the hat takes the cult\'s red, the accent that says whose man he is', parts: { hat: RAMP.cult, coat: RAMP.brown } },
    { name: 'COMPLEMENT', rule: 'complementary: slate blue against floors that are all orange-brown; the hat stays brown', parts: { hat: RAMP.brown, coat: RAMP.slate } },
    { name: 'SPLIT', rule: 'split-complementary: a loden coat under the cult\'s red hat, the complement pair worn on him', parts: { hat: RAMP.cult, coat: RAMP.loden } },
    { name: 'VALUE', rule: 'value contrast: a pale duster on dark floors under a black hat, and too near the goat\'s own cream', parts: { hat: RAMP.pitch, coat: RAMP.pale } },
    { name: 'ONE FAMILY', rule: 'monochrome faction: the clubman\'s red taken down to crimson under a black hat, every cultist red and told apart by shape', parts: { hat: RAMP.pitch, coat: RAMP.crimson } },
    { name: 'STEEL + RED', rule: 'both at once: a steel-blue coat light enough to stand off the dark floors by value and far enough from brown to stand off them by hue, under the cult\'s red hat', parts: { hat: RAMP.cult, coat: RAMP.steel } },
    { name: 'BROWN + BAND', rule: 'the hunter\'s own brown on clean hue-shifted steps, and the cult\'s red kept small: a band round the hat, a quill in it, a sign between the shoulders — a man who means not to be seen', parts: { hat: 'own', coat: 'own' }, marks: ['hatband', 'feather', 'sigil'] },
  ],
  clubman: [
    { name: 'AS PACKED', rule: 'the packed red robe, as wide as the atlas drew him' },
    { name: 'SLIM', rule: 'a seventh of his width taken out of the robe, column by column: a lighter man, for one who flies off a single butt', slim: 0.14 },
    { name: 'SLIM + RED RAMP', rule: 'slim, and the robe cut to five reds that lean crimson in shadow and orange in the light', slim: 0.14, parts: { robe: RAMP.cult } },
  ],
  // Under the art pass alone: the seer's flame and eyes in the bands witchfire burns in.
  mage: [{ name: 'AS PACKED' }, { name: 'WITCHFIRE', parts: { flame: RAMP.witch } }],
};
// What each part of a packed unit is, off its colour (hue in degrees, s and v 0..1) and where it sits in
// its frame (`fy`, 0 at the top of the silhouette, 1 at the soles). The hunter's hat is the top of him:
// the brim comes down to a little over a third of his height on every facing.
const STUDY_PARTS = {
  hunter: (h, s, v, fy) => h >= 8 && h <= 45 && s >= 0.22 && v >= 0.1 && v <= 0.8 ? (fy < 0.37 ? 'hat' : 'coat') : null,
  clubman: (h, s, v) => (h <= 14 || h >= 340) && s >= 0.4 && v >= 0.15 ? 'robe' : null,
  mage: (h, s, v) => h >= 165 && h <= 215 && s >= 0.3 && v >= 0.35 ? 'flame' : null,
};
const STUDY = (() => {
  const hsv = (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn; let h = 0;
    if (dl) h = mx === r ? ((g - b) / dl + 6) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4;
    return [h * 60, mx ? dl / mx : 0, mx / 255];
  };
  const rgb = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  // Each class keeps the spread of light it had: its pixels ranked by brightness and cut into the
  // ramp's steps at fixed shares, so a fold stays where the packed art put it and the soft AI shading
  // lands on five clean values. The brightness ranked is each pixel's averaged with its own class
  // round it (`SOFT` texels each way): the packed art is grainy, and ranked raw that grain came out
  // as a speckle of every step instead of a fold of one.
  const SOFT = 2;
  function recolour(A, W, frames, x0, y0, classOf, parts) {
    const hits = [];
    for (const f of frames) {
      const fx = f[0] - x0, fy = f[1] - y0, fw = f[2], fh = f[3]; let top = fh, bot = 0;
      for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) if (A[((fy + j) * W + fx + i) * 4 + 3]) { top = Math.min(top, j); bot = Math.max(bot, j); }
      const cls = new Array(fw * fh).fill(null), luma = new Float32Array(fw * fh);
      for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) {
        const p = ((fy + j) * W + fx + i) * 4; if (!A[p + 3]) continue;
        const [h, s, v] = hsv(A[p], A[p + 1], A[p + 2]), k = classOf(h, s, v, (j - top) / Math.max(1, bot - top));
        if (k && parts[k]) { cls[j * fw + i] = k; luma[j * fw + i] = 0.299 * A[p] + 0.587 * A[p + 1] + 0.114 * A[p + 2]; }
      }
      for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) {
        const k = cls[j * fw + i]; if (!k) continue;
        let sum = 0, n = 0;
        for (let v = Math.max(0, j - SOFT); v <= Math.min(fh - 1, j + SOFT); v++) for (let u = Math.max(0, i - SOFT); u <= Math.min(fw - 1, i + SOFT); u++) if (cls[v * fw + u] === k) { sum += luma[v * fw + u]; n++; }
        hits.push([((fy + j) * W + fx + i) * 4, k, sum / n]);
      }
    }
    for (const k in parts) {
      const mine = hits.filter((q) => q[1] === k).sort((a, b) => a[2] - b[2]);
      const n = parts[k] === 'own' ? 5 : parts[k].length, cuts = n === 5 ? [0.1, 0.32, 0.7, 0.92] : [0.35, 0.7, 0.9];
      const bin = mine.map((q, i) => { let b = 0; while (b < cuts.length && i / mine.length >= cuts[b]) b++; return b; });
      const ramp = parts[k] === 'own' ? ownRamp(A, mine, bin) : parts[k].map(rgb);
      mine.forEach((q, i) => { const c = ramp[bin[i]]; A[q[0]] = c[0]; A[q[0] + 1] = c[1]; A[q[0] + 2] = c[2]; });
    }
  }
  // `'own'` in place of a ramp: the part's own colours, cut to five steps — each step the mean of the
  // packed pixels that fall in it — and then hue-shifted, the shadow a little toward red-violet and
  // the light a little toward yellow. The packed colour stays; the mush of in-between shades goes.
  const SHIFT = [[-7, 1.1], [-3, 1.05], [0, 1], [3, 0.98], [5, 0.95]];   // [hue degrees, saturation x] per step
  function ownRamp(A, mine, bin) {
    const sum = [0, 1, 2, 3, 4].map(() => [0, 0, 0, 0]);
    mine.forEach((q, i) => { const s = sum[bin[i]]; s[0] += A[q[0]]; s[1] += A[q[0] + 1]; s[2] += A[q[0] + 2]; s[3]++; });
    return sum.map((s, b) => {
      const [h, sa, v] = hsv(s[0] / Math.max(1, s[3]), s[1] / Math.max(1, s[3]), s[2] / Math.max(1, s[3]));
      return fromHsv((h + SHIFT[b][0] + 360) % 360, Math.min(1, sa * SHIFT[b][1]), v);
    });
  }
  const fromHsv = (h, s, v) => {
    const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c, k = Math.floor(h / 60) % 6;
    const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][k];
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  };
  // Takes `share` of a frame's silhouette width out as whole columns — the ones whose two neighbours
  // are most alike, so the seam cannot be seen — none within two of another, and only from the middle
  // of the body, the edges being where the outline is. Every pixel left is a packed pixel, unscaled;
  // the column under his feet stays where it was.
  function slim(A, W, f, x0, y0, share) {
    const fx = f[0] - x0, fy = f[1] - y0, w = f[2], h = f[3], at = (i, j) => ((fy + j) * W + fx + i) * 4;
    let L = w, R = -1;
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) if (A[at(i, j) + 3]) { L = Math.min(L, i); R = Math.max(R, i); break; }
    if (R - L < 8) return;
    const span = R - L + 1, n = Math.round(span * share), a = Math.max(1, L + Math.floor(span * 0.18)), b = Math.min(w - 2, R - Math.floor(span * 0.18)), cost = [];
    for (let i = a; i <= b; i++) {
      let e = 0;
      for (let j = 0; j < h; j++) { const p = at(i - 1, j), q = at(i + 1, j); for (let c = 0; c < 4; c++) e += Math.abs(A[p + c] - A[q + c]); }
      cost.push([i, e]);
    }
    cost.sort((p, q) => p[1] - q[1]);
    const cut = [];
    for (const [i] of cost) { if (cut.length >= n) break; if (cut.every((c) => Math.abs(c - i) > 2)) cut.push(i); }
    const keep = []; for (let i = 0; i < w; i++) if (!cut.includes(i)) keep.push(i);
    const foot = Math.round(f[4]), shift = foot - keep.filter((i) => i < foot).length;
    const cols = keep.map((i) => { const c = new Uint8ClampedArray(h * 4); for (let j = 0; j < h; j++) c.set(A.subarray(at(i, j), at(i, j) + 4), j * 4); return c; });
    for (let j = 0; j < h; j++) A.fill(0, at(0, j), at(0, j) + w * 4);
    cols.forEach((c, k) => { const i = k + shift; if (i >= 0 && i < w) for (let j = 0; j < h; j++) A.set(c.subarray(j * 4, j * 4 + 4), at(i, j)); });
  }
  // Small marks on the hunter, found off his packed pixels before any recolour and painted after it:
  // `hatband` is the dark ring the packed hat already has where the crown meets the brim, taken to
  // the cult's red (only its long runs, so a dark pixel at the brim's edge is not swept in); `feather`
  // a red quill tucked into the band on his left; `sigil` the cult's small triangle between his
  // shoulders, on the views from behind. `CELL` is one pixel of the packed art, three atlas texels,
  // so a mark lands on the art's own grid. Returns [index, colour] pairs.
  const CELL = 3;
  function marks(A, W, frames, x0, y0, list) {
    const out = [], on = new Set(list);
    frames.forEach((f, n) => {
      const d = n % 8, fx = f[0] - x0, fy = f[1] - y0, w = f[2], h = f[3], at = (i, j) => ((fy + j) * W + fx + i) * 4;
      const op = (i, j) => i >= 0 && j >= 0 && i < w && j < h && A[at(i, j) + 3] > 0;
      let top = h, bot = 0;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (op(i, j)) { top = Math.min(top, j); bot = Math.max(bot, j); }
      const part = (i, j) => { const p = at(i, j); if (!op(i, j)) return null; const [hh, s, v] = hsv(A[p], A[p + 1], A[p + 2]); return STUDY_PARTS.hunter(hh, s, v, (j - top) / Math.max(1, bot - top)); };
      const luma = (i, j) => { const p = at(i, j); return 0.299 * A[p] + 0.587 * A[p + 1] + 0.114 * A[p + 2]; };
      const key = (i, j) => j * w + i;
      let hy0 = h, hy1 = 0; const hat = [];
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (part(i, j) === 'hat') { hat.push([i, j]); hy0 = Math.min(hy0, j); hy1 = Math.max(hy1, j); }
      // The band follows the packed ring column by column. The ring is a valley: a dark run with the
      // light crown above it and the light brim below, both still hat — the brim's own dark edge has
      // nothing of the hat under it and is passed over. In each column the darkest such spot (averaged
      // a texel round) is taken, with the whole dark run round it, and the line is evened out over
      // five columns so it runs as one ribbon.
      const isHat = new Set(hat.map(([i, j]) => key(i, j))), soft = (i, j) => {
        let s = 0, n = 0; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) if (isHat.has(key(i + u, j + v))) { s += luma(i + u, j + v); n++; } return n ? s / n : 255; };
      const lum = hat.map(([i, j]) => luma(i, j)).sort((a, b) => a - b), mid = lum[lum.length >> 1], dark = mid * 0.8;
      const lit = (i, j) => isHat.has(key(i, j)) && soft(i, j) > dark;
      const row = new Map();
      for (let i = 0; i < w; i++) {
        let best = null;
        for (let j = hy0 + CELL; j <= hy1 - CELL; j++) {
          if (!isHat.has(key(i, j))) continue;
          const l = soft(i, j); if (l >= dark || (best && l >= best[1])) continue;
          let a = j, b = j; while (a > hy0 && isHat.has(key(i, a - 1)) && soft(i, a - 1) < dark) a--; while (b < hy1 && isHat.has(key(i, b + 1)) && soft(i, b + 1) < dark) b++;
          if (b - a + 1 <= CELL * 3 && lit(i, a - 2) && lit(i, b + 2)) best = [j, l, a, b];
        }
        if (best) row.set(i, best);
      }
      const cols = [...row.keys()].sort((a, b) => a - b), band = new Set();
      for (const i of cols) {
        const near = cols.filter((c) => Math.abs(c - i) <= 2).map((c) => row.get(c)), mid2 = (k) => near.map((r) => r[k]).sort((p, q) => p - q)[near.length >> 1];
        for (let j = mid2(2); j <= mid2(3); j++) if (isHat.has(key(i, j))) band.add(key(i, j));
      }
      if (band.size < CELL * 6) return;
      if (on.has('hatband')) for (const s of band) { const i = s % w, j = (s / w) | 0; out.push([at(i, j), band.has(key(i, j - 1)) ? RAMP.cult[1] : RAMP.cult[2]]); }
      if (on.has('feather')) {
        // his left: the right of the picture from the front, the left from behind
        const dir = d === 0 || d === 1 || d === 2 || d === 7 ? 1 : -1;
        let end = null;
        for (const s of band) { const i = s % w, j = (s / w) | 0; if (!end || (dir > 0 ? i > end[0] : i < end[0]) || (i === end[0] && j < end[1])) end = [i, j]; }
        const [ei, ej] = end, len = CELL * 4;
        for (let t = 0; t <= len; t++) {
          const cx = Math.round(ei - dir * (CELL + t * 0.3)), cy = ej - t, c = t > len - CELL ? RAMP.cult[3] : t > CELL ? RAMP.cult[2] : RAMP.cult[1];
          for (let u = 0; u < CELL - 1; u++) if (part(cx - dir * u, cy) === 'hat') out.push([at(cx - dir * u, cy), c]);
        }
      }
      if (on.has('sigil') && (d === 3 || d === 4 || d === 5)) {
        const j0 = Math.round(top + (bot - top) * 0.5);
        let a = w, b = -1; for (let i = 0; i < w; i++) if (op(i, j0)) { a = Math.min(a, i); b = Math.max(b, i); }
        const ci = Math.round((a + b) / 2 - CELL * 1.5);
        ['.r.', 'rrr'].forEach((row, rj) => [...row].forEach((ch, ri) => { if (ch !== 'r') return;
          for (let v = 0; v < CELL; v++) for (let u = 0; u < CELL; u++) { const i = ci + ri * CELL + u, j = j0 + rj * CELL + v; if (part(i, j) === 'coat') out.push([at(i, j), RAMP.cult[2]]); } }));
      }
    });
    return out;
  }
  return { recolour, slim, marks, rgb };
})();

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
  // The study a unit is drawn in now (`ART_PASS`), or null for the packed atlas. A study is baked once
  // off the hardened atlas into a canvas holding only that unit's box; `ox`, `oy` are where that box
  // sat on the atlas, so the frames keep their packed numbers.
  studyOf(id) {
    const n = id === 'hunter' ? ART_PASS.hunter : id === 'clubman' ? ART_PASS.clubman : id === 'mage' && ART_PASS.on ? 1 : 0;
    return n && typeof HTMLCanvasElement !== 'undefined' && this.image instanceof HTMLCanvasElement ? this.study(id, n) : null;
  },
  study(id, n) {
    this.studies ||= new Map();
    const key = id + n; let s = this.studies.get(key); if (s) return s;
    const u = PIXEL_ASSETS.units[id], R = PIXEL_STUDY[id][n], frames = [...u.idle, ...(u.walk || []).flat()];
    let x0 = 1e9, y0 = 1e9, x1 = 0, y1 = 0;
    for (const f of frames) { x0 = Math.min(x0, f[0]); y0 = Math.min(y0, f[1]); x1 = Math.max(x1, f[0] + f[2]); y1 = Math.max(y1, f[1] + f[3]); }
    const c = document.createElement('canvas'); c.width = x1 - x0; c.height = y1 - y0;
    const x = c.getContext('2d'); x.drawImage(this.image, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height);
    const marks = R.marks ? STUDY.marks(d.data, c.width, frames, x0, y0, R.marks) : [];
    if (R.parts) STUDY.recolour(d.data, c.width, frames, x0, y0, STUDY_PARTS[id], R.parts);
    for (const [p, col] of marks) d.data.set(STUDY.rgb(col), p);
    if (R.slim) for (const f of frames) STUDY.slim(d.data, c.width, f, x0, y0, R.slim);
    x.putImageData(d, 0, 0);
    s = { img: c, ox: x0, oy: y0 }; this.studies.set(key, s); return s;
  },
  // The unit a painted slot draws as, or null before the atlas has loaded or for a slot with no art.
  unit(key) { return this.ready ? PIXEL_UNIT[key] || null : null; },

  // One frame, foot at the origin, `scale` extra on top of the unit's own size. Smoothing off: at
  // this camera the atlas is close to one texel a screen pixel and a blur only muddies the outline.
  frame(ctx, f, id, scale = 1, flip = false) {
    const k = PIXEL_EXTENT[id] / PIXEL_ASSETS.target * scale, s = this.studyOf(id);
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    if (flip) { ctx.save(); ctx.scale(-1, 1); }
    if (s) ctx.drawImage(s.img, f[0] - s.ox, f[1] - s.oy, f[2], f[3], -f[4] * k, -f[5] * k, f[2] * k, f[3] * k);
    else ctx.drawImage(this.image, f[0], f[1], f[2], f[3], -f[4] * k, -f[5] * k, f[2] * k, f[3] * k);
    if (flip) ctx.restore();
    ctx.imageSmoothingEnabled = smooth;
  },

  // Eight facings off the same index the painted sheets use; the goat alone has a walk cycle, and
  // standing still is his own idle frame rather than a phase of the stride.
  draw(ctx, id, angle, moving, t, x) {
    const u = PIXEL_ASSETS.units[id]; if (!u) return false;
    // `% 8` before the + 14: an angle past about -11 rad (a heading nobody wrapped) made it negative.
    const [d, flip] = this.facing(id, angle);
    const f = moving && u.walk ? u.walk[d][Math.floor(t * 8 + (x || 0) * 0.05) % 4] : u.idle[d];
    this.frame(ctx, f, id, 1, flip);
    return true;
  },
  // Which packed facing a heading draws, and whether mirrored. The goat's up-right view was packed
  // with both horns swept forward over his nose — every other view sweeps them back — which caught
  // the eye on every run toward the top right (playtest, 25 Sep 2026). His up-left view mirrored is
  // that view drawn right: the back views carry no mark on one side, and `PIXEL_FACE` / `PIXEL_NECK`
  // were measured mirror-true between the two, so nothing hung on him moves.
  facing(id, angle) {
    const d = (Math.round(angle / (Math.PI / 4)) % 8 + 14) % 8, m = PIXEL_MIRROR[id] && PIXEL_MIRROR[id][d];
    return m === undefined ? [d, false] : [m, true];
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
    const u = PIXEL_ASSETS.units[id], [d, flip] = this.facing(id, angle);
    const f = moving && u.walk ? u.walk[d][Math.floor(t * 8 + (x || 0) * 0.05) % 4] : u.idle[d];
    const k = PIXEL_EXTENT[id] / PIXEL_ASSETS.target, smooth = ctx.imageSmoothingEnabled;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (flip) ctx.scale(-1, 1);   // the frame `draw` mirrored (`facing`): the horns go with it
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
    const d = (Math.round(angle / (Math.PI / 4)) % 8 + 14) % 8, P = PIXEL_FACE[d], F = TUNING.goat.face, A = PIXEL_FACE_ART;
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
if (typeof location !== 'undefined') {
  if (/aspacked/.test(location.hash)) Object.assign(ART_PASS, { hunter: 0, clubman: 0, floors: false });
  else ART_PASS.set(true);
}

// Facings drawn as another facing mirrored, per unit (`PIXEL_ART.facing`): the goat's up-right (5)
// is his up-left (3) turned over, since the packed 5 had its horns swept the wrong way.
const PIXEL_MIRROR = { goat: { 5: 3 } };

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
// The swatches a level's rooms are built of, by its canon: the floor of an ordinary room (one
// swatch), the boards of a store room, and the cap and brick face of every wall.
// Each is multiplied by the level's own colour (`floor`, `wallTop`/`wall`) brightened by
// `lift`, so a level keeps the palette it was tuned in and only gains the texture.
// THE FLOORS AS SHEETS (25 Sep 2026, `ART_PASS.floors`, on by default). A swatch stamped once a tile
// repeated the same stones in every square, and its lines stopped dead at the square's edge (or, laid
// mirrored, made a kaleidoscope): "the pattern is strange". Like the wall's cap (`wallCap`), a
// floor is now one sheet `N` tiles square, seamless at its borders, laid in world space — each tile
// shows its part of it — painted in the swatch's own colours (its mortar, its stone, its light) and
// in the kind of floor that swatch was: `sheet` on each canon in `PIXEL_ROOMS`. Render only.
const FLOOR_SHEET = (() => {
  const N = 6, T = 64, S = N * T;
  const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const seedOf = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const mul = (a, k) => a.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
  // The swatch's darkest, middle and lightest pixels, each averaged: the mortar, the stone, the light.
  function palette(src) {
    const d = src.getContext('2d').getImageData(0, 0, src.width, src.height).data, px = [];
    for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2], 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]]);
    px.sort((a, b) => a[3] - b[3]);
    const avg = (a, b) => { const s = [0, 0, 0], q = px.slice(Math.floor(px.length * a), Math.ceil(px.length * b)); for (const p of q) for (let k = 0; k < 3; k++) s[k] += p[k] / q.length; return s.map(Math.round); };
    return { dark: avg(0, 0.12), base: avg(0.3, 0.7), light: avg(0.9, 1) };
  }
  class Sheet {
    constructor() { this.d = new Uint8ClampedArray(S * S * 4); }
    set(x, y, c) { x = ((x % S) + S) % S; y = ((y % S) + S) % S; const p = (y * S + x) * 4; this.d[p] = c[0]; this.d[p + 1] = c[1]; this.d[p + 2] = c[2]; this.d[p + 3] = 255; }
    rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  }
  // One stone: its body lit along the top and left and in shade along the bottom and right, its
  // corners taken back into the joint (`round` pixels), a few grains, now and then a crack.
  function stone(s, P, r, x, y, w, h, k, round, grain = 1) {
    // Kept soft on purpose: a floor is what everything stands on, so its edges are a step, not a line.
    const body = mul(P.base, k), joint = P.joint;
    s.rect(x, y, w, h, body);
    s.rect(x, y, w, 1, mix(body, P.light, 0.3)); s.rect(x, y + 1, 1, h - 1, mix(body, P.light, 0.15));
    s.rect(x, y + h - 1, w, 1, mix(body, P.dark, 0.3)); s.rect(x + w - 1, y, 1, h - 1, mix(body, P.dark, 0.2));
    for (let c = 0; c < round; c++) for (let q = 0; q <= round - 1 - c; q++) { s.set(x + c, y + q, joint); s.set(x + w - 1 - c, y + q, joint); s.set(x + c, y + h - 1 - q, joint); s.set(x + w - 1 - c, y + h - 1 - q, joint); }
    for (let g = 0; g < Math.floor(w * h / 110 * grain); g++) s.set(x + 2 + Math.floor(r() * (w - 4)), y + 2 + Math.floor(r() * (h - 4)), r() < 0.6 ? mix(body, P.dark, 0.22) : mix(body, P.light, 0.18));
    if (w > 14 && h > 14 && r() < 0.16) { let cx = x + 3 + Math.floor(r() * (w - 6)), cy = y + 3 + Math.floor(r() * (h - 6)); const dx = r() < 0.5 ? 1 : -1;
      for (let t = 0; t < 4 + Math.floor(r() * 5); t++) { s.set(cx, cy, mix(body, P.dark, 0.6)); if (r() < 0.6) cx += dx; cy++; if (cx <= x + 1 || cx >= x + w - 2 || cy >= y + h - 2) break; } }
  }
  // Courses of blocks, `heights` tall and `lens` long, every course started at its own offset and
  // wrapped round the sheet's edge, the last course and the last block cut to close the sheet.
  function courses(s, P, r, heights, lens, gap, round, grain) {
    s.rect(0, 0, S, S, P.joint);
    const tones = [0.93, 0.97, 1, 1.03, 1.07], pick = (a) => a[Math.floor(r() * a.length)];
    for (let y = 0; y < S;) {
      let h = pick(heights); if (S - y - h < Math.min(...heights)) h = S - y;
      const start = Math.floor(r() * S);
      for (let at = start; at < start + S;) {
        let len = lens[0] + Math.floor(r() * (lens[1] - lens[0] + 1)); if (start + S - at - len < lens[0]) len = start + S - at;
        stone(s, P, r, at + gap, y + gap, len - gap, h - gap, pick(tones), round, grain);
        at += len;
      }
      y += h;
    }
  }
  // Planks along the room: each course a board or two, butted end to end with a nail either side of
  // the joint, a grain line or two down its length.
  function boards(s, P, r) {
    const H = 16, tones = [0.92, 0.97, 1, 1.04, 1.08];
    for (let y = 0; y < S; y += H) {
      const start = Math.floor(r() * S);
      for (let at = start; at < start + S;) {
        let len = 96 + Math.floor(r() * 110); if (start + S - at - len < 96) len = start + S - at;
        const body = mul(P.base, tones[Math.floor(r() * tones.length)]);
        s.rect(at, y, len, H, body);
        s.rect(at, y, len, 1, mix(P.joint, P.dark, 0.5)); s.rect(at, y + 1, len, 1, mix(body, P.light, 0.35)); s.rect(at, y + H - 1, len, 1, mix(body, P.dark, 0.4));
        s.rect(at, y + 1, 1, H - 1, mix(P.joint, P.dark, 0.5));
        for (let g = 0; g < 1 + Math.floor(r() * 2); g++) { const gy = y + 4 + Math.floor(r() * (H - 7)); for (let i = 0; i < len - 4; i++) if (r() < 0.8) s.set(at + 2 + i, gy + (r() < 0.06 ? 1 : 0), mix(body, P.dark, 0.22)); }
        for (const ny of [y + 4, y + H - 5]) { s.set(at + 2, ny, P.dark); s.set(at + len - 3, ny, P.dark); }
        at += len;
      }
    }
  }
  // Packed earth in three tones of low, soft noise, a scatter of pebbles and of straw.
  function earth(s, P, r) {
    const G = 24, n = S / G, grid = Array.from({ length: n * n }, () => r());
    const at = (i, j) => grid[(((j % n) + n) % n) * n + (((i % n) + n) % n)], sm = (t) => t * t * (3 - 2 * t);
    const tones = [mul(P.base, 0.93), P.base, mul(P.base, 1.05)];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const gx = x / G, gy = y / G, i = Math.floor(gx), j = Math.floor(gy), fx = sm(gx - i), fy = sm(gy - j);
      const v = (at(i, j) * (1 - fx) + at(i + 1, j) * fx) * (1 - fy) + (at(i, j + 1) * (1 - fx) + at(i + 1, j + 1) * fx) * fy;
      const q = v + ((x * 7 + y * 13) % 5 - 2) * 0.012;
      s.set(x, y, tones[q < 0.38 ? 0 : q < 0.66 ? 1 : 2]);
    }
    for (let k = 0; k < S * S / 900; k++) { const x = Math.floor(r() * S), y = Math.floor(r() * S); s.set(x, y, mix(P.base, P.dark, 0.5)); s.set(x + 1, y, mix(P.base, P.dark, 0.35)); s.set(x, y - 1, mix(P.base, P.light, 0.3)); }
    const straw = mix(P.light, [226, 184, 104], 0.35), strawDk = mix(P.base, P.dark, 0.45);
    for (let k = 0; k < S * S / 1100; k++) {
      let x = r() * S, y = r() * S; const a = (r() < 0.5 ? -1 : 1) * (0.35 + r() * 0.9), L = 5 + Math.floor(r() * 5);
      for (let t = 0; t < L; t++) { s.set(Math.round(x), Math.round(y) + 1, strawDk); s.set(Math.round(x), Math.round(y), straw); x += Math.cos(a); y += Math.sin(a); }
    }
  }
  // Irregular paving: every stone the cell of a jittered point, joints where two cells meet, each
  // stone lit on the side toward the top left and shaded away from it.
  function paving(s, P, r) {
    const C = 32, n = S / C, pts = [], tones = [0.93, 0.97, 1, 1.03, 1.07], tone = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { pts.push([i * C + 4 + r() * (C - 8), j * C + 4 + r() * (C - 8)]); tone.push(mul(P.base, tones[Math.floor(r() * tones.length)])); }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const ci = Math.floor(x / C), cj = Math.floor(y / C); let d1 = 1e9, d2 = 1e9, id = 0, vx = 0, vy = 0;
      for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) {
        const ii = ((ci + u) % n + n) % n, jj = ((cj + v) % n + n) % n, p = pts[jj * n + ii];
        const px = p[0] + (ci + u - ii) * C, py = p[1] + (cj + v - jj) * C, dx = x + 0.5 - px, dy = y + 0.5 - py, d = Math.hypot(dx, dy);
        if (d < d1) { d2 = d1; d1 = d; id = jj * n + ii; vx = dx; vy = dy; } else if (d < d2) d2 = d;
      }
      const edge = d2 - d1;
      if (edge < 1.6) { s.set(x, y, P.joint); continue; }
      const body = tone[id], side = (vx * -0.6 + vy * -0.8) / Math.max(1, d1);
      s.set(x, y, edge < 3.4 ? (side > 0.3 ? mix(body, P.light, 0.25) : side < -0.3 ? mix(body, P.dark, 0.28) : body) : body);
    }
    for (let k = 0; k < S * S / 160; k++) { const x = Math.floor(r() * S), y = Math.floor(r() * S); s.set(x, y, mix(P.base, P.dark, 0.3)); }
  }
  const KINDS = {
    flags: (s, P, r) => courses(s, P, r, [24, 32, 40, 48], [28, 60], 2, 1),
    cobble: (s, P, r) => courses(s, P, r, [20, 22, 24], [18, 28], 2, 3, 0.6),
    setts: (s, P, r) => courses(s, P, r, [26], [36, 50], 2, 1, 0.8),
    slabs: (s, P, r) => courses(s, P, r, [40], [56, 96], 2, 1),
    boards, earth, paving,
  };
  // A wall's brick face the same way: one strip `N` tiles long and `F` texels deep, courses of bricks
  // laid across it and wrapped round its ends, so the face of a long wall is one run of brickwork and
  // not one tile's bricks again every tile, with a seam at each. Returns the strip cut a tile a piece.
  const strips = new Map();
  function faceStrip(src, key, F, tx) {
    let tiles = strips.get(key);
    if (!tiles) {
      // two courses, as the packed face had: a full one under the cap's lip and the part of the next
      // the floor's shadow falls on; bricks as long as the packed ones, and joints of pale mortar, as
      // the packed face's are
      const P = palette(src); P.joint = mix(P.base, P.light, 0.6);
      const s = new Sheet(), r = rng(seedOf(key)), tones = [0.94, 0.98, 1, 1.03, 1.06], H = [20, F - 20];
      s.rect(0, 0, S, F, P.joint);
      for (let c = 0, y = 0; c < H.length; y += H[c], c++) {
        const start = Math.floor(r() * S);
        for (let at = start; at < start + S;) {
          let len = 40 + Math.floor(r() * 19); if (start + S - at - len < 40) len = start + S - at;
          stone(s, P, r, at + 2, y + 2, len - 2, H[c] - 2, tones[Math.floor(r() * tones.length)], 0, 0.5);
          at += len;
        }
      }
      const big = document.createElement('canvas'); big.width = S; big.height = F;
      const img = new ImageData(S, F); img.data.set(s.d.subarray(0, S * F * 4)); big.getContext('2d').putImageData(img, 0, 0);
      tiles = [];
      for (let i = 0; i < N; i++) { const c = document.createElement('canvas'); c.width = T; c.height = F; c.getContext('2d').drawImage(big, i * T, 0, T, F, 0, 0, T, F); tiles.push(c); }
      strips.set(key, tiles);
    }
    return tiles[((tx % N) + N) % N];
  }
  const sheets = new Map();
  // The tile (tx, ty) of the sheet of `kind` painted off the swatch `src`, cached under `key`.
  function tile(src, kind, key, tx, ty) {
    let tiles = sheets.get(key);
    if (!tiles) {
      const P = palette(src); P.joint = mix(P.dark, P.base, 0.35);
      const s = new Sheet(); KINDS[kind](s, P, rng(seedOf(key)));
      const big = document.createElement('canvas'); big.width = big.height = S; big.getContext('2d').putImageData(new ImageData(s.d, S, S), 0, 0);
      tiles = [];
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const c = document.createElement('canvas'); c.width = c.height = T; c.getContext('2d').drawImage(big, i * T, j * T, T, T, 0, 0, T, T); tiles.push(c); }
      tiles.big = big; sheets.set(key, tiles);
    }
    return tiles[(((ty % N) + N) % N) * N + (((tx % N) + N) % N)];
  }
  return { N, S, tile, faceStrip, KINDS, sheets };
})();

const PIXEL_ROOMS = {
  lift: 1.6,
  // world px a floor tile is drawn past its right and bottom edge, under the next one (`drawTiles`)
  bleed: 0.5,
  // `top` only lends the cap its colour now: the cap is a sheet of coursed stone `sheet` tiles square
  // laid in world space (`PaintedArt.wallCap`), `course` texels a course (64 a tile), blocks `block`
  // long. A course that divides 64 lays a mortar line on every tile edge: the grid this replaced. `faceH` texels of brick face on every south-exposed tile, cut from `face` at row `faceFrom`.
  wall: { top: 'floors-04', face: 'floors-08', sheet: 3, course: 24, block: [30, 62], faceH: 36, faceFrom: 13 },
  // One floor swatch a canon (`PaintedArt.floorSwatch`): 01 and 02 each tile with themselves and
  // with nothing else, 03 meets itself at no edge and is laid mirrored (`mirror`); 04-07 and 09 tile.
  // `sheet` is the kind of floor the canon's swatch was, painted as a sheet (`FLOOR_SHEET`); the Yard
  // and the Road shared a swatch and now are cobbles and setts, so the two floors read apart.
  stone: { floor: 'floors-01', boards: 'floors-06', sheet: 'flags' },
  fire: { floor: 'floors-03', mirror: true, boards: 'floors-06', sheet: 'cobble' },
  line: { floor: 'floors-03', mirror: true, boards: 'floors-06', sheet: 'setts' },
  open: { floor: 'floors-07', boards: 'floors-05', sheet: 'earth' },
  funnel: { floor: 'floors-04', boards: 'floors-06', sheet: 'slabs' },
  drop: { floor: 'floors-05', boards: 'floors-05', sheet: 'boards' },
  niche: { floor: 'floors-02', boards: 'floors-06', sheet: 'paving' },
  hollow: { floor: 'floors-09', boards: 'floors-06', sheet: 'paving' },
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
