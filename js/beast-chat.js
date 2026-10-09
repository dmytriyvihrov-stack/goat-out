// THE COMPANIONS' TALK (9 Oct 2026, his ask: "go through the backlog and ideas and improve the game, especially the
// companions' dialogues"). Until now an animal spoke twice: its terms in the box, and once at the stairs on the card.
// Between the two it was a parcel that walked. Here it is a character on the road: once its terms are said it answers
// what happens near it, the man put down, the heart lost, the soul swallowed, the stairs in sight, being carried or
// thrown, in a voice of its own (`BEAST_CHAT` in js/tuning.js, numbers in `TUNING.beast.chat`).
//
// Rules of the road, so it stays a voice and never a noise:
//   - one line at a time on the whole floor (`gap`), one animal not more often than `cd`, never in its first seconds;
//   - only the nearest animal in sight that has a line for it answers a thing that happened to the goat or a man;
//   - what is done to the animal itself (`own`) is answered by that animal, sooner (`ownCd`);
//   - a line is never said twice running, and nothing is said over its terms (a plate already riding on it).
// Render only: a float rides on it (`Renderer.drawFloatTexts`), it touches no AI, no noise, no simulation.
const BeastChat = {
  OWN: { ouch: 1, carried: 1, thrown: 1, stun: 1, poison: 1 },

  // The animals of the floor that have said their terms and are on the road with him.
  talkers(game) {
    const out = [];
    for (const p of game.props) {
      if (!Beast.animal(p) || p.gift || p.spite || p.leaving || p.refused > 0) continue;
      if (p.kind === 'chicken' ? !game.henTold : !(p.asked && game.beastTold && game.beastTold[p.kind])) continue;
      out.push(p);
    }
    return out;
  },
  // Something happened at (x, y) (the goat's spot when omitted): the nearest animal that can see it answers.
  event(game, kind, x, y) {
    const C = TUNING.beast.chat, g = game.goat;
    if (game.state !== 'play' || !g || g.dead || game.beastTalk || game.beastFarewell) return;
    const S = BeastChat.state(game);
    if (S.gap > 0 || Math.random() > (C.chance[kind] || 0)) return;
    if (x === undefined) { x = g.x; y = g.y; }
    let best = null, bd = Infinity;
    for (const p of BeastChat.talkers(game)) {
      const L = BEAST_CHAT[p.kind]; if (!L || !L[kind] || !L[kind].length) continue;
      if ((p.chatT || 0) > 0 || game.hidden(p.x, p.y)) continue;
      const d = hyp(p.x - g.x, p.y - g.y); if (d > C.near * TILE) continue;
      const dd = d + hyp(p.x - x, p.y - y) * 0.5;
      if (dd < bd) { bd = dd; best = p; }
    }
    if (best) BeastChat.say(game, best, kind);
  },
  // Something was done to this animal: it answers it itself.
  own(game, p, kind) {
    const C = TUNING.beast.chat;
    if (game.state !== 'play' || game.beastTalk || !BEAST_CHAT[p.kind] || !BEAST_CHAT[p.kind][kind]) return;
    if (BeastChat.talkers(game).indexOf(p) < 0 || (p.chatOwn || 0) > 0 || Math.random() > (C.chance[kind] || 0)) return;
    BeastChat.say(game, p, kind, true);
  },
  say(game, p, kind, own) {
    const C = TUNING.beast.chat, L = BEAST_CHAT[p.kind][kind];
    // its terms, or a line still being read, its own or another's (two animals side by side laid one plate over the other)
    if (game.floats.some((f) => (f.on === p || f.chat) && f.life > 0.4)) return;
    p.chatLast = p.chatLast || {};
    let i = Math.floor(Math.random() * L.length);
    if (L.length > 1 && i === p.chatLast[kind]) i = (i + 1) % L.length;
    p.chatLast[kind] = i;
    p.chatT = C.cd; p.chatOwn = C.ownCd; BeastChat.state(game).gap = own ? C.gap * 0.5 : C.gap;
    game.audio.sfxAnimal && game.audio.sfxAnimal(p.kind);
    game.floats.push({ x: p.x, y: p.y, on: p, row: 0, n: 1, text: L[i], color: PALETTE.hen, life: C.life, pact: true, chat: true });
  },
  // The floor's own clock: kept on `game.chat`, started again on a new level.
  state(game) {
    if (!game.chat || game.chat.level !== game.level) game.chat = { level: game.level, gap: 0, still: 0, idleAt: -Infinity, fight: false, stairs: false };
    return game.chat;
  },
  // Every play step (after the clock, `Game.update`): the clocks, and what is read off the state rather than sent.
  update(game, dt) {
    const C = TUNING.beast.chat, S = BeastChat.state(game), g = game.goat;
    S.gap = Math.max(0, S.gap - dt);
    const L = BeastChat.talkers(game);
    for (const p of L) {
      if (p.chatT === undefined) p.chatT = C.first;   // its terms are a moment ago: let them settle
      p.chatT = Math.max(0, p.chatT - dt); p.chatOwn = Math.max(0, (p.chatOwn || 0) - dt);
      // What is done to it, read off its own state the frame it changes.
      const held = !!p.held, flying = !!(p.flying || p.birdState === 'flying');
      if (held && !p.chatHeld) BeastChat.own(game, p, 'carried');
      if (flying && !p.chatFly) BeastChat.own(game, p, 'thrown');
      if (p.stunT > 0 && !(p.chatStun > 0)) BeastChat.own(game, p, 'stun');
      if (p.poisonT > 0 && !(p.chatPoison > 0)) BeastChat.own(game, p, 'poison');
      p.chatHeld = held; p.chatFly = flying; p.chatStun = p.stunT || 0; p.chatPoison = p.poisonT || 0;
    }
    if (!L.length || !g || g.dead) return;
    // The cult has seen him: the score's own word for it (`GameAudio.encounterStage`).
    const fight = !!(game.audio.encounter && game.audio.encounter.active);
    if (fight && !S.fight) BeastChat.event(game, 'fight');
    S.fight = fight;
    // The last room, the stairs in it.
    const last = game.level && game.level.rooms && game.goatRoom === game.level.rooms.length - 1;
    if (last && !S.stairs) { S.stairs = true; BeastChat.event(game, 'stairs'); }
    // Standing about with nobody after him: one of them fills the quiet.
    S.still = hyp(g.vx || 0, g.vy || 0) < C.still && !fight && g.state === 'idle' ? S.still + dt : 0;
    if (S.still > C.idle && game.timer - S.idleAt > C.idleCd) { S.idleAt = game.timer; BeastChat.event(game, 'idle'); }
  },
  // The last word on the farewell plate when it is walled in behind him (`Beast.farewell`).
  lastWord(kind) { const L = BEAST_CHAT[kind]; return L && L.left || null; },
  // Its terms, met again in a run after it was once brought up to heaven: the first page knows him.
  hello(kind, lines) {
    const L = BEAST_CHAT[kind], M = typeof Heaven !== 'undefined' && Heaven.meta;
    if (!L || !L.again || !lines || !lines.length || !(M && M.saved && M.saved[kind])) return lines;
    // a first page that is only its sound gives way; one that says the terms (the horse's race) is kept after it
    return [L.again].concat(lines[0].length <= 12 ? lines.slice(1) : lines);
  },
  // Every line one kind can say on the road, for the ANIMALS tab (`Beast.lines`).
  lines(kind) {
    const L = BEAST_CHAT[kind], out = []; if (!L) return out;
    for (const k of Object.keys(L)) out.push(...[].concat(L[k]));
    return out;
  },
};
