// Enemies: Bearer (melee), Hunter (rifle), Dog (hound), Seer (mage), Butcher (heavy).
// One class, behaviour switches on kind.
class Enemy {
  constructor(x, y, kind) {
    const cfg = TUNING[kind];
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.kind = kind; this.cfg = cfg;
    this.r = cfg.radius; this.hp = cfg.hp || 1; this.speed = cfg.speed;
    this.state = 'idle'; this.timer = 0; this.facing = Math.random() * Math.PI * 2;
    this.aware = false; this.target = null; this.lastSeen = null;
    this.flung = false; this.thrown = false; this.held = false; this.dead = false;
    this.burning = 0; this.burnDir = 0; this.burnTick = 0; this.chargeCd = 0; this.reload = 0; this.flash = 0;
    this.litByMan = false; this.passedFire = false;   // who may hand fire on, and who has already
    this.lastLunge = -1; this.shieldHits = 0; this.wander = Math.random() * 3; this.lostTimer = 0;
    this.bombFuse = 0; this.flail = 0; this.heldSwing = 0;
    this.castCd = Math.random() * 1.2; this.blinkCd = 0; this.rune = null; this.blinkFx = 0;
    this.elite = false; this.boss = false; this.millCd = 0;
    this.say = null; this.barkCd = 0; this.witchBurn = false;   // what he is shouting, and what lit him
    this.dazed = 0;                                             // seconds of hearing nothing but the scream
    this.gotUpFrom = null;
    this.scripted = false; this.knife = false;                  // the two in the opening scene: moved by hand, one with a knife
    this.champion = false;                                      // the brute: three hearts and a frame that says so
    this.watchful = false;                                      // posted to watch a door: no blind side, and he sees further
    this.sentry = false;                                        // the first man of a run: he holds his ground and never walks
    this.maxHp = this.hp; this.burnHearts = 0;
    // What a rifle can get off while somebody has him by the collar, rolled once and never again:
    // spend them and he is out for good, so re-grabbing is not a way of reloading him.
    const hs = TUNING.hunter.heldShots;
    this.heldShots = kind === 'hunter' ? hs[0] + ((Math.random() * (hs[1] - hs[0] + 1)) | 0) : 0;
    // Trap sense, rolled per man: most of them step round the Mill and the braziers, and the one who
    // rolls badly walks straight into what he is looking at. A hound reads the room better than any.
    this.trapSense = cfg.trapSense !== undefined ? cfg.trapSense
      : TUNING.ai.senseMin + Math.random() * (TUNING.ai.senseMax - TUNING.ai.senseMin);
    this.hazardBlind = 0; this.hazardRoll = 0; this.hazardSeen = false;
    // hound: how long until he can slip another headbutt, and which way he is circling
    this.dodgeCd = 0; this.dodgeFx = 0; this.lungeCd = Math.random() * 0.8;
    this.circleSign = Math.random() < 0.5 ? -1 : 1; this.circleTimer = 0;
    // wraith: whether it is a body at this instant, when it may next try, and where it is drifting
    this.solid = false; this.fadeCd = Math.random() * 1.2; this.driftPhase = Math.random() * 6.28;
    this.lurkT = 0;
    // The line it comes in on, rolled once and kept: anywhere from your shoulder round to your back,
    // left or right, and never your front. Each one rolls its own, so three of them do not queue up
    // behind you — they arrive from three sides at once and you cannot face all of them.
    if (kind === 'wraith') {
      const lo = cfg.behind + cfg.flank;
      this.approach = (lo + Math.random() * (Math.PI - lo)) * (Math.random() < 0.5 ? -1 : 1);
    } else this.approach = Math.PI;
  }

  // Mist. There is no body here to hit, hold, burn, push or knock over, and a wall is not a wall
  // to it either. Everything in the game that reaches for an enemy asks this first.
  get ghosted() { return this.kind === 'wraith' && !this.solid; }

  fling(vx, vy, thrown) {
    if (this.dead || this.ghosted) return;
    this.vx = vx; this.vy = vy; this.state = 'flung'; this.flung = true; this.thrown = thrown; this.held = false; this.aware = true;
    // Whatever he was halfway through painting goes with him. Throwing a mage mid-cast is the answer
    // to a mage in your mouth, so it has to actually stop the rune.
    this.rune = null;
  }

  // BAAH does not call him in any more. It empties his head for a moment, wherever he was going.
  daze(game, t) {
    if (this.dead || this.held || this.ghosted) return;
    // A wraith that has started cannot be called off — but it can be held still where it stands,
    // solid, for as long as the scream lasts. That is the whole reason you want it frozen.
    if (this.kind === 'wraith') {
      this.dazed = Math.max(this.dazed, t); this.vx = 0; this.vy = 0;
      game.particles(this.x, this.y - 6, 5, PALETTE.witchHi, 90);
      return;
    }
    // The Butcher rides out a swing he has already committed to, and shakes it off quicker.
    if (this.kind === 'butcher') { if (this.state === 'swing') return; t *= 0.6; }
    // A hound runs on reflex, and the scream is what reflex cannot survive: BAAH is the answer to a pack.
    if (this.kind === 'dog') t *= this.cfg.dazeMul;
    if (this.state === 'flung' || this.state === 'floored' || this.state === 'burning') return;
    this.dazed = Math.max(this.dazed, t);
    this.vx = 0; this.vy = 0;
    // Whatever he was winding up, aiming or painting is gone.
    if (this.state === 'windup' || this.state === 'aim' || this.state === 'cast' || this.state === 'chargewind'
        || this.state === 'dodge' || this.state === 'retreat' || this.state === 'dart') {
      this.state = 'chase'; this.rune = null;
    }
    game.particles(this.x, this.y - 6, 4, PALETTE.bone, 90);
  }

