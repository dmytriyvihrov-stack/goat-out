// Enemies: Bearer (melee), Hunter (rifle), Dog (hound), Seer (mage), Butcher (heavy).
// One class, behaviour switches on kind.
class Enemy {
  constructor(x, y, kind) {
    const cfg = TUNING[kind];
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.kind = kind; this.cfg = cfg;
    // Where he was put. Idle, he does not wander past a leash of this, a patrol keeps to its own
    // room until it has a reason not to, rather than drifting out through whatever doorway is handy.
    this.home = { x, y };
    this.r = cfg.radius; this.hp = cfg.hp || 1; this.speed = cfg.speed;
    this.wallR = Math.min(this.r, TUNING.ai.path.squeeze);   // what of him the stone pushes on (`World.collideTiles`)
    this.state = 'idle'; this.timer = 0; this.facing = Math.random() * Math.PI * 2;
    this.aware = false; this.target = null; this.lastSeen = null;
    this.flung = false; this.thrown = false; this.held = false; this.dead = false;
    this.burning = 0; this.burnDir = 0; this.burnTick = 0; this.hookCd = 0; this.reload = 0; this.flash = 0;
    this.litByMan = false; this.passedFire = false;   // who may hand fire on, and who has already
    this.lastLunge = -1; this.shieldHits = 0; this.wander = Math.random() * 3; this.lostTimer = 0;
    this.bombFuse = 0; this.exploded = false;
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
    this.champion = false;                                      // the butcher (the brute until 1.72): a hook on a rope, too heavy to carry
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
    // behind you, they arrive from three sides at once and you cannot face all of them.
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
    this.flipCd = 0;
    this.hook = null; this.hookAim = null;   // the butcher's hook out of his hand, and where the windup is aiming it
  }

  // What a kind will not answer to, with the butcher reading his own list rather than the clubman's.
  get immunity() { return this.champion ? TUNING.champion.immune : this.cfg.immune; }
  get blunderProof() { const im = this.immunity; return !!(im && im.blunder); }
  // An attack number: the butcher has his own arm, everybody else reads their own kind.
  atk(key) {
    if (this.thrower && TUNING.thrower.fist[key] !== undefined) return TUNING.thrower.fist[key];   // the big arm's fist (js/thrower.js)
    if (this.shieldman && TUNING.shieldman.strike[key] !== undefined) return TUNING.shieldman.strike[key];   // the board rammed in (`shieldman.strike`)
    const v = this.champion && TUNING.champion[key] !== undefined ? TUNING.champion[key] : this.cfg[key];
    // THE SPIRIT in him (js/shaman.js): his blow costs `spirit.hurt` hearts more.
    return key === 'damage' && this.spirit ? v + TUNING.shaman.spirit.hurt : v;
  }
  // How far a headbutt throws him: light kinds further, the butcher and a man with a soul in him less.
  knockMul() {
    return (this.cfg.flingMul || 1) * (this.champion ? TUNING.champion.flingMul : 1) * (this.thrower ? TUNING.thrower.flingMul : 1) * (this.soul ? TUNING.soulBearer.flingMul : 1);
  }
  // How fast a wall has to be met to kill him. A heavy man is thrown `knockMul` as far, and the
  // wall asks the same share less of him, or a butcher carrying a soul (0.55 × 0.6 of a throw) left a
  // headbutt at nine tiles a second against a wall that wanted eleven, and could not be hurt at all.
  // Light men keep the full number: a hound flies further, not easier.
  splatLimit(game) {
    return TUNING.physics.splatSpeed * Talisman.splatMul(game) * Math.min(1, this.knockMul()) * this.weakMul();
  }
  // Poisoned or dazed, a man breaks on stone from a softer blow (1 Oct 2026, playtest: "if he is
  // poisoned or stunned, a lower speed should hurt him"): `status.weak` on every kill speed against a wall.
  weakMul() { return this.poison > 0 || this.dazed > 0 || this.state === 'stunned' ? TUNING.status.weak : 1; }
  // Too heavy or too much more than a man to be carried: the ogre, the butcher, a soul-bearer.
  get unliftable() { return this.kind === 'butcher' || this.champion || this.thrower || !!this.soul; }
  // The thrower on an errand or with something over his head (js/thrower.js): he walks it with care, round
  // every grate, flat or not, and never on a failed trap roll (`hazardAt`, `avoidHazard`; 5 Oct 2026).
  get laden() { return !!this.thrower && (!!this.carry || this.state === 'twgo'); }

  // Mist. There is no body here to hit, hold, burn, push or knock over, and a wall is not a wall
  // to it either. Everything in the game that reaches for an enemy asks this first.
  get ghosted() { return this.kind === 'wraith' && !this.solid; }

