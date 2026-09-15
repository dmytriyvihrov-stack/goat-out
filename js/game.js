// Game: state machine, fixed-step loop, pointer/keyboard/touch input, entity collisions, effects, cards.
// Where a run is left for CONTINUE. Bump the version and old saves are simply ignored.
const SAVE_KEY = 'goatout.run.v1';
// The board. It is deliberately not part of the run: NEW GAME wipes the run and never the record.
const BEST_KEY = 'goatout.best.v1';
// Whether this browser has watched the opening scene through once. The first time is not skippable:
// everything the run means is in it, and a key pressed to start the game should not also end it.
const SEEN_KEY = 'goatout.intro.v1';
// What the player turned on. Two switches, and the game runs the same without either of them.
const SET_KEY = 'goatout.settings.v1';
// Whether this browser has ever got out of the pen. Seven blows and two falls is the hardest thing
// the goat does all run and it is worth doing once; every run after it opens on the second blow.
const PEN_KEY = 'goatout.pen.v1';
class Game {
  constructor(canvas) {
    this.canvas = canvas; this.renderer = new Renderer(canvas); this.audio = new GameAudio();
    this.touch = new TouchUI();
    this.coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches);
    this.touch.active = this.coarse;
    this.tapWord = this.coarse ? 'TAP' : 'CLICK';
    this.input = { mx: 0, my: 0, aim: { x: 1, y: 0 }, lmbPressed: false, rmbDown: false, spacePressed: false, rollPressed: false, mouse: { x: 0, y: 0 }, anyPressed: false };
    this.breathFx = null;
    this.keys = new Set();
    this.touchAim = { x: 1, y: 0 };
    this.levelIndex = 0; this.world = null; this.level = null; this.goat = null;
    this.enemies = []; this.props = []; this.bullets = []; this.parts = []; this.floats = []; this.rings = [];
    // What the men have to read in the room: standing fire and the Mill (fixed for the level), and
    // whatever rune is being painted right now (rebuilt each step).
    this.hazards = []; this.sightBlockers = []; this.runes = []; this.houndTold = false; this.henTold = false;
    this.cam = { x: 0, y: 0, zoom: 1 }; this.camLead = { x: 0, y: 0 };
    this.shakeAmt = 0; this.shakeX = 0; this.shakeY = 0;
    // juice: a directional camera punch, a lens shove, a screen flash and a kill counter
    this.kickX = 0; this.kickY = 0; this.zoomKick = 0; this.flashAmt = 0; this.flashColor = PALETTE.bone;
    this.combo = 0; this.comboTimer = 0; this.barkCd = 0; this.cageOpen = false; this.cageLunge = -1;
    this.cageThought = 0;   // a beat of "her" over his head the moment the pen gives, comic-panel style
    this.hitstopTimer = 0; this.timeScale = 1; this.slowTimer = 0; this.hurt = null;
    this.kills = 0; this.totalKills = 0; this.timer = 0; this.deaths = 0; this.totalScore = 0;
    this.best = this.loadBest();
    this.boons = []; this.mods = Object.assign({}, BOON_BASE); this.souls = []; this.boonChoice = null; this.boonRects = [];
    this.lastBoonActive = false;   // which kind the last soul offered, so the next one alternates
    this.soulsHere = 0;   // how many the level being played gives up, all in. Reported on its card.
    this.fallers = [];    // men on their way down a hole: a picture, with nothing simulated in it
    // A soul is spent by a click that starts and ends on the same card. `boonDown` is the card the
    // pointer went down on; `boonArm` is the beat the cards ignore everything after they appear.
    this.boonDown = -1; this.boonArm = 0;
    // `rules` is the drawer's RULES page: the whole screen, the simulation held, `page` the level it
    // is looking at and `sample` a level generated for a page that is not the one in play.
    // `rules` is the drawer's tool page: the whole screen, the simulation held. `tab` is which half
    // of it you are looking at — the generation rules held against one level, or the difficulty
    // curve of all seven — and `page` the level the first half is looking at.
    // `rules` is the drawer's tool page: the whole screen, the simulation held. `tab` is which of
    // the three it is showing — the rules that hold everywhere, one level in full, or the curve of
    // all seven — `page` the level the middle one is looking at, and `room` the one room the page
    // has been asked to open, which is reachable from either of the other two.
    this.dev = { open: false, god: false, rects: [], toast: null, rules: false, tab: 'rules',
      page: 0, sample: null, sampleSeed: 1, samples: {}, matrix: null,
      balance: null, balanceSeeds: 8, room: null };
    this.intro = null;      // the opening scene while it plays; see beginIntro
    this.stairFx = null;    // the goat on a flight of stairs: { t, dir } with dir 1 going up and out, -1 arriving
    this.state = 'title'; this.card = null; this.cardQueue = []; this.stateTimer = 0;
    // The first screen: two ways in, and whatever run the browser still remembers behind the second.
    this.menu = { index: 0, rects: [], t: 0, shake: 0 }; this.save = null;
    this.introSeen = false; this.penBroken = false;
    try { this.introSeen = localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { /* storage refused */ }
    try { this.penBroken = localStorage.getItem(PEN_KEY) === '1'; } catch (e) { /* storage refused */ }
    this.settings = this.loadSettings();
    if (!this.settings.sound) this.audio.toggleMute();
    // The tool has its own address: `#rules` and `#balance` open it on that tab at load, so the
    // page can be linked to and bookmarked rather than found through the drawer every time.
    try {
      const h = (location.hash || '').replace('#', '');
      if (h === 'rules' || h === 'balance') { this.dev.open = true; this.dev.rules = true; this.dev.tab = h; }
    } catch (e) { /* no location worth reading */ }
    this.layoutTouch();
    this.bindInput();
    this.showTitle();
    this.last = performance.now(); this.acc = 0; this.lastRaf = this.last;
    const raf = (t) => { this.lastRaf = t; this.frame(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    // Fallback driver: keeps the simulation running when rAF stalls (hidden pane / background tab).
    setInterval(() => { const now = performance.now(); if (now - this.lastRaf > 120) this.frame(now); }, 16);
  }

  // Boons only ever bend numbers the goat already uses, so the two-button scheme never grows.
  applyBoons() {
    this.mods = Object.assign({}, BOON_BASE);
    for (const b of this.boons) b.apply(this.mods);
    if (this.settings.easy) { this.mods.maxHp += EASY.maxHp; this.mods.enemySlow = EASY.enemySlow; }
    if (this.goat) { this.goat.maxHp = this.mods.maxHp; this.goat.hp = Math.min(this.goat.hp, this.goat.maxHp); }
  }
  // A boss can fall against a wall, and a prize inside one is a prize nobody can reach: walk out in
  // rings until the ground is floor the flow field says can be stood on.
  freeSpot(x, y) {
    const w = this.world;
    const ok = (ax, ay) => w.tileAtPx(ax, ay) !== T.WALL && w.flowDist(ax, ay) >= 0;
    if (!w || ok(x, y)) return { x, y };
    for (let ring = 1; ring <= 7; ring++) {
      for (let a = 0; a < 16; a++) {
        const ang = a / 16 * Math.PI * 2;
        const nx = x + Math.cos(ang) * ring * TILE * 0.7, ny = y + Math.sin(ang) * ring * TILE * 0.7;
        if (ok(nx, ny)) return { x: nx, y: ny };
      }
    }
    return { x: this.goat.x, y: this.goat.y };
  }
  dropSoul(x, y) {
    const p = this.freeSpot(x, y);
    this.placeSoul(p.x, p.y);
  }
  // What a boss leaves when the level has no soul left to give. A wall you had to break through is
  // never worth nothing, and milk is the one other thing in the game worth walking back for.
  dropMilk(x, y) {
    const p = this.freeSpot(x, y);
    this.props.push(new Prop(p.x, p.y, 'heal'));
  }
  // Every boss leaves something. Which one leaves the soul was decided in `startLevel` off the
  // level's own count, so a level gives up exactly what it was authored to give up.
  bossPrize(e) {
    if (e.soul) this.dropSoul(e.x, e.y); else this.dropMilk(e.x, e.y);
  }
  // A man on his way down. The kill is instant and happens at the top of `Enemy.update`, so nothing
  // here is simulated: it is the picture of a fall, held for `fall.showFor` and then gone, and it
  // exists because a body that simply stops existing reads as a bug rather than as a drop.
  spawnFaller(e) {
    this.fallers.push({ e, x: e.x, y: e.y, t: 0, life: TUNING.fall.showFor,
      spin: (Math.random() < 0.5 ? -1 : 1) * (2.2 + Math.random() * 2.4),
      dx: e.vx * 0.14, dy: e.vy * 0.14 });
  }
  // A soul on ground that is known to be good, with none of the rescue above. The vault's is laid
  // down with the level: `dropSoul` asks the flow field whether a spot can be reached, the flow field
  // only reaches ninety tiles from wherever it was last computed, and a vault in the back half of a
  // level is further away than that — so the rescue would fetch it back and drop it at the goat's feet.
  placeSoul(x, y) {
    this.souls.push({ x, y, r: TUNING.soul.r, phase: Math.random() * 6, life: 0 });
  }
  // The barred arena on level one. Its door has no hit points and no handle: the soul the boss was
  // carrying is the bar, and swallowing one anywhere in that room lifts it. Everything else in the
  // game opens by being hit, which is exactly why this one does not — it is the only sentence the
  // game gets to say about what a soul is for, and it says it by being the way out.
  openSoulGate() {
    const sg = this.soulGate;
    if (!sg || !sg.prop || sg.prop.broken) return;
    sg.prop.broken = true; sg.prop.dead = true;
    this.audio.sfxSteel(); this.audio.sfxBell(); this.shake(6); this.flash(PALETTE.witchHi, 0.18);
    this.ring(sg.prop.x, sg.prop.y, 3.4 * TILE, PALETTE.witch);
    this.particles(sg.prop.x, sg.prop.y, 22, PALETTE.witch, 230);
    this.floatText(sg.prop.x, sg.prop.y - 30, 'THE GATE GIVES', PALETTE.witchHi);
  }

  // Sealed arenas, in three beats: the doors stand open, they slam once he is inside, and they give
  // when the last man in the room is down. `sealedRooms` was built once at `startLevel`.
  //
  // The doors MUST start open. They used to stand shut from the first frame of the level, and since
  // a seal refuses to be smashed and refuses to be shouldered, that made every room behind one —
  // the arena, its soul, and the stairs out — unreachable: the level could not be finished at all.
  // A seal is a door that closes behind you, and a door that closes behind you has to be open first.
  updateSeals() {
    const g = this.goat;
    for (const s of this.sealedRooms) {
      if (s.open) continue;
      // Who the door is waiting on. Before it slams that is whoever was PUT in the room; after, it
      // is whoever was actually standing in it at the moment it shut. The two differ whenever an
      // escort followed the goat out through the open door and he then stepped back in — and the
      // spawn list alone would have left that man alive, outside, with the room he belongs to
      // impossible to clear from the inside. Whoever is in the room with you is who you have to beat.
      const alive = (s.held || this.enemies.filter((e) => e.room === s.room))
        .some((e) => !e.dead && !e.ghosted);
      // Nobody left to fight: give, whether or not it ever slammed. A room he cleared by luring it
      // out through the open door is a room he cleared.
      if (!alive) {
        s.open = true;
        for (const d of s.doors) {
          if (d.broken) continue;
          d.seal = false; d.broken = true; d.dead = true;
          this.audio.sfxSteel(); this.shake(4); this.flash(PALETTE.fireHi, 0.1);
          this.particles(d.x, d.y, 14, PALETTE.ash, 220);
          this.floatText(d.x, d.y - 28, 'THE ROOM IS CLEAR', PALETTE.fireHi);
        }
        continue;
      }
      // Still open, and he is properly inside — a tile clear of the doorway itself, so neither door
      // can come down on the goat standing in it. Both slam at once and the fight starts.
      if (!s.armed && this.inRoom(g, s.room, 1)) {
        s.armed = true;
        // Everyone shut in with him, wherever they were spawned — including anyone who chased him
        // through the door on his way in. From here the door reads this list and nothing else.
        s.held = this.enemies.filter((e) => !e.dead && this.inRoom(e, s.room, 0));
        for (const d of s.doors) d.open = 0;
        this.audio.sfxSteel(); this.shake(5); this.vibe(24);
        this.flash(PALETTE.bone, 0.12);
        for (const d of s.doors) this.particles(d.x, d.y, 10, PALETTE.ash, 200);
        this.floatText(g.x, g.y - 40, 'SEALED IN', PALETTE.bone);
      }
    }
  }

  // Is this body inside that room's box, `inset` tiles clear of its walls? Only the seals ask.
  inRoom(e, index, inset) {
    const r = this.level.rooms[index];
    if (!r) return false;
    const tx = e.x / TILE, ty = e.y / TILE, m = inset || 0;
    return tx >= r.x + m && tx < r.x + r.w - m && ty >= r.y + m && ty < r.y + r.h - m;
  }

  // ---------- the fog ----------
  // A room is dark until the goat has been in it. Nothing is hidden by distance and nothing is ever
  // re-hidden: what you have seen stays seen, and what you have not is a black rectangle with a
  // doorway in it. The point is the doorway — a corridor used to end in a room you had already read
  // from twenty tiles away, so the only thing left to do with it was run in, and every room in the
  // game was the same length of warning. Now the warning is the width of a door.
  // The test is the goat's own tile inside the room's box, widened by one so that standing in the
  // mouth of the corridor counts: you see the room as you come through the wall, not after it.
  // The fog has two halves and this does both. A room is opened by walking into it and is never
  // hidden again; what a partition inside an opened room keeps from him is dark until he steps
  // round to where it can be seen from, and that half moves with him. `computeVis` is the second
  // half — the renderer paints down everything outside it, and nothing else reads it: a man behind
  // a pillar is still in the room, still hears you, and still comes.
  revealRooms() {
    const g = this.goat, w = this.world, tx = g.x / TILE, ty = g.y / TILE;
    for (const r of this.level.rooms) {
      if (r.seen) continue;
      if (tx < r.x - 1 || tx > r.x + r.w || ty < r.y - 1 || ty > r.y + r.h) continue;
      r.seen = true;
    }
    // A shut door is a wall with hinges to his own eye as well as to theirs. It was already a wall
    // to `sees`, which is what the cult looks down; the goat's own line went straight through one.
    // Every tile the thing actually covers, not the one its centre is in: a door hangs across both
    // lanes of a two-tile corridor, and blocking half of it left a clear line down the other half.
    const blocks = [];
    for (const p of this.sightBlockers) {
      if (!p.opaque) continue;
      const rr = p.r * 0.8;
      const x0 = Math.floor((p.x - rr) / TILE), x1 = Math.floor((p.x + rr) / TILE);
      const y0 = Math.floor((p.y - rr) / TILE), y1 = Math.floor((p.y + rr) / TILE);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
        if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) continue;
        if (Math.hypot((tx + 0.5) * TILE - p.x, (ty + 0.5) * TILE - p.y) < rr) blocks.push(ty * w.W + tx);
      }
    }
    w.setVisBlocks(blocks);
    w.computeVis(g.x, g.y, TUNING.fog.radius, this.mods.oracle);
    // And a room opens when he can see into it, not only once he is standing in it. It is still the
    // width of the door: what he cannot see from where he stands is painted down by the shade, so a
    // look through a doorway hands him the sliver of the room the doorway shows and nothing more.
    for (const r of this.level.rooms) if (!r.seen && w.anyFloorSeen(r)) r.seen = true;
    // A niche you have opened stays open. The shadowcast is honest about a one-tile gap — from a
    // step back it lights a sliver of what is past it and shades the rest — which is right for a
    // doorway and wrong for this: the whole point of the wall is what is behind it, and a player who
    // has spent two blows finding out has earned the sight of it rather than a dark patch he has to
    // walk into. Three tiles, and only once the wall is actually down.
    for (const p of this.sightBlockers) {
      if (p.kind !== 'secret' || !p.broken || !p.nicheTiles) continue;
      for (const i of p.nicheTiles) w.vis[i] = 1;
    }
  }
  // Is this point inside a room nobody has walked into? Everything the world draws and everything
  // that would give a room away — a man, a crate, a body on its way down a hole — asks this.
  hidden(x, y) {
    if (!this.level) return false;
    for (const r of this.level.rooms) {
      if (r.seen) continue;
      if (x >= r.x * TILE && x < (r.x + r.w) * TILE && y >= r.y * TILE && y < (r.y + r.h) * TILE) return true;
    }
    return false;
  }

