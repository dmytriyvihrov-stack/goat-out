// How the hounds run. Load it in the page (it drives the simulation itself, off the clock):
//   const s = document.createElement('script'); s.src = '/tools/hounds.js'; document.body.appendChild(s);
//   HOUNDS.sweep([1, 2, 4], [1, 2, 3], [1, 3], ['still', 'circle', 'shuttle'], 12)
//   HOUNDS.arrive([1, 2, 3, 4, 5, 6, 7], [1, 2], 20)
//   HOUNDS.crowd([1, 2, 3, 4, 5, 6, 7], [1, 2], { men: 2, mode: 'post' })   // bodies in the way
//   await HOUNDS.draw('name')        // the last scene's lines, to tools/shots/name.png
//
// One scene: a level is started, the goat is put on clear floor in the middle of one of its ordinary
// rooms, every man in the level is taken off, `n` hounds are dropped aware round him (the dev
// spawner's own spot) and the goat stands (`still`), walks a ring (`circle`) or walks side to side
// (`shuttle`) for `secs` seconds. God mode is on; the real frame loop is off while it runs. Per hound:
//   flips  — reversals a second: his run turning more than 92° between one step and the next
//   slide  — share of the time he moves with his body more than 90° off the way he is going
//   stuck  — seconds in the chase moving less than a third of his own pace
//   plant  — share of the time in the windup; ring — share circling (in the chase, near the ring)
//   runs   — runs a minute; dist — mean tiles from the goat
// `arrive` is 1.57's measure for the routes: a hound and a goat in random spots of every room, and
// who never gets onto the ring round him in `secs` seconds.
window.HOUNDS = {
  stop() { if (!game._frame) game._frame = game.frame; game.frame = function (t) { this.last = t; }; },
  go() { if (game._frame) { game.frame = game._frame; game._frame = null; } },
  level(li, seed) {
    HOUNDS.stop();
    game.startLevel(li, seed, false, false);
    game.dev.god = true;
    for (let i = 0; i < 2000 && game.state !== 'play'; i++) game.update(1 / 60);
    for (let i = 0; i < 10; i++) game.update(1 / 60);
  },
  // The floor tile nearest the room's middle with nothing solid round it.
  middle(r) {
    const w = game.world, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    let best = null, bd = 1e9;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      let ok = !w.isPitPx((x + 0.5) * TILE, (y + 0.5) * TILE);
      for (let oy = -1; oy <= 1 && ok; oy++) for (let ox = -1; ox <= 1; ox++) if (w.isSolid(x + ox, y + oy)) ok = false;
      if (!ok) continue;
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d < bd) { bd = d; best = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE }; }
    }
    return best;
  },
  drive(mx, my) { game.readMoveInput = function () { this.input.mx = mx; this.input.my = my; }; },
  // `men` clubmen are dropped awake round him as well: a pack working in a crowd of its own.
  scene(li, seed, ri, n, mode, secs, men = 0) {
    HOUNDS.level(li, seed);
    const rooms = game.level.rooms;
    if (ri == null) { const ok = rooms.filter((r) => ['canon', 'mix'].includes(r.role) && r.w >= 9 && r.h >= 8); ri = (ok[seed % ok.length] || rooms[1]).index; }
    const r = rooms[ri], c = HOUNDS.middle(r);
    if (!c) return null;
    const g = game.goat; g.x = c.x; g.y = c.y; g.vx = 0; g.vy = 0; game.cam.x = c.x; game.cam.y = c.y;
    game.enemies.length = 0; game.souls.length = 0;
    // No escorts: a goose's honk breaks a hound's run, which is the goose's job and not the hound's.
    game.props = game.props.filter((p) => !['coop', 'goose', 'tortoise', 'crow', 'chicken'].includes(p.kind));
    // The flow field is laid round the goat every 0.15 s, and the spawner asks it: a beat first.
    HOUNDS.drive(0, 0); for (let i = 0; i < 12; i++) game.update(1 / 60);
    const dogs = []; for (let i = 0; i < n; i++) { const e = game.spawnEnemy('dog'); if (e) dogs.push(e); }
    for (let i = 0; i < men; i++) game.spawnEnemy('bearer');
    const rec = dogs.map(() => []), goatRec = [];
    const R = Math.min(r.w, r.h) * 0.3 * TILE; let t = 0;
    for (let s = 0; s < secs * 60; s++) {
      t += 1 / 60; let tx = c.x, ty = c.y;
      if (mode === 'circle') { tx = c.x + Math.cos(t * 0.9) * R; ty = c.y + Math.sin(t * 0.9) * R; }
      else if (mode === 'shuttle') tx = c.x + (Math.floor(t / 1.6) % 2 ? R : -R);
      const dx = tx - g.x, dy = ty - g.y, l = Math.hypot(dx, dy) || 1;
      HOUNDS.drive(l > 4 ? dx / l : 0, l > 4 ? dy / l : 0);
      game.update(1 / 60);
      goatRec.push([g.x, g.y]);
      dogs.forEach((e, i) => rec[i].push([e.x, e.y, e.state, e.facing, e.vx, e.vy, e.dead ? 1 : 0]));
    }
    delete game.readMoveInput;
    HOUNDS.last = { li, seed, ri, rec, goatRec };
    return HOUNDS.measure();
  },
  measure() {
    const { rec, goatRec } = HOUNDS.last, out = [];
    for (const R of rec) {
      let flips = 0, slide = 0, moving = 0, stuck = 0, plant = 0, ring = 0, runs = 0, dist = 0, prev = null, n = 0;
      for (let i = 1; i < R.length; i++) {
        const [x, y, s, f, vx, vy, dead] = R[i];
        if (dead) break;
        n++;
        const sp = Math.hypot(vx, vy);
        if (sp > 30) {
          const a = Math.atan2(vy, vx);
          if (prev !== null && Math.abs(angleDiff(prev, a)) > 1.6) flips++;
          prev = a; moving++;
          if (Math.abs(angleDiff(f, a)) > Math.PI / 2 && s !== 'dodge') slide++;
        } else prev = null;
        if (s === 'chase' && sp > 30 && Math.hypot(x - R[i - 1][0], y - R[i - 1][1]) * 60 < sp / 3) stuck++;
        if (s === 'windup') plant++;
        if (s === 'chase' && Math.hypot(x - goatRec[i][0], y - goatRec[i][1]) < TUNING.dog.circle * TILE * TUNING.dog.ringIn * 1.1) ring++;
        if (s === 'dart' && R[i - 1][2] !== 'dart') runs++;
        dist += Math.hypot(x - goatRec[i][0], y - goatRec[i][1]) / TILE;
      }
      const secs = n / 60 || 1;
      out.push({ flips: +(flips / secs).toFixed(2), slide: +(slide / (moving || 1)).toFixed(2), stuck: +(stuck / 60).toFixed(1),
        plant: +(plant / n).toFixed(2), ring: +(ring / n).toFixed(2), runs: +(runs / secs * 60).toFixed(1), dist: +(dist / n).toFixed(1) });
    }
    return out;
  },
  // Every scene of the grid, averaged over the hounds in it.
  sweep(levels, seeds, counts, modes, secs = 12, men = 0) {
    const res = {};
    for (const n of counts) for (const mode of modes) {
      const all = [];
      for (const li of levels) for (const seed of seeds) { const m = HOUNDS.scene(li, seed * 7919, null, n, mode, secs, men); if (m) all.push(...m); }
      const avg = {};
      for (const k of Object.keys(all[0] || {})) avg[k] = +(all.reduce((s, m) => s + m[k], 0) / all.length).toFixed(2);
      res[n + ' ' + mode] = avg;
    }
    HOUNDS.go();
    return res;
  },
  arrive(levels, seeds, secs = 20) {
    let tries = 0, never = 0; const where = []; HOUNDS.fails = [];
    for (const li of levels) for (const seed of seeds) {
      HOUNDS.level(li, seed * 104729);
      const w = game.world, g = game.goat, rooms = game.level.rooms.filter((r) => r.role !== 'pen');
      const spot = (r) => { for (let k = 0; k < 80; k++) { const x = (r.x + Math.random() * r.w) * TILE, y = (r.y + Math.random() * r.h) * TILE; if (!w.isSolid(Math.floor(x / TILE), Math.floor(y / TILE)) && !w.isPitPx(x, y) && w.flowDist(x, y) >= 0) return { x, y }; } return null; };
      for (const r of rooms) {
        const a = spot(r), b = spot(r); if (!a || !b) continue;
        // No souls: a goat dropped on one is in the boon choice, the level stands still, and the
        // hound was counted as never arriving.
        game.enemies.length = 0; game.souls.length = 0;
        g.x = b.x; g.y = b.y; g.vx = 0; g.vy = 0; game.cam.x = g.x; game.cam.y = g.y;
        for (let i = 0; i < 12; i++) game.update(1 / 60);
        const e = new Enemy(a.x, a.y, 'dog'); e.aware = true; e.woke = true; e.state = 'chase'; game.enemies.push(e);
        HOUNDS.drive(0, 0);
        let ok = false; const rec = [], goatRec = [];
        for (let s = 0; s < secs * 60 && !ok; s++) {
          game.update(1 / 60);
          e.lungeCd = 99;   // he is being asked to get there, not to bite
          rec.push([e.x, e.y, e.state, e.facing, e.vx, e.vy, 0]); goatRec.push([g.x, g.y]);
          if (Math.hypot(e.x - g.x, e.y - g.y) < TUNING.dog.circle * TILE * 1.3 && game.sees(e.x, e.y, g.x, g.y)) ok = true;
        }
        tries++;
        // Each miss is kept whole: `HOUNDS.last = HOUNDS.fails[k]` and `draw` shows it.
        if (!ok) { never++; where.push([li, r.index, Math.round(e.x / TILE), Math.round(e.y / TILE)]); HOUNDS.fails.push({ li, ri: r.index, rec: [rec], goatRec }); }
      }
    }
    delete game.readMoveInput; HOUNDS.go();
    return { tries, never, where: where.slice(0, 12) };
  },
  // `crowd` is the same question with bodies in the way (24 Sep 2026, "he cannot get round his
  // own"): a hound and a goat `min`+ tiles apart in one room, and `men` of the cult stood on the
  // tiles of the plain field between them — a clubman and a packmate by turns. `mode` 'post': they
  // hold their spot whatever leans on them (a man mid-swing, a back in a doorway); 'stand': they
  // stand, but a shove moves them; 'chase': they are awake and after the goat too. Per scene:
  // whether he got onto the ring (`never` counts the misses, `died` those of them he did not live
  // through — a grating, a drop), how long it took, `lean` — seconds pressed against one of them —
  // and `stuck` as `measure` counts it. Math.random is seeded while it runs, so a before and an
  // after see the same rolls.
  crowd(levels, seeds, { men = 2, mode = 'post', secs = 15, min = 6 } = {}) {
    const real = Math.random; let s = 0;
    const rnd = () => { let t = (s += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    let tries = 0, never = 0, died = 0, time = 0, lean = 0, stuck = 0; const where = []; HOUNDS.fails = [];
    try {
      for (const li of levels) for (const seed of seeds) {
        Math.random = real;
        HOUNDS.level(li, seed * 104729);
        s = seed * 7919 + li * 31; Math.random = rnd;
        const w = game.world, g = game.goat, rooms = game.level.rooms.filter((r) => r.role !== 'pen' && r.w >= 6 && r.h >= 5);
        const spot = (r) => { for (let k = 0; k < 80; k++) { const x = (r.x + Math.random() * r.w) * TILE, y = (r.y + Math.random() * r.h) * TILE; if (!w.isSolid(Math.floor(x / TILE), Math.floor(y / TILE)) && !w.isPitPx(x, y) && w.flowDist(x, y) >= 0) return { x, y }; } return null; };
        for (const r of rooms) {
          let a = null, b = null;
          for (let k = 0; k < 20 && !a; k++) { const p = spot(r), q = spot(r); if (p && q && len(p.x - q.x, p.y - q.y) >= min * TILE) { a = p; b = q; } }
          if (!a) continue;
          game.enemies.length = 0; game.souls.length = 0;
          g.x = b.x; g.y = b.y; g.vx = 0; g.vy = 0; game.cam.x = g.x; game.cam.y = g.y;
          HOUNDS.drive(0, 0);
          for (let i = 0; i < 12; i++) game.update(1 / 60);
          // The plain field from his tile to the goat: the line he would run with nobody on it.
          const route = []; let tx = Math.floor(a.x / TILE), ty = Math.floor(a.y / TILE);
          for (let k = 0; k < 80; k++) { const i = w.flowStep(tx, ty, w.flow); if (i < 0) break; tx = i % w.W; ty = (i / w.W) | 0; route.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }); }
          const posts = [];
          for (let m = 0; m < men; m++) {
            const p = route[Math.floor(route.length * (0.3 + 0.45 * (m + 0.5) / men))];
            if (!p || len(p.x - a.x, p.y - a.y) < 1.5 * TILE || len(p.x - g.x, p.y - g.y) < 1.5 * TILE) continue;
            const o = new Enemy(p.x, p.y, m % 2 ? 'dog' : 'bearer'); o.woke = true;
            if (mode === 'chase') { o.aware = true; o.state = 'chase'; }
            game.enemies.push(o); posts.push({ e: o, x: p.x, y: p.y });
          }
          const e = new Enemy(a.x, a.y, 'dog'); e.aware = true; e.woke = true; e.state = 'chase'; game.enemies.push(e);
          let ok = false, t = 0; const rec = [], goatRec = [];
          for (let st = 0; st < secs * 60 && !ok; st++) {
            const px = e.x, py = e.y;
            game.update(1 / 60); t += 1 / 60;
            e.lungeCd = 99;   // he is being asked to get there, not to bite
            for (const q of posts) {
              if (mode === 'chase') { q.e.lungeCd = 99; continue; }
              // Stood: never awake, never walking; a post is put back where it was every step too.
              q.e.aware = false; q.e.state = 'idle'; q.e.vx = 0; q.e.vy = 0; q.e.wanderT = 9;
              if (mode === 'post') { q.e.x = q.x; q.e.y = q.y; }
            }
            if (posts.some((q) => !q.e.dead && len(q.e.x - e.x, q.e.y - e.y) < q.e.r + e.r + 3)) lean += 1 / 60;
            const sp = Math.hypot(e.vx, e.vy);
            if (e.state === 'chase' && sp > 30 && Math.hypot(e.x - px, e.y - py) * 60 < sp / 3) stuck += 1 / 60;
            rec.push([e.x, e.y, e.state, e.facing, e.vx, e.vy, 0]); goatRec.push([g.x, g.y]);
            if (Math.hypot(e.x - g.x, e.y - g.y) < TUNING.dog.circle * TILE * 1.3 && game.sees(e.x, e.y, g.x, g.y)) ok = true;
          }
          tries++; if (e.dead) died++;
          HOUNDS.last = { li, seed, ri: r.index, rec: [rec], goatRec, men: posts.map((q) => ({ x: q.e.x, y: q.e.y, r: q.e.r })) };
          if (ok) time += t; else { never++; where.push([li, r.index, Math.round(e.x / TILE), Math.round(e.y / TILE)]); HOUNDS.fails.push(HOUNDS.last); }
        }
      }
    } finally { Math.random = real; delete game.readMoveInput; HOUNDS.go(); }
    return { tries, never, died, time: +(time / ((tries - never) || 1)).toFixed(2), lean: +(lean / (tries || 1)).toFixed(2), stuck: +(stuck / (tries || 1)).toFixed(2), where: where.slice(0, 12) };
  },
  async draw(name, from = 0, to = 1e9) {
    const { ri, rec, goatRec } = HOUNDS.last, r = game.level.rooms[ri], w = game.world, S = 22, pad = 3;
    const x0 = r.x - pad, y0 = r.y - pad, W = r.w + pad * 2, H = r.h + pad * 2;
    const cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S; const c = cv.getContext('2d');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const tx = x0 + x, ty = y0 + y;
      c.fillStyle = w.isSolid(tx, ty) ? '#555' : w.isPitPx((tx + 0.5) * TILE, (ty + 0.5) * TILE) ? '#000' : '#8a7f6a';
      c.fillRect(x * S, y * S, S - 1, S - 1);
    }
    for (const p of game.props) {
      if (p.broken || !p.blocking) continue;
      c.fillStyle = '#3a6'; c.beginPath(); c.arc((p.x / TILE - x0) * S, (p.y / TILE - y0) * S, p.r / TILE * S, 0, 7); c.fill();
    }
    // `crowd`'s men where the scene left them.
    for (const m of HOUNDS.last.men || []) { c.fillStyle = '#b33'; c.beginPath(); c.arc((m.x / TILE - x0) * S, (m.y / TILE - y0) * S, m.r / TILE * S, 0, 7); c.fill(); }
    const P = (x, y) => [(x / TILE - x0) * S, (y / TILE - y0) * S];
    const col = { chase: '#4af', windup: '#ff0', dart: '#f22', recover: '#f8f', retreat: '#0f8', dodge: '#fff' };
    c.lineWidth = 2; c.strokeStyle = '#fff8'; c.beginPath();
    goatRec.slice(from, to).forEach(([x, y], i) => { const [a, b] = P(x, y); if (i) c.lineTo(a, b); else c.moveTo(a, b); }); c.stroke();
    for (const R of rec) {
      const seg = R.slice(from, to);
      for (let i = 1; i < seg.length; i++) {
        c.strokeStyle = col[seg[i][2]] || '#888'; c.beginPath();
        const [a, b] = P(seg[i - 1][0], seg[i - 1][1]), [a2, b2] = P(seg[i][0], seg[i][1]);
        c.moveTo(a, b); c.lineTo(a2, b2); c.stroke();
      }
    }
    const res = await fetch('/shot?name=' + name, { method: 'POST', body: cv.toDataURL('image/png') });
    return res.text();
  },
};
