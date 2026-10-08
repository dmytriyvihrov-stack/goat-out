// Level generation: a chain of template rooms joined by 2-wide corridors, trending up-right, with
// now and then a room hung above or below the last one and reached by a shaft (`STACK`).
// EXIT is the flight of stairs up out of the last room; ENTRY the flight you came up into the first.
// PIT is the one tile that is neither floor nor wall: the goat walks into it and falls, a man will
// not path into it, and anything thrown through it is gone. In a wall run it reads as a window.
const T = { FLOOR: 0, WALL: 1, HAY: 2, ASH: 3, EXIT: 4, ENTRY: 5, PIT: 6 };

// A room whose sides mean something, the killbox's rifles are its far wall, sets `noFlipX` and
// keeps its left and right the way they were written. Up and down never matter to anyone.
function flipTemplate(tpl, rng) {
  let rows = tpl.rows.slice();
  if (rng.chance(0.5) && !tpl.noFlipY) rows = rows.slice().reverse();   // the roll is spent either way
  if (!tpl.noFlipX && rng.chance(0.5)) rows = rows.map((r) => r.split('').reverse().join(''));
  return { name: tpl.name, rows, lamps: tpl.lamps };
}

// ---------------------------------------------------------------------------------------------
// THE ENCOUNTER PLAN. Difficulty is decided here, once, before a single man is placed; the generator
// below only finds floor for what this returns. Two rules, and both are testable:
//
//   1. Every kind is met on its own. The room that introduces a kind holds that one enemy and
//      nothing else, no escorts on a first-appearance boss either.
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
// grows: see `ENCOUNTER.cheap`. A room handed its own head count, the Great Hall, which is meant to
// be a wall of bodies, is left out of it entirely.
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

// How many men a room of this template may hold, off the level's `cap.men` and the room's floor
// (`ENCOUNTER.room`): a tight room is not given the crowd of an open one.
function floorOf(tpl) { let n = 0; for (const r of tpl.rows) for (const c of r) if (c !== '#' && c !== 'P') n++; return n; }
function roomMenCap(men, tpl) {
  const R = ENCOUNTER.room;
  if (!tpl) return men;
  return clamp(Math.round(men * floorOf(tpl) / R.ref), Math.min(R.min, men), Math.round(men * R.grow));
}

// The encounter tables' pseudo-kinds are clubmen with something about them: 'champion' the butcher, 'shield'
// the shieldman (`TUNING.shieldman`), 'thrower' the thrower (`TUNING.thrower`). A spawn carries the real kind
// and the flag; `threatKind` reads one back.
// 'shaman' the shaman (`TUNING.shaman`, js/shaman.js).
function spawnKind(k) {
  return { kind: k === 'champion' || k === 'shield' || k === 'thrower' || k === 'shaman' ? 'bearer' : k, champion: k === 'champion', shield: k === 'shield', thrower: k === 'thrower', shaman: k === 'shaman' };
}
function threatKind(s) { return s.champion ? 'champion' : s.shield ? 'shield' : s.thrower ? 'thrower' : s.shaman ? 'shaman' : s.kind; }

// `crowd` (7 Oct 2026 playtest, `Game.crowdFor`): a thicker floor for a goat who has not died yet, ×1.5 on the third floor
// and ×2 after it, "so that he reaches heaven and gets the gathering". It scales the ordinary rooms' budget and head
// count only (an introduction stays alone, a boss keeps his escort); the generator's own promises are held to the
// unscaled floor (`GEN_RULES.caps` and `crowd` step aside for `level.crowdMul`).
function planEncounters(levelDef, rooms, rng, crowd = 1) {
  const E = levelDef.encounters;
  // A level may loosen a cap: the finale is allowed rooms the earlier ones are not.
  const caps = Object.assign({}, ENCOUNTER.cap, E.cap || {});
  const capsOf = (room) => Object.assign({}, caps, { men: Math.ceil(roomMenCap(caps.men, room.tpl) * crowd) });
  const weight = E.weight ? Object.assign({}, ENCOUNTER.weight, E.weight) : null;
  const out = { rooms: new Map(), introRooms: new Set(), hunterFrom: -1, caps };
  const fight = rooms.filter((r) => r.index > 0);
  // The curve is bought in ordinary rooms only. Every set piece, the wheel, the hall, the gallery,
  // the killbox, is a thing to be read rather than a number of men, and none of them may be the
  // room that introduces a kind: meeting the Mill and your first two-hearted man at the same moment
  // means meeting neither of them.
  const ordinary = fight.filter((r) => !r.arena && !r.isHall && !r.isGallery && !r.isMill && !r.isKillbox && !r.isRest && !r.isCalm);
  if (!ordinary.length) return out;
  // A trap room still buys its men off the curve, but it never introduces a kind: meeting a hound
  // and a floor full of teeth in the same room means meeting neither of them.
  // Nor does the ambush room: it teaches the throw, and the throw wants two ordinary men down the
  // far end of it, not the first butcher of the run standing there alone.
  // Nor does a room the level fills by hand (`crowdAt`): its men are named, not bought.
  const plain = ordinary.filter((r) => !r.isTrap && !r.isAmbush && !r.isCrowd && !r.isChand);

  // Hand each new kind a room of its own: start where the level asks for it and walk forward to the
  // first ordinary room nobody has claimed, then backward if the level ran out of room forward.
  const intro = new Map();
  for (const [kind, at] of (E.introduce || [])) {
    const want = Math.round(clamp(at, 0, 1) * (ordinary.length - 1));
    // If an arena on this level is built round that kind, he has to be met in the open first: the
    // first butcher you ever see should not be the one with the extra heart standing in the ring.
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
    // The calm room (`levelDef.calmAt`) is a toy, not a fight: coals and straw and nobody, so the
    // first fire he ever starts is one he can stand back and watch.
    if (room.isCalm) { out.rooms.set(room.index, { men: [], calm: true }); continue; }
    // An arena is its boss. He stands alone the first time you ever see his kind, and with a little
    // company every time after that.
    if (room.arena) {
      const boss = room.arena.boss;
      const known = seen.has(boss);
      // `escorts` on the arena is a hard count rather than a budget: the first boss of the game is
      // one butcher and one man, whatever the threat curve would have bought him.
      // A clubman boss (THE ALTAR's last room since 2 Oct 2026) is backed by clubmen: with his own kind
      // left out, the floor's only other kind was the butcher, and he came with two of them.
      // `with` (8 Oct 2026, js/endboss.js): men the ring always has at his back, a kind already met only (THE YARD's
      // mage by his bowl with another mage, THE ROAD's butcher with his mages); the rest of `escorts` off the budget.
      const forced = known ? (room.arena.with || []).filter((k) => seen.has(k)) : [];
      const more = room.arena.escorts ? Math.max(0, room.arena.escorts - forced.length) : 0;
      // A kind the named men already fill to its cap is not bought again on top of them.
      const full = (k) => caps[k] && forced.filter((f) => f === k).length + (k === boss ? 1 : 0) >= caps[k];
      const escorts = !known ? [] : forced.concat(room.arena.escorts && !more ? [] : fillRoom(ENCOUNTER.escortThreat, mixable.filter((k) => (k !== boss || boss === 'bearer') && !(forced.length && full(k))), rng, caps, more, weight));
      out.rooms.set(room.index, { men: escorts, boss, intro: known ? null : boss, arena: true, hp: room.arena.hp });
      if (!known) out.introRooms.add(room.index);
      seen.add(boss);
      continue;
    }
    const t = ordinary.length > 1 ? step / (ordinary.length - 1) : 1;
    const curve = lerp(E.from, E.to, Math.pow(clamp(t, 0, 1), E.ease));
    const kind = intro.get(room.index);
    if (kind) {
      // The introduction itself: one of him, nothing else in the room, unless what he does needs men he
      // already knows round him (`ENCOUNTER.introWith`: the shaman and the clubmen his spirit goes into).
      out.rooms.set(room.index, { men: [kind].concat((ENCOUNTER.introWith && ENCOUNTER.introWith[kind]) || []), intro: kind });
      mixable.push(kind); pending.delete(kind); seen.add(kind);
      if (kind === 'hunter') out.hunterFrom = room.index;
      easeOff = true; step++;
      continue;
    }
    // The ambush room is two clubmen down the far end, whatever the curve would have bought: a
    // blade thrown down a corridor at one man is a kill, at two it is a choice of which one.
    if (room.isAmbush) { out.rooms.set(room.index, { men: ['bearer', 'bearer'] }); step++; continue; }
    // A trap room the level placed by hand (`trapAt`) may name its own men (`trapMen`): the first
    // straw room of the run is two clubmen standing in it, whatever the curve would have bought.
    if (room.isTrap && levelDef.trapMen) { out.rooms.set(room.index, { men: levelDef.trapMen.slice() }); step++; continue; }
    // A room the level fills by hand (`crowdAt`, `crowdMen`): exactly those men, whatever the curve
    // would have bought, THE ALTAR puts three clubmen between the lone butcher and his ring, so the
    // two rooms with a butcher in them are not met back to back. Above the level's own `cap.men` on
    // purpose; `GEN_RULES.crowdroom` holds it to the list and to nothing else.
    if (room.isCrowd && levelDef.crowdMen) { out.rooms.set(room.index, { men: levelDef.crowdMen.slice(), crowd: true }); step++; continue; }
    // THE YARD's chandelier lesson (`chandAt`): one clubman holding the notch under the ring.
    if (room.isChand) { out.rooms.set(room.index, { men: ['bearer'], chand: true }); step++; continue; }
    // The Mill's room is a set piece. Half a crowd, and on the level that shows you the wheel for
    // the first time the two men who teach it and nobody else.
    if (room.isMill) {
      // The level that first shows the wheel gives it two men and no more: one who cannot read it
      // and one who can. An empty room taught that the arm hurts and nothing else, what has to be
      // learned is that it hurts THEM, and that needs somebody in it to be hurt.
      out.rooms.set(room.index, { men: levelDef.millLesson ? ['bearer', 'bearer']
        : fillRoom(curve * ENCOUNTER.millEase, mixable, rng, capsOf(room), 0, weight), mill: true,
        lesson: !!levelDef.millLesson });
      continue;
    }
    // The killbox: two rifles on the far side watching the door, two men on your side of the room,
    // and nothing else in it. Before rifles are a thing you have met it is an ordinary room.
    if (room.isKillbox) {
      const K = ENCOUNTER.killbox;
      if (mixable.includes('hunter')) { out.rooms.set(room.index, { men: K.men.concat(K.near), killbox: true, alert: K.men.length }); continue; }
      out.rooms.set(room.index, { men: fillRoom(curve, mixable, rng, capsOf(room), 0, weight) });
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
      // Posts and crowd together stay inside `caps.men + 2`, the ceiling `GEN_RULES.caps` holds every
      // room to: on a floor with a lower head count (THE DARK) three rifles and a full crowd broke it.
      const rc = capsOf(room), crowd = fillRoom(curve * 0.6, mixable, rng, rc, 0, weight).slice(0, Math.max(0, rc.men + 2 - posts.length));
      out.rooms.set(room.index, { men: posts.concat(crowd), gallery: true });
      continue;
    }
    const budget = curve * (easeOff ? ENCOUNTER.afterIntro : 1) * crowd;
    out.rooms.set(room.index, { men: fillRoom(budget, mixable, rng, capsOf(room), 0, weight), threat: budget });
    easeOff = false; step++;
  }
  return out;
}

// THE COMBOS (5 Oct 2026 playtest: "a man and a room, or men together, that make a situation"). Which
// rooms may take combo `c`: an ordinary room the curve bought (never one that introduces a kind, a
// trap, the ambush, the crowd, the chandelier's or a teaching room), or the arena of `room.arena`'s
// boss once he is known; and whatever `room` asks of its template. Shared by `dealCombo` and
// `GEN_RULES.combos`, so they ask one question.
function comboRoomFits(c, room) {
  const R = c.room || {}, tpl = room.tpl;
  if (R.tpl && (!tpl || tpl.name !== R.tpl)) return false;
  if (R.small && (!tpl || floorOf(tpl) > R.small)) return false;
  if (R.pits) {
    // Drops inside the room only: an 'O' on the border is a window in the wall.
    let n = 0;
    tpl.rows.forEach((row, y) => { for (let x = 1; x < row.length - 1; x++) if (row[x] === 'O' && y > 0 && y < tpl.rows.length - 1) n++; });
    if (n < R.pits) return false;
  }
  return true;
}
// Whether every man in combo `c` was met on an earlier floor of the run (never one this floor introduces).
function comboMet(def, c) {
  const kinds = new Set(def.encounters.kinds);
  return c.men.every((k) => def.met && def.met.has(k) && kinds.has(k)) && (!c.room || !c.room.arena || def.met.has(c.room.arena));
}
// One combo a floor at most, `combos.chance` of the floors (always, for the one `opts.combo` names:
// the dev drawer's COMBOS tab). The combo's men become the room's first men; the rest of its budget
// is bought off the curve with no clubman in it, so the room is the pairing, not the pairing and a
// crowd; a room whose budget the pairing would pass by more than `over` is not offered. Marks
// `room.combo` and the plan's cell; returns `{ id, room }` or null.
function dealCombo(levelDef, rooms, plan, seed, opts) {
  const CB = TUNING.combos, li = levelIndexOf(levelDef), crng = new RNG(((seed ^ 0x0c0b0a5) >>> 0));
  if (!CB || levelDef.shroom || li < 0) return null;
  const forced = opts && opts.combo, E = levelDef.encounters;
  if (!forced && !crng.chance(CB.chance)) return null;
  const caps = Object.assign({}, ENCOUNTER.cap, E.cap || {});
  const offers = [];
  for (const c of CB.list) {
    if (forced ? c.id !== forced : li < c.from) continue;
    if (!comboMet(levelDef, c)) continue;
    const cost = c.men.reduce((a, k) => a + THREAT[k], 0);
    for (const room of rooms) {
      const cell = plan.rooms.get(room.index);
      if (!cell || cell.intro || room.index < 2 || !comboRoomFits(c, room)) continue;
      if (c.room && c.room.arena) {
        if (!cell.arena || cell.boss !== c.room.arena || cell.men.length + 1 + c.men.length > caps.men + 2) continue;
        if (c.men.some((k) => cell.men.filter((m) => m === k).length + c.men.filter((m) => m === k).length > (caps[k] || 99))) continue;
      } else {
        if (cell.threat === undefined || room.isTrap || room.isAmbush || room.isCrowd || room.isChand || plan.introRooms.has(room.index)) continue;
        if (cost > cell.threat * CB.over || c.men.length > roomMenCap(caps.men, room.tpl)) continue;
      }
      offers.push({ c, room, cell, cost });
    }
  }
  if (!offers.length) return null;
  // The combo first, then its room: drawn over rooms, the one that fits anywhere (WITCHFIRE AND THE
  // HOOK) took nearly every deal and the ones that want a particular room were never seen.
  const ids = [...new Set(offers.map((o) => o.c.id))], pickId = ids[crng.int(0, ids.length - 1)], mine = offers.filter((o) => o.c.id === pickId);
  const { c, room, cell, cost } = mine[crng.int(0, mine.length - 1)];
  if (c.room && c.room.arena) cell.men = cell.men.concat(c.men);
  else {
    // At most `extra` men round the pairing (a late room's whole budget round it buried it in a crowd).
    const left = cell.threat - cost, maxMen = Math.min(CB.extra, roomMenCap(caps.men, room.tpl) - c.men.length);
    const avail = E.kinds.filter((k) => k !== ENCOUNTER.cheap.kind && levelDef.met.has(k) && !c.men.includes(k) && THREAT[k] <= left + 0.5);
    cell.men = c.men.concat(left >= 1 && maxMen > 0 && avail.length ? fillRoom(left, avail, crng, caps, maxMen) : []);
  }
  cell.combo = c.id; room.combo = c.id;
  return { id: c.id, room: room.index, forced: !!forced };
}

// `opts.luck` is the LUCKY CLOVER at the goat's neck when this floor is generated (`mods.luck`):
// multipliers on the odds of a second secret, of grass behind one, and of a loose rack, plus bowls
// of milk on top of the level's own count. Nothing else the goat carries reaches the generator.
function generateLevel(levelDef, seed, opts) {
  if (levelDef.showroom) return showroomLevel(levelDef, seed);   // the dev floor is laid, not rolled (js/showroom.js)
  // Forty, not twenty: THE TRIP erodes every room into a cave and more than half its attempts die
  // on a room edge with no row a door can use, so twenty tries in a row failed about once in four
  // hundred floors once its whole pool could be dealt. A failed try costs a few milliseconds.
  for (let attempt = 0; attempt < 40; attempt++) {
    if (opts && opts.fresh) { opts.fresh.dealt = []; opts.fresh.vault = null; }   // a failed try's fresh rooms were never laid
    const lvl = tryGenerate(levelDef, seed + attempt * 7919, opts || {});
    if (lvl) { if (opts && opts.fresh) { lvl.fresh = opts.fresh.dealt.slice(); lvl.freshVault = opts.fresh.vault; } return lvl; }
  }
  throw new Error('level generation failed');
}

