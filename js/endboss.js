// THE FLOOR'S LAST MAN (8 Oct 2026, the user's: "at the end of every level a corrupted man, the one that level is
// about"). The last ring of each of the first five floors is that floor's own kind with the soul in him (`LEVELS[].arenas`):
// THE ALTAR a clubman, THE YARD a mage, THE CAVE the ogre, THE ROAD the butcher among men and mages, THE THRESHING
// FLOOR a rifleman. `TUNING.endBoss` holds the numbers. Which meeting it is counts per browser (`ENDBOSS_KEY`, one
// more each time the goat walks into that room), so a run that dies and comes back finds him a step worse:
//   THE ALTAR, third meeting on: the way out strains and bursts, and his twin walks in (`twin`).
//   THE YARD: met by a brazier with another mage while the opening's mage runs out through the gate with her; from
//     the second, every bowl in the room turns to witchfire (`p.witch`); from the third his rune goes off in rings.
//   THE CAVE: the ogre found gnawing a bone; seen, he throws it, roars and leaps. From the second his landing throws
//     witchfire rings, from the third his slam sends a band (js/waves.js reads `e.soulMeet`).
//   THE THRESHING FLOOR: the rifleman's three rounds a shot, and from the second he blinks away from the goat.
// The scenes hold the floor as the gate's mage does (`game.endScene`: nothing else steps, the clock included).
//   THE OSSUARY (10 Oct 2026, the user's; its shape of 12 Oct 2026): THE LAST SUPPER. The last room is the supper hall
//     (`SUPPER_TEMPLATE`): the room's men sat along one long table, THE WARDEN (js/warden-pixels.js, the man who took the ewe) seated
//     at its head with the covered platter on his own table, a chair at its foot. The goat in: a short held scene (`stepSupper`,
//     `game.endScene` kind 'supper'): the way in is stoned behind him, the camera goes over to the Warden, he stands and the chair
//     slides out under his raised hand, his words come in the animals' box (`Beast.talk`), and the camera comes back. Then the
//     offer (`game.supper`, `supperStep` in the play step): the score hushed, the goat free but only walking (`supper.slow`), a tuft
//     of grass at the chair. The grass `grassAt` grazed (the chair is a wraith and springs), BAAH, or a blow on anybody at the table:
//     he laughs, every man is up, and a dome goes up over him and his table (`S.dome`, `barrierPush`) with the platter under it,
//     nothing passes it while they fight; the last of them down, he throws the platter down at his feet, empty, the dome drops and
//     the fight with him is on (js/warden.js: seven hearts, the board, the sword, the tumble, the gun; then THE FLAYED, the soul
//     swallowed). The stone behind comes down when he has fallen (`unseal`). The soul that lifts the way out is his, not the table's mage's.
const ENDBOSS_KEY = 'goatout.endboss';
// What a floor's last man is called on the LEVELS page (`drawLevelPick`).
const END_BOSS_NAMES = { bearer: 'CLUBMAN', seer: 'MAGE', butcher: 'OGRE', champion: 'BUTCHER', hunter: 'RIFLEMAN',
  dog: 'HOUND', shield: 'SHIELDMAN', thrower: 'THROWER', shaman: 'SHAMAN', wraith: 'WRAITH', sawbot: 'SAWBOT', welder: 'WELDER', automaton: 'THE AUTOMATON' };

