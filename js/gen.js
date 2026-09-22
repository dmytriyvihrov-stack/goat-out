// Level generation: a chain of template rooms joined by 2-wide corridors, trending up-right, with
// now and then a room hung above or below the last one and reached by a shaft (`STACK`).
// EXIT is the flight of stairs up out of the last room; ENTRY the flight you came up into the first.
// PIT is the one tile that is neither floor nor wall: the goat walks into it and falls, a man will
// not path into it, and anything thrown through it is gone. In a wall run it reads as a window.
const T = { FLOOR: 0, WALL: 1, HAY: 2, ASH: 3, EXIT: 4, ENTRY: 5, PIT: 6 };

// A room whose sides mean something — the killbox's rifles are its far wall — sets `noFlipX` and
// keeps its left and right the way they were written. Up and down never matter to anyone.
function flipTemplate(tpl, rng) {
  let rows = tpl.rows.slice();
  if (rng.chance(0.5)) rows = rows.slice().reverse();
  if (!tpl.noFlipX && rng.chance(0.5)) rows = rows.map((r) => r.split('').reverse().join(''));
  return { name: tpl.name, rows };
}

// ---------------------------------------------------------------------------------------------
// THE ENCOUNTER PLAN. Difficulty is decided here, once, before a single man is placed; the generator
// below only finds floor for what this returns. Two rules, and both are testable:
//
//   1. Every kind is met on its own. The room that introduces a kind holds that one enemy and
//      nothing else — no escorts on a first-appearance boss either.
//   2. Rooms are bought with threat rather than with bodies, off a curve that runs from the level's
//      `from` to its `to`. Later rooms are both fuller and nastier, and a level is harder than the
//      one before it because its two numbers are bigger.
//
// `node tools/balance.js` prints what this produces per level and fails on a broken rule.
// A level may re-weigh the draw: the Ossuary is mostly its dead, whatever else is standing there.
function weightedPick(kinds, rng, weight) {
  const w = weight || ENCOUNTER.weight;
  let total = 0;
  for (const k of kinds) total += w[k] || 1;
  let r = rng.float(0, total);
  for (const k of kinds) { r -= w[k] || 1; if (r <= 0) return k; }
  return kinds[kinds.length - 1];
}

// Spend a threat budget on whoever has been introduced, respecting the per-room caps.
// The cheapest kind gets one more cap on top, and it is the only one that tightens as the budget
// grows: see `ENCOUNTER.cheap`. A room handed its own head count — the Great Hall, which is meant to
// be a wall of bodies — is left out of it entirely.
function fillRoom(budget, available, rng, caps, maxMen, weight) {
  const men = [], used = {};
  const cap = maxMen || caps.men;
  const C = ENCOUNTER.cheap;
  const cheapCap = maxMen ? 99
    : Math.round(lerp(C.max, C.min, clamp((budget - C.full) / (C.none - C.full), 0, 1)));
  let left = budget;
  for (let guard = 0; guard < 80 && men.length < cap; guard++) {
    const choices = available.filter((k) => (used[k] || 0) < (k === C.kind ? Math.min(caps[k] || 99, cheapCap) : (caps[k] || 99))
      && THREAT[k] <= left + 0.5);
    if (!choices.length) break;
    const kind = weightedPick(choices, rng, weight);
    men.push(kind); used[kind] = (used[kind] || 0) + 1; left -= THREAT[kind];
  }
  if (!men.length && available.length) men.push(available.includes('bearer') ? 'bearer' : available[0]);
  return men;
}

function planEncounters(levelDef, rooms, rng) {
  const E = levelDef.encounters;
  // A level may loosen a cap: the finale is allowed rooms the earlier ones are not.
  const caps = Object.assign({}, ENCOUNTER.cap, E.cap || {});
  const weight = E.weight ? Object.assign({}, ENCOUNTER.weight, E.weight) : null;
  const out = { rooms: new Map(), introRooms: new Set(), hunterFrom: -1, caps };
  const fight = rooms.filter((r) => r.index > 0);
  // The curve is bought in ordinary rooms only. Every set piece — the wheel, the hall, the gallery,
  // the killbox — is a thing to be read rather than a number of men, and none of them may be the
  // room that introduces a kind: meeting the Mill and your first two-hearted man at the same moment
  // means meeting neither of them.
  const ordinary = fight.filter((r) => !r.arena && !r.isHall && !r.isGallery && !r.isMill && !r.isKillbox && !r.isRest);
  if (!ordinary.length) return out;
  // A trap room still buys its men off the curve, but it never introduces a kind: meeting a hound
  // and a floor full of teeth in the same room means meeting neither of them.
  const plain = ordinary.filter((r) => !r.isTrap);

  // Hand each new kind a room of its own: start where the level asks for it and walk forward to the
  // first ordinary room nobody has claimed, then backward if the level ran out of room forward.
  const intro = new Map();
  for (const [kind, at] of (E.introduce || [])) {
    const want = Math.round(clamp(at, 0, 1) * (ordinary.length - 1));
    // If an arena on this level is built round that kind, he has to be met in the open first: the
    // first brute you ever see should not be the one with the extra heart standing in the ring.
    const ring = fight.find((r) => r.arena && r.arena.boss === kind);
    const clean = plain.length ? plain : ordinary;
    const early = ring ? clean.filter((r) => r.index < ring.index) : clean;
    const list = early.length ? early : clean;
    const w = Math.min(want, list.length - 1);
    const room = list.slice(w).find((r) => !intro.has(r.index))
      || list.slice(0, w).reverse().find((r) => !intro.has(r.index))
      || ordinary.slice(want).find((r) => !intro.has(r.index))
      || ordinary.slice(0, want).reverse().find((r) => !intro.has(r.index));
    if (room) { intro.set(room.index, kind); out.introRooms.add(room.index); }
  }

  const pending = new Set(intro.values());
  const mixable = E.kinds.filter((k) => !pending.has(k));   // met on an earlier level, or from room one
  // Everything the run has shown him already, so the second Butcher does not get a solo introduction.
  const seen = new Set([...mixable, ...(levelDef.met || [])]);
  if (mixable.includes('hunter')) out.hunterFrom = 0;
  let step = 0, easeOff = false;
  for (const room of fight) {
    // A gate room is a breather: the soul, or the mouse, and nobody. It is off the curve entirely,
    // the way the pen is, so the rooms either side of it are bought exactly as they would have been.
    if (room.isRest) { out.rooms.set(room.index, { men: [], rest: true }); continue; }
    // An arena is its boss. He stands alone the first time you ever see his kind, and with a little
    // company every time after that.
    if (room.arena) {
      const boss = room.arena.boss;
      const known = seen.has(boss);
      // `escorts` on the arena is a hard count rather than a budget: the first boss of the game is
      // one brute and one man, whatever the threat curve would have bought him.
      const escorts = known ? fillRoom(ENCOUNTER.escortThreat, mixable.filter((k) => k !== boss), rng, caps, room.arena.escorts || 0, weight) : [];
      out.rooms.set(room.index, { men: escorts, boss, intro: known ? null : boss, arena: true });
      if (!known) out.introRooms.add(room.index);
      seen.add(boss);
      continue;
    }
    const t = ordinary.length > 1 ? step / (ordinary.length - 1) : 1;
    const curve = lerp(E.from, E.to, Math.pow(clamp(t, 0, 1), E.ease));
    const kind = intro.get(room.index);
    if (kind) {
      // The introduction itself: one of him, nothing else in the room.
      out.rooms.set(room.index, { men: [kind], intro: kind });
      mixable.push(kind); pending.delete(kind); seen.add(kind);
      if (kind === 'hunter') out.hunterFrom = room.index;
      easeOff = true; step++;
      continue;
    }
    // The Mill's room is a set piece. Half a crowd, and on the level that shows you the wheel for
    // the first time the two men who teach it and nobody else.
    if (room.isMill) {
      // The level that first shows the wheel gives it two men and no more: one who cannot read it
      // and one who can. An empty room taught that the arm hurts and nothing else — what has to be
      // learned is that it hurts THEM, and that needs somebody in it to be hurt.
      out.rooms.set(room.index, { men: levelDef.millLesson ? ['bearer', 'bearer']
        : fillRoom(curve * ENCOUNTER.millEase, mixable, rng, caps, 0, weight), mill: true,
        lesson: !!levelDef.millLesson });
      continue;
    }
    // The killbox: two rifles on the far side watching the door, two men on your side of the room,
    // and nothing else in it. Before rifles are a thing you have met it is an ordinary room.
    if (room.isKillbox) {
      const K = ENCOUNTER.killbox;
      if (mixable.includes('hunter')) { out.rooms.set(room.index, { men: K.men.concat(K.near), killbox: true, alert: K.men.length }); continue; }
      out.rooms.set(room.index, { men: fillRoom(curve, mixable, rng, caps, 0, weight) });
      continue;
    }
    // The Great Hall is the exception to every cap: it is supposed to be a wall of bodies.
    if (room.isHall) {
      out.rooms.set(room.index, { men: fillRoom(levelDef.hallThreat || curve * 2.5, mixable, rng, caps, ENCOUNTER.hallCap, weight), hall: true });
      continue;
    }
    // The Gallery is rifles posted apart, but only once rifles are a thing you have met.
    if (room.isGallery) {
      const posts = mixable.includes('hunter') ? ['hunter', 'hunter', 'hunter'] : [];
      out.rooms.set(room.index, { men: posts.concat(fillRoom(curve * 0.6, mixable, rng, caps, 0, weight)), gallery: true });
      continue;
    }
    const budget = curve * (easeOff ? ENCOUNTER.afterIntro : 1);
    out.rooms.set(room.index, { men: fillRoom(budget, mixable, rng, caps, 0, weight), threat: budget });
    easeOff = false; step++;
  }
  return out;
}

// `opts.luck` is the LUCKY CLOVER at the goat's neck when this floor is generated (`mods.luck`):
// multipliers on the odds of a second secret, of grass behind one, and of a loose rack, plus bowls
// of milk on top of the level's own count. Nothing else the goat carries reaches the generator.
function generateLevel(levelDef, seed, opts) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const lvl = tryGenerate(levelDef, seed + attempt * 7919, opts || {});
    if (lvl) return lvl;
  }
  throw new Error('level generation failed');
}

