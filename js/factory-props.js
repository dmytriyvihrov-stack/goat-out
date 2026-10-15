// THE FACTORY's furniture (14 Oct 2026, his ask: "more objects that can stand in the space, so it looks more organic";
// the same day, of the first cut: "the objects are terrible and over-detailed, there should be fewer, and more in our
// pixel style"): a few things, every one hand-placed cells on PROP_PIXELS.Grid in the props' own palette and texel, the
// way the crate, the barrel and the brazier are. Three kinds of Prop.
//   `machine` (`look`): what stands on the floor and blocks: a BOILER, a CABINET, an ANVIL, a stack of DRUMS, two gas
//     CYLINDERS, a cable REEL. A wall that moves nowhere (pillar 3: a body thrown into one dies on it as on stone,
//     `collideEntities`' splat); a headbutt, a thing thrown at it, a body or a blast cracks it (`crack`), the second blow
//     wrecks it (`hits`): its parts fly (js/scatter.js, `bits`) and what is left lies flat and blocks nothing, so breaking
//     one opens a lane. The anvil never breaks.
//   `junk` (`look`): litter on the floor, nothing to anybody: GEARS, a PIPE, an OIL stain, OFFAL (the cult's meat).
//   `wallfix` (`look`): on the far wall's face, like THE DARK's lantern (`Prop.wall`): a GAUGE with its needle twitching,
//     a red VALVE wheel, a caged work LAMP that flickers, a VENT grille that breathes steam.
// Also THE ARM's base (`arm-base`, js/factory-pixels.js `drawArm`) and the boiler and cabinet that stand where a template's
// pillar would (`FACTORY_PIXELS.pillar`). Laid by THE FACTORY's templates (js/factory.js, `FACTORY_TEMPLATES`) and THE
// SHOWROOM. Loads after scatter.js.
const FACTORY_PROPS = (() => {
  const { P, Grid, sprites } = PROP_PIXELS, TX = 1.35;
  const rng = (seed) => () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const bolt = (g, x, y) => { g.set(x, y, P.i4); g.set(x + 1, y, P.i3); g.set(x, y + 1, P.i3); g.set(x + 1, y + 1, P.i1); };
  // the industrial yellow of the machines' paint (the arm, a cabinet's door, the drums' band), four steps
  const Y = ['#5a4210', '#9c741c', '#d9a52c', '#f5d262'];
  // the paint of everything that is NOT a threat (14 Oct 2026, his: "yellow was our threat"): a drab green-grey; yellow
  // is kept for THE ARM alone
  const D = ['#1e2826', '#344440', '#4e6058', '#6c8074'];

  // ---------------------------------------------------------------- the boiler, 18 x 28: an upright drum, two bands, one pipe
  function boiler(gone) {
    if (gone) {
      const g = new Grid(28, 16);
      g.rect(3, 4, 22, 10, P.i2); g.hl(3, 4, 22, P.i4); g.hl(3, 5, 22, P.i3); g.hl(3, 12, 22, P.i1); g.hl(3, 13, 22, P.i0);   // the drum on its side
      g.ell(3, 9, 2, 5, P.i1); g.ell(25, 9, 2, 5, P.i3); g.vl(10, 4, 10, P.i1); g.vl(18, 4, 10, P.i1);
      g.rect(0, 7, 3, 3, P.b2); g.set(0, 7, P.b3);                                                                   // the pipe stub
      g.rect(8, 6, 4, 6, P.i0); g.set(9, 8, P.r1);                                                                   // the split
      return g.outline();
    }
    const g = new Grid(18, 28);
    g.rect(3, 6, 12, 19, P.i2); g.vl(3, 6, 19, P.i3); g.vl(4, 6, 19, P.i4); g.vl(13, 6, 19, P.i1); g.vl(14, 6, 19, P.i0);   // the drum, lit on its left
    g.ell(9, 6, 6, 2, P.i3); g.ring(9, 6, 6, 2, 1, P.i4); g.ell(9, 25, 6, 2, P.i1);                                       // the ends
    g.hl(3, 11, 12, P.i1); g.hl(3, 12, 12, P.i0); g.hl(3, 19, 12, P.i1); g.hl(3, 20, 12, P.i0);                            // two bands
    for (const x of [5, 9, 12]) { g.set(x, 11, P.i4); g.set(x, 19, P.i4); }                                                 // their rivets
    g.rect(8, 1, 3, 5, P.b2); g.rect(8, 0, 6, 3, P.b2); g.hl(8, 0, 6, P.b3); g.set(13, 0, P.b1); g.set(8, 2, P.b1);          // the pipe elbow up and out
    // a dull pressure dial, never red (15 Oct 2026, his: a red knob on it "reads as something to press" on a thing that does nothing)
    g.rect(15, 14, 3, 3, P.i1); g.set(16, 15, P.c2); g.set(15, 14, P.i3);
    g.rect(5, 26, 2, 2, P.i0); g.rect(11, 26, 2, 2, P.i0);                                                                  // the feet
    return g.outline();
  }
  // ---------------------------------------------------------------- the cabinet, 16 x 26: a box, a yellow door, one lamp
  function cabinet(gone) {
    if (gone) {
      const g = new Grid(24, 16);
      g.rect(2, 3, 20, 11, P.i2); g.hl(2, 3, 20, P.i3); g.hl(2, 13, 20, P.i0); g.vl(2, 3, 11, P.i3);                        // flat on its back
      g.rect(5, 5, 14, 7, D[1]); g.hl(5, 5, 14, D[2]); g.vl(12, 5, 7, P.i0);                                                  // the door open in two
      g.set(15, 8, P.i4); g.rect(0, 9, 3, 2, P.r2); g.set(22, 6, P.b2); g.set(23, 7, P.b2);                                    // a handle, a wire, a pipe
      return g.outline();
    }
    const g = new Grid(16, 26);
    g.rect(1, 2, 14, 22, P.i2); g.vl(1, 2, 22, P.i3); g.hl(1, 2, 14, P.i3); g.vl(14, 2, 22, P.i0); g.hl(1, 23, 14, P.i0);      // the box
    g.rect(3, 6, 10, 15, D[1]); g.hl(3, 6, 10, D[2]); g.vl(3, 6, 15, D[2]); g.vl(12, 6, 15, D[0]); g.hl(3, 20, 10, D[0]);     // the door
    g.rect(10, 12, 1, 3, P.i0); g.set(10, 12, P.i4);                                                                        // the handle
    g.rect(6, 3, 3, 2, P.f2); g.set(6, 3, P.f3);                                                                            // the lamp, lit
    for (const x of [2, 13]) { g.set(x, 3, P.i4); g.set(x, 22, P.i4); }                                                      // corner rivets
    g.rect(2, 24, 3, 2, P.i0); g.rect(11, 24, 3, 2, P.i0);                                                                  // the feet
    g.rect(15, 8, 1, 10, P.b2); g.set(15, 8, P.b3);                                                                         // a conduit up its side
    return g.outline();
  }
  // ---------------------------------------------------------------- the anvil, 24 x 16
  function anvil() {
    const g = new Grid(24, 16);
    g.rect(6, 12, 12, 3, P.w1); g.hl(6, 12, 12, P.w2); g.hl(5, 15, 14, P.w0);                                               // the stump
    g.rect(9, 9, 6, 3, P.i1); g.vl(9, 9, 3, P.i2);                                                                          // the waist
    g.rect(4, 4, 16, 5, P.i2); g.hl(4, 4, 16, P.i4); g.hl(4, 8, 16, P.i0); g.vl(4, 4, 5, P.i3);                               // the body
    g.poly([[20, 4], [24, 5], [24, 7], [20, 8]], P.i2); g.hl(20, 4, 4, P.i3);                                               // the horn
    g.rect(0, 4, 4, 4, P.i2); g.hl(0, 4, 4, P.i3);                                                                          // the heel
    g.hl(6, 3, 12, P.i4);                                                                                                   // the face, polished
    return g.outline();
  }
  // ---------------------------------------------------------------- a stack of drums, 26 x 26 (and burst)
  function drums(gone) {
    const g = new Grid(26, 26);
    const drum = (x, y, col, hi, lo) => { g.rect(x, y, 10, 12, col); g.vl(x, y, 12, hi); g.vl(x + 9, y, 12, lo); g.hl(x, y + 3, 10, P.i0); g.hl(x, y + 8, 10, P.i0); g.hl(x, y + 4, 10, hi); g.hl(x, y + 9, 10, hi); g.ell(x + 4.5, y, 5, 2, col); g.ring(x + 4.5, y, 5, 2, 1, hi); };
    if (gone) {
      drum(1, 13, P.i2, P.i3, P.i0); g.rect(3, 15, 6, 8, P.i0);                                                              // one with its side in
      g.rect(12, 16, 13, 9, D[1]); g.hl(12, 16, 13, D[2]); g.vl(24, 16, 9, D[0]); g.hl(12, 19, 13, D[0]); g.hl(12, 22, 13, D[0]); g.ell(12, 20, 2, 4, D[0]);   // one on its side
      g.ell(8, 25, 8, 1, P.d0);                                                                                             // the oil out of it
      return g.outline();
    }
    drum(1, 13, P.i2, P.i3, P.i0); drum(14, 13, D[1], D[2], D[0]); drum(7, 2, P.i2, P.i3, P.i0);
    return g.outline();
  }
  // ---------------------------------------------------------------- two gas cylinders chained, 18 x 28 (and fallen)
  function cylinders(gone) {
    const g = new Grid(18, 30);
    if (gone) {
      g.rect(1, 20, 16, 6, P.i2); g.hl(1, 20, 16, P.i3); g.hl(1, 25, 16, P.i0); g.ell(17, 23, 1, 3, P.i1);                   // one on its side
      g.rect(3, 12, 12, 5, P.r2); g.hl(3, 12, 12, P.r3); g.hl(3, 16, 12, P.r0); g.ell(15, 14, 1, 2, P.r1);                   // the red one across it
      return g.outline();
    }
    const tank = (x, col, hi, lo) => { g.rect(x, 6, 7, 22, col); g.vl(x, 6, 22, hi); g.vl(x + 6, 6, 22, lo); g.hl(x + 1, 5, 5, col); g.hl(x + 2, 4, 3, hi);
      g.rect(x + 2, 1, 3, 3, P.b2); g.hl(x + 2, 1, 3, P.b4); g.hl(x, 28, 7, P.i0); };
    tank(1, P.i2, P.i3, P.i0); tank(10, P.r2, P.r3, P.r0);
    g.hl(0, 14, 18, P.i4); g.hl(0, 15, 18, P.i1);                                                                           // the chain
    g.rect(2, 18, 5, 3, P.c1); g.rect(11, 18, 5, 3, P.c1);                                                                  // the labels
    return g.outline();
  }
  // ---------------------------------------------------------------- the cable reel, 24 x 22 (and lying broken)
  function reel(gone) {
    const g = new Grid(24, 22);
    if (gone) {
      g.ell(12, 16, 11, 4, P.w1); g.ring(12, 15, 9, 3, 1, P.w3);                                                             // one flange flat on the floor
      g.rect(2, 8, 5, 2, P.w2); g.rect(16, 5, 6, 2, P.w2);                                                                  // staves off it
      g.line(0, 12, 8, 18, P.i3);                                                                                           // the cable loose
      return g.outline();
    }
    g.ell(12, 11, 11, 11, P.w1); g.ring(12, 11, 11, 11, 1, P.w2); g.ring(12, 11, 9, 9, 1, P.w3);                             // the flange
    g.ell(12, 11, 7, 7, P.i1); g.ring(12, 11, 4, 4, 1, P.i2);                                                               // cable wound on the drum
    g.ell(12, 11, 2, 2, P.w3);                                                                                              // the axle
    return g.outline();
  }
  // ---------------------------------------------------------------- the junk, small and flat
  function gears() { const g = new Grid(14, 11); g.ring(5, 5, 4, 4, 1, P.i3); for (const [x, y] of [[5, 0], [5, 10], [0, 5], [10, 5]]) g.set(x, y, P.i3); g.set(5, 5, P.i1); g.ring(10, 7, 3, 3, 1, P.b2); g.set(10, 3, P.b2); g.set(10, 11, P.b2); g.set(13, 7, P.b2); return g.outline(); }
  function pipe() { const g = new Grid(20, 9); g.rect(0, 3, 14, 4, P.b2); g.hl(0, 3, 14, P.b4); g.hl(0, 6, 14, P.b0); g.rect(13, 1, 4, 6, P.b2); g.vl(16, 1, 6, P.b0); g.hl(13, 1, 4, P.b4); g.rect(2, 2, 2, 6, P.b3); return g.outline(); }
  function oil() { const g = new Grid(22, 12), r = rng(9); g.ell(11, 6, 10, 5, P.d0); g.ell(9, 5, 6, 3, P.d1); for (let k = 0; k < 10; k++) { const x = Math.floor(r() * 22), y = Math.floor(r() * 12); if (g.get(x, y)) g.set(x, y, r() < 0.5 ? P.d2 : P.d0); } g.set(7, 4, P.d3); return g; }
  function offal() { const g = new Grid(16, 10); g.ell(8, 6, 7, 3, P.r1); g.ell(6, 5, 4, 2, P.r2); g.set(5, 5, P.r3); g.rect(10, 1, 2, 7, P.n3); g.hl(9, 1, 4, P.n2); g.hl(9, 7, 4, P.n2); g.set(2, 8, P.r0); return g.outline(P.bl); }
  // ---------------------------------------------------------------- on the wall
  function gauge(k) { const g = new Grid(13, 13); g.ell(6, 6, 6, 6, P.i2); g.ring(6, 6, 6, 6, 1, P.i3); g.ell(6, 6, 4, 4, P.c2); for (const [x, y] of [[6, 2], [2, 6], [10, 6]]) g.set(x, y, P.i1); g.set(9, 4, P.h2); g.set(10, 5, P.h2);
    const a = [-2.2, -2.0, -2.4, -1.9][k]; g.line(6, 6, 6 + Math.cos(a) * 3.5, 6 + Math.sin(a) * 3.5, P.h2); g.set(6, 6, P.i0); g.rect(5, 12, 3, 1, P.i1); return g.outline(); }
  function valve() { const g = new Grid(13, 15); g.rect(5, 9, 3, 6, P.b2); g.vl(5, 9, 6, P.b3); g.vl(7, 9, 6, P.b0); g.ring(6, 6, 6, 6, 2, P.h2); g.line(6, 1, 6, 11, P.h2); g.line(1, 6, 11, 6, P.h2); g.ell(6, 6, 2, 2, P.h1); g.set(6, 6, P.i4); return g.outline(); }
  function lamp(k) { const g = new Grid(11, 15); g.rect(4, 0, 3, 3, P.i1); g.rect(2, 3, 7, 2, P.i2); g.hl(2, 3, 7, P.i3);
    g.rect(2, 5, 7, 7, ['#d6e4ea', '#9fb4bf', '#d6e4ea', '#d6e4ea'][k]);   /* cool white: yellow is the threat's colour */ g.vl(3, 5, 7, P.i1); g.vl(5, 5, 7, P.i1); g.vl(7, 5, 7, P.i1); g.hl(2, 12, 7, P.i2); return g.outline(); }
  function vent() { const g = new Grid(15, 11); g.rect(0, 0, 15, 11, P.i1); g.hl(0, 0, 15, P.i3); g.vl(0, 0, 11, P.i3); g.hl(0, 10, 15, P.i0); for (let y = 2; y < 10; y += 2) { g.hl(2, y, 11, P.i0); g.hl(2, y + 1, 11, P.i2); } bolt(g, 1, 1); bolt(g, 12, 1); return g.outline(); }
  // ---------------------------------------------------------------- THE ARM's base, 30 x 20: a bolted plate, a turret, its lamp
  function armBase(dead) {
    const g = new Grid(30, 20), i2 = dead ? P.i1 : P.i2, i3 = dead ? P.i2 : P.i3, i4 = dead ? P.i3 : P.i4;
    g.rect(1, 10, 28, 9, i2); g.hl(1, 10, 28, i3); g.hl(1, 18, 28, P.i0); g.vl(1, 10, 9, i3); g.vl(28, 10, 9, P.i1);        // the plate
    for (const [x, y] of [[3, 12], [25, 12], [3, 16], [25, 16]]) bolt(g, x, y);
    g.rect(6, 7, 18, 3, P.i0); g.hl(6, 7, 18, P.i1);                                                                        // the turret's shadow ring
    g.ell(15, 7, 8, 3, i3); g.ring(15, 7, 8, 3, 1, i4); g.rect(7, 2, 16, 5, i2); g.vl(7, 2, 5, i3); g.vl(22, 2, 5, P.i1);     // the turret drum
    g.ell(15, 2, 8, 3, dead ? Y[0] : Y[1]); g.ring(15, 2, 8, 3, 1, dead ? Y[1] : Y[2]);                                     // its yellow top, the shoulder
    g.rect(13, 13, 4, 3, dead ? P.i0 : P.h2); g.set(13, 13, dead ? P.i1 : P.h3);                                            // the lamp on the plate
    return g.outline();
  }

  sprites['fac-boiler'] = boiler(false); sprites['fac-boiler-wreck'] = boiler(true);
  sprites['fac-cabinet'] = cabinet(false); sprites['fac-cabinet-wreck'] = cabinet(true);
  sprites['fac-anvil'] = anvil();
  sprites['fac-drums'] = drums(false); sprites['fac-drums-wreck'] = drums(true);
  sprites['fac-cylinders'] = cylinders(false); sprites['fac-cylinders-wreck'] = cylinders(true);
  sprites['fac-reel'] = reel(false); sprites['fac-reel-wreck'] = reel(true);
  sprites['junk-gears'] = gears(); sprites['junk-pipe'] = pipe(); sprites['junk-oil'] = oil(); sprites['junk-offal'] = offal();
  for (let k = 0; k < 4; k++) { sprites['fix-gauge' + k] = gauge(k); sprites['fix-lamp' + k] = lamp(k); }
  sprites['fix-valve'] = valve(); sprites['fix-vent'] = vent();
  sprites['arm-base'] = armBase(false); sprites['arm-base-dead'] = armBase(true);
  // The pieces a wreck throws (js/scatter.js `Scatter.KINDS`): a gear, a plate, a pipe elbow, a bolt, a bit of meat.
  sprites['fac-bit-gear'] = (() => { const g = new Grid(7, 7); g.ring(3, 3, 3, 3, 1, P.i3); for (const [x, y] of [[3, 0], [3, 6], [0, 3], [6, 3]]) g.set(x, y, P.i3); g.set(3, 3, P.i1); return g.outline(); })();
  sprites['fac-bit-plate'] = (() => { const g = new Grid(8, 6); g.rect(0, 0, 8, 6, P.i2); g.hl(0, 0, 8, P.i3); g.vl(7, 0, 6, P.i1); g.set(1, 1, P.i4); return g.outline(); })();
  sprites['fac-bit-pipe'] = (() => { const g = new Grid(8, 7); g.rect(0, 2, 6, 3, P.b2); g.hl(0, 2, 6, P.b4); g.rect(5, 0, 3, 5, P.b2); g.vl(7, 0, 5, P.b0); return g.outline(); })();
  sprites['fac-bit-bolt'] = (() => { const g = new Grid(4, 4); g.rect(0, 0, 3, 3, P.i3); g.set(0, 0, P.i4); g.set(2, 2, P.i1); return g.outline(); })();
  sprites['fac-bit-meat'] = (() => { const g = new Grid(6, 5); g.ell(3, 2.5, 3, 2, P.r1); g.set(2, 2, P.r2); g.set(1, 1, P.r3); return g.outline(P.bl); })();
  const registerBits = () => {
    if (typeof Scatter === 'undefined' || Scatter.KINDS['fac-bit-gear']) return;
    for (const b of ['gear', 'plate', 'pipe', 'bolt']) Scatter.KINDS['fac-bit-' + b] = { bouncy: 0.7, sound: 'metal', sprite: 'fac-bit-' + b };
    Scatter.KINDS['fac-bit-meat'] = { bouncy: 0.4, sound: 'soft', sprite: 'fac-bit-meat' };
  };
  registerBits();

  // What each look is: its body on the floor (`box` half-sizes in world px, or a disc `r`), how many blows it takes
  // (0 never breaks), which pieces fly, its sprite and the one left lying.
  const MACHINES = {
    boiler: { name: 'BOILER', r: 13, hits: 2, sprite: 'fac-boiler', wreck: 'fac-boiler-wreck', bits: ['pipe', 'plate', 'bolt', 'bolt'] },
    cabinet: { name: 'CABINET', r: 12, hits: 2, sprite: 'fac-cabinet', wreck: 'fac-cabinet-wreck', bits: ['plate', 'plate', 'meat', 'meat', 'bolt'] },
    anvil: { name: 'ANVIL', r: 14, hits: 0, sprite: 'fac-anvil' },
    drums: { name: 'DRUMS', box: { hx: 16, hy: 10 }, hits: 1, sprite: 'fac-drums', wreck: 'fac-drums-wreck', bits: ['plate', 'plate', 'bolt'] },
    cylinders: { name: 'GAS CYLINDERS', box: { hx: 11, hy: 7 }, hits: 1, sprite: 'fac-cylinders', wreck: 'fac-cylinders-wreck', bits: ['pipe', 'bolt'] },
    reel: { name: 'CABLE REEL', r: 15, hits: 1, sprite: 'fac-reel', wreck: 'fac-reel-wreck', bits: ['plate', 'bolt', 'bolt'] },
  };
  const JUNK = ['gears', 'pipe', 'oil', 'offal'];
  const FIXES = ['gauge', 'valve', 'lamp', 'vent'];
  const FP = { MACHINES, JUNK, FIXES, TX };
  FP.boxOf = (look) => { const M = MACHINES[look] || MACHINES.boiler; return M.box ? { hx: M.box.hx, hy: M.box.hy } : null; };
  FP.rOf = (look) => { const M = MACHINES[look] || MACHINES.boiler; return M.box ? Math.max(M.box.hx, M.box.hy) : M.r; };
  // A blow on a machine (a headbutt, a thing thrown, a body arriving, a blast): the first cracks it, the last wrecks it.
  FP.crack = (game, p, dx, dy, power = 1) => {
    const M = MACHINES[p.look] || MACHINES.boiler;
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

  // ---- drawing ----
  const put = (ctx, name, x, y, k) => PROP_PIXELS.draw(ctx, name, x, y, k);
  // a crack across a damaged machine: a few dark cells down its middle (the one picture, no second drawing)
  const crackOver = (ctx, g, k, seed) => {
    const r = rng(seed); ctx.fillStyle = P.i0;
    let x = Math.floor(g.w * (0.35 + r() * 0.3)), y = Math.floor(g.h * 0.25);
    for (let n = 0; n < Math.floor(g.h * 0.5); n++) { ctx.fillRect(Math.round((x - g.w / 2) * k), Math.round((y - g.h) * k), Math.ceil(k), Math.ceil(k)); y++; if (r() < 0.45) x += r() < 0.5 ? -1 : 1; }
  };
  FP.drawMachine = (renderer, p) => {
    const ctx = renderer.ctx, M = MACHINES[p.look] || MACHINES.boiler, k = TX;
    const wob = p.wobble > 0 ? Math.round(Math.sin(renderer.t * 60) * p.wobble * 3) : 0;
    const name = p.wrecked ? (M.wreck || M.sprite) : M.sprite, g = sprites[name]; if (!g) return;
    if (!renderer.silPass && !p.wrecked) renderer.shadow(p.x, p.y + 4, p.box ? M.box.hx * 1.1 : (M.r || 14) * 1.05, p.box ? M.box.hy * 0.7 : (M.r || 14) * 0.45);
    ctx.save(); ctx.translate(p.x + wob, p.y + (p.box ? M.box.hy : (M.r || 14)) * 0.5 + 3); ctx.scale(1, 1 / TILT);
    put(ctx, name, -g.w * k / 2, -g.h * k, k);
    if (!p.wrecked && p.hits > 0 && !renderer.silPass) crackOver(ctx, g, k, Math.round(p.x + p.y));
    ctx.restore();
  };
  FP.drawJunk = (renderer, p) => {
    const ctx = renderer.ctx, name = 'junk-' + (JUNK.includes(p.look) ? p.look : 'gears'), g = sprites[name]; if (!g) return;
    const k = TX, q = p.turn || 0;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, TILT);
    PROP_PIXELS.draw(ctx, name, -g.w * k / 2, -g.h * k / 2, k, q);
    ctx.restore();
  };
  // On the wall's face above its tile (`p.wall` as the sconce's, {x: 0, y: -1}): a gauge's needle twitches, a lamp flickers,
  // a vent breathes a puff of steam now and then.
  FP.drawFix = (renderer, p, t) => {
    const ctx = renderer.ctx, look = FIXES.includes(p.look) ? p.look : 'gauge', k = TX;
    const f = Math.floor(t * 3 + p.phase * 2) % 4, name = look === 'gauge' ? 'fix-gauge' + f : look === 'lamp' ? 'fix-lamp' + ((Math.floor(t * 11 + p.phase) % 7) === 0 ? 1 : 0) : 'fix-' + look;
    const g = sprites[name]; if (!g) return;
    ctx.save(); ctx.translate(p.x, p.y - TILE * 0.55); ctx.scale(1, 1 / TILT);
    PROP_PIXELS.draw(ctx, name, -g.w * k / 2, -g.h * k / 2, k);
    if (look === 'lamp' && !renderer.silPass) { const a = 0.14 + 0.04 * Math.sin(t * 9 + p.phase); ctx.fillStyle = `rgba(200,224,236,${a})`; ctx.beginPath(); ctx.ellipse(0, 10 * k, 26, 14, 0, 0, Math.PI * 2); ctx.fill(); }
    if (look === 'vent' && !renderer.silPass) { const u = ((t * 0.5 + p.phase) % 1); if (u < 0.5) { const s = u * 2; ctx.fillStyle = `rgba(220,220,230,${0.35 * (1 - s)})`; for (let i = 0; i < 3; i++) ctx.fillRect(-6 + i * 5 - s * 6 * (i - 1), -8 - s * 22 - i * 3, 5 + s * 6, 5 + s * 6); } }
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