const EndBoss = {
  data: null,
  load() {
    if (this.data) return this.data;
    try { this.data = JSON.parse(localStorage.getItem(ENDBOSS_KEY)) || {}; } catch (e) { this.data = {}; }
    this.data.met = this.data.met || {}; this.data.seen = this.data.seen || {};
    return this.data;
  },
  save() { try { localStorage.setItem(ENDBOSS_KEY, JSON.stringify(this.data)); } catch (e) { /* it lasts the tab */ } },
  // The kind of a floor's last ring, for the LEVELS page and the rule: its last arena's boss.
  kindOf(def) { const a = def && def.arenas && def.arenas[def.arenas.length - 1]; return a ? a.boss : null; },
  nameOf(def) { const k = this.kindOf(def); return k ? END_BOSS_NAMES[k] || k.toUpperCase() : null; },
  // The meeting the coming one will be: the dev drawer's END BOSS row, or this browser's count plus one.
  meetFor(game, li) { const f = game.dev && game.dev.endMeet; return f > 0 ? f : (this.load().met[li] | 0) + 1; },

  // `startLevel`, once the souls are in: find the floor's last man and set him up for his meeting.
  lay(game) {
    game.endBoss = null; game.endScene = null; game.supper = null; game.doom = false; game.glimpse = null;
    const L = game.level, def = L && L.def;
    if (!def || game.showroomOn || def.heaven || def.shroom || def.trip !== undefined || def.dark) return;
    const li = levelIndexOf(def);
    if (!(li >= 0) || (li > 3 && li !== LEVELS.length - 1)) return;   // the first four (THE FOUNDRY and THE ENGINE are the machines' since 16 Oct 2026)
    // The last ring's room: the floor's last room on all five since 8 Oct 2026.
    const arenas = def.arenas || [], ring = arenas[arenas.length - 1];
    if (!ring) return;
    if (li === LEVELS.length - 1) { if (ring.supper) this.laySupper(game, ring, li); return; }
    if (li === TUNING.endBoss.glimpse.floor) this.layGlimpse(game, li);
    const last = ring.at, room = L.rooms[last];
    if (!room) return;
    const e = game.enemies.find((o) => o.boss && o.soul && !o.dead && o.room === last);
    if (!e) return;
    // BANE (THE ROAD's last man since 16 Oct 2026) is a bearer with a flag, but none of the clubman's scenes are his
    const kind = e.thrower ? 'thrower' : e.champion ? 'champion' : e.kind, meet = this.meetFor(game, li), T = TUNING.endBoss;
    e.endBoss = li; e.soulMeet = meet;
    const B = game.endBoss = { e, li, kind, meet, room: last, seen: false, bones: null };
    if (kind === 'butcher') {
      e.endHold = 'gnaw';
      const n = T.ogre.bones, r0 = new RNG(((L.seed >>> 0) ^ 0xb0e5) >>> 0);
      B.bones = [];
      for (let k = 0; k < n; k++) {
        const a = r0.next() * Math.PI * 2, d = (0.7 + r0.next() * 1.3) * TILE;
        const x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d;
        if (game.world.tileAtPx(x, y) === T_FLOOR()) B.bones.push({ x, y, a: r0.next() * Math.PI, big: r0.next() < 0.3 });
      }
    } else if (kind === 'seer') {
      // By a bowl, the two of them, held there until the goat is in the room.
      const bowls = game.props.filter((p) => p.kind === 'brazier' && !p.broken && this.inRoom(room, p.x, p.y));
      const mate = game.enemies.find((o) => o !== e && !o.dead && o.kind === 'seer' && o.room === last);
      const bowl = bowls.sort((a, b) => hyp(a.x - e.x, a.y - e.y) - hyp(b.x - e.x, b.y - e.y))[0];
      if (bowl) {
        const at = (sx) => { for (const dy of [0, -1, 1]) { const x = bowl.x + sx * TILE * 1.1, y = bowl.y + dy * TILE * 0.6;
          if (game.world.walkableAt(Math.floor(x / TILE), Math.floor(y / TILE))) return { x, y }; } return null; };
        const a = at(-1), b = at(1);
        if (a) { e.x = a.x; e.y = a.y; }
        if (mate && b) { mate.x = b.x; mate.y = b.y; }
        B.bowl = bowl;
      }
      for (const o of [e, mate]) if (o) { o.endHold = 'stand'; if (bowl) o.facing = Math.atan2(bowl.y - o.y, bowl.x - o.x); }
      B.mate = mate || null;
      if (meet >= T.mage.ringsFrom) e.endRings = T.mage.ring;
    } else if (kind === 'hunter') {
      this.rifleman(e, meet);
      // his hounds lie round his feet, all three facing out, until the goat is in the room
      const dogs = game.enemies.filter((o) => o !== e && !o.dead && o.kind === 'dog' && o.room === last), H = T.hunter.scene;
      dogs.forEach((o, k) => {
        const a = Math.PI / 2 + (k - (dogs.length - 1) / 2) * 1.1, x = e.x + Math.cos(a) * H.lie * TILE, y = e.y + Math.sin(a) * H.lie * TILE;
        if (game.world.walkableAt(Math.floor(x / TILE), Math.floor(y / TILE))) { o.x = x; o.y = y; }
        o.endHold = 'stand'; o.facing = a;
      });
      e.endHold = 'stand'; B.crew = dogs;
    } else if (kind === 'champion' || (kind === 'bearer' && meet < T.twin.from)) {
      // the butcher among his men (THE ROAD), THE ALTAR's clubman and his two before his twin comes: held until the goat is in
      B.crew = game.enemies.filter((o) => o !== e && !o.dead && !o.scripted && o.room === last && o.state !== 'hidden');
      for (const o of [e, ...B.crew]) o.endHold = 'stand';
    } else if (kind === 'bearer' && meet >= T.twin.from) B.twinDue = true;
  },
  // THE THRESHING FLOOR's rifleman, and the dev drawer's corrupted one: his hearts, three rounds a shot, the blink.
  rifleman(e, meet) {
    const H = TUNING.endBoss.hunter;
    e.hp = e.maxHp = H.hp; e.shotgun = H;
    if (meet >= H.blinkFrom) { e.blinker = true; e.blinkCd = 0; e.blinkFx = 0; }
  },
  inRoom(room, x, y, pad = 0) {
    return x >= (room.x + pad) * TILE && x < (room.x + room.w - pad) * TILE && y >= (room.y + pad) * TILE && y < (room.y + room.h - pad) * TILE;
  },

  // The top of `Enemy.update`: a man held to his picture until the goat is in the room (`endHold`). Hurt, lit or
  // knocked about before then and he is simply up.
  hold(e, dt, game) {
    if (e.dead || e.held || e.hp < e.maxHp || e.burning > 0 || e.dazed > 0 || e.state === 'flung' || (e.thrown)) {
      e.endHold = null; e.aware = true;
      // one of the group knocked about before the goat is in: the whole group is up, not him alone beside statues
      const B = game.endBoss;
      if (B && !B.seen && B.kind !== 'supper' && (e === B.e || e === B.mate || (B.crew && B.crew.includes(e)))) this.release(game);
      return false;
    }
    e.vx = 0; e.vy = 0; e.flash = Math.max(0, (e.flash || 0) - dt);
    if (e.say) { e.say.life -= dt; if (e.say.life <= 0) e.say = null; }
    if (e.endHold === 'gnaw') { e.facing = Math.PI / 2; if (Math.random() < dt * 1.6) game.particles(e.x, e.y - 30, 2, PALETTE.bone, 50); }
    if (e.endHold === 'sit' && e.seat) { e.x = e.seat.x; e.y = e.seat.y; e.facing = e.seat.facing; e.aware = false; }
    return true;
  },

  // Every play step (`Game.update`): the goat in the last room starts the floor's scene, once.
  watch(game) {
    const B = game.endBoss, g = game.goat;
    if (!B || B.seen || g.dead) return false;
    const room = game.level.rooms[B.room];
    if (!room || !this.inRoom(room, g.x, g.y, 1)) return false;   // (a floor swapped under it: nothing to watch)
    B.seen = true;
    if (!(game.dev && game.dev.endMeet > 0) && !(game.dev && game.dev.god)) { const D = this.load(); D.met[B.li] = Math.max(D.met[B.li] | 0, B.meet); this.save(); }
    const e = B.e;
    let kind = null;
    if (B.kind === 'bearer' && B.twinDue && !e.dead) kind = 'twin';
    else if (B.kind === 'seer' && !e.dead && e.endHold) kind = 'mage';
    else if (B.kind === 'butcher' && !e.dead && e.endHold === 'gnaw') kind = 'ogre';
    else if (B.kind === 'hunter' && !e.dead && e.endHold) kind = 'rifle';
    else if (B.kind === 'champion' && !e.dead && e.endHold) kind = 'butcher';
    else if (B.kind === 'bearer' && !e.dead && e.endHold) kind = 'clubman';
    if (B.kind === 'supper') {
      // THE LAST SUPPER's scene (`startSupper`, `stepSupper`): the way in sealed, the camera over to him, his words in the box.
      g.state = 'idle'; g.timer = 0; g.vx = 0; g.vy = 0; g.leap = null; g.runT = 0; g.buttBuf = 0; g.rollBuf = 0; g.path = null;
      this.startSupper(game); return !!game.endScene;
    }
    if (!kind) { this.release(game); return false; }
    // He stops where he is; whatever he was doing ends.
    g.state = 'idle'; g.timer = 0; g.vx = 0; g.vy = 0; g.leap = null; g.runT = 0; g.buttBuf = 0; g.rollBuf = 0; g.path = null;
    game.endScene = { kind, t: 0, bars: 0, flags: {}, seen: !!this.load().seen[kind] };
    for (const o of [e, B.mate, ...(B.crew || [])]) if (o) o.endActor = true;
    if (kind === 'twin') this.startTwin(game);
    else if (kind === 'mage') this.startMage(game);
    else if (kind === 'ogre') this.startOgre(game);
    return true;
  },
  release(game) {
    const B = game.endBoss; if (!B) return;
    for (const o of [B.e, B.mate, ...(B.crew || [])]) if (o && !o.dead) {
      o.endHold = null; o.endActor = false; o.aware = true; o.woke = true; o.lastSeen = { x: game.goat.x, y: game.goat.y }; if (o.state === 'idle') o.state = 'chase';
    }
  },
  end(game) {
    const S = game.endScene; if (!S) return;
    const D = this.load(); D.seen[S.kind] = true; this.save();
    if (S.kind === 'twin') this.endTwin(game);
    else if (S.kind === 'mage') this.endMage(game);
    else if (S.kind === 'ogre') this.endOgre(game);
    else if (S.kind === 'supper') this.endSupperScene(game);
    else if (S.kind === 'turn') Warden.endTurn(game, S);
    game.endScene = null;
    if (S.kind !== 'supper' && S.kind !== 'turn') this.release(game);   // the supper's men stay at the table: the offer is what wakes them
  },

  // The scene's step, in place of the floor's.
  update(game, dt) {
    const S = game.endScene, C = TUNING.endBoss.scene;
    // The Warden's words in the animals' box (THE LAST SUPPER): the page is turned before the scene goes on.
    if (game.beastTalk) { Beast.updateTalk(game, dt); return; }
    S.t += dt;
    const skip = S.seen && S.t > C.skipAfter && (game.input.lmbPressed || game.input.spacePressed);
    if (skip || S.t > (S.long ? TUNING.endBoss.ogre.long.cap : S.kind === 'supper' ? TUNING.endBoss.supper.scene.cap : S.kind === 'turn' ? TUNING.warden.turn.cap : C.cap)) { this.end(game); return; }
    S.bars = S.done ? Math.max(0, S.bars - dt * 4) : Math.min(1, S.bars + dt * 3);
    const look = S.kind === 'twin' ? this.stepTwin(game, dt) : S.kind === 'mage' ? this.stepMage(game, dt)
      : S.kind === 'rifle' ? this.stepRifle(game, dt) : S.kind === 'butcher' || S.kind === 'clubman' ? this.stepRally(game, dt)
      : S.kind === 'supper' ? this.stepSupper(game, dt) : S.kind === 'turn' ? Warden.stepTurn(game, dt) : this.stepOgre(game, dt);
    if (!game.endScene) return;
    // lines age, and a flash wears off: nobody's own update runs through a scene, so a man flashed on a beat stayed white to its end
    for (const o of game.enemies) { if (o.say) { o.say.life -= dt; if (o.say.life <= 0) o.say = null; } if (o.flash > 0) o.flash = Math.max(0, o.flash - dt); }
    game.revealRooms(); game.updateEffects(dt);
    const g = game.goat, o = look || game.endBoss.e, K = TUNING.camera, k = 1 - Math.exp(-K.lerp * dt);
    // `camAt`: the picture goes whole to one of them (the supper's Warden, then the goat), not between the two
    const cx = S.camAt ? S.camAt.x : (g.x + o.x) / 2, cy = S.camAt ? S.camAt.y : (g.y + o.y) / 2;
    game.cam.x += (cx - game.cam.x) * k; game.cam.y += (cy - game.cam.y) * k;
    game.cam.zoom += (game.renderer.zoomFit * (S.kind === 'supper' ? TUNING.endBoss.supper.scene.zoom : S.kind === 'turn' ? TUNING.warden.turn.zoom : C.zoom) - game.cam.zoom) * (1 - Math.exp(-K.zoomLerp * dt));
    g.facing = Math.atan2(o.y - g.y, o.x - g.x);
  },

  // The exit gate of the last room, and which way is out through it.
  exitDoor(game) {
    const B = game.endBoss, room = game.level.rooms[B.room];
    const d = game.props.filter((p) => p.kind === 'door' && p.exitGate && !p.broken).sort((a, b) => hyp(a.x - B.e.x, a.y - B.e.y) - hyp(b.x - B.e.x, b.y - B.e.y))[0];
    if (!d) return null;
    const cx = (room.x + room.w / 2) * TILE, cy = (room.y + room.h / 2) * TILE;
    const ox = (d.x - cx) / (room.w * TILE), oy = (d.y - cy) / (room.h * TILE);
    const out = Math.abs(ox) > Math.abs(oy) ? { x: Math.sign(ox), y: 0 } : { x: 0, y: Math.sign(oy) };
    return { door: d, out };
  },

  // ---- THE ALTAR: the twin through the way out ----
  startTwin(game) {
    const S = game.endScene, x = this.exitDoor(game);
    if (!x) { S.t = 99; return; }
    S.door = x.door; S.out = x.out;
    game.say(game.endBoss.e, 'BROTHER!');
  },
  stepTwin(game, dt) {
    const S = game.endScene, T = TUNING.endBoss.twin, d = S.door, g = game.goat;
    if (!d) { this.end(game); return null; }
    T.rattles.forEach((at, k) => {
      if (S.flags['r' + k] || S.t < at) return;
      S.flags['r' + k] = true;
      d.wobble = 0.35; game.audio.sfxThud(); game.thud(d.x, d.y, 3 + k * 2);
      game.particles(d.x, d.y, 5 + k * 2, PALETTE.ash, 110);
      game.floatText(d.x, d.y - 26, k < T.rattles.length - 1 ? 'THUD' : 'CRACK', PALETTE.bone);
    });
    if (!S.flags.burst && S.t >= T.burst) {
      S.flags.burst = true; d.open = 1;
      game.audio.sfxThud(); game.audio.sfxSteel(); game.thud(d.x, d.y, 9); game.particles(d.x, d.y, 18, PALETTE.ash, 200);
      const ox = d.x + S.out.x * TILE * 1.3, oy = d.y + S.out.y * TILE * 1.3;
      const m = new Enemy(ox, oy, 'bearer');
      m.boss = true; m.elite = true; m.room = game.endBoss.room; m.endTwin = true;
      game.ensoul(m); m.hp = m.maxHp = T.hp;
      m.path = [{ x: d.x, y: d.y }, { x: d.x - S.out.x * TILE * 2, y: d.y - S.out.y * TILE * 2 }];
      m.facing = Math.atan2(-S.out.y, -S.out.x);
      m.endActor = true; game.enemies.push(m); S.twin = m;
      game.say(m, 'NOBODY LEAVES.');
    }
    if (S.twin && !S.flags.in) {
      const arrived = game.followPath(S.twin, TUNING.intro.walk, dt);
      if (arrived || S.t > T.burst + T.walk * 2) { S.flags.in = true; S.inAt = S.t; S.twin.path = null; S.twin.facing = Math.atan2(g.y - S.twin.y, g.x - S.twin.x); }
    }
    if (S.flags.in && !S.flags.shut && S.t >= S.inAt + T.shut) {
      S.flags.shut = true; d.open = 0; game.audio.sfxThud(); game.audio.sfxSteel(); game.thud(d.x, d.y, 6);
    }
    if (S.flags.shut && S.t >= S.inAt + T.shut + 0.6) { this.end(game); return null; }
    return S.twin && S.flags.burst ? S.twin : d;
  },
  endTwin(game) {
    const S = game.endScene;
    if (S.door) S.door.open = 0;
    // Skipped while he was still in the doorway: he is set down where his walk ended, inside, before the bars come down.
    if (S.twin && !S.flags.in && S.out) { S.twin.x = S.door.x - S.out.x * TILE * 2; S.twin.y = S.door.y - S.out.y * TILE * 2; }
    if (S.twin) { S.twin.path = null; S.twin.aware = true; S.twin.woke = true; S.twin.state = 'chase'; }
    else if (game.endBoss && game.endBoss.twinDue && S.door) {
      // skipped before the door gave: he is in the room all the same
      const m = new Enemy(S.door.x - S.out.x * TILE * 2, S.door.y - S.out.y * TILE * 2, 'bearer');
      m.boss = true; m.elite = true; m.room = game.endBoss.room; m.endTwin = true; game.ensoul(m); m.hp = m.maxHp = TUNING.endBoss.twin.hp;
      m.aware = true; m.woke = true; m.state = 'chase'; game.enemies.push(m);
    }
    if (game.endBoss) game.endBoss.twinDue = false;
  },

  // ---- THE YARD: the mage by the bowl, and her carried out through the gate ----
  startMage(game) {
    const S = game.endScene, B = game.endBoss, e = B.e, w = game.world, x = this.exitDoor(game);
    if (!x) { S.t = 99; return; }
    S.door = x.door; S.out = x.out;
    // The opening's mage, a step off his master toward the way out, with her under his arm.
    const dir = Math.sign(S.door.x - e.x) || 1;
    const spot = [[dir, 0], [dir, -0.6], [dir, 0.6], [0, 1], [0, -1]].map(([sx, sy]) => ({ x: e.x + sx * TILE * 1.2, y: e.y + sy * TILE }))
      .find((p) => w.walkableAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE))) || { x: e.x, y: e.y + TILE };
    const m = new Enemy(spot.x, spot.y, 'seer'); m.scripted = true; m.aware = true; m.hp = m.maxHp = 1; m.endActor = true;
    m.facing = Math.atan2(game.goat.y - m.y, game.goat.x - m.x);
    game.enemies.push(m);
    const s = { x: m.x, y: m.y, facing: 0, kick: 0, bleating: 0, jitter: null, vx: 0, vy: 0, gone: false };
    game.underArm(s, m, 0);
    S.mage = m; S.ewe = s; S.carrier = m; S.phase = 'see'; S.pt = 0; S.bleat = 0.3;
    game.floatText(s.x, s.y - 30, 'BEEH!', PALETTE.bone); game.audio.sfxBleat(540, 0.14, 0.26); s.bleating = 0.35;
    // THE WARDEN waits a step inside the way out for her (10 Oct 2026): the man she is handed to, who walks out with her.
    const wx = S.door.x - S.out.x * TILE * 1.6, wy = S.door.y - S.out.y * TILE * 1.6;
    const wd = new Enemy(w.walkableAt(Math.floor(wx / TILE), Math.floor(wy / TILE)) ? wx : S.door.x - S.out.x * TILE, wy, 'bearer');
    wd.warden = true; wd.scripted = true; wd.endActor = true; wd.hp = wd.maxHp = 99; wd.barrier = true; wd.aware = false; wd.room = -1; wd.pose = 'idle';
    wd.facing = Math.atan2(-S.out.y, -S.out.x);
    game.enemies.push(wd); S.warden = wd;
  },
  stepMage(game, dt) {
    const S = game.endScene, T = TUNING.endBoss.mage, B = game.endBoss, e = B.e, m = S.mage, s = S.ewe, d = S.door, g = game.goat;
    if (!m) { this.end(game); return null; }
    S.pt += dt;
    const wd = S.warden, carrier = S.carrier || m;
    if (!s.gone) { game.underArm(s, carrier, S.t); s.bleating = Math.max(0, s.bleating - dt); }
    if (wd && wd.say) { wd.say.life -= dt; if (wd.say.life <= 0) wd.say = null; }
    const phase = (p) => { S.phase = p; S.pt = 0; };
    if (S.phase === 'see') {
      if (!S.flags.turn && S.pt > T.see * 0.3) { S.flags.turn = true; for (const o of [e, B.mate]) if (o) o.facing = Math.atan2(g.y - o.y, g.x - o.x); game.say(e, 'TAKE HER. GO.'); }
      if (!S.flags.baah && S.pt > T.see * 0.6) { S.flags.baah = true; game.floatText(g.x, g.y - 30, 'BAAH!', PALETTE.bone); game.audio.sfxBleat(300, 0.16, 0.3); }
      if (S.pt >= T.see) {
        phase('run');
        // to the Warden, a step short of him (no Warden laid: straight out through the gate, as before)
        m.path = wd ? [{ x: wd.x - S.out.x * TILE * 1.4, y: wd.y - S.out.y * TILE * 1.4 }] : [{ x: d.x - S.out.x * TILE, y: d.y - S.out.y * TILE }, { x: d.x, y: d.y }, { x: d.x + S.out.x * TILE * 2.2, y: d.y + S.out.y * TILE * 2.2 }];
      }
      return m;
    }
    const bleat = () => { S.bleat -= dt; if (S.bleat <= 0) { S.bleat = 0.45 + Math.random() * 0.25; s.bleating = 0.25; game.floatText(s.x, s.y - 28, 'BEEH!', PALETTE.bone); game.audio.sfxBleat(540, 0.12, 0.25); } };
    const shut = () => { s.gone = true; d.open = 0; game.audio.sfxThud(); game.audio.sfxSteel(); game.floatText(g.x, g.y - 30, 'BAAH!', PALETTE.bone); game.audio.sfxBleat(290, 0.18, 0.4); phase(B.meet >= T.witchFrom ? 'witch' : 'after'); };
    if (S.phase === 'run') {
      const done = game.followPath(m, T.run, dt), far = hyp(m.x - d.x, m.y - d.y);
      bleat();
      if (!wd && far < 1.4 * TILE) d.open = Math.min(1, d.open + dt * 4);
      if (done || S.pt > T.runCap) {
        if (!wd) { game.enemies = game.enemies.filter((o) => o !== m); shut(); return m; }
        // into the Warden's arm: he turns to the goat with her, and says so
        phase('hand'); S.carrier = wd; m.facing = Math.atan2(wd.y - m.y, wd.x - m.x);
        // he turns so that she, on his right side (`underArm`), is on the side away from the mage
        wd.facing = Math.atan2(m.y - wd.y, m.x - wd.x) + Math.PI / 2;
        game.say(wd, T.wardenLine); game.audio.sfxGrowl(); game.floatText(wd.x, wd.y - 60, 'HA HA HA!', PALETTE.blood);
        m.path = [{ x: m.x - S.out.x * TILE * 1.4 + S.out.y * TILE * 2.2, y: m.y - S.out.y * TILE * 1.4 - S.out.x * TILE * 2.2 }];   // the mage steps well aside, so she is seen under the Warden's arm
      }
      return m;
    }
    if (S.phase === 'hand') {
      game.followPath(m, T.run * 0.8, dt); bleat();
      if (S.pt >= T.hand) {
        phase('out'); wd.path = [{ x: d.x - S.out.x * TILE, y: d.y - S.out.y * TILE }, { x: d.x, y: d.y }, { x: d.x + S.out.x * TILE * 2.2, y: d.y + S.out.y * TILE * 2.2 }];
        // and the mage goes out at his heels (he was left standing in the room for good, a statue nobody could do anything with)
        m.path = wd.path.map((q) => ({ x: q.x, y: q.y }));
      }
      return wd;
    }
    if (S.phase === 'out') {
      const done = game.followPath(wd, T.run, dt), far = hyp(wd.x - d.x, wd.y - d.y);
      if (m.path) game.followPath(m, T.run, dt);
      bleat();
      if (far < 1.4 * TILE) d.open = Math.min(1, d.open + dt * 4);
      if (done || S.pt > T.runCap) { game.enemies = game.enemies.filter((o) => o !== wd && o !== m); S.warden = null; shut(); }
      return wd;
    }
    if (S.phase === 'witch') {
      // Every bowl in the room goes violet: his own fire, and the soul in him keeps him out of it.
      if (!S.flags.raise) { S.flags.raise = true; game.say(e, 'BURN, LITTLE GOAT.'); game.audio.sfxCast(); }
      if (!S.flags.lit && S.pt > T.witch * 0.5) {
        S.flags.lit = true;
        const room = game.level.rooms[B.room];
        for (const p of game.props) if (p.kind === 'brazier' && !p.broken && this.inRoom(room, p.x, p.y)) {
          p.witch = true; game.ring(p.x, p.y, TILE * 1.4, PALETTE.witchHi);
          game.particles(p.x, p.y - 10, 14, PALETTE.witch, 160);
        }
        game.flash(PALETTE.witch, 0.18); game.audio.sfxRune(); game.thud(e.x, e.y, 5);
      }
      if (!S.flags.lit && Math.random() < dt * 30) game.particles(e.x, e.y - 30, 1, PALETTE.witchHi, 60);
      if (S.pt >= T.witch) phase('after');
      return e;
    }
    if (S.phase === 'after' && S.pt > 0.5) { this.end(game); return null; }
    return e;
  },
  endMage(game) {
    const S = game.endScene, B = game.endBoss;
    if (S.warden) game.enemies = game.enemies.filter((o) => o !== S.warden);   // skipped: he is gone through the gate with her all the same
    if (S.mage) game.enemies = game.enemies.filter((o) => o !== S.mage);   // skipped: out through the gate with them
    if (S.ewe) S.ewe.gone = true;
    if (S.door) S.door.open = 0;
    // Skipped before the bowls turned: they turn all the same.
    if (B && B.meet >= TUNING.endBoss.mage.witchFrom) {
      const room = game.level.rooms[B.room];
      for (const p of game.props) if (p.kind === 'brazier' && !p.broken && this.inRoom(room, p.x, p.y)) p.witch = true;
    }
  },

  // ---- THE CAVE: the ogre at his meal ----
  // The first meeting is longer (9 Oct 2026 playtest: "the first time you see the ogre, the mage runs off with your ewe
  // again and gives the ogre his power; he finishes the carcass, roars, throws, and leaps at you; more time, more of a
  // film"): the opening's mage stands by him with her under his arm, pours the violet into him, runs out through the way
  // out; the ogre crunches the last of his meal, rises, roars, throws the bone, and leaps (`long`, phases in `S.phase`).
  startOgre(game) {
    const S = game.endScene, B = game.endBoss, e = B.e, w = game.world, L = TUNING.endBoss.ogre.long;
    S.bone = null;
    if (!(B.meet <= 1 && L)) return;
    const x = this.exitDoor(game);
    S.long = true; S.phase = x ? 'mage' : 'gnaw'; S.pt = 0;
    if (!x) return;
    S.door = x.door; S.out = x.out;
    // the mage a step off the ogre toward the way out, her under his arm, the old way (`underArm`)
    const dir = Math.sign(S.door.x - e.x) || 1;
    const spot = [[dir, 0], [dir, -0.8], [dir, 0.8], [0, 1.2], [0, -1.2]].map(([sx, sy]) => ({ x: e.x + sx * TILE * 1.6, y: e.y + sy * TILE }))
      .find((p) => w.walkableAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE))) || { x: e.x, y: e.y + TILE };
    const m = new Enemy(spot.x, spot.y, 'seer'); m.scripted = true; m.aware = true; m.hp = m.maxHp = 1; m.endActor = true;
    m.facing = Math.atan2(e.y - m.y, e.x - m.x);
    game.enemies.push(m);
    // Without her since 10 Oct 2026: THE WARDEN took her off him at the end of THE YARD.
    S.mage = m; S.ewe = null; S.bleat = 0.5;
  },
  stepOgre(game, dt) {
    const S = game.endScene;
    if (S.long) return this.stepOgreLong(game, dt);
    const T = TUNING.endBoss.ogre, e = game.endBoss.e, g = game.goat;
    if (!S.flags.throw && S.t >= T.throwAt) {
      S.flags.throw = true; e.endHold = 'up';
      e.facing = Math.atan2(g.y - e.y, g.x - e.x);
      const dx = g.x - e.x, dy = g.y - e.y, d = hyp(dx, dy) || 1, sp = T.boneSpeed;
      S.bone = { x: e.x, y: e.y - 26, vx: dx / d * sp, vy: dy / d * sp - 120, z: 0, spin: 0, life: Math.min(1.2, d / sp + 0.1), tx: g.x, ty: g.y };
      game.audio.sfxThud();
    }
    if (S.bone && S.bone.life > 0) {
      const b = S.bone; b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 360 * dt; b.spin += dt * 14;
      if (b.life <= 0) { game.particles(b.x, b.y, 4, PALETTE.bone, 90); game.audio.sfxThud(); if (game.endBoss.bones) game.endBoss.bones.push({ x: b.x, y: b.y + 10, a: b.spin, big: true }); }
    }
    if (!S.flags.roar && S.t >= T.roarAt) {
      S.flags.roar = true;
      game.floatText(e.x, e.y - 58, 'RRRAAAGH!', PALETTE.blood);
      game.audio.sfxGroan && game.audio.sfxGroan('butcher'); game.audio.sfxGrowl(); game.thud(e.x, e.y, 10);
      game.particles(e.x, e.y - 30, 10, PALETTE.blood, 140);
    }
    if (S.t >= T.end) { this.end(game); return null; }
    return e;
  },
  stepOgreLong(game, dt) {
    const S = game.endScene, L = TUNING.endBoss.ogre.long, T = TUNING.endBoss.ogre, e = game.endBoss.e, g = game.goat, m = S.mage, s = S.ewe, d = S.door;
    S.pt += dt;
    const phase = (p) => { S.phase = p; S.pt = 0; };
    if (s && !s.gone && m) { game.underArm(s, m, S.t); s.bleating = Math.max(0, s.bleating - dt); }
    // The bone in the air, whenever it was thrown.
    if (S.bone && S.bone.life > 0) {
      const b = S.bone; b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 360 * dt; b.spin += dt * 14;
      if (b.life <= 0) { game.particles(b.x, b.y, 4, PALETTE.bone, 90); game.audio.sfxThud(); if (game.endBoss.bones) game.endBoss.bones.push({ x: b.x, y: b.y + 10, a: b.spin, big: true }); }
    }
    if (S.phase === 'mage') {
      // He gives the ogre the violet: a stream of it off his staff into the beast at his meal.
      if (!S.flags.say && S.pt > 0.25) { S.flags.say = true; game.say(m, 'EAT, BROTHER. TAKE MY FIRE.'); game.audio.sfxCast(); }
      if (!S.flags.baah && S.pt > 0.6) { S.flags.baah = true; game.floatText(g.x, g.y - 30, 'BAAH!', PALETTE.bone); game.audio.sfxBleat(300, 0.16, 0.3); }
      if (S.pt > 0.35 && S.pt < L.mage - 0.2) {
        for (let k = 0; k < 3; k++) { const q = Math.random(); game.particles(lerp(m.x, e.x, q), lerp(m.y - 34, e.y - 30, q) - Math.sin(q * Math.PI) * 18, 1, Math.random() < 0.5 ? PALETTE.witchHi : PALETTE.witch, 40); }
      }
      if (!S.flags.given && S.pt >= L.mage - 0.2) {
        S.flags.given = true; e.flash = 0.45;
        game.ring(e.x, e.y, TILE * 1.6, PALETTE.witchHi); game.particles(e.x, e.y - 30, 22, PALETTE.witch, 180);
        game.flash(PALETTE.witch, 0.16); game.audio.sfxRune(); game.thud(e.x, e.y, 5);
      }
      if (S.pt >= L.mage) {
        phase('run');
        m.path = [{ x: d.x - S.out.x * TILE, y: d.y - S.out.y * TILE }, { x: d.x, y: d.y }, { x: d.x + S.out.x * TILE * 2.2, y: d.y + S.out.y * TILE * 2.2 }];
      }
      return S.flags.given ? e : m;
    }
    if (S.phase === 'run') {
      const done = game.followPath(m, TUNING.endBoss.mage.run, dt), far = hyp(m.x - d.x, m.y - d.y);
      if (far < 1.4 * TILE) d.open = Math.min(1, d.open + dt * 4);
      if (done || S.pt > L.run) {
        game.enemies = game.enemies.filter((o) => o !== m); if (s) s.gone = true;
        d.open = 0; game.audio.sfxThud(); game.audio.sfxSteel();
        game.floatText(g.x, g.y - 30, 'BAAH!', PALETTE.bone); game.audio.sfxBleat(290, 0.18, 0.4);
        phase('gnaw');
      }
      return m;
    }
    if (S.phase === 'gnaw') {
      // the last of the carcass, crunched down in three bites
      const bites = 3;
      for (let k = 0; k < bites; k++) if (!S.flags['bite' + k] && S.pt >= (k + 0.5) * L.gnaw / (bites + 0.5)) {
        S.flags['bite' + k] = true; e.flash = 0.12;
        game.particles(e.x, e.y - 28, 6, PALETTE.blood, 110); game.particles(e.x, e.y - 30, 3, PALETTE.bone, 90);
        game.floatText(e.x + (k - 1) * 14, e.y - 50 - k * 6, 'CRUNCH', PALETTE.bone); game.audio.sfxThud();
      }
      if (S.pt >= L.gnaw) { phase('roar'); e.endHold = 'up'; e.facing = Math.atan2(g.y - e.y, g.x - e.x); }
      return e;
    }
    if (S.phase === 'roar') {
      if (!S.flags.roar && S.pt >= 0.15) {
        S.flags.roar = true;
        game.floatText(e.x, e.y - 58, 'RRRAAAGH!', PALETTE.blood);
        if (game.audio.sfxGroan) game.audio.sfxGroan('butcher');
        game.audio.sfxGrowl(); game.thud(e.x, e.y, 12);
        game.particles(e.x, e.y - 30, 14, PALETTE.blood, 160); game.ring(e.x, e.y, TILE * 2.2, PALETTE.witchHi);
        game.cam.zoom *= 1.04;
      }
      if (S.pt >= L.roar) {
        phase('throw');
        const dx = g.x - e.x, dy = g.y - e.y, dd = hyp(dx, dy) || 1, sp = T.boneSpeed;
        S.bone = { x: e.x, y: e.y - 26, vx: dx / dd * sp, vy: dy / dd * sp - 120, z: 0, spin: 0, life: Math.min(1.2, dd / sp + 0.1), tx: g.x, ty: g.y };
        game.audio.sfxThud();
      }
      return e;
    }
    if (S.phase === 'throw' && S.pt >= L.throw) { this.end(game); return null; }
    return e;
  },
  endOgre(game) {
    const B = game.endBoss, e = B && B.e, g = game.goat, S = game.endScene;
    // skipped while the mage was still in the room: he is gone all the same, and so is she
    if (S && S.mage) game.enemies = game.enemies.filter((o) => o !== S.mage);
    if (S && S.ewe) S.ewe.gone = true;
    if (S && S.door) S.door.open = 0;
    if (!e || e.dead) return;
    e.endHold = null; e.aware = true; e.woke = true;
    // And he comes down on the goat: the leap he would have taken himself, off the crouch.
    const L = e.cfg.leap, d = hyp(g.x - e.x, g.y - e.y), to = e.hopSpot ? e.hopSpot(game, g, d) : null;
    if (to && len(to.x - e.x, to.y - e.y) >= L.minHop * TILE) {
      e.hopFrom = { x: e.x, y: e.y }; e.hopTo = to; e.facing = Math.atan2(to.y - e.y, to.x - e.x);
      e.state = 'hopwind'; e.timer = L.wind * game.mods.enemySlow * TUNING.endBoss.ogre.leapWind; e.vx = 0; e.vy = 0;
    } else e.state = 'chase';
  },

  // ---- THE ROAD's butcher among his men, THE ALTAR's clubman before his twin ----
  // Seen, he brings his club down on the floor, a man of his turns to the goat with each blow, and he says his line.
  stepRally(game, dt) {
    const S = game.endScene, C = TUNING.endBoss[S.kind === 'clubman' ? 'clubman' : 'champion'], B = game.endBoss, e = B.e, g = game.goat, crew = B.crew || [];
    const at = (k, t) => !S.flags[k] && S.t >= t && (S.flags[k] = true);
    if (at('turn', 0.15)) e.facing = Math.atan2(g.y - e.y, g.x - e.x);
    C.slams.forEach((t, k) => {
      if (!at('slam' + k, t)) return;
      const fx = e.x + Math.cos(e.facing) * TILE * 0.8, fy = e.y + Math.sin(e.facing) * TILE * 0.8;
      e.flash = 0.15; game.audio.sfxClub(); game.audio.sfxThud(); game.thud(fx, fy, 5);
      game.particles(fx, fy, 10, PALETTE.ash, 140); game.ring(fx, fy, TILE * 0.9, PALETTE.fire, 0.4, 2);
      game.floatText(fx, fy - 20, 'THOOM', PALETTE.bone);
      const n = Math.ceil(crew.length * (k + 1) / C.slams.length);
      crew.slice(0, n).forEach((o, i) => {
        if (o.dead || S.flags['m' + i]) return;
        S.flags['m' + i] = true; o.facing = Math.atan2(g.y - o.y, g.x - o.x); game.floatText(o.x, o.y - 50, '!', PALETTE.fire);
      });
    });
    if (at('line', C.lineAt)) { game.say(e, C.line); game.audio.sfxGrowl(); }
    if (S.t >= C.end) { this.end(game); return null; }
    return e;
  },

  // ---- THE THRESHING FLOOR: the rifleman ----
  // His scene: the hounds get up round him one by one, he racks the gun and fires one into the air.
  stepRifle(game, dt) {
    const S = game.endScene, H = TUNING.endBoss.hunter.scene, B = game.endBoss, e = B.e, g = game.goat, dogs = B.crew || [];
    const at = (k, t) => !S.flags[k] && S.t >= t && (S.flags[k] = true);
    if (at('turn', 0.2)) { e.facing = Math.atan2(g.y - e.y, g.x - e.x); game.say(e, H.line); }
    dogs.forEach((o, k) => {
      if (o.dead || !at('dog' + k, H.rise[k % H.rise.length])) return;
      o.facing = Math.atan2(g.y - o.y, g.x - o.x); o.flash = 0.12;
      game.particles(o.x, o.y, 5, PALETTE.ash, 70); game.audio.sfxGrowl(); game.floatText(o.x, o.y - 30, 'GRRR', PALETTE.fire);
    });
    if (at('cock', H.cock)) { game.audio.sfxCock(); game.floatText(e.x, e.y - 56, 'CLICK-CLACK', PALETTE.bone); }
    if (at('shot', H.shot)) {
      // into the air: the muzzle over his head, smoke and a flash, and the pack answers
      const mx = e.x + Math.cos(e.facing) * 12, my = e.y - 44;
      game.audio.sfxGunshot(); game.flash(PALETTE.fireHi, 0.08);
      game.particles(mx, my, 10, PALETTE.ash, 120); game.particles(mx, my, 4, PALETTE.fireHi, 160);
      for (const o of dogs) if (!o.dead) game.audio.sfxBark(game.audio.heard(o.x - g.x, o.y - g.y));
    }
    if (S.t >= H.end) { this.end(game); return null; }
    return e;
  },
  // A shot of `pellets` rounds over `spread` (`updateHunter` asks this in place of one round).
  shotgun(e, game, spread0) {
    const H = e.shotgun, n = H.pellets;
    for (let k = 0; k < n; k++) {
      const a = e.facing + spread0 + (n > 1 ? (k / (n - 1) - 0.5) * H.spread * 2 : 0);
      game.fireBullet(e, Math.cos(a), Math.sin(a));
    }
  },
  // His blink: the mage's, off his own numbers. True if he went.
  hunterBlink(e, game, d, dt) {
    if (!e.blinker) return false;
    e.blinkCd = Math.max(0, (e.blinkCd || 0) - dt); e.blinkFx = Math.max(0, (e.blinkFx || 0) - dt);
    const H = TUNING.endBoss.hunter.blink;
    if (d >= H.range * TILE || e.blinkCd > 0 || game.goat.dead) return false;
    e.blink(game, { blinkDist: H.dist, blinkCooldown: H.cooldown });
    return true;
  },

  // ---- THE ROAD: a glimpse of him across the chasm ----
  // (10 Oct 2026, the user's: seen three times before he is fought.) In the chasm lesson's empty room THE WARDEN stands on
  // the far side of the drop with her under his arm; the goat in the room, he says his line, laughs, and walks out through
  // the room's way out, gone past it. Not a held scene (`game.glimpse`, `glimpseStep` in the play step); untouchable (`barrier`).
  layGlimpse(game, li) {
    game.glimpse = null;
    const L = game.level, c = (L.chasms || []).find((q) => q.lesson); if (!c) return;
    const room = L.rooms[c.room], w = game.world; if (!room || !room.exitMouth) return;
    const T = TUNING.endBoss.glimpse, mid = (c.lo + c.hi) / 2;
    const spots = [];
    for (let k = T.past; k <= T.past + 2; k += 0.5) for (const o of [0, -1, 1, -2, 2]) {
      const tx = c.axis === 'v' ? c.at + c.far * k : mid + o, ty = c.axis === 'v' ? mid + o : c.at + c.far * k;
      if (w.walkableAt(Math.floor(tx), Math.floor(ty))) spots.push({ x: (Math.floor(tx) + 0.5) * TILE, y: (Math.floor(ty) + 0.5) * TILE });
    }
    if (!spots.length) return;
    const at = spots[0];
    const e = new Enemy(at.x, at.y, 'bearer'); e.warden = true; e.scripted = true; e.barrier = true; e.aware = false; e.room = -1; e.pose = 'idle'; e.hp = e.maxHp = 99;
    e.facing = c.axis === 'v' ? (c.far > 0 ? Math.PI : 0) : (c.far > 0 ? -Math.PI / 2 : Math.PI / 2);
    game.enemies.push(e);
    const s = { x: e.x, y: e.y, facing: 0, kick: 0, bleating: 0, jitter: null, vx: 0, vy: 0, gone: false };
    game.underArm(s, e, 0);
    game.glimpse = { room: c.room, e, ewe: s, seen: false, t: 0, bleat: 0.6 };
  },
  glimpseStep(game, dt) {
    const G = game.glimpse, e = G.e, g = game.goat, T = TUNING.endBoss.glimpse, room = game.level.rooms[G.room];
    if (!G || e.dead) { game.glimpse = null; return; }
    if (e.say) { e.say.life -= dt; if (e.say.life <= 0) e.say = null; }
    if (!G.seen) {
      if (g.dead || !room || !this.inRoom(room, g.x, g.y)) { game.underArm(G.ewe, e, 0); return; }
      G.seen = true; G.t = 0;
      e.facing = Math.atan2(g.y - e.y, g.x - e.x);
      game.say(e, T.line); game.floatText(e.x, e.y - 60, 'HA HA HA!', PALETTE.blood); game.audio.sfxGrowl();
      game.floatText(G.ewe.x, G.ewe.y - 28, 'BEEH!', PALETTE.bone); game.audio.sfxBleat(540, 0.14, 0.26); G.ewe.bleating = 0.35;
      const M = room.exitMouth, cx = (room.x + room.w / 2) * TILE, cy = (room.y + room.h / 2) * TILE;
      const ox = M.vertical ? Math.sign(M.x - cx) || 1 : 0, oy = M.vertical ? 0 : Math.sign(M.y - cy) || 1;
      e.path = [{ x: M.x - ox * TILE * 0.5, y: M.y - oy * TILE * 0.5 }, { x: M.x + ox * TILE * 2.5, y: M.y + oy * TILE * 2.5 }];
      return;
    }
    G.t += dt;
    game.underArm(G.ewe, e, G.t); G.ewe.bleating = Math.max(0, G.ewe.bleating - dt);
    G.bleat -= dt; if (G.bleat <= 0) { G.bleat = 0.6 + Math.random() * 0.3; G.ewe.bleating = 0.25; game.floatText(G.ewe.x, G.ewe.y - 28, 'BEEH!', PALETTE.bone); game.audio.sfxBleat(540, 0.12, 0.25); }
    const done = G.t > T.wait && game.followPath(e, T.speed * TILE, dt);
    if (G.t <= T.wait) e.facing = Math.atan2(g.y - e.y, g.x - e.x);
    if (done || G.t > T.cap) { game.enemies = game.enemies.filter((o) => o !== e); game.glimpse = null; }
  },

  // ---- THE OSSUARY: THE LAST SUPPER ----
  // `startLevel`: the room's men sat along the table, the boss nearest the head, THE WARDEN seated at its head, the chair (a wraith
  // hidden as a stool) past the foot, the platter on his own table. The men are held (`endHold` 'sit') until it breaks.
  // The goat in the room (12 Oct 2026, the user's shape): a short held scene (`stepSupper`): the way in stoned behind him, the camera
  // over to the Warden, who stands and slides the chair out, his words in the animals' box; then the offer, the floor his again but
  // slow (`supper.slow`, `Goat.update`), a tuft of grass at the chair, and the wraith springs once `grassAt` of it is grazed, or a
  // blow on anybody, or BAAH, breaks it. The brawl: a dome over him and his table (`S.dome`, `barrierPush`), the platter under it.
  laySupper(game, ring, li) {
    const L = game.level, last = ring.at, room = L.rooms[last], T = TUNING.endBoss.supper, w = game.world;
    if (!room) return;
    const tables = game.props.filter((p) => p.kind === 'table' && !p.broken && this.inRoom(room, p.x, p.y)).sort((a, b) => a.x - b.x);
    if (tables.length < 2 || tables.some((t) => Math.abs(t.y - tables[0].y) > TILE * 0.5)) return;
    const rowY = tables[0].y, x0 = tables[0].x - TILE, x1 = tables[tables.length - 1].x + TILE;
    const ok = (x, y) => w.walkableAt(Math.floor(x / TILE), Math.floor(y / TILE));
    // the seats along both long sides, the head and the foot left clear, the ones nearest the head first
    const seats = [];
    for (const side of [-1, 1]) for (let x = x0 + TILE * T.inset; x <= x1 - TILE * T.inset + 1; x += TILE * T.gap) {
      const y = rowY + side * TILE * T.seat; if (ok(x, y)) seats.push({ x, y, facing: side < 0 ? Math.PI / 2 : -Math.PI / 2 });
    }
    // His place (15 Oct 2026, his: "put the goat's place here, so there is more to walk"): a seat on the far long side at
    // the table's middle, kept out of the men's, the chair sliding out away from the table; the foot of the table if none.
    const mid = (x0 + x1) / 2, far = seats.filter((s) => s.facing > 0).sort((a, b) => Math.abs(a.x - mid) - Math.abs(b.x - mid))[0];
    if (far) seats.splice(seats.indexOf(far), 1);
    const place = far ? { x: far.x, y: far.y, ux: 0, uy: -1 } : { x: x0 - TILE * T.chair, y: rowY, ux: -1, uy: 0 };
    seats.sort((a, b) => (x1 - a.x) - (x1 - b.x));
    const boss = game.enemies.find((o) => o.boss && o.soul && !o.dead && o.room === last);
    const men = game.enemies.filter((o) => !o.dead && !o.scripted && o.room === last && o.state !== 'hidden');
    const order = boss ? [boss, ...men.filter((o) => o !== boss)] : men;
    // A floor put aside in the middle of it (`spotOf` → `supperSpot`): laid back as it stood, the men he put down gone by their sid already.
    const was = game.spotIn && game.spotIn.supper, ph = was ? was.phase : 'wait';
    if (ph === 'done') { if (boss) { boss.soul = false; boss.soulGate = -1; } return; }   // the Warden and the monster fell; the soul is loose or taken (the spot's own)
    const seated = ph === 'wait' || ph === 'scene' || ph === 'offer';
    if (seated) order.forEach((e, i) => {
      const s = seats[i];
      if (s) { e.x = s.x; e.y = s.y; e.seat = s; e.facing = s.facing; }
      e.vx = 0; e.vy = 0; e.endHold = 'sit'; e.aware = false;
    });
    else for (const e of order) { e.aware = true; e.woke = true; if (e.state === 'idle') e.state = 'chase'; }
    // THE WARDEN at the head: a real man of the room (js/warden.js), `scripted` so he does nothing until his fight, seated like
    // the rest until the goat is in (`endHold` 'sit', `seat`), behind his dome through the brawl (`e.barrier`: `die` and `fling`
    // refuse; the goat is kept out of the dome in `supperStep`). The way out's soul is his, taken off the table's mage, so the
    // gate waits on him and not on the table.
    const wx = ok(x1 + TILE * T.head, rowY) ? x1 + TILE * T.head : x1 + TILE * 0.8;
    const wd = new Enemy(wx, rowY, 'bearer'); Warden.give(wd); wd.scripted = true; wd.room = last; wd.facing = Math.PI; wd.barrier = true; wd.aware = false;
    if (seated) { wd.seat = { x: wx, y: rowY, facing: Math.PI }; wd.endHold = 'sit'; }
    if (boss && boss.soulGate >= 0) { wd.soulGate = boss.soulGate; boss.soulGate = -1; boss.soul = false; boss.hp = boss.maxHp = Math.min(boss.hp, (boss.cfg.hp || 1) + TUNING.boss.champHp); }
    game.ensoul(wd); wd.hp = wd.maxHp = TUNING.warden.hp;
    game.enemies.push(wd);
    // the chair at the foot: a wraith as a stool
    let chair = null;
    if (seated && ok(place.x, place.y)) {
      chair = new Enemy(place.x, place.y, 'wraith'); chair.room = last; chair.aware = false; chair.woke = true; chair.hideWant = false;
      game.enemies.push(chair);
      if (!chair.hide(game, 'stool')) { game.enemies.pop(); chair = null; }
    }
    // the platter on his own table, the one at the head
    const headT = tables[tables.length - 1];
    const platter = new Prop(headT.x, headT.y - 4, 'platter'); platter.supper = true; platter.phase = Math.random() * 6;
    if (seated) game.props.push(platter);
    // the dome of the brawl: a disc over him and his table, `dome.pad` tiles past both
    const dome = { x: (wx + headT.x) / 2, y: rowY, r: Math.abs(wx - headT.x) / 2 + T.dome.pad * TILE };
    game.supper = { li, room: last, rowY, x0, x1, place, men: order, boss, warden: wd, chair, platter, tables, dome, t: 0, phase: 'wait', slide: 0, lineAt: 0, lineN: 0, laughAt: 0, laughN: 0 };
    game.endBoss = { e: wd, li, kind: 'supper', meet: this.meetFor(game, li), room: last, seen: !seated, bones: null };
    if (!seated) this.resumeSupper(game, was);
  },
  // What the spot keeps of it (`Game.spotOf`): the phase, and the hearts the Warden or the monster has left.
  supperSpot(game) {
    const S = game.supper; if (!S) return null;
    const m = S.monster, w = S.warden;
    return { phase: S.phase === 'scene' ? 'wait' : S.phase, hp: w && !w.dead ? w.hp : 0, mhp: m && !m.dead ? m.hp : 0 };
  },
  // CONTINUE into the middle of it: the Warden at the head under his dome, or in his fight with the hearts he had, or
  // THE FLAYED already; the platter where the phase left it; nobody at the table.
  resumeSupper(game, was) {
    const S = game.supper, w = S.warden;
    S.brawlers = S.men.slice();
    this.sealBehind(game, true);
    if (was.phase === 'brawl') { S.phase = 'brawl'; S.laughAt = 1; game.props.push(S.platter); return; }
    const open = new Prop(w.x - TILE, w.y, 'platter'); open.open = true; open.phase = 0; game.props.push(open);
    if (was.phase === 'drop' || was.phase === 'fight') {
      w.barrier = false; w.scripted = false; w.aware = true; w.woke = true; w.state = 'chase';
      if (was.hp > 0) w.hp = Math.min(w.maxHp, was.hp);
      S.phase = 'fight'; game.doom = true; return;
    }
    if (was.phase === 'monster') {
      w.barrier = false; w.scripted = false;
      const m = Warden.transform(game, w, true);
      if (was.mhp > 0) m.hp = Math.min(m.maxHp, was.mhp);
      S.phase = 'monster'; game.doom = true;
    }
  },
  // The way he came in, stoned behind him (the boss room's own shut, `Game.updateBossShut`, held by `hold` until the supper is
  // done). `quiet`: a floor laid back from a spot, no sound.
  sealBehind(game, quiet) {
    const S = game.supper, L = game.level, w = game.world, room = L.rooms[S.room], back = L.rooms[S.room - 1];
    if (!room || room.bossShut || !back || back.clamped || !back.exitMouth) return;
    const m = back.exitMouth;
    room.bossShut = { tiles: m.tiles.slice(), was: m.tiles.map((i) => w.tiles[i]), hold: true };
    for (const i of m.tiles) w.tiles[i] = T.WALL;
    w.caveDirty();
    if (quiet) return;
    game.audio.sfxSteel(); game.audio.sfxThud(); game.shake(5); game.vibe(30); game.thud(m.x, m.y, 7);
    game.particles(m.x, m.y, 16, PALETTE.ash, 220);
    game.floatText(m.x, m.y - 30, 'SEALED', PALETTE.bone);
  },
  // The goat in the room (`watch`): the scene, `game.endScene` kind 'supper'.
  startSupper(game) {
    const S = game.supper; if (!S || S.phase !== 'wait') return;
    S.phase = 'scene'; S.t = 0; S.seen = !!this.load().seen.supper;
    game.endScene = { kind: 'supper', t: 0, bars: 0, flags: {}, seen: S.seen, camAt: null };
    for (const o of [S.warden, ...S.men]) o.endActor = true;   // shown through the fog whole, the far end of the table too
    if (game.audio.sfxSupper) game.audio.sfxSupper();   // heaven's notes, flat and far: is she here?
  },
  // The chair sliding out from the table, the violet of his hand round it (`slide` 0..1).
  slideChair(game, dt) {
    const S = game.supper, T = TUNING.endBoss.supper;
    if (!S.chair || S.slide >= 1) return;
    S.slide = Math.min(1, S.slide + dt / T.slide); const q = S.slide * S.slide * (3 - 2 * S.slide);
    const { x, y } = this.chairAt(S, q);
    if (Math.random() < dt * 40) game.particles(x + (Math.random() - 0.5) * 20, y - 6 + (Math.random() - 0.5) * 10, 1, Math.random() < 0.5 ? PALETTE.witch : PALETTE.witchHi, 30);
  },
  // The chair `q` of the way out from its place (0 at the table, 1 slid out), moved there with its stool.
  chairAt(S, q) {
    const T = TUNING.endBoss.supper, P = S.place || { x: S.x0 - TILE * T.chair, y: S.rowY, ux: -1, uy: 0 };
    const x = P.x + P.ux * q * TILE * T.slideBy, y = P.y + P.uy * q * TILE * T.slideBy;
    if (S.chair) { S.chair.x = x; S.chair.y = y; if (S.chair.disguise) { S.chair.disguise.x = x; S.chair.disguise.y = y; } }
    return { x, y };
  },
  // He stands from his seat, his hand up.
  wardenUp(game) {
    const w = game.supper.warden;
    if (w.endHold) { w.endHold = null; w.seat = null; w.pose = 'raise'; w.facing = Math.PI; game.audio.sfxSteel(); game.particles(w.x, w.y - 30, 10, PALETTE.witchHi, 120); }
  },
  // The scene's step (`EndBoss.update`): the seal, the camera over, him up and the chair out, his words in the box, the camera back.
  stepSupper(game, dt) {
    const S = game.supper, X = game.endScene, C = TUNING.endBoss.supper.scene, w = S.warden, g = game.goat;
    if (!S || S.phase !== 'scene') { this.end(game); return null; }
    if (!X.flags.seal && X.t >= C.seal) { X.flags.seal = true; this.sealBehind(game); }
    if (!X.flags.pan && X.t >= C.pan) { X.flags.pan = true; X.camAt = w; }
    if (X.t >= C.raise) { this.wardenUp(game); this.slideChair(game, dt); }
    if (!X.flags.box && X.t >= C.box) {
      X.flags.box = true;
      Beast.talk(game, { kind: 'warden', x: w.x, y: w.y }, C.lines, false, { name: 'THE WARDEN', sound: () => game.audio.sfxGrowl(), portrait: (R, ctx, k) => this.wardenPortrait(R, ctx, k) });
    }
    if (X.flags.box && !game.beastTalk && !X.flags.back) { X.flags.back = true; X.backAt = X.t; X.camAt = g; w.pose = 'idle'; X.done = true; }
    if (X.flags.back && X.t >= X.backAt + C.back) { this.end(game); return null; }
    return w;
  },
  // Skipped or played out: everything the scene does is done, and the offer stands.
  endSupperScene(game) {
    const S = game.supper, T = TUNING.endBoss.supper, w = S.warden, g = game.goat;
    if (!S || S.phase !== 'scene') return;
    this.sealBehind(game, true); this.wardenUp(game); w.pose = 'idle';
    if (S.chair && S.slide < 1) { S.slide = 1; this.chairAt(S, 1); }
    if (game.beastTalk && game.beastTalk.kind === 'warden') game.beastTalk = null;
    for (const o of [w, ...S.men]) o.endActor = false;
    // the tuft at the chair, between it and the table: what "EAT WITH US" means, and what the wraith waits on
    const P = S.place || { ux: -1, uy: 0 }, at = this.chairAt(S, S.chair ? S.slide : 1);
    const gx = at.x - P.ux * TILE * T.grass, gy = at.y - P.uy * TILE * T.grass;
    if (game.world.walkableAt(Math.floor(gx / TILE), Math.floor(gy / TILE))) { S.grass = new Prop(gx, gy, 'heal'); S.grass.supper = true; game.props.push(S.grass); }
    S.phase = 'offer'; S.t = 0; S.lineAt = 1.6; S.lineN = 0;
    g.facing = Math.atan2(w.y - g.y, w.x - g.x);
  },
  // The Warden big, for the box: the front view off js/warden-pixels.js, his hand up.
  wardenPortrait(R, ctx, k) {
    if (typeof WARDEN_PIXELS === 'undefined' || !WARDEN_PIXELS.draw) return;
    // the box's portrait keeps one size whatever texel he is drawn at on the floor (`ART_PASS.grain`)
    const z = k * 0.9 * (WARDEN_PIXELS.TX_OWN ? WARDEN_PIXELS.TX_OWN / WARDEN_PIXELS.TX : 1), sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.save(); ctx.scale(z, z); WARDEN_PIXELS.draw(ctx, Math.PI / 2, false, R.t, 0, { pose: 'raise', warden: true }); ctx.restore();
    ctx.imageSmoothingEnabled = sm;
  },
  // Every play step while the supper stands or he is on his way out.
  supperStep(game, dt) {
    const S = game.supper; if (!S) return;
    const T = TUNING.endBoss.supper, g = game.goat, w = S.warden;
    if (w.say) { w.say.life -= dt; if (w.say.life <= 0) w.say = null; }
    // THE FLAYED down: the goat's last word over him, in the box with his own picture (13 Oct 2026, his ask)
    if (S.phase === 'done' && S.knockAt !== undefined && game.timer >= S.knockAt && !game.beastTalk) {
      S.knockAt = undefined;
      if (!g.dead) Beast.talk(game, { kind: 'goat', x: g.x, y: g.y }, T.knock.lines, false, { name: 'THE GOAT', sound: () => game.audio.sfxBleat(300, 0.2, 0.5),
        portrait: (R, ctx, k) => Codex.portrait(R, game, 0, 0, 40 * k * 1.3, game.mods, Shop.wearOf(game), 'knock') });
      return;
    }
    if (S.phase === 'offer') {
      S.t += dt;
      if (S.t >= S.lineAt && S.lineN < T.lines.length) { game.say(w, T.lines[S.lineN]); S.lineN++; S.lineAt = S.t + T.lineGap; }
      // what breaks it: the chair's grass `grassAt` grazed (the wraith springs itself), the wraith found out by a blow near it,
      // BAAH, a blow on anybody at the table
      const gr = S.grass, ate = !!(gr && (gr.broken || gr.graze >= TUNING.prop.heal.grazeTime * game.mods.grazeMul * T.grassAt));
      const chairUp = !!(S.chair && S.chair.state !== 'hidden');
      const blow = S.men.some((e) => e.dead || !e.endHold);
      if (ate || chairUp || blow || game.input.spacePressed || g.dead) this.breakSupper(game, ate || chairUp ? 'chair' : blow ? 'blow' : 'baah');
      return;
    }
    if (S.phase === 'brawl') {
      S.t += dt;
      // behind his dome at the head of the table, the platter beside him, laughing while his men fight
      w.facing = Math.atan2(g.y - w.y, g.x - w.x);
      if (w.pose === 'raise' && S.t > 0.9) w.pose = 'idle';
      this.barrierPush(game, S.dome);
      if (S.t >= S.laughAt) { S.laughAt = S.t + TUNING.warden.barrier.laughEvery * (0.8 + Math.random() * 0.5); game.floatText(w.x, w.y - 60, T.laughs[S.laughN++ % T.laughs.length], PALETTE.blood); game.audio.sfxGrowl(); }
      if (S.brawlers.every((e) => e.dead)) this.dropPlatter(game);
      return;
    }
    if (S.phase === 'drop') {
      S.t += dt; this.barrierPush(game, S.dome);
      if (S.t >= T.drop.wait) {
        // the fight: the dome down, his AI his own, the score heavy (js/warden.js, `layers.doom`)
        S.phase = 'fight'; w.barrier = false; w.scripted = false; w.aware = true; w.woke = true; w.state = 'chase'; w.path = null; w.lastSeen = { x: g.x, y: g.y };
        game.doom = true; game.flash(PALETTE.blood, 0.1); game.audio.sfxToll();
        if (game.audio.musicEvent) game.audio.musicEvent('spotted');
      }
      return;
    }
    if (S.phase === 'fight') { if (w.dead && !w.wardenGone) { S.phase = 'done'; game.doom = false; this.unseal(game); } return; }
    if (S.phase === 'monster') {
      const m = S.monster;
      if (!m || m.dead) { S.phase = 'done'; game.doom = false; this.unseal(game); if (m && !game.goat.dead) S.knockAt = game.timer + T.knock.wait; return; }
      Warden.fistFire(game, m, dt);
    }
  },
  // The goat dead in his room (`Game.onGoatDied`, 12 Oct 2026 playtest): he laughs, and says it over the soul going up.
  gloat(game) {
    const S = game.supper; if (!S || S.phase === 'wait' || S.phase === 'scene' || S.phase === 'done') return;
    const m = S.monster && !S.monster.dead ? S.monster : S.warden && !S.warden.dead ? S.warden : null;
    if (!m) return;
    const G = TUNING.warden.gloat;
    game.floatText(m.x, m.y - 70, G.laugh, PALETTE.blood); game.say(m, G.line); m.say.life = G.life; m.say.max = G.life + 0.1;   // nobody's clock runs under the death card: shown whole from the start
    game.audio.sfxGrowl();
  },
  // The supper done: the stone behind is `updateBossShut`'s to take down again.
  unseal(game) {
    const S = game.supper, room = S && game.level.rooms[S.room];
    if (room && room.bossShut) room.bossShut.hold = false;
  },
  // The dome nothing passes: the goat inside it is put back out to its edge, with a spark. `D`: its disc.
  barrierPush(game, D) {
    const g = game.goat, R = D.r; if (g.dead) return;
    const dx = g.x - D.x, dy = g.y - D.y, d = hyp(dx, dy);
    if (d >= R + g.r) return;
    const nx = d ? dx / d : 1, ny = d ? dy / d : 0;
    g.x = D.x + nx * (R + g.r); g.y = D.y + ny * (R + g.r);
    if (g.state === 'lunge' || g.state === 'roll') { g.vx = nx * 3 * TILE; g.vy = ny * 3 * TILE; }
    if (Math.random() < 0.4) game.particles(D.x + nx * R, D.y + ny * R, 2, PALETTE.witchHi, 90);
  },
  // The last of his men down: the platter off his table, thrown down at his feet, open and empty.
  dropPlatter(game) {
    const S = game.supper, T = TUNING.endBoss.supper, w = S.warden, g = game.goat;
    S.phase = 'drop'; S.t = 0; w.pose = 'idle';
    const i = game.props.indexOf(S.platter); if (i >= 0) game.props.splice(i, 1);
    const dx = g.x - w.x, dy = g.y - w.y, d = hyp(dx, dy) || 1;
    const p = new Prop(w.x + dx / d * TILE * 1.3, w.y + dy / d * TILE * 1.3, 'platter'); p.open = true; p.phase = 0; game.props.push(p);
    game.audio.sfxSteel(); game.audio.sfxThud(); game.thud(p.x, p.y, 4); game.particles(p.x, p.y, 8, PALETTE.ashHi, 110);
    game.floatText(p.x, p.y - 26, 'EMPTY', PALETTE.bone);
    // his word in the box (12 Oct 2026 playtest: a line over his head went by unread); the floor waits on the page
    Beast.talk(game, { kind: 'warden', x: w.x, y: w.y }, T.drop.lines, false, { name: 'THE WARDEN', sound: () => game.audio.sfxGrowl(), portrait: (R, ctx, k) => this.wardenPortrait(R, ctx, k) });
    const D = this.load(); D.seen.supper = true; this.save();
  },
  // He laughs, every man at the table is up, the chair is what it was, the grass was never there, and the dome goes up over
  // him and his table with the platter on it.
  breakSupper(game, why) {
    const S = game.supper, T = TUNING.endBoss.supper, w = S.warden, g = game.goat;
    if (!S || S.phase !== 'offer') return;
    const D = this.load(); D.seen.supper = true; this.save();
    if (S.chair && S.chair.state === 'hidden' && !S.chair.dead) S.chair.spring(game);
    if (S.grass) { const i = game.props.indexOf(S.grass); if (i >= 0) game.props.splice(i, 1); game.particles(S.grass.x, S.grass.y, 8, PALETTE.witch, 80); S.grass = null; }
    game.floatText(w.x, w.y - 62, 'HA HA HA HA!', PALETTE.blood); game.say(w, T.laugh);
    game.audio.sfxGrowl(); game.audio.sfxToll(); game.thud(w.x, w.y, 8); game.flash(PALETTE.witch, 0.14);
    game.particles(w.x, w.y - 30, 16, PALETTE.witchHi, 160);
    game.ring(S.dome.x, S.dome.y, S.dome.r, PALETTE.witch, 0.5, 3);
    for (const e of S.men) if (!e.dead) { e.endHold = null; e.seat = null; e.aware = true; e.woke = true; e.lastSeen = { x: g.x, y: g.y }; e.lostTimer = 0; if (e.state === 'idle') e.state = 'chase'; }
    w.pose = 'raise'; w.facing = Math.atan2(g.y - w.y, g.x - w.x); S.why = why;
    S.brawlers = S.men.concat(S.chair ? [S.chair] : []);
    S.phase = 'brawl'; S.t = 0; S.laughAt = 1.2;
    if (game.audio.musicEvent) game.audio.musicEvent('spotted');
  },

  // ---- the picture ----
  // On the floor, under everybody: the ogre's bones.
  drawGround(R, game) {
    const S = game.supper;
    if (S) for (const e of S.men.concat([S.warden])) if (e.seat && e.endHold === 'sit' && !e.dead && game.inSight(e)) {
      const ctx = R.ctx; ctx.save(); ctx.translate(e.seat.x, e.seat.y - 5); ctx.scale(1, 1 / TILT); R.painted.stool(ctx, { x: 0, y: 0 }); ctx.restore();
    }
    const B = game.endBoss; if (!B || !B.bones) return;
    for (const b of B.bones) if (game.inSight ? game.inSight(b) : true) this.bone(R.ctx, b.x, b.y, b.a, b.big ? 1.3 : 1);
  },
  // Over everybody: the bone in his teeth, the bone in the air, her under the running mage's arm.
  drawWorld(R, game) {
    const B = game.endBoss, S = game.endScene, U = game.supper, G = game.glimpse;
    if (G && G.ewe && !G.e.dead && game.inSight(G.e)) R.drawSheep(G.ewe);
    if (U && U.warden && !U.warden.dead && game.inSight(U.warden)) {
      const w = U.warden, ctx = R.ctx, D = U.dome;
      // the dome: a ring of violet cells round him and his table, breathing, while his men fight
      if (w.barrier && D && (U.phase === 'brawl' || U.phase === 'drop')) {
        const k = 0.5 + 0.5 * Math.sin(R.t * 4);
        ctx.save(); ctx.globalAlpha = 0.35 + 0.35 * k; CombatFX.pixelRing(ctx, D.x, D.y, D.r + k * 3, 2, PALETTE.witch); ctx.globalAlpha = 0.5; CombatFX.pixelRing(ctx, D.x, D.y, D.r - 4, 1, PALETTE.witchHi); ctx.restore();
      }
    }
    if (B && B.e && !B.e.dead && B.e.endHold === 'gnaw' && game.inSight(B.e)) {
      const e = B.e, t = R.t, bob = Math.round(Math.sin(t * 9) * 2);
      this.bone(R.ctx, e.x + Math.round(Math.sin(t * 4.5) * 3), e.y - 30 + bob, 0.25 + Math.sin(t * 4.5) * 0.25, 1.4);
    }
    if (!S) return;
    if (S.kind === 'turn') { Warden.drawTurn(R, game); return; }
    if (S.bone && S.bone.life > 0) this.bone(R.ctx, S.bone.x, S.bone.y, S.bone.spin, 1.4);
    if (S.ewe && !S.ewe.gone && (S.carrier || S.mage) && game.inSight(S.carrier || S.mage)) R.drawSheep(S.ewe);
  },
  // A bone in cells: a shaft and two knobbed ends, turned to `a`, `k` its size.
  bone(ctx, x, y, a, k) {
    const px = TUNING.effects.pixel, L = Math.round(5 * k), ca = Math.cos(a), sa = Math.sin(a) * TILT;
    ctx.save(); ctx.fillStyle = PALETTE.bone;
    for (let i = -L; i <= L; i++) ctx.fillRect(Math.round((x + ca * i * px) / px) * px, Math.round((y + sa * i * px) / px) * px, px, px);
    for (const sgn of [-1, 1]) {
      const ex = x + ca * (L + 0.5) * px * sgn, ey = y + sa * (L + 0.5) * px * sgn, nx = -sa / TILT * px, ny = ca * px * TILT;
      ctx.fillRect(Math.round((ex + nx) / px) * px, Math.round((ey + ny) / px) * px, px, px);
      ctx.fillRect(Math.round((ex - nx) / px) * px, Math.round((ey - ny) / px) * px, px, px);
    }
    ctx.restore();
  },
  // The bars, the gate's mage's own (`drawBlessOverlay`).
  drawOverlay(R, game) {
    const U = game.supper, C0 = TUNING.endBoss.scene;
    if (U && U.phase === 'offer' && U.t > C0.skipAfter * 3) {
      const ctx = R.ctx, s = R.ts; ctx.save(); ctx.globalAlpha = 0.45; ctx.font = `700 ${12 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone; ctx.textAlign = 'center';
      ctx.fillText('BAAH ENDS THE SUPPER', R.vw / 2, 22 * s); ctx.restore();
    }
    const S = game.endScene; if (!S) return;
    const ctx = R.ctx, s = R.ts, C = TUNING.endBoss.scene, h = Math.round(R.vh * C.bars * clamp(S.bars, 0, 1));
    if (h > 0) { ctx.fillStyle = PALETTE.ink; ctx.fillRect(0, 0, R.vw, h); ctx.fillRect(0, R.vh - h, R.vw, h); }
    if (S.seen && S.t > C.skipAfter) {
      ctx.save(); ctx.globalAlpha = 0.45 * clamp(S.bars, 0, 1); ctx.font = `700 ${12 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone; ctx.textAlign = 'center';
      ctx.fillText(`${game.tapWord} TO SKIP`, R.vw / 2, R.vh * C.bars * 0.6 + 4 * s); ctx.restore();
    }
  },
};
// The floor tile, read late (gen.js defines `T`).
function T_FLOOR() { return T.FLOOR; }
if (typeof module !== 'undefined') module.exports = { EndBoss, END_BOSS_NAMES };
