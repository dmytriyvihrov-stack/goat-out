// Statuses: poison, and what happens where two of the three things that can be wrong with a man
// meet. Stun is `Enemy.dazed` (the stars) and fire is `Enemy.burning`; both are older than this
// file and stay where they are. What lives here is poison itself, the three reactions, the puddles
// on the floor, the glob the goat spits and the things he throws dripping or burning. Every number
// is `TUNING.status`, and the STATUS tab of the tool draws that block. FIREBRAND's burning line
// lives here too, beside VENOM JAW's drip, because they are the same hold read two ways.
//
//   POISON + FIRE  the poison goes off (`blast`)
//   POISON + STUN  shock: both run much longer, no hit (`sting`)
//   STUN   + FIRE  the fire does two hits, not one (`Enemy.scald`)
//
// The goat is poisoned too (30 Sep 2026: "the player is affected by poison, like the enemies, only
// for him a certain time has to pass, as in fire"). A man has it the moment he stands in a puddle; the
// goat fills a ring round his feet first (`Status.goat`, `TUNING.goat.poison.build` seconds, longer for
// every poison soul he carries, never at all with all four: `BOON_SETS`), and all it does to him is slow
// him. Every puddle is still one of his own souls': the ring is the price of standing in his own work.
const Status = {
  // Poison a man. Where it lands on something already wrong with him it reacts instead of stacking.
  poison(game, e, t) {
    if (e.dead || e.ghosted) return;
    if (typeof ShieldGen !== 'undefined' && ShieldGen.holds(e)) { ShieldGen.refuse(game, e, false); return; }   // under a generator's dome (js/factory.js); poison is no blow, the dome stays
    // Iron (THE FACTORY's sawbot and automaton, js/factory.js): poison finds nothing in it to sicken.
    // The sawbot is soaked by it instead (`Sawbot.soak`): soaked and hot, it goes off.
    if (e.immunity && e.immunity.poison) { if (typeof Sawbot !== 'undefined') { if (e.sawbot || e.arm) Sawbot.soak(game, e); else Sawbot.shrug(game, e, 'poison'); } return; }
    if (e.burning > 0) { Status.blast(game, e.x, e.y, TUNING.status.blast, e); return; }
    if (e.dazed > 0) { Status.sting(game, e); return; }
    const fresh = e.poison <= 0;
    if (fresh) {
      game.floatText(e.x, e.y - 30, 'POISONED', PALETTE.venomHi);
      game.particles(e.x, e.y - 8, 6, PALETTE.venom, 90);
      // A rifle mid-aim or a mage mid-cast loses it: blind is blind now, not at the next shot.
      if (e.state === 'aim' || e.state === 'cast') { e.state = 'chase'; e.rune = null; }
    }
    e.poison = Math.max(e.poison, t || TUNING.status.poison.time);
    // All four poison souls (`BOON_SETS.poison`): the poison itself is a blow, once as it takes him,
    // never again while it is topped up by the puddle he stands in.
    if (fresh && game.mods.poisonHurts) e.die(game, 'poison', 0, 0);
  },

  // He has just been stunned. Poison already in him turns it into shock.
  stunned(game, e) {
    if (e.poison > 0 && !e.dead) Status.sting(game, e);
  },

  // SHOCK. Both statuses stretched long and no hit: `e.shock` is what the renderer reads to put one
  // mark over his head instead of stars and bubbles. Already in shock, it only tops the clocks up,
  // a puddle under a dazed man would otherwise announce it every frame.
  sting(game, e) {
    const S = TUNING.status.sting;
    if (e.immunity && e.immunity.poison) return;   // iron takes no shock either
    // Not on a kind the stars do nothing to (the rat ogre, the wraith): SHOCK froze the rat ogre
    // nearly five seconds, standing, where a crate alone gives him under three on the floor.
    // × ENEMY ATTACK undoes that dev slider (folded into `enemySlow`): it speeds blows, not a sting.
    const stunProof = e.cfg && e.cfg.immune && e.cfg.immune.stun;
    if (!stunProof) e.dazed = Math.max(e.dazed, S.stun * game.mods.enemySlow * (game.dev && game.dev.tune ? game.dev.tune.enemyAttack : 1));
    e.poison = Math.max(e.poison, S.poison);
    // What it breaks is what `daze` breaks. Only on a man the stars take: the rat ogre's swing and a
    // wraith's arrival ride it out (it used to cancel both, where nothing else may), and every other
    // windup, the butcher's hook, the slam, the leap's crouch, a hound's dart, froze under the stars
    // with its strip still on the floor and went off when they cleared.
    if (!stunProof && e.state === 'hookwind') e.hookCd = TUNING.champion.hook.cooldown * game.mods.enemySlow;
    if (!stunProof && (e.state === 'aim' || e.state === 'cast' || e.state === 'windup' || e.state === 'hookwind'
        || e.state === 'slamwind' || e.state === 'hopwind' || e.state === 'dart' || e.state === 'dodge' || e.state === 'retreat')) {
      e.state = 'chase'; e.rune = null; e.dashPath = null;
    }
    // A hook out of his hand is let go of, with the wait for the next one, as `daze` lets it go.
    if (!stunProof && e.hook) e.dropHook(game);
    if ((e.shock || 0) > 0) { e.shock = Math.max(e.shock, e.dazed); return; }
    e.shock = e.dazed;
    game.floatText(e.x, e.y - 40, 'SHOCK', PALETTE.venomHi);
    game.particles(e.x, e.y - 6, 12, PALETTE.venomHi, 180);
    game.ring(e.x, e.y, e.r * 2.4, PALETTE.venom);
    game.audio.sfxThud(); game.hitstop(0.04);
  },

  // `n` hits, each one through `die` so a two-heart man still eats the first and goes down.
  hurt(game, e, n, cause) {
    for (let k = 0; k < n && !e.dead; k++) e.die(game, cause, 0, 0);
  },

  // A small bomb: the poison meeting a flame. Everybody inside `hitR`
  // takes a hit, everybody out to `radius` is thrown, the goat is shoved and never hurt, and any
  // poison on the floor inside it is burnt off so one puddle cannot go off twice.
  // A blast's hearts are once a chain: true while `o` is still spared by the last blast that hurt him
  // (`blast.guard` s), and otherwise he is marked hurt now. The poison blast, the bomb and BOMB CHARGE all
  // ask it, so a bomb by a poison barrel is two hearts at most, not three in one frame (2 Oct 2026).
  spared(game, o) {
    const G = TUNING.status.blast.guard;
    if (!G) return false;
    if (o.blastAt !== undefined && game.timer - o.blastAt < G) return true;
    o.blastAt = game.timer; return false;
  },

  blast(game, x, y, B, source, green = true) {
    const R = B.radius * TILE, w = game.world;
    game.fx.explosion(x, y, R * 0.8, green ? 'venom' : false, false, undefined, R);   // the green set, so a puddle going off is not a bomb
    game.particles(x, y, 18, green ? PALETTE.venomHi : PALETTE.fireHi, 300);
    game.particles(x, y, 10, green ? PALETTE.venom : PALETTE.fire, 220);
    game.ring(x, y, R, green ? PALETTE.venomHi : PALETTE.fireHi);
    w.scorch(x, y, R * 0.35);
    if (game.scatter) game.scatter.burst(x, y, R);   // a suit of armour and a supper go over in it, as in any blast
    game.thud(x, y, 8); game.hitstop(0.05); game.audio.sfxBoom(); game.vibe(30);
    w.emitNoise(x, y, TUNING.noise.boom);
    if (green) game.floatText(x, y - 36, 'IT GOES OFF', PALETTE.venomHi);
    const cx = Math.floor(x / TILE), cy = Math.floor(y / TILE), r = Math.ceil(B.radius);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const tx = cx + dx, ty = cy + dy;
      if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) continue;
      const i = w.idx(tx, ty); if (w.poison[i] > 0) { w.poison[i] = 0; w.poisonOn.delete(i); }
    }
    for (const o of game.enemies) {
      if (o.dead || o.held || o.ghosted || o.automaton) continue;   // THE AUTOMATON is `Prop.blastRoom`'s (js/factory.js)
      const ddx = o.x - x, ddy = o.y - y, d = hyp(ddx, ddy);
      if (d > R + o.r) continue;
      if (o !== source && !game.blastClear(x, y, o.x, o.y)) continue;
      const nx = ddx / (d || 1), ny = ddy / (d || 1);
      o.poison = 0;
      if (d <= B.hitR * TILE + o.r || o === source) {
        // `hits` hearts once, not once a blast: the rest of the chain it set off passes him by for
        // `guard` s (`TUNING.status.blast`).
        const hits = B.hits || 1;
        if (Status.spared(game, o)) continue;
        // Hearts, but never out of the air: a leap over a drop knocked down is a fall to his death.
        if (o.kind === 'butcher') { o.hp -= hits; o.flash = 0.2; if (o.state !== 'hop') { o.state = 'stagger'; o.timer = 0.4; } if (o.hp <= 0) o.die(game, 'boom', nx, ny); else Stats.blow(game, o, 'boom'); }
        else for (let k = 0; k < hits && !o.dead; k++) o.die(game, 'boom', nx, ny);
      } else if (o.kind !== 'butcher') o.fling(nx * B.impulse, ny * B.impulse, true);
    }
    const g = game.goat, gd = hyp(g.x - x, g.y - y);
    if (!g.dead && gd < R + g.r) { g.vx += (g.x - x) / (gd || 1) * B.goatPush; g.vy += (g.y - y) / (gd || 1) * B.goatPush; }
    Prop.blastRoom(game, x, y, R, false);   // the barrels, lamps and crates round it too
  },

  // A square of poison: `half` tiles either side of the tile the point is in. Whoever is standing
  // in it now has it now, rather than on the next step.
  puddle(game, x, y, half) {
    const w = game.world, cx = Math.floor(x / TILE), cy = Math.floor(y / TILE), t = TUNING.status.poison.pool;
    for (let dy = -half; dy <= half; dy++) for (let dx = -half; dx <= half; dx++) w.poisonTile(cx + dx, cy + dy, t);
    game.particles(x, y, 10 + half * 6, PALETTE.venom, 140);
    game.particles(x, y, 6, PALETTE.venomHi, 90);
    w.emitNoise(x, y, TUNING.noise.splat);
    game.audio.sfxSplat();
    Status.soak(game);
  },

  // A splash of `n` tiles: the one the point is in and `n - 1` of the eight round it, at random,
  // the glob lands ragged, not as a square.
  spatter(game, x, y, n) {
    const w = game.world, cx = Math.floor(x / TILE), cy = Math.floor(y / TILE), t = TUNING.status.poison.pool;
    const ring = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const k = w.tileAt(cx + dx, cy + dy);
      if ((dx || dy) && k !== T.WALL && k !== T.PIT) ring.push([cx + dx, cy + dy]);
    }
    // A centre that cannot hold poison (a pillar the point sits on) hands its share to the ring.
    const c = w.tileAt(cx, cy), mid = c !== T.WALL && c !== T.PIT;
    if (mid) w.poisonTile(cx, cy, t);
    for (let k = 0; k < n - (mid ? 1 : 0) && ring.length; k++) { const [tx, ty] = ring.splice((Math.random() * ring.length) | 0, 1)[0]; w.poisonTile(tx, ty, t); }
    game.particles(x, y, 14, PALETTE.venom, 140);
    game.particles(x, y, 6, PALETTE.venomHi, 90);
    w.emitNoise(x, y, TUNING.noise.splat);
    game.audio.sfxSplat();
    Status.soak(game);
  },

  // Everybody standing in poison has it.
  soak(game, dt) {
    const w = game.world; if (!w.poisonOn.size) return;
    for (const e of game.enemies) {
      if (e.dead || e.ghosted || e.held) continue;
      if (w.isPoisonPx(e.x, e.y)) { Status.poison(game, e); if (dt) Status.drops(game, e, dt * 0.5); }
    }
  },

  // Drops of it off the hooves (or the boots) of anyone moving through a puddle (`status.look.drops` a second at a
  // full stride): the one thing that says the floor is wet while he is on it, not only green.
  drops(game, o, dt) {
    const sp = hyp(o.vx || 0, o.vy || 0); if (sp < 40) return;
    if (Math.random() >= dt * TUNING.status.look.drops * Math.min(1, sp / 160)) return;
    game.parts.push({ x: o.x + (Math.random() - 0.5) * 12, y: o.y + 3, vx: -o.vx * 0.25 + (Math.random() - 0.5) * 50, vy: -o.vy * 0.25 - 40 - Math.random() * 50,
      life: 0.22 + Math.random() * 0.2, color: Math.random() < 0.5 ? PALETTE.venom : PALETTE.venomHi, size: 2 });
  },

  // Once a step: the puddles dry, a puddle a flame reaches goes off, the glob flies, and whatever he
  // threw dripping or burning does its thing on the way and once it comes down.
  update(game, dt) {
    const w = game.world;
    let lit = null;
    for (const i of w.poisonOn) {
      w.poison[i] -= dt;
      if (w.poison[i] <= 0) { w.poison[i] = 0; w.poisonOn.delete(i); continue; }
      if (w.fire[i] > 0 && lit === null) lit = i;
    }
    // poison run under a burning brazier goes off as if the floor were alight (1 Oct 2026, playtest)
    if (lit === null && w.poisonOn.size) for (const p of game.hazards) {
      if (p.kind !== 'brazier' || p.broken) continue;
      const i = w.idx(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
      if (w.poison[i] > 0) { lit = i; break; }
    }
    // One blast a step at most, and it burns off the puddle round it: a big puddle lit at one
    // corner goes off in a short chain rather than all at once, which reads as it catching.
    if (lit !== null) Status.blast(game, (lit % w.W + 0.5) * TILE, (((lit / w.W) | 0) + 0.5) * TILE, TUNING.status.blast, null);
    Status.soak(game, dt);
    Status.updateGlobs(game, dt);
    Status.updateWebs(game, dt);   // WEB SPIT's web (below)
    Status.updateCarried(game);
  },

  // ---- the goat's side of it ----

  // The goat in a puddle, once a step from `Goat.update`. The ring round his feet (`g.venomFill`,
  // 0..1) fills over `build` s plus the poison souls' grace (`mods.poisonGuard`) while he stands in
  // one and drains at `drain` a second out of it; full, he is poisoned `time` s (`g.poisoned`) and
  // runs at `moveMul`, topped up for as long as he stays in it. Nothing else: no heart, no blindness.
  // In the air (a leap, a fall) his hooves are not in it.
  goat(game, g, dt) {
    const P = TUNING.goat.poison, m = game.mods;
    const inIt = !m.poisonImmune && !g.leap && g.state !== 'falling' && game.world.isPoisonPx(g.x, g.y);
    if (g.poisoned > 0) g.poisoned = Math.max(0, g.poisoned - dt);
    if (inIt) Status.drops(game, g, dt);
    if (inIt && g.poisoned > 0) { g.poisoned = P.time; g.venomFill = 1; return; }
    if (!inIt) { g.venomFill = Math.max(0, (g.venomFill || 0) - dt * P.drain); return; }
    g.venomFill = (g.venomFill || 0) + dt / (P.build + (m.poisonGuard || 0));
    if (g.venomFill < 1) return;
    g.venomFill = 1; g.poisoned = P.time;
    game.floatText(g.x, g.y - 34, 'POISONED', PALETTE.venomHi);
    game.particles(g.x, g.y - 8, 8, PALETTE.venom, 100);
    game.audio.sfxSplat();
  },

  // SPLASH: the head goes down and whatever is at his back gets it.
  splash(game, g) {
    const S = TUNING.status.splash, R = S.range * TILE;
    let n = 0;
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted) continue;
      const dx = e.x - g.x, dy = e.y - g.y, d = hyp(dx, dy);
      if (d > R + e.r || (dx * g.aim.x + dy * g.aim.y) / (d || 1) > S.back) continue;
      Status.poison(game, e); n++;
    }
    for (let k = 0; k < 10; k++) {
      const a = Math.atan2(-g.aim.y, -g.aim.x) + (Math.random() - 0.5) * 2.2, sp = 90 + Math.random() * 160;
      game.parts.push({ x: g.x, y: g.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3 + Math.random() * 0.25,
        color: Math.random() < 0.5 ? PALETTE.venom : PALETTE.venomHi, size: 2.5 + Math.random() * 2.5 });
    }
    if (n) game.audio.sfxSplat();
  },

  // What leaves his mouth after `venomHold` / `brandHold` seconds is marked on the way out. A
  // firebrand remembers where the goat stood (`ox`, `oy`, for `brand.gap`) and the last point of
  // its flight that has been laid (`lx`, `ly`).
  markThrow(game, g, h) {
    const m = game.mods;
    if (m.venomHold > 0 && g.holdTimer >= m.venomHold) { h.venom = true; h.venomHit = null; }
    if (m.brandHold > 0 && g.holdTimer >= m.brandHold) {
      h.brand = { ox: g.x, oy: g.y, lx: h.x, ly: h.y };
      // A crate goes out of his mouth alight (25 Sep 2026): whoever it lands on catches, and it
      // breaks into its one burning tile, the brand a crate carried through fire already was.
      if (h.kind === 'crate' && !h.alight) h.alight = 'fire';
      // A man goes out of it alight too (6 Oct 2026 playtest, "with the fire throw he catches as well"):
      // `ignite` before the fling, which keeps `burning` and only takes the state for the flight.
      if (h instanceof Enemy) h.ignite(game);
      game.audio.sfxFire();
    }
  },
  // How far along the hold is, 0..1, for whichever of the two is on. The renderer rings the thing.
  holdCharge(game, g) {
    const m = game.mods, need = m.brandHold || m.venomHold;
    return need > 0 && g.holding ? clamp(g.holdTimer / need, 0, 1) : 0;
  },

  // A thing thrown dripping poisons the floor under its whole flight, whoever it passes through,
  // and a puddle where it stops. A thing thrown burning lights the floor it has flown over; a crate
  // is alight as well, so the man it meets catches (`Prop.update`). "Stops" is the same test for a man and a crate: no longer flying, or no longer
  // there at all.
  updateCarried(game) {
    const w = game.world, J = TUNING.status.jaw;
    // Any thing thrown through fire catches for the rest of its flight, as a crate always did (a crate, a bomb and a barrel
    // keep their own rules), and lying still again it is out (13 Oct 2026 playtest: "what I throw sets a man alight if it
    // is burning"; a blade thrown through the welder's jet hit the man behind it cold).
    for (const p of game.props) {
      if (p.kind === 'crate' || p.kind === 'bomb' || p.kind === 'barrel') continue;
      if (!p.flung || p.broken || p.held) { if (p.alight) p.alight = null; continue; }
      if (!p.alight && w.isBurningPx(p.x, p.y)) p.alight = w.isWitchPx(p.x, p.y) ? 'witch' : 'fire';
    }
    const each = (o, isMan) => {
      if (!o.venom && !o.brand && !(!isMan && o.alight)) return;
      // An animal flies on its own flag, a shell's `flying`, a kicked hen's `birdState`, not `flung`.
      const up = o.flung || o.flying || o.birdState === 'flying';
      const flying = isMan ? o.state === 'flung' && !o.dead : up && !o.broken && !o.held;
      if (flying) {
        if (o.venom) {
          w.poisonTile(Math.floor(o.x / TILE), Math.floor(o.y / TILE), TUNING.status.poison.pool);
          // Poison splashes: whoever it meets on the way has it, not only whoever stands in it after.
          for (const e of game.enemies) {
            if (e === o || e.dead || e.held || e.ghosted || (o.venomHit && o.venomHit.has(e))) continue;
            if (hyp(e.x - o.x, e.y - o.y) > e.r + (o.r || 0) + J.touch) continue;
            (o.venomHit || (o.venomHit = new Set())).add(e);
            Status.poison(game, e);
          }
        }
        if (o.brand) Status.brandTrail(game, o);
        // burning, a firebrand's or caught on the way: whoever it meets catches (a man thrown alight is one already)
        if (!isMan && (o.brand || o.alight)) {
          const witch = o.alight === 'witch' || !!(o.brand && o.brand.witch);
          for (const e of game.enemies) {
            if (e.dead || e.held || e.ghosted || e.burning > 0 || e === o.byCult) continue;
            if (hyp(e.x - o.x, e.y - o.y) > e.r + (o.r || 0) + J.touch) continue;
            e.ignite(game, witch);
          }
        }
        if (Math.random() < 0.6) game.particles(o.x, o.y, 1, o.brand || o.alight ? PALETTE.fireHi : PALETTE.venom, 60);
        return;
      }
      const venom = o.venom;
      o.venom = false; o.venomHit = null; o.brand = null;
      if (venom) Status.puddle(game, o.x, o.y, J.half);
    };
    for (const e of game.enemies) each(e, true);
    for (const p of game.props) each(p, false);
  },

  // FIREBRAND: the floor it has crossed since the last step catches, a line, and nothing else. Only
  // tiles it has already left are lit, never the one it is over, so what it is (a man most of all)
  // does not fly into its own trail and catch; nothing within `brand.gap` tiles of where the goat
  // stood when it left his mouth, and never the tile he is on now. Walked in half-tile steps, so a
  // fast throw leaves no gaps. Ordinary fire: EMBER COAT turns it, and a man reads it as a hazard.
  brandTrail(game, o) {
    const w = game.world, B = TUNING.status.brand, b = o.brand, g = game.goat;
    const tile = (x, y) => Math.floor(y / TILE) * w.W + Math.floor(x / TILE);
    const here = tile(o.x, o.y), goat = tile(g.x, g.y);
    const n = Math.max(1, Math.ceil(hyp(o.x - b.lx, o.y - b.ly) / (TILE * 0.5)));
    for (let k = 0; k < n; k++) {
      const x = b.lx + (o.x - b.lx) * k / n, y = b.ly + (o.y - b.ly) * k / n, t = tile(x, y);
      if (t === here || t === goat || hyp(x - b.ox, y - b.oy) < B.gap * TILE) continue;
      w.ignite(Math.floor(x / TILE), Math.floor(y / TILE), true, B.burn, b.witch);
    }
    b.lx = o.x; b.ly = o.y;
  },

  // VENOM SPIT: a glob along the pointer. It bursts on the first wall, man or solid thing it meets,
  // or where it runs out of range, and leaves three tiles by three of poison.
  // WEB SPIT (`web`, 15 Oct 2026) is the same glob in silk, bursting into web (`webSpatter`) instead of poison.
  spit(game, g, web) {
    const S = web ? TUNING.status.web : TUNING.status.spit;
    g.screamCd = game.mods.screamCooldown; g.screaming = 0.3;
    // BIG LUNGS: the glob flies further (`mods.screamReach`), at the same speed.
    game.globs.push({ x: g.x + g.aim.x * 14, y: g.y + g.aim.y * 14, vx: g.aim.x * S.speed, vy: g.aim.y * S.speed,
      life: S.range * (game.mods.screamReach || 1) * TILE / S.speed, web: !!web });
    game.audio.sfxSwing(); game.audio.sfxBleat(380, 0.14, 0.18); game.vibe(12);
    game.world.emitNoise(g.x, g.y, TUNING.noise.swing);
  },
  updateGlobs(game, dt) {
    const w = game.world;
    for (const b of game.globs) {
      b.life -= dt;
      const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
      let burst = b.life <= 0;
      if (w.isSolid(Math.floor(nx / TILE), Math.floor(ny / TILE))) burst = true;
      if (!burst) for (const e of game.enemies) {
        if (e.dead || e.held || e.ghosted) continue;
        if (hyp(e.x - nx, e.y - ny) < e.r + 6) { burst = true; break; }
      }
      if (!burst) for (const p of game.props) {
        // One of his own animals is a thing to spit at too (`Beast.dope`: the puddle it bursts into poisons it).
        if (Beast.animal(p) && !p.held && hyp(p.x - nx, p.y - ny) < (p.r || 12) + 4) { burst = true; break; }
        if (p.broken || !p.blocking) continue;
        if (hyp(p.x - nx, p.y - ny) < (p.r || 12) + 4) { burst = true; break; }
      }
      if (burst) { b.dead = true; if (b.web) Status.webSpatter(game, b.x, b.y, TUNING.status.web.tiles); else Status.spatter(game, b.x, b.y, TUNING.status.spit.tiles); continue; }
      b.x = nx; b.y = ny;
      if (Math.random() < 0.7) game.parts.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
        life: 0.25, color: b.web ? WEB_COL.strand : PALETTE.venom, size: 2 + Math.random() * 2 });
    }
    keepIf(game.globs, notDead);
  },
  // ---- WEB SPIT's web (15 Oct 2026, `TUNING.status.web`) ----
  // `game.webs`: tile index → seconds it still lies. Laid like the poison's spatter: its own tile and the rest of `n` off
  // the eight round it, never stone or a drop.
  webSpatter(game, x, y, n) {
    const w = game.world, W = game.webs || (game.webs = new Map()), cx = Math.floor(x / TILE), cy = Math.floor(y / TILE), t = TUNING.status.web.time;
    const ok = (tx, ty) => { const k = w.tileAt(tx, ty); return k !== T.WALL && k !== T.PIT; };
    const ring = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && ok(cx + dx, cy + dy)) ring.push([cx + dx, cy + dy]);
    const mid = ok(cx, cy);
    if (mid) W.set(w.idx(cx, cy), t);
    for (let k = 0; k < n - (mid ? 1 : 0) && ring.length; k++) { const [tx, ty] = ring.splice((Math.random() * ring.length) | 0, 1)[0]; W.set(w.idx(tx, ty), t); }
    game.particles(x, y, 12, WEB_COL.strand, 120);
    w.emitNoise(x, y, TUNING.noise.splat);
    game.audio.sfxSplat();
  },
  // A man the web may hold: flesh, on his feet, not one of the kinds too big or too unreal for it, not in the air.
  webbable(e) {
    const W = TUNING.status.web;
    return !e.dead && !e.held && !e.ghosted && !e.statue && !e.aloft && !(e.webT > 0) && e.state !== 'flung' && e.state !== 'hop'
      // the factory's walkers are caught too (19 Oct 2026 playtest: "robots in the web cannot jump!"); the automaton stands
      // over it and THE ARM is bolted down
      && W.immune.indexOf(e.kind) < 0 && !e.automaton && !e.arm;
  },
  // Once a step (`Status.update`): the web ages, a burning tile burns away and lights the web beside it, a man stepping on
  // web is caught and the tile is spent.
  updateWebs(game, dt) {
    const W = game.webs; if (!W || !W.size) return;
    const w = game.world, B = TUNING.status.web;
    for (const [i, t] of W) {
      if (w.fire[i] > 0) {
        W.delete(i);
        const tx = i % w.W, ty = (i / w.W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (W.has(w.idx(tx + dx, ty + dy))) w.ignite(tx + dx, ty + dy, true, B.burn, w.fireKind[i] === 1);
        if (Math.random() < 0.5) game.particles((tx + 0.5) * TILE, (ty + 0.5) * TILE, 3, PALETTE.fireHi, 70);
        continue;
      }
      if (t - dt <= 0) W.delete(i); else W.set(i, t - dt);
    }
    for (const e of game.liveEnemies || game.enemies) {
      if (!Status.webbable(e)) continue;
      const i = w.idx(Math.floor(e.x / TILE), Math.floor(e.y / TILE));
      if (!W.has(i)) continue;
      W.delete(i);
      e.webT = B.hold * (e.unliftable ? B.bigMul : 1); e.webX = e.x; e.webY = e.y;
      game.floatText(e.x, e.y - 28, 'STUCK', WEB_COL.strand);
      game.audio.sfxSplat();
    }
  },
  // A man held by the web (from the enemy loop, after his own step): wherever his step took him, he is put back. A blow that
  // throws him, his being lifted or set alight tears him out.
  webHold(e, dt, game) {
    if (e.dead || e.held || e.state === 'flung' || e.burning > 0) { e.webT = 0; return; }
    e.webT -= dt;
    e.x = e.webX; e.y = e.webY; e.vx = 0; e.vy = 0;
  },
  // The web on the floor and round a held man's feet: one baked tile of strands a variant (`webTile`), cells on a 2 px grid.
  webTile(v) {
    const C = Status.webCache || (Status.webCache = []);
    if (C[v]) return C[v];
    const N = 16, px = TILE / N, cv = document.createElement('canvas'); cv.width = cv.height = TILE;
    const c = cv.getContext('2d'), h = (a, b) => ((Math.imul(a * 73856093 ^ b * 19349663 ^ (v + 1) * 83492791, 2654435761) >>> 0) % 100) / 100;
    const cell = (q, r, col) => { if (q < 0 || r < 0 || q >= N || r >= N) return; c.fillStyle = col; c.fillRect(q * px, r * px, px, px); };
    const m = 7 + (v % 2);
    for (let k = 0; k < N; k++) {
      // spokes: the two diagonals and the cross, broken here and there
      if (h(k, 1) > 0.18) cell(k, k, WEB_COL.strand);
      if (h(k, 2) > 0.18) cell(k, N - 1 - k, WEB_COL.strand);
      if (h(k, 3) > 0.3) cell(k, m, WEB_COL.faint);
      if (h(k, 4) > 0.3) cell(m, k, WEB_COL.faint);
    }
    // two rings of the spiral
    for (const R of [3, 6]) for (let a = 0; a < 40; a++) {
      const an = a / 40 * Math.PI * 2; if (h(a, R) < 0.25) continue;
      cell(Math.round(m + Math.cos(an) * R), Math.round(m + Math.sin(an) * R), R === 3 ? WEB_COL.strand : WEB_COL.faint);
    }
    cell(m, m, WEB_COL.knot);
    // a dark rim a world px round every strand (19 Oct 2026 playtest: "the web on snow must show better, a pixel or two of
    // black outline"): the strands' shape laid four ways under them in ink
    const out = document.createElement('canvas'); out.width = out.height = TILE;
    const o = out.getContext('2d');
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) o.drawImage(cv, dx, dy);
    o.globalCompositeOperation = 'source-in'; o.fillStyle = WEB_COL.ink; o.fillRect(0, 0, TILE, TILE);
    o.globalCompositeOperation = 'source-over'; o.drawImage(cv, 0, 0);
    return (C[v] = out);
  },
  // A man held by the web (`e.webT`) wears it: strands drawn over his body from his feet up, a size over him, so being
  // caught reads on the man and not only on the floor under him (19 Oct 2026 playtest). Drawn after the cast.
  drawWebbed(R, game) {
    const ctx = R.ctx, L = TUNING.status.web.look;
    for (const e of game.enemies) {
      if (!(e.webT > 0) || e.dead || e.held || game.hidden(e.x, e.y)) continue;
      const w = TILE * L.w * (e.r > 16 ? 1.4 : 1), h = TILE * L.h * (e.r > 16 ? 1.4 : 1), end = e.webT < 0.6 && Math.floor(R.t * 10) % 2;
      ctx.globalAlpha = end ? 0.35 : L.alpha;
      ctx.drawImage(Status.webTile((e.x | 0) & 1 ? 1 : 2), Math.round(e.x - w / 2), Math.round(e.y - h + TILE * 0.2), Math.round(w), Math.round(h));
    }
    ctx.globalAlpha = 1;
  },
  drawWebs(R, game) {
    const W = game.webs, ctx = R.ctx, w = game.world;
    if (W && W.size) for (const [i, t] of W) {
      const tx = i % w.W, ty = (i / w.W) | 0, x = tx * TILE, y = ty * TILE;
      if (game.hidden(x + TILE / 2, y + TILE / 2)) continue;
      // fades in its last two seconds, blinking at the very end
      ctx.globalAlpha = t > 2 ? 0.85 : t > 0.6 ? 0.85 * t / 2 : (Math.floor(R.t * 10) % 2 ? 0.3 : 0.1);
      ctx.drawImage(Status.webTile((tx * 7 + ty * 13) & 3), x, y);
    }
    for (const e of game.enemies) {
      if (!(e.webT > 0) || e.dead || game.hidden(e.x, e.y)) continue;
      ctx.globalAlpha = 0.9; ctx.drawImage(Status.webTile(3), Math.round(e.x - TILE / 2), Math.round(e.y - TILE / 2));
    }
    ctx.globalAlpha = 1;
  },
};
const WEB_COL = { strand: '#ece6d6', faint: 'rgba(236,230,214,0.55)', knot: '#ffffff', ink: 'rgba(14,12,18,0.9)' };

