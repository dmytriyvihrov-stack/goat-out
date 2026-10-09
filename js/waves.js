// THE CORRUPTED OGRE'S WAVES (8 Oct 2026 playtest: "at the second meeting the big ogre with a soul, landing, sends
// out waves of magic flame, as in a classic bullet hell, and you have to dodge; at the third, when he just slams the
// floor, a line three rows wide runs at you fast"). Which meeting it is is the run's (`game.ogreMet`, counted the
// first time a corrupted ogre wakes, `Waves.meet`; the dev drawer's SPAWN AS sets it by hand). From `ring.from` his
// landing throws `ring.n` rings of witchfire out from where he came down, each with gaps to slip through; from
// `line.from` his slam sends a band `line.w` tiles across racing along the floor at the goat. Either costs a heart
// as it passes over him unless he is rolling (the roll's own mercy) or through a gap; stone stops the band and
// shadows the ring. Pillar 3 is the ogre's exception already (`Enemy.quake`): this is his slam carried further.
const Waves = {
  meet(game, e) {
    if (e.soulMeet || !e.soul || e.kind !== 'butcher') return;
    game.ogreMet = (game.ogreMet | 0) + 1; e.soulMeet = game.ogreMet;
  },
  land(game, e) {
    const W = TUNING.soulOgre; this.meet(game, e);
    if ((e.soulMeet | 0) < W.ring.from) return;
    game.waves = game.waves || [];
    const volley = {};   // one heart a volley at most (9 Oct 2026 playtest): the throw off the first ring carried him into the next
    for (let k = 0; k < W.ring.n; k++) {
      const gaps = []; for (let j = 0; j < W.ring.gaps; j++) gaps.push(Math.random() * Math.PI * 2);
      game.waves.push({ ring: true, x: e.x, y: e.y, r: W.ring.start * TILE, delay: k * W.ring.apart, gaps, t: 0, volley });
    }
  },
  // Rings off any spot with a ring config of their own (`cfg` like `soulOgre.ring`): the corrupted mage's rune
  // from his third meeting (js/endboss.js) sends `n` of them over the whole room.
  rings(game, x, y, C) {
    game.waves = game.waves || [];
    const volley = {};
    for (let k = 0; k < C.n; k++) {
      const gaps = []; for (let j = 0; j < C.gaps; j++) gaps.push(Math.random() * Math.PI * 2);
      game.waves.push({ ring: true, x, y, r: C.start * TILE, delay: k * C.apart, gaps, t: 0, cfg: C, volley });
    }
  },
  slam(game, e) {
    const W = TUNING.soulOgre, g = game.goat; this.meet(game, e);
    if ((e.soulMeet | 0) < W.line.from || !g) return;
    const dx = g.x - e.x, dy = g.y - e.y, d = hyp(dx, dy) || 1;
    game.waves = game.waves || [];
    // `n` bands one behind the other, each aimed again at the goat as it leaves (`aim`, in `update`); one heart a volley
    const volley = {};
    for (let k = 0; k < (W.line.n || 1); k++) game.waves.push({ ring: false, x: e.x, y: e.y, ux: dx / d, uy: dy / d, d: W.line.start * TILE, delay: k * (W.line.apart || 0), aim: k > 0, t: 0, volley });
  },
  update(game, dt) {
    const W = TUNING.soulOgre, g = game.goat, w = game.world;
    for (const v of game.waves) {
      if (v.delay > 0) {
        v.delay -= dt;
        if (v.delay <= 0 && v.aim && g && !g.dead) { const ax = g.x - v.x, ay = g.y - v.y, ad = hyp(ax, ay) || 1; v.ux = ax / ad; v.uy = ay / ad; }
        continue;
      }
      v.t += dt;
      if (v.ring) {
        const C = v.cfg || W.ring;
        v.r += C.speed * TILE * dt;
        if (v.r > C.max * TILE) v.dead = true;
        else if (!v.hit && !(v.volley && v.volley.hit) && g && !g.dead) {
          const dx = g.x - v.x, dy = g.y - v.y, d = hyp(dx, dy), a = Math.atan2(dy, dx);
          if (Math.abs(d - v.r) < C.thick * TILE / 2 + g.r * 0.5 && !v.gaps.some((q) => Math.abs(angleDiff(a, q)) < C.gap)
            && w.los(v.x, v.y, g.x, g.y)) this.hit(game, v, dx / (d || 1), dy / (d || 1));
        }
      } else {
        v.d += W.line.speed * TILE * dt;
        const fx = v.x + v.ux * v.d, fy = v.y + v.uy * v.d;
        if (v.d > W.line.max * TILE || w.tileAtPx(fx, fy) === T.WALL) v.dead = true;
        else if (!v.hit && !(v.volley && v.volley.hit) && g && !g.dead) {
          const rx = g.x - v.x, ry = g.y - v.y, along = rx * v.ux + ry * v.uy, across = Math.abs(-rx * v.uy + ry * v.ux);
          if (Math.abs(along - v.d) < W.line.depth * TILE / 2 + g.r * 0.5 && across < W.line.w * TILE / 2) this.hit(game, v, v.ux, v.uy);
        }
      }
    }
    game.waves = game.waves.filter((v) => !v.dead);
  },
  hit(game, v, nx, ny) {
    const g = game.goat;
    if (g.invuln > 0 || g.state === 'roll' || g.state === 'falling') return;   // the roll goes through it
    v.hit = true; if (v.volley) v.volley.hit = true;
    g.damage(TUNING.soulOgre.damage, game, nx * TUNING.soulOgre.knock * TILE, ny * TUNING.soulOgre.knock * TILE, false, 'witchfire');
  },
  // In cells on the floor, the witchfire's own two violets flickering; a ring fades as it spreads. Every cell goes
  // into one of four paths (core or rim, hot or not) filled once each: a cell a `fillRect` with its own colour and
  // alpha was 7 ms a frame for the mage's two rings at full spread.
  draw(R, game) {
    if (!game.waves || !game.waves.length) return;
    const ctx = R.ctx, W = TUNING.soulOgre, px = TUNING.effects.pixel * 2, t = R.t, wd = game.world;
    const stone = (x, y) => wd.tileAtPx(x + px / 2, y + px / 2) === T.WALL;   // the flame runs on the floor, never over the rock
    // buckets: [core cool, core hot, rim cool, rim hot]
    const B = [[], [], [], []], flush = (aCore, aRim) => {
      const al = [aCore, aCore, aRim, aRim];
      for (let b = 0; b < 4; b++) {
        const L = B[b]; if (!L.length) continue;
        ctx.globalAlpha = al[b]; ctx.fillStyle = b & 1 ? PALETTE.witchHi : PALETTE.witch; ctx.beginPath();
        for (let k = 0; k < L.length; k += 2) ctx.rect(L[k], L[k + 1], px, px);
        ctx.fill(); L.length = 0;
      }
    };
    ctx.save();
    for (const v of game.waves) {
      if (v.delay > 0) continue;
      if (v.ring) {
        const C = v.cfg || W.ring;
        const a = clamp(1 - (v.r / (C.max * TILE)) * 0.6, 0.25, 1), n = Math.max(24, Math.ceil(Math.PI * 2 * v.r / px)), th = C.thick * TILE, ft = Math.floor(t * 18);
        for (let i = 0; i < n; i++) {
          const ang = i / n * Math.PI * 2;
          if (v.gaps.some((q) => Math.abs(angleDiff(ang, q)) < C.gap)) continue;
          const ca = Math.cos(ang), sa = Math.sin(ang);
          for (let o = -th / 2; o <= th / 2; o += px) {
            const rr = v.r + o, cx = Math.round((v.x + ca * rr) / px) * px, cy = Math.round((v.y + sa * rr) / px) * px;
            if (stone(cx, cy)) continue;
            const hot = ((i * 7 + Math.round(o / px) * 3 + ft) % 5) === 0 ? 1 : 0;
            B[(Math.abs(o) < th / 4 ? 0 : 2) + hot].push(cx, cy);
          }
        }
        flush(a * (C.flames ? 0.55 : 0.95), a * (C.flames ? 0.35 : 0.6));
        // Fire standing on it (9 Oct 2026 playtest: "visually a bit like fire"): the game's own baked witchfire
        // (`CombatFX.flame`) every `flames` tiles round the ring, nearest the camera last, none in a gap or on stone.
        if (C.flames) {
          const step = C.flames * TILE, m = Math.max(8, Math.round(Math.PI * 2 * v.r / step)), pts = [];
          for (let i = 0; i < m; i++) {
            const ang = i / m * Math.PI * 2; if (v.gaps.some((q) => Math.abs(angleDiff(ang, q)) < C.gap)) continue;
            const fx = v.x + Math.cos(ang) * v.r, fy = v.y + Math.sin(ang) * v.r; if (stone(fx, fy)) continue;
            pts.push(fx, fy, i);
          }
          const order = []; for (let k = 0; k < pts.length; k += 3) order.push(k);
          order.sort((p, q) => pts[p + 1] - pts[q + 1]);
          ctx.globalAlpha = Math.min(1, a + 0.2); ctx.save(); ctx.scale(1, 1 / TILT);
          for (const k of order) R.flame(pts[k], pts[k + 1] * TILT, C.flameSize + (pts[k + 2] * 7) % 3, pts[k + 2] * 3 + (v.delay | 0), true);
          ctx.restore();
        }
      } else {
        const hw = W.line.w * TILE / 2, dep = W.line.depth * TILE, px2 = -v.uy, py2 = v.ux, ft = Math.floor(t * 20);
        for (let s = -hw; s <= hw; s += px) for (let o = -dep / 2; o <= dep / 2; o += px) {
          const cx = Math.round((v.x + v.ux * (v.d + o) + px2 * s) / px) * px, cy = Math.round((v.y + v.uy * (v.d + o) + py2 * s) / px) * px;
          if (stone(cx, cy)) continue;
          const hot = ((Math.round(s / px) * 5 + Math.round(o / px) * 3 + ft) % 4) === 0 ? 1 : 0;
          B[(o > 0 ? 0 : 2) + hot].push(cx, cy);
        }
        flush(W.line.flames ? 0.6 : 0.95, W.line.flames ? 0.35 : 0.55);
        // Fire standing along the band's leading edge, as on the rings (9 Oct 2026): the game's own witchfire every `flames` tiles across it
        if (W.line.flames) {
          const step = W.line.flames * TILE, m = Math.max(2, Math.round(W.line.w * TILE / step)), pts = [];
          for (let i = 0; i <= m; i++) {
            const s = -hw + (i / m) * hw * 2, fx = v.x + v.ux * v.d + px2 * s, fy = v.y + v.uy * v.d + py2 * s;
            if (!stone(fx, fy)) pts.push([fx, fy, i]);
          }
          pts.sort((p, q) => p[1] - q[1]);
          ctx.globalAlpha = 0.95; ctx.save(); ctx.scale(1, 1 / TILT);
          for (const [fx, fy, i] of pts) R.flame(fx, fy * TILT, W.line.flameSize + (i * 7) % 3, i * 3, true);
          ctx.restore();
        }
      }
    }
    ctx.restore();
  },
};
if (typeof module !== 'undefined') module.exports = { Waves };
