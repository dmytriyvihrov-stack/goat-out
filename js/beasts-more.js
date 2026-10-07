// THE RABBIT AND THE HUSKY (1 Oct 2026, playtest), and the answer every animal now waits for.
//
//   RABBIT  "he offers to tie your legs, no running, only the headbutt, the skills and the items,
//           so you try it his way, in jumps". Said yes: `game.legsTied`. No stride at all; the roll
//           is the hop, where you point and back far sooner (`TUNING.prop.rabbit.tied`). Up the stairs
//           with him so: the roll comes back sooner for the run.
//   HUSKY   "she runs into the next room where the men are and they leave her be; you follow, she
//           sings WAF WOOO and you answer with your BAAH, like Guitar Hero, her stave and yours;
//           the cooldown is what makes it hard, in a fight". Said yes: a practice first, the two of
//           them in an empty room (`game.song.practice`), then she leads to the fullest room ahead,
//           the song starts as he comes in (`game.song`), and his voice, on the beat, answers.
//
// Every animal, once it has said its terms in the box, waits for BAAAH (yes) or bah (no) (`BEAST_ANSWER`,
// `Beast.answer`): refused, it goes its own way and pays nothing.
//
// Both are drawn as hand-placed pixels on `PROP_PIXELS.Grid` (side on, facing right), the recipe of
// every prop, and loaded after js/prop-pixels.js. `TUNING.prop.rabbit` / `.husky` are every number.
const BEAST_MORE = (() => {
  const G = PROP_PIXELS.Grid, P = PROP_PIXELS.P;
  const RB = { f0: '#6e5a48', f1: '#8f7860', f2: '#b29a7e', f3: '#d3c0a2', w: '#efe6d6', pk: '#d98f9a', ey: '#1a1012' };
  const HK = { g0: '#465063', g1: '#6b7689', g2: '#8f9aab', w0: '#d6dbe3', w1: '#f4f6fa', ey: '#4fb2ff', ns: '#1a1b22', pk: '#f2a0b4' };
  // The rabbit, sitting (`up` false) or mid-hop, stretched long.
  const rabbit = (hop) => {
    const g = new G(18, 16);
    if (!hop) {
      g.ell(7, 10.5, 5.2, 3.8, RB.f1).ell(7, 9.6, 4.4, 2.6, RB.f2, true);
      g.ell(12.5, 7, 3, 2.6, RB.f1).ell(12.8, 6.4, 2.2, 1.7, RB.f2, true);
      g.rect(11, 1, 1, 5, RB.f1).rect(13, 1, 1, 5, RB.f1).vl(11, 2, 3, RB.pk).vl(13, 2, 3, RB.pk);
      g.hl(3, 14, 4, RB.f0).hl(10, 14, 3, RB.f0);
    } else {
      g.ell(8, 9.5, 6.2, 3, RB.f1).ell(8, 8.8, 5.2, 2, RB.f2, true);
      g.ell(14, 7, 2.8, 2.4, RB.f1).ell(14.2, 6.5, 2, 1.6, RB.f2, true);
      g.line(12, 5, 10, 1, RB.f1).line(14, 5, 13, 1, RB.f1);
      g.line(3, 11, 0, 13, RB.f0).hl(13, 12, 3, RB.f0);
    }
    g.ell(hop ? 2 : 2.2, hop ? 8.5 : 9.5, 1.7, 1.6, RB.w);
    g.set(hop ? 15 : 13.6, hop ? 6 : 6, RB.ey).set(hop ? 16 : 15, hop ? 7 : 7, RB.pk);
    g.ell(hop ? 8 : 7, hop ? 11 : 12.4, 2.6, 0.9, RB.f3, true);
    return g.outline(P.ol).trim();
  };
  // The husky, standing, and with her muzzle up to sing. Drawn sweet (1 Oct 2026, "much cuter"): a big
  // round head in the husky's mask, grey cap, white face, a white blaze up the brow, big blue eyes
  // with a glint, pink-lined ears, a fluffy curl of tail over the back, a chunky body on short paws.
  // Singing she points her muzzle up, eyes shut in two happy arcs, her mouth a round O.
  const husky = (sing) => {
    const g = new G(28, 24);
    // the far legs first, a step darker, then the body over them
    for (const x of [8, 17]) g.rect(x, 18, 2, 4, HK.g0).hl(x, 21, 2, HK.w0);
    g.ell(12, 15, 7.2, 4.4, HK.g1).ell(11.4, 12.4, 6.2, 1.8, HK.g0, true).ell(12.6, 17.2, 5.8, 2.2, HK.w0, true);
    for (const x of [6, 15]) g.rect(x, 18, 3, 4, HK.g1).hl(x, 21, 3, HK.w1);
    // the tail: a fat curl up over the rump, its tip white, no hole in it
    g.ell(5, 9.6, 3.4, 3, HK.g1).ell(4.4, 8.6, 2.2, 1.4, HK.g2, true).ell(5.8, 10.8, 1.6, 1.3, HK.g0, true).ell(7.6, 8.2, 1.5, 1.2, HK.w1);
    const hx = 20, hy = sing ? 8 : 9.4;
    // the chest ruff, white, under the head
    g.ell(hx - 1.8, hy + 4.4, 2.6, 2.2, HK.w0);
    // the ears: two triangles off the crown, pink inside
    const ear = (x0, x1, top) => { g.poly([[x0, hy - 2.6], [(x0 + x1) / 2, top], [x1, hy - 2.6]], HK.g0); g.vl(Math.round((x0 + x1) / 2), Math.round(top) + 2, 2, HK.pk); };
    ear(hx - 3.8, hx - 0.4, hy - 8); ear(hx + 0.2, hx + 3.6, hy - 8.2);
    // the head, big and round, grey on top and white below
    g.ell(hx, hy, 5.4, 5, HK.g1).ell(hx - 0.4, hy - 2.4, 4.6, 2.4, HK.g0, true);
    g.line(hx - 5, hy + 1, hx - 3, hy + 4, P.ol);   // the jaw's line over the neck, so the head reads as a head
    g.ell(hx + 1.6, hy + 2.4, 3.6, 2.2, HK.w1, true).vl(hx + 1, hy - 4, 3, HK.w1);   // the mask: white cheeks, a blaze up the brow
    if (sing) {
      // the muzzle up, a round O for a mouth, the eyes shut happy
      g.ell(hx + 4.4, hy - 0.2, 2.2, 1.8, HK.w1).set(hx + 6, hy - 1.6, HK.ns);
      g.rect(hx + 4, hy + 0.6, 2, 2, HK.ns).set(hx + 4, hy + 1.6, HK.pk);
      g.hl(hx - 1, hy - 0.4, 3, HK.ns).set(hx, hy - 1.2, HK.ns);
    } else {
      // a short muzzle, the black button of a nose, a small smile
      g.ell(hx + 4.6, hy + 1.6, 2.2, 1.7, HK.w1).hl(hx + 5, hy + 0.4, 2, HK.ns);
      g.set(hx + 4.6, hy + 2.8, HK.g0).set(hx + 5.4, hy + 3.2, HK.g0);
      // the eye: two by two, ice blue, a glint toward the light
      g.rect(hx, hy - 1.4, 2, 3, HK.ey).set(hx, hy - 1.4, HK.w1).set(hx + 1, hy + 0.6, HK.ns);
    }
    g.hl(hx + 1.6, hy + 2.2, 2, HK.pk);   // the cheek
    return g.outline(P.ol).trim();
  };
  // THE FISH in its tank (6 Oct 2026, the uncle's): a glass box seen from the front and a little above,
  // water lit at the top, gravel and a stalk of weed at the bottom, and a small orange fish that swims
  // from one end to the other. Four frames, `fish-0..3`: where it is, which way it faces, its bubbles.
  // `broken`: the empty frame and the glass's shards, for the corpse on the floor.
  const FT = { g0: '#2a4a52', g1: '#4d8592', g2: '#8fcbd2', g3: '#e2f6f4', w0: '#1d4356', w1: '#2c637a', w2: '#4f98aa',
    s0: '#6e5c3a', s1: '#a58d58', s2: '#d4bc84', f0: '#9c3814', f1: '#ec7a22', f2: '#ffc457', wd0: '#24461c', wd1: '#3f7a29' };
  const tank = (fx, dir, bubbles, broken) => {
    const g = new G(22, 18);
    g.rect(1, 3, 20, 14, FT.g1);                                 // the glass, seen through
    if (!broken) {
      g.rect(2, 5, 18, 11, FT.w1).hl(2, 5, 18, FT.w2).hl(2, 6, 18, FT.w2).hl(3, 7, 16, FT.w2, true);   // water, lit from the top
      g.rect(2, 13, 18, 3, FT.s1).hl(2, 13, 18, FT.s2);            // gravel
      for (const x of [3, 6, 8, 11, 15, 18]) g.set(x, 14 + (x % 2), FT.s0);
      g.vl(4, 9, 4, FT.wd1).vl(5, 10, 3, FT.wd0).set(3, 10, FT.wd1).set(6, 11, FT.wd1);   // weed
      // the fish: a body, its belly lit, a tail behind it, an eye in front
      g.ell(fx, 9.5, 2.8, 1.7, FT.f1).hl(fx - 1, 10, 3, FT.f2);
      const tx = fx - dir * 3.4;
      g.poly([[tx + dir * 0.8, 9.5], [tx - dir * 1.6, 7.8], [tx - dir * 1.6, 11.2]], FT.f0);
      g.set(fx + dir * 1.6, 9, '#14100e');
      for (const [bx, by] of bubbles) g.set(bx, by, FT.g3);
    } else {
      g.rect(2, 13, 18, 3, FT.s1).hl(2, 13, 18, FT.s0);            // only wet gravel left
    }
    // the box: a lit top rim, the near edges, a dark foot, and the glare down the glass
    g.hl(1, 3, 20, FT.g3).vl(1, 3, 14, FT.g2).vl(20, 3, 14, FT.g0).hl(1, 16, 20, FT.g0);
    g.vl(17, 6, 5, FT.g3).vl(18, 7, 2, FT.g2);
    if (broken) { g.rect(6, 3, 5, 6, null); g.line(6, 3, 9, 9, FT.g3).line(12, 3, 10, 8, FT.g2).set(14, 4, null); }
    return g.outline(P.ol).trim();
  };
  const S = PROP_PIXELS.sprites;
  S['rabbit-sit'] = rabbit(false); S['rabbit-hop'] = rabbit(true);
  S['husky-stand'] = husky(false); S['husky-sing'] = husky(true);
  S['fish-0'] = tank(7, 1, [[12, 8]]); S['fish-1'] = tank(11, 1, [[14, 7], [13, 10]]);
  S['fish-2'] = tank(14, -1, [[9, 7]]); S['fish-3'] = tank(10, -1, [[6, 8], [7, 11]]);
  S['fish-broken'] = tank(0, 1, [], true);
  S['fish-shard'] = new G(4, 5).poly([[0, 0], [4, 1], [1, 5]], FT.g2).set(1, 1, FT.g3).outline(P.ol).trim();
  S['fish-body'] = new G(9, 5).ell(4.5, 2.5, 3, 1.6, FT.f1).hl(3, 3, 3, FT.f2).poly([[1.6, 2.5], [0, 0.6], [0, 4.4]], FT.f0).set(6, 2, '#14100e').outline(P.ol).trim();
  return { RB, HK, FT };
})();