// Where a generated level's souls go, worked out once and read by both `game.startLevel` (which
// lays them) and `GEN_RULES.souls` (which holds them apart). `def.souls` is the whole authored count,
// the mouse standing in for one, spent in order: the gate (a keeper's gate puts its soul in the
// keeper, `keeper` his spawn index), then the LAST bosses (`ensoul`, spawn indices). The vault never
// holds one (26 Sep 2026: "a soul twice a level, in the middle and at the end"); it holds big grass,
// or is an ambush (`vaultKind`). Only a level with `surprises: true` (none today) then rolls the two
// surprises off its own seed, each only where it keeps every soul `TUNING.soul.apart` rooms from
// every other: a boss who carries one the budget did not give him (`bonusBoss`), and an ordinary
// fight room that gives one up with its last man (`bonusRoom`). `rooms` is the room of every soul,
// in the order dealt.
function soulPlan(L) {
  const def = L.def, S = TUNING.soul;
  const bosses = L.spawns.map((s, i) => ({ i, room: s.roomIndex === undefined ? 0 : s.roomIndex }))
    .filter((b) => L.spawns[b.i].boss).sort((a, b) => a.room - b.room);
  let count = def.souls === undefined ? bosses.length : def.souls;   // the vault holds no soul (26 Sep 2026)
  // Two upgrades a level, and the mouse is one of them: her offer stands in for a soul rather than
  // coming on top of the level's two.
  if (L.shop && def.souls !== undefined) count = Math.max(0, count - 1);
  let budget = count;
  const gates = [], rooms = [], ensoul = [];
  for (const g of (L.gates || [])) {
    if (g.shop || budget <= 0) continue;
    const keeper = L.spawns.findIndex((s) => s.keeper && s.roomIndex === g.room);
    gates.push({ gate: g, keeper }); rooms.push(g.room); budget--;
  }
  const vault = false;
  for (let n = bosses.length - 1; n >= 0 && budget > 0; n--) { ensoul.push(bosses[n].i); rooms.push(bosses[n].room); budget--; }
  const apart = (r) => rooms.every((o) => Math.abs(o - r) >= S.apart);
  const luck = new RNG(((L.seed >>> 0) ^ 0x51ed) >>> 0);
  let bonusBoss = -1, bonusRoom = -1;
  const surprise = def.surprises === true;
  const spare = surprise ? bosses.filter((b) => !ensoul.includes(b.i) && apart(b.room)) : [];
  if (spare.length && luck.chance(S.bossChance)) {
    const b = spare[luck.int(0, spare.length - 1)];
    bonusBoss = b.i; rooms.push(b.room); count++;
  }
  const men = (r) => L.spawns.filter((s) => s.roomIndex === r.index).length;
  const fights = !surprise ? [] : L.rooms.filter((r) => (r.role === 'canon' || r.role === 'mix' || r.role === 'trap')
    && !(L.plan && L.plan.introRooms.has(r.index)) && men(r) >= 2 && apart(r.index));
  if (fights.length && luck.chance(S.roomChance)) { bonusRoom = fights[luck.int(0, fights.length - 1)].index; rooms.push(bonusRoom); }
  return { count, gates, vault, ensoul, bonusBoss, bonusRoom, rooms };
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
  const grass = new Set(), wallHoles = [];
  let x = 2;
  let y = Math.floor(H * 0.62);
  const n = levelDef.rooms;
  // Two pools. The canon is the level's own idea, and at least `CANON.share` of its ordinary rooms
  // are built out of it; the mix is what the run already knows, the untagged rooms and the canons
  // of the levels before this one, and never an idea it has not been shown yet. A template that
  // `needs` something the level does not have, teeth on a level whose floor has none, is in
  // neither, so no room is ever built out of a thing this level cannot show you.
  const fits = (t) => (!t.needs || levelDef[t.needs]) && roomAllowed(t, levelDef);
  const canonId = levelDef.canon ? levelDef.canon.id : null;
  // Both pools are ordered by how much open ground each template gives (`groundOf`), tight first,
  // so the draw below can walk a level along that axis the way the curve walks it along threat.
  // Shuffled first, so templates that measure the same come out in a different order every seed.
  const byGround = (a, b) => groundOf(a) - groundOf(b);
  // A template marked `bridge` is never drawn: `levelDef.bridges` deals it (below).
  const canonPool = rng.shuffle(ROOM_TEMPLATES.filter((t) => t.canon && t.canon === canonId && !t.bridge && fits(t))).sort(byGround);
  const known = levelDef.known || new Set();
  let mixPool = rng.shuffle(ROOM_TEMPLATES.filter((t) => !t.tag && !t.bridge && (!t.canon || known.has(t.canon)) && fits(t))).sort(byGround);
  if (!mixPool.length) mixPool = canonPool;
  if (!mixPool.length) mixPool = rng.shuffle(ROOM_TEMPLATES.filter((t) => !t.tag && !t.bridge && !t.canon && (!t.needs || levelDef[t.needs]))).sort(byGround);
  // Which entries of each pool this level has already spent. A pool smaller than the level's share
  // of rooms simply starts again once it is empty.
  const canonUsed = new Set(), mixUsed = new Set();
  // Rooms whose point is the floor rather than the men on it.
  let trapPool = rng.shuffle(ROOM_TEMPLATES.filter((t) => t.tag === 'trap' && fits(t)));
  // A `ROOM_LEVELS` that takes every template of a pool off this floor would leave nothing to build
  // with: that pool then ignores the mask rather than the floor failing.
  if (!trapPool.length) trapPool = rng.shuffle(ROOM_TEMPLATES.filter((t) => t.tag === 'trap' && (!t.needs || levelDef[t.needs])));
  const trapRooms = pickTrapRooms(levelDef, n, trapPool.length, rng);
  const canonRooms = canonPool.length ? pickCanonRooms(levelDef, n, trapRooms) : new Set();
  // THE ARMORY: one ordinary mix room of a floor it is allowed on, its own RNG stream so nothing else
  // is reshuffled by it (`TUNING.rooms.armory`, `ROOM_LEVELS.armory`).
  let armoryAt = -1;
  {
    const AR = TUNING.rooms.armory, arng = new RNG(((seed ^ 0x0a4a0e1) >>> 0));
    // Never THE DARK, whatever its string says: its walls are all arms, and THE DARK stands its lamps
    // against a room's walls (`GEN_RULES.dark`).
    if (!levelDef.dark && roomAllowed(ARMORY_TEMPLATE, levelDef) && arng.chance(AR.chance)) {
      // A mix room if there is one; a canon room only while the canon keeps its share without it.
      // (it counts as a mix room, so the canon must keep its share without it)
      const spareCanon = canonRooms.size - 1 >= Math.ceil(CANON.share * ordinaryRooms(levelDef, n).length);
      const cand = ordinaryRooms(levelDef, n).filter((i) => i >= AR.from && !trapRooms.has(i) && (!canonRooms.has(i) || spareCanon)
        && i !== levelDef.ambushAt && i !== levelDef.vaultAt && i !== shopRoomOf(levelDef) && i !== levelDef.calmAt && i !== levelDef.chandAt);
      if (cand.length) armoryAt = cand[arng.int(0, cand.length - 1)];
    }
  }
  // THE BRIDGE's own rooms (30 Sep 2026 playtest: "one or two rooms shaped like the bridge, with
  // holes at its sides and between"): `levelDef.bridges` [lo, hi] of the canon's rooms, spread down
  // the floor, are built as a template marked `bridge`, on their own stream, so no other roll moves.
  // Never the vault's room: its door would open onto the drop.
  const bridgeAt = new Map();
  if (levelDef.bridges && canonId) {
    const pool = ROOM_TEMPLATES.filter((t) => t.bridge && t.canon === canonId && fits(t));
    const brng = new RNG(((seed ^ 0x0b41d6e) >>> 0));
    const cand = [...canonRooms].filter((i) => i >= 2 && i !== armoryAt && i !== levelDef.vaultAt).sort((a, b) => a - b);
    const want = pool.length ? Math.min(cand.length, brng.int(levelDef.bridges[0], levelDef.bridges[1])) : 0;
    const first = brng.int(0, pool.length - 1);
    for (let k = 0; k < want; k++) {
      const i = cand[want === 1 ? brng.int(0, cand.length - 1) : Math.round(k * (cand.length - 1) / (want - 1))];
      bridgeAt.set(i, pool[(first + k) % pool.length]);
    }
  }
  // THE FLANK (7 Oct 2026, `TUNING.rooms.flank`): one ordinary room (canon or mix, it keeps its role, so the canon's share stands) of a floor `ROOM_LEVELS` lets it on is a trench
  // with a squad on its far lip, a way round on land and a roll straight across. Its own RNG stream, a template
  // marked `tag: 'flank'` (kept out of every draw); the roll that crosses it is taught by THE CAVE's chasm first.
  const flankAt = new Map();
  {
    const FL = TUNING.rooms.flank, frng = new RNG(((seed ^ 0x0f1a4c) >>> 0));
    const pool = ROOM_TEMPLATES.filter((t) => t.tag === 'flank' && roomAllowed(t, levelDef));
    if (!levelDef.dark && !levelDef.shroom && pool.length && frng.chance(FL.chance)) {
      const cand = ordinaryRooms(levelDef, n).filter((i) => i >= FL.from && !trapRooms.has(i) && i !== armoryAt && !bridgeAt.has(i)
        && i !== levelDef.ambushAt && i !== levelDef.vaultAt && i !== shopRoomOf(levelDef) && i !== levelDef.calmAt && i !== levelDef.chandAt
        && i !== levelDef.crowdAt);
      if (cand.length) flankAt.set(cand[frng.int(0, cand.length - 1)], pool[frng.int(0, pool.length - 1)]);
    }
  }
  let trapIdx = 0;
  // The sentry's room is the first ordinary room of the level, `introduce: [['bearer', 0]]` always
  // resolves to it, and it is the one room whose template is not left to the canon/mix draw: it is
  // forced to `LESSON_TEMPLATE`, open floor with nothing in it to break the line from the door to
  // whichever wall he is standing against. Computed the same way `ordinaryRooms` is, before any
  // room exists yet, because the template is chosen room by room below and this one has to be known
  // going in rather than fixed up after the fact.
  const sentryRoomAt = levelDef.sentryIntro ? ordinaryRooms(levelDef, n)[0] : -1;
  // The rock between one room and the next (`CORRIDOR`, or the level's own `gap` / `jog`), and its
  // average, for the width budget below.
  const gap0 = levelDef.gap || CORRIDOR.gap, jogR = levelDef.jog || CORRIDOR.jog;
  const gapR = (levelDef.corridorW || 2) > 2 ? [Math.max(3, gap0[0]), Math.max(3, gap0[1])] : gap0;
  // The first grass's corridor (`levelDef.firstGrass`): out of the first room past the sentry's that nothing
  // narrows (the same rooms the placement below passes over). It alone is left long, `CORRIDOR.grassGap`,
  // and turned late, so it has a straight run for the bowl however short the rest are.
  const narrowAt = new Set([sentryRoomAt, levelDef.chandAt, ...restsOf(levelDef), ...(levelDef.arenas || []).map((a) => a.at)]);
  let grassAt = -1;
  if (levelDef.firstGrass) for (let j = Math.max(1, sentryRoomAt + 1); j < n - 1; j++) if (!narrowAt.has(j)) { grassAt = j; break; }
  const GAP = (gapR[0] + gapR[1]) / 2 + (grassAt >= 0 ? (CORRIDOR.grassGap - (gapR[0] + gapR[1]) / 2) / n : 0);
  // Which of the set pieces still lie ahead of room `i`, by width, so a room can be given its fair
  // share of what is left rather than an average that a Great Hall then eats.
  // An arena's shape is its boss's: the ogre's carries the swords and the bowls the horns cannot
  // stand in for, and the first one of a run (THE YARD's since 26 Sep 2026: whichever floor has not
  // met him yet) is the wide hall that shows it.
  const arenaTpl = (a) => a.boss !== 'butcher' ? ARENA_TEMPLATE
    : levelDef.met && !levelDef.met.has('butcher') ? OGRE_FIRST_TEMPLATE : OGRE_ARENA_TEMPLATE;
  const fixedW = (j) => {
    const aj = (levelDef.arenas || []).find((a) => a.at === j);
    if (aj) return arenaTpl(aj).rows[0].length;
    if (j === levelDef.millAt) return (levelDef.millLesson ? MILL_LESSON_TEMPLATE : MILL_TEMPLATE).rows[0].length;
    if (j === levelDef.hallAt) return GREAT_HALL_TEMPLATE.rows[0].length;
    if (j === levelDef.galleryAt) return GALLERY_TEMPLATE.rows[0].length;
    if (j === levelDef.killboxAt) return KILLBOX_TEMPLATE.rows[0].length;
    if (j === levelDef.ambushAt) return AMBUSH_TEMPLATE.rows[0].length;
    if (j === levelDef.calmAt) return CALM_TEMPLATE.rows[0].length;
    if (j === levelDef.chandAt) return CHAND_LESSON_TEMPLATE.rows[0].length;
    if (restsOf(levelDef).includes(j)) return REST_TEMPLATE.rows[0].length;
    if (j === armoryAt) return ARMORY_TEMPLATE.rows[0].length;
    if (flankAt.has(j)) return flankAt.get(j).rows[0].length;
    if (bridgeAt.has(j)) return bridgeAt.get(j).rows[0].length;
    return 0;
  };
  // A room may not take more than its share of the width that is left: a template too wide for what
  // remains is passed over for one that fits. The mix holds the yard's thirty-tile rooms from level
  // five on, and without this a sixteen-room level was sealed short of its last door often enough
  // that the twenty retries ran out.
  // Which of the ones that fit is the second axis: the pool is sorted by open ground, and how far
  // into the level this room is says where in that pool to look. It takes at random among the
  // `GROUND.window` nearest unspent entries rather than the single nearest, so the trend holds on
  // average, which is all `GEN_RULES.ground` asks of it, while two seeds stay two levels.
  // Where along the pool to look is this room's place among the rooms that draw from the same pool,
  // not among all the rooms of the level: the last room is always an arena, so measured against the
  // level the most open third of every canon was only ever reached by a room that never draws, and
  // `sluice`, `flanks` and `rowhouse` were dealt 0 times in 200 seeds. And a pool of nine dealt to two
  // rooms needs a wider window than three, or its middle is never anybody's nearest.
  const forced = (j) => j === 0 || (levelDef.arenas || []).some((a) => a.at === j) || j === levelDef.millAt
    || j === levelDef.hallAt || j === levelDef.galleryAt || j === levelDef.killboxAt || j === sentryRoomAt
    || j === levelDef.ambushAt || j === levelDef.calmAt || j === levelDef.chandAt || restsOf(levelDef).includes(j) || trapRooms.has(j) || j === armoryAt || bridgeAt.has(j) || flankAt.has(j);
  const drawOrder = { canon: [], mix: [] };
  for (let j = 1; j < n; j++) if (!forced(j)) drawOrder[canonRooms.has(j) ? 'canon' : 'mix'].push(j);
  const draw = (pool, used, i, order) => {
    let fixed = 0, flex = 1;
    for (let j = i + 1; j < n; j++) { const fw = fixedW(j); if (fw) fixed += fw; else flex++; }
    const budget = Math.floor((W - 8 - x - fixed - GAP * (n - i)) / flex);
    const rank = order.indexOf(i), d = order.length;
    const target = (d > 1 ? clamp(rank / (d - 1), 0, 1) : 0.5) * (pool.length - 1);
    const win = Math.max(GROUND.window, Math.ceil(pool.length / Math.max(1, d)));
    const fitting = [];
    for (let k = 0; k < pool.length; k++) if (pool[k].rows[0].length <= budget) fitting.push(k);
    if (!fitting.length) return pool[Math.round(target)];
    let free = fitting.filter((k) => !used.has(k));
    if (!free.length) { used.clear(); free = fitting; }
    free.sort((a, b) => Math.abs(a - target) - Math.abs(b - target));
    // `opts.fresh` (game.js, `Novelty`: the browser has played a while with nothing new): inside the same
    // window, so the ground's trend holds, a template it has never walked into is taken first, up to
    // `TUNING.novelty.rooms` a floor. One roll either way, so the stream after it is the same length.
    const near = free.slice(0, Math.min(win, free.length)), FR = opts && opts.fresh;
    const unseen = FR && FR.dealt && FR.dealt.length < TUNING.novelty.rooms ? near.filter((q) => !FR.seen.has(pool[q].name)) : [];
    const k = unseen.length ? unseen[rng.int(0, unseen.length - 1)] : near[rng.int(0, near.length - 1)];
    if (unseen.length) FR.dealt.push(pool[k].name);
    used.add(k);
    return pool[k];
  };

  let stackRun = 0;
  for (let i = 0; i < n; i++) {
    let tpl;
    // Whether the ground-ordered draw below actually chose this room's shape. A set piece, the two
    // teaching rooms and a trap room are all forced or drawn from a pool of their own, so none of
    // them is the generator keeping, or breaking, its promise about the floor opening up.
    let drawn = false;
    const arena = (levelDef.arenas || []).find((a) => a.at === i);
    if (i === 0) tpl = START_TEMPLATE;
    else if (arena) tpl = arenaTpl(arena);
    else if (i === levelDef.millAt) tpl = levelDef.millLesson ? MILL_LESSON_TEMPLATE : MILL_TEMPLATE;
    else if (i === levelDef.hallAt) tpl = GREAT_HALL_TEMPLATE;
    else if (i === levelDef.galleryAt) tpl = GALLERY_TEMPLATE;
    else if (i === levelDef.killboxAt) tpl = KILLBOX_TEMPLATE;
    else if (i === sentryRoomAt) tpl = LESSON_TEMPLATE;
    else if (i === levelDef.ambushAt) tpl = AMBUSH_TEMPLATE;
    else if (i === levelDef.calmAt) tpl = CALM_TEMPLATE;
    else if (i === levelDef.chandAt) tpl = CHAND_LESSON_TEMPLATE;
    else if (restsOf(levelDef).includes(i)) tpl = REST_TEMPLATE;
    else if (i === armoryAt) tpl = ARMORY_TEMPLATE;
    else if (flankAt.has(i)) tpl = flankAt.get(i);
    else if (bridgeAt.has(i)) tpl = bridgeAt.get(i);
    else if (trapRooms.has(i)) tpl = (i === levelDef.trapAt && trapPool.find((t) => t.name === levelDef.trapTpl)) || trapPool[trapIdx++ % trapPool.length];
    else if (canonRooms.has(i)) { tpl = draw(canonPool, canonUsed, i, drawOrder.canon); drawn = true; }
    else { tpl = draw(mixPool, mixUsed, i, drawOrder.mix); drawn = true; }
    const source = tpl;
    tpl = flipTemplate(tpl, rng);
    // The cave squares nothing off: an ordinary room, an arena or a rest room there has its corners
    // filled back in with rock and a bulge or two grown out of its straight walls. Only floor is ever
    // turned to rock, and only where the room stays open round it (`erodeCave`); set pieces keep the
    // shapes their lessons were built round.
    if (levelDef.cave && (drawn || arena || restsOf(levelDef).includes(i))) tpl.rows = erodeCave(tpl.rows, rng);
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
      : restsOf(levelDef).includes(i) ? 'rest' : i === levelDef.calmAt ? 'calm'
      : i === armoryAt ? 'mix' : trapRooms.has(i) ? 'trap' : canonRooms.has(i) ? 'canon' : 'mix';
    // `seen` is the fog: a room is dark until the goat is standing in it. The first one is not.
    const room = { x, y, w, h, tpl, index: i, markers: [], arena, role, seen: i === 0, drawn,
      stacked: stacked ? stacked.dir : null,
      isMill: i === levelDef.millAt, isHall: i === levelDef.hallAt, isGallery: i === levelDef.galleryAt,
      isKillbox: i === levelDef.killboxAt, isTrap: trapRooms.has(i), isAmbush: i === levelDef.ambushAt,
      isRest: restsOf(levelDef).includes(i), isCalm: i === levelDef.calmAt, isCrowd: i === levelDef.crowdAt,
      isChand: i === levelDef.chandAt };
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const c = tpl.rows[ty][tx];
        const wx = x + tx, wy = y + ty;
        let t = T.FLOOR;
        if (c === '#' || c === 'P') t = T.WALL;
        else if (c === 'h') t = T.HAY;
        else if (c === 'O') { t = T.PIT; if (ty === 0) wallHoles.push(wy * W + wx); }
        else if (c === 'g') grass.add(wy * W + wx);
        tiles[wy * W + wx] = t;
        if ('eoRrmXBbtLMwSk'.includes(c)) room.markers.push({ tx: wx, ty: wy, c });
      }
    }
    rooms.push(room);
    if (i > 0) {
      const link = stacked ? carveShaft(tiles, W, rooms[i - 1], room, stacked.dir, rng, levelDef.corridorW)
        : carveCorridor(tiles, W, rooms[i - 1], room, rng, levelDef.corridorW, i - 1 === sentryRoomAt,
          { meet: levelDef.meet !== undefined ? !!levelDef.meet : !!CORRIDOR.meet, late: i - 1 === grassAt });
      if (!link) return null;
      if (link) {
        room.enter = link.enter;    // where you walk in, so a room can put something in your way
        // Some of the doors between rooms are iron. Nobody shoulders one open and it does not go on
        // the first blow, so a corridor you were going to run straight down is three blows of standing
        // still instead, which is the only thing in a corridor that can make you turn round and look.
        // A wide room is the exception the ordinary roll does not reach often enough on its own: it
        // is ground open enough to simply be run the length of, and the ordinary roll offered the door
        // that argues with that far too rarely. (THE THRESHING FLOOR's five-wide corridors take no
        // door at all, so none of this reaches it.) `BIG_ROOM.w` tiles of width forces the roll up, so the room's own exit, not just
        // its corridor doors, carries the same counter-play a narrower level gets for free.
        const bigExit = rooms[i - 1].w >= BIG_ROOM.w && link.door && rng.chance(BIG_ROOM.doorChance);
        if (link.door && (bigExit || rng.chance(levelDef.doorChance))) {
          const iron = bigExit || rng.chance(levelDef.ironDoors || 0);
          // Some of the iron ones are already swinging shut. `clockRoom` is the room in front of it,
          // because the count starts when that room is first seen and the whole of the offer is
          // crossing it before the door does. Whether it keeps the flag is decided further down,
          // once the plan says who is actually standing in that room, a door on a clock in an empty
          // room is a timer with nothing to beat.
          const timed = iron && rng.chance(levelDef.clockDoors || 0);
          props.push({ x: link.door.x, y: link.door.y, kind: 'door', vertical: link.door.vertical,
            iron, timed, clockRoom: timed ? i - 1 : -1, fromRoom: i - 1 });
        }
      }
    }
    x += w + (i === grassAt ? CORRIDOR.grassGap : rng.int(gapR[0], gapR[1]));
    // Still trending up the hill, but pulled back toward the middle of the world the further it
    // strays: a room hung above the last one starts the next stretch high already, and a chain that
    // only climbs ran into the top of the world and went on as a flat line along it.
    y += rng.int(jogR[0], jogR[1]) + Math.round((H * 0.55 - (y + h / 2)) * 0.2);
  }

  // Exit: a 2-tall flight of stairs cut into the right wall of the last room, marked EXIT.
  const last = rooms[rooms.length - 1];
  const doorY = pickDoorY(last, 'right', rng, enterRow(last));
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
    kind: 'door', vertical: true, iron: true, stair: true, fromRoom: last.index !== undefined ? last.index : rooms.length - 1 });
  // THE FORK (`TUNING.dark.fork`): on its floor the same wall carries a second flight, `apart` rows
  // or more from the first so it reads as another way and not a wider one, barred the same way.
  // It climbs to the next floor with the lamps out (`game.climbDark`). A last room with no row for
  // it is another seed, never a fork quietly left out (`GEN_RULES.fork`).
  let forkTile = null;
  const FK = TUNING.dark.fork;
  if (FK && FK.at >= 0 && FK.at + 1 < LEVELS.length && levelIndexOf(levelDef) === FK.at) {
    const col = last.w - 2, R = last.tpl.rows, rows = [];
    for (let ty = 1; ty < last.h - 2; ty++) {
      if (R[ty][col] === '#' || R[ty][col] === 'P' || R[ty + 1][col] === '#' || R[ty + 1][col] === 'P') continue;
      if (Math.abs(last.y + ty - doorY) >= FK.apart) rows.push(last.y + ty);
    }
    if (!rows.length) return null;
    const fy = rng.pick(farthest(rows, doorY));
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) tiles[(fy + dy) * W + (last.x + last.w - 1 + dx)] = T.EXIT;
    forkTile = { x0: last.x + last.w - 1, y0: fy };
    props.push({ x: (last.x + last.w - 1.5) * TILE, y: (fy + 1) * TILE, kind: 'door', vertical: true, iron: true, stair: true, fork: true,
      fromRoom: last.index !== undefined ? last.index : rooms.length - 1 });
  }

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
  // A template's own hole in its far wall ('O' on its top row: gantry, wellhole, windowrow) is a
  // window too, the legend always said so, with stone above it and the room's floor below.
  for (const i of wallHoles) if (tiles[i] === T.PIT && tiles[i - W] === T.WALL && tiles[i + W] === T.FLOOR) windows.add(i);
  for (let i = 1; i < rooms.length - 1; i++) {
    if (rng.chance(levelDef.windows || 0)) carveWindow(tiles, W, rooms[i], rng, windows);
  }

  // The vault. A small room cut into the stone above or below one ordinary room in the middle of the
  // level, with one tile of doorway between them and an iron door in it. Nothing is on the way to the
  // stairs: it is big grass, behind four blows or behind an open door that is a trap (`vaultKindOf`).
  const vault = levelDef.vaultAt !== undefined ? carveVault(tiles, W, H, rooms[levelDef.vaultAt], props, rng) : null;
  // A level that asks for a vault gets one. About one seed in two hundred put the room hard against
  // the top or the bottom of the world with no rock on either side to cut into; a fresh seed is
  // cheaper than a promise the level quietly drops.
  if (levelDef.vaultAt !== undefined && !vault) return null;
  if (vault) vault.kind = vaultKindOf(levelDef, seed, opts && opts.fresh);
  // The big grass is guarded, now and then, by the same floor that guards everything else once a
  // level has taught it: on a level that already has spikes, half the time the last stretch of ground
  // in front of the vault's own door grows teeth too, so the door's blows are not the only price of it.
  if (vault && levelDef.spikes && rng.chance(0.5)) {
    spikePatch(tiles, W, rooms[levelDef.vaultAt], props, rng, rng.int(4, 8), vault.doorTile);
  }

  // The soul gates. Every level stops you twice, in the middle and before the end (`gates` on the
  // level), behind a barred door that no blow opens: whoever in that room is carrying its soul is
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
    // On a level that keeps its gate souls (`gateKeeper`), the soul is in a man standing where it
    // would have lain; `startLevel` puts it in him and `bossPrize` lets it out. Placed, not bought:
    // a rest room is off the curve, and so is he.
    if (levelDef.gateKeeper && !shopGate) {
      const s = gates[gates.length - 1].soul;
      spawns.push({ x: s.x, y: s.y, kind: 'bearer', roomIndex: g, keeper: true });
    }
  }

  // Sealed arenas. A second kind of gate, earned by winning rather than by a soul: both ends of the
  // room narrow to a single tile the same way the soul gate's does, and neither door has any give in
  // it until `game.updateSeals` finds the room empty. Only an arena with a room on both sides
  // qualifies, the entrance narrows the room before it and the exit narrows the arena itself, and
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
  // the second blow, with a rack tucked into the rock behind it and, less often, a patch of grass,
  // rarer and worth more than the milk a level's ordinary rooms already hand out on a rhythm, so a
  // wall worth breaking is sometimes worth more than the rack alone would have been. Never the pen, a
  // set piece or the vault's own room, only rock nothing else has already carved.
  // `secretsAfter` keeps a wall that gives out of a level's opening rooms: level one is the only
  // level that needs telling, since a wall that cracks is not yet a thing the run has any reason to
  // go looking for before its first butcher. (It used to be "after the first arena", which on the
  // thirteen-room ramp left no ordinary room at all: THE ALTAR had no wall that gave, ever.)
  const secretsAfter = levelDef.secretsAfter !== undefined ? levelDef.secretsAfter : -1;
  const secretPool = rng.shuffle(ordinaryRooms(levelDef, rooms.length).filter((i) => i !== levelDef.vaultAt && i !== levelDef.chandAt && !trapRooms.has(i) && i > secretsAfter && i !== shopRoomOf(levelDef)));
  // The clover at his neck bends the odds here and nowhere else in the generator: a better chance
  // of the second wall, of grass behind either, and past a certain tier a wall in most rooms.
  // A floor with `secrets: [lo, hi]` (THE YARD, THE CAVE: 6 Oct 2026, "more secrets on two and three")
  // deals that many off the dice, the clover one more on top; every other floor is the old one, a
  // second at `chance2`. Each reads the main stream exactly as it did, so no other floor's layout moves.
  const SDEEP = TUNING.secret.deep, secLi = levelIndexOf(levelDef);
  const wantSecrets = luck.secret >= 3 ? Math.max(levelDef.secrets ? levelDef.secrets[1] : 2, Math.floor(secretPool.length * 0.6))
    : levelDef.secrets ? rng.int(levelDef.secrets[0], levelDef.secrets[1]) + (luck.secret > 1 && rng.chance(Math.min(1, TUNING.secret.chance2 * luck.secret)) ? 1 : 0)
    : 1 + (rng.chance(Math.min(1, TUNING.secret.chance2 * luck.secret)) ? 1 : 0);
  // The secret inside the secret, on its own stream so a floor that cuts none is the floor it was.
  const deepRng = new RNG(((seed >>> 0) ^ 0xdee95ec) >>> 0);
  let secretsPlaced = 0;
  for (const idx of secretPool) {
    if (secretsPlaced >= wantSecrets) break;
    const spot = carveSecret(tiles, W, H, rooms[idx], rng);
    if (!spot) continue;
    // `deep.chance` of niches (`late` from floor `lateFrom` on) have a second wall that gives at their
    // back. Its own tile goes into the outer niche's list, so it is stone and unseen until the first
    // wall is down, and the deep one is reached through the outer and nowhere else.
    const deep = !levelDef.shroom && deepRng.chance(secLi >= SDEEP.lateFrom ? SDEEP.late : SDEEP.chance) ? carveDeepSecret(tiles, W, H, spot, deepRng) : null;
    if (deep) spot.tiles.push(deep.tiles[0]);
    props.push({ x: spot.wall.x, y: spot.wall.y, kind: 'secret', wallColor: levelDef.wall, wallTop: levelDef.wallTop,
      nicheTiles: spot.tiles, wallSide: spot.side });
    if (deep) {
      props.push({ x: deep.wall.x, y: deep.wall.y, kind: 'secret', deep: true, wallColor: levelDef.wall, wallTop: levelDef.wallTop,
        nicheTiles: deep.tiles, wallSide: spot.side });
      // Better than the niche in front of it: always big grass, and now and then a cape beside it.
      props.push({ x: deep.heal.x, y: deep.heal.y, kind: 'heal', big: true });
      if (deepRng.chance(SDEEP.cape)) props.push({ x: deep.cape.x, y: deep.cape.y, kind: 'cape' });
    }
    if (rng.chance(Math.min(1, TUNING.secret.healChance * luck.grass))) props.push({ x: spot.heal.x, y: spot.heal.y, kind: 'heal', big: true });
    props.push({ x: spot.weapon.x, y: spot.weapon.y, kind: 'weapon', weapon: rng.chance(TUNING.prop.weapon.swordShare) ? 'sword' : 'shield' });
    secretsPlaced++;
  }

  // The mouse. On the levels in `shop.levels`, in the middle soul gate instead of its soul: a hole
  // at the foot of that room's top or bottom wall, a mark on the stone, not a tunnel anybody walks
  // into, with her on the boards in front of it and her three offers laid out in a row before her. A level that asks for her gets her: a room that cannot take the hole
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
  const crowdMul = (opts && opts.crowd > 1) ? opts.crowd : 1;
  const plan = planEncounters(levelDef, rooms, rng, crowdMul);
  // A COMBO (`TUNING.combos`): now and then one room is dealt as a pairing worth meeting. Before the
  // clock doors and the spawns, so both read the room as it will be. Its own stream.
  const combo = dealCombo(levelDef, rooms, plan, seed, opts);
  // THE CHASM (6 Oct 2026 playtest, `TUNING.chasm`): a band of drop one tile across a room, wall to wall,
  // between its way in and its way out, crossed only by the roll. Cut here, after the plan and before
  // anything is stood in the rooms, so every placement below already sees the hole. Its own stream.
  // `gaps` is every tile of it: what the generator's and the rules' floods let the goat over (`reachable`,
  // `walkedFrom`), and what an animal hops (`Beast.hopGap`). `GEN_RULES.chasm`.
  const chasms = [], gaps = new Set();
  if (!levelDef.shroom && !levelDef.dark) {
    const CH = TUNING.chasm, crng = new RNG((seed ^ 0xc4a5e) >>> 0), li = levelIndexOf(levelDef);
    const fits = (r) => chasmRoomFits(levelDef, r, rooms.length) && !sealedArenas.includes(r.index + 1)
      && !chasms.some((c) => Math.abs(c.room - r.index) < 2) && (!combo || combo.room !== r.index);
    const cut = (r) => {
      const c = carveChasm(tiles, W, r, crng, props);
      if (!c) return false;
      chasms.push(c); r.chasm = c; for (const i of c.tiles) { gaps.add(i); grass.delete(i); }
      // Nothing a template stood within a line of it: the men are bought for the room, not for its markers.
      r.markers = r.markers.filter((m) => Math.abs((c.axis === 'v' ? m.tx : m.ty) - c.at) > 1);
      // A clock on the door out of a room you cannot walk across is a timer you cannot beat.
      for (const p of props) if (p.kind === 'door' && p.timed && p.clockRoom === r.index) { p.timed = false; p.clockRoom = -1; }
      return true;
    };
    const ordered = rooms.filter(fits);
    if (levelDef.chasmLesson) {
      // The taught one: the first room that takes it, so it comes early and the floor says what to do.
      // An EMPTY room (7 Oct 2026 playtest: "it must be an empty room where I can try such a roll for the
      // first time"): never one that introduces a kind, and its men are taken out of the plan and the room
      // is calm from here on (`isCalm`, every placement below already skips it), so nobody is after him
      // while he learns that the roll carries him over a drop.
      for (const r of ordered) {
        // (never a hung room: `GEN_RULES.stack` keeps the calm one off the stack, and a quiet room is not hung)
        if (r.stacked || plan.introRooms.has(r.index) || (plan.rooms.get(r.index) || {}).boss || !cut(r)) continue;
        chasms[chasms.length - 1].lesson = true;
        r.isCalm = true; plan.rooms.set(r.index, { men: [], calm: true });
        break;
      }
      if (!chasms.length) return null;   // a floor that teaches it has it: a fresh cut rather than none
    }
    if (li >= CH.from && crng.chance(CH.chance)) {
      // A rifle or the butcher across it is the room the drop was made for: they are tried first.
      const far = (r) => { const c = plan.rooms.get(r.index); return c && (c.men || []).some((k) => CH.farKinds.includes(k)) ? 0 : 1; };
      const pool = crng.shuffle(ordered.filter(fits)).sort((a, b) => far(a) - far(b));
      for (const r of pool) if (cut(r)) break;
    }
  }
  // Which of the doors on a clock keep it. The offer only means anything if the room in front of it
  // holds enough to make staying costly, a count running down in an empty room is a timer with
  // nothing to beat, and it is never hung on a room that is teaching: the room that introduces a
  // kind, or the quiet beat after one, is the one place a level asks you to stand and look at
  // something, and a door shutting on that is the level arguing with itself.
  for (const p of props) {
    if (!p.timed) continue;
    const cell = plan.rooms.get(p.clockRoom);
    const teaching = plan.introRooms.has(p.clockRoom) || plan.introRooms.has(p.clockRoom - 1);
    if (!cell || teaching || (cell.men || []).length < 2 || walkTiles(tiles, W, rooms[p.clockRoom].enter, p) > TUNING.prop.door.clockReach) { p.timed = false; p.clockRoom = -1; }
  }
  // Arms are rare, and a level can hold them back: nothing to pick up until it is this far in.
  // Level one shows the first stand at the halfway mark, so the first half of the run is the goat,
  // his head, and whatever the room was already built out of.
  const racksFrom = Math.round((levelDef.racksFrom || 0) * (n - 1));
  // The room that holds the first man of the run. Level one shuts the way out of it behind him and
  // paints the word for the button on the floor. Nothing is SCATTERED into it: no grating to herd
  // him onto and no bowl of milk. What it has is what `LESSON_TEMPLATE` puts there by hand, two
  // crates on the near half, so the room has a size the eye can read, and one man.
  let lessonRoom = null, lessonIndex = -1;
  if (levelDef.showControls) {
    for (const r of rooms) { const c = plan.rooms.get(r.index); if (c && c.intro) { lessonIndex = r.index; break; } }
  }
  let roasted = false;
  let chandeliers = 0;   // hung so far this floor, and the id that ties each to its cleat
  let armors = 0, trophies = 0, suits = 0, posters = 0;   // the wall's dressing so far this floor (and the suits that stand), THE ARMORY's own not counted
  let clusterId = 0;  // one id per boulder formation (`placeRockCluster`), so `GEN_RULES.rocks` can
                       // tell a formation's own cells apart from two unrelated boulders standing close
  rooms.forEach((room) => {
    const spots = [];
    const cell = plan.rooms.get(room.index);
    // A gong is only worth anything with men in the room to answer it. In an empty room it is a
    // thing you hit once, hear nothing back from, and never touch again, which is how it came to
    // read as scenery. So the first rooms, the two control rooms and the pen simply do not get one.
    const manned = !!(cell && (cell.men.length || cell.boss));
    let wIdx = rng.int(0, 1);
    const tableTiles = new Set();   // every `t` of the room; `placeTables` stands them once the fires are down
    room.markers.forEach((m) => {
      const px = (m.tx + 0.5) * TILE, py = (m.ty + 0.5) * TILE;
      // A roast is picked off a hash of the tile, not the rng, so no seed moved when it landed,
      // and there is at most one a level, because a crocodile on every third fire stopped being a find.
      if (m.c === 'B') {
        const roast = !roasted && (((m.tx * 73856093) ^ (m.ty * 19349663)) >>> 0) % 1000 < TUNING.prop.brazier.roast * 1000;
        if (roast) roasted = true;
        props.push({ x: px, y: py, kind: 'brazier', roast });
      }
      else if (m.c === 'o') props.push({ x: px, y: py, kind: 'crate' });
      else if (m.c === 'b') { if (manned) props.push({ x: px, y: py, kind: 'bell' }); }
      else if (m.c === 'L') props.push({ x: px, y: py, kind: 'lamp' });
      else if (m.c === 't') tableTiles.add(m.ty * W + m.tx);
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
      // a thrown sword kills the man it reaches while a thrown shield only knocks him flat, a
      // lesson whose payoff is "he gets back up" is not a lesson anybody keeps.
      // The ogre's ring is all swords: a blade is one of the few things that costs him a heart.
      else if (m.c === 'w') { if (room.index >= racksFrom) props.push({ x: px, y: py, kind: 'weapon', weapon: room.isAmbush || (room.arena && room.arena.boss === 'butcher') ? 'sword' : room.isKillbox ? 'shield' : (wIdx++ % 2) ? 'sword' : 'shield' }); }
      else spots.push(m);
    });
    placeTables(tableTiles, W, props);
    shiftOffTables(room, props, tiles, W, grass);
    // Now and then a single stand of arms, anywhere a man might have left one. Never two, never
    // before the level says arms exist, and never in an arena, an arena carries its own pair.
    // Nor the ambush: its two swords are the lesson, and a third stand (often a shield) among its men was noise.
    if (room.index >= Math.max(1, racksFrom) && !room.arena && !room.isRest && !room.isCalm && !room.isAmbush && !room.isChand && rng.chance(Math.min(1, (levelDef.racks || 0) * luck.racks))) {
      for (let a = 0; a < 30; a++) {
        const tx = rng.int(room.x + 2, room.x + room.w - 3), ty = rng.int(room.y + 2, room.y + room.h - 3);
        if (tiles[ty * W + tx] !== T.FLOOR || grass.has(ty * W + tx)) continue;   // grass is drawn over what stands in it
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
    if (room.index > 0 && !room.isTrap && !room.isAmbush && !room.isRest && !room.isCalm && !room.isMill && !room.arena && !room.isHall
        && !room.isGallery && !room.isKillbox && room.index !== lessonIndex && !room.isChand && rng.chance(levelDef.spikes || 0)) {
      const S = TUNING.prop.spike;
      spikePatch(tiles, W, room, props, rng, rng.int(S.run[0], S.run[1]));
    }
    // Crates. Boxes of the compound's own stores, one to a tile, left where they were set down,
    // the plainest thing in a room: pick it up, throw it at a man, it comes apart on him.
    // Not in the wheel's lesson either: a crate in its one clear lane shut the way past the arm.
    if (room.index > 0 && !room.isAmbush && !room.isRest && !room.isCalm && room.index !== lessonIndex && !room.isChand
      && !(room.isMill && levelDef.millLesson) && rng.chance(levelDef.crates || 0)) {
      const want = room.tpl && room.tpl.name === 'armory' ? rng.int(0, TUNING.rooms.armory.crates) : rng.int(2, 4);
      for (let a = 0, placed = 0; a < 40 && placed < want; a++) {
        const tx = rng.int(room.x + 1, room.x + room.w - 2), ty = rng.int(room.y + 1, room.y + room.h - 2);
        if (tiles[ty * W + tx] !== T.FLOOR || grass.has(ty * W + tx)) continue;   // grass is drawn over what stands in it
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        if (props.some((p) => len(p.x - px, p.y - py) < 1.4 * TILE) || onTable(px, py, TUNING.prop.crate.r, props)) continue;
        props.push({ x: px, y: py, kind: 'crate' });
        placed++;
      }
    }
    // Grates with something on them (30 Sep 2026): a trap you find by moving what stands on it. In
    // THE ARMORY a grate may lie under any of its crates or stands of arms; elsewhere, on a floor that
    // lays grates, a room's patch may have a crate (or a barrel, where one fits) set down on one of
    // them. The grate is `hidden` and is not drawn while its cover stands there. Off its own stream.
    {
      const HG = TUNING.prop.spike.hidden, hrng = new RNG(((seed ^ 0x41dd3e5) + room.index * 104729) >>> 0);
      const inside = (p) => p.x >= room.x * TILE && p.x < (room.x + room.w) * TILE && p.y >= room.y * TILE && p.y < (room.y + room.h) * TILE;
      if (room.tpl && room.tpl.name === 'armory') {
        // Only where the floor lays grates at all (1 Oct 2026: "not from level two, only where traps are available").
        let n = 0;
        for (const p of levelDef.spikes ? hrng.shuffle(props.filter((q) => (q.kind === 'crate' || q.kind === 'weapon') && inside(q))) : []) {
          if (n < HG.armoryMax && hrng.chance(p.kind === 'weapon' ? HG.armoryStand : HG.armoryCrate)) { props.push({ x: p.x, y: p.y, kind: 'spike', hidden: true }); n++; }
        }
      } else if (levelDef.spikes && room.enter && !room.isTrap && !room.isAmbush && !room.isRest && !room.isCalm && !room.isMill && !room.arena
        && !room.isHall && !room.isGallery && !room.isKillbox && room.index !== lessonIndex && !room.isChand) {
        // Never a grate in straw: the cover set on it would stand hidden in the grass (GEN_RULES.grass).
        const grates = props.filter((q) => q.kind === 'spike' && q.patch && inside(q) && !grass.has(Math.floor(q.y / TILE) * W + Math.floor(q.x / TILE)));
        if (grates.length && hrng.chance(HG.cover)) {
          const g = grates[hrng.int(0, grates.length - 1)], tx = Math.floor(g.x / TILE), ty = Math.floor(g.y / TILE);
          if (!props.some((q) => q.kind !== 'spike' && len(q.x - g.x, q.y - g.y) < 1.2 * TILE) && len(room.enter.x - g.x, room.enter.y - g.y) >= 3 * TILE
            && !onTable(g.x, g.y, TUNING.prop.crate.r, props)) {
            const barrel = levelDef.barrels && activeIn(props, room) < TUNING.prop.clutter.max && hrng.chance(HG.barrel) && rockFits(tiles, W, tx, ty, grass);
            props.push(barrel ? { x: g.x, y: g.y, kind: 'barrel', toxic: hrng.chance(TUNING.prop.barrel.venom.chance) } : { x: g.x, y: g.y, kind: 'crate' });
            g.hidden = true;
          }
        }
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
    // A boulder formation: three to six of them grown together into one big thing to break, rather
    // than the ordinary scatter's lone stones. `levelDef.rockClusters` is the per-room chance, on top
    // of and independent from `rocks`, a room can have both a scatter and one formation. Every cell
    // is its own `rock` prop (its own crack, its own two hits) so nothing else in the game has to know
    // a formation from a boulder; `cluster` only tells `GEN_RULES.rocks` the cells belong together.
    if (room.index > 0 && !room.isRest && levelDef.rockClusters && rng.chance(levelDef.rockClusters)) {
      if (placeRockCluster(tiles, W, room, grass, props, rng, clusterId)) clusterId++;
    }
    // Barrels of lamp oil, one or two, stood where a boulder may stand: plain floor all round, so a
    // barrel that nobody touches is never what shuts a way through, and clear of the way in, so the
    // first thing a room does is not put one under his horns. Never in a room that is teaching,
    // resting or a set piece built narrow on purpose; a trap room keeps the shape it was drawn in.
    // Rolled off a stream of their own, so adding them did not reshuffle every roll that follows.
    const brng = new RNG(((seed ^ 0x0ba77e1) + room.index * 7919) >>> 0), CL = TUNING.prop.clutter;
    if (levelDef.barrels && room.index > 0 && !room.isAmbush && !room.isRest && !room.isCalm && !room.isTrap && !room.isMill && !room.isHall
        && !room.isGallery && !room.isKillbox && room.index !== lessonIndex && !room.isChand && brng.chance(levelDef.barrels)) {
      // no more than the room has room for (`prop.clutter.max`), and along its walls, not mid-floor
      const want = Math.min(brng.int(1, 2), CL.max - activeIn(props, room));
      for (let a = 0, placed = 0; a < 60 && placed < want; a++) {
        let tx = brng.int(room.x + 2, room.x + room.w - 3), ty = brng.int(room.y + 2, room.y + room.h - 3);
        if (brng.chance(0.5)) tx = brng.chance(0.5) ? room.x + CL.edge : room.x + room.w - 1 - CL.edge;
        else ty = brng.chance(0.5) ? room.y + CL.edge : room.y + room.h - 1 - CL.edge;
        if (!rockFits(tiles, W, tx, ty, grass)) continue;
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        if (props.some((p) => len(p.x - px, p.y - py) < 2 * TILE)) continue;
        if (room.enter && len(room.enter.x - px, room.enter.y - py) < 3 * TILE) continue;
        props.push({ x: px, y: py, kind: 'barrel', toxic: brng.chance(TUNING.prop.barrel.venom.chance) });
        placed++;
      }
    }
    // A chandelier (29 Sep 2026, Enter the Gungeon's): an iron ring of candles hung over open floor,
    // its rope run straight up the room to a cleat on the far wall. Butt the cleat, or throw a man
    // into it, or let fire reach it, and the ring comes down on whoever is under it (`Prop.cutRope`,
    // `Prop.updateChandelier`). Floor all round the spot, the cleat on stone with floor at its foot,
    // clear of the way in; never where a room is teaching, resting or built narrow on purpose, never
    // in a cave or on the trip (no far wall to tie off to), never in THE DARK. Its own RNG stream.
    const CH = TUNING.chandelier, crng = new RNG(((seed ^ 0x0c4a9d3) + room.index * 6151) >>> 0);
    if (!levelDef.cave && !levelDef.shroom && !levelDef.dark && room.index > 0 && chandeliers < CH.perLevel && !room.isAmbush && !room.isRest
        && !room.isCalm && !room.isTrap && !room.isMill && !room.isGallery && !room.isKillbox && room.index !== lessonIndex && !room.isChand
        && activeIn(props, room) < TUNING.prop.clutter.max && crng.chance(CH.chance)) {
      // 2 Oct 2026 playtest: the cleat and the ring need not be one over the other. The cleat goes on
      // the far wall by a way in or out (`CH.byDoor` columns of it) and the ring near a way in or out,
      // the rope run across the room between them: cut it walking out and it lands behind you on the
      // men following, or cut it coming in and it lands ahead. `CH.reach` columns at most apart.
      // 7 Oct 2026 playtest ("the light's switch is usually at the start of the room, so I can use it for my goal"):
      // the cleat is by the way IN in `CH.cleatIn` of the rooms and the ring by the way out, so the rope is in his
      // hand as he walks in and the ring comes down on whoever waits for him deeper in; the rest the other way round.
      const ends = [room.enter, room.exitMouth].filter(Boolean), colOf = (pt) => Math.floor(pt.x / TILE);
      const inRoom = (x, m) => clamp(x, room.x + m, room.x + room.w - 1 - m);
      const wayIn = room.enter || room.exitMouth, wayOut = room.exitMouth || room.enter;
      const cleatByIn = crng.chance(CH.cleatIn), cleatEnd = cleatByIn ? wayIn : wayOut, ringEnd = cleatByIn ? wayOut : wayIn;
      for (let a = 0; a < 60; a++) {
        const near = ends.length && a < 45;
        // The cleat first, by its door; the ring toward the other door from it, a few columns in (the rope's reach is
        // `CH.reach` columns, so a wide room's ring is not by its far door but as far across as the rope goes).
        let kx = near ? inRoom(colOf(cleatEnd) + crng.int(-CH.byDoor, CH.byDoor), 1) : -1;
        const dir = near ? (Math.sign(colOf(ringEnd) - kx) || (crng.chance(0.5) ? 1 : -1)) : 0;
        const tx = near ? inRoom(Math.abs(colOf(ringEnd) - kx) <= CH.reach ? colOf(ringEnd) + crng.int(-CH.nearDoor, CH.nearDoor) : kx + dir * crng.int(3, CH.reach), 2) : crng.int(room.x + 2, room.x + room.w - 3);
        const ty = crng.int(room.y + CH.fromWall, room.y + room.h - 3);
        if (!near) kx = tx;
        if (Math.abs(kx - tx) > CH.reach) continue;
        let open = true;
        for (let dy = -1; dy <= 1 && open; dy++) for (let dx = -1; dx <= 1; dx++) if (tiles[(ty + dy) * W + tx + dx] !== T.FLOOR) { open = false; break; }
        if (!open || tiles[room.y * W + kx] !== T.WALL || tiles[(room.y + 1) * W + kx] !== T.FLOOR) continue;
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE, cx = (kx + 0.5) * TILE, cy = (room.y + 1.25) * TILE;
        if (props.some((p) => len(p.x - px, p.y - py) < 1.6 * TILE || len(p.x - cx, p.y - cy) < 1.2 * TILE)) continue;
        if (room.enter && (len(room.enter.x - px, room.enter.y - py) < 3 * TILE || len(room.enter.x - cx, room.enter.y - cy) < 1.5 * TILE)) continue;
        // `byWay`: the cleat was put by a way in or out (the first tries); `GEN_RULES.chandeliers` holds it to that.
        props.push({ x: px, y: py, kind: 'chandelier', cid: chandeliers }, { x: cx, y: cy, kind: 'cleat', cid: chandeliers, byWay: near });
        chandeliers++;
        break;
      }
    }
    // The wall's dressing (30 Sep 2026, Enter the Gungeon's): a suit of armour or a stag's head hung
    // on the far wall. Both answer a thrown body (`Enemy.wallDressing`) and
    // neither is a weapon of its own, so they are few: one of the two in a room that rolls for it, a
    // couple of each a floor, never where a room is teaching, resting, a set piece or a trap, never
    // under a chandelier's rope, and none in a cave, on the trip or in THE DARK (whose lamps stand
    // against the same walls). THE ARMORY is the armour's home and always stands `armor.armory`.
    // Its own RNG stream, so no roll anywhere else moved when they came in. `GEN_RULES.armor` / `trophies`.
    const AR = TUNING.prop.armor, TR = TUNING.prop.trophy, drng = new RNG(((seed ^ 0x0a3d0f7) + room.index * 4099) >>> 0);
    const armory = room.tpl && room.tpl.name === 'armory';
    if (!levelDef.cave && !levelDef.shroom && !levelDef.dark && room.index > 0 && !room.arena && !room.isAmbush && !room.isRest
        && !room.isCalm && !room.isTrap && !room.isMill && !room.isHall && !room.isGallery && !room.isKillbox && room.index !== lessonIndex && !room.isChand
        && !props.some((p) => p.kind === 'chandelier' && inBox(room, p))) {
      // One roll a room for the dressing, then whichever of the two the floor has fewer of goes up first,
      // the other if its spot will not fit (5 Oct 2026 playtest: "I never see a stag's head any more":
      // the armour rolled first and took the room, and a floor with its two suits up was most of the way
      // through before a head was ever tried; a head was on a third of floors, a suit on two thirds).
      const roll = drng.float(0, 1), canA = room.index >= AR.from && armors < AR.perLevel, canT = room.index >= TR.from && trophies < TR.perLevel;
      if (armory) { for (let k = 0; k < AR.armory; k++) dressWall(tiles, W, room, props, grass, drng, 'armor', true); }
      else if ((canA || canT) && roll < AR.chance + TR.chance) {
        const first = !canA ? 'trophy' : !canT ? 'armor' : trophies < armors ? 'trophy' : armors < trophies ? 'armor' : roll < TR.chance ? 'trophy' : 'armor';
        for (const kind of [first, first === 'armor' ? 'trophy' : 'armor']) {
          if (kind === 'armor' ? !canA : !canT) continue;
          if (dressWall(tiles, W, room, props, grass, drng, kind)) { if (kind === 'armor') armors++; else trophies++; break; }
        }
      }
      // The suit that stands on the floor (1 Oct 2026): a post in the room on plain floor, where the
      // room stays open round it (`rockFits`), off the way in and clear of anything else that stands.
      // THE ARMORY has `suit.armory` of them; elsewhere it rolls like the wall's dressing. Own stream.
      const SU = TUNING.prop.suit, srng = new RNG(((seed ^ 0x05b17e3) + room.index * 7907) >>> 0);
      const wantSuit = armory ? SU.armory : room.index >= SU.from && suits < SU.perLevel && srng.chance(SU.chance) ? 1 : 0;
      for (let a = 0, placed = 0; a < 80 && placed < wantSuit; a++) {
        const tx = srng.int(room.x + 2, room.x + room.w - 3), ty = srng.int(room.y + 2, room.y + room.h - 3);
        if (!rockFits(tiles, W, tx, ty, grass)) continue;
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        if (props.some((p) => len(p.x - px, p.y - py) < 2 * TILE) || onTable(px, py, SU.r, props)) continue;
        if (room.enter && len(room.enter.x - px, room.enter.y - py) < 3 * TILE) continue;
        props.push({ x: px, y: py, kind: 'suit' });
        placed++; if (!armory) suits++;
      }
      // The cult's paper (6 Oct 2026, his redesign): a scrap folded on the floor that opens into its drawing when
      // he finds it, for the book's OBJECTS. Under one of the room's tables `underTable` of the time (a thing to
      // look for), else on plain floor clear of everything. Not in THE ARMORY. Which drawing is the game's
      // (`Game.layScraps`: only one this browser has not found, or none), so `look` here is only a default.
      const PO = TUNING.prop.poster, porng = new RNG(((seed ^ 0x0f05713) + room.index * 5233) >>> 0);
      if (!armory && room.index >= PO.from && posters < PO.perLevel && porng.chance(PO.chance)) {
        const look = PO.looks[(seed + posters + room.index) % PO.looks.length];
        const tables = props.filter((q) => q.kind === 'table' && inBox(room, q));
        let at = tables.length && porng.chance(PO.underTable) ? porng.pick(tables) : null;
        for (let a = 0; !at && a < 60; a++) {
          const tx = porng.int(room.x + 2, room.x + room.w - 3), ty = porng.int(room.y + 2, room.y + room.h - 3);
          if (!rockFits(tiles, W, tx, ty, grass)) continue;
          const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
          if (props.some((q) => len(q.x - px, q.y - py) < 1.5 * TILE) || room.enter && len(room.enter.x - px, room.enter.y - py) < 2.5 * TILE) continue;
          at = { x: px, y: py };
        }
        if (at) { props.push({ x: at.x, y: at.y, kind: 'poster', look }); posters++; }
      }
    }
    // THE SPIKES. Most of the rock a cave grows is paint (`Renderer.drawCaveDecor`); this is the rare
    // spire that is real, and everything about where it may stand follows from what it is for. It has
    // to be AT A WALL, a spike in the middle of a room is a thing you walk round, a spike at the
    // foot of a wall is a thing you throw men into, and the wall was already the weapon. It has to be
    // clear of the way in, of the furniture and of the grass, and there is at most `perRoom` of it,
    // because a hazard in every room is furniture. Never in a room that is teaching a kind and never
    // in a trap room, for the same reason a grate is not scattered into one: one idea to a floor.
    // Never on the trip: the controls are that level's whole difficulty and a thing that kills on
    // contact is not something to meet with hands that do the opposite of what you tell them.
    // The ogre's ring is the one arena that takes them, and always `ring` of them: he is caught on a
    // tooth he lands by (`cave.spikes.impale`), and with none in his ring that never happened in
    // play, the cave's only ogre is fought there (28 Sep 2026).
    const ogreRing = !!(room.arena && room.arena.boss === 'butcher');
    // The shaman is met alone (8 Oct 2026 playtest), with one tooth in his room for his call to pull the goat onto,
    // at the wall as near the middle of the room as one stands.
    const shamanMeet = !!(cell && cell.intro === 'shaman');
    if (levelDef.cave && !levelDef.shroom && room.index > 0 && !room.isRest && (!room.arena || ogreRing) && !room.isTrap && !room.isAmbush
        && !room.isMill && !room.isHall && !room.isGallery && !room.isKillbox
        && (ogreRing || shamanMeet || (!(cell && cell.intro) && rng.chance(TUNING.cave.spikes.chance)))) {
      const solidAt = (tx, ty) => tiles[ty * W + tx] === T.WALL;
      let mid = null;
      for (let a = 0, placed = 0; a < (ogreRing || shamanMeet ? 120 : 40) && placed < (ogreRing ? TUNING.cave.spikes.ring : TUNING.cave.spikes.perRoom); a++) {
        const tx = rng.int(room.x + 1, room.x + room.w - 2), ty = rng.int(room.y + 1, room.y + room.h - 2);
        const i = ty * W + tx;
        if (tiles[i] !== T.FLOOR || grass.has(i)) continue;
        // At the foot of a wall, with floor enough round it that it is standing in the room rather
        // than tucked into a corner nobody goes into.
        let stone = 0, floor = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (solidAt(tx + dx, ty + dy)) stone++;
          else if (tiles[(ty + dy) * W + tx + dx] === T.FLOOR) floor++;
        }
        if (stone < 1 || floor < 2) continue;
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        if (room.enter && len(room.enter.x - px, room.enter.y - py) < 3 * TILE) continue;
        if (props.some((p) => len(p.x - px, p.y - py) < 1.6 * TILE)) continue;
        if (shamanMeet) { const d = len(px - (room.x + room.w / 2) * TILE, py - (room.y + room.h / 2) * TILE); if (!mid || d < mid.d) mid = { x: px, y: py, d }; continue; }
        props.push({ x: px, y: py, kind: 'spire' });
        placed++;
      }
      if (mid) props.push({ x: mid.x, y: mid.y, kind: 'spire' });
    }
    if (!cell) return;                                                       // the pen stays empty
    // The wheel's own lesson, on the level that first shows it: the two men stand past the arm, on
    // the far side of it from the door, and one of them cannot read it. `trapSense` does all of the
    // work, nought means he never sees a hazard and takes the arm in the chest on his way to you,
    // one means he always does and comes round it, so nothing here is scripted and neither man is
    // a special case anywhere else in the game. Sorted by distance from where you walk in, because
    // the room is flipped as freely as any other and "past the wheel" has to survive that.
    if (cell.lesson && room.enter) {
      const off = (m) => len((m.tx + 0.5) * TILE - room.enter.x, (m.ty + 0.5) * TILE - room.enter.y);
      const far = spots.filter((m) => m.c === 'e').sort((a, b) => off(a) - off(b)).slice(-2);
      if (far.length >= 2) {
        // Which of the two cannot read it is the one the arm will throw AWAY from the other: it turns
        // one way only (`updateMill`, angle rising), so a man met on the side of the hub he runs in
        // from goes off along (-sin a, cos a) plus a push outward, and picked the other way round he
        // was flung into his partner, and the careful man died of the careless one's lesson.
        const hub = room.markers.find((m) => m.c === 'M');
        const away = (m, o) => {
          if (!hub) return 0;
          const a = Math.atan2(m.ty - hub.ty, m.tx - hub.tx);
          return (-Math.sin(a) + 0.4 * Math.cos(a)) * (o.tx - m.tx) + (Math.cos(a) + 0.4 * Math.sin(a)) * (o.ty - m.ty);
        };
        const careless = away(far[0], far[1]) <= away(far[1], far[0]) ? 0 : 1;
        far.forEach((m, i) => spawns.push({ x: (m.tx + 0.5) * TILE, y: (m.ty + 0.5) * TILE,
          kind: 'bearer', roomIndex: room.index, sense: i === careless ? 0 : 1 }));
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
      // trying anything on him, so there is nowhere left to walk round to, the room opens when he
      // goes down and not before.
      const at = levelDef.sentryIntro ? blockSpot(tiles, W, room, props) : null;
      if (at) {
        spawns.push(Object.assign({ x: at.x, y: at.y }, spawnKind(cell.intro), { roomIndex: room.index, intro: true, sentry: true,
          facing: Math.PI }));                                  // back to the door, facing the room
        return;
      }
    }
    // THE YARD's chandelier lesson (`chandAt`, 2 Oct 2026, "a narrow way out where you bring the
    // chandelier down on the man under it"): the way out shut to its one row (`narrowExit`), one
    // clubman a step inside it holding it as the sentry does, and the ring hung over him, its rope
    // straight up to a cleat on the far wall. He is the room; the cleat is the answer.
    if (cell.chand) {
      const b = narrowExit(tiles, W, room, props), tx = b ? b.x0 - 1 : -1;
      // The pier only chose the door's row: once it is cut the pier goes back to floor, so the goat
      // at the cleat sees the ring land on him (from behind stone he was not drawn at all).
      if (b) for (let ty = room.y + 1; ty < b.y; ty++) if (room.tpl.rows[ty - room.y][tx - room.x] === 'P') tiles[ty * W + tx] = T.FLOOR;
      if (b && tiles[b.y * W + tx] === T.FLOOR && tiles[room.y * W + tx] === T.WALL && tiles[(room.y + 1) * W + tx] === T.FLOOR) {
        const px = (tx + 0.5) * TILE, py = (b.y + 0.5) * TILE;
        props.push({ x: px, y: py, kind: 'chandelier', cid: chandeliers, lesson: true }, { x: px, y: (room.y + 1.25) * TILE, kind: 'cleat', cid: chandeliers });
        chandeliers++;
        spawns.push(Object.assign({ x: px, y: py }, spawnKind('bearer'), { roomIndex: room.index, post: true, facing: Math.PI }));
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
      if (at) spawns.push(Object.assign({ x: at.x, y: at.y }, spawnKind(cell.boss),
        { elite: cell.boss !== 'butcher', boss: true, roomIndex: room.index }, cell.hp ? { hp: cell.hp } : null));
    }
    let slot = 0;
    for (const kind of cell.men) {
      const at = take(kind); const i = slot++;
      if (!at) continue;
      spawns.push(Object.assign({ x: at.x, y: at.y }, spawnKind(kind), { roomIndex: room.index, intro: cell.intro === kind,
        // The first few men of a killbox are its rifles, and they are already watching the door.
        alert: cell.alert !== undefined && i < cell.alert }));
    }
  });

  // The thrower's ammunition (`TUNING.thrower.ammo`, `GEN_RULES.thrower`): a room he stands in has that many
  // crates in it at least, so he always has something of his own to lift before he goes for one of his men.
  // Its own stream: a floor without him is laid exactly as it was.
  for (const sp of spawns) {
    const room = sp.thrower && rooms[sp.roomIndex];
    if (!room) continue;
    const trng = new RNG(((seed ^ 0x7a2b0e5) + room.index * 6007) >>> 0), inside = (p) => p.x > room.x * TILE && p.x < (room.x + room.w) * TILE && p.y > room.y * TILE && p.y < (room.y + room.h) * TILE;
    // A crate in the wheel's sweep is taken up again at the end (`MILL_CLEAR`): it is not his.
    let have = props.filter((p) => (p.kind === 'crate' || p.kind === 'bomb') && inside(p) && !inMillSweep(props, p.x, p.y)).length;
    // A crowded room (THE ARMORY) takes them a tile apart in the second half of the tries; a standing
    // suit of armour keeps its two tiles clear whatever happens (`GEN_RULES.suits`).
    for (let a = 0; a < 160 && have < TUNING.thrower.ammo; a++) {
      const tx = trng.int(room.x + 1, room.x + room.w - 2), ty = trng.int(room.y + 1, room.y + room.h - 2);
      if (tiles[ty * W + tx] !== T.FLOOR || grass.has(ty * W + tx)) continue;
      const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE, gap = a < 80 ? 1.4 : 1;
      if (props.some((p) => len(p.x - px, p.y - py) < (p.kind === 'suit' ? 2.1 : p.kind === 'poster' ? 1.5 : gap) * TILE) || onTable(px, py, TUNING.prop.crate.r, props)) continue;
      if (spawns.some((o) => len(o.x - px, o.y - py) < 0.9 * TILE) || inMillSweep(props, px, py)) continue;
      if (room.enter && len(room.enter.x - px, room.enter.y - py) < 1.5 * TILE) continue;
      props.push({ x: px, y: py, kind: 'crate' }); have++;
    }
  }

  // Some of the men in a room with grass in it are lying in the grass. Not the boss, not a butcher and
  // not the dead, a man who hides is an ordinary one, and each goes to the grass tile of his own
  // room with the most grass round it, so what shows of him is the top of him and nothing more.
  if (grass.size) {
    const taken = new Set();
    for (const sp of spawns) {
      if (sp.boss || sp.champion || sp.shield || sp.thrower || sp.sentry || sp.post || sp.alert || !['bearer', 'dog', 'hunter', 'seer'].includes(sp.kind)) continue;
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
      // A post goes only where no rifle stands already: one line to cross, not a second one on top of
      // the first, four rifles in one room was a wall nobody could read (playtest, 23 Sep 2026).
      if (spawns.some((s) => s.roomIndex === room.index && s.kind === 'hunter')) continue;
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
  // the most threat rather than to a secret's own quiet niche, a bomb tucked behind a broken
  // wall had nothing near it worth throwing it at, which is the whole reason a rare find sat
  // unused. `spawns` is final by now, so the score is the room's real men, boss included.
  if (rng.chance(TUNING.prop.bomb.chance)) {
    const scoreOf = (s) => THREAT[threatKind(s)] || 0;
    const eligible = rooms.filter((r) => r.index > 0 && !r.arena && !r.isMill && !r.isHall
      && !r.isGallery && !r.isKillbox && !r.isTrap && !r.isAmbush && !r.isRest && !r.isCalm && r.index !== lessonIndex && !r.isChand
      // nor a room where a kind is met: THE ALTAR's always went in with the first butcher, alone
      && !plan.introRooms.has(r.index));
    let best = null, bestScore = -1;
    for (const room of eligible) {
      if (activeIn(props, room) >= TUNING.prop.clutter.max) continue;   // a room already full of things that go off
      const score = spawns.filter((s) => s.roomIndex === room.index).reduce((a, s) => a + scoreOf(s), 0);
      if (score > bestScore) { best = room; bestScore = score; }
    }
    if (best && bestScore > 0) {
      for (let a = 0; a < 40; a++) {
        const tx = rng.int(best.x + 1, best.x + best.w - 2), ty = rng.int(best.y + 1, best.y + best.h - 2);
        if (tiles[ty * W + tx] !== T.FLOOR || grass.has(ty * W + tx)) continue;   // grass is drawn over what stands in it
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        if (props.some((p) => len(p.x - px, p.y - py) < 1.6 * TILE)) continue;
        props.push({ x: px, y: py, kind: 'bomb' });
        break;
      }
    }
  }

  // THE ESCORT. One animal a floor, standing loose in an ordinary room inside the first
  // `TUNING.beast.third` of the level, first third because the whole of one is the walk from where you
  // find it to the stairs, and a tortoise found in the last room is a tortoise that was never a
  // decision. `levelDef.beasts` is which of them this floor may hold and the dice pick one of those.
  // Never in the pen, a rest room, a teaching room or a set piece: an escort is a thing to meet on
  // an ordinary floor, and every one of those rooms is already saying something else.
  // What each of them then does is js/beasts.js; `GEN_RULES.beasts` holds this placement.
  // In a run the game says which (`opts.beast`, the run's deal in `Beast.deal`, so no kind comes
  // twice): a kind, or null for a floor that gets none. Without it, the balance report, the dev
  // drawer's samples, the dice pick off the floor's own list, as they always did.
  if (levelDef.beasts && levelDef.beasts.length && opts.beast !== null) {
    const BT = TUNING.beast, cut = Math.max(2, Math.ceil(rooms.length * BT.third));
    const rolled = levelDef.beasts[rng.int(0, levelDef.beasts.length - 1)];
    const kind = opts.beast || rolled;
    const eligible = rng.shuffle(rooms.filter((r) => r.index > 0 && r.index <= cut && !r.arena && !r.isMill
      && !r.isHall && !r.isGallery && !r.isKillbox && !r.isAmbush && !r.isRest && !r.isCalm && !r.isTrap
      && r.index !== lessonIndex && !r.isChand && r.index !== levelDef.vaultAt))
      // A room where a kind is met alone is tried last: the first hound or mage of a run shared his
      // room with a coop four times in ten on THE YARD, and "met alone" is the point of that room.
      .sort((a, b) => plan.introRooms.has(a.index) - plan.introRooms.has(b.index));
    // It starts shut in a coop, whichever animal it is, two tiles of slatted crate you have to put
    // your head through (and which calls out as he comes near, `Prop.updateCoop`), so meeting one is
    // a decision to stop rather than something that happened to be standing in the room.
    let done = false;
    // The horse is a race to the locked rooms with a soul (`Beast.horseLegs`), so it is found
    // before the first of them: freed past the middle gate it had nothing left to race for. Its
    // stall is three tiles by two (`TUNING.prop.stall`): every tile of it plain floor, standing
    // where the room's floor is still one piece without it (`stallKeepsRoomOpen`), against a wall
    // like a stall should, never across a lane, and well off the way in and the way out.
    const firstGate = gates.length ? Math.min(...gates.map((g) => g.room)) : Infinity;
    if (kind === 'horse') {
      const S = TUNING.prop.stall;
      for (const room of eligible) {
        if (room.index >= firstGate || room.w - 2 < S.w || room.h - 2 < S.h) continue;
        for (let a = 0; a < 80 && !done; a++) {
          const tx = rng.int(room.x + 1, room.x + room.w - 1 - S.w), ty = rng.int(room.y + 1, room.y + room.h - 1 - S.h);
          let ok = true;
          for (let y = ty; y < ty + S.h && ok; y++) for (let x = tx; x < tx + S.w && ok; x++) {
            if (tiles[y * W + x] !== T.FLOOR || grass.has(y * W + x)) ok = false;
          }
          if (!ok || !stallKeepsRoomOpen(tiles, W, room, tx, ty, S)) continue;
          const st = { x: (tx + S.w / 2) * TILE, y: (ty + S.h / 2) * TILE, kind: 'coop', holds: kind, beastRoom: room.index };
          if (props.some((p) => footGap(st, p.x, p.y) < BT.clear * TILE)) continue;
          if (onTable(st.x, st.y, 1, props, S.w * TILE / 2, S.h * TILE / 2)) continue;   // a table's top reaches a tile from its middle
          if (room.enter && footGap(st, room.enter.x, room.enter.y) < S.mouth * TILE) continue;
          if (room.exitMouth && footGap(st, room.exitMouth.x, room.exitMouth.y) < S.mouth * TILE) continue;
          props.push(st); done = true;
        }
        if (done) break;
      }
    }
    // No room before the gate with a stall's worth of floor (two floors in a hundred): the run dealt
    // this floor its horse, so the floor is cut again rather than handed over without one.
    if (kind === 'horse' && !done && opts.beast === 'horse') return null;
    for (const room of kind === 'horse' ? [] : eligible) {
      for (let a = 0; a < 60 && !done; a++) {
        const tx = rng.int(room.x + 1, room.x + room.w - 3), ty = rng.int(room.y + 1, room.y + room.h - 2);
        if (tiles[ty * W + tx] !== T.FLOOR || tiles[ty * W + tx + 1] !== T.FLOOR) continue;
        if (grass.has(ty * W + tx) || grass.has(ty * W + tx + 1)) continue;
        const px = (tx + 1) * TILE, py = (ty + 0.5) * TILE;
        if (props.some((p) => len(p.x - px, p.y - py) < Math.max(BT.clear, 2.2) * TILE) || onTable(px, py, TUNING.prop.coop.r, props)) continue;
        if (room.enter && len(room.enter.x - px, room.enter.y - py) < 2.5 * TILE) continue;
        // The fish needs no coop: its tank stands on the floor (js/beasts-more.js).
        props.push(kind === 'fish' ? { x: px, y: py, kind: 'fish', beastRoom: room.index } : { x: px, y: py, kind: 'coop', holds: kind, beastRoom: room.index }); done = true;
      }
      if (done) break;
    }
    // THE IRON (`TUNING.keys.iron`, 3 Oct 2026). Some floors shut the animal in iron instead of slats,
    // and stand a second iron cage with big milk grass in it in another room: two doors that want the
    // same key, so the key is a choice (the animal, or the hearts). Its own stream, so a floor without
    // iron is laid exactly as it was. Never the horse's stall.
    const KI = TUNING.keys.iron, irng = new RNG(((seed ^ 0x1c0ca9e) >>> 0));
    const coop = props.find((p) => p.kind === 'coop' && p.holds !== 'horse');
    const coopRoom = coop && rooms.find((r) => r.index === coop.beastRoom);
    // The slats break to one blow; iron would not, so a coop standing in a room's only way through stays slats.
    // and neither does one in front of either of its doors (they are counted outside the room's floor)
    const clearOf = (m) => !m || len(m.x - coop.x, m.y - coop.y) >= 2.5 * TILE;
    if (coop && coopRoom && clearOf(coopRoom.enter) && clearOf(coopRoom.exitMouth) && discKeepsRoomOpen(tiles, W, coopRoom, coop.x, coop.y, ironReach())
      && levelIndexOf(levelDef) >= KI.from && !(opts && opts.noIron) && irng.chance(KI.chance)) {
      // The cage of grass stands in the coop's own room, `pair` tiles from it (5 Oct 2026, his answer: "a
      // choice between the two cages is right, only then in one room, and it must read, grass or animal"):
      // the two are seen together and the one key is spent on one of them. Neither may cut the room in two
      // with the other standing. No spot, no iron on this floor.
      const room = coopRoom, P = KI.pair;
      let laid = null;
      for (let a = 0; a < 120 && !laid; a++) {
        const tx = irng.int(room.x + 1, room.x + room.w - 3), ty = irng.int(room.y + 1, room.y + room.h - 2);
        if (tiles[ty * W + tx] !== T.FLOOR || tiles[ty * W + tx + 1] !== T.FLOOR) continue;
        if (grass.has(ty * W + tx) || grass.has(ty * W + tx + 1)) continue;
        const px = (tx + 1) * TILE, py = (ty + 0.5) * TILE, d = len(coop.x - px, coop.y - py);
        if (d < P[0] * TILE || d > P[1] * TILE) continue;
        if (props.some((p) => p !== coop && len(p.x - px, p.y - py) < 2.2 * TILE) || onTable(px, py, KI.r, props)) continue;
        if (room.enter && len(room.enter.x - px, room.enter.y - py) < 2.5 * TILE) continue;
        if (room.exitMouth && len(room.exitMouth.x - px, room.exitMouth.y - py) < 2.5 * TILE) continue;
        if (!discKeepsRoomOpen(tiles, W, room, px, py, ironReach(), [[coop.x, coop.y]])) continue;
        laid = { x: px, y: py, kind: 'ironcage', holds: 'grass', ironRoom: room.index };
      }
      if (laid) { coop.ironCage = true; props.push(laid); }
    }
  }

  // The mushrooms: one tuft, some levels, lying on the floor of an ordinary room where nothing else
  // is, and nothing about it says it matters. Eaten, the next level is THE TRIP (`tripLevel`). Never
  // on the last level (there is no next one) nor the one before it, the run is won on THE OSSUARY,
  // not on a trip at the first floor's curve with the wraith never met (28 Sep 2026), never on the
  // trip itself, never in a room that is teaching or a room that is a fight you cannot walk out of.
  const li = levelIndexOf(levelDef), SH = TUNING.shroom;
  if (li >= SH.from && li < LEVELS.length - 2 && rng.chance(SH.chance)) {
    const eligible = rng.shuffle(rooms.filter((r) => r.index > 0 && !r.arena && !r.isMill && !r.isHall && !r.isGallery
      && !r.isKillbox && !r.isAmbush && !r.isRest && r.index !== lessonIndex && !r.isChand && r.index !== levelDef.vaultAt));
    let done = false;
    for (const room of eligible) {
      for (let a = 0; a < 40 && !done; a++) {
        const tx = rng.int(room.x + 1, room.x + room.w - 2), ty = rng.int(room.y + 1, room.y + room.h - 2);
        if (tiles[ty * W + tx] !== T.FLOOR || grass.has(ty * W + tx)) continue;
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        if (props.some((p) => footGap(p, px, py) < 1.6 * TILE)) continue;
        if (room.enter && len(room.enter.x - px, room.enter.y - py) < 2 * TILE) continue;
        props.push({ x: px, y: py, kind: 'shrooms' }); done = true;
      }
      if (done) break;
    }
  }

  // Milk, on a rhythm rather than on a roll. A run is meant to be offered a bowl every few rooms,
  // so the level is cut into that many bands and each band gives one up, the room inside a band is
  // random, the spacing is not. `heals` is a floor: a long level gets more bowls, never a longer
  // dry spell, and the same eligibility as before keeps them out of the set pieces.
  const healable = rooms.filter((r) => r.index > 0 && !r.arena && !r.isMill && !r.isGallery
    && !r.isKillbox && r.index !== lessonIndex && !r.isChand);
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
  // From level 4 on, a level carries enough forced rooms, two or three arenas, the mill, the
  // vault, a killbox, that a band's nearest eligible room can land well past what its idealised
  // width promised, and several thin bands can end up crowding the same stretch while another
  // goes hungry. This walks the picks in room order and drops one more bowl into any real gap
  // over `heal.gapMax`, rather than trusting the band math alone to have kept every gap that short.
  if (levelIndexOf(levelDef) >= 3) {
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
  // was floor and nothing else, so a bowl could be laid down on top of a brazier, the last heart of
  // a level standing in a fire, drawn over the coals with the flame coming up behind it. It keeps a
  // clearance from the furniture now and a wide berth from anything alight, and the second pass gives
  // up the clearance but never the berth: a bowl may be awkwardly placed, it may not be in a fire.
  // THE DARK (`TUNING.dark`, its canon THE LAMP). Every room with men in it, and every arena and
  // rest room, men or not, has a standing lamp or two (`lamps`, two once the floor is `big`), the
  // template's own flames counted toward it: against a wall with floor across from it, off the
  // doorways, and spread, each one as far as it can be from the flames already there, so between
  // them they show the room and not one corner of it. Before the milk, which keeps its berth from
  // these too. And a lantern on the wall by every doorway (`sconce`), never on the near wall: a
  // small light that nothing puts out, so the way in and the way on are always there to be seen.
  // `GEN_RULES.dark` holds both.
  if (levelDef.dark) {
    const LA = TUNING.dark.lamps, alight = (p) => p.kind === 'brazier' || p.kind === 'lamp';
    const inside = (room, x, y) => x >= room.x * TILE && x < (room.x + room.w) * TILE && y >= room.y * TILE && y < (room.y + room.h) * TILE;
    const tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= W || ty >= H ? T.WALL : tiles[ty * W + tx]);
    const hidden = new Set(props.filter((p) => p.kind === 'secret' || (p.kind === 'door' && p.vault)).map((p) => Math.floor(p.y / TILE) * W + Math.floor(p.x / TILE)));
    for (const room of rooms) {
      if (room.index === shopAt) continue;
      // The doorways: runs of open tile in the room's own wall ring, by side. A wall that gives and the
      // vault's door are not doorways: a lantern hung by one gave the secret away.
      const doors = [], runs = [];
      const side = (pts, dir) => {
        let run = null;
        for (const [tx, ty] of pts) {
          if (tileAt(tx, ty) !== T.WALL && !hidden.has(ty * W + tx)) { doors.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }); if (!run) runs.push(run = { dir, a: [tx, ty], b: [tx, ty] }); else run.b = [tx, ty]; }
          else run = null;
        }
      };
      const col = (x) => Array.from({ length: room.h - 2 }, (_, k) => [x, room.y + 1 + k]);
      const row = (y) => Array.from({ length: room.w - 2 }, (_, k) => [room.x + 1 + k, y]);
      side(col(room.x), 'w'); side(col(room.x + room.w - 1), 'e'); side(row(room.y), 'n'); side(row(room.y + room.h - 1), 's');
      const manned = room.index > 0 && (room.arena || room.isRest || spawns.some((sp) => inside(room, sp.x, sp.y)));
      if (manned) {
        const cand = [], loose = [];
        let floor = 0;
        for (let ty = room.y + 1; ty < room.y + room.h - 1; ty++) for (let tx = room.x + 1; tx < room.x + room.w - 1; tx++) {
          if (tiles[ty * W + tx] !== T.FLOOR) continue;
          floor++;
          if (grass.has(ty * W + tx)) continue;
          const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
          if (doors.some((d) => len(d.x - px, d.y - py) < LA.door * TILE)) continue;
          if (props.some((p) => footGap(p, px, py) < 1.6 * TILE)) continue;
          if (spawns.some((sp) => len(sp.x - px, sp.y - py) < 1.5 * TILE)) continue;
          // Against a wall, with floor across from it and to either side: a lamp in a lane would be
          // a plug in it. A room with no such spot takes one standing on open floor instead.
          const at = (dx, dy) => tiles[(ty + dy) * W + tx + dx];
          let wall = false, open = true;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (at(dx, dy) !== T.FLOOR) open = false;
            if (at(dx, dy) !== T.WALL) continue;
            if (at(-dx, -dy) === T.FLOOR && at(dy, dx) !== T.PIT && at(-dy, -dx) !== T.PIT && (at(dy, dx) === T.FLOOR || at(-dy, -dx) === T.FLOOR)) wall = true;
          }
          if (wall) cand.push({ x: px, y: py }); else if (open) loose.push({ x: px, y: py });
        }
        const want = room.tpl && room.tpl.lamps ? room.tpl.lamps : floor >= LA.big ? LA.max : LA.min;   // a template may say how many
        const lit = props.filter((p) => alight(p) && inside(room, p.x, p.y));
        for (const pool of [cand, loose]) {
          while (lit.length < want) {
            let best = null, bd = -1;
            for (const c of rng.shuffle(pool.slice())) {
              const d = lit.length ? Math.min(...lit.map((l) => len(l.x - c.x, l.y - c.y))) : 1;
              if (lit.length && d < LA.apart * TILE) continue;
              if (d > bd) { bd = d; best = c; }
            }
            if (!best) break;
            const lamp = { x: best.x, y: best.y, kind: 'lamp', darkLamp: true };
            props.push(lamp); lit.push(lamp);
          }
        }
      }
      for (const r of runs) {
        // Beside the opening, on the wall it is cut in: the tile just inside at either end of it, or
        // one further along. Straw under it is fine (a rest room has it in every corner); a lantern
        // on the wall is out of reach of it.
        // Each end walked out from the opening (`e`), and an end stops at the first tile that is not floor:
        // past a wall across the room (THE DARK's crossing) the lantern lit the far side of the wall and
        // left the doorway in the dark (2 Oct 2026).
        const spots = [], stopped = new Set();
        for (const k of [1, 2]) {
          if (r.dir === 'w') spots.push([room.x + 1, r.a[1] - k, -1, 0, 0], [room.x + 1, r.b[1] + k, -1, 0, 1]);
          else if (r.dir === 'e') spots.push([room.x + room.w - 2, r.a[1] - k, 1, 0, 0], [room.x + room.w - 2, r.b[1] + k, 1, 0, 1]);
          else if (r.dir === 'n') spots.push([r.a[0] - k, room.y + 1, 0, -1, 0], [r.b[0] + k, room.y + 1, 0, -1, 1]);
        }
        let hung = false;
        for (const [tx, ty, wx, wy, e] of spots) {
          if (stopped.has(e)) continue;
          const under = tileAt(tx, ty);
          if (under !== T.FLOOR && under !== T.HAY) { stopped.add(e); continue; }
          if (tileAt(tx + wx, ty + wy) !== T.WALL) continue;
          // On a side wall the lantern hangs at a man's shoulder, which on the screen is the tile
          // above its own: that stretch of wall has to be stone too, or the plate is bolted to the
          // air of the doorway (25 Sep 2026, a lantern hanging off nothing beside the opening).
          if (wx && tileAt(tx + wx, ty - 1) !== T.WALL) continue;
          const px = (tx + 0.5 + wx * 0.25) * TILE, py = (ty + 0.5 + wy * 0.25) * TILE;
          hung = true;
          if (props.some((p) => p.kind === 'sconce' && len(p.x - px, p.y - py) < 1.5 * TILE)) break;
          props.push({ x: px, y: py, kind: 'sconce', wx, wy });
          break;
        }
        // No wall to hang one on beside a side doorway (an opening in the corner of the room, or one the
        // crossing's wall runs up to): a lamp stands beside it on the floor, as by a doorway in the near wall.
        if (!hung && r.dir !== 's' && !props.some((p) => (alight(p) || p.kind === 'sconce') && len(p.x - (r.a[0] + r.b[0] + 1) / 2 * TILE, p.y - (r.a[1] + r.b[1] + 1) / 2 * TILE) < LA.doorLit * TILE)) {
          const ends = [];
          for (const k of [1, 2, 3]) {
            if (r.dir === 'w') ends.push([room.x + 1, r.a[1] - k, 0], [room.x + 1, r.b[1] + k, 1]);
            else if (r.dir === 'e') ends.push([room.x + room.w - 2, r.a[1] - k, 0], [room.x + room.w - 2, r.b[1] + k, 1]);
            else ends.push([r.a[0] - k, room.y + 1, 0], [r.b[0] + k, room.y + 1, 1]);
          }
          const gone = new Set(); let stood = false;
          for (const [tx, ty, e] of ends) {
            if (gone.has(e)) continue;
            if ((tileAt(tx, ty) !== T.FLOOR && tileAt(tx, ty) !== T.HAY)) { gone.add(e); continue; }
            if (grass.has(ty * W + tx)) continue;
            const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
            if (props.some((p) => footGap(p, px, py) < (p.kind === 'crate' || p.kind === 'spike' ? 0.9 : 1.2) * TILE) || spawns.some((sp) => len(sp.x - px, sp.y - py) < 0.9 * TILE)) continue;
            props.push({ x: px, y: py, kind: 'lamp', doorLamp: true });
            stood = true; break;
          }
          if (!stood) return null;   // a fresh seed, not a way on in the dark
        }
        // A doorway in the near wall (a shaft down to a room hung below) takes no lantern, that wall
        // shows no face to hang one on, so a lamp stands beside it instead, unless a flame already
        // does: otherwise the way on down was found only by walking the walls in the dark.
        let lampedDown = false;
        if (r.dir === 's' && !props.some((p) => (alight(p) || p.kind === 'sconce') && len(p.x - (r.a[0] + r.b[0] + 1) / 2 * TILE, p.y - (r.a[1] + 0.5) * TILE) < LA.doorLit * TILE)) {
          for (const [tx, ty] of [1, 2, 3].flatMap((k) => [[r.a[0] - k, r.a[1] - 1], [r.b[0] + k, r.a[1] - 1]])) {
            if ((tileAt(tx, ty) !== T.FLOOR && tileAt(tx, ty) !== T.HAY) || tileAt(tx, ty + 1) !== T.WALL || grass.has(ty * W + tx)) continue;
            const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
            if (props.some((p) => footGap(p, px, py) < (p.kind === 'crate' || p.kind === 'spike' ? 0.9 : 1.2) * TILE) || spawns.some((sp) => len(sp.x - px, sp.y - py) < 0.9 * TILE)) continue;
            props.push({ x: px, y: py, kind: 'lamp', doorLamp: true });
            lampedDown = true;
            break;
          }
          // Nowhere beside it to stand one (1 seed in 400): a fresh seed, not a way on in the dark.
          if (!lampedDown) return null;
        }
      }
    }
  }
  healRooms.forEach((room) => {
    const alight = (p) => p.kind === 'brazier' || p.kind === 'lamp';
    const spots = [];
    for (let ty = room.y + 2; ty <= room.y + room.h - 3; ty++) {
      for (let tx = room.x + 2; tx <= room.x + room.w - 3; tx++) {
        if (tiles[ty * W + tx] !== T.FLOOR) continue;
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        let fire = Infinity, near = Infinity, hole = Infinity;
        for (const p of props) { const d = footGap(p, px, py); if (alight(p)) fire = Math.min(fire, d); else near = Math.min(near, d); }
        if (props.some((p) => stallHalf(p) && footGap(p, px, py) < 0.8 * TILE)) continue;   // never in the horse's stall, however narrow the room
        if (onTable(px, py, TUNING.prop.heal.r, props)) continue;   // nor under a table's top, which the fallbacks below do not weigh
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (tiles[(ty + dy) * W + tx + dx] === T.PIT) hole = Math.min(hole, Math.hypot(dx, dy) * TILE);
        // `good`: out of the grass that would hide it and off a drop's lip, where grazing, standing
        // still, head down, was one knock from the fall (one bowl in seven on THE RAFTERS).
        spots.push({ x: px, y: py, fire, near, good: !grass.has(ty * W + tx) && hole >= 1.6 * TILE });
      }
    }
    if (!spots.length) return;
    // Clear of the furniture and a long way from anything alight. A narrow room may hold nothing that
    // good, and then the clearance goes before the berth does: the bowl may stand awkwardly, it may
    // not stand in a fire. The last resort is the three tiles furthest from the nearest flame, because
    // the level is promised a bowl in this band and not getting one is the worse of the two faults.
    let pool = spots.filter((p) => p.good && p.fire >= 2.6 * TILE && p.near >= 1.7 * TILE);
    if (!pool.length) pool = spots.filter((p) => p.good && p.fire >= 2.6 * TILE);
    if (!pool.length) pool = spots.filter((p) => p.fire >= 2.6 * TILE && p.near >= 1.7 * TILE);
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

  // THE FIRST GRASS (`levelDef.firstGrass`, THE ALTAR; 5 Oct 2026 playtest: "I did not know the grass heals").
  // One bowl more, in the straight run of a corridor he has to walk, the first one past the sentry's room that
  // nothing narrows, with nothing else within `heal.firstClear` tiles of it: he cannot miss it, and the floor words
  // beside it (`Renderer.drawFirstWords`) say what it is. On top of the rhythm, never instead of a bowl of it.
  if (levelDef.firstGrass) {
    const narrowed = new Set([sentryRoomAt, levelDef.chandAt, ...restsOf(levelDef), ...(levelDef.arenas || []).map((a) => a.at)]);
    // 6 Oct 2026 playtest ("again two grasses in one room"): a room that already has its rhythm bowl is passed over
    // on the first walk; only if none else has a straight run does the second walk take it.
    let placed = false;
    for (const lone of [true, false]) for (const room of rooms) {
      if (placed) break;
      if (room.index <= Math.max(0, sentryRoomAt) || narrowed.has(room.index) || !room.exitBand) continue;
      if (lone && (healRooms.includes(room) || props.some((p) => p.kind === 'heal' && p.x > room.x * TILE - 2 * TILE && p.x < (room.x + room.w + 2) * TILE && p.y > room.y * TILE && p.y < (room.y + room.h) * TILE))) continue;
      // `run`: the corridor's straight stretch, the whole of it when it never turns (`carveCorridor`).
      const b = room.exitBand, turn = b.run !== undefined ? b.run + 1 : b.x1 - b.wide + 1;
      let spot = null;
      for (let tx = b.x0 + 1; tx < turn && !spot; tx++) {
        let open = true;
        for (let k = 0; k < b.wide; k++) if (tiles[(b.y + k) * W + tx] !== T.FLOOR || grass.has((b.y + k) * W + tx)) open = false;
        const px = (tx + 0.5) * TILE, py = (b.y + b.wide / 2) * TILE;
        if (open && !props.some((p) => len(p.x - px, p.y - py) < TUNING.prop.heal.firstClear * TILE)) spot = { x: px, y: py };
      }
      if (spot) { props.push({ x: spot.x, y: spot.y, kind: 'heal', firstGrass: true }); placed = true; }
    }
  }

  // Where the mouse's milk goes if it is the offer taken, worked out once the room's own furniture is
  // in: the floor nearest her gap, more than a tile off it so nobody grazes in her doorway, spread so
  // the bowls read as three and not as one smudge, and, the promise every other bowl keeps, never in
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
  if (!reachable(tiles, W, H, Math.floor(start.x / TILE), Math.floor(start.y / TILE), last.x + last.w - 1, doorY, gaps)) return null;
  if (forkTile && !reachable(tiles, W, H, Math.floor(start.x / TILE), Math.floor(start.y / TILE), forkTile.x0, forkTile.y0, gaps)) return null;

  // THE CHASM's far side. A rifle or the butcher in its room stands across it from the way in
  // (`chasm.farKinds`: the line and the hook are what reach over a drop), on the best of a few rolls of
  // that side's floor clear of the rest; and nothing heavy stands where a roll takes off or lands.
  for (const ch of chasms) {
    const r = rooms[ch.room], v = ch.axis === 'v', side = (x, y) => Math.sign((v ? x : y) / TILE - ch.at - 0.5) || 1;
    for (const s of spawns) {
      if (s.roomIndex !== r.index || !TUNING.chasm.farKinds.includes(s.champion ? 'champion' : s.kind) || side(s.x, s.y) === ch.far) continue;
      let best = null, bs = -Infinity;
      for (let k = 0; k < 60; k++) {
        const tx = rng.int(r.x + 1, r.x + r.w - 2), ty = rng.int(r.y + 1, r.y + r.h - 2);
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        if (tiles[ty * W + tx] !== T.FLOOR || side(px, py) !== ch.far || Math.abs((v ? tx : ty) - ch.at) < 2) continue;
        let near = Infinity; for (const o of spawns) if (o !== s) near = Math.min(near, len(o.x - px, o.y - py));
        let prop = Infinity; for (const p of props) if (p.kind !== 'door') prop = Math.min(prop, len(p.x - px, p.y - py));
        if (near < 1.5 * TILE || prop < 0.9 * TILE) continue;
        const sc = Math.min(near, 3 * TILE) + Math.min(prop, 1.2 * TILE) * 2;
        if (sc > bs) { bs = sc; best = { x: px, y: py }; }
      }
      if (!best) return null;   // no floor across it for him: a fresh cut
      s.x = best.x; s.y = best.y;
    }
    for (let i = props.length - 1; i >= 0; i--) {
      const p = props[i];
      if (CHASM_CLEAR.has(p.kind) && chasmNear(ch, p.x, p.y) < TUNING.chasm.clear * TILE) props.splice(i, 1);
    }
  }
  // One door at a time (6 Oct 2026 playtest: "two doors, that cannot be in the rules"): an ordinary corridor
  // door within `DOOR_APART` tiles of a gate or a seal is taken down, the barred one is the door there.
  for (let i = props.length - 1; i >= 0; i--) {
    const p = props[i];
    if (p.kind !== 'door' || p.gate || p.seal || p.stair || p.vault) continue;
    if (props.some((o) => o.kind === 'door' && (o.gate || o.seal) && len(o.x - p.x, o.y - p.y) < DOOR_APART * TILE)) props.splice(i, 1);
  }
  // Safety: nothing spawns within 5 tiles of the start, and the start room keeps no props underfoot.
  const filtered = spawns.filter((s) => len(s.x - start.x, s.y - start.y) > 5 * TILE);
  const cleanProps = props.filter((p) => p.kind === 'door' || p.kind === 'cage' || len(p.x - start.x, p.y - start.y) > 3 * TILE);
  // The wheel's sweep is kept bare (`MILL_CLEAR`): whatever any pass above stood in it is taken up, and
  // a grate it was hiding is a plain grate again.
  if (cleanProps.some((p) => p.kind === 'mill')) {
    for (let i = cleanProps.length - 1; i >= 0; i--) {
      const p = cleanProps[i];
      if (!MILL_CLEAR.has(p.kind) || !inMillSweep(cleanProps, p.x, p.y)) continue;
      for (const g of cleanProps) if (g.kind === 'spike' && g.hidden && len(g.x - p.x, g.y - p.y) < 4) g.hidden = false;
      cleanProps.splice(i, 1);
    }
  }
  // Nobody is put down inside the furniture. A spawn marker and a crate scattered later could land
  // on the same tile, and a man who starts inside a box is a man who never gets out of it, he
  // stood there the whole level, wedged. Walk him out in rings to the nearest clear floor of the
  // same room; the sentry is exempt because `blockSpot` already chose his tile with the props in it.
  for (const sp of filtered) {
    if (sp.sentry || sp.post || !inFurniture(sp.x, sp.y, cleanProps)) continue;
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
  // read, nodded at and not connected to anything, the first player we watched got all the way to
  // the wheel without working out that the men could be hit at all.
  const controls = [];
  if (levelDef.showControls) {
    // Block 0 waits for the cage to give, and then takes over the exact spot the headbutt prompt was
    // painting: moving is the next thing worth saying once the one that got him out has been said.
    controls.push({ x: start.x, y: cagePrompt ? cagePrompt.y : start.y + 1.8 * TILE, w: 13 * TILE, part: 0 });
    // Block 1 is grab and throw, in the room that stands a blade inside the door and a crate a step
    // past it with the men well down the far end, see `AMBUSH_TEMPLATE`.
    const amb = rooms[levelDef.ambushAt];
    if (amb) controls.push({ x: (amb.x + amb.w / 2) * TILE, y: (amb.y + amb.h / 2) * TILE, w: amb.w * TILE, part: 1 });
    // Block 2 is the headbutt, on the floor of the room that finally has a man standing on it.
    if (lessonRoom) controls.push({ x: (lessonRoom.x + lessonRoom.w / 2) * TILE,
      y: (lessonRoom.y + lessonRoom.h / 2) * TILE, w: lessonRoom.w * TILE, part: 2 });
    // The roll used to be taught here too, before there was a single thing in the level worth
    // dodging. It waits instead for the first room past the lesson that already holds a small crowd
    // - a dodge means nothing as a word on an empty floor, picked closest to the level's own middle
    // so it lands well into the run rather than right on the man who is still teaching the headbutt.
    const firstArenaAt = levelDef.arenas && levelDef.arenas[0] ? levelDef.arenas[0].at : -1;
    const eligible = ordinaryRooms(levelDef, rooms.length)
      .filter((i) => i !== lessonIndex && i !== levelDef.chandAt && i !== levelDef.vaultAt && i !== levelDef.ambushAt && !trapRooms.has(i))
      .map((i) => ({ i, men: ((plan.rooms.get(i) || {}).men || []).length }))
      .filter((c) => c.men >= 1);
    const byIndex = new Map(eligible.map((c) => [c.i, c]));
    // The room right outside a level's own first arena is where the dodge and the point-blank
    // parry actually matter, whatever is on the far side of that door is the first real fight
    // in the run, so this is a hard preference and not merely a tiebreaker: walk back from that
    // door looking for anywhere to paint it, a small crowd first and a single man second, and only
    // give up on landing before the fight at all once there is nothing eligible left to walk back
    // to. `closest to the middle` used to win outright whenever the exact room before the door
    // happened to hold nobody, which could land the line on the far side of the level's first real
    // fight instead of before it.
    let pick = null;
    // A level may name the kind whose first room it goes in (`rollWith`, THE ALTAR's butcher): painted
    // a few steps inside that room's door, so it is read walking in, before his first hook.
    const meet = levelDef.rollWith ? [...plan.rooms].find(([, c]) => c.intro === levelDef.rollWith && !c.arena) : null;
    const mr = meet && rooms[meet[0]];
    if (mr && mr.enter) {
      const ex = mr.enter.x / TILE, ey = mr.enter.y / TILE, cx = mr.x + mr.w / 2, cy = mr.y + mr.h / 2;
      // Along the way in: a door in a side wall reads across the room, one in the top or bottom down it.
      const side = Math.abs(ex - cx) / mr.w >= Math.abs(ey - cy) / mr.h, inset = TUNING.hints.rollInset;
      // 8 Oct 2026 playtest ("E - ROLL in the corridor before the butcher, and nothing may cover it"): along the straight
      // corridor outside a side door, where nothing is ever stood, when it runs `hints.rollRun` tiles or more; else inside.
      // The corridor's floor is walked out from the door (`hints.rollWalk` steps, in no room) and the longest straight
      // stretch along a row is taken, the nearest of the longest.
      const inAny = (x, y) => rooms.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
      const open = (x, y) => x >= 0 && y >= 0 && x < W && y < H && tiles[y * W + x] !== T.WALL && tiles[y * W + x] !== T.PIT && !inAny(x, y);
      const seen = new Set(), q = [], dx0 = Math.floor(ex), dy0 = Math.floor(ey);
      for (let k = 1; k <= 3; k++) for (const [x, y] of [[dx0 - k, dy0], [dx0 + k, dy0], [dx0, dy0 - k], [dx0, dy0 + k]]) if (open(x, y) && !seen.has(y * W + x)) { seen.add(y * W + x); q.push([x, y, k]); }
      let best = null;
      for (let i = 0; i < q.length; i++) {
        const [x, y, d] = q[i];
        let a = x, b = x; while (open(a - 1, y)) a--; while (open(b + 1, y)) b++;
        const run = b - a + 1;
        if (!best || run > best.run || (run === best.run && d < best.d)) best = { a, b, y, run, d };
        if (d < TUNING.hints.rollWalk) for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (open(nx, ny) && !seen.has(ny * W + nx)) { seen.add(ny * W + nx); q.push([nx, ny, d + 1]); }
      }
      if (best && best.run >= TUNING.hints.rollRun) {
        const n = Math.min(best.run, 8), near = Math.abs(best.a - dx0) < Math.abs(best.b - dx0), x0 = near ? best.a : best.b - n + 1;
        controls.push({ x: (x0 + n / 2) * TILE, y: (best.y + 0.5) * TILE, w: n * TILE, part: 3, corridor: true });
      } else {
        const tx = side ? clamp(ex + Math.sign(cx - ex) * inset, mr.x + 2, mr.x + mr.w - 2) : clamp(ex, mr.x + 3, mr.x + mr.w - 3);
        const ty = side ? clamp(ey, mr.y + 1.5, mr.y + mr.h - 1.5) : clamp(ey + Math.sign(cy - ey) * inset, mr.y + 1.5, mr.y + mr.h - 1.5);
        controls.push({ x: tx * TILE, y: ty * TILE, w: Math.min(mr.w, 10) * TILE, part: 3 });
      }
      pick = 'placed';
    }
    if (!pick && firstArenaAt > 0) {
      for (const wantCrowd of [true, false]) {
        for (let i = firstArenaAt - 1; i >= 1 && !pick; i--) {
          const c = byIndex.get(i);
          if (c && (!wantCrowd || c.men >= 2)) pick = c;
        }
        if (pick) break;
      }
    }
    if (!pick && eligible.length) {
      // No populated ordinary room stands before the level's own first arena at all, a short
      // level with the arena right past the pen. Falls back to the old placement: a small crowd
      // closest to the level's own middle, so the line still lands somewhere worth trying it.
      const mid = (rooms.length - 1) / 2;
      const crowded = eligible.filter((c) => c.men >= 2);
      const rollCandidates = (crowded.length ? crowded : eligible).slice()
        .sort((a, b) => Math.abs(a.i - mid) - Math.abs(b.i - mid));
      pick = rollCandidates[0];
    }
    if (pick && pick !== 'placed') {
      const r = rooms[pick.i];
      controls.push({ x: (r.x + r.w / 2) * TILE, y: (r.y + r.h / 2) * TILE, w: r.w * TILE, part: 3 });
    }
  }
  // Block 4, the voice (`levelDef.teachScream`, THE YARD): in the first ordinary room with two men or
  // more, a blow worth breaking, never a trap, the vault's, a gate or an arena.
  if (levelDef.teachScream) {
    const skip = new Set([lessonIndex, levelDef.vaultAt, levelDef.ambushAt, ...(levelDef.arenas || []).map((a) => a.at)]);
    // Failing that, the first trap room or arena with two in it, the boss counted (since 2 Oct 2026 THE
    // YARD's room 4, the plain room that most often held the pair, is the butcher's ring).
    const pick = (loose) => ordinaryRooms(levelDef, rooms.length).concat(loose ? (levelDef.arenas || []).map((a) => a.at) : []).sort((a, b) => a - b).find((i) => {
      const c = plan.rooms.get(i);
      if (i < 1 || !c || (c.men || []).length + (c.boss ? 1 : 0) < 2) return false;
      return loose ? i !== lessonIndex && i !== levelDef.vaultAt : !skip.has(i) && !trapRooms.has(i) && !c.arena && (c.men || []).length >= 2;
    });
    const at = pick(false) !== undefined ? pick(false) : pick(true);
    if (at !== undefined) {
      const r = rooms[at];
      controls.push({ x: (r.x + r.w / 2) * TILE, y: (r.y + r.h / 2) * TILE, w: Math.min(r.w, 12) * TILE, part: 4 });
    }
  }
  // Block 5, the roll over a drop (THE CHASM's lesson, `levelDef.chasmLesson`): across the middle of the floor
  // on the near side of it, so it is read walking up to the lip.
  const taught = chasms.find((c) => c.lesson);
  if (taught) {
    const r = rooms[taught.room], v = taught.axis === 'v', a0 = v ? r.x + 1 : r.y + 1, a1 = v ? r.x + r.w - 1 : r.y + r.h - 1;
    const n0 = taught.far > 0 ? a0 : taught.at + 1, n1 = taught.far > 0 ? taught.at : a1, mid = (n0 + n1) / 2;
    controls.push(v ? { x: mid * TILE, y: (r.y + r.h / 2) * TILE, w: (n1 - n0 + 2) * TILE, part: 5, chasm: taught.room }
      : { x: (r.x + r.w / 2) * TILE, y: mid * TILE, w: r.w * TILE, part: 5, chasm: taught.room });
    // Nothing lies over it (8 Oct 2026 playtest: "the main thing, do not cover it with objects"): straw, tall grass and
    // anything loose taken off the words' own patch of floor.
    const c = controls[controls.length - 1], cx0 = Math.floor(c.x / TILE) - 3, cx1 = Math.floor(c.x / TILE) + 3, cy0 = Math.floor(c.y / TILE) - 1, cy1 = Math.floor(c.y / TILE) + 1;
    for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) { const i = y * W + x; if (tiles[i] === T.HAY) tiles[i] = T.FLOOR; grass.delete(i); }
    for (let i = cleanProps.length - 1; i >= 0; i--) {
      const p = cleanProps[i], tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
      if (tx >= cx0 && tx <= cx1 && ty >= cy0 && ty <= cy1 && ['crate', 'barrel', 'rock', 'bomb', 'table', 'weapon'].includes(p.kind)) cleanProps.splice(i, 1);
    }
  }
  // A first meeting is a bare room (8 Oct 2026 playtest: "the very first room with the dog, a few less things; for a
  // first meeting it is overfull"): the room that introduces a kind in `rooms.firstMeet.kinds` loses what hangs and
  // what was scattered (`drop`), and keeps no more than `crates` crates and `tables` tables.
  { const FM = TUNING.rooms.firstMeet;
    for (const [ri, cell] of plan.rooms) {
      if (!cell.intro || !FM.kinds.includes(cell.intro)) continue;
      const r = rooms[ri], inR = (p) => p.x >= r.x * TILE && p.x < (r.x + r.w) * TILE && p.y >= r.y * TILE && p.y < (r.y + r.h) * TILE;
      const keep = { crate: FM.crates, table: FM.tables };
      // A table with a scrap of the cult's paper under it stays (`GEN_RULES.posters`: the scrap was laid for it).
      const roof = (p) => p.kind === 'table' && cleanProps.some((q) => q.kind === 'poster' && q.x === p.x && q.y === p.y);
      for (let i = 0; i < cleanProps.length; i++) {
        const p = cleanProps[i]; if (!inR(p) || roof(p)) continue;
        if (FM.drop.includes(p.kind) || (keep[p.kind] !== undefined && keep[p.kind]-- <= 0)) { cleanProps.splice(i, 1); i--; }
      }
    }
  }
  // The ogre's vault wakes him into its room, where the horns do nothing to him: a room with nothing
  // that hurts him keeps the grass instead (1.89 backlog).
  if (vault && vault.kind === 'ogre' && !ogreArmed(rooms[levelDef.vaultAt], cleanProps)) {
    vault.kind = 'grass';
    if (opts.fresh && opts.fresh.vault === 'ogre') opts.fresh.vault = null;   // the unseen kind was not laid after all
  }
  const level = { W, H, tiles, rooms, spawns: filtered, props: cleanProps, start, exit, exitTile, forkTile, entry, seed, def: levelDef,
    hints, controls, cagePrompt, vault, windows, plan, gates, sealedArenas, shop, combo, chasms, gaps, crowdMul,
    // Grass lying under a wall that went back up is not grass: only what is still on floor.
    grass: [...grass].filter((i) => tiles[i] === T.FLOOR), exitGate: null };
  level.carpets = layCarpets(level);
  // THE EXIT GATE (1 Oct 2026: "a soul gate before the way out of every level"): the iron door in front
  // of the stairs is barred like a soul gate, and what lifts it is the soul the last boss carries
  // (`soulPlan` deals the last bosses their souls; `startLevel` tags his with this gate). Only where that
  // soul is really in the last room, a floor with no soul there keeps its ordinary door. THE FORK's
  // second flight is barred by the same soul. `GEN_RULES.exitgate`.
  if (TUNING.soul.exitGate && !levelDef.shroom) {
    const lastIdx = rooms.length - 1, plan2 = soulPlan(level);
    const doors = cleanProps.filter((p) => p.kind === 'door' && p.stair), door = doors.find((p) => !p.fork);
    if (door && plan2.ensoul.some((i) => filtered[i] && filtered[i].roomIndex === lastIdx)) {
      for (const d of doors) { d.gate = true; d.gateRoom = lastIdx; d.exitGate = true; }
      level.exitGate = { room: lastIdx, x: door.x, y: door.y };
    }
  }
  return level;
}

// The mouse's hole: a spot at the foot of the room's own top or bottom wall with solid rock behind
// it, so the ogre's breach never trades on a room or a corridor. Nothing is cut, `gap` is where
// the burrow is drawn and where the ogre comes through the wall.
// Every place a room's top or bottom wall could take the hole, five tiles of wall and niche row
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
  const li = levelIndexOf(levelDef);
  return TUNING.shop.levels.includes(li) && levelDef.gates && levelDef.gates.length ? levelDef.gates[0] : -1;
}
// What a mouse stocks: `TUNING.shop.wares` distinct talismans. The first mouse of a run sells COMMON
// only; on a later one each slot is a RARE or EPIC talisman at `shop.rare[visit]`, else a COMMON one (8 Oct 2026:
// a talisman has one form and its own rarity, `ARTIFACTS[].rarity`; before, a RARE tier of the same talisman). Now and then (`TUNING.cape.shopChance`) one of them is a
// cape instead, the only way to one besides a niche behind a niche. Nothing is priced: the offer is a
// choice, not a sale. What he already wears is swapped out in play (`Shop.restock`), never here: the
// generator knows the floor, not the goat.
function stockFor(levelDef, rng) {
  const S = TUNING.shop, li = levelIndexOf(levelDef);
  const visit = clamp(S.levels.filter((l) => l <= li).length, 1, S.rare.length) - 1;
  // Never two of one sort on a shelf (`tag`): two talismans that both bend the headbutt are one
  // choice offered twice. The shuffle is the same single roll it always was.
  const out = [];
  const take = (pool) => {
    for (const a of rng.shuffle(pool.slice())) {
      if (out.includes(a) || (a.tag && out.some((o) => o.tag === a.tag))) continue;
      out.push(a); return true;
    }
    return false;
  };
  for (let i = 0; i < S.wares; i++) {
    const up = rng.chance(S.rare[visit]);
    if (!take(ARTIFACTS.filter((a) => (up ? a.rarity > 1 : a.rarity === 1))) && !take(ARTIFACTS)) break;
  }
  const stock = out.map((a) => ({ id: a.id, tier: 1 }));
  if (stock.length && rng.chance(TUNING.cape.shopChance)) stock[rng.int(0, stock.length - 1)] = { id: rng.pick(CAPES).id, cape: true };
  return stock;
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

// The way out is at the far end of the room from the way in. `awayFrom` is the world row of the
// doorway the goat walks in by (or the middle of the room, when there is no earlier room to have
// come from): every candidate row that does not make `DOORS.far` of the greatest distance from it is
// thrown away before the dice are rolled. A corridor used to leave by whichever row the dice picked,
// which now and then put the exit a tile from the entrance, you came in at the top of the room and
// left at the top of it, and the room's men, its pillars and its wheel were something you ran past
// rather than something between you and the door. Far is the whole of the motivation to cross a room.
// `toward` (a level's `meet`, the way in only): the rows nearest it instead, so the door faces the last one.
function pickDoorY(room, side, rng, awayFrom, fit, wide, toward) {
  const col = side === 'right' ? room.w - 2 : 1;
  const raw = [];
  for (let ty = 1; ty < room.h - 2; ty++) {
    if (room.tpl.rows[ty][col] !== '#' && room.tpl.rows[ty][col] !== 'P' &&
        room.tpl.rows[ty + 1][col] !== '#' && room.tpl.rows[ty + 1][col] !== 'P') raw.push(room.y + ty);
  }
  // A band wider than two tiles is pulled back inside the height of the wall it goes through, so the
  // clamping is done to the candidates BEFORE the choice rather than to the row after it: fitting
  // afterwards threw away the whole point of choosing far, which is what THE THRESHING FLOOR's
  // five-wide corridors did on every room of the level.
  const candidates = [];
  // A `fit` that answers null refuses the row outright.
  for (const v of raw) { const m = fit ? fit(v) : v; if (m !== null && candidates.indexOf(m) < 0) candidates.push(m); }
  if (!candidates.length) return -1;
  // A doorway opens onto a clear step, never onto a shelf or a post one tile in that leaves a
  // goat-width squeeze to come through (`pickDoorX` asks the same of a shaft; the larder's and the
  // byre's side doors did not). A wall with no such row keeps them all: the template's own shape.
  const stepClear = (m) => {
    const next = side === 'right' ? col - 1 : col + 1;
    for (let k = 0; k < Math.max(2, wide || 2); k++) {
      const c = (room.tpl.rows[m - room.y + k] || '')[next];
      if (c && HARD.includes(c)) return false;
    }
    return true;
  };
  const clear = candidates.filter(stepClear), pool = clear.length ? clear : candidates;
  const near = toward === undefined || toward === null ? null
    : pool.filter((v) => Math.abs(v - toward) === Math.min(...pool.map((u) => Math.abs(u - toward))));
  const pick = noteFar(room, rng.pick(near || farthest(pool, awayFrom)), pool, awayFrom);
  (room.mouths = room.mouths || {})[side] = { y: pick, clear: stepClear(pick), could: clear.length > 0 };
  return pick;
}

// What the room could have done and what it did, so `GEN_RULES.farexit` can hold the generator to its
// own promise rather than to a guess about room shapes: `max` is the furthest any candidate row (or
// column) was from the way in, `d` what the chosen one actually made. A room with nothing to be far
// from records nothing and the rule has nothing to say about it.
function noteFar(room, pick, candidates, awayFrom) {
  if (awayFrom !== undefined && awayFrom !== null && pick >= 0) {
    room.exitFar = { away: awayFrom, d: Math.abs(pick - awayFrom),
      max: Math.max(...candidates.map((v) => Math.abs(v - awayFrom))) };
  }
  return pick;
}

// The tail of `list` that lies `DOORS.far` or more of the way out to whatever is furthest from `from`.
// With nothing to be far from, or with only one candidate, it is the list itself.
function farthest(list, from) {
  if (from === undefined || from === null || list.length < 2) return list;
  const d = list.map((v) => Math.abs(v - from));
  const max = Math.max(...d);
  if (max <= 0) return list;
  const keep = list.filter((v, k) => d[k] >= max * DOORS.far);
  return keep.length ? keep : list;
}

// The row the goat walks into a room by, as a world tile: the corridor that brought him, or the
// middle of the room for the first one, which has no room before it.
function enterRow(room) {
  return room.enter ? Math.floor(room.enter.y / TILE) : room.y + Math.floor(room.h / 2);
}
function enterCol(room) {
  return room.enter ? Math.floor(room.enter.x / TILE) : room.x + Math.floor(room.w / 2);
}

// Carves an S-shaped corridor, two tiles wide by default, wider where a level asks for it, and
// returns a sensible spot for a door. A wide corridor eats the borders it passes through, which is
// how the open level ends up reading as one yard rather than a row of boxes.
// `turn` is the sentry's room (`blockSpot`): the corridor out of it turns in the first tile past its
// wall, and never onto the row his gap is on, so a man knocked through that gap meets the corridor's
// far wall a step later instead of flying the length of it and getting up (`GEN_RULES.sentrywall`).
// `how.meet` (a level's `meet`): `b`'s door takes the row nearest `a`'s, so the two face each other and
// the way through is straight wherever the rooms overlap. `how.late`: the turn is made just short of `b`'s
// wall, so the stretch leaving `a` is the long one (the first grass lies in it).
function carveCorridor(tiles, W, a, b, rng, width, turn, how) {
  const wide = Math.max(2, width || 2);
  const H = tiles.length / W;
  // A band wider than two is kept inside the height of the wall it goes through. Picked for two
  // tiles, a five-wide band ran on past the room's bottom wall into the rock under it, where the
  // shaft out of a room hung below that one also runs, the two corridors met, and the room had a
  // second way out that no gate, seal or clamp over its real one could shut.
  const fit = (r, y) => (y < 0 || wide <= 2 ? y : Math.max(r.y + 1, Math.min(y, r.y + r.h - 1 - wide)));
  const yA = pickDoorY(a, 'right', rng, enterRow(a), (y) => fit(a, y), wide);
  // With `turn`, `b`'s band may not carry on from `a`'s top row (the one row `narrowExit` leaves
  // open) nor from either row beside it: a body leaving the gap at a shallow slope slid into a band
  // that ran along the next row and went the length of it.
  const yB = pickDoorY(b, 'left', rng, null, (y) => { const m = fit(b, y); return turn && m > yA - wide - 1 && m < yA + 2 ? null : m; }, wide,
    how && how.meet && yA >= 0 ? yA : null);
  if (yA < 0 || yB < 0) return null;
  const xA = a.x + a.w - 1, xB = b.x;
  // The turn is kept clear of `b`'s own wall where there is rock enough for it: a five-wide turn
  // centred in a short gap ran down through the wall and out under the room, for the same reason.
  const midX = turn ? xA + 1 : how && how.late ? Math.max(xA + 1, xB - wide)
    : clamp(Math.floor((xA + xB) / 2), xA + 1, Math.max(xA + 1, xB - wide));
  const carve = (tx, ty) => { if (tx >= 0 && tx < W && ty >= 1 && ty < H - 1) tiles[ty * W + tx] = T.FLOOR; };
  const band = (tx, ty) => { for (let k = 0; k < wide; k++) carve(tx, ty + k); };
  for (let tx = xA; tx <= midX + wide - 1; tx++) band(tx, yA);
  // The stretch of corridor leaving `a`. A room that has to be shut behind one man needs to know
  // exactly which tiles let you out of it.
  // `run` is the last column of its straight stretch: the whole way to `b`'s wall when the doors face.
  a.exitBand = { y: yA, x0: xA, x1: midX + wide - 1, wide, run: yA === yB ? xB - 1 : midX - 1 };
  // The tiles of `a`'s own wall the corridor cut through: stone them back up and `a` is shut off
  // from everything after it (`game.updateClamps`, held by `GEN_RULES.clamp`).
  a.exitMouth = { tiles: Array.from({ length: wide }, (_, k) => (yA + k) * W + xA), x: (xA + 0.5) * TILE, y: (yA + wide / 2) * TILE, vertical: true, span: wide };
  const y0 = Math.min(yA, yB), y1 = Math.max(yA, yB) + wide - 1;
  for (let ty = y0; ty <= y1; ty++) for (let k = 0; k < wide; k++) carve(midX + k, ty);
  for (let tx = midX; tx <= xB; tx++) band(tx, yB);
  // Where the corridor opens into b, a step inside its wall: a room that wants to stand something in
  // the way of whoever walks in needs to know which way that is.
  const enter = { x: (xB + 1) * TILE, y: (yB + wide / 2) * TILE };
  // A door is two tiles of slab. Hung in a five-wide band it covered two fifths of it and stood in
  // open floor with a way round either side, a door in the middle of nowhere. Wide corridors get none.
  if (wide > 2) return { enter, door: null };
  // The first grass's corridor (`late`) is left open: the bowl in it is the thing to see, not a slab.
  if (how && how.late) return { enter, door: null };
  if (y1 - y0 >= 4) return { enter, door: { x: (midX + 1) * TILE, y: (Math.floor((y0 + y1) / 2) + 0.5) * TILE, vertical: false } };
  if (midX - xA >= 3) return { enter, door: { x: (Math.floor((xA + midX) / 2) + 0.5) * TILE, y: (yA + 1) * TILE, vertical: true } };
  // Two doors facing across a short run of rock: the slab hangs in its first tile, against the room it
  // leaves, so it stands in rock with stone above and below.
  if (yA === yB && xB - xA >= 2) return { enter, door: { x: (xA + 1.5) * TILE, y: (yA + 1) * TILE, vertical: true } };
  return { enter, door: null };
}

// May room `i` hang above or below room `i - 1`? Not if either of them is built for a door in its
// left or right wall: a set piece, a room whose sides mean something (`noFlipX`), the two teaching
// rooms, and any room a gate or a seal has to narrow, `narrowExit` walls up a horizontal band.
function stackable(levelDef, i, source, sentryAt) {
  if (source.noFlipX) return false;
  const set = (j) => j === 0 || j === levelDef.millAt || j === levelDef.hallAt || j === levelDef.galleryAt
    || j === levelDef.killboxAt || j === levelDef.ambushAt || j === levelDef.calmAt || j === sentryAt;
  if (set(i) || i - 1 === sentryAt || i === levelDef.chandAt || i - 1 === levelDef.chandAt) return false;   // the notch needs a side wall
  // A gate room keeps its rock: the mouse's hole is cut into the wall of the middle one, and the
  // room after either has to leave through a side wall for `narrowExit` to have a band to shut.
  const gates = restsOf(levelDef);
  if (gates.includes(i) || gates.includes(i - 1)) return false;
  for (const a of (levelDef.arenas || [])) {
    if (a.sealed && (a.at === i || a.at === i - 1 || a.at === i + 1)) return false;
  }
  return true;
}

// Where a stacked room goes: over or under `a`, sharing at least `STACK.minOverlap` of its width and
// never reaching further left than `a` does, everything earlier in the chain lies left of `a`, so
// that is what keeps the new room off it, nor stopping short of `a`'s right wall, so the corridor
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
// `awayFrom` is the column the goat walked in by, held to the same promise the horizontal one keeps:
// the shaft out of a room is at the far end of it from the door you came through.
function pickDoorX(room, side, wide, lo, hi, rng, awayFrom, entry) {
  const row = side === 'top' ? 1 : room.h - 2, next = side === 'top' ? 2 : room.h - 3;
  const all = [], inside = [];
  for (let tx = 1; tx + wide <= room.w - 1; tx++) {
    let ok = true;
    for (let k = 0; k < wide && ok; k++) { const c = room.tpl.rows[row][tx + k]; ok = c !== '#' && c !== 'P' && c !== 'O'; }
    // Nor a step further in: a shaft that came up under a template's table (THE ROAD, seed 22) left a
    // one-tile squeeze round its corner for a way in.
    for (let k = 0; k < wide && ok; k++) { const c = (room.tpl.rows[next] || '')[tx + k]; ok = !c || !HARD.includes(c); }
    if (!ok) continue;
    all.push(room.x + tx);
    if (room.x + tx >= lo && room.x + tx + wide - 1 <= hi) inside.push(room.x + tx);
  }
  const list = inside.length ? inside : all;
  const from = farthest(list, awayFrom);
  if (!from.length) return -1;
  // A way in is not a way out: `exitFar` is the room's promise about where it is left by.
  return entry ? rng.pick(from) : noteFar(room, rng.pick(from), list, awayFrom);
}

// The vertical twin of `carveCorridor`: out of `a`'s top wall (or bottom), a jog across the rock in
// between, and into `b`'s bottom wall (or top). The door, when there is one, hangs across the shaft.
function carveShaft(tiles, W, a, b, dir, rng, width) {
  const wide = Math.max(2, width || 2);
  const H = tiles.length / W;
  // A wide level's corridor into `a` eats `a`'s top-left corner on its way in, so a jog run back
  // over that corner opened `a` straight onto the corridor behind it, a second way out that the
  // clamp could not shut. There the shaft keeps a corridor's width clear of `a`'s left wall.
  const lo = Math.max(a.x, b.x) + 1 + (wide > 2 ? wide + 1 : 0), hi = Math.min(a.x + a.w, b.x + b.w) - 2;
  const xA = pickDoorX(a, dir === 'up' ? 'top' : 'bottom', wide, lo, hi, rng, enterCol(a));
  // And the way into `b` is kept away from `b`'s right wall, which is where it will be left by: a
  // shaft that came up a tile from the corridor out put the whole room beside the goat rather than
  // in front of him. Up the far third of one room, across the whole of the next.
  const xB = pickDoorX(b, dir === 'up' ? 'bottom' : 'top', wide, lo, hi, rng, b.x + b.w - 2, true);
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
  const clearRun = wide <= 2 && (dir === 'up' ? yA - 1 >= jog + wide : yA + 1 < jog);   // see carveCorridor
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
  // A level that says where its trap room is (`trapAt`) gets it there and nowhere else.
  if (levelDef.trapAt !== undefined) { out.add(levelDef.trapAt); return out; }
  // The first two ordinary rooms of a level are where its kinds get introduced; leave them alone.
  // The ambush room is left alone too: it is a forced shape teaching a forced lesson, and three
  // plates thrown across it is one more thing to read in the one room that may not have any.
  // Nor the last room: the stairs are in it (on THE ROAD both flights of THE FORK), and a trap there
  // was straw in front of the way out two runs in three.
  const pool = ordinaryRooms(levelDef, n).slice(2).filter((i) => i !== levelDef.ambushAt && i !== levelDef.chandAt && i !== shopRoomOf(levelDef) && i !== n - 1);
  for (const i of rng.shuffle(pool).slice(0, want)) out.add(i);
  return out;
}

// Every rest room of a level: its soul gates, and `rests`, a rest room with no gate on it and no
// soul in it, a breather and nothing else (THE ALTAR's before the ogre, whose soul the ogre carries).
function restsOf(levelDef) { return [...(levelDef.gates || []), ...(levelDef.rests || [])]; }
// The rooms of a level that are nobody's set piece: not the pen, not an arena, the Mill, the Hall,
// the Gallery or the killbox. These are the rooms the canon, the mix and the trap rooms are dealt
// out of, in order.
function ordinaryRooms(levelDef, n) {
  const taken = new Set([0, levelDef.millAt, levelDef.hallAt, levelDef.galleryAt, levelDef.killboxAt, levelDef.calmAt, ...restsOf(levelDef)]);
  for (const a of (levelDef.arenas || [])) taken.add(a.at);
  const out = [];
  for (let i = 1; i < n; i++) if (!taken.has(i)) out.push(i);
  return out;
}

// Which rooms of a level are its canon: `CANON.share` of the ordinary rooms, taken off the ones that
// are not trap rooms on an even spread that always starts with the first. A level says what it is
// about on the first floor you fight on, and the mix is what you get between one canon room and the
// next, never instead of the first. It is a spread and not a roll so that a run of three mix rooms
// in a row cannot happen: the idea is never out of sight for long.
function pickCanonRooms(levelDef, n, trapRooms) {
  const out = new Set();
  const ordinary = ordinaryRooms(levelDef, n);
  // The ambush room is an ordinary room by the curve and a forced shape by the template, so calling
  // it a canon room would be counting a room the canon never got to build. It still counts toward
  // the share owed, the canon simply has to find it elsewhere.
  // The same for a room the level fills by hand (`crowdAt`): left to the mix, so inserting one does
  // not move the canon off the rooms it already had (THE ALTAR's second room keeps its pillars).
  const plain = ordinary.filter((i) => !trapRooms.has(i) && i !== levelDef.ambushAt && i !== levelDef.crowdAt && i !== levelDef.chandAt);
  const want = Math.min(plain.length, Math.ceil(CANON.share * ordinary.length));
  for (let k = 0; k < want; k++) out.add(plain[want === 1 ? 0 : Math.round(k * (plain.length - 1) / (want - 1))]);
  return out;
}

// Cut a sealed chamber into the stone off one side of a room and hang an iron door in the gap. It is
// tried above the room first and then below; either way there has to be solid rock for it to go in,
// so a room hard against the top of the world simply does not get one (`carveVault`, below).
// Which vault a level has (`TUNING.vault`): big grass behind a shut door, or the same grass behind
// an open one that shuts on him, clubmen, or three mages once the mage has been met on an earlier
// floor. THE TRIP's is always grass. Off its own stream, so no other roll of the level moves.
// `fresh` (game.js `opts.fresh`, `Novelty`: the browser has played dry): the dice roll only among the kinds it
// has never walked into (`fresh.vaults`), if any is open to this floor, and say so in `fresh.vault`.
function vaultKindOf(levelDef, seed, fresh) {
  if (levelDef.shroom) return 'grass';
  const V = TUNING.vault, luck = new RNG(((seed >>> 0) ^ 0x7a17) >>> 0);
  let kinds = Object.entries(V.kinds).filter(([k]) => (k !== 'mages' || (levelDef.met && levelDef.met.has('seer')))
    && (k !== 'ogre' || (levelDef.met && levelDef.met.has('butcher'))));
  const unseen = fresh && fresh.vaults ? kinds.filter(([k]) => !fresh.vaults.has(k)) : [];
  if (unseen.length) kinds = unseen;
  let r = luck.next() * kinds.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of kinds) { if ((r -= w) < 0) { if (unseen.length) fresh.vault = k; return k; } }
  if (unseen.length) { fresh.vault = kinds[kinds.length - 1][0]; return fresh.vault; }
  return 'grass';
}

// Whether a room holds something that hurts the ogre (`TUNING.vault.ogre.needs`): his vault wakes him into it.
function ogreArmed(room, props) {
  if (!room) return false;
  const need = TUNING.vault.ogre.needs, x0 = room.x * TILE, y0 = room.y * TILE, x1 = x0 + room.w * TILE, y1 = y0 + room.h * TILE;
  return props.some((p) => p.x >= x0 && p.x < x1 && p.y >= y0 && p.y < y1 && need.includes(p.kind === 'weapon' ? p.weapon : p.kind));
}

function carveVault(tiles, W, H, room, props, rng) {
  if (!room) return null;
  const vw = VAULT.w, vh = VAULT.h;
  const mid = room.x + Math.floor((room.w - vw) / 2);
  // Centred if it can be; else a step or two aside. The door has to open onto the room's own floor:
  // on the cave an eroded bump or, on THE OSSUARY, a pillar right inside the wall sealed nearly one
  // vault in three behind rock nobody could reach (28 Sep 2026).
  for (const x0 of [mid, mid + 1, mid - 1, mid + 2, mid - 2])
  for (const side of rng.chance(0.5) ? ['up', 'down'] : ['down', 'up']) {
    if (x0 < 1 || x0 + vw >= W - 1) continue;
    // Where the chamber sits, and the stone between it and the room. Above the room that stone is two
    // rows deep, the rock the chamber was cut out of, and the room's own wall under it, and both
    // have to come out or the door opens onto a wall and the soul is sealed in by the level itself.
    const y0 = side === 'up' ? room.y - vh - 1 : room.y + room.h;
    const gapY = side === 'up' ? y0 + vh : y0 - 1;
    const doorY = side === 'up' ? gapY + 1 : gapY;
    if (y0 < 1 || y0 + vh >= H - 1) continue;
    const inside = tiles[(side === 'up' ? doorY + 1 : doorY - 1) * W + x0 + Math.floor(vw / 2)];
    if (inside === T.WALL || inside === T.PIT) continue;
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
    return { x: (gapX + 0.5) * TILE, y: (y0 + vh / 2) * TILE, doorTile: { tx: gapX, ty: doorY }, box: { x: x0, y: y0, w: vw, h: vh } };
  }
  return null;
}

// Steps on foot from one point to another (px), round stone and holes; Infinity if there is no way.
function walkTiles(tiles, W, a, b) {
  if (!a || !b) return Infinity;
  const from = Math.floor(a.y / TILE) * W + Math.floor(a.x / TILE), to = Math.floor(b.y / TILE) * W + Math.floor(b.x / TILE);
  const dist = new Map([[from, 0]]), q = [from];
  for (let h = 0; h < q.length; h++) {
    const i = q[h], d = dist.get(i);
    if (i === to) return d;
    for (const j of [i - 1, i + 1, i - W, i + W]) {
      if (j < 0 || j >= tiles.length || dist.has(j) || tiles[j] === T.WALL || tiles[j] === T.PIT) continue;
      dist.set(j, d + 1); q.push(j);
    }
  }
  return Infinity;
}

// One window: a short slot cut clean through the wall band along the top of a room, with rock behind
// it that the renderer paints as the night. It has to have wall above it and the room's own floor
// below it, or it is a hole in the ground and not a hole in a wall, which is the difference the
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
// of a niche is that it stays a niche. Every tile it touches has to still be solid rock, anything
// already carved there is another room or a corridor, and this never trades on either.
// Both ends of the niche row have to be rock as well: a niche cut flush against a shaft opened into
// it sideways, so once the wall was down the room was joined to a corridor it was never meant to
// touch, and a clamp over its real way out no longer shut it.
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
      // and it opens onto the room's own floor, not an eroded bump of cave rock or a pillar
      const inside = tiles[(side === 'up' ? wallRow + 1 : wallRow - 1) * W + tx];
      if (inside === T.WALL || inside === T.PIT) continue;
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
        // Where it was cut, for `carveDeepSecret`: the niche's left tile, its row, and which way is
        // further into the rock.
        tx, nicheRow, dir: side === 'up' ? -1 : 1,
      };
    }
  }
  return null;
}

