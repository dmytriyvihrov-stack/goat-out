// THE FACTORY (12 Oct 2026, the user's: a zone of one or two floors, an alternative round the fourth and fifth, with three
// machines in it; the art is output/factory-art-2026-10-12). Three pseudo-kinds of `bearer`, flagged like the shieldman
// and the thrower, their numbers in `TUNING.sawbot` / `welder` / `automaton`:
//   THE SAWBOT: a clubman of iron, two hearts, fire and poison do nothing to it (`Sawbot.give`, the club's own branch).
//   THE WELDER: a torso on tracks that drives one line only, forward and back (`e.waxis`), keeps a torch's length off the
//     goat on it, and sprays fire in a cone ahead (`Welder.spray`): the jet itself is a blow, the floor it lights burns on.
//     Step off its line and it cannot reach you; it burns like a man but never drives into fire, nor out of its room.
//   THE AUTOMATON: the boss, a square iron frame with the meat bulging out of it high on four long legs. Nothing reaches the
//     body up there. He stomps (`stomp`): a run of two or three, a leg lifting over the goat with a ring of where it lands;
//     the foot that comes down is stuck in the floor a beat (`legs.stuck`), and one blow on it knocks that leg out; any other
//     planted foot takes two blows close together (`legs.hits`, `heal`). A knocked leg swings aside and hangs `legs.out` s.
//     With `fall.legs` out at once he falls, crushing what is under him, and lies with the body open: `fall.hearts` hearts
//     a fall at most, then he heaves himself up and throws the goat off. His picture is js/factory-pixels.js.
// Also THE FACTORY test floor (`FACTORY_LEVEL` in tuning.js, laid here by `factoryLevel`, dev drawer FACTORY (TEST) and
// `#factory` + NEW GAME), eighteen rooms (see `factoryLevel`).
// Decided here, not by the user (open to his tuning): the blows a leg takes, two legs the fall, two hearts a fall, five on
// the body. Nothing of the user's verbs changed, no key added (rule 1).

// What the iron answers when fire or poison finds nothing in it: a word and a few sparks, at most every `shrug` s.
const Sawbot = {
  give(e) {
    const S = TUNING.sawbot;
    e.sawbot = true; e.mute = true;
    e.hp = e.maxHp = S.hp;
    e.speed = e.cfg.speed * S.speedMul;
    e.immune = S.immune;   // read by `Enemy.immunity`: fire, witchfire, poison and the blunder
  },
  // 13 Oct 2026 playtest: "fire makes the robot red, it heats up, and touching the goat (but the headbutt) it hurts";
  // "immune to poison, but poison and fire together may blow it up". Fire (`Enemy.ignite`, refused) heats it,
  // poison (`Status.poison`, refused) soaks it; both at once and it goes off as a puddle does.
  heat(game, e) {
    if (e.dead) return;
    e.heat = TUNING.sawbot.heat.time;
    if (e.soaked > 0) Sawbot.burst(game, e);
  },
  soak(game, e) {
    if (e.dead) return;
    const was = e.soaked > 0; e.soaked = TUNING.sawbot.soak;
    if (!was) game.particles(e.x, e.y - 10, 4, PALETTE.venomHi, 70);
    if (e.heat > 0) Sawbot.burst(game, e);
  },
  burst(game, e) {
    if (e.bursting) return;
    e.bursting = true; e.soaked = 0; e.heat = 0;
    Status.blast(game, e.x, e.y, TUNING.status.blast, e);
    if (!e.dead) e.die(game, 'boom', 0, 0, 'blast');
    e.bursting = false;
  },
  // Every step (`Machines.update`): the clocks, a drip off a soaked one, and a hot one's touch.
  tick(game, dt) {
    const H = TUNING.sawbot.heat, g = game.goat;
    for (const e of game.enemies) {
      if (!(e.sawbot || e.arm) || e.dead) continue;   // THE ARM is iron the same way (`Arm`, below)
      if (e.soaked > 0) { e.soaked -= dt; if (Math.random() < dt * 3) game.particles(e.x, e.y - 6, 1, PALETTE.venom, 30); }
      if (!(e.heat > 0)) continue;
      e.heat -= dt; e.heatCd = Math.max(0, (e.heatCd || 0) - dt);
      if (Math.random() < dt * 4) game.particles(e.x, e.y - 14, 1, PALETTE.fireHi, 50);
      // his horns on it are the one touch that does not burn (they are the blow, not a brush against it)
      const butting = g.state === 'windup' || g.state === 'lunge' || g.state === 'recover';
      if (g.dead || butting || e.heatCd > 0 || e.held || game.hidden(e.x, e.y)) continue;
      const dx = g.x - e.x, dy = g.y - e.y, d = hyp(dx, dy);
      if (d > e.r + g.r + H.touch) continue;
      e.heatCd = H.cd;
      g.damage(H.hurt, game, dx / (d || 1) * 3 * TILE, dy / (d || 1) * 3 * TILE, false, e);
      game.particles(g.x, g.y - 8, 6, PALETTE.fireHi, 120);
    }
  },
  shrug(game, e, what) {
    if (!game || !game.floatText || e.dead) return;
    const now = game.timer || 0; if (now - (e.shrugAt || -9) < TUNING.sawbot.shrug) return;
    e.shrugAt = now;
    game.floatText(e.x, e.y - 34, what === 'poison' ? 'IRON · NO POISON' : 'IRON · NO FIRE', PALETTE.ashHi);
    game.particles(e.x, e.y - 12, 5, what === 'poison' ? PALETTE.venomHi : PALETTE.ash, 90);
  },
};

