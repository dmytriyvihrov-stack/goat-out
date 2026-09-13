// Level generation: a chain of template rooms joined by 2-wide corridors, trending up-right.
const T = { FLOOR: 0, WALL: 1, HAY: 2, ASH: 3, EXIT: 4 };

function flipTemplate(tpl, rng) {
  let rows = tpl.rows.slice();
  if (rng.chance(0.5)) rows = rows.slice().reverse();
  if (rng.chance(0.5)) rows = rows.map((r) => r.split('').reverse().join(''));
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
function weightedPick(kinds, rng) {
  let total = 0;
  for (const k of kinds) total += ENCOUNTER.weight[k] || 1;
  let r = rng.float(0, total);
  for (const k of kinds) { r -= ENCOUNTER.weight[k] || 1; if (r <= 0) return k; }
  return kinds[kinds.length - 1];
}

// Spend a threat budget on whoever has been introduced, respecting the per-room caps.
function fillRoom(budget, available, rng, caps, maxMen) {
  const men = [], used = {};
  const cap = maxMen || caps.men;
  let left = budget;
  for (let guard = 0; guard < 80 && men.length < cap; guard++) {
    const choices = available.filter((k) => (used[k] || 0) < (caps[k] || 99) && THREAT[k] <= left + 0.5);
    if (!choices.length) break;
    const kind = weightedPick(choices, rng);
    men.push(kind); used[kind] = (used[kind] || 0) + 1; left -= THREAT[kind];
  }
  if (!men.length && available.length) men.push(available.includes('bearer') ? 'bearer' : available[0]);
  return men;
}

function planEncounters(levelDef, rooms, rng) {
  const E = levelDef.encounters;
  // A level may loosen a cap: the finale is allowed rooms the earlier ones are not.
  const caps = Object.assign({}, ENCOUNTER.cap, E.cap || {});
  const out = { rooms: new Map(), introRooms: new Set(), hunterFrom: -1, caps };
  const fight = rooms.filter((r) => r.index > 0 && !r.calm);
  const ordinary = fight.filter((r) => !r.arena && !r.isHall && !r.isGallery);
  if (!ordinary.length) return out;

  // Hand each new kind a room of its own: start where the level asks for it and walk forward to the
  // first ordinary room nobody has claimed, then backward if the level ran out of room forward.
  const intro = new Map();
  for (const [kind, at] of (E.introduce || [])) {
    const want = Math.round(clamp(at, 0, 1) * (ordinary.length - 1));
    const room = ordinary.slice(want).find((r) => !intro.has(r.index))
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
      const escorts = known ? fillRoom(ENCOUNTER.escortThreat, mixable.filter((k) => k !== boss), rng, caps) : [];
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
    // The Great Hall is the exception to every cap: it is supposed to be a wall of bodies.
    if (room.isHall) {
      out.rooms.set(room.index, { men: fillRoom(levelDef.hallThreat || curve * 2.5, mixable, rng, caps, ENCOUNTER.hallCap), hall: true });
      continue;
    }
    // The Gallery is rifles posted apart, but only once rifles are a thing you have met.
    if (room.isGallery) {
      const posts = mixable.includes('hunter') ? ['hunter', 'hunter', 'hunter'] : [];
      out.rooms.set(room.index, { men: posts.concat(fillRoom(curve * 0.6, mixable, rng, caps)), gallery: true });
      continue;
    }
    const budget = curve * (easeOff ? ENCOUNTER.afterIntro : 1);
    out.rooms.set(room.index, { men: fillRoom(budget, mixable, rng, caps), threat: budget });
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
    else tpl = pool[poolIdx++ % pool.length];
    tpl = flipTemplate(tpl, rng);
    const w = tpl.rows[0].length, h = tpl.rows.length;
    y = clamp(y, 1, H - h - 2);
    if (x + w >= W - 6) return null;

    const room = { x, y, w, h, tpl, index: i, markers: [], arena,
      isMill: i === levelDef.millAt, isHall: i === levelDef.hallAt, isGallery: i === levelDef.galleryAt,
      calm: !!levelDef.showControls && (i === 1 || i === 2) };
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const c = tpl.rows[ty][tx];
        const wx = x + tx, wy = y + ty;
        let t = T.FLOOR;
        if (c === '#' || c === 'P') t = T.WALL;
        else if (c === 'h') t = T.HAY;
        tiles[wy * W + wx] = t;
        if ('eoRrmXBbtLM'.includes(c)) room.markers.push({ tx: wx, ty: wy, c });
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

  // Exit: 2-tall gap in the right wall of the last room, marked EXIT.
  const last = rooms[rooms.length - 1];
  const doorY = pickDoorY(last, 'right', rng);
  if (doorY < 0) return null;
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 3; dx++) tiles[(doorY + dy) * W + (last.x + last.w - 1 + dx)] = T.EXIT;
  }
  const exit = { x: (last.x + last.w) * TILE, y: (doorY + 1) * TILE };

  // Props from the template markers, and the men the plan asked for placed on whatever the room has.
  const plan = planEncounters(levelDef, rooms, rng);
  rooms.forEach((room) => {
    const spots = [];
    room.markers.forEach((m) => {
      const px = (m.tx + 0.5) * TILE, py = (m.ty + 0.5) * TILE;
      if (m.c === 'B') props.push({ x: px, y: py, kind: 'brazier' });
      else if (m.c === 'o') props.push({ x: px, y: py, kind: 'pot' });
      else if (m.c === 'b') props.push({ x: px, y: py, kind: 'bell' });
      else if (m.c === 'L') props.push({ x: px, y: py, kind: 'lamp' });
      else if (m.c === 't') { if (m.tx % 2 === 0 && m.ty % 2 === 0) props.push({ x: px + TILE / 2, y: py + TILE / 2, kind: 'table' }); }
      else if (m.c === 'M') props.push({ x: px, y: py, kind: 'mill', phase: rng.float(0, Math.PI * 2) });
      else if (m.c === 'X') room.bossSpot = { x: px, y: py };
      else spots.push(m);
    });
    const cell = plan.rooms.get(room.index);
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
        elite: cell.boss !== 'butcher', boss: true, roomIndex: room.index });
    }
    for (const kind of cell.men) {
      const at = take(kind);
      if (!at) continue;
      spawns.push({ x: at.x, y: at.y, kind: kind === 'champion' ? 'bearer' : kind,
        champion: kind === 'champion', roomIndex: room.index, intro: cell.intro === kind });
    }
  });

  // Lone rifle posts, once rifles are something you have met. A rifle on its own is a different
  // problem from a rifle inside a crowd: you have to cross its line rather than out-run the pile.
  if (levelDef.lonePosts && plan.hunterFrom >= 0) {
    const eligible = rng.shuffle(rooms.filter((r) => r.index > plan.hunterFrom && !r.arena && !r.isMill && !r.calm
      && !r.isGallery && !r.isHall && !plan.introRooms.has(r.index)));
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

  // Two bowls of milk per level, dropped in ordinary rooms between the set pieces.
  const healRooms = rng.shuffle(rooms.filter((r) => r.index > 0 && !r.arena && !r.isMill && !r.calm && !r.isGallery)).slice(0, levelDef.heals || 0);
  healRooms.forEach((room) => {
    for (let k = 0; k < 30; k++) {
      const tx = rng.int(room.x + 2, room.x + room.w - 3), ty = rng.int(room.y + 2, room.y + room.h - 3);
      if (tiles[ty * W + tx] !== T.FLOOR) continue;
      props.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, kind: 'heal' });
      return;
    }
  });

  const start = { x: (rooms[0].x + rooms[0].w / 2) * TILE, y: (rooms[0].y + rooms[0].h / 2) * TILE };
  // You do not wake on the altar. You wake in the pen beside it, and the pen is only bars.
  if (levelDef.startCage) props.push(...buildCage(start.x, start.y));
  if (!reachable(tiles, W, H, Math.floor(start.x / TILE), Math.floor(start.y / TILE), last.x + last.w - 1, doorY)) return null;

  // Safety: nothing spawns within 5 tiles of the start, and the start room keeps no props underfoot.
  const filtered = spawns.filter((s) => len(s.x - start.x, s.y - start.y) > 5 * TILE);
  const cleanProps = props.filter((p) => p.kind === 'door' || p.kind === 'cage' || len(p.x - start.x, p.y - start.y) > 3 * TILE);
  // The level's own hint goes above the pen; the pen's own prompt goes below it.
  const hints = levelDef.hint ? [{ x: start.x, y: start.y - 2.9 * TILE, text: levelDef.hint }] : [];
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
  return { W, H, tiles, rooms, spawns: filtered, props: cleanProps, start, exit, seed, def: levelDef, hints, controls, cagePrompt };
}

// A ring of iron bars around the start. One headbutt anywhere on it brings the whole thing down.
function buildCage(cx, cy) {
  const C = TUNING.prop.cage, out = [];
  const hw = C.halfW * TILE, hh = C.halfH * TILE;
  const nx = Math.max(2, Math.round(hw * 2 / C.spacing)), ny = Math.max(2, Math.round(hh * 2 / C.spacing));
  for (let i = 0; i <= nx; i++) {
    const x = cx - hw + (i / nx) * hw * 2;
    out.push({ x, y: cy - hh, kind: 'cage', axis: 'h' });
    out.push({ x, y: cy + hh, kind: 'cage', axis: 'h' });
  }
  for (let j = 1; j < ny; j++) {
    const y = cy - hh + (j / ny) * hh * 2;
    out.push({ x: cx - hw, y, kind: 'cage', axis: 'v' });
    out.push({ x: cx + hw, y, kind: 'cage', axis: 'v' });
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