// The secret inside the secret (6 Oct 2026, "double Miyazaki"): the niche's own back wall gives too, on
// one of its two tiles, onto a second two-tile niche one row deeper. The block it is cut from, four
// columns by three rows of rock behind the niche (the second wall's row, the deep niche's, a guard row
// past it), must be solid, so the deep pocket touches nothing but the niche in front of it: the only
// way in is through both walls. Tried on the niche's right tile (the deep niche running right) and its
// left (running left), in a random order; none fits, none is cut.
function carveDeepSecret(tiles, W, H, spot, rng) {
  const { tx, nicheRow, dir } = spot;
  const wallRow = nicheRow + dir, deepRow = nicheRow + 2 * dir, guardRow = nicheRow + 3 * dir;
  if (Math.min(wallRow, deepRow, guardRow) < 1 || Math.max(wallRow, deepRow, guardRow) >= H - 1) return null;
  for (const right of rng.chance(0.5) ? [true, false] : [false, true]) {
    const wx = right ? tx + 1 : tx, x0 = right ? tx : tx - 2;   // the block is columns x0..x0+3
    if (x0 < 1 || x0 + 3 >= W - 1) continue;
    let clear = true;
    for (const ry of [wallRow, deepRow, guardRow]) for (let cx = x0; cx <= x0 + 3 && clear; cx++) if (tiles[ry * W + cx] !== T.WALL) clear = false;
    if (!clear) continue;
    const a = right ? wx : wx - 1, b = a + 1;   // the deep niche's two tiles, the one over the wall first
    tiles[wallRow * W + wx] = T.FLOOR; tiles[deepRow * W + a] = T.FLOOR; tiles[deepRow * W + b] = T.FLOOR;
    const over = wx, by = right ? b : a;
    return {
      wall: { x: (wx + 0.5) * TILE, y: (wallRow + 0.5) * TILE },
      heal: { x: (over + 0.5) * TILE, y: (deepRow + 0.5) * TILE },
      cape: { x: (by + 0.5) * TILE, y: (deepRow + 0.5) * TILE },
      tiles: [wallRow * W + wx, deepRow * W + over, deepRow * W + by],
    };
  }
  return null;
}

