// The smoke run: a bot walks every floor to its stairs with the cult alive round him, and whatever
// throws, goes NaN or stops a floor from being finished is written down. Load it in the page on the
// dev server (no harness needed — it drives the simulation itself, off the clock):
//   const s = document.createElement('script'); s.src = '/tools/smoke.js'; document.body.appendChild(s);
//   SMOKE.run(['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'N', 'T3'], [11, 22], 'now');
//   ...then SMOKE.report('now') once SMOKE.res.now.done is true (it fills in the background).
//
// A floor: `L<i>` is LEVELS[i], `N` is THE DARK, `T<i>` THE TRIP in LEVELS[i]'s place. God mode is on
// and the real frame loop is off while it runs; every `drawEvery` steps the renderer draws a frame
// into the real canvas, so a throw in `draw` is caught as well as one in `update`. The goat runs a
// breadth-first field to the stairs over stone and holes only, butts whoever is within reach and
// anything he is stuck against, takes any soul he passes (a random card), and when he has been stuck
// long enough is set down further along the way (`tp`): a smoke run looks for crashes, not for a bot
// that plays well. Per floor: `ok` reached the stairs, `t` seconds of play, `errs` distinct throws
// (message and where), `nan` the first thing found with a non-finite position, `tp` set-downs, `upd`
// and `draw` average and worst milliseconds.
window.SMOKE = {
  res: {},
  opts: { maxT: 420, drawEvery: 12, stepsPerTick: 240, spikeUpd: 12, spikeDraw: 40 },
  field(g) {
    const w = g.world, W = w.W, H = w.H, D = new Int32Array(W * H).fill(-1), q = [];
    for (let i = 0; i < W * H; i++) if (w.tiles[i] === T.EXIT) { D[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx; if (D[n] >= 0) continue;
        const t = w.tiles[n]; if (t === T.WALL || t === T.PIT) continue;
        D[n] = D[i] + 1; q.push(n);
      }
    }
    return D;
  },
  start(which, seed) {
    const g = game;
    g.forgetLessons(); g.boons = []; g.artifact = null; g.levelArtifact = null; g.beasts = {};
    g.runJumped = true;   // a bot run is practice: it never writes the save or the BEST board
    g.tripAt = -1; g.darkAt = -1; g.deaths = 0; g.totalKills = 0; g.totalScore = 0; g.runSeed = seed;
    let li;
    if (which === 'N') { li = DARK_LEVEL.darkOf; g.darkAt = li; }
    else if (which[0] === 'T') { li = +which.slice(1); g.tripAt = li; }
    else li = +which.slice(1);
    // The souls a run would have carried in, as LEVELS deals them, so the later floors are played
    // with a build and not a bare goat.
    let budget = 0; for (let i = 0; i < li; i++) budget += LEVELS[i].souls || 0;
    for (let n = 0; n < budget; n++) { g.applyBoons(); const open = BOONS.filter((b) => g.boonOpen(b, li)); if (!open.length) break; g.boons.push(open[(Math.random() * open.length) | 0]); }
    g.applyBoons();
    g.startLevel(li, seed, false, false);
    g.dev.god = true;
    // The bot runs in a pane that is often behind another window; losing focus must not pause it.
    g.autoPause = false;
  },
  // Every position that should be a number. The first one that is not is the only one worth reading.
  nanCheck(g) {
    const bad = (o) => o && !(Number.isFinite(o.x) && Number.isFinite(o.y));
    if (bad(g.goat) || !Number.isFinite(g.goat.vx) || !Number.isFinite(g.goat.vy)) return 'goat';
    for (const e of g.enemies) if (bad(e) || !Number.isFinite(e.vx) || !Number.isFinite(e.vy)) return 'enemy ' + e.kind + ' ' + e.state;
    for (const p of g.props) if (bad(p)) return 'prop ' + p.kind;
    for (const b of g.bullets) if (bad(b)) return 'bullet';
    if (!Number.isFinite(g.cam.x) || !Number.isFinite(g.cam.y)) return 'camera';
    return null;
  },
  run1(which, seed) {
    const g = game, O = SMOKE.opts;
    const r = { which, seed, ok: false, t: 0, errs: {}, nan: null, tp: 0, kills: 0, upd: 0, updMax: 0, draw: 0, drawMax: 0, nUpd: 0, nDraw: 0, souls: 0, end: '', spikes: [] };
    const err = (where, e) => { const k = where + ': ' + (e && e.message || e) + ' @' + String(e && e.stack || '').split('\n').slice(1, 3).map((s) => s.trim().replace(/^at /, '').replace(/\(?https?:\/\/[^/]+\//, '')).join(' < '); r.errs[k] = (r.errs[k] || 0) + 1; };
    try { SMOKE.start(which, seed); } catch (e) { err('start', e); r.end = 'start threw'; return r; }
    let D = SMOKE.field(g), fieldT = 0, best = Infinity, stall = 0, buttCd = 0, steps = 0;
    const dir = { x: 0, y: 0 }, aim = { x: 1, y: 0 };
    // THE TRIP turns the stick round and puts the horns on the other button (`game.tripInput`), so the
    // bot pushes the other way and butts with a tap of the grab button.
    let tripButt = false;
    const orig = g.readMoveInput.bind(g);
    g.readMoveInput = function () {
      orig(); const trip = g.level && g.level.def.shroom, k = trip ? -1 : 1;
      g.input.mx = dir.x * k; g.input.my = dir.y * k; g.input.aim = { x: aim.x, y: aim.y };
      if (trip) { g.input.rmbDown = tripButt; tripButt = false; }
    };
    const butt = () => { if (g.level && g.level.def.shroom) tripButt = true; else g.input.lmbPressed = true; };
    const w = () => g.world;
    const dAt = (x, y) => { const W = w().W, tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return D[ty * W + tx]; };
    // The neighbour tile that is nearer the stairs, as a unit vector, or null.
    const next = () => {
      const W = w().W, gt = g.goat, tx = Math.floor(gt.x / TILE), ty = Math.floor(gt.y / TILE);
      let here = D[ty * W + tx]; if (here < 0) here = 1e9;
      let bestV = here, bx = 0, by = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        if (dx && dy && (D[ty * W + tx + dx] < 0 || D[(ty + dy) * W + tx] < 0)) continue;
        const v = D[(ty + dy) * W + tx + dx];
        if (v >= 0 && v < bestV) { bestV = v; bx = dx; by = dy; }
      }
      if (bestV === here) return null;
      const vx = (tx + bx + 0.5) * TILE - gt.x, vy = (ty + by + 0.5) * TILE - gt.y, l = Math.hypot(vx, vy) || 1;
      return { x: vx / l, y: vy / l };
    };
    // Set him down `k` tiles further along the field, on the nearest free spot.
    const hop = (k) => {
      const W = w().W, gt = g.goat;
      let i = Math.floor(gt.y / TILE) * W + Math.floor(gt.x / TILE);
      if (D[i] < 0) { let bi = -1, bd = Infinity; for (let j = 0; j < D.length; j++) if (D[j] >= 0) { const d = Math.hypot(j % W - i % W, ((j / W) | 0) - ((i / W) | 0)); if (d < bd) { bd = d; bi = j; } } i = bi; }
      for (let n = 0; n < k && D[i] > 0; n++) {
        const x = i % W, y = (i / W) | 0; let ni = i;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (y + dy) * W + x + dx; if (D[j] >= 0 && D[j] < D[ni]) ni = j; }
        if (ni === i) break; i = ni;
      }
      const at = g.freeSpot((i % W + 0.5) * TILE, (((i / W) | 0) + 0.5) * TILE);
      gt.x = at.x; gt.y = at.y; gt.vx = gt.vy = 0; if (gt.state === 'roll' || gt.state === 'lunge') gt.state = 'idle';
      r.tp++;
    };
    const tick = () => {
      const gt = g.goat;
      if (g.state === 'boon') { if (g.boonArm <= 0) { g.takeBoon((Math.random() * 3) | 0); r.souls++; } return; }
      if (g.state !== 'play') { dir.x = dir.y = 0; return; }
      fieldT += 1 / 60; if (fieldT > 4) { fieldT = 0; D = SMOKE.field(g); }
      const here = dAt(gt.x, gt.y);
      if (here >= 0 && here < best - 0.5) { best = here; stall = 0; } else stall += 1 / 60;
      const n = next(); dir.x = n ? n.x : 0; dir.y = n ? n.y : 0;
      buttCd -= 1 / 60;
      let foe = null, fd = 3 * TILE;
      for (const e of g.liveEnemies || g.enemies) {
        if (e.dead || e.ghosted) continue;
        const d = Math.hypot(e.x - gt.x, e.y - gt.y); if (d < fd) { fd = d; foe = e; }
      }
      if (foe) { const l = fd || 1; aim.x = (foe.x - gt.x) / l; aim.y = (foe.y - gt.y) / l; }
      else if (n) { aim.x = n.x; aim.y = n.y; }
      if ((foe || stall > 1.2) && buttCd <= 0) { butt(); buttCd = 0.45; }
      if (stall > 7) { hop(stall > 25 ? 14 : 5); stall = stall > 25 ? 0 : 1.5; best = Infinity; }
    };
    const step = () => {
      tick();
      const t0 = performance.now();
      try { g.update(1 / 60); } catch (e) { err('update', e); g.clearEdges && g.clearEdges(); }
      const t1 = performance.now(); r.upd += t1 - t0; r.updMax = Math.max(r.updMax, t1 - t0); r.nUpd++;
      if (t1 - t0 > SMOKE.opts.spikeUpd && r.spikes.length < 40) r.spikes.push('u' + Math.round(t1 - t0) + '@' + Math.round(r.t) + 's/r' + g.goatRoom);
      steps++;
      if (steps % O.drawEvery === 0) {
        try { g.audio.updateScene(g, O.drawEvery / 60); } catch (e) { err('audio', e); }
        const t2 = performance.now();
        try { g.renderer.configure(false); g.renderer.draw(g, O.drawEvery / 60); } catch (e) { err('draw', e); }
        const t3 = performance.now(); r.draw += t3 - t2; r.drawMax = Math.max(r.drawMax, t3 - t2); r.nDraw++;
        if (t3 - t2 > SMOKE.opts.spikeDraw && r.spikes.length < 40) r.spikes.push('d' + Math.round(t3 - t2) + '@' + Math.round(r.t) + 's/r' + g.goatRoom);
      }
      if (!r.nan) { const b = SMOKE.nanCheck(g); if (b) r.nan = b + ' @' + Math.round(r.t) + 's room ' + g.goatRoom; }
      if (g.state === 'play') r.t += 1 / 60;
    };
    r.steps = step; r.finish = () => {
      g.readMoveInput = orig;
      r.kills = g.kills; r.room = g.goatRoom; r.rooms = g.level.rooms.length;
      r.upd = +(r.upd / Math.max(1, r.nUpd)).toFixed(2); r.draw = +(r.draw / Math.max(1, r.nDraw)).toFixed(2);
      r.updMax = +r.updMax.toFixed(1); r.drawMax = +r.drawMax.toFixed(1); r.t = Math.round(r.t);
      // The JS heap after the floor (Chrome only): a figure that climbs floor after floor is a leak.
      r.heap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
      delete r.steps; delete r.finish; delete r.nUpd; delete r.nDraw;
    };
    return r;
  },
  // All floors × seeds, a slice per timer tick so the page stays alive. Results land in res[tag].
  run(floors, seeds, tag = 'now') {
    const g = game; if (!g._frame) g._frame = g.frame; g.frame = () => {};
    const jobs = []; for (const f of floors) for (const s of seeds) jobs.push([f, s]);
    const out = SMOKE.res[tag] = { done: false, rows: [] };
    let cur = null;
    const tick = () => {
      if (!cur) {
        const j = jobs.shift();
        if (!j) { out.done = true; g.frame = g._frame; g.dev.god = false; return; }
        cur = SMOKE.run1(j[0], j[1]);
        if (!cur.steps) { out.rows.push(cur); cur = null; setTimeout(tick, 0); return; }
      }
      for (let k = 0; k < SMOKE.opts.stepsPerTick; k++) {
        cur.steps();
        const doneOk = g.state === 'climb' || g.state === 'clear' || g.state === 'win';
        if (doneOk || g.state === 'dead' || cur.t > SMOKE.opts.maxT) {
          cur.ok = doneOk; cur.end = doneOk ? 'stairs' : g.state === 'dead' ? 'dead' : 'timeout';
          cur.finish(); out.rows.push(cur); cur = null; break;
        }
      }
      setTimeout(tick, 0);
    };
    tick();
    return out;
  },
  report(tag = 'now') {
    const o = SMOKE.res[tag]; if (!o) return 'nothing under ' + tag;
    const lines = o.rows.map((r) => `${r.which.padEnd(4)} ${String(r.seed).padEnd(6)} ${r.ok ? 'OK ' : r.end.toUpperCase().slice(0, 7).padEnd(7)} ${String(r.t).padStart(4)}s room ${r.room}/${r.rooms} tp ${r.tp} kills ${r.kills} souls ${r.souls} upd ${r.upd}/${r.updMax}ms draw ${r.draw}/${r.drawMax}ms${r.heap ? ' heap ' + r.heap + 'MB' : ''}${r.nan ? ' NaN ' + r.nan : ''}${r.spikes.length ? '\n     spikes ' + r.spikes.join(' ') : ''}${Object.keys(r.errs).length ? '\n     ' + Object.entries(r.errs).map(([k, v]) => v + 'x ' + k).join('\n     ') : ''}`);
    return (o.done ? '' : '(still running)\n') + lines.join('\n');
  },
};
