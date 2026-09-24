// The talismans the mouse gives that are body work or a Q verb of their own (ARTIFACTS_TZ.md).
// FIRE AMULET, LUCKY CLOVER, BOOMERANG and STRANGE SYMBOLS keep their own homes (gen.js, shop.js);
// everything the seventeen later ones do lives here, and the rest of the game only calls in at a
// handful of hooks — the same shape `Status` has for poison. Every number is on the talisman's
// tier in `ARTIFACTS` (js/tuning.js) and reaches here through `game.mods.<id>`, never a literal.
//
// State that belongs to one level (rooms entered, grease on the floor, echoes waiting, bodies,
// the effigy) is on `game.tal`, rebuilt when `game.level` changes. State the goat carries between
// levels (the tallow's charge, the cup) is on `game.talRun`, forgotten when a run starts over.
const Talisman = {
  // ---- bookkeeping ----
  st(game) {
    if (!game.tal || game.tal.level !== game.level) {
      game.tal = { level: game.level, visited: new Set([game.goatRoom || 0]), room: game.goatRoom || 0,
        grease: new Map(), echoes: [], effigy: null, pulse: 0, cupHearts: 0 };
      const R = Talisman.run(game), cup = game.mods.cup;
      if (!(cup && cup.carry)) R.cup = 0;
    }
    return game.tal;
  },
  run(game) {
    if (!game.talRun) game.talRun = { tallow: true, tallowCount: 0, cup: 0, tally: 0, tallyCharged: false };
    return game.talRun;
  },
  heavy(e) { return e.kind === 'ratogre' || (e.unliftable === true); },

  update(game, dt) {
    const S = Talisman.st(game), R = Talisman.run(game), m = game.mods, g = game.goat, w = game.world;
    // A room entered for the first time this level. Tallow counts it; the sandal asks who was behind.
    const here = game.goatRoom || 0;
    if (here !== S.room) {
      const prev = S.room; S.room = here;
      if (!S.visited.has(here)) { S.visited.add(here); Talisman.newRoom(game, here, prev); }
    }
    g.parryT = Math.max(0, (g.parryT || 0) - dt);
    g.sandalT = Math.max(0, (g.sandalT || 0) - dt);
    g.stillT = Math.hypot(g.vx, g.vy) < 20 ? (g.stillT || 0) + dt : 0;
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (e.panicCd > 0) e.panicCd -= dt;
      if (e.decoyT > 0) e.decoyT -= dt;
    }
    if (S.echoes.length) Talisman.updateEchoes(game, dt);
    if (S.grease.size) Talisman.updateGrease(game, dt);
    Talisman.updateCorpses(game, dt);
    if (S.effigy) Talisman.updateEffigy(game, dt);
    // MASON'S MARK II: a crate or a rack is stone to a body arriving fast enough.
    if (m.mason && m.mason.props) {
      const lim = TUNING.physics.splatSpeed * m.mason.splat;
      for (const e of game.enemies) {
        if (e.dead || e.state !== 'flung' || Math.hypot(e.vx, e.vy) < lim) continue;
        for (const p of game.props) {
          if (p.broken || p.held || p.corpse || !(p.kind === 'crate' || (p.kind === 'weapon' && p.inStand))) continue;
          if (Math.hypot(p.x - e.x, p.y - e.y) > p.r + e.r) continue;
          const l = Math.hypot(e.vx, e.vy);
          if (p.kind === 'crate') p.shatter(game);
          Talisman.chips(game, e.x, e.y);
          e.die(game, 'splat', e.vx / l, e.vy / l); break;
        }
      }
    }
    // BLOOD CUP: a full cup waits for a heart to be missing.
    const cup = m.cup;
    if (cup && R.cup >= cup.need && g.hp < g.maxHp && !g.dead && S.cupHearts < cup.max) {
      R.cup -= cup.need; S.cupHearts++; g.hp++;
      game.floatText(g.x, g.y - 34, '+1 HEART', PALETTE.blood); game.audio.sfxBell && game.audio.sfxBell();
      game.particles(g.x, g.y, 12, PALETTE.blood, 140);
    }
  },

  newRoom(game, idx, prev) {
    const m = game.mods, g = game.goat, R = Talisman.run(game);
    // TALLOW SKIN: the crust grows back one new room at a time.
    if (m.tallow && !R.tallow) {
      R.tallowCount++;
      if (R.tallowCount >= m.tallow.rooms) { R.tallow = true; R.tallowCount = 0; game.floatText(g.x, g.y - 34, 'THE TALLOW SETS', PALETTE.bone); }
    }
    // PILGRIM'S SANDAL: into a new room with somebody on your heels.
    const sd = m.sandal;
    if (sd) {
      const behind = game.enemies.filter((e) => !e.dead && !e.held && !e.ghosted && e.aware && e.state !== 'hidden'
        && Math.hypot(e.x - g.x, e.y - g.y) < sd.range * TILE && (() => { const r = roomAt(game.level, e.x, e.y); return !r || r.index !== idx; })());
      if (behind.length) {
        g.sandalT = sd.time;
        if (sd.reset) { g.rollCd = 0; g.screamCd = 0; }
        game.dust(g.x, g.y, 6, 0, 0); game.ring(g.x, g.y, 1.2 * TILE, PALETTE.fireHi, 0.35, 2);
        if (sd.shake) {
          for (const e of behind) { e.aware = false; e.target = { x: g.x, y: g.y }; e.state = 'investigate'; e.lostTimer = 0; e.decoyT = 1.2; }
          game.floatText(behind[0].x, behind[0].y - 30, 'SHAKEN OFF', PALETTE.bone);
        }
      }
    }
  },

  // ---- the goat's side ----
  runUpTime(game) { return game.mods.spur ? game.mods.spur.time : 1; },
  speedMul(game) { const g = game.goat, sd = game.mods.sandal; return sd && g.sandalT > 0 ? 1 + sd.speed : 1; },
  // Grip under the hooves: on grease he turns and stops like a man on ice, but he never goes down.
  gripMul(game, g) { const gr = game.mods.grease; return gr && Talisman.greaseAt(game, g.x, g.y) ? gr.grip : 1; },
  // A blow takes the run-up: all of it, or with BRASS SPUR II a share.
  loseRunUp(game, g) {
    const k = game.mods.spur ? game.mods.spur.keep : 0;
    g.runUp = 1 + (g.runUp - 1) * k; g.runT = g.runT * k;
  },
  stepMul(game, g) {
    const mo = game.mods.moth; if (!mo) return 1;
    if (mo.near > 0) {
      for (const e of game.enemies) {
        if (e.dead || e.aware || e.ghosted) continue;
        if (Math.hypot(e.x - g.x, e.y - g.y) < mo.near * TILE) return 0;
      }
    }
    return mo.step;
  },
  onButtStart(game, g) { if (game.mods.mirror) g.parryT = game.mods.mirror.window; },
  onLunge(game, g) {
    const E = game.mods.echo; if (!E) return;
    const S = Talisman.st(game), a = Math.atan2(g.aim.y, g.aim.x);
    for (let k = 0; k < E.count; k++) {
      const turn = k === 0 ? 0 : (Math.random() < 0.5 ? -1 : 1) * E.spread;
      S.echoes.push({ x: g.x, y: g.y, a: a + turn, t: E.delay * (k + 1), lunge: g.lungeId, show: 0 });
    }
  },
  // What a headbutt landing on `e` is worth. Called once per man per lunge from `headbuttHits`.
  buttImpulse(game, g, e, imp) {
    const m = game.mods, R = Talisman.run(game);
    if (m.spur && g.runUp >= 1 + 0.95 * TUNING.goat.momentum.max) imp *= m.spur.throw;
    const T = m.tally;
    if (T) {
      if (g.tallyLunge !== g.lungeId) {
        g.tallyLunge = g.lungeId; g.tallyThis = R.tallyCharged;
        if (R.tallyCharged) { R.tallyCharged = false; R.tally = 0; }
        else { R.tally++; if (R.tally >= T.every - 1) R.tallyCharged = true; }
        if (g.tallyThis) {
          game.floatText(e.x, e.y - 34, 'TALLY', PALETTE.fireHi); game.shake(4);
          if (T.stun > 0) for (const o of game.enemies) {
            if (o === e || o.dead || o.ghosted || Math.hypot(o.x - e.x, o.y - e.y) > T.r * TILE + o.r) continue;
            o.daze(game, T.stun);
          }
        }
      }
      if (g.tallyThis) imp *= T.mul;
    }
    return imp;
  },
  // TALLOW SKIN: the crust takes the blow instead of a heart. Returns whether it did.
  absorb(game, g) {
    const R = Talisman.run(game);
    if (!game.mods.tallow || !R.tallow) return false;
    R.tallow = false; R.tallowCount = 0; g.invuln = TUNING.goat.invuln;
    game.floatText(g.x, g.y - 30, 'THE TALLOW CRACKS', PALETTE.bone);
    game.particles(g.x, g.y, 14, '#e8dcb0', 160); game.audio.sfxThud(); game.shake(4); game.hitstop(0.04);
    return true;
  },
  // SCAPEGOAT: somebody else dies. Spent on use — the slot empties and the level's snapshot of it
  // goes too, or a real death afterwards would hand it straight back on the restart.
  scapegoat(game, g) {
    const sg = game.mods.scapegoat; if (!sg) return false;
    g.hp = sg.hearts; g.invuln = sg.invuln;
    game.world.body(g.x + 14, g.y + 6, 12, 0.4, '#e8e0cc');
    game.world.splat(g.x, g.y, 0, 0, 16);
    game.particles(g.x, g.y, 20, PALETTE.bone, 200); game.ring(g.x, g.y, 2.4 * TILE, PALETTE.bone, 0.7, 4);
    game.floatText(g.x, g.y - 40, 'SOMEBODY ELSE DIED', PALETTE.bone);
    game.hitstop(0.1); game.shake(10); game.flash(PALETTE.bone, 0.3);
    if (sg.stun > 0) for (const e of game.enemies) {
      if (e.dead || e.ghosted || Math.hypot(e.x - g.x, e.y - g.y) > sg.r * TILE) continue;
      e.daze(game, sg.stun);
    }
    game.artifact = null; game.levelArtifact = null; game.applyBoons(); game.saveRun();
    return true;
  },
  onSoul(game) {
    const T = game.mods.tallow, R = Talisman.run(game);
    if (T && T.soul && !R.tallow) { R.tallow = true; R.tallowCount = 0; game.floatText(game.goat.x, game.goat.y - 44, 'THE TALLOW SETS', PALETTE.bone); }
  },

  // ---- MIRROR SHARD: the parry window ----
  // `kind`: 'bullet' and 'bite' at every tier, 'melee' from II, 'heavy' (a cleaver, a charge, a
  // slam, the ogre) at III. Returns true when the blow went back where it came from.
  canParry(game, kind) {
    const M = game.mods.mirror, g = game.goat;
    if (!M || !(g.parryT > 0) || g.dead) return false;
    return kind === 'bullet' || kind === 'bite' || (kind === 'melee' && M.club) || (kind === 'heavy' && M.heavy);
  },
  parryFx(game, x, y) {
    const g = game.goat;
    game.ring(g.x, g.y, 1.3 * TILE, PALETTE.witchHi, 0.3, 3); game.particles(x, y, 9, PALETTE.witchHi, 220);
    game.floatText(g.x, g.y - 34, 'PARRIED', PALETTE.witchHi);
    game.audio.sfxSteel(); game.hitstop(0.06); game.shake(4); game.vibe(20);
  },
  parry(game, att, kind) {
    const heavy = att.kind === 'butcher' || att.kind === 'ratogre' || kind === 'charge' || kind === 'slam';
    if (!Talisman.canParry(game, heavy ? 'heavy' : kind)) return false;
    const g = game.goat, dx = att.x - g.x, dy = att.y - g.y, l = Math.hypot(dx, dy) || 1;
    Talisman.parryFx(game, att.x, att.y);
    if (kind === 'charge') { att.chargeStopped(game); return true; }
    if (kind === 'slam') { att.state = 'stunned'; att.timer = game.mods.mirror.stun; att.vx = 0; att.vy = 0; return true; }
    if (att.kind === 'ratogre') { att.breakSwing(game); att.state = 'stagger'; att.timer = att.cfg.stagger; return true; }
    if (att.kind === 'butcher') {
      att.state = 'stagger'; att.timer = game.mods.mirror.stun; att.vx = dx / l * 4 * TILE; att.vy = dy / l * 4 * TILE;
      att.die(game, 'headbutt', dx / l, dy / l); return true;
    }
    const imp = TUNING.goat.headbutt.impulse * game.mods.headbuttImpulse * game.mods.mirror.throw * (att.knockMul ? att.knockMul() : 1);
    att.fling(dx / l * imp, dy / l * imp, false);
    return true;
  },
  // A round that reaches him inside the window goes back the way it came, and is his now.
  reflectBullet(game, b) {
    if (b.reflected || !Talisman.canParry(game, 'bullet')) return false;
    b.vx = -b.vx * 0.9; b.vy = -b.vy * 0.9; b.reflected = true; b.life = Math.max(b.life, 0.9);
    Talisman.parryFx(game, b.x, b.y);
    return true;
  },
  // III: a rune going off near him while the window is open goes off under the man who painted it.
  redirectRune(game, mage) {
    const M = game.mods.mirror, g = game.goat;
    if (!M || !M.heavy || !mage.rune || !(g.parryT > 0)) return;
    if (Math.hypot(mage.x - g.x, mage.y - g.y) > M.runeR * TILE) return;
    if (Math.hypot(mage.rune.x - g.x, mage.rune.y - g.y) > TUNING.seer.runeRadius * TILE + g.r) return;
    mage.rune = { x: mage.x, y: mage.y };
    Talisman.parryFx(game, mage.x, mage.y);
  },

  // ---- the geometry ----
  splatMul(game) { return game.mods.mason ? game.mods.mason.splat : 1; },
  bodyMul(game) { const M = game.mods.mason; return M && M.bodies ? M.splat : 1; },
  chips(game, x, y) { game.particles(x, y, 6, PALETTE.ash, 150); },
  // DOMINO BONE: a body below killing speed hands the throw on instead of simply bowling a man over.
  domino(game, f, o) {
    const D = game.mods.domino; if (!D || Talisman.heavy(o) || o.kind === 'butcher') return false;
    const chain = (f.chain || 0) + 1, spd = Math.hypot(f.vx, f.vy);
    if (chain > D.links || spd * D.keep < TUNING.physics.flungFloorSpeed) return false;
    o.fling(f.vx * D.keep, f.vy * D.keep, false); o.chain = chain;
    f.vx *= 0.15; f.vy *= 0.15;
    game.ring((f.x + o.x) / 2, (f.y + o.y) / 2, 0.4 * TILE, PALETTE.bone, 0.25, 2);
    game.particles((f.x + o.x) / 2, (f.y + o.y) / 2, 3, PALETTE.fireHi, 160); game.audio.sfxThud();
    return true;
  },
  dragMul(game, e) {
    const gr = game.mods.grease; if (!gr) return 1;
    return Talisman.greaseAt(game, e.x, e.y) ? gr.drag : 1;
  },
  greaseAt(game, x, y) {
    const S = game.tal; if (!S || !S.grease.size) return false;
    return S.grease.has(Math.floor(y / TILE) * game.world.W + Math.floor(x / TILE));
  },
  updateGrease(game, dt) {
    const S = game.tal, gr = game.mods.grease;
    for (const [k, t] of S.grease) { if (t - dt <= 0) S.grease.delete(k); else S.grease.set(k, t - dt); }
    if (!gr || !gr.slip) return;
    for (const e of game.enemies) {
      if (e.dead || e.ghosted || e.held || Talisman.heavy(e) || e.kind === 'butcher') continue;
      if (e.state !== 'chase' || Math.hypot(e.vx, e.vy) < e.speed * 0.5 || !Talisman.greaseAt(game, e.x, e.y)) continue;
      if (Math.random() < gr.slip * dt) { e.state = 'floored'; e.timer = 0.6; e.vx *= 1.4; e.vy *= 1.4; game.floatText(e.x, e.y - 26, 'SLIP', PALETTE.blood); }
    }
  },
  // CARPENTER'S AWL: a crate coming apart throws splinters into whoever is beside it.
  splinters(game, p) {
    const A = game.mods.awl; if (!A) return;
    game.particles(p.x, p.y, 10, PALETTE.wood, 260);
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted || e.state === 'flung') continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
      if (d > A.r * TILE + e.r) continue;
      if (Talisman.heavy(e) || e.kind === 'butcher') { e.state = 'stagger'; e.timer = 0.4; continue; }
      if (A.fling > 0) { const l = d || 1; e.fling(dx / l * A.fling * TILE, dy / l * A.fling * TILE, false); }
      else { e.state = 'floored'; e.timer = 0.7; e.aware = true; }
    }
  },

  // ---- a kill ----
  onKill(game, e, cause) {
    const m = game.mods, S = Talisman.st(game), R = Talisman.run(game);
    // BLOOD CUP: the room did it, not a blade or a flame.
    if (m.cup && !e.byBlade && (cause === 'splat' || cause === 'mill' || cause === 'spike' || cause === 'fall')) {
      R.cup = Math.min(R.cup + 1, m.cup.need);
    }
    // BUTCHER'S GREASE: what a wall kill leaves on the floor.
    if (m.grease && cause === 'splat' && !e.byBlade) {
      const r = m.grease.r, w = game.world, tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE), n = Math.ceil(r);
      for (let y = ty - n; y <= ty + n; y++) for (let x = tx - n; x <= tx + n; x++) {
        if (Math.hypot(x - tx, y - ty) > r + 0.2 || w.isSolid(x, y)) continue;
        S.grease.set(y * w.W + x, m.grease.life);
      }
    }
    // HORNED MASK: whoever watched it runs.
    const MK = m.mask;
    if (MK) for (const o of game.enemies) {
      if (o === e || o.dead || o.held || o.ghosted || o.kind === 'wraith' || Talisman.heavy(o) || o.kind === 'butcher') continue;
      if (o.panicCd > 0 || Math.hypot(o.x - e.x, o.y - e.y) > MK.r * TILE || !game.world.los(o.x, o.y, e.x, e.y)) continue;
      if (o.state === 'flung' || o.state === 'floored' || o.state === 'stunned' || o.state === 'burning') continue;
      const busy = o.state === 'windup' || o.state === 'swing' || o.state === 'aim' || o.state === 'cast' || o.state === 'slamwind' || o.state === 'dart' || o.state === 'chargewind';
      if (busy && !MK.drop) continue;
      if (busy && o.kind === 'hunter') o.reload = o.cfg.reload;
      o.rune = null; o.dashPath = null;
      o.state = 'flee'; o.timer = MK.flee; o.fleeFrom = { x: e.x, y: e.y }; o.panicCd = MK.cd;
      if (MK.blind) o.hazardBlind = MK.flee;
    }
    // GRAVEDIGGER'S SPADE: the body stays in the room as a thing.
    const SP = m.spade;
    if (SP && e.kind !== 'wraith' && e.kind !== 'ratogre' && e.kind !== 'butcher'
        && (cause === 'splat' || cause === 'headbutt' || cause === 'mill' || cause === 'club' || cause === 'spike' || cause === 'shot')) {
      e.corpsed = true;
      const p = new Prop(e.x, e.y, 'crate');
      p.corpse = true; p.noGrab = !SP.grab; p.r = SP.r; p.life = SP.life; p.sprite = game.fx.snapshot(e);
      p.angle = (e.facing || 0) + Math.PI / 2; p.fromKind = e.kind;
      game.props.push(p);
      const bodies = game.props.filter((q) => q.corpse && !q.broken);
      if (bodies.length > SP.cap) Talisman.corpseGone(game, bodies[0]);
    }
  },

  // ---- bodies ----
  updateCorpses(game, dt) {
    const SP = game.mods.spade;
    for (const p of game.props) {
      if (!p.corpse || p.broken) continue;
      if (SP) p.noGrab = !SP.grab;
      if (!p.held && !p.flung) { p.life -= dt; if (p.life <= 0) { Talisman.corpseGone(game, p); continue; } }
      if (p.held || p.flung) continue;
      for (const e of game.enemies) {
        if (e.dead || e.ghosted || e.held || e.tripOn === p || Talisman.heavy(e) || e.kind === 'butcher') continue;
        if (e.state !== 'chase' && e.state !== 'investigate' && e.state !== 'flee') continue;
        if (Math.hypot(e.vx, e.vy) < e.speed * 0.5 || Math.hypot(e.x - p.x, e.y - p.y) > p.r + e.r * 0.6) continue;
        e.tripOn = p; e.state = 'floored'; e.timer = SP ? SP.trip : 0.6; e.aware = true;
        game.floatText(e.x, e.y - 26, 'TRIPPED', PALETTE.bone); game.audio.sfxThud();
      }
    }
  },
  // A thrown body into a man: at III, at killing speed, it kills him like a live one would.
  corpseHit(game, p, e, spd) {
    const SP = game.mods.spade;
    if (!SP || !SP.lethal || spd < TUNING.physics.bodyKillSpeed || e.kind === 'wraith') return false;
    const l = spd || 1; e.die(game, 'splat', p.vx / l, p.vy / l);
    return true;
  },
  // A body done with: it goes back to being a stain on the floor.
  corpseGone(game, p) {
    if (p.broken) return;
    p.broken = true; p.dead = true;
    if (game.goat.holding === p) game.goat.holding = null;
    game.world.body(p.x, p.y, 11, p.angle || 0, '#2a1d20');
    game.world.splat(p.x, p.y, p.vx / 400 || 0, p.vy / 400 || 0, 8);
  },

  // ---- ECHO HORN ----
  updateEchoes(game, dt) {
    const S = game.tal, E = game.mods.echo, g = game.goat;
    if (!E) { S.echoes = []; return; }   // taken off: nothing waiting goes off
    for (const ec of S.echoes) {
      // The ghost lands where the real blow did: it rides with him until his lunge is over.
      if (ec.lunge === g.lungeId && g.state === 'lunge') { ec.x = g.x; ec.y = g.y; }
      ec.t -= dt;
      if (ec.t > 0 || ec.done) continue;
      ec.done = true; ec.show = 0.35;
      const hb = TUNING.goat.headbutt, extra = (game.mods.headbuttReach - 1) * TILE;
      const ax = Math.cos(ec.a), ay = Math.sin(ec.a), imp = hb.impulse * game.mods.headbuttImpulse * E.power;
      game.particles(ec.x + ax * 16, ec.y + ay * 16, 5, PALETTE.bone, 140);
      for (const e of game.enemies) {
        if (e.dead || e.held || e.ghosted || e.state === 'flung') continue;
        const dx = e.x - ec.x, dy = e.y - ec.y, d = Math.hypot(dx, dy);
        // `reach` is the lunge the ghost does not make: it stands where the blow landed and reaches past it.
        if (d > g.r + e.r + 10 + extra + E.reach * TILE || (dx * ax + dy * ay) / (d || 1) < 0.15) continue;
        if (!game.reaches(ec.x, ec.y, e.x, e.y)) continue;
        if (e.tryDodge && e.tryDodge(game, ax, ay)) continue;
        if (e.kind === 'butcher' || e.kind === 'ratogre') { e.state = 'stagger'; e.timer = 0.3; continue; }
        const k = imp * (e.knockMul ? e.knockMul() : 1);
        e.fling(ax * k, ay * k, false);
        game.audio.sfxThud(); game.impact(ec.x + ax * (g.r + 6), ec.y + ay * (g.r + 6), ax, ay);
      }
    }
    for (const ec of S.echoes) if (ec.done) ec.show -= dt;
    S.echoes = S.echoes.filter((ec) => !ec.done || ec.show > 0);
  },

  // ---- STRAW EFFIGY (Q) ----
  placeEffigy(game, g) {
    const F = game.mods.effigy, S = Talisman.st(game), w = game.world;
    let x = g.x + g.aim.x * 1.2 * TILE, y = g.y + g.aim.y * 1.2 * TILE;
    if (w.isSolid(Math.floor(x / TILE), Math.floor(y / TILE)) || w.isPitPx(x, y)) { x = g.x; y = g.y; }
    S.effigy = { x, y, t: F.life, max: F.life, r: 11 };
    S.pulse = 0;
    game.particles(x, y, 10, PALETTE.hay || PALETTE.ochre, 120); game.audio.sfxThud();
    game.floatText(x, y - 30, 'A STRAW GOAT', PALETTE.ochre);
    return true;
  },
  effigyDown(game) {
    const S = game.tal, f = S.effigy; if (!f) return;
    game.particles(f.x, f.y, 16, PALETTE.ochre, 200); game.audio.sfxCrack && game.audio.sfxCrack();
    S.effigy = null;
  },
  decoyProof(e) { return e.kind === 'wraith' || e.kind === 'ratogre' || e.kind === 'butcher'; },
  updateEffigy(game, dt) {
    const S = game.tal, f = S.effigy, F = game.mods.effigy, w = game.world;
    if (!F) { S.effigy = null; return; }
    f.t -= dt; if (f.t <= 0) { Talisman.effigyDown(game); return; }
    // Every half-second it calls again: whoever can see it and has an ear for it goes to it.
    S.pulse -= dt;
    if (S.pulse <= 0) {
      S.pulse = 0.5;
      for (const e of game.enemies) {
        if (e.dead || e.held || e.ghosted || Talisman.decoyProof(e) || !e.woke) continue;
        if (e.state === 'flung' || e.state === 'floored' || e.state === 'stunned' || e.state === 'burning' || e.state === 'decoyhit' || e.state === 'flee') continue;
        if (Math.hypot(e.x - f.x, e.y - f.y) > F.r * TILE || !w.los(e.x, e.y, f.x, f.y)) continue;
        e.decoyT = 0.7; e.target = { x: f.x, y: f.y };
        if (e.kind !== 'hunter' || !F.shots) { e.aware = false; e.state = 'investigate'; }
      }
    }
    for (const e of game.enemies) {
      if (e.dead || !(e.decoyT > 0)) continue;
      const d = Math.hypot(e.x - f.x, e.y - f.y);
      // A rifle puts a round in it. The round goes where rounds go.
      if (e.kind === 'hunter' && F.shots) {
        e.vx = 0; e.vy = 0; e.facing = Math.atan2(f.y - e.y, f.x - e.x);
        if (e.reload <= 0 && d < e.cfg.sight * TILE && w.los(e.x, e.y, f.x, f.y)) {
          game.fireBullet(e, (f.x - e.x) / (d || 1), (f.y - e.y) / (d || 1)); e.reload = e.cfg.reload;
        }
        continue;
      }
      if (e.state === 'investigate' && d < (e.cfg.reach || 0.8 * TILE) + e.r + f.r) {
        e.state = 'decoyhit'; e.timer = e.cfg.windup || 0.5; e.vx = 0; e.vy = 0;
      }
    }
    for (const b of game.bullets) {
      if (b.dead || Math.hypot(b.x - f.x, b.y - f.y) > f.r + 3) continue;
      b.dead = true; Talisman.effigyDown(game); return;
    }
  },

  // ---- two states an enemy can be put in from here: running from a death, clubbing straw ----
  enemyState(e, dt, game) {
    if (e.state === 'flee') {
      e.timer -= dt;
      const from = e.fleeFrom || { x: game.goat.x, y: game.goat.y };
      e.moveToward(e.x - from.x, e.y - from.y, e.speed * 1.1, dt, game);
      if (e.timer <= 0) { e.state = 'chase'; e.aware = true; }
      return;
    }
    if (e.state === 'decoyhit') {
      const f = game.tal && game.tal.effigy;
      e.vx = 0; e.vy = 0; e.timer -= dt;
      if (f) e.facing = Math.atan2(f.y - e.y, f.x - e.x);
      if (e.timer > 0) return;
      game.audio.sfxSwing();
      if (f && Math.hypot(f.x - e.x, f.y - e.y) < (e.cfg.reach || 0.8 * TILE) + e.r + f.r + 8) {
        Talisman.effigyDown(game);
        if (game.mods.effigy && game.mods.effigy.oops) game.meleeHit(e, (e.cfg.reach || 0.8 * TILE) + 10, Math.PI * 0.9, 0, 0, true);
      }
      e.state = 'idle'; e.aware = false; e.decoyT = 0;
    }
  },
  // Can this man see the goat at all, before the cone is even asked? Straw holds his eye, and the
  // moth's wool hides a goat standing still from a man who has not seen him yet.
  visibleTo(game, e, d) {
    if (e.decoyT > 0 && d > 3 * TILE) return false;
    const mo = game.mods.moth, g = game.goat;
    if (mo && mo.still > 0 && !e.aware && (g.stillT || 0) >= mo.still && d > mo.hide * TILE) return false;
    return true;
  },

  // ---- drawing ----
  // Under everything that stands: grease on the boards, the effigy, echoes of the horns.
  drawGround(r, game) {
    const S = game.tal; if (!S) return;
    const ctx = r.ctx, w = game.world, gr = game.mods.grease;
    if (S.grease.size) {
      const life = gr ? gr.life : 15;
      for (const [k, t] of S.grease) {
        const x = (k % w.W) * TILE, y = Math.floor(k / w.W) * TILE;
        if (game.hidden(x + TILE / 2, y + TILE / 2)) continue;
        // A wet smear per tile, not a square: an ellipse a little wider than the tile, jittered off
        // the tile's own index so neighbours overlap into one pool, and a glint of light on it.
        const a = Math.min(1, t / life), o = (k * 7) % 9 - 4, q = (k * 13) % 7 - 3;
        ctx.fillStyle = `rgba(150,28,24,${0.3 * a})`;
        ctx.beginPath(); ctx.ellipse(x + TILE / 2 + o, y + TILE / 2 + q, TILE * 0.62, TILE * 0.5, (k % 5) * 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,210,190,${0.3 * a})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x + 9 + o, y + 12 + q); ctx.lineTo(x + 18 + o, y + 10 + q); ctx.stroke();
      }
    }
    for (const ec of S.echoes) {
      if (!ec.done || ec.show <= 0) continue;
      ctx.save(); ctx.globalAlpha = 0.5 * ec.show / 0.35; ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = 3;
      const ax = Math.cos(ec.a), ay = Math.sin(ec.a);
      ctx.beginPath(); ctx.arc(ec.x + ax * 20, ec.y + ay * 20, 14, ec.a - 1, ec.a + 1); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(ec.x, ec.y, 11, 8, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    const f = S.effigy;
    if (f) {
      const fade = Math.min(1, f.t);
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(f.x, f.y); ctx.scale(1, 1 / TILT);
      r.shadow(0, 2, 11, 4);
      // a sheaf of straw bound into the shape of a goat: body, head, two horns, four stick legs
      ctx.strokeStyle = '#6b4a2c'; ctx.lineWidth = 2.2;
      for (const lx of [-7, -3, 4, 8]) { ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, -8); ctx.stroke(); }
      ctx.fillStyle = '#c9a24e'; ctx.strokeStyle = '#7a5a26'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(0, -12, 12, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(11, -19, 5, 4.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#e0c275'; ctx.lineWidth = 1;
      for (let k = -9; k <= 9; k += 3) { ctx.beginPath(); ctx.moveTo(k, -17); ctx.lineTo(k + 2, -7); ctx.stroke(); }
      ctx.strokeStyle = '#7a5a26'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(10, -22); ctx.quadraticCurveTo(8, -28, 4, -27); ctx.moveTo(13, -22); ctx.quadraticCurveTo(14, -28, 18, -27); ctx.stroke();
      ctx.restore();
    }
  },
  drawCorpse(r, p) {
    const ctx = r.ctx;
    const fade = p.held || p.flung ? 1 : Math.min(1, p.life / 2);
    ctx.save(); ctx.globalAlpha = fade;
    r.shadow(p.x, p.y + 2, 14, 5);
    ctx.translate(p.x, p.y);
    ctx.scale(1, TILT);
    if (p.sprite) {
      ctx.rotate(p.angle || 0); ctx.filter = 'brightness(0.62) saturate(0.7)';
      ctx.drawImage(p.sprite, -21, -30, 42, 42);
    } else {
      ctx.rotate(p.angle || 0);
      ctx.fillStyle = PALETTE.plum; ctx.beginPath(); ctx.ellipse(0, 0, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c9a38a'; ctx.beginPath(); ctx.arc(14, 0, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },
  // Over the shade: what the bell lets him see through stone, and the panic over the runners' heads.
  drawWorld(r, game) {
    const ctx = r.ctx, g = game.goat, B = game.mods.bell, w = game.world;
    if (B && B.sil > 0 && !g.dead) {
      for (const e of game.enemies) {
        if (e.dead || e.state === 'hidden' || (e.ghosted && e.kind === 'wraith')) continue;
        if (Math.hypot(e.x - g.x, e.y - g.y) > B.sil * TILE) continue;
        const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
        const lit = !game.hidden(e.x, e.y) && w.vis && w.vis[ty * w.W + tx];
        if (lit) continue;
        ctx.save(); ctx.globalAlpha = 0.4;
        ctx.filter = e.aware ? 'brightness(0) invert(0.35) sepia(1) saturate(6) hue-rotate(-40deg)' : 'brightness(0) invert(0.55)';
        const keep = e.say; e.say = null; r.drawEnemy(e, game); e.say = keep;
        ctx.restore();
      }
    }
    if (B && B.mimic && !g.dead) {
      for (const e of game.enemies) {
        if (e.dead || e.state !== 'hidden' || Math.hypot(e.x - g.x, e.y - g.y) > 4 * TILE) continue;
        const a = 0.25 + 0.25 * Math.sin(r.t * 9 + e.x);
        ctx.strokeStyle = `rgba(191,230,255,${a})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(e.x + Math.sin(r.t * 31) * 1.2, e.y, 16, 12, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    for (const e of game.enemies) {
      if (e.dead || e.state !== 'flee' || game.hidden(e.x, e.y)) continue;
      ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 1 / TILT);
      ctx.fillStyle = PALETTE.bone; ctx.font = `700 16px ${FONT_SC}`; ctx.textAlign = 'center';
      ctx.fillText('!', 0, -e.r * 2.6); ctx.restore();
    }
  },
  // Screen space, beside the talisman chip: the crust, the cup, the notches — and the bell's thread.
  drawHud(r, game, x, y, box) {
    const ctx = r.ctx, s = r.hs, m = game.mods, R = Talisman.run(game);
    const bx = x, by = y + box + 14 * s;
    if (m.tallow) {
      const n = m.tallow.rooms;
      for (let k = 0; k < n; k++) {
        ctx.fillStyle = R.tallow || k < R.tallowCount ? '#e8dcb0' : 'rgba(239,230,208,0.18)';
        ctx.fillRect(bx + k * 6 * s, by, 4 * s, 4 * s);
      }
    }
    if (m.cup) {
      const f = Math.min(1, R.cup / m.cup.need), cw = box, ch = 5 * s;
      ctx.fillStyle = 'rgba(13,10,12,0.7)'; ctx.fillRect(bx, by, cw, ch);
      ctx.fillStyle = PALETTE.blood; ctx.fillRect(bx, by, cw * f, ch);
      ctx.strokeStyle = 'rgba(239,230,208,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, cw, ch);
    }
    if (m.tally) {
      const n = m.tally.every - 1;
      for (let k = 0; k < n; k++) {
        ctx.fillStyle = R.tallyCharged || k < R.tally ? PALETTE.fireHi : 'rgba(239,230,208,0.2)';
        ctx.fillRect(bx + k * 5 * s, by, 2 * s, 7 * s);
      }
      if (R.tallyCharged) { ctx.fillStyle = PALETTE.fireHi; ctx.font = `700 ${8 * s}px ${FONT_SC}`; ctx.fillText('x2', bx + n * 5 * s + 3 * s, by + 7 * s); }
    }
    // The bell's thread: a small mark on the edge of the screen toward the stairs, and the vault.
    const B = m.bell;
    if (B && game.level && !game.goat.dead && game.state === 'play') {
      const cam = game.cam, z = cam.zoom, targets = [];
      if (game.level.exitTile) targets.push([(game.level.exitTile.x0 + 0.5) * TILE, (game.level.exitTile.y0 + 1) * TILE, PALETTE.bone]);
      const vd = game.props.find((p) => p.vault && !p.broken);
      if (vd) targets.push([vd.x, vd.y, PALETTE.witch]);
      for (const [wx, wy, col] of targets) {
        const sx = r.vcx + (wx - cam.x) * z, sy = r.vcy + (wy - cam.y) * z * TILT;
        const pad = 26 * s;
        if (sx > pad && sx < r.w - pad && sy > pad && sy < r.h - pad) continue;
        const a = Math.atan2(sy - r.vcy, sx - r.vcx);
        const ex = clamp(r.vcx + Math.cos(a) * r.w, pad, r.w - pad), ey = clamp(r.vcy + Math.sin(a) * r.h, pad, r.h - pad);
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.globalAlpha = 0.75;
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(10 * s, 0); ctx.lineTo(-6 * s, -6 * s); ctx.lineTo(-3 * s, 0); ctx.lineTo(-6 * s, 6 * s); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  },
  // ---- the TALISMANS tab of the level tool ----
  // Every entry in `ARTIFACTS` as a row: its drawing, its name and sort, which tier (if any) is at
  // his neck with buttons to put one on, and the three tiers side by side — each its line and its
  // params as chips. A chip is the same editor the BOONS tab uses: a number opens a prompt, a
  // yes/no flips, and both are written back into tuning.js through `persistTuningEdit`.
  drawToolTab(r, game, pad, top) {
    const ctx = r.ctx, s = r.ts, d = game.dev, W = r.w, H = r.h;
    ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre; ctx.textAlign = 'left';
    ctx.fillText('THE TALISMANS', pad, top);
    ctx.font = `400 ${8.5 * s}px ${FONT}`; ctx.fillStyle = PALETTE.ash;
    ctx.fillText(`${ARTIFACTS.length} on the mouse's shelves · I / II / III puts one at his neck · click a number to change it`, pad + 120 * s, top);
    const rowH = 74 * s, listTop = top + 22 * s;
    const per = Math.max(1, Math.floor((H - listTop - 34 * s) / rowH));
    const pages = Math.ceil(ARTIFACTS.length / per);
    d.talPage = clamp(d.talPage || 0, 0, pages - 1);
    const leftW = 200 * s, colW = (W - pad * 2 - leftW) / 3;
    ctx.font = `700 ${7.5 * s}px ${FONT_SC}`; ctx.fillStyle = 'rgba(239,230,208,0.5)';
    ['TIER I', 'TIER II', 'TIER III'].forEach((t, i) => ctx.fillText(t, pad + leftW + i * colW, listTop - 4 * s));
    const art = game.artifact;
    ARTIFACTS.slice(d.talPage * per, d.talPage * per + per).forEach((a, i) => {
      const y = listTop + i * rowH;
      if (i % 2) { ctx.fillStyle = 'rgba(239,230,208,0.03)'; ctx.fillRect(pad - 4 * s, y, W - pad * 2 + 8 * s, rowH); }
      const worn = art && art.id === a.id;
      r.artifactIcon(a.id, pad + 16 * s, y + 20 * s, 12 * s, worn ? art.tier : 1);
      ctx.textAlign = 'left'; ctx.font = `700 ${9.5 * s}px ${FONT_SC}`; ctx.fillStyle = worn ? PALETTE.fireHi : PALETTE.bone;
      ctx.fillText(a.name, pad + 36 * s, y + 14 * s);
      ctx.font = `400 ${7.5 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.45)';
      const q = a.tag === 'q';
      ctx.fillText(`${a.id} · ${a.tag || 'first four'}${q ? ' · Q' : ''}`, pad + 36 * s, y + 26 * s);
      [1, 2, 3].forEach((t) => r.devButton(d, pad + 36 * s + (t - 1) * 32 * s, y + 34 * s, 28 * s, 16 * s, 'I'.repeat(t), `tal-wear=${a.id}.${t}`, worn && art.tier === t));
      if (worn) r.devButton(d, pad + 36 * s + 96 * s, y + 34 * s, 34 * s, 16 * s, 'OFF', 'tal-off', false);
      a.tiers.forEach((tier, ti) => {
        const cx = pad + leftW + ti * colW, cw = colW - 10 * s;
        // Three lines: a tier states itself whole now (`say`), not as a diff on the one before.
        ctx.font = `400 ${7.5 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.72)';
        r.wrap(tier.desc, cw).slice(0, 3).forEach((l, li) => ctx.fillText(l, cx, y + 11 * s + li * 9 * s));
        let px = cx, py = y + 35 * s;
        for (const key of Object.keys(tier.params || {})) {
          const val = tier.params[key];
          if (val !== null && typeof val === 'object') continue;
          ctx.font = `700 ${8 * s}px ${FONT_SC}`;
          const shown = typeof val === 'number' && !Number.isInteger(val) ? Math.round(val * 100) / 100 : val;
          const w = ctx.measureText(`${key} ${shown}`).width + 10 * s;
          if (px + w > cx + cw) { px = cx; py += 19 * s; }
          if (py > y + rowH - 16 * s) break;
          r.numChip(d, px, py, key, val, `tal-edit=${a.id}.${ti}.${key}`);
          px += w + 4 * s;
        }
      });
    });
    if (pages > 1) {
      const by = H - 28 * s;
      r.devButton(d, pad, by, 60 * s, 18 * s, 'PREV', 'tal-page=-1', false);
      ctx.font = `400 ${9 * s}px ${FONT}`; ctx.fillStyle = PALETTE.ash; ctx.textAlign = 'center';
      ctx.fillText(`${d.talPage + 1} / ${pages}`, pad + 95 * s, by + 12 * s); ctx.textAlign = 'left';
      r.devButton(d, pad + 130 * s, by, 60 * s, 18 * s, 'NEXT', 'tal-page=1', false);
    }
  },
  // The tab's clicks. Returns whether `id` was one of them.
  devAction(game, id) {
    const d = game.dev;
    if (id.startsWith('tal-page=')) { d.talPage = (d.talPage || 0) + Number(id.slice(9)); return true; }
    if (id === 'tal-off') { game.artifact = null; game.applyBoons(); game.devToast('NOTHING AT HIS NECK'); return true; }
    if (id.startsWith('tal-wear=')) {
      const [aid, t] = id.slice(9).split('.');
      const def = ARTIFACTS.find((a) => a.id === aid); if (!def) return true;
      game.artifact = { id: aid, tier: Number(t) }; game.applyBoons();
      game.devToast(`${def.name} ${'I'.repeat(Number(t))}`);
      return true;
    }
    if (id.startsWith('tal-edit=')) {
      const [aid, ti, key] = id.slice(9).split('.');
      const def = ARTIFACTS.find((a) => a.id === aid); if (!def) return true;
      const params = def.tiers[Number(ti)].params, cur = params[key];
      let value;
      if (typeof cur === 'boolean') value = !cur;
      else {
        const raw = window.prompt(`${def.name} ${'I'.repeat(Number(ti) + 1)} — ${key}`, String(cur));
        if (raw === null) return true;
        value = Number(raw); if (!Number.isFinite(value)) return true;
      }
      params[key] = value; game.applyBoons();
      game.persistTuningEdit({ root: 'ARTIFACTS', id: aid, path: ['tiers', Number(ti), 'params', key], value });
      return true;
    }
    return false;
  },
  // One small drawing per talisman, at `h` half-size, for the chip, the stool and the neck.
  icon(ctx, id, h) {
    const edge = 'rgba(26,16,22,0.75)';
    const line = (c, w) => { ctx.strokeStyle = c; ctx.lineWidth = h * w; };
    const disc = (c) => { ctx.fillStyle = c; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.12; ctx.beginPath(); ctx.arc(0, 0, h * 0.85, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
    if (id === 'mason') { ctx.fillStyle = '#8d8a85'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.12; ctx.fillRect(-h * 0.8, -h * 0.8, h * 1.6, h * 1.6); ctx.strokeRect(-h * 0.8, -h * 0.8, h * 1.6, h * 1.6); line('#2a2020', 0.12); ctx.beginPath(); ctx.moveTo(-h * 0.2, -h * 0.8); ctx.lineTo(h * 0.1, -h * 0.1); ctx.lineTo(-h * 0.1, h * 0.3); ctx.lineTo(h * 0.2, h * 0.8); ctx.stroke(); }
    else if (id === 'domino') { ctx.fillStyle = PALETTE.bone; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.12; ctx.fillRect(-h * 0.5, -h * 0.9, h, h * 1.8); ctx.strokeRect(-h * 0.5, -h * 0.9, h, h * 1.8); ctx.fillStyle = PALETTE.ink; ctx.fillRect(-h * 0.5, -h * 0.04, h, h * 0.08); for (const [px, py] of [[0, -h * 0.45], [-h * 0.22, h * 0.3], [h * 0.22, h * 0.6]]) { ctx.beginPath(); ctx.arc(px, py, h * 0.12, 0, Math.PI * 2); ctx.fill(); } }
    else if (id === 'echo') { line(PALETTE.bone, 0.2); ctx.beginPath(); ctx.arc(-h * 0.3, 0, h * 0.6, -1.2, 1.2); ctx.stroke(); line('rgba(239,230,208,0.55)', 0.16); ctx.beginPath(); ctx.arc(h * 0.1, 0, h * 0.6, -1.2, 1.2); ctx.stroke(); line('rgba(239,230,208,0.3)', 0.12); ctx.beginPath(); ctx.arc(h * 0.5, 0, h * 0.6, -1.2, 1.2); ctx.stroke(); }
    else if (id === 'spade') { line('#6b4a2c', 0.18); ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(0, h * 0.2); ctx.stroke(); ctx.fillStyle = '#8d8a85'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.1; ctx.beginPath(); ctx.moveTo(-h * 0.45, h * 0.15); ctx.lineTo(h * 0.45, h * 0.15); ctx.lineTo(h * 0.35, h * 0.75); ctx.lineTo(0, h); ctx.lineTo(-h * 0.35, h * 0.75); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (id === 'grease') { ctx.fillStyle = PALETTE.blood; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.12; ctx.beginPath(); ctx.moveTo(0, -h * 0.9); ctx.quadraticCurveTo(h * 0.8, h * 0.1, 0, h * 0.85); ctx.quadraticCurveTo(-h * 0.8, h * 0.1, 0, -h * 0.9); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,220,200,0.6)'; ctx.beginPath(); ctx.ellipse(-h * 0.2, h * 0.1, h * 0.12, h * 0.25, 0.3, 0, Math.PI * 2); ctx.fill(); }
    else if (id === 'awl') { ctx.rotate(0.7); ctx.fillStyle = '#6b4a2c'; ctx.fillRect(-h * 0.2, -h * 0.95, h * 0.4, h * 0.8); line('#b8b4ac', 0.14); ctx.beginPath(); ctx.moveTo(0, -h * 0.15); ctx.lineTo(0, h * 0.95); ctx.stroke(); }
    else if (id === 'mask') { ctx.fillStyle = PALETTE.bone; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.12; ctx.beginPath(); ctx.ellipse(0, h * 0.1, h * 0.6, h * 0.75, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); line(PALETTE.bone, 0.18); ctx.beginPath(); ctx.moveTo(-h * 0.4, -h * 0.45); ctx.quadraticCurveTo(-h * 0.95, -h * 0.8, -h * 0.7, -h * 1.05); ctx.moveTo(h * 0.4, -h * 0.45); ctx.quadraticCurveTo(h * 0.95, -h * 0.8, h * 0.7, -h * 1.05); ctx.stroke(); ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.ellipse(-h * 0.22, 0, h * 0.13, h * 0.18, 0, 0, Math.PI * 2); ctx.ellipse(h * 0.22, 0, h * 0.13, h * 0.18, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (id === 'effigy') { ctx.fillStyle = '#c9a24e'; ctx.strokeStyle = '#7a5a26'; ctx.lineWidth = h * 0.1; ctx.beginPath(); ctx.ellipse(-h * 0.1, 0, h * 0.65, h * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(h * 0.6, -h * 0.4, h * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); line('#6b4a2c', 0.12); for (const lx of [-0.5, -0.1, 0.3]) { ctx.beginPath(); ctx.moveTo(lx * h, h * 0.35); ctx.lineTo(lx * h, h * 0.85); ctx.stroke(); } }
    else if (id === 'spur') { ctx.fillStyle = '#c29a44'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.08; ctx.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, rr = k % 2 ? h * 0.4 : h * 0.9; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.arc(0, 0, h * 0.15, 0, Math.PI * 2); ctx.fill(); }
    else if (id === 'moth') { ctx.fillStyle = '#b8ad97'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.08; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * h * 0.45, -h * 0.2, h * 0.45, h * 0.35, sx * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(sx * h * 0.35, h * 0.35, h * 0.3, h * 0.25, -sx * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } ctx.fillStyle = '#5a5250'; ctx.fillRect(-h * 0.08, -h * 0.5, h * 0.16, h * 1.1); }
    else if (id === 'bell') { ctx.fillStyle = '#c29a44'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.1; ctx.beginPath(); ctx.moveTo(-h * 0.7, h * 0.55); ctx.quadraticCurveTo(-h * 0.55, -h * 0.85, 0, -h * 0.8); ctx.quadraticCurveTo(h * 0.55, -h * 0.85, h * 0.7, h * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.arc(0, h * 0.7, h * 0.15, 0, Math.PI * 2); ctx.fill(); }
    else if (id === 'sandal') { ctx.fillStyle = '#8a6238'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.1; ctx.beginPath(); ctx.ellipse(0, 0, h * 0.45, h * 0.95, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); line('#3b2a1a', 0.12); ctx.beginPath(); ctx.moveTo(-h * 0.45, -h * 0.3); ctx.lineTo(h * 0.45, -h * 0.1); ctx.moveTo(-h * 0.4, h * 0.25); ctx.lineTo(h * 0.45, h * 0.4); ctx.stroke(); }
    else if (id === 'scapegoat') { disc('#e8e0cc'); ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.arc(-h * 0.28, -h * 0.05, h * 0.16, 0, Math.PI * 2); ctx.arc(h * 0.28, -h * 0.05, h * 0.16, 0, Math.PI * 2); ctx.fill(); line('#e8e0cc', 0.16); ctx.beginPath(); ctx.moveTo(-h * 0.5, -h * 0.6); ctx.quadraticCurveTo(-h * 1.05, -h * 0.9, -h * 0.8, -h * 0.2); ctx.moveTo(h * 0.5, -h * 0.6); ctx.quadraticCurveTo(h * 1.05, -h * 0.9, h * 0.8, -h * 0.2); ctx.stroke(); }
    else if (id === 'tallow') { ctx.fillStyle = '#e8dcb0'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.1; ctx.fillRect(-h * 0.35, -h * 0.4, h * 0.7, h * 1.3); ctx.strokeRect(-h * 0.35, -h * 0.4, h * 0.7, h * 1.3); ctx.fillStyle = PALETTE.fire; ctx.beginPath(); ctx.moveTo(0, -h * 1.0); ctx.quadraticCurveTo(h * 0.25, -h * 0.6, 0, -h * 0.45); ctx.quadraticCurveTo(-h * 0.25, -h * 0.6, 0, -h * 1.0); ctx.fill(); }
    else if (id === 'mirror') { ctx.fillStyle = '#bfe6ff'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.1; ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(h * 0.6, 0); ctx.lineTo(0, h); ctx.lineTo(-h * 0.6, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); line('rgba(255,255,255,0.85)', 0.1); ctx.beginPath(); ctx.moveTo(-h * 0.2, -h * 0.4); ctx.lineTo(h * 0.15, -h * 0.05); ctx.stroke(); }
    else if (id === 'cup') { ctx.fillStyle = '#8d8a85'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.1; ctx.beginPath(); ctx.moveTo(-h * 0.7, -h * 0.6); ctx.lineTo(h * 0.7, -h * 0.6); ctx.quadraticCurveTo(h * 0.6, h * 0.3, 0, h * 0.35); ctx.quadraticCurveTo(-h * 0.6, h * 0.3, -h * 0.7, -h * 0.6); ctx.fill(); ctx.stroke(); ctx.fillStyle = PALETTE.blood; ctx.beginPath(); ctx.ellipse(0, -h * 0.55, h * 0.6, h * 0.15, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#8d8a85'; ctx.fillRect(-h * 0.1, h * 0.35, h * 0.2, h * 0.4); ctx.fillRect(-h * 0.4, h * 0.72, h * 0.8, h * 0.18); }
    else if (id === 'tally') { ctx.rotate(-0.3); ctx.fillStyle = '#a57949'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.08; ctx.fillRect(-h * 0.2, -h, h * 0.4, h * 2); ctx.strokeRect(-h * 0.2, -h, h * 0.4, h * 2); line('#3b2a1a', 0.1); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-h * 0.2, -h * 0.7 + k * h * 0.4); ctx.lineTo(h * 0.1, -h * 0.7 + k * h * 0.4); ctx.stroke(); } }
    else return false;
    return true;
  },
};