  // ---------- settings ----------
  // Two switches and a browser that may refuse to remember either of them. The clock is off by
  // default: a number counting up in the corner of a game about running is a game about the number,
  // and the run is timed either way — the card at the end of a level is where the time belongs.
  loadSettings() {
    const d = { timer: false, sound: true, easy: false };
    try { return Object.assign(d, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (err) { return d; }
  }
  saveSettings() {
    try { localStorage.setItem(SET_KEY, JSON.stringify(this.settings)); } catch (err) { /* private mode: it lasts the tab */ }
  }
  toggleSetting(key) {
    this.settings[key] = !this.settings[key];
    if (key === 'sound' && this.audio.muted === this.settings.sound) this.audio.toggleMute();
    this.saveSettings(); this.audio.sfxSwing();
  }

  // Reaching for a man with a mouth that only takes objects. Said once per level and then never
  // again: it is a missing verb, not a mistake, and repeating it every time would read as a fault.
  // The pen has been out of once. Everything after this run starts on the second blow instead of
  // the seventh: the first time is the lesson and a lesson you have had is only a toll.
  notePenBroken() {
    if (this.penBroken) return;
    this.penBroken = true;
    try { localStorage.setItem(PEN_KEY, '1'); } catch (e) { /* storage refused: it lasts the tab */ }
  }
  reachedForAMan(goat) {
    if (this.toldGrab) return;
    this.toldGrab = true;
    this.floatText(goat.x, goat.y - 34, 'TOO BIG TO CARRY', PALETTE.ash);
  }

  // A soul offers three of one kind: actives change what a button does, passives sharpen everything.
  // The first soul always offers actives, so every run picks a skill before it picks numbers.
  openBoonChoice() {
    // `needs` is a mod that has to be on before the soul is worth anything: LOOSE JOINTS on a goat
    // who cannot roll yet is a card that does nothing, and there are only thirteen of these.
    const open = (b) => !this.boons.includes(b) && (!b.needs || this.mods[b.needs]);
    const actives = BOONS.filter((b) => b.active && open(b));
    const passives = BOONS.filter((b) => !b.active && open(b));
    if (!actives.length && !passives.length) { this.goat.hp = Math.min(this.goat.maxHp, this.goat.hp + 1); return; }
    // While a button is still half-shut the cards lean hard toward the actives. Two of the four verbs
    // are half of themselves out of the pen, and a run that spends its first souls on percentages is
    // a run that never got to play the game — so until every button is whole, a skill is the likely draw.
    const shut = !this.mods.grabMen || !(this.mods.screamStun || this.mods.breath);
    const hasActive = this.boons.some((b) => b.active);
    let pool, other;
    // Once both buttons are whole, the offer alternates rather than rolling for it: a soul that
    // dealt a skill hands the next one out of the numbers, and back again. A coin flip could hand
    // the same kind out three souls running, which reads as the other kind not existing.
    if (actives.length && (!hasActive || (shut ? Math.random() < 0.75 : !this.lastBoonActive))) {
      pool = actives.slice(); other = passives.slice(); this.lastBoonActive = true;
    } else if (passives.length) { pool = passives.slice(); other = actives.slice(); this.lastBoonActive = false; }
    else { pool = actives.slice(); other = []; this.lastBoonActive = true; }
    const pick = [];
    while (pick.length < 3 && pool.length) pick.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    while (pick.length < 3 && other.length) pick.push(other.splice((Math.random() * other.length) | 0, 1)[0]);
    this.boonChoice = pick;
    this.boonKind = pick[0] && pick[0].active ? 'SKILL' : 'BLESSING';
    this.boonDown = -1; this.boonArm = TUNING.boonArm;
    this.state = 'boon'; this.card = null; this.audio.sfxCard(); this.vibe(30);
  }
  // Which card a point is on, or -1. The rects are refilled by the renderer every frame.
  boonAt(p) {
    for (let i = 0; i < this.boonRects.length; i++) {
      const r = this.boonRects[i];
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i;
    }
    return -1;
  }
  takeBoon(i) {
    const b = this.boonChoice && this.boonChoice[i];
    if (!b || this.boonArm > 0) return;
    this.boons.push(b); this.applyBoons(); this.saveRun();
    if (b.heal) this.goat.hp = Math.min(this.goat.maxHp, this.goat.hp + b.heal);
    this.boonChoice = null; this.state = 'play';
    this.audio.sfxBell(); this.floatText(this.goat.x, this.goat.y - 34, b.name, PALETTE.fireHi);
  }

  // ---------- dev mode ----------
  hitDev(p) {
    for (const r of this.dev.rects) {
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { this.devAction(r.id); return true; }
    }
    return this.dev.rules;   // the RULES page takes the whole screen: nothing under it is clickable
  }
  devToast(text) { this.dev.toast = { text, life: 1.6 }; }
  devAction(id) {
    if (id === 'toggle') { this.dev.open = !this.dev.open; return; }
    if (id === 'god') { this.dev.god = !this.dev.god; this.devToast(this.dev.god ? 'GOD MODE ON' : 'GOD MODE OFF'); return; }
    if (id === 'rules') { this.dev.rules = !this.dev.rules; if (this.dev.rules) { this.dev.page = this.level ? this.levelIndex : 0; this.dev.room = null; } return; }
    if (id.startsWith('rules-L')) { this.dev.page = Number(id.slice(7)); this.dev.room = null; return; }
    if (id === 'rules-roll') { this.dev.sampleSeed = (Math.random() * 1e9) | 0; this.dev.samples = {}; this.dev.matrix = null; this.dev.room = null; return; }
    if (id === 'tab-rules' || id === 'tab-levels' || id === 'tab-balance') { this.dev.tab = id.slice(4); this.dev.room = null; return; }
    if (id === 'room-close') { this.dev.room = null; return; }
    // Opening one room: reachable from the level page and from a bar on the curve. Both of them
    // draw the same sample of the same level, so a room is a level index and a room index and the
    // page does not care which half of the tool asked for it.
    if (id.startsWith('room=')) {
      const [li, idx] = id.slice(5).split(',').map(Number);
      this.dev.room = { li, index: idx };
      return;
    }
    if (id === 'bal-seeds') {
      const steps = [4, 8, 16, 30];
      this.dev.balanceSeeds = steps[(steps.indexOf(this.dev.balanceSeeds) + 1) % steps.length];
      this.dev.balance = null; return;
    }
    if (this.state !== 'play' || !this.world) return;
    if (id === 'heal') { this.goat.hp = this.goat.maxHp; this.devToast('HEALED'); return; }
    if (id === 'soul') { this.dropSoul(this.goat.x + 28, this.goat.y); this.devToast('SOUL DROPPED'); return; }
    if (id === 'next') { this.levelCleared(); return; }
    if (id === 'restart') { this.restartLevel(); return; }
    if (id === 'clear') {
      let n = 0;
      for (const e of this.enemies) {
        if (e.dead || Math.hypot(e.x - this.goat.x, e.y - this.goat.y) > 14 * TILE) continue;
        e.die(this, 'splat', 0, 0); n++;
      }
      this.devToast(`CLEARED ${n}`); return;
    }
    this.spawnEnemy(id);
  }
  spawnEnemy(kind) {
    const w = this.world, g = this.goat;
    for (let k = 0; k < 60; k++) {
      const a = Math.random() * Math.PI * 2, r = (3 + Math.random() * 3) * TILE;
      const x = g.x + Math.cos(a) * r, y = g.y + Math.sin(a) * r;
      if (w.tileAtPx(x, y) === T.WALL || w.flowDist(x, y) < 0) continue;
      const e = new Enemy(x, y, kind);
      e.aware = true; e.state = 'chase';
      this.enemies.push(e);
      this.particles(x, y, 10, PALETTE.cult, 160);
      this.devToast('+ ' + kind.toUpperCase());
      return e;
    }
    this.devToast('NO ROOM');
    return null;
  }

  // What the RULES page is looking at: the level in play, as it stands, or a sample of any other
  // level generated for the page from `dev.sampleSeed` and kept until the page or the seed changes.
  // A sample costs a few milliseconds and is what lets every level's rules be checked without
  // playing up to it.
  rulesPage() {
    const d = this.dev, i = clamp(d.page, 0, LEVELS.length - 1), def = LEVELS[i];
    if (this.level && this.levelIndex === i) return { index: i, def, level: this.level, live: true, seed: this.level.seed };
    return { index: i, def, level: this.levelSample(i), live: false, seed: d.sampleSeed };
  }

  // One generated level per level index, off `dev.sampleSeed`, kept until the seed changes. It is
  // what every part of the tool looks at when it is not looking at the level in play, so a room
  // opened from the curve is the same room the level page was showing.
  levelSample(li) {
    const d = this.dev;
    if (this.level && this.levelIndex === li) return this.level;
    const key = li + ':' + d.sampleSeed;
    if (!d.samples[key]) d.samples[key] = generateLevel(LEVELS[li], d.sampleSeed >>> 0);
    return d.samples[key];
  }

  // Every rule against every level, one sample each: the rules tab is the whole list at once rather
  // than one level's answer to it, because a rule that holds on six levels and not on the seventh is
  // a thing you want to see as a row.
  ruleMatrix() {
    const d = this.dev;
    if (d.matrix && d.matrix.seed === d.sampleSeed) return d.matrix;
    const per = LEVELS.map((def, li) => checkRules(this.levelSample(li)));
    const rows = GEN_RULES.map((rule, ri) => ({ rule, cells: per.map((r) => r[ri]) }));
    d.matrix = { seed: d.sampleSeed, rows };
    return d.matrix;
  }

  // The balance half of the tool: what `node tools/balance.js` prints, computed in the page so the
  // curve can be looked at without leaving the game. Every level is walked over `dev.balanceSeeds`
  // seeds and reduced to the same three numbers the report uses — the threat of each room averaged,
  // the level's total, and the worst ORDINARY room, which is the one that says how hard a level
  // really is (a Great Hall is a set piece, not a baseline). Every rule in `js/rules.js` is run on
  // every seed on the way past, so the page fails the same way the report does.
  // It is cached on `dev.balance` because it is a few dozen level generations and the page is still.
  balanceReport() {
    const seeds = this.dev.balanceSeeds;
    if (this.dev.balance && this.dev.balance.seeds === seeds && this.dev.balance.seed === this.dev.sampleSeed) return this.dev.balance;
    const ordinary = new Set(['canon', 'mix', 'trap']);
    const fails = [], seen = new Set();
    const levels = LEVELS.map((def, li) => {
      const runs = [];
      for (let s = 1; s <= seeds; s++) {
        const L = generateLevel(def, s * 7717);
        runs.push(roomsOf(L));
        for (const r of checkRules(L)) {
          if (r.ok !== false || r.rule.id === 'rises') continue;
          const msg = `${def.name}: ${r.rule.id} — ${r.why}`;
          if (!seen.has(msg)) { seen.add(msg); fails.push(msg); }
        }
      }
      const width = Math.max(...runs.map((r) => r.length));
      const rooms = [];
      for (let i = 0; i < width; i++) {
        const cells = runs.map((r) => r[i]).filter(Boolean);
        rooms.push({ index: i, role: cells[0].role,
          threat: cells.reduce((a, c) => a + c.threat, 0) / cells.length,
          men: cells.reduce((a, c) => a + c.men.length, 0) / cells.length });
      }
      const plain = rooms.filter((c) => ordinary.has(c.role));
      // The numbers are averaged over the seeds; the geometry is one sample, the same one the level
      // page and the room sheet use, so a bar on the curve is a room you can open and walk through.
      const sample = roomsOf(this.levelSample(li));
      rooms.forEach((r, i) => { r.sample = sample[i] || null; });
      return { def, li, rooms, sample,
        total: rooms.reduce((a, c) => a + c.threat, 0),
        peak: Math.max(0, ...rooms.map((c) => c.threat)),
        plainPeak: Math.max(0, ...plain.map((c) => c.threat)) };
    });
    // The two rules a single level cannot be held to on its own, which is why the report exists.
    for (let i = 1; i < levels.length; i++) {
      const a = levels[i - 1], b = levels[i];
      if (b.total <= a.total) fails.push(`${b.def.name} (${b.total.toFixed(0)}) is not harder than ${a.def.name} (${a.total.toFixed(0)})`);
      if (b.plainPeak < a.plainPeak) fails.push(`${b.def.name}'s worst ordinary room is easier than ${a.def.name}'s`);
    }
    this.dev.balance = { seeds, seed: this.dev.sampleSeed, levels, fails,
      max: Math.max(...levels.map((l) => l.total)) };
    return this.dev.balance;
  }

  layoutTouch() { this.touch.layout(this.renderer.w, this.renderer.h, this.renderer.s, this.renderer.vh); }

  // ---------- input ----------
  canvasPos(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * this.canvas.width / r.width, y: (e.clientY - r.top) * this.canvas.height / r.height };
  }

  bindInput() {
    const c = this.canvas;
    const wake = () => { this.audio.init(); this.audio.resume(); };

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      // The RULES page has no keys: Backspace under it would regenerate the level it is describing.
      if (this.dev.rules) { e.preventDefault(); return; }
      // anyPressed skips the opening scene; muting should not
      this.keys.add(e.code); if (e.code !== 'KeyM') this.input.anyPressed = true; this.touch.active = false;
      if (e.code === 'Space') { this.input.spacePressed = true; e.preventDefault(); }
      if (e.code === 'Backspace') { e.preventDefault(); this.restartLevel(); }
      // Escape always reaches the menu, whatever is happening on the floor — a run in progress
      // simply drops back to the title the way closing the tab and coming back would.
      if (e.code === 'Escape' && this.state !== 'title' && !this.dev.rules) { e.preventDefault(); this.showTitle(); }
      if (e.code === 'KeyM') this.audio.toggleMute();
      if (e.code === 'KeyN' && this.state === 'play') this.levelCleared();
      if (e.code === 'KeyE') this.input.rollPressed = true;
      if (this.state === 'boon') { if (e.code === 'Digit1') this.takeBoon(0); if (e.code === 'Digit2') this.takeBoon(1); if (e.code === 'Digit3') this.takeBoon(2); }
      if (this.state === 'title') this.menuKey(e.code);
      wake();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    c.addEventListener('pointerdown', (e) => {
      wake(); e.preventDefault();
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      const p = this.canvasPos(e);
      if (this.hitDev(p)) return;
      if (this.state === 'title') {
        this.touch.active = e.pointerType !== 'mouse'; this.input.mouse = p;
        const i = this.menuAt(p); if (i >= 0) this.menuPick(i);
        return;
      }
      if (this.state === 'boon') {
        if (e.pointerType !== 'mouse') this.touch.active = true;
        this.boonDown = this.boonArm > 0 ? -1 : this.boonAt(p);
        return;
      }
      if (e.pointerType === 'mouse') {
        this.touch.active = false; this.input.anyPressed = true; this.input.mouse = p;
        if (e.button === 0) this.input.lmbPressed = true;
        if (e.button === 2) this.input.rmbDown = true;
        return;
      }
      this.touch.active = true; this.input.anyPressed = true;
      if (this.state !== 'play') { this.input.lmbPressed = true; return; }
      this.touch.down(e.pointerId, p.x, p.y, this);
    }, { passive: false });

    c.addEventListener('pointermove', (e) => {
      const p = this.canvasPos(e);
      if (e.pointerType === 'mouse') { this.input.mouse = p; if (this.touch.active && this.coarse === false) this.touch.active = false; return; }
      e.preventDefault(); this.touch.move(e.pointerId, p.x, p.y);
    }, { passive: false });

    const up = (e) => {
      if (e.pointerType === 'mouse' && e.button === 2) this.input.rmbDown = false;
      // A card is taken here and nowhere else: the pointer has to leave the same card it arrived on.
      if (this.state === 'boon') {
        const i = this.boonDown; this.boonDown = -1;
        if (i >= 0 && this.boonAt(this.canvasPos(e)) === i) this.takeBoon(i);
        return;
      }
      if (e.pointerType === 'mouse') return;
      this.touch.up(e.pointerId);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    window.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse' && e.button === 2) this.input.rmbDown = false; this.boonDown = -1; });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => { this.keys.clear(); this.input.rmbDown = false; this.touch.clear(); });
    window.addEventListener('resize', () => { this.renderer.resize(); this.layoutTouch(); });
    window.addEventListener('orientationchange', () => setTimeout(() => { this.renderer.resize(); this.layoutTouch(); }, 200));
  }

  readMoveInput() {
    const k = this.keys;
    let mx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let my = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
    const touching = this.touch.active;
    if (touching) { const mv = this.touch.moveVector(); if (mv.x || mv.y) { mx = mv.x; my = mv.y; } }
    const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
    this.input.mx = mx; this.input.my = my;
    if (!this.goat) return;

    if (touching) {
      // Thumb aiming: a manual drag wins, otherwise aim where you run, with a snap onto nearby men.
      const manual = this.touch.aimVector();
      if (manual) { this.touchAim = manual; this.input.aim = manual; }
      else {
        if (mx || my) { const d = Math.hypot(mx, my); this.touchAim = { x: mx / d, y: my / d }; }
        this.input.aim = autoAim(this, this.touchAim.x, this.touchAim.y);
      }
      if (this.touch.consumeButt()) this.input.lmbPressed = true;
      if (this.touch.consumeScream()) this.input.spacePressed = true;
      if (this.touch.consumeRoll()) this.input.rollPressed = true;
      this.input.rmbDown = this.touch.grabDown;
      return;
    }
    // Undo the tilt when turning the cursor back into a world point.
    const wx = this.cam.x + (this.input.mouse.x - this.renderer.vcx) / this.cam.zoom;
    const wy = this.cam.y + (this.input.mouse.y - this.renderer.vcy) / (this.cam.zoom * TILT);
    const dx = wx - this.goat.x, dy = wy - this.goat.y, d = Math.hypot(dx, dy);
    if (d > 4) this.input.aim = { x: dx / d, y: dy / d };
  }
  clearEdges() { this.input.lmbPressed = false; this.input.spacePressed = false; this.input.rollPressed = false; this.input.anyPressed = false; }

  // ---------- levels ----------
  // `withIntro` plays the opening scene in the pen instead of the level card. Only a run started
  // from the title gets it; a death drops you straight back in.
  startLevel(index, seed, keepBoons, withIntro) {
    if (!keepBoons) { this.boons = []; this.lastBoonActive = false; }
    this.levelIndex = index;
    const def = LEVELS[index];
    this.level = generateLevel(def, seed >>> 0);
    this.world = new World(this.level);
    this.goat = new Goat(this.level.start.x, this.level.start.y);
    this.enemies = this.level.spawns.map((s) => {
      const e = new Enemy(s.x, s.y, s.kind);
      // Which room he was put in. Nothing but a sealed arena reads this — it is how `updateSeals`
      // knows the fight behind a pair of doors is actually over.
      e.room = s.roomIndex === undefined ? -1 : s.roomIndex;
      if (s.elite) { e.elite = true; e.hp = TUNING.elite.hp; e.maxHp = e.hp; }
      // The brute: three killing blows, four if he is the one standing in the arena. Bigger frame,
      // spiked shoulders, a spiked mask and a studded club, so you never mistake him for a clubman.
      if (s.champion) { e.elite = true; e.champion = true; e.hp = s.boss ? TUNING.champion.bossHp : TUNING.champion.hp; e.maxHp = e.hp; }
      // A rifle posted to watch a door has no blind side worth walking round.
      if (s.alert) e.watchful = true;
      // The first man of a run holds his ground: he turns, he swings, he never walks. You get to
      // choose when the first fight of your life starts, which is the only way it teaches anything.
      if (s.sentry) { e.sentry = true; e.facing = s.facing || 0; }
      if (s.boss) e.boss = true;
      return e;
    });
    this.props = this.level.props.map((p) => new Prop(p.x, p.y, p.kind, p));
    // The ritual altar: real furniture rather than scenery, so it blocks the way and takes a blow
    // like any other table. Its position matches where the decal layer has always drawn it.
    if (this.level.def === LEVELS[0]) {
      const S = this.level.start;
      this.props.push(new Prop(S.x - 4 * TILE, S.y - 0.2 * TILE, 'table', { altar: true }));
    }
    this.hazards = this.props.filter((p) => p.kind === 'brazier' || p.kind === 'mill' || p.kind === 'spike');
    this.sightBlockers = this.props.filter((p) => p.kind === 'door' || p.kind === 'bell' || p.kind === 'mill' || p.kind === 'secret');
    // Sealed arenas: which pair of doors belongs to which room, whether they have slammed behind him
    // yet, and whether that room has already been paid for. `updateSeals` runs all three beats. The
    // doors stand OPEN until he is inside — a seal is a door that shuts behind you, and one that
    // starts shut is a wall, since nothing on either side of it may smash or shoulder one.
    this.sealedRooms = (this.level.sealedArenas || []).map((at) => {
      const doors = this.props.filter((p) => p.seal && p.sealRoom === at);
      for (const d of doors) d.open = 1;
      // `held` is filled at the moment the doors slam: who is shut in, which is what the seal waits
      // on from then on. Null until then, when the spawn list is the best answer there is.
      return { room: at, doors, armed: false, open: false, held: null };
    });
    this.runes = []; this.houndTold = false; this.henTold = false;
    this.bullets = []; this.parts = []; this.floats = []; this.rings = []; this.hurt = null; this.fallers = [];
    this.souls = []; this.boonChoice = null; this.breathFx = null; this.applyBoons(); this.goat.hp = this.goat.maxHp;
    // What he walked in with. A death rolls him back to exactly this list.
    this.levelBoons = this.boons.slice();
    this.cam.x = this.goat.x; this.cam.y = this.goat.y; this.cam.zoom = this.renderer.zoomFit;
    this.camLead.x = 0; this.camLead.y = 0; this.camFollow = null;
    this.kills = 0; this.timer = 0; this.timeScale = 1; this.slowTimer = 0;
    this.kickX = 0; this.kickY = 0; this.zoomKick = 0; this.flashAmt = 0;
    this.combo = 0; this.comboTimer = 0; this.barkCd = 0; this.cageOpen = false; this.cageLunge = -1;
    this.cageThought = 0;   // a beat of "her" over his head the moment the pen gives, comic-panel style
    this.toldGrab = false;
    this.audio.intensity = 0; this.audio.hunterAware = false;
    this.world.computeFlow(this.goat.x, this.goat.y);
    this.world.computeVis(this.goat.x, this.goat.y, TUNING.fog.radius, this.mods.oracle);
    // The level's souls, handed out before a blow is struck. `def.souls` is the whole count (see the
    // note over `LEVELS`): the vault takes the first, the rest go to the LAST bosses of the level so
    // the fight you finish on always pays, and any boss left over drops milk instead. A level
    // definition with no count falls back to what the game used to do — every boss, and the vault.
    // The vault's is laid down with the level rather than dropped by anything, so it is there from
    // the first second and it is there whether or not you go and get it. After the flow field and
    // not before: `dropSoul` asks the world whether a spot can be reached, and asked that question
    // with the last level's field still in it, it walks the soul out of the vault and puts it at
    // the goat's feet — which is why the vault's uses `placeSoul` and nothing else does.
    const bosses = this.level.spawns
      .map((s, i) => ({ i, room: s.roomIndex === undefined ? 0 : s.roomIndex }))
      .filter((b) => this.level.spawns[b.i].boss)
      .sort((a, b) => a.room - b.room);
    this.soulsHere = def.souls === undefined ? bosses.length + (this.level.vault ? 1 : 0) : def.souls;
    let budget = this.soulsHere;
    // The gated arena is paid first: the door out of that room does not open until its soul is
    // swallowed, so the one boss in the game who MUST be carrying one is the one standing behind it.
    this.soulGate = null;
    const gated = this.level.soulGate ? bosses.find((b) => b.room === this.level.soulGate.room) : null;
    if (gated && budget > 0) { this.enemies[gated.i].soul = true; budget--; }
    if (this.level.vault && budget > 0) { this.placeSoul(this.level.vault.x, this.level.vault.y); budget--; }
    for (let n = bosses.length - 1; n >= 0 && budget > 0; n--) {
      const e = this.enemies[bosses[n].i];
      if (!e.soul) { e.soul = true; budget--; }
    }
    // The gate itself: the prop, and the room it shuts. Nothing else in the game is opened by
    // anything but a blow, so it is held here rather than inferred from the level every frame.
    if (this.level.soulGate) {
      const g = this.level.soulGate;
      this.soulGate = { room: g.room, prop: this.props.find((p) => p.gate) || null };
    }
    // Arriving up the stairs: the goat rises into the room under the card.
    if (this.intro) this.audio.duck(1, 0.3);   // Backspace out of the scene must not leave the sound down
    this.intro = null; this.stairFx = this.level.entry ? { t: -0.45, dir: -1 } : null;
    // Every level starts by writing the run down: that head is what CONTINUE comes back to.
    this.saveRun();
    if (withIntro && def.ritual && def.startCage) { this.beginIntro(); return; }
    this.state = 'card';
    // A new level puts every heart back. The card is where the goat finds that out.
    const lines = [def.sub.toUpperCase(), def.name];
    // Hearts back, and what the level is holding. The count is on the card because a progression
    // nobody can see is not one: you should walk in knowing what there is to walk out with.
    const tail = [];
    if (index > 0 || keepBoons) tail.push(this.goat.maxHp + ' hearts again');
    if (this.soulsHere) tail.push(this.soulsHere === 1 ? '1 soul in here' : this.soulsHere + ' souls in here');
    if (tail.length) lines.push('', tail.join(' \u00b7 '));
    this.card = { lines, dim: 0.6, size: 40, small: 2 }; this.stateTimer = 1.3;
    this.audio.sfxCard();
  }
  // A death costs the level, not the learning. You come back with everything you walked in carrying
  // and nothing less: the goat gets stronger every level and stays stronger, which is the only way
  // seven levels of one life read as a run rather than seven separate walls. What a death still
  // takes is the soul you found INSIDE the level — the room is generated again and it is back where
  // it was, guarded by whoever was guarding it — so dying is never a way to farm one.
  restartLevel() {
    if (this.state === 'title') return;
    this.boons = (this.levelBoons || []).slice();
    this.startLevel(this.levelIndex, (Math.random() * 1e9) | 0, true);
  }

  // ---------- the first screen ----------
  // Two buttons and the name of the game. Nothing is explained here: the opening scene carries the
  // story and the floor of level 1 carries the controls, so the menu only has to be a way in.
  showTitle() {
    this.state = 'title'; this.card = null; this.level = null; this.world = null; this.goat = null;
    this.enemies = []; this.props = []; this.bullets = []; this.souls = []; this.sightBlockers = []; this.fallers = [];
    this.save = this.loadRun();
    this.best = this.loadBest();
    // A run waiting to be picked up is the likelier intent, so the keyboard starts on it.
    // `panel` is whatever is laid over the menu — the record sheet, or the two switches. The board
    // is put away by anything at all; the switches are not, because a click on one is meant to
    // throw it rather than to leave.
    this.menu = { index: this.save ? 1 : 0, rects: [], t: 0, shake: 0, panel: null, sub: 0 };
  }
  updateTitle(dt) {
    this.menu.t += dt; this.menu.shake = Math.max(0, this.menu.shake - dt);
    // The mouse chooses what it is over; the keyboard chooses what it was left on. While a panel is
    // up its rows are what `menu.rects` holds, so the hover lands on `sub` rather than on the menu
    // behind it — otherwise reading the settings would silently move what NEW GAME is.
    if (!this.touch.active) {
      const i = this.menuAt(this.input.mouse);
      if (i >= 0) {
        if (this.menu.panel === 'settings' || this.menu.panel === 'levels') this.menu.sub = i;
        else if (!this.menu.panel) this.menu.index = i;
      }
    }
  }
  menuAt(p) {
    const r = this.menu.rects;
    for (let i = 0; i < r.length; i++) if (p.x >= r[i].x && p.x <= r[i].x + r[i].w && p.y >= r[i].y && p.y <= r[i].y + r[i].h) return i;
    return -1;
  }
  // The menu answers the keys the game already uses: run up and down it, headbutt to choose.
  menuKey(code) {
    const m = this.menu;
    if (m.panel === 'best') { m.panel = null; this.audio.sfxSwing(); return; }
    if (m.panel === 'settings' || m.panel === 'levels') {
      // the rows of whatever is up, and the way out at the bottom of them
      const n = (m.panel === 'settings' ? SETTINGS.length : LEVELS.length) + 1;
      if (code === 'KeyW' || code === 'ArrowUp') { m.sub = (m.sub + n - 1) % n; this.audio.sfxSwing(); }
      else if (code === 'KeyS' || code === 'ArrowDown') { m.sub = (m.sub + 1) % n; this.audio.sfxSwing(); }
      else if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter') this.menuPick(m.sub);
      else { m.panel = null; this.audio.sfxSwing(); }
      return;
    }
    const n = MENU.length;
    if (code === 'KeyW' || code === 'ArrowUp') { m.index = (m.index + n - 1) % n; this.audio.sfxSwing(); }
    else if (code === 'KeyS' || code === 'ArrowDown') { m.index = (m.index + 1) % n; this.audio.sfxSwing(); }
    else if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter') this.menuPick(m.index);
  }
  menuPick(i) {
    const m = this.menu;
    // While the board is up it is the only thing the menu does, and anything closes it.
    if (m.panel === 'best') { m.panel = null; this.audio.sfxSwing(); return; }
    // The switches stay up while they are being thrown. Only the last row leaves.
    if (m.panel === 'settings') {
      m.sub = i;
      if (i >= SETTINGS.length) { m.panel = null; this.audio.sfxCard(); return; }
      this.toggleSetting(SETTINGS[i].key);
      return;
    }
    // The level sheet. A row is a floor of the game; the last row is the way back.
    if (m.panel === 'levels') {
      m.sub = i;
      if (i >= LEVELS.length) { m.panel = null; this.audio.sfxCard(); return; }
      this.audio.sfxCard(); this.startAtLevel(i);
      return;
    }
    m.index = i;
    const id = MENU[i] || 'new';
    // Nothing to come back to: the button shakes its head and stays where it is.
    if (id === 'continue' && !this.save) { m.shake = 0.35; this.audio.sfxThud(); return; }
    this.audio.sfxCard();
    if (id === 'levels') { m.panel = 'levels'; m.sub = 0; return; }
    if (id === 'best') { m.panel = 'best'; return; }
    if (id === 'settings') { m.panel = 'settings'; m.sub = 0; return; }
    if (id === 'continue') { this.resumeRun(); return; }
    this.clearRun(); this.boons = []; this.lastBoonActive = false; this.totalKills = 0; this.deaths = 0; this.totalScore = 0;
    this.startLevel(0, (Math.random() * 1e9) | 0, false, true);
  }
  // Straight onto one floor of the game. A run that starts on level five with the goat it had out of
  // the pen is not that level, it is a different and much worse game, so the souls the run would
  // have banked on the way are dealt out here — at random, because the point of the row is to put
  // you on that floor and not to reproduce somebody's build. Level one is the ordinary opening,
  // scene and all. Nothing about it touches the saved run or the board.
  startAtLevel(li) {
    this.clearRun();
    this.boons = []; this.lastBoonActive = false; this.totalKills = 0; this.deaths = 0; this.totalScore = 0;
    let budget = 0;
    for (let i = 0; i < li; i++) budget += LEVELS[i].souls || 0;
    for (let n = 0; n < budget; n++) {
      this.applyBoons();
      const open = BOONS.filter((b) => !this.boons.includes(b) && (!b.needs || this.mods[b.needs]));
      if (!open.length) break;
      this.boons.push(open[(Math.random() * open.length) | 0]);
    }
    this.applyBoons();
    this.startLevel(li, (Math.random() * 1e9) | 0, true, li === 0);
  }
  // CONTINUE is the head of the furthest level the run reached, with the souls it was carrying there.
  resumeRun() {
    const s = this.save; if (!s) return;
    this.boons = (s.boons || []).map((id) => BOONS.find((b) => b.id === id)).filter(Boolean);
    this.totalKills = s.totalKills || 0; this.deaths = s.deaths || 0; this.totalScore = s.score || 0;
    this.startLevel(clamp(s.level | 0, 0, LEVELS.length - 1), (Math.random() * 1e9) | 0, true);
  }
  // Time first, bodies second. Pace against the level's par is the whole of a score and kills only
  // multiply it, so running is never the wrong answer and the best run is a fast one with bodies in
  // it rather than a slow one that cleared every room. Par is the level's rooms times `perRoom`.
  scoreFor(kills, time, levelIndex) {
    const S = TUNING.score, def = LEVELS[levelIndex] || LEVELS[0];
    const pace = clamp((def.rooms * S.perRoom) / Math.max(time, 1), 0, S.fastCap);
    return Math.round(S.timePoints * pace * Math.min(1 + kills * S.killMul, S.killCap));
  }
  loadBest() {
    try {
      const b = JSON.parse(localStorage.getItem(BEST_KEY) || 'null');
      if (b && b.v === 1 && b.levels) return b;
    } catch (err) { /* storage refused: the board is empty and stays empty */ }
    return { v: 1, levels: {}, run: 0 };
  }
  // What a cleared level is worth, written down. A record outlives the run that set it.
  noteBest(index, score, time) {
    const b = this.best || (this.best = this.loadBest());
    const cur = b.levels[index];
    const better = !cur || score > cur.score;
    b.levels[index] = { score: Math.max(score, cur ? cur.score : 0), time: cur ? Math.min(time, cur.time) : time };
    try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (err) { /* nothing to be done */ }
    return better;
  }
  noteRunBest(total) {
    const b = this.best || (this.best = this.loadBest());
    if (total <= (b.run || 0)) return false;
    b.run = total;
    try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (err) { /* nothing to be done */ }
    return true;
  }
  // The run in localStorage, best-effort: a browser that refuses storage simply never offers CONTINUE.
  loadRun() {
    try {
      const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || s.v !== 1 || !(s.level >= 0) || s.level >= LEVELS.length) return null;
      return s;
    } catch (err) { return null; }
  }
  saveRun() {
    this.save = { v: 1, level: this.levelIndex, boons: this.boons.map((b) => b.id), totalKills: this.totalKills,
      deaths: this.deaths, score: this.totalScore, at: Date.now() };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch (err) { /* private mode: the run dies with the tab */ }
  }
  clearRun() {
    this.save = null;
    try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* nothing to be done about it */ }
  }
  // The page's control line belongs to the game, not to the menu.
  onGoatDied() {
    this.deaths++; this.state = 'dead'; this.stateTimer = 0.9; this.slowTimer = 1.4;
    this.audio.intensity = 0; this.audio.hunterAware = false; this.audio.sfxToll();
    // What a death does NOT take is named, because a card that says you keep everything is the only
    // way the player finds out that he does. Anything found inside this level goes back in the room.
    const held = this.levelBoons || [];
    const kept = held.length ? `${held.length} SOUL${held.length > 1 ? 'S' : ''} KEPT` : 'NOTHING LOST';
    this.card = { lines: ['THE GOAT DIED', '', `${kept} · ${this.tapWord.toLowerCase()} to try again`], dim: 0.55, size: 40, small: true, color: PALETTE.blood };
    this.shake(12); this.vibe(70);
  }
  levelCleared() {
    this.state = 'clear'; this.totalKills += this.kills;
    const score = this.scoreFor(this.kills, this.timer, this.levelIndex);
    this.totalScore += score;
    const best = this.noteBest(this.levelIndex, score, this.timer);
    this.audio.intensity = 0; this.audio.hunterAware = false; this.audio.sfxCard();
    this.cardQueue = [
      { lines: ['Do you want sacrifices?'], dim: 0.75, size: 34, time: 1.4 },
      { lines: ['You will get sacrifices!'], dim: 0.85, size: 40, time: 1.6, color: PALETTE.blood },
      // The level's own score: what the time was worth and what the bodies did to it.
      { lines: [`SCORE ${score}`, '', `${this.kills} sacrificed in ${this.timer.toFixed(1)}s`,
        best ? 'A NEW BEST' : `run so far ${this.totalScore}`],
        dim: 0.9, size: 34, small: 2, time: 1.9, color: best ? PALETTE.fireHi : null },
    ];
    this.nextCard();
  }
  nextCard() {
    const c = this.cardQueue.shift();
    if (c) { this.card = c; this.stateTimer = c.time; if (c.color) this.audio.sfxCard(); return; }
    if (this.levelIndex + 1 < LEVELS.length) this.startLevel(this.levelIndex + 1, (Math.random() * 1e9) | 0, true);
    else {
      this.state = 'win'; this.clearRun();
      const runBest = this.noteRunBest(this.totalScore);
      this.card = { lines: ['THE GOAT ESCAPED.', `SCORE ${this.totalScore}`,
        `${this.totalKills} sacrificed · ${this.deaths} death${this.deaths === 1 ? '' : 's'}`,
        runBest ? 'THE BEST RUN YET' : `best run ${this.best.run}`,
        `${this.tapWord.toLowerCase()} to run again`], dim: 1, size: 40, small: 2 };
    }
  }