// ---- THE ARM (14 Oct 2026, his ask: "a carrier robot: it takes you and swings and slams you on the floor, with no
// windup at all, when you are next to it; the only ways out are the roll or the scream; the horns and the grab do
// nothing; it is tied to one spot with a reach, so you run round it, or poison and fire") ------------------------------
// A pseudo-kind of `bearer` (`spawnKind` flag `arm`, `TUNING.arm`): an industrial arm bolted to the floor (js/factory-pixels.js
// `drawArm`, live cells off `e.armAng` / `armExt` / `armZ`). It never moves (`e.sentry`). Whoever stands inside `reach`
// tiles of its base, the goat or a man of the cult, is grabbed on the spot (pillar 4's one exception here, his: the ring
// on the floor is the tell, read from the doorway), hoisted `lift` s and slammed down at the ring's edge: the goat loses
// `hurt` and is thrown clear, a man dies on the floor (pillar 3: the floor kills, the arm only puts him on it). Hoisted,
// the goat rolls out of the claw (E), or BAAHs with a voice that stuns (the arm reels `stunBy` s and lets go); a headbutt
// on it takes no heart but knocks it out `stunBy` s (`Arm.horns`), the grab finds it TOO BIG. Iron: fire heats it, poison soaks it, both and it goes off
// (`Sawbot.heat` / `soak` / `burst`); a blast or a blade takes its hearts as a man's. Dead, it leaves a wreck.
const Arm = {
  give(e) {
    const A = TUNING.arm;
    e.arm = true; e.mute = true; e.sentry = true;   // sentry: never shoved, never walks, never swings a club
    e.aware = true; e.woke = true;                     // it has no eyes to open: no sight cone on the floor, no beat of doubt
    e.hp = e.maxHp = A.hp; e.r = A.r; e.speed = 0;
    e.immune = A.immune;
    e.armAng = e.facing || 0; e.armExt = A.look.rest; e.armZ = 0.1; e.armCd = 0; e.carry = null;
  },
  // the claw's point: on the floor (`floor`), or hoisted (a rise of `look.lift` screen px at z 1, a world y shift)
  at(e, floor) {
    const A = TUNING.arm, R = A.reach * TILE * e.armExt;
    return { x: e.x + Math.cos(e.armAng) * R, y: e.y + Math.sin(e.armAng) * R - (floor ? 0 : e.armZ * A.look.lift / TILT) };
  },
  // a spot on the floor to set a body down: the claw's floor point, or the base's edge when that is stone
  spot(e, game) {
    const f = Arm.at(e, true), w = game.world;
    if (!w.isSolid(Math.floor(f.x / TILE), Math.floor(f.y / TILE))) return f;
    const d = Math.min(e.r + 10, TUNING.arm.reach * TILE * 0.5);
    for (const a of [e.armAng, e.armAng + Math.PI / 2, e.armAng - Math.PI / 2, e.armAng + Math.PI]) {
      const x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d; if (!w.isSolid(Math.floor(x / TILE), Math.floor(y / TILE))) return { x, y };
    }
    return { x: e.x, y: e.y };
  },
  // Whoever is inside the ring: the goat first (not mid-roll, not in his mercy frames, not already carried), else the
  // nearest man of the cult the claw can lift.
  target(e, game, R) {
    const g = game.goat;
    if (Thrower.grabbable(e, game) && hyp(g.x - e.x, g.y - e.y) < R + g.r * 0.5) return { o: g, type: 'goat' };
    let best = null, bd = R + 8;
    for (const o of game.liveEnemies || game.enemies) {
      if (o === e || o.dead || o.held || o.ghosted || o.unliftable || Arm.iron(o) || o.statue || o.state === 'hidden') continue;
      const d = hyp(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; best = o; }
    }
    return best ? { o: best, type: 'man' } : null;
  },
  // who it leans toward while idle: the goat in `look` × reach, else nobody (the claw sweeps)
  nearest(e, game, R) { const g = game.goat; return !g.dead && !game.hidden(e.x, e.y) && hyp(g.x - e.x, g.y - e.y) < R ? g : null; },
  step(e, dt, game, sees) {
    const A = TUNING.arm, g = game.goat, slow = game.mods.enemySlow, R = A.reach * TILE;
    e.vx = 0; e.vy = 0; e.armCd = Math.max(0, (e.armCd || 0) - dt);
    const c = e.carry;
    if (c) {
      const o = c.o, gone = o.dead || (c.type === 'goat' ? (o.state !== 'carried' || o.carriedBy !== e) : (!o.held || o.liftedBy !== e));
      if (gone) { e.carry = null; e.state = 'arecover'; e.timer = A.recover * slow; }
      else if (e.dazed > 0 || e.dead) Arm.drop(e, game, 'daze');
      else if (c.type === 'goat') {
        // his ways out of the claw: the roll (he tumbles out of it, away from the base), and BAAH only with a voice that
        // stuns (THE FULL THROAT, `mods.screamStun`; 15 Oct 2026, his: "the plain scream does not take it off, only with a stun")
        if (game.input.rollPressed && g.rollCd <= 0) Arm.drop(e, game, 'roll');
        else if (game.input.spacePressed && g.screamCd <= 0 && game.mods.screamStun) Arm.drop(e, game, 'scream');
      }
    }
    if (e.state !== 'alift' && e.state !== 'aslam' && e.state !== 'arecover') e.state = 'idle';
    if (e.state === 'idle') {
      // the claw sweeps slowly, and turns to whoever comes near; inside the ring, it has him
      const near = Arm.nearest(e, game, R * A.look.watch);
      const want = near ? Math.atan2(near.y - e.y, near.x - e.x) : e.armAng + A.look.sweep * dt;
      e.armAng += angleDiff(e.armAng, want) * Math.min(1, dt * (near ? A.look.turn : 1));
      e.armExt += ((near ? A.look.out : A.look.rest) - e.armExt) * Math.min(1, dt * 5); e.armZ += (0.12 - e.armZ) * Math.min(1, dt * 5);
      e.facing = e.armAng;
      if (e.armCd <= 0 && !e.carry && !(e.dazed > 0) && !e.held) { const t = Arm.target(e, game, R); if (t) Arm.grab(e, game, t); }
      return true;
    }
    if (e.state === 'alift') {
      e.timer -= dt; const k = 1 - Math.max(0, e.timer) / (A.lift * slow);
      e.armZ = k; e.armExt = A.look.out - 0.35 * k;   // hoisted up and in over the base
      Arm.hold(e, game);
      if (e.timer <= 0) { e.state = 'aslam'; e.timer = A.slam * slow; game.audio.sfxSwing(); }
      return true;
    }
    if (e.state === 'aslam') {
      e.timer -= dt; const k = 1 - Math.max(0, e.timer) / (A.slam * slow);
      e.armZ = 1 - k; e.armExt = (A.look.out - 0.35) + 0.45 * k;   // down and out to the ring's edge
      Arm.hold(e, game);
      if (e.timer <= 0) Arm.slam(e, game);
      return true;
    }
    if (e.state === 'arecover') { e.timer -= dt; e.armZ *= Math.max(0, 1 - dt * 6); if (e.timer <= 0) e.state = 'idle'; return true; }
    return true;
  },
  grab(e, game, t) {
    const A = TUNING.arm, g = game.goat, o = t.o;
    e.armAng = Math.atan2(o.y - e.y, o.x - e.x); e.facing = e.armAng; e.armExt = Math.min(1, hyp(o.x - e.x, o.y - e.y) / (A.reach * TILE)); e.armZ = 0;
    if (t.type === 'goat') {
      // what he held comes out of his mouth, as the thrower's grab takes it (js/thrower.js)
      if (g.holding) { const h = g.holding; g.holding = null; h.held = false; g.autoHeld = false; g.spendGrab(game, !h.item); if (!h.item) { h.fromMouth = false; h.state = 'floored'; h.timer = TUNING.bearer.flooredTime; } }
      g.state = 'carried'; g.carriedBy = e; g.vx = 0; g.vy = 0; g.runT = 0; g.runUp = 1;
      game.hitstop(0.05); game.vibe(30);   // no words (his: "show it with a mark, do not write GRABBED"): `drawMark`
    } else {
      o.held = true; o.state = 'held'; o.liftedBy = e; o.aware = true; o.rune = null; o.vx = 0; o.vy = 0;
      game.floatText(o.x, o.y - 28, o.kind === 'dog' ? 'YELP' : 'HEY!', PALETTE.ashHi);
    }
    e.carry = { o, type: t.type }; e.state = 'alift'; e.timer = A.lift * game.mods.enemySlow;
    game.audio.sfxThud(); if (game.audio.sfxHydraulic) game.audio.sfxHydraulic(A.lift, game.audio.heard(e.x - g.x, e.y - g.y));
    Arm.hold(e, game);
  },
  hold(e, game) {
    const c = e.carry; if (!c) return;
    const o = c.o, at = Arm.at(e);
    o.x = at.x; o.y = at.y; o.vx = 0; o.vy = 0;
    if (c.type === 'goat') { o.runT = 0; o.runUp = 1; }
  },
  // Let go of short of the slam: dazed (the scream, THE FULL THROAT), or the goat's own way out. 'roll': he tumbles out of
  // the claw away from the base, the roll's own i-frames on him; 'scream': BAAH, the arm reels `stunBy` s; 'daze': a drop.
  drop(e, game, how) {
    const c = e.carry; if (!c) return;
    const A = TUNING.arm, o = c.o, g = game.goat, slow = game.mods.enemySlow, spot = Arm.spot(e, game);
    e.carry = null; e.state = 'arecover'; e.timer = A.recover * slow; e.armCd = A.cd * slow;
    if (c.type === 'man') { o.held = false; o.liftedBy = null; o.x = spot.x; o.y = spot.y; o.state = 'floored'; o.timer = TUNING.bearer.flooredTime; return; }
    if (g.state !== 'carried') return;
    g.x = spot.x; g.y = spot.y; g.carriedBy = null;
    if (how === 'roll') {
      const R = TUNING.goat.roll, d = hyp(g.x - e.x, g.y - e.y) || 1, ux = (g.x - e.x) / d, uy = (g.y - e.y) / d;
      g.state = 'roll'; g.timer = R.duration; g.rollDir = { x: ux, y: uy }; g.leap = null;
      g.vx = ux * R.speed * game.mods.rollDistance; g.vy = uy * R.speed * game.mods.rollDistance;
      g.rollCd = g.rollCdMax = R.cooldown * game.mods.rollCooldown; g.invuln = Math.max(g.invuln, R.invuln);
      game.input.rollPressed = false; game.audio.sfxRoll && game.audio.sfxRoll();
      game.floatText(g.x, g.y - 26, 'OUT', PALETTE.bone);
    } else if (how === 'scream') {
      const S = TUNING.goat.scream;
      g.state = 'idle'; g.timer = 0; g.screamCd = game.mods.screamCooldown; g.screaming = S.duration; game.input.spacePressed = false;
      game.audio.sfxScream(); game.floatText(g.x, g.y - 26, 'BAAAAH', PALETTE.bone); game.ring(g.x, g.y, 2 * TILE, PALETTE.bone);
      e.dazed = Math.max(e.dazed || 0, A.stunBy); Status.stunned(game, e); game.particles(e.x, e.y - 20, 6, PALETTE.bone, 110);
    } else { g.state = 'stunned'; g.timer = TUNING.thrower.grab.land; }
    game.world.collideCircle(g);
  },
  // the bare scream's balk (`Enemy.balk`): nothing (15 Oct 2026, his: only a scream that stuns takes it off)
  balk(game, e) { return false; },
  // The horns on it (`Goat.headbuttHits`, 15 Oct 2026, his: "a blow of the horns takes its effect off"): it reels
  // `stunBy` s and lets go of whatever it holds; the goat is only shoved back, never stunned inside its ring.
  horns(game, e, ax, ay) {
    if (e.carry) Arm.drop(e, game, 'daze');
    e.dazed = Math.max(e.dazed || 0, TUNING.arm.stunBy); e.armCd = Math.max(e.armCd, TUNING.arm.stunBy * game.mods.enemySlow);
    if (e.state === 'alift' || e.state === 'aslam') { e.state = 'arecover'; e.timer = TUNING.arm.recover * game.mods.enemySlow; }
    Status.stunned(game, e); e.flash = Math.max(e.flash, 0.08);
  },
  // Iron and its tracks are not what the claw is for (15 Oct 2026, his: "let it hit every non-mechanical one in range,
  // not the robots and the welders"): the sawbot, the welder, the automaton, another arm.
  iron(o) { return !!(o.sawbot || o.welder || o.automaton || o.arm); },
  // Down onto the floor at the ring's edge: the goat loses `hurt` and is thrown on out; a man dies on it.
  slam(e, game) {
    const A = TUNING.arm, c = e.carry, g = game.goat, slow = game.mods.enemySlow, a = e.armAng, ux = Math.cos(a), uy = Math.sin(a);
    e.carry = null; e.state = 'arecover'; e.timer = A.recover * slow; e.armCd = A.cd * slow; e.armZ = 0;
    const spot = Arm.spot(e, game);
    game.shake(6); game.thud(spot.x, spot.y, 1); game.audio.sfxThud(); game.dust(spot.x, spot.y, 8, ux, uy); game.world.emitNoise(spot.x, spot.y, TUNING.noise.smash);
    game.world.splat && game.world.scorch(spot.x, spot.y, 10, false);
    // the claw comes down on everyone living within `slamR` tiles of the spot, not only on what it held (his: the clubman
    // it met on the way down): a man of flesh dies there (pillar 3, the floor), iron is not touched, the goat loses `hurt`
    const held = c && c.o;
    for (const m of game.liveEnemies || game.enemies) {
      if (m === e || m === held || m.dead || m.held || m.ghosted || m.statue || Arm.iron(m) || m.state === 'hidden') continue;
      const dx = m.x - spot.x, dy = m.y - spot.y; if (hyp(dx, dy) > A.slamR * TILE + m.r) continue;
      m.die(game, 'splat', ux, uy, 'arm');
    }
    if (held !== g && !g.dead && g.state !== 'roll' && !(g.invuln > 0) && hyp(g.x - spot.x, g.y - spot.y) < A.slamR * TILE + g.r) g.damage(A.hurt, game, ux * A.throw * TILE, uy * A.throw * TILE, false, e);
    if (!c) return;
    const o = c.o;
    if (c.type === 'goat') {
      if (g.state !== 'carried') return;
      g.x = spot.x; g.y = spot.y; g.carriedBy = null; g.state = 'stunned'; g.timer = A.daze;
      g.damage(A.hurt, game, ux * A.throw * TILE, uy * A.throw * TILE, false, e);
      g.vx = ux * A.throw * TILE; g.vy = uy * A.throw * TILE;
      game.audio.sfxBleat && game.audio.sfxBleat(620, 0.3, 0.3);
    } else {
      o.held = false; o.liftedBy = null; o.x = spot.x; o.y = spot.y; o.state = 'floored'; o.timer = TUNING.bearer.flooredTime;
      o.die(game, 'splat', ux, uy, 'arm');
    }
  },
  // The ring on the floor, always (there is no windup to show): dim amber cells at the reach, bright while it lifts and
  // slams, and dark once it is dead or dazed.
  drawTell(R, e) {
    if (e.dead) return;
    const A = TUNING.arm, ctx = R.ctx, px = TUNING.effects.pixel * 2, r = A.reach * TILE;
    const hot = e.state === 'alift' || e.state === 'aslam', off = e.dazed > 0 || (e.armCd > 0 && !hot);
    ctx.save();
    ctx.fillStyle = off ? 'rgba(120,110,100,0.18)' : hot ? `rgba(242,170,48,${0.5 + 0.3 * Math.sin(R.t * 20)})` : 'rgba(242,170,48,0.26)';
    ctx.beginPath(); R.floorRing(e.x, e.y, r, r - px * 1.2, px); ctx.fill();
    if (hot) { ctx.fillStyle = 'rgba(242,170,48,0.1)'; ctx.beginPath(); R.floorRing(e.x, e.y, r - px * 1.2, px, px); ctx.fill(); }
    ctx.restore();
  },
  // The goat in a grip, shown by a mark and never in words (14 Oct 2026, his: "do not write GRABBED, show it with some
  // mark"): a claw of cells shut over his head, red and shaking, and while THE ARM holds him the two ways out beside it, the
  // roll's and the voice's own pictures off the skill rail (`SKILL_ICONS`), blinking. The thrower's grip gets the claw alone.
  drawMark(R, game) {
    const g = game.goat; if (!g || g.dead || g.state !== 'carried' || !g.carriedBy) return;
    const ctx = R.ctx, C = 2, arm = !!g.carriedBy.arm, sh = Math.round(Math.sin(R.t * 40));
    ctx.save(); ctx.scale(1, 1 / TILT);
    const cx = Math.round(g.x) + sh, cy = Math.round(g.y * TILT - 58);
    // the claw: a block, two prongs closed in under it, a red lamp
    const cell = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(cx + x * C, cy + y * C, w * C, h * C); };
    cell(-5, -6, 10, 5, '#17151b'); cell(-4, -5, 8, 3, '#51505a'); cell(-4, -5, 8, 1, '#76757f');
    cell(-5, -1, 3, 6, '#17151b'); cell(2, -1, 3, 6, '#17151b'); cell(-4, -1, 1, 5, '#76757f'); cell(3, -1, 1, 5, '#34333b');
    cell(-3, 3, 2, 2, '#17151b'); cell(1, 3, 2, 2, '#17151b');
    cell(-1, -4, 2, 1, Math.sin(R.t * 14) > 0 ? '#e8402c' : '#7a1e18');
    if (arm && typeof SKILL_ICONS !== 'undefined') {
      const on = Math.sin(R.t * 8) > -0.2, h = 9;
      for (const [id, dx] of (game.mods.screamStun ? [['roll', -26], ['scream', 26]] : [['roll', 0]])) {
        ctx.save(); ctx.translate(cx + dx, cy - 4); ctx.globalAlpha *= on ? 1 : 0.45;
        ctx.fillStyle = 'rgba(13,10,12,0.8)'; ctx.fillRect(-13, -13, 26, 26);
        SKILL_ICONS.draw(ctx, id, h, game.mods, false);
        ctx.restore();
      }
    }
    ctx.restore();
  },
  // What is left of it: the base and the arm lying flat, drawn by js/factory-pixels.js `drawWreck` off `game.wrecks`.
  wreck(game, e) { (game.wrecks || (game.wrecks = [])).push({ kind: 'arm', x: e.x, y: e.y, ang: e.armAng || 0 }); game.world.scorch(e.x, e.y, e.r * 1.2, false); },
};

// The room a point stands in, as an index (-1 in a corridor): rules.js `roomAt` hands back the room itself.
const factoryRoomOf = (game, x, y) => { const r = roomAt(game.level, x, y); return r ? r.index : -1; };

