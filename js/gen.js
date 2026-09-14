// Level generation: a chain of template rooms joined by 2-wide corridors, trending up-right.
// EXIT is the flight of stairs up out of the last room; ENTRY the flight you came up into the first.
const T = { FLOOR: 0, WALL: 1, HAY: 2, ASH: 3, EXIT: 4, ENTRY: 5 };

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
function fillRoom(budget, available, rng, caps, maxMen, weight) {
  const men = [], used = {};
  const cap = maxMen || caps.men;
  let left = budget;
  for (let guard = 0; guard < 80 && men.length < cap; guard++) {
    const choices = available.filter((k) => (used[k] || 0) < (caps[k] || 99) && THREAT[k] <= left + 0.5);
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
  const fight = rooms.filter((r) => r.index > 0 && !r.calm);
  // The curve is bought in ordinary rooms only. Every set piece — the wheel, the hall, the gallery,
  // the killbox — is a thing to be read rather than a number of men, and none of them may be the
  // room that introduces a kind: meeting the Mill and your first two-hearted man at the same moment
  // means meeting neither of them.
  const ordinary = fight.filter((r) => !r.arena && !r.isHall && !r.isGallery && !r.isMill && !r.isKillbox);
  if (!ordinary.length) return out;

  // Hand each new kind a room of its own: start where the level asks for it and walk forward to the
  // first ordinary room nobody has claimed, then backward if the level ran out of room forward.
  const intro = new Map();
  for (const [kind, at] of (E.introduce || [])) {
    const want = Math.round(clamp(at, 0, 1) * (ordinary.length - 1));
    // If an arena on this level is built round that kind, he has to be met in the open first: the
    // first brute you ever see should not be the one with the extra heart standing in the ring.
    const ring = fight.find((r) => r.arena && r.arena.boss === kind);
    const early = ring ? ordinary.filter((r) => r.index < ring.index) : ordinary;
    const list = early.length ? early : ordinary;
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
    // An arena is its boss. He stands alone the first time you ever see his kind, and with a little
    // company every time after that.
    if (room.arena) {
      const boss = room.arena.boss;
      const known = seen.has(boss);
      const escorts = known ? fillRoom(ENCOUNTER.escortThreat, mixable.filter((k) => k !== boss), rng, caps, 0, weight) : [];
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
    // The Mill's room is a set piece. Half a crowd, and nobody at all on the level that shows you
    // the wheel for the first time: it is a thing to learn, on its own, like a new kind of man.
    if (room.isMill) {
      out.rooms.set(room.index, { men: levelDef.millSolo ? []
        : fillRoom(curve * ENCOUNTER.millEase, mixable, rng, caps, 0, weight), mill: true });
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

function generateLevel(levelDef, seed) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const lvl = tryGenerate(levelDef, seed + attempt * 7919);
    if (lvl) return lvl;
  }
  throw new Error('level generation failed');
}

function tryGenerate(levelDef, seed) {
  const rng = new RNG(seed);
  const W = 420, H = 78;
  const tiles = new Uint8Array(W * H).fill(T.WALL);
  const rooms = [];
  const spawns = []; // {x, y, kind}
  const props = [];  // {x, y, kind}
  let x = 2;
  let y = Math.floor(H * 0.62);
  const n = levelDef.rooms;
  // A level can draw from its own set of rooms: `pool` matches a template's `tag`, and a level
  // without one gets the untagged default set.
  const want = levelDef.pool || null;
  const pool = rng.shuffle(ROOM_TEMPLATES.filter((t) => (t.tag || null) === want));
  let poolIdx = 0;

  for (let i = 0; i < n; i++) {
    let tpl;
    const arena = (levelDef.arenas || []).find((a) => a.at === i);
    if (i === 0) tpl = START_TEMPLATE;
    else if (arena) tpl = ARENA_TEMPLATE;
    else if (i === levelDef.millAt) tpl = MILL_TEMPLATE;
    else if (i === levelDef.hallAt) tpl = GREAT_HALL_TEMPLATE;
    else if (i === levelDef.galleryAt) tpl = GALLERY_TEMPLATE;
    else if (i === levelDef.killboxAt) tpl = KILLBOX_TEMPLATE;
    else tpl = pool[poolIdx++ % pool.length];
    tpl = flipTemplate(tpl, rng);
    const w = tpl.rows[0].length, h = tpl.rows.length;
    y = clamp(y, 1, H - h - 2);
    if (x + w >= W - 6) return null;

    const room = { x, y, w, h, tpl, index: i, markers: [], arena,
      isMill: i === levelDef.millAt, isHall: i === levelDef.hallAt, isGallery: i === levelDef.galleryAt,
      isKillbox: i === levelDef.killboxAt,
      calm: !!levelDef.showControls && (i === 1 || i === 2) };
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const c = tpl.rows[ty][tx];
        const wx = x + tx, wy = y + ty;
        let t = T.FLOOR;
        if (c === '#' || c === 'P') t = T.WALL;
        else if (c === 'h') t = T.HAY;
        tiles[wy * W + wx] = t;
        if ('eoRrmXBbtLMw'.includes(c)) room.markers.push({ tx: wx, ty: wy, c });
      }
    }
    rooms.push(room);
    if (i > 0) {
      const door = carveCorridor(tiles, W, rooms[i - 1], room, rng, levelDef.corridorW);
      if (door && rng.chance(levelDef.doorChance)) props.push({ x: door.x, y: door.y, kind: 'door', vertical: door.vertical });
    }
    x += w + rng.int(3, 7);
    y += rng.int(-6, 3);
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

  // Props from the template markers, and the men the plan asked for placed on whatever the room has.
  const plan = planEncounters(levelDef, rooms, rng);
  // Arms are rare, and a level can hold them back: nothing to pick up until it is this far in.
  // Level one shows the first stand at the halfway mark, so the first half of the run is the goat,
  // his head, and whatever the room was already built out of.
  const racksFrom = Math.round((levelDef.racksFrom || 0) * (n - 1));
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
      if (m.c === 'B') props.push({ x: px, y: py, kind: 'brazier' });
      else if (m.c === 'o') props.push({ x: px, y: py, kind: 'pot' });
      else if (m.c === 'b') { if (manned) props.push({ x: px, y: py, kind: 'bell' }); }
      else if (m.c === 'L') props.push({ x: px, y: py, kind: 'lamp' });
      else if (m.c === 't') { if (m.tx % 2 === 0 && m.ty % 2 === 0) props.push({ x: px + TILE / 2, y: py + TILE / 2, kind: 'table' }); }
      else if (m.c === 'M') props.push({ x: px, y: py, kind: 'mill', phase: rng.float(0, Math.PI * 2) });
      else if (m.c === 'X') room.bossSpot = { x: px, y: py };
      // A pair of stands alternates, so an arena always offers one of each rather than two swords.
      // The killbox's own stand is always the shield: the room is a rifle problem, and the shield is
      // the answer to a rifle that does not involve holding a man.
      else if (m.c === 'w') { if (room.index >= racksFrom) props.push({ x: px, y: py, kind: 'weapon', weapon: room.isKillbox ? 'shield' : (wIdx++ % 2) ? 'shield' : 'sword' }); }
      else spots.push(m);
    });
    // Now and then a single stand of arms, anywhere a man might have left one. Never two, never
    // before the level says arms exist, and never in an arena — an arena carries its own pair.
    if (room.index >= Math.max(1, racksFrom) && !room.arena && rng.chance(levelDef.racks || 0)) {
      for (let a = 0; a < 30; a++) {
        const tx = rng.int(room.x + 2, room.x + room.w - 3), ty = rng.int(room.y + 2, room.y + room.h - 3);
        if (tiles[ty * W + tx] !== T.FLOOR) continue;
        const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
        if (props.some((p) => len(p.x - px, p.y - py) < 1.8 * TILE)) continue;
        props.push({ x: px, y: py, kind: 'weapon', weapon: rng.chance(0.5) ? 'sword' : 'shield' });
        break;
      }
    }
    if (!cell) return;                                  // the pen and the two control rooms stay empty
    rng.shuffle(spots);
    // A rifle likes a post and a mage likes his own mark; everyone else takes what is left.
    const take = (kind) => {
      const wants = kind === 'hunter' ? 'rR' : kind === 'seer' ? 'mr' : 'e';
      let i = spots.findIndex((m) => wants.includes(m.c));
      if (i < 0) i = spots.length ? 0 : -1;
      if (i >= 0) { const m = spots.splice(i, 1)[0]; return { x: (m.tx + 0.5) * TILE, y: (m.ty + 0.5) * TILE }; }
      for (let k = 0; k < 40; k++) {
        const tx = rng.int(room.x + 1, room.x + room.w - 2), ty = rng.int(room.y + 1, room.y + room.h - 2);
        if (tiles[ty * W + tx] === T.FLOOR) return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
      }
      return null;
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

  // Lone rifle posts, once rifles are something you have met. A rifle on its own is a different
  // problem from a rifle inside a crowd: you have to cross its line rather than out-run the pile.
  if (levelDef.lonePosts && plan.hunterFrom >= 0) {
    const eligible = rng.shuffle(rooms.filter((r) => r.index > plan.hunterFrom && !r.arena && !r.isMill && !r.calm
      && !r.isGallery && !r.isHall && !r.isKillbox && !plan.introRooms.has(r.index)));
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

  // Milk, on a rhythm rather than on a roll. A run is meant to be offered a bowl every few rooms,
  // so the level is cut into that many bands and each band gives one up — the room inside a band is
  // random, the spacing is not. `heals` is a floor: a long level gets more bowls, never a longer
  // dry spell, and the same eligibility as before keeps them out of the set pieces.
  const healable = rooms.filter((r) => r.index > 0 && !r.arena && !r.isMill && !r.calm && !r.isGallery && !r.isKillbox);
  const wantHeals = Math.min(healable.length, Math.max(levelDef.heals || 0, Math.ceil((n - 1) / TUNING.prop.heal.every)));
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
  healRooms.forEach((room) => {
    for (let k = 0; k < 30; k++) {
      const tx = rng.int(room.x + 2, room.x + room.w - 3), ty = rng.int(room.y + 2, room.y + room.h - 3);
      if (tiles[ty * W + tx] !== T.FLOOR) continue;
      props.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, kind: 'heal' });
      return;
    }
  });

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
  // The level's own hint goes across the middle of the first room; the pen's own prompt goes below the pen.
  const hints = levelDef.hint ? [{ x: centre.x, y: centre.y - 2.0 * TILE, text: levelDef.hint }] : [];
  const cagePrompt = levelDef.startCage ? { x: start.x, y: start.y + 2.9 * TILE } : null;
  // Ape Out paints the controls on the floor. We split them over the two rooms after the pen,
  // and both of those rooms are left empty so they can be read without being clubbed.
  const controls = [];
  if (levelDef.showControls) {
    for (let k = 0; k < 2; k++) {
      const r = rooms[k + 1];
      if (r) controls.push({ x: (r.x + r.w / 2) * TILE, y: (r.y + r.h / 2) * TILE, w: r.w * TILE, part: k });
    }
  }
  return { W, H, tiles, rooms, spawns: filtered, props: cleanProps, start, exit, exitTile, entry, seed, def: levelDef,
    hints, controls, cagePrompt };
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
  const yA = pickDoorY(a, 'right', rng);
  const yB = pickDoorY(b, 'left', rng);
  if (yA < 0 || yB < 0) return null;
  const xA = a.x + a.w - 1, xB = b.x;
  const midX = Math.floor((xA + xB) / 2);
  const carve = (tx, ty) => { if (tx >= 0 && tx < W && ty >= 1 && ty < H - 1) tiles[ty * W + tx] = T.FLOOR; };
  const band = (tx, ty) => { for (let k = 0; k < wide; k++) carve(tx, ty + k); };
  for (let tx = xA; tx <= midX + wide - 1; tx++) band(tx, yA);
  const y0 = Math.min(yA, yB), y1 = Math.max(yA, yB) + wide - 1;
  for (let ty = y0; ty <= y1; ty++) for (let k = 0; k < wide; k++) carve(midX + k, ty);
  for (let tx = midX; tx <= xB; tx++) band(tx, yB);
  if (y1 - y0 >= 4) return { x: (midX + 1) * TILE, y: (Math.floor((y0 + y1) / 2) + 0.5) * TILE, vertical: false };
  if (midX - xA >= 3) return { x: (Math.floor((xA + midX) / 2) + 0.5) * TILE, y: (yA + 1) * TILE, vertical: true };
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
      if (t === T.WALL) continue;
      seen[j] = 1; q.push(j);
    }
  }
  return false;
}