function tryGenerate(levelDef, seed, opts) {
  const rng = new RNG(seed);
  const luck = (opts && opts.luck) || { secret: 1, racks: 1, grass: 1, heals: 0 };
  const W = 420, H = 78;
  const tiles = new Uint8Array(W * H).fill(T.WALL);
  const rooms = [];
  const spawns = []; // {x, y, kind}
  const props = [];  // {x, y, kind}
  // Tall grass (THE CAVE): tile indices, laid by a template's own `g` and by `grassPatch`. The tile
  // under it is floor to everything but the eye.
  const grass = new Set();
  let x = 2;
  let y = Math.floor(H * 0.62);
  const n = levelDef.rooms;
  // Two pools. The canon is the level's own idea, and at least `CANON.share` of its ordinary rooms
  // are built out of it; the mix is what the run already knows — the untagged rooms and the canons
  // of the levels before this one — and never an idea it has not been shown yet. A template that
  // `needs` something the level does not have — teeth on a level whose floor has none — is in
  // neither, so no room is ever built out of a thing this level cannot show you.
  const fits = (t) => !t.needs || levelDef[t.needs];
  const canonId = levelDef.canon ? levelDef.canon.id : null;
  // Both pools are ordered by how much open ground each template gives (`groundOf`), tight first,
  // so the draw below can walk a level along that axis the way the curve walks it along threat.
  // Shuffled first, so templates that measure the same come out in a different order every seed.
  const byGround = (a, b) => groundOf(a) - groundOf(b);
  const canonPool = rng.shuffle(ROOM_TEMPLATES.filter((t) => t.canon && t.canon === canonId && fits(t))).sort(byGround);
  const known = levelDef.known || new Set();
  let mixPool = rng.shuffle(ROOM_TEMPLATES.filter((t) => !t.tag && (!t.canon || known.has(t.canon)) && fits(t))).sort(byGround);
  if (!mixPool.length) mixPool = canonPool;
  // Which entries of each pool this level has already spent. A pool smaller than the level's share
  // of rooms simply starts again once it is empty.
  const canonUsed = new Set(), mixUsed = new Set();
  // Rooms whose point is the floor rather than the men on it.
  const trapPool = rng.shuffle(ROOM_TEMPLATES.filter((t) => t.tag === 'trap' && fits(t)));
  const trapRooms = pickTrapRooms(levelDef, n, trapPool.length, rng);
  const canonRooms = canonPool.length ? pickCanonRooms(levelDef, n, trapRooms) : new Set();
  let trapIdx = 0;
  // The sentry's room is the first ordinary room of the level — `introduce: [['bearer', 0]]` always
  // resolves to it — and it is the one room whose template is not left to the canon/mix draw: it is
  // forced to `LESSON_TEMPLATE`, open floor with nothing in it to break the line from the door to
  // whichever wall he is standing against. Computed the same way `ordinaryRooms` is, before any
  // room exists yet, because the template is chosen room by room below and this one has to be known
  // going in rather than fixed up after the fact.
  const sentryRoomAt = levelDef.sentryIntro ? ordinaryRooms(levelDef, n)[0] : -1;
  // The gap between one room and the next, on average, for the width budget below.
  const GAP = 5;
  // Which of the set pieces still lie ahead of room `i`, by width, so a room can be given its fair
  // share of what is left rather than an average that a Great Hall then eats.
  const fixedW = (j) => {
    if ((levelDef.arenas || []).some((a) => a.at === j)) return ARENA_TEMPLATE.rows[0].length;
    if (j === levelDef.millAt) return (levelDef.millLesson ? MILL_LESSON_TEMPLATE : MILL_TEMPLATE).rows[0].length;
    if (j === levelDef.hallAt) return GREAT_HALL_TEMPLATE.rows[0].length;
    if (j === levelDef.galleryAt) return GALLERY_TEMPLATE.rows[0].length;
    if (j === levelDef.killboxAt) return KILLBOX_TEMPLATE.rows[0].length;
    if (j === levelDef.ambushAt) return AMBUSH_TEMPLATE.rows[0].length;
    if ((levelDef.gates || []).includes(j)) return REST_TEMPLATE.rows[0].length;
    return 0;
  };
  // A room may not take more than its share of the width that is left: a template too wide for what
  // remains is passed over for one that fits. The mix holds the yard's thirty-tile rooms from level
  // five on, and without this a sixteen-room level was sealed short of its last door often enough
  // that the twenty retries ran out.
  // Which of the ones that fit is the second axis: the pool is sorted by open ground, and how far
  // into the level this room is says where in that pool to look. It takes at random among the
  // `GROUND.window` nearest unspent entries rather than the single nearest, so the trend holds on
  // average — which is all `GEN_RULES.ground` asks of it — while two seeds stay two levels.
  const draw = (pool, used, i) => {
    let fixed = 0, flex = 1;
    for (let j = i + 1; j < n; j++) { const fw = fixedW(j); if (fw) fixed += fw; else flex++; }
    const budget = Math.floor((W - 8 - x - fixed - GAP * (n - i)) / flex);
    const target = clamp((i - 1) / Math.max(1, n - 2), 0, 1) * (pool.length - 1);
    const fitting = [];
    for (let k = 0; k < pool.length; k++) if (pool[k].rows[0].length <= budget) fitting.push(k);
    if (!fitting.length) return pool[Math.round(target)];
    let free = fitting.filter((k) => !used.has(k));
    if (!free.length) { used.clear(); free = fitting; }
    free.sort((a, b) => Math.abs(a - target) - Math.abs(b - target));
    const k = free[rng.int(0, Math.min(GROUND.window, free.length) - 1)];
    used.add(k);
    return pool[k];
  };

  let stackRun = 0;
  for (let i = 0; i < n; i++) {
    let tpl;
    // Whether the ground-ordered draw below actually chose this room's shape. A set piece, the two
    // teaching rooms and a trap room are all forced or drawn from a pool of their own, so none of
    // them is the generator keeping — or breaking — its promise about the floor opening up.
    let drawn = false;
    const arena = (levelDef.arenas || []).find((a) => a.at === i);
    if (i === 0) tpl = START_TEMPLATE;
    else if (arena) tpl = ARENA_TEMPLATE;
    else if (i === levelDef.millAt) tpl = levelDef.millLesson ? MILL_LESSON_TEMPLATE : MILL_TEMPLATE;
    else if (i === levelDef.hallAt) tpl = GREAT_HALL_TEMPLATE;
    else if (i === levelDef.galleryAt) tpl = GALLERY_TEMPLATE;
    else if (i === levelDef.killboxAt) tpl = KILLBOX_TEMPLATE;
    else if (i === sentryRoomAt) tpl = LESSON_TEMPLATE;
    else if (i === levelDef.ambushAt) tpl = AMBUSH_TEMPLATE;
    else if ((levelDef.gates || []).includes(i)) tpl = REST_TEMPLATE;
    else if (trapRooms.has(i)) tpl = trapPool[trapIdx++ % trapPool.length];
    else if (canonRooms.has(i)) { tpl = draw(canonPool, canonUsed, i); drawn = true; }
    else { tpl = draw(mixPool, mixUsed, i); drawn = true; }
    const source = tpl;
    tpl = flipTemplate(tpl, rng);
    // The cave squares nothing off: an ordinary room, an arena or a rest room there has its corners
    // filled back in with rock and a bulge or two grown out of its straight walls. Only floor is ever
    // turned to rock, and only where the room stays open round it (`erodeCave`); set pieces keep the
    // shapes their lessons were built round.
    if (levelDef.cave && (drawn || arena || (levelDef.gates || []).includes(i))) tpl.rows = erodeCave(tpl.rows, rng);
    tpl.canon = source.canon || null;
    // Carried across the flip, which mirrors the room and so cannot change it: the rules page and
    // the balance report both read the room's own ground rather than going back to the template.
    tpl.ground = groundOf(source);
    const w = tpl.rows[0].length, h = tpl.rows.length;
    // Now and then this room is hung above or below the last one instead of beside it, so the way
    // on is up a shaft or down one rather than always the right-hand wall. `stackSpot` says where,
    // or null when this pair is not allowed to or there is no rock for it.
    const stacked = i >= 2 && stackRun < STACK.run && rng.chance(levelDef.stack || 0)
      && stackable(levelDef, i, source, sentryRoomAt) ? stackSpot(rooms[i - 1], w, h, H, rng, levelDef.corridorW) : null;
    if (stacked) { x = stacked.x; y = stacked.y; stackRun++; } else stackRun = 0;
    y = clamp(y, 1, H - h - 2);
    if (x + w >= W - 6) return null;

    // What the room is for, in one word: the dev drawer's RULES page and `tools/balance.js` both
    // read it, and it is the only place the canon-or-mix decision is written down.
    const role = i === 0 ? 'pen' : arena ? 'arena' : i === levelDef.millAt ? 'mill' : i === levelDef.hallAt ? 'hall'
      : i === levelDef.galleryAt ? 'gallery' : i === levelDef.killboxAt ? 'killbox'
      : (levelDef.gates || []).includes(i) ? 'rest'
      : trapRooms.has(i) ? 'trap' : canonRooms.has(i) ? 'canon' : 'mix';
    // `seen` is the fog: a room is dark until the goat is standing in it. The first one is not.
    const room = { x, y, w, h, tpl, index: i, markers: [], arena, role, seen: i === 0, drawn,
      stacked: stacked ? stacked.dir : null,
      isMill: i === levelDef.millAt, isHall: i === levelDef.hallAt, isGallery: i === levelDef.galleryAt,
      isKillbox: i === levelDef.killboxAt, isTrap: trapRooms.has(i), isAmbush: i === levelDef.ambushAt,
      isRest: (levelDef.gates || []).includes(i) };
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const c = tpl.rows[ty][tx];
        const wx = x + tx, wy = y + ty;
        let t = T.FLOOR;
        if (c === '#' || c === 'P') t = T.WALL;
        else if (c === 'h') t = T.HAY;
        else if (c === 'O') t = T.PIT;
        else if (c === 'g') grass.add(wy * W + wx);
        tiles[wy * W + wx] = t;
        if ('eoRrmXBbtLMwSk'.includes(c)) room.markers.push({ tx: wx, ty: wy, c });
      }
    }
    rooms.push(room);
    if (i > 0) {
      const link = stacked ? carveShaft(tiles, W, rooms[i - 1], room, stacked.dir, rng, levelDef.corridorW)
        : carveCorridor(tiles, W, rooms[i - 1], room, rng, levelDef.corridorW);
      if (!link) return null;
      if (link) {
        room.enter = link.enter;    // where you walk in, so a room can put something in your way
        // Some of the doors between rooms are iron. Nobody shoulders one open and it does not go on
        // the first blow, so a corridor you were going to run straight down is three blows of standing
        // still instead — which is the only thing in a corridor that can make you turn round and look.
        // A wide room is the exception the ordinary roll does not reach often enough on its own: it
        // is ground open enough to simply be run the length of, and a level with almost no wall in it
        // (THE THRESHING FLOOR's `doorChance` is 0.12) offered the door that argues with that far too
        // rarely. `BIG_ROOM.w` tiles of width forces the roll up, so the room's own exit — not just
        // its corridor doors — carries the same counter-play a narrower level gets for free.
        const bigExit = rooms[i - 1].w >= BIG_ROOM.w && link.door && rng.chance(BIG_ROOM.doorChance);
        if (link.door && (bigExit || rng.chance(levelDef.doorChance))) {
          const iron = bigExit || rng.chance(levelDef.ironDoors || 0);
          // Some of the iron ones are already swinging shut. `clockRoom` is the room in front of it,
          // because the count starts when that room is first seen and the whole of the offer is
          // crossing it before the door does. Whether it keeps the flag is decided further down,
          // once the plan says who is actually standing in that room — a door on a clock in an empty
          // room is a timer with nothing to beat.
          const timed = iron && rng.chance(levelDef.clockDoors || 0);
          props.push({ x: link.door.x, y: link.door.y, kind: 'door', vertical: link.door.vertical,
            iron, timed, clockRoom: timed ? i - 1 : -1 });
        }
      }
    }
    x += w + rng.int(3, 7);
    // Still trending up the hill, but pulled back toward the middle of the world the further it
    // strays: a room hung above the last one starts the next stretch high already, and a chain that
    // only climbs ran into the top of the world and went on as a flat line along it.
    y += rng.int(-6, 3) + Math.round((H * 0.55 - (y + h / 2)) * 0.2);
  }

  // Exit: a 2-tall flight of stairs cut into the right wall of the last room, marked EXIT.
  const last = rooms[rooms.length - 1];
  const doorY = pickDoorY(last, 'right', rng);
  if (doorY < 0) return null;
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 3; dx++) tiles[(doorY + dy) * W + (last.x + last.w - 1 + dx)] = T.EXIT;
  }
  const exit = { x: (last.x + last.w) * TILE, y: (doorY + 1) * TILE };
  const exitTile = { x0: last.x + last.w - 1, y0: doorY };
  // The way out is barred. Every level ends on an iron door standing in front of its stairs, so the
  // last thing a level asks of you is to stand still in the open and break something noisy while
  // whatever is left of the room walks toward the sound. It used to end on the stairs simply being
  // there, which meant the last room of a level was the one room in it you could always outrun.
  props.push({ x: (last.x + last.w - 1.5) * TILE, y: (doorY + 1) * TILE,
    kind: 'door', vertical: true, iron: true, stair: true });

  // Every level after the first is entered the same way: up a flight cut into the left wall of the
  // first room. The goat starts at the top of it, a step inside.
  let entry = null;
  if (!levelDef.ritual) {
    const first = rooms[0], ey = pickDoorY(first, 'left', rng);
    if (ey < 0) return null;
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 3; dx++) tiles[(ey + dy) * W + (first.x - dx)] = T.ENTRY;
    }
    entry = { x0: first.x - 2, y0: ey, x: (first.x + 1.9) * TILE, y: (ey + 1) * TILE };
  }

  // Windows. THE RAFTERS is up in the roof of the hall and its own note has said "windows out into
  // the night" since it was written; there has never been one in the build. The renderer has known
  // how to draw one the whole time and the generator simply never made any, so every hole in the
  // game was a hole in the floor and the word meant nothing. They go in last, into wall that is
  // still wall, so nothing a corridor or a vault already cut through is touched.
  const windows = new Set();
  for (let i = 1; i < rooms.length - 1; i++) {
    if (rng.chance(levelDef.windows || 0)) carveWindow(tiles, W, rooms[i], rng, windows);
  }

  // The vault. A small room cut into the stone above or below one ordinary room in the middle of the
  // level, with one tile of doorway between them and an iron door in it. Nothing walks out of it and
  // nothing is on the way to the stairs: it is four blows, the noise of four blows, and a soul.
  const vault = levelDef.vaultAt !== undefined ? carveVault(tiles, W, H, rooms[levelDef.vaultAt], props, rng) : null;
  // A level that asks for a vault gets one. About one seed in two hundred put the room hard against
  // the top or the bottom of the world with no rock on either side to cut into, and the level went
  // out a soul short with nothing to say about it; a fresh seed is cheaper than a missing soul.
  if (levelDef.vaultAt !== undefined && !vault) return null;
  // The soul is guarded, now and then, by the same floor that guards everything else once a level
  // has taught it: on a level that already has spikes, half the time the last stretch of ground in
  // front of the vault's own door grows teeth too, so the fourth blow is not the only price of it.
  if (vault && levelDef.spikes && rng.chance(0.5)) {
    spikePatch(tiles, W, rooms[levelDef.vaultAt], props, rng, rng.int(4, 8), vault.doorTile);
  }

  // The soul gates. Every level stops you twice — in the middle and before the end (`gates` on the
  // level) — behind a barred door that no blow opens: whoever in that room is carrying its soul is
  // the bar, and swallowing it is what lifts it (on a mouse's level the middle one is her room and
  // her talisman is the bar). The way out of the room is narrowed to a single tile first, the same
  // way the sentry's room is, because a gate you can walk round is a decoration.
  const gates = [];
  for (const g of (levelDef.gates || [])) {
    if (!rooms[g] || g >= rooms.length - 1) return null;
    const at = gateSpot(tiles, W, rooms[g], props);
    if (!at) return null;
    const shopGate = g === shopRoomOf(levelDef);
    props.push({ x: at.x, y: at.y, kind: 'door', vertical: true, iron: true, gate: true, gateRoom: g, shopGate });
    // Where its soul lies: the middle of the room, which in a rest room is always bare floor.
    const r = rooms[g];
    gates.push({ room: g, x: at.x, y: at.y, shop: shopGate,
      soul: { x: (r.x + Math.floor(r.w / 2)) * TILE, y: (r.y + Math.floor(r.h / 2)) * TILE } });
  }

  // Sealed arenas. A second kind of gate, earned by winning rather than by a soul: both ends of the
  // room narrow to a single tile the same way the soul gate's does, and neither door has any give in
  // it until `game.updateSeals` finds the room empty. Only an arena with a room on both sides
  // qualifies — the entrance narrows the room before it and the exit narrows the arena itself, and
  // the last room of a level has no far corridor for that second cut.
  const sealedArenas = [];
  for (const a of (levelDef.arenas || [])) {
    if (!a.sealed) continue;
    const at = a.at;
    if (at <= 0 || at >= rooms.length - 1) return null;
    const enter = gateSpot(tiles, W, rooms[at - 1], props);
    const exit = gateSpot(tiles, W, rooms[at], props);
    if (!enter || !exit) return null;
    props.push({ x: enter.x, y: enter.y, kind: 'door', vertical: true, iron: true, seal: true, sealRoom: at });
    props.push({ x: exit.x, y: exit.y, kind: 'door', vertical: true, iron: true, seal: true, sealRoom: at });
    sealedArenas.push(at);
  }

  // Secrets. One or two a level: a patch of an ordinary room's own top or bottom wall that gives on
  // the second blow, with a rack tucked into the rock behind it and, less often, a patch of grass —
  // rarer and worth more than the milk a level's ordinary rooms already hand out on a rhythm, so a
  // wall worth breaking is sometimes worth more than the rack alone would have been. Never the pen, a
  // set piece or the vault's own room — only rock nothing else has already carved.
  // `secretsAfterBoss` keeps a wall that gives out of a level's opening rooms: level one is the
  // only level that needs telling, since a wall that cracks is not yet a thing the run has any
  // reason to go looking for before its own first arena has taught what a soul is worth chasing.
  const secretsAfter = levelDef.secretsAfterBoss && levelDef.arenas && levelDef.arenas[0] ? levelDef.arenas[0].at : -1;
  const secretPool = rng.shuffle(ordinaryRooms(levelDef, rooms.length).filter((i) => i !== levelDef.vaultAt && !trapRooms.has(i) && i > secretsAfter && i !== shopRoomOf(levelDef)));
  // The clover at his neck bends the odds here and nowhere else in the generator: a better chance
  // of the second wall, of grass behind either, and past a certain tier a wall in most rooms.
  const wantSecrets = luck.secret >= 3 ? Math.max(2, Math.floor(secretPool.length * 0.6))
    : 1 + (rng.chance(Math.min(1, TUNING.secret.chance2 * luck.secret)) ? 1 : 0);
  let secretsPlaced = 0;
  for (const idx of secretPool) {
    if (secretsPlaced >= wantSecrets) break;
    const spot = carveSecret(tiles, W, H, rooms[idx], rng);
    if (!spot) continue;
    props.push({ x: spot.wall.x, y: spot.wall.y, kind: 'secret', wallColor: levelDef.wall, wallTop: levelDef.wallTop,
      nicheTiles: spot.tiles, wallSide: spot.side });
    if (rng.chance(Math.min(1, TUNING.secret.healChance * luck.grass))) props.push({ x: spot.heal.x, y: spot.heal.y, kind: 'heal', big: true });
    props.push({ x: spot.weapon.x, y: spot.weapon.y, kind: 'weapon', weapon: rng.chance(TUNING.prop.weapon.swordShare) ? 'sword' : 'shield' });
    secretsPlaced++;
  }

  // The mouse. On the levels in `shop.levels`, in the middle soul gate instead of its soul: a hole
  // at the foot of that room's top or bottom wall — a mark on the stone, not a tunnel anybody walks
  // into — with her on the boards in front of it and her three offers laid out in a row before her. A level that asks for her gets her: a room that cannot take the hole
  // is a fresh seed rather than a gate with nothing in it to open it.
  let shop = null;
  const shopAt = shopRoomOf(levelDef);
  if (shopAt >= 0) {
    const spot = carveHole(tiles, W, H, rooms[shopAt], rng);
    if (!spot) return null;
    const stock = stockFor(levelDef, rng);
    shop = { room: shopAt, x: spot.mouse.x, y: spot.mouse.y, tiles: spot.tiles, side: spot.side, stock };
    props.push({ x: spot.mouse.x, y: spot.mouse.y, kind: 'mouse', nicheTiles: spot.tiles, wallSide: spot.side,
      gap: spot.gap, shopId: shopAt });
    props.push({ x: spot.left.x, y: spot.left.y, kind: 'ware', ware: stock[0], shopId: shopAt });
    props.push({ x: spot.right.x, y: spot.right.y, kind: 'ware', ware: stock[1], shopId: shopAt });
    // The third offer lies between the two, in the same row in front of her: the milk, instead of either.
    props.push({ x: spot.milk.x, y: spot.milk.y, kind: 'ware', ware: { id: 'milk', tier: 1 }, shopId: shopAt });
    shop.gap = spot.gap;
  }

  // Props from the template markers, and the men the plan asked for placed on whatever the room has.
  const plan = planEncounters(levelDef, rooms, rng);
  // Which of the doors on a clock keep it. The offer only means anything if the room in front of it
  // holds enough to make staying costly — a count running down in an empty room is a timer with
  // nothing to beat — and it is never hung on a room that is teaching: the room that introduces a
  // kind, or the quiet beat after one, is the one place a level asks you to stand and look at
  // something, and a door shutting on that is the level arguing with itself.
  for (const p of props) {
    if (!p.timed) continue;
    const cell = plan.rooms.get(p.clockRoom);
    const teaching = plan.introRooms.has(p.clockRoom) || plan.introRooms.has(p.clockRoom - 1);
    if (!cell || teaching || (cell.men || []).length < 2) { p.timed = false; p.clockRoom = -1; }
  }
  // Arms are rare, and a level can hold them back: nothing to pick up until it is this far in.
  // Level one shows the first stand at the halfway mark, so the first half of the run is the goat,
  // his head, and whatever the room was already built out of.
  const racksFrom = Math.round((levelDef.racksFrom || 0) * (n - 1));
  // The room that holds the first man of the run. Level one shuts the way out of it behind him and
  // paints the word for the button on the floor. Nothing is SCATTERED into it: no grating to herd
  // him onto and no bowl of milk. What it has is what `LESSON_TEMPLATE` puts there by hand — two
  // crates on the near half, so the room has a size the eye can read — and one man.
  let lessonRoom = null, lessonIndex = -1;
  if (levelDef.showControls) {
    for (const r of rooms) { const c = plan.rooms.get(r.index); if (c && c.intro) { lessonIndex = r.index; break; } }
  }
  let roasted = false;
  rooms.forEach((room) => {
    const spots = [];
    const cell = plan.rooms.get(room.index);
    // A gong is only worth anything with men in the room to answer it. In an empty room it is a
    // thing you hit once, hear nothing back from, and never touch again — which is how it came to
    // read as scenery. So the first rooms, the two control rooms and the pen simply do not get one.
    const manned = !!(cell && (cell.men.length || cell.boss));
    let wIdx = rng.int(0, 1);
    room.markers.forEach((m) => {
      const px = (m.tx + 0.5) * TILE, py = (m.ty + 0.5) * TILE;
      // A roast is picked off a hash of the tile, not the rng, so no seed moved when it landed —
      // and there is at most one a level, because a crocodile on every third fire stopped being a find.
      if (m.c === 'B') {
        const roast = !roasted && (((m.tx * 73856093) ^ (m.ty * 19349663)) >>> 0) % 1000 < TUNING.prop.brazier.roast * 1000;
        if (roast) roasted = true;
        props.push({ x: px, y: py, kind: 'brazier', roast });
      }
      else if (m.c === 'o') props.push({ x: px, y: py, kind: 'crate' });
      else if (m.c === 'b') { if (manned) props.push({ x: px, y: py, kind: 'bell' }); }
      else if (m.c === 'L') props.push({ x: px, y: py, kind: 'lamp' });
      else if (m.c === 't') { if (m.tx % 2 === 0 && m.ty % 2 === 0) props.push({ x: px + TILE / 2, y: py + TILE / 2, kind: 'table' }); }
      else if (m.c === 'M') props.push({ x: px, y: py, kind: 'mill', phase: rng.float(0, Math.PI * 2) });
      else if (m.c === 'S') props.push({ x: px, y: py, kind: 'spike' });
      // A boulder a template put down is held to the same promise as a scattered one: open floor all
      // round it, so it can never be the thing that closes a way through.
      else if (m.c === 'k') { if (rockFits(tiles, W, m.tx, m.ty, grass)) props.push({ x: px, y: py, kind: 'rock' }); }
      else if (m.c === 'X') room.bossSpot = { x: px, y: py };
      // A pair of stands alternates, so an arena always offers one of each rather than two swords,
      // and a lone one is the shield: a sword is two kills now and is not handed out one to a room.
      // The killbox's own stand is always the shield: the room is a rifle problem, and the shield is
      // the answer to a rifle that does not involve holding a man.
      // The ambush room's own stand is always the sword: it is the room that teaches the throw, and
      // a thrown sword kills the man it reaches while a thrown shield only knocks him flat — a
      // lesson whose payoff is "he gets back up" is not a lesson anybody keeps.
      else if (m.c === 'w') { if (room.index >= racksFrom) props.push({ x: px, y: py, kind: 'weapon', weapon: room.isAmbush ? 'sword' : room.isKillbox ? 'shield' : (wIdx++ % 2) ? 'sword' : 'shield' }); }
      else spots.push(m);
    });
    // Now and then a single stand of arms, anywhere a man might have left one. Never two, never
    // before the level says arms exist, and never in an arena — an arena carries its own pair.
    if (room.index >= Math.max(1, racksFrom) && !room.arena && !room.isRest && rng.chance(Math.min(1, (levelDef.racks || 0) * luck.racks))) {
      for (let a = 0; a < 30; a++) {
        const tx = rng.int(room.x + 2, room.x + room.w - 3), ty = rng.int(room.y + 2, room.y + room.h - 3);
        if (tiles[ty * W + tx] !== T.FLOOR) continue;
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        if (props.some((p) => len(p.x - px, p.y - py) < 1.8 * TILE)) continue;
        props.push({ x: px, y: py, kind: 'weapon', weapon: rng.chance(TUNING.prop.weapon.swordShare) ? 'sword' : 'shield' });
        break;
      }
    }
    // The grating, from the third level on. It goes down as one patch of floor rather than as a
    // scatter: a single grate is a curiosity you step over without noticing, and a stretch of eight
    // across the middle of a room is ground you have to decide about. Not in the control rooms, not
    // in the pen, and never under the furniture. A trap room already laid its own out in a shape;
    // throwing more over the top of it turns the shape back into noise.
    // Never a set piece: the Mill's own room is already narrowed to the one lane its lesson needs,
    // and a grate laid across the top of that on top of the arm's own sweep is two hazard systems
    // arguing over the same few tiles of floor rather than either one reading as a decision.
    if (room.index > 0 && !room.isTrap && !room.isAmbush && !room.isRest && !room.isMill && !room.arena && !room.isHall
        && !room.isGallery && !room.isKillbox && room.index !== lessonIndex && rng.chance(levelDef.spikes || 0)) {
      const S = TUNING.prop.spike;
      spikePatch(tiles, W, room, props, rng, rng.int(S.run[0], S.run[1]));
    }
    // Crates. Boxes of the compound's own stores, one to a tile, left where they were set down —
    // the plainest thing in a room: pick it up, throw it at a man, it comes apart on him.
    if (room.index > 0 && !room.isAmbush && !room.isRest && room.index !== lessonIndex && rng.chance(levelDef.crates || 0)) {
      const want = rng.int(2, 4);
      for (let a = 0, placed = 0; a < 40 && placed < want; a++) {
        const tx = rng.int(room.x + 1, room.x + room.w - 2), ty = rng.int(room.y + 1, room.y + room.h - 2);
        if (tiles[ty * W + tx] !== T.FLOOR) continue;
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        if (props.some((p) => len(p.x - px, p.y - py) < 1.4 * TILE)) continue;
        props.push({ x: px, y: py, kind: 'crate' });
        placed++;
      }
    }
    // A coop. Two tiles of slatted crate with a bird in it, standing where the compound keeps its
    // stores — `levelDef.coops` is the per-room chance and only the early floors set it. Wants a
    // clear pair of tiles and a wide berth from everything else, because a thing you have to walk
    // up to and put your head under twice is a thing you have to be able to stand in front of.
    if (room.index > 0 && !room.isAmbush && !room.isRest && room.index !== lessonIndex && rng.chance(levelDef.coops || 0)) {
      for (let a = 0; a < 40; a++) {
        const tx = rng.int(room.x + 1, room.x + room.w - 3), ty = rng.int(room.y + 1, room.y + room.h - 2);
        if (tiles[ty * W + tx] !== T.FLOOR || tiles[ty * W + tx + 1] !== T.FLOOR) continue;
        const px = (tx + 1) * TILE, py = (ty + 0.5) * TILE;
        if (props.some((p) => len(p.x - px, p.y - py) < 2.2 * TILE)) continue;
        props.push({ x: px, y: py, kind: 'coop' });
        break;
      }
    }
    // The cave's floor: a patch or three of tall grass, and a scatter of boulders. Neither in the pen
    // or a rest room, and a boulder never within a few tiles of the way in, so walking into a room is
    // never walking into a rock.
    if (room.index > 0 && !room.isRest && levelDef.grass && rng.chance(levelDef.grass)) {
      const G = TUNING.grass, count = rng.int(G.patch[0], G.patch[1]);
      for (let k = 0; k < count; k++) grassPatch(tiles, W, room, grass, props, rng, rng.int(G.size[0], G.size[1]));
    }
    if (room.index > 0 && !room.isRest && levelDef.rocks && rng.chance(levelDef.rocks)) {
      const want = rng.int(2, 4);
      for (let a = 0, placed = 0; a < 60 && placed < want; a++) {
        const tx = rng.int(room.x + 2, room.x + room.w - 3), ty = rng.int(room.y + 2, room.y + room.h - 3);
        if (!rockFits(tiles, W, tx, ty, grass)) continue;
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        if (props.some((p) => len(p.x - px, p.y - py) < 2.1 * TILE)) continue;
        if (room.enter && len(room.enter.x - px, room.enter.y - py) < 3 * TILE) continue;
        props.push({ x: px, y: py, kind: 'rock' });
        placed++;
      }
    }
    if (!cell) return;                                                       // the pen stays empty
    // The wheel's own lesson, on the level that first shows it: the two men stand past the arm, on
    // the far side of it from the door, and one of them cannot read it. `trapSense` does all of the
    // work — nought means he never sees a hazard and takes the arm in the chest on his way to you,
    // one means he always does and comes round it — so nothing here is scripted and neither man is
    // a special case anywhere else in the game. Sorted by distance from where you walk in, because
    // the room is flipped as freely as any other and "past the wheel" has to survive that.
    if (cell.lesson && room.enter) {
      const off = (m) => len((m.tx + 0.5) * TILE - room.enter.x, (m.ty + 0.5) * TILE - room.enter.y);
      const far = spots.filter((m) => m.c === 'e').sort((a, b) => off(a) - off(b)).slice(-2);
      if (far.length >= 2) {
        // The nearer of the two starts running first, so he is the one who cannot read it: the arm
        // takes him while the other is still coming round, which is the order that reads.
        far.forEach((m, i) => spawns.push({ x: (m.tx + 0.5) * TILE, y: (m.ty + 0.5) * TILE,
          kind: 'bearer', roomIndex: room.index, sense: i === 0 ? 0 : 1 }));
        return;
      }
    }
    // The first man of the run holds a post instead of walking at you. He stands a few tiles inside
    // the mouth of the room with his back to it, and he is the only man in it: a headbutt is a thing
    // you have to try on somebody, and somebody charging you is not somebody you can try it on.
    if (cell.intro && !lessonRoom && levelDef.showControls) {
      lessonRoom = room;
      // He does not stand in the middle of the room to be admired: he stands in the way out of it,
      // and the way out is one tile wide. Everybody who played it walked round the first man without
      // trying anything on him, so there is nowhere left to walk round to — the room opens when he
      // goes down and not before.
      const at = levelDef.sentryIntro ? blockSpot(tiles, W, room, props) : null;
      if (at) {
        spawns.push({ x: at.x, y: at.y, kind: cell.intro === 'champion' ? 'bearer' : cell.intro,
          champion: cell.intro === 'champion', roomIndex: room.index, intro: true, sentry: true,
          facing: Math.PI });                                   // back to the door, facing the room
        return;
      }
    }
    rng.shuffle(spots);
    // A rifle likes a post and a mage likes his own mark; everyone else takes what is left.
    const take = (kind) => {
      const wants = kind === 'hunter' ? 'rR' : kind === 'seer' ? 'mr' : 'e';
      let i = spots.findIndex((m) => wants.includes(m.c));
      if (i < 0) i = spots.length ? 0 : -1;
      if (i >= 0) { const m = spots.splice(i, 1)[0]; return { x: (m.tx + 0.5) * TILE, y: (m.ty + 0.5) * TILE }; }
      // Out of markers, which from level four on is most rooms: a late room buys nine men and its
      // template wrote four places to stand. This used to take the first floor tile the dice landed
      // on, so men came out stacked on one another, inside the furniture, and a fifth of them within
      // a lunge of the door you walk in by. Score the room instead and take the best of a few rolls:
      // clear of the others, clear of the props, and well in from the way in.
      let best = null, bestScore = -Infinity;
      for (let k = 0; k < 60; k++) {
        const tx = rng.int(room.x + 1, room.x + room.w - 2), ty = rng.int(room.y + 1, room.y + room.h - 2);
        if (tiles[ty * W + tx] !== T.FLOOR) continue;
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        let near = Infinity;
        for (const s of spawns) if (s.roomIndex === room.index) near = Math.min(near, len(s.x - px, s.y - py));
        let prop = Infinity;
        for (const p of props) if (p.kind !== 'door' && p.kind !== 'spike') prop = Math.min(prop, len(p.x - px, p.y - py));
        const door = room.enter ? len(room.enter.x - px, room.enter.y - py) : Infinity;
        const score = Math.min(near, 3 * TILE) + Math.min(prop, 1.2 * TILE) * 2 + Math.min(door, 6 * TILE) * 0.6;
        if (score > bestScore) { bestScore = score; best = { x: px, y: py }; }
      }
      return best;
    };
    if (cell.boss) {
      const at = room.bossSpot || take(cell.boss);
      if (at) spawns.push({ x: at.x, y: at.y, kind: cell.boss === 'champion' ? 'bearer' : cell.boss,
        elite: cell.boss !== 'butcher', champion: cell.boss === 'champion', boss: true, roomIndex: room.index });
    }
    let slot = 0;
    for (const kind of cell.men) {
      const at = take(kind); const i = slot++;
      if (!at) continue;
      spawns.push({ x: at.x, y: at.y, kind: kind === 'champion' ? 'bearer' : kind,
        champion: kind === 'champion', roomIndex: room.index, intro: cell.intro === kind,
        // The first few men of a killbox are its rifles, and they are already watching the door.
        alert: cell.alert !== undefined && i < cell.alert });
    }
  });

  // Some of the men in a room with grass in it are lying in the grass. Not the boss, not a brute and
  // not the dead — a man who hides is an ordinary one — and each goes to the grass tile of his own
  // room with the most grass round it, so what shows of him is the top of him and nothing more.
  if (grass.size) {
    const taken = new Set();
    for (const sp of spawns) {
      if (sp.boss || sp.champion || sp.sentry || sp.alert || !['bearer', 'dog', 'hunter', 'seer'].includes(sp.kind)) continue;
      const room = rooms[sp.roomIndex];
      if (!room || !rng.chance(TUNING.grass.lurk)) continue;
      let best = -1, bestN = 0;
      for (let ty = room.y + 1; ty < room.y + room.h - 1; ty++) for (let tx = room.x + 1; tx < room.x + room.w - 1; tx++) {
        const i = ty * W + tx;
        if (!grass.has(i) || taken.has(i) || tiles[i] !== T.FLOOR) continue;
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        if (inFurniture(px, py, props) || spawns.some((o) => o !== sp && len(o.x - px, o.y - py) < 1.2 * TILE)) continue;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (grass.has(i + dy * W + dx)) n++;
        if (n > bestN) { bestN = n; best = i; }
      }
      if (best < 0) continue;
      taken.add(best);
      sp.x = (best % W + 0.5) * TILE; sp.y = (Math.floor(best / W) + 0.5) * TILE; sp.lurk = true;
    }
  }

  // Lone rifle posts, once rifles are something you have met. A rifle on its own is a different
  // problem from a rifle inside a crowd: you have to cross its line rather than out-run the pile.
  if (levelDef.lonePosts && plan.hunterFrom >= 0) {
    const eligible = rng.shuffle(rooms.filter((r) => r.index > plan.hunterFrom && !r.arena && !r.isMill
      && !r.isGallery && !r.isHall && !r.isKillbox && !r.isRest && !plan.introRooms.has(r.index)));
    let placed = 0;
    for (const room of eligible) {
      if (placed >= levelDef.lonePosts) break;
      // The room's own plan already counts: a post on top of two rifles is a wall, not a line to cross.
      if (spawns.filter((s) => s.roomIndex === room.index && s.kind === 'hunter').length >= plan.caps.hunter) continue;
      for (let k = 0; k < 40; k++) {
        const tx = rng.int(room.x + 2, room.x + room.w - 3), ty = rng.int(room.y + 2, room.y + room.h - 3);
        if (tiles[ty * W + tx] !== T.FLOOR) continue;
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        if (spawns.some((s) => len(s.x - px, s.y - py) < 5 * TILE)) continue;
        spawns.push({ x: px, y: py, kind: 'hunter', roomIndex: room.index, lone: true });
        placed++;
        break;
      }
    }
  }

  // The bomb. A level carries one or it does not, and it goes to whichever ordinary room scored
  // the most threat rather than to a secret's own quiet niche — a bomb tucked behind a broken
  // wall had nothing near it worth throwing it at, which is the whole reason a rare find sat
  // unused. `spawns` is final by now, so the score is the room's real men, boss included.
  if (rng.chance(TUNING.prop.bomb.chance)) {
    const scoreOf = (s) => THREAT[s.champion ? 'champion' : s.kind] || 0;
    const eligible = rooms.filter((r) => r.index > 0 && !r.arena && !r.isMill && !r.isHall
      && !r.isGallery && !r.isKillbox && !r.isTrap && !r.isAmbush && !r.isRest && r.index !== lessonIndex);
    let best = null, bestScore = -1;
    for (const room of eligible) {
      const score = spawns.filter((s) => s.roomIndex === room.index).reduce((a, s) => a + scoreOf(s), 0);
      if (score > bestScore) { best = room; bestScore = score; }
    }
    if (best && bestScore > 0) {
      for (let a = 0; a < 40; a++) {
        const tx = rng.int(best.x + 1, best.x + best.w - 2), ty = rng.int(best.y + 1, best.y + best.h - 2);
        if (tiles[ty * W + tx] !== T.FLOOR) continue;
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        if (props.some((p) => len(p.x - px, p.y - py) < 1.6 * TILE)) continue;
        props.push({ x: px, y: py, kind: 'bomb' });
        break;
      }
    }
  }

  // Milk, on a rhythm rather than on a roll. A run is meant to be offered a bowl every few rooms,
  // so the level is cut into that many bands and each band gives one up — the room inside a band is
  // random, the spacing is not. `heals` is a floor: a long level gets more bowls, never a longer
  // dry spell, and the same eligibility as before keeps them out of the set pieces.
  const healable = rooms.filter((r) => r.index > 0 && !r.arena && !r.isMill && !r.isGallery
    && !r.isKillbox && r.index !== lessonIndex);
  const wantHeals = Math.min(healable.length, Math.max(levelDef.heals || 0, Math.ceil((n - 1) / TUNING.prop.heal.every)) + (luck.heals || 0));
  const healRooms = [], usedHeal = new Set();
  for (let i = 0; i < wantHeals; i++) {
    // The band is measured in doors, not in eligible rooms, so a run of arenas and set pieces cannot
    // stretch the dry spell: the bowl goes to whatever ordinary room sits nearest the middle of it.
    const mid = 1 + (i + 0.5) * (n - 1) / wantHeals;
    let room = null;
    for (const r of healable) {
      if (usedHeal.has(r.index)) continue;
      if (!room || Math.abs(r.index - mid) < Math.abs(room.index - mid)) room = r;
    }
    if (!room) break;
    usedHeal.add(room.index); healRooms.push(room);
  }
  // From level 4 on, a level carries enough forced rooms — two or three arenas, the mill, the
  // vault, a killbox — that a band's nearest eligible room can land well past what its idealised
  // width promised, and several thin bands can end up crowding the same stretch while another
  // goes hungry. This walks the picks in room order and drops one more bowl into any real gap
  // over `heal.gapMax`, rather than trusting the band math alone to have kept every gap that short.
  if (LEVELS.indexOf(levelDef) >= 3) {
    healRooms.sort((a, b) => a.index - b.index);
    const marks = [0, ...healRooms.map((r) => r.index), n - 1];
    for (let i = 0; i < marks.length - 1; i++) {
      if (marks[i + 1] - marks[i] <= TUNING.prop.heal.gapMax) continue;
      const midGap = (marks[i] + marks[i + 1]) / 2;
      let room = null;
      for (const r of healable) {
        if (usedHeal.has(r.index)) continue;
        if (r.index <= marks[i] || r.index >= marks[i + 1]) continue;
        if (!room || Math.abs(r.index - midGap) < Math.abs(room.index - midGap)) room = r;
      }
      if (!room) continue;
      usedHeal.add(room.index); healRooms.push(room);
      marks.splice(i + 1, 0, room.index);
      i--; // recheck the two halves the new pick just split
    }
  }
  // Where in the room it goes. This was the one scatter in the generator that asked whether the tile
  // was floor and nothing else, so a bowl could be laid down on top of a brazier — the last heart of
  // a level standing in a fire, drawn over the coals with the flame coming up behind it. It keeps a
  // clearance from the furniture now and a wide berth from anything alight, and the second pass gives
  // up the clearance but never the berth: a bowl may be awkwardly placed, it may not be in a fire.
  healRooms.forEach((room) => {
    const alight = (p) => p.kind === 'brazier' || p.kind === 'lamp';
    const spots = [];
    for (let ty = room.y + 2; ty <= room.y + room.h - 3; ty++) {
      for (let tx = room.x + 2; tx <= room.x + room.w - 3; tx++) {
        if (tiles[ty * W + tx] !== T.FLOOR) continue;
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        let fire = Infinity, near = Infinity;
        for (const p of props) { const d = len(p.x - px, p.y - py); if (alight(p)) fire = Math.min(fire, d); else near = Math.min(near, d); }
        spots.push({ x: px, y: py, fire, near });
      }
    }
    if (!spots.length) return;
    // Clear of the furniture and a long way from anything alight. A narrow room may hold nothing that
    // good, and then the clearance goes before the berth does: the bowl may stand awkwardly, it may
    // not stand in a fire. The last resort is the three tiles furthest from the nearest flame, because
    // the level is promised a bowl in this band and not getting one is the worse of the two faults.
    let pool = spots.filter((p) => p.fire >= 2.6 * TILE && p.near >= 1.7 * TILE);
    if (!pool.length) pool = spots.filter((p) => p.fire >= 2.6 * TILE);
    if (!pool.length) pool = spots.slice().sort((a, b) => b.fire - a.fire).slice(0, 3);
    // The ambush room is the one room where the bowl is placed rather than scattered: it goes in the
    // far corner, past the men, so grazing it is something you do after the room is won and never
    // something in the lane the blade is thrown down.
    const off = (p) => len(p.x - room.enter.x, p.y - room.enter.y);
    const pick = room.isAmbush && room.enter
      ? pool.reduce((a, b) => (off(b) > off(a) ? b : a), pool[0])
      : pool[rng.int(0, pool.length - 1)];
    props.push({ x: pick.x, y: pick.y, kind: 'heal' });
  });

  // Where the mouse's milk goes if it is the offer taken, worked out once the room's own furniture is
  // in: the floor nearest her gap, more than a tile off it so nobody grazes in her doorway, spread so
  // the bowls read as three and not as one smudge, and — the promise every other bowl keeps — never in
  // a fire. The spots ride on the milk ware; nothing is laid down until it is chosen.
  if (shop) {
    const offer = props.find((p) => p.kind === 'ware' && p.shopId === shop.room && p.ware.id === 'milk');
    offer.milkSpots = [];
    const room = rooms[shop.room], cand = [];
    for (let ty = room.y + 1; ty < room.y + room.h - 1; ty++) for (let tx = room.x + 1; tx < room.x + room.w - 1; tx++) {
      if (tiles[ty * W + tx] !== T.FLOOR) continue;
      const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE, d = len(px - shop.gap.x, py - shop.gap.y);
      if (d < 2.4 * TILE) continue;
      let fire = Infinity, near = Infinity;
      for (const p of props) { const e = len(p.x - px, p.y - py); if (p.kind === 'brazier' || p.kind === 'lamp') fire = Math.min(fire, e); else near = Math.min(near, e); }
      if (fire < 2.2 * TILE || near < 0.9 * TILE) continue;
      cand.push({ px, py, d });
    }
    cand.sort((p, q) => p.d - q.d);
    let laid = 0;
    for (const c of cand) {
      if (laid >= TUNING.shop.heals) break;
      if (offer.milkSpots.some((o) => len(o.x - c.px, o.y - c.py) < 1.3 * TILE)) continue;
      offer.milkSpots.push({ x: c.px, y: c.py }); laid++;
    }
  }

  const centre = { x: (rooms[0].x + rooms[0].w / 2) * TILE, y: (rooms[0].y + rooms[0].h / 2) * TILE };
  const start = entry ? { x: entry.x, y: entry.y } : centre;
  // You do not wake on the altar. You wake in the pen beside it, and the pen is only bars.
  if (levelDef.startCage) props.push(...buildCage(start.x, start.y));
  // The other cage in the ritual room is shut for good, and what is in it is not getting up.
  if (levelDef.ritual) {
    const D = TUNING.prop.deadCage;
    props.push(...buildCage(start.x + D.dx * TILE, start.y + D.dy * TILE, D.halfW, D.halfH, true));
  }
  if (!reachable(tiles, W, H, Math.floor(start.x / TILE), Math.floor(start.y / TILE), last.x + last.w - 1, doorY)) return null;

  // Safety: nothing spawns within 5 tiles of the start, and the start room keeps no props underfoot.
  const filtered = spawns.filter((s) => len(s.x - start.x, s.y - start.y) > 5 * TILE);
  const cleanProps = props.filter((p) => p.kind === 'door' || p.kind === 'cage' || len(p.x - start.x, p.y - start.y) > 3 * TILE);
  // Nobody is put down inside the furniture. A spawn marker and a crate scattered later could land
  // on the same tile, and a man who starts inside a box is a man who never gets out of it — he
  // stood there the whole level, wedged. Walk him out in rings to the nearest clear floor of the
  // same room; the sentry is exempt because `blockSpot` already chose his tile with the props in it.
  for (const sp of filtered) {
    if (sp.sentry || !inFurniture(sp.x, sp.y, cleanProps)) continue;
    const tx0 = Math.floor(sp.x / TILE), ty0 = Math.floor(sp.y / TILE);
    const room = rooms[sp.roomIndex];
    let moved = false;
    for (let r = 1; r <= 5 && !moved; r++) {
      for (let dy = -r; dy <= r && !moved; dy++) for (let dx = -r; dx <= r && !moved; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = tx0 + dx, ty = ty0 + dy;
        if (tiles[ty * W + tx] !== T.FLOOR) continue;
        if (room && (tx <= room.x || tx >= room.x + room.w - 1 || ty <= room.y || ty >= room.y + room.h - 1)) continue;
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        if (inFurniture(px, py, cleanProps)) continue;
        if (filtered.some((o) => o !== sp && len(o.x - px, o.y - py) < 0.8 * TILE)) continue;
        sp.x = px; sp.y = py; moved = true;
      }
    }
  }
  // The level's own hint goes across the middle of the first room; the pen's own prompt goes below the pen.
  // It carries the room it is painted in, so a long line can be broken and fitted to the floor it
  // is lying on rather than running off both ends of it, and the button it is about if it is about one.
  const hints = levelDef.hint ? [{ x: centre.x, y: centre.y - 2.0 * TILE, text: levelDef.hint,
    w: rooms[0].w * TILE, key: levelDef.hintKey || null }] : [];
  // A tile lower than it was, to leave room under the bars for the line about moving.
  const cagePrompt = levelDef.startCage ? { x: start.x, y: start.y + 3.05 * TILE } : null;
  // Ape Out paints the controls on the floor. Every block now lies in the room that gives you
  // something to try it on: there are no empty rooms of text any more, because two of them were
  // read, nodded at and not connected to anything — the first player we watched got all the way to
  // the wheel without working out that the men could be hit at all.
  const controls = [];
  if (levelDef.showControls) {
    // Block 0 waits for the cage to give, and then takes over the exact spot the headbutt prompt was
    // painting: moving is the next thing worth saying once the one that got him out has been said.
    controls.push({ x: start.x, y: cagePrompt ? cagePrompt.y : start.y + 1.8 * TILE, w: 13 * TILE, part: 0 });
    // Block 1 is grab and throw, in the room that stands a blade inside the door and a crate a step
    // past it with the men well down the far end — see `AMBUSH_TEMPLATE`.
    const amb = rooms[levelDef.ambushAt];
    if (amb) controls.push({ x: (amb.x + amb.w / 2) * TILE, y: (amb.y + amb.h / 2) * TILE, w: amb.w * TILE, part: 1 });
    // Block 2 is the headbutt, on the floor of the room that finally has a man standing on it.
    if (lessonRoom) controls.push({ x: (lessonRoom.x + lessonRoom.w / 2) * TILE,
      y: (lessonRoom.y + lessonRoom.h / 2) * TILE, w: lessonRoom.w * TILE, part: 2 });
    // The roll used to be taught here too, before there was a single thing in the level worth
    // dodging. It waits instead for the first room past the lesson that already holds a small crowd
    // — a dodge means nothing as a word on an empty floor — picked closest to the level's own middle
    // so it lands well into the run rather than right on the man who is still teaching the headbutt.
    const firstArenaAt = levelDef.arenas && levelDef.arenas[0] ? levelDef.arenas[0].at : -1;
    const eligible = ordinaryRooms(levelDef, rooms.length)
      .filter((i) => i !== lessonIndex && i !== levelDef.vaultAt && i !== levelDef.ambushAt && !trapRooms.has(i))
      .map((i) => ({ i, men: ((plan.rooms.get(i) || {}).men || []).length }))
      .filter((c) => c.men >= 1);
    const byIndex = new Map(eligible.map((c) => [c.i, c]));
    // The room right outside a level's own first arena is where the dodge and the point-blank
    // parry actually matter — whatever is on the far side of that door is the first real fight
    // in the run, so this is a hard preference and not merely a tiebreaker: walk back from that
    // door looking for anywhere to paint it, a small crowd first and a single man second, and only
    // give up on landing before the fight at all once there is nothing eligible left to walk back
    // to. `closest to the middle` used to win outright whenever the exact room before the door
    // happened to hold nobody, which could land the line on the far side of the level's first real
    // fight instead of before it.
    let pick = null;
    if (firstArenaAt > 0) {
      for (const wantCrowd of [true, false]) {
        for (let i = firstArenaAt - 1; i >= 1 && !pick; i--) {
          const c = byIndex.get(i);
          if (c && (!wantCrowd || c.men >= 2)) pick = c;
        }
        if (pick) break;
      }
    }
    if (!pick && eligible.length) {
      // No populated ordinary room stands before the level's own first arena at all — a short
      // level with the arena right past the pen. Falls back to the old placement: a small crowd
      // closest to the level's own middle, so the line still lands somewhere worth trying it.
      const mid = (rooms.length - 1) / 2;
      const crowded = eligible.filter((c) => c.men >= 2);
      const rollCandidates = (crowded.length ? crowded : eligible).slice()
        .sort((a, b) => Math.abs(a.i - mid) - Math.abs(b.i - mid));
      pick = rollCandidates[0];
    }
    if (pick) {
      const r = rooms[pick.i];
      controls.push({ x: (r.x + r.w / 2) * TILE, y: (r.y + r.h / 2) * TILE, w: r.w * TILE, part: 3 });
    }
  }
  return { W, H, tiles, rooms, spawns: filtered, props: cleanProps, start, exit, exitTile, entry, seed, def: levelDef,
    hints, controls, cagePrompt, vault, windows, plan, gates, sealedArenas, shop,
    // Grass lying under a wall that went back up is not grass: only what is still on floor.
    grass: [...grass].filter((i) => tiles[i] === T.FLOOR) };
}

