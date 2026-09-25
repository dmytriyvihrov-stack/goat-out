// Goat (player), props (brazier, crate, bell, door, table, lamp, stands of arms) and bullets.
class Goat {
  constructor(x, y) {
    const g = TUNING.goat;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.r = g.radius;
    this.hp = g.hp; this.maxHp = g.hp; this.dead = false;   // overwritten by applyBoons on spawn
    this.aim = { x: 1, y: 0 }; this.facing = 0;
    this.state = 'idle'; this.timer = 0; this.lungeId = 0; this.recoverMax = 0;   // set fresh on every 'recover' entry; see render.js drawSkills
    this.holding = null; this.holdTimer = 0;
    this.screamCd = 0; this.screaming = 0; this.invuln = 0; this.fireTick = 0; this.onFire = false; this.witchFire = false;
    this.hoofTimer = 0; this.kind = 'goat';
    this.stepNoiseTimer = 0;   // running footsteps: a timer, not a coin flip — see js/tuning.js noise.footstepGap
    this.rollCd = 0; this.rollSpin = 0; this.rollDir = { x: 1, y: 0 }; this.rollHit = null; this.grabCd = 0;
    this.grabCdMax = 0;    // what the last grab cost (a man costs more than a thing), for the rail's drain
    this.biting = null;    // the man his teeth are going under, while `state` is 'bite'
    this.rollCdMax = 0;    // what the last roll cost, which a LEAPFROG vault doubles, for the rail's drain
    this.leap = null;      // LEAPFROG: { e, x, y, t, time, h, over } while he is in the air over a man
    this.trail = [];       // ghost positions for the speed smear
    this.trailTimer = 0;
    this.gong = 0;         // seconds of the bell still ringing in him: fast hooves and quick hands
    this.holdLimit = 0;    // how long the man in his mouth will take to work loose, rolled per grab
    this.dazed = 0;        // stars over its head: the club in the opening scene, nothing else yet
    this.jitter = null;    // a tremble the opening scene puts on it; drawn, never simulated
    this.safeX = x; this.safeY = y;   // the last floor he stood on, which is where a fall returns him
    this.safeTrail = [];   // a few seconds of where that was, so a fall can hand back a point with
                            // room behind it rather than the exact board his hoof was leaving
    this.landed = true;    // a fall resolves its landing once; see Game.updateFall
    this.runT = 0; this.runUp = 1;    // seconds of running without a break, and what they are worth
    this.autoHeld = false; // the thing in his mouth walked into it: a butt drops it, a press throws it
    this.rmbWas = false;   // grab last frame, so the press can be told from the holding
    this.fussCd = 0;       // holding rmb near a hound used to repaint TOO QUICK every single frame
    this.itemCd = 0; this.itemCdMax = 0;   // Q: whichever verb artifact is at his neck, its own clock
  }

  update(dt, game) {
    const g = TUNING.goat, inp = game.input, world = game.world;
    this.aim = inp.aim;
    // The one press of grab, rather than the holding of it. An arm that came into his mouth on its
    // own was never picked up by a button, so there is no button to let go of: a press throws it.
    const rmbEdge = inp.rmbDown && !this.rmbWas;
    this.rmbWas = inp.rmbDown; this.rmbEdgeNow = rmbEdge;   // `tryGrab` reads the press, not the hold, for buying a ware
    // The gong is still ringing in his head: everything he has to wait for comes back half again
    // as fast, and so does he. It runs down whatever he is doing, stunned included.
    this.gong = Math.max(0, this.gong - dt);
    // GOAT COOLDOWN (dev drawer, `game.dev.tune`): × 2 is every wait twice as long. At 1, nothing.
    const DT = game.dev && game.dev.tune;
    const cdRate = (this.gong > 0 ? TUNING.prop.bell.cooldownMul : 1) / (DT ? DT.goatCd : 1);
    this.screamCd = Math.max(0, this.screamCd - dt * cdRate); this.screaming = Math.max(0, this.screaming - dt);
    this.grabCd = Math.max(0, this.grabCd - dt * cdRate);
    this.fussCd = Math.max(0, this.fussCd - dt);
    this.invuln = Math.max(0, this.invuln - dt); this.dazed = Math.max(0, this.dazed - dt);
    // Anything that took him out of the tumble (a stun, the stairs, a death) took him out of the air.
    if (this.leap && this.state !== 'roll') this.leap = null;
    // And anything that took him out of the bite (a blow, a roll, a stun) let go of the man.
    if (this.biting && this.state !== 'bite') this.biting = null;
    // A press a beat early is kept, not dropped (`goat.buffer`): a headbutt asked for while he is
    // busy, a roll asked for while he cannot roll yet. Spent below the frame he can.
    const busy = this.state !== 'idle', canRoll = this.rollCd <= 0 && this.state !== 'lunge' && this.state !== 'roll' && this.state !== 'rollrecover';
    this.buttBuf = inp.lmbPressed && busy ? g.buffer : Math.max(0, (this.buttBuf || 0) - dt);
    this.rollBuf = inp.rollPressed && !canRoll ? g.buffer : Math.max(0, (this.rollBuf || 0) - dt);
    const buttAsk = inp.lmbPressed || this.buttBuf > 0, rollAsk = inp.rollPressed || this.rollBuf > 0;

    // Over the edge. Nothing but the fall until the game puts him back on the boards.
    if (this.state === 'falling') { this.vx *= 0.82; this.vy *= 0.82; this.timer -= dt; return; }

    // Off his feet. Nothing but the floor until it passes: no verbs, no aim, no momentum.
    // The pen is the only thing that does this to him, twice on the way out of it.
    if (this.state === 'stunned') {
      this.timer -= dt; this.vx *= 0.86; this.vy *= 0.86; this.runT = 0; this.runUp = 1;
      this.x += this.vx * dt; this.y += this.vy * dt; world.collideCircle(this);
      if (this.timer <= 0) this.state = 'idle';
      return;
    }

    // ---- clumsy sideways roll ----
    const R = TUNING.goat.roll;
    this.rollCd = Math.max(0, this.rollCd - dt * cdRate);
    if (rollAsk && game.mods.roll && this.rollCd <= 0 && this.state !== 'lunge' && this.state !== 'roll' && this.state !== 'rollrecover' && !this.dead) {
      this.rollBuf = 0;
      // LEAPFROG: a man in front and clear floor behind him turns the tumble into a vault over his
      // back. Nobody there, and it is the ordinary roll at the ordinary price.
      const L = game.mods.leapfrog, leap = L ? this.leapTarget(game, inp.mx, inp.my) : null;
      this.rollDir = leap ? leap.dir : this.rollDirection(game, inp.mx, inp.my); this.rollSpin = 0;
      this.state = 'roll'; this.timer = leap ? L.time : R.duration;
      this.rollCd = this.rollCdMax = R.cooldown * game.mods.rollCooldown * (leap ? L.cooldownMul : 1);
      this.vx = this.rollDir.x * R.speed * game.mods.rollDistance;
      this.vy = this.rollDir.y * R.speed * game.mods.rollDistance;
      this.leap = leap ? { e: leap.e, x: leap.x, y: leap.y, t: 0, time: L.time, h: L.height, over: false, at: L.over,
        vx: (leap.x - this.x) / L.time, vy: (leap.y - this.y) / L.time } : null;
      if (this.leap) { this.vx = this.leap.vx; this.vy = this.leap.vy; }
      this.invuln = Math.max(this.invuln, R.invuln);
      if (this.holding) {
        const h = this.holding; this.holding = null; h.held = false; this.autoHeld = false;
        if (!h.item) { h.state = 'floored'; h.timer = 0.5; }
        this.spendGrab(game, !h.item);
      }
      game.audio.sfxRoll(); game.audio.musicEvent('roll'); world.emitNoise(this.x, this.y, TUNING.noise.swing); game.vibe(12);
      game.particles(this.x, this.y, 9, PALETTE.ash, 150);
      game.dust(this.x, this.y, TUNING.juice.dust.roll, -this.rollDir.x, -this.rollDir.y);
      // DEAD WEIGHT: the list of who this tumble has already been through. No list, no soul.
      this.rollHit = game.mods.rollStun > 0 ? [] : null;
      if (this.rollHit) game.ring(this.x, this.y, R.stunR * 1.4, PALETTE.bone);
    }
    if (this.state === 'roll') {
      this.timer -= dt; this.rollSpin += dt * 16;
      // In the air over a man: a steady line to the spot behind him, whatever a knock tries to add,
      // and at the top of it his back takes the hooves. He reels; nothing about it kills.
      const lp = this.leap;
      if (lp) {
        lp.t += dt; this.vx = lp.vx; this.vy = lp.vy; this.rollSpin = 0;
        if (!lp.over && lp.t >= lp.time * lp.at) {
          lp.over = true;
          const e = lp.e;
          if (!e.dead && !e.held && !e.ghosted) {
            e.daze(game, game.mods.leapfrog.daze);
            game.particles(e.x, e.y - 10, 7, PALETTE.bone, 130); game.dust(e.x, e.y, TUNING.juice.dust.land, lp.vx, lp.vy);
            game.audio.sfxVault(); game.vibe(12);
          }
        }
      }
      // A goat going over sideways at speed is a thing that happens to whoever is standing there:
      // everything the tumble passes through loses its head for a moment, once per roll.
      if (this.rollHit) {
        for (const e of game.enemies) {
          if (e.dead || e.held || e.ghosted || this.rollHit.indexOf(e) >= 0) continue;
          if (Math.hypot(e.x - this.x, e.y - this.y) > R.stunR + e.r) continue;
          this.rollHit.push(e); e.daze(game, game.mods.rollStun);
          game.particles(e.x, e.y - 6, 5, PALETTE.bone, 120); game.audio.sfxThud(); game.vibe(10);
        }
      }
      if (this.timer <= 0) {
        // He lands and has to get up: the stride he had built is gone with the tumble (pillar 4).
        this.state = 'rollrecover'; this.timer = R.recover; this.vx *= 0.22; this.vy *= 0.22; this.runT = 0;
        if (this.leap) { this.leap = null; this.vx *= 0.5; this.vy *= 0.5; }   // a vault lands on four feet, not in a slide
        game.dust(this.x, this.y, TUNING.juice.dust.land, 0, 0); game.squashGoat(TUNING.juice.squash.land);
        // SOUR TUMBLE: he gets up out of a spray of it.
        if (game.mods.venomRoll) Status.puddle(game, this.x, this.y, TUNING.status.tumble.half);
      }
    } else if (this.state === 'rollrecover') {
      this.timer -= dt; if (this.timer <= 0) this.state = 'idle';
    }

    // ---- the run-up ----
    // Seconds of asking for most of a stride, turned into top speed. It builds while he runs and
    // drains several times faster than it built the moment he stops, so a room you cross without
    // touching anything hands you the far side of it faster than a room you fight your way through.
    const M = g.momentum, asking = Math.hypot(inp.mx, inp.my) >= M.atLeast;
    const mt = M.time * Talisman.runUpTime(game);   // BRASS SPUR builds it faster
    this.runT = clamp(asking ? this.runT + dt : this.runT - dt * M.lose, 0, mt);
    this.runUp = 1 + M.max * (this.runT / mt);

    // ---- movement (momentum) ----
    // A man on your back is most of your stride. A blade in your teeth is barely any of it, which
    // is what lets an arm be something you take in passing instead of something you commit to.
    let mul = this.holding ? (this.holding.item ? g.grab.itemSpeedMul : g.grab.speedMul) : 1;
    if (this.state === 'recover') mul *= 0.55;
    else if (this.state === 'windup') mul *= 0.3;
    else if (this.state === 'bite') mul *= g.grab.biteMove;
    else if (this.state === 'rollrecover') mul *= TUNING.goat.roll.recoverMove;
    const base = g.speed * game.mods.speed * this.runUp * (this.gong > 0 ? TUNING.prop.bell.speedMul : 1) * Talisman.speedMul(game);
    const top = base * mul;
    if (this.state !== 'lunge' && this.state !== 'roll') {
      const moving = inp.mx !== 0 || inp.my !== 0;
      const tx = inp.mx * top, ty = inp.my * top;
      // How the hooves meet the floor (`goat.feel`): asking against the way he is already going
      // bites harder, and a start, a stop and a reversal each get a beat the eye can read.
      const F = g.feel, sp0 = Math.hypot(this.vx, this.vy), mlen = Math.hypot(inp.mx, inp.my) || 1;
      const along = sp0 > 1 ? (this.vx * inp.mx + this.vy * inp.my) / (sp0 * mlen) : 1;
      // Only his own run: the drift of a recovery or a knockback is not his to brake (pillar 4).
      const reverse = moving && this.state === 'idle' && along <= F.skid.dot;
      const rate = (moving ? base / g.accel : base / g.decel) * Talisman.gripMul(game, this) * (reverse ? F.turnGrip : 1);
      this.skidCd = Math.max(0, (this.skidCd || 0) - dt);
      if (this.state === 'idle') {
        if (reverse && sp0 > top * F.skid.at && this.skidCd <= 0) {
          this.skidCd = F.skid.gap; game.squashGoat(F.skid.squash); game.dust(this.x, this.y, F.skid.dust, this.vx, this.vy);
        } else if (moving && !this.wasMoving && sp0 < top * F.kick.from) {
          game.squashGoat(F.kick.squash); game.dust(this.x, this.y, F.kick.dust, -inp.mx, -inp.my);
        } else if (!moving && this.wasMoving && sp0 > top * F.stop.at) game.squashGoat(F.stop.squash);
      }
      this.wasMoving = moving;
      const dx = tx - this.vx, dy = ty - this.vy, d = Math.hypot(dx, dy);
      const step = rate * dt;
      const vx0 = this.vx;
      if (d <= step) { this.vx = tx; this.vy = ty; } else { this.vx += dx / d * step; this.vy += dy / d * step; }
      if (moving && !this.holding) this.facing = Math.atan2(this.vy, this.vx);   // carrying, he faces his aim (below)
      // The lean the renderer draws: into a change of pace across the screen, and a little forward
      // at a full stride. Smoothed, so it reads as weight rather than a jerk.
      const want = clamp((this.vx - vx0) / Math.max(1e-4, (base / g.accel) * dt), -1, 1) * F.lean + clamp(this.vx / Math.max(1, top), -1, 1) * F.run;
      this.lean = lerp(this.lean || 0, want, 1 - Math.exp(-F.leanRate * dt));
    } else this.lean = lerp(this.lean || 0, 0, 1 - Math.exp(-g.feel.leanRate * dt));
    // With something in his mouth he faces his aim, running or standing, and swings round to it in
    // real time (COLD EYE slows the world, not his neck): what is in his teeth points where it will
    // be thrown and where a shield covers. Facing the way he ran, it only came round once he had
    // stopped, and turning with a crate felt like turning in treacle (playtest, 25 Sep 2026).
    if (this.holding && (this.state === 'idle' || this.state === 'recover')) {
      const want = Math.atan2(this.aim.y, this.aim.x), d = angleDiff(this.facing, want);
      const k = g.carry.turn * dt / Math.max(0.1, game.timeScale || 1);
      this.facing = want - d + clamp(d, -k, k);
    } else if (Math.hypot(this.vx, this.vy) > 40) this.facing = Math.atan2(this.vy, this.vx);
    // Standing still he turns his head to where you are pointing. The sprite is the only thing on
    // screen that says which way he is looking, and on the Ossuary which way he is looking is the
    // whole fight — so standing still had to be a way of turning, not a way of freezing.
    else if (this.state === 'idle' || this.state === 'recover') {
      const want = Math.atan2(this.aim.y, this.aim.x), d = angleDiff(this.facing, want);
      this.facing += clamp(d, -g.turn * dt, g.turn * dt);
    }
    if (this.state === 'lunge' || this.state === 'windup') this.facing = Math.atan2(this.aim.y, this.aim.x);
    if (this.state === 'roll') this.facing = Math.atan2(this.rollDir.y, this.rollDir.x);

    // ---- headbutt state machine ----
    // Anything in his mouth leaves it on either button: a thing held is a thing thrown, and which
    // hand you throw it with is not a decision worth making. A blade cannot be swung with the
    // teeth, a crate is ammunition, and the bash button used to either drop one at his feet or do
    // nothing at all depending on how it got there — so the press that would have been a headbutt
    // launches whatever he is holding instead. A man is not an object and is not covered here: he
    // goes where he always went, on grab.
    if (buttAsk && this.state === 'idle' && this.holding && this.holding.item) {
      this.buttBuf = 0;
      this.throwHeld(game);
    } else if (buttAsk && this.state === 'idle' && !this.holding) {
      this.buttBuf = 0;
      // GOAT ATTACK (dev drawer) divides the windup here, the lunge below and the recovery through
      // `mods.headbuttRecovery`; the lunge is sped up by as much as it is cut, so its reach holds.
      this.state = 'windup'; this.timer = g.headbutt.windup / (DT ? DT.goatAttack : 1);
      this.buttTries = (this.buttTries || 0) + 1;   // a hidden wraith watches for a headbutt near it
      Talisman.onButtStart(game, this);             // MIRROR SHARD: the parry window opens here
      // SPLASH: the head goes down, and what is at his back gets it.
      if (game.mods.splash) Status.splash(game, this);
    }
    if (this.state === 'windup') {
      this.timer -= dt;
      if (this.timer <= 0) {
        const ga = DT ? DT.goatAttack : 1;
        this.state = 'lunge'; this.timer = g.headbutt.active / ga; this.lungeId++;
        Talisman.onLunge(game, this);   // ECHO HORN
        this.vx = this.aim.x * g.headbutt.lunge * ga; this.vy = this.aim.y * g.headbutt.lunge * ga;
        game.dust(this.x - this.aim.x * 8, this.y - this.aim.y * 8, TUNING.juice.dust.lunge, -this.aim.x, -this.aim.y);
        game.audio.sfxHeadbutt(); game.audio.musicEvent('headbutt'); world.emitNoise(this.x, this.y, TUNING.noise.headbutt);
      }
    } else if (this.state === 'lunge') {
      this.timer -= dt;
      this.headbuttHits(game);
      if (this.timer <= 0) { this.state = 'recover'; this.timer = this.recoverMax = g.headbutt.recovery * game.mods.headbuttRecovery; this.vx *= 0.35; this.vy *= 0.35; }
    } else if (this.state === 'recover') {
      this.timer -= dt; if (this.timer <= 0) this.state = 'idle';
    } else if (this.state === 'bite') {
      this.timer -= dt; if (this.timer <= 0) { this.state = 'idle'; this.closeBite(game); }
    }


    // ---- grab / hold / throw ----
    if (inp.rmbDown && !this.holding && this.state === 'idle' && this.grabCd <= 0) this.tryGrab(game);
    if (this.holding) {
      const h = this.holding;
      if (h.dead || h.broken) { this.holding = null; this.autoHeld = false; }
      else {
        // He is carried in front of the face, but never inside stone: from a face full of wall the
        // hold point is walked back toward the goat until it is on floor again. Before that, a throw
        // from hard against a wall started inside the wall and ended up through it — which is the one
        // throw the whole game is built to pay out on.
        // Nor past a shut door: held against one, a man sat on its far side and the throw landed him
        // in the next room with the door still shut (`game.sees` is stone and every shut door).
        let reach = g.grab.holdDist + h.r * 0.4;
        const through = (r) => world.isSolid(Math.floor((this.x + this.aim.x * r) / TILE), Math.floor((this.y + this.aim.y * r) / TILE))
          || !game.sees(this.x, this.y, this.x + this.aim.x * r, this.y + this.aim.y * r);
        while (reach > 4 && through(reach)) reach -= 4;
        h.x = this.x + this.aim.x * reach; h.y = this.y + this.aim.y * reach;
        h.vx = 0; h.vy = 0; h.facing = Math.atan2(this.aim.y, this.aim.x);
        this.holdTimer += dt;
        // A blade in the teeth is still a blade: whoever it touches is cut, and every cut is one of
        // its two lives. `cutCd` keeps one brush past a man from spending both on him.
        this.cutCd = Math.max(0, (this.cutCd || 0) - dt);
        if (h.kind === 'weapon' && h.weapon === 'sword' && this.cutCd <= 0) this.cutWith(game, h);
        // What throws it. Something he reached for goes when the button he reached with comes up;
        // something that came into his mouth on its own goes on the next press of that button.
        if (this.autoHeld ? rmbEdge : !inp.rmbDown) {
          this.throwHeld(game);
        } else if (!h.item && this.holdTimer >= this.holdLimit) {
          // He works his way loose. Losing him costs less than throwing him, but it still costs.
          h.held = false; this.holding = null; h.state = 'floored'; h.timer = 0.6;
          h.x += this.aim.x * 10; h.y += this.aim.y * 10;
          this.spendGrab(game, true, 0.7);
        }
      }
    }

    // ---- the item (Q) ----
    // A fifth key that does not exist until there is something to put on it. One slot, and the two
    // artifacts that live in it are the only two things in the shop that are a verb rather than
    // body work: BOOMERANG throws, STRANGE SYMBOLS steps through nowhere. Neither is grab or roll
    // wearing a different hat — each keeps its own cooldown (`itemCd`), never `grabCd` or `rollCd`,
    // because what it does is its own trick and not a reskin of a verb he already had.
    this.itemCd = Math.max(0, this.itemCd - dt * cdRate);
    if (inp.qPressed && this.itemCd <= 0 && !this.dead) {
      if (game.mods.boomerang && !game.boom.fly) {
        if (Shop.throwBoomerang(game, this)) this.itemCd = this.itemCdMax = game.mods.boomerang.cooldown;
      } else if (game.mods.blink) {
        // Not out of a lunge, a roll or its stagger — the roll's own rule: a blink there cut the
        // headbutt short, stacked its mercy frames on the roll's and skipped the recovery (rule 4).
        const busy = this.state === 'lunge' || this.state === 'roll' || this.state === 'rollrecover';
        if (!busy && Shop.blink(game, this, inp.mx, inp.my)) this.itemCd = this.itemCdMax = game.mods.blink.cooldown;
      } else if (game.mods.effigy) {
        if (Talisman.placeEffigy(game, this)) this.itemCd = this.itemCdMax = game.mods.effigy.cd;
      }
    }

    // ---- scream ----
    // Three things one button can be, and which one it is was decided by a soul. Fire, a blow, or
    // what a goat's voice actually is: a noise, loud enough to bring the room to the spot you made
    // it at. The bare version is the one you start with and the only one that is not a weapon.
    if (inp.spacePressed && this.screamCd <= 0 && !this.dead) {
      game.audio.musicEvent('scream');
      if (game.mods.spit) Status.spit(game, this);
      else if (game.mods.breath) this.breathe(game);
      else if (game.mods.screamStun) {
        // THE FULL THROAT: everyone in earshot loses a moment, and that moment is the point.
        this.screamCd = game.mods.screamCooldown; this.screaming = g.scream.duration;
        game.audio.sfxScream();
        game.floatText(this.x, this.y - 26, 'BAAAAH', PALETTE.bone);
        game.ring(this.x, this.y, game.mods.screamRadius * TILE, PALETTE.bone);
        game.shake(4); game.flash(PALETTE.bone, 0.1);
        const R = game.mods.screamRadius * TILE;
        let n = 0;
        for (const e of game.enemies) {
          // Nothing to shout at while it is mist, and nothing that counts toward the tally either.
          if (e.dead || e.held || e.ghosted) continue;
          if (Math.hypot(e.x - this.x, e.y - this.y) > R) continue;
          e.daze(game, g.scream.stun); n++;
        }
        if (n) game.floatText(this.x, this.y - 44, n + (n === 1 ? ' REELS' : ' REEL'), PALETTE.fireHi);
      } else {
        // The bare voice. It is a `lure` noise, which is the one kind of noise that pulls a man to
        // the spot rather than only turning his head — so it is a way of emptying the far side of a
        // room, and a way of filling the side you are standing on. Both of those are the same button.
        this.screamCd = game.mods.screamCooldown; this.screaming = g.scream.duration;
        game.audio.sfxScream();
        game.floatText(this.x, this.y - 26, 'BAAAAH', PALETTE.bone);
        game.ring(this.x, this.y, game.mods.screamCall * TILE, 'rgba(239,230,208,0.5)');
        world.emitNoise(this.x, this.y, game.mods.screamCall, 'lure');
        // Two jobs out of one shout, and they work at two ranges. Far off it is a lure and pulls a
        // man to the spot. In his face it breaks the blow he was already swinging — which is the
        // thing the bare voice never did, so being caught at arm's length had no answer in it at all
        // until a soul turned up.
        let n = 0, balked = 0;
        const B = g.scream.balk * TILE;
        for (const e of game.enemies) {
          if (e.dead || e.held || e.ghosted) continue;
          const d = Math.hypot(e.x - this.x, e.y - this.y);
          if (d <= B + e.r && e.balk(game, g.scream.balkStun)) balked++;
          if (d <= game.mods.screamCall * TILE) n++;
        }
        // What it did beats who heard it: a broken swing is the thing you need told about.
        if (balked) {
          game.ring(this.x, this.y, B, PALETTE.fireHi);
          game.audio.sfxThud(); game.shake(3);
          game.floatText(this.x, this.y - 44, balked === 1 ? 'SWING BROKEN' : balked + ' SWINGS BROKEN', PALETTE.fireHi);
        } else if (n) game.floatText(this.x, this.y - 44, n === 1 ? '1 HEARD IT' : n + ' HEARD IT', PALETTE.ashHi);
      }
    }

    // ---- integrate + walls ----
    const ox = this.x, oy = this.y;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const impact = world.collideCircle(this);
    // A headbutt is aimed at a man, not at the hole behind him. Knocking somebody over the lip used
    // to carry the goat over after him on the same lunge, so the drop punished the one move it is
    // there to reward. From the windup to the end of the recovery the lip holds him like a wall:
    // he slides along it, and walking off the edge is still his to do once the blow is spent.
    if ((this.state === 'windup' || this.state === 'lunge' || this.state === 'recover')
        && world.isPitPx(this.x, this.y) && !world.isPitPx(ox, oy)) {
      if (!world.isPitPx(this.x, oy)) { this.y = oy; this.vy = 0; }
      else if (!world.isPitPx(ox, this.y)) { this.x = ox; this.vx = 0; }
      else { this.x = ox; this.y = oy; this.vx = 0; this.vy = 0; }
    }
    // A lunge into stone ends the moment it touches — but the blow still lands first. The check
    // used to run only on the frame after, so with his nose already against a wall the lunge
    // bonked and ended on its first frame and nothing in reach was ever hit: the door hung in a
    // wall beside him, a man pinned in the corner with him.
    if (this.state === 'lunge' && impact > 0) { this.headbuttHits(game); this.state = 'recover'; this.timer = this.recoverMax = g.headbutt.recovery * game.mods.headbuttRecovery * 0.6; game.shake(3); game.audio.sfxThud(); }

    // ---- fire ----
    // Witchfire goes straight through the coat: nothing the souls offer turns the Seer's fire away.
    const witch = world.isWitchPx(this.x, this.y);
    this.witchFire = witch;
    this.onFire = witch || world.isBurningPx(this.x, this.y) || !!this.intoBrazier(game);
    if (this.onFire) {
      this.fireTick += dt;
      // EMBER COAT does not stop the burning, it buys time against it: ordinary fire takes
      // `fireResist` times as long to land its tick, and stacking up flame under a goat who never
      // takes damage from it made running through it a way of not playing the level.
      const interval = g.fireDamageInterval * (witch ? 1 : game.mods.fireResist) + (game.level.def.shroom ? TUNING.shroom.burnDelay : 0);
      if (this.fireTick >= interval) {
        this.fireTick = 0; this.damage(1, game, -this.aim.x * 60, -this.aim.y * 60, true, witch ? 'witchfire' : 'fire');
        if (witch && game.mods.fireResist > 1) game.floatText(this.x, this.y - 32, 'WITCHFIRE', PALETTE.witch);
      }
    } else this.fireTick = Math.min(this.fireTick, g.fireDamageInterval * 0.6);

    // ---- motion smear + bloody hoof prints ----
    const spd = Math.hypot(this.vx, this.vy);
    // The soul that makes him faster lengthens the smear. It is the only place SURE HOOVES is
    // visible at all, and a boon nothing on screen answers is a boon that reads as nothing.
    // SURE HOOVES and the run-up both come out here: the ghosts lengthen as he winds up, which is
    // the only thing on screen that says he is faster now than he was two rooms ago.
    const TR = g.trail, quick = clamp((game.mods.speed * this.runUp - 1) / (TR.fastAt - 1), 0, 1);
    const trailLife = lerp(TR.life, TR.fastLife, quick);
    this.trailTimer -= dt;
    if (spd > g.speed * TR.at && this.trailTimer <= 0) {
      this.trailTimer = lerp(TR.gap, TR.fastGap, quick);
      this.trail.push({ x: this.x, y: this.y, a: this.facing, life: trailLife, max: trailLife });
      if (this.trail.length > Math.round(lerp(TR.keep, TR.fastKeep, quick))) this.trail.shift();
    }
    for (const t of this.trail) t.life -= dt;
    this.trail = this.trail.filter((t) => t.life > 0);
    // ---- standing about (drawn only) ----
    // A goat left alone does not stand like a statue: after a moment he glances aside, pronks,
    // shakes his head or paws the floor. Any move, any verb, cuts the fidget off where it is.
    // Its own clock: `stillT` belongs to MOTH (`Talisman.update`), which the men read mid-step.
    const I = g.idle;
    if (this.state === 'idle' && spd < 30 && !this.holding && !inp.mx && !inp.my) {
      this.idleT = (this.idleT || 0) + dt; this.fidgetCd = (this.fidgetCd || 0) - dt;
      const f = this.fidget;
      if (f) {
        const t0 = f.t; f.t += dt;
        if (f.kind === 'paw') {   // a puff off the front hoof at each scrape
          const n = I.paw.scrapes, at = (k) => (k + 0.5) / n * f.dur;
          for (let k = 0; k < n; k++) if (t0 < at(k) && f.t >= at(k)) game.dust(this.x + Math.cos(this.facing) * 7, this.y + Math.sin(this.facing) * 5, 1, -Math.cos(this.facing), -Math.sin(this.facing));
        }
        if (f.t >= f.dur) this.fidget = null;
      } else if (this.idleT > I.after && this.fidgetCd <= 0) {
        const W = I.weights, sum = Object.values(W).reduce((a, b) => a + b, 0);
        let r = Math.random() * sum, kind = 'look';
        for (const k in W) { r -= W[k]; if (r < 0) { kind = k; break; } }
        const dur = kind === 'look' ? I.look : I[kind].time;
        this.fidget = { kind, t: 0, dur, dir: Math.random() < 0.5 ? -1 : 1 };
        this.fidgetCd = dur + lerp(I.gap[0], I.gap[1], Math.random());
      }
    } else { this.idleT = 0; this.fidget = null; }
    // One heart left and he bleeds: an occasional drop behind him, the one hint the floor gives.
    const BL = TUNING.goat.bleed;
    if (this.hp <= 1 && spd > BL.minSpeed) {
      this.hoofTimer -= dt;
      if (this.hoofTimer <= 0) { this.hoofTimer = BL.gap * (1 + (Math.random() - 0.5) * 2 * BL.jitter); world.dot(this.x + (Math.random() - 0.5) * 8, this.y + (Math.random() - 0.5) * 8, BL.size, PALETTE.bloodDark); }
    }
    // Below a walk he makes nothing worth hearing — that silence is the stealth the cone is built
    // to reward. Above it, this used to be a coin flip every frame, which could go a half-second
    // without landing and let a run right up on somebody's back read as luck rather than as noise.
    if (spd > 100) {
      this.stepNoiseTimer -= dt;
      if (this.stepNoiseTimer <= 0) {
        this.stepNoiseTimer = TUNING.noise.footstepGap;
        const quiet = Talisman.stepMul(game, this);   // MOTH WOOL
        if (quiet > 0) { world.emitNoise(this.x, this.y, TUNING.noise.footstep * quiet); game.audio.sfxHoof(quiet); }
      }
    } else this.stepNoiseTimer = 0;
    // The last boards he stood on. A fall puts him back on them, so they are worth keeping. The
    // trail behind it is the same idea a few seconds deep: `goatFalls` reaches into it for a point
    // with room behind it, rather than the exact edge his hoof was leaving.
    if (!world.isPitPx(this.x, this.y)) {
      this.safeX = this.x; this.safeY = this.y;
      const tr = this.safeTrail;
      tr.push({ x: this.x, y: this.y, t: 0 });
      for (const s of tr) s.t += dt;
      while (tr.length > 1 && tr[0].t > TUNING.fall.setback + 0.2) tr.shift();
    }
  }