const Welder = {
  give(e, axis) {
    const W = TUNING.welder;
    e.welder = true; e.mute = true;
    e.hp = e.maxHp = W.hp;
    e.speed = e.cfg.speed * W.speedMul;
    e.r = W.r; e.wallR = Math.min(e.r, TUNING.ai.path.squeeze);
    e.immune = W.immune;
    e.waxis = axis === 'y' ? 'y' : 'x'; e.wdir = 1; e.wfireCd = W.fire.wake; e.wturn = 0; e.whome = { x: e.x, y: e.y };
    e.trapSense = 1;   // he reads every hazard: he never drives into fire
    Welder.face(e);
  },
  face(e) { e.facing = e.waxis === 'y' ? (e.wdir > 0 ? Math.PI / 2 : -Math.PI / 2) : (e.wdir > 0 ? 0 : Math.PI); },
  // the unit of his line, and how far a point is along it (ahead of him) and beside it
  dir(e) { return e.waxis === 'y' ? [0, e.wdir] : [e.wdir, 0]; },
  ahead(e, x, y) { const [fx, fy] = Welder.dir(e); return (x - e.x) * fx + (y - e.y) * fy; },
  beside(e, x, y) { return e.waxis === 'y' ? Math.abs(x - e.x) : Math.abs(y - e.y); },
  // `range` tiles off by default; the aim asks the nearer `fire.aim`, so the jet is never started at a goat on its very edge
  inCone(e, x, y, r, range) {
    const R = TUNING.welder.fire, d = hyp(x - e.x, y - e.y); if (d > (range || R.range) * TILE + r) return false;
    const al = Welder.ahead(e, x, y); if (al <= 0) return false;
    return Math.acos(Math.min(1, al / (d || 1))) < R.half + Math.min(0.6, r / (d || 1));
  },
  // A tile he may drive onto: no fire, no drop, no stone, and inside the room he was put in (8 Oct playtest of the test
  // floor: he chased the goat down the corridor into the room before).
  open(e, game, x, y) {
    const w = game.world;
    if (w.isBurningPx(x, y) || w.isPitPx(x, y) || w.tileAtPx(x, y) === T.WALL) return false;
    return !(e.room >= 0 && factoryRoomOf(game, x, y) !== e.room);
  },
  // First in `updateBearer`, every step is his: he never swings a club.
  step(e, dt, game, sees) {
    const W = TUNING.welder, D = W.drive, g = game.goat, slow = game.mods.enemySlow;
    e.wfireCd = Math.max(0, (e.wfireCd || 0) - dt); e.wturn = Math.max(0, (e.wturn || 0) - dt);
    Welder.face(e);
    const [fx, fy] = Welder.dir(e);
    if (e.state === 'wdaim') {
      e.vx = 0; e.vy = 0; e.timer -= dt;
      if (e.timer <= 0) { e.state = 'wdfire'; e.timer = W.fire.time * slow; e.wtick = 0; e.whit = false; game.audio.sfxSwing(); }
      return true;
    }
    if (e.state === 'wdfire') {
      e.vx = 0; e.vy = 0; e.timer -= dt; e.wtick = (e.wtick || 0) - dt;
      if (e.wtick <= 0) { e.wtick = W.fire.tick; Welder.spray(e, game, fx, fy); }
      if (e.timer <= 0) { e.state = 'wdcool'; e.timer = W.fire.cool * slow; }
      return true;
    }
    if (e.state === 'wdcool') {
      e.vx = 0; e.vy = 0; e.timer -= dt;
      if (e.timer <= 0) { e.state = 'chase'; e.wfireCd = W.fire.cd; }
      return true;
    }
    // Driving `sign` 1 forward, -1 back on his tracks (his facing stays); stopped short of a tile he may not take.
    const drive = (sp, sign) => {
      const px = e.x + fx * sign * D.probe * TILE, py = e.y + fy * sign * D.probe * TILE;
      if (!Welder.open(e, game, px, py)) { e.vx = 0; e.vy = 0; return false; }
      e.vx = fx * sign * sp; e.vy = fy * sign * sp; return true;
    };
    const turn = () => { e.wdir = -e.wdir; e.wturn = D.turnWait; e.vx = 0; e.vy = 0; };
    if (!e.aware || e.state === 'idle' || e.state === 'investigate') {
      // a patrol up and down his line, `patrol.len` tiles either side of where he was put
      if (e.wturn > 0) { e.vx = 0; e.vy = 0; return true; }
      if (Welder.ahead(e, e.whome.x, e.whome.y) < -W.patrol.len * TILE) { turn(); return true; }
      if (!drive(e.speed * W.patrol.mul, 1)) turn();
      return true;
    }
    // After the goat: line up along his axis, fire when the goat is in the cone, turn round when he is behind, keep a
    // torch's length off him (`hold`), back off when he is closer than `back` in front (8 Oct playtest: he bulldozed a
    // goat standing on his line fifteen tiles down the corridor, and nose to nose his jet started past the goat).
    const al = Welder.ahead(e, g.x, g.y), side = Welder.beside(e, g.x, g.y), onLine = side < e.r + g.r + D.lineSlack * TILE;
    // his own in the cone do not hold it (13 Oct 2026, second playtest: "their mates must not stop them firing"): they burn
    if (!g.dead && e.wfireCd <= 0 && Welder.inCone(e, g.x, g.y, g.r, W.fire.aim) && game.reaches(e.x, e.y, g.x, g.y)) {
      e.state = 'wdaim'; e.timer = W.fire.wind * slow; e.vx = 0; e.vy = 0; return true;
    }
    if (al < -D.slack * TILE && e.wturn <= 0) { turn(); return true; }
    if (e.wturn > 0) { e.vx = 0; e.vy = 0; return true; }
    if (onLine && al > 0 && al < D.back * TILE) drive(e.speed * D.backMul, -1);
    else if (al > D.hold * TILE || (!onLine && al > D.slack * TILE)) drive(e.speed, 1);
    else { e.vx = 0; e.vy = 0; }
    return true;
  },
  // The jet: the tiles of the cone ahead lit as ordinary fire for `fire.burn` s, his own tile never; a man in it catches
  // (iron does not), and the goat in it takes the jet itself once a burst (`whit`) as a blow, the floor's fire after it.
  spray(e, game, fx, fy) {
    const R = TUNING.welder.fire, w = game.world, g = game.goat, ox = e.x + fx * R.startAt * TILE, oy = e.y + fy * R.startAt * TILE;
    const own = (tx, ty) => tx === Math.floor(e.x / TILE) && ty === Math.floor(e.y / TILE);
    w.igniteCone(ox, oy, fx, fy, (R.range - R.startAt) * TILE, R.half, R.burn, own);
    if (!own(Math.floor(ox / TILE), Math.floor(oy / TILE))) w.ignite(Math.floor(ox / TILE), Math.floor(oy / TILE), true, R.burn);   // the jet's root, never his own tile
    for (const o of game.enemies) if (o !== e && !o.dead && !o.held && !o.ghosted && Welder.inCone(e, o.x, o.y, o.r) && game.reaches(e.x, e.y, o.x, o.y)) o.ignite(game);
    // the jet hurts only where its own fire lies (13 Oct 2026 playtest: the blow reached a tile past the flames)
    if (!e.whit && !g.dead && !game.hidden(e.x, e.y) && w.isBurningPx(g.x, g.y) && Welder.inCone(e, g.x, g.y, 0) && game.reaches(e.x, e.y, g.x, g.y) && !g.blockBlow(game, e, false)) {
      e.whit = true; g.damage(R.hurt, game, fx * R.knock * TILE, fy * R.knock * TILE, false, e);
    }
    w.emitNoise(e.x, e.y, TUNING.noise.swing, 'cult');
  },
  // The cone on the floor while he aims and sprays: amber cells, filling as the jet comes.
  drawTell(R, e) {
    const F = TUNING.welder.fire, ctx = R.ctx, p = e.state === 'wdaim' ? R.windP(e, F.wind) : 1, px = TUNING.effects.pixel * 2;
    ctx.save();
    ctx.fillStyle = `rgba(242,170,48,${0.22 + 0.3 * p})`; ctx.beginPath();
    R.floorArc(e.x, e.y, F.range * TILE * (0.3 + 0.7 * p), F.startAt * TILE * 0.6, px, e.facing - F.half, F.half * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,224,138,${0.45 + 0.45 * p})`; ctx.beginPath();
    R.floorArc(e.x, e.y, F.range * TILE, F.range * TILE - px * 1.2, px, e.facing - F.half, F.half * 2); ctx.fill();
    ctx.restore();
  },
};

const Automaton = {
  give(e) {
    const A = TUNING.automaton;
    e.automaton = true; e.mute = true; e.watchful = true;
    e.hp = e.maxHp = A.hp;
    e.speed = A.speed;
    e.r = A.r; e.wallR = Math.min(e.r, TUNING.ai.path.squeeze);
    e.immune = A.immune;
    e.aloft = true;   // the body is high up: nothing bumps it, nothing lands on it (`collideEntities`, `Enemy.die`)
    e.auto = Automaton.restAuto(e);
  },
  restAuto(e) {
    const A = TUNING.automaton;
    return { state: 'walk', timer: 0, t: 0, lift: A.look.lift, stompCd: A.stomp.first, stomp: null, toldAt: -9, bodyHits: 0, home: { x: e.x, y: e.y },
      legs: A.legs.spread.map(([dx, dy]) => ({ fx: e.x + dx * TILE, fy: e.y + dy * TILE, z: 0, out: 0, outT: 0, hits: 0, hitAt: -9, stuck: 0, sparkT: 0, step: null })) };
  },
  outCount(e) { return e.auto.legs.filter((L) => L.out > 0).length; },
  // where a leg wants its foot: its spread off the body, led by where the body is going, always on floor
  restSpot(e, i, game) {
    const [dx, dy] = TUNING.automaton.legs.spread[i], L = TUNING.automaton.legs;
    return Automaton.onFloor(game, e, e.x + dx * TILE + e.vx * L.step.lead, e.y + dy * TILE + e.vy * L.step.lead);
  },
  onFloor(game, e, x, y) {
    const w = game.world;
    for (let k = 0; k < 10; k++) {
      const t = w.tileAtPx(x, y);
      if (t !== T.WALL && t !== T.PIT) break;
      const dx = e.x - x, dy = e.y - y, d = hyp(dx, dy) || 1; x += dx / d * TILE * 0.3; y += dy / d * TILE * 0.3;
    }
    return { x, y };
  },
  // the legs beside each other on the square never step together; the diagonal pair may
  canStep(e, i) {
    let n = 0;
    for (let j = 0; j < 4; j++) { const L = e.auto.legs[j]; if (!L.step || j === i) continue; n++; if ((i + j) & 1) return false; }
    return n < 2;
  },
  step(e, dt, game, sees) {
    const A = TUNING.automaton, au = e.auto, g = game.goat, L = A.legs;
    au.t += dt; au.stompCd = Math.max(0, au.stompCd - dt);
    for (const leg of au.legs) { leg.sparkT = Math.max(0, leg.sparkT - dt); leg.stuck = Math.max(0, leg.stuck - dt); leg.brace = Math.max(0, (leg.brace || 0) - dt); if (game.timer - leg.hitAt > L.heal) leg.hits = 0; }
    const outN = Automaton.outCount(e);
    // He keeps to his ring (the test floor's playtest: he walked after the goat down the corridor, legs over the walls).
    const here = e.room < 0 || game.goatRoom === e.room;
    if (au.state === 'walk') {
      if (!e.aware || e.state === 'idle' || e.state === 'investigate' || g.dead) { e.vx = 0; e.vy = 0; }
      else if (!here) {
        const dx = au.home.x - e.x, dy = au.home.y - e.y, d = hyp(dx, dy);
        if (d > TILE) { e.vx = dx / d * A.speed; e.vy = dy / d * A.speed; e.facing = Math.atan2(dy, dx); } else { e.vx = 0; e.vy = 0; }
      } else {
        const d = hyp(g.x - e.x, g.y - e.y);
        if (d > A.stomp.near * TILE) e.chaseGoat(game, A.speed * (1 - A.limp * outN), dt); else { e.vx = 0; e.vy = 0; }
        if (au.stompCd <= 0 && d < A.stomp.range * TILE && game.reaches(e.x, e.y, g.x, g.y)) Automaton.startStomp(e, game, A.stomp.chain[Math.min(outN, A.stomp.chain.length - 1)]);
      }
    } else if (au.state === 'stomp') {
      e.vx = 0; e.vy = 0; au.timer -= dt;
      const S = au.stomp, leg = au.legs[S.leg];
      if (S.phase === 'wind') {
        const p = clamp(1 - au.timer / S.wind, 0, 1), k = p * p * (3 - 2 * p);
        leg.fx = S.from.x + (S.aim.x - S.from.x) * k; leg.fy = S.from.y + (S.aim.y - S.from.y) * k;
        leg.z = A.stomp.lift * Math.min(1, p * 1.5) * (p > 0.85 ? (1 - p) / 0.15 : 1);   // up fast, and down in the last beat
        if (au.timer <= 0) {
          leg.fx = S.aim.x; leg.fy = S.aim.y; leg.z = 0; Automaton.slam(e, game, leg);
          // the run goes on with another leg while it has stomps left and the goat is still in reach
          if (S.left > 0 && !g.dead && here && hyp(g.x - e.x, g.y - e.y) < A.stomp.range * TILE * 1.15 && Automaton.startStomp(e, game, S.left, S.leg)) { /* the next lifts */ }
          else { S.phase = 'hold'; au.timer = A.stomp.hold; }
        }
      } else if (au.timer <= 0) { au.state = 'walk'; au.stomp = null; au.stompCd = A.stomp.cd * (outN ? A.stomp.angry : 1); }
    } else if (au.state === 'fall') {
      e.vx = 0; e.vy = 0; au.timer -= dt;
      const p = clamp(1 - au.timer / A.fall.time, 0, 1);
      au.lift = A.look.lift + (A.look.downLift - A.look.lift) * p * p;
      au.legs.forEach((leg, i) => { const s = Automaton.splay(e, i); leg.fx += (s.x - leg.fx) * Math.min(1, dt * 6); leg.fy += (s.y - leg.fy) * Math.min(1, dt * 6); leg.z *= Math.max(0, 1 - dt * 8); });
      if (au.timer <= 0) Automaton.land(e, game);
    } else if (au.state === 'down') {
      e.vx = 0; e.vy = 0; au.timer -= dt;
      if (au.timer <= 0) Automaton.rise(e, game);
    } else if (au.state === 'rise') {
      e.vx = 0; e.vy = 0; au.timer -= dt;
      const p = clamp(1 - au.timer / A.fall.rise, 0, 1);
      au.lift = A.look.downLift + (A.look.lift - A.look.downLift) * p;
      if (au.timer <= 0) { au.state = 'walk'; au.lift = A.look.lift; e.r = A.r; e.wallR = Math.min(e.r, TUNING.ai.path.squeeze); e.aloft = true; au.stompCd = A.stomp.cd * 0.6; for (const leg of au.legs) { leg.out = 0; leg.hits = 0; leg.stuck = 0; } }
    }
    // The legs: a knocked one hangs and swings off its hip; a stepping one carries its foot over; a planted one far from
    // where it should be takes a step (the gait is the body moving and the feet catching up, two at a time).
    au.legs.forEach((leg, i) => {
      if (au.state === 'fall' || au.state === 'down') return;
      if (leg.out > 0) {
        leg.out -= dt; leg.outT += dt;
        const side = i < 2 ? -1 : 1, sw = L.swing, [dx, dy] = L.spread[i];
        leg.fx = e.x + (dx * sw.out + Math.sin(leg.outT * sw.rate) * sw.amp * side) * TILE;
        leg.fy = e.y + dy * TILE * 0.7 + Math.cos(leg.outT * sw.rate * 0.7) * sw.amp * 0.4 * TILE;
        leg.z = sw.z + Math.cos(leg.outT * sw.rate) * sw.zAmp; leg.step = null;
        if (leg.out <= 0) { leg.out = 0; leg.z = 0; leg.hits = 0; const s = Automaton.restSpot(e, i, game); leg.fx = s.x; leg.fy = s.y; game.dust(s.x, s.y, 4, 0, 0); game.audio.sfxThud(); }
        return;
      }
      if (au.stomp && au.stomp.leg === i) return;
      if (leg.stuck > 0 || leg.brace > 0) return;   // a foot stuck after its stomp, or buckled under a blow, does not step
      if (leg.step) {
        leg.step.t += dt; const p = Math.min(1, leg.step.t / L.step.time);
        leg.fx = leg.step.from.x + (leg.step.to.x - leg.step.from.x) * p; leg.fy = leg.step.from.y + (leg.step.to.y - leg.step.from.y) * p;
        leg.z = Math.sin(p * Math.PI) * L.step.lift;
        if (p >= 1) { leg.step = null; leg.z = 0; game.dust(leg.fx, leg.fy, 2, 0, 0); }
        return;
      }
      const rest = Automaton.restSpot(e, i, game), far = hyp(rest.x - leg.fx, rest.y - leg.fy);
      const moving = hyp(e.vx, e.vy) > 5;
      if (far > (moving ? L.step.far : L.step.home) * TILE && Automaton.canStep(e, i)) leg.step = { from: { x: leg.fx, y: leg.fy }, to: rest, t: 0 };
    });
    // A planted foot is a post: the goat and the men are kept out of it (the body overhead touches nobody).
    if (e.aloft) {
      const R = L.footR;
      const push = (o, r) => { for (const leg of au.legs) { if (leg.out > 0 || leg.z > 2) continue; const dx = o.x - leg.fx, dy = o.y - leg.fy, d = hyp(dx, dy); if (d >= R + r || d === 0) continue; const k = (R + r - d); o.x += dx / d * k; o.y += dy / d * k; } };
      if (!g.dead && g.state !== 'carried' && !g.leap) push(g, g.r);
      for (const o of game.liveEnemies || game.enemies) if (o !== e && !o.dead && !o.held && !o.ghosted && o.state !== 'hop') push(o, o.r);
    }
    if ((au.state === 'walk' || au.state === 'stomp') && Automaton.outCount(e) >= A.fall.legs) Automaton.fall(e, game);
    return true;
  },
  // where a folded leg's foot lies once he is down
  splay(e, i) { const [dx, dy] = TUNING.automaton.legs.spread[i], k = TUNING.automaton.fall.splay; return { x: e.x + dx * k * TILE, y: e.y + dy * k * TILE }; },
  // A stomp of a run of `left`: the planted leg nearest the goat that is not `not` (the one that just came down), lifted over
  // where he will be. False if no leg is free.
  startStomp(e, game, left, not) {
    const A = TUNING.automaton, au = e.auto, g = game.goat, slow = game.mods.enemySlow, first = not === undefined;
    let best = -1, bd = Infinity;
    // a buckled foot is never lifted: it stays where the goat's next blow is coming
    au.legs.forEach((leg, i) => { if (leg.out > 0 || leg.step || i === not || leg.brace > 0) return; const d = hyp(leg.fx - g.x, leg.fy - g.y); if (d < bd) { bd = d; best = i; } });
    if (best < 0) return false;
    // where the goat will be: his run led `lead` s, never further than the leg reaches, always on floor
    let ax = g.x + (g.vx || 0) * A.stomp.lead, ay = g.y + (g.vy || 0) * A.stomp.lead;
    const dx = ax - e.x, dy = ay - e.y, d = hyp(dx, dy), reach = A.stomp.reach * TILE;
    if (d > reach) { ax = e.x + dx / d * reach; ay = e.y + dy / d * reach; }
    const aim = Automaton.onFloor(game, e, ax, ay), leg = au.legs[best];
    au.stomp = { leg: best, aim, from: { x: leg.fx, y: leg.fy }, phase: 'wind', wind: (first ? A.stomp.wind : A.stomp.chainWind) * slow, left: left - 1 };
    au.timer = au.stomp.wind; au.state = 'stomp'; leg.step = null; leg.stuck = 0;
    game.audio.sfxSwing(); game.world.emitNoise(e.x, e.y, TUNING.noise.swing, 'cult');
    return true;
  },
  // The foot comes down: a ring of the floor, the goat in it loses a heart and is thrown, a man in it is thrown and floored
  // (the wall behind him kills, pillar 3), a crate breaks. The foot stays stuck there `legs.stuck` s: one blow takes it out.
  slam(e, game, leg) {
    const A = TUNING.automaton, S = A.stomp, R = S.r * TILE;
    leg.stuck = A.legs.stuck * game.mods.enemySlow;
    game.thud(leg.fx, leg.fy, 9); game.hitstop(0.05); game.audio.sfxThud(); game.vibe(20);
    game.dust(leg.fx, leg.fy, 12, 0, 0); game.ring(leg.fx, leg.fy, R, PALETTE.bone, 0.35, 4);
    game.world.emitNoise(leg.fx, leg.fy, TUNING.noise.swing, 'cult');
    if (game.hidden(leg.fx, leg.fy)) return;
    Automaton.crush(e, game, leg.fx, leg.fy, R, S.damage, S.knock, 'stomp', false);
  },
  crush(e, game, x, y, R, damage, knock, how, kill) {
    const g = game.goat;
    if (!g.dead) {
      const dx = g.x - x, dy = g.y - y, d = hyp(dx, dy);
      if (d < R + g.r && !Talisman.parry(game, e, 'slam') && !g.blockBlow(game, e, false)) {
        const nx = dx / (d || 1), ny = dy / (d || 1);
        g.damage(damage, game, nx * knock * TILE, ny * knock * TILE, false, e);
      }
    }
    for (const o of game.enemies) {
      if (o === e || o.dead || o.held || o.ghosted || o.state === 'hop' || hyp(o.x - x, o.y - y) >= R + o.r) continue;
      const dx = o.x - x, dy = o.y - y, d = hyp(dx, dy) || 1;
      if (kill) o.die(game, 'splat', dx / d, dy / d, how);
      else o.fling(dx / d * TUNING.automaton.stomp.menFling * TILE, dy / d * TUNING.automaton.stomp.menFling * TILE, true);
    }
    for (const p of game.props) {
      if (p.broken || p.held) continue;
      if (Beast.animal(p) && p.birdState !== 'flying' && hyp(p.x - x, p.y - y) < R + (p.r || 0)) Beast.hurt(p, game, 'blow');
      else if (p.kind === 'crate' && hyp(p.x - x, p.y - y) < R + p.r) p.shatter(game);
    }
  },
  // A blow on a leg's foot (`how` for the report). A foot stuck after its stomp, or `force` (a blast), is knocked out by
  // one; any other planted foot by `legs.hits` landed within `legs.heal` s of each other. `fall.legs` out at once: the fall.
  legHit(e, game, i, how, force) {
    const A = TUNING.automaton, au = e.auto, leg = au.legs[i], L = A.legs;
    if (!leg || leg.out > 0 || au.state === 'fall' || au.state === 'down' || au.state === 'rise') return false;
    e.aware = true; leg.hitAt = game.timer; leg.sparkT = 0.35;
    game.audio.sfxSteel(); game.particles(leg.fx, leg.fy - 12, 8, PALETTE.fireHi, 170); game.shake(4); game.hitstop(0.04);
    Stats.blow(game, e, 'leg', how);
    // no words over the legs (13 Oct 2026 playtest: "less text in the fight"): the piston going red says it
    // the first blow buckles it (13 Oct 2026, second playtest): planted and the body sagging over it for `brace` s, so the
    // second blow finds it where the first did
    if (!force && leg.stuck <= 0 && ++leg.hits < L.hits) { leg.brace = L.brace; leg.step = null; leg.z = 0; game.dust(leg.fx, leg.fy, 4, 0, 0); return true; }
    leg.hits = 0; leg.stuck = 0; leg.brace = 0; leg.out = L.out; leg.outT = 0; leg.step = null; leg.z = 0;
    game.audio.sfxCrack && game.audio.sfxCrack();
    if (au.stomp && au.stomp.leg === i) { au.state = 'walk'; au.stomp = null; au.stompCd = A.stomp.cd * 0.5; }
    if (Automaton.outCount(e) >= A.fall.legs && (au.state === 'walk' || au.state === 'stomp')) Automaton.fall(e, game);
    return true;
  },
  fall(e, game) {
    const A = TUNING.automaton, au = e.auto;
    au.state = 'fall'; au.timer = A.fall.time; au.stomp = null; au.bodyHits = 0;
    for (const leg of au.legs) { leg.step = null; leg.out = 0; leg.stuck = 0; }
    game.audio.sfxSwing();
  },
  land(e, game) {
    const A = TUNING.automaton, au = e.auto;
    au.state = 'down'; au.timer = A.fall.down; au.lift = A.look.downLift;
    e.r = A.bodyR; e.wallR = Math.min(e.r, TUNING.ai.path.squeeze); e.aloft = false;
    for (const leg of au.legs) { leg.z = 0; leg.step = null; }
    game.thud(e.x, e.y, 14); game.shake(10); game.hitstop(0.08); game.audio.sfxThud(); game.vibe(40);
    game.dust(e.x, e.y, 26, 0, 0); game.ring(e.x, e.y, A.fall.r * TILE, PALETTE.bone, 0.5, 5);
    game.world.emitNoise(e.x, e.y, TUNING.noise.swing, 'cult');
    // under him when he falls is the one place his weight kills a man: lure his own under him first
    if (!game.hidden(e.x, e.y)) Automaton.crush(e, game, e.x, e.y, A.fall.r * TILE, A.fall.damage, A.fall.knock, 'crush', true);
  },
  // Up again, early once `fall.hearts` have been taken: the frame heaves, and the goat close by is thrown off (no heart).
  rise(e, game) {
    const A = TUNING.automaton, au = e.auto, g = game.goat;
    au.state = 'rise'; au.timer = A.fall.rise;
    game.audio.sfxThud(); game.dust(e.x, e.y, 14, 0, 0); game.ring(e.x, e.y, A.fall.shoveR * TILE, PALETTE.bone, 0.4, 4);
    const dx = g.x - e.x, dy = g.y - e.y, d = hyp(dx, dy);
    if (!g.dead && d < A.fall.shoveR * TILE + g.r) { g.vx = dx / (d || 1) * A.fall.shove * TILE; g.vy = dy / (d || 1) * A.fall.shove * TILE; game.squashGoat(TUNING.juice.squash.hit); }
  },
  // At the top of `Enemy.die`. Standing, nothing reaches the body (a blast reaches the legs, `blast`). Down, a heart a blow
  // without the floored beat (his own state machine holds him), `fall.hearts` a fall, the last of his hearts the real death.
  absorb(e, game, cause, dx, dy, how) {
    const A = TUNING.automaton, au = e.auto; if (!au) return false;
    if (cause === 'fall') return true;
    if (au.state !== 'down') {
      // said once a fight, never again (13 Oct 2026 playtest: "less text")
      if (au.toldAt < 0) { au.toldAt = game.timer; game.floatText(e.x, e.y - 50, 'THE LEGS', PALETTE.ashHi); }
      return true;
    }
    // a fall's hearts taken, the rest of it is iron: he lies `fall.after` s more and heaves (13 Oct 2026, second playtest:
    // "he got up very fast"; he used to rise on the blow itself)
    if (au.bodyHits >= A.fall.hearts) { game.audio.sfxSteel(); game.particles(e.x, e.y - 20, 5, PALETTE.ash, 120); return true; }
    if (e.hp > 1) {
      e.hp -= 1; e.flash = 0.3; e.aware = true;
      Stats.blow(game, e, cause, how);
      game.world.splat(e.x, e.y, dx || 0, dy || 0, 12);
      game.hitstop(0.05); game.shake(7); game.audio.sfxSplat(); game.particles(e.x, e.y - 20, 10, PALETTE.blood, 220);
      if (++au.bodyHits >= A.fall.hearts) au.timer = Math.min(au.timer, A.fall.after);
      return true;
    }
    return false;
  },
  // Every blast that goes through a room (`Prop.blastRoom`; the blasts' own loops skip him): standing, each planted foot in
  // reach is knocked out; down, the body in reach takes a heart, once a chain (`Status.spared`).
  blast(game, x, y, r) {
    for (const e of game.enemies) {
      if (!e.automaton || e.dead || !e.auto) continue;
      const au = e.auto, L = TUNING.automaton.legs;
      if (au.state === 'down') { if (hyp(e.x - x, e.y - y) < r + e.r && game.blastClear(x, y, e.x, e.y) && !Status.spared(game, e)) e.die(game, 'splat', e.x - x, e.y - y, 'blast'); continue; }
      // a blast that reaches a planted foot or the ground under his body brings him down whole, no heart (13 Oct 2026,
      // the bomb machine's point: "throw it at the automaton, the blast drops him, it does not hurt him")
      const reached = au.legs.some((leg) => leg.out <= 0 && leg.z < L.hitZ && hyp(leg.fx - x, leg.fy - y) < r + L.hitR * TILE && game.blastClear(x, y, leg.fx, leg.fy))
        || hyp(e.x - x, e.y - y) < r + e.r;
      if (!reached || au.state === 'fall' || au.state === 'rise') continue;
      if (TUNING.automaton.blastFall) { Stats.blow(game, e, 'leg', 'blast'); Automaton.fall(e, game); }
      else au.legs.forEach((leg, i) => { if (leg.out <= 0 && leg.z < L.hitZ && hyp(leg.fx - x, leg.fy - y) < r + L.hitR * TILE) Automaton.legHit(e, game, i, 'blast', true); });
    }
  },
  // The wreck instead of a corpse (`Game.onKill`): the meat bursts, smoke, and what is left of him stays on the floor, the
  // frame down on its folded legs (`FACTORY_PIXELS.makeWreck` into `game.wrecks`, 13 Oct 2026 playtest: "show his body").
  wreck(game, e) {
    const au = e.auto, A = TUNING.automaton;
    au.state = 'down'; au.lift = A.look.downLift; au.bodyHits = A.fall.hearts;   // closed: the wreck wears no rim
    au.legs.forEach((leg, i) => { const s = Automaton.splay(e, i); leg.fx = s.x; leg.fy = s.y; leg.z = 0; leg.out = 0; leg.hits = 0; leg.sparkT = 0; leg.step = null; });
    const w = typeof FACTORY_PIXELS !== 'undefined' && FACTORY_PIXELS.makeWreck(e);
    if (w) (game.wrecks = game.wrecks || []).push(w);
    game.fx.explosion(e.x, e.y - 24, 40, false, true);
    game.gore(e.x, e.y, 10, 0, -1); game.dust(e.x, e.y, 30, 0, 0);
    for (const leg of au.legs) game.particles(leg.fx, leg.fy - 8, 6, PALETTE.ash, 140);
    game.world.splat(e.x, e.y, 0, 0, 26);
  },
  // The horns (`Goat.headbuttHits`): standing, the feet are what they can reach; down, the body is a man's.
  horns(game, goat, e, ax, ay, extra, HN) {
    const au = e.auto; if (!au) return false;
    if (au.state === 'down') {
      // the body on the floor: nothing throws him (`fling` refuses), so a blow on it is a heart straight off
      const dx = e.x - goat.x, dy = e.y - goat.y;
      if (!Goat.hornHit(HN, dx, dy, ax, ay, goat.r + e.r + 10 + extra, e.r) || !game.reaches(goat.x, goat.y, e.x, e.y)) return true;
      e.lastLunge = goat.lungeId;
      game.hitstop(0.05); game.shake(5); game.audio.sfxThud(); game.kick(-ax, -ay, TUNING.juice.kick); game.zoomPunch(0.8);
      game.impact(goat.x + ax * (goat.r + 6), goat.y + ay * (goat.r + 6), ax, ay); game.squashGoat(TUNING.juice.squash.hit);
      game.hornSplash(e, ax, ay, false);
      e.die(game, 'headbutt', ax, ay, 'horns');
      return true;
    }
    const r = TUNING.automaton.legs.hitR * TILE;
    for (let i = 0; i < 4; i++) {
      const leg = au.legs[i]; if (leg.out > 0 || leg.z > TUNING.automaton.legs.hitZ) continue;
      const dx = leg.fx - goat.x, dy = leg.fy - goat.y;
      if (!Goat.hornHit(HN, dx, dy, ax, ay, goat.r + r + 10 + extra, r)) continue;
      if (!game.reaches(goat.x, goat.y, leg.fx, leg.fy)) continue;
      e.lastLunge = goat.lungeId;
      goat.vx = -ax * 2 * TILE; goat.vy = -ay * 2 * TILE;
      game.kick(-ax, -ay, TUNING.juice.kick * 0.6); game.squashGoat(TUNING.juice.squash.hit); game.impact(leg.fx, leg.fy - 6, ax, ay);
      Automaton.legHit(e, game, i, 'horns');
      return true;
    }
    return true;
  },
  // A thrown thing (`Prop.update`) meeting a foot: the leg takes it and the thing drops there.
  thingHits(game, p, e, spd) {
    const au = e.auto; if (!au || au.state === 'down' || p.passed.indexOf(e) >= 0) return false;
    const r = TUNING.automaton.legs.hitR * TILE;
    for (let i = 0; i < 4; i++) {
      const leg = au.legs[i]; if (leg.out > 0 || leg.z > TUNING.automaton.legs.hitZ) continue;
      if (hyp(leg.fx - p.x, leg.fy - p.y) > r + p.r) continue;
      p.passed.push(e);
      Automaton.legHit(e, game, i, p.kind === 'weapon' ? (p.weapon === 'sword' ? 'sword' : 'shield') : p.kind);
      p.vx *= -0.3; p.vy *= -0.3;
      if (p.kind === 'weapon' && p.uses !== undefined && --p.uses <= 0) p.snap(game);
      return true;
    }
    return false;
  },
  // The carried sword's cut (`Goat.cutWith`) on a foot.
  bladeHits(game, goat, h, e, tx, ty, reach) {
    const au = e.auto; if (!au || au.state === 'down') return false;
    const r = TUNING.automaton.legs.hitR * TILE;
    for (let i = 0; i < 4; i++) {
      const leg = au.legs[i]; if (leg.out > 0 || leg.z > TUNING.automaton.legs.hitZ) continue;
      if (hyp(leg.fx - tx, leg.fy - ty) > r + reach * 0.75) continue;
      if (!game.sees(goat.x, goat.y, leg.fx, leg.fy)) continue;
      Automaton.legHit(e, game, i, 'blade'); game.audio.sfxSteel();
      goat.cutCd = TUNING.prop.weapon.cutGap;
      if (--h.uses <= 0) h.snap(game);
      return true;
    }
    return false;
  },
  // On the floor (`Renderer.drawTelegraph`), all in cells: the stomp's landing ring while a leg is up; under each planted
  // foot what a blow does to it (a stuck one pulses amber: one blow; one that has taken a blow is red: one more); for a leg
  // knocked out, a red meter at its rest spot filling as it comes back; the crush ring as he falls; the body's ring while
  // it lies open, draining as he gets ready to rise.
  drawTell(R, e) {
    const A = TUNING.automaton, au = e.auto; if (!au || e.dead) return;
    const ctx = R.ctx, px = TUNING.effects.pixel * 2, L = A.legs, fr = L.hitR * TILE, pulse = 0.5 + 0.5 * Math.sin(R.t * 9);
    if (au.state === 'stomp' && au.stomp && au.stomp.phase === 'wind') { const p = clamp(1 - au.timer / au.stomp.wind, 0, 1); R.drawLandCells(au.stomp.aim.x, au.stomp.aim.y, A.stomp.r * TILE, p); }
    else if (au.state === 'fall') R.drawLandCells(e.x, e.y, A.fall.r * TILE, clamp(1 - au.timer / A.fall.time, 0, 1));
    ctx.save();
    if (au.state === 'down') {
      const left = clamp(au.timer / A.fall.down, 0, 1), O = A.look.open, open = au.bodyHits < A.fall.hearts;
      // a ring two cells thick round where the body may be struck, draining as he gets ready to rise
      ctx.fillStyle = 'rgba(255,224,138,0.18)'; ctx.beginPath(); R.floorRing(e.x, e.y, e.r + px * 2.5, e.r + px * 0.5, px); ctx.fill();
      ctx.fillStyle = `rgba(255,224,138,${0.55 + 0.4 * pulse})`; ctx.beginPath(); R.floorArc(e.x, e.y, e.r + px * 2.5, e.r + px * 0.5, px, -Math.PI / 2, Math.PI * 2 * left); ctx.fill();
      // While the body is open the floor ring flashes white on the beat (`look.open.rate`); the body itself wears the rest
      // of the tell, a rim and chevrons round the frame (js/factory-pixels.js, `pose().open`), since it stands well above
      // this ring on the screen and hid most of it.
      if (open) { ctx.fillStyle = `rgba(255,248,226,${0.3 + 0.45 * (0.5 + 0.5 * Math.sin(R.t * O.rate))})`; ctx.beginPath(); R.floorRing(e.x, e.y, e.r + px * 2.5, e.r + px * 0.5, px); ctx.fill(); }
    } else if (au.state === 'walk' || au.state === 'stomp') {
      au.legs.forEach((leg, i) => {
        if (leg.out > 0) {
          const s = Automaton.restSpot(e, i, R.game), k = 1 - clamp(leg.out / L.out, 0, 1);
          ctx.fillStyle = 'rgba(192,57,43,0.22)'; ctx.beginPath(); R.floorRing(s.x, s.y, fr, fr - px * 1.2, px); ctx.fill();
          ctx.fillStyle = 'rgba(214,64,48,0.8)'; ctx.beginPath(); R.floorArc(s.x, s.y, fr, fr - px * 1.2, px, -Math.PI / 2, Math.PI * 2 * k); ctx.fill();
          return;
        }
        if (leg.z > L.hitZ) return;
        // a foot that has taken one blow is told by its red piston (js/factory-pixels.js), not a ring on the floor
        if (leg.stuck > 0) { ctx.fillStyle = `rgba(255,224,138,${0.5 + 0.45 * pulse})`; ctx.beginPath(); R.floorRing(leg.fx, leg.fy, fr + px, fr - px * 0.4, px); ctx.fill(); }
      });
    }
    ctx.restore();
  },
  // The picture's pose (js/factory-pixels.js), in texels of the unit frame: the body's bottom row, and each leg's hip,
  // knee and foot. The knee is two bones (`look.thigh`, `look.shin`) bent outward from the body. A stub with no `auto`
  // (the corpse's snapshot, a statue made elsewhere) stands at rest.
  pose(e, t) {
    const A = TUNING.automaton, K = A.look, F = FACTORY_PIXELS, TX = F.TX;
    const au = e.auto || Automaton.restAuto(Object.assign({ x: e.x || 0, y: e.y || 0 }));
    const walking = au.state === 'walk' && hyp(e.vx || 0, e.vy || 0) > 10;
    // a buckled foot sags the body over it, easing back as it braces up
    const sag = au.legs.reduce((m, L) => Math.max(m, clamp((L.brace || 0) / A.legs.brace, 0, 1)), 0) * A.legs.sag;
    const lift = au.lift - sag + (walking ? Math.sin(t * 7) * K.bob : au.state === 'down' ? Math.sin(t * 3) * 1.5 : 0);
    const bodyY = Math.round(-lift / TX);
    const ik = (H, Fp, side) => {
      const Lt = K.thigh, Ls = K.shin, dx = Fp[0] - H[0], dy = Fp[1] - H[1], d = hyp(dx, dy) || 1, ux = dx / d, uy = dy / d;
      if (d >= Lt + Ls - 0.5) return [Math.round(H[0] + ux * Lt), Math.round(H[1] + uy * Lt)];
      const a = Math.acos(clamp((Lt * Lt + d * d - Ls * Ls) / (2 * Lt * d), -1, 1));
      const c1 = [H[0] + (ux * Math.cos(a) - uy * Math.sin(a)) * Lt, H[1] + (ux * Math.sin(a) + uy * Math.cos(a)) * Lt];
      const c2 = [H[0] + (ux * Math.cos(-a) - uy * Math.sin(-a)) * Lt, H[1] + (ux * Math.sin(-a) + uy * Math.cos(-a)) * Lt];
      const k = c1[0] * side > c2[0] * side ? c1 : c2;
      return [Math.round(k[0]), Math.round(k[1])];
    };
    const legs = au.legs.map((L, i) => {
      const hip = [F.HIPS[i][0] - F.W / 2, bodyY - F.H + F.HIPS[i][1]];
      const foot = [Math.round((L.fx - (e.x || 0)) / TX), Math.round(((L.fy - (e.y || 0)) * TILT - L.z) / TX)];
      // knocked out it sparks all the while it hangs, a beat at a time
      const spark = L.sparkT > 0 ? L.sparkT / 0.35 : L.out > 0 ? ((t * 3 + i) % 1) : 0;
      return { hip, knee: ik(hip, foot, i < 2 ? -1 : 1), foot, out: L.out > 0, back: i === 0 || i === 3, planted: L.out <= 0 && L.z < 2, hurt: L.hits > 0 || L.out > 0, spark };
    });
    const breath = au.state === 'down' ? Math.round((0.5 + 0.5 * Math.sin(t * 5)) * 4) / 4 : 0;
    // the body open to the horns (down, a fall's hearts not yet taken): the beat of its rim and chevrons, in four steps
    const open = au.state === 'down' && au.bodyHits < A.fall.hearts ? 0.25 + Math.round((0.5 + 0.5 * Math.sin(t * K.open.rate)) * 3) / 4 : 0;
    const key = legs.map((l) => l.foot.join(',') + l.knee.join(',') + (l.out ? 'o' : '') + (l.hurt ? 'h' : '') + (l.spark > 0 ? Math.round(l.spark * 5) : '')).join('|') + '|' + bodyY + '|' + breath + '|' + open;
    return { legs, bodyY, breath, open, key, bodyShadow: au.state === 'down' || au.state === 'fall' ? [Math.round(44 * (1 - lift / K.lift)), bodyY + 3] : null };
  },
};

// ---- THE FACTORY's rooms as templates (14 Oct 2026, his ask: "three or four new room layouts, so they are interesting") ----
// Hand-authored like js/rooms.js's, with the factory's own legend, laid by `layFactoryRoom` (never by gen.js's parser:
// its pool knows none of these characters). A room is centred on the floor's way-through row, so its middle three rows
// are open at both walls. Each wears one floor and wall of `FACTORY_PIXELS.FLOORS` / `WALLS` on the test floor
// (`flook` / `wlook`), so the looks are seen in rooms and not on a swatch.
//   '#' wall  '.' floor  'O' a drop  'P' a pillar (a boiler or a cabinet stands on it)
//   '>' '<' '^' 'v' a belt tile (a run the same way, rows or columns side by side, is one belt that wide); '0' a belt
//     tile going right with a crate riding it
//   '*' a burner   '!' a ram's strip, two cells side by side in front of the two-tile wall it is bolted to
//   'p' / 'q' a small / a wide press's cells between the two walls it is bolted to (where nothing else lies there;
//     one over a belt goes in `presses`, in the template's own tiles: { size, axis, x | y, a0, a1 })
//   'y' boiler  'c' cabinet  'a' anvil  'd' drums  'n' gas cylinders  'u' cable reel ('dd' side by side is one stack)
//   'j' junk (a look off the tile's hash)  'f' a fixture on the face of the wall above this tile  'L' lamp  'B' brazier
//   'e' clubman  'E' a clubman facing up, at his work  's' sawbot  'W' welder along the room  'V' welder up and down  'A' THE ARM
//   'o' crate  'b' bomb  'N' barrel  'T' a barrel of poison  'w' a sword stand  'S' a shield stand  'h' grass  'H' big grass
const FACTORY_TEMPLATES = [
  // THE ARMS (14 Oct 2026, his ask): three carrier arms bolted down, each with its ring (4.2 tiles: "a bigger radius",
  // twice), the way through winding between them; a barrel of poison and a bowl of coals for the ones in the way (poison, then fire). The men stand off the
  // rings and chase him into them.
  { name: 'arms', title: 'THE ARMS', note: 'ROLL OUT OF THE CLAW', flook: 'PLATES', wlook: 'GIRDER', rows: [
    '##############################',
    '#.............f..............#',
    '#......A................y....#',
    '#............................#',
    '#...................B........#',
    '#.N..........................#',
    '#........e.........e.....A...#',
    '#............................#',
    '#............................#',
    '#...................j........#',
    '#..o.........e...............#',
    '#............................#',
    '#.......................e....#',
    '#.y.........A................#',
    '#..................d.........#',
    '#............................#',
    '##############################',
  ] },
  // THE SCRAPYARD: machines in heaps, two welders driving the one clear row and column through them, sawbots among
  // them. Every heap is a wall to put a man into and cover from the torch, and a boiler or a cabinet takes two blows and
  // breaks, which opens a lane (the room is the weapon, pillar 3; the breakables are new).
  { name: 'scrapyard', title: 'THE SCRAPYARD', note: 'SOME HEAPS BREAK', flook: 'CONCRETE', wlook: 'BRICK', rows: [
    '######f############f######',
    '#.dd.....y........c......#',
    '#........j...n...........#',
    '#....n..........dd...o...#',
    '#.u......dd.........y....#',
    '#..........W.............#',
    '#.j...c.........u.....j..#',
    '#..........a..........e..#',
    '#....y..........s........#',
    '#.........V..............#',
    '#......dd........y.......#',
    '#...n.......a.........dd.#',
    '#.c.......j.......d...w..#',
    '#.......e.........j....s.#',
    '##########################',
  ] },
  // THE WORKSHOP: the men at their boilers and cabinets with their backs to the way in, a belt of crates along the far
  // wall riding into a burner. Stealth is live here: walk up behind one and put him into his own machine.
  { name: 'workshop', title: 'THE WORKSHOP', note: 'COME UP BEHIND THEM', flook: 'BRICK', wlook: 'CORRUGATED', rows: [
    '####f#####f#############',
    '#>0>>>>>0>>>>>>>0>>>>>*#',
    '#w.....j..............o#',
    '#..y.......c.......y...#',
    '#..E.......E...........#',
    '#......................#',
    '#......................#',
    '#..c.......y.......c...#',
    '#..E.........E.........#',
    '#.....j........a.......#',
    '#..n....y.......u...s..#',
    '#.............j......e.#',
    '########################',
  ] },
  // THE CAROUSEL: a ring of belts round a slab of stone (two rows thick: a thicker block has a core no side shows, which the
  // fog paints black), clockwise, carrying whoever stands on it round: under two rams punching off the far wall into the
  // slab on the top lane, and under a wide press across the bottom lane. The men stand on the strips between; a man
  // chasing him across a lane rides it into the ram or the press (the cult sets off its own trap, the trap-room
  // references' rule 5).
  { name: 'carousel', title: 'THE CAROUSEL', note: 'IT CARRIES THEM IN', flook: 'CHECKER', wlook: 'FURNACE', rows: [
    '########################',
    '#y.f.....!!..!!......c.#',
    '#....>>>>>>>>>>>>vv....#',
    '#....>>>>>>>>>>>>vv..j.#',
    '#....^^..e...e...vv..s.#',
    '#....^^..........vv....#',
    '#....^^e########.vv....#',
    '#....^^.########evv....#',
    '#....^^..........vv..N.#',
    '#j...^^....e.....vv....#',
    '#....^^<<<<<<<<<<<<....#',
    '#....^^<<<<<<<<<<<<....#',
    '#......................#',
    '#.................j....#',
    '#......e...........e...#',
    '#u....................d#',
    '########################',
  ], presses: [{ size: 'w', axis: 'v', x: 13, a0: 8, a1: 16, phase: 0.5 }] },
  // THE GANTRY: walks over the drop. The way through is the middle walk, cut once by a one-tile gap (the roll); the four
  // branches off it are belts carrying UP toward the void, with the bait at the bottom ends (grass, a bomb, a blade, a
  // crate). A man butted onto a branch rides off the edge; a welder drives the middle walk.
  { name: 'gantry', title: 'THE GANTRY', note: 'BELTS TO THE EDGE', flook: 'GRATE', wlook: 'GIRDER', rows: [
    '##########################',
    '#OOOOOOOOOOOOOOOOOOOOOOOO#',
    '#OOOOOO^^OOOOOOOO^^OOOOOO#',
    '#OOOOOO^^OOOOOOOO^^OOOOOO#',
    '#OOOOOO^^OOOOOOOO^^OOOOOO#',
    '#OOOOOO^^OOOOOOOO^^OOOOOO#',
    '#OOOOOO^^OOOOOOOO^^OOOOOO#',
    '#...e.......O..e.......s.#',
    '#...........O.e...j.W....#',
    '#...........O............#',
    '#OOOOOO^^OOOOOOOO^^OOOOOO#',
    '#OOOOOO^^OOOOOOOO^^OOOOOO#',
    '#OOOOOO^^OOOOOOOO^^OOOOOO#',
    '#OOOOOOHbOOOOOOOOwoOOOOOO#',
    '##########################',
  ], gap: { x: 12, y0: 7, y1: 9 } },
];
// the kinds of man the factory deals; `factoryLevel`'s `man` turns any other into a sawbot
const FACTORY_MEN = ['sawbot', 'welder', 'automaton', 'arm'];
const FACTORY_MACHINE_CHARS = { y: 'boiler', c: 'cabinet', a: 'anvil', d: 'drums', n: 'cylinders', u: 'reel' };
// Lays `tpl` with its top-left at tile (x0, y0) into `C`: { tiles, W, put(kind, tx, ty, opts), man(kind, tx, ty, opts),
// machines, chasms, gaps, room (the room record, for the chasm), noMen }. Men are left out with `noMen` (THE SHOWROOM).
function layFactoryRoom(tpl, x0, y0, C) {
  const rows = tpl.rows, h = rows.length, w = rows[0].length, at = (x, y) => y * C.W + x, ch = (tx, ty) => (rows[ty] || '')[tx] || '#';
  const hash = (x, y) => { let v = (x * 73856093) ^ (y * 19349663) ^ ((tpl.name.length + 1) * 83492791); v = (v ^ (v >>> 13)) * 1274126177; return (v ^ (v >>> 16)) >>> 0; };
  const WALL = '#P', FLOOR_LIKE = '.>0<^vx*!pqlycazdnutjfLBeEsWVobNTwShH';
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    const c = ch(tx, ty), X = x0 + tx, Y = y0 + ty;
    C.tiles[at(X, Y)] = WALL.includes(c) ? T.WALL : c === 'O' ? T.PIT : T.FLOOR;
    if (c === 'O' && tpl.gap && tx === tpl.gap.x && ty >= tpl.gap.y0 && ty <= tpl.gap.y1) C.gaps.add(at(X, Y));
  }
  if (tpl.gap) {
    const cut = []; for (let ty = tpl.gap.y0; ty <= tpl.gap.y1; ty++) cut.push(at(x0 + tpl.gap.x, y0 + ty));
    C.chasms.push({ room: C.room.index, axis: 'v', at: x0 + tpl.gap.x, lo: y0 + tpl.gap.y0, hi: y0 + tpl.gap.y1, far: 1, tiles: cut, lesson: false });
  }
  const done = new Set(), key = (tx, ty) => ty * w + tx;
  // belts: a run of one way, then the rows (or columns) beside it that match, as one belt that wide
  const BELT = { '>': 'r', '0': 'r', '<': 'l', '^': 'u', v: 'd' }, same = (a, b) => (BELT[a] || null) === (BELT[b] || null) && BELT[a];
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    const c = ch(tx, ty); if (!BELT[c] || done.has(key(tx, ty))) continue;
    const hor = BELT[c] === 'r' || BELT[c] === 'l';
    let n = 1; while (same(c, ch(tx + (hor ? n : 0), ty + (hor ? 0 : n)))) n++;
    let wide = 1; while (true) { let ok = true; for (let k = 0; k < n; k++) if (!same(c, ch(tx + (hor ? k : wide), ty + (hor ? wide : k))) || done.has(key(tx + (hor ? k : wide), ty + (hor ? wide : k)))) { ok = false; break; } if (!ok) break; wide++; }
    for (let j = 0; j < wide; j++) for (let k = 0; k < n; k++) { const qx = tx + (hor ? k : j), qy = ty + (hor ? j : k); done.add(key(qx, qy)); if (ch(qx, qy) === '0') C.put('crate', x0 + qx, y0 + qy); }
    C.machines.push({ kind: 'belt', tx: x0 + tx, ty: y0 + ty, n, dir: BELT[c], w: wide });
  }
  // presses: the cells of one between its two walls; rams: a pair of strip cells with their wall beside them
  for (const pc of ['p', 'q']) for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    if (ch(tx, ty) !== pc || done.has(key(tx, ty))) continue;
    let x1 = tx, y1 = ty; while (ch(x1 + 1, ty) === pc) x1++; while (ch(tx, y1 + 1) === pc) y1++;
    for (let qy = ty; qy <= y1; qy++) for (let qx = tx; qx <= x1; qx++) done.add(key(qx, qy));
    const vert = (y1 - ty) > (x1 - tx), size = pc === 'q' ? 'w' : 's';
    if (vert) C.machines.push({ kind: 'press', size, axis: 'v', x: (x0 + (tx + x1 + 1) / 2) * TILE, y0: (y0 + ty) * TILE, y1: (y0 + y1 + 1) * TILE, phase: (tx * 0.7) % 2 });
    else C.machines.push({ kind: 'press', size, x0: (x0 + tx) * TILE, x1: (x0 + x1 + 1) * TILE, y: (y0 + (ty + y1 + 1) / 2) * TILE, phase: (ty * 0.7) % 2 });
  }
  for (const p of tpl.presses || []) {
    if (p.axis === 'v') C.machines.push({ kind: 'press', size: p.size, axis: 'v', x: (x0 + p.x) * TILE, y0: (y0 + p.a0) * TILE, y1: (y0 + p.a1) * TILE, phase: p.phase || 0, quick: !!p.quick });
    else C.machines.push({ kind: 'press', size: p.size, x0: (x0 + p.a0) * TILE, x1: (x0 + p.a1) * TILE, y: (y0 + p.y) * TILE, phase: p.phase || 0, quick: !!p.quick });
  }
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    if (ch(tx, ty) !== '!' || done.has(key(tx, ty))) continue;
    const pair = ch(tx + 1, ty) === '!' ? 'h' : 'v';   // the two strip cells side by side: punching down or up; one over the other: left or right
    done.add(key(tx, ty)); done.add(key(tx + (pair === 'h' ? 1 : 0), ty + (pair === 'v' ? 1 : 0)));
    if (pair === 'h') { const up = WALL.includes(ch(tx, ty - 1)); C.machines.push({ kind: 'ram', axis: 'v', x: (x0 + tx + 1) * TILE, a: (y0 + ty + (up ? 0 : 1)) * TILE, dir: up ? 1 : -1, phase: (tx * 0.37) % 1.5 }); }
    else { const left = WALL.includes(ch(tx - 1, ty)); C.machines.push({ kind: 'ram', axis: 'h', y: (y0 + ty + 1) * TILE, a: (x0 + tx + (left ? 0 : 1)) * TILE, dir: left ? 1 : -1, phase: (ty * 0.37) % 1.5 }); }
  }
  // everything else, a cell at a time
  const F = typeof FACTORY_PROPS !== 'undefined' ? FACTORY_PROPS : { JUNK: ['gears'], FIXES: ['gauge'] };
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    const c = ch(tx, ty), X = x0 + tx, Y = y0 + ty, hs = hash(X, Y);
    if (done.has(key(tx, ty))) continue;
    if (FACTORY_MACHINE_CHARS[c]) {
      // a pair side by side is one machine centred on both (a lathe, a bench, the drums)
      const pair = c === 'd' && ch(tx + 1, ty) === c && !done.has(key(tx + 1, ty));   // two drums side by side are one stack centred on both
      if (pair) done.add(key(tx + 1, ty));
      C.put('machine', X + (pair ? 0.5 : 0), Y, { look: FACTORY_MACHINE_CHARS[c] });
    }
    else if (c === '*') C.machines.push({ kind: 'burner', tx: X, ty: Y, phase: -tx * 0.25 - ty * 0.05 });
    else if (c === 'j') C.put('junk', X, Y, { look: F.JUNK[hs % F.JUNK.length], turn: (hs >>> 8) % 4 });
    else if (c === 'f') C.put('wallfix', X, Y, { look: F.FIXES[hs % F.FIXES.length] });
    else if (c === 'L') C.put('lamp', X, Y);
    else if (c === 'B') C.put('brazier', X, Y);
    else if (c === 'o') C.put('crate', X, Y);
    else if (c === 'b') C.put('bomb', X, Y);
    else if (c === 'N') C.put('barrel', X, Y);
    else if (c === 'T') C.put('barrel', X, Y, { toxic: true });
    else if (c === 'w') C.put('weapon', X, Y, { weapon: 'sword' });
    else if (c === 'S') C.put('weapon', X, Y, { weapon: 'shield' });
    else if (c === 'h') C.put('heal', X, Y);
    else if (c === 'H') C.put('heal', X, Y, { big: true });
    else if (!C.noMen) {
      if (c === 'e') C.man('bearer', X, Y);
      else if (c === 'E') C.man('bearer', X, Y, { facing: -Math.PI / 2 });
      else if (c === 's') C.man('sawbot', X, Y);
      else if (c === 'W') C.man('welder', X, Y, { waxis: 'x' });
      else if (c === 'V') C.man('welder', X, Y, { waxis: 'y' });
      else if (c === 'A') C.man('arm', X, Y);   // THE ARM, bolted where it stands
    }
  }
  return { w, h };
}

// ---- THE FACTORY test floor ---------------------------------------------------------------------------------------
// Laid, not rolled (`FACTORY_LEVEL.factory`, from `generateLevel`), after js/showroom.js's recipe: twenty-three rooms in a row on
// a 620 x 78 world (wider than the generator's 420 since 14 Oct 2026), every tile stone but what is carved, no fog surprises (`seen`), its own stone through
// `zoneDefs`. Every room its own size and crowd (14 Oct 2026). Room 0 the way in, 1 THE SAW HALL (tall: three sawbots, a
// bowl of coals and two barrels of poison, four pillars), 2 THE WELDERS' LANE (long and low: two welders driving its length,
// blocks to step behind), 3 THE GRATES (a ring round a block), 4 THE DROP (a rifleman and a hound across it), 5 THE BOILER
// ROOM (the biggest: barrels, bombs, a chandelier, a thrower), 6 THE WORKS (two chambers, all of it at once), the
// factory's own traps (js/machines.js, `level.machines`): 7 THE LESSON (one of each, nobody in it),
// 8 THE CRUSHER, 9 THE BURNERS, 10 THE PRESS GATE, 11 THE LINE, 12 THE BELTS (five lanes), 13 THE GRILL (162 burners in a
// wave), 14 THE HAMMERS (rams down both walls), 15 THE CATWALK (a walk over a drop, two rams, gaps, a burning bridge, two
// wide presses), 16 a breather, 17 THE RING (the automaton with
// two sawbots at his feet, THE BOMB MACHINE behind its burners, stands of swords, the stairs out).
function factoryLevel(def, seed) {
  const W = 620, H = 78, tiles = new Uint8Array(W * H).fill(T.WALL), zones = new Uint8Array(W * H);
  const zoneDefs = [def];   // the four template rooms add a zone each (their floor and wall)
  def.met = new Set(Object.keys(THREAT)); def.known = new Set();
  const rooms = [], props = [], spawns = [], hints = [], controls = [], chasms = [], gaps = new Set(), windows = new Set(), carpets = [], grass = [], machines = [];
  const at = (x, y) => y * W + x, P = (tx, ty) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
  const put = (kind, tx, ty, opts) => props.push(Object.assign(P(tx, ty), { kind }, opts || {}));
  const label = (text, tx, ty, w, big) => hints.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, w: (w || 6) * TILE, text, big: !!big });
  const fill = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[at(x, y)] = t; };
  const room = (x, y, w, h, name) => {
    fill(x + 1, y + 1, x + w - 2, y + h - 2, T.FLOOR);
    const r = { x, y, w, h, index: rooms.length, markers: [], role: name === 'the ring' ? 'arena' : 'mix', seen: true, drawn: false, name, tpl: { name, rows: [] } };
    rooms.push(r); return r;
  };
  // Nobody from the floors below works here (15 Oct 2026, his: "no ordinary enemies on this level; a wing of two or three
  // floors of its own, so no clubmen: stronger robots with saws stand in for them"): any kind but the factory's own is a sawbot.
  const man = (kind, tx, ty, opts) => spawns.push(Object.assign(P(tx, ty), spawnKind(FACTORY_MEN.includes(kind) ? kind : 'sawbot'), { roomIndex: rooms.length - 1 }, opts || {}));
  const mid = 30;   // the row every way through is cut on
  let x = 6, prev = null;
  const join = (r) => { if (prev) fill(prev.x + prev.w - 1, mid, r.x, mid + 2, T.FLOOR); prev = r; };
  // 0: the way in
  { const r = room(x, mid - 4, 10, 10, 'the way in'); join(r);
    label('THE FACTORY · A TEST FLOOR', x + 5, mid - 2, 8, true); label('THREE MACHINES, ONE A ROOM', x + 5, mid - 1, 8);
    put('crate', x + 2, mid + 3); put('weapon', x + 7, mid + 3, { weapon: 'sword' });
    x += 10 + 3; }
  // 14 Oct 2026 playtest ("many similar rooms, almost the same in size and in what is in them"): every room its own shape
  // and its own crowd. A tall hall, a long low lane, a ring round a block, a wide drop, a big boiler room, two chambers.
  // 1: THE SAW HALL, tall and narrow: the way through crosses its middle, sawbots above and below among four pillars, a
  // bowl of coals at the top and two barrels of poison to show what a hot one does with them
  { const r = room(x, mid - 10, 14, 23, 'the saw hall'); join(r);
    const ix = x + 1, iy = mid - 9;
    label('SAWBOTS: FIRE HEATS THEM RED', ix + 6, iy + 0.6, 11); label('POISON ON A HOT ONE: BOOM', ix + 6, iy + 1.6, 11);
    for (const [dx, dy] of [[3, 7], [8, 7], [3, 14], [8, 14]]) tiles[at(ix + dx, iy + dy)] = T.WALL;
    put('brazier', ix + 2, iy + 4); put('barrel', ix + 9, iy + 4, { toxic: true }); put('barrel', ix + 2, iy + 16, { toxic: true });
    put('crate', ix + 1, iy + 19); put('crate', ix + 10, iy + 19); put('crate', ix + 6, iy + 18);
    man('sawbot', ix + 6, iy + 5); man('sawbot', ix + 9, iy + 11); man('sawbot', ix + 4, iy + 17);
    x += 14 + 3; }
  // 2: THE WELDERS' LANE, long and low: two welders driving its length on the two outer rows, and blocks of stone down the
  // middle, so the way through steps into a lane between them; a bomb and a blade on the floor
  { const r = room(x, mid - 3, 30, 8, 'the welders lane'); join(r);
    const ix = x + 1, iy = mid - 2;
    label('WELDERS: ONE LINE EACH · STEP OFF IT', ix + 3, iy + 2.6, 5);
    for (const dx of [7, 14, 21]) { tiles[at(ix + dx, iy + 2)] = T.WALL; tiles[at(ix + dx, iy + 3)] = T.WALL; }
    put('crate', ix + 2, iy); put('crate', ix + 25, iy + 5); put('weapon', ix + 11, iy + 5, { weapon: 'sword' }); put('bomb', ix + 18, iy);
    man('welder', ix + 23, iy + 1, { waxis: 'x' }); man('welder', ix + 10, iy + 4, { waxis: 'x' });
    x += 30 + 3; }
  // 13 Oct 2026 (his ask: "more rooms, to walk through and try the traps and check the enemies"): the machines
  // against the floor's own traps, one trap a room, then all of it at once and a breather before the ring.
  // 3: THE GRATES, a ring round a block of stone: no straight way through, and each way round crosses a band of fire
  // grates; three clubmen (who burn) and a sawbot (who does not), one more grate under a crate
  { const r = room(x, mid - 7, 18, 18, 'the grates'); join(r);
    const ix = x + 1, iy = mid - 6;
    // the factory's grates are burners, not teeth (13 Oct 2026 playtest, `p.flame`); fire only heats a sawbot, but one
    // soaked in the barrel's poison and then lit goes off
    label('FIRE GRATES · TWO WAYS ROUND', ix + 2, iy + 7, 4);
    fill(ix + 5, iy + 5, ix + 10, iy + 10, T.WALL);
    for (const [y0, y1] of [[0, 4], [11, 15]]) for (let dy = y0; dy <= y1; dy++) { put('spike', ix + 7, iy + dy, { flame: true }); put('spike', ix + 8, iy + dy, { flame: true }); }
    put('spike', ix + 13, iy + 2, { hidden: true, flame: true }); put('crate', ix + 13, iy + 2);
    put('crate', ix + 3, iy + 3); put('weapon', ix + 1, iy + 1, { weapon: 'sword' }); put('barrel', ix + 2, iy + 12, { toxic: true });
    man('bearer', ix + 12, iy + 3); man('bearer', ix + 13, iy + 13); man('bearer', ix + 4, iy + 14); man('sawbot', ix + 14, iy + 7);
    x += 18 + 3; }
  // 4: THE DROP, wide and shallow: a chasm wall to wall (the roll carries him over, `level.gaps`), two sawbots on its far
  // lip to be butted in, a rifleman at the back with holes in front of him, and a hound that hops the gap
  { const r = room(x, mid - 5, 24, 12, 'the drop'); join(r);
    const ix = x + 1, iy = mid - 4, c = ix + 7, cut = [];
    label('ROLL OVER · BUTT THEM IN', ix + 13, iy + 0.5, 11);
    for (let ty = iy; ty <= iy + 9; ty++) { tiles[at(c, ty)] = T.PIT; cut.push(at(c, ty)); gaps.add(at(c, ty)); }
    chasms.push({ room: r.index, axis: 'v', at: c, lo: iy, hi: iy + 9, far: 1, tiles: cut, lesson: true });
    controls.push({ x: (ix + 3) * TILE, y: (iy + 7.5) * TILE, w: 5 * TILE, part: 5, chasm: r.index });   // E - ROLL before the lip
    fill(ix + 13, iy + 1, ix + 14, iy + 2, T.PIT); fill(ix + 15, iy + 7, ix + 16, iy + 8, T.PIT);
    put('crate', ix + 2, iy + 1); put('bomb', ix + 2, iy + 3);
    man('sawbot', ix + 9, iy + 3); man('sawbot', ix + 9, iy + 7);
    man('hunter', ix + 19, iy + 4); man('dog', ix + 17, iy + 6);
    x += 24 + 3; }
  // 5: THE BOILER ROOM, the biggest: barrels in clusters among a grid of boilers, bombs and a chandelier, a welder driving
  // down the middle column, so the torch lights what stands by its line, and a thrower with crates to throw
  { const r = room(x, mid - 9, 26, 21, 'the boiler room'); join(r);
    const ix = x + 1, iy = mid - 8;
    label('THE TORCH LIGHTS BARRELS TOO', ix + 6, iy + 0.5, 10);
    for (const dx of [5, 11, 17]) for (const dy of [4, 14]) tiles[at(ix + dx, iy + dy)] = T.WALL;
    for (const [dx, dy] of [[9, 6], [10, 6], [10, 7], [14, 15], [14, 16], [15, 16], [20, 6], [21, 6]]) put('barrel', ix + dx, iy + dy);
    put('barrel', ix + 3, iy + 16, { toxic: true }); put('bomb', ix + 4, iy + 2); put('bomb', ix + 20, iy + 17);
    put('lamp', ix + 1, iy + 1); put('lamp', ix + 22, iy + 1); put('crate', ix + 2, iy + 9); put('crate', ix + 15, iy + 8); put('crate', ix + 9, iy + 12);
    // the ring over the way through, its rope tied off at a cleat on the far wall by the way in
    put('chandelier', ix + 7, iy + 9, { cid: 70 }); props.push({ x: (ix + 3.5) * TILE, y: (r.y + 1.25) * TILE, kind: 'cleat', cid: 70 });
    man('welder', ix + 12, iy + 3, { waxis: 'y' });
    man('thrower', ix + 19, iy + 10); man('sawbot', ix + 18, iy + 3);
    x += 26 + 3; }
  // 6: THE WORKS: two chambers with a wall of stone between them and a door's width through it at top and bottom. The
  // near one a shieldman and a sawbot over a patch of grating; the far one two welders crossing (one along, one up and
  // down), a sawbot and a clubman. Burners at the far wall (13 Oct 2026, second playtest: "those spikes only in the cave").
  { const r = room(x, mid - 8, 28, 18, 'the works'); join(r);
    const ix = x + 1, iy = mid - 7;
    label('ALL OF THEM AT ONCE', ix + 5, iy + 0.5, 9);
    fill(ix + 12, iy, ix + 13, iy + 1, T.WALL); fill(ix + 12, iy + 4, ix + 13, iy + 11, T.WALL); fill(ix + 12, iy + 14, ix + 13, iy + 15, T.WALL);
    for (const [dx, dy] of [[5, 4], [18, 4], [18, 11]]) tiles[at(ix + dx, iy + dy)] = T.WALL;
    for (let dx = 6; dx < 9; dx++) for (let dy = 11; dy < 14; dy++) put('spike', ix + dx, iy + dy, { flame: true });
    for (const dx of [2, 9, 16, 23]) machines.push({ kind: 'burner', tx: ix + dx, ty: iy + 15, phase: -dx * 0.1 });
    put('weapon', ix + 2, iy + 2, { weapon: 'sword' }); put('weapon', ix + 2, iy + 12, { weapon: 'shield' }); put('weapon', ix + 24, iy + 2, { weapon: 'sword' });
    put('brazier', ix + 21, iy + 5); put('barrel', ix + 22, iy + 9); put('crate', ix + 16, iy + 13);
    man('shield', ix + 9, iy + 7); man('sawbot', ix + 8, iy + 3);
    man('welder', ix + 22, iy + 2, { waxis: 'x' }); man('welder', ix + 24, iy + 10, { waxis: 'y' });
    man('sawbot', ix + 17, iy + 8); man('bearer', ix + 20, iy + 13);
    x += 28 + 3; }
  // The factory's own traps (js/machines.js, 13 Oct 2026, his ask: "the press, the belt, the burning grates; rooms with
  // them"): one machine a room first (the crusher, the burners), then two together (the press gate), then all three on
  // one line (14 Oct 2026, the trap-room references: Mega Man's Metal Man, Isaac, Katana Zero teach one hazard before they mix).
  // Every room's presses, rams and burners run down once its men are dead (`TUNING.machine.stop`): the way on is free.
  // 7: THE LESSON (14 Oct 2026, his ask: "a simple training room"): nobody in it, each machine once along the way through,
  // in the order the rooms after it bring them: a belt that carries, a column of burners, a ram off a block of stone, a
  // press across the way out. No men, so nothing here ever stops (`TUNING.machine.stop`): it can be watched and tried.
  { const r = room(x, mid - 6, 22, 12, 'the lesson'); join(r);
    const ix = x + 1, iy = mid - 5;
    label('THE LESSON · NOBODY HERE', ix + 3.5, iy + 1, 6, true);
    machines.push({ kind: 'belt', tx: ix, ty: mid, n: 6, dir: 'r', w: 2 }); put('crate', ix + 1, mid);
    label('IT CARRIES', ix + 3, mid - 1.6, 5);
    for (let ty = iy; ty <= iy + 9; ty++) machines.push({ kind: 'burner', tx: ix + 8, ty, phase: -(ty - iy) * 0.05 });
    label('IT GLOWS, THEN BURNS', ix + 10.5, mid - 3.4, 4);
    fill(ix + 12, iy, ix + 13, mid - 3, T.WALL);
    machines.push({ kind: 'ram', axis: 'v', x: (ix + 13) * TILE, a: (mid - 2) * TILE, dir: 1, phase: -0.8 }); put('crate', ix + 12, mid + 1);
    label('IT SHOVES', ix + 12.5, mid + 3.6, 4);
    fill(ix + 16, iy, ix + 17, mid - 3, T.WALL); fill(ix + 16, mid + 4, ix + 17, iy + 9, T.WALL);
    machines.push({ kind: 'press', size: 's', axis: 'v', x: (ix + 17) * TILE, y0: (mid - 2) * TILE, y1: (mid + 4) * TILE, phase: 0.4 });
    label('IT CRUSHES', ix + 19, mid - 3.4, 3);
    x += 22 + 3; }
  // 8: THE CRUSHER: the wide press across the way, six tiles of jaw from the stone above and below: run it while it is open
  { const r = room(x, mid - 7, 20, 16, 'the crusher'); join(r);
    const ix = x + 1, iy = mid - 6;
    label('THE CRUSHER: RUN IT WHILE IT IS OPEN', ix + 3, iy + 0.6, 6);
    label('THEM DEAD, IT STOPS', ix + 3, iy + 1.6, 6);
    fill(ix + 6, iy, ix + 11, iy + 1, T.WALL); fill(ix + 6, iy + 12, ix + 11, iy + 13, T.WALL);
    machines.push({ kind: 'press', size: 'w', axis: 'v', x: (ix + 9) * TILE, y0: (iy + 2) * TILE, y1: (iy + 12) * TILE, phase: 0.6 });
    put('crate', ix + 2, iy + 3); put('weapon', ix + 2, iy + 11, { weapon: 'sword' });
    // a shieldman to butt into the jaws from behind his board's side (14 Oct 2026: a crowd of its own, not two clubmen again)
    man('shield', ix + 15, iy + 7); man('bearer', ix + 16, iy + 3); man('sawbot', ix + 16, iy + 11);
    x += 20 + 3; }
  // 9: THE BURNERS, long and low (14 Oct 2026: its own shape): four columns of burning grates across the way, lit in a
  // wave; two hounds who run through fire after him and burn for it, and a sawbot, who does not
  { const r = room(x, mid - 4, 30, 10, 'the burners'); join(r);
    const ix = x + 1, iy = mid - 3;
    label('BURNERS: THE GRATE GLOWS, THEN IT BURNS', ix + 2, iy + 0.6, 4);
    [5, 11, 17, 23].forEach((dx, k) => { for (let dy = 0; dy < 8; dy++) machines.push({ kind: 'burner', tx: ix + dx, ty: iy + dy, phase: -k * 1.2 - dy * 0.06 }); });
    put('barrel', ix + 8, iy + 1); put('crate', ix + 2, iy + 6); put('barrel', ix + 20, iy + 6, { toxic: true });
    man('dog', ix + 14, iy + 2); man('dog', ix + 20, iy + 5); man('sawbot', ix + 26, iy + 4);
    x += 30 + 3; }
  // 10: THE PRESS GATE, square: a wall across the room with a small press in its one opening, its jaws from the stone above
  // and below closing across the way through; a belt running back through it toward the way in; a small press in the near
  // corner, bolted wall to wall, crates to feed it, and a thrower on the far side who throws them back
  { const r = room(x, mid - 8, 18, 18, 'the press gate'); join(r);
    const ix = x + 1, iy = mid - 7;
    label('THE PRESS: CROSS WHILE IT IS OPEN · PUT THEM IN IT', ix + 11, iy + 0.6, 8);
    fill(ix + 6, iy, ix + 7, iy + 4, T.WALL); fill(ix + 6, iy + 11, ix + 7, iy + 15, T.WALL);
    machines.push({ kind: 'press', size: 's', axis: 'v', x: (ix + 7) * TILE, y0: (iy + 5) * TILE, y1: (iy + 11) * TILE, phase: 0 });
    machines.push({ kind: 'press', size: 's', x0: ix * TILE, x1: (ix + 6) * TILE, y: (iy + 1) * TILE, phase: 1.7 });
    machines.push({ kind: 'belt', tx: ix + 1, ty: mid, n: 13, dir: 'l', w: 2 });   // two tiles across (second playtest), the jaws meet on its middle
    put('crate', ix + 2, iy + 4); put('crate', ix + 4, iy + 12); put('barrel', ix + 2, iy + 14); put('crate', ix + 13, iy + 13); put('crate', ix + 10, iy + 3);
    man('thrower', ix + 12, iy + 3); man('bearer', ix + 10, iy + 9); man('sawbot', ix + 14, iy + 11);
    x += 18 + 3; }
  // 11: THE LINE: a belt of barrels riding into a burner (they go up one after another), and a belt of crates under a
  // press; whoever steps on either rides it too. Both belts two tiles across and the press on the clock of a quick one
  // (13 Oct 2026, second playtest: "these on two tiles", "this press more often"), the room a row taller for them.
  { const r = room(x, mid - 5, 24, 17, 'the line'); join(r);
    const ix = x + 1, iy = mid - 4;
    label('THE LINE: WHAT RIDES IT GOES IN', ix + 11, iy + 3.6, 10);
    machines.push({ kind: 'belt', tx: ix + 1, ty: iy + 1, n: 15, dir: 'r', w: 2 });
    for (const dy of [1, 2]) machines.push({ kind: 'burner', tx: ix + 16, ty: iy + dy, phase: 0 });
    put('barrel', ix + 2, iy + 1); put('barrel', ix + 6, iy + 2); put('barrel', ix + 10, iy + 1);
    fill(ix + 3, iy + 8, ix + 4, iy + 8, T.WALL);
    machines.push({ kind: 'press', size: 's', axis: 'v', x: (ix + 4) * TILE, y0: (iy + 9) * TILE, y1: (iy + 15) * TILE, phase: 0.9, quick: true });
    machines.push({ kind: 'belt', tx: ix + 1, ty: iy + 11, n: 19, dir: 'l', w: 2 });
    put('crate', ix + 9, iy + 11); put('crate', ix + 13, iy + 12); put('crate', ix + 17, iy + 11);
    man('bearer', ix + 14, iy + 8); man('sawbot', ix + 19, iy + 3); man('sawbot', ix + 20, iy + 9);
    x += 24 + 3; }
  // 12: THE BELTS (14 Oct 2026, his ask: "a room with very many conveyors"): five lanes two tiles across the whole room, in
  // turn right and left, and every lane but the goat's own (the middle one, toward the way out) ends in a pair of
  // burners. What stands on a lane goes in: barrels and crates ride to the fire from the moment he is near (the machines
  // sleep until then), the men stand on the strips between the lanes and cross them to reach him. Shove one onto a lane.
  { const r = room(x, mid - 7, 24, 16, 'the belts'); join(r);
    const ix = x + 1, iy = mid - 6;
    label('THE BELTS: EVERY LANE ENDS IN FIRE', ix + 11, iy + 2, 16);
    [['r', 0], ['l', 3], ['r', 6], ['l', 9], ['r', 12]].forEach(([dir, dy], k) => {
      machines.push({ kind: 'belt', tx: ix + 3, ty: iy + dy, n: 16, dir, w: 2 });
      if (dy === 6) return;   // the goat's lane, to the way out
      const bx = dir === 'r' ? ix + 19 : ix + 2;
      for (const j of [0, 1]) machines.push({ kind: 'burner', tx: bx, ty: iy + dy + j, phase: -k * 0.7 - j * 0.1 });
    });
    put('barrel', ix + 6, iy); put('barrel', ix + 13, iy + 1); put('crate', ix + 15, iy + 3); put('crate', ix + 9, iy + 4);
    put('barrel', ix + 12, iy + 10, { toxic: true }); put('barrel', ix + 7, iy + 12); put('crate', ix + 14, iy + 13);
    man('bearer', ix + 10, iy + 5); man('bearer', ix + 15, iy + 11); man('bearer', ix + 7, iy + 2);
    man('sawbot', ix + 21, iy + 8);
    x += 24 + 3; }
  // 13: THE GRILL (14 Oct 2026, his ask: "at least half the room fire grates"): a field of burners across
  // the room's height, lit in a wave from the way in toward the way out, so the fire walks across the room and the
  // goat walks behind it; two cold pockets of floor in it, men waiting on the far side and in the pockets. Of its 288
  // tiles 162 are grates. A sawbot walks the fire red-hot.
  // 14 Oct 2026: tall, not wide (its own shape), ten columns of grates the room's whole height, and a rifleman on the far
  // side firing across the fire while the goat waits for the wave.
  { const r = room(x, mid - 10, 18, 20, 'the grill'); join(r);
    const ix = x + 1, iy = mid - 9, cold = (c, ry) => (c >= 5 && c <= 7 && ry >= 2 && ry <= 4) || (c >= 9 && c <= 11 && ry >= 12 && ry <= 14);
    label('THE GRILL: WALK BEHIND THE FIRE', ix + 1, iy + 0.5, 3);
    for (let c = 3; c <= 12; c++) for (let ry = 0; ry < 18; ry++) if (!cold(c, ry)) machines.push({ kind: 'burner', tx: ix + c, ty: iy + ry, phase: -(c - 3) * 0.28 - ry * 0.02 });
    put('crate', ix + 1, iy + 15); put('barrel', ix + 15, iy + 1);
    man('bearer', ix + 6, iy + 3); man('bearer', ix + 10, iy + 13); man('hunter', ix + 14, iy + 5); man('sawbot', ix + 14, iy + 14);
    x += 18 + 3; }
  // 14: THE HAMMERS (14 Oct 2026, "something else"): a hall seven tiles deep, rams in both long walls staggered along it and
  // fired in a rolling wave, each punching four tiles out across the hall: a man caught is thrown across it into the far
  // wall (the wall kills, the ram only throws), the goat is knocked off his feet. The gaps between two rams are where to wait.
  { const r = room(x, mid - 3, 26, 9, 'the hammers'); join(r);
    const ix = x + 1, iy = mid - 2;
    label('THE HAMMERS: THEY THROW, THE WALL KILLS', ix + 1, iy + 5.4, 3);
    // each one punches right across, its face to the far wall's (`to`, 15 Oct 2026, his)
    for (const c of [3, 9, 15, 21]) machines.push({ kind: 'ram', axis: 'v', x: (ix + c + 1) * TILE, a: iy * TILE, to: (iy + 7) * TILE, dir: 1, phase: -c * 0.12, shove: 20 });
    for (const c of [6, 12, 18]) machines.push({ kind: 'ram', axis: 'v', x: (ix + c + 1) * TILE, a: (iy + 7) * TILE, to: iy * TILE, dir: -1, phase: -c * 0.12 - 1, shove: 20 });
    put('crate', ix + 0, iy + 0); put('weapon', ix + 1, iy + 0, { weapon: 'shield' });
    man('bearer', ix + 8, iy + 3); man('bearer', ix + 14, iy + 2); man('bearer', ix + 20, iy + 4); man('sawbot', ix + 23, iy + 3);
    x += 26 + 3; }
  // 15: THE CATWALK (13 Oct 2026 playtest: "a long room, a chasm inside, the way through narrow; sometimes a bridge
  // between the drops; and the wide pressing walls"): the room is a drop but for a walk two tiles across from door to
  // door, cut twice by a one-tile gap (the roll), narrowed to one tile over a bridge, and twice it runs between the
  // jaws of a wide press bolted to stone standing in the drop, which shoves whoever is caught off the edge or crushes
  // him. Second playtest the same day: first two RAMS off the stone either side of the walk ("walls that hit", one
  // from above, one from below, a beat apart), and the bridge burns ("fire here too": burners under its grating).
  // A clubman between the rams, a sawbot on the bridge, a welder at the far landing firing down the walk.
  { const r = room(x, mid - 6, 38, 14, 'the catwalk'); join(r);
    const ix = x + 1, iy = mid - 5, pit = (x0, y0, x1, y1) => fill(x0, y0, x1, y1, T.PIT);
    pit(ix, iy, ix + 35, iy + 11);
    fill(ix, mid - 2, ix + 2, mid + 3, T.FLOOR); fill(ix + 33, mid - 2, ix + 35, mid + 3, T.FLOOR);   // the landings
    fill(ix + 3, mid, ix + 32, mid + 1, T.FLOOR);                                                       // the walk
    label('THE CATWALK', ix + 1.5, mid - 2.6, 6);
    // the rams, each on a pillar of stone in the drop, punching across the walk and past it
    fill(ix + 4, iy, ix + 5, mid - 3, T.WALL); fill(ix + 7, mid + 4, ix + 8, iy + 11, T.WALL);
    machines.push({ kind: 'ram', axis: 'v', x: (ix + 5) * TILE, a: (mid - 2) * TILE, dir: 1, phase: 0 });
    machines.push({ kind: 'ram', axis: 'v', x: (ix + 8) * TILE, a: (mid + 4) * TILE, dir: -1, phase: -1.4 });
    // the gaps the roll carries him over
    for (const c of [ix + 10, ix + 30]) {
      const cut = []; for (let ty = mid; ty <= mid + 1; ty++) { tiles[at(c, ty)] = T.PIT; cut.push(at(c, ty)); gaps.add(at(c, ty)); }
      chasms.push({ room: r.index, axis: 'v', at: c, lo: mid, hi: mid + 1, far: 1, tiles: cut, lesson: false });
    }
    // the two wide presses, their mounts on stone standing in the drop above and below the walk
    [[ix + 12, 0], [ix + 23, 1.3]].forEach(([c0, ph]) => {
      fill(c0, iy, c0 + 5, mid - 3, T.WALL); fill(c0, mid + 4, c0 + 5, iy + 11, T.WALL);
      machines.push({ kind: 'press', size: 'w', axis: 'v', x: (c0 + 3) * TILE, y0: (mid - 2) * TILE, y1: (mid + 4) * TILE, phase: ph });
    });
    // the bridge: one tile across, a grating with rails, and burners under it lit end to end
    pit(ix + 19, mid + 1, ix + 21, mid + 1);
    machines.push({ kind: 'bridge', tx: ix + 19, ty: mid, n: 3, dir: 'h' });
    for (let k = 0; k < 3; k++) machines.push({ kind: 'burner', tx: ix + 19 + k, ty: mid, phase: -k * 0.25 });
    put('bomb', ix + 1, mid + 3);
    man('bearer', ix + 6, mid + 1); man('sawbot', ix + 20, mid);
    man('welder', ix + 34, mid, { waxis: 'x' });
    x += 38 + 3; }
  // 16-19 (14 Oct 2026): the four rooms laid from `FACTORY_TEMPLATES`, each in a zone of its own wearing one floor and
  // wall of the looks to choose from (js/factory-pixels.js), its names on the floor.
  for (const tpl of FACTORY_TEMPLATES) {
    const h = tpl.rows.length, w = tpl.rows[0].length, y0 = mid - Math.floor(h / 2);
    const r = room(x, y0, w, h, tpl.name);
    const z = zoneDefs.length; zoneDefs.push(Object.assign({}, def, { flook: tpl.flook, wlook: tpl.wlook }));
    for (let ty = y0 - 1; ty <= y0 + h; ty++) for (let tx = x - 1; tx <= x + w; tx++) if (tx >= 0 && ty >= 0 && tx < W && ty < H) zones[at(tx, ty)] = z;
    layFactoryRoom(tpl, x, y0, { tiles, W, put, man, machines, chasms, gaps, room: r });
    join(r);   // after the template, which lays the room's own walls over `room`'s shell
    const ly = y0 + (tpl.name === 'gantry' ? 8.2 : 0.3);   // the gantry's words on its walk, the others' under the far wall
    label(tpl.title, x + w / 2 - 0.5, ly, w - 2, true); label(tpl.flook + ' · ' + tpl.wlook + ' WALL', x + w / 2 - 0.5, ly + 1.3, w - 2);
    if (tpl.note) label(tpl.note, x + w / 2 - 0.5, ly + 2.1, w - 2);   // one short line each (the floor font is big), so nothing wraps over the line above
    x += w + 3;
  }
  // 16: a breather before the ring: grass, blades, a bomb, nobody
  { const r = room(x, mid - 4, 10, 10, 'the breather'); join(r);
    const ix = x + 1, iy = mid - 3;
    label('A BREATHER', ix + 4, iy + 0.5, 8);
    put('heal', ix + 2, iy + 2); put('heal', ix + 5, iy + 2, { big: true });
    put('weapon', ix + 2, iy + 7, { weapon: 'sword' }); put('weapon', ix + 5, iy + 7, { weapon: 'shield' }); put('bomb', ix + 7, iy + 7);
    x += 10 + 3; }
  // 17: THE RING. No words on its floor (13 Oct 2026 playtest: "less text in the fight"); the boss bar says his one line.
  // THE BOMB MACHINE in the top-left corner behind a fence of burners lit in a wave (its playtest: "press its button,
  // wait or run while it makes one, throw it at the automaton: the blast drops him"), two more bombs on the floor.
  { const r = room(x, mid - 7, 24, 17, 'the ring'); join(r);
    const ix = x + 1, iy = mid - 6;
    put('dispenser', ix + 3, iy + 1);
    for (let dx = 0; dx <= 5; dx++) machines.push({ kind: 'burner', tx: ix + dx, ty: iy + 4, phase: -dx * 0.3 });
    for (let dy = 0; dy <= 3; dy++) machines.push({ kind: 'burner', tx: ix + 6, ty: iy + dy, phase: -(9 - dy) * 0.3 });
    put('brazier', ix + 19, iy + 12); put('weapon', ix + 2, iy + 12, { weapon: 'sword' }); put('weapon', ix + 19, iy + 2, { weapon: 'sword' });
    put('crate', ix + 10, iy + 13); put('bomb', ix + 3, iy + 7); put('bomb', ix + 18, iy + 9);
    man('automaton', ix + 14, iy + 7);   // his own kind of boss: no champion's heart on top, the bar names him all the same
    man('sawbot', ix + 11, iy + 4); man('sawbot', ix + 11, iy + 11); }
  // the way out: the last room's far wall, a flight of stairs behind an iron door, as every floor's
  const last = rooms[rooms.length - 1], ey = mid;
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) tiles[at(last.x + last.w - 1 + dx, ey + dy)] = T.EXIT;
  props.push({ x: (last.x + last.w - 1.5) * TILE, y: (ey + 1) * TILE, kind: 'door', vertical: true, iron: true, stair: true, fromRoom: last.index });
  const first = rooms[0];
  return { W, H, tiles, rooms, spawns, props, start: P(first.x + 3, mid + 1), exit: { x: (last.x + last.w) * TILE, y: (ey + 1) * TILE },
    exitTile: { x0: last.x + last.w - 1, y0: ey }, forkTile: null, entry: null, seed, def,
    hints, controls, chasms, gaps, cagePrompt: null, vault: null, windows, plan: null, gates: [], sealedArenas: [], shop: null,
    grass, zones, zoneDefs, carpets, statues: null, sacrifice: null, machines };
}
if (typeof module !== 'undefined') module.exports = { Sawbot, Welder, Automaton, Arm, factoryLevel, FACTORY_TEMPLATES, layFactoryRoom };