// The mouse's hole: a spot at the foot of the room's own top or bottom wall with solid rock behind
// it, so the ogre's breach never trades on a room or a corridor. Nothing is cut — `gap` is where
// the burrow is drawn and where the ogre comes through the wall.
// Every place a room's top or bottom wall could take the hole — five tiles of wall and niche row
// still rock, three of guard row behind that. Shared with `GEN_RULES.shop`, which asks it of the
// rooms the generator passed over to know whether passing them over was fair.
function holeSpots(tiles, W, H, room) {
  const out = [];
  for (const side of ['up', 'down']) {
    const wallRow = side === 'up' ? room.y : room.y + room.h - 1;
    const nicheRow = side === 'up' ? room.y - 1 : room.y + room.h;
    const guardRow = side === 'up' ? room.y - 2 : room.y + room.h + 1;
    if (nicheRow < 1 || guardRow < 1 || guardRow >= H - 1) continue;
    for (let tx = room.x + 3; tx < room.x + room.w - 3; tx++) {
      let clear = true;
      for (const [cx, cy] of [[tx - 2, wallRow], [tx - 1, wallRow], [tx, wallRow], [tx + 1, wallRow], [tx + 2, wallRow],
        [tx - 2, nicheRow], [tx - 1, nicheRow], [tx, nicheRow], [tx + 1, nicheRow], [tx + 2, nicheRow],
        [tx - 1, guardRow], [tx, guardRow], [tx + 1, guardRow]]) {
        if (tiles[cy * W + cx] !== T.WALL) { clear = false; break; }
      }
      if (clear) out.push({ tx, side, wallRow, nicheRow });
    }
  }
  return out;
}
function carveHole(tiles, W, H, room, rng) {
  const spots = holeSpots(tiles, W, H, room);
  if (!spots.length) return null;
  const { tx, side, wallRow } = spots[rng.int(0, spots.length - 1)];
  // Nothing is cut any more: the hole is a mark at the foot of the wall that nobody walks into, and
  // she sits on the first row of boards in front of it with her wares laid out on the row after.
  // A tunnel you could step into read as a room to explore rather than as her doorway.
  const into = side === 'up' ? 1 : -1, row = wallRow + into, front = wallRow + into * 2;
  const foot = side === 'up' ? (wallRow + 1) * TILE : wallRow * TILE;
  const spread = TUNING.shop.spread * TILE;
  return {
    mouse: { x: (tx + 0.5) * TILE, y: (row + 0.5) * TILE },
    left: { x: (tx + 0.5) * TILE - spread, y: (front + 0.5) * TILE },
    right: { x: (tx + 0.5) * TILE + spread, y: (front + 0.5) * TILE },
    milk: { x: (tx + 0.5) * TILE, y: (front + 0.5) * TILE },
    gap: { x: (tx + 0.5) * TILE, y: foot },
    tiles: [],
    side,
  };
}

