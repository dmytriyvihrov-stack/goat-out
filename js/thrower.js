// THE THROWER (3 Oct 2026, the user's: "an enemy who also throws things, objects, maybe his own men,
// maybe even the goat; when he comes up close it is not damage but a throw"; "three hearts; he looks for
// things and throws them; he can also just hit in front of him; the goat knocks him back like the
// butcher"; "met on THE BRIDGE; it hurts when he throws the goat into something; he throws clubmen,
// hounds and the animals"). A clubman of the cult with one arm grown huge on the green that a hose feeds
// it from the tank on his back, a goat's skull strapped on for a face (js/thrower-pixels.js). He is a
// `bearer` with `e.thrower` (gen.js `spawnKind`), and this is the part of him the clubman has not got:
// what he looks for, the lift (his windup), carrying it, the throw, and his grab of the goat. Every
// number is `TUNING.thrower`.
//
// The states are his own (`tw*`) and live in `Enemy.updateBearer` ahead of the club:
//   twgo   walking to the thing he picked (`e.twWant`), given up after `give` s
//   twlift lifting it overhead: the windup. Any blow that moves him out of it drops it (`Enemy.act`)
//   twcarry walking at the goat with it until he is `near`..`far` tiles off in a clear line
//   twaim  planted, the line to the goat laid amber, and then it goes
//   twgrab reaching for the goat (the roll slips it)
//   twhold the goat over his head while he turns to the worst thing near, then the throw
// What he holds is `e.carry` = { o, type }: 'prop' (a crate or a bomb), 'man' (a clubman or a hound of
// his own, `o.liftedBy`), 'beast' (an animal of the goat's, `o.held` keeps its own step off it), 'goat'.
const Thrower = {
  KEEPS: new Set(['twlift', 'twcarry', 'twaim', 'twhold']),
  // The animals he will lift: not the horse (too big), not the crow (in the air).
  BEASTS: new Set(['tortoise', 'goose', 'rabbit', 'husky', 'pig', 'chicken']),
  // Where what he holds sits over him, screen px off his feet for each of the four views the sprite has
  // (js/thrower-pixels.js `HOLD`, which is the fist's top): front, his right side, back, his left side.
  HOLD: { S: [-9, -46], E: [4, -47], N: [9, -46], W: [-4, -47] },

  give(e) {
    const T = TUNING.thrower;
    e.thrower = true; e.hp = e.maxHp = T.hp;
    e.speed = e.cfg.speed * T.speedMul;
    e.r = 13; e.wallR = Math.min(e.r, TUNING.ai.path.squeeze);
    e.carry = null; e.twWant = null; e.twCd = 0.6; e.grabCd = 1.5; e.twForget = [];
  },
  viewOf(a) { const d = (Math.round(a / (Math.PI / 4)) % 8 + 14) % 8; return d === 2 ? 'W' : d === 6 ? 'E' : d >= 3 && d <= 5 ? 'N' : 'S'; },
  // The hold point in world px: the screen offset turned back through the tilt, so a thing drawn at its
  // own feet there sits on his fist.
  holdAt(e) { const h = Thrower.HOLD[Thrower.viewOf(e.facing)] || Thrower.HOLD.S; return { x: e.x + h[0], y: e.y + h[1] / TILT }; },

  // ---- what he looks for ----
  liftable(e, game, o, type) {
    if (!o || o.dead || o.broken || o.held) return false;
    if (type === 'prop') return (o.kind === 'crate' && !o.noGrab && !o.flung) || (o.kind === 'bomb' && !o.flung);
    if (type === 'beast') return Thrower.BEASTS.has(o.kind) && !o.flying && !o.leaving && !o.gift && o.birdState !== 'flying' && !o.tossed;
    // His own: a clubman or a hound, never one heavier than a man, one with a soul, a post, a boss or
    // another thrower, and nobody already in the air.
    return (o.kind === 'bearer' || o.kind === 'dog') && o !== e && !o.champion && !o.shield && !o.thrower && !o.soul && !o.boss
      && !o.keeper && !o.blessing && !o.sentry && !o.scripted && !o.ghosted && o.state !== 'flung' && !(o.burning > 0);
  },
  find(e, game) {
    const T = TUNING.thrower, R = T.seek * TILE, room = roomAt(game.level, e.x, e.y), now = game.timer;
    e.twForget = e.twForget.filter((f) => f.until > now);
    let best = null, bestS = Infinity;
    const look = (o, type, extra) => {
      if (!Thrower.liftable(e, game, o, type) || e.twForget.some((f) => f.o === o)) return;
      const d = hyp(o.x - e.x, o.y - e.y); if (d > R) return;
      if (room && roomAt(game.level, o.x, o.y) !== room) return;
      if (!game.sees(e.x, e.y, o.x, o.y)) return;
      const s = d + extra * TILE;
      if (s < bestS) { bestS = s; best = { o, type }; }
    };
    for (const p of game.props) {
      if (p.kind === 'crate' || p.kind === 'bomb') look(p, 'prop', 0);
      else if (Thrower.BEASTS.has(p.kind)) look(p, 'beast', 1);
    }
    // All of them, not `liveEnemies`: that list is built as the step goes, and a man after him in it is not in it yet.
    for (const m of game.enemies) if (Math.abs(m.x - e.x) < R && Math.abs(m.y - e.y) < R) look(m, 'man', 1.5);
    return best;
  },

  // ---- his part of `Enemy.updateBearer`: true when it took the step ----
  step(e, dt, game, sees) {
    const T = TUNING.thrower, g = game.goat, slow = game.mods.enemySlow;
    e.twCd = Math.max(0, (e.twCd || 0) - dt); e.grabCd = Math.max(0, (e.grabCd || 0) - dt); e.twFollow = Math.max(0, (e.twFollow || 0) - dt);
    // Whatever he held was taken out of his hands by something else (a blast, a bite): he stands empty-handed a beat.
    if (e.carry) Thrower.hold(e, game);
    if (Thrower.KEEPS.has(e.state) && !e.carry) { e.state = 'recover'; e.timer = 0.3; e.vx = 0; e.vy = 0; return true; }
    switch (e.state) {
      case 'twgo': {
        const w = e.twWant;
        if (!w || !Thrower.liftable(e, game, w.o, w.type)) { e.twWant = null; e.state = 'chase'; return true; }
        e.twGive -= dt;
        if (e.twGive <= 0) { e.twForget.push({ o: w.o, until: game.timer + T.forget }); e.twWant = null; e.state = 'chase'; return true; }
        // The goat in reach of his fist or his grab: that before the errand.
        if (!g.dead && hyp(g.x - e.x, g.y - e.y) < e.atk('reach') + g.r + T.grab.reach) { e.state = 'chase'; return false; }
        const dx = w.o.x - e.x, dy = w.o.y - e.y, d = hyp(dx, dy) || 1;
        if (d <= e.r + (w.o.r || 10) + 6) { Thrower.lift(e, game, w); return true; }
        e.facing = Math.atan2(dy, dx);
        e.moveToward(dx / d, dy / d, e.speed, dt, game);
        return true;
      }
      case 'twlift':
        e.vx = 0; e.vy = 0; e.timer -= dt; e.facing = Math.atan2(g.y - e.y, g.x - e.x);
        Thrower.hold(e, game);
        if (e.timer <= 0) e.state = 'twcarry';
        return true;
      case 'twcarry': {
        Thrower.hold(e, game);
        if (g.dead) { e.vx = 0; e.vy = 0; return true; }
        // Never a clear throw for `carryMax` s (the goat kept close, or round a corner): he puts it down.
        e.twCarry = (e.twCarry || 0) + dt;
        if (e.twCarry > T.carryMax) { Thrower.putDown(e, game); e.state = 'recover'; e.timer = 0.4; e.twCd = T.cd; return true; }
        const d = hyp(g.x - e.x, g.y - e.y);
        if (d >= T.near * TILE && d <= T.far * TILE && Thrower.clear(e, game, g.x, g.y) && !game.hidden(e.x, e.y)) {
          e.state = 'twaim'; e.timer = T.aim * slow; e.vx = 0; e.vy = 0; e.twAim = { x: g.x, y: g.y };
          return true;
        }
        // Too close to throw: he backs off a step; otherwise he walks at the goat with it.
        if (d < T.near * TILE) { const a = Math.atan2(e.y - g.y, e.x - g.x); e.moveToward(Math.cos(a), Math.sin(a), e.speed * T.carry, dt, game); e.facing = a + Math.PI; }
        else { e.chaseGoat(game, e.speed * T.carry, dt); e.facing = Math.atan2(g.y - e.y, g.x - e.x); }
        Thrower.hold(e, game);
        return true;
      }
      case 'twaim':
        e.vx = 0; e.vy = 0; e.timer -= dt;
        e.twAim = { x: g.x, y: g.y }; e.facing = Math.atan2(g.y - e.y, g.x - e.x);
        Thrower.hold(e, game);
        if (e.timer <= 0) Thrower.release(e, game, e.twAim);
        return true;
      case 'twgrab':
        e.vx = 0; e.vy = 0; e.timer -= dt; e.facing = Math.atan2(g.y - e.y, g.x - e.x);
        if (e.timer <= 0) {
          if (Thrower.grabbable(e, game) && hyp(g.x - e.x, g.y - e.y) <= e.atk('reach') + g.r + T.grab.reach + 4) Thrower.catchGoat(e, game);
          else { e.state = 'recover'; e.timer = e.atk('recover') * slow; game.audio.sfxSwing(); }
        }
        return true;
      case 'twhold': {
        e.vx = 0; e.vy = 0; e.timer -= dt;
        // Turned toward where he will throw him, no faster than a heavy man turns.
        const k = 7 * dt; e.facing += clamp(angleDiff(e.facing, e.twDir), -k, k);
        Thrower.hold(e, game);
        if (e.timer <= 0) Thrower.toss(e, game);
        return true;
      }
    }
    if (e.state !== 'chase' || g.dead || e.poison > 0) return false;
    const dg = hyp(g.x - e.x, g.y - e.y);
    // Close: his grab when it is ready, his fist (the clubman's windup, `atk`) when it is not.
    if (dg < e.atk('reach') + g.r + T.grab.reach && e.grabCd <= 0 && sees && Thrower.grabbable(e, game)) {
      e.state = 'twgrab'; e.timer = T.grab.wind * slow; e.vx = 0; e.vy = 0;
      game.bark(e, 'attack', 0.3);
      return true;
    }
    if (dg < e.atk('reach') + g.r) return false;
    if (e.twCd <= 0) {
      e.twCd = 0.5;   // a look round now and then, not every step
      const want = Thrower.find(e, game);
      if (want) { e.state = 'twgo'; e.twWant = want; e.twGive = T.give; return true; }
    }
    return false;
  },
  clear(e, game, x, y) { return game.clearLine(e.x, e.y, x, y, game.props, 'stopsBullets', 2); },
  grabbable(e, game) {
    const g = game.goat;
    if (g.dead || g.leap || g.invuln > 0 || game.hidden(e.x, e.y)) return false;
    return !['roll', 'falling', 'stunned', 'ko', 'carried', 'tossed'].includes(g.state);
  },

  // ---- lifting, holding, dropping ----
  lift(e, game, w) {
    const T = TUNING.thrower, o = w.o;
    e.twWant = null; e.carry = w; o.held = true; o.vx = 0; o.vy = 0;
    if (w.type === 'prop') { o.flung = false; if (o.kind === 'bomb' && o.fuseT < 0) { o.fuseT = TUNING.prop.bomb.fuse; game.floatText(o.x, o.y - 26, 'LIT', PALETTE.fireHi); game.audio.sfxFuse(TUNING.prop.bomb.fuse); } }
    if (w.type === 'man') { o.state = 'held'; o.liftedBy = e; o.aware = true; o.rune = null; game.floatText(o.x, o.y - 28, o.kind === 'dog' ? 'YELP' : 'HEY!', PALETTE.ashHi); }
    if (w.type === 'beast') { o.tossed = true; game.audio.sfxAnimal && game.audio.sfxAnimal(o.kind === 'chicken' ? 'chicken' : o.kind, true); }
    e.state = 'twlift'; e.timer = T.lift * game.mods.enemySlow; e.vx = 0; e.vy = 0; e.twCarry = 0;
    game.audio.sfxThud(); game.bark(e, 'lift', 0.6);
    Thrower.hold(e, game);
  },
  hold(e, game) {
    const c = e.carry; if (!c) return;
    let at = Thrower.holdAt(e); const o = c.o;
    if (o.dead || o.broken || (c.type === 'goat' ? o.state !== 'carried' : !o.held)) {
      // let go of by something else (a fire, a blow that took a heart): a man is on his own feet again,
      // not lying across a fist that is not there, and not left inside the wall the fist was over
      if (c.type === 'man' && !o.dead) { o.liftedBy = null; if (game.world.isSolid(Math.floor(o.x / TILE), Math.floor(o.y / TILE))) { o.x = e.x; o.y = e.y; } }
      e.carry = null; return;
    }
    // The fist is over his head, a tile and a half up the screen: where that is stone (his back to a wall)
    // what he holds is kept at his feet, never in the wall; and a bomb about to go off goes off on him.
    if (game.world.isSolid(Math.floor(at.x / TILE), Math.floor(at.y / TILE)) || (o.kind === 'bomb' && o.fuseT >= 0 && o.fuseT < 0.15)) at = { x: e.x, y: e.y };
    o.x = at.x; o.y = at.y; o.vx = 0; o.vy = 0;
    if (c.type === 'goat') { o.runT = 0; o.runUp = 1; }
  },
  // Out of his hands for any reason but the throw: a blow, a fire, a death. Whatever it is comes down
  // where he stands, and a crate comes down on him (`drop` s of it); the goat lands on his feet a beat later.
  drop(e, game) {
    const c = e.carry; e.carry = null; if (!c) return;
    const T = TUNING.thrower, o = c.o, g = game.goat;
    const a = e.facing, px = e.x + Math.cos(a) * (e.r + 6), py = e.y + Math.sin(a) * (e.r + 6);
    const spot = game.world.isSolid(Math.floor(px / TILE), Math.floor(py / TILE)) ? { x: e.x, y: e.y } : { x: px, y: py };
    o.held = false; o.x = spot.x; o.y = spot.y; o.vx = 0; o.vy = 0;
    if (c.type === 'prop') {
      if (o.kind === 'crate') { o.shatter(game); if (!e.dead) { e.dazed = Math.max(e.dazed, T.drop); game.floatText(e.x, e.y - 34, 'ON HIS HEAD', PALETTE.bone); } }
    } else if (c.type === 'man') {
      o.liftedBy = null; o.state = 'floored'; o.timer = TUNING.bearer.flooredTime;
    } else if (c.type === 'beast') {
      o.tossed = false; if (o.kind === 'chicken') { o.birdState = 'stunned'; o.birdT = TUNING.prop.chicken.stunned || 0.6; }
    } else if (c.type === 'goat') {
      if (g.state === 'carried') { g.state = 'stunned'; g.timer = TUNING.thrower.grab.land; g.carriedBy = null; game.world.collideCircle(g); }
    }
    if (!e.dead) game.bark(e, 'drop', 0.7);
  },

  // Set down on purpose (he waited too long for a throw): in front of him, whole, nobody hurt by it.
  putDown(e, game) {
    const c = e.carry; e.carry = null; if (!c || c.type === 'goat') return;
    const o = c.o, a = e.facing, px = e.x + Math.cos(a) * (e.r + 8), py = e.y + Math.sin(a) * (e.r + 8);
    const ok = !game.world.isSolid(Math.floor(px / TILE), Math.floor(py / TILE));
    o.held = false; o.x = ok ? px : e.x; o.y = ok ? py : e.y; o.vx = 0; o.vy = 0;
    if (c.type === 'man') { o.liftedBy = null; o.state = 'chase'; }
    if (c.type === 'beast') o.tossed = false;
  },

  // ---- the throw ----
  release(e, game, aim) {
    const T = TUNING.thrower, c = e.carry, slow = game.mods.enemySlow;
    e.carry = null; e.twAim = null; e.state = 'recover'; e.timer = T.recover * slow; e.twCd = T.cd * slow;
    if (!c) return;
    const o = c.o, a = Math.atan2(aim.y - e.y, aim.x - e.x), ux = Math.cos(a), uy = Math.sin(a);
    // It leaves from in front of him, not from the fist over his head: the fist is a picture, and from
    // up there the first step was through whatever wall stood behind him.
    const sx = e.x + ux * (e.r + (o.r || 10) + 2), sy = e.y + uy * (e.r + (o.r || 10) + 2);
    const ok = !game.world.isSolid(Math.floor(sx / TILE), Math.floor(sy / TILE));
    o.x = ok ? sx : e.x; o.y = ok ? sy : e.y; o.held = false;
    if (c.type === 'prop') { o.fling(ux * T.thing, uy * T.thing, true); o.byCult = e; }
    else if (c.type === 'man') {
      o.liftedBy = null; o.fling(ux * T.man, uy * T.man, true); o.flungBy = e; o.tossBy = e;
    } else if (c.type === 'beast') {
      o.held = true;   // in the air its own step stays off it (`Thrower.fly`)
      (game.tossed || (game.tossed = [])).push({ p: o, vx: ux * T.beast, vy: uy * T.beast, by: e });
      if (Math.abs(ux) > 0.1) o.face = Math.sign(ux);
    }
    e.twFollow = 0.3;   // the throw's follow-through, drawn (js/thrower-pixels.js)
    game.audio.sfxSwing(); game.world.emitNoise(e.x, e.y, TUNING.noise.swing, 'cult'); game.bark(e, 'lift', 0.25);
  },

  // ---- the goat ----
  catchGoat(e, game) {
    const T = TUNING.thrower, g = game.goat;
    if (g.holding) { const o = g.holding; g.holding = null; o.held = false; g.autoHeld = false; g.spendGrab(game, !o.item); if (!o.item) { o.fromMouth = false; o.state = 'floored'; o.timer = TUNING.bearer.flooredTime; } }
    g.state = 'carried'; g.carriedBy = e; g.vx = 0; g.vy = 0; g.runT = 0; g.runUp = 1;
    e.carry = { o: g, type: 'goat' }; e.state = 'twhold'; e.timer = T.grab.hold * game.mods.enemySlow;
    e.twDir = Thrower.pick(e, game);
    game.audio.sfxThud(); game.hitstop(0.05); game.vibe(30);
    game.floatText(g.x, g.y - 30, 'GRABBED', PALETTE.fireHi);
    Thrower.hold(e, game);
  },
  // Which way he throws him: the worst thing within the throw's reach (`grab.pick` tiles), a drop before
  // fire before a grate before stone met hard enough to hurt, and the nearest of a kind first. Nothing
  // there, the way he is already facing.
  pick(e, game) {
    const G = TUNING.thrower.grab, w = game.world, range = Math.min(G.pick * TILE, G.speed / G.drag);
    let best = e.facing, bestS = -1;
    for (let k = 0; k < 24; k++) {
      const a = k / 24 * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a);
      let score = 0;
      for (let s = e.r + 10; s < range; s += 6) {
        const x = e.x + ux * s, y = e.y + uy * s, v = G.speed - G.drag * s, tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
        const near = 1 - s / range * 0.3;
        if (w.isPitPx(x, y)) { score = 100 * near; break; }
        if (w.isBurningPx(x, y)) { score = 80 * near; break; }
        if (w.isSolid(tx, ty)) { score = v > G.hurt ? 60 * near : 4; break; }
        const p = game.props.find((q) => !q.broken && Math.abs(q.x - x) < (q.r || 10) + 6 && Math.abs(q.y - y) < (q.r || 10) + 6 && (q.blocking || q.kind === 'spike'));
        if (p) { score = p.kind === 'spike' ? 70 * near : p.kind === 'brazier' ? 78 * near : v > G.hurt ? 55 * near : 3; break; }
      }
      if (score > bestS + 0.01) { bestS = score; best = a; }
    }
    return bestS > 0 ? best : e.facing;
  },
  toss(e, game) {
    const T = TUNING.thrower, G = T.grab, g = game.goat, a = e.twDir, ux = Math.cos(a), uy = Math.sin(a);
    e.carry = null; e.state = 'recover'; e.timer = T.recover * game.mods.enemySlow; e.grabCd = G.cd * game.mods.enemySlow;
    if (g.state !== 'carried') return;
    const sx = e.x + ux * (e.r + g.r + 2), sy = e.y + uy * (e.r + g.r + 2);
    const ok = !game.world.isSolid(Math.floor(sx / TILE), Math.floor(sy / TILE));
    g.x = ok ? sx : e.x; g.y = ok ? sy : e.y;
    e.twFollow = 0.3;
    g.state = 'tossed'; g.carriedBy = null; g.tossedBy = e; g.vx = ux * G.speed; g.vy = uy * G.speed; g.facing = a;
    game.audio.sfxSwing(); game.audio.sfxBleat(620, 0.3, 0.3); game.bark(e, 'toss', 0.8); game.vibe(20);
  },
  // `Goat.update` for the two states only he puts the goat in. Carried: nothing, his step sets where.
  // Thrown: a body in the air, slowing at `grab.drag`, burning over fire like anyone, and whatever stone he
  // meets fast enough costs him (`goatHits`); the drop is found by the game's own check on him.
  goatStep(g, dt, game) {
    const G = TUNING.thrower.grab, w = game.world;
    if (g.state === 'carried') {
      const e = g.carriedBy;
      if (!e || e.dead || !e.carry || e.carry.o !== g) { g.state = 'stunned'; g.timer = G.land; g.carriedBy = null; w.collideCircle(g); return; }
      g.vx = 0; g.vy = 0; g.runT = 0; g.runUp = 1;
      return;
    }
    const drag = Math.exp(-G.drag * dt); g.vx *= drag; g.vy *= drag;
    const spd = hyp(g.vx, g.vy), steps = Math.max(1, Math.ceil(spd * dt / (g.r * 0.9)));
    let impact = 0;
    for (let i = 0; i < steps; i++) { g.x += g.vx * dt / steps; g.y += g.vy * dt / steps; impact = Math.max(impact, w.collideCircle(g)); }
    g.burnStep(game, w, dt);
    if (g.dead || g.state !== 'tossed') return;
    if (impact > G.hurt) { Thrower.goatHits(game, g, 'stone'); return; }
    if (hyp(g.vx, g.vy) < 1.5 * TILE) { g.state = 'stunned'; g.timer = G.land; g.vx *= 0.3; g.vy *= 0.3; g.tossedBy = null; game.dust(g.x, g.y, TUNING.juice.dust.land, 0, 0); }
  },
  // The thrown goat meets something hard: the heart it costs (killer: the man who threw him), and he is
  // on the floor where he stopped.
  goatHits(game, g, what) {
    const G = TUNING.thrower.grab, by = g.tossedBy;
    const sp = hyp(g.vx, g.vy) || 1, kx = -g.vx / sp * TILE, ky = -g.vy / sp * TILE;
    g.vx *= 0.15; g.vy *= 0.15;
    g.invuln = 0;   // the throw itself never touched him; this is the blow
    g.damage(G.hurtN, game, kx, ky, false, by || 'toss');
    game.shake(6, true); game.hitstop(0.06); game.dust(g.x, g.y, TUNING.juice.dust.land, kx, ky);
    if (!g.dead && g.state !== 'ko') { g.state = 'stunned'; g.timer = G.land; } g.tossedBy = null;   // `ko` is SECOND CHANCE's
    game.floatText(g.x, g.y - 34, what === 'stone' ? 'SLAMMED' : 'CRASH', PALETTE.fireHi);
  },
  // The thrown goat through a man of the cult: the man goes down, the goat slows.
  goatIntoMan(game, g, e, nx, ny) {
    if (hyp(g.vx, g.vy) < TUNING.physics.knockHitSpeed || e === g.tossedBy) return;
    if (e.kind !== 'butcher' && e.kind !== 'ratogre' && !e.unliftable) { e.state = 'floored'; e.timer = TUNING.bearer.flooredTime; e.aware = true; e.vx = g.vx * 0.4; e.vy = g.vy * 0.4; }
    g.vx *= 0.45; g.vy *= 0.45;
    game.audio.sfxThud(); game.particles(e.x, e.y - 6, 5, PALETTE.bone, 120);
  },

  // ---- what he throws, meeting the goat ----
  // A thing out of his hands (`byCult`) reaching the goat: `hit` hearts. True if it did (the thing ends there).
  thingHitsGoat(game, p) {
    const g = game.goat, by = p.byCult;
    if (!by || g.dead || g.leap || g.state === 'carried' || g.state === 'tossed') return false;
    if (hyp(g.x - p.x, g.y - p.y) > g.r + (p.r || 10)) return false;
    const sp = hyp(p.vx, p.vy) || 1;
    g.damage(TUNING.thrower.hit, game, p.vx / sp * TILE * 2, p.vy / sp * TILE * 2, false, by);
    return true;
  },
  // A man he threw meeting the goat (`Game.collideEntities`): the same heart, and the man is floored by it.
  manHitsGoat(game, e, g) {
    const sp = hyp(e.vx, e.vy) || 1, by = e.tossBy; e.tossBy = null;
    if (g.state === 'carried' || g.state === 'tossed') return;
    g.damage(TUNING.thrower.hit, game, e.vx / sp * TILE * 2, e.vy / sp * TILE * 2, false, by);
    e.vx *= -0.3; e.vy *= -0.3;
  },
  // Animals in the air (`game.tossed`): his throw, its own drag; stone or a man brings it down, the goat
  // takes `hit` from it, a drop takes it, and the throw hurts the animal once (`Beast.hurt`) on what it meets.
  fly(dt, game) {
    const L = game.tossed; if (!L || !L.length) return;
    const T = TUNING.thrower, w = game.world, g = game.goat;
    for (let i = L.length - 1; i >= 0; i--) {
      const f = L[i], p = f.p;
      const land = (hurt) => {
        L.splice(i, 1); p.held = false; p.tossed = false; p.vx = 0; p.vy = 0;
        if (hurt) Beast.hurt(p, game, 'thrown');
        if (p.kind === 'tortoise') Beast.land(p, game);
        if (p.kind === 'chicken' && !p.broken) { p.birdState = 'stunned'; p.birdT = TUNING.prop.chicken.stunned || 0.6; }
        game.audio.sfxThud();
      };
      if (p.broken) { L.splice(i, 1); continue; }
      const drag = Math.exp(-T.beastDrag * dt); f.vx *= drag; f.vy *= drag;
      p.x += f.vx * dt; p.y += f.vy * dt;
      // the flight's speed is the throw's (`f`), so lend it to the body for the wall to measure the blow by
      p.vx = f.vx; p.vy = f.vy;
      const impact = w.collideCircle(p), spd = hyp(f.vx, f.vy);
      f.vx = p.vx; f.vy = p.vy; p.vx = 0; p.vy = 0;
      if (w.isPitPx(p.x, p.y)) { L.splice(i, 1); p.held = false; p.tossed = false; p.gone(game); continue; }
      if (impact > 2 * TILE) { land(true); continue; }
      if (!g.dead && !g.leap && g.state !== 'carried' && g.state !== 'tossed' && hyp(g.x - p.x, g.y - p.y) < g.r + (p.r || 10)) {
        g.damage(T.hit, game, f.vx / (spd || 1) * TILE * 2, f.vy / (spd || 1) * TILE * 2, false, f.by);
        land(true); continue;
      }
      const m = (game.liveEnemies || game.enemies).find((e) => e !== f.by && !e.dead && !e.held && !e.ghosted && hyp(e.x - p.x, e.y - p.y) < e.r + (p.r || 10));
      if (m) {
        if (m.kind !== 'butcher' && m.kind !== 'ratogre') { m.state = 'floored'; m.timer = TUNING.prop.crate.stun; m.aware = true; m.vx = f.vx * 0.3; m.vy = f.vy * 0.3; }
        land(true); continue;
      }
      if (spd < 2 * TILE) land(false);
    }
  },
};
