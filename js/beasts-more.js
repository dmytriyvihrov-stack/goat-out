// THE RABBIT AND THE HUSKY (1 Oct 2026, playtest), and the answer every animal now waits for.
//
//   RABBIT  "he offers to tie your legs — no running, only the headbutt, the skills and the items —
//           so you try it his way, in jumps". Said yes: `game.legsTied`. No stride at all; the roll
//           is the hop, where you point and back far sooner (`TUNING.prop.rabbit.tied`). Up the stairs
//           with him so: the roll comes back sooner for the run.
//   HUSKY   "she runs into the next room where the men are and they leave her be; you follow, she
//           sings WAF WOOO and you answer with your BAAH, like Guitar Hero — her stave and yours;
//           the cooldown is what makes it hard, in a fight". Said yes: a practice first, the two of
//           them in an empty room (`game.song.practice`), then she leads to the fullest room ahead,
//           the song starts as he comes in (`game.song`), and his voice, on the beat, answers.
//
// Every animal, once it has said its terms in the box, waits for BAAAH (yes) or bah (no) (`BEAST_ANSWER`,
// `Beast.answer`): refused, it goes its own way and pays nothing.
//
// Both are drawn as hand-placed pixels on `PROP_PIXELS.Grid` (side on, facing right), the recipe of
// every prop, and loaded after js/prop-pixels.js. `TUNING.prop.rabbit` / `.husky` are every number.
const BEAST_MORE = (() => {
  const G = PROP_PIXELS.Grid, P = PROP_PIXELS.P;
  const RB = { f0: '#6e5a48', f1: '#8f7860', f2: '#b29a7e', f3: '#d3c0a2', w: '#efe6d6', pk: '#d98f9a', ey: '#1a1012' };
  const HK = { g0: '#3e4652', g1: '#5c6673', g2: '#808b98', w0: '#c9ced6', w1: '#eef1f5', ey: '#5aa7ff', ns: '#16171c' };
  // The rabbit, sitting (`up` false) or mid-hop, stretched long.
  const rabbit = (hop) => {
    const g = new G(18, 16);
    if (!hop) {
      g.ell(7, 10.5, 5.2, 3.8, RB.f1).ell(7, 9.6, 4.4, 2.6, RB.f2, true);
      g.ell(12.5, 7, 3, 2.6, RB.f1).ell(12.8, 6.4, 2.2, 1.7, RB.f2, true);
      g.rect(11, 1, 1, 5, RB.f1).rect(13, 1, 1, 5, RB.f1).vl(11, 2, 3, RB.pk).vl(13, 2, 3, RB.pk);
      g.hl(3, 14, 4, RB.f0).hl(10, 14, 3, RB.f0);
    } else {
      g.ell(8, 9.5, 6.2, 3, RB.f1).ell(8, 8.8, 5.2, 2, RB.f2, true);
      g.ell(14, 7, 2.8, 2.4, RB.f1).ell(14.2, 6.5, 2, 1.6, RB.f2, true);
      g.line(12, 5, 10, 1, RB.f1).line(14, 5, 13, 1, RB.f1);
      g.line(3, 11, 0, 13, RB.f0).hl(13, 12, 3, RB.f0);
    }
    g.ell(hop ? 2 : 2.2, hop ? 8.5 : 9.5, 1.7, 1.6, RB.w);
    g.set(hop ? 15 : 13.6, hop ? 6 : 6, RB.ey).set(hop ? 16 : 15, hop ? 7 : 7, RB.pk);
    g.ell(hop ? 8 : 7, hop ? 11 : 12.4, 2.6, 0.9, RB.f3, true);
    return g.outline(P.ol).trim();
  };
  // The husky, standing, and with her muzzle up to sing.
  const husky = (sing) => {
    const g = new G(26, 22);
    g.ell(11, 12, 7.5, 4.2, HK.g1).ell(11, 13.6, 6, 2.4, HK.w0, true).ell(10, 10.4, 6, 1.6, HK.g0, true);
    for (const x of [5, 8, 13, 16]) g.rect(x, 15, 2, 5, HK.g1).hl(x, 19, 2, HK.w1);
    // the tail, curled up over her back
    g.ring(4, 8.5, 3, 3, 1.4, HK.g1).set(2, 8, HK.w1).set(3, 6, HK.w1);
    const hx = sing ? 19 : 19.5, hy = sing ? 6 : 8;
    g.ell(hx, hy, 3.6, 3.1, HK.g1).ell(hx + 0.5, hy + 1.2, 2.6, 1.8, HK.w1, true);
    if (sing) { g.rect(hx + 2, hy - 3, 3, 2, HK.w1).set(hx + 4, hy - 3, HK.ns).hl(hx + 2, hy - 1, 2, HK.ns); }
    else { g.rect(hx + 2, hy, 4, 2, HK.w1).set(hx + 5, hy, HK.ns); }
    g.poly([[hx - 3, hy - 2], [hx - 2, hy - 6], [hx - 0.5, hy - 2]], HK.g0).poly([[hx - 0.5, hy - 2], [hx + 0.8, hy - 6], [hx + 2, hy - 2]], HK.g0);
    g.set(hx + 1, hy - 0.5, HK.ey);
    return g.outline(P.ol).trim();
  };
  const S = PROP_PIXELS.sprites;
  S['rabbit-sit'] = rabbit(false); S['rabbit-hop'] = rabbit(true);
  S['husky-stand'] = husky(false); S['husky-sing'] = husky(true);
  return { RB, HK };
})();