  // LEAPFROG: who is in front to go over, and where behind him there is floor to come down on. "In
  // front" is where he is being asked to run, or where he is pointing when he is asked nothing.
  // The nearest man in the cone wins; a man with no room behind him is not a way through.
  leapTarget(game, inx, iny) {
    const L = game.mods.leapfrog, asked = Math.hypot(inx, iny) > 0.1;
    const fx = asked ? inx : this.aim.x, fy = asked ? iny : this.aim.y, fl = Math.hypot(fx, fy) || 1;
    const cos = Math.cos(L.cone);
    let best = null, bestD = Infinity;
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted || e.state === 'flung' || e === this.holding || game.hidden(e.x, e.y)) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
      if (d < 1 || d > L.reach * TILE + e.r || d >= bestD) continue;
      if ((dx * fx + dy * fy) / (d * fl) < cos) continue;
      if (!game.reaches(this.x, this.y, e.x, e.y)) continue;
      const ux = dx / d, uy = dy / d;
      // Full distance past him first, then half of it, before he is given up on.
      for (const k of [1, 0.5]) {
        const past = e.r + this.r + L.behind * TILE * k, lx = e.x + ux * past, ly = e.y + uy * past;
        if (!this.leapLands(game, lx, ly, e) || !game.reaches(e.x, e.y, lx, ly)) continue;
        best = { e, x: lx, y: ly, dir: { x: ux, y: uy } }; bestD = d; break;
      }
    }
    return best;
  }
  // Floor for the whole of him: no stone, no hole, nothing burning or about to bite, no furniture
  // and no other man standing there.
  leapLands(game, x, y, over) {
    const w = game.world, r = this.r;
    for (const [ox, oy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) {
      if (w.isSolid(Math.floor((x + ox) / TILE), Math.floor((y + oy) / TILE)) || w.isPitPx(x + ox, y + oy)) return false;
    }
    if (w.isBurningPx(x, y)) return false;
    for (const p of game.hazards) {
      if (p.kind === 'spike' && !p.spikeThreat()) continue;
      if (p.kind === 'mill' ? p.millThreat(x, y, r) : Math.hypot(p.x - x, p.y - y) < p.r + r + 6) return false;
    }
    for (const p of game.props) if (!p.broken && p.blocking && Math.hypot(p.x - x, p.y - y) < p.r + r) return false;
    for (const o of game.enemies) if (o !== over && !o.dead && !o.ghosted && Math.hypot(o.x - x, o.y - y) < o.r + r) return false;
    return true;
  }

  // The roll is a panic button, and it has to behave like one. With no direction asked for it throws
  // the goat away from whatever is about to hit it; with one asked for, that direction wins unless it
  // runs into a man, a wall or a fire, in which case it slides to the nearest angle that does not.
  rollDirection(game, inx, iny) {
    const R = TUNING.goat.roll, w = game.world;
    const dist = R.speed * game.mods.rollDistance * R.duration * 0.8;
    const range = R.threatRange * TILE;
    const threats = [];
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted || e === this.holding) continue;
      // Horns do not go through furniture either: a man behind a table is behind it.
      if (!game.reaches(this.x, this.y, e.x, e.y)) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
      if (d > range || d < 1) continue;
      // Anyone winding up a swing is more of a reason to be elsewhere than anyone who is not.
      const urgency = (e.state === 'windup' || e.state === 'charge' || e.state === 'chargewind' || e.state === 'swing') ? 1.6 : 1;
      threats.push({ x: dx / d, y: dy / d, w: (1 - d / range) * urgency });
    }
    const want = Math.hypot(inx, iny) > 0.1 ? Math.atan2(iny, inx) : null;
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < 24; i++) {
      // With a stick direction, walk outward from it; without one, sweep the whole circle.
      const a = want === null ? (i / 24) * Math.PI * 2 : want + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.26;
      const cx = Math.cos(a), cy = Math.sin(a);
      let score = 0;
      for (const t of threats) score -= (t.x * cx + t.y * cy) * t.w * 2.4;
      // How far along this line he actually gets before a wall or a fire stops being worth it.
      let clear = 1;
      for (const f of [0.4, 0.7, 1]) {
        const px = this.x + cx * dist * f, py = this.y + cy * dist * f;
        if (w.isSolid(Math.floor(px / TILE), Math.floor(py / TILE))) { clear = f - 0.3; break; }
        // A hole is worse than a wall: a wall stops the tumble, a hole charges a heart for it.
        if (w.isPitPx(px, py)) { clear = f - 0.6; break; }
        if (w.isBurningPx(px, py)) { clear = f - 0.5; break; }
        // Ending a tumble in a brazier or under the wheel is the same mistake as ending it in a wall.
        // A plate lying flat is floor and is not.
        let hazard = false;
        for (const p of game.hazards) {
          if (p.kind === 'spike' && !p.spikeThreat()) continue;
          if (p.kind === 'mill' ? p.millThreat(px, py, this.r) : Math.hypot(p.x - px, p.y - py) < p.r + this.r + 6) { hazard = true; break; }
        }
        if (hazard) { clear = f - 0.5; break; }
      }
      score += clear * 2.6;
      if (want !== null) score += Math.cos(a - want) * 1.7;   // the stick still gets the last word
      if (score > bestScore) { bestScore = score; best = { x: cx, y: cy }; }
    }
    return best || { x: -this.aim.x, y: -this.aim.y };
  }

  // A cone of fire where the scream used to be.
  breathe(game) {
    const B = TUNING.goat.breath;
    // It comes out along the way he is going, not along the way the pointer is. A goat running one
    // way and breathing fire the other is a gun turret; the cone is a thing you commit your whole
    // body to, and committing is what makes it worth a soul. Standing still it goes where he looks.
    const dir = Math.hypot(this.vx, this.vy) > 40 ? Math.atan2(this.vy, this.vx) : this.facing;
    const ax = Math.cos(dir), ay = Math.sin(dir);
    this.screamCd = game.mods.screamCooldown; this.screaming = 0.4;
    game.world.igniteCone(this.x, this.y, ax, ay, B.range, B.halfAngle, B.fireTime);
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
      if (d > B.range + e.r || (dx * ax + dy * ay) / (d || 1) < Math.cos(B.halfAngle)) continue;
      if (!game.world.los(this.x, this.y, e.x, e.y)) continue;
      e.ignite(game);
    }
    for (let i = 0; i < 26; i++) {
      const a = Math.atan2(ay, ax) + (Math.random() - 0.5) * B.halfAngle * 2;
      const sp = 260 + Math.random() * 420;
      game.parts.push({ x: this.x + ax * 14, y: this.y + ay * 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.28 + Math.random() * 0.3, color: Math.random() < 0.5 ? PALETTE.fire : PALETTE.fireHi, size: 3 + Math.random() * 4 });
    }
    game.breathFx = { x: this.x, y: this.y, ax, ay, life: 0.34, max: 0.34 };
    game.world.emitNoise(this.x, this.y, TUNING.noise.breath, 'lure');
    game.audio.sfxBreath(); game.shake(6); game.vibe(25);
  }

  // Tall grass in front of a headbutt is cut down: what was hiding in it is not, and what it hid
  // from you is in the open. The cuttings are the only noise it makes.
  cutGrass(game, ax, ay) {
    const w = game.world, R = TUNING.grass.cutR * TILE;
    const cx = this.x + ax * TILE * 0.6, cy = this.y + ay * TILE * 0.6;
    const x0 = Math.floor((cx - R) / TILE), x1 = Math.floor((cx + R) / TILE);
    const y0 = Math.floor((cy - R) / TILE), y1 = Math.floor((cy + R) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) continue;
      const i = ty * w.W + tx, px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
      if (!w.grass[i] || Math.hypot(px - cx, py - cy) > R) continue;
      w.grass[i] = 0;
      const def = game.level.def;
      game.particles(px, py, 6, def.grassHi || PALETTE.hay, 150);
    }
  }

  headbuttHits(game) {
    const g = TUNING.goat.headbutt;
    const extra = (game.mods.headbuttReach - 1) * TILE, impulse = g.impulse * game.mods.headbuttImpulse;
    const ax = this.aim.x, ay = this.aim.y;
    this.cutGrass(game, ax, ay);
    for (const e of game.enemies) {
      if (e.dead || e.held || e.lastLunge === this.lungeId) continue;
      // Horns through mist. Saying so where it happened is the only tutorial this enemy gets.
      if (e.ghosted) {
        if (Math.hypot(e.x - this.x, e.y - this.y) < this.r + e.r + 12 + extra) game.mistTold(e);
        continue;
      }
      const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
      if (d > this.r + e.r + 10 + extra || (dx * ax + dy * ay) / (d || 1) < 0.15) continue;
      // Held to the same line as everything else that reaches (ECHO HORN already was): with LONG
      // HORNS a man on the far side of a shut iron door was thrown across the room behind it.
      if (!game.sees(this.x, this.y, e.x, e.y)) continue;
      e.lastLunge = this.lungeId;
      // Caught while it is a body. Horn through a thing that has just made itself real undoes it —
      // no wall needed, because the window was the hard part.
      if (e.kind === 'wraith') {
        game.floatText(e.x, e.y - 34, 'UNMADE', PALETTE.witchHi);
        game.hitstop(0.06); game.shake(7); game.kick(ax, ay, TUNING.juice.kick); game.zoomPunch(1.2);
        e.die(game, 'unmade', ax, ay);
        continue;
      }
      if (e.kind === 'ratogre') {
        // The horns do nothing to him standing. Down — a crate or a shield in the face — and every
        // blow is a heart; up, the goat bounces off him and is told, once, what would work.
        const open = e.state === 'floored' || e.state === 'stunned';
        this.vx = -ax * 4 * TILE; this.vy = -ay * 4 * TILE;
        game.audio.sfxThud(); game.squashGoat(TUNING.juice.squash.hit);
        if (open) {
          game.hitstop(0.05); game.shake(6); game.kick(-ax, -ay, TUNING.juice.kick); game.zoomPunch(0.8);
          game.impact(this.x + ax * (this.r + 6), this.y + ay * (this.r + 6), ax, ay);
          game.particles(e.x, e.y, 9, PALETTE.blood, 260);
          e.die(game, 'headbutt', ax, ay);
        } else {
          game.shake(2); game.particles(this.x + ax * this.r, this.y + ay * this.r, 5, PALETTE.ash, 200);
          e.flash = Math.max(e.flash, 0.05); e.aware = true;
          Shop.ogreShrug(game, e);
        }
        continue;
      }
      // In the air he is over your horns, not in front of them.
      if (e.kind === 'butcher' && e.state === 'hop') continue;
      // The bare horns do not hurt him (`butcher.hornsHurt`, 25 Sep 2026): the goat rebounds off him
      // and the room is told once what does. No stagger either — a free stagger per butt was a lock.
      if (e.kind === 'butcher' && !TUNING.butcher.hornsHurt) {
        this.vx = -ax * 3 * TILE; this.vy = -ay * 3 * TILE; e.aware = true;
        e.flash = Math.max(e.flash, 0.05);
        game.shake(2); game.audio.sfxThud(); game.particles(this.x + ax * this.r, this.y + ay * this.r, 5, PALETTE.ash, 200);
        if (!game.ogreHornsTold) { game.ogreHornsTold = true; game.floatText(e.x, e.y - 50, 'THE HORNS DO NOTHING. BLADES. FIRE.', PALETTE.ashHi); }
        continue;
      }
      if (e.kind === 'butcher') {
        e.hp -= 1; e.flash = 0.18;
        // Planted while he crouches or winds a slam: the hit counts but does not stop it, and you are
        // still standing in the ring. Bait it, step out, then hit him on his knees.
        if (e.state === 'slamwind' || e.state === 'hopwind') { this.vx = -ax * 5 * TILE; this.vy = -ay * 5 * TILE; }
        // He reels where he stands: the ogre is not moved by the horns (1.66), the brute is.
        else { e.state = 'stagger'; e.timer = TUNING.butcher.stagger; e.vx = 0; e.vy = 0; }
        game.hitstop(0.05); game.shake(5); game.audio.sfxThud();
        game.particles(this.x + ax * this.r, this.y + ay * this.r, 9, PALETTE.bone, 300);
        game.kick(-ax, -ay, TUNING.juice.kick); game.zoomPunch(0.8);
        game.impact(this.x + ax * (this.r + 6), this.y + ay * (this.r + 6), ax, ay); game.squashGoat(TUNING.juice.squash.hit);
        game.world.splat(e.x, e.y, ax, ay, 8);
        if (e.hp <= 0) e.die(game, 'headbutt', ax, ay);
      } else {
        // A hound is not always there for it: that is what makes him a hound and not a man.
        if (e.tryDodge && e.tryDodge(game, ax, ay)) continue;
        const imp = Talisman.buttImpulse(game, this, e, impulse * (e.knockMul ? e.knockMul() : 1));
        e.fling(ax * imp, ay * imp, false);
        game.shake(2); game.audio.sfxThud(); game.vibe(10);
        game.particles(this.x + ax * this.r, this.y + ay * this.r, 6, PALETTE.bone, 260);
        game.kick(ax, ay, TUNING.juice.kick * 0.55);
        e.flash = Math.max(e.flash, TUNING.juice.hitFlash);
        game.impact(this.x + ax * (this.r + 6), this.y + ay * (this.r + 6), ax, ay);
        game.squashGoat(TUNING.juice.squash.hit);
        // `exploded` has to come back with the fuse: a bomb charge now only takes off one heart
        // against a multi-hit target, and without this a second charge would relight a fuse that
        // could never go off again.
        if (game.mods.bomb) { e.bombFuse = TUNING.goat.bomb.fuse; e.exploded = false; e.aware = true; }
      }
    }
    for (const p of game.props) {
      if (p.broken || p.lastLunge === this.lungeId) continue;
      let dx, dy, d, reach;
      if (p.kind === 'door') {
        // The same fix `collideEntities` already gives a door for walking into it: a slab, not a
        // disc, so the closest point on its actual span is what a headbutt is measured against. A
        // circle centred on the door read a swing landed against either edge of a two-tile gap as
        // short of it, so a door could stand there taking hits that never counted.
        const D = TUNING.prop.door;
        const hx = p.vertical ? D.thick / 2 : p.r, hy = p.vertical ? p.r : D.thick / 2;
        const cx = clamp(this.x, p.x - hx, p.x + hx), cy = clamp(this.y, p.y - hy, p.y + hy);
        dx = cx - this.x; dy = cy - this.y; d = Math.hypot(dx, dy); reach = this.r + 8 + extra + D.reachSlack;
      } else {
        dx = p.x - this.x; dy = p.y - this.y; d = Math.hypot(dx, dy); reach = this.r + p.r + 8 + extra;
      }
      // Overlapping the slab already (nose right up against it, or a hair inside it) has no
      // meaningful direction to check aim against — the same rescue the rectangle collision itself
      // gives a body landing dead centre.
      // A door is a slab two tiles long: standing at one end of it, the nearest point is off to the
      // side of the nose, so it takes a blow from anywhere in front of the shoulders, not the cone.
      const cone = p.kind === 'door' ? -0.25 : 0.15;
      if (d > reach || (d > 1 && (dx * ax + dy * ay) / d < cone)) continue;
      p.lastLunge = this.lungeId;
      p.headbutt(game, ax, ay);
    }
  }

  // An arm into the mouth. Out of the stand if it is still standing in one, and then simply carried.
  // The hand that reached for it and the hoof that ran over it come through here alike, so a blade
  // taken in passing tips its stand exactly the way a blade taken on purpose does.
  takeArm(game, p) {
    if (p.inStand) {
      p.inStand = false;
      game.world.dot(p.x - 4, p.y + 7, 4.5, '#3a2c20'); game.world.dot(p.x + 5, p.y + 9, 3.5, '#3a2c20');
      game.floatText(p.x, p.y - 32, p.weapon === 'sword' ? 'SWORD' : 'SHIELD', PALETTE.bone);
    }
    p.held = true; p.flung = false; p.thrown = false;
    this.holding = p; this.holdTimer = 0; this.autoHeld = true;
    game.audio.sfxSteel(); game.vibe(8); game.coldEye();
  }

  // Let go of whatever is in his mouth by throwing it — grab's release, and now the bash too, when
  // what he is carrying is a blade or a shield: there is no swing to spend on a weapon he cannot
  // wield, so launching it is what the button does instead.
  // What the mouth costs before it takes again. A man costs `grab.manCd` times what a thing does,
  // however he left it — thrown, worked loose (`mul`), burnt, or taken out of it by the room — and
  // BY THE COLLAR's card says so. `grabCdMax` is what the rail drains against.
  spendGrab(game, man, mul = 1) {
    const G = TUNING.goat.grab;
    this.grabCd = this.grabCdMax = G.cooldown * game.mods.grabCooldown * (man ? G.manCd : 1) * mul;
  }

  throwHeld(game) {
    const h = this.holding, g = TUNING.goat; if (!h) return;
    game.audio.musicEvent('throw');
    h.held = false; this.holding = null; this.autoHeld = false;
    // VENOM JAW and FIREBRAND: held long enough, it leaves the mouth dripping or live — an animal as
    // much as a crate, and it drips down its whole flight the same way (`Status.updateCarried`).
    Status.markThrow(game, this, h);
    // A hen out of the mouth is a hen off the horns: the same kick, the same seeking flight, the
    // same man she was already good at finding. Reaching for her on purpose buys nothing new — it
    // is one more way she ends up airborne.
    if (h.kind === 'chicken') { h.kick(game, this.aim.x, this.aim.y); this.spendGrab(game, false); return; }
    // A shell goes flat and hard and stops where it lands: it is how you advance the one escort that
    // cannot keep up, and it is not a crate — nothing it hits breaks and it does not break either.
    if (h.kind === 'tortoise') { Beast.throwTortoise(h, game, this.aim.x, this.aim.y); this.spendGrab(game, false); return; }
    // A goat is not a gorilla. A crate or a blade goes the length of the room; a grown man goes a
    // short way and lands, which is still every wall in it and every man standing by one.
    const mul = h.kind === 'weapon' ? TUNING.prop.weapon.throwMul : h.item ? 1 : g.grab.manThrow;
    h.fling(this.aim.x * g.grab.throwImpulse * mul, this.aim.y * g.grab.throwImpulse * mul, true);
    // A man out of the mouth has to arrive at `physics.thrownKill` to die on what he meets; every
    // other thrown body (a blast, the rat ogre's arm) still dies on any touch. `fling` clears it.
    if (!h.item) h.fromMouth = true;
    this.spendGrab(game, !h.item);
    if (h.kind === 'weapon') { game.audio.sfxSteel(); game.world.emitNoise(this.x, this.y, TUNING.noise.swing); }
    else game.audio.sfxSwing();
    game.vibe(18);
  }

  tryGrab(game) {
    const g = TUNING.goat.grab;
    this.grabTries = (this.grabTries || 0) + 1;   // a hidden wraith watches for a reach near it
    let best = null, bestD = Infinity;
    const consider = (o) => {
      const dx = o.x - this.x, dy = o.y - this.y, d = Math.hypot(dx, dy);
      if (d > this.r + o.r + g.reach * 0.6) return;
      if ((dx * this.aim.x + dy * this.aim.y) / (d || 1) < -0.2) return;
      // Not through a shut door: a crate, a blade or (BY THE COLLAR) a man pressed to its far face
      // was taken through it, soul gates included.
      if (!game.sees(this.x, this.y, o.x, o.y)) return;
      if (d < bestD) { bestD = d; best = o; }
    };
    // The shelf first. A ware is reached for the way a crate is, and reaching for it is the whole
    // of taking it — the press, not the holding, so it is asked once and not every frame.
    if (this.rmbEdgeNow) {
      // The full reach rather than the crate's six tenths of it: a stool is reached up to from the
      // gap in the wall, not stood over.
      for (const p of game.props) {
        if (p.kind !== 'ware' || p.broken) continue;
        const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy);
        if (d > this.r + p.r + g.reach || (dx * this.aim.x + dy * this.aim.y) / (d || 1) < -0.2) continue;
        if (d < bestD) { bestD = d; best = p; }
      }
      if (best) { Shop.buy(game, best, this); this.grabCd = this.grabCdMax = 0.3; return; }
    }
    // Out of the pen the mouth takes objects and nothing else. A grown man is BY THE COLLAR, and
    // until that soul is swallowed reaching for one is a thing you are told about rather than a
    // thing that silently does nothing.
    if (game.mods.grabMen) {
      // The brute is a clubman grown too big for a goat's jaw, the same as the Butcher, and a man with
      // a soul in him is more than a man: all three are put down by the room, never carried out of it.
      // Nor a man alight: in the teeth he burned on for his whole fire, lighting the goat's own feet,
      // and the fire's run overrode the throw.
      for (const e of game.enemies) if (!e.dead && !e.unliftable && !(e.cfg.immune && e.cfg.immune.grab)
        && e.state !== 'flung' && !e.held && !(e.burning > 0)) consider(e);
    }
    for (const p of game.props) if (p.item && !p.broken && !p.held && !p.flung) consider(p);
    if (!best) {
      // Reaching for a hound and closing on nothing is a rule worth stating once, where it happened
      // — and only once a beat, since holding the button down near one asks every single frame.
      if (this.fussCd <= 0) {
        for (const e of game.enemies) {
          const big = game.mods.grabMen && e.unliftable;
          if (e.dead || (e.kind !== 'dog' && !big)) continue;
          if (Math.hypot(e.x - this.x, e.y - this.y) > this.r + e.r + g.reach) continue;
          game.floatText(e.x, e.y - 24, big ? (e.soul && e.kind !== 'butcher' && !e.champion ? 'THE SOUL HOLDS HIM' : 'TOO BIG') : 'TOO QUICK', PALETTE.ashHi); this.fussCd = 0.8; break;
        }
      }
      if (!game.mods.grabMen) game.reachedForAMan(this);
      return;
    }
    // An arm is an arm however it got there: the same hoof-over-it path takes it, tips its stand
    // and says what it is. What is different is that this one was asked for, so it leaves on release.
    if (best.kind === 'weapon') { this.takeArm(game, best); this.autoHeld = false; return; }
    // A hound is never held, even BY THE COLLAR: it springs a tile back out of the mouth and the
    // grab is spent as if something had been thrown. Before, the reach simply closed on nothing.
    if (best.kind === 'dog') { best.hopBack(game, this); this.spendGrab(game, false); return; }
    // A man is not a box: the teeth have to get under him first (`grab.bite`), and he is not yours
    // until they have. Whatever he was doing he goes on doing through it — a club already coming
    // round still lands. `closeBite` takes him if he is still there to be taken.
    if (!best.item) { this.state = 'bite'; this.timer = g.bite; this.biting = best; return; }
    this.takeHold(game, best);
  }

  // The bite shuts. He is taken if nothing has happened to him in the meantime and he is still in
  // reach (with `biteSlack`, since he was in it when the teeth went down); otherwise the mouth
  // closes on air and that costs a beat of its own.
  closeBite(game) {
    const g = TUNING.goat.grab, e = this.biting; this.biting = null;
    const ok = e && !e.dead && !e.held && !e.ghosted && e.state !== 'flung' && !e.unliftable
      && Math.hypot(e.x - this.x, e.y - this.y) <= (this.r + e.r + g.reach * 0.6) * g.biteSlack;
    if (ok) { this.takeHold(game, e); return; }
    this.grabCd = this.grabCdMax = g.biteMiss;
    game.audio.sfxSwing();
  }

  // Into the mouth: a thing the frame it was asked for, a man once the bite has closed on him.
  takeHold(game, best) {
    best.held = true; best.flung = false; best.thrown = false; this.holding = best; this.holdTimer = 0;
    this.autoHeld = false;   // reached for on purpose: it leaves when the button does
    // High risk, high reward: the fuse starts the moment it is in your mouth, not the moment it
    // leaves it. Reaching for it is the decision; holding onto it is what costs you the time back.
    // Said and heard, not only drawn: in playtest the fuse lighting in the mouth went unnoticed and
    // the bomb left it a beat too late.
    if (best.kind === 'bomb' && best.fuseT < 0) {
      best.fuseT = TUNING.prop.bomb.fuse;
      game.floatText(best.x, best.y - 26, 'LIT', PALETTE.fireHi); game.audio.sfxFuse(TUNING.prop.bomb.fuse);
    }
    // He is yours for a while, and you do not get to know exactly how long: the roll is made here.
    const v = TUNING.goat.grab.holdVary;
    this.holdLimit = game.mods.holdTime * (1 - v + Math.random() * v * 2);
    if (!best.item) { best.state = 'held'; best.aware = true; }
    game.vibe(10); game.coldEye();
  }

  // The carried sword meets a man. Along the length of the blade, not only its hilt: the hold point
  // is where his teeth are, and the steel runs a hand past it in the direction he is facing.
  cutWith(game, h) {
    const W = TUNING.prop.weapon, reach = h.r * 1.6;
    const tx = h.x + this.aim.x * reach * 0.5, ty = h.y + this.aim.y * reach * 0.5;
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted) continue;
      if (Math.hypot(e.x - tx, e.y - ty) > e.r + reach * 0.75) continue;
      if (!game.sees(this.x, this.y, e.x, e.y)) continue;   // not through a shut door
      e.die(game, 'splat', this.aim.x, this.aim.y);
      game.gore(e.x, e.y, 5, this.aim.x, this.aim.y); game.audio.sfxSplat(); game.audio.sfxSteel();
      game.world.emitNoise(h.x, h.y, TUNING.noise.steel);
      game.shake(5); game.hitstop(0.04); game.kick(this.aim.x, this.aim.y, TUNING.juice.kick * 0.6);
      this.cutCd = W.cutGap;
      if (--h.uses <= 0) h.snap(game);
      return;
    }
  }

  // Is a point in front of the shield he is carrying? Everything the shield is supposed to answer
  // asks this: a rifle round, a club, a hound's teeth. An arc across his front rather than the disc
  // of the shield itself, because the disc let almost everything past its edge.
  shielded(x, y, far) {
    const h = this.holding;
    if (!h || h.kind !== 'weapon' || h.weapon !== 'shield' || h.broken) return false;
    return this.covers(x, y, far);
  }

  // A blow from `att` that finds the shield between him and the goat is a blow into the shield,
  // whatever it was: a club, teeth, the brute's run, the ogre's fists on the floor or his landing
  // (24 Sep 2026: "if the shield is between the blow and him, it protects"). Asked of the side the
  // blow comes from, not of the shield's own reach — whoever threw it has already been found in
  // range by the blow itself. A charge spent, and the man who swung eats the parry unless `stagger`
  // is false: the ogre and the rat ogre are already on their knees after a landing.
  blockBlow(game, att, stagger) {
    if (!this.shielded(att.x, att.y, true)) return false;
    const W = TUNING.prop.weapon, sh = this.holding, a = Math.atan2(att.y - this.y, att.x - this.x);
    game.floatText(sh.x, sh.y - 28, 'CLANG', PALETTE.bone);
    game.audio.sfxSteel(); game.shake(5); game.hitstop(0.05); game.vibe(22);
    game.particles(sh.x, sh.y, 7, PALETTE.fireHi, 180);
    if (stagger !== false && !att.dead) { att.state = 'stagger'; att.timer = W.parry; att.vx = Math.cos(a) * W.parryPush * TILE; att.vy = Math.sin(a) * W.parryPush * TILE; }
    if (--sh.uses <= 0) sh.snap(game);
    return true;
  }

  // A crate held out in front of you is a shield that lasts one blow. It is the same arc the shield
  // answers on and the same answer — the goat takes nothing — but the box comes apart doing it, so
  // it is a thing you spend rather than a thing you carry. Anything picked up on the way past is
  // suddenly worth holding on to for a moment longer, which is the point.
  crated(x, y) {
    const h = this.holding;
    if (!h || h.kind !== 'crate' || h.broken) return false;
    return this.covers(x, y);
  }

  // The arc across his front that anything carried covers: not the disc of the thing itself, which
  // let almost everything past its edge.
  // `far`: only the side it comes from counts, not how close (a blow already measured its own reach).
  // The bowl he is walking into, or null. Up against one is not enough: what he asks for with the
  // stick (or the way he tumbles) has to point at it (`prop.brazier.into`), so a doorway with a
  // brazier in it is walked through and not paid for. The men still catch off a touch.
  intoBrazier(game) {
    const B = TUNING.prop.brazier, inp = game.input;
    const ax = this.state === 'roll' ? this.rollDir.x : inp.mx, ay = this.state === 'roll' ? this.rollDir.y : inp.my;
    const ask = Math.hypot(ax, ay); if (ask < 0.1) return null;
    for (const p of game.props) {
      if (p.kind !== 'brazier' || p.broken) continue;
      const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy);
      if (d < p.r + this.r + B.touch && (ax * dx + ay * dy) / (ask * (d || 1)) >= B.into) return p;
    }
    return null;
  }
  covers(x, y, far) {
    const W = TUNING.prop.weapon;
    if (!far && Math.hypot(x - this.x, y - this.y) > this.r + W.coverR) return false;
    return Math.abs(angleDiff(Math.atan2(this.aim.y, this.aim.x), Math.atan2(y - this.y, x - this.x))) < W.coverArc / 2;
  }
  // `by` is what did it — the man, or a word for the room ('fire', 'mill', 'fall'…) — kept only so
  // the death card can say what the last heart went to.
  damage(n, game, kx, ky, fromFire, by) {
    if (this.dead || (this.invuln > 0 && !fromFire)) return;
    if (game.dev.god) { game.particles(this.x, this.y, 4, PALETTE.fireHi, 90); return; }
    if (by !== 'fall' && this.tripPhase(game, kx, ky)) return;
    if (Talisman.absorb(game, this)) return;   // TALLOW SKIN took it
    this.hp -= n; this.invuln = TUNING.goat.invuln; this.hurtBy = by || null;
    if (game.heartLog) for (let k = 0; k < n; k++) game.heartLog.push(game.timer);
    this.vx += kx || 0; this.vy += ky || 0;
    Talisman.loseRunUp(game, this);            // whatever he had built up, the club took it (BRASS SPUR keeps some)

    game.shake(TUNING.juice.shakeHit, true); game.audio.sfxHit(); game.audio.musicEvent('hurt'); game.squashGoat(TUNING.juice.squash.hurt);
    // A goat that only grunts when it is hit reads as armour, not an animal — the frightened bleat
    // is what says it felt that.
    game.audio.sfxBleat(560, 0.24, 0.3);
    game.hurtFlash(Math.atan2(-(ky || 0), -(kx || 0)));
    game.world.splat(this.x, this.y, (kx || 0) / 100, (ky || 0) / 100, 9);
    if (this.state === 'windup' || this.state === 'bite') this.state = 'idle';   // a blow takes the bite out of his mouth too
    if (this.hp <= 0 && !Talisman.scapegoat(game, this)) this.die(game);
  }
  // THE TRIP's mercy: a blow that lands may turn out never to have. He is somewhere else — away from
  // where it came from, on plain floor with nothing burning — and says so. Returns true if it did.
  tripPhase(game, kx, ky) {
    const P = TUNING.shroom.phase, w = game.world;
    if (!game.level || !game.level.def.shroom || Math.random() >= P.chance) return false;
    const away = (kx || ky) ? Math.atan2(ky || 0, kx || 0) : Math.random() * Math.PI * 2;
    for (let k = 0; k < 12; k++) {
      const a = away + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.45;
      for (const f of [1, 0.7, 0.45]) {
        const nx = this.x + Math.cos(a) * P.dist * f * TILE, ny = this.y + Math.sin(a) * P.dist * f * TILE;
        const tx = Math.floor(nx / TILE), ty = Math.floor(ny / TILE);
        if (w.isSolid(tx, ty) || w.isPitPx(nx, ny) || w.isBurningPx(nx, ny) || !w.los(this.x, this.y, nx, ny)) continue;
        game.particles(this.x, this.y, 10, PALETTE.witchHi, 160);
        this.x = nx; this.y = ny; this.vx = 0; this.vy = 0;
        this.invuln = TUNING.goat.invuln;
        if (this.state === 'windup') this.state = 'idle';
        game.particles(nx, ny, 10, PALETTE.witchHi, 160);
        game.floatText(nx, ny - 34, P.text, PALETTE.witchHi);
        return true;
      }
    }
    return false;
  }
  die(game) {
    if (this.dead) return;
    this.dead = true; this.hp = 0;
    if (this.holding) { this.holding.held = false; if (!this.holding.item) { this.holding.state = 'idle'; } this.holding = null; }
    game.world.splat(this.x, this.y, 0, 0, 22);
    game.fx.death(this,'splat',Math.cos(this.facing),Math.sin(this.facing));
    game.onGoatDied();
  }
}