// A stretch of grating laid into the floor of a room. It starts somewhere in the middle third and
// grows along one axis with a wander on the other, so what goes down is a band you have to go round
// or cross rather than a handful of dots, and a band is the only version of this the eye reads as
// a piece of ground with an opinion.
// `near`, when given, is a tile to grow the band out from rather than a random point in the room,
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
        props.push({ x: px, y: py, kind: 'spike', patch: true }); taken.add(key); placed++;   // `patch`: laid, not a template's own
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
// whatever door that corridor was given is removed, it is now half inside the stone, and the thing
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
  // behind the gate went unreachable, a fresh seed every time, which with two gates a level ran
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
  // The corridor out turned in the first tile past the wall (`carveCorridor`'s `turn`); the far
  // column of that turn goes back to stone on his row and the rows either side, so the way on is a
  // one-tile bend and a man knocked straight back through the gap meets a wall two tiles out, close
  // enough that the bare head's throw still kills on it (`GEN_RULES.sentrywall`). The near column
  // of the turn is the whole of the vertical run, so nothing past it is cut off.
  if (b.x1 - b.wide + 1 === b.x0 + 1) {
    for (let tx = b.x0 + 2; tx <= b.x1; tx++) for (let ty = b.y - 1; ty <= b.y + 1; ty++) tiles[ty * W + tx] = T.WALL;
  }
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

