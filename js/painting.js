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
    // A short floor is shown whole, one strip (3 Oct 2026: "if the level is fairly short, show it all
    // on one screen"): cut only when one strip would be wider than `oneRow` times its height.
    for (let n = 1; n <= P.maxRows; n++) {
      if (best && best.n === 1 && best.cw / best.ch <= P.oneRow) break;
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
        // straight under it shows its face colour, as it does in play, one row of depth, no more.
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
    // The picture, fitted whole into its box, never smoothed, and never taller than leaves room for
    // the road under it and the row with SAVE: on a phone held sideways (390 px tall) the line under
    // the old score sat on the way on and under the button.
    const dy = H * P.fit.top + 10 * s, room = Math.max(H * 0.2, H - 150 * s - dy);
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
    // No score, no seconds, no code under it any more (29 Sep 2026: "next to a cleared floor there is
    // no need for the score, the seconds, the code"): the road through the compound instead, and the
    // goat's head walking on to the next floor, the way Nuclear Throne shows it between areas.
    // (Leaving the card still copies the code for whoever is asked to paste it.)
    this.drawRoute(r, game, W / 2, dy + dh + 44 * s, 'clear', t);
    // Once it can be left: how to leave, and SAVE for whoever wants the picture.
    this.saveRect = null;
    if (game.stateTimer <= 0) {
      const a = clamp(-game.stateTimer / 0.4, 0, 1);
      ctx.globalAlpha = a;
      // The way on is a lit button, centred on the bottom row: the faint "click to go on" line it
      // replaces was missed by players who sat on this card looking for what to press.
      // a phone's foot is its home bar: lifted clear of it there (it sat 8 px off the edge, 2 Oct 2026)
      const goR = r.goButton(game, 'CONTINUE', W / 2, H - 22 * s - 24 * s - (game.touch.active ? 24 * r.s : 0)), gw = goR.w;
      ctx.textAlign = 'center';
      if (this.canSave) {
        const label = { saving: 'SAVING…', saved: 'SAVED', no: 'NOT SAVED' }[this.status] || 'SAVE THE PICTURE';
        ctx.font = `${16 * s}px ${FONT_SC}`;
        // Flush with the picture's right edge, but never over the words beside it (a narrow picture
        // would put it there), nor over the dev drawer's word in the corner. A phone held upright has
        // no room beside them: there it stands centred over the words instead.
        const bw = textW(ctx, label) + 28 * s, bh = 30 * s, corner = 80 * s;
        const beside = Math.max(dx + dw - bw, W / 2 + gw / 2 + 14 * s), fits = beside + bw <= W - corner;
        const bx = fits ? beside : (W - bw) / 2, by = fits ? goR.y + (goR.h - bh) / 2 : goR.y - bh - 8 * s;
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

  // The name a floor goes by on the road: THE DARK or THE TRIP where this run put one in its place.
  floorName(game, i) {
    if (i >= LEVELS.length) return 'OUT';
    if (i === game.darkAt) return 'THE DARK';
    if (i === game.tripAt) return 'THE TRIP';
    return LEVELS[i].name;
  },

  // The road through the compound, centred on `cx` with its nodes on `y`: one square a floor, the
  // floors behind him filled, his own lit, the ones ahead hollow, and after the last a doorway, OUT.
  // `mode` 'clear' walks his head from this floor to the next once `route.after` s of the card's
  // `t` have passed; 'dead' leaves a skull on this floor, the road on ahead of it dotted. Cells,
  // never strokes: the road is drawn on the same grid as the picture over it.
  drawRoute(r, game, cx, y, mode, t) {
    const R = TUNING.painting.route, ctx = r.ctx, s = r.ts, n = LEVELS.length;
    const cur = clamp(game.levelIndex, 0, n - 1), dead = mode === 'dead';
    const width = Math.min(r.w * R.w, R.max * s), step = width / n, x0 = cx - width / 2;
    const c = Math.max(2, Math.round(R.cell * s)), X = (i) => Math.round(x0 + i * step), Y = Math.round(y);
    const bone = PALETTE.bone, dim = 'rgba(239,230,208,0.28)', lit = dead ? PALETTE.blood : PALETTE.fireHi;
    ctx.save();
    // the road: solid behind him, dotted ahead
    for (let i = 0; i < n; i++) {
      const a = X(i) + 5 * c, b = X(i + 1) - 5 * c, walked = i < cur;
      ctx.fillStyle = walked ? bone : dim;
      for (let x = a; x < b; x += walked ? c : 3 * c) ctx.fillRect(x, Y - (c >> 1), c, c);
    }
    // the floors, and the way out after the last
    ctx.textAlign = 'center';
    const h = 3 * c;
    for (let i = 0; i <= n; i++) {
      const x = X(i), done = i < cur, here = i === cur;
      if (i === n) {
        ctx.fillStyle = cur >= n - 1 && !dead ? bone : dim;
        ctx.fillRect(x - h, Y - h - c, 2 * h, c); ctx.fillRect(x - h, Y - h, c, 2 * h); ctx.fillRect(x + h - c, Y - h, c, 2 * h);
        continue;
      }
      ctx.fillStyle = PALETTE.ink; ctx.fillRect(x - h - c, Y - h - c, 2 * h + 2 * c, 2 * h + 2 * c);
      ctx.fillStyle = here ? lit : done ? bone : dim;
      if (here || done) ctx.fillRect(x - h, Y - h, 2 * h, 2 * h);
      else { ctx.fillRect(x - h, Y - h, 2 * h, c); ctx.fillRect(x - h, Y + h - c, 2 * h, c); ctx.fillRect(x - h, Y - h, c, 2 * h); ctx.fillRect(x + h - c, Y - h, c, 2 * h); }
    }
    // his head, walking on to the next (or his skull, where it ended)
    const e = dead ? 0 : clamp((t - R.after) / R.move, 0, 1), ease = e * e * (3 - 2 * e);
    const to = Math.min(cur + 1, n), hx = X(cur) + (X(to) - X(cur)) * ease;
    const bob = !dead && e > 0 && e < 1 ? -Math.round(Math.abs(Math.sin(e * Math.PI * 5)) * 2) * c : 0;
    // The goat himself, the build's own sprite, trotting along the road (his skull where he fell).
    let drew = false;
    if (!dead && r.painted && r.painted.ready) {
      try {
        ctx.save(); ctx.translate(Math.round(hx), Math.round(Y - h - c + bob)); ctx.scale(0.9 * s, 0.9 * s);
        r.painted.character(r, { facing: 0, state: 'idle', x: 0, y: 0, vx: e > 0 && e < 1 ? 120 : 0, vy: 0 }, 'sheep', 40);
        ctx.restore(); drew = true;
      } catch (err) { ctx.restore(); }
    }
    if (!drew) this.glyph(ctx, dead ? PAINT_GLYPHS.skull : PAINT_GLYPHS.head, { x: Math.round(hx), y: Math.round(Y - h - 6 * c + bob) }, 2 * c, dead ? PALETTE.blood : bone);
    // the names that matter: where he is (or fell), and where the road goes next
    ctx.font = `${Math.max(13 * s, TUNING.hud.minText * r.s)}px ${FONT_SC}`;
    const next = !dead && game.climbDark && cur + 1 < n ? 'THE DARK' : this.floorName(game, to);
    const name = (i, label, col, al) => {
      ctx.save(); ctx.globalAlpha *= al; ctx.fillStyle = col;
      ctx.fillText(label, clamp(X(i), x0 + textW(ctx, label) / 2, x0 + width + 10 * s - textW(ctx, label) / 2), Y + h + 20 * s);
      ctx.restore();
    };
    if (dead) name(cur, `LEVEL ${cur + 1} · ${this.floorName(game, cur)}`, PALETTE.blood, 1);
    else {
      name(cur, this.floorName(game, cur), 'rgba(239,230,208,0.6)', 1 - ease);
      name(to, next, PALETTE.fireHi, ease);
    }
    ctx.restore();
  },

  // The death card with the floor on it (29 Sep 2026: "if you died, show the current level's map
  // from above, and that road"): the floor painted the way the clear card paints it, whole, the road
  // under it with a skull where he fell, what took him and what he keeps, ASCEND. It comes in over the
  // pull-back (`painting.death`), so the camera leaving him turns into the picture of how far he got.
  // How far the death card's picture has come in, 0..1 (also what `Renderer.draw` freezes the level on).
  deathFade(game) {
    const DC = TUNING.deathCam, D = TUNING.painting.death, since = DC.delay + DC.zoomTime - game.stateTimer;
    return clamp((since - DC.delay - D.at) / D.fade, 0, 1);
  },
  drawDeath(r, game, card) {
    const pic = game.deathPainting, P = TUNING.painting, D = P.death, ctx = r.ctx, s = r.ts, W = r.w, H = r.h;
    const a = this.deathFade(game), m = pic.meta;
    ctx.save();
    ctx.fillStyle = `rgba(13,10,12,${0.35 + 0.6 * a})`; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    // No DIED and no floor's name over the picture (30 Sep 2026: "not that important up top"): the
    // skull on the road says it, with the floor's number and name under it (`drawRoute`).
    ctx.globalAlpha = a;
    // the picture, whole, room left under it for the road, the words and the button
    // 266 is what goes under it: road 110, tally 34, the killer's plate 50, the button 36, the run code 36.
    // At 210 a short screen (1280x800) clamped the button up onto the plate (2 Oct 2026).
    const cv = pic.canvas, top0 = H * D.top, room = Math.max(H * 0.18, H - 266 * s - top0);
    const k = Math.min(W * P.fit.w / cv.width, H * D.h / cv.height, room / cv.height);
    const dw = cv.width * k, dh = cv.height * k, dx = (W - dw) / 2;
    // a short floor in one strip leaves the card's foot empty: the whole of it is centred instead
    const top = Math.max(top0, (H - dh - 266 * s) / 2);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(cv, dx, top, dw, dh); ctx.restore();
    ctx.strokeStyle = 'rgba(239,230,208,0.22)'; ctx.lineWidth = Math.max(1, s);
    ctx.strokeRect(Math.round(dx) - 0.5, Math.round(top) - 0.5, Math.round(dw) + 1, Math.round(dh) + 1);
    let y = top + dh + 44 * s;
    this.drawRoute(r, game, W / 2, y, 'dead', 0);
    y += 66 * s;
    // what took him, on its plate, beside the lines that name it and say what he keeps
    // The tally as the purse draws it (`Renderer.drawPurse`): the gold skull and the bodies, the wisp and
    // the souls he keeps; under it only what was lost and who did it.
    const T = card.tally, words = T ? [T.said].filter(Boolean) : card.lines.slice(1).filter((l) => l && !/^LEVEL /.test(l));
    if (T) {
      const sk = HEAVEN_PIXELS.sprites.skull, c = 1.9 * s, gap = 34 * s;
      ctx.save(); ctx.font = `700 ${19 * s}px ${FONT}`; ctx.textAlign = 'left';
      const a = String(T.kills), b = String(T.kept), wa = sk.w * c + 6 * s + textW(ctx, a), wb = 18 * s + textW(ctx, b);
      let x = W / 2 - (wa + gap + wb) / 2; const yy = y;
      Heaven.skull(ctx, x, yy - sk.h * c / 2 - 6 * s, c); x += sk.w * c + 6 * s;
      ctx.fillStyle = '#fff4c2'; ctx.fillText(a, x, yy); x += textW(ctx, a) + gap;
      if (r.painted.ready) { ctx.save(); ctx.translate(x + 4 * s, yy - 6 * s); r.painted.soulWispBody(ctx, 17 * s); ctx.restore(); }
      x += 18 * s; ctx.fillStyle = '#d9ccff'; ctx.fillText(b, x, yy);
      ctx.restore(); y += 34 * s;
    }
    const plate = card.killer && card.killer !== 'fall' ? Math.round(46 * s) : 0;
    ctx.font = `${15 * s}px ${FONT}`;
    const lw = words.length ? Math.max(...words.map((w) => textW(ctx, w))) : 0;
    const lx = W / 2 + (plate ? (plate + 14 * s) / 2 : 0);
    if (plate) r.drawKiller(card.killer, lx - lw / 2 - 14 * s - plate / 2, y - 17 * s, plate);
    ctx.textAlign = 'center';
    words.forEach((w, i) => { ctx.font = `${15 * s}px ${FONT}`; ctx.fillStyle = i === words.length - 1 ? PALETTE.blood : 'rgba(239,230,208,0.62)'; ctx.fillText(w, lx, y + i * 22 * s); });
    ctx.globalAlpha = 1;
    // The run code only with the dev drawer open (2 Oct 2026 playtest: "not sure the death screen needs
    // this"); leaving the card still copies it (`copyCode`) for whoever is asked to paste it.
    if (card.code && game.dev && game.dev.open) { ctx.font = `${Math.max(12 * r.s, 11 * s)}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.42)'; ctx.fillText(`RUN CODE  ${card.code}`, W / 2, H - 18 * s); }
    // ASCEND, and beside it RESTART, the floor again at once, past heaven (3 Oct 2026). RESTART is
    // offered `death.quick` s after the blow, before the pull-back is done; ASCEND waits for it.
    this.quickRect = null;
    if (card.go) {
      const by = Math.min(y + Math.max(words.length * 22 * s, plate) + 4 * s, H - 36 * s - 38 * s);
      const qk = { key: keysOf(game).back, quiet: true };
      const ra = r.goButton(game, card.go, 0, by, { measure: true }), rq = game.showroomOn ? null : r.goButton(game, 'RESTART', 0, by, Object.assign({ measure: true }, qk));
      const gap = 16 * s, side = rq && ra.w + gap + rq.w <= W - 24 * s;
      const left = W / 2 - (side ? ra.w + gap + rq.w : ra.w) / 2;
      const since = TUNING.deathCam.delay + TUNING.deathCam.zoomTime - game.stateTimer;
      if (rq && since >= D.quick) {
        ctx.globalAlpha = clamp((since - D.quick) / 0.4, 0, 1);
        this.quickRect = r.goButton(game, 'RESTART', side ? left + ra.w + gap + rq.w / 2 : W / 2, side ? by : Math.min(by + 44 * s, H - 40 * s), qk);
      }
      if (game.stateTimer <= 0) { ctx.globalAlpha = clamp(-game.stateTimer / 0.4, 0, 1); r.goButton(game, card.go, left + ra.w / 2, by); }
    }
    ctx.restore();
  },

  hit(p, rc) { return !!(p && rc && p.x >= rc.x && p.x <= rc.x + rc.w && p.y >= rc.y && p.y <= rc.y + rc.h); },
  onSave(p) { return this.canSave && this.hit(p, this.saveRect); },
  onQuick(p) { return this.hit(p, this.quickRect); },

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
    ctx.font = `${small}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.62)'; ctx.textAlign = 'left';
    ctx.fillText(`LEVEL ${m.level}${m.canon ? ' · ' + m.canon : ''}${m.dark ? ' · THE DARK' : m.trip ? ' · THE TRIP' : ''} · ${m.kills} sacrificed in ${m.time.toFixed(1)}s`, pad, y2);
    ctx.textAlign = 'right'; ctx.font = `${small}px ${FONT_SC}`;
    ctx.fillText(`DOOMED GOAT · seed ${m.seed}`, W - pad, y2);
    return out;
  },

  save(game) {
    if (!game.painting || this.status === 'saving') return;
    const m = game.painting.meta, name = `doomed-goat-${m.seed}-level-${m.level}-${m.name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}.png`;
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