// Which room of a level the mouse stands in: the middle gate, on the levels she visits; -1 elsewhere.
function shopRoomOf(levelDef) {
  const li = LEVELS.indexOf(levelDef);
  return TUNING.shop.levels.includes(li) && levelDef.gates && levelDef.gates.length ? levelDef.gates[0] : -1;
}
// What a mouse stocks: `TUNING.shop.wares` distinct artifacts, all at the tier of this visit — the
// n-th level in `shop.levels` sells tier n, so every mouse of a run has something the last one did
// not. Nothing is priced: the offer is a choice, not a sale.
function stockFor(levelDef, rng) {
  const S = TUNING.shop, li = LEVELS.indexOf(levelDef);
  const visit = S.levels.filter((l) => l <= li).length;
  const tier = clamp(visit, 1, 3);
  return rng.shuffle(ARTIFACTS.slice()).slice(0, S.wares).map((a) => ({ id: a.id, tier }));
}

// A ring of iron bars around a point. The pen around the start comes apart under a headbutt;
// a `deco` cage is scenery: it blocks, it rings when hit, and it never opens.
function buildCage(cx, cy, halfW, halfH, deco) {
  const C = TUNING.prop.cage, out = [];
  const hw = (halfW || C.halfW) * TILE, hh = (halfH || C.halfH) * TILE;
  const nx = Math.max(2, Math.round(hw * 2 / C.spacing)), ny = Math.max(2, Math.round(hh * 2 / C.spacing));
  const bar = (x, y, axis) => { const b = { x, y, kind: 'cage', axis }; if (deco) b.deco = true; out.push(b); };
  for (let i = 0; i <= nx; i++) {
    const x = cx - hw + (i / nx) * hw * 2;
    bar(x, cy - hh, 'h'); bar(x, cy + hh, 'h');
  }
  for (let j = 1; j < ny; j++) {
    const y = cy - hh + (j / ny) * hh * 2;
    bar(cx - hw, y, 'v'); bar(cx + hw, y, 'v');
  }
  return out;
}

