// THE COWARD (13 Oct 2026, the user's: "like the base clubman, but with an open face and the robe in a slightly different
// light; he begs to be spared, and if you spare him he may turn up now and then in a room and offer you grass, just like
// that; he hides in a corner and asks not to be hit; met on the first three floors"). `TUNING.coward`, `BARKS.coward`.
//
// He is a clubman (`bearer`, `e.coward`) the generator gives a corner (`placeCowards` in js/gen.js), never bought off the
// floor's threat: off his room's count, its seals, its clamp and its cleared door (`e.room` -1). He never lifts his club
// and never sees the goat as a mark (`step`, from the top of `Enemy.act`'s perception). Left alone as the goat walks on,
// he is SPARED, and the run keeps it (`game.spared`, a key a man, saved with the run). From then on a floor may lay one
// of them in a quiet corner with a tuft of grass before him (`lay`, `comes`): the grass is ordinary milk grass, grazed
// as any. Butted, thrown, carried, lit or killed, he was not spared (`wrong`). His picture is `COWARD_STUDY`
// (js/pixel-art.js), drawn while `PIXEL_ART.penitent` is set round him (`PaintedArt.character`).
const Coward = {
  // From `startLevel`, before the spawn list is numbered: the man in his corner, and the one spared earlier with his tuft.
  // A floor put aside (`sp`) comes back with the gift's roll it was laid with (`floorGen.coward`).
  lay(game, sp) {
    const P = game.level && game.level.cowards; if (!P) return;
    const key = (k) => `${game.levelIndex}.${(game.level.seed >>> 0).toString(36)}.${k}`;
    if (P.beg) game.enemies.push(this.make(game, P.beg, key('b'), false));
    const come = sp && sp.gen && sp.gen.coward !== undefined ? !!sp.gen.coward : this.comes(game);
    if (game.floorGen) game.floorGen.coward = come;
    if (P.gift && come) {
      game.enemies.push(this.make(game, P.gift, key('g'), true));
      game.level.props.push({ x: P.gift.gx, y: P.gift.gy, kind: 'heal', coward: true });
    }
  },
  // Whether one he spared waits on this floor: at least one spared this run, from floor `gift.from`, and the floor's own
  // seed under `chance` + `per` for each one past the first. Off the seed, so the same floor asks the same.
  comes(game) {
    const G = TUNING.coward.gift, n = (game.spared || []).length, li = levelIndexOf(game.level.def);
    if (!n || li < G.from || game.showroomOn) return false;
    const p = Math.min(G.max, G.chance + G.per * (n - 1));
    return (Math.imul(((game.level.seed >>> 0) ^ 0x7c0aa4d) >>> 0, 2654435761) >>> 0) / 4294967296 < p;
  },
  make(game, spot, key, gift) {
    const e = new Enemy(spot.x, spot.y, 'bearer');
    this.become(e, spot.room, key, gift);
    if (gift) e.grassAt = { x: spot.gx, y: spot.gy };
    return e;
  },
  become(e, room, key, gift) {
    e.coward = true; e.cowardGift = !!gift; e.cowKey = key; e.room = -1; e.cowRoom = room;
    e.state = 'cower'; e.facing = Math.PI / 2; e.trapSense = 1; e.aware = false; e.woke = true;
    e.home = { x: e.x, y: e.y }; e.speed = e.cfg.speed * TUNING.coward.speed;
  },
  // The dev drawer's SPAWN rows (`enemy-spawn=coward`, `=cowardgift`): one where the spawner put him, the gift with a
  // tuft laid a tile toward the goat.
  devSpawn(game, e, gift) {
    const r = roomAt(game.level, e.x, e.y), ri = r ? r.index : game.goatRoom || 0;
    this.become(e, ri, 'dev.' + Math.round(game.timer * 10), gift);
    if (!gift) return;
    const g = game.goat, d = hyp(g.x - e.x, g.y - e.y) || 1, at = game.freeSpot(e.x + (g.x - e.x) / d * TILE, e.y + (g.y - e.y) / d * TILE);
    const p = new Prop(at.x, at.y, 'heal'); p.dev = true; game.props.push(p);
    e.grassAt = { x: p.x, y: p.y }; e.grassProp = p;
  },

  // His step, in place of sight and the hunt (`Enemy.act`): back into his corner if he was shoved out of it, his eyes on
  // the goat while it is near, and his plea. Never aware, so nothing that asks "is a fight on" counts him.
  step(e, dt, game) {
    const C = TUNING.coward, g = game.goat;
    e.aware = false; e.target = null; e.lastSeen = null; e.noticed = 0;
    if (e.state !== 'cower') { e.state = 'cower'; e.timer = 0; }
    const hx = e.home.x - e.x, hy = e.home.y - e.y, hd = hyp(hx, hy);
    if (hd > C.home) e.moveToward(hx / hd, hy / hd, e.speed, dt, game);
    else { e.vx = 0; e.vy = 0; }
    const dg = g && !g.dead ? hyp(g.x - e.x, g.y - e.y) : Infinity;
    const near = dg < C.plea.r * TILE && game.sees(e.x, e.y, g.x, g.y);
    // Cowering he faces the camera, a diagonal toward the goat's side of him: the open face is the whole of how he reads,
    // and turned toward a goat above him he showed the back of his hood.
    if (hd <= C.home) e.facing = near ? (g.x < e.x - TILE * 0.5 ? Math.PI * 0.75 : g.x > e.x + TILE * 0.5 ? Math.PI * 0.25 : Math.PI / 2) : Math.PI / 2;
    // how hard he shakes (`PaintedArt.character`): up as the goat comes, down slowly as it goes
    e.fear = clamp((e.fear || 0) + (near ? (dg < C.plea.close * TILE ? 3 : 1.5) : -0.6) * dt, 0.25, 1);
    e.pleaT = Math.max(0, (e.pleaT || 0) - dt);
    if (near && e.pleaT <= 0 && !e.say) {
      const kind = e.cowardGift ? (e.ate ? null : 'gift') : dg < C.plea.close * TILE ? 'flinch' : 'beg';
      if (kind) this.say(e, game, kind);
      e.pleaT = C.plea.gap;
    }
  },
  // His own lines, over his head as a bark (`drawOverhead`), never held back by the floor's one-line cap: the plea is
  // the whole of what he is.
  say(e, game, kind) {
    const list = BARKS.coward[kind]; if (!list || e.dead) return;
    const life = TUNING.bark.life * 1.25;
    e.say = { text: list[(Math.random() * list.length) | 0], life, max: life };
    game.barkCd = Math.max(game.barkCd || 0, TUNING.bark.gap * 0.5);
  },
  // Butted, thrown, carried, lit, killed: whatever he was going to be counted as, he is not. `Enemy.fling` has no game to
  // hand, so it only marks him and `update` answers; `Enemy.die` hands one and it is settled at once.
  wrong(e, game) {
    if (!e.wronged) { e.wronged = true; e.wrongNew = true; }
    if (game) { e.wrongNew = false; this.revoke(game, e); }
  },
  revoke(game, e) {
    const S = game.spared; if (!S || e.revoked) return;
    e.revoked = true;
    const i = S.indexOf(e.cowKey);
    if (i >= 0) S.splice(i, 1);
    else if (e.cowardGift && S.length) S.pop();   // the one who brought the grass: one fewer who owes the goat anything
  },
  spare(game, e) {
    e.spared = true;
    game.spared = game.spared || [];
    if (!game.spared.includes(e.cowKey)) game.spared.push(e.cowKey);
    this.say(e, game, 'thanks');
    game.floatText(game.goat.x, game.goat.y - 46, 'YOU SPARED HIM', PALETTE.bone);
  },

  // Once a step of play: what was done to each of them, the spare as the goat walks on, the tuft grazed.
  update(game, dt) {
    const C = TUNING.coward;
    for (const e of game.enemies) {
      if (!e.coward || e.dead) continue;
      if (e.held || e.burning > 0) this.wrong(e);
      if (e.wrongNew) { e.wrongNew = false; this.say(e, game, e.cowardGift ? 'betray' : 'hit'); this.revoke(game, e); }
      if (e.cowardGift) {
        if (!e.ate) {
          const p = e.grassProp || (e.grassProp = game.props.find((q) => q.kind === 'heal' && e.grassAt && hyp(q.x - e.grassAt.x, q.y - e.grassAt.y) < 4));
          if (!p || p.broken || p.dead) { e.ate = true; if (!e.wronged) this.say(e, game, 'ate'); }
        }
        continue;
      }
      if (e.wronged || e.spared) continue;
      if ((game.goatRoom === undefined ? -1 : game.goatRoom) >= e.cowRoom + C.leave) this.spare(game, e);
    }
  },
};
