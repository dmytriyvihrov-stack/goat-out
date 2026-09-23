// Playtest bot: drives a real run from the browser console, a step budget at a time, so a slow
// agent (or a hidden pane) never loses a fight to wall-clock lag. Load after the game:
//   const s = document.createElement('script'); s.src = '/tools/playtest.js'; document.body.appendChild(s);
// Then e.g.  await PT.start();  await PT.play(20);  await PT.shot();
// Every call returns within ~40 s so a console tool with a 45 s timeout never hangs on it.
// The sim only advances while a call is spending its budget: between calls the world is frozen.
window.PT = {
  budget: 0, mv: null, aim: null, log: [], n: 0,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),

  install() {
    if (PT.installed) return;
    const upd = game.update.bind(game);
    // Frozen unless a call has budget; title and menus run free so clicks still work.
    game.update = function (dt) { if (this.state !== 'title') { if (PT.budget <= 0) return; PT.budget -= dt; } upd(dt); };
    const read = game.readMoveInput.bind(game);
    game.readMoveInput = function () {
      read();
      if (PT.mv) { this.input.mx = PT.mv.x; this.input.my = PT.mv.y; }
      if (PT.aim && this.goat) { const dx = PT.aim.x - this.goat.x, dy = PT.aim.y - this.goat.y, d = Math.hypot(dx, dy) || 1; this.input.aim = { x: dx / d, y: dy / d }; }
    };
    const ft = game.floatText.bind(game);
    game.floatText = function (x, y, t, ...a) { PT.log.push(`${(game.timer || 0).toFixed(1)} ${t}`); if (PT.log.length > 200) PT.log.shift(); return ft(x, y, t, ...a); };
    PT.installed = true;
  },

  // Runs `t` seconds of game time with the given input; `lmb`, `roll`, `scream` are one-shot presses.
  async act({ keys = [], t = 0.2, lmb, rmb, roll, scream } = {}) {
    game.keys.clear(); for (const k of keys) game.keys.add(k);
    if (lmb) { game.input.lmbPressed = true; game.input.anyPressed = true; }
    if (roll) game.input.rollPressed = true;
    if (scream) game.input.spacePressed = true;
    if (rmb !== undefined) game.input.rmbDown = rmb;
    PT.budget = t;
    const t0 = performance.now();
    while (PT.budget > 0 && performance.now() - t0 < 5000) await PT.sleep(16);
    game.keys.clear();
    return PT.status();
  },

  status() {
    const g = game.goat;
    return { state: game.state, level: game.levelIndex, hp: g && g.hp, goat: g && g.state, holding: g && g.holding && g.holding.kind,
      kills: game.kills, boons: (game.boons || []).map((b) => b.id), near: PT.near(10).map((e) => `${e.kind}${e.elite ? '*' : ''}:${e.state}@${(PT.dist(e) / TILE).toFixed(1)}`) };
  },
  dist: (p) => Math.hypot(p.x - game.goat.x, p.y - game.goat.y),
  near: (r = 14) => game.enemies.filter((e) => !e.dead && PT.dist(e) < r * TILE).sort((a, b) => PT.dist(a) - PT.dist(b)),
  seen: (r = 8) => PT.near(r).filter((e) => e.woke && !game.hidden(e) && game.sees(game.goat.x, game.goat.y, e.x, e.y)),

  // Title → play, opening scene skipped, pen broken.
  async start({ fresh = true } = {}) {
    PT.install();
    if (fresh) { try { game.clearRun(); } catch (e) { /* none */ } }
    if (game.state === 'title') game.menuPick(0);
    for (let i = 0; i < 60 && game.state !== 'intro' && game.state !== 'play'; i++) await PT.act({ t: 0.1 });
    if (game.state === 'intro') game.skipIntro(true);
    for (let i = 0; i < 60 && game.state !== 'play'; i++) await PT.act({ t: 0.1 });
    await PT.breakPen();
    return PT.status();
  },
  async breakPen() {
    const cage = () => game.props.filter((p) => p.kind === 'cage' && !p.broken).sort((a, b) => PT.dist(a) - PT.dist(b))[0];
    for (let i = 0; i < 20 && !game.cageOpen && cage(); i++) { PT.aim = cage(); await PT.act({ lmb: true, t: 0.6 }); }
    PT.aim = null; return !!game.cageOpen;
  },

  async walkTo(x, y, maxT = 4) {
    const g = game.goat;
    for (let t = 0; t < maxT && game.state === 'play'; t += 0.1) {
      const dx = x - g.x, dy = y - g.y, l = Math.hypot(dx, dy); if (l < 8) break;
      PT.mv = { x: dx / l, y: dy / l }; await PT.act({ t: 0.1 });
    }
    PT.mv = null;
  },

  // One step of a crude but honest player: dodge a committed blow, butt anyone in reach (aiming
  // through him, so walls do the killing), let a far one come, else head for the stairs.
  async step() {
    const g = game.goat, e = PT.seen()[0];
    if (e) {
      const dx = e.x - g.x, dy = e.y - g.y, d = Math.hypot(dx, dy);
      if (['windup', 'slamwind', 'swing', 'aim', 'chargewind', 'charge', 'dart'].includes(e.state) && d < 3.2 * TILE)
        return (await PT.act({ keys: [dx > 0 ? 'KeyA' : 'KeyD', dy > 0 ? 'KeyW' : 'KeyS'], roll: true, t: 0.5 }), 'roll');
      if (d < 2.2 * TILE && g.state === 'idle') { PT.aim = e; await PT.act({ lmb: true, t: 0.4 }); PT.aim = null; return 'butt'; }
      if (d < 6 * TILE) return (await PT.act({ t: 0.1 }), 'wait');
    }
    const door = game.props.find((p) => p.kind === 'door' && !p.broken && !p.gate && (p.open || 0) < 0.5 && PT.dist(p) < 1.6 * TILE);
    if (door && g.state === 'idle') { PT.aim = door; await PT.act({ lmb: true, t: 0.45 }); PT.aim = null; return 'door'; }
    // A soul gate in the way: fetch the nearest soul instead of butting it forever.
    const gate = game.props.find((p) => p.kind === 'door' && p.gate && !p.broken && PT.dist(p) < 2 * TILE);
    if (gate && game.souls && game.souls.length) { await PT.soul(); return 'soul'; }
    const dir = Beast.onward(g, game); if (!dir) return 'nodir';
    const l = Math.hypot(dir.x, dir.y) || 1; PT.mv = { x: dir.x / l, y: dir.y / l };
    await PT.act({ t: 0.15 }); PT.mv = null;
    return 'go';
  },

  // Plays up to `maxT` game seconds (capped by 38 s of wall clock); stops on anything that isn't play.
  async play(maxT = 20) {
    const t0 = performance.now(), acts = [], log0 = PT.log.length;
    for (let t = 0; t < maxT && game.state === 'play' && performance.now() - t0 < 38000;) {
      const before = game.timer; acts.push(await PT.step()); t += Math.max(0.1, game.timer - before);
    }
    if (game.state === 'boon') await PT.takeBoon(0);
    return { ...PT.status(), acts: acts.filter((a) => a !== 'go' && a !== 'wait').slice(-15).join(' '), said: PT.log.slice(log0).slice(-15) };
  },

  async soul() {
    const s = (game.souls || []).slice().sort((a, b) => PT.dist(a) - PT.dist(b))[0]; if (!s) return null;
    await PT.walkTo(s.x, s.y, 8); await PT.act({ t: 0.4 });
    return game.boonChoice && game.boonChoice.map((b) => b.id);
  },
  async takeBoon(i = 0) { if (game.state !== 'boon') return null; const id = game.boonChoice[i] && game.boonChoice[i].id; game.boonArm = 0; game.takeBoon(i); await PT.act({ t: 0.2 }); return id; },
  // Death screen → restart the level.
  async retry() { for (let i = 0; i < 40 && game.state === 'dead'; i++) { game.input.lmbPressed = true; await PT.act({ t: 0.2 }); } await PT.act({ t: 1.2 }); await PT.breakPen(); return PT.status(); },

  // Writes a scaled frame to tools/shots/pt<N>.png through the dev server (the screenshot tool
  // times out when the app window is behind another one).
  async shot(name, w = 800) {
    const c = document.createElement('canvas'); c.width = w; c.height = Math.round(w * game.canvas.height / game.canvas.width);
    c.getContext('2d').drawImage(game.canvas, 0, 0, c.width, c.height);
    name = name || 'pt' + (PT.n++);
    await fetch('/shot?name=' + name, { method: 'POST', body: c.toDataURL('image/png') });
    return name;
  },
};
PT.install();
