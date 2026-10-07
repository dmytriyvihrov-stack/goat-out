// GOAT GRID, a tab of the dev tool: the goat as the build draws him (`PaintedArt.drawGoat`), laid
// out on a grid whose two axes are picked from the things the souls and the mouse put on him,
// horns, voice, talisman, the third eye, the facing, the hearts lost. Every cell is the real draw
// call with a stub `game` carrying the mods that cell stands for, so the grid can never show a look
// the game does not have. Each cell keeps its own copy of the painter's particle state (steam,
// flame, the venom drip) so sixteen goats breathing at once do not share one plume.
// Nothing here touches the run: no `game.mods`, no `game.artifacts` or `game.cape`, no simulation.
const GoatGrid = {
  AXES: {
    horns: { name: 'HORNS', values: [
      { label: 'PLAIN', mods: {} }, { label: 'LONG HORNS', mods: { antlers: true } },
      { label: 'BOMB CHARGE', mods: { bomb: true } }, { label: 'SPLASH', mods: { splash: true } },
      { label: 'LONG + BOMB', mods: { antlers: true, bomb: true } }, { label: 'LONG + SPLASH', mods: { antlers: true, splash: true } }] },
    voice: { name: 'VOICE', values: [
      { label: 'PLAIN', mods: {} }, { label: 'FULL THROAT', mods: { screamStun: true } },
      { label: 'DRAGON BREATH', mods: { breath: true } }, { label: 'VENOM SPIT', mods: { spit: true } }] },
    talisman: { name: 'TALISMAN', values: null },   // filled from ARTIFACTS on first use, and three at once
    cape: { name: 'CAPE', values: null },           // filled from CAPES on first use
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
    if (!a.values && key === 'talisman') a.values = [{ label: 'NONE', artifact: null }].concat(ARTIFACTS.map((x) => ({ label: x.name, artifact: x.id })),
      [{ label: 'THREE AT ONCE', artifact: ARTIFACTS.slice(0, TUNING.talisman.slots).map((x) => x.id) }]);
    if (!a.values && key === 'cape') a.values = [{ label: 'NONE', cape: null }].concat(CAPES.map((x) => ({ label: x.name, cape: x.id })));
    if (!a.values && key === 'floor') a.values = [{ label: 'NONE' }].concat(LEVELS.filter((l) => l.canon).map((l) => ({ label: l.canon.name, floor: l })));
    return a;
  },
  state(game) {
    const d = game.dev;
    // The first look is the one the poster was made with: horns across, voice down, facing SE.
    if (!d.grid) d.grid = { across: 'horns', down: 'voice', frame: 'full', bg: 'diag', pose: 'idle', shout: true, tier: 1, zoom: 2, shadow: 'pixel', side: 'behind', fmt: 'png',
      pick: { horns: [0, 1, 2, 3], voice: [0, 1, 2, 3], talisman: [0, 1, 2, 3], eye: [0, 1], facing: [0, 1, 2, 3, 4, 5, 6, 7], wounds: [0, 1, 2, 3], floor: [1, 2, 3, 4], decor: [1, 2, 3, 6] },
      base: { horns: 0, voice: 0, talisman: 0, eye: 0, facing: 7, wounds: 0, floor: 0, decor: 0 }, painters: new Map(), sig: '' };
    // the CAPE axis (6 Oct 2026), into a grid kept from before it
    d.grid.pick.cape ||= [0, 1, 2, 3, 4, 5]; if (d.grid.base.cape === undefined) d.grid.base.cape = 0;
    return d.grid;
  },
  // The values along one axis, or a single blank when nothing is picked for it.
  line(G, key) { return key ? G.pick[key].map((i) => ({ key, i })) : [null]; },

  // What one cell stands for: every axis at its base value, then the column's and the row's.
  cell(G, across, down) {
    const at = Object.assign({}, G.base);
    if (across) at[across.key] = across.i;
    if (down) at[down.key] = down.i;
    const mods = {}; let artifacts = [], cape = null, facing = 7, wounds = 0, floor = null, decor = null;
    for (const [key, i] of Object.entries(at)) {
      const v = this.axis(key).values[i]; if (!v) continue;
      if (v.mods) Object.assign(mods, v.mods);
      if (v.artifact) artifacts = [].concat(v.artifact).map((id) => ({ id, tier: Shop.tierFit(id, G.tier) }));
      if (v.cape) cape = { id: v.cape };
      if (v.facing !== undefined) facing = v.facing;
      if (v.wounds !== undefined) wounds = v.wounds;
      if (v.floor) floor = v.floor;
      if (v.decor) decor = v.decor;
    }
    return { mods, artifacts, cape, facing, wounds, floor, decor };
  },

  // One goat into a cell box. `painter` is this cell's own view of the renderer's painter (its
  // images shared, its particle state its own).
  drawCell(r, ctx, G, spec, painter, x, y, w, h, bg) {
    const angle = (spec.facing + 2) * Math.PI / 4, walk = G.pose === 'walk';
    const g = { x: 0, y: 0, facing: angle, vx: walk ? Math.cos(angle) * 80 : 0, vy: walk ? Math.sin(angle) * 80 : 0,
      state: 'idle', trail: [], hp: 4 - spec.wounds, maxHp: 4, invuln: 0, screaming: G.shout ? 1 : 0, dazed: 0, jitter: null, sqLeft: 0 };
    const stub = { mods: spec.mods, artifacts: spec.artifacts, cape: spec.cape, goat: g, stairFx: null, intro: null, touch: { active: false }, state: 'grid' };
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
      ctx.drawImage(r.painted.floorSwatch(def, 0, false, tx, ty), tx * TILE, ty * TILE, TILE + 0.5, TILE + 0.5);
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
    // GRID or SCENE: the same goat, as a sheet of variants or standing in one room with company.
    const u = r.s, mh = this.chipH(r);
    let mx = pad + ctx.measureText('THE GOAT GRID').width + 14 * u;
    for (const [label, id] of [['GRID', 'grid'], ['SCENE', 'scene']]) mx += this.button(r, d, mx, top - 6 * u, 0, mh, label, 'grid-mode=' + id, (G.mode || 'grid') === id) + 4 * u;
    if (G.mode === 'scene') { this.drawSceneTab(r, game, pad, top - 6 * u + mh + 8 * u, G); return; }
    ctx.font = `400 ${8.5 * s}px ${FONT}`; ctx.fillStyle = PALETTE.ash;
    ctx.fillText(r.clip('pick an axis ACROSS and one DOWN, then which of its values go in · the rest is one value for every cell', W - pad - mx - 8 * u), mx + 8 * u, top + 9 * s);

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
    this.save(cv, 'goat-grid', jpg);
  },
  save(cv, name, jpg) {
    const a = document.createElement('a');
    a.href = jpg ? cv.toDataURL('image/jpeg', 0.92) : cv.toDataURL('image/png'); a.download = name + '.' + (jpg ? 'jpg' : 'png');
    document.body.appendChild(a); a.click(); a.remove();
  },

  // ---- THE SCENE ----
  // One frame built by hand: a slice of a room in a floor's own stone, and on it the goat as the grid
  // dresses him, men of any kind in a pose, fire, blood and blasts, and the room's furniture. Every
  // piece is the game's own draw call, `drawTiles`' wall and floor, `drawProp`, `drawEnemy`,
  // `drawGoat`, `CombatFX`'s baked frames, handed stubs, never the run's lists: nothing here enters
  // `game.enemies`, `game.props` or the world, and the renderer's `game` is lent a stub for the length
  // of the draw only.
  SCENE: {
    men: { clubman: { label: 'CLUBMAN', kind: 'bearer' }, butcher: { label: 'BUTCHER', kind: 'bearer', champion: true },
      rifle: { label: 'RIFLE', kind: 'hunter' }, hound: { label: 'HOUND', kind: 'dog' }, seer: { label: 'SEER', kind: 'seer' },
      ogre: { label: 'OGRE', kind: 'butcher' }, wraith: { label: 'WRAITH', kind: 'wraith' },
      // the two clubmen with a body of their own (5 Oct 2026): drawn here as in the world, the Spartan with his board, the thrower
      shieldman: { label: 'SHIELDMAN', kind: 'bearer', shield: true }, thrower: { label: 'THROWER', kind: 'bearer', thrower: true }, shaman: { label: 'SHAMAN', kind: 'bearer', shaman: true } },
    fx: { fire: 'FIRE', witchfire: 'WITCHFIRE', pool: 'BLOOD POOL', spray: 'BLOOD SPRAY', blast: 'BLAST', witchblast: 'WITCH BLAST',
      smoke: 'SMOKE', dust: 'DUST', soul: 'SOUL' },
    // [label, Prop kind, opts, flat]: a flat one lies on the floor under everybody, as the game has it.
    props: { crate: ['CRATE', 'crate'], barrel: ['BARREL', 'barrel'], table: ['TABLE', 'table'], brazier: ['BRAZIER', 'brazier'],
      roast: ['ROAST', 'brazier', { roast: true }], lamp: ['LAMP', 'lamp'], sword: ['SWORDS', 'weapon', { weapon: 'sword' }],
      shield: ['SHIELD', 'weapon', { weapon: 'shield' }], bomb: ['BOMB', 'bomb'], rock: ['BOULDER', 'rock'], gong: ['GONG', 'bell'],
      coop: ['COOP', 'coop'], spire: ['TEETH', 'spire'], grass: ['MILK', 'heal', null, true], grate: ['GRATE', 'spike', null, true] },
    // What of the DECOR axis is not a Prop of its own: the pillar a template's `P` is, hay, cave growths, litter.
    decor: ['pillar', 'hay', 'stalagmites', 'shrooms', 'crystals', 'planks', 'rubble', 'straw', 'rug', 'pebbles', 'moss', 'puddle', 'crack'],
    poses: ['idle', 'walk', 'windup', 'swing', 'floored', 'flung', 'burning', 'dazed', 'poisoned', 'dead'],
    faces: ['goat', 'away', 'S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'],
    sizes: [[8, 5], [10, 6], [12, 7], [14, 8]], walls: ['none', 'far', 'room'],
    zooms: [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3], bursts: [['EARLY', 0.15], ['MID', 0.35], ['LATE', 0.6]],
    // `loop`: a windup fills over its own length, then holds full for the rest of `loop` lengths
    // before it starts again. `near`: how close (world px) a click must land to pick a placed thing.
    // A saved scene is `exportW` px wide or so, at a whole number of px per world px up to `exportMax`.
    loop: 1.6, near: 13, undo: 40, exportW: 1200, exportMax: 6, seed: 7, offset: 64,
  },

  fontPx(r, n) { return Math.max(n * r.ts, 12 * r.s); },   // never under 12 CSS px
  chipH(r) { return Math.max(17 * r.ts, this.fontPx(r, 10) + 8 * r.s); },
  // `devButton`'s look with a font that never goes under 12 CSS px; `w` 0 fits the label. Returns the width.
  button(r, d, x, y, w, h, label, id, on) {
    const ctx = r.ctx, u = r.s;
    ctx.font = `700 ${this.fontPx(r, 10)}px ${FONT_SC}`; if (!w) w = ctx.measureText(label).width + 14 * u;
    ctx.fillStyle = on ? 'rgba(185,135,58,0.55)' : 'rgba(59,34,51,0.75)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = on ? PALETTE.ochre : 'rgba(239,230,208,0.2)'; ctx.lineWidth = u; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = on ? PALETTE.fireHi : PALETTE.bone; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    d.rects.push({ x, y, w, h, id }); return w;
  },
  warn(what, e) {
    const w = this.warned || (this.warned = new Set());
    if (!w.has(what)) { w.add(what); console.warn('GOAT GRID scene: ' + what + ' did not draw', e); }
  },

  sceneOf(G) { return G.scene || (G.scene = this.exampleScene()); },
  // The frame the page opens on: THE ALTAR, the goat, a clubman winding up at him and one more coming,
  // a hound on its mark, a brazier with its coals knocked out beside it, and a man already down.
  exampleScene() {
    const T = TILE, at = (tool, x, y, more) => Object.assign({ tool, x: x * T, y: y * T, pose: 'idle', boss: false, face: 'goat', shout: false }, more);
    const items = [
      at('clubman', 6.25, 3.25, { pose: 'windup', shout: true }), at('clubman', 8.25, 4.75, { pose: 'walk' }),
      at('hound', 1.75, 4.25, { pose: 'windup' }), at('clubman', 2.75, 1.75, { pose: 'dead' }),
      at('brazier', 8.5, 1.5), at('fire', 7.5, 1.5), at('fire', 7.5, 2.5), at('pool', 5.25, 5.25),
      at('crate', 0.5, 0.5), at('pillar', 4.5, 0.5)];
    items.forEach((it, i) => { it.id = i + 1; });
    return { floor: 1, size: 1, walls: 1, frame: 'room', zoom: 2, tool: 'clubman', pose: 'idle', boss: false, face: 'goat', shout: false, burst: 1,
      goat: { x: 4.25 * T, y: 3.75 * T, pose: 'idle' }, items, seq: items.length, undo: [], stubs: new Map() };
  },
  toolKind(t) {
    const S = this.SCENE;
    return t === 'goat' || t === 'erase' ? t : S.men[t] ? 'man' : S.fx[t] ? 'fx' : S.props[t] ? 'prop' : S.decor.includes(t) ? 'decor' : null;
  },
  remember(sc) { sc.undo.push(JSON.stringify({ items: sc.items, goat: sc.goat, seq: sc.seq })); if (sc.undo.length > this.SCENE.undo) sc.undo.shift(); },

  sceneAction(G, cmd, arg) {
    const sc = this.sceneOf(G), S = this.SCENE, next = (v, n) => (v + 1) % n;
    if (cmd === 'at') { const [i, j] = arg.split('.').map(Number); this.place(sc, (i + 0.5) * TILE / 2, (j + 0.5) * TILE / 2); }
    else if (cmd === 'sc-floor') sc.floor = Number(arg);
    else if (cmd === 'sc-size') sc.size = next(sc.size, S.sizes.length);
    else if (cmd === 'sc-walls') sc.walls = next(sc.walls, S.walls.length);
    else if (cmd === 'sc-frame') sc.frame = sc.frame === 'room' ? 'cast' : 'room';
    else if (cmd === 'sc-zoom') sc.zoom = Number(arg) ? clamp(sc.zoom + Number(arg), 0, S.zooms.length - 1) : 2;
    else if (cmd === 'sc-tool') sc.tool = arg;
    else if (cmd === 'sc-pose') sc.pose = arg;
    else if (cmd === 'sc-boss') sc.boss = !sc.boss;
    else if (cmd === 'sc-shout') sc.shout = !sc.shout;
    else if (cmd === 'sc-face') sc.face = S.faces[next(S.faces.indexOf(sc.face), S.faces.length)];
    else if (cmd === 'sc-burst') sc.burst = next(sc.burst, S.bursts.length);
    else if (cmd === 'sc-goat' && this.AXES[arg]) G.base[arg] = next(G.base[arg], this.axis(arg).values.length);
    else if (cmd === 'sc-undo') { const u = sc.undo.pop(); if (u) Object.assign(sc, JSON.parse(u)); }
    else if (cmd === 'sc-clear') { this.remember(sc); sc.items = []; sc.goat = null; }
    else if (cmd === 'sc-example') { this.remember(sc); const ex = this.exampleScene(); sc.items = ex.items; sc.goat = ex.goat; sc.seq = ex.seq; }
  },
  // A click on the floor with the picked thing: on empty floor it is put there; on one of its own
  // kind it takes the pose, facing and outline now chosen, and if it already had them it is lifted.
  // Furniture and fire keep to whole tiles as the game lays them; men, the goat and the rest to halves.
  place(sc, x, y) {
    const kind = this.toolKind(sc.tool), N = this.SCENE.near;
    if (!kind) return;
    this.remember(sc);
    if (kind === 'prop' || kind === 'decor' || sc.tool === 'fire' || sc.tool === 'witchfire') { x = (Math.floor(x / TILE) + 0.5) * TILE; y = (Math.floor(y / TILE) + 0.5) * TILE; }
    const g = sc.goat, onGoat = g && Math.hypot(g.x - x, g.y - y) < N;
    if (kind === 'goat') { if (!onGoat) sc.goat = { x, y, pose: sc.pose }; else if (g.pose !== sc.pose) g.pose = sc.pose; else sc.goat = null; return; }
    if (kind === 'erase') {
      let best = null, bd = N;
      for (const it of sc.items) { const dd = Math.hypot(it.x - x, it.y - y); if (dd < bd) { bd = dd; best = it; } }
      if (best) sc.items.splice(sc.items.indexOf(best), 1); else if (onGoat) sc.goat = null; else sc.undo.pop();
      return;
    }
    const hit = sc.items.find((it) => it.tool === sc.tool && Math.hypot(it.x - x, it.y - y) < N);
    if (hit) {
      const same = kind !== 'man' || (hit.pose === sc.pose && hit.boss === sc.boss && hit.face === sc.face && hit.shout === sc.shout);
      if (same) sc.items.splice(sc.items.indexOf(hit), 1); else Object.assign(hit, { pose: sc.pose, boss: sc.boss, face: sc.face, shout: sc.shout });
      return;
    }
    sc.items.push({ id: ++sc.seq, tool: sc.tool, x, y, pose: sc.pose, boss: sc.boss, face: sc.face, shout: sc.shout });
  },

  // The room as tiles: floor inside cols x rows, stone by WALLS, none, the far wall, or the whole ring.
  sceneStone(sc, x, y) {
    const [cols, rows] = this.SCENE.sizes[sc.size], w = this.SCENE.walls[sc.walls];
    return w === 'room' ? x < 0 || y < 0 || x >= cols || y >= rows : w === 'far' ? y < 0 : false;
  },
  sceneFloor(sc) { const v = this.axis('floor').values[sc.floor]; return (v && v.floor) || LEVELS[0]; },
  // What the frame holds, world px: the room and its walls, or (CAST) everything placed with a margin,
  // then widened or narrowed about its middle by ZOOM.
  sceneBox(sc) {
    const S = this.SCENE, [cols, rows] = S.sizes[sc.size], w = S.walls[sc.walls], T = TILE, ring = w === 'room' ? 1 : 0;
    let b = { x0: -ring * T, y0: w === 'none' ? 0 : -T, x1: (cols + ring) * T, y1: (rows + ring) * T };
    const pts = sc.items.map((it) => [it.x, it.y]).concat(sc.goat ? [[sc.goat.x, sc.goat.y]] : []);
    if (sc.frame === 'cast' && pts.length) {
      const m = T * 1.5, xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      b = { x0: Math.min(...xs) - m, y0: Math.min(...ys) - m * 1.4, x1: Math.max(...xs) + m, y1: Math.max(...ys) + m * 0.8 };
      // never less than four tiles by three, so one goat alone is still a picture of a place
      const grow = (a0, a1, n) => { const dd = n * T - (a1 - a0); return dd > 0 ? [a0 - dd / 2, a1 + dd / 2] : [a0, a1]; };
      [b.x0, b.x1] = grow(b.x0, b.x1, 4); [b.y0, b.y1] = grow(b.y0, b.y1, 3);
    }
    const z = S.zooms[sc.zoom] || 1, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, hw = (b.x1 - b.x0) / 2 / z, hh = (b.y1 - b.y0) / 2 / z;
    return { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh };
  },
  // The box into a screen rect: one scale, y squashed by TILT as the game's camera squashes it, centred.
  sceneFit(b, x, y, w, h) {
    const bw = b.x1 - b.x0, bh = (b.y1 - b.y0) * TILT, S = Math.min(w / bw, h / bh);
    return { S, ox: x + w / 2 - (b.x0 + bw / 2) * S, oy: y + h / 2 - (b.y0 * TILT + bh / 2) * S };
  },

  // The floor and the walls the way `PaintedArt.drawTiles` lays them, the same masks, sheets, shadow
  // strips, litter, straw at the wall's foot and banners, off a small grid of its own. Tile indices
  // are pushed `offset` along so the sheets and hashes never see a negative tile.
  sceneTiles(r, ctx, sc, def, view, busy) {
    const P = r.painted, T = TILE, O = this.SCENE.offset, stone = (x, y) => this.sceneStone(sc, x, y);
    const x0 = Math.floor(view.x0 / T) - 1, x1 = Math.ceil(view.x1 / T), y0 = Math.floor(view.y0 / T) - 1, y1 = Math.ceil(view.y1 / T);
    if ((x1 - x0) * (y1 - y0) > 6000) return;
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x * T, py = y * T, h = P.hash(x + O, y + O, this.SCENE.seed);
      if (stone(x, y)) {
        const n = !stone(x, y - 1), s = !stone(x, y + 1), w = !stone(x - 1, y), e = !stone(x + 1, y);
        if (!(n || s || w || e || !stone(x - 1, y - 1) || !stone(x + 1, y - 1) || !stone(x - 1, y + 1) || !stone(x + 1, y + 1))) continue;
        let m = (n ? 1 : 0) | (e ? 2 : 0) | (s ? 4 : 0) | (w ? 8 : 0);
        if (!n && !e && !stone(x + 1, y - 1)) m |= 16; if (!s && !e && !stone(x + 1, y + 1)) m |= 32;
        if (!s && !w && !stone(x - 1, y + 1)) m |= 64; if (!n && !w && !stone(x - 1, y - 1)) m |= 128;
        P.drawWall(ctx, def, px, py, m, x + O, y + O);
        if (s && (x + O) % 5 === 1 && h % 3 !== 0 && !w && !e) P.stamp(ctx, 'banner', px + 16, py + 18, 13, 17, 0.2);
        continue;
      }
      ctx.drawImage(P.floorSwatch(def, h, false, x + O, y + O), px, py, T + PIXEL_ROOMS.bleed, T + PIXEL_ROOMS.bleed);
      ctx.fillStyle = PALETTE.altar.shadow;
      if (stone(x, y - 1)) ctx.fillRect(px, py, 32, 5);
      if (stone(x - 1, y)) ctx.fillRect(px, py, 3, 32);
      if (!stone(x, y - 1) && !busy.has(x + ',' + y)) { ctx.save(); ctx.translate(-O * T, -O * T); PIXEL_ENV.litter(ctx, 'room', x + O, y + O); ctx.restore(); }
      else if (stone(x, y - 1) && h % 5 === 0) P.straw(ctx, px + 16, py + 6, h, false);
    }
    ctx.imageSmoothingEnabled = smooth;
  },

  // A man as `drawEnemy` wants one: a plain object carrying what the draw reads, never an `Enemy`
  // (whose constructor rolls a wraith into hiding). Kept per placed man so his windup glow can count.
  manStub(sc, it) {
    const key = 'm|' + it.tool + '|' + it.boss + '|' + it.shout, old = sc.stubs.get('m' + it.id);
    if (old && old.key === key) return old;
    const M = this.SCENE.men[it.tool], cfg = TUNING[M.kind];
    let hp = M.champion ? TUNING.champion.hp : M.shield ? TUNING.shieldman.hp : M.thrower ? TUNING.thrower.hp : M.shaman ? TUNING.shaman.hp : cfg.hp || 1;
    if (it.boss) hp = M.kind === 'butcher' ? cfg.hp : hp + TUNING.boss.champHp;   // a champion: no soul in a scene stub
    const e = { key, id: it.id, kind: M.kind, cfg, r: cfg.radius, champion: !!M.champion, boss: !!it.boss, elite: !!it.boss && M.kind !== 'butcher',
      keeper: false, hp, maxHp: hp, dead: false, ghosted: false, x: it.x, y: it.y, vx: 0, vy: 0, facing: 0, flash: 0, burning: 0, witchBurn: false,
      bombFuse: 0, dazed: 0, poison: 0, shock: 0, impaled: 0, state: 'idle', timer: 0, say: null, soul: false, lurk: false,
      shieldman: !!M.shield, shield: M.shield ? { uses: TUNING.shieldman.uses, jolt: 0, ang: 0, low: 0 } : null, thrower: !!M.thrower, shaman: !!M.shaman };
    // What he shouts is off his kind's first-sight lines, picked by his number so it keeps.
    const B = M.kind === 'dog' || M.kind === 'wraith' ? null : BARKS.spot[M.kind] || BARKS.attack;
    if (it.shout && B && B.length) e.say = { text: B[it.id % B.length], life: 1, max: 2 };
    sc.stubs.set('m' + it.id, e); return e;
  },
  // Where he looks and what he is in the middle of, every frame. Each kind's own windup: the club's
  // swing, the butcher's hook, the rifle's aim, the hound's run, the seer's rune, the ogre's slam.
  poseMan(e, it, aim, t) {
    const S = this.SCENE, k = e.kind, f = S.faces.indexOf(it.face);
    e.x = it.x; e.y = it.y;
    e.facing = f >= 2 ? f * Math.PI / 4 : aim ? Math.atan2(aim.y - it.y, aim.x - it.x) + (f === 1 ? Math.PI : 0) : (f === 1 ? -1 : 1) * Math.PI / 2;
    const c = Math.cos(e.facing), s = Math.sin(e.facing), at = aim || { x: it.x + c * 4 * TILE, y: it.y + s * 4 * TILE };
    Object.assign(e, { state: 'idle', timer: 0, vx: 0, vy: 0, burning: 0, dazed: 0, poison: 0, ghosted: k === 'wraith', hopZ: 0, hopTo: null,
      hookAim: null, hook: null, rune: null, dashPath: null });
    const wind = (dur) => { e.timer = dur * (1 - Math.min(1, (t % (dur * S.loop)) / dur)); };
    const run = () => { e.dashPath = [{ x: it.x, y: it.y }, { x: at.x, y: at.y }]; };
    const p = it.pose;
    if (p === 'walk') { e.vx = c * 60; e.vy = s * 60; e.state = 'chase'; }
    else if (p === 'windup') {
      if (k === 'hunter') { e.state = 'aim'; wind(TUNING.hunter.aimTime); }
      else if (k === 'seer') { e.state = 'cast'; wind(TUNING.seer.castWind); e.rune = { x: at.x, y: at.y }; }
      else if (k === 'butcher') { e.state = 'slamwind'; wind(TUNING.butcher.slam.wind); }
      else if (e.champion) { e.state = 'hookwind'; wind(TUNING.champion.hook.wind); e.hookAim = at; }
      else if (k === 'dog') { e.state = 'windup'; wind(TUNING.dog.windup); run(); }
      else { e.state = 'windup'; wind(e.cfg.windup); e.ghosted = false; }
    } else if (p === 'swing') {
      if (k === 'hunter') e.state = 'aim';
      else if (k === 'seer') { e.state = 'cast'; e.rune = { x: at.x, y: at.y }; }
      else if (k === 'butcher') { e.state = 'hop'; e.hopZ = 18; e.hopTo = { x: at.x, y: at.y }; e.timer = TUNING.butcher.leap.air * 0.5; }
      else if (e.champion) { e.state = 'hookthrow'; const d = Math.hypot(at.x - it.x, at.y - it.y) * 0.6; e.hook = { x: it.x + c * d, y: it.y + s * d, ux: c, uy: s, left: d, caught: null }; }
      else if (k === 'dog') { e.state = 'dart'; e.vx = c * 200; e.vy = s * 200; run(); }
      else { e.state = 'swing'; e.ghosted = false; }
    } else if (p === 'floored') e.state = 'floored';
    else if (p === 'flung') { e.state = 'flung'; e.ghosted = false; }
    else if (p === 'burning') { e.state = 'burning'; e.burning = 3; }
    else if (p === 'dazed') e.dazed = 2;
    else if (p === 'poisoned') e.poison = 2;
  },
  // A man down for good: his body as `CombatFX.death` leaves one, on his side in his pool.
  drawCorpse(r, ctx, sc, it, e) {
    const key = 'c|' + it.tool; let c = sc.stubs.get('c' + it.id);
    if (!c || c.key !== key) sc.stubs.set('c' + it.id, c = { key, body: CombatFX.prototype.corpseSprite.call({ game: { renderer: r } }, e, it.id % 2 ? Math.PI : 0, false) });
    const C = TUNING.effects.corpse;
    CombatFX.pool(ctx, it.x, it.y, e.kind === 'butcher' ? C.big : C.pool, it.id * 7919, null);
    CombatFX.prototype.drawPiece.call(null, ctx, { x: it.x, y: it.y, z: 0, image: c.body.image, shade: c.body.shade, crop: [0, 0, 96, 96],
      width: 96, height: 96, angle: (it.id % 2 ? 1 : -1) * Math.PI / 2, material: 'body' }, false);
  },
  propStub(sc, it) {
    const key = 'p|' + it.tool, old = sc.stubs.get('p' + it.id);
    if (old && old.key === key) return old.p;
    const [, kind, opts] = this.SCENE.props[it.tool], p = new Prop(it.x, it.y, kind, opts || undefined);
    sc.stubs.set('p' + it.id, { key, p }); return p;
  },
  drawDecor(r, ctx, it) {
    const v = this.axis('decor').values.find((x) => x.decor && x.decor.id === it.tool); if (!v || !PIXEL_ENV.ready) return;
    const D = v.decor;
    if (it.tool === 'hay') PIXEL_ENV.draw(ctx, 'hay', it.x, it.y + 13, 33);
    else if (D.flat) PIXEL_ENV.draw(ctx, D.id, it.x, it.y, D.w, 0.5);
    else { r.shadow(it.x, it.y + 11, D.w * 0.45, D.w * 0.18); PIXEL_ENV.draw(ctx, D.id, it.x, it.y + 15, D.w); }
  },
  // A blast, a cloud or a spray at one moment of itself (BURST), from the frames `CombatFX.draw` plays.
  drawBurst(r, ctx, it, q) {
    const E = TUNING.effects, B = E.blast, witch = it.tool === 'witchblast';
    const kind = { blast: 'boom', witchblast: 'boom', smoke: 'soot', dust: 'dust', spray: 'blood' }[it.tool];
    const br = kind === 'blood' ? 30 * E.bloodScale : kind === 'dust' ? 19 : kind === 'soot' ? TUNING.prop.bomb.blastR * B.soot : TUNING.prop.bomb.blastR;
    const set = CombatFX.burstFrames(kind, br * (kind === 'boom' ? B.scale : kind === 'blood' ? 1 : B.dustScale), witch);
    const im = set.frame(Math.min(set.n - 1, Math.floor((kind === 'dust' || kind === 'soot' ? 0.3 + q * 0.7 : q) * set.n)));
    if (kind === 'boom' && q < B.lightFor) {
      const a = 1 - q / B.lightFor, R = br * B.light; ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gl = ctx.createRadialGradient(it.x, it.y, 0, it.x, it.y, R);
      gl.addColorStop(0, witch ? `rgba(125,92,255,${0.5 * a})` : `rgba(255,170,70,${0.5 * a})`); gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gl; ctx.fillRect(it.x - R, it.y - R, R * 2, R * 2); ctx.restore();
    }
    if (kind === 'boom' && q < B.ringFor) {
      const p = q / B.ringFor; ctx.save(); ctx.globalAlpha = 1 - p;
      CombatFX.pixelRing(ctx, it.x, it.y, br * (0.5 + p * B.ringOut), 2 * (1 - p) + 1, witch ? PALETTE.witchHi : PALETTE.fireHi); ctx.restore();
    }
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(it.x, it.y); ctx.scale(1, 1 / TILT);
    const s = set.D * E.pixel; if (kind === 'dust' || kind === 'soot') ctx.globalAlpha = B.dustAlpha;
    ctx.drawImage(im, Math.round(-s / 2), Math.round(-s / 2 - (kind === 'blood' ? 0 : br * 0.12)), s, s);
    ctx.restore();
  },
  // The goat as the grid's single values dress him (horns, voice, talisman, eye, wounds, facing), in
  // the pose he was put down with.
  sceneGoat(r, G, sc) {
    const spec = this.cell(G, null, null), go = sc.goat, a = (spec.facing + 2) * Math.PI / 4, p = go.pose;
    const g = { x: go.x, y: go.y, facing: a, vx: 0, vy: 0, state: 'idle', timer: 0, aim: { x: Math.cos(a), y: Math.sin(a) }, rollSpin: 0,
      trail: [], hp: 4 - spec.wounds, maxHp: 4, invuln: 0, screaming: G.shout ? 1 : 0, dazed: 0, jitter: null, sqLeft: 0, onFire: false, witchFire: false };
    if (p === 'walk') { g.vx = Math.cos(a) * 80; g.vy = Math.sin(a) * 80; }
    else if (p === 'windup') { g.state = 'windup'; g.timer = TUNING.goat.headbutt.windup * 0.35; }
    else if (p === 'swing') g.state = 'lunge';
    else if (p === 'floored' || p === 'dead') g.state = 'stunned';
    else if (p === 'flung') { g.state = 'roll'; g.rollSpin = r.t * 14; }
    else if (p === 'burning') g.onFire = true;
    else if (p === 'dazed') g.dazed = 1;
    return { g, stub: { mods: spec.mods, artifacts: spec.artifacts, cape: spec.cape, goat: g, stairFx: null, intro: null, touch: { active: false }, state: 'grid' } };
  },

  // The whole frame into a screen rect, in the order the game's world pass keeps: floor and walls,
  // what lies on the floor, fire, the marks men lay down, then everyone standing by where their feet
  // are, what hangs over heads, and last what is in the air. Each piece on its own, so a sprite that
  // is missing costs that piece and never the page.
  drawScene(r, ctx, G, sc, x, y, w, h) {
    const box = this.sceneBox(sc), f = this.sceneFit(box, x, y, w, h), def = this.sceneFloor(sc), S = f.S, T = TILE;
    const safe = (what, fn) => { ctx.save(); try { fn(); } catch (e) { this.warn(what, e); } finally { ctx.restore(); } };
    const view = { x0: (x - f.ox) / S, x1: (x + w - f.ox) / S, y0: (y - f.oy) / (S * TILT), y1: (y + h - f.oy) / (S * TILT) };
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = def.fog || PALETTE.ink; ctx.fillRect(x, y, w, h);
    ctx.translate(f.ox, f.oy); ctx.scale(S, S * TILT);
    const goat = sc.goat ? this.sceneGoat(r, G, sc) : null, aim = goat ? { x: goat.g.x, y: goat.g.y } : null;
    const lay = { decor: [], flat: [], pools: [], dead: [], fire: [], souls: [], down: [], up: [], stand: [], air: [] }, busy = new Set();
    for (const it of sc.items) {
      const kind = this.toolKind(it.tool);
      if (kind === 'prop' || kind === 'decor') busy.add(Math.floor(it.x / T) + ',' + Math.floor(it.y / T));
      if (kind === 'man') {
        const e = this.manStub(sc, it); this.poseMan(e, it, aim, r.t);
        if (it.pose === 'dead') lay.dead.push([it, e]); else if (it.pose === 'floored') lay.down.push(e); else lay.up.push(e);
      } else if (kind === 'prop') {
        const p = this.propStub(sc, it);
        if (this.SCENE.props[it.tool][3]) lay.flat.push(p); else lay.stand.push({ y: p.y, what: it.tool, draw: () => r.drawProp(p) });
      } else if (kind === 'decor') {
        const flat = it.tool === 'hay' || (this.axis('decor').values.find((v) => v.decor && v.decor.id === it.tool) || { decor: {} }).decor.flat;
        if (flat) lay.decor.push(it); else lay.stand.push({ y: it.y + 13, what: it.tool, draw: () => this.drawDecor(r, ctx, it) });
      } else if (it.tool === 'fire' || it.tool === 'witchfire') lay.fire.push(it);
      else if (it.tool === 'pool') lay.pools.push(it);
      else if (it.tool === 'soul') lay.souls.push(it);
      else if (kind === 'fx') lay.air.push(it);
    }
    // The renderer is lent this scene as its `game` for the length of the draw: the rifle's line, the
    // runes and the hound's run read the goat and the men off it.
    const world = { goat: goat ? goat.g : null, mods: { enemySlow: 1 }, enemies: lay.up.concat(lay.down), props: [], hidden: () => false, level: null, world: null };
    const lent = { ctx: r.ctx, game: r.game, overheads: r.overheads, groundDone: r.groundDone };
    r.ctx = ctx; r.game = world; r.overheads = null; r.groundDone = false;
    try {
      safe('floor', () => this.sceneTiles(r, ctx, sc, def, view, busy));
      for (const it of lay.decor) safe(it.tool, () => this.drawDecor(r, ctx, it));
      for (const it of lay.pools) safe('pool', () => CombatFX.pool(ctx, it.x, it.y, TUNING.effects.corpse.big, it.id * 7919, null));
      for (const [it, e] of lay.dead) safe('corpse', () => this.drawCorpse(r, ctx, sc, it, e));
      for (const p of lay.flat) safe(p.kind, () => r.drawProp(p));
      for (const it of lay.fire) safe('fire', () => {
        const tx = Math.floor(it.x / T), ty = Math.floor(it.y / T), sd = (tx + 64) * 3 + ty;
        ctx.scale(1, 1 / TILT); r.flame(it.x, it.y * TILT, 14 + (((tx + 64) * 7 + ty * 3) % 5 + 5) % 5, sd, it.tool === 'witchfire');
      });
      safe('runes', () => r.drawRunes(world));
      safe('runs', () => r.drawDashPaths(world));
      for (const it of lay.souls) safe('soul', () => { const ph = it.id * 1.7; r.shadow(it.x, it.y + 6, 9, 4); r.soulWisp(it.x, it.y + Math.sin(r.t * 2.6 + ph) * 2.5, 1, ph); });
      r.overheads = [];
      for (const e of lay.down) safe(e.kind, () => r.drawEnemy(e, world));
      for (const e of lay.up) safe(e.kind, () => r.drawEnemyGround(e, world));
      for (const e of lay.up) lay.stand.push({ y: e.y, what: e.kind, draw: () => r.drawEnemy(e, world) });
      if (goat) lay.stand.push({ y: goat.g.y, what: 'goat', draw: () => this.painter(r, G, 'scene').drawGoat(r, goat.g, goat.stub) });
      r.groundDone = true;
      for (const o of lay.stand.sort((a, b) => a.y - b.y)) safe(o.what, o.draw);
      r.groundDone = false;
      safe('hooks', () => r.drawHooks({ enemies: lay.up }));   // a butcher posed mid-throw has his rope out
      const heads = r.overheads.sort((a, b) => b.e.y - a.e.y), plates = []; r.overheads = null;
      for (const hd of heads) safe('overhead', () => { ctx.globalAlpha = hd.a; r.drawOverhead(hd.e, plates); });
      const q = this.SCENE.bursts[sc.burst][1];
      for (const it of lay.air) safe(it.tool, () => this.drawBurst(r, ctx, it, q));
    } finally { Object.assign(r, lent); ctx.restore(); }
  },

  // The SCENE page: rows of what to put in, then the frame as large as the page allows. A click on the
  // floor puts the picked thing there; the rest of the page is chips, every one readable at 12 px.
  drawSceneTab(r, game, pad, y, G) {
    const ctx = r.ctx, u = r.s, d = game.dev, W = r.w, H = r.h, sc = this.sceneOf(G), S = this.SCENE;
    const fs = this.fontPx(r, 10), ch = this.chipH(r), labelW = Math.max(86 * r.ts, 96 * u);
    const row = (name, chips) => {
      ctx.font = `700 ${fs}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(name, pad, y + ch / 2); ctx.textBaseline = 'alphabetic';
      let x = pad + labelW;
      for (const c of chips) {
        if (!c) { x += 10 * u; continue; }   // a gap between groups
        ctx.font = `700 ${fs}px ${FONT_SC}`;
        const w = ctx.measureText(c[0]).width + 14 * u;
        if (x + w > W - pad && x > pad + labelW) { x = pad + labelW; y += ch + 3 * u; }
        this.button(r, d, x, y, w, ch, c[0], c[1], !!c[2]); x += w + 4 * u;
      }
      y += ch + 6 * u;
    };
    const tool = (k, label) => [label, 'grid-sc-tool=' + k, sc.tool === k], [cols, rows] = S.sizes[sc.size];
    row('FLOOR', this.axis('floor').values.map((v, i) => (i ? [v.label, 'grid-sc-floor=' + i, sc.floor === i] : null)).filter(Boolean));
    row('ROOM', [['SIZE ' + cols + '×' + rows, 'grid-sc-size'], ['WALLS: ' + S.walls[sc.walls].toUpperCase(), 'grid-sc-walls'], null,
      ['FRAME: ' + (sc.frame === 'room' ? 'ROOM' : 'CAST'), 'grid-sc-frame'], null,
      ['ZOOM −', 'grid-sc-zoom=-1'], ['ZOOM ' + S.zooms[sc.zoom] + '×', 'grid-sc-zoom=0'], ['ZOOM +', 'grid-sc-zoom=1']]);
    row('THE GOAT', [tool('goat', 'PUT THE GOAT'), null].concat(['horns', 'voice', 'talisman', 'cape', 'eye', 'wounds', 'facing'].map((k) =>
      [this.axis(k).name + ': ' + this.axis(k).values[G.base[k]].label, 'grid-sc-goat=' + k]), [['TIER ' + 'I'.repeat(G.tier), 'grid-tier'], ['SHOUTING', 'grid-shout', G.shout]]));
    row('THE CULT', Object.entries(S.men).map(([k, m]) => tool(k, m.label)));
    row('POSE', S.poses.map((p) => [p.toUpperCase(), 'grid-sc-pose=' + p, sc.pose === p]).concat([null, ['BOSS', 'grid-sc-boss', sc.boss],
      ['FACING: ' + (sc.face === 'goat' ? 'THE GOAT' : sc.face.toUpperCase()), 'grid-sc-face'], ['BARKS', 'grid-sc-shout', sc.shout]]));
    row('EFFECTS', Object.entries(S.fx).map(([k, l]) => tool(k, l)).concat([null, ['BURST: ' + S.bursts[sc.burst][0], 'grid-sc-burst']]));
    row('PROPS', Object.entries(S.props).map(([k, p]) => tool(k, p[0])).concat([null], S.decor.map((k) => tool(k, k.toUpperCase()))));
    row('', [tool('erase', 'ERASE'), ['UNDO', 'grid-sc-undo'], ['CLEAR', 'grid-sc-clear'], ['EXAMPLE', 'grid-sc-example'], null,
      ['FORMAT: ' + G.fmt.toUpperCase(), 'grid-fmt'], ['SAVE ' + G.fmt.toUpperCase(), 'grid-export'], ['RESET', 'grid-reset']]);
    const hs = this.fontPx(r, 9);
    ctx.font = `400 ${hs}px ${FONT}`; ctx.fillStyle = PALETTE.ash; ctx.textAlign = 'left';
    ctx.fillText(r.clip('click the floor to put what is picked there · click it again to give it the pose, facing and outline now chosen, and once more to lift it · the goat wears what the rows above say', W - pad * 2), pad, y + hs);
    y += hs + 10 * u;

    const aw = W - pad * 2, ah = Math.max(H - y - pad, 240 * u);
    this.drawScene(r, ctx, G, sc, pad, y, aw, ah);
    ctx.strokeStyle = 'rgba(239,230,208,0.2)'; ctx.lineWidth = u; ctx.strokeRect(pad, y, aw, ah);
    // The floor answers a click half a tile at a time: one rect per half tile in view that is not stone.
    const f = this.sceneFit(this.sceneBox(sc), pad, y, aw, ah), cw = TILE / 2 * f.S, chh = cw * TILT;
    const i0 = Math.floor((pad - f.ox) / cw), i1 = Math.ceil((pad + aw - f.ox) / cw), j0 = Math.floor((y - f.oy) / chh), j1 = Math.ceil((y + ah - f.oy) / chh);
    if ((i1 - i0) * (j1 - j0) > 4000) return;
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
      if (this.sceneStone(sc, Math.floor(i / 2), Math.floor(j / 2))) continue;
      const rx = f.ox + i * cw, ry = f.oy + j * chh, x0 = Math.max(rx, pad), y0 = Math.max(ry, y), x1 = Math.min(rx + cw, pad + aw), y1 = Math.min(ry + chh, y + ah);
      if (x1 > x0 && y1 > y0) d.rects.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, id: `grid-at=${i}.${j}` });
    }
  },
  // The scene as it is framed, a whole number of px to a world px so every pixel of the art stays square.
  exportScene(game, r) {
    const G = this.state(game), sc = this.sceneOf(G), S = this.SCENE, b = this.sceneBox(sc), bw = b.x1 - b.x0, bh = (b.y1 - b.y0) * TILT;
    const k = clamp(Math.round(S.exportW / bw), 2, S.exportMax), cv = document.createElement('canvas');
    cv.width = Math.round(bw * k); cv.height = Math.round(bh * k);
    const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    this.drawScene(r, ctx, G, sc, 0, 0, cv.width, cv.height);
    this.save(cv, 'goat-scene', G.fmt === 'jpg');
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
    else if (cmd === 'tier') G.tier = G.tier % RARITY.length + 1;
    else if (cmd === 'reset') { game.dev.grid = null; if (G.mode === 'scene') this.state(game).mode = 'scene'; }
    else if (cmd === 'export') {
      const scene = G.mode === 'scene';
      try { if (scene) this.exportScene(game, game.renderer); else this.exportPng(game, game.renderer); game.devToast((scene ? 'SCENE' : 'GOAT GRID') + ' SAVED AS ' + G.fmt.toUpperCase()); } catch (e) { console.error(e); game.devToast('SAVE FAILED'); }
    } else if (cmd === 'mode') G.mode = arg === 'scene' ? 'scene' : 'grid';
    else if (cmd === 'at' || cmd.startsWith('sc-')) this.sceneAction(G, cmd, arg);
    else return false;
    if (G.painters) G.sig = '';
    return true;
  },
};
