// The shop: the mouse in the wall, her shelf, what she turns into, and the two artifacts that are
// verbs (the boomerang and the blink). Everything here is reached from the goat's own buttons —
// grab is buy, a headbutt is rude, grab on nothing throws the boomerang, roll is the blink — so
// nothing in it adds a key. Data lives in `ARTIFACTS` and `TUNING.shop` (js/tuning.js); this is
// what happens when the goat reaches for it.
const Shop = {
  // The artifact record for an id, and the tier's own numbers.
  def(id) { return ARTIFACTS.find((a) => a.id === id) || null; },
  tierOf(art) { const d = Shop.def(art.id); return d ? d.tiers[Math.max(0, Math.min(d.tiers.length, art.tier)) - 1] : null; },
  // `game.artifact` into `game.mods`, the way a boon's `apply` goes: read at the use site, never here.
  applyArtifact(mods, art) {
    const d = Shop.def(art.id), t = Shop.tierOf(art);
    if (d && t) d.apply(mods, t.params);
  },
  // The mouse a ware belongs to, or null once she has turned or gone.
  mouseOf(game, p) { return game.props.find((o) => o.kind === 'mouse' && o.shopId === p.shopId && !o.broken) || null; },

  // Grab on a ware. She takes nothing for it: the offer is a choice of three — either talisman, or
  // the milk (`takeMilk`) — and reaching for one talisman hangs it at his neck and packs the rest away. One slot: taking onto a full one puts the old
  // talisman back on the stool you took from, so a change of mind is a second reach and not a loss.
  // The first reach in her room is what lifts its gate — she is the bar of it, not a soul.
  buy(game, ware, goat) {
    if (ware.broken) return;
    if (ware.locked) { game.floatText(ware.x, ware.y - 26, 'KILL HIM FIRST', PALETTE.blood); game.audio.sfxThud(); return; }
    if (ware.ware.id === 'milk') { Shop.takeMilk(game, ware, goat); return; }
    const old = game.artifact, def = Shop.def(ware.ware.id);
    game.artifact = { id: ware.ware.id, tier: ware.ware.tier };
    game.applyBoons(); game.saveRun();
    game.floatText(goat.x, goat.y - 36, `${def.name} ${'I'.repeat(ware.ware.tier)}`, PALETTE.fireHi);
    game.ring(ware.x, ware.y, 1.6 * TILE, def.color); game.particles(ware.x, ware.y, 14, def.color, 150);
    game.audio.sfxBell(); game.vibe(20);
    if (!game.shopTold) { game.shopTold = true; game.floatText(goat.x, goat.y - 54, 'IT HANGS AT YOUR NECK', PALETTE.bone); }
    // The others go back into the wall: one of the three, never two — unless the rat ogre is dead
    // on her floor (`ogreDown`), which is what THE SHELF IS YOURS says: every stool is his then.
    if (!ware.free) for (const o of game.props) {
      if (o === ware || o.kind !== 'ware' || o.shopId !== ware.shopId || o.broken || o.chosen) continue;
      o.broken = true; o.dead = true; game.particles(o.x, o.y, 8, PALETTE.ash, 90);
    }
    const m = Shop.mouseOf(game, ware);
    if (m && !ware.chosen) { m.say = { text: TUNING.prop.mouse.thanks, life: 2, max: 2 }; m.wobble = 0.25; }
    if (old) { ware.ware = { id: old.id, tier: old.tier }; ware.chosen = true; ware.free = false; }
    else { ware.broken = true; ware.dead = true; }
    game.openSoulGate(ware.shopId);
  },

  // The third offer: no talisman, one pail of milk set down where the generator found room for it,
  // holding `TUNING.shop.heals` hearts — a drink a heart, so a goat at full health can come back to
  // it while he is still in her room instead of pouring two of the three away. The other two offers
  // go back into the wall exactly as they do when a talisman is taken, and the gate gives.
  takeMilk(game, ware, goat) {
    const spots = ware.milkSpots && ware.milkSpots.length ? ware.milkSpots
      : [game.freeSpot(ware.x, ware.y + TILE)];
    const s = spots[0] || { x: ware.x, y: ware.y + TILE };
    game.props.push(new Prop(s.x, s.y, 'heal', { pail: TUNING.shop.heals }));
    game.particles(s.x, s.y, 14, PALETTE.bone, 130);
    game.floatText(goat.x, goat.y - 36, `${TUNING.shop.heals} HEARTS OF MILK`, PALETTE.bone);
    game.audio.sfxBell(); game.vibe(16);
    for (const o of game.props) {
      if (o.kind !== 'ware' || o.shopId !== ware.shopId || o.broken || (ware.free && o !== ware)) continue;
      o.broken = true; o.dead = true; if (o !== ware) game.particles(o.x, o.y, 8, PALETTE.ash, 90);
    }
    const m = Shop.mouseOf(game, ware);
    if (m) { m.say = { text: TUNING.prop.mouse.thanks, life: 2, max: 2 }; m.wobble = 0.25; }
    game.openSoulGate(ware.shopId);
  },

  // A headbutt on her, or on her shelf. The first two are words; the third is the rat ogre. Her
  // language is the game's: careful is grab, rough is the horns, and rough costs.
  provoke(game, p) {
    const m = p.kind === 'mouse' ? p : Shop.mouseOf(game, p);
    if (!m || m.broken) { game.audio.sfxThud(); return; }
    const M = TUNING.prop.mouse, S = TUNING.shop;
    m.strikes = (m.strikes || 0) + 1; m.wobble = 0.4;
    game.audio.sfxThud(); game.shake(3); game.vibe(10);
    if (m.strikes < S.strikes) {
      const line = M.lines[Math.min(M.lines.length, m.strikes) - 1];
      m.say = { text: line, life: 2.2, max: 2.2, angry: m.strikes >= 2 };
      m.angry = m.strikes >= 2 ? 1.5 : 0;
      game.audio.sfxCluck();
      if (m.strikes >= 2) { game.shake(5); game.particles(m.x, m.y - 6, 6, PALETTE.blood, 90); }
      return;
    }
    Shop.spawnOgre(game, m);
  },

  // A body twice a man's width does not come out of a mouse hole: it comes through the wall. The
  // wall tile the burrow is in and one either side turn to floor (`holeSpots` chose it for solid
  // rock behind, never another room, so nothing leaks past them) and a scatter of rubble goes down on the
  // boards, so what is standing there a moment later reads as a breach rather than a hole that was
  // somehow always big enough for him.
  breakWall(game, m) {
    // `gap` sits on the seam between the wall and the boards, so the wall row is the one on the far side.
    const w = game.world, tx = Math.floor(m.gap.x / TILE), ty = Math.floor((m.gap.y + (m.wallSide === 'up' ? -1 : 1)) / TILE);
    for (const dx of [-1, 0, 1]) {
      const i = ty * w.W + (tx + dx);
      if (w.tiles[i] === T.WALL) { w.tiles[i] = T.FLOOR; w.caveDirty(); }
    }
    for (let k = 0; k < 6; k++) w.dot(m.gap.x + (Math.random() - 0.5) * 56, m.gap.y + (Math.random() - 0.5) * 18, 2 + Math.random() * 2.6, '#3a3630');
  },
  // She comes out of the hole, and she is not a mouse any more. The wares stay on the shelf and
  // lock until he is down; kill him and they are free — the Spelunky deal, honest only because the
  // fight is dear (see `TUNING.ratogre`).
  spawnOgre(game, m) {
    const cfg = TUNING.ratogre;
    m.broken = true; m.dead = true;
    Shop.breakWall(game, m);
    for (const w of game.props) if (w.kind === 'ware' && w.shopId === m.shopId && !w.broken) w.locked = true;
    // She was the bar of her room's gate, and she is gone: the way on opens with her. It used to
    // wait for a ware, and the wares wait for him — on THE YARD and THE ROAD her room and the one
    // before it seldom hold enough to put six hearts' worth into him, so a goat who could not kill
    // him could not leave the floor. Now the rudeness costs the offer, and killing him wins it back.
    game.openSoulGate(m.shopId);
    const dir = m.wallSide === 'up' ? 1 : -1;
    const e = new Enemy(m.gap.x, m.gap.y + dir * TILE * 1.1, 'ratogre');
    e.aware = true; e.woke = true; e.state = 'emerge'; e.timer = cfg.emerge; e.shopId = m.shopId;
    e.room = m.shopId; e.elite = false; e.boss = false;
    e.facing = Math.atan2(game.goat.y - e.y, game.goat.x - e.x);
    game.enemies.push(e);
    game.world.emitNoise(e.x, e.y, TUNING.noise.boom);
    game.particles(m.gap.x, m.gap.y, 26, PALETTE.ash, 280); game.particles(e.x, e.y, 10, PALETTE.blood, 120);
    game.ring(e.x, e.y, 2.4 * TILE, PALETTE.blood);
    game.shake(12); game.hitstop(0.08); game.zoomPunch(1.6); game.kick(0, dir, TUNING.juice.kick); game.vibe(60);
    game.audio.sfxGrowl(); game.audio.sfxSplat(); game.audio.musicEvent('kill');
    game.floatText(e.x, e.y - 40, 'RAT OGRE', PALETTE.blood);
    game.slowTimer = Math.max(game.slowTimer, 0.35);
    e.say = { text: 'YOU WERE ASKED', life: 2.4, max: 2.4 };
  },
  // He is down: whatever is still on the shelf is yours for nothing.
  ogreDown(game, e) {
    let any = false;
    for (const w of game.props) if (w.kind === 'ware' && w.shopId === e.shopId && !w.broken) { w.locked = false; w.free = true; any = true; }
    if (any) game.floatText(e.x, e.y - 58, 'THE SHELF IS YOURS', PALETTE.fireHi);
  },
  // The horns on him standing: nothing, said once a run.
  ogreShrug(game, e) {
    if (game.ogreTold) return;
    game.ogreTold = true;
    game.floatText(e.x, e.y - 44, 'STUN HIM FIRST. A CRATE, A SHIELD', PALETTE.ashHi);
  },

  // The mouse and her wares age: what she is saying runs out, her fright fades.
  updateStall(p, dt, game) {
    if (p.say) { p.say.life -= dt; if (p.say.life <= 0) p.say = null; }
    p.angry = Math.max(0, (p.angry || 0) - dt);
  },

  // ---- the boomerang ----
  // Q throws it. Out along the aim to `range` tiles, into a wall or into `pierce` men — whoever it
  // touches loses his head for `stun` — and then home, through anything, until it is back in the
  // holster. The wait after that is `Goat.itemCd`, set by the press that threw it: this is a verb
  // of its own and never reads `grabCd`. A rat ogre only has his swing broken by it.
  throwBoomerang(game, goat) {
    const B = game.mods.boomerang, T0 = TUNING.shop.boomerang;
    if (!B || game.boom.fly) return false;
    const ax = goat.aim.x, ay = goat.aim.y;
    game.boom.fly = { x: goat.x + ax * (goat.r + 6), y: goat.y + ay * (goat.r + 6), vx: ax * T0.speed, vy: ay * T0.speed,
      r: T0.r, out: true, gone: 0, home: 0, hit: [], spin: 0, ox: goat.x, oy: goat.y };
    game.audio.sfxSwing(); game.world.emitNoise(goat.x, goat.y, TUNING.noise.swing); game.vibe(12);
    game.dust(goat.x, goat.y, 2, -ax, -ay);
    return true;
  },
  updateBoomerang(game, dt) {
    const bm = game.boom; if (!bm) return;
    const f = bm.fly; if (!f) return;
    const B = game.mods.boomerang || { stun: 1, range: 5, pierce: 1 }, T0 = TUNING.shop.boomerang, g = game.goat, w = game.world;
    f.spin += dt * 22;
    if (f.out) {
      f.x += f.vx * dt; f.y += f.vy * dt; f.gone += Math.hypot(f.vx, f.vy) * dt;
      const impact = w.collideCircle(f);
      if (impact > 0) { f.out = false; game.audio.sfxThud(); game.particles(f.x, f.y, 4, PALETTE.ash, 90); }
      else if (f.gone >= B.range * TILE) f.out = false;
      // The furniture stops it the way stone does: it comes home off a table or a shut door.
      for (const p of game.props) {
        if (!p.blocking || p.kind === 'cage') continue;
        if (Math.hypot(p.x - f.x, p.y - f.y) < p.r + f.r) { f.out = false; if (p.kind === 'bell') p.ring(game); game.audio.sfxThud(); break; }
      }
    } else {
      // Home. It curves back through anything: a boomerang that got stuck behind a pillar would be a
      // talisman lost to the room, and `homeMax` is the belt to that brace.
      f.home += dt;
      const dx = g.x - f.x, dy = g.y - f.y, d = Math.hypot(dx, dy) || 1;
      const sp = T0.speed * 1.15;
      f.vx = dx / d * sp; f.vy = dy / d * sp;
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (d < g.r + f.r + 4 || f.home > T0.homeMax) {
        bm.fly = null;
        game.audio.sfxSteel(); game.vibe(6);
        return;
      }
    }
    // Up to `pierce` men each way, each way counted apart. The way back used to break only the frame's
    // loop once the count was spent, and the next frame dazed whoever it passed: every man in the room.
    f.outN = f.outN || 0; f.backN = f.backN || 0;
    for (const e of game.enemies) {
      if ((f.out ? f.outN : f.backN) >= B.pierce) break;
      if (e.dead || e.held || e.ghosted || f.hit.includes(e)) continue;
      if (Math.hypot(e.x - f.x, e.y - f.y) > e.r + f.r) continue;
      f.hit.push(e); if (f.out) f.outN++; else f.backN++;
      e.daze(game, B.stun); e.flash = Math.max(e.flash, TUNING.juice.hitFlash); e.aware = true;
      game.audio.sfxThud(); game.shake(2); game.hitstop(0.02);
      game.particles(e.x, e.y - 6, 6, PALETTE.bone, 120);
      game.floatText(e.x, e.y - 30, e.kind === 'ratogre' ? 'SWING BROKEN' : 'REELS', PALETTE.fireHi);
      // On the way out it stops at its count of men and turns for home.
      if (f.out && f.outN >= B.pierce) f.out = false;
    }
  },

  // ---- the blink ----
  // Q, not the roll: no tumble, no travel, the goat is simply `dist` tiles further along the way
  // he was going. Stone and a drop stop it short; a shut door or a table stops it short; a man
  // does not. A held man is dropped the way the roll drops him, and the mercy frames it opens are
  // the roll's own — but its wait is `Goat.itemCd`, set by the press that used it, never `rollCd`.
  blink(game, goat, inx, iny) {
    const B = game.mods.blink, R = TUNING.goat.roll, w = game.world;
    let dx = inx, dy = iny;
    if (Math.hypot(dx, dy) < 0.2) { dx = goat.vx; dy = goat.vy; }
    if (Math.hypot(dx, dy) < 20) { dx = Math.cos(goat.facing); dy = Math.sin(goat.facing); }
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const dist = B.dist * TILE;
    const solidAt = (px, py) => {
      if (w.isSolid(Math.floor(px / TILE), Math.floor(py / TILE)) || w.isPitPx(px, py)) return true;
      for (const p of game.props) if (p.blocking && Math.hypot(p.x - px, p.y - py) < p.r + goat.r * 0.6) return true;
      return false;
    };
    let bx = goat.x, by = goat.y;
    for (let t = 6; t <= dist; t += 6) {
      const px = goat.x + dx * t, py = goat.y + dy * t;
      // The goat's own width, not only his centre: a landing with his shoulder in the wall was a
      // landing the wall then shoved him out of, a tile short and facing the wrong way.
      if (solidAt(px, py) || solidAt(px + dy * goat.r * 0.7, py - dx * goat.r * 0.7) || solidAt(px - dy * goat.r * 0.7, py + dx * goat.r * 0.7)) break;
      bx = px; by = py;
    }
    if (Math.hypot(bx - goat.x, by - goat.y) < TILE * 0.6) { game.floatText(goat.x, goat.y - 30, 'NO ROOM', PALETTE.ashHi); game.audio.sfxThud(); return false; }
    const ox = goat.x, oy = goat.y;
    if (goat.holding) {
      const h = goat.holding; goat.holding = null; h.held = false; goat.autoHeld = false;
      if (!h.item) { h.state = 'floored'; h.timer = 0.5; }
      goat.grabCd = TUNING.goat.grab.cooldown * game.mods.grabCooldown;
    }
    // Whoever stood where he left: the third tier leaves them reeling.
    if (B.stun > 0) for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted) continue;
      if (Math.hypot(e.x - ox, e.y - oy) <= R.stunR + e.r) { e.daze(game, B.stun); game.particles(e.x, e.y - 6, 5, PALETTE.witchHi, 120); }
    }
    // The ghosts along the line are the only picture of the travel there is.
    const n = 5, life = TUNING.goat.trail.fastLife;
    for (let k = 1; k <= n; k++) goat.trail.push({ x: ox + (bx - ox) * k / n, y: oy + (by - oy) * k / n, a: Math.atan2(dy, dx), life: life * k / n, max: life });
    goat.x = bx; goat.y = by; goat.vx = dx * 40; goat.vy = dy * 40; goat.facing = Math.atan2(dy, dx);
    goat.state = 'rollrecover'; goat.timer = R.recover * 0.6;
    goat.invuln = Math.max(goat.invuln, R.invuln);
    goat.runT = Math.min(goat.runT, TUNING.goat.momentum.time * 0.5);
    game.particles(ox, oy, 12, PALETTE.witch, 140); game.particles(bx, by, 12, PALETTE.witchHi, 160);
    game.ring(ox, oy, 1.2 * TILE, PALETTE.witch); game.ring(bx, by, 1.2 * TILE, PALETTE.witchHi);
    game.dust(ox, oy, 3, -dx, -dy); game.dust(bx, by, 3, dx, dy); game.squashGoat(TUNING.juice.squash.land);
    game.audio.sfxBlink(); game.audio.musicEvent('roll'); w.emitNoise(bx, by, TUNING.noise.swing); game.vibe(14);
    return true;
  },
};