function pickDoorY(room, side, rng) {
  const col = side === 'right' ? room.w - 2 : 1;
  const candidates = [];
  for (let ty = 1; ty < room.h - 2; ty++) {
    if (room.tpl.rows[ty][col] !== '#' && room.tpl.rows[ty][col] !== 'P' &&
        room.tpl.rows[ty + 1][col] !== '#' && room.tpl.rows[ty + 1][col] !== 'P') candidates.push(room.y + ty);
  }
  if (!candidates.length) return -1;
  return rng.pick(candidates);
}

// Carves an S-shaped corridor — two tiles wide by default, wider where a level asks for it — and
// returns a sensible spot for a door. A wide corridor eats the borders it passes through, which is
// how the open level ends up reading as one yard rather than a row of boxes.
function carveCorridor(tiles, W, a, b, rng, width) {
  const wide = Math.max(2, width || 2);
  const H = tiles.length / W;
  // A band wider than two is kept inside the height of the wall it goes through. Picked for two
  // tiles, a five-wide band ran on past the room's bottom wall into the rock under it, where the
  // shaft out of a room hung below that one also runs — the two corridors met, and the room had a
  // second way out that no gate, seal or clamp over its real one could shut.
  const fit = (r, y) => (y < 0 || wide <= 2 ? y : Math.max(r.y + 1, Math.min(y, r.y + r.h - 1 - wide)));
  const yA = fit(a, pickDoorY(a, 'right', rng));
  const yB = fit(b, pickDoorY(b, 'left', rng));
  if (yA < 0 || yB < 0) return null;
  const xA = a.x + a.w - 1, xB = b.x;
  // The turn is kept clear of `b`'s own wall where there is rock enough for it: a five-wide turn
  // centred in a short gap ran down through the wall and out under the room, for the same reason.
  const midX = clamp(Math.floor((xA + xB) / 2), xA + 1, Math.max(xA + 1, xB - wide));
  const carve = (tx, ty) => { if (tx >= 0 && tx < W && ty >= 1 && ty < H - 1) tiles[ty * W + tx] = T.FLOOR; };
  const band = (tx, ty) => { for (let k = 0; k < wide; k++) carve(tx, ty + k); };
  for (let tx = xA; tx <= midX + wide - 1; tx++) band(tx, yA);
  // The stretch of corridor leaving `a`. A room that has to be shut behind one man needs to know
  // exactly which tiles let you out of it.
  a.exitBand = { y: yA, x0: xA, x1: midX + wide - 1, wide };
  // The tiles of `a`'s own wall the corridor cut through: stone them back up and `a` is shut off
  // from everything after it (`game.updateClamps`, held by `GEN_RULES.clamp`).
  a.exitMouth = { tiles: Array.from({ length: wide }, (_, k) => (yA + k) * W + xA), x: (xA + 0.5) * TILE, y: (yA + wide / 2) * TILE, vertical: true, span: wide };
  const y0 = Math.min(yA, yB), y1 = Math.max(yA, yB) + wide - 1;
  for (let ty = y0; ty <= y1; ty++) for (let k = 0; k < wide; k++) carve(midX + k, ty);
  for (let tx = midX; tx <= xB; tx++) band(tx, yB);
  // Where the corridor opens into b, a step inside its wall: a room that wants to stand something in
  // the way of whoever walks in needs to know which way that is.
  const enter = { x: (xB + 1) * TILE, y: (yB + wide / 2) * TILE };
  if (y1 - y0 >= 4) return { enter, door: { x: (midX + 1) * TILE, y: (Math.floor((y0 + y1) / 2) + 0.5) * TILE, vertical: false } };
  if (midX - xA >= 3) return { enter, door: { x: (Math.floor((xA + midX) / 2) + 0.5) * TILE, y: (yA + 1) * TILE, vertical: true } };
  return { enter, door: null };
}

