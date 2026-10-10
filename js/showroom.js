// THE SHOWROOM (dev only, `#showroom` or SHOWROOM in the dev drawer). Not a level of the run: one
// hand-laid floor with every object the game stands on a floor, each under its own name, and then a
// room in each floor's own stone, its floor sheet, its walls, its colours and the furniture its canon
// is built out of, one after another, THE ALTAR to THE DARK. It is for looking at the art and the
// props side by side, so nothing here is rolled, nobody is spawned (the drawer's SPAWN column is for
// that; each floor's gallery is figures only, `showroomStatues`) and no rule in `GEN_RULES` is asked of it.
// He walks it `TUNING.showroom.speed` times faster (entities.js, the stride).
// THE RULE (1 Oct 2026): anything new the game stands on a floor, a prop, an animal, a talisman, goes
// in here the day it is added. Every animal has a coop in the COOPS row, every talisman a stool on the
// shelf along the near wall (its top tier, free: grab one to wear it, grab another to swap), every cape
// folded on the floor beside it. Floors read their stone per tile off `zones`
// (`PaintedArt.drawTiles`); the round cave and the dark's lighting are level-wide and are not here.
const SHOWROOM_LEVEL = {
  name: 'THE SHOWROOM', sub: 'Dev', rooms: 10, showroom: true,
  canon: { id: 'stone', name: 'STONE', idea: 'Everything, once.' },
  theme: 'Every object and every floor of the game in one place.',
  souls: 0, heals: 0, gates: [], arenas: [],
  hint: null, hintKey: null,
};
// What each kind is called under his figure in a floor's gallery (the names the game's own text uses).
const SHOWROOM_NAMES = { bearer: 'CLUBMAN', champion: 'BUTCHER', dog: 'HOUND', seer: 'MAGE', hunter: 'RIFLEMAN', butcher: 'OGRE',
  shield: 'SHIELDMAN', thrower: 'THROWER', shaman: 'SHAMAN', wraith: 'WRAITH' };
// The galleries' figures (8 Oct 2026): each a man built the way `startLevel` builds a spawn, then kept as
// `level.statueMen` and never handed to `game.enemies`, so nothing steps, sees, reaches, hurts or counts
// him (no kill, soul, seal or clamp waits on him); `Renderer` stands them with the cast, facing the camera,
// and `PaintedArt.character` leaves them out of the men's idle breathing (`e.statue`).
function showroomStatues(level) {
  return (level.statues || []).map((s) => {
    const e = new Enemy(s.x, s.y, s.kind);
    if (s.champion) { e.champion = true; e.hp = e.maxHp = TUNING.champion.hp; }
    if (s.shield) e.giveShield();
    if (s.thrower) Thrower.give(e);
    if (s.shaman) Shaman.give(e);
    if (s.warden) { e.warden = true; e.pose = 'idle'; }   // THE WARDEN (js/warden-pixels.js), the last floor's gallery
    e.statue = true; e.room = -1; e.facing = Math.PI / 2; e.solid = true;   // a wraith in his body, not his mist
    if (e.shield) e.shield.ang = e.facing;
    return e;
  });
}

