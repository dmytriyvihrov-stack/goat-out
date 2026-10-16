// THE SNOW (16 Oct 2026, his ask: "let us imagine a level with snow: the current mechanics, snow on top, tracks in it, or
// trodden deeper; a few short test rooms with the first zone's men, the same objects, snowed in").
// Nothing here changes a number of the fight: the snow is a look laid over the floor, the walls and the props, and
// what is written into it by whoever walks on it.
//   - `snowLevel(def, seed)`: the test floor `SNOW_LEVEL` (tuning.js, `snow` + `showroom`), laid like THE FACTORY's: five
//     short rooms in a row, THE ALTAR's men (clubmen, hounds, a rifleman, a butcher at the end) and its furniture.
//   - The floor is a sheet of snow (`FLOOR_SHEET.KINDS.snow`, js/pixel-art.js: drifts, sparkle, the stone showing through
//     here and there); a wall's cap wears a blanket of it (`snowcap`) and icicles hang off its lip (`Snow.icicles`, from
//     `PaintedArt.drawWall`); every prop keeps its drawing and gets a cap of snow on whatever faces up (`Snow.capCanvas`,
//     asked by `PIXEL_ENV.draw` and js/prop-pixels.js's bake while `snowOn` is set for the prop being drawn, `Snow.propLook`).
//   - Tracks (`Snow.step`, in the play step): every `track.stride` px anyone covers lays a print in the decal canvas
//     (`world.dctx`, persistent for the floor): the goat's cloven hoof, a man's boot, a hound's paw, a big man's, left and
//     right of his line in turn; a roll and a flung body plough a streak. The prints are half-transparent, so a way walked
//     twice is darker than one walked once, and a tile walked `track.wear.at[n]` times is trodden out wider and deeper
//     (`world.snowWear`): the path appears by itself.
//   - Flakes (`Snow.drawFlakes`, from `Renderer.drawUI`): a few dozen cells of white falling across the screen.
// In THE SHOWROOM the snow room is a zone (`level.zones`): `Snow.at` reads the tile's own def, so the tracks and the caps
// stop at its walls.
const Snow = {
  // Whether a floor is under snow (16 Oct 2026, his: "snow on the fourth level"): THE SNOW's own test floor (`snow`), or any
  // level carrying the modifier (`mods` with 'snow', `LEVEL_MODS.snow`; THE ROAD). The one question every reader asks.
  look(def) { return !!(def && (def.snow || (def.mods && def.mods.includes('snow')))); },
  // A floor under the modifier wears THE SNOW's colours while it is on (its own stone would tint the sheet grey): the floor,
  // its alternate, the wall and its top, kept under `snowBare` and handed back by `undress`. The art pass's own copies
  // (`artPass`, `asPacked`, js/pixel-art.js `ART_PASS.set`) are dressed too, so a switch of the pass keeps the snow.
  dress(def) {
    if (!def || def.snow || def.snowBare) return;
    const S = typeof SNOW_LEVEL !== 'undefined' ? SNOW_LEVEL : null; if (!S) return;
    const keys = ['floor', 'floorAlt', 'wall', 'wallTop'], take = (o) => (o ? Object.fromEntries(keys.map((k) => [k, o[k]])) : null);
    def.snowBare = { own: take(def), artPass: take(def.artPass), asPacked: take(def.asPacked) };
    for (const o of [def, def.artPass, def.asPacked]) if (o) for (const k of keys) o[k] = S[k];
  },
  undress(def) {
    const B = def && def.snowBare; if (!B) return;
    for (const [o, src] of [[def, B.own], [def.artPass, B.artPass], [def.asPacked, B.asPacked]]) if (o && src) Object.assign(o, src);
    delete def.snowBare;
  },
  // Snow under this spot: the level's own, or the zone's in THE SHOWROOM.
  at(game, x, y) {
    const L = game.level; if (!L) return false;
    if (this.look(L.def)) return true;
    if (!L.zones) return false;
    const w = game.world, tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) return false;
    const d = L.zoneDefs[L.zones[ty * w.W + tx]];
    return this.look(d);
  },
  on(game) { return !!(game.level && (this.look(game.level.def) || (game.goat && this.at(game, game.goat.x, game.goat.y)))); },
  start(game) {
    const w = game.world; if (!w) return;
    w.snowWear = null; w.snowMelt = null; this.meltT = 0;
    if (!(this.look(game.level.def) || (game.level.zoneDefs || []).some((d) => this.look(d)))) return;
    w.snowWear = new Uint8Array(w.W * w.H); w.snowMelt = new Uint8Array(w.W * w.H);
    // a lit bowl has thawed the snow round it to the wet ground (his: "by the brazier the snow is melted")
    const M = TUNING.snow.melt;
    for (const p of game.props) if (p.kind === 'brazier' && this.at(game, p.x, p.y)) this.thaw(game, p.x, p.y + 4, M.brazier * TILE);
    game.snowBits = [];
    for (const e of game.enemies) if (this.at(game, e.x, e.y)) e.snowK = 1;   // they have stood out here all along
    for (const e of game.level.statueMen || []) if (this.at(game, e.x, e.y)) e.snowK = 1;   // THE SHOWROOM's gallery
  },
  // Wet ground where the snow went: a blot of the ground's dark, a ring of slush round it dithered into the snow, in cells.
  thaw(game, x, y, r) {
    const c = TUNING.snow.cell, d = game.world.dctx, seed = (x * 5 + y * 11) | 0;
    const x0 = Math.round(x / c) * c, y0 = Math.round(y / c) * c, span = Math.ceil(r * 1.3 / c) * c;
    d.save();
    for (let oy = -span; oy <= span; oy += c) for (let ox = -span; ox <= span; ox += c) {
      const dd = Math.hypot(ox, oy) / r + (CombatFX.noise((x0 + ox) * 0.12, (y0 + oy) * 0.12, seed) - 0.5) * 0.45;
      if (dd >= 1.3) continue;
      if (dd < 0.75) { d.fillStyle = dd < 0.45 && CombatFX.bayer(ox / c, oy / c) < 0.15 ? PALETTE.snowGlint : PALETTE.snowWet; d.globalAlpha = 0.9; }
      else if (dd < 1) { d.fillStyle = PALETTE.snowDeep; d.globalAlpha = 0.75; }
      else if (CombatFX.bayer(ox / c, oy / c) < (1.3 - dd) * 2.4) { d.fillStyle = PALETTE.snowTrod; d.globalAlpha = 0.55; }
      else continue;
      d.fillRect(x0 + ox, y0 + oy, c, c);
    }
    d.restore();
  },
  // Fire on a snowy tile melts it once (his: "and fire melts it"): every `melt.every` s the burning tiles are looked over.
  melt(game, dt) {
    const w = game.world; if (!w.snowMelt) return;
    if ((this.meltT -= dt) > 0) return;
    this.meltT = TUNING.snow.melt.every;
    const r = TUNING.snow.melt.fire * TILE;
    for (let i = 0; i < w.fire.length; i++) {
      if (w.fire[i] <= 0 || w.snowMelt[i]) continue;
      const x = (i % w.W + 0.5) * TILE, y = (((i / w.W) | 0) + 0.5) * TILE;
      if (!this.at(game, x, y)) continue;
      w.snowMelt[i] = 1; this.thaw(game, x, y, r);
    }
  },
  // Who is drawn with snow on him right now: set round every prop (`Renderer.drawPropBody`) and the pillars.
  propLook(game, x, y) {
    const on = !!(game && game.world && game.world.snowWear && this.at(game, x, y));
    if (typeof PIXEL_ENV !== 'undefined') PIXEL_ENV.snowOn = on;
    if (typeof PROP_PIXELS !== 'undefined') PROP_PIXELS.snowOn = on;
    return on;
  },
  off() { if (typeof PIXEL_ENV !== 'undefined') PIXEL_ENV.snowOn = false; if (typeof PROP_PIXELS !== 'undefined') PROP_PIXELS.snowOn = false; },

  // ---- tracks -----------------------------------------------------------------------------------------------------
  step(game, dt) {
    const w = game.world; if (!w || !w.snowWear) return;
    this.melt(game, dt); this.settle(game, dt); this.updateBits(game, dt);
    const g = game.goat;
    if (g && !g.dead) this.walker(game, g, 'goat');
    for (const e of game.liveEnemies) {
      if (e.dead || e.held || e.ghosted || e.state === 'hop' || e.state === 'hidden' || e.statue || e.aloft) continue;
      this.walker(game, e, e.kind === 'dog' ? 'dog' : e.kind === 'butcher' || e.champion || e.boss ? 'big' : 'man');
    }
  },
  // One body's distance since its last print; past `stride` a print at its feet, left and right of its line in turn.
  walker(game, o, kind) {
    const S = TUNING.snow.track;
    if (o.snowX === undefined) { o.snowX = o.x; o.snowY = o.y; o.snowD = 0; o.snowSide = 1; return; }
    const dx = o.x - o.snowX, dy = o.y - o.snowY, d = Math.hypot(dx, dy);
    if (d < 0.5) return;
    // in the air (carried, thrown, falling, vaulting) nothing touches the snow; the spot moves with him all the same
    const air = o === game.goat ? (o.state === 'carried' || o.state === 'tossed' || o.state === 'falling' || o.leap) : (o.z > 0);
    if (air || !this.at(game, o.x, o.y)) { o.snowX = o.x; o.snowY = o.y; return; }
    const roll = o === game.goat && o.state === 'roll', flung = o !== game.goat && o.flung;
    o.snowD += d;
    const stride = roll || flung ? S.stride * 0.5 : S.stride;
    if (o.snowD < stride) return;
    o.snowD = 0;
    const ux = dx / d, uy = dy / d;
    if (roll || flung) this.streak(game, o.x, o.y, ux, uy, roll ? TUNING.snow.print.roll : TUNING.snow.print.flung);
    else {
      o.snowSide = -o.snowSide;
      this.print(game, o.x - uy * S.side * o.snowSide, o.y + ux * S.side * o.snowSide, ux, uy, kind);
    }
    this.wear(game, o.x, o.y);
    o.snowX = o.x; o.snowY = o.y;
  },
  // A print as cells in the decal canvas: `w` cells across the line, `l` along it, the goat's split in two.
  print(game, x, y, ux, uy, kind) {
    const P = TUNING.snow.print, c = TUNING.snow.cell, [pw, pl] = P[kind] || P.man, d = game.world.dctx;
    d.save(); d.globalAlpha = TUNING.snow.track.alpha; d.fillStyle = PALETTE.snowTrod;
    // along the line in whole cells, so a print stays square whichever way he goes: the four headings nearest his own
    const ax = Math.abs(ux) >= Math.abs(uy), W = ax ? pl : pw, H = ax ? pw : pl;
    const x0 = Math.round(x / c) * c - (W * c) / 2, y0 = Math.round(y / c) * c - (H * c) / 2;
    if (kind === 'goat') {
      // cloven: two toes with the cleft between them, the cleft across the line
      if (ax) { d.fillRect(x0, y0, W * c, c); d.fillRect(x0, y0 + (H - 1) * c, W * c, c); }
      else { d.fillRect(x0, y0, c, H * c); d.fillRect(x0 + (W - 1) * c, y0, c, H * c); }
    } else d.fillRect(x0, y0, W * c, H * c);
    d.restore();
  },
  // A body ploughing the snow: a wide bar of cells along the line.
  streak(game, x, y, ux, uy, half) {
    const c = TUNING.snow.cell, d = game.world.dctx, ax = Math.abs(ux) >= Math.abs(uy);
    const W = ax ? Math.round(TUNING.snow.track.stride * 0.6) : half * 2, H = ax ? half * 2 : Math.round(TUNING.snow.track.stride * 0.6);
    d.save(); d.globalAlpha = TUNING.snow.track.alpha * 0.8; d.fillStyle = PALETTE.snowTrod;
    d.fillRect(Math.round((x - W / 2) / c) * c, Math.round((y - H / 2) / c) * c, Math.ceil(W / c) * c, Math.ceil(H / c) * c);
    d.restore();
  },
  // The tile under a print counts its visits; at each count in `wear.at` the snow round the spot is trodden out:
  // a blot of cells dithered away at its edge, the second time deeper and wider. Many feet make a path.
  wear(game, x, y) {
    const w = game.world, S = TUNING.snow.track.wear, tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) return;
    const i = ty * w.W + tx, n = Math.min(255, w.snowWear[i] + 1); w.snowWear[i] = n;
    const k = S.at.indexOf(n); if (k < 0) return;
    const c = TUNING.snow.cell, r = S.r[k], d = w.dctx, seed = (x * 7 + y * 13) | 0;
    d.save(); d.globalAlpha = S.alpha; d.fillStyle = k ? PALETTE.snowDeep : PALETTE.snowTrod; d.beginPath();
    const x0 = Math.round(x / c) * c, y0 = Math.round(y / c) * c, span = Math.ceil(r / c) * c;
    for (let oy = -span; oy <= span; oy += c) for (let ox = -span; ox <= span; ox += c) {
      const dd = Math.hypot(ox, oy) / r + (CombatFX.noise((x0 + ox) * 0.2, (y0 + oy) * 0.2, seed) - 0.5) * 0.4;
      if (dd < 1 && CombatFX.bayer(ox / c, oy / c) < 1.3 - dd * 1.3) d.rect(x0 + ox, y0 + oy, c, c);
    }
    d.fill(); d.restore();
  },

  // ---- the look ---------------------------------------------------------------------------------------------------
  // Snow on a drawing: `src`'s region (`sx`, `sy`, `w`, `h`) copied, and on every run of `cap.run` texels or more whose
  // texel above is empty (a top edge: a lid, a rim, a rail) a cap `cap.depth` of the sprite's height deep, a little
  // deeper in the middle of the run, laid from the first texel under the outline down: the outline stays, the snow sits
  // inside it. `cell` is the texel in px (the packed atlas 1, js/prop-pixels.js's bake `UP`). Same silhouette throughout.
  // 17 Oct 2026, his: "nicer snow on the objects": the snow is a HEAP sitting on the object's top, not paint inside it. On
  // every run of `cap.run` texels or more whose texel above is empty, a pillow `cap.heap` × the run long tall (`cap.max`
  // texels at most) rises over the outline, round at both ends, a texel lower here and there; it drapes one texel over each
  // end of the run (a lip), now and then with a drip under the lip, and is outlined in the snow's own ink, so a white heap
  // still reads against the white floor. The face under it is powdered (`cap.powder` texels deep, dithered). The canvas is
  // `padTop` px taller than the source (the heap's room); every caller draws the source's part where it always was.
  // Both read the silhouette's TOP CONTOUR only (`contour`): in each column of `cell` px the highest opaque pixel, and the
  // runs of columns along which it climbs or falls no more than `slope` cells a column (a lid, the back edge of a table top,
  // shoulders), never the steep sides. The cells are laid off each column's own top pixel, so they sit on the art's pixels
  // whatever its grain (the first cut sampled a grid the atlas did not share, and its snow came out a comb).
  contour(src, sx, sy, w, h, cell, slope) {
    const rd = document.createElement('canvas'); rd.width = w; rd.height = h;
    const rg = rd.getContext('2d'); rg.imageSmoothingEnabled = false; rg.drawImage(src, sx, sy, w, h, 0, 0, w, h);
    const d = rg.getImageData(0, 0, w, h).data, n = Math.floor(w / cell), top = new Int32Array(n).fill(-1);
    for (let I = 0; I < n; I++) for (let x = I * cell; x < I * cell + cell; x++) for (let y = 0; y < h; y++) if (d[(y * w + x) * 4 + 3] > 110) { if (top[I] < 0 || y < top[I]) top[I] = y; break; }
    const runs = [];
    for (let I = 0; I < n;) {
      if (top[I] < 0) { I++; continue; }
      let J = I + 1; while (J < n && top[J] >= 0 && Math.abs(top[J] - top[J - 1]) <= slope * cell) J++;
      runs.push([I, J]); I = J;
    }
    const opaque = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] > 110;
    return { rd, top, runs, opaque, n };
  },
  // The snow as cells over a contour (both the props' cap and the men's dusting): along each run of the top, a COVER lying on
  // the top face, `cover` of the drawing's height deep (`coverMin`..`coverMax` cells), its lower edge wavy and in shade, a
  // drip a cell or two longer here and there ending in a drop; over it a low heap `heap` cells over the outline, round at the
  // run's ends, with a lip draping over each end where there is air. Tones: 1 white, 2 snow, 3 mid, 4 shade.
  coverCells(K, cell, C, h, hash, w) {
    const cells = [], deep = Math.max(C.coverMin, Math.min(C.coverMax, Math.round(h / cell * C.cover)));
    for (const [I0, I1] of K.runs) {
      const len = I1 - I0; if (len < C.run) continue;
      const ph = hash(I0, len) * 6.28, B = Math.min(C.heap, Math.max(0, Math.round(len / 6)));
      for (let I = I0; I < I1; I++) {
        const t = (I - I0 + 0.5) / len, end = I === I0 || I === I1 - 1, top = K.top[I], x = I * cell;
        // the heap over the outline: round at its ends
        const up = end ? Math.min(1, B) : Math.max(B ? 1 : 0, Math.round(B * Math.pow(Math.sin(Math.PI * t), 0.5)));
        for (let q = 1; q <= up; q++) cells.push([x, top - q * cell, q === up ? 1 : 2]);
        // the cover on the face, its lower edge in a slow wave, a drip now and then (never at the run's ends)
        let dn = deep + Math.round(Math.sin(ph + I * 0.7) * 0.9) - (end ? 1 : 0);
        const drip = !end && len > 4 && hash(I, top) < C.drip ? 1 + (hash(I + 3, top) < 0.4 ? 1 : 0) : 0;
        dn = Math.max(1, dn);
        for (let q = 0; q < dn + drip; q++) {
          const y = top + C.under + q * cell;
          if (!K.opaque(x + cell / 2, y + cell / 2)) break;
          const last = q === dn + drip - 1;
          cells.push([x, y, q === 0 ? (up ? 2 : 1) : last ? 4 : q >= dn - 1 ? 3 : 2]);
        }
      }
      // the lip over each end where there is air
      for (const [I, from] of [[I0 - 1, I0], [I1, I1 - 1]]) {
        const x = I * cell, y = K.top[from];
        if (x < 0 || x + cell > w || K.opaque(x + cell / 2, y - cell / 2) || !B) continue;
        cells.push([x, y - cell, 2]);
        if (!K.opaque(x + cell / 2, y + cell / 2)) cells.push([x, y, 4]);
      }
    }
    return cells;
  },
  capCanvas(src, sx, sy, w, h, cell) {
    const C = TUNING.snow.cap, pad = (C.heap + 2) * cell, c = document.createElement('canvas'); c.width = w; c.height = h + pad; c.padTop = pad;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const K = this.contour(src, sx, sy, w, h, cell, C.slope), hash = (i, j) => (Math.imul(i * 73 + j * 151 + 7, 2654435761) >>> 0) % 100 / 100;
    g.drawImage(K.rd, 0, pad);
    const cells = this.coverCells(K, cell, C, h, hash, w);
    // the snow's own ink round the heap where it meets the air (above and to its sides), never over the object; then the snow
    const tone = [null, '#ffffff', PALETTE.snow, PALETTE.snowMid, PALETTE.snowShade];
    const mine = new Set(cells.map(([x, y]) => x + ',' + y));
    g.fillStyle = PALETTE.snowInk;
    for (const [x, y] of cells) for (const [ox, oy] of [[0, -cell], [-cell, 0], [cell, 0]]) {
      const X = x + ox, Y = y + oy;
      if (mine.has(X + ',' + Y) || K.opaque(X + cell / 2, Y + cell / 2) || X < 0 || X + cell > w) continue;
      g.fillRect(X, Y + pad, cell, cell);
    }
    for (const [x, y, v] of cells) { g.fillStyle = tone[v]; g.fillRect(x, y + pad, cell, cell); }
    return c;
  },
  // Snow settled on a man (17 Oct 2026, his: "and the men get a dusting of snow if they stand still"): the frame's own size,
  // empty but for snow just under every top edge of his silhouette (the hood, the shoulders, a hound's back), the outline
  // kept, in three steps (`lv`): a scatter, a line, a thick line with powder under it. Baked once per frame and step.
  dust(src, sx, sy, w, h, cell, lv, key) {
    this.dusts ||= new Map(); this.dustsW ||= new WeakMap();
    const id = key || src, store = key ? this.dusts : this.dustsW;
    let m = store.get(id); if (!m) { m = []; store.set(id, m); }
    if (m[lv]) return m[lv];
    // the props' cover, thinner and with no heap (the frame has no room over his head), deeper at each step: a thin cap on
    // the hood and the shoulders, then a thick one; at the first step only the widest runs
    const D = TUNING.snow.dust, K = this.contour(src, sx, sy, w, h, cell, D.slope);
    const hash = (i, j) => (Math.imul(i * 97 + j * 131 + 3, 2654435761) >>> 0) % 100 / 100;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const C = { run: lv === 1 ? D.run + 2 : D.run, heap: 0, cover: 0, coverMin: D.deep[lv - 1], coverMax: D.deep[lv - 1], under: D.under, drip: lv >= 3 ? D.drip : 0 };
    const tone = [null, '#ffffff', PALETTE.snow, PALETTE.snowMid, PALETTE.snowShade];
    for (const [x, y, v] of this.coverCells(K, cell, C, h, hash, w)) { g.fillStyle = tone[v]; g.fillRect(x, y, cell, cell); }
    return (m[lv] = c);
  },
  // How much snow sits on each man: on snow and standing still it settles over `settle.time` s; once he moves faster than
  // `settle.move` px/s it is shaken off at once, a handful of flakes of it falling round him (`game.snowBits`). The men
  // standing in a room the goat has not reached yet have stood there all along: they start under it.
  settle(game, dt) {
    const S = TUNING.snow.settle;
    for (const e of game.liveEnemies) {
      if (e.dead || e.held || e.ghosted || e.statue) continue;
      const lx = e.snowLX === undefined ? e.x : e.snowLX, ly = e.snowLY === undefined ? e.y : e.snowLY;
      const sp = Math.hypot(e.x - lx, e.y - ly) / Math.max(dt, 1e-4); e.snowLX = e.x; e.snowLY = e.y;
      if (!this.at(game, e.x, e.y)) { e.snowK = 0; continue; }
      if (sp > S.move || e.flung || e.state === 'hop') { if ((e.snowK || 0) > S.shake) this.shake(game, e); e.snowK = 0; }
      else e.snowK = Math.min(1, (e.snowK || 0) + dt / S.time);
    }
  },
  shake(game, e) {
    const S = TUNING.snow.settle, list = game.snowBits ||= [], n = Math.round(S.bits * e.snowK);
    for (let k = 0; k < n && list.length < S.cap; k++) {
      const a = Math.random() * Math.PI * 2, r = e.r * (0.3 + Math.random() * 0.7);
      list.push({ x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r * 0.5, z: S.z * (0.5 + Math.random() * 0.5), vx: Math.cos(a) * 30, vy: Math.sin(a) * 15, vz: 20 + Math.random() * 40 });
    }
  },
  updateBits(game, dt) {
    const list = game.snowBits; if (!list || !list.length) return;
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i]; b.vz -= 420 * dt; b.z += b.vz * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.z <= 0) list.splice(i, 1);
    }
  },
  drawBits(R, game) {
    const list = game.snowBits; if (!list || !list.length || R.silPass) return;
    const ctx = R.ctx, c = TUNING.snow.cell * 0.6;
    for (const b of list) {
      const y = b.y - b.z * TILT;
      ctx.fillStyle = PALETTE.snowInk; ctx.fillRect(Math.round(b.x), Math.round(y) + c, c, c * 0.5);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(b.x), Math.round(y), c, c);
    }
  },
  // Icicles off a wall's lip (the top of its south face), a few a tile at places of their own, in world px.
  icicles(ctx, x, y, tx) {
    const n = TUNING.snow.wall.icicles, h = (tx * 2654435761 >>> 0);
    ctx.fillStyle = PALETTE.ice;
    for (let k = 0; k < n; k++) {
      const q = (h >>> (k * 5)) & 31, ox = 3 + (q * 0.8) % (TILE - 8), len = 3 + (q % 4);
      ctx.fillRect(x + ox, y, 2, len); ctx.fillRect(x + ox, y + len, 1, 1);
    }
    ctx.fillStyle = PALETTE.snow;
    for (let k = 0; k < n; k++) { const q = ((h >>> (k * 5)) & 31), ox = 3 + (q * 0.8) % (TILE - 8); ctx.fillRect(x + ox, y, 1, 2); }
  },
  // Flakes over the picture, in screen space: cells of white drifting down, the near ones bigger and quicker.
  drawFlakes(R, game) {
    if (!this.on(game) || R.silPass) return;
    const F = TUNING.snow.flakes, ctx = R.ctx, w = R.vw, h = R.vh, t = R.t, c = Math.max(2, Math.round(2 * R.s));
    ctx.save(); ctx.fillStyle = PALETTE.snow;
    for (let i = 0; i < F.n; i++) {
      const hh = (Math.imul(i + 1, 2654435761) >>> 0), x0 = (hh % 1000) / 1000, y0 = ((hh >>> 10) % 1000) / 1000, sp = 0.6 + ((hh >>> 20) % 100) / 100 * 0.8;
      const big = i < F.n * F.big, size = big ? c * 2 : c;
      const y = ((y0 * h + t * F.fall * sp * R.s * (big ? 1.5 : 1)) % (h + size)) - size;
      const x = ((x0 * w + Math.sin(t * 0.7 + i) * F.drift * R.s + t * F.drift * 0.4 * R.s) % (w + size) + w + size) % (w + size) - size;
      ctx.globalAlpha = F.alpha * (big ? 1 : 0.7);
      ctx.fillRect(Math.round(x), Math.round(y), size, size);
    }
    ctx.restore();
  },
};