// May room `i` hang above or below room `i - 1`? Not if either of them is built for a door in its
// left or right wall: a set piece, a room whose sides mean something (`noFlipX`), the two teaching
// rooms, and any room a gate or a seal has to narrow — `narrowExit` walls up a horizontal band.
function stackable(levelDef, i, source, sentryAt) {
  if (source.noFlipX) return false;
  const set = (j) => j === 0 || j === levelDef.millAt || j === levelDef.hallAt || j === levelDef.galleryAt
    || j === levelDef.killboxAt || j === levelDef.ambushAt || j === sentryAt;
  if (set(i) || i - 1 === sentryAt) return false;
  // A gate room keeps its rock: the mouse's hole is cut into the wall of the middle one, and the
  // room after either has to leave through a side wall for `narrowExit` to have a band to shut.
  const gates = levelDef.gates || [];
  if (gates.includes(i) || gates.includes(i - 1)) return false;
  for (const a of (levelDef.arenas || [])) {
    if (a.sealed && (a.at === i || a.at === i - 1 || a.at === i + 1)) return false;
  }
  return true;
}

// Where a stacked room goes: over or under `a`, sharing at least `STACK.minOverlap` of its width and
// never reaching further left than `a` does — everything earlier in the chain lies left of `a`, so
// that is what keeps the new room off it — nor stopping short of `a`'s right wall, so the corridor
// out of the new room never has to cross `a` to get on. It leans toward the middle of the world.
function stackSpot(a, w, h, H, rng, width) {
  const lo = a.x + Math.max(0, a.w - w), hi = a.x + a.w - STACK.minOverlap;
  if (lo > hi) return null;
  // A wide level's shaft is as wide as its corridors, and its jog needs that much rock to run in.
  const gap = Math.max(rng.int(STACK.gap[0], STACK.gap[1]), (width || 2) + 2);
  const up = { dir: 'up', y: a.y - gap - h }, down = { dir: 'down', y: a.y + a.h + gap };
  const ok = (c) => c.y >= 2 && c.y + h <= H - 3;
  const order = a.y + a.h / 2 > H / 2 ? [up, down] : [down, up];
  const pick = order.find(ok);
  if (!pick) return null;
  return { dir: pick.dir, x: rng.int(lo, hi), y: pick.y };
}