  // Shouted at from arm's length. This is the bare BAAH and it is a great deal less than `daze`: it
  // breaks the blow he had already committed to and costs him a blink, and it does nothing at all to
  // a man who was not swinging. Returns whether it landed, so the goat can say so.
  //
  // The two exceptions are the two things in the game that cannot be called off once started, and
  // they are the same exceptions `daze` makes: a Butcher mid-swing rides it out, and a wraith that
  // has begun to arrive arrives. Everything else in here is an ordinary man being made to flinch.
  balk(game, t) {
    if (this.dead || this.held || this.ghosted || this.kind === 'wraith') return false;
    if (this.state === 'flung' || this.state === 'floored' || this.state === 'burning') return false;
    if (this.kind === 'butcher' && this.state === 'swing') return false;
    if (this.state !== 'windup' && this.state !== 'aim' && this.state !== 'cast'
        && this.state !== 'chargewind' && this.state !== 'dart') return false;
    this.state = 'chase'; this.rune = null;
    this.dazed = Math.max(this.dazed, t);
    this.vx = 0; this.vy = 0;
    game.particles(this.x, this.y - 6, 5, PALETTE.bone, 110);
    return true;
  }

  // `fromMan` is a fire that was handed to him by somebody already alight. It marks him as the end
  // of the line: he burns like anyone else and passes it to nobody, so a brazier costs the room two
  // men rather than every man in it.
  ignite(game, witch, fromMan) {
    if (this.dead || this.burning > 0 || this.ghosted) return;
    this.litByMan = !!fromMan;
    this.burning = this.kind === 'butcher' ? 3.0 : TUNING.fire.burnRunTime;
    // Fire was never what took the big man down. He walks out of it scorched and one heart lighter.
    if (this.kind === 'butcher') this.burnHearts = this.cfg.burnHearts;
    this.witchBurn = !!witch;
    this.burnDir = Math.random() * Math.PI * 2; this.burnTick = 0;
    this.state = 'burning'; this.held = false;
    // Whatever is alight is not in your mouth any more, whoever put it there.
    if (game.goat.holding === this) { game.goat.holding = null; game.goat.grabCd = TUNING.goat.grab.cooldown * game.mods.grabCooldown; }
    game.audio.sfxFire(); game.floatText(this.x, this.y - 26, 'AAAAH', witch ? PALETTE.witch : PALETTE.fire);
    this.aware = true;
  }

  die(game, cause, dx, dy) {
    if (this.dead || this.ghosted) return;
    // A fused man only goes off if a collision is what kills him — flung into a wall, into another
    // body, or thrown into one. A blade, fire, a bullet, a trap: those just kill him same as anybody,
    // and the fuse that was counting down under it goes nowhere.
    if (this.bombFuse > 0 && !this.exploded && cause === 'splat') { this.explode(game); return; }
    // Anyone carrying more than one hit — an arena elite, or any Seer — eats it, goes down and gets
    // back up; a Seer blinks clear as he does. Fire counts, so a mage has to be lit twice. Being torn
    // open or going off like a bomb does not: there is nothing left to get up.
    if (this.hp > 1 && cause !== 'devour' && cause !== 'boom' && cause !== 'fall') {
      this.hp -= 1; this.flash = 0.3; this.aware = true;
      if (this.kind === 'wraith') {
        // It comes apart and puts itself back together somewhere else. Catching it once is not enough.
        this.unmanifest(game, this.cfg.bossFade);
        game.particles(this.x, this.y, 18, PALETTE.witchHi, 190); game.ring(this.x, this.y, 2.2 * TILE, PALETTE.witch);
        game.hitstop(0.05); game.shake(6); game.audio.sfxUnmade();
        game.floatText(this.x, this.y - 34, this.hp + ' LEFT', PALETTE.witchHi);
        return;
      }
      this.state = 'floored'; this.timer = 0.75; this.vx = 0; this.vy = 0; this.thrown = false; this.flung = false;
      game.world.splat(this.x, this.y, dx || 0, dy || 0, 13);
      game.hitstop(0.05); game.shake(7); game.audio.sfxThud();
      game.floatText(this.x, this.y - 34, this.hp + ' LEFT', PALETTE.fireHi);
      if (this.kind === 'seer') this.blinkCd = 0;
      return;
    }
    this.dead = true; this.state = 'dead';
    const w = game.world;
    if (this.kind === 'wraith') {
      game.particles(this.x, this.y, 26, PALETTE.witchHi, 240);
      game.particles(this.x, this.y, 12, PALETTE.witch, 150);
      game.ring(this.x, this.y, 2.6 * TILE, PALETTE.witchHi);
      game.audio.sfxUnmade();
      if (game.goat.holding === this) game.goat.holding = null;
      if (this.boss) game.bossPrize(this);
      game.onKill(this, 'unmade');
      return;
    }
    // Over an edge there is no body and no blood: he is simply not in the room any more, and the
    // hole he went down is the only mark of it.
    // Over an edge he is dead the frame he crossed the lip, but `spawnFaller` keeps the picture of
    // him for a beat: he turns over, shrinks into the dark and the sound of him goes down with him.
    if (cause === 'fall') { game.particles(this.x, this.y, 10, PALETTE.ink, 120); game.spawnFaller(this); game.audio.sfxFall(); }
    else if (cause === 'burn') { w.scorch(this.x, this.y, this.r * 1.6); w.body(this.x, this.y, this.r, this.facing, '#241a16'); }
    else {
      w.splat(this.x, this.y, dx || 0, dy || 0, this.kind === 'butcher' ? 26 : 16);
      w.body(this.x, this.y, this.r, Math.atan2(dy || 0, dx || 1), PALETTE.ink);
      if (this.kind === 'hunter') w.dot(this.x + 8, this.y + 6, 3, '#3a3236');
    }
    if (game.goat.holding === this) game.goat.holding = null;
    if (this.boss) game.bossPrize(this);
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
      if (o === this || o.dead || o.held || o.ghosted) continue;
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
    // A man posted to watch a door is not idling: he covers the whole room and he sees further.
    if (d > (this.cfg.sight + (this.watchful ? (this.cfg.watchSight || 4) : 0)) * TILE) return false;
    // The dead do not need a line of sight and they do not have a front. They simply know.
    if (this.kind === 'wraith') return true;
    const ang = Math.atan2(dy, dx);
    // Behind a man is behind him however close you are standing. Walking up on somebody used to
    // stop working inside two and a half tiles, which took away the one thing the cone was for; what
    // gives you away back there now is noise, and how much of it you make is yours to decide.
    // Bumping into him still counts: `feel` is the couple of pixels past the two bodies where he
    // stops needing eyes.
    if (!this.watchful && Math.abs(angleDiff(this.facing, ang)) > this.cfg.cone / 2
        && d > this.r + g.r + TUNING.ai.feel) return false;
    // Stone, and the two or three things in a room that are as good as stone. A shut door used to be
    // see-through to a man and a wall to the goat, which is the one shape of unfairness the cone was
    // built to prevent: you were stood behind something you could not see past, being seen.
    return game.sees(this.x, this.y, g.x, g.y);
  }