class Prop {
  constructor(x, y, kind, opts) {
    const P = TUNING.prop;
    this.x = x; this.y = y; this.kind = kind; this.vx = 0; this.vy = 0;
    this.r = kind === 'crate' ? P.crate.r : kind === 'bell' ? P.bell.r : kind === 'door' ? P.door.r
      : kind === 'table' ? P.table.r : kind === 'lamp' ? P.lamp.r
      : kind === 'mill' ? TUNING.mill.hubR : kind === 'heal' ? P.heal.r
      : kind === 'weapon' ? P.weapon.r : kind === 'secret' ? P.door.r
      : kind === 'coop' ? P.coop.r : kind === 'chicken' ? P.chicken.r
      : kind === 'tortoise' ? P.tortoise.r : kind === 'goose' ? P.goose.r : kind === 'crow' ? P.crow.r : kind === 'horse' ? P.horse.r
      : kind === 'cage' ? P.cage.r : kind === 'spike' ? P.spike.r : kind === 'brazier' ? P.brazier.r
      : kind === 'bomb' ? P.bomb.r : kind === 'rock' ? P.rock.r : kind === 'spire' ? P.spire.r
      : kind === 'barrel' ? P.barrel.r
      : kind === 'mouse' ? P.mouse.r : kind === 'ware' ? P.ware.r : 13;
    // The shop (js/shop.js). A mouse carries which room's shelf is hers (`shopId`), where the gap
    // in the wall is (`gap`, which is where the ogre comes out), how many blows she has taken and
    // what she is saying; a ware carries the artifact on it — `{ id, tier }` — and whether
    // it is `locked` (the ogre is out) or `free` (he is down).
    this.shopId = opts && opts.shopId !== undefined ? opts.shopId : -1;
    this.gap = (opts && opts.gap) || null; this.strikes = 0; this.say = null; this.angry = 0;
    this.ware = (opts && opts.ware) || null; this.locked = false; this.free = false;
    this.milkSpots = (opts && opts.milkSpots) || null;   // the milk offer: where her pail is stood
    // -1 until it is thrown for the first time (`fling` arms it); ticking down after that regardless
    // of whether it is picked up and thrown again, so a live bomb stays live.
    this.fuseT = -1;
    // A barrel: -1 until something lights the oil, then the seconds it has left; which fire lit it;
    // whether it has gone over onto its side yet; how far it has rolled, for the drawing.
    this.oilT = -1; this.oilWitch = false; this.lying = false; this.spinD = 0;
    this.spillCd = 0;                         // a brazier building its coals back after a spill
    this.axis = (opts && opts.axis) || 'h';   // which way a cage bar's rail runs
    this.deco = !!(opts && opts.deco);        // a cage that is scenery: it never opens
    this.roast = !!(opts && opts.roast);      // a brazier drawn as a campfire with a crocodile on a spit
    // A lantern on the wall (THE DARK): which way the wall it hangs on is, one tile's step.
    this.wall = kind === 'sconce' ? { x: (opts && opts.wx) || 0, y: opts && opts.wy !== undefined ? opts.wy : -1 } : null;
    this.gate = 0;                            // 1 while the opening scene has this bar laid flat
    this.angle = (opts && opts.phase) || 0;
    this.held = false; this.flung = false; this.thrown = false; this.broken = false; this.dead = false;
    this.rung = 0; this.lastLunge = -1; this.phase = Math.random() * 10;
    // A stand of arms: which one it holds, whether it is still in the stand, how it turns in the
    // air, and who it has already been through on this throw.
    this.weapon = (opts && opts.weapon) || 'sword';
    this.inStand = kind === 'weapon'; this.spin = 0; this.passed = [];
    // What this one has left in it. A blade is one throw; a shield is three men or three bullets.
    this.uses = kind === 'weapon' ? (P.weapon.uses[this.weapon] || 1) : 0;
    this.vertical = opts && opts.vertical; this.open = 0; this.pressure = 0; this.wobble = 0;
    // Iron: barred from the far side, three blows, and a level puts a couple of them in its
    // corridors. `vault` is the soul door on top of that — the one with a soul behind it, worth a
    // fourth blow and drawn so that nobody mistakes it for the iron door they passed two rooms ago.
    // `stair` is the iron door at the top of every level, `gate` the barred one on level one that
    // opens for a swallowed soul and for nothing else — the only door in the game a headbutt cannot
    // answer, which is what makes the soul behind it the answer.
    this.iron = !!(opts && opts.iron); this.vault = !!(opts && opts.vault);
    this.stair = !!(opts && opts.stair); this.gate = !!(opts && opts.gate);
    // Which room's soul lifts a gate: a level has two of them (`gates` on the level).
    this.gateRoom = (opts && opts.gateRoom !== undefined) ? opts.gateRoom : -1;
    this.shopGate = !!(opts && opts.shopGate);   // the mouse's gate: a talisman lifts it, not a soul
    // A clamp (`game.updateClamps`): the plate bolted over the mouth of a room left behind. `span`
    // is how many tiles of mouth it covers and `slam` the beat it takes to drive home.
    this.span = (opts && opts.span) || 2;
    // A coop: which animal is inside it. Every animal on our side starts shut in one (`Beast`).
    this.holds = (opts && opts.holds) || 'chicken';
    this.slam = kind === 'clamp' ? TUNING.clamp.slam : 0;
    // A sealed arena's pair of doors: no hit points either, the same as the soul gate, but lifted by
    // clearing the room rather than by a soul. `sealRoom` names which room's fight has to end first.
    this.seal = !!(opts && opts.seal); this.sealRoom = (opts && opts.sealRoom !== undefined) ? opts.sealRoom : -1;
    // The door that is already closing. It stands open — `open` 1 is a door swung clear of the gap,
    // and `blocking`/`opaque` both read that, so while the count runs it is not in the room at all —
    // and `clockRoom` is the room in front of it whose first sighting starts the count.
    // The room this door is the way out of (a corridor door or the stairs'): when every man put in
    // that room is down, it opens on its own (`game.updateClearDoors`). -1 for everything else.
    this.fromRoom = (opts && opts.fromRoom !== undefined) ? opts.fromRoom : -1;
    this.timed = !!(opts && opts.timed);
    this.clockRoom = (opts && opts.clockRoom !== undefined) ? opts.clockRoom : -1;
    this.clock = this.timed ? TUNING.prop.door.clockFor : 0;
    if (this.timed) this.open = 1;
    // The one table that is the ritual altar rather than furniture: same kind, same blocking and
    // headbutt handling as any other table, tagged only so the painted layer draws it as itself.
    this.isAltar = !!(opts && opts.altar);
    // A spike plate sits in the floor doing nothing until the goat crosses it: 'idle' waiting,
    // 'armed' counting down under his hooves, 'up' with the teeth out, then 'down' and a rest.
    this.spikeState = 'idle'; this.spikeT = 0; this.hits = 0;
    this.graze = 0;   // heal only: seconds the goat has stood in it, still and near, unbroken
    this.fullTold = false;   // heal only: said FULL once this visit, so standing there does not spam it
    // heal only: the rarer patch of grass a secret sometimes gives up instead of the rack alone,
    // worth two hearts and painted as grass rather than the ordinary milk bowl.
    this.big = !!(opts && opts.big);
    // The mouse's pail: hearts still in it. A drink a heart, drunk where it stands, and it is empty
    // and gone on the last one. It is one object rather than the three bowls it used to be, because a
    // huge bucket of milk says what it is and three bowls needed a caption to.
    this.pail = (opts && opts.pail) || 0;
    // A secret's own patch of wall colour, carried on the prop because the renderer never otherwise
    // reaches back to the level's palette mid-draw. Falls back to level one's colours; gen.js always
    // supplies the real ones.
    this.wallColor = (opts && opts.wallColor) || '#7c5a36'; this.wallTop = (opts && opts.wallTop) || '#9c7446';
    // A secret's own three tiles, so that knocking it through can light what is behind it for good.
    this.nicheTiles = (opts && opts.nicheTiles) || null;
    // Which of the room's walls a secret was carved from: 'up' reads as a top wall (the painted art
    // gives it the coping band an ordinary top wall gets), 'down' as a bottom wall (it does not).
    this.wallSide = (opts && opts.wallSide) || null;
    // The bird: 'loose' walking with the goat, 'flying' once he has put his head under her, and
    // 'stunned' for the beat after she has hit something that was not a man. `target` is whoever
    // she picked at the kick and is steering at; `flap` and `bob` are hers alone and are drawn.
    this.birdState = 'loose'; this.target = null; this.flap = 0; this.bob = Math.random() * 6;
    this.birdT = 0; this.wanderA = Math.random() * Math.PI * 2;
  }
  // What the goat can pick up and throw: it is carried, not held down, and it blocks nothing. A
  // loose hen counts too — the same mouth that takes a crate takes her — but not mid-flight or
  // stunned, since a bird already on her way to a man is not a thing you can also be carrying.
  get item() { return (this.kind === 'crate' && !this.noGrab) || this.kind === 'weapon' || this.kind === 'bomb' || (this.kind === 'chicken' && this.birdState === 'loose')
    // A tortoise on its feet is picked up like a crate; one that has just landed has pulled its head
    // in and is a piece of the room instead (`blocking`, below) until it comes out of it again.
    || (this.kind === 'tortoise' && !this.flying && !(this.tuckT > 0) && !(this.coolT > 0)); }
  get blocking() {
    if (this.broken) return false;
    // Nothing stands on a plate's shoulders: it is floor until it is teeth. A loose bird is not
    // furniture either — she is got out of the way of, not walked into.
    // A clamp is drawn over stone that is already stone: the tiles under it are what stop you.
    // The cave's stone teeth are the same kind of thing as a plate: a hazard you can walk into and
    // not a wall you cannot. A spike you cannot reach cannot cut you, and cutting is all it does.
    // A tortoise is the one escort that IS furniture. Where a throw puts it down it pulls its head
    // in for `tuck` seconds and is a shell: a body stops against it, a round stops on it, and it
    // cannot be picked up again until it comes out — which is what makes the throw a decision about
    // cover rather than a way of carrying it about. See js/beasts.js.
    if (this.kind === 'tortoise') return !this.flying && this.tuckT > 0 && !this.held && !(this.coolT > 0);
    if (this.kind === 'goose' || this.kind === 'crow' || this.kind === 'horse') return false;
    // A lantern on the wall is up on the stone, out of anybody's way.
    if (this.item || this.kind === 'heal' || this.kind === 'spike' || this.kind === 'spire' || this.kind === 'chicken' || this.kind === 'mouse' || this.kind === 'ware' || this.kind === 'clamp' || this.kind === 'shrooms' || this.kind === 'sconce') return false;
    if (this.kind === 'door') return this.open < 0.5;
    return true;
  }
  get stopsBullets() { return !this.broken && ((this.kind === 'tortoise' && !this.flying && !this.held && !(this.coolT > 0)) || this.kind === 'table' || this.kind === 'barrel' || this.kind === 'rock' || this.kind === 'brazier' || this.kind === 'bell' || this.kind === 'secret' || (this.kind === 'door' && this.open < 0.5)); }
  // What an eye stops at. A shut door is a wall with hinges, and a man on the far side of one used
  // to spot you straight through it and come round — which from where you were standing was being
  // seen through stone. The gong and the hub of the wheel are the only other two things in a room
  // solid enough and tall enough to stand behind. Everything else — a table, a lamp post, a bowl of
  // coals, the bars of a pen — you can see over or between, and so can he.
  get opaque() {
    if (this.broken) return false;
    if (this.kind === 'door') return this.open < 0.5;
    return this.kind === 'bell' || this.kind === 'mill' || this.kind === 'secret';
  }

