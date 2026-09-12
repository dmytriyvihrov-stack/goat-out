// Enemies: Bearer (melee), Hunter (rifle), Butcher (heavy). One class, behaviour switches on kind.
class Enemy {
  constructor(x, y, kind) {
    const cfg = TUNING[kind];
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.kind = kind; this.cfg = cfg;
    this.r = cfg.radius; this.hp = cfg.hp || 1; this.speed = cfg.speed;
    this.state = 'idle'; this.timer = 0; this.facing = Math.random() * Math.PI * 2;
    this.aware = false; this.target = null; this.lastSeen = null;
    this.flung = false; this.thrown = false; this.held = false; this.dead = false;
    this.burning = 0; this.burnDir = 0; this.burnTick = 0; this.chargeCd = 0; this.reload = 0; this.flash = 0;
    this.lastLunge = -1; this.shieldHits = 0; this.wander = Math.random() * 3; this.lostTimer = 0;
    this.bombFuse = 0; this.flail = 0; this.heldSwing = 0;
    this.castCd = Math.random() * 1.2; this.blinkCd = 0; this.rune = null; this.blinkFx = 0;
    this.elite = false; this.boss = false; this.millCd = 0;
    this.gotUpFrom = null;
  }

  fling(vx, vy, thrown) {
    if (this.dead) return;
    this.vx = vx; this.vy = vy; this.state = 'flung'; this.flung = true; this.thrown = thrown; this.held = false; this.aware = true;
  }

  ignite(game) {
    if (this.dead || this.burning > 0) return;
    this.burning = this.kind === 'butcher' ? 3.0 : TUNING.fire.burnRunTime;
    this.burnDir = Math.random() * Math.PI * 2; this.burnTick = 0;
    if (this.kind !== 'butcher') { this.state = 'burning'; this.held = false; }
    game.audio.sfxFire(); game.floatText(this.x, this.y - 26, 'AAAAH', PALETTE.fire);
    this.aware = true;
  }

  die(game, cause, dx, dy) {
    if (this.dead) return;
    // An arena elite eats the first hits: he goes down, gets back up, and a Seer blinks clear.
    if (this.elite && this.hp > 1 && cause !== 'burn' && cause !== 'devour') {
      this.hp -= 1; this.flash = 0.3; this.aware = true;
      this.state = 'floored'; this.timer = 0.75; this.vx = 0; this.vy = 0; this.thrown = false; this.flung = false;
      game.world.splat(this.x, this.y, dx || 0, dy || 0, 13);
      game.hitstop(0.05); game.shake(7); game.audio.sfxThud();
      game.floatText(this.x, this.y - 34, this.hp + ' LEFT', PALETTE.fireHi);
      if (this.kind === 'seer') this.blinkCd = 0;
      return;
    }
    this.dead = true; this.state = 'dead';
    const w = game.world;
    if (cause === 'burn') { w.scorch(this.x, this.y, this.r * 1.6); w.body(this.x, this.y, this.r, this.facing, '#241a16'); }
    else {
      w.splat(this.x, this.y, dx || 0, dy || 0, this.kind === 'butcher' ? 26 : 16);
      w.body(this.x, this.y, this.r, Math.atan2(dy || 0, dx || 1), PALETTE.ink);
      if (this.kind === 'hunter') w.dot(this.x + 8, this.y + 6, 3, '#3a3236');
    }
    if (game.goat.holding === this) game.goat.holding = null;
    if (this.boss) game.dropTome(this.x, this.y);
    game.onKill(this, cause);
  }

