// THE CAPES (6 Oct 2026). One worn at a time, on his back (`game.cape = { id }`), each a verb on Q
// with a long wait: the five in `CAPES` (js/tuning.js). This file is what Q does with each, the two new
// verbs (the grass and the shock), where a cape lies in a level and how it is taken. Its picture on him
// is js/cape-pixels.js. The old Q talismans' own machinery stays where it was (`Shop.throwBoomerang`,
// `Shop.blink`, `Talisman.placeEffigy`); a cape only puts its params on `game.mods`, and Q reads those.
const Cape = {
  def(id) { return CAPES.find((c) => c.id === id) || null; },
  // `game.cape` into `game.mods`, the way a talisman's tier goes (`Game.applyBoons`).
  apply(mods, cape) { const d = cape && Cape.def(cape.id); if (d) d.apply(mods, d.params); },
  // Which cape a niche holds, off its tile and the level's seed, never the one he has on: a layout
  // rebuilt off the same seed holds the same cape, and the deep niche is never a cape he already wears.
  pick(seed, x, y, worn) {
    const pool = CAPES.filter((c) => c.id !== worn), list = pool.length ? pool : CAPES;
    const h = farHash(((x / TILE) | 0) * 7 + (seed % 9973), ((y / TILE) | 0) * 13 + ((seed >>> 8) % 7919));
    return list[Math.min(list.length - 1, Math.floor(h * list.length))].id;
  },
  // The `cape` props the generator laid (a niche behind a niche, `carveSecret`) become a ware lying on
  // the floor: taken with GRAB like one of the mouse's (`Shop.buy`), a full slot leaving the old cape
  // where the new one lay. Each its own shelf of one (`shopId`), so taking it packs nothing else away.
  lay(game) {
    const seed = (game.level && game.level.seed) || 0, worn = game.cape && game.cape.id;
    // Right after `startLevel` builds `game.props` off `level.props`, so the two lists are index for index:
    // a spec naming its cape (`capeId`, THE SHOWROOM's row) is that cape.
    const specs = (game.level && game.level.props) || [];
    game.props.forEach((p, i) => {
      if (p.kind !== 'cape') return;
      p.kind = 'ware'; p.r = TUNING.prop.ware.r; p.floorCape = true;
      p.shopId = -200000 - i;
      const named = specs[i] && specs[i].kind === 'cape' && Cape.def(specs[i].capeId);
      p.ware = { id: named ? named.id : Cape.pick(seed, p.x, p.y, worn), cape: true };
    });
  },

  // ---- Q ----
  // Whichever verb the cape on his back carries, on its own clock (`Goat.itemCd`, set only when the
  // verb went off). Heaven turns every one of them off (`Heaven.enter`), so Q is nothing up there.
  use(game, g, inp) {
    const m = game.mods; let cd = 0;
    if (m.boomerang) { if (!game.boom.fly && Shop.throwBoomerang(game, g)) cd = m.boomerang.cooldown; }
    // Not out of a lunge, a roll or its stagger, the roll's own rule: a blink there cut the headbutt
    // short, stacked its mercy frames on the roll's and skipped the recovery (rule 4). The shock too.
    else if (m.blink) { if (g.state === 'idle' && Shop.blink(game, g, inp.mx, inp.my)) cd = m.blink.cooldown; }
    else if (m.effigy) { if (Talisman.placeEffigy(game, g)) cd = m.effigy.cooldown; }
    else if (m.sprout) { if (Cape.sprout(game, g)) cd = m.sprout.cooldown; }
    else if (m.ruin) { if (g.state === 'idle' && Cape.ruin(game, g)) cd = m.ruin.cooldown; }
    if (cd) g.itemCd = g.itemCdMax = cd;
  },

  // SHEPHERD'S MANTLE: a tuft of milk grass grows `ahead` tiles in front of him, on open floor. It is
  // grazed like any (`Prop.graze`): the heart is paid for in standing still, not in the press.
  sprout(game, g) {
    const P = game.mods.sprout, S = TUNING.cape.sprout, w = game.world;
    const ax = Math.cos(g.facing), ay = Math.sin(g.facing);
    const fits = (x, y) => {
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      if (w.isSolid(tx, ty) || w.isPitPx(x, y) || w.tileAtPx(x, y) === T.EXIT) return false;
      if (w.fire && w.fire[ty * w.W + tx] > 0) return false;
      for (const p of game.props) {
        if (p.broken || p.dead) continue;
        if (p.kind === 'heal' && hyp(p.x - x, p.y - y) < TILE) return false;
        if (p.blocking && hyp(p.x - x, p.y - y) < p.r + TUNING.prop.heal.r) return false;
      }
      return true;
    };
    let at = null;
    const x0 = g.x + ax * P.ahead * TILE, y0 = g.y + ay * P.ahead * TILE;
    if (fits(x0, y0)) at = { x: x0, y: y0 };
    for (let ring = 1; !at && ring <= S.search * 2; ring++) for (let k = 0; k < 12 && !at; k++) {
      const a = k / 12 * Math.PI * 2, x = x0 + Math.cos(a) * ring * TILE * 0.5, y = y0 + Math.sin(a) * ring * TILE * 0.5;
      if (fits(x, y)) at = { x, y };
    }
    if (!at) { game.floatText(g.x, g.y - 30, 'NO ROOM', PALETTE.ashHi); game.audio.sfxThud(); return false; }
    game.props.push(new Prop(at.x, at.y, 'heal', P.big ? { big: true } : {}));
    game.particles(at.x, at.y, 12, PALETTE.grassHi || '#9fd84a', 120);
    game.ring(at.x, at.y, 0.9 * TILE, PALETTE.grassHi || '#9fd84a', 0.5, 2);
    game.audio.sfxBleat(); game.vibe(10);
    return true;
  },

  // CAPE OF RUIN: the room round him comes apart, and nothing of it is a blow on him. What it breaks
  // breaks the way a headbutt or a blast breaks it, so a crate still splinters and a plank door still
  // throws whoever is behind it; it never lights a barrel (the powder spills, as a barrel broken cold
  // does) and never touches iron, a soul's gate, a seal or the vault. Men are thrown and floored, and the
  // wall they reach is what kills (pillar 3): `fling` off the shock is a shove, not a thrown body.
  ruin(game, g) {
    const P = game.mods.ruin, L = TUNING.cape.ruin, R = P.r * TILE, BR = TUNING.prop.barrel;
    for (const p of game.props.slice()) {
      if (p.broken || p.dead || p.held || p.inStand) continue;
      const dx = p.x - g.x, dy = p.y - g.y, d = hyp(dx, dy);
      if (d > R + (p.r || 12)) continue;
      const nx = dx / (d || 1), ny = dy / (d || 1), onWall = p.kind === 'secret';
      if (!game.blastClear(g.x, g.y, onWall ? p.x - nx * TILE * BR.wallStep : p.x, onWall ? p.y - ny * TILE * BR.wallStep : p.y)) continue;
      if (p.kind === 'crate' && !p.corpse) { if (p.alight) p.burst(game, p.alight === 'witch'); else p.shatter(game); }
      else if (p.kind === 'barrel' && !(p.oilT >= 0)) p.shatter(game);
      else if (p.kind === 'lamp') p.topple(game, nx, ny);
      else if (p.kind === 'door' && !p.iron && !p.gate && !p.seal && !p.vault && !p.stair && !(p.open >= 0.5)) p.smash(game, nx, ny, null);
      else if (p.kind === 'secret') p.crackWall(game);
      else if (p.kind === 'rock') p.crackRock(game);
      else if (p.kind === 'suit' && p.burstArmor) p.burstArmor(game, nx, ny);
    }
    // A wraith lying as a crate is no prop: the shock that broke every crate round it finds it out.
    for (const e of game.enemies) {
      if (e.dead || e.state !== 'hidden' || !e.disguise || e.disguise.kind !== 'crate') continue;
      if (hyp(e.x - g.x, e.y - g.y) <= R + (e.disguise.r || 12) && game.blastClear(g.x, g.y, e.x, e.y)) e.unmask(game);
    }
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted || e.state === 'hidden' || e.state === 'hop') continue;
      const dx = e.x - g.x, dy = e.y - g.y, d = hyp(dx, dy);
      if (d > R + e.r || !game.blastClear(g.x, g.y, e.x, e.y)) continue;
      const nx = dx / (d || 1), ny = dy / (d || 1);
      // Nothing throws the ogre or the rat ogre: the shock only rocks them where they stand.
      if (e.kind === 'butcher') { e.state = 'stagger'; e.timer = L.stagger; e.aware = true; continue; }
      if (e.kind === 'ratogre') { e.daze(game, L.stagger); continue; }
      e.daze(game, P.daze);
      e.fling(nx * P.fling * TILE * e.knockMul(), ny * P.fling * TILE * e.knockMul(), false);
      e.flash = Math.max(e.flash || 0, TUNING.juice.hitFlash);
    }
    if (game.scatter) game.scatter.burst(g.x, g.y, R * 2);
    game.ring(g.x, g.y, R, PALETTE.blood, 0.5, 4); game.ring(g.x, g.y, R * L.ring * 0.6, PALETTE.fireHi, 0.35, 2);
    game.particles(g.x, g.y, L.parts, PALETTE.ash, 260); game.particles(g.x, g.y, 8, PALETTE.blood, 180);
    game.thud(g.x, g.y, L.shake); game.hitstop(0.05); game.squashGoat(TUNING.juice.squash.land);
    game.audio.sfxBoom(); game.audio.sfxCrack(); game.vibe(30);
    game.world.emitNoise(g.x, g.y, TUNING.noise.boom);
    return true;
  },
};
