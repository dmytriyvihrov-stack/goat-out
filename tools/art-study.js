// In-page sheets for the art studies (`ART_PASS`, `PIXEL_STUDY` in js/pixel-art.js): every study of a
// unit on the floor of every canon, with two numbers under each — how far apart the man and the floor
// are in brightness (a contrast ratio, the same one WCAG uses) and in colour (OKLab distance x100) —
// and the before/after sheets of the art pass. Load it into the served page like the harness:
//   const s = document.createElement('script'); s.src = '/tools/art-study.js'; document.body.appendChild(s);
// then `await ART_STUDY.all('art-pass-2026-09-25')`, which writes PNGs to tools/shots/.
window.ART_STUDY = (() => {
  const FONT = 'Alegreya, serif', BG = '#141013', INK = '#efe6d0', ASH = '#8d837c';
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  const oklab = ([r, g, b]) => {
    const R = lin(r), G = lin(g), B = lin(b);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  };
  const dE = (a, b) => { const p = oklab(a), q = oklab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) * 100; };
  const mean = (cv) => {
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    return n ? [r / n, g / n, b / n] : [0, 0, 0];
  };
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const say = (x, str, X, Y, px, col, weight = 400) => { x.font = `${weight} ${px}px ${FONT}`; x.fillStyle = col; x.fillText(str, X, Y); };
  const wrap = (x, str, maxW) => { const out = []; let line = ''; for (const w of str.split(' ')) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; };

  // One idle facing of a unit in whichever study `ART_PASS` holds now, foot at (X, Y), `k` x its size.
  const unit = (x, id, facing, X, Y, k) => { x.save(); x.translate(X, Y); PIXEL_ART.frame(x, PIXEL_ASSETS.units[id].idle[facing], id, k); x.restore(); };
  const alone = (id, facing, k) => { const c = canvas(160 * k, 160 * k), x = c.getContext('2d'); unit(x, id, facing, 80 * k, 150 * k, k); return c; };
  // A patch of a level's floor, `tw` x `th` tiles, off the game's own swatches in the colour it has now.
  const floor = (x, def, X, Y, tw, th, k) => {
    const P = game.renderer.painted;
    for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) x.drawImage(P.floorSwatch(def, 0, false, i, j), X + i * TILE * k, Y + j * TILE * k, TILE * k, TILE * k);
    const c = canvas(TILE, TILE); c.getContext('2d').drawImage(P.floorSwatch(def, 0, false, 0, 0), 0, 0, TILE, TILE); return mean(c);
  };
  const post = async (cv, name) => (await fetch('/shot?name=' + name, { method: 'POST', body: cv.toDataURL('image/png') })).text();
  const settle = () => new Promise((r) => setTimeout(r, 60));

  // Every study of `id` (rows) on every canon's floor (columns), with `mate` standing beside him in
  // its packed look, so a cultist is judged against the man he fights beside as well as the floor.
  async function onFloors(id, mate, title) {
    // Every floor as packed, then each floor the art pass recolours, as the pass has it.
    const cols = [...LEVELS.map((def) => ({ def, pass: false })), ...LEVELS.filter((d) => d.artPass && d.artPass.floor).map((def) => ({ def, pass: true }))];
    const S = PIXEL_STUDY[id], k = 2, cw = 3 * TILE * k, ch = 2.4 * TILE * k, head = 90, left = 250, rowH = ch + 44;
    const c = canvas(left + cols.length * (cw + 8) + 20, head + S.length * rowH + 20), x = c.getContext('2d');
    x.fillStyle = BG; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = false;
    say(x, title, 20, 34, 24, INK, 700);
    say(x, 'L× brightness contrast with the floor (3+ reads at a glance, under 1.5 is by hue alone) · ΔE colour distance in OKLab ×100 (under 10 is the same colour family)', 20, 58, 13, ASH);
    cols.forEach(({ def, pass }, i) => say(x, def.name + (pass ? ' · ART PASS' : ''), left + i * (cw + 8), head - 10, 12, pass ? '#ffe08a' : INK, 700));
    const was = ART_PASS[id], wasOn = ART_PASS.on;
    for (let r = 0; r < S.length; r++) {
      ART_PASS[id] = r; await settle();
      const y0 = head + r * rowH, body = mean(alone(id, 0, 1));
      say(x, (r ? r + '. ' : '') + S[r].name, 20, y0 + 22, 16, r ? '#ffe08a' : INK, 700);
      x.font = `400 12px ${FONT}`; wrap(x, S[r].rule || '', left - 40).forEach((l, li) => say(x, l, 20, y0 + 42 + li * 15, 12, ASH));
      cols.forEach(({ def, pass }, i) => {
        if (ART_PASS.on !== pass) ART_PASS.set(pass);
        const X = left + i * (cw + 8), fl = floor(x, def, X, y0, 3, 2.4, k);
        if (mate) { const m = PIXEL_STUDY[mate] ? ART_PASS[mate] : 0; if (PIXEL_STUDY[mate]) ART_PASS[mate] = 0; unit(x, mate, 7, X + cw * 0.78, y0 + ch - 6, k * 0.95); if (PIXEL_STUDY[mate]) ART_PASS[mate] = m; }
        unit(x, id, 0, X + cw * 0.3, y0 + ch - 6, k); unit(x, id, 2, X + cw * 0.55, y0 + ch - 10, k * 0.9);
        const L = ratio(body, fl), E = dE(body, fl);
        say(x, `L×${L.toFixed(2)}  ΔE ${E.toFixed(0)}`, X + 4, y0 + ch + 16, 13, L < 1.5 ? '#e0604a' : L < 2.5 ? '#f2a233' : '#b6d68a', 700);
      });
    }
    ART_PASS[id] = was; ART_PASS.set(wasOn);
    return c;
  }

  // Every study of `id` in all eight facings, big, on plain dark: the recolour and the slim to look at
  // pixel by pixel, where the floors sheet is about how they sit in a room.
  async function facings(id, title) {
    const S = PIXEL_STUDY[id], k = 3, cell = 46 * k, left = 250, head = 60;
    const c = canvas(left + 8 * cell, head + S.length * (cell + 16)), x = c.getContext('2d');
    x.fillStyle = BG; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = false;
    say(x, title, 20, 34, 24, INK, 700);
    const was = ART_PASS[id] !== undefined ? ART_PASS[id] : null, pass = ART_PASS.on;
    for (let r = 0; r < S.length; r++) {
      if (was === null) ART_PASS.on = r > 0; else ART_PASS[id] = r;
      await settle();
      const y0 = head + r * (cell + 16);
      say(x, (r ? r + '. ' : '') + S[r].name, 20, y0 + 26, 16, r ? '#ffe08a' : INK, 700);
      x.font = `400 12px ${FONT}`; wrap(x, S[r].rule || '', left - 40).forEach((l, li) => say(x, l, 20, y0 + 46 + li * 15, 12, ASH));
      for (let d = 0; d < 8; d++) unit(x, id, d, left + d * cell + cell / 2, y0 + cell - 8, k);
    }
    if (was === null) ART_PASS.on = pass; else ART_PASS[id] = was;
    return c;
  }

  // A prop drawn by the game's own `drawProp` (render.js), off and on under the art pass.
  async function props(title) {
    const k = 3, cell = 90 * k / 2, rows = [['heal', { big: true }, 'MILK GRASS (big)'], ['heal', {}, 'MILK SPROUT']];
    const c = canvas(700, 80 + 2 * (cell + 30)), x = c.getContext('2d'), R = game.renderer, pass = ART_PASS.on;
    x.fillStyle = BG; x.fillRect(0, 0, c.width, c.height);
    say(x, title, 20, 34, 24, INK, 700);
    for (let r = 0; r < 2; r++) {
      ART_PASS.on = r === 1; await settle();
      const y0 = 70 + r * (cell + 30);
      say(x, r ? 'ART PASS' : 'AS PACKED', 20, y0 + 20, 16, r ? '#ffe08a' : INK, 700);
      rows.forEach(([kind, o, label], i) => {
        const X = 180 + i * 250; floor(x, LEVELS[2], X, y0, 3, 2, 2.2);
        const ctx0 = R.ctx; R.ctx = x; x.save(); x.translate(X + TILE * 3.3, y0 + TILE * 1.4); x.scale(k * 0.75, k * 0.75);
        R.drawProp(new Prop(0, 0, kind, o)); x.restore(); R.ctx = ctx0;
        say(x, label, X, y0 + 2 * TILE * 2.2 + 16, 12, ASH);
      });
    }
    ART_PASS.on = pass;
    return c;
  }

  // A scene for `pair`: level `li` (as LEVELS picks it), the goat in the middle of room `ri` (moved
  // `ox`, `oy` tiles), the men round him cleared away and `cast` stood there instead — `{ kind, dx,
  // dy, state }`, `state: 'windup'` for a blow or a run under way — and everything frozen. Needs the
  // harness (`H`).
  async function stage(li, ri, cast, o = {}) {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    H.unfreeze();
    game.startAtLevel(li, !!o.trip, !!o.dark);
    for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'card') game.stateTimer = 0; if (game.state === 'intro') game.skipIntro(true); await wait(150); }
    const r = game.level.rooms[Math.min(ri, game.level.rooms.length - 1)];
    game.cageOpen = true;
    const cx = (r.x + r.w / 2 + (o.ox || 0)) * TILE, cy = (r.y + r.h / 2 + (o.oy || 0)) * TILE;
    H.tp(cx, cy); await wait(500);
    for (const e of game.enemies) if (Math.hypot(e.x - cx, e.y - cy) < 10 * TILE) e.dead = true;
    game.enemies = game.enemies.filter((e) => !e.dead);
    const made = cast.map((c) => { const e = new Enemy(cx + c.dx * TILE, cy + c.dy * TILE, c.kind); e.woke = true; e.aware = true; e.room = r.index; game.enemies.push(e); return [e, c]; });
    for (const p of o.props || []) game.props.push(new Prop(cx + p.dx * TILE, cy + p.dy * TILE, p.kind, p.o || {}));
    H.freeze();
    for (const [e, c] of made) {
      e.facing = c.face !== undefined ? c.face : Math.atan2(game.goat.y - e.y, game.goat.x - e.x);
      if (c.state === 'windup') {
        e.state = 'windup'; e.timer = ((TUNING[c.kind] && TUNING[c.kind].windup) || 0.5) * 0.4;
        if (c.kind === 'dog') e.dashPath = e.planDash(game, e.x, e.y, e.facing, 0.8, 0);
      }
    }
    game.goat.facing = o.goatFacing || 0;
    if (game.revealRooms) game.revealRooms();
    await wait(600);
    return { level: game.level.def.name, role: r.role };
  }

  // The frame on screen twice, side by side: everything as packed, then under `after` (the art pass
  // and the studies it names). The scene should be frozen (`H.freeze()`) so the two are one moment.
  async function pair(name, after = { on: true, hunter: 7, clubman: 1, floors: true }, note = '', before = { on: false, hunter: 0, clubman: 0, floors: false }) {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const grab = () => { const c = canvas(game.canvas.width, game.canvas.height); c.getContext('2d').drawImage(game.canvas, 0, 0); return c; };
    const was = { on: ART_PASS.on, hunter: ART_PASS.hunter, clubman: ART_PASS.clubman, floors: ART_PASS.floors };
    const setTo = (s) => { ART_PASS.set(s.on); ART_PASS.hunter = s.hunter; ART_PASS.clubman = s.clubman; ART_PASS.floors = s.floors !== false; if (game.world && game.world.caveDirty) game.world.caveDirty(); };
    // the cave's rock is rebaked a few chunks a frame, so each side is given time to finish
    setTo(before); await wait(1800); const A = grab();
    setTo(after); await wait(1800); const B = grab();
    setTo(was);
    // The middle of the screen at one to one, where the goat and the men round him are.
    const cw = Math.round(A.width * 0.5), ch = Math.round(A.height * 0.55), sx = Math.round((A.width - cw) / 2), sy = Math.round((A.height - ch) / 2);
    const w = cw, h = ch, c = canvas(w * 2 + 30, h + 70), x = c.getContext('2d');
    x.fillStyle = BG; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(A, sx, sy, cw, ch, 10, 60, w, h); x.drawImage(B, sx, sy, cw, ch, w + 20, 60, w, h);
    // only what differs between the two sides is named
    const tag = (s) => [before.on !== after.on && (s.on ? 'art pass' : 'no art pass'), before.floors !== after.floors && (s.floors !== false ? 'floor sheets' : 'packed floors'),
      before.hunter !== after.hunter && 'hunter ' + PIXEL_STUDY.hunter[s.hunter].name, before.clubman !== after.clubman && 'clubman ' + PIXEL_STUDY.clubman[s.clubman].name].filter(Boolean).join(' · ');
    // sized to fit its own half, however many differences it names
    const fit = (str, maxW, px) => { x.font = `700 ${px}px ${FONT}`; while (px > 10 && x.measureText(str).width > maxW) { px--; x.font = `700 ${px}px ${FONT}`; } return px; };
    const L = 'BEFORE — ' + tag(before), Rt = 'AFTER — ' + tag(after);
    say(x, L, 10, 30, fit(L, w - 10, 20), INK, 700);
    say(x, Rt, w + 20, 30, fit(Rt, w - 10, 20), '#ffe08a', 700);
    if (note) say(x, note, 10, 50, 13, ASH);
    return post(c, name);
  }

  async function all(dir) {
    const out = [];
    const save = async (cv, n) => out.push(await post(cv, (dir ? dir + '-' : '') + n));
    await save(await onFloors('hunter', 'clubman', 'THE HUNTER — his colour studies on every floor (a clubman beside him, as packed)'), 'hunter-floors');
    await save(await facings('hunter', 'THE HUNTER — the studies, all eight facings'), 'hunter-facings');
    await save(await onFloors('clubman', 'hunter', 'THE CLUBMAN — slim and red studies on every floor (a hunter beside him, as packed)'), 'clubman-floors');
    await save(await facings('clubman', 'THE CLUBMAN — the studies, all eight facings'), 'clubman-facings');
    await save(await facings('mage', 'THE SEER — his staff as packed, and in witchfire\'s own colours (art pass)'), 'seer-facings');
    await save(await props('THE MILK GRASS — as packed and under the art pass'), 'milk-grass');
    return out;
  }
  return { onFloors, facings, props, stage, pair, all, ratio, dE, mean, post };
})();