  // Bomb Charge: the man you headbutted goes off, and takes the room with him.
  explode(game) {
    if (this.exploded) return;
    this.exploded = true;
    const B = TUNING.goat.bomb, w = game.world;
    w.splat(this.x, this.y, 0, 0, 30); w.scorch(this.x, this.y, B.radius * 0.5);
    game.particles(this.x, this.y, 30, PALETTE.blood, 320);
    game.particles(this.x, this.y, 16, PALETTE.fire, 260);
    game.ring(this.x, this.y, B.radius, PALETTE.fireHi);
    game.shake(13); game.hitstop(0.05); game.audio.sfxBoom(); game.vibe(35);
    w.emitNoise(this.x, this.y, TUNING.noise.boom);
    for (const o of game.enemies) {
      if (o === this || o.dead || o.held) continue;
      const dx = o.x - this.x, dy = o.y - this.y, d = Math.hypot(dx, dy);
      if (d > B.radius) continue;
      const nx = dx / (d || 1), ny = dy / (d || 1);
      if (o.kind === 'butcher') { o.hp -= 1; o.flash = 0.2; o.state = 'stagger'; o.timer = 0.4; if (o.hp <= 0) o.die(game, 'splat', nx, ny); }
      else o.fling(nx * B.impulse, ny * B.impulse, true);
    }
    const g = game.goat, gd = Math.hypot(g.x - this.x, g.y - this.y);
    if (gd < B.radius && !g.dead) { const nx = (g.x - this.x) / (gd || 1), ny = (g.y - this.y) / (gd || 1); g.vx += nx * 320; g.vy += ny * 320; }
    this.die(game, 'boom', 0, 0);
  }

