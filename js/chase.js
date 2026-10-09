'use strict';
// THE CHASE (6 Oct 2026), the first level modifier (`LEVEL_MODS`, `levelDef.mods`, `TUNING.chase`).
// "A red screen comes slowly from the left until it takes 20% of the screen, and different enemies can run
// out of it. When you run away, the red shrinks and you get a bit more time."
//
// `game.chase` is the floor's state: `p`, the pressure 0..1, grows on the clock and is paid back by
// distance gained toward the stairs (the exit field `Beast.exit` already lays, a tile at a time), so a
// goat who keeps going holds it small and one who stands, loiters or goes back lets it fill. From
// `spawn.from` men come out of the red: plain men of the floor's own crowd, `e.chaser`, awake and on him.
// They pay nothing (no white souls, no kill on the floor's count) so an endless supply is never a farm,
// and they never keep a room behind him open (the clamp skips them; walled in, they are let go).
//
// Render only in `draw`: a hard field of square cells at the left of the screen in screen space, a
// ragged flickering edge, embers off it; the HUD is drawn over it.
const Chase = {
  // Whether this floor has it: its own `mods`, or the dev drawer's CHASE row over any floor but the trip,
  // heaven and THE SHOWROOM.
  on(game) {
    const L = game.level, d = L && L.def; if (!d || d.shroom || d.heaven || game.showroomOn) return false;
    return !!(d.mods && d.mods.includes('chase')) || Chase.forced(game) || Chase.quest(game);
  },
  // Worn as the horse's dare from heaven (`Heaven.QUESTS`, `questOn('horse')`): on `quests.horse.chance` of the floors past
  // the first while it holds (7 Oct 2026, "two floors at random come with the chase", `Heaven.chaseRoll`), until it is
  // won (`Heaven.questFloor`) or let go at the post.
  quest(game) {
    const d = game.level && game.level.def;
    return !!(d && !d.shroom && !d.heaven && !game.showroomOn && !game.runJumped && levelIndexOf(d) >= 1 && typeof Heaven !== 'undefined' && Heaven.questOn('horse') && Heaven.chaseRoll(game));
  },
  // Laid over a floor that does not have it by the dev drawer (the run code's `C`).
  forced(game) {
    const d = game.level && game.level.def;
    return !!(game.dev && game.dev.chase && !(typeof RELEASE !== 'undefined' && RELEASE.on) && d && !d.shroom && !d.heaven && !game.showroomOn
      && !(d.mods && d.mods.includes('chase')));
  },

  // At the head of every floor (`startLevel`) and when the dev row is thrown: a fresh state, or none.
  start(game) {
    game.chase = null;
    if (!game.world || !Chase.on(game)) return;
    const f = Beast.exit(game), at = Chase.exitAt(game, game.goat.x, game.goat.y);
    game.chase = { p: 0, show: 0, t: 0, best: at >= 0 ? at : Infinity, spawnT: 0, cueT: -1e9, told: false,
      motes: [], banner: TUNING.chase.banner.time, field: f ? f.d : null, seen: false };
  },

  // How many tiles' walk from the stairs (x, y) is, -1 off the field.
  exitAt(game, x, y) {
    const f = game.exitField, w = game.world; if (!f || !f.d || f.level !== game.level) return -1;
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) return -1;
    return f.d[ty * w.W + tx];
  },

  // One step of play (`Game.update`, after the clock moves, so a card, a talk box, the mouse's offer or a
  // soul's cards hold it still: none of them reach here).
  update(game, dt) {
    const c = game.chase; if (!c) return;
    const C = TUNING.chase, g = game.goat; if (!g || g.dead) return;
    c.t += dt; c.banner = Math.max(0, c.banner - dt);
    // Paid back by the way out: every tile nearer the stairs than he has ever been on this floor.
    const d = Chase.exitAt(game, g.x, g.y);
    if (d >= 0 && d < c.best) { if (c.best !== Infinity) c.p -= (c.best - d) * C.perTile; c.best = d; }
    // Growing, after the grace. Slower while he is fighting the floor's own men near him, and not at all
    // shut inside a sealed arena: there is nowhere to run to, and the seal is the room's to settle.
    let grow = c.t > C.grace ? dt / C.fill : 0;
    if (grow && Chase.sealedIn(game)) grow = 0;
    if (grow && Chase.fighting(game)) grow *= C.fightMul;
    c.p = clamp(c.p + grow, 0, 1);
    c.show += (c.p - c.show) * Math.min(1, dt * C.ease);
    Chase.updateMen(game, dt);
    Chase.spawnStep(game, dt);
    Chase.updateMotes(c, dt);
  },

  sealedIn(game) {
    const g = game.goat;
    return (game.sealedRooms || []).some((s) => s.armed && !s.open && game.inRoom(g, s.room, 0));
  },
  // One of the floor's own men (not a chaser) awake and after him close by.
  fighting(game) {
    const g = game.goat, R2 = (TUNING.chase.fightR * TILE) ** 2;
    return game.enemies.some((e) => !e.dead && !e.chaser && !e.scripted && e.aware && e.woke && (e.x - g.x) ** 2 + (e.y - g.y) ** 2 < R2);
  },

  // The men out of the red: put back on his trail when they lose it, let go when left behind or walled in.
  updateMen(game, dt) {
    const C = TUNING.chase, g = game.goat, w = game.world, L = game.level;
    let gone = false;
    for (const e of game.enemies) {
      if (!e.chaser || e.dead) continue;
      // A room shut behind him (the clamp) walls him in, or the mouth's new stone is under his feet.
      const r = roomAt(L, e.x, e.y), tile = w.tileAtPx(e.x, e.y);
      const lostD = w.flowDist(e.x, e.y), far = lostD < 0 || lostD > C.drop.d;
      e.chaseOut = far && !Chase.inView(game, e.x, e.y) ? (e.chaseOut || 0) + dt : 0;
      if (!e.held && g.holding !== e && ((r && r.clamped) || tile === T.WALL || e.chaseOut > C.drop.t)) { e.chaseGone = true; gone = true; continue; }
      // They smell him: lured off by the scream or gone cold, a beat later they are on him again.
      if (e.state === 'idle' || e.state === 'investigate') {
        e.scentT = (e.scentT || 0) + dt;
        if (e.scentT > C.scent) { e.scentT = 0; e.aware = true; e.lastSeen = { x: g.x, y: g.y }; e.lostTimer = 0; e.state = 'chase'; }
      } else e.scentT = 0;
    }
    if (gone) {
      const keep = game.enemies.filter((e) => !e.chaseGone);
      game.enemies.length = 0; for (const e of keep) game.enemies.push(e);
    }
  },
  inView(game, x, y) {
    const v = game.renderer.view(game.cam), m = 2 * TILE;
    return Math.abs(x - game.cam.x) < v.w / 2 + m && Math.abs(y - game.cam.y) < v.h / 2 + m;
  },

  spawnStep(game, dt) {
    const c = game.chase, S = TUNING.chase.spawn;
    if (c.p < S.from) { c.spawnT = Math.max(c.spawnT, 0); return; }
    const k = clamp((c.p - S.from) / (1 - S.from), 0, 1);
    const cap = Math.round(lerp(S.cap[0], S.cap[1], k));
    const alive = game.enemies.reduce((n, e) => n + (e.chaser && !e.dead ? 1 : 0), 0);
    c.spawnT -= dt;
    if (c.spawnT > 0 || alive >= cap) return;
    const spot = Chase.spot(game);
    // No floor behind him to come out of (the start room's wall, a corner): try again soon.
    if (!spot) { c.spawnT = 0.5; return; }
    c.spawnT = lerp(S.gap[0], S.gap[1], k) * (0.8 + Math.random() * 0.4);
    Chase.spawn(game, spot, Chase.pickKind(game, c.p));
  },

  // Which man: weighted, only of the floor's own crowd (a clubman always), heavy ones only once it is full.
  pickKind(game, p) {
    const C = TUNING.chase, d = game.level.def, own = (d.encounters && d.encounters.kinds) || ['bearer'];
    const list = Object.keys(C.kinds).filter((k) => (k === 'bearer' || own.includes(k)) && (p >= C.heavyFrom || !C.heavy.includes(k)));
    let sum = 0; for (const k of list) sum += C.kinds[k];
    let r = Math.random() * sum;
    for (const k of list) { r -= C.kinds[k]; if (r <= 0) return k; }
    return 'bearer';
  },

  // A tile to come out on. Inside the band on the screen first; failing that, the floor behind him (further
  // from the stairs) the walk can reach, furthest back first. Never ahead of him, never a room not yet seen
  // or shut behind him, never near him, never stone, a hole, furniture or fire.
  spot(game) {
    const C = TUNING.chase, S = C.spawn, w = game.world, g = game.goat, L = game.level;
    const gd = Chase.exitAt(game, g.x, g.y); if (gd < 0) return null;
    const curRoom = roomAt(L, g.x, g.y), cur = curRoom ? curRoom.index : (game.goatRoom || 0);
    const v = game.renderer.view(game.cam), left = game.cam.x - v.w / 2, bandR = left + v.w * C.band * Math.max(game.chase.show, 0.5);
    const ok = (tx, ty) => {
      if (tx < 1 || ty < 1 || tx >= w.W - 1 || ty >= w.H - 1) return -1;
      const i = ty * w.W + tx; if (!w.open(i)) return -1;
      const fd = w.flow[i]; if (fd < S.minD || fd > S.maxD) return -1;
      const ed = game.exitField.d[i]; if (ed < 0 || ed < gd + S.behind) return -1;
      const x = (tx + 0.5) * TILE, y = (ty + 0.5) * TILE;
      if (hyp(x - g.x, y - g.y) < S.minR * TILE || game.hidden(x, y) || w.isBurningPx(x, y)) return -1;
      // Never out of a room ahead of the one he is in, nor further back than the next one: the men two rooms
      // off are not simulated, and one stood there would wait for him in the dark.
      const r = roomAt(L, x, y), ri = r ? r.index : game.nearestRoomIdx(x, y, cur);
      if (ri > cur || ri < cur - 1) return -1;
      return ed;
    };
    const tx0 = Math.floor(left / TILE) - S.slack, tx1 = Math.floor(bandR / TILE);
    const ty0 = Math.floor((game.cam.y - v.h / 2) / TILE), ty1 = Math.floor((game.cam.y + v.h / 2) / TILE);
    const band = [];
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (ok(tx, ty) >= 0) band.push([tx, ty]);
    if (band.length) { const [tx, ty] = band[(Math.random() * band.length) | 0]; return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }; }
    // Off the picture: the floor behind him within the walk, the furthest back few.
    const back = [], R = S.maxD, gx = Math.floor(g.x / TILE), gy = Math.floor(g.y / TILE);
    for (let ty = gy - R; ty <= gy + R; ty++) for (let tx = gx - R; tx <= gx + R; tx++) { const ed = ok(tx, ty); if (ed >= 0) back.push([tx, ty, ed]); }
    if (!back.length) return null;
    back.sort((a, b) => b[2] - a[2]);
    const [tx, ty] = back[(Math.random() * Math.min(6, back.length)) | 0];
    return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
  },

  spawn(game, at, kind) {
    const c = game.chase, g = game.goat;
    const e = new Enemy(at.x, at.y, kind === 'champion' ? 'bearer' : kind);
    if (kind === 'champion') { e.champion = true; e.hp = e.maxHp = TUNING.champion.hp; }
    // Nobody's room: no seal, gate or cleared room waits on him (`e.room` is who a man was put with).
    e.room = -1; e.chaser = true; e.woke = true; e.aware = true; e.state = 'chase';
    e.lastSeen = { x: g.x, y: g.y }; e.lostTimer = 0; e.spotT = game.timer; e.alarmAt = game.timer;
    e.facing = Math.atan2(g.y - at.y, g.x - at.x);
    game.enemies.push(e);
    game.particles(at.x, at.y, 10, PALETTE.blood, 150);
    if (!c.told) { c.told = true; game.bark(e, 'spot', 1); }
    // The first men out of it are heard: a low toll, at most every `cue.gap` s, and the score's SPOTTED.
    if (game.timer - c.cueT > TUNING.chase.cue.gap) { c.cueT = game.timer; game.audio.sfxToll(); game.audio.musicEvent('spotted'); }
    return e;
  },

  // Embers off the edge, in the band's own space (x a share of the band's width, y a share of the height).
  updateMotes(c, dt) {
    const N = TUNING.chase.look.motes, want = Math.round(N * c.show);
    while (c.motes.length < want) c.motes.push({ x: Math.random() * 0.9, y: Math.random(), vx: 0.25 + Math.random() * 0.5, vy: -0.03 - Math.random() * 0.06, life: 0.6 + Math.random() * 1.6, t: 0, hot: Math.random() < 0.3 });
    for (const m of c.motes) { m.t += dt; m.x += m.vx * dt; m.y += m.vy * dt; }
    keepIf(c.motes, (m) => m.t < m.life && m.y > -0.05);
  },

  // Screen space, over the world and under the HUD (`Renderer.drawUI`).
  draw(R, game) {
    const c = game.chase; if (!c || !game.level) return;
    if (game.state !== 'play' && game.state !== 'paused' && game.state !== 'boon' && game.state !== 'dead') return;
    const L = TUNING.chase.look, ctx = R.ctx, cell = Math.max(2, Math.round(L.cell * R.s));
    // Never over the goat himself: at the head of a floor the camera stands at the world's edge and he is at the
    // left of the picture, and a goat drawn under the red is a goat nobody can play. The pressure is not cut.
    const g = game.goat, gsx = g ? R.vcx + (g.x - game.cam.x) * game.cam.zoom : R.vw;
    // It backs off as he walks at it (9 Oct 2026 playtest: "the chase does not step back when I come up to it"): `clear` tiles
    // of floor always between the field and him, the field easing back to there (`c.backW`) rather than cut at his heels.
    const want = Math.max(0, Math.min(c.show * TUNING.chase.band * R.vw, gsx - L.clear * TILE * game.cam.zoom));
    const fdt = clamp((game.timer || 0) - (c.backAt === undefined ? game.timer || 0 : c.backAt), 0, 0.1); c.backAt = game.timer || 0;
    c.backW = c.backW === undefined ? want : want < c.backW ? c.backW + (want - c.backW) * Math.min(1, L.back * fdt) : want;
    const W = c.backW, H = R.vh;
    // The whole frame reddens a little once it is most of the way full.
    if (c.show > L.tintFrom) { ctx.fillStyle = PALETTE.blood; ctx.globalAlpha = L.tint * (c.show - L.tintFrom) / (1 - L.tintFrom); ctx.fillRect(0, 0, R.vw, H); ctx.globalAlpha = 1; }
    if (W < cell) return;
    const rows = Math.ceil(H / cell), cols = Math.floor(W / cell), step = Math.floor(game.timer * L.rate);
    // Under the row of hearts the field is near black: red hearts on red did not read.
    const hud = (L.hud * R.hs + (R.portrait ? 12 * R.hs : 0)) / cell;
    // Each row of cells ends at its own ragged depth, re-cut `rate` times a second: a hard field, a rim of
    // brighter cells at the edge, and a cell of fire here and there along it.
    for (let r = 0; r < rows; r++) {
      const n = Game.shakeNoise(r * 0.45 + step * 0.13, 7) * 0.5 + 0.5, flick = Math.floor(farHash(r * 31 + step, step * 7 + r) * 3);
      const end = Math.max(0, cols - Math.round(n * L.ragged) - (flick === 0 ? 1 : 0)), y = r * cell;
      ctx.globalAlpha = L.alpha; ctx.fillStyle = r < hud ? PALETTE.ink : PALETTE.bloodDark; ctx.fillRect(0, y, Math.max(0, end - 2) * cell, cell);
      ctx.fillStyle = PALETTE.blood; ctx.globalAlpha = 0.75; ctx.fillRect(Math.max(0, end - 2) * cell, y, Math.min(2, end) * cell, cell);
      ctx.globalAlpha = 0.9; ctx.fillStyle = PALETTE.blood; ctx.fillRect(end * cell, y, cell, cell);
      if (flick === 1 && farHash(r, step) < 0.125) { ctx.fillStyle = PALETTE.fire; ctx.fillRect((end + 1) * cell, y, cell, cell); }
    }
    // A slow pulse of darker cells through the field, so it reads as something alive rather than a wall.
    ctx.fillStyle = PALETTE.ink; ctx.globalAlpha = 0.3;
    for (let r = 0; r < rows; r += 2) for (let q = (r + step) % 5; q < cols - 4; q += 5) if (farHash(q * 13 + r, (step >> 2) + q) < 0.25) ctx.fillRect(q * cell, r * cell, cell, cell);
    ctx.globalAlpha = 1;
    for (const m of c.motes) {
      const a = clamp(1 - m.t / m.life, 0, 1), x = Math.floor(m.x * W / cell) * cell, y = Math.floor(m.y * H / cell) * cell;
      ctx.globalAlpha = a; ctx.fillStyle = m.hot ? PALETTE.fireHi : PALETTE.fire; ctx.fillRect(x, y, cell, cell);
    }
    ctx.globalAlpha = 1;
  },

  // THEY ARE COMING. KEEP RUNNING. once the card has cleared, then gone.
  drawBanner(R, game) {
    const c = game.chase; if (!c || c.banner <= 0 || game.state !== 'play') return;
    const B = TUNING.chase.banner, ctx = R.ctx, a = clamp(c.banner / B.fade, 0, 1) * clamp((B.time - c.banner) / 0.3, 0, 1);
    const px = Math.max(12 * R.s, 20 * R.hs), text = LEVEL_MODS.chase.banner;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.font = `700 ${px}px ${FONT_SC}`;
    const y = R.vh * 0.13;
    ctx.fillStyle = PALETTE.ink; ctx.fillText(text, R.vw / 2 + 2 * R.s, y + 2 * R.s);
    ctx.fillStyle = PALETTE.blood; ctx.fillText(text, R.vw / 2, y);
    ctx.restore();
  },
};
