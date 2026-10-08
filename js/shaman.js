// THE SHAMAN (6 Oct 2026, the user's: "another enemy, a shaman, with two skills: he boosts the run speed and
// damage and +1 heart of the ordinary kind; and on your goat it is as if he held the run key down one way,
// toward him, shown by an effect over you, for a limited time, while you can still press the other keys").
// A man of the old cult with a turtle's shell on his back (js/shaman-pixels.js, three looks on the ART tab), a `bearer`
// with `e.shaman` (gen.js `spawnKind`). Every number is `TUNING.shaman`.
//
// His states (`sh*`) live in `Enemy.updateBearer` ahead of the club:
//   shspirit  the rattle shaken over his head: the windup of THE SPIRIT, his chosen men (`e.shTargets`) marked
//   shcall    his hand held out at the goat: the windup of THE CALL
// Otherwise he keeps his distance behind his men, and only swings his staff with the goat in his face.
// THE SPIRIT on a clubman is `o.spirit` = { by, t, speed0 }: a stride, a blow and a heart more (`Enemy.atk`
// reads the blow). THE CALL on the goat is `goat.called` = { by, ux, uy, t, max }: `Shaman.pull` adds the held
// key to whatever the player presses, one of the eight a keyboard has, before the goat steps.
// Both are taken back when he goes down (`Shaman.onDie`), and both are pillar 4's: a windup to read (amber for
// what is coming at the goat, the cult's red for what goes into his men) and a beat after it to eat.
const Shaman = {
  give(e) {
    const S = TUNING.shaman;
    e.shaman = true; e.hp = e.maxHp = S.hp;
    e.speed = e.cfg.speed * S.speedMul;
    e.r = S.r; e.wallR = Math.min(e.r, TUNING.ai.path.squeeze);
    e.spiritCd = S.wake; e.callCd = S.wake + 1.5; e.shTargets = null;
  },

  // ---- THE SPIRIT ----
  // Who it can go into: a plain clubman, never a butcher, a shieldman, a thrower, another shaman, a boss, a
  // soul-bearer, a keeper, a post or a man in the air. One who has it already has it topped up (`spiritInto`), so
  // the spirit is cast whenever his turn comes round (the user's: "he must alternate it with the control").
  can(o) {
    return !!o && !o.dead && o.kind === 'bearer' && !o.champion && !o.shield && !o.shieldman && !o.thrower && !o.shaman
      && !o.boss && !o.soul && !o.keeper && !o.blessing && !o.sentry && !o.scripted && !o.held && !o.liftedBy && o.state !== 'flung';
  },
  // His own room's clubmen he can see within `reach` tiles, nearest first, up to `max`.
  targets(e, game) {
    const S = TUNING.shaman.spirit, R = S.reach * TILE, room = roomAt(game.level, e.x, e.y);
    return game.enemies.filter((o) => o !== e && Shaman.can(o) && Math.abs(o.x - e.x) < R && Math.abs(o.y - e.y) < R
      && hyp(o.x - e.x, o.y - e.y) < R && (!room || roomAt(game.level, o.x, o.y) === room) && game.sees(e.x, e.y, o.x, o.y))
      .sort((a, b) => hyp(a.x - e.x, a.y - e.y) - hyp(b.x - e.x, b.y - e.y)).slice(0, S.max);
  },
  spiritInto(e, o, game) {
    const S = TUNING.shaman.spirit;
    game.particles(o.x, o.y - 14, 10, PALETTE.spiritHi, 120); game.ring(o.x, o.y, o.r * 2.4, PALETTE.spirit, 0.45, 2);
    o.flash = 0.25;
    if (o.spirit) { o.spirit.t = S.time; o.spirit.by = e; return; }   // topped up, nothing added twice
    o.spirit = { by: e, t: S.time, speed0: o.speed };
    o.speed *= S.speed; o.hp += S.hp; o.maxHp += S.hp;
  },
  spiritOut(o, game) {
    const sp = o.spirit; if (!sp) return;
    o.spirit = null;
    if (o.dead) return;
    o.speed = sp.speed0; o.maxHp = Math.max(1, o.maxHp - TUNING.shaman.spirit.hp); o.hp = Math.min(o.hp, o.maxHp);
    game.particles(o.x, o.y - 16, 5, PALETTE.bone, 70);
  },

  // ---- THE CALL ----
  call(e, game) {
    const S = TUNING.shaman.call, g = game.goat;
    // As a key is held: one of eight ways, the one nearest the line to him.
    const a = Math.round(Math.atan2(e.y - g.y, e.x - g.x) / (Math.PI / 4)) * (Math.PI / 4);
    g.called = { by: e, ux: Math.round(Math.cos(a) * 1000) / 1000, uy: Math.round(Math.sin(a) * 1000) / 1000, t: S.time, max: S.time };
    game.floatText(g.x, g.y - 34, 'CALLED', PALETTE.fireHi);
    game.audio.sfxSeized();   // the one sound for "he has you" (8 Oct 2026), its twin is `free`
    game.ring(g.x, g.y, g.r * 2, PALETTE.fireHi, 0.35, 2);
    game.bark(e, 'call', 0.8);
  },
  // Every way the call ends (expired, shaken off by a blow, its caster down or gone) goes through here, so the
  // goat always hears the one sound for "your legs are yours again". `why` is the word floated, if any.
  free(game, g, why, col) {
    if (!g || !g.called) return;
    g.called = null;
    if (why) game.floatText(g.x, g.y - 34, why, col || PALETTE.bone);
    game.audio.sfxFreed();
  },
  // A blow on the goat (`Goat.damage`, before anything takes it): the call is shaken off and none takes him for
  // `call.guard` s. The guard is kept on the clock of the run (`game.timer`), so a new floor never inherits one.
  shake(game, g) {
    if (!g || g.dead) return;
    if (g.called) Shaman.free(game, g, 'SHAKEN OFF');
    g.callGuard = game.timer + TUNING.shaman.call.guard;
  },
  guarded(game, g) { return g.callGuard !== undefined && game.timer < g.callGuard; },
  // The held key, added to the player's own before the goat steps (`Game.update`): away from him is a
  // standstill, across bends it, and nothing else he does is touched.
  pull(game, input) {
    const g = game.goat, c = g && g.called; if (!c) return;
    if (c.t <= 0 || g.dead || c.by.dead || game.enemies.indexOf(c.by) < 0) { if (g.dead) g.called = null; else Shaman.free(game, g); return; }
    let mx = input.mx + c.ux, my = input.my + c.uy; const l = hyp(mx, my);
    if (l > 1) { mx /= l; my /= l; }
    input.mx = mx; input.my = my;
  },

  // ---- the clocks, once a step (`Game.update`) ----
  update(dt, game) {
    const g = game.goat;
    if (g && g.called) g.called.t -= dt;
    for (const o of game.enemies) {
      if (!o.spirit) continue;
      const by = o.spirit.by;
      o.spirit.t -= dt;
      if (o.dead || o.spirit.t <= 0 || by.dead || game.enemies.indexOf(by) < 0) Shaman.spiritOut(o, game);
    }
  },
  // He is down: what he gave his men goes out of them and the goat's legs are his own again.
  onDie(e, game) {
    if (!e.shaman) return;
    for (const o of game.enemies) if (o.spirit && o.spirit.by === e) Shaman.spiritOut(o, game);
    const g = game.goat;
    if (g && g.called && g.called.by === e) Shaman.free(game, g, 'FREE');
  },

  // ---- his part of `Enemy.updateBearer`: true when it took the step ----
  step(e, dt, game, sees) {
    const S = TUNING.shaman, g = game.goat, slow = game.mods.enemySlow;
    e.spiritCd = Math.max(0, (e.spiritCd || 0) - dt); e.callCd = Math.max(0, (e.callCd || 0) - dt);
    // Poisoned he is blind, as every man is (`status.poison`): whatever he was casting goes, and he casts nothing.
    const blind = e.poison > 0;
    if ((e.state === 'shspirit' || e.state === 'shcall') && blind) {
      game.floatText(e.x, e.y - 40, 'BLIND', PALETTE.venomHi); e.state = 'recover'; e.timer = S.call.recover * slow; return true;
    }
    if (e.state === 'shspirit') {
      e.vx = 0; e.vy = 0; e.timer -= dt;
      e.shTargets = (e.shTargets || []).filter((o) => Shaman.can(o));
      if (!e.shTargets.length) { e.state = 'chase'; return true; }
      const o = e.shTargets[0]; e.facing = Math.atan2(o.y - e.y, o.x - e.x);
      if (e.timer <= 0) {
        for (const m of e.shTargets) Shaman.spiritInto(e, m, game);
        Shaman.burst(e, game);
        e.shTargets = null; e.state = 'recover'; e.timer = S.spirit.recover * slow;
      }
      return true;
    }
    if (e.state === 'shcall') {
      e.vx = 0; e.vy = 0; e.timer -= dt; e.facing = Math.atan2(g.y - e.y, g.x - e.x);
      // It needs his eyes on the goat the whole way (the user's: "break the line of sight and it is gone"): out of
      // his sight or out of the picture at any moment of it, and the status over the goat's head goes out unfilled.
      if (g.dead || !sees || game.hidden(e.x, e.y) || Shaman.guarded(game, g)) {
        game.floatText(e.x, e.y - 40, 'LOST HIM', PALETTE.bone); e.state = 'recover'; e.timer = S.call.recover * slow; return true;
      }
      if (e.timer <= 0) {
        // Mid-roll at the end, or his already: it finds nothing.
        if (g.state !== 'roll' && !g.leap && !(g.invuln > 0) && !g.called) { Shaman.call(e, game); Shaman.burst(e, game); }
        else game.floatText(e.x, e.y - 40, 'LOST HIM', PALETTE.bone);
        e.state = 'recover'; e.timer = S.call.recover * slow;
      }
      return true;
    }
    if (e.state !== 'chase' || g.dead) return false;
    const dx = g.x - e.x, dy = g.y - e.y, d = hyp(dx, dy), shown = !game.hidden(e.x, e.y);
    // Which cast first is where the goat is (the user's: "far off he tries to control you, close he boosts his
    // lads"): past `near` tiles the call, inside it the spirit into the men about to meet him. If that one cannot go
    // (nobody to put it in, the goat out of his sight or range, a cooldown), the other may; so as the goat closes
    // the two still take turns.
    const spirit = () => {
      if (e.spiritCd > 0 || !shown) return false;
      const t = Shaman.targets(e, game); if (!t.length) return false;
      e.state = 'shspirit'; e.timer = S.spirit.wind * slow; e.shTargets = t; e.spiritCd = S.spirit.cd * slow; e.vx = 0; e.vy = 0;
      game.audio.sfxRattle(game.audio.heard(e.x - g.x, e.y - g.y)); game.bark(e, 'spirit', 0.7);
      return true;
    };
    const call = () => {
      if (e.callCd > 0 || !sees || !shown || g.called || Shaman.guarded(game, g) || d < S.call.min * TILE || d > S.call.max * TILE) return false;
      e.state = 'shcall'; e.timer = S.call.wind * slow; e.callCd = S.call.cd * slow; e.vx = 0; e.vy = 0;
      game.audio.sfxChant(game.audio.heard(e.x - g.x, e.y - g.y));
      return true;
    };
    if (!blind && (d > S.near * TILE ? call() || spirit() : spirit() || call())) return true;
    // In his face: the staff, the clubman's own swing.
    if (d < e.atk('reach') + g.r + 4) return false;
    // Too close: back off round what is behind him (the rifleman's way); nowhere to go, he stands.
    if (d < S.keep.min * TILE && sees) {
      const away = e.clearAng(game, Math.atan2(-dy, -dx), TILE, e.x, e.y, undefined, null);
      if (away !== null && Math.abs(angleDiff(away, Math.atan2(dy, dx))) > Math.PI / 2) e.moveToward(Math.cos(away), Math.sin(away), e.speed * 0.8, dt, game);
      else { e.vx = 0; e.vy = 0; }
      e.facing = Math.atan2(dy, dx); return true;
    }
    // Far off or out of sight he comes on as a clubman does; in between he stands behind his men.
    if (d > S.keep.max * TILE || !sees) return false;
    e.vx = 0; e.vy = 0; e.facing = Math.atan2(dy, dx);
    return true;
  },

  // ---- the picture (render only) ----
  // The windups on the floor (`Renderer.drawTelegraph`, asked for every man): green cells running from him to each
  // man the spirit is for, a ring filling round each one's feet; for the call an amber line to the goat (the line
  // that has to be broken), its fill over the goat's head (`drawWorld`). A man with the spirit in him has a ring of
  // green cells round his feet while it lasts, and his own windup is still drawn (false).
  drawTell(r, e) {
    const ctx = r.ctx, px = TUNING.effects.pixel * 2, g = r.game && r.game.goat;
    if (e.spirit && !e.dead) {
      const b = 0.5 + 0.5 * Math.sin(r.t * 5 + e.x * 0.03), R = Math.round((e.r + 5) / px) * px;
      ctx.save(); ctx.globalAlpha *= 0.35 + 0.3 * b; ctx.fillStyle = PALETTE.spirit; ctx.beginPath(); r.floorRing(e.x, e.y + 2, R, R - px, px); ctx.fill(); ctx.restore();
    }
    if (e.state === 'shspirit' || e.state === 'shcall') Shaman.drawAura(r, e);
    if (e.state === 'shspirit') {
      const p = r.windP(e, TUNING.shaman.spirit.wind);
      ctx.save(); ctx.fillStyle = PALETTE.spirit; ctx.globalAlpha *= 0.4 + 0.5 * p; ctx.beginPath();
      for (const o of e.shTargets || []) {
        if (o.dead) continue;
        const dx = o.x - e.x, dy = o.y - e.y, d = hyp(dx, dy) || 1;
        r.floorLine(e.x + dx / d * e.r, e.y + dy / d * e.r, o.x, o.y, px, 6, 5, r.t * 50);
        r.floorArc(o.x, o.y + 2, o.r + 8, o.r + 8 - px, px, -Math.PI / 2, Math.PI * 2 * p);
      }
      ctx.fill(); ctx.restore();
      return true;
    }
    if (e.state === 'shcall' && g && !g.dead) {
      const p = r.windP(e, TUNING.shaman.call.wind), dx = g.x - e.x, dy = g.y - e.y, d = hyp(dx, dy) || 1;
      ctx.save(); ctx.fillStyle = `rgba(242,170,48,${0.3 + 0.55 * p})`; ctx.beginPath();
      r.floorLine(e.x + dx / d * e.r, e.y + dy / d * e.r, g.x, g.y, px, 4, 6, -r.t * 50);
      ctx.fill(); ctx.restore();
      return true;
    }
    return false;
  },
  // The ring round him while he casts either (`shaman.aura`): a thin green ring of cells closing in to its full size
  // as the windup runs, and round it his runes (the user's: "blinking runes, a bit varied, like Gungeon"),
  // `aura.runes` of them turning slowly, each blinking on its own beat and changing its sign now and then.
  // The colour of his eyes, never the poison's.
  RUNES: [['x.x', '.x.', 'x.x', 'x..'], ['xxx', '.x.', '.x.', 'x.x'], ['x..', 'xx.', 'x.x', 'x..'], ['.x.', 'x.x', '.x.', '.x.'],
    ['xx.', 'x.x', 'xx.', 'x..'], ['x.x', 'xxx', 'x.x', '.x.'], ['.xx', 'x..', '.x.', '..x'], ['x.x', 'x.x', '.x.', 'xxx']],
  drawAura(r, e) {
    const S = TUNING.shaman, A = S.aura, ctx = r.ctx, px = TUNING.effects.pixel * 2, R = A.r * TILE;
    const p = r.windP(e, e.state === 'shspirit' ? S.spirit.wind : S.call.wind), t = r.t, cy = e.y + 2;
    const rr = Math.round(R * (0.82 + 0.18 * p) / px) * px;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.35 * p; ctx.fillStyle = PALETTE.spirit; ctx.beginPath(); r.floorRing(e.x, cy, rr, rr - px, px); ctx.fill();
    const n = A.runes, seed = Math.abs(e.x * 0.37 + e.y * 0.11) % 7;
    for (let i = 0; i < n; i++) {
      const ph = seed + i * 2.399, beat = Math.sin(t * (2.6 + (i % 3) * 1.3) + ph);
      if (beat < -0.35) continue;                                        // dark this beat
      const G = Shaman.RUNES[(i * 3 + Math.floor(t * 2.2 + ph)) % Shaman.RUNES.length];
      const a = i / n * Math.PI * 2 + t * A.turn;
      const gx = Math.round((e.x + Math.cos(a) * (rr + px * 3)) / px) - 1, gy = Math.round((cy + Math.sin(a) * (rr + px * 3)) / px) - 2;
      ctx.globalAlpha = (0.45 + 0.55 * p) * (0.55 + 0.45 * beat);
      ctx.fillStyle = beat > 0.75 ? PALETTE.spiritHi : PALETTE.spirit;
      for (let y = 0; y < G.length; y++) for (let x = 0; x < 3; x++) if (G[y][x] === 'x') ctx.fillRect((gx + x) * px, (gy + y) * px, px, px);
    }
    ctx.restore();
  },
  // The cast going off: the ring flashing out from him.
  burst(e, game) {
    const A = TUNING.shaman.aura;
    game.ring(e.x, e.y, A.burst * TILE, PALETTE.spirit, 0.45, 3); game.ring(e.x, e.y, A.r * TILE, PALETTE.spiritHi, 0.3, 2);
    game.particles(e.x, e.y - 20, 8, PALETTE.spiritHi, 110);
  },
  // The spirit in a man (`Renderer.drawOverhead`, under his notches): an arrow up over his head (8 Oct 2026
  // playtest: "simpler"; it was a pair of antlers of light), bone with the shaman's green round it, rising.
  ANTLERS: ['...x...', '..xxx..', '.xxxxx.', 'xx.x.xx', '...x...', '...x...', '...x...'],
  drawSpirit(r, e) {
    if (!e.spirit || e.dead) return;
    const ctx = r.ctx, A = Shaman.ANTLERS, C = 2, w = A[0].length, b = 1.5 + 1.5 * Math.sin(r.t * 5 + e.x * 0.03);
    ctx.save(); ctx.scale(1, 1 / TILT);
    const x0 = Math.round(e.x - w * C / 2), y0 = Math.round(e.y * TILT - r.spriteHead(e) - A.length * C + 3 - b);
    const on = (i, j) => j >= 0 && j < A.length && i >= 0 && i < w && A[j][i] === 'x';
    ctx.globalAlpha *= 0.85; ctx.fillStyle = PALETTE.ink;
    for (let j = -1; j <= A.length; j++) for (let i = -1; i <= w; i++) if (!on(i, j) && (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1))) ctx.fillRect(x0 + i * C, y0 + j * C, C, C);
    ctx.globalAlpha /= 0.85; ctx.fillStyle = PALETTE.spiritHi;
    for (let j = 0; j < A.length; j++) for (let i = 0; i < w; i++) if (on(i, j)) ctx.fillRect(x0 + i * C, y0 + j * C, C, C);
    ctx.restore();
  },
  // The call over the goat's head (`Renderer.draw`, after the heads, over everything), a status the player reads
  // (the user's: "a status over your head that fills round before it lands"). While the shaman winds it up it is a
  // dim key with the arrow ghosted in, ringed by cells that fill clockwise from the top as his windup runs (broken
  // line of sight or poison and it goes out, `step`); held, the key is pressed and lit, a row of cells under it
  // running out, and a dashed thread of his green runs on the floor from the goat to him.
  drawWorld(r, game) {
    const g = game.goat; if (!g || g.dead) return;
    const c = g.called && !g.called.by.dead ? g.called : null;
    const caster = c ? null : game.enemies.find((e) => e.shaman && !e.dead && e.state === 'shcall' && !game.hidden(e.x, e.y));
    if (!c && !caster) return;
    const ctx = r.ctx, px = TUNING.effects.pixel * 2, by = c ? c.by : caster;
    let ux, uy;
    if (c) { ux = c.ux; uy = c.uy; }
    else { const a = Math.round(Math.atan2(by.y - g.y, by.x - g.x) / (Math.PI / 4)) * (Math.PI / 4); ux = Math.cos(a); uy = Math.sin(a); }
    const p = c ? 1 : r.windP(caster, TUNING.shaman.call.wind);
    ctx.save();
    if (c) { ctx.fillStyle = PALETTE.spirit; ctx.globalAlpha = 0.5; ctx.beginPath(); r.floorLine(g.x, g.y, by.x, by.y, px, 3, 7, r.t * 60); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.scale(1, 1 / TILT);
    const C = 2, N = 11, cx = Math.round(g.x), cy = Math.round(g.y * TILT - 64 + N * C / 2), x0 = cx - N * C / 2, y0 = cy - N * C / 2;
    // the ring round the key, a cell at a time, filling clockwise from the top
    const RN = 28, RR = N * C / 2 + 5;
    for (let i = 0; i < RN; i++) {
      const a = -Math.PI / 2 + i / RN * Math.PI * 2, on = i / RN < p;
      ctx.fillStyle = on ? (c ? PALETTE.spirit : '#f2aa30') : 'rgba(13,10,12,0.75)';
      ctx.fillRect(Math.round(cx + Math.cos(a) * RR - C / 2), Math.round(cy + Math.sin(a) * RR - C / 2), C + 1, C + 1);
    }
    // the cap: dim while it fills, pressed into its socket and lit once it holds
    ctx.globalAlpha = c ? 1 : 0.55 + 0.35 * p;
    ctx.fillStyle = 'rgba(13,10,12,0.85)'; ctx.fillRect(x0 - C, y0 - C, (N + 2) * C, (N + 2) * C);
    ctx.fillStyle = '#4a3b2c'; ctx.fillRect(x0, y0, N * C, N * C);
    ctx.fillStyle = PALETTE.bone; ctx.fillRect(x0, y0 + (c ? C : 0), N * C, (N - 1) * C);
    ctx.fillStyle = '#2a211c'; ctx.fillRect(x0 + C, y0 + (c ? 2 : 1) * C, (N - 2) * C, (N - 3) * C);
    const hot = c && Math.sin(r.t * 10) > 0;
    ctx.fillStyle = c ? (hot ? PALETTE.fireHi : '#f2aa30') : 'rgba(242,170,48,0.55)';
    for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) {
      const a = i - 3, b = j - 3, u = a * ux + b * uy, v = -a * uy + b * ux;
      const shaft = u >= -3.2 && u <= 0.6 && Math.abs(v) <= 0.6, head = u > 0 && u <= 3.2 && Math.abs(v) <= 3.3 - u;
      if (shaft || head) ctx.fillRect(x0 + (i + 2) * C, y0 + (j + (c ? 2.5 : 1.5)) * C - C / 2, C, C);
    }
    // held: the time left, a cell at a time
    if (c) {
      const left = Math.ceil(clamp(c.t / c.max, 0, 1) * N);
      ctx.fillStyle = 'rgba(13,10,12,0.8)'; ctx.fillRect(x0 - C, y0 + (N + 5) * C, (N + 2) * C, C * 3);
      ctx.fillStyle = PALETTE.spirit; ctx.fillRect(x0, y0 + (N + 6) * C, left * C, C);
    }
    ctx.restore();
  },
};
if (typeof module !== 'undefined') module.exports = Shaman;