Object.assign(Beast, {
  // ---------------------------------------------------------------- the picture
  // At its feet (p.x, p.y), the way the goose and the pig stand: counter-squashed, mirrored to its `face`.
  drawMore(R, p, k) {
    const ctx = R.ctx, T = 1.35 * (k || 1), C = TUNING.prop[p.kind];
    let name, lift = 0;
    if (p.kind === 'rabbit') {
      const ph = ((p.bob || 0) / 3 / C.hop) % 1, moving = Math.hypot(p.vx || 0, p.vy || 0) > 8;
      name = moving && ph < 0.6 ? 'rabbit-hop' : 'rabbit-sit';
      if (moving && ph < 0.6) lift = Math.sin(ph / 0.6 * Math.PI) * C.hopH;
    } else name = p.singing > 0 ? 'husky-sing' : 'husky-stand';
    const g = PROP_PIXELS.sprites[name], w = g.w * T, h = g.h * T;
    R.shadow(p.x, p.y + 2, w * 0.38, w * 0.16);
    ctx.save(); ctx.translate(p.x, p.y + 3); ctx.scale((p.face || 1) < 0 ? -1 : 1, 1 / TILT);
    if (p.hurtFlash > 0) ctx.filter = 'brightness(2)';
    const bob = p.kind === 'husky' && Math.hypot(p.vx || 0, p.vy || 0) > 8 ? Math.round(Math.abs(Math.sin((p.bob || 0) * 3)) * 1.5) : 0;
    PROP_PIXELS.draw(ctx, name, -w / 2, -h - lift - bob, T);
    ctx.restore();
  },

  // ---------------------------------------------------------------- the answer
  // The last page of a first meeting waits for one: `Beast.talk(..., ask)`.
  answer(game, p, yes) {
    p.agreed = !!yes;
    if (!yes) { Beast.refuse(game, p); return; }
    if (p.kind === 'rabbit') { game.legsTied = { p }; game.applyBoons(); game.floatText(game.goat.x, game.goat.y - 40, 'LEGS TIED', PALETTE.hen); }
    if (p.kind === 'husky') { p.task = 'practice'; p.leadAt = 0; }
  },
  // Refused: it says so and goes off, out of the run (`saved` passes over it, and it is gone a moment later).
  refuse(game, p) {
    p.refused = 1.6; p.task = null;
    const L = BEAST_ANSWER.refused;
    game.floats.push({ x: p.x, y: p.y, on: p, row: 0, n: 1, text: L[(Math.random() * L.length) | 0], color: PALETTE.hen, life: 1.6, pact: true });
    if (p.kind === 'chicken' || p.kind === 'tortoise') { p.wander = true; }
  },
  // Going: away from him and out of the picture.
  updateRefused(p, dt, game) {
    p.refused -= dt;
    const g = game.goat, dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy) || 1;
    Beast.step(p, game, dx / d, dy / d, (TUNING.prop[p.kind] && TUNING.prop[p.kind].speed) || 60, dt);
    if (p.refused <= 0) { p.broken = true; p.dead = true; game.particles(p.x, p.y, 10, PALETTE.ash, 90); }
  },

  // ---------------------------------------------------------------- the rabbit
  updateRabbit(p, dt, game) {
    const C = TUNING.prop.rabbit;
    const away = Beast.shy(p, game);
    if (away) { if (away.d) Beast.step(p, game, away.x, away.y, C.speed * TUNING.beast.shySpeed, dt); else { p.vx = 0; p.vy = 0; } return; }
    const to = Beast.toGoat(p, game);
    // in hops: it moves only through the first part of each, and sits the rest
    const ph = ((p.bob || 0) / 3 / C.hop) % 1;
    if (to.d < C.followAt * TILE || ph >= 0.6) { p.vx = 0; p.vy = 0; if (Math.abs(game.goat.x - p.x) > 6) p.face = Math.sign(game.goat.x - p.x); return; }
    Beast.step(p, game, to.x, to.y, C.speed * 1.6 * (to.d > C.catchFar * TILE ? C.catchUp : 1), dt);
  },

  // ---------------------------------------------------------------- the husky
  // Before an answer, and once her song is sung, she follows him; said yes, she leads to the fullest
  // room within `ahead` with men in it and waits in its middle; as he comes in, the song.
  updateHusky(p, dt, game) {
    const C = TUNING.prop.husky, g = game.goat, L = game.level;
    p.singing = Math.max(0, (p.singing || 0) - dt);
    // First the practice (1 Oct 2026: "train the mini-game first in a room with only her, then run to
    // the room with people"): in the first room he stands in with nobody alive, beside him, a song
    // with no cult and no clock that cannot be lost. Then she leads to the real one.
    if (p.task === 'practice') {
      const room = roomAt(L, g.x, g.y);
      const empty = room && !game.enemies.some((e) => !e.dead && !e.scripted && roomAt(L, e.x, e.y) === room);
      if (!game.song && empty && roomAt(L, p.x, p.y) === room && Math.hypot(g.x - p.x, g.y - p.y) < C.practice.near * TILE) return Beast.startSong(game, p, room, true);
      return Beast.follow(p, dt, game, C);
    }
    if (p.task === 'lead' || p.task === 'wait') {
      if (p.target === undefined || (p.leadAt -= dt) <= 0) {
        p.leadAt = 1;
        if (p.task === 'lead') {
          const here = game.goatRoom || 0;
          let best = -1, most = 0;
          for (let i = here + 1; i <= here + C.ahead && i < L.rooms.length; i++) {
            const n = game.enemies.filter((e) => !e.dead && !e.scripted && roomAt(L, e.x, e.y) === L.rooms[i]).length;
            if (n > most) { most = n; best = i; }
          }
          p.target = best;
        }
      }
      if (p.target < 0) return Beast.follow(p, dt, game, C);
      const room = L.rooms[p.target], cx = (room.x + room.w / 2) * TILE, cy = (room.y + room.h / 2) * TILE;
      const inside = roomAt(L, p.x, p.y) === room;
      if (!inside) { const on = Beast.onward(p, game); if (on) Beast.step(p, game, on.x, on.y, C.speed, dt); else { p.vx = 0; p.vy = 0; } }
      else {
        p.task = 'wait';
        const dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy);
        if (d > TILE) Beast.step(p, game, dx / d, dy / d, C.speed, dt); else { p.vx = 0; p.vy = 0; p.face = Math.sign(g.x - p.x) || 1; }
        if (!game.song && roomAt(L, g.x, g.y) === room) Beast.startSong(game, p, room);
      }
      return;
    }
    if (p.task === 'sing') { p.vx = 0; p.vy = 0; p.face = Math.sign(g.x - p.x) || p.face || 1; return; }
    Beast.follow(p, dt, game, C);
  },
  // After him, the pig's way.
  follow(p, dt, game, C) {
    const to = Beast.toGoat(p, game);
    if (to.d < C.followAt * TILE) { p.vx = 0; p.vy = 0; if (Math.abs(game.goat.x - p.x) > 8) p.face = Math.sign(game.goat.x - p.x); return; }
    Beast.step(p, game, to.x, to.y, C.speed * (to.d > C.catchFar * TILE ? C.catchUp : 1), dt);
  },
  // The song starts: the cult comes in after him (`extra`, at the way in, already after him).
  startSong(game, p, room, practice) {
    const C = TUNING.prop.husky;
    p.task = 'sing';
    game.song = { p, room: room.index, t: -1.2, hits: 0, cycle: -1, answered: false, done: null, cleared: -1, flash: 0, miss: 0, practice: !!practice };
    if (practice) {
      // Just the two of them: no cult called in, no howl the house hears.
      game.audio.sfxAnimal('husky');   // what to do is written over the staves (`drawSong`), not over her head
      return;
    }
    const at = room.enter || { x: (room.x + 1.5) * TILE, y: (room.y + room.h / 2) * TILE };
    for (let k = 0; k < C.extra; k++) {
      const e = new Enemy(at.x + (k - 0.5) * 22, at.y + (k % 2) * 14, 'bearer');
      e.aware = true; e.woke = true; e.room = room.index;
      game.enemies.push(e);
    }
    game.floats.push({ x: p.x, y: p.y, on: p, row: 0, n: 1, text: 'AWOOOO!', color: PALETTE.hen, life: 1.6, pact: true });
    game.world.emitNoise(p.x, p.y, TUNING.noise.boom);
    game.audio.sfxAnimal('husky');
  },
  // His voice, from `Goat.update`'s BAAH (any of its souls): on the beat, an answer.
  heard(game) {
    const S = game.song, C = TUNING.prop.husky; if (!S || S.done) return;
    const ph = S.t - S.cycle * C.cycle;
    if (S.cycle >= 0 && !S.answered && Math.abs(ph - C.you) <= C.window) {
      S.answered = true; S.hits++; S.flash = 0.5;
      game.particles(game.goat.x, game.goat.y - 16, 10, '#9fd0ff', 160);
      game.floats.push({ x: S.p.x, y: S.p.y, on: S.p, row: 0, n: 1, text: S.hits >= Beast.songNeed(S) ? 'AWOOOOO!' : 'WOO!', color: '#9fd0ff', life: 1.2, pact: true });
    }
  },
  updateSong(game, dt) {
    const S = game.song; if (!S) return;
    const C = TUNING.prop.husky, p = S.p, L = game.level;
    if (S.done) { S.end -= dt; if (S.end <= 0) game.song = null; return; }
    if (p.broken || p.dead) { game.song = null; return; }
    S.t += dt; S.flash = Math.max(0, S.flash - dt); S.miss = Math.max(0, S.miss - dt);
    const c = Math.floor(S.t / C.cycle);
    if (S.t >= 0 && c !== S.cycle) {
      if (S.cycle >= 0 && !S.answered) S.miss = 0.6;
      S.cycle = c; S.answered = false;
      if (S.cleared >= 0 && c - S.cleared >= C.after) return Beast.endSong(game, false);
    }
    const ph = S.t - S.cycle * C.cycle;
    // her two notes, sung as they cross the line
    for (const h of C.her) if (S.cycle >= 0 && ph >= h && ph - dt < h) {
      p.singing = 0.4; game.audio.sfxAnimal('husky');
      game.floats.push({ x: p.x, y: p.y, on: p, row: 0, n: 1, text: h === C.her[0] ? 'WAF' : 'WOOO', color: PALETTE.hen, life: 0.7, pact: true });
    }
    if (S.practice) {
      // The practice cannot be lost: it ends sung, or when he walks out of the room, or men come in,
      // or `practice.time` runs out — and every way it ends, she goes on to the real one.
      const room = L.rooms[S.room], g = game.goat;
      const gone = roomAt(L, g.x, g.y) !== room || S.t > C.practice.time
        || game.enemies.some((e) => !e.dead && !e.scripted && e.aware && roomAt(L, e.x, e.y) === room);
      if (S.hits >= C.practice.need || gone) return Beast.endPractice(game, S.hits >= C.practice.need);
      return;
    }
    if (S.cleared < 0 && !game.enemies.some((e) => !e.dead && !e.scripted && roomAt(L, e.x, e.y) === L.rooms[S.room])) S.cleared = Math.max(0, S.cycle);
    if (S.hits >= C.need) return Beast.endSong(game, true);
    if (S.t > C.time) return Beast.endSong(game, false);
  },
  songNeed(S) { const C = TUNING.prop.husky; return S.practice ? C.practice.need : C.need; },
  endPractice(game, sung) {
    const S = game.song, p = S.p, C = TUNING.prop.husky;
    S.done = sung ? 'practised' : 'skipped'; S.end = 1.4;
    p.task = 'lead'; p.leadAt = 0; p.target = undefined;
    game.floats.push({ x: p.x, y: p.y, on: p, row: 0, n: 1, text: sung ? C.practice.good : C.practice.go, color: PALETTE.hen, life: 2.4, pact: true });
  },
  endSong(game, won) {
    const S = game.song, p = S.p;
    S.done = won ? 'won' : 'lost'; S.end = 2;
    if (won) { p.sang = true; p.task = null; Beast.talk(game, p, ['AWOOOOOOO!', 'WE SANG! NOW TAKE ME TO THE STAIRS, AND YOUR VOICE COMES BACK SOONER FOR THE REST OF THE RUN.']); }
    else { p.task = null; game.floats.push({ x: p.x, y: p.y, on: p, row: 0, n: 1, text: 'awoo...', color: PALETTE.ashHi, life: 1.6, pact: true }); p.refused = 1.8; }
  },
  // The two staves at the foot of the screen: her notes, then his, sliding left to the line.
  drawSong(R, game) {
    const S = game.song; if (!S || game.state !== 'play') return;
    const C = TUNING.prop.husky, ctx = R.ctx, s = R.ts, W = Math.min(R.vw - 40 * s, 520 * s), x0 = (R.vw - W) / 2;
    const y0 = R.vh - (game.touch.active ? 230 * R.s : 150 * s), lane = 30 * s, hitX = x0 + 70 * s, speed = (W - 90 * s) / C.lead;
    const a = S.done ? clamp(S.end / 0.6, 0, 1) : clamp((S.t + 1.2) / 0.4, 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(13,10,12,0.78)'; ctx.fillRect(x0, y0, W, lane * 2 + 26 * s);
    // The practice says what it wants, over the staves, where the eye already is.
    if (S.practice && !S.done) {
      let fs = Math.max(12, Math.round(14 * s)); ctx.font = FONT_PICK.font('text', fs);
      const tw = ctx.measureText(C.practice.say).width; if (tw > W - 20 * s) { fs = Math.max(12, Math.floor(fs * (W - 20 * s) / tw)); ctx.font = FONT_PICK.font('text', fs); }
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(13,10,12,0.78)'; ctx.fillRect(x0, y0 - 26 * s, W, 26 * s);
      ctx.fillStyle = PALETTE.hen; ctx.fillText(C.practice.say, x0 + W / 2, y0 - 8 * s);
    }
    ctx.fillStyle = '#9fd0ff'; ctx.fillRect(x0, y0, W, 2 * s);
    ctx.font = `700 ${Math.max(12, 12 * s)}px ${FONT_SC}`; ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.hen; ctx.fillText('HER', x0 + 10 * s, y0 + 8 * s + lane * 0.62);
    ctx.fillStyle = PALETTE.bone; ctx.fillText('YOU · ' + keysOf(game).scream, x0 + 10 * s, y0 + 8 * s + lane * 1.62);
    for (const k of [0, 1]) { ctx.fillStyle = 'rgba(239,230,208,0.12)'; ctx.fillRect(hitX, y0 + 8 * s + k * lane + lane * 0.5 - 1, W - (hitX - x0) - 10 * s, 2); }
    // the line, lit when he hits
    ctx.fillStyle = S.flash > 0 ? '#9fd0ff' : S.miss > 0 ? PALETTE.blood : 'rgba(239,230,208,0.6)';
    ctx.fillRect(hitX - 2 * s, y0 + 6 * s, 4 * s, lane * 2 + 4 * s);
    // the window on his lane
    const wl = Math.max(x0 + 4 * s, hitX - C.window * speed);
    ctx.fillStyle = 'rgba(159,208,255,0.16)'; ctx.fillRect(wl, y0 + 8 * s + lane + 3 * s, hitX + C.window * speed - wl, lane - 6 * s);
    const note = (time, lane_, col, big, gone) => {
      const x = hitX + (time - S.t) * speed; if (x < x0 + 4 * s || x > x0 + W - 6 * s) return;
      const cy = y0 + 8 * s + lane_ * lane + lane * 0.5, r = big ? 8 * s : 6 * s;
      ctx.globalAlpha = a * (gone ? 0.25 : 1); ctx.fillStyle = col;
      ctx.fillRect(Math.round(x - r), Math.round(cy - r * 0.7), Math.round(r * 2), Math.round(r * 1.4));
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(Math.round(x - r + 2 * s), Math.round(cy - r * 0.7 + 2 * s), Math.round(r * 0.6), Math.round(2 * s));
      ctx.globalAlpha = a;
    };
    for (let c = Math.max(0, S.cycle - 1); c <= S.cycle + 1; c++) {
      const base = c * C.cycle;
      C.her.forEach((h, i) => note(base + h, 0, PALETTE.hen, i === 1, false));
      note(base + C.you, 1, '#9fd0ff', true, c === S.cycle && S.answered);
    }
    // how many answered, and the time left
    ctx.globalAlpha = a; ctx.textAlign = 'right'; ctx.fillStyle = '#9fd0ff';
    const done = { won: 'SUNG', lost: 'SHE GAVE UP', practised: 'READY · NOW FOR REAL', skipped: 'NOW FOR REAL' }[S.done];
    ctx.fillText(done || `${S.practice ? 'PRACTICE · ' : ''}${S.hits} / ${Beast.songNeed(S)}`, x0 + W - 10 * s, y0 + 8 * s + lane * 0.62);
    ctx.restore();
  },
});
