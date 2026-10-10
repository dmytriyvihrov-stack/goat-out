'use strict';
// RUN STATS (1 Oct 2026: "a question in the menu whether we may send, then the run's report after each
// session, who hurt the goat, who killed him, how the cult was hurt (elements, walls…), which choices
// were dealt and taken, which companions and what became of them, and all of it can be saved").
//
// One report a LIFE: it opens on the first floor a goat walks onto and closes when he dies (the
// game's loop, so that is the send), escapes, is quit to the title, or the tab closes. Every report
// is kept in this browser (`STATS_KEY`, the last `TUNING.stats.keep`) whatever the answer, so the
// dev drawer's SAVE STATS and `tools/stats.html` can read them; sent only once the player said yes
// (`game.settings.stats`), only with the worker's `TUNING.stats.url` set, never a god-mode, LEVELS or SHOWROOM
// life, and off the itch build only with `sendDev`. What did not go out (offline, a closed tab) is
// tried again the next time the page loads. Nothing personal: a random id made here, and the run.
// Pure bookkeeping: never touches the simulation, and every hook is wrapped so a throw here can
// never cost a frame.
const STATS_KEY = 'goatout.stats.v1';

const Stats = {
  life: null,
  db: null,

  load() {
    if (Stats.db) return Stats.db;
    let d = null;
    try { d = JSON.parse(localStorage.getItem(STATS_KEY) || 'null'); } catch (e) { d = null; }
    if (!d || typeof d !== 'object' || !Array.isArray(d.log)) d = { log: [] };
    d.log = d.log.filter((L) => L && typeof L === 'object' && Array.isArray(L.floors));
    for (const L of d.log) delete L.sending;   // a send cut off by a closed tab is tried again
    // A life the tab was killed in (a phone throwing a backgrounded tab away, a bfcache eviction) was
    // parked on the way out (`park`); it is closed now as `closed`, answered as it was then.
    if (d.open && typeof d.open === 'object' && Array.isArray(d.open.floors) && !Stats.life) {
      const L = d.open, F = L.floors[L.floors.length - 1];
      if (L.floors.some((x) => x.time || x.kills)) {
        L.end = L.end || { how: 'closed', f: F ? F.f : null, room: F ? F.room : 0, t: F ? F.time : 0, by: null, code: null,
          kills: L.floors.reduce((n, x) => n + (x.kills || 0), 0) };
        L.done = L.done || L.parked || L.at; L.sent = false; d.log.push(L);
      }
    }
    delete d.open;
    if (!d.player) d.player = 'p-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    return (Stats.db = d);
  },
  store() {
    const d = Stats.load(), keep = TUNING.stats.keep;
    if (d.log.length > keep) d.log.splice(0, d.log.length - keep);
    try { localStorage.setItem(STATS_KEY, JSON.stringify(d)); } catch (e) { /* storage full or refused: this tab only */ }
  },
  // Wrapped: a hook that throws must never take the frame with it.
  safe(fn) { try { fn(); } catch (e) { console.warn('stats:', e); } },

  // ---------- who and where ----------
  floorTok(game) {
    const d = game.level && game.level.def || {};
    return (d.shroom ? 'T' : d.dark ? 'N' : 'L') + (game.levelIndex + 1);
  },
  // A man as the reports name him: the butcher is a clubman with the flag, the ogre is kind `butcher`.
  who(e) {
    if (!e) return '?';
    if (typeof e === 'string') return e;
    const k = e.kind === 'bearer' ? (e.champion ? 'butcher' : e.shieldman ? 'shieldman' : e.thrower ? 'thrower' : e.shaman ? 'shaman' : 'clubman') : e.kind === 'butcher' ? 'ogre' : e.kind;
    return e.boss ? k + '*' : k;
  },
  // Only the run itself: the JUICE tab's stage is `Object.create(game)`, the tools lend stubs.
  off(game) { return game !== window.game || !game.level || game.level.def.heaven || game.showroomOn; },
  floor(game) { const L = Stats.life; return L && L.floors[L.floors.length - 1]; },
  t(game) { return Math.round((game.timer || 0) * 10) / 10; },

  // ---------- the life ----------
  // From the end of `startLevel`: a new life if none is open, and a floor entry either way.
  enter(game) {
    Stats.safe(() => {
      if (Stats.off(game)) return;
      const d = Stats.load();
      if (!Stats.life) {
        Stats.life = { v: 1, id: 'r-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), player: d.player,
          build: BUILD, at: Date.now(), runSeed: (game.runSeed >>> 0).toString(36), deaths: game.deaths || 0,
          runs: (game.best && game.best.runs) || 0, flags: Stats.flags(game), release: !!(typeof RELEASE !== 'undefined' && RELEASE.on),
          touch: !!(game.touch && game.touch.active), pad: !!(game.pad && game.pad.active), floors: [], end: null };
        // Taken once the life has been played (`played`), not here: CONTINUE builds the floor under heaven and
        // Escape out of the opening scene opens a life too, and both counted as a start or a return to play.
        // What was bought at the mirror in heaven since the last life closed, in the order he bought it ("id:rank").
        if (d.mirror && d.mirror.length) { Stats.life.mirror = d.mirror.slice(0, 40); d.mirror = []; Stats.store(); }
        Stats.life.pend = ['start'].concat(d.steps && d.steps.death ? ['restart'] : []);
      } else Stats.played(game);
      for (const n of TUNING.stats.reach) if (game.levelIndex + 1 >= n) Stats.step(game, 'reach' + n);
      const def = game.level.def, fl = Stats.life.floors, last = fl[fl.length - 1];
      // A floor entered and never played (CONTINUE goes up to heaven first, and its edge enters the floor again) is one entry, not two.
      if (last && last.f === Stats.floorTok(game) && !last.time && !last.kills) fl.pop();
      Stats.life.floors.push({ f: Stats.floorTok(game), name: def.name || '', rooms: game.level.rooms.length,
        hp: game.goat.maxHp, boons: game.boons.map((b) => b.id), artifact: (game.artifacts || []).length ? game.artifacts.map((a) => a.id + ':' + a.tier).join(',') : null, cape: game.cape ? game.cape.id : null,
        beastsBanked: Object.assign({}, game.beasts || {}), hurt: [], blows: {}, souls: [], shop: [], beasts: [], kills: 0, time: 0, room: 0, cleared: false,
        rm: [], path: [], nw: [], dry: Math.round(Novelty.dry()) });
      // The rooms the generator dealt because the clock had run dry (gen.js `draw`, `level.fresh`).
      for (const name of game.level.fresh || []) Novelty.nudged(game, 'room:' + name);
      if (game.level.freshVault) Novelty.nudged(game, 'vault:' + game.level.freshVault);
      // and the mouse's shelf (`Shop.restock`, which ran before this floor's entry was open)
      for (const p of game.props) if (p.kind === 'ware' && p.ware && p.ware.fresh) Novelty.nudged(game, 'talisman:' + p.ware.id);
      // The animals this floor has to offer, in their coops and stalls.
      for (const p of game.props) if (p.kind === 'coop' || p.kind === 'fish') Stats.beast(game, p.kind === 'fish' ? 'fish' : p.holds || 'chicken', 'here');
    });
  },
  flags(game) {
    return (game.settings && game.settings.easy ? 'E' : '') + (game.dev && game.dev.god ? 'X' : '') + (game.runJumped ? 'J' : '')
      + (game.testerUsed ? 'T' : '') + (Stats.bot() ? 'B' : '');   // T: PLAYTESTER MODE gave him something (`Game.testerAction`)
  },
  // The autoplay bot (`tools/autoplay-bot.js`, 3 Oct 2026: "mark it in the db so it does not break the stats"):
  // it sets `window.bot`. A browser it has once played in is a bot's for good (`d.bot`): its reports go out
  // flagged `B` (stored with the flag, left out of `tools/stats.html` like god mode) and its funnel steps,
  // which carry no flag, do not go out at all.
  bot() {
    const d = Stats.load();
    if (!d.bot && typeof window !== 'undefined' && window.bot && window.bot.iv) { d.bot = true; Stats.store(); }
    return !!d.bot;
  },
  // Every letter the open life has worn at any moment, not only the last: GOD MODE thrown on and off
  // again before a death left a report with no X, and it was sent. Called at a switch and at the close.
  mark(game) {
    const L = Stats.life; if (!L) return;
    for (const c of Stats.flags(game)) if (!(L.flags || '').includes(c)) L.flags = (L.flags || '') + c;
  },
  // The steps a life owes once it has been played at all (`pend`): a second of play or a kill.
  played(game) {
    const L = Stats.life; if (!L || !L.pend) return;
    if (!L.floors.some((f) => f.time > 0 || f.kills > 0)) return;
    const p = L.pend; delete L.pend;
    for (const s of p) Stats.step(game, s);
  },
  // Where the floor stands when it ends, for whichever way it ends.
  stamp(game) {
    const F = Stats.floor(game); if (!F) return;
    F.time = Stats.t(game); F.kills = game.kills || 0; F.room = game.goatRoom || 0;
    if (Stats.cur && Stats.cur.F === F) Stats.roomLeave(game);
  },
  cleared(game) {
    Stats.safe(() => {
      const F = Stats.floor(game); if (!F || Stats.off(game)) return; Stats.stamp(game); F.cleared = true; Stats.played(game);
      if (game.levelIndex === 0) Stats.step(game, 'clear1');
    });
  },
  // `how`: 'death' (the loop: the send), 'win', 'quit', 'closed'.
  close(game, how) {
    Stats.safe(() => {
      const L = Stats.life; if (!L) return;
      Stats.stamp(game); Stats.played(game);
      // Nothing played (Escape in the opening scene, a quit from heaven after CONTINUE): no report at all.
      if (how !== 'death' && L.floors.every((f) => !f.time && !f.kills)) { Stats.life = null; return; }
      if (how !== 'win') Stats.beastsWith(game);
      const F = Stats.floor(game);
      L.end = { how, f: F ? F.f : null, room: game.goatRoom || 0, t: Stats.t(game), by: how === 'death' && game.goat ? Stats.who(game.goat.hurtBy) : null,
        code: Stats.code(game, how), kills: L.floors.reduce((n, f) => n + f.kills, 0) };
      // The room he ended in, as the floor plan knows it: its role and how many rooms the floor has.
      const endRoom = game.level && game.level.rooms && game.level.rooms[L.end.room];
      if (F && F.rm) { L.end.role = endRoom ? endRoom.role || '?' : '?'; L.end.rooms = F.rooms || 0; }
      Stats.cur = null; Stats.mens = null;
      // How dry it was when the life ended (a drought still running counts toward its longest too).
      L.dryEnd = Math.round(Novelty.dry()); L.dryMax = Math.max(L.dryMax || 0, L.dryEnd);
      Stats.mark(game);
      if (how === 'death' || how === 'win') Stats.step(game, how);
      L.done = Date.now();
      // The answer as it stood when this life ended: a life played after NO THANKS stays unsent even
      // if SETTINGS is switched on later.
      L.ok = !!(game.settings && game.settings.stats);
      Stats.life = null;
      const d = Stats.load();
      L.sent = false; delete L.parked;
      d.log.push(L); delete d.open; Stats.store();
      Stats.flush(game);
    });
  },

  // The run code of this moment, not the last card's: a quit, a closed tab or a Backspace restart has
  // no card of its own, and `lastCode` was still the one before.
  code(game, how) {
    if (how === 'death' && game.lastCode) return game.lastCode;
    try { return game.level && game.runCode ? game.runCode(null) : null; } catch (e) { return null; }
  },
  // The open life written down as it is, for a tab that may never come back to close it (`load`).
  park(game) {
    Stats.safe(() => {
      const d = Stats.load(), L = Stats.life;
      if (L && game) { Stats.stamp(game); L.parked = Date.now(); L.ok = !!(game.settings && game.settings.stats); d.open = L; }
      else delete d.open;
      Stats.store();
      if (typeof Unlocks !== 'undefined' && Unlocks.data) { Unlocks.dirty = true; Unlocks.flush(); }   // the novelty clock with it
      // A tab going away is where the funnel loses people: what this life owes goes out now (`keepalive`).
      if (L && game) { Stats.played(game); Stats.flushSteps(game); }
    });
  },

  // ---------- what happens on a floor ----------
  // `Goat.damage`, after the blow has landed: a heart (or more) gone, and what took it.
  hurt(game, by, n) {
    Stats.safe(() => {
      const F = Stats.floor(game); if (!F || Stats.off(game)) return;
      F.hurt.push({ by: Stats.who(by), n, hp: game.goat.hp, room: game.goatRoom || 0, t: Stats.t(game) });
      const R = Stats.here(game, F); if (R) R.h += n;
    });
  },
  // `Enemy.die`, top: a blow that may or may not finish him. `cause` is the game's word ('splat',
  // 'burn', 'boom'…), `how` what the splat was (a wall, a door, a body, a blade, a bomb…).
  blow(game, e, cause, how) {
    Stats.safe(() => {
      const F = Stats.floor(game); if (!F || Stats.off(game) || e.scripted) return;
      e.statHow = how || (cause === 'splat' ? 'hit' : cause);
      const k = Stats.who(e) + '|' + e.statHow;
      (F.blows[k] = F.blows[k] || [0, 0])[0]++;
    });
  },
  // `game.onKill`: the blow before it was the one that finished him.
  kill(game, e, cause) {
    Stats.safe(() => {
      const F = Stats.floor(game); if (!F || Stats.off(game) || e.scripted) return;
      const k = Stats.who(e) + '|' + (e.statHow || cause || '?');
      (F.blows[k] = F.blows[k] || [1, 0])[1]++;
      const R = Stats.here(game, F); if (R) R.k++;
    });
  },

  // ---------- room by room ----------
  // (6 Oct 2026: "in which room of the level he died and on which floor: the path matters", "the strategy
  // for each room: fight, stealth, run-through".) `F.rm`: one entry a room he walked into, in the order he
  // first did: `i` its index (of `F.rooms`), `r` its role, `t` seconds in it (a corridor counts to the room
  // behind him, as `goatRoom` does), `h` hearts lost and `k` men killed while he was in it, `n` the room's
  // own men alive when he first came in, `d` how many of those were dead when he last left it, `a` 1 once
  // any of them came after him, and `s` what he did there: `empty` (nobody to meet), `fight` (he left
  // `TUNING.stats.fight` of them dead or more), `stealth` (none of them ever came after him), `run` (he
  // went on with men who knew him still up). `F.path`: [room, floor seconds] at every room entered,
  // revisits too. A room's men are who the level put there (`e.room`), never a chaser or a scripted man.
  // `Game.update` calls `roomTick` once a step: one compare unless he crossed into another room, and a
  // look at that room's few men until one of them has come after him.
  cur: null,    // { F, i, rec, men, t0 }: the room he is in now
  mens: null,   // { F, at: [] }: each room's own men, listed the first time he walks in
  roomTick(game) {
    const L = Stats.life; if (!L || Stats.off(game)) return;
    const F = L.floors[L.floors.length - 1]; if (!F || !F.rm) return;
    const C = Stats.cur;
    if (!C || C.F !== F || C.i !== (game.goatRoom || 0)) { Stats.safe(() => Stats.here(game, F)); return; }
    const R = C.rec; if (!R || R.a) return;
    const men = C.men;
    for (let j = 0; j < men.length; j++) if (men[j].aware && !men[j].dead) { R.a = 1; break; }
  },
  // The room he is in on floor `F`, opened if he has just walked into it (the one he left is judged first).
  here(game, F) {
    if (!F || !F.rm) return null;
    const i = game.goatRoom || 0;
    if (Stats.cur && Stats.cur.F === F && Stats.cur.i === i) return Stats.cur.rec;
    if (Stats.cur && Stats.cur.F === F) Stats.roomLeave(game);
    if (!Stats.mens || Stats.mens.F !== F) Stats.mens = { F, at: [] };
    let men = Stats.mens.at[i];
    if (!men) {
      men = Stats.mens.at[i] = [];
      for (const e of game.enemies || []) if (e.room === i && !e.dead && !e.scripted && !e.chaser) men.push(e);
    }
    let rec = null;
    for (const x of F.rm) if (x.i === i) { rec = x; break; }
    const C = TUNING.stats, room = game.level && game.level.rooms ? game.level.rooms[i] : null;
    if (!rec && F.rm.length < C.roomCap) {
      rec = { i, r: room && room.role || '?', t: 0, h: 0, k: 0, n: men.length, d: 0, a: 0, s: men.length ? 'stealth' : 'empty' };
      F.rm.push(rec);
    }
    if (F.path.length < C.pathCap) F.path.push([i, Stats.t(game)]);
    Stats.cur = { F, i, rec, men, t0: game.timer || 0 };
    return rec;
  },
  // Judged as he leaves it (or ends in it): its seconds banked, and what he did there.
  roomLeave(game) {
    const C = Stats.cur; if (!C || !C.rec) return;
    const R = C.rec, men = C.men, now = game.timer || 0;
    R.t = Math.round((R.t + Math.max(0, now - C.t0)) * 10) / 10; C.t0 = now;
    let dead = 0;
    for (let j = 0; j < men.length; j++) { const m = men[j]; if (m.dead) dead++; else if (m.aware) R.a = 1; }
    R.d = dead;
    R.s = !R.n ? 'empty' : dead >= R.n * TUNING.stats.fight ? 'fight' : !R.a ? 'stealth' : 'run';
  },
  // A soul's cards, as dealt (`openBoonChoice`), and what came of them (`takeBoon`, `skipBoon`).
  offer(game, pick, replace, third) {
    Stats.safe(() => {
      const F = Stats.floor(game); if (!F || Stats.off(game)) return;
      F.souls.push({ offer: pick.map((b) => b.id), swap: (replace || []).map((o) => o ? o.id : null), third: third || null,
        took: undefined, room: game.goatRoom || 0, t: Stats.t(game), n: game.boons.length });
    });
  },
  took(game, id) {
    Stats.safe(() => {
      const F = Stats.floor(game); if (!F) return;
      const s = F.souls[F.souls.length - 1]; if (s && s.took === undefined) s.took = id;
    });
  },
  // The mouse: what was on the shelf, what he reached for ('milk' for the pail), or the rat ogre.
  shop(game, ware, what) {
    Stats.safe(() => {
      const F = Stats.floor(game); if (!F || Stats.off(game)) return;
      // A cape is its id alone (one grade); `had` is everything he wore when he reached for it.
      const shelf = game.props.filter((o) => o.kind === 'ware' && o.shopId === ware.shopId && !o.broken).map((o) => o.ware.id === 'milk' ? 'milk' : o.ware.cape ? o.ware.id : o.ware.id + ':' + o.ware.tier);
      const had = (game.artifacts || []).map((a) => a.id).concat(game.cape ? [game.cape.id] : []);
      F.shop.push({ offer: shelf, took: what, had: had.length ? had.join(',') : null, t: Stats.t(game) });
    });
  },
  provoked(game) {
    Stats.safe(() => { const F = Stats.floor(game); if (!F || Stats.off(game)) return; F.shop.push({ took: 'ratogre', t: Stats.t(game) }); });
  },
  // An animal: 'here' (in a coop on the floor), 'freed', 'yes' / 'no' (its terms), 'paid' (the horse,
  // before the stairs), 'dead', 'lost' (walled in behind him; `coop` if never let out), 'saved'.
  // `Heaven.buy`: a rank of the mirror bought. Kept until the next life opens and carried on its report.
  mirror(game, id, rank) {
    Stats.safe(() => {
      if (Stats.off(game)) return;
      const d = Stats.load(); (d.mirror = d.mirror || []).push(id + ':' + rank); if (d.mirror.length > 40) d.mirror.shift(); Stats.store();
    });
  },
  // A life that ends with an animal alive beside him (a death, a quit) used to leave its row with no ending
  // at all, so freed and agreed animals looked stuck in the table: `with`, still his when it ended.
  beastsWith(game) {
    const F = Stats.floor(game); if (!F || !game.props) return;
    for (const p of game.props) {
      if (p.gift || p.dead || p.broken || !Beast.is(p.kind) || p.refused || p.agreed === false) continue;
      F.beasts.push({ kind: p.kind, ev: 'with', t: Stats.t(game), room: game.goatRoom || 0 });
    }
  },
  beast(game, kind, ev) {
    Stats.safe(() => {
      const F = Stats.floor(game); if (!F || Stats.off(game)) return;
      F.beasts.push({ kind, ev, t: Stats.t(game), room: game.goatRoom || 0 });
    });
  },

  // ---------- the funnel ----------
  // (1 Oct 2026: "a separate funnel: opened the game, started, restarted after a death, cleared the
  // first floor, reached the fourth, reached the eighth".) A report only goes out when a life ends, and
  // the player who closes the tab for good never ends one, so each step is its own small note, the
  // first time this browser takes it, and goes out the moment it is taken: `open` (the title), `start`
  // (the first life), `death`, `restart` (a life begun after one), `clear1`, `reach<n>` (each of
  // `TUNING.stats.reach`), `win`. Never off a god-mode or LEVELS life (the open life's flags). Kept in
  // `d.steps` until the answer is yes, so `open` goes out with the yes; `d.stepsOut` is what went.
  step(game, name) {
    Stats.safe(() => {
      // The first title is shown from inside `new Game`, while `window.game` is still the canvas of that id.
      if ((window.game instanceof Game && game !== window.game) || (Stats.life && /[XJT]/.test(Stats.life.flags || '')) || Stats.bot()) return;
      const d = Stats.load(), S = d.steps = d.steps || {};
      if (S[name]) return;
      // Taken under an answered NO it is never sent, as a life played under one never is; taken before the
      // question was answered it waits for the answer (the title's opening is taken before it is asked).
      S[name] = { at: Date.now(), build: BUILD, no: !!(game.settings && game.settings.statsAsked && !game.settings.stats) };
      Stats.store(); Stats.flushSteps(game);
    });
  },
  // Everything not yet out in one POST; the worker keeps a player's step once, so a resend is harmless.
  flushSteps(game) {
    const C = TUNING.stats, d = Stats.load(), S = d.steps || {}, out = d.stepsOut = d.stepsOut || {};
    if (!C.url || !game || !game.settings || !game.settings.stats || Stats.bot()) return;
    // One POST at a time; a step taken while one is out goes when it comes back, not at the next step.
    if (Stats.stepsGoing) { Stats.stepsAgain = true; return; }
    const release = typeof RELEASE !== 'undefined' && RELEASE.on;
    if (!release && !C.sendDev) return;
    const todo = Object.keys(S).filter((k) => !out[k] && !S[k].no);
    if (!todo.length) return;
    const steps = {}; for (const k of todo) steps[k] = { at: S[k].at, build: S[k].build };
    Stats.stepsGoing = true;
    fetch(C.url.replace(/\/$/, '') + '/steps', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, keepalive: true,
      body: JSON.stringify({ player: d.player, release: !!release, steps }) })
      .then((r) => { Stats.stepsGoing = false; if (r.ok || r.status === 400) { for (const k of todo) out[k] = true; Stats.store(); } Stats.again(game); })
      .catch(() => { Stats.stepsGoing = false; Stats.stepsAgain = false; });
  },
  again(game) {
    if (!Stats.stepsAgain) return;
    Stats.stepsAgain = false; Stats.flushSteps(game);
  },

  // ---------- out ----------
  sendable(game, L) {
    const C = TUNING.stats;
    if (!C.url || !game.settings || !game.settings.stats || !L.ok) return false;
    if (!(typeof RELEASE !== 'undefined' && RELEASE.on) && !C.sendDev) return false;
    return !/[XJT]/.test(L.flags || '') && L.floors.length > 0;
  },
  // Every report not yet out, each as itself: one POST to our own worker (tools/stats-worker), whose
  // address no blocker lists. `text/plain` keeps it a simple request, so no preflight and an iframe on
  // itch.zone sends it as readily as the page itself; the worker stores a report by its id once.
  flush(game) {
    Stats.flushSteps(game);
    const d = Stats.load(), url = (TUNING.stats.url || '').replace(/\/$/, '') + '/report';
    for (const L of d.log) {
      if (L.sent || L.sending || !Stats.sendable(game, L)) continue;
      L.sending = true;
      const body = JSON.stringify(Stats.clean(L));
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, keepalive: body.length < 60000 })
        .then((r) => { L.sending = false; if (r.ok || r.status === 400 || r.status === 413) { L.sent = true; Stats.store(); } })
        .catch(() => { L.sending = false; });
    }
  },
  // The report as it goes out: without this browser's own bookkeeping.
  clean(L) { const o = Object.assign({}, L); delete o.sent; delete o.sending; delete o.pend; return o; },
  // The dev drawer's SAVE STATS: every report this browser holds, as one file `tools/stats.html` reads.
  async save(game) {
    const d = Stats.load();
    if (!d.log.length) { game.devToast('NO RUN REPORTS YET'); return; }
    try {
      const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      // The funnel's steps ride along (`tools/stats.html` reads `log` and `steps` both).
      await RELEASE.hand(new Blob([JSON.stringify({ player: d.player, steps: d.steps || {}, log: d.log })], { type: 'application/json' }), `goat-stats-${stamp}.json`);
      game.devToast(`SAVED ${d.log.length} REPORTS`);
    } catch (err) { game.devToast('NOT SAVED: ' + String(err && err.message || err).slice(0, 60).toUpperCase(), 5); }
  },

  // ---------- the question ----------
  // Asked once, on the title, before anything else is picked; the answer is SETTINGS' switch after.
  ask(game) {
    if (!game.settings || game.settings.statsAsked || (typeof RELEASE !== 'undefined' && !RELEASE.on && !TUNING.stats.askDev)) return;
    // Nothing lit to begin with: a first Enter, Space or pad A must not answer for the player.
    if (game.menu && !game.menu.panel) { game.menu.panel = 'consent'; game.menu.sub = -1; }
  },
  answer(game, yes) {
    game.settings.stats = !!yes; game.settings.statsAsked = true; game.saveSettings();
    game.menu.panel = null; game.audio.sfxCard();
    if (yes) Stats.flush(game);
  },
  consentKey(game, code) {
    const m = game.menu;
    // Left is NO and right is YES (`drawConsent`), so a side key lands on its own side; up and down toggle.
    if (code === 'KeyA' || code === 'ArrowLeft') { m.sub = 1; game.audio.sfxSwing(); }
    else if (code === 'KeyD' || code === 'ArrowRight') { m.sub = 0; game.audio.sfxSwing(); }
    else if (code === 'KeyW' || code === 'ArrowUp' || code === 'KeyS' || code === 'ArrowDown') { m.sub = m.sub === 0 ? 1 : 0; game.audio.sfxSwing(); }
    else if ((code === 'Space' || code === 'Enter' || code === 'NumpadEnter') && m.sub >= 0) Stats.answer(game, m.sub === 0);
    else if (code === 'Escape' || code === 'Backspace') Stats.answer(game, false);
  },
  drawConsent(R, game) {
    const ctx = R.ctx, s = R.ts, w = R.w, h = R.h, cx = w / 2;
    // Near opaque (9 Oct 2026 playtest: the menu's rows read through the question and its words): the title behind it is not the point
    ctx.fillStyle = 'rgba(9,7,9,0.99)'; ctx.fillRect(0, 0, w, h);
    const bw = clamp(Math.min(w * 0.9, 560 * s), 260 * s, 600 * s), x0 = cx - bw / 2;
    const lines = TUNING.stats.ask;
    let y = h * 0.5 - (lines.length * 22 + 150) * s / 2;
    ctx.textAlign = 'center'; ctx.fillStyle = PALETTE.ochre;
    ctx.font = `700 ${24 * s}px ${FONT_SC}`; ctx.fillText(TUNING.stats.title, cx, y); y += 34 * s;
    ctx.fillStyle = PALETTE.bone; ctx.font = FONT_PICK.font('text', 15 * s);
    for (const l of lines) { for (const part of R.wrap(l, bw)) { ctx.fillText(part, cx, y); y += 21 * s; } }
    y += 18 * s;
    const bh = 52 * s, gap = 14 * s, half = (bw - gap) / 2;
    game.menu.rects.length = 0;
    // Index 0 is still YES (`answer`, `consentKey`), drawn on the right and green (6 Oct 2026: "swap them,
    // the yes button greener"); NO THANKS on the left stays the quiet one.
    ['YES', 'NO'].forEach((label, i) => {
      const x = x0 + (1 - i) * (half + gap), sel = game.menu.sub === i, yes = i === 0;
      game.menu.rects.push({ x, y, w: half, h: bh });
      ctx.fillStyle = yes ? (sel ? '#3f5a26' : '#26361a') : (sel ? '#4a2428' : '#190f16'); ctx.fillRect(x, y, half, bh);
      ctx.strokeStyle = yes ? (sel ? PALETTE.grassHi : PALETTE.grass) : sel ? PALETTE.blood : 'rgba(239,230,208,0.2)'; ctx.lineWidth = 2 * s; ctx.strokeRect(x, y, half, bh);
      ctx.fillStyle = PALETTE.bone; ctx.font = `700 ${16 * s}px ${FONT_SC}`; ctx.fillText(label, x + half / 2, y + bh * 0.62);
    });
    ctx.fillStyle = 'rgba(239,230,208,0.5)'; ctx.font = FONT_PICK.font('text', Math.max(12.5 * s, TUNING.hud.minText * R.s));
    ctx.fillText(TUNING.stats.later, cx, y + bh + 26 * s);
    ctx.textAlign = 'left';
  },
};

