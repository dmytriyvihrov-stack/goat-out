// THE ANIMALS' HOME (7 Oct 2026, batch 2 of his 36 notes; CONCEPT.md, "Heaven as the animals' home"). Heaven is two
// rooms (`HEAVEN_MAP`, laid by `Heaven.level`; three for a day, 7 Oct 2026: "put the rooms and the bells back, two
// rooms, the animals part in the first room and part in the second; it is too long a run to the jump now"): THE THRONE,
// where he comes up (the god, five of the stands, the horse's paddock along its foot), and THE EDGE across the bridge
// (the mirror, the bells and the blind shepherd, the overlook, the other four stands, the horns and the drop).
//
// Opening an animal is not freeing it. A stand is LOCKED (a ruin, not yet: the other six), BROKEN (mended by pouring souls into
// it) or OPEN (the tortoise's from the start, `home.stands.open`); only an open stand's animal is dealt
// into a run (`Beast.deal`'s `allow`, `beastsOpen`). Brought out alive it sits on its stand (`meta.saved`) and offers its
// dare (`QUESTS`); the dare won, it is FREE (`meta.freed`), off its stand and living up here its own way (`hroam`), and
// its talisman (`QUESTS[kind].talisman`) is on the mouse's shelves from then on (`talismanLocked`).
//
// POURING (7 Oct 2026: "hold the right button, the souls flow out of you into the mirror, and at some point it is
// mended", Cult of the Lamb's): GRAB held at the broken mirror, the broken overlook or a broken stand spends sacrifices
// off the heap into it, `home.pour.rate` a second, each one a white soul flying from him to it; let go and what is in it
// stays (`meta.poured`); the cost in, it is whole.
//
// Pillar 1 holds: GRAB is the only verb any of it asks for. Rule 6 holds: laid by hand, the same every visit.
const HEAVEN_MAP = {
  W: 66, H: 36,
  throne: { x: 3, y: 5, w: 26, h: 22 },    // interior 4..27 x 6..25: the god's cloud over 12..19, his steps; the paddock below `paddock.fence`
  edge: { x: 33, y: 6, w: 30, h: 15 },     // interior 34..61 x 7..19, its south side open on the drop from row 20
  drop: 22,                                 // how much of the edge room's south side is the drop (34..55, as it always was)
};
// The room the animals call home (the horse's paddock, the goose's flock over it): THE THRONE.
HEAVEN_MAP.stalls = HEAVEN_MAP.throne;
// The horns laid out before the jump (`hhorn`, 7 Oct 2026, "lay the horns out before the jump, small, long and wide,
// so you can choose"), each a pair drawn in cells: `#` the horn, `+` its lit edge. Read left to right, the tip up.
const HORN_GLYPHS = {
  // `s` the little skull they grow from, `e` its eyes, `h` the horn, `+` the horn's lit tip.
  short: ['..+......+..', '..h......h..', '...h....h...', '...h....h...', '....ssss....', '...ssssss...', '...sessse...', '....ssss....'],
  // 9 Oct 2026 playtest: BIG a moose's palms, LONG a gazelle's lyre, ringed (`r`), as they are drawn on him.
  big: ['+.+.+..+.+.+', 'hhhhh..hhhhh', '.hhhh..hhhh.', '...hh..hh...', '....ssss....', '...ssssss...', '...sessse...', '....ssss....'],
  long: ['...+....+...', '..h......h..', '.r........r.', '.h........h.', '.r........r.', '..h......h..', '..r......r..', '...h....h...', '....ssss....', '...ssssss...', '...sessse...', '....ssss....'],
};