  fling(vx, vy, thrown) {
    if (this.dead || this.ghosted) return;
    // The rat ogre is not thrown by anything, not the horns, not the wheel, not a barrel, not a
    // blast. No wall ever kills him, which is the whole of what makes him dear.
    // Nor is the ogre (the Butcher, 1.66): too heavy to go anywhere, which is what sets him apart
    // from the butcher, who does. Every heart he has is taken standing, while he is on his knees.
    if (this.kind === 'ratogre' || this.kind === 'butcher') { this.aware = true; return; }
    this.vx = vx; this.vy = vy; this.state = 'flung'; this.flung = true; this.thrown = thrown; this.held = false; this.aware = true; this.flungBy = null; this.tossBy = null; this.chain = 0; this.liftedBy = null;
    this.fromMouth = false;   // `Goat.throwHeld` sets it after this; anything else that throws him clears it
    this.floorMul = 0;        // the STEALTH test's longer fall (`stealth.floor`): `headbuttHits` sets it after this
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
    // A hook out of his hand is let go of, with the wait for the next one: the goat on the end of it
    // is free the moment the pull stops (`Goat.update`'s stunned branch asks).
    if (this.hook) this.dropHook(game);
    if (this.state === 'hookwind') this.hookCd = TUNING.champion.hook.cooldown * game.mods.enemySlow;
    // Whatever he was winding up, aiming or painting is gone.
    if (this.state === 'windup' || this.state === 'aim' || this.state === 'cast' || this.state === 'hookwind'
        || this.state === 'dodge' || this.state === 'retreat' || this.state === 'dart' || this.state === 'slamwind'
        || this.state === 'hopwind' || this.state === 'bashwind' || this.state === 'twlift' || this.state === 'twaim' || this.state === 'twgrab'
        // the thrower dazed lets go (the next step's `Thrower.drop`): a goat held over his head stayed
        // up there through the whole daze, no verb of his own, and was thrown at the end of it anyway
        || this.state === 'twhold' || this.state === 'twcarry'
        // the shaman's rattle and his call (js/shaman.js)
        || this.state === 'shspirit' || this.state === 'shcall') {
      if (this.state === 'bashwind') this.bashCd = TUNING.shieldman.bash.cd * game.mods.enemySlow;
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
    if (this.state !== 'windup' && this.state !== 'aim' && this.state !== 'cast' && this.state !== 'hookwind'
        && this.state !== 'dart' && this.state !== 'slamwind' && this.state !== 'hopwind' && this.state !== 'bashwind'
        && this.state !== 'twlift' && this.state !== 'twaim' && this.state !== 'twgrab' && this.state !== 'shspirit' && this.state !== 'shcall') return false;
    if (this.state === 'hookwind') this.hookCd = TUNING.champion.hook.cooldown * game.mods.enemySlow;
    if (this.state === 'bashwind') this.bashCd = TUNING.shieldman.bash.cd * game.mods.enemySlow;
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
    // A man carrying a soul is carrying the same thing witchfire is made of (29 Sep 2026: "the soul
    // bosses do not catch from their own magic fire"): the keeper's club lights it and he walks in it.
    // Ordinary flame, a brazier, a burning man still take him like anybody.
    if (witch && this.soul && TUNING.soulBearer.witchProof) return;
    this.litByMan = !!fromMan;
    // How far down a line of men this fire has been handed (the FIRE AMULET reads it): a man lit by
    // the ground is the head of a fresh line.
    if (!fromMan) this.fireDepth = 0;
    this.burning = this.kind === 'butcher' ? 3.0 : TUNING.fire.burnRunTime;
    // Fire was never what took the big man down. He walks out of it scorched and one heart lighter.
    if (this.kind === 'butcher') this.burnHearts = this.cfg.burnHearts;
    this.witchBurn = !!witch; this.scald = false;
    this.burnDir = Math.random() * Math.PI * 2; this.burnTick = 0;
    // A blunder-immune kind (`TUNING.<kind>.immune.blunder`, the Butcher, the hound) keeps whatever
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
    // happen has something to say about it, the same courtesy the shooter of a friendly-fire bullet
    // already gets.
    if (witch && !fromMan) {
      const mage = game.enemies.find((o) => o.kind === 'seer' && o !== this && !o.dead && !o.held
        && hyp(o.x - this.x, o.y - this.y) < TUNING.bark.witnessDist * TILE && game.world.los(o.x, o.y, this.x, this.y));
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

  die(game, cause, dx, dy, how) {
    if (this.dead || this.ghosted) return;
    if (this.carry) Thrower.drop(this, game);   // a blow that lands on the thrower brings down what he held
    Stats.blow(game, this, cause, how);   // what reached him, for the run's report (js/stats.js)
    // A blow that lands on the mage's man before the scene has given him the first gate's soul finds
    // it in him all the same (`game.blessNow`): that gate opens on nothing else.
    if (this.blessing) game.blessNow(this);
    // A fused man goes off however he dies while the fuse is counting (9 Oct 2026 playtest, the card: "if the enemy dies
    // after a headbutt, he explodes"; it was a collision only). A fall takes him and his fuse down the hole.
    if (this.bombFuse > 0 && !this.exploded && cause !== 'fall' && (cause === 'splat' || this.hp <= 1)) { this.explode(game); return; }
    // Anyone carrying more than one hit, an arena elite, or any Seer, eats it, goes down and gets
    // back up; a Seer blinks clear as he does. Fire counts, so a mage has to be lit twice. Being torn
    // open does not: there is nothing left to get up. A bomb charge no longer skips this either, it
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
        return;
      }
      // The rat ogre takes it standing. Every other multi-heart man goes down floored for a beat,
      // which on him would be a stun window opening off the very blow that spent the last one,
      // six horns in a row off one crate. He shrugs, roars, and comes on again: one crate, one heart.
      if (this.kind === 'ratogre') {
        // In the air he keeps flying, as the ogre does below: stopped mid-bound over a drop, the pit
        // check took every heart he had left.
        if (this.state !== 'hop') { this.state = 'stagger'; this.timer = this.cfg.stagger; this.vx = 0; this.vy = 0; this.thrown = false; this.flung = false; }
        game.world.splat(this.x, this.y, dx || 0, dy || 0, 14);
        game.hitstop(0.05); game.shake(7); game.audio.sfxThud(); game.audio.sfxGrowl();
        return;
      }
      // In the air he keeps flying: the heart is gone and the leap is not. Floored mid-leap over a
      // drop, the pit check had him the next step, three hearts and all.
      if (this.state === 'hop') { game.audio.sfxThud(); return; }
      this.state = 'floored'; this.timer = TUNING.boss.downFor; this.vx = 0; this.vy = 0; this.thrown = false; this.flung = false;
      // A man knocked down is not in your mouth any more. Left there, he got up with his own AI back
      // while still pinned in front of the goat, a mage painting at his feet, a clubman swinging.
      if (this.held) {
        this.held = false;
        if (game.goat.holding === this) { game.goat.holding = null; game.goat.spendGrab(game, true); }
      }
      game.world.splat(this.x, this.y, dx || 0, dy || 0, 13);
      game.hitstop(0.05); game.shake(7); game.audio.sfxThud();
      if (this.kind === 'seer') this.blinkCd = 0;
      return;
    }
    this.dead = true; this.state = 'dead';
    const w = game.world;
    // A shieldman's board outlives him, unless the drop, the fire or a blast went with it.
    // A bomb, BOMB CHARGE and spilt powder kill with 'splat' and say so in `how`.
    if (this.shield) {
      // A blast takes the board apart with him (its skulls flying, `Scatter.breakUp`); the drop and the fire take it whole.
      if (cause === 'boom' || how === 'bomb' || how === 'blast' || how === 'powder') { if (game.scatter) game.scatter.breakUp(Scatter.piecesOf({ skulls: true }), this.x, this.y, 16, Math.cos(this.facing), Math.sin(this.facing), 1.3); this.shield = null; }
      else if (cause === 'fall' || cause === 'burn') this.shield = null; else this.dropShield(game);
    }
    // The thrower's tank goes when he does: a small splash of poison where he fell (`thrower.acid` tiles).
    if (this.thrower && cause !== 'fall') Status.spatter(game, this.x, this.y, TUNING.thrower.acid);
    // The shaman down: his spirit goes out of his men and the goat's legs are his own (js/shaman.js).
    if (this.shaman) Shaman.onDie(this, game);
    // The blades he walked about with (`Prop.stickIn`) break as he goes down, each into its pieces.
    if (this.stuck && this.stuck.length) { if (game.scatter) game.scatter.breakStuck(this); this.stuck = null; }
    // Killed while pinned on a stag's antlers, or dead on them outright (`antlers`): he stays up on the
    // wall, the trophy draws him from here on (`bodyImg`) and no body falls (`CombatFX.death`).
    if (this.impaleOn && this.impaleOn.kind === 'trophy' && cause !== 'boom' && cause !== 'roll' && cause !== 'fall') this.hung = this.impaleOn;
    if (this.hung) {
      const p = this.hung;
      p.body = this; p.bodyFoot = this.y - p.y; this.impaled = 0; this.impaleOn = null; this.pin = null;
      if (game.fx && game.fx.corpseSprite && game.renderer) p.bodyImg = game.fx.corpseSprite(this, Math.PI / 2, cause === 'burn').image;
      // He swings on the tines, and says so (`trophy.sway`, `trophy.lines`): the trophy draws the swing from `hungAt`.
      p.hungAt = game.renderer ? game.renderer.t : 0;
      const L = TUNING.prop.trophy.lines;
      game.floatText(p.x, p.y - 44 - TUNING.prop.trophy.lift, L[Math.floor(Math.random() * L.length)], PALETTE.bone);
    }
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
    // Dead in the mouth, he still leaves it the way a man does (`spendGrab`): shot in the teeth he
    // cost nothing, and the grab still held took the next man that frame.
    if (game.goat.holding === this) { game.goat.holding = null; this.held = false; game.goat.spendGrab(game, true); }
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
    game.fx.explosion(this.x,this.y,B.radius * B.fxScale,false,false,B.fxLife,B.radius);
    w.splat(this.x, this.y, 0, 0, 30); w.scorch(this.x, this.y, B.radius * 0.5);
    game.particles(this.x, this.y, 18, PALETTE.blood, 320);
    game.particles(this.x, this.y, 10, PALETTE.fire, 260);
    game.ring(this.x, this.y, B.radius * B.fxScale, PALETTE.fireHi);
    game.thud(this.x, this.y, 9); game.hitstop(0.05); game.audio.sfxBoom(); game.vibe(35);
    w.emitNoise(this.x, this.y, TUNING.noise.boom);
    if (game.scatter) game.scatter.burst(this.x, this.y, B.radius);   // suppers and suits of armour
    for (const o of game.enemies) {
      if (o === this || o.dead || o.held || o.ghosted) continue;
      const dx = o.x - this.x, dy = o.y - this.y, d = hyp(dx, dy);
      if (d > B.radius || !game.blastClear(this.x, this.y, o.x, o.y)) continue;   // stone and a shut door stop it
      const nx = dx / (d || 1), ny = dy / (d || 1);
      // A heart, but never out of the air (`Status.blast` the same), and once a chain (`Status.spared`).
      if ((o.kind === 'butcher' || o.kind === 'ratogre') && Status.spared(game, o)) continue;
      if (o.kind === 'butcher') { o.hp -= 1; o.flash = 0.2; if (o.state !== 'hop') { o.state = 'stagger'; o.timer = TUNING.butcher.rocked.blast; } if (o.hp <= 0) o.die(game, 'splat', nx, ny, 'blast'); else Stats.blow(game, o, 'splat', 'blast'); }
      else if (o.kind === 'ratogre') o.die(game, 'splat', nx, ny, 'blast');
      else o.fling(nx * B.impulse, ny * B.impulse, true);
    }
    const g = game.goat, gd = hyp(g.x - this.x, g.y - this.y);
    if (gd < B.radius && !g.dead) { const nx = (g.x - this.x) / (gd || 1), ny = (g.y - this.y) / (gd || 1); g.vx += nx * 320; g.vy += ny * 320; }
    Prop.blastRoom(game, this.x, this.y, B.radius, false);   // the barrels, lamps and crates round him too
    this.die(game, 'boom', 0, 0);
  }

  canSeeGoat(game) {
    const g = game.goat; if (g.dead) return false;
    const dx = g.x - this.x, dy = g.y - this.y, d = hyp(dx, dy);
    // A man posted to watch a door is not idling: he covers the whole room and he sees further.
    // STEALTH (dev test): a goat crouched (`game.sneak`) is seen `stealth.sight` of the way.
    // THE DARK: out of the light a goat is a shape at `dark.ai.sight` tiles and nothing further, the
    // same few tiles his own ears give him, and a hound's a little more. Past it, noise is all anyone
    // has, on either side. Both in `sightRange`, which the drawn cells share.
    if (d > this.sightRange(game)) return false;
    // Straw holding his eye, or a goat standing still in moth's wool (js/talismans.js).
    if (!Talisman.visibleTo(game, this, d)) return false;
    // The dead do not need a line of sight and they do not have a front. They simply know.
    if (this.kind === 'wraith') return true;
    // Tall grass hides the goat the way it hides them: past `grass.hideR`, a goat standing in it is
    // not there to see, cone or no cone. What gives him away in it is noise, as anywhere else.
    const w = game.world, gt = Math.floor(g.y / TILE) * w.W + Math.floor(g.x / TILE);
    const sneakTest = !!(game.stealthLive);
    if (w.grass[gt] && d > (sneakTest ? TUNING.stealth.grass : TUNING.grass.hideR) * TILE) return false;
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
    // STEALTH (dev test): crates, boulders and barrels are cover, and so is grass past arm's length.
    if (sneakTest && this.screenAt(game, ang, d) < d) return false;
    return game.sees(this.x, this.y, g.x, g.y);
  }
  // How far he sees the goat right now (px): his range (a post's further), × `stealth.sight` while the goat
  // sneaks, and in THE DARK with the goat out of the light `dark.ai.sight` tiles (× `stealth.dark.sight`
  // sneaking under the STEALTH test). `canSeeGoat` and the STEALTH cells (`Renderer.sightPoly`) both ask it.
  sightRange(game) {
    const cfg = this.cfg, ST = TUNING.stealth;
    let R = (cfg.sight + (this.watchful ? (cfg.watchSight || 4) : 0)) * TILE * (game.sneak ? ST.sight : 1);
    if (game.goatLit === false) {
      const S = TUNING.dark.ai.sight;
      R = Math.min(R, (S[this.kind] || S.all) * TILE * (game.sneak && game.stealthLive ? ST.dark.sight : 1));
    }
    return R;
  }
  // STEALTH (dev test, 5 Oct 2026): how far along heading `a` his eye gets before something hides what is
  // behind it, up to `max` px: a crate, a boulder or a barrel (`stealth.cover.kinds`, its body grown by
  // `cover.grow` px, not one in the goat's teeth), and a tile of tall grass further off than
  // `stealth.grass` tiles (a goat in it is seen only that close, and grass past that is a curtain).
  // Stone and shut doors stay `game.sees`'s. `canSeeGoat` and the drawn cells (`Renderer.sightPoly`) share it.
  screenAt(game, a, max) {
    const C = TUNING.stealth.cover, ux = Math.cos(a), uy = Math.sin(a), held = game.goat && game.goat.holding;
    let best = max;
    const props = this.coverNear(game, max);
    for (let i = 0; i < props.length; i++) {
      const p = props[i]; if (p === held) continue;
      const ox = p.x - this.x, oy = p.y - this.y, t = ox * ux + oy * uy;
      if (t <= 0) continue;
      const rr = p.r + C.grow, q = ox * ox + oy * oy - t * t;
      if (q >= rr * rr) continue;
      const hit = Math.max(0, t - Math.sqrt(rr * rr - q));
      if (hit < best) best = hit;
    }
    const w = game.world, from = TUNING.stealth.grass * TILE, step = TILE / 4;
    for (let s = from; s < best; s += step) {
      const tx = Math.floor((this.x + ux * s) / TILE), ty = Math.floor((this.y + uy * s) / TILE);
      if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) break;
      if (w.grass[ty * w.W + tx]) { best = s; break; }
    }
    return best;
  }
  // The cover props within `max` px of him, gathered once a step (`coverAt`) for every ray that asks.
  coverNear(game, max) {
    if (this.coverAt === game.timer && this.coverMax >= max) return this.coverList;
    const kinds = TUNING.stealth.cover.kinds, out = [], m = max + TILE;
    for (const p of game.props) {
      if (p.broken || p.dead || !kinds.includes(p.kind)) continue;
      if (Math.abs(p.x - this.x) < m && Math.abs(p.y - this.y) < m) out.push(p);
    }
    this.coverAt = game.timer; this.coverMax = max; this.coverList = out;
    return out;
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
      // A grate lying flat is floor, except to the thrower on an errand or laden (`laden`): he steps round every one.
      else if (p.kind === 'spike') { if ((p.spikeThreat() || this.laden) && len(p.x - x, p.y - y) < p.r + this.r) return { kind: 'trap', p }; }
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
  // at the edge. A man who fails his trap check walks in anyway for a moment, which is what keeps the
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
    const l = hyp(dirx, diry) || 1; dirx /= l; diry /= l;
    // Only what is within a step of him can matter, and gathering that once keeps the probes cheap.
    const near = [];
    for (const p of game.hazards) {
      const reach = (p.kind === 'mill' ? TUNING.mill.armLen : p.kind === 'barrel' ? TUNING.prop.barrel.burst * TILE : p.r) + this.r + look + TUNING.ai.millClear + 6;
      if (p.kind === 'spire' && p.broken) continue;
      if (p.kind === 'barrel' && !(p.oilT >= 0)) continue;
      if (p.kind === 'spike' && !p.spikeThreat() && !this.laden) continue;   // a plate lying flat is floor (not to a laden thrower)
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
    // the roll does not apply to it at all, he falls only when something throws him in.
    const overPit = (ahead && ahead.pit) || (here && here.pit);
    // The thrower with a load overhead never blunders (5 Oct 2026, the user's): a man walking a crate into
    // a grate or a fire read as the load steering him. His trap roll waits until his hands are empty.
    // Poisoned he is blind and slow, and the floor is the first thing he misreads (`status.poison.trapMul`):
    // a drop too (`pitSense`), and whether or not he had seen the goat.
    const SP = TUNING.status.poison, sick = this.poison > 0;
    if ((!overPit || sick) && !this.laden) {
      if (this.hazardRoll <= 0) {
        this.hazardRoll = sick ? SP.trapGap : TUNING.ai.rollGap;
        // The blunder is for a man already coming for you, rattled and in a hurry, a patrol who
        // has not even noticed the goat has no reason to misread the ground under his own feet.
        // Without `aware` here a bored guard would eventually wander into every plate in his room
        // simply from pacing past it enough times, which reads as broken rather than as a mistake.
        const sense = sick ? (overPit ? SP.pitSense : this.trapSense * SP.trapMul) : this.trapSense;
        if ((this.aware || sick) && Math.random() > sense) this.hazardBlind = TUNING.ai.blindFor;
      }
      if (this.hazardBlind > 0) return { x: dirx, y: diry };
    }
    // A way out has to be a way he can actually walk, or he just slides along the wall into it.
    const walkable = (ax, ay) => !w.isSolid(Math.floor((this.x + ax * look) / TILE), Math.floor((this.y + ay * look) / TILE));
    if (here && here.p) {
      // Already inside it: straight out from the hub, which is the shortest way to not being there.
      const ol = hyp(this.x - here.p.x, this.y - here.p.y) || 1, ox = (this.x - here.p.x) / ol, oy = (this.y - here.p.y) / ol;
      // Round anything that stays put, though, not away from it: straight out from a brazier and
      // straight back in on the next step had a man rocking at the edge of its heat forever, with a
      // body's width of floor to walk past it by. Whatever of his way does not lead into it, plus a
      // little out. The wheel's arms come round at him, and a lit barrel is about to go up two and a
      // half tiles wide: from those two straight out is still the answer.
      if (here.p.kind !== 'mill' && here.p.kind !== 'barrel') {
        const into = dirx * ox + diry * oy, out = TUNING.ai.roundOut;
        let sx = dirx - Math.min(0, into) * ox + ox * out, sy = diry - Math.min(0, into) * oy + oy * out;
        const sl = hyp(sx, sy) || 1; sx /= sl; sy /= sl;
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
    const l = hyp(dirx, diry) || 1;
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
  // other way, a run, a hop, a blow, is picked up as his heading the first step he is back on
  // his legs.
  stride(dirx, diry, speed, dt, game) {
    const cfg = this.cfg, want = Math.atan2(diry, dirx);
    if (!(game.timer - this.strideAt < 0.05)) {
      this.runSp = hyp(this.vx, this.vy);
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
    const dx = g.x - this.x, dy = g.y - this.y, d = hyp(dx, dy);
    // A man on a post does not come and get you. He turns to face you and waits to be walked into,
    // which is what makes him something you can practise a headbutt on instead of something that
    // happens to you. Everything else about him, the windup, the swing, the recovery, is normal.
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
    const dx = tx - this.x, dy = ty - this.y, l = hyp(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
  }
  pickWaypoint(game) {
    const w = game.world, g = game.goat, P = TUNING.ai.path, props = this.pathProps, r = this.r * P.bodyMul;
    const d = len(g.x - this.x, g.y - this.y);
    if (d < (P.ahead - 1) * TILE && this.bodyClear(game, g.x, g.y, r, props)) return { goat: true };
    // The field that steps round the furniture, and for a body wider than a tile the one with no
    // one-tile gaps in it either, each only where it reaches him at all. Furniture that walls a
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
    const w = game.world, ax = this.x, ay = this.y, dx = bx - ax, dy = by - ay, L = hyp(dx, dy);
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
      if (p.box) {
        // The stall is a box: the line against it grown by his width (a slab test), not a disc.
        const hx = p.box.hx + r, hy = p.box.hy + r;
        let t0 = 0, t1 = 1;
        for (const [o, dd, h] of [[ax - p.x, dx, hx], [ay - p.y, dy, hy]]) {
          if (Math.abs(dd) < 1e-6) { if (Math.abs(o) >= h) { t0 = 2; break; } continue; }
          const a = (-h - o) / dd, b = (h - o) / dd;
          t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b));
        }
        if (t0 < t1) return false;
        continue;
      }
      const t = clamp(((p.x - ax) * dx + (p.y - ay) * dy) / L2, 0, 1);
      if (hyp(ax + dx * t - p.x, ay + dy * t - p.y) < p.r + r) return false;
    }
    return true;
  }
  // The watch on whether a chase is getting anywhere. Every `stuckCheck` s he has covered less than
  // `stuckMove` tiles and is not already at the goat, he is pinned, a corner, a boulder, two tables,
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

  // A step of him: `act`, then the one thing every state of a shieldman shares, the weight of the board.
  // Whichever way this step wanted him to face, he turns there no faster than `shieldman.turn`, so a goat
  // who circles, rolls or vaults round him reaches his back, and a swing he wound up facing one way goes
  // that way (`meleeHit` reads `facing`). Thrown, carried or dead, the board has no say. Poisoned, the
  // turn all but stops (`poisonTurn`): that is when he is walked round. `low` eases toward the board
  // being down (`shieldUp`), for the picture only.
  update(dt, game) {
    const sh = this.shield;
    // The floor's last man held to his picture (the ogre at his bone, the mages by their bowl) until he is met (js/endboss.js).
    if (this.endHold && EndBoss.hold(this, dt, game)) return;
    if (!GapCross.step(this, dt, game)) this.act(dt, game);   // over a drop, if it is his kind to (js/gapcross.js)
    if (this.stuck && !this.dead) this.stuckFire(dt, game);
    if (!sh) return;
    const S = TUNING.shieldman;
    if (this.shield === sh && !this.dead && this.state !== 'flung' && this.state !== 'held') {
      // planted after a leap he cannot turn at all (`bashStep`): the moment to go round him
      if (this.state !== 'recover') this.bashPlant = false;
      const k = this.bashPlant ? 0 : S.turn * (this.poison > 0 ? S.poisonTurn : 1) * dt;
      this.facing = sh.ang + clamp(angleDiff(sh.ang, this.facing), -k, k);
    }
    sh.ang = this.facing; sh.jolt = Math.max(0, sh.jolt - dt);
    sh.low = clamp((sh.low || 0) + (this.shieldUp() ? -1 : 1) * S.ease * dt, 0, 1);
  }

  // A blade charged with fire stuck in him (`Prop.stickIn`, `weapon.stick.fire`): while its fire lasts,
  // he is lit again `gap` s after he stops burning, so the blade in his side is what keeps him alight.
  stuckFire(dt, game) {
    const F = TUNING.prop.weapon.stick.fire;
    for (const b of this.stuck) {
      if (!b.fire || b.fireT <= 0) continue;
      b.fireT -= dt;
      if (this.burning > 0) { b.gapT = 0; continue; }
      b.gapT += dt;
      if (b.gapT >= F.gap && !this.held) { b.gapT = 0; this.ignite(game, b.fire === 'witch'); }
    }
  }
  // ---- the shieldman (`TUNING.shieldman`, 1 Oct 2026) ----
  // A clubman behind a board: `uses` blows it takes, `jolt` the shudder drawn after one, `ang` the way it
  // faces (the turn the board's weight allows, `update`). Slower on his feet for carrying it.
  giveShield() {
    this.shieldman = true;   // what he is, for the death card and the run's report, board or no board
    this.shield = { uses: TUNING.shieldman.uses, jolt: 0, ang: this.facing };
    this.hp = this.maxHp = TUNING.shieldman.hp;
    this.bashCd = TUNING.shieldman.bash.cd * 0.5;
    this.speed = this.cfg.speed * TUNING.shieldman.speedMul;
  }
  // The board up at all: not on a man dazed, knocked about, in the goat's mouth or blundering alight.
  shieldUp() {
    const s = this.shield;
    return !!(s && s.uses > 0 && !this.dead && !this.held && !(this.dazed > 0) && !(this.burning > 0)
      && this.state !== 'floored' && this.state !== 'stagger' && this.state !== 'stunned' && this.state !== 'flung' && this.state !== 'dead');
  }
  // The board between him and (x, y): up, and the point within `arc` of the way he faces.
  shieldCovers(x, y) {
    return this.shieldUp() && Math.abs(angleDiff(this.facing, Math.atan2(y - this.y, x - this.x))) <= TUNING.shieldman.arc;
  }
  // A blow on the board, arriving along (dx, dy): `wear` uses gone (one, unless the horns met the spikes,
  // `spikes.wear`), and he is rocked back `push` along it for `brace` s with the board still up
  // (`braced`, never a stagger: the board is the point). The last use knocks it off his arm, and from
  // then on he is a clubman like any other.
  shieldTakes(game, dx, dy, wear = 1) {
    const S = TUNING.shieldman, sh = this.shield;
    if (!sh) return;
    sh.uses -= wear; sh.jolt = S.jolt; this.aware = true;
    const l = hyp(dx, dy) || 1, fx = this.x + Math.cos(this.facing) * this.r, fy = this.y + Math.sin(this.facing) * this.r;
    // A man already winding up or swinging goes on with it behind the board: butting it then is a goat in
    // his recovery under a club (pillar 4), never a way of breaking the blow.
    if (this.state !== 'flung' && this.state !== 'windup' && this.state !== 'swing') { this.state = 'braced'; this.timer = S.brace * game.mods.enemySlow; this.vx = dx / l * S.push; this.vy = dy / l * S.push; }
    // bone, struck: the pen's bar knock and a crack
    game.audio.sfxCageHit(); game.audio.sfxCrack(); game.audio.sfxThud(); game.vibe(10);
    game.particles(fx, fy, 6, PALETTE.bone, 150);
    if (sh.uses > 0) { if (wear) game.bark(this, 'block', 0.6); return; }
    this.shield = null; this.speed = this.cfg.speed; game.bark(this, 'shattered', 1);
    // It falls apart off his arm, skull by skull, along the blow (3 Oct 2026 playtest: "not just gone").
    if (game.scatter) game.scatter.breakUp(Scatter.piecesOf({ skulls: true }), fx, fy, 16, dx / l, dy / l, 0.9);
    game.audio.sfxCage();   // and off his arm: the pen's frame going
    game.particles(fx, fy, 14, PALETTE.bone, 230); game.particles(fx, fy, 5, PALETTE.ashHi, 160);
    game.floatText(this.x, this.y - 30, 'SHATTERED', PALETTE.bone);
    game.world.emitNoise(this.x, this.y, TUNING.noise.smash);
  }
  // Dead with uses left on it, the board is left lying where he fell: a shield like one off a stand
  // (`weapon`), its uses what he left on it. Not over a hole or out of a fire (nothing to leave).
  dropShield(game) {
    const sh = this.shield; this.shield = null;
    if (!sh || sh.uses <= 0) return;
    // A step ahead of him, unless that is stone or a drop (he died facing the wall he was thrown into):
    // then the nearest floor, never a board left inside the wall where nothing can reach it.
    const at = game.freeSpot(this.x + Math.cos(this.facing) * this.r, this.y + Math.sin(this.facing) * this.r);
    const p = new Prop(at.x, at.y, 'weapon', { weapon: 'shield' });
    // his skulls, horns and all: a shield in the mouth, and thrown, the horns kill the first man they meet (`hitMan`)
    // its own uses (`shieldman.drop`), not what was left on it in his hands: the spikes never wear, and
    // one blow taken before he fell left a board that broke on the first thing it met (5 Oct 2026).
    p.inStand = false; p.uses = TUNING.shieldman.drop; p.skulls = true;
    game.props.push(p);
  }

  // Butted again and again (`TUNING.champion.shove`, 3 Oct 2026 playtest: a butcher or a corrupted
  // clubman spammed in a corner never got out of it). Called by `Goat.headbuttHits` before the throw:
  // every butt landed on him is counted while the last was under `window` s ago, and the n-th is
  // answered at `odds[n]`: he is up at once if he was down and shoves the goat off, dazed a beat, no
  // heart, nothing spent. Returns whether he did, in which case the butt did nothing to him.
  shoveBack(game, g, ax, ay) {
    if (this.kind !== 'bearer' || !(this.champion || this.soul) || this.dead || this.held || this.state === 'flung' || this.scripted) return false;
    const S = TUNING.champion.shove, now = game.timer;
    if (!(now - (this.buttAt === undefined ? -1e9 : this.buttAt) < S.window)) this.butts = 0;
    this.buttAt = now;
    const n = this.butts || 0;
    // Never twice in `cd` s (9 Oct 2026: "he must not spam the shove"): inside it every butt lands as usual.
    if (this.shoveAt !== undefined && now - this.shoveAt < S.cd) { this.butts = n + 1; return false; }
    if (Math.random() >= S.odds[Math.min(n, S.odds.length - 1)]) { this.butts = n + 1; return false; }
    // After a shove the count starts again: the next two butts land whatever happens.
    this.butts = 0;
    // Up off the floor and square on to him: the corner he was being held in is his again.
    if (this.state === 'floored' || this.state === 'stagger' || this.state === 'stunned' || this.state === 'braced') { this.state = 'chase'; this.timer = 0; }
    this.facing = Math.atan2(g.y - this.y, g.x - this.x); this.aware = true; this.vx = 0; this.vy = 0;
    this.shoveAt = now;
    g.state = 'stunned'; g.timer = S.daze; g.dazed = Math.max(g.dazed || 0, S.daze);
    g.vx = -ax * S.speed; g.vy = -ay * S.speed;
    game.bark(this, 'shove', 0.8);
    game.audio.sfxThud(); game.squashGoat(TUNING.juice.squash.hit); game.hitstop(S.stop);
    game.particles(g.x + ax * g.r, g.y + ay * g.r, 10, PALETTE.ash, 260);
    // Seen as a shove (9 Oct 2026: "show it more clearly"): a ring bursting off him in the enemy's amber and a
    // smaller one where it met the goat, as the lean (`S.lunge`, `S.lean` px) throws him into it.
    game.ring(this.x, this.y, S.ring * TILE, PALETTE.fire, 0.35, 3);
    game.ring(g.x, g.y, S.ring * 0.55 * TILE, PALETTE.fireHi, 0.25, 2);
    return true;
  }

  act(dt, game) {
    if (this.dead || this.scripted) return;
    const w = game.world, g = game.goat, cfg = this.cfg, face0 = this.facing;
    // The ogre in the vault (`TUNING.vault.ogre`): shut in on the grass, he waits for the iron to
    // give and does nothing else, no leap over it, no noise heard through it. The blow that breaks
    // it wakes him, on the goat, at once.
    if (this.caged) {
      if (!this.caged.broken) { this.vx = 0; this.vy = 0; return; }
      this.caged = null; this.aware = true; this.woke = true; this.state = 'chase';
      this.facing = Math.atan2(g.y - this.y, g.x - this.x);
      game.floatText(this.x, this.y - 56, 'A TRAP', PALETTE.bone); game.audio.sfxGroan && game.audio.sfxGroan('butcher');
      game.thud(this.x, this.y, 6);
    }
    // A rune lives only while he is painting it, standing or in the goat's mouth. A cast broken by
    // a crate, a body, a bullet or fire left it set: not drawn, still a trap to every man's
    // `hazardAt`, and picked up later he set it off on the first frame with no windup at all.
    if (this.rune && this.state !== 'cast' && this.state !== 'held') this.rune = null;
    // The floor stops. Flung, floored, alight or simply walking: a man over a hole is gone, and the
    // mist is the one thing that can cross one.
    // A Butcher in the middle of a leap is over the hole, not in it: he never lands in one (`hopSpot`).
    if (!this.ghosted && !this.held && this.state !== 'hop' && w.isPitPx(this.x, this.y)) { this.die(game, 'fall'); return; }
    this.hookCd = Math.max(0, this.hookCd - dt); this.reload = Math.max(0, this.reload - dt); if (this.bashCd) this.bashCd = Math.max(0, this.bashCd - dt);
    // A hook out of his hand lives only while he is throwing, pulling or reeling it: whatever else
    // took him (a body, a crate, fire, a blast, the floor) took the rope out of his hand.
    if (this.hook && this.state !== 'hookthrow' && this.state !== 'hookpull' && this.state !== 'hookreel') this.dropHook(game);
    // The same for what the thrower holds over his head (js/thrower.js): out of those states, or alight, it comes down.
    if (this.carry && (!Thrower.KEEPS.has(this.state) || this.burning > 0)) Thrower.drop(this, game);
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
    // The fuse used to be the trigger as well as the clock: whoever was still ticking when it hit
    // zero went off wherever he stood, mid-air or not. Now only a collision sets him off, so a fuse
    // that runs out with no wall or body to answer it just fizzles, `die()`'s own check reads
    // `bombFuse > 0`, so clamping it to exactly zero here is what closes the window.
    if (this.bombFuse > 0) { this.bombFuse = Math.max(0, this.bombFuse - dt); }

    // ---- burning ----
    // Nobody on fire is steering, a man alight who keeps walking his line at you is the one thing
    // that reads as the fire not counting, so everything that catches blunders. `immune.blunder`
    // (the Butcher, the hound) is the one exception the tool can turn on a kind: it still catches,
    // still bleeds hearts for it, but does not lose the room to it, it keeps whatever it was doing.
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
      // A held Hunter keeps shooting where he is pointed, for two or three rounds, and then he is
      // out and you are carrying a man.
      if (this.kind === 'hunter' && this.reload <= 0 && this.heldShots > 0 && this.poison <= 0) {
        this.reload = cfg.reload * game.mods.enemySlow;
        this.heldShots -= 1;
        game.fireBullet(this, Math.cos(this.facing), Math.sin(this.facing));
        if (this.heldShots <= 0) game.floatText(this.x, this.y - 28, 'CLICK', PALETTE.ashHi);
      }
      // A mage goes on painting the ground while you carry him, and the ground he can reach is the
      // ground under his own feet, which is the ground under yours. That is the joke, and it is
      // the reason a Seer is the one man in the building you should think twice about picking up.
      if (this.kind === 'seer') {
        this.castCd = Math.max(0, this.castCd - dt);
        if (this.rune) {
          // The mark goes where he started painting it and stays there. It used to be dragged along
          // under him, which meant it went off under the goat wherever the goat had run to, so
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
      // Fire does not care that he is in your mouth, and a mage standing in his own is no exception:
      // whatever catches comes straight out of it, which is the counter to carrying one at all.
      // A brazier is fire too: walk him into one and he lights the way a thrown man does.
      if (w.isBurningPx(this.x, this.y)) { this.ignite(game, w.isWitchPx(this.x, this.y)); return; }
      { const bz = game.touchingBrazier(this); if (bz) { this.ignite(game, !!bz.witch); return; } }
      return;
    }

    // ---- flung bodies ----
    if (this.state === 'flung') {
      this.millRun = null;                     // the wheel lesson's run ends at the first blow
      const drag = Math.exp(-TUNING.physics.flungDrag * dt);
      this.vx *= drag; this.vy *= drag;
      const preSpeed = hyp(this.vx, this.vy);
      // In steps no longer than his body: LONG HORNS with a charged TALLY blow moves a man ~34 px a
      // frame, and a centre landing past the middle of a one-tile pillar was pushed out of its far
      // side, through the stone, alive, where the wall was supposed to be what killed him.
      const steps = Math.max(1, Math.ceil(preSpeed * dt / ((this.wallR || this.r) * 0.9)));
      const v0x = this.vx, v0y = this.vy;   // before the stone takes what went into it
      let impact = 0;
      for (let i = 0; i < steps; i++) {
        this.x += this.vx * dt / steps; this.y += this.vy * dt / steps;
        impact = Math.max(impact, w.collideCircle(this));
      }
      // The wall's dressing answers him before the wall does: a suit of armour he lands by comes
      // apart, and a stag's antlers he meets catch him at a speed the stone alone would not kill at.
      if (game.wallArt && game.wallArt.length && this.wallDressing(game, v0x, v0y, preSpeed)) return;
      if (impact > this.splatLimit(game)) {
        this.die(game, 'splat', this.vx / (preSpeed || 1), this.vy / (preSpeed || 1), 'wall'); return;
      }
      // A thrown body dies on any wall it touches, except a man out of the goat's mouth, who has to
      // arrive at `physics.thrownKill` (MASON'S MARK lowers it the way it lowers `splatSpeed`).
      const needs = this.fromMouth ? TUNING.physics.thrownKill * Talisman.splatMul(game) * this.weakMul() : 0;
      if (impact > needs && this.thrown && this.kind !== 'butcher') { this.die(game, 'splat', 0, 0, 'wall'); return; }
      if (this.burning <= 0 && w.isBurningPx(this.x, this.y)) { this.ignite(game, w.isWitchPx(this.x, this.y)); if (this.burning > 0) return; }
      // A body arriving at speed knocks the coals out of the bowl as well as catching from it, so
      // a man thrown into a brazier lights the floor on the far side of it too.
      const bz = game.touchingBrazier(this);
      if (bz) { if (preSpeed > TUNING.physics.knockHitSpeed) bz.spill(game, this.vx, this.vy); this.ignite(game, !!bz.witch); return; }
      if (hyp(this.vx, this.vy) < TUNING.physics.flungFloorSpeed) {
        // Off the rat ogre's arm with nothing left in him: he does not get up from it.
        if (this.doomed) { this.die(game, 'club', this.vx, this.vy); return; }
        this.state = 'floored'; this.timer = TUNING.bearer.flooredTime * (this.floorMul || 1); this.flung = false; this.thrown = false;
        this.floorMul = 0;
        game.dust(this.x, this.y, TUNING.juice.dust.land, this.vx, this.vy);   // he hits the floor: a puff pushed along the slide
      }
      return;
    }
    // `braced`: a shieldman rocked back behind his board (`shieldTakes`), the board still up.
    if (this.state === 'floored' || this.state === 'stagger' || this.state === 'stunned' || this.state === 'braced') {
      this.millRun = null;
      this.timer -= dt; this.vx *= 0.85; this.vy *= 0.85;
      this.x += this.vx * dt; this.y += this.vy * dt; w.collideCircle(this);
      // Not while already alight, the same guard as below: a kind that does not blunder stays in this
      // state when `ignite` no-ops, and the return skipped the timer, an ogre knocked down in a pool
      // of oil never got up and burned to death from full hearts.
      if (this.burning <= 0 && w.isBurningPx(this.x, this.y)) { this.ignite(game, w.isWitchPx(this.x, this.y)); if (this.burning > 0) return; }
      if (this.timer <= 0) {
        this.aware = true; this.state = 'chase';
        // The Butcher answers a stagger with a quick slam if you stayed close: the same ring, sooner.
        if (this.kind === 'butcher' && !g.dead && hyp(g.x - this.x, g.y - this.y) < cfg.slam.near * TILE * cfg.slam.answerReach + g.r) { this.state = 'slamwind'; this.timer = cfg.slam.wind * cfg.slam.answer * game.mods.enemySlow; }
      }
      return;
    }

    // The wheel lesson waits for its audience (1.72): until the goat has set foot in their room the
    // two men hold their marks, no sight through the doorway, no footsteps, no idle wander, and so
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
      if (!this.aware) { if (this.kind === 'dog') game.houndSeen(this); else game.bark(this, 'spot', 0.85); this.spotT = game.timer; }
      this.aware = true; this.lastSeen = { x: g.x, y: g.y }; this.lostTimer = 0;
      // STEALTH (dev test): a man past his beat of doubt with his eyes on the goat is a fight, and the
      // sneak ends and stays shut while it lasts (`Game.breakSneak`, `stealth.deny`).
      if (game.stealthLive && this.state !== 'idle' && this.state !== 'investigate' && this.state !== 'noticed'
          && !this.millLesson) game.breakSneak();
    }
    else if (this.aware) {
      this.lostTimer += dt;
      // Lose the trail: no sight for a while and far away by path, go check the last place you were seen.
      // In THE DARK it goes cold in `dark.ai.lose` seconds wherever he is: he goes to the last place
      // he saw you, or the last thing he heard since, and hunts from there by ear.
      // A blow already under way is finished, not dropped: the dark cools a hunt, never a swing, a
      // hound's run or a hook in flight (pillar 4, his windup and recovery are the goat's to read and eat).
      const hunting = this.state === 'chase' || this.state === 'noticed' || this.state === 'investigate';
      // On a lit floor too: without `hunting` it cut the rat ogre's swing and bound, a hidden wraith
      // out of its disguise and a HORNED MASK flight short, every six seconds out of sight.
      const cold = hunting && (game.inDark ? this.lostTimer > TUNING.dark.ai.lose : this.lostTimer > 6 && w.flowDist(this.x, this.y) > 14);
      if (cold && this.state !== 'held') {
        this.aware = false; this.lostTimer = 0; this.target = this.lastSeen; this.state = 'investigate';
      }
    }
    // Close, and he has not seen you yet: what he mutters is the only warning you get.
    if (!sees && !this.aware && this.state !== 'investigate' && Math.random() < dt * TUNING.bark.nearChance
        && hyp(g.x - this.x, g.y - this.y) < TUNING.bark.nearDist * TILE) game.bark(this, 'near');
    // STEALTH (dev test): in THE DARK, with less to see by, every man hears `stealth.dark.ear` × as far.
    const ear = game.inDark && game.stealthLive ? TUNING.stealth.dark.ear : 1;
    for (const n of w.noises) {
      // The rat ogre has his own mind: nothing lures him and nothing turns his head but what he sees.
      if (this.kind === 'ratogre' || this.state === 'hidden') break;
      if (hyp(n.x - this.x, n.y - this.y) > n.r * ear) continue;
      if (this.kind === 'seer' && game.inDark) this.hearForRune(game, n);
      if (n.kind === 'lure') {
        // A scream pulls everyone who hears it to the spot, even men already hunting you.
        // Stand still and they find you; move and they search where you were.
        // Not a man already committed to something: a windup, a hook, a cast, a leap, a wraith
        // that has become a body. The call reaches thirteen tiles and it used to drop every one of
        // those where it stood (an ogre mid-leap over a drop fell in); only `scream.balk`, a tile and a bit
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
        if (n.kind === 'cult' && hyp(n.x - this.x, n.y - this.y) < TUNING.ai.ownNoise * TILE) continue;
        this.target = { x: n.x, y: n.y };
        if (this.state === 'idle') { this.state = 'investigate'; game.bark(this, 'search', 0.3); }
        this.facing = Math.atan2(n.y - this.y, n.x - this.x);
      }
    }
    // Most men close the instant they see you, but not with nothing in between: at any real
    // distance a shape in the dark is a beat of doubt before it is a threat, and only being spotted
    // close up, inside `ai.noticeNear`, leaves no room for one. `noticeFor` (set only by
    // `startLevel`, on the Mill lesson's two men) still wins outright where it is set, because that
    // beat is a fixed, authored one and not a function of range. Everyone else gets a distance-scaled
    // version of the same freeze: `ai.noticeMin` seconds up close, out to `ai.noticeMax` at
    // `ai.noticeFar` tiles or beyond.
    if (this.aware && (this.state === 'idle' || this.state === 'investigate')) {
      let notice = this.noticeFor;
      if (!notice) {
        // STEALTH (dev test): a longer beat of doubt (`stealth.notice`), a `?` over him, to get out of his sight in.
        const distTiles = hyp(g.x - this.x, g.y - this.y) / TILE, A = game.stealthLive ? TUNING.stealth.notice : TUNING.ai;
        const t = clamp((distTiles - A.noticeNear) / (A.noticeFar - A.noticeNear), 0, 1);
        notice = t > 0 ? lerp(A.noticeMin, A.noticeMax, t) : 0;
      }
      if (notice > 0) { this.state = 'noticed'; this.timer = this.noticeDur = notice; }
      else { this.state = 'chase'; this.alarmAt = game.timer; }
    }
    // STEALTH (dev test): out of his sight again before his beat of doubt is over, he only thinks he
    // saw something, and goes to look where it was. Not an authored beat (`noticeFor`).
    if (this.state === 'noticed' && !sees && game.stealthLive && !this.noticeFor && this.lastSeen) {
      this.aware = false; this.state = 'investigate'; this.target = { x: this.lastSeen.x, y: this.lastSeen.y };
      game.bark(this, 'search', 0.5);
    }
    if (this.state === 'noticed') {
      this.vx = 0; this.vy = 0; this.facing = Math.atan2(g.y - this.y, g.x - this.x);
      // `this.burning <= 0` is what keeps this from re-triggering on a kind that is already alight
      // and standing over the ground it is itself lighting: `ignite` no-ops while burning, but the
      // `return` here does not, and blunder-immune kinds fall through to this point still on fire.
      if (!this.ghosted && this.burning <= 0 && w.isBurningPx(this.x, this.y)) { this.ignite(game, w.isWitchPx(this.x, this.y)); if (this.burning > 0) return; }
      this.timer -= dt;
      // The careful one of the wheel's pair stays planted while his partner runs at the arm (up to
      // `ai.millRun.watch` s): walking beside him he was the man the flung body landed on, and the
      // room is two men doing two different things, one after the other.
      if (this.millLesson && !this.millRun && this.timer <= 0 && (this.millWatchT = (this.millWatchT || 0) + dt) < TUNING.ai.millRun.watch
          && game.enemies.some((o) => o.millRun && !o.dead && o.room === this.room)) return;
      if (this.timer <= 0) { this.state = 'chase'; this.alarmAt = game.timer; } else return;
    }
    if (!this.ghosted && this.burning <= 0 && w.isBurningPx(this.x, this.y)) { this.ignite(game, w.isWitchPx(this.x, this.y)); if (this.burning > 0) return; }

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
    // STEALTH (dev test, 5 Oct 2026): while the goat sneaks, a man who does not know he is there turns at
    // `stealth.turn` rad/s whatever turned him (a glance round, a noise, a new heading), and walks only
    // as much as he already faces his way, so a turn is a slow thing to get behind. A hound has his legs.
    if (game.sneak && !this.aware && this.kind !== 'dog' && game.stealthLive) {
      const k = TUNING.stealth.turn * dt, want = this.facing;
      const f = face0 + clamp(angleDiff(face0, want), -k, k);
      this.facing = Math.atan2(Math.sin(f), Math.cos(f));   // kept within a turn (the eight-facing lookups)
      const sp = hyp(this.vx, this.vy);
      if (sp > 1) { const c = Math.max(0, Math.cos(angleDiff(this.facing, Math.atan2(this.vy, this.vx)))); this.vx *= c; this.vy *= c; }
    }

    // The dev drawer's ENEMY SPEED slider (`game.dev.tune`) bends the step, not the velocity: every
    // gait that ends here (walk, chase, stride, dart, drift) is covered and nothing that reads
    // his speed as an impact (a splat, a door) is changed. At 1 it is `dt` exactly.
    const mv = game.dev && game.dev.tune ? dt * game.dev.tune.enemySpeed : dt;
    // The lip. Everything that moves him here is his own legs (a blow, a throw and a fall are handled
    // above), and nobody walks off a drop: a hound circling the goat or running at his heels went
    // over the edge of a hole mid-stride (playtest, 30 Sep 2026). Slide along it instead, an axis at
    // a time; a hound whose run meets it has run it, as against stone.
    const nx = this.x + this.vx * mv, ny = this.y + this.vy * mv;
    // Poisoned and blind to the floor this beat (`avoidHazard`, `status.poison.pitSense`), he walks off it.
    const reel = this.poison > 0 && this.hazardBlind > 0;
    if (!this.ghosted && !reel && this.state !== 'hop' && w.isPitPx(nx, ny) && !w.isPitPx(this.x, this.y)) {
      if (!w.isPitPx(nx, this.y)) { this.x = nx; this.vy = 0; }
      else if (!w.isPitPx(this.x, ny)) { this.y = ny; this.vx = 0; }
      else { this.vx = 0; this.vy = 0; }
      if (this.kind === 'dog' && this.state === 'dart') this.dashEnd(game);
    } else { this.x = nx; this.y = ny; }
    // Mist goes through the wall. That is the point of it, and it is why there is no safe corner
    // on the Ossuary: the only cover on that ground is which way you are facing.
    const impact = this.ghosted ? 0 : w.collideCircle(this);
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
        t = hyp(px - this.x, py - this.y) / (this.speed || 1);
      }
      const d = hyp(px - this.x, py - this.y);
      if (d < bd) { bd = d; bx = px; by = py; }
    }
    this.moveToward(bx - this.x, by - this.y, this.speed, dt);
    this.facing = Math.atan2(this.vy, this.vx);
    return true;
  }

  // STEALTH (dev test): an idle man looks into his room, not at its wall, now that where he looks is
  // drawn on the floor. `stealth.idle.tries` headings all round him, each run out until stone (up to
  // `far` tiles), and one of those within `keep` of the longest taken at random.
  openFacing(game) {
    const I = TUNING.stealth.idle, w = game.world, far = I.far * TILE, step = TILE / 2, n = I.tries, opts = [];
    // A boulder, a crate or a table is as good as stone to look at (5 Oct 2026: a man in the cave stood
    // with his face in a rock): what stands within his look stops it too.
    const props = this.nearBlockers(game, this.x, this.y, far + TILE);
    const blocked = (x, y) => w.isSolid(Math.floor(x / TILE), Math.floor(y / TILE)) || props.some((p) => len(p.x - x, p.y - y) < p.r + this.r);
    let best = 0;
    for (let i = 0; i < n; i++) {
      const a = this.facing + (i + Math.random() - 0.5) / n * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a);
      let d = step;
      while (d < far && !blocked(this.x + ux * d, this.y + uy * d)) d += step;
      opts.push({ a, d }); if (d > best) best = d;
    }
    const good = opts.filter((o) => o.d >= best * I.keep), a = good[Math.floor(Math.random() * good.length)].a;
    return Math.atan2(Math.sin(a), Math.cos(a));   // within a turn: beat after beat it wound up past any bound
  }

