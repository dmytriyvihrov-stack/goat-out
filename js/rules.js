// The generation rules, written once, in a form that can be held against a level. Each one is what
// the generator promises and how to tell whether a level it produced keeps the promise: the dev
// drawer's RULES page runs `checkRules` on a level and paints every rule by its answer, and
// `node tools/balance.js` runs the same list over many seeds of every level and fails the build on
// any rule that does not hold. A rule's `check` returns true (it holds), a string (why it does not)
// or null (it has nothing to say about this level). Keep the text short: it is drawn in a column a
// third of the screen wide, and the reasoning behind a rule belongs in the comment over the code
// that keeps it, not here.
const SET_PIECE = new Set(['arena', 'mill', 'hall', 'gallery', 'killbox']);
const ORDINARY = new Set(['canon', 'mix', 'trap']);

const kindOf = (s) => (s.champion ? 'champion' : s.kind);
const roomAt = (L, x, y) => L.rooms.find((r) => x >= r.x * TILE && x < (r.x + r.w) * TILE && y >= r.y * TILE && y < (r.y + r.h) * TILE);

// One level reduced to what the player meets: every room with its role, its men, what the plan said
// about it, and its threat — a boss counting 1.6 of his kind, as the balance report always has.
function roomsOf(L) {
  const by = new Map();
  for (const s of L.spawns) {
    const r = s.roomIndex === undefined ? 0 : s.roomIndex;
    if (!by.has(r)) by.set(r, []);
    by.get(r).push(s);
  }
  return L.rooms.map((room) => {
    const spawns = by.get(room.index) || [];
    const men = spawns.map((s) => kindOf(s) + (s.boss ? '*' : ''));
    const threat = spawns.reduce((a, s) => a + (THREAT[kindOf(s)] || 1) * (s.boss ? 1.6 : 1), 0);
    const cell = L.plan ? L.plan.rooms.get(room.index) || null : null;
    // The second axis, beside the crowd: how much of this room is floor with nothing solid within a
    // step of it, and so how little of it the goat can use as a weapon. `pressure` is the two put
    // together — what the room actually asks — and it is the number the balance report ranks by.
    const ground = room.tpl.ground === undefined ? 0 : room.tpl.ground;
    return { index: room.index, name: room.tpl.name, role: room.role, men, spawns, threat, cell, room,
      ground, drawn: !!room.drawn, pressure: threat * (1 + ground * GROUND.weight) };
  });
}

