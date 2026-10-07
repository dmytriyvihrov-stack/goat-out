// Scatter: small things that fly off what they stood on, the cult's supper off a table knocked
// across the room (29 Sep 2026: "put food on the tables that scatters beautifully when you hit them;
// for now we test the scatter on something that small"). Cosmetic, the way CombatFX is: nothing here
// is in collision, damage, noise or the AI, and none of it draws from the level's seeded RNG, a
// table's supper is picked off a hash of where it stands, so a replayed code lays the same table.
// Each bit flies in an arc (`z` over its floor point), turns in whole quarter turns so its pixels
// stay square, bounces, rolls if it is round, breaks if it is clay, and stays on the floor to be
// kicked by whoever walks through it. The sprites are `food-*` in js/prop-pixels.js.
class Scatter {
  constructor(game) { this.game = game; this.bits = []; this.clink = 0; }

  // What a thing is made of: how it lands, rolls and sounds. `round` rolls on; `brittle` breaks on a
  // hard landing into `shard`s of its colour and spills what was in it; `metal` rings.
  static kindOf(id) {
    const K = Scatter.KINDS[id] || Scatter.KINDS.bread;
    return K;
  }

  // The supper on a table: `TUNING.scatter.menu` for the compound's tables, `heaven` for the one
  // above the clouds (set on the table by js/heaven.js). Two to four things, laid out along the top
  // so none of them sits on another, off a hash of the table's own tile.
  static foodOf(p) {
    if (p.food !== undefined) return p.food;
    const S = TUNING.scatter, tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    const h = (k) => farHash(tx * 13 + k * 7, ty * 17 - k * 3);
    if (p.isAltar || h(0) > S.chance) return (p.food = []);
    const menu = S.menu[p.menu || 'cult'], n = S.count[0] + Math.floor(h(1) * (S.count[1] - S.count[0] + 1)), ids = [];
    for (let i = 0; i < n; i++) ids.push(menu[Math.floor(h(2 + i) * menu.length) % menu.length]);
    return (p.food = Scatter.lay(ids, h));
  }
  // Dishes side by side across the top, each as wide as its sprite: a platter is two apples wide, and
  // laid in even slots the roast and the boar's head sat on top of each other. What does not fit is
  // left off. `h(k)` is the table's own hash, so the same table lays the same supper.
  static lay(ids, h) {
    const S = TUNING.scatter, T = S.top, span = T.x1 - T.x0, out = [];
    const wOf = (id) => { const g = typeof PROP_PIXELS !== 'undefined' && PROP_PIXELS.sprites['food-' + id]; return g ? g.w * S.texel : 9; };
    ids = ids.slice();
    while (ids.length > 1 && ids.reduce((a, id) => a + wOf(id), 0) > span + T.jitter) ids.pop();
    const gap = (span - ids.reduce((a, id) => a + wOf(id), 0)) / ids.length;
    let x = T.x0 + gap / 2;
    ids.forEach((id, i) => {
      const w = wOf(id);
      out.push({ id, x: Math.round(x + w / 2 + (h(9 + i) - 0.5) * Math.max(0, Math.min(T.jitter, gap))), y: Math.round(T.y0 + (T.y1 - T.y0) * h(20 + i)), turn: h(30 + i) < 0.25 ? 2 : 0 });
      x += w + gap;
    });
    out.sort((a, b) => a.y - b.y);
    return out;
  }

  // What is on a table, drawn on it: the table's own frame, whatever turned it. Nothing on a table
  // sliding across the floor, its supper left it on the first blow.
  static drawOnTable(renderer, p) {
    const food = Scatter.foodOf(p); if (!food.length || p.flung || renderer.silPass) return;
    // Heaven's feast stays bright: up there nothing is a fight, and the gold is the point.
    const ctx = renderer.ctx, k = TUNING.scatter.texel, dim = renderer.game && renderer.game.heaven ? '' : '@dim';
    for (const f of food) {
      const g = PROP_PIXELS.sprites['food-' + f.id]; if (!g) continue;
      PROP_PIXELS.draw(ctx, 'food-' + f.id + dim, p.x + f.x - g.w * k / 2, p.y + f.y - g.h * k, k, f.turn);
    }
  }

