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
const Motes = {
  // ---------------------------------------------------------------- the white souls
  // A man down: a soul over his body, belonging to the room he fell in.
  spawn(game, e) {
    if (!Heaven.gifted() || game.showroomOn || (game.dev && game.dev.god) || e.scripted || !game.level || game.level.def.heaven) return;
    const L = game.level, r = roomAt(L, e.x, e.y), room = r ? r.index : game.nearestRoomIdx(e.x, e.y, game.goatRoom || 0);
    if (!game.motes) game.motes = [];
    const n = game.motes.length;
    game.motes.push({ x: e.x, y: e.y, ox: e.x, oy: e.y, room, t: -(n % 4) * TUNING.heaven.motes.stagger, fly: false, vx: 0, vy: 0, sp: 0, ph: Math.random() * 6.28, trail: [] });
  },
  // They wait over the body until he is out of their room (or the floor is cleared), then come.
  update(game, dt) {
    const list = game.motes; if (!list || !list.length) return;
    const M = TUNING.heaven.motes, g = game.goat, L = game.level;
    const here = roomAt(L, g.x, g.y), gi = here ? here.index : -1;
    for (const m of list) {
      m.t += dt;
      if (!m.fly) {
        // risen over the body, breathing
        const k = clamp(m.t / M.riseT, 0, 1), e = 1 - Math.pow(1 - k, 3);
        m.x = m.ox; m.y = m.oy - M.rise * e - Math.sin(m.t * 2.4 + m.ph) * M.bob * k;
        if (m.t > M.wait && gi !== m.room && !g.dead) { m.fly = true; m.vx = 0; m.vy = -M.speed * 0.6; m.sp = M.speed; }
        continue;
      }
      // homing, faster the longer it flies, with a little curl so a flock does not arrive as a line
      const tx = g.x, ty = g.y - 14, dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy) || 1;
      m.sp = Math.min(M.max, m.sp + M.accel * dt);
      const curl = Math.sin(m.t * 5 + m.ph) * 0.35;
      const ax = dx / d * Math.cos(curl) - dy / d * Math.sin(curl), ay = dy / d * Math.cos(curl) + dx / d * Math.sin(curl);
      const turn = Math.min(1, dt * 7);
      m.vx += (ax * m.sp - m.vx) * turn; m.vy += (ay * m.sp - m.vy) * turn;
      m.trail.push(m.x, m.y); if (m.trail.length > 8) m.trail.splice(0, 2);
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (d < M.catchR || Math.hypot(tx - m.x, ty - m.y) < M.catchR) { m.done = true; this.bank(game, m); }
    }
    game.motes = list.filter((m) => !m.done);
  },
  // One reaches him: counted into the heap, a tick of light and a note that climbs with a quick run of them.
  bank(game, m) {
    const before = Heaven.meta ? Heaven.meta.brought || 0 : 0;
    Heaven.earn(game, TUNING.heaven.pay.kill);
    game.purseFlash = 0.35;
    const now = game.timer || 0;
    game.moteRun = now - (game.moteAt || -9) < 0.6 ? (game.moteRun || 0) + 1 : 0; game.moteAt = now;
    if (!game.moteSfx || now - game.moteSfx > 0.05) {
      game.moteSfx = now;
      const bells = TUNING.heaven.bells;
      game.audio.sfxChime(bells[Math.min(bells.length - 1, 3 + game.moteRun % 5)] * 2, 0.22);
    }
    game.particles(game.goat.x, game.goat.y - 14, 3, '#ffffff', 60);
    const q = TUNING.heaven.gift.quest, after = Heaven.meta ? Heaven.meta.brought || 0 : 0;
    if (before < q && after >= q) {
      game.floatText(game.goat.x, game.goat.y - 50, 'THE GOD HAS HIS TWO HUNDRED', '#fff4c2');
      game.ring(game.goat.x, game.goat.y, 2.4 * TILE, '#fff4c2');
    }
  },
  // The floor is done: whatever is still hanging is his.
  flush(game) {
    if (!game.motes) return;
    for (const m of game.motes) this.bank(game, m);
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
      const tw = 0.75 + 0.25 * Math.sin(t * 7 + m.ph);
      if (m.fly) for (let i = 0; i < m.trail.length; i += 2) cell(m.trail[i], m.trail[i + 1], 1, '#e8f0ff', 0.25 + 0.4 * i / m.trail.length);
      const born = clamp((m.t + 0.2) / 0.25, 0, 1);
      cell(m.x, m.y, 4, '#dfe9ff', 0.16 * tw * born);
      cell(m.x, m.y, 3, '#eef4ff', 0.35 * tw * born);
      cell(m.x, m.y, 2, '#ffffff', 0.95 * born);
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
    const stub = { mods: Object.assign({}, m), artifact: null, goat: g, stairFx: null, intro: null, touch: { active: false }, state: 'ghost' };
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
  second(game, g) {
    const n = game.mods && game.mods.secondChance;
    if (!n || game.secondUsed || game.revive || game.showroomOn || !game.level || game.level.def.heaven) return false;
    game.secondUsed = true;
    if (g.holding) { g.holding.held = false; if (!g.holding.item) g.holding.state = 'idle'; g.holding = null; }
    g.hp = 0; g.vx = g.vy = 0; g.state = 'ko'; g.timer = 0;
    game.revive = { t: 0, x: g.x, y: g.y };
    game.world.splat(g.x, g.y, 0, 0, 12);
    game.hitstop(0.12); game.shake(8, true); game.flash('#f4f8ff', 0.35);
    game.audio.sfxToll(); game.audio.sfxAscend();
    return true;
  },
  // While it plays the floor waits (`Game.update`): up out of him, a beat, and back down into him.
  updateRevive(game, dt) {
    const V = game.revive, S = TUNING.heaven.second, g = game.goat;
    V.t += dt;
    game.updateEffects(dt); game.updateCamera(dt);
    g.vx = g.vy = 0; g.state = 'ko';
    if (V.t < S.time) return;
    game.revive = null;
    // the mirror's rank says how many hearts, and its card quotes it
    g.hp = Math.min(g.maxHp, game.mods.secondChance || S.hearts);
    g.state = 'idle'; g.timer = 0; g.invuln = S.invuln; g.dazed = 0;
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted || e.scripted) continue;
      const dx = e.x - g.x, dy = e.y - g.y, d = Math.hypot(dx, dy) || 1;
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
  // Up to a height, held there a beat, then down into him faster than it left.
  drawRevive(R, game) {
    const V = game.revive; if (!V) return;
    const S = TUNING.heaven.second, k = clamp(V.t / S.time, 0, 1);
    const up = k < 0.5 ? 1 - Math.pow(1 - k / 0.5, 3) : k < 0.72 ? 1 : 1 - Math.pow((k - 0.72) / 0.28, 2);
    this.beam(R, V.x, V.y, Math.min(1, V.t / 0.3) * (k < 0.9 ? 1 : (1 - k) / 0.1), TUNING.heaven.ascent.beam);
    this.drawGhost(R, game, V.x, V.y, 44 * up, 0.75, 1, V.t);
  },
};