  canSeeGoat(game) {
    const g = game.goat; if (g.dead) return false;
    const dx = g.x - this.x, dy = g.y - this.y, d = Math.hypot(dx, dy);
    if (d > this.cfg.sight * TILE) return false;
    const ang = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(this.facing, ang)) > this.cfg.cone / 2 && d > 2.5 * TILE) return false;
    return game.world.los(this.x, this.y, g.x, g.y);
  }

  moveToward(dirx, diry, speed, dt) {
    const l = Math.hypot(dirx, diry) || 1;
    this.vx = dirx / l * speed; this.vy = diry / l * speed;
    if (speed > 0) this.facing = Math.atan2(this.vy, this.vx);
  }
  // Steer toward the goat using the flow field, or directly when close with line of sight.
  chaseGoat(game, speed, dt) {
    const g = game.goat, w = game.world;
    const dx = g.x - this.x, dy = g.y - this.y, d = Math.hypot(dx, dy);
    if (d < 3.5 * TILE && w.los(this.x, this.y, g.x, g.y)) { this.moveToward(dx, dy, speed, dt); return d; }
    const f = w.flowDir(this.x, this.y);
    if (f) this.moveToward(f.x, f.y, speed, dt); else this.moveToward(dx, dy, speed * 0.5, dt);
    return d;
  }

  update(dt, game) {
    if (this.dead) return;
    const w = game.world, g = game.goat, cfg = this.cfg;
    this.chargeCd = Math.max(0, this.chargeCd - dt); this.reload = Math.max(0, this.reload - dt);
    this.flash = Math.max(0, this.flash - dt); this.lured = Math.max(0, (this.lured || 0) - dt);
    this.flail = Math.max(0, this.flail - dt);
    if (this.bombFuse > 0) { this.bombFuse -= dt; if (this.bombFuse <= 0) { this.explode(game); return; } }

    // ---- burning ----
    if (this.burning > 0) {
      this.burning -= dt;
      w.ignitePx(this.x, this.y);
      if (this.kind === 'butcher') {
        this.burnTick += dt;
        if (this.burnTick >= cfg.burnTick) { this.burnTick = 0; this.hp -= 1; game.floatText(this.x, this.y - 30, 'BURNING', PALETTE.fire); if (this.hp <= 0) { this.die(game, 'burn'); return; } }
      } else {
        if (Math.random() < dt * 4) this.burnDir += (Math.random() - 0.5) * 2.5;
        this.moveToward(Math.cos(this.burnDir), Math.sin(this.burnDir), TUNING.fire.burnRunSpeed, dt);
        this.x += this.vx * dt; this.y += this.vy * dt;
        if (w.collideCircle(this) > 0) this.burnDir += Math.PI * (0.6 + Math.random() * 0.8);
        if (this.burning <= 0) { this.die(game, 'burn'); return; }
        if (Math.random() < dt * 25) game.particles(this.x, this.y, 1, PALETTE.fire, 60);
        return;
      }
    }
    if (this.state === 'held') {
      // A held Hunter keeps shooting where he is pointed. With Living Shield a held Bearer
      // keeps swinging too, and everything he hits is on his own side.
      if (this.kind === 'hunter' && this.reload <= 0) {
        this.reload = cfg.reload * (game.mods.livingShield ? 0.55 : 1);
        game.fireBullet(this, Math.cos(this.facing), Math.sin(this.facing));
      }
      if (game.mods.livingShield && this.kind !== 'hunter') {
        this.heldSwing -= dt;
        if (this.heldSwing <= 0) {
          this.heldSwing = 0.5; this.flail = 0.25;
          game.meleeHit(this, cfg.reach + 12, Math.PI * 0.9, cfg.damage, cfg.knock, true);
          game.audio.sfxSwing();
        }
      }
      return;
    }

    // ---- flung bodies ----
    if (this.state === 'flung') {
      const drag = Math.exp(-TUNING.physics.flungDrag * dt);
      this.vx *= drag; this.vy *= drag;
      this.x += this.vx * dt; this.y += this.vy * dt;
      const preSpeed = Math.hypot(this.vx, this.vy);
      const impact = w.collideCircle(this);
      if (impact > TUNING.physics.splatSpeed) {
        if (this.bombFuse > 0) { this.explode(game); return; }
        this.die(game, 'splat', this.vx / (preSpeed || 1), this.vy / (preSpeed || 1)); return;
      }
      if (impact > 0 && this.thrown && this.kind !== 'butcher') { this.die(game, 'splat', 0, 0); return; }
      if (w.isBurningPx(this.x, this.y)) { this.ignite(game); return; }
      if (game.touchingBrazier(this)) { this.ignite(game); return; }
      if (Math.hypot(this.vx, this.vy) < TUNING.physics.flungFloorSpeed) { this.state = 'floored'; this.timer = TUNING.bearer.flooredTime; this.flung = false; this.thrown = false; }
      return;
    }
    if (this.state === 'floored' || this.state === 'stagger' || this.state === 'stunned') {
      this.timer -= dt; this.vx *= 0.85; this.vy *= 0.85;
      this.x += this.vx * dt; this.y += this.vy * dt; w.collideCircle(this);
      if (w.isBurningPx(this.x, this.y)) { this.ignite(game); return; }
      if (this.timer <= 0) {
        this.aware = true; this.state = 'chase';
        // The Butcher answers a stagger with a quick retaliation swing if you stayed close.
        if (this.kind === 'butcher' && !g.dead && Math.hypot(g.x - this.x, g.y - this.y) < cfg.reach * 1.6 + g.r) { this.state = 'windup'; this.timer = cfg.windup * 0.55; }
      }
      return;
    }

    // ---- perception ----
    const sees = this.canSeeGoat(game);
    if (sees) { this.aware = true; this.lastSeen = { x: g.x, y: g.y }; this.lostTimer = 0; }
    else if (this.aware) {
      this.lostTimer += dt;
      // Lose the trail: no sight for a while and far away by path, go check the last place you were seen.
      if (this.lostTimer > 6 && w.flowDist(this.x, this.y) > 14 && this.state !== 'held') {
        this.aware = false; this.lostTimer = 0; this.target = this.lastSeen; this.state = 'investigate';
      }
    }
    for (const n of w.noises) {
      if (Math.hypot(n.x - this.x, n.y - this.y) > n.r) continue;
      if (n.kind === 'lure') {
        // A scream pulls everyone who hears it to the spot, even men already hunting you.
        // Stand still and they find you; move and they search where you were.
        this.target = { x: n.x, y: n.y }; this.state = 'investigate'; this.aware = false; this.lostTimer = 0;
        this.facing = Math.atan2(n.y - this.y, n.x - this.x); this.lured = 1.2;
      } else if (!this.aware) {
        this.target = { x: n.x, y: n.y }; if (this.state === 'idle') this.state = 'investigate';
        this.facing = Math.atan2(n.y - this.y, n.x - this.x);
      }
    }
    if (this.aware && (this.state === 'idle' || this.state === 'investigate')) this.state = 'chase';
    if (w.isBurningPx(this.x, this.y)) { this.ignite(game); return; }

    if (this.kind === 'bearer') this.updateBearer(dt, game, sees);
    else if (this.kind === 'hunter') this.updateHunter(dt, game, sees);
    else if (this.kind === 'seer') this.updateSeer(dt, game, sees);
    else this.updateButcher(dt, game, sees);

    this.x += this.vx * dt; this.y += this.vy * dt;
    const impact = w.collideCircle(this);
    if (this.state === 'charge' && impact > 3 * TILE) {
      this.state = 'stunned'; this.timer = cfg.stun; this.vx = 0; this.vy = 0; this.chargeCd = cfg.chargeCooldown;
      game.shake(6); game.audio.sfxSplat(); game.hitstop(0.04); game.floatText(this.x, this.y - 34, 'STUNNED', PALETTE.fireHi);
      w.emitNoise(this.x, this.y, TUNING.noise.splat);
    }
  }

  idleWander(dt, game) {
    this.wander -= dt;
    if (this.wander <= 0) { this.wander = 1 + Math.random() * 3; this.facing += (Math.random() - 0.5) * 2; }
    this.vx = 0; this.vy = 0;
  }
  investigate(dt, game) {
    if (!this.target) { this.state = 'idle'; return; }
    const dx = this.target.x - this.x, dy = this.target.y - this.y, d = Math.hypot(dx, dy);
    if (d < TILE || (this.wallHit && Math.random() < dt * 2)) { this.target = null; this.state = 'idle'; this.vx = 0; this.vy = 0; return; }
    this.moveToward(dx, dy, this.speed * 0.6, dt);
  }

  updateBearer(dt, game, sees) {
    const g = game.goat, cfg = this.cfg;
    if (this.state === 'idle') { this.idleWander(dt, game); return; }
    if (this.state === 'investigate') { this.investigate(dt, game); return; }
    if (this.state === 'chase') {
      const d = this.chaseGoat(game, this.speed, dt);
      if (d < cfg.reach + g.r && !g.dead) { this.state = 'windup'; this.timer = cfg.windup; this.vx = 0; this.vy = 0; }
      return;
    }
    if (this.state === 'windup') {
      this.vx = 0; this.vy = 0; this.facing = Math.atan2(g.y - this.y, g.x - this.x); this.timer -= dt;
      if (this.timer <= 0) { this.state = 'swing'; this.timer = cfg.swing; game.audio.sfxSwing(); game.world.emitNoise(this.x, this.y, TUNING.noise.swing); this.swingHit = false; }
      return;
    }
    if (this.state === 'swing') {
      this.timer -= dt;
      if (!this.swingHit) { this.swingHit = true; game.meleeHit(this, cfg.reach + 6, Math.PI / 2, cfg.damage, cfg.knock); }
      if (this.timer <= 0) { this.state = 'recover'; this.timer = cfg.recover; }
      return;
    }
    if (this.state === 'recover') { this.vx = 0; this.vy = 0; this.timer -= dt; if (this.timer <= 0) this.state = 'chase'; }
  }

  updateHunter(dt, game, sees) {
    const g = game.goat, cfg = this.cfg;
    if (this.state === 'idle') { this.idleWander(dt, game); return; }
    if (this.state === 'investigate') { this.investigate(dt, game); return; }
    const dx = g.x - this.x, dy = g.y - this.y, d = Math.hypot(dx, dy);
    if (this.state === 'aim') {
      this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx); this.timer -= dt;
      if (!sees) { this.state = 'chase'; return; }
      if (this.timer <= 0) {
        const spread = (Math.random() - 0.5) * 0.1;
        game.fireBullet(this, Math.cos(this.facing + spread), Math.sin(this.facing + spread));
        this.reload = cfg.reload; this.state = 'chase';
      }
      return;
    }
    // chase: keep distance, shoot when possible
    if (sees && this.reload <= 0 && d < cfg.sight * TILE) { this.state = 'aim'; this.timer = cfg.aimTime; this.vx = 0; this.vy = 0; return; }
    if (d < cfg.backoffDist * TILE && sees) { this.moveToward(-dx, -dy, this.speed * 0.7, dt); this.facing = Math.atan2(dy, dx); return; }
    if (d > cfg.keepMax * TILE || !sees) { this.chaseGoat(game, this.speed, dt); return; }
    this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx);
  }

  // The Seer paints a rune under your feet and blinks away when you close. Frail as anyone else.
  updateSeer(dt, game, sees) {
    const g = game.goat, cfg = this.cfg, w = game.world;
    this.castCd = Math.max(0, this.castCd - dt);
    this.blinkCd = Math.max(0, this.blinkCd - dt);
    this.blinkFx = Math.max(0, this.blinkFx - dt);
    if (this.state === 'idle') { this.idleWander(dt, game); return; }
    if (this.state === 'investigate') { this.investigate(dt, game); return; }
    const dx = g.x - this.x, dy = g.y - this.y, d = Math.hypot(dx, dy);

    if (this.state === 'cast') {
      this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx); this.timer -= dt;
      if (this.timer <= 0) {
        if (this.rune) {
          w.ignitePool(this.rune.x, this.rune.y, cfg.runeRadius);
          for (let k = 0; k < 18; k++) {
            const a = Math.random() * Math.PI * 2, sp = 90 + Math.random() * 240;
            game.parts.push({ x: this.rune.x, y: this.rune.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
              life: 0.3 + Math.random() * 0.4, color: Math.random() < 0.4 ? PALETTE.cult : PALETTE.fire, size: 3 + Math.random() * 3 });
          }
          game.ring(this.rune.x, this.rune.y, cfg.runeRadius * TILE * 1.6, PALETTE.cult);
          w.emitNoise(this.rune.x, this.rune.y, TUNING.noise.rune);
          game.audio.sfxRune(); game.shake(5);
        }
        this.rune = null; this.state = 'chase'; this.castCd = cfg.castCooldown;
      }
      return;
    }

    // Too close: blink out rather than trade blows.
    if (d < cfg.blinkRange * TILE && this.blinkCd <= 0 && !g.dead) { this.blink(game); return; }
    if (sees && this.castCd <= 0 && !g.dead) {
      this.state = 'cast'; this.timer = cfg.castWind; this.vx = 0; this.vy = 0;
      this.rune = { x: g.x, y: g.y };
      game.audio.sfxCast(); w.emitNoise(this.x, this.y, TUNING.noise.cast);
      return;
    }
    if (d < cfg.keepMin * TILE && sees) { this.moveToward(-dx, -dy, this.speed, dt); this.facing = Math.atan2(dy, dx); return; }
    if (d > cfg.keepMax * TILE || !sees) { this.chaseGoat(game, this.speed, dt); return; }
    this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx);
  }

  blink(game) {
    const cfg = this.cfg, w = game.world, g = game.goat;
    let best = null;
    for (let k = 0; k < 24; k++) {
      const a = Math.random() * Math.PI * 2, r = cfg.blinkDist * TILE * (0.7 + Math.random() * 0.6);
      const nx = g.x + Math.cos(a) * r, ny = g.y + Math.sin(a) * r;
      if (w.tileAtPx(nx, ny) === T.WALL) continue;
      if (w.flowDist(nx, ny) < 0) continue;
      best = { x: nx, y: ny }; break;
    }
    if (!best) { this.blinkCd = 1; return; }
    game.particles(this.x, this.y, 12, PALETTE.cult, 180);
    this.x = best.x; this.y = best.y; w.collideCircle(this);
    game.particles(this.x, this.y, 12, PALETTE.cult, 180);
    this.blinkCd = cfg.blinkCooldown; this.blinkFx = 0.3; this.state = 'chase';
    this.facing = Math.atan2(g.y - this.y, g.x - this.x);
    game.audio.sfxBlink();
  }

  updateButcher(dt, game, sees) {
    const g = game.goat, cfg = this.cfg;
    if (this.state === 'idle') { this.idleWander(dt, game); return; }
    if (this.state === 'investigate') { this.investigate(dt, game); return; }
    const dx = g.x - this.x, dy = g.y - this.y, d = Math.hypot(dx, dy);
    if (this.state === 'charge') {
      this.timer -= dt;
      for (const e of game.enemies) {
        if (e === this || e.dead || e.held || e.state === 'flung') continue;
        if (Math.hypot(e.x - this.x, e.y - this.y) < e.r + this.r) e.fling(this.vx * 1.4, this.vy * 1.4, false);
      }
      if (!g.dead && d < this.r + g.r + 2) {
        g.damage(game.mods.butcherDamage, game, this.vx * 0.6, this.vy * 0.6);
        this.state = 'recover'; this.timer = cfg.recover; this.vx = 0; this.vy = 0; this.chargeCd = cfg.chargeCooldown; return;
      }
      if (this.timer <= 0) { this.state = 'chase'; this.chargeCd = cfg.chargeCooldown; this.vx = 0; this.vy = 0; }
      return;
    }
    if (this.state === 'chargewind') {
      // Visible telegraph: he plants his feet, faces you and roars before launching.
      this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx); this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'charge'; this.timer = cfg.chargeTime;
        this.vx = Math.cos(this.facing) * cfg.chargeSpeed; this.vy = Math.sin(this.facing) * cfg.chargeSpeed;
        game.audio.sfxSwing();
      }
      return;
    }
    if (this.state === 'chase') {
      if (sees && d >= cfg.chargeMin * TILE && this.chargeCd <= 0 && !g.dead) {
        this.state = 'chargewind'; this.timer = cfg.chargeWind; this.facing = Math.atan2(dy, dx);
        game.floatText(this.x, this.y - 34, 'RAAAGH', PALETTE.blood); game.audio.sfxThud(); return;
      }
      const dd = this.chaseGoat(game, this.speed, dt);
      if (dd < cfg.reach + g.r && !g.dead) { this.state = 'windup'; this.timer = cfg.windup; this.vx = 0; this.vy = 0; }
      return;
    }
    if (this.state === 'windup') {
      this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx); this.timer -= dt;
      if (this.timer <= 0) { this.state = 'swing'; this.timer = cfg.swing; this.swingHit = false; game.audio.sfxSwing(); game.world.emitNoise(this.x, this.y, TUNING.noise.swing); }
      return;
    }
    if (this.state === 'swing') {
      this.timer -= dt;
      if (!this.swingHit) { this.swingHit = true; game.meleeHit(this, cfg.reach + 8, cfg.arc, game.mods.butcherDamage, 2.5 * TILE); }
      if (this.timer <= 0) { this.state = 'recover'; this.timer = cfg.recover; }
      return;
    }
    if (this.state === 'recover') { this.vx = 0; this.vy = 0; this.timer -= dt; if (this.timer <= 0) this.state = 'chase'; }
  }
}