  // The blow: everything on `p` goes, along (dx, dy) and spread either side of it, `power` of a
  // headbutt's worth (a body arriving is less, a blast more). A table already bare does nothing.
  fromTable(p, dx, dy, power = 1) {
    const food = Scatter.foodOf(p); if (!food.length) return;
    const S = TUNING.scatter, l = hyp(dx, dy) || 1; dx /= l; dy /= l;
    for (const f of food) {
      const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 2 * S.spread;
      const sp = (S.speed[0] + Math.random() * (S.speed[1] - S.speed[0])) * power;
      // Where it stood on the top, as a point on the floor under it with the table's height over it:
      // the top is drawn upright over the table's middle, the floor is squashed by TILT.
      this.add(f.id, p.x + f.x, p.y + (f.y + S.height) / TILT, S.height, Math.cos(a) * sp, Math.sin(a) * sp,
        (S.lift[0] + Math.random() * (S.lift[1] - S.lift[0])) * Math.min(1.4, power), f.turn);
    }
    p.food = [];
    this.game.audio.sfxClatter('clay', 0.8);
  }
  // A suit of armour coming off the wall (`Prop.burstArmor`): each piece from where it hung
  // (`prop.armor.pieces`: its height and its place across), along (dx, dy) spread either side the way
  // a table's supper goes, but a blow aimed at the wall glances off it, so nothing is sent into the
  // stone to die there, and every piece leaves the wall at `armor.out` on top: it hops off the
  // face, clatters down and rolls (the helm is round), never sinks back into the brick.
  fromArmor(p, dx, dy, power = 1) {
    // One that stood on the floor (`kind` 'suit') is not against a wall: the blow's own way, all round, no hop off the stone.
    const floor = p.kind === 'suit', S = TUNING.scatter, A = floor ? TUNING.prop.suit : TUNING.prop.armor, l = hyp(dx, dy) || 1; dx /= l; dy = floor ? dy / l : Math.abs(dy / l);
    for (const [id, h, ox] of A.pieces) {
      const a = Math.atan2(dy, dx + ox / 40) + (Math.random() - 0.5) * 2 * S.spread;
      const sp = (S.speed[0] + Math.random() * (S.speed[1] - S.speed[0])) * power;
      this.add('armor-' + id, p.x + ox + (Math.random() - 0.5) * 3, p.y + 1, h, Math.cos(a) * sp, Math.sin(a) * sp + (floor ? 0 : A.out),
        (S.lift[0] + Math.random() * (S.lift[1] - S.lift[0])) * Math.min(1.4, power) * 0.7);
    }
    this.game.audio.sfxClatter('metal', 1);
  }
  // A blast: every laid table inside `r` px of it throws its supper away from the middle, and every
  // suit of armour in it comes apart.
  burst(x, y, r, power = 1.4) {
    for (const p of this.game.props) {
      if ((p.kind === 'armor' || p.kind === 'suit') && !p.spilled) { const d = hyp(p.x - x, p.y - y); if (d <= r) p.burstArmor(this.game, p.x - x || 1, p.y - y, power); continue; }
      if (p.kind === 'poster') { if (!p.torn && hyp(p.x - x, p.y - y) <= r) p.tear(this.game, p.x - x || 1, p.y - y); continue; }
      if (p.kind !== 'table' || p.broken || !Scatter.foodOf(p).length) continue;
      const d = hyp(p.x - x, p.y - y); if (d > r) continue;
      this.fromTable(p, p.x - x || 1, p.y - y, power * (1 - 0.5 * d / r));
    }
  }