  idleWander(dt, game) {
    if (this.sentry) { this.vx = 0; this.vy = 0; return; }   // he was put facing that way on purpose
    // A man lying in the grass stays lying there until something gets him up: that is what hiding is.
    if (this.lurk && !this.aware) { this.vx = 0; this.vy = 0; return; }
    this.wander -= dt;
    // Back in idle after anything else: the heading he holds is the one he has (`idleAng`, STEALTH's slow turn).
    if (game.timer - (this.idleSeen ?? -9) > 0.1) this.idleAng = this.facing;
    this.idleSeen = game.timer;
    // A man who has not seen or heard anything patrols his own room and nothing past it: once he
    // has drifted `ai.leash` tiles from where he was put, the next beat walks him home instead of
    // choosing a fresh direction, so idling never drifts a man through a doorway into the next room
    // (or, in a room built to teach one idea, out of the corner the level put him in to wait).
    // STEALTH (dev test): a man done searching (`homeward`, `investigate`) walks all the way back.
    const fromHome = len(this.x - this.home.x, this.y - this.home.y);
    if (this.homeward && (fromHome < TILE || game.timer > this.homeward)) this.homeward = 0;   // the time it gives up by
    let out = (fromHome > TUNING.ai.leash * TILE || !!this.homeward) && !(game.timer < (this.homeGive || 0));
    // The way home is a straight line, and a boulder or a crate in it held him pressed against it for good
    // (5 Oct 2026, a clubman in the cave, his face in a rock). Pinned for `ai.investStuck` s, he steps off
    // along the most open heading toward home (`freeHeading`) for a while, and with none he stops trying
    // for as long again.
    if (this.homeSideT > 0) this.homeSideT -= dt;
    if (!out || this.homeX === undefined) { this.homeT = 0; this.homeX = this.x; this.homeY = this.y; }
    else if ((this.homeT += dt) >= TUNING.ai.investStuck) {
      const moved = len(this.x - this.homeX, this.y - this.homeY), P = TUNING.ai.path;
      this.homeT = 0; this.homeX = this.x; this.homeY = this.y;
      if (moved < P.stuckMove * TILE) {
        const side = this.freeHeading(game, Math.atan2(this.home.y - this.y, this.home.x - this.x));
        if (side === null) { this.homeGive = game.timer + TUNING.ai.investStuck; this.homeward = 0; out = false; }
        else { this.homeSideAng = side; this.homeSideT = P.unstick * 3; }
      }
    }
    // STEALTH (dev test): stood with his nose to the stone (a search that ended on a wall), he looks round soon.
    const sneakTest = game.stealthLive, I = TUNING.stealth.idle;
    // A boulder or a crate in his face counts as stone, walking into it or stood at it (5 Oct 2026, the cave).
    if (sneakTest && this.wander > I.wake) {
      const nx = this.x + Math.cos(this.facing) * I.wall * TILE, ny = this.y + Math.sin(this.facing) * I.wall * TILE;
      if ((!this.walking && game.world.isSolid(Math.floor(nx / TILE), Math.floor(ny / TILE)))
        || game.props.some((p) => !p.broken && p.blocking && len(p.x - nx, p.y - ny) < p.r + this.r)) this.wander = I.wake;
    }
    if (this.wander <= 0 || out) {
      this.wander = 1 + Math.random() * 3;
      let f = out ? (this.homeSideT > 0 && Number.isFinite(this.homeSideAng) ? this.homeSideAng : Math.atan2(this.home.y - this.y, this.home.x - this.x)) : this.facing + (Math.random() - 0.5) * 2;
      // A pure random turn can point him straight at the wall behind him, and nothing about idling
      // ever checked: he'd just stand there looking at stone until the next wander beat. Resample a
      // few times against a look-ahead probe rather than leave him facing it, this only ever
      // touches the direction he is about to face, never whether he walks.
      if (!out && sneakTest) f = this.openFacing(game);
      else if (!out) {
        const w = game.world, look = TUNING.ai.wanderClear * TILE;
        for (let tries = 0; tries < 5 && w.isSolid(Math.floor((this.x + Math.cos(f) * look) / TILE), Math.floor((this.y + Math.sin(f) * look) / TILE)); tries++) {
          f = this.facing + (Math.random() - 0.5) * 2;
        }
      }
      this.facing = f; this.idleAng = f;
      // A man who has not seen anything still shifts his weight now and then rather than standing
      // like a post: about half of a wander beat is a few slow steps in whatever direction he just
      // turned to face, the rest is standing and looking. A room nobody has walked into yet used to
      // hold every man in it dead still until the moment he spotted you, which read as a stage set
      // rather than a room somebody was actually standing in.
      this.walking = out || Math.random() < 0.5;
    }
    // STEALTH (dev test): the heading he chose is kept (`idleAng`), so the slow turn while the goat sneaks
    // (`Enemy.act`, `stealth.turn`) finishes the turn over the next steps instead of walking off where it began.
    const a = sneakTest && this.idleAng !== undefined ? this.idleAng : this.facing;
    if (sneakTest && this.idleAng !== undefined) this.facing = this.idleAng;
    if (this.walking) this.moveToward(Math.cos(a), Math.sin(a), this.speed * TUNING.ai.wanderSpeed, dt, game);
    else { this.vx = 0; this.vy = 0; }
  }
  investigate(dt, game) {
    if (this.sentry) { this.target = null; this.state = 'idle'; this.vx = 0; this.vy = 0; return; }
    if (!this.target) { this.state = 'idle'; return; }
    const ST = TUNING.stealth, sneakTest = !!(game.stealthLive);
    // A fresh noise (a new `target`) starts the walk, the watch on it and the search over.
    if (this.searchFor !== this.target) {
      this.searchFor = this.target; this.searchN = 0; this.invRoute = false;
      this.invT = 0; this.invX = this.x; this.invY = this.y;
    }
    // STEALTH (dev test, 5 Oct 2026): there, he looks round `search.looks` times, `search.every` s apart,
    // each into the open (`openFacing`, turned at the sneak's slow turn), then goes home (`homeward`).
    if (this.searchN > 0) {
      this.vx = 0; this.vy = 0; this.searchT -= dt;
      if (this.searchT <= 0) {
        if (--this.searchN <= 0) { this.target = null; this.state = 'idle'; this.wander = 0; this.homeward = game.timer + ST.search.every * 8; return; }
        this.searchT = ST.search.every; this.lookAng = this.openFacing(game);
      }
      this.facing = this.lookAng;
      return;
    }
    const done = () => {
      this.vx = 0; this.vy = 0;
      if (sneakTest) { this.searchN = ST.search.looks; this.searchT = ST.search.every; this.lookAng = this.openFacing(game); return; }
      this.target = null; this.state = 'idle';
    };
    const dx = this.target.x - this.x, dy = this.target.y - this.y, d = hyp(dx, dy);
    // A noise on the far side of a wall used to be walked at in a straight line, into the wall, and
    // given up on there, so the one thing the goat could not do was be heard round a corner. The
    // route field runs to the goat, so for a noise near him (a footstep, a scream, a crate) it runs
    // to the noise as well: he walks it round, and only a noise far from anything goes in a line.
    const g = game.goat, nearGoat = len(this.target.x - g.x, this.target.y - g.y) < TUNING.ai.routeNoise * TILE;
    const routed = nearGoat && (this.invRoute || !game.world.los(this.x, this.y, this.target.x, this.target.y));
    if (d < TILE || (!routed && this.wallHit && Math.random() < dt * 2)) { done(); return; }
    // The straight line sees only stone: a boulder, a crate or a barrel in it held him pressed against it
    // for good (5 Oct 2026). Pinned for `ai.investStuck` s, he takes the route once if it is the goat's
    // way, and otherwise he has looked as far as he can.
    this.invT += dt;
    if (this.invT >= TUNING.ai.investStuck) {
      const moved = len(this.x - this.invX, this.y - this.invY);
      this.invT = 0; this.invX = this.x; this.invY = this.y;
      if (moved < TUNING.ai.path.stuckMove * TILE) {
        if (nearGoat && !this.invRoute) { this.invRoute = true; this.wp = null; }
        else { done(); return; }
      }
    }
    const f = routed ? this.pathDir(game, dt) : null;
    if (f) this.moveToward(f.x, f.y, this.speed * 0.6, dt, game);
    else this.moveToward(dx, dy, this.speed * 0.6, dt, game);
  }

