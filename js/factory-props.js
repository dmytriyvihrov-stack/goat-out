// THE FACTORY's furniture (14 Oct 2026, his ask: "more objects that can stand in the space, so it looks more organic";
// the same day, of the first cut: "the objects are terrible and over-detailed, there should be fewer, and more in our
// pixel style"): a few things, every one hand-placed cells on PROP_PIXELS.Grid in the props' own palette and texel, the
// way the crate, the barrel and the brazier are.
// 16 Oct 2026, his marks on the factory doc: the boiler, the cabinet, the anvil, the drums, the cable reel, the pipe, the
// offal and the gauge are gone; what is left:
//   the GAS CYLINDER (a crate with `gas`, js/entities.js): picked up and thrown like a crate, and where it breaks the gas
//     goes off in a shove that throws every man round it away (`gasBurst`, `TUNING.prop.gas`). It never hurts anybody
//     itself (pillar 3): the wall he is thrown into does.
//   `junk` (`look`): GEARS on the floor, drawn quiet so it reads as dressing (his: "less visible, clearer that it is
//     decoration"). The oil stain became a mechanic of its own (`Oil`, at the foot of this file).
//   `wallfix` (`look`): on the far wall's face, like THE DARK's lantern (`Prop.wall`): a red VALVE wheel, a caged
//     bulkhead LAMP that flickers and lays a pool of light in cells, a VENT grille that breathes steam.
//   the factory's `machine` (`MACHINES`) is the frame for standing furniture, empty since the marks.
//   a VENT in a side wall (`ventPassage`, `drawVentWall`): a wall that gives, its tunnel through the rock to the next room.
// Also THE ARM's base (`arm-base`, js/factory-pixels.js `drawArm`) and the steel post that stands where a template's
// pillar would (`FACTORY_PIXELS.pillar`, `fac-post`). Laid by THE FACTORY's templates (js/factory.js,
// `FACTORY_TEMPLATES`) and THE SHOWROOM. Loads after scatter.js.
const FACTORY_PROPS = (() => {
  const { P, Grid, sprites } = PROP_PIXELS, TX = 1.35;
  const rng = (seed) => () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const bolt = (g, x, y) => { g.set(x, y, P.i4); g.set(x + 1, y, P.i3); g.set(x, y + 1, P.i3); g.set(x + 1, y + 1, P.i1); };
  // the industrial yellow of THE ARM, four steps (14 Oct 2026, his: "yellow was our threat": it is the arm's alone)
  const Y = ['#5a4210', '#9c741c', '#d9a52c', '#f5d262'];

  // ---------------------------------------------------------------- one gas cylinder, 9 x 24: a red bottle, a valve cap
  function gas() {
    const g = new Grid(9, 24);
    g.rect(1, 5, 7, 18, P.r2); g.vl(1, 5, 18, P.r3); g.vl(2, 5, 18, P.r3); g.vl(7, 5, 18, P.r0); g.vl(6, 5, 18, P.r1);   // the bottle, lit on its left
    g.hl(2, 4, 5, P.r2); g.hl(3, 3, 3, P.r3);                                                                            // the shoulder
    g.rect(3, 0, 3, 3, P.i2); g.hl(3, 0, 3, P.i4); g.set(6, 1, P.i1);                                                   // the valve cap
    g.rect(1, 10, 7, 3, P.c1); g.hl(1, 10, 7, P.c2); g.set(3, 11, P.r0); g.set(5, 11, P.r0);                             // the label
    g.hl(1, 22, 7, P.r0); g.hl(2, 23, 5, P.i0);                                                                          // the foot ring
    return g.outline();
  }
  // ---------------------------------------------------------------- the junk: gears, small, flat and dull
  // 19 Oct 2026, the test lab ("I did not see the junk and the gears"): a heap a size up, lit iron with an ink outline, so
  // it reads on any factory floor; still flat and low, nothing anybody meets
  function gears() {
    const g = new Grid(20, 14), tooth = (cx, cy, r, n, col) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; g.set(Math.round(cx + Math.cos(a) * (r + 1)), Math.round(cy + Math.sin(a) * (r + 1) * 0.8), col); } };
    g.ell(6, 7, 5, 4, P.i2); g.ring(6, 7, 5, 4, 1, P.i3); tooth(6, 7, 5, 10, P.i3); g.ell(6, 7, 2, 2, P.i1); g.set(6, 7, P.i4); g.hl(3, 4, 3, P.i4);
    g.ell(14, 9, 3, 2, P.i2); g.ring(14, 9, 3, 2, 1, P.i3); tooth(14, 9, 3, 7, P.i3); g.set(14, 9, P.i1); g.set(13, 7, P.i4);
    g.rect(15, 3, 3, 2, P.i3); g.set(16, 3, P.i4);   // a loose nut
    return g.outline();
  }
  // ---------------------------------------------------------------- on the wall
  function valve() { const g = new Grid(13, 15); g.rect(5, 9, 3, 6, P.b2); g.vl(5, 9, 6, P.b3); g.vl(7, 9, 6, P.b0); g.ring(6, 6, 6, 6, 2, P.h2); g.line(6, 1, 6, 11, P.h2); g.line(1, 6, 11, 6, P.h2); g.ell(6, 6, 2, 2, P.h1); g.set(6, 6, P.i4); return g.outline(); }
  // A bulkhead lamp (16 Oct 2026, his mark "redo"): a round iron frame bolted to the wall, a cross guard over the glass,
  // the bulb lit through it; `k` 1 is the flicker, a dimmer glass. Cool white: yellow is the threat's colour.
  function lamp(k) {
    const g = new Grid(13, 13), glass = k ? '#8fa3ad' : '#d6e4ea', core = k ? '#b8c8d0' : '#f4fbff';
    g.ell(6, 6, 6, 6, P.i1); g.ring(6, 6, 6, 6, 1, P.i3);                                  // the frame
    for (const [x, y] of [[6, 0], [0, 6], [12, 6], [6, 12]]) g.set(x, y, P.i4);              // its four bolts
    g.ell(6, 6, 4, 4, glass); g.ell(6, 6, 2, 2, core);                                      // the glass, the bulb
    g.hl(2, 6, 9, P.i2); g.vl(6, 2, 9, P.i2);                                               // the cross guard
    g.set(4, 4, '#ffffff');                                                                 // a glint
    return g.outline();
  }
  function vent() { const g = new Grid(15, 11); g.rect(0, 0, 15, 11, P.i1); g.hl(0, 0, 15, P.i3); g.vl(0, 0, 11, P.i3); g.hl(0, 10, 15, P.i0); for (let y = 2; y < 10; y += 2) { g.hl(2, y, 11, P.i0); g.hl(2, y + 1, 11, P.i2); } bolt(g, 1, 1); bolt(g, 12, 1); return g.outline(); }
  // A vent seen from above in the top of a wall (the passage's mouth): a dull grille, two tones only, so it is found by
  // looking, not by its shine (his: "a little less visible in the environment, so it is more fun to find").
  function ventTop(open) {
    const g = new Grid(14, 14);
    if (open) { g.rect(1, 1, 12, 12, P.i0); g.hl(1, 1, 12, P.i1); g.vl(1, 1, 12, P.i1); g.set(0, 3, P.i2); g.set(13, 9, P.i2); g.set(4, 13, P.i2); return g; }
    g.rect(1, 1, 12, 12, P.i1); g.hl(1, 1, 12, P.i2); g.vl(1, 1, 12, P.i2);
    for (let y = 3; y < 12; y += 2) g.hl(3, y, 8, P.i0);
    g.set(2, 2, P.i2); g.set(11, 11, P.i0);
    return g;
  }
  // ---------------------------------------------------------------- the steel post a pillar is in the factory, 14 x 30
  // (16 Oct 2026: it stood a boiler or a cabinet there, both gone with his marks; the 13 Oct playtest asked for "not
  // columns" of stone): a square box section bolted to a plate, a diagonal brace, one rust streak.
  function post() {
    const g = new Grid(16, 32);
    g.rect(0, 27, 16, 5, P.i1); g.hl(0, 27, 16, P.i3); g.hl(0, 31, 16, P.i0); bolt(g, 1, 28); bolt(g, 13, 28);    // the base plate
    g.rect(3, 2, 10, 25, P.i2); g.vl(3, 2, 25, P.i3); g.vl(4, 2, 25, P.i3); g.vl(12, 2, 25, P.i0); g.vl(11, 2, 25, P.i1);   // the post, lit on its left
    g.rect(2, 0, 12, 3, P.i2); g.hl(2, 0, 12, P.i4); g.hl(2, 2, 12, P.i0);                                        // its cap
    for (let y = 7; y < 25; y += 6) { g.set(5, y, P.i4); g.set(10, y, P.i1); }                                    // rivets down it
    g.line(4, 20, 11, 9, P.i1);                                                                                    // the brace
    g.vl(8, 14, 9, '#5a3a2c'); g.vl(8, 20, 4, '#78462f');                                                         // a rust streak
    return g.outline();
  }
  // ---------------------------------------------------------------- THE ARM's base, 34 x 22: a heavy bolted plate sunk in the
  // floor, a turret, its lamp (16 Oct 2026, his mark: "the base a bit bigger, more grounded")
  function armBase(dead) {
    const g = new Grid(34, 22), i2 = dead ? P.i1 : P.i2, i3 = dead ? P.i2 : P.i3, i4 = dead ? P.i3 : P.i4;
    g.rect(0, 13, 34, 9, P.i0);                                                                                    // the pit it is sunk in
    g.rect(1, 11, 32, 9, i2); g.hl(1, 11, 32, i3); g.hl(1, 19, 32, P.i0); g.vl(1, 11, 9, i3); g.vl(32, 11, 9, P.i1);   // the plate
    g.hl(1, 20, 32, P.i1);                                                                                         // its edge set in the floor
    for (const [x, y] of [[3, 13], [29, 13], [3, 17], [29, 17], [16, 17]]) bolt(g, x, y);
    for (const x of [8, 25]) { g.rect(x, 13, 2, 6, P.i1); g.vl(x, 13, 6, i3); }                                    // two ribs
    g.rect(7, 8, 20, 3, P.i0); g.hl(7, 8, 20, P.i1);                                                              // the turret's shadow ring
    g.ell(17, 8, 9, 3, i3); g.ring(17, 8, 9, 3, 1, i4); g.rect(8, 3, 18, 5, i2); g.vl(8, 3, 5, i3); g.vl(25, 3, 5, P.i1);   // the turret drum
    g.ell(17, 3, 9, 3, dead ? Y[0] : Y[1]); g.ring(17, 3, 9, 3, 1, dead ? Y[1] : Y[2]);                           // its yellow top, the shoulder
    g.rect(15, 14, 4, 3, dead ? P.i0 : P.h2); g.set(15, 14, dead ? P.i1 : P.h3);                                  // the lamp on the plate
    return g.outline();
  }

  sprites['fac-gas'] = gas();
  sprites['junk-gears'] = gears();
  sprites['fix-lamp0'] = lamp(0); sprites['fix-lamp1'] = lamp(1);
  sprites['fix-valve'] = valve(); sprites['fix-vent'] = vent();
  sprites['vent-top'] = ventTop(false); sprites['vent-top-open'] = ventTop(true);
  sprites['fac-post'] = post();
  sprites['arm-base'] = armBase(false); sprites['arm-base-dead'] = armBase(true);
  // The pieces a wreck throws (js/scatter.js `Scatter.KINDS`): a gear, a plate, a pipe elbow, a bolt, a bit of meat.
  sprites['fac-bit-gear'] = (() => { const g = new Grid(7, 7); g.ring(3, 3, 3, 3, 1, P.i3); for (const [x, y] of [[3, 0], [3, 6], [0, 3], [6, 3]]) g.set(x, y, P.i3); g.set(3, 3, P.i1); return g.outline(); })();
  sprites['fac-bit-plate'] = (() => { const g = new Grid(8, 6); g.rect(0, 0, 8, 6, P.i2); g.hl(0, 0, 8, P.i3); g.vl(7, 0, 6, P.i1); g.set(1, 1, P.i4); return g.outline(); })();
  sprites['fac-bit-pipe'] = (() => { const g = new Grid(8, 7); g.rect(0, 2, 6, 3, P.b2); g.hl(0, 2, 6, P.b4); g.rect(5, 0, 3, 5, P.b2); g.vl(7, 0, 5, P.b0); return g.outline(); })();
  sprites['fac-bit-bolt'] = (() => { const g = new Grid(4, 4); g.rect(0, 0, 3, 3, P.i3); g.set(0, 0, P.i4); g.set(2, 2, P.i1); return g.outline(); })();
  sprites['fac-bit-meat'] = (() => { const g = new Grid(6, 5); g.ell(3, 2.5, 3, 2, P.r1); g.set(2, 2, P.r2); g.set(1, 1, P.r3); return g.outline(P.bl); })();
  // a shard of a gas cylinder's red bottle
  sprites['fac-bit-gas'] = (() => { const g = new Grid(6, 5); g.rect(0, 1, 5, 3, P.r2); g.hl(0, 1, 5, P.r3); g.set(5, 2, P.r0); return g.outline(); })();
  // THE AUTOMATON coming apart (15 Oct 2026 playtest: "after his death he falls apart"): a shin with its bone-white piston
  // and its foot, and a rust knee block, four of each off `Automaton.wreck`.
  sprites['fac-bit-leg'] = (() => { const g = new Grid(18, 6); g.rect(0, 1, 15, 3, P.i2); g.hl(0, 1, 15, P.i3); g.hl(2, 2, 10, P.b4); g.rect(14, 0, 4, 6, P.i1); g.vl(14, 0, 6, P.i3); g.rect(0, 0, 3, 5, P.r1); return g.outline(); })();
  sprites['fac-bit-knee'] = (() => { const g = new Grid(6, 6); g.rect(0, 0, 6, 6, P.r1); g.hl(0, 0, 6, P.r2); g.set(2, 2, P.b4); g.set(3, 3, P.b2); return g.outline(); })();
  const registerBits = () => {
    if (typeof Scatter === 'undefined' || Scatter.KINDS['fac-bit-gear']) return;
    for (const b of ['gear', 'plate', 'pipe', 'bolt', 'leg', 'knee', 'gas']) Scatter.KINDS['fac-bit-' + b] = { bouncy: 0.7, sound: 'metal', sprite: 'fac-bit-' + b };
    Scatter.KINDS['fac-bit-meat'] = { bouncy: 0.4, sound: 'soft', sprite: 'fac-bit-meat' };
  };
  registerBits();

  // The standing furniture: each look's body on the floor (`box` half-sizes in world px, or a disc `r`), how many blows it
  // takes (0 never breaks), which pieces fly, its sprite and the one left lying. Empty since his marks of 16 Oct 2026; the
  // frame (`machine` props, `crack`, `drawMachine`) is kept for whatever stands here next.
  const MACHINES = {};
  const NONE = { name: 'MACHINE', r: 12, hits: 1, sprite: 'fac-post', bits: ['plate', 'bolt'] };
  const JUNK = ['gears'];
  const FIXES = ['valve', 'lamp', 'vent'];
  const FP = { MACHINES, JUNK, FIXES, TX };
  FP.boxOf = (look) => { const M = MACHINES[look] || NONE; return M.box ? { hx: M.box.hx, hy: M.box.hy } : null; };
  FP.rOf = (look) => { const M = MACHINES[look] || NONE; return M.box ? Math.max(M.box.hx, M.box.hy) : M.r; };
  // A blow on a machine (a headbutt, a thing thrown, a body arriving, a blast): the first cracks it, the last wrecks it.
  FP.crack = (game, p, dx, dy, power = 1) => {
    const M = MACHINES[p.look] || NONE;
    if (p.wrecked || !M.hits) { if (!p.wrecked) { p.wobble = 0.2; game.audio.sfxThud(); } return; }
    p.hits = (p.hits || 0) + 1; p.wobble = 0.3;
    game.world.emitNoise(p.x, p.y, TUNING.noise.smash * (p.hits >= M.hits ? 1 : 0.6));
    if (p.hits < M.hits) { game.audio.sfxSteel(); game.shake(2); game.hitstop(0.02); game.particles(p.x, p.y - 10, 6, PALETTE.ash, 150); game.dust(p.x, p.y, 3, dx, dy); return; }
    p.wrecked = true; registerBits();
    game.audio.sfxSplat(); game.audio.sfxClatter('metal', 1); game.shake(4); game.hitstop(0.03); game.vibe(12);
    game.particles(p.x, p.y - 8, 14, PALETTE.ash, 220); game.dust(p.x, p.y, 7, dx, dy);
    if (game.scatter && M.bits) game.scatter.breakUp(M.bits.map((b) => 'fac-bit-' + b), p.x, p.y, 16, dx, dy, 0.9 * power);
    game.world.scorch(p.x, p.y, FP.rOf(p.look) * 0.8, false);
  };

  // A gas cylinder breaking (16 Oct 2026, his mark: "a throwable; after the throw it pushes the enemies apart"): the gas
  // goes off where it broke in a shove, every man of flesh or iron within `r` tiles thrown straight away from it at
  // `fling` (less the further off, never under `edge` of it) and dazed `daze` s; the ogre staggers; the goat is let be.
  // The wall a man is thrown into kills him (pillar 3), the gas does not. A ring of cells goes out to `r`.
  FP.gasBurst = (game, p) => {
    const G = TUNING.prop.gas, R = G.r * TILE;
    registerBits();
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted || e.statue) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = hyp(dx, dy); if (d > R + e.r) continue;
      if (typeof ShieldGen !== 'undefined' && ShieldGen.holds(e)) { ShieldGen.refuse(game, e); continue; }
      const ux = d > 1 ? dx / d : Math.cos(Math.random() * 6.28), uy = d > 1 ? dy / d : Math.sin(Math.random() * 6.28);
      const k = G.fling * TILE * Math.max(G.edge, 1 - d / R) * (e.knockMul ? e.knockMul() : 1);
      if (e.kind === 'butcher' || e.automaton || e.arm) { if (e.kind === 'butcher' && e.state !== 'hop') { e.state = 'stagger'; e.timer = TUNING.butcher.rocked.crate; } }
      else { e.fling(ux * k, uy * k, false); e.dazed = Math.max(e.dazed || 0, G.daze); }
      e.aware = true;
    }
    // it goes off (19 Oct 2026 playtest: "thrown, the cylinder explodes and throws everyone round it"): a burst of cold gas
    // that hurts nobody, and the goat inside it is shoved out too, his legs his own again at once
    game.fx.explosion(p.x, p.y - 4, G.burst, false, true);
    const g = game.goat;
    if (g && !g.dead && g.state !== 'carried' && g.state !== 'tossed') {
      const dx = g.x - p.x, dy = g.y - p.y, d = hyp(dx, dy);
      if (d < R + g.r) { const k = G.goat * TILE * Math.max(G.edge, 1 - d / R); g.vx += (d > 1 ? dx / d : 1) * k; g.vy += (d > 1 ? dy / d : 0) * k; }
    }
    game.world.emitNoise(p.x, p.y, TUNING.noise.smash * 1.4);
    game.audio.sfxThud(); if (game.audio.sfxVent) game.audio.sfxVent(); game.audio.sfxBoom(); game.shake(5); game.hitstop(0.05); game.vibe(18);
    game.particles(p.x, p.y - 8, 18, '#dfe4e8', 260);
    game.gasRings = game.gasRings || []; game.gasRings.push({ x: p.x, y: p.y, at: game.timer || 0 });
    if (game.scatter) game.scatter.breakUp(['fac-bit-gas', 'fac-bit-gas', 'fac-bit-bolt'], p.x, p.y, 10, p.vx || 0, p.vy || 0, 0.7);
  };
  // The ring of the shove on the floor, `ringFor` s from the bottle out to `r`, in cells (from `Renderer.draw` with the fire).
  FP.drawGasRings = (R, game) => {
    const L = game.gasRings; if (!L || !L.length) return;
    const G = TUNING.prop.gas, ctx = R.ctx, px = 3;
    ctx.save(); ctx.fillStyle = '#dfe4e8';
    for (let i = L.length - 1; i >= 0; i--) {
      const g = L[i], u = ((game.timer || 0) - g.at) / G.ringFor;
      if (u >= 1) { L.splice(i, 1); continue; }
      const rr = G.r * TILE * (0.25 + 0.75 * u);
      ctx.globalAlpha = 0.7 * (1 - u); ctx.beginPath(); R.floorRing(g.x, g.y, rr, rr - px * 2, px); ctx.fill();
    }
    ctx.restore();
  };
  FP.drawGas = (renderer, p) => {
    const ctx = renderer.ctx, g = sprites['fac-gas'], k = TX; if (!g) return;
    const lift = p.held ? 4 : 0, spin = p.flung ? renderer.t * 14 : 0;
    if (!renderer.silPass) renderer.shadow(p.x, p.y + 4, 8, 4);
    ctx.save(); ctx.translate(p.x, p.y + 6 - lift); ctx.scale(1, 1 / TILT); if (spin) ctx.rotate(spin);
    PROP_PIXELS.draw(ctx, 'fac-gas', -g.w * k / 2, spin ? -g.h * k / 2 : -g.h * k, k);
    ctx.restore();
  };

  // ---- drawing ----
  const put = (ctx, name, x, y, k) => PROP_PIXELS.draw(ctx, name, x, y, k);
  // a crack across a damaged machine: a few dark cells down its middle (the one picture, no second drawing)
  const crackOver = (ctx, g, k, seed) => {
    const r = rng(seed); ctx.fillStyle = P.i0;
    let x = Math.floor(g.w * (0.35 + r() * 0.3)), y = Math.floor(g.h * 0.25);
    for (let n = 0; n < Math.floor(g.h * 0.5); n++) { ctx.fillRect(Math.round((x - g.w / 2) * k), Math.round((y - g.h) * k), Math.ceil(k), Math.ceil(k)); y++; if (r() < 0.45) x += r() < 0.5 ? -1 : 1; }
  };
  FP.drawMachine = (renderer, p) => {
    const ctx = renderer.ctx, M = MACHINES[p.look] || NONE, k = TX;
    const wob = p.wobble > 0 ? Math.round(Math.sin(renderer.t * 60) * p.wobble * 3) : 0;
    const name = p.wrecked ? (M.wreck || M.sprite) : M.sprite, g = sprites[name]; if (!g) return;
    if (!renderer.silPass && !p.wrecked) renderer.shadow(p.x, p.y + 4, p.box ? M.box.hx * 1.1 : (M.r || 14) * 1.05, p.box ? M.box.hy * 0.7 : (M.r || 14) * 0.45);
    ctx.save(); ctx.translate(p.x + wob, p.y + (p.box ? M.box.hy : (M.r || 14)) * 0.5 + 3); ctx.scale(1, 1 / TILT);
    put(ctx, name, -g.w * k / 2, -g.h * k, k);
    if (!p.wrecked && p.hits > 0 && !renderer.silPass) crackOver(ctx, g, k, Math.round(p.x + p.y));
    ctx.restore();
  };
  // Junk is dressing: drawn at `junkAlpha`, so it sits in the floor rather than on it.
  FP.drawJunk = (renderer, p) => {
    const ctx = renderer.ctx, name = 'junk-' + (JUNK.includes(p.look) ? p.look : 'gears'), g = sprites[name]; if (!g) return;
    const k = TX, q = p.turn || 0, a0 = ctx.globalAlpha;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, TILT); ctx.globalAlpha = a0 * TUNING.prop.junkAlpha;
    PROP_PIXELS.draw(ctx, name, -g.w * k / 2, -g.h * k / 2, k, q);
    ctx.restore();
  };
  // On the wall's face above its tile (`p.wall` as the sconce's, {x: 0, y: -1}): a lamp flickers and lays its light on the
  // wall in a dither of cells, a vent breathes a puff of steam now and then.
  FP.drawFix = (renderer, p, t) => {
    const ctx = renderer.ctx, look = FIXES.includes(p.look) ? p.look : 'valve', k = TX;
    const name = look === 'lamp' ? 'fix-lamp' + ((Math.floor(t * 11 + p.phase) % 7) === 0 ? 1 : 0) : 'fix-' + look;
    const g = sprites[name]; if (!g) return;
    // the valve stands at the foot of the wall, its pipe to the floor (19 Oct 2026, the test lab: "it must sit by the floor,
    // not hang as if from the ceiling"); the lamp and the vent stay up on the face
    const up = look === 'valve' ? -(TILE * 0.5 - 1 - g.h * k / 2 / TILT) : TILE * 0.55;
    ctx.save(); ctx.translate(p.x, p.y - up); ctx.scale(1, 1 / TILT);
    if (look === 'lamp' && !renderer.silPass) {
      // the pool of light: rings of cells thinning out from the lamp, dimmer on the flicker
      const dim = name === 'fix-lamp1' ? 0.5 : 1, C = 3;
      ctx.fillStyle = '#d6e4ea';
      for (let j = -6; j <= 9; j++) for (let i = -9; i <= 9; i++) {
        const d = Math.hypot(i / 9, j / 7); if (d > 1) continue;
        if (((i + j) & 1) && d > 0.45) continue;
        ctx.globalAlpha = (0.22 - d * 0.18) * dim; ctx.fillRect(i * C - 1, j * C + 2, C, C);
      }
      ctx.globalAlpha = 1;
    }
    PROP_PIXELS.draw(ctx, name, -g.w * k / 2, -g.h * k / 2, k);
    if (look === 'vent' && !renderer.silPass) { const u = ((t * 0.5 + p.phase) % 1); if (u < 0.5) { const s = u * 2; ctx.fillStyle = `rgba(220,220,230,${0.35 * (1 - s)})`; for (let i = 0; i < 3; i++) ctx.fillRect(-6 + i * 5 - s * 6 * (i - 1), -8 - s * 22 - i * 3, 5 + s * 6, 5 + s * 6); } }
    ctx.restore();
  };
  // A VENT in a side wall (16 Oct 2026, his: "make it do something: it opens a secret way between rooms, like Deus Ex";
  // a `secret` prop with `vent`, js/factory.js `layFactoryRoom`): drawn as the wall it sits in, the factory's cap over its
  // tile, with a dull grille in it; once broken, the dark mouth of the duct.
  FP.drawVentWall = (renderer, p) => {
    if (p.faceVent) return FP.drawVentFace(renderer, p);
    const ctx = renderer.ctx, name = p.broken ? 'vent-top-open' : 'vent-top', g = sprites[name]; if (!g) return;
    const wob = p.wobble > 0 ? Math.round(Math.sin(renderer.t * 60) * p.wobble * 2) : 0;
    PROP_PIXELS.draw(ctx, name, p.x - g.w * k2 / 2 + wob, p.y - g.h * k2 / 2, k2);
  };
  const k2 = 1.6;
  // A vent in a far wall's face (19 Oct 2026, `carveFaceVent`): the grille low on the face, at the floor, as Deus Ex's; broken,
  // the dark square of the duct with its bent slats at the sides. Wobbles under a blow as the side one does.
  FP.drawVentFace = (renderer, p) => {
    const ctx = renderer.ctx, g = sprites['fix-vent']; if (!g) return;
    const wob = p.wobble > 0 ? Math.round(Math.sin(renderer.t * 60) * p.wobble * 2) : 0, k = TX;
    const w = g.w * k, h = g.h * k, x0 = Math.round(p.x - w / 2 + wob), y0 = Math.round(p.y + TILE * 0.5 * TILT - h - 1);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (!p.broken) PROP_PIXELS.draw(ctx, 'fix-vent', x0, y0, k);
    else { ctx.fillStyle = '#08070a'; ctx.fillRect(x0, y0, w, h); ctx.fillStyle = '#34333b'; ctx.fillRect(x0, y0, w, k); ctx.fillRect(x0 - k, y0 + h - 2 * k, 2 * k, 2 * k); ctx.fillRect(x0 + w - k, y0 + 2 * k, 2 * k, 2 * k); }
    ctx.restore();
  };
  FP.draw = (renderer, p) => {
    if (p.kind === 'machine') FP.drawMachine(renderer, p);
    else if (p.kind === 'junk') FP.drawJunk(renderer, p);
    else if (p.kind === 'wallfix') FP.drawFix(renderer, p, renderer.t);
    return true;
  };
  return FP;
})();

