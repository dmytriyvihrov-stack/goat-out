// THE ESCORTS. Three animals found loose in the first third of a floor and worth something for the
// rest of the run if you get them to the stairs — the hen's frame (`Prop.updateBird`, js/entities.js)
// widened into a system, the way poison kept its own file and the talismans kept theirs.
//
// Every one of them is a plain `Prop` with its own `kind`, so collision, the draw order, the fog and
// the clamp already know what to do with it and nothing in the rest of the game was taught a new
// noun. Nothing here adds a key: a tortoise is grabbed and thrown with the verb that throws a crate,
// a goose is walked past, a crow is followed. What makes an escort hard is that none of them simply
// trots after you — the difficulty is the animal, not a button.
//
//   TORTOISE  slower than a walk. You advance it by throwing it. Where it lands it is a shell:
//             solid, and rounds stop on it. At the stairs: every shield in the run gets a use.
//   GOOSE     leads rather than follows, and honks at every man it sees — which turns the room
//             onto YOU, and which breaks a committed blow at any range. At the stairs: the voice.
//   CROW      follows corpses, not you. At the stairs: a tier III talisman on the next floor.
//
// `TUNING.prop.<kind>` is every number; `TUNING.beast` is where one comes from. `GEN_RULES.beasts`
// holds the placement to its promise.
const Beast = {
  // Every kind this file drives. `Prop.update` and the generator both ask here rather than carrying
  // three literals about, so a fourth animal is one line in this list and one `update` branch.
  KINDS: ['tortoise', 'goose', 'crow'],
  is(kind) { return Beast.KINDS.indexOf(kind) >= 0; },

  // The hen is one of the animals too, for everything but how she moves (`Prop.updateBird`).
  animal(p) { return !p.broken && !p.dead && (Beast.is(p.kind) || p.kind === 'chicken'); },
  NAME: { tortoise: 'TORTOISE', goose: 'GOOSE', crow: 'CROW', chicken: 'HEN' },
  // What the top-left corner shows for every one brought to the stairs (`Renderer.drawSaved`).
  EMOJI: { tortoise: '\u{1F422}', goose: '\u{1FABF}', crow: '\u{1F426}\u200D\u2B1B', chicken: '\u{1F414}' },

  // ---------------- being hurt ----------------
  // An animal is not furniture and not a man: the room can kill it, but not in one. `TUNING.beast.hp`
  // blows from anything the cult swings, or that many touches of fire, and it is dead — which is the
  // price of walking one through a fight. `hurtCd` keeps one swing or one tile of fire from being
  // three wounds. The tortoise is in a shell: only fire gets through it.
  hurt(p, game, src) {
    if (!Beast.animal(p) || p.held || (p.hurtCd || 0) > 0) return;
    const B = TUNING.beast;
    if (p.kind === 'tortoise' && src !== 'fire') { Beast.shellTakes(p, game); p.hurtCd = B.hurtCd; return; }
    p.beastHp = (p.beastHp === undefined ? B.hp : p.beastHp) - 1;
    p.hurtCd = B.hurtCd; p.wobble = 0.3; p.hurtFlash = 0.25;
    game.particles(p.x, p.y, 7, src === 'fire' ? PALETTE.fire : PALETTE.blood, 150);
    if (p.beastHp > 0) {
      game.audio.sfxAnimal(p.kind, true);
      game.floatText(p.x, p.y - 26, p.beastHp + ' LEFT', PALETTE.hen);
      return;
    }
    p.broken = true; p.dead = true;
    if (game.goat.holding === p) game.goat.holding = null;
    game.world.splat(p.x, p.y, 0, 0, 6);
    game.particles(p.x, p.y, 16, p.kind === 'crow' ? PALETTE.ink : PALETTE.bone, 200);
    game.audio.sfxSplat();
    game.floatText(p.x, p.y - 30, 'THE ' + Beast.NAME[p.kind] + ' IS DEAD', PALETTE.blood);
  },
  // Fire under its feet and the wound clock, every step, for the three escorts and the hen alike.
  tick(p, dt, game) {
    p.hurtCd = Math.max(0, (p.hurtCd || 0) - dt);
    p.hurtFlash = Math.max(0, (p.hurtFlash || 0) - dt);
    if (!p.held && !p.flying && game.world.isBurningPx(p.x, p.y)) Beast.hurt(p, game, 'fire');
  },

  // ---------------- the walk ----------------
  update(p, dt, game) {
    if (p.broken || p.held) return;          // in his mouth he goes where his mouth goes
    Beast.tick(p, dt, game); if (p.broken) return;
    p.bob = (p.bob || 0) + dt * 3;
    // Close enough to have seen it: the first of each kind in a run says what it is for, the way
    // the hen and the hound do. An animal walking about explains nothing on its own.
    if (!p.gift && Math.hypot(p.x - game.goat.x, p.y - game.goat.y) < TUNING.beast.tellFor * TILE) Beast.met(game, p);
    if (p.kind === 'tortoise') return Beast.updateTortoise(p, dt, game);
    if (p.kind === 'goose') return Beast.updateGoose(p, dt, game);
    if (p.kind === 'crow') return Beast.updateCrow(p, dt, game);
  },

  // Where an animal may put its foot: the hen's own steering, which borrows the men's `hazardAt` so
  // nothing on our side walks into a fire, the wheel, raised teeth or a drop. One method for all of
  // them, because an animal that blunders into the room reads as broken rather than as characterful.
  step(p, game, dx, dy, spd, dt) {
    const safe = Prop.prototype.henSteer.call(p, game, dx, dy);
    if (!safe) { p.vx = 0; p.vy = 0; p.wanderA = (p.wanderA || 0) + Math.PI; return; }
    p.vx = safe.x * spd; p.vy = safe.y * spd;
    const ox = p.x, oy = p.y;
    p.x += p.vx * dt; p.y += p.vy * dt;
    game.world.collideCircle(p);
    if (game.world.isPitPx(p.x, p.y)) { p.x = ox; p.y = oy; p.wanderA = (p.wanderA || 0) + Math.PI; }
  },
  // Toward the goat the way the hen goes: the straight line only when he is close and in sight,
  // otherwise the flow field every man in the building already chases down, so a wall between them
  // is a way round rather than a nose against stone.
  toGoat(p, game) {
    const g = game.goat, dx = g.x - p.x, dy = g.y - p.y, d = Math.hypot(dx, dy) || 1;
    const f = d < 3 * TILE && game.world.los(p.x, p.y, g.x, g.y) ? null : game.world.flowDir(p.x, p.y);
    return f ? { x: f.x, y: f.y, d } : { x: dx / d, y: dy / d, d };
  },

  // ---------------- the tortoise ----------------
  // Loose, it plods after him and never arrives. Thrown, it flies flat and comes down where it was
  // aimed, pulls its head in for `tuck` seconds and is a piece of the room for as long as it sits
  // there — which is the whole of it: the ally you move by throwing is also the cover you throw.
  updateTortoise(p, dt, game) {
    const C = TUNING.prop.tortoise;
    p.tuckT = Math.max(0, (p.tuckT || 0) - dt);
    if (p.coolT > 0) { p.coolT = Math.max(0, p.coolT - dt); return; }   // on its back: nothing
    if (p.flying) {
      const drag = Math.exp(-C.drag * dt);
      p.vx *= drag; p.vy *= drag;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const spd = Math.hypot(p.vx, p.vy) || 1;
      const impact = game.world.collideCircle(p);
      // A shell is not a crate: nothing it hits breaks, and it does not break either. It stops.
      if (impact > 2 || p.hitProp(game, p.vx / spd, p.vy / spd) || spd < 90) Beast.land(p, game);
      else if (game.world.isPitPx(p.x, p.y)) { p.broken = true; p.dead = true; game.audio.sfxFall && game.audio.sfxFall(); }
      else {
        // And a man is not a wall: a shell in the face floors him for `crate.stun` exactly the way a
        // crate does — the one difference being that the shell is still there afterwards.
        for (const e of game.enemies) {
          if (e.dead || e.held || e.ghosted || Math.hypot(e.x - p.x, e.y - p.y) > e.r + p.r) continue;
          if (e.kind === 'butcher') { e.state = 'stagger'; e.timer = 0.45; }
          else {
            const stun = TUNING.prop.crate.stun;
            e.state = 'floored'; e.timer = stun; e.dazed = Math.max(e.dazed, stun);
            e.vx = p.vx * 0.3; e.vy = p.vy * 0.3; e.aware = true;
            game.floatText(e.x, e.y - 28, 'STUNNED', PALETTE.fireHi);
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
    const C = TUNING.prop.tortoise, l = Math.hypot(ax, ay) || 1;
    p.flying = true; p.vx = (ax / l) * C.throwSpeed; p.vy = (ay / l) * C.throwSpeed;
    game.world.emitNoise(p.x, p.y, TUNING.noise.smash * 0.4);
    game.audio.sfxThud(); game.particles(p.x, p.y, 5, PALETTE.ash, 120);
  },
  // The shell's one block. A round, a blow aimed at it, or a blow at the goat it stands in front of
  // (`guards`, from `game.meleeHit`) — it takes the one and goes over on its back for `cool`
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
      if (Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y) < p.r + R) return p;
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
    // It runs on at the way out, into whatever is in the rooms, and it stops where it cannot go
    // further — a shut door (`collideEntities` holds it like a body), a gate, the stairs — or where
    // it has got `lead` tiles of the way ahead of him. It used to not wait at all: it raised a room
    // he had not reached yet and then stood at that room's shut door while the room came for him.
    const on = Beast.onward(p, game);
    if (on && Beast.ahead(p, game) < C.lead) Beast.step(p, game, on.x, on.y, C.speed, dt);
    else { p.vx = 0; p.vy = 0; }
    if (p.honkT > 0) return;
    // Anybody it can see. It is not a man and the cult never goes for it, so what a honk buys is
    // purely the two things it does to them: the room learns where the GOAT is, and whoever was
    // mid-swing loses the swing. That second half is the only parry in the game with no range on it.
    for (const e of game.liveEnemies) {
      if (e.dead || e.held || e.ghosted) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) > C.seeR * TILE) continue;
      if (!game.sees(p.x, p.y, e.x, e.y)) continue;
      Beast.honk(p, game, e);
      return;
    }
  },
  honk(p, game, at) {
    const C = TUNING.prop.goose, g = game.goat;
    p.honkT = C.honkGap; p.wobble = 0.3;
    game.audio.sfxBleat && game.audio.sfxBleat(520, 0.1, 0.3);
    game.particles(p.x, p.y - 8, 5, PALETTE.bone, 120);
    game.ring(p.x, p.y, C.seeR * TILE * 0.5, 'rgba(239,230,208,0.35)');
    // The alarm: the noise goes out from the GOOSE, which is what turns heads, and every man who
    // heard it is looking for the goat rather than for the bird.
    game.world.emitNoise(p.x, p.y, C.seeR);
    for (const e of game.liveEnemies) {
      if (e.dead || e.held || e.ghosted) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) > C.seeR * TILE) continue;
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

  // Which way the level goes from here: down a distance field grown out of the stairs over every
  // tile a body can stand on, built once a level (`world.tiles` only ever changes behind him — the
  // clamps — or by opening things up). It used to be a straight line at the next room's mouth, which
  // is fine inside a room and walks nose-first into the wall of every S-bent corridor between them.
  onward(p, game) {
    const w = game.world, L = game.level; if (!L || !L.exitTile) return null;
    if (!game.exitField || game.exitField.level !== L) {
      const d = new Int32Array(w.W * w.H).fill(-1), q = [];
      const e = L.exitTile.y0 * w.W + L.exitTile.x0;
      d[e] = 0; q.push(e);
      for (let h = 0; h < q.length; h++) {
        const i = q[h], x = i % w.W, y = (i / w.W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w.W || ny >= w.H) continue;
          const n = ny * w.W + nx;
          if (d[n] >= 0 || !w.walkable(n)) continue;
          d[n] = d[i] + 1; q.push(n);
        }
      }
      game.exitField = { level: L, d };
    }
    const d = game.exitField.d, tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    const here = d[ty * w.W + tx];
    if (here <= 0) return null;
    let best = here, bx = 0, by = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      if (dx && dy && (!w.walkableAt(tx + dx, ty) || !w.walkableAt(tx, ty + dy))) continue;
      const v = d[(ty + dy) * w.W + tx + dx];
      if (v >= 0 && v < best) { best = v; bx = dx; by = dy; }
    }
    if (best === here) return null;
    const vx = (tx + bx + 0.5) * TILE - p.x, vy = (ty + by + 0.5) * TILE - p.y, l = Math.hypot(vx, vy) || 1;
    return { x: vx / l, y: vy / l };
  },

  // How many tiles nearer the stairs it is than the goat, down the same field. Off the field on
  // either side reads as not ahead at all, so a goose never freezes over a question it cannot answer.
  ahead(p, game) {
    Beast.onward(p, game);
    const f = game.exitField, w = game.world, g = game.goat; if (!f) return 0;
    const at = (x, y) => f.d[Math.floor(y / TILE) * w.W + Math.floor(x / TILE)];
    const mine = at(p.x, p.y), his = at(g.x, g.y);
    return mine >= 0 && his >= 0 ? his - mine : 0;
  },

  // ---------------- the crow ----------------
  // It follows the dead. `game.crowMarks` is where bodies went down and how long ago; with one in
  // reach it goes to it and settles, and with nothing dead anywhere near it drifts after the goat at
  // `slack` of his pace, which is to say it falls behind. That is the rule it dictates, and it is
  // the one escort that asks you to stop and fight for it.
  updateCrow(p, dt, game) {
    const C = TUNING.prop.crow;
    p.hopT = Math.max(0, (p.hopT || 0) - dt);
    const mark = Beast.nearestMark(game, p);
    if (mark) {
      const dx = mark.x - p.x, dy = mark.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d < C.perch * TILE) {
        p.vx = 0; p.vy = 0; p.feeding = true;
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
    if (to.d < C.followAt * TILE) { p.vx = 0; p.vy = 0; return; }
    Beast.step(p, game, to.x, to.y, C.speed * C.slack, dt);
  },
  // The body it goes for: one it has sight of, inside `markR` tiles, that has not aged out after
  // `markFor` seconds — and of those, the one nearest the stairs (`onward`'s field), so a crow in a
  // cleared room is drawn on toward the next one rather than back through the last. A body it has
  // already settled on stays its choice while it sits there.
  nearestMark(game, p) {
    const C = TUNING.prop.crow, list = game.crowMarks;
    if (!list || !list.length) return null;
    Beast.onward(p, game);
    const f = game.exitField, w = game.world;
    let best = null, bs = Infinity;
    for (const m of list) {
      if (game.timer - m.t > C.markFor) continue;
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (d > C.markR * TILE) continue;
      if (d > C.perch * TILE && !w.los(p.x, p.y, m.x, m.y)) continue;
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
    const g = game.goat, out = [];
    for (const p of game.props) {
      if (p.broken || !Beast.is(p.kind)) continue;
      const C = TUNING.prop[p.kind];
      if (p.held || Math.hypot(p.x - g.x, p.y - g.y) <= C.saveR * TILE) out.push(p.kind);
    }
    return out;
  },
  // What the run carries away. `game.beasts` is a count per kind, so two tortoises over a run are
  // two uses on every shield — the same way the hen's hearts stack.
  bank(game, kinds) {
    if (!kinds.length) return;
    game.beasts = game.beasts || {};
    for (const k of kinds) game.beasts[k] = (game.beasts[k] || 0) + 1;
  },
  // Into `game.mods`, from `applyBoons`, exactly the way a boon or a talisman goes in.
  applyRewards(game, m) {
    const b = game.beasts || {};
    if (b.tortoise) m.shieldUses = (m.shieldUses || 0) + TUNING.prop.tortoise.saveShield * b.tortoise;
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
    const pick = stock[0] || { id: ARTIFACTS[0].id };
    const ware = new Prop(spot.x, spot.y, 'ware', {
      shopId: -1 - ((Math.random() * 1e6) | 0), ware: { id: pick.id, tier: C.giftTier },
    });
    const bird = new Prop(spot.x, spot.y - TILE * 0.9, 'crow');
    // `gift` is set here rather than passed in: `Prop`'s constructor copies the opts it knows about and
    // nothing else. It keeps the bird off `Beast.met` — this one has already been introduced.
    ware.gift = true; bird.gift = true;
    game.props.push(ware, bird);
    game.floatText(spot.x, spot.y - 46, 'THE CROW LEFT IT', PALETTE.fireHi);
  },

  // ---------------- the first one of a run ----------------
  // One line, once, the way the hen and the hound get one: an animal walking after you explains
  // nothing on its own, and an escort nobody understands is left standing in the room it was in.
  met(game, p) {
    game.beastTold = game.beastTold || {};
    if (game.beastTold[p.kind]) return;
    game.beastTold[p.kind] = true;
    // In the animal's own voice, and it says the rule it keeps rather than what it is: how it will
    // (or will not) come along is the one thing a player cannot guess by watching it for a second.
    Beast.speak(game, p, Beast.PACT[p.kind]);
  },
  // What each of them says the first time a run meets one: its sound, then its terms.
  PACT: {
    chicken: ['CLUCK-CLUCK!', "I'LL FOLLOW YOU. BUTT ME AT A MAN"],
    tortoise: ['...?', 'THROW ME TO THE EXIT'],
    crow: ['CAW.', 'I FOLLOW THE ROAD OF BODIES'],
    goose: ['HONK-HONK!', "I'LL TELL THEM ALL", "WE'RE HERE TO KICK THEIR ASS!!!"],
  },
  // Its sound, then its terms, over its head and held longer than a float, so the sentence is read
  // and not glimpsed. The sound is bone; the terms are the hen's gold, the colour every escort talks in.
  speak(game, p, lines) {
    if (!lines) return;
    const life = TUNING.beast.pactFor, lift = (life - 1.2) * 24;   // a float rises 24px a second from `y`
    game.audio.sfxAnimal && game.audio.sfxAnimal(p.kind);
    const top = p.y - 40 - (lines.length - 1) * 18 - lift;
    lines.forEach((text, k) => game.floats.push({ x: p.x, y: top + k * 18, text, color: k ? PALETTE.hen : PALETTE.bone, life, pact: true }));
  },
};