  fling(vx, vy, thrown) {
    this.vx = vx; this.vy = vy; this.flung = true; this.thrown = thrown; this.held = false; this.passed.length = 0;
    // A bomb is actually armed at `tryGrab`, the moment it is in the goat's mouth, not here — high
    // risk, high reward, since there is no button for it beyond grab and release. This is only the
    // belt to that brace, in case something ever flings one that was never held.
    if (this.kind === 'bomb' && this.fuseT < 0) this.fuseT = TUNING.prop.bomb.fuse;
  }

  headbutt(game, ax, ay) {
    switch (this.kind) {
      case 'crate': if (!this.held) this.fling(ax * TUNING.goat.headbutt.propImpulse * 0.75, ay * TUNING.goat.headbutt.propImpulse * 0.75, true); break;
      // You do not have to carry it. A horn under the stand sends the blade across the room too.
      case 'weapon': if (!this.held) {
        this.inStand = false;
        this.fling(ax * TUNING.goat.headbutt.propImpulse * 0.85, ay * TUNING.goat.headbutt.propImpulse * 0.85, true);
        game.audio.sfxSteel();
      } break;
      case 'bell': this.ring(game); break;
      case 'door': case 'secret': this.smash(game, ax, ay); break;
      case 'rock': this.crackRock(game); break;
      case 'table': this.shove(game, ax, ay); break;
      case 'barrel': this.roll(game, ax, ay, TUNING.prop.barrel.roll); break;
      case 'lamp': this.topple(game, ax, ay); break;
      case 'brazier': this.spill(game, ax, ay); break;
      case 'cage': if (this.deco) this.breakDeadCage(game); else this.breakCage(game); break;
      case 'coop': this.breakCoop(game); break;
      case 'chicken': this.kick(game, ax, ay); break;
      // The trader and her shelf: rough is a strike against her, and the third one is the rat ogre.
      case 'mouse': case 'ware': Shop.provoke(game, this); break;
      default: this.wobble = 0.3; game.audio.sfxThud(); break;
    }
  }