const GEN_RULES = [
  { id: 'alone', text: 'Every kind is met alone: one enemy in the room, and a first-time boss with no escort.',
    check: (L) => {
      const def = L.def, E = def.encounters;
      const fresh = new Set((E.introduce || []).map(([k]) => k));
      for (const a of (def.arenas || [])) if (!def.met.has(a.boss) && !E.kinds.includes(a.boss)) fresh.add(a.boss);
      if (!fresh.size) return null;
      const seen = new Set();
      for (const r of roomsOf(L)) {
        for (const s of r.spawns) {
          const k = kindOf(s);
          if (seen.has(k)) continue;
          seen.add(k);
          if (fresh.has(k) && r.spawns.length !== 1) return `the first ${k} arrives with ${r.men.join(', ')} in room ${r.index}`;
        }
      }
      return true;
    } },
  { id: 'first', text: 'The run opens on one clubman, standing in the only way out of his room.',
    check: (L) => {
      if (levelIndexOf(L.def) !== 0) return null;
      const r = roomsOf(L).find((x) => x.spawns.length);
      if (!r) return 'no fighting room at all';
      if (r.spawns.length !== 1) return `it holds ${r.men.join(', ')}`;
      return r.spawns[0].sentry ? true : 'he is not standing in the way out';
    } },
  { id: 'rises', text: 'Threat rises across a level: the last third of the ordinary rooms beats the first.',
    check: (L) => {
      const o = roomsOf(L).filter((r) => ORDINARY.has(r.role) && r.threat > 0);
      if (o.length < 4) return null;
      const third = Math.floor(o.length / 3) || 1;
      const avg = (a) => a.reduce((s, r) => s + r.threat, 0) / a.length;
      const early = avg(o.slice(0, third)), late = avg(o.slice(-third));
      return late > early * 1.2 ? true : `${early.toFixed(1)} → ${late.toFixed(1)}`;
    } },
  // The floor's own half of the curve, and it is held against the rooms the DRAW chose and nothing
  // else: a set piece, the two teaching rooms and a trap room are all forced or dealt from a pool of
  // their own, so none of them is the generator keeping this promise or breaking it. Like `rises` it
  // is really an averaged rule — the draw takes at random inside a window of the pool, so one seed
  // running the other way is noise — and `tools/balance.js` judges it over many seeds instead.
  { id: 'ground', text: 'The floor opens up across a level. One seed may run the other way; BALANCE judges the average.',
    check: (L) => {
      const o = roomsOf(L).filter((r) => ORDINARY.has(r.role) && r.drawn);
      if (o.length < 4) return null;
      const third = Math.floor(o.length / 3) || 1;
      const avg = (a) => a.reduce((s, r) => s + r.ground, 0) / a.length;
      // True where this seed shows the trend, ash where it does not — never blood. A pool of five
      // templates drawn through a window of three swaps two ranks often enough that one level
      // running flat is noise, and a page that paints noise as a broken promise teaches nobody.
      return avg(o.slice(-third)) > avg(o.slice(0, third)) ? true : null;
    } },
  // What that curve is allowed to be spent on. A level past the cheap threshold that is still
  // mostly clubmen is a late level built out of early men.
  { id: 'crowd', text: 'A rich room is not a poor one with more clubmen in it.',
    check: (L) => {
      const C = ENCOUNTER.cheap;
      const o = roomsOf(L).filter((r) => ORDINARY.has(r.role) && r.spawns.length);
      const rich = o.filter((r) => (r.cell && r.cell.threat ? r.cell.threat : r.threat) > C.none * 0.6);
      if (!rich.length) return null;
      for (const r of rich) {
        const cheap = r.men.filter((m) => m === C.kind).length;
        if (cheap > C.max) return `room ${r.index}: ${cheap} ${C.kind}s of ${r.men.length}`;
      }
      return true;
    } },
  { id: 'harder', text: 'Every level is harder than the one before it.',
    check: (L) => {
      const i = LEVELS.indexOf(L.def);
      if (i <= 0) return null;
      const a = LEVELS[i - 1].encounters, b = L.def.encounters;
      return b.to > a.to ? true : `its top (${b.to}) is not above ${LEVELS[i - 1].name} (${a.to})`;
    } },
  { id: 'caps', text: 'No room breaks its caps. Only the Great Hall is exempt.',
    check: (L) => {
      const caps = Object.assign({}, ENCOUNTER.cap, L.def.encounters.cap || {});
      for (const r of roomsOf(L)) {
        const n = {};
        for (const s of r.spawns) { const k = kindOf(s); n[k] = (n[k] || 0) + 1; }
        for (const [k, c] of Object.entries(n)) {
          if (r.role === 'hall' || (r.role === 'gallery' && k === 'hunter')) continue;
          if (caps[k] && c > caps[k]) return `room ${r.index}: ${c}x ${k} (cap ${caps[k]})`;
        }
        const cap = r.role === 'hall' ? ENCOUNTER.hallCap : caps.men + 2;   // +2: a boss and his escort
        if (r.spawns.length > cap) return `room ${r.index}: ${r.spawns.length} men (cap ${cap})`;
      }
      return true;
    } },
  { id: 'canon', text: 'Half the ordinary rooms are the canon, and the first one always is.',
    check: (L) => {
      if (!L.def.canon) return null;
      const o = roomsOf(L).filter((r) => ORDINARY.has(r.role));
      const c = o.filter((r) => r.role === 'canon').length, need = Math.ceil(CANON.share * o.length);
      if (c < need) return `${c} of ${o.length} ordinary rooms (needs ${need})`;
      if (o.length && o[0].role !== 'canon') return `it opens on a ${o[0].role} room`;
      return true;
    } },
  { id: 'mix', text: 'The rest are the mix: plain rooms and canons the run has already met.',
    check: (L) => {
      for (const r of L.rooms) {
        if (r.role !== 'mix') continue;
        const c = r.tpl.canon;
        if (c && !(L.def.known && L.def.known.has(c))) return `room ${r.index} is ${r.tpl.name}, a ${c} room`;
      }
      return true;
    } },
  { id: 'written', text: 'A canon has at least four rooms written for it.',
    check: (L) => {
      if (!L.def.canon) return null;
      const n = ROOM_TEMPLATES.filter((t) => t.canon === L.def.canon.id).length;
      return n >= CANON.minRooms ? true : `${n} rooms written for ${L.def.canon.id}`;
    } },
  { id: 'teach', text: 'Set pieces never introduce a kind.',
    check: (L) => {
      if (!L.plan) return null;
      let any = false;
      for (const r of roomsOf(L)) {
        if (!r.cell || !r.cell.intro) continue;
        any = true;
        if (r.role !== 'canon' && r.role !== 'mix' && r.role !== 'arena') return `${r.cell.intro} is introduced in a ${r.role} room (${r.index})`;
      }
      return any ? true : null;
    } },
  { id: 'mill', text: 'The Mill is half a crowd, and two men on the level that first shows the wheel.',
    check: (L) => {
      const rs = roomsOf(L), m = rs.find((r) => r.role === 'mill');
      if (!m) return null;
      // The teaching room: exactly two, one who reads the arm and one who does not. More than two
      // and the room is a fight with a wheel in it rather than the wheel being the thing it is.
      if (L.def.millLesson) {
        if (m.spawns.length !== 2) return `${m.spawns.length} men standing in it`;
        const sense = m.spawns.map((s) => s.sense).sort();
        return sense[0] === 0 && sense[1] === 1 ? true : 'neither careless nor careful';
      }
      const peak = Math.max(0, ...rs.filter((r) => ORDINARY.has(r.role)).map((r) => r.threat));
      return m.threat <= peak ? true : `${m.threat.toFixed(1)} threat, above the worst ordinary room (${peak.toFixed(1)})`;
    } },
  // The teaching floor is the one place in the game where the generator may not surprise anybody:
  // the same four rooms in the same shapes with the same things standing in them, every seed. See
  // "Words on the floor" in CLAUDE.md for where each block of text goes and why.
  { id: 'lessons', text: 'The teaching rooms are the same every run: pen, sentry, wheel, ambush.',
    check: (L) => {
      const def = L.def;
      if (!def.showControls) return null;
      const parts = (L.controls || []).map((c) => c.part).sort().join('');
      if (parts !== '0123') return `floor text blocks ${parts || 'none'}`;
      const rs = roomsOf(L);
      const sentry = rs.find((r) => r.spawns.some((s) => s.sentry));
      if (!sentry) return 'nobody holds the first room';
      if (sentry.name !== 'lesson') return `the first man stands in a ${sentry.name} room`;
      if (sentry.spawns.length !== 1) return `${sentry.spawns.length} men in the lesson room`;
      if (def.ambushAt === undefined) return true;
      const amb = rs[def.ambushAt];
      if (!amb || amb.name !== 'ambush') return `room ${def.ambushAt} is ${amb ? amb.name : 'missing'}`;
      const box = L.props.filter((p) => roomAt(L, p.x, p.y) === amb.room);
      const blade = box.find((p) => p.kind === 'weapon');
      if (!blade || blade.weapon !== 'sword') return 'no sword inside the ambush door';
      if (!box.some((p) => p.kind === 'crate')) return 'no crate in the ambush room';
      // Everyone in it stands past the middle of it, which is the whole of "they wait".
      const midX = (amb.room.x + amb.room.w / 2) * TILE;
      if (amb.spawns.some((s) => s.x < midX)) return 'a man on the near side of the ambush room';
      return true;
    } },
  { id: 'rifles', text: 'A rifle holds a post only after rifles have been met.',
    check: (L) => {
      if (!L.plan || !L.def.encounters.kinds.includes('hunter')) return null;
      const from = L.plan.hunterFrom;
      for (const r of roomsOf(L)) {
        for (const s of r.spawns) {
          if (s.kind !== 'hunter') continue;
          const posted = s.lone || s.alert || r.role === 'gallery' || r.role === 'killbox';
          if (posted && (from < 0 || r.index <= from)) return `a posted rifle in room ${r.index}; rifles are met at ${from}`;
        }
      }
      return true;
    } },
  { id: 'milk', text: 'Milk is on a rhythm: never more than heal.every rooms dry (heal.gapMax from level 4), never in a set piece, never in a fire.',
    check: (L) => {
      const n = L.def.rooms;
      const limit = levelIndexOf(L.def) >= 3 ? TUNING.prop.heal.gapMax : Math.ceil(TUNING.prop.heal.every);
      const bowls = L.props.filter((p) => p.kind === 'heal');
      const rooms = bowls.map((p) => roomAt(L, p.x, p.y)).filter(Boolean);
      // A heart you have to pay a heart for is not a heart: no bowl stands in a brazier or under a lamp.
      for (const b of bowls) for (const p of L.props) {
        if (p.kind !== 'brazier' && p.kind !== 'lamp') continue;
        if (Math.hypot(p.x - b.x, p.y - b.y) < 2 * TILE) return `a bowl in a ${p.kind}`;
      }
      for (const r of rooms) if (SET_PIECE.has(r.role) && r.role !== 'hall') return `a bowl in the ${r.role}`;
      const idx = rooms.map((r) => r.index).sort((a, b) => a - b);
      let prev = 0, worst = 0;
      for (const i of idx) { worst = Math.max(worst, i - prev); prev = i; }
      worst = Math.max(worst, n - 1 - prev);
      return worst <= limit ? true : `${worst} rooms without a bowl (limit ${limit})`;
    } },
  { id: 'bomb', text: 'At most one bomb a level, standing in an ordinary room and never a set piece.',
    check: (L) => {
      const bombs = L.props.filter((p) => p.kind === 'bomb');
      if (bombs.length > 1) return `${bombs.length} bombs`;
      if (!bombs.length) return null;
      const r = roomAt(L, bombs[0].x, bombs[0].y);
      if (!r) return 'a bomb outside any room';
      if (SET_PIECE.has(r.role) || r.isTrap || r.isAmbush) return `a bomb in the ${r.role || 'set piece'}`;
      return true;
    } },
  // THE ESCORTS (js/beasts.js). One a floor, found early, and found in a room that is not already
  // busy saying something else. The first third is the promise that matters: the whole of an escort
  // is the walk from where you found it to the stairs, and one handed over in the last room was
  // never a decision about anything.
  { id: 'beasts', text: 'At most one animal a floor, shut in a coop on plain floor of an ordinary room inside the first third of the level — never in the pen, a rest room, a teaching room, a trap room or a set piece.',
    check: (L) => {
      const kinds = ['tortoise', 'goose', 'crow', 'chicken'];
      const found = L.props.filter((p) => kinds.indexOf(p.kind) >= 0 || p.kind === 'coop')
        .map((p) => (p.kind === 'coop' ? { x: p.x, y: p.y, kind: p.holds || 'chicken', caged: true } : p));
      if (!found.length) return (L.def.beasts && L.def.beasts.length) ? null : true;
      if (!L.def.beasts || !L.def.beasts.length) return `a ${found[0].kind} on a floor that asks for none`;
      if (found.length > 1) return `${found.length} animals on one floor`;
      const p = found[0];
      if (!p.caged) return `a ${p.kind} standing loose rather than in a coop`;
      if (L.def.beasts.indexOf(p.kind) < 0) return `a ${p.kind} on a floor that does not hold one`;
      const r = roomAt(L, p.x, p.y);
      if (!r) return 'an escort outside any room';
      if (SET_PIECE.has(r.role) || r.role === 'pen' || r.isAmbush || r.isRest || r.isTrap) return `an escort in the ${r.role}`;
      const cut = Math.max(2, Math.ceil(L.rooms.length * TUNING.beast.third));
      if (r.index > cut) return `an escort in room ${r.index} of ${L.rooms.length}, past the first third`;
      if (L.tiles[Math.floor(p.y / TILE) * L.W + Math.floor(p.x / TILE)] !== T.FLOOR) return 'an escort off the floor';
      return true;
    } },
  { id: 'shrooms', text: 'At most one tuft of mushrooms, on plain floor of an ordinary room; never on the last level or on the trip.',
    check: (L) => {
      const t = L.props.filter((p) => p.kind === 'shrooms');
      if (!t.length) return null;
      if (t.length > 1) return `${t.length} tufts`;
      const li = levelIndexOf(L.def);
      if (L.def.shroom || li < 0 || li >= LEVELS.length - 1) return 'a tuft on a level with no level after it';
      const r = roomAt(L, t[0].x, t[0].y);
      if (!r) return 'a tuft outside any room';
      if (SET_PIECE.has(r.role) || r.role === 'pen' || r.isAmbush || r.isRest) return `a tuft in the ${r.role}`;
      if (L.tiles[Math.floor(t[0].y / TILE) * L.W + Math.floor(t[0].x / TILE)] !== T.FLOOR) return 'a tuft off the floor';
      return true;
    } },
  { id: 'trip', text: 'The trip asks little of the hands it scrambles: nothing that shoots, one man a room, the first level curve whatever floor it replaced, no grating, no drop, no trap room.',
    check: (L) => {
      if (!L.def.shroom) return null;
      const S = TUNING.shroom;
      const bad = L.spawns.find((s) => !s.boss && !S.kinds.includes(s.kind));
      if (bad) return `a ${bad.kind} on the trip`;
      // One man a room. The rings are the exception the cap never covered: a boss and the escort
      // level one gives him.
      for (const r of roomsOf(L)) {
        if (r.role === 'arena') continue;
        if (r.men.length > S.men) return `${r.men.length} men in room ${r.index}`;
      }
      const E = L.def.encounters, F = LEVELS[0].encounters;
      if (E.to > F.to * S.threatMul + 0.001) return `the curve runs to ${E.to}, past the first level's ${F.to}`;
      if (L.props.some((p) => p.kind === 'spike')) return 'a grating on the trip';
      if (L.props.some((p) => p.kind === 'spire')) return 'stone teeth on the trip';
      if (L.tiles.some((t) => t === T.PIT)) return 'a drop on the trip';
      if (L.rooms.some((r) => r.isTrap)) return 'a trap room on the trip';
      return true;
    } },
  { id: 'dark', text: 'A dark floor is pockets of light: every arena and rest room has a flame, some rooms have none, and it is gentler than the floor it darkens, with fewer traps, no killbox and no rifle.',
    check: (L) => {
      const def = L.def;
      if (!def.dark) return null;
      const base = LEVELS[def.darkOf];
      const flame = (r) => L.props.some((p) => (p.kind === 'lamp' || p.kind === 'brazier') && roomAt(L, p.x, p.y) === r);
      for (const r of L.rooms) {
        if (r.index === 0) continue;
        if ((r.arena || r.isRest) && !flame(r) && r.index !== shopRoomOf(def)) return `room ${r.index} (${r.role}) has no flame`;
        if (r.unlit && flame(r)) return `room ${r.index} was left black and has a flame`;
      }
      if (def.encounters.to >= base.encounters.to) return `its top (${def.encounters.to}) is not under ${base.name}'s (${base.encounters.to})`;
      if ((def.traps || 0) > (base.traps || 0) || (def.traps || 0) > 0 && def.traps >= base.traps) return `${def.traps} trap rooms against ${base.traps}`;
      if (L.rooms.some((r) => r.isKillbox)) return 'a killbox in the dark';
      if (L.spawns.some((s) => s.kind === 'hunter')) return 'a rifle in the dark';
      return true;
    } },
  // The way out of a room is at the far end of it. `room.exitFar` is what the generator recorded when
  // it chose: how far from the door the goat walks in by the corridor actually left, against the
  // furthest any row (or column) of that wall could have been. A room with no choice to make — one
  // candidate, or the way in and the way out on the same axis — records nothing.
  { id: 'farexit', text: 'A room is left by its far end: the corridor out makes at least DOORS.far of the greatest distance available from the way in.',
    check: (L) => {
      let said = null, any = false;
      for (const r of L.rooms) {
        const f = r.exitFar;
        if (!f || f.max <= 0) continue;
        any = true;
        if (f.d < f.max * DOORS.far - 0.001 && !said) said = `room ${r.index} leaves ${f.d} off the way in of ${f.max} it could have`;
      }
      return !any ? null : (said || true);
    } },
  { id: 'pen', text: 'Nothing spawns by the pen, and the pen holds nobody.',
    check: (L) => {
      for (const s of L.spawns) if (Math.hypot(s.x - L.start.x, s.y - L.start.y) <= 5 * TILE) return 'a man beside the pen';
      for (const r of roomsOf(L)) if (r.role === 'pen' && r.spawns.length) return `${r.men.join(', ')} in the pen`;
      return true;
    } },
  { id: 'furniture', text: 'Nobody is put down inside a crate, a table or any other furniture.',
    check: (L) => {
      for (const sp of L.spawns) if (!sp.sentry && inFurniture(sp.x, sp.y, L.props))
        return `a ${sp.kind} inside the furniture of room ${sp.roomIndex}`;
      return true;
    } },
  // THE CAVE's floor. A boulder is stone to everything that moves, so the only thing that keeps a
  // scatter of them from shutting a way through is where they are allowed to stand. `placeRockCluster`
  // grows a formation of three to six of them on purpose, and every cell of one carries the same
  // `cluster` id — two of those may stand shoulder to shoulder; anything else still may not.
  { id: 'rocks', text: 'A boulder stands on open floor: plain floor all round it, no grass, never another boulder beside it unless the two belong to the same formation.',
    check: (L) => {
      const rocks = L.props.filter((p) => p.kind === 'rock');
      if (!rocks.length) return null;
      const grass = new Set(L.grass || []);
      for (const p of rocks) {
        const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const i = (ty + dy) * L.W + tx + dx;
          if (L.tiles[i] !== T.FLOOR || grass.has(i)) return `a boulder hemmed in at ${tx},${ty}`;
        }
        const near = rocks.find((q) => q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 2 * TILE
          && (p.cluster === undefined || q.cluster !== p.cluster));
        if (near) return `two boulders side by side at ${tx},${ty}`;
      }
      return true;
    } },
  // Barrels roll, so where one starts is the only promise about it that can be held: out in the
  // room with floor all round it, so an untouched one never shuts a way through, and not in a room
  // that is teaching, resting, or built narrow on purpose.
  { id: 'barrels', text: 'A barrel stands out on the floor of an ordinary room or an arena, floor all round it, clear of the way in; only on floors that stock them.',
    check: (L) => {
      const barrels = L.props.filter((p) => p.kind === 'barrel');
      if (!barrels.length) return null;
      if (!L.def.barrels) return 'a barrel on a floor that stocks none';
      const grass = new Set(L.grass || []);
      for (const p of barrels) {
        const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const i = (ty + dy) * L.W + tx + dx;
          if (L.tiles[i] !== T.FLOOR || grass.has(i)) return `a barrel hemmed in at ${tx},${ty}`;
        }
        const r = roomAt(L, p.x, p.y);
        if (!r) return 'a barrel outside any room';
        if ((SET_PIECE.has(r.role) && r.role !== 'arena') || r.role === 'pen' || r.role === 'rest' || r.role === 'lesson' || r.isAmbush || r.isTrap)
          return `a barrel in the ${r.isAmbush ? 'ambush' : r.isTrap ? 'trap room' : r.role}`;
        if (r.enter && Math.hypot(r.enter.x - p.x, r.enter.y - p.y) < 3 * TILE) return `a barrel in the way in of room ${r.index}`;
      }
      return true;
    } },
  // The cave's stone teeth. They kill on contact and they never rest, so where they are allowed to
  // stand is the whole of what keeps them a thing to use rather than a thing to be caught by.
  { id: 'spikes', text: 'Stone teeth stand at the foot of a cave wall, one to a room at most, clear of the way in and the furniture; never on the trip and never in a room that is teaching something.',
    check: (L) => {
      const sp = L.props.filter((p) => p.kind === 'spire');
      if (!sp.length) return null;
      if (!L.def.cave || L.def.shroom) return 'stone teeth off the cave';
      const by = new Map();
      for (const p of sp) {
        const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
        if (L.tiles[ty * L.W + tx] !== T.FLOOR) return `teeth off the floor at ${tx},${ty}`;
        let stone = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (L.tiles[(ty + dy) * L.W + tx + dx] === T.WALL) stone++;
        if (!stone) return `teeth standing in the open at ${tx},${ty}`;
        const r = roomAt(L, p.x, p.y);
        if (!r) return `teeth outside any room at ${tx},${ty}`;
        if (SET_PIECE.has(r.role) || r.role === 'pen' || r.role === 'rest' || r.isTrap || r.isAmbush) return `teeth in the ${r.role}`;
        if (r.enter && Math.hypot(r.enter.x - p.x, r.enter.y - p.y) < 3 * TILE) return `teeth in the doorway of room ${r.index}`;
        by.set(r.index, (by.get(r.index) || 0) + 1);
        for (const o of L.props) {
          if (o === p || o.kind === 'spire' || o.kind === 'door' || o.kind === 'secret') continue;
          if (Math.hypot(o.x - p.x, o.y - p.y) < 1.6 * TILE) return `teeth inside a ${o.kind} in room ${r.index}`;
        }
      }
      for (const [idx, n] of by) if (n > TUNING.cave.spikes.perRoom) return `${n} sets of teeth in room ${idx}`;
      return true;
    } },
  // The cave is the third floor now, so five levels after it draw cave rooms into their mix
  // (`levelDef.known`), and a cave room brings its grass with it — which is right, and is what
  // `known` is for: the run keeps what it has been taught, and the grass is half of what THE HOLLOW
  // is about. What is still forbidden is grass BEFORE the cave, and grass on anything but floor.
  { id: 'grass', text: 'Tall grass grows on the cave\'s floor, and on any later floor that drew a cave room into its mix — never before the cave, and never on stone, a drop or the stairs.',
    check: (L) => {
      if (!L.grass || !L.grass.length) return L.def.cave ? 'a cave with no grass in it' : null;
      if (!L.def.cave && !(L.def.known && L.def.known.has('hollow'))) return 'grass before the cave';
      for (const i of L.grass) if (L.tiles[i] !== T.FLOOR) return `grass on a tile that is not floor at ${i % L.W},${Math.floor(i / L.W)}`;
      return true;
    } },
  { id: 'spacing', text: 'Nobody is put down on top of anybody else.',
    check: (L) => {
      for (let a = 0; a < L.spawns.length; a++) for (let b = a + 1; b < L.spawns.length; b++) {
        const p = L.spawns[a], q = L.spawns[b];
        if (Math.hypot(p.x - q.x, p.y - q.y) < 0.9 * TILE) return `two men on one spot in room ${p.roomIndex}`;
      }
      return true;
    } },
  { id: 'stack', text: 'A room hung above or below the last one never overlaps another, and is never a set piece or a teaching room.',
    check: (L) => {
      const stacked = L.rooms.filter((r) => r.stacked);
      if (!stacked.length) return L.def.stack ? null : true;
      for (const r of stacked) {
        if (!ORDINARY.has(r.role) && r.role !== 'arena') return `room ${r.index} is the ${r.role}`;
        if (r.isAmbush) return `room ${r.index} is a teaching room`;
        if ((L.def.gates || []).includes(r.index)) return `room ${r.index} is a gate room`;
        for (const o of L.rooms) {
          if (o === r) continue;
          const apart = r.x + r.w <= o.x || o.x + o.w <= r.x || r.y + r.h <= o.y || o.y + o.h <= r.y;
          if (!apart) return `room ${r.index} overlaps room ${o.index}`;
        }
      }
      return true;
    } },
  { id: 'arms', text: 'No stand of arms before racksFrom, and one loose stand to a room.',
    check: (L) => {
      const from = Math.round((L.def.racksFrom || 0) * (L.def.rooms - 1)), per = new Map();
      for (const p of L.props) {
        if (p.kind !== 'weapon') continue;
        const r = roomAt(L, p.x, p.y);
        if (!r) continue;
        if (r.index < from) return `a stand in room ${r.index}, before ${from}`;
        per.set(r.index, (per.get(r.index) || 0) + 1);
      }
      for (const [i, c] of per) {
        const own = L.rooms[i].markers.filter((m) => m.c === 'w').length;
        if (c > own + 1) return `${c} stands in room ${i}`;
      }
      return true;
    } },
  { id: 'traps', text: 'A trap room is never a set piece nor one of the first two ordinary rooms.',
    check: (L) => {
      const o = L.rooms.filter((r) => ORDINARY.has(r.role)), t = o.filter((r) => r.role === 'trap');
      if (!t.length) return null;
      for (const r of t) if (o.indexOf(r) < 2) return `room ${r.index} is a trap room`;
      return true;
    } },
  { id: 'clock', text: 'A door on a clock is iron, never the way out, and never on a room that is teaching.',
    check: (L) => {
      const timed = L.props.filter((p) => p.kind === 'door' && p.timed);
      if (!timed.length) return L.def.clockDoors ? null : true;
      for (const p of timed) {
        if (!p.iron || p.stair || p.vault || p.gate || p.seal) return `one is not an ordinary iron door`;
        const cell = L.plan && L.plan.rooms.get(p.clockRoom);
        if (!cell) return `room ${p.clockRoom} has no plan behind it`;
        if (L.plan.introRooms.has(p.clockRoom)) return `room ${p.clockRoom} is where a kind is met`;
        if ((cell.men || []).length < 2) return `room ${p.clockRoom} holds ${(cell.men || []).length}`;
      }
      return true;
    } },
  { id: 'stairdoor', text: 'The way out is barred: an iron door in front of every level\'s stairs.',
    check: (L) => {
      const d = L.props.find((p) => p.kind === 'door' && p.stair);
      if (!d) return 'nothing standing in front of them';
      const last = L.rooms[L.rooms.length - 1];
      const inLast = d.x >= last.x * TILE && d.x < (last.x + last.w) * TILE;
      return inLast ? true : 'it is not in the last room';
    } },
  { id: 'soulgate', text: 'Every level stops you twice, in the middle and before the end: a single-tile way out barred by a door no blow opens, in an empty rest room.',
    check: (L) => {
      const want = L.def.gates || [];
      if (!want.length) return null;
      if (!L.gates || L.gates.length !== want.length) return `${(L.gates || []).length} gates hung of ${want.length}`;
      const n = L.rooms.length;
      if (want[0] > n * 0.75) return `the first gate (room ${want[0]}) is not in the middle`;
      if (want[want.length - 1] < n * 0.6 || want[want.length - 1] >= n - 1) return `the last gate (room ${want[want.length - 1]}) is not before the end`;
      for (const g of L.gates) {
        const door = L.props.find((p) => p.kind === 'door' && p.gate && p.gateRoom === g.room);
        if (!door) return `no gate door on room ${g.room}`;
        const r = L.rooms[g.room];
        if (r.role !== 'rest') return `room ${g.room} is the ${r.role}, not a rest room`;
        if (L.spawns.some((s) => s.roomIndex === g.room)) return `somebody is put in the rest room ${g.room}`;
        if (!r.exitBand) return `room ${g.room} has no side way out to narrow`;
        for (let k = 1; k < r.exitBand.wide; k++) if (L.tiles[(r.exitBand.y + k) * L.W + r.exitBand.x0] !== T.WALL) return `room ${g.room}'s way out is not narrowed`;
      }
      return true;
    } },
  { id: 'budget', text: 'A level hands out every soul it was authored to give: its gates, then its vault, then its last bosses.',
    check: (L) => {
      if (L.def.souls === undefined) return null;
      const bosses = L.spawns.filter((s) => s.boss).length;
      const gateSouls = (L.gates || []).filter((g) => !g.shop).length;
      const places = gateSouls + (L.vault ? 1 : 0) + bosses;
      return places >= L.def.souls ? true : `${L.def.souls} souls and only ${places} places to put them`;
    } },
  { id: 'vault', text: 'The vault is sealed off an ordinary room, and never on the way to the stairs.',
    check: (L) => {
      if (L.def.vaultAt === undefined) return null;
      if (!L.vault) return 'no rock to cut it into on this seed, so the level is a soul short';
      const r = L.rooms[L.def.vaultAt];
      return ORDINARY.has(r.role) ? true : `off the ${r.role}`;
    } },
  { id: 'secrets', text: 'A level that gates its secrets behind its first boss carves none of them before it.',
    check: (L) => {
      if (!L.def.secretsAfterBoss) return null;
      const at = L.def.arenas && L.def.arenas[0] ? L.def.arenas[0].at : -1;
      for (const p of L.props) {
        if (p.kind !== 'secret') continue;
        const r = roomAt(L, p.x, p.y);
        if (r && r.index <= at) return `one in room ${r.index}, at or before the first arena (room ${at})`;
      }
      return true;
    } },
  { id: 'shop', text: 'The mouse stands in the middle gate of THE YARD, THE THRESHING FLOOR and THE RAFTERS only: two talismans of that visit\'s tier, or a pail of milk.',
    check: (L) => {
      const li = levelIndexOf(L.def), S = TUNING.shop;
      const mice = L.props.filter((p) => p.kind === 'mouse');
      if (!S.levels.includes(li)) return mice.length ? `a mouse on level ${li + 1}` : null;
      if (mice.length !== 1) return `${mice.length} mice`;
      const m = mice[0], all = L.props.filter((p) => p.kind === 'ware' && p.shopId === m.shopId);
      const offer = all.find((p) => p.ware && p.ware.id === 'milk'), wares = all.filter((p) => p !== offer);
      if (wares.length !== S.wares) return `${wares.length} talismans on her shelf`;
      if (!offer) return 'no milk among her offers';
      // One pail now, not three bowls: the room has to have somewhere to stand it, and that is all.
      if (!offer.milkSpots || !offer.milkSpots.length) return 'nowhere to stand her pail of milk';
      if (!L.shop || L.shop.room !== m.shopId) return 'the shop is not on the level';
      const gate = (L.gates || [])[0];
      if (!gate || !gate.shop || gate.room !== m.shopId) return `her room ${m.shopId} is not the middle gate`;
      const room = L.rooms[m.shopId];
      if (!room || room.role !== 'rest') return `her room ${m.shopId} is ${room ? room.role : 'nowhere'}`;
      if (room.isAmbush || m.shopId === L.def.vaultAt) return `her room ${m.shopId} is a teaching room or the vault's`;
      for (const i of m.nicheTiles) if (L.tiles[i] !== 0) return 'her hole is not cut';
      const gr = roomAt(L, m.gap.x, m.gap.y);
      if (!gr || gr.index !== m.shopId) return 'her hole does not open into her room';
      const tier = S.levels.indexOf(li) + 1;
      if (wares.some((w) => !w.ware || !ARTIFACTS.some((a) => a.id === w.ware.id) || w.ware.tier !== tier)) return `a ware that is not a tier-${tier} talisman`;
      if (wares[0].ware.id === wares[1].ware.id) return 'the same talisman twice';
      return true;
    } },
  { id: 'clamp', text: 'A room left behind can be shut: stoning up the mouth of its way out cuts it off from every room after it.',
    check: (L) => {
      const { W, H } = L;
      const flood = (tiles, from) => {
        const seen = new Uint8Array(W * H), q = [from]; seen[from] = 1;
        while (q.length) {
          const i = q.pop();
          for (const j of [i - 1, i + 1, i - W, i + W]) {
            if (j < 0 || j >= W * H || seen[j] || tiles[j] === T.WALL || tiles[j] === T.PIT) continue;
            seen[j] = 1; q.push(j);
          }
        }
        return seen;
      };
      const floorOf = (r) => {
        for (let ty = r.y + 1; ty < r.y + r.h - 1; ty++) for (let tx = r.x + 1; tx < r.x + r.w - 1; tx++) if (L.tiles[ty * W + tx] === T.FLOOR) return ty * W + tx;
        return -1;
      };
      // Shut every mouth up to k and flood from the room after it: nothing up to k may be reached.
      const tiles = L.tiles.slice();
      for (let k = 0; k < L.rooms.length - 2; k++) {
        const r = L.rooms[k];
        if (!r.exitMouth) return `room ${k} has no mouth to shut`;
        for (const i of r.exitMouth.tiles) tiles[i] = T.WALL;
        const from = floorOf(L.rooms[k + 1]), back = floorOf(r);
        if (from < 0 || back < 0) continue;
        if (flood(tiles, from)[back]) return `room ${k} is still reachable once shut`;
      }
      return true;
    } },
];