// TELEKINESIS (15 Oct 2026, his ask; the `kinesis` soul, `BOONS`): the grab held with nothing in reach to take charges
// `holdFor` s, and at the full charge every loose thing within `r` tiles flies at the nearest man it can see, the men
// shared out among the things. Stepped from `Goat.update`'s grab block, after `tryGrab` (a thing at his teeth is just taken).
const Kinesis = {
  things(game, g, K) {
    const R = K.r * TILE, out = [];
    for (const p of game.props) {
      if (p.broken || p.held || p.flung || p.heaven) continue;
      if (!((p.kind === 'crate' && !p.noGrab) || p.kind === 'bomb' || p.kind === 'weapon')) continue;
      if (hyp(p.x - g.x, p.y - g.y) > R || !game.sees(g.x, g.y, p.x, p.y)) continue;
      out.push(p);
    }
    return out;
  },
  step(game, g, inp, dt) {
    const K = game.mods.kinesis;
    if (!K || !inp.rmbDown || g.holding || g.state !== 'idle' || g.grabCd > 0 || g.dead) { g.kinT = 0; return; }
    const things = Kinesis.things(game, g, K);
    if (!things.length) { g.kinT = 0; return; }
    if (!(g.kinT > 0)) game.audio.sfxCageHit();
    g.kinT = (g.kinT || 0) + dt;
    if (Math.random() < 0.3) { const p = things[(Math.random() * things.length) | 0]; game.particles(p.x, p.y, 1, WEB_COL.knot, 40); }
    if (g.kinT < K.holdFor) return;
    g.kinT = 0;
    Kinesis.launch(game, g, K, things);
  },
  launch(game, g, K, things) {
    const count = new Map(), reach = K.reach * TILE, G = TUNING.goat.grab;
    let sent = 0;
    for (const p of things) {
      let best = null, bestS = Infinity;
      for (const e of game.liveEnemies || game.enemies) {
        if (e.dead || e.held || e.ghosted || e.statue || e.scripted || game.hidden(e.x, e.y)) continue;
        const d = hyp(e.x - p.x, e.y - p.y);
        if (d > reach || !game.sees(p.x, p.y, e.x, e.y)) continue;
        const s = d * (1 + 0.7 * (count.get(e) || 0));
        if (s < bestS) { bestS = s; best = e; }
      }
      if (!best) continue;
      count.set(best, (count.get(best) || 0) + 1);
      const dx = best.x - p.x, dy = best.y - p.y, d = hyp(dx, dy) || 1;
      const mul = (p.kind === 'weapon' ? TUNING.prop.weapon.throwMul : 1) * game.mods.throwFar * K.speedMul;
      p.inStand = false;
      p.fling(dx / d * G.throwImpulse * mul, dy / d * G.throwImpulse * mul, true);
      game.particles(p.x, p.y, 6, WEB_COL.knot, 110);
      sent++;
    }
    if (!sent) return;
    g.grabCd = g.grabCdMax = K.cooldown;
    game.ring(g.x, g.y, K.r * TILE, WEB_COL.strand, 0.35, 3);
    game.audio.sfxSwing(); game.audio.sfxSteel(); game.vibe(18);
    game.world.emitNoise(g.x, g.y, TUNING.noise.swing);
  },
  // The charge on the floor: a ring of cells round each thing that will fly, closing in as the charge fills, and the
  // reach round him dotted.
  draw(R, game) {
    const g = game.goat, K = game.mods && game.mods.kinesis;
    if (!K || !g || !(g.kinT > 0) || g.dead) return;
    const ctx = R.ctx, px = 2, k = clamp(g.kinT / K.holdFor, 0, 1), things = Kinesis.things(game, g, K);
    ctx.fillStyle = WEB_COL.strand; ctx.globalAlpha = 0.35 + 0.5 * k; ctx.beginPath();
    for (const p of things) { const r = (p.r || 10) + 4 + (1 - k) * 14; R.floorRing(p.x, p.y, r, r - px, px); }
    ctx.fill();
    ctx.globalAlpha = 0.25; ctx.beginPath(); const rr = K.r * TILE; R.floorRing(g.x, g.y, rr, rr - px, px); ctx.fill();
    ctx.globalAlpha = 1;
  },
};

