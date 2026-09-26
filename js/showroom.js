// THE SHOWROOM (dev only, `#showroom` or SHOWROOM in the dev drawer). Not a level of the run: one
// hand-laid floor with every object the game stands on a floor, each under its own name, and then a
// room in each floor's own stone — its floor sheet, its walls, its colours and the furniture its canon
// is built out of — one after another, THE ALTAR to THE DARK. It is for looking at the art and the
// props side by side, so nothing here is rolled, nobody is spawned (the drawer's SPAWN column is for
// that) and no rule in `GEN_RULES` is asked of it. Floors read their stone per tile off `zones`
// (`PaintedArt.drawTiles`); the round cave and the dark's lighting are level-wide and are not here.
const SHOWROOM_LEVEL = {
  name: 'THE SHOWROOM', sub: 'Dev', rooms: 10, showroom: true,
  canon: { id: 'stone', name: 'STONE', idea: 'Everything, once.' },
  theme: 'Every object and every floor of the game in one place.',
  souls: 0, heals: 0, gates: [], arenas: [],
  hint: null, hintKey: null,
};

function showroomLevel(def, seed) {
  const W = 420, H = 78, tiles = new Uint8Array(W * H).fill(T.WALL), zones = new Uint8Array(W * H);
  const floors = [...LEVELS, DARK_LEVEL];
  // The level's own look is THE ALTAR's; every other floor is a zone.
  for (const k of ['floor', 'floorAlt', 'wall', 'wallTop', 'fog']) def[k] = LEVELS[0][k];
  def.met = new Set(Object.keys(THREAT)); def.known = new Set(floors.map((d) => d.canon && d.canon.id).filter(Boolean));
  const rooms = [], props = [], hints = [], grass = [], windows = new Set();
  const at = (x, y) => y * W + x, P = (tx, ty) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
  const put = (kind, tx, ty, opts) => props.push(Object.assign(P(tx, ty), { kind }, opts || {}));
  const label = (text, tx, ty, w, big) => hints.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, text, w: (w || 4) * TILE, size: big ? 26 : 12, a: big ? 0.34 : 0.42 });
  const zone = (x0, y0, x1, y1, z) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) zones[at(x, y)] = z; };
  const fill = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[at(x, y)] = t; };
  const room = (x, y, w, h, name, z) => {
    fill(x + 1, y + 1, x + w - 2, y + h - 2, T.FLOOR);
    zone(x - 1, y - 1, x + w, y + h, z);
    const r = { x, y, w, h, index: rooms.length, markers: [], role: 'mix', seen: true, drawn: false, name,
      tpl: { name, rows: [] } };
    rooms.push(r); return r;
  };

  // The hall: everything the game stands on a floor, in rows by what it is to the goat.
  const hall = room(2, 22, 46, 28, 'showroom hall', 0);
  const hx = hall.x + 1, hy = hall.y + 1;
  label('THE SHOWROOM', hx + 22, hy + 2.4, 30, true);
  const row = (y, head, list) => {
    label(head, hx + 1.5, y, 6);
    list.forEach(([name, fn], i) => { const tx = hx + 7 + i * 4.4 | 0; fn(tx, y); label(name, tx, y + 1.3, 4); });
  };
  row(hy + 5, 'STANDS', [
    ['BRAZIER', (x, y) => put('brazier', x, y)], ['ROAST', (x, y) => put('brazier', x, y, { roast: true })],
    ['LAMP', (x, y) => put('lamp', x, y)], ['TABLE', (x, y) => put('table', x, y)],
    ['ALTAR', (x, y) => put('table', x, y, { altar: true })], ['GONG', (x, y) => put('bell', x, y)],
    ['BARREL', (x, y) => put('barrel', x, y)], ['BOULDER', (x, y) => put('rock', x, y)],
  ]);
  row(hy + 10, 'LIFTED', [
    ['CRATE', (x, y) => put('crate', x, y)], ['BOMB', (x, y) => put('bomb', x, y)],
    ['SWORD', (x, y) => put('weapon', x, y, { weapon: 'sword' })], ['SHIELD', (x, y) => put('weapon', x, y, { weapon: 'shield' })],
    ['MILK', (x, y) => put('heal', x, y)], ['BIG GRASS', (x, y) => put('heal', x, y, { big: true })],
    ['SHROOMS', (x, y) => put('shrooms', x, y)], ['WHEEL', (x, y) => put('mill', x + 1, y, { phase: 0 })],
  ]);
  row(hy + 15, 'FLOOR', [
    ['GRATING', (x, y) => { put('spike', x, y); put('spike', x + 1, y); }], ['SPIRE', (x, y) => put('spire', x, y)],
    ['STRAW', (x, y) => fill(x, y, x + 1, y, T.HAY)], ['ASH', (x, y) => fill(x, y, x + 1, y, T.ASH)],
    ['GRASS', (x, y) => { for (let dx = 0; dx < 3; dx++) for (let dy = -1; dy <= 0; dy++) grass.push(at(x + dx - 1, y + dy)); }],
    ['DROP', (x, y) => fill(x, y - 1, x + 1, y, T.PIT)],
    ['CAGE', (x, y) => props.push(...buildCage((x + 0.5) * TILE, (y - 0.3) * TILE, 0.8, 0.7, true))],
  ]);
  row(hy + 21, 'COOPS', ['chicken', 'tortoise', 'goose', 'crow', 'horse'].map((k) =>
    [k === 'chicken' ? 'HEN' : k.toUpperCase(), (x, y) => put('coop', x, y, { holds: k, beastRoom: 0 })]));
  // The doors, each at the mouth of a blind alcove in the hall's far wall, so none of them is in the way.
  const doors = [['PLANK', {}], ['IRON', { iron: true }], ['STAIRS', { iron: true, stair: true }],
    ['VAULT', { iron: true, vault: true }], ['SOUL GATE', { iron: true, gate: true }], ['SEAL', { iron: true, seal: true }]];
  doors.forEach(([name, o], i) => {
    const x = hx + 3 + i * 7, wy = hall.y;
    fill(x, wy - 3, x + 1, wy, T.FLOOR); zone(x - 1, wy - 4, x + 2, wy, 0);
    props.push(Object.assign({ x: (x + 1) * TILE, y: (wy + 0.5) * TILE, kind: 'door', vertical: false }, o));
    label(name, x + 0.5, wy + 1.4, 5);
  });
  // A wall that gives, in the near wall, with its niche behind it (walled up again by `startLevel`).
  {
    const tx = hx + 36, wr = hall.y + hall.h - 1;
    fill(tx, wr, tx, wr, T.FLOOR); fill(tx, wr + 1, tx + 1, wr + 1, T.FLOOR); zone(tx - 1, wr, tx + 2, wr + 2, 0);
    put('secret', tx, wr, { wallColor: def.wall, wallTop: def.wallTop, wallSide: 'down', nicheTiles: [at(tx, wr), at(tx, wr + 1), at(tx + 1, wr + 1)] });
    put('heal', tx, wr + 1, { big: true }); put('weapon', tx + 1, wr + 1, { weapon: 'sword' });
    label('A WALL THAT GIVES', tx + 0.5, wr - 1.2, 6);
  }

  // One room a floor, in run order, each in its own stone with what its canon is built out of.
  const RW = 24, RH = 16, ry = 28, mid = ry + RH / 2 - 1;
  let prev = hall;
  const dress = [
    // THE ALTAR — stone: bowls of coals, tables, straw and the altar.
    (x, y) => { put('brazier', x + 4, y + 3); put('brazier', x + 17, y + 11); put('table', x + 8, y + 10); put('table', x + 10, y + 10);
      put('table', x + 15, y + 3, { altar: true }); fill(x + 1, y + 11, x + 4, y + 12, T.HAY); put('weapon', x + 19, y + 3, { weapon: 'sword' }); },
    // THE YARD — fire: bowls, powder, crates and the gong.
    (x, y) => { put('brazier', x + 5, y + 3, { roast: true }); put('brazier', x + 16, y + 11); put('brazier', x + 11, y + 3);
      put('barrel', x + 3, y + 10); put('barrel', x + 4, y + 11); put('barrel', x + 18, y + 4);
      put('crate', x + 8, y + 11); put('crate', x + 9, y + 11); put('crate', x + 14, y + 4); put('bell', x + 19, y + 8); },
    // THE CAVE — the hollow: grass, boulders, teeth at the wall, the mushrooms.
    (x, y) => { for (let dx = 2; dx < 9; dx++) for (let dy = 8; dy < 12; dy++) grass.push(at(x + dx, y + dy));
      put('rock', x + 14, y + 3); put('rock', x + 16, y + 4); put('rock', x + 13, y + 5);
      for (const dx of [4, 8, 18]) put('spire', x + dx, y); put('shrooms', x + 18, y + 10); put('heal', x + 11, y + 11); },
    // THE ROAD — the line: two rows of pillars, lamps, a band of grating.
    (x, y) => { for (let dx = 3; dx < 20; dx += 4) { tiles[at(x + dx, y + 3)] = T.WALL; tiles[at(x + dx, y + 10)] = T.WALL; }
      put('lamp', x + 1, y + 1); put('lamp', x + 20, y + 12); for (let dx = 7; dx < 15; dx++) put('spike', x + dx, y + 12); put('crate', x + 16, y + 1); },
    // THE THRESHING FLOOR — open ground: the wheel in the middle of nothing, straw, powder.
    (x, y) => { put('mill', x + 11, y + 4, { phase: 1 }); fill(x + 2, y + 10, x + 6, y + 12, T.HAY); fill(x + 16, y + 1, x + 20, y + 2, T.HAY);
      put('barrel', x + 18, y + 11); put('crate', x + 3, y + 2); },
    // THE BRIDGE — the funnel: a drop the width of the room and one way over it.
    (x, y) => { fill(x + 8, y, x + 13, y + RH - 3, T.PIT); fill(x + 8, mid, x + 13, mid + 2, T.FLOOR);
      put('lamp', x + 6, mid - 2); put('lamp', x + 15, mid + 2); put('weapon', x + 3, y + 2, { weapon: 'shield' }); },
    // THE RAFTERS — the drop: holes in the boards and windows in the far wall.
    (x, y) => { fill(x + 4, y + 2, x + 5, y + 3, T.PIT); fill(x + 15, y + 10, x + 17, y + 11, T.PIT); fill(x + 10, y + 11, x + 11, y + 12, T.PIT);
      for (const wx of [x + 3, x + 12]) for (let k = 0; k < 4; k++) { tiles[at(wx + k, y - 1)] = T.PIT; windows.add(at(wx + k, y - 1)); }
      put('crate', x + 19, y + 2); put('barrel', x + 2, y + 11); },
    // THE OSSUARY — the niche: the walls stepped into alcoves, stands of arms in them.
    (x, y) => { for (let dx = 1; dx < 22; dx += 4) { fill(x + dx, y, x + dx, y + 1, T.WALL); fill(x + dx, y + RH - 4, x + dx, y + RH - 3, T.WALL); }
      put('weapon', x + 3, y, { weapon: 'sword' }); put('weapon', x + 11, y + RH - 3, { weapon: 'shield' }); put('heal', x + 19, y); put('brazier', x + 11, y + 5); },
    // THE DARK — the lamp: standing lamps, lanterns on the wall, straw.
    (x, y) => { put('lamp', x + 4, y + 3); put('lamp', x + 17, y + 10); put('lamp', x + 11, y + 11);
      put('sconce', x + 6, y, { wx: 0, wy: -1 }); put('sconce', x + 16, y, { wx: 0, wy: -1 }); fill(x + 1, y + 1, x + 3, y + 2, T.HAY); },
  ];
  floors.forEach((fd, i) => {
    const x = hall.x + hall.w + 4 + i * (RW + 4), r = room(x, ry, RW, RH, fd.name.toLowerCase(), i);
    r.role = 'canon';
    // The way in from the room before: three tiles tall, in the zone of the room it leaves.
    fill(prev.x + prev.w - 1, mid, x, mid + 2, T.FLOOR); zone(prev.x + prev.w, mid - 1, x - 1, mid + 3, i);
    const ix = x + 1, iy = ry + 1;
    dress[i](ix, iy);
    label(fd.name + (fd.canon ? ' · ' + fd.canon.name : ''), ix + 11, iy + 2, RW - 2, true);
    prev = r;
  });
  // A corridor must never be dressed over: a floor-wide drop or a pillar may have landed across it.
  for (const r of rooms.slice(1)) fill(r.x, mid, r.x + 3, mid + 2, T.FLOOR);
  for (const r of rooms.slice(1)) fill(r.x + r.w - 4, mid, r.x + r.w - 1, mid + 2, T.FLOOR);

  // The way out: THE DARK's far wall, a flight of stairs behind its iron door, like every floor.
  const last = rooms[rooms.length - 1], ey = mid;
  fill(last.x + last.w - 1, mid, last.x + last.w - 1, mid + 2, T.WALL);
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) tiles[at(last.x + last.w - 1 + dx, ey + dy)] = T.EXIT;
  zone(last.x + last.w - 1, ey - 1, last.x + last.w + 3, ey + 2, floors.length - 1);
  props.push({ x: (last.x + last.w - 1.5) * TILE, y: (ey + 1) * TILE, kind: 'door', vertical: true, iron: true, stair: true, fromRoom: last.index });

  return { W, H, tiles, rooms, spawns: [], props, start: P(hx + 2, hy + 13), exit: { x: (last.x + last.w) * TILE, y: (ey + 1) * TILE },
    exitTile: { x0: last.x + last.w - 1, y0: ey }, forkTile: null, entry: null, seed, def,
    hints, controls: [], cagePrompt: null, vault: null, windows, plan: null, gates: [], sealedArenas: [], shop: null,
    grass: grass.filter((i) => tiles[i] === T.FLOOR), zones, zoneDefs: floors };
}
