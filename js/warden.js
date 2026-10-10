// THE WARDEN's fight (10 Oct 2026, the user's: "he sometimes blocks your butts and fire from the front, hurts with a sword of
// a fair reach and a high speed, tumbles out of the way when you run straight at him, and at a middle or far distance aims
// and shoots; seven hearts"). `TUNING.warden`. He is a bearer with `e.warden` (`Warden.give`): the shieldman's board on his
// arm, never worn out, up for a stretch and down for a stretch (`guardOff`, what "sometimes" is) and always down through an
// aim or a roll; the sword is the clubman's blow on his own numbers (`atk` reads `warden.sword`); the roll (`wroll`) is a
// dash to the side off a goat running at him; the gun is the rifleman's aim and THE THRESHING FLOOR's shotgun
// (`EndBoss.shotgun`), the reload with it broken open the window to close in. `step` is asked first in `updateBearer`.
// Beaten (his last heart gone, `Enemy.die`), he is not dead: `transform` puts the soul he carries into THE FLAYED, the
// second phase, an ogre (kind `butcher`) with his own flayed body (js/flayed-pixels.js), the corrupted ogre's witchfire
// (js/waves.js, `soulMeet`), faster and `monster.hp` hearts, fire off his fists; "an ogre upgraded, for now".
const Warden = {
  give(e) {
    const W = TUNING.warden;
    e.warden = true; e.boss = true; e.elite = true;
    e.hp = e.maxHp = W.hp;
    e.shield = { uses: 999, jolt: 0, ang: e.facing };   // the board: `shieldUp` / `shieldCovers` are what every reach asks
    e.shotgun = W.gun;
    e.speed = e.cfg.speed * W.speedMul;
    e.gunCd = W.gun.first; e.rollCd = W.roll.first; e.guardT = W.guard.up; e.guardOff = false; e.pose = 'idle';
    return e;
  },
  // His part of the clubman's update: true while he is in one of his own states.
  step(e, dt, game, sees) {
    const W = TUNING.warden, g = game.goat, slow = game.mods.enemySlow;
    e.rollCd = Math.max(0, (e.rollCd || 0) - dt); e.gunCd = Math.max(0, (e.gunCd || 0) - dt);
    // the guard's own clock: a stretch up, a stretch down, jittered so it cannot be counted
    e.guardT -= dt;
    if (e.guardT <= 0) { e.guardOff = !e.guardOff; e.guardT = (e.guardOff ? W.guard.down : W.guard.up) * (0.7 + Math.random() * 0.6); }
    const dx = g.x - e.x, dy = g.y - e.y, d = hyp(dx, dy), reach = e.atk('reach');
    if (e.state === 'chase') {
      e.chaseGoat(game, e.speed, dt);
      if (g.dead) return true;
      // the tumble: the goat running straight at him, close enough to mean it
      const gs = hyp(g.vx || 0, g.vy || 0), R = W.roll;
      if (e.rollCd <= 0 && d > R.min * TILE && d < R.range * TILE && gs > R.goatSpeed * TILE
        && Math.abs(angleDiff(Math.atan2(g.vy, g.vx), Math.atan2(dy, dx) + Math.PI)) < R.cone) {
        const side = Math.random() < 0.5 ? 1 : -1, at = Math.atan2(dy, dx);
        for (const s of [side, -side]) {
          const a = e.clearAng(game, at + s * Math.PI / 2, R.dist * TILE, e.x, e.y, undefined, null);
          if (a === null || Math.abs(angleDiff(a, at + s * Math.PI / 2)) > 0.6) continue;
          e.state = 'wroll'; e.timer = R.time; e.vx = Math.cos(a) * R.dist * TILE / R.time; e.vy = Math.sin(a) * R.dist * TILE / R.time;
          e.rollCd = R.cd; e.rollAng = a; game.dust(e.x, e.y, 6, 0, 0); game.audio.sfxSwing();
          return true;
        }
        e.rollCd = R.cd * 0.4;
      }
      // the gun, at a distance with the line clear of his own men
      const G = W.gun;
      if (sees && e.gunCd <= 0 && d > G.min * TILE && d < G.max * TILE && e.poison <= 0 && !e.friendInLine(game, Math.atan2(dy, dx))) {
        e.state = 'aim'; e.timer = G.aimTime * slow; e.vx = 0; e.vy = 0; e.facing = Math.atan2(dy, dx);
        if (!game.hidden(e.x, e.y)) game.audio.sfxCock(clamp(1 - d / (TUNING.hunter.cockHear * TILE), 0, 1));
        return true;
      }
      // the sword
      if (d < reach + g.r) { e.state = 'windup'; e.timer = e.atk('windup') * slow; e.vx = 0; e.vy = 0; game.bark(e, 'attack', 0.25); }
      return true;
    }
    if (e.state === 'wroll') {
      e.facing = e.rollAng;   // turned into the tumble: the board's rule moves a man only along his facing
      e.timer -= dt;
      if (e.timer <= 0 || e.wallHit) { e.vx = 0; e.vy = 0; e.state = 'recover'; e.timer = W.roll.recover * slow; }
      return true;
    }
    if (e.state === 'aim') {
      e.vx = 0; e.vy = 0; e.facing = Math.atan2(dy, dx); e.timer -= dt;
      if (!sees || e.poison > 0) { e.state = 'chase'; return true; }
      if (e.friendInLine(game, e.facing)) { e.state = 'chase'; e.stepOff(); return true; }
      if (e.timer <= 0) {
        EndBoss.shotgun(e, game, (Math.random() - 0.5) * 0.08);
        e.gunCd = W.gun.reload; e.state = 'recover'; e.timer = W.gun.recover * slow;   // broken open to reload: the window
      }
      return true;
    }
    if (e.state === 'windup') {
      e.vx = 0; e.vy = 0; e.facing = Math.atan2(dy, dx); e.timer -= dt;
      if (e.timer <= 0) { e.state = 'swing'; e.timer = e.atk('swing') * slow; game.audio.sfxSwing(); game.world.emitNoise(e.x, e.y, TUNING.noise.swing, 'cult'); e.swingHit = false; }
      return true;
    }
    if (e.state === 'swing') {
      e.timer -= dt;
      if (!e.swingHit) { e.swingHit = true; game.meleeHit(e, reach + 6, W.sword.arc, e.atk('damage'), e.atk('knock')); }
      if (e.timer <= 0) { e.state = 'recover'; e.timer = e.atk('recover') * slow; }
      return true;
    }
    if (e.state === 'recover') { e.vx = 0; e.vy = 0; e.timer -= dt; if (e.timer <= 0) e.state = 'chase'; return true; }
    return false;
  },
  // His last heart gone: the soul in him swallowed, and THE FLAYED stands where he stood.
  transform(game, e) {
    const M = TUNING.warden.monster;
    e.wardenGone = true;
    const m = new Enemy(e.x, e.y, 'butcher');
    m.boss = true; m.elite = false; m.flayed = true; m.room = e.room; m.aware = true; m.woke = true; m.facing = e.facing;
    game.ensoul(m); m.soulGate = e.soulGate; m.soulMeet = M.meet;
    m.hp = m.maxHp = M.hp; m.speed = m.cfg.speed * M.speedMul;
    m.state = 'emerge'; m.timer = M.emerge;
    const i = game.enemies.indexOf(e); if (i >= 0) game.enemies.splice(i, 1, m); else game.enemies.push(m);
    e.dead = true; e.state = 'dead';
    if (game.goat.holding === e) game.goat.holding = null;
    game.flash(PALETTE.witch, 0.22); game.ring(m.x, m.y, 2.8 * TILE, PALETTE.witchHi); game.ring(m.x, m.y, 1.6 * TILE, PALETTE.witch, 0.8, 4);
    game.particles(m.x, m.y - 30, 40, PALETTE.witchHi, 240); game.particles(m.x, m.y - 20, 24, PALETTE.blood, 180);
    game.floatText(m.x, m.y - 76, 'HE TAKES THE SOUL', PALETTE.witchHi);
    game.audio.sfxToll(); game.audio.sfxRune(); if (game.audio.sfxGroan) game.audio.sfxGroan('butcher');
    game.shake(9); game.hitstop(0.12); game.thud(m.x, m.y, 10);
    if (game.supper) { game.supper.phase = 'monster'; game.supper.monster = m; }
    return m;
  },
  // The fire off THE FLAYED's fists, every frame he stands (render-side particles off his sides).
  fistFire(game, m, dt) {
    if (!m || m.dead || game.hidden(m.x, m.y)) return;
    const F = TUNING.warden.monster.fists, up = m.state === 'slamwind' || m.state === 'hopwind' || m.state === 'hop';
    if (Math.random() > dt * F.rate) return;
    const s = Math.random() < 0.5 ? -1 : 1, fx = m.x + Math.cos(m.facing + s * 1.2) * m.r * 0.9, fy = m.y - (up ? F.up : F.low) + Math.sin(m.facing + s * 1.2) * m.r * 0.4;
    game.particles(fx, fy, 1, Math.random() < 0.6 ? PALETTE.witch : PALETTE.witchHi, F.speed);
  },
};
if (typeof module !== 'undefined') module.exports = Warden;