// OIL ON THE FLOOR (16 Oct 2026, his mark on the factory doc: "spilled oil that can flow; step in it and a couple of cells
// of it stretch out behind you"; `TUNING.oil`). Level data, never a prop: `level.oil` [{ tx, ty }] (THE FACTORY's
// templates' 'K', js/factory.js) is where a spill starts. `game.oil` is tile → how much (0..1), `game.oilSpills` each
// spill's own tiles. A spill creeps out a tile every `grow` s up to `max` tiles (it flows). Whoever walks through it (the
// goat, a man, a hound, a machine on its feet, the walkers THE SNOW reads) carries it on his feet and smears `trail` tiles
// of it behind him. Fire that reaches an oiled tile burns it, `catch` s later the oiled tiles beside it, `burn` s each, so a
// trail is a fuse (my addition, `burns` turns it off): the fire kills, never the oil (pillar 3).
const Oil = {
  start(game) {
    const O = TUNING.oil, L = game.level, w = game.world;
    game.oil = new Map(); game.oilSpills = []; game.oilCatch = new Map();
    if (!O.on || !L || !L.oil || !L.oil.length) return;   // off since 19 Oct 2026 (the test lab: "let us remove it for now")
    for (const s of L.oil) {
      // where it comes from (19 Oct 2026 playtest: "oil is not clear yet; it could leak out of a valve in the wall"): a
      // far wall within `valveReach` tiles north of the spot gets a leaking valve on its face, and the spill starts at its foot
      let tx = s.tx, ty = s.ty, valve = null;
      for (let k = 1; k <= O.valveReach; k++) {
        if (w.tileAt(tx, ty - k) === T.WALL) { if (k > 1) ty = ty - k + 1; valve = { tx, ty: ty - 1 }; break; }
        if (w.tileAt(tx, ty - k) !== T.FLOOR) break;
      }
      const i = ty * w.W + tx; if (!this.floor(game, i)) continue;
      const sp = { tiles: [i], max: s.max || O.max, t: 0, valve }; game.oilSpills.push(sp); game.oil.set(i, 1);
      for (let k = 0; k < O.start; k++) this.flow(game, sp);
    }
  },
  floor(game, i) { return game.world.tiles[i] === T.FLOOR; },
  // a step of the spill flowing: from one of its tiles to a dry floor tile beside it
  flow(game, sp) {
    if (sp.tiles.length >= sp.max) return;
    const W = game.world.W;
    for (let tries = 0; tries < 8; tries++) {
      const i = sp.tiles[Math.floor(Math.random() * sp.tiles.length)], d = [1, -1, W, -W][Math.floor(Math.random() * 4)], j = i + d;
      if (!this.floor(game, j) || game.oil.has(j)) continue;
      game.oil.set(j, 1); sp.tiles.push(j); return;   // the pool itself (a smear off somebody's feet is the thin one)
    }
  },
  update(game, dt) {
    if (!game.oil || !game.oil.size) return;
    const O = TUNING.oil, w = game.world, W = w.W;
    for (const sp of game.oilSpills) { sp.t += dt; if (sp.t >= O.grow) { sp.t = 0; this.flow(game, sp); } }
    // feet: the same walkers THE SNOW reads; in the air nothing touches the floor
    const g = game.goat;
    if (g && !g.dead && !(g.state === 'carried' || g.state === 'tossed' || g.state === 'falling' || g.leap)) this.walker(game, g, W);
    for (const e of game.liveEnemies || []) {
      if (e.dead || e.held || e.ghosted || e.state === 'hop' || e.state === 'hidden' || e.statue || e.aloft || e.flung) continue;
      this.walker(game, e, W);
    }
    // fire: an oiled tile alight burns its oil, and the oiled tiles beside it catch `catch` s later
    if (O.burns) {
      for (const [i, a] of game.oil) {
        if (!(w.fire[i] > 0)) continue;
        game.oil.delete(i);
        for (const d of [1, -1, W, -W]) if (game.oil.has(i + d) && !game.oilCatch.has(i + d)) game.oilCatch.set(i + d, O.catch);
      }
      for (const [i, t] of game.oilCatch) {
        const left = t - dt; if (left > 0) { game.oilCatch.set(i, left); continue; }
        game.oilCatch.delete(i);
        if (game.oil.has(i)) w.ignite(i % W, Math.floor(i / W), true, O.burn, w.fireKind[i - 1] === 1 || w.fireKind[i + 1] === 1);
      }
    }
  },
  walker(game, o, W) {
    const i = Math.floor(o.y / TILE) * W + Math.floor(o.x / TILE);
    if (i === o.oilLast) return;
    if (game.oil.has(i)) { o.oilFeet = TUNING.oil.trail; o.oilLast = i; return; }
    if (o.oilFeet > 0 && this.floor(game, i)) { game.oil.set(i, TUNING.oil.trailAmt); o.oilFeet--; }
    o.oilLast = i;
  },
  // A tile of oil, baked once a shape (`bake`): a pool in 3-px cells, round where it has no oil beside it (a disc in the
  // tile's middle joined by half-tile bridges toward each oiled neighbour), a rim a step lighter round its edge, so it
  // reads as a liquid lying on the floor and not a hole in it; a smear off somebody's feet the same shape, every other cell.
  // Live over it, a sheen of two cells drifting. Only the tiles in view.
  baked: new Map(),
  bake(mask, thin) {
    const key = mask + (thin ? 't' : ''); let c = this.baked.get(key); if (c) return c;
    const C = 3, N = Math.round(TILE / C); c = document.createElement('canvas'); c.width = c.height = N * C;
    const g = c.getContext('2d'), m = N / 2;
    const inside = (i, j) => {
      const x = i + 0.5 - m, y = j + 0.5 - m;
      if (x * x + y * y <= (m * 0.78) * (m * 0.78)) return true;
      if ((mask & 1) && y < 0 && Math.abs(x) < m * 0.6) return true;   // up
      if ((mask & 2) && x > 0 && Math.abs(y) < m * 0.6) return true;   // right
      if ((mask & 4) && y > 0 && Math.abs(x) < m * 0.6) return true;   // down
      if ((mask & 8) && x < 0 && Math.abs(y) < m * 0.6) return true;   // left
      return false;
    };
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      if (!inside(i, j)) continue;
      if (thin && ((i + j) & 1)) continue;
      // a rim with the slick's colours in it and a glint up on the left of every pool, so it is a liquid and not a hole
      const rim = !inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1);
      const glint = !thin && !rim && inside(i - 1, j - 1) && !inside(i - 2, j - 2);
      g.fillStyle = rim ? (((i + j) % 3) ? '#3a3348' : '#2f4046') : glint ? '#4d4660' : '#120f0e'; g.fillRect(i * C, j * C, C, C);
    }
    this.baked.set(key, c); return c;
  },
  draw(R, game) {
    if (!game.oil || !game.oil.size) return;
    const ctx = R.ctx, w = game.world, W = w.W, v = R.visibleTiles(game.cam), C = 3, t = R.t;
    ctx.save(); const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.86;
    for (const [i, a] of game.oil) {
      const tx = i % W, ty = Math.floor(i / W); if (tx < v.x0 || tx > v.x1 || ty < v.y0 || ty > v.y1) continue;
      if (game.hidden((tx + 0.5) * TILE, (ty + 0.5) * TILE)) continue;
      const mask = (game.oil.has(i - W) ? 1 : 0) | (game.oil.has(i + 1) ? 2 : 0) | (game.oil.has(i + W) ? 4 : 0) | (game.oil.has(i - 1) ? 8 : 0);
      ctx.drawImage(this.bake(mask, a < 0.9), tx * TILE, ty * TILE, TILE, TILE);
    }
    // the sheen: two cells of light a pool tile, drifting slowly
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#5a5464'; ctx.beginPath();
    for (const [i, a] of game.oil) {
      if (a < 0.9) continue;
      const tx = i % W, ty = Math.floor(i / W); if (tx < v.x0 || tx > v.x1 || ty < v.y0 || ty > v.y1) continue;
      const h = ((tx * 73856093) ^ (ty * 19349663)) >>> 0, sx = (3 + ((h >> 3) % 4)) * C + Math.round(Math.sin(t * 0.8 + h) * 1.5) * C, sy = (3 + ((h >> 6) % 3)) * C;
      ctx.rect(tx * TILE + sx, ty * TILE + sy, C * 2, C);
    }
    ctx.fill();
    // the valves it leaks from: a stub of pipe out of the wall's face, a red wheel on it, and a run of drops down to the pool
    ctx.globalAlpha = 1;
    for (const sp of game.oilSpills) {
      const vl = sp.valve; if (!vl || vl.tx < v.x0 || vl.tx > v.x1 || vl.ty < v.y0 - 1 || vl.ty > v.y1) continue;
      if (game.hidden((vl.tx + 0.5) * TILE, (vl.ty + 1.5) * TILE)) continue;
      const x = vl.tx * TILE + TILE / 2, y = (vl.ty + 1) * TILE - 12, px = 2;
      ctx.fillStyle = '#17151b'; ctx.fillRect(x - 5 * px, y - 3 * px, 10 * px, 6 * px);
      ctx.fillStyle = '#5b5a64'; ctx.fillRect(x - 4 * px, y - 2 * px, 8 * px, 4 * px);
      ctx.fillStyle = '#7d7c86'; ctx.fillRect(x - 4 * px, y - 2 * px, 8 * px, px);
      ctx.fillStyle = '#17151b'; ctx.fillRect(x - px, y + 2 * px, 3 * px, 3 * px);
      ctx.fillStyle = '#8e2a22'; ctx.fillRect(x - 3 * px, y - 5 * px, 6 * px, 2 * px); ctx.fillRect(x - px, y - 6 * px, 2 * px, 4 * px);
      // the drops: two at a time sliding down the face to the pool's edge
      ctx.fillStyle = '#120f0e';
      for (let k = 0; k < 2; k++) { const f = (t * 0.9 + k * 0.5) % 1; ctx.fillRect(x, Math.round(y + 5 * px + f * 14), px, px * 2); }
      ctx.fillStyle = '#3a3348'; ctx.fillRect(x, y + 5 * px, px, px);
    }
    ctx.imageSmoothingEnabled = smooth; ctx.restore();
  },
};
