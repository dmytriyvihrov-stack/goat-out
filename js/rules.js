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
      if (LEVELS.indexOf(L.def) !== 0) return null;
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
  { id: 'milk', text: 'Milk is on a rhythm: never more than heal.every rooms dry, never in a set piece, never in a fire.',
    check: (L) => {
      const n = L.def.rooms, limit = Math.ceil(TUNING.prop.heal.every);
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
  { id: 'pen', text: 'Nothing spawns by the pen, and the pen holds nobody.',
    check: (L) => {
      for (const s of L.spawns) if (Math.hypot(s.x - L.start.x, s.y - L.start.y) <= 5 * TILE) return 'a man beside the pen';
      for (const r of roomsOf(L)) if (r.role === 'pen' && r.spawns.length) return `${r.men.join(', ')} in the pen`;
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
  { id: 'soulgate', text: 'A gated arena is shut by a door no blow opens, and its boss carries the soul that opens it.',
    check: (L) => {
      if (L.def.soulGate === undefined) return null;
      if (!L.soulGate) return 'the gate was never hung';
      const cell = L.plan && L.plan.rooms.get(L.def.soulGate);
      if (!cell || !cell.boss) return `room ${L.def.soulGate} has no boss in it`;
      return L.props.some((p) => p.kind === 'door' && p.gate) ? true : 'no gate prop on the level';
    } },
  { id: 'budget', text: 'A level hands out every soul it was authored to give: a gate, a vault, then its last bosses.',
    check: (L) => {
      if (L.def.souls === undefined) return null;
      const bosses = L.spawns.filter((s) => s.boss).length;
      const places = bosses + (L.vault ? 1 : 0);
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
      + ` · hall ${at(def.hallAt)} · gallery ${at(def.galleryAt)} · killbox ${at(def.killboxAt)} · vault ${at(def.vaultAt)} · gate ${at(def.soulGate)}`,
    `traps ${def.traps || 0} · posts ${def.lonePosts || 0} · grates ${pct(def.spikes)} · crates ${pct(def.crates)}`
      + ` · windows ${pct(def.windows)} · stands ${pct(def.racks)} from ${pct(def.racksFrom)} · doors ${pct(def.doorChance)} iron ${pct(def.ironDoors)}`,
    `canon ${canon.length}: ${canon.join(' ')} · mix ${mix.length} · trap ${traps.length}`,
  ];
}
