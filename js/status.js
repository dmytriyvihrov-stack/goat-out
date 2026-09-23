// Statuses: poison, and what happens where two of the three things that can be wrong with a man
// meet. Stun is `Enemy.dazed` (the stars) and fire is `Enemy.burning`; both are older than this
// file and stay where they are. What lives here is poison itself, the three reactions, the puddles
// on the floor, the glob the goat spits and the things he throws dripping or charged. Every number
// is `TUNING.status`, and the STATUS tab of the tool draws that block.
//
//   POISON + FIRE  the poison goes off (`blast`)
//   POISON + STUN  shock: both run much longer, no hit (`sting`)
//   STUN   + FIRE  the fire does two hits, not one (`Enemy.scald`)
//
// The goat is never poisoned. Every source of it is one of his own souls, and a soul that could
// hurt the animal that swallowed it would be a soul nobody takes twice.
const Status = {
  // Poison a man. Where it lands on something already wrong with him it reacts instead of stacking.
  poison(game, e, t) {
    if (e.dead || e.ghosted) return;
    if (e.burning > 0) { Status.blast(game, e.x, e.y, TUNING.status.blast, e); return; }
    if (e.dazed > 0) { Status.sting(game, e); return; }
    if (e.poison <= 0) {
      game.floatText(e.x, e.y - 30, 'POISONED', PALETTE.venomHi);
      game.particles(e.x, e.y - 8, 6, PALETTE.venom, 90);
      // A rifle mid-aim or a mage mid-cast loses it: blind is blind now, not at the next shot.
      if (e.state === 'aim' || e.state === 'cast') { e.state = 'chase'; e.rune = null; }
    }
    e.poison = Math.max(e.poison, t || TUNING.status.poison.time);
  },

  // He has just been stunned. Poison already in him turns it into shock.
  stunned(game, e) {
    if (e.poison > 0 && !e.dead) Status.sting(game, e);
  },

  // SHOCK. Both statuses stretched long and no hit: `e.shock` is what the renderer reads to put one
  // mark over his head instead of stars and bubbles. Already in shock, it only tops the clocks up —
  // a puddle under a dazed man would otherwise announce it every frame.
  sting(game, e) {
    const S = TUNING.status.sting;
    e.dazed = Math.max(e.dazed, S.stun * game.mods.enemySlow);
    e.poison = Math.max(e.poison, S.poison);
    if (e.state === 'aim' || e.state === 'cast' || e.state === 'windup') { e.state = 'chase'; e.rune = null; }
    if ((e.shock || 0) > 0) { e.shock = Math.max(e.shock, e.dazed); return; }
    e.shock = e.dazed;
    game.floatText(e.x, e.y - 40, 'SHOCK', PALETTE.venomHi);
    game.particles(e.x, e.y - 6, 12, PALETTE.venomHi, 180);
    game.ring(e.x, e.y, e.r * 2.4, PALETTE.venom);
    game.audio.sfxThud(); game.hitstop(0.04);
  },

  // `n` hits, each one through `die` so a two-heart man still eats the first and goes down.
  hurt(game, e, n, cause) {
    for (let k = 0; k < n && !e.dead; k++) e.die(game, cause, 0, 0);
  },

  // A small bomb: the poison meeting a flame, or a charged throw landing. Everybody inside `hitR`
  // takes a hit, everybody out to `radius` is thrown, the goat is shoved and never hurt, and any
  // poison on the floor inside it is burnt off so one puddle cannot go off twice.
  blast(game, x, y, B, source, green = true) {
    const R = B.radius * TILE, w = game.world;
    game.fx.explosion(x, y, R * 0.8, false);
    game.particles(x, y, 18, green ? PALETTE.venomHi : PALETTE.fireHi, 300);
    game.particles(x, y, 10, green ? PALETTE.venom : PALETTE.fire, 220);
    game.ring(x, y, R, green ? PALETTE.venomHi : PALETTE.fireHi);
    w.scorch(x, y, R * 0.35);
    game.shake(8); game.hitstop(0.05); game.audio.sfxBoom(); game.vibe(30);
    w.emitNoise(x, y, TUNING.noise.boom);
    if (green) game.floatText(x, y - 36, 'IT GOES OFF', PALETTE.venomHi);
    const cx = Math.floor(x / TILE), cy = Math.floor(y / TILE), r = Math.ceil(B.radius);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const tx = cx + dx, ty = cy + dy;
      if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) continue;
      const i = w.idx(tx, ty); if (w.poison[i] > 0) { w.poison[i] = 0; w.poisonOn.delete(i); }
    }
    for (const o of game.enemies) {
      if (o.dead || o.held || o.ghosted) continue;
      const ddx = o.x - x, ddy = o.y - y, d = Math.hypot(ddx, ddy);
      if (d > R + o.r) continue;
      if (o !== source && !w.los(x, y, o.x, o.y)) continue;
      const nx = ddx / (d || 1), ny = ddy / (d || 1);
      o.poison = 0;
      if (d <= B.hitR * TILE + o.r || o === source) {
        if (o.kind === 'butcher') { o.hp -= 1; o.flash = 0.2; o.state = 'stagger'; o.timer = 0.4; if (o.hp <= 0) o.die(game, 'boom', nx, ny); }
        else o.die(game, 'boom', nx, ny);
      } else if (o.kind !== 'butcher') o.fling(nx * B.impulse, ny * B.impulse, true);
    }
    const g = game.goat, gd = Math.hypot(g.x - x, g.y - y);
    if (!g.dead && gd < R + g.r) { g.vx += (g.x - x) / (gd || 1) * B.goatPush; g.vy += (g.y - y) / (gd || 1) * B.goatPush; }
  },

  // A square of poison: `half` tiles either side of the tile the point is in. Whoever is standing
  // in it now has it now, rather than on the next step.
  puddle(game, x, y, half) {
    const w = game.world, cx = Math.floor(x / TILE), cy = Math.floor(y / TILE), t = TUNING.status.poison.pool;
    for (let dy = -half; dy <= half; dy++) for (let dx = -half; dx <= half; dx++) w.poisonTile(cx + dx, cy + dy, t);
    game.particles(x, y, 10 + half * 6, PALETTE.venom, 140);
    game.particles(x, y, 6, PALETTE.venomHi, 90);
    w.emitNoise(x, y, TUNING.noise.splat);
    game.audio.sfxSplat();
    Status.soak(game);
  },

  // Everybody standing in poison has it.
  soak(game) {
    const w = game.world; if (!w.poisonOn.size) return;
    for (const e of game.enemies) {
      if (e.dead || e.ghosted || e.held) continue;
      if (w.isPoisonPx(e.x, e.y)) Status.poison(game, e);
    }
  },

  // Once a step: the puddles dry, a puddle a flame reaches goes off, the glob flies, and whatever he
  // threw dripping or charged does its thing once it comes down.
  update(game, dt) {
    const w = game.world;
    let lit = null;
    for (const i of w.poisonOn) {
      w.poison[i] -= dt;
      if (w.poison[i] <= 0) { w.poison[i] = 0; w.poisonOn.delete(i); continue; }
      if (w.fire[i] > 0 && lit === null) lit = i;
    }
    // One blast a step at most, and it burns off the puddle round it: a big puddle lit at one
    // corner goes off in a short chain rather than all at once, which reads as it catching.
    if (lit !== null) Status.blast(game, (lit % w.W + 0.5) * TILE, (((lit / w.W) | 0) + 0.5) * TILE, TUNING.status.blast, null);
    Status.soak(game);
    Status.updateGlobs(game, dt);
    Status.updateCarried(game);
  },

  // ---- the goat's side of it ----

  // SPLASH: the head goes down and whatever is at his back gets it.
  splash(game, g) {
    const S = TUNING.status.splash, R = S.range * TILE;
    let n = 0;
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted) continue;
      const dx = e.x - g.x, dy = e.y - g.y, d = Math.hypot(dx, dy);
      if (d > R + e.r || (dx * g.aim.x + dy * g.aim.y) / (d || 1) > S.back) continue;
      Status.poison(game, e); n++;
    }
    for (let k = 0; k < 10; k++) {
      const a = Math.atan2(-g.aim.y, -g.aim.x) + (Math.random() - 0.5) * 2.2, sp = 90 + Math.random() * 160;
      game.parts.push({ x: g.x, y: g.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3 + Math.random() * 0.25,
        color: Math.random() < 0.5 ? PALETTE.venom : PALETTE.venomHi, size: 2.5 + Math.random() * 2.5 });
    }
    if (n) game.audio.sfxSplat();
  },

  // What leaves his mouth after `venomHold` / `chargeHold` seconds is marked on the way out.
  markThrow(game, g, h) {
    const m = game.mods;
    if (m.venomHold > 0 && g.holdTimer >= m.venomHold) h.venom = true;
    if (m.chargeHold > 0 && g.holdTimer >= m.chargeHold) h.charged = true;
  },
  // How far along the hold is, 0..1, for whichever of the two is on. The renderer rings the thing.
  holdCharge(game, g) {
    const m = game.mods, need = m.chargeHold || m.venomHold;
    return need > 0 && g.holding ? clamp(g.holdTimer / need, 0, 1) : 0;
  },

  // A thing thrown dripping leaves poison under its whole flight and a puddle where it stops; a
  // charged one goes off where it stops. "Stops" is the same test for a man and a crate: no longer
  // flying, or no longer there at all.
  updateCarried(game) {
    const w = game.world;
    const each = (o, isMan) => {
      if (!o.venom && !o.charged) return;
      // An animal flies on its own flag — a shell's `flying`, a kicked hen's `birdState` — not `flung`.
      const up = o.flung || o.flying || o.birdState === 'flying';
      const flying = isMan ? o.state === 'flung' && !o.dead : up && !o.broken && !o.held;
      if (flying) {
        if (o.venom) w.poisonTile(Math.floor(o.x / TILE), Math.floor(o.y / TILE), TUNING.status.poison.pool);
        if (Math.random() < 0.6) game.particles(o.x, o.y, 1, o.charged ? PALETTE.fireHi : PALETTE.venom, 60);
        return;
      }
      const venom = o.venom, charged = o.charged;
      o.venom = false; o.charged = false;
      if (venom) Status.puddle(game, o.x, o.y, TUNING.status.jaw.half);
      if (charged) {
        if (!isMan && o.kind === 'bomb' && !o.broken) { o.explode(game); return; }
        Status.blast(game, o.x, o.y, TUNING.status.charge, isMan && !o.dead ? o : null, false);
        if (!isMan && o.kind === 'crate' && !o.broken) o.shatter(game);
      }
    };
    for (const e of game.enemies) each(e, true);
    for (const p of game.props) each(p, false);
  },

  // VENOM SPIT: a glob along the pointer. It bursts on the first wall, man or solid thing it meets,
  // or where it runs out of range, and leaves three tiles by three of poison.
  spit(game, g) {
    const S = TUNING.status.spit;
    g.screamCd = game.mods.screamCooldown; g.screaming = 0.3;
    game.globs.push({ x: g.x + g.aim.x * 14, y: g.y + g.aim.y * 14, vx: g.aim.x * S.speed, vy: g.aim.y * S.speed,
      life: S.range * TILE / S.speed });
    game.audio.sfxSwing(); game.audio.sfxBleat(380, 0.14, 0.18); game.vibe(12);
    game.world.emitNoise(g.x, g.y, TUNING.noise.swing);
  },
  updateGlobs(game, dt) {
    const w = game.world;
    for (const b of game.globs) {
      b.life -= dt;
      const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
      let burst = b.life <= 0;
      if (w.isSolid(Math.floor(nx / TILE), Math.floor(ny / TILE))) burst = true;
      if (!burst) for (const e of game.enemies) {
        if (e.dead || e.held || e.ghosted) continue;
        if (Math.hypot(e.x - nx, e.y - ny) < e.r + 6) { burst = true; break; }
      }
      if (!burst) for (const p of game.props) {
        if (p.broken || !p.blocking) continue;
        if (Math.hypot(p.x - nx, p.y - ny) < (p.r || 12) + 4) { burst = true; break; }
      }
      if (burst) { b.dead = true; Status.puddle(game, b.x, b.y, TUNING.status.spit.half); continue; }
      b.x = nx; b.y = ny;
      if (Math.random() < 0.7) game.parts.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
        life: 0.25, color: PALETTE.venom, size: 2 + Math.random() * 2 });
    }
    game.globs = game.globs.filter((b) => !b.dead);
  },
};
