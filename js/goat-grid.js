// GOAT GRID, a tab of the dev tool: the goat as the build draws him (`PaintedArt.drawGoat`), laid
// out on a grid whose two axes are picked from the things the souls and the mouse put on him —
// horns, voice, talisman, the third eye, the facing, the hearts lost. Every cell is the real draw
// call with a stub `game` carrying the mods that cell stands for, so the grid can never show a look
// the game does not have. Each cell keeps its own copy of the painter's particle state (steam,
// flame, the venom drip) so sixteen goats breathing at once do not share one plume.
// Nothing here touches the run: no `game.mods`, no `game.artifact`, no simulation.
const GoatGrid = {
  AXES: {
    horns: { name: 'HORNS', values: [
      { label: 'PLAIN', mods: {} }, { label: 'LONG HORNS', mods: { antlers: true } },
      { label: 'BOMB CHARGE', mods: { bomb: true } }, { label: 'SPLASH', mods: { splash: true } },
      { label: 'LONG + BOMB', mods: { antlers: true, bomb: true } }, { label: 'LONG + SPLASH', mods: { antlers: true, splash: true } }] },
    voice: { name: 'VOICE', values: [
      { label: 'PLAIN', mods: {} }, { label: 'FULL THROAT', mods: { screamStun: true } },
      { label: 'DRAGON BREATH', mods: { breath: true } }, { label: 'VENOM SPIT', mods: { spit: true } }] },
    talisman: { name: 'TALISMAN', values: null },   // filled from ARTIFACTS on first use
    eye: { name: 'THIRD EYE', values: [{ label: 'NONE', mods: {} }, { label: 'THE ORACLE', mods: { oracle: true } }] },
    facing: { name: 'FACING', values: ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'].map((label, i) => ({ label, facing: i })) },
    wounds: { name: 'WOUNDS', values: [0, 1, 2, 3].map((n) => ({ label: n ? n + ' LOST' : 'WHOLE', wounds: n })) },
    floor: { name: 'FLOOR', values: null },          // one per canon, filled from LEVELS on first use
    // What stands beside him, off the environment atlas at the width the game draws it (world px).
    // `flat` things lie on the floor and are always under him.
    decor: { name: 'DECOR', values: [{ label: 'NONE' }].concat([
      ['crate', 27], ['barrel', 22], ['hay', 33], ['table', 27], ['pillar', 27], ['brazier', 24], ['boulder', 30],
      ['stalagmites', 26], ['shrooms', 30], ['crystals', 16], ['planks', 24, 1], ['rubble', 24, 1], ['straw', 24, 1],
      ['rug', 36, 1], ['pebbles', 24, 1], ['moss', 24, 1], ['puddle', 24, 1], ['crack', 24, 1],
    ].map(([id, w, flat]) => ({ label: id.toUpperCase(), decor: { id, w, flat: !!flat } }))) },
  },
  // Where the decor stands, by DECOR SIDE: against the left or right edge of what the cell shows
  // (`edge` of its own width in from it) a little behind his feet, or straight behind him. It is
  // always drawn before him, so at any zoom it is in the picture and never over his face.
  SIDES: { left: { edge: 0.5, y: -3 }, right: { edge: 0.5, y: -3 }, behind: { x: -6, y: -20 } },
  // Cell proportions and how big he stands in one: FULL is the whole goat with his shadow, BUST the
  // head and chest with the head on `bustAt` of the cell. `export` is the size of one saved cell.
  // FULL keeps the middle of his body (`mid`, world px above the foot) on `at` of the cell, so the
  // zoom closes in on him rather than on his hooves. `zooms` are the steps ZOOM walks through.
  // `shade` is the pixel shadow the tool draws in place of the game's soft ellipse: half-axes in
  // world px, snapped to the sprite's own grid (`TUNING.goat.face.cell`), two tones.
  LOOK: { aspect: 0.88, full: { per: 40, mid: 14, at: [0.5, 0.54] }, bust: { per: 38, at: [0.5, 0.5] },
    zooms: [0.8, 1, 1.2, 1.45, 1.75, 2.1, 2.6], shade: { rx: 11, ry: 3.6, core: 0.7, far: 'rgba(24,14,10,0.22)', near: 'rgba(24,14,10,0.4)' },
    export: { w: 300, h: 340, gap: 4, pad: 24 }, ground: ['#f6f1e6', '#121010'], flat: '#8a8078' },

  axis(key) {
    const a = this.AXES[key];
    if (!a.values && key === 'talisman') a.values = [{ label: 'NONE', artifact: null }].concat(ARTIFACTS.map((x) => ({ label: x.name, artifact: x.id })));
    if (!a.values && key === 'floor') a.values = [{ label: 'NONE' }].concat(LEVELS.filter((l) => l.canon).map((l) => ({ label: l.canon.name, floor: l })));
    return a;
  },
  state(game) {
    const d = game.dev;
    // The first look is the one the poster was made with: horns across, voice down, facing SE.
    if (!d.grid) d.grid = { across: 'horns', down: 'voice', frame: 'full', bg: 'diag', pose: 'idle', shout: true, tier: 1, zoom: 2, shadow: 'pixel', side: 'behind', fmt: 'png',
      pick: { horns: [0, 1, 2, 3], voice: [0, 1, 2, 3], talisman: [0, 1, 2, 3], eye: [0, 1], facing: [0, 1, 2, 3, 4, 5, 6, 7], wounds: [0, 1, 2, 3], floor: [1, 2, 3, 4], decor: [1, 2, 3, 6] },
      base: { horns: 0, voice: 0, talisman: 0, eye: 0, facing: 7, wounds: 0, floor: 0, decor: 0 }, painters: new Map(), sig: '' };
    return d.grid;
  },
  // The values along one axis, or a single blank when nothing is picked for it.
  line(G, key) { return key ? G.pick[key].map((i) => ({ key, i })) : [null]; },

  // What one cell stands for: every axis at its base value, then the column's and the row's.
  cell(G, across, down) {
    const at = Object.assign({}, G.base);
    if (across) at[across.key] = across.i;
    if (down) at[down.key] = down.i;
    const mods = {}; let artifact = null, facing = 7, wounds = 0, floor = null, decor = null;
    for (const [key, i] of Object.entries(at)) {
      const v = this.axis(key).values[i]; if (!v) continue;
      if (v.mods) Object.assign(mods, v.mods);
      if (v.artifact) artifact = { id: v.artifact, tier: G.tier };
      if (v.facing !== undefined) facing = v.facing;
      if (v.wounds !== undefined) wounds = v.wounds;
      if (v.floor) floor = v.floor;
      if (v.decor) decor = v.decor;
    }
    return { mods, artifact, facing, wounds, floor, decor };
  },

  // One goat into a cell box. `painter` is this cell's own view of the renderer's painter (its
  // images shared, its particle state its own).
  drawCell(r, ctx, G, spec, painter, x, y, w, h, bg) {
    const angle = (spec.facing + 2) * Math.PI / 4, walk = G.pose === 'walk';
    const g = { x: 0, y: 0, facing: angle, vx: walk ? Math.cos(angle) * 80 : 0, vy: walk ? Math.sin(angle) * 80 : 0,
      state: 'idle', trail: [], hp: 4 - spec.wounds, maxHp: 4, invuln: 0, screaming: G.shout ? 1 : 0, dazed: 0, jitter: null, sqLeft: 0 };
    const stub = { mods: spec.mods, artifact: spec.artifact, goat: g, stairFx: null, intro: null, touch: { active: false }, state: 'grid' };
    const L = this.LOOK, old = r.ctx;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(x, y, w, h); }
    const Z = L.zooms[G.zoom] || 1;
    let S, ox, oy;
    if (G.frame === 'bust') {
      const P = PIXEL_FACE[spec.facing], p = P.brow || P.nose[0]; S = h / L.bust.per * Z;
      ox = x + w * L.bust.at[0] - p[0] * S; oy = y + h * L.bust.at[1] - p[1] * S;
    } else { S = h / L.full.per * Z; ox = x + w * L.full.at[0]; oy = y + h * L.full.at[1] + L.full.mid * S; }
    ctx.translate(ox, oy); ctx.scale(S, S * TILT);
    // The floor under him in world px, as far as the cell reaches, in that level's own swatches.
    const wx0 = (x - ox) / S, wx1 = (x + w - ox) / S;
    if (spec.floor) this.floorUnder(r, ctx, spec.floor, wx0, (y - oy) / (S * TILT), wx1, (y + h - oy) / (S * TILT));
    if (spec.decor) {
      const A = this.SIDES[G.side] || this.SIDES.left, dw = spec.decor.w;
      const dx = G.side === 'left' ? Math.max(wx0 + dw * A.edge, -34) : G.side === 'right' ? Math.min(wx1 - dw * A.edge, 34) : A.x;
      this.decorAt(ctx, spec.decor, [dx, A.y]);
    }
    ctx.imageSmoothingEnabled = false;
    // The game's shadow is a soft grey oval sized for a room; here it is either that, a small
    // two-tone pixel one under his hooves, or nothing.
    const shade = r.shadow;
    r.shadow = G.shadow === 'soft' ? shade : G.shadow === 'pixel' ? (sx, sy) => this.pixelShadow(ctx, sx, sy) : () => {};
    r.ctx = ctx;
    try { painter.drawGoat(r, g, stub); } finally { r.ctx = old; r.shadow = shade; }
    ctx.restore();
  },
  floorUnder(r, ctx, def, x0, y0, x1, y1) {
    if (!PIXEL_ENV.ready) return;
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    for (let ty = Math.floor(y0 / TILE); ty * TILE < y1; ty++) for (let tx = Math.floor(x0 / TILE); tx * TILE < x1; tx++)
      ctx.drawImage(r.painted.floorSwatch(def, r.painted.hash(tx + 40, ty + 40, 7)), tx * TILE, ty * TILE, TILE + 0.5, TILE + 0.5);
    ctx.imageSmoothingEnabled = smooth;
  },
  // A prop beside him with the same small pixel shadow he has; flat litter lies on its middle.
  decorAt(ctx, d, [x, y]) {
    if (!PIXEL_ENV.ready) return;
    if (!d.flat) this.pixelShadow(ctx, x, y + 1, d.w * 0.42 / this.LOOK.shade.rx);
    PIXEL_ENV.draw(ctx, d.id, x, y + (d.flat ? 0 : 3), d.w, d.flat ? 0.5 : 1);
  },
  pixelShadow(ctx, x, y, k = 1) {
    const C = TUNING.goat.face.cell, D = this.LOOK.shade, nx = Math.round(D.rx * k / C), ny = Math.max(1, Math.round(D.ry * k / C));
    ctx.save(); ctx.translate(x, y);
    for (let j = -ny; j <= ny; j++) for (let i = -nx; i <= nx; i++) {
      const e = (i / (nx + 0.5)) ** 2 + (j / (ny + 0.5)) ** 2; if (e > 1) continue;
      ctx.fillStyle = e < D.core * D.core ? D.near : D.far; ctx.fillRect(i * C - C / 2, j * C - C / 2, C, C);
    }
    ctx.restore();
  },
  painter(r, G, key) {
    // Its own `fx` list, not the prototype's: once the real goat has breathed, `r.painted.fx` exists
    // and every cell would read and age the one plume through the prototype.
    if (!G.painters.has(key)) G.painters.set(key, Object.assign(Object.create(r.painted), { fx: [] }));
    return G.painters.get(key);
  },
  ground(G, c, r, cols, rows) {
    const L = this.LOOK;
    if (G.bg === 'none') return null;
    if (G.bg === 'flat') return L.flat;
    const t = cols + rows > 2 ? (c + r) / (cols + rows - 2) : 0;
    const A = [1, 3, 5].map((k) => parseInt(L.ground[0].slice(k, k + 2), 16)), B = [1, 3, 5].map((k) => parseInt(L.ground[1].slice(k, k + 2), 16));
    return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')';
  },

  drawToolTab(r, game, pad, top) {
    const ctx = r.ctx, s = r.ts, d = game.dev, W = r.w, H = r.h, G = this.state(game);
    if (!PIXEL_ART.ready) return;
    const text = (t, x, y, color = PALETTE.bone, size = 9, font = FONT_SC) => {
      ctx.font = `700 ${size * s}px ${font}`; ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(t, x, y);
    };
    text('THE GOAT GRID', pad, top + 9 * s, PALETTE.ochre, 11);
    ctx.font = `400 ${8.5 * s}px ${FONT}`; ctx.fillStyle = PALETTE.ash;
    ctx.fillText('pick an axis ACROSS and one DOWN, then which of its values go in · the rest is one value for every cell', pad + 110 * s, top + 9 * s);

    // The axes, one row each: ACROSS / DOWN, then the values. On a grid axis a value is in or out;
    // on any other it is the one value every cell wears.
    let y = top + 18 * s;
    const chipH = 17 * s, chipX = pad + 196 * s;
    for (const key of Object.keys(this.AXES)) {
      const a = this.axis(key), onGrid = G.across === key || G.down === key;
      text(a.name, pad, y + 12 * s, onGrid ? PALETTE.fireHi : PALETTE.bone);
      r.devButton(d, pad + 76 * s, y, 56 * s, chipH, 'ACROSS', 'grid-across=' + key, G.across === key);
      r.devButton(d, pad + 136 * s, y, 50 * s, chipH, 'DOWN', 'grid-down=' + key, G.down === key);
      let x = chipX;
      a.values.forEach((v, i) => {
        ctx.font = `700 ${10 * s}px ${FONT_SC}`;
        const w = ctx.measureText(v.label).width + 12 * s;
        if (x + w > W - pad) { x = chipX; y += chipH + 3 * s; }
        r.devButton(d, x, y, w, chipH, v.label, `grid-chip=${key}.${i}`, onGrid ? G.pick[key].includes(i) : G.base[key] === i);
        x += w + 3 * s;
      });
      y += chipH + 5 * s;
    }
    // How he is framed and posed, and the way out.
    const opts = [['FULL', 'grid-frame=full', G.frame === 'full'], ['BUST', 'grid-frame=bust', G.frame === 'bust'],
      ['IDLE', 'grid-pose=idle', G.pose === 'idle'], ['WALK', 'grid-pose=walk', G.pose === 'walk'],
      ['ZOOM −', 'grid-zoom=-1', false], ['ZOOM ' + (this.LOOK.zooms[G.zoom] || 1) + '×', 'grid-zoom=0', false], ['ZOOM +', 'grid-zoom=1', false],
      ['SHADOW: ' + G.shadow.toUpperCase(), 'grid-shadow', false], ['DECOR: ' + G.side.toUpperCase(), 'grid-side', false],
      ['SHOUTING', 'grid-shout', G.shout], ['TIER ' + 'I'.repeat(G.tier), 'grid-tier', false],
      ['DIAGONAL', 'grid-bg=diag', G.bg === 'diag'], ['FLAT', 'grid-bg=flat', G.bg === 'flat'], ['NO GROUND', 'grid-bg=none', G.bg === 'none'],
      ['FORMAT: ' + G.fmt.toUpperCase(), 'grid-fmt', false], ['SAVE ' + G.fmt.toUpperCase(), 'grid-export', false], ['RESET', 'grid-reset', false]];
    let x = pad;
    for (const [label, id, on] of opts) {
      ctx.font = `700 ${10 * s}px ${FONT_SC}`;
      const w = Math.max(48 * s, ctx.measureText(label).width + 14 * s);
      if (x + w > W - pad) { x = pad; y += chipH + 3 * s; }
      r.devButton(d, x, y, w, chipH, label, id, on); x += w + (id === 'grid-pose=walk' || id === 'grid-zoom=1' || id === 'grid-side' || id === 'grid-tier' || id === 'grid-bg=none' ? 12 : 3) * s;
    }
    y += chipH + 10 * s;

    // The grid itself, as large as the rest of the page allows, with the axis values as headers.
    const cols = this.line(G, G.across), rows = this.line(G, G.down === G.across ? null : G.down);
    const headW = rows[0] ? 96 * s : 0, headH = cols[0] ? 14 * s : 0, gap = 3 * s;
    const aw = W - pad * 2 - headW, ah = H - y - pad - headH;
    const ch = Math.max(20 * s, Math.min((ah - gap * (rows.length - 1)) / rows.length, (aw - gap * (cols.length - 1)) / cols.length / this.LOOK.aspect));
    const cw = ch * this.LOOK.aspect, gx = pad + headW, gy = y + headH;
    const sig = [G.across, G.down, G.frame, G.pose, cols.length, rows.length].join('|');
    if (G.sig !== sig) { G.painters.clear(); G.sig = sig; }
    cols.forEach((c, i) => { if (c) text(r.clip(this.axis(c.key).values[c.i].label, cw), gx + i * (cw + gap), y + 10 * s, PALETTE.ochre, 8); });
    rows.forEach((rw, j) => {
      if (rw) text(r.clip(this.axis(rw.key).values[rw.i].label, headW - 6 * s), pad, gy + j * (ch + gap) + ch / 2, PALETTE.ochre, 8);
      cols.forEach((c, i) => {
        const bx = gx + i * (cw + gap), by = gy + j * (ch + gap);
        this.drawCell(r, ctx, G, this.cell(G, c, rw), this.painter(r, G, i + ',' + j), bx, by, cw, ch, this.ground(G, i, j, cols.length, rows.length));
      });
    });
  },

  // The grid as a PNG: the same cells at a fixed size, each goat stepped a third of a second on a
  // fresh painter first so breath and drip are in the air, no headers.
  exportPng(game, r) {
    const G = this.state(game), E = this.LOOK.export;
    const cols = this.line(G, G.across), rows = this.line(G, G.down === G.across ? null : G.down);
    const cv = document.createElement('canvas');
    cv.width = E.pad * 2 + cols.length * E.w + (cols.length - 1) * E.gap;
    cv.height = E.pad * 2 + rows.length * E.h + (rows.length - 1) * E.gap;
    const ctx = cv.getContext('2d'), t = r.t;
    const jpg = G.fmt === 'jpg';
    if (G.bg !== 'none' || jpg) { ctx.fillStyle = PALETTE.ink; ctx.fillRect(0, 0, cv.width, cv.height); }
    try {
      rows.forEach((rw, j) => cols.forEach((c, i) => {
        const spec = this.cell(G, c, rw), p = Object.assign(Object.create(r.painted), { fx: [] }), t0 =10 + i * 3 + j * 7;
        p.fireAt = t0 - 1; p.dripAt = t0 - 1;
        for (let k = 0; k <= 12; k++) {
          r.t = t0 + k * 0.03;
          this.drawCell(r, ctx, G, spec, p, E.pad + i * (E.w + E.gap), E.pad + j * (E.h + E.gap), E.w, E.h, this.ground(G, i, j, cols.length, rows.length));
        }
      }));
    } finally { r.t = t; }
    const a = document.createElement('a');
    a.href = jpg ? cv.toDataURL('image/jpeg', 0.92) : cv.toDataURL('image/png'); a.download = 'goat-grid.' + (jpg ? 'jpg' : 'png');
    document.body.appendChild(a); a.click(); a.remove();
  },

  devAction(game, id) {
    const G = this.state(game), [cmd, arg] = id.slice(5).split('=');
    if (cmd === 'across' || cmd === 'down') {
      const other = cmd === 'across' ? 'down' : 'across';
      G[cmd] = G[cmd] === arg ? null : arg;
      if (G[other] === arg) G[other] = null;
    } else if (cmd === 'chip') {
      const [key, n] = arg.split('.'), i = Number(n);
      if (G.across === key || G.down === key) {
        const p = G.pick[key], at = p.indexOf(i);
        if (at >= 0) { if (p.length > 1) p.splice(at, 1); } else { p.push(i); p.sort((a, b) => a - b); }
      } else G.base[key] = i;
    } else if (cmd === 'frame') G.frame = arg;
    else if (cmd === 'pose') G.pose = arg;
    else if (cmd === 'bg') G.bg = arg;
    else if (cmd === 'shout') G.shout = !G.shout;
    else if (cmd === 'zoom') G.zoom = Number(arg) ? clamp(G.zoom + Number(arg), 0, this.LOOK.zooms.length - 1) : 2;
    else if (cmd === 'side') G.side = { behind: 'left', left: 'right', right: 'behind' }[G.side];
    else if (cmd === 'fmt') G.fmt = G.fmt === 'png' ? 'jpg' : 'png';
    else if (cmd === 'shadow') G.shadow = { pixel: 'soft', soft: 'none', none: 'pixel' }[G.shadow];
    else if (cmd === 'tier') G.tier = G.tier % 3 + 1;
    else if (cmd === 'reset') game.dev.grid = null;
    else if (cmd === 'export') {
      try { this.exportPng(game, game.renderer); game.devToast('GOAT GRID SAVED AS ' + G.fmt.toUpperCase()); } catch (e) { console.error(e); game.devToast('SAVE FAILED'); }
    } else return false;
    if (G.painters) G.sig = '';
    return true;
  },
};
