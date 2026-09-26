// Enemies: Bearer (melee), Hunter (rifle), Dog (hound), Seer (mage), Butcher (heavy).
// One class, behaviour switches on kind.
class Enemy {
  constructor(x, y, kind) {
    const cfg = TUNING[kind];
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.kind = kind; this.cfg = cfg;
    // Where he was put. Idle, he does not wander past a leash of this — a patrol keeps to its own
    // room until it has a reason not to, rather than drifting out through whatever doorway is handy.
    this.home = { x, y };
    this.r = cfg.radius; this.hp = cfg.hp || 1; this.speed = cfg.speed;
    this.wallR = Math.min(this.r, TUNING.ai.path.squeeze);   // what of him the stone pushes on (`World.collideTiles`)
    this.state = 'idle'; this.timer = 0; this.facing = Math.random() * Math.PI * 2;
    this.aware = false; this.target = null; this.lastSeen = null;
    this.flung = false; this.thrown = false; this.held = false; this.dead = false;
    this.burning = 0; this.burnDir = 0; this.burnTick = 0; this.chargeCd = 0; this.reload = 0; this.flash = 0;
    this.litByMan = false; this.passedFire = false;   // who may hand fire on, and who has already
    this.lastLunge = -1; this.shieldHits = 0; this.wander = Math.random() * 3; this.lostTimer = 0;
    this.bombFuse = 0; this.exploded = false; this.flail = 0; this.heldSwing = 0;
    // 0 for everybody: only the Mill lesson's two men are ever given a beat to plant and face the
    // goat before they move, so this changes nothing about how fast the rest of the game notices you.
    this.noticeFor = 0;
    this.castCd = Math.random() * 1.2; this.blinkCd = 0; this.rune = null; this.blinkFx = 0;
    this.elite = false; this.boss = false; this.millCd = 0;
    this.say = null; this.barkCd = 0; this.witchBurn = false;   // what he is shouting, and what lit him
    this.dazed = 0;                                             // seconds of hearing nothing but the scream
    this.poison = 0;                                            // seconds of being blind and slow (js/status.js)
    this.scald = false;                                         // stunned when the fire caught: it hits twice
    this.gotUpFrom = null;
    this.scripted = false;   // moved by hand: the opening scene's two, and the mage at the first gate
    this.champion = false;                                      // the butcher (the brute until 1.72): a charge, too heavy to carry
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
    // A wraith may already be lying in the room as something else when you walk in (see `hide`).
    this.lungeSeen = -1; this.grabSeen = -1;
    if (kind === 'wraith' && Math.random() < cfg.hide.start) this.hide();
    this.slamCd = 0; this.dashPath = null; this.dashAng = 0;
    // The route: where he is walking to next on the way to the goat (`pathDir`), when he looks
    // again, and the watch on whether he is actually getting anywhere (`unstuck`).
    this.wp = null; this.pathT = 0; this.pathProps = null;
    this.stuckT = 0; this.stuckX = x; this.stuckY = y; this.unstick = 0; this.unstickAng = 0; this.chaseAt = -1;
    this.flipCd = 0; this.lane = null; this.laneT = 0;
  }

  // What a kind will not answer to, with the butcher reading his own list rather than the clubman's.
  get immunity() { return this.champion ? TUNING.champion.immune : this.cfg.immune; }
  get blunderProof() { const im = this.immunity; return !!(im && im.blunder); }
  // An attack number: the butcher has his own arm, everybody else reads their own kind.
  atk(key) { return this.champion && TUNING.champion[key] !== undefined ? TUNING.champion[key] : this.cfg[key]; }
  // How far a headbutt throws him: light kinds further, the butcher and a man with a soul in him less.
  knockMul() {
    return (this.cfg.flingMul || 1) * (this.champion ? TUNING.champion.flingMul : 1) * (this.soul ? TUNING.soulBearer.flingMul : 1);
  }
  // How fast a wall has to be met to kill him. A heavy man is thrown `knockMul` as far, and the
  // wall asks the same share less of him — or a butcher carrying a soul (0.55 × 0.6 of a throw) left a
  // headbutt at nine tiles a second against a wall that wanted eleven, and could not be hurt at all.
  // Light men keep the full number: a hound flies further, not easier.
  splatLimit(game) {
    return TUNING.physics.splatSpeed * Talisman.splatMul(game) * Math.min(1, this.knockMul());
  }
  // Too heavy or too much more than a man to be carried: the ogre, the butcher, a soul-bearer.
  get unliftable() { return this.kind === 'butcher' || this.champion || !!this.soul; }

  // Mist. There is no body here to hit, hold, burn, push or knock over, and a wall is not a wall
  // to it either. Everything in the game that reaches for an enemy asks this first.
  get ghosted() { return this.kind === 'wraith' && !this.solid; }

  fling(vx, vy, thrown) {
    if (this.dead || this.ghosted) return;
    // The rat ogre is not thrown by anything — not the horns, not the wheel, not a charge, not a
    // blast. No wall ever kills him, which is the whole of what makes him dear.
    // Nor is the ogre (the Butcher, 1.66): too heavy to go anywhere, which is what sets him apart
    // from the butcher, who does. Every heart he has is taken standing, while he is on his knees.
    if (this.kind === 'ratogre' || this.kind === 'butcher') { this.aware = true; return; }
    this.vx = vx; this.vy = vy; this.state = 'flung'; this.flung = true; this.thrown = thrown; this.held = false; this.aware = true; this.flungBy = null; this.chain = 0;
    this.fromMouth = false;   // `Goat.throwHeld` sets it after this; anything else that throws him clears it
    // Whatever he was halfway through painting goes with him. Throwing a mage mid-cast is the answer
    // to a mage in your mouth, so it has to actually stop the rune.
    this.rune = null;
  }

  // BAAH does not call him in any more. It empties his head for a moment, wherever he was going.
  daze(game, t) {
    if (this.dead || this.held || this.ghosted) return;
    if (this.kind === 'wraith') {
      // Immune, by default: BAAH does not touch a dead thing. The particles are a shrug, not a hit.
      if (this.cfg.immune && this.cfg.immune.stun) { game.particles(this.x, this.y - 6, 3, PALETTE.witch, 60); return; }
      // Not immune: it cannot be called off once it has started, but it can be held still where it
      // stands, solid, for as long as the scream lasts. That is the whole reason you want it frozen.
      this.dazed = Math.max(this.dazed, t); this.vx = 0; this.vy = 0;
      game.particles(this.x, this.y - 6, 5, PALETTE.witchHi, 90);
      return;
    }
    // The rat ogre does not reel. What a scream, a boomerang or a tumble does to him is break the
    // swing he was winding up, and nothing more: the stun that opens him is a crate, not a noise.
    if (this.kind === 'ratogre') { this.breakSwing(game); return; }
    // The Butcher rides out a leap he has already left the floor for, and shakes it off quicker.
    if (this.kind === 'butcher') { if (this.state === 'hop') return; t *= 0.6; }
    // A hound runs on reflex, and the scream is what reflex cannot survive: BAAH is the answer to a pack.
    if (this.kind === 'dog') t *= this.cfg.dazeMul;
    // Stunned while he burns: the stars do nothing to a man already blundering, but the fire
    // finds him twice (STUN + FIRE).
    if (this.burning > 0) { this.scaldIt(game); return; }
    if (this.state === 'flung' || this.state === 'floored' || this.state === 'burning') return;
    this.dazed = Math.max(this.dazed, t);
    this.vx = 0; this.vy = 0;
    // A charge under way is called off too, with the wait for the next one: dazed, it only froze,
    // and when the stars cleared he ran on down the old line with no plant to read first.
    if (this.state === 'charge') { this.state = 'chase'; this.chargeCd = TUNING.champion.charge.cooldown * game.mods.enemySlow; }
    // Whatever he was winding up, aiming or painting is gone.
    if (this.state === 'windup' || this.state === 'aim' || this.state === 'cast' || this.state === 'chargewind'
        || this.state === 'dodge' || this.state === 'retreat' || this.state === 'dart' || this.state === 'slamwind'
        || this.state === 'hopwind') {
      this.dashPath = null;
      this.state = 'chase'; this.rune = null;
    }
    game.particles(this.x, this.y - 6, 4, PALETTE.bone, 90);
    Status.stunned(game, this);
  }

  // Shouted at from arm's length. This is the bare BAAH and it is a great deal less than `daze`: it
  // breaks the blow he had already committed to and costs him a blink, and it does nothing at all to
  // a man who was not swinging. Returns whether it landed, so the goat can say so.
  //
  // The two exceptions are the two things in the game that cannot be called off once started, and
  // they are the same exceptions `daze` makes: a Butcher in the air rides it out, and a wraith that
  // has begun to arrive arrives. Everything else in here is an ordinary man being made to flinch.
  balk(game, t) {
    if (this.dead || this.held || this.ghosted || this.kind === 'wraith') return false;
    if (this.kind === 'ratogre') return this.breakSwing(game);
    if (this.state === 'flung' || this.state === 'floored' || this.state === 'burning') return false;
    if (this.kind === 'butcher' && this.state === 'hop') return false;
    if (this.state !== 'windup' && this.state !== 'aim' && this.state !== 'cast' && this.state !== 'chargewind'
        && this.state !== 'dart' && this.state !== 'slamwind' && this.state !== 'hopwind') return false;
    this.state = 'chase'; this.rune = null; this.dashPath = null;
    this.dazed = Math.max(this.dazed, t);
    this.vx = 0; this.vy = 0;
    game.particles(this.x, this.y - 6, 5, PALETTE.bone, 110);
    Status.stunned(game, this);
    return true;
  }

  // `fromMan` is a fire that was handed to him by somebody already alight. It marks him as the end
  // of the line: he burns like anyone else and passes it to nobody, so a brazier costs the room two
  // men rather than every man in it.
  ignite(game, witch, fromMan) {
    if (this.dead || this.burning > 0 || this.ghosted) return;
    // A dead thing does not catch from a hearth. Witchfire is a Seer's doing and still finds it.
    if (!witch && this.cfg.immune && this.cfg.immune.fire) return;
    // The rat ogre does not burn at all, a Seer's fire included: `immune.witch` is his alone.
    if (witch && this.cfg.immune && this.cfg.immune.witch) return;
    this.litByMan = !!fromMan;
    // How far down a line of men this fire has been handed (the FIRE AMULET reads it): a man lit by
    // the ground is the head of a fresh line.
    if (!fromMan) this.fireDepth = 0;
    this.burning = this.kind === 'butcher' ? 3.0 : TUNING.fire.burnRunTime;
    // Fire was never what took the big man down. He walks out of it scorched and one heart lighter.
    if (this.kind === 'butcher') this.burnHearts = this.cfg.burnHearts;
    this.witchBurn = !!witch; this.scald = false;
    this.burnDir = Math.random() * Math.PI * 2; this.burnTick = 0;
    // A blunder-immune kind (`TUNING.<kind>.immune.blunder` — the Butcher, the hound) keeps whatever
    // it was doing rather than losing it to 'burning': the per-kind update has no branch for that
    // state, so forcing him into it would silently freeze him instead of leaving him fighting.
    if (!this.blunderProof) this.state = 'burning';
    this.held = false;
    // Whatever is alight is not in your mouth any more, whoever put it there.
    if (game.goat.holding === this) { game.goat.holding = null; game.goat.spendGrab(game, true); }
    game.audio.sfxFire(); game.floatText(this.x, this.y - 26, 'AAAAH', witch ? PALETTE.witch : PALETTE.fire);
    this.aware = true;
    // Caught from the ground rather than handed on by another burning man: that ground is only ever
    // witchfire, which is only ever a Seer's doing. Whichever one is close enough to have watched it
    // happen has something to say about it — the same courtesy the shooter of a friendly-fire bullet
    // already gets.
    if (witch && !fromMan) {
      const mage = game.enemies.find((o) => o.kind === 'seer' && o !== this && !o.dead && !o.held
        && Math.hypot(o.x - this.x, o.y - this.y) < TUNING.bark.witnessDist * TILE && game.world.los(o.x, o.y, this.x, this.y));
      if (mage) game.bark(mage, 'friendlyFire', 1);
    }
    // Where the fire meets what was already wrong with him (js/status.js).
    if (this.dazed > 0) this.scaldIt(game);
    if (this.poison > 0) Status.blast(game, this.x, this.y, TUNING.status.blast, this);
  }

  // STUN + FIRE: the stun is spent, and the fire that has him does its damage twice.
  scaldIt(game) {
    if (this.scald) return;
    this.scald = true; this.dazed = 0;
    game.floatText(this.x, this.y - 40, 'SCALDED', PALETTE.fireHi);
    game.particles(this.x, this.y - 6, 8, PALETTE.fireHi, 150);
  }

  die(game, cause, dx, dy) {
    if (this.dead || this.ghosted) return;
    // A blow that lands on the mage's man before the scene has given him the first gate's soul finds
    // it in him all the same (`game.blessNow`): that gate opens on nothing else.
    if (this.blessing) game.blessNow(this);
    // A fused man only goes off if a collision is what kills him — flung into a wall, into another
    // body, or thrown into one. A blade, fire, a bullet, a trap: those just kill him same as anybody,
    // and the fuse that was counting down under it goes nowhere.
    if (this.bombFuse > 0 && !this.exploded && cause === 'splat') { this.explode(game); return; }
    // Anyone carrying more than one hit — an arena elite, or any Seer — eats it, goes down and gets
    // back up; a Seer blinks clear as he does. Fire counts, so a mage has to be lit twice. Being torn
    // open does not: there is nothing left to get up. A bomb charge no longer skips this either — it
    // is a hit like any other, so a two-heart target takes one off and goes down floored, and only a
    // second charge (or any other killing blow) landed while he is already at his last heart actually
    // finishes him.
    if (this.hp > 1 && cause !== 'fall') {
      this.hp -= 1; this.flash = 0.3; this.aware = true;
      if (this.kind === 'wraith') {
        // It comes apart and puts itself back together somewhere else. Catching it once is not enough.
        this.unmanifest(game, this.cfg.bossFade);
        game.particles(this.x, this.y, 18, PALETTE.witchHi, 190); game.ring(this.x, this.y, 2.2 * TILE, PALETTE.witch);
        game.hitstop(0.05); game.shake(6); game.audio.sfxUnmade();
        game.floatText(this.x, this.y - 34, this.hp + ' LEFT', PALETTE.witchHi);
        return;
      }
      // The rat ogre takes it standing. Every other multi-heart man goes down floored for a beat,
      // which on him would be a stun window opening off the very blow that spent the last one —
      // six horns in a row off one crate. He shrugs, roars, and comes on again: one crate, one heart.
      if (this.kind === 'ratogre') {
        this.state = 'stagger'; this.timer = this.cfg.stagger; this.vx = 0; this.vy = 0; this.thrown = false; this.flung = false;
        game.world.splat(this.x, this.y, dx || 0, dy || 0, 14);
        game.hitstop(0.05); game.shake(7); game.audio.sfxThud(); game.audio.sfxGrowl();
        game.floatText(this.x, this.y - 40, this.hp + ' LEFT', PALETTE.fireHi);
        return;
      }
      // In the air he keeps flying: the heart is gone and the leap is not. Floored mid-leap over a
      // drop, the pit check had him the next step, three hearts and all.
      if (this.state === 'hop') { game.floatText(this.x, this.y - 40, this.hp + ' LEFT', PALETTE.fireHi); game.audio.sfxThud(); return; }
      this.state = 'floored'; this.timer = 0.75; this.vx = 0; this.vy = 0; this.thrown = false; this.flung = false;
      // A man knocked down is not in your mouth any more. Left there, he got up with his own AI back
      // while still pinned in front of the goat — a mage painting at his feet, a clubman swinging.
      if (this.held) {
        this.held = false;
        if (game.goat.holding === this) { game.goat.holding = null; game.goat.spendGrab(game, true); }
      }
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
      if (this.boss || this.keeper) game.bossPrize(this);
      game.onKill(this, 'unmade');
      return;
    }
    // Over an edge there is no body and no blood: he is simply not in the room any more, and the
    // hole he went down is the only mark of it.
    // Over an edge he is dead the frame he crossed the lip, but `spawnFaller` keeps the picture of
    // him for a beat: he turns over, shrinks into the dark and the sound of him goes down with him.
    if (cause === 'fall') { game.particles(this.x, this.y, 10, PALETTE.ink, 120); game.spawnFaller(this); game.audio.sfxFall(); }
    else if (cause === 'burn') { w.scorch(this.x, this.y, this.r * 1.6); }
    else {
      w.splat(this.x, this.y, dx || 0, dy || 0, (this.kind === 'butcher' ? 26 : 16) * TUNING.effects.bloodScale);
      if (this.kind === 'hunter') w.dot(this.x + 8, this.y + 6, 3, '#3a3236');
    }
    // His last breath, where he lies: it is what tells a dead man from a floored one before the
    // blood does. A man over an edge has his own shout going down with him.
    if (cause !== 'fall' && !this.scripted) game.audio.sfxGroan(this.kind, game.audio.heard(this.x - game.goat.x, this.y - game.goat.y));
    if (game.goat.holding === this) game.goat.holding = null;
    if (this.boss || this.keeper) game.bossPrize(this);
    game.onKill(this, cause);
  }

