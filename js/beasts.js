// THE ESCORTS. Three animals found loose in the first third of a floor and worth something for the
// rest of the run if you get them to the stairs, the hen's frame (`Prop.updateBird`, js/entities.js)
// widened into a system, the way poison kept its own file and the talismans kept theirs.
//
// Every one of them is a plain `Prop` with its own `kind`, so collision, the draw order, the fog and
// the clamp already know what to do with it and nothing in the rest of the game was taught a new
// noun. Nothing here adds a key: a tortoise is grabbed and thrown with the verb that throws a crate,
// a goose is walked past, a crow is followed. What makes an escort hard is that none of them simply
// trots after you, the difficulty is the animal, not a button.
//
//   TORTOISE  slower than a walk. You advance it by throwing it. Where it lands it is a shell:
//             solid, and rounds stop on it. At the stairs: every shield in the run gets a use.
//   GOOSE     leads rather than follows, and honks at every man it sees, which turns the room
//             onto YOU, and which breaks a committed blow at any range. At the stairs: the voice.
//   CROW      follows corpses, not you. At the stairs: a tier III talisman on the next floor.
//   HORSE     races you to each locked room with a soul, waits there for the soul, then on to the
//             stairs: kicks the doors in its way down and bowls the men in it aside. Beat it to one
//             soul room, or to the stairs, and: a longer stride for the run.
//   PIG       ambles after you and eats any milk grass she can see, yours, if you do not graze it
//             first. Three and she is full: a tuft or two more grass on every floor after.
//
// Which floors get one, and which one, is the run's (`Beast.deal`): no kind twice in a run.
//
// `TUNING.prop.<kind>` is every number; `TUNING.beast` is where one comes from. `GEN_RULES.beasts`
// holds the placement to its promise.
const NO_PROPS = [];   // `bodyClear` with no furniture to ask about: a bird hops what stands on the floor
const Beast = {
  // Every kind this file drives. `Prop.update` and the generator both ask here rather than carrying
  // three literals about, so a fourth animal is one line in this list and one `update` branch.
  KINDS: ['tortoise', 'goose', 'crow', 'horse', 'pig', 'rabbit', 'husky'],   // the last two: js/beasts-more.js
  is(kind) { return Beast.KINDS.indexOf(kind) >= 0; },

  // The hen is one of the animals too, for everything but how she moves (`Prop.updateBird`).
  animal(p) { return !p.broken && !p.dead && (Beast.is(p.kind) || p.kind === 'chicken'); },
  NAME: { tortoise: 'TORTOISE', goose: 'GOOSE', crow: 'CROW', chicken: 'HEN', horse: 'HORSE', pig: 'PIG', rabbit: 'RABBIT', husky: 'HUSKY' },
  // What the top-left corner shows for every one brought to the stairs (`Renderer.drawSaved`).
  EMOJI: { tortoise: '\u{1F422}', goose: '\u{1FABF}', crow: '\u{1F426}\u200D\u2B1B', chicken: '\u{1F414}', horse: '\u{1F40E}', pig: '\u{1F416}', rabbit: '\u{1F407}', husky: '\u{1F415}' },
  // What each one pays, in the player's words: the note under a HUD icon (`Renderer.drawSaved`).
  GIVES: {
    chicken: () => `+${TUNING.prop.chicken.saveHearts} heart for the run.`,
    tortoise: () => `Every shield takes ${TUNING.prop.tortoise.saveShield} more blow.`,
    goose: () => `Your voice carries ${Math.round((TUNING.prop.goose.saveScreamRange - 1) * 100)}% further and comes back ${Math.round((1 - TUNING.prop.goose.saveScreamCd) * 100)}% sooner.`,
    crow: () => `It found ${/^[AEIOU]/.test(rarityOf(TUNING.prop.crow.giftTier).name) ? 'an' : 'a'} ${rarityOf(TUNING.prop.crow.giftTier).name.toLowerCase()} talisman and left it on the next floor's stairs.`,
    horse: () => `You run ${Math.round((TUNING.prop.horse.saveSpeed - 1) * 100)}% faster.`,
    pig: () => 'A tuft or two more milk grass on every floor ahead.',
    rabbit: () => `Your roll comes back ${Math.round((1 - TUNING.prop.rabbit.saveRollCd) * 100)}% sooner.`,
    husky: () => `Your voice comes back ${Math.round((1 - TUNING.prop.husky.saveScreamCd) * 100)}% sooner.`,
  },

  // ---------------- being hurt ----------------
  // An animal is not furniture and not a man: the room can kill it, but not in one. `TUNING.beast.hp`
  // blows from anything the cult swings, or that many touches of fire, and it is dead, which is the
  // price of walking one through a fight. `hurtCd` keeps one swing or one tile of fire from being
  // three wounds. The tortoise is in a shell: only fire gets through it.
  hurt(p, game, src) {
    if (!Beast.animal(p) || p.held || (p.hurtCd || 0) > 0) return;
    const B = TUNING.beast;
    if (p.kind === 'tortoise' && src !== 'fire') { Beast.shellTakes(p, game); p.hurtCd = B.hurtCd; return; }
    const own = TUNING.prop[p.kind] && TUNING.prop[p.kind].hp;   // the horse and the hen are sturdier than the rest
    p.beastHp = (p.beastHp === undefined ? own || B.hp : p.beastHp) - 1;
    p.hurtCd = B.hurtCd; p.wobble = 0.3; p.hurtFlash = 0.25;
    game.particles(p.x, p.y, 7, src === 'fire' ? PALETTE.fire : PALETTE.blood, 150);
    if (p.beastHp > 0) {
      game.audio.sfxAnimal(p.kind, true);
      game.floatText(p.x, p.y - 26, p.beastHp + ' LEFT', PALETTE.hen);
      return;
    }
    p.broken = true; p.dead = true; Stats.beast(game, p.kind, 'dead');
    if (game.goat.holding === p) game.goat.holding = null;
    game.world.splat(p.x, p.y, 0, 0, 6);
    game.particles(p.x, p.y, 16, p.kind === 'crow' ? PALETTE.ink : PALETTE.bone, 200);
    game.audio.sfxSplat();
    game.floatText(p.x, p.y - 30, 'THE ' + Beast.NAME[p.kind] + ' IS DEAD', PALETTE.blood);
  },
  // Walled in behind him by the clamp (`game.updateClamps`). Gone, and said over the goat's head
  // rather than over the animal's, which is two rooms back in the dark where nobody can read it.
  lost(p, game) {
    p.broken = true; p.dead = true;
    const g = game.goat;
    const kind = p.kind === 'coop' ? p.holds || 'chicken' : p.kind;
    Stats.beast(game, kind, p.kind === 'coop' ? 'coop' : 'lost');
    game.audio.sfxAnimal(kind, true);
    game.floatText(g.x, g.y - 46, 'THE ' + Beast.NAME[kind] + ' WAS LEFT BEHIND', PALETTE.blood);
  },
  // Fire under its feet and the wound clock, every step, for the three escorts and the hen alike.
  tick(p, dt, game) {
    p.hurtCd = Math.max(0, (p.hurtCd || 0) - dt);
    p.hurtFlash = Math.max(0, (p.hurtFlash || 0) - dt);
    // Down on its feet over a hole, a shell or a hen landed there off a wall, one set down by a
    // roll, it falls. `step` refuses every move that ends over a drop, so one that was already over
    // it used to hover there for the rest of the floor.
    if (!p.held && !p.flying && !p.leaving && game.world.isPitPx(p.x, p.y)) { p.gone(game); return; }
    if (!p.held && !p.flying && game.world.isBurningPx(p.x, p.y)) Beast.hurt(p, game, 'fire');
    // Left behind, further off him than `strayR` tiles, and not so far that it has gone out of
    // hearing (`strayFar`), it calls every `strayGap` seconds or so, and the edge of the picture
    // points at it while it does (`Renderer.drawStrays`). A crow that had stopped three rooms back
    // used to be found out only at the stairs, when the card said nothing had come.
    // `behind` is how many rooms back it is; at one, the next room he walks into walls it in
    // (the clamp takes rooms two behind), and it calls twice as often and its pip goes red.
    p.strayT = (p.strayT || 0) - dt;
    const B = TUNING.beast, d = hyp(p.x - game.goat.x, p.y - game.goat.y) / TILE;
    const r = game.level && roomAt(game.level, p.x, p.y);
    p.behind = (game.goatRoom || 0) - (r ? r.index : game.nearestRoomIdx(p.x, p.y, game.goatRoom || 0));
    // The crow's gift bird (`placeGift`) is not an escort and is never left behind.
    // Only one behind him calls: the horse gone on ahead to win its race, or the goose leading, is
    // not left anywhere, and neighed every five seconds as if it were.
    if (!p.gift && p.behind >= 0 && p.strayT <= 0 && d > B.strayR && d < B.strayFar && game.state === 'play') {
      p.strayT = B.strayGap * (1 + (Math.random() * 2 - 1) * B.strayJitter) * (p.behind >= 1 ? B.strayUrgent : 1);
      p.calledAt = game.timer;
      game.audio.sfxAnimal(p.kind);
    }
  },

  // ---------------- the walk ----------------
  update(p, dt, game) {
    if (p.broken || p.held) return;          // in his mouth he goes where his mouth goes
    Beast.tick(p, dt, game); if (p.broken) return;
    p.bob = (p.bob || 0) + dt * 3;
    // Close enough to have seen it: the first of each kind in a run says what it is for, the way
    // the hen and the hound do. An animal walking about explains nothing on its own.
    if (p.gift) return Beast.updateGift(p, dt, game);
    if (p.refused > 0) return Beast.updateRefused(p, dt, game);   // said no to: it goes its way (js/beasts-more.js)
    if (hyp(p.x - game.goat.x, p.y - game.goat.y) < TUNING.beast.tellFor * TILE) Beast.met(game, p);
    if (p.kind === 'tortoise') return Beast.updateTortoise(p, dt, game);
    if (p.kind === 'goose') return Beast.updateGoose(p, dt, game);
    if (p.kind === 'crow') return Beast.updateCrow(p, dt, game);
    if (p.kind === 'horse') return Beast.updateHorse(p, dt, game);
    if (p.kind === 'pig') return Beast.updatePig(p, dt, game);
    if (p.kind === 'rabbit') return Beast.updateRabbit(p, dt, game);
    if (p.kind === 'husky') return Beast.updateHusky(p, dt, game);
  },

  // Where an animal may put its foot: the hen's own steering, which borrows the men's `hazardAt` so
  // nothing on our side walks into a fire, the wheel, raised teeth or a drop. One method for all of
  // them, because an animal that blunders into the room reads as broken rather than as characterful.
  step(p, game, dx, dy, spd, dt) {
    const safe = Prop.prototype.henSteer.call(p, game, dx, dy);
    if (!safe) { p.vx = 0; p.vy = 0; p.wanderA = (p.wanderA || 0) + Math.PI; return; }
    p.vx = safe.x * spd; p.vy = safe.y * spd;
    if (Math.abs(p.vx) > 4) p.face = Math.sign(p.vx);
    const ox = p.x, oy = p.y;
    p.x += p.vx * dt; p.y += p.vy * dt;
    game.world.collideCircle(p);
    // A step that would put it over a drop slides along the lip on whichever half of it stays on the
    // boards. It used to be refused whole, and a crow heading past the corner of a hole on the
    // rafters asked for the same refused step every frame and stood there for the rest of the level.
    const w = game.world, bad = () => w.isPitPx(p.x, p.y) || w.isSolid(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
    if (w.isPitPx(p.x, p.y)) {
      p.x = ox + p.vx * dt; p.y = oy;
      if (bad()) { p.x = ox; p.y = oy + p.vy * dt; }
      if (bad()) { p.x = ox; p.y = oy; p.wanderA = (p.wanderA || 0) + Math.PI; }
    }
  },
  // Toward the goat: the straight line only when he is close and in sight, otherwise the route every
  // man in the building already chases down (`way`), so a wall or a table between them is a way
  // round rather than a nose against it. Past the ninety tiles the goat's field reaches, an animal
  // left that far behind heads down the way out instead, he is somewhere along it, ahead.
  toGoat(p, game) {
    const g = game.goat, w = game.world, dx = g.x - p.x, dy = g.y - p.y, d = hyp(dx, dy) || 1;
    if (d < 3 * TILE && w.los(p.x, p.y, g.x, g.y)) return { x: dx / d, y: dy / d, d };
    const f = Beast.way(p, game, w.route, w.flow, 'goat') || (Beast.ahead(p, game) < 0 ? Beast.onward(p, game) : null);
    return f ? { x: f.x, y: f.y, d } : { x: dx / d, y: dy / d, d };
  },

  // ---------------- the way ----------------
  // A heading down a field (lower is nearer what it wants): `open`, the one laid round the
  // furniture, wherever it numbers the animal's tile or one next to it, else `plain`, stone only.
  // The men's `pickWaypoint` cut down to an animal: walk the field `ai.path.ahead` tiles on and head
  // for the furthest of them it can reach in a straight line (`bodyClear`), looked up again every
  // `ai.path.every`. A tile-by-tile step down a stone-only field put the goose's beak against the
  // first lamp on its tile and held it there, ten runs in twenty-one, measured, stood somewhere
  // for good. `key` gives each want on one animal its own waypoint and clock: sharing one, a
  // straggler past the goat's field asked `goat` (no way), then `out`, and each threw the other's
  // away, so both were laid again every step. A want with no way is remembered as none.
  way(p, game, open, plain, key) {
    const P = TUNING.ai.path, c = (p.ways = p.ways || {})[key] || (p.ways[key] = { t: 0, wp: null, none: false });
    c.t -= 1 / 60;
    if (c.t > 0) {
      if (c.none) return null;
      if (c.wp && hyp(c.wp.x - p.x, c.wp.y - p.y) > P.reach * TILE) {
        const l = hyp(c.wp.x - p.x, c.wp.y - p.y) || 1;
        return { x: (c.wp.x - p.x) / l, y: (c.wp.y - p.y) / l };
      }
    }
    c.t = P.every; c.wp = null; c.none = true;
    const w = game.world, pts = [];
    let tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    const onto = (f) => {
      if (!f) return false;
      if (f[ty * w.W + tx] >= 0) return true;
      let best = -1, bd = 1e9;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const x = tx + ox, y = ty + oy;
        if (x < 0 || y < 0 || x >= w.W || y >= w.H) continue;
        const v = f[y * w.W + x];
        if (v >= 0 && v < bd) { bd = v; best = y * w.W + x; }
      }
      if (best < 0) return false;
      tx = best % w.W; ty = (best / w.W) | 0;
      pts.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
      return true;
    };
    const field = onto(open) ? open : onto(plain) ? plain : null;
    if (!field) return null;
    for (let k = 0; k < P.ahead && field[ty * w.W + tx] > 0; k++) {
      const i = w.flowStep(tx, ty, field);
      if (i < 0) break;
      tx = i % w.W; ty = (i / w.W) | 0;
      pts.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
    }
    if (!pts.length) return null;
    const R = (P.ahead + 2) * TILE, r = p.r * P.bodyMul;
    const props = game.props.filter((q) => q !== p && !q.broken && q.blocking && Math.abs(q.x - p.x) < R && Math.abs(q.y - p.y) < R);
    c.wp = pts[0]; c.none = false;
    for (let k = pts.length - 1; k > 0; k--) if (Enemy.prototype.bodyClear.call(p, game, pts[k].x, pts[k].y, r, props)) { c.wp = pts[k]; break; }
    const l = hyp(c.wp.x - p.x, c.wp.y - p.y) || 1;
    return { x: (c.wp.x - p.x) / l, y: (c.wp.y - p.y) / l };
  },

  // ---------------- keeping out of it ----------------
  // An animal on our side keeps out of a man's reach. Not afraid of the cult as a whole, a hen by
  // a goat with three men round him is where she is meant to be, but of the one man close enough to
  // swing: inside `beast.shyR` tiles it makes for the far side of the goat from him, `shyBack` tiles
  // behind him, which is the one place a club aimed at the goat does not also find it. It stood in
  // the arc before, and the room's blows killed more escorts than anything the room was built to do.
  // Null when nobody is that close. The goose is exempt: it walks up to men to shout at them.
  shy(p, game) {
    const B = TUNING.beast, g = game.goat, own = TUNING.prop[p.kind] || {};
    let man = null, md = B.shyR * (own.shyMul || 1) * TILE;
    for (const e of game.liveEnemies) {
      if (e.dead || e.held || e.ghosted || e.scripted || (!e.aware && !own.shyAll)) continue;
      if (e.state === 'floored' || e.state === 'stunned' || e.state === 'flung') continue;
      const d = hyp(e.x - p.x, e.y - p.y);
      if (d < md) { md = d; man = e; }
    }
    if (!man) return null;
    let ax = g.x - man.x, ay = g.y - man.y, al = hyp(ax, ay);
    // With the goat not between them at all, the man is nearer to him than the animal is, or the
    // goat is nowhere near, the only way to be out of reach is simply away from the man.
    if (al < 1 || hyp(g.x - p.x, g.y - p.y) > B.shyR * B.shyFar * TILE) { ax = p.x - man.x; ay = p.y - man.y; al = hyp(ax, ay) || 1; }
    const tx = g.x + (ax / al) * B.shyBack * TILE, ty = g.y + (ay / al) * B.shyBack * TILE;
    const dx = tx - p.x, dy = ty - p.y, d = hyp(dx, dy);
    if (d < TILE * B.shyArrive) return { x: 0, y: 0, d: 0 };
    return { x: dx / d, y: dy / d, d };
  },

  // ---------------- the tortoise ----------------
  // Loose, it plods after him and never arrives. Thrown, it flies flat and comes down where it was
  // aimed, pulls its head in for `tuck` seconds and is a piece of the room for as long as it sits
  // there, which is the whole of it: the ally you move by throwing is also the cover you throw.
  updateTortoise(p, dt, game) {
    const C = TUNING.prop.tortoise;
    p.tuckT = Math.max(0, (p.tuckT || 0) - dt);
    if (p.coolT > 0) { p.coolT = Math.max(0, p.coolT - dt); return; }   // on its back: nothing
    if (p.flying) {
      const drag = Math.exp(-C.drag * dt);
      p.vx *= drag; p.vy *= drag;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const spd = hyp(p.vx, p.vy) || 1;
      const impact = game.world.collideCircle(p);
      // A shell is not a crate: nothing it hits breaks, and it does not break either. It stops.
      if (impact > 2 || p.hitProp(game, p.vx / spd, p.vy / spd) || spd < 90) Beast.land(p, game);
      else if (game.world.isPitPx(p.x, p.y)) p.gone(game);
      else {
        // And a man is not a wall: a shell in the face floors him for `crate.stun` exactly the way a
        // crate does, the one difference being that the shell is still there afterwards.
        for (const e of game.enemies) {
          if (e.dead || e.held || e.ghosted || hyp(e.x - p.x, e.y - p.y) > e.r + p.r) continue;
          // Never out of a leap: staggered mid-air over a drop, the pit check took all his hearts.
          if (e.kind === 'butcher') { if (e.state !== 'hop') { e.state = 'stagger'; e.timer = 0.45; } }
          else {
            const stun = TUNING.prop.crate.stun;
            e.state = 'floored'; e.timer = stun; e.dazed = Math.max(e.dazed, stun);
            e.vx = p.vx * 0.3; e.vy = p.vy * 0.3; e.aware = true;
            Status.stunned(game, e);
          }
          game.hitstop(0.04); game.shake(4); game.kick(p.vx / 300, p.vy / 300, TUNING.juice.kick * 0.5);
          p.vx *= -0.2; p.vy *= -0.2;
          Beast.land(p, game);
          break;
        }
      }
      return;
    }
    if (p.tuckT > 0) return;                 // pulled in where it landed: it is furniture for a beat
    const to = Beast.toGoat(p, game);
    if (to.d < C.followAt * TILE) { p.vx = 0; p.vy = 0; return; }
    Beast.step(p, game, to.x, to.y, C.speed, dt);
  },
  // Out of the mouth, flat and hard. `Goat.throwHeld` sends it the same way it sends a crate; this
  // is only what it does in the air, and `flying` is what keeps it off its own legs while it is up.
  throwTortoise(p, game, ax, ay) {
    const C = TUNING.prop.tortoise, l = hyp(ax, ay) || 1;
    p.flying = true; p.vx = (ax / l) * C.throwSpeed; p.vy = (ay / l) * C.throwSpeed;
    if (Math.abs(ax) > 0.1) p.face = Math.sign(ax);
    game.world.emitNoise(p.x, p.y, TUNING.noise.smash * 0.4);
    game.audio.sfxThud(); game.particles(p.x, p.y, 5, PALETTE.ash, 120);
  },
  // The shell's one block. A round, a blow aimed at it, or a blow at the goat it stands in front of
  // (`guards`, from `game.meleeHit`), it takes the one and goes over on its back for `cool`
  // seconds: no cover, no carrying it off. Cover you can stand behind forever is a wall; this is a
  // single "no", and then the question of what you do in the six seconds it bought.
  shellTakes(p, game) {
    if (p.coolT > 0 || p.flying || p.held) return false;
    p.coolT = TUNING.prop.tortoise.cool; p.tuckT = 0; p.wobble = 0.3;
    game.audio.sfxThud(); game.particles(p.x, p.y, 6, PALETTE.bone, 140);
    game.floatText(p.x, p.y - 26, 'SHELL', PALETTE.bone);
    return true;
  },
  // Whether a ready shell stands on the line of a blow from `a` to `b`: close to the segment and
  // between the two of them, which is what "in front of it" means from the goat's side of it.
  guards(game, a, b) {
    const R = TUNING.prop.tortoise.guardR, dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
    for (const p of game.props) {
      if (p.kind !== 'tortoise' || p.broken || p.flying || p.held || p.coolT > 0) continue;
      const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2; if (t <= 0 || t >= 1) continue;
      if (hyp(a.x + dx * t - p.x, a.y + dy * t - p.y) < p.r + R) return p;
    }
    return null;
  },
  land(p, game) {
    const C = TUNING.prop.tortoise;
    p.flying = false; p.vx = 0; p.vy = 0; p.tuckT = C.tuck;
    game.audio.sfxThud(); game.particles(p.x, p.y, 4, PALETTE.ash, 110);
  },

  // ---------------- the goose ----------------
  // It does not follow, it leads, down `onward`'s field to the stairs. It is never the goat's flow
  // field: that points AT the goat from everywhere, and its opposite is "away from him", which is
  // backwards the moment he overtakes.
  updateGoose(p, dt, game) {
    const C = TUNING.prop.goose;
    p.honkT = Math.max(0, (p.honkT || 0) - dt);
    p.blowT = Math.max(0, (p.blowT || 0) - dt);
    // It runs on at the way out, into whatever is in the rooms, and it stops where it cannot go
    // further, a shut door (`collideEntities` holds it like a body), a gate, the stairs, or where
    // it has got `lead` tiles of the way ahead of him. It used to not wait at all: it raised a room
    // he had not reached yet and then stood at that room's shut door while the room came for him.
    // It is a leader that was slower than the goat it led (150 against his 168 and 210 run up), so
    // every level ended with it twenty-odd tiles behind him. Faster than him now, and faster again
    // (`hurry`) while he is in front of it: a goose that has been overtaken runs to get ahead again.
    const on = Beast.onward(p, game), ahead = Beast.ahead(p, game);
    if (on && ahead < C.lead) Beast.step(p, game, on.x, on.y, C.speed * (ahead < 0 ? C.hurry : 1), dt);
    else { p.vx = 0; p.vy = 0; if (Math.abs(game.goat.x - p.x) > 8) p.face = Math.sign(game.goat.x - p.x); }   // waiting: it looks back for him
    // A blow being wound up in its sight is honked at whatever the alarm's clock says (playtest,
    // 2 Oct 2026: "the goose's honk doesn't knock enemies' blow"). The alarm went off the moment a
    // man came into view and then slept `honkGap`, so a windup started in that sleep, which is
    // nearly every windup, was never broken. `blowGap` only keeps it from honking every frame.
    if (p.blowT <= 0) {
      for (const e of game.liveEnemies) {
        if (e.dead || e.held || e.ghosted || !Beast.winding(e)) continue;
        if (hyp(e.x - p.x, e.y - p.y) > C.seeR * TILE) continue;
        if (!game.sees(p.x, p.y, e.x, e.y)) continue;
        Beast.honk(p, game, e);
        return;
      }
    }
    if (p.honkT > 0) return;
    // Anybody it can see. It is not a man and the cult never goes for it, so what a honk buys is
    // purely the two things it does to them: the room learns where the GOAT is, and whoever was
    // mid-swing loses the swing. That second half is the only parry in the game with no range on it.
    for (const e of game.liveEnemies) {
      if (e.dead || e.held || e.ghosted) continue;
      if (hyp(e.x - p.x, e.y - p.y) > C.seeR * TILE) continue;
      if (!game.sees(p.x, p.y, e.x, e.y)) continue;
      Beast.honk(p, game, e);
      return;
    }
  },
  honk(p, game, at) {
    const C = TUNING.prop.goose, g = game.goat;
    p.honkT = C.honkGap; p.blowT = C.blowGap; p.wobble = 0.3;
    game.audio.sfxBleat && game.audio.sfxBleat(520, 0.1, 0.3);
    game.particles(p.x, p.y - 8, 5, PALETTE.bone, 120);
    game.ring(p.x, p.y, C.seeR * TILE * 0.5, 'rgba(239,230,208,0.35)');
    // The alarm: the noise goes out from the GOOSE, which is what turns heads, and every man who
    // heard it is looking for the goat rather than for the bird.
    game.world.emitNoise(p.x, p.y, C.callR);
    for (const e of game.liveEnemies) {
      if (e.dead || e.held || e.ghosted) continue;
      if (hyp(e.x - p.x, e.y - p.y) > C.seeR * TILE) continue;
      e.aware = true;
      if (e.balk) e.balk(game, C.balkStun);
    }
    // Not over its own first words: the second half of what it is for waits for the next honk.
    if (!game.gooseTold && !game.floats.some((f) => f.pact)) {
      game.gooseTold = true;
      game.floatText(p.x, p.y - 40, 'IT GIVES YOU AWAY. IT ALSO BREAKS THEM', PALETTE.bone);
    }
    void at; void g;
  },
  // A blow already coming: the states `Enemy.balk` breaks, so the goose honks exactly when a honk
  // would do something. Keep the two lists the same.
  winding(e) {
    const s = e.state;
    if (e.kind === 'wraith' || (e.kind === 'butcher' && s === 'hop')) return false;
    return s === 'windup' || s === 'aim' || s === 'cast' || s === 'hookwind' || s === 'dart' || s === 'slamwind' || s === 'hopwind';
  },

  // Which way the level goes from here: down a distance field grown out of the stairs over every
  // tile a body can stand on, built once a level (`world.tiles` only ever changes behind him, the
  // clamps, or by opening things up). It used to be a straight line at the next room's mouth, which
  // is fine inside a room and walks nose-first into the wall of every S-bent corridor between them.
  // Two of them: `d` over stone only, and `open`, the same laid round the furniture where it stands
  // (`world.furn`), which moves, a table shoved, a lamp knocked flat, so it is laid again every
  // `beast.exitEvery` seconds. `way` walks the second and falls back on the first.
  onward(p, game) {
    const f = Beast.exit(game); if (!f) return null;
    return Beast.way(p, game, f.open, f.d, 'out');
  },
  exit(game) {
    const w = game.world, L = game.level; if (!L || !L.exitTile) return null;
    const grow = (ok) => {
      const d = new Int32Array(w.W * w.H).fill(-1), q = new Int32Array(w.W * w.H);
      let tail = 0; const e = L.exitTile.y0 * w.W + L.exitTile.x0;
      d[e] = 0; q[tail++] = e;
      for (let h = 0; h < tail; h++) {
        const i = q[h], x = i % w.W, y = (i / w.W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w.W || ny >= w.H) continue;
          const n = ny * w.W + nx;
          if (d[n] >= 0 || !ok(n)) continue;
          d[n] = d[i] + 1; q[tail++] = n;
        }
      }
      return d;
    };
    let f = game.exitField;
    if (!f || f.level !== L) f = game.exitField = { level: L, d: grow((n) => w.walkable(n)), open: null, at: -1e9 };
    if (game.timer - f.at > TUNING.beast.exitEvery) { f.open = grow((n) => w.open(n)); f.at = game.timer; }
    return f;
  },

  // How many tiles nearer the stairs it is than the goat, down the same field. Off the field on
  // either side reads as not ahead at all, so a goose never freezes over a question it cannot answer.
  ahead(p, game) {
    Beast.exit(game);
    const f = game.exitField, w = game.world, g = game.goat; if (!f) return 0;
    const at = (x, y) => f.d[Math.floor(y / TILE) * w.W + Math.floor(x / TILE)];
    const mine = at(p.x, p.y), his = at(g.x, g.y);
    return mine >= 0 && his >= 0 ? his - mine : 0;
  },

  // ---------------- the horse ----------------
  // It races him, in legs (30 Sep 2026: "a race to the locked rooms"). Out of its stall it says so
  // and gallops down `onward`'s field at a pace he can beat, into each locked room with a soul ahead
  // of it (`horseLegs`), where it waits at the bar until the soul is taken and the gate gives, then
  // on to the next, and at last to the stairs. A leg is his if he is in its room before the horse is
  // (`horseRace`); one soul room won and it pays at the stairs (`won`, `saved`). It does not wait for
  // him anywhere else: what else stops it is what stops everything, a bar no kick opens (a sealed
  // arena, the vault, the dark flight). A shut door in its way it rears at and kicks in; a man in its
  // way it bowls aside and runs on.
  updateHorse(p, dt, game) {
    const C = TUNING.prop.horse, g = game.goat, w = game.world;
    p.kickT = Math.max(0, (p.kickT || 0) - dt); p.slowT = Math.max(0, (p.slowT || 0) - dt);
    // Out of the stall it stands `ready` s and says its bet to his face before it goes: a line
    // shouted by something already a room away is a line nobody read.
    p.age = (p.age || 0) + dt;
    if (p.age < C.ready) { p.vx = 0; p.vy = 0; if (Math.abs(g.x - p.x) > 8) p.face = Math.sign(g.x - p.x); return; }
    Beast.horseRace(p, game);
    const f = Beast.exit(game), at = (x, y) => (f ? f.d[Math.floor(y / TILE) * w.W + Math.floor(x / TILE)] : -1);
    const home = (x, y) => { const d = at(x, y); return d >= 0 && d <= C.homeR; };
    // The last leg, the stairs: who got there first, kept the moment each of them does, and said
    // once they are both there, with whether it pays, which the soul rooms have already settled.
    if (!p.goatFirst && !p.home && home(g.x, g.y)) { p.goatFirst = true; if (!(p.won > 0)) { p.won = 1; Beast.prize(game, p); } }
    if (home(p.x, p.y)) {
      p.home = true; p.vx = 0; p.vy = 0; p.rear = 0;
      if (Math.abs(g.x - p.x) > 8) p.face = Math.sign(g.x - p.x);
      if (!p.told && hyp(g.x - p.x, g.y - p.y) < C.tellR * TILE && !game.floats.some((t) => t.pact)) {
        p.told = true; Beast.speak(game, p, [C.lines[p.goatFirst ? 'lost' : 'won'], C.lines[p.won > 0 ? 'pay' : 'none']]);
      }
      return;
    }
    // Rearing at a door: the blow lands when the rear is done, and on iron it goes again.
    if (p.rear > 0) {
      p.rear -= dt; p.vx = 0; p.vy = 0;
      if (p.rear <= 0 && p.kickDoor) {
        const d = p.kickDoor, l = hyp(d.x - p.x, d.y - p.y) || 1;
        d.smash(game, (d.x - p.x) / l, (d.y - p.y) / l, null);
        game.audio.sfxAnimal('horse'); p.kickT = C.kickGap; p.kickDoor = null;
      }
      return;
    }
    // The bar: it waits for him. A soul gate is the end of a leg (`horseRace`), and the soul room
    // it stands in is where it waits for the soul to be taken; the rest are only in its way.
    const door = Beast.doorAhead(p, game);
    if (door && (door.gate || door.seal || door.vault || door.fork)) {
      p.vx = 0; p.vy = 0; if (Math.abs(g.x - p.x) > 8) p.face = Math.sign(g.x - p.x);
      return;
    }
    if (door && p.kickT <= 0) { p.kickDoor = door; p.rear = C.kickWind; p.wobble = 0.2; return; }
    // Now and then, well ahead of him, it pulls up, turns and mocks him, then goes on: the race is a
    // horse that could win and cannot help showing off, not one that simply leaves.
    const Tn = C.taunt, rollGap = () => Tn.gap[0] + Math.random() * (Tn.gap[1] - Tn.gap[0]);
    if (p.tauntT > 0) {
      p.tauntT -= dt; p.vx = 0; p.vy = 0; if (Math.abs(g.x - p.x) > 8) p.face = Math.sign(g.x - p.x);
      return;
    }
    if (p.tauntIn === undefined) p.tauntIn = rollGap();
    if ((p.tauntIn -= dt) <= 0) {
      p.tauntIn = rollGap();
      const mine = at(p.x, p.y), his = at(g.x, g.y);
      if (mine >= 0 && his >= 0 && his - mine >= Tn.ahead && !game.floats.some((t) => t.pact)) {
        p.tauntT = Tn.hold; p.vx = 0; p.vy = 0;
        const L = C.lines.taunt, text = L[Math.floor(Math.random() * L.length)];
        game.audio.sfxAnimal && game.audio.sfxAnimal('horse');
        game.floats.push({ x: p.x, y: p.y, on: p, row: 0, n: 1, text, color: PALETTE.bone, life: Tn.say, pact: true });
        return;
      }
    }
    let on = Beast.onward(p, game);
    // Its own `unstuck`: a body this wide catches on what a goose slips past (the lip of a wall that
    // gives, the corner of a rack), so a gallop that has not got a tile nearer the stairs in
    // `stuckFor` s steps off to one side for `sideFor` s, the other side the next time.
    const here = at(p.x, p.y);
    if (here >= 0 && (p.best === undefined || here < p.best)) { p.best = here; p.stuck = 0; } else p.stuck = (p.stuck || 0) + dt;
    if (p.stuck > C.stuckFor) { p.side = -(p.side || 1); p.sideT = C.sideFor; p.stuck = 0; p.ways = null; }
    if (p.sideT > 0 && on) { p.sideT -= dt; on = { x: -on.y * p.side * 0.9 - on.x * 0.4, y: on.x * p.side * 0.9 - on.y * 0.4 }; }
    if (on) Beast.step(p, game, on.x, on.y, C.speed * (p.slowT > 0 ? C.slow : 1), dt);
    else { p.vx = 0; p.vy = 0; }
    Beast.bowl(p, game);
  },
  // The legs of its race: every locked room with a soul ahead of the room it was let out in, in the
  // order he meets them, a soul gate's room (`game.soulGates`: the keeper's gate, or the mouse's,
  // whose offer stands in for the soul), barred until its soul is swallowed or her shelf chosen from
  // (`game.openSoulGate`), and then the stairs, which are not a leg of their own here. Nothing else
  // on a floor is both locked and holding a soul: the last boss's soul is in an arena with an open
  // door, and a sealed arena is never given one (`soulPlan` deals the gate, then the LAST bosses).
  horseLegs(p, game) {
    const r = roomAt(game.level, p.x, p.y), from = r ? r.index : game.nearestRoomIdx(p.x, p.y, game.goatRoom || 0);
    return (game.soulGates || []).filter((sg) => !sg.exit && sg.room > from && sg.prop && !sg.prop.broken)
      .sort((a, b) => a.room - b.room).map((sg) => ({ room: sg.room, sg, first: null, told: false }));
  },
  // Who is winning the leg under way. Each of them has reached a room once he has stood in it or
  // any room past it (the floor is one chain, and the gate lets nobody by), so a leg is decided the
  // step the first of them is in its room, him on a tie, and paid there and then (`won`), however
  // the rest of the floor goes. It says who won once they are both in the room, and the leg is over
  // once the horse is in it and the bar is up: the soul swallowed on its way, a gate the mouse
  // lifted, one he opened and ran on from before it came, none of them leaves it standing there.
  horseRace(p, game) {
    const C = TUNING.prop.horse, g = game.goat, L = game.level;
    if (!p.legs) { p.legs = Beast.horseLegs(p, game); p.leg = 0; p.won = p.won || 0; }
    const idx = (x, y) => { const r = roomAt(L, x, y); return r ? r.index : -1; };
    p.goatBest = Math.max(p.goatBest === undefined ? -1 : p.goatBest, idx(g.x, g.y));
    p.horseBest = Math.max(p.horseBest === undefined ? -1 : p.horseBest, idx(p.x, p.y));
    const leg = p.legs[p.leg];
    if (!leg) return;
    if (!leg.first && p.goatBest >= leg.room) { leg.first = 'goat'; if (!(p.won > 0)) Beast.prize(game, p); p.won++; }
    else if (!leg.first && p.horseBest >= leg.room) leg.first = 'horse';
    const both = p.goatBest >= leg.room && p.horseBest >= leg.room;
    if (both && !leg.told && !game.floats.some((t) => t.pact && t.on === p)) {
      leg.told = true;
      // Beaten, it says so in the box and hands over what it bet (30 Sep 2026: "you outran me, take
      // it"); winning, it crows over its head, and says which try he has left.
      if (leg.first === 'goat') Beast.talk(game, p, C.talk.beaten.map((l) => l.replace('{pct}', Math.round((C.saveSpeed - 1) * 100))));
      else Beast.speak(game, p, [C.lines.won, p.won > 0 ? C.lines.mine : C.lines.left]);
    }
    const open = !leg.sg.prop || leg.sg.prop.broken;
    if (p.horseBest >= leg.room && open && (leg.told || p.goatBest > leg.room)) p.leg++;
  },
  // The shut door it has run into: blocking, and touching its front, the slab, not a disc, the way
  // `collideEntities` holds a body against it.
  doorAhead(p, game) {
    const D = TUNING.prop.door, sp = hyp(p.vx, p.vy);
    for (const q of game.props) {
      if (q.kind !== 'door' || !q.blocking) continue;
      if (Math.abs(q.x - p.x) > D.r + p.r + TILE || Math.abs(q.y - p.y) > D.r + p.r + TILE) continue;
      const hx = q.vertical ? D.thick / 2 : D.r, hy = q.vertical ? D.r : D.thick / 2;
      const cx = clamp(p.x, q.x - hx, q.x + hx), cy = clamp(p.y, q.y - hy, q.y + hy);
      if (hyp(p.x - cx, p.y - cy) > p.r + 4) continue;
      // Leaning on it, or on the way into it: a door beside the way it is going is not in its way.
      const on = Beast.onward(p, game), ax = on ? on.x : p.vx / (sp || 1), ay = on ? on.y : p.vy / (sp || 1);
      if ((cx - p.x) * ax + (cy - p.y) * ay > 0) return q;
    }
    return null;
  },
  // A man standing in its way goes aside at `bowl` × his own weight, dazed, and keeps what he knew
  // about the goat and nothing more, the cult hardly minds a horse. The ogre and the rat ogre are
  // not moved by anything, and a horse into one is only a horse slowed.
  bowl(p, game) {
    const C = TUNING.prop.horse, sp = hyp(p.vx, p.vy);
    if (sp < C.speed * 0.3) return;
    const hx = p.vx / sp, hy = p.vy / sp;
    for (const e of game.liveEnemies) {
      if (e.dead || e.held || e.ghosted || e.scripted || e.state === 'flung' || e.state === 'floored') continue;
      if (hyp(e.x - p.x, e.y - p.y) > e.r + p.r + 2) continue;
      p.slowT = C.slowFor;
      if (e.kind === 'butcher' || e.kind === 'ratogre') continue;
      const side = (e.x - p.x) * -hy + (e.y - p.y) * hx >= 0 ? 1 : -1;
      const dx = hx * 0.45 - hy * side, dy = hy * 0.45 + hx * side, l = hyp(dx, dy), k = C.bowl * e.knockMul() / l;
      const was = e.aware;
      e.fling(dx * k, dy * k, false); e.aware = was;
      e.dazed = Math.max(e.dazed || 0, C.daze);
      game.particles(e.x, e.y, 6, PALETTE.ash, 140); game.audio.sfxThud();
    }
  },

  // ---------------- the crow ----------------
  // It follows the dead. `game.crowMarks` is where bodies went down and how long ago; with one in
  // reach it goes to it and settles, and with nothing dead anywhere near it drifts after the goat at
  // `slack` of his pace, which is to say it falls behind. That is the rule it dictates, and it is
  // the one escort that asks you to stop and fight for it.
  updateCrow(p, dt, game) {
    const C = TUNING.prop.crow;
    p.hopT = Math.max(0, (p.hopT || 0) - dt);
    // A man close enough to swing puts it up off the body and behind the goat; it comes back down
    // on it the moment he is not (`Beast.shy`).
    const away = Beast.shy(p, game);
    if (away) {
      p.feeding = false;
      if (away.d) Beast.step(p, game, away.x, away.y, C.flySpeed * TUNING.beast.shyFly, dt); else { p.vx = 0; p.vy = 0; }
      return;
    }
    // A room behind him, the next room he walks into walls this one in (`game.updateClamps`), it
    // leaves whatever it was eating and flies after him. It used to sit on a room of bodies until
    // the clamp took it, which after any real fight was every time (26 Sep 2026: "reach the end with
    // them"). The road of bodies still bends its way; it no longer ends it.
    const late = (p.behind || 0) >= C.late;
    const mark = late ? null : Beast.nearestMark(game, p);
    if (mark) {
      const dx = mark.x - p.x, dy = mark.y - p.y, d = hyp(dx, dy) || 1;
      if (d < C.perch * TILE) {
        p.vx = 0; p.vy = 0; p.feeding = true;
        // A few mouthfuls and it is done with that one (`feedFor`) and on to the next body down the
        // road. It used to sit on each until the body aged out of `markFor`, fourteen seconds a man,
        // and a goat that killed everything on his way still left it eighty tiles behind at the stairs.
        mark.fed = (mark.fed || 0) + dt;
        if (mark.fed >= C.feedFor) mark.done = true;
        if (!mark.said) {
          mark.said = true;
          game.floatText(p.x, p.y - 28, C.lines[Math.floor(Math.random() * C.lines.length)], PALETTE.bone);
          game.audio.sfxAnimal && game.audio.sfxAnimal('crow');
        }
        return;
      }
      p.feeding = false;
      // It is a bird: in sight of a body it goes straight there, fast, over whatever is on the floor.
      Beast.step(p, game, dx / d, dy / d, C.flySpeed, dt);
      return;
    }
    p.feeding = false;
    const to = Beast.toGoat(p, game);
    // Nothing dead in reach: it does not walk at his heels (1 Oct 2026, "the crow should go after the
    // bodies, not after you"). It sits where it is and pecks, and waits for him to make it a body.
    // Only a room behind him, or past `catchUp` tiles, it is a bird again and flies (`catchFly` of its
    // flight), and lands `waitAt` tiles short of him, on the floor of the fight he is walking into.
    const fly = late || to.d > C.catchUp * TILE;
    if (!fly && !p.flying) { p.vx = 0; p.vy = 0; p.pecking = true; if (Math.abs(game.goat.x - p.x) > 8) p.face = Math.sign(game.goat.x - p.x); return; }
    p.pecking = false;
    p.flying = to.d > C.waitAt * TILE;
    if (!p.flying) { p.vx = 0; p.vy = 0; return; }
    Beast.step(p, game, to.x, to.y, C.flySpeed * C.catchFly, dt);
  },
  // The body it goes for: one it has sight of, inside `markR` tiles, that has not aged out after
  // `markFor` seconds or been eaten (`feedFor`), and of those, the one nearest the stairs (`onward`'s field), so a crow in a
  // cleared room is drawn on toward the next one rather than back through the last. A body it has
  // already settled on stays its choice while it sits there.
  nearestMark(game, p) {
    const C = TUNING.prop.crow, list = game.crowMarks;
    if (!list || !list.length) return null;
    Beast.exit(game);
    const f = game.exitField, w = game.world;
    let best = null, bs = Infinity;
    for (const m of list) {
      if (m.done || game.timer - m.t > C.markFor) continue;
      const d = hyp(m.x - p.x, m.y - p.y);
      if (d > C.markR * TILE) continue;
      // A straight run to it over floor, not only a line of sight: a body across a drop is in sight,
      // and on the rafters the crow stood at the lip of the hole for good, trying to walk to it.
      if (d > C.perch * TILE && !Enemy.prototype.bodyClear.call(p, game, m.x, m.y, p.r * 0.5, NO_PROPS)) continue;
      if (d < C.perch * TILE) return m;
      const i = Math.floor(m.y / TILE) * w.W + Math.floor(m.x / TILE);
      const s = f && f.d[i] >= 0 ? f.d[i] : 1e6 + d;
      if (s < bs) { bs = s; best = m; }
    }
    return best;
  },

  // ---------------- what a level does with one ----------------
  // Every escort still with him at the stairs. `beginClimb` asks once; the reward is banked on
  // `game.beasts` (the run's, not the level's) and read back by `applyBoons` and by `startLevel`.
  saved(game) {
    const out = [];
    for (const p of game.props) {
      // The bird that brought the crow's gift came with the gift, not with the goat: banked, it paid
      // another tier III talisman on every floor after for the rest of the run.
      if (p.gift || !Beast.is(p.kind) || p.refused || p.agreed === false) continue;
      // The rabbit pays for legs still tied at the top of the stairs; the husky for a song sung.
      if (p.kind === 'rabbit' && !(game.legsTied && game.legsTied.p === p)) continue;
      if (p.kind === 'husky' && !p.sang) continue;
      // The horse pays only for a race he won: one soul room he was in before it (`horseRace`), or
      // the stairs, which he is on now, so a horse not yet home is a horse he beat. Won is won: it
      // need not be at his heels, only alive.
      if (p.kind === 'horse') { if (!p.dead && !p.broken && (p.won > 0 || !p.home)) out.push('horse'); continue; }
      // The pig pays once she is full, wherever she has wandered off to graze.
      if (p.kind === 'pig') { if (!p.dead && !p.broken && (p.fed || 0) >= TUNING.prop.pig.full) out.push('pig'); continue; }
      if (Beast.cameWith(p, game)) out.push(p.kind);
    }
    return out;
  },
  // A prize paid before the stairs (the horse beaten to a soul room): in `mods` at once, held on
  // `game.beastsHere`, the floor's, lost with a death like its souls, until the stairs bank it.
  prize(game, p) {
    game.beastsHere = game.beastsHere || {};
    if (game.beastsHere[p.kind]) return;
    game.beastsHere[p.kind] = 1; Stats.beast(game, p.kind, 'paid');
    game.applyBoons();
  },
  // Every one banked this run, and any the floor under way has already paid (`prize`).
  counts(game) {
    const b = Object.assign({}, game.beasts || {});
    for (const [k, n] of Object.entries(game.beastsHere || {})) b[k] = (b[k] || 0) + n;
    return b;
  },
  // Whether one alive animal came up the stairs with him: in his mouth, inside its `saveR`, or
  // anywhere in the room the stairs stand in, it is on his heels and follows him up. The crow
  // (`saveRooms` 1) a room further back too: nothing walls it in yet, and it is a bird. Only the
  // radius used to count, the moment his hoof touched the flight: a crow still pecking at the boss
  // nine tiles back was lost on three walks in six (26 Sep 2026), the hen the same, and the card
  // said nothing had come. The hen asks this too (`beginClimb`).
  cameWith(p, game) {
    if (p.broken || p.dead) return false;
    const g = game.goat, C = TUNING.prop[p.kind] || {};
    if (p.held || hyp(p.x - g.x, p.y - g.y) <= (C.saveR || 8) * TILE) return true;
    if (!game.level) return false;
    const top = game.goatRoom || 0, r = roomAt(game.level, p.x, p.y);
    return (r ? r.index : game.nearestRoomIdx(p.x, p.y, top)) >= top - (C.saveRooms || 0);
  },
  // What the run carries away. `game.beasts` is a count per kind, so two tortoises over a run are
  // two uses on every shield, the same way the hen's hearts stack.
  bank(game, kinds) {
    if (!kinds.length) return;
    game.beasts = game.beasts || {};
    for (const k of kinds) game.beasts[k] = (game.beasts[k] || 0) + 1;
  },
  // Into `game.mods`, from `applyBoons`, exactly the way a boon or a talisman goes in.
  applyRewards(game, m) {
    const b = Beast.counts(game);
    if (b.rabbit) m.rollCooldown *= Math.pow(TUNING.prop.rabbit.saveRollCd, b.rabbit);
    if (b.husky) m.screamCooldown *= Math.pow(TUNING.prop.husky.saveScreamCd, b.husky);
    // Legs tied (the rabbit's bargain, js/beasts-more.js): the roll is the hop, sooner and further.
    if (game.legsTied) { m.rollCooldown *= TUNING.prop.rabbit.tied.rollCd; m.rollDistance *= TUNING.prop.rabbit.tied.rollDist; }
    if (b.tortoise) m.shieldUses = (m.shieldUses || 0) + TUNING.prop.tortoise.saveShield * b.tortoise;
    if (b.horse) m.speed *= Math.pow(TUNING.prop.horse.saveSpeed, b.horse);
    if (b.goose) {
      const C = TUNING.prop.goose;
      m.screamRadius *= Math.pow(C.saveScreamRange, b.goose);
      m.screamCall = (m.screamCall || TUNING.goat.scream.call) * Math.pow(C.saveScreamRange, b.goose);
      m.screamCooldown *= Math.pow(C.saveScreamCd, b.goose);
    }
  },
  // The crow's own, which is not a number but a thing standing on the next floor: one talisman at
  // its tier, free, on the stairs the goat arrives by, reached for the way one of the mouse's is.
  // `game.crowGift` is set by `beginClimb` and spent here.
  placeGift(game) {
    if (!game.crowGift) return;
    game.crowGift = false;
    const C = TUNING.prop.crow, at = game.level.entry || game.level.start;
    // Two and a half tiles off the flight rather than on it: a talisman under the goat's own feet
    // on the first frame of a level reads as something he is standing in, not as something left for
    // him. A negative `shopId` belongs to no room, so `Shop.buy`'s gate call finds nothing and returns.
    const spot = game.freeSpot(at.x + TILE * 2.5, at.y);
    const stock = stockFor(game.level.def, new RNG((Math.random() * 1e9) | 0));
    // Never the talisman he wears: worn at tier III already, "free" was the same thing swapped back.
    const worn = game.artifact && game.artifact.id;
    const pick = stock.find((a) => a.id !== worn) || ARTIFACTS.find((a) => a.id !== worn) || { id: ARTIFACTS[0].id };
    const ware = new Prop(spot.x, spot.y, 'ware', {
      shopId: -1 - ((Math.random() * 1e6) | 0), ware: { id: pick.id, tier: C.giftTier },
    });
    const bird = new Prop(spot.x, spot.y - TILE * 0.9, 'crow');
    // `gift` is set here rather than passed in: `Prop`'s constructor copies the opts it knows about and
    // nothing else. It keeps the bird off `Beast.met`, this one has already been introduced.
    ware.gift = true; bird.gift = true; bird.giftWare = ware;
    game.props.push(ware, bird);
    game.floatText(spot.x, spot.y - 46, 'THE CROW LEFT IT', PALETTE.fireHi);
  },
  // The gift bird is not an escort: it sits over what it brought, looking at him, and once he has
  // taken it (or swapped it, `chosen`) or walked `giftLeave` tiles off without it, it goes up and
  // away. Followed about all floor, it read as a crow to walk out, and paid nothing at the stairs.
  updateGift(p, dt, game) {
    const C = TUNING.prop.crow, g = game.goat, w = p.giftWare;
    if (!p.leaving) {
      p.vx = 0; p.vy = 0;
      if (Math.abs(g.x - p.x) > 8) p.face = Math.sign(g.x - p.x);
      const done = !w || w.broken || w.chosen;
      if (!done && hyp(g.x - p.x, g.y - p.y) < C.giftLeave * TILE) return;
      p.leaving = 0; p.face = g.x > p.x ? -1 : 1;
      game.audio.sfxAnimal && game.audio.sfxAnimal('crow');
      game.particles(p.x, p.y, 5, PALETTE.ink, 110);
    }
    // Up and off, away from him, over whatever is in the way: nothing collides with a bird in the air.
    p.leaving += dt; p.lift = (p.lift || 0) + C.giftRise * dt;
    p.vx = p.face * C.flySpeed * 0.5; p.vy = -C.flySpeed * 0.15;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.leaving >= C.giftGone) { p.broken = true; p.dead = true; }
  },

  // ---------------- which floors get one ----------------
  // The run's deal, off its own seed, so a death or a CONTINUE deals the same: the first animal on
  // a floor in `deal.first`, each after it `deal.gap` floors on, each kind off that floor's own
  // `beasts` list and never one the run has already been dealt. A walk that lands on a floor with
  // nothing fresh on its list is thrown away and walked again; after `tries` of those the last walk
  // simply steps over such a floor. Index by level; null is a floor with no animal.
  // `early` lets the first one come on the `known` floor instead (a browser that has cleared it).
  deal(seed, early) {
    const D = TUNING.beast.deal, rng = new RNG(((seed >>> 0) ^ 0xbea57) >>> 0), kinds = new Set();
    const lo = early ? Math.min(D.known, D.first[0]) : D.first[0];
    for (const L of LEVELS) for (const k of (L.beasts || [])) kinds.add(k);
    const walk = (strict) => {
      const plan = LEVELS.map(() => null), used = new Set();
      let i = rng.int(lo, D.first[1]);
      // Never the last floor: every animal pays for the rest of the run, and after the last floor's
      // stairs there is no run left to pay it into.
      while (i < LEVELS.length - 1 && used.size < kinds.size) {
        const can = (LEVELS[i].beasts || []).filter((k) => !used.has(k));
        if (can.length) { const k = can[rng.int(0, can.length - 1)]; plan[i] = k; used.add(k); i += rng.int(D.gap[0], D.gap[1]); }
        else if (strict) return null;
        else i++;
      }
      return plan;
    };
    for (let t = 0; t < D.tries; t++) { const plan = walk(true); if (plan) return plan; }
    return walk(false);
  },

  // ---------------- the first one of a run ----------------
  // One line, once, the way the hen and the hound get one: an animal walking after you explains
  // nothing on its own, and an escort nobody understands is left standing in the room it was in.
  met(game, p) {
    game.beastTold = game.beastTold || {};
    if (p.asked) return;
    p.asked = true;
    // The rabbit and the husky pay only on a yes: met again after a death, the question is put again
    // (its last page), or the fresh one could never be agreed to and never pay.
    if (game.beastTold[p.kind]) {
      const L = BEAST_HELLO[p.kind];
      if ((p.kind === 'rabbit' || p.kind === 'husky') && L && L.length) Beast.talk(game, p, [L[L.length - 1]], true);
      return;
    }
    game.beastTold[p.kind] = true;
    // The two with a bargain to strike say it in the box, over the paused floor: a race and a meal
    // are rules a float over a head was read half of.
    if (p.kind === 'horse') {
      const C = TUNING.prop.horse, n = Beast.horseLegs(p, game).length + 1;
      const word = ['NO TRIES', 'ONE TRY', 'TWO TRIES', 'THREE TRIES', 'FOUR TRIES'][n] || n + ' TRIES';
      return Beast.talk(game, p, (n > 1 ? C.talk.race : C.talk.raceOne).map((l) => l.replace('{tries}', word)), true);
    }
    if (p.kind === 'pig') {
      const n = TUNING.prop.pig.full, word = ['NONE', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][n] || String(n);
      return Beast.talk(game, p, TUNING.prop.pig.talk.hello.map((l) => l.replace('{n}', word)), true);
    }
    // In the animal's own voice, and it says the rule it keeps rather than what it is: how it will
    // (or will not) come along is the one thing a player cannot guess by watching it for a second.
    // Every one of them in the box now (30 Sep 2026: a float over a head was glimpsed, not read, and
    // letting one out did not register as a thing that had happened).
    if (BEAST_HELLO[p.kind]) return Beast.talk(game, p, BEAST_HELLO[p.kind], true);
    Beast.speak(game, p, Beast.PACT[p.kind]);
  },
  // The ANIMALS tab of the dev drawer (`Renderer.drawAnimalsTab`): how each one behaves and what it
  // pays, in a sentence each, the reward's numbers read off TUNING so the page cannot drift.
  ABOUT: {
    chicken: { how: 'Follows you round walls, steps round fire, teeth and drops, and keeps behind you when a man is close. Butt her and she flies at the first man along the line of the blow and kills him, once.',
      pays: () => `+${TUNING.prop.chicken.saveHearts} heart for the run` },
    tortoise: { how: 'Slower than a walk and never catches up: you carry it in your teeth, or throw it forward. Where it lands it is a shell, solid, rounds stop on it, a man it hits is floored, and it takes one blow for you, then lies on its back.',
      pays: () => `+${TUNING.prop.tortoise.saveShield} use on every shield for the run` },
    goose: { how: `Leads rather than follows, up to ${TUNING.prop.goose.lead} tiles ahead, and honks at every man it sees: the room turns on you, and a blow already coming is broken.`,
      pays: () => `the voice carries ${Math.round((TUNING.prop.goose.saveScreamRange - 1) * 100)}% further and comes back ${Math.round((1 - TUNING.prop.goose.saveScreamCd) * 100)}% sooner (never under ${TUNING.goat.scream.minCooldown} s)` },
    crow: { how: 'Follows the dead, not you: it flies to a body it can see and eats a while, and with nothing dead in reach it sits and waits where it is. A room behind you, or far off, it leaves the bodies and flies after you, landing a few tiles short. At the stairs it counts from the room before the last; the bird that brings its gift sits by it, then flies off.',
      pays: () => `a tier ${TUNING.prop.crow.giftTier} talisman on the next floor's stairs` },
    horse: { how: `Shut in a stall of ${TUNING.prop.stall.w} x ${TUNING.prop.stall.h} tiles before the first soul gate (${TUNING.prop.stall.hits} blows). Races you in legs: to each locked room with a soul ahead of it (a soul gate's room, the mouse's too), where it waits at the bar until the gate gives, then on, and last to the stairs. A leg is yours if you are in its room before it, and the stairs are the last try; it says its terms in a box as it comes out, and when you beat it. Kicks down the doors in its way and bowls the men in it aside without killing them; a sealed arena, the vault door or the dark flight's door holds it too.`,
      pays: () => `×${TUNING.prop.horse.saveSpeed} stride for the run, at once, if you win one try (a soul room or the stairs); banked at the stairs` },
    rabbit: { how: 'Hops after you. In its box it offers to tie your legs: said yes, you have no stride at all, only the headbutt, the voice, what you carry, and the roll, which goes where you point and comes back far sooner. Up the stairs with it so.',
      pays: () => `the roll back ${Math.round((1 - TUNING.prop.rabbit.saveRollCd) * 100)}% sooner for the run` },
    husky: { how: `Said yes, first a practice: in the first room with nobody alive, the same song with no cult and no way to lose (${TUNING.prop.husky.practice.need} answers, or ${TUNING.prop.husky.practice.time} s, or you walk out). Then she runs to the fullest room with men within ${TUNING.prop.husky.ahead} rooms ahead (they leave her be) and waits in its middle; as you come in ${TUNING.prop.husky.extra} more of the cult come after you and she sings: answer her ${TUNING.prop.husky.need} times with your voice on the beat (two staves at the foot of the screen, ±${TUNING.prop.husky.window} s). Gives up after ${TUNING.prop.husky.time} s, or ${TUNING.prop.husky.after} cycles after the room is empty.`,
      pays: () => `the voice back ${Math.round((1 - TUNING.prop.husky.saveScreamCd) * 100)}% sooner for the run, if she sang and comes up the stairs` },
    pig: { how: `Ambles after you and eats any milk grass she can see within ${TUNING.prop.pig.smell} tiles (${TUNING.prop.pig.eatTime} s a tuft), yours, unless you graze it first. ${TUNING.prop.pig.full} and she is full, thanks you in a box and eats no more. Says what she wants in a box when she comes out.`,
      pays: () => `${TUNING.prop.pig.saveHeals.join('-')} more milk grass on every floor after, if she is full at the stairs` },
  },
  // Every line it can say, for the same tab: its terms, and whatever else it says along the way.
  lines(kind) {
    const P = TUNING.prop[kind] || {}, out = (Beast.PACT[kind] || []).slice();
    if (kind === 'crow') out.push(...P.lines);
    if (kind === 'horse') out.push(...P.talk.race, ...P.talk.beaten, P.lines.won, P.lines.mine, P.lines.left, P.lines.lost, P.lines.yours, P.lines.pay, P.lines.none, ...P.lines.taunt);
    if (kind === 'pig') out.push(...P.talk.hello, ...P.talk.full, ...P.lines.munch, ...P.lines.left);
    if (kind === 'goose') out.push('IT GIVES YOU AWAY. IT ALSO BREAKS THEM');
    if (BEAST_HELLO[kind]) out.push(...BEAST_HELLO[kind]);
    return out;
  },
  // What each of them says the first time a run meets one: its sound, then its terms.
  PACT: {
    chicken: ['CLUCK-CLUCK!', "I'LL FOLLOW YOU. BUTT ME AT A MAN"],
    // Carried is how it gets there (RMB, nearly his full pace); thrown is what it is for in a fight.
    // "THROW ME TO THE EXIT" alone read as a throw a room at a time, four seconds of shell between.
    tortoise: ['...?', 'CARRY ME TO THE EXIT', 'THROW ME AT THEM'],
    crow: ['CAW.', 'I FOLLOW THE ROAD OF BODIES'],
    goose: ['HONK-HONK!', "I'LL TELL THEM ALL", "WE'RE HERE TO KICK THEIR ASS!!!"],
    // The race is to the soul rooms now (30 Sep 2026), and the one rule that pays is said up front.
    // The horse and the pig say theirs in the box (`met` → `talk`); these are left for the tab.
    horse: ['NEIGH!'],
    pig: ['OINK.'],
    rabbit: ['THUMP-THUMP.'],
    husky: ['AWOO!'],
  },
  // Its sound, then its terms, over its head and held far longer than a float, so the sentence is
  // read and not glimpsed (24 Sep 2026: "long enough that the player really reads it"). The lines
  // ride on the animal (`on`, drawn by `Renderer.drawFloatTexts`) rather than where it stood. The
  // sound is bone; the terms are the hen's gold, the colour every escort talks in.
  speak(game, p, lines) {
    if (!lines) return;
    const life = TUNING.beast.pactFor;
    game.audio.sfxAnimal && game.audio.sfxAnimal(p.kind);
    lines.forEach((text, k) => game.floats.push({ x: p.x, y: p.y, on: p, row: k, n: lines.length, text, color: k ? PALETTE.hen : PALETTE.bone, life, pact: true }));
  },

  // ---------------- the pig ----------------
  // She wants nothing but to eat. Loose, she ambles after him (never at his heels: `followAt`), and
  // any milk grass she can see within `smell` tiles she goes to and eats. That is the bargain: every
  // tuft she reaches before he has grazed it is a heart he does not get, and `full` of them buys a
  // tuft or two more on every floor after this one (`Game.startLevel`). Once full she eats no more.
  updatePig(p, dt, game) {
    const C = TUNING.prop.pig, g = game.goat;
    const away = Beast.shy(p, game);
    if (away) { p.eating = null; if (away.d) Beast.step(p, game, away.x, away.y, C.speed * TUNING.beast.shySpeed, dt); else { p.vx = 0; p.vy = 0; } return; }
    const full = (p.fed || 0) >= C.full;
    // The tuft she is at, or the nearest one she can see and walk to.
    let q = p.eating && !p.eating.broken ? p.eating : null;
    if (!q && !full) {
      let bd = C.smell * TILE;
      for (const h of game.props) {
        if (h.kind !== 'heal' || h.broken || h.pail > 0) continue;
        const d = hyp(h.x - p.x, h.y - p.y);
        if (d < bd && game.world.los(p.x, p.y, h.x, h.y)) { bd = d; q = h; }
      }
    }
    if (q) {
      const dx = q.x - p.x, dy = q.y - p.y, d = hyp(dx, dy) || 1;
      if (d > C.eatR * TILE) { p.eating = q; p.chew = 0; Beast.step(p, game, dx / d, dy / d, C.speed, dt); return; }
      p.vx = 0; p.vy = 0; p.eating = q; if (Math.abs(dx) > 2) p.face = Math.sign(dx);
      p.chew = (p.chew || 0) + dt;
      if (p.chew >= C.eatTime) Beast.pigEats(p, q, game);
      return;
    }
    p.eating = null; p.chew = 0;
    const to = Beast.toGoat(p, game);
    if (to.d < C.followAt * TILE) { p.vx = 0; p.vy = 0; if (Math.abs(g.x - p.x) > C.faceDead) p.face = Math.sign(g.x - p.x); return; }
    Beast.step(p, game, to.x, to.y, C.speed * (to.d > C.catchFar * TILE ? C.catchUp : 1), dt);
  },
  // A tuft down her: gone the way his graze takes one, a word of how many more, and the thanks in
  // the box on the last.
  pigEats(p, q, game) {
    const C = TUNING.prop.pig;
    q.broken = true; q.dead = true; q.graze = 0;
    p.fed = (p.fed || 0) + 1; p.eating = null; p.chew = 0; p.wobble = 0.3;
    game.particles(q.x, q.y, 14, PALETTE.hen, 150);
    game.audio.sfxAnimal && game.audio.sfxAnimal('pig');
    if (p.fed >= C.full) {
      const n = C.saveHeals;
      Beast.talk(game, p, C.talk.full.map((l) => l.replace('{a}', n[0]).replace('{b}', n[1])));
      return;
    }
    const left = C.full - p.fed, L = C.lines;
    game.floats.push({ x: p.x, y: p.y, on: p, row: 0, n: 1, text: L.munch[Math.floor(Math.random() * L.munch.length)] + ' ' + L.left[left > 1 ? 0 : 1].replace('{n}', left), color: PALETTE.hen, life: 2.4, pact: true });
  },

  // ---------------- the box ----------------
  // An animal with a bargain to strike says it in a box over the paused floor, the god's box from
  // heaven (`Heaven.drawTalk`) in the compound's colours: its picture on the left, its words typing
  // across the bottom, a press to turn each page. While it is up `Game.update` runs nothing else.
  // `ask`: the last page waits for BAAAH (yes) or bah (no) (`BEAST_ANSWER`, `Beast.answer`, 1 Oct 2026).
  talk(game, p, lines, ask) {
    if (!lines || !lines.length) return;
    game.beastTalk = { p, kind: p.kind, lines, i: 0, shown: 0, t: 0, out: 0, ask: !!ask, pick: 0, rects: [] };
    game.goat.vx = 0; game.goat.vy = 0;
    game.audio.sfxAnimal && game.audio.sfxAnimal(p.kind);
  },
  updateTalk(game, dt) {
    const K = game.beastTalk, inp = game.input, T0 = TUNING.beast.talk;
    K.t += dt;
    if (K.out > 0) { K.out += dt; if (K.out >= T0.out) game.beastTalk = null; return; }
    const line = K.lines[K.i];
    K.shown = Math.min(line.length, K.shown + dt * T0.type);
    if (K.ask && K.i === K.lines.length - 1 && K.shown >= line.length && K.full === undefined) K.full = K.t;   // the question, all written
    const press = inp.lmbPressed || inp.spacePressed || inp.rollPressed || inp.rmbPressed || inp.qPressed;
    if (!press || K.t < T0.arm) return;
    if (K.shown < line.length) { K.shown = line.length; return; }
    if (K.i + 1 < K.lines.length) { K.i++; K.shown = 0; game.audio.sfxAnimal && game.audio.sfxAnimal(K.kind); return; }
    if (K.ask) {
      // The question waits `talk.askArm` s once it is all written out: on a pad A turns every page and is
      // also the roll, "no", so tapping through the box refused the animal for good.
      if (K.full === undefined || K.t - K.full < T0.askArm) return;
      // The answer: BAAH (the voice) or a click on BAAAH! is yes; the roll, the right button or bah. is no.
      let yes = null;
      if (inp.spacePressed) yes = true;
      else if (inp.rollPressed || inp.rmbPressed) yes = false;
      else if (inp.lmbPressed && inp.mouse) { const i = K.rects.findIndex((r) => inp.mouse.x >= r.x && inp.mouse.x <= r.x + r.w && inp.mouse.y >= r.y && inp.mouse.y <= r.y + r.h); if (i >= 0) yes = i === 0; }
      if (yes === null) return;
      if (yes) game.audio.sfxBleat(300, 0.2, 0.5); else game.audio.sfxBleat(520, 0.06, 0.25);
      K.out = 0.0001; Beast.answer(game, K.p, yes);
      return;
    }
    K.out = 0.0001;   // the press that closed it is spent here: `Game.update` clears the edges after
  },
  // The animal as it looks, big, at the origin (its feet), for the box.
  portrait(R, ctx, kind, k) {
    ctx.save(); ctx.scale(k, k);
    if (kind === 'horse') R.horseSprite(ctx, 0, false, 'idle');
    else if (kind === 'pig') R.pigSprite(ctx, 0, false, 'idle');
    else if (kind === 'rabbit' || kind === 'husky') {
      const z = TUNING.beast.talk.size[kind] || 1.5;
      ctx.scale(z, z * TILT); Beast.drawMore(R, { x: 0, y: 0, kind, face: 1, bob: R.t * 3, vx: 0, vy: 0, r: TUNING.prop[kind].r });
    } else {
      // The small ones as they stand in the world (`drawProp` stands them up against the world's
      // squash, taken back out here), a size up so a hen is not a speck beside a horse's box.
      const fake = new Prop(0, 0, kind); fake.bob = R.t * 3; fake.face = 1;
      const z = TUNING.beast.talk.size[kind] || 1.5;
      ctx.scale(z, z * TILT); ctx.translate(0, -8);
      R.drawProp(fake);
    }
    ctx.restore();
  },
  drawTalk(R, game) {
    const ctx = R.ctx, K = game.beastTalk, s = R.ts, W = R.vw, Hh = R.vh, t = R.t;
    const T0 = TUNING.beast.talk, inK = clamp(K.t / 0.3, 0, 1), outK = K.out > 0 ? clamp(K.out / T0.out, 0, 1) : 0;
    const vis = (1 - Math.pow(1 - inK, 3)) * (1 - outK);
    ctx.save(); ctx.globalAlpha = vis;
    ctx.fillStyle = 'rgba(13,10,12,0.55)'; ctx.fillRect(0, 0, W, Hh);
    // clear of the skill rail in the bottom-right corner, which is drawn over everything
    const bw = Math.min(W * 0.62, 760 * s);
    // The words are laid out first, so the box grows to hold them and, on the page that asks, the row
    // of answers under them (1 Oct 2026: on the crow's last page the text ran under the buttons).
    const size = Math.round(19 * s), tx0 = 30 * s;
    ctx.font = FONT_PICK.font('text', size);
    const typing = K.shown < K.lines[K.i].length, asking = K.ask && K.i === K.lines.length - 1;
    const wrapped = Heaven.wrap(ctx, K.lines[K.i], bw - tx0 * 2), ansH = 50 * s, ansGap = 16 * s;
    const bh = Math.max(104 * s, Hh * 0.17, 22 * s + wrapped.length * size * 1.4 + (asking ? ansGap + ansH : 0) + 16 * s);
    const bx = Math.round(Math.max(20 * s, (W - bw) / 2 - W * 0.08)), by = Math.round(Hh - bh - 26 * s + (1 - vis) * 30 * s);
    // the animal, standing on the box's top edge, left of it, in a pool of warm light
    const ph = Math.min(Hh * 0.26, 200 * s), k = ph / 52, half = (K.kind === 'horse' ? 62 : 40) * k / 2;
    const fx = bx + 18 * s + half - (1 - vis) * 60 * s, fy = by + 6 * s;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(fx, fy - ph * 0.45, 0, fx, fy - ph * 0.45, ph * 0.8);
    gl.addColorStop(0, 'rgba(232,221,200,0.22)'); gl.addColorStop(1, 'rgba(232,221,200,0)');
    ctx.fillStyle = gl; ctx.fillRect(fx - ph, fy - ph * 1.3, ph * 2, ph * 1.6); ctx.restore();
    ctx.save(); ctx.translate(Math.round(fx), Math.round(fy));
    const bob = typing ? Math.round(Math.abs(Math.sin(t * 9)) * 2 * s) : 0;
    ctx.translate(0, -bob);
    Beast.portrait(R, ctx, K.kind, k);
    ctx.restore();
    // the box
    ctx.fillStyle = 'rgba(22,15,20,0.94)'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = PALETTE.ochre; ctx.fillRect(bx, by, bw, 3 * s); ctx.fillRect(bx, by + bh - 2 * s, bw, 2 * s);
    ctx.strokeStyle = 'rgba(232,221,200,0.25)'; ctx.lineWidth = Math.max(1, s); ctx.strokeRect(bx + 6 * s, by + 9 * s, bw - 12 * s, bh - 17 * s);
    // the name plate
    const name = 'THE ' + (Beast.NAME[K.kind] || 'ANIMAL');
    ctx.font = `700 ${17 * s}px ${FONT_SC}`; const nw = textW(ctx, name) + 30 * s;
    const nx = bx + 30 * s + half * 2;   // beside the animal, which stands on the box's edge
    ctx.fillStyle = 'rgba(22,15,20,0.96)'; ctx.fillRect(nx, by - 26 * s, nw, 28 * s);
    ctx.fillStyle = PALETTE.ochre; ctx.fillRect(nx, by - 26 * s, nw, 2 * s);
    ctx.fillStyle = PALETTE.hen; ctx.textAlign = 'left'; ctx.fillText(name, nx + 15 * s, by - 6 * s);
    // the words, typing, across the box under both
    const tx = bx + tx0;
    ctx.font = FONT_PICK.font('text', size);
    const lines = wrapped;
    let left = Math.floor(K.shown), y = by + 22 * s + size;
    ctx.fillStyle = PALETTE.bone;
    for (const l of lines) { if (left <= 0) break; ctx.fillText(l.slice(0, left), tx, y); left -= l.length + 1; y += size * 1.4; }
    // The answer, once the last page is said (`ask`): BAAAH! (yes) and bah. (no), each a plate with its
    // key on a cap, in a row of their own under the words. They fade in as the typing ends.
    K.rects = [];
    if (asking) {
      const kk = keysOf(game), opts = [[BEAST_ANSWER.yes, BEAST_ANSWER.yesSay, kk.scream], [BEAST_ANSWER.no, BEAST_ANSWER.noSay, kk.roll]];
      const bw2 = Math.min(250 * s, (bw - tx0 * 2 - ansGap) / 2), bh2 = ansH, x2 = bx + bw - tx0 - bw2 * 2 - ansGap, y2 = by + bh - bh2 - 16 * s, m = game.input.mouse;
      ctx.save(); ctx.globalAlpha *= typing ? 0.35 : 1;
      opts.forEach(([word, say, key], i) => {
        const x = Math.round(x2 + i * (bw2 + ansGap)), y = Math.round(y2), on = !typing && m && !game.touch.active && m.x >= x && m.x <= x + bw2 && m.y >= y && m.y <= y + bh2;
        const lift = on ? Math.round(2 * s) : 0, col = i ? PALETTE.bone : PALETTE.hen;
        K.rects.push({ x, y, w: bw2, h: bh2 });
        // a plate: a dark drop under it, a fill, a hard two-pixel rim and a lit top edge
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + 3 * s, y + 4 * s, bw2, bh2);
        ctx.fillStyle = i ? (on ? '#3a2e36' : '#2a2128') : (on ? '#5a4220' : '#41301a'); ctx.fillRect(x, y - lift, bw2, bh2);
        ctx.fillStyle = i ? 'rgba(239,230,208,0.08)' : 'rgba(242,201,104,0.16)'; ctx.fillRect(x, y - lift, bw2, Math.round(bh2 * 0.45));
        ctx.strokeStyle = i ? 'rgba(239,230,208,0.45)' : col; ctx.lineWidth = Math.max(2, Math.round(2 * s));
        ctx.strokeRect(x + 1, y - lift + 1, bw2 - 2, bh2 - 2);
        // the key on a cap at the left, the word, the plain meaning after it
        const cap = Math.round(30 * s), cy = y - lift + (bh2 - cap) / 2;
        let wx = x + 14 * s;
        if (!game.touch.active) {
          ctx.font = `700 ${Math.round(12 * s)}px ${FONT_SC}`;
          const cw = Math.max(cap, textW(ctx, key) + 14 * s);
          ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(wx, cy + 3 * s, cw, cap);
          ctx.fillStyle = '#efe6d0'; ctx.fillRect(wx, cy, cw, cap - 3 * s);
          ctx.fillStyle = '#b9ad94'; ctx.fillRect(wx, cy + cap - 3 * s, cw, 3 * s);
          ctx.fillStyle = '#1a1214'; ctx.textAlign = 'center'; ctx.fillText(key, wx + cw / 2, cy + cap * 0.62);
          wx += cw + 12 * s;
        }
        ctx.textAlign = 'left'; ctx.font = `700 ${Math.round((i ? 19 : 22) * s)}px ${FONT_SC}`; ctx.fillStyle = col;
        ctx.fillText(word, wx, y - lift + bh2 * 0.64);
        const ww = textW(ctx, word);
        ctx.font = `${Math.round(14 * s)}px ${FONT}`; ctx.fillStyle = 'rgba(232,221,200,0.65)'; ctx.fillText(say, wx + ww + 8 * s, y - lift + bh2 * 0.64);
      });
      ctx.restore();
    } else if (!typing) {
      const b = Math.round(Math.sin(t * 5) * 2 * s), c = Math.max(1, Math.round(2 * s));
      ctx.fillStyle = PALETTE.hen;
      for (let q = 0; q < 4; q++) ctx.fillRect(Math.round(bx + bw - 34 * s + q * c), Math.round(by + bh - 26 * s + b + q * c), Math.round((8 - 2 * q) * c), c);
    }
    ctx.font = `${12 * s}px ${FONT}`; ctx.fillStyle = 'rgba(232,221,200,0.45)'; ctx.textAlign = 'right';
    ctx.fillText(`${K.i + 1} / ${K.lines.length}`, bx + bw - 16 * s, by + 24 * s);
    ctx.restore();
  },
};