  // ---------- the opening scene ----------
  // The goat and his wife in the pen, the two who come for her, and the club. It runs in the real
  // first room with the real pen; the two men are ordinary Bearers moved by hand, she and the heart
  // belong to `this.intro` alone. Nothing here touches the simulation: when the light comes back the
  // goat is lying where he fell, the gate is up, and the level is exactly the one you would have got.
  beginIntro() {
    const I = TUNING.intro, lv = this.level, S = lv.start, room = lv.rooms[0];
    const hw = TUNING.prop.cage.halfW * TILE;
    // the corridor leaves through the right wall: the first open tile in it is where they come from
    const col = room.x + room.w - 1; let doorTy = room.y + (room.h >> 1);
    for (let ty = room.y + 1; ty < room.y + room.h - 1; ty++) if (lv.tiles[ty * lv.W + col] !== T.WALL) { doorTy = ty; break; }
    const door = { x: (col + 1.5) * TILE, y: (doorTy + 1) * TILE };
    const man = (x, y, knife) => {
      const e = new Enemy(x, y, 'bearer'); e.scripted = true; e.knife = knife; e.aware = true; e.state = 'chase'; e.facing = Math.PI;
      this.enemies.push(e); return e;
    };
    const g = this.goat;
    g.x = S.x - 24; g.y = S.y + 4; g.facing = 0; g.vx = 0; g.vy = 0; g.state = 'idle';
    this.intro = {
      t: 0, phase: 'huddle', timer: 0, fade: 0, starsA: 0, echo: 0, cardA: 0, bleat: 0.7, turn: 0, S, hw, door,
      sheep: { x: S.x + 24, y: S.y + 4, facing: Math.PI, held: null, kick: 0, gone: false, bleating: 0, jitter: null, vx: 0, vy: 0 },
      heart: { x: S.x, y: S.y - 26, pulse: 1, broken: 0 },
      knife: man(door.x + TILE, door.y, true), club: man(door.x + 2.4 * TILE, door.y + 10, false),
      gate: this.props.filter((p) => p.kind === 'cage' && !p.deco && p.axis === 'v' && p.x > S.x),
      // where they stand at the gate, the corner they round to keep clear of the other cage, the way
      // round the goat to her, and where they take hold of her
      stand: { x: S.x + hw + 26, y: S.y + 6 }, stand2: { x: S.x + hw + 58, y: S.y + 26 }, bend: { x: S.x + hw + 90, y: S.y + 24 },
      way: [{ x: S.x + 30, y: S.y - 30 }, { x: S.x - 8, y: S.y - 36 }], grabAt: { x: S.x - 26, y: S.y - 16 },
      hit: false,
    };
    this.cam.x = S.x + 12; this.cam.y = S.y; this.cam.zoom = this.renderer.zoomFit * I.zoom;
    this.state = 'intro'; this.card = null;
    // The three screens before the pen. They have their own clock, so `it.t` — which paces the
    // camera creep and the skip prompt once the pen is on screen — does not start until the pen
    // is. The two of them are lightweight stand-ins for the sprites: the renderer draws them with
    // the same `drawGoat` / `drawSheep` the pen uses, so they are the same animals.
    const actor = (x, y, facing) => ({ x, y, facing, vx: 0, vy: 0, state: 'idle', trail: [], jitter: null,
      dazed: 0, invuln: 0, hp: 4, maxHp: 4, onFire: false, witchFire: false, timer: 0, rollSpin: 0, kick: 0, bleating: 0 });
    this.intro.pro = { t: 0, sceneT: 0, bleat: 1.2, turn: 0, engine: 0, goat: actor(-40, 10, 0), ewe: actor(40, -6, Math.PI) };
    this.introPhase('meadow');
  }

