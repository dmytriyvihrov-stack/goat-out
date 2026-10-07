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
    this.venomFill = 0; this.poisoned = 0;   // the ring round his feet in a puddle, and the slow once it is full (Status.goat)
    this.hoofTimer = 0; this.kind = 'goat';
    this.stepNoiseTimer = 0;   // running footsteps: a timer, not a coin flip, see js/tuning.js noise.footstepGap
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
    this.itemCd = 0; this.itemCdMax = 0;   // Q: the cape's verb, its own clock
  }

  update(dt, game) {
    const g = TUNING.goat, inp = game.input, world = game.world;
    this.aim = inp.aim;
    // The one press of grab, rather than the holding of it. An arm that came into his mouth on its
    // own was never picked up by a button, so there is no button to let go of: a press throws it.
    // `rmbPressed` is the latch the pointer, the keys and a finger set on the press itself: a tap that was up
    // again before this step still counts as one press (a slow frame lost it), but it only ever lands the
    // once-asked things (a ware, an iron cage, a scrap of paper), never a pick-up that a release would throw.
    const rmbTap = !!inp.rmbPressed && !inp.rmbDown;
    const rmbEdge = (inp.rmbDown && !this.rmbWas) || !!inp.rmbPressed;
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
    // Over the thrower's head, or thrown by him (js/thrower.js): nothing of his own until he is down.
    if (this.state === 'carried' || this.state === 'tossed') { Thrower.goatStep(this, dt, game); return; }

    // Off his feet. Nothing but the floor until it passes: no verbs, no aim, no momentum.
    // The pen is the only thing that does this to him, twice on the way out of it.
    if (this.state === 'stunned') {
      this.timer -= dt; this.runT = 0; this.runUp = 1;
      // On the end of the butcher's hook: dragged to him at `hook.pull` for as long as he is pulling
      // (`Enemy.pullHook`); the moment the rope goes slack (him dazed, flung, dead) the stun is done.
      const hk = this.hooked;
      if (hk && (hk.dead || hk.state !== 'hookpull' || !hk.hook || hk.hook.caught !== this)) { this.hooked = null; this.timer = Math.min(this.timer, TUNING.champion.hook.daze); }
      if (this.hooked) {
        const dx = hk.x - this.x, dy = hk.y - this.y, d = hyp(dx, dy) || 1, sp = TUNING.champion.hook.pull;
        this.vx = dx / d * sp; this.vy = dy / d * sp;
      } else { this.vx *= 0.86; this.vy *= 0.86; }
      const sx = this.x, sy = this.y;
      this.x += this.vx * dt; this.y += this.vy * dt; world.collideCircle(this);
      // A shove with no windup (GET OFF, the ogre's rebound) costs no heart, so it may not slide him into
      // one either: the lip and a fire hold him like the lunge's lip does. The rope may drag him anywhere.
      if (!this.hooked) {
        const bad = (x, y) => world.isPitPx(x, y) || world.isBurningPx(x, y) || world.isWitchPx(x, y);
        if (bad(this.x, this.y) && !bad(sx, sy)) {
          if (!bad(this.x, sy)) { this.y = sy; this.vy = 0; }
          else if (!bad(sx, this.y)) { this.x = sx; this.vx = 0; }
          else { this.x = sx; this.y = sy; this.vx = 0; this.vy = 0; }
        }
      }
      // Dragged over flame or a puddle he burns and is poisoned like anyone (the hook hurts through
      // what the rope drags him over); this returned before both, so the rope was a way across fire.
      this.burnStep(game, world, dt);
      if (this.timer <= 0) { this.state = 'idle'; this.hooked = null; }
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
      // legs tied (the rabbit, js/beasts-more.js): the roll is a hop where he points
      this.rollDir = leap ? leap.dir : game.legsTied ? { x: this.aim.x, y: this.aim.y } : this.rollDirection(game, inp.mx, inp.my); this.rollSpin = 0;
      this.state = 'roll'; this.timer = leap ? L.time : R.duration;
      this.rollCd = this.rollCdMax = R.cooldown * game.mods.rollCooldown * (leap ? L.cooldownMul : 1);
      this.vx = this.rollDir.x * R.speed * game.mods.rollDistance;
      this.vy = this.rollDir.y * R.speed * game.mods.rollDistance;
      this.leap = leap ? { e: leap.e, x: leap.x, y: leap.y, t: 0, time: L.time, h: L.height, over: false, at: L.over, daze: L.daze,
        vx: (leap.x - this.x) / L.time, vy: (leap.y - this.y) / L.time } : null;
      if (this.leap) { this.vx = this.leap.vx; this.vy = this.leap.vy; }
      this.invuln = Math.max(this.invuln, R.invuln);
      if (this.holding) {
        const h = this.holding; this.holding = null; h.held = false; this.autoHeld = false;
        if (!h.item) { h.state = 'floored'; h.timer = TUNING.goat.grab.letGo; }
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
            // The leap's own number: a soul taken mid-leap can swap LEAPFROG away under it.
            e.daze(game, lp.daze);
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
          if (hyp(e.x - this.x, e.y - this.y) > R.stunR + e.r) continue;
          this.rollHit.push(e); e.daze(game, game.mods.rollStun);
          game.particles(e.x, e.y - 6, 5, PALETTE.bone, 120); game.audio.sfxThud(); game.vibe(10);
        }
        // DEAD WEIGHT through one of his own animals dazes it as well (`Beast.dope`).
        for (const p of game.props) {
          if (!Beast.is(p.kind) || this.rollHit.indexOf(p) >= 0 || hyp(p.x - this.x, p.y - this.y) > R.stunR + p.r) continue;
          this.rollHit.push(p); Beast.dope(p, game, 'stun');
        }
      }
      if (this.timer <= 0) {
        // He lands and has to get up: the stride he had built is gone with the tumble (pillar 4).
        // `recover` 0 (26 Sep 2026: "remove the recover after the roll") lands him straight on his feet.
        // SPRING HOCKS lands him with `rollKeep` of the tumble's speed and the run-up he had.
        // A vault is the exception: it keeps the run-up but lands at the plain speed, or the slide came
        // back into it and carried him over a lip past the spot `leapLands` had cleared (2 Oct 2026).
        const keep = this.leap ? 0 : game.mods.rollKeep || 0;
        this.state = R.recover > 0 ? 'rollrecover' : 'idle'; this.timer = R.recover;
        this.vx *= keep || R.land; this.vy *= keep || R.land; if (!keep && !(this.leap && game.mods.rollKeep)) this.runT = 0;
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
    // A sneak (the STEALTH test's ALT, `game.sneak`) is never a run: it builds nothing and drains what there was.
    const M = g.momentum, asking = hyp(inp.mx, inp.my) >= M.atLeast && !game.sneak;
    const mt = M.time * Talisman.runUpTime(game);   // BRASS SPUR builds it faster
    this.runT = clamp(asking ? this.runT + dt : this.runT - dt * M.lose, 0, mt);
    this.runUp = 1 + M.max * (this.runT / mt);

    // ---- movement (momentum) ----
    // A man on your back is most of your stride. A blade in your teeth is barely any of it, which
    // is what lets an arm be something you take in passing instead of something you commit to.
    let mul = this.holding ? (this.holding.kind === 'fish' ? TUNING.prop.fish.carry : this.holding.item ? g.grab.itemSpeedMul : g.grab.speedMul) : 1;
    if (this.state === 'recover') mul *= 0.55;
    else if (this.state === 'windup') mul *= 0.3;
    else if (this.state === 'bite') mul *= g.grab.biteMove;
    else if (this.state === 'rollrecover') mul *= TUNING.goat.roll.recoverMove;
    if (game.sneak) mul *= TUNING.stealth.speed;
    const base =g.speed * game.mods.speed * this.runUp * (this.gong > 0 ? TUNING.prop.bell.speedMul : 1) * Talisman.speedMul(game)
      * (this.poisoned > 0 ? g.poison.moveMul : 1) * (game.calmFast ? TUNING.calmRun.mul : 1)
      * (game.dev && game.dev.god ? TUNING.dev.godSpeed : 1);
    const top = base * mul;
    if (this.state !== 'lunge' && this.state !== 'roll') {
      const moving = inp.mx !== 0 || inp.my !== 0;
      const tx = inp.mx * top, ty = inp.my * top;
      // How the hooves meet the floor (`goat.feel`): asking against the way he is already going
      // bites harder, and a start, a stop and a reversal each get a beat the eye can read.
      const F = g.feel, sp0 = hyp(this.vx, this.vy), mlen = hyp(inp.mx, inp.my) || 1;
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
      const dx = tx - this.vx, dy = ty - this.vy, d = hyp(dx, dy);
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
    } else if (hyp(this.vx, this.vy) > 40) this.facing = Math.atan2(this.vy, this.vx);
    // Standing still he turns his head to where you are pointing. The sprite is the only thing on
    // screen that says which way he is looking, and on the Ossuary which way he is looking is the
    // whole fight, so standing still had to be a way of turning, not a way of freezing.
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
    // nothing at all depending on how it got there, so the press that would have been a headbutt
    // launches whatever he is holding instead. A man is not an object and is not covered here: he
    // goes where he always went, on grab.
    if (buttAsk && this.state === 'idle' && this.holding && this.holding.item) {
      this.buttBuf = 0;
      this.throwHeld(game);
    } else if (buttAsk && this.state === 'idle' && !this.holding) {
      this.buttBuf = 0;
      // GOAT ATTACK (dev drawer) divides the windup here, the lunge below and the recovery through
      // `mods.headbuttRecovery`; the lunge is sped up by as much as it is cut, so its reach holds.
      this.state = 'windup'; this.timer = g.headbutt.windup * (game.mods.headbuttWindup || 1) / (DT ? DT.goatAttack : 1);
      // BULL NECK reads the run he had when the head went down, not what is left of it by the lunge.
      this.buttRun = clamp((this.runUp - 1) / g.momentum.max, 0, 1);
      // STEALTH: a man who first sees him after this is still a man taken unseen (`Enemy.spotT`).
      this.buttT = game.timer;
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
        this.wave = { t: 0, ax: this.aim.x, ay: this.aim.y };   // the small picture of where the blow lands (`Renderer.drawHornWave`)
        const hl = (game.mods.horn ? game.mods.horn.lunge : 1) * ga;   // the horn's size: a dagger steps in less, a spear more
        this.vx = this.aim.x * g.headbutt.lunge * hl; this.vy = this.aim.y * g.headbutt.lunge * hl;
        game.dust(this.x - this.aim.x * 8, this.y - this.aim.y * 8, TUNING.juice.dust.lunge, -this.aim.x, -this.aim.y);
        game.audio.sfxHeadbutt(); game.audio.musicEvent('headbutt'); world.emitNoise(this.x, this.y, TUNING.noise.headbutt);
      }
    } else if (this.state === 'lunge') {
      this.timer -= dt;
      this.headbuttHits(game);
      if (this.timer <= 0) { this.state = 'recover'; this.timer = this.recoverMax = g.headbutt.recovery * game.mods.headbuttRecovery; this.vx *= 0.12; this.vy *= 0.12; }   // 6 Oct 2026: a butt along a wall slid on; the lunge is the whole of the travel
    } else if (this.state === 'recover') {
      this.timer -= dt; if (this.timer <= 0) this.state = 'idle';
    } else if (this.state === 'bite') {
      this.timer -= dt; if (this.timer <= 0) { this.state = 'idle'; this.closeBite(game); }
    }


    // ---- grab / hold / throw ----
    if ((inp.rmbDown || rmbTap) && !this.holding && this.state === 'idle' && this.grabCd <= 0) this.tryGrab(game, rmbTap);
    if (this.holding) {
      const h = this.holding;
      if (h.dead || h.broken) { this.holding = null; this.autoHeld = false; }
      else {
        // He is carried in front of the face, but never inside stone: from a face full of wall the
        // hold point is walked back toward the goat until it is on floor again. Before that, a throw
        // from hard against a wall started inside the wall and ended up through it, which is the one
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
          h.held = false; this.holding = null; h.state = 'floored'; h.timer = TUNING.goat.grab.loose;
          h.x += this.aim.x * 10; h.y += this.aim.y * 10;
          this.spendGrab(game, true, 0.7);
        }
      }
    }

    // ---- the item (Q) ----
    // A fifth key that does not exist until there is a cape on his back (`CAPES`, js/capes.js): the
    // cape's one verb, a blink, a tuft of grass, a shock, a boomerang, a straw goat. None is grab or
    // roll wearing a different hat, so it keeps its own cooldown (`itemCd`), never `grabCd` or `rollCd`.
    if (this.wave && (this.wave.t += dt) > TUNING.goat.horns.wave.time) this.wave = null;
    this.itemCd = Math.max(0, this.itemCd - dt * cdRate);
    // A cape put back on a stool keeps the wait it still owed (`Shop.wearCape`) and works it off while it hangs there.
    if (game.capeWait) for (const k in game.capeWait) { const w = game.capeWait[k]; w.cd -= dt * cdRate; if (w.cd <= 0) delete game.capeWait[k]; }
    if (inp.qPressed && this.itemCd <= 0 && !this.dead && game.cape) Cape.use(game, this, inp);

    // ---- scream ----
    // Three things one button can be, and which one it is was decided by a soul. Fire, a blow, or
    // what a goat's voice actually is: a noise, loud enough to bring the room to the spot you made
    // it at. The bare version is the one you start with and the only one that is not a weapon.
    if (inp.spacePressed && this.screamCd <= 0 && !this.dead) {
      game.audio.musicEvent('scream');
      Beast.heard(game);   // the husky's song hears it (js/beasts-more.js)
      if (game.mods.spit) Status.spit(game, this);
      else if (game.mods.breath) this.breathe(game);
      else if (game.mods.screamStun) {
        // THE FULL THROAT: everyone in earshot loses a moment, and that moment is the point.
        this.screamCd = game.mods.screamCooldown; this.screaming = g.scream.duration;
        game.audio.sfxScream();
        game.floatText(this.x, this.y - 26, 'BAAAAH', PALETTE.bone);
        // BIG LUNGS carries every form of the voice further (`mods.screamReach`).
        const R = game.mods.screamRadius * (game.mods.screamReach || 1) * TILE;
        game.ring(this.x, this.y, R, PALETTE.bone);
        game.shake(4); game.flash(PALETTE.bone, 0.1);
        let n = 0;
        for (const e of game.enemies) {
          // Nothing to shout at while it is mist, and nothing that counts toward the tally either.
          if (e.dead || e.held || e.ghosted) continue;
          if (hyp(e.x - this.x, e.y - this.y) > R) continue;
          e.daze(game, g.scream.stun); n++;
        }
        // His own animals in earshot reel too (`Beast.dope`).
        for (const p of game.props) if (Beast.is(p.kind) && hyp(p.x - this.x, p.y - this.y) <= R) Beast.dope(p, game, 'stun');
        if (n) game.floatText(this.x, this.y - 44, n + (n === 1 ? ' REELS' : ' REEL'), PALETTE.fireHi);
      } else {
        // The bare voice. It is a `lure` noise, which is the one kind of noise that pulls a man to
        // the spot rather than only turning his head, so it is a way of emptying the far side of a
        // room, and a way of filling the side you are standing on. Both of those are the same button.
        this.screamCd = game.mods.screamCooldown; this.screaming = g.scream.duration;
        game.audio.sfxScream();
        game.floatText(this.x, this.y - 26, 'BAAAAH', PALETTE.bone);
        const reach = game.mods.screamReach || 1, call = game.mods.screamCall * reach;
        game.ring(this.x, this.y, call * TILE, 'rgba(239,230,208,0.5)');
        world.emitNoise(this.x, this.y, call, 'lure');
        // Two jobs out of one shout, and they work at two ranges. Far off it is a lure and pulls a
        // man to the spot. In his face it breaks the blow he was already swinging, which is the
        // thing the bare voice never did, so being caught at arm's length had no answer in it at all
        // until a soul turned up.
        let n = 0, balked = 0;
        const B = g.scream.balk * reach * TILE;
        for (const e of game.enemies) {
          if (e.dead || e.held || e.ghosted) continue;
          const d = hyp(e.x - this.x, e.y - this.y);
          if (d <= B + e.r && e.balk(game, g.scream.balkStun)) balked++;
          if (d <= call * TILE) n++;
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
    // A lunge into stone ends the moment it touches, but the blow still lands first. The check
    // used to run only on the frame after, so with his nose already against a wall the lunge
    // bonked and ended on its first frame and nothing in reach was ever hit: the door hung in a
    // wall beside him, a man pinned in the corner with him.
    if (this.state === 'lunge' && impact > 0) { this.headbuttHits(game); if (this.state === 'lunge') { this.state = 'recover'; this.timer = this.recoverMax = g.headbutt.recovery * game.mods.headbuttRecovery * 0.6; } game.shake(3); game.audio.sfxThud(); }

    this.burnStep(game, world, dt);   // fire and poison (also on the end of the hook, see the stunned branch)

    // ---- motion smear + bloody hoof prints ----
    const spd = hyp(this.vx, this.vy);
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
    keepIf(this.trail, alive);
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
    // Grazing (drawn only): `grazeAt` is stamped by whatever he is eating (the milk loop in
    // `Game.update`, a tuft of mushrooms); the head goes down over `grazePose.ease` and comes back up.
    // No fidget while he eats: a pronk mid-mouthful read as the graze being broken.
    const GP = g.grazePose, eating = game.timer - (this.grazeAt ?? -9) < 0.12;
    this.grazeK = clamp((this.grazeK || 0) + (eating ? dt : -dt) * GP.ease, 0, 1);
    if (eating) this.fidget = null;
    // Sneaking (drawn only): the crouch eases in and out rather than snapping with the key.
    this.sneakK = clamp((this.sneakK || 0) + (game.sneak ? dt : -dt) * TUNING.stealth.ease, 0, 1);
    if (game.sneak) this.fidget = null;
    // One heart left and he bleeds: an occasional drop behind him, the one hint the floor gives.
    const BL = TUNING.goat.bleed;
    if (this.hp <= 1 && spd > BL.minSpeed) {
      this.hoofTimer -= dt;
      if (this.hoofTimer <= 0) { this.hoofTimer = BL.gap * (1 + (Math.random() - 0.5) * 2 * BL.jitter); world.dot(this.x + (Math.random() - 0.5) * 8, this.y + (Math.random() - 0.5) * 8, BL.size, PALETTE.bloodDark); }
    }
    // Below a walk he makes nothing worth hearing, that silence is the stealth the cone is built
    // to reward. Above it, this used to be a coin flip every frame, which could go a half-second
    // without landing and let a run right up on somebody's back read as luck rather than as noise.
    // A sneak (the STEALTH test) is silent whatever its speed; with the test on, a run carries further.
    if (spd > 100 && !game.sneak) {
      this.stepNoiseTimer -= dt;
      if (this.stepNoiseTimer <= 0) {
        this.stepNoiseTimer = TUNING.noise.footstepGap;
        const quiet = Talisman.stepMul(game, this);   // MOTH WOOL
        const stepR = game.dev && game.dev.stealth ? TUNING.stealth.step : TUNING.noise.footstep;
        if (quiet > 0) { world.emitNoise(this.x, this.y, stepR * quiet); game.audio.sfxHoof(quiet); }
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
    const L = game.mods.leapfrog, asked = hyp(inx, iny) > 0.1;
    const fx = asked ? inx : this.aim.x, fy = asked ? iny : this.aim.y, fl = hyp(fx, fy) || 1;
    const cos = Math.cos(L.cone);
    let best = null, bestD = Infinity;
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted || e.state === 'flung' || e === this.holding || game.hidden(e.x, e.y)) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = hyp(dx, dy);
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
      if (p.kind === 'mill' ? p.millThreat(x, y, r) : hyp(p.x - x, p.y - y) < p.r + r + 6) return false;
    }
    for (const p of game.props) if (!p.broken && p.blocking && hyp(p.x - x, p.y - y) < p.r + r) return false;
    for (const o of game.enemies) if (o !== over && !o.dead && !o.ghosted && hyp(o.x - x, o.y - y) < o.r + r) return false;
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
      const dx = e.x - this.x, dy = e.y - this.y, d = hyp(dx, dy);
      if (d > range || d < 1) continue;
      // Anyone winding up a swing is more of a reason to be elsewhere than anyone who is not.
      const urgency = (e.state === 'windup' || e.state === 'hookwind' || e.state === 'swing') ? 1.6 : 1;
      threats.push({ x: dx / d, y: dy / d, w: (1 - d / range) * urgency });
    }
    const want = hyp(inx, iny) > 0.1 ? Math.atan2(iny, inx) : null;
    // Asked straight over a drop he can clear (THE CHASM), he goes exactly where he was asked: the jump is the
    // one roll that is never a panic, and a man across it was turning it off the lip into the hole's length.
    if (want !== null) {
      const cx = Math.cos(want), cy = Math.sin(want), solid = (x, y) => w.isSolid(Math.floor(x / TILE), Math.floor(y / TILE));
      const lx = this.x + cx * dist / 0.8, ly = this.y + cy * dist / 0.8;
      if (!w.isPitPx(lx, ly) && !solid(lx, ly) && [0.4, 0.7, 1].some((f) => w.isPitPx(this.x + cx * dist * f, this.y + cy * dist * f))
        && ![0.4, 0.7, 1].some((f) => solid(this.x + cx * dist * f, this.y + cy * dist * f))) return { x: cx, y: cy };
    }
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < 24; i++) {
      // With a stick direction, walk outward from it; without one, sweep the whole circle.
      const a = want === null ? (i / 24) * Math.PI * 2 : want + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.26;
      const cx = Math.cos(a), cy = Math.sin(a);
      let score = 0;
      for (const t of threats) score -= (t.x * cx + t.y * cy) * t.w * 2.4;
      // How far along this line he actually gets before a wall or a fire stops being worth it.
      let clear = 1;
      // Where the whole tumble ends: over a narrow drop (THE CHASM) with floor past it, the hole on the way
      // is no reason to turn, the roll carries him over it (`Game.update` keeps him up while he rolls).
      const lx = this.x + cx * dist / 0.8, ly = this.y + cy * dist / 0.8;
      const over = !w.isPitPx(lx, ly) && !w.isSolid(Math.floor(lx / TILE), Math.floor(ly / TILE));
      for (const f of [0.4, 0.7, 1]) {
        const px = this.x + cx * dist * f, py = this.y + cy * dist * f;
        if (w.isSolid(Math.floor(px / TILE), Math.floor(py / TILE))) { clear = f - 0.3; break; }
        // A hole is worse than a wall: a wall stops the tumble, a hole charges a heart for it.
        if (w.isPitPx(px, py)) { if (over) continue; clear = f - 0.6; break; }
        if (w.isBurningPx(px, py)) { clear = f - 0.5; break; }
        // Ending a tumble in a brazier or under the wheel is the same mistake as ending it in a wall.
        // A plate lying flat is floor and is not.
        let hazard = false;
        for (const p of game.hazards) {
          if (p.kind === 'spike' && !p.spikeThreat()) continue;
          if (p.kind === 'mill' ? p.millThreat(px, py, this.r) : hyp(p.x - px, p.y - py) < p.r + this.r + 6) { hazard = true; break; }
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
    const dir = hyp(this.vx, this.vy) > 40 ? Math.atan2(this.vy, this.vx) : this.facing;
    const ax = Math.cos(dir), ay = Math.sin(dir);
    const range = B.range * (game.mods.screamReach || 1);   // BIG LUNGS
    this.screamCd = game.mods.screamCooldown; this.screaming = 0.4;
    game.world.igniteCone(this.x, this.y, ax, ay, range, B.halfAngle, B.fireTime);
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = hyp(dx, dy);
      if (d > range + e.r || (dx * ax + dy * ay) / (d || 1) < Math.cos(B.halfAngle)) continue;
      if (!game.world.los(this.x, this.y, e.x, e.y)) continue;
      e.ignite(game);
    }
    for (let i = 0; i < B.parts; i++) {
      const a = Math.atan2(ay, ax) + (Math.random() - 0.5) * B.halfAngle * 2;
      const sp = 260 + Math.random() * 420;
      game.parts.push({ x: this.x + ax * 14, y: this.y + ay * 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.28 + Math.random() * 0.3, color: Math.random() < 0.5 ? PALETTE.fire : PALETTE.fireHi, size: 3 + Math.random() * 4 });
    }
    game.breathFx = { x: this.x, y: this.y, ax, ay, life: 0.34, max: 0.34, range };
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
      if (!w.grass[i] || hyp(px - cx, py - cy) > R) continue;
      w.grass[i] = 0;
      const def = game.level.def;
      game.particles(px, py, 6, def.grassHi || PALETTE.hay, 150);
    }
  }

  // Is a body `(dx, dy)` from the goat, `r` wide, under the horns he swings at `(ax, ay)` out to `reachPx`? An arc
  // (the dagger, BIG) is a cone of the horn's own width; LONG is two strips, a horn each, straight out, and what is
  // met in the last of it is hit by the tips. `{ tip }` or null. The picture draws the same shape (`drawHornWave`).
  static hornHit(HN, dx, dy, ax, ay, reachPx, r) {
    const along = dx * ax + dy * ay;
    if (HN.rows) {
      if (along < 0 || along > reachPx) return null;
      const perp = dx * ay - dy * ax, off = HN.rowGap * TILE, w = HN.rowW * TILE + r;
      if (Math.min(Math.abs(perp - off), Math.abs(perp + off)) > w) return null;
      return { tip: along >= reachPx * HN.tip };
    }
    const d = hyp(dx, dy);
    if (d > reachPx || (d > 1 && along / d < HN.cone)) return null;
    return { tip: false };
  }

  headbuttHits(game) {
    const g = TUNING.goat.headbutt, HN = game.mods.horn || TUNING.goat.horns.dagger;   // the horn he has, `TUNING.goat.horns`
    // BULL NECK: the run he put his head down out of goes into the man (men only; a crate keeps its own throw).
    const steam = game.mods.runButt ? 1 + game.mods.runButt * (this.buttRun || 0) : 1;
    const extra = (game.mods.headbuttReach - 1) * TILE, impulse = g.impulse * game.mods.headbuttImpulse * steam * HN.impulse;
    const ax = this.aim.x, ay = this.aim.y;
    this.cutGrass(game, ax, ay);
    for (const e of game.enemies) {
      if (e.dead || e.held || e.lastLunge === this.lungeId) continue;
      // Horns through mist. Saying so where it happened is the only tutorial this enemy gets.
      if (e.ghosted) {
        if (hyp(e.x - this.x, e.y - this.y) < this.r + e.r + 12 + extra) game.mistTold(e);
        continue;
      }
      const dx = e.x - this.x, dy = e.y - this.y, reachPx = this.r + e.r + 10 + extra;
      // An arc, or (LONG) two straight strips with the tips out at the end of them: null is a miss.
      const hit = Goat.hornHit(HN, dx, dy, ax, ay, reachPx, e.r);
      if (!hit) continue;
      // Held to the same line as everything else that reaches (ECHO HORN already was): with LONG
      // HORNS a man on the far side of a shut iron door was thrown across the room behind it.
      // `reaches`, as the club is: `sees` let the horns through a table or a brazier his club stops at.
      if (!game.reaches(this.x, this.y, e.x, e.y)) continue;
      e.lastLunge = this.lungeId;
      // Caught while it is a body. Horn through a thing that has just made itself real undoes it,
      // no wall needed, because the window was the hard part. (It said UNMADE over it until 30 Sep
      // 2026: "no sense in it", the burst says it.)
      if (e.kind === 'wraith') {
        game.hitstop(0.06); game.shake(7); game.kick(ax, ay, TUNING.juice.kick); game.zoomPunch(1.2);
        e.die(game, 'unmade', ax, ay);
        continue;
      }
      if (e.kind === 'ratogre') {
        // The horns do nothing to him standing. Down, a crate or a shield in the face, and every
        // blow is a heart; up, the goat bounces off him and is told, once, what would work.
        const open = e.state === 'floored' || e.state === 'stunned';
        this.vx = -ax * TUNING.ratogre.bounce * TILE; this.vy = -ay * TUNING.ratogre.bounce * TILE;
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
      // and the room is told once what does. No stagger either, a free stagger per butt was a lock.
      if (e.kind === 'butcher' && !TUNING.butcher.hornsHurt) {
        // He bounces off himself, and stands a beat dazed: the lunge is over, the stars say so.
        const RB = TUNING.butcher.rebound;
        this.state = 'stunned'; this.timer = RB.daze; this.dazed = Math.max(this.dazed || 0, RB.daze);
        this.vx = -ax * RB.speed; this.vy = -ay * RB.speed; e.aware = true;
        e.flash = Math.max(e.flash, 0.05);
        game.shake(2); game.audio.sfxThud(); game.squashGoat(TUNING.juice.squash.hit); game.hitstop(0.04); game.particles(this.x + ax * this.r, this.y + ay * this.r, 5, PALETTE.ash, 200);
        if (!game.ogreHornsTold) { game.ogreHornsTold = true; game.floatText(e.x, e.y - 50, 'THE HORNS DO NOTHING. BLADES. FIRE.', PALETTE.ashHi); }
        continue;
      }
      if (e.kind === 'butcher') {
        e.hp -= 1; e.flash = 0.18;
        // Planted while he crouches or winds a slam: the hit counts but does not stop it, and you are
        // still standing in the ring. Bait it, step out, then hit him on his knees.
        if (e.state === 'slamwind' || e.state === 'hopwind') { this.vx = -ax * 5 * TILE; this.vy = -ay * 5 * TILE; }
        // He reels where he stands: the ogre is not moved by the horns (1.66), the butcher is.
        else { e.state = 'stagger'; e.timer = TUNING.butcher.stagger; e.vx = 0; e.vy = 0; }
        game.hitstop(0.05); game.shake(5); game.audio.sfxThud();
        game.particles(this.x + ax * this.r, this.y + ay * this.r, 9, PALETTE.bone, 300);
        game.kick(-ax, -ay, TUNING.juice.kick); game.zoomPunch(0.8);
        game.impact(this.x + ax * (this.r + 6), this.y + ay * (this.r + 6), ax, ay); game.squashGoat(TUNING.juice.squash.hit);
        game.world.splat(e.x, e.y, ax, ay, 8);
        if (e.hp <= 0) e.die(game, 'headbutt', ax, ay);
      } else {
        // STEALTH (dev test): a man who never saw him coming, or saw him only once the head was down.
        const unseen = !!(game.dev && game.dev.stealth) && (!e.aware || e.spotT >= this.buttT);
        // A hound is not always there for it: that is what makes him a hound and not a man. Not a
        // hound taken unseen: he cannot slip what he did not see coming.
        // A blow traded with a man who knew he was there is an open fight: the sneak ends (`Game.breakSneak`).
        if (!unseen && e.aware && game.dev && game.dev.stealth) game.breakSneak();
        if (!unseen && e.tryDodge && e.tryDodge(game, ax, ay)) continue;
        // The shieldman's board, met head on: its spikes take the horns (2 Oct 2026, `shieldman.spikes`).
        // The goat loses a heart and is thrown off it, he is rocked back behind it, and the bone is not
        // worn by it. Round its edge, or with it down (dazed, poisoned and slow to turn, alight), he is a
        // clubman (pillar 2: the angle).
        if (e.shield && e.shieldCovers(this.x, this.y)) {
          const SP = TUNING.shieldman.spikes;
          e.shieldTakes(game, ax, ay, SP.wear);
          // Said once a run, where it happened, like the ogre's horns: the only lesson the board gets.
          if (!game.boardTold) { game.boardTold = true; game.floatText(e.x, e.y - 50, 'SPIKES. GO ROUND HIM.', PALETTE.ashHi); }
          // An ordinary shieldman's spikes cost no heart (5 Oct 2026, the user's): the goat bounces off and
          // sees stars a long beat (`spikes.plain`, the ogre's rebound). A boss's or a soul-bearer's still bite.
          const bites = !!(e.boss || e.soul);
          if (bites) {
            this.vx = -ax * SP.bounce; this.vy = -ay * SP.bounce;
            this.damage(SP.hurt, game, -ax * SP.bounce * 0.3, -ay * SP.bounce * 0.3, false, e);
          } else {
            const PL = SP.plain;
            this.state = 'stunned'; this.timer = PL.daze; this.dazed = Math.max(this.dazed || 0, PL.daze);
            this.vx = -ax * PL.speed; this.vy = -ay * PL.speed;
            game.shake(2); game.audio.sfxThud();
          }
          game.bark(e, 'spiked', 0.7);
          game.hitstop(0.05); game.squashGoat(TUNING.juice.squash.hit);
          game.particles(this.x + ax * this.r, this.y + ay * this.r, 8, bites ? PALETTE.blood : PALETTE.bone, 220);
          game.impact(this.x + ax * (this.r + 6), this.y + ay * (this.r + 6), ax, ay);
          continue;
        }
        // The butcher and a man with a soul in him, butted once too often, shove him off instead
        // (`Enemy.shoveBack`, `champion.shove`): no corner holds them for a click per heart.
        if (e.shoveBack && e.shoveBack(game, this, ax, ay)) continue;
        // butted round his board: he takes it personally
        if (e.shield) game.bark(e, 'back', 0.7);
        const SN = TUNING.stealth;
        const tipK = HN.rows ? (hit.tip ? HN.tipMul : HN.shaftMul) : 1;   // LONG: the tips throw hard, the shafts only shove
        const imp = Talisman.buttImpulse(game, this, e, impulse * tipK * (e.knockMul ? e.knockMul() : 1) * (unseen ? SN.knock : 1));
        if (HN.rows && hit.tip) { game.hitstop(0.03); game.particles(e.x - ax * e.r, e.y - ay * e.r, 5, PALETTE.fireHi, 240); }
        if (unseen) { game.floatText(e.x, e.y - 40, SN.text, PALETTE.fireHi); game.hitstop(SN.stop); }
        // SPLASH poisons the man on the horns as well as whoever is behind (1 Oct 2026, playtest),
        // before the throw: with the whole poison set the onset is a blow, whose floor wiped the fling.
        if (game.mods.splash) Status.poison(game, e);
        if (!e.dead) e.fling(ax * imp, ay * imp, false);
        if (unseen && !e.dead) e.floorMul = SN.floor;   // and he stays down longer where he lands
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
      // Her wares are with her while she is there (`Shop.shelved`): a stool nobody can see is not
      // a rudeness, and three butts at empty floor woke the rat ogre.
      if (p.kind === 'ware' && Shop.shelved(game, p)) continue;
      // A door that has swung open for good (a room cleared, a man's shoulder) is folded against
      // the wall: a blow through the doorway is not a blow on it. The clock door is still counting
      // and can still be taken off its hinges before it shuts.
      if (p.kind === 'door' && !p.timed && p.open >= 0.5) continue;
      let dx, dy, d, reach;
      if (p.kind === 'door') {
        // The same fix `collideEntities` already gives a door for walking into it: a slab, not a
        // disc, so the closest point on its actual span is what a headbutt is measured against. A
        // circle centred on the door read a swing landed against either edge of a two-tile gap as
        // short of it, so a door could stand there taking hits that never counted.
        const D = TUNING.prop.door;
        const hx = p.vertical ? D.thick / 2 : p.r, hy = p.vertical ? p.r : D.thick / 2;
        const cx = clamp(this.x, p.x - hx, p.x + hx), cy = clamp(this.y, p.y - hy, p.y + hy);
        dx = cx - this.x; dy = cy - this.y; d = hyp(dx, dy); reach = this.r + 8 + extra + D.reachSlack;
      } else if (p.box) {
        // The horse's stall the same way: three tiles of slats, and the nearest of them is the one butted.
        const b = p.box, cx = clamp(this.x, p.x - b.hx, p.x + b.hx), cy = clamp(this.y, p.y - b.hy, p.y + b.hy);
        dx = cx - this.x; dy = cy - this.y; d = hyp(dx, dy); reach = this.r + 8 + extra;
      } else {
        dx = p.x - this.x; dy = p.y - this.y; d = hyp(dx, dy); reach = this.r + p.r + 8 + extra;
      }
      // Overlapping the slab already (nose right up against it, or a hair inside it) has no
      // meaningful direction to check aim against, the same rescue the rectangle collision itself
      // gives a body landing dead centre.
      // A door is a slab two tiles long: standing at one end of it, the nearest point is off to the
      // side of the nose, so it takes a blow from anywhere in front of the shoulders, not the cone.
      const cone = p.kind === 'door' || p.box ? -0.25 : Math.min(0.15, HN.cone);
      if (HN.rows && p.kind !== 'door' && !p.box) { if (!Goat.hornHit(HN, dx, dy, ax, ay, reach, p.r)) continue; }
      else if (d > reach || (d > 1 && (dx * ax + dy * ay) / d < cone)) continue;
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

  // Let go of whatever is in his mouth by throwing it, grab's release, and now the bash too, when
  // what he is carrying is a blade or a shield: there is no swing to spend on a weapon he cannot
  // wield, so launching it is what the button does instead.
  // What the mouth costs before it takes again. A man costs `grab.manCd` times what a thing does,
  // however he left it, thrown, worked loose (`mul`), burnt, or taken out of it by the room, and
  // BY THE COLLAR's card says so. `grabCdMax` is what the rail drains against.
  spendGrab(game, man, mul = 1) {
    const G = TUNING.goat.grab;
    this.grabCd = this.grabCdMax = G.cooldown * game.mods.grabCooldown * (man ? G.manCd : 1) * mul;
  }

  throwHeld(game) {
    const h = this.holding, g = TUNING.goat; if (!h) return;
    game.audio.musicEvent('throw');
    h.held = false; this.holding = null; this.autoHeld = false;
    // VENOM JAW and FIREBRAND: held long enough, it leaves the mouth dripping or live, an animal as
    // much as a crate, and it drips down its whole flight the same way (`Status.updateCarried`).
    Status.markThrow(game, this, h);
    // A hen out of the mouth is a hen off the horns: the same kick, the same seeking flight, the
    // same man she was already good at finding. Reaching for her on purpose buys nothing new, it
    // is one more way she ends up airborne.
    if (h.kind === 'chicken') { h.kick(game, this.aim.x, this.aim.y); this.spendGrab(game, false); return; }
    // A shell goes flat and hard and stops where it lands: it is how you advance the one escort that
    // cannot keep up, and it is not a crate, nothing it hits breaks and it does not break either.
    if (h.kind === 'tortoise') { Beast.throwTortoise(h, game, this.aim.x, this.aim.y); this.spendGrab(game, false); return; }
    // The fish's tank goes a couple of tiles and sets down, or breaks on whatever it meets (js/beasts-more.js).
    if (h.kind === 'fish') { Beast.throwFish(h, game, this.aim.x, this.aim.y); this.spendGrab(game, false); return; }
    // A goat is not a gorilla. A crate or a blade goes the length of the room; a grown man goes a
    // short way and lands, which is still every wall in it and every man standing by one.
    // STRONG JAW (`mods.throwFar`) sends a thing further, never a man: his kill range is BY THE COLLAR's.
    const mul = h.kind === 'weapon' ? TUNING.prop.weapon.throwMul * game.mods.throwFar : h.item ? game.mods.throwFar : g.grab.manThrow;
    h.fling(this.aim.x * g.grab.throwImpulse * mul, this.aim.y * g.grab.throwImpulse * mul, true);
    // A man out of the mouth has to arrive at `physics.thrownKill` to die on what he meets; every
    // other thrown body (a blast, the rat ogre's arm) still dies on any touch. `fling` clears it.
    if (!h.item) h.fromMouth = true;
    this.spendGrab(game, !h.item);
    if (h.kind === 'weapon') { game.audio.sfxSteel(); game.world.emitNoise(this.x, this.y, TUNING.noise.swing); }
    else game.audio.sfxSwing();
    game.vibe(18);
  }

  tryGrab(game, tap) {
    const g = TUNING.goat.grab;
    this.grabTries = (this.grabTries || 0) + 1;   // a hidden wraith watches for a reach near it
    // An open scrap of the cult's paper is read, not lifted (`Codex.openPoster`).
    for (const p of game.props) {
      if (p.kind === 'poster' && !p.torn && p.unfold >= 1 && hyp(p.x - this.x, p.y - this.y) < this.r + TUNING.prop.poster.r + g.reach * 0.6) { Codex.openPoster(game, p); return; }
    }
    let best = null, bestD = Infinity;
    const consider = (o) => {
      const dx = o.x - this.x, dy = o.y - this.y, d = hyp(dx, dy);
      if (d > this.r + o.r + g.reach * 0.6) return;
      if ((dx * this.aim.x + dy * this.aim.y) / (d || 1) < -0.2) return;
      // Not through a shut door: a crate, a blade or (BY THE COLLAR) a man pressed to its far face
      // was taken through it, soul gates included.
      if (!game.sees(this.x, this.y, o.x, o.y)) return;
      if (d < bestD) { bestD = d; best = o; }
    };
    // The shelf first. A ware is reached for the way a crate is, and reaching for it is the whole
    // of taking it, the press, not the holding, so it is asked once and not every frame.
    // An iron cage is opened by a grab with a key, never by a headbutt (6 Oct 2026 playtest: "not a headbutt,
    // the right button, it must be a decision"): a butt can land by accident, a key is not wasted on one.
    if (this.rmbEdgeNow) {
      for (const p of game.props) {
        if (p.broken || p.dead || !(p.kind === 'ironcage' || (p.kind === 'coop' && p.ironCage))) continue;
        const dx = p.x - this.x, dy = p.y - this.y, d = hyp(dx, dy);
        if (d > this.r + p.r + g.reach || (dx * this.aim.x + dy * this.aim.y) / (d || 1) < -0.2) continue;
        if (!game.sees(this.x, this.y, p.x, p.y)) continue;   // not through stone or a shut door
        p.unlockIron(game); this.grabCd = this.grabCdMax = 0.3; return;
      }
    }
    if (this.rmbEdgeNow) {
      // The full reach rather than the crate's six tenths of it: a stool is reached up to from the
      // gap in the wall, not stood over.
      for (const p of game.props) {
        if (p.kind !== 'ware' || p.broken || Shop.shelved(game, p)) continue;
        const dx = p.x - this.x, dy = p.y - this.y, d = hyp(dx, dy);
        if (d > this.r + p.r + g.reach || (dx * this.aim.x + dy * this.aim.y) / (d || 1) < -0.2) continue;
        if (!game.sees(this.x, this.y, p.x, p.y)) continue;   // a ware behind a wall is not within reach (6 Oct 2026 review)
        if (d < bestD) { bestD = d; best = p; }
      }
      if (best) { Shop.buy(game, best, this); this.grabCd = this.grabCdMax = 0.3; return; }
    }
    if (tap) return;   // a tap up before this step asks for the once-asked things only, never a pick-up the release would throw
    // Out of the pen the mouth takes objects and nothing else. A grown man is BY THE COLLAR, and
    // until that soul is swallowed reaching for one is a thing you are told about rather than a
    // thing that silently does nothing.
    if (game.mods.grabMen) {
      // The butcher is a clubman grown too big for a goat's jaw, the same as the ogre, and a man with
      // a soul in him is more than a man: all three are put down by the room, never carried out of it.
      // Nor a man alight: in the teeth he burned on for his whole fire, lighting the goat's own feet,
      // and the fire's run overrode the throw.
      // Nor a shieldman from in front: the teeth meet his board (round its edge he is a man like any).
      for (const e of game.enemies) if (!e.dead && !e.unliftable && !(e.cfg.immune && e.cfg.immune.grab)
        && e.state !== 'flung' && !e.held && !(e.burning > 0) && !(e.shield && e.shieldCovers(this.x, this.y))) consider(e);
    }
    for (const p of game.props) if (p.item && !p.broken && !p.held && !p.flung) consider(p);
    // Nothing loose in reach: a halberd off a suit of armour (3 Oct 2026 playtest), on the wall or
    // its stand, a little further than a crate since it hangs over him. No line asked: it is on the wall.
    if (!best) for (const p of game.props) {
      if ((p.kind !== 'armor' && p.kind !== 'suit') || !(p.halberds > 0)) continue;
      const dx = p.x - this.x, dy = p.y - this.y, d = hyp(dx, dy);
      if (d > this.r + p.r + g.reach || (dx * this.aim.x + dy * this.aim.y) / (d || 1) < -0.2) continue;
      if (d < bestD) { bestD = d; best = p; }
    }
    if (best && (best.kind === 'armor' || best.kind === 'suit')) {
      best.halberds--; best.wobble = 0.3;
      const h = new Prop(best.x, best.y + 6, 'weapon', { weapon: 'sword' });
      h.halberd = true; h.uses = TUNING.prop.weapon.uses.halberd || 1;
      game.props.push(h); h.inStand = false;
      game.floatText(best.x, best.y - 34, 'HALBERD', PALETTE.bone);
      this.takeArm(game, h); this.autoHeld = false; return;
    }
    if (!best) {
      // Reaching for a hound and closing on nothing is a rule worth stating once, where it happened
      // - and only once a beat, since holding the button down near one asks every single frame.
      if (this.fussCd <= 0) {
        for (const e of game.enemies) {
          const big = game.mods.grabMen && e.unliftable, board = game.mods.grabMen && !big && e.shield && e.shieldCovers(this.x, this.y);
          if (e.dead || (e.kind !== 'dog' && !big && !board)) continue;
          if (hyp(e.x - this.x, e.y - this.y) > this.r + e.r + g.reach) continue;
          game.floatText(e.x, e.y - 24, board ? 'GO ROUND THE SHIELD' : big ? (e.soul && e.kind !== 'butcher' && !e.champion ? 'THE SOUL HOLDS HIM' : 'TOO BIG') : 'TOO QUICK', PALETTE.ashHi); this.fussCd = 0.8; break;
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
    // until they have. Whatever he was doing he goes on doing through it, a club already coming
    // round still lands. `closeBite` takes him if he is still there to be taken.
    if (!best.item) { this.state = 'bite'; this.timer = g.bite; this.biting = best; return; }
    this.takeHold(game, best);
  }

  // The bite shuts. He is taken if nothing has happened to him in the meantime and he is still in
  // reach (with `biteSlack`, since he was in it when the teeth went down); otherwise the mouth
  // closes on air and that costs a beat of its own.
  closeBite(game) {
    const g = TUNING.goat.grab, e = this.biting; this.biting = null;
    // Not a man who caught fire under the teeth: `tryGrab` refuses him, and taken here he burned in
    // the mouth for his whole fire, lighting the floor in front of the goat.
    const ok = e && !e.dead && !e.held && !e.ghosted && e.state !== 'flung' && !e.unliftable && !(e.burning > 0) && !(e.shield && e.shieldCovers(this.x, this.y))
      && hyp(e.x - this.x, e.y - this.y) <= (this.r + e.r + g.reach * 0.6) * g.biteSlack;
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
      if (hyp(e.x - tx, e.y - ty) > e.r + reach * 0.75) continue;
      if (!game.sees(this.x, this.y, e.x, e.y)) continue;   // not through a shut door
      // A shieldman's board from in front takes the cut: a use off the board and one off the blade.
      if (e.shield && e.shieldCovers(this.x, this.y)) {
        e.shieldTakes(game, this.aim.x, this.aim.y); this.cutCd = W.cutGap;
        if (--h.uses <= 0) h.snap(game);
        return;
      }
      e.byBlade = true;   // a cut, not a wall: the cup and the grease pass over it
      e.die(game, 'splat', this.aim.x, this.aim.y, 'blade');
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
  // whatever it was: a club, teeth, the butcher's hook, the ogre's fists on the floor or his landing
  // (24 Sep 2026: "if the shield is between the blow and him, it protects"). Asked of the side the
  // blow comes from, not of the shield's own reach, whoever threw it has already been found in
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
  // answers on and the same answer, the goat takes nothing, but the box comes apart doing it, so
  // it is a thing you spend rather than a thing you carry. Anything picked up on the way past is
  // suddenly worth holding on to for a moment longer, which is the point.
  crated(x, y) {
    const h = this.holding;
    if (!h || h.kind !== 'crate' || h.broken) return false;
    return this.covers(x, y);
  }

  // The fire under him and the poison round his feet, every step he is on the floor, stunned or not.
  burnStep(game, world, dt) {
    const g = TUNING.goat;
    // ---- fire ----
    // Witchfire goes straight through the coat: nothing the souls offer turns the Seer's fire away.
    const witch = world.isWitchPx(this.x, this.y);
    this.witchFire = witch;
    this.onFire = witch || world.isBurningPx(this.x, this.y) || !!this.intoBrazier(game);
    if (this.onFire) {
      this.fireTick += dt;
      // EMBER COAT does not stop the burning, it buys time against it: ordinary fire takes
      // `fireResist` times as long to land its tick, and stacking up flame under a goat who never
      // takes damage from it made running through it a way of not playing the level. The fire souls
      // he carries add their grace on top (`mods.fireGuard`, `BOON_SETS.fire`), and all four of them
      // make ordinary fire nothing to him at all. Witchfire is the Seer's, and no soul turns it.
      const interval = g.fireDamageInterval * (witch ? 1 : game.mods.fireResist) + (witch ? 0 : game.mods.fireGuard || 0)
        + (game.level.def.shroom ? TUNING.shroom.burnDelay : 0);
      if (!witch && game.mods.fireImmune) this.fireTick = 0;
      else if (this.fireTick >= interval) {
        this.fireTick = 0; this.damage(1, game, -this.aim.x * 60, -this.aim.y * 60, true, witch ? 'witchfire' : 'fire');
        if (witch && game.mods.fireResist > 1) game.floatText(this.x, this.y - 32, 'WITCHFIRE', PALETTE.witch);
      }
      // How far the flame on him has grown toward the heart it costs (1 Oct 2026, "small when he has
      // just stepped in, growing fast, and full size is the damage"): the drawing reads only this.
      this.fireK = clamp(this.fireTick / interval, 0, 1);
    } else {
      // Out of it he still smoulders: the heat already in him stays (never past `burnLook.keep` of a tick, so
      // stepping in and out is not a way round it) and cools off slowly, `burnLook.cool` s a second.
      this.fireTick = Math.max(0, Math.min(this.fireTick, g.fireDamageInterval * g.burnLook.keep) - g.burnLook.cool * dt);
      this.fireK = 0;
    }

    // ---- poison ---- (js/status.js: the ring, then the slow)
    Status.goat(game, this, dt);
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
    const ask = hyp(ax, ay); if (ask < 0.1) return null;
    for (const p of game.props) {
      if (p.kind !== 'brazier' || p.broken) continue;
      const dx = p.x - this.x, dy = p.y - this.y, d = hyp(dx, dy);
      if (d < p.r + this.r + B.touch && (ax * dx + ay * dy) / (ask * (d || 1)) >= B.into) return p;
    }
    return null;
  }
  covers(x, y, far) {
    const W = TUNING.prop.weapon;
    if (!far && hyp(x - this.x, y - this.y) > this.r + W.coverR) return false;
    return Math.abs(angleDiff(Math.atan2(this.aim.y, this.aim.x), Math.atan2(y - this.y, x - this.x))) < W.coverArc / 2;
  }
  // `by` is what did it, the man, or a word for the room ('fire', 'mill', 'fall'…), kept only so
  // the death card can say what the last heart went to.
  damage(n, game, kx, ky, fromFire, by) {
    if (this.dead || (this.invuln > 0 && !fromFire)) return;
    if (game.breakSneak) game.breakSneak();   // STEALTH (dev test): a blow on him is a fight, the sneak ends
    Shaman.shake(game, this);   // a blow that reaches him shakes off the shaman's call for a while (js/shaman.js)
    if (game.dev.god) { game.particles(this.x, this.y, 4, PALETTE.fireHi, 90); return; }
    if (by !== 'fall' && this.tripPhase(game, kx, ky)) return;
    if (Talisman.absorb(game, this)) return;   // TALLOW SKIN took it
    // THE FISH's water (`mods.wet`, js/beasts-more.js): the first fire on him a floor only steams off his fleece.
    if (this.wet > 0 && (fromFire || by === 'fire' || by === 'witchfire')) {
      this.wet--; this.invuln = TUNING.goat.invuln + (game.mods.invulnAdd || 0);
      game.particles(this.x, this.y - 10, 14, '#d8e4e8', 140); game.audio.sfxAnimal('fish');
      game.floatText(this.x, this.y - 34, 'IT ONLY STEAMS', '#d8e4e8');
      return;
    }
    // The tortoise's iron (js/beasts.js), the outermost thing on him: takes the whole blow and comes
    // off him in pieces the way the blow went (pillar 3 untouched, it never kills anybody).
    if (this.armour > 0) {
      this.armour--; this.invuln = TUNING.goat.invuln + (game.mods.invulnAdd || 0);
      this.vx += (kx || 0) * 0.5; this.vy += (ky || 0) * 0.5;
      if (game.scatter) game.scatter.breakUp(['barding-pauldron', 'barding-pauldron', 'barding-plate', 'barding-plate'], this.x, this.y, 14, kx || 0, ky || 0, 0.8);
      game.shake(TUNING.juice.shakeHit * 0.5, true); game.squashGoat(TUNING.juice.squash.hurt);
      game.particles(this.x, this.y - 10, 10, '#a9b2bd', 160);
      game.floatText(this.x, this.y - 34, 'THE ARMOUR TOOK IT', '#a9b2bd');
      return;
    }
    // THE MIRROR's HALO: a heart of light over his own takes the whole blow and goes out.
    if (this.light > 0) {
      this.light--; this.invuln = TUNING.goat.invuln + (game.mods.invulnAdd || 0);
      this.vx += (kx || 0) * 0.5; this.vy += (ky || 0) * 0.5;
      game.audio.sfxChime(TUNING.heaven.bells[4], 0.8); game.flash('#fff4c2', 0.25);
      game.particles(this.x, this.y - 10, 14, '#fff4c2', 180); game.ring(this.x, this.y, 2 * TILE, '#f7d774');
      game.floatText(this.x, this.y - 34, 'THE HALO TOOK IT', '#fff4c2');
      return;
    }
    this.hp -= n; this.invuln = TUNING.goat.invuln + (game.mods.invulnAdd || 0); this.hurtBy = by || null;
    Stats.hurt(game, by, n);
    if (game.heartLog) for (let k = 0; k < n; k++) game.heartLog.push(game.timer);
    // and the room each was lost in, for the table from heaven's dramatic beat (`updateSkyTables`)
    if (game.hurtRooms) for (let k = 0; k < n; k++) game.hurtRooms.push(game.goatRoom || 0);
    this.vx += kx || 0; this.vy += ky || 0;
    Talisman.loseRunUp(game, this);            // whatever he had built up, the club took it (BRASS SPUR keeps some)

    game.shake(TUNING.juice.shakeHit, true); game.audio.sfxHit(); game.audio.musicEvent('hurt'); game.squashGoat(TUNING.juice.squash.hurt);
    game.hitstop(TUNING.juice.hurtStop);   // the world holds a beat on a lost heart (Hollow Knight's)
    // A goat that only grunts when it is hit reads as armour, not an animal, the frightened bleat
    // is what says it felt that.
    game.audio.sfxBleat(560, 0.24, 0.3);
    game.hurtFlash(Math.atan2(-(ky || 0), -(kx || 0)));
    game.world.splat(this.x, this.y, (kx || 0) / 100, (ky || 0) / 100, 9);
    if (this.state === 'windup' || this.state === 'bite') this.state = 'idle';   // a blow takes the bite out of his mouth too
    if (this.hp <= 0 && !Talisman.scapegoat(game, this) && !Motes.second(game, this)) this.die(game);
  }
  // THE TRIP's mercy: a blow that lands may turn out never to have. He is somewhere else, away from
  // where it came from, on plain floor with nothing burning, and says so. Returns true if it did.
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
        // Never through a shut door (a soul gate, the vault, the stair door) nor onto the stairs,
        // nor into a boulder or a table: stone alone was all `los` asked about.
        if (w.tileAt(tx, ty) === T.EXIT || !game.sees(this.x, this.y, nx, ny)) continue;
        if (game.props.some((p) => p.blocking && !p.broken && hyp(p.x - nx, p.y - ny) < (p.r || 10) + this.r)) continue;
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
      : kind === 'tortoise' ? P.tortoise.r : kind === 'goose' ? P.goose.r : kind === 'crow' ? P.crow.r : kind === 'horse' ? P.horse.r : kind === 'pig' ? P.pig.r
      : kind === 'rabbit' ? P.rabbit.r : kind === 'husky' ? P.husky.r : kind === 'fish' ? P.fish.r
      : kind === 'cage' ? P.cage.r : kind === 'spike' ? P.spike.r : kind === 'brazier' ? P.brazier.r
      : kind === 'bomb' ? P.bomb.r : kind === 'rock' ? P.rock.r : kind === 'spire' ? P.spire.r
      : kind === 'barrel' ? P.barrel.r : kind === 'cleat' ? P.cleat.r
      : kind === 'armor' ? P.armor.r : kind === 'trophy' ? P.trophy.r : kind === 'suit' ? P.suit.r : kind === 'poster' ? P.poster.r
      : kind === 'mouse' ? P.mouse.r : kind === 'ware' ? P.ware.r
      : kind === 'key' ? TUNING.keys.r : kind === 'ironcage' ? TUNING.keys.iron.r : 13;
    // The shop (js/shop.js). A mouse carries which room's shelf is hers (`shopId`), where the gap
    // in the wall is (`gap`, which is where the ogre comes out), how many blows she has taken and
    // what she is saying; a ware carries the artifact on it, `{ id, tier }`, and whether
    // it is `locked` (the ogre is out) or `free` (he is down).
    this.shopId = opts && opts.shopId !== undefined ? opts.shopId : -1;
    this.gap = (opts && opts.gap) || null; this.strikes = 0; this.say = null; this.angry = 0;
    // `free` from the spec only on THE SHOWROOM's shelf, where every stool is his (it was dropped here, and
    // one take packed the whole shelf away); a shop's stools go free when her rat ogre is down.
    this.ware = (opts && opts.ware) || null; this.locked = false; this.free = !!(opts && opts.free);
    this.milkSpots = (opts && opts.milkSpots) || null;   // the milk offer: where her pail is stood
    // -1 until it is thrown for the first time (`fling` arms it); ticking down after that regardless
    // of whether it is picked up and thrown again, so a live bomb stays live.
    this.fuseT = -1;
    // A barrel: -1 until something lights the oil, then the seconds it has left; which fire lit it;
    // whether it has gone over onto its side yet; how far it has rolled, for the drawing.
    this.oilT = -1; this.oilWitch = false; this.lying = false; this.spinD = 0;
    // A barrel of poison, not oil (`TUNING.prop.barrel.venom`). Not `venom`: that is VENOM JAW's mark
    // on a thing thrown dripping (`Status.markThrow`), and the barrel would drip where it stood.
    this.toxic = !!(opts && opts.toxic);
    this.firstGrass = !!(opts && opts.firstGrass);   // THE ALTAR's grass in the corridor, the one that says GRASS HEALS
    this.spillCd = 0;                         // a brazier building its coals back after a spill
    this.axis = (opts && opts.axis) || 'h';   // which way a cage bar's rail runs
    this.deco = !!(opts && opts.deco);        // a cage that is scenery: it never opens
    this.roast = !!(opts && opts.roast);      // a brazier drawn as a campfire with a crocodile on a spit
    // Its ring is low and wide, so the bowl's circle stood out past the stones (1 Oct 2026: "collision again"): it is `roastR`.
    if (this.roast) this.r = P.brazier.roastR;
    // A lantern on the wall (THE DARK): which way the wall it hangs on is, one tile's step.
    this.wall = kind === 'sconce' ? { x: (opts && opts.wx) || 0, y: opts && opts.wy !== undefined ? opts.wy : -1 } : null;
    // A chandelier and the cleat its rope is tied off at share `cid` (`startLevel` joins them as
    // `cleat` / `hangs`). The ring hangs `z` px up; `drop` is 'hang', 'fall' or 'down'.
    this.cid = opts && opts.cid !== undefined ? opts.cid : -1; this.cleat = null; this.hangs = null;
    this.z = kind === 'chandelier' ? TUNING.chandelier.z : 0; this.vz = 0; this.drop = kind === 'chandelier' ? 'hang' : null; this.burnT = 0;
    // The wall's dressing (gen.js `dressWall`): which wall a suit of armour has its back to ('n', 'w',
    // 'e'), whether it has come apart (`spilled`: the empty stand is left); a stag's head that has
    // taken its one body (`spent`), the man on it (`body`, his picture `bodyImg`, his feet `bodyFoot`
    // world px under the prop) and how long it has been bleeding down the wall (`bleedT`).
    this.side = (opts && opts.side) || 'n'; this.spilled = false;
    // A scrap of the cult's paper on the floor (`TUNING.prop.poster`): which drawing it is (`look`: 'breeds' |
    // 'cuts'), how far it has opened out (`unfold`, 0 folded small, 1 the whole drawing; never `open`, the doors'),
    // and torn up.
    this.look = (opts && opts.look) || 'breeds'; this.torn = false; this.unfold = opts && opts.unfolded ? 1 : 0;
    // The halberds a suit still holds (3 Oct 2026 playtest): the wall's one (`armor.halberds`), the stand's one,
    // each taken by a grab beside it (`Goat.tryGrab`) as a thrown blade.
    this.halberds = kind === 'armor' ? TUNING.prop.armor.halberds : kind === 'suit' ? 1 : 0;
    this.spent = false; this.body = null; this.bodyImg = null; this.bodyFoot = 0; this.bleedT = 0;
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
    // corridors. `vault` is the soul door on top of that, the one with a soul behind it, worth a
    // fourth blow and drawn so that nobody mistakes it for the iron door they passed two rooms ago.
    // `stair` is the iron door at the top of every level, `gate` the barred one on level one that
    // opens for a swallowed soul and for nothing else, the only door in the game a headbutt cannot
    // answer, which is what makes the soul behind it the answer.
    this.iron = !!(opts && opts.iron); this.vault = !!(opts && opts.vault);
    this.stair = !!(opts && opts.stair); this.gate = !!(opts && opts.gate);
    // Which room's soul lifts a gate: a level has two of them (`gates` on the level).
    this.gateRoom = (opts && opts.gateRoom !== undefined) ? opts.gateRoom : -1;
    this.shopGate = !!(opts && opts.shopGate);   // the mouse's gate: a talisman lifts it, not a soul
    this.exitGate = !!(opts && opts.exitGate);   // the door in front of the stairs, barred by the last boss's soul
    // A clamp (`game.updateClamps`): the plate bolted over the mouth of a room left behind. `span`
    // is how many tiles of mouth it covers and `slam` the beat it takes to drive home.
    this.span = (opts && opts.span) || 2;
    // A coop: which animal is inside it. Every animal on our side starts shut in one (`Beast`).
    this.holds = (opts && opts.holds) || (kind === 'ironcage' ? 'grass' : 'chicken');
    // Shut with iron instead of slats (`TUNING.keys`): no blow opens it, a key does (`unlockIron`).
    // The `ironcage` kind is always iron; a coop is iron only when the floor rolled it.
    this.ironCage = kind === 'ironcage' || !!(opts && opts.ironCage);
    // The horse's is a stall, not a coop: a box (`box`, half-extents) that everything which meets
    // furniture asks before it asks `r` (`Prop.boxPush`), and `r` the half-length for the rest.
    this.box = stallHalf(this);
    if (this.box) this.r = Math.max(this.box.hx, this.box.hy);
    this.slam = kind === 'clamp' ? TUNING.clamp.slam : 0;
    // A sealed arena's pair of doors: no hit points either, the same as the soul gate, but lifted by
    // clearing the room rather than by a soul. `sealRoom` names which room's fight has to end first.
    this.seal = !!(opts && opts.seal); this.sealRoom = (opts && opts.sealRoom !== undefined) ? opts.sealRoom : -1;
    // The door that is already closing. It stands open, `open` 1 is a door swung clear of the gap,
    // and `blocking`/`opaque` both read that, so while the count runs it is not in the room at all,
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
    // A grate laid under something (`gen.js`, 30 Sep 2026): `cover` is what stands on it, found by
    // `Game.startLevel`; while that is still on its tile and the teeth are down, it is not drawn.
    this.hidden = !!(opts && opts.hidden); this.cover = null;
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
  // Where a body at (x, y) stands against a box (`box`, the horse's stall): `d` from the nearest
  // side, negative when its middle is inside, and the way out along the side it is nearest.
  boxPush(x, y) {
    const b = this.box, cx = clamp(x, this.x - b.hx, this.x + b.hx), cy = clamp(y, this.y - b.hy, this.y + b.hy);
    const dx = x - cx, dy = y - cy, d = hyp(dx, dy);
    if (d > 0.001) return { d, nx: dx / d, ny: dy / d };
    const ex = b.hx - Math.abs(x - this.x), ey = b.hy - Math.abs(y - this.y);
    return ex < ey ? { d: -ex, nx: x >= this.x ? 1 : -1, ny: 0 } : { d: -ey, nx: 0, ny: y >= this.y ? 1 : -1 };
  }
  // What the goat can pick up and throw: it is carried, not held down, and it blocks nothing. A
  // loose hen counts too, the same mouth that takes a crate takes her, but not mid-flight or
  // stunned, since a bird already on her way to a man is not a thing you can also be carrying.
  get item() { return (this.kind === 'crate' && !this.noGrab) || this.kind === 'weapon' || this.kind === 'bomb' || (this.kind === 'chicken' && this.birdState === 'loose')
    // A tortoise on its feet is picked up like a crate; one that has just landed has pulled its head
    // in and is a piece of the room instead (`blocking`, below) until it comes out of it again.
    || (this.kind === 'tortoise' && !this.flying && !(this.tuckT > 0) && !(this.coolT > 0))
    // THE FISH's tank: carried, never walked (js/beasts-more.js).
    || (this.kind === 'fish' && !this.flying && !this.broken); }
  get blocking() {
    if (this.broken) return false;
    // Nothing stands on a plate's shoulders: it is floor until it is teeth. A loose bird is not
    // furniture either, she is got out of the way of, not walked into.
    // A clamp is drawn over stone that is already stone: the tiles under it are what stop you.
    // The cave's stone teeth are the same kind of thing as a plate: a hazard you can walk into and
    // not a wall you cannot. A spike you cannot reach cannot cut you, and cutting is all it does.
    // A tortoise is the one escort that IS furniture. Where a throw puts it down it pulls its head
    // in for `tuck` seconds and is a shell: a body stops against it, a round stops on it, and it
    // cannot be picked up again until it comes out, which is what makes the throw a decision about
    // cover rather than a way of carrying it about. See js/beasts.js.
    if (this.kind === 'tortoise') return !this.flying && this.tuckT > 0 && !this.held && !(this.coolT > 0);
    if (this.kind === 'goose' || this.kind === 'crow' || this.kind === 'horse' || this.kind === 'pig' || this.kind === 'rabbit' || this.kind === 'husky') return false;
    // A lantern on the wall is up on the stone, out of anybody's way.
    if (this.item || this.kind === 'heal' || this.kind === 'spike' || this.kind === 'spire' || this.kind === 'chicken' || this.kind === 'mouse' || this.kind === 'ware' || this.kind === 'clamp' || this.kind === 'shrooms' || this.kind === 'sconce' || this.kind === 'cleat' || this.kind === 'chandelier' || this.kind === 'trophy' || this.kind === 'poster' || this.kind === 'key') return false;
    // A suit of armour hangs on the stone, out of anybody's way too: what comes to it is found by what
    // arrives (`Enemy.wallDressing`, `hitProp`, `Scatter.burst`).
    if (this.kind === 'armor') return false;
    // The suit that stands on the floor is furniture until something brings it down (`burstArmor`); the bare stand left is not.
    if (this.kind === 'suit') return !this.spilled;
    if (this.kind === 'door') return this.open < 0.5;
    // A SPADE body you cannot lift is still something men trip on, never a wall: pushed out to
    // touching, nobody ever got close enough to trip, and the thrown died on it as on stone.
    if (this.corpse) return false;
    return true;
  }
  get stopsBullets() { return !this.broken && ((this.kind === 'tortoise' && !this.flying && !this.held && !(this.coolT > 0)) || this.kind === 'table' || this.kind === 'barrel' || this.kind === 'rock' || this.kind === 'brazier' || this.kind === 'bell' || this.kind === 'secret' || (this.kind === 'door' && this.open < 0.5)); }
  // What an eye stops at. A shut door is a wall with hinges, and a man on the far side of one used
  // to spot you straight through it and come round, which from where you were standing was being
  // seen through stone. The gong and the hub of the wheel are the only other two things in a room
  // solid enough and tall enough to stand behind. Everything else, a table, a lamp post, a bowl of
  // coals, the bars of a pen, you can see over or between, and so can he.
  // A door shut enough to stop a blast (`Game.blastClear`): the same half way `opaque` asks.
  get blastStop() { return this.kind === 'door' && !this.broken && this.open < 0.5; }
  get opaque() {
    if (this.broken) return false;
    if (this.kind === 'door') return this.open < 0.5;
    return this.kind === 'bell' || this.kind === 'mill' || this.kind === 'secret';
  }

  fling(vx, vy, thrown) {
    this.vx = vx; this.vy = vy; this.flung = true; this.thrown = thrown; this.held = false; this.passed.length = 0; this.glanced = 0;
    this.byCult = null;   // the thrower's mark is his throw's alone (`Thrower.release` sets it after this)
    // A bomb is actually armed at `tryGrab`, the moment it is in the goat's mouth, not here, high
    // risk, high reward, since there is no button for it beyond grab and release. This is only the
    // belt to that brace, in case something ever flings one that was never held.
    if (this.kind === 'bomb' && this.fuseT < 0) this.fuseT = TUNING.prop.bomb.fuse;
    this.flyT = 0;   // a bomb's clock out of the mouth (`prop.bomb.hit.arm`)
  }

  headbutt(game, ax, ay) {
    if (this.heaven) { Heaven.butt(game, this, ax, ay); return; }   // the bells, the mirror, the old man (js/heaven.js)
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
      case 'cleat': this.cutRope(game); break;
      // A horn brings it down too (1 Oct 2026: "they fly apart when you butt them"), as a body landing by it does.
      case 'armor': case 'suit': if (!this.spilled) this.burstArmor(game, ax, ay, 0.9); break;
      case 'poster': this.tear(game, ax, ay); break;
      case 'table': if (this.flipped) this.knockFlipped(game, ax, ay); else this.shove(game, ax, ay); break;
      case 'barrel': this.roll(game, ax, ay, TUNING.prop.barrel.roll); break;
      case 'lamp': this.topple(game, ax, ay); break;
      case 'brazier': this.spill(game, ax, ay); break;
      case 'cage': if (this.deco) this.breakDeadCage(game); else this.breakCage(game); break;
      case 'coop': if (this.ironCage) this.ringIron(game); else this.breakCoop(game); break;
      case 'ironcage': this.ringIron(game); break;
      case 'chicken': this.kick(game, ax, ay); break;
      // The pig he said no to, eating his grass out of spite: the horns are the one way to stop her.
      case 'pig': if (this.spite) Beast.hurt(this, game, 'blow'); else { this.wobble = 0.3; game.audio.sfxThud(); Beast.dope(this, game, 'stun'); } break;
      // The trader and her shelf: rough is a strike against her, and the third one is the rat ogre.
      case 'mouse': case 'ware': Shop.provoke(game, this); break;
      default:
        this.wobble = 0.3; game.audio.sfxThud();
        // One of his own animals dazed by the horns (6 Oct 2026 playtest: "the stun works on them too").
        if (Beast.is(this.kind)) Beast.dope(this, game, 'stun');
        break;
    }
  }

  // Coals knocked out of the bowl. A blow on a brazier, a horn, or a body arriving at speed,
  // throws a spill of fire out of the far side of it, so the brazier is a thing you can use with
  // your head and not only a thing to throw a man into. It is short and it is one tile wide: a line
  // you draw across a doorway for a beat, and the bowl has to build its heat back before the next.
  spill(game, ax, ay) {
    if (this.broken) return;
    const B = TUNING.prop.brazier;
    this.wobble = 0.3;
    if (this.spillCd > 0) { game.audio.sfxThud(); return; }
    this.spillCd = B.spillCd;
    const l = hyp(ax, ay) || 1; ax /= l; ay /= l;
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
    // Seen going down (30 Sep 2026: "show how it falls"): the picture of it, as a man's is
    // (`game.fallers`), carrying the way it was going.
    if (game.fallers && (this.kind === 'table' || this.kind === 'crate' || this.kind === 'barrel' || this.kind === 'bomb' || this.kind === 'weapon')) {
      const pic = Object.assign(Object.create(Object.getPrototypeOf(this)), this, { broken: false, dead: false, flung: false, held: false });
      game.fallers.push({ prop: pic, x: this.x, y: this.y, t: 0, life: TUNING.fall.showFor * 1.6,
        spin: (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random()), dx: this.vx * 0.2, dy: this.vy * 0.2 });
    }
    // A table butted off heaven's edge lands on the floor below, on a man (`Game.updateSkyTables`).
    if (this.kind === 'table' && game.state === 'heaven') {
      game.heavenTables = (game.heavenTables || 0) + 1;
    }
    this.broken = true; this.dead = true; this.flung = false; this.thrown = false; this.vx = 0; this.vy = 0;
    if (game.goat.holding === this) { game.goat.holding = null; game.goat.autoHeld = false; game.goat.spendGrab(game, false); }
    if (this.kind === 'barrel') this.unHazard(game);
    game.particles(this.x, this.y, 8, PALETTE.ink, 110); game.audio.sfxSwing();
  }

  // What a thing in flight does to the furniture it lands on. A lamp goes over and pours its oil
  // the way it was hit, a gong rings, and everything else is as solid as a wall: the room is real
  // to a thrown crate and a thrown blade, not only to a man. Returns the prop hit, or null.
  hitProp(game, nx, ny) {
    for (const p of game.props) {
      if (p === this) continue;
      // A suit of armour on the wall is not in the way, but a thing arriving at it fast brings it
      // down and flies on through the pieces.
      // The one that stands on the floor is solid until it goes: slower than `hit` it is a post like any other.
      if (p.kind === 'armor' || p.kind === 'suit') {
        if (!p.spilled && hyp(this.x - p.x, this.y - p.y) < p.r + this.r && hyp(this.vx, this.vy) > TUNING.prop.armor.hit) {
          p.burstArmor(game, nx, ny, 0.8); this.vx *= TUNING.prop.armor.slow; this.vy *= TUNING.prop.armor.slow;
        }
        if (p.kind === 'armor') continue;
      }
      if (!p.blocking) continue;
      let dx = this.x - p.x, dy = this.y - p.y, d = hyp(dx, dy), pen = p.r + this.r - d;
      if (p.box) { const o = p.boxPush(this.x, this.y); pen = this.r - o.d; dx = o.nx; dy = o.ny; d = 1; }
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
  // lid goes over a moment later, so what it takes is the ground he has just left, which is the one
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
    } else if (this.spikeT <= 0 || (this.spikeState === 'rest' && S.rest - this.spikeT >= S.restMan)) {
      const by = this.tripped(game, this.spikeT > 0);
      if (!by) return;
      // A man's own foot arms it at `armMan`, not `arm`: at the goat's pace he had always walked off
      // the boards before the teeth came, so a grate read as never going off under the cult at all
      // (playtest, 30 Sep 2026). The goat still gets the long beat: the ground he has just left.
      this.spikeState = 'armed'; this.spikeT = by === game.goat ? S.arm : S.armMan;
      game.audio.sfxThud();
    }
  }
  covered() {
    const c = this.cover;
    if (!c || c.broken || c.held || c.dead || (this.spikeState !== 'idle' && this.spikeState !== 'rest')) return false;
    return Math.floor(c.x / TILE) === Math.floor(this.x / TILE) && Math.floor(c.y / TILE) === Math.floor(this.y / TILE);
  }
  // Who sets one off. The goat, and now anybody chasing him: a grate that only answered to the goat
  // was a tool with a switch on it, and a man could stand on the boards over the teeth all day. The
  // dead are the exception, because nothing under the floor reaches something that is not there.
  // Only a foot on this grate's own tile sets it off (29 Sep 2026: "only once you, or anyone, stood
  // right on that tile, not beside it"); a reach of 1.3 tiles went off under whoever passed next to
  // the patch, and a man walking round its edge read as walking over it untouched.
  // `menOnly`: still resting (`spike.restMan`), the goat's own foot does not count yet.
  tripped(game, menOnly) {
    const g = game.goat, tx = Math.floor(this.x / TILE), ty = Math.floor(this.y / TILE);
    const on = (b) => Math.floor(b.x / TILE) === tx && Math.floor(b.y / TILE) === ty;
    // A goat in the air over a man (LEAPFROG) is over the boards too, as he is over a drop.
    if (!menOnly && !g.dead && !g.leap && g.state !== 'carried' && on(g)) return g;
    // Only the men who ran this step (`game.liveEnemies`): a man frozen two rooms away is not
    // walking onto anything, and asking the level's whole cast once per grate, three times a step,
    // was the most expensive thing in the simulation on a late floor.
    // A man who has not noticed the goat walks his own floor where the boards are nailed down: only
    // a man coming for him, in a hurry, sets one off, or a patrol would empty a room by himself.
    for (const e of game.liveEnemies) {
      if (e.dead || e.ghosted || e.held || e.state === 'hop') continue;   // a leaper is over the boards
      if (!e.aware && !e.flung && !e.thrown) continue;
      if (on(e)) return e;
    }
    return null;
  }
  // Everything standing on the crate when the lid goes, goat included. A man dies on it; the goat
  // pays the same heart the Mill charges, and the crate does not ask him twice.
  bite(game) {
    const S = TUNING.prop.spike;
    const bit = this.bit || (this.bit = []);
    for (const e of game.liveEnemies) {
      if (e.dead || e.ghosted || e.state === 'hop' || bit.indexOf(e) >= 0) continue;
      if (len(e.x - this.x, e.y - this.y) > this.r + e.r) continue;
      bit.push(e);
      // A man in your mouth is standing on the plate like anybody else, and the teeth take him
      // out of it. `held` is also a man over the thrower's head: only the goat's own hold is emptied
      // and charged here (it used to drop whatever he had and leave that thing `held` for good);
      // the thrower lets go himself when `Thrower.hold` sees him no longer held.
      if (e.held) { if (game.goat.holding === e) { game.goat.holding = null; game.goat.spendGrab(game, true); } e.held = false; }
      e.die(game, 'spike');
    }
    const g = game.goat;
    if (!g.dead && !g.leap && g.state !== 'carried' && len(g.x - this.x, g.y - this.y) < this.r + g.r) g.damage(S.damage, game, 0, -40, false, 'spike');
  }
  // The cave's stone teeth, standing at the foot of a wall. The rock everywhere else in a cave is
  // scenery; this is the rare one that is real (`TUNING.cave.spikes`), and the 22 Sep 2026 note is
  // the whole of its design: if something spiky sticks out of the wall, let it hurt. It never moves,
  // never arms and never resets, anything that touches it pays. A man dies on it the way he dies on
  // the grating, which is the point of standing it where a headbutt can put one; the goat pays a
  // heart and his own mercy frames keep him from paying it twice. Everyone with eyes steers round it
  // (`Enemy.hazardAt`), so the men who find it are the ones whose `trapSense` roll went wrong.
  updateSpire(dt, game) {
    if (this.broken) return;
    const C = TUNING.cave.spikes, g = game.goat;
    for (const e of game.liveEnemies) {
      // A leaper in the air is over the teeth, not on them; one already caught on them is theirs.
      if (e.dead || e.ghosted || e.state === 'hop' || e.impaled > 0 || (e.spireAt !== undefined && e.spireAt > game.timer - C.again)) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = len(dx, dy), reach = this.r + e.r * 0.7;
      if (d > reach) continue;
      // Too big to die on them: the ogre coming down on the teeth, out of a leap, knocked back onto
      // them, hangs there (`Enemy.impale`). Walking, he only treads round them: a stroll into a
      // tooth was the old accident that pinned him until he died.
      if (C.impale.kinds.includes(e.kind)) {
        if (C.impale.from.includes(e.state)) { e.spireAt = game.timer; e.impale(game, this); }
        else if (d > 0.5) { e.x = this.x + dx / d * (reach + 0.5); e.y = this.y + dy / d * (reach + 0.5); }
        continue;
      }
      e.spireAt = game.timer;
      // A man in your mouth is over the rock like anybody else, and the rock takes him out of it.
      if (e.held) { if (g.holding === e) { g.holding = null; g.spendGrab(game, true); } e.held = false; }
      e.die(game, 'spire');
    }
    if (!g.dead && !g.leap && g.state !== 'carried' && len(g.x - this.x, g.y - this.y) < this.r + g.r * 0.7) {
      g.damage(C.damage, game, (g.x - this.x) * 3, (g.y - this.y) * 3, false, 'spire');
    }
  }
  // Is the crate a place nobody should be standing? Open, or close enough to open that a man walking
  // on now would be on it when the teeth arrive.
  spikeThreat() {
    return this.spikeState === 'up' || (this.spikeState === 'armed' && this.spikeT <= TUNING.prop.spike.lead);
  }

  // The gong answers back. Every man on the floor now knows where you are, and for the next few
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
    game.floatText(g.x, g.y - 44, 'STRONGER', PALETTE.fireHi);   // 1 Oct 2026: "write STRONGER over him"
    game.ring(g.x, g.y, 3 * TILE, PALETTE.fireHi); game.flash(PALETTE.fireHi, 0.12); game.vibe(25);
  }

  // Doors. `by` is whoever came through it at speed and is spared the fling (the butcher on his
  // charge, until the hook replaced it on 30 Sep 2026; no caller passes one now). Planks go on the
  // first blow: a door in a corridor is a thing you run through. Iron does not, and the whole of its
  // value is that it does not, nobody shoulders it open, so a corridor with one in it is three
  // blows of standing still with whatever heard the first already coming.
  // The soul door is four, and it is the one door in a level that is not on the way anywhere.
  smash(game, ax, ay, by) {
    if (this.broken) return;
    // A patch of wall is not a door: two blows and a crack, not a count of what a door has left.
    if (this.kind === 'secret') { this.crackWall(game); return; }
    // The soul gate is barred from the far side and there is nothing on this one to break. It says
    // so with the word over it (`A SOUL OPENS IT`, drawn always) and the trail to its soul. A float
    // saying the same again stacked three lines on the one spot (3 Oct 2026), so there is none.
    if (this.gate) {
      this.wobble = 0.3; game.audio.sfxSteel(); game.shake(3); game.vibe(10);
      game.guideTo(this);
      return;
    }
    // A sealed arena's own pair: barred the same way, and lifted the same way, nothing on this
    // side of it opens it, only the room going quiet does.
    if (this.seal) {
      this.wobble = 0.3; game.audio.sfxSteel(); game.shake(3); game.vibe(10);
      game.floatText(this.x, this.y - 28, 'IT WILL NOT GIVE', PALETTE.bone);
      return;
    }
    const D = TUNING.prop.door;
    // `needHits`: a door with its own count (the ogre's vault, `TUNING.vault.ogre.hits`).
    const need = this.needHits || (this.vault ? D.vaultHits : this.stair ? D.stairHits : this.iron ? D.ironHits : D.hits);
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
      if (hyp(dx, dy) > 2.1 * TILE) continue;
      if ((dx * ax + dy * ay) < -4) continue;
      if (e.kind === 'butcher') { if (e.state !== 'hop') { e.state = 'stagger'; e.timer = TUNING.butcher.rocked.door; } }
      else e.fling(ax * 17 * TILE, ay * 17 * TILE, false);
    }
  }

  // A patch of wall that used to be a wall. Two blows, and nothing on the way there says which
  // patch: the crack in it is the only hint the level ever gives, and finding it was the game.
  crackWall(game) {
    // The deep one of a double niche (`carveDeepSecret`) is still rock inside the first niche's list
    // until that wall is down: nothing, a blast through the stone included, opens it from the room.
    const at = Math.floor(this.y / TILE) * game.world.W + Math.floor(this.x / TILE);
    if (game.niches && game.niches.some((o) => o !== this && !o.broken && o.nicheTiles.indexOf(at) > 0)) return;
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
    // The horse's stall is heavier timber: the first blow splits a rail, the second lets it out.
    const need = this.box ? TUNING.prop.stall.hits : TUNING.prop.coop.hits;
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
    game.props.push(pet); Stats.beast(game, kind, 'freed');
    // The first of a kind says its own terms over its head (`Beast.PACT`); after that its name will do.
    const told = kind === 'chicken' ? game.henTold : (game.beastTold || {})[kind];
    if (told) { game.audio.sfxAnimal(kind); game.floatText(this.x, this.y - 34, 'A ' + Beast.NAME[kind], PALETTE.hen); }
    else if (kind === 'chicken') game.henFreed(pet); else Beast.met(game, pet);   // her words ride on her, not the coop
  }

  // An iron cage (`TUNING.keys`): no blow gives it, a key does. Butted with none it rings and says
  // so; butted with one, the key is spent and the door swings. An animal walks out the way it does
  // out of slats (`breakCoop`, told its blows are done); the grass cage leaves its big milk grass standing.
  // A headbutt only rings it, and says what does open it.
  ringIron(game) {
    this.wobble = 0.25; game.audio.sfxThud(); game.audio.sfxSteel(); game.shake(2); game.vibe(8);
    game.floatText(this.x, this.y - 34, game.runKeys > 0 ? 'GRAB IT TO USE THE KEY' : 'IT NEEDS A KEY', PALETTE.bone);
  }
  unlockIron(game) {
    if (this.broken) return;
    if (!(game.runKeys > 0)) { this.ringIron(game); return; }
    game.runKeys--; game.keyFlash = 0.5;
    game.audio.sfxSteel(); game.audio.sfxBell && game.audio.sfxBell();
    game.particles(this.x, this.y, 14, PALETTE.ash, 220);
    game.floatText(this.x, this.y - 34, 'THE KEY TURNS', PALETTE.fireHi); game.learn('iron');
    if (this.kind === 'coop') { this.hits = Infinity; this.breakCoop(game); return; }
    this.broken = true; this.dead = true;
    game.world.emitNoise(this.x, this.y, TUNING.noise.smash * 0.6);
    if (this.holds === 'grass') game.props.push(new Prop(this.x, this.y, 'heal', { big: true }));
  }

  // A key on the floor: walked over, it is his (`game.runKeys`), and it stays his from floor to floor.
  updateKey(game) {
    const g = game.goat;
    if (this.broken || g.dead || hyp(g.x - this.x, g.y - this.y) > TUNING.keys.pickR) return;
    this.broken = true; this.dead = true;
    game.runKeys = (game.runKeys || 0) + 1; game.keyFlash = 0.6; game.learn('key');
    game.audio.sfxSteel(); game.vibe(10);
    game.particles(this.x, this.y, 10, PALETTE.fireHi, 160);
    game.floatText(this.x, this.y - 30, 'A KEY', PALETTE.fireHi);
  }

  // A horn under a bird. She is not thrown, there is nothing to pick up and nothing to hold, she
  // is kicked, which is the headbutt doing what it already does to a crate, and she finds her own
  // man on the way. The target is chosen once, off the line she was kicked along, and `updateBird`
  // keeps her steering at it.
  kick(game, ax, ay) {
    if (this.broken || this.birdState === 'flying') return;
    const C = TUNING.prop.chicken;
    const l = hyp(ax, ay) || 1; ax /= l; ay /= l;
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
  // rest of the game refuses to hit, the dead, the held, a wraith that is not there, is refused
  // here too, so a kick is never spent on a thing that was never going to be struck.
  pickTarget(game, ax, ay) {
    const C = TUNING.prop.chicken;
    let best = null, bestScore = Infinity;
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = hyp(dx, dy) || 1;
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
    if (this.refused > 0) { Beast.updateRefused(this, dt, game); return; }   // the hen told no goes her way
    if (this.broken) return;
    // In the goat's mouth she goes where his mouth goes, `Goat.update` sets her x/y directly, the
    // same way it does a crate's, so nothing here may also be steering her.
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
      // Dazed by him she sits (`Beast.dope`); poisoned she walks slow, like every animal of ours.
      if (this.stunT > 0 && !this.gapHop) { this.vx = 0; this.vy = 0; return; }
      // She keeps the goat company at a distance and only hurries when he has got away from her.
      const dx = g.x - this.x, dy = g.y - this.y, d = hyp(dx, dy) || 1;
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
      // Over a chasm she hops (`Beast.hopGap`), as every animal of ours does.
      if ((this.gapHop || d > C.followAt * TILE) && Beast.hopGap(this, game, wx, wy, dt)) return;
      // She minds the room the way a careful man does: fire, coals, the wheel, raised teeth, a drop.
      const safe = this.henSteer(game, wx, wy);
      if (this.poisonT > 0) spd *= TUNING.beast.dope.poisonMove;
      if (safe) { this.vx = safe.x * spd; this.vy = safe.y * spd; }
      else { this.vx = 0; this.vy = 0; this.wanderA += Math.PI; }
      this.x += this.vx * dt; this.y += this.vy * dt;
      game.world.collideCircle(this);
      // A bird will not walk down a hole on her own account.
      if (game.world.isPitPx(this.x, this.y)) { this.x -= this.vx * dt; this.y -= this.vy * dt; this.wanderA += Math.PI; }
      return;
    }
    // Flying. She holds her speed, a bird that is aimed and then peters out reads as a dropped
    // ball, and turns onto whoever she has at a fixed rate, so a target behind her is a miss.
    this.birdT += dt;
    if (this.target && (this.target.dead || this.target.held || this.target.ghosted)) this.target = null;
    if (this.target) {
      const dx = this.target.x - this.x, dy = this.target.y - this.y;
      const want = Math.atan2(dy, dx), have = Math.atan2(this.vy, this.vx);
      const turn = Math.max(-C.turn * dt, Math.min(C.turn * dt, angleDiff(have, want)));
      const a = have + turn, spd = hyp(this.vx, this.vy);
      this.vx = Math.cos(a) * spd; this.vy = Math.sin(a) * spd;
    }
    const drag = Math.exp(-C.drag * dt);
    this.vx *= drag; this.vy *= drag;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const spd = hyp(this.vx, this.vy) || 1;
    // Into a man: she comes apart on him and takes him with her. That is the whole of the bargain.
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted) continue;
      if (hyp(e.x - this.x, e.y - this.y) > e.r + this.r) continue;
      this.strike(game, e, this.vx / spd, this.vy / spd);
      return;
    }
    // Into anything else: she is a bird, not a blade. She tumbles, lands, and gets up loose again,
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
    const d = hyp(game.goat.x - this.x, game.goat.y - this.y);
    // Iron says what opens it while he stands by it: a key, and whether he has one.
    if (this.ironCage) {
      const K = TUNING.keys.iron;
      this.sayT = (this.sayT || 0) - dt;
      if (this.sayT <= 0 && d < K.sayR * TILE && !game.hidden(this.x, this.y)) {
        this.sayT = K.sayGap;
        game.floatText(this.x, this.y - 40, game.runKeys > 0 ? 'HEADBUTT IT: SPEND A KEY' : 'IT NEEDS A KEY', game.runKeys > 0 ? PALETTE.fireHi : PALETTE.bone);
      }
      if (this.kind === 'ironcage') return;   // grass does not call
    }
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
    e.die(game, e.kind === 'wraith' ? 'unmade' : 'splat', nx, ny, 'hen');
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
  // sent it, and it does not turn round and take him on the way (the butcher on his charge, until
  // the hook replaced it on 30 Sep 2026; no caller passes one now).
  shove(game, ax, ay, by) {
    this.flung = true; this.vx = ax * 21 * TILE; this.vy = ay * 21 * TILE; this.by = by || null;
    game.world.emitNoise(this.x, this.y, TUNING.noise.table); game.audio.sfxThud(); game.shake(3);
    if (game.scatter) game.scatter.fromTable(this, ax, ay, 1);   // the supper on it goes first (js/scatter.js)
  }

  // A table goes over onto its side, its top toward where it was going (`flipped`: 'n', 's', 'e',
  // 'w'): a wider thing that stops men and rounds, and that nobody shoulders along any more.
  flipTable(game, ax, ay) {
    if (this.broken || this.flipped || this.isAltar || this.noFlip) return;
    const F = TUNING.prop.table.flip;
    this.flipped = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'e' : 'w') : (ay > 0 ? 's' : 'n');
    this.flung = false; this.vx = 0; this.vy = 0; this.by = null; this.r = F.r; this.flipHits = F.hits;
    game.world.collideCircle(this);
    game.world.emitNoise(this.x, this.y, TUNING.noise.table); game.audio.sfxThud(); game.shake(2);
    game.dust(this.x, this.y, 5, ax, ay); game.particles(this.x, this.y, 6, PALETTE.wood, 110);
    if (game.scatter) game.scatter.fromTable(this, ax, ay, 1);
  }
  // A headbutt on a table on its side only rocks it; the last of `flip.hits` breaks it into planks.
  knockFlipped(game, ax, ay) {
    this.wobble = 0.25; this.flipHits = (this.flipHits || 1) - 1;
    game.audio.sfxThud(); game.particles(this.x, this.y, 5, PALETTE.wood, 120);
    if (this.flipHits <= 0) this.smashTable(game, ax, ay);
  }
  smashTable(game, ax, ay) {
    if (this.broken) return;
    this.broken = true; this.dead = true;
    game.world.emitNoise(this.x, this.y, TUNING.noise.smash); game.audio.sfxThud(); game.shake(3);
    game.particles(this.x, this.y, 16, PALETTE.wood, 190); game.dust(this.x, this.y, 6, ax || 0, ay || 0);
  }

  // The rope's cleat on the far wall (`TUNING.prop.cleat`): a headbutt cuts it (`headbutt`), and so
  // does a body or a thrown thing arriving at it hard enough, or fire on its tile for `burn` s.
  updateCleat(dt, game) {
    if (this.cut) return;
    const C = TUNING.prop.cleat;
    if (game.world.isBurningPx(this.x, this.y)) { this.burnT += dt; if (this.burnT >= C.burn) { this.cutRope(game); return; } } else this.burnT = 0;
    for (const e of game.liveEnemies || game.enemies) {
      if (e.dead || e.state !== 'flung' || hyp(e.vx, e.vy) < C.hit) continue;
      if (hyp(e.x - this.x, e.y - this.y) < e.r + this.r + 4) { this.cutRope(game); return; }
    }
    for (const p of game.props) {
      if (p === this || !p.flung || hyp(p.vx, p.vy) < C.hit) continue;
      if (hyp(p.x - this.x, p.y - this.y) < p.r + this.r + 4) { this.cutRope(game); return; }
    }
  }
  cutRope(game) {
    if (this.cut) return;
    this.cut = true; this.wobble = 0.3;
    game.audio.sfxSteel(); game.particles(this.x, this.y - 12, 6, PALETTE.wood, 90);
    const c = this.hangs;
    if (c && c.drop === 'hang') { c.drop = 'fall'; c.vz = 0; game.world.emitNoise(c.x, c.y, TUNING.noise.table); }
  }
  // A suit of armour coming off the wall (`TUNING.prop.armor`): helm, pauldrons and breastplate
  // thrown along (dx, dy) off the heights they hung at (js/scatter.js), its halberd left on it for a grab.
  // Nothing in it hurts anybody, it is the room answering a body, not a weapon (pillar 3).
  burstArmor(game, dx, dy, power = 1) {
    if ((this.kind !== 'armor' && this.kind !== 'suit') || this.spilled) return;
    this.spilled = true; this.wobble = 0.3;
    if (game.scatter) game.scatter.fromArmor(this, dx, dy, power);
    game.audio.sfxSteel(); game.dust(this.x, this.y, 5, dx, dy);
    game.world.emitNoise(this.x, this.y, TUNING.noise.steel);
  }
  // The cult's paper on the floor (6 Oct 2026, his redesign: "a little scrap of paper on the floor; found, it
  // unfolds into a drawing, and one of the things you can do is butt it and tear it up"). Folded small until he
  // comes within `readR` tiles with nothing standing on it (the ritual altar over the first one: butted off, it
  // shows), then it opens out over `unfold` s, says what it is, and is the book's for good (`Unlocks` OBJECTS),
  // so it never lies on a floor again (`Game.layScraps`). It hurts nobody, and nothing kills for it (pillar 3).
  updateScrap(game, dt) {
    if (this.torn) return;
    const D = TUNING.prop.poster, g = game.goat;
    if (this.unfold > 0) { if (this.unfold < 1) this.unfold = Math.min(1, this.unfold + dt / D.unfold); return; }
    if (!g || g.dead || hyp(g.x - this.x, g.y - this.y) > D.readR * TILE || this.scrapCovered(game)) return;
    this.unfold = 0.001; this.wobble = 0.3;
    game.audio.sfxCard();
    const it = typeof Unlocks !== 'undefined' && Unlocks.DESTRUCT.find((d) => d.id === 'poster-' + this.look);
    if (it) game.floatText(this.x, this.y - 26, it.name, PALETTE.fireHi);
    if (it && !(game.dev && game.dev.god) && !(game.level && game.level.def.showroom)) { Unlocks.mark('objects', it.id, 1); Unlocks.flush(); }
  }
  // Something standing on the scrap hides it: a table (the altar), a crate, a barrel.
  scrapCovered(game) {
    return game.props.some((q) => q !== this && !q.broken && !q.held && (q.kind === 'table' || q.kind === 'crate' || q.kind === 'barrel')
      && hyp(q.x - this.x, q.y - this.y) < q.r + TUNING.prop.poster.r * 0.5);
  }
  // Torn up where it lies (a horn, a body landing by it, a blast), only once it is open: folded, nobody has
  // seen it yet. Paper in the air and its shreds left on the floor.
  tear(game, dx, dy) {
    if (this.kind !== 'poster' || this.torn || !(this.unfold > 0)) return;
    this.torn = true; this.wobble = 0.3;
    const D = TUNING.prop.poster;
    game.audio.sfxCard(); game.dust(this.x, this.y, 4, dx, dy);
    game.particles(this.x, this.y, D.bits, '#dccfa6', 110); game.particles(this.x, this.y, 3, '#3a2a20', 90);
    game.world.emitNoise(this.x, this.y, TUNING.noise.smash * 0.3);
  }
  // Hanging, it does nothing; cut, it falls, and where it lands (`TUNING.chandelier`) a man is
  // crushed, a two-hit kind loses a heart, his `die` decides, the goat loses a heart, a table
  // under it goes to planks and the candles light the floor round it. Then it lies there.
  updateChandelier(dt, game) {
    if (this.drop !== 'fall') return;
    const C = TUNING.chandelier;
    this.vz += C.gravity * dt; this.z -= this.vz * dt;
    if (this.z > 0) return;
    this.z = 0; this.drop = 'down';
    const R = C.killR, g = game.goat, w = game.world;
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted || e.state === 'hop' || e.state === 'hidden') continue;
      if (hyp(e.x - this.x, e.y - this.y) > R + e.r * 0.5) continue;
      e.die(game, 'splat', 0, 1, 'chandelier');
    }
    if (!g.dead && !(g.leap) && hyp(g.x - this.x, g.y - this.y) < R + g.r * 0.5) {
      const d = hyp(g.x - this.x, g.y - this.y) || 1;
      g.damage(1, game, (g.x - this.x) / d * 160, (g.y - this.y) / d * 160, false, 'chandelier');
    }
    for (const p of game.props) if (p.kind === 'table' && !p.broken && !p.isAltar && hyp(p.x - this.x, p.y - this.y) < R + p.r) p.smashTable(game, 0, 1);
    const tx0 = Math.floor(this.x / TILE), ty0 = Math.floor(this.y / TILE), fr = Math.ceil(C.fireR);
    for (let dy = -fr; dy <= fr; dy++) for (let dx = -fr; dx <= fr; dx++) if (hyp(dx, dy) <= C.fireR) w.ignite(tx0 + dx, ty0 + dy, true, C.fireFor);
    game.thud(this.x, this.y, 6); game.audio.sfxThud(); game.audio.sfxSteel(); game.audio.sfxFire();
    game.dust(this.x, this.y, 8, 0, 0); game.particles(this.x, this.y, 14, PALETTE.fire, 170); game.particles(this.x, this.y, 8, PALETTE.bone, 120);
    w.emitNoise(this.x, this.y, TUNING.noise.smash);
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
    // Let go of over a drop without a throw, a roll, a blink, a stun, the stairs, a crate, a blade
    // or a bomb hung there in the air for good: only a thing in flight ever asked about the hole.
    if ((this.kind === 'crate' || this.kind === 'weapon' || this.kind === 'bomb') && !this.held && !this.broken && !this.flung
      && !this.inStand && game.world.isPitPx(this.x, this.y)) { this.fall(game); return; }
    if (this.kind === 'mill') { this.updateMill(dt, game); return; }
    if (this.kind === 'chandelier') { this.updateChandelier(dt, game); return; }
    if (this.kind === 'cleat') { this.updateCleat(dt, game); return; }
    // What comes to it is found by what arrives (`Enemy.wallDressing`, `hitProp`, `collideEntities`,
    // `Scatter.burst`); a spent stag's head only goes on bleeding down the wall.
    if (this.kind === 'poster') { this.updateScrap(game, dt); return; }
    if (this.kind === 'armor' || this.kind === 'trophy' || this.kind === 'suit') { if (this.spent) this.bleedT += dt; return; }
    if (this.kind === 'spike') { this.updateSpike(dt, game); return; }
    if (this.kind === 'spire') { this.updateSpire(dt, game); return; }
    if (this.kind === 'chicken') { this.updateBird(dt, game); return; }
    if (Beast.is(this.kind)) { Beast.update(this, dt, game); return; }
    if (this.kind === 'coop' || this.kind === 'ironcage') { this.updateCoop(game, dt); return; }
    if (this.kind === 'key') { this.updateKey(game); return; }
    if (this.kind === 'mouse' || this.kind === 'ware') { Shop.updateStall(this, dt, game); return; }
    if (this.kind === 'heal' || this.kind === 'cage') return;
    // A tuft of mushrooms is grazed exactly the way milk is: standing over it, still, for
    // `shroom.eatTime`. Walking across one used to eat it on contact, which made the trip something
    // that happened to you on the way past rather than a thing you chose to put in your mouth.
    if (this.kind === 'shrooms') {
      const g = game.goat, H = TUNING.prop.heal;
      if (this.broken || g.dead) { this.graze = 0; return; }
      const near = hyp(g.x - this.x, g.y - this.y) < TUNING.shroom.eatR * TILE
        && hyp(g.vx, g.vy) < H.grazeSpeed;
      this.graze = near ? this.graze + dt : Math.max(0, this.graze - dt * 2);
      if (near) g.grazeAt = game.timer;
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
    const spd = hyp(this.vx, this.vy);
    // Coming down over a hole: it goes down it, and nothing breaks.
    if (spd < 40 && game.world.isPitPx(this.x, this.y)) { this.fall(game); return; }
    // Through a fire it catches and keeps flying (25 Sep 2026): a box alight is a brand you throw,
    // and where it breaks, on stone, on a man, on the floor, it leaves one tile burning. It used
    // to go up where it met the flame, two tiles round; the barrel is the one that spreads.
    if (!this.alight && game.world.isBurningPx(this.x, this.y)) this.alight = game.world.isWitchPx(this.x, this.y) ? 'witch' : 'fire';
    // Alight, it drags its fire behind it: the floor it has flown over since it caught burns, the
    // FIREBRAND line (`Status.brandTrail`), in its own kind of flame.
    if (this.alight && !this.brand) this.brand = { ox: this.x, oy: this.y, lx: this.x, ly: this.y, witch: this.alight === 'witch' };
    if (this.alight && Math.random() < dt * 30) game.particles(this.x, this.y - 6, 1, this.alight === 'witch' ? PALETTE.witchHi : PALETTE.fireHi, 60);
    const end = () => (this.alight ? this.burst(game, this.alight === 'witch') : this.shatter(game));
    if (impact > 2 * TILE || spd < 40) { end(); return; }
    // A shut door, a table or a gong is not something a crate flies through. It breaks on it, and
    // on a lamp it breaks the lamp, which is how you start a fire across a room. A brazier is the
    // one prop that answers a crate the way a burning tile already does: it goes up rather than
    // just breaking, since a box that reaches the coals themselves has reached fire either way.
    const hitP = this.hitProp(game, this.vx / (spd || 1), this.vy / (spd || 1));
    if (hitP && hitP.kind === 'brazier') { this.burst(game, this.alight === 'witch'); return; }
    if (hitP && hitP.kind === 'table' && game.scatter) game.scatter.fromTable(hitP, this.vx, this.vy, 0.7);
    if (hitP) { end(); return; }
    // Out of the thrower's hands (js/thrower.js): the goat it reaches pays for it, and it never meets the man who threw it.
    if (this.byCult && Thrower.thingHitsGoat(game, this)) { end(); return; }
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted || e === this.byCult) continue;
      if (hyp(e.x - this.x, e.y - this.y) < e.r + this.r) {
        // A crate that catches a wraith in its window is as good as a horn.
        if (e.kind === 'wraith') { e.die(game, 'unmade', this.vx / 300, this.vy / 300); this.shatter(game); return; }
        // A shieldman's board from in front takes the crate: it breaks on it, a use off the board.
        if (e.shield && e.shieldCovers(this.x - this.vx / (spd || 1) * TILE, this.y - this.vy / (spd || 1) * TILE)) { e.shieldTakes(game, this.vx, this.vy); end(); return; }
        // GRAVEDIGGER'S SPADE III: a thrown body at killing speed kills like a live one.
        if (this.corpse && Talisman.corpseHit(game, this, e, spd)) { this.shatter(game); return; }
        // A crate in the face is not a trip. He goes down properly, and he stays down seeing stars.
        // Never out of the air: an ogre knocked down mid-leap over a drop fell into it.
        if (e.kind === 'butcher') { if (e.state !== 'hop') { e.state = 'stagger'; e.timer = TUNING.butcher.rocked.crate; } }
        else {
          const stun = TUNING.prop.crate.stun;
          e.state = 'floored'; e.timer = stun; e.dazed = Math.max(e.dazed, stun);
          e.vx = this.vx * 0.3; e.vy = this.vy * 0.3; e.aware = true;
          Status.stunned(game, e);
        }
        game.hitstop(0.04); game.shake(4); game.kick(this.vx / 300, this.vy / 300, TUNING.juice.kick * 0.5);
        if (this.alight && e.ignite) e.ignite(game, this.alight === 'witch');
        end(); return;
      }
    }
  }

  // A burning crate breaking: one tile of flame where it comes apart, for `burstTime`, of whichever
  // kind lit it, witchfire stays witchfire. The barrel's oil is what spreads (`oilBurst`); a box
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
  // It comes apart where it broke (3 Oct 2026 playtest: "not just vanish, fall apart"): its own pixels in
  // pieces (`Scatter.breakUp`), sent along (dx, dy), the way it was going unless the caller says otherwise.
  snap(game, dx, dy) {
    if (this.broken) return;
    const held = game.goat.holding === this, z = held ? 14 : this.flung ? 8 : 5;
    if (dx === undefined) { dx = this.vx; dy = this.vy; }
    this.broken = true; this.dead = true; this.flung = false; this.thrown = false;
    // Snapped in his teeth, the mouth is spent as if he had let it go.
    if (held) { game.goat.holding = null; game.goat.spendGrab(game, false); }
    if (game.scatter) game.scatter.breakUp(Scatter.piecesOf(this), this.x, this.y, z, dx || 0, dy || 0, 0.8);
    game.audio.sfxSteel(); game.shake(3);
    game.particles(this.x, this.y, 7, this.weapon === 'sword' ? PALETTE.bone : PALETTE.ash, 220);
  }
  // A blade that is spent in a man who gets up from it stays in him (`prop.weapon.stick`): gone from the
  // floor, a picture on him turned with him (`Renderer.drawStuck`), broken into its pieces when he dies.
  stickIn(game, e, nx, ny) {
    const K = TUNING.prop.weapon.stick;
    this.broken = true; this.dead = true; this.flung = false; this.thrown = false;
    e.stuck = e.stuck || [];
    if (e.stuck.length >= K.max) { const old = e.stuck.shift(); if (game.scatter) game.scatter.breakStuck(e, [old]); }
    // It stays in his flank, the hilt out past his side (3 Oct 2026, "as if it sticks out of him from
    // the side": one down the middle of his chest read as a badge). The side is the one it came from;
    // straight from in front, either. Each is fanned by up to `fan` rad, or three of them read as one.
    const from = angleDiff(Math.atan2(-ny, -nx), e.facing || 0);
    const s = Math.abs(from) < 0.3 || Math.abs(from) > Math.PI - 0.3 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(from);
    // Charged with fire (FIREBRAND's `brand`), it goes on burning in him (`Enemy.stuckFire`).
    const fire = this.brand ? (this.brand.witch ? 'witch' : 'fire') : null;
    e.stuck.push({ rel: s * Math.PI / 2 + (Math.random() - 0.5) * 2 * K.fan, flank: true, halberd: !!this.halberd,
      side: 0, lift: (Math.random() - 0.5) * 0.24, fire, fireT: fire ? K.fire.for : 0, gapT: 0 });
    if (fire && e.ignite) e.ignite(game, fire === 'witch');
  }
  // RICOCHET (`mods.ricochet`): a blade meeting stone turns off it toward the nearest man in front of
  // that wall it can see within `reach`, never more than `bounces` times a throw. `v0x, v0y` is the
  // speed before the stone took what went into it, so (v - v0) is the wall's face. Returns whether it went.
  glance(game, v0x, v0y) {
    const R = game.mods.ricochet; if (!R || (this.glanced || 0) >= R.bounces) return false;
    let nx = this.vx - v0x, ny = this.vy - v0y; const nl = hyp(nx, ny), sp = hyp(v0x, v0y);
    if (nl < 1 || sp < 1) return false;
    nx /= nl; ny /= nl;
    let best = null, bd = R.reach * TILE;
    for (const e of game.liveEnemies || game.enemies) {
      if (e.dead || e.held || e.ghosted || e.state === 'hidden' || this.passed.indexOf(e) >= 0) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = hyp(dx, dy);
      if (d >= bd || d < 1 || (dx * nx + dy * ny) / d < 0.1 || !game.world.los(this.x + nx * 3, this.y + ny * 3, e.x, e.y)) continue;
      best = e; bd = d;
    }
    if (!best) return false;
    const s = Math.max(sp * R.keep, R.min * TILE), d = hyp(best.x - this.x, best.y - this.y) || 1;
    this.x += nx * 3; this.y += ny * 3;   // off the face, or the next step meets the same stone
    this.vx = (best.x - this.x) / d * s; this.vy = (best.y - this.y) / d * s;
    this.glanced = (this.glanced || 0) + 1;
    game.particles(this.x, this.y, 9, PALETTE.fireHi, 230); game.audio.sfxSteel();
    game.world.emitNoise(this.x, this.y, TUNING.noise.steel);
    return true;
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
    const v0x = this.vx, v0y = this.vy;   // before stone takes the part of it going into the wall
    const impact = game.world.collideCircle(this);
    // A shut door, a brazier, a table, the hub of the wheel: as much a wall to a blade as stone is.
    // A lamp goes over instead, and a gong rings.
    const spd0 = hyp(this.vx, this.vy) || 1;
    const hit = spd0 > W.stickImpact ? this.hitProp(game, this.vx / spd0, this.vy / spd0) : null;
    if (impact > W.stickImpact || (hit && hit.kind !== 'lamp')) {
      // Into a wall: a blade thrown at stone is a blade thrown away. A shield only rings off it.
      game.audio.sfxSteel(); game.particles(this.x, this.y, 5, PALETTE.bone, 170);
      // A blade into stone is a blow spent, not always the blade: it drops there with what is left.
      if (this.weapon === 'sword') {
        // RICOCHET: off stone into a man, nothing spent.
        if (impact > W.stickImpact && this.glance(game, v0x, v0y)) return;
        const bx = 2 * this.vx - v0x, by = 2 * this.vy - v0y;   // the way the pieces leave the wall
        this.vx = 0; this.vy = 0; this.flung = false; this.thrown = false;
        if (--this.uses <= 0) this.snap(game, bx, by); else game.floatText(this.x, this.y - 28, 'NOTCHED', PALETTE.ashHi);
        return;
      }
      // A shield does not stick, it rings off, and off a wall keeps enough of its speed to reach a
      // second one, which is what makes it worth throwing at a room rather than at one man in it.
      // Off stone it is a true reflection: `collideCircle` has already taken away the part going into
      // the wall, so reversing what was left stopped it dead head-on and sent it back along the wall
      // on a glance. Off furniture (nothing taken away) it comes straight back as before.
      if (impact > W.stickImpact) { this.vx = (2 * this.vx - v0x) * W.shieldBounce; this.vy = (2 * this.vy - v0y) * W.shieldBounce; }
      else { this.vx *= -W.shieldBounce; this.vy *= -W.shieldBounce; }
    } else if (!hit) {
      // Too slow to be a blow, still a thing that cannot pass through furniture: below `stickImpact`
      // nothing was asked at all, and a blade arriving at a shut door at a walk went through it and
      // killed the man leaning on the far side. It stops against it (a shield rings back off it),
      // with no blow spent and nothing knocked over.
      for (const p of game.props) {
        if (p === this || !p.blocking || p.kind === 'lamp' || p.kind === 'bell') continue;
        let dx = this.x - p.x, dy = this.y - p.y, d = hyp(dx, dy), pen = p.r + this.r - d;
        if (p.box) { const o = p.boxPush(this.x, this.y); pen = this.r - o.d; dx = o.nx; dy = o.ny; d = 1; }
        if (pen <= 0) continue;
        this.x += dx / (d || 1) * pen; this.y += dy / (d || 1) * pen;
        if (this.weapon === 'sword') { this.vx = 0; this.vy = 0; this.flung = false; this.thrown = false; return; }
        this.vx *= -W.shieldBounce; this.vy *= -W.shieldBounce;
        break;
      }
    }
    const spd = hyp(this.vx, this.vy);
    if (spd <= W.restSpeed) {
      this.flung = false; this.thrown = false; this.vx = 0; this.vy = 0;
      // Come to rest over a hole, it is gone: anything thrown through one is.
      if (game.world.isPitPx(this.x, this.y)) this.fall(game);
      return;
    }
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted || this.passed.indexOf(e) >= 0) continue;
      if (hyp(e.x - this.x, e.y - this.y) > e.r + this.r) continue;
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
    // A shieldman's board from in front: a blade sticks in it and is spent with a use of the board, a
    // thrown shield rings off it. Round its edge, the arm finds the man as it finds anybody.
    if (e.shield && e.shieldCovers(this.x - nx * TILE, this.y - ny * TILE)) {
      e.shieldTakes(game, nx, ny);
      if (this.weapon === 'sword') { this.flung = false; this.thrown = false; this.vx = 0; this.vy = 0; if (--this.uses <= 0) this.snap(game); }
      else { this.vx *= -W.shieldBounce; this.vy *= -W.shieldBounce; if (--this.uses <= 0) this.snap(game); }
      return;
    }
    // The shieldman's skulls (`Enemy.dropShield`): the horns go into the first man they meet, and on.
    if (this.skulls) {
      e.die(game, 'splat', nx, ny, 'horns');
      game.gore(this.x, this.y, 6, nx, ny); game.audio.sfxSplat(); game.audio.sfxCrack();
      game.shake(5); game.hitstop(0.05); game.kick(nx, ny, TUNING.juice.kick);
      game.floatText(e.x, e.y - 28, 'GORED', PALETTE.fireHi);
      this.vx *= 0.5; this.vy *= 0.5;
      if (--this.uses <= 0) this.snap(game);
      return;
    }
    if (this.weapon === 'sword') {
      e.byBlade = true;   // the cup and the grease count the room's kills, not the blade's
      e.die(game, 'splat', nx, ny, 'sword');
      game.gore(this.x, this.y, 6, nx, ny); game.audio.sfxSplat();
      game.shake(6); game.hitstop(0.05); game.kick(nx, ny, TUNING.juice.kick);
      this.flung = false; this.thrown = false; this.vx = 0; this.vy = 0;   // it is in him now
      this.x = e.x; this.y = e.y;
      // A man who gets up from it (a heart to spare) walks off with it in him; a dead one is where it breaks.
      if (--this.uses <= 0) { if (!e.dead && !e.ghosted && e.kind !== 'wraith') this.stickIn(game, e, nx, ny); else this.snap(game, nx, ny); }
      return;
    }
    if (e.kind === 'butcher') { if (e.state !== 'hop') { e.state = 'stagger'; e.timer = TUNING.butcher.rocked.shield; } e.aware = true; this.vx *= -0.25; this.vy *= -0.25; }
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

  // A thrown bomb. Lit (`fuseT` was set at the pick-up, or in `fling`) and arriving hard at stone, a
  // man or a solid prop, it goes off there (`prop.bomb.hit`, 30 Sep 2026). Slower than that, or in
  // its first `hit.arm` s out of the mouth, it just stops there, dead, and keeps counting down.
  updateBomb(dt, game) {
    if (this.broken) return;
    if (this.flung) {
      const H = TUNING.prop.bomb.hit, lit = this.fuseT >= 0;
      this.flyT = (this.flyT || 0) + dt;
      const armed = lit && this.flyT >= H.arm, v0 = hyp(this.vx, this.vy);
      this.x += this.vx * dt; this.y += this.vy * dt;
      // Down a hole is not a room this bomb gets to finish: gone like anything else thrown over one.
      if (game.world.isPitPx(this.x, this.y)) { this.fall(game); return; }
      const impact = game.world.collideCircle(this);
      const spd = hyp(this.vx, this.vy) || 1;
      const hit = this.hitProp(game, this.vx / spd, this.vy / spd);
      if (armed && (impact >= H.speed || (hit && v0 >= H.speed))) { this.explode(game); return; }
      // Into a man at speed: it goes off on him. Not a man in the teeth, mist, or an ogre in the air.
      // The thrower's (js/thrower.js) goes off on the goat it reaches, and never on him.
      if (this.byCult && !game.goat.dead && hyp(game.goat.x - this.x, game.goat.y - this.y) < game.goat.r + this.r) { this.explode(game); return; }
      if (armed && v0 >= H.speed) for (const e of game.liveEnemies || game.enemies) {
        if (e.dead || e.held || e.ghosted || e.state === 'hop' || e === this.byCult) continue;
        if (hyp(e.x - this.x, e.y - this.y) < e.r + this.r) { this.explode(game); return; }
      }
      if (impact > 0 || hit) { this.vx = 0; this.vy = 0; this.flung = false; this.thrown = false; }
      else { const drag = Math.exp(-TUNING.prop.weapon.drag * dt); this.vx *= drag; this.vy *= drag; if (hyp(this.vx, this.vy) < 8) { this.vx = 0; this.vy = 0; this.flung = false; this.thrown = false; } }
    }
    if (this.fuseT < 0) return;
    this.fuseT -= dt;
    if (this.fuseT <= 0) this.explode(game);
  }

  // A blast is a blow to the room as well as to the men in it (1 Oct 2026): the powder in a barrel
  // catches and goes up a beat later (`barrel.chain`), a barrel of poison meets the flame and goes off,
  // a lamp goes over away from it, a crate is matchwood, a bomb lying there is lit short (`bomb.chain`),
  // a brazier spills its coals, the gong rings, a cracked wall gives, a boulder cracks, a rope is cut.
  // Stone stops it, as it stops the blast itself (a thing on a wall is asked from a step in front of
  // it). The bomb, BOMB CHARGE's man, a barrel going up and the poison blast all call it, so a bomb by a
  // row of barrels is a chain, which is what a barrel standing by a bomb is for (Enter the Gungeon's).
  static blastRoom(game, x, y, r, witch) {
    const w = game.world, BR = TUNING.prop.barrel;
    for (const p of game.props.slice()) {
      if (p.broken || p.dead || p.held || p.inStand) continue;
      const dx = p.x - x, dy = p.y - y, d = hyp(dx, dy);
      if (d > r + (p.r || 12)) continue;
      const nx = dx / (d || 1), ny = dy / (d || 1), onWall = p.kind === 'secret' || p.kind === 'cleat';
      // stone and a shut door stop it (`Game.blastClear`): an iron door between was no wall to it
      if (!game.blastClear(x, y, onWall ? p.x - nx * TILE * BR.wallStep : p.x, onWall ? p.y - ny * TILE * BR.wallStep : p.y)) continue;
      if (p.kind === 'barrel') { if (p.toxic) p.toxicBurst(game); else if (p.oilT < 0) p.light(game, witch, BR.chain); else p.oilT = Math.min(p.oilT, BR.chain); }
      else if (p.kind === 'lamp') p.topple(game, nx, ny);
      // a crate alight goes up in it as it would anywhere, a burning tile and not a clean shatter
      else if (p.kind === 'crate') { if (p.alight) p.burst(game, p.alight === 'witch'); else p.shatter(game); }
      else if (p.kind === 'bomb') p.fuseT = p.fuseT < 0 ? TUNING.prop.bomb.chain : Math.min(p.fuseT, TUNING.prop.bomb.chain);
      else if (p.kind === 'brazier') p.spill(game, nx, ny);
      else if (p.kind === 'bell') { if (!(p.rung > 0)) p.ring(game); }   // once a chain, not once a link of it
      else if (p.kind === 'secret') { p.hits = Math.max(p.hits || 0, TUNING.prop.secret.hits - 1); p.crackWall(game); }   // a blast opens it outright
      else if (p.kind === 'rock') p.crackRock(game);
      else if (p.kind === 'cleat') p.cutRope(game);
    }
    // A wraith lying as a crate is no prop (`Enemy.hide`), so the loop above never saw it: it survived
    // the blast that broke every real crate round it and gave itself away by being the one left.
    for (const e of game.enemies) {
      if (e.dead || e.state !== 'hidden' || !e.disguise || e.disguise.kind !== 'crate') continue;
      if (hyp(e.x - x, e.y - y) > r + (e.disguise.r || 12) || !game.blastClear(x, y, e.x, e.y)) continue;
      e.unmask(game);
    }
  }

  // Falls off from the centre exactly the way the goat's own headbutted-bomb charge does: two
  // hearts inside `nearR`, one heart out to `blastR`, and past `nearR` anything left alive is
  // flung rather than hurt directly, the wall is still what finishes it.
  explode(game) {
    if (this.broken) return;
    this.broken = true; this.dead = true; this.flung = false;
    if (game.goat.holding === this) { game.goat.holding = null; game.goat.autoHeld = false; game.goat.spendGrab(game, false); }
    const B = TUNING.prop.bomb;
    game.fx.explosion(this.x, this.y, B.blastR, false);
    game.world.splat(this.x, this.y, 0, 0, 24); game.world.scorch(this.x, this.y, B.blastR * 0.5);
    game.particles(this.x, this.y, 16, PALETTE.fire, 260);
    game.ring(this.x, this.y, B.blastR, PALETTE.fireHi);
    game.thud(this.x, this.y, 9); game.hitstop(0.05); game.audio.sfxBoom(); game.vibe(35);
    game.world.emitNoise(this.x, this.y, TUNING.noise.boom);
    if (game.scatter) game.scatter.burst(this.x, this.y, B.blastR * 2);
    // Stone stops a blast the way it stops `Status.blast`: a bomb against one side of a wall took a
    // heart off the goat on the other side of it.
    const w = game.world;
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = hyp(dx, dy);
      if (d > B.blastR + e.r || !game.blastClear(this.x, this.y, e.x, e.y)) continue;
      const nx = dx / (d || 1), ny = dy / (d || 1);
      // The rat ogre and the ogre are never flung, so the whole of the blast is the one heart it takes
      // off them (the ogre was only hurt by a bomb all but under him: his body is wider than `nearR`).
      // A heart once a chain (`Status.spared`): a poison barrel beside him going off in the same frame
      // used to take two more.
      if (d <= B.nearR || e.kind === 'ratogre' || e.kind === 'butcher') { if (!Status.spared(game, e)) e.die(game, 'splat', nx, ny, 'bomb'); }
      else e.fling(nx * B.impulse, ny * B.impulse, true);
    }
    const g = game.goat, gd = hyp(g.x - this.x, g.y - this.y);
    if (!g.dead && gd <= B.blastR + g.r && game.blastClear(this.x, this.y, g.x, g.y)) {
      const nx = (g.x - this.x) / (gd || 1), ny = (g.y - this.y) / (gd || 1);
      g.damage(gd <= B.nearR ? B.dmgNear : B.dmgFar, game, nx * 260, ny * 260, false, 'bomb');
    }
    Prop.blastRoom(game, this.x, this.y, B.blastR, false);
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
      // way a real one would, the crowd on your heels props your own way out open for a moment,
      // and it seats as soon as the gap is clear.
      const near = (b) => b && !b.dead && hyp(b.x - this.x, b.y - this.y) < b.r + this.r * 0.5;
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
    // or it does not open, which is the only reason the thing behind it is still there.
    // A clock door is the exception (5 Oct 2026, "if a door shut in front of the men, they can open
    // it"): it swung shut on its own, it was never barred, so the men behind it lean it open like plank.
    if ((this.iron && this.clockRoom < 0) || this.gate || this.seal) return;
    // Cultists who cannot get through eventually shoulder it open, to get at the goat, so only a man
    // leaning on the leaf with the goat on its far side. It used to be any aware man within a tile and
    // a half of its middle, so a fight beside a shut door (a hound on its ring, a clubman at his
    // shoulder) swung it open with the room still full (playtest, 30 Sep 2026: "the door opened
    // though the men were in the room").
    let pressed = false;
    const g = game.goat, D = TUNING.prop.door;
    const hx = this.vertical ? D.thick / 2 : D.r, hy = this.vertical ? D.r : D.thick / 2;
    const side = (b) => Math.sign(this.vertical ? b.x - this.x : b.y - this.y);
    for (const e of game.liveEnemies) {
      if (e.dead || e.held || e.ghosted || !e.aware || !g || side(e) === side(g)) continue;
      const cx = clamp(e.x, this.x - hx, this.x + hx), cy = clamp(e.y, this.y - hy, this.y + hy);
      if (hyp(e.x - cx, e.y - cy) < e.r + 6) { pressed = true; break; }
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
    const spd = hyp(this.vx, this.vy), sx = this.vx, sy = this.vy;
    const impact = game.world.collideCircle(this);
    if (impact > 3 * TILE) { game.shake(3); game.audio.sfxThud(); game.particles(this.x, this.y, 6, PALETTE.wood, 120); }
    // Slammed into stone, it goes over there (`table.flip.wall`).
    if (impact > cfg.flip.wall && !this.isAltar) { this.flipTable(game, sx / (spd || 1), sy / (spd || 1)); return; }
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
        if (hyp(e.x - this.x, e.y - this.y) > e.r + this.r + 2) continue;
        if (e.kind === 'butcher') { if (e.state !== 'hop') { e.state = 'stagger'; e.timer = TUNING.butcher.rocked.table; } this.vx *= -0.2; this.vy *= -0.2; }
        else { e.fling(nx * spd * 1.25, ny * spd * 1.25, false); this.vx *= 0.75; this.vy *= 0.75; }
      }
      if (game.world.isBurningPx(this.x, this.y)) game.world.ignitePx(this.x, this.y, true);
    }
    if (spd < 30) {
      // Come to rest, it goes over onto its side `flip.chance` of the time, the way it was going.
      const over = !this.isAltar && Math.random() < cfg.flip.chance, lx = this.lastVx || 1, ly = this.lastVy || 0;
      this.flung = false; this.vx = 0; this.vy = 0; this.by = null;
      if (over) this.flipTable(game, lx, ly);
    } else { this.lastVx = this.vx; this.lastVy = this.vy; }
  }

  // A barrel set rolling: by a horn, by a body thrown into it or by another barrel. It goes over
  // onto its side the first time and stays there, and a horn can send it on again. `by` is whoever
  // sent it (the flung body, `collideEntities`), and it does not bowl him over on the way out.
  roll(game, ax, ay, speed, by) {
    if (this.broken) return;
    const l = hyp(ax, ay) || 1;
    this.vx = ax / l * speed; this.vy = ay / l * speed;
    // It lies across the way it is sent, so it can roll that way: its axis down the picture ('v')
    // when it is going left or right. Only the drawing reads it.
    this.rollAxis = Math.abs(ax) > Math.abs(ay) ? 'v' : 'h';
    this.flung = true; this.lying = true; this.by = by || null; this.passed.length = 0;
    const B = TUNING.prop.barrel; this.staveN = Math.floor(this.spinD / (B.spinEvery * B.staveEvery * TILE));
    game.world.emitNoise(this.x, this.y, TUNING.noise.table);
    game.audio.sfxThud(); game.particles(this.x, this.y + this.r * 0.5, 5, PALETTE.wood, 90);
  }

  // The oil has caught. It says so, and it has `fuse` seconds before it goes up wherever it is.
  light(game, witch, fuse) {
    if (this.broken || this.oilT >= 0) return;
    // A barrel of poison does not burn: it goes off, the poison meeting the flame (1 Oct 2026, playtest:
    // "witchfire lights the barrels and the acid too; acid meeting an open brazier explodes").
    if (this.toxic) { this.toxicBurst(game); return; }
    // `fuse`: a blast lights it short (`barrel.chain`), so a row of them goes up one after another.
    this.oilT = fuse != null ? fuse : TUNING.prop.barrel.fuse; this.oilWitch = !!witch;
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
        if (e.dead || !(e.burning > 0) || hyp(e.x - this.x, e.y - this.y) > e.r + this.r + 2) continue;
        this.light(game, e.witchBurn); break;
      }
    } else if ((this.oilT -= dt) <= 0) { this.oilBurst(game); return; }
    if (w.isPitPx(this.x, this.y)) { this.fall(game); return; }
    if (!this.flung) { w.collideCircle(this); return; }
    const drag = Math.exp(-B.drag * dt);
    this.vx *= drag; this.vy *= drag;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.spinD += hyp(this.vx, this.vy) * dt;
    // How far round it has turned, signed, for the frame it is drawn in: back off a wall, it turns back.
    this.rollD = (this.rollD || 0) + (this.rollAxis === 'v' ? this.vx : this.vy) * dt;
    // A clatter that slows as the barrel does, and says from out of sight that it is still coming.
    const turn = Math.floor(this.spinD / (B.spinEvery * B.staveEvery * TILE));
    if (turn !== this.staveN) { this.staveN = turn; game.audio.sfxStave(Math.min(1, hyp(this.vx, this.vy) / B.roll)); }
    // Stone. Square on and fast, the staves go; glancing, it runs on along the wall.
    const impact = w.collideCircle(this);
    if (impact > B.breakSpeed) { this.smashBarrel(game); return; }
    if (impact > B.stopSpeed * 3) game.audio.sfxThud();
    let spd = hyp(this.vx, this.vy);
    if (spd < B.stopSpeed) { this.flung = false; this.vx = 0; this.vy = 0; this.by = null; return; }
    const nx = this.vx / spd, ny = this.vy / spd;
    // Furniture. A brazier is fire, another barrel takes the roll on like a struck ball, a lamp goes
    // over (`hitProp`), and anything else is a wall that a fast enough barrel breaks on.
    const hit = this.hitProp(game, nx, ny);
    if (hit && hit.kind === 'brazier') { if (this.toxic) this.toxicBurst(game); else this.oilBurst(game, false); return; }
    if (hit && hit.kind === 'barrel') { hit.roll(game, nx, ny, spd * B.pass, this.by); this.vx *= 0.15; this.vy *= 0.15; }
    else if (hit && hit.kind !== 'lamp') {
      if (hit.kind === 'table' && game.scatter) game.scatter.fromTable(hit, nx, ny, 0.8);
      if (spd > B.breakSpeed) {
        if (hit.kind === 'door') hit.smash(game, nx, ny, null); else if (hit.kind === 'rock') hit.crackRock(game);
        this.smashBarrel(game); return;
      }
      this.vx *= -B.rebound; this.vy *= -B.rebound; game.audio.sfxThud();
    }
    // The goat stops it: it was sent for somebody else.
    const g = game.goat, gx = g.x - this.x, gy = g.y - this.y;
    if (!g.dead && hyp(gx, gy) < g.r + this.r && gx * this.vx + gy * this.vy > 0) { this.vx *= -B.rebound; this.vy *= -B.rebound; game.audio.sfxThud(); }
    // Men. Each is bowled along its line and a little off it to the side he stood on, so a row of
    // them scatters rather than riding it in a stack, and each one costs it `keep` of its speed.
    spd = hyp(this.vx, this.vy);
    if (spd < B.knockSpeed) return;
    for (const e of game.liveEnemies) {
      if (e.dead || e.held || e.ghosted || e.state === 'flung' || e === this.by || this.passed.indexOf(e) >= 0) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = hyp(dx, dy);
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
      const fx = nx - ny * side, fy = ny + nx * side, fl = hyp(fx, fy);
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
  // The poison barrel and a flame: POISON + FIRE's blast (`Status.blast`) where it stood, and the rest of
  // it spattered round (`shatter`), which any fire still burning lights again in turn.
  toxicBurst(game) {
    // `bursting`: its own blast reaches it again (`Prop.blastRoom`) before it has broken.
    if (this.broken || this.bursting) return;
    this.bursting = true; this.wentUp = true;
    Status.blast(game, this.x, this.y, TUNING.status.blast, null);
    this.shatter(game);
  }

  // The oil goes up: a crate's burst, wider and longer, of whichever fire lit it.
  oilBurst(game, witch) {
    if (this.broken) return;
    const B = TUNING.prop.barrel;
    if (witch === undefined) witch = this.oilWitch;
    game.fx.explosion(this.x, this.y, B.burst * TILE, witch);
    game.world.ignitePool(this.x, this.y, B.burst, witch, B.burstTime);
    game.audio.sfxBoom(); game.thud(this.x, this.y, 8); game.hitstop(0.05); game.vibe(35);
    game.flash(witch ? PALETTE.witch : PALETTE.fire, 0.22); game.zoomPunch(1.1);
    game.ring(this.x, this.y, B.burst * TILE, witch ? PALETTE.witchHi : PALETTE.fireHi);
    game.particles(this.x, this.y, 20, witch ? PALETTE.witchHi : PALETTE.fireHi, 260);
    game.floatText(this.x, this.y - 28, 'IT GOES UP', witch ? PALETTE.witchHi : PALETTE.fireHi);
    game.world.emitNoise(this.x, this.y, TUNING.noise.boom);
    if (game.scatter) game.scatter.burst(this.x, this.y, B.burst * TILE * 1.5);
    this.oilT = -1; this.wentUp = true; this.shatter(game);
    Prop.blastRoom(game, this.x, this.y, B.burst * TILE, witch);
  }

  // Is this spot under an arm now, or about to be as the wheel comes round? This is what lets a man
  // read the Mill: he checks where the arms will be by the time he gets there, not where they are.
  millThreat(x, y, r, lead) {
    const M = TUNING.mill;
    const dx = x - this.x, dy = y - this.y, d = hyp(dx, dy);
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
    const targets = (game.goat.state === 'carried' ? [] : [game.goat]).concat(game.liveEnemies);
    for (const e of targets) if (e && e.millCd > 0) e.millCd -= dt;
    const arms = [this.angle, this.angle + Math.PI];
    for (const e of targets) {
      if (!e || e.dead || e.ghosted || e.millCd > 0) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = hyp(dx, dy);
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
        if (e.held) { if (game.goat.holding === e) { game.goat.holding = null; game.goat.spendGrab(game, true); } e.held = false; }
        // The rat ogre is never thrown, but the arm still lands: a heart off him, standing.
        if (e.kind === 'ratogre') { e.die(game, 'mill', dx / (d || 1), dy / (d || 1)); }
        else { e.fling(ix, iy, true); e.aware = true; game.floatText(e.x, e.y - 26, 'GROUND', PALETTE.blood); }
      }
      game.shake(6); game.audio.sfxThud(); game.world.emitNoise(this.x, this.y, TUNING.noise.table);
    }
    // Nothing stands in the sweep (5 Oct 2026 playtest: a stand of arms by the hub): a thing the arm
    // comes round to is butted out of the circle the way a horn would butt it, a crate or a blade sent
    // flying (a stand knocked over, its blade with it), a barrel rolled, a table shoved, a standing suit
    // brought down; a bomb is flung and so lit. `mill.knockCd` s before the same thing is met again.
    const reach = M.armLen + 16;
    for (const p of game.props) {
      if (!MILL_CLEAR.has(p.kind) || p.broken || p.held || p.flung || p.spilled) continue;
      if (p.millCd > 0) { p.millCd -= dt; continue; }
      const dx = p.x - this.x, dy = p.y - this.y;
      if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
      const d = hyp(dx, dy);
      if (d > M.armLen + p.r || d < M.innerR) continue;
      const ang = Math.atan2(dy, dx), slack = M.armHalfWidth + p.r / Math.max(d, 12);
      if (!arms.some((a) => Math.abs(angleDiff(a, ang)) < slack)) continue;
      p.millCd = M.knockCd;
      // Along the arm's turn and out of the circle, so it leaves the sweep rather than riding it.
      const ox = -Math.sin(ang) + Math.cos(ang) * 0.6, oy = Math.cos(ang) + Math.sin(ang) * 0.6, ol = hyp(ox, oy) || 1;
      if (p.kind === 'bomb') p.fling(ox / ol * M.impulse * 0.6, oy / ol * M.impulse * 0.6, true);
      else p.headbutt(game, ox / ol, oy / ol);
      game.audio.sfxThud();
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
    // A barrel that breaks without going up spills its powder (`Game.spillPowder`); a barrel of
    // poison spills poison.
    if (this.kind === 'barrel' && this.toxic) { Status.spatter(game, this.x, this.y, TUNING.prop.barrel.venom.tiles); game.floatText(this.x, this.y - 28, 'POISON', PALETTE.venomHi); }
    else if (this.kind === 'barrel' && !this.wentUp && game.spillPowder) game.spillPowder(this.x, this.y);
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
      if (goat.holding && !goat.holding.item && hyp(goat.holding.x - this.x, goat.holding.y - this.y) < goat.holding.r + 3) {
        const h = goat.holding; h.shieldHits = (h.shieldHits || 0) + 1; this.dead = true;
        game.world.splat(h.x, h.y, this.vx / 900, this.vy / 900, 7); game.floatText(h.x, h.y - 26, 'SHIELD', PALETTE.bone);
        if (h.shieldHits >= game.mods.shieldBullets) h.die(game, 'shot', this.vx / 900, this.vy / 900);
        return;
      }
      // THE MAGNET: a thing circling him is in the way of it.
      if (!goat.dead && !this.reflected && Talisman.magnetBullet(game, this)) { this.dead = true; return; }
      if (!goat.dead && !this.reflected && hyp(goat.x - this.x, goat.y - this.y) < goat.r + 2) {
        if (Talisman.reflectBullet(game, this)) continue;   // MIRROR SHARD
        this.dead = true; goat.damage(TUNING.hunter.damage, game, this.vx * 0.15, this.vy * 0.15, false, this.shooter || 'rifle'); return;
      }
      for (const e of game.enemies) {
        if (e.dead || e.held || e.ghosted) continue;
        if (hyp(e.x - this.x, e.y - this.y) < e.r + 2) {
          this.dead = true;
          // The shieldman's board stops a round from in front of him (a use spent), his own side's included.
          const bl = hyp(this.vx, this.vy) || 1;
          if (e.shield && e.shieldCovers(this.x - this.vx / bl * TILE, this.y - this.vy / bl * TILE)) { e.shieldTakes(game, this.vx, this.vy); return; }
          if (e.kind === 'butcher') { e.hp -= 1; e.flash = 0.18; game.world.splat(e.x, e.y, this.vx / 900, this.vy / 900, 6); if (e.hp <= 0) e.die(game, 'shot', this.vx / 900, this.vy / 900); else Stats.blow(game, e, 'shot'); }
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
        if (p.kind === 'crate' && !p.held && hyp(p.x - this.x, p.y - this.y) < p.r + 2) { this.dead = true; p.shatter(game); return; }
        // A shield standing in its rack is cover; a sword in one is not.
        if (p.kind === 'weapon' && p.weapon === 'shield' && p.inStand && hyp(p.x - this.x, p.y - this.y) < p.r + 2) {
          this.dead = true; game.particles(this.x, this.y, 4, PALETTE.bone, 120); game.audio.sfxSteel(); return;
        }
        if (p.kind === 'lamp' && hyp(p.x - this.x, p.y - this.y) < p.r + 2) {
          this.dead = true; const l = hyp(this.vx, this.vy) || 1; p.topple(game, this.vx / l, this.vy / l); return;
        }
        // A round into a barrel (Enter the Gungeon's, whose barrels these are): the powder catches and goes
        // up on its own fuse (`light`, which says OIL first), and a barrel of poison breaks open. A rifleman
        // who fires at a goat standing behind one has lit it for him, and his own men round it with it.
        if (p.kind === 'barrel' && hyp(p.x - this.x, p.y - this.y) < p.r + 2) {
          this.dead = true; game.world.dot(this.x, this.y, 2, '#2a2020'); game.particles(this.x, this.y, 4, PALETTE.wood, 100);
          if (p.toxic) p.shatter(game); else p.light(game, false);
          return;
        }
        if (p.stopsBullets && hyp(p.x - this.x, p.y - this.y) < p.r + 2) {
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
