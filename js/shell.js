'use strict';
// TURTLEIZE (9 Oct 2026 playtest, the tortoise's gift): "replaces E: he turns into a tortoise shell, the enemies keep
// attacking and it gathers energy; let go of the button, or after 5 seconds, he turns back and throws the enemies off
// with a wave of energy; the roll's wait gets much longer; it must read as a magic shell" (a violet crystal for reference).
// An active soul on the roll (`BOONS` id `shell`), dealt only once THE TORTOISE'S PACE is won (`unlock`, `Heaven.freed`).
//
// Pillar 1: no new button, the roll pressed is the shell and held is how long it stays. Pillar 4's exception, the user's
// own: inside it every blow lands on the crystal and none reaches a heart; what it buys is paid for after, with the
// longest wait any verb has (`cooldownMul`). Pillar 3 stands: the wave only throws, and what they meet kills them.
//
// `g.shell` is the state while `g.state === 'shell'`: `t` seconds in, `hits` blows taken, the spot he is planted on.
const Shell = {
  // The roll pressed with the soul (`Goat.update`): the goat becomes the shell instead of tumbling.
  start(g, game) {
    const P = game.mods.shell;
    g.state = 'shell'; g.shell = { t: 0, hits: 0, x: g.x, y: g.y, flash: 0, pulse: 0 };
    g.vx = g.vy = 0; g.rollBuf = 0; g.runT = 0; g.runUp = 1;
    if (g.holding) {
      const h = g.holding; g.holding = null; h.held = false; g.autoHeld = false;
      if (!h.item) { h.state = 'floored'; h.timer = TUNING.goat.grab.letGo; }
      g.spendGrab(game, !h.item);
    }
    game.audio.sfxChime(TUNING.heaven.bells[5], 0.55); game.audio.sfxChime(TUNING.heaven.bells[2], 0.4, 0.08);
    game.particles(g.x, g.y - 8, 14, P.color.light, 150); game.squashGoat(TUNING.juice.squash.land);
    game.vibe(14);
  },
  // One step while shelled: planted, nothing of his own but letting go.
  step(g, game, dt) {
    const S = g.shell, P = game.mods.shell;
    if (!S || !P) { g.state = 'idle'; g.shell = null; return; }
    S.t += dt; S.flash = Math.max(0, S.flash - dt); S.pulse += dt;
    g.vx = 0; g.vy = 0; g.x = S.x; g.y = S.y;   // a shell is not shoved: whatever moved him last step is undone
    g.burnStep(game, game.world, dt);           // fire on his tile still bites, and the crystal takes it (`absorb`)
    if (g.state !== 'shell') return;
    if ((S.t >= P.min && !game.rollHeldNow()) || S.t >= P.time) this.burst(g, game);
  },
  // A blow on him while shelled (`Goat.damage`): the crystal takes it whole and keeps it. Always true.
  absorb(g, game, n, kx, ky) {
    const S = g.shell, P = game.mods.shell;
    S.hits = Math.min(P.hitsMax, S.hits + Math.max(1, n | 0)); S.flash = 0.16;
    const a = Math.atan2(-(ky || 0), -(kx || 0));
    game.particles(g.x + Math.cos(a) * 12, g.y - 10 + Math.sin(a) * 8, 6, P.color.glint, 160);
    game.audio.sfxChime(TUNING.heaven.bells[(S.hits * 3) % TUNING.heaven.bells.length], 0.35); game.audio.sfxClatter('metal', 0.25);
    game.hitstop(0.03); game.vibe(10);
    return true;
  },
  // The radius and the throw the blows taken have bought.
  power(game, S) {
    const P = game.mods.shell;
    return { r: Math.min(P.rMax, P.r + P.rPer * S.hits) * TILE, fling: Math.min(P.flingMax, P.fling + P.flingPer * S.hits) };
  },
  // Let go, or out of time: he is a goat again, and the wave goes out off him.
  burst(g, game) {
    const S = g.shell, P = game.mods.shell, W = this.power(game, S), L = TUNING.cape.ruin;
    for (const e of game.enemies) {
      if (e.dead || e.held || e.ghosted || e.state === 'hidden' || e.state === 'hop') continue;
      const dx = e.x - g.x, dy = e.y - g.y, d = hyp(dx, dy);
      if (d > W.r + e.r || !game.blastClear(g.x, g.y, e.x, e.y)) continue;
      const nx = dx / (d || 1), ny = dy / (d || 1);
      // Nothing throws the ogre or the rat ogre: the wave only rocks them, as the CAPE OF RUIN's does.
      if (e.kind === 'butcher') { e.state = 'stagger'; e.timer = L.stagger; e.aware = true; continue; }
      if (e.kind === 'ratogre') { e.daze(game, L.stagger); continue; }
      e.daze(game, P.daze);
      e.fling(nx * W.fling * TILE * e.knockMul(), ny * W.fling * TILE * e.knockMul(), false);
      e.flash = Math.max(e.flash || 0, TUNING.juice.hitFlash);
    }
    g.state = 'idle'; g.shell = null; g.invuln = Math.max(g.invuln, P.after);
    g.rollCd = g.rollCdMax = TUNING.goat.roll.cooldown * game.mods.rollCooldown * P.cooldownMul;
    game.ring(g.x, g.y, W.r, P.color.light, 0.55, 4); game.ring(g.x, g.y, W.r * 0.6, P.color.glint, 0.35, 2);
    game.particles(g.x, g.y - 6, 18 + S.hits * 3, P.color.light, 260); game.particles(g.x, g.y - 6, 8, P.color.glint, 200);
    game.thud(g.x, g.y, 0.4 + 0.08 * S.hits); game.hitstop(0.05); game.squashGoat(TUNING.juice.squash.land);
    game.audio.sfxBoom(); game.audio.sfxChime(TUNING.heaven.bells[0], 0.7); game.vibe(30);
    game.world.emitNoise(g.x, g.y, TUNING.noise.boom);
  },

  // ---------------------------------------------------------------- the picture
  // The shell as cells on the goat's grain (`cell` world px), drawn in his place: a domed carapace of violet crystal, its
  // scutes seamed in a line that glows brighter with every blow taken, three shards standing out of its crown, and on the
  // floor round it a ring of cells where the wave will reach. Baked once a look (`bake`), the glow laid over it live.
  SHARDS: [[-4, 3], [0, 5], [4, 3]],
  bake(P) {
    const key = P.cell + ':' + P.color.mid;
    if (this.baked && this.baked.key === key) return this.baked;
    const C = P.color, c = P.cell, W = 21, H = 21, ox = 10, oy = 17;   // cells; (ox, oy) is his feet
    const grid = new Map(), at = (x, y) => grid.get(x + ',' + y), set = (x, y, v) => grid.set(x + ',' + y, v);
    const inDome = (x, y) => y <= 1 && (x / 9.4) ** 2 + ((y + 0.4) / 9.6) ** 2 <= 1;
    for (let y = -10; y <= 1; y++) for (let x = -10; x <= 10; x++) if (inDome(x, y)) {
      // the scutes: a stack of three down the middle, a row of plates round them
      const seam = (Math.abs(x) === 3 && y >= -8 && y <= -1) || ((y === -6 || y === -3) && Math.abs(x) <= 3) || (y === -4 && Math.abs(x) >= 6) || (Math.abs(x) === 6 && y >= -4 && y <= -1);
      const lit = x * 0.8 + y < -8, deep = y >= 0 || x * 0.7 - y * 0.2 > 6;
      set(x, y, seam ? 's' : y >= 0 ? 'd' : lit ? 'l' : deep ? 'd' : 'm');
    }
    // the shards out of the crown, two cells thick and a point, the side ones leaning out
    for (const [sx, h] of this.SHARDS) {
      let top = 1; while (inDome(sx, top - 1) || inDome(sx - 1, top - 1)) top--;
      for (let k = 1; k <= h; k++) {
        const y = top - k, lean = Math.sign(sx) * Math.floor(k / 2);
        if (k === h) set(sx + lean, y, 'l');
        else { set(sx - 1 + lean, y, 'l'); set(sx + lean, y, 'd'); }
      }
    }
    for (const [x, y] of [[-5, -7], [-4, -8], [-6, -5], [-1, -9]]) if (at(x, y)) set(x, y, 'w');
    const cv = document.createElement('canvas'); cv.width = W * c + 2 * c; cv.height = H * c + 2 * c;
    const ctx = cv.getContext('2d'), col = { l: C.light, m: C.mid, d: C.dark, s: C.seam, w: C.glint };
    // the outline first, a cell out on every side of the shape
    ctx.fillStyle = C.rim;
    for (const k of grid.keys()) { const [x, y] = k.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!at(x + dx, y + dy)) ctx.fillRect((x + dx + ox + 1) * c, (y + dy + oy + 1) * c, c, c); }
    for (const [k, v] of grid) { const [x, y] = k.split(',').map(Number); ctx.fillStyle = col[v]; ctx.fillRect((x + ox + 1) * c, (y + oy + 1) * c, c, c); }
    const seams = [];
    for (const [k, v] of grid) if (v === 's') seams.push(k.split(',').map(Number));
    this.baked = { key, cv, ox: (ox + 1) * c, oy: (oy + 1) * c, seams, c };
    return this.baked;
  },
  draw(R, game, g) {
    const P = game.mods.shell, S = g.shell; if (!P || !S) return;
    const ctx = R.ctx, B = this.bake(P), c = B.c, W = this.power(game, S);
    // where the wave reaches: a ring of cells on the floor, brighter as it grows
    ctx.save();
    ctx.fillStyle = P.color.light; ctx.globalAlpha = 0.28 + 0.2 * Math.sin(S.pulse * 6);
    const n = Math.max(24, Math.round(W.r / 6));
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; ctx.fillRect(Math.round(g.x + Math.cos(a) * W.r - c / 2), Math.round(g.y + Math.sin(a) * W.r - c / 2), c * 1.4, c * 1.4); }
    ctx.restore();
    R.shadow(g.x, g.y, 20, 8);
    ctx.save(); ctx.translate(Math.round(g.x), Math.round(g.y)); ctx.scale(1, 1 / TILT);
    const sq = S.t < 0.12 ? 1 + (0.12 - S.t) * 2.5 : 1;   // it lands, squashed, then stands
    ctx.scale(sq, 1 / sq);
    ctx.drawImage(B.cv, -B.ox, -B.oy);
    // the seams glow with what it holds, and every blow flashes the whole shell white
    const glow = clamp(S.hits / Math.max(1, P.hitsMax * 0.6), 0, 1), beat = 0.5 + 0.5 * Math.sin(S.pulse * (5 + glow * 7));
    ctx.fillStyle = glow > 0.5 ? P.color.glint : P.color.light; ctx.globalAlpha = 0.25 + 0.6 * glow * beat;
    for (const [x, y] of B.seams) ctx.fillRect(x * c, y * c, c, c);
    if (S.flash > 0) { ctx.globalAlpha = S.flash / 0.16 * 0.85; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(B.cv, -B.ox, -B.oy); }
    ctx.restore();
  },
};