Object.assign(Beast, {
  // ---------------------------------------------------------------- the picture
  // At its feet (p.x, p.y), the way the goose and the pig stand: counter-squashed, mirrored to its `face`.
  drawMore(R, p, k) {
    const ctx = R.ctx, T = 1.35 * (k || 1), C = TUNING.prop[p.kind];
    let name, lift = 0;
    if (p.kind === 'rabbit') {
      const ph = ((p.bob || 0) / 3 / C.hop) % 1, moving = hyp(p.vx || 0, p.vy || 0) > 8;
      name = moving && ph < C.hopShare ? 'rabbit-hop' : 'rabbit-sit';
      if (moving && ph < C.hopShare) lift = Math.sin(ph / C.hopShare * Math.PI) * C.hopH;
    } else name = p.singing > 0 ? 'husky-sing' : 'husky-stand';
    const g = PROP_PIXELS.sprites[name], w = g.w * T, h = g.h * T;
    R.shadow(p.x, p.y + 2, w * 0.38, w * 0.16);
    ctx.save(); ctx.translate(p.x, p.y + 3); ctx.scale((p.face || 1) < 0 ? -1 : 1, 1 / TILT);
    if (p.hurtFlash > 0) ctx.filter = 'brightness(2)';
    const bob = p.kind === 'husky' && hyp(p.vx || 0, p.vy || 0) > 8 ? Math.round(Math.abs(Math.sin((p.bob || 0) * 3)) * 1.5) : 0;
    PROP_PIXELS.draw(ctx, name, -w / 2, -h - lift - bob, T);
    ctx.restore();
  },

  // ---------------------------------------------------------------- the answer
  // The last page of a first meeting waits for one: `Beast.talk(..., ask)`.
  answer(game, p, yes) {
    p.agreed = !!yes; Stats.beast(game, p.kind, yes ? 'yes' : 'no');
    if (!yes) { Beast.refuse(game, p); return; }
    if (p.kind === 'rabbit') { game.legsTied = { p }; game.applyBoons(); game.floatText(game.goat.x, game.goat.y - 40, 'LEGS TIED', PALETTE.hen); }
    if (p.kind === 'husky') { p.task = 'practice'; p.leadAt = 0; }
  },
  // Refused: it says so and goes off, out of the run (`saved` passes over it, and it is gone a moment later).
  refuse(game, p) {
    // The pig does not go (2 Oct 2026 playtest, "one of the hardest, you are short of grass"): she says
    // she will eat it anyway and walks on ahead of him to every tuft she can find (`Beast.updatePig`'s
    // `spite`). Only a horn stops her for good (`Prop.headbutt`).
    if (p.kind === 'pig') {
      const L = TUNING.prop.pig.spite.say;
      p.spite = true; p.task = null;
      game.floats.push({ x: p.x, y: p.y, on: p, row: 0, n: 1, text: L[(Math.random() * L.length) | 0], color: PALETTE.hen, life: 2.4, pact: true });
      return;
    }
    p.refused = TUNING.beast.refuseFor; p.task = null;
    const L = BEAST_ANSWER.refused;
    game.floats.push({ x: p.x, y: p.y, on: p, row: 0, n: 1, text: L[(Math.random() * L.length) | 0], color: PALETTE.hen, life: 1.6, pact: true });
    if (p.kind === 'chicken' || p.kind === 'tortoise') { p.wander = true; }
  },
  // Going: away from him and out of the picture.
  updateRefused(p, dt, game) {
    p.refused -= dt;
    const g = game.goat, dx = p.x - g.x, dy = p.y - g.y, d = hyp(dx, dy) || 1;
    Beast.step(p, game, dx / d, dy / d, (TUNING.prop[p.kind] && TUNING.prop[p.kind].speed) || 60, dt);
    if (p.refused <= 0) { p.broken = true; p.dead = true; game.particles(p.x, p.y, 10, PALETTE.ash, 90); }
  },

  // ---------------------------------------------------------------- the fish
  // THE FISH (6 Oct 2026, the uncle's: "a fish in an aquarium. It only gurgles when you talk to it. Its tank is
  // heavy and you can only carry it. Thrown, it flies a couple of tiles and stops; if it hits something on
  // the way it breaks and the fish dies"). No coop: the tank stands on the floor of its room. In his teeth he
  // walks at `carry` of his stride (`Goat.update`); thrown it goes `throwTiles` and sets down; stone, a
  // shut door, furniture or a man on the way and the glass goes (`breakFish`). Up the stairs with it: his
  // fleece is wet on every floor after (`mods.wet`), and the first flame on him each floor only steams.
  updateFish(p, dt, game) {
    const C = TUNING.prop.fish;
    p.blubT = (p.blubT === undefined ? C.blub[0] : p.blubT) - dt;
    if (p.flying) {
      const sp = hyp(p.vx, p.vy) || 1, ox = p.x, oy = p.y;
      p.x += p.vx * dt; p.y += p.vy * dt; p.flown = (p.flown || 0) + sp * dt;
      const impact = game.world.collideCircle(p);
      if (impact > 0 || p.hitProp(game, p.vx / sp, p.vy / sp)) { Beast.breakFish(p, game, p.vx / sp, p.vy / sp); return; }
      for (const e of game.enemies) {
        if (e.dead || e.held || e.ghosted || hyp(e.x - p.x, e.y - p.y) > e.r + p.r) continue;
        // A man is in the way like a wall is: the tank goes, and he is floored by it as by a crate.
        if (e.kind !== 'butcher' && e.kind !== 'ratogre') { const st = TUNING.prop.crate.stun; e.state = 'floored'; e.timer = st; e.dazed = Math.max(e.dazed, st); e.aware = true; }
        Beast.breakFish(p, game, p.vx / sp, p.vy / sp); return;
      }
      void ox; void oy;
      if (p.flown >= C.throwTiles * TILE) {
        p.flying = false; p.vx = 0; p.vy = 0; p.flown = 0;
        game.audio.sfxThud(); game.particles(p.x, p.y, 4, '#8fcbd2', 90);
        if (game.world.isPitPx(p.x, p.y)) { Beast.breakFish(p, game, 0, 0, true); return; }
      }
      return;
    }
    p.vx = 0; p.vy = 0;
    if (p.blubT <= 0) {
      p.blubT = C.blub[0] + Math.random() * (C.blub[1] - C.blub[0]);
      if (hyp(p.x - game.goat.x, p.y - game.goat.y) < C.hearR * TILE) game.audio.sfxAnimal('fish');
      game.particles(p.x, p.y - 18, 2, '#e2f6f4', 30);
    }
  },
  throwFish(p, game, ax, ay) {
    const C = TUNING.prop.fish, l = hyp(ax, ay) || 1;
    p.flying = true; p.flown = 0; p.vx = (ax / l) * C.throwSpeed; p.vy = (ay / l) * C.throwSpeed;
    game.audio.sfxSwing(); game.audio.sfxAnimal('fish');
  },
  // The glass goes: shards, the water, and the fish flapping out its last on the floor (a fall takes it
  // with the tank). Dead either way, the way an escort dies (`Beast.hurt`'s last heart).
  breakFish(p, game, ax, ay, fell) {
    if (p.broken) return;
    if (game.goat.holding === p) game.goat.holding = null;
    p.held = false; p.flying = false;
    game.audio.sfxTank && game.audio.sfxTank();
    if (fell) { p.gone(game); Stats.beast(game, 'fish', 'dead'); game.floatText(p.x, p.y - 30, 'THE FISH IS GONE', PALETTE.blood); return; }
    p.broken = true; p.dead = true; Stats.beast(game, 'fish', 'dead');
    game.particles(p.x, p.y - 6, 18, '#8fcbd2', 220); game.particles(p.x, p.y, 10, '#e2f6f4', 160); game.particles(p.x, p.y, 4, '#ec7a22', 90);
    if (game.scatter) game.scatter.breakUp(['fish-shard', 'fish-shard', 'fish-shard', 'fish-body'], p.x, p.y, 10, ax || 0, ay || 0, 0.7);
    game.world.dot(p.x, p.y, 11, 'rgba(60,110,130,0.55)');
    game.floatText(p.x, p.y - 30, 'THE FISH IS DEAD', PALETTE.blood);
    game.shake(3); game.hitstop(0.04);
  },
  drawFish(R, p, k) {
    const ctx = R.ctx, T = 1.35 * (k || 1), held = p.held;
    const name = p.broken ? 'fish-broken' : 'fish-' + (Math.floor((R.t + (p.phase || 0)) * 1.6) % 4);
    const g = PROP_PIXELS.sprites[name], w = g.w * T, h = g.h * T;
    const spin = p.flying ? Math.sin(R.t * 18) * 0.12 : 0, lift = p.flying ? 6 : held ? 2 : 0;
    if (!held) R.shadow(p.x, p.y + 2 + lift, w * 0.42, w * 0.14);
    ctx.save(); ctx.translate(p.x, p.y + 3 - lift); ctx.rotate(spin); ctx.scale(1, 1 / TILT);
    if (p.hurtFlash > 0) ctx.filter = 'brightness(2)';
    PROP_PIXELS.draw(ctx, name, -w / 2, -h, T);
    ctx.restore();
  },

  // ---------------------------------------------------------------- the rabbit
  updateRabbit(p, dt, game) {
    const C = TUNING.prop.rabbit;
    const away = Beast.shy(p, game);
    if (away) { if (away.d) Beast.step(p, game, away.x, away.y, C.speed * TUNING.beast.shySpeed, dt); else { p.vx = 0; p.vy = 0; } return; }
    const to = Beast.toGoat(p, game);
    // in hops: it moves only through the first part of each, and sits the rest
    const ph = ((p.bob || 0) / 3 / C.hop) % 1;
    if (to.d < C.followAt * TILE || ph >= C.hopShare) { p.vx = 0; p.vy = 0; if (Math.abs(game.goat.x - p.x) > C.faceDead) p.face = Math.sign(game.goat.x - p.x); return; }
    Beast.step(p, game, to.x, to.y, C.speed * C.hopSpeed * (to.d > C.catchFar * TILE ? C.catchUp : 1), dt);
  },

  // ---------------------------------------------------------------- the husky
  // Before an answer, and once her song is sung, she follows him; said yes, she leads to the fullest
  // room within `ahead` with men in it and waits in its middle; as he comes in, the song.
  updateHusky(p, dt, game) {
    const C = TUNING.prop.husky, g = game.goat, L = game.level;
    p.singing = Math.max(0, (p.singing || 0) - dt);
    // First the practice (1 Oct 2026: "train the mini-game first in a room with only her, then run to
    // the room with people"): in the first room he stands in with nobody alive, beside him, a song
    // with no cult and no clock that cannot be lost. Then she leads to the real one.
    if (p.task === 'practice') {
      const room = roomAt(L, g.x, g.y);
      const empty = room && !game.enemies.some((e) => !e.dead && !e.scripted && roomAt(L, e.x, e.y) === room);
      if (!game.song && empty && roomAt(L, p.x, p.y) === room && hyp(g.x - p.x, g.y - p.y) < C.practice.near * TILE) return Beast.startSong(game, p, room, true);
      return Beast.follow(p, dt, game, C);
    }
    if (p.task === 'lead' || p.task === 'wait') {
      if (p.target === undefined || (p.leadAt -= dt) <= 0) {
        p.leadAt = C.leadEvery;
        // He ran through the room she was waiting in: she leads on, never sits behind him.
        if (p.task === 'wait' && (game.goatRoom || 0) > p.target) p.task = 'lead';
        if (p.task === 'lead') {
          const here = game.goatRoom || 0;
          let best = -1, most = 0;
          for (let i = here + 1; i <= here + C.ahead && i < L.rooms.length; i++) {
            const n = game.enemies.filter((e) => !e.dead && !e.scripted && roomAt(L, e.x, e.y) === L.rooms[i]).length;
            if (n > most) { most = n; best = i; }
          }
          p.target = best;
        }
      }
      if (p.target < 0) return Beast.follow(p, dt, game, C);
      const room = L.rooms[p.target], cx = (room.x + room.w / 2) * TILE, cy = (room.y + room.h / 2) * TILE;
      const inside = roomAt(L, p.x, p.y) === room;
      if (!inside) { const on = Beast.onward(p, game); if (on) Beast.step(p, game, on.x, on.y, C.speed, dt); else { p.vx = 0; p.vy = 0; } }
      else {
        p.task = 'wait';
        const dx = cx - p.x, dy = cy - p.y, d = hyp(dx, dy);
        if (d > TILE) Beast.step(p, game, dx / d, dy / d, C.speed, dt); else { p.vx = 0; p.vy = 0; p.face = Math.sign(g.x - p.x) || 1; }
        if (!game.song && roomAt(L, g.x, g.y) === room) Beast.startSong(game, p, room);
      }
      return;
    }
    if (p.task === 'sing') {
      // His fire burns her like anyone (`Beast.tick` → `hurt`), but she does not stand in it and
      // sing: off a burning tile she steps to the nearest one that is not, and sings on from there.
      const w = game.world;
      if (w.isBurningPx(p.x, p.y)) {
        const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
        let best = null, bd = Infinity;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const x = (tx + dx + 0.5) * TILE, y = (ty + dy + 0.5) * TILE, d = dx * dx + dy * dy;
          if (!d || d >= bd || w.isSolid(tx + dx, ty + dy) || w.isBurningPx(x, y) || w.isPitPx(x, y)) continue;
          best = { x, y }; bd = d;
        }
        if (best) { const dx = best.x - p.x, dy = best.y - p.y, d = hyp(dx, dy) || 1; Beast.step(p, game, dx / d, dy / d, C.speed, dt); return; }
      }
      p.vx = 0; p.vy = 0; p.face = Math.sign(g.x - p.x) || p.face || 1; return;
    }
    Beast.follow(p, dt, game, C);
  },
  // After him, the pig's way.
  follow(p, dt, game, C) {
    const to = Beast.toGoat(p, game);
    if (to.d < C.followAt * TILE) { p.vx = 0; p.vy = 0; if (Math.abs(game.goat.x - p.x) > 8) p.face = Math.sign(game.goat.x - p.x); return; }
    Beast.step(p, game, to.x, to.y, C.speed * (to.d > C.catchFar * TILE ? C.catchUp : 1), dt);
  },
  // The song starts: the cult comes in after him (`extra`, at the way in, already after him).
  startSong(game, p, room, practice) {
    const C = TUNING.prop.husky;
    p.task = 'sing';
    // A bar is never shorter than his voice takes to come back plus `cdGap` (2 Oct 2026 playtest: "my part
    // between my cooldowns, so I can really perform"): with DRAGON BREATH's long cooldown it stretches.
    const len = Math.max(C.cycle, (game.mods.screamCooldown || 0) + C.cdGap);
    game.song = { p, room: room.index, t: -C.leadIn, len, hits: 0, perfect: 0, cycle: -1, answered: false, done: null, cleared: -1, flash: 0, miss: 0, practice: !!practice };
    if (practice) {
      // Just the two of them: no cult called in, no howl the house hears.
      game.audio.sfxHusky('woo');   // what to do is written over the staves (`drawSong`), not over her head
      return;
    }
    const at = room.enter || { x: (room.x + 1.5) * TILE, y: (room.y + room.h / 2) * TILE };
    for (let k = 0; k < C.extra; k++) {
      const e = new Enemy(at.x + (k - 0.5) * 22, at.y + (k % 2) * 14, 'bearer');
      e.aware = true; e.woke = true; e.room = room.index;
      game.enemies.push(e);
    }
    game.floats.push({ x: p.x, y: p.y, on: p, row: 0, n: 1, text: 'AWOOOO!', color: PALETTE.hen, life: 1.6, pact: true });
    game.world.emitNoise(p.x, p.y, TUNING.noise.boom);
    game.audio.sfxHusky('woo');
  },
  // His voice, from `Goat.update`'s BAAH (any of its souls): on the beat, an answer.
  heard(game) {
    const S = game.song, C = TUNING.prop.husky; if (!S || S.done) return;
    // In a song his voice is a goat's whatever a soul made of it: DRAGON BREATH and VENOM SPIT still
    // burn and spit (`Goat.update` goes on to them), but he bleats as he does it, so he is heard
    // singing back (2 Oct 2026). The plain voice and THE FULL THROAT are a BAAAH already.
    if (game.mods.spit || game.mods.breath) {
      const g = game.goat; game.audio.sfxBleat(C.beh[0], C.beh[1], C.beh[2]);
      game.floats.push({ x: g.x, y: g.y - 26, text: 'BEH!', color: PALETTE.bone, life: 0.8 });
    }
    const ph = S.t - S.cycle * S.len, err = ph - C.you, J = C.judge;
    // She says how it went, every time (2 Oct 2026 playtest: "she should say whether it worked, and
    // how well"): PERFECT, GOOD, a little EARLY or LATE inside the window; a voice nowhere near her
    // beat is OFF THE BEAT.
    if (S.cycle >= 0 && !S.answered && Math.abs(err) <= C.window) {
      S.answered = true; S.hits++; S.flash = C.flash;
      const perfect = Math.abs(err) <= J.perfect; if (perfect) S.perfect++;
      const word = perfect ? J.words.perfect : Math.abs(err) <= J.good ? J.words.good : err < 0 ? J.words.early : J.words.late;
      game.particles(game.goat.x, game.goat.y - 16, perfect ? 16 : 10, '#9fd0ff', 160);
      game.ring(game.goat.x, game.goat.y, (perfect ? 1.3 : 0.9) * TILE, '#9fd0ff', 0.4, 2);
      game.floats.push({ x: S.p.x, y: S.p.y, on: S.p, row: 0, n: 1, text: word, color: perfect ? '#cfe8ff' : '#9fd0ff', life: 1.3, pact: true });
    } else if (S.cycle >= 0 && !S.answered && Math.abs(err) <= J.off) {
      game.floats.push({ x: S.p.x, y: S.p.y, on: S.p, row: 0, n: 1, text: J.words.off, color: PALETTE.blood, life: 1.1, pact: true });
    }
  },
  updateSong(game, dt) {
    const S = game.song; if (!S) return;
    const C = TUNING.prop.husky, p = S.p, L = game.level;
    if (S.done) { S.end -= dt; if (S.end <= 0) game.song = null; return; }
    if (p.broken || p.dead) { game.song = null; return; }
    S.t += dt; S.flash = Math.max(0, S.flash - dt); S.miss = Math.max(0, S.miss - dt);
    const c = Math.floor(S.t / S.len);
    if (S.t >= 0 && c !== S.cycle) {
      if (S.cycle >= 0 && !S.answered) {
        S.miss = C.miss;
        game.floats.push({ x: p.x, y: p.y, on: p, row: 0, n: 1, text: C.judge.words.miss, color: PALETTE.blood, life: 1.1, pact: true });
      }
      S.cycle = c; S.answered = false;
      if (S.cleared >= 0 && c - S.cleared >= C.after) return Beast.endSong(game, false);
    }
    const ph = S.t - S.cycle * S.len;
    // her notes, sung as they cross the line: every one a howl (3 Oct 2026, "when her note comes, she
    // really does WOO"; the first was a bark), the last held long
    for (const h of C.her) if (S.cycle >= 0 && ph >= h && ph - dt < h) {
      const long = h === C.her[C.her.length - 1];
      p.singing = long ? 0.9 : 0.5; game.audio.sfxHusky(long ? 'woo' : 'wu', 1, true);
      game.ring(p.x, p.y, (long ? 1 : 0.6) * C.wooRing * TILE, '#9fd0ff', 0.5, 2);
      game.floats.push({ x: p.x, y: p.y, on: p, row: 0, n: 1, text: long ? 'WOOOO' : 'WOO', color: PALETTE.hen, life: 0.7, pact: true });
    }
    if (S.practice) {
      // The practice cannot be lost: it ends sung, or when he walks out of the room, or men come in,
      // or `practice.time` runs out, and every way it ends, she goes on to the real one.
      const room = L.rooms[S.room], g = game.goat;
      const gone = roomAt(L, g.x, g.y) !== room || S.t > C.practice.time
        || game.enemies.some((e) => !e.dead && !e.scripted && e.aware && roomAt(L, e.x, e.y) === room);
      if (S.hits >= C.practice.need || gone) return Beast.endPractice(game, S.hits >= C.practice.need);
      return;
    }
    if (S.cleared < 0 && !game.enemies.some((e) => !e.dead && !e.scripted && roomAt(L, e.x, e.y) === L.rooms[S.room])) S.cleared = Math.max(0, S.cycle);
    if (S.hits >= C.need) return Beast.endSong(game, true);
    if (S.t > C.time) return Beast.endSong(game, false);
  },
  songNeed(S) { const C = TUNING.prop.husky; return S.practice ? C.practice.need : C.need; },
  endPractice(game, sung) {
    const S = game.song, p = S.p, C = TUNING.prop.husky;
    S.done = sung ? 'practised' : 'skipped'; S.end = C.endShow;
    p.task = 'lead'; p.leadAt = 0; p.target = undefined;
    game.floats.push({ x: p.x, y: p.y, on: p, row: 0, n: 1, text: sung ? C.practice.good : C.practice.go, color: PALETTE.hen, life: 2.4, pact: true });
  },
  endSong(game, won) {
    const S = game.song, p = S.p, C = TUNING.prop.husky;   // without it every song's end threw, every frame
    S.done = won ? 'won' : 'lost'; S.end = C.endLost;
    // Won, she says so over her head, never in the box: the box holds the floor, and a song is sung
    // in the middle of a fight that must not stop for it (2 Oct 2026).
    if (won) {
      p.sang = true; p.task = null;
      // the first line is how it was sung: every answer PERFECT, most of them, or got through
      const G = C.grade, first = S.perfect >= S.hits ? G.perfect : S.perfect * 2 >= S.hits ? G.good : G.rough;
      const lines = [first, ...C.won.slice(1)];
      lines.forEach((text, row) => game.floats.push({ x: p.x, y: p.y, on: p, row, n: lines.length, text, color: PALETTE.hen, life: C.wonFor, pact: true }));
    }
    else { p.task = null; game.floats.push({ x: p.x, y: p.y, on: p, row: 0, n: 1, text: C.grade.lost, color: PALETTE.ashHi, life: 2, pact: true }); p.refused = C.giveUp; }
  },
  // The song as Guitar Hero lays it (3 Oct 2026: "much shorter and centred, more like Guitar Hero, and
  // instead of the words her face and yours"): two lanes down the middle of the screen's foot, the notes
  // falling onto the strike line, her fret on the left and his on the right, and under each fret, in
  // place of HER and YOU, the husky and the goat themselves. Her fret lights as she howls on it.
  drawSong(R, game) {
    const S = game.song; if (!S || game.state !== 'play') return;
    const C = TUNING.prop.husky, V = C.view, ctx = R.ctx, s = R.ts, len = S.len || C.cycle;
    const laneW = V.lane * s, gap = V.gap * s, padX = 8 * s, W = laneW * 2 + gap + padX * 2, x0 = Math.round((R.vw - W) / 2);
    const iconH = V.icon * s, bottom = R.vh - (game.touch.active ? 230 * R.s : V.foot * s);
    const strikeY = Math.round(bottom - iconH - 12 * s), top = Math.round(strikeY - V.tall * s);
    const lx = [x0 + padX + laneW / 2, x0 + padX + laneW + gap + laneW / 2];
    const speed = (strikeY - top - 10 * s) / C.lead;
    const a = S.done ? clamp(S.end / 0.6, 0, 1) : clamp((S.t + C.leadIn) / 0.4, 0, 1);
    const blue = '#9fd0ff', her = PALETTE.hen, sing = S.p.singing > 0;
    ctx.save(); ctx.globalAlpha = a;
    // the board: dark, faded off toward the top in hard steps (the far end of the highway)
    ctx.fillStyle = 'rgba(13,10,12,0.9)'; ctx.fillRect(x0, top + 24 * s, W, bottom - top - 24 * s);
    for (let k = 0; k < 4; k++) { ctx.fillStyle = `rgba(13,10,12,${0.16 + k * 0.16})`; ctx.fillRect(x0, top + k * 6 * s, W, 6 * s); }
    // the two lanes, and the bar lines sliding down them so the board reads as moving
    for (const k of [0, 1]) { ctx.fillStyle = k ? 'rgba(159,208,255,0.07)' : 'rgba(255,224,138,0.06)'; ctx.fillRect(lx[k] - laneW / 2, top, laneW, strikeY - top + 8 * s); }
    for (let c = Math.max(0, S.cycle - 1); c <= S.cycle + 2; c++) for (let q = 0; q < 4; q++) {
      const y = strikeY - (c * len + q * len / 4 - S.t) * speed; if (y < top + 2 * s || y > strikeY) continue;
      ctx.fillStyle = `rgba(239,230,208,${q ? 0.06 : 0.16})`; ctx.fillRect(x0 + padX, Math.round(y), W - padX * 2, Math.max(1, Math.round(s)));
    }
    // his window round the strike line
    const wTop = Math.max(top, strikeY - C.window * speed);
    ctx.fillStyle = 'rgba(159,208,255,0.14)'; ctx.fillRect(lx[1] - laneW / 2, wTop, laneW, strikeY + Math.min(C.window * speed, 10 * s) - wTop);
    // the strike line, lit when he hits, red when he missed
    ctx.fillStyle = S.flash > 0 ? blue : S.miss > 0 ? PALETTE.blood : 'rgba(239,230,208,0.55)';
    ctx.fillRect(x0 + 4 * s, strikeY - Math.round(1.5 * s), W - 8 * s, Math.round(3 * s));
    // a note: a gem falling down its lane, its glint top left; faded in off the far end
    const note = (time, k, col, big, gone) => {
      const y = strikeY - (time - S.t) * speed; if (y < top + 2 * s || y > strikeY + 12 * s) return;
      const w = (big ? 30 : 22) * s, h = (big ? 12 : 9) * s;
      ctx.globalAlpha = a * (gone ? 0.25 : 1) * clamp((y - top) / (28 * s), 0, 1);
      ctx.fillStyle = PALETTE.ink; ctx.fillRect(Math.round(lx[k] - w / 2 - s), Math.round(y - h / 2 - s), Math.round(w + 2 * s), Math.round(h + 2 * s));
      ctx.fillStyle = col; ctx.fillRect(Math.round(lx[k] - w / 2), Math.round(y - h / 2), Math.round(w), Math.round(h));
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(Math.round(lx[k] - w / 2 + 2 * s), Math.round(y - h / 2 + 2 * s), Math.round(w * 0.3), Math.round(2 * s));
      ctx.globalAlpha = a;
    };
    for (let c = Math.max(0, S.cycle - 1); c <= S.cycle + 1; c++) {
      const base = c * len;
      C.her.forEach((h, i) => note(base + h, 0, her, i === C.her.length - 1, false));
      note(base + C.you, 1, blue, true, c === S.cycle && S.answered);
    }
    // the frets on the line: hers glows while she howls, his when he lands one; his key inside it
    const fret = (k, col, lit) => {
      const w = 34 * s, h = 16 * s, x = Math.round(lx[k] - w / 2), y = Math.round(strikeY - h / 2);
      ctx.fillStyle = lit ? col : 'rgba(13,10,12,0.9)'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, Math.round(2 * s)); ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    };
    fret(0, her, sing); fret(1, S.miss > 0 && !S.flash ? PALETTE.blood : blue, S.flash > 0);
    ctx.font = `700 ${Math.max(12 * R.s, 11 * s)}px ${FONT_SC}`; ctx.textAlign = 'center';
    ctx.fillStyle = S.flash > 0 ? PALETTE.ink : 'rgba(239,230,208,0.8)'; ctx.fillText(keysOf(game).scream, lx[1], strikeY + 4 * s);
    // under the frets, in place of HER and YOU: the husky (muzzle up while she sings) and the goat
    const hk = PROP_PIXELS.sprites[sing ? 'husky-sing' : 'husky-stand'];
    if (hk) {
      const T = iconH / hk.h, hop = sing ? Math.round(3 * s) : 0;
      // drawn facing right, across the board at him
      PROP_PIXELS.draw(ctx, sing ? 'husky-sing' : 'husky-stand', Math.round(lx[0] - hk.w * T / 2), Math.round(bottom - hk.h * T - hop), T);
    }
    // the goat as the book draws him (`Codex.portrait`): himself, with whatever souls and talisman he has
    Codex.portrait(R, game, lx[1], bottom - (S.flash > 0 ? 3 * s : 0), V.goat * s, game.mods, Shop.wearOf(game), 'song');
    // over the board: how many answered (or how it ended), and in the practice what it wants
    ctx.globalAlpha = a; ctx.textAlign = 'center';
    const done = { won: 'SUNG', lost: 'SHE GAVE UP', practised: 'READY · NOW FOR REAL', skipped: 'NOW FOR REAL' }[S.done];
    ctx.font = `700 ${Math.max(12 * R.s, 14 * s)}px ${FONT_SC}`; ctx.fillStyle = blue;
    ctx.fillText(done || `${S.practice ? 'PRACTICE · ' : ''}${S.hits} / ${Beast.songNeed(S)}`, x0 + W / 2, top - 4 * s);
    if (S.practice && !S.done) {
      const PW = Math.min(R.vw - 32 * s, 460 * s);
      let fs = Math.max(Math.ceil(12 * R.s), Math.round(14 * s)); ctx.font = FONT_PICK.font('text', fs);
      const tw = textW(ctx, C.practice.say); if (tw > PW - 20 * s) { fs = Math.max(Math.ceil(12 * R.s), Math.floor(fs * (PW - 20 * s) / tw)); ctx.font = FONT_PICK.font('text', fs); }
      ctx.fillStyle = 'rgba(13,10,12,0.78)'; ctx.fillRect((R.vw - PW) / 2, top - 46 * s, PW, 24 * s);
      ctx.fillStyle = her; ctx.fillText(C.practice.say, R.vw / 2, top - 29 * s);
    }
    ctx.restore();
  },
});