  updateBearer(dt, game, sees) {
    const g = game.goat, cfg = this.cfg, reach = this.atk('reach');
    if (this.state === 'idle') { this.idleWander(dt, game); return; }
    if (this.state === 'investigate') { this.investigate(dt, game); return; }
    // The butcher hooks you from across the room (`hookStep`); the man holding a post never throws.
    if (this.champion && !this.sentry && this.hookStep(dt, game, sees)) return;
    // The shieldman leaps at you behind his board (`bashStep`).
    if (this.shield && !this.sentry && this.bashStep(dt, game, sees)) return;
    // The thrower looks for something to throw, lifts it, throws it; up close he grabs the goat (js/thrower.js).
    if (this.thrower && !this.sentry && Thrower.step(this, dt, game, sees)) return;
    // The shaman keeps back behind his men, puts his spirit into them, and calls the goat to him (js/shaman.js).
    if (this.shaman && !this.sentry && Shaman.step(this, dt, game, sees)) return;
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
      if (!this.swingHit) { this.swingHit = true; game.meleeHit(this, reach + 6, Math.PI / 2, this.atk('damage'), this.atk('knock')); if (this.keeper) this.keeperFire(game); }
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
      if (hyp(dx, dy) > K.fireR || (tx === mx && ty === my)) continue;
      if (!w.los(this.x, this.y, (tx + 0.5) * TILE, (ty + 0.5) * TILE)) continue;
      w.ignite(tx, ty, true, K.fireFor, true);
    }
    game.ring(cx, cy, K.fireR * TILE * 1.4, PALETTE.witchHi);
    game.audio.sfxRune();
  }

  // The ogre coming down, fists on the floor (`slam`) or out of a leap (`leap`): a ring round him,
  // every way at once. The goat inside it is hurt and thrown straight out from him. His own men in
  // it are left standing, it is the goat the ring is for, and so is anything he lands among.
  quake(game, S, R) {
    const g = game.goat;
    game.thud(this.x, this.y, 9); game.hitstop(0.05); game.audio.sfxThud(); game.audio.sfxSplat(); game.vibe(24);
    game.ring(this.x, this.y, R, PALETTE.blood, 0.45, 5); game.ring(this.x, this.y, R * 0.6, PALETTE.bone, 0.35, 3);
    game.dust(this.x, this.y, 12, 0, 0);
    game.world.emitNoise(this.x, this.y, TUNING.noise.swing, 'cult');
    if (game.hidden(this.x, this.y)) return;
    if (!g.dead) {
      const dx = g.x - this.x, dy = g.y - this.y, d = hyp(dx, dy);
      // The shield between him and the goat takes the ring as it takes a club (`Goat.blockBlow`); he
      // is on his knees already, so no parry on top of it.
      if (d < R + g.r && game.reaches(this.x, this.y, g.x, g.y) && !Talisman.parry(game, this, 'slam') && !g.blockBlow(game, this, false)) {
        const nx = dx / (d || 1), ny = dy / (d || 1);
        g.damage(S.damage * game.mods.butcherDamage, game, nx * S.knock * 4, ny * S.knock * 4, false, this);
      }
    }
    for (const p of game.props) {
      if (Beast.animal(p) && !p.held && p.birdState !== 'flying' && hyp(p.x - this.x, p.y - this.y) < R + (p.r || 0)) Beast.hurt(p, game, 'blow');
    }
  }
  updateHunter(dt, game, sees) {
    const g = game.goat, cfg = this.cfg;
    if (this.state === 'idle') { this.idleWander(dt, game); return; }
    if (this.state === 'investigate') { this.investigate(dt, game); return; }
    const dx = g.x - this.x, dy = g.y - this.y, d = hyp(dx, dy);
    // Across a drop from the goat with no short way round (9 Oct 2026 playtest: "the rifleman could not aim here, as if he
    // cannot aim across a chasm"): the goat stood just past his sight and he pushed at the lip trying to walk to him. Cut
    // off, he sees down a clear line `gapReach` times as far, shoots from there, and holds the lip instead of walking at it.
    const cut = this.aware && this.cutOffByGap(game, d);
    if (cut && !sees && d < cfg.sight * cfg.gapReach * TILE && this.poison <= 0 && Talisman.visibleTo(game, this, d) && game.sees(this.x, this.y, g.x, g.y)) sees = true;
    if (this.state === 'aim') {
      this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx); this.timer -= dt;
      if (!sees || this.poison > 0) { this.state = 'chase'; return; }
      // A man of his own standing right in front of the muzzle: he lowers it and steps off the line
      // instead of putting a round through him. Only close, past `friendClear` tiles he is looking
      // at the goat and not at who is in between, which is the friendly fire the room is built on.
      if (this.friendInLine(game, Math.atan2(dy, dx))) { this.state = 'chase'; this.stepOff(); return; }
      if (this.timer <= 0) {
        let spread = (Math.random() - 0.5) * 0.1;
        // Point blank he flinches: half the time the round goes somewhere else altogether.
        if (d < cfg.wildNear * TILE && Math.random() < cfg.wildChance)
          spread = (Math.random() < 0.5 ? -1 : 1) * cfg.wildSpread * (1 + Math.random());
        if (this.shotgun) EndBoss.shotgun(this, game, spread);   // THE THRESHING FLOOR's last man: three a shot (js/endboss.js)
        else game.fireBullet(this, Math.cos(this.facing + spread), Math.sin(this.facing + spread));
        this.reload = cfg.reload * game.mods.enemySlow; this.state = 'chase';
      }
      return;
    }
    // chase: keep distance, shoot when possible
    // The corrupted rifleman from his second meeting blinks out from a goat who has closed on him (js/endboss.js).
    if (this.blinker && EndBoss.hunterBlink(this, game, d, dt)) return;
    const reach = (cfg.sight * (cut ? cfg.gapReach : 1) + (this.watchful ? cfg.watchSight : 0)) * TILE;
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
    if ((d > cfg.keepMax * TILE || !sees) && !(cut && sees)) { this.chaseGoat(game, this.speed, dt); return; }
    this.vx = 0; this.vy = 0; this.facing = Math.atan2(dy, dx);
  }
  // A drop (`level.gaps`) between him and the goat and the land way round long or none (`gapCross.longer`, js/gapcross.js).
  cutOffByGap(game, d) {
    const L = game.level; if (!L || !L.gaps || !(L.gaps.size || L.gaps.length)) return false;
    const fl = game.world.flowDist(this.x, this.y);
    return fl < 0 || fl > d / TILE * TUNING.gapCross.longer;
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
  // floor in red, bent, because it starts off the side he was circling and turns onto you, and he
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
      // near him, he circles away from it. Alone, it is the coin it always was, rarer, and never
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
    const dx = g.x - this.x, dy = g.y - this.y, d = hyp(dx, dy);
    // The sidestep carries him: the burst was set the moment he slipped the headbutt.
    if (this.state === 'dodge') { this.timer -= dt; if (this.timer <= 0) { this.state = 'chase'; this.vx *= 0.25; this.vy *= 0.25; } return; }
    if (this.state === 'retreat') {
      this.timer -= dt;
      // The break: out past you and wheeling off the side he was circling, round and away onto the
      // ring, mostly round, a little out. He used to back straight off with his face to you, which
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
        // Only if the bite left him on the run: a MIRROR SHARD parry flings him and a shield staggers
        // him, and ending the dash over that turned the throw into a 30% skid and the stagger into `recover`.
        if (this.state === 'dart') this.dashEnd(game);
        return;
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
    // He runs the route in, and only starts to circle once he is nearly on the ring, and once on
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
    // Closing, holding the ring, or easing out again, depending on how near he already is, on a
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

  // The nearest heading to `ang` with `look` px of floor in front of it, stone, a drop and blocking
  // furniture all count, swept out either side in widening steps. The hound's whisker: it is what
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
      for (const p of props) if (hyp(p.x - px, p.y - py) < p.r + r * 0.8) return false;
      // Past a body is along its edge, and a body stood at a lip must not be passed over the drop.
      if (bodies && (w.isPitPx(px - cy * r, py + cx * r) || w.isPitPx(px + cy * r, py - cx * r))) return false;
      if (bodies) for (const o of bodies) if (hyp(o.x - px, o.y - py) < o.r + r) return false;
    }
    return true;
  }
  // The hound's eye for his own (24 Sep 2026: "he cannot get round his own"). Nothing else he
  // steers by knows a body is there, the fields are stone, the whisker stone and furniture, so a
  // clubman on his route or a packmate on the ring was run into and leaned on, the two of them
  // shoved along at half his pace, and in a doorway not at all. With one ahead of him inside
  // `pass.look` tiles (and nearer than the goat), he takes the nearest heading that clears it on
  // the side away from it, kept `pass.hold` s, or a man square in front flipped him every step,
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
  // The most open heading that still points somewhere near `want` (`unstuck`'s choice, for a man not
  // chasing: on his way home), or null with none a body can walk.
  freeHeading(game, want) {
    const props = this.nearBlockers(game, this.x, this.y, 3 * TILE);
    let best = null, bestScore = -Infinity;
    for (let k = 0; k < 16; k++) {
      const a = want + (k / 16) * Math.PI * 2;
      const reach = [1.5, 1, 0.6].find((t) => this.bodyClear(game, this.x + Math.cos(a) * t * TILE, this.y + Math.sin(a) * t * TILE, this.r * 0.8, props));
      if (!reach) continue;
      const score = reach + Math.cos(angleDiff(a, want)) * 0.8 + Math.random() * 0.3;
      if (score > bestScore) { bestScore = score; best = a; }
    }
    return best;
  }
  // The run starts from a standing crouch and takes a beat to reach its top speed: quick, not a
  // teleport. `t` is seconds into the run.
  dashSpeedAt(t) {
    const cfg = this.cfg;
    return cfg.dashSpeed * Math.min(1, cfg.dashStart + (1 - cfg.dashStart) * t / cfg.dashRamp);
  }

  // One step of the run's heading, shared by the run and the line drawn for it so the two cannot
  // disagree. He homes onto the goat at `dashTurn` only while the goat is still in front of him,
  // homing on a goat he had passed turned the run back on itself. A corner in the way is run round,
  // not into: the same whisker the orbit uses bends it, never past the goat himself (a goat with his
  // back to a wall is not a wall to steer off), and never faster than `whiskTurn`, let the whisker
  // snap and a run meeting a wall past the goat drew a kink of a right angle and more.
  runStep(game, x, y, ang, dt, near) {
    const cfg = this.cfg, g = game.goat, gd = hyp(g.x - x, g.y - y), toG = Math.atan2(g.y - y, g.x - x);
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
      if (Math.abs(angleDiff(ang, Math.atan2(g.y - y, g.x - x))) >= Math.PI / 2 && hyp(g.x - x, g.y - y) > cfg.overrun * TILE) break;
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

  // The headbutt that does not land. Once every `dodgeCd` s he is simply not there for one (30 Sep
  // 2026; it was a 38% coin) and it costs him his next run (`dodgeRest`). A dazed hound cannot move,
  // so he eats all of it.
  // Out of the goat's mouth: straight back, away from him, one tile over `hopTime`. It rides the
  // dodge state, which already carries a body on whatever velocity it was given and hands him back
  // to the chase when it runs out.
  hopBack(game, goat) {
    const cfg = this.cfg, dx = this.x - goat.x, dy = this.y - goat.y, l = hyp(dx, dy) || 1;
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
    // The slip is paid for out of his run (30 Sep 2026): his clock to the next plant starts again.
    this.lungeCd = Math.max(this.lungeCd, cfg.dodgeRest);
    this.aware = true;
    game.floatText(this.x, this.y - 24, 'MISS', PALETTE.bone);
    game.particles(this.x, this.y, 5, PALETTE.ash, 160);
    game.audio.sfxSnap(); game.vibe(8);
    return true;
  }

  // The Seer paints a rune under your feet and blinks away when you close. Frail as anyone else.
  // Mist most of the time: it slides toward your blind side, through whatever is in the way, and
  // does nothing at all until it is there. Then it becomes a body, and from that instant it is
  // committed, and stays a body well past the blow, which is the window you get to unmake it in.
  updateWraith(dt, game) {
    const cfg = this.cfg, g = game.goat, H = cfg.hide;
    this.fadeCd = Math.max(0, this.fadeCd - dt);
    this.driftPhase += dt;
    // Lying in the room as a box or a bowl. It does nothing until the goat does something within
    // reach of it, a headbutt, a reach for anything, a step onto it, and then it is on him from
    // whichever side he is standing on, blind side or not: the disguise is its way round your face.
    if (this.state === 'hidden') {
      this.vx = 0; this.vy = 0;
      if (g.dead) return;
      // Hung as a door (`Game.stageDoorMimic`): broken or leaned open by anything at all, it is found out;
      // near him the planks breathe now and then, the one tell there is.
      const md = this.mimicDoor;
      if (md) {
        if (md.broken || md.open > 0.3) { this.spring(game); return; }
        if (hyp(g.x - this.x, g.y - this.y) < H.doorTell * TILE && Math.random() < dt / H.doorBreath) md.wobble = 0.22;
      }
      const d = hyp(g.x - this.x, g.y - this.y);
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
        // Never over a lip, though: solid over a drop it would fall the next frame.
        const wd = hyp(g.x - this.x, g.y - this.y) || 1;
        const nx = this.x + (g.x - this.x) / wd * cfg.windupPull * dt, ny = this.y + (g.y - this.y) / wd * cfg.windupPull * dt;
        if (!game.world.isPitPx(nx, ny)) { this.x = nx; this.y = ny; }
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
    // It wanders as it closes, so a drift does not read as a missile, but never far enough to
    // wander back into the cone it cannot arrive from. A shoulder approach gets almost no slack;
    // one coming straight up your back gets all of it.
    const slack = Math.min(cfg.driftWobble, Math.abs(this.approach) - cfg.behind);
    const wobble = Math.sin(this.driftPhase * 0.9) * slack;
    const tx = g.x + Math.cos(back + wobble) * cfg.standoff * TILE;
    const ty = g.y + Math.sin(back + wobble) * cfg.standoff * TILE;
    const dx = tx - this.x, dy = ty - this.y, d = hyp(dx, dy);
    // Left behind after a blow, it may settle into the room as something else and wait again.
    if (this.hideWant && hyp(g.x - this.x, g.y - this.y) > H.minDist * TILE && this.hide(game)) return;
    this.vx = d > 1 ? dx / d * cfg.speed : 0;
    this.vy = d > 1 ? dy / d * cfg.speed : 0;
    this.facing = Math.atan2(g.y - this.y, g.x - this.x);
    // It only becomes real on your blind side, close enough to reach you, and not straight away,
    // and never inside a wall. Mist goes through stone; a body cannot be in it. That is the one thing
    // the ground still does for you here: a wall at your back is an arc it cannot arrive from.
    const behind = Math.abs(angleDiff(look, Math.atan2(this.y - g.y, this.x - g.x)));
    const reach = hyp(g.x - this.x, g.y - this.y) < cfg.reach + g.r + this.r * 0.5;
    // Nor over a drop: a body formed over a hole falls through it, and a goat with his back to one
    // killed every wraith that came for him there for nothing (28 Sep 2026).
    const room = !game.world.isSolid(Math.floor(this.x / TILE), Math.floor(this.y / TILE)) && !game.world.isPitPx(this.x, this.y);
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
      if (hyp(o.x - this.x, o.y - this.y) > 6 * TILE) continue;
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
    const H = this.cfg.hide, g = game.goat, md = this.mimicDoor;
    this.disguise = null; this.aware = true; this.woke = true;
    // It was the door: the planks come apart as it steps out of them.
    if (md) {
      this.mimicDoor = null; md.mimic = null;
      if (!md.broken) { md.hits = 0; md.smash(game, Math.cos(this.facing), Math.sin(this.facing), null); md.broken = true; }
      game.floatText(this.x, this.y - 30, 'THE DOOR WAS IT', PALETTE.witchHi);
    }
    this.solid = true; this.state = 'windup'; this.timer = H.springWind * game.mods.enemySlow;
    this.facing = Math.atan2(g.y - this.y, g.x - this.x);
    game.particles(this.x, this.y, 16, PALETTE.witchHi, 170);
    game.ring(this.x, this.y, 1.8 * TILE, PALETTE.witch);
    if (!md) game.floatText(this.x, this.y - 30, 'IT WAS NEVER THAT', PALETTE.witchHi);
    if (this.firstHide) game.hideTaught = true;
    game.audio.sfxWraith(); game.shake(4); game.vibe(20);
  }
  // A blast reached it while it lay as a box (`Prop.blastRoom`). Every real crate in reach is
  // matchwood, so this one is too: the box goes to splinters and what was in it is left standing as a
  // body, in the beat after a blow (`solidAfter`), the window a headbutt unmakes it in. Not a windup:
  // the blast found it out, the goat did not, so it owes him no blow.
  unmask(game) {
    const box = this.disguise;
    this.disguise = null; this.aware = true; this.woke = true;
    this.solid = true; this.state = 'solid'; this.timer = this.cfg.solidAfter * game.mods.enemySlow;
    this.facing = Math.atan2(game.goat.y - this.y, game.goat.x - this.x);
    if (box) game.fx.debris(box, 0, 0);
    game.particles(this.x, this.y, 11, PALETTE.wood, 165);
    game.particles(this.x, this.y, 12, PALETTE.witchHi, 150);
    game.floatText(this.x, this.y - 30, 'IT WAS NEVER THAT', PALETTE.witchHi);
    if (this.firstHide) game.hideTaught = true;
    game.audio.sfxCrack(); game.audio.sfxWraith();
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
    const dx = g.x - this.x, dy = g.y - this.y, d = hyp(dx, dy);

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
      this.rune = this.runeSpot(game); this.byEar = false;
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
  // own noise, not one past `dark.ai.earCast` tiles, and not one a man of his is standing in, the
  // cult's own feet and clubs make noise too, and he knows what his side sounds like. Whatever else
  // is there when it goes off, burns.
  hearForRune(game, n) {
    if (n.kind === 'cult') return;   // a rune going off, a swing: never paint a rune on the cult's own sound
    const A = TUNING.dark.ai, d = hyp(n.x - this.x, n.y - this.y), own = A.earOwn * TILE;
    if (d < own || d > A.earCast * TILE) return;
    for (const o of game.enemies) if (o !== this && !o.dead && hyp(o.x - n.x, o.y - n.y) < own) return;
    this.earRune = { x: n.x, y: n.y, at: game.timer };
  }

  // Where a rune he starts now is painted: on the goat, unless another mage's rune is already waiting there; then
  // where the goat is going, or beside him, so two mages cover two places (`seer.pair`).
  runeSpot(game) {
    const g = game.goat, P = TUNING.seer.pair, w = game.world;
    const taken = game.enemies.some((o) => o !== this && !o.dead && o.kind === 'seer' && o.state === 'cast' && o.rune && !o.byEar && hyp(o.rune.x - g.x, o.rune.y - g.y) < P.apart * TILE);
    if (!P || !taken) return { x: g.x, y: g.y };
    const T0 = this.cfg.castWind * game.mods.enemySlow * P.lead, sp = hyp(g.vx || 0, g.vy || 0);
    let ox, oy;
    if (sp > 20) { const k = Math.min(sp * T0, P.maxLead * TILE) / sp; ox = g.vx * k; oy = g.vy * k; }
    else {
      const o = game.enemies.find((q) => q !== this && q.kind === 'seer' && q.state === 'cast' && q.rune);
      const a = Math.atan2(g.y - this.y, g.x - this.x) + (o && Math.sin(Math.atan2(o.rune.y - g.y, o.rune.x - g.x) - Math.atan2(g.y - this.y, g.x - this.x)) > 0 ? -1 : 1) * Math.PI / 2;
      ox = Math.cos(a) * P.apart * TILE; oy = Math.sin(a) * P.apart * TILE;
    }
    // never into stone: pulled back toward him a quarter at a time
    for (let f = 1; f > 0; f -= 0.25) { const x = g.x + ox * f, y = g.y + oy * f; if (w.tileAtPx(x, y) !== T.WALL) return { x, y }; }
    return { x: g.x, y: g.y };
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
      // THE YARD's last mage from his third meeting: the rune goes on out over the room in rings (js/endboss.js, js/waves.js).
      if (this.endRings) Waves.rings(game, this.rune.x, this.rune.y, this.endRings);
      game.flash(PALETTE.witch, 0.14);
      w.emitNoise(this.rune.x, this.rune.y, TUNING.noise.rune, 'cult');   // his own fire: THE DARK's cult does not hunt it
      game.audio.sfxRune(); game.shake(5);
    }
    this.rune = null; this.castCd = cfg.castCooldown * game.mods.enemySlow;
  }

  // `cfg` lends the reach and the wait (the corrupted rifleman's, js/endboss.js); the mage's own otherwise.
  blink(game, cfg = this.cfg) {
    const w = game.world, g = game.goat;
    // A sealed arena's doors open when the room is empty and not before, so a mage shut in one may
    // not leave it: blinking out through the wall left him alive on the far side of a door nothing
    // could open, with the goat locked in behind it and the level unfinishable.
    const seal = game.sealHolding(this);
    // And short of a seal, he still may not land somewhere the fight has already left behind: a
    // blink close to a doorway could put him a room back the way the goat came, alive in ground
    // that reads as cleared. `curRoom` is whatever room the goat is standing in right now, a
    // corridor answers with nothing, and nothing here restricts a blink from one.
    const curRoom = roomAt(game.level, g.x, g.y);
    let best = null;
    for (let k = 0; k < 24; k++) {
      const a = Math.random() * Math.PI * 2, r = cfg.blinkDist * TILE * (0.7 + Math.random() * 0.6);
      const nx = g.x + Math.cos(a) * r, ny = g.y + Math.sin(a) * r;
      if (w.tileAtPx(nx, ny) === T.WALL) continue;
      if (w.flowDist(nx, ny) < 0) continue;
      if (seal && !game.inSeal({ x: nx, y: ny }, seal)) continue;
      if (curRoom && (nx < curRoom.x * TILE || nx >= (curRoom.x + curRoom.w) * TILE
          || ny < curRoom.y * TILE || ny >= (curRoom.y + curRoom.h) * TILE)) continue;
      // Blinking out of a fight and into his own fire was the one thing that read as the rune not
      // counting for him. He lands on ground that is neither alight nor about to be, or not at all.
      if (w.isBurningPx(nx, ny) || w.isPitPx(nx, ny)) continue;
      if (this.hazardAt(game, nx, ny)) continue;
      // Never in a doorway, and never anywhere the goat cannot see from where he stands: a blink onto
      // the tile of the stairs' gate had the door push him out on its far side, alive behind the bars
      // with the soul that lifts them (playtest, 30 Sep 2026: "he teleported behind the fence").
      if (game.props.some((p) => p.kind === 'door' && !p.broken && Math.abs(p.x - nx) < TILE * 1.5 && Math.abs(p.y - ny) < TILE * 1.5)) continue;
      if (!game.sees(g.x, g.y, nx, ny)) continue;
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
  // knees for long enough to be hit, which is where every heart he has comes from.
  updateButcher(dt, game, sees) {
    const g = game.goat, cfg = this.cfg, L = cfg.leap, S = cfg.slam;
    this.slamCd = Math.max(0, this.slamCd - dt);
    if (this.state === 'idle') { this.idleWander(dt, game); return; }
    if (this.state === 'investigate') { this.investigate(dt, game); return; }
    const d = hyp(g.x - this.x, g.y - this.y);
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
        this.landOnTeeth(game);
        if (this.soul) Waves.land(game, this);   // a corrupted ogre met again: rings of witchfire (js/waves.js)
      }
      return;
    }
    if (this.state === 'slamwind') {
      this.vx = 0; this.vy = 0; this.facing = Math.atan2(g.y - this.y, g.x - this.x); this.timer -= dt;
      if (this.timer <= 0) { this.state = 'recover'; this.timer = S.recover * game.mods.enemySlow; this.quake(game, S, S.range * TILE); if (this.soul) Waves.slam(game, this); }
      return;
    }
    if (this.state === 'hopland' || this.state === 'recover') { this.vx = 0; this.vy = 0; this.timer -= dt; if (this.timer <= 0) this.state = 'chase'; return; }
    this.state = 'chase';
  }

  // The butcher's hook (30 Sep 2026, in place of his charge, which a pillar or a table stopped more
  // often than the goat did), run from `updateBearer`: the windup, the throw, the pull and the reel
  // home. Returns true while any of it has the frame; false hands it back to the chase and the swing.
  // He walks, he swings close, and at mid range he hooks: `TUNING.champion.hook`.
  hookStep(dt, game, sees) {
    const g = game.goat, H = TUNING.champion.hook, slow = game.mods.enemySlow;
    if (this.state === 'hookwind') {
      // Planted, the hook swinging round: the line on the floor follows where the goat is going, and
      // where it points when the timer runs out is where the hook goes. From then on it is a thing in
      // the air on a straight line, and only a goat who turns off that line is not on the end of it.
      this.vx = 0; this.vy = 0; this.timer -= dt;
      const aim = this.hookAim = this.hookLead(game);
      this.facing = Math.atan2(aim.y - this.y, aim.x - this.x);
      if (this.timer <= 0) this.throwHook(game, aim);
      return true;
    }
    if (this.state === 'hookthrow') { this.vx = 0; this.vy = 0; this.flyHook(dt, game); return true; }
    if (this.state === 'hookpull') { this.vx = 0; this.vy = 0; this.pullHook(dt, game); return true; }
    if (this.state === 'hookreel') {
      // A miss is reeled home at `reel` before he can do anything else: the recovery he eats.
      this.vx = 0; this.vy = 0;
      const h = this.hook;
      const hx = h ? this.x - h.x : 0, hy = h ? this.y - h.y : 0, hd = hyp(hx, hy), step = H.reel * dt;
      if (!h || hd <= step + this.r) { this.hook = null; this.state = 'recover'; this.timer = H.recover * slow; }
      else { h.x += hx / hd * step; h.y += hy / hd * step; }
      return true;
    }
    if (this.state !== 'chase' || !sees || g.dead || this.hookCd > 0 || this.poison > 0) return false;
    const d = hyp(g.x - this.x, g.y - this.y);
    if (d < H.min * TILE || d > H.max * TILE || game.hidden(this.x, this.y)) return false;
    // A goat already on his back (the pen, another hook) or going over an edge is left to it.
    if (!Enemy.hookable(g) || !this.hookLine(game, g.x, g.y)) return false;
    this.state = 'hookwind'; this.timer = H.wind * slow; this.vx = 0; this.vy = 0;
    this.hookAim = this.hookLead(game); this.facing = Math.atan2(this.hookAim.y - this.y, this.hookAim.x - this.x);
    const at = game.audio.heard(this.x - g.x, this.y - g.y);
    game.audio.sfxClatter('metal', 0.6 * at.vol, at.pan);
    game.bark(this, 'attack', 0.3);
    return true;
  }
  // The shieldman's leap (2 Oct 2026, the user's: "when he is close, he jumps with his shield in front";
  // `TUNING.shieldman.bash`). Seen `min`..`max` tiles off, facing near enough at him, off `bashCd`, he
  // crouches behind the board (`bashwind`, the strip he will cover laid amber, `Renderer.drawBashLine`),
  // still turning after the goat at the board's pace, then throws himself along his facing (`bash`).
  // The goat met is hit by the horns (a shield in his mouth takes it as it takes a club); a man of his own
  // in the way is bowled over and said sorry to; stone sits him down dazed. Landed or missed, he is planted
  // `recover` s after it and cannot turn (`bashPlant`, `update`): the clunk the goat goes round in.
  bashStep(dt, game, sees) {
    const B = TUNING.shieldman.bash, g = game.goat, slow = game.mods.enemySlow;
    if (this.state === 'bashwind') {
      this.vx = 0; this.vy = 0; this.timer -= dt;
      if (!g.dead) this.facing = Math.atan2(g.y - this.y, g.x - this.x);
      if (this.timer <= 0) {
        this.state = 'bash'; this.timer = B.time; this.bashHit = false;
        game.audio.sfxSwing(); game.world.emitNoise(this.x, this.y, TUNING.noise.swing, 'cult');
        game.bark(this, 'bash', 0.5);
      }
      return true;
    }
    if (this.state === 'bash') {
      this.timer -= dt;
      const ux = Math.cos(this.facing), uy = Math.sin(this.facing), ox = this.x, oy = this.y;
      this.vx = ux * B.speed; this.vy = uy * B.speed;
      this.x += this.vx * dt; this.y += this.vy * dt; game.world.collideCircle(this);
      const end = () => { this.state = 'recover'; this.timer = B.recover * slow; this.bashPlant = true; this.bashCd = B.cd * slow; this.vx = 0; this.vy = 0; };
      if (!this.bashHit && !g.dead && !game.hidden(this.x, this.y) && hyp(g.x - this.x, g.y - this.y) < this.r + g.r + B.reach) {
        this.bashHit = true;
        if (!Talisman.parry(game, this, 'club') && !g.blockBlow(game, this, false)) g.damage(B.damage, game, ux * B.knock, uy * B.knock, false, this);
        game.audio.sfxThud(); game.hitstop(0.04);
        end(); return true;
      }
      // one of his own in the way: bowled over, and he is sorry about it
      for (const o of game.liveEnemies) {
        if (o === this || o.dead || o.held || o.state === 'flung' || o.unliftable || o.ghosted) continue;
        if (hyp(o.x - this.x, o.y - this.y) > this.r + o.r + 2) continue;
        o.fling(ux * B.bowl * o.knockMul(), uy * B.bowl * o.knockMul(), false); o.daze(game, 0.6);
        game.bark(this, 'sorry', 1);
      }
      // stone: he sits down on it, dazed, the board down
      if (hyp(this.x - ox, this.y - oy) < B.speed * dt * 0.4) {
        end(); this.dazed = Math.max(this.dazed, B.wallDaze * slow);
        game.audio.sfxThud(); game.shake(2); game.particles(this.x + ux * this.r, this.y + uy * this.r, 6, PALETTE.ashHi, 140);
        game.bark(this, 'bonk', 1);
        return true;
      }
      if (this.timer <= 0) end();
      return true;
    }
    if (this.state !== 'chase' || !sees || g.dead || this.bashCd > 0 || this.poison > 0) return false;
    const dx = g.x - this.x, dy = g.y - this.y, d = hyp(dx, dy);
    if (d < B.min * TILE || d > B.max * TILE || game.hidden(this.x, this.y) || !game.reaches(this.x, this.y, g.x, g.y)) return false;
    if (Math.abs(angleDiff(this.facing, Math.atan2(dy, dx))) > B.aim) return false;
    this.state = 'bashwind'; this.timer = B.wind * slow; this.vx = 0; this.vy = 0;
    game.bark(this, 'attack', 0.3);
    return true;
  }
  // Whether the goat is in a state a hook can take: on his feet and not tumbling (the roll's own
  // i-frames, and any other moment he cannot be hurt, go through the rope).
  static hookable(g) {
    if (g.dead || g.leap || g.invuln > 0) return false;
    return g.state !== 'roll' && g.state !== 'stunned' && g.state !== 'falling' && g.state !== 'ko' && g.state !== 'carried' && g.state !== 'tossed' && g.state !== 'shell';
  }
  // Stone and whatever stops a round stop the hook; his own men do not, it goes past them.
  hookLine(game, x, y) { return game.clearLine(this.x, this.y, x, y, game.props, 'stopsBullets', 2); }
  // Where the hook is aimed: where the goat will be when it gets there, off his own velocity and the
  // hook's flight time, the whole of it (`lead`), never more than `leadMax` tiles ahead, walked back
  // toward him until it is floor. At his own pace, so running on is running onto it.
  hookLead(game) {
    const g = game.goat, H = TUNING.champion.hook, w = game.world, cap = H.leadMax * TILE;
    let lx = 0, ly = 0;
    for (let k = 0; k < 3; k++) {
      const t = Math.max(0, len(g.x + lx - this.x, g.y + ly - this.y) - this.r) / H.speed * H.lead;
      lx = g.vx * t; ly = g.vy * t;
      const l = hyp(lx, ly); if (l > cap) { lx *= cap / l; ly *= cap / l; }
    }
    for (let s = 1; s > 0; s -= 0.25) {
      const x = g.x + lx * s, y = g.y + ly * s;
      if (w.walkableAt(Math.floor(x / TILE), Math.floor(y / TILE))) return { x, y };
    }
    return { x: g.x, y: g.y };
  }
  throwHook(game, aim) {
    const H = TUNING.champion.hook, dx = aim.x - this.x, dy = aim.y - this.y, d = hyp(dx, dy) || 1, ux = dx / d, uy = dy / d;
    this.state = 'hookthrow'; this.hookAim = null; this.hookCd = H.cooldown * game.mods.enemySlow;
    // `over` tiles past the aim point, so a goat a step slower than he was is still on the line.
    this.hook = { x: this.x + ux * this.r, y: this.y + uy * this.r, ux, uy, left: Math.min(d + H.over * TILE, (H.max + H.over) * TILE) - this.r, caught: null };
    game.audio.sfxSwing(); game.world.emitNoise(this.x, this.y, TUNING.noise.swing, 'cult');
  }
  // The hook in the air, in steps no longer than a few px: stone and furniture stop it, a loose crate
  // or bomb is caught, the goat is caught, and his own men are passed.
  flyHook(dt, game) {
    const H = TUNING.champion.hook, h = this.hook, g = game.goat, w = game.world;
    if (!h) { this.state = 'chase'; return; }
    const total = H.speed * dt, steps = Math.max(1, Math.ceil(total / H.step)), st = total / steps;
    for (let s = 0; s < steps; s++) {
      h.x += h.ux * st; h.y += h.uy * st; h.left -= st;
      if (w.isSolid(Math.floor(h.x / TILE), Math.floor(h.y / TILE))) { h.x -= h.ux * st; h.y -= h.uy * st; this.hookMiss(game, true); return; }
      if (hyp(g.x - h.x, g.y - h.y) < g.r + H.catchR && Enemy.hookable(g)) {
        // A shield facing him turns it like a round (a use spent); he is too far off to be staggered.
        if (g.shielded(this.x, this.y, true)) { g.blockBlow(game, this, false); this.hookMiss(game, false); return; }
        // A crate held toward him takes the hook instead and is torn out of his mouth.
        const c = g.holding;
        if (c && c.kind === 'crate' && !c.broken && g.covers(this.x, this.y, true)) { this.hookProp(game, c); return; }
        this.hookGoat(game); return;
      }
      for (const p of game.props) {
        if (p.broken || p.held || Math.abs(p.x - h.x) > p.r + H.propR || Math.abs(p.y - h.y) > p.r + H.propR) continue;
        if (hyp(p.x - h.x, p.y - h.y) > p.r + H.propR) continue;
        if ((p.kind === 'crate' && !p.noGrab) || p.kind === 'bomb') { this.hookProp(game, p); return; }
        if (p.stopsBullets) { this.hookMiss(game, true); return; }
      }
      if (h.left <= 0) { this.hookMiss(game, false); return; }
    }
  }
  hookMiss(game, clank) {
    const h = this.hook;
    if (clank && h) {
      const at = game.audio.heard(h.x - game.goat.x, h.y - game.goat.y);
      game.particles(h.x, h.y, 4, PALETTE.ochre, 90); game.audio.sfxClatter('metal', 0.8 * at.vol, at.pan);
    }
    this.state = 'hookreel';
  }
  // Caught: whatever was in his mouth is dropped (as the pen's stun drops it), he is off his feet
  // and the rope has him (`goat.hooked`, which `Goat.update`'s stunned branch pulls along).
  hookGoat(game) {
    const g = game.goat, H = TUNING.champion.hook, h = this.hook;
    if (g.holding) { const o = g.holding; g.holding = null; o.held = false; g.autoHeld = false; g.spendGrab(game, !o.item); if (!o.item) { o.fromMouth = false; o.state = 'floored'; o.timer = TUNING.champion.hook.dropFloor; } }
    g.state = 'stunned'; g.timer = H.pullMax + H.daze; g.hooked = this; g.vx = 0; g.vy = 0; g.runT = 0; g.runUp = 1;
    h.caught = g; h.x = g.x; h.y = g.y;
    this.state = 'hookpull'; this.timer = H.pullMax;
    game.audio.sfxSteel(); game.audio.sfxThud(); game.hitstop(0.05); game.vibe(30);
    game.particles(g.x, g.y - 6, 6, PALETTE.bone, 120);
    // no HOOKED word any more: a hook stands over his head while the rope has him (`Renderer.drawHookMark`)
    game.bark(this, 'attack', 0.5);
  }
  hookProp(game, p) {
    const g = game.goat, h = this.hook;
    if (p === g.holding) { g.holding = null; p.held = false; g.autoHeld = false; g.spendGrab(game, false); game.floatText(g.x, g.y - 30, 'TORN AWAY', PALETTE.bone); }
    p.vx = 0; p.vy = 0;
    h.caught = p; h.x = p.x; h.y = p.y;
    this.state = 'hookpull'; this.timer = TUNING.champion.hook.pullMax;
    game.audio.sfxClatter('metal', 0.8);
  }
  // Reeling in what the hook took. The goat is dragged by his own step (`Goat.update`); a thing is
  // drawn in here, down the line the hook flew, which was clear of stone.
  pullHook(dt, game) {
    const H = TUNING.champion.hook, h = this.hook, g = game.goat, c = h && h.caught, slow = game.mods.enemySlow;
    this.timer -= dt;
    if (!c) { this.endPull(game); return; }
    if (c === g) {
      if (g.dead || g.hooked !== this || g.state !== 'stunned') { this.endPull(game); return; }
      h.x = g.x; h.y = g.y; this.facing = Math.atan2(g.y - this.y, g.x - this.x);
      const close = hyp(g.x - this.x, g.y - this.y) <= this.atk('reach') + g.r - H.stopAt;
      if (!close && this.timer > 0) return;
      this.endPull(game);
      // Into his reach: the cleaver comes round on the ordinary windup, and the goat is on his feet
      // for most of it, the rope brings him to the blow, it does not land it.
      if (close) { this.state = 'windup'; this.timer = this.atk('windup') * slow; game.bark(this, 'attack', 0.25); }
      return;
    }
    if (c.broken || c.held) { this.endPull(game); return; }
    const px = this.x - c.x, py = this.y - c.y, pd = hyp(px, py) || 1, step = H.pull * dt;
    if (pd - step <= this.r + c.r + H.propGap || this.timer <= 0) { c.vx = 0; c.vy = 0; this.endPull(game); return; }
    c.x += px / pd * step; c.y += py / pd * step; c.vx = 0; c.vy = 0; h.x = c.x; h.y = c.y;
  }
  endPull(game) {
    const g = game.goat;
    if (g.hooked === this) { g.hooked = null; if (g.state === 'stunned') g.timer = Math.min(g.timer, TUNING.champion.hook.daze); g.vx *= 0.2; g.vy *= 0.2; }
    this.hook = null; this.state = 'recover'; this.timer = TUNING.champion.hook.recover * game.mods.enemySlow;
  }
  // The rope out of his hand for whatever reason that is not his own (a daze, a body, a blast, fire):
  // the goat on the end of it is let go, and the next throw waits its cooldown.
  dropHook(game) {
    const g = game.goat;
    if (g.hooked === this) { g.hooked = null; if (g.state === 'stunned') g.timer = Math.min(g.timer, TUNING.champion.hook.daze); }
    this.hook = null; this.hookAim = null;
    this.hookCd = Math.max(this.hookCd, TUNING.champion.hook.cooldown * game.mods.enemySlow);
    if (this.state === 'hookthrow' || this.state === 'hookpull' || this.state === 'hookreel') this.state = 'chase';
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
  // nearest him that he can see, the goat, or any man of the cult, and swings at it. He is never
  // idle and never investigates: he was made by being struck three times and he knows who did it,
  // so with nothing in sight he walks the flow field to the goat like a man in full pursuit. The
  // cult does not go for him; they go for you, which is the whole trick of him, walk him into a
  // room that is already full and let the room spend itself on him.
  // Where the next leap comes down: `hop.dist` tiles toward his prey if he can see it (short of it
  // if it is closer than that), down the flow field to the goat if not, walked back until the spot
  // and the line to it are floor, never into stone, never over a drop.
  hopSpot(game, target, td) {
    // The rat ogre's `hop` or the Butcher's `leap`: he comes down `short` tiles short of his prey
    // (on it, at 0), and with `over` a drop under the line is flown over, only the spot must be floor.
    const w = game.world, H = this.cfg.hop || this.cfg.leap, short = H.short != null ? H.short * TILE : this.cfg.reach * 0.6;
    let ax, ay, want = H.dist * TILE;
    if (target && td < Infinity) {
      ax = target.x - this.x; ay = target.y - this.y;
      want = Math.min(want, Math.max(TILE, td - short));
    } else {
      const f = w.flowDir(this.x, this.y);
      if (f) { ax = f.x; ay = f.y; } else { ax = game.goat.x - this.x; ay = game.goat.y - this.y; }
    }
    const l = hyp(ax, ay) || 1; ax /= l; ay /= l;
    // A shade inside what of him the stone pushes on (`wallR`): wall collision parks him exactly that
    // far off it, and probing at the full width read the wall he was leaning on, or the two sides of
    // a doorway one tile wide, which he squeezes through (`ai.path.squeeze`), as in the way of every leap.
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
    // Pinned, a corner, or a wall across the line to his prey: he used to crouch and leap on the
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
  // is caught on it: a heart for the rock, then `impale.time` s stuck where he stands, no leap, no
  // slam, no step, for whatever the room holds (a blade, fire, a thrown body). Before this he was
  // stuck by accident: every man steers off a spire, so standing on one he could not walk off it,
  // and it took a heart a second until he died. Now it is a window with an end.
  // Come down out of a leap with his whole body on teeth (9 Oct 2026 playtest: "when the ogre lands on spikes he takes
  // damage"): a spire under his feet's footprint (`impale.landR` px past touching), or a grate under him, which his weight
  // drives up at once. The spire's own touch only ever caught him on the goat's exact spot, which the goat never stands on.
  landOnTeeth(game) {
    const I = TUNING.cave.spikes.impale;
    if (this.dead || this.impaled > 0 || !I.kinds.includes(this.kind)) return;
    for (const p of game.props) {
      if (p.broken || p.dead) continue;
      const d = hyp(p.x - this.x, p.y - this.y);
      if (p.kind === 'spire' && d < this.r + p.r + I.landR) { this.spireAt = game.timer; this.impale(game, p); return; }
      if (p.kind === 'spike' && d < this.r * 0.6 + TILE * 0.5) {
        const S = TUNING.prop.spike;
        p.spikeState = 'up'; p.spikeT = S.up; p.bit = [this];
        game.audio.sfxCrack(); game.audio.sfxSteel(); game.particles(p.x, p.y, 6, PALETTE.wood, 150);
        this.spireAt = game.timer; this.impale(game, p); return;
      }
    }
  }
  impale(game, p) {
    const I = TUNING.cave.spikes.impale;
    this.vx = 0; this.vy = 0; this.hopZ = 0;
    game.world.splat(this.x, this.y, 0, 0, 14);
    game.particles(this.x, this.y, 14, PALETTE.blood, 170);
    game.hitstop(0.05); game.audio.sfxThud(); game.audio.sfxGrowl();
    if (this.hp <= 1) { this.die(game, 'spire'); return; }
    this.hp -= 1; this.flash = 0.3; this.aware = true;
    this.impaled = I.time * game.mods.enemySlow; this.impaleOn = p;
    game.floatText(this.x, this.y - 44, 'STUCK', PALETTE.fireHi);
  }
  // What a flung body finds on the wall it flies at (gen.js `dressWall`, `game.wallArt`). A suit of
  // armour he flies into or lands by, any flung body within `near` px past touching it, however slow
  // (a body only stays flung while it is still travelling), comes apart and he flies on. A stag's
  // head he meets, flying at its wall past `trophy.hit` within `hitR` of it, takes him on its tines
  // (`antlers`): true, and his step is over. A wraith has nothing to catch.
  wallDressing(game, vx, vy, speed) {
    const A = TUNING.prop.armor, Tr = TUNING.prop.trophy;
    for (const p of game.wallArt) {
      if (p.kind === 'armor' || p.kind === 'suit') {
        if (!p.spilled && hyp(this.x - p.x, this.y - p.y) < this.r + p.r + A.near) {
          p.burstArmor(game, vx, vy, clamp(speed / (8 * TILE), 0.5, 1.4));
          this.vx *= A.slow; this.vy *= A.slow;
        }
        continue;
      }
      if (p.kind === 'poster') {
        if (!p.torn && hyp(this.x - p.x, this.y - p.y) < this.r + p.r + TUNING.prop.poster.near) p.tear(game, vx, vy);
        continue;
      }
      if (p.kind !== 'trophy' || p.spent || this.kind === 'wraith') continue;
      const foot = Math.floor(p.y / TILE) * TILE;
      if (-vy < Tr.hit || Math.abs(this.x - p.x) > Tr.hitR || this.y - foot > this.r + Tr.reach || this.y < foot) continue;
      this.antlers(game, p);
      return true;
    }
    return false;
  }
  // Caught on the antlers (`TUNING.prop.trophy`), whatever speed the wall alone would have wanted: a
  // one-heart man dies there and hangs on the wall (`die` sees `hung`, the trophy draws him); a man
  // with hearts to spare loses one and is pinned `time` s (`impaledStep`), then tears free. A fused
  // man is the bomb he was always going to be. The trophy is spent either way.
  antlers(game, p) {
    const Tr = TUNING.prop.trophy, foot = Math.floor(p.y / TILE) * TILE;
    p.spent = true; p.bleedT = 0;
    this.x = p.x; this.y = foot + this.r + 1; this.vx = 0; this.vy = 0;
    this.flung = false; this.thrown = false; this.fromMouth = false;
    if (this.bombFuse > 0 && !this.exploded) { this.explode(game); return; }
    game.world.splat(this.x, this.y + 3, 0, 1, 10);
    game.particles(this.x, this.y - Tr.lift, 12, PALETTE.blood, 150);
    game.hitstop(0.06); game.audio.sfxThud(); game.kick(0, -1, TUNING.juice.kick * 0.5);
    if (this.hp > 1) {
      this.hp -= 1; this.flash = 0.3; this.aware = true; this.state = 'stagger'; this.timer = 0;
      this.impaled = Tr.time * game.mods.enemySlow; this.impaleOn = p; this.pin = { x: this.x, y: this.y };
      game.floatText(this.x, this.y - 44 - Tr.lift, 'STUCK', PALETTE.fireHi);
      game.audio.sfxGrowl();
      return;
    }
    this.hung = p;
    this.die(game, 'splat', 0, -1, 'antlers');
  }
  impaledStep(dt, game) {
    const I = TUNING.cave.spikes.impale, p = this.impaleOn;
    // Pinned to a stag's head: held up on the wall where he struck it, and pulled off it by the goat's
    // teeth (BY THE COLLAR) as surely as by his own strength.
    if (p && p.kind === 'trophy') {
      this.impaled -= dt; this.vx = 0; this.vy = 0;
      if (this.pin && !this.held) { this.x = this.pin.x; this.y = this.pin.y; }
      if (Math.random() < dt * 5) game.particles(this.x, this.y - TUNING.prop.trophy.lift, 1, PALETTE.blood, 40);
      if (this.impaled > 0 && !this.held) return;
      this.impaled = 0; this.impaleOn = null; this.pin = null;
      if (this.held) return;
      this.y += p.r + 4; game.world.collideCircle(this);
      this.state = 'stagger'; this.timer = TUNING.prop.trophy.free * game.mods.enemySlow; this.aware = true;
      game.floatText(this.x, this.y - 44, 'RRAAGH', PALETTE.blood); game.audio.sfxGrowl();
      game.dust(this.x, this.y, 6, 0, 1);
      return;
    }
    this.impaled -= dt; this.vx = 0; this.vy = 0;
    if (Math.random() < dt * 4) game.particles(this.x, this.y + this.r * 0.3, 1, PALETTE.blood, 50);
    if (this.impaled > 0) return;
    // He tears himself off: a step clear of the teeth, spared them while he walks away.
    this.impaled = 0; this.impaleOn = null;
    if (p) {
      let dx = this.x - p.x, dy = this.y - p.y, d = hyp(dx, dy);
      if (d < 1) { dx = game.goat.x - p.x; dy = game.goat.y - p.y; d = hyp(dx, dy) || 1; }
      const out = p.r + this.r * 0.7 + 2;
      if (d < out) { this.x = p.x + dx / d * out; this.y = p.y + dy / d * out; game.world.collideCircle(this); }
    }
    // The teeth read `spireAt` as "last bitten", sparing him `again` s after it: less that, so the
    // spare is `clear` s from here as tuned, not `clear + again`.
    this.spireAt = game.timer + I.clear - TUNING.cave.spikes.again;
    this.state = 'stagger'; this.timer = I.free * game.mods.enemySlow; this.aware = true;
    game.floatText(this.x, this.y - 44, 'RRAAGH', PALETTE.blood); game.audio.sfxGrowl();
    game.dust(this.x, this.y, 8, 0, 0);
  }

  // He comes down. Everything in the ring is struck the way his arm strikes: the goat hurt and
  // thrown clear, a man of the cult hurt and flung.
  hopLand(game) {
    const H = this.cfg.hop, g = game.goat, R = H.radius * TILE;
    this.hopZ = 0; this.state = 'hopland'; this.timer = H.land * game.mods.enemySlow; this.vx = 0; this.vy = 0;
    this.landOnTeeth(game);
    game.thud(this.x, this.y, 8); game.hitstop(0.03); game.audio.sfxThud(); game.vibe(24);
    game.ring(this.x, this.y, R, PALETTE.blood, 0.4, 4); game.dust(this.x, this.y, 12, 0, 0);
    game.world.emitNoise(this.x, this.y, TUNING.noise.swing, 'cult');
    if (game.hidden(this.x, this.y)) return;
    if (!g.dead) {
      const dx = g.x - this.x, dy = g.y - this.y, d = hyp(dx, dy);
      if (d < R + g.r && !g.blockBlow(game, this, false)) g.damage(H.damage, game, dx / (d || 1) * H.knock * 4, dy / (d || 1) * H.knock * 4, false, this);
    }
    for (const e of game.enemies) {
      if (e === this || e.dead || e.held || e.ghosted || e.state === 'flung' || e.kind === 'ratogre') continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = hyp(dx, dy);
      if (d < R + e.r) game.ogreHits(e, dx / (d || 1), dy / (d || 1), this);
    }
  }
  updateOgre(dt, game, sees) {
    const g = game.goat, cfg = this.cfg, w = game.world;
    if (this.state === 'emerge') { this.vx = 0; this.vy = 0; this.timer -= dt; if (this.timer <= 0) { this.state = 'chase'; this.aware = true; } return; }
    if (this.state === 'idle' || this.state === 'investigate' || this.state === 'noticed') { this.state = 'chase'; this.aware = true; }
    let target = null, td = Infinity;
    if (!g.dead) { target = g; td = hyp(g.x - this.x, g.y - this.y); if (!sees && !w.los(this.x, this.y, g.x, g.y)) td = Infinity; }
    for (const e of game.enemies) {
      if (e === this || e.dead || e.held || e.ghosted || e.scripted || e.kind === 'ratogre') continue;
      const d = hyp(e.x - this.x, e.y - this.y);
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
      const to = this.hopSpot(game, target, td);
      // Once a blow has told him, he does not leap into the wheel's sweep or a fire again (6 Oct 2026
      // playtest: "the ogre by the trap is smarter, hurt once he does not jump a second time"): he
      // waits a beat and looks for another spot instead of a landing on the trap.
      if (this.hp < this.maxHp && (game.world.isBurningPx(to.x, to.y) || game.props.some((m) => m.kind === 'mill' && !m.broken && hyp(m.x - to.x, m.y - to.y) < TUNING.mill.armLen + this.r + TUNING.ai.millClear))) {
        this.hopCd = (this.hopCd || 0) + dt;
        if (this.hopCd > 1.2) { this.hopCd = 0; this.facing = Math.atan2(g.y - this.y, g.x - this.x); }   // looks at it, does not go
        return;
      }
      this.hopFrom = { x: this.x, y: this.y }; this.hopTo = to;
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
