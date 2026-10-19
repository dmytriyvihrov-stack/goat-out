// THE FACTORY's units (12 Oct 2026, output/factory-art-2026-10-12, js/factory-assets.js packed by tools/pack-factory.js):
// the SAWBOT (a front and a back view), the WELDER (idle and firing from the side, the old torch pair up and down the
// screen) and THE AUTOMATON. The automaton's body is the cut off the chosen variant A (the corner cage: a square iron
// frame, the meat bulging out of its sides, four hips); its four legs are drawn here in cells off the body's own
// palette, so a leg can step, lift for a stomp, swing out knocked, and fold when he falls. Everything is baked at `UP`
// nearest-neighbour and drawn smoothed at `TX` world px a texel, as the ogre is (js/ogre-pixels.js). Render only.
const FACTORY_PIXELS = (() => {
  const UP = 3, TX = 1.35;
  // the legs' palette, averaged off the picture's own legs (iron, rust, bone, the outline)
  const P = { ol: '#0e0c10', i0: '#2a272d', i1: '#444148', i2: '#6c696d', i3: '#8b878d', r0: '#492723', r1: '#6e4439', r2: '#8e4535', r3: '#b85e43', b0: '#bfb2a0', b1: '#cec1ae', b2: '#ebe1d2', h0: '#c8392c', h1: '#ff6a4e' };
  // where each hip sits on the body cut (texels from its top-left; the cut is 94 x 55, its centre column 47): back-left,
  // front-left, front-right, back-right, the order `Automaton` keeps its legs in
  const HIPS = [[8, 42], [28, 53], [48, 54], [86, 39]];
  const F = { image: null, ready: false, baked: new Map(), UP, TX, P, HIPS, W: 94, H: 55 };

  F.init = () => {
    if (typeof FACTORY_ASSETS === 'undefined' || typeof document === 'undefined') return;
    const img = new Image();
    img.onload = () => { F.image = img; F.ready = true; };
    img.src = FACTORY_ASSETS.src;
  };
  // one item of the atlas baked `UP` times up, point-sampled, once
  F.canvas = (name) => {
    let c = F.baked.get(name); if (c) return c;
    const it = FACTORY_ASSETS.items[name]; if (!it || !F.ready) return null;
    c = document.createElement('canvas'); c.width = it[2] * UP; c.height = it[3] * UP;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(F.image, it[0], it[1], it[2], it[3], 0, 0, it[2] * UP, it[3] * UP);
    F.baked.set(name, c); return c;
  };
  // a baked item drawn standing on the origin (its bottom row at y = 0, centred), `flip` mirrored
  const stand = (ctx, name, flip, dy = 0, k = TX) => {
    const c = F.canvas(name); if (!c) return false;
    const it = FACTORY_ASSETS.items[name], smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.save(); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(c, -it[2] / 2 * k, -it[3] * k + dy, it[2] * k, it[3] * k);
    ctx.restore(); ctx.imageSmoothingEnabled = smooth;
    return true;
  };
  const facingOf = (angle) => (Math.round(angle / (Math.PI / 4)) % 8 + 14) % 8;   // 0 S, 1 SW, 2 W, 3 NW, 4 N, 5 NE, 6 E, 7 SE

  // A baked item again, red-hot (13 Oct 2026: fire heats the iron, `Sawbot.heat`): its own pixels lit toward ember.
  F.hot = (name) => {
    const key = name + '@hot'; let c = F.baked.get(key); if (c) return c;
    const b = F.canvas(name); if (!b) return null;
    c = document.createElement('canvas'); c.width = b.width; c.height = b.height;
    const g = c.getContext('2d'); g.drawImage(b, 0, 0); g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(255,74,28,0.62)'; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(120,40,0,0.35)'; g.fillRect(0, 0, c.width, c.height);
    F.baked.set(key, c); return c;
  };
  // THE CHAINSAW on its arm (13 Oct 2026 playtest: "the saw arm bigger"): a bar of cells out of its hand, the chain's
  // teeth running along both edges, a rust motor block at the grip. Three poses (rest out to the side, raised in the
  // windup, down in the swing) and three steps of the chain, baked once each in texels.
  // `SAW_HAND` on the front (his right on the screen's left), `SAW_HAND_BACK` on the back (his right on the screen's right)
  const SAW_HAND = [3, 17], SAW_HAND_BACK = [23, 17], SAW_ANG = { rest: 2.55, wind: -2.15, swing: 1.85 };
  const sawBar = (pose, frame) => {
    const key = 'saw@' + pose + frame; let c = F.baked.get(key); if (c) return c;
    const S = TUNING.sawbot.saw, R = S.len + 6, a = SAW_ANG[pose], ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    c = document.createElement('canvas'); c.width = c.height = R * 2 * UP;
    const g = c.getContext('2d'); g.setTransform(UP, 0, 0, UP, R * UP, R * UP);
    const line = (w, col, off, from = 0, to = S.len) => { g.fillStyle = col; for (let s = from; s <= to; s += 0.5) g.fillRect(Math.round(ux * s + nx * off - w / 2), Math.round(uy * s + ny * off - w / 2), w, w); };
    line(S.w + 2, '#0c0c0d', 0); line(S.w, '#8a8a92', 0); line(1, '#3a3e47', 0, 3, S.len - 2); line(1, '#c9c9cf', -(S.w / 2 - 0.5), 2, S.len - 1);
    // the teeth, one every three texels down each edge, stepped along by the chain's frame
    for (let s = 1 + frame; s <= S.len; s += 3) for (const sd of [-1, 1]) {
      const off = sd * (S.w / 2 + 1), px = Math.round(ux * s + nx * off), py = Math.round(uy * s + ny * off);
      g.fillStyle = '#0c0c0d'; g.fillRect(px - 1, py - 1, 2, 2); g.fillStyle = s % 2 ? '#d8d8de' : '#7d7e85'; g.fillRect(px - 1, py - 1, 1, 1);
    }
    // the motor at the grip
    g.fillStyle = '#0c0c0d'; g.fillRect(-4, -4, 8, 8); g.fillStyle = '#7d3b33'; g.fillRect(-3, -3, 6, 6); g.fillStyle = '#b85e43'; g.fillRect(-3, -3, 6, 1); g.fillStyle = '#271e1a'; g.fillRect(-1, -1, 2, 2);
    F.baked.set(key, c); return c;
  };
  // The saw robot: the front for every view but the three up the screen; a little hop on each step. Red-hot while
  // `e.heat` lasts; its chainsaw raised through the windup and down through the swing.
  // The saw is always in his RIGHT hand (14 Oct 2026 playtest: "sometimes in the left"): neither view is mirrored by
  // where he faces any more (the front facing east was, which put the saw in his left), the front carries it on the
  // screen's left, the back on the screen's right, its bar mirrored there.
  F.drawSawbot = (ctx, angle, moving, t, x, e) => {
    const d = facingOf(angle), back = d === 3 || d === 4 || d === 5;
    const step = moving ? [0, 1, 0, -1][Math.floor(t * 7 + (x || 0) * 0.05) % 4] : 0, dy = step ? -TX : 0;
    const name = back ? 'saw-back' : 'saw-front', it = FACTORY_ASSETS.items[name];
    // the leap is a chop (16 Oct 2026, his mark: "in the jump the saw blow more obvious"): raised over the head through the
    // crouch and the first half of the air, brought down for the landing and held down a beat after (`e.chopT`), bigger
    const st = e && e.state, air = st === 'hop' && e.leapAim ? e.leapAim.t / TUNING.sawbot.leap.air : -1, chop = e && e.chopT > 0;
    const pose = st === 'windup' || (air >= 0 && air < 0.55) ? 'wind' : st === 'swing' || air >= 0.55 || chop ? 'swing' : 'rest';
    const big = air >= 0 || chop ? TUNING.sawbot.leap.sawBig : 1;
    const frame = Math.floor(t * (pose === 'rest' ? TUNING.sawbot.saw.run * 0.3 : TUNING.sawbot.saw.run)) % 3;
    const bar = sawBar(pose, frame), R = TUNING.sawbot.saw.len + 6, hand = back ? SAW_HAND_BACK : SAW_HAND;
    const saw = () => {
      const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
      ctx.save(); ctx.translate((hand[0] - it[2] / 2) * TX, (hand[1] - it[3]) * TX + dy); if (back) ctx.scale(-1, 1); if (big !== 1) ctx.scale(big, big);
      ctx.drawImage(bar, -R * TX, -R * TX, R * 2 * TX, R * 2 * TX);
      ctx.restore(); ctx.imageSmoothingEnabled = smooth;
    };
    ctx.save();
    if (back) saw();
    stand(ctx, name, false, dy);
    const heat = e && e.heat > 0 ? Math.min(1, e.heat / TUNING.sawbot.heat.time * 1.6) * (0.75 + 0.25 * Math.sin(t * 9)) : 0;
    if (heat > 0) {
      const c = F.hot(name);
      if (c) { const a = ctx.globalAlpha, smooth = ctx.imageSmoothingEnabled; ctx.globalAlpha = a * heat; ctx.imageSmoothingEnabled = true; ctx.drawImage(c, -it[2] / 2 * TX, -it[3] * TX + dy, it[2] * TX, it[3] * TX); ctx.globalAlpha = a; ctx.imageSmoothingEnabled = smooth; }
    }
    if (!back) saw();
    ctx.restore();
  };
  // The welder on his tracks: the side view east, mirrored west; the torch pair up and down the screen. Firing or
  // aiming from the side he is the pose with the torch levelled (the flame itself is real fire on the floor, js/factory.js).
  F.drawWelder = (ctx, angle, moving, t, x, e) => {
    const d = facingOf(angle), hot = e && (e.state === 'wdfire' || e.state === 'wdaim');
    const rumble = moving ? Math.round(Math.sin(t * 40 + (x || 0)) * 0.5) * TX : 0;
    let name, flip = false;
    if (d === 0 || d === 1 || d === 7) name = 'torch-front';
    else if (d === 3 || d === 4 || d === 5) name = 'torch-back';
    else { name = hot ? 'welder-fire' : 'welder-idle'; flip = d === 2; }
    stand(ctx, name, flip, rumble);
    // the torch's own flame at the nozzle while he sprays: a few cells of fire, flickering
    if (e && e.state === 'wdfire') {
      const c = Math.cos(angle), s = Math.sin(angle), k = TX, n = 5, f = Math.floor(t * 18);
      const ox = c * 22 * k, oy = -26 * k + s * 14 * k;
      for (let i = 0; i < n; i++) {
        const j = (i + f) % n, len = (6 + ((j * 7) % 5)) * k, w = (2 + (j & 1)) * k;
        ctx.fillStyle = j % 3 === 0 ? PALETTE.fireHi : j % 3 === 1 ? PALETTE.fire : '#ffd36b';
        ctx.fillRect(Math.round(ox + c * (i * 4 * k)), Math.round(oy + s * (i * 4 * k) - w / 2), Math.max(len * c, w), Math.max(len * Math.abs(s), w));
      }
    }
  };

  // ---- THE AUTOMATON --------------------------------------------------------------------------------------------
  // The composite (back legs, the shadows of the feet, the body, the front legs) is baked into one canvas keyed on the
  // pose rounded to texels, so the boss outline's many redraws are a drawImage each; it is only repainted while something
  // of him moves. The frame it is drawn in is the unit's (feet at the origin, screen px): a world offset (dx, dy) lies at
  // (dx, dy × TILT) in it, which is what `Automaton.pose` hands over.
  const CW = 300, CH = 260, OX = CW / 2, OY = 170;   // texels; the feet's origin at (OX, OY); room for the legs splayed when down
  // The shadows under the feet and the fallen body are a canvas of their own: the boss outline (`Renderer.bossOutline`)
  // paints whatever the body draws as a flat silhouette, and a shadow baked into the body came out as a yellow pool.
  let comp = null, shade = null, compKey = '';
  // A thick bar of cells from (x0, y0) to (x1, y1), `w` texels wide: the outline, the body, a lit edge, in three passes.
  const bar = (g, x0, y0, x1, y1, w, body, lit, dark) => {
    const L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux;
    const pass = (ww, col, off) => { g.fillStyle = col; for (let s = 0; s <= L; s += 1) { const cx = x0 + ux * s + nx * off, cy = y0 + uy * s + ny * off; g.fillRect(Math.round(cx - ww / 2), Math.round(cy - ww / 2), ww, ww); } };
    pass(w + 2, P.ol, 0); pass(w, body, 0);
    if (lit) pass(Math.max(1, Math.round(w * 0.3)), lit, -(w / 2 - 1));
    if (dark) pass(Math.max(1, Math.round(w * 0.25)), dark, (w / 2 - 1));
  };
  const box = (g, x, y, w, h, col, ol = P.ol) => { g.fillStyle = ol; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, w + 2, h + 2); g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const disc = (g, x, y, r, col) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.5) { g.fillStyle = col; g.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1); } };
  // One leg in texels: the hip, the knee and the foot already placed (`Automaton.pose` does the knees), `out` while knocked.
  const leg = (g, L, out, hurt) => {
    const [hx, hy] = L.hip, [kx, ky] = L.knee, [fx, fy] = L.foot;
    // knocked out the leg goes dark iron with a rust-red edge, so which of the four is out reads at a glance (its playtest)
    const body = out ? P.i0 : P.i1, lit = out ? P.r2 : P.i2;
    // the thigh: an iron bar with a slot down its middle and a lit edge
    bar(g, hx, hy, kx, ky, 7, body, lit, P.i0);
    { const mx = (hx + kx) / 2, my = (hy + ky) / 2, ux = (kx - hx), uy = (ky - hy), l = Math.hypot(ux, uy) || 1; bar(g, mx - ux / l * 6, my - uy / l * 6, mx + ux / l * 6, my + uy / l * 6, 2, P.ol); }
    // the shin: a thinner bar with the bone-white piston rod along it
    bar(g, kx, ky, fx, fy, 6, body, lit, P.i0);
    // the bone-white piston goes red on a leg that has taken a blow or is out (13 Oct 2026 playtest: "the leg itself,
    // white to red, not an outline": the rod is the part of him that says it)
    { const ux = (fx - kx), uy = (fy - ky), l = Math.hypot(ux, uy) || 1, nx = -uy / l, ny = ux / l; bar(g, kx + ux * 0.2 + nx * 2, ky + uy * 0.2 + ny * 2, kx + ux * 0.8 + nx * 2, ky + uy * 0.8 + ny * 2, 2, hurt ? P.h0 : P.b1, hurt ? P.h1 : P.b2); }
    // the knee: a rust block with a bone pivot, the hip the same a size down
    box(g, kx - 5, ky - 4, 10, 9, P.r1); g.fillStyle = P.r2; g.fillRect(Math.round(kx - 5), Math.round(ky - 4), 10, 2); disc(g, kx, ky, 2, P.b1); g.fillStyle = P.b2; g.fillRect(Math.round(kx) - 1, Math.round(ky) - 1, 1, 1);
    box(g, hx - 4, hy - 3, 8, 7, P.r1); disc(g, hx, hy, 1, P.b0);
    // the foot pad: a trapezoid of iron with a rust toe, unless it hangs in the air knocked out
    if (!out) { box(g, fx - 8, fy - 4, 16, 5, P.i1); g.fillStyle = P.i2; g.fillRect(Math.round(fx - 8), Math.round(fy - 4), 16, 1); g.fillStyle = P.r0; g.fillRect(Math.round(fx - 6), Math.round(fy + 1), 12, 1); box(g, fx - 5, fy - 7, 10, 3, P.i0); }
    else { box(g, fx - 6, fy - 3, 12, 5, P.i0); g.fillStyle = P.r0; g.fillRect(Math.round(fx - 5), Math.round(fy - 3), 10, 1); }
  };
  const shadowAt = (g, x, y, rx, ry) => { g.fillStyle = 'rgba(0,0,0,0.3)'; for (let j = -ry; j <= ry; j++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (j / ry) * (j / ry)))); if (w > 0) g.fillRect(Math.round(x) - w, Math.round(y) + j, w * 2, 1); } };
  // The body's silhouette in one flat pale gold, baked once: the rim of the open body (`bakeAutomaton`).
  F.rim = (body) => {
    let c = F.baked.get('automaton-rim'); if (c) return c;
    c = document.createElement('canvas'); c.width = body.width; c.height = body.height;
    const g = c.getContext('2d'); g.drawImage(body, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffe9a8'; g.fillRect(0, 0, c.width, c.height);
    F.baked.set('automaton-rim', c); return c;
  };
  // The whole figure, from `Automaton.pose(e)`: every point in texels of the unit frame (feet origin), `bodyY` the body's
  // bottom row, each leg { hip, knee, foot, out, back, planted, hurt }. The key tells a pose from the last one baked.
  F.bakeAutomaton = (pose) => {
    if (!comp) { comp = document.createElement('canvas'); comp.width = CW * UP; comp.height = CH * UP; shade = document.createElement('canvas'); shade.width = CW * UP; shade.height = CH * UP; }
    const s = shade.getContext('2d');
    s.setTransform(UP, 0, 0, UP, 0, 0); s.clearRect(0, 0, CW, CH); s.translate(OX, OY);
    for (const L of pose.legs) if (L.planted) shadowAt(s, L.foot[0], L.foot[1] + 2, 10, 4);
    if (pose.bodyShadow) shadowAt(s, 0, pose.bodyShadow[1], pose.bodyShadow[0], pose.bodyShadow[0] * 0.42);
    const g = comp.getContext('2d');
    g.setTransform(UP, 0, 0, UP, 0, 0); g.imageSmoothingEnabled = false; g.clearRect(0, 0, CW, CH);
    g.translate(OX, OY);
    // down the four legs fold out behind the frame, so its sides lie open (`pose.low`); the wreck has none (`pose.bare`)
    if (!pose.bare) for (const L of pose.legs) if (L.back || pose.low) leg(g, L, L.out, L.hurt);
    const body = F.canvas('automaton-body');
    // Open to the horns (14 Oct 2026 playtest: "when he falls, his exposed edges should read"): the frame wears a rim of
    // pale gold two texels out, brightening on the beat (`pose.open`), laid behind the body so only its edge shows.
    if (body && pose.open > 0) {
      const rim = F.rim(body); g.globalAlpha = pose.open;
      for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]]) g.drawImage(rim, -F.W / 2 + ox, pose.bodyY - F.H + oy, F.W, F.H);
      g.globalAlpha = 1;
    }
    if (body) { g.imageSmoothingEnabled = false; g.drawImage(body, -F.W / 2, pose.bodyY - F.H, F.W, F.H); }
    // the meat breathes: a darker and a lighter row across each side opening, on the clock
    // down, the meat swells and throbs bright in both openings: the body is open (its playtest: down read like standing)
    // (15 Oct 2026 playtest: "not so red": the flat red panels over each opening went; only the meat's own glint breathes)
    if (pose.breath > 0 && !pose.bare) {
      g.fillStyle = `rgba(255,214,190,${0.35 * pose.breath})`; g.fillRect(-F.W / 2 + 18, pose.bodyY - 27, 10, 2); g.fillRect(F.W / 2 - 30, pose.bodyY - 29, 10, 2);
      g.fillStyle = `rgba(255,150,130,${0.25 * pose.breath})`; g.fillRect(-F.W / 2 + 16, pose.bodyY - 22, 6, 2); g.fillRect(F.W / 2 - 26, pose.bodyY - 24, 6, 2); }
    if (!pose.bare && !pose.low) for (const L of pose.legs) if (!L.back) leg(g, L, L.out, L.hurt);
    // and four chevrons of cells pointing in at the frame from its sides, closing in on the beat: strike here
    if (pose.open > 0) {
      const O = TUNING.automaton.look.open, gap = O.gap * 2 + (1 - pose.open) * O.bob * 4, cy = pose.bodyY - F.H / 2, c = 2;
      const chev = (tx, ty, ux, uy, col) => { g.fillStyle = col; for (let s = 0; s <= O.arm; s++) for (const sd of [-1, 1]) g.fillRect(Math.round(tx - ux * s * c - uy * sd * s * c) - c / 2, Math.round(ty - uy * s * c + ux * sd * s * c) - c / 2, c, c); };
      for (const [tx, ty, ux, uy] of [[-F.W / 2 - gap, cy, 1, 0], [F.W / 2 + gap, cy, -1, 0], [0, pose.bodyY - F.H - gap, 0, 1], [0, pose.bodyY + gap, 0, -1]]) {
        chev(tx + 1, ty + 1, ux, uy, P.ol); chev(tx, ty, ux, uy, pose.open > 0.8 ? '#fff8e2' : '#ffd66b');
      }
    }
    // sparks off a hip whose leg was just knocked
    for (const L of pose.legs) if (L.spark > 0) { const n = 6; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + L.spark * 9, r = 6 + (1 - L.spark) * 12; g.fillStyle = i & 1 ? PALETTE.fireHi : '#ffd36b'; g.fillRect(Math.round(L.hip[0] + Math.cos(a) * r), Math.round(L.hip[1] + Math.sin(a) * r * 0.7), 2, 2); } }
    return comp;
  };
  F.drawAutomaton = (ctx, angle, moving, t, x, e) => {
    if (!F.ready || typeof Automaton === 'undefined') return;
    const pose = Automaton.pose(e, t);
    if (pose.key !== compKey || !comp) { F.bakeAutomaton(pose); compKey = pose.key; }
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    // not under the outline's passes (they draw with a huge shadow offset)
    if (!(Math.abs(ctx.shadowOffsetX || 0) > 1000)) ctx.drawImage(shade, -OX * TX, -OY * TX, CW * TX, CH * TX);
    ctx.drawImage(comp, -OX * TX, -OY * TX, CW * TX, CH * TX);
    ctx.imageSmoothingEnabled = smooth;
  };
  // What is left of him (`Automaton.wreck`, 13 Oct 2026 playtest: "show his body after he dies"): the down pose baked
  // once into a canvas of its own, darkened, with its shadows; `drawWreck` lays it on the floor (js/machines.js).
  F.makeWreck = (e) => {
    if (!F.ready || typeof Automaton === 'undefined') return null;
    F.bakeAutomaton(Automaton.pose(e, 0)); compKey = '';
    const img = document.createElement('canvas'), sh = document.createElement('canvas'); img.width = sh.width = CW * UP; img.height = sh.height = CH * UP;
    const g = img.getContext('2d'); g.drawImage(comp, 0, 0); g.globalCompositeOperation = 'source-atop';
    g.fillStyle = `rgba(22,12,14,${TUNING.automaton.wreck.dark})`; g.fillRect(0, 0, img.width, img.height);
    // split down the middle: a jagged dark seam across the frame where it broke open
    g.globalCompositeOperation = 'source-atop'; g.setTransform(UP, 0, 0, UP, 0, 0); g.translate(OX, OY);
    { const bY = Automaton.pose(e, 0).bodyY; let x = -4; g.fillStyle = '#0d0809';
      for (let y = bY - F.H; y < bY; y += 2) { x += ((y * 7) % 5) - 2; x = clamp(x, -9, 5); g.fillRect(x, y, 3, 2); } }
    sh.getContext('2d').drawImage(shade, 0, 0);
    return { x: e.x, y: e.y, img, shade: sh };
  };
  F.drawWreck = (ctx, w) => {
    if (w.kind === 'arm') { F.drawArmWreck(ctx, w); return; }   // THE ARM's (js/factory.js `Arm.wreck`)
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.save(); ctx.translate(w.x, w.y); ctx.scale(1, 1 / TILT);
    ctx.drawImage(w.shade, -OX * TX, -OY * TX, CW * TX, CH * TX); ctx.drawImage(w.img, -OX * TX, -OY * TX, CW * TX, CH * TX);
    ctx.restore(); ctx.imageSmoothingEnabled = smooth;
  };
  // ---- THE FACTORY's walls and floors, several to choose from (14 Oct 2026, his ask: "four more kinds of wall and
  // floor, so there is something to choose from"; 16 Oct 2026, his marks on the factory doc: CHECKER, and the BRICK,
  // PIPES and GIRDER walls, deleted; PLATES "strange crossings", GRATE "looks like the fire grate", FURNACE "the side and
  // the top differ, strange": all three painted again) -------------------------------------------------------------------
  // A floor is one of `FLOORS`: the pack's pictures (144 texels, a 6 x 6 patch of tiles) or one painted here in texels
  // (`paint`, the same 144 square, seamless). A wall is one of `WALLS`: the pack's IRON elevation (72 x 32, cut into a cap
  // band and a face, `band` / `face` rows) or one painted here (`cap` 64 x 64 texels at 3 px, `face` 480 x 18 texels at
  // 2 px, both wrapping). Which is worn: a level's own `flook` / `wlook` (THE FACTORY's test rooms wear one combination
  // each), else the ART tab's `ART_PASS.ffloor` / `fwall`. Every bake keys on the look.
  F.FLOORS = [
    { name: 'PLATES', paint: 'plates' }, { name: 'CONCRETE', item: 'floor-concrete' }, { name: 'GRATE', paint: 'grate' },
    { name: 'BRICK', item: 'floor-brick' }, { name: 'RUST', paint: 'rust' },
  ];
  F.WALLS = [
    { name: 'IRON', item: 'wall-iron', x0: 1, w: 70, band: [1, 10], face: [11, 31] },
    { name: 'FURNACE', paint: 'furnace' }, { name: 'CORRUGATED', paint: 'corrugated' },
  ];
  F.floorLook = (def) => (def && def.flook && F.FLOORS.find((f) => f.name === def.flook)) || F.FLOORS[((typeof ART_PASS !== 'undefined' && ART_PASS.ffloor) || 0) % F.FLOORS.length];
  F.wallLook = (def) => (def && def.wlook && F.WALLS.find((w) => w.name === def.wlook)) || F.WALLS[((typeof ART_PASS !== 'undefined' && ART_PASS.fwall) || 0) % F.WALLS.length];
  // A small painter in texels: a canvas `w` x `h` cells of `cell` px, every call wrapping round both edges, so a sheet is
  // seamless by construction. Colours are hex strings; `mixc` blends two.
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.substr(i, 2), 16));
  const mixc = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const painter = (w, h, cell) => {
    const c = document.createElement('canvas'); c.width = w * cell; c.height = h * cell;
    const g = c.getContext('2d'), p = {
      canvas: c, w, h,
      set(x, y, col) { x = ((Math.round(x) % w) + w) % w; y = ((Math.round(y) % h) + h) % h; g.fillStyle = col; g.fillRect(x * cell, y * cell, cell, cell); },
      rect(x, y, rw, rh, col) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) p.set(x + i, y + j, col); },
      hl(x, y, n, col) { p.rect(x, y, n, 1, col); }, vl(x, y, n, col) { p.rect(x, y, 1, n, col); },
      blot(x, y, r, col, rnd) { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r * (0.55 + rnd() * 0.6)) p.set(x + i, y + j, col); },
    };
    return p;
  };
  const seeded = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // a rivet: a round head lit top-left, in a dark ring
  const rivet = (p, x, y, body, lit, dark) => { p.set(x, y, body); p.set(x + 1, y, body); p.set(x, y + 1, body); p.set(x + 1, y + 1, dark); p.set(x, y, lit); };
  // Rust eating in from a point: a blot of two browns with a few flakes, dithered at its edge.
  const rust = (p, x, y, r, rnd) => { p.blot(x, y, r, '#5a3a2c', rnd); p.blot(x, y, Math.max(1, r - 1), '#78462f', rnd); for (let k = 0; k < r * 2; k++) p.set(x + Math.round((rnd() - 0.5) * r * 2.4), y + Math.round((rnd() - 0.5) * r * 2.4), rnd() < 0.5 ? '#8c5a38' : '#4a3025'); };
  // THE FLOORS painted in texels (144 square, a tile 24 texels).
  // PLATES: steel deck plates two tiles square, laid on the tile grid so every seam meets the next at a corner (the pack's
  //   picture was cut off its plates and crossed itself at the sheet's edge, his "strange crossings"), a rivet at each
  //   corner and halfway along, the plates a step apart in tone, a scuff or two.
  // GRATE: a walkway of fine expanded mesh, small diamonds of dark through grey strands, on a frame a tile and a half
  //   apart: nothing like a burner's bars (his: "it looks like the fire grate").
  // RUST: sheet iron gone over, panels of different browns butted together with their rivets, scale and a dark oil pool.
  F.paintFloor = (look) => {
    const p = painter(144, 144, 1), r = seeded(look === 'plates' ? 5 : look === 'grate' ? 7 : 23);
    if (look === 'plates') {
      const tones = ['#4a4c50', '#46484c', '#4e5054', '#484a4f'];
      for (let y = 0; y < 144; y += 48) for (let x = 0; x < 144; x += 48) {
        const t = tones[Math.floor(r() * tones.length)]; p.rect(x, y, 48, 48, t);
        for (let k = 0; k < 40; k++) p.set(x + 2 + Math.floor(r() * 44), y + 2 + Math.floor(r() * 44), mixc(t, r() < 0.5 ? '#2c2e32' : '#6a6c70', 0.25));
        p.hl(x, y, 48, '#26282c'); p.vl(x, y, 48, '#26282c');                                                    // the seam
        p.hl(x + 1, y + 1, 47, mixc(t, '#7a7c82', 0.35)); p.vl(x + 1, y + 1, 47, mixc(t, '#7a7c82', 0.25));      // the lit edge
        for (const [a, b] of [[3, 3], [43, 3], [3, 43], [43, 43], [23, 3], [3, 23], [43, 23], [23, 43]]) rivet(p, x + a, y + b, '#5c5e64', '#7e8088', '#24262a');
      }
      for (let k = 0; k < 3; k++) { const x = Math.floor(r() * 144), y = Math.floor(r() * 144); p.blot(x, y, 3 + Math.floor(r() * 2), '#3c3e42', r); }
    } else if (look === 'grate') {
      p.rect(0, 0, 144, 144, '#24262a');
      // the mesh: a diamond every 4 texels across and 6 down, staggered, its strands a grey with a lit upper edge
      for (let y = 0; y < 144; y += 6) for (let x = (y / 6) % 2 ? 2 : 0; x < 144; x += 4) {
        p.set(x, y, '#4a4e54'); p.set(x + 1, y + 1, '#4a4e54'); p.set(x + 1, y + 2, '#3e4248'); p.set(x, y + 3, '#3e4248');
        p.set(x - 1, y + 1, '#565a60'); p.set(x - 1, y + 2, '#3e4248');
        p.set(x, y + 1, '#141518'); p.set(x, y + 2, '#18191c');                                                   // the hole
      }
      // the frame bars the mesh is welded to, a tile and a half apart (36 texels), flat and plain
      for (let s = 0; s < 144; s += 36) { p.rect(s, 0, 2, 144, '#3a3d42'); p.vl(s, 0, 144, '#55595f'); p.rect(0, s, 144, 2, '#3a3d42'); p.hl(0, s, 144, '#55595f'); }
      for (let y = 0; y < 144; y += 36) for (let x = 0; x < 144; x += 36) rivet(p, x + 3, y + 3, '#5a5e64', '#7a7e86', '#1e2024');
    } else {
      const tones = ['#6b4a36', '#5e4232', '#73513a', '#664838', '#584030', '#7a573d'];
      for (let y = 0; y < 144; y += 36) for (let x = 0; x < 144; x += 36) {
        const t = tones[Math.floor(r() * tones.length)]; p.rect(x, y, 36, 36, t);
        for (let k = 0; k < 90; k++) p.set(x + Math.floor(r() * 36), y + Math.floor(r() * 36), r() < 0.5 ? mixc(t, '#2a1c14', 0.35) : mixc(t, '#b07a4a', 0.3));
        p.hl(x, y, 36, '#2a1e18'); p.vl(x, y, 36, '#2a1e18'); p.hl(x, y + 1, 36, mixc(t, '#c89a66', 0.3)); p.vl(x + 1, y + 1, 35, mixc(t, '#c89a66', 0.2));
        for (let k = 4; k < 36; k += 9) { rivet(p, x + k, y + 3, '#55555f', '#84848e', '#1f1f25'); rivet(p, x + k, y + 31, '#55555f', '#84848e', '#1f1f25'); rivet(p, x + 3, y + k, '#55555f', '#84848e', '#1f1f25'); rivet(p, x + 31, y + k, '#55555f', '#84848e', '#1f1f25'); }
      }
      for (let k = 0; k < 5; k++) { const x = Math.floor(r() * 144), y = Math.floor(r() * 144); p.blot(x, y, 3 + Math.floor(r() * 4), '#4a4650', r); p.blot(x, y, 2, '#5a5662', r); }
      for (let k = 0; k < 4; k++) { const x = Math.floor(r() * 144), y = Math.floor(r() * 144); p.blot(x, y, 4 + Math.floor(r() * 3), '#1e1a1c', r); p.blot(x - 1, y - 1, 2, '#2a262a', r); }
    }
    return p.canvas;
  };
  // THE WALLS painted in texels. The cap (64 square, 3 px a texel) and the face (480 x 18, 2 px) of each. A wall must
  // never read as the floor (14 Oct 2026, his: "it must differ"; the first PLATE wall was riveted sheets over riveted
  // floors): every painted cap is a step darker than any floor, and every face is another material than any floor.
  // FURNACE: dark sooted iron plates, riveted, top and face alike (16 Oct 2026: the face was fire brick under an iron top,
  // his "the side and the top differ, strange"), the face's foot a slit of grate with embers glowing behind it.
  // CORRUGATED: a bolted rail over dark ribbed sheet rusting at its foot.
  const FURN = { base: '#2a2630', dark: '#15131a', lo: '#1a181e', hi: '#38343f', edge: '#5a5462', rv: ['#4e4a56', '#6c6874'] };
  F.paintCap = (look) => {
    const p = painter(64, 64, 3), r = seeded(look.length * 31);
    if (look === 'corrugated') {
      p.rect(0, 0, 64, 64, '#2b2a32');
      for (let y = 0; y < 64; y += 16) { p.hl(0, y, 64, '#17161c'); p.hl(0, y + 1, 64, '#4e4c58'); p.hl(0, y + 2, 64, '#3a3842'); for (let x = 2; x < 64; x += 8) rivet(p, x, y + 1, '#6a6874', '#8e8c98', '#17161c'); }
      for (let k = 0; k < 5; k++) rust(p, Math.floor(r() * 64), Math.floor(r() * 64), 1 + Math.floor(r() * 2), r);
    } else {
      // FURNACE: a coping of dark iron plates, sooted, a fleck of ember here and there
      p.rect(0, 0, 64, 64, FURN.base);
      for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 32) {
        const t = mixc(FURN.base, r() < 0.5 ? FURN.lo : FURN.hi, r() * 0.3); p.rect(x + 1, y + 1, 31, 15, t);
        p.hl(x, y, 32, FURN.dark); p.vl(x, y, 16, FURN.dark); p.hl(x + 1, y + 1, 31, mixc(t, FURN.edge, 0.3));
        rivet(p, x + 3, y + 3, FURN.rv[0], FURN.rv[1], FURN.dark); rivet(p, x + 27, y + 3, FURN.rv[0], FURN.rv[1], FURN.dark);
        for (let k = 0; k < 10; k++) p.set(x + 2 + Math.floor(r() * 29), y + 2 + Math.floor(r() * 13), '#1a1719');
        if (r() < 0.5) p.set(x + 4 + Math.floor(r() * 24), y + 4 + Math.floor(r() * 10), '#6a2a18');
      }
    }
    return p.canvas;
  };
  F.paintFace = (look) => {
    const W = 480, H = 18, p = painter(W, H, 2), r = seeded(look.length * 17 + 5);
    if (look === 'furnace') {
      // the same plates as its top, a row of them down the face, darker toward the foot with soot, and the ember slit
      p.rect(0, 0, W, H, FURN.base); p.hl(0, 0, W, mixc(FURN.base, FURN.edge, 0.5)); p.hl(0, 1, W, FURN.dark);
      for (let x = 0; x < W; x += 32) {
        const t = mixc(FURN.base, r() < 0.5 ? FURN.lo : FURN.hi, r() * 0.3); p.rect(x + 1, 2, 31, 11, t);
        p.vl(x, 2, 11, FURN.dark); p.hl(x + 1, 2, 31, mixc(t, FURN.edge, 0.3));
        rivet(p, x + 3, 4, FURN.rv[0], FURN.rv[1], FURN.dark); rivet(p, x + 27, 4, FURN.rv[0], FURN.rv[1], FURN.dark);
        for (let k = 0; k < 12; k++) p.set(x + 2 + Math.floor(r() * 29), 6 + Math.floor(r() * 7), '#1a1719');   // soot low on the plate
      }
      p.hl(0, 13, W, FURN.dark);
      for (let x = 0; x < W; x++) { const g = (x * 7) % 5; p.set(x, 14, g === 0 ? '#b8321c' : g === 2 ? '#8a2414' : '#5a1a10'); p.set(x, 15, g === 1 ? '#8a2414' : '#401410'); if (x % 3 === 0) { p.set(x, 14, FURN.dark); p.set(x, 15, FURN.dark); } }
      p.rect(0, 16, W, 2, FURN.dark);
    } else {
      for (let x = 0; x < W; x++) p.vl(x, 0, H, ['#4a3f33', '#3a3128', '#221c17', '#3a3128'][x % 4]);
      p.hl(0, 2, W, '#17161c'); p.hl(0, 3, W, '#6a6874'); p.hl(0, 4, W, '#4a4854'); for (let x = 4; x < W; x += 16) rivet(p, x, 3, '#8a8894', '#b4b2be', '#17161c');
      for (let x = 0; x < W; x++) { const d = 12 + Math.floor(r() * 5); for (let y = d; y < H; y++) if (r() < 0.7) p.set(x, y, y > 15 ? '#2a1c14' : (x % 4 === 0 ? '#8a5a38' : x % 4 === 2 ? '#4a3025' : '#6a4530')); }
    }
    return p.canvas;
  };
  // The wall's cap sheet, three tiles square at 64 a tile (`PIXEL_ROOMS.wall.sheet`): a packed elevation's riveted band
  // laid over and over, every other row half a sheet across so it joins on every edge; a painted look's own sheet.
  F.wallCap = (def) => {
    const L = F.wallLook(def), key = 'wall-cap@' + L.name; let c = F.baked.get(key); if (c) return c;
    if (L.paint) { c = F.paintCap(L.paint); F.baked.set(key, c); return c; }
    const it = FACTORY_ASSETS.items[L.item]; if (!it || !F.ready) return null;
    c = document.createElement('canvas'); c.width = c.height = 192;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const bh = L.band[1] - L.band[0], rh = bh * 192 / L.w;
    for (let r = 0; r * rh < 192; r++) for (const o of [-192, 0, 192]) g.drawImage(F.image, it[0] + L.x0, it[1] + L.band[0], L.w, bh, o + (r & 1 ? 96 : 0), Math.round(r * rh), 192, Math.ceil(rh));
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, 192, 192);   // a step under the face's band, so the top reads as top
    F.unyellow(c);
    F.baked.set(key, c); return c;
  };
  // The face: a strip fifteen tiles long, `F64` px deep per 64-px tile, a packed elevation's lower rows laid end to end
  // or a painted look's strip.
  F.wallFace = (F64, def) => {
    const L = F.wallLook(def), key = 'wall-face' + F64 + '@' + L.name; let c = F.baked.get(key); if (c) return c;
    const len = 64 * 15;
    c = document.createElement('canvas'); c.width = len; c.height = F64;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    if (L.paint) { const src = F.paintFace(L.paint); g.drawImage(src, 0, 0, src.width, src.height, 0, 0, len, F64); F.baked.set(key, c); return c; }
    const it = FACTORY_ASSETS.items[L.item]; if (!it || !F.ready) return null;
    const fh = L.face[1] - L.face[0] + 1, per = L.w * F64 / fh;
    for (let x = 0; x < len; x += per) g.drawImage(F.image, it[0] + L.x0, it[1] + L.face[0], L.w, fh, Math.round(x), 0, Math.ceil(per), F64);
    F.unyellow(c);
    F.baked.set(key, c); return c;
  };
  // A steel post where a stone pillar would stand (13 Oct 2026 playtest: "not columns"; it was a boiler or a cabinet until
  // his marks of 16 Oct 2026 took both), js/factory-props.js `fac-post`, its feet at (x, y), mirrored off the tile's hash.
  F.pillar = (ctx, x, y, h) => {
    if (typeof FACTORY_PROPS === 'undefined') return false;
    const name = 'fac-post', g = PROP_PIXELS.sprites[name]; if (!g) return false;
    const k = FACTORY_PROPS.TX;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 1 / TILT); if (h & 4) ctx.scale(-1, 1);
    PROP_PIXELS.draw(ctx, name, -g.w * k / 2, -g.h * k, k);
    ctx.restore(); return true;
  };
  // THE BOMB MACHINE (js/machines.js), a small production line (16 Oct 2026, his mark: "redo it, as if it were a real
  // factory"; it was the pack's cabinet with a button): a hopper of black powder on its legs at the left, a short belt
  // under it carrying the casing into a stamping press, the press's ram coming down on it while it works, and a chute at the
  // front the finished bomb drops out of. The button on the press's post: red and breathing when it will take a press,
  // amber blinking while it makes one, dark while its bomb is out; a lamp on the beam goes amber with it. In cells.
  F.drawDispenser = (ctx, p, t) => {
    const c = 3, busy = p.makeT > 0, D = typeof TUNING !== 'undefined' ? TUNING.dispenser : { wind: 3 };
    const prog = busy ? 1 - p.makeT / D.wind : 0, sh = busy ? Math.round(Math.sin(t * 60)) : 0;
    const cell = (i, j, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(i * c, j * c, w * c, h * c); };
    const last = p.lastBomb, out = last && !last.broken && !(last.fuseT >= 0);
    const btn = busy ? (Math.floor(t * 8) % 2 ? '#ffd36b' : '#f2aa30') : p.buzz > 0 ? '#6c696d' : out ? '#492723' : `rgb(${200 + Math.round(55 * Math.sin(t * 5))},50,40)`;
    const O = '#17151b', I1 = '#34333b', I2 = '#51505a', I3 = '#76757f', I4 = '#9a99a2';
    ctx.save(); ctx.translate(p.x + sh, p.y + 4); ctx.scale(1, 1 / TILT);
    if (!(Math.abs(ctx.shadowOffsetX || 0) > 1000)) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-13 * c, -c, 26 * c, 3 * c); }
    // the base plate it is bolted to
    cell(-13, -2, 26, 2, O); cell(-12, -2, 24, 1, I2); cell(-12, -1, 24, 1, I1);
    // the hopper on its legs, black powder heaped in its mouth
    cell(-12, -9, 1, 7, O); cell(-7, -9, 1, 7, O);
    cell(-13, -16, 8, 7, O); cell(-12, -15, 6, 5, I2); cell(-12, -15, 1, 5, I3); cell(-11, -10, 4, 1, O); cell(-10, -9, 2, 2, O);
    cell(-12, -16, 6, 1, '#2a2628'); cell(-11, -17, 4, 1, '#3a3436'); if (busy) cell(-10 + (Math.floor(t * 10) % 2), -17, 1, 1, '#5a5052');
    // what it makes, painted on the hopper's side: a black bomb with its fuse lit, on a red band
    cell(-12, -14, 6, 3, '#7a1e18'); cell(-11, -14, 2, 2, '#0e0c10'); cell(-11, -14, 1, 1, '#4a4652'); cell(-9, -15, 1, 1, '#d9a52c');
    // the belt from under the hopper to the press, its chevrons running while it works
    cell(-9, -6, 14, 3, O); cell(-8, -5, 12, 1, I1);
    for (let i = 0; i < 12; i += 3) cell(-8 + ((i + (busy ? Math.floor(t * 12) : 0)) % 12), -5, 1, 1, I3);
    // the casing riding to the press, a dark ball growing as it is made
    if (busy) { const r = Math.max(1, Math.round(prog * 3)), bx = Math.round(-6 + prog * 8); cell(bx - r / 2, -6 - r, r, r, '#232026'); cell(bx - r / 2, -6 - r, 1, 1, '#4a4652'); }
    // the press: two posts and a beam, the ram over the belt coming down on a beat while it works
    cell(0, -20, 2, 18, O); cell(7, -20, 2, 18, O); cell(0, -21, 9, 3, O);
    cell(0.5, -20, 1, 17, I3); cell(7.5, -20, 1, 17, I2); cell(1, -20, 7, 1, I4); cell(1, -19, 7, 1, I2);
    const ramY = busy ? Math.round(-17 + Math.max(0, Math.sin(t * 9)) * 6) : -17;
    cell(3, -18, 3, ramY + 18, I1); cell(2, ramY, 5, 3, O); cell(2.5, ramY + 0.5, 4, 2, I2); cell(2.5, ramY + 0.5, 4, 1, I3);
    // its lamp on the beam and the button on its near post
    cell(3.5, -22, 2, 1, busy ? (Math.floor(t * 6) % 2 ? '#f2aa30' : '#7a5418') : '#34333b');
    cell(-0.5, -13, 3, 3, O); cell(0, -12.5, 2, 2, btn); cell(0, -12.5, 1, 0.5, 'rgba(255,240,220,0.5)');
    // the chute at the front, down to the floor where the bomb comes out
    cell(9, -8, 4, 2, O); cell(10, -6, 3, 4, O); cell(9.5, -7.5, 3, 1, I2); cell(10.5, -5.5, 2, 3, I1);
    // a bomb just made sits in the chute's mouth until it rolls out
    if (busy && prog > 0.8) { cell(10.5, -4.5, 2, 2, '#0e0c10'); cell(10.5, -4.5, 1, 1, '#4a4652'); }
    ctx.restore();
  };
  // ---- THE ARM (14 Oct 2026, js/factory.js `Arm`; his reference an industrial robot arm, "the mechanised arm looks
  // good") ---------------------------------------------------------------------------------------------------------
  // The base is a sprite (`arm-base`, js/factory-props.js); the arm itself is cells laid live off `e.armAng` (where the
  // claw points), `e.armExt` (how far out it reaches, of `TUNING.arm.reach`) and `e.armZ` (how high it is hoisted): the
  // upper arm from the turret's shoulder to an elbow raised `look.bend` screen px, the forearm down to the claw. Drawn
  // in the unit's frame (feet at the origin, screen px): a world offset (dx, dy) lies at (dx, dy × TILT).
  const ARM_Y = ['#5a4210', '#9c741c', '#d9a52c', '#f5d262'], ARM_DEAD = ['#2a1e14', '#4a3a24', '#6a5230', '#7a6238'];
  // a thick bar of cells from (x0, y0) to (x1, y1), `w` px wide in cells of `c`: the outline, the body, a lit edge, a dark one
  const armBar = (ctx, x0, y0, x1, y1, w, c, pal) => {
    const L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux, snap = (v) => Math.round(v / c) * c;
    const pass = (ww, col, off) => { ctx.fillStyle = col; for (let t = 0; t <= L; t += c * 0.7) { const cx = x0 + ux * t + nx * off, cy = y0 + uy * t + ny * off; ctx.fillRect(snap(cx - ww / 2), snap(cy - ww / 2), ww, ww); } };
    pass(w + c * 2, '#17151b', 0); pass(w, pal[1], 0); pass(Math.max(c, snap(w * 0.3)), pal[2], -(w / 2 - c)); pass(Math.max(c, snap(w * 0.22)), pal[0], w / 2 - c);
  };
  const armJoint = (ctx, x, y, r, c) => {
    ctx.fillStyle = '#17151b'; ctx.fillRect(Math.round(x - r - c), Math.round(y - r - c), (r + c) * 2, (r + c) * 2);
    ctx.fillStyle = '#34333b'; ctx.fillRect(Math.round(x - r), Math.round(y - r), r * 2, r * 2);
    ctx.fillStyle = '#76757f'; ctx.fillRect(Math.round(x - r), Math.round(y - r), r * 2, c);
    ctx.fillStyle = '#a4a3ab'; ctx.fillRect(Math.round(x - c / 2), Math.round(y - c / 2), c, c);
  };
  F.drawArm = (ctx, angle, moving, t, x, e) => {
    if (typeof FACTORY_PROPS === 'undefined' || typeof TUNING === 'undefined' || !TUNING.arm) return;
    const A = TUNING.arm, L = A.look, k = FACTORY_PROPS.TX, c = k;
    const live = e && e.armAng !== undefined, ang = live ? e.armAng : -Math.PI / 2 + 0.7, ext = live ? e.armExt : 0.5, z = live ? e.armZ : 0.1;
    const base = PROP_PIXELS.sprites['arm-base']; if (!base) return;
    const R = A.reach * TILE * ext, gx = Math.cos(ang) * R, gy = Math.sin(ang) * R * TILT - z * L.lift;
    const sy = -(base.h - 2) * k, ex = gx / 2, ey = (sy + gy) / 2 - L.bend * (1 - ext * 0.5);
    const hot = live && (e.state === 'alift' || e.state === 'aslam'), holding = live && !!e.carry;
    // the base, the claw's shadow on the floor, the two segments, the joints, the claw
    PROP_PIXELS.draw(ctx, 'arm-base', -base.w * k / 2, -base.h * k, k);
    const fx = Math.cos(ang) * R, fy = Math.sin(ang) * R * TILT;
    if (!(Math.abs(ctx.shadowOffsetX || 0) > 1000)) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(Math.round(fx - 7), Math.round(fy - 2), 14, 4); }
    const w = L.w * k;
    armBar(ctx, 0, sy, ex, ey, w, c, ARM_Y); armBar(ctx, ex, ey, gx, gy, w * 0.8, c, ARM_Y);
    armJoint(ctx, 0, sy, 4 * k, c); armJoint(ctx, ex, ey, 3.5 * k, c);
    // the claw: an iron block, two prongs below it, open wide at rest and shut on what it holds, a lamp that goes red
    const open = holding ? 2 * k : 5 * k;
    ctx.fillStyle = '#17151b'; ctx.fillRect(Math.round(gx - 6 * k - c), Math.round(gy - 3 * k - c), 12 * k + 2 * c, 6 * k + 2 * c);
    ctx.fillStyle = '#51505a'; ctx.fillRect(Math.round(gx - 6 * k), Math.round(gy - 3 * k), 12 * k, 6 * k);
    ctx.fillStyle = '#76757f'; ctx.fillRect(Math.round(gx - 6 * k), Math.round(gy - 3 * k), 12 * k, c);
    for (const sd of [-1, 1]) { const px = gx + sd * open; ctx.fillStyle = '#17151b'; ctx.fillRect(Math.round(px - 1.5 * k - c), Math.round(gy + 3 * k - c), 3 * k + 2 * c, 7 * k + 2 * c); ctx.fillStyle = '#34333b'; ctx.fillRect(Math.round(px - 1.5 * k), Math.round(gy + 3 * k), 3 * k, 7 * k); ctx.fillStyle = '#76757f'; ctx.fillRect(Math.round(px - 1.5 * k), Math.round(gy + 3 * k), c, 7 * k); }
    ctx.fillStyle = hot ? '#e8402c' : live && e.dazed > 0 ? '#34333b' : '#7a1e18'; ctx.fillRect(Math.round(gx - c), Math.round(gy - c), 2 * c, 2 * c);
  };
  F.drawArmWreck = (ctx, w) => {
    const base = PROP_PIXELS.sprites['arm-base-dead']; if (!base || typeof FACTORY_PROPS === 'undefined') return;
    const A = TUNING.arm, k = FACTORY_PROPS.TX, c = k;
    ctx.save(); ctx.translate(w.x, w.y); ctx.scale(1, 1 / TILT);
    PROP_PIXELS.draw(ctx, 'arm-base-dead', -base.w * k / 2, -base.h * k, k);
    const R = A.reach * TILE * 0.7, gx = Math.cos(w.ang) * R, gy = Math.sin(w.ang) * R * TILT + 3, sy = -(base.h - 2) * k, ex = gx * 0.45, ey = sy * 0.25 + gy * 0.55;
    if (w.claw) {
      // torn apart (`Arm.wreck`): the upper arm's stump hanging off the base, its end ragged, and the forearm and the claw
      // lying where they were flung, flat on the floor
      const sx = Math.cos(w.ang) * R * 0.3, sxy = sy * 0.4 + Math.sin(w.ang) * R * 0.3 * TILT + 6 * k;
      armBar(ctx, 0, sy, sx, sxy, A.look.w * k, c, ARM_DEAD);
      ctx.fillStyle = '#17151b'; ctx.fillRect(Math.round(sx - 2 * k), Math.round(sxy - 2 * k), 4 * k, 4 * k);
      ctx.fillStyle = '#8e4535'; ctx.fillRect(Math.round(sx - k), Math.round(sxy - k), 2 * k, c);
      const lx = w.claw.x - w.x, ly = (w.claw.y - w.y) * TILT, L = R * 0.55, ux = Math.cos(w.claw.ang), uy = Math.sin(w.claw.ang) * TILT;
      armBar(ctx, lx - ux * L, ly - uy * L, lx, ly, A.look.w * k * 0.8, c, ARM_DEAD);
      ctx.fillStyle = '#17151b'; ctx.fillRect(Math.round(lx - 6 * k), Math.round(ly - 2 * k), 12 * k, 4 * k);
      ctx.fillStyle = '#34333b'; ctx.fillRect(Math.round(lx - 5 * k), Math.round(ly - k), 10 * k, 2 * k);
      for (const sd of [-1, 1]) { ctx.fillStyle = '#17151b'; ctx.fillRect(Math.round(lx + sd * 5 * k - k), Math.round(ly + k), 2 * k, 5 * k); }
      ctx.restore();
      return;
    }
    armBar(ctx, 0, sy, ex, ey, A.look.w * k, c, ARM_DEAD); armBar(ctx, ex, ey, gx, gy, A.look.w * k * 0.8, c, ARM_DEAD);
    ctx.fillStyle = '#17151b'; ctx.fillRect(Math.round(gx - 6 * k), Math.round(gy - 2 * k), 12 * k, 4 * k);
    ctx.restore();
  };
  // THE SWEEPER (15 Oct 2026, js/factory.js `Sweeper`): a robot vacuum cleaner seen from above, in cells off its heading
  // (`e.sang`): a low disc, its side band dark, its lid with a rim of light up on the left, a dome in the middle and a red
  // lamp on its nose, and two chainsaw bars out of its front, the chain's teeth running round them. Bars that point away
  // from the camera are laid under the lid, the rest over it.
  F.drawSweeper = (ctx, angle, moving, t, x, e) => {
    if (typeof TUNING === 'undefined' || !TUNING.sweeper) return;
    const K = TUNING.sweeper.look, c = 2, a = e && e.sang !== undefined ? e.sang : angle, ca = Math.cos(a), sa = Math.sin(a);
    const rx = K.rx * c, ry = K.ry * c, h = K.h * c, run = Math.floor(t * 30) % 3;
    const snap = (v) => Math.round(v / c) * c;
    const ell = (cx, cy, ex, ey, col) => {
      ctx.fillStyle = col;
      for (let j = -ey; j <= ey; j += c) { const w = Math.round(ex * Math.sqrt(Math.max(0, 1 - (j / ey) * (j / ey))) / c) * c; if (w > 0) ctx.fillRect(snap(cx) - w, snap(cy + j), w * 2, c); }
    };
    // A chainsaw (16 Oct 2026, his mark: "the saws harder", bigger and meaner): a red motor housing at the rim, a bar three
    // cells broad out along the heading to a rounded nose, and the chain's teeth hooked on both edges running round it.
    const bar = (side) => {
      // from the rim, `gap` cells to the side of the nose, out along the heading
      const px = -sa * side, py = ca * side, ox = ca * rx * 0.7 + px * K.gap * c, oy = (sa * rx * 0.7 + py * K.gap * c) * TILT - h;
      const L = K.len * c;
      for (let s = 0; s <= L; s += c) {
        const bx = ox + ca * s, by = oy + sa * s * TILT, nose = s > L - c * 2;
        ctx.fillStyle = '#17151b'; ctx.fillRect(snap(bx) - c * (nose ? 2 : 2.5), snap(by) - c * (nose ? 2 : 2.5), c * (nose ? 4 : 5), c * (nose ? 4 : 5));
      }
      for (let s = 0; s <= L; s += c) {
        const bx = ox + ca * s, by = oy + sa * s * TILT, tooth = ((s / c) + run) % 2 === 0;
        ctx.fillStyle = s > L - c * 3 ? '#b8bec4' : '#7c8288'; ctx.fillRect(snap(bx) - c * 1.5, snap(by) - c * 1.5, c * 3, c * 3);
        ctx.fillStyle = '#5a6066'; ctx.fillRect(snap(bx) - c / 2, snap(by) - c / 2, c, c);   // the groove down its middle
        if (tooth) for (const e2 of [1, -1]) { ctx.fillStyle = '#e4e8ec'; ctx.fillRect(snap(bx + e2 * px * c * 2.2), snap(by + e2 * py * c * 2.2 * TILT), c, c); ctx.fillStyle = '#7a1e18'; ctx.fillRect(snap(bx + e2 * px * c * 2.2 + ca * c), snap(by + e2 * py * c * 2.2 * TILT + sa * c * TILT), c, c); }
      }
      // the motor housing at the root, rust red with a dark vent
      const hx = ox - ca * c, hy = oy - sa * c * TILT;
      ctx.fillStyle = '#17151b'; ctx.fillRect(snap(hx) - c * 2, snap(hy) - c * 2, c * 4, c * 4);
      ctx.fillStyle = '#8a2a1c'; ctx.fillRect(snap(hx) - c, snap(hy) - c, c * 2, c * 2);
      ctx.fillStyle = '#b8402a'; ctx.fillRect(snap(hx) - c, snap(hy) - c, c * 2, c);
    };
    if (!(Math.abs(ctx.shadowOffsetX || 0) > 1000)) ell(0, 0, rx + c, ry * 0.7, 'rgba(0,0,0,0.3)');
    const behind = sa < -0.2;
    if (behind) { bar(-1); bar(1); }
    ell(0, -h / 2, rx + c, ry + c, '#17151b');                 // the outline
    ell(0, -h / 2 + c, rx, ry, '#2a272d');                     // the side band
    ell(0, -h, rx, ry, '#4a4752');                             // the lid
    ell(-c, -h - c, rx - c * 2, ry - c * 2, '#5c5966');        // its light, up on the left
    ell(0, -h, rx - c * 3, ry - c * 3, '#4a4752');
    ell(0, -h - c, rx * 0.35, ry * 0.35, '#34323a');           // the dome
    ctx.fillStyle = '#76757f'; ctx.fillRect(snap(-rx * 0.2), snap(-h - c * 2), c, c);
    // the lamp on its nose, red, blinking faster while it is after him
    const lit = Math.sin(t * (e && e.aware ? 14 : 4)) > 0;
    ctx.fillStyle = lit ? '#e8402c' : '#7a1e18'; ctx.fillRect(snap(ca * rx * 0.62) - c / 2, snap(sa * ry * 0.62 - h) - c / 2, c * 2, c);
    if (!behind) { bar(-1); bar(1); }
  };
  // THE CARTRIDGE (16 Oct 2026, js/factory.js `Cartridge`; redrawn the same day, his: "more like Gungeon's bullets, but
  // so it is seen to be a robot, with some robotic gun"): Enter the Gungeon's Shotgun Kin as a machine, in cells. A red
  // ribbed hull with the folded crimp on top, a brass head under it with its rim standing proud, a steel collar of rivets
  // where the two meet, a visor across the hull with two slanted LED eyes (an angry look, cyan, blinking hot while it
  // charges), a stub antenna, two steel legs on little feet that step in turn, and a jointed arm holding a blaster: a
  // receiver with a coil lit in it and a barrel to a muzzle, laid a cell at a time along its aim, so it turns to the goat
  // the way a Gungeon gun does. Facing away the gun goes behind it and the visor is a vent; from the side the visor and
  // its one eye slide to the front. Charging it trembles and sparks at the muzzle; kicking back it squashes and the gun recoils.
  F.drawCartridge = (ctx, angle, moving, t, x, e) => {
    if (typeof TUNING === 'undefined' || !TUNING.cartridge) return;
    const K = TUNING.cartridge.look, c = K.cell, d = facingOf(angle), back = d === 3 || d === 4 || d === 5, side = d === 2 || d === 6;
    const W = K.w, HULL = K.hull, BASE = K.base, LEG = K.leg, aim = e && e.state === 'caim', kick = e && e.state === 'ckick';
    const hop = moving ? Math.sin(t * 16 + (x || 0) * 0.05) : 0, lift = moving && hop > 0 ? -K.hop * c : 0;
    const snap = (v) => Math.round(v / c) * c, INK = '#17151b';
    const cell = (cx, cy, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(snap(cx), snap(cy), w * c, h * c); };
    const volt = PALETTE.volt, voltHi = PALETTE.voltHi, hot = Math.floor(t * 20) % 2 ? voltHi : volt;
    if (!(Math.abs(ctx.shadowOffsetX || 0) > 1000)) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 0, W * c * 0.65, c * 2.2, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.save();
    ctx.translate(0, lift);
    // the charge read off the body (19 Oct 2026): `ch` 0..1 through its windup, a crouch from the feet and a shake that grows
    const ch = aim && e.caimMax ? Math.max(0, Math.min(1, 1 - e.timer / e.caimMax)) : 0;
    if (kick) { ctx.scale(1.1, 0.88); }
    if (aim) { ctx.scale(1 + 0.1 * ch, 1 - 0.14 * ch); ctx.translate(Math.round((Math.random() - 0.5) * (2 + 2 * ch)) * (c / 2), 0); }
    const x0 = -Math.floor(W / 2) * c, footY = -c, rimY = footY - LEG * c, baseY = rimY - (BASE - 1) * c, hullY = baseY - HULL * c;
    // the gun's line on the screen: the facing, its depth foreshortened as the floor is
    let ux = Math.cos(angle), uy = Math.sin(angle) * (typeof TILT === 'number' ? TILT : 0.86);
    const ul = hyp(ux, uy) || 1; ux /= ul; uy /= ul;
    const gs = ux >= -0.2 ? 1 : -1, gunBehind = uy < -0.4;
    const shY = hullY + Math.floor(HULL * 0.55) * c, edge = gs > 0 ? x0 + W * c : x0 - c;
    const hx = edge + gs * 2 * c - (kick ? ux * c * 1.5 : 0), hy = shY + c - (kick ? uy * c * 1.5 : 0);
    // the arm and the blaster in its claw
    const gun = () => {
      // the arm: two steel segments out of the hull's side to the claw
      cell(gs > 0 ? edge : edge - c, shY - c, 2, 3, INK); cell(gs > 0 ? edge : edge - c, shY, 2, 1, '#76757f');
      cell(gs > 0 ? edge + c : edge - c, shY, 1, 1, '#5c5966');
      let nx = -uy, ny = ux; if (ny < 0 || (Math.abs(ny) < 0.2 && nx > 0)) { nx = -nx; ny = -ny; }   // the grip hangs down
      const L = K.gun, at = (i, j) => [hx + (ux * i + nx * j) * c, hy + (uy * i + ny * j) * c];
      const lay = (pass) => {
        for (let i = -1; i <= L; i += 0.5) for (let j = -2; j <= 2.5; j += 0.5) {
          const fi = Math.floor(i + 0.25), rj = Math.round(j);
          const recv = fi >= 0 && fi < 3, barrel = fi >= 3 && fi < L, grip = fi >= 0 && fi < 2 && rj >= 1 && rj <= 2;
          const inside = (recv && rj >= -1 && rj <= 1) || (barrel && rj >= -1 && rj <= 0) || grip;
          if (pass === 0) {
            // the outline: every cell within one of the gun
            let near = false;
            for (let a = -1; a <= 1 && !near; a++) for (let b = -1; b <= 1 && !near; b++) {
              const gi = Math.floor(i + a + 0.25), gj = Math.round(j + b);
              near = (gi >= 0 && gi < 3 && gj >= -1 && gj <= 1) || (gi >= 3 && gi < L && gj >= -1 && gj <= 0) || (gi >= 0 && gi < 2 && gj >= 1 && gj <= 2);
            }
            if (!near) continue;
            const [px, py] = at(i, j); ctx.fillStyle = INK; ctx.fillRect(snap(px - c / 2), snap(py - c / 2), c, c);
            continue;
          }
          if (!inside) continue;
          let col;
          if (grip && !recv) col = '#3c3a44';
          else if (grip) col = rj === 1 ? '#3c3a44' : '#2a272d';
          else if (recv) col = rj === -1 ? '#8a8894' : rj === 0 ? ((fi === 1 || fi === 2) ? (aim ? hot : (Math.floor(t * 3 + fi) % 2 ? volt : '#3aa6c0')) : '#5c5966') : '#3c3a44';
          else if (fi === L - 1) col = aim ? hot : (rj === -1 ? '#4fb8d0' : '#2a6f80');
          else col = rj === -1 ? '#76757f' : (fi === 4 ? '#2a272d' : '#4a4752');
          const [px, py] = at(i, j); ctx.fillStyle = col; ctx.fillRect(snap(px - c / 2), snap(py - c / 2), c, c);
        }
      };
      lay(0); lay(1);
      // the claw round the grip
      cell(hx - c, hy - c, 2, 2, INK); cell(hx - c / 2, hy - c / 2, 1, 1, '#8a8894');
      // charging: sparks at the muzzle; the kick: a flash off it
      const [mx, my] = at(L + 0.5, -0.5);
      if (aim) {   // the crackle at the muzzle widens and thickens with the charge
        const n = 4 + Math.round(10 * ch), sp = 5 + 2 * Math.round(3 * ch);
        for (let k = 0; k < n; k++) { const q = Math.floor(t * 30 + k * 5.3); cell(mx + ((q * 7) % sp - (sp >> 1)) * c, my + ((q * 11) % sp - (sp >> 1)) * c, 1, 1, k % 2 ? voltHi : volt); }
        if (ch > 0.6) { cell(mx - c, my - c, 3, 3, volt); cell(mx - c / 2, my - c / 2, 2, 2, voltHi); }
      }
      if (kick) { cell(mx - c, my - c, 3, 3, volt); cell(mx - c / 2, my - c / 2, 2, 2, voltHi); }
    };
    if (gunBehind) gun();
    // the legs: two steel shins on feet, lifted in turn on the run
    const l1 = moving && hop > 0 ? -c : 0, l2 = moving && hop <= 0 ? -c : 0;
    const leg = (lx, dy, out) => {
      cell(lx - 2 * c, rimY + c + dy, 6, LEG + 1, INK);
      cell(lx, rimY + c + dy, 2, LEG - 1, '#5c5966'); cell(lx, rimY + c + dy, 1, LEG - 1, '#8a8894');
      cell(lx + (out < 0 ? -c : 0), footY + dy, 3, 1, '#3c3a44');
    };
    leg(x0 + 2 * c, l1, -1); leg(x0 + (W - 4) * c, l2, 1);
    // the outline round the shell, the rim standing a cell proud of the head
    cell(x0 - c, hullY, W + 2, HULL + BASE, INK); cell(x0, hullY - c, W, 1, INK); cell(x0 - 2 * c, rimY - c, W + 4, 3, INK);
    // the brass head: light up the left, dark down the right, the rim proud at its foot with a groove over it
    cell(x0, baseY, W, BASE - 1, '#dcb33a');
    cell(x0, baseY, 2, BASE - 1, '#f3d96f'); cell(x0 + (W - 2) * c, baseY, 2, BASE - 1, '#9c7a20');
    cell(x0, rimY - c, W, 1, '#7a5e16');
    cell(x0 - c, rimY, W + 2, 1, '#c99a26'); cell(x0 - c, rimY, 2, 1, '#f3d96f'); cell(x0 + (W - 1) * c, rimY, 2, 1, '#8a6a18');
    // the hull: red, ribbed, a pale streak up the left, a dark band down the right, the folded crimp on top
    cell(x0, hullY + c, W, HULL - 1, '#c62a22');
    for (let k = 3; k < W - 2; k += 2) cell(x0 + k * c, hullY + 2 * c, 1, HULL - 3, '#a82420');
    cell(x0 + c, hullY + c, 1, HULL - 2, '#ea5a4e'); cell(x0 + c, hullY + 2 * c, 1, 3, '#f6b8a8');
    cell(x0 + (W - 2) * c, hullY + c, 2, HULL - 1, '#8e1a16');
    cell(x0, hullY + c, 1, HULL - 1, '#7e1814');
    cell(x0 + c, hullY, W - 2, 1, '#a82420');
    for (let k = 1; k < W - 1; k += 2) cell(x0 + k * c, hullY, 1, 1, '#6e1410');   // the crimp's folds
    // the steel collar where hull meets brass, its rivets lit
    cell(x0, baseY - c, W, 1, '#4a4752');
    for (let k = 1; k < W; k += 2) cell(x0 + k * c, baseY - c, 1, 1, '#9a98a4');
    // the stub antenna, its lamp blinking: slow red at rest, fast cyan charging
    const ax = side ? x0 + (d === 6 ? 2 : W - 3) * c : x0 + (W - 3) * c;
    cell(ax - c, hullY - 5 * c, 3, 5, INK); cell(ax, hullY - 3 * c, 1, 2, '#8a8894');
    cell(ax, hullY - 4 * c, 1, 1, aim ? hot : (Math.sin(t * 4) > 0 ? '#ff5a3a' : '#7a1e18'));
    // the face: a visor across the hull and two LED eyes slanted down to the middle (an angry look); slid to the front
    // on the side views, a vent of three slots on the back views
    const vY = hullY + 3 * c, eye = aim ? hot : volt;
    if (back) for (let k = 0; k < 3; k++) cell(x0 + 3 * c, vY + k * 2 * c, W - 6, 1, '#6e1410');
    else if (side) {
      const f = d === 6 ? 1 : -1, vx = f > 0 ? x0 + Math.floor(W / 2) * c : x0;
      cell(vx, vY - c, Math.ceil(W / 2) , 3, INK);
      const ex = f > 0 ? x0 + (W - 3) * c : x0 + c;
      cell(ex + (f > 0 ? c : 0), vY, 1, 1, eye); cell(ex + (f > 0 ? 0 : c), vY + c, 1, 1, eye);
    } else {
      cell(x0 + c, vY - c, W - 2, 3, INK);
      cell(x0 + 2 * c, vY, 1, 1, eye); cell(x0 + 3 * c, vY + c, 1, 1, eye);
      cell(x0 + (W - 3) * c, vY, 1, 1, eye); cell(x0 + (W - 4) * c, vY + c, 1, 1, eye);
    }
    if (!gunBehind) gun();
    ctx.restore();
  };
  // THE SHIELD GENERATOR (15 Oct 2026, js/factory.js `ShieldGen`): a squat steel box on two tracks, a cyan shield badge
  // on its front with the core breathing in it, and out of its lid a tall lattice mast (16 Oct 2026, his mark: "a bigger
  // antenna, and something for the object to read better") with a dish on top sending rings of signal up, a cell at a time.
  // Dark while it holds no dome (in the goat's teeth, flung). Symmetric, so one drawing serves every facing.
  F.drawShieldGen = (ctx, angle, moving, t, x, e) => {
    if (typeof TUNING === 'undefined' || !TUNING.shieldgen) return;
    const K = TUNING.shieldgen.look, c = 2, hw = Math.ceil(K.w / 2), H = K.h, M = K.mast;
    const on = !e || e.statue || (typeof ShieldGen !== 'undefined' && ShieldGen.working(e) && !e.dead);
    const ph = t * 1.6 + (x || 0) * 0.01, pulse = Math.sin(ph * Math.PI * 2) > 0, run = moving ? Math.floor(t * 18) % 3 : 0;
    const cell = (i, j, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(i * c, j * c, w * c, h * c); };
    const cyan = on ? PALETTE.dome : PALETTE.domeDark, hi = on ? PALETTE.domeHi : PALETTE.domeDark;
    if (!(Math.abs(ctx.shadowOffsetX || 0) > 1000)) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-(hw + 1) * c, -c, (hw + 1) * 2 * c, c * 2); }
    // the tracks, their treads running while it drives
    cell(-hw - 1, -3, hw * 2 + 2, 3, '#17151b');
    for (let i = -hw; i < hw; i++) if (((i + run) % 3 + 3) % 3 === 0) cell(i, -2, 1, 1, '#4a4752');
    // the box: outline, its sides, a lid lit up on the left, a cyan stripe round its foot
    const top = -3 - H;
    cell(-hw, top - 1, hw * 2, H + 1, '#17151b');
    cell(-hw + 1, top, hw * 2 - 2, H - 1, '#3c3a44');
    cell(-hw + 1, top, hw * 2 - 2, 1, '#5c5966'); cell(-hw + 1, top, 1, H - 1, '#4f4c58');
    cell(-hw + 1, -4, hw * 2 - 2, 1, on ? PALETTE.domeDark : '#2a272d');
    // the badge: a shield of cyan cells on its front, the core lit in it
    const by = top + 1;
    cell(-2, by, 4, 3, '#17151b'); cell(-1, by + 3, 2, 1, '#17151b');
    cell(-2 + 0.5, by + 0.5, 3, 2, cyan); cell(-0.5, by + 2.5, 1, 1, cyan);
    if (on) cell(-0.5, by + 1, 1, 1, pulse ? '#ffffff' : hi);
    // the mast: two rails and a brace zigzag, tall, its feet bolted to the lid
    const mt = top - 1 - M;
    cell(-2, mt, 1, M, '#17151b'); cell(1, mt, 1, M, '#17151b');
    cell(-1.5, mt, 0.5, M, '#76757f'); cell(1.5, mt, 0.5, M, '#5c5966');
    for (let j = 0; j < M; j += 2) cell(((j / 2) % 2) ? -1 : 0, mt + j, 1, 1, '#5c5966');
    cell(-3, top - 2, 6, 1, '#17151b');
    // the dish on top: a ring of cells round a lit eye
    const ey = mt - 3;
    cell(-3, ey - 1, 6, 4, '#17151b'); cell(-2, ey, 4, 2, '#4a4752'); cell(-1, ey, 2, 2, cyan);
    if (on) cell(-1, ey, 1, 1, hi);
    // its signal: three arcs of cells going up and out, one after another, while it holds the dome
    if (on) for (let k = 0; k < 3; k++) {
      const u = ((ph + k / 3) % 1), r = 3 + u * 7, a = 1 - u; if (a <= 0.05) continue;
      ctx.globalAlpha = a; ctx.fillStyle = k === 0 ? PALETTE.domeHi : PALETTE.dome;
      for (let q = -0.9; q <= 0.9; q += 0.9 / Math.max(2, r)) ctx.fillRect(Math.round(Math.sin(q) * r) * c, Math.round(ey - Math.cos(q) * r * 0.8) * c, c, c);
      ctx.globalAlpha = 1;
    }
  };
  // The statue and the corpse's snapshot hand a stub with no `auto`: he stands at rest.
  F.draw = (ctx, key, angle, moving, t, x, e) => {
    if (!F.ready) return;
    if (key === 'sawbot') F.drawSawbot(ctx, angle, moving, t, x, e);
    else if (key === 'welder') F.drawWelder(ctx, angle, moving, t, x, e);
    else if (key === 'automaton') F.drawAutomaton(ctx, angle, moving, t, x, e);
    else if (key === 'arm') F.drawArm(ctx, angle, moving, t, x, e);
    else if (key === 'sweeper') F.drawSweeper(ctx, angle, moving, t, x, e);
    else if (key === 'shieldgen') F.drawShieldGen(ctx, angle, moving, t, x, e);
    else if (key === 'cartridge') F.drawCartridge(ctx, angle, moving, t, x, e);
  };
  // The factory's floor handed to `FLOOR_SHEET` under the key `PaintedArt.floorSwatch` will ask for: the look's picture
  // (144 texels, a 6 x 6 patch of tiles) off the atlas, or painted here (`paintFloor`), cut into its 36 tile canvases
  // (`FLOOR_SHEET.N`, `T`), once. Returns false while a packed picture is still loading.
  // No yellow on a wall (14 Oct 2026, his: "no yellow walls, yellow was our threat"): every warm, saturated pixel of the
  // pack's two walls (their copper and brass pipes) is pulled to grey steel of its own brightness.
  F.unyellow = (c) => {
    const g = c.getContext('2d'), img = g.getImageData(0, 0, c.width, c.height), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], gr = d[i + 1], b = d[i + 2], mx = Math.max(r, gr, b), mn = Math.min(r, gr, b);
      if (mx < 40 || (mx - mn) / mx < 0.28 || b >= gr || r < b) continue;   // only the warm ones (red and green over blue)
      const l = 0.299 * r + 0.587 * gr + 0.114 * b;
      d[i] = Math.round(l * 0.92); d[i + 1] = Math.round(l * 0.98); d[i + 2] = Math.round(l * 1.1);
    }
    g.putImageData(img, 0, 0);
  };
  // A floor is what everything stands on (14 Oct 2026, his: "the riveted floor flickers, a lot of visual noise, the room
  // is harder to read"): every factory floor is pulled toward its own mean colour before it is cut, what is lighter than
  // the mean (a rivet's glint, a scratch) to `TUNING.machine.floor.hi` of its contrast, what is darker (the seams, a
  // rivet's shadow, oil) to `lo`, so the plates' joints still read and the speckle does not.
  F.quiet = (src, sx, sy, size) => {
    const Q = TUNING.machine.floor, c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, sx, sy, size, size, 0, 0, size, size);
    const img = g.getImageData(0, 0, size, size), d = img.data, n = d.length / 4, m = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) m[k] += d[i + k] / n;
    const lm = 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2];
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2], k = l > lm ? Q.hi : Q.lo;
      for (let j = 0; j < 3; j++) d[i + j] = Math.round(m[j] + (d[i + j] - m[j]) * k);
    }
    g.putImageData(img, 0, 0); return c;
  };
  const seededKeys = new Set();
  F.seedFloor = (def, key) => {
    if (seededKeys.has(key) || typeof FLOOR_SHEET === 'undefined') return true;
    const L = F.floorLook(def), N = FLOOR_SHEET.N, T = FLOOR_SHEET.S / N, tiles = [];
    let src, sx = 0, sy = 0, per;
    if (L.paint) { src = F.paintFloor(L.paint); per = src.width / N; }
    else { const it = FACTORY_ASSETS.items[L.item]; if (!it || !F.ready) return false; src = F.image; sx = it[0]; sy = it[1]; per = it[2] / N; }
    src = F.quiet(src, sx, sy, per * N); sx = 0; sy = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const c = document.createElement('canvas'); c.width = c.height = T; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      x.drawImage(src, sx + i * per, sy + j * per, per, per, 0, 0, T, T); tiles.push(c);
    }
    FLOOR_SHEET.sheets.set(key, tiles); seededKeys.add(key); return true;
  };
  if (typeof document !== 'undefined') F.init();
  return F;
})();