Object.assign(Heaven, {
  // ---------------------------------------------------------------- the stands
  // 'locked' (not yet), 'broken' (pour into it), or 'open' (its animal goes into the runs).
  standState(kind) {
    const S = TUNING.heaven.home.stands, M = this.meta || this.load();
    if (M.standOverride && M.standOverride[kind]) return M.standOverride[kind];   // the dev drawer's (`devHome`)
    // (an animal already brought up keeps its stand open: it was mended for it, whatever the costs say now)
    if (S.open.includes(kind) || (M.mendedStands && M.mendedStands[kind]) || (M.saved && M.saved[kind])) return 'open';
    return this.standCost(kind) ? 'broken' : 'locked';
  },
  // What mending a stand costs: its own price, or `later` for the six locked ones once the god's fifty are given and the
  // horns are open (9 Oct 2026, was the hundred: "the other companions after bringing fifty souls and opening the horns").
  standCost(kind) { const S = TUNING.heaven.home.stands; return S.cost[kind] || (this.hornsOpen() ? S.later : 0); },
  // The kinds a run may deal (`Game.beastPlanFor`): every one whose stand is open.
  beastsOpen() { return HEAVEN_SEATS.map((s) => s.kind).filter((k) => this.standState(k) === 'open'); },
  freed(kind) { const M = this.meta; return !!(M && M.freed && M.freed[kind]); },
  // Free and gone off its stand: free, and its last word said (9 Oct 2026 playtest: "the tortoise ran off before the
  // dialogue"). Until it has thanked him it waits on its stand (the horse in its paddock).
  roaming(kind) { const M = this.meta; return this.freed(kind) && !(M && M.questWon && M.questWon[kind]); },
  // It has thanked him once and asked to be brought out again, and has not been yet: its cage at the start of a floor.
  wantsAgain(kind) { const M = this.meta; return !!(M && M.again && M.again[kind] && !((M.savedN && M.savedN[kind]) >= 2)); },
  // A talisman a dare pays for is off the shelves until that dare is won (`Shop.restock`, `Beast.placeGift`).
  talismanLocked(id) {
    for (const k of Object.keys(QUESTS)) if (QUESTS[k].talisman === id && !this.freed(k)) return true;
    return false;
  },
  towerMended() { const M = this.meta; return !!(M && M.towerMended); },

  // ---------------------------------------------------------------- pouring
  // What GRAB held at `n` pours into, or null: its key in `meta.poured`, its cost, the word over it.
  pourable(n) {
    const M = this.meta, P = TUNING.heaven.home;
    if (!n || !M) return null;
    // only once the god has his twenty (`mendReady`); before that a GRAB at it says BROKEN (8 Oct 2026)
    if (n.kind === 'mirror' && !this.mended() && this.mendSent()) return { key: 'mirror', cost: TUNING.heaven.gift.mend, word: 'REPAIR IT' };
    // The god's hundred for the horns, once he has asked for it (`horns0`) and there is something to give: a GRAB with
    // nothing in the heap is still a word with him.
    if (n.kind === 'god' && this.hornsAsk() && M.told.horns0 && (M.sacrifices > 0 || this.poured('god') >= TUNING.heaven.gift.horns)) return { key: 'god', cost: TUNING.heaven.gift.horns, word: 'GIVE' };
    // The third ask (`gift.skills`): the hundred poured as the fifty were; the corrupted soul is taken when they are in (`finishPour`).
    if (n.kind === 'god' && this.skillsAsk() && M.told.skills0 && (M.sacrifices > 0 || this.poured('god2') >= TUNING.heaven.gift.skills)) return { key: 'god2', cost: TUNING.heaven.gift.skills, word: 'GIVE' };
    // The tower and the broken stands wait for the mirror (9 Oct 2026: "padlocks on them until the mirror is repaired").
    if (n.kind === 'tower' && !this.towerMended() && this.mended()) return { key: 'tower', cost: P.tower.cost, word: 'REPAIR IT' };
    if (n.kind === 'seat' && this.standState(n.thing.seat) === 'broken' && this.mended()) return { key: 'stand:' + n.thing.seat, cost: this.standCost(n.thing.seat), word: 'REPAIR IT' };
    return null;
  },
  // Broken and still padlocked: the tower or a broken stand before the mirror is repaired (`pourable` refuses them).
  padlocked(n) {
    if (!n || this.mended()) return false;
    return (n.kind === 'tower' && !this.towerMended()) || (n.kind === 'seat' && this.standState(n.thing.seat) === 'broken');
  },
  // The padlock itself, its body's top-left at x, y in the caller's frame, `c` px a cell (the horns' lock, scaled).
  drawPadlock(ctx, x, y, c) {
    ctx.fillStyle = '#3a2c4e'; ctx.fillRect(x - c, y - c, 9 * c, 7 * c); ctx.fillRect(x + c, y - 5 * c, 2 * c, 5 * c); ctx.fillRect(x + 4 * c, y - 5 * c, 2 * c, 5 * c); ctx.fillRect(x + c, y - 6 * c, 5 * c, 2 * c);
    ctx.fillStyle = '#b8b0a0'; ctx.fillRect(x, y, 7 * c, 5 * c); ctx.fillStyle = '#e8e0cc'; ctx.fillRect(x, y, 7 * c, c);
    ctx.fillStyle = '#3a2c4e'; ctx.fillRect(x + 3 * c, y + c, c, 3 * c);
  },
  // GRAB still held, read off the hand itself: the press that started a pour clears `input.rmbDown` (as every press up
  // here does), and with the mouse still the flag stays down until it moves.
  grabHeld(game) {
    const inp = game.input;
    if (inp.rmbDown) return true;
    if (typeof KeyBind !== 'undefined' && KeyBind.held(game, 'grab')) return true;
    if (game.pad && game.pad.active && game.pad.grabHeld && game.pad.grabHeld()) return true;
    return !!(game.touch && game.touch.active && game.touch.grabDown);
  },
  poured(key) { const M = this.meta; return (M && M.poured && M.poured[key]) || 0; },
  startPour(game, n, P) {
    const H = game.heaven, M = this.meta;
    if (M.sacrifices <= 0 && this.poured(P.key) < P.cost) {
      H.plates.push({ x: n.x, y: n.y - 70, text: `${this.poured(P.key)} / ${P.cost}. YOU HAVE NO SOULS TO GIVE IT. BRING SOME UP.`, life: TUNING.heaven.plate });
      game.audio.sfxClatter('metal', 0.3); return;
    }
    H.pour = { key: P.key, cost: P.cost, n, t: 0, acc: 0 };
    game.goat.vx = game.goat.vy = 0;
  },
  // Held: a soul at a time off the heap into it, each flying from him (`pourFx`). Let go, or out of souls, it stops.
  updatePour(game, dt) {
    const H = game.heaven, P = H.pour, M = this.meta, T0 = TUNING.heaven.home.pour, g = game.goat;
    P.t += dt; P.acc += dt * T0.rate;
    M.poured = M.poured || {};
    while (P.acc >= 1) {
      P.acc -= 1;
      if ((M.poured[P.key] || 0) >= P.cost) break;
      if (M.sacrifices <= 0) { H.pour = null; H.plates.push({ x: P.n.x, y: P.n.y - 70, text: `${M.poured[P.key] || 0} / ${P.cost}. THAT WAS ALL YOU HAD.`, life: TUNING.heaven.plate }); this.save(); return; }
      M.sacrifices--; M.poured[P.key] = (M.poured[P.key] || 0) + 1;
      (H.pourFx || (H.pourFx = [])).push({ x0: g.x, y0: g.y - 16, x1: P.n.x, y1: P.n.y - 34, t: 0, bend: (Math.random() - 0.5) * 60 });
      game.audio.sfxChime(TUNING.heaven.bells[(M.poured[P.key] % 5) + 2], 0.18);
    }
    if ((M.poured[P.key] || 0) >= P.cost) { H.pour = null; this.save(); this.finishPour(game, P); }
    else this.saveSoon();
  },
  finishPour(game, P) {
    const M = this.meta, n = P.n;
    game.ring(n.x, n.y, 3 * TILE, '#fff4c2'); game.particles(n.x, n.y - 30, 30, '#ffffff', 200);
    game.audio.sfxBell(); game.audio.sfxChime(TUNING.heaven.bells[1]); game.audio.sfxChime(TUNING.heaven.bells[4], 0.7, 0.16);
    if (P.key === 'mirror') { this.mend(game); return; }
    if (P.key === 'god') {
      M.hornsOpen = true; this.save();
      game.heaven.plates.push({ x: game.level.god.x, y: game.level.god.y - 118, text: HEAVEN_TALK.hornsDone[0], life: TUNING.heaven.plate * 1.6, god: true });
      game.audio.sfxGodVoice(1);
      // The horns were hidden until now (8 Oct 2026 playtest): they come up out of their cloud at the edge.
      for (const h of game.props) if (h.kind === 'hhorn') { h.broken = false; h.wobble = 0.4; game.ring(h.x, h.y, 1.6 * TILE, '#f7d774'); game.particles(h.x, h.y - 16, 10, '#fff4c2', 120); }
      return;
    }
    if (P.key === 'god2') {
      const G = TUNING.heaven.gift;
      if ((M.souls || 0) < G.skillsSouls) {   // the hundred is in him; he waits for the violet one
        game.heaven.plates.push({ x: game.level.god.x, y: game.level.god.y - 118, text: HEAVEN_TALK.skillsSoul[0], life: TUNING.heaven.plate * 1.4, god: true });
        game.audio.sfxGodVoice(0.9); return;
      }
      M.souls -= G.skillsSouls; M.upgraded = true; this.save();
      game.heaven.plates.push({ x: game.level.god.x, y: game.level.god.y - 118, text: HEAVEN_TALK.skillsDone[0], life: TUNING.heaven.plate * 1.8, god: true });
      game.floatText(game.goat.x, game.goat.y - 50, 'UPGRADED SKILLS', '#fff4c2');
      game.audio.sfxGodVoice(1);
      return;
    }
    if (P.key === 'tower') {
      M.towerMended = true; this.save();
      if (n.thing) n.thing.wobble = 0.4;
      game.floatText(n.x, n.y - 120, 'THE OVERLOOK STANDS AGAIN', '#fff4c2'); return;
    }
    const kind = P.key.slice(6);
    M.mendedStands = M.mendedStands || {}; M.mendedStands[kind] = 1; this.save();
    const seat = HEAVEN_SEATS.find((s) => s.kind === kind);
    game.floatText(n.x, n.y - 80, (seat ? seat.name : 'ITS') + "'S STAND IS WHOLE", '#fff4c2');
    game.heaven.plates.push({ x: game.level.god.x, y: game.level.god.y - 118, text: kind === 'horse' ? 'GOOD. NOW THE HORSE WILL FIND YOU DOWN THERE. BEAT IT IN A RACE AND IT COMES UP HERE.' : 'GOOD. IT WILL FIND YOU DOWN THERE.', life: TUNING.heaven.plate * 1.4, god: true });
    game.audio.sfxGodVoice(0.9);
    this.layPaddock(game);
  },
  // The souls in the air between him and what he pours into: white cells along a bend, a little trail.
  drawPour(R, game) {
    const H = game.heaven, list = H.pourFx; if (!list || !list.length) return;
    const ctx = R.ctx, T0 = TUNING.heaven.home.pour, c = 2;
    for (const f of list) f.t += 1 / 60;
    H.pourFx = list.filter((f) => f.t < T0.fly);
    ctx.save(); ctx.scale(1, 1 / TILT);
    for (const f of H.pourFx) {
      const u = f.t / T0.fly, e = u * u * (3 - 2 * u);
      for (let k = 0; k < 3; k++) {
        const v = Math.max(0, e - k * 0.06), x = f.x0 + (f.x1 - f.x0) * v + Math.sin(v * Math.PI) * f.bend, y = (f.y0 + (f.y1 - f.y0) * v - Math.sin(v * Math.PI) * 40) * TILT;
        ctx.fillStyle = k ? 'rgba(255,255,255,0.45)' : '#ffffff';
        ctx.fillRect(Math.round(x / c) * c - c, Math.round(y / c) * c - c, c * (k ? 1 : 2), c * (k ? 1 : 2));
      }
    }
    ctx.restore();
  },

  // ---------------------------------------------------------------- the horns before the jump
  // GRAB at a pair: these are his horns from now on (`game.hornKind`, `HORN_KEY`, the itch build too).
  pickHorns(game, p) {
    const HN = TUNING.goat.horns[p.horn]; if (!HN) return;
    if (p.horn !== 'short' && !this.hornsOpen()) {   // the god's until his fifty (`hornsOpen`)
      const K = HEAVEN_TALK.hornsShut;
      game.heaven.plates.push({ x: p.x, y: p.y - 46, text: K[Math.floor(Math.random() * K.length)], life: TUNING.heaven.plate, god: true });
      p.wobble = 0.2; game.audio.sfxClatter('metal', 0.3); return;
    }
    game.hornKind = p.horn;
    try { localStorage.setItem(HORN_KEY, p.horn); } catch (e) { /* storage refused: this visit only */ }
    game.applyBoons(); this.heavenMods(game);   // the new horn's numbers, and heaven's own laid back over them
    p.wobble = 0.3; game.ring(p.x, p.y, 1.4 * TILE, '#f7d774'); game.particles(p.x, p.y - 16, 12, '#fff4c2', 140);
    game.audio.sfxSteel(); game.audio.sfxChime(TUNING.heaven.bells[3], 0.5);
    game.heaven.plates.push({ x: p.x, y: p.y - 46, text: HN.name + ' HORNS: ' + HN.note, life: TUNING.heaven.plate });
  },
  drawHorn(R, game, p) {
    const ctx = R.ctx, G = HORN_GLYPHS[p.horn], c = 3, mine = game.hornKind === p.horn, t = R.t, shut = p.horn !== 'short' && !this.hornsOpen();
    ctx.save(); ctx.translate(p.x, p.y + 6); ctx.scale(1, 1 / TILT);
    R.shadow(0, 0, 14, 4);
    this.puff(ctx, 0, -2, 11, '#f4f8ff', 2); this.puff(ctx, 0, 1, 8, '#dfe9fb', 2);   // its cushion of cloud
    const w = G[0].length * c, h = G.length * c, bob = Math.round(Math.sin(t * 1.8 + p.x) * 1.5), ox = -w / 2, oy = -h - 14 + bob;
    if (mine) { ctx.globalAlpha = 0.45 + 0.25 * Math.sin(t * 3); CombatFX.pixelRing(ctx, 0, oy + h / 2, Math.max(w, h) * 0.7, 2, '#f7d774'); ctx.globalAlpha = 1; }
    if (shut) ctx.globalAlpha = 0.3;   // the god's still: pale, under a padlock
    ctx.fillStyle = '#3a2c4e';
    for (let r = 0; r < G.length; r++) for (let q = 0; q < G[r].length; q++) if (G[r][q] !== '.') ctx.fillRect(ox + (q - 1) * c, oy + (r - 1) * c, c * 3, c * 3);
    const col = { '+': '#fff4c2', h: mine ? '#f7d774' : '#cdb58a', r: mine ? '#a8762a' : '#8a7454', s: '#efe6d0', e: '#3a2c4e' };
    for (let r = 0; r < G.length; r++) for (let q = 0; q < G[r].length; q++) if (G[r][q] !== '.') { ctx.fillStyle = col[G[r][q]]; ctx.fillRect(ox + q * c, oy + r * c, c, c); }
    ctx.globalAlpha = 1;
    if (shut) {
      const ly = oy + h / 2 - 4;
      ctx.fillStyle = '#3a2c4e'; ctx.fillRect(-7, ly - 2, 14, 12); ctx.fillRect(-5, ly - 9, 3, 8); ctx.fillRect(2, ly - 9, 3, 8); ctx.fillRect(-5, ly - 10, 10, 3);
      ctx.fillStyle = '#b8b0a0'; ctx.fillRect(-5, ly, 10, 8); ctx.fillStyle = '#3a2c4e'; ctx.fillRect(-1, ly + 2, 2, 4);
    }
    // its name under it, small, on the cloud
    ctx.font = `700 9px ${FONT_SC}`; ctx.textAlign = 'center'; ctx.fillStyle = mine ? '#b07a22' : 'rgba(58,44,78,0.7)'; ctx.fillText(TUNING.goat.horns[p.horn].name, 0, 14);
    ctx.restore();
  },

  // ---------------------------------------------------------------- the paddock and who lives up here
  // The horse's paddock (`home.paddock`): a fence of rails across THE THRONE's foot once its stand is whole, the horse in it
  // once it has come up (saved, not yet free). The posts are bodies (`hfence`) so he walks to the fence, not through it.
  layPaddock(game) {
    const P = TUNING.heaven.home.paddock, px = (t) => (t + 0.5) * TILE;
    if (this.standState('horse') !== 'open' || game.props.some((p) => p.kind === 'hfence')) return;
    // a box of posts: the top and bottom rows whole, the sides between them
    const along = (a, b) => { const out = []; for (let v = a; v < b - P.post * 0.5; v += P.post) out.push(v); out.push(b); return out; };
    const put = (x, y, side) => { const f = new Prop(px(x), px(y), 'hfence'); f.heaven = true; f.r = P.postR; f.side = side; game.props.push(f); };
    for (const x of along(P.x0, P.x1)) { put(x, P.y0, 'n'); put(x, P.y1, 's'); }
    for (const y of along(P.y0, P.y1).slice(1, -1)) { put(P.x0, y, 'w'); put(P.x1, y, 'e'); }
    // the trough in its corner
    const tr = new Prop(px(P.x0 + 0.9), px(P.y0 + 0.9), 'htrough'); tr.heaven = true; tr.r = 12; game.props.push(tr);
    this.spawnRoamers(game);
  },
  // Who lives up here this visit: every animal freed, anywhere in the three rooms; the horse brought up and not yet free
  // in its paddock (`hroam`, `p.as`, `p.pen`).
  spawnRoamers(game, from) {
    const M = this.meta, L = game.level, P = TUNING.heaven.home.paddock, px = (t) => (t + 0.5) * TILE;
    for (const kind of ['tortoise', 'goose', 'horse']) {
      if (game.props.some((p) => p.kind === 'hroam' && p.as === kind)) continue;
      const free = this.roaming(kind), pen = kind === 'horse' && !free && M.saved[kind] && this.standState('horse') === 'open';
      if (!free && !pen) continue;
      // `from`: the stand it has just stepped off, its thanks said
      const at = pen ? { x: px((P.x0 + P.x1) / 2), y: px((P.y0 + P.y1) / 2) } : from && from.kind === kind ? { x: from.x, y: from.y + 10 } : this.roamSpot(game, kind);
      const r = new Prop(at.x, at.y, 'hroam'); r.heaven = true; r.as = kind; r.pen = !!pen; r.face = 1; r.goal = null; r.wait = 1; r.r = kind === 'horse' ? 13 : 10; r.bob = 0;
      game.props.push(r);
    }
    void L;
  },
  // A spot of open cloud for a free animal to go to: in its own room most of the time, now and then another.
  roamSpot(game, kind) {
    const w = game.world, rooms = [HEAVEN_MAP.throne, HEAVEN_MAP.edge], rng = Math.random;
    const home = kind === 'goose' ? HEAVEN_MAP.stalls : kind === 'tortoise' ? HEAVEN_MAP.stalls : null;
    for (let a = 0; a < 40; a++) {
      const R = home && rng() < 0.7 ? home : rooms[Math.floor(rng() * rooms.length)];
      const tx = R.x + 2 + Math.floor(rng() * (R.w - 4)), ty = R.y + 2 + Math.floor(rng() * (R.h - 4));
      if (w.isSolid(tx, ty) || w.isPitPx((tx + 0.5) * TILE, (ty + 0.5) * TILE) || w.isPitPx((tx + 0.5) * TILE, (ty + 1.5) * TILE)) continue;
      { const P = TUNING.heaven.home.paddock; if (tx >= P.x0 - 1 && tx <= P.x1 + 1 && ty >= P.y0 - 1 && ty <= P.y1 + 1 && this.standState('horse') === 'open') continue; }
      return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
    }
    return { x: game.level.start.x, y: game.level.start.y };
  },
  // Their lives, a step at a time. The tortoise very, very slowly anywhere; the goose about the stalls honking, now and
  // then up and away with its flock round the sky (`flyT`, drawn by `drawFlock`); the horse in its paddock, back and
  // forth and grazing, to the fence when he comes near; free, the same over the whole of heaven.
  updateRoam(game, dt) {
    const R0 = TUNING.heaven.home.roam, P = TUNING.heaven.home.paddock, g = game.goat, H = game.heaven;
    for (const p of game.props) {
      if (p.kind !== 'hroam' || p.broken) continue;
      const C = R0[p.as];
      p.bob += dt * 3;
      // the goose's flight: away for `flyFor` s, the flock round the sky, back where it left
      if (p.as === 'goose') {
        p.honkT = (p.honkT === undefined ? C.honk[0] : p.honkT) - dt;
        if (p.flying) { p.flying -= dt; if (p.flying <= 0) { p.flying = 0; game.audio.sfxAnimal('goose'); } continue; }
        p.flyT = (p.flyT === undefined ? C.fly[0] : p.flyT) - dt;
        if (p.flyT <= 0) { p.flyT = C.fly[0] + Math.random() * (C.fly[1] - C.fly[0]); p.flying = C.flyFor; game.audio.sfxAnimal('goose'); game.particles(p.x, p.y - 10, 10, '#f4efe2', 140); continue; }
        if (p.honkT <= 0) { p.honkT = C.honk[0] + Math.random() * (C.honk[1] - C.honk[0]); game.audio.sfxAnimal('goose'); H.plates.push({ x: p.x, y: p.y - 34, text: 'HONK!', life: 1.4 }); }
      }
      // the horse in its paddock comes to the fence when he is near it
      if (p.pen) {
        const ix0 = (P.x0 + 1.1) * TILE, ix1 = (P.x1 - 0.1) * TILE, iy0 = (P.y0 + 1.1) * TILE, iy1 = (P.y1 - 0.1) * TILE;
        const nearFence = g.x > (P.x0 - P.come) * TILE && g.x < (P.x1 + 1 + P.come) * TILE && g.y > (P.y0 - P.come) * TILE && g.y < (P.y1 + 1 + P.come) * TILE;
        if (nearFence) p.goal = { x: clamp(g.x, ix0, ix1), y: clamp(g.y, iy0, iy1), stay: true };
        else if (p.goal && p.goal.stay) p.goal = null;
      }
      if (!p.goal) {
        p.wait -= dt;
        if (p.wait > 0) { p.vx = p.vy = 0; p.grazing = p.as === 'horse'; continue; }
        p.grazing = false;
        p.goal = p.pen ? { x: (P.x0 + 1.1 + Math.random() * Math.max(0.1, P.x1 - P.x0 - 1.2)) * TILE, y: (P.y0 + 1.1 + Math.random() * Math.max(0.1, P.y1 - P.y0 - 1.2)) * TILE } : this.roamSpot(game, p.as);
      }
      // a goal in another room is walked to through the way between them (`roamVia`), never at the wall between
      const via = this.roamVia(game, p, p.goal);
      if (via) { const vx = via.x - p.x, vy = via.y - p.y, vd = hyp(vx, vy) || 1, sp = Math.min(C.speed, vd * 4 + 20), nx = p.x + vx / vd * sp * dt, ny = p.y + vy / vd * sp * dt;
        if (game.world.isSolid(Math.floor(nx / TILE), Math.floor(ny / TILE))) { p.goal = null; p.wait = 0.5; continue; }
        if (hyp(nx - g.x, ny - g.y) < (p.r || 10) + g.r && hyp(nx - g.x, ny - g.y) < hyp(p.x - g.x, p.y - g.y)) { p.vx = p.vy = 0; continue; }   // it waits for him to get out of its way
        p.vx = vx / vd * sp; p.vy = vy / vd * sp; p.x = nx; p.y = ny; if (Math.abs(vx) > 2) p.face = Math.sign(vx); continue; }
      const dx = p.goal.x - p.x, dy = p.goal.y - p.y, d = hyp(dx, dy);
      if (d < 6) { if (!p.goal.stay) { p.goal = null; p.wait = C.graze ? C.graze[0] + Math.random() * (C.graze[1] - C.graze[0]) : 1 + Math.random() * 3; } p.vx = p.vy = 0; if (p.goal && p.goal.stay) p.face = Math.sign(g.x - p.x) || p.face; continue; }
      const sp = Math.min(C.speed, d * 4), nx = p.x + dx / d * sp * dt, ny = p.y + dy / d * sp * dt;
      if (game.world.isSolid(Math.floor(nx / TILE), Math.floor(ny / TILE)) || game.world.isPitPx(nx, ny)) { p.goal = null; p.wait = 0.5; continue; }
      // never into him: a horse at a gallop shoved a goat about the cloud, and once off the edge
      if (hyp(nx - g.x, ny - g.y) < (p.r || 10) + g.r && hyp(nx - g.x, ny - g.y) < hyp(p.x - g.x, p.y - g.y)) { p.vx = p.vy = 0; continue; }
      p.vx = dx / d * sp; p.vy = dy / d * sp; p.x = nx; p.y = ny;
      if (Math.abs(dx) > 2) p.face = Math.sign(dx);
    }
  },
  // The free ones' scenes (`HEAVEN_BANTER`): a pair near each other and near him says one, the first, then the answer.
  updateBanter(game, dt) {
    const B = TUNING.heaven.home.banter, H = game.heaven, g = game.goat;
    if (!B || !H) return;
    const say = (p, text, other) => {
      H.plates.push({ x: p.x, y: p.y - (p.as === 'horse' ? 70 : 40), text, life: B.life });
      game.audio.sfxAnimal(p.as);
      if (other) { p.face = Math.sign(other.x - p.x) || p.face; }
      p.goal = null; p.wait = Math.max(p.wait || 0, B.reply + 1.5); p.vx = p.vy = 0;
    };
    if (H.banterNext) {
      const n = H.banterNext; n.t -= dt;
      if (n.t <= 0) { H.banterNext = null; if (!n.p.broken && !n.p.flying) say(n.p, n.text, n.to); }
      return;
    }
    H.banterT = (H.banterT === undefined ? B.first : H.banterT) - dt;
    if (H.banterT > 0 || game.beastTalk || H.talk || H.panel) return;   // never over the god or the mirror
    const R = game.props.filter((p) => p.kind === 'hroam' && !p.broken && !p.flying);
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
      const a = R[i], b = R[j];
      if (hyp(a.x - b.x, a.y - b.y) > B.near * TILE || Math.min(hyp(a.x - g.x, a.y - g.y), hyp(b.x - g.x, b.y - g.y)) > B.watch * TILE) continue;
      const key = [a.as, b.as].sort().join('|'), L = HEAVEN_BANTER[key]; if (!L) continue;
      H.banterN = H.banterN || {}; const k = (H.banterN[key] = ((H.banterN[key] === undefined ? Math.floor(Math.random() * L.length) : H.banterN[key] + 1)) % L.length);
      const [first, second] = a.as === key.split('|')[0] ? [a, b] : [b, a];
      say(first, L[k][0], second); second.goal = null; second.wait = Math.max(second.wait || 0, B.reply + 2); second.vx = second.vy = 0;
      H.banterNext = { p: second, to: first, text: L[k][1], t: B.reply };
      H.banterT = B.gap;
      return;
    }
  },
  // Where an animal bound for another room steps next: the open tile of the gap between its room and the next one
  // toward the goal nearest its own row; it lines up with that row inside its room, then walks through. Null once it
  // is in the goal's room.
  roamVia(game, p, goal) {
    const rooms = [HEAVEN_MAP.throne, HEAVEN_MAP.edge], tx = p.x / TILE;
    const idx = (x) => rooms.findIndex((r, i) => x < (rooms[i + 1] ? (r.x + r.w + rooms[i + 1].x) / 2 : 1e9));
    const a = idx(tx), b = idx(goal.x / TILE); if (a === b || a < 0 || b < 0) return null;
    const dir = Math.sign(b - a), L = rooms[Math.min(a, a + dir)], gx = Math.floor((L.x + L.w + rooms[Math.min(a, a + dir) + 1].x) / 2);
    let best = -1;
    for (let y = 0; y < game.world.H; y++) if (!game.world.isSolid(gx, y) && !game.world.isPitPx((gx + 0.5) * TILE, (y + 0.5) * TILE) && (best < 0 || Math.abs(y + 0.5 - p.y / TILE) < Math.abs(best + 0.5 - p.y / TILE))) best = y;
    if (best < 0) return null;
    // first along its own room to the way's row, `off` tiles short of it, then straight through to `off` past it
    const off = 3.5, row = Math.abs(p.y / TILE - (best + 0.5)) < 0.35;
    return { x: (gx + 0.5 + (row ? dir : -dir) * off) * TILE, y: (best + 0.5) * TILE };
  },
  // One of them, by where its feet are: the horse off its own sprite, the small ones as they stand down there.
  drawRoam(R, game, p) {
    const ctx = R.ctx, moving = hyp(p.vx || 0, p.vy || 0) > 8;
    if (p.flying) return;
    if (p.as === 'horse') {
      ctx.save(); ctx.translate(p.x, p.y); R.shadow(0, 2, 20, 6); ctx.scale(1, 1 / TILT);
      R.horseSprite(ctx, p.face > 0 ? 0 : Math.PI, moving, p.grazing ? 'eat' : 'idle', p.bob);
      ctx.restore(); return;
    }
    const fake = p.fake || (p.fake = new Prop(p.x, p.y, p.as)); fake.x = p.x; fake.y = p.y; fake.bob = p.bob; fake.face = p.face; fake.vx = p.vx || 0; fake.vy = p.vy || 0; fake.honkT = 0;
    R.drawProp(fake);
  },
  // The goose's flock, up and round the sky over THE THRONE while it is away.
  drawFlock(R, game) {
    const goose = game.props.find((p) => p.kind === 'hroam' && p.as === 'goose' && p.flying > 0); if (!goose) return;
    const ctx = R.ctx, C = TUNING.heaven.home.roam.goose, S = HEAVEN_MAP.stalls, t = R.t, k = clamp(Math.min(goose.flying, C.flyFor - goose.flying) / 1.5, 0, 1);
    const cx = (S.x + S.w / 2) * TILE, cy = (S.y + 1) * TILE, c = 3;
    ctx.save(); ctx.globalAlpha = k; ctx.scale(1, 1 / TILT);
    for (let i = 0; i < C.flock; i++) {
      const a = t * 0.7 + i / C.flock * Math.PI * 2, x = cx + Math.cos(a) * (180 + i * 12), y = (cy - 60 + Math.sin(a) * 50) * TILT, flap = Math.floor(t * 6 + i) % 2;
      ctx.fillStyle = i === 0 ? '#ffffff' : '#e4ddcc';
      ctx.fillRect(Math.round(x), Math.round(y), c, c);
      ctx.fillRect(Math.round(x - c * 2), Math.round(y - (flap ? c : 0)), c * 2, c); ctx.fillRect(Math.round(x + c), Math.round(y - (flap ? c : 0)), c * 2, c);
    }
    ctx.restore();
  },
  // The paddock's rails over its posts, and the trough at its end.
  drawPaddock(R, game) {
    const posts = game.props.filter((p) => p.kind === 'hfence'); if (!posts.length) return;
    const ctx = R.ctx, c = 2, P = TUNING.heaven.home.paddock, px = (t) => (t + 0.5) * TILE;
    ctx.save(); ctx.scale(1, 1 / TILT);
    const X0 = px(P.x0), X1 = px(P.x1), Y0 = px(P.y0) * TILT, Y1 = px(P.y1) * TILT;
    // the far rails, the side rails, then the posts, then the near rails over them: a small box, straight
    const rail = (x0, x1, y) => { for (const dy of [-18, -10]) { ctx.fillStyle = '#3a2c2a'; ctx.fillRect(x0 - 2, y + dy - 2, x1 - x0 + 4, 6); ctx.fillStyle = '#8a5a34'; ctx.fillRect(x0, y + dy, x1 - x0, 3); ctx.fillStyle = '#c08a5a'; ctx.fillRect(x0, y + dy, x1 - x0, 1); } };
    const side = (x) => { for (const dy of [-18, -10]) { ctx.fillStyle = '#3a2c2a'; ctx.fillRect(x - 2, Y0 + dy - 1, 5, Y1 - Y0 + 3); ctx.fillStyle = '#8a5a34'; ctx.fillRect(x - 1, Y0 + dy, 3, Y1 - Y0); } };
    const post = (p) => { const y = p.y * TILT; ctx.fillStyle = '#3a2c2a'; ctx.fillRect(Math.round(p.x - 3), Math.round(y - 24), 6, 26); ctx.fillStyle = '#9c6a3c'; ctx.fillRect(Math.round(p.x - 2), Math.round(y - 23), 4, 24); ctx.fillStyle = '#c08a5a'; ctx.fillRect(Math.round(p.x - 2), Math.round(y - 23), 1, 24); };
    rail(X0, X1, Y0); side(X0); side(X1);
    for (const p of posts) if (p.side !== 's') post(p);
    for (const p of posts) if (p.side === 's') post(p);
    rail(X0, X1, Y1);
    ctx.restore();
    const tr = game.props.find((p) => p.kind === 'htrough');
    if (tr) {
      ctx.save(); ctx.translate(tr.x, tr.y); ctx.scale(1, 1 / TILT); R.shadow(0, 2, 16, 4);
      ctx.fillStyle = '#3a2c2a'; ctx.fillRect(-16, -12, 32, 12); ctx.fillStyle = '#8a5a34'; ctx.fillRect(-14, -10, 28, 8); ctx.fillStyle = '#f7d774';
      for (let i = 0; i < 6; i++) ctx.fillRect(-12 + i * 4 + (i % 2), -13 - (i % 3), c, 4);
      ctx.restore();
    }
    void c;
  },
  // A stand's own state over its plinth (`drawSeat` calls it): the padlock on a locked one, cracks and rubble on a broken
  // one with what it still asks.
  drawStandState(R, game, p, top) {
    const ctx = R.ctx, st = this.standState(p.seat), c = 2;
    // A locked stand is a ruin under a padlock (9 Oct 2026, "padlocks on every broken one"; the plinth is the broken one,
    // `drawSeat`): nothing is asked of it until the horns are open (`standCost`).
    if (st === 'locked') { this.drawPadlock(ctx, -7, top - 22, 2); return true; }
    if (st === 'broken') {
      // the split, the slump and the stones are the sprite's own (`plinth-broken`, js/heaven-pixels.js)
      // Padlocked until the mirror is repaired: the lock, and no count (9 Oct 2026).
      if (!this.mended()) { this.drawPadlock(ctx, -7, top - 22, 2); return true; }
      const P = this.standCost(p.seat) || 0, poured = this.poured('stand:' + p.seat);
      ctx.font = `700 11px ${FONT_SC}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(58,44,78,0.8)'; ctx.fillText(`${poured} / ${P}`, 0, top - 12);
      return true;
    }
    // (a free animal's stand had a gold ribbon here; since 9 Oct 2026 its light silhouette in the sign says it, `drawSeat`)
    return false;
  },
});

// What broke the story's stands (8 Oct 2026): said before what the stand asks. The tortoise's was never broken.
// What the free ones say to each other when he is near (9 Oct 2026, the backlog's "the concept's scenes between them";
// `Heaven.updateBanter`, numbers `TUNING.heaven.home.banter`). Keyed by the two kinds in alphabetical order; each
// scene is [what the first of the key says, what the second answers].
const HEAVEN_BANTER = {
  'goose|tortoise': [
    ['HONK! RACE YOU TO THE EDGE!', '...YOU GO AHEAD. I WILL BE THERE BY SPRING.'],
    ['WHY ARE YOU SO SLOW?!', 'WHY ARE YOU SO LOUD?'],
    ['I LED HIM THROUGH A WHOLE FLOOR! HONK!', 'HE CARRIED ME THROUGH ONE. IN HIS TEETH. VERY COMFORTABLE.'],
    ['HONK. HONK HONK. HONK?', '...I AGREE.'],
  ],
  'horse|tortoise': [
    ['WANT A RIDE, OLD SHELL?', 'I HAVE SEEN WHERE YOU PUT YOUR FEET. NO.'],
    ['YOU WOULD NEVER WIN A RACE.', 'I HAVE NEVER LOST ONE. I NEVER ENTER.'],
    ['THE GOAT RAN HIS LEGS OFF FOR ME.', 'HE WALKED. I WAS IN HIS MOUTH. IT WAS SLOWER.'],
  ],
  'goose|horse': [
    ['HONK! I COULD BEAT YOU UP THERE!', 'YOU HAVE WINGS. THAT IS CHEATING.'],
    ['THE CULT WAS SCARED OF ME!', 'THE CULT WAS STEPPED ON BY ME.'],
    ['HONK HONK HONK!', 'YES. VERY LOUD. WELL DONE.'],
  ],
};
const STAND_STORY = {
  goose: "BROKEN. THE GOOSE HONKED AT THE CULT'S PRIEST, AND THEY SMASHED ITS STAND FOR IT. REPAIR IT, AND THE GOOSE WALKS YOUR RUNS.",
  horse: 'BROKEN. THE CULT TOOK THE HORSE FOR THEIR WHEEL AND KICKED ITS STAND TO PIECES. REPAIR IT, AND THE HORSE RACES YOU DOWN THERE.',
};
Object.assign(Heaven, {
  // ---------------------------------------------------------------- what the stands and the animals say
  // GRAB at a stand that has nothing to offer yet, or whose animal is not on it: true if it answered.
  seatAnswer(game, n, s) {
    const H = game.heaven, M = this.meta, st = this.standState(s.kind), lift = s.kind === 'horse' ? 76 : 46;
    const say = (text, k) => H.plates.push({ x: n.x, y: n.y - lift, text, life: TUNING.heaven.plate * (k || 1.2) });
    const grab = game.touch && game.touch.active ? 'GRAB' : 'RIGHT M. CLICK';
    // A lock says LOCKED on the pointer and nothing more (9 Oct 2026 playtest: "if it is locked, why write it again, less text").
    if (st === 'locked') { game.audio.sfxClatter('metal', 0.3); return true; }
    // the three of the story (8 Oct 2026, "make a good story for the three"): what broke each stand, then what it asks
    if (st === 'broken') { say(`${STAND_STORY[s.kind] || 'BROKEN.'} HOLD ${grab} AND POUR SOULS INTO IT: ${this.poured('stand:' + s.kind)} / ${this.standCost(s.kind)}.`, 1.6); return true; }
    if (M.questWon && M.questWon[s.kind]) return false;   // the dare's last word is said at the stand once, wherever it lives now
    if (this.freed(s.kind)) { say(s.name + ' IS NOT HERE. IT LIVES UP HERE NOW, ITS OWN WAY. FIND IT.', 1.3); return true; }
    if (s.kind === 'horse' && M.saved.horse) { say('THE HORSE IS IN ITS PADDOCK, BELOW. GO AND SEE IT.', 1.2); return true; }
    if (!M.saved[s.kind]) { say(M.met && M.met[s.kind] ? s.sound + ' ...' : 'EMPTY.', 1.4); return true; }
    return false;
  },
  // An animal's dare (`QUESTS`): the line it wins with, said once; what it asks while worn; a second GRAB within
  // `quests.offer` s takes it. True if it said something.
  // 8 Oct 2026 playtest ("a whole dialogue with the animal: you can agree or not"): said in the box, the offer's last page
  // waiting for BAAAH or bah (`Beast.talk`'s `ask`).
  dareTalk(game, n, s, say) {
    const M = this.meta, Q = QUESTS[s.kind]; if (!Q) return false;
    const box = (text, ask, onAnswer) => Beast.talk(game, { kind: s.kind, x: n.x, y: n.y }, this.parts([text]), ask, onAnswer ? { onAnswer } : null);
    // its last word, and under it what the dare opened (9 Oct 2026 playtest: "I saved the tortoise and never saw the unlock")
    if (M.questWon && M.questWon[s.kind]) {
      delete M.questWon[s.kind]; this.queueOffer(s.kind); this.saveSoon();
      const un = this.unlockWords(s.kind);
      box(s.sound + ' ' + Q.won + (un.length ? ' | ' + un.join(' ') : ''));
      game.audio.sfxBell();
      // said: now it steps off its stand and lives up here (the horse goes from its paddock: out of the pen, loose)
      if (s.kind === 'horse') game.props = game.props.filter((p) => !(p.kind === 'hroam' && p.as === 'horse'));
      this.spawnRoamers(game, { kind: s.kind, x: n.x, y: n.y });
      for (const p of game.props) if (p.kind === 'hroam' && p.as === s.kind) { p.wait = 1.5; p.goal = null; }
      return true;
    }
    if (this.freed(s.kind)) return false;
    if (this.questOn(s.kind)) { box(s.sound + ' ' + Q.wear.replace('{left}', (M.quest[s.kind].left || 0))); return true; }
    // Brought out once (9 Oct 2026 playtest): its thanks, and the ask to be brought out again; its cage is at the start of a
    // floor from now on (`wantsAgain`). The dare waits for the second time.
    if (((M.savedN && M.savedN[s.kind]) || 0) < 2 && !(M.quest && M.quest[s.kind])) {
      M.again = M.again || {};
      if (!M.again[s.kind]) { M.again[s.kind] = 1; this.saveSoon(); box(s.sound + ' ' + Q.thanks); }
      else box(s.sound + ' ' + Q.again);
      return true;
    }
    // What winning pays goes in as the page before the question (9 Oct 2026 playtest: "first show what it gives"), and a
    // no is not the end of it: the offer stands, the next GRAB asks again.
    const pages = Q.offer.replace('{n}', (TUNING.heaven.quests[s.kind] || {}).floors || 1).split('|').map((x) => x.trim()), prize = this.prizeWords(s.kind);
    if (prize) pages.splice(pages.length - 1, 0, prize);
    box(s.sound + ' ' + pages.join(' | '), true, (g2, yes) => {
      if (yes) { this.takeQuest(game, s.kind, n); say(Q.took); } else say(Q.off + ' ASK ME AGAIN WHEN YOU ARE READY.');
    });
    return true;
  },
  // GRAB at one who lives up here: the horse in its paddock has its dare; a free one says something of its own life.
  talkRoam(game, p) {
    const s = HEAVEN_SEATS.find((q) => q.kind === p.as), H = game.heaven, Q = QUESTS[p.as]; if (!s) return;
    const lift = p.as === 'horse' ? 70 : 40, n = { x: p.x, y: p.y, thing: p };
    const say = (text, k) => H.plates.push({ x: p.x, y: p.y - lift, text, life: TUNING.heaven.plate * (k || 1.2) });
    game.audio.sfxAnimal(p.as); p.goal = null; p.wait = 2.5; p.vx = p.vy = 0; p.face = Math.sign(game.goat.x - p.x) || p.face;
    if (this.dareTalk(game, n, s, say)) return;
    const L = Q && Q.free ? Q.free : [s.line];
    this.roamN = (this.roamN || 0) + 1;
    Beast.talk(game, { kind: p.as, x: p.x, y: p.y }, [L[this.roamN % L.length]]);
  },
  // THE HORSE'S CHASE comes on `quests.horse.chance` of the floors past the first, off the run and the floor (`Chase.quest`).
  chaseRoll(game) {
    const li = game.levelIndex | 0;
    return farHash(((game.runSeed | 0) % 9973) + li * 31, li * 7 + 3) < TUNING.heaven.quests.horse.chance;
  },
});

Object.assign(Heaven, {
  // ---------------------------------------------------------------- the dev drawer's HEAVEN tab (`Renderer.drawMirrorTab`)
  // "Give me a way in the dev tools to test this quickly" (7 Oct 2026): each chain's step set by hand, and the rest.
  // `op`: stand (locked, broken, open, round again), saved, dare (on / off), win (the dare won now), free, reset.
  devHome(game, kind, op) {
    const M = this.meta || this.load(), S = TUNING.heaven.home.stands;
    M.standOverride = M.standOverride || {}; M.mendedStands = M.mendedStands || {}; M.freed = M.freed || {}; M.quest = M.quest || {};
    if (op === 'stand') {
      const order = ['locked', 'broken', 'open'], cur = this.standState(kind), next = order[(order.indexOf(cur) + 1) % 3];
      M.standOverride[kind] = next; if (next === 'open') M.mendedStands[kind] = 1; else delete M.mendedStands[kind];
    } else if (op === 'saved') { if (M.saved[kind]) delete M.saved[kind]; else M.saved[kind] = Date.now(); }
    else if (op === 'dare') { if (this.questOn(kind)) M.quest[kind].on = false; else M.quest[kind] = { on: true, left: (TUNING.heaven.quests[kind] || {}).floors || 1 }; }
    else if (op === 'win') { M.quest[kind] = { on: false, left: 0, won: 1 }; M.freed[kind] = 1; (M.questWon = M.questWon || {})[kind] = 1; M.saved[kind] = M.saved[kind] || Date.now(); }
    else if (op === 'free') { if (M.freed[kind]) delete M.freed[kind]; else M.freed[kind] = 1; }
    // As if he had done all of it for the animal (8 Oct 2026: "a dev option to see it as if I helped the animal the
    // most"): its stand whole, brought up twice, its dare won and the animal free. `all` does every stand.
    else if (op === 'max') {
      const one = (k) => {
        M.standOverride[k] = 'open'; M.mendedStands[k] = 1; M.saved[k] = M.saved[k] || Date.now();
        M.savedN = M.savedN || {}; M.savedN[k] = Math.max(2, M.savedN[k] || 0);
        if (QUESTS[k]) { M.quest[k] = { on: false, left: 0, won: 1 }; M.freed[k] = 1; (M.questWon = M.questWon || {})[k] = 1; }
      };
      if (kind === 'all') HEAVEN_SEATS.forEach((s) => one(s.kind)); else one(kind);
    }
    else if (op === 'reset') { delete M.standOverride[kind]; delete M.mendedStands[kind]; delete M.saved[kind]; delete M.freed[kind]; delete M.quest[kind]; if (M.poured) delete M.poured['stand:' + kind]; }
    void S;
    this.save();
    if (game.heaven && game.level && game.level.def.heaven) {   // up there now: the paddock and who lives there, again
      game.props = game.props.filter((p) => p.kind !== 'hroam' && p.kind !== 'hfence' && p.kind !== 'htrough');
      this.layPaddock(game); this.spawnRoamers(game); this.syncPost(game);
    }
    if (kind === 'all') { game.devToast('EVERY ANIMAL: DONE ALL A GOAT CAN DO FOR IT'); return; }
    game.devToast(`${kind.toUpperCase()}: ${this.standState(kind).toUpperCase()}${M.saved[kind] ? ' · SAVED' : ''}${this.questOn(kind) ? ' · DARE ON' : ''}${M.freed[kind] ? ' · FREE' : ''}`);
  },
  // A dev's word on what a chain stands at, for the tab's line.
  devHomeLine(kind) {
    const M = this.meta || this.load(), Q = TUNING.heaven.quests[kind] || {};
    return `stand ${this.standState(kind)}${this.standState(kind) === 'broken' ? ' (' + this.poured('stand:' + kind) + '/' + this.standCost(kind) + ')' : ''} · ${M.saved[kind] ? 'brought up' : 'not brought up'} · dare ${this.questOn(kind) ? 'on, ' + M.quest[kind].left + ' of ' + (Q.floors || 1) + ' left' : 'off'} · ${this.freed(kind) ? 'FREE · ' + ((Shop.def(QUESTS[kind].talisman) || {}).name || '') + ' unlocked' : 'not free'}`;
  },
});
