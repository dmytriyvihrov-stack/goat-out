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
    return { index: room.index, name: room.tpl.name, role: room.role, men, spawns, threat, cell, room };
  });
}

const GEN_RULES = [
  { id: 'alone', text: 'Every kind is met alone. The first room of a run to hold a kind holds that one enemy and nothing else, and a boss never seen before stands in his ring alone.',
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
  { id: 'first', text: 'The run opens on one man: the first fighting room of level one holds a single clubman, and he stands in the only way out of it.',
    check: (L) => {
      if (LEVELS.indexOf(L.def) !== 0) return null;
      const r = roomsOf(L).find((x) => x.spawns.length);
      if (!r) return 'no fighting room at all';
      if (r.spawns.length !== 1) return `it holds ${r.men.join(', ')}`;
      return r.spawns[0].sentry ? true : 'he is not standing in the way out';
    } },
  { id: 'rises', text: 'Threat rises across a level. Rooms are bought off the curve from → to, so the last third of the ordinary rooms is harder than the first. Per seed here; the report averages it.',
    check: (L) => {
      const o = roomsOf(L).filter((r) => ORDINARY.has(r.role) && r.threat > 0);
      if (o.length < 4) return null;
      const third = Math.floor(o.length / 3) || 1;
      const avg = (a) => a.reduce((s, r) => s + r.threat, 0) / a.length;
      const early = avg(o.slice(0, third)), late = avg(o.slice(-third));
      return late > early * 1.2 ? true : `${early.toFixed(1)} → ${late.toFixed(1)}`;
    } },
  { id: 'harder', text: 'Every level is harder than the one before: the top of its curve is above the last level\'s, and the report holds the totals to it.',
    check: (L) => {
      const i = LEVELS.indexOf(L.def);
      if (i <= 0) return null;
      const a = LEVELS[i - 1].encounters, b = L.def.encounters;
      return b.to > a.to ? true : `its top (${b.to}) is not above ${LEVELS[i - 1].name} (${a.to})`;
    } },
  { id: 'caps', text: 'No room breaks the caps: one mage, one brute, two rifles, two hounds, three dead, seven men — unless the level loosens them. Only the Great Hall is exempt.',
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
  { id: 'canon', text: 'A level is about one thing. At least half of its ordinary rooms are built round its canon, and the first ordinary room always is.',
    check: (L) => {
      if (!L.def.canon) return null;
      const o = roomsOf(L).filter((r) => ORDINARY.has(r.role));
      const c = o.filter((r) => r.role === 'canon').length, need = Math.ceil(CANON.share * o.length);
      if (c < need) return `${c} of ${o.length} ordinary rooms (needs ${need})`;
      if (o.length && o[0].role !== 'canon') return `it opens on a ${o[0].role} room`;
      return true;
    } },
  { id: 'mix', text: 'The rest are the mix: rooms the run already knows — the plain set and the canons of earlier levels — and never an idea from a level it has not reached.',
    check: (L) => {
      for (const r of L.rooms) {
        if (r.role !== 'mix') continue;
        const c = r.tpl.canon;
        if (c && !(L.def.known && L.def.known.has(c))) return `room ${r.index} is ${r.tpl.name}, a ${c} room`;
      }
      return true;
    } },
  { id: 'written', text: 'A canon is at least four rooms. Fewer would be the same floor twice in one level.',
    check: (L) => {
      if (!L.def.canon) return null;
      const n = ROOM_TEMPLATES.filter((t) => t.canon === L.def.canon.id).length;
      return n >= CANON.minRooms ? true : `${n} rooms written for ${L.def.canon.id}`;
    } },
  { id: 'teach', text: 'Set pieces teach nothing. The Mill, the Hall, the Gallery, the killbox and a trap room buy their men off the curve but never introduce a kind.',
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
  { id: 'mill', text: 'The Mill\'s room is half a crowd, and nobody at all on the level that first shows the wheel: the wheel is a thing to learn on its own.',
    check: (L) => {
      const rs = roomsOf(L), m = rs.find((r) => r.role === 'mill');
      if (!m) return null;
      if (L.def.millSolo) return m.spawns.length ? `${m.men.join(', ')} standing in it` : true;
      const peak = Math.max(0, ...rs.filter((r) => ORDINARY.has(r.role)).map((r) => r.threat));
      return m.threat <= peak ? true : `${m.threat.toFixed(1)} threat, above the worst ordinary room (${peak.toFixed(1)})`;
    } },
  { id: 'rifles', text: 'Rifles hold posts only once a rifle has been met: the killbox, the Gallery and the lone posts all come after the room that introduces one.',
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
  { id: 'milk', text: 'Milk is on a rhythm. The level is cut into bands and every band gives up a bowl, so it never goes longer than heal.every rooms dry, and no bowl sits in a set piece.',
    check: (L) => {
      const n = L.def.rooms, limit = Math.ceil(TUNING.prop.heal.every);
      const rooms = L.props.filter((p) => p.kind === 'heal').map((p) => roomAt(L, p.x, p.y)).filter(Boolean);
      for (const r of rooms) if (SET_PIECE.has(r.role) && r.role !== 'hall') return `a bowl in the ${r.role}`;
      const idx = rooms.map((r) => r.index).sort((a, b) => a - b);
      let prev = 0, worst = 0;
      for (const i of idx) { worst = Math.max(worst, i - prev); prev = i; }
      worst = Math.max(worst, n - 1 - prev);
      return worst <= limit ? true : `${worst} rooms without a bowl (limit ${limit})`;
    } },
  { id: 'pen', text: 'Nothing spawns within five tiles of where you wake, and the two control rooms after the pen hold nobody.',
    check: (L) => {
      for (const s of L.spawns) if (Math.hypot(s.x - L.start.x, s.y - L.start.y) <= 5 * TILE) return 'a man beside the pen';
      for (const r of roomsOf(L)) if ((r.role === 'calm' || r.role === 'pen') && r.spawns.length) return `${r.men.join(', ')} in the ${r.role}`;
      return true;
    } },
  { id: 'arms', text: 'Arms are held back: no stand before the level\'s racksFrom, and never more than one loose stand in a room on top of what the template drew.',
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
  { id: 'traps', text: 'A trap room is never a set piece and never one of the first two ordinary rooms, where kinds are introduced. The random grating skips it.',
    check: (L) => {
      const o = L.rooms.filter((r) => ORDINARY.has(r.role)), t = o.filter((r) => r.role === 'trap');
      if (!t.length) return null;
      for (const r of t) if (o.indexOf(r) < 2) return `room ${r.index} is a trap room`;
      return true;
    } },
  { id: 'vault', text: 'The vault is a sealed chamber off one ordinary room in the middle of the level, behind the soul door, and nothing about it is on the way to the stairs.',
    check: (L) => {
      if (L.def.vaultAt === undefined) return null;
      if (!L.vault) return 'no rock to cut it into on this seed, so the level is a tome short';
      const r = L.rooms[L.def.vaultAt];
      return ORDINARY.has(r.role) ? true : `off the ${r.role}`;
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
  const pct = (v) => (v ? Math.round(v * 100) + '%' : '—');
  const at = (v) => (v === undefined ? '—' : String(v));
  const fits = (t) => !t.needs || def[t.needs];
  const canon = def.canon ? ROOM_TEMPLATES.filter((t) => t.canon === def.canon.id).map((t) => t.name) : [];
  const mix = ROOM_TEMPLATES.filter((t) => !t.tag && (!t.canon || (def.known && def.known.has(t.canon))) && fits(t)).map((t) => t.name);
  const traps = ROOM_TEMPLATES.filter((t) => t.tag === 'trap' && fits(t)).map((t) => t.name);
  return [
    `${def.rooms} rooms · curve ${E.from} → ${E.to}, ease ${E.ease} · kinds: ${E.kinds.join(', ')}`,
    `introduces: ${(E.introduce || []).map(([k, a]) => `${k} @ ${a}`).join(', ') || 'nothing new'}`
      + (E.cap ? ' · caps loosened: ' + Object.entries(E.cap).map(([k, v]) => `${k} ${v}`).join(', ') : '')
      + (E.weight ? ' · draw reweighed: ' + Object.entries(E.weight).map(([k, v]) => `${k} ${v}`).join(', ') : ''),
    `arenas: ${(def.arenas || []).map((a) => `${a.boss} @ ${a.at}`).join(', ') || '—'} · mill @ ${at(def.millAt)}${def.millSolo ? ' (empty)' : ''}`
      + ` · hall @ ${at(def.hallAt)}${def.hallThreat ? ` (${def.hallThreat})` : ''} · gallery @ ${at(def.galleryAt)} · killbox @ ${at(def.killboxAt)} · vault @ ${at(def.vaultAt)}`,
    `lone posts ${def.lonePosts || 0} · trap rooms ${def.traps || 0} · grating ${pct(def.spikes)} · crates ${pct(def.crates)} · windows ${pct(def.windows)} · corridor ${def.corridorW || 2} wide`,
    `milk ≥ ${def.heals || 0} · tomes ${def.tomes} · stands ${pct(def.racks)} of rooms from ${pct(def.racksFrom)} of the level · doors ${pct(def.doorChance)}, iron ${pct(def.ironDoors)}`
      + (def.sentryIntro ? ' · the first man is a sentry' : '') + (def.ritual ? ' · the ritual room' : ''),
    `canon rooms (${canon.length}): ${canon.join(', ') || '—'}`,
    `mix rooms (${mix.length}): ${mix.join(', ')}`,
    `trap rooms (${traps.length}): ${traps.join(', ') || '—'}`,
  ];
}