// What may not stand at a chasm's lip (`chasm.clear` tiles from its band, inside its room): anything heavy
// that would be in the way of the run-up or the landing. Shared with `GEN_RULES.chasm`.
const CHASM_CLEAR = new Set(['barrel', 'rock', 'suit', 'brazier', 'lamp']);
// How far a point is from the band, in px (Infinity outside its room's span).
function chasmNear(ch, x, y) {
  const v = ch.axis === 'v', a = (v ? x : y) / TILE, s = (v ? y : x) / TILE;
  if (s < ch.lo - 0.5 || s > ch.hi + 1.5) return Infinity;
  return Math.max(0, Math.abs(a - ch.at - 0.5) - 0.5) * TILE;
}
// THE CHASM's rooms (`TUNING.chasm`): an ordinary room, canon or mix, past `minRoom`, never the last, a trap,
// the ambush, the chandelier's lesson, the vault's or the mouse's room, THE ARMORY or a bridge. A teaching or
// set-piece room is saying something else already. Shared with `GEN_RULES.chasm`.
// A room laid from a `tag: 'flank'` template (the template is flipped into a copy, so it is known by its name).
const isFlankRoom = (r) => !!(r && r.tpl && /^ditch/.test(r.tpl.name || ''));
function chasmRoomFits(def, r, n) {
  const name = r.tpl && r.tpl.name;
  return r.index >= TUNING.chasm.minRoom && r.index < n - 1 && (r.role === 'canon' || r.role === 'mix') && !r.isTrap && !r.isAmbush
    && !r.isChand && !r.isCrowd && r.index !== def.vaultAt && r.index !== shopRoomOf(def) && name !== 'armory' && !(r.tpl && r.tpl.bridge) && !isFlankRoom(r);
}
// A band of drop one tile across the room, from wall to wall, between where he walks in and where he walks
// out: a column across a room run left to right, a row across one hung above or below the last. `margin`
// tiles from either doorway, no furniture a template drew within two lines of it, nothing already standing
// near it, and `lane` rows where the floor runs two tiles out on both sides (somewhere to run up and land).
// It must part the way in from the way out, or it is a hole to walk round. The tiles, or null.
function carveChasm(tiles, W, room, rng, props) {
  const CH = TUNING.chasm, E = room.enter, X = room.exitMouth;
  if (!E || !X) return null;
  const ex = E.x / TILE, ey = E.y / TILE, xx = X.x / TILE, xy = X.y / TILE, v = Math.abs(xx - ex) >= Math.abs(xy - ey);
  const lo = v ? Math.min(ex, xx) : Math.min(ey, xy), hi = v ? Math.max(ex, xx) : Math.max(ey, xy);
  const in0 = v ? room.x + 1 : room.y + 1, in1 = v ? room.x + room.w - 2 : room.y + room.h - 2;
  const s0 = v ? room.y + 1 : room.x + 1, s1 = v ? room.y + room.h - 2 : room.x + room.w - 2;
  const at = (c, s) => (v ? s * W + c : c * W + s), floorish = (t) => t === T.FLOOR || t === T.HAY || t === T.ASH;
  const a0 = Math.max(Math.ceil(lo + CH.margin), in0 + 2), a1 = Math.min(Math.floor(hi - CH.margin), in1 - 2);
  if (a1 < a0) return null;
  const mid = (a0 + a1) / 2, cands = [];
  for (let c = a0; c <= a1; c++) cands.push({ c, k: Math.abs(c - mid) + rng.float(0, 1.5) });
  cands.sort((p, q) => p.k - q.k);
  const H = tiles.length / W, from = Math.floor(E.y / TILE) * W + Math.floor(E.x / TILE);
  for (const { c } of cands) {
    if (room.markers.some((m) => { const d = Math.abs((v ? m.tx : m.ty) - c); return d <= 2 && !'erRm'.includes(m.c); })) continue;
    const bx0 = v ? (c - 0.5) * TILE : room.x * TILE, bx1 = v ? (c + 1.5) * TILE : (room.x + room.w) * TILE;
    const by0 = v ? room.y * TILE : (c - 0.5) * TILE, by1 = v ? (room.y + room.h) * TILE : (c + 1.5) * TILE;
    if (props.some((p) => p.x > bx0 - CH.clear * TILE && p.x < bx1 + CH.clear * TILE && p.y > by0 - CH.clear * TILE && p.y < by1 + CH.clear * TILE
      && p.x > room.x * TILE && p.x < (room.x + room.w) * TILE && p.y > room.y * TILE && p.y < (room.y + room.h) * TILE)) continue;
    const cut = []; let run = 0, best = 0, bad = false;
    for (let s = s0; s <= s1; s++) {
      const t = tiles[at(c, s)];
      if (t === T.EXIT || t === T.ENTRY || t === T.PIT) { bad = true; break; }
      if (floorish(t)) cut.push(at(c, s));
      const lane = [-2, -1, 1, 2].every((k) => floorish(tiles[at(c + k, s)])) && floorish(t);
      run = lane ? run + 1 : 0; best = Math.max(best, run);
    }
    if (bad || !cut.length || best < CH.lane) continue;
    const was = cut.map((i) => tiles[i]);
    for (const i of cut) tiles[i] = T.PIT;
    // Parted: from the way in, round any pillar and through every corridor, the way out is not reached.
    const seen = new Uint8Array(W * H), q = [from], mouth = new Set(X.tiles || []); seen[from] = 1;
    let joined = false;
    while (q.length && !joined) {
      const i = q.pop();
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (j < 0 || j >= W * H || seen[j] || tiles[j] === T.WALL || tiles[j] === T.PIT) continue;
        if (mouth.has(j)) { joined = true; break; }
        seen[j] = 1; q.push(j);
      }
    }
    if (joined || !mouth.size) { cut.forEach((i, k) => { tiles[i] = was[k]; }); continue; }
    // The side the way out is on, for the men who belong across it (`farKinds`) and the animals' hop.
    return { room: room.index, axis: v ? 'v' : 'h', at: c, lo: s0, hi: s1, far: Math.sign((v ? xx : xy) - c - 0.5) || 1, tiles: cut };
  }
  return null;
}

