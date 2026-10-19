'use strict';
// THE CHEER (18 Oct 2026, his ask: "when you take a corrupted soul, a celebration, two different ones", off Chain
// Beasts' skill card and its beast drinking the elixir). A soul card taken (`Game.takeBoon`) holds the floor a beat
// (`game.cheer`, stepped from `Game.update` as the animals' box is) and plays one of two, in turn (`game.cheerN`):
//   BANNER  a torn dark band slams across the middle with the soul's name and line, and the goat rises at the right of
//           it, rearing in a ring of violet cells that turns like a chain;
//   GULP    a close-up: the goat large in a ring of red-violet runes, the soul comes down, he throws his head back and
//           swallows it, a flash and he snaps forward, the name under him.
// Everything in cells or whole sprites; render only, the floor is only held. Any press after `skip` s ends it.
const Cheer = {
  start(game, b) {
    const C = TUNING.cheer; if (!C || !C.on || !b) return;
    const n = game.cheerN = (game.cheerN || 0) + 1;
    const kind = C.only || (n % 2 ? 'banner' : 'gulp');
    game.cheer = { b, kind, t: 0, time: C[kind].time, bleat: false };
    // REAR (19 Oct 2026, his: "the celebration on the same screen: the goat just rears onto his hind legs or something"):
    // no screen of its own; the floor holds a beat while he goes up on his hind legs where he stands (`rearK`, read by
    // `PaintedArt.drawGoat`), a burst of violet round him, a bleat at the top
    if (kind === 'rear') { const g = game.goat; if (g) { game.particles(g.x, g.y - 14, C.rear.sparks, PALETTE.witchHi, 170); game.ring(g.x, g.y, 1.4 * TILE, PALETTE.witch, 0.45, 2);
      if (g.snowK > 0 && typeof Snow !== 'undefined') { Snow.shake(game, g); g.snowK = 0; } } }   // up on his hind legs, the snow comes off
  },
  // how far up he is, 0..1: up in `up` s, held with his forelegs pawing the air, down in the last `down` s
  rearK(c) { const R = TUNING.cheer.rear; return this.ease(c.t / R.up) * clamp((c.time - c.t) / R.down, 0, 1); },
  update(game, dt) {
    const c = game.cheer, C = TUNING.cheer, I = game.input;
    c.t += dt;
    if (c.kind === 'rear' && !c.bleat && c.t >= C.rear.up) { c.bleat = true; game.audio.sfxBleat && game.audio.sfxBleat(330, 0.16, 0.4); game.vibe && game.vibe(14); }
    if (c.kind === 'gulp' && !c.bleat && c.t >= C.gulp.swallow) { c.bleat = true; game.audio.sfxBleat && game.audio.sfxBleat(); game.vibe && game.vibe(18); }
    if (c.t >= c.time || (c.t >= C.skip && (I.lmbPressed || I.spacePressed || I.rollPressed))) game.cheer = null;
  },
  // A hard step in, a hold, a step out: 0..1 over the scene's `time`.
  fade(c, out) { return clamp(c.t / 0.12, 0, 1) * clamp((c.time - c.t) / out, 0, 1); },
  ease(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); },
  back(x) { x = clamp(x, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); },

  draw(R, game) {
    const c = game.cheer; if (!c || c.kind === 'rear') return;   // the rear is drawn on him (`PaintedArt.drawGoat`)
    const ctx = R.ctx; ctx.save();

    if (c.kind === 'banner') this.drawBanner(R, game, c); else this.drawGulp(R, game, c);
    ctx.restore(); ctx.globalAlpha = 1;
  },
  // a ring of square cells, `n` of them, every `on`-th of `of` lit (a chain's links), turned by `a`
  ring(ctx, cx, cy, r, cell, n, a, col, on, of) {
    ctx.fillStyle = col;
    n = Math.max(n, Math.round(Math.PI * 2 * r / cell));   // never sparser than a cell a cell of its round
    for (let i = 0; i < n; i++) {
      if (of && (i % of) >= on) continue;
      const q = a + i / n * Math.PI * 2;
      ctx.fillRect(Math.round((cx + Math.cos(q) * r) / cell) * cell - cell / 2, Math.round((cy + Math.sin(q) * r) / cell) * cell - cell / 2, cell, cell);
    }
  },
  text(R, c, x, y, w, size, align) {
    const ctx = R.ctx, b = c.b;
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.font = `${Math.round(size)}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ink; ctx.fillText(b.name, x + size * 0.06, y + size * 0.08);
    ctx.fillStyle = PALETTE.bone; ctx.fillText(b.name, x, y);
    const d = typeof b.desc === 'string' ? b.desc : '';
    if (!d) return;
    ctx.font = FONT_PICK.font('text', Math.round(size * 0.42)); ctx.fillStyle = PALETTE.witchHi;
    R.wrap(d, w).slice(0, 2).forEach((l, i) => ctx.fillText(l, x, y + size * (0.62 + i * 0.5)));
  },

  drawBanner(R, game, c) {
    const C = TUNING.cheer.banner, ctx = R.ctx, W = R.vw, H = R.vh, s = R.s, cell = Math.max(3, Math.round(C.cell * s));
    const a = this.fade(c, C.out), slide = this.ease(c.t / C.slide), rise = this.back((c.t - C.slide * 0.6) / C.rise);
    // the floor dimmed to ember under it
    ctx.globalAlpha = 0.55 * a; ctx.fillStyle = PALETTE.bloodDark; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.35 * a; ctx.fillStyle = PALETTE.ink; ctx.fillRect(0, 0, W, H);
    // the band: torn top and bottom edges in cells, sliding in from the left
    const bh = Math.round(H * C.band / cell) * cell, by = Math.round((H * 0.5 - bh / 2) / cell) * cell, bx = -W + W * slide;
    ctx.globalAlpha = a;
    for (let x = 0; x < W; x += cell) {
      const k = Math.floor(x / cell), up = Math.floor(farHash(k, 3) * 3), dn = Math.floor(farHash(k, 7) * 3);
      ctx.fillStyle = PALETTE.ink; ctx.fillRect(bx + x, by - up * cell, cell, bh + (up + dn) * cell);
      if (farHash(k, 11) < 0.18) { ctx.fillStyle = PALETTE.witch; ctx.fillRect(bx + x, by + bh + dn * cell, cell, cell); }
    }
    // a lighter stripe inside, as the card's own
    ctx.fillStyle = '#1d1430'; ctx.fillRect(bx, by + cell * 2, W, Math.round(bh * 0.42 / cell) * cell);
    // the soul at the left in its burst of cells, then the words
    const sx = bx + W * 0.12, sy = by + bh / 2, spin = c.t * 1.6;
    this.ring(ctx, sx, sy, bh * 0.36, cell, 10, spin, PALETTE.fireHi, 1, 2);
    R.soulWisp(sx, sy, 1.6 * s, c.t * 3, 1, true);
    this.text(R, c, sx + bh * 0.55, by + bh * 0.46, W * 0.45, Math.max(26 * s, bh * 0.3), 'left');
    // him at the right, up out of the bottom of the screen and rearing in his ring
    const gh = H * C.goat, gx = W * 0.8, foot = H + gh * 0.15 - (gh * 0.95) * rise;
    const rc = foot - gh * 0.52, rr = gh * 0.58;
    ctx.globalAlpha = a * 0.9; this.ring(ctx, gx, rc, rr, cell * 2, 36, -c.t * 0.9, PALETTE.fire, 2, 3);
    ctx.globalAlpha = a; this.ring(ctx, gx, rc, rr - cell * 2, cell, 60, c.t * 0.5, PALETTE.witchHi, 1, 4);
    const rear = -C.rear * Math.max(0, Math.sin(clamp(c.t / C.slide, 0, 6) * 1.4)) * (c.t < C.slide * 3 ? 1 : 0.6);
    ctx.save(); ctx.translate(gx, foot); ctx.rotate(rear); ctx.translate(-gx, -foot);
    Codex.portrait(R, game, gx, foot, gh, game.mods, Shop.wearOf(game), 'cheer');
    ctx.restore();
    // sparks off the ring
    ctx.fillStyle = PALETTE.fireHi;
    for (let i = 0; i < C.sparks; i++) {
      const q = farHash(i, 5) * Math.PI * 2, life = (c.t * (0.6 + farHash(i, 9)) + farHash(i, 13)) % 1, d = rr * (1 + life * 0.7);
      ctx.globalAlpha = a * (1 - life); ctx.fillRect(Math.round((gx + Math.cos(q) * d) / cell) * cell, Math.round((rc + Math.sin(q) * d) / cell) * cell, cell, cell);
    }
  },

  drawGulp(R, game, c) {
    const C = TUNING.cheer.gulp, ctx = R.ctx, W = R.vw, H = R.vh, s = R.s, cell = Math.max(3, Math.round(C.cell * s));
    const a = this.fade(c, C.out), t = c.t;
    ctx.globalAlpha = 0.88 * a; ctx.fillStyle = '#140a1c'; ctx.fillRect(0, 0, W, H);
    const gh = H * C.goat, cx = W * 0.5, foot = H * 0.86, rc = foot - gh * 0.55;
    // the runes behind him: a broken ring of red cells turning one way, violet the other, beating when he swallows
    const beat = t > C.swallow ? 1 + 0.08 * Math.max(0, 1 - (t - C.swallow) * 3) : 1;
    ctx.globalAlpha = a * 0.85; this.ring(ctx, cx, rc, gh * 0.62 * beat, cell * 2, 48, t * 0.4, PALETTE.blood, 5, 8);
    ctx.globalAlpha = a * 0.7; this.ring(ctx, cx, rc, gh * 0.5 * beat, cell, 70, -t * 0.7, PALETTE.witch, 3, 5);
    // the head thrown back as the soul comes down, then snapped forward at the swallow
    const down = this.ease(t / C.swallow), back = t < C.swallow ? -C.tilt * this.ease((t - C.swallow * 0.45) / (C.swallow * 0.55)) : -C.tilt * Math.max(0, 1 - (t - C.swallow) / 0.12) + C.snap * Math.max(0, Math.sin(clamp((t - C.swallow) / 0.35, 0, 1) * Math.PI));
    const sq = t > C.swallow ? 1 - 0.08 * Math.max(0, 1 - (t - C.swallow) * 4) : 1;
    ctx.globalAlpha = a; ctx.save(); ctx.translate(cx, foot); ctx.rotate(back); ctx.scale(1 / sq, sq); ctx.translate(-cx, -foot);
    Codex.portrait(R, game, cx, foot, gh, game.mods, Shop.wearOf(game), 'cheer');
    ctx.restore();
    // the soul: from over the top of the screen to his mouth, shrinking into it
    if (t < C.swallow) {
      // his mouth where the thrown-back head has it: the point turned about his feet with him
      const ux = gh * C.mouth[0], uy = -gh * C.mouth[1], mx = cx + ux * Math.cos(back) - uy * Math.sin(back), my = foot + ux * Math.sin(back) + uy * Math.cos(back);
      const wx = mx + (cx - mx) * (1 - down) * 0.2, wy = -gh * 0.1 + (my + gh * 0.1) * down, k = 1 - 0.75 * this.ease((t - C.swallow * 0.6) / (C.swallow * 0.4));
      R.soulWisp(wx, wy, 2.2 * s * k, t * 4, 1, true);
    } else {
      // the flash and a burst of cells out of him
      const f = clamp(1 - (t - C.swallow) / 0.25, 0, 1);
      if (f > 0) { ctx.globalAlpha = a * f * 0.6; ctx.fillStyle = PALETTE.witchHi; ctx.fillRect(0, 0, W, H); }
      const p = clamp((t - C.swallow) / 0.6, 0, 1);
      ctx.globalAlpha = a * (1 - p); ctx.fillStyle = PALETTE.witchHi;
      for (let i = 0; i < C.sparks; i++) {
        const q = farHash(i, 21) * Math.PI * 2, d = gh * (0.2 + p * (0.5 + farHash(i, 23) * 0.6));
        ctx.fillRect(Math.round((cx + Math.cos(q) * d) / cell) * cell, Math.round((rc + Math.sin(q) * d) / cell) * cell, cell, cell);
      }
    }
    // the name under him once it is in
    const ta = a * clamp((t - C.swallow) / 0.2, 0, 1);
    if (ta > 0) { ctx.globalAlpha = ta; this.text(R, c, cx, H * 0.13, W * 0.6, Math.max(26 * s, H * 0.055), 'center'); }
  },
};
if (typeof module !== 'undefined') module.exports = { Cheer };