  // A blade or a shield coming apart (3 Oct 2026 playtest: "not just vanish, fall apart"): `ids` are its
  // pieces, cut off its own sprite (js/prop-pixels.js `brokeUp`), sent from (x, y) `z` px up along (dx, dy)
  // spread wide, or all round when there is no way it was going.
  breakUp(ids, x, y, z, dx, dy, power = 1) {
    const S = TUNING.scatter, l = hyp(dx, dy), base = l > 1 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;
    ids.forEach((id, i) => {
      const a = base + (l > 1 ? (Math.random() - 0.5) * 2.4 : i * Math.PI * 2 / ids.length + Math.random());
      const sp = (S.speed[0] + Math.random() * (S.speed[1] - S.speed[0])) * power * 0.8;
      this.add(id, x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 4, z, Math.cos(a) * sp, Math.sin(a) * sp,
        (S.lift[0] + Math.random() * (S.lift[1] - S.lift[0])) * power, Math.floor(Math.random() * 4));
    });
    if (ids.length) this.game.audio.sfxClatter(Scatter.kindOf(ids[0]).sound, 0.9);
  }
  // The blades stuck in a man (`Prop.stickIn`), broken out of him: from his middle, back the way each went in.
  breakStuck(e, list = e.stuck) {
    const K = TUNING.prop.weapon.stick, z = (e.r || 12) * 2.3 * K.lift;
    for (const b of list || []) {
      const a = (e.facing || 0) + b.rel;
      this.breakUp(Scatter.piecesOf({ weapon: 'sword', halberd: b.halberd }), e.x, e.y, z, -Math.cos(a), -Math.sin(a), 0.7);
    }
  }
  // Which pieces a thing breaks into (sprite names, js/prop-pixels.js).
  static piecesOf(p) {
    if (p.skulls) { const l = (typeof ART_PASS !== 'undefined' && ART_PASS.shield) || 0; return [0, 1, 2, 3].map((k) => `mshield${l}-bit${k}`); }
    if (p.weapon === 'shield') return ['shield-bit0', 'shield-bit1', 'shield-bit2'];
    return p.halberd ? ['halberd-bit0', 'halberd-bit1'] : ['sword-bit0', 'sword-bit1'];
  }

  add(id, x, y, z, vx, vy, vz, turn = 0) {
    const S = TUNING.scatter, K = Scatter.kindOf(id);
    if (this.bits.length >= S.keep) this.bits.shift();
    this.bits.push({ id, x, y, z, vx, vy, vz, spin: (Math.random() < 0.5 ? -1 : 1) * S.spin * (0.4 + Math.random() * 0.6) * (K.round ? 1 : 0.7),
      turn: turn * Math.PI / 2, rest: false, squash: 0, bounces: 0, K, color: K.color, age: 0 });
  }