function reachable(tiles, W, H, sx, sy, tx, ty, gaps) {
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
      // A chasm's tiles (`gaps`) are a roll across, not a wall.
      if (t === T.WALL || (t === T.PIT && !(gaps && gaps.has(j)))) continue;
      seen[j] = 1; q.push(j);
    }
  }
  return false;
}

// A table is two tiles by two, and a template draws one as a block of `t`: it stands centred on the
// block it was drawn as. It used to go down on every `t` whose world tile happened to be even on both
// axes, so where a room landed decided whether its table sat on its drawing, a tile right and down of
// it, in THE YARD's forge, into the bowl of coals beside it, or was not there at all (playtest,
// 25 Sep 2026). A block wider or taller than two is cut into tables two by two; a single row or a
// single tile is one table centred on it. A table and a brazier either stand as one lump or leave a
// way between them a goat walks without brushing the coals (`tableSqueeze`, `GEN_RULES.tables`); a
// table that would leave a squeeze is not put down.
function tableSqueeze(t, f) {
  const Tb = TUNING.prop.table, gap = len(t.x - f.x, t.y - f.y) - Tb.r - TUNING.prop.brazier.r, goat = 2 * TUNING.goat.radius;
  return gap >= goat - Tb.squeeze && gap < goat + Tb.squeeze;
}
function placeTables(cells, W, props) {
  const seen = new Set(), fires = props.filter((p) => p.kind === 'brazier');
  for (const c of cells) {
    if (seen.has(c)) continue;
    const stack = [c]; seen.add(c);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    while (stack.length) {
      const i = stack.pop(), x = i % W, y = (i / W) | 0;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const j of [i - 1, i + 1, i - W, i + W]) if (cells.has(j) && !seen.has(j)) { seen.add(j); stack.push(j); }
    }
    for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) {
      const t = { x: (x + Math.min(2, x1 - x + 1) / 2) * TILE, y: (y + Math.min(2, y1 - y + 1) / 2) * TILE, kind: 'table' };
      if (!fires.some((f) => tableSqueeze(t, f))) props.push(t);
    }
  }
}
// A table's top is two tiles square round its middle whatever block it was drawn as, so a one-row or
// one-tile `t` still stands a whole table half a tile over the row beside it, where a template's own
// crate sat, drawn half under the top (playtest, 30 Sep 2026: "the crate and the table on one spot").
// How far (x, y) is from the nearest table's top (0 on it); `onTable` asks it for a thing of radius r.
// Shared by every loose thing the generator lays and by `GEN_RULES.ontable`.
const TABLE_LOOSE = ['crate', 'bomb', 'barrel', 'weapon', 'coop', 'ironcage', 'heal', 'rock', 'shrooms', 'suit', 'fish'];
function tableGap(t, x, y, hx = 0, hy = 0) {
  return len(Math.max(0, Math.abs(x - t.x) - TILE - hx), Math.max(0, Math.abs(y - t.y) - TILE - hy));
}
function looseR(p) {
  const P = TUNING.prop;
  return p.kind === 'heal' ? P.heal.r : p.kind === 'weapon' ? P.weapon.standR : p.kind === 'shrooms' ? 12
    : p.kind === 'ironcage' ? TUNING.keys.iron.r
    : (P[p.kind] && P[p.kind].r) || 12;
}
function onTable(x, y, r, props, hx = 0, hy = 0) {
  return props.some((t) => t.kind === 'table' && tableGap(t, x, y, hx, hy) < r);
}
// A loose thing a template drew beside a one-row table is stepped to the nearest clear tile of its
// room rather than left under the top; with nowhere to go it is not put down at all.
function shiftOffTables(room, props, tiles, W, grass) {
  for (let i = props.length - 1; i >= 0; i--) {
    const p = props[i];
    if (!['crate', 'weapon', 'bomb'].includes(p.kind) || !onTable(p.x, p.y, looseR(p), props)) continue;
    const tx0 = Math.floor(p.x / TILE), ty0 = Math.floor(p.y / TILE);
    if (tx0 < room.x || tx0 >= room.x + room.w || ty0 < room.y || ty0 >= room.y + room.h) continue;
    let best = null, bestD = Infinity;
    for (let ty = room.y + 1; ty < room.y + room.h - 1; ty++) for (let tx = room.x + 1; tx < room.x + room.w - 1; tx++) {
      const d = Math.hypot(tx - tx0, ty - ty0);
      if (d >= bestD || d > 3 || tiles[ty * W + tx] !== T.FLOOR || grass.has(ty * W + tx)) continue;
      const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
      if (onTable(px, py, looseR(p), props) || props.some((q) => q !== p && q.kind !== 'table' && footGap(q, px, py) < 0.9 * TILE)) continue;
      best = { x: px, y: py }; bestD = d;
    }
    if (best) { p.x = best.x; p.y = best.y; } else props.splice(i, 1);
  }
}

