// THE DARK, drawn. `TUNING.dark` holds the numbers and `darkLevel` (tuning.js) the floor itself;
// this is only the picture, and nothing in the simulation reads any of it (what the cult sees in the
// dark is `game.litAt`, its own line to the flames). Three layers go down over the finished world, before the floor words and the
// fog of sight (`Renderer.draw`):
//   1. the dark itself, a mask at `res` cells a tile, cleared by light cast from every flame through
//      the tiles (a brazier never lights the far side of a wall) and by the goat's hearing round him;
//   2. inside that hearing, everything standing that no flame reaches, redrawn as one flat shape with
//      a cold rim — a silhouette, never a face or a colour;
//   3. what must still read in the dark: every windup (pillar 4 does not switch off with the
//      lamps), and the eyes of the kinds whose eyes catch light (`dark.eyes`), from across a room.
const Dark = {
  on(game) {
    return !!(game.level && game.world && (game.level.def.dark || game.dev.dark))
      && game.state !== 'intro' && game.state !== 'dead';
  },

  // Every flame in reach of the view: [x, y, radius in tiles, strength]. Fire on the floor is the
  // many small ones and is capped (`maxFires`), nearest the goat first by the scan order not
  // mattering much: a floor that far alight is lit either way.
  sources(game, x0, y0, x1, y1) {
    const D = TUNING.dark, L = D.lights, wd = game.world, out = [], m = 6;
    const near = (x, y) => x >= (x0 - m) * TILE && x <= (x1 + m) * TILE && y >= (y0 - m) * TILE && y <= (y1 + m) * TILE;
    const add = (x, y, l, k = 1) => { if (near(x, y)) out.push([x, y, l[0], l[1] * k]); };
    for (const p of game.props) {
      if (p.broken) continue;
      if (p.kind === 'brazier') add(p.x, p.y, L.brazier);
      else if (p.kind === 'lamp') add(p.x, p.y, L.lamp);
      else if (p.kind === 'sconce') add(p.x, p.y, L.sconce);
      else if (p.kind === 'barrel' && p.oilT >= 0) add(p.x, p.y, L.burning);   // lit oil, as bright as a man alight
    }
    // Fire on the floor is cast a two-by-two block at a time, from the middle of what burns in it
    // and half a tile further: a room gone up in oil was a hundred shadowcasts a frame.
    let fires = 0;
    const bx0 = Math.max(0, x0 - 2) >> 1, bx1 = Math.min(wd.W - 1, x1 + 2) >> 1;
    const by0 = Math.max(0, y0 - 2) >> 1, by1 = Math.min(wd.H - 1, y1 + 2) >> 1;
    for (let by = by0; by <= by1 && fires < D.maxFires; by++) for (let bx = bx0; bx <= bx1 && fires < D.maxFires; bx++) {
      let n = 0, sx = 0, sy = 0;
      for (let ty = by * 2; ty < by * 2 + 2 && ty < wd.H; ty++) for (let tx = bx * 2; tx < bx * 2 + 2 && tx < wd.W; tx++) {
        if (wd.fire[ty * wd.W + tx] > 0) { n++; sx += tx + 0.5; sy += ty + 0.5; }
      }
      if (n) { out.push([sx / n * TILE, sy / n * TILE, L.fire[0] + (n > 1 ? 0.5 : 0), Math.min(1, L.fire[1] * (1 + 0.08 * (n - 1)))]); fires++; }
    }
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (e.burning > 0) add(e.x, e.y, L.burning);
      else if (e.soul && !e.ghosted) add(e.x, e.y, L.bearer);
      if (e.rune && e.state === 'cast') add(e.rune.x, e.rune.y, L.rune);
    }
    const g = game.goat;
    if (g && g.onFire) add(g.x, g.y, L.burning);
    for (const s of game.souls) if (!s.taken) add(s.x, s.y, L.soul);
    const ex = game.level.exitTile;
    if (ex) add((ex.x0 + 0.5) * TILE, (ex.y0 + 0.5) * TILE, L.exit);
    for (const b of game.fx.bursts) {
      if (b.smokeOnly || b.blood || b.t < 0) continue;
      const k = 1 - b.t / 0.4;
      if (k > 0) add(b.x, b.y, L.blast, k);
    }
    const M = TUNING.juice.muzzle;
    for (const f of game.flares) add(f.x, f.y, L.muzzle, clamp(f.life / M.life, 0, 1));
    return out;
  },

  // The light a flame at (sx, sy) throws, cast through the tiles by the same symmetric shadowcast the
  // goat's own sight uses (`World.castVis`), into `this.map`, `res` cells a tile over the view box.
  castFrom(wd, s, t) {
    const [sx, sy, rT, k0] = s, R = this.res, box = this.box;
    const k = k0 * (1 - TUNING.dark.flicker * (0.5 + 0.5 * Math.sin(t * 9.3 + sx * 0.071 + sy * 0.037)));
    const cx = Math.floor(sx / TILE), cy = Math.floor(sy / TILE), rr = Math.ceil(rT);
    if (cx + rr < box.x0 || cx - rr > box.x1 || cy + rr < box.y0 || cy - rr > box.y1) return;
    const stamp = ++this.stampN, st = this.stamp, W = wd.W, H = wd.H;
    const tiles = this.hit; tiles.length = 0;
    const mark = (tx, ty) => { if (tx < 0 || ty < 0 || tx >= W || ty >= H) return; const i = ty * W + tx; if (st[i] !== stamp) { st[i] = stamp; tiles.push(i); } };
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) mark(cx + dx, cy + dy);
    // Tall grass hides from eyes, not from a flame: it joins `visBlock` only past `grass.seeInto` of
    // the goat, so letting it stop light made a lamp's pool change shape as he walked, and drew him
    // black where `game.litAt` (which the men read) had him lit. A shut door still stops it.
    const solid = (tx, ty) => { if (tx < 0 || ty < 0 || tx >= W || ty >= H || wd.isSolid(tx, ty)) return true; const i = ty * W + tx; return wd.visBlock[i] === 1 && !wd.grass[i]; };
    const cast = (row, start, end, xx, xy, yx, yy) => {
      if (start < end) return;
      let newStart = 0;
      for (let i = row; i <= rr; i++) {
        let blocked = false;
        for (let dx = -i, dy = -i; dx <= 0; dx++) {
          const tx = cx + dx * xx + dy * xy, ty = cy + dx * yx + dy * yy;
          const lSlope = (dx - 0.5) / (dy + 0.5), rSlope = (dx + 0.5) / (dy - 0.5);
          if (start < rSlope) continue;
          if (end > lSlope) break;
          if (dx * dx + dy * dy <= rr * rr) mark(tx, ty);
          const s2 = solid(tx, ty);
          if (blocked) {
            if (s2) { newStart = rSlope; continue; }
            blocked = false; start = newStart;
          } else if (s2 && i < rr) {
            blocked = true; cast(i + 1, start, lSlope, xx, xy, yx, yy); newStart = rSlope;
          }
        }
        if (blocked) break;
      }
    };
    if (!solid(cx, cy)) for (const m of VIS_OCTANTS) cast(1, 1, 0, m[0], m[1], m[2], m[3]);
    const nx = this.nx, map = this.map, span = rT * TILE, inv = 1 / span;
    for (const i of tiles) {
      const tx = i % W, ty = (i / W) | 0;
      if (tx < box.x0 || tx > box.x1 || ty < box.y0 || ty > box.y1) continue;
      for (let sy2 = 0; sy2 < R; sy2++) {
        const wy = (ty + (sy2 + 0.5) / R) * TILE, row = ((ty - box.y0) * R + sy2) * nx * R + (tx - box.x0) * R;
        const ddy = (wy - sy) * inv, ddy2 = ddy * ddy;
        if (ddy2 >= 1) continue;
        for (let sx2 = 0; sx2 < R; sx2++) {
          const ddx = ((tx + (sx2 + 0.5) / R) * TILE - sx) * inv, d2 = ddx * ddx + ddy2;
          if (d2 >= 1) continue;
          const f = 1 - d2, v = Math.min(1, k * f * f * 1.2);
          map[row + sx2] = 1 - (1 - map[row + sx2]) * (1 - v);
        }
      }
    }
  },

  // How lit a point is, 0..1, off the last map built. Outside the view it is dark.
  lightAt(x, y) {
    const b = this.box; if (!b) return 0;
    const R = this.res, cx = Math.floor((x / TILE - b.x0) * R), cy = Math.floor((y / TILE - b.y0) * R);
    if (cx < 0 || cy < 0 || cx >= this.nx * R || cy >= this.ny * R) return 0;
    return this.map[cy * this.nx * R + cx];
  },

  canvas(key, w, h) {
    const old = this[key];
    if (old && old.width >= w && old.height >= h) return old;
    // Never smaller than the one it replaces: the view box breathes a tile each way as he runs.
    const c = this[key] = document.createElement('canvas');
    c.width = Math.max(w, old ? old.width : 0); c.height = Math.max(h, old ? old.height : 0);
    return c;
  },

  draw(r, game, cam) {
    const D = TUNING.dark, wd = game.world, ctx = r.ctx, g = game.goat, t = r.t;
    const v = r.visibleTiles(cam);
    const x0 = Math.max(0, v.x0), y0 = Math.max(0, v.y0), x1 = Math.min(wd.W - 1, v.x1), y1 = Math.min(wd.H - 1, v.y1);
    if (x1 < x0 || y1 < y0) return;
    const R = this.res = D.res, nx = this.nx = x1 - x0 + 1, ny = this.ny = y1 - y0 + 1, n = nx * R * ny * R;
    this.box = { x0, y0, x1, y1 };
    if (!this.map || this.map.length < n) this.map = new Float32Array(n);
    this.map.fill(0, 0, n);
    if (!this.stamp || this.stamp.length !== wd.W * wd.H) { this.stamp = new Int32Array(wd.W * wd.H); this.stampN = 0; }
    this.hit = this.hit || [];
    for (const s of this.sources(game, x0, y0, x1, y1)) this.castFrom(wd, s, t);

    // The two masks, one pass: the dark (alpha = how dark) and where a silhouette may stand (alpha =
    // how much of one: inside his hearing, and only as much as no flame already shows the thing).
    const mw = nx * R, mh = ny * R;
    const mc = this.canvas('maskC', mw, mh), sc = this.canvas('silM', mw, mh);
    const mx = mc.getContext('2d'), sx = sc.getContext('2d');
    // Sized to the biggest box yet: the view box flips a tile wider or narrower each time the camera
    // crosses a tile, and a fresh pair of buffers every time was steady garbage while he ran.
    if (!this.img || this.img.width < mw || this.img.height < mh) { this.img = mx.createImageData(Math.max(mw, this.img ? this.img.width : 0) + R, Math.max(mh, this.img ? this.img.height : 0) + R); this.simg = sx.createImageData(this.img.width, this.img.height); }
    const px = this.img.data, sp = this.simg.data, IW = this.img.width, [cr, cg, cb] = D.color;
    const hear = D.near, fl = D.floor, [selfR, selfK] = D.self, gx = g.x / TILE, gy = g.y / TILE;
    for (let j = 0; j < mh; j++) {
      const wy = y0 + (j + 0.5) / R, dy = wy - gy;
      for (let i = 0; i < mw; i++) {
        const ddx = x0 + (i + 0.5) / R - gx, dg = Math.sqrt(ddx * ddx + dy * dy), q = j * mw + i, o = (j * IW + i) * 4;
        const lit = this.map[q];
        const ear = clamp((hear - dg) / (hear * 0.45), 0, 1);
        const amb = Math.max(fl * ear, selfK * clamp(1 - dg / selfR, 0, 1));
        const dark = D.alpha * (1 - lit) * (1 - amb);
        px[o] = cr; px[o + 1] = cg; px[o + 2] = cb; px[o + 3] = dark * 255;
        sp[o] = 0; sp[o + 1] = 0; sp[o + 2] = 0; sp[o + 3] = D.sil * (1 - lit) * clamp((hear - dg) / (hear * 0.3), 0, 1) * 255;
      }
    }
    mx.putImageData(this.img, 0, 0, 0, 0, mw, mh); sx.putImageData(this.simg, 0, 0, 0, 0, mw, mh);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(mc, 0, 0, mw, mh, x0 * TILE, y0 * TILE, nx * TILE, ny * TILE);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;

    this.walls(r, game);
    this.silhouettes(r, game, cam, sc, mw, mh);
    this.readable(r, game);
    this.eyes(r, game);
  },

  // The stone round him (`dark.edge`): every face where floor he can see meets wall, inside his
  // hearing, drawn as one world pixel of the silhouettes' cold rim — whole out to `from` of `near`,
  // gone at `near`. The dark is there to hide the men, not the room: a goat who cannot tell where
  // the wall is cannot put anybody into it (pillar 3). Only floor in his own sight, so nothing shows
  // through a wall; not in a cave, whose rock is not cut on the tile grid.
  walls(r, game) {
    const D = TUNING.dark, E = D.edge, wd = game.world, g = game.goat, ctx = r.ctx;
    if (wd.round || !g) return;
    const R = D.near, gx = g.x / TILE, gy = g.y / TILE;
    const x0 = Math.max(1, Math.floor(gx - R)), x1 = Math.min(wd.W - 2, Math.ceil(gx + R));
    const y0 = Math.max(1, Math.floor(gy - R)), y1 = Math.min(wd.H - 2, Math.ceil(gy + R));
    // A pillar is drawn as a column, not as tiles of wall: a square drawn round it read as a frame
    // round nothing (25 Sep 2026, "what is this outline?"). Stone in a clump of four tiles or fewer
    // is a pillar and gets no line; only a run of wall does.
    const big = new Map();
    const edge = (x, y) => {
      if (!wd.isSolid(x, y)) return false;
      const i = y * wd.W + x;
      if (big.has(i)) return big.get(i);
      const seen = new Set([i]), stack = [i];
      while (stack.length && seen.size <= 4) {
        const j = stack.pop(), jx = j % wd.W, jy = (j / wd.W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = jx + dx, ny = jy + dy, k = ny * wd.W + nx;
          if (!seen.has(k) && wd.isSolid(nx, ny)) { seen.add(k); stack.push(k); }
        }
      }
      const out = seen.size > 4;
      for (const j of seen) big.set(j, out);
      return out;
    };
    ctx.save(); ctx.fillStyle = D.rim;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (wd.isSolid(tx, ty) || !wd.seesTile(tx, ty)) continue;
      const a = E.alpha * clamp((R - Math.hypot(tx + 0.5 - gx, ty + 0.5 - gy)) / (R * (1 - E.from)), 0, 1);
      if (a <= 0.02) continue;
      ctx.globalAlpha = a;
      const X = tx * TILE, Y = ty * TILE;
      if (edge(tx, ty - 1)) ctx.fillRect(X, Y, TILE, 1);
      if (edge(tx, ty + 1)) ctx.fillRect(X, Y + TILE - 1, TILE, 1);
      if (edge(tx - 1, ty)) ctx.fillRect(X, Y, 1, TILE);
      if (edge(tx + 1, ty)) ctx.fillRect(X + TILE - 1, Y, 1, TILE);
    }
    ctx.restore();
  },

  // Everything standing inside his hearing, drawn again off-screen with the renderer pointed at it
  // (`renderer.silPass` keeps shadows, halos and windups out of it), cut to the silhouette mask,
  // then flattened to one colour with a rim one world pixel wide round the outside.
  silhouettes(r, game, cam, sc, mw, mh) {
    const D = TUNING.dark, ctx = r.ctx, g = game.goat, hold = g.holding;
    const reach = (D.near + 0.2) * TILE;
    // Only what stands: a crack in the wall, a lantern up on it, a grate in the floor are the room,
    // and flattened into a shape they read as something standing where nothing is.
    const list = [], flat = new Set(['secret', 'sconce', 'spike', 'clamp']);
    for (const p of game.props) if (!p.broken && p !== hold && !flat.has(p.kind) && Math.hypot(p.x - g.x, p.y - g.y) < reach + (p.r || 0) && !game.hidden(p.x, p.y)) list.push(p);
    const men = [];
    for (const e of game.enemies) if (!e.dead && e !== hold && Math.hypot(e.x - g.x, e.y - g.y) < reach + e.r && !game.hidden(e.x, e.y)) men.push(e);
    if (!list.length && !men.length) return;
    const m = ctx.getTransform(), W = r.w, H = r.h;
    // The screen box round his hearing, with a tile and a half over the top for whatever is tall.
    const pts = [[g.x - reach - TILE, g.y - reach - TILE * 2], [g.x + reach + TILE, g.y + reach + TILE]].map(([x, y]) => m.transformPoint(new DOMPoint(x, y)));
    const bx = Math.max(0, Math.floor(Math.min(pts[0].x, pts[1].x))), by = Math.max(0, Math.floor(Math.min(pts[0].y, pts[1].y)));
    const bw = Math.min(W, Math.ceil(Math.max(pts[0].x, pts[1].x))) - bx, bh = Math.min(H, Math.ceil(Math.max(pts[0].y, pts[1].y))) - by;
    if (bw < 2 || bh < 2) return;
    const A = this.canvas('silA', W, H), B = this.canvas('silB', W, H), a = A.getContext('2d'), b = B.getContext('2d');
    a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'source-over'; a.globalAlpha = 1; a.clearRect(bx, by, bw, bh);
    a.save(); a.beginPath(); a.rect(bx, by, bw, bh); a.clip();
    a.setTransform(m); a.imageSmoothingEnabled = false;
    const keep = r.ctx; r.ctx = a; r.silPass = true;
    try {
      for (const p of list) if (p.kind !== 'lamp') r.drawProp(p);
      for (const e of men) if (e.state === 'floored' || e.state === 'stunned') r.drawEnemy(e, game);
      for (const p of list) if (p.kind === 'lamp') r.drawProp(p);
      for (const e of men) if (e.state !== 'floored' && e.state !== 'stunned') r.drawEnemy(e, game);
    } finally { r.ctx = keep; r.silPass = false; }
    // Cut to the mask: only inside his hearing, and only what no flame is already showing.
    a.globalCompositeOperation = 'destination-in'; a.imageSmoothingEnabled = true;
    a.drawImage(sc, 0, 0, mw, mh, this.box.x0 * TILE, this.box.y0 * TILE, this.nx * TILE, this.ny * TILE);
    a.restore();
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.clearRect(bx, by, bw, bh);
    b.drawImage(A, bx, by, bw, bh, bx, by, bw, bh);
    b.globalCompositeOperation = 'source-in'; b.fillStyle = D.rim; b.fillRect(bx, by, bw, bh);
    b.globalCompositeOperation = 'source-over';
    a.setTransform(1, 0, 0, 1, 0, 0);
    a.globalCompositeOperation = 'source-in'; a.fillStyle = D.body; a.fillRect(bx, by, bw, bh);
    a.globalCompositeOperation = 'source-over';
    const o = Math.max(1, Math.round(cam.zoom));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const [dx, dy] of [[o, 0], [-o, 0], [0, o], [0, -o]]) ctx.drawImage(B, bx, by, bw, bh, bx + dx, by + dy, bw, bh);
    ctx.drawImage(A, bx, by, bw, bh, bx, by, bw, bh);
    ctx.restore();
  },

  // Every windup again, over the dark, as strong as the dark is deep where he stands: in firelight
  // the one drawn under it already reads, and in the black it is the only thing that does.
  readable(r, game) {
    const ctx = r.ctx;
    ctx.save();
    for (const e of game.enemies) {
      if (e.dead || e.state === 'hidden' || game.hidden(e.x, e.y)) continue;
      const dark = 1 - this.lightAt(e.x, e.y);
      if (dark < 0.05) continue;
      ctx.globalAlpha = dark;
      r.drawTelegraph(e); r.drawAimTelegraph(e); r.drawHopMark(e);
      // What is over his head sets its own alpha and is opaque, so only where the one under the dark
      // is mostly gone — and only for a man he can hear, or one shouting: the shout carries.
      const heard = Math.hypot(e.x - game.goat.x, e.y - game.goat.y) < (TUNING.dark.near + 0.5) * TILE;
      if (dark > 0.5 && (heard || e.say)) { ctx.save(); ctx.globalAlpha = 1; r.drawOverhead(e); ctx.restore(); }
    }
    ctx.globalAlpha = 0.85;
    r.drawDashPaths(game); r.drawRunes(game); r.drawBombFuse(game);
    ctx.restore();
  },

  // Two cells of light where the head is, for the kinds that have that kind of eye: seen as far as
  // `eyes.range` in his line of sight, never from behind, shut while he is down, and blinking.
  eyes(r, game) {
    const E = TUNING.dark.eyes, ctx = r.ctx, g = game.goat, wd = game.world, t = r.t, c = E.cell;
    ctx.save();
    for (const e of game.enemies) {
      const K = E.kinds[e.kind];
      if (!K || e.dead || e.state === 'hidden' || e.state === 'floored' || e.state === 'stunned' || e.state === 'flung' || e.state === 'emerge') continue;
      if (Math.hypot(e.x - g.x, e.y - g.y) > E.range * TILE || game.hidden(e.x, e.y)) continue;
      if (!wd.seesTile(Math.floor(e.x / TILE), Math.floor(e.y / TILE))) continue;
      const k = clamp(1 - this.lightAt(e.x, e.y) * 1.3, 0, 1) * (e.aware ? 1 : 0.7);
      if (k < 0.05) continue;
      if (e.eyeSeed === undefined) e.eyeSeed = Math.random();
      const gap = lerp(E.blinkGap[0], E.blinkGap[1], e.eyeSeed);
      if ((t + e.eyeSeed * 17) % gap < E.blinkTime) continue;
      const d = (Math.round((e.facing || 0) / (Math.PI / 4)) + 14) % 8;
      if (d >= 3 && d <= 5) continue;
      const [core, glow, h, f, half] = K;
      const sc = Renderer.bodyScaleOf(e);
      const side = d === 2 ? -1 : d === 6 ? 1 : 0, diag = d === 1 ? -1 : d === 7 ? 1 : 0;
      const at = side ? [side * f] : diag ? [diag * f * 0.55 - half * 0.7, diag * f * 0.55 + half * 0.7] : [-half, half];
      ctx.save(); ctx.translate(e.x, e.y); ctx.scale(sc, sc / TILT);
      const y = -h;
      ctx.globalCompositeOperation = 'lighter';
      // A cell of light with a cross of glow round it, and a fainter wider cross past that: the
      // eyes are the one thing about a hound or a seer the dark lets through, so they carry.
      for (const x of at) {
        ctx.globalAlpha = E.glow * 0.4 * k; ctx.fillStyle = glow;
        ctx.fillRect(x - c * 2.5, y - c * 0.5, c * 5, c); ctx.fillRect(x - c * 0.5, y - c * 2.5, c, c * 5);
        ctx.globalAlpha = E.glow * k;
        ctx.fillRect(x - c * 1.5, y - c * 0.5, c * 3, c); ctx.fillRect(x - c * 0.5, y - c * 1.5, c, c * 3);
        ctx.globalAlpha = k; ctx.fillStyle = core;
        ctx.fillRect(x - c * 0.5, y - c * 0.5, c, c);
      }
      ctx.restore();
    }
    ctx.restore();
  },
};
