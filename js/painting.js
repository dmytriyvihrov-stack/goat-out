// Painting: the picture of a finished floor. The decal canvas already keeps every splat, body and
// scorch mark for the whole level, so a cleared floor *is* a painting of the run (CONCEPT.md, "Blood
// is paint"; MARKET.md calls this the one marketing asset the systems make by themselves). This bakes
// it once at the stairs: the floor plan, flat, in the level's own colours, the paint laid over it,
// the line he ran and a skull where each man went down, cut into rows so a level ten times wider
// than it is tall comes out close to a screen's shape. The clear screen shows it and SAVE hands it
// over as a PNG. Render and export only: nothing here touches the simulation or its RNG.

// The marks the run leaves on the picture, cell by cell like the cult's own pictograms: a skull where
// a man went down, and the goat's horned head where he got out.
const PAINT_GLYPHS = {
  skull: ['.###.', '#####', '#.#.#', '#####', '.#.#.'],
  head: ['#...#', '.#.#.', '.###.', '.###.', '..#..'],
};

const Painting = {
  dl: null,          // the viewer's `downloads` capability, when claude.ai frames the page
  status: null,      // what the SAVE button says after a press: null, 'saving', 'saved', 'no'
  saveRect: null,    // where the renderer last drew SAVE, in canvas pixels (read by the input)

  // A framed artifact cannot download anything itself: the file goes through the viewer's
  // `downloads` capability, asked for once here so the press does not wait on it. A local page
  // (no `window.claude` at all) saves through an ordinary link.
  // Asked again at the stairs (`bake`) in case the viewer's `window.claude` arrived after this script.
  init() {
    if (this.asked) return;
    try { if (window.claude && window.claude.use) { this.asked = true; window.claude.use('downloads').then((d) => { this.dl = d; }, () => {}); } } catch (err) { /* no viewer */ }
  },
  get canSave() { return !!this.dl || !window.claude; },

  // Tiles as the floor stands now, except that a clamp's stoned mouth is shown open again (the
  // corridor was run through) and a niche nobody broke into stays wall (it is still a secret).
  // The niche's own tile in the wall row is floor in the grid even unbroken (only the crack prop
  // covers it in play), so the whole niche is asked for by name.
  tileAt(game, i, hidden) {
    if (hidden.has(i)) return T.WALL;
    const w = game.world.tiles[i]; if (w !== T.WALL) return w;
    const l = game.level.tiles[i]; return l !== T.WALL ? l : T.WALL;
  },

  bake(game) {
    this.init();
    const P = TUNING.painting, lv = game.level, def = lv.def, W = lv.W, H = lv.H, px = P.px;
    const hidden = new Set();
    for (const p of game.niches || []) if (!p.broken) for (const i of p.nicheTiles) hidden.add(i);
    const tile = new Uint8Array(W * H);
    let x0 = W, x1 = 0, y0 = H, y1 = 0;
    for (let i = 0; i < W * H; i++) {
      const t = tile[i] = this.tileAt(game, i, hidden);
      if (t === T.WALL) continue;
      const tx = i % W, ty = (i / W) | 0;
      if (tx < x0) x0 = tx; if (tx > x1) x1 = tx; if (ty < y0) y0 = ty; if (ty > y1) y1 = ty;
    }
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(W, x1 + 2); y1 = Math.min(H, y1 + 2);
    const rowsH = y1 - y0;
    // Where to cut: between two rooms if there is a column nothing stands across near the even cut,
    // so no room is ever split between two rows; the number of rows is whichever lands the whole
    // picture nearest `aspect`.
    const free = (c) => !lv.rooms.some((r) => r.x < c && r.x + r.w > c);
    const cutsFor = (n) => {
      const cuts = [x0], span = (x1 - x0) / n, look = Math.round(span * P.cutLook);
      for (let k = 1; k < n; k++) {
        const ideal = Math.round(x0 + span * k); let at = ideal;
        for (let d = 0; d <= look; d++) { if (free(ideal - d)) { at = ideal - d; break; } if (free(ideal + d)) { at = ideal + d; break; } }
        cuts.push(Math.max(cuts[cuts.length - 1] + 1, at));
      }
      cuts.push(x1); return cuts;
    };
    let best = null;
    for (let n = 1; n <= P.maxRows; n++) {
      const cuts = cutsFor(n); let wMax = 0;
      for (let k = 0; k < n; k++) wMax = Math.max(wMax, cuts[k + 1] - cuts[k]);
      const cw = wMax + P.pad * 2, ch = n * rowsH + (n - 1) * P.gap + P.pad * 2;
      const miss = Math.abs(Math.log(cw / ch / P.aspect));
      if (!best || miss < best.miss) best = { n, cuts, cw, ch, miss };
    }
    const canvas = document.createElement('canvas');
    canvas.width = best.cw * px; canvas.height = best.ch * px;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = def.fog; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const rows = [];
    for (let k = 0; k < best.n; k++) {
      const a = best.cuts[k], b = best.cuts[k + 1];
      const row = { a, b, x: P.pad * px, y: (P.pad + k * (rowsH + P.gap)) * px, w: (b - a) * px, h: rowsH * px };
      rows.push(row);
      ctx.save(); ctx.beginPath(); ctx.rect(row.x, row.y, row.w, row.h); ctx.clip();
      this.paintRow(ctx, game, tile, row, y0);
      ctx.restore();
    }
    const i = levelIndexOf(def), n = game.levelIndex;
    return {
      canvas, rows, t: 0,
      meta: {
        level: (i >= 0 ? i : n) + 1, name: def.name || '', canon: def.canon ? def.canon.name : '',
        dark: !!def.dark, trip: !!def.shroom, kills: game.kills, time: game.timer,
        seed: (game.runSeed >>> 0).toString(36),
      },
    };
  },

  // One row: flat floor plan, then the paint, then what the run left on top of it. Painting pixels
  // are `px` a tile, which is the decal's own resolution give or take one percent, so the paint
  // lands a texel for a texel and the whole picture stays one grid.
  paintRow(ctx, game, tile, row, y0) {
    const P = TUNING.painting, lv = game.level, def = lv.def, W = lv.W, H = lv.H, px = P.px, w = game.world;
    const X = (tx) => row.x + (tx - row.a) * px, Y = (ty) => row.y + (ty - y0) * px;
    const solid = (tx, ty) => tx < 0 || ty < 0 || tx >= W || ty >= H || tile[ty * W + tx] === T.WALL;
    const look = { [T.HAY]: PALETTE.hayDark, [T.ASH]: PALETTE.ash, [T.EXIT]: PALETTE.bone, [T.ENTRY]: def.wallTop, [T.PIT]: PALETTE.ink };
    for (let ty = y0; ty < y0 + row.h / px; ty++) for (let tx = row.a; tx < row.b; tx++) {
      const i = ty * W + tx, t = tile[i];
      let c = null;
      if (t === T.WALL) {
        // Only the rim of the rock is drawn; deep rock is the background. A wall with open floor
        // straight under it shows its face colour, as it does in play — one row of depth, no more.
        let rim = false;
        for (let dy = -1; dy <= 1 && !rim; dy++) for (let dx = -1; dx <= 1; dx++) if (!solid(tx + dx, ty + dy)) { rim = true; break; }
        if (rim) c = solid(tx, ty + 1) ? def.wallTop : def.wall;
      } else c = look[t] || ((((tx * 73856093) ^ (ty * 19349663)) >>> 0) % 100 < P.floorAlt ? def.floorAlt : def.floor);
      if (!c) continue;
      ctx.fillStyle = c; ctx.fillRect(X(tx), Y(ty), px, px);
      if (w.grass && w.grass[i] > 0 && t !== T.WALL) { ctx.globalAlpha = P.grass; ctx.fillStyle = PALETTE.grass; ctx.fillRect(X(tx), Y(ty), px, px); ctx.globalAlpha = 1; }
    }
    // The paint. The decal canvas at its own scale, pixel for pixel; the stain tiles (the finer
    // paint of wherever something happened lately) smoothed down onto it, as they are in play.
    const s = px / TILE, ww = (row.b - row.a) * TILE, wh = row.h / s;
    ctx.drawImage(w.decal, row.a * TILE * DECAL_SCALE, y0 * TILE * DECAL_SCALE, ww * DECAL_SCALE, wh * DECAL_SCALE, row.x, row.y, row.w, row.h);
    ctx.save(); ctx.imageSmoothingEnabled = true;
    const size = TUNING.effects.stainTile;
    for (const p of w.stains.values()) {
      if (p.x + size < row.a * TILE || p.x > row.b * TILE) continue;
      ctx.drawImage(p.canvas, row.x + (p.x - row.a * TILE) * s, row.y + (p.y - y0 * TILE) * s, size * s, size * s);
    }
    ctx.restore();
    // A room he never opened sinks back into the rock, the way the death screen shows one.
    ctx.fillStyle = def.fog; ctx.globalAlpha = P.unseen;
    for (const r of lv.rooms) if (!r.seen) ctx.fillRect(X(r.x), Y(r.y), r.w * px, r.h * px);
    ctx.globalAlpha = 1;
    // The run: the line he walked, a skull where each man went down, his head where he got out.
    const at = (p) => ({ x: Math.round(row.x + (p.x / TILE - row.a) * px), y: Math.round(row.y + (p.y / TILE - y0) * px) });
    const trail = game.pathTrail || [];
    for (const pass of [0, 1]) {
      const d = pass ? P.trail.w : P.trail.w + 2;
      ctx.fillStyle = pass ? PALETTE.bone : PALETTE.ink; ctx.globalAlpha = pass ? P.trail.alpha : P.trail.alpha * 0.5;
      for (let k = 1; k < trail.length; k++) this.line(ctx, at(trail[k - 1]), at(trail[k]), d);
    }
    ctx.globalAlpha = 1;
    for (const m of game.killMarks || []) this.glyph(ctx, PAINT_GLYPHS.skull, at(m), P.glyphCell, PALETTE.bone);
    if (trail.length) this.glyph(ctx, PAINT_GLYPHS.head, at(trail[trail.length - 1]), P.glyphCell, PALETTE.bone);
  },

  // A pixel line: a d x d stamp at every step of a plain Bresenham walk.
  line(ctx, p, q, d) {
    let x = p.x, y = p.y; const dx = Math.abs(q.x - x), dy = -Math.abs(q.y - y), sx = x < q.x ? 1 : -1, sy = y < q.y ? 1 : -1;
    let err = dx + dy, h = d >> 1;
    for (let guard = 0; guard < 4096; guard++) {
      ctx.fillRect(x - h, y - h, d, d);
      if (x === q.x && y === q.y) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  },

  // A glyph of '#' cells, `cell` painting pixels each, on an ink rim a pixel wide. A '.' inside the
  // shape (an eye socket) is left to the rim's ink.
  glyph(ctx, rows, c, cell, color) {
    const h = rows.length, w = rows[0].length, ox = c.x - (w * cell >> 1), oy = c.y - (h * cell >> 1);
    ctx.fillStyle = PALETTE.ink;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (rows[j][i] === '#') ctx.fillRect(ox + i * cell - 1, oy + j * cell - 1, cell + 2, cell + 2);
    ctx.fillStyle = color;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (rows[j][i] === '#') ctx.fillRect(ox + i * cell, oy + j * cell, cell, cell);
  },

  // The clear screen's last card: the level's name over the picture, the score under it. The
  // picture wipes in row by row over `reveal` seconds, in the order the run went, over a ghost of
  // itself; the press that leaves waits `arm` seconds, so the click that climbed cannot skip it.
  draw(r, game, card) {
    const pic = game.painting; if (!pic) return;
    const P = TUNING.painting, ctx = r.ctx, s = r.ts, W = r.w, H = r.h, m = pic.meta;
    const t = card.time - game.stateTimer;
    ctx.fillStyle = game.level ? game.level.def.fog : PALETTE.ink; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = `${22 * s}px ${FONT_SC}`; ctx.fillStyle = 'rgba(239,230,208,0.62)';
    ctx.fillText(`LEVEL ${m.level}${m.dark ? ' · THE DARK' : m.trip ? ' · THE TRIP' : ''}`, W / 2, H * P.fit.top - 34 * s);
    ctx.font = `700 ${34 * s}px ${FONT}`; ctx.fillStyle = PALETTE.bone;
    ctx.fillText(m.name, W / 2, H * P.fit.top - 6 * s);
    // The picture, fitted whole into its box, never smoothed — and never taller than leaves room for
    // the score, its line and the row with SAVE under it: on a phone held sideways (390 px tall)
    // the line under the score sat on "tap to go on" and under the button.
    const dy = H * P.fit.top + 10 * s, room = Math.max(H * 0.2, H - (card.code ? 137 : 119) * s - dy);
    const cv = pic.canvas, k = Math.min(W * P.fit.w / cv.width, H * P.fit.h / cv.height, room / cv.height);
    const dw = cv.width * k, dh = cv.height * k, dx = (W - dw) / 2;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = P.ghost; ctx.drawImage(cv, dx, dy, dw, dh); ctx.globalAlpha = 1;
    const total = pic.rows.reduce((a, rw) => a + rw.w, 0), e = 1 - Math.pow(1 - clamp(t / P.reveal, 0, 1), 2);
    let left = total * e;
    for (const rw of pic.rows) {
      const vis = clamp(left, 0, rw.w); left -= rw.w;
      if (vis > 0) ctx.drawImage(cv, rw.x, rw.y, vis, rw.h, dx + rw.x * k, dy + rw.y * k, vis * k, rw.h * k);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(239,230,208,0.22)'; ctx.lineWidth = Math.max(1, s);
    ctx.strokeRect(Math.round(dx) - 0.5, Math.round(dy) - 0.5, Math.round(dw) + 1, Math.round(dh) + 1);
    // The score, where the old score card said it.
    let y = dy + dh + 40 * s;
    ctx.font = `700 ${34 * s}px ${FONT}`; ctx.fillStyle = card.best ? PALETTE.fireHi : PALETTE.bone;
    ctx.fillText(`SCORE ${card.score}`, W / 2, y);
    y += 26 * s; ctx.font = `${15 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.62)';
    ctx.fillText(`${m.kills} sacrificed in ${m.time.toFixed(1)}s · ${card.best ? 'A NEW BEST' : `run so far ${card.run}`}`, W / 2, y);
    // The run code, quiet, for whoever is asked to paste it (as on the death and win cards).
    if (card.code) { y += 18 * s; ctx.font = `${11 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.42)'; ctx.fillText(`RUN CODE  ${card.code}`, W / 2, y); }
    // Once it can be left: how to leave, and SAVE for whoever wants the picture.
    this.saveRect = null;
    if (game.stateTimer <= 0) {
      const a = clamp(-game.stateTimer / 0.4, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = `${15 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.5)';
      const go = `${game.tapWord.toLowerCase()} to go on`, gw = ctx.measureText(go).width;
      ctx.fillText(go, W / 2, H - 22 * s);
      if (this.canSave) {
        const label = { saving: 'SAVING…', saved: 'SAVED', no: 'NOT SAVED' }[this.status] || 'SAVE THE PICTURE';
        ctx.font = `${16 * s}px ${FONT_SC}`;
        // Flush with the picture's right edge, but never over the words beside it (a narrow picture
        // would put it there), nor over the dev drawer's word in the corner. A phone held upright has
        // no room beside them: there it stands centred over the words instead.
        const bw = ctx.measureText(label).width + 28 * s, bh = 30 * s, corner = 80 * s;
        const beside = Math.max(dx + dw - bw, W / 2 + gw / 2 + 14 * s), fits = beside + bw <= W - corner;
        const bx = fits ? beside : (W - bw) / 2, by = fits ? H - 22 * s - bh * 0.7 : H - 22 * s - 15 * s - bh - 8 * s;
        const over = game.input.mouse && !game.touch.active && this.hit(game.input.mouse, { x: bx, y: by, w: bw, h: bh });
        ctx.fillStyle = over ? 'rgba(239,230,208,0.16)' : 'rgba(239,230,208,0.07)'; ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = this.status === 'saved' ? PALETTE.fireHi : 'rgba(239,230,208,0.5)'; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
        ctx.fillStyle = this.status === 'saved' ? PALETTE.fireHi : PALETTE.bone;
        ctx.fillText(label, bx + bw / 2, by + bh * 0.68);
        this.saveRect = { x: bx, y: by, w: bw, h: bh };
      }
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
  },

  hit(p, rc) { return !!(p && rc && p.x >= rc.x && p.x <= rc.x + rc.w && p.y >= rc.y && p.y <= rc.y + rc.h); },
  onSave(p) { return this.canSave && this.hit(p, this.saveRect); },

  // What leaves the game: the picture at `export` times its own pixels, with its name, the run's
  // numbers and the seed that deals the same floors in a band underneath.
  exportCanvas(game, card) {
    const pic = game.painting, P = TUNING.painting, E = P.export, m = pic.meta, cv = pic.canvas;
    const out = document.createElement('canvas'), W = cv.width * E, big = Math.round(W * P.band.big), small = Math.round(W * P.band.small);
    const band = Math.round(big * 2.5);
    out.width = W; out.height = cv.height * E + band;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = game.level.def.fog; ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(cv, 0, 0, W, cv.height * E);
    const pad = P.pad * P.px * E, y1 = cv.height * E + big * 0.7, y2 = y1 + small * 1.7;
    ctx.textBaseline = 'alphabetic';
    ctx.font = `700 ${big}px ${FONT}`; ctx.fillStyle = PALETTE.bone; ctx.textAlign = 'left';
    ctx.fillText(m.name, pad, y1);
    ctx.textAlign = 'right'; ctx.fillStyle = card.best ? PALETTE.fireHi : PALETTE.bone;
    ctx.fillText(`SCORE ${card.score}`, W - pad, y1);
    ctx.font = `${small}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.62)'; ctx.textAlign = 'left';
    ctx.fillText(`LEVEL ${m.level}${m.canon ? ' · ' + m.canon : ''}${m.dark ? ' · THE DARK' : m.trip ? ' · THE TRIP' : ''} · ${m.kills} sacrificed in ${m.time.toFixed(1)}s`, pad, y2);
    ctx.textAlign = 'right'; ctx.font = `${small}px ${FONT_SC}`;
    ctx.fillText(`GOAT OUT · seed ${m.seed}`, W - pad, y2);
    return out;
  },

  save(game) {
    if (!game.painting || this.status === 'saving') return;
    const m = game.painting.meta, name = `goat-out-${m.seed}-level-${m.level}-${m.name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}.png`;
    this.status = 'saving';
    this.exportCanvas(game, game.card).toBlob((blob) => {
      if (!blob) { this.status = 'no'; return; }
      if (this.dl) {
        this.dl.save({ filename: name, data: blob }).then(() => { this.status = 'saved'; }, () => { this.status = 'no'; });
        return;
      }
      const a = document.createElement('a'), url = URL.createObjectURL(blob);
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      this.status = 'saved';
    }, 'image/png');
  },
};
Painting.init();
