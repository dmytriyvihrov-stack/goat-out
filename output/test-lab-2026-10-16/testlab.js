// THE TEST LAB (16 Oct 2026, his ask: "a TEST button by each line of the test doc opens a room with that thing; the
// first room one of it, the second two, the third three; these rooms live in the test doc, never in the main build").
// Loaded only by output/test-lab-2026-10-16/game.html, after js/game.js. It lays its own floor in place of a test
// floor's: `#lab=<item>&at=<1|2|3>` picks the thing and which of its three rooms the goat starts in. The game itself is
// untouched: `generateLevel` is wrapped, and the page starts the floor through `Game.startShowroom` the way the dev
// drawer's FACTORY (TEST) row does (no save, no heaven, no stats).
(function () {
  const q = new URLSearchParams((location.hash || '').replace(/^#/, ''));
  const ID = q.get('lab'), AT = Math.max(1, Math.min(3, +q.get('at') || 1));

  // One room a count. `size` [w, h] is the room's interior; `look` 'cult' lays it in THE SHOWROOM's stone instead of the
  // factory's plate; `fill(R, k)` lays k of the thing. R: ix, iy (interior top-left), w, h, mid (the way through's row),
  // put, man, mach, wall, pit, spots(k, row?) (k tiles spread across the room's far side), label.
  const TAGS = [];
  const man1 = (kind, opts) => (R, k) => { for (const [x, y] of R.spots(k)) R.man(kind, x, y, opts); };
  const LAB = {
    // the machines that fight
    sawbot: { name: 'SAWBOT', fill: man1('sawbot') },
    welder: { name: 'WELDER', size: [22, 13], fill: (R, k) => {
      [2, R.h - 3, Math.floor(R.h / 2) - 2].slice(0, k).forEach((dy, i) => R.man('welder', R.ix + 6 + i * 4, R.iy + dy, { waxis: 'x' }));
      R.put('crate', R.ix + 4, R.mid + 3); R.put('crate', R.ix + 12, R.mid - 3); R.put('weapon', R.ix + 2, R.iy + 1, { weapon: 'sword' });
    } },
    automaton: { name: 'THE AUTOMATON', size: [26, 18], fill: (R, k) => {
      R.spots(k).forEach(([x, y]) => R.man('automaton', x, y));
      R.put('bomb', R.ix + 2, R.iy + 2); R.put('bomb', R.ix + 2, R.iy + R.h - 3); R.put('weapon', R.ix + 4, R.iy + 1, { weapon: 'sword' });
    } },
    arm: { name: 'THE ARM', size: [28, 15], fill: (R, k) => {
      R.spots(k, 'spread').forEach(([x, y]) => R.man('arm', x, y));
      R.put('barrel', R.ix + 2, R.iy + 1, { toxic: true }); R.put('brazier', R.ix + 2, R.iy + R.h - 2);
    } },
    sweeper: { name: 'THE SWEEPER', fill: man1('sweeper') },
    // THE CARTRIDGE (0.030): its bolts seize iron too, so a sawbot stands in each room to be caught in its line
    cartridge: { name: 'THE CARTRIDGE', size: [20, 13], fill: (R, k) => { man1('cartridge')(R, k); R.man('sawbot', R.ix + 5, R.iy + 2); R.put('crate', R.ix + 3, R.mid + 3); } },
    shieldgen: { name: 'THE SHIELD GENERATOR', size: [24, 15], fill: (R, k) => {
      R.spots(k, 'spread').forEach(([x, y]) => { R.man('shieldgen', x, y); R.man('sawbot', x - 2, y - 1); R.man('sawbot', x - 2, y + 1); });
    } },
    // the traps (nobody in their rooms: a trap room with men in it stops for good once they are dead)
    pressw: { name: 'PRESS · WIDE', size: (k) => [8 * k + 8, 16], fill: (R, k) => {
      for (let i = 0; i < k; i++) {
        const c = R.ix + 4 + i * 8;
        R.wall(c, R.iy, c + 5, R.iy + 1); R.wall(c, R.iy + 12, c + 5, R.iy + 13);
        R.mach({ kind: 'press', size: 'w', axis: 'v', x: (c + 3) * TILE, y0: (R.iy + 2) * TILE, y1: (R.iy + 12) * TILE, phase: i * 0.7 });
      }
      R.put('crate', R.ix + 1, R.iy + 3); R.put('crate', R.ix + 1, R.iy + 10);
    } },
    presss: { name: 'PRESS · SMALL', size: (k) => [5 * k + 8, 12], fill: (R, k) => {
      for (let i = 0; i < k; i++) {
        const c = R.ix + 4 + i * 5;
        R.wall(c, R.iy, c + 1, R.mid - 3); R.wall(c, R.mid + 4, c + 1, R.iy + R.h - 1);
        R.mach({ kind: 'press', size: 's', axis: 'v', x: (c + 1) * TILE, y0: (R.mid - 2) * TILE, y1: (R.mid + 4) * TILE, phase: i * 0.6 });
      }
      R.put('crate', R.ix + 1, R.mid - 1); R.put('crate', R.ix + 1, R.mid + 2);
    } },
    belt: { name: 'BELT', size: [20, 14], fill: (R, k) => {
      [[R.iy + 1, 'r'], [R.iy + R.h - 3, 'l'], [R.mid - 3, 'r']].slice(0, k).forEach(([ty, dir]) => {
        R.mach({ kind: 'belt', tx: R.ix + 3, ty, n: 14, dir, w: 2 });
        R.put('crate', R.ix + (dir === 'r' ? 4 : 15), ty); R.put('barrel', R.ix + (dir === 'r' ? 8 : 11), ty + 1);
      });
    } },
    ram: { name: 'RAM', size: [20, 9], fill: (R, k) => {
      [4, 10, 16].slice(0, k).forEach((c, i) => R.mach({ kind: 'ram', axis: 'v', x: (R.ix + c + 1) * TILE, a: R.iy * TILE, to: (R.iy + R.h) * TILE, dir: 1, phase: -i * 0.5, shove: 20 }));
      R.put('crate', R.ix + 1, R.iy + R.h - 1);
    } },
    burner: { name: 'BURNER', size: [18, 10], fill: (R, k) => {
      [5, 9, 13].slice(0, k).forEach((dx, i) => { for (let dy = 0; dy < R.h; dy++) R.mach({ kind: 'burner', tx: R.ix + dx, ty: R.iy + dy, phase: -i * 1.2 - dy * 0.06 }); });
      R.put('barrel', R.ix + 2, R.iy + 1);
    } },
    firegrate: { name: 'FIRE GRATE', size: [18, 12], fill: (R, k) => {
      [5, 9, 13].slice(0, k).forEach((dx) => { for (let dy = -1; dy <= 2; dy++) for (const j of [0, 1]) R.put('spike', R.ix + dx + j, R.mid + dy, { flame: true }); });
      R.put('spike', R.ix + 3, R.iy + 1, { hidden: true, flame: true }); R.put('crate', R.ix + 3, R.iy + 1);
    } },
    bridge: { name: 'BRIDGE', size: [16, 14], fill: (R, k) => {
      const c = R.ix + 7; R.pit(c, R.iy, c + 2, R.iy + R.h - 1);
      [R.mid, R.iy + 2, R.iy + R.h - 3].slice(0, k).forEach((ty) => { R.floor(c, ty, c + 2, ty); R.mach({ kind: 'bridge', tx: c, ty, n: 3, dir: 'h' }); });
    } },
    dispenser: { name: 'THE BOMB MACHINE', size: [20, 13], fill: (R, k) => {
      [[2, 1], [2, R.h - 2], [10, 1]].slice(0, k).forEach(([dx, dy]) => R.put('dispenser', R.ix + dx, R.iy + dy));
      R.man('sawbot', R.ix + R.w - 4, R.mid - 2); R.man('sawbot', R.ix + R.w - 4, R.mid + 3);
    } },
    // the things in the rooms
    gas: { name: 'GAS CYLINDER', size: [20, 13], fill: (R, k) => {
      [[3, R.mid - 2], [3, R.mid + 3], [5, R.mid]].slice(0, k).forEach(([dx, y]) => R.put('crate', R.ix + dx, y, { gas: true }));
      for (const [x, y] of R.spots(3)) R.man('sawbot', x, y);
    } },
    gears: { name: 'GEARS (floor junk)', fill: (R, k) => { R.spots(k, 'spread').forEach(([x, y], i) => { R.put('junk', x, y, { look: 'gears', turn: i }); R.put('crate', x + 1, y + 1); }); } },
    oil: { name: 'OIL', size: [20, 13], fill: (R, k) => {
      R.spots(k, 'spread').forEach(([x, y]) => R.oil.push({ tx: x - 3, ty: y }));
      R.put('brazier', R.ix + 2, R.iy + 1); R.put('barrel', R.ix + 2, R.iy + R.h - 2);
      R.man('sawbot', R.ix + R.w - 2, R.iy + 2); R.man('sawbot', R.ix + R.w - 2, R.iy + R.h - 3);
    } },
    valve: { name: 'VALVE', fill: (R, k) => R.fixes(k, 'valve') },
    lamp: { name: 'LAMP (on the wall)', fill: (R, k) => R.fixes(k, 'lamp') },
    vent: { name: 'VENT', size: [16, 13], fill: (R, k) => {
      R.fixes(1, 'vent');
      [R.iy + 1, R.iy + R.h - 2, R.iy + 3].slice(0, k).forEach((ty) => { R.vents.push({ tx: R.x + R.W - 1, ty, dir: 1 }); R.put('crate', R.ix + R.w - 1, ty); R.put('crate', R.ix + R.w - 2, ty); });
    } },
  };
  // the factory's floors and walls: each room wears the look, with k sawbots and a crate to see it under them
  const look = (flook, wlook) => ({ name: (flook || wlook) + (flook ? ' FLOOR' : ' WALL'), zone: { flook: flook || 'CONCRETE', wlook: wlook || 'IRON' },
    fill: (R, k) => { man1('sawbot')(R, k); R.put('crate', R.ix + 2, R.iy + 2); R.put('barrel', R.ix + 2, R.iy + R.h - 3); } });
  for (const f of ['PLATES', 'CONCRETE', 'GRATE', 'BRICK', 'RUST']) LAB['floor-' + f.toLowerCase()] = look(f, null);
  for (const w of ['IRON', 'FURNACE', 'CORRUGATED']) LAB['wall-' + w.toLowerCase()] = look(null, w);
  // the cult, in THE SHOWROOM's stone, two pillars and a crate in every room to kill against
  const cult = (name, kind, opts) => ({ name, look: 'cult', fill: (R, k) => {
    R.wall(R.ix + 4, R.iy + 2, R.ix + 4, R.iy + 2); R.wall(R.ix + 4, R.iy + R.h - 3, R.ix + 4, R.iy + R.h - 3);
    R.put('crate', R.ix + 2, R.mid + 3); R.put('brazier', R.ix + R.w - 2, R.iy + 1);
    man1(kind, opts)(R, k);
  } });
  Object.assign(LAB, {
    clubman: cult('CLUBMAN', 'bearer'), butcher: cult('BUTCHER', 'champion'), hound: cult('HOUND', 'dog'), rifleman: cult('RIFLEMAN', 'hunter'),
    seer: cult('MAGE (SEER)', 'seer'), shieldman: cult('SHIELDMAN', 'shield'), shaman: cult('SHAMAN', 'shaman'), wraith: cult('WRAITH', 'wraith'),
    ogre: Object.assign(cult('OGRE', 'butcher', { boss: true }), { size: [22, 16] }), bane: Object.assign(cult('BANE (THROWER)', 'thrower', { boss: true }), { size: [20, 14] }),
  });
  // 18 Oct 2026, his: "add the horn sizes, the sound and every other thing we bring in". A `setup(g, at)` runs once the
  // floor is laid and the kit given: it puts the horn on, a soul or a cape, the chase.
  const horn = (kind, more) => Object.assign(cult('HORNS · ' + kind.toUpperCase(), 'bearer'), { setup: (g) => { g.hornKind = kind; if (more) more(g); g.applyBoons(); } });
  const boon = (id) => (g) => { const b = BOONS.find((o) => o.id === id); if (b && !g.boons.includes(b)) { g.boons.push(b); g.levelBoons = g.boons.slice(); } };
  Object.assign(LAB, {
    'horns-short': horn('short'), 'horns-big': horn('big'), 'horns-long': horn('long'),
    // CROOKED HORNS (0.035): the right of the aim reaches wider and further; men stand both sides of the way in
    'horns-crooked': Object.assign(cult('CROOKED HORNS', 'bearer'), { setup: (g) => { g.hornKind = 'short'; boon('crook')(g); g.applyBoons(); } }),
    // what is heard: hooves, the club, a death, a barrel going up, a bomb, a crate breaking, the hound's bark
    sound: { name: 'SOUND', look: 'cult', size: [20, 13], fill: (R, k) => {
      R.put('barrel', R.ix + 3, R.iy + 1); R.put('bomb', R.ix + 3, R.iy + R.h - 2); R.put('crate', R.ix + 5, R.mid + 2); R.put('brazier', R.ix + R.w - 2, R.iy + 1);
      man1('bearer')(R, k); if (k > 1) R.man('dog', R.ix + R.w - 3, R.iy + R.h - 3); if (k > 2) R.man('seer', R.ix + R.w - 3, R.iy + 2);
    } },
    // CLOAK OF SIGNS (0.035): Q is a random safe tile of the room he stands in
    blink: Object.assign(cult('CLOAK OF SIGNS · Q', 'bearer'), { setup: (g) => { g.cape = { id: 'symbols' }; g.levelCape = g.cape; g.applyBoons(); } }),
    // THE CHEER (0.035): a soul's cards come up in each room; room 1 the BANNER, 2 the GULP, 3 the two in turn
    cheer: Object.assign(cult('THE CHEER · TAKE A SOUL', 'bearer'), { setup: (g, at) => { TUNING.cheer.only = at === 1 ? 'banner' : at === 2 ? 'gulp' : null; setTimeout(() => { if (g.state === 'play') { g.openBoonChoice(); } }, 1200); } }),
    // THE CHASE's new look (0.035): the red comes from the left at once, full early
    chase: Object.assign(cult('THE CHASE', 'bearer'), { setup: (g) => { Chase.start(g); if (g.chase) { g.chase.p = 0.35; } } }),
    // THE SNOW's overhang on the walls (0.035): the cult's rooms under snow
    snow: Object.assign(cult('SNOW ON THE WALLS', 'bearer'), { zone: { snow: true } }),
  });
  // THE CHASE never runs on a test floor (`Chase.on` refuses THE SHOWROOM); here, for its own card only
  const chaseOn = Chase.on; Chase.on = (g) => CUR.id === 'chase' || chaseOn(g);
  // the test asked for: off the address, or `TEST_LAB.run(id, at)`
  const CUR = { id: LAB[ID] ? ID : null, at: AT };

  function labLevel(def, seed) {
    const ITEM = LAB[CUR.id], AT = CUR.at;
    // THE SHOWROOM's def carries no stone of its own (its rooms wear each floor's): the cult's rooms wear THE ALTAR's colours
    if (def === SHOWROOM_LEVEL) { const A = LEVELS[0]; def = Object.assign({}, def, { floor: A.floor, floorAlt: A.floorAlt, wall: A.wall, wallTop: A.wallTop, fog: A.fog, artPass: A.artPass, canon: A.canon }); }
    const W = 220, H = 60, tiles = new Uint8Array(W * H).fill(T.WALL), zones = new Uint8Array(W * H), zoneDefs = [def];
    def.met = new Set(Object.keys(THREAT)); def.known = new Set();
    const rooms = [], props = [], spawns = [], hints = [], machines = [], gaps = new Set(), vents = [], oil = [];
    const at = (x, y) => y * W + x, P = (tx, ty) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
    const put = (kind, tx, ty, o) => props.push(Object.assign(P(tx, ty), { kind }, o || {}));
    const label = (text, tx, ty, w, big) => hints.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, w: (w || 6) * TILE, text, big: !!big });
    const fill = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[at(x, y)] = t; };
    const mid = 30;
    let x = 4, prev = null;
    const room = (w, h, name) => {
      const r = { x, y: mid - Math.floor(h / 2), w, h, index: rooms.length, markers: [], role: 'mix', seen: true, drawn: false, name, tpl: { name, rows: [] } };
      fill(r.x + 1, r.y + 1, r.x + w - 2, r.y + h - 2, T.FLOOR);
      if (prev) {   // two tiles of way through and a plank door in its mouth, so the next room's men wait for him
        fill(prev.x + prev.w - 1, mid, r.x, mid + 1, T.FLOOR);
        props.push({ x: (r.x + 0.5) * TILE, y: (mid + 1) * TILE, kind: 'door', vertical: true });
      }
      rooms.push(r); prev = r; x += w + 3; return r;
    };
    // 0: the way in
    const first = room(9, 8, 'the way in');
    label('TEST LAB', first.x + 4, first.y + 1.5, 7, true); label(ITEM.name, first.x + 4, first.y + 2.6, 7);
    const sz = typeof ITEM.size === 'function' ? null : ITEM.size;
    const starts = [];
    for (let k = 1; k <= 3; k++) {
      const [iw, ih] = (typeof ITEM.size === 'function' ? ITEM.size(k) : sz) || [16, 12];
      const r = room(iw + 2, ih + 2, 'test ' + k);
      const ix = r.x + 1, iy = r.y + 1;
      if (ITEM.zone) {
        const z = zoneDefs.length; zoneDefs.push(Object.assign({}, def, ITEM.zone));
        for (let ty = r.y - 1; ty <= r.y + r.h; ty++) for (let tx = r.x - 1; tx <= r.x + r.w; tx++) zones[at(tx, ty)] = z;
      }
      const R = {
        ix, iy, w: iw, h: ih, mid, x: r.x, W: r.w, oil, vents,
        put, label, mach: (m) => machines.push(m),
        man: (kind, tx, ty, o) => spawns.push(Object.assign(P(tx, ty), spawnKind(kind), { roomIndex: r.index }, o || {})),
        wall: (x0, y0, x1, y1) => fill(x0, y0, x1, y1, T.WALL), floor: (x0, y0, x1, y1) => fill(x0, y0, x1, y1, T.FLOOR),
        pit: (x0, y0, x1, y1) => fill(x0, y0, x1, y1, T.PIT),
        // k tiles in the room's far half, off the way through; 'spread' uses the whole width
        spots: (n, how) => {
          const xs = how === 'spread' ? [0.3, 0.55, 0.8] : [0.6, 0.75, 0.9], ys = [0.5, 0.2, 0.8];
          const out = []; for (let i = 0; i < n; i++) out.push([ix + Math.round(xs[how === 'spread' ? i : [1, 0, 2][i]] * (iw - 1)), iy + Math.round(ys[i] * (ih - 1))]);
          if (n === 1) out[0][0] = ix + Math.round((how === 'spread' ? 0.55 : 0.75) * (iw - 1));
          return out;
        },
        // k fixtures on the far wall's face, spread along it
        fixes: (n, lk) => { for (let i = 0; i < n; i++) put('wallfix', ix + Math.round((i + 1) / (n + 1) * (iw - 1)), r.y, { look: lk }); },
      };
      label(ITEM.name + ' x' + k, ix + iw / 2 - 0.5, iy + 0.4, Math.min(iw - 1, 10), true);
      ITEM.fill(R, k);
      starts.push(P(r.x + 2, mid + 1));
    }
    // the way out: a last small room the third room's vents can open into, its stairs back to the start
    const last = room(8, 8, 'the way out');
    carveFactoryVents(vents, tiles, W, props);
    const ey = mid;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) tiles[at(last.x + last.w - 1 + dx, ey + dy)] = T.EXIT;
    props.push({ x: (last.x + last.w - 1.5) * TILE, y: (ey + 1) * TILE, kind: 'door', vertical: true, iron: true, stair: true, fromRoom: last.index });
    const start = AT === 1 ? P(first.x + 3, mid + 1) : starts[AT - 1];
    return { W, H, tiles, rooms, spawns, props, start, exit: { x: (last.x + last.w) * TILE, y: (ey + 1) * TILE },
      exitTile: { x0: last.x + last.w - 1, y0: ey }, forkTile: null, entry: null, seed, def,
      hints, controls: [], chasms: [], gaps, cagePrompt: null, vault: null, windows: new Set(), plan: null, gates: [], sealedArenas: [], shop: null,
      grass: [], zones, zoneDefs, carpets: [], statues: null, sacrifice: null, machines, oil };
  }

  // The test floor's def is laid by `labLevel` instead of its own generator, both THE FACTORY's and THE SHOWROOM's.
  // Every test hands the goat a kit of souls, so fire, poison and stun can be tried on anything (16 Oct 2026, his: "always
  // give these as skills on every test, so every combo can be checked"): poison on the horns, fire on a throw, a scream
  // that stuns, a roll that stuns. Given again each time the floor is laid (a death lays it again and a run starts bare).
  const KIT = ['splash', 'charge', 'howl', 'weight'];
  const giveKit = () => {
    const g = window.game; if (!g || !CUR.id) return;
    g.boons = KIT.map((id) => BOONS.find((b) => b.id === id)).filter(Boolean);
    g.levelBoons = g.boons.slice();
    // what an earlier test put on (a horn, the cape) is taken off; this one's own `setup` puts its own on
    if (HORN0 === undefined) HORN0 = g.hornKind; g.hornKind = HORN0; g.cape = null; g.levelCape = null;
    TUNING.cheer.only = null;
    if (LAB[CUR.id].setup) LAB[CUR.id].setup(g, CUR.at);
    g.applyBoons();
  };
  let HORN0;
  const gen0 = generateLevel;
  generateLevel = function (def, seed, opts) {
    if (CUR.id && (def === FACTORY_LEVEL || def === SHOWROOM_LEVEL)) { setTimeout(giveKit, 0); return labLevel(def, seed); }
    return gen0(def, seed, opts);
  };
  // Lays the test floor of `id`, the goat in room `at` (1 the way in).
  const run = (id, at) => {
    const g = window.game; if (!g || !LAB[id]) return false;
    CUR.id = id; CUR.at = Math.max(1, Math.min(3, at || 1));
    g.autoPause = false;
    const cult = LAB[id].look === 'cult';
    g.startShowroom(!cult);
    if (cult) g.dev.god = false;   // THE SHOWROOM turns GOD on; a test is a fight to feel
    return true;
  };
  window.TEST_LAB = { ITEMS: LAB, run, get cur() { return Object.assign({}, CUR); } };
  // Straight onto the floor once the game is up (no title, no opening, no question about stats); a new address
  // (the doc's 1 / 2 / 3 buttons) lays it again.
  const go = () => { const g = window.game; if (!g || g.state !== 'title') return setTimeout(go, 50); run(CUR.id, CUR.at); };
  window.addEventListener('load', () => { if (CUR.id) setTimeout(go, 0); });
  // the test doc around the frame says which test and which room ({ lab, at }); the game is already loaded, so it is instant
  window.addEventListener('message', (ev) => {
    const d = ev.data || {};
    if (d.pause) { const g = window.game; if (g && g.state === 'play') g.keyPress('Escape'); return; }   // the doc closed the frame
    if (!LAB[d.lab]) return;
    const once = () => { const g = window.game; if (!g || (g.state !== 'title' && !g.level)) return setTimeout(once, 50); run(d.lab, d.at); try { window.focus(); } catch (e) {} };
    once();
  });
  window.addEventListener('hashchange', () => {
    const h = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (LAB[h.get('lab')]) run(h.get('lab'), +h.get('at') || 1);
  });
})();