function showroomLevel(def, seed) {
  const W = 420, H = 78, tiles = new Uint8Array(W * H).fill(T.WALL), zones = new Uint8Array(W * H);
  const floors = [...LEVELS, DARK_LEVEL];
  // The level's own look is THE ALTAR's; every other floor is a zone.
  for (const k of ['floor', 'floorAlt', 'wall', 'wallTop', 'fog']) def[k] = LEVELS[0][k];
  def.met = new Set(Object.keys(THREAT)); def.known = new Set(floors.map((d) => d.canon && d.canon.id).filter(Boolean));
  const rooms = [], props = [], hints = [], grass = [], windows = new Set(), chasms = [], gaps = new Set(), controls = [];
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
  const hall = room(2, 22, 46, 33, 'showroom hall', 0);
  const hx = hall.x + 1, hy = hall.y + 1;
  label('THE SHOWROOM', hx + 22, hy + 2.4, 30, true);
  controls.push({ x: (hx + 22) * TILE, y: (hy + 3.7) * TILE, w: 18 * TILE, part: 6 });   // ALT - STEALTH MODE, as THE YARD teaches it (stealth is live here)
  const row = (y, head, list, gap = 4.4) => {
    label(head, hx + 1.5, y, 6);
    list.forEach(([name, fn], i) => { const tx = hx + 7 + i * gap | 0; fn(tx, y); label(name, tx, y + 1.3, 4); });
  };
  row(hy + 5, 'STANDS', [
    ['BRAZIER', (x, y) => put('brazier', x, y)], ['WITCH BOWL', (x, y) => put('brazier', x, y, { witch: true })], ['ROAST', (x, y) => put('brazier', x, y, { roast: true })],
    ['LAMP', (x, y) => put('lamp', x, y)], ['TABLE', (x, y) => put('table', x, y)],
    ['ALTAR', (x, y) => { put('poster', x, y, { look: 'breeds' }); put('table', x, y, { altar: true }); }],   // a scrap under it, as on THE ALTAR ['GONG', (x, y) => put('bell', x, y)],
    ['BARREL', (x, y) => put('barrel', x, y)], ['BOULDER', (x, y) => put('rock', x, y)],
    ['PLATTER', (x, y) => { put('table', x, y); put('platter', x, y - 0.15); }],   // THE LAST SUPPER's covered dish (js/endboss.js)
  ]);
  row(hy + 10, 'LIFTED', [
    ['CRATE', (x, y) => put('crate', x, y)], ['BOMB', (x, y) => put('bomb', x, y)],
    ['SWORD', (x, y) => put('weapon', x, y, { weapon: 'sword' })], ['SHIELD', (x, y) => put('weapon', x, y, { weapon: 'shield' })],
    ['MILK', (x, y) => put('heal', x, y)], ['BIG GRASS', (x, y) => put('heal', x, y, { big: true })],
    ['SHROOMS', (x, y) => put('shrooms', x, y)], ['WHEEL', (x, y) => put('mill', x + 1, y, { phase: 0 })],
  ]);
  // The chandelier, its rope tied off at a cleat on the far wall straight above it (gen.js), and a
  // barrel of poison beside the red one's row.
  put('chandelier', hx + 42, hy + 3, { cid: 0 }); props.push({ x: (hx + 42.5) * TILE, y: (hall.y + 1.25) * TILE, kind: 'cleat', cid: 0 });
  label('CHANDELIER', hx + 42, hy + 4.6, 5);
  put('barrel', hx + 42, hy + 10, { toxic: true }); label('POISON BARREL', hx + 42, hy + 11.3, 5);
  row(hy + 15, 'FLOOR', [
    ['GRATING', (x, y) => { put('spike', x, y); put('spike', x + 1, y); }], ['SPIRE', (x, y) => put('spire', x, y)],
    // A grate with a crate set on it (30 Sep 2026): startLevel pairs the cover by its tile.
    ['HIDDEN GRATE', (x, y) => { put('spike', x, y, { hidden: true }); put('crate', x, y); }],
    ['STRAW', (x, y) => fill(x, y, x + 1, y, T.HAY)], ['ASH', (x, y) => fill(x, y, x + 1, y, T.ASH)],
    ['GRASS', (x, y) => { for (let dx = 0; dx < 3; dx++) for (let dy = -1; dy <= 0; dy++) grass.push(at(x + dx - 1, y + dy)); }],
    ['DROP', (x, y) => fill(x, y - 1, x + 1, y, T.PIT)],
    ['CAGE', (x, y) => props.push(...buildCage((x + 0.5) * TILE, (y - 0.3) * TILE, 0.8, 0.7, true))],
  ]);
  // The supper (2 Oct 2026, the meat): tables laid by hand (`dishes`, laid by `Scatter.lay` in startLevel)
  // along a runner with a stain on it, and a rug of each of the other weaves (`layCarpets`, `PaintedArt.carpet`).
  // No word is written on a rug (5 Oct 2026): the runner is the tables' own row, the rugs two rows, both
  // clear of the names above (the row before) and below (the dishes, CARPETS). `GEN_RULES.carpets`.
  const carpets = [{ x: hx + 5, y: hy + 18, w: 17, h: 1, style: 0, seed: 11, blood: true },
    { x: hx + 25, y: hy + 18, w: 4, h: 2, style: 1, seed: 22 }, { x: hx + 30, y: hy + 18, w: 4, h: 2, style: 2, seed: 33, blood: true },
    { x: hx + 35, y: hy + 18, w: 2, h: 2, style: 3, seed: 44 }];
  row(hy + 18, 'SUPPER', [
    ['ROAST · STEW', (x, y) => put('table', x, y, { dishes: ['roast', 'stew'] })],
    ['BOAR · LINKS', (x, y) => put('table', x, y, { dishes: ['boarhead', 'sausage'] })],
    ['RIBS · HOCK', (x, y) => put('table', x, y, { dishes: ['ribs', 'haunch'] })],
    ['THE REST', (x, y) => put('table', x, y, { dishes: ['leg', 'bread', 'cheese', 'jug'] })],
  ]);
  label('CARPETS', hx + 31, hy + 20.3, 8);
  // The fish has no coop: its tank stands on the floor as it would on a level (6 Oct 2026).
  row(hy + 21, 'COOPS', ['chicken', 'tortoise', 'goose', 'crow', 'horse', 'pig', 'rabbit', 'husky', 'fish'].map((k) =>
    [k === 'chicken' ? 'HEN' : k.toUpperCase(), (x, y) => (k === 'fish' ? put('fish', x, y, { beastRoom: 0 }) : put('coop', x, y, { holds: k, beastRoom: 0 }))]), 3.9);
  // Every talisman on a stool at its top tier, two rows along the near wall: a shelf of no shop (`shopId`
  // < 0, so no dialog opens) where every stool is his (`free`): grab one to wear it (up to three), another
  // to swap. Beside them every cape lying folded on the floor as a niche leaves it (`Cape.lay`), its name under it.
  label('TALISMANS · GRAB TO WEAR', hx + 14, hy + 24.6, 14);
  ARTIFACTS.forEach((a, i) => {
    const per = Math.ceil(ARTIFACTS.length / 2), r = Math.floor(i / per), c = i % per;
    put('ware', hx + 2 + Math.round(c * 25 / (per - 1)), hy + 26 + r * 3, { shopId: -9, free: true, ware: { id: a.id, tier: 1 } });
  });
  label('CAPES · GRAB TO WEAR · Q', hx + 36, hy + 24.6, 14);
  CAPES.forEach((c, i) => {
    const tx = hx + 30 + i * 3, ty = hy + 26 + (i % 2) * 3;
    put('cape', tx, ty, { capeId: c.id }); label(c.name, tx, ty + 1.3, 4);
  });
  // The doors, each at the mouth of a blind alcove in the hall's far wall, so none of them is in the way.
  const doors = [['PLANK', {}], ['IRON', { iron: true }], ['STAIRS', { iron: true, stair: true }],
    ['VAULT', { iron: true, vault: true }], ['SOUL GATE', { iron: true, gate: true }], ['SEAL', { iron: true, seal: true }],
    ['EXIT GATE', { iron: true, stair: true, gate: true, exitGate: true }]];   // the stairs' own bar, lifted by the last boss's soul on a real floor
  doors.forEach(([name, o], i) => {
    const x = hx + 2 + i * 6, wy = hall.y;
    fill(x, wy - 3, x + 1, wy, T.FLOOR); zone(x - 1, wy - 4, x + 2, wy, 0);
    props.push(Object.assign({ x: (x + 1) * TILE, y: (wy + 0.5) * TILE, kind: 'door', vertical: false }, o));
    label(name, x + 0.5, wy + 1.4, 5);
  });
  // The wall's dressing, between the alcoves: a suit of armour and a stag's head (gen.js `dressWall`).
  for (const [kind, tx, name] of [['armor', hx + 6, 'ARMOUR'], ['trophy', hx + 11, 'STAG\'S HEAD']]) {
    props.push(Object.assign(dressPoint(kind, tx, hy, 'n'), { kind, side: 'n' }));
    label(name, tx, hy + 1.6, 5);
  }
  // The cult's paper (6 Oct 2026): two scraps folded on the floor that open as he walks up and tear under a butt,
  // the goat-breeds chart and the butcher's diagram (a third lies under the ALTAR in the STANDS row).
  for (const [look, tx, name] of [['breeds', hx + 17, 'PAPER: BREEDS'], ['cuts', hx + 23, 'PAPER: CUTS']]) {
    put('poster', tx, hy + 2, { look });
    label(name, tx, hy + 3.2, 5);
  }
  // The suit on its stand, out in the hall, a step off the wall's dressing.
  put('suit', hx + 13, hy + 8); label('STANDING SUIT', hx + 13, hy + 9.8, 5);
  // The mouse and her pail (gen.js: she sits in a hole at a gate room's wall; the dev drawer's `spawnShop` lays one on the floor
  // the same way): a shelf of one offer, the pail, with a shopId of its own so the talismans' free shelf is left alone.
  put('mouse', hx + 42, hy + 18, { shopId: -10, gap: { x: (hx + 42.5) * TILE, y: (hy + 18.5) * TILE - 18 }, wallSide: 'up' }); label('THE MOUSE', hx + 42, hy + 16.8, 5);
  put('ware', hx + 42, hy + 20, { shopId: -10, ware: { id: 'milk', tier: 1 } }); label('HER PAIL', hx + 42, hy + 21.3, 5);
  // A wall that gives, in the near wall, with its niche behind it (walled up again by `startLevel`).
  {
    const tx = hx + 36, wr = hall.y + hall.h - 1;   // the near wall, under the shelf
    fill(tx, wr, tx, wr, T.FLOOR); fill(tx, wr + 1, tx + 1, wr + 1, T.FLOOR); zone(tx - 1, wr, tx + 2, wr + 2, 0);
    put('secret', tx, wr, { wallColor: def.wall, wallTop: def.wallTop, wallSide: 'down', nicheTiles: [at(tx, wr), at(tx, wr + 1), at(tx + 1, wr + 1)] });
    put('heal', tx, wr + 1, { big: true }); put('weapon', tx + 1, wr + 1, { weapon: 'sword' });
    label('A WALL THAT GIVES', tx + 0.5, wr - 1.2, 6);
  }
  // The secret inside the secret (gen.js `carveDeepSecret`): a second wall at the niche's back, on its
  // right tile, its own tile in the first niche's list so it stays rock until the first one is down.
  {
    const tx = hx + 28, wr = hall.y + hall.h - 1, dw = at(tx + 1, wr + 2);
    fill(tx, wr, tx, wr, T.FLOOR); fill(tx, wr + 1, tx + 1, wr + 1, T.FLOOR); fill(tx + 1, wr + 2, tx + 1, wr + 2, T.FLOOR);
    fill(tx + 1, wr + 3, tx + 2, wr + 3, T.FLOOR); zone(tx - 1, wr, tx + 3, wr + 4, 0);
    put('secret', tx, wr, { wallColor: def.wall, wallTop: def.wallTop, wallSide: 'down', nicheTiles: [at(tx, wr), at(tx, wr + 1), at(tx + 1, wr + 1), dw] });
    put('weapon', tx + 1, wr + 1, { weapon: 'shield' });
    put('secret', tx + 1, wr + 2, { deep: true, wallColor: def.wall, wallTop: def.wallTop, wallSide: 'down', nicheTiles: [dw, at(tx + 1, wr + 3), at(tx + 2, wr + 3)] });
    put('heal', tx + 1, wr + 3, { big: true }); put('cape', tx + 2, wr + 3);
    label('TWO WALLS THAT GIVE', tx + 0.5, wr - 1.2, 6);
  }

  // One room a floor, in run order, each in its own stone with what its canon is built out of. Small on
  // purpose (8 Oct 2026 playtest: "I want to look at each level's assets, not run through them whole"): the
  // floor's furniture in the top half, and its gallery in the bottom one (below). The interior is 14 x 13;
  // the way through is rows 4-6 (`mid`, the hall's door row), kept clear at both ends.
  const RW = 16, RH = 15, ry = 30, mid = ry + 5;
  let sacrifice = null;
  let prev = hall;
  const dress = [
    // THE ALTAR, stone: bowls of coals, tables, straw and the altar.
    (x, y) => { put('brazier', x + 1, y + 1); put('brazier', x + 12, y + 1); put('table', x + 5, y + 5); put('table', x + 7, y + 5);
      put('table', x + 8, y + 2, { altar: true }); fill(x, y + 3, x + 3, y + 3, T.HAY); put('weapon', x + 12, y + 3, { weapon: 'sword' }); },
    // THE YARD, fire: bowls, powder, crates and the gong.
    // The iron pair stands in the room's middle row, so its own words (`Renderer.drawIronPair`) fall in the gap
    // above the gallery and never across the furniture.
    (x, y) => { put('brazier', x + 1, y + 1, { roast: true }); put('brazier', x + 12, y + 1); put('brazier', x + 9, y + 3);
      put('barrel', x + 4, y + 1); put('barrel', x + 5, y + 1); put('barrel', x + 2, y + 3);
      put('crate', x + 7, y + 1); put('crate', x + 8, y + 1); put('crate', x + 3, y + 3); put('bell', x + 10, y + 1);
      // THE KEYS (3 Oct 2026, `TUNING.keys`), on the first floor that may stand iron: the pair, an animal
      // and big grass behind bars only a key opens, and two keys to try them with.
      put('coop', x + 3, y + 5, { holds: 'goose', beastRoom: 0, ironCage: true }); put('ironcage', x + 10, y + 5);
      put('key', x + 6, y + 3); put('key', x + 7, y + 3); label('KEYS', x + 6.5, y + 4.9, 3);   // under the words a first key says (`drawFirstWords`)
      // A boss's bell for the old man (7 Oct 2026, `Game.dropBell`): GRAB takes it (here it counts for nothing).
      put('lostbell', x + 12, y + 3, { note: 6 }); label('A BOSS BELL', x + 12, y + 4.2, 4); },
    // THE CAVE, the hollow: grass, boulders, teeth at the wall, the mushrooms, and THE CHASM across it, wall
    // to wall, with the roll written before it (6 Oct 2026, `carveChasm` in gen.js; an animal hops it).
    (x, y) => { for (let dx = 0; dx < 3; dx++) for (let dy = 1; dy < 4; dy++) grass.push(at(x + dx, y + dy));
      put('rock', x + 5, y + 2); put('rock', x + 6, y + 3); put('rock', x + 4, y + 3);
      { const c = x + 9, cut = []; for (let ty = y; ty <= y + RH - 3; ty++) { tiles[at(c, ty)] = T.PIT; cut.push(at(c, ty)); gaps.add(at(c, ty)); }
        chasms.push({ room: rooms.length - 1, axis: 'v', at: c, lo: y, hi: y + RH - 3, far: 1, tiles: cut, lesson: true });
        controls.push({ x: (x + 5) * TILE, y: (y + 5.5) * TILE, w: 7 * TILE, part: 5, chasm: rooms.length - 1 }); label('CHASM', c, y + 2.2, 3); }
      for (const dx of [2, 6, 12]) put('spire', x + dx, y); put('shrooms', x + 12, y + 2); put('heal', x + 11, y + 3);
      // THE SACRIFICE ALTAR (js/sacrifice.js): here six sockets only start it over
      sacrifice = Object.assign(P(x + 12, y + 5.5), { room: rooms.length - 1 }); label('THE SACRIFICE ALTAR', x + 12, y + 7.4, 6); },
    // THE ROAD, the line: two rows of pillars, lamps, a band of grating.
    (x, y) => { for (const dx of [4, 7, 10]) { tiles[at(x + dx, y + 1)] = T.WALL; tiles[at(x + dx, y + 6)] = T.WALL; }
      put('lamp', x + 1, y + 2); put('lamp', x + 12, y + 2); for (let dx = 4; dx < 11; dx++) put('spike', x + dx, y + 3); put('crate', x + 13, y + 1); },
    // THE THRESHING FLOOR, open ground: the wheel in the middle of nothing, straw, powder.
    (x, y) => { put('mill', x + 7, y + 3, { phase: 1 }); fill(x, y + 1, x + 2, y + 2, T.HAY); fill(x + 11, y + 1, x + 13, y + 2, T.HAY);
      put('barrel', x + 13, y + 3); put('crate', x, y + 3); },
    // THE BRIDGE, the funnel: a drop across the room's top half and one way over it, the way through.
    (x, y) => { fill(x + 5, y, x + 8, y + 7, T.PIT); fill(x + 5, mid, x + 8, mid + 2, T.FLOOR);
      put('lamp', x + 3, y + 2); put('lamp', x + 10, y + 3); put('weapon', x + 1, y + 1, { weapon: 'shield' }); },
    // THE RAFTERS, the drop: holes in the boards and windows in the far wall.
    (x, y) => { fill(x + 3, y + 1, x + 4, y + 2, T.PIT); fill(x + 9, y + 5, x + 10, y + 6, T.PIT); fill(x + 7, y + 2, x + 8, y + 3, T.PIT);
      for (const wx of [x + 1, x + 8]) for (let k = 0; k < 4; k++) { tiles[at(wx + k, y - 1)] = T.PIT; windows.add(at(wx + k, y - 1)); }
      put('crate', x + 12, y + 1); put('barrel', x, y + 3); },
    // THE OSSUARY, the niche: the walls stepped into alcoves, stands of arms in them.
    (x, y) => { for (const dx of [2, 6, 10]) fill(x + dx, y, x + dx, y + 1, T.WALL); for (const dx of [4, 8]) fill(x + dx, y + 5, x + dx, y + 6, T.WALL);
      put('weapon', x + 4, y, { weapon: 'sword' }); put('weapon', x + 6, y + 6, { weapon: 'shield' }); put('heal', x + 12, y); put('brazier', x + 7, y + 4); },
    // THE DARK, the lamp: standing lamps, lanterns on the wall, straw.
    (x, y) => { put('lamp', x + 3, y + 3); put('lamp', x + 10, y + 3); put('lamp', x + 7, y + 6);
      put('sconce', x + 4, y, { wx: 0, wy: -1 }); put('sconce', x + 9, y, { wx: 0, wy: -1 }); fill(x, y + 1, x + 2, y + 2, T.HAY); },
  ];
  // THE RULE (8 Oct 2026, the user's): each floor's room also stands a still figure of every kind of man that
  // floor can deal, his name under him: its crowd (`encounters.kinds`, the pseudo-kinds too) and the bosses of
  // its rings. They are `statues` (`showroomStatues`), never in `game.enemies`: nothing moves, notices,
  // strikes, is struck or counts. One row up to five, else two, across the room's bottom half.
  // The tall ones first, so a second row never stands over the names of the first.
  const TALL = ['butcher', 'thrower', 'champion'];
  const kindsOf = (fd) => { const E = fd.encounters || {};
    const ks = [...new Set([...(E.kinds || []), ...(E.introduce || []).map((n) => n[0]), ...(fd.arenas || []).map((a) => a.boss)])];
    return ks.filter((k) => TALL.includes(k)).sort((a, b) => TALL.indexOf(a) - TALL.indexOf(b)).concat(ks.filter((k) => !TALL.includes(k))); };
  const statues = [];
  const gallery = (ks, ix, iy) => {
    const rowsN = ks.length > 5 ? 2 : 1, per = Math.ceil(ks.length / rowsN);
    ks.forEach((k, n) => {
      const rr = Math.floor(n / per), m = Math.min(per, ks.length - rr * per), j = n - rr * per;
      let dx = m === 1 ? 6.5 : 0.5 + j * 12 / (m - 1); const dy = rowsN === 1 ? 9.6 : rr ? 11.4 : 8;
      // Never stood over a drop (THE CAVE's chasm runs wall to wall): stepped aside to the nearest floor.
      const clear = (d) => [-0.45, 0.45].every((o) => tiles[at(Math.floor(ix + d + 0.5 + o), Math.floor(iy + dy + 0.5))] === T.FLOOR);
      dx = [0, -1, 1, -1.5, 1.5].map((o) => dx + o).find(clear) ?? dx;
      statues.push(Object.assign(P(ix + dx, iy + dy), spawnKind(k)));
      label(SHOWROOM_NAMES[k] || k.toUpperCase(), ix + dx, iy + dy + 1, 3);
    });
  };
  floors.forEach((fd, i) => {
    const x = hall.x + hall.w + 4 + i * (RW + 4), r = room(x, ry, RW, RH, fd.name.toLowerCase(), i);
    r.role = 'canon';
    // The way in from the room before: three tiles tall, in the zone of the room it leaves.
    fill(prev.x + prev.w - 1, mid, x, mid + 2, T.FLOOR); zone(prev.x + prev.w, mid - 1, x - 1, mid + 3, i);
    const ix = x + 1, iy = ry + 1;
    dress[i](ix, iy);
    gallery(kindsOf(fd), ix, iy);
    // THE WARDEN stands in the last floor's gallery: the man at the head of its supper (js/endboss.js, js/warden-pixels.js).
    if (fd === LEVELS[LEVELS.length - 1]) { statues.push(Object.assign(P(ix + 13, iy + 4.6), { kind: 'bearer', warden: true })); label('THE WARDEN', ix + 13, iy + 5.6, 4); }
    label(fd.name + (fd.canon ? ' · ' + fd.canon.name : ''), ix + 6.5, iy + 0.5, RW - 2, true);
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

  // THE FLANK (7 Oct 2026, gen.js `flankAt`): the three trench rooms laid from their own templates in a second row under the
  // floors, a door out of the hall's far wall into the first. Spawn men into them from the dev drawer; HORNS there steps
  // the SHORT, BIG and LONG to see each one's wave on the floor.
  {
    const y0 = 47, names = ['ditchcut', 'ditchtee', 'ditchisland'], doorRows = [y0 + 4, y0 + 6];
    let prevR = hall, px0 = hall.x + hall.w + 4;
    names.forEach((nm, k) => {
      const tpl = ROOM_TEMPLATES.find((t) => t.name === nm), w = tpl.rows[0].length, h = tpl.rows.length;
      const r = room(px0, y0, w, h, nm, 2); r.role = 'canon';
      fill(prevR.x + prevR.w - 1, doorRows[0], px0, doorRows[1], T.FLOOR); zone(prevR.x + prevR.w, doorRows[0] - 1, px0 - 1, doorRows[1] + 1, 2);
      tpl.rows.forEach((row, ty) => [...row].forEach((c, tx) => {
        const X = px0 + tx, Y = y0 + ty;
        if (c === 'O') tiles[at(X, Y)] = T.PIT;
        else if (c === 'B') put('brazier', X, Y);
        else if (c === 'o') put('crate', X, Y);
        else if (c === 'w') put('weapon', X, Y, { weapon: 'sword' });
      }));
      label('THE FLANK · ' + nm.slice(5).toUpperCase(), px0 + 11, y0 + 1.6, 18, true);
      prevR = r; px0 += w + 4;
    });
  }
  return { W, H, tiles, rooms, spawns: [], props, start: P(hx + 2, hy + 13), exit: { x: (last.x + last.w) * TILE, y: (ey + 1) * TILE },
    exitTile: { x0: last.x + last.w - 1, y0: ey }, forkTile: null, entry: null, seed, def,
    hints, controls, chasms, gaps, cagePrompt: null, vault: null, windows, plan: null, gates: [], sealedArenas: [], shop: null,
    grass: grass.filter((i) => tiles[i] === T.FLOOR), zones, zoneDefs: floors, carpets, statues, sacrifice };
}
