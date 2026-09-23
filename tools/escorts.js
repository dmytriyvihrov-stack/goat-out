// The escort walk: does an animal get to the stairs with a goat who does not wait for it? Load it in
// the page (no harness needed — it drives the simulation itself, off the clock):
//   const s = document.createElement('script'); s.src = '/tools/escorts.js'; document.body.appendChild(s);
//   ESCORT.run(['chicken', 'goose', 'crow', 'tortoise'], [1, 2, 3, 4, 5, 6, 7], 3, { pause: 2 }, 'now');
//   ...then read ESCORT.res.now (it fills in the background, a second's worth of walks a tick).
//
// One walk: the level's coop is emptied of whatever it held and filled with `kind`, every door is
// taken off, every man stands frozen, and the goat is put beside the coop, breaks it and runs the
// shortest way to the stairs round the furniture. A man within two and a half tiles of him dies
// where he stands (a body for the crow) and the goat stands still `pause` seconds over him, which is
// the fight a player would have had there. The tortoise is carried (`carry`, the default) or left to
// plod. At the stairs: saved if the animal is inside its `saveR`; `stuck` if it spent three seconds
// or more going nowhere while more than three tiles off him; `lag` is how far behind the goat it
// fell at worst, in tiles of the way out; `cameIf` counts the walks where it did reach him if he
// stood at the stairs up to `wait` seconds (30), `waitMax` the longest such wait. God mode is on; the
// real frame loop is off while it runs.
window.ESCORT = {
  res: {},
  walk(li, seed, kind, o = {}) {
    if (!game._frame) game._frame = game.frame;
    game.frame = () => {};
    game.startLevel(li, seed, false, false);
    game.dev.god = true;
    for (let i = 0; i < 2000 && game.state !== 'play'; i++) game.update(1 / 60);
    for (let i = 0; i < 30; i++) game.update(1 / 60);
    const coop = game.props.find((p) => p.kind === 'coop' && !p.broken);
    if (!coop) return { err: 'nocoop' };
    coop.holds = kind;
    for (const p of game.props) if (p.kind === 'door' && !p.broken) { p.broken = true; p.dead = true; }
    for (const e of game.enemies) e.update = () => {};
    const g = game.goat, w = game.world, L = game.level;
    // The goat's own way out, round the furniture, so that the bot is not what gets stuck.
    w.setFurniture(game.props);
    const D = new Int32Array(w.W * w.H).fill(-1), q = [L.exitTile.y0 * w.W + L.exitTile.x0]; D[q[0]] = 0;
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % w.W, y = (i / w.W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (y + dy) * w.W + x + dx; if (D[n] >= 0 || !w.open(n)) continue; D[n] = D[i] + 1; q.push(n); }
    }
    const at = game.freeSpot(coop.x + TILE * 1.2, coop.y);
    g.x = at.x; g.y = at.y; game.cam.x = g.x; game.cam.y = g.y;
    coop.hits = TUNING.prop.coop.hits - 1; coop.breakCoop(game);
    const pet = game.props.find((p) => p.kind === kind && !p.broken);
    if (kind === 'tortoise' && o.carry !== false) { g.holding = pet; pet.held = true; g.autoHeld = true; }   // held without a button down
    const orig = game.readMoveInput.bind(game);
    let dir = { x: 0, y: 0 }, waitT = 0;
    game.readMoveInput = function () { orig(); game.input.mx = dir.x; game.input.my = dir.y; };
    const f = Beast.exit(game);
    const fp = (p) => f.d[Math.floor(p.y / TILE) * w.W + Math.floor(p.x / TILE)];
    const botDir = () => {
      const tx = Math.floor(g.x / TILE), ty = Math.floor(g.y / TILE);
      let here = D[ty * w.W + tx]; if (here < 0) here = 1e9;
      let best = here, bx = 0, by = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        if (dx && dy && (!w.open(ty * w.W + tx + dx) || !w.open((ty + dy) * w.W + tx))) continue;
        const v = D[(ty + dy) * w.W + tx + dx];
        if (v >= 0 && v < best) { best = v; bx = dx; by = dy; }
      }
      if (best === here) return null;
      const vx = (tx + bx + 0.5) * TILE - g.x, vy = (ty + by + 0.5) * TILE - g.y, l = Math.hypot(vx, vy) || 1;
      return { x: vx / l, y: vy / l };
    };
    let t = 0, maxLag = 0, lastP = { x: pet.x, y: pet.y }, stuckRun = 0, maxStuckRun = 0, stuckAt = null, dead = null;
    while (t < (o.max || 300)) {
      if (fp(g) <= 2) break;
      if (waitT > 0) { dir = { x: 0, y: 0 }; waitT -= 1 / 60; } else dir = botDir() || { x: 0, y: 0 };
      for (const e of game.enemies) if (!e.dead && Math.hypot(e.x - g.x, e.y - g.y) < 2.5 * TILE) { e.die(game, 'splat', 0, 0); if (o.pause) waitT = o.pause; }
      game.update(1 / 60); t += 1 / 60;
      if (game.state !== 'play') break;
      if (pet.broken) { const r = roomAt(L, pet.x, pet.y) || {}; dead = { t: +t.toFixed(1), room: r.index, clamped: !!r.clamped }; break; }
      maxLag = Math.max(maxLag, fp(pet) - fp(g));
      const mv = Math.hypot(pet.x - lastP.x, pet.y - lastP.y); lastP = { x: pet.x, y: pet.y };
      const gap = Math.hypot(pet.x - g.x, pet.y - g.y) / TILE;
      // A goose standing `lead` tiles ahead is waiting for him, which is not being stuck.
      const waiting = kind === 'goose' && Beast.ahead(pet, game) >= TUNING.prop.goose.lead - 1;
      if (mv < 0.3 && gap > 3 && !pet.feeding && !pet.held && !(pet.tuckT > 0) && !waiting) {
        stuckRun += 1 / 60;
        if (stuckRun > maxStuckRun) { maxStuckRun = stuckRun; stuckAt = [pet.x | 0, pet.y | 0]; }
      } else stuckRun = 0;
    }
    const gapEnd = Math.hypot(pet.x - g.x, pet.y - g.y) / TILE;
    // Would it have come if he had waited at the top of the stairs? Up to `wait` seconds of standing.
    let waited = 0;
    const saveR = (TUNING.prop[kind].saveR || 8) * TILE;
    dir = { x: 0, y: 0 };
    while (!pet.broken && !pet.held && Math.hypot(pet.x - g.x, pet.y - g.y) > saveR && waited < (o.wait || 30) && game.state === 'play') { game.update(1 / 60); waited += 1 / 60; }
    const cameTo = !pet.broken && (pet.held || Math.hypot(pet.x - g.x, pet.y - g.y) <= saveR);
    const trapped = !pet.broken && !!(roomAt(L, pet.x, pet.y) || {}).clamped;
    game.readMoveInput = orig;
    return { li, seed, kind, t: +t.toFixed(1), dead, trapped, saved: !pet.broken && (pet.held || gapEnd <= (TUNING.prop[kind].saveR || 8)),
      waited: cameTo ? +waited.toFixed(1) : null, gapEnd: +gapEnd.toFixed(1), maxLag, maxStuckRun: +maxStuckRun.toFixed(1), stuckAt };
  },
  // Every kind over every level and `seeds` seeds, one walk a tick so the page stays alive; the
  // tally lands in `ESCORT.res[key]` and `finished` is set when it is done. `ESCORT.stop()` puts the
  // real frame loop back.
  run(kinds, levels, seeds, o, key) {
    const jobs = [];
    for (const k of kinds) for (const li of levels) for (let i = 1; i <= seeds; i++) jobs.push([k, li, i]);
    const out = ESCORT.res[key] = { done: 0, total: jobs.length };
    // A hidden pane runs timers once a second, so each tick does as many walks as fit in 900 ms.
    const next = () => {
      const t0 = performance.now();
      while (jobs.length && performance.now() - t0 < 900) one(jobs.shift());
      if (!jobs.length) { out.finished = true; ESCORT.stop(); return; }
      setTimeout(next, 0);
    };
    const one = (j) => {
      const [k, li, i] = j;
      const s = out[k] = out[k] || { n: 0, saved: 0, dead: 0, trapped: 0, stuck: 0, lag: 0, err: 0, where: [] };
      try {
        const r = ESCORT.walk(li, i * 7919 + li, k, Object.assign({}, o));
        if (r.err) s.err++;
        else {
          s.n++; if (r.saved) s.saved++; if (r.dead) s.dead++; if (r.trapped) s.trapped++;
          if (r.waited !== null) { s.cameIf = (s.cameIf || 0) + 1; s.waitMax = Math.max(s.waitMax || 0, r.waited); }
          if (r.maxStuckRun > 3) { s.stuck++; s.where.push(li + ':' + r.stuckAt); }
          s.lag = +(((s.lag * (s.n - 1)) + r.maxLag) / s.n).toFixed(1);
        }
      } catch (e) { s.err++; s.lastErr = String(e.stack).slice(0, 300); }
      out.done++;
    };
    next();
    return jobs.length;
  },
  stop() { if (game._frame) game.frame = game._frame; },
};