// SOMETHING NEW (6 Oct 2026, `TUNING.novelty`): how long this browser has played since it last met something
// for the first time. The clock (`Unlocks` `nov`: `play` seconds of real play on a real floor, `last` the play
// second of the last first sighting) outlives runs. Every first sighting comes through `Unlocks.mark` → `saw`;
// `tick` (from `Game.update`, beside the floor's clock) adds the three sections no shelf shows: the room
// template he is in, every man within `near` tiles he can see, the floor itself. The report carries it:
// a floor's `nw` ([floor second, 'section:id', play seconds dry before it]) and `dry` (dry on walking in),
// a life's `dryMax` and `dryEnd`, and `nudge` (what was slipped in because it ran dry). GOD MODE and THE
// SHOWROOM count nothing, as `Unlocks` does not.
const Novelty = {
  t: 0, save: 0,
  nov() { return Unlocks.load().nov; },
  dry() { const n = Novelty.nov(); return Math.max(0, n.play - n.last); },
  // Whether the generator and the soul's deal should lean toward what he has not seen.
  hungry() { return Novelty.dry() >= TUNING.novelty.dry; },
  saw(sec, id) {
    const n = Novelty.nov(), gap = Math.round(Math.max(0, n.play - n.last));
    n.last = n.play;
    const game = typeof window !== 'undefined' ? window.game : null;
    if (!game || !Stats.life || Stats.off(game)) return;
    Stats.safe(() => {
      const L = Stats.life, F = Stats.floor(game); if (!F) return;
      L.dryMax = Math.max(L.dryMax || 0, gap);
      if ((F.nw = F.nw || []).length < TUNING.novelty.cap) F.nw.push([Stats.t(game), (sec + ':' + id).slice(0, 40), gap]);
    });
  },
  tick(game, dt) {
    if (Stats.off(game) || (game.dev && game.dev.god)) return;
    const n = Novelty.nov(); n.play += dt;
    if ((Novelty.save -= dt) <= 0) { Novelty.save = 5; Unlocks.dirty = true; }   // the clock reaches the disk with `Unlocks.tick`'s next write
    if ((Novelty.t -= dt) > 0) return; Novelty.t = 0.5;
    const g = game.goat; if (!g) return;
    const def = game.level.def;
    if (def.name) Unlocks.mark('floors', def.name, 1);
    const room = game.level.rooms && game.level.rooms[game.goatRoom];
    if (room && room.tpl && room.tpl.name) Unlocks.mark('rooms', room.tpl.name, 1);
    // A vault is met by standing in its chamber (its kind is what is new: grass, a trap, men, mages, the ogre).
    const V = game.level.vault, gx = g.x / TILE, gy = g.y / TILE;
    if (V && V.box && V.kind && gx >= V.box.x && gx < V.box.x + V.box.w && gy >= V.box.y && gy < V.box.y + V.box.h) Unlocks.mark('vaults', V.kind, 1);
    const R = TUNING.novelty.near * TILE;
    for (const e of game.enemies) {
      if (e.dead || e.scripted || e.disguise || e.mimicDoor || !e.woke || Math.abs(e.x - g.x) > R || Math.abs(e.y - g.y) > R) continue;
      if (game.hidden(e.x, e.y)) continue;
      Unlocks.mark('foes', Stats.who(e).replace('*', ''), 1);
    }
  },
  // What was slipped in because the clock ran dry, on the floor's report.
  nudged(game, what) {
    Stats.safe(() => { const F = Stats.floor(game); if (F && !Stats.off(game) && (F.nudge = F.nudge || []).length < 12) F.nudge.push(String(what).slice(0, 40)); });
  },
  // The room templates this browser has walked into, for the generator (`opts.fresh`), or null while not dry.
  freshOpts() {
    if (!Novelty.hungry()) return null;
    const d = Unlocks.load();
    return { seen: new Set(Object.keys(d.rooms || {})), vaults: new Set(Object.keys(d.vaults || {})) };
  },
};

// A tab put away (a phone's home button, another tab) may be killed without another word, and a page
// kept in the back/forward cache may be evicted from it: the open life is written down each time.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.hidden && window.game) Stats.park(window.game); });
  window.addEventListener('pagehide', () => { if (window.game) Stats.park(window.game); });
}
