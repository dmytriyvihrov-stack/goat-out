// Level generation: a chain of template rooms joined by 2-wide corridors, trending up-right.
const T = { FLOOR: 0, WALL: 1, HAY: 2, ASH: 3, EXIT: 4 };

function flipTemplate(tpl, rng) {
  let rows = tpl.rows.slice();
  if (rng.chance(0.5)) rows = rows.slice().reverse();
  if (rng.chance(0.5)) rows = rows.map((r) => r.split('').reverse().join(''));
  return { name: tpl.name, rows };
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
  const pool = rng.shuffle(ROOM_TEMPLATES.slice());
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
      const door = carveCorridor(tiles, W, rooms[i - 1], room, rng);
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

  // Props and enemy spawns from markers, with a per-room budget.
  rooms.forEach((room) => {
    const enemyMarkers = [];
    room.markers.forEach((m) => {
      const px = (m.tx + 0.5) * TILE, py = (m.ty + 0.5) * TILE;
      if (m.c === 'B') props.push({ x: px, y: py, kind: 'brazier' });
      else if (m.c === 'o') props.push({ x: px, y: py, kind: 'pot' });
      else if (m.c === 'b') props.push({ x: px, y: py, kind: 'bell' });
      else if (m.c === 'L') props.push({ x: px, y: py, kind: 'lamp' });
      else if (m.c === 't') { if (m.tx % 2 === 0 && m.ty % 2 === 0) props.push({ x: px + TILE / 2, y: py + TILE / 2, kind: 'table' }); }
      else if (m.c === 'M') props.push({ x: px, y: py, kind: 'mill', phase: rng.float(0, Math.PI * 2) });
      else if (m.c === 'X') {
        const boss = (room.arena && room.arena.boss) || 'butcher';
        spawns.push({ x: px, y: py, kind: boss, elite: boss !== 'butcher', boss: true });
      }
      else enemyMarkers.push(m);
    });
    // The pen room, and the two rooms with the controls painted on the floor, stay empty.
    if (room.index === 0 || room.calm) return;
    const budget = room.isHall ? (levelDef.hallBudget || 12)
      : room.isGallery ? enemyMarkers.length
      : levelDef.budget(room.index);
    rng.shuffle(enemyMarkers);
    // Add extra random floor positions so a room can exceed the men its template marks.
    const want = Math.max(0, budget - enemyMarkers.length);
    const extra = [];
    for (let k = 0; k < want * 8 && extra.length < want; k++) {
      const tx = rng.int(room.x + 1, room.x + room.w - 2), ty = rng.int(room.y + 1, room.y + room.h - 2);
      if (tiles[ty * W + tx] === T.FLOOR) extra.push({ tx, ty, c: rng.chance(0.35) ? 'r' : 'e' });
    }
    const all = enemyMarkers.concat(extra).slice(0, budget);
    const ranged = levelDef.ranged || 'none';
    // One mage to a room at most, and none at all until the level is a few rooms old. Two of them
    // painting the same floor is not a fight, it is a coin toss.
    const seerOk = room.index >= (levelDef.seerFrom === undefined ? 0 : levelDef.seerFrom);
    let seersHere = 0;
    all.forEach((m) => {
      let kind = 'bearer';
      if ((m.c === 'r' || m.c === 'm' || m.c === 'R') && ranged !== 'none') {
        const plainB = ranged === 'seer' ? 'bearer' : 'hunter';   // what he is when he cannot be a mage
        if (m.c === 'R') kind = plainB;                           // a post that is always a rifle
        else if ((m.c === 'm' || rng.chance(levelDef.seerShare || 0)) && seerOk && seersHere < (levelDef.seerPerRoom || 1)) {
          kind = 'seer'; seersHere++;
        } else kind = plainB;
      }
      spawns.push({ x: (m.tx + 0.5) * TILE, y: (m.ty + 0.5) * TILE, kind, roomIndex: room.index });
    });
  });

  // Lone rifle posts. A rifle on its own is a different problem from a rifle inside a crowd:
  // you have to cross its line rather than out-run the pile it is standing in.
  if (levelDef.lonePosts && (levelDef.ranged === 'both' || levelDef.ranged === 'hunter')) {
    const eligible = rng.shuffle(rooms.filter((r) => r.index > 1 && !r.arena && !r.isMill && !r.calm && !r.isGallery));
    let placed = 0;
    for (const room of eligible) {
      if (placed >= levelDef.lonePosts) break;
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

// Carves an S-shaped 2-wide corridor and returns a sensible spot for a door.
function carveCorridor(tiles, W, a, b, rng) {
  const yA = pickDoorY(a, 'right', rng);
  const yB = pickDoorY(b, 'left', rng);
  if (yA < 0 || yB < 0) return null;
  const xA = a.x + a.w - 1, xB = b.x;
  const midX = Math.floor((xA + xB) / 2);
  const carve = (tx, ty) => { if (tx >= 0 && tx < W) tiles[ty * W + tx] = T.FLOOR; };
  for (let tx = xA; tx <= midX + 1; tx++) { carve(tx, yA); carve(tx, yA + 1); }
  const y0 = Math.min(yA, yB), y1 = Math.max(yA, yB) + 1;
  for (let ty = y0; ty <= y1; ty++) { carve(midX, ty); carve(midX + 1, ty); }
  for (let tx = midX; tx <= xB; tx++) { carve(tx, yB); carve(tx, yB + 1); }
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