  // Coals knocked out of the bowl. A blow on a brazier — a horn, or a body arriving at speed —
  // throws a spill of fire out of the far side of it, so the brazier is a thing you can use with
  // your head and not only a thing to throw a man into. It is short and it is one tile wide: a line
  // you draw across a doorway for a beat, and the bowl has to build its heat back before the next.
  spill(game, ax, ay) {
    if (this.broken) return;
    const B = TUNING.prop.brazier;
    this.wobble = 0.3;
    if (this.spillCd > 0) { game.audio.sfxThud(); return; }
    this.spillCd = B.spillCd;
    const l = Math.hypot(ax, ay) || 1; ax /= l; ay /= l;
    const px = this.x + ax * B.spillAt * TILE, py = this.y + ay * B.spillAt * TILE;
    game.world.ignitePool(px, py, B.spill, false, B.spillTime);
    for (let i = 0; i < 16; i++) {
      const a = Math.atan2(ay, ax) + (Math.random() - 0.5) * 1.4, sp = 120 + Math.random() * 260;
      game.parts.push({ x: this.x + ax * 8, y: this.y + ay * 8 - 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.25 + Math.random() * 0.35, color: Math.random() < 0.5 ? PALETTE.fire : PALETTE.fireHi, size: 2 + Math.random() * 3 });
    }
    game.world.emitNoise(this.x, this.y, TUNING.noise.embers);
    game.audio.sfxFire(); game.shake(3); game.vibe(12);
    game.floatText(this.x, this.y - 30, 'COALS', PALETTE.fire);
  }

  // Down a hole. A crate, a blade, a shield or a table that goes over an edge is gone the way a man
  // is: no shards, no splinters, nothing on the floor to say it was there.
  fall(game) {
    if (this.broken) return;
    this.broken = true; this.dead = true; this.flung = false; this.thrown = false; this.vx = 0; this.vy = 0;
    if (game.goat.holding === this) game.goat.holding = null;
    if (this.kind === 'barrel') this.unHazard(game);
    game.particles(this.x, this.y, 8, PALETTE.ink, 110); game.audio.sfxSwing();
  }

  // What a thing in flight does to the furniture it lands on. A lamp goes over and pours its oil
  // the way it was hit, a gong rings, and everything else is as solid as a wall: the room is real
  // to a thrown crate and a thrown blade, not only to a man. Returns the prop hit, or null.
  hitProp(game, nx, ny) {
    for (const p of game.props) {
      if (p === this || !p.blocking) continue;
      const dx = this.x - p.x, dy = this.y - p.y, d = Math.hypot(dx, dy), pen = p.r + this.r - d;
      if (pen <= 0) continue;
      if (p.kind === 'lamp') { p.topple(game, nx, ny); return p; }
      if (p.kind === 'bell') p.ring(game);
      // Out of the thing it hit, so a bounce does not spend the next frame inside it.
      this.x += dx / (d || 1) * pen; this.y += dy / (d || 1) * pen;
      return p;
    }
    return null;
  }

  // Seven blows. A headbutt can reach two or three bars at once, so the pen counts blows and not
  // bars. He shouts through every one of them, and the third and the sixth put him on the floor:
  // getting out of the pen is the hardest thing he does all run, and it should look like it.
  breakCage(game) {
    // The first pen of a browser is seven blows and two falls. Every pen after it is two: the goat
    // has done this before, the player has done this before, and making him do it again is a toll
    // rather than a lesson. `strain` shrinks with it, so the lines still count down to OUT.
    const C = TUNING.prop.cage, again = !!game.penBroken;
    const need = again ? C.againHits : C.hits;
    const strain = again ? C.againStrain : C.strain;
    const bars = game.props.filter((p) => p.kind === 'cage' && !p.broken && !p.deco);
    if (!bars.length) return;
    if (game.cageLunge === game.goat.lungeId) return;
    game.cageLunge = game.goat.lungeId;
    const hits = (bars[0].hits || 0) + 1;
    for (const p of bars) { p.hits = hits; p.wobble = 0.3; }
    if (hits < need) {
      game.world.emitNoise(this.x, this.y, TUNING.noise.cage * 0.35);
      game.audio.sfxCageHit(); game.shake(5 + hits); game.hitstop(0.04); game.vibe(25);
      game.particles(this.x, this.y, 6 + hits, PALETTE.bone, 230);
      game.kick(0, -1, TUNING.juice.kick * 0.6);
      // The voice climbs with the effort. By the sixth he is not bleating, he is roaring.
      game.audio.sfxBleat(210 + hits * 28, 0.09 + hits * 0.016, 0.26 + hits * 0.03);
      game.floatText(this.x, this.y - 30, strain[hits - 1] || 'IT HOLDS', PALETTE.bone);
      if (!again && C.stunAt.indexOf(hits) >= 0) {
        game.stunGoat(C.stun);
        game.floatText(game.goat.x, game.goat.y - 48, 'HIS HEAD RINGS', PALETTE.blood);
      }
      return;
    }
    let n = 0;
    for (const p of game.props) {
      if (p.kind !== 'cage' || p.broken || p.deco) continue;
      p.broken = true; p.dead = true; n++;
      game.renderer?.painted?.brokenPost(game,p);
      game.particles(p.x, p.y, 5, PALETTE.ash, 210);
      game.world.dot(p.x + (Math.random() - 0.5) * 12, p.y + 5, 2.4, '#2e2a26');
    }
    if (!n) return;
    game.cageOpen = true; game.notePenBroken();
    game.cageThought = TUNING.cageThought;
    game.world.emitNoise(this.x, this.y, TUNING.noise.cage);
    game.audio.sfxCage(); game.shake(12); game.hitstop(0.06); game.vibe(50);
    game.flash(PALETTE.bone, 0.3); game.zoomPunch(1.5);
    game.slowTimer = Math.max(game.slowTimer, 0.4);
    game.audio.sfxBleat(430, 0.22, 0.55);
    game.floatText(this.x, this.y - 30, strain[need - 1] || 'OUT', PALETTE.fireHi);
  }

  // The other cage. Three blows, nothing taken out of him for them, and no prompt on the floor
  // asking for it: the pen taught the verb the hard way and this is what having learned it is worth.
  // What it is worth is the last line, which is the only thing the room ever says about the sheep.
  breakDeadCage(game) {
    const C = TUNING.prop.deadCage, need = C.hits;
    const bars = game.props.filter((p) => p.kind === 'cage' && !p.broken && p.deco);
    if (!bars.length) return;
    if (game.deadCageLunge === game.goat.lungeId) return;
    game.deadCageLunge = game.goat.lungeId;
    const hits = (bars[0].hits || 0) + 1;
    for (const p of bars) { p.hits = hits; p.wobble = 0.3; }
    if (hits < need) {
      game.world.emitNoise(this.x, this.y, TUNING.noise.cage * 0.3);
      game.audio.sfxCageHit(); game.shake(4); game.hitstop(0.03); game.vibe(18);
      game.particles(this.x, this.y, 5 + hits, PALETTE.bone, 200);
      game.audio.sfxBleat(230 + hits * 24, 0.08, 0.22);
      game.floatText(this.x, this.y - 28, C.strain[hits - 1] || 'IT HOLDS', PALETTE.bone);
      return;
    }
    for (const p of game.props) {
      if (p.kind !== 'cage' || p.broken || !p.deco) continue;
      p.broken = true; p.dead = true;
      game.renderer?.painted?.brokenPost(game,p);
      game.particles(p.x, p.y, 5, PALETTE.ash, 200);
      game.world.dot(p.x + (Math.random() - 0.5) * 12, p.y + 5, 2.2, '#2e2a26');
    }
    game.world.emitNoise(this.x, this.y, TUNING.noise.cage * 0.7);
    game.audio.sfxCage(); game.shake(8); game.hitstop(0.05); game.vibe(35);
    game.audio.sfxBleat(300, 0.18, 0.5);
    game.floatText(this.x, this.y - 30, C.done, PALETTE.blood);
  }

  // The crate. It is furniture until the goat has crossed it: his own weight trips the catch and the
  // lid goes over a moment later, so what it takes is the ground he has just left — which is the one
  // piece of floor whoever is chasing him is looking at least.
  updateSpike(dt, game) {
    const S = TUNING.prop.spike, g = game.goat;
    this.spikeT -= dt;
    if (this.spikeState === 'armed') {
      if (this.spikeT <= 0) {
        this.spikeState = 'up'; this.spikeT = S.up; this.bit = [];
        // Boards first, then the iron: the lid is what you hear go, and it is louder than the teeth.
        game.world.emitNoise(this.x, this.y, TUNING.noise.swing);
        game.audio.sfxCrack(); game.audio.sfxSteel(); game.shake(3);
        game.particles(this.x, this.y, 5, PALETTE.wood, 150);
        game.particles(this.x, this.y, 5, PALETTE.ash, 130);
      }
    } else if (this.spikeState === 'up') {
      this.bite(game);
      if (this.spikeT <= 0) { this.spikeState = 'down'; this.spikeT = S.down; }
    } else if (this.spikeState === 'down') {
      if (this.spikeT <= 0) { this.spikeState = 'rest'; this.spikeT = S.rest; }
    } else if (this.spikeT <= 0 && this.tripped(game)) {
      this.spikeState = 'armed'; this.spikeT = S.arm;
      game.audio.sfxThud();
    }
  }
  // Who sets one off. The goat, and now anybody chasing him: a grate that only answered to the goat
  // was a tool with a switch on it, and a man could stand on the boards over the teeth all day. The
  // dead are the exception, because nothing under the floor reaches something that is not there.
  tripped(game) {
    const S = TUNING.prop.spike, g = game.goat;
    if (!g.dead && len(g.x - this.x, g.y - this.y) < S.trigger * TILE) return true;
    // Only the men who ran this step (`game.liveEnemies`): a man frozen two rooms away is not
    // walking onto anything, and asking the level's whole cast once per grate, three times a step,
    // was the most expensive thing in the simulation on a late floor.
    for (const e of game.liveEnemies) {
      if (e.dead || e.ghosted || e.held) continue;
      if (len(e.x - this.x, e.y - this.y) < S.trigger * TILE) return true;
    }
    return false;
  }
  // Everything standing on the crate when the lid goes, goat included. A man dies on it; the goat
  // pays the same heart the Mill charges, and the crate does not ask him twice.
  bite(game) {
    const S = TUNING.prop.spike;
    const bit = this.bit || (this.bit = []);
    for (const e of game.liveEnemies) {
      if (e.dead || e.ghosted || bit.indexOf(e) >= 0) continue;
      if (len(e.x - this.x, e.y - this.y) > this.r + e.r) continue;
      bit.push(e);
      // A man in your mouth is standing on the plate like anybody else, and the teeth take him
      // out of it.
      if (e.held) { game.goat.holding = null; e.held = false; game.goat.spendGrab(game, true); }
      e.die(game, 'spike');
    }
    const g = game.goat;
    if (!g.dead && len(g.x - this.x, g.y - this.y) < this.r + g.r) g.damage(S.damage, game, 0, -40, false, 'spike');
  }
  // The cave's stone teeth, standing at the foot of a wall. The rock everywhere else in a cave is
  // scenery; this is the rare one that is real (`TUNING.cave.spikes`), and the 22 Sep 2026 note is
  // the whole of its design: if something spiky sticks out of the wall, let it hurt. It never moves,
  // never arms and never resets — anything that touches it pays. A man dies on it the way he dies on
  // the grating, which is the point of standing it where a headbutt can put one; the goat pays a
  // heart and his own mercy frames keep him from paying it twice. Everyone with eyes steers round it
  // (`Enemy.hazardAt`), so the men who find it are the ones whose `trapSense` roll went wrong.
  updateSpire(dt, game) {
    if (this.broken) return;
    const C = TUNING.cave.spikes, g = game.goat;
    for (const e of game.liveEnemies) {
      if (e.dead || e.ghosted || (e.spireAt !== undefined && e.spireAt > game.timer - C.again)) continue;
      if (len(e.x - this.x, e.y - this.y) > this.r + e.r * 0.7) continue;
      e.spireAt = game.timer;
      // A man in your mouth is over the rock like anybody else, and the rock takes him out of it.
      if (e.held) { g.holding = null; e.held = false; g.spendGrab(game, true); }
      e.die(game, 'spire');
    }
    if (!g.dead && len(g.x - this.x, g.y - this.y) < this.r + g.r * 0.7) {
      g.damage(C.damage, game, (g.x - this.x) * 3, (g.y - this.y) * 3, false, 'spire');
    }
  }
  // Is the crate a place nobody should be standing? Open, or close enough to open that a man walking
  // on now would be on it when the teeth arrive.
  spikeThreat() {
    return this.spikeState === 'up' || (this.spikeState === 'armed' && this.spikeT <= TUNING.prop.spike.lead);
  }

  // The gong answers back. Every man on the floor now knows where you are — and for the next few
  // seconds the goat runs half again as fast and his hands come back half again as quick, which is
  // exactly the trade you want in a room that already had twelve men in it.
  ring(game) {
    const B = TUNING.prop.bell;
    this.rung = 1.5; game.world.emitNoise(this.x, this.y, TUNING.noise.bell); game.audio.sfxBell();
    game.floatText(this.x, this.y - 30, 'BONNNG', PALETTE.fireHi); game.shake(4);
    game.ring(this.x, this.y, TUNING.noise.bell * TILE, PALETTE.fireHi);
    const g = game.goat;
    if (!g || g.dead) return;
    g.gong = B.buff;
    game.floatText(g.x, g.y - 44, 'THE GONG IS IN HIM', PALETTE.fireHi);
    game.ring(g.x, g.y, 3 * TILE, PALETTE.fireHi); game.flash(PALETTE.fireHi, 0.12); game.vibe(25);
  }