  // Bomb Charge: the man you headbutted goes off, and takes the room with him.
  explode(game) {
    if (this.exploded) return;
    this.exploded = true;
    const B = TUNING.goat.bomb, w = game.world;
    // The blast that flings and damages the room is still the full `B.radius` below; only the
    // burst graphic itself is drawn smaller and shorter, so the explosion reads as a beat in the
    // fight rather than something that eats the screen for a third of a second.
    game.fx.explosion(this.x,this.y,B.radius * B.fxScale,false,false,B.fxLife);
    w.splat(this.x, this.y, 0, 0, 30); w.scorch(this.x, this.y, B.radius * 0.5);
    game.particles(this.x, this.y, 18, PALETTE.blood, 320);
    game.particles(this.x, this.y, 10, PALETTE.fire, 260);
    game.ring(this.x, this.y, B.radius * B.fxScale, PALETTE.fireHi);
    game.shake(9); game.hitstop(0.05); game.audio.sfxBoom(); game.vibe(35);
    w.emitNoise(this.x, this.y, TUNING.noise.boom);
    for (const o of game.enemies) {
      if (o === this || o.dead || o.held || o.ghosted) continue;
      const dx = o.x - this.x, dy = o.y - this.y, d = Math.hypot(dx, dy);
      if (d > B.radius) continue;
      const nx = dx / (d || 1), ny = dy / (d || 1);
      // A heart, but never out of the air (`Status.blast` the same).
      if (o.kind === 'butcher') { o.hp -= 1; o.flash = 0.2; if (o.state !== 'hop') { o.state = 'stagger'; o.timer = 0.4; } if (o.hp <= 0) o.die(game, 'splat', nx, ny); }
      else if (o.kind === 'ratogre') o.die(game, 'splat', nx, ny);
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
    // THE DARK: out of the light a goat is a shape at `dark.ai.sight` tiles and nothing further — the
    // same few tiles his own ears give him — and a hound's a little more. Past it, noise is all anyone
    // has, on either side.
    if (game.goatLit === false) { const S = TUNING.dark.ai.sight; if (d > (S[this.kind] || S.all) * TILE) return false; }
    // Straw holding his eye, or a goat standing still in moth's wool (js/talismans.js).
    if (!Talisman.visibleTo(game, this, d)) return false;
    // The dead do not need a line of sight and they do not have a front. They simply know.
    if (this.kind === 'wraith') return true;
    // Tall grass hides the goat the way it hides them: past `grass.hideR`, a goat standing in it is
    // not there to see, cone or no cone. What gives him away in it is noise, as anywhere else.
    const w = game.world, gt = Math.floor(g.y / TILE) * w.W + Math.floor(g.x / TILE);
    if (w.grass[gt] && d > TUNING.grass.hideR * TILE) return false;
    const ang = Math.atan2(dy, dx);
    // Behind a man is behind him however close you are standing. Walking up on somebody used to
    // stop working inside two and a half tiles, which took away the one thing the cone was for; what
    // gives you away back there now is noise, and how much of it you make is yours to decide.
    // Bumping into him still counts: `feel` is the couple of pixels past the two bodies where he
    // stops needing eyes.
    // A hound on the hunt runs one way with his head turned the other, onto you: his body (`facing`)
    // is where his legs are taking him round the ring, and his eyes do not leave the goat.
    const eyesOn = this.kind === 'dog' && this.aware;
    if (!this.watchful && !eyesOn && Math.abs(angleDiff(this.facing, ang)) > this.cfg.cone / 2
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
      // The cave's stone teeth. Always out, so unlike a plate there is no beat at which they are floor.
      else if (p.kind === 'spire') { if (len(p.x - x, p.y - y) < p.r + this.r) return { kind: 'trap', p }; }
      // A barrel is furniture until its oil is lit; then it is everything it is about to set alight.
      else if (p.kind === 'barrel') { if (p.oilT >= 0 && len(p.x - x, p.y - y) < TUNING.prop.barrel.burst * TILE + this.r) return { kind: 'fire', p }; }
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
    const millNear = game.hazards.some((p) => (p.kind === 'mill' || p.kind === 'spike' || p.kind === 'spire')
      && Math.abs(p.x - this.x) < 9 * TILE && Math.abs(p.y - this.y) < 9 * TILE);
    // The mage lit it, and the mage is the one man in the building who knows how far it goes: he
    // reads flame and his own runes from further out. He still burns if he gets it wrong.
    // A gate's keeper, whose club lights it, does not (`TUNING.soulKeeper`): his fire is his undoing.
    const care = this.kind === 'seer' ? TUNING.seer.fireCare : 1;
    const look = this.r + (millNear ? TUNING.ai.trapLook : TUNING.fire.avoidLook) * care;
    const l = Math.hypot(dirx, diry) || 1; dirx /= l; diry /= l;
    // Only what is within a step of him can matter, and gathering that once keeps the probes cheap.
    const near = [];
    for (const p of game.hazards) {
      const reach = (p.kind === 'mill' ? TUNING.mill.armLen : p.kind === 'barrel' ? TUNING.prop.barrel.burst * TILE : p.r) + this.r + look + TUNING.ai.millClear + 6;
      if (p.kind === 'spire' && p.broken) continue;
      if (p.kind === 'barrel' && !(p.oilT >= 0)) continue;
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
        // The blunder is for a man already coming for you, rattled and in a hurry — a patrol who
        // has not even noticed the goat has no reason to misread the ground under his own feet.
        // Without `aware` here a bored guard would eventually wander into every plate in his room
        // simply from pacing past it enough times, which reads as broken rather than as a mistake.
        if (this.aware && Math.random() > this.trapSense) this.hazardBlind = TUNING.ai.blindFor;
      }
      if (this.hazardBlind > 0) return { x: dirx, y: diry };
    }
    // A way out has to be a way he can actually walk, or he just slides along the wall into it.
    const walkable = (ax, ay) => !w.isSolid(Math.floor((this.x + ax * look) / TILE), Math.floor((this.y + ay * look) / TILE));
    if (here && here.p) {
      // Already inside it: straight out from the hub, which is the shortest way to not being there.
      const ol = Math.hypot(this.x - here.p.x, this.y - here.p.y) || 1, ox = (this.x - here.p.x) / ol, oy = (this.y - here.p.y) / ol;
      // Round anything that stays put, though, not away from it: straight out from a brazier and
      // straight back in on the next step had a man rocking at the edge of its heat forever, with a
      // body's width of floor to walk past it by. Whatever of his way does not lead into it, plus a
      // little out. The wheel's arms come round at him, and a lit barrel is about to go up two and a
      // half tiles wide: from those two straight out is still the answer.
      if (here.p.kind !== 'mill' && here.p.kind !== 'barrel') {
        const into = dirx * ox + diry * oy, out = TUNING.ai.roundOut;
        let sx = dirx - Math.min(0, into) * ox + ox * out, sy = diry - Math.min(0, into) * oy + oy * out;
        const sl = Math.hypot(sx, sy) || 1; sx /= sl; sy /= sl;
        if (walkable(sx, sy)) return { x: sx, y: sy };
      }
      if (walkable(ox, oy)) { if (this.aware) game.bark(this, here.kind, 0.12); return { x: ox, y: oy, flee: true }; }
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
    // A hound goes round his own first, so that the floor still has the last word on where he steps.
    if (this.kind === 'dog' && game) { const a = this.passBodies(game, Math.atan2(diry, dirx), dt); dirx = Math.cos(a); diry = Math.sin(a); }
    // A man already alight has nothing left to dodge, and he ought to spread it.
    if (game && this.burning <= 0) {
      const safe = this.avoidHazard(dirx, diry, game);
      if (!safe) { this.vx = 0; this.vy = 0; this.facing = Math.atan2(diry, dirx); return; }
      dirx = safe.x; diry = safe.y;
      // No more than `ai.turn.perSec` turns a second (26 Sep 2026: a man at the wheel's edge flipped
      // between "at the goat" and "out of the arc" every frame, his sprite flickering fifteen times
      // a second). A turn wider than `turn.angle` inside the gap keeps him on the way he was going if
      // that way is still clear, else stands him for the rest of it. Getting out of a hazard he is
      // standing in is never held back.
      if (this.kind !== 'dog' && !this.scripted && speed > 0 && this.limitTurn(dirx, diry, speed, !!safe.flee, game)) return;
    }
    if (this.kind === 'dog' && game) { this.stride(dirx, diry, speed, dt, game); return; }
    const l = Math.hypot(dirx, diry) || 1;
    this.vx = dirx / l * speed; this.vy = diry / l * speed;
    if (speed > 0) this.facing = Math.atan2(this.vy, this.vx);
  }
  // The turn limit's bookkeeping for `moveToward`: returns true when it has set this step's
  // velocity itself (held on the old heading, or stood still). A man who has not walked for a
  // moment (`turn.fresh` s: a swing, a daze) sets off whichever way he likes.
  limitTurn(dirx, diry, speed, flee, game) {
    const T = TUNING.ai.turn, now = game.timer, want = Math.atan2(diry, dirx);
    const fresh = this.headAng === undefined || now - (this.headSeen || -9) > T.fresh;
    this.headSeen = now;
    if (fresh || flee || Math.abs(angleDiff(want, this.headAng)) <= T.angle) {
      if (!fresh && Math.abs(angleDiff(want, this.headAng)) > T.angle) this.turnAt = now;
      this.headAng = want; return false;
    }
    if (now - (this.turnAt || -9) >= 1 / T.perSec) { this.turnAt = now; this.headAng = want; return false; }
    const hx = Math.cos(this.headAng), hy = Math.sin(this.headAng), keep = this.avoidHazard(hx, hy, game);
    const w = game.world, ahead = this.r + 6;
    if (keep && keep.x * hx + keep.y * hy > 0.98 && !w.isSolid(Math.floor((this.x + hx * ahead) / TILE), Math.floor((this.y + hy * ahead) / TILE))) {
      this.vx = hx * speed; this.vy = hy * speed; this.facing = this.headAng;
    } else { this.vx = 0; this.vy = 0; this.facing = this.headAng; }
    return true;
  }
  // A hound's legs. Every other kind is set going the way he wants between one step and the next;
  // on a hound that was a statue sliding sideways round the goat and reversing in a frame whenever
  // the ring changed its mind (1.65: three to six reversals a second with three of them on a moving
  // goat). He carries a heading and a pace (`runAng`, `runSp`), turns at `dog.turn`, checks his
  // stride through a sharp turn, and his body points where he runs. Whatever set him going some
  // other way — a run, a hop, a blow — is picked up as his heading the first step he is back on
  // his legs.
  stride(dirx, diry, speed, dt, game) {
    const cfg = this.cfg, want = Math.atan2(diry, dirx);
    if (!(game.timer - this.strideAt < 0.05)) {
      this.runSp = Math.hypot(this.vx, this.vy);
      this.runAng = this.runSp > 20 ? Math.atan2(this.vy, this.vx) : this.facing;
    }
    this.strideAt = game.timer;
    const rate = cfg.turn * (this.runSp < this.speed * 0.3 ? cfg.pivot : 1) * dt;
    this.runAng += clamp(angleDiff(this.runAng, want), -rate, rate);
    // Kept within one turn: circling the ring it wound up past ±14 rad, and every eight-facing lookup
    // (`(round(a / 45deg) + 14) % 8`) went negative and threw inside the draw.
    this.runAng = Math.atan2(Math.sin(this.runAng), Math.cos(this.runAng));
    const left = Math.abs(angleDiff(this.runAng, want));
    const pace = speed * lerp(1, cfg.turnSlow, clamp(left / Math.PI, 0, 1));
    this.runSp += clamp(pace - this.runSp, -cfg.brake * this.speed * dt, cfg.accel * this.speed * dt);
    this.vx = Math.cos(this.runAng) * this.runSp; this.vy = Math.sin(this.runAng) * this.runSp;
    this.facing = this.runAng;
  }
  // Steer toward the goat using the flow field, or directly when close with line of sight.
  chaseGoat(game, speed, dt) {
    const g = game.goat, w = game.world;
    const dx = g.x - this.x, dy = g.y - this.y, d = Math.hypot(dx, dy);
    // A man on a post does not come and get you. He turns to face you and waits to be walked into,
    // which is what makes him something you can practise a headbutt on instead of something that
    // happens to you. Everything else about him — the windup, the swing, the recovery — is normal.
    if (this.sentry) { this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx); return d; }
    // A hunt in full cry is not quiet: a man running you down is heard the same as one running from
    // you, which is what lets a third man standing off to the side join a chase that never came
    // within sight of him at all.
    if (Math.random() < dt * TUNING.ai.chaseNoise) w.emitNoise(this.x, this.y, TUNING.noise.chase, 'cult');
    if (this.unstuck(game, dt, d, speed)) return d;
    const f = this.pathDir(game, dt);
    if (f) this.moveToward(f.x, f.y, speed, dt, game); else this.moveToward(dx, dy, speed * 0.5, dt, game);
    return d;
  }

  // Which way to walk to get to the goat. Close, with a straight run to him that a body this wide
  // fits down, straight at him. Otherwise the flow field, pulled tight: it is laid tile to tile and
  // knows nothing about how wide he is or what furniture stands in it, so followed a step at a time
  // he zigzagged, caught a pillar's corner and walked head-on into a lamp in the middle of his tile
  // and stood there pushing (a man in one route in seven on the cave, measured). He walks the field
  // `path.ahead` tiles forward and makes for the furthest point of it he can reach in a straight line.
  pathDir(game, dt) {
    const w = game.world, g = game.goat, P = TUNING.ai.path;
    this.pathT -= dt;
    const wp = this.wp;
    if (this.pathT <= 0 || !wp || len(wp.x - this.x, wp.y - this.y) < P.reach * TILE) {
      this.pathT = P.every * (0.8 + Math.random() * 0.4);
      // A shut door is not furniture to go round: it is walked up to and shouldered (`Prop` door
      // pressure), and a route that stopped short of it left him standing two tiles off it forever.
      this.pathProps = this.nearBlockers(game, this.x, this.y, (P.ahead + 2) * TILE).filter((p) => p.kind !== 'door');
      this.wp = this.pickWaypoint(game);
    }
    if (!this.wp) return null;
    // The goat moves between looks; a waypoint that is the goat follows him.
    const tx = this.wp.goat ? g.x : this.wp.x, ty = this.wp.goat ? g.y : this.wp.y;
    const dx = tx - this.x, dy = ty - this.y, l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
  }
  pickWaypoint(game) {
    const w = game.world, g = game.goat, P = TUNING.ai.path, props = this.pathProps, r = this.r * P.bodyMul;
    const d = len(g.x - this.x, g.y - this.y);
    if (d < (P.ahead - 1) * TILE && this.bodyClear(game, g.x, g.y, r, props)) return { goat: true };
    // The field that steps round the furniture, and for a body wider than a tile the one with no
    // one-tile gaps in it either — each only where it reaches him at all. Furniture that walls a
    // passage off entirely leaves him on the plain field, pushing at it, which is what he did before.
    // Standing with a shoulder against a table puts his middle on a tile the furniture claims, which
    // no route field numbers: he joins it at the best tile next to him instead.
    let tx = Math.floor(this.x / TILE), ty = Math.floor(this.y / TILE);
    const pts = [];
    const onto = (f) => {
      if (f[ty * w.W + tx] >= 0) return true;
      let best = -1, bd = 1e9;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const x = tx + ox, y = ty + oy;
        if (x < 0 || y < 0 || x >= w.W || y >= w.H) continue;
        const v = f[y * w.W + x];
        if (v >= 0 && v < bd) { bd = v; best = y * w.W + x; }
      }
      if (best < 0) return false;
      tx = best % w.W; ty = (best / w.W) | 0;
      pts.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
      return true;
    };
    if (this.r >= P.wideR) { const wide = this.wideWaypoint(game, props, r); if (wide) return wide; }
    let field = w.flow;
    if (onto(w.route)) field = w.route;
    for (let k = 0; k < P.ahead; k++) {
      const i = w.flowStep(tx, ty, field);
      if (i < 0) break;
      tx = i % w.W; ty = (i / w.W) | 0;
      pts.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
      if (field[i] === 0) break;
    }
    if (!pts.length) return null;
    for (let k = pts.length - 1; k > 0; k--) if (this.bodyClear(game, pts[k].x, pts[k].y, r, props)) return pts[k];
    return pts[0];
  }
  // The same walk down the wide field, which is numbered on the corners of the grid (see
  // `World.computeFlow`): from the nearest numbered corner round him, corner to corner. Null where
  // the wide field does not reach him, and he falls back to the ordinary one.
  wideWaypoint(game, props, r) {
    const w = game.world, f = w.routeW, W = w.W, P = TUNING.ai.path;
    const fx = this.x / TILE, fy = this.y / TILE;
    let cx = -1, cy = -1, bd = Infinity;
    for (let y = Math.floor(fy) - 1; y <= Math.floor(fy) + 2; y++) for (let x = Math.floor(fx) - 1; x <= Math.floor(fx) + 2; x++) {
      if (x < 1 || y < 1 || x >= W || y >= w.H || f[y * W + x] < 0) continue;
      const d = (x - fx) * (x - fx) + (y - fy) * (y - fy);
      if (d < bd) { bd = d; cx = x; cy = y; }
    }
    if (cx < 0) return null;
    const pts = [{ x: cx * TILE, y: cy * TILE }];
    for (let k = 0; k < P.ahead && f[cy * W + cx] > 0; k++) {
      let best = f[cy * W + cx], bx = -1, by = -1;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const x = cx + ox, y = cy + oy;
        if (x < 1 || y < 1 || x >= W || y >= w.H) continue;
        if (ox && oy && (f[cy * W + x] < 0 || f[y * W + cx] < 0)) continue;
        const v = f[y * W + x];
        if (v >= 0 && v < best) { best = v; bx = x; by = y; }
      }
      if (bx < 0) break;
      cx = bx; cy = by; pts.push({ x: cx * TILE, y: cy * TILE });
    }
    for (let k = pts.length - 1; k > 0; k--) if (this.bodyClear(game, pts[k].x, pts[k].y, r, props)) return pts[k];
    return pts[0];
  }
  // Whether a body of radius `r` walks from where he stands to (bx, by) in a straight line: the
  // middle and both shoulders against stone and a drop, the whole width against the furniture.
  bodyClear(game, bx, by, r, props, whole) {
    const w = game.world, ax = this.x, ay = this.y, dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    if (L < 1) return true;
    const ux = dx / L, uy = dy / L, sx = -uy * r, sy = ux * r;
    for (let s = 0; s <= L; s += 8) {
      const px = ax + ux * s, py = ay + uy * s;
      if (w.isSolid(Math.floor(px / TILE), Math.floor(py / TILE)) || w.isPitPx(px, py)) return false;
      // He stops at the far end, so the last body-width of it only has to take his middle: a goat
      // with his flank to the wall is still a goat you can walk straight up to. `whole` is for a spot
      // he means to stand on, which his whole width has to fit.
      if (!whole && s > L - r) continue;
      if (w.isSolid(Math.floor((px + sx) / TILE), Math.floor((py + sy) / TILE))) return false;
      if (w.isSolid(Math.floor((px - sx) / TILE), Math.floor((py - sy) / TILE))) return false;
    }
    const L2 = L * L;
    for (const p of props || game.props) {
      if (!p.blocking) continue;
      const t = clamp(((p.x - ax) * dx + (p.y - ay) * dy) / L2, 0, 1);
      if (Math.hypot(ax + dx * t - p.x, ay + dy * t - p.y) < p.r + r) return false;
    }
    return true;
  }
  // The watch on whether a chase is getting anywhere. Every `stuckCheck` s he has covered less than
  // `stuckMove` tiles and is not already at the goat, he is pinned — a corner, a boulder, two tables —
  // and for `unstick` s he walks the most open heading that still points somewhere near the goat.
  // Returns true while he is doing that, so the chase leaves him to it.
  unstuck(game, dt, d, speed) {
    const P = TUNING.ai.path;
    // A watch that was not running last step starts over: a swing is not being stuck.
    if (game.timer - this.chaseAt > 0.1) { this.stuckT = 0; this.stuckX = this.x; this.stuckY = this.y; this.unstick = 0; }
    this.chaseAt = game.timer;
    if (this.unstick > 0) {
      this.unstick -= dt;
      this.moveToward(Math.cos(this.unstickAng), Math.sin(this.unstickAng), speed, dt, game);
      return true;
    }
    this.stuckT += dt;
    if (this.stuckT < P.stuckCheck) return false;
    const moved = len(this.x - this.stuckX, this.y - this.stuckY);
    this.stuckT = 0; this.stuckX = this.x; this.stuckY = this.y;
    if (moved >= P.stuckMove * TILE || d < this.r + game.goat.r + TILE) return false;
    // Leaning on a shut door is not being stuck, it is how a door is opened: leave him to it.
    if (game.props.some((p) => p.kind === 'door' && p.blocking && len(p.x - this.x, p.y - this.y) < this.r + p.r + 10)) return false;
    const g = game.goat, want = Math.atan2(g.y - this.y, g.x - this.x), props = this.nearBlockers(game, this.x, this.y, 3 * TILE);
    let best = null, bestScore = -Infinity;
    for (let k = 0; k < 16; k++) {
      const a = want + (k / 16) * Math.PI * 2;
      const reach = [1.5, 1, 0.6].find((t) => this.bodyClear(game, this.x + Math.cos(a) * t * TILE, this.y + Math.sin(a) * t * TILE, this.r * 0.8, props));
      if (!reach) continue;
      const score = reach + Math.cos(angleDiff(a, want)) * 0.8 + Math.random() * 0.3;
      if (score > bestScore) { bestScore = score; best = a; }
    }
    if (best === null) return false;
    this.unstickAng = best; this.unstick = P.unstick; this.wp = null;
    this.moveToward(Math.cos(best), Math.sin(best), speed, dt, game);
    return true;
  }

  update(dt, game) {
    if (this.dead || this.scripted) return;
    const w = game.world, g = game.goat, cfg = this.cfg;
    // A rune lives only while he is painting it, standing or in the goat's mouth. A cast broken by
    // a crate, a body, a bullet or fire left it set: not drawn, still a trap to every man's
    // `hazardAt`, and picked up later he set it off on the first frame with no windup at all.
    if (this.rune && this.state !== 'cast' && this.state !== 'held') this.rune = null;
    // The floor stops. Flung, floored, alight or simply walking: a man over a hole is gone, and the
    // mist is the one thing that can cross one.
    // A Butcher in the middle of a leap is over the hole, not in it: he never lands in one (`hopSpot`).
    if (!this.ghosted && !this.held && this.state !== 'hop' && w.isPitPx(this.x, this.y)) { this.die(game, 'fall'); return; }
    this.chargeCd = Math.max(0, this.chargeCd - dt); this.reload = Math.max(0, this.reload - dt);
    this.barkCd = Math.max(0, this.barkCd - dt);
    this.dazed = Math.max(0, this.dazed - dt);
    this.poison = Math.max(0, this.poison - dt);
    if (this.shock > 0) this.shock = this.dazed > 0 && this.poison > 0 ? this.shock - dt : 0;
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
    // Nobody on fire is steering — a man alight who keeps walking his line at you is the one thing
    // that reads as the fire not counting, so everything that catches blunders. `immune.blunder`
    // (the Butcher, the hound) is the one exception the tool can turn on a kind: it still catches,
    // still bleeds hearts for it, but does not lose the room to it — it keeps whatever it was doing.
    if (this.burning > 0) {
      // A burning man thrown or butted still flies: the blunder's run is his own legs, and it used to
      // overwrite the throw every frame, so a man alight could not be put into a wall at all.
      const blunders = !this.blunderProof && this.state !== 'flung';
      this.burning -= dt;
      w.ignitePx(this.x, this.y);
      if (blunders) {
        if (Math.random() < dt * 4) this.burnDir += (Math.random() - 0.5) * 2.5;
        this.moveToward(Math.cos(this.burnDir), Math.sin(this.burnDir), TUNING.fire.burnRunSpeed, dt);
        this.x += this.vx * dt; this.y += this.vy * dt;
        if (w.collideCircle(this) > 0) this.burnDir += Math.PI * (0.6 + Math.random() * 0.8);
      }
      if (Math.random() < dt * 25) game.particles(this.x, this.y, 1, PALETTE.fire, 60);
      if (this.kind === 'butcher') {
        this.burnTick += dt;
        if (this.burnTick >= cfg.burnTick && this.burnHearts > 0) {
          this.burnTick = 0; this.burnHearts -= 1; this.hp -= this.scald ? TUNING.status.scald.damage : 1;
          game.floatText(this.x, this.y - 30, 'BURNING', PALETTE.fire);
          if (this.hp <= 0) { this.die(game, 'burn'); return; }
        }
        if (this.burning <= 0 && blunders) { this.state = 'stagger'; this.timer = cfg.stagger; this.vx = 0; this.vy = 0; this.scald = false; }
        else if (this.burning <= 0) this.scald = false;
      } else if (this.burning <= 0) {
        const n = this.scald ? TUNING.status.scald.damage : 1;
        this.scald = false; Status.hurt(game, this, n, 'burn'); return;
      }
      if (blunders) return;
      // Not blundering: fall through into the ordinary state machine below, still on fire.
    }
    // Caught on the cave's teeth: nothing he has works until he tears free. Whatever set his state
    // meanwhile (a stagger off the horns, a crate) is left for when he is off them.
    if (this.impaled > 0) { this.impaledStep(dt, game); return; }
    if (this.state === 'held') {
      // A held Hunter keeps shooting where he is pointed — for two or three rounds, and then he is
      // out and you are carrying a man. With Living Shield a held Bearer keeps swinging too, and
      // everything he hits is on his own side.
      if (this.kind === 'hunter' && this.reload <= 0 && this.heldShots > 0 && this.poison <= 0) {
        this.reload = cfg.reload * (game.mods.livingShield ? game.mods.shieldReload : 1) * game.mods.enemySlow;
        this.heldShots -= 1;
        game.fireBullet(this, Math.cos(this.facing), Math.sin(this.facing));
        if (this.heldShots <= 0) game.floatText(this.x, this.y - 28, 'CLICK', PALETTE.ashHi);
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
        } else if (this.castCd <= 0 && this.poison <= 0) {
          this.rune = { x: this.x, y: this.y }; this.timer = cfg.castWind * game.mods.enemySlow;
          game.audio.sfxCast(); game.world.emitNoise(this.x, this.y, TUNING.noise.cast, 'cult');
          game.floatText(this.x, this.y - 32, 'STILL CASTING', PALETTE.witch);
        }
      }
      if (game.mods.livingShield && this.kind !== 'hunter') {
        this.heldSwing -= dt;
        if (this.heldSwing <= 0) {
          this.heldSwing = game.mods.shieldSwing; this.flail = 0.25;
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
      this.millRun = null;                     // the wheel lesson's run ends at the first blow
      const drag =Math.exp(-TUNING.physics.flungDrag * Talisman.dragMul(game, this) * dt);
      this.vx *= drag; this.vy *= drag;
      this.x += this.vx * dt; this.y += this.vy * dt;
      const preSpeed = Math.hypot(this.vx, this.vy);
      const impact = w.collideCircle(this);
      if (impact > this.splatLimit(game)) {
        this.die(game, 'splat', this.vx / (preSpeed || 1), this.vy / (preSpeed || 1)); return;
      }
      // A thrown body dies on any wall it touches — except a man out of the goat's mouth, who has to
      // arrive at `physics.thrownKill` (MASON'S MARK lowers it the way it lowers `splatSpeed`).
      const needs = this.fromMouth ? TUNING.physics.thrownKill * Talisman.splatMul(game) : 0;
      if (impact > needs && this.thrown && this.kind !== 'butcher') { this.die(game, 'splat', 0, 0); return; }
      if (this.burning <= 0 && w.isBurningPx(this.x, this.y)) { this.ignite(game, w.isWitchPx(this.x, this.y)); return; }
      // A body arriving at speed knocks the coals out of the bowl as well as catching from it, so
      // a man thrown into a brazier lights the floor on the far side of it too.
      const bz = game.touchingBrazier(this);
      if (bz) { if (preSpeed > TUNING.physics.knockHitSpeed) bz.spill(game, this.vx, this.vy); this.ignite(game); return; }
      if (Math.hypot(this.vx, this.vy) < TUNING.physics.flungFloorSpeed) {
        // Off the rat ogre's arm with nothing left in him: he does not get up from it.
        if (this.doomed) { this.die(game, 'club', this.vx, this.vy); return; }
        this.state = 'floored'; this.timer = TUNING.bearer.flooredTime; this.flung = false; this.thrown = false;
      }
      return;
    }
    if (this.state === 'floored' || this.state === 'stagger' || this.state === 'stunned') {
      this.millRun = null;
      this.timer -= dt; this.vx *= 0.85; this.vy *= 0.85;
      this.x += this.vx * dt; this.y += this.vy * dt; w.collideCircle(this);
      // Not while already alight, the same guard as below: a kind that does not blunder stays in this
      // state when `ignite` no-ops, and the return skipped the timer — an ogre knocked down in a pool
      // of oil never got up and burned to death from full hearts.
      if (this.burning <= 0 && w.isBurningPx(this.x, this.y)) { this.ignite(game, w.isWitchPx(this.x, this.y)); return; }
      if (this.timer <= 0) {
        this.aware = true; this.state = 'chase';
        // The Butcher answers a stagger with a quick slam if you stayed close: the same ring, sooner.
        if (this.kind === 'butcher' && !g.dead && Math.hypot(g.x - this.x, g.y - this.y) < cfg.slam.near * TILE * cfg.slam.answerReach + g.r) { this.state = 'slamwind'; this.timer = cfg.slam.wind * cfg.slam.answer * game.mods.enemySlow; }
      }
      return;
    }

    // The wheel lesson waits for its audience (1.72): until the goat has set foot in their room the
    // two men hold their marks — no sight through the doorway, no footsteps, no idle wander, and so
    // no careless one riding the arm into the wall with nobody there to see it (playtest, 25 Sep
    // 2026). The first frame he is inside, the room plays as it always has.
    if (this.millLesson && !this.millOpen) {
      if (!g.dead && roomAt(game.level, g.x, g.y) === game.level.rooms[this.room]) this.millOpen = true;
      else { this.vx = 0; this.vy = 0; return; }
    }
    // The mage's man at the first gate (`game.bless`) holds his mark until he has been given its soul
    // in front of the goat: nothing he sees or hears moves him before that.
    if (this.blessing) { this.vx = 0; this.vy = 0; return; }
    // ---- perception ----
    // The wheel lesson's two men are there to be watched doing what they do, so they know the goat
    // the moment he is inside their room, cone and sight range or no (see `startLevel`).
    const sees = this.canSeeGoat(game) || (this.millLesson && !g.dead && roomAt(game.level, g.x, g.y) === game.level.rooms[this.room]);
    if (sees) {
      if (!this.aware) { if (this.kind === 'dog') game.houndSeen(this); else game.bark(this, 'spot', 0.85); }
      this.aware = true; this.lastSeen = { x: g.x, y: g.y }; this.lostTimer = 0;
    }
    else if (this.aware) {
      this.lostTimer += dt;
      // Lose the trail: no sight for a while and far away by path, go check the last place you were seen.
      // In THE DARK it goes cold in `dark.ai.lose` seconds wherever he is: he goes to the last place
      // he saw you, or the last thing he heard since, and hunts from there by ear.
      // A blow already under way is finished, not dropped: the dark cools a hunt, never a swing or a
      // charge in mid-run (pillar 4 — his windup and recovery are the goat's to read and eat).
      const hunting = this.state === 'chase' || this.state === 'noticed' || this.state === 'investigate';
      const cold = game.inDark ? this.lostTimer > TUNING.dark.ai.lose && hunting : this.lostTimer > 6 && w.flowDist(this.x, this.y) > 14;
      if (cold && this.state !== 'held') {
        this.aware = false; this.lostTimer = 0; this.target = this.lastSeen; this.state = 'investigate';
      }
    }
    // Close, and he has not seen you yet: what he mutters is the only warning you get.
    if (!sees && !this.aware && this.state !== 'investigate' && Math.random() < dt * TUNING.bark.nearChance
        && Math.hypot(g.x - this.x, g.y - this.y) < TUNING.bark.nearDist * TILE) game.bark(this, 'near');
    for (const n of w.noises) {
      // The rat ogre has his own mind: nothing lures him and nothing turns his head but what he sees.
      if (this.kind === 'ratogre' || this.state === 'hidden') break;
      if (Math.hypot(n.x - this.x, n.y - this.y) > n.r) continue;
      if (this.kind === 'seer' && game.inDark) this.hearForRune(game, n);
      if (n.kind === 'lure') {
        // A scream pulls everyone who hears it to the spot, even men already hunting you.
        // Stand still and they find you; move and they search where you were.
        // Not a man already committed to something: a windup, a charge, a cast, a leap, a wraith
        // that has become a body. The call reaches thirteen tiles and it used to drop every one of
        // those where it stood (an ogre mid-leap over a drop fell in); only `scream.balk`, two tiles
        // round the goat, is allowed to break a committed blow (`Enemy.balk`), and it has exceptions.
        const loose = !this.solid && (this.state === 'idle' || this.state === 'investigate' || this.state === 'noticed'
          || this.state === 'chase' || this.state === 'retreat');
        if (!loose) continue;
        this.target = { x: n.x, y: n.y }; this.state = 'investigate'; this.aware = false; this.lostTimer = 0;
        this.facing = Math.atan2(n.y - this.y, n.x - this.x); this.lured = 1.2;
        game.bark(this, 'search', 0.45);
      } else if (this.aware && !sees && game.inDark) {
        // Only what the goat made: a man hunting by ear who follows the cult's own shouts and swings
        // (`'cult'`) ends up investigating his own feet.
        if (n.kind !== 'cult') this.lastSeen = { x: n.x, y: n.y };
      } else if (!this.aware) {
        // Never his own shout or swing: a trail that went cold this step still has his last chase
        // shout in the list, and he went to investigate his own feet.
        if (n.kind === 'cult' && Math.hypot(n.x - this.x, n.y - this.y) < TUNING.ai.ownNoise * TILE) continue;
        this.target = { x: n.x, y: n.y };
        if (this.state === 'idle') { this.state = 'investigate'; game.bark(this, 'search', 0.3); }
        this.facing = Math.atan2(n.y - this.y, n.x - this.x);
      }
    }
    // Most men close the instant they see you, but not with nothing in between: at any real
    // distance a shape in the dark is a beat of doubt before it is a threat, and only being spotted
    // close up — inside `ai.noticeNear` — leaves no room for one. `noticeFor` (set only by
    // `startLevel`, on the Mill lesson's two men) still wins outright where it is set, because that
    // beat is a fixed, authored one and not a function of range. Everyone else gets a distance-scaled
    // version of the same freeze: `ai.noticeMin` seconds up close, out to `ai.noticeMax` at
    // `ai.noticeFar` tiles or beyond.
    if (this.aware && (this.state === 'idle' || this.state === 'investigate')) {
      let notice = this.noticeFor;
      if (!notice) {
        const distTiles = Math.hypot(g.x - this.x, g.y - this.y) / TILE, A = TUNING.ai;
        const t = clamp((distTiles - A.noticeNear) / (A.noticeFar - A.noticeNear), 0, 1);
        notice = t > 0 ? lerp(A.noticeMin, A.noticeMax, t) : 0;
      }
      if (notice > 0) { this.state = 'noticed'; this.timer = notice; }
      else this.state = 'chase';
    }
    if (this.state === 'noticed') {
      this.vx = 0; this.vy = 0; this.facing = Math.atan2(g.y - this.y, g.x - this.x);
      // `this.burning <= 0` is what keeps this from re-triggering on a kind that is already alight
      // and standing over the ground it is itself lighting: `ignite` no-ops while burning, but the
      // `return` here does not, and blunder-immune kinds fall through to this point still on fire.
      if (!this.ghosted && this.burning <= 0 && w.isBurningPx(this.x, this.y)) { this.ignite(game, w.isWitchPx(this.x, this.y)); return; }
      this.timer -= dt;
      // The careful one of the wheel's pair stays planted while his partner runs at the arm (up to
      // `ai.millRun.watch` s): walking beside him he was the man the flung body landed on, and the
      // room is two men doing two different things, one after the other.
      if (this.millLesson && !this.millRun && this.timer <= 0 && (this.millWatchT = (this.millWatchT || 0) + dt) < TUNING.ai.millRun.watch
          && game.enemies.some((o) => o.millRun && !o.dead && o.room === this.room)) return;
      if (this.timer <= 0) this.state = 'chase'; else return;
    }
    if (!this.ghosted && this.burning <= 0 && w.isBurningPx(this.x, this.y)) { this.ignite(game, w.isWitchPx(this.x, this.y)); return; }

    // The scream took the sense out of him: he is still standing, and can do nothing with it.
    if (this.dazed > 0) { this.vx = 0; this.vy = 0; return; }

    // Poison slows him twice over: his own clock (every windup, swing, recovery and reload runs at
    // `tempo`) and his stride. It is his time that is passed down, not the world's.
    const P = TUNING.status.poison, sick = this.poison > 0;
    // Alight and not blundering, the ogre and the butcher come at you harder rather than running.
    const rage = this.burning > 0 && !this.ghosted ? (this.champion ? TUNING.champion.rage : this.cfg.rage) : null;
    const kdt = (sick ? dt * P.tempo : dt) * (rage ? rage.tempo : 1);
    if (this.state === 'flee' || this.state === 'decoyhit') Talisman.enemyState(this, kdt, game);
    else if (this.millRun && this.state === 'chase' && this.runAtWheel(kdt, game)) { /* running at the arm */ }
    else if (this.kind === 'bearer') this.updateBearer(kdt, game, sees);
    else if (this.kind === 'hunter') this.updateHunter(kdt, game, sees);
    else if (this.kind === 'dog') this.updateDog(kdt, game, sees);
    else if (this.kind === 'seer') this.updateSeer(kdt, game, sees);
    else if (this.kind === 'wraith') this.updateWraith(kdt, game, sees);
    else if (this.kind === 'ratogre') this.updateOgre(kdt, game, sees);
    else this.updateButcher(kdt, game, sees);
    if (sick) { this.vx *= P.moveMul; this.vy *= P.moveMul; }
    if (rage && this.state === 'chase') { this.vx *= rage.speed; this.vy *= rage.speed; }

    // The dev drawer's ENEMY SPEED slider (`game.dev.tune`) bends the step, not the velocity: every
    // gait that ends here (walk, chase, stride, dart, charge, drift) is covered and nothing that reads
    // his speed as an impact (a splat, a door) is changed. At 1 it is `dt` exactly.
    const mv = game.dev && game.dev.tune ? dt * game.dev.tune.enemySpeed : dt;
    this.x += this.vx * mv; this.y += this.vy * mv;
    // Mist goes through the wall. That is the point of it, and it is why there is no safe corner
    // on the Ossuary: the only cover on that ground is which way you are facing.
    const impact = this.ghosted ? 0 : w.collideCircle(this);
    if (this.state === 'charge' && impact > 3 * TILE) this.chargeStopped(game);
    // A hound that runs his line into stone has run it.
    if (this.kind === 'dog' && this.state === 'dart' && impact > 0) this.dashEnd(game);
  }

  // The wheel lesson's careless man (`millRun`, set in `startLevel`): his first run is at the arm, at
  // the spot one of the two will have swept round to by the time he gets there, re-aimed every step,
  // so the arm and he arrive together. A man walking at the goat crossed a slow wheel between two
  // passes more often than not, and "he rides it into the wall" is the whole of what the room says.
  // No hazard check (`moveToward` without `game`): he is the one who cannot read it. Any blow, the
  // arm's or the goat's, ends it (state leaves 'chase'); `ai.millRun.give` s is the backstop.
  runAtWheel(dt, game) {
    const R = TUNING.ai.millRun, M = TUNING.mill;
    let m = this.millRun;
    if (m === true) m = this.millRun = game.props.find((p) => p.kind === 'mill' && !p.dead
      && roomAt(game.level, p.x, p.y) === game.level.rooms[this.room]) || null;
    this.millRunT = (this.millRunT || 0) + dt;
    if (!m || m.dead || this.millRunT > R.give) { this.millRun = null; return false; }
    const rad = M.armLen * R.depth;
    let bx = 0, by = 0, bd = Infinity;
    for (const a0 of [m.angle, m.angle + Math.PI]) {
      let px = m.x, py = m.y, t = 0;
      for (let k = 0; k < 3; k++) {
        const a = a0 + M.speed * t;
        px = m.x + Math.cos(a) * rad; py = m.y + Math.sin(a) * rad;
        t = Math.hypot(px - this.x, py - this.y) / (this.speed || 1);
      }
      const d = Math.hypot(px - this.x, py - this.y);
      if (d < bd) { bd = d; bx = px; by = py; }
    }
    this.moveToward(bx - this.x, by - this.y, this.speed, dt);
    this.facing = Math.atan2(this.vy, this.vx);
    return true;
  }

  // The charge meets something that does not move — stone, a gong, the hub of the wheel — and he
  // is the one who stops. That beat is the free hit the charge exists to offer.
  chargeStopped(game) {
    const C = TUNING.champion.charge;
    this.state = 'stunned'; this.timer = C.stun * game.mods.enemySlow; this.vx = 0; this.vy = 0; this.chargeCd = C.cooldown * game.mods.enemySlow;
    game.shake(6); game.audio.sfxSplat(); game.hitstop(0.04); game.floatText(this.x, this.y - 34, 'STUNNED', PALETTE.fireHi);
    game.world.emitNoise(this.x, this.y, TUNING.noise.splat);
  }

  idleWander(dt, game) {
    if (this.sentry) { this.vx = 0; this.vy = 0; return; }   // he was put facing that way on purpose
    // A man lying in the grass stays lying there until something gets him up: that is what hiding is.
    if (this.lurk && !this.aware) { this.vx = 0; this.vy = 0; return; }
    this.wander -= dt;
    // A man who has not seen or heard anything patrols his own room and nothing past it: once he
    // has drifted `ai.leash` tiles from where he was put, the next beat walks him home instead of
    // choosing a fresh direction, so idling never drifts a man through a doorway into the next room
    // (or, in a room built to teach one idea, out of the corner the level put him in to wait).
    const out = len(this.x - this.home.x, this.y - this.home.y) > TUNING.ai.leash * TILE;
    if (this.wander <= 0 || out) {
      this.wander = 1 + Math.random() * 3;
      let f = out ? Math.atan2(this.home.y - this.y, this.home.x - this.x) : this.facing + (Math.random() - 0.5) * 2;
      // A pure random turn can point him straight at the wall behind him, and nothing about idling
      // ever checked: he'd just stand there looking at stone until the next wander beat. Resample a
      // few times against a look-ahead probe rather than leave him facing it — this only ever
      // touches the direction he is about to face, never whether he walks.
      if (!out) {
        const w = game.world, look = TUNING.ai.wanderClear * TILE;
        for (let tries = 0; tries < 5 && w.isSolid(Math.floor((this.x + Math.cos(f) * look) / TILE), Math.floor((this.y + Math.sin(f) * look) / TILE)); tries++) {
          f = this.facing + (Math.random() - 0.5) * 2;
        }
      }
      this.facing = f;
      // A man who has not seen anything still shifts his weight now and then rather than standing
      // like a post: about half of a wander beat is a few slow steps in whatever direction he just
      // turned to face, the rest is standing and looking. A room nobody has walked into yet used to
      // hold every man in it dead still until the moment he spotted you, which read as a stage set
      // rather than a room somebody was actually standing in.
      this.walking = out || Math.random() < 0.5;
    }
    if (this.walking) this.moveToward(Math.cos(this.facing), Math.sin(this.facing), this.speed * TUNING.ai.wanderSpeed, dt, game);
    else { this.vx = 0; this.vy = 0; }
  }
  investigate(dt, game) {
    if (this.sentry) { this.target = null; this.state = 'idle'; this.vx = 0; this.vy = 0; return; }
    if (!this.target) { this.state = 'idle'; return; }
    const dx = this.target.x - this.x, dy = this.target.y - this.y, d = Math.hypot(dx, dy);
    // A noise on the far side of a wall used to be walked at in a straight line, into the wall, and
    // given up on there — so the one thing the goat could not do was be heard round a corner. The
    // route field runs to the goat, so for a noise near him (a footstep, a scream, a crate) it runs
    // to the noise as well: he walks it round, and only a noise far from anything goes in a line.
    const g = game.goat, routed = !game.world.los(this.x, this.y, this.target.x, this.target.y)
      && len(this.target.x - g.x, this.target.y - g.y) < TUNING.ai.routeNoise * TILE;
    if (d < TILE || (!routed && this.wallHit && Math.random() < dt * 2)) { this.target = null; this.state = 'idle'; this.vx = 0; this.vy = 0; return; }
    const f = routed ? this.pathDir(game, dt) : null;
    if (f) this.moveToward(f.x, f.y, this.speed * 0.6, dt, game);
    else this.moveToward(dx, dy, this.speed * 0.6, dt, game);
  }

  updateBearer(dt, game, sees) {
    const g = game.goat, cfg = this.cfg, reach = this.atk('reach');
    if (this.state === 'idle') { this.idleWander(dt, game); return; }
    if (this.state === 'investigate') { this.investigate(dt, game); return; }
    // The butcher runs at you (`chargeStep`); the man holding a post never leaves it.
    if (this.champion && !this.sentry && this.chargeStep(dt, game, sees)) return;
    if (this.state === 'chase') {
      const d = this.chaseGoat(game, this.speed, dt);
      if (d < reach + g.r && !g.dead) { this.state = 'windup'; this.timer = this.atk('windup') * game.mods.enemySlow; this.vx = 0; this.vy = 0; game.bark(this, 'attack', 0.25); }
      return;
    }
    if (this.state === 'windup') {
      this.vx = 0; this.vy = 0; this.facing = Math.atan2(g.y - this.y, g.x - this.x); this.timer -= dt;
      if (this.timer <= 0) { this.state = 'swing'; this.timer = this.atk('swing') * game.mods.enemySlow; game.audio.sfxSwing(); game.world.emitNoise(this.x, this.y, TUNING.noise.swing, 'cult'); this.swingHit = false; }
      return;
    }
    if (this.state === 'swing') {
      this.timer -= dt;
      if (!this.swingHit) { this.swingHit = true; game.meleeHit(this, reach + 6, Math.PI / 2, cfg.damage, cfg.knock); if (this.keeper) this.keeperFire(game); }
      if (this.timer <= 0) { this.state = 'recover'; this.timer = this.atk('recover') * game.mods.enemySlow; }
      return;
    }
    if (this.state === 'recover') { this.vx = 0; this.vy = 0; this.timer -= dt; if (this.timer <= 0) this.state = 'chase'; }
  }

  // A gate's keeper brings his club down and the floor where it lands goes up in witchfire: a patch
  // `soulKeeper.fireAt` tiles in front of him, `fireR` round, never the tile he stands on, so the
  // blow is read by its windup and paid for after it by ground the goat cannot stand on. Like any
  // blow of his it is not dealt from a room the fog is still hiding (`game.meleeHit`'s rule).
  keeperFire(game) {
    if (game.hidden(this.x, this.y)) return;
    const K = TUNING.soulKeeper, w = game.world;
    const cx = this.x + Math.cos(this.facing) * K.fireAt * TILE, cy = this.y + Math.sin(this.facing) * K.fireAt * TILE;
    const tx0 = Math.floor(cx / TILE), ty0 = Math.floor(cy / TILE), r = Math.ceil(K.fireR);
    const mx = Math.floor(this.x / TILE), my = Math.floor(this.y / TILE);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const tx = tx0 + dx, ty = ty0 + dy;
      if (Math.hypot(dx, dy) > K.fireR || (tx === mx && ty === my)) continue;
      if (!w.los(this.x, this.y, (tx + 0.5) * TILE, (ty + 0.5) * TILE)) continue;
      w.ignite(tx, ty, true, K.fireFor, true);
    }
    game.ring(cx, cy, K.fireR * TILE * 1.4, PALETTE.witchHi);
    game.audio.sfxRune();
  }

  // The ogre coming down, fists on the floor (`slam`) or out of a leap (`leap`): a ring round him,
  // every way at once. The goat inside it is hurt and thrown straight out from him. His own men in
  // it are left standing — it is the goat the ring is for — and so is anything he lands among.
  quake(game, S, R) {
    const g = game.goat;
    game.shake(9); game.hitstop(0.05); game.audio.sfxThud(); game.audio.sfxSplat(); game.vibe(24);
    game.ring(this.x, this.y, R, PALETTE.blood, 0.45, 5); game.ring(this.x, this.y, R * 0.6, PALETTE.bone, 0.35, 3);
    game.dust(this.x, this.y, 12, 0, 0);
    game.world.emitNoise(this.x, this.y, TUNING.noise.swing, 'cult');
    if (game.hidden(this.x, this.y)) return;
    if (!g.dead) {
      const dx = g.x - this.x, dy = g.y - this.y, d = Math.hypot(dx, dy);
      // The shield between him and the goat takes the ring as it takes a club (`Goat.blockBlow`); he
      // is on his knees already, so no parry on top of it.
      if (d < R + g.r && game.reaches(this.x, this.y, g.x, g.y) && !Talisman.parry(game, this, 'slam') && !g.blockBlow(game, this, false)) {
        const nx = dx / (d || 1), ny = dy / (d || 1);
        g.damage(S.damage * game.mods.butcherDamage, game, nx * S.knock * 4, ny * S.knock * 4, false, this);
      }
    }
    for (const p of game.props) {
      if (Beast.animal(p) && !p.held && p.birdState !== 'flying' && Math.hypot(p.x - this.x, p.y - this.y) < R + (p.r || 0)) Beast.hurt(p, game, 'blow');
    }
  }
  updateHunter(dt, game, sees) {
    const g = game.goat, cfg = this.cfg;
    if (this.state === 'idle') { this.idleWander(dt, game); return; }
    if (this.state === 'investigate') { this.investigate(dt, game); return; }
    const dx = g.x - this.x, dy = g.y - this.y, d = Math.hypot(dx, dy);
    if (this.state === 'aim') {
      this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx); this.timer -= dt;
      if (!sees || this.poison > 0) { this.state = 'chase'; return; }
      // A man of his own standing right in front of the muzzle: he lowers it and steps off the line
      // instead of putting a round through him. Only close — past `friendClear` tiles he is looking
      // at the goat and not at who is in between, which is the friendly fire the room is built on.
      if (this.friendInLine(game, Math.atan2(dy, dx))) { this.state = 'chase'; this.stepOff(); return; }
      if (this.timer <= 0) {
        let spread = (Math.random() - 0.5) * 0.1;
        // Point blank he flinches: half the time the round goes somewhere else altogether.
        if (d < cfg.wildNear * TILE && Math.random() < cfg.wildChance)
          spread = (Math.random() < 0.5 ? -1 : 1) * cfg.wildSpread * (1 + Math.random());
        game.fireBullet(this, Math.cos(this.facing + spread), Math.sin(this.facing + spread));
        this.reload = cfg.reload * game.mods.enemySlow; this.state = 'chase';
      }
      return;
    }
    // chase: keep distance, shoot when possible
    const reach = (cfg.sight + (this.watchful ? cfg.watchSight : 0)) * TILE;
    // Stepping out from behind the man in front of him: sideways across the line, a beat, then look again.
    if (this.sidestep > 0) {
      this.sidestep -= dt;
      this.moveToward(-dy * this.sideSign, dx * this.sideSign, this.speed * 0.8, dt, game);
      this.facing = Math.atan2(dy, dx);
      if (!this.wallHit) return;
      this.sidestep = 0;
    }
    // Poisoned he is blind: he keeps his distance, and he cannot put the rifle on you.
    if (sees && this.reload <= 0 && d < reach && this.poison <= 0 && this.friendInLine(game, Math.atan2(dy, dx))) this.stepOff();
    else if (sees && this.reload <= 0 && d < reach && this.poison <= 0) {
      this.state = 'aim'; this.timer = cfg.aimTime * game.mods.enemySlow; this.vx = 0; this.vy = 0;
      // The bolt going back is the one warning a rifle gives, and it is given by ear: loud up close,
      // gone at `cockHear` tiles, never from a room the fog is still hiding.
      if (!game.hidden(this.x, this.y)) game.audio.sfxCock(clamp(1 - d / (cfg.cockHear * TILE), 0, 1));
      return;
    }
    // A man posted to watch a door does not leave it to come and find you. He holds it, turns on the
    // spot and waits out his reload: the room in front of him is the trap, not the man himself.
    if (this.watchful && d > cfg.backoffDist * TILE) { this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx); return; }
    if (d < cfg.backoffDist * TILE && sees) {
      // Backing off round what is behind him rather than into it: straight back he pinned himself in
      // the first corner and pushed at it. With nowhere to go but toward you, he stands his ground.
      const away = this.clearAng(game, Math.atan2(-dy, -dx), TILE, this.x, this.y, undefined, null);
      if (away !== null && Math.abs(angleDiff(away, Math.atan2(dy, dx))) > Math.PI / 2) this.moveToward(Math.cos(away), Math.sin(away), this.speed * 0.7, dt, game);
      else { this.vx = 0; this.vy = 0; }
      this.facing = Math.atan2(dy, dx); return;
    }
    if (d > cfg.keepMax * TILE || !sees) { this.chaseGoat(game, this.speed, dt); return; }
    this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx);
  }

  // Is one of his own in the first `friendClear` tiles of the line he would fire down?
  friendInLine(game, ang) {
    const R = this.cfg.friendClear * TILE, cx = Math.cos(ang), cy = Math.sin(ang);
    for (const o of game.enemies) {
      if (o === this || o.dead || o.held || o.ghosted || o.kind === 'ratogre') continue;
      const ox = o.x - this.x, oy = o.y - this.y, along = ox * cx + oy * cy;
      if (along <= 0 || along > R + o.r) continue;
      if (Math.abs(ox * -cy + oy * cx) < o.r + 5) return true;
    }
    return false;
  }
  stepOff() {
    this.sidestep = this.cfg.stepOff; this.vx = 0; this.vy = 0;
    // Whichever way he stepped last time did not work, or it would not be happening again.
    this.sideSign = this.sideSign ? -this.sideSign : (Math.random() < 0.5 ? -1 : 1);
  }

  // The hound: hit and run. He closes, then circles just outside his own reach until he is near
  // enough to run at you. Then he stops, and for a second the line he is about to run is drawn on the
  // floor in red — bent, because it starts off the side he was circling and turns onto you — and he
  // runs it barking, turning after you as he goes, and bites whatever is in front of him. The charge
  // is the window: he is standing still and telling you exactly where he is going to be.
  updateDog(dt, game, sees) {
    const g = game.goat, cfg = this.cfg;
    this.lungeCd = Math.max(0, this.lungeCd - dt);
    this.flipCd = Math.max(0, this.flipCd - dt);
    this.sideT = Math.max(0, (this.sideT || 0) - dt);
    this.circleTimer -= dt;
    if (this.circleTimer <= 0) {
      this.circleTimer = cfg.circleFlip * (0.6 + Math.random());
      // A pack spreads round you rather than bunching on one side: with another hound on the ring
      // near him, he circles away from it. Alone, it is the coin it always was — rarer, and never
      // inside `sideHold` of the last time he wheeled: with a heading that has to come round, every
      // flip is a turn on the floor, and a coin every second was a dog who could not decide.
      // A mate well round the ring from him (`mateArc`) is not bunching and leaves him be: the sign
      // off a mate's angle flipped each time the two of them crossed the goat's line.
      const mate = this.ringMate(game, cfg);
      let sign = this.circleSign;
      if (mate) {
        const me = Math.atan2(this.y - g.y, this.x - g.x), it = Math.atan2(mate.y - g.y, mate.x - g.x);
        // A positive sign walks him clockwise on screen, which is his angle round the goat falling.
        if (Math.abs(angleDiff(it, me)) < cfg.mateArc) sign = angleDiff(it, me) > 0 ? -1 : 1;
      } else if (Math.random() < cfg.flipOdds) sign = -sign;
      if (sign !== this.circleSign && this.sideT <= 0) { this.circleSign = sign; this.sideT = cfg.sideHold; }
    }
    if (this.state === 'idle') { this.idleWander(dt, game); return; }
    if (this.state === 'investigate') { this.investigate(dt, game); return; }
    // A hound on the hunt is heard before he is seen, and from which side: he barks as he runs
    // (`barkGap`), faster on the run in (`barkDart`), and not while he plants and growls.
    if (this.state === 'chase' || this.state === 'retreat' || this.state === 'dart') {
      this.barkT = (this.barkT == null ? Math.random() * cfg.barkGap : this.barkT) - dt;
      if (this.barkT <= 0) {
        this.barkT = (this.state === 'dart' ? cfg.barkDart : cfg.barkGap) * (0.6 + Math.random() * 0.8);
        game.audio.sfxBark(game.audio.heard(this.x - g.x, this.y - g.y));
      }
    }
    const dx = g.x - this.x, dy = g.y - this.y, d = Math.hypot(dx, dy);
    // The sidestep carries him: the burst was set the moment he slipped the headbutt.
    if (this.state === 'dodge') { this.timer -= dt; if (this.timer <= 0) { this.state = 'chase'; this.vx *= 0.25; this.vy *= 0.25; } return; }
    if (this.state === 'retreat') {
      this.timer -= dt;
      // The break: out past you and wheeling off the side he was circling, round and away onto the
      // ring — mostly round, a little out. He used to back straight off with his face to you, which
      // on a sprite with no legs was a dog sliding backwards; and straight out is a turn right round
      // off a run that was pointed at the goat. Run round what is in the way, the same whisker as the
      // ring: straight back he put his rump into the first wall and stood there.
      const nx = dx / (d || 1), ny = dy / (d || 1), out = cfg.breakOut;
      const away = this.clearAng(game, Math.atan2(nx * this.circleSign - ny * out, -ny * this.circleSign - nx * out), cfg.orbitLook * TILE);
      this.moveToward(Math.cos(away), Math.sin(away), this.speed * 0.95, dt, game);
      if (this.timer <= 0 || d > cfg.circle * TILE * 1.1) { this.state = 'chase'; this.ringT = cfg.ringHold; }
      return;
    }
    // The charge: planted, the line on the floor re-aimed at wherever the goat has got to.
    if (this.state === 'windup') {
      // A plate arming under his crouch, flame at his feet: the one man in the building who reads
      // the floor gives the run up and gets off it (the ring's own hazard step takes him clear).
      // Planted through a whole second of windup, he stood and waited for the grating to come up.
      if (this.hazardAt(game, this.x, this.y)) { this.state = 'chase'; this.lungeCd = cfg.packWait; this.dashPath = null; return; }
      this.vx = 0; this.vy = 0; this.timer -= dt;
      this.dashAng = Math.atan2(dy, dx) + this.circleSign * cfg.dashSkew;
      this.facing = this.dashAng;
      this.dashPath = this.planDash(game, this.x, this.y, this.dashAng, cfg.dashTime);
      if (this.timer <= 0) {
        this.state = 'dart'; this.timer = cfg.dashTime; this.swingHit = false;
        game.audio.sfxBark(game.audio.heard(this.x - g.x, this.y - g.y)); this.barkT = cfg.barkDart;
        game.floatText(this.x, this.y - 22, 'RRAF', PALETTE.bone);
        game.world.emitNoise(this.x, this.y, TUNING.noise.swing, 'cult');
      }
      return;
    }
    // The run: along the line, turning onto the goat as fast as `dashTurn` lets him, and the first
    // time the goat is in front of his teeth he bites.
    if (this.state === 'dart') {
      this.timer -= dt;
      // Through him and a little on, and that is the run: once the goat is behind him and
      // `overrun` tiles off, it is over. It used to go on for its whole time, homing back round,
      // and past a goat by a wall the line on the floor came back on itself in a hook.
      const ahead = Math.abs(angleDiff(this.dashAng, Math.atan2(dy, dx))) < Math.PI / 2;
      if (!ahead && d > cfg.overrun * TILE) { this.dashEnd(game); return; }
      this.dashAng = this.runStep(game, this.x, this.y, this.dashAng, dt);
      this.facing = this.dashAng;
      const sp = this.dashSpeedAt(cfg.dashTime - this.timer);
      this.vx = Math.cos(this.dashAng) * sp; this.vy = Math.sin(this.dashAng) * sp;
      this.dashPath = this.planDash(game, this.x, this.y, this.dashAng, this.timer, cfg.dashTime - this.timer);
      // Onto the horns. His teeth reach further than the goat's head, so a lunge thrown at him as
      // he arrived landed a beat after the bite had already taken its heart (playtest, 25 Sep 2026).
      // A goat already in his lunge and aimed at him is met first: the bite waits the frame or two it
      // takes them to meet, and the horns (`Goat.headbuttHits`) take the run off him. Early, late or
      // wide, the lunge is spent and he bites as before.
      const onHorns = g.state === 'lunge' && (-dx * g.aim.x - dy * g.aim.y) / (d || 1) > 0.5;
      if (!g.dead && !onHorns && d < cfg.reach + this.r + g.r && Math.abs(angleDiff(this.dashAng, Math.atan2(dy, dx))) < 1.1) {
        game.meleeHit(this, cfg.reach + this.r, Math.PI * 0.8, cfg.damage, cfg.knock);
        game.audio.sfxSnap();
        this.dashEnd(game); return;
      }
      if (this.timer <= 0) this.dashEnd(game);
      return;
    }
    if (this.state === 'recover') {
      // He slides on off the run and gathers himself: the goat's window, still (pillar 4).
      const k = Math.exp(-cfg.skid * dt); this.vx *= k; this.vy *= k; this.timer -= dt;
      if (this.timer <= 0) { this.state = 'retreat'; this.timer = cfg.retreat * (0.7 + Math.random() * 0.7); }
      return;
    }
    // chase: close the gap while he cannot see you, then orbit until the moment comes. A goat on the
    // far side of a wall is not a goat to circle, however near: he used to run the ring on the wrong
    // side of the stone with his nose to it. Round by the route instead, until there is a line.
    if (!sees && (d > cfg.circle * TILE || !game.sees(this.x, this.y, g.x, g.y))) { this.ringing = false; this.chaseGoat(game, this.speed, dt); return; }
    // Seen from well outside the ring, the ring's own steering was a straight line at you with a
    // sideways lean and a whisker, which across a room of pillars is a dog bouncing between them.
    // He runs the route in, and only starts to circle once he is nearly on the ring — and once on
    // it, keeps to it until the goat is clear of `ringOut` more: one edge for both ways was a goat
    // walking past it and a dog switching between the route and the ring every other step.
    const ringFar = cfg.circle * TILE * cfg.ringIn * (this.ringing ? cfg.ringOut : 1);
    if (d > ringFar && !(this.lungeCd <= 0 && !(this.ringT > 0) && d < cfg.dashRange * TILE)) { this.ringing = false; this.chaseGoat(game, this.speed, dt); return; }
    this.ringing = true;
    this.ringT = Math.max(0, (this.ringT || 0) - dt);
    let commit = this.lungeCd <= 0 && this.ringT <= 0 && !g.dead && sees && d < cfg.dashRange * TILE;
    // One hound goes in at a time. Three of them committing together is a coin toss you cannot read;
    // three of them taking turns is a pack, and it is the difference between hard and unfair.
    if (commit && this.packBusy(game, cfg)) { this.lungeCd = cfg.packWait * (0.7 + Math.random() * 0.6); commit = false; }
    if (commit) {
      this.state = 'windup'; this.timer = cfg.windup * game.mods.enemySlow; this.vx = 0; this.vy = 0;
      this.lungeCd = cfg.lungeCd * (0.7 + Math.random() * 0.6);
      game.audio.sfxGrowl();
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
    // Closing, holding the ring, or easing out again, depending on how near he already is — on a
    // slope, not in three steps: each step was a 40° kink in his line wherever the goat's own
    // walking moved the edge across him.
    const ring = cfg.circle * TILE;
    const closing = clamp((d - ring) / (ring * 0.35), -0.6, 1);
    // The ring is run round what stands in it. Straight along the tangent he used to put his nose
    // into the first pillar on it and push, which read as a dog that had forgotten how to run: the
    // whisker finds the nearest heading with floor ahead of it, and if the circle is walled off on
    // this side altogether he turns and circles the other way.
    const want = Math.atan2(ny * closing + ty, nx * closing + tx);
    const ang = this.clearAng(game, want, cfg.orbitLook * TILE);
    // Not every frame, though: walled on both sides of the ring (a corridor), that flip used to fire
    // sixty times a second and he shivered on the spot. Once, then he runs what he chose a beat.
    if (Math.abs(angleDiff(ang, want)) > 1.3 && this.flipCd <= 0) { this.circleSign *= -1; this.flipCd = cfg.flipGap; this.sideT = cfg.sideHold; }
    // His body goes where his legs do (`stride`); his eyes stay on you (`canSeeGoat`).
    this.moveToward(Math.cos(ang), Math.sin(ang), this.speed * (this.lungeCd > 0 ? 0.92 : 1), dt, game);
  }

  // The nearest heading to `ang` with `look` px of floor in front of it — stone, a drop and blocking
  // furniture all count — swept out either side in widening steps. The hound's whisker: it is what
  // makes him go round a pillar rather than into it, orbiting and running alike. With nothing open
  // it hands back `none` (the heading asked for, unless the caller would rather hear so).
  clearAng(game, ang, look, x = this.x, y = this.y, props, none = ang) {
    if (!props) props = this.nearBlockers(game, x, y, look + 2 * TILE);
    const open = (a) => this.openAng(game, a, look, x, y, props);
    if (open(ang)) return ang;
    for (let k = 1; k <= 6; k++) {
      const a = ang + k * 0.35 * this.circleSign, b = ang - k * 0.35 * this.circleSign;
      if (open(a)) return a;
      if (open(b)) return b;
    }
    return none;
  }
  // Whether `look` px ahead of (x, y) on heading `a` take his width: stone and a drop at his middle
  // and shoulders, blocking furniture, and with `bodies` the men and hounds in them as well.
  openAng(game, a, look, x, y, props, bodies) {
    const w = game.world, r = this.r, cx = Math.cos(a), cy = Math.sin(a);
    for (let s = r; s <= look + r; s += 8) {
      const px = x + cx * s, py = y + cy * s;
      if (w.isSolid(Math.floor(px / TILE), Math.floor(py / TILE)) || w.isPitPx(px, py)) return false;
      if (w.isSolid(Math.floor((px - cy * r) / TILE), Math.floor((py + cx * r) / TILE))) return false;
      if (w.isSolid(Math.floor((px + cy * r) / TILE), Math.floor((py - cx * r) / TILE))) return false;
      for (const p of props) if (Math.hypot(p.x - px, p.y - py) < p.r + r * 0.8) return false;
      // Past a body is along its edge, and a body stood at a lip must not be passed over the drop.
      if (bodies && (w.isPitPx(px - cy * r, py + cx * r) || w.isPitPx(px + cy * r, py - cx * r))) return false;
      if (bodies) for (const o of bodies) if (Math.hypot(o.x - px, o.y - py) < o.r + r) return false;
    }
    return true;
  }
  // The hound's eye for his own (24 Sep 2026: "he cannot get round his own"). Nothing else he
  // steers by knows a body is there — the fields are stone, the whisker stone and furniture — so a
  // clubman on his route or a packmate on the ring was run into and leaned on, the two of them
  // shoved along at half his pace, and in a doorway not at all. With one ahead of him inside
  // `pass.look` tiles (and nearer than the goat), he takes the nearest heading that clears it on
  // the side away from it — kept `pass.hold` s, or a man square in front flipped him every step —
  // that stone, drops, furniture, flame and the other bodies allow, no more than `pass.arc` off
  // where he meant to go. Hemmed in on both sides he leans on as before, which is still how a
  // one-tile corridor gets opened.
  passBodies(game, want, dt) {
    const cfg = this.cfg.pass, g = game.goat;
    this.passT = Math.max(0, (this.passT || 0) - dt);
    this.passOff = Math.max(0, (this.passOff || 0) - dt);
    if (!cfg || this.passOff > 0) return want;
    const look = cfg.look * TILE, r = this.r, x = this.x, y = this.y, cx = Math.cos(want), cy = Math.sin(want);
    const gd = len(g.x - x, g.y - y), bodies = [];
    let first = null, fa = Infinity, fside = 0;
    for (const o of game.enemies) {
      if (o === this || o.dead || o.held || o.ghosted || o.state === 'hop' || o.state === 'flung') continue;
      const ox = o.x - x, oy = o.y - y, box = look + r + o.r + TILE;
      if (ox > box || ox < -box || oy > box || oy < -box) continue;
      bodies.push(o);
      const along = ox * cx + oy * cy, side = oy * cx - ox * cy;
      if (along <= 0 || along > look + r + o.r || along > gd || Math.abs(side) >= o.r + r) continue;
      if (along < fa) { fa = along; first = o; fside = side; }
    }
    if (!first) { this.passFor = 0; return want; }
    // Boxed in among three or four of them, going round one put him onto the next, and he ran rings
    // in the knot: `give` s of going round without getting a tile nearer the goat, he leans for as long.
    if (!this.passFor) this.passD = gd;
    this.passFor = (this.passFor || 0) + dt;
    if (this.passFor > cfg.give) {
      this.passFor = 0;
      if (gd > this.passD - TILE) { this.passOff = cfg.give; return want; }
    }
    if (this.passT <= 0 || this.passBy !== first) { this.passSide = fside > 0 ? -1 : 1; this.passBy = first; }
    this.passT = cfg.hold;
    const props = this.nearBlockers(game, x, y, look + 2 * TILE);
    for (let k = 1; k * cfg.step <= cfg.arc; k++) for (const s of [this.passSide, -this.passSide]) {
      const a = want + s * k * cfg.step;
      if (!this.openAng(game, a, look, x, y, props, bodies)) continue;
      if (this.hazardAt(game, x + Math.cos(a) * look * 0.5, y + Math.sin(a) * look * 0.5) || this.hazardAt(game, x + Math.cos(a) * look, y + Math.sin(a) * look)) continue;
      return a;
    }
    return want;
  }
  nearBlockers(game, x, y, R) {
    return game.props.filter((p) => !p.broken && p.blocking && Math.abs(p.x - x) < R && Math.abs(p.y - y) < R);
  }
  // The run starts from a standing crouch and takes a beat to reach its top speed: quick, not a
  // teleport. `t` is seconds into the run.
  dashSpeedAt(t) {
    const cfg = this.cfg;
    return cfg.dashSpeed * Math.min(1, cfg.dashStart + (1 - cfg.dashStart) * t / cfg.dashRamp);
  }

  // One step of the run's heading, shared by the run and the line drawn for it so the two cannot
  // disagree. He homes onto the goat at `dashTurn` only while the goat is still in front of him —
  // homing on a goat he had passed turned the run back on itself. A corner in the way is run round,
  // not into: the same whisker the orbit uses bends it, never past the goat himself (a goat with his
  // back to a wall is not a wall to steer off), and never faster than `whiskTurn` — let the whisker
  // snap and a run meeting a wall past the goat drew a kink of a right angle and more.
  runStep(game, x, y, ang, dt, near) {
    const cfg = this.cfg, g = game.goat, gd = Math.hypot(g.x - x, g.y - y), toG = Math.atan2(g.y - y, g.x - x);
    if (!g.dead && gd > g.r && Math.abs(angleDiff(ang, toG)) < Math.PI / 2) ang += clamp(angleDiff(ang, toG), -cfg.dashTurn * dt, cfg.dashTurn * dt);
    const want = this.clearAng(game, ang, Math.min(cfg.dashLook * TILE, Math.max(0, gd - g.r - this.r)), x, y, near);
    return ang + clamp(angleDiff(ang, want), -cfg.whiskTurn * dt, cfg.whiskTurn * dt);
  }
  // Where the run goes if the goat stands still: a few dozen steps of the same turn-limited homing
  // the run itself does, cut short by stone, a drop, or `overrun` past the goat. The red line.
  planDash(game, x, y, ang, time, t0) {
    const cfg = this.cfg, g = game.goat, w = game.world, pts = [{ x, y }], step = 1 / 30;
    const near = this.nearBlockers(game, x, y, cfg.dashSpeed * time + 2 * TILE);
    for (let t = 0; t < time; t += step) {
      if (Math.abs(angleDiff(ang, Math.atan2(g.y - y, g.x - x))) >= Math.PI / 2 && Math.hypot(g.x - x, g.y - y) > cfg.overrun * TILE) break;
      ang = this.runStep(game, x, y, ang, step, near);
      const sp = this.dashSpeedAt((t0 || 0) + t);
      const nx = x + Math.cos(ang) * sp * step, ny = y + Math.sin(ang) * sp * step;
      if (w.isSolid(Math.floor(nx / TILE), Math.floor(ny / TILE)) || w.isPitPx(nx, ny)) break;
      x = nx; y = ny; pts.push({ x, y });
    }
    return pts;
  }
  dashEnd(game) {
    const cfg = this.cfg;
    this.state = 'recover'; this.timer = cfg.recover * game.mods.enemySlow; this.dashPath = null;
    this.vx *= 0.3; this.vy *= 0.3;
    // The wait for the next run starts here as well as at the plant (which still covers a run a
    // blow or the scream broke off): after a run he breaks away, comes back onto the ring and
    // circles, and only then runs again.
    this.lungeCd = cfg.lungeCd * (0.7 + Math.random() * 0.6);
  }

  // The nearest other hound on the ring round the goat with him, within `packGap` tiles of him.
  // `game.enemies`, not `liveEnemies`: that list is built as the men update, so the first hound of
  // a pair to run never found the second and only one of them ever circled away.
  ringMate(game, cfg) {
    let best = null, bd = cfg.packGap * TILE;
    for (const o of game.enemies) {
      if (o === this || o.dead || o.kind !== 'dog' || !o.aware) continue;
      const d = len(o.x - this.x, o.y - this.y);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  // Is another hound near enough, and far enough into a run of its own, that this one should wait?
  packBusy(game, cfg) {
    for (const o of game.enemies) {
      if (o === this || o.dead || o.kind !== 'dog') continue;
      if (o.state !== 'dart' && o.state !== 'windup') continue;
      if (len(o.x - this.x, o.y - this.y) < cfg.packGap * TILE) return true;
    }
    return false;
  }

  // The headbutt that does not land. A share of them he is simply not there for — and that share is
  // the whole reason a hound reads as unpredictable. A dazed hound cannot move, so he eats all of it.
  // Out of the goat's mouth: straight back, away from him, one tile over `hopTime`. It rides the
  // dodge state, which already carries a body on whatever velocity it was given and hands him back
  // to the chase when it runs out.
  hopBack(game, goat) {
    const cfg = this.cfg, dx = this.x - goat.x, dy = this.y - goat.y, l = Math.hypot(dx, dy) || 1;
    const spd = cfg.hop * TILE / cfg.hopTime;
    this.vx = dx / l * spd; this.vy = dy / l * spd; this.facing = Math.atan2(-dy, -dx);
    this.state = 'dodge'; this.timer = cfg.hopTime; this.dodgeFx = 0.28; this.aware = true;
    game.floatText(this.x, this.y - 24, 'TOO QUICK', PALETTE.ashHi);
    game.particles(this.x, this.y, 5, PALETTE.ash, 140);
    game.audio.sfxSnap(); game.vibe(8);
  }
  tryDodge(game, ax, ay) {
    if (this.kind !== 'dog' || this.dazed > 0 || this.dodgeCd > 0 || this.burning > 0) return false;
    const cfg = this.cfg;
    if (this.state === 'floored' || this.state === 'flung' || this.state === 'stunned' || this.state === 'windup' || this.state === 'dart') return false;
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
    const cfg = this.cfg, g = game.goat, H = cfg.hide;
    this.fadeCd = Math.max(0, this.fadeCd - dt);
    this.driftPhase += dt;
    // Lying in the room as a box or a bowl. It does nothing until the goat does something within
    // reach of it — a headbutt, a reach for anything, a step onto it — and then it is on him from
    // whichever side he is standing on, blind side or not: the disguise is its way round your face.
    if (this.state === 'hidden') {
      this.vx = 0; this.vy = 0;
      if (g.dead) return;
      const d = Math.hypot(g.x - this.x, g.y - this.y);
      // The press is what gives it away, not the blow landing: counted where the windup starts.
      if (this.grabSeen === -1) { this.grabSeen = g.grabTries || 0; this.lungeSeen = g.buttTries || 0; }
      const acted = (g.buttTries || 0) !== this.lungeSeen || (g.grabTries || 0) !== this.grabSeen;
      this.lungeSeen = g.buttTries || 0; this.grabSeen = g.grabTries || 0;
      if (d < H.touchR * TILE + g.r || (acted && d < H.springR * TILE)) this.spring(game);
      return;
    }
    // Committed: manifest, swing, and the long beat afterwards where it can still be hit.
    if (this.solid) {
      this.timer -= dt; this.vx = 0; this.vy = 0;
      if (this.state === 'manifest') {
        if (this.timer <= 0) { this.state = 'windup'; this.timer = cfg.windup * game.mods.enemySlow; }
      } else if (this.state === 'windup') {
        this.facing = Math.atan2(g.y - this.y, g.x - this.x);
        // It has committed, not frozen: stepping back during the windup only buys a little, since
        // whatever is materializing keeps closing the last short stretch while it comes on.
        const wd = Math.hypot(g.x - this.x, g.y - this.y) || 1;
        this.x += (g.x - this.x) / wd * cfg.windupPull * dt;
        this.y += (g.y - this.y) / wd * cfg.windupPull * dt;
        if (this.timer <= 0) {
          this.state = 'swing'; this.timer = cfg.swing * game.mods.enemySlow;
          game.meleeHit(this, cfg.reach, Math.PI * 0.9, cfg.damage, cfg.knock);
          game.audio.sfxWraithHit(); game.world.emitNoise(this.x, this.y, TUNING.noise.swing, 'cult');
          game.shake(4);
        }
      } else if (this.state === 'swing') {
        if (this.timer <= 0) { this.state = 'solid'; this.timer = cfg.solidAfter * game.mods.enemySlow; }
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
    // Left behind after a blow, it may settle into the room as something else and wait again.
    if (this.hideWant && Math.hypot(g.x - this.x, g.y - this.y) > H.minDist * TILE && this.hide(game)) return;
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
  // Settle into the room as a box or a bowl of milk. Only on open floor: a disguise inside a wall is
  // no disguise. Returns whether it took. Without `game` (the constructor) it takes where it stands.
  hide(game) {
    const tx = Math.floor(this.x / TILE), ty = Math.floor(this.y / TILE);
    if (game && (game.world.isSolid(tx, ty) || game.world.isPitPx(this.x, this.y))) return false;
    this.x = (tx + 0.5) * TILE; this.y = (ty + 0.5) * TILE;
    this.state = 'hidden'; this.solid = false; this.hideWant = false; this.vx = 0; this.vy = 0;
    const milk = Math.random() < this.cfg.hide.milk;
    this.disguise = new Prop(this.x, this.y, milk ? 'heal' : 'crate');
    if (game) { game.particles(this.x, this.y, 6, PALETTE.witch, 70); this.lungeSeen = game.goat.buttTries || 0; this.grabSeen = game.goat.grabTries || 0; }
    return true;
  }
  // Found out. It comes up out of what it was pretending to be and the blow is already coming.
  spring(game) {
    const H = this.cfg.hide, g = game.goat;
    this.disguise = null; this.aware = true; this.woke = true;
    this.solid = true; this.state = 'windup'; this.timer = H.springWind * game.mods.enemySlow;
    this.facing = Math.atan2(g.y - this.y, g.x - this.x);
    game.particles(this.x, this.y, 16, PALETTE.witchHi, 170);
    game.ring(this.x, this.y, 1.8 * TILE, PALETTE.witch);
    game.floatText(this.x, this.y - 30, 'IT WAS NEVER THAT', PALETTE.witchHi);
    if (this.firstHide) game.hideTaught = true;
    game.audio.sfxWraith(); game.shake(4); game.vibe(20);
  }
  unmanifest(game, cd) {
    this.solid = false; this.state = 'chase'; this.dazed = 0; this.burning = 0;
    this.hideWant = Math.random() < this.cfg.hide.again;
    this.fadeCd = cd === undefined ? this.cfg.fadeCd : cd;
    game.particles(this.x, this.y, 8, PALETTE.witch, 90);
  }

  updateSeer(dt, game, sees) {
    const g = game.goat, cfg = this.cfg, w = game.world;
    this.castCd = Math.max(0, this.castCd - dt);
    this.blinkCd = Math.max(0, this.blinkCd - dt);
    this.blinkFx = Math.max(0, this.blinkFx - dt);
    // THE DARK: a noise he could not see the maker of is somewhere to paint a rune (`hearForRune`).
    if (this.earRune && !sees && this.castCd <= 0 && this.poison <= 0 && !g.dead
        && game.timer - this.earRune.at < TUNING.dark.ai.earFresh && (this.state === 'idle' || this.state === 'investigate' || this.state === 'chase')) {
      this.state = 'cast'; this.timer = cfg.castWind * game.mods.enemySlow; this.vx = 0; this.vy = 0;
      this.rune = { x: this.earRune.x, y: this.earRune.y }; this.byEar = true; this.earRune = null;
      game.audio.sfxCast(); w.emitNoise(this.x, this.y, TUNING.noise.cast, 'cult');
      return;
    }
    if (this.state === 'idle') { this.idleWander(dt, game); return; }
    if (this.state === 'investigate') { this.investigate(dt, game); return; }
    const dx = g.x - this.x, dy = g.y - this.y, d = Math.hypot(dx, dy);

    if (this.state === 'cast') {
      if (this.poison > 0) { this.state = 'chase'; this.rune = null; return; }
      // By ear he faces the spot he is painting, not a goat he cannot see.
      const at = this.byEar && this.rune ? this.rune : g;
      this.vx = 0; this.vy = 0; this.facing = Math.atan2(at.y - this.y, at.x - this.x); this.timer -= dt;
      // A rune cast by ear from idle leaves him no wiser about the goat: he goes to see what he
      // burned. `chase` would have walked the flow field straight to wherever the goat really is.
      if (this.timer <= 0) {
        const spot = this.rune; this.castRune(game);
        if (this.aware || !spot) this.state = 'chase';
        else { this.state = 'investigate'; this.target = { x: spot.x, y: spot.y }; }
      }
      return;
    }

    // Too close: blink out rather than trade blows.
    if (d < cfg.blinkRange * TILE && this.blinkCd <= 0 && !g.dead) { this.blink(game); return; }
    if (sees && this.castCd <= 0 && !g.dead && this.poison <= 0) {
      this.state = 'cast'; this.timer = cfg.castWind * game.mods.enemySlow; this.vx = 0; this.vy = 0;
      this.rune = { x: g.x, y: g.y }; this.byEar = false;
      game.audio.sfxCast(); w.emitNoise(this.x, this.y, TUNING.noise.cast, 'cult');
      return;
    }
    if (d < cfg.keepMin * TILE && sees) {
      // Round what is behind him, the rifle's way (see `updateHunter`): cornered, he holds still.
      const away = this.clearAng(game, Math.atan2(-dy, -dx), TILE, this.x, this.y, undefined, null);
      if (away !== null && Math.abs(angleDiff(away, Math.atan2(dy, dx))) > Math.PI / 2) this.moveToward(Math.cos(away), Math.sin(away), this.speed, dt, game);
      else { this.vx = 0; this.vy = 0; }
      this.facing = Math.atan2(dy, dx); return;
    }
    if (d > cfg.keepMax * TILE || !sees) { this.chaseGoat(game, this.speed, dt); return; }
    this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx);
  }

  // THE DARK: the seer paints his rune where he heard something rather than where he saw it. Not his
  // own noise, not one past `dark.ai.earCast` tiles, and not one a man of his is standing in — the
  // cult's own feet and clubs make noise too, and he knows what his side sounds like. Whatever else
  // is there when it goes off, burns.
  hearForRune(game, n) {
    const A = TUNING.dark.ai, d = Math.hypot(n.x - this.x, n.y - this.y), own = A.earOwn * TILE;
    if (d < own || d > A.earCast * TILE) return;
    for (const o of game.enemies) if (o !== this && !o.dead && Math.hypot(o.x - n.x, o.y - n.y) < own) return;
    this.earRune = { x: n.x, y: n.y, at: game.timer };
  }

  // The rune he has been painting goes off where he painted it. Held or standing, same fire.
  castRune(game) {
    const cfg = this.cfg, w = game.world;
    Talisman.redirectRune(game, this);   // MIRROR SHARD III: it goes off under him instead
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
    // A sealed arena's doors open when the room is empty and not before, so a mage shut in one may
    // not leave it: blinking out through the wall left him alive on the far side of a door nothing
    // could open, with the goat locked in behind it and the level unfinishable.
    const seal = game.sealHolding(this);
    // And short of a seal, he still may not land somewhere the fight has already left behind: a
    // blink close to a doorway could put him a room back the way the goat came, alive in ground
    // that reads as cleared. `curRoom` is whatever room the goat is standing in right now — a
    // corridor answers with nothing, and nothing here restricts a blink from one.
    const curRoom = roomAt(game.level, g.x, g.y);
    let best = null;
    for (let k = 0; k < 24; k++) {
      const a = Math.random() * Math.PI * 2, r = cfg.blinkDist * TILE * (0.7 + Math.random() * 0.6);
      const nx = g.x + Math.cos(a) * r, ny = g.y + Math.sin(a) * r;
      if (w.tileAtPx(nx, ny) === T.WALL) continue;
      if (w.flowDist(nx, ny) < 0) continue;
      if (seal && !game.inRoom({ x: nx, y: ny }, seal.room, 1)) continue;
      if (curRoom && (nx < curRoom.x * TILE || nx >= (curRoom.x + curRoom.w) * TILE
          || ny < curRoom.y * TILE || ny >= (curRoom.y + curRoom.h) * TILE)) continue;
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

  // The Butcher (1.66). He walks at you slowly, and he does not swing: out of reach and in sight he
  // leaps, close in he brings both fists down on the floor. Each is a ring you can read on the
  // floor before it lands (`Renderer.drawHopMark`, `drawSlamRing`), and each ends with him on his
  // knees for long enough to be hit — which is where every heart he has comes from.
  updateButcher(dt, game, sees) {
    const g = game.goat, cfg = this.cfg, L = cfg.leap, S = cfg.slam;
    this.slamCd = Math.max(0, this.slamCd - dt);
    if (this.state === 'idle') { this.idleWander(dt, game); return; }
    if (this.state === 'investigate') { this.investigate(dt, game); return; }
    const d = Math.hypot(g.x - this.x, g.y - this.y);
    if (this.state === 'chase') {
      if (!g.dead && d < S.near * TILE + g.r && game.reaches(this.x, this.y, g.x, g.y)) {
        this.state = 'slamwind'; this.timer = S.wind * game.mods.enemySlow; this.vx = 0; this.vy = 0;
        game.floatText(this.x, this.y - 50, 'HNNGH', PALETTE.blood); game.audio.sfxThud(); return;
      }
      // The leap wants the goat in sight and a floor to come down on; the spot is where the goat
      // stands now, so moving off it during the crouch and the flight is the whole of the answer.
      if (!g.dead && sees && this.slamCd <= 0 && d >= L.min * TILE && d <= L.max * TILE) {
        const to = this.hopSpot(game, g, d);
        if (len(to.x - this.x, to.y - this.y) >= L.minHop * TILE) {
          this.hopFrom = { x: this.x, y: this.y }; this.hopTo = to;
          this.facing = Math.atan2(to.y - this.y, to.x - this.x);
          this.state = 'hopwind'; this.timer = L.wind * game.mods.enemySlow; this.vx = 0; this.vy = 0;
          game.bark(this, 'attack', 0.5); return;
        }
        this.slamCd = 0.4;   // no spot from here: look again in a moment, not every frame
      }
      this.chaseGoat(game, this.speed, dt);
      return;
    }
    if (this.state === 'hopwind') {
      this.vx = 0; this.vy = 0; this.timer -= dt;
      if (this.timer <= 0) { this.state = 'hop'; this.timer = L.air; game.audio.sfxGrowl(); }
      return;
    }
    if (this.state === 'hop') {
      this.timer -= dt;
      const k = clamp(1 - this.timer / L.air, 0, 1);
      // Placed rather than pushed, as the rat ogre is: the arc is his, the step adds nothing.
      this.vx = 0; this.vy = 0; this.x = lerp(this.hopFrom.x, this.hopTo.x, k); this.y = lerp(this.hopFrom.y, this.hopTo.y, k);
      this.hopZ = Math.sin(k * Math.PI) * L.lift;
      if (this.timer <= 0) {
        this.hopZ = 0; this.state = 'hopland'; this.timer = L.land * game.mods.enemySlow; this.slamCd = L.cd;
        this.quake(game, L, L.radius * TILE);
      }
      return;
    }
    if (this.state === 'slamwind') {
      this.vx = 0; this.vy = 0; this.facing = Math.atan2(g.y - this.y, g.x - this.x); this.timer -= dt;
      if (this.timer <= 0) { this.state = 'recover'; this.timer = S.recover * game.mods.enemySlow; this.quake(game, S, S.range * TILE); }
      return;
    }
    if (this.state === 'hopland' || this.state === 'recover') { this.vx = 0; this.vy = 0; this.timer -= dt; if (this.timer <= 0) this.state = 'chase'; return; }
    this.state = 'chase';
  }

  // The butcher's charge (the ogre's until 1.66, when he was the Butcher), run from `updateBearer`. Handles the frame and
  // returns true while he is planting or running, or walking to a spot he means to run from; false
  // hands the frame back to the ordinary chase.
  chargeStep(dt, game, sees) {
    const g = game.goat, C = TUNING.champion.charge;
    const dx = g.x - this.x, dy = g.y - this.y, d = Math.hypot(dx, dy);
    if (this.state === 'charge') {
      this.timer -= dt;
      for (const e of game.enemies) {
        if (e === this || e.dead || e.held || e.state === 'flung') continue;
        if (Math.hypot(e.x - this.x, e.y - this.y) < e.r + this.r) e.fling(this.vx * 1.4, this.vy * 1.4, false);
      }
      // `hit` px past touching: running past him close is running into the cleaver (1.72).
      if (!g.dead && d < this.r + g.r + C.hit) {
        if (Talisman.parry(game, this, 'charge')) return true;
        // Run into the shield: he stops on it and eats the parry, and the goat takes nothing.
        if (g.blockBlow(game, this)) { this.chargeCd = C.cooldown * game.mods.enemySlow; return true; }
        g.damage(C.damage, game, this.vx * 0.6, this.vy * 0.6, false, this);
        this.state = 'recover'; this.timer = this.atk('recover') * game.mods.enemySlow; this.vx = 0; this.vy = 0; this.chargeCd = C.cooldown * game.mods.enemySlow; return true;
      }
      if (this.timer <= 0) { this.state = 'chase'; this.chargeCd = C.cooldown * game.mods.enemySlow; this.vx = 0; this.vy = 0; return true; }
      // The skid: the last of the run bleeds off, so what ends the charge is his own feet and not the
      // wall — a body slowing past `3 * TILE` of impact is not stopped by stone, only held by it.
      const k = clamp(this.timer / C.skid, 0.2, 1);
      this.vx = Math.cos(this.facing) * C.speed * k; this.vy = Math.sin(this.facing) * C.speed * k;
      return true;
    }
    if (this.state === 'chargewind') {
      // He plants his feet, faces where you are going to be and roars; the strip on the floor swings
      // with it. Running on across his line is running into it: break off after he has left his feet.
      this.vx = 0; this.vy = 0; this.timer -= dt;
      const aim = this.chargeAim = this.leadAim(game);
      this.facing = Math.atan2(aim.y - this.y, aim.x - this.x);
      if (this.timer <= 0) {
        const ad = len(aim.x - this.x, aim.y - this.y);
        this.state = 'charge'; this.timer = Math.min(C.time, (ad + C.over * TILE) / C.speed);
        this.vx = Math.cos(this.facing) * C.speed; this.vy = Math.sin(this.facing) * C.speed;
        game.audio.sfxSwing();
      }
      return true;
    }
    if (this.state !== 'chase') return false;
    // A charge that starts at a pillar he was never going to clear read as him crashing into the
    // furniture rather than choosing a line. `runClear` is the clearance a body that wide needs,
    // checked only as far as the goat's own spot; `game.props` only, never `enemies` — a room full
    // of his own kind is a reason to charge, not a reason not to.
    this.laneT = Math.max(0, this.laneT - dt);
    if (sees && d >= C.min * TILE && this.chargeCd <= 0 && !g.dead) {
      if (game.runClear(this.x, this.y, g.x, g.y, this.r)) {
        this.state = 'chargewind'; this.timer = C.wind * game.mods.enemySlow; this.facing = Math.atan2(dy, dx);
        this.lane = null; this.vx = 0; this.vy = 0;
        game.floatText(this.x, this.y - 40, 'RAAAGH', PALETTE.blood); game.audio.sfxThud(); return true;
      }
      // A pillar or a table between him and you is a reason to step round it, not to trudge up to it.
      if (!this.lane && this.laneT <= 0) { this.laneT = C.laneLook; this.lane = this.findLane(game); }
    }
    if (!this.lane) return false;
    const P = this.lane, lx = P.x - this.x, ly = P.y - this.y, ld = len(lx, ly);
    P.t -= dt;
    // A walk that is not closing on the spot is a spot he cannot get to: drop it, and do not look
    // for another straight away, or he picks the same one and walks into the same corner.
    if (ld < P.best - 4) { P.best = ld; P.still = 0; } else P.still += dt;
    if (P.still > C.laneStill) { this.lane = null; this.laneT = C.laneLook * 3; return false; }
    if (ld < C.laneAt * TILE || P.t <= 0 || !sees || d < C.min * TILE || this.chargeCd > 0) { this.lane = null; return false; }
    this.moveToward(lx, ly, this.speed, dt, game);
    return true;
  }

  // Where the charge is aimed: where the goat will be when he arrives, `lead` of the way there and
  // never more than `leadMax` tiles ahead of him — and only a lead he could actually run.
  leadAim(game) {
    const g = game.goat, C = TUNING.champion.charge, d = len(g.x - this.x, g.y - this.y);
    const t = Math.min(C.time, d / C.speed) * C.lead;
    let lx = g.vx * t, ly = g.vy * t;
    const l = Math.hypot(lx, ly), cap = C.leadMax * TILE;
    if (l > cap) { lx *= cap / l; ly *= cap / l; }
    const x = g.x + lx, y = g.y + ly;
    if (l > 1 && game.world.walkableAt(Math.floor(x / TILE), Math.floor(y / TILE)) && game.runClear(this.x, this.y, x, y, this.r * 0.6)) return { x, y };
    return { x: g.x, y: g.y };
  }
  // A spot to charge from: one, two or three tiles either side of the line to the goat (and a tile
  // back), reachable on foot, with a clear run from it to him. The nearest such spot, or null.
  findLane(game) {
    const g = game.goat, C = TUNING.champion.charge, w = game.world;
    const dx = g.x - this.x, dy = g.y - this.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const props = this.nearBlockers(game, this.x, this.y, d + 3 * TILE);
    let best = null, bd = Infinity;
    for (const back of [0, -1]) for (const side of [1, -1, 2, -2, 3, -3]) {
      const x = this.x + (-uy * side + ux * back) * TILE, y = this.y + (ux * side + uy * back) * TILE;
      if (!w.walkableAt(Math.floor(x / TILE), Math.floor(y / TILE))) continue;
      if (len(g.x - x, g.y - y) < C.min * TILE) continue;
      const walk = Math.abs(side) + Math.abs(back);
      if (walk >= bd) continue;
      if (!this.bodyClear(game, x, y, this.r * 0.9, props, true)) continue;
      if (!game.runClear(x, y, g.x, g.y, this.r)) continue;
      best = { x, y, t: C.laneTime, best: Infinity, still: 0 }; bd = walk;
    }
    return best;
  }

  // The one thing a scream, a boomerang or a tumble does to the rat ogre: the swing he was winding
  // up is gone and he stands there a beat. Returns whether there was a swing to break.
  breakSwing(game) {
    if (this.state !== 'windup' && this.state !== 'hopwind') { game.particles(this.x, this.y - 6, 3, PALETTE.ash, 60); return false; }
    this.state = 'stagger'; this.timer = this.cfg.stagger; this.vx = 0; this.vy = 0;
    game.particles(this.x, this.y - 6, 6, PALETTE.bone, 110);
    return true;
  }

  // The rat ogre. He comes out of the hole (`emerge`), and from then on he goes for whatever is
  // nearest him that he can see — the goat, or any man of the cult — and swings at it. He is never
  // idle and never investigates: he was made by being struck three times and he knows who did it,
  // so with nothing in sight he walks the flow field to the goat like a man in full pursuit. The
  // cult does not go for him; they go for you, which is the whole trick of him — walk him into a
  // room that is already full and let the room spend itself on him.
  // Where the next leap comes down: `hop.dist` tiles toward his prey if he can see it (short of it
  // if it is closer than that), down the flow field to the goat if not, walked back until the spot
  // and the line to it are floor — never into stone, never over a drop.
  hopSpot(game, target, td) {
    // The rat ogre's `hop` or the Butcher's `leap`: he comes down `short` tiles short of his prey
    // (on it, at 0), and with `over` a drop under the line is flown over — only the spot must be floor.
    const w = game.world, H = this.cfg.hop || this.cfg.leap, short = H.short != null ? H.short * TILE : this.cfg.reach * 0.6;
    let ax, ay, want = H.dist * TILE;
    if (target && td < Infinity) {
      ax = target.x - this.x; ay = target.y - this.y;
      want = Math.min(want, Math.max(TILE, td - short));
    } else {
      const f = w.flowDir(this.x, this.y);
      if (f) { ax = f.x; ay = f.y; } else { ax = game.goat.x - this.x; ay = game.goat.y - this.y; }
    }
    const l = Math.hypot(ax, ay) || 1; ax /= l; ay /= l;
    // A shade inside what of him the stone pushes on (`wallR`): wall collision parks him exactly that
    // far off it, and probing at the full width read the wall he was leaning on — or the two sides of
    // a doorway one tile wide, which he squeezes through (`ai.path.squeeze`) — as in the way of every leap.
    const pr = this.wallR * 0.85;
    const ok = (x, y, pits) => {
      for (const [ox, oy] of [[0, 0], [pr, 0], [-pr, 0], [0, pr], [0, -pr]]) {
        if (w.isSolid(Math.floor((x + ox) / TILE), Math.floor((y + oy) / TILE)) || (pits && w.isPitPx(x + ox, y + oy))) return false;
      }
      return true;
    };
    const reach = (dx, dy, most) => {
      let b = 0;
      for (let s = 8; s <= most; s += 8) {
        const x = this.x + dx * s, y = this.y + dy * s;
        if (!ok(x, y, !H.over)) break;
        if (!H.over || ok(x, y, true)) b = s;
      }
      return b;
    };
    let best = reach(ax, ay, want), bx = ax, by = ay;
    // Pinned — a corner, or a wall across the line to his prey: he used to crouch and leap on the
    // spot for ever. Fan out round the line (and down the flow field, which knows the way round) and
    // take the leap that gains the most ground toward it, so a corner costs him one sideways bound.
    // Only the rat ogre: the Butcher leaps at you or not at all, and walks when he cannot.
    if (this.kind === 'ratogre' && best < Math.min(want, H.minHop * TILE) - 8) {
      // After the goat, the flow field first, tile centre to tile centre: it is the way through a
      // doorway one tile wide (every gate's), which no probe of his width threads from off its middle,
      // and a fan of bounds round the line only sent him up and down in front of it.
      const along = (!target || target === game.goat) && this.flowHop(game, H.dist, ok);
      if (along) return along;
      const base = Math.atan2(ay, ax), f = w.flowDir(this.x, this.y), cands = [];
      if (f) cands.push(Math.atan2(f.y, f.x) - base);
      for (const o of [0.5, 1, 1.5, 2.1, 2.7]) cands.push(o, -o);
      cands.push(Math.PI);
      let score = best;
      for (const off of cands) {
        const cx = Math.cos(base + off), cy = Math.sin(base + off), b = reach(cx, cy, H.dist * TILE);
        const sc = b * Math.max(0.25, Math.cos(off));
        if (b >= H.minHop * TILE && sc > score) { score = sc; best = b; bx = cx; by = cy; }
      }
    }
    return { x: this.x + bx * best, y: this.y + by * best };
  }
  // A bound down the flow field (`hopSpot`): the furthest tile centre, `most` tiles on at the most,
  // that a straight bound from here clears (`ok` is the spot test of his width); the next tile on
  // its own if none does, since the field only steps onto floor. Null where the field has no way.
  flowHop(game, most, ok) {
    const w = game.world, pts = [];
    let tx = Math.floor(this.x / TILE), ty = Math.floor(this.y / TILE);
    for (let k = 0; k < most; k++) {
      const i = w.flowStep(tx, ty, w.flow); if (i < 0) break;
      tx = i % w.W; ty = (i / w.W) | 0; pts.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
      if (w.flow[i] === 0) break;
    }
    for (let k = pts.length - 1; k > 0; k--) {
      const p = pts[k], L = len(p.x - this.x, p.y - this.y);
      let clear = true;
      for (let s = 8; s < L && clear; s += 8) clear = ok(this.x + (p.x - this.x) * s / L, this.y + (p.y - this.y) * s / L, true);
      if (clear && ok(p.x, p.y, true)) return p;
    }
    return pts[0] || null;
  }
  // THE TEETH (25 Sep 2026). The ogre is too big to die on a cave spire the way a man does, so he
  // is caught on it: a heart for the rock, then `impale.time` s stuck where he stands — no leap, no
  // slam, no step — for whatever the room holds (a blade, fire, a thrown body). Before this he was
  // stuck by accident: every man steers off a spire, so standing on one he could not walk off it,
  // and it took a heart a second until he died. Now it is a window with an end.
  impale(game, p) {
    const I = TUNING.cave.spikes.impale;
    this.vx = 0; this.vy = 0; this.hopZ = 0;
    game.world.splat(this.x, this.y, 0, 0, 14);
    game.particles(this.x, this.y, 14, PALETTE.blood, 170);
    game.hitstop(0.05); game.audio.sfxThud(); game.audio.sfxGrowl();
    if (this.hp <= 1) { this.die(game, 'spire'); return; }
    this.hp -= 1; this.flash = 0.3; this.aware = true;
    this.impaled = I.time * game.mods.enemySlow; this.impaleOn = p;
    game.floatText(this.x, this.y - 44, 'STUCK · ' + this.hp + ' LEFT', PALETTE.fireHi);
  }
  impaledStep(dt, game) {
    const I = TUNING.cave.spikes.impale, p = this.impaleOn;
    this.impaled -= dt; this.vx = 0; this.vy = 0;
    if (Math.random() < dt * 4) game.particles(this.x, this.y + this.r * 0.3, 1, PALETTE.blood, 50);
    if (this.impaled > 0) return;
    // He tears himself off: a step clear of the teeth, spared them while he walks away.
    this.impaled = 0; this.impaleOn = null;
    if (p) {
      let dx = this.x - p.x, dy = this.y - p.y, d = Math.hypot(dx, dy);
      if (d < 1) { dx = game.goat.x - p.x; dy = game.goat.y - p.y; d = Math.hypot(dx, dy) || 1; }
      const out = p.r + this.r * 0.7 + 2;
      if (d < out) { this.x = p.x + dx / d * out; this.y = p.y + dy / d * out; game.world.collideCircle(this); }
    }
    this.spireAt = game.timer + I.clear;
    this.state = 'stagger'; this.timer = I.free * game.mods.enemySlow; this.aware = true;
    game.floatText(this.x, this.y - 44, 'RRAAGH', PALETTE.blood); game.audio.sfxGrowl();
    game.dust(this.x, this.y, 8, 0, 0);
  }

  // He comes down. Everything in the ring is struck the way his arm strikes: the goat hurt and
  // thrown clear, a man of the cult hurt and flung.
  hopLand(game) {
    const H = this.cfg.hop, g = game.goat, R = H.radius * TILE;
    this.hopZ = 0; this.state = 'hopland'; this.timer = H.land * game.mods.enemySlow; this.vx = 0; this.vy = 0;
    game.shake(8); game.hitstop(0.03); game.audio.sfxThud(); game.vibe(24);
    game.ring(this.x, this.y, R, PALETTE.blood, 0.4, 4); game.dust(this.x, this.y, 12, 0, 0);
    game.world.emitNoise(this.x, this.y, TUNING.noise.swing, 'cult');
    if (game.hidden(this.x, this.y)) return;
    if (!g.dead) {
      const dx = g.x - this.x, dy = g.y - this.y, d = Math.hypot(dx, dy);
      if (d < R + g.r && !g.blockBlow(game, this, false)) g.damage(H.damage, game, dx / (d || 1) * H.knock * 4, dy / (d || 1) * H.knock * 4, false, this);
    }
    for (const e of game.enemies) {
      if (e === this || e.dead || e.held || e.ghosted || e.state === 'flung' || e.kind === 'ratogre') continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
      if (d < R + e.r) game.ogreHits(e, dx / (d || 1), dy / (d || 1), this);
    }
  }
  updateOgre(dt, game, sees) {
    const g = game.goat, cfg = this.cfg, w = game.world;
    if (this.state === 'emerge') { this.vx = 0; this.vy = 0; this.timer -= dt; if (this.timer <= 0) { this.state = 'chase'; this.aware = true; } return; }
    if (this.state === 'idle' || this.state === 'investigate' || this.state === 'noticed') { this.state = 'chase'; this.aware = true; }
    let target = null, td = Infinity;
    if (!g.dead) { target = g; td = Math.hypot(g.x - this.x, g.y - this.y); if (!sees && !w.los(this.x, this.y, g.x, g.y)) td = Infinity; }
    for (const e of game.enemies) {
      if (e === this || e.dead || e.held || e.ghosted || e.scripted || e.kind === 'ratogre') continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d >= td || d > cfg.sight * TILE) continue;
      if (!w.los(this.x, this.y, e.x, e.y)) continue;
      target = e; td = d;
    }
    if (td === Infinity) target = null;
    this.prey = target;
    // He does not walk. Out of reach he crouches, bounds `hop.dist` tiles and comes down on
    // everything under him; in reach he swings. The crouch is his windup and the ring on the floor
    // is where he will land, so a leap is read and stepped out of like any other blow.
    const H = cfg.hop;
    if (this.state === 'chase') {
      this.vx = 0; this.vy = 0;
      if (target && td < cfg.reach + target.r) { this.state = 'windup'; this.timer = cfg.windup * game.mods.enemySlow; return; }
      this.hopFrom = { x: this.x, y: this.y }; this.hopTo = this.hopSpot(game, target, td);
      this.facing = Math.atan2(this.hopTo.y - this.y, this.hopTo.x - this.x);
      this.state = 'hopwind'; this.timer = H.wind * game.mods.enemySlow;
      return;
    }
    if (this.state === 'hopwind') {
      this.vx = 0; this.vy = 0; this.timer -= dt;
      if (this.timer <= 0) { this.state = 'hop'; this.timer = H.air; game.audio.sfxGrowl(); }
      return;
    }
    if (this.state === 'hop') {
      this.timer -= dt;
      const k = clamp(1 - this.timer / H.air, 0, 1);
      const nx = lerp(this.hopFrom.x, this.hopTo.x, k), ny = lerp(this.hopFrom.y, this.hopTo.y, k);
      // Placed rather than pushed: the arc is his, and the step integration after this adds nothing.
      this.vx = 0; this.vy = 0; this.x = nx; this.y = ny; this.hopZ = Math.sin(k * Math.PI) * H.lift;
      if (this.timer <= 0) this.hopLand(game);
      return;
    }
    if (this.state === 'hopland') { this.vx = 0; this.vy = 0; this.timer -= dt; if (this.timer <= 0) this.state = 'chase'; return; }
    if (this.state === 'windup') {
      this.vx = 0; this.vy = 0; this.timer -= dt;
      if (target) this.facing = Math.atan2(target.y - this.y, target.x - this.x);
      if (this.timer <= 0) { this.state = 'swing'; this.timer = cfg.swing * game.mods.enemySlow; this.swingHit = false; game.audio.sfxSwing(); w.emitNoise(this.x, this.y, TUNING.noise.swing, 'cult'); }
      return;
    }
    if (this.state === 'swing') {
      this.timer -= dt;
      if (!this.swingHit) { this.swingHit = true; game.meleeHit(this, cfg.reach + 8, cfg.arc, cfg.damage, cfg.knock); }
      if (this.timer <= 0) { this.state = 'recover'; this.timer = cfg.recover * game.mods.enemySlow; }
      return;
    }
    if (this.state === 'recover') { this.vx = 0; this.vy = 0; this.timer -= dt; if (this.timer <= 0) this.state = 'chase'; }
  }
}
