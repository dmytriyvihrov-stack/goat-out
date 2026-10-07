// THE WHITE SOULS, and the goat's own (1 Oct 2026, playtest).
//
// "When an ordinary man dies a soul rises over him, a small white dot, and when you leave the room
// those souls fly after you on their own, the way Enter the Gungeon's do." They are heaven's pay
// (`Heaven.earn`), seen: nothing is counted until one reaches him, and one still hanging in the room he
// died in is lost with him. None before the god has given him the gift of gathering them
// (`Heaven.gifted`, his first talk).
//
// And his own: dead, his soul goes up out of the body in a beam (`drawAscent`); with SECOND CHANCE
// bought in heaven it goes up and comes back down into him once a floor (`second`, `updateRevive`).
//
// Render-side and bookkeeping only: a mote never touches collision, noise or the AI.
// A white soul in cells (`Motes.draw`), top row first: `o` the pale rim, `w` white, `e` an eye.
const WISP = ['..o..', '..wo.', '.owwo', 'owwwo', 'oeweo', 'owwwo', '.owo.'];
const Motes = {
  // ---------------------------------------------------------------- the white souls
  // A man down: a soul over his body, belonging to the room he fell in.
  // Before the god's gift (or where nothing is paid: THE SHOWROOM, GOD) it still rises, as a sign he is
  // dead and not floored (2 Oct 2026 playtest), and goes out over him (`ghost`): nothing comes to the goat.
  spawn(game, e) {
    if (e.scripted || !game.level || game.level.def.heaven) return;
    const ghost = !Heaven.gifted() || game.showroomOn || (game.dev && game.dev.god);
    const L = game.level, r = roomAt(L, e.x, e.y), room = r ? r.index : game.nearestRoomIdx(e.x, e.y, game.goatRoom || 0);
    if (!game.motes) game.motes = [];
    const M = TUNING.heaven.motes, k = this.count(e);
    for (let i = 0; i < k; i++) {
      const n = game.motes.length, ox = e.x + (i - (k - 1) / 2) * M.spread, oy = e.y - (i % 2) * M.spread * 0.4;
      game.motes.push({ x: ox, y: oy, ox, oy, room, ghost, t: -M.delay - (n % 4) * M.stagger, fly: false, vx: 0, vy: 0, sp: 0, ph: Math.random() * 6.28, trail: [] });
    }
  },
  // How many souls a man leaves (`motes.per`): one, two for the big men, three for an ogre, and one more
  // for a boss (a champion or a soul-bearer).
  count(e) {
    const P = TUNING.heaven.motes.per;
    const kind = e.kind === 'bearer' ? (e.thrower ? 'thrower' : e.shieldman ? 'shield' : e.champion ? 'champion' : 'bearer') : e.kind;
    return (P[kind] || 1) + (e.boss ? P.boss : 0);
  },
  // Out of the body a beat after he dies (`delay`), it rises slowly (`riseT`) and hangs there; after `wait` s
  // it comes once the goat has left its room or stands right by it (`near` tiles) (2 Oct 2026 playtest: it
  // flew in the moment a man went down, "too fast").
  update(game, dt) {
    const list = game.motes; if (!list || !list.length) return;
    const M = TUNING.heaven.motes, g = game.goat, L = game.level;
    const here = roomAt(L, g.x, g.y), gi = here ? here.index : -1;
    for (const m of list) {
      m.t += dt;
      if (m.ghost) { if (m.t > M.ghostFor) m.done = true; }
      if (!m.fly) {
        // risen over the body, breathing
        const k = clamp(m.t / M.riseT, 0, 1), e = 1 - Math.pow(1 - k, 3);
        m.x = m.ox + Math.sin(m.t * M.bobRate * 0.5 + m.ph * 1.7) * M.sway * k; m.y = m.oy - M.rise * e - Math.sin(m.t * M.bobRate + m.ph) * M.bob * k;
        // Out of their room, or walked up to (2 Oct 2026 playtest: "it should also fly to you when you just come up to it").
        if (!m.ghost && m.t > M.wait && (gi !== m.room || hyp(g.x - m.ox, g.y - m.oy) < M.near * TILE) && !g.dead) { m.fly = true; m.vx = 0; m.vy = -M.speed * 0.6; m.sp = M.speed; }
        continue;
      }
      // homing, faster the longer it flies, with a little curl so a flock does not arrive as a line
      const tx = g.x, ty = g.y - 14, dx = tx - m.x, dy = ty - m.y, d = hyp(dx, dy) || 1;
      m.sp = Math.min(M.max, m.sp + M.accel * dt);
      const curl = Math.sin(m.t * 5 + m.ph) * 0.35;
      const ax = dx / d * Math.cos(curl) - dy / d * Math.sin(curl), ay = dy / d * Math.cos(curl) + dx / d * Math.sin(curl);
      const turn = Math.min(1, dt * 7);
      m.vx += (ax * m.sp - m.vx) * turn; m.vy += (ay * m.sp - m.vy) * turn;
      m.trail.push(m.x, m.y); if (m.trail.length > 8) m.trail.splice(0, 2);
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (d < M.catchR || hyp(tx - m.x, ty - m.y) < M.catchR) { m.done = true; this.bank(game, m); }
    }
    game.motes = list.filter((m) => !m.done);
  },
  // One reaches him: counted into the heap, a tick of light and a note that climbs with a quick run of them.
  bank(game, m) {
    const before = Heaven.meta ? Heaven.meta.brought || 0 : 0;
    Heaven.earn(game, TUNING.heaven.pay.kill);
    // The floor's own count of souls gathered: kills and souls are two different numbers (7 Oct 2026 playtest), and
    // the clear card and the death card show both (`Painting.drawTally`, `drawDeath`).
    if (Heaven.gifted() && !game.showroomOn && !(game.dev && game.dev.god)) game.floorSouls = (game.floorSouls || 0) + TUNING.heaven.pay.kill;
    game.purseFlash = 0.35;
    const now = game.timer || 0;
    game.moteRun = now - (game.moteAt || -9) < 0.6 ? (game.moteRun || 0) + 1 : 0; game.moteAt = now;
    if (!game.moteSfx || now - game.moteSfx > 0.05) {
      game.moteSfx = now;
      const bells = TUNING.heaven.bells;
      game.audio.sfxChime(bells[Math.min(bells.length - 1, 3 + game.moteRun % 5)] * 2, 0.22);
    }
    game.particles(game.goat.x, game.goat.y - 14, 3, '#ffffff', 60);
    const G = TUNING.heaven.gift, after = Heaven.meta ? Heaven.meta.brought || 0 : 0;
    for (const [q, say] of [[G.mend, 'THE GOD HAS HIS TWENTY'], [G.quest, 'THE GOD HAS HIS TWO HUNDRED']]) {
      if (before >= q || after < q) continue;
      game.floatText(game.goat.x, game.goat.y - 50, say, '#fff4c2');
      game.ring(game.goat.x, game.goat.y, 2.4 * TILE, '#fff4c2');
    }
  },
  // The floor is done: whatever is still hanging is his.
  flush(game) {
    if (!game.motes) return;
    for (const m of game.motes) if (!m.ghost) this.bank(game, m);
    game.motes = [];
  },

  // In world space, over everything standing: a white cell with a fainter one round it, and a short
  // dotted tail when it flies. Cells on the world grid, never a smooth dot (the game is pixels).
  draw(R, game) {
    const list = game.motes; if (!list || !list.length) return;
    const ctx = R.ctx, C = TUNING.heaven.motes.cell, t = R.t;
    // Dead, the ones in his room go out with him.
    const fade = game.state === 'dead' && game.deathCam ? clamp(1 - game.deathCam.t / 0.8, 0, 1) : 1;
    if (fade <= 0) return;
    const cell = (x, y, n, c, a) => { ctx.globalAlpha = a * fade; ctx.fillStyle = c; ctx.fillRect(Math.round(x / C) * C - n * C / 2, Math.round(y / C) * C - n * C / 2, n * C, n * C); };
    for (const m of list) {
      if (game.hidden(m.ox, m.oy) && !m.fly) continue;
      // Still (2 Oct 2026 playtest: "don't animate the soul, it should draw less attention"): no twinkle,
      // no licking tip, a fainter halo; only the flight moves it.
      const tw = 1, A = TUNING.heaven.motes.alpha;
      if (m.fly) for (let i = 0; i < m.trail.length; i += 2) cell(m.trail[i], m.trail[i + 1], 1, '#e8f0ff', 0.25 + 0.4 * i / m.trail.length);
      if (m.t < 0) continue;
      const born = clamp(m.t / 0.3, 0, 1) * (m.ghost ? clamp((TUNING.heaven.motes.ghostFor - m.t) / 0.6, 0, 1) : 1);
      cell(m.x, m.y, 7, '#dfe9ff', 0.05 * born * A);
      // A little wisp, not one white pixel (2 Oct 2026 playtest): a flame of cells, its tip licking
      // side to side, pale rim, white heart and two dark eyes, so it reads as a soul at a glance.
      const lick = 0;
      for (let r = 0; r < WISP.length; r++) for (let c = 0; c < WISP[r].length; c++) {
        const k = WISP[r][c]; if (k === '.') continue;
        const x = m.x + (c - 2 + (r < 2 ? lick : 0)) * C, y = m.y + (r - 4) * C;
        cell(x, y, 1, k === 'o' ? '#b9cdf5' : k === 'e' ? '#2a2440' : '#ffffff', (k === 'o' ? 0.75 * tw : 0.95) * born * A);
      }
    }
    ctx.globalAlpha = 1;
  },

  // ---------------------------------------------------------------- his own soul
  // The goat as a ghost: his own drawing (`PaintedArt.drawGoat`, horns and all) washed pale, baked once
  // per facing and look. `S` world px square, the foot at `foot` of it.
  S: 72, foot: 0.72, K: 4,
  ghost(R, game, facing) {
    const f = ((Math.round(facing / (Math.PI / 4)) % 8) + 8) % 8, m = game.mods || {};
    const key = f + '|' + ['antlers', 'bomb', 'splash', 'screamStun', 'breath', 'spit', 'oracle'].map((k) => (m[k] ? 1 : 0)).join('');
    const C = this.ghosts || (this.ghosts = new Map());
    if (C.has(key)) return C.get(key);
    const K = this.K, S = this.S, c = document.createElement('canvas'); c.width = c.height = S * K;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.translate(S * K / 2, S * K * this.foot); x.scale(K, K);
    const g = { x: 0, y: 0, facing: f * Math.PI / 4, vx: 0, vy: 0, state: 'idle', trail: [], hp: 1, maxHp: 1, invuln: 0, dazed: 0, jitter: null, sqLeft: 0 };
    const stub = { mods: Object.assign({}, m), artifacts: [], cape: null, goat: g, stairFx: null, intro: null, touch: { active: false }, state: 'ghost' };
    const painter = this.painter || (this.painter = Object.assign(Object.create(R.painted), { fx: [] }));
    const old = R.ctx, shade = R.shadow, t = R.t;
    R.ctx = x; R.shadow = () => {}; R.t = 0;
    try { painter.drawGoat(R, g, stub); } catch (err) { console.error(err); } finally { R.ctx = old; R.shadow = shade; R.t = t; }
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(236,244,255,0.86)'; x.fillRect(0, 0, S * K, S * K);
    C.set(key, c);
    return c;
  },
  // A column of pale light down onto (x, y), in three hard bands, `a` its strength.
  beam(R, x, y, a, w) {
    const ctx = R.ctx, P = TUNING.effects.pixel, top = y - 520;
    for (const [f, al] of [[1, 0.1], [0.62, 0.14], [0.3, 0.2]]) {
      const hw = Math.round(w * f / 2 / P) * P;
      ctx.globalAlpha = al * a; ctx.fillStyle = '#f4f8ff';
      ctx.fillRect(Math.round(x / P) * P - hw, top, hw * 2, y - top + 4);
    }
    // where it meets the floor
    ctx.globalAlpha = 0.22 * a; ctx.fillRect(Math.round(x / P) * P - w * 0.9, y - 2, w * 1.8, 6);
    ctx.globalAlpha = 1;
  },
  // The ghost at (x, y) lifted `lift` px, `a` alpha, `k` scale; specks of light coming off it.
  drawGhost(R, game, x, y, lift, a, k, t) {
    const ctx = R.ctx, img = this.ghost(R, game, game.goat ? game.goat.facing : 0), S = this.S * k;
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = a;
    ctx.drawImage(img, Math.round(x - S / 2), Math.round(y - lift - S * this.foot), Math.round(S), Math.round(S));
    ctx.imageSmoothingEnabled = sm;
    const P = TUNING.effects.pixel;
    for (let i = 0; i < 7; i++) {
      const h = (i * 0.137 + t * 0.6) % 1, sx = x + Math.sin(i * 2.3 + t * 3) * 10 * k, sy = y - lift - 6 - h * 40;
      ctx.globalAlpha = a * (1 - h) * 0.8; ctx.fillStyle = i % 2 ? '#ffffff' : '#dfe9ff';
      ctx.fillRect(Math.round(sx / P) * P, Math.round(sy / P) * P, P, P);
    }
    ctx.globalAlpha = 1;
  },
  // Dead: the soul goes up out of him (`heaven.ascent`), under the death card's pull-back.
  drawAscent(R, game) {
    if (game.state !== 'dead' || !game.deathCam || game.showroomOn || !game.goat) return;
    const A = TUNING.heaven.ascent, t = game.deathCam.t - A.lift; if (t <= 0) return;
    const k = clamp(t / A.time, 0, 1), g = game.goat;
    const beamA = Math.min(1, t / 0.35) * (1 - clamp((k - 0.75) / 0.25, 0, 1));
    this.beam(R, g.x, g.y, beamA, A.beam);
    // slow off the body, then away: an ease-in, swaying as it goes
    const lift = A.rise * k * k + 6 * Math.min(1, t / 0.3), sway = Math.sin(t * 3.2) * A.sway * k;
    this.drawGhost(R, game, g.x + sway, g.y, lift, 0.8 * Math.min(1, t / 0.3) * (1 - k * k), 1 - 0.25 * k, t);
  },

  // ---------------------------------------------------------------- SECOND CHANCE
  // Asked from `Goat.damage` as the last heart goes (after SCAPEGOAT, which is the talisman's own
  // and spends itself first): true if this death is put off.
  // ONE MORE LIFE (`heaven.extraLife`, `game.extraLives`) goes the same way, after SECOND CHANCE if both are there.
  second(game, g) {
    const n = game.mods && game.mods.secondChance, life = (game.extraLives | 0) > 0;
    if ((!n || game.secondUsed) && !life) return false;
    if (game.revive || game.showroomOn || !game.level || game.level.def.heaven) return false;
    const extra = !n || game.secondUsed;
    if (extra) game.extraLives--; else game.secondUsed = true;
    if (g.holding) { g.holding.held = false; if (!g.holding.item) g.holding.state = 'idle'; g.holding = null; }
    g.hp = 0; g.vx = g.vy = 0; g.state = 'ko'; g.timer = 0;
    game.revive = { t: 0, x: g.x, y: g.y, extra };
    // HELLDIVE (a mirror rank): the beam lifts him out of the picture and the god throws him back down (`updateDive`).
    if (game.mods.helldive) Object.assign(game.revive, { dive: game.mods.helldive, phase: 'up', pt: 0, mx: g.x, my: g.y, vx: 0, vy: 0 });
    game.world.splat(g.x, g.y, 0, 0, 12);
    game.hitstop(0.12); game.shake(8, true); game.flash('#f4f8ff', 0.35);
    game.audio.sfxToll(); game.audio.sfxAscend();
    return true;
  },
  // While it plays the floor waits (`Game.update`): up out of him, a beat, and back down into him.
  updateRevive(game, dt) {
    const V = game.revive, S = TUNING.heaven.second, g = game.goat;
    if (V.dive) { this.updateDive(game, dt); return; }
    V.t += dt;
    game.updateEffects(dt); game.updateCamera(dt);
    g.vx = g.vy = 0; g.state = 'ko';
    if (V.t < S.time) return;
    this.stand(game, V);
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted || e.scripted) continue;
      const dx = e.x - g.x, dy = e.y - g.y, d = hyp(dx, dy) || 1;
      if (d > S.push * TILE) continue;
      const was = e.aware;
      e.fling(dx / d * S.fling * TILE * e.knockMul(), dy / d * S.fling * TILE * e.knockMul(), false); e.aware = was;
      e.daze(game, S.daze);
    }
    game.ring(g.x, g.y, S.push * TILE, '#f4f8ff'); game.particles(g.x, g.y - 10, 30, '#ffffff', 220);
    game.flash('#f4f8ff', 0.45); game.zoomPunch(1.1); game.shake(6);
    game.floatText(g.x, g.y - 44, 'NOT YET', '#fff4c2');
    game.audio.sfxBell(); game.audio.sfxBleat(420, 0.2, 0.5);
    game.saveRun();
  },
  // Up again, either way he came back: the mirror's rank says how many hearts, and its card quotes it; the extra life
  // a share of his most.
  stand(game, V) {
    const S = TUNING.heaven.second, g = game.goat;
    game.revive = null;
    g.hp = Math.min(g.maxHp, V.extra ? Math.max(1, Math.ceil(g.maxHp * TUNING.heaven.extraLife.hearts)) : game.mods.secondChance || S.hearts);
    g.state = 'idle'; g.timer = 0; g.invuln = S.invuln; g.dazed = 0; g.vx = g.vy = 0;
  },

  // ---------------------------------------------------------------- HELLDIVE
  // `up`: the beam takes him out of the picture. `aim`: the world waits while a mark on the floor is pushed by the
  // stick, heavy and slow to answer (Helldivers' pod: you steer it, you never place it), the camera on it (he is put
  // where it is). `fall`: he comes down on it like a shell. `TUNING.heaven.dive`.
  updateDive(game, dt) {
    const V = game.revive, D = TUNING.heaven.dive, g = game.goat;
    V.t += dt; V.pt += dt;
    game.updateEffects(dt); game.updateCamera(dt);
    g.vx = g.vy = 0; g.state = 'ko';
    // the picture goes with the mark: a room held by the camera would otherwise leave it at the edge of the screen
    if (V.phase !== 'up') { const ck = Math.min(1, dt * 4); game.cam.x += (V.mx - game.cam.x) * ck; game.cam.y += (V.my - game.cam.y) * ck; }
    if (V.phase === 'up') {
      if (V.pt >= D.up) { V.phase = 'aim'; V.pt = 0; game.floatText(V.x, V.y - 40, 'STEER YOUR FALL', '#f7d774'); game.audio.sfxSwing(); }
      return;
    }
    if (V.phase === 'aim') {
      const ix = game.input.mx || 0, iy = game.input.my || 0, n = hyp(ix, iy);
      if (n > 0.1) { const a = D.accel * TILE * dt / Math.max(1, n); V.vx += ix * a; V.vy += iy * a; }
      const damp = Math.exp(-D.drag * dt), top = D.speed * TILE; V.vx *= damp; V.vy *= damp;
      const sp = hyp(V.vx, V.vy); if (sp > top) { V.vx *= top / sp; V.vy *= top / sp; }
      // an axis at a time, so the mark slides along stone instead of sticking to it
      this.diveStep(game, V, V.vx * dt, 0); this.diveStep(game, V, 0, V.vy * dt);
      g.x = V.mx; g.y = V.my;
      // his sight goes with the mark, so where he will land is lit (a few times a second: the floor is held)
      if ((V.visT = (V.visT || 0) - dt) <= 0) { V.visT = 0.1; game.world.computeVis(V.mx, V.my, TUNING.fog.radius, game.mods.oracle ? TUNING.fog.oracle : 0); }
      if (V.pt >= D.aim) { V.phase = 'fall'; V.pt = 0; game.audio.sfxLeap(); }
      return;
    }
    // falling: light and sparks shed off him where he has been
    const k = clamp(V.pt / D.fall, 0, 1), hy = (1 - k) * D.height * 1.3 / TILT;
    game.particles(g.x + (Math.random() - 0.5) * 10, g.y - hy, 2, Math.random() < 0.5 ? '#fff4c2' : '#f2a233', 60);
    if (V.pt >= D.fall) this.diveLand(game);
  },
  // One step of the mark: refused onto stone, a drop, past `reach` of where he fell, or through a shut door (a little
  // bounce back, so pushing into a wall reads as a wall).
  diveStep(game, V, dx, dy) {
    if (!dx && !dy) return;
    const D = TUNING.heaven.dive, nx = V.mx + dx, ny = V.my + dy, m = 10, ex = nx + Math.sign(dx) * m, ey = ny + Math.sign(dy) * m;
    const ok = (x, y) => game.world.walkableAt(Math.floor(x / TILE), Math.floor(y / TILE));
    const sameTile = Math.floor(ex / TILE) === Math.floor(V.mx / TILE) && Math.floor(ey / TILE) === Math.floor(V.my / TILE);
    if (ok(nx, ny) && ok(ex, ey) && hyp(nx - V.x, ny - V.y) <= D.reach * TILE && (sameTile || game.sees(V.mx, V.my, ex, ey))) { V.mx = nx; V.my = ny; return; }
    if (dx) V.vx *= -0.25;
    if (dy) V.vy *= -0.25;
  },
  // Who the landing reaches, for the mark's picture and the landing alike: `hurt` the men under it, `stun` the rest
  // within the ring (or, on rank two, in the room it lands in).
  diveTargets(game, x, y, rank) {
    const D = TUNING.heaven.dive, i = clamp(rank, 1, D.hurt.length) - 1, L = game.level;
    const hurtR = D.hurt[i] * TILE, stunR = D.stun[i] * TILE, here = roomAt(L, x, y), ri = here ? here.index : -2;
    const hurt = [], stun = [];
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted || e.scripted || e.disguise) continue;
      const d = hyp(e.x - x, e.y - y), r = roomAt(L, e.x, e.y);
      if (d <= hurtR + (e.r || 0)) hurt.push(e);
      else if (d <= stunR || (D.room[i] && r && r.index === ri)) stun.push(e);
    }
    return { hurt, stun, hurtR, stunR };
  },
  diveLand(game) {
    const V = game.revive, D = TUNING.heaven.dive, S = TUNING.heaven.second, g = game.goat;
    const T = this.diveTargets(game, g.x, g.y, V.dive);
    this.stand(game, V);
    for (const e of T.hurt) {
      const dx = e.x - g.x, dy = e.y - g.y, d = hyp(dx, dy) || 1;
      e.die(game, 'splat', dx / d, dy / d, 'dive');
      // a man with a heart to spare is thrown out of the crater (under what stone kills at) and lies there dazed
      if (!e.dead) { e.fling(dx / d * S.fling * TILE * e.knockMul(), dy / d * S.fling * TILE * e.knockMul(), false); e.daze(game, D.daze); }
    }
    for (const e of T.stun) { e.daze(game, D.daze); game.particles(e.x, e.y - 18, 4, '#f7d774', 60); }
    game.world.scorch(g.x, g.y, TILE * 0.9, false);
    game.ring(g.x, g.y, T.stunR, '#f7d774', 0.7, 3); game.ring(g.x, g.y, Math.max(T.hurtR, TILE), '#fff4c2', 0.45, 5);
    game.dust(g.x, g.y, TUNING.juice.dust.land + 10, 0, 0); game.particles(g.x, g.y - 6, 40, '#fff4c2', 260);
    game.squashGoat(TUNING.juice.squash.land * 2.4);
    game.flash('#fff4c2', 0.5); game.zoomPunch(1.4); game.thud(g.x, g.y, 12); game.hitstop(0.09);
    game.floatText(g.x, g.y - 44, 'NOT YET', '#fff4c2');
    game.audio.sfxBoom(); game.audio.sfxBell(); game.audio.sfxBleat(420, 0.2, 0.5);
    game.saveRun();
  },
  // How he looks through it (`PaintedArt.drawGoat`, beside `Heaven.goatLook`): lifted limp out of the picture, gone
  // while the mark is steered, then down head first, stretched long by the speed.
  diveLook(game) {
    const V = game.revive, D = TUNING.heaven.dive; if (!V || !V.dive) return null;
    if (V.phase === 'up') { const k = clamp(V.pt / D.up, 0, 1), e = k * k; return { dy: -e * D.height, s: 1 - 0.3 * e, a: 1 - clamp((k - 0.55) / 0.45, 0, 1), spin: Math.sin(V.pt * 9) * 0.15 * k }; }
    if (V.phase === 'aim') return { dy: -D.height, s: 0.5, a: 0, spin: 0 };
    const k = clamp(V.pt / D.fall, 0, 1);
    return { dy: -(1 - k) * D.height * 1.3, s: 1, a: 1, spin: -0.9, sy: 1 + 0.9 * (1 - k * 0.5) };
  },
  // His shadow: going as he rises, none while he is up there, growing fast as he comes down.
  diveShadow(game) {
    const V = game.revive, D = TUNING.heaven.dive; if (!V || !V.dive) return 1;
    if (V.phase === 'up') return 1 - clamp(V.pt / D.up, 0, 1);
    if (V.phase === 'aim') return 0;
    const k = clamp(V.pt / D.fall, 0, 1); return 0.3 + 0.7 * k * k;
  },
  // The beam taking him up, then the mark in cells: a disc where it hurts, a ring where it stuns, a ring closing in
  // as the god's patience runs out, a mark over every man it will reach (amber dazed, red hurt), and the shaft he
  // comes down in.
  drawDive(R, game) {
    const V = game.revive, D = TUNING.heaven.dive, ctx = R.ctx, P = D.cell, t = R.t;
    if (V.phase === 'up') { this.beam(R, V.x, V.y, Math.min(1, V.pt / 0.2) * (1 - clamp((V.pt / D.up - 0.7) / 0.3, 0, 1)), TUNING.heaven.ascent.beam * 1.6); return; }
    const x = V.mx, y = V.my, T = this.diveTargets(game, x, y, V.dive);
    const k = V.phase === 'aim' ? clamp(V.pt / D.aim, 0, 1) : 1, pulse = 0.5 + 0.5 * Math.sin(t * 10), hr = Math.max(T.hurtR, P * 3);
    if (V.phase === 'fall') this.beam(R, x, y, 0.8, TUNING.heaven.ascent.beam);
    ctx.fillStyle = `rgba(242,170,48,${0.18 + 0.12 * pulse})`; ctx.beginPath(); R.floorRing(x, y, hr, 0, P); ctx.fill();
    ctx.fillStyle = `rgba(255,224,138,${0.55 + 0.3 * pulse})`; ctx.beginPath(); R.floorRing(x, y, hr, hr - P, P); ctx.fill();
    // (on SUPER HELLDIVE the whole room is dazed: the marks over the men say so, a ring would lie)
    if (!D.room[clamp(V.dive, 1, D.room.length) - 1]) { ctx.fillStyle = 'rgba(247,215,116,0.4)'; ctx.beginPath(); R.floorRing(x, y, T.stunR, T.stunR - P, P); ctx.fill(); }
    // the closing ring: from twice the stun ring down onto the mark
    const cr = Math.max(P * 2, T.stunR * 2 * (1 - k) + hr * k);
    ctx.fillStyle = `rgba(255,244,194,${0.35 + 0.5 * k})`; ctx.beginPath(); R.floorRing(x, y, cr, cr - P, P); ctx.fill();
    // a cross at its heart
    const cx = Math.round(x / P) * P, cy = Math.round(y / P) * P;
    ctx.fillStyle = '#fff4c2'; ctx.fillRect(cx - P * 3, cy, P * 7, P); ctx.fillRect(cx, cy - P * 3, P, P * 7);
    for (const [list, c] of [[T.stun, '#f7d774'], [T.hurt, '#e2483a']]) {
      ctx.fillStyle = c;
      for (const e of list) { if (game.hidden(e.x, e.y)) continue; const ex = Math.round(e.x / P) * P, ey = Math.round((e.y - 34 - 2 * pulse) / P) * P; ctx.fillRect(ex - P, ey, P * 3, P); ctx.fillRect(ex, ey + P, P, P); }
    }
    ctx.globalAlpha = 1;
  },
  // Up to a height, held there a beat, then down into him faster than it left.
  drawRevive(R, game) {
    const V = game.revive; if (!V) return;
    if (V.dive) { this.drawDive(R, game); return; }
    const S = TUNING.heaven.second, k = clamp(V.t / S.time, 0, 1);
    const up = k < 0.5 ? 1 - Math.pow(1 - k / 0.5, 3) : k < 0.72 ? 1 : 1 - Math.pow((k - 0.72) / 0.28, 2);
    this.beam(R, V.x, V.y, Math.min(1, V.t / 0.3) * (k < 0.9 ? 1 : (1 - k) / 0.1), TUNING.heaven.ascent.beam);
    this.drawGhost(R, game, V.x, V.y, 44 * up, 0.75, 1, V.t);
  },
};