// THE WHEEL's sweep (5 Oct 2026 playtest: a stand of arms stood by the hub): nothing that can be
// placed stands within the arm's reach plus `mill.clear` tiles of a mill, so the wheel is a hazard of
// its own and never a rack's neighbour. `Prop.updateMill` butts out whatever ends up there in play.
// `GEN_RULES.millclear` asks `inMillSweep` of the same kinds.
const DOOR_APART = 7;   // tiles: no second door this close to a gate or a seal (`GEN_RULES.doors`)
const MILL_CLEAR = new Set(['crate', 'weapon', 'barrel', 'bomb', 'table', 'suit', 'rock', 'shrooms']);
function inMillSweep(props, x, y) {
  const R = TUNING.mill.armLen + TUNING.mill.clear * TILE;
  return props.some((m) => m.kind === 'mill' && len(m.x - x, m.y - y) < R);
}
// Is a point inside something a man cannot stand in? Everything a room puts on the floor except what
// is floor itself, a bowl of milk, a grating, or a door, which stands in a corridor and not a room.
// Shared by the generator's own spawn pass and `GEN_RULES.furniture`, so the two cannot disagree.
function inFurniture(x, y, props) {
  for (const p of props) {
    // A chandelier hangs in the air: a man under one is the trap set, not a man in the furniture.
    if (p.kind === 'heal' || p.kind === 'spike' || p.kind === 'door' || p.kind === 'secret' || p.kind === 'chandelier') continue;
    if (stallHalf(p)) { if (footGap(p, x, y) < 0.6 * TILE) return true; continue; }
    const clear = p.kind === 'mill' ? 1.2 * TILE : p.kind === 'coop' || p.kind === 'ironcage' ? 1.1 * TILE : 0.8 * TILE;
    if (len(p.x - x, p.y - y) < clear) return true;
  }
  return false;
}
// Whether the room's floor is still one piece with a stall on (tx, ty): every open tile of the room
// reached from any other round it, and at least `clear` open tiles in front of its near side, where
// it is butted open. A stall across the only lane of a room was a wall with a horse in it.
function stallKeepsRoomOpen(tiles, W, room, tx, ty, S) {
  const under = (x, y) => x >= tx && x < tx + S.w && y >= ty && y < ty + S.h;
  const open = (x, y) => x > room.x && y > room.y && x < room.x + room.w - 1 && y < room.y + room.h - 1
    && !under(x, y) && tiles[y * W + x] !== T.WALL && tiles[y * W + x] !== T.PIT;
  for (let x = tx; x < tx + S.w; x++) for (let k = 1; k <= S.clear; k++) if (!open(x, ty + S.h - 1 + k)) return false;
  let total = 0, start = -1;
  for (let y = room.y + 1; y < room.y + room.h - 1; y++) for (let x = room.x + 1; x < room.x + room.w - 1; x++) if (open(x, y)) { total++; if (start < 0) start = y * W + x; }
  if (start < 0) return false;
  const seen = new Set([start]), stack = [start];
  while (stack.length) {
    const i = stack.pop(), x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = (y + dy) * W + x + dx;
      if (!seen.has(j) && open(x + dx, y + dy)) { seen.add(j); stack.push(j); }
    }
  }
  return seen.size === total;
}
// The same for a disc that no blow moves (an iron cage, `TUNING.keys.iron`): the room's floor still one
// piece with every tile whose middle is within `R` px of (px, py) taken out, `R` the cage and a goat
// side by side. Iron gives only to a key, and a cage on the crossroads of a one-tile corridor, or in
// the lane between two drops, left a floor that could not be finished without one (5 Oct 2026).
// `more`: other discs of the same radius already standing in the room ([[x, y], ...]), asked together.
function discKeepsRoomOpen(tiles, W, room, px, py, R, more) {
  const under = (x, y) => len((x + 0.5) * TILE - px, (y + 0.5) * TILE - py) < R
    || (!!more && more.some(([mx, my]) => len((x + 0.5) * TILE - mx, (y + 0.5) * TILE - my) < R));
  const open = (x, y) => x > room.x && y > room.y && x < room.x + room.w - 1 && y < room.y + room.h - 1
    && !under(x, y) && tiles[y * W + x] !== T.WALL && tiles[y * W + x] !== T.PIT;
  let total = 0, start = -1;
  for (let y = room.y + 1; y < room.y + room.h - 1; y++) for (let x = room.x + 1; x < room.x + room.w - 1; x++) if (open(x, y)) { total++; if (start < 0) start = y * W + x; }
  if (start < 0) return false;
  const seen = new Set([start]), stack = [start];
  while (stack.length) {
    const i = stack.pop(), x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = (y + dy) * W + x + dx;
      if (!seen.has(j) && open(x + dx, y + dy)) { seen.add(j); stack.push(j); }
    }
  }
  return seen.size === total;
}
function ironReach() { return TUNING.keys.iron.r + TUNING.goat.radius; }
// The horse's stall is the one piece of furniture that is a box and not a disc (`TUNING.prop.stall`):
// its half-extents, or null for anything else. A generator prop and a live `Prop` both answer it.
function stallHalf(p) {
  if (p.kind !== 'coop' || p.holds !== 'horse') return null;
  const S = TUNING.prop.stall;
  return { hx: S.w * TILE / 2, hy: S.h * TILE / 2 };
}
// How far (x, y) is from what stands at `p`: from the stall's sides (0 inside it), from anything
// else's middle. Every clearance laid after the stall asks this, so nothing is put down inside a box
// three tiles long that a centre-to-centre distance of a tile and a half still calls clear of it.
function footGap(p, x, y) {
  const b = stallHalf(p);
  if (!b) return len(p.x - x, p.y - y);
  return len(Math.max(0, Math.abs(x - p.x) - b.hx), Math.max(0, Math.abs(y - p.y) - b.hy));
}

