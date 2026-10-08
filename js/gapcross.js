// THE MEN AT A DROP (8 Oct 2026 playtest: "the hound can jump over, the mage teleports, the rifleman can jump too, the
// butcher starts throwing hooks, and the clubman cannot jump; and in a long chase one of them may fall in"). A chasm
// (`level.gaps`, one tile across) parted every man from the goat alike: the men's fields never cross one. Now, when
// the goat stands across a one-tile drop from a man coming for him and the way round on land is long or none, a
// hound or a rifleman jumps it (`hop.wind` s of a crouch, `hop.air` s over it, landed past it), a seer blinks to the
// goat's side (`Enemy.blink`, which only ever lands where the goat can be walked to), and the butcher's hook already
// flies over a drop (`Enemy.hookStep`; dragged back across it, the goat falls in, which is pillar 3). A plain
// clubman cannot: he stands at the lip, and after `fall.after` s of it a long chase may take him over the edge
// (`fall.chance` a check). Checked every `every` s; nothing here runs on a man busy with anything else.
const GapCross = {
  // Called first thing in `Enemy.update`: true while it has the man (a jump in the air), and `act` is skipped.
  step(e, dt, game) {
    if (e.gapHop) return this.fly(e, dt, game);
    const G = TUNING.gapCross, L = game.level;
    if (!L || !L.gaps || !(L.gaps.size || L.gaps.length) || e.dead || e.held || !e.aware || e.scripted) return false;
    e.gapT = (e.gapT || 0) - dt; if (e.gapT > 0) return false;
    e.gapT = G.every;
    if (!(e.state === 'chase' || e.state === 'orbit' || e.state === 'retreat')) { e.lipT = 0; return false; }
    const k = e.kind;
    // The seer does not need the lip: across from the goat with no way round, in sight, he blinks to the goat's side.
    if (k === 'seer' && !(e.blinkCd > 0) && game.world.flowDist(e.x, e.y) < 0 && hyp(game.goat.x - e.x, game.goat.y - e.y) < G.blinkR * TILE
      && game.sees(e.x, e.y, game.goat.x, game.goat.y)) { e.blink(game); return false; }
    const at = this.across(e, game); if (!at) { e.lipT = Math.max(0, (e.lipT || 0) - G.every * 0.5); return false; }
    if ((k === 'dog' || k === 'hunter') && !(e.hopCd > game.timer)) {
      e.gapHop = { from: { x: e.x, y: e.y }, to: at.land, t: 0, wind: G.hop.wind * game.mods.enemySlow, air: G.hop.air };
      e.vx = e.vy = 0; e.facing = Math.atan2(at.land.y - e.y, at.land.x - e.x);
      if (k === 'dog' && game.audio.sfxGrowl) game.audio.sfxGrowl();
      return true;
    }
    // the clubman: no jump in him; he waits at the lip, and a long wait may end in the drop
    if (k === 'bearer' && !e.champion && !e.thrower && !e.shaman && !e.boss && !e.soul && !e.sentry) {
      e.lipT = (e.lipT || 0) + G.every;
      if (e.lipT > G.fall.after && Math.random() < G.fall.chance) {
        e.gapHop = { from: { x: e.x, y: e.y }, to: at.pit, t: 0, wind: G.hop.wind * G.fall.windMul, air: G.hop.air, falls: true };
        e.vx = e.vy = 0; e.facing = Math.atan2(at.pit.y - e.y, at.pit.x - e.x);
        game.bark(e, 'fall', 1);
        return true;
      }
    }
    return false;
  },
  // A drop of `level.gaps` straight between him and the goat, within `near` tiles of him, with floor on its far side
  // and the goat on that side; and the land route long (`longer` times the straight line) or none. What to land on.
  across(e, game) {
    const G = TUNING.gapCross, g = game.goat, w = game.world, L = game.level;
    if (!g || g.dead) return null;
    const dx = g.x - e.x, dy = g.y - e.y, d = hyp(dx, dy); if (d < TILE || d > G.reach * TILE * 3) return null;
    const ux = dx / d, uy = dy / d, gaps = L.gaps instanceof Set ? L.gaps : L.gapSet || (L.gapSet = new Set(L.gaps));
    let pit = null;
    for (let s = 0.3; s <= G.near; s += 0.2) {
      const tx = Math.floor((e.x + ux * s * TILE) / TILE), ty = Math.floor((e.y + uy * s * TILE) / TILE), i = ty * w.W + tx;
      if (w.tiles[i] === T.WALL) return null;
      if (w.tiles[i] === T.PIT) { if (!gaps.has(i)) return null; pit = { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, s }; break; }
    }
    if (!pit) return null;
    // the far lip: the first floor past the drop, within `reach` tiles of him
    let land = null;
    for (let s = pit.s + 0.2; s <= G.reach; s += 0.15) {
      const x = e.x + ux * s * TILE, y = e.y + uy * s * TILE, tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      const t = w.tiles[ty * w.W + tx];
      if (t === T.WALL) return null;
      if (t !== T.PIT && w.walkableAt(tx, ty)) { land = { x: x + ux * TILE * 0.35, y: y + uy * TILE * 0.35 }; break; }
    }
    if (!land || (land.x - g.x) * ux + (land.y - g.y) * uy > TILE * 0.5) return null;   // the goat is past where he lands
    const fl = w.flowDist(e.x, e.y);
    if (fl >= 0 && fl < d / TILE * G.longer) return null;   // a short way round on land: he walks it
    return { pit, land };
  },
  fly(e, dt, game) {
    const H = e.gapHop, G = TUNING.gapCross;
    if (e.dead || e.held || e.state === 'flung') { e.gapHop = null; e.hopZ = 0; return false; }
    H.t += dt; e.vx = e.vy = 0;
    if (H.t < H.wind) return true;   // the crouch: a beat to read it, standing
    const k = clamp((H.t - H.wind) / H.air, 0, 1);
    e.state = 'hop'; e.x = lerp(H.from.x, H.to.x, k); e.y = lerp(H.from.y, H.to.y, k);
    e.hopZ = Math.sin(k * Math.PI) * G.hop.lift * (H.falls ? 0.5 : 1);
    if (k < 1) return true;
    e.hopZ = 0; e.gapHop = null; e.hopCd = game.timer + G.hop.cd;
    // the clubman's try ends in the drop: the pit check at the foot of `act` takes him this very step
    e.state = 'chase'; game.dust(e.x, e.y, 4, 0, 0);
    return false;
  },
};