  // Everything in the building that kills whoever walks into it: flame, a lit brazier, a rune about
  // to go off, and the arm of the Mill that is coming round. Returns which kind, so he shouts the
  // right thing about it.
  hazardAt(game, x, y, near) {
    if (game.world.isBurningPx(x, y)) return { kind: 'fire' };
    if (game.world.isPitPx(x, y)) return { kind: 'trap', pit: true };
    for (const p of (near || game.hazards)) {
      if (p.broken) continue;
      if (p.kind === 'mill') { if (p.millThreat(x, y, this.r + TUNING.ai.millClear)) return { kind: 'trap', p }; }
      else if (p.kind === 'spike') { if (p.spikeThreat() && len(p.x - x, p.y - y) < p.r + this.r) return { kind: 'trap', p }; }
      else if (len(p.x - x, p.y - y) < p.r + this.r + 4) return { kind: 'fire', p };
    }
    for (const rn of game.runes) if (len(rn.x - x, rn.y - y) < TUNING.seer.runeRadius * TILE + this.r) return { kind: 'trap' };
    return null;
  }

  // Steer around it; standing under the arms, get out from under them; with no way round at all, stop
  // at the edge. A man who fails his trap check walks in anyway for a moment — which is what keeps the
  // Mill a trap rather than a fence.
  avoidHazard(dirx, diry, game) {
    const w = game.world;
    // Flame he can walk up to and read late. A wheel has to be read from further out, or the step
    // aside happens inside the arc he is stepping out of.
    const millNear = game.hazards.some((p) => (p.kind === 'mill' || p.kind === 'spike')
      && Math.abs(p.x - this.x) < 9 * TILE && Math.abs(p.y - this.y) < 9 * TILE);
    // The mage lit it, and the mage is the one man in the building who knows how far it goes: he
    // reads flame and his own runes from further out. He still burns if he gets it wrong.
    const care = this.kind === 'seer' ? TUNING.seer.fireCare : 1;
    const look = this.r + (millNear ? TUNING.ai.trapLook : TUNING.fire.avoidLook) * care;
    const l = Math.hypot(dirx, diry) || 1; dirx /= l; diry /= l;
    // Only what is within a step of him can matter, and gathering that once keeps the probes cheap.
    const near = [];
    for (const p of game.hazards) {
      const reach = (p.kind === 'mill' ? TUNING.mill.armLen : p.r) + this.r + look + TUNING.ai.millClear + 6;
      if (p.kind === 'spike' && !p.spikeThreat()) continue;   // a plate lying flat is floor
      if (Math.abs(p.x - this.x) < reach && Math.abs(p.y - this.y) < reach) near.push(p);
    }
    const bad = (ax, ay) => this.hazardAt(game, this.x + ax * look, this.y + ay * look, near);
    const ahead = bad(dirx, diry);
    // Where he is standing counts as much as where he is going: an arm sweeps onto him either way,
    // and a man who only watches his next step is a man the wheel takes while he waits.
    const here = near.length ? this.hazardAt(game, this.x, this.y, near) : null;
    if (!ahead && !here) return { x: dirx, y: diry };
    // One roll per encounter, not one every second he stands near it: a man who keeps re-rolling
    // against the same wheel eventually walks into it, however careful he is. The roll only comes
    // back after he has been clear of everything for `rollGap` (see the timer in update).
    this.hazardSeen = true;
    // A drop is the one hazard nobody blunders into on his own. Everything else in the building is
    // a wound and the trap roll lets a man walk into one now and then; a hole is gone for good, so
    // the roll does not apply to it at all — he falls only when something throws him in.
    const overPit = (ahead && ahead.pit) || (here && here.pit);
    if (!overPit) {
      if (this.hazardRoll <= 0) {
        this.hazardRoll = TUNING.ai.rollGap;
        if (Math.random() > this.trapSense) this.hazardBlind = TUNING.ai.blindFor;
      }
      if (this.hazardBlind > 0) return { x: dirx, y: diry };
    }
    // A way out has to be a way he can actually walk, or he just slides along the wall into it.
    const walkable = (ax, ay) => !w.isSolid(Math.floor((this.x + ax * look) / TILE), Math.floor((this.y + ay * look) / TILE));
    if (here && here.p) {
      // Already inside it: straight out from the hub, which is the shortest way to not being there.
      const ox = this.x - here.p.x, oy = this.y - here.p.y, ol = Math.hypot(ox, oy) || 1;
      if (walkable(ox / ol, oy / ol)) { if (this.aware) game.bark(this, here.kind, 0.12); return { x: ox / ol, y: oy / ol }; }
    }
    if (!ahead) return { x: dirx, y: diry };     // only where he stood was wrong, and he cannot leave it
    const base = Math.atan2(diry, dirx);
    for (const off of [0.8, -0.8, 1.5, -1.5, 2.3, -2.3]) {
      const a = base + off, cx = Math.cos(a), cy = Math.sin(a);
      if (!bad(cx, cy) && walkable(cx, cy)) { if (this.aware) game.bark(this, ahead.kind, 0.14); return { x: cx, y: cy }; }
    }
    // Nowhere round the arms: give ground rather than stand where they are about to be.
    if (ahead.kind === 'trap' && walkable(-dirx, -diry)) { if (this.aware) game.bark(this, 'trap', 0.1); return { x: -dirx, y: -diry }; }
    return null;
  }
  moveToward(dirx, diry, speed, dt, game) {
    // A man already alight has nothing left to dodge, and he ought to spread it.
    if (game && this.burning <= 0) {
      const safe = this.avoidHazard(dirx, diry, game);
      if (!safe) { this.vx = 0; this.vy = 0; this.facing = Math.atan2(diry, dirx); return; }
      dirx = safe.x; diry = safe.y;
    }
    const l = Math.hypot(dirx, diry) || 1;
    this.vx = dirx / l * speed; this.vy = diry / l * speed;
    if (speed > 0) this.facing = Math.atan2(this.vy, this.vx);
  }
  // Steer toward the goat using the flow field, or directly when close with line of sight.
  chaseGoat(game, speed, dt) {
    const g = game.goat, w = game.world;
    const dx = g.x - this.x, dy = g.y - this.y, d = Math.hypot(dx, dy);
    // A man on a post does not come and get you. He turns to face you and waits to be walked into,
    // which is what makes him something you can practise a headbutt on instead of something that
    // happens to you. Everything else about him — the windup, the swing, the recovery — is normal.
    if (this.sentry) { this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx); return d; }
    if (d < 3.5 * TILE && w.los(this.x, this.y, g.x, g.y)) { this.moveToward(dx, dy, speed, dt, game); return d; }
    const f = w.flowDir(this.x, this.y);
    if (f) this.moveToward(f.x, f.y, speed, dt, game); else this.moveToward(dx, dy, speed * 0.5, dt, game);
    return d;
  }

  update(dt, game) {
    if (this.dead || this.scripted) return;
    const w = game.world, g = game.goat, cfg = this.cfg;
    // The floor stops. Flung, floored, alight or simply walking: a man over a hole is gone, and the
    // mist is the one thing that can cross one.
    if (!this.ghosted && !this.held && w.isPitPx(this.x, this.y)) { this.die(game, 'fall'); return; }
    this.chargeCd = Math.max(0, this.chargeCd - dt); this.reload = Math.max(0, this.reload - dt);
    this.barkCd = Math.max(0, this.barkCd - dt);
    this.dazed = Math.max(0, this.dazed - dt);
    this.hazardBlind = Math.max(0, this.hazardBlind - dt);
    if (!this.hazardSeen) this.hazardRoll = Math.max(0, this.hazardRoll - dt);
    this.hazardSeen = false;
    this.dodgeCd = Math.max(0, this.dodgeCd - dt); this.dodgeFx = Math.max(0, this.dodgeFx - dt);
    if (this.say) { this.say.life -= dt; if (this.say.life <= 0) this.say = null; }
    this.flash = Math.max(0, this.flash - dt); this.lured = Math.max(0, (this.lured || 0) - dt);
    this.flail = Math.max(0, this.flail - dt);
    // The fuse used to be the trigger as well as the clock: whoever was still ticking when it hit
    // zero went off wherever he stood, mid-air or not. Now only a collision sets him off, so a fuse
    // that runs out with no wall or body to answer it just fizzles — `die()`'s own check reads
    // `bombFuse > 0`, so clamping it to exactly zero here is what closes the window.
    if (this.bombFuse > 0) { this.bombFuse = Math.max(0, this.bombFuse - dt); }

    // ---- burning ----
    // Nobody on fire is steering. Not the brute, not the boss: a man alight who keeps walking his
    // line at you is the one thing that reads as the fire not counting, so everything that catches
    // blunders. What the big man alone gets is the far side of it — he comes out scorched and a
    // heart lighter instead of dead, and the blunder ends in a stagger you can still punish.
    if (this.burning > 0) {
      this.burning -= dt;
      w.ignitePx(this.x, this.y);
      if (Math.random() < dt * 4) this.burnDir += (Math.random() - 0.5) * 2.5;
      this.moveToward(Math.cos(this.burnDir), Math.sin(this.burnDir), TUNING.fire.burnRunSpeed, dt);
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (w.collideCircle(this) > 0) this.burnDir += Math.PI * (0.6 + Math.random() * 0.8);
      if (Math.random() < dt * 25) game.particles(this.x, this.y, 1, PALETTE.fire, 60);
      if (this.kind === 'butcher') {
        this.burnTick += dt;
        if (this.burnTick >= cfg.burnTick && this.burnHearts > 0) {
          this.burnTick = 0; this.burnHearts -= 1; this.hp -= 1;
          game.floatText(this.x, this.y - 30, 'BURNING', PALETTE.fire);
          if (this.hp <= 0) { this.die(game, 'burn'); return; }
        }
        if (this.burning <= 0) { this.state = 'stagger'; this.timer = cfg.stagger; this.vx = 0; this.vy = 0; }
      } else if (this.burning <= 0) { this.die(game, 'burn'); return; }
      return;
    }
    if (this.state === 'held') {
      // A held Hunter keeps shooting where he is pointed — for two or three rounds, and then he is
      // out and you are carrying a man. With Living Shield a held Bearer keeps swinging too, and
      // everything he hits is on his own side.
      if (this.kind === 'hunter' && this.reload <= 0 && this.heldShots > 0) {
        this.reload = cfg.reload * (game.mods.livingShield ? 0.55 : 1) * game.mods.enemySlow;
        this.heldShots -= 1;
        game.fireBullet(this, Math.cos(this.facing), Math.sin(this.facing));
        if (this.heldShots <= 0) game.floatText(this.x, this.y - 28, 'CLICK', PALETTE.ash);
      }
      // A mage goes on painting the ground while you carry him, and the ground he can reach is the
      // ground under his own feet — which is the ground under yours. That is the joke, and it is
      // the reason a Seer is the one man in the building you should think twice about picking up.
      if (this.kind === 'seer') {
        this.castCd = Math.max(0, this.castCd - dt);
        if (this.rune) {
          // The mark goes where he started painting it and stays there. It used to be dragged along
          // under him, which meant it went off under the goat wherever the goat had run to — so
          // carrying a mage was a death sentence rather than a thing to be handled. Now the fire
          // comes up where you were: keep moving and you are leaving a trail of it behind you.
          this.timer -= dt;
          if (this.timer <= 0) this.castRune(game);
        } else if (this.castCd <= 0) {
          this.rune = { x: this.x, y: this.y }; this.timer = cfg.castWind * game.mods.enemySlow;
          game.audio.sfxCast(); game.world.emitNoise(this.x, this.y, TUNING.noise.cast);
          game.floatText(this.x, this.y - 32, 'STILL CASTING', PALETTE.witch);
        }
      }
      if (game.mods.livingShield && this.kind !== 'hunter') {
        this.heldSwing -= dt;
        if (this.heldSwing <= 0) {
          this.heldSwing = 0.5; this.flail = 0.25;
          game.meleeHit(this, cfg.reach + 12, Math.PI * 0.9, cfg.damage, cfg.knock, true);
          game.audio.sfxSwing();
        }
      }
      // Fire does not care that he is in your mouth, and a mage standing in his own is no exception:
      // whatever catches comes straight out of it, which is the counter to carrying one at all.
      // A brazier is fire too: walk him into one and he lights the way a thrown man does.
      if (w.isBurningPx(this.x, this.y)) { this.ignite(game, w.isWitchPx(this.x, this.y)); return; }
      if (game.touchingBrazier(this)) { this.ignite(game); return; }
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
        this.die(game, 'splat', this.vx / (preSpeed || 1), this.vy / (preSpeed || 1)); return;
      }
      if (impact > 0 && this.thrown && this.kind !== 'butcher') { this.die(game, 'splat', 0, 0); return; }
      if (w.isBurningPx(this.x, this.y)) { this.ignite(game, w.isWitchPx(this.x, this.y)); return; }
      // A body arriving at speed knocks the coals out of the bowl as well as catching from it, so
      // a man thrown into a brazier lights the floor on the far side of it too.
      const bz = game.touchingBrazier(this);
      if (bz) { if (preSpeed > TUNING.physics.knockHitSpeed) bz.spill(game, this.vx, this.vy); this.ignite(game); return; }
      if (Math.hypot(this.vx, this.vy) < TUNING.physics.flungFloorSpeed) { this.state = 'floored'; this.timer = TUNING.bearer.flooredTime; this.flung = false; this.thrown = false; }
      return;
    }
    if (this.state === 'floored' || this.state === 'stagger' || this.state === 'stunned') {
      this.timer -= dt; this.vx *= 0.85; this.vy *= 0.85;
      this.x += this.vx * dt; this.y += this.vy * dt; w.collideCircle(this);
      if (w.isBurningPx(this.x, this.y)) { this.ignite(game, w.isWitchPx(this.x, this.y)); return; }
      if (this.timer <= 0) {
        this.aware = true; this.state = 'chase';
        // The Butcher answers a stagger with a quick retaliation swing if you stayed close.
        if (this.kind === 'butcher' && !g.dead && Math.hypot(g.x - this.x, g.y - this.y) < cfg.reach * 1.6 + g.r) { this.state = 'windup'; this.timer = cfg.windup * 0.55 * game.mods.enemySlow; }
      }
      return;
    }

    // ---- perception ----
    const sees = this.canSeeGoat(game);
    if (sees) {
      if (!this.aware) { if (this.kind === 'dog') game.houndSeen(this); else game.bark(this, 'spot', 0.85); }
      this.aware = true; this.lastSeen = { x: g.x, y: g.y }; this.lostTimer = 0;
    }
    else if (this.aware) {
      this.lostTimer += dt;
      // Lose the trail: no sight for a while and far away by path, go check the last place you were seen.
      if (this.lostTimer > 6 && w.flowDist(this.x, this.y) > 14 && this.state !== 'held') {
        this.aware = false; this.lostTimer = 0; this.target = this.lastSeen; this.state = 'investigate';
      }
    }
    // Close, and he has not seen you yet: what he mutters is the only warning you get.
    if (!sees && !this.aware && this.state !== 'investigate' && Math.random() < dt * TUNING.bark.nearChance
        && Math.hypot(g.x - this.x, g.y - this.y) < TUNING.bark.nearDist * TILE) game.bark(this, 'near');
    for (const n of w.noises) {
      if (Math.hypot(n.x - this.x, n.y - this.y) > n.r) continue;
      if (n.kind === 'lure') {
        // A scream pulls everyone who hears it to the spot, even men already hunting you.
        // Stand still and they find you; move and they search where you were.
        this.target = { x: n.x, y: n.y }; this.state = 'investigate'; this.aware = false; this.lostTimer = 0;
        this.facing = Math.atan2(n.y - this.y, n.x - this.x); this.lured = 1.2;
        game.bark(this, 'search', 0.45);
      } else if (!this.aware) {
        this.target = { x: n.x, y: n.y };
        if (this.state === 'idle') { this.state = 'investigate'; game.bark(this, 'search', 0.3); }
        this.facing = Math.atan2(n.y - this.y, n.x - this.x);
      }
    }
    if (this.aware && (this.state === 'idle' || this.state === 'investigate')) this.state = 'chase';
    if (!this.ghosted && w.isBurningPx(this.x, this.y)) { this.ignite(game, w.isWitchPx(this.x, this.y)); return; }

    // The scream took the sense out of him: he is still standing, and can do nothing with it.
    if (this.dazed > 0) { this.vx = 0; this.vy = 0; return; }

    if (this.kind === 'bearer') this.updateBearer(dt, game, sees);
    else if (this.kind === 'hunter') this.updateHunter(dt, game, sees);
    else if (this.kind === 'dog') this.updateDog(dt, game, sees);
    else if (this.kind === 'seer') this.updateSeer(dt, game, sees);
    else if (this.kind === 'wraith') this.updateWraith(dt, game, sees);
    else this.updateButcher(dt, game, sees);

    this.x += this.vx * dt; this.y += this.vy * dt;
    // Mist goes through the wall. That is the point of it, and it is why there is no safe corner
    // on the Ossuary: the only cover on that ground is which way you are facing.
    const impact = this.ghosted ? 0 : w.collideCircle(this);
    if (this.state === 'charge' && impact > 3 * TILE) this.chargeStopped(game);
  }

  // The charge meets something that does not move — stone, a gong, the hub of the wheel — and he
  // is the one who stops. That beat is the free hit the charge exists to offer.
  chargeStopped(game) {
    const cfg = this.cfg;
    this.state = 'stunned'; this.timer = cfg.stun; this.vx = 0; this.vy = 0; this.chargeCd = cfg.chargeCooldown * game.mods.enemySlow;
    game.shake(6); game.audio.sfxSplat(); game.hitstop(0.04); game.floatText(this.x, this.y - 34, 'STUNNED', PALETTE.fireHi);
    game.world.emitNoise(this.x, this.y, TUNING.noise.splat);
  }

  idleWander(dt, game) {
    this.vx = 0; this.vy = 0;
    if (this.sentry) return;                    // he was put facing that way on purpose
    this.wander -= dt;
    if (this.wander <= 0) { this.wander = 1 + Math.random() * 3; this.facing += (Math.random() - 0.5) * 2; }
  }
  investigate(dt, game) {
    if (this.sentry) { this.target = null; this.state = 'idle'; this.vx = 0; this.vy = 0; return; }
    if (!this.target) { this.state = 'idle'; return; }
    const dx = this.target.x - this.x, dy = this.target.y - this.y, d = Math.hypot(dx, dy);
    if (d < TILE || (this.wallHit && Math.random() < dt * 2)) { this.target = null; this.state = 'idle'; this.vx = 0; this.vy = 0; return; }
    this.moveToward(dx, dy, this.speed * 0.6, dt, game);
  }

  updateBearer(dt, game, sees) {
    const g = game.goat, cfg = this.cfg;
    if (this.state === 'idle') { this.idleWander(dt, game); return; }
    if (this.state === 'investigate') { this.investigate(dt, game); return; }
    if (this.state === 'chase') {
      const d = this.chaseGoat(game, this.speed, dt);
      if (d < cfg.reach + g.r && !g.dead) { this.state = 'windup'; this.timer = cfg.windup * game.mods.enemySlow; this.vx = 0; this.vy = 0; game.bark(this, 'attack', 0.25); }
      return;
    }
    if (this.state === 'windup') {
      this.vx = 0; this.vy = 0; this.facing = Math.atan2(g.y - this.y, g.x - this.x); this.timer -= dt;
      if (this.timer <= 0) { this.state = 'swing'; this.timer = cfg.swing * game.mods.enemySlow; game.audio.sfxSwing(); game.world.emitNoise(this.x, this.y, TUNING.noise.swing); this.swingHit = false; }
      return;
    }
    if (this.state === 'swing') {
      this.timer -= dt;
      if (!this.swingHit) { this.swingHit = true; game.meleeHit(this, cfg.reach + 6, Math.PI / 2, cfg.damage, cfg.knock); }
      if (this.timer <= 0) { this.state = 'recover'; this.timer = cfg.recover * game.mods.enemySlow; }
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
        this.reload = cfg.reload * game.mods.enemySlow; this.state = 'chase';
      }
      return;
    }
    // chase: keep distance, shoot when possible
    const reach = (cfg.sight + (this.watchful ? cfg.watchSight : 0)) * TILE;
    if (sees && this.reload <= 0 && d < reach) { this.state = 'aim'; this.timer = cfg.aimTime * game.mods.enemySlow; this.vx = 0; this.vy = 0; return; }
    // A man posted to watch a door does not leave it to come and find you. He holds it, turns on the
    // spot and waits out his reload: the room in front of him is the trap, not the man himself.
    if (this.watchful && d > cfg.backoffDist * TILE) { this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx); return; }
    if (d < cfg.backoffDist * TILE && sees) { this.moveToward(-dx, -dy, this.speed * 0.7, dt, game); this.facing = Math.atan2(dy, dx); return; }
    if (d > cfg.keepMax * TILE || !sees) { this.chaseGoat(game, this.speed, dt); return; }
    this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx);
  }

  // The hound: hit and run. He closes, then circles just outside his own reach, picks a moment you
  // cannot read and darts in for one bite — then gets out again. Nothing about him is on a grid: the
  // circling flips, the timing wanders, and a share of every headbutt he is simply not there for.
  updateDog(dt, game, sees) {
    const g = game.goat, cfg = this.cfg;
    this.lungeCd = Math.max(0, this.lungeCd - dt);
    this.circleTimer -= dt;
    if (this.circleTimer <= 0) { this.circleTimer = cfg.circleFlip * (0.6 + Math.random()); if (Math.random() < 0.45) this.circleSign *= -1; }
    if (this.state === 'idle') { this.idleWander(dt, game); return; }
    if (this.state === 'investigate') { this.investigate(dt, game); return; }
    const dx = g.x - this.x, dy = g.y - this.y, d = Math.hypot(dx, dy);
    // The sidestep carries him: the burst was set the moment he slipped the headbutt.
    if (this.state === 'dodge') { this.timer -= dt; if (this.timer <= 0) { this.state = 'chase'; this.vx *= 0.25; this.vy *= 0.25; } return; }
    if (this.state === 'retreat') {
      this.timer -= dt;
      this.moveToward(-dx - dy * this.circleSign * 0.7, -dy + dx * this.circleSign * 0.7, this.speed * 0.95, dt, game);
      this.facing = Math.atan2(dy, dx);          // he backs off without taking his eyes off you
      if (this.timer <= 0) this.state = 'chase';
      return;
    }
    if (this.state === 'windup') {
      this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx); this.timer -= dt;
      if (this.timer <= 0) { this.state = 'swing'; this.timer = cfg.swing * game.mods.enemySlow; this.swingHit = false; game.audio.sfxSnap(); game.world.emitNoise(this.x, this.y, TUNING.noise.swing); }
      return;
    }
    if (this.state === 'swing') {
      this.timer -= dt;
      // He goes where he bit, so a miss carries him straight past you.
      this.vx = Math.cos(this.facing) * cfg.dodgeSpeed * 0.5; this.vy = Math.sin(this.facing) * cfg.dodgeSpeed * 0.5;
      if (!this.swingHit) { this.swingHit = true; game.meleeHit(this, cfg.reach + this.r, Math.PI * 0.7, cfg.damage, cfg.knock); }
      if (this.timer <= 0) { this.state = 'recover'; this.timer = cfg.recover * game.mods.enemySlow; }
      return;
    }
    if (this.state === 'recover') {
      this.vx *= 0.55; this.vy *= 0.55; this.timer -= dt;
      if (this.timer <= 0) { this.state = 'retreat'; this.timer = cfg.retreat * (0.7 + Math.random() * 0.7); }
      return;
    }
    // The run in: once he has committed he comes straight at you and does not orbit any more. This is
    // the only window you get — the moment before it, he is out past his own reach and hard to hit.
    if (this.state === 'dart') {
      this.timer -= dt;
      this.moveToward(dx, dy, this.speed * 1.08, dt, game);
      if (d < cfg.reach + g.r + 8 && !g.dead) { this.state = 'windup'; this.timer = cfg.windup * game.mods.enemySlow; this.vx = 0; this.vy = 0; }
      else if (this.timer <= 0) { this.state = 'chase'; this.lungeCd = cfg.lungeCd * 0.5; }
      return;
    }
    // chase: close the gap while he cannot see you, then orbit until the moment comes
    if (!sees && d > cfg.circle * TILE) { this.chaseGoat(game, this.speed, dt); return; }
    let commit = this.lungeCd <= 0 && !g.dead && (sees || d < cfg.circle * TILE);
    // One hound goes in at a time. Three of them committing together is a coin toss you cannot read;
    // three of them taking turns is a pack, and it is the difference between hard and unfair.
    if (commit && this.packBusy(game, cfg)) { this.lungeCd = cfg.packWait * (0.7 + Math.random() * 0.6); commit = false; }
    if (commit) {
      this.state = 'dart'; this.timer = cfg.dartTime;
      this.lungeCd = cfg.lungeCd * (0.7 + Math.random() * 0.6);
      // The men know what a hound on the goat is worth, and one of them says so.
      for (const o of game.enemies) {
        if (o === this || o.dead || o.held || o.kind === 'dog' || !o.aware) continue;
        if (len(o.x - this.x, o.y - this.y) > 7 * TILE) continue;
        game.bark(o, 'hound', 0.12); break;
      }
      return;
    }
    const nx = dx / (d || 1), ny = dy / (d || 1);
    const tx = -ny * this.circleSign, ty = nx * this.circleSign;
    // Closing, holding the ring, or easing out again, depending on how near he already is.
    const ring = cfg.circle * TILE;
    const closing = d > ring ? 1 : d < ring * 0.7 ? -0.55 : 0.15;
    this.moveToward(nx * closing + tx, ny * closing + ty, this.speed * (this.lungeCd > 0 ? 0.92 : 1), dt, game);
    this.facing = Math.atan2(dy, dx);
  }

  // Is another hound near enough, and far enough into a run of its own, that this one should wait?
  packBusy(game, cfg) {
    for (const o of game.enemies) {
      if (o === this || o.dead || o.kind !== 'dog') continue;
      if (o.state !== 'dart' && o.state !== 'windup' && o.state !== 'swing') continue;
      if (len(o.x - this.x, o.y - this.y) < cfg.packGap * TILE) return true;
    }
    return false;
  }

  // The headbutt that does not land. A share of them he is simply not there for — and that share is
  // the whole reason a hound reads as unpredictable. A dazed hound cannot move, so he eats all of it.
  tryDodge(game, ax, ay) {
    if (this.kind !== 'dog' || this.dazed > 0 || this.dodgeCd > 0 || this.burning > 0) return false;
    const cfg = this.cfg;
    if (this.state === 'floored' || this.state === 'flung' || this.state === 'stunned' || this.state === 'windup') return false;
    if (Math.random() > cfg.dodge) return false;
    const side = Math.random() < 0.5 ? 1 : -1;
    this.vx = -ay * side * cfg.dodgeSpeed; this.vy = ax * side * cfg.dodgeSpeed;
    this.state = 'dodge'; this.timer = cfg.dodgeTime; this.dodgeCd = cfg.dodgeCd; this.dodgeFx = 0.28;
    this.aware = true;
    game.floatText(this.x, this.y - 24, 'MISS', PALETTE.bone);
    game.particles(this.x, this.y, 5, PALETTE.ash, 160);
    game.audio.sfxSnap(); game.vibe(8);
    return true;
  }

  // The Seer paints a rune under your feet and blinks away when you close. Frail as anyone else.
  // Mist most of the time: it slides toward your blind side, through whatever is in the way, and
  // does nothing at all until it is there. Then it becomes a body — and from that instant it is
  // committed, and stays a body well past the blow, which is the window you get to unmake it in.
  updateWraith(dt, game) {
    const cfg = this.cfg, g = game.goat;
    this.fadeCd = Math.max(0, this.fadeCd - dt);
    this.driftPhase += dt;
    // Committed: manifest, swing, and the long beat afterwards where it can still be hit.
    if (this.solid) {
      this.timer -= dt; this.vx = 0; this.vy = 0;
      if (this.state === 'manifest') {
        if (this.timer <= 0) { this.state = 'windup'; this.timer = cfg.windup * game.mods.enemySlow; }
      } else if (this.state === 'windup') {
        this.facing = Math.atan2(g.y - this.y, g.x - this.x);
        if (this.timer <= 0) {
          this.state = 'swing'; this.timer = cfg.swing * game.mods.enemySlow;
          game.meleeHit(this, cfg.reach, Math.PI * 0.9, cfg.damage, cfg.knock);
          game.audio.sfxWraithHit(); game.world.emitNoise(this.x, this.y, TUNING.noise.swing);
          game.shake(4);
        }
      } else if (this.state === 'swing') {
        if (this.timer <= 0) { this.state = 'solid'; this.timer = cfg.solidAfter; }
      } else if (this.timer <= 0) this.unmanifest(game);
      return;
    }
    if (!this.aware) { this.vx = 0; this.vy = 0; return; }
    // Which way the goat is looking is where he is *pointing*, not where his body has caught up to:
    // the head turns fast but not instantly, and a thing this close can out-run a head turn. Reading
    // the aim instead means pointing at one is an absolute answer to it, which is the deal the level
    // is offering. The sprite turns toward the same angle, so what you see is still what it reads.
    const look = Math.atan2(g.aim.y, g.aim.x);
    const back = look + this.approach;
    // It wanders as it closes, so a drift does not read as a missile — but never far enough to
    // wander back into the cone it cannot arrive from. A shoulder approach gets almost no slack;
    // one coming straight up your back gets all of it.
    const slack = Math.min(cfg.driftWobble, Math.abs(this.approach) - cfg.behind);
    const wobble = Math.sin(this.driftPhase * 0.9) * slack;
    const tx = g.x + Math.cos(back + wobble) * cfg.standoff * TILE;
    const ty = g.y + Math.sin(back + wobble) * cfg.standoff * TILE;
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
    this.vx = d > 1 ? dx / d * cfg.speed : 0;
    this.vy = d > 1 ? dy / d * cfg.speed : 0;
    this.facing = Math.atan2(g.y - this.y, g.x - this.x);
    // It only becomes real on your blind side, close enough to reach you, and not straight away —
    // and never inside a wall. Mist goes through stone; a body cannot be in it. That is the one thing
    // the ground still does for you here: a wall at your back is an arc it cannot arrive from.
    const behind = Math.abs(angleDiff(look, Math.atan2(this.y - g.y, this.x - g.x)));
    const reach = Math.hypot(g.x - this.x, g.y - this.y) < cfg.reach + g.r + this.r * 0.5;
    const room = !game.world.isSolid(Math.floor(this.x / TILE), Math.floor(this.y / TILE));
    // It has to hold the blind side, not merely cross it: a head turned in time takes the moment away
    // even when the thing is faster round you than you are round yourself.
    this.lurkT = (reach && room && behind > cfg.behind) ? this.lurkT + dt : 0;
    if (this.fadeCd <= 0 && this.lurkT >= cfg.lurk && !g.dead) { this.lurkT = 0; this.manifest(game); }
  }

  manifest(game) {
    this.solid = true; this.state = 'manifest'; this.timer = this.cfg.manifest;
    this.vx = 0; this.vy = 0;
    game.particles(this.x, this.y, 12, PALETTE.witchHi, 130);
    game.ring(this.x, this.y, 1.6 * TILE, PALETTE.witch);
    game.audio.sfxWraith(); game.vibe(15);
    // Whoever is standing near it has an opinion about their own dead getting up.
    for (const o of game.enemies) {
      if (o === this || o.dead || o.kind === 'wraith' || o.kind === 'dog') continue;
      if (Math.hypot(o.x - this.x, o.y - this.y) > 6 * TILE) continue;
      game.bark(o, 'wraith', 0.3); break;
    }
  }
  unmanifest(game, cd) {
    this.solid = false; this.state = 'chase'; this.dazed = 0; this.burning = 0;
    this.fadeCd = cd === undefined ? this.cfg.fadeCd : cd;
    game.particles(this.x, this.y, 8, PALETTE.witch, 90);
  }

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
      if (this.timer <= 0) { this.castRune(game); this.state = 'chase'; }
      return;
    }

    // Too close: blink out rather than trade blows.
    if (d < cfg.blinkRange * TILE && this.blinkCd <= 0 && !g.dead) { this.blink(game); return; }
    if (sees && this.castCd <= 0 && !g.dead) {
      this.state = 'cast'; this.timer = cfg.castWind * game.mods.enemySlow; this.vx = 0; this.vy = 0;
      this.rune = { x: g.x, y: g.y };
      game.audio.sfxCast(); w.emitNoise(this.x, this.y, TUNING.noise.cast);
      return;
    }
    if (d < cfg.keepMin * TILE && sees) { this.moveToward(-dx, -dy, this.speed, dt, game); this.facing = Math.atan2(dy, dx); return; }
    if (d > cfg.keepMax * TILE || !sees) { this.chaseGoat(game, this.speed, dt); return; }
    this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx);
  }

  // The rune he has been painting goes off where he painted it. Held or standing, same fire.
  castRune(game) {
    const cfg = this.cfg, w = game.world;
    if (this.rune) {
      w.ignitePool(this.rune.x, this.rune.y, cfg.runeRadius, true);
      for (let k = 0; k < 24; k++) {
        const a = Math.random() * Math.PI * 2, sp = 90 + Math.random() * 260;
        game.parts.push({ x: this.rune.x, y: this.rune.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0.3 + Math.random() * 0.45, color: Math.random() < 0.5 ? PALETTE.witch : PALETTE.witchHi, size: 3 + Math.random() * 3 });
      }
      game.ring(this.rune.x, this.rune.y, cfg.runeRadius * TILE * 1.6, PALETTE.witchHi);
      game.flash(PALETTE.witch, 0.14);
      w.emitNoise(this.rune.x, this.rune.y, TUNING.noise.rune);
      game.audio.sfxRune(); game.shake(5);
    }
    this.rune = null; this.castCd = cfg.castCooldown * game.mods.enemySlow;
  }

  blink(game) {
    const cfg = this.cfg, w = game.world, g = game.goat;
    let best = null;
    for (let k = 0; k < 24; k++) {
      const a = Math.random() * Math.PI * 2, r = cfg.blinkDist * TILE * (0.7 + Math.random() * 0.6);
      const nx = g.x + Math.cos(a) * r, ny = g.y + Math.sin(a) * r;
      if (w.tileAtPx(nx, ny) === T.WALL) continue;
      if (w.flowDist(nx, ny) < 0) continue;
      // Blinking out of a fight and into his own fire was the one thing that read as the rune not
      // counting for him. He lands on ground that is neither alight nor about to be, or not at all.
      if (w.isBurningPx(nx, ny) || w.isPitPx(nx, ny)) continue;
      if (this.hazardAt(game, nx, ny)) continue;
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
        this.state = 'recover'; this.timer = cfg.recover * game.mods.enemySlow; this.vx = 0; this.vy = 0; this.chargeCd = cfg.chargeCooldown * game.mods.enemySlow; return;
      }
      if (this.timer <= 0) { this.state = 'chase'; this.chargeCd = cfg.chargeCooldown * game.mods.enemySlow; this.vx = 0; this.vy = 0; }
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
        this.state = 'chargewind'; this.timer = cfg.chargeWind * game.mods.enemySlow; this.facing = Math.atan2(dy, dx);
        game.floatText(this.x, this.y - 34, 'RAAAGH', PALETTE.blood); game.audio.sfxThud(); return;
      }
      const dd = this.chaseGoat(game, this.speed, dt);
      if (dd < cfg.reach + g.r && !g.dead) { this.state = 'windup'; this.timer = cfg.windup * game.mods.enemySlow; this.vx = 0; this.vy = 0; }
      return;
    }
    if (this.state === 'windup') {
      this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx); this.timer -= dt;
      if (this.timer <= 0) { this.state = 'swing'; this.timer = cfg.swing * game.mods.enemySlow; this.swingHit = false; game.audio.sfxSwing(); game.world.emitNoise(this.x, this.y, TUNING.noise.swing); }
      return;
    }
    if (this.state === 'swing') {
      this.timer -= dt;
      if (!this.swingHit) { this.swingHit = true; game.meleeHit(this, cfg.reach + 8, cfg.arc, game.mods.butcherDamage, 2.5 * TILE); }
      if (this.timer <= 0) { this.state = 'recover'; this.timer = cfg.recover * game.mods.enemySlow; }
      return;
    }
    if (this.state === 'recover') { this.vx = 0; this.vy = 0; this.timer -= dt; if (this.timer <= 0) this.state = 'chase'; }
  }
}