// The column a shaft may leave or enter a room by: `wide` tiles of the room's top (or bottom) row of
// floor that are clear of the template's own walls and pillars, inside the span both rooms share
// where it can be, so the jog between the two is short.
function pickDoorX(room, side, wide, lo, hi, rng) {
  const row = side === 'top' ? 1 : room.h - 2;
  const all = [], inside = [];
  for (let tx = 1; tx + wide <= room.w - 1; tx++) {
    let ok = true;
    for (let k = 0; k < wide && ok; k++) { const c = room.tpl.rows[row][tx + k]; ok = c !== '#' && c !== 'P' && c !== 'O'; }
    if (!ok) continue;
    all.push(room.x + tx);
    if (room.x + tx >= lo && room.x + tx + wide - 1 <= hi) inside.push(room.x + tx);
  }
  const from = inside.length ? inside : all;
  return from.length ? rng.pick(from) : -1;
}

// The vertical twin of `carveCorridor`: out of `a`'s top wall (or bottom), a jog across the rock in
// between, and into `b`'s bottom wall (or top). The door, when there is one, hangs across the shaft.
function carveShaft(tiles, W, a, b, dir, rng, width) {
  const wide = Math.max(2, width || 2);
  const H = tiles.length / W;
  const lo = Math.max(a.x, b.x) + 1, hi = Math.min(a.x + a.w, b.x + b.w) - 2;
  const xA = pickDoorX(a, dir === 'up' ? 'top' : 'bottom', wide, lo, hi, rng);
  const xB = pickDoorX(b, dir === 'up' ? 'bottom' : 'top', wide, lo, hi, rng);
  if (xA < 0 || xB < 0) return null;
  // The wall rows the shaft cuts through, and the rock between them.
  const yA = dir === 'up' ? a.y : a.y + a.h - 1;
  const yB = dir === 'up' ? b.y + b.h - 1 : b.y;
  const top = Math.min(yA, yB), bot = Math.max(yA, yB);
  const carve = (tx, ty) => { if (tx >= 1 && tx < W - 1 && ty >= 1 && ty < H - 1) tiles[ty * W + tx] = T.FLOOR; };
  // The jog runs along the middle of the rock, `wide` rows deep so a wide level stays wide.
  const jog = clamp(Math.floor((top + bot) / 2) - Math.floor(wide / 2) + 1, top + 1, Math.max(top + 1, bot - wide));
  const run = (tx, y0, y1) => { for (let ty = Math.min(y0, y1); ty <= Math.max(y0, y1); ty++) for (let k = 0; k < wide; k++) carve(tx + k, ty); };
  run(xA, yA, jog);
  for (let tx = Math.min(xA, xB); tx <= Math.max(xA, xB) + wide - 1; tx++) for (let k = 0; k < wide; k++) carve(tx, jog + k);
  run(xB, jog, yB);
  // A step inside `b`'s wall, as `carveCorridor` reports it.
  const enter = { x: (xB + wide / 2) * TILE, y: (dir === 'up' ? yB : yB + 1) * TILE };
  a.exitMouth = { tiles: Array.from({ length: wide }, (_, k) => yA * W + xA + k), x: (xA + wide / 2) * TILE, y: (yA + 0.5) * TILE, vertical: false, span: wide };
  // The door stands in the stretch of shaft leaving `a`, in the rock rather than the room's wall.
  const doorY = dir === 'up' ? yA - 1 : yA + 1;
  const clearRun = dir === 'up' ? yA - 1 >= jog + wide : yA + 1 < jog;
  return { enter, door: clearRun ? { x: (xA + wide / 2) * TILE, y: (doorY + 0.5) * TILE, vertical: false } : null };
}

// Which rooms of a level are built round their floor rather than round their men. Never the pen or a
// set piece, and never the room that opens the fighting: the first man of a run gets bare ground to
// be met on. They are spread over the back of the level, where a shape on the floor is something to
// use rather than one more thing to learn.
function pickTrapRooms(levelDef, n, available, rng) {
  const out = new Set();
  const want = Math.min(levelDef.traps || 0, available);
  if (want <= 0) return out;
  // The first two ordinary rooms of a level are where its kinds get introduced; leave them alone.
  // The ambush room is left alone too: it is a forced shape teaching a forced lesson, and three
  // plates thrown across it is one more thing to read in the one room that may not have any.
  const pool = ordinaryRooms(levelDef, n).slice(2).filter((i) => i !== levelDef.ambushAt && i !== shopRoomOf(levelDef));
  for (const i of rng.shuffle(pool).slice(0, want)) out.add(i);
  return out;
}

// The rooms of a level that are nobody's set piece: not the pen, not an arena, the Mill, the Hall,
// the Gallery or the killbox. These are the rooms the canon, the mix and the trap rooms are dealt
// out of, in order.
function ordinaryRooms(levelDef, n) {
  const taken = new Set([0, levelDef.millAt, levelDef.hallAt, levelDef.galleryAt, levelDef.killboxAt, ...(levelDef.gates || [])]);
  for (const a of (levelDef.arenas || [])) taken.add(a.at);
  const out = [];
  for (let i = 1; i < n; i++) if (!taken.has(i)) out.push(i);
  return out;
}

// Which rooms of a level are its canon: `CANON.share` of the ordinary rooms, taken off the ones that
// are not trap rooms on an even spread that always starts with the first. A level says what it is
// about on the first floor you fight on, and the mix is what you get between one canon room and the
// next — never instead of the first. It is a spread and not a roll so that a run of three mix rooms
// in a row cannot happen: the idea is never out of sight for long.
function pickCanonRooms(levelDef, n, trapRooms) {
  const out = new Set();
  const ordinary = ordinaryRooms(levelDef, n);
  // The ambush room is an ordinary room by the curve and a forced shape by the template, so calling
  // it a canon room would be counting a room the canon never got to build. It still counts toward
  // the share owed — the canon simply has to find it elsewhere.
  const plain = ordinary.filter((i) => !trapRooms.has(i) && i !== levelDef.ambushAt);
  const want = Math.min(plain.length, Math.ceil(CANON.share * ordinary.length));
  for (let k = 0; k < want; k++) out.add(plain[want === 1 ? 0 : Math.round(k * (plain.length - 1) / (want - 1))]);
  return out;
}

// Cut a sealed chamber into the stone off one side of a room and hang an iron door in the gap. It is
// tried above the room first and then below; either way there has to be solid rock for it to go in,
// so a room hard against the top of the world simply does not get one. Returns where the soul goes.
function carveVault(tiles, W, H, room, props, rng) {
  if (!room) return null;
  const vw = VAULT.w, vh = VAULT.h;
  const x0 = room.x + Math.floor((room.w - vw) / 2);
  if (x0 < 1 || x0 + vw >= W - 1) return null;
  for (const side of rng.chance(0.5) ? ['up', 'down'] : ['down', 'up']) {
    // Where the chamber sits, and the stone between it and the room. Above the room that stone is two
    // rows deep — the rock the chamber was cut out of, and the room's own wall under it — and both
    // have to come out or the door opens onto a wall and the soul is sealed in by the level itself.
    const y0 = side === 'up' ? room.y - vh - 1 : room.y + room.h;
    const gapY = side === 'up' ? y0 + vh : y0 - 1;
    const doorY = side === 'up' ? gapY + 1 : gapY;
    if (y0 < 1 || y0 + vh >= H - 1) continue;
    // It has to go into rock: anything already carved there is another room or a corridor. A row of
    // rock past its far side too, or the chamber opens flush onto whatever runs along behind it and
    // the vault's door becomes a second way between two rooms.
    let clear = true;
    for (let ty = y0 - 1; ty <= y0 + vh && clear; ty++) {
      for (let tx = x0 - 1; tx <= x0 + vw && clear; tx++) {
        if (tx < 0 || tx >= W || ty < 0 || ty >= H) { clear = false; break; }
        if (tiles[ty * W + tx] !== T.WALL) clear = false;
      }
    }
    if (!clear) continue;
    for (let ty = y0; ty < y0 + vh; ty++) for (let tx = x0; tx < x0 + vw; tx++) tiles[ty * W + tx] = T.FLOOR;
    const gapX = x0 + Math.floor(vw / 2);
    tiles[gapY * W + gapX] = T.FLOOR;
    tiles[doorY * W + gapX] = T.FLOOR;
    // The door hangs in the room's own wall, where it can be seen from the floor you walk in on.
    props.push({ x: (gapX + 0.5) * TILE, y: (doorY + 0.5) * TILE, kind: 'door', vertical: false, iron: true, vault: true });
    return { x: (gapX + 0.5) * TILE, y: (y0 + vh / 2) * TILE, doorTile: { tx: gapX, ty: doorY } };
  }
  return null;
}

// One window: a short slot cut clean through the wall band along the top of a room, with rock behind
// it that the renderer paints as the night. It has to have wall above it and the room's own floor
// below it, or it is a hole in the ground and not a hole in a wall — which is the difference the
// renderer needs and the only way `drawPits` can tell the two apart. It is a drop like any other: the
// tile is `T.PIT`, so a man shoved into one goes out of it, and so does the goat.
function carveWindow(tiles, W, room, rng, out) {
  const run = rng.int(3, 5);
  const ty = room.y;
  if (ty < 2 || room.w < run + 6) return false;
  for (let a = 0; a < 14; a++) {
    const tx = rng.int(room.x + 3, room.x + room.w - 3 - run);
    let ok = true;
    for (let k = 0; k < run && ok; k++) {
      ok = tiles[ty * W + tx + k] === T.WALL
        && tiles[(ty - 1) * W + tx + k] === T.WALL
        && tiles[(ty + 1) * W + tx + k] === T.FLOOR;
    }
    if (!ok) continue;
    for (let k = 0; k < run; k++) { tiles[ty * W + tx + k] = T.PIT; out.add(ty * W + tx + k); }
    return true;
  }
  return false;
}