  // Which phases are the prologue: the pen's own clock and camera stay frozen through them.
  inPrologue() { const p = this.intro && this.intro.phase; return p === 'meadow' || p === 'road' || p === 'dark' || p === 'cloth'; }

  // Moves anything with a `path` of points along it at `speed`; true once the path is used up.
  followPath(e, speed, dt) {
    if (!e.path || !e.path.length) { e.vx = 0; e.vy = 0; return true; }
    const t = e.path[0], dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy), step = speed * dt;
    if (d <= step) { e.x = t.x; e.y = t.y; e.path.shift(); if (!e.path.length) { e.vx = 0; e.vy = 0; return true; } return false; }
    e.x += dx / d * step; e.y += dy / d * step; e.facing = Math.atan2(dy, dx); e.vx = dx / d * speed; e.vy = dy / d * speed;
    return false;
  }
  // A scripted line, outside the crowd rules that `bark` enforces.
  say(e, text) { e.say = { text, life: 2.2, max: 2.2 }; }

  introPhase(name) {
    const it = this.intro, I = TUNING.intro; it.phase = name; it.timer = 0;
    if (name === 'approach') { it.knife.path = [it.bend, it.stand]; it.club.path = [{ x: it.bend.x, y: it.bend.y + 8 }, it.stand2]; }
    else if (name === 'grab') it.knife.path = [it.way[0], it.way[1], it.grabAt];
    else if (name === 'fade') this.audio.duck(I.duck, I.fade);
    else if (name === 'wake') this.audio.duck(1, I.wake * 0.8);
    if (it.pro) it.pro.sceneT = 0;
  }

  // ---------- the prologue: a meadow, a truck, the dark, and the sacking coming off ----------
  // Three screens with nothing in them but the two of them and the sound they make. What changes
  // from one to the next is how often they call and how frightened it sounds, and that is the
  // whole of the storytelling: the pen scene that follows is the same two animals a minute later.
  updatePrologue(dt) {
    const I = TUNING.intro, P = I.prologue, it = this.intro, pr = it.pro, ph = it.phase;
    pr.t += dt; pr.sceneT += dt;
    const gt = pr.goat, ew = pr.ewe;
    if (ph === 'meadow') {
      // Two halves. First each of them has an end of the field and a loop of his own; then, over
      // `close` seconds, the two loops become one loop with the ewe a little ahead on it and the
      // goat behind her, and the heart comes up between them. Nothing in this screen is in a hurry.
      const a = pr.sceneT * 0.6;
      const blend = clamp((pr.sceneT - P.meet) / P.close, 0, 1), e = blend * blend * (3 - 2 * blend);
      pr.met = blend >= 1;
      const at = (ox, oy, rx, ry, ang) => ({ x: ox + Math.cos(ang) * rx, y: oy + Math.sin(ang) * ry });
      const place = (o, apart, together) => {
        const nx = lerp(apart.x, together.x, e), ny = lerp(apart.y, together.y, e);
        o.vx = (nx - o.x) / dt; o.vy = (ny - o.y) / dt;
        if (Math.hypot(o.vx, o.vy) > 1) o.facing = Math.atan2(o.vy, o.vx);
        o.x = nx; o.y = ny; o.kick = Math.sin(pr.t * 14) * 3;
      };
      // his own end and hers, then the one loop they share
      place(gt, at(-112, 12, 34, 20, a), at(0, 4, 78, 32, a));
      place(ew, at(112, -8, 32, 18, -a + 1.5), at(0, 4, 78, 32, a + 0.85));
      // the heart, once they are near enough for one: the same heart the pen has
      if (blend > 0.35) {
        const b = (pr.t * 1.15) % 1, beat = (o) => Math.pow(Math.max(0, Math.sin(b * Math.PI * 2 - o)), 3);
        pr.heart = { x: (gt.x + ew.x) / 2, y: Math.min(gt.y, ew.y) - 30 + Math.sin(pr.t * 2) * 1.5,
          pulse: 1 + 0.16 * beat(0) + 0.1 * beat(1.3), broken: 0, a: clamp((blend - 0.35) / 0.4, 0, 1) };
      }
      if (pr.sceneT >= P.meadow) this.introPhase('road');
    } else if (ph === 'road') {
      // In the cage on the flatbed. The truck jolts and they jolt with it, and they are turned to
      // each other now rather than off on their own lines.
      const j = Math.sin(pr.t * 9.3) * P.bounce + Math.sin(pr.t * 23.7) * P.bounce * 0.35;
      pr.jolt = j;
      gt.x = -16; gt.y = 6 + j; gt.facing = 0.15; gt.vx = 0; gt.vy = 0; gt.kick = 0;
      ew.x = 18; ew.y = 2 + j * 0.8; ew.facing = Math.PI - 0.15; ew.vx = 0; ew.vy = 0; ew.kick = 0;
      gt.jitter = { x: Math.sin(pr.t * 37) * 0.4, y: j * 0.2 }; ew.jitter = { x: Math.cos(pr.t * 41) * 0.4, y: j * 0.2 };
      pr.engine -= dt;
      if (pr.engine <= 0) { pr.engine = 0.5; this.audio.sfxEngine(); }
      if (pr.sceneT >= P.road) this.introPhase('dark');
    } else if (ph === 'dark') {
      // Nothing to see. The bleats are all there is, and they are close together now.
      gt.jitter = null; ew.jitter = null;
      if (pr.sceneT >= P.dark) this.introPhase('cloth');
    } else if (ph === 'cloth') {
      // The pen, and the sacking coming off it. The pen's actors take over from here.
      if (pr.sceneT >= P.cloth) { it.pro = null; this.introPhase('huddle'); return; }
    }
    // The through-line. Softer and further apart in the field, closer and louder on the road, and
    // in the dark it is one animal answering the other with nothing between them.
    if (ph !== 'cloth') {
      const gap = P.bleat[ph], loud = ph === 'dark' ? 2 : ph === 'road' ? 1 : 0;
      pr.bleat -= dt;
      if (pr.bleat <= 0) {
        pr.turn ^= 1;
        // Apart, each calls on his own clock and nobody answers. Once they have met, a call gets
        // its answer `answer` seconds later, and then the pair of them wait — so what the ear hears
        // change across the screen is not the volume but that the second voice has started to
        // come back for the first.
        const answering = (pr.met || ph !== 'meadow') && pr.turn === 0;
        pr.bleat = answering ? P.answer : gap * (0.7 + Math.random() * 0.6);
        const word = pr.turn ? ['baah', 'b-baah', 'BAAH!'][loud] : ['beeh', 'b-beeh', 'BEEH!'][loud];
        const who = pr.turn ? gt : ew;
        pr.last = { who: pr.turn ? 'goat' : 'ewe', word, life: 1.2, x: who.x, y: who.y };
        if (pr.turn) this.audio.sfxBleat(300, [0.07, 0.1, 0.16][loud], [0.34, 0.3, 0.28][loud]);
        else { this.audio.sfxBleat(470, [0.06, 0.09, 0.14][loud], [0.3, 0.27, 0.25][loud]); ew.bleating = 0.3; }
      }
    }
    if (pr.last) { pr.last.life -= dt; if (pr.last.life <= 0) pr.last = null; }
    ew.bleating = Math.max(0, ew.bleating - dt);
  }

  // ---------- loop ----------
  frame(t) {
    const dtReal = Math.min(0.1, (t - this.last) / 1000); this.last = t;
    this.slowTimer = Math.max(0, this.slowTimer - dtReal);
    const wantSlow = this.slowTimer > 0 || this.state === 'dead';
    this.timeScale += ((wantSlow ? 0.32 : 1) - this.timeScale) * (1 - Math.exp(-7 * dtReal));
    this.acc += dtReal * this.timeScale;
    const step = 1 / 60;
    let n = 0;
    while (this.acc >= step && n < 5) { this.update(step); this.acc -= step; n++; }
    if (n === 5) this.acc = 0;
    this.renderer.configure(this.touch.active);
    this.layoutTouch();
    this.renderer.draw(this, dtReal);
    if (this.hurt) this.hurt.life -= dtReal;
  }

  update(dt) {
    // The RULES page holds everything where it is: a dev reading a table should not be clubbed.
    if (this.dev.rules) { this.clearEdges(); return; }
    this.readMoveInput();
    if (this.state === 'title') { this.updateTitle(dt); this.clearEdges(); return; }
    if (this.state === 'intro') { this.updateIntro(dt); this.clearEdges(); return; }
    if (this.state === 'climb') { this.updateClimb(dt); this.clearEdges(); return; }
    if (this.state === 'card') { this.stateTimer -= dt; this.updateEffects(dt); if (this.stateTimer <= 0) { this.card = null; this.state = 'play'; } }
    if (this.state === 'dead') { this.stateTimer -= dt; this.updateEffects(dt); if (this.stateTimer <= 0 && (this.input.lmbPressed || this.input.spacePressed)) this.restartLevel(); this.clearEdges(); return; }
    if (this.state === 'clear') { this.stateTimer -= dt; this.updateEffects(dt); if (this.stateTimer <= 0) this.nextCard(); this.clearEdges(); return; }
    if (this.state === 'boon') { this.boonArm = Math.max(0, this.boonArm - dt); this.updateEffects(dt); this.clearEdges(); return; }
    if (this.state === 'win') { if (this.input.lmbPressed) { this.totalKills = 0; this.deaths = 0; this.totalScore = 0; this.startLevel(0, (Math.random() * 1e9) | 0, false, true); } this.clearEdges(); return; }
    if (this.state !== 'play') { this.clearEdges(); return; }

    if (this.hitstopTimer > 0) { this.hitstopTimer -= dt; this.clearEdges(); return; }
    this.timer += dt;
    const w = this.world;
    w.flowTimer -= dt;
    if (w.flowTimer <= 0) { w.flowTimer = 0.15; w.computeFlow(this.goat.x, this.goat.y); }

    this.revealRooms();
    this.runes.length = 0;
    // A dead mage paints nothing: leaving his last rune in the list left a patch of floor the whole
    // room went on stepping round for the rest of the level.
    for (const e of this.enemies) if (e.rune && !e.dead) this.runes.push(e.rune);
    this.goat.update(dt, this);
    // The floor stopped under him. Everything else waits while he goes down it.
    if (this.goat.state === 'falling') { this.updateFall(dt); this.updateEffects(dt); this.updateCamera(dt); this.clearEdges(); return; }
    if (!this.goat.dead && w.isPitPx(this.goat.x, this.goat.y)) { this.goatFalls(); this.clearEdges(); return; }
    for (const e of this.enemies) e.update(dt, this);
    for (const b of this.bullets) b.update(dt, this);
    for (const p of this.props) p.update(dt, this);
    this.collideEntities(dt);
    this.updateSeals();
    w.updateFire(dt);
    w.noises.length = 0;
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.updateEffects(dt);

    for (const tm of this.souls) {
      tm.life += dt;
      if (this.goat.dead || tm.taken) continue;
      if (Math.hypot(tm.x - this.goat.x, tm.y - this.goat.y) < TUNING.soul.pickupR + this.goat.r) {
        tm.taken = true; this.particles(tm.x, tm.y, 18, PALETTE.witchHi, 180); this.ring(tm.x, tm.y, 3 * TILE, PALETTE.witch);
        this.openSoulGate();
        this.openBoonChoice(); this.clearEdges(); return;
      }
    }
    this.souls = this.souls.filter((tm) => !tm.taken);
    for (const p of this.props) {
      if (p.kind !== 'heal' || p.broken) continue;
      const H = TUNING.prop.heal;
      if (this.goat.dead) { p.graze = 0; continue; }
      const near = Math.hypot(p.x - this.goat.x, p.y - this.goat.y) <= H.pickupR + this.goat.r
        && Math.hypot(this.goat.vx, this.goat.vy) < H.grazeSpeed;
      if (this.goat.hp >= this.goat.maxHp) {
        p.graze = 0;
        // Standing in it with a full heart already used to do nothing at all, which reads as the
        // grass being broken rather than as the goat having nothing left to gain from it.
        if (near && !p.fullTold) { p.fullTold = true; this.floatText(p.x, p.y - 24, 'FULL', PALETTE.bone); }
        else if (!near) p.fullTold = false;
        continue;
      }
      p.fullTold = false;
      // Standing in it is the whole cost: running through does nothing, and stepping off — or simply
      // moving — bleeds the count back down rather than snapping it to zero, so a stray jostle from
      // a passing man does not cost the whole graze.
      p.graze = near ? p.graze + dt : Math.max(0, p.graze - dt * 2);
      if (p.graze < H.grazeTime) continue;
      p.broken = true; p.dead = true; this.goat.hp += 1;
      this.particles(p.x, p.y, 18, PALETTE.bone, 170); this.ring(p.x, p.y, 2 * TILE, PALETTE.bone);
      this.floatText(p.x, p.y - 24, '+1 HEART', PALETTE.bone); this.audio.sfxBell(); this.vibe(20);
    }
    if (!this.goat.dead && w.tileAtPx(this.goat.x, this.goat.y) === T.EXIT) { this.beginClimb(); this.clearEdges(); return; }

    this.updateCamera(dt);

    // music intensity from threat
    let aware = 0, hunter = false;
    for (const e of this.enemies) {
      if (e.dead || !e.aware || e.state === 'idle' || e.ghosted) continue;
      if (Math.hypot(e.x - this.goat.x, e.y - this.goat.y) > 16 * TILE) continue;
      aware++; if (e.kind === 'hunter') hunter = true;
    }
    // What it takes to make the drums climb. It used to be five men for the whole kit, which is an
    // ordinary room from level three on, so the loudest music in the game played through most of it
    // and a real crowd had nothing left to sound like. `crowd` is where the two steps are now.
    const C = TUNING.audio.crowd;
    this.audio.intensity = aware === 0 ? 0 : aware <= C.warm ? 1 : aware <= C.hot ? 2 : 3;
    this.audio.hunterAware = hunter;
    this.clearEdges();
  }

  // ---------- the opening scene, beat by beat ----------
  updateIntro(dt) {
    const I = TUNING.intro, it = this.intro, g = this.goat, s = it.sheep, S = it.S, ph = it.phase;
    if (this.hitstopTimer > 0) { this.hitstopTimer -= dt; return; }
    // The three screens before the pen run on their own clock, and nothing of the pen's — the
    // camera creep, the tremble, the heart — starts until they are done.
    if (this.inPrologue()) {
      if (this.introSeen && this.input.anyPressed && it.pro.t > I.skipAfter) { this.skipIntro(); return; }
      this.updatePrologue(dt);
      if (this.intro) this.updateEffects(dt);
      return;
    }
    it.t += dt; it.timer += dt;
    if (this.introSeen && this.input.anyPressed && it.t > I.skipAfter && ph !== 'black' && ph !== 'wake') { this.skipIntro(); return; }

    // the camera creeps in the whole time they are in the room
    const push = clamp(it.t / I.push, 0, 1);
    this.cam.zoom = this.renderer.zoomFit * lerp(I.zoom, I.zoomPush, push * push);
    this.cam.x = S.x + 12; this.cam.y = S.y;

    // fear: a tremble on both of them that grows as the men come, and the bleats that go with it
    const fear = ph === 'huddle' ? I.shiver : (ph === 'approach' || ph === 'gate' || ph === 'grab') ? I.fear : 0;
    const tremble = (seed) => fear ? { x: (Math.sin(it.t * 37 + seed) * 0.6 + Math.sin(it.t * 53 + seed * 2) * 0.4) * fear, y: Math.cos(it.t * 41 + seed) * fear * 0.35 } : null;
    g.jitter = g.state === 'ko' ? null : tremble(0);
    s.jitter = s.held ? null : tremble(3);
    s.bleating = Math.max(0, s.bleating - dt);
    if (fear && !s.held) {
      it.bleat -= dt;
      if (it.bleat <= 0) {
        it.bleat = I.bleatEvery * (fear > 1 ? 0.55 : 1) * (0.7 + Math.random() * 0.6);
        it.turn ^= 1;
        if (it.turn) { this.floatText(g.x, g.y - 30, fear > 1 ? 'BAAH!' : 'b-baah', PALETTE.bone); this.audio.sfxBleat(300, fear > 1 ? 0.16 : 0.09, 0.3); }
        else { this.floatText(s.x, s.y - 30, fear > 1 ? 'BEEH!' : 'b-beeh', PALETTE.bone); this.audio.sfxBleat(470, fear > 1 ? 0.14 : 0.08, 0.26); s.bleating = 0.3; }
      }
    }
    // the heart beats between them for as long as they are together
    const h = it.heart;
    if (!h.broken) {
      const b = (it.t * 1.15) % 1, beat = (o) => Math.pow(Math.max(0, Math.sin(b * Math.PI * 2 - o)), 3);
      h.pulse = 1 + 0.16 * beat(0) + 0.1 * beat(1.3);
      h.x = (g.x + s.x) / 2; h.y = Math.min(g.y, s.y) - 30 + Math.sin(it.t * 2) * 1.5;
    } else h.broken = Math.min(1, h.broken + dt * 1.1);
    // carried: under his arm, sideways, legs going
    if (s.held) {
      const k = s.held, fx = Math.cos(k.facing), fy = Math.sin(k.facing);
      s.x = k.x + fx * 13 - fy * 9; s.y = k.y + fy * 13 + fx * 9;
      s.facing = k.facing + 1.25; s.kick = Math.sin(it.t * 32) * 4.5;
      s.bleatT = (s.bleatT || 0) - dt;
      if (s.bleatT <= 0) {
        s.bleatT = 0.55 + Math.random() * 0.3; s.bleating = 0.25;
        this.floatText(s.x, s.y - 28, it.fade > 0.4 ? 'beeh!' : 'BEEH!', PALETTE.bone); this.audio.sfxBleat(540, 0.12 * (1 - it.fade), 0.25);
      }
    }

    if (ph === 'huddle') this.introHuddle(dt);
    else if (ph === 'approach') this.introApproach(dt);
    else if (ph === 'gate') this.introGate(dt);
    else if (ph === 'grab') this.introGrab(dt);
    else if (ph === 'fade') this.introFade(dt);
    else if (ph === 'black') this.introBlack(dt);
    else if (ph === 'wake') this.introWake(dt);
    if (!this.intro) return;
    // the two men never run their own update, so their lines have to age here
    for (const e of this.enemies) if (e.scripted && e.say) { e.say.life -= dt; if (e.say.life <= 0) e.say = null; }
    this.updateEffects(dt);
    for (const p of this.props) p.update(dt, this);
  }

  // Pressed together in the pen, leaning into each other and back.
  introHuddle(dt) {
    const it = this.intro, g = this.goat, s = it.sheep, S = it.S, k = Math.sin(it.t * 1.7);
    g.x = S.x - 24 + k * 3; g.facing = -0.1 + k * 0.08;
    s.x = S.x + 24 - k * 3; s.facing = Math.PI + 0.1 - k * 0.08;
    if (it.timer >= TUNING.intro.huddle) this.introPhase('approach');
  }

  // Two men come round the other cage and up to the gate. He gets between her and them.
  introApproach(dt) {
    const it = this.intro, I = TUNING.intro, g = this.goat, s = it.sheep, S = it.S, k = it.knife;
    const there = this.followPath(k, I.walk, dt); this.followPath(it.club, I.walk, dt);
    if (Math.hypot(k.x - S.x, k.y - S.y) < 7 * TILE) {
      if (!g.path && !it.retreated) { it.retreated = true; g.path = [{ x: S.x - 16, y: S.y + 6 }]; s.path = [{ x: S.x - 46, y: S.y - 2 }]; }
      this.followPath(g, 90, dt); this.followPath(s, 120, dt);
      if (!g.path.length) g.facing = Math.atan2(k.y - g.y, k.x - g.x);
      if (!s.path.length) s.facing = Math.atan2(k.y - s.y, k.x - s.x);
    }
    if (there) {
      k.facing = Math.atan2(S.y - k.y, S.x - k.x); it.club.facing = k.facing;
      if (!it.arrived) { it.arrived = it.timer; this.say(k, BARKS.intro.ewe); }
      else if (it.timer - it.arrived > I.arrive) this.introPhase('gate');
    }
  }

  // He puts a boot to the bars and they go over.
  introGate(dt) {
    const it = this.intro, I = TUNING.intro, p = clamp(it.timer / I.gate, 0, 1);
    for (const b of it.gate) b.gate = p;
    it.knife.x = it.stand.x - Math.sin(p * Math.PI) * 9;
    if (!it.clank && p > 0.5) { it.clank = true; this.audio.sfxCageHit(); this.shake(3); for (const b of it.gate) this.particles(b.x, b.y, 3, PALETTE.ash, 90); }
    if (it.timer >= I.gate + I.gateHold) this.introPhase('grab');
  }

  // camera: follow, lead toward the aim, pull back a little at speed
  updateCamera(dt) {
    const w = this.world, C = TUNING.camera;
    const spd = Math.hypot(this.goat.vx, this.goat.vy) / TUNING.goat.speed;
    // The lead is carried, not read. Reading it straight off the aim meant that crossing the pointer
    // over the goat threw the whole picture to the other side of him in one frame, which is what
    // made turning around on the spot feel like being shaken. Standing still, he barely leads at all.
    const lead = C.lead * (this.touch.active ? 0.7 : 1) * lerp(C.leadStill, 1, clamp(spd, 0, 1));
    const lk = 1 - Math.exp(-C.leadLerp * dt);
    this.camLead.x += (this.input.aim.x * lead - this.camLead.x) * lk;
    this.camLead.y += (this.input.aim.y * lead - this.camLead.y) * lk;
    let tx = this.goat.x + this.camLead.x, ty = this.goat.y + this.camLead.y;

    // A room that already fits the screen whole is held dead centre rather than tracked — there is
    // nothing off-screen to pan toward, so tracking it only shivers the picture with every step he
    // takes across it. `roomAt` is the same lookup the rule checker uses.
    const v = this.renderer.view(this.cam);
    const room = this.level && roomAt(this.level, this.goat.x, this.goat.y);
    const fits = room && room.w * TILE <= v.w - C.fitMargin && room.h * TILE <= v.h - C.fitMargin;
    if (fits) { tx = (room.x + room.w / 2) * TILE; ty = (room.y + room.h / 2) * TILE; }

    // The deadzone: the follow point only moves once the target has stepped past a small window
    // round it, so a shiver of motion at a standstill never nudges the whole picture — only real
    // travel does. A locked room has nowhere to drift to, so it skips the window and is simply held.
    if (!this.camFollow) this.camFollow = { x: tx, y: ty };
    if (fits) { this.camFollow.x = tx; this.camFollow.y = ty; }
    else {
      const fdx = tx - this.camFollow.x, fdy = ty - this.camFollow.y, dz = C.deadzone;
      if (fdx > dz) this.camFollow.x = tx - dz; else if (fdx < -dz) this.camFollow.x = tx + dz;
      if (fdy > dz) this.camFollow.y = ty - dz; else if (fdy < -dz) this.camFollow.y = ty + dz;
    }

    const k = 1 - Math.exp(-C.lerp * dt);
    this.cam.x += (this.camFollow.x - this.cam.x) * k; this.cam.y += (this.camFollow.y - this.cam.y) * k;
    const targetZoom = this.renderer.zoomFit * lerp(C.zoomRest, C.zoomFast, clamp(spd, 0, 1));
    this.cam.zoom += (targetZoom - this.cam.zoom) * (1 - Math.exp(-C.zoomLerp * dt));
    const v2 = this.renderer.view(this.cam);
    this.cam.x = clamp(this.cam.x, v2.w / 2, w.W * TILE - v2.w / 2);
    this.cam.y = clamp(this.cam.y, v2.h / 2, w.H * TILE - v2.h / 2);
  }

  // He walks round the goat to her, takes her, and heads for the gate. The goat goes for him and
  // meets the other man's club instead.
  introGrab(dt) {
    const it = this.intro, I = TUNING.intro, g = this.goat, s = it.sheep, k = it.knife, c = it.club, S = it.S;
    if (g.state !== 'windup' && g.state !== 'lunge') g.facing = Math.atan2(k.y - g.y, k.x - g.x);
    if (!s.held) {
      s.facing = Math.atan2(k.y - s.y, k.x - s.x);
      if (this.followPath(k, I.walk, dt)) {
        s.held = k; s.path = null; s.jitter = null; it.heart.broken = 0.001;
        this.audio.sfxCrack(); this.audio.sfxBleat(560, 0.2, 0.4); this.floatText(s.x, s.y - 34, 'BEEEH!', PALETTE.fireHi); s.bleating = 0.5;
        this.particles(it.heart.x, it.heart.y, 8, PALETTE.blood, 70);
        this.say(k, BARKS.intro.take);
        k.path = [it.way[1], { x: S.x + 44, y: S.y - 30 }, { x: S.x + it.hw + 4, y: S.y - 8 }, it.stand, it.bend, it.door];
        c.path = [{ x: S.x + it.hw - 22, y: S.y + 16 }];   // the other one steps in through the gate
      }
      return;
    }
    this.followPath(k, I.walk, dt); this.followPath(c, I.run, dt);
    if (!it.exitAt && k.x > S.x + 20) it.exitAt = it.timer;
    const since = it.exitAt ? it.timer - it.exitAt : -1;
    // the club comes up before the goat moves, so the arc is on the floor in front of him first
    if (since >= 0 && !it.clubWind) { it.clubWind = true; c.state = 'windup'; c.timer = TUNING.bearer.windup; c.path = []; }
    if (c.state === 'windup') { c.timer = Math.max(0.01, c.timer - dt); c.facing = Math.atan2(g.y - c.y, g.x - c.x); }
    if (since > I.lunge && !it.lunged) {
      it.lunged = true; g.state = 'windup'; g.timer = TUNING.goat.headbutt.windup; g.path = null;
      this.floatText(g.x, g.y - 30, 'BAAAH!', PALETTE.bone); this.audio.sfxBleat(280, 0.22, 0.4);
    }
    if (g.state === 'windup') {
      g.timer -= dt; g.facing = Math.atan2(k.y - g.y, k.x - g.x);
      if (g.timer <= 0) {
        g.state = 'lunge'; g.timer = TUNING.goat.headbutt.active;
        const dx = k.x - g.x, dy = k.y - g.y, d = Math.hypot(dx, dy) || 1;
        g.vx = dx / d * TUNING.goat.headbutt.lunge; g.vy = dy / d * TUNING.goat.headbutt.lunge;
        // and the club man is standing in the way
        c.x = g.x + dx / d * 52; c.y = g.y + dy / d * 52; c.facing = Math.atan2(-dy, -dx);
        this.audio.sfxHeadbutt();
      }
    } else if (g.state === 'lunge') {
      g.timer -= dt; g.x += g.vx * dt; g.y += g.vy * dt;
      if (Math.hypot(c.x - g.x, c.y - g.y) < g.r + c.r + 6 || g.timer <= 0) this.introClub();
    }
  }

  introClub() {
    const it = this.intro, I = TUNING.intro, g = this.goat, c = it.club;
    it.hit = true; c.state = 'swing'; c.timer = TUNING.bearer.swing; this.audio.sfxSwing();
    const d = Math.hypot(g.vx, g.vy) || 1, nx = g.vx / d, ny = g.vy / d;
    g.state = 'ko'; g.vx = -nx * I.club.knock; g.vy = -ny * I.club.knock; g.dazed = 99; g.jitter = null;
    this.hitstop(I.club.hitstop); this.shake(16); this.kick(-nx, -ny, TUNING.juice.kickMax); this.zoomPunch(2.2);
    this.flash(PALETTE.blood, 0.4); this.hurtFlash(Math.atan2(ny, nx)); this.slowTimer = I.club.slow;
    this.audio.sfxClub(); this.vibe(80);
    this.particles(g.x + nx * 10, g.y + ny * 10, 12, PALETTE.bone, 260);
    this.world.splat(g.x, g.y, -nx, -ny, 7);
    // the bleat he was in the middle of stops where the club lands
    this.floats = this.floats.filter((f) => f.text !== 'BAAAH!');
    this.floatText(g.x, g.y - 30, 'BAA-', PALETTE.bone);
    this.introPhase('fade');
  }

  // The picture goes. He is dragged to a stop; she is carried off still calling; the other man has a
  // word for him, puts the gate back up and follows.
  introFade(dt) {
    const it = this.intro, I = TUNING.intro, g = this.goat, k = it.knife, c = it.club, S = it.S;
    const p = clamp(it.timer / I.fade, 0, 1); it.fade = p * p; it.starsA = 1;
    g.x += g.vx * dt; g.y += g.vy * dt; const drag = Math.exp(-6 * dt); g.vx *= drag; g.vy *= drag;
    this.world.collideCircle(g);
    this.followPath(k, I.walk, dt);
    if (c.state === 'swing') { c.timer -= dt; if (c.timer <= 0) { c.state = 'recover'; c.timer = TUNING.bearer.recover; } }
    else if (c.state === 'recover') {
      c.timer -= dt; c.facing = Math.atan2(g.y - c.y, g.x - c.x);
      if (c.timer <= 0) { c.state = 'chase'; this.say(c, BARKS.intro.turn); c.path = [{ x: S.x + it.hw + 24, y: S.y + 6 }]; it.closeAt = it.timer + 0.8; }
    } else {
      const done = this.followPath(c, I.walk, dt);
      if (it.closeAt && it.timer > it.closeAt) {
        const q = clamp((it.timer - it.closeAt) / I.gate, 0, 1);
        for (const b of it.gate) b.gate = 1 - q;
        if (!it.clank2 && q > 0.5) { it.clank2 = true; this.audio.sfxCageHit(); }
        if (q >= 1 && done && !c.leaving) { c.leaving = true; c.path = [it.stand2, it.bend, it.door]; }
      } else if (done) c.facing = Math.atan2(g.y - c.y, g.x - c.x);
    }
    if (it.timer >= I.fade) this.introPhase('black');
  }

  // Dark. The stars go out, something bleats a long way off, and the level card comes up.
  introBlack(dt) {
    const it = this.intro, I = TUNING.intro;
    it.fade = 1;
    if (!it.cleared) {
      it.cleared = true; this.enemies = this.enemies.filter((e) => !e.scripted);
      it.sheep.gone = true; it.sheep.held = null; it.heart.broken = 1;
      for (const b of it.gate) b.gate = 0;
    }
    it.starsA = Math.max(0, 1 - it.timer / 0.7);
    if (!it.echoed && it.timer > 0.55) { it.echoed = true; it.echo = 1.6; this.audio.sfxBleat(600, 0.05, 0.35); }
    it.echo = Math.max(0, it.echo - dt);
    it.cardA = clamp((it.timer - 0.8) / 0.5, 0, 1);
    this.card = { lines: [this.level.def.sub.toUpperCase(), this.level.def.name], dim: 0, size: 40, alpha: it.cardA };
    if (it.timer >= I.black) this.introPhase('wake');
  }

  // The light comes back on the pen. He gets up with the stars still going round.
  introWake(dt) {
    const it = this.intro, I = TUNING.intro, g = this.goat, p = clamp(it.timer / I.wake, 0, 1);
    it.fade = 1 - p; it.starsA = 0;
    it.cardA = clamp(1 - it.timer / 0.5, 0, 1);
    if (this.card) this.card.alpha = it.cardA;
    if (it.cardA <= 0) this.card = null;
    if (p > 0.4 && g.state === 'ko') { g.state = 'idle'; g.dazed = I.stars; this.particles(g.x, g.y + 6, 8, PALETTE.ash, 120); }
    if (p >= 1) this.endIntro();
  }

  // Any button after the first moment: straight to the dark. `toPlay` drops the dark as well (tests).
  skipIntro(toPlay) {
    const it = this.intro; if (!it) return;
    if (toPlay) { this.endIntro(); return; }
    if (it.phase === 'black' || it.phase === 'wake') return;
    const g = this.goat; g.state = 'ko'; g.vx = 0; g.vy = 0; g.dazed = 99; g.jitter = null; g.path = null;
    this.slowTimer = 0; this.hitstopTimer = 0; this.audio.duck(TUNING.intro.duck, 0.2);
    it.pro = null;                       // skipped from the prologue: the dark is the same dark
    this.introPhase('black'); it.timer = 0.5;
  }
  endIntro() {
    const g = this.goat;
    // It has been watched. From here on a key gets you past it.
    this.introSeen = true;
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* storage refused */ }
    this.enemies = this.enemies.filter((e) => !e.scripted);
    for (const p of this.props) if (p.kind === 'cage') p.gate = 0;
    g.state = 'idle'; g.timer = 0; g.vx = 0; g.vy = 0; g.jitter = null; g.path = null; g.hp = g.maxHp;
    if (g.dazed > 50) g.dazed = TUNING.intro.stars;
    this.intro = null; this.card = null; this.timer = 0; this.slowTimer = 0; this.state = 'play';
    this.audio.duck(1, 0.5); this.world.computeFlow(g.x, g.y);
  }

  // ---------- the stairs out ----------
  // The exit is a flight up. The goat takes it for a moment, into the light, before the cards.
  // The floor stops. He goes down it, and comes back up on the last boards he stood on a heart
  // lighter — the same price the wheel charges. A hole takes a man out of the room for good and only
  // rents the goat, which is what makes an edge something to fight beside rather than away from.
  goatFalls() {
    const g = this.goat, F = TUNING.fall;
    if (g.dead || g.state === 'falling') return;
    g.state = 'falling'; g.timer = F.time + F.back; g.vx *= 0.3; g.vy *= 0.3; g.landed = false;
    // Land somewhere with room behind it. `safeX/safeY` is the exact board his hoof was leaving,
    // which is also the board the same step can drop him off of again; the trail holds a few seconds
    // of where he already was, so he comes back a little further from the lip than he fell off it.
    // Every candidate is checked against the floor before it is taken. The trail only ever records
    // ground he was standing on, so in ordinary play the first one answers — but if the whole of it
    // is somehow unusable (a trail emptied by a level change, a hole opened under a remembered
    // board), putting him back over a drop means he falls again from the spot he was returned to,
    // and again, for as long as he has hearts. `groundNear` is the last resort that cannot fail.
    const tr = g.safeTrail, safe = (p) => p && !this.world.isPitPx(p.x, p.y);
    let land = null;
    for (let i = tr.length - 1; i >= 0; i--) {
      if (!safe(tr[i])) continue;
      land = tr[i];
      if (tr[i].t >= F.setback) break;   // far enough back; anything older is only a fallback
    }
    if (!land && safe({ x: g.safeX, y: g.safeY })) land = { x: g.safeX, y: g.safeY };
    if (!land) land = this.groundNear(g.x, g.y);
    g.safeX = land.x; g.safeY = land.y;
    // Whatever was in his mouth goes down with him.
    if (g.holding) {
      const h = g.holding; g.holding = null; h.held = false;
      if (h.item) h.snap(this); else h.die(this, 'fall');
      g.grabCd = TUNING.goat.grab.cooldown * this.mods.grabCooldown;
    }
    this.audio.sfxSwing(); this.shake(7); this.vibe(45); this.zoomPunch(0.7);
    this.floatText(g.x, g.y - 26, 'THE FLOOR ENDS', PALETTE.blood);
  }
  // The nearest tile centre that is floor and is not a hole, spiralling out from a point. Only the
  // fall asks, and only when the trail behind the goat has nothing usable left in it — but it has to
  // answer, because the alternative is putting him back over the drop he just went down.
  groundNear(x, y) {
    const w = this.world, cx = Math.floor(x / TILE), cy = Math.floor(y / TILE);
    for (let r = 1; r < 24; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;   // the ring at this radius only
          const tx = cx + dx, ty = cy + dy;
          if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) continue;
          if (w.isSolid(tx, ty) || w.tiles[ty * w.W + tx] === T.PIT) continue;
          return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
        }
      }
    }
    return { x: this.level.start.x, y: this.level.start.y };   // the room he came in by, if all else fails
  }
  updateFall(dt) {
    const g = this.goat, F = TUNING.fall;
    if (g.timer > F.back) return;                      // still going down
    // Exactly once per fall. This used to test his position against the spot he was headed for,
    // which silently did nothing on the fall where the two already matched — no damage, no move,
    // and he was left standing in the hole.
    if (!g.landed) {
      g.landed = true;
      g.x = g.safeX; g.y = g.safeY; g.vx = 0; g.vy = 0;
      this.cam.x = g.x; this.cam.y = g.y; this.camLead.x = 0; this.camLead.y = 0; this.camFollow = null;
      this.world.computeFlow(g.x, g.y);
      g.damage(F.damage, this, 0, 0, true);
      this.audio.sfxThud(); this.shake(5);
      if (!g.dead) this.floatText(g.x, g.y - 34, 'BACK UP', PALETTE.bone);
    }
    if (g.timer <= 0 && !g.dead) { g.state = 'idle'; g.invuln = Math.max(g.invuln, F.invuln); }
  }
  beginClimb() {
    this.state = 'climb'; this.stateTimer = TUNING.stairs.climb; this.stairFx = { t: 0, dir: 1 };
    const g = this.goat; g.state = 'idle'; g.facing = 0;
    if (g.holding) { const h = g.holding; h.held = false; g.holding = null; if (!h.item) { h.state = 'floored'; h.timer = 0.6; } }
  }
  updateClimb(dt) {
    const C = TUNING.stairs, g = this.goat; this.stateTimer -= dt;
    g.vx = C.climbSpeed; g.vy = 0; g.x += C.climbSpeed * dt; g.facing = 0;
    this.stairFx.t = clamp(1 - this.stateTimer / C.climb, 0, 1);
    this.updateEffects(dt); this.updateCamera(dt);
    if (this.stateTimer <= 0) { this.stairFx = null; this.flash(PALETTE.bone, 0.4); this.levelCleared(); }
  }

  updateEffects(dt) {
    const J = TUNING.juice;
    if (this.stairFx && this.stairFx.dir < 0) { this.stairFx.t += dt / TUNING.stairs.arrive; if (this.stairFx.t >= 1) this.stairFx = null; }
    this.shakeAmt = Math.max(0, this.shakeAmt - J.shakeDecay * dt * Math.max(1, this.shakeAmt * 0.3));
    this.shakeX = (Math.random() - 0.5) * 2 * this.shakeAmt; this.shakeY = (Math.random() - 0.5) * 2 * this.shakeAmt;
    const kd = Math.exp(-J.kickDecay * dt);
    this.kickX *= kd; this.kickY *= kd;
    this.zoomKick *= Math.exp(-J.zoomDecay * dt);
    this.flashAmt = Math.max(0, this.flashAmt - J.flashDecay * dt * Math.max(1, this.flashAmt * 4));
    this.barkCd = Math.max(0, this.barkCd - dt);
    this.cageThought = Math.max(0, this.cageThought - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0) this.combo = 0;
    for (const p of this.parts) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92;
      // A chunk that comes to rest marks the floor for the rest of the level.
      if (p.chunk && p.life <= 0 && this.world) this.world.dot(p.x, p.y, 1.6 + Math.random() * 2.4, PALETTE.bloodDark);
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const f of this.floats) f.life -= dt;
    this.floats = this.floats.filter((f) => f.life > 0);
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const f of this.fallers) f.t += dt;
    this.fallers = this.fallers.filter((f) => f.t < f.life);
    if (this.breathFx) { this.breathFx.life -= dt; if (this.breathFx.life <= 0) this.breathFx = null; }
    if (this.dev.toast) { this.dev.toast.life -= dt; if (this.dev.toast.life <= 0) this.dev.toast = null; }
  }

  // ---------- collisions between circles ----------
  collideEntities(dt) {
    const g = this.goat, en = this.enemies, ph = TUNING.physics;
    for (let i = 0; i < en.length; i++) {
      const a = en[i]; if (a.dead || a.held || a.ghosted) continue;
      for (let j = i + 1; j < en.length; j++) {
        const b = en[j]; if (b.dead || b.held || b.ghosted) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
        if (d >= min || d === 0) continue;
        const nx = dx / d, ny = dy / d;
        const aFl = a.state === 'flung' && Math.hypot(a.vx, a.vy) > ph.knockHitSpeed;
        const bFl = b.state === 'flung' && Math.hypot(b.vx, b.vy) > ph.knockHitSpeed;
        if (aFl && !bFl) this.flungHits(a, b, nx, ny);
        else if (bFl && !aFl) this.flungHits(b, a, -nx, -ny);
        else { const push = (min - d) / 2; a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push; }
        if (a.burning > 0 || b.burning > 0) this.passFire(a, b);
      }
    }
    for (const e of en) {
      if (e.dead || e.held || e.ghosted || g.dead) continue;
      const dx = e.x - g.x, dy = e.y - g.y, d = Math.hypot(dx, dy), min = e.r + g.r;
      if (d >= min || d === 0) continue;
      const nx = dx / d, ny = dy / d, push = (min - d);
      // The big man does not move for you, and neither does a man holding a post: the first man of
      // the run is standing in a one-tile doorway on purpose, and shouldering him down the corridor
      // ahead of you is not a way past him. Everybody else gives ground.
      if (e.kind === 'butcher' || e.sentry) { g.x -= nx * push; g.y -= ny * push; }
      else { g.x -= nx * push * 0.4; g.y -= ny * push * 0.4; e.x += nx * push * 0.6; e.y += ny * push * 0.6; }
    }
    for (const p of this.props) {
      if (p.broken) continue;
      if (p.item) {
        if (p.kind === 'crate' && p.flung) for (const e of en) { if (!e.dead && !e.held && e.state === 'flung' && Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) { p.shatter(this); break; } }
        continue;
      }
      if (!p.blocking) continue;
      const all = [g].concat(en);
      for (const e of all) {
        if (e.dead || e.held || e.ghosted) continue;
        const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy), min = e.r + p.r;
        if (d >= min || d === 0) continue;
        const nx = dx / d, ny = dy / d;
        const vn = e.vx * nx + e.vy * ny;
        // The Butcher's charge is a thing the room answers. A door comes off its hinges and he
        // keeps going; a table goes ahead of him at speed, into whoever was behind it; a lamp goes
        // over and he runs into his own fire; a brazier lights him; and anything as solid as a wall
        // — the gong, the hub, a bar of the pen — stops him the way a wall does.
        if (e.state === 'charge' && vn < 0) {
          if (p.kind === 'door') { p.hits = Math.max(p.hits || 0, TUNING.prop.door.hits - 1); p.smash(this, -nx, -ny, e); continue; }
          if (p.kind === 'table' && !p.flung) { p.shove(this, -nx, -ny, e); continue; }
          if (p.kind === 'lamp') { p.topple(this, -nx, -ny); continue; }
          if (p.kind === 'brazier') { p.spill(this, -nx, -ny); e.ignite(this); continue; }
          if (p.kind === 'bell') p.ring(this);
          e.chargeStopped(this);
        }
        if (e.state === 'flung' && p.kind === 'bell' && -vn > 3 * TILE) p.ring(this);
        if (e.state === 'flung' && -vn > TUNING.prop.door.smashSpeed && p.kind === 'door') { p.smash(this, -nx, -ny); continue; }
        // A lamp post is not a pillar. A body arriving at speed takes it over, and the oil goes
        // down where the body is about to land.
        if (e.state === 'flung' && -vn > TUNING.prop.lamp.knock && p.kind === 'lamp') { p.topple(this, -nx, -ny); e.vx *= 0.6; e.vy *= 0.6; continue; }
        if (e.state === 'flung' && -vn > ph.splatSpeed && e !== g) { e.die(this, 'splat', -nx, -ny); continue; }
        if (e === g && p.kind === 'table' && !p.flung) {
          // the goat can shoulder a table along slowly
          const shove = Math.min(min - d, TUNING.prop.table.pushSpeed * dt);
          p.x -= nx * shove; p.y -= ny * shove; this.world.collideCircle(p);
        }
        if (vn < 0) { e.vx -= vn * nx; e.vy -= vn * ny; }
        e.x += nx * (min - d); e.y += ny * (min - d);
      }
    }
  }
  // A man alight blunders into another and hands it over — once. The man he hands it to is the end
  // of the line and passes it to nobody, so a brazier costs a room two men rather than the room.
  passFire(a, b) {
    const lit = a.burning > 0 ? a : b, cold = a.burning > 0 ? b : a;
    if (cold.burning > 0 || cold.dead || cold.ghosted || lit.litByMan || lit.passedFire) return;
    lit.passedFire = true;
    cold.ignite(this, lit.witchBurn, true);
    this.floatText(cold.x, cold.y - 30, 'IT SPREADS', lit.witchBurn ? PALETTE.witch : PALETTE.fire);
  }
  // A body arriving on a body. A man out of your mouth kills whoever he lands on and carries on —
  // he is the weapon. A man off your horns kills too, if he is still travelling at `bodyKillSpeed`
  // when he gets there: two men standing shoulder to shoulder used to be the safe place in the room,
  // because the first one bowled the second over and both stood up, and that read as the game saying
  // a man is not part of the room. He is. And at the speed a wall kills at, the one who was thrown
  // is as dead as the one he was thrown at.
  flungHits(f, other, nx, ny) {
    const ph = TUNING.physics, spd = Math.hypot(f.vx, f.vy);
    if (other.kind === 'butcher') { other.state = 'stagger'; other.timer = 0.3; f.vx *= -0.3; f.vy *= -0.3; return; }
    if (f.thrown || spd > ph.bodyKillSpeed) {
      // A fused man who arrives on somebody hard enough to kill him goes off on him instead of
      // just killing him — he is the bomb, not the delivery.
      if (f.bombFuse > 0) { f.explode(this); return; }
      other.die(this, 'splat', nx, ny);
      if (!f.thrown && spd > ph.splatSpeed && !f.dead) { f.die(this, 'splat', -nx, -ny); return; }
      f.vx *= f.thrown ? 0.55 : 0.45; f.vy *= f.thrown ? 0.55 : 0.45;
      return;
    }
    other.state = 'floored'; other.timer = TUNING.bearer.flooredTime; other.aware = true;
    other.vx = f.vx * 0.5; other.vy = f.vy * 0.5; f.vx *= 0.5; f.vy *= 0.5;
    other.x += nx * 4; other.y += ny * 4;
    this.audio.sfxThud();
  }
  // The brazier something is up against, or null. Truthy, so the old boolean callers still read.
  touchingBrazier(e) {
    for (const p of this.props) if (p.kind === 'brazier' && !p.broken && Math.hypot(p.x - e.x, p.y - e.y) < p.r + e.r + 3) return p;
    return null;
  }

  // ---------- helpers used by entities ----------
  // The muzzle sits a way out in front of him, and that gap used to be the one stretch of the shot
  // nothing checked: fire diagonally past a corner and the bullet simply appeared on the far side of
  // the stone. Walk it out instead, and stop at whatever it meets.
  fireBullet(shooter, dx, dy) {
    // Same rule as a club: a rifle inside a room nobody has opened is a shot out of the black, and
    // the bullet is painted out along with the man who fired it. He holds his shot until he is seen.
    if (this.hidden(shooter.x, shooter.y)) return;
    const s = TUNING.hunter.bulletSpeed, w = this.world, out = shooter.r + 16;
    let mx = shooter.x, my = shooter.y, blocked = false;
    for (let t = 4; t <= out; t += 4) {
      const px = shooter.x + dx * t, py = shooter.y + dy * t;
      if (w.isSolid(Math.floor(px / TILE), Math.floor(py / TILE))) { blocked = true; break; }
      mx = px; my = py;
    }
    this.audio.sfxGunshot(); this.world.emitNoise(shooter.x, shooter.y, TUNING.noise.gunshot);
    this.particles(mx, my, 4, PALETTE.fireHi, 120); this.shake(1.5);
    // Firing into the wall he is standing against is a wasted round, not a shot through it.
    if (blocked) { w.dot(mx, my, 2, '#2a2020'); return; }
    this.bullets.push(new Bullet(mx, my, dx * s, dy * s));
  }
  // A swing has to have a way to what it is swinging at. Stone, a pillar, a table, a shut door, the
  // hub of the Mill: whatever is in the way takes the blow instead, and both sides are held to it —
  // a club that comes through a wall reads as the room not being real.
  // Line of sight plus a set of props, each as a circle against the segment. `reaches` asks it of
  // everything that blocks a blow; `sees` asks it of the few things you cannot see over.
  clearLine(ax, ay, bx, by, props, stops) {
    if (!this.world.los(ax, ay, bx, by)) return false;
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    for (const p of props) {
      if (!p[stops]) continue;
      // How far the prop's centre is off the line, clamped to the segment itself.
      const t = len2 ? clamp(((p.x - ax) * dx + (p.y - ay) * dy) / len2, 0, 1) : 0;
      const px = ax + dx * t - p.x, py = ay + dy * t - p.y;
      if (Math.hypot(px, py) < p.r * 0.8) return false;
    }
    return true;
  }
  reaches(ax, ay, bx, by) { return this.clearLine(ax, ay, bx, by, this.props, 'blocking'); }
  // A shut door is a wall until somebody opens it, and nobody sees through a wall. `sightBlockers`
  // is the short list of props that could ever be one, so this stays off the per-frame prop loop.
  sees(ax, ay, bx, by) { return this.clearLine(ax, ay, bx, by, this.sightBlockers, 'opaque'); }
  meleeHit(att, reach, arc, damage, knock, skipGoat) {
    const g = this.goat;
    // Nothing that is not on the screen lands a blow. A man inside a room the goat has not opened
    // is not drawn at all — the fog paints his whole room out — and he could still reach out of the
    // black and club you. He may walk, he may shout, he may come and find you. He may not hit you
    // from a place the game is refusing to show you.
    if (this.hidden(att.x, att.y)) return;
    const inArc = (o) => { const dx = o.x - att.x, dy = o.y - att.y, d = Math.hypot(dx, dy);
      return d < reach + o.r && Math.abs(angleDiff(att.facing, Math.atan2(dy, dx))) < arc / 2
        && this.reaches(att.x, att.y, o.x, o.y); };
    const dirx = Math.cos(att.facing), diry = Math.sin(att.facing);
    if (!g.dead && !skipGoat) {
      if (g.holding && !g.holding.item && inArc(g.holding)) { const h = g.holding; this.floatText(h.x, h.y - 26, 'SHIELD', PALETTE.bone); h.die(this, 'club', dirx, diry); }
      // A club into a carried shield is a club into a shield. He spends a charge, the man who swung
      // it stands there holding the shock of it, and the goat takes nothing.
      else if (inArc(g) && g.shielded(att.x, att.y)) {
        const W = TUNING.prop.weapon, sh = g.holding;
        this.floatText(sh.x, sh.y - 28, 'CLANG', PALETTE.bone);
        this.audio.sfxSteel(); this.shake(5); this.hitstop(0.05); this.vibe(22);
        this.particles(sh.x, sh.y, 7, PALETTE.fireHi, 180);
        att.state = 'stagger'; att.timer = W.parry; att.vx = dirx * -3 * TILE; att.vy = diry * -3 * TILE;
        if (--sh.uses <= 0) sh.snap(this);
      }
      else if (inArc(g)) g.damage(damage, this, dirx * knock * 4, diry * knock * 4);
    }
    // A hound bites what it was sent for. It does not floor its own handlers on the way past — a pack
    // of them doing that filled half the screen with OOPS.
    if (att.kind === 'dog') return;
    for (const e of this.enemies) {
      if (e === att || e.dead || e.held || e.ghosted || e.state === 'flung') continue;
      if (!inArc(e)) continue;
      if (e === g.holding) continue;
      if (att.kind === 'butcher') { e.fling(dirx * 14 * TILE, diry * 14 * TILE, false); this.floatText(e.x, e.y - 26, 'OOPS', PALETTE.bone); }
      else if (e.kind !== 'butcher' && Math.random() < 0.7) { e.state = 'floored'; e.timer = 0.6; e.aware = true; this.floatText(e.x, e.y - 26, 'OOPS', PALETTE.bone); }
    }
  }
  onKill(e, cause) {
    this.kills++;
    const J = TUNING.juice, big = e.kind === 'butcher';
    // Kills inside the window stack: each one hits harder and holds the frame longer.
    this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
    this.comboTimer = J.comboWindow;
    const dx = e.x - this.goat.x, dy = e.y - this.goat.y;
    this.hitstop(J.hitstop + Math.min(0.05, this.combo * 0.008));
    this.shake(big ? 14 : J.shakeKill);
    this.kick(dx, dy, J.kick * (big ? 1.7 : 1));
    this.zoomPunch(big ? 2 : 1);
    const cold = e.kind === 'wraith';
    this.flash(cold ? PALETTE.witchHi : PALETTE.blood, big ? 0.24 : cold ? 0.16 : 0.11);
    if (!cold) this.gore(e.x, e.y, big ? 16 : 9, dx, dy);
    if (big) { this.audio.sfxBell(); this.floatText(e.x, e.y - 44, 'THE BUTCHER IS DOWN', PALETTE.fireHi); this.slowTimer = J.killSlow; this.vibe(40); }
    else if (cold) { this.vibe(12); }
    else { this.audio.sfxSplat(); this.vibe(12); }
    if (this.combo >= 2) {
      this.floatText(e.x, e.y - 40, 'x' + this.combo, PALETTE.fireHi);
      this.audio.sfxKill(this.combo);
      if (this.combo >= 3) { this.slowTimer = Math.max(this.slowTimer, J.comboSlow); this.flash(PALETTE.fireHi, 0.15); }
    }
    // Whoever was watching him says something about it.
    for (const o of this.enemies) {
      if (o === e || o.dead || o.held || !o.aware) continue;
      if (Math.hypot(o.x - e.x, o.y - e.y) > 7 * TILE) continue;
      if (!this.world.los(o.x, o.y, e.x, e.y)) continue;
      this.bark(o, 'panic', 0.5); break;
    }
    if (!cold) {
      this.world.emitNoise(e.x, e.y, TUNING.noise.splat);
      this.particles(e.x, e.y, big ? 26 : 14, PALETTE.blood, 220);
    }
  }
  // Off his feet: no verbs until it passes. The pen is the only thing that does it to him.
  stunGoat(t) {
    const g = this.goat;
    if (g.dead) return;
    if (g.holding) { const h = g.holding; g.holding = null; h.held = false; if (!h.item) { h.state = 'floored'; h.timer = 0.5; } }
    g.state = 'stunned'; g.timer = t; g.dazed = Math.max(g.dazed, t + 0.6);
    this.shake(10); this.kick(0, 1, TUNING.juice.kick); this.hitstop(0.06);
    this.slowTimer = Math.max(this.slowTimer, 0.3); this.vibe(60);
    this.audio.sfxClub();
  }
  hitstop(t) { this.hitstopTimer = Math.max(this.hitstopTimer, t); }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  // A shove of the whole picture away from the impact, on top of the random shake.
  kick(dx, dy, amt) {
    const d = Math.hypot(dx, dy) || 1;
    this.kickX += dx / d * amt; this.kickY += dy / d * amt;
    const m = Math.hypot(this.kickX, this.kickY), max = TUNING.juice.kickMax;
    if (m > max) { this.kickX *= max / m; this.kickY *= max / m; }
  }
  zoomPunch(mul) { this.zoomKick = Math.max(this.zoomKick, TUNING.juice.zoomKick * (mul === undefined ? 1 : mul)); }
  flash(color, amt) { if (amt > this.flashAmt) { this.flashAmt = amt; this.flashColor = color; } }
  // Wet chunks that fly off a kill and stain the floor where they land.
  gore(x, y, n, dirx, diry) {
    const d = Math.hypot(dirx, diry) || 1;
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(diry / d, dirx / d) + (Math.random() - 0.5) * 2.4, sp = 120 + Math.random() * 380;
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.25 + Math.random() * 0.45,
        color: Math.random() < 0.3 ? PALETTE.bloodDark : PALETTE.blood, size: 2.5 + Math.random() * 4, chunk: true });
    }
  }
  // Horns closing on nothing. It is said where it happened, a few times, and then the run is
  // expected to have understood: you cannot hit what has not arrived yet.
  mistTold(e) {
    if (this.mistSaid === undefined) this.mistSaid = 0;
    if (this.mistSaid >= 3) return;
    this.mistSaid++;
    this.floatText(e.x, e.y - 26, this.mistSaid === 1 ? 'NOT HERE YET' : 'NOTHING TO HIT', PALETTE.witchHi);
    this.audio.sfxSwing();
  }

  // A hound has nothing to say. It growls, and the first one of a run says what answers it.
  houndSeen(dog) {
    this.audio.sfxGrowl();
    if (this.houndTold) return;
    this.houndTold = true;
    this.floatText(dog.x, dog.y - 34, this.mods.breath ? 'BURN THE HOUNDS' : 'BAAH BREAKS A HOUND', PALETTE.fireHi);
  }
  // The one thing in the compound that is not trying to kill him. The first coop of a run says what
  // she is for, because a bird walking after you explains nothing on its own — and a player who
  // does not know she is ammunition simply leaves her in the room she was let out of.
  henFreed(coop) {
    if (this.henTold) return;
    this.henTold = true;
    this.floatText(coop.x, coop.y - 52, 'SHE FOLLOWS. BUTT HER AT A MAN', PALETTE.hen);
  }
  // One man speaks at a time: a crowd all shouting at once reads as noise, not as a cult.
  bark(e, kind, chance) {
    if (!e || e.dead || e.held || e.kind === 'dog' || this.state !== 'play') return;
    if (chance !== undefined && Math.random() > chance) return;
    if (this.barkCd > 0 || e.barkCd > 0) return;
    const pool = BARKS[kind]; if (!pool) return;
    const list = Array.isArray(pool) ? pool : (pool[e.kind] || pool.bearer);
    e.say = { text: list[(Math.random() * list.length) | 0], life: TUNING.bark.life, max: TUNING.bark.life };
    this.barkCd = TUNING.bark.gap; e.barkCd = TUNING.bark.perEnemy;
  }
  vibe(ms) { if (this.coarse && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } } }
  hurtFlash(angle) { this.hurt = { angle, life: 0.6 }; this.vibe(35); this.flash(PALETTE.blood, 0.16); }
  ring(x, y, r, color) { this.rings.push({ x, y, r, color, life: 0.6, max: 0.6 }); }
  particles(x, y, n, color, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random());
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.5, color, size: 2 + Math.random() * 3 });
    }
  }
  floatText(x, y, text, color) { this.floats.push({ x, y, text, color, life: 1.2 }); }
}

window.addEventListener('load', () => { window.game = new Game(document.getElementById('game')); });