  // Doors. `by` is whoever came through it at speed — the Butcher on a charge — and is spared the
  // fling. Planks go on the first blow: a door in a corridor is a thing you run through. Iron does
  // not, and the whole of its value is that it does not — nobody shoulders it open, so a corridor
  // with one in it is three blows of standing still with whatever heard the first already coming.
  // The soul door is four, and it is the one door in a level that is not on the way anywhere.
  smash(game, ax, ay, by) {
    if (this.broken) return;
    // A patch of wall is not a door: two blows and a crack, not a count of what a door has left.
    if (this.kind === 'secret') { this.crackWall(game); return; }
    // The soul gate is barred from the far side and there is nothing on this one to break. It says
    // so, once per blow, in the language of the thing that opens it.
    if (this.gate) {
      this.wobble = 0.3; game.audio.sfxSteel(); game.shake(3); game.vibe(10);
      game.floatText(this.x, this.y - 28, 'THE SOUL OPENS IT', PALETTE.witchHi);
      game.guideTo(this);
      return;
    }
    // A sealed arena's own pair: barred the same way, and lifted the same way — nothing on this
    // side of it opens it, only the room going quiet does.
    if (this.seal) {
      this.wobble = 0.3; game.audio.sfxSteel(); game.shake(3); game.vibe(10);
      game.floatText(this.x, this.y - 28, 'IT WILL NOT GIVE', PALETTE.bone);
      return;
    }
    const D = TUNING.prop.door;
    const need = this.vault ? D.vaultHits : this.stair ? D.stairHits : this.iron ? D.ironHits : D.hits;
    this.hits = (this.hits || 0) + 1;
    if (this.hits < need) {
      this.wobble = 0.3; this.open = Math.max(this.open, 0);
      game.world.emitNoise(this.x, this.y, TUNING.noise.door * 0.7);
      game.audio.sfxThud(); if (this.iron) game.audio.sfxSteel();
      game.shake(4); game.hitstop(0.02); game.vibe(14);
      game.particles(this.x, this.y, 8, this.iron ? PALETTE.ash : PALETTE.wood, 210);
      // What is left in it, so blows on iron are a count you can see rather than a wall you hit.
      game.floatText(this.x, this.y - 28, (need - this.hits) + ' MORE', this.iron ? PALETTE.bone : PALETTE.ochre);
      return;
    }
    this.broken = true; this.dead = true;
    game.world.emitNoise(this.x, this.y, TUNING.noise.door); game.audio.sfxSplat(); game.shake(5); game.hitstop(0.03);
    game.renderer?.painted?.brokenDoor(game,this);
    game.fx.debris(this,ax,ay);
    if (this.iron) { game.audio.sfxSteel(); game.floatText(this.x, this.y - 30, 'IT GIVES', PALETTE.fireHi); }
    game.particles(this.x, this.y, 16, this.iron ? PALETTE.ash : PALETTE.wood, 260);
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted || e === by) continue;
      const dx = e.x - this.x, dy = e.y - this.y;
      if (Math.hypot(dx, dy) > 2.1 * TILE) continue;
      if ((dx * ax + dy * ay) < -4) continue;
      if (e.kind === 'butcher') { if (e.state !== 'hop') { e.state = 'stagger'; e.timer = 0.35; } }
      else e.fling(ax * 17 * TILE, ay * 17 * TILE, false);
    }
  }

  // A patch of wall that used to be a wall. Two blows, and nothing on the way there says which
  // patch: the crack in it is the only hint the level ever gives, and finding it was the game.
  crackWall(game) {
    const need = TUNING.prop.secret.hits;
    this.hits = (this.hits || 0) + 1;
    if (this.hits < need) {
      this.wobble = 0.3; game.world.emitNoise(this.x, this.y, TUNING.noise.smash * 0.6);
      game.audio.sfxThud(); game.shake(3); game.hitstop(0.02); game.vibe(10);
      game.particles(this.x, this.y, 6, PALETTE.ash, 170);
      game.floatText(this.x, this.y - 26, 'IT CRACKS', PALETTE.ashHi);
      return;
    }
    this.broken = true; this.dead = true;
    // The rock the niche was hiding under goes with the wall (see `startLevel`).
    if (this.nicheTiles) for (const i of this.nicheTiles.slice(1)) game.world.tiles[i] = T.FLOOR;
    game.world.caveDirty();   // an unbroken secret is rock to the cave renderer; this one is not
    game.world.emitNoise(this.x, this.y, TUNING.noise.smash); game.audio.sfxSplat(); game.shake(6); game.hitstop(0.03);
    game.particles(this.x, this.y, 18, PALETTE.ash, 240);
    game.floatText(this.x, this.y - 30, 'A HIDDEN NICHE', PALETTE.fireHi);
  }

  // A boulder in the cave. `rock.hits` blows and it is rubble, the tile it stood on is floor to the
  // flow field again, and until then it is stone to everything that moves.
  crackRock(game) {
    if (this.broken) return;
    this.hits = (this.hits || 0) + 1;
    if (this.hits < TUNING.prop.rock.hits) {
      this.wobble = 0.3; game.world.emitNoise(this.x, this.y, TUNING.noise.smash * 0.6);
      game.audio.sfxThud(); game.shake(3); game.hitstop(0.02); game.vibe(10);
      game.particles(this.x, this.y, 7, PALETTE.ash, 170);
      return;
    }
    this.broken = true; this.dead = true;
    const w = game.world; w.block[Math.floor(this.y / TILE) * w.W + Math.floor(this.x / TILE)] = 0;
    w.emitNoise(this.x, this.y, TUNING.noise.smash); game.audio.sfxSplat(); game.shake(5); game.hitstop(0.03); game.vibe(14);
    // On the trip the boulders are caps as tall as a man, and they come apart in a cloud of spores.
    if (game.level.def.shroom) {
      game.particles(this.x, this.y, 22, PALETTE.witchHi, 220); game.particles(this.x, this.y, 12, '#e86ad8', 160);
      w.dot(this.x, this.y, this.r * 0.9, 'rgba(120,60,140,0.35)');
      return;
    }
    game.particles(this.x, this.y, 18, PALETTE.ash, 240);
    w.scorch(this.x, this.y, this.r * 1.1, false);
  }

  // Two blows and the slats come off. What walks out is the only thing in the compound on the
  // goat's side, so the break is worth a beat of noise and a line on the floor.
  breakCoop(game) {
    if (this.broken) return;
    const need = TUNING.prop.coop.hits;
    this.hits = (this.hits || 0) + 1;
    if (this.hits < need) {
      this.wobble = 0.35; game.world.emitNoise(this.x, this.y, TUNING.noise.smash * 0.6);
      game.audio.sfxThud(); game.shake(3); game.hitstop(0.02); game.vibe(10);
      game.particles(this.x, this.y, 7, PALETTE.wood, 180);
      return;
    }
    this.broken = true; this.dead = true;
    game.world.emitNoise(this.x, this.y, TUNING.noise.smash);
    game.audio.sfxSplat(); game.shake(5); game.hitstop(0.03); game.vibe(16);
    game.particles(this.x, this.y, 16, PALETTE.wood, 230);
    game.particles(this.x, this.y, 10, PALETTE.hen, 190);
    // Out it comes, loose, at his feet.
    const kind = this.holds || 'chicken';
    const pet = new Prop(this.x, this.y - 6, kind);
    game.props.push(pet);
    // The first of a kind says its own terms over its head (`Beast.PACT`); after that its name will do.
    const told = kind === 'chicken' ? game.henTold : (game.beastTold || {})[kind];
    if (told) { game.audio.sfxAnimal(kind); game.floatText(this.x, this.y - 34, 'A ' + Beast.NAME[kind], PALETTE.hen); }
    else if (kind === 'chicken') game.henFreed(this); else Beast.met(game, pet);
  }

  // A horn under a bird. She is not thrown — there is nothing to pick up and nothing to hold — she
  // is kicked, which is the headbutt doing what it already does to a crate, and she finds her own
  // man on the way. The target is chosen once, off the line she was kicked along, and `updateBird`
  // keeps her steering at it.
  kick(game, ax, ay) {
    if (this.broken || this.birdState === 'flying') return;
    const C = TUNING.prop.chicken;
    const l = Math.hypot(ax, ay) || 1; ax /= l; ay /= l;
    this.birdState = 'flying'; this.birdT = 0;
    this.vx = ax * C.launchSpeed; this.vy = ay * C.launchSpeed;
    this.target = this.pickTarget(game, ax, ay);
    this.passed.length = 0;
    game.audio.sfxCluck && game.audio.sfxCluck();
    game.world.emitNoise(this.x, this.y, TUNING.noise.smash * 0.5);
    game.particles(this.x, this.y, 8, PALETTE.hen, 200);
    game.shake(3); game.vibe(12); game.kick(ax, ay, TUNING.juice.kick * 0.4);
  }

  // Whoever is nearest the line she was kicked along, inside the arc and the range. Everything the
  // rest of the game refuses to hit — the dead, the held, a wraith that is not there — is refused
  // here too, so a kick is never spent on a thing that was never going to be struck.
  pickTarget(game, ax, ay) {
    const C = TUNING.prop.chicken;
    let best = null, bestScore = Infinity;
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy) || 1;
      if (d > C.seekRange * TILE) continue;
      const off = Math.acos(Math.max(-1, Math.min(1, (dx * ax + dy * ay) / d)));
      if (off > C.seekArc / 2) continue;
      const score = d * (1 + off);        // near and ahead beats near and off to one side
      if (score < bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  // Loose she walks with him; flying she steers; stunned she sits where she landed. One method,
  // three states, the way every other prop in here branches on its own kind.
  updateBird(dt, game) {
    if (this.broken) return;
    // In the goat's mouth she goes where his mouth goes — `Goat.update` sets her x/y directly, the
    // same way it does a crate's — so nothing here may also be steering her.
    if (this.held) return;
    if (this.birdState !== 'flying') { Beast.tick(this, dt, game); if (this.broken) return; }
    const C = TUNING.prop.chicken, g = game.goat;
    this.flap += dt * (this.birdState === 'flying' ? 26 : 6);
    this.bob += dt * (this.birdState === 'flying' ? 0 : 4);
    if (this.birdState === 'stunned') {
      this.birdT -= dt;
      if (this.birdT <= 0) { this.birdState = 'loose'; this.vx = 0; this.vy = 0; }
      return;
    }
    if (this.birdState === 'loose') {
      // She keeps the goat company at a distance and only hurries when he has got away from her.
      const dx = g.x - this.x, dy = g.y - this.y, d = Math.hypot(dx, dy) || 1;
      let wx, wy, spd;
      // A man close enough to swing: round behind the goat, quick, before anything else (`Beast.shy`).
      const away = Beast.shy(this, game);
      if (away) {
        if (!away.d) { this.vx = 0; this.vy = 0; return; }
        wx = away.x; wy = away.y; spd = C.followSpeed * TUNING.beast.shySpeed;
      } else if (d > C.followAt * TILE) {
        spd = C.followSpeed * (d > C.followFar * TILE ? 1.5 : 1);
        // Straight at him only when he is close and in sight; otherwise the route the men chase on,
        // round the furniture as well as the stone (`Beast.toGoat`). She used to walk the straight
        // line, which put her nose against the first wall between them and left her there.
        const f = Beast.toGoat(this, game);
        wx = f.x; wy = f.y;
      } else {
        // Close enough: a few steps of her own, so she reads as a bird rather than as a magnet.
        this.wanderA += (Math.random() - 0.5) * 4 * dt;
        wx = Math.cos(this.wanderA); wy = Math.sin(this.wanderA); spd = C.followSpeed * C.wander;
      }
      // She minds the room the way a careful man does: fire, coals, the wheel, raised teeth, a drop.
      const safe = this.henSteer(game, wx, wy);
      if (safe) { this.vx = safe.x * spd; this.vy = safe.y * spd; }
      else { this.vx = 0; this.vy = 0; this.wanderA += Math.PI; }
      this.x += this.vx * dt; this.y += this.vy * dt;
      game.world.collideCircle(this);
      // A bird will not walk down a hole on her own account.
      if (game.world.isPitPx(this.x, this.y)) { this.x -= this.vx * dt; this.y -= this.vy * dt; this.wanderA += Math.PI; }
      return;
    }
    // Flying. She holds her speed — a bird that is aimed and then peters out reads as a dropped
    // ball — and turns onto whoever she has at a fixed rate, so a target behind her is a miss.
    this.birdT += dt;
    if (this.target && (this.target.dead || this.target.held || this.target.ghosted)) this.target = null;
    if (this.target) {
      const dx = this.target.x - this.x, dy = this.target.y - this.y;
      const want = Math.atan2(dy, dx), have = Math.atan2(this.vy, this.vx);
      const turn = Math.max(-C.turn * dt, Math.min(C.turn * dt, angleDiff(have, want)));
      const a = have + turn, spd = Math.hypot(this.vx, this.vy);
      this.vx = Math.cos(a) * spd; this.vy = Math.sin(a) * spd;
    }
    const drag = Math.exp(-C.drag * dt);
    this.vx *= drag; this.vy *= drag;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const spd = Math.hypot(this.vx, this.vy) || 1;
    // Into a man: she comes apart on him and takes him with her. That is the whole of the bargain.
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted) continue;
      if (Math.hypot(e.x - this.x, e.y - this.y) > e.r + this.r) continue;
      this.strike(game, e, this.vx / spd, this.vy / spd);
      return;
    }
    // Into anything else: she is a bird, not a blade. She tumbles, lands, and gets up loose again —
    // a miss costs the walk back to her rather than the bird.
    const impact = game.world.collideCircle(this);
    if (impact > 2 || this.hitProp(game, this.vx / spd, this.vy / spd) || this.birdT > C.life) {
      this.land(game); return;
    }
    if (game.world.isPitPx(this.x, this.y)) { this.gone(game); return; }
  }

  // Where a loose hen may step: the direction she wanted if nothing that kills is a stride ahead of
  // her, the nearest turn off it that is clear, and nothing at all if every way on is a hazard. It
  // borrows the men's own `hazardAt`, which only ever needs a position and a radius.
  henSteer(game, dx, dy) {
    const C = TUNING.prop.chicken, look = this.r + C.look * TILE, w = game.world;
    const bad = (ax, ay) => {
      const x = this.x + ax * look, y = this.y + ay * look;
      return w.isSolid(Math.floor(x / TILE), Math.floor(y / TILE)) ? 'wall' : Enemy.prototype.hazardAt.call(this, game, x, y);
    };
    // A way round, once chosen, is kept for `detourFor`: re-deciding every frame turned her back and
    // forth on the lip of a fire, a step each way, and she never got round it at all.
    this.detourT = Math.max(0, (this.detourT || 0) - 1 / 60);
    const base = Math.atan2(dy, dx);
    if (this.detourT > 0) {
      const cx = Math.cos(base + this.detour), cy = Math.sin(base + this.detour);
      if (!bad(cx, cy)) return { x: cx, y: cy };
    }
    const ahead = bad(dx, dy);
    if (!ahead || ahead === 'wall') return { x: dx, y: dy };
    const side = this.detour < 0 ? -1 : 1;     // the side she went round last time, tried first
    for (const off of [0.7, 1.4, 2.2, 2.9]) for (const sg of [side, -side]) {
      const cx = Math.cos(base + off * sg), cy = Math.sin(base + off * sg);
      if (!bad(cx, cy)) { this.detour = off * sg; this.detourT = C.detourFor; return { x: cx, y: cy }; }
    }
    return null;
  }

  // A coop that calls. It used to give on its own once the goat had walked past it and it slid off
  // the trailing edge of the picture; since 25 Sep 2026 it does not ("walled in is walled in"): a
  // coop left shut stays shut, and the clamp takes it with the room (`updateClamps`, `Beast.lost`).
  updateCoop(game, dt) {
    if (this.broken || !game.level || game.state !== 'play') return;
    const own = roomAt(game.level, this.x, this.y);
    if (!own || !own.seen) return;
    // It calls out when he is near, so nobody walks past a crate without knowing something is in it:
    // the one thing in the room that wants him to stop rather than to keep running.
    this.callT = (this.callT || 0) - dt;
    const d = Math.hypot(game.goat.x - this.x, game.goat.y - this.y);
    if (this.callT <= 0 && d < TUNING.beast.callR * TILE && !game.hidden(this.x, this.y)) {
      this.callT = TUNING.beast.callGap * (0.8 + Math.random() * 0.4);
      this.wobble = 0.3;
      game.audio.sfxAnimal(this.holds || 'chicken');
      game.floatText(this.x, this.y - 30, '!', PALETTE.hen);
    }
  }

  // She reaches her man. He dies of it the way anything the room throws at him does, and she is
  // spent: a burst of feathers and gone.
  strike(game, e, nx, ny) {
    game.world.emitNoise(this.x, this.y, TUNING.noise.smash);
    e.die(game, e.kind === 'wraith' ? 'unmade' : 'splat', nx, ny);
    this.broken = true; this.dead = true;
    game.particles(this.x, this.y, 22, PALETTE.hen, 260);
    game.particles(this.x, this.y, 8, PALETTE.comb, 220);
    game.audio.sfxSplat(); game.shake(6); game.hitstop(0.05); game.vibe(28);
    game.kick(nx, ny, TUNING.juice.kick * 0.7);
    game.floatText(this.x, this.y - 30, 'THE HEN', PALETTE.hen);
  }

  // Down in a heap, and up again in a moment.
  land(game) {
    const C = TUNING.prop.chicken;
    this.birdState = 'stunned'; this.birdT = C.stunned;
    this.vx = 0; this.vy = 0; this.target = null;
    game.particles(this.x, this.y, 6, PALETTE.hen, 150);
    game.audio.sfxThud();
  }

  // Over an edge, like everything else that goes over one.
  gone(game) {
    this.broken = true; this.dead = true;
    game.audio.sfxFall && game.audio.sfxFall();
    // An animal of ours going down a hole is a loss and says so, the way one killed does.
    if (Beast.NAME[this.kind]) game.floatText(this.x, this.y - 30, 'THE ' + Beast.NAME[this.kind] + ' FELL', PALETTE.blood);
  }

  // Tables slide, and men they catch ride the impulse into whatever is behind them. `by` is whoever
  // sent it — the Butcher on a charge — and it does not turn round and take him on the way.
  shove(game, ax, ay, by) {
    this.flung = true; this.vx = ax * 21 * TILE; this.vy = ay * 21 * TILE; this.by = by || null;
    game.world.emitNoise(this.x, this.y, TUNING.noise.table); game.audio.sfxThud(); game.shake(3);
  }

  topple(game, ax, ay) {
    if (this.broken) return;
    this.broken = true; this.dead = true;
    const px = this.x + ax * TILE * 0.8, py = this.y + ay * TILE * 0.8;
    game.world.ignitePool(px, py, TUNING.prop.lamp.poolRadius);
    game.world.emitNoise(this.x, this.y, TUNING.noise.smash); game.audio.sfxPot(); game.audio.sfxFire();
    game.particles(px, py, 14, PALETTE.fire, 150); game.shake(3);
  }

  update(dt, game) {
    if (this.rung > 0) this.rung -= dt;
    if (this.wobble > 0) this.wobble -= dt;
    // Let go of over a drop without a throw — a roll, a blink, a stun, the stairs — a crate, a blade
    // or a bomb hung there in the air for good: only a thing in flight ever asked about the hole.
    if ((this.kind === 'crate' || this.kind === 'weapon' || this.kind === 'bomb') && !this.held && !this.broken && !this.flung
      && !this.inStand && game.world.isPitPx(this.x, this.y)) { this.fall(game); return; }
    if (this.kind === 'mill') { this.updateMill(dt, game); return; }
    if (this.kind === 'spike') { this.updateSpike(dt, game); return; }
    if (this.kind === 'spire') { this.updateSpire(dt, game); return; }
    if (this.kind === 'chicken') { this.updateBird(dt, game); return; }
    if (Beast.is(this.kind)) { Beast.update(this, dt, game); return; }
    if (this.kind === 'coop') { this.updateCoop(game, dt); return; }
    if (this.kind === 'mouse' || this.kind === 'ware') { Shop.updateStall(this, dt, game); return; }
    if (this.kind === 'heal' || this.kind === 'cage') return;
    // A tuft of mushrooms is grazed exactly the way milk is: standing over it, still, for
    // `shroom.eatTime`. Walking across one used to eat it on contact, which made the trip something
    // that happened to you on the way past rather than a thing you chose to put in your mouth.
    if (this.kind === 'shrooms') {
      const g = game.goat, H = TUNING.prop.heal;
      if (this.broken || g.dead) { this.graze = 0; return; }
      const near = Math.hypot(g.x - this.x, g.y - this.y) < TUNING.shroom.eatR * TILE
        && Math.hypot(g.vx, g.vy) < H.grazeSpeed;
      this.graze = near ? this.graze + dt : Math.max(0, this.graze - dt * 2);
      if (this.graze >= TUNING.shroom.eatTime) game.eatShrooms(this);
      return;
    }
    if (this.kind === 'clamp') { this.slam = Math.max(0, this.slam - dt); return; }
    if (this.kind === 'brazier') { this.spillCd = Math.max(0, this.spillCd - dt); return; }
    // Fire that reaches a lamp post takes the lamp with it: hay burning up to one tips it over,
    // and the oil goes wherever it falls. The room keeps answering after the first thing lit.
    if (this.kind === 'lamp') {
      if (!this.broken && game.world.isBurningPx(this.x, this.y)) { const a = Math.random() * Math.PI * 2; this.topple(game, Math.cos(a), Math.sin(a)); }
      return;
    }
    if (this.kind === 'weapon') { this.updateWeapon(dt, game); return; }
    if (this.kind === 'bomb') { this.updateBomb(dt, game); return; }
    if (this.kind === 'door') { this.updateDoor(dt, game); return; }
    if (this.kind === 'table') { this.updateTable(dt, game); return; }
    if (this.kind === 'barrel') { this.updateBarrel(dt, game); return; }
    // A thrown crate. It is the one thing you lift off the floor and put through somebody.
    if (this.kind !== 'crate' || this.broken || this.held || !this.flung) return;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const impact = game.world.collideCircle(this);
    const spd = Math.hypot(this.vx, this.vy);
    // Coming down over a hole: it goes down it, and nothing breaks.
    if (spd < 40 && game.world.isPitPx(this.x, this.y)) { this.fall(game); return; }
    // Through a fire it catches and keeps flying (25 Sep 2026): a box alight is a brand you throw,
    // and where it breaks — on stone, on a man, on the floor — it leaves one tile burning. It used
    // to go up where it met the flame, two tiles round; the barrel is the one that spreads.
    if (!this.alight && game.world.isBurningPx(this.x, this.y)) this.alight = game.world.isWitchPx(this.x, this.y) ? 'witch' : 'fire';
    if (this.alight && Math.random() < dt * 30) game.particles(this.x, this.y - 6, 1, this.alight === 'witch' ? PALETTE.witchHi : PALETTE.fireHi, 60);
    const end = () => (this.alight ? this.burst(game, this.alight === 'witch') : this.shatter(game));
    if (impact > 2 * TILE || spd < 40) { end(); return; }
    // A shut door, a table or a gong is not something a crate flies through. It breaks on it — and
    // on a lamp it breaks the lamp, which is how you start a fire across a room. A brazier is the
    // one prop that answers a crate the way a burning tile already does: it goes up rather than
    // just breaking, since a box that reaches the coals themselves has reached fire either way.
    const hitP = this.hitProp(game, this.vx / (spd || 1), this.vy / (spd || 1));
    if (hitP && hitP.kind === 'brazier') { this.burst(game, this.alight === 'witch'); return; }
    if (hitP) { end(); return; }
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted) continue;
      if (Math.hypot(e.x - this.x, e.y - this.y) < e.r + this.r) {
        // A crate that catches a wraith in its window is as good as a horn.
        if (e.kind === 'wraith') { e.die(game, 'unmade', this.vx / 300, this.vy / 300); this.shatter(game); return; }
        // GRAVEDIGGER'S SPADE III: a thrown body at killing speed kills like a live one.
        if (this.corpse && Talisman.corpseHit(game, this, e, spd)) { this.shatter(game); return; }
        // A crate in the face is not a trip. He goes down properly, and he stays down seeing stars.
        // Never out of the air: an ogre knocked down mid-leap over a drop fell into it.
        if (e.kind === 'butcher') { if (e.state !== 'hop') { e.state = 'stagger'; e.timer = 0.45; } }
        else {
          const stun = TUNING.prop.crate.stun;
          e.state = 'floored'; e.timer = stun; e.dazed = Math.max(e.dazed, stun);
          e.vx = this.vx * 0.3; e.vy = this.vy * 0.3; e.aware = true;
          game.floatText(e.x, e.y - 28, 'STUNNED', PALETTE.fireHi);
          Status.stunned(game, e);
        }
        game.hitstop(0.04); game.shake(4); game.kick(this.vx / 300, this.vy / 300, TUNING.juice.kick * 0.5);
        if (this.alight && e.ignite) e.ignite(game, this.alight === 'witch');
        end(); return;
      }
    }
  }

  // A burning crate breaking: one tile of flame where it comes apart, for `burstTime`, of whichever
  // kind lit it — witchfire stays witchfire. The barrel's oil is what spreads (`oilBurst`); a box
  // of boards is a single fire (25 Sep 2026: "the crate only one tile").
  burst(game, witch) {
    if (this.broken) return;
    const C = TUNING.prop.crate, w = game.world;
    w.ignite(Math.floor(this.x / TILE), Math.floor(this.y / TILE), true, C.burstTime, witch);
    game.audio.sfxThud(); game.shake(3); game.vibe(15);
    game.particles(this.x, this.y, 12, witch ? PALETTE.witchHi : PALETTE.fireHi, 200);
    game.world.emitNoise(this.x, this.y, TUNING.noise.smash);
    this.shatter(game);
  }

  // A blade that has done its work, or a shield that has taken its last. Neither is picked up again:
  // what a stand of arms hands you is a moment, not a tool you carry through the level.
  snap(game) {
    if (this.broken) return;
    this.broken = true; this.dead = true; this.flung = false; this.thrown = false;
    if (game.goat.holding === this) game.goat.holding = null;
    game.audio.sfxSteel(); game.shake(3);
    game.particles(this.x, this.y, 13, this.weapon === 'sword' ? PALETTE.bone : PALETTE.ash, 220);
    for (let i = 0; i < 3; i++) game.world.dot(this.x + (Math.random() - 0.5) * 22, this.y + (Math.random() - 0.5) * 14, 2.4, '#3a3630');
    game.floatText(this.x, this.y - 30, this.weapon === 'sword' ? 'SNAPPED' : 'SPLINTERED', PALETTE.ashHi);
  }

  // A thrown blade or shield. It travels, it bites, and then it is finished: nothing here survives
  // being used, so crossing a room for a stand is a decision rather than a habit.
  updateWeapon(dt, game) {
    if (this.broken || this.held || !this.flung) return;
    const W = TUNING.prop.weapon;
    this.spin += dt * (this.weapon === 'sword' ? 24 : 14);
    const drag = Math.exp(-W.drag * dt);
    this.vx *= drag; this.vy *= drag;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const impact = game.world.collideCircle(this);
    // A shut door, a brazier, a table, the hub of the wheel: as much a wall to a blade as stone is.
    // A lamp goes over instead, and a gong rings.
    const spd0 = Math.hypot(this.vx, this.vy) || 1;
    const hit = spd0 > W.stickImpact ? this.hitProp(game, this.vx / spd0, this.vy / spd0) : null;
    if (impact > W.stickImpact || (hit && hit.kind !== 'lamp')) {
      // Into a wall: a blade thrown at stone is a blade thrown away. A shield only rings off it.
      game.audio.sfxSteel(); game.particles(this.x, this.y, 5, PALETTE.bone, 170);
      // A blade into stone is a blow spent, not always the blade: it drops there with what is left.
      if (this.weapon === 'sword') {
        this.vx = 0; this.vy = 0; this.flung = false; this.thrown = false;
        if (--this.uses <= 0) this.snap(game); else game.floatText(this.x, this.y - 28, 'NOTCHED', PALETTE.ashHi);
        return;
      }
      // A shield does not stick, it rings off — and off a wall keeps enough of its speed to reach a
      // second one, which is what makes it worth throwing at a room rather than at one man in it.
      this.vx *= -W.shieldBounce; this.vy *= -W.shieldBounce;
    } else if (!hit) {
      // Too slow to be a blow, still a thing that cannot pass through furniture: below `stickImpact`
      // nothing was asked at all, and a blade arriving at a shut door at a walk went through it and
      // killed the man leaning on the far side. It stops against it (a shield rings back off it),
      // with no blow spent and nothing knocked over.
      for (const p of game.props) {
        if (p === this || !p.blocking || p.kind === 'lamp' || p.kind === 'bell') continue;
        const dx = this.x - p.x, dy = this.y - p.y, d = Math.hypot(dx, dy), pen = p.r + this.r - d;
        if (pen <= 0) continue;
        this.x += dx / (d || 1) * pen; this.y += dy / (d || 1) * pen;
        if (this.weapon === 'sword') { this.vx = 0; this.vy = 0; this.flung = false; this.thrown = false; return; }
        this.vx *= -W.shieldBounce; this.vy *= -W.shieldBounce;
        break;
      }
    }
    const spd = Math.hypot(this.vx, this.vy);
    if (spd <= W.restSpeed) {
      this.flung = false; this.thrown = false; this.vx = 0; this.vy = 0;
      // Come to rest over a hole, it is gone: anything thrown through one is.
      if (game.world.isPitPx(this.x, this.y)) this.fall(game);
      return;
    }
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted || this.passed.indexOf(e) >= 0) continue;
      if (Math.hypot(e.x - this.x, e.y - this.y) > e.r + this.r) continue;
      this.hitMan(game, e, spd);
      if (!this.flung || this.broken) return;
    }
  }

  // The sword goes into the first man it finds and stays there. The shield does not cut: it flattens
  // whoever it catches and carries on through the rest of them.
  hitMan(game, e, spd) {
    const W = TUNING.prop.weapon, nx = this.vx / (spd || 1), ny = this.vy / (spd || 1);
    this.passed.push(e);
    game.world.emitNoise(this.x, this.y, TUNING.noise.steel);
    if (this.weapon === 'sword') {
      e.byBlade = true;   // the cup and the grease count the room's kills, not the blade's
      e.die(game, 'splat', nx, ny);
      game.gore(this.x, this.y, 6, nx, ny); game.audio.sfxSplat();
      game.shake(6); game.hitstop(0.05); game.kick(nx, ny, TUNING.juice.kick);
      this.flung = false; this.thrown = false; this.vx = 0; this.vy = 0;   // it is in him now
      this.x = e.x; this.y = e.y;
      if (--this.uses <= 0) this.snap(game);                               // and it stays in him
      return;
    }
    if (e.kind === 'butcher') { if (e.state !== 'hop') { e.state = 'stagger'; e.timer = 0.5; } e.aware = true; this.vx *= -0.25; this.vy *= -0.25; }
    else {
      e.state = 'floored'; e.timer = W.shieldStun; e.dazed = Math.max(e.dazed, W.shieldStun); e.aware = true;
      e.vx = nx * 4 * TILE; e.vy = ny * 4 * TILE;
      game.floatText(e.x, e.y - 28, 'FLATTENED', PALETTE.fireHi);
      this.vx *= 0.7; this.vy *= 0.7;
    }
    game.audio.sfxSteel(); game.shake(5); game.hitstop(0.03);
    game.particles(e.x, e.y, 7, PALETTE.bone, 210);
    // Three men is all a shield is good for, and it comes apart on the third.
    if (--this.uses <= 0) this.snap(game);
  }

  // A thrown bomb. It does not break on the first thing it hits the way a crate does — it just
  // stops there, dead, and keeps counting down: `fuseT` was set once, in `fling`, and runs out
  // wherever it happens to be when it does.
  updateBomb(dt, game) {
    if (this.broken) return;
    if (this.flung) {
      this.x += this.vx * dt; this.y += this.vy * dt;
      // Down a hole is not a room this bomb gets to finish: gone like anything else thrown over one.
      if (game.world.isPitPx(this.x, this.y)) { this.fall(game); return; }
      const impact = game.world.collideCircle(this);
      const spd = Math.hypot(this.vx, this.vy) || 1;
      const hit = this.hitProp(game, this.vx / spd, this.vy / spd);
      if (impact > 0 || hit) { this.vx = 0; this.vy = 0; this.flung = false; this.thrown = false; }
      else { const drag = Math.exp(-TUNING.prop.weapon.drag * dt); this.vx *= drag; this.vy *= drag; if (Math.hypot(this.vx, this.vy) < 8) { this.vx = 0; this.vy = 0; this.flung = false; this.thrown = false; } }
    }
    if (this.fuseT < 0) return;
    this.fuseT -= dt;
    if (this.fuseT <= 0) this.explode(game);
  }

  // Falls off from the centre exactly the way the goat's own headbutted-bomb charge does: two
  // hearts inside `nearR`, one heart out to `blastR`, and past `nearR` anything left alive is
  // flung rather than hurt directly — the wall is still what finishes it.
  explode(game) {
    if (this.broken) return;
    this.broken = true; this.dead = true; this.flung = false;
    if (game.goat.holding === this) game.goat.holding = null;
    const B = TUNING.prop.bomb;
    game.fx.explosion(this.x, this.y, B.blastR, false);
    game.world.splat(this.x, this.y, 0, 0, 24); game.world.scorch(this.x, this.y, B.blastR * 0.5);
    game.particles(this.x, this.y, 16, PALETTE.fire, 260);
    game.ring(this.x, this.y, B.blastR, PALETTE.fireHi);
    game.shake(9); game.hitstop(0.05); game.audio.sfxBoom(); game.vibe(35);
    game.world.emitNoise(this.x, this.y, TUNING.noise.boom);
    // Stone stops a blast the way it stops `Status.blast`: a bomb against one side of a wall took a
    // heart off the goat on the other side of it.
    const w = game.world;
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
      if (d > B.blastR + e.r || !w.los(this.x, this.y, e.x, e.y)) continue;
      const nx = dx / (d || 1), ny = dy / (d || 1);
      // The rat ogre is never flung, so the whole of the blast is the one heart it takes off him.
      if (d <= B.nearR || e.kind === 'ratogre') e.die(game, 'splat', nx, ny);
      else e.fling(nx * B.impulse, ny * B.impulse, true);
    }
    const g = game.goat, gd = Math.hypot(g.x - this.x, g.y - this.y);
    if (!g.dead && gd <= B.blastR + g.r && w.los(this.x, this.y, g.x, g.y)) {
      const nx = (g.x - this.x) / (gd || 1), ny = (g.y - this.y) / (gd || 1);
      g.damage(gd <= B.nearR ? B.dmgNear : B.dmgFar, game, nx * 260, ny * 260, false, 'bomb');
    }
  }

  updateDoor(dt, game) {
    if (this.broken) return;
    // The one door that shuts itself. Nothing starts it but being looked at: the count runs from the
    // first moment the goat can see the room it stands at the far end of, so what he sees when he
    // walks in is a way out that is already going. Once it seats it is an ordinary iron door and
    // this branch is done with it forever.
    if (this.timed) {
      const D = TUNING.prop.door;
      const room = game.level && game.level.rooms[this.clockRoom];
      if (!room || !room.seen) return;
      this.clock = Math.max(0, this.clock - dt);
      // It will not shut on anybody. A body in the gap holds it at a hair over the blocking line the
      // way a real one would — the crowd on your heels props your own way out open for a moment —
      // and it seats as soon as the gap is clear.
      const near = (b) => b && !b.dead && Math.hypot(b.x - this.x, b.y - this.y) < b.r + this.r * 0.5;
      const blocked = near(game.goat) || game.enemies.some((e) => !e.ghosted && !e.held && near(e));
      const t = Math.pow(this.clock / D.clockFor, D.clockEase);
      this.open = blocked ? Math.max(t, 0.52) : t;
      if (this.open <= 0) {
        this.open = 0; this.timed = false;
        game.audio.sfxThud(); game.audio.sfxSteel(); game.shake(3);
      }
      return;
    }
    if (this.open > 0 && this.open < 1) this.open = Math.min(1, this.open + dt * 3);
    if (this.open >= 0.5) return;
    // Iron is barred from the far side and nobody on this one has the key. It opens by being broken
    // or it does not open — which is the only reason the thing behind it is still there.
    if (this.iron || this.gate || this.seal) return;
    // Cultists who cannot get through eventually shoulder it open.
    let pressed = false;
    for (const e of game.liveEnemies) {
      if (e.dead || e.held || e.ghosted || !e.aware) continue;
      if (Math.hypot(e.x - this.x, e.y - this.y) < e.r + this.r + 6) { pressed = true; break; }
    }
    this.pressure = pressed ? this.pressure + dt : Math.max(0, this.pressure - dt * 2);
    if (this.pressure >= TUNING.prop.door.openPressure) {
      this.open = 0.01; this.pressure = 0;
      game.world.emitNoise(this.x, this.y, TUNING.noise.swing); game.audio.sfxSwing();
    }
  }

  updateTable(dt, game) {
    // Shouldered or shoved over an edge, a table goes down it like anything else.
    if (game.world.isPitPx(this.x, this.y)) { this.fall(game); return; }
    if (!this.flung) { game.world.collideCircle(this); return; }
    const cfg = TUNING.prop.table;
    const drag = Math.exp(-cfg.drag * dt);
    this.vx *= drag; this.vy *= drag;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const spd = Math.hypot(this.vx, this.vy);
    const impact = game.world.collideCircle(this);
    if (impact > 3 * TILE) { game.shake(3); game.audio.sfxThud(); game.particles(this.x, this.y, 6, PALETTE.wood, 120); }
    // A sliding table is heavy enough to take a shut door off its hinges, and stops on anything
    // else in the room that a man would: a brazier, the wheel, another table.
    if (spd > 1) {
      const nx = this.vx / spd, ny = this.vy / spd, hit = this.hitProp(game, nx, ny);
      // Not a soul gate or a seal, which no blow opens: the table stops on those like on anything
      // else. It used to strike one every frame the two touched, THE SOUL OPENS IT sixteen times over.
      if (hit && hit.kind === 'door' && spd > cfg.killSpeed && !hit.gate && !hit.seal) { hit.smash(game, nx, ny, null); game.shake(4); }
      else if (hit && hit.kind !== 'lamp') {
        this.vx *= -0.2; this.vy *= -0.2;
        game.audio.sfxThud(); game.particles(this.x, this.y, 5, PALETTE.wood, 110);
      }
    }
    if (spd > cfg.killSpeed) {
      const nx = this.vx / spd, ny = this.vy / spd;
      for (const e of game.enemies) {
        if (e.dead || e.held || e.ghosted || e.state === 'flung' || e === this.by) continue;
        if (Math.hypot(e.x - this.x, e.y - this.y) > e.r + this.r + 2) continue;
        if (e.kind === 'butcher') { if (e.state !== 'hop') { e.state = 'stagger'; e.timer = 0.3; } this.vx *= -0.2; this.vy *= -0.2; }
        else { e.fling(nx * spd * 1.25, ny * spd * 1.25, false); this.vx *= 0.75; this.vy *= 0.75; }
      }
      if (game.world.isBurningPx(this.x, this.y)) game.world.ignitePx(this.x, this.y, true);
    }
    if (spd < 30) { this.flung = false; this.vx = 0; this.vy = 0; this.by = null; }
  }

  // A barrel set rolling: by a horn, by a body thrown into it, by another barrel or by a charging
  // Butcher. It goes over onto its side the first time and stays there, and a horn can send it on
  // again. `by` is whoever sent it, and it does not bowl him over on the way out.
  roll(game, ax, ay, speed, by) {
    if (this.broken) return;
    const l = Math.hypot(ax, ay) || 1;
    this.vx = ax / l * speed; this.vy = ay / l * speed;
    this.flung = true; this.lying = true; this.by = by || null; this.passed.length = 0;
    const B = TUNING.prop.barrel; this.staveN = Math.floor(this.spinD / (B.spinEvery * B.staveEvery * TILE));
    game.world.emitNoise(this.x, this.y, TUNING.noise.table);
    game.audio.sfxThud(); game.particles(this.x, this.y + this.r * 0.5, 5, PALETTE.wood, 90);
  }

  // The oil has caught. It says so, and it has `fuse` seconds before it goes up wherever it is.
  light(game, witch) {
    if (this.broken || this.oilT >= 0) return;
    this.oilT = TUNING.prop.barrel.fuse; this.oilWitch = !!witch;
    game.audio.sfxFire();
    game.floatText(this.x, this.y - 30, 'OIL', witch ? PALETTE.witchHi : PALETTE.fireHi);
  }

  updateBarrel(dt, game) {
    const B = TUNING.prop.barrel, w = game.world;
    if (this.broken) return;
    // A flame under it, or a burning man leaning on it: either lights the oil.
    if (this.oilT < 0) {
      if (w.isBurningPx(this.x, this.y)) this.light(game, w.isWitchPx(this.x, this.y));
      else for (const e of game.liveEnemies) {
        if (e.dead || !(e.burning > 0) || Math.hypot(e.x - this.x, e.y - this.y) > e.r + this.r + 2) continue;
        this.light(game, e.witchBurn); break;
      }
    } else if ((this.oilT -= dt) <= 0) { this.oilBurst(game); return; }
    if (w.isPitPx(this.x, this.y)) { this.fall(game); return; }
    if (!this.flung) { w.collideCircle(this); return; }
    const drag = Math.exp(-B.drag * dt);
    this.vx *= drag; this.vy *= drag;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.spinD += Math.hypot(this.vx, this.vy) * dt;
    // A clatter that slows as the barrel does, and says from out of sight that it is still coming.
    const turn = Math.floor(this.spinD / (B.spinEvery * B.staveEvery * TILE));
    if (turn !== this.staveN) { this.staveN = turn; game.audio.sfxStave(Math.min(1, Math.hypot(this.vx, this.vy) / B.roll)); }
    // Stone. Square on and fast, the staves go; glancing, it runs on along the wall.
    const impact = w.collideCircle(this);
    if (impact > B.breakSpeed) { this.smashBarrel(game); return; }
    if (impact > B.stopSpeed * 3) game.audio.sfxThud();
    let spd = Math.hypot(this.vx, this.vy);
    if (spd < B.stopSpeed) { this.flung = false; this.vx = 0; this.vy = 0; this.by = null; return; }
    const nx = this.vx / spd, ny = this.vy / spd;
    // Furniture. A brazier is fire, another barrel takes the roll on like a struck ball, a lamp goes
    // over (`hitProp`), and anything else is a wall that a fast enough barrel breaks on.
    const hit = this.hitProp(game, nx, ny);
    if (hit && hit.kind === 'brazier') { this.oilBurst(game, false); return; }
    if (hit && hit.kind === 'barrel') { hit.roll(game, nx, ny, spd * B.pass, this.by); this.vx *= 0.15; this.vy *= 0.15; }
    else if (hit && hit.kind !== 'lamp') {
      if (spd > B.breakSpeed) {
        if (hit.kind === 'door') hit.smash(game, nx, ny, null); else if (hit.kind === 'rock') hit.crackRock(game);
        this.smashBarrel(game); return;
      }
      this.vx *= -B.rebound; this.vy *= -B.rebound; game.audio.sfxThud();
    }
    // The goat stops it: it was sent for somebody else.
    const g = game.goat, gx = g.x - this.x, gy = g.y - this.y;
    if (!g.dead && Math.hypot(gx, gy) < g.r + this.r && gx * this.vx + gy * this.vy > 0) { this.vx *= -B.rebound; this.vy *= -B.rebound; game.audio.sfxThud(); }
    // Men. Each is bowled along its line and a little off it to the side he stood on, so a row of
    // them scatters rather than riding it in a stack, and each one costs it `keep` of its speed.
    spd = Math.hypot(this.vx, this.vy);
    if (spd < B.knockSpeed) return;
    for (const e of game.liveEnemies) {
      if (e.dead || e.held || e.ghosted || e.state === 'flung' || e === this.by || this.passed.indexOf(e) >= 0) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
      if (d > e.r + this.r + 2) continue;
      this.passed.push(e);
      e.flash = Math.max(e.flash || 0, TUNING.juice.hitFlash);
      game.particles(e.x, e.y, 6, PALETTE.bone, 180); game.audio.sfxThud();
      // Too heavy to bowl: the Butcher staggers and the barrel comes back off him; the ogre does not
      // even do that.
      if (e.kind === 'butcher' || e.kind === 'ratogre') {
        if (e.kind === 'butcher' && e.state !== 'hop') { e.state = 'stagger'; e.timer = B.stagger; }
        e.aware = true; this.vx *= -B.rebound; this.vy *= -B.rebound; return;
      }
      const side = (dx * -ny + dy * nx) / (d || 1) * B.side;
      const fx = nx - ny * side, fy = ny + nx * side, fl = Math.hypot(fx, fy);
      const k = spd * B.fling * (e.knockMul ? e.knockMul() : 1);
      e.fling(fx / fl * k, fy / fl * k, false);
      e.dazed = Math.max(e.dazed || 0, B.daze); Status.stunned(game, e);
      game.kick(nx, ny, TUNING.juice.kick * 0.4);
      this.vx *= B.keep; this.vy *= B.keep;
    }
  }

  // A barrel is in `game.hazards` for the beat its oil is lit, and a broken one is in nobody's way:
  // the goat's tumble and leap read that list without asking whether a thing still stands.
  unHazard(game) { const i = game.hazards.indexOf(this); if (i >= 0) game.hazards.splice(i, 1); }

  // Broken on something: staves, and a fire if the oil was already alight.
  smashBarrel(game) { if (this.oilT >= 0) this.oilBurst(game); else this.shatter(game); }

  // The oil goes up: a crate's burst, wider and longer, of whichever fire lit it.
  oilBurst(game, witch) {
    if (this.broken) return;
    const B = TUNING.prop.barrel;
    if (witch === undefined) witch = this.oilWitch;
    game.fx.explosion(this.x, this.y, B.burst * TILE, witch);
    game.world.ignitePool(this.x, this.y, B.burst, witch, B.burstTime);
    game.audio.sfxBoom(); game.shake(7); game.hitstop(0.05); game.vibe(35);
    game.flash(witch ? PALETTE.witch : PALETTE.fire, 0.22); game.zoomPunch(1.1);
    game.ring(this.x, this.y, B.burst * TILE, witch ? PALETTE.witchHi : PALETTE.fireHi);
    game.particles(this.x, this.y, 20, witch ? PALETTE.witchHi : PALETTE.fireHi, 260);
    game.floatText(this.x, this.y - 28, 'IT GOES UP', witch ? PALETTE.witchHi : PALETTE.fireHi);
    game.world.emitNoise(this.x, this.y, TUNING.noise.boom);
    this.oilT = -1; this.shatter(game);
  }

  // Is this spot under an arm now, or about to be as the wheel comes round? This is what lets a man
  // read the Mill: he checks where the arms will be by the time he gets there, not where they are.
  millThreat(x, y, r, lead) {
    const M = TUNING.mill;
    const dx = x - this.x, dy = y - this.y, d = Math.hypot(dx, dy);
    if (d > M.armLen + r || d < M.innerR - r) return false;
    const ang = Math.atan2(dy, dx);
    const slack = M.armHalfWidth + r / Math.max(d, 12);
    const sweep = M.speed * (lead === undefined ? TUNING.ai.millLead : lead);
    // angleDiff(arm, point) is how much further the arm has to turn to reach the spot.
    for (const a of [this.angle, this.angle + Math.PI]) {
      const diff = angleDiff(a, ang);
      if (diff >= -slack && diff <= slack + sweep) return true;
    }
    return false;
  }

  // Two heavy arms sweeping a circle. Everything caught goes flying, cultists included.
  updateMill(dt, game) {
    const M = TUNING.mill;
    this.angle += M.speed * dt;
    const targets = [game.goat].concat(game.liveEnemies);
    for (const e of targets) if (e && e.millCd > 0) e.millCd -= dt;
    const arms = [this.angle, this.angle + Math.PI];
    for (const e of targets) {
      if (!e || e.dead || e.ghosted || e.millCd > 0) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
      if (d > M.armLen + e.r || d < M.innerR - e.r) continue;
      const ang = Math.atan2(dy, dx);
      const slack = M.armHalfWidth + e.r / Math.max(d, 12);
      let hit = false;
      for (const a of arms) if (Math.abs(angleDiff(a, ang)) < slack) { hit = true; break; }
      if (!hit) continue;
      e.millCd = M.hitCooldown;
      const tx = -Math.sin(ang), ty = Math.cos(ang);
      const ix = tx * M.impulse + (dx / (d || 1)) * M.impulse * 0.4;
      const iy = ty * M.impulse + (dy / (d || 1)) * M.impulse * 0.4;
      if (e.kind === 'goat') e.damage(M.damage, game, ix * M.goatKnock, iy * M.goatKnock, false, 'mill');
      else {
        // A man held out in front of you is a man held into the arm: the wheel takes him out of
        // your mouth and throws him for you, which is the wheel doing what the wheel is for.
        if (e.held) { game.goat.holding = null; e.held = false; game.goat.spendGrab(game, true); }
        // The rat ogre is never thrown, but the arm still lands: a heart off him, standing.
        if (e.kind === 'ratogre') { e.die(game, 'mill', dx / (d || 1), dy / (d || 1)); }
        else { e.fling(ix, iy, true); e.aware = true; game.floatText(e.x, e.y - 26, 'GROUND', PALETTE.blood); }
      }
      game.shake(6); game.audio.sfxThud(); game.world.emitNoise(this.x, this.y, TUNING.noise.table);
    }
  }

  // A crate coming apart: boards on the floor and the noise of it, which is loud enough to turn
  // a room. Nothing is left behind that can be picked up again.
  shatter(game) {
    if (this.broken) return;
    if (this.corpse) { Talisman.corpseGone(game, this); return; }
    if (this.kind === 'crate') Talisman.splinters(game, this);   // CARPENTER'S AWL
    this.broken = true; this.dead = true;
    if (this.kind === 'barrel') this.unHazard(game);
    game.world.emitNoise(this.x, this.y, TUNING.noise.smash);
    game.audio.sfxCrack(); game.audio.sfxThud(); game.shake(3);
    game.fx.debris(this,this.vx,this.vy);
    game.particles(this.x, this.y, 11, PALETTE.wood, 165);
  }
}

