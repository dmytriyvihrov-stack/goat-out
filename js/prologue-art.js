// THE PROLOGUE'S PICTURE (10 Oct 2026, "the look of the opening"). The field, the road and the sacking were flat
// vector shapes beside pixel animals: a gradient for a sky, a disc for a sun, a hill in one curve, grass as strokes,
// a truck in rectangles with spinning spokes. They are pixels now, on a grid of cells the size the sprites' own
// texels read at (`TUNING.intro.prologue.cell` of the scene's scale in screen px, never under 2). Everything that
// stands still is painted once per screen size into a small canvas (`bake`, one pixel a cell) and drawn scaled up
// with smoothing off; only what moves is drawn live, in whole cells: the clouds, the grass bending, a butterfly, the
// stars' twinkle, the road's strips going by, the wheels, the exhaust, the dust. Render only: `Game.updatePrologue`
// is untouched, and the scene's coordinates (the pen's rails, the truck's bed and its bars, where the two of them
// stand) are the same world units `Renderer.drawPrologue` always used, so nothing in the scene moved.
// The colours are this picture's own, one-off tints beside `PALETTE`'s: a bright field at dusk and a night road are
// nowhere else in the game.
const PROLOGUE_PAL = {
  sky: ['#4f6d85', '#5f7d93', '#73899a', '#8f9a95', '#ad9f84', '#c4b188', '#d2bf8e'],
  sun: '#ffe08a', sunRim: '#f3c96a', sunHalo: '#dcc07c',
  cloud: '#ece8d8', cloudDark: '#cfc9b2',
  farHill: '#6e8d7a', farHillLit: '#7f9c86', hill: '#5f7a3e', hillLit: '#6e8a48', hillFoot: '#4f6a34',
  tree: '#3b5429', treeLit: '#4c6a33', trunk: '#4a3522',
  field: '#7c8f52', fieldLit: '#88995a', fieldDark: '#6f8149', blade: '#a8bd6c', bladeDark: '#93a85e',
  flower: ['#efe6d0', '#ffe08a', '#e8a7b8'],
  wing: ['#efe6d0', '#ffe08a'],
  night: ['#120f1a', '#171420', '#1e1a29', '#262031', '#2b2434'], star: ['#efe6d0', '#b9b3a4', '#8a857b'],
  moon: '#efe6d0', moonDark: '#cfc7b2', moonGlow: '#3a3347', ridge: '#1b1722', treeline: '#0f0c11',
  verge: '#1c1719', vergeTuft: '#28302a', asphalt: '#3a3538', asphaltLit: '#45404a', asphaltDark: '#322d31', kerb: '#4a4448', dash: '#cfc7b2',
  bed: '#2a2224', bedLit: '#3a3034', cab: '#3b2f33', cabLit: '#4d3e44', cabDark: '#2b2226', glass: '#6f8a99', glassLit: '#8fa7b3',
  lamp: '#ffe08a', beam: '255,224,138', tyre: '#141013', tyreLit: '#242024', hub: '#4a4448', spoke: '#5a5257', bar: '#7a7377', barLit: '#8e878b', barDark: '#5a5257',
  smoke: '90,82,88', dust: '#4a4448',
  sack: '#2a2119', sackDark: '#211a13', sackLit: '#3a2e22', thread: '#302517',
};