// A worn patch of a room's own top or bottom wall, with a small pocket cut into the rock behind it:
// the gap tile itself (where the cracked-wall prop sits until it gives) and, one step further out, a
// two-tile niche wide enough for a bowl of milk and a rack. Tried on the top wall first and then the
// bottom, same as the vault; unlike the vault it never widens further than this, because the point
// of a niche is that it stays a niche. Every tile it touches has to still be solid rock — anything
// already carved there is another room or a corridor, and this never trades on either.
// Both ends of the niche row have to be rock as well: a niche cut flush against a shaft opened into
// it sideways, so once the wall was down the room was joined to a corridor it was never meant to
// touch — and a clamp over its real way out no longer shut it.
function carveSecret(tiles, W, H, room, rng) {
  for (const side of rng.chance(0.5) ? ['up', 'down'] : ['down', 'up']) {
    const wallRow = side === 'up' ? room.y : room.y + room.h - 1;
    const nicheRow = side === 'up' ? room.y - 1 : room.y + room.h;
    const guardRow = side === 'up' ? room.y - 2 : room.y + room.h + 1;
    if (nicheRow < 1 || guardRow < 1 || guardRow >= H - 1) continue;
    const spots = rng.shuffle(Array.from({ length: Math.max(0, room.w - 5) }, (_, k) => room.x + 2 + k));
    for (const tx of spots) {
      let clear = true;
      for (const [cx, cy] of [[tx - 1, wallRow], [tx, wallRow], [tx + 1, wallRow],
        [tx - 1, nicheRow], [tx, nicheRow], [tx + 1, nicheRow], [tx + 2, nicheRow], [tx, guardRow], [tx + 1, guardRow]]) {
        if (tiles[cy * W + cx] !== T.WALL) { clear = false; break; }
      }
      if (!clear) continue;
      tiles[wallRow * W + tx] = T.FLOOR;
      tiles[nicheRow * W + tx] = T.FLOOR; tiles[nicheRow * W + tx + 1] = T.FLOOR;
      return {
        wall: { x: (tx + 0.5) * TILE, y: (wallRow + 0.5) * TILE },
        heal: { x: (tx + 0.5) * TILE, y: (nicheRow + 0.5) * TILE },
        weapon: { x: (tx + 1.5) * TILE, y: (nicheRow + 0.5) * TILE },
        // The three tiles the gap opens onto. The prop carries them so that breaking the wall can
        // light them and keep them lit: a niche is a reward, and a reward you cannot see is not one.
        tiles: [wallRow * W + tx, nicheRow * W + tx, nicheRow * W + tx + 1],
        // Which of the room's own walls this is: the painted art draws the same brick course an
        // ordinary wall tile gets there, and a top wall carries the coping band an ordinary bottom
        // wall does not.
        side,
      };
    }
  }
  return null;
}

// A stretch of grating laid into the floor of a room. It starts somewhere in the middle third and
// grows along one axis with a wander on the other, so what goes down is a band you have to go round
// or cross rather than a handful of dots — and a band is the only version of this the eye reads as
// a piece of ground with an opinion.
// `near`, when given, is a tile to grow the band out from rather than a random point in the room —
// the vault's own approach asks for this, so the grate is the last thing between the door and the
// room rather than wherever the walk happened to land.
function spikePatch(tiles, W, room, props, rng, want, near) {
  const horiz = rng.chance(0.6);
  let tx = near ? clamp(near.tx, room.x + 2, room.x + room.w - 3) : rng.int(room.x + 2, room.x + room.w - 3);
  let ty = near ? clamp(near.ty, room.y + 2, room.y + room.h - 3) : rng.int(room.y + 2, room.y + room.h - 3);
  const taken = new Set();
  for (let a = 0, placed = 0; a < want * 6 && placed < want; a++) {
    const inRoom = tx >= room.x + 1 && tx <= room.x + room.w - 2 && ty >= room.y + 1 && ty <= room.y + room.h - 2;
    const key = ty * W + tx;
    if (inRoom && !taken.has(key) && tiles[key] === T.FLOOR) {
      const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
      if (!props.some((p) => p.kind !== 'spike' && len(p.x - px, p.y - py) < 1.2 * TILE)) {
        props.push({ x: px, y: py, kind: 'spike' }); taken.add(key); placed++;
      }
    }
    // Walk the band on: one step along, and now and then one step sideways, so it bends.
    if (horiz) { tx += 1; if (rng.chance(0.3)) ty += rng.chance(0.5) ? 1 : -1; }
    else { ty += 1; if (rng.chance(0.3)) tx += rng.chance(0.5) ? 1 : -1; }
    if (tx > room.x + room.w - 2) tx = room.x + 1;
    if (ty > room.y + room.h - 2) ty = room.y + 1;
  }
}

// Shut the way out of a room down to a single tile and stand a man in front of it. `exitBand` is the
// stretch of corridor the next room's carve took out of this one; everything in it but the top row
// goes back to stone, and the man is posted a step inside the room on that row. Nothing else about
// him changes: he is a clubman with two hearts who can be knocked into the wall like anybody.
// Shut the way out of a room down to a single tile. `exitBand` is the stretch of corridor the next
// room's carve took out of this one; everything in it but the top row goes back to stone, and
// whatever door that corridor was given is removed — it is now half inside the stone, and the thing
// standing in the gap is supposed to be the only thing standing in the gap.
function narrowExit(tiles, W, room, props) {
  const b = room.exitBand;
  if (!b) return null;
  for (let i = props.length - 1; i >= 0; i--) {
    const p = props[i];
    if (p.kind !== 'door') continue;
    if (p.x < b.x0 * TILE || p.x > (b.x1 + 1) * TILE) continue;
    if (p.y < (b.y - 1) * TILE || p.y > (b.y + b.wide + 1) * TILE) continue;
    props.splice(i, 1);
  }
  // Only the straight run out of the room, never the columns where the corridor turns: walled up
  // too, a corridor that turns downward was cut clean through below its one open row, and the level
  // behind the gate went unreachable — a fresh seed every time, which with two gates a level ran
  // out of seeds.
  const turn = b.x1 - b.wide + 1;
  for (let k = 1; k < b.wide; k++) {
    for (let tx = b.x0; tx < Math.max(b.x0 + 1, turn); tx++) {
      const ty = b.y + k;
      if (tx >= 0 && tx < W) tiles[ty * W + tx] = T.WALL;
    }
  }
  return b;
}

// The soul gate hangs in that single tile, in the mouth of the corridor where the room's own wall
// used to be, so it is read from inside the room as the way out being shut rather than as a door
// somebody left standing in a passage.
function gateSpot(tiles, W, room, props) {
  const b = narrowExit(tiles, W, room, props);
  if (!b) return null;
  return { x: (b.x0 + 0.5) * TILE, y: (b.y + 0.5) * TILE };
}

function blockSpot(tiles, W, room, props) {
  const b = narrowExit(tiles, W, room, props);
  if (!b) return null;
  // A step inside the room from the mouth of that corridor, on the one row still open.
  for (let dx = 1; dx <= 4; dx++) {
    const tx = b.x0 - dx, ty = b.y;
    if (tx < room.x + 1) break;
    if (tiles[ty * W + tx] !== T.FLOOR) continue;
    const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
    if (props.some((p) => len(p.x - px, p.y - py) < 1.4 * TILE)) continue;
    return { x: px, y: py };
  }
  return null;
}

// A few tiles inside the mouth of a room, on clear floor and clear of the furniture: where you put
// a man who is supposed to be standing in the way when you walk in.
function postSpot(tiles, W, room, enter, props) {
  const ex = Math.floor(enter.x / TILE), ey = Math.floor(enter.y / TILE);
  for (let dx = 2; dx <= 6; dx++) {
    for (const dy of [0, -1, 1, -2, 2]) {
      const tx = ex + dx, ty = ey + dy;
      if (tx < room.x + 1 || tx > room.x + room.w - 2 || ty < room.y + 1 || ty > room.y + room.h - 2) continue;
      if (tiles[ty * W + tx] !== T.FLOOR) continue;
      const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
      if (props.some((p) => len(p.x - px, p.y - py) < 1.6 * TILE)) continue;
      return { x: px, y: py };
    }
  }
  return null;
}

function reachable(tiles, W, H, sx, sy, tx, ty) {
  const seen = new Uint8Array(W * H);
  const q = [sy * W + sx];
  seen[q[0]] = 1;
  while (q.length) {
    const i = q.pop();
    const cx = i % W, cy = (i / W) | 0;
    if (cx === tx && cy === ty) return true;
    const nb = [i - 1, i + 1, i - W, i + W];
    for (const j of nb) {
      if (j < 0 || j >= W * H || seen[j]) continue;
      const t = tiles[j];
      if (t === T.WALL || t === T.PIT) continue;
      seen[j] = 1; q.push(j);
    }
  }
  return false;
}

// Is a point inside something a man cannot stand in? Everything a room puts on the floor except what
// is floor itself — a bowl of milk, a grating — or a door, which stands in a corridor and not a room.
// Shared by the generator's own spawn pass and `GEN_RULES.furniture`, so the two cannot disagree.
function inFurniture(x, y, props) {
  for (const p of props) {
    if (p.kind === 'heal' || p.kind === 'spike' || p.kind === 'door' || p.kind === 'secret') continue;
    const clear = p.kind === 'mill' ? 1.2 * TILE : p.kind === 'coop' ? 1.1 * TILE : 0.8 * TILE;
    if (len(p.x - x, p.y - y) < clear) return true;
  }
  return false;
}

// THE CAVE. A room's corners filled back in with rock — a diagonal of `TUNING.cave.erode` tiles, which
// the round rock (`roundR`) turns into a curve — and now and then a bulge grown out of a straight
// stretch of wall. Only plain floor is ever turned to stone, never a marker, and a bulge only where
// the three tiles behind it are floor, so it can narrow the room but never shut a lane of it.
function erodeCave(rows, rng) {
  const C = TUNING.cave, h = rows.length, w = rows[0].length;
  const g = rows.map((r) => r.split(''));
  const open = (x, y) => y >= 0 && y < h && x >= 0 && x < w && g[y][x] === '.';
  const k0 = Math.floor((Math.min(w, h) - 2) / 2) - 1;
  for (const [cx, sx] of [[1, 1], [w - 2, -1]]) for (const [cy, sy] of [[1, 1], [h - 2, -1]]) {
    const k = Math.min(rng.int(C.erode[0], C.erode[1]), k0);
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx + dy < k; dx++) {
      const x = cx + dx * sx, y = cy + dy * sy;
      if (g[y][x] === '.') g[y][x] = '#';
    }
  }
  // (bx, by) points into the room; the tile behind the bulge and both of its diagonals stay floor.
  const bump = (x, y, bx, by) => {
    if (!open(x, y) || !open(x + bx, y + by) || !open(x + bx - by, y + by - bx) || !open(x + bx + by, y + by + bx)) return;
    g[y][x] = '#';
  };
  for (let x = 3; x < w - 3; x++) {
    if (rng.chance(C.bump)) bump(x, 1, 0, 1);
    if (rng.chance(C.bump)) bump(x, h - 2, 0, -1);
  }
  for (let y = 3; y < h - 3; y++) {
    if (rng.chance(C.bump)) bump(1, y, 1, 0);
    if (rng.chance(C.bump)) bump(w - 2, y, -1, 0);
  }
  return g.map((r) => r.join(''));
}

// A boulder only goes where the floor is open all round it: the eight tiles about it plain floor and
// not grass. That is the whole of what keeps a scatter of them from ever closing a way through, and
// `GEN_RULES.rocks` holds it.
function rockFits(tiles, W, tx, ty, grass) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const i = (ty + dy) * W + tx + dx;
    if (tiles[i] !== T.FLOOR || (grass && grass.has(i))) return false;
  }
  return true;
}

// A patch of tall grass: grown out from one floor tile of the room by picking at random off the edge
// of what is already grass, so it comes out a blob rather than a square. Never on the tile a corridor
// opens onto and never round a boulder, a door or the wheel.
function grassPatch(tiles, W, room, grass, props, rng, size) {
  const ok = (i) => {
    const tx = i % W, ty = Math.floor(i / W);
    if (tx <= room.x || tx >= room.x + room.w - 1 || ty <= room.y || ty >= room.y + room.h - 1) return false;
    if (tiles[i] !== T.FLOOR || grass.has(i)) return false;
    const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
    if (room.enter && len(room.enter.x - px, room.enter.y - py) < 1.6 * TILE) return false;
    return !props.some((p) => (p.kind === 'rock' || p.kind === 'door' || p.kind === 'mill') && len(p.x - px, p.y - py) < 1.5 * TILE);
  };
  let seed = -1;
  for (let a = 0; a < 30 && seed < 0; a++) {
    const i = rng.int(room.y + 1, room.y + room.h - 2) * W + rng.int(room.x + 1, room.x + room.w - 2);
    if (ok(i)) seed = i;
  }
  if (seed < 0) return;
  const patch = [seed]; grass.add(seed);
  for (let a = 0; a < size * 6 && patch.length < size; a++) {
    const i = patch[rng.int(0, patch.length - 1)] + [1, -1, W, -W][rng.int(0, 3)];
    if (ok(i)) { patch.push(i); grass.add(i); }
  }
}