  update(dt) {
    const S = TUNING.scatter, w = this.game.world, g = this.game.goat; if (!w) return;
    this.clink = Math.max(0, this.clink - dt);
    // Whoever walks through the floor kicks what is lying on it: the goat, the men on their feet, a
    // body in flight. One list, built once a step.
    const movers = this.movers || (this.movers = []); movers.length = 0;
    if (g && !g.dead && !(g.leap)) movers.push(g);
    for (const e of this.game.liveEnemies || []) if (!e.dead && !e.held && !e.ghosted && e.state !== 'hop') movers.push(e);
    for (const b of this.bits) {
      b.age += dt; b.squash = Math.max(0, b.squash - dt);
      if (b.rest) {
        // Lying still: only a foot through it moves it.
        for (const m of movers) {
          const dx = b.x - m.x, dy = b.y - m.y, rr = (m.r || 12) + S.kick.r;
          if (dx * dx + dy * dy > rr * rr) continue;
          const d = hyp(dx, dy) || 1, sp = Math.max(S.kick.min, hyp(m.vx || 0, m.vy || 0) * S.kick.keep);
          b.vx = dx / d * sp + (m.vx || 0) * 0.3; b.vy = dy / d * sp + (m.vy || 0) * 0.3; b.vz = S.kick.lift * (0.6 + Math.random() * 0.6);
          b.rest = false; b.spin = (Math.random() < 0.5 ? -1 : 1) * S.spin * 0.5; b.bounces = Math.max(0, b.bounces - 1);
          if (Math.random() < 0.5) this.sound(b, 0.35);
          break;
        }
        if (b.rest) continue;
      }
      // In the air, or running along the floor.
      const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
      if (w.isSolid(Math.floor(nx / TILE), Math.floor(b.y / TILE))) { b.vx *= -S.wall; } else b.x = nx;
      if (w.isSolid(Math.floor(b.x / TILE), Math.floor(ny / TILE))) { b.vy *= -S.wall; } else b.y = ny;
      if (b.z > 0 || b.vz > 0) {
        b.vz -= S.gravity * dt; b.z += b.vz * dt; b.turn += b.spin * dt;
        if (b.z <= 0) {
          b.z = 0;
          const hard = -b.vz;
          // Clay breaks on a hard landing, and how hard is hard is a little different every time.
          if (b.K.brittle && hard > S.breakAt[0] + (S.breakAt[1] - S.breakAt[0]) * Math.random()) { this.shatter(b); b.gone = true; continue; }
          if (hard > S.bounceMin) {
            b.vz = hard * S.bounce * b.K.bouncy; b.vx *= S.skid; b.vy *= S.skid; b.spin *= 0.6; b.bounces++;
            b.squash = S.squash; this.sound(b, Math.min(1, hard / 260));
            if (hard > 140 && this.game.dust) this.game.dust(b.x, b.y, 1, b.vx, b.vy);
          } else { b.vz = 0; if (b.bounces === 0) this.sound(b, 0.4); b.bounces++; }
        }
      } else {
        // On the floor: a round thing rolls on, turning; anything else slides to a stop.
        const k = Math.exp(-(b.K.round ? S.roll : S.slide) * dt); b.vx *= k; b.vy *= k;
        if (b.K.round) b.turn += hyp(b.vx, b.vy) * dt / 4 * Math.sign(b.spin || 1);
        if (hyp(b.vx, b.vy) < S.still) {
          b.vx = b.vy = 0; b.rest = true;
          // It comes to rest square to the floor, in whole quarter turns.
          b.turn = Math.round(b.turn / (Math.PI / 2)) * Math.PI / 2;
        }
      }
      // Over a hole: gone the way anything else is.
      if (b.z <= 0 && w.isPitPx(b.x, b.y)) b.gone = true;
    }
    if (this.bits.some((b) => b.gone)) this.bits = this.bits.filter((b) => !b.gone);
  }

  // A cup or a jug or a plate meeting the floor too hard: pieces of it, and whatever was in it on
  // the floor for good.
  shatter(b) {
    const S = TUNING.scatter, K = b.K;
    for (let i = 0; i < S.shards; i++) {
      const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 90;
      this.bits.push({ id: 'shard', x: b.x, y: b.y, z: 1, vx: b.vx * 0.4 + Math.cos(a) * sp, vy: b.vy * 0.4 + Math.sin(a) * sp, vz: 60 + Math.random() * 70,
        spin: (Math.random() - 0.5) * 20, turn: 0, rest: false, squash: 0, bounces: 1, K: Scatter.KINDS.shard, color: K.color || PALETTE.bone, age: 0 });
    }
    while (this.bits.length > S.keep) this.bits.shift();   // `add` is the only other place the cap is kept
    if (K.spill) Scatter.spill(this.game.world, b.x, b.y, S.spill, K.spill, b.vx, b.vy);
    this.game.audio.sfxClatter('break', 1);
  }
  // A small wet patch in cells on the floor, stretched the way it was going, with a darker rim.
  static spill(w, x, y, r, [body, rim], dx, dy) {
    const px = TUNING.effects.pixel, d = hyp(dx, dy) || 1, ux = dx / d, uy = dy / d, seed = (x * 5 + y * 11) | 0;
    w.paintStain(x, y, r * 2, (c) => {
      const x0 = Math.round(x / px) * px, y0 = Math.round(y / px) * px, span = Math.ceil(r * 1.6 / px) * px;
      for (let oy = -span; oy <= span; oy += px) for (let ox = -span; ox <= span; ox += px) {
        const al = ox * ux + oy * uy, ac = -ox * uy + oy * ux, dd = hyp(al / (r * 1.3), ac / (r * 0.8));
        const lim = 0.7 + CombatFX.noise((x0 + ox) * 0.25, (y0 + oy) * 0.25, seed) * 0.5;
        if (dd >= lim || w.isSolid(Math.floor((x0 + ox) / TILE), Math.floor((y0 + oy) / TILE))) continue;
        c.fillStyle = dd > lim - 0.16 ? rim : body; c.fillRect(x0 + ox, y0 + oy, px, px);
      }
    });
  }
  sound(b, vol) {
    if (this.clink > 0) return;
    const g = this.game.goat; if (!g) return;
    const h = this.game.audio.heard(b.x - g.x, b.y - g.y); if (h.vol < 0.05) return;
    this.clink = TUNING.scatter.soundGap;
    this.game.audio.sfxClatter(b.K.sound, vol * h.vol, h.pan);
  }

