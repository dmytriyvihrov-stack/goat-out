// In-page check that every soul (BOONS) does what its card says (10 Oct 2026, "check with the bot whether the
// talismans and the skills give what they promise"). The souls' twin of tools/talisman-check.js. Load after
// `H.startPlay()` (and tools/talisman-check.js, whose scene helpers it borrows):
//   const s = document.createElement('script'); s.src = '/tools/boon-check.js'; document.body.appendChild(s);
//   await BOONCHECK.run();             // every soul, PASS / FAIL and what was seen
//   await BOONCHECK.run(['howl']);     // some
// Each test swallows the one soul (`game.boons`, `applyBoons`), builds a small scene and drives the real
// `game.update` with the same input flags the keys and the mouse set, so a soul wired wrong is a FAIL.
window.BOONCHECK = {
  T: () => window.TALCHECK,
  take(...ids) {
    game.boons = ids.map((id) => BOONS.find((b) => b.id === id)); game.artifacts = []; game.cape = null; game.applyBoons();
    const g = game.goat; g.maxHp = game.mods.maxHp; g.hp = g.maxHp; g.screamCd = 0; g.grabCd = 0; g.rollCd = 0; g.itemCd = 0;
  },
  // A fresh scene: the goat idle in the middle of the biggest room, nobody about, every wait spent.
  scene(...ids) {
    BOONCHECK.take(...ids); const r = BOONCHECK.T().arena(), g = game.goat;
    game.world.fire && game.world.fire.fill(0); game.world.poison && game.world.poison.fill(0);
    g.state = 'idle'; g.runT = 0; g.runUp = 1; g.leap = null; g.holding = null; g.invuln = 0; g.dazed = 0; g.onFire = 0;
    game.timeScale = 1; game.aimSlow = 0; BOONCHECK.move(0, 0); BOONCHECK.aimW = null;
    return r;
  },
  man(dx, dy, kind) { const e = BOONCHECK.T().man(dx, dy, kind); e.noticed = 0; return e; },
  // The camera follows him every step; the pointer is laid again on the same world point after each one.
  steps(n) { for (let i = 0; i < n; i++) { game.update(1 / 60); const A = BOONCHECK.aimW; if (A) { const R = game.renderer, z = game.cam.zoom; game.input.mouse = { x: R.vcx + (A.x - game.cam.x) * z, y: R.vcy + (A.y - game.cam.y) * z * TILT }; } } },
  clear() { const I = game.input; I.lmbPressed = I.spacePressed = I.rollPressed = I.qPressed = I.rmbPressed = false; I.rmbDown = false; I.mx = I.my = 0; BOONCHECK.move(0, 0); BOONCHECK.aimW = null; },
  // `game.update` reads the keys and the pointer itself (`readMoveInput`), so the test holds keys and points the mouse
  // at a screen spot, as a player does; the camera is held on the goat so the spot stays the world point asked for.
  aimAt(x, y) {
    const g = game.goat, R = game.renderer, z = game.cam.zoom, d = Math.hypot(x - g.x, y - g.y) || 1;
    game.input.mouse = { x: R.vcx + (x - game.cam.x) * z, y: R.vcy + (y - game.cam.y) * z * TILT };
    game.input.aim = { x: (x - g.x) / d, y: (y - g.y) / d }; g.aim = game.input.aim; BOONCHECK.aimW = { x, y };
  },
  move(dx, dy) { const k = game.keys; for (const c of ['KeyD', 'KeyA', 'KeyS', 'KeyW']) k.delete(c); if (dx > 0) k.add('KeyD'); if (dx < 0) k.add('KeyA'); if (dy > 0) k.add('KeyS'); if (dy < 0) k.add('KeyW'); },
  press(key, n = 1) { game.input[key] = true; BOONCHECK.steps(n); game.input[key] = false; },
  butt(at) { if (at) BOONCHECK.aimAt(at.x, at.y); BOONCHECK.press('lmbPressed'); },
  // Hold grab for `t` s (the goat lifts whatever is in reach), then let go.
  hold(t) { game.input.rmbDown = true; game.input.rmbPressed = true; BOONCHECK.steps(1); game.input.rmbPressed = false; BOONCHECK.steps(Math.round(t * 60)); },
  release(n = 2) { game.input.rmbDown = false; BOONCHECK.steps(n); },
  crate(dx, dy, kind = 'crate') { const g = game.goat, p = new Prop(g.x + dx * TILE, g.y + dy * TILE, kind); game.props.push(p); return p; },
  // Time from a press of the roll to the goat on his feet again, and how far he went.
  rollRun(dir = { x: 1, y: 0 }) {
    const g = game.goat, x0 = g.x, y0 = g.y; BOONCHECK.aimAt(g.x + dir.x * 100, g.y + dir.y * 100);
    BOONCHECK.move(dir.x, dir.y); game.input.rollPressed = true; BOONCHECK.steps(1); game.input.rollPressed = false; BOONCHECK.move(0, 0);
    let n = 1; while (g.state === 'roll' && n < 200) { BOONCHECK.steps(1); n++; }
    return { dist: Math.hypot(g.x - x0, g.y - y0) / TILE, cd: g.rollCd, speed: Math.hypot(g.vx, g.vy) };
  },
  base() { BOONCHECK.take(); return Object.assign({}, game.mods); },
  tests: {
    collar() {
      const C = BOONCHECK; C.scene(); const g = game.goat, e = C.man(1.2, 0); C.aimAt(e.x, e.y); e.state = 'idle'; e.aware = false;
      C.hold(0.6); const bare = g.holding === e; C.release(); C.clear();
      C.scene('collar'); const e2 = C.man(1.2, 0); C.aimAt(e2.x, e2.y); e2.state = 'idle'; e2.aware = false;
      C.hold(0.6); const took = g.holding === e2;
      return [!bare && took, `a man lifted without the soul: ${bare}, with it: ${took}`];
    },
    howl() {
      const C = BOONCHECK; C.scene('howl'); const near = C.man(2.5, 0), far = C.man(6, 0);
      C.press('spacePressed', 3);
      const R = TUNING.goat.scream; return [near.dazed > 0 && !(far.dazed > 0), `dazed at 2.5 tiles: ${near.dazed > 0} (${near.dazed.toFixed(2)}s), at 6: ${far.dazed > 0}`];
    },
    breath() {
      const C = BOONCHECK; C.scene('breath'); const g = game.goat, e = C.man(1.6, 0); C.aimAt(e.x, e.y);
      C.press('spacePressed', 20);
      const tx = Math.floor((g.x + 1.5 * TILE) / TILE), ty = Math.floor(g.y / TILE), lit = game.world.fire[ty * game.world.W + tx] > 0;
      return [e.burning > 0 || e.dead || lit, `man ahead alight: ${e.burning > 0 || e.dead}, floor ahead burning: ${lit}`];
    },
    bomb() {
      const C = BOONCHECK; C.scene('bomb'); const e = C.man(1.3, 0); C.aimAt(e.x, e.y); e.state = 'idle';
      C.butt(); C.steps(14);
      return [e.bombFuse > 0 || e.exploded, `a fuse on the man butted: ${(e.bombFuse || 0).toFixed(2)}s (exploded ${!!e.exploded})`];
    },
    weight() {
      const C = BOONCHECK; C.scene('weight'); const e = C.man(1.2, 0); e.state = 'idle'; e.aware = false;
      C.rollRun(); return [e.dazed > 0 || e.state === 'stunned', `the man rolled through: dazed ${e.dazed.toFixed(2)}s`];
    },
    splash() {
      // The card: "poisons the enemy you hit and 3 tiles behind you", i.e. every man within 3 tiles at his back.
      const C = BOONCHECK; C.scene('splash'); const e = C.man(1.3, 0), back = C.man(-2.2, 0), far = C.man(-4.5, 0); C.aimAt(e.x, e.y); e.state = back.state = far.state = 'idle';
      C.butt(); C.steps(20);
      return [e.poison > 0 && back.poison > 0 && !(far.poison > 0), `the man butted poisoned: ${e.poison > 0}, one 2.2 tiles behind: ${back.poison > 0}, one 4.5 behind: ${far.poison > 0}`];
    },
    venomjaw() {
      const C = BOONCHECK; C.scene('venomjaw'); const g = game.goat, c = C.crate(1, 0); C.aimAt(c.x, c.y);
      C.hold(game.mods.venomHold + 0.3); const held = g.holding === c, marked = !!(c.venom || c.venomT || c.poisonous);
      const e = C.man(5, 0); C.aimAt(e.x, e.y); C.release(40);
      const W = game.world.W, any = game.world.poison.some((v) => v > 0);
      return [held && (e.poison > 0 || any), `held ${held}, marked ${marked}; the man it hit poisoned ${e.poison > 0}, a puddle laid ${any}`];
    },
    charge() {
      const C = BOONCHECK; C.scene('charge'); const g = game.goat, c = C.crate(1, 0); C.aimAt(c.x, c.y);
      C.hold(game.mods.brandHold + 0.3); const held = g.holding === c;
      const e = C.man(6, 0); C.aimAt(e.x, e.y); C.release(40);
      const lit = game.world.fire.some((v) => v > 0);
      return [held && (lit || e.burning > 0), `held ${held}; the floor behind the throw burns ${lit}, the man it hit alight ${e.burning > 0}`];
    },
    venomroll() {
      const C = BOONCHECK; C.scene('venomroll'); const g = game.goat; C.rollRun();
      const at = game.world.poison[Math.floor(g.y / TILE) * game.world.W + Math.floor(g.x / TILE)] > 0;
      return [at, `a puddle where he landed: ${at}`];
    },
    leapfrog() {
      const C = BOONCHECK; C.scene('leapfrog'); const g = game.goat, e = C.man(2, 0); e.state = 'idle'; e.aware = false;
      const x0 = g.x; let leapt = false;
      C.aimAt(e.x, e.y); game.input.rollPressed = true; C.steps(1); game.input.rollPressed = false; leapt = !!g.leap;
      C.steps(60);
      return [leapt && g.x > e.x && (e.dazed > 0 || e.state === 'stunned' || e.state === 'floored'), `a vault: ${leapt}, landed past him: ${g.x > e.x}, he reels ${e.dazed.toFixed(2)}s (${e.state})`];
    },
    shell() {
      const C = BOONCHECK; C.scene('shell'); const g = game.goat;
      game.input.rollPressed = true; game.input.rollDown = true; C.steps(1); game.input.rollPressed = false;
      const held = () => true; const was = Game.prototype.rollHeldNow; Game.prototype.rollHeldNow = held;
      C.steps(30); const shell = g.state === 'shell'; Game.prototype.rollHeldNow = was; game.input.rollDown = false; C.steps(60);
      return [shell && g.state !== 'shell', `in the shell while held: ${shell}, out after the button: ${g.state !== 'shell'} (${g.state})`];
    },
    spit() {
      const C = BOONCHECK; C.scene('spit'); const e = C.man(4, 0); C.aimAt(e.x, e.y);
      C.press('spacePressed', 1); const flying = (game.globs || []).length > 0; C.steps(90);
      const n = game.world.poison.filter((v) => v > 0).length;
      return [flying && n >= 4, `a glob in the air: ${flying}, poison tiles after it landed: ${n} (6 said)`];
    },
    hide() {
      const C = BOONCHECK, b = C.base().maxHp; C.scene('hide'); const g = game.goat, p = BOONS.find((x) => x.id === 'hide').params;
      return [g.maxHp === b + p.heartsAdd, `max hearts ${b} → ${g.maxHp} (+${p.heartsAdd} said)`];
    },
    stomachs() {
      const C = BOONCHECK, b = C.base(); C.scene('stomachs'); const m = game.mods;
      return [m.maxHp === b.maxHp - 1 && m.grassGain === b.grassGain + 1, `max hearts ${b.maxHp} → ${m.maxHp}, grass +${b.grassGain} → +${m.grassGain}`];
    },
    horns() {
      const C = BOONCHECK, b = C.base(); C.scene('horns'); const m = game.mods, p = BOONS.find((x) => x.id === 'horns').params;
      const reachOk = Math.abs(m.headbuttReach / b.headbuttReach - p.reachMul) < 1e-6, throwOk = Math.abs(m.headbuttImpulse / b.headbuttImpulse - p.impulseMul) < 1e-6;
      const e = C.man(2.1, 0); e.state = 'idle'; C.butt(e); C.steps(20);
      return [reachOk && throwOk && e.state !== 'idle', `reach ×${(m.headbuttReach / b.headbuttReach).toFixed(2)}, throw ×${(m.headbuttImpulse / b.headbuttImpulse).toFixed(2)}; a man 2.1 tiles off is reached: ${e.state !== 'idle'} (${e.state})`];
    },
    skull() {
      const C = BOONCHECK, time = (...ids) => { C.scene(...ids); const g = game.goat; C.aimAt(g.x - 100, g.y); C.butt(); let n = 1; while (g.state !== 'idle' && n < 300) { C.steps(1); n++; } return n / 60; };
      // recovery 0.53 s ×0.6: the whole blow 0.21 s shorter, windup and lunge as before
      const a = time(), b = time('skull'), want = TUNING.goat.headbutt.recovery * (1 - BOONS.find((x) => x.id === 'skull').params.recoveryMul);
      return [Math.abs((a - b) - want) < 0.05, `a headbutt start to idle: ${a.toFixed(2)}s bare, ${b.toFixed(2)}s with it (recovery ×0.6)`];
    },
    neck() {
      const C = BOONCHECK, fling = (run, ...ids) => {
        C.scene(...ids); const g = game.goat; if (run) { g.runT = 9; g.runUp = 1 + TUNING.goat.momentum.max; }
        const e = C.man(1.3, 0); e.state = 'idle'; C.aimAt(e.x, e.y); game.input.lmbPressed = true;
        let v = 0; for (let i = 0; i < 40; i++) { C.steps(1); game.input.lmbPressed = false; if (run) { g.runT = 9; g.runUp = 1 + TUNING.goat.momentum.max; } v = Math.max(v, Math.hypot(e.vx, e.vy)); } return v; };
      const plain = fling(true), still = fling(false, 'neck'), runup = fling(true, 'neck');
      return [runup > plain * 1.2 && runup > still * 1.2, `throw speed: run-up bare ${plain.toFixed(0)}, standing with it ${still.toFixed(0)}, run-up with it ${runup.toFixed(0)}`];
    },
    jaw() {
      const C = BOONCHECK, thr = (...ids) => { C.scene(...ids); const g = game.goat, c = C.crate(1, 0); C.aimAt(g.x + 100, g.y); C.hold(0.3); C.release(1); const v = Math.hypot(c.vx, c.vy); C.steps(1); return [v, g.grabCd]; };
      const a = thr(), b = thr('jaw');
      return [b[0] > a[0] * 1.25 && b[1] < a[1] * 0.7, `a crate thrown at ${a[0].toFixed(0)} → ${b[0].toFixed(0)} px/s; grab back in ${a[1].toFixed(2)} → ${b[1].toFixed(2)}s`];
    },
    coldeye() {
      const C = BOONCHECK; C.scene('coldeye'); const c = C.crate(1, 0); C.aimAt(c.x, c.y); C.hold(0.2);
      const slow = game.aimSlow > 0; C.release(); C.steps(2);
      return [slow, `time slowed on the pick-up: ${slow} (aimSlow ${(game.aimSlow || 0).toFixed(2)})`];
    },
    ricochet() {
      const C = BOONCHECK; const r = C.scene('ricochet'); const g = game.goat;
      g.x = (r.x + 2) * TILE; C.steps(1);
      const sw = C.crate(1, 0, 'weapon'); sw.weapon = 'sword'; sw.uses = 3; sw.inStand = false; C.aimAt(g.x + 100, g.y);
      C.hold(0.3); const e = C.man(0, 3); e.state = 'idle'; e.aware = false; C.aimAt(g.x - 100, g.y);
      C.release(80);
      return [!!sw.glanced || e.dead || e.state !== 'idle', `the sword thrown at the wall glanced: ${!!sw.glanced}; the man hit: ${e.dead || e.state !== 'idle'} (${e.state})`];
    },
    kindling() {
      const C = BOONCHECK; C.scene('kindling'); const a = C.man(3, 0), b = C.man(3.4, 0);
      a.ignite(game, false, false); game.passFire(a, b);
      C.scene(); const c = C.man(3, 0), d = C.man(3.4, 0); c.ignite(game, false, false); game.passFire(c, d);
      return [b.burning > 0 && !(d.burning > 0), `the man touched catches with it: ${b.burning > 0}, without it: ${d.burning > 0}`];
    },
    throat() {
      const C = BOONCHECK, cd = (...ids) => { C.scene(...ids); const g = game.goat; C.press('spacePressed', 2); return g.screamCd; };
      const a = cd('howl'), b = cd('howl', 'throat');
      return [b < a * 0.6, `THE FULL THROAT's wait ${a.toFixed(2)}s → ${b.toFixed(2)}s with it`];
    },
    lungs() {
      const C = BOONCHECK, b = C.base(); C.scene('howl', 'lungs'); const R = game.mods.screamReach;
      const far = C.man(4.2, 0); C.press('spacePressed', 3);
      return [Math.abs(R / b.screamReach - 1.3) < 1e-6 && far.dazed > 0, `reach ×${(R / b.screamReach).toFixed(2)}; with THE FULL THROAT a man 4.2 tiles off dazed: ${far.dazed > 0}`];
    },
    hooves() {
      const C = BOONCHECK, top = (...ids) => { C.scene(...ids); const g = game.goat; C.move(1, 0); let v = 0; for (let i = 0; i < 40; i++) { C.steps(1); v = Math.max(v, Math.hypot(g.vx, g.vy)); } C.move(0, 0); return v; };
      const a = top(), b = top('hooves');
      return [Math.abs(b / a - 1.2) < 0.05, `speed after 0.66 s: ${a.toFixed(0)} → ${b.toFixed(0)} px/s (×${(b / a).toFixed(2)}, 1.2 said)`];
    },
    joints() {
      const C = BOONCHECK; C.scene(); const a = C.rollRun(); C.scene('joints'); const b = C.rollRun();
      return [b.dist > a.dist * 1.2 && b.cd < a.cd * 0.6, `roll ${a.dist.toFixed(2)} → ${b.dist.toFixed(2)} tiles, wait ${a.cd.toFixed(2)} → ${b.cd.toFixed(2)}s`];
    },
    hocks() {
      const C = BOONCHECK; C.scene(); const a = C.rollRun(); C.scene('hocks'); const b = C.rollRun();
      return [b.speed > a.speed * 2, `speed on landing ${a.speed.toFixed(0)} → ${b.speed.toFixed(0)} px/s`];
    },
    ember() {
      const C = BOONCHECK, burn = (...ids) => {
        C.scene(...ids); const g = game.goat, W = game.world.W;
        g.hp = g.maxHp = 9; let n = 0; for (; n < 900 && g.hp > 7; n++) { const i = Math.floor(g.y / TILE) * W + Math.floor(g.x / TILE); game.world.fire[i] = 5; game.world.fireKind && (game.world.fireKind[i] = 0); g.invuln = 0; C.steps(1); } return n / 60; };
      const a = burn(), b = burn('ember');
      return [b > a * 2, `two hearts lost standing in fire in ${a.toFixed(2)}s bare, ${b.toFixed(2)}s with it (×3 said)`];
    },
    oracle() {
      const C = BOONCHECK; C.scene(); game.world.computeVis(game.goat.x, game.goat.y, TUNING.fog.radius, 0); const a = game.world.vis.reduce((s, v) => s + (v ? 1 : 0), 0);
      C.scene('oracle'); game.world.computeVis(game.goat.x, game.goat.y, TUNING.fog.radius, game.mods.oracle ? TUNING.fog.oracle : 0); const b = game.world.vis.reduce((s, v) => s + (v ? 1 : 0), 0);
      return [b > a, `tiles seen ${a} → ${b}`];
    },
    hunger() {
      const C = BOONCHECK; C.scene('hunger'); game.talRun = null; game.tal = null; Talisman.st(game);
      game.openBoonChoice(); const n = (game.boonChoice || []).length; game.boonChoice = null; game.state = 'play';
      return [n === 3, `cards dealt on a soul: ${n} (3 said)`];
    },
  },
  async run(only) {
    const keep = { boons: game.boons.slice(), arts: game.artifacts, cape: game.cape, god: game.dev.god, x: game.goat.x, y: game.goat.y };
    const rows = [];
    for (const id of Object.keys(BOONCHECK.tests)) {
      if (only && !only.includes(id)) continue;
      let r; try { r = BOONCHECK.tests[id](); } catch (e) { r = [false, 'threw: ' + e.message]; }
      BOONCHECK.clear(); rows.push([id, r[0], r[1]]);
    }
    const missing = BOONS.filter((b) => !BOONCHECK.tests[b.id]).map((b) => b.id);
    if (!only && missing.length) rows.push(['(untested)', false, missing.join(', ')]);
    game.boons = keep.boons; game.artifacts = keep.arts; game.cape = keep.cape; game.dev.god = keep.god; game.applyBoons(); game.state = 'play';
    const text = rows.map((r) => `${r[1] ? 'PASS' : 'FAIL'}  ${r[0].padEnd(10)} ${r[2]}`).join('\n');
    console.log(text); return text;
  },
};
