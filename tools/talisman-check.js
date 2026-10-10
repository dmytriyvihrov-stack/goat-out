// In-page check that every talisman does what its shelf line says (8 Oct 2026, "check with a bot that each
// artifact works as supposed"). Load like the harness, after `H.startPlay()`:
//   const s = document.createElement('script'); s.src = '/tools/talisman-check.js'; document.body.appendChild(s);
//   await TALCHECK.run();            // every talisman, a table of PASS / FAIL and what was seen
//   await TALCHECK.run(['cup']);     // some
// Each test wears the one talisman, builds a small scene (men put straight into `game.enemies`) and drives the real
// hooks and the real `game.update`, so a hook that is wired wrong shows as a FAIL, not as a pass of a copy of it.
window.TALCHECK = {
  steps(n, dt = 1 / 60) { for (let i = 0; i < n; i++) game.update(dt); },
  wear(id) {
    game.artifacts = id ? [{ id, tier: 1 }] : []; game.cape = null; game.applyBoons();
    game.talRun = null; game.tal = null; Talisman.st(game);
  },
  // The goat alone in the middle of the biggest room, nobody else, no props of the room's own in the way.
  arena() {
    const rooms = game.level.rooms.slice().sort((a, b) => b.w * b.h - a.w * a.h), r = rooms[0];
    const g = game.goat;
    game.enemies.length = 0; game.props = game.props.filter((p) => p.kind === 'door' || p.kind === 'secret' || p.kind === 'cage' || p.kind === 'gate');
    g.x = (r.x + r.w / 2) * TILE; g.y = (r.y + r.h / 2) * TILE; g.vx = g.vy = 0; g.state = 'idle'; g.hp = g.maxHp = Math.max(g.maxHp, 5);
    g.invuln = 0; g.holding = null; game.dev.god = false; game.cam.x = g.x; game.cam.y = g.y;
    game.revealRooms();
    return r;
  },
  man(dx, dy, kind = 'bearer') {
    const g = game.goat, e = new Enemy(g.x + dx * TILE, g.y + dy * TILE, kind);
    e.aware = true; e.woke = true; e.state = 'chase'; game.enemies.push(e); return e;
  },
  tests: {
    firecharm() {
      TALCHECK.wear('firecharm'); TALCHECK.arena();
      const a = TALCHECK.man(3, 0), b = TALCHECK.man(3.4, 0), c = TALCHECK.man(3.8, 0);
      a.ignite(game, false, false); game.passFire(a, b); game.passFire(b, c);
      return [b.burning > 0 && !(c.burning > 0), `second burns ${b.burning > 0}, third burns ${c.burning > 0} (must be false)`];
    },
    clover() {
      TALCHECK.wear('clover');
      const luck = game.mods.luck, count = (opts) => { let n = 0; for (let s = 1; s <= 14; s++) { const lv = generateLevel(LEVELS[2], s * 977, opts); n += (lv.props || []).filter((p) => p.kind === 'secret').length; } return n; };
      const with_ = count({ luck }), without = count({});
      return [!!luck && with_ > without, `secret walls over 14 floors: ${with_} with it, ${without} without`];
    },
    mason() {
      TALCHECK.wear('mason'); TALCHECK.arena();
      const g = game.goat, lim = TUNING.physics.splatSpeed, e = TALCHECK.man(2, 0);
      const crate = new Prop(g.x + 2 * TILE + 6, g.y, 'crate'); game.props.push(crate);
      e.state = 'flung'; e.vx = lim * 0.8; e.vy = 0; e.x = crate.x - 8;
      TALCHECK.steps(3);
      const ok1 = e.dead;
      return [ok1 && Talisman.bodyMul(game) < 1, `flung at ${Math.round(lim * 0.8)} (a wall kills at ${lim}) into a crate: dead ${ok1}; man into man x${Talisman.bodyMul(game)}`];
    },
    domino() {
      TALCHECK.wear('domino'); TALCHECK.arena();
      const f = TALCHECK.man(2, 0), o = TALCHECK.man(2.5, 0);
      f.state = 'flung'; f.vx = 420; f.vy = 0;
      const did = Talisman.domino(game, f, o);
      return [did && o.state === 'flung', `handed the throw on: ${did}, the second flung: ${o.state === 'flung'}`];
    },
    echo() {
      TALCHECK.wear('echo'); TALCHECK.arena();
      const g = game.goat; g.aim = { x: 1, y: 0 }; game.input.aim = { x: 1, y: 0 }; game.input.lmbPressed = true;
      TALCHECK.steps(40);
      const S = game.tal, left = S.echoes.length;
      TALCHECK.steps(60);
      return [game.mods.echo.count === 2 && S.echoes.length === 0, `ghost blows queued (count ${game.mods.echo.count}), still waiting after 1.6 s: ${S.echoes.length}`];
    },
    spade() {
      TALCHECK.wear('spade'); TALCHECK.arena();
      const e = TALCHECK.man(2, 0); e.die(game, 'splat', 1, 0);
      const body = game.props.find((p) => p.corpse);
      return [!!body && body.noGrab, `a body left as a thing: ${!!body}, cannot be lifted: ${body ? body.noGrab : '-'}`];
    },
    mask() {
      TALCHECK.wear('mask'); TALCHECK.arena();
      const a = TALCHECK.man(2, 0), b = TALCHECK.man(3, 0.5);
      a.die(game, 'splat', 1, 0);
      return [b.state === 'flee', `the one who watched: ${b.state}`];
    },
    spur() {
      TALCHECK.wear('spur'); TALCHECK.arena();
      const g = game.goat, M = TUNING.goat.momentum, p = game.mods.spur;
      g.runUp = 1 + M.max; const top = Talisman.speedMul(game);
      g.runUp = 1; const none = Talisman.speedMul(game);
      return [Math.abs(top - (1 + p.top)) < 1e-6 && none === 1 && Talisman.runUpTime(game) < 1, `speed x${top.toFixed(2)} at the top, x${none} standing; run-up builds in x${Talisman.runUpTime(game)} of the time`];
    },
    moth() {
      TALCHECK.wear('moth'); TALCHECK.arena();
      const e = TALCHECK.man(2, 0); e.aware = false;
      const near = Talisman.stepMul(game, game.goat); e.x += 8 * TILE;
      const far = Talisman.stepMul(game, game.goat);
      return [near === 0 && far === game.mods.moth.step, `footsteps carry x${near} beside an unaware man, x${far} from afar`];
    },
    sandal() {
      TALCHECK.wear('sandal'); TALCHECK.arena();
      const g = game.goat, S = Talisman.st(game); S.visited.add(0);
      const idx = (roomAt(game.level, g.x, g.y) || {}).index, R0 = game.level.rooms[idx];
      g.x = (R0.x + 2) * TILE;   // by the room's west edge, so a man just outside it is within range
      const e = TALCHECK.man(-4, 0); e.aware = true; e.x = (R0.x - 2) * TILE; e.y = g.y;   // behind him, outside this room
      Talisman.newRoom(game, idx, idx - 1);
      const on = g.sandalT > 0, sp = Talisman.speedMul(game), cd = Talisman.cdMul(game, g);
      g.rollCd = 1; TALCHECK.steps(40);
      return [on && sp > 1 && cd === 2 && g.rollCd < 0.1, `buff on ${on}, speed x${sp}, waits x${cd}; a 1 s roll wait after half a second: ${g.rollCd.toFixed(2)}`];
    },
    scapegoat() {
      TALCHECK.wear('scapegoat'); TALCHECK.arena();
      const g = game.goat; g.hp = 1; g.damage(1, game, 0, 0, false, 'club');
      return [!g.dead && g.hp === 3 && !Shop.worn(game, 'scapegoat'), `alive ${!g.dead}, hearts ${g.hp} (3), gone from the neck ${!Shop.worn(game, 'scapegoat')}`];
    },
    tallow() {
      TALCHECK.wear('tallow'); TALCHECK.arena();
      const g = game.goat; g.hp = 3;
      g.damage(1, game, 0, 0, false, 'club'); const first = g.hp; g.invuln = 0;
      g.damage(1, game, 0, 0, false, 'club'); const second = g.hp; g.invuln = 0;
      game.tal = null; Talisman.st(game);   // a new floor
      g.damage(1, game, 0, 0, false, 'club');
      return [first === 3 && second === 2 && g.hp === 2, `hearts after the 1st hit ${first} (3), the 2nd ${second} (2), the 1st hit of the next floor ${g.hp} (2)`];
    },
    mirror() {
      TALCHECK.wear('mirror'); TALCHECK.arena();
      const g = game.goat; g.parryT = 0.2;
      const b = { vx: 100, vy: 0, x: g.x + 20, y: g.y, life: 1 };
      const back = Talisman.reflectBullet(game, b);
      g.parryT = 0; const late = Talisman.canParry(game, 'bullet');
      return [back && b.vx < 0 && !late, `inside the window the round goes back ${back && b.vx < 0}, outside it ${late}`];
    },
    cup() {
      TALCHECK.wear('cup'); TALCHECK.arena();
      const g = game.goat; g.hp = g.maxHp - 2;
      for (let i = 0; i < 10; i++) { const e = TALCHECK.man(3, 0); e.die(game, i % 2 ? 'club' : 'headbutt', 1, 0); }
      TALCHECK.steps(120);   // kills hold the world a beat (hitstop), so give the step room to run
      return [g.hp === g.maxHp - 1, `ten kills of any sort (not the room's alone): hearts ${g.hp} of ${g.maxHp} (one back)`];
    },
    knuckle() {
      TALCHECK.wear('knuckle'); TALCHECK.arena();
      const was = game.state; let n = 0;
      for (let k = 0; k < 3; k++) { game.state = 'play'; game.boonChoice = null; try { game.openBoonChoice(); } catch (e) { return [false, 'threw ' + e.message]; } n = Math.max(n, (game.boonChoice || []).filter(Boolean).length); if (k < 2) { game.state = 'play'; game.boonChoice = null; } }
      game.state = was; game.boonChoice = null;
      return [game.mods.thirdEvery === 1 && n === 3, `cards dealt on a soul: ${n} (3), every ${game.mods.thirdEvery} soul`];
    },
    magnet() {
      TALCHECK.wear('magnet'); const r = TALCHECK.arena();
      const g = game.goat, sw = new Prop(g.x + 3 * TILE, g.y, 'weapon', { weapon: 'sword' }); sw.inStand = false; game.props.push(sw);
      TALCHECK.steps(5);
      const orb = Talisman.orbiters(game).length; TALCHECK.steps(60);
      const att = TALCHECK.man(1, 0), blocked = Talisman.magnetBlock(game, att);
      return [orb === 1 && blocked && Talisman.orbiters(game).length === 0, `pulled in ${orb}, blocked a club ${blocked}, then broke`];
    },
    tally() {
      TALCHECK.wear('tally'); TALCHECK.arena();
      const g = game.goat, e = TALCHECK.man(2, 0), out = [];
      for (let i = 0; i < 3; i++) { g.lungeId++; out.push(Talisman.buttImpulse(game, g, e, 1)); }
      // a swing at air counts nothing: nothing calls `buttImpulse` without a man under the horns
      const R = Talisman.run(game), before = R.tally; g.aim = { x: -1, y: 0 }; game.input.aim = { x: -1, y: 0 }; game.input.lmbPressed = true; game.enemies.length = 0; TALCHECK.steps(80);
      return [out[0] === 1 && out[1] === 1 && out[2] === 2 && R.tally === before, `throw x on three landed butts: ${out.join(', ')} (1, 1, 2); a swing at air changed the count: ${R.tally !== before}`];
    },
    nosebag() {
      TALCHECK.wear('nosebag'); TALCHECK.arena();
      const g = game.goat, R = Talisman.run(game); g.hp = g.maxHp; R.bag = 0;
      const p = { graze: 99, big: false, pail: 0, x: g.x, y: g.y };
      const took = Talisman.bagGraze(game, p, true, 0.016);
      g.hp = g.maxHp - 1; g.vx = g.vy = 0; TALCHECK.steps(150);
      return [took && g.hp === g.maxHp, `grass at full hearts went in the bag ${took}; hurt and standing still it was eaten: hearts ${g.hp}/${g.maxHp}`];
    },
  },
  shelf() {
    const out = [];
    let first = 0, later = 0;
    for (let s = 1; s <= 200; s++) {
      for (const li of [1, 3, 5]) { const st = stockFor(LEVELS[li], new RNG(s * 31 + li)).filter((w) => !w.cape); for (const w of st) { const r = rarityNo(w.id); if (li === 1 && r !== 1) first++; if (li === 5 && r > 1) later++; } }
    }
    out.push(['shop: first mouse sells COMMON only', first === 0, `${first} above COMMON in 200 shelves`]);
    out.push(['shop: a later mouse sells RARE or EPIC', later > 0, `${later} rarer wares at the third mouse`]);
    return out;
  },
  async run(only) {
    const rows = [];
    const keep = { arts: game.artifacts, cape: game.cape, hp: game.goat.hp, god: game.dev.god, x: game.goat.x, y: game.goat.y };
    for (const id of Object.keys(TALCHECK.tests)) {
      if (only && !only.includes(id)) continue;
      let r;
      try { r = TALCHECK.tests[id](); } catch (e) { r = [false, 'threw: ' + e.message]; }
      rows.push([id, r[0], r[1]]);
    }
    if (!only) rows.push(...TALCHECK.shelf());
    game.artifacts = keep.arts; game.cape = keep.cape; game.dev.god = keep.god; game.applyBoons();
    const text = rows.map((r) => `${r[1] ? 'PASS' : 'FAIL'}  ${r[0].padEnd(10)} ${r[2]}`).join('\n');
    console.log(text); return text;
  },
};