const PrologueArt = {
  bakes: new Map(),
  cell(k) { return Math.max(2, Math.round(k * TUNING.intro.prologue.cell)); },
  // a hash in [0, 1) off two integers, the same every frame, so what is scattered stays where it was
  hash(i, j) { let h = (Math.imul(i | 0, 73856093) ^ Math.imul(j | 0, 19349663)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) % 10000 / 10000; },
  rgb(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; },
  // A canvas `cw` x `ch` cells painted once by `paint(put, cw, ch)`, where `put(x, y, hex)` sets one cell, kept
  // under `key` (a dozen at most: a new screen size lets the oldest go).
  bake(key, cw, ch, paint) {
    let b = this.bakes.get(key); if (b) return b;
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const x = c.getContext('2d'), img = x.createImageData(cw, ch), d = img.data, cols = new Map();
    const put = (px, py, hex) => {
      if (px < 0 || py < 0 || px >= cw || py >= ch) return;
      let v = cols.get(hex); if (!v) { v = this.rgb(hex); cols.set(hex, v); }
      const i = (py * cw + px) * 4; d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = 255;
    };
    paint(put, cw, ch);
    x.putImageData(img, 0, 0);
    this.bakes.set(key, c);
    if (this.bakes.size > 12) this.bakes.delete(this.bakes.keys().next().value);
    return c;
  },
  // the baked picture laid on the screen, a cell a pixel, unsmoothed
  blit(ctx, c, X, Y, cell, sx = 0, sy = 0, sw = c.width, sh = c.height) {
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, sx, sy, sw, sh, X, Y, sw * cell, sh * cell);
    ctx.imageSmoothingEnabled = smooth;
  },
  // one cell on the screen, snapped to the grid
  cellRect(ctx, X, Y, c, w = 1, h = 1) { ctx.fillRect(Math.floor(X / c) * c, Math.floor(Y / c) * c, w * c, h * c); },

  // Steps between the bands of a sky: band `i` of `n` over row `y` of `rows`, dithered on a checker across the
  // seam so the sky grades without a gradient, which is one thing a pixel picture never has.
  band(cols, y, rows, x) {
    const t = y / Math.max(1, rows) * (cols.length - 1), i = Math.floor(t), f = t - i;
    const dither = ((x + y) & 1) ? f > 0.33 : f > 0.66;
    return cols[Math.min(cols.length - 1, i + (dither ? 1 : 0))];
  },
  // a round crown on a trunk, `r` cells, in cells
  tree(put, x, y, r, dark, lit, trunk) {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      if (i * i + j * j * 1.3 > r * r + r * 0.5) continue;
      put(x + i, y - r + j, (i - j) < -r * 0.5 ? lit : dark);
    }
    for (let j = 0; j < Math.max(1, Math.round(r * 0.8)); j++) put(x, y + j, trunk);
  },
  pine(put, x, y, h, col) { for (let j = 0; j < h; j++) { const w = Math.floor(j * 0.45); for (let i = -w; i <= w; i++) put(x + i, y - h + j, col); } put(x, y, col); },

  // THE FIELD. `L`: w, h screen px, hy the horizon, cx, sy the scene's origin, k its scale, pk its scale down the
  // screen, c the cell, t the clock. Baked: the sky in bands, the sun, two ranges of hills with trees on the near
  // ridge, the grass with its two speckles and the flowers. Live: two clouds drifting, the blades of grass bending
  // in a wind that crosses the field, a butterfly.
  meadow(R, game, L) {
    const ctx = R.ctx, P = PROLOGUE_PAL, T = TUNING.intro.prologue, { w, h, hy, c, t } = L;
    const cw = Math.ceil(w / c), ch = Math.ceil(h / c), hyc = Math.round(hy / c);
    const bg = this.bake(`meadow:${cw}x${ch}x${hyc}`, cw, ch, (put) => {
      for (let y = 0; y < hyc; y++) for (let x = 0; x < cw; x++) put(x, y, this.band(P.sky, y, hyc, x));
      // the sun, low on the right, a disc with a rim and a dithered halo
      const sx = Math.round(cw * 0.64), sy = Math.round(hyc * 0.42), sr = Math.max(5, Math.round(26 * R.ts / c));
      for (let j = -sr - 3; j <= sr + 3; j++) for (let i = -sr - 3; i <= sr + 3; i++) {
        const d2 = i * i + j * j;
        if (d2 <= (sr - 1) * (sr - 1)) put(sx + i, sy + j, P.sun);
        else if (d2 <= sr * sr) put(sx + i, sy + j, P.sunRim);
        else if (d2 <= (sr + 3) * (sr + 3) && ((i + j) & 1)) put(sx + i, sy + j, P.sunHalo);
      }
      // a far range, blue with distance, then the near hill and its lit crest
      const hill = Math.min(ch * 0.12, hyc * 0.5);
      const far = (x) => hyc - hill * (0.75 + 0.3 * Math.sin(x / cw * 9.1 + 0.4) + 0.18 * Math.sin(x / cw * 23 + 2));
      const near = (x) => { const u = x / cw; return hyc - hill * (u < 0.55 ? 1 - Math.pow((u - 0.3) / 0.3, 2) * 0.67 : 0.33 - 0.5 * Math.sin((u - 0.55) / 0.45 * Math.PI)); };
      for (let x = 0; x < cw; x++) {
        const fy = Math.round(far(x)), ny = Math.round(near(x));
        for (let y = fy; y < hyc; y++) put(x, y, y < fy + 2 ? P.farHillLit : P.farHill);
        for (let y = Math.min(ny, hyc); y < hyc; y++) put(x, y, y < ny + 2 && ((x + y) & 1) ? P.hillLit : y < ny + 1 ? P.hillLit : P.hill);
        put(x, hyc, P.hillFoot);
      }
      // pines on the far range, round trees on the near ridge
      for (let i = 0; i < 9; i++) { const x = Math.round(this.hash(i, 7) * cw); this.pine(put, x, Math.round(far(x)) + 1, 3 + Math.round(this.hash(i, 8) * 3), P.farHill); }
      for (let i = 0; i < 7; i++) { const x = Math.round((i + 0.2 + this.hash(i, 3) * 0.6) / 7 * cw), r = 2 + Math.round(this.hash(i, 4) * 2); this.tree(put, x, Math.round(near(x)) + 1, r, P.tree, P.treeLit, P.trunk); }
      // the field: the grass, a speckle of lighter and darker cells, and the flowers
      for (let y = hyc + 1; y < ch; y++) for (let x = 0; x < cw; x++) {
        const r = this.hash(x, y); put(x, y, r < 0.07 ? P.fieldLit : r > 0.93 ? P.fieldDark : P.field);
      }
      for (let i = 0; i < T.flowers; i++) {
        const x = Math.round(this.hash(i, 11) * cw), y = hyc + 4 + Math.round(this.hash(i, 12) * (ch - hyc - 6)), col = P.flower[i % 3];
        put(x, y, col); if (i % 3 === 1) put(x + 1, y, col);
      }
    });
    this.blit(ctx, bg, 0, 0, c);
    // two clouds drifting over the sun, each a shape in twos of cells
    const shapes = [['..XXXX...', '.XXXXXXX.', 'XXXXXXXXX'], ['...XXX..', '.XXXXXXX', 'XXXXXXXX']];
    for (let n = 0; n < 2; n++) {
      const rows = shapes[n], cwid = rows[0].length * 2, span = cw + cwid, x0 = ((t * T.clouds * (n ? 0.7 : 1) / c + n * span * 0.55) % span) - cwid;
      const y0 = Math.round(hyc * (n ? 0.18 : 0.32));
      for (let r = 0; r < rows.length; r++) for (let q = 0; q < rows[r].length; q++) if (rows[r][q] === 'X') {
        ctx.fillStyle = r === rows.length - 1 ? P.cloudDark : P.cloud;
        ctx.fillRect(Math.floor(x0 + q * 2) * c, (y0 + r * 2) * c, 2 * c, 2 * c);
      }
    }
    // the blades, bending as a wind goes across the field, whole cells
    for (let i = 0; i < T.tufts; i++) {
      const gx = Math.floor(this.hash(i, 1) * cw), gy = hyc + 3 + Math.floor(this.hash(i, 2) * (ch - hyc - 4));
      const wind = Math.sin(t * 1.4 - gx * 0.03 + i * 0.3), lean = wind > 0.35 ? 1 : wind < -0.35 ? -1 : 0;
      ctx.fillStyle = (i & 1) ? P.blade : P.bladeDark;
      ctx.fillRect(gx * c, gy * c, c, c);
      ctx.fillRect((gx - 1) * c, (gy - 1) * c, c, c); ctx.fillRect((gx + 1) * c, (gy - 1) * c, c, c);
      ctx.fillRect((gx - 1 + lean) * c, (gy - 2) * c, c, c); ctx.fillRect((gx + 1 + lean) * c, (gy - 2) * c, c, c);
    }
    // a butterfly over the grass, its wings a beat apart
    const bx = Math.floor((w * 0.5 + Math.sin(t * 0.37) * w * 0.3 + Math.sin(t * 1.9) * 12 * R.ts) / c), by = Math.floor((hy + 30 * R.ts + Math.sin(t * 0.9) * 26 * R.ts + Math.abs(Math.sin(t * 5.1)) * 6 * R.ts) / c);
    const open = Math.floor(t * 9) % 2 === 0;
    ctx.fillStyle = P.wing[0];
    if (open) { ctx.fillRect((bx - 1) * c, by * c, c, c); ctx.fillRect((bx + 1) * c, by * c, c, c); ctx.fillStyle = P.wing[1]; ctx.fillRect((bx - 1) * c, (by - 1) * c, c, c); ctx.fillRect((bx + 1) * c, (by - 1) * c, c, c); }
    else { ctx.fillRect(bx * c, (by - 1) * c, c, 2 * c); }
  },
  // The pen's rails round the two of them, in cells, at the scene's own corners (`fx0..fy1` are scene units):
  // `back` the far rails and posts, drawn before the animals, the rest after.
  fence(R, L, back) {
    const ctx = R.ctx, P = PROLOGUE_PAL, { cx, sy, k, pk, c } = L;
    const fx0 = -160, fx1 = 160, fy0 = -62, fy1 = 62;
    const X = (x) => Math.floor((cx + x * k) / c), Y = (y) => Math.floor((sy + y * pk) / c);
    const pw = Math.max(2, Math.round(5.2 * k / c)), ph = Math.max(6, Math.round(24 * pk / c)), rt = Math.max(1, Math.round(3 * pk / c));
    const post = (x, y) => {
      const X0 = X(x) - (pw >> 1), Y0 = Y(y) - ph;
      ctx.fillStyle = PALETTE.wood; ctx.fillRect(X0 * c, Y0 * c, pw * c, ph * c);
      ctx.fillStyle = PALETTE.woodHi; ctx.fillRect(X0 * c, Y0 * c, pw * c, c); ctx.fillRect(X0 * c, Y0 * c, c, ph * c);
      ctx.fillStyle = P.trunk; ctx.fillRect((X0 + pw - 1) * c, (Y0 + 1) * c, c, (ph - 1) * c); ctx.fillRect(X0 * c, (Y0 + ph) * c, pw * c, c);
    };
    const railH = (x0, x1, y) => { const Y0 = Y(y) - rt; ctx.fillStyle = PALETTE.woodHi; ctx.fillRect(X(x0) * c, Y0 * c, (X(x1) - X(x0)) * c, rt * c); ctx.fillStyle = PALETTE.wood; ctx.fillRect(X(x0) * c, (Y0 + rt) * c, (X(x1) - X(x0)) * c, c); };
    const railV = (x, y0, y1) => { const X0 = X(x) - 1; ctx.fillStyle = PALETTE.woodHi; ctx.fillRect(X0 * c, (Y(y0) - rt) * c, 2 * c, (Y(y1) - Y(y0)) * c); ctx.fillStyle = PALETTE.wood; ctx.fillRect((X0 + 2) * c, (Y(y0) - rt) * c, c, (Y(y1) - Y(y0)) * c); };
    if (back) {
      for (const yy of [-12, -3]) railH(fx0, fx1, fy0 + yy);
      for (let x = fx0; x <= fx1; x += 32) post(x, fy0);
      for (const yy of [-12, -3]) { railV(fx0 + yy * 0.3, fy0 + yy, fy1 + yy); railV(fx1 + yy * 0.3, fy0 + yy, fy1 + yy); }
      for (let y = fy0 + 32; y < fy1; y += 32) { post(fx0, y); post(fx1, y); }
    } else {
      for (const yy of [-12, -3]) railH(fx0, fx1, fy1 + yy);
      for (let x = fx0; x <= fx1; x += 32) post(x, fy1);
    }
  },

  // THE ROAD, at night. Baked: the sky in bands with its stars, the moon with its seas and a glow, a far ridge; and
  // three strips that go by, each tileable across the screen's width: the treeline on the horizon (slowest), the
  // asphalt with its speckle, the verge with its tufts. Live: a few stars blinking, the centre line, the truck in
  // cells (`truck`), its wheels turning a cell at a time, the lamp's beam, the exhaust and the dust off the wheels.
  road(R, game, L) {
    const ctx = R.ctx, P = PROLOGUE_PAL, T = TUNING.intro.prologue, { w, h, c, t } = L, pr = game.intro.pro;
    const cw = Math.ceil(w / c), ch = Math.ceil(h / c), skyc = Math.round(h * 0.55 / c), ry0 = Math.round(h * 0.6 / c), ry1 = Math.round(h * 0.86 / c);
    const bg = this.bake(`road:${cw}x${ch}`, cw, ch, (put) => {
      for (let y = 0; y < skyc; y++) for (let x = 0; x < cw; x++) put(x, y, this.band(P.night, y, skyc, x));
      for (let i = 0; i < T.stars; i++) { const x = Math.round(this.hash(i, 21) * cw), y = Math.round(this.hash(i, 22) * skyc * 0.85), r = this.hash(i, 23); put(x, y, P.star[r < 0.25 ? 0 : r < 0.6 ? 1 : 2]); }
      // the moon, top left, with a glow behind it and two dark seas
      const mx = Math.round(cw * 0.2), my = Math.round(skyc * 0.36), mr = Math.max(4, Math.round(18 * R.ts / c));
      for (let j = -mr - 4; j <= mr + 4; j++) for (let i = -mr - 4; i <= mr + 4; i++) {
        const d2 = i * i + j * j;
        if (d2 <= mr * mr) put(mx + i, my + j, (i - j * 0.5 > mr * 0.45 && j < 0) || (i < -mr * 0.2 && j > mr * 0.3) ? P.moonDark : P.moon);
        else if (d2 <= (mr + 4) * (mr + 4) && ((i + j) & 1)) put(mx + i, my + j, P.moonGlow);
      }
      // a far ridge under the sky, the verges, and the road's body with its kerbs
      for (let x = 0; x < cw; x++) { const ry = skyc - 2 - Math.round(2.5 + 2 * Math.sin(x / cw * 7 + 1) + 1.5 * Math.sin(x / cw * 19)); for (let y = ry; y < skyc; y++) put(x, y, P.ridge); }
      for (let y = skyc; y < ch; y++) for (let x = 0; x < cw; x++) put(x, y, P.verge);
      for (let y = ry0; y < ry1; y++) for (let x = 0; x < cw; x++) put(x, y, y < ry0 + 2 || y >= ry1 - 2 ? P.kerb : P.asphalt);
    });
    this.blit(ctx, bg, 0, 0, c);
    // the strips going by: the treeline, the asphalt's speckle, the near verge's tufts, each tileable at `cw`
    const treeH = Math.max(6, Math.round(skyc * 0.12));
    const trees = this.bake(`treeline:${cw}x${treeH}`, cw, treeH, (put) => {
      for (let i = 0; i < Math.round(cw / 9); i++) {
        const x = Math.round(this.hash(i, 31) * cw), tall = this.hash(i, 32);
        if (tall < 0.6) this.pine(put, x, treeH - 1, 3 + Math.round(tall * (treeH - 4)), P.treeline);
        else this.tree(put, x, treeH - 1, 2 + Math.round((tall - 0.6) * 5), P.treeline, P.treeline, P.treeline);
        if (x < 8) this.pine(put, x + cw, treeH - 1, 3 + Math.round(tall * (treeH - 4)), P.treeline);
      }
      for (let x = 0; x < cw; x++) put(x, treeH - 1, P.treeline);
    });
    const speck = this.bake(`asphalt:${cw}x${ry1 - ry0}`, cw, ry1 - ry0, (put) => {
      for (let y = 0; y < ry1 - ry0; y++) for (let x = 0; x < cw; x++) { const r = this.hash(x, y + 500); put(x, y, y < 2 || y >= ry1 - ry0 - 2 ? P.kerb : r < 0.05 ? P.asphaltLit : r > 0.94 ? P.asphaltDark : P.asphalt); }
    });
    const vergeH = Math.max(3, Math.round((ch - ry1) * 0.3));
    const tufts = this.bake(`verge:${cw}x${vergeH}`, cw, vergeH, (put) => {
      for (let y = 0; y < vergeH; y++) for (let x = 0; x < cw; x++) put(x, y, P.verge);
      for (let i = 0; i < Math.round(cw / 3); i++) { const x = Math.round(this.hash(i, 41) * cw), y = Math.round(this.hash(i, 42) * (vergeH - 2)); put(x, y, P.vergeTuft); put(x, y + 1, P.vergeTuft); put(x + 1, y + 1, P.vergeTuft); }
    });
    const scroll = (img, Y, share) => {
      const off = Math.floor((pr.t * T.roadSpeed * share * R.ts / c) % cw);
      this.blit(ctx, img, -off * c, Y * c, c); this.blit(ctx, img, (cw - off) * c, Y * c, c);
    };
    scroll(trees, skyc - treeH, T.treeline);
    scroll(speck, ry0, 1);
    scroll(tufts, ry1 + 1, T.verge);
    // a few stars blink
    for (let i = 0; i < 10; i++) if (Math.floor(t * 2 + i * 1.7) % 5 === 0) { const x = Math.round(this.hash(i, 21) * cw), y = Math.round(this.hash(i, 22) * skyc * 0.85); ctx.fillStyle = P.night[1]; ctx.fillRect(x * c, y * c, c, c); }
    // the centre line
    const period = Math.max(10, Math.round(90 * R.ts / c)), dash = Math.round(period * 0.5), off = Math.floor((pr.t * T.roadSpeed * R.ts / c) % period), ly = Math.round((ry0 + ry1) / 2) - 1;
    ctx.fillStyle = P.dash;
    for (let x = -off; x < cw + period; x += period) ctx.fillRect(x * c, ly * c, dash * c, 2 * c);
    this.truck(R, game, L, true);
  },
  // The truck, in cells over the scene's own rectangles (a flatbed, a cab, two wheels, the cage), lifted by the
  // jolt. `back` draws all of it but the cage's front bars; `false` draws those, after the two of them.
  truck(R, game, L, back) {
    const ctx = R.ctx, P = PROLOGUE_PAL, T = TUNING.intro.prologue, { cx, sy, k, pk, c, t } = L, pr = game.intro.pro;
    const oy = 44 + (pr.jolt || 0) * 0.5;
    const X = (x) => Math.floor((cx + x * k) / c), Y = (y) => Math.floor((sy + (y + oy) * pk) / c);
    const rect = (x, y, w, h, col) => { const X0 = X(x), Y0 = Y(y), X1 = X(x + w), Y1 = Y(y + h); ctx.fillStyle = col; ctx.fillRect(X0 * c, Y0 * c, Math.max(1, X1 - X0) * c, Math.max(1, Y1 - Y0) * c); };
    const bar = (x, y0, y1, col) => rect(x - 1.6, y0, 3.2, y1 - y0, col);
    if (!back) { for (let x = -104; x <= 64; x += 21) { bar(x, -56, 8, P.bar); rect(x - 1.6, -56, 1.2, 64, P.barLit); } rect(-106, -58, 172, 4, P.barDark); rect(-106, -58, 172, 1.5, P.bar); return; }
    // the lamp's beam first, under everything: a wedge of cells thinning with distance (light is the one smooth thing allowed)
    const bx = X(151), by = Y(0), reach = Math.round(90 * k / c);
    for (let i = 0; i < reach; i++) {
      const a = (1 - i / reach) * 0.35, spread = Math.floor(i * 0.35);
      ctx.fillStyle = `rgba(${P.beam},${a.toFixed(3)})`;
      for (let j = -spread; j <= spread + 1; j++) if (((i + j) & 1) || a > 0.2) ctx.fillRect((bx + i) * c, (by + j) * c, c, c);
    }
    // the bed, its boards, the cab with a roof, a door and a window, a bumper, the lamp
    rect(-118, 8, 214, 12, P.bed); rect(-118, 8, 214, 2, P.bedLit); rect(-118, 18, 214, 2, P.cabDark);
    for (let x = -112; x < 96; x += 14) rect(x, 10, 1.2, 8, P.cabDark);
    rect(96, -34, 52, 54, P.cab); rect(96, -34, 52, 3, P.cabLit); rect(96, -34, 2, 54, P.cabLit); rect(146, -34, 2, 54, P.cabDark);
    rect(104, -28, 34, 22, P.glass); rect(104, -28, 34, 4, P.glassLit); rect(104, -28, 3, 22, P.glassLit); rect(120, -28, 1.5, 22, P.cabDark);
    rect(122, -2, 1.5, 20, P.cabDark); rect(126, 6, 6, 2, P.cabLit);   // the door's seam and handle
    rect(140, 12, 12, 8, P.cabDark); rect(146, -4, 5, 8, P.lamp); rect(147, -3, 2, 3, PALETTE.bone);
    // the exhaust up the back of the cab, and the smoke off it drifting back
    rect(93, -40, 3, 48, P.cabDark); rect(92, -42, 5, 3, P.spoke);
    for (let i = 0; i < 6; i++) {
      const age = (t * 1.3 + i / 6) % 1, px = X(94 - age * 70 + Math.sin(i * 2.1 + age * 6) * 4), py = Y(-42 - age * 46), s = 1 + Math.floor(age * 3);
      ctx.fillStyle = `rgba(${P.smoke},${(0.85 * (1 - age)).toFixed(3)})`; ctx.fillRect(px * c, (py - s) * c, s * c, s * c);
    }
    // the wheels: a tyre, a hub and four spokes turning a cell at a time, a mudguard over each
    const spin = pr.t * T.wheelSpin;
    for (const wx of [-76, 64]) {
      const wcx = X(wx), wcy = Y(26), r = Math.max(4, Math.round(17 * k / c)), ry = Math.max(3, Math.round(17 * pk / c));
      rect(wx - 22, 4, 44, 6, P.cabDark);
      for (let j = -ry; j <= ry; j++) for (let i = -r; i <= r; i++) {
        const d = (i * i) / (r * r) + (j * j) / (ry * ry);
        if (d > 1) continue;
        ctx.fillStyle = d > 0.72 ? (j < 0 ? P.tyreLit : P.tyre) : d < 0.12 ? P.hub : P.tyre;
        ctx.fillRect((wcx + i) * c, (wcy + j) * c, c, c);
      }
      ctx.fillStyle = P.spoke;
      for (let q = 0; q < 4; q++) {
        const a = spin + q * Math.PI / 2;
        for (let s = 2; s < r * 0.8; s++) ctx.fillRect((wcx + Math.round(Math.cos(a) * s)) * c, (wcy + Math.round(Math.sin(a) * s * ry / r)) * c, c, c);
      }
      // dust kicked up behind the wheel
      for (let i = 0; i < 4; i++) {
        const age = (t * 2.2 + i / 4 + wx * 0.01) % 1, px = wcx - r - Math.floor(age * 10) - i, py = wcy + ry - 1 - Math.floor(Math.sin(age * Math.PI) * (3 + i));
        ctx.fillStyle = P.dust; ctx.globalAlpha = 0.6 * (1 - age); ctx.fillRect(px * c, py * c, c, c); ctx.globalAlpha = 1;
      }
    }
    // the cage: its floor and back bars (the front bars come after the two of them)
    rect(-104, -56, 168, 64, 'rgba(20,16,19,0.5)');
    for (let x = -104; x <= 64; x += 21) if (x < -40 || x > 30) bar(x, -56, 8, P.barDark);
  },

  // THE SACKING coming off the pen: a weave of cells, lit threads here and there, sliding down with a sway; `p` is
  // how far it has come off (0..1).
  cloth(R, game, L, p) {
    const ctx = R.ctx, P = PROLOGUE_PAL, { w, h, c } = L;
    const cw = Math.ceil(w / c) + 40, ch = Math.ceil(h * 1.05 / c);
    const sack = this.bake(`sack:${cw}x${ch}`, cw, ch, (put) => {
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const r = this.hash(x, y + 900);
        put(x, y, (x % 3 === 0) !== (y % 3 === 0) ? P.sackDark : r < 0.04 ? P.sackLit : r > 0.97 ? P.thread : P.sack);
      }
      for (let i = 0; i < 12; i++) { const y = Math.round(this.hash(i, 51) * ch); for (let x = 0; x < cw; x++) if (this.hash(x, i) < 0.7) put(x, y + Math.round(Math.sin(x * 0.08 + i) * 1.5), P.thread); }
    });
    const e = p * p, drop = Math.floor(e * h * 1.2 / c) * c, sway = Math.floor(Math.sin(p * 7) * 14 * R.ts * (1 - p) / c) * c;
    this.blit(ctx, sack, -20 * c + sway, drop, c);
    ctx.fillStyle = `rgba(13,10,12,${((1 - p) * 0.6).toFixed(3)})`; ctx.fillRect(0, 0, w, h);
  },
};