  // Lying on the floor: under everybody's feet. In the air: over them, with a shadow on the floor.
  drawGround(renderer) {
    const ctx = renderer.ctx, game = this.game;
    for (const b of this.bits) if (b.z <= 0.5 && !game.hidden(b.x, b.y)) this.drawBit(ctx, b, false);
  }
  drawAir(renderer) {
    const ctx = renderer.ctx, game = this.game;
    for (const b of this.bits) if (b.z > 0.5 && !game.hidden(b.x, b.y)) this.drawBit(ctx, b, true);
  }
  // Its shadow flat on the floor (world space), itself stood upright over it the way every prop is
  // (`scale(1, 1 / TILT)`), `z` px up.
  drawBit(ctx, b, air) {
    // `K.k`: a piece of something drawn at another grain than the supper (the shieldman's skulls).
    const k = TUNING.scatter.texel * (b.K.k || 1), q = Math.round(b.turn / (Math.PI / 2)) & 3;
    const name = b.K.sprite || 'food-' + b.id, g = PROP_PIXELS.sprites[name]; if (!g && b.id !== 'shard') return;
    const w = g ? (q & 1 ? g.h : g.w) * k : 3, h = g ? (q & 1 ? g.w : g.h) * k : 3;
    if (air) {
      // a few cells, smaller the higher it is
      const s = Math.max(1, Math.round((w * 0.5) * (1 - Math.min(0.7, b.z / 60))));
      ctx.fillStyle = 'rgba(9,5,10,0.32)'; ctx.fillRect(Math.round(b.x - s), Math.round(b.y), s * 2, 2);
    }
    ctx.save(); ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.scale(1, 1 / TILT); ctx.translate(0, -Math.round(b.z));
    if (!g) {
      ctx.fillStyle = PALETTE.ink; ctx.fillRect(-2, -3, 3, 3);
      ctx.fillStyle = b.color || PALETTE.bone; ctx.fillRect(-2, -3, 2, 2);
    } else {
      const sq = b.squash > 0 ? b.squash / TUNING.scatter.squash : 0;
      ctx.scale(1 + 0.28 * sq, 1 - 0.28 * sq);
      PROP_PIXELS.draw(ctx, PROP_PIXELS.sprites[name + '@dim'] ? name + '@dim' : name, -w / 2, -h, k, q);
    }
    ctx.restore();
  }
}
// How each thing falls. `color` is its shards'; `spill` the [body, rim] it leaves when it breaks.
Scatter.KINDS = {
  apple: { round: true, bouncy: 1.2, sound: 'fruit' }, gapple: { round: true, bouncy: 1.2, sound: 'fruit' },
  pear: { round: true, bouncy: 1.1, sound: 'fruit' }, grapes: { round: true, bouncy: 0.6, sound: 'fruit' },
  bread: { bouncy: 0.8, sound: 'soft' }, cheese: { bouncy: 0.7, sound: 'soft' }, leg: { bouncy: 0.7, sound: 'soft' },
  fish: { bouncy: 0.55, sound: 'soft' }, honey: { bouncy: 0.5, sound: 'soft' },
  goblet: { bouncy: 1.1, round: true, sound: 'metal' },
  jug: { brittle: true, bouncy: 0.6, sound: 'clay', color: '#b0643a', spill: ['#4a1426', '#2e0c18'] },
  milk: { brittle: true, bouncy: 0.6, sound: 'clay', color: '#e6e0d2', spill: ['#f2ecdc', '#c9c0ad'] },
  plate: { brittle: true, bouncy: 0.7, sound: 'clay', color: '#d6cfbc' },
  shard: { bouncy: 0.4, sound: 'clay' },
  // The meat (2 Oct 2026): a joint or a head lands like a sack, the stew's bowl breaks and spills.
  roast: { bouncy: 0.45, sound: 'soft' }, ribs: { bouncy: 0.5, sound: 'soft' }, haunch: { bouncy: 0.6, sound: 'soft' },
  sausage: { bouncy: 0.7, sound: 'soft' }, boarhead: { bouncy: 0.4, sound: 'soft' },
  stew: { brittle: true, bouncy: 0.5, sound: 'clay', color: '#8a4a28', spill: ['#6a3018', '#3e1a0c'] },
  // A suit of armour's pieces (`fromArmor`): steel rings where it lands, and the helm rolls.
  'armor-helm': { round: true, bouncy: 1, sound: 'metal', sprite: 'armor-helm' },
  'armor-plate': { bouncy: 0.5, sound: 'metal', sprite: 'armor-plate' },
  'armor-pauldron': { bouncy: 0.85, sound: 'metal', sprite: 'armor-pauldron' },
  // The tortoise's iron coming off the goat (`Goat.damage`): the suit's own plates at a goat's size.
  'barding-plate': { bouncy: 0.5, sound: 'metal', sprite: 'armor-plate', k: 0.5 },
  'barding-pauldron': { bouncy: 0.85, sound: 'metal', sprite: 'armor-pauldron', k: 0.5 },
  // A blade or a shield broken (`breakUp`): the steel rings, the wood and the bone knock.
  'sword-bit0': { bouncy: 0.7, sound: 'metal', sprite: 'sword-bit0' }, 'sword-bit1': { bouncy: 0.7, sound: 'metal', sprite: 'sword-bit1' },
  'halberd-bit0': { bouncy: 0.5, sound: 'soft', sprite: 'halberd-bit0' }, 'halberd-bit1': { bouncy: 0.7, sound: 'metal', sprite: 'halberd-bit1' },
  'shield-bit0': { bouncy: 0.55, sound: 'soft', sprite: 'shield-bit0' }, 'shield-bit1': { bouncy: 0.55, sound: 'soft', sprite: 'shield-bit1' },
  'shield-bit2': { bouncy: 0.55, sound: 'soft', sprite: 'shield-bit2' },
  // THE FISH's tank broken (`Beast.breakFish`, js/beasts-more.js): glass, and the fish itself.
  'fish-shard': { bouncy: 0.6, sound: 'clay', sprite: 'fish-shard', k: 0.6 }, 'fish-body': { bouncy: 0.9, sound: 'soft', sprite: 'fish-body', k: 0.6 },
};
// The shieldman's skulls in pieces, one set for each of the board's looks (`ART_PASS.shield`).
// Drawn at the board's own grain (`PaintedArt` lays a dropped one at 0.72 px a texel), half the supper's.
for (let l = 0; l < 3; l++) for (let k = 0; k < 4; k++) Scatter.KINDS[`mshield${l}-bit${k}`] = { bouncy: 0.65, sound: 'clay', sprite: `mshield${l}-bit${k}`, k: 0.5 };
