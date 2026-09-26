// The frame profiler: where a frame's milliseconds go, method by method. Load it in the page on the
// dev server (no harness needed — it drives the simulation itself, off the clock):
//   const s = document.createElement('script'); s.src = '/tools/perf.js'; document.body.appendChild(s);
//   await PERF.frames('L1', 11, 200)      -> avg / p95 / max ms of update and draw, a busy room, men dying
//   await PERF.top('L1', 11, 200)         -> the same run with every method timed (inclusive), heaviest first
//   await PERF.spikes('L1', 11, 200, 25)  -> each frame over 25 ms and what it spent them on
// A floor is `L<i>`, `N` (THE DARK) or `T<i>` (THE TRIP in LEVELS[i]'s place), as in tools/smoke.js.
// Times are the main thread's: on a GPU canvas a draw call is only recorded here and rastered later,
// so what this sees is recording, CPU-side canvases and the upload of any small canvas that was
// changed since it was last drawn (about a millisecond each) — which is exactly what stutters.
// Every frame is its own task (`tick`, a message, which a hidden pane does not throttle the way it
// does a timer): drawn back to back in one task, a few hundred frames of GPU commands pile up and
// land as 100–470 ms stalls inside whatever `drawImage` happens to flush them, which no player sees.
// The first run of a floor in a fresh page includes every first-time bake; run it twice to see both.
window.PERF = {
  acc: {}, cnt: {}, on: false, wrapped: false,
  // Every method of the classes and objects the frame runs through, timed while `on` — all but the
  // tiny ones called thousands of times a frame (`hot`), whose two clock reads a call would outweigh
  // them and inflate everything above them (a flame bake read as 440 ms that costs 14).
  hot: new Set(['hash', 'noise', 'bayer', 'isSolid', 'tileAt', 'walkable', 'walkableAt', 'seesTile', 'idx', 'isPitPx',
    'isBurningPx', 'isWitchPx', 'tileAtPx', 'hidden', 'lift', 'rgb', 'canvas', 'cellDisc', 'open', 'inSight', 'los', 'clearLine']),
  wrap() {
    if (this.wrapped) return; this.wrapped = true;
    const P = this;
    const one = (owner, name, label) => {
      if (P.hot.has(name)) return;
      const d = Object.getOwnPropertyDescriptor(owner, name);
      if (!d || typeof d.value !== 'function' || d.value.__perf || name === 'constructor') return;
      const f = d.value;
      const w = function (...a) {
        if (!P.on) return f.apply(this, a);
        const t = performance.now();
        try { return f.apply(this, a); } finally { P.acc[label] = (P.acc[label] || 0) + performance.now() - t; P.cnt[label] = (P.cnt[label] || 0) + 1; }
      };
      w.__perf = f;
      try { Object.defineProperty(owner, name, Object.assign({}, d, { value: w })); } catch (e) { /* frozen */ }
    };
    const classes = { Renderer, PaintedArt, CombatFX, Game, Enemy, World, Goat, Prop };
    if (typeof AltarArt !== 'undefined') classes.AltarArt = AltarArt;
    for (const [n, C] of Object.entries(classes)) {
      for (const k of Object.getOwnPropertyNames(C.prototype)) one(C.prototype, k, n + '.' + k);
      for (const k of Object.getOwnPropertyNames(C)) if (!['length', 'name', 'prototype'].includes(k)) one(C, k, n + '.' + k);
    }
    const objs = { Dark, Status, Talisman, Beast, Shop, PIXEL_ART, PIXEL_ENV, PROP_PIXELS, OGRE_PIXELS, HORSE_PIXELS, FLOOR_SHEET,
      STUDY: typeof STUDY !== 'undefined' ? STUDY : null, GameAudio: Object.getPrototypeOf(game.audio) };
    for (const [n, o] of Object.entries(objs)) if (o) for (const k of Object.getOwnPropertyNames(o)) one(o, k, n + '.' + k);
  },
  setup(which, seed) {
    const g = game;
    g.forgetLessons(); g.boons = []; g.artifact = null; g.levelArtifact = null; g.beasts = {};
    g.runJumped = true; g.tripAt = -1; g.darkAt = -1; g.deaths = 0; g.runSeed = seed;
    let li;
    if (which === 'N') { li = DARK_LEVEL.darkOf; g.darkAt = li; }
    else if (which[0] === 'T') { li = +which.slice(1); g.tripAt = li; }
    else li = +which.slice(1);
    g.startLevel(li, seed, false, false);
    g.dev.god = true; g.autoPause = false; g.state = 'play';
    // The room with the most men in the back half of the floor, the goat in it and all of them up.
    let room = null, most = -1;
    for (const r of g.level.rooms) {
      if (r.index < g.level.rooms.length * 0.4) continue;
      const n = g.enemies.filter((e) => !e.dead && e.room === r.index).length;
      if (n > most) { most = n; room = r; }
    }
    for (let k = 0; k < 300; k++) {
      const tx = room.x + 1 + ((Math.random() * (room.w - 2)) | 0), ty = room.y + 1 + ((Math.random() * (room.h - 2)) | 0);
      if (g.world.walkableAt(tx, ty)) { g.goat.x = (tx + 0.5) * TILE; g.goat.y = (ty + 0.5) * TILE; break; }
    }
    g.cam.x = g.goat.x; g.cam.y = g.goat.y;
    for (const e of g.enemies) if (!e.dead && Math.abs(e.room - room.index) <= 1) { e.aware = true; e.woke = true; }
    return room;
  },
  // One frame of a fight: every `every` frames the nearest man dies (a splat, every other one torn
  // by a blast) and a patch of floor goes up, so blood, bodies, pools and flame are all in it.
  step(i, every) {
    const g = game;
    if (every && i % every === 0) {
      const near = g.enemies.filter((e) => !e.dead && Math.hypot(e.x - g.goat.x, e.y - g.goat.y) < 12 * TILE);
      if (near.length) near[0].die(g, i % (every * 2) ? 'splat' : 'boom', 1, 0);
      g.world.ignitePool(g.goat.x + (Math.random() - 0.5) * 6 * TILE, g.goat.y + (Math.random() - 0.5) * 4 * TILE, 1.2, i % (every * 3) === 0);
    }
    const t0 = performance.now(); g.update(1 / 60);
    const t1 = performance.now(); g.renderer.draw(g, 1 / 60);
    return [t1 - t0, performance.now() - t1];
  },
  stats(a) {
    const s = a.slice().sort((x, y) => x - y);
    return { avg: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(1), max: +s[s.length - 1].toFixed(1) };
  },
  tick() {
    if (!this.port) { const ch = new MessageChannel(); this.port = ch.port2; ch.port1.onmessage = () => { const r = this.wake; this.wake = null; if (r) r(); }; }
    return new Promise((r) => { this.wake = r; this.port.postMessage(0); });
  },
  async frames(which, seed, n, every = 40) {
    this.setup(which, seed);
    const upd = [], drw = [];
    for (let i = 0; i < n; i++) { const [u, d] = this.step(i, every); upd.push(u); drw.push(d); await this.tick(); }
    return `${which} update ${JSON.stringify(this.stats(upd))} draw ${JSON.stringify(this.stats(drw))}`;
  },
  async top(which, seed, n, every = 40, rows = 30) {
    this.wrap(); this.setup(which, seed);
    for (let i = 0; i < 30; i++) { this.step(i, every); await this.tick(); }
    this.acc = {}; this.cnt = {};
    for (let i = 0; i < n; i++) { this.on = true; try { this.step(i, every); } finally { this.on = false; } await this.tick(); }
    return Object.entries(this.acc).sort((a, b) => b[1] - a[1]).slice(0, rows)
      .map(([k, v]) => `${k} ${(v / n).toFixed(3)} ms x${(this.cnt[k] / n).toFixed(1)}`);
  },
  async spikes(which, seed, n, over = 25, every = 40) {
    this.wrap(); this.setup(which, seed);
    const out = [];
    for (let i = 0; i < n; i++) {
      await this.tick();
      this.acc = {}; this.cnt = {}; this.on = true;
      let u, d; try { [u, d] = this.step(i, every); } finally { this.on = false; }
      if (u + d > over) out.push(`#${i} update ${u.toFixed(1)} draw ${d.toFixed(1)}: ` + Object.entries(this.acc)
        .filter(([k]) => k !== 'Game.update' && k !== 'Renderer.draw').sort((a, b) => b[1] - a[1]).slice(0, 7)
        .map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', '));
    }
    return out;
  },
};