// ---- THE SNOW test floor ------------------------------------------------------------------------------------------
// Laid, not rolled (`SNOW_LEVEL.snow`, from `generateLevel`), after THE FACTORY's recipe: five rooms in a row on a small world,
// every tile stone but what is carved, no fog surprises (`seen`). THE ALTAR's men and its furniture, nothing of the
// factory's: the point is the snow on things already known. 0 the way in, 1 THE YARD (three clubmen among bowls, crates,
// barrels and tables), 2 THE KENNEL (two hounds and a clubman, lamps), 3 THE POST (a rifleman behind the tables, two
// clubmen, pillars to break his line), 4 THE RING (a butcher with two at his back, the stairs out).
function snowLevel(def, seed) {
  const W = 130, H = 32, tiles = new Uint8Array(W * H).fill(T.WALL);
  def.met = new Set(Object.keys(THREAT)); def.known = new Set();
  const rooms = [], props = [], spawns = [], hints = [], controls = [], chasms = [], gaps = new Set(), windows = new Set(), carpets = [], grass = [];
  const at = (x, y) => y * W + x, P = (tx, ty) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
  const put = (kind, tx, ty, opts) => props.push(Object.assign(P(tx, ty), { kind }, opts || {}));
  const label = (text, tx, ty, w, big) => hints.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, w: (w || 6) * TILE, text, big: !!big });
  const fill = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[at(x, y)] = t; };
  const room = (x, y, w, h, name) => {
    fill(x + 1, y + 1, x + w - 2, y + h - 2, T.FLOOR);
    const r = { x, y, w, h, index: rooms.length, markers: [], role: name === 'the ring' ? 'arena' : 'mix', seen: true, drawn: false, name, tpl: { name, rows: [] } };
    rooms.push(r); return r;
  };
  const man = (kind, tx, ty, opts) => spawns.push(Object.assign(P(tx, ty), spawnKind(kind), { roomIndex: rooms.length - 1 }, opts || {}));
  const mid = 14;
  let x = 4, prev = null;
  const join = (r) => { if (prev) fill(prev.x + prev.w - 1, mid, r.x, mid + 2, T.FLOOR); prev = r; };
  // 0: the way in
  { const r = room(x, mid - 4, 10, 10, 'the way in'); join(r);
    label('THE SNOW · A TEST FLOOR', x + 5, mid - 2, 8, true); label('THE FIRST FLOOR\'S MEN, SNOWED IN', x + 5, mid - 1, 8);
    put('crate', x + 2, mid + 3); put('weapon', x + 7, mid + 3, { weapon: 'sword' });
    x += 10 + 3; }
  // 1: THE YARD: three clubmen among the bowls, crates, barrels and two tables
  { const r = room(x, mid - 6, 16, 14, 'the yard'); join(r);
    const ix = x + 1, iy = mid - 5;
    label('THE YARD', ix + 7, iy + 0.5, 8);
    put('brazier', ix + 2, iy + 2); put('brazier', ix + 11, iy + 9);
    put('crate', ix + 5, iy + 1); put('crate', ix + 6, iy + 1); put('crate', ix + 2, iy + 9);
    put('barrel', ix + 12, iy + 2); put('table', ix + 7.5, iy + 6.5); put('table', ix + 9.5, iy + 6.5);
    man('bearer', ix + 4, iy + 4); man('bearer', ix + 11, iy + 5); man('bearer', ix + 8, iy + 10);
    x += 16 + 3; }
  // 2: THE KENNEL, long and low: two hounds and a clubman, lamps at both ends, a shield on a stand
  { const r = room(x, mid - 4, 20, 10, 'the kennel'); join(r);
    const ix = x + 1, iy = mid - 3;
    label('THE KENNEL', ix + 9, iy + 0.5, 8);
    put('lamp', ix + 1, iy + 1); put('lamp', ix + 16, iy + 6); put('weapon', ix + 2, iy + 6, { weapon: 'shield' }); put('crate', ix + 10, iy + 1);
    man('dog', ix + 8, iy + 3); man('dog', ix + 14, iy + 5); man('bearer', ix + 12, iy + 2);
    x += 20 + 3; }
  // 3: THE POST: a rifleman at the back behind two tables, two clubmen, three pillars to break his line, barrels
  { const r = room(x, mid - 7, 22, 16, 'the post'); join(r);
    const ix = x + 1, iy = mid - 6;
    label('THE POST', ix + 10, iy + 0.5, 8);
    for (const [dx, dy] of [[6, 4], [10, 9], [14, 4]]) tiles[at(ix + dx, iy + dy)] = T.WALL;
    put('table', ix + 16.5, iy + 6.5); put('table', ix + 16.5, iy + 8.5);
    put('barrel', ix + 3, iy + 11); put('barrel', ix + 4, iy + 11); put('crate', ix + 2, iy + 2); put('crate', ix + 12, iy + 12);
    put('heal', ix + 18, iy + 12);
    man('hunter', ix + 18, iy + 7); man('bearer', ix + 8, iy + 7); man('bearer', ix + 13, iy + 2);
    x += 22 + 3; }
  // 4: THE RING: a butcher with two clubmen at his back, two bowls, two stands, the stairs out
  { const r = room(x, mid - 7, 18, 16, 'the ring'); join(r);
    const ix = x + 1, iy = mid - 6;
    put('brazier', ix + 2, iy + 2); put('brazier', ix + 2, iy + 11);
    put('weapon', ix + 14, iy + 1, { weapon: 'sword' }); put('weapon', ix + 14, iy + 12, { weapon: 'sword' });
    put('crate', ix + 6, iy + 12); put('barrel', ix + 13, iy + 6);
    man('champion', ix + 11, iy + 6, { boss: true, elite: true }); man('bearer', ix + 13, iy + 3); man('bearer', ix + 13, iy + 10); }
  // the way out: the last room's far wall, a flight of stairs behind an iron door, as every floor's
  const last = rooms[rooms.length - 1], ey = mid;
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) tiles[at(last.x + last.w - 1 + dx, ey + dy)] = T.EXIT;
  props.push({ x: (last.x + last.w - 1.5) * TILE, y: (ey + 1) * TILE, kind: 'door', vertical: true, iron: true, stair: true, fromRoom: last.index });
  const first = rooms[0];
  return { W, H, tiles, rooms, spawns, props, start: P(first.x + 3, mid + 1), exit: { x: (last.x + last.w) * TILE, y: (ey + 1) * TILE },
    exitTile: { x0: last.x + last.w - 1, y0: ey }, forkTile: null, entry: null, seed, def,
    hints, controls, chasms, gaps, cagePrompt: null, vault: null, windows, plan: null, gates: [], sealedArenas: [], shop: null,
    grass, zones: null, zoneDefs: null, carpets, statues: null, sacrifice: null, machines: [] };
}
// Every level dealt under the modifier wears the snow's colours from the start (`Snow.dress`); the dev drawer's LEVEL tab
// dresses and undresses one as its MODS chip is thrown (`Game.devAction` 'level-mod=').
if (typeof LEVELS !== 'undefined') for (const lv of LEVELS) if (Snow.look(lv)) Snow.dress(lv);
if (typeof module !== 'undefined') module.exports = { Snow, snowLevel };