// Every rule held against one level. `ok` is true, false or null; `why` is the rule's own words for
// a failure. A check that throws is a failure too — a rule the code cannot ask is a rule it cannot keep.
function checkRules(L) {
  return GEN_RULES.map((rule) => {
    let r = null;
    try { r = rule.check ? rule.check(L) : null; } catch (e) { r = 'the check threw: ' + e.message; }
    return { rule, ok: r === true ? true : r === null ? null : false, why: typeof r === 'string' ? r : '' };
  });
}

// A level definition read out as lines for the RULES page: the numbers as the generator sees them,
// so the page cannot drift from `LEVELS`.
function levelFacts(def) {
  const E = def.encounters;
  const pct = (v) => (v ? Math.round(v * 100) + '%' : '-');
  const at = (v) => (v === undefined ? '-' : String(v));
  const fits = (t) => !t.needs || def[t.needs];
  const canon = def.canon ? ROOM_TEMPLATES.filter((t) => t.canon === def.canon.id).map((t) => t.name) : [];
  const mix = ROOM_TEMPLATES.filter((t) => !t.tag && (!t.canon || (def.known && def.known.has(t.canon))) && fits(t)).map((t) => t.name);
  const traps = ROOM_TEMPLATES.filter((t) => t.tag === 'trap' && fits(t)).map((t) => t.name);
  // Four lines and no sentences. The page is a thing you scan while a level is paused behind it, so
  // everything here is `name value`, in the order you would ask for it.
  return [
    `${def.rooms} rooms · curve ${E.from}→${E.to} ease ${E.ease} · souls ${def.souls} · milk ≥${def.heals || 0}`,
    `kinds ${E.kinds.join(' ')} · new ${(E.introduce || []).map(([k, a]) => `${k}@${a}`).join(' ') || '-'}`
      + (E.cap ? ' · caps ' + Object.entries(E.cap).map(([k, v]) => `${k} ${v}`).join(' ') : ''),
    `arenas ${(def.arenas || []).map((a) => `${a.boss}@${a.at}`).join(' ') || '-'} · mill ${at(def.millAt)}${def.millLesson ? '(lesson)' : ''}`
      + ` · hall ${at(def.hallAt)} · gallery ${at(def.galleryAt)} · killbox ${at(def.killboxAt)} · vault ${at(def.vaultAt)} · gates ${(def.gates || []).join(' ') || '-'}`,
    `traps ${def.traps || 0} · posts ${def.lonePosts || 0} · grates ${pct(def.spikes)} · crates ${pct(def.crates)}`
      + ` · windows ${pct(def.windows)} · stands ${pct(def.racks)} from ${pct(def.racksFrom)} · doors ${pct(def.doorChance)} iron ${pct(def.ironDoors)}`,
    `canon ${canon.length}: ${canon.join(' ')} · mix ${mix.length} · trap ${traps.length}`,
  ];
}
