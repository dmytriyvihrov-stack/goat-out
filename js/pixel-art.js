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

const PIXEL_ART = {
  image: null,
  init() {
    if (typeof PIXEL_ASSETS === 'undefined') return;
    this.image = new Image(); this.image.src = PIXEL_ASSETS.src;
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
  // His horns as the souls on the headbutt have made them, over the frame `draw` just drew with
  // the same foot and scale: LONG HORNS grows each one from its root (`mods.headbuttReach`), BOMB
  // CHARGE runs lava down them and SPLASH venom, with a glow for the one and a drip for the other.
  horns(ctx, id, angle, moving, t, x, mods) {
    const H = TUNING.goat.hornLooks, grow = clamp(1 + (mods.headbuttReach - 1) * H.growMul, 1, H.growMax);
    const look = mods.bomb ? 'lava' : mods.splash ? 'venom' : null;
    if (grow <= 1.001 && !look) return;
    const u = PIXEL_ASSETS.units[id], d = (Math.round(angle / (Math.PI / 4)) + 14) % 8;
    const f = moving && u.walk ? u.walk[d][Math.floor(t * 8 + (x || 0) * 0.05) % 4] : u.idle[d];
    const k = PIXEL_EXTENT[id] / PIXEL_ASSETS.target, smooth = ctx.imageSmoothingEnabled;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.translate(-f[4] * k, -f[5] * k); ctx.scale(k, k);
    for (const hn of this.hornsOf(f)) {
      const [bx, by] = hn.base;
      ctx.save(); ctx.translate(bx, by); ctx.scale(grow, grow); ctx.translate(-bx, -by);
      const img = look ? this.hornSkin(hn, look) : hn.canvas;
      if (look) { ctx.shadowColor = H[look].glow; ctx.shadowBlur = H[look].blur * (0.75 + 0.25 * Math.sin(t * 7 + bx)); }
      ctx.drawImage(img, 0, 0);
      ctx.restore();
      // A drop gathering at the tip and letting go, once every `drip` seconds, out of step per horn.
      if (look === 'venom') {
        const p = ((t + bx * 0.13) % H.venom.drip) / H.venom.drip, [tx, ty] = hn.tip;
        const dx = bx + (tx - bx) * grow, dy = by + (ty - by) * grow;
        ctx.fillStyle = H.venom.glow; ctx.globalAlpha = p < 0.6 ? p / 0.6 : 1 - (p - 0.6) / 0.4;
        ctx.fillRect(Math.round(dx), Math.round(dy + (p < 0.6 ? 1 : 1 + (p - 0.6) * 30)), 2, 2);
        ctx.globalAlpha = 1;
      }
    }
    ctx.imageSmoothingEnabled = smooth; ctx.restore();
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