class Bullet {
  constructor(x, y, vx, vy, shooter) { this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.life = 1.6; this.dead = false; this.shooter = shooter; }
  update(dt, game) {
    this.life -= dt; if (this.life <= 0) { this.dead = true; return; }
    const steps = 3;
    for (let s = 0; s < steps && !this.dead; s++) {
      this.x += this.vx * dt / steps; this.y += this.vy * dt / steps;
      if (game.world.isSolid(Math.floor(this.x / TILE), Math.floor(this.y / TILE))) {
        this.dead = true; game.world.dot(this.x, this.y, 2, '#2a2020'); game.particles(this.x, this.y, 3, PALETTE.ochre, 80); return;
      }
      const goat = game.goat;
      // A carried shield turns bullets until it is scrap: the one thing in the game that answers
      // a rifle without you having to be holding a man.
      const hold = goat.holding;
      if (hold && hold.kind === 'weapon' && hold.weapon === 'shield' && goat.shielded(this.x, this.y)) {
        this.dead = true;
        game.particles(this.x, this.y, 6, PALETTE.fireHi, 170); game.audio.sfxSteel();
        game.floatText(hold.x, hold.y - 28, 'CLANG', PALETTE.bone); game.shake(2);
        // A turned bullet spends the same charge a flattened man does.
        if (--hold.uses <= 0) hold.snap(game);
        return;
      }
      // The held man shields the goat: check him first.
      if (goat.holding && !goat.holding.item && Math.hypot(goat.holding.x - this.x, goat.holding.y - this.y) < goat.holding.r + 3) {
        const h = goat.holding; h.shieldHits = (h.shieldHits || 0) + 1; this.dead = true;
        game.world.splat(h.x, h.y, this.vx / 900, this.vy / 900, 7); game.floatText(h.x, h.y - 26, 'SHIELD', PALETTE.bone);
        if (h.shieldHits >= game.mods.shieldBullets) h.die(game, 'shot', this.vx / 900, this.vy / 900);
        return;
      }
      if (!goat.dead && !this.reflected && Math.hypot(goat.x - this.x, goat.y - this.y) < goat.r + 2) {
        if (Talisman.reflectBullet(game, this)) continue;   // MIRROR SHARD
        this.dead = true; goat.damage(TUNING.hunter.damage, game, this.vx * 0.15, this.vy * 0.15, false, this.shooter || 'rifle'); return;
      }
      for (const e of game.enemies) {
        if (e.dead || e.held || e.ghosted) continue;
        if (Math.hypot(e.x - this.x, e.y - this.y) < e.r + 2) {
          this.dead = true;
          if (e.kind === 'butcher') { e.hp -= 1; e.flash = 0.18; game.world.splat(e.x, e.y, this.vx / 900, this.vy / 900, 6); if (e.hp <= 0) e.die(game, 'shot', this.vx / 900, this.vy / 900); }
          // A round is a sharp thing: the rat ogre bleeds a heart for it, which is what makes a
          // room with a rifle in it somewhere worth leading him.
          else if (e.kind === 'ratogre') { e.die(game, 'shot', this.vx / 900, this.vy / 900); }
          else {
            e.die(game, 'shot', this.vx / 900, this.vy / 900); game.floatText(e.x, e.y - 26, this.reflected ? 'RETURNED' : 'FRIENDLY FIRE', this.reflected ? PALETTE.witchHi : PALETTE.blood);
            // The shooter, not a witness: he is the one who has something to say about it.
            if (this.shooter && !this.shooter.dead) game.bark(this.shooter, 'friendlyFire', 1);
          }
          return;
        }
      }
      for (const p of game.props) {
        if (p.broken) continue;
        // Not the crate in his mouth: a carried crate answers a club (`Goat.crated`), and a rifle's
        // answers are the shield and a man. Held in front of him it met every round first.
        if (p.kind === 'crate' && !p.held && Math.hypot(p.x - this.x, p.y - this.y) < p.r + 2) { this.dead = true; p.shatter(game); return; }
        // A shield standing in its rack is cover; a sword in one is not.
        if (p.kind === 'weapon' && p.weapon === 'shield' && p.inStand && Math.hypot(p.x - this.x, p.y - this.y) < p.r + 2) {
          this.dead = true; game.particles(this.x, this.y, 4, PALETTE.bone, 120); game.audio.sfxSteel(); return;
        }
        if (p.kind === 'lamp' && Math.hypot(p.x - this.x, p.y - this.y) < p.r + 2) {
          this.dead = true; const l = Math.hypot(this.vx, this.vy) || 1; p.topple(game, this.vx / l, this.vy / l); return;
        }
        if (p.stopsBullets && Math.hypot(p.x - this.x, p.y - this.y) < p.r + 2) {
          this.dead = true; game.particles(this.x, this.y, 4, p.kind === 'table' ? PALETTE.wood : PALETTE.ochre, 100);
          game.world.dot(this.x, this.y, 2, '#2a2020');
          if (p.kind === 'bell') p.ring(game);
          if (p.kind === 'tortoise') Beast.shellTakes(p, game);
          return;
        }
      }
    }
  }
}
