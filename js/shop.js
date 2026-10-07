// The shop: the mouse in the wall, her shelf, what she turns into, and two of the capes' verbs (the
// boomerang and the blink; the capes themselves are js/capes.js). Grab is take and a headbutt is rude,
// so the shop adds no key; Q exists only while a cape is worn (`Cape.use`). Data lives in `ARTIFACTS`,
// `CAPES` and `TUNING.shop` (js/tuning.js); this is what happens when the goat reaches for it.
const Shop = {
  // Her wares stay with her (2 Oct 2026 playtest: "she does not lay things out in front of her, you go
  // up to her and talk"): while the mouse of that shop is there, a ware of hers is neither drawn nor
  // reached for; walking up to her opens the offer (`Codex.watchShop`). The crow's gift (no shop,
  // `shopId` < 0) and a shelf she has left (turned, gone) are on the floor as before.
  shelved(game, p) {
    if (p.kind !== 'ware' || p.shopId === undefined || p.shopId < 0) return false;
    return game.props.some((m) => m.kind === 'mouse' && m.shopId === p.shopId && !m.broken);
  },
  // The artifact record for an id, and the tier's own numbers.
  def(id) { return ARTIFACTS.find((a) => a.id === id) || null; },
  tierOf(art) { const d = Shop.def(art.id); return d ? d.tiers[Math.max(0, Math.min(d.tiers.length, art.tier)) - 1] : null; },
  // A talisman's tier clamped to the tiers it has: an old save's tier III or IV is its top one now.
  tierFit(id, tier) { const d = Shop.def(id); return d ? clamp(tier | 0, 1, d.tiers.length) : 1; },
  // Every worn talisman into `game.mods`, the way a boon's `apply` goes: read at the use site, never here.
  applyArtifact(mods, art) {
    const d = Shop.def(art.id), t = Shop.tierOf(art);
    if (d && t) d.apply(mods, t.params);
  },
  // The talisman of that id at his neck, if he wears it.
  worn(game, id) { return (game.artifacts || []).find((a) => a.id === id) || null; },
  // What he wears, for every picture of him (`PaintedArt.drawGoat`'s `game.artifacts` / `game.cape`).
  wearOf(game) { return { artifacts: (game.artifacts || []).slice(), cape: game.cape || null }; },
  // A ware read the same way whatever it is: its record, name, line and rarity (a cape's is `CAPE_RARITY`).
  info(w) {
    if (!w || w.id === 'milk') return null;
    if (w.cape) { const d = Cape.def(w.id); return d ? { def: d, name: d.name, desc: d.desc, rr: CAPE_RARITY, cape: true } : null; }
    const d = Shop.def(w.id), t = d && Shop.tierOf(w);
    return t ? { def: d, name: d.name, desc: t.desc, rr: rarityOf(w.tier), cape: false } : null;
  },
  // What taking `ware` would hand back onto its stool, or null: a cape for the cape he has on; a fourth
  // talisman for the oldest of his three, or, off a stool that already holds one of his, for the one he
  // took from it (so changing his mind back is the same reach again). The same talisman twice hands
  // nothing back: his own is lifted to its top tier.
  replaces(game, ware) {
    const w = ware.ware;
    if (!w || w.id === 'milk') return null;
    if (w.cape) return game.cape && game.cape.id !== w.id ? { id: game.cape.id, cape: true } : null;
    const list = game.artifacts || [];
    if (Shop.worn(game, w.id) || list.length < TUNING.talisman.slots) return null;
    return (ware.chosen && ware.swapped && Shop.worn(game, ware.swapped)) || list[0];
  },
  // A worn talisman on a shelf is another one (`Game.startLevel`): the generator does not know what he
  // wears, and a shelf offering his own was one choice fewer. Off the level's seed and the stool's place,
  // never two of one sort on a shelf, never one he wears; a cape on a shelf the same way, for the cape.
  restock(game) {
    if (game.level && game.level.def && game.level.def.showroom) return;   // THE SHOWROOM's shelf is every one, worn or not
    const seed = (game.level && game.level.seed) || 0, wares = game.props.filter((p) => p.kind === 'ware' && p.ware && p.ware.id !== 'milk');
    wares.forEach((p, i) => {
      const w = p.ware, shelf = wares.filter((o) => o !== p && o.shopId === p.shopId);
      const h = farHash(i * 17 + (seed % 7919), (p.x | 0) * 3 + (p.y | 0));
      if (w.cape) {
        if (!game.cape || game.cape.id !== w.id) return;
        const pool = CAPES.filter((c) => c.id !== w.id && !shelf.some((o) => o.ware.cape && o.ware.id === c.id));
        if (pool.length) p.ware = { id: pool[Math.floor(h * pool.length)].id, cape: true };
        return;
      }
      if (!Shop.worn(game, w.id)) return;
      const tagOf = (id) => (Shop.def(id) || {}).tag;
      const pool = ARTIFACTS.filter((a) => !Shop.worn(game, a.id) && !shelf.some((o) => !o.ware.cape && (o.ware.id === a.id || (a.tag && tagOf(o.ware.id) === a.tag))));
      if (pool.length) { const a = pool[Math.floor(h * pool.length)]; p.ware = { id: a.id, tier: Math.min(w.tier || 1, a.tiers.length) }; }
    });
    Shop.freshen(game, wares, seed);
  },
  // SOMETHING NEW (`Novelty`, 6 Oct 2026): played dry, a shelf that holds no talisman this browser has ever seen
  // swaps one of its talismans (never the cape) for one it has not, worn by nobody and of a sort not on the shelf.
  // `ware.fresh` is how the floor's report learns of it (`Stats.enter`).
  freshen(game, wares, seed) {
    if (typeof Novelty === 'undefined' || (game.dev && game.dev.god) || !Novelty.hungry()) return;
    const seen = Unlocks.load().arts, tagOf = (id) => (Shop.def(id) || {}).tag;
    for (const id of new Set(wares.map((p) => p.shopId))) {
      const shelf = wares.filter((p) => p.shopId === id), arts = shelf.filter((p) => !p.ware.cape);
      if (!arts.length || arts.some((p) => !seen[p.ware.id])) continue;
      const p = arts[Math.floor(farHash(seed % 7919, id | 0) * arts.length)], rest = shelf.filter((o) => o !== p && !o.ware.cape);
      const pool = ARTIFACTS.filter((a) => !seen[a.id] && !Shop.worn(game, a.id) && !rest.some((o) => o.ware.id === a.id || (a.tag && tagOf(o.ware.id) === a.tag)));
      if (!pool.length) continue;
      const a = pool[Math.floor(farHash(id | 0, seed % 104729) * pool.length)];
      p.ware = { id: a.id, tier: Math.min(p.ware.tier || 1, a.tiers.length), fresh: true };
    }
  },
  // The mouse a ware belongs to, or null once she has turned or gone.
  mouseOf(game, p) { return game.props.find((o) => o.kind === 'mouse' && o.shopId === p.shopId && !o.broken) || null; },

  // Putting a cape on keeps the wait of the one it replaces and gives back what its own still owed, so
  // taking the same cape off a stool and on again is never a way round its clock (6 Oct 2026 review, B5).
  wearCape(game, goat, id) {
    const wait = game.capeWait = game.capeWait || {};
    if (game.cape && game.cape.id !== id && goat.itemCd > 0) wait[game.cape.id] = { cd: goat.itemCd, max: goat.itemCdMax };
    const back = wait[id]; delete wait[id];
    if (game.cape && game.cape.id === id) return;
    game.cape = { id };
    goat.itemCd = back ? back.cd : 0; goat.itemCdMax = back ? back.max : 0;
  },
  // Grab on a ware. She takes nothing for it: the offer is a choice of three, either talisman (or a
  // cape, now and then, in place of one), or the milk (`takeMilk`), and reaching for one hangs it on
  // him and packs the rest away. Up to `TUNING.talisman.slots` talismans at his neck and one cape on
  // his back: taking onto a full one puts what it replaces (`replaces`) back on the stool you took
  // from, so a change of mind is a second reach and not a loss. The first reach in her room is what
  // lifts its gate, she is the bar of it, not a soul. A cape lying in a niche is a ware of no shop.
  buy(game, ware, goat) {
    if (ware.broken) return;
    if (ware.locked) { game.floatText(ware.x, ware.y - 26, 'KILL HIM FIRST', PALETTE.blood); game.audio.sfxThud(); return; }
    if (ware.ware.id === 'milk') { Shop.takeMilk(game, ware, goat); return; }
    const w = ware.ware, info = Shop.info(w); if (!info) return;
    Stats.shop(game, ware, w.cape ? w.id : w.id + ':' + w.tier);
    const old = Shop.replaces(game, ware);
    let rr = info.rr;
    if (w.cape) Shop.wearCape(game, goat, w.id);
    else {
      game.artifacts = (game.artifacts || []).slice();
      const mine = Shop.worn(game, w.id);
      if (mine) { mine.tier = Shop.def(w.id).tiers.length; rr = rarityOf(mine.tier); }
      else { if (old) game.artifacts = game.artifacts.filter((a) => a !== old); game.artifacts.push({ id: w.id, tier: Shop.tierFit(w.id, w.tier) }); }
    }
    game.applyBoons(); game.saveRun();
    const def = info.def;
    game.floatText(goat.x, goat.y - 36, `${def.name} · ${rr.name}`, rr.color);
    game.ring(ware.x, ware.y, 1.6 * TILE, def.color); game.particles(ware.x, ware.y, 14, def.color, 150);
    game.audio.sfxBell(); game.vibe(20);
    if (w.cape && !game.capeTold) { game.capeTold = true; game.floatText(goat.x, goat.y - 54, `ON YOUR BACK · ${keysOf(game).item}`, PALETTE.bone); }
    else if (!w.cape && !game.shopTold) { game.shopTold = true; game.floatText(goat.x, goat.y - 54, 'IT HANGS AT YOUR NECK', PALETTE.bone); }
    // The others go back into the wall: one of the three, never two, unless the rat ogre is dead
    // on her floor (`ogreDown`), which is what THE SHELF IS YOURS says: every stool is his then.
    if (!ware.free) for (const o of game.props) {
      if (o === ware || o.kind !== 'ware' || o.shopId !== ware.shopId || o.broken || o.chosen) continue;
      o.broken = true; o.dead = true; game.particles(o.x, o.y, 8, PALETTE.ash, 90);
    }
    const m = Shop.mouseOf(game, ware);
    if (m && !ware.chosen) { m.say = { text: TUNING.prop.mouse.thanks, life: 2, max: 2 }; m.wobble = 0.25; }
    // `free` is left as it was: with the rat ogre dead the whole shelf is his, and a stool made
    // un-free here packed away every other one the moment he took his old talisman back off it.
    if (old) { ware.ware = old.cape ? { id: old.id, cape: true } : { id: old.id, tier: old.tier }; ware.chosen = true; ware.swapped = w.id; }
    else { ware.broken = true; ware.dead = true; }
    game.openSoulGate(ware.shopId);
  },

  // The third offer: no talisman, one pail of milk set down where the generator found room for it,
  // holding `TUNING.shop.heals` hearts, a drink a heart, so a goat at full health can come back to
  // it while he is still in her room instead of pouring two of the three away. The other two offers
  // go back into the wall exactly as they do when a talisman is taken, and the gate gives.
  takeMilk(game, ware, goat) {
    Stats.shop(game, ware, 'milk');
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
      m.say = { text: line, life: 2.2, max: 2.2, angry: m.strikes >= 2, strike: true };
      m.angry = m.strikes >= 2 ? 1.5 : 0;
      game.audio.sfxCluck();
      if (m.strikes >= 2) { game.shake(5); game.particles(m.x, m.y - 6, 6, PALETTE.blood, 90); }
      return;
    }
    Stats.provoked(game); Shop.spawnOgre(game, m);
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
  // lock until he is down; kill him and they are free, the Spelunky deal, honest only because the
  // fight is dear (see `TUNING.ratogre`).
  spawnOgre(game, m) {
    const cfg = TUNING.ratogre;
    m.broken = true; m.dead = true;
    Shop.breakWall(game, m);
    for (const w of game.props) if (w.kind === 'ware' && w.shopId === m.shopId && !w.broken) w.locked = true;
    // She was the bar of her room's gate, and she is gone: the way on opens with her. It used to
    // wait for a ware, and the wares wait for him, on THE YARD and THE ROAD her room and the one
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
    game.shake(12); game.hitstop(cfg.emergeFx.hitstop); game.zoomPunch(cfg.emergeFx.zoom); game.kick(0, dir, TUNING.juice.kick); game.vibe(60);
    game.audio.sfxGrowl(); game.audio.sfxSplat(); game.audio.musicEvent('kill');
    game.floatText(e.x, e.y - 40, 'RAT OGRE', PALETTE.blood);
    game.slowTimer = Math.max(game.slowTimer, cfg.emergeFx.slow);
    e.say = { text: 'YOU WERE ASKED', life: 2.4, max: 2.4 };
  },
  // He is down: whatever is still on the shelf is yours for nothing, and at its top tier (1 Oct 2026,
  // playtest: "the best only once you have beaten the mouse's ogre"; with two grades since 6 Oct 2026, a
  // COMMON talisman that has a RARE tier goes RARE, one with a single tier and a cape stay as they are).
  ogreDown(game, e) {
    let any = false, lifted = false;
    const top = RARITY[RARITY.length - 1];
    for (const w of game.props) if (w.kind === 'ware' && w.shopId === e.shopId && !w.broken) {
      w.locked = false; w.free = true; any = true;
      const d = w.ware && !w.ware.cape && w.ware.id !== 'milk' && !w.chosen ? Shop.def(w.ware.id) : null;
      if (d && w.ware.tier < d.tiers.length) { w.ware = { id: w.ware.id, tier: d.tiers.length }; lifted = true;
        game.ring(w.x, w.y, 1.4 * TILE, top.color); game.particles(w.x, w.y - 12, 16, top.color, 150); }
    }
    if (any) game.floatText(e.x, e.y - 58, lifted ? `THE SHELF IS YOURS · ${top.name}` : 'THE SHELF IS YOURS', lifted ? top.color : PALETTE.fireHi);
    // her offer comes up again as cards the next time he is by it (js/codex.js)
    if (game.shopShut) delete game.shopShut[e.shopId];
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
  // Q throws it. Out along the aim to `range` tiles, into a wall or into `pierce` men, whoever it
  // touches loses his head for `stun`, and then home, through anything, until it is back in the
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
      f.x += f.vx * dt; f.y += f.vy * dt; f.gone += hyp(f.vx, f.vy) * dt;
      const impact = w.collideCircle(f);
      if (impact > 0) { f.out = false; game.audio.sfxThud(); game.particles(f.x, f.y, 4, PALETTE.ash, 90); }
      else if (f.gone >= B.range * TILE) f.out = false;
      // The furniture stops it the way stone does: it comes home off a table or a shut door.
      for (const p of game.props) {
        if (!p.blocking || p.kind === 'cage') continue;
        if (hyp(p.x - f.x, p.y - f.y) < p.r + f.r) { f.out = false; if (p.kind === 'bell') p.ring(game); game.audio.sfxThud(); break; }
      }
    } else {
      // Home. It curves back through anything: a boomerang that got stuck behind a pillar would be a
      // talisman lost to the room, and `homeMax` is the belt to that brace.
      f.home += dt;
      const dx = g.x - f.x, dy = g.y - f.y, d = hyp(dx, dy) || 1;
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
      if (hyp(e.x - f.x, e.y - f.y) > e.r + f.r) continue;
      f.hit.push(e); if (f.out) f.outN++; else f.backN++;
      e.daze(game, B.stun); e.flash = Math.max(e.flash, TUNING.juice.hitFlash); e.aware = true;
      game.audio.sfxThud(); game.shake(2); game.hitstop(0.02);
      game.particles(e.x, e.y - 6, 6, PALETTE.bone, 120);
      if (e.kind === 'ratogre') game.floatText(e.x, e.y - 30, 'SWING BROKEN', PALETTE.fireHi);
      // On the way out it stops at its count of men and turns for home.
      if (f.out && f.outN >= B.pierce) f.out = false;
    }
  },

  // ---- the blink ----
  // Q, not the roll: no tumble, no travel, the goat is simply `dist` tiles further along the way
  // he was going. Stone and a drop stop it short; a shut door or a table stops it short; a man
  // does not. A held man is dropped the way the roll drops him, and the mercy frames it opens are
  // the roll's own, but its wait is `Goat.itemCd`, set by the press that used it, never `rollCd`.
  blink(game, goat, inx, iny) {
    const B = game.mods.blink, R = TUNING.goat.roll, w = game.world;
    let dx = inx, dy = iny;
    // The stick first; with none, where he is going; standing, where he faces.
    if (hyp(dx, dy) < 0.2) { dx = goat.vx; dy = goat.vy; if (hyp(dx, dy) < 20) { dx = Math.cos(goat.facing); dy = Math.sin(goat.facing); } }
    const l = hyp(dx, dy) || 1; dx /= l; dy /= l;
    const dist = B.dist * TILE;
    const solidAt = (px, py) => {
      if (w.isSolid(Math.floor(px / TILE), Math.floor(py / TILE)) || w.isPitPx(px, py)) return true;
      for (const p of game.props) if (p.blocking && hyp(p.x - px, p.y - py) < p.r + goat.r * 0.6) return true;
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
    if (hyp(bx - goat.x, by - goat.y) < TILE * 0.6) { game.floatText(goat.x, goat.y - 30, 'NO ROOM', PALETTE.ashHi); game.audio.sfxThud(); return false; }
    const ox = goat.x, oy = goat.y;
    if (goat.holding) {
      const h = goat.holding; goat.holding = null; h.held = false; goat.autoHeld = false;
      if (!h.item) { h.state = 'floored'; h.timer = TUNING.goat.grab.letGo; }
      goat.spendGrab(game, !h.item);
    }
    // Whoever stood where he left: the third tier leaves them reeling.
    if (B.stun > 0) for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted) continue;
      if (hyp(e.x - ox, e.y - oy) <= R.stunR + e.r) { e.daze(game, B.stun); game.particles(e.x, e.y - 6, 5, PALETTE.witchHi, 120); }
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
