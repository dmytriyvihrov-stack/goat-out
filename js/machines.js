// THE FACTORY's traps (13 Oct 2026, his ask: "ChatGPT made new assets for the traps, the press, the belt, the burning
// grates: make them, things with them in"; art in output/factory-art-2026-10-12, packed by tools/pack-factory.js into
// js/factory-assets.js and drawn off `FACTORY_PIXELS.canvas`). Level data, never props: `level.machines` is a list of
// specs laid by hand (js/factory.js, js/showroom.js), `game.machines` the live ones (`start` from `startLevel`).
//   THE PRESS (`kind: 'press'`, `size` 's' two tiles tall or 'w' six, `x0` / `x1` the wall faces it is bolted to, `y` its
//     line): two jaws on rods closing on the middle on a clock (`TUNING.press`). The jaws are walls that move: whatever
//     stands in the band is shoved along by a face, and what is between the faces when they meet is crushed (pillar 3:
//     the press kills, the goat only puts a man there). The warning shakes it and lays the strip in amber cells (pillar 4).
//   THE BELT (`kind: 'belt'`, `tx`, `ty`, `n` tiles, `dir` 'r' 'l' 'u' 'd', `w` tiles across, 1 by default, its picture
//     scaled up with it): carries what stands on it (`TUNING.belt`), so a belt into a press is a man fed to it. Its middle
//     scrolls at the belt's own speed. A press laid `quick` runs on `TUNING.press.quick`'s shorter open and pull back.
//   THE RAM (`kind: 'ram'`, `axis` 'v' bolted to stone above or below a way, its line `x`, the wall face `a`, `dir` 1 down,
//     -1 up; 'h' the same across with `y`): one press jaw on its own (13 Oct 2026, second playtest: "walls that hit").
//     It shakes over its strip, punches out `TUNING.ram.reach` tiles and pulls back; what it meets is not crushed, it is
//     thrown along the punch (a man flung, the goat knocked off his feet, no heart), so on a catwalk the drop kills.
//     A spec's own `shove` (tiles/s) overrides `TUNING.ram.shove` for that ram.
//   THE BURNER (`kind: 'burner'`, `tx`, `ty`): a grate cold, glowing, catching, then a column of flame that is the
//     floor's own fire on its tile, so every rule fire has (a man alight, the goat's burn, the welder's caution, a
//     sawbot's shrug, a barrel's oil) holds; the world's flame is not drawn over its own (`world.noFlame`).
//   THE BRIDGE (`kind: 'bridge'`, `tx`, `ty`, `n`, `dir` 'h' or 'v'): a grating laid over floor tiles where a catwalk
//     crosses a gap between two drops (13 Oct 2026). Picture only: the tiles under it are floor.
// Every machine runs on its own clock offset by its spec's `phase`, so a row of them can be laid as a wave.
// Also here, not machines of the level's list: THE BOMB MACHINE (a `dispenser` prop, `press` / `stepDispenser`), what is
// left of THE AUTOMATON (`game.wrecks`, laid by `Automaton.wreck`), and the sawbots' heat (`Sawbot.tick`, js/factory.js).
const Machines = {
  TX: 1.35,
  // a press's parts in texels: the mount on the wall, the jaw (its face on its right edge), how tall
  PARTS: { s: { mount: 15, jaw: 25, h: 48, key: 'press-s' }, w: { mount: 14, jaw: 26, h: 144, key: 'press-w' } },
  // the belt's picture in texels: its two ends and the stretch of the middle that repeats (one chevron)
  BELT: { h: { cap0: 9, cap1: 8, from: 9, per: 22, len: 64, w: 24 }, v: { cap0: 7, cap1: 8, from: 17, per: 20, len: 61, w: 24 } },

  start(game) {
    const L = game.level, w = game.world;
    game.machines = (L && L.machines || []).map((s, i) => Object.assign({ id: i, t: s.phase || 0, k: 0, state: 'open', cycle: 0, scroll: 0, w: 1 }, s));
    game.wrecks = [];
    w.noFlame = new Set();
    game.beltAt = new Map(); game.burnerAt = new Map();
    for (const m of game.machines) {
      if (m.kind === 'press') {
        // Worked along its own axis: `a0` / `a1` the two wall faces, `c` its line across, `ac` the middle the jaws meet at.
        // 'h' (the default) is bolted to a left and a right wall (`x0`, `x1`, line `y`); 'v' to a top and a bottom one
        // (`y0`, `y1`, line `x`), the jaws closing across a way that runs left to right.
        const P = Machines.PARTS[m.size || 's'], side = (P.mount + TUNING.press.rodMin + P.jaw) * Machines.TX, v = m.axis === 'v';
        m.v = v; m.a0 = v ? m.y0 : m.x0; m.a1 = v ? m.y1 : m.x1; m.c = v ? m.x : m.y; m.ac = (m.a0 + m.a1) / 2;
        m.hh = P.h * Machines.TX / 2; m.open0 = m.a0 + side; m.open1 = m.a1 - side; m.f0 = m.open0; m.f1 = m.open1;
        m.cx = v ? m.c : m.ac; m.cy = v ? m.ac : m.c;   // its middle in the world, for the sound and the picture
        m.C = m.quick ? Object.assign({}, TUNING.press, TUNING.press.quick) : TUNING.press;
      }
      if (m.kind === 'ram') {
        // a press's frame (`u` along the punch, `w` across); the jaw's face rests `side` off the wall face `a`
        const P = Machines.PARTS.s, side = (P.mount + TUNING.press.rodMin + P.jaw) * Machines.TX, v = m.axis !== 'h';
        m.v = v; m.c = v ? m.x : m.y; m.hh = P.h * Machines.TX / 2; m.rest = m.a + m.dir * side; m.f = m.rest;
        // `to`: a ram laid to punch right across to the far wall face (THE HAMMERS', 15 Oct 2026, his: "the presses here can go to the end of the walls")
        m.far = m.to != null ? m.to : m.rest + m.dir * TUNING.ram.reach * TILE;
        const mu = (m.a + m.far) / 2; m.cx = v ? m.c : mu; m.cy = v ? mu : m.c;
      }
      if (m.kind === 'belt') for (let k = 0; k < m.n; k++) for (let j = 0; j < m.w; j++) {
        const h = m.dir === 'r' || m.dir === 'l';
        game.beltAt.set((m.ty + (h ? j : k)) * w.W + m.tx + (h ? k : j), m);
      }
      if (m.kind === 'burner') { m.cx = (m.tx + 0.5) * TILE; m.cy = (m.ty + 0.5) * TILE; }
      if (m.kind === 'belt') { const h = m.dir === 'r' || m.dir === 'l'; m.cx = (m.tx + (h ? m.n : m.w) / 2) * TILE; m.cy = (m.ty + (h ? m.w : m.n) / 2) * TILE; }
      m.room = -1;
      if (m.kind !== 'bridge' && typeof roomAt === 'function') { const r = roomAt(L, m.cx, m.cy); m.room = r ? r.index : -1; }
      // Whose room it is, and whether men were put in it: those machines run down for good once they are all dead
      // (`TUNING.machine.stop`, `Machines.halt`). A room laid with nobody in it (THE SHOWROOM's) keeps its machines going.
      if (m.kind === 'press' || m.kind === 'ram' || m.kind === 'burner') {
        m.held = m.room >= 0 && game.enemies.some((e) => !e.dead && e.room === m.room && !e.statue && !e.scripted);
      }
      if (m.kind === 'burner') game.burnerAt.set(m.ty * w.W + m.tx, m);
    }
    // what moves or reaches beyond its own tile, asked one by one by `threat`; the burners are found by their tile
    game.machineReach = game.machines.filter((m) => m.kind === 'press' || m.kind === 'ram');
    game.machineGas = 0; game.machineLive = null; game.machineCheck = 0; game.machinesDown = new Set();
    // The rooms where a slide is a death (14 Oct 2026 playtest: "a stop in a trap room is critical"): every room with a
    // machine in it, and every room a drop is cut across. In them the goat stops and starts sharply (`TUNING.goat.trapGrip`,
    // read in `Goat.update`); everywhere else his run still carries him a little.
    game.trapRooms = new Set();
    for (const m of game.machines) if (m.room >= 0 && m.kind !== 'bridge') game.trapRooms.add(m.room);
    for (const c of (L && L.chasms) || []) if (c.room >= 0) game.trapRooms.add(c.room);
  },
  // A machine sleeps while the goat is two rooms or more from its own, as the men do ("nothing simulates two rooms away"):
  // its clock held, its belt carrying nothing, so a belt of barrels has not fed them all to its burner before he comes.
  // A machine in no room (a corridor, THE SHOWROOM's hall) never sleeps.
  asleep(game, m) { return m.room >= 0 && Math.abs(m.room - (game.goatRoom || 0)) > 1; },
  // Where the goat hears a machine, or null: one he cannot see the room of, or past `audio.machines.far` tiles, is silent.
  hear(game, m) {
    const g = game.goat, dx = m.cx - g.x, dy = m.cy - g.y;
    if (game.hidden(m.cx, m.cy) || hyp(dx, dy) > TUNING.audio.machines.far * TILE) return null;
    return game.audio.heard(dx, dy);
  },
  // A machine run down for good: open and cold, its lamp dark. The first of a room's to stop says so for all of them.
  halt(game, m) {
    m.off = true; m.state = m.kind === 'burner' ? 'off' : 'idle'; m.k = 0;
    if (m.kind === 'press') { m.f0 = m.open0; m.f1 = m.open1; } else if (m.kind === 'ram') m.f = m.rest;
    if (m.room >= 0 && !game.machinesDown.has(m.room)) {
      game.machinesDown.add(m.room);
      const where = Machines.hear(game, m); if (where) game.audio.sfxWinddown(where);
    }
    if (m.kind !== 'burner') Machines.steam(game, m);
  },
  // Steam off a press's mounts or a ram's, blown out of the wall into the room.
  steam(game, m) {
    const n = TUNING.machine.steam, P = Machines.PARTS[m.kind === 'ram' ? 's' : (m.size || 's')], in_ = P.mount * Machines.TX * 0.5;
    const at = (u, s) => m.v ? game.dust(m.c, u, n, 0, s) : game.dust(u, m.c, n, s, 0);
    if (m.kind === 'press') { at(m.a0 + in_, 1); at(m.a1 - in_, -1); } else at(m.a + m.dir * in_, m.dir);
  },
  // Sparks off the seam where the jaws meet, flying out along it.
  sparks(game, m) {
    for (let i = 0; i < TUNING.machine.sparks; i++) {
      const s = (Math.random() * 2 - 1) * m.hh, along = (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 160), across = (Math.random() * 2 - 1) * 90;
      game.parts.push({ x: m.v ? m.c + s : m.ac, y: m.v ? m.ac : m.c + s, vx: m.v ? along : across, vy: m.v ? across : along,
        life: 0.2 + Math.random() * 0.25, color: Math.random() < 0.5 ? PALETTE.fireHi : PALETTE.fire, size: 2, streak: true });
    }
  },

  // Where on its clock a press or a burner is: the state and, for a press, how far shut (`k`, 0 open, 1 shut).
  pressClock(m) {
    const C = m.C || TUNING.press, T = C.open + C.warn + C.slam + C.shut + C.back;
    const u = ((m.t % T) + T) % T, a = C.open, b = a + C.warn, c = b + C.slam, d = c + C.shut;
    m.cycle = Math.floor(m.t / T);
    if (u < a) return ['open', 0];
    if (u < b) return ['warn', 0];
    if (u < c) { const q = (u - b) / C.slam; return ['slam', q * q]; }   // it comes in faster and faster
    if (u < d) return ['shut', 1];
    const q = (u - d) / C.back; return ['back', 1 - q * q * (3 - 2 * q)];
  },
  // A ram: resting, shaking (`warn`), the punch (`k` 0 to 1), held out, pulled back.
  ramClock(m) {
    const C = TUNING.ram, T = C.open + C.warn + C.punch + C.hold + C.back;
    const u = ((m.t % T) + T) % T, a = C.open, b = a + C.warn, c = b + C.punch, d = c + C.hold;
    m.cycle = Math.floor(m.t / T);
    if (u < a) return ['open', 0];
    if (u < b) return ['warn', 0];
    if (u < c) { const q = (u - b) / C.punch; return ['punch', q * q]; }
    if (u < d) return ['shut', 1];
    const q = (u - d) / C.back; return ['back', 1 - q * q * (3 - 2 * q)];
  },
  burnerClock(m) {
    const C = TUNING.burner, T = C.off + C.warn + C.ignite + C.fire, u = ((m.t % T) + T) % T;
    return u < C.off ? 'off' : u < C.off + C.warn ? 'warn' : u < C.off + C.warn + C.ignite ? 'ignite' : 'fire';
  },

  update(game, dt) {
    if (typeof Sawbot !== 'undefined') Sawbot.tick(game, dt);
    for (const p of game.props) if (p.kind === 'dispenser' && !p.broken) Machines.stepDispenser(game, p, dt);
    const ms = game.machines; if (!ms || !ms.length) return;
    const w = game.world, MT = TUNING.machine;
    game.machineGas = Math.max(0, game.machineGas - dt);
    // Which rooms still hold a man of their own, asked a few times a second, not once a machine a frame.
    if (MT.stop && (game.machineCheck -= dt) <= 0) {
      game.machineCheck = 0.25; game.machineLive = new Set();
      for (const e of game.enemies) if (!e.dead && e.room >= 0) game.machineLive.add(e.room);
      for (const m of ms) if (m.held && !m.off && !game.machineLive.has(m.room)) m.stopReq = true;
    }
    for (const m of ms) {
      if ((m.sleep = Machines.asleep(game, m))) continue;
      if (m.kind === 'press') {
        if (m.off) { Machines.pressBodies(game, m); continue; }
        m.t += dt; const was = m.state; [m.state, m.k] = Machines.pressClock(m);
        m.f0 = m.open0 + (m.ac - m.open0) * m.k; m.f1 = m.open1 + (m.ac - m.open1) * m.k;
        // the tell is heard too: the pump labouring the length of the warning, ending on the slam
        if (m.state === 'warn' && was !== 'warn') { const where = Machines.hear(game, m); if (where) game.audio.sfxHydraulic(m.C.warn + m.C.slam, where); }
        if (m.state === 'shut' && was !== 'shut') {   // the jaws meet: iron on iron
          game.audio.sfxCageHit(); game.audio.sfxThud(); game.thud(m.cx, m.cy, 0.6);
          const ax = m.v ? 1 : 0, ay = m.v ? 0 : 1;   // the dust puffs out across its line, both ways
          game.dust(m.cx - ax * m.hh * 0.6, m.cy - ay * m.hh * 0.6, 5, -ax, -ay); game.dust(m.cx + ax * m.hh * 0.6, m.cy + ay * m.hh * 0.6, 5, ax, ay);
          if (!game.hidden(m.cx, m.cy)) Machines.sparks(game, m);
          w.emitNoise(m.cx, m.cy, TUNING.noise.smash, 'cult');
        }
        if (m.state === 'back' && was !== 'back') { const where = Machines.hear(game, m); if (where) game.audio.sfxVent(where); Machines.steam(game, m); }
        if (m.stopReq && m.state === 'open') Machines.halt(game, m);
        Machines.pressBodies(game, m);
      } else if (m.kind === 'ram') {
        if (m.off) { Machines.ramBodies(game, m); continue; }
        m.t += dt; const was = m.state; [m.state, m.k] = Machines.ramClock(m);
        m.f = m.rest + (m.far - m.rest) * m.k;
        if (m.state === 'warn' && was !== 'warn') { const where = Machines.hear(game, m); if (where) game.audio.sfxHydraulic(TUNING.ram.warn + TUNING.ram.punch, where); }
        if (m.state === 'shut' && was !== 'shut') {
          game.audio.sfxCageHit(); game.audio.sfxThud(); game.thud(m.v ? m.c : m.f, m.v ? m.f : m.c, 0.5);
          w.emitNoise(m.cx, m.cy, TUNING.noise.smash, 'cult');
        }
        if (m.state === 'back' && was !== 'back') { const where = Machines.hear(game, m); if (where) game.audio.sfxVent(where); Machines.steam(game, m); }
        if (m.stopReq && m.state === 'open') Machines.halt(game, m);
        Machines.ramBodies(game, m);
      } else if (m.kind === 'burner') {
        const i = m.ty * w.W + m.tx;
        if (m.off) { w.noFlame.delete(i); continue; }
        m.t += dt; const was = m.state; m.state = Machines.burnerClock(m);
        if (m.stopReq && m.state === 'off') { Machines.halt(game, m); w.noFlame.delete(i); continue; }
        // a whole room of them hisses once, not thirty times over
        if (m.state === 'warn' && was !== 'warn' && game.machineGas <= 0) { const where = Machines.hear(game, m); if (where) { game.audio.sfxGas(where); game.machineGas = MT.gasGap; } }
        if (m.state === 'fire') {
          if (was !== 'fire') { w.ignite(m.tx, m.ty, true, TUNING.burner.fire); game.audio.sfxFire(); }
          w.fire[i] = Math.max(w.fire[i], 0.25); w.fireKind[i] = 0; w.noFlame.add(i);
        } else w.noFlame.delete(i);
      } else if (m.kind === 'belt') m.scroll += TUNING.belt.speed * dt;
    }
    if (game.beltAt.size) Machines.carry(game, dt);
  },

  // ---- THE BOMB MACHINE ----
  // Its button (a headbutt on it, `Prop.headbutt`): it starts making a bomb, unless one is under way or its last is still
  // lying whole somewhere (it only buzzes then).
  press(game, p) {
    const D = TUNING.dispenser;
    p.wobble = 0.3; game.audio.sfxThud();
    if (p.makeT > 0 || (p.pressCd || 0) > 0) return;
    const last = p.lastBomb;
    if (last && !last.broken && game.props.indexOf(last) >= 0) { game.audio.sfxSteel(); p.buzz = 0.5; return; }
    p.makeT = D.wind; p.pressCd = D.cd;
    game.audio.sfxCageHit(); game.world.emitNoise(p.x, p.y, TUNING.noise.swing, 'cult');
  },
  stepDispenser(game, p, dt) {
    const D = TUNING.dispenser;
    p.pressCd = Math.max(0, (p.pressCd || 0) - dt); p.buzz = Math.max(0, (p.buzz || 0) - dt);
    if (!(p.makeT > 0)) return;
    p.makeT -= dt;
    if (Math.floor(p.makeT * 6) !== Math.floor((p.makeT + dt) * 6)) game.audio.sfxThud();   // it rattles while it works
    if (p.makeT > 0) return;
    p.makeT = 0;
    const b = new Prop(p.x, p.y + D.out, 'bomb');
    b.vx = (Math.random() - 0.5) * 30; b.vy = 40;
    game.props.push(b); p.lastBomb = b;
    game.audio.sfxCageHit(); game.dust(b.x, b.y, 5, 0, 1);
  },

  // ---- the belt ----
  dirOf(m) { return m.dir === 'r' ? [1, 0] : m.dir === 'l' ? [-1, 0] : m.dir === 'd' ? [0, 1] : [0, -1]; },
  beltUnder(game, x, y) { const w = game.world; return game.beltAt.get(Math.floor(y / TILE) * w.W + Math.floor(x / TILE)); },
  // who stands on the floor and can be moved by it: never in the air, rolling, flung, held or a machine's boss
  manOnFloor(e) { return !e.dead && !e.held && !e.flung && !e.aloft && !e.automaton && !e.ghosted && !e.statue && e.state !== 'hop'; },
  goatOnFloor(g) { return !g.dead && !g.leap && g.state !== 'roll' && g.state !== 'falling' && g.state !== 'carried' && g.state !== 'tossed'; },
  loose(p) { return !p.broken && !p.held && !p.flung && !p.inStand && (p.kind === 'crate' || p.kind === 'barrel' || p.kind === 'bomb' || p.kind === 'weapon'); },
  carry(game, dt) {
    const s = TUNING.belt.speed * dt, w = game.world, g = game.goat;
    const move = (o, body) => {
      const m = Machines.beltUnder(game, o.x, o.y); if (!m || m.sleep) return;
      const [dx, dy] = Machines.dirOf(m), ox = o.x, oy = o.y;
      o.x += dx * s; o.y += dy * s;
      if (body) w.collideCircle(o);
      else if (w.isSolid(Math.floor((o.x + dx * o.r) / TILE), Math.floor((o.y + dy * o.r) / TILE))) { o.x = ox; o.y = oy; }
    };
    if (Machines.goatOnFloor(g)) move(g, true);
    for (const e of game.enemies) if (Machines.manOnFloor(e)) move(e, true);
    for (const p of game.props) if (Machines.loose(p) && !(p.kind === 'barrel' && p.lying && hyp(p.vx, p.vy) > 1)) move(p, false);
  },

  // ---- the press ----
  // Every body and loose thing in the band is put back out of both jaws; one with no room left between the faces is crushed.
  // Worked in the press's own frame: `u` along its axis (where the jaws move), `w` across it.
  pressBodies(game, m) {
    const w0 = m.c - m.hh, w1 = m.c + m.hh, g = game.goat, v = m.v;
    const fit = (o, r, onCrush) => {
      const q = { u: v ? o.y : o.x, w: v ? o.x : o.y };
      if (Math.abs(q.w - m.c) > m.hh + r || q.u < m.a0 - r || q.u > m.a1 + r) return;
      Machines.outOf(q, r, m.a0, m.f0, w0, w1, 1); Machines.outOf(q, r, m.f1, m.a1, w0, w1, -1);
      const key = m.id + ':' + m.cycle;
      let sgn = 0;
      if (m.k > 0.8 && o.pressed !== key && Math.abs(q.w - m.c) < m.hh && q.u > m.f0 - r && q.u < m.f1 + r && m.f1 - m.f0 < r * 1.6) {
        o.pressed = key; sgn = q.w >= m.c ? 1 : -1;
        // thrown clear of the line, to the side it was nearer, so a man who lived through it is not crushed twice
        q.w = m.c + sgn * (m.hh + r + 2);
      }
      if (v) { o.y = q.u; o.x = q.w; } else { o.x = q.u; o.y = q.w; }
      if (!sgn) return;
      const kx = v ? sgn : 0, ky = v ? 0 : sgn;
      onCrush(kx, ky);
      if (!o.dead && !o.broken) { o.vx = kx * TUNING.press.eject * TILE; o.vy = ky * TUNING.press.eject * TILE; if (!(o instanceof Prop)) game.world.collideCircle(o); }
    };
    if (Machines.goatOnFloor(g)) fit(g, g.r, (kx, ky) => {
      game.world.splat(g.x, g.y, kx, ky, 12); game.hitstop(0.06);
      g.damage(TUNING.press.goatHurt, game, kx * TUNING.press.eject * TILE, ky * TUNING.press.eject * TILE, false, 'press');
    });
    for (const e of game.enemies) if (Machines.manOnFloor(e) || (e.flung && !e.dead)) fit(e, e.r, (kx, ky) => {
      game.world.splat(e.x, e.y, kx, ky, 18); game.hitstop(0.05);
      m.blood = Math.min(TUNING.machine.blood.max, (m.blood || 0) + 1);   // the jaws keep it
      e.die(game, 'splat', kx, ky, 'press');
    });
    for (const p of game.props) if (Machines.loose(p)) fit(p, p.r, (kx, ky) => {
      if (p.kind === 'bomb') p.explode(game);
      else if (p.kind === 'barrel') p.smashBarrel(game);
      else if (p.kind === 'weapon') p.snap(game, kx, ky);
      else p.shatter(game);
    });
  },
  // A circle (in the press's frame, `u` / `w`) put out of a box. A centre inside it leaves by the nearest open side, never
  // back into the wall the jaw is bolted to (`open` is the way its face points along `u`), so a body in the band is carried.
  outOf(q, r, u0, u1, w0, w1, open) {
    if (u1 <= u0) return;
    const cu = clamp(q.u, u0, u1), cw = clamp(q.w, w0, w1);
    const du = q.u - cu, dw = q.w - cw, d = hyp(du, dw);
    if (d >= r) return;
    if (d > 0.001) { q.u += du / d * (r - d); q.w += dw / d * (r - d); return; }
    const face = open > 0 ? u1 - q.u + r : q.u - u0 + r, lo = q.w - w0 + r, hi = w1 - q.w + r, least = Math.min(face, lo, hi);
    if (least === face) q.u += open * face; else if (least === lo) q.w -= lo; else q.w += hi;
  },

  // ---- the ram ----
  // What stands between its wall and its face is put out in front of the face; on the way out it is thrown along the
  // punch, once a punch: a man flung (the drop or the wall behind does the rest), the goat off his feet, no heart.
  ramBodies(game, m) {
    const R = TUNING.ram, w0 = m.c - m.hh, w1 = m.c + m.hh, g = game.goat, v = m.v, key = m.id + ':' + m.cycle;
    const u0 = Math.min(m.a, m.f), u1 = Math.max(m.a, m.f), punching = m.state === 'punch' || m.state === 'shut';
    const fit = (o, r, onHit) => {
      const q = { u: v ? o.y : o.x, w: v ? o.x : o.y };
      if (Math.abs(q.w - m.c) > m.hh + r || q.u < u0 - r || q.u > u1 + r) return;
      const bu = q.u, bw = q.w;
      Machines.outOf(q, r, u0, u1, w0, w1, m.dir);
      if (q.u === bu && q.w === bw) return;
      if (v) { o.y = q.u; o.x = q.w; } else { o.x = q.u; o.y = q.w; }
      if (punching && o.rammed !== key) { o.rammed = key; onHit(v ? 0 : m.dir, v ? m.dir : 0); }
    };
    if (Machines.goatOnFloor(g)) fit(g, g.r, (kx, ky) => {
      if (g.state === 'shell') return;
      g.state = 'stunned'; g.timer = R.daze; g.dazed = Math.max(g.dazed || 0, R.daze);
      g.vx = kx * R.goatShove * TILE; g.vy = ky * R.goatShove * TILE;
      game.squashGoat(TUNING.juice.squash.hit); game.hitstop(0.05); game.shake(6, true); game.audio.sfxThud();
      game.particles(g.x, g.y, 8, PALETTE.ash, 220);
    });
    for (const e of game.enemies) if (Machines.manOnFloor(e)) fit(e, e.r, (kx, ky) => {
      const sh = m.shove || R.shove;   // a ram laid with its own `shove` (THE HAMMERS', to reach the far wall)
      e.fling(kx * sh * TILE, ky * sh * TILE, true); game.hitstop(0.04); game.audio.sfxThud();
    });
    for (const p of game.props) if (Machines.loose(p)) fit(p, p.r, (kx, ky) => { p.vx = kx * R.shove * TILE; p.vy = ky * R.shove * TILE; });
  },

  // ---- what the cult reads ----
  // The strip a press is about to close on (its warning, the slam and the shut) and a burner glowing or catching are a
  // trap to `Enemy.hazardAt`; a burner alight is already fire there.
  threat(game, x, y, r) {
    // a burner glowing or catching on a tile the circle touches (THE GRILL lays a hundred and fifty of them: found by tile)
    const ba = game.burnerAt, W = game.world.W;
    if (ba && ba.size) for (let ty = Math.floor((y - r) / TILE); ty <= Math.floor((y + r) / TILE); ty++) for (let tx = Math.floor((x - r) / TILE); tx <= Math.floor((x + r) / TILE); tx++) {
      const m = ba.get(ty * W + tx); if (m && (m.state === 'warn' || m.state === 'ignite')) return true;
    }
    for (const m of game.machineReach || []) {
      if (m.kind === 'press') {
        const u = m.v ? y : x, w = m.v ? x : y;
        if ((m.state === 'warn' || m.state === 'slam' || m.state === 'shut') && Math.abs(w - m.c) < m.hh + r && u > m.open0 - r && u < m.open1 + r) return true;
      }
      else if (m.kind === 'ram') {
        const u = m.v ? y : x, w = m.v ? x : y;
        if ((m.state === 'warn' || m.state === 'punch' || m.state === 'shut') && Math.abs(w - m.c) < m.hh + r && u > Math.min(m.rest, m.far) - r && u < Math.max(m.rest, m.far) + r) return true;
      }
    }
    return false;
  },

  // ---- the picture ----
  seen(game, R, x, y, rx, ry) {
    const cam = game.cam, v = R.view(cam);
    return Math.abs(x - cam.x) < v.w * 0.6 + rx && Math.abs(y - cam.y) < v.h * 0.6 + ry && !game.hidden(x, y);
  },
  // On the floor, under everything that stands: the belts, the burners, a press's warning laid on its strip.
  drawGround(R, game) {
    if (typeof FACTORY_PIXELS === 'undefined' || !FACTORY_PIXELS.ready) return;
    // what is left of THE AUTOMATON, flat on the floor where he died (13 Oct 2026 playtest: "show his body after")
    if (game.wrecks && game.wrecks.length) for (const w of game.wrecks) if (Machines.seen(game, R, w.x, w.y, 200, 160)) FACTORY_PIXELS.drawWreck(R.ctx, w);
    const ms = game.machines; if (!ms || !ms.length) return;
    const ctx = R.ctx, smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    for (const m of ms) {
      // the tape under a press's band and a ram's strip while they run; the warning goes over it
      if ((m.kind === 'press' || m.kind === 'ram') && !m.off && Machines.seen(game, R, m.cx, m.cy, TILE * 8, TILE * 8)) Machines.drawTape(ctx, m);
      if (m.kind === 'bridge') {
        const h = m.dir !== 'v', cx = (m.tx + (h ? m.n / 2 : 0.5)) * TILE, cy = (m.ty + (h ? 0.5 : m.n / 2)) * TILE;
        if (Machines.seen(game, R, cx, cy, m.n * TILE, m.n * TILE)) Machines.drawBridge(ctx, m, h);
      } else if (m.kind === 'belt') {
        const h = m.dir === 'r' || m.dir === 'l', len = m.n * TILE;
        const cx = (m.tx + (h ? m.n / 2 : m.w / 2)) * TILE, cy = (m.ty + (h ? m.w / 2 : m.n / 2)) * TILE;
        if (Machines.seen(game, R, cx, cy, len, len)) Machines.drawBelt(ctx, m, h);
      } else if (m.kind === 'burner') {
        const cx = (m.tx + 0.5) * TILE, cy = (m.ty + 0.5) * TILE;
        if (Machines.seen(game, R, cx, cy, TILE, TILE)) Machines.drawBurner(ctx, m, cx, cy, game.timer);
      } else if (m.kind === 'press' && (m.state === 'warn' || m.state === 'slam') && Machines.seen(game, R, m.cx, m.cy, m.a1 - m.a0, m.a1 - m.a0)) {
        // the strip it will close on, in the windups' own amber cells, filling toward the middle as the warning runs out;
        // laid in the press's own frame (`u` along, `w` across), a 'v' one with x and y swapped
        const C = m.C || TUNING.press, c = C.cell, T = C.open + C.warn + C.slam + C.shut + C.back;
        const p = m.state === 'slam' ? 1 : clamp((((m.t % T) + T) % T - C.open) / C.warn, 0, 1);
        const half = (m.open1 - m.open0) / 2, fill = half * p;
        ctx.save(); if (m.v) ctx.transform(0, 1, 1, 0, 0, 0);
        for (let w = m.c - m.hh + c; w < m.c + m.hh - c; w += c * 2) for (let u = m.open0; u < m.open1; u += c * 2) {
          const inner = Math.abs(u + c / 2 - m.ac) > half - fill;
          ctx.fillStyle = `rgba(242,170,48,${inner ? 0.42 : 0.14})`; ctx.fillRect(u, w, c, c);
        }
        ctx.restore();
      } else if (m.kind === 'ram' && (m.state === 'warn' || m.state === 'punch') && Machines.seen(game, R, m.cx, m.cy, TUNING.ram.reach * TILE * 2, TUNING.ram.reach * TILE * 2)) {
        // the ram's strip, from its face at rest to where it punches, filling outward as the warning runs out
        const C = TUNING.ram, c = TUNING.press.cell, T = C.open + C.warn + C.punch + C.hold + C.back;
        const p = m.state === 'punch' ? 1 : clamp((((m.t % T) + T) % T - C.open) / C.warn, 0, 1);
        const u0 = Math.min(m.rest, m.far), u1 = Math.max(m.rest, m.far), span = u1 - u0;
        ctx.save(); if (m.v) ctx.transform(0, 1, 1, 0, 0, 0);
        for (let w = m.c - m.hh + c; w < m.c + m.hh - c; w += c * 2) for (let u = u0; u < u1; u += c * 2) {
          const along = m.dir > 0 ? (u - u0) / span : (u1 - u) / span;
          ctx.fillStyle = `rgba(242,170,48,${along < p ? 0.42 : 0.14})`; ctx.fillRect(u, w, c, c);
        }
        ctx.restore();
      }
    }
    ctx.imageSmoothingEnabled = smooth;
  },
  // The lamp on a mount by its machine's state; a run-down machine's is dark. One-off tints, like the bridge's iron.
  LAMP: { open: '#5fd068', warn: '#f2aa30', hit: '#e8402c', off: '#2e2a2e', rim: '#141216', glint: '#fff4d8' },
  lampOf(m, t) {
    const L = Machines.LAMP;
    if (m.off) return L.off;
    if (m.state === 'warn') return Math.floor(t * 10) % 2 ? L.warn : L.off;
    if (m.state === 'slam' || m.state === 'punch' || m.state === 'shut') return L.hit;
    return m.state === 'back' ? L.warn : L.open;
  },
  // A lamp of 2 x 2 cells in a dark rim, a glint in its corner while lit, laid at (x, y) in the machine's own frame.
  drawLamp(ctx, m, x, y, t) {
    const c = TUNING.machine.lamp.cell, col = Machines.lampOf(m, t);
    ctx.fillStyle = Machines.LAMP.rim; ctx.fillRect(x - c * 1.5, y - c * 1.5, c * 3, c * 3);
    ctx.fillStyle = col; ctx.fillRect(x - c, y - c, c * 2, c * 2);
    if (col !== Machines.LAMP.off) { ctx.fillStyle = Machines.LAMP.glint; ctx.fillRect(x - c, y - c, c * 0.67, c * 0.67); }
  },
  // Hazard tape along both edges of what a press closes on or a ram punches through, cells of amber and black in turn,
  // offset a cell between the two edges so it runs on the slant.
  drawTape(ctx, m) {
    const T = TUNING.machine.tape, c = T.cell;
    const u0 = m.kind === 'press' ? m.open0 : Math.min(m.rest, m.far), u1 = m.kind === 'press' ? m.open1 : Math.max(m.rest, m.far);
    ctx.save(); if (m.v) ctx.transform(0, 1, 1, 0, 0, 0);
    ctx.globalAlpha = T.alpha;
    // `T.rows` cells deep, each row a cell further along, so the stripes lean
    for (let row = 0; row < T.rows; row++) for (const w of [m.c - m.hh + row * c, m.c + m.hh - (row + 1) * c]) {
      let i = row;
      for (let u = u0; u < u1 - 0.5; u += c, i++) { ctx.fillStyle = (i >> 1) & 1 ? Machines.LAMP.warn : Machines.LAMP.rim; ctx.fillRect(u, w, Math.min(c, u1 - u), c); }
    }
    ctx.restore();
  },
  // Red on a jaw's face from the men it has crushed (`m.blood`), cells down its face off a hash of the machine.
  drawBlood(ctx, m, face, H) {
    if (!m.blood) return;
    const c = TUNING.machine.tape.cell * 0.75, n = m.blood * 5;
    ctx.fillStyle = '#6e1616';
    for (let i = 0; i < n; i++) {
      const h = ((i * 37 + m.id * 13 + 5) % 29) / 29, d = ((i * 11 + m.id * 7) % 3);
      ctx.fillRect(face - c * (1 + d), Math.floor(h * (H - c) / c) * c, c * (1 + d), c * (1 + (i % 2)));
    }
  },
  // The belt: its two ends where they are, the middle scrolled by how far the belt has run. 'l' and 'u' are the picture mirrored.
  drawBelt(ctx, m, h) {
    // a belt `w` tiles across is the picture scaled up whole, its chevrons and ends with it
    const B = h ? Machines.BELT.h : Machines.BELT.v, k = Machines.TX * (m.w || 1), U = FACTORY_PIXELS.UP, c = FACTORY_PIXELS.canvas(h ? 'belt-h' : 'belt-v'); if (!c) return;
    const len = m.n * TILE, wid = B.w * k, x0 = m.tx * TILE, y0 = m.ty * TILE, per = B.per * k, a = B.cap0 * k, b = B.cap1 * k, mid = (m.w || 1) * TILE / 2;
    ctx.save();
    // laid along +x from the run's start, across it centred on its tiles; the other three ways are this one turned or mirrored
    if (h) { ctx.translate(m.dir === 'l' ? x0 + len : x0, y0 + mid); if (m.dir === 'l') ctx.scale(-1, 1); }
    else { ctx.translate(x0 + mid, m.dir === 'u' ? y0 + len : y0); if (m.dir === 'u') ctx.scale(1, -1); }
    // the picture's own long axis is x for 'belt-h' and y for 'belt-v': draw it as it is, along that axis
    const part = (sx, sw, at, aw) => h ? ctx.drawImage(c, sx * U, 0, sw * U, B.w * U, at, -wid / 2, aw, wid) : ctx.drawImage(c, 0, sx * U, B.w * U, sw * U, -wid / 2, at, wid, aw);
    ctx.save(); ctx.beginPath(); if (h) ctx.rect(a, -wid / 2, len - a - b, wid); else ctx.rect(-wid / 2, a, wid, len - a - b); ctx.clip();
    const off = m.scroll % per;
    for (let at = a - per + off; at < len - b; at += per) part(B.from, B.per, at, per);
    ctx.restore();
    part(0, B.cap0, 0, a); part(B.len - B.cap1, B.cap1, len - b, b);
    ctx.restore();
  },
  // A catwalk's bridge: a grating of cells, dark iron rails along both edges with posts, laid over the floor tiles.
  drawBridge(ctx, m, h) {
    const c = 2, x0 = m.tx * TILE, y0 = m.ty * TILE, L = m.n * TILE, W = TILE;
    ctx.save(); ctx.translate(x0, y0); if (!h) ctx.transform(0, 1, 1, 0, 0, 0);
    ctx.fillStyle = '#1b1a1f'; ctx.fillRect(0, 0, L, W);
    ctx.fillStyle = '#4a4850'; for (let u = c; u < L - c; u += c * 2) ctx.fillRect(u, c * 2, c, W - c * 4);
    ctx.fillStyle = '#2c2a31'; for (let w = c * 3; w < W - c * 3; w += c * 3) ctx.fillRect(0, w, L, c * 0.5);
    for (const e of [0, W - c * 2]) {
      ctx.fillStyle = '#0e0c10'; ctx.fillRect(0, e, L, c * 2);
      ctx.fillStyle = '#6c696d'; ctx.fillRect(0, e, L, c * 0.5);
      ctx.fillStyle = '#8e4535'; for (let u = c; u < L; u += TILE / 2) ctx.fillRect(u, e - c * 0.5, c * 1.5, c * 3);
    }
    ctx.restore();
  },
  // THE FACTORY's grate trap (`p.flame`, js/entities.js `updateSpike`) wears the burner's picture: cold resting, the
  // warning glow while it arms, catching as it goes down, the column of flame while it is up.
  drawFlameGrate(R, p) {
    if (typeof FACTORY_PIXELS === 'undefined' || !FACTORY_PIXELS.ready) return;
    const st = p.spikeState, state = st === 'armed' ? 'warn' : st === 'up' ? 'fire' : st === 'down' ? 'ignite' : 'off';
    const ctx = R.ctx, smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    Machines.drawBurner(ctx, { state, tx: Math.floor(p.x / TILE) }, p.x, p.y, R.t);
    ctx.imageSmoothingEnabled = smooth;
  },
  // The burner stands up out of the floor (its flame rises), its foot a little under the tile's middle.
  drawBurner(ctx, m, cx, cy, t) {
    const name = m.state === 'off' ? 'burner-off' : m.state === 'warn' ? (Math.floor(t * 8) % 2 ? 'burner-warning' : 'burner-off')
      : m.state === 'ignite' ? 'burner-ignite' : 'burner-fire';
    const c = FACTORY_PIXELS.canvas(name); if (!c) return;
    const it = FACTORY_ASSETS.items[name], k = Machines.TX, fl = m.state === 'fire' && Math.floor(t * 10 + m.tx) % 2;
    ctx.save(); ctx.scale(1, 1 / TILT); ctx.translate(cx, (cy + 9) * TILT); if (fl) ctx.scale(-1, 1);
    ctx.drawImage(c, -it[2] * k / 2, -it[3] * k, it[2] * k, it[3] * k);
    ctx.restore();
  },
  // The presses, after the props: flat on the floor like the belt, each half from the wall it is bolted to, the far half
  // the near one mirrored. The rod is one column of its picture stretched from the mount to the jaw. Drawn in the press's
  // own frame: a 'v' one is the same picture with x and y swapped (it is a mirror image turned, and nothing on it reads).
  drawTop(R, game) {
    const ms = game.machines; if (!ms || !ms.length || typeof FACTORY_PIXELS === 'undefined' || !FACTORY_PIXELS.ready) return;
    const ctx = R.ctx, smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    for (const m of ms) {
      if (m.kind === 'ram') { Machines.drawRam(R, game, m); continue; }
      if (m.kind !== 'press' || !Machines.seen(game, R, m.cx, m.cy, m.a1 - m.a0, m.a1 - m.a0)) continue;
      const P = Machines.PARTS[m.size || 's'], k = Machines.TX, H = P.h * k;
      const mount = FACTORY_PIXELS.canvas(P.key + '-mount'), rod = FACTORY_PIXELS.canvas(P.key + '-rod'), jaw = FACTORY_PIXELS.canvas(P.key + '-jaw');
      if (!mount || !rod || !jaw) continue;
      const shake = m.state === 'warn' ? Math.sin(game.timer * 70 + m.id) * TUNING.press.shake : 0;
      const side = (base, face, flip) => {
        ctx.save(); if (m.v) ctx.transform(0, 1, 1, 0, 0, 0); ctx.translate(base, m.c - m.hh); if (flip) ctx.scale(-1, 1);
        const d = face + shake, j0 = d - P.jaw * k, r0 = 12 * k;
        if (j0 > r0) ctx.drawImage(rod, r0, 0, j0 - r0 + 2, H);
        ctx.drawImage(mount, 0, 0, P.mount * k, H);
        ctx.drawImage(jaw, j0, 0, P.jaw * k, H);
        Machines.drawBlood(ctx, m, d, H);
        Machines.drawLamp(ctx, m, P.mount * k * 0.5, H * 0.5, game.timer);
        ctx.restore();
      };
      side(m.a0, m.f0 - m.a0, false); side(m.a1, m.a1 - m.f1, true);
    }
    ctx.imageSmoothingEnabled = smooth;
  },
  // A ram is one half of a small press: its mount on the wall face `a`, the rod stretched out to the jaw at `f`.
  drawRam(R, game, m) {
    const span = Math.abs(m.far - m.a);
    if (!Machines.seen(game, R, m.cx, m.cy, span, span)) return;
    const P = Machines.PARTS.s, k = Machines.TX, H = P.h * k, ctx = R.ctx;
    const mount = FACTORY_PIXELS.canvas(P.key + '-mount'), rod = FACTORY_PIXELS.canvas(P.key + '-rod'), jaw = FACTORY_PIXELS.canvas(P.key + '-jaw');
    if (!mount || !rod || !jaw) return;
    const shake = m.state === 'warn' ? Math.sin(game.timer * 70 + m.id) * TUNING.ram.shake : 0;
    const d = Math.abs(m.f - m.a) + shake, j0 = d - P.jaw * k, r0 = 12 * k;
    ctx.save(); if (m.v) ctx.transform(0, 1, 1, 0, 0, 0); ctx.translate(m.a, m.c - m.hh); if (m.dir < 0) ctx.scale(-1, 1);
    if (j0 > r0) ctx.drawImage(rod, r0, 0, j0 - r0 + 2, H);
    ctx.drawImage(mount, 0, 0, P.mount * k, H);
    ctx.drawImage(jaw, j0, 0, P.jaw * k, H);
    Machines.drawLamp(ctx, m, P.mount * k * 0.5, H * 0.5, game.timer);
    ctx.restore();
  },
};
if (typeof module !== 'undefined') module.exports = { Machines };
