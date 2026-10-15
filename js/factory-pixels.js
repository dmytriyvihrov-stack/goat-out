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
    const st = e && e.state, pose = st === 'windup' ? 'wind' : st === 'swing' ? 'swing' : 'rest';
    const frame = Math.floor(t * (pose === 'rest' ? TUNING.sawbot.saw.run * 0.3 : TUNING.sawbot.saw.run)) % 3;
    const bar = sawBar(pose, frame), R = TUNING.sawbot.saw.len + 6, hand = back ? SAW_HAND_BACK : SAW_HAND;
    const saw = () => {
      const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
      ctx.save(); ctx.translate((hand[0] - it[2] / 2) * TX, (hand[1] - it[3]) * TX + dy); if (back) ctx.scale(-1, 1);
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
  const CW = 260, CH = 220, OX = CW / 2, OY = 170;   // texels; the feet's origin at (OX, OY)
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
    for (const L of pose.legs) if (L.back) leg(g, L, L.out, L.hurt);
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
    if (pose.breath > 0) { g.fillStyle = `rgba(255,110,96,${0.3 + 0.35 * pose.breath})`; g.fillRect(-F.W / 2 + 12, pose.bodyY - 30, 26, 17); g.fillRect(F.W / 2 - 38, pose.bodyY - 32, 26, 17);
      g.fillStyle = `rgba(255,214,190,${0.45 * pose.breath})`; g.fillRect(-F.W / 2 + 18, pose.bodyY - 27, 10, 3); g.fillRect(F.W / 2 - 30, pose.bodyY - 29, 10, 3); }
    for (const L of pose.legs) if (!L.back) leg(g, L, L.out, L.hurt);
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
  // floor, so there is something to choose from") ----------------------------------------------------------------
  // A floor is one of `FLOORS`: the pack's four pictures (144 texels, a 6 x 6 patch of tiles) or one painted here in
  // texels (`paint`, the same 144 square, seamless). A wall is one of `WALLS`: the pack's two elevations (72 x 32, cut
  // into a cap band and a face, `band` / `face` rows) or one painted here (`cap` 64 x 64 texels at 3 px, `face` 480 x 18
  // texels at 2 px, both wrapping). Which is worn: a level's own `flook` / `wlook` (THE FACTORY's test rooms wear one
  // combination each), else the ART tab's `ART_PASS.ffloor` / `fwall`. Every bake keys on the look.
  F.FLOORS = [
    { name: 'PLATES', item: 'floor-plates' }, { name: 'CONCRETE', item: 'floor-concrete' }, { name: 'GRATE', item: 'floor-grate' },
    { name: 'BRICK', item: 'floor-brick' }, { name: 'CHECKER', paint: 'checker' }, { name: 'RUST', paint: 'rust' },
  ];
  F.WALLS = [
    { name: 'IRON', item: 'wall-iron', x0: 1, w: 70, band: [1, 10], face: [11, 31] },
    { name: 'BRICK', item: 'wall-brick', x0: 1, w: 70, band: [1, 10], face: [11, 29] },
    { name: 'FURNACE', paint: 'furnace' }, { name: 'CORRUGATED', paint: 'corrugated' }, { name: 'PIPES', paint: 'pipes' }, { name: 'GIRDER', paint: 'girder' },
  ];
  F.floorLook = (def) => (def && def.flook && F.FLOORS.find((f) => f.name === def.flook)) || F.FLOORS[(typeof ART_PASS !== 'undefined' && ART_PASS.ffloor) || 0];
  F.wallLook = (def) => (def && def.wlook && F.WALLS.find((w) => w.name === def.wlook)) || F.WALLS[(typeof ART_PASS !== 'undefined' && ART_PASS.fwall) || 0];
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
  // THE FLOORS painted in texels (144 square). CHECKER: diamond plate, the bumps a staggered grid of lit diamonds on dark
  // steel, plate seams two tiles apart with a rivet at each corner, rust and oil here and there. RUST: sheet iron gone
  // over, panels of different browns butted together with their rivets, scale and a dark oil pool or two.
  F.paintFloor = (look) => {
    const p = painter(144, 144, 1), r = seeded(look === 'checker' ? 11 : 23);
    if (look === 'checker') {
      p.rect(0, 0, 144, 144, '#3f3f47');
      for (let j = 0; j < 144; j++) for (let i = 0; i < 144; i++) if (((i * 7 + j * 13) % 11) === 0) p.set(i, j, '#3a3a42');
      for (let y = 0; y < 144; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < 144; x += 6) {
        p.set(x, y + 1, '#5e5e68'); p.set(x + 1, y + 1, '#666670'); p.set(x + 1, y, '#787884'); p.set(x + 2, y + 1, '#50505a'); p.set(x + 1, y + 2, '#2c2c33'); p.set(x + 2, y + 2, '#26262c');
      }
      for (let s = 0; s < 144; s += 48) { p.hl(0, s, 144, '#1f1f25'); p.hl(0, s + 1, 144, '#50505a'); p.vl(s, 0, 144, '#1f1f25'); p.vl(s + 1, 0, 144, '#50505a'); }
      for (let y = 0; y < 144; y += 48) for (let x = 0; x < 144; x += 48) { rivet(p, x + 3, y + 3, '#6c6c76', '#90909a', '#222228'); rivet(p, x + 44, y + 44, '#6c6c76', '#90909a', '#222228'); }
      for (let k = 0; k < 7; k++) rust(p, Math.floor(r() * 144), Math.floor(r() * 144), 2 + Math.floor(r() * 3), r);
      for (let k = 0; k < 3; k++) { const x = Math.floor(r() * 144), y = Math.floor(r() * 144); p.blot(x, y, 4 + Math.floor(r() * 3), '#2b2a31', r); p.blot(x - 1, y - 1, 2, '#33323a', r); }
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
  // FURNACE: a dark iron coping over sooted fire brick with embers glowing behind a grate at its foot. CORRUGATED: a bolted
  // rail over dark ribbed sheet rusting at its foot. PIPES: two brass pipes with flanges, valves and a gauge along a dark
  // panel. GIRDER: an I-beam's flange for a cap, black lattice behind bolted cross-braces for the face.
  F.paintCap = (look) => {
    const p = painter(64, 64, 3), r = seeded(look.length * 31);
    if (look === 'corrugated') {
      p.rect(0, 0, 64, 64, '#2b2a32');
      for (let y = 0; y < 64; y += 16) { p.hl(0, y, 64, '#17161c'); p.hl(0, y + 1, 64, '#4e4c58'); p.hl(0, y + 2, 64, '#3a3842'); for (let x = 2; x < 64; x += 8) rivet(p, x, y + 1, '#6a6874', '#8e8c98', '#17161c'); }
      for (let k = 0; k < 5; k++) rust(p, Math.floor(r() * 64), Math.floor(r() * 64), 1 + Math.floor(r() * 2), r);
    } else if (look === 'girder') {
      p.rect(0, 0, 64, 64, '#1f1e26');
      for (let y = 0; y < 64; y += 32) { p.rect(0, y, 64, 10, '#45434d'); p.hl(0, y, 64, '#5e5c68'); p.hl(0, y + 9, 64, '#141318'); p.rect(0, y + 14, 64, 4, '#36343d'); p.hl(0, y + 14, 64, '#48464f'); for (let x = 3; x < 64; x += 8) { rivet(p, x, y + 2, '#6c6a76', '#8e8c98', '#141318'); rivet(p, x, y + 6, '#6c6a76', '#8e8c98', '#141318'); } }
      for (let x = 0; x < 64; x += 32) { p.rect(x, 0, 10, 64, '#45434d'); p.vl(x, 0, 64, '#5e5c68'); p.vl(x + 9, 0, 64, '#141318'); for (let y = 12; y < 64; y += 8) { rivet(p, x + 2, y, '#6c6a76', '#8e8c98', '#141318'); rivet(p, x + 6, y, '#6c6a76', '#8e8c98', '#141318'); } }
    } else if (look === 'furnace') {
      // a coping of dark iron plates, sooted, a fleck of ember here and there
      p.rect(0, 0, 64, 64, '#2a2630');
      for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 32) {
        const t = mixc('#2a2630', r() < 0.5 ? '#1a181e' : '#38343f', r() * 0.3); p.rect(x + 1, y + 1, 31, 15, t);
        p.hl(x, y, 32, '#15131a'); p.vl(x, y, 16, '#15131a'); p.hl(x + 1, y + 1, 31, mixc(t, '#5a5462', 0.3));
        rivet(p, x + 3, y + 3, '#4e4a56', '#6c6874', '#15131a'); rivet(p, x + 27, y + 3, '#4e4a56', '#6c6874', '#15131a');
        for (let k = 0; k < 10; k++) p.set(x + 2 + Math.floor(r() * 29), y + 2 + Math.floor(r() * 13), '#1a1719');
        if (r() < 0.5) p.set(x + 4 + Math.floor(r() * 24), y + 4 + Math.floor(r() * 10), '#6a2a18');
      }
    } else {
      p.rect(0, 0, 64, 64, '#262530');
      for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) {
        const t = mixc('#262530', r() < 0.5 ? '#18171f' : '#363440', r() * 0.3); p.rect(x + 1, y + 1, 15, 15, t);
        p.hl(x, y, 16, '#15141a'); p.vl(x, y, 16, '#15141a'); p.hl(x + 1, y + 1, 15, mixc(t, '#5a5866', 0.3)); p.vl(x + 1, y + 1, 15, mixc(t, '#5a5866', 0.2));
        rivet(p, x + 3, y + 3, '#5c5a66', '#7c7a88', '#15141a'); rivet(p, x + 11, y + 11, '#5c5a66', '#7c7a88', '#15141a');
        for (let k = 0; k < 5; k++) p.set(x + 2 + Math.floor(r() * 13), y + 2 + Math.floor(r() * 13), mixc(t, '#121117', 0.3));
      }
      for (let k = 0; k < 3; k++) rust(p, Math.floor(r() * 64), Math.floor(r() * 64), 1, r);
    }
    return p.canvas;
  };
  F.paintFace = (look) => {
    const W = 480, H = 18, p = painter(W, H, 2), r = seeded(look.length * 17 + 5);
    if (look === 'furnace') {
      // sooted fire brick under a dark coping, embers behind a grate at the foot
      p.rect(0, 0, W, H, '#1f1516'); p.hl(0, 0, W, '#3a363f'); p.hl(0, 1, W, '#1e1c22');
      for (let y = 2; y < 14; y += 4) { const off = (y / 4) % 2 ? 5 : 0; for (let x = -10 + off; x < W; x += 10) {
        const t = mixc('#4a2a22', r() < 0.5 ? '#2e1a16' : '#5e3a2c', r() * 0.35); p.rect(x + 1, y + 1, 9, 3, t); p.hl(x + 1, y + 1, 9, mixc(t, '#7a5040', 0.3));
        if (y < 6) for (let k = 0; k < 6; k++) p.set(x + 1 + Math.floor(r() * 9), y + 1 + Math.floor(r() * 3), '#241614');
      } }
      p.rect(0, 14, W, 4, '#2a1612');
      for (let x = 0; x < W; x++) { const g = (x * 7) % 5; p.set(x, 15, g === 0 ? '#b8321c' : g === 2 ? '#8a2414' : '#5a1a10'); p.set(x, 16, g === 1 ? '#8a2414' : '#401410'); if (x % 3 === 0) { p.set(x, 14, '#15131a'); p.set(x, 15, '#15131a'); p.set(x, 16, '#15131a'); } }
      p.hl(0, 17, W, '#15131a');
    } else if (look === 'corrugated') {
      for (let x = 0; x < W; x++) p.vl(x, 0, H, ['#4a3f33', '#3a3128', '#221c17', '#3a3128'][x % 4]);
      p.hl(0, 2, W, '#17161c'); p.hl(0, 3, W, '#6a6874'); p.hl(0, 4, W, '#4a4854'); for (let x = 4; x < W; x += 16) rivet(p, x, 3, '#8a8894', '#b4b2be', '#17161c');
      for (let x = 0; x < W; x++) { const d = 12 + Math.floor(r() * 5); for (let y = d; y < H; y++) if (r() < 0.7) p.set(x, y, y > 15 ? '#2a1c14' : (x % 4 === 0 ? '#8a5a38' : x % 4 === 2 ? '#4a3025' : '#6a4530')); }
    } else if (look === 'pipes') {
      p.rect(0, 0, W, H, '#2a2830'); p.hl(0, 0, W, '#44424e'); p.rect(0, 16, W, 2, '#17161c');
      for (let x = 0; x < W; x += 48) { p.vl(x, 0, 16, '#17161c'); rivet(p, x + 3, 2, '#5c5a66', '#7c7a88', '#17161c'); rivet(p, x + 43, 2, '#5c5a66', '#7c7a88', '#17161c'); }
      const pipe = (y, h, body, hi, lo) => { p.rect(0, y, W, h, body); p.hl(0, y, W, hi); p.hl(0, y + h - 1, W, lo); };
      // steel, never brass (14 Oct 2026, his: "no yellow walls, yellow is our threat")
      pipe(5, 5, '#4e5560', '#7a838f', '#22262c'); pipe(12, 3, '#3e444d', '#646c77', '#1c1f24');
      for (let x = 0; x < W; x += 48) { p.rect(x + 20, 4, 3, 7, '#5a616c'); p.hl(x + 20, 4, 3, '#8a929e'); p.hl(x + 20, 10, 3, '#22262c'); }
      for (let x = 8; x < W; x += 96) { p.rect(x, 11, 5, 5, '#8a2022'); p.rect(x + 1, 12, 3, 3, '#2a2830'); p.set(x + 2, 13, '#8a2022'); p.set(x, 11, '#c83a34'); }
      for (let x = 60; x < W; x += 160) { p.rect(x, 2, 5, 4, '#e6dfc8'); p.hl(x, 2, 5, '#8a8894'); p.set(x + 2, 4, '#b02a2c'); p.set(x + 3, 3, '#b02a2c'); p.vl(x + 2, 6, 2, '#6c6a76'); }
      for (let k = 0; k < 12; k++) { const x = Math.floor(r() * W); p.set(x, 9, '#2a2e34'); p.set(x, 10, '#2a2e34'); }
    } else {
      p.rect(0, 0, W, H, '#17161c');
      for (let y = 0; y < H; y += 3) for (let x = y % 6 ? 3 : 0; x < W; x += 6) p.rect(x, y, 2, 2, '#201f26');
      p.rect(0, 0, W, 3, '#45434d'); p.hl(0, 0, W, '#6c6a76'); p.hl(0, 2, W, '#141318'); p.rect(0, 15, W, 3, '#45434d'); p.hl(0, 15, W, '#5e5c68'); p.hl(0, 17, W, '#141318');
      for (let x = 0; x < W; x += 32) {
        p.rect(x, 3, 3, 12, '#3a3842'); p.vl(x, 3, 12, '#5e5c68');
        for (let k = 0; k < 12; k++) { p.set(x + 4 + k * 2, 3 + k, '#4a4854'); p.set(x + 5 + k * 2, 3 + k, '#36343f'); p.set(x + 28 - k * 2, 3 + k, '#4a4854'); p.set(x + 27 - k * 2, 3 + k, '#36343f'); }
        rivet(p, x + 4, 1, '#8a8894', '#b4b2be', '#141318'); rivet(p, x + 26, 1, '#8a8894', '#b4b2be', '#141318');
      }
      for (let k = 0; k < 6; k++) rust(p, Math.floor(r() * W), 4 + Math.floor(r() * 11), 1, r);
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
  // A machine where a stone pillar would stand: a boiler or a cabinet off the tile's hash, the hand-drawn ones
  // (js/factory-props.js, 14 Oct 2026: "more in our pixel style"), its feet at (x, y).
  F.pillar = (ctx, x, y, h) => {
    if (typeof FACTORY_PROPS === 'undefined') return false;
    const name = h % 3 === 0 ? 'fac-cabinet' : 'fac-boiler', g = PROP_PIXELS.sprites[name]; if (!g) return false;
    const k = FACTORY_PROPS.TX;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 1 / TILT); if (h & 4) ctx.scale(-1, 1);
    PROP_PIXELS.draw(ctx, name, -g.w * k / 2, -g.h * k, k);
    ctx.restore(); return true;
  };
  // THE BOMB MACHINE (js/machines.js): the cabinet, a size up, shaking while it works, its button a cell square on its
  // front: red and breathing when it will take a press, amber blinking while it makes one, dark while its bomb is out.
  F.drawDispenser = (ctx, p, t) => {
    if (!F.canvas('cabinet')) return;
    const k = 1.35, busy = p.makeT > 0, sh = busy ? Math.round(Math.sin(t * 60)) : 0;
    ctx.save(); ctx.translate(p.x + sh, p.y + 4); ctx.scale(1, 1 / TILT);
    stand(ctx, 'cabinet', false, 0, k);
    const last = p.lastBomb, out = last && !last.broken && !(last.fuseT >= 0);
    const col = busy ? (Math.floor(t * 8) % 2 ? '#ffd36b' : '#f2aa30') : p.buzz > 0 ? '#6c696d' : out ? '#492723' : `rgb(${200 + Math.round(55 * Math.sin(t * 5))},50,40)`;
    const by = -16 * k, r = Math.round(3.2 * k), o = Math.round(k);
    ctx.fillStyle = '#0e0c10'; ctx.fillRect(-r - o, Math.round(by) - r - o, (r + o) * 2, (r + o) * 2);
    ctx.fillStyle = col; ctx.fillRect(-r, Math.round(by) - r, r * 2, r * 2);
    ctx.fillStyle = 'rgba(255,240,220,0.5)'; ctx.fillRect(-r, Math.round(by) - r, r, o);
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
    armBar(ctx, 0, sy, ex, ey, A.look.w * k, c, ARM_DEAD); armBar(ctx, ex, ey, gx, gy, A.look.w * k * 0.8, c, ARM_DEAD);
    ctx.fillStyle = '#17151b'; ctx.fillRect(Math.round(gx - 6 * k), Math.round(gy - 2 * k), 12 * k, 4 * k);
    ctx.restore();
  };
  // The statue and the corpse's snapshot hand a stub with no `auto`: he stands at rest.
  F.draw = (ctx, key, angle, moving, t, x, e) => {
    if (!F.ready) return;
    if (key === 'sawbot') F.drawSawbot(ctx, angle, moving, t, x, e);
    else if (key === 'welder') F.drawWelder(ctx, angle, moving, t, x, e);
    else if (key === 'automaton') F.drawAutomaton(ctx, angle, moving, t, x, e);
    else if (key === 'arm') F.drawArm(ctx, angle, moving, t, x, e);
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
