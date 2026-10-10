// The talismans the mouse gives (ARTIFACTS_TZ.md), and the straw goat of the SCARECROW'S CAPE (a Q
// talisman until 6 Oct 2026, a cape now: js/capes.js). FIRE AMULET and LUCKY CLOVER keep their own homes (gen.js);
// everything the seventeen later ones do lives here, and the rest of the game only calls in at a
// handful of hooks, the same shape `Status` has for poison. Every number is on the talisman's
// tier in `ARTIFACTS` (js/tuning.js) and reaches here through `game.mods.<id>`, never a literal.
//
// State that belongs to one level (rooms entered, echoes waiting, bodies,
// the effigy) is on `game.tal`, rebuilt when `game.level` changes. State the goat carries between
// levels (the tallow's charge, the cup) is on `game.talRun`, forgotten when a run starts over.
const Talisman = {
  // ---- bookkeeping ----
  st(game) {
    if (!game.tal || game.tal.level !== game.level) {
      game.tal = { level: game.level, visited: new Set([game.goatRoom || 0]), room: game.goatRoom || 0,
        echoes: [], effigy: null, pulse: 0, cupHearts: 0, orbit: [], magnetRooms: new Set(), spin: 0 };
      const R = Talisman.run(game), cup = game.mods.cup;
      if (!(cup && cup.carry)) R.cup = 0;
      R.tallow = true;   // SNAKE SKIN: a new floor, a new skin (8 Oct 2026)
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
    g.stillT = hyp(g.vx, g.vy) < 20 ? (g.stillT || 0) + dt : 0;
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (e.panicCd > 0) e.panicCd -= dt;
      if (e.decoyT > 0) e.decoyT -= dt;
    }
    if (S.echoes.length) Talisman.updateEchoes(game, dt);
    Talisman.updateCorpses(game, dt);
    if (S.effigy) Talisman.updateEffigy(game, dt);
    if (m.magnet || S.orbit.length) Talisman.updateMagnet(game, dt);
    // MASON'S MARK II: a crate or a rack is stone to a body arriving fast enough.
    if (m.mason && m.mason.props) {
      const lim = TUNING.physics.splatSpeed * m.mason.splat;
      for (const e of game.enemies) {
        if (e.dead || e.state !== 'flung' || hyp(e.vx, e.vy) < lim) continue;
        for (const p of game.props) {
          if (p.broken || p.held || p.corpse || !(p.kind === 'crate' || (p.kind === 'weapon' && p.inStand))) continue;
          if (hyp(p.x - e.x, p.y - e.y) > p.r + e.r) continue;
          const l = hyp(e.vx, e.vy);
          if (p.kind === 'crate') p.shatter(game);
          Talisman.chips(game, e.x, e.y);
          e.die(game, 'splat', e.vx / l, e.vy / l, p.kind); break;
        }
      }
    }
    // THE NOSEBAG: hurt and standing still, he eats out of the bag (`bagGraze` filled it).
    if (m.nosebag && R.bag > 0) Talisman.updateBag(game, dt, m.nosebag, R); else S.bagT = 0;
    // BLOOD CUP: a full cup waits for a heart to be missing.
    const cup = m.cup;
    if (cup && R.cup >= cup.need && g.hp < g.maxHp && !g.dead && S.cupHearts < cup.max) {
      R.cup -= cup.need; S.cupHearts++; g.hp++;
      game.floatText(g.x, g.y - 34, '+1 HEART', PALETTE.blood); game.audio.sfxBell && game.audio.sfxBell();
      game.particles(g.x, g.y, 12, PALETTE.blood, 140);
    }
  },

  // THE NOSEBAG, filling: asked by the milk loop (`Game.update`) for a tuft the goat stands in with every
  // heart full. Grazed the usual time, it goes in the bag (big grass as two) instead of saying FULL. Not
  // the mouse's pail (milk), not with the bag full. Returns whether the bag took this frame's graze.
  bagGraze(game, p, near, dt) {
    const nb = game.mods.nosebag, R = Talisman.run(game), H = TUNING.prop.heal;
    if (!nb || p.pail > 0 || (R.bag || 0) >= nb.hold) return false;
    if (near) game.goat.grazeAt = game.timer;
    p.graze = near ? p.graze + dt : Math.max(0, p.graze - dt * 2);
    if (p.graze < H.grazeTime * game.mods.grazeMul) return true;
    // big grass with room for only one of its two hearts stays on the floor, whole, for later
    if (p.big && nb.hold - (R.bag || 0) < H.bigGain) { p.graze = 0; return false; }
    const n = Math.min(nb.hold - (R.bag || 0), p.big ? H.bigGain : 1);
    R.bag = (R.bag || 0) + n; p.broken = true; p.dead = true;
    game.particles(p.x, p.y, 14, PALETTE.hay, 150);
    game.floatText(p.x, p.y - 24, n > 1 ? `${n} IN THE BAG` : 'IN THE BAG', PALETTE.bone);
    game.audio.sfxClatter('soft', 0.8); game.vibe(12);
    return true;
  },
  // THE NOSEBAG, eaten from: the graze verb anywhere, standing still and hurt with nothing in his teeth
  // (never while the floor's own grass is under him, which is grazed first) for `chew` of a graze.
  updateBag(game, dt, nb, R) {
    const g = game.goat, S = Talisman.st(game), H = TUNING.prop.heal;
    const onGrass = game.props.some((p) => p.kind === 'heal' && !p.broken && hyp(p.x - g.x, p.y - g.y) <= H.pickupR + g.r);
    const still = !g.dead && g.hp < g.maxHp && g.state === 'idle' && !g.holding && !onGrass && hyp(g.vx, g.vy) < H.grazeSpeed;
    S.bagT = still ? (S.bagT || 0) + dt : Math.max(0, (S.bagT || 0) - dt * 2);
    if (still) g.grazeAt = game.timer;   // his head goes down into it (`PaintedArt.drawGoat`)
    if (S.bagT < H.grazeTime * nb.chew * game.mods.grazeMul) return;
    S.bagT = 0; R.bag--;
    const gain = 1 + (game.mods.grassGain || 0);
    g.hp = Math.min(g.maxHp, g.hp + gain);
    game.particles(g.x, g.y, 12, PALETTE.hay, 140); game.ring(g.x, g.y, 1.4 * TILE, PALETTE.bone);
    game.floatText(g.x, g.y - 34, gain > 1 ? `+${gain} HEARTS` : '+1 HEART', PALETTE.bone); game.audio.sfxBell(); game.vibe(20);
  },

  newRoom(game, idx, prev) {
    const m = game.mods, g = game.goat, R = Talisman.run(game);
    // SNAKE SKIN grows back on a new floor (`st`); a tallow with `rooms` (an old tuning) still grows back a room at a time.
    if (m.tallow && m.tallow.rooms && !R.tallow) {
      R.tallowCount++;
      if (R.tallowCount >= m.tallow.rooms) { R.tallow = true; R.tallowCount = 0; game.floatText(g.x, g.y - 34, 'THE TALLOW SETS', PALETTE.bone); }
    }
    // PILGRIM'S SANDAL: into a new room with somebody on your heels.
    const sd = m.sandal;
    if (sd) {
      const behind = game.enemies.filter((e) => !e.dead && !e.held && !e.ghosted && e.aware && e.state !== 'hidden'
        && hyp(e.x - g.x, e.y - g.y) < sd.range * TILE && (() => { const r = roomAt(game.level, e.x, e.y); return !r || r.index !== idx; })());
      if (behind.length) {
        g.sandalT = sd.time;
        if (sd.reset) { g.rollCd = 0; g.screamCd = 0; }
        game.dust(g.x, g.y, 6, 0, 0); game.ring(g.x, g.y, 1.2 * TILE, PALETTE.fireHi, 0.35, 2);
        // Shaken off means a man on your heels loses the scent, never one in flight, down, mid-leap
        // or mid-blow: resetting those stopped a thrown body short of its wall and an ogre over a drop.
        const heels = sd.shake ? behind.filter((e) => (e.state === 'chase' || e.state === 'investigate') && !Talisman.decoyProof(e)) : [];
        if (heels.length) {
          for (const e of heels) { e.aware = false; e.target = { x: g.x, y: g.y }; e.state = 'investigate'; e.lostTimer = 0; e.decoyT = 1.2; }
          game.floatText(heels[0].x, heels[0].y - 30, 'SHAKEN OFF', PALETTE.bone);
        }
      }
    }
  },

  // ---- the goat's side ----
  runUpTime(game) { return game.mods.spur ? game.mods.spur.time : 1; },
  // PILGRIM'S SANDAL's speed while it lasts, and SPRINTER'S SPUR's top: the run-up's share of its full height is that share of `top` more.
  speedMul(game) {
    const g = game.goat, sd = game.mods.sandal, sp = game.mods.spur;
    let k = sd && g.sandalT > 0 ? 1 + sd.speed : 1;
    if (sp && sp.top) k *= 1 + sp.top * clamp((g.runUp - 1) / TUNING.goat.momentum.max, 0, 1);
    return k;
  },
  // Every wait (roll, grab, voice, the cape) ticking faster for `sandal.time` s after a new room with men on his heels.
  cdMul(game, g) { const sd = game.mods.sandal; return sd && sd.cd > 1 && g.sandalT > 0 ? sd.cd : 1; },
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
        if (hyp(e.x - g.x, e.y - g.y) < mo.near * TILE) return 0;
      }
    }
    return mo.step;
  },
  onButtStart(game, g) { if (game.mods.mirror) g.parryT = game.mods.mirror.window; },
  onLunge(game, g) {
    const E = game.mods.echo; if (!E) return;
    const S = Talisman.st(game), a = Math.atan2(g.aim.y, g.aim.x);
    // BULL NECK: the ghost carries the run the real head went down with (`buttRun`, read at the
    // windup), so the echo of a charging blow is a charging blow too.
    const steam = game.mods.runButt ? 1 + game.mods.runButt * (g.buttRun || 0) : 1;
    for (let k = 0; k < E.count; k++) {
      const turn = k === 0 ? 0 : (Math.random() < 0.5 ? -1 : 1) * E.spread;
      S.echoes.push({ x: g.x, y: g.y, a: a + turn, t: E.delay * (k + 1), lunge: g.lungeId, show: 0, steam });
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
            if (o === e || o.dead || o.ghosted || hyp(o.x - e.x, o.y - e.y) > T.r * TILE + o.r) continue;
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
    game.floatText(g.x, g.y - 30, 'THE SKIN TEARS', PALETTE.bone);
    game.particles(g.x, g.y, 14, '#e8dcb0', 160); game.audio.sfxThud(); game.shake(4); game.hitstop(0.04);
    return true;
  },
  // SCAPEGOAT: somebody else dies. Spent on use, the slot empties and the level's snapshot of it
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
      if (e.dead || e.ghosted || hyp(e.x - g.x, e.y - g.y) > sg.r * TILE) continue;
      e.daze(game, sg.stun);
    }
    // Only this talisman comes off; the others stay at his neck. It goes from the floor's snapshot too
    // (a restart would hand it straight back), and from the middle gate's (`holdGate`).
    const off = (list) => (list || []).filter((a) => a.id !== 'scapegoat');
    game.artifacts = off(game.artifacts);
    if (game.levelArtifacts) game.levelArtifacts = off(game.levelArtifacts);
    const cp = game.checkpoint;
    if (cp && cp.artifacts) cp.artifacts = off(cp.artifacts);
    game.applyBoons(); game.saveRun();
    return true;
  },
  onSoul(game) {
    const T = game.mods.tallow, R = Talisman.run(game);
    if (T && T.soul && !R.tallow) { R.tallow = true; R.tallowCount = 0; game.floatText(game.goat.x, game.goat.y - 44, 'THE TALLOW SETS', PALETTE.bone); }
  },

  // ---- MIRROR SHARD: the parry window ----
  // `kind`: 'bullet' and 'bite' at every tier, 'melee' from II, 'heavy' (the ogre's and the rat
  // ogre's blows, a slam; `parry` below decides) at III. Returns true when the blow went back where it came from.
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
    const heavy = att.kind === 'butcher' || att.kind === 'ratogre' || kind === 'slam';
    if (!Talisman.canParry(game, heavy ? 'heavy' : kind)) return false;
    const g = game.goat, dx = att.x - g.x, dy = att.y - g.y, l = hyp(dx, dy) || 1;
    Talisman.parryFx(game, att.x, att.y);
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
    if (hyp(mage.x - g.x, mage.y - g.y) > M.runeR * TILE) return;
    if (hyp(mage.rune.x - g.x, mage.rune.y - g.y) > TUNING.seer.runeRadius * TILE + g.r) return;
    mage.rune = { x: mage.x, y: mage.y };
    Talisman.parryFx(game, mage.x, mage.y);
  },

  // ---- THE MAGNET ----
  // What it carries is taken out of `game.props` for as long as it circles, no collision, no physics,
  // nothing else can pick it up, and drawn in the cast beside him (`Renderer`, `orbiters`).
  orbiters(game) { const S = game.tal; return S && S.level === game.level && S.orbit ? S.orbit : []; },
  updateMagnet(game, dt) {
    const S = Talisman.st(game), M = game.mods.magnet, g = game.goat, C = TUNING.magnet, orb = S.orbit;
    // The talisman gone (swapped at the mouse, SCAPEGOAT), the pull lets go: what it held falls and breaks,
    // rather than circling and taking blows for the rest of the floor.
    if (!M) { for (const o of orb.slice()) Talisman.breakOrbit(game, o, o.p.x, o.p.y); return; }
    S.spin += dt * C.spin;
    orb.forEach((o, i) => {
      const a = S.spin + i / orb.length * Math.PI * 2;
      o.t = Math.min(1, o.t + dt / C.pull);
      const k = o.t * o.t * (3 - 2 * o.t);
      o.p.x = lerp(o.fx, g.x + Math.cos(a) * C.orbitR, k); o.p.y = lerp(o.fy, g.y + Math.sin(a) * C.orbitR, k);
      o.p.bob = (o.p.bob || 0) + dt;
    });
    // A sword going round him cuts whoever it passes through (9 Oct 2026 playtest: "if the circling sword hits an enemy,
    // it damages him"), as a thrown one does (`Prop.hitMan`): a man once every `cutCd` s, a use spent each time, the
    // last breaking it. A board in front of it takes the cut instead.
    for (const o of orb.slice()) {
      const p = o.p; if (o.t < 1 || p.weapon !== 'sword' || g.dead) continue;
      o.cut = o.cut || new Map();
      for (const e of game.liveEnemies || game.enemies) {
        if (e.dead || e.held || e.ghosted || e.state === 'hidden' || e.scripted) continue;
        if (hyp(e.x - p.x, e.y - p.y) > e.r + C.cutR || game.timer - (o.cut.get(e) ?? -99) < C.cutCd) continue;
        o.cut.set(e, game.timer);
        const d = hyp(e.x - g.x, e.y - g.y) || 1, nx = (e.x - g.x) / d, ny = (e.y - g.y) / d;
        if (e.shield && e.shieldCovers(p.x, p.y)) e.shieldTakes(game, nx, ny);
        else { e.die(game, 'splat', nx, ny, 'sword'); game.gore(e.x, e.y, 5, nx, ny); game.audio.sfxSplat(); game.hitstop(0.04); game.kick(nx, ny, TUNING.juice.kick); }
        game.audio.sfxSteel();
        if (--p.uses <= 0) { Talisman.breakOrbit(game, o, e.x, e.y); break; }
      }
    }
    if (!M || g.dead || orb.length >= M.count || !game.level) return;
    // Once a room: the first time he stands in it with a free place in the orbit and something to take.
    const room = roomAt(game.level, g.x, g.y);
    if (!room || S.magnetRooms.has(room.index)) return;
    const ok = (p) => !p.broken && !p.held && !p.flung && !p.thrown && !p.corpse && !p.alight
      && (p.kind === 'weapon' || (M.any && p.kind === 'crate'))
      && hyp(p.x - g.x, p.y - g.y) < M.reach * TILE && roomAt(game.level, p.x, p.y) === room && game.world.los(g.x, g.y, p.x, p.y);
    const near = game.props.filter(ok).sort((a, b) => hyp(a.x - g.x, a.y - g.y) - hyp(b.x - g.x, b.y - g.y));
    if (!near.length) return;
    S.magnetRooms.add(room.index);
    for (const p of near.slice(0, M.count - orb.length)) {
      if (p.inStand) { p.inStand = false; game.world.dot(p.x - 4, p.y + 7, 4.5, '#3a2c20'); game.world.dot(p.x + 5, p.y + 9, 3.5, '#3a2c20'); }
      const i = game.props.indexOf(p); if (i >= 0) game.props.splice(i, 1);
      p.orbiting = true; p.vx = 0; p.vy = 0;
      orb.push({ p, fx: p.x, fy: p.y, t: 0 });
      game.particles(p.x, p.y, 8, '#c0392b', 120);
    }
    game.audio.sfxSteel(); game.vibe(10);
  },
  // The thing nearest the blow takes it and breaks. Asked by `meleeHit` (clubs, blades, bites).
  magnetBlock(game, att) {
    const orb = Talisman.orbiters(game).filter((o) => o.t >= 1);
    if (!orb.length || game.goat.dead || Talisman.unhurt(game)) return false;
    const o = orb.sort((a, b) => hyp(a.p.x - att.x, a.p.y - att.y) - hyp(b.p.x - att.x, b.p.y - att.y))[0];
    Talisman.breakOrbit(game, o, att.x, att.y);
    if (att.daze && att.kind !== 'ratogre') att.daze(game, TUNING.magnet.daze);
    return true;
  },
  // A round meeting one on its way round him, Enter the Gungeon's way: it has to be in the line of it.
  // A blow that could not have cost him a heart (mercy frames, a roll, GOD) spends nothing in the orbit.
  unhurt(game) { return game.goat.invuln > 0 || !!(game.dev && game.dev.god); },
  magnetBullet(game, b) {
    const C = TUNING.magnet;
    if (Talisman.unhurt(game)) return false;
    for (const o of Talisman.orbiters(game)) {
      if (o.t < 1 || hyp(o.p.x - b.x, o.p.y - b.y) > C.hitR) continue;
      Talisman.breakOrbit(game, o, b.x, b.y);
      return true;
    }
    return false;
  },
  breakOrbit(game, o, x, y) {
    const S = Talisman.st(game), p = o.p, i = S.orbit.indexOf(o);
    if (i >= 0) S.orbit.splice(i, 1);
    p.broken = true; p.dead = true; p.orbiting = false;
    const wood = p.kind === 'crate';
    // A blade or a shield comes apart away from what it stopped (`Scatter.breakUp`).
    if (!wood && game.scatter) game.scatter.breakUp(Scatter.piecesOf(p), p.x, p.y, 12, p.x - x, p.y - y, 0.8);
    game.particles(p.x, p.y, 14, wood ? '#8a6238' : p.weapon === 'sword' ? PALETTE.bone : PALETTE.ash, 220);
    game.particles((p.x + x) / 2, (p.y + y) / 2, 6, '#c0392b', 160);
    for (let k = 0; k < 3; k++) game.world.dot(p.x + (Math.random() - 0.5) * 22, p.y + (Math.random() - 0.5) * 14, 2.4, wood ? '#4a3626' : '#3a3630');
    if (wood) game.audio.sfxCrack(); else game.audio.sfxSteel();
    game.hitstop(0.04); game.shake(3); game.vibe(16);
  },
  // In the cast with him, off the floor by `lift`; its shadow on the floor where it is; while it is
  // still coming, a dotted pull from it to him in the magnet's red.
  drawOrbiter(r, game, p) {
    const ctx = r.ctx, C = TUNING.magnet, o = Talisman.orbiters(game).find((q) => q.p === p);
    const lift = C.lift * (o ? o.t : 1) + Math.round(Math.sin((p.bob || 0) * 5) * 1.5);
    r.shadow(p.x, p.y + 4, 9, 4);
    if (o && o.t < 1) {
      const g = game.goat, n = 6;
      ctx.fillStyle = 'rgba(192,57,43,0.7)';
      for (let k = 1; k < n; k++) ctx.fillRect(Math.round(lerp(p.x, g.x, k / n)) - 1, Math.round(lerp(p.y - lift, g.y - 10, k / n)) - 1, 3, 3);
    }
    ctx.save(); ctx.translate(0, -lift);
    r.drawProp(p);
    ctx.restore();
  },

  // ---- the geometry ----
  splatMul(game) { return game.mods.mason ? game.mods.mason.splat : 1; },
  bodyMul(game) { const M = game.mods.mason; return M && M.bodies ? M.splat : 1; },
  chips(game, x, y) { game.particles(x, y, 6, PALETTE.ash, 150); },
  // DOMINO BONE: a body below killing speed hands the throw on instead of simply bowling a man over.
  domino(game, f, o) {
    const D = game.mods.domino; if (!D || Talisman.heavy(o) || o.kind === 'butcher') return false;
    const chain = (f.chain || 0) + 1, spd = hyp(f.vx, f.vy);
    if (chain > D.links || spd * D.keep < TUNING.physics.flungFloorSpeed) return false;
    o.fling(f.vx * D.keep, f.vy * D.keep, false); o.chain = chain;
    f.vx *= 0.15; f.vy *= 0.15;
    game.ring((f.x + o.x) / 2, (f.y + o.y) / 2, 0.4 * TILE, PALETTE.bone, 0.25, 2);
    game.particles((f.x + o.x) / 2, (f.y + o.y) / 2, 3, PALETTE.fireHi, 160); game.audio.sfxThud();
    return true;
  },
  // ---- a kill ----
  onKill(game, e, cause) {
    const m = game.mods, S = Talisman.st(game), R = Talisman.run(game);
    // BLOOD CUP: every man killed, by anything (8 Oct 2026: it was only the room's kills); the cult's chasers pay nothing.
    if (m.cup && !e.chaser) R.cup = Math.min(R.cup + 1, m.cup.need);
    // HORNED MASK: whoever watched it runs.
    const MK = m.mask;
    if (MK) for (const o of game.enemies) {
      if (o === e || o.dead || o.held || o.ghosted || o.kind === 'wraith' || Talisman.heavy(o) || o.kind === 'butcher') continue;
      if (o.panicCd > 0 || hyp(o.x - e.x, o.y - e.y) > MK.r * TILE || !game.world.los(o.x, o.y, e.x, e.y)) continue;
      if (o.state === 'flung' || o.state === 'floored' || o.state === 'stunned' || o.state === 'burning') continue;
      const busy = o.state === 'windup' || o.state === 'swing' || o.state === 'aim' || o.state === 'cast' || o.state === 'slamwind' || o.state === 'dart' || o.state === 'hookwind';
      if (busy && !MK.drop) continue;
      if (busy && o.kind === 'hunter') o.reload = o.cfg.reload * m.enemySlow;
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
      p.corpse = true; p.noGrab = true; p.r = SP.r; p.life = SP.life; p.sprite = game.fx.snapshot(e);
      p.angle = (e.facing || 0) + Math.PI / 2; p.fromKind = e.kind;
      // The blow that killed him is not a blow on his body (9 Oct 2026 playtest: "the spade does not work"): the prop pass of
      // the very headbutt that did it found the new crate in front of him, sent it down the wall at the blow's speed and broke it.
      p.lastLunge = game.goat.lungeId;
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
      p.noGrab = true;   // kicked by a headbutt (flung like a crate), never lifted (10 Oct 2026)
      if (!p.held && !p.flung) { p.life -= dt; if (p.life <= 0) { Talisman.corpseGone(game, p); continue; } }
      if (p.held || p.flung) continue;
      for (const e of game.enemies) {
        if (e.dead || e.ghosted || e.held || e.tripOn === p || Talisman.heavy(e) || e.kind === 'butcher') continue;
        if (e.state !== 'chase' && e.state !== 'investigate' && e.state !== 'flee') continue;
        if (hyp(e.vx, e.vy) < e.speed * 0.5 || hyp(e.x - p.x, e.y - p.y) > p.r + e.r * 0.6) continue;
        e.tripOn = p; e.state = 'floored'; e.timer = SP ? SP.trip : 0.6; e.aware = true;
        game.floatText(e.x, e.y - 26, 'TRIPPED', PALETTE.bone); game.audio.sfxThud();
      }
    }
  },
  // A thrown body into a man: at III, at killing speed, it kills him like a live one would.
  corpseHit(game, p, e, spd) {
    const SP = game.mods.spade;
    if (!SP || !SP.lethal || spd < TUNING.physics.bodyKillSpeed || e.kind === 'wraith') return false;
    const l = spd || 1; e.die(game, 'splat', p.vx / l, p.vy / l, 'corpse');
    return true;
  },
  // A body done with: it goes back to being a stain on the floor.
  corpseGone(game, p) {
    if (p.broken) return;
    p.broken = true; p.dead = true;
    if (game.goat.holding === p) { game.goat.holding = null; game.goat.autoHeld = false; game.goat.spendGrab(game, false); }
    // One the thrower took off the floor (`Thrower.bodyProp`) goes back to being the body it was: down on
    // the floor again, tumbling onto its side (`CombatFX` ground), no second pool.
    if (p.lit) { CombatFX.release(p.lit); p.lit = null; }
    if (p.fromGround && p.sprite && game.fx && game.fx.fragment) {
      const side = Math.random() < 0.5 ? -1 : 1, sp = hyp(p.vx, p.vy) || 1, k = Math.min(1, 160 / sp);
      game.fx.fragment(p.x, p.y, p.sprite, p.crop || [0, 0, 96, 96], p.bodyW || 96, p.bodyH || 96, 0, 0, p.char || p.alight ? 'char' : 'body',
        { vx: p.vx * k, vy: p.vy * k, vz: 70, z: 6, spin: 2.5 * side, angle: p.angle || 0, shade: p.shade, rest: side * Math.PI / 2, pool: 0, seed: (Math.random() * 1e6) | 0, key: p.key });
      game.audio.sfxThud();
      return;
    }
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
      const ax = Math.cos(ec.a), ay = Math.sin(ec.a), imp = hb.impulse * game.mods.headbuttImpulse * E.power * (ec.steam || 1);
      game.particles(ec.x + ax * 16, ec.y + ay * 16, 5, PALETTE.bone, 140);
      for (const e of game.enemies) {
        if (e.dead || e.held || e.ghosted || e.state === 'flung') continue;
        const dx = e.x - ec.x, dy = e.y - ec.y, d = hyp(dx, dy);
        // `reach` is the lunge the ghost does not make: it stands where the blow landed and reaches past it.
        if (d > g.r + e.r + 10 + extra + E.reach * TILE || (dx * ax + dy * ay) / (d || 1) < 0.15) continue;
        if (!game.reaches(ec.x, ec.y, e.x, e.y)) continue;
        if (e.tryDodge && e.tryDodge(game, ax, ay)) continue;
        if (e.kind === 'butcher' || e.kind === 'ratogre') { if (e.state !== 'hop') { e.state = 'stagger'; e.timer = 0.3; } continue; }
        // The ghost meets a shieldman's board as the real horns do (`Enemy.shieldTakes`).
        if (e.shield && e.shieldCovers(ec.x, ec.y)) { e.shieldTakes(game, ax, ay); continue; }
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
    // Nor through a shut door: pressed against a soul gate or a seal it stood on the far side.
    if (w.isSolid(Math.floor(x / TILE), Math.floor(y / TILE)) || w.isPitPx(x, y) || !game.reaches(g.x, g.y, x, y)) { x = g.x; y = g.y; }
    S.effigy ={ x, y, t: F.life, max: F.life, r: 11 };
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
        if (hyp(e.x - f.x, e.y - f.y) > F.r * TILE || !w.los(e.x, e.y, f.x, f.y)) continue;
        e.decoyT = 0.7; e.target = { x: f.x, y: f.y };
        if (e.kind !== 'hunter' || !F.shots) { e.aware = false; e.state = 'investigate'; }
      }
    }
    for (const e of game.enemies) {
      if (e.dead || !(e.decoyT > 0)) continue;
      const d = hyp(e.x - f.x, e.y - f.y);
      // A rifle puts a round in it. The round goes where rounds go.
      if (e.kind === 'hunter' && F.shots) {
        e.vx = 0; e.vy = 0; e.facing = Math.atan2(f.y - e.y, f.x - e.x);
        if (e.reload <= 0 && d < e.cfg.sight * TILE && w.los(e.x, e.y, f.x, f.y)) {
          game.fireBullet(e, (f.x - e.x) / (d || 1), (f.y - e.y) / (d || 1)); e.reload = e.cfg.reload * game.mods.enemySlow;
        }
        continue;
      }
      if (e.state === 'investigate' && d < (e.cfg.reach || 0.8 * TILE) + e.r + f.r) {
        e.state = 'decoyhit'; e.timer = e.cfg.windup || 0.5; e.vx = 0; e.vy = 0;
      }
    }
    for (const b of game.bullets) {
      if (b.dead || hyp(b.x - f.x, b.y - f.y) > f.r + 3) continue;
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
      if (f && hyp(f.x - e.x, f.y - e.y) < (e.cfg.reach || 0.8 * TILE) + e.r + f.r + 8) {
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
  // Under everything that stands: the effigy, echoes of the horns.
  drawGround(r, game) {
    const S = game.tal; if (!S || S.level !== game.level) return;   // last floor's, until `st` rebuilds it in play
    const ctx = r.ctx;
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
    // A body the thrower took off the floor (`Thrower.bodyProp`): its own canvas whole, already the dead's
    // colours, pixels square; on the floor it lies in the world's squash as `CombatFX.drawPiece` lays it,
    // over his head or in the air it is counter-squashed upright, as a man standing is.
    if (p.fromGround && p.sprite) {
      const up = p.held || p.flung, c = p.crop || [0, 0, 96, 96], w = p.bodyW || 96, h = p.bodyH || 96;
      if (!up) r.shadow(p.x, p.y + 2, 14, 5); else if (p.flung) r.shadow(p.x, p.y + 6, 12, 4);
      ctx.translate(p.x, p.y);
      if (up) ctx.scale(1, 1 / TILT);
      if (p.held) ctx.translate(0, -10);   // lying on the fist over his skull, not through his head
      ctx.rotate(p.angle || 0); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(up && p.lit ? p.lit : p.sprite, c[0], c[1], c[2], c[3], -w / 2, -h / 2, w, h);
      ctx.restore(); return;
    }
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
  // Over the shade: the panic over the runners' heads.
  drawWorld(r, game) {
    const ctx = r.ctx;
    for (const e of game.enemies) {
      if (e.dead || e.state !== 'flee' || game.hidden(e.x, e.y)) continue;
      ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 1 / TILT);
      ctx.fillStyle = PALETTE.bone; ctx.font = `700 16px ${FONT_SC}`; ctx.textAlign = 'center';
      ctx.fillText('!', 0, -e.r * 2.6); ctx.restore();
    }
  },
  // Screen space, under a talisman's chip: the crust, the cup, the notches, the bone's and the bag's
  // pips. `id` is the chip's talisman: each draws under its
  // own chip (up to three side by side), so only that one's mods are read here.
  drawHud(r, game, x, y, box, id) {
    const ctx = r.ctx, s = r.hs, R = Talisman.run(game);
    const bx = x, by = y + box + 14 * s;
    const m = { [id]: game.mods[id], thirdEvery: id === 'knuckle' ? game.mods.thirdEvery : 0 };
    if (m.tallow) {
      // one pip: the skin is on, or torn off for this floor
      ctx.fillStyle = R.tallow ? '#b6c78a' : 'rgba(239,230,208,0.18)';
      ctx.fillRect(bx, by, 4 * s, 4 * s);
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
    // THE KNUCKLEBONE: a pip for each soul counted toward the next third card.
    if (id === 'knuckle' && m.thirdEvery > 1) {
      const n = m.thirdEvery - 1;
      for (let k = 0; k < n; k++) {
        ctx.fillStyle = k < (R.third || 0) ? PALETTE.witchHi : 'rgba(239,230,208,0.2)';
        ctx.fillRect(bx + k * 6 * s, by, 4 * s, 4 * s);
      }
    }
    // THE NOSEBAG: a green pip for each tuft in the bag, an empty one for each it still has room for.
    if (m.nosebag) {
      for (let k = 0; k < m.nosebag.hold; k++) {
        ctx.fillStyle = k < (R.bag || 0) ? '#9fd84a' : 'rgba(239,230,208,0.2)';
        ctx.fillRect(bx + k * 6 * s, by, 4 * s, 4 * s);
      }
    }
  },
  // ---- the TALISMANS tab of the level tool ----
  // Every entry in `ARTIFACTS` as a row: its drawing, its name and sort, which tier (if any) is at
  // his neck with buttons to put one on, and the three tiers side by side, each its line and its
  // params as chips. A chip is the same editor the BOONS tab uses: a number opens a prompt, a
  // yes/no flips, and both are written back into tuning.js through `persistTuningEdit`.
  drawToolTab(r, game, pad, top) {
    const ctx = r.ctx, s = r.ts, d = game.dev, W = r.w, H = r.h;
    ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre; ctx.textAlign = 'left';
    ctx.fillText('THE TALISMANS', pad, top);
    ctx.font = `400 ${8.5 * s}px ${FONT}`; ctx.fillStyle = PALETTE.ash;
    ctx.fillText(`${ARTIFACTS.length} on the mouse's shelves, up to ${TUNING.talisman.slots} worn · WEAR puts one at his neck · click a number to change it · click the rarity to step COMMON, RARE, EPIC · click the shelf line to rewrite it · the ${CAPES.length} capes below`, pad + 120 * s, top);
    // One long page that scrolls on the wheel (`drawTool`'s `dev.scroll`), not pages (2 Oct 2026).
    const rowH = 96 * s, listTop = top + 22 * s;
    const leftW = 200 * s, colW = W - pad * 2 - leftW;   // one form each (8 Oct 2026), so one column
    ctx.font = `700 ${7.5 * s}px ${FONT_SC}`; ctx.fillStyle = 'rgba(239,230,208,0.5)';
    ctx.fillText('WHAT IT SAYS ON THE SHELF · WHAT IT DOES IN FULL · ITS NUMBERS', pad + leftW, listTop - 4 * s);
    ARTIFACTS.forEach((a, i) => {
      const y = listTop + i * rowH;
      if (i % 2) { ctx.fillStyle = 'rgba(239,230,208,0.03)'; ctx.fillRect(pad - 4 * s, y, W - pad * 2 + 8 * s, rowH); }
      const art = Shop.worn(game, a.id), worn = !!art;
      r.artifactIcon(a.id, pad + 16 * s, y + 20 * s, 12 * s, 1);
      ctx.textAlign = 'left'; ctx.font = `700 ${9.5 * s}px ${FONT_SC}`; ctx.fillStyle = worn ? PALETTE.fireHi : PALETTE.bone;
      ctx.fillText(a.name, pad + 36 * s, y + 14 * s);
      ctx.font = `400 ${7.5 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.45)';
      ctx.fillText(`${a.id} · ${a.tag || 'no sort'}`, pad + 36 * s, y + 26 * s);
      r.devButton(d, pad + 36 * s, y + 34 * s, 46 * s, 16 * s, worn ? 'WORN' : 'WEAR', `tal-wear=${a.id}.1`, worn);
      if (worn) r.devButton(d, pad + 36 * s + 50 * s, y + 34 * s, 34 * s, 16 * s, 'OFF', `tal-off=${a.id}`, false);
      r.devButton(d, pad + 36 * s, y + 54 * s, 70 * s, 16 * s, rarityOfArt(a.id).name, `tal-rarity=${a.id}`, false);
      a.tiers.forEach((tier, ti) => {
        const cx = pad + leftW + ti * colW, cw = colW - 10 * s;
        // The player's line (`desc`: the talisman's hand-written `text`, else `tell`), what the shelf
        // and the chip say, and a click rewrites it for all three tiers, then the tier in full
        // numbers (`say`, as `detail`), stated whole, not as a diff on the one before.
        ctx.font = `400 ${8.5 * s}px ${FONT}`; ctx.fillStyle = a.text ? PALETTE.fireHi : PALETTE.bone;
        r.wrap(tier.desc, cw).slice(0, 2).forEach((l, li) => ctx.fillText(l, cx, y + 12 * s + li * 10 * s));
        d.rects.push({ x: cx, y: y + 2 * s, w: cw, h: 22 * s, id: `tal-text=${a.id}` });
        ctx.font = `400 ${7.5 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.5)';
        r.wrap(tier.detail, cw).slice(0, 3).forEach((l, li) => ctx.fillText(l, cx, y + 34 * s + li * 9 * s));
        let px = cx, py = y + 58 * s;
        for (const key of Object.keys(tier.params || {})) {
          const val = tier.params[key];
          if (val !== null && typeof val === 'object') continue;
          ctx.font = `700 ${8 * s}px ${FONT_SC}`;
          const shown = typeof val === 'number' && !Number.isInteger(val) ? Math.round(val * 100) / 100 : val;
          const w = textW(ctx, `${key} ${shown}`) + 10 * s;
          if (px + w > cx + cw) { px = cx; py += 19 * s; }
          if (py > y + rowH - 16 * s) break;
          r.numChip(d, px, py, key, val, `tal-edit=${a.id}.${ti}.${key}`);
          px += w + 4 * s;
        }
      });
    });
    // The capes (`CAPES`): one grade each, one worn at a time, its Q verb's line and numbers.
    const capeTop = listTop + ARTIFACTS.length * rowH + 14 * s, capeH = 62 * s;
    ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = CAPE_RARITY.color; ctx.textAlign = 'left';
    ctx.fillText('THE CAPES · ONE ON HIS BACK · Q', pad, capeTop);
    CAPES.forEach((c, i) => {
      const y = capeTop + 10 * s + i * capeH, on = game.cape && game.cape.id === c.id;
      if (i % 2) { ctx.fillStyle = 'rgba(239,230,208,0.03)'; ctx.fillRect(pad - 4 * s, y, W - pad * 2 + 8 * s, capeH); }
      r.artifactIcon(c.id, pad + 16 * s, y + 20 * s, 12 * s, 0, true);
      ctx.textAlign = 'left'; ctx.font = `700 ${9.5 * s}px ${FONT_SC}`; ctx.fillStyle = on ? PALETTE.fireHi : PALETTE.bone;
      ctx.fillText(c.name, pad + 36 * s, y + 14 * s);
      r.devButton(d, pad + 36 * s, y + 24 * s, 46 * s, 16 * s, on ? 'OFF' : 'WEAR', on ? 'cape-off' : `cape-wear=${c.id}`, on);
      const cx = pad + leftW, cw = W - pad * 2 - leftW - 10 * s;
      ctx.font = `400 ${8.5 * s}px ${FONT}`; ctx.fillStyle = PALETTE.bone;
      r.wrap(c.desc, cw).slice(0, 2).forEach((l, li) => ctx.fillText(l, cx, y + 12 * s + li * 10 * s));
      ctx.font = `400 ${7.5 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.5)';
      r.wrap(c.detail, cw).slice(0, 2).forEach((l, li) => ctx.fillText(l, cx, y + 34 * s + li * 9 * s));
    });
    // the page's foot, so the scroll reaches past the last row's chips
    d.rects.push({ x: -10, y: capeTop + 10 * s + CAPES.length * capeH, w: 0, h: 1, id: 'tal-end' });
  },
  // The tab's clicks. Returns whether `id` was one of them.
  devAction(game, id) {
    const d = game.dev;
    if (id === 'tal-end') return true;
    if (id.startsWith('tal-off=')) { const aid = id.slice(8); game.artifacts = (game.artifacts || []).filter((a) => a.id !== aid); game.applyBoons(); game.devToast(`${(Shop.def(aid) || {}).name} OFF`); return true; }
    if (id === 'cape-off') { game.cape = null; game.applyBoons(); game.devToast('NO CAPE'); return true; }
    if (id.startsWith('cape-wear=')) { const c = Cape.def(id.slice(10)); if (c) { game.cape = { id: c.id }; game.goat.itemCd = game.goat.itemCdMax = 0; game.applyBoons(); game.devToast(c.name); } return true; }
    if (id.startsWith('tal-wear=')) {
      const [aid, t] = id.slice(9).split('.');
      const def = ARTIFACTS.find((a) => a.id === aid); if (!def) return true;
      // Already worn: its tier changes in place. Otherwise on, the oldest off past the slots.
      const mine = Shop.worn(game, aid);
      if (mine) mine.tier = Shop.tierFit(aid, Number(t));
      else game.artifacts = (game.artifacts || []).concat([{ id: aid, tier: Shop.tierFit(aid, Number(t)) }]).slice(-TUNING.talisman.slots);
      game.applyBoons();
      game.devToast(`${def.name} · ${rarityOfArt(aid).name}`);
      return true;
    }
    // The rarity steps COMMON, RARE, EPIC and back, and is written into tuning.js where the entry stands.
    if (id.startsWith('tal-rarity=')) {
      const def = ARTIFACTS.find((a) => a.id === id.slice(11)); if (!def) return true;
      def.rarity = def.rarity % RARITY.length + 1;
      game.persistTuningEdit({ root: 'ARTIFACTS', id: def.id, path: ['rarity'], value: def.rarity });
      game.devToast(`${def.name} · ${rarityOfArt(def.id).name}`);
      return true;
    }
    // The shelf line, one for the talisman's tiers; left empty it goes back to the generated one.
    if (id.startsWith('tal-text=')) {
      const def = ARTIFACTS.find((a) => a.id === id.slice(9)); if (!def) return true;
      const raw = window.prompt(`${def.name}, the line on the shelf, every tier (empty: back to the generated one)`, def.text || def.tiers[0].desc);
      if (raw === null) return true;
      const text = raw.trim() || null;
      if (text) def.text = text; else delete def.text;
      game.persistTuningEdit({ root: 'ARTIFACTS', id: def.id, path: ['text'], value: text, drop: !text });
      return true;
    }
    if (id.startsWith('tal-edit=')) {
      const [aid, ti, key] = id.slice(9).split('.');
      const def = ARTIFACTS.find((a) => a.id === aid); if (!def) return true;
      const params = def.tiers[Number(ti)].params, cur = params[key];
      let value;
      if (typeof cur === 'boolean') value = !cur;
      else {
        const raw = window.prompt(`${def.name} ${'I'.repeat(Number(ti) + 1)}, ${key}`, String(cur));
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
    else if (id === 'mask') { ctx.fillStyle = PALETTE.bone; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.12; ctx.beginPath(); ctx.ellipse(0, h * 0.1, h * 0.6, h * 0.75, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); line(PALETTE.bone, 0.18); ctx.beginPath(); ctx.moveTo(-h * 0.4, -h * 0.45); ctx.quadraticCurveTo(-h * 0.95, -h * 0.8, -h * 0.7, -h * 1.05); ctx.moveTo(h * 0.4, -h * 0.45); ctx.quadraticCurveTo(h * 0.95, -h * 0.8, h * 0.7, -h * 1.05); ctx.stroke(); ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.ellipse(-h * 0.22, 0, h * 0.13, h * 0.18, 0, 0, Math.PI * 2); ctx.ellipse(h * 0.22, 0, h * 0.13, h * 0.18, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (id === 'effigy') { ctx.fillStyle = '#c9a24e'; ctx.strokeStyle = '#7a5a26'; ctx.lineWidth = h * 0.1; ctx.beginPath(); ctx.ellipse(-h * 0.1, 0, h * 0.65, h * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(h * 0.6, -h * 0.4, h * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); line('#6b4a2c', 0.12); for (const lx of [-0.5, -0.1, 0.3]) { ctx.beginPath(); ctx.moveTo(lx * h, h * 0.35); ctx.lineTo(lx * h, h * 0.85); ctx.stroke(); } }
    else if (id === 'spur') { ctx.fillStyle = '#c29a44'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.08; ctx.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, rr = k % 2 ? h * 0.4 : h * 0.9; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.arc(0, 0, h * 0.15, 0, Math.PI * 2); ctx.fill(); }
    else if (id === 'moth') { ctx.fillStyle = '#b8ad97'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.08; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * h * 0.45, -h * 0.2, h * 0.45, h * 0.35, sx * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(sx * h * 0.35, h * 0.35, h * 0.3, h * 0.25, -sx * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } ctx.fillStyle = '#5a5250'; ctx.fillRect(-h * 0.08, -h * 0.5, h * 0.16, h * 1.1); }
    else if (id === 'sandal') { ctx.fillStyle = '#8a6238'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.1; ctx.beginPath(); ctx.ellipse(0, 0, h * 0.45, h * 0.95, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); line('#3b2a1a', 0.12); ctx.beginPath(); ctx.moveTo(-h * 0.45, -h * 0.3); ctx.lineTo(h * 0.45, -h * 0.1); ctx.moveTo(-h * 0.4, h * 0.25); ctx.lineTo(h * 0.45, h * 0.4); ctx.stroke(); }
    // The sacrificed goat (8 Oct 2026): a bone-white goat's skull under a gold halo, the blood of it running from the neck.
    else if (id === 'scapegoat') { ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = h * 0.12; ctx.beginPath(); ctx.ellipse(0, -h * 0.98, h * 0.46, h * 0.14, 0, 0, Math.PI * 2); ctx.stroke(); line('#e8e0cc', 0.17); ctx.beginPath(); ctx.moveTo(-h * 0.42, -h * 0.5); ctx.quadraticCurveTo(-h * 1.0, -h * 0.7, -h * 0.82, -h * 0.05); ctx.moveTo(h * 0.42, -h * 0.5); ctx.quadraticCurveTo(h * 1.0, -h * 0.7, h * 0.82, -h * 0.05); ctx.stroke(); ctx.fillStyle = '#e8e0cc'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.1; ctx.beginPath(); ctx.moveTo(-h * 0.5, -h * 0.55); ctx.quadraticCurveTo(0, -h * 0.85, h * 0.5, -h * 0.55); ctx.lineTo(h * 0.36, h * 0.35); ctx.lineTo(h * 0.14, h * 0.62); ctx.lineTo(-h * 0.14, h * 0.62); ctx.lineTo(-h * 0.36, h * 0.35); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.ellipse(-h * 0.22, -h * 0.12, h * 0.13, h * 0.18, 0, 0, Math.PI * 2); ctx.ellipse(h * 0.22, -h * 0.12, h * 0.13, h * 0.18, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = PALETTE.blood; ctx.beginPath(); ctx.moveTo(-h * 0.1, h * 0.6); ctx.lineTo(h * 0.1, h * 0.6); ctx.lineTo(h * 0.06, h * 1.0); ctx.quadraticCurveTo(0, h * 1.15, -h * 0.06, h * 1.0); ctx.closePath(); ctx.fill(); }
    // The snake skin (8 Oct 2026): a shed skin lying in an S, scaled in pale diamonds, the head at one end.
    else if (id === 'tallow') { ctx.lineCap = 'round'; const S = () => { ctx.beginPath(); ctx.moveTo(h * 0.55, -h * 0.8); ctx.bezierCurveTo(-h * 0.95, -h * 0.75, -h * 0.95, -h * 0.05, 0, -h * 0.05); ctx.bezierCurveTo(h * 0.95, -h * 0.05, h * 0.95, h * 0.75, -h * 0.55, h * 0.8); }; S(); ctx.strokeStyle = edge; ctx.lineWidth = h * 0.66; ctx.stroke(); S(); ctx.strokeStyle = '#9fb067'; ctx.lineWidth = h * 0.46; ctx.stroke(); S(); ctx.strokeStyle = '#dfe8b0'; ctx.lineWidth = h * 0.14; ctx.setLineDash([h * 0.14, h * 0.32]); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#9fb067'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.1; ctx.beginPath(); ctx.ellipse(h * 0.66, -h * 0.84, h * 0.3, h * 0.2, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.arc(h * 0.72, -h * 0.88, h * 0.06, 0, Math.PI * 2); ctx.fill(); }
    else if (id === 'mirror') { ctx.fillStyle = '#bfe6ff'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.1; ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(h * 0.6, 0); ctx.lineTo(0, h); ctx.lineTo(-h * 0.6, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); line('rgba(255,255,255,0.85)', 0.1); ctx.beginPath(); ctx.moveTo(-h * 0.2, -h * 0.4); ctx.lineTo(h * 0.15, -h * 0.05); ctx.stroke(); }
    else if (id === 'cup') { ctx.fillStyle = '#8d8a85'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.1; ctx.beginPath(); ctx.moveTo(-h * 0.7, -h * 0.6); ctx.lineTo(h * 0.7, -h * 0.6); ctx.quadraticCurveTo(h * 0.6, h * 0.3, 0, h * 0.35); ctx.quadraticCurveTo(-h * 0.6, h * 0.3, -h * 0.7, -h * 0.6); ctx.fill(); ctx.stroke(); ctx.fillStyle = PALETTE.blood; ctx.beginPath(); ctx.ellipse(0, -h * 0.55, h * 0.6, h * 0.15, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#8d8a85'; ctx.fillRect(-h * 0.1, h * 0.35, h * 0.2, h * 0.4); ctx.fillRect(-h * 0.4, h * 0.72, h * 0.8, h * 0.18); }
    // An astragalus: a goat's ankle bone, knuckled at both ends and waisted in the middle, one pit on its face.
    else if (id === 'knuckle') { ctx.rotate(-0.25); ctx.fillStyle = '#e8dcc0'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.1; ctx.beginPath(); ctx.moveTo(-h * 0.85, -h * 0.45); ctx.quadraticCurveTo(-h * 0.95, -h * 0.9, -h * 0.4, -h * 0.75); ctx.quadraticCurveTo(0, -h * 0.45, h * 0.4, -h * 0.75); ctx.quadraticCurveTo(h * 0.95, -h * 0.9, h * 0.85, -h * 0.45); ctx.lineTo(h * 0.85, h * 0.45); ctx.quadraticCurveTo(h * 0.95, h * 0.9, h * 0.4, h * 0.75); ctx.quadraticCurveTo(0, h * 0.45, -h * 0.4, h * 0.75); ctx.quadraticCurveTo(-h * 0.95, h * 0.9, -h * 0.85, h * 0.45); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#a8977a'; ctx.beginPath(); ctx.ellipse(0, 0, h * 0.28, h * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-h * 0.6, -h * 0.55, h * 0.3, h * 0.12); }
    // A horseshoe magnet: red, its two pole tips iron grey.
    else if (id === 'magnet') { ctx.lineCap = 'butt'; line(edge, 0.62); ctx.beginPath(); ctx.arc(0, -h * 0.15, h * 0.52, Math.PI, 0); ctx.lineTo(h * 0.52, h * 0.75); ctx.moveTo(-h * 0.52, -h * 0.15); ctx.lineTo(-h * 0.52, h * 0.75); ctx.stroke(); line('#c0392b', 0.42); ctx.beginPath(); ctx.arc(0, -h * 0.15, h * 0.52, Math.PI, 0); ctx.lineTo(h * 0.52, h * 0.4); ctx.moveTo(-h * 0.52, -h * 0.15); ctx.lineTo(-h * 0.52, h * 0.4); ctx.stroke(); ctx.fillStyle = '#b8b4ac'; ctx.fillRect(-h * 0.73, h * 0.4, h * 0.42, h * 0.38); ctx.fillRect(h * 0.31, h * 0.4, h * 0.42, h * 0.38); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(-h * 0.62, -h * 0.35, h * 0.12, h * 0.4); }
    // A nosebag: a sack on a strap, grass standing out of its mouth.
    else if (id === 'nosebag') { line('#5a3e22', 0.12); ctx.beginPath(); ctx.arc(0, -h * 0.25, h * 0.75, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.fillStyle = '#8a6238'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.1; ctx.beginPath(); ctx.moveTo(-h * 0.55, -h * 0.2); ctx.lineTo(h * 0.55, -h * 0.2); ctx.quadraticCurveTo(h * 0.75, h * 0.85, 0, h * 0.9); ctx.quadraticCurveTo(-h * 0.75, h * 0.85, -h * 0.55, -h * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); line('#9fd84a', 0.14); for (const gx of [-0.3, 0, 0.3]) { ctx.beginPath(); ctx.moveTo(gx * h, -h * 0.2); ctx.lineTo(gx * h * 1.6, -h * 0.75); ctx.stroke(); } ctx.fillStyle = '#5a3e22'; ctx.fillRect(-h * 0.55, -h * 0.05, h * 1.1, h * 0.12); }
    // The sugar cane (8 Oct 2026): a jointed green-gold stalk with its leaves streaming off the top.
    else if (id === 'tally') { ctx.rotate(-0.25); line('#6f8a3a', 0.14); ctx.lineCap = 'round'; for (const lx of [-0.7, 0.75, 0.2]) { ctx.beginPath(); ctx.moveTo(0, -h * 0.75); ctx.quadraticCurveTo(lx * h, -h * 1.1, lx * h * 1.2, -h * 0.55); ctx.stroke(); } ctx.fillStyle = '#c9d28a'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.09; ctx.fillRect(-h * 0.2, -h * 0.8, h * 0.4, h * 1.8); ctx.strokeRect(-h * 0.2, -h * 0.8, h * 0.4, h * 1.8); line('#7c8f52', 0.12); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-h * 0.2, -h * 0.4 + k * h * 0.45); ctx.lineTo(h * 0.2, -h * 0.4 + k * h * 0.45); ctx.stroke(); } ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-h * 0.12, -h * 0.75, h * 0.06, h * 1.6); }
    else return false;
    return true;
  },
};
