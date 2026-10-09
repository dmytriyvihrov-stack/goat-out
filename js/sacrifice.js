// THE SACRIFICE ALTAR (9 Oct 2026, his ask: Nuclear Throne's and Spelunky's altars; `TUNING.sacrifice`).
//
// A wheel of six sockets carved into the floor of a room in the middle of THE CAVE (`placeSacrifice`, gen.js;
// `level.sacrifice`). Anything living that stands on it pays a heart for every second it stays: the goat (his last
// heart is his death), a man of the cult (a plain one dies on it, a boss loses a heart and is floored there), a
// companion (its own heart). Each payment fills a socket, and a socket never empties. Stand on it yourself, lure the
// men onto it, butt them onto it, carry one there in your teeth, bring an animal: whatever pays. Six full, the skull in
// its middle opens its eyes, the world goes dark (`fade`), and the floor is laid again as THE DARK, which is played in
// THE CAVE's place (`darkOf`, the same door THE FORK's dark flight opens).
//
// Level data and a picture, never a prop: it blocks nothing, the men do not know it, and nothing here is read by
// the AI. Its sockets are `game.altar.filled`; who stands on it and for how long, `game.altar.on` (a Map).
const Sacrifice = {
  // Called by `startLevel`: the floor's altar, or none.
  start(game) {
    const s = game.level && game.level.sacrifice;
    game.altar = s ? { x: s.x, y: s.y, room: s.room, filled: 0, on: new Map(), done: false, doneT: 0, told: false } : null;
  },
  // Who is standing on it now: the goat on his feet, a man on his, an animal on the ground. Nothing in the air.
  standing(game, a) {
    const S = TUNING.sacrifice, R = S.r * TILE, g = game.goat, out = [];
    const on = (o) => hyp(o.x - a.x, o.y - a.y) < R;
    if (g && !g.dead && !g.leap && !['roll', 'falling', 'carried', 'tossed'].includes(g.state) && on(g)) out.push(g);
    for (const e of game.enemies) {
      if (e.dead || e.held || e.scripted || e.ghosted || e.statue || e.state === 'hop' || e.state === 'flung' || e.state === 'hidden') continue;
      if (on(e)) out.push(e);
    }
    for (const p of game.props) if (Beast.animal(p) && !p.held && !p.broken && !p.flying && on(p)) out.push(p);
    return out;
  },
  update(game, dt) {
    if (game.altarFade && (game.altarFade.t -= dt) <= 0) game.altarFade = null;   // THE DARK's first beat, lifting
    const a = game.altar; if (!a || game.state !== 'play') return;
    const S = TUNING.sacrifice, g = game.goat;
    if (a.done) {
      a.doneT += dt;
      if (a.doneT >= S.fade && g && !g.dead) this.descend(game);
      return;
    }
    const now = this.standing(game, a);
    // stepping off starts the second over
    for (const o of [...a.on.keys()]) if (!now.includes(o)) a.on.delete(o);
    for (const o of now) {
      const t = (a.on.get(o) || 0) + dt;
      if (t < S.tick) { a.on.set(o, t); continue; }
      a.on.set(o, 0);
      this.pay(game, a, o);
      if (a.done) return;
    }
  },
  pay(game, a, o) {
    const S = TUNING.sacrifice, g = game.goat;
    a.filled = Math.min(S.cells, a.filled + 1);
    // the heart itself: the goat's through his own damage (mercy frames do not spare him: it is a price, not a blow)
    if (o === g) { g.invuln = 0; g.damage(1, game, 0, 0, false, 'altar'); }
    else if (o instanceof Enemy) o.die(game, 'altar', 0, 0, 'altar');
    else Beast.hurt(o, game, 'altar');
    // heard and seen: one stroke of the bell a socket, blood off whoever paid, the socket's own ring
    game.audio.sfxBell(); game.audio.sfxThud();
    game.particles(o.x, o.y - 10, 10, PALETTE.blood, 150);
    game.ring(a.x, a.y, TUNING.sacrifice.radius * TILE, PALETTE.blood);
    game.floatText(a.x, a.y - TUNING.sacrifice.radius * TILE - 10, `${a.filled} / ${S.cells}`, PALETTE.blood);
    if (!a.told) { a.told = true; game.floatText(o.x, o.y - 44, 'THE ALTAR DRINKS', PALETTE.blood); }
    if (a.filled >= S.cells) {
      a.done = true; a.doneT = 0;
      game.audio.sfxBell(true);
      game.floatText(a.x, a.y - TUNING.sacrifice.radius * TILE - 34, 'THE DARK OPENS', PALETTE.bone);
    }
  },
  // Down into THE DARK: the floor laid again in THE CAVE's place, what he carries kept, the souls on the floor his.
  descend(game) {
    const i = game.levelIndex;
    // THE SHOWROOM's altar only starts over; and only THE CAVE's place takes THE DARK
    if (game.showroomOn) { Sacrifice.start(game); game.floatText(game.goat.x, game.goat.y - 40, 'THE DARK, ON A REAL CAVE', PALETTE.bone); return; }
    if (i !== DARK_LEVEL.darkOf) { game.altar = null; return; }
    Motes.flush(game);
    game.darkAt = i; if (game.tripAt === i) game.tripAt = -1;
    game.nextHp = game.goat ? game.goat.hp : null;
    game.altarFade = { t: TUNING.sacrifice.fade };
    game.startLevel(i, game.levelSeed(i), true);
  },

  // ---------------------------------------------------------------- the picture
  // THE WHEEL OF SIX (his pick of four, output/altar-2026-10-09): a carved stone disc, six sockets round a goat's skull;
  // a filled socket a pool of blood with its groove run red to the middle; full, the skull's eyes lit. Baked once a
  // count on `PROP_PIXELS.Grid`, seen from above as the floor is.
  bake(n) {
    const B = this.baked || (this.baked = {}); if (B[n]) return B[n];
    const { P, Grid } = PROP_PIXELS, N = 48, C = 24, cells = TUNING.sacrifice.cells;
    const at = (k, r) => { const q = -Math.PI / 2 + k * Math.PI * 2 / cells; return [C + Math.cos(q) * r, C + Math.sin(q) * r]; };
    const g = new Grid(N, N);
    g.ell(C, C, 22, 22, P.s1).ring(C, C, 22, 22, 2, P.s0).ring(C, C, 13, 13, 1, P.s0);
    g.tone((x, y) => (x + y * 3) % 7 === 0, P.s2, [P.s1]);
    for (let k = 0; k < cells; k++) {
      const [x, y] = at(k, 17), [ix, iy] = at(k, 12.5), on = k < n;
      g.line(x, y, ix, iy, on ? P.h1 : P.s0);
      g.ell(x, y, 3.2, 3.2, on ? P.h1 : P.d1); if (on) { g.ell(x, y, 2.2, 2.2, P.h2); g.set(x - 1, y - 1, P.h3); }
    }
    g.ell(C, C + 1, 5, 4.5, P.n2).ell(C, C + 4, 3, 2, P.n1);
    g.line(C - 4, C - 2, C - 8, C - 9, P.n1).line(C - 3, C - 2, C - 7, C - 9, P.n2).line(C + 4, C - 2, C + 8, C - 9, P.n1).line(C + 3, C - 2, C + 7, C - 9, P.n2);
    const eye = n >= cells ? P.h3 : P.d0; g.rect(C - 3, C, 2, 2, eye).rect(C + 2, C, 2, 2, eye);
    g.outline();
    const c = document.createElement('canvas'); c.width = N; c.height = N; const x = c.getContext('2d');
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const v = g.get(i, j); if (v) { x.fillStyle = v; x.fillRect(i, j, 1, 1); } }
    return (B[n] = c);
  },
  // On the floor, under everybody (called beside the waves): the disc at its count, the next socket breathing red
  // (`blink`), filling while somebody stands on it.
  draw(R, game) {
    const a = game.altar; if (!a || R.baking || game.hidden(a.x, a.y)) return;
    const S = TUNING.sacrifice, ctx = R.ctx, k = S.radius * TILE / 22, img = this.bake(a.filled), w = 48 * k;
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(a.x - w / 2), Math.round(a.y - w / 2), w, w);
    if (a.filled < S.cells) {
      // the next socket: how far the one standing longest has paid toward it, or a slow breath when nobody is on it
      let p = 0; for (const t of a.on.values()) p = Math.max(p, t / S.tick);
      const breath = 0.18 + 0.18 * Math.sin(R.t * S.blink * Math.PI * 2);
      ctx.globalAlpha = p > 0 ? Math.max(breath, p) : breath;
      ctx.drawImage(this.bake(a.filled + 1), Math.round(a.x - w / 2), Math.round(a.y - w / 2), w, w);
      ctx.globalAlpha = 1;
    }
    ctx.imageSmoothingEnabled = sm;
  },
  // In screen space, over the picture and under the HUD: the dark coming down at six, and lifting off THE DARK's start.
  drawOverlay(R, game) {
    const ctx = R.ctx, S = TUNING.sacrifice, a = game.altar;
    let k = 0;
    if (a && a.done) k = clamp(a.doneT / S.fade, 0, 1);
    const f = game.altarFade;
    if (f) k = Math.max(k, clamp(f.t / S.fade, 0, 1));
    if (k <= 0) return;
    ctx.fillStyle = `rgba(0,0,0,${(k * k).toFixed(3)})`; ctx.fillRect(0, 0, R.vw, R.vh);
  },
};
if (typeof module !== 'undefined') module.exports = { Sacrifice };