// THE CAVE. A room's corners filled back in with rock, a diagonal of `TUNING.cave.erode` tiles, which
// the round rock (`roundR`) turns into a curve, and now and then a bulge grown out of a straight
// stretch of wall. Only plain floor is ever turned to stone, never a marker, and a bulge only where
// the three tiles behind it are floor, so it can narrow the room but never shut a lane of it.
function erodeCave(rows, rng) {
  const C = TUNING.cave, h = rows.length, w = rows[0].length;
  const g = rows.map((r) => r.split(''));
  const open = (x, y) => y >= 0 && y < h && x >= 0 && x < w && g[y][x] === '.';
  const k0 = Math.floor((Math.min(w, h) - 2) / 2) - 1;
  // How many separate pieces the room's walkable tiles are in (stone, pillar and drop stop a step).
  const pieces = () => {
    const seen = g.map((r) => r.map(() => false)); let n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (seen[y][x] || '#PO'.includes(g[y][x])) continue;
      n++; const q = [[x, y]]; seen[y][x] = true;
      while (q.length) {
        const [px, py] = q.pop();
        for (const [nx, ny] of [[px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]]) {
          if (ny < 0 || ny >= h || nx < 0 || nx >= w || seen[ny][nx] || '#PO'.includes(g[ny][nx])) continue;
          seen[ny][nx] = true; q.push([nx, ny]);
        }
      }
    }
    return n;
  };
  const whole = pieces();
  for (const [cx, sx] of [[1, 1], [w - 2, -1]]) for (const [cy, sy] of [[1, 1], [h - 2, -1]]) {
    const k = Math.min(rng.int(C.erode[0], C.erode[1]), k0), was = g.map((r) => r.slice());
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx + dy < k; dx++) {
      const x = cx + dx * sx, y = cy + dy * sy;
      if (g[y][x] === '.') g[y][x] = '#';
    }
    // A corner filled in over the mouth of a cell (THE OSSUARY's `cells`) shut a man in it: leave that corner square.
    if (pieces() > whole) for (let y = 0; y < h; y++) g[y] = was[y];
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
// Which slot of a `ROOM_LEVELS` string a level is: its place in LEVELS, then THE DARK, then THE TRIP.
function roomSlot(def) {
  if (!def) return -1;
  if (def.shroom) return LEVELS.length + 1;
  if (def.dark) return LEVELS.length;
  return levelIndexOf(def);   // THE ALTAR AGAIN (`againOf`) is THE ALTAR's slot
}
// May this template be dealt on this floor (`ROOM_LEVELS`)? No entry, or a floor the string does not
// reach (a hand-laid one), is yes.
function roomAllowed(t, def) {
  const m = typeof ROOM_LEVELS !== 'undefined' && ROOM_LEVELS[t.name], k = roomSlot(def);
  return !m || k < 0 || k >= m.length || m[k] === '1';
}
// Where the generator deals a template when `ROOM_LEVELS` says nothing: its canon's floor and every
// floor that knows that canon, an untagged room everywhere, a trap room where the floor lays traps,
// the armory nowhere (it only ever stands where its string says). `needs` must be met. For the ROOMS tab.
function roomDefault(t, def) {
  if (!def || (t.needs && !def[t.needs])) return false;
  if (t.tag === 'armory' || t.tag === 'flank') return false;
  if (t.bridge) return !!(def.bridges && def.canon && def.canon.id === t.canon);
  if (t.tag === 'trap') return (def.traps || 0) > 0;
  if (t.tag) return false;
  if (!t.canon) return true;
  return (def.canon && def.canon.id === t.canon) || !!(def.known && def.known.has(t.canon));
}
// What in a room goes off, burns or blows, for `prop.clutter` (`GEN_RULES.clutter`).
const ACTIVE_KINDS = new Set(['brazier', 'lamp', 'barrel', 'chandelier', 'bomb']);
function activeIn(props, room) {
  let n = 0;
  for (const p of props) if (ACTIVE_KINDS.has(p.kind) && p.x >= room.x * TILE && p.x < (room.x + room.w) * TILE && p.y >= room.y * TILE && p.y < (room.y + room.h) * TILE) n++;
  return n;
}
// THE CARPETS (2 Oct 2026): a rug laid in a room, render only (`PaintedArt.carpet` paints it into the
// floor's bake, so it costs no frame). Wholly on plain floor inside the room with floor all round it,
// never over grass, a grate, a fire, the milk or anything else a carpet would hide or cover up, and
// laid under the tables where a room has them. Its own RNG stream, laid after everything else, so no
// other roll moved when it came in. `GEN_RULES.carpets`.
const CARPET_SKIP = new Set(['brazier', 'lamp', 'spike', 'heal', 'spire', 'rock', 'mill', 'coop', 'ironcage', 'cage', 'shrooms', 'secret', 'mouse', 'ware', 'door', 'bell', 'barrel']);
// Every patch of floor that carries words, as tile boxes (5 Oct 2026 playtest: "LEFT CLICK - HEADBUTT"
// was written over a rug, and words on a pattern cannot be read). Generous on purpose: a control
// block may slide `CARPET_WORDS.slide` tiles up or down at draw time (`Renderer.clearFloorRow`), so its
// box covers the whole slide; the mouse's room's words lie across its middle; THE FORK's names run
// left of the flights. Read by `layCarpets` and `GEN_RULES.carpets` alike, so they ask one question.
// A name under a thing (THE SHOWROOM's labels, `size` 14 px or less) is one short line: its box is its
// letters (`small.glyph` of a px a letter) and `small.band` tiles high, kept `small.m` clear, not a tile.
const CARPET_WORDS = { slide: 3, band: 1.6, wide: 14, m: 1, small: { size: 14, glyph: 0.7, band: 0.4, m: 0.3 } };
function floorWords(level) {
  const out = [], CW = CARPET_WORDS, box = (cx, cy, w, h, m = CW.m) => out.push({ x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2, m });
  for (const h of level.hints || []) {
    if (h.size && h.size <= CW.small.size) box(h.x / TILE, h.y / TILE, Math.min((h.w || TILE) / TILE, h.text.length * h.size * CW.small.glyph / TILE), 2 * CW.small.band, CW.small.m);
    else box(h.x / TILE, h.y / TILE, Math.min(CW.wide, (h.w || 14 * TILE) / TILE), 2 * CW.band);
  }
  for (const c of level.controls || []) box(c.x / TILE, c.y / TILE, Math.min(CW.wide, (c.w || 14 * TILE) / TILE), 2 * (CW.band + CW.slide));
  for (const p of level.props || []) {
    const r = p.kind === 'mouse' && level.rooms[p.shopId];
    if (r) box(r.x + r.w / 2, r.y + r.h / 2, r.w, 2 * CW.band);
  }
  const fk = level.forkTile, ex = level.exitTile;
  if (fk && ex) out.push({ x0: fk.x0 - 10, y0: Math.min(fk.y0, ex.y0), x1: fk.x0, y1: Math.max(fk.y0, ex.y0) + 3, m: CW.m });
  if (level.cagePrompt) box(level.cagePrompt.x / TILE, level.cagePrompt.y / TILE, 15, 2 * CW.band + 2);
  return out;
}
// A carpet's box, the words' own margin round it (a tile for a line of floor words), against every patch.
function carpetUnderWords(c, words) {
  return (words || []).some((b) => c.x - b.m < b.x1 && c.x + c.w + b.m > b.x0 && c.y - b.m < b.y1 && c.y + c.h + b.m > b.y0);
}
function carpetFits(tiles, W, grass, props, c, words) {
  if (carpetUnderWords(c, words)) return false;
  for (let y = c.y - 1; y <= c.y + c.h; y++) for (let x = c.x - 1; x <= c.x + c.w; x++) {
    const i = y * W + x, t = tiles[i], inside = x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h;
    if (inside ? t !== T.FLOOR || grass.has(i) : t === T.WALL || t === T.PIT) return false;
  }
  const x0 = c.x * TILE, y0 = c.y * TILE, x1 = (c.x + c.w) * TILE, y1 = (c.y + c.h) * TILE;
  for (const p of props) if (CARPET_SKIP.has(p.kind) && p.x >= x0 - 8 && p.x < x1 + 8 && p.y >= y0 - 8 && p.y < y1 + 8) return false;
  return true;
}
function layCarpets(level) {
  const C = TUNING.carpet, def = level.def, out = [];
  if (def.cave || def.shroom) return out;
  const tiles = level.tiles, W = level.W, grass = new Set(level.grass), rng = new RNG((level.seed ^ 0x0ca7e75) >>> 0), words = floorWords(level);
  for (const room of level.rooms) {
    if (out.length >= C.perLevel) break;
    if (room.index === 0 || room.isTrap || room.isMill || room.isKillbox || room.isAmbush) continue;
    const tables = level.props.filter((p) => p.kind === 'table' && !p.isAltar && inBox(room, p));
    if (!rng.chance(tables.length ? C.tables : C.chance)) continue;
    let best = null, bestS = -Infinity;
    for (let a = 0; a < C.tries; a++) {
      const L = rng.int(C.long[0], C.long[1]), S = rng.int(C.short[0], C.short[1]), across = rng.chance(C.across);
      const w = across ? S : L, h = across ? L : S;
      if (room.w - 4 < w || room.h - 4 < h) continue;
      const c = { x: rng.int(room.x + 2, room.x + room.w - 2 - w), y: rng.int(room.y + 2, room.y + room.h - 2 - h), w, h };
      if (!carpetFits(tiles, W, grass, level.props, c, words)) continue;
      // Under the tables first, then bigger, then nearer the middle of the room.
      const under = tables.filter((t) => t.x >= c.x * TILE && t.x < (c.x + w) * TILE && t.y >= c.y * TILE && t.y < (c.y + h) * TILE).length;
      const s = under * 6 + w * h * 0.15 - Math.hypot(c.x + w / 2 - room.x - room.w / 2, c.y + h / 2 - room.y - room.h / 2) * 0.4;
      if (s > bestS) { bestS = s; best = c; }
    }
    if (best) out.push(Object.assign(best, { room: room.index, style: rng.int(0, C.styles - 1), seed: rng.int(1, 1e9), blood: rng.chance(C.blood) }));
  }
  return out;
}

const inBox = (room, p) => p.x >= room.x * TILE && p.x < (room.x + room.w) * TILE && p.y >= room.y * TILE && p.y < (room.y + room.h) * TILE;
// Where the wall's dressing may go on a room's walls: a floor tile against the far wall ('n'; the
// side branches are kept for asking, though nothing hangs there since 30 Sep 2026), with
// `DRESS.run` tiles of plain stone either side of it along that wall, so it never stands in a doorway,
// a shaft, a vault's mouth or a wall that gives, and the three floor tiles beside and in front of it
// open, so a thing standing there can never be what closes a way through. Shared with
// `GEN_RULES.armor` / `trophies`, which ask the same question of what was placed.
const DRESS = { run: 2 };
function wallFits(tiles, W, room, tx, ty, side, grass) {
  const at = (x, y) => tiles[y * W + x], F = (x, y) => at(x, y) === T.FLOOR && !(grass && grass.has(y * W + x));
  for (let k = -DRESS.run; k <= DRESS.run; k++) {
    const stone = side === 'n' ? at(tx + k, ty - 1) : side === 'w' ? at(tx - 1, ty + k) : at(tx + 1, ty + k);
    if (stone !== T.WALL) return false;
  }
  if (side === 'n') return F(tx - 1, ty) && F(tx, ty) && F(tx + 1, ty) && F(tx - 1, ty + 1) && F(tx, ty + 1) && F(tx + 1, ty + 1);
  const ix = side === 'w' ? 1 : -1;
  return F(tx, ty - 1) && F(tx, ty) && F(tx, ty + 1) && F(tx + ix, ty - 1) && F(tx + ix, ty) && F(tx + ix, ty + 1);
}
// The world point a piece of dressing hangs at on tile (tx, ty) of wall `side`: where the cleat
// hangs, a quarter tile down from the face, the suit of armour and the stag's head both hang on the
// stone (30 Sep 2026: the armour stood on the floor before, and read as a man on a plinth).
function dressPoint(kind, tx, ty, side) {
  const back = 0.25 * TILE;
  if (side === 'w') return { x: tx * TILE + back, y: (ty + 0.5) * TILE };
  if (side === 'e') return { x: (tx + 1) * TILE - back, y: (ty + 0.5) * TILE };
  return { x: (tx + 0.5) * TILE, y: ty * TILE + back };
}
// One piece of dressing in `room` off `rng`: a spot on a wall that fits, clear of every prop (THE
// ARMORY's own racks only a step, `packed`), of the way in and of every door. False where none fits.
function dressWall(tiles, W, room, props, grass, rng, kind, packed) {
  const spots = [];
  // The far wall only: it is the one wall that shows a face to hang a thing on.
  for (let tx = room.x + 1 + DRESS.run; tx <= room.x + room.w - 2 - DRESS.run; tx++) spots.push([tx, room.y + 1, 'n']);
  rng.shuffle(spots);
  for (const [tx, ty, side] of spots) {
    if (!wallFits(tiles, W, room, tx, ty, side, grass)) continue;
    const at = dressPoint(kind, tx, ty, side);
    if (props.some((p) => len(p.x - at.x, p.y - at.y) < (p.kind === 'door' ? 2.5 * TILE : packed && p.kind === 'weapon' ? 0.9 * TILE : 1.6 * TILE))) continue;
    if (room.enter && len(room.enter.x - at.x, room.enter.y - at.y) < 2.5 * TILE) continue;
    props.push({ x: at.x, y: at.y, kind, side });
    return true;
  }
  return false;
}
function rockFits(tiles, W, tx, ty, grass) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const i = (ty + dy) * W + tx + dx;
    if (tiles[i] !== T.FLOOR || (grass && grass.has(i))) return false;
  }
  return true;
}

// A formation: three to six boulders grown into one another rather than scattered apart, so it reads
// as a single big thing to break rather than a handful of loose stones. It grows the way a grass
// patch does, pick at random off the edge of what the formation already has, except every cell has
// to keep the ordinary boulder's own promise once the formation is done growing: plain floor, never
// grass, all round the *outside* of the shape (a cell's neighbour inside the formation is exempt, or
// nothing could ever grow). `clusterKeepsRoomOpen` is the belt to that brace: with every cell of it
// blocked, the room's floor, everything a step past its own walls, so a corridor mouth counts, still
// has to be one piece, or a formation could wall off part of a room the way a badly-drawn one could.
function placeRockCluster(tiles, W, room, grass, props, rng, id) {
  const wantSize = rng.int(3, 6);
  for (let attempt = 0; attempt < 25; attempt++) {
    const sx = rng.int(room.x + 2, room.x + room.w - 3), sy = rng.int(room.y + 2, room.y + room.h - 3);
    const seed = sy * W + sx;
    if (tiles[seed] !== T.FLOOR || (grass && grass.has(seed))) continue;
    const spx = (sx + 0.5) * TILE, spy = (sy + 0.5) * TILE;
    if (room.enter && len(room.enter.x - spx, room.enter.y - spy) < 3.5 * TILE) continue;
    if (props.some((p) => (p.kind === 'rock' || p.kind === 'door' || p.kind === 'mill') && len(p.x - spx, p.y - spy) < 3 * TILE)) continue;
    const cells = [seed], cellSet = new Set(cells);
    for (let guard = 0; cells.length < wantSize && guard < 40; guard++) {
      const from = cells[rng.int(0, cells.length - 1)];
      const fx = from % W, fy = Math.floor(from / W);
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (let i = dirs.length - 1; i > 0; i--) { const j = rng.int(0, i); const t = dirs[i]; dirs[i] = dirs[j]; dirs[j] = t; }
      for (const [dx, dy] of dirs) {
        const nx = fx + dx, ny = fy + dy, ni = ny * W + nx;
        if (cellSet.has(ni)) continue;
        if (nx <= room.x || nx >= room.x + room.w - 1 || ny <= room.y || ny >= room.y + room.h - 1) continue;
        if (tiles[ni] !== T.FLOOR || (grass && grass.has(ni))) continue;
        const npx = (nx + 0.5) * TILE, npy = (ny + 0.5) * TILE;
        if (room.enter && len(room.enter.x - npx, room.enter.y - npy) < 2.5 * TILE) continue;
        cellSet.add(ni); cells.push(ni); break;
      }
    }
    if (cells.length < 3) continue;
    // The outside of the shape has to be open floor the way a lone boulder's eight tiles are, a
    // neighbour that is itself part of the formation is what let it grow this far in the first place.
    // A boulder already scattered into this room counts: the SEED is kept three tiles off one, but a
    // formation grows up to six cells from that seed and can reach a loose stone the seed could not,
    // and two boulders shoulder to shoulder that do not share a formation is the one thing
    // `GEN_RULES.rocks` refuses. The tiles stay floor under a boulder, so nothing else catches this.
    const taken = new Set();
    for (const p of props) if (p.kind === 'rock') taken.add(Math.floor(p.y / TILE) * W + Math.floor(p.x / TILE));
    let perimeterOk = true;
    for (const i of cellSet) {
      const cx = i % W, cy = Math.floor(i / W);
      for (let dy = -1; dy <= 1 && perimeterOk; dy++) for (let dx = -1; dx <= 1; dx++) {
        const ni = (cy + dy) * W + (cx + dx);
        if (cellSet.has(ni)) continue;
        if (tiles[ni] !== T.FLOOR || (grass && grass.has(ni)) || taken.has(ni)) { perimeterOk = false; break; }
      }
      if (!perimeterOk) break;
    }
    if (!perimeterOk) continue;
    // Nor grown over the furniture: the tiles stay floor under a table or a crate too, and a formation
    // that asked only after boulders stood one on a table's top (`GEN_RULES.ontable`).
    let clear = true;
    for (const i of cellSet) {
      const cpx = (i % W + 0.5) * TILE, cpy = (Math.floor(i / W) + 0.5) * TILE;
      if (onTable(cpx, cpy, looseR({ kind: 'rock' }), props) || props.some((p) => p.kind !== 'rock' && p.kind !== 'table' && footGap(p, cpx, cpy) < 0.9 * TILE)) { clear = false; break; }
    }
    if (!clear) continue;
    if (!clusterKeepsRoomOpen(tiles, W, room, cellSet)) continue;
    for (const i of cellSet) {
      const cx = i % W, cy = Math.floor(i / W);
      props.push({ x: (cx + 0.5) * TILE, y: (cy + 0.5) * TILE, kind: 'rock', cluster: id });
    }
    return true;
  }
  return false;
}

// With a formation's cells all blocked, is every other floor tile of the room, and the one tile of
// corridor just past each wall it opens onto, still one connected piece? A flood fill from any one
// of them has to reach every one of them, or the formation has walled off a pocket of the room.
function clusterKeepsRoomOpen(tiles, W, room, blocked) {
  const x0 = room.x - 1, x1 = room.x + room.w, y0 = room.y - 1, y1 = room.y + room.h;
  let start = -1, total = 0;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const i = ty * W + tx;
    if (tiles[i] !== T.FLOOR || blocked.has(i)) continue;
    total++;
    if (start < 0) start = i;
  }
  if (start < 0) return true;
  const seen = new Set([start]), stack = [start];
  while (stack.length) {
    const i = stack.pop(), cx = i % W, cy = Math.floor(i / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
      const ni = ny * W + nx;
      if (seen.has(ni) || blocked.has(ni) || tiles[ni] !== T.FLOOR) continue;
      seen.add(ni); stack.push(ni);
    }
  }
  return seen.size === total;
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
    // Clear of the room's furniture too: grass is drawn over whatever stands in it, and on the cave a
    // bowl of milk, a rack or a lit brazier stood hidden in blades that never caught (28 Sep 2026).
    return !props.some((p) => len(p.x - px, p.y - py) < ((p.kind === 'rock' || p.kind === 'door' || p.kind === 'mill') ? 1.5 : 0.9) * TILE);
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
