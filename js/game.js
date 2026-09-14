// Game: state machine, fixed-step loop, pointer/keyboard/touch input, entity collisions, effects, cards.
// Where a run is left for CONTINUE. Bump the version and old saves are simply ignored.
const SAVE_KEY = 'goatout.run.v1';
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
    this.hazards = []; this.runes = []; this.houndTold = false;
    this.cam = { x: 0, y: 0, zoom: 1 }; this.shakeAmt = 0; this.shakeX = 0; this.shakeY = 0;
    // juice: a directional camera punch, a lens shove, a screen flash and a kill counter
    this.kickX = 0; this.kickY = 0; this.zoomKick = 0; this.flashAmt = 0; this.flashColor = PALETTE.bone;
    this.combo = 0; this.comboTimer = 0; this.barkCd = 0; this.cageOpen = false; this.cageLunge = -1;
    this.hitstopTimer = 0; this.timeScale = 1; this.slowTimer = 0; this.hurt = null;
    this.kills = 0; this.totalKills = 0; this.timer = 0; this.deaths = 0;
    this.boons = []; this.mods = Object.assign({}, BOON_BASE); this.tomes = []; this.boonChoice = null; this.boonRects = [];
    this.dev = { open: false, god: false, rects: [], toast: null };
    this.intro = null;      // the opening scene while it plays; see beginIntro
    this.stairFx = null;    // the goat on a flight of stairs: { t, dir } with dir 1 going up and out, -1 arriving
    this.state = 'title'; this.card = null; this.cardQueue = []; this.stateTimer = 0;
    // The first screen: two ways in, and whatever run the browser still remembers behind the second.
    this.menu = { index: 0, rects: [], t: 0, shake: 0 }; this.save = null;
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
    if (this.goat) { this.goat.maxHp = this.mods.maxHp; this.goat.hp = Math.min(this.goat.hp, this.goat.maxHp); }
  }
  dropTome(x, y) {
    // A boss can fall against a wall, and a tome inside one is a tome nobody can reach.
    const w = this.world;
    let px = x, py = y;
    const ok = (ax, ay) => w.tileAtPx(ax, ay) !== T.WALL && w.flowDist(ax, ay) >= 0;
    if (w && !ok(px, py)) {
      let found = false;
      for (let ring = 1; ring <= 7 && !found; ring++) {
        for (let a = 0; a < 16 && !found; a++) {
          const ang = a / 16 * Math.PI * 2;
          const nx = x + Math.cos(ang) * ring * TILE * 0.7, ny = y + Math.sin(ang) * ring * TILE * 0.7;
          if (ok(nx, ny)) { px = nx; py = ny; found = true; }
        }
      }
      if (!found) { px = this.goat.x; py = this.goat.y; }
    }
    this.tomes.push({ x: px, y: py, r: TUNING.tome.r, phase: Math.random() * 6, life: 0 });
  }
  // A tome offers three of one kind: actives change what a button does, passives sharpen everything.
  // The first tome always offers actives, so every run picks a skill before it picks numbers.
  openBoonChoice() {
    const actives = BOONS.filter((b) => b.active && !this.boons.includes(b));
    const passives = BOONS.filter((b) => !b.active && !this.boons.includes(b));
    if (!actives.length && !passives.length) { this.goat.hp = Math.min(this.goat.maxHp, this.goat.hp + 1); return; }
    const hasActive = this.boons.some((b) => b.active);
    let pool, other;
    if (actives.length && (!hasActive || Math.random() < 0.4)) { pool = actives.slice(); other = passives.slice(); }
    else if (passives.length) { pool = passives.slice(); other = actives.slice(); }
    else { pool = actives.slice(); other = []; }
    const pick = [];
    while (pick.length < 3 && pool.length) pick.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    while (pick.length < 3 && other.length) pick.push(other.splice((Math.random() * other.length) | 0, 1)[0]);
    this.boonChoice = pick;
    this.boonKind = pick[0] && pick[0].active ? 'SKILL' : 'BLESSING';
    this.state = 'boon'; this.card = null; this.audio.sfxCard(); this.vibe(30);
  }
  takeBoon(i) {
    const b = this.boonChoice && this.boonChoice[i];
    if (!b) return;
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
    return false;
  }
  devToast(text) { this.dev.toast = { text, life: 1.6 }; }
  devAction(id) {
    if (id === 'toggle') { this.dev.open = !this.dev.open; return; }
    if (id === 'god') { this.dev.god = !this.dev.god; this.devToast(this.dev.god ? 'GOD MODE ON' : 'GOD MODE OFF'); return; }
    if (this.state !== 'play' || !this.world) return;
    if (id === 'heal') { this.goat.hp = this.goat.maxHp; this.devToast('HEALED'); return; }
    if (id === 'tome') { this.dropTome(this.goat.x + 28, this.goat.y); this.devToast('TOME DROPPED'); return; }
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
      // anyPressed skips the opening scene; muting should not
      this.keys.add(e.code); if (e.code !== 'KeyM') this.input.anyPressed = true; this.touch.active = false;
      if (e.code === 'Space') { this.input.spacePressed = true; e.preventDefault(); }
      if (e.code === 'Backspace') { e.preventDefault(); this.restartLevel(); }
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
        for (let i = 0; i < this.boonRects.length; i++) {
          const r = this.boonRects[i];
          if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { this.takeBoon(i); return; }
        }
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
      if (e.pointerType === 'mouse') { if (e.button === 2) this.input.rmbDown = false; return; }
      this.touch.up(e.pointerId);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    window.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse' && e.button === 2) this.input.rmbDown = false; });
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
    if (!keepBoons) { this.boons = []; }
    this.levelIndex = index;
    const def = LEVELS[index];
    this.level = generateLevel(def, seed >>> 0);
    this.world = new World(this.level);
    this.goat = new Goat(this.level.start.x, this.level.start.y);
    this.enemies = this.level.spawns.map((s) => {
      const e = new Enemy(s.x, s.y, s.kind);
      if (s.elite) { e.elite = true; e.hp = TUNING.elite.hp; e.maxHp = e.hp; }
      // The brute: three killing blows, four if he is the one standing in the arena. Bigger frame,
      // spiked shoulders, a spiked mask and a studded club, so you never mistake him for a clubman.
      if (s.champion) { e.elite = true; e.champion = true; e.hp = s.boss ? TUNING.champion.bossHp : TUNING.champion.hp; e.maxHp = e.hp; }
      // A rifle posted to watch a door has no blind side worth walking round.
      if (s.alert) e.watchful = true;
      if (s.boss) e.boss = true;
      return e;
    });
    this.props = this.level.props.map((p) => new Prop(p.x, p.y, p.kind, p));
    this.hazards = this.props.filter((p) => p.kind === 'brazier' || p.kind === 'mill');
    this.runes = []; this.houndTold = false;
    this.bullets = []; this.parts = []; this.floats = []; this.rings = []; this.hurt = null;
    this.tomes = []; this.boonChoice = null; this.breathFx = null; this.applyBoons(); this.goat.hp = this.goat.maxHp;
    this.cam.x = this.goat.x; this.cam.y = this.goat.y; this.cam.zoom = this.renderer.zoomFit;
    this.kills = 0; this.timer = 0; this.timeScale = 1; this.slowTimer = 0;
    this.kickX = 0; this.kickY = 0; this.zoomKick = 0; this.flashAmt = 0;
    this.combo = 0; this.comboTimer = 0; this.barkCd = 0; this.cageOpen = false; this.cageLunge = -1;
    this.audio.intensity = 0; this.audio.hunterAware = false;
    this.world.computeFlow(this.goat.x, this.goat.y);
    // Arriving up the stairs: the goat rises into the room under the card.
    if (this.intro) this.audio.duck(1, 0.3);   // Backspace out of the scene must not leave the sound down
    this.intro = null; this.stairFx = this.level.entry ? { t: -0.45, dir: -1 } : null;
    // Every level starts by writing the run down: that head is what CONTINUE comes back to.
    this.saveRun(); this.showHelp(true);
    if (withIntro && def.ritual && def.startCage) { this.beginIntro(); return; }
    this.state = 'card';
    // A new level puts every heart back. The card is where the goat finds that out.
    const lines = [def.sub.toUpperCase(), def.name];
    if (index > 0 || keepBoons) lines.push('', this.goat.maxHp + ' hearts again');
    this.card = { lines, dim: 0.6, size: 40, small: 2 }; this.stateTimer = 1.3;
    this.audio.sfxCard();
  }
  restartLevel() {
    if (this.state === 'title') return;
    this.startLevel(this.levelIndex, (Math.random() * 1e9) | 0);
  }

  // ---------- the first screen ----------
  // Two buttons and the name of the game. Nothing is explained here: the opening scene carries the
  // story and the floor of level 1 carries the controls, so the menu only has to be a way in.
  showTitle() {
    this.state = 'title'; this.card = null; this.level = null; this.world = null; this.goat = null;
    this.enemies = []; this.props = []; this.bullets = []; this.tomes = [];
    this.save = this.loadRun();
    // A run waiting to be picked up is the likelier intent, so the keyboard starts on it.
    this.menu = { index: this.save ? 1 : 0, rects: [], t: 0, shake: 0 };
    this.showHelp(false);
  }
  updateTitle(dt) {
    this.menu.t += dt; this.menu.shake = Math.max(0, this.menu.shake - dt);
    // The mouse chooses what it is over; the keyboard chooses what it was left on.
    if (!this.touch.active) { const i = this.menuAt(this.input.mouse); if (i >= 0) this.menu.index = i; }
  }
  menuAt(p) {
    const r = this.menu.rects;
    for (let i = 0; i < r.length; i++) if (p.x >= r[i].x && p.x <= r[i].x + r[i].w && p.y >= r[i].y && p.y <= r[i].y + r[i].h) return i;
    return -1;
  }
  // The menu answers the keys the game already uses: run up and down it, headbutt to choose.
  menuKey(code) {
    if (code === 'KeyW' || code === 'ArrowUp' || code === 'KeyS' || code === 'ArrowDown') {
      this.menu.index = this.menu.index ? 0 : 1; this.audio.sfxSwing();
    } else if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter') this.menuPick(this.menu.index);
  }
  menuPick(i) {
    this.menu.index = i;
    // Nothing to come back to: the button shakes its head and stays where it is.
    if (i === 1 && !this.save) { this.menu.shake = 0.35; this.audio.sfxThud(); return; }
    this.audio.sfxCard();
    if (i === 1) { this.resumeRun(); return; }
    this.clearRun(); this.boons = []; this.totalKills = 0; this.deaths = 0;
    this.startLevel(0, (Math.random() * 1e9) | 0, false, true);
  }
  // CONTINUE is the head of the furthest level the run reached, with the tomes it was carrying there.
  resumeRun() {
    const s = this.save; if (!s) return;
    this.boons = (s.boons || []).map((id) => BOONS.find((b) => b.id === id)).filter(Boolean);
    this.totalKills = s.totalKills || 0; this.deaths = s.deaths || 0;
    this.startLevel(clamp(s.level | 0, 0, LEVELS.length - 1), (Math.random() * 1e9) | 0, true);
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
    this.save = { v: 1, level: this.levelIndex, boons: this.boons.map((b) => b.id), totalKills: this.totalKills, deaths: this.deaths, at: Date.now() };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch (err) { /* private mode: the run dies with the tab */ }
  }
  clearRun() {
    this.save = null;
    try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* nothing to be done about it */ }
  }
  // The page's control line belongs to the game, not to the menu.
  showHelp(on) {
    const el = typeof document !== 'undefined' && document.getElementById('help');
    if (el) el.style.display = on ? '' : 'none';
  }
  onGoatDied() {
    this.deaths++; this.state = 'dead'; this.stateTimer = 0.9; this.slowTimer = 1.4;
    this.audio.intensity = 0; this.audio.hunterAware = false; this.audio.sfxToll();
    const lost = this.boons.length ? `${this.boons.length} tome${this.boons.length === 1 ? '' : 's'} lost` : 'no tomes to lose';
    this.card = { lines: ['THE GOAT DIED', '', `${lost} · ${this.tapWord.toLowerCase()} to try again`], dim: 0.55, size: 40, small: true, color: PALETTE.blood };
    this.shake(12); this.vibe(70);
  }
  levelCleared() {
    this.state = 'clear'; this.totalKills += this.kills;
    this.audio.intensity = 0; this.audio.hunterAware = false; this.audio.sfxCard();
    this.cardQueue = [
      { lines: ['Do you want sacrifices?'], dim: 0.75, size: 34, time: 1.4 },
      { lines: ['You will get sacrifices!'], dim: 0.85, size: 40, time: 1.6, color: PALETTE.blood },
      { lines: [`${this.kills} sacrificed in ${this.timer.toFixed(1)}s`], dim: 0.9, size: 26, time: 1.4 },
    ];
    this.nextCard();
  }
  nextCard() {
    const c = this.cardQueue.shift();
    if (c) { this.card = c; this.stateTimer = c.time; if (c.color) this.audio.sfxCard(); return; }
    if (this.levelIndex + 1 < LEVELS.length) this.startLevel(this.levelIndex + 1, (Math.random() * 1e9) | 0, true);
    else {
      this.state = 'win'; this.clearRun();
      this.card = { lines: ['THE GOAT ESCAPED.', '', `${this.totalKills} sacrificed · ${this.deaths} death${this.deaths === 1 ? '' : 's'}`, `${this.tapWord.toLowerCase()} to run again`], dim: 1, size: 40, small: 2 };
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
  }

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
    this.readMoveInput();
    if (this.state === 'title') { this.updateTitle(dt); this.clearEdges(); return; }
    if (this.state === 'intro') { this.updateIntro(dt); this.clearEdges(); return; }
    if (this.state === 'climb') { this.updateClimb(dt); this.clearEdges(); return; }
    if (this.state === 'card') { this.stateTimer -= dt; this.updateEffects(dt); if (this.stateTimer <= 0) { this.card = null; this.state = 'play'; } }
    if (this.state === 'dead') { this.stateTimer -= dt; this.updateEffects(dt); if (this.stateTimer <= 0 && (this.input.lmbPressed || this.input.spacePressed)) this.restartLevel(); this.clearEdges(); return; }
    if (this.state === 'clear') { this.stateTimer -= dt; this.updateEffects(dt); if (this.stateTimer <= 0) this.nextCard(); this.clearEdges(); return; }
    if (this.state === 'boon') { this.updateEffects(dt); this.clearEdges(); return; }
    if (this.state === 'win') { if (this.input.lmbPressed) { this.totalKills = 0; this.deaths = 0; this.startLevel(0, (Math.random() * 1e9) | 0, false, true); } this.clearEdges(); return; }
    if (this.state !== 'play') { this.clearEdges(); return; }

    if (this.hitstopTimer > 0) { this.hitstopTimer -= dt; this.clearEdges(); return; }
    this.timer += dt;
    const w = this.world;
    w.flowTimer -= dt;
    if (w.flowTimer <= 0) { w.flowTimer = 0.15; w.computeFlow(this.goat.x, this.goat.y); }

    this.runes.length = 0;
    for (const e of this.enemies) if (e.rune) this.runes.push(e.rune);
    this.goat.update(dt, this);
    for (const e of this.enemies) e.update(dt, this);
    for (const b of this.bullets) b.update(dt, this);
    for (const p of this.props) p.update(dt, this);
    this.collideEntities(dt);
    w.updateFire(dt);
    w.noises.length = 0;
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.updateEffects(dt);

    for (const tm of this.tomes) {
      tm.life += dt;
      if (this.goat.dead || tm.taken) continue;
      if (Math.hypot(tm.x - this.goat.x, tm.y - this.goat.y) < TUNING.tome.pickupR + this.goat.r) {
        tm.taken = true; this.particles(tm.x, tm.y, 18, PALETTE.fireHi, 180); this.ring(tm.x, tm.y, 3 * TILE, PALETTE.fireHi);
        this.openBoonChoice(); this.clearEdges(); return;
      }
    }
    this.tomes = this.tomes.filter((tm) => !tm.taken);
    for (const p of this.props) {
      if (p.kind !== 'heal' || p.broken || this.goat.dead) continue;
      if (this.goat.hp >= this.goat.maxHp) continue;
      if (Math.hypot(p.x - this.goat.x, p.y - this.goat.y) > TUNING.prop.heal.pickupR + this.goat.r) continue;
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
    this.audio.intensity = aware === 0 ? 0 : aware <= 2 ? 1 : aware <= 4 ? 2 : 3;
    this.audio.hunterAware = hunter;
    this.clearEdges();
  }

  // ---------- the opening scene, beat by beat ----------
  updateIntro(dt) {
    const I = TUNING.intro, it = this.intro, g = this.goat, s = it.sheep, S = it.S, ph = it.phase;
    if (this.hitstopTimer > 0) { this.hitstopTimer -= dt; return; }
    it.t += dt; it.timer += dt;
    if (this.input.anyPressed && it.t > I.skipAfter && ph !== 'black' && ph !== 'wake') { this.skipIntro(); return; }

    // the camera creeps in the whole time they are in the room
    const push = clamp(it.t / 9, 0, 1);
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
      else if (it.timer - it.arrived > 0.7) this.introPhase('gate');
    }
  }

  // He puts a boot to the bars and they go over.
  introGate(dt) {
    const it = this.intro, I = TUNING.intro, p = clamp(it.timer / I.gate, 0, 1);
    for (const b of it.gate) b.gate = p;
    it.knife.x = it.stand.x - Math.sin(p * Math.PI) * 9;
    if (!it.clank && p > 0.5) { it.clank = true; this.audio.sfxCageHit(); this.shake(3); for (const b of it.gate) this.particles(b.x, b.y, 3, PALETTE.ash, 90); }
    if (it.timer >= I.gate + 0.25) this.introPhase('grab');
  }

  // camera: follow, lead toward the aim, pull back a little at speed
  updateCamera(dt) {
    const w = this.world;
    const spd = Math.hypot(this.goat.vx, this.goat.vy) / TUNING.goat.speed;
    const lead = TUNING.camera.lead * (this.touch.active ? 0.7 : 1);
    const cx = this.goat.x + this.input.aim.x * lead, cy = this.goat.y + this.input.aim.y * lead;
    const k = 1 - Math.exp(-TUNING.camera.lerp * dt);
    this.cam.x += (cx - this.cam.x) * k; this.cam.y += (cy - this.cam.y) * k;
    const targetZoom = this.renderer.zoomFit * lerp(TUNING.camera.zoomRest, TUNING.camera.zoomFast, clamp(spd, 0, 1));
    this.cam.zoom += (targetZoom - this.cam.zoom) * (1 - Math.exp(-TUNING.camera.zoomLerp * dt));
    const v = this.renderer.view(this.cam);
    this.cam.x = clamp(this.cam.x, v.w / 2, w.W * TILE - v.w / 2);
    this.cam.y = clamp(this.cam.y, v.h / 2, w.H * TILE - v.h / 2);
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
    if (since > 0.3 && !it.lunged) {
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
    this.introPhase('black'); it.timer = 0.5;
  }
  endIntro() {
    const g = this.goat;
    this.enemies = this.enemies.filter((e) => !e.scripted);
    for (const p of this.props) if (p.kind === 'cage') p.gate = 0;
    g.state = 'idle'; g.timer = 0; g.vx = 0; g.vy = 0; g.jitter = null; g.path = null; g.hp = g.maxHp;
    if (g.dazed > 50) g.dazed = TUNING.intro.stars;
    this.intro = null; this.card = null; this.timer = 0; this.slowTimer = 0; this.state = 'play';
    this.audio.duck(1, 0.5); this.world.computeFlow(g.x, g.y);
  }

  // ---------- the stairs out ----------
  // The exit is a flight up. The goat takes it for a moment, into the light, before the cards.
  beginClimb() {
    this.state = 'climb'; this.stateTimer = TUNING.stairs.climb; this.stairFx = { t: 0, dir: 1 };
    const g = this.goat; g.state = 'idle'; g.facing = 0;
    if (g.holding) { const h = g.holding; h.held = false; g.holding = null; if (h.kind !== 'pot') { h.state = 'floored'; h.timer = 0.6; } }
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
      }
    }
    for (const e of en) {
      if (e.dead || e.held || e.ghosted || g.dead) continue;
      const dx = e.x - g.x, dy = e.y - g.y, d = Math.hypot(dx, dy), min = e.r + g.r;
      if (d >= min || d === 0) continue;
      const nx = dx / d, ny = dy / d, push = (min - d);
      if (e.kind === 'butcher') { g.x -= nx * push; g.y -= ny * push; }
      else { g.x -= nx * push * 0.4; g.y -= ny * push * 0.4; e.x += nx * push * 0.6; e.y += ny * push * 0.6; }
    }
    for (const p of this.props) {
      if (p.broken) continue;
      if (p.item) {
        if (p.kind === 'pot' && p.flung) for (const e of en) { if (!e.dead && !e.held && e.state === 'flung' && Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) { p.shatter(this); break; } }
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
        if (e.state === 'flung' && p.kind === 'bell' && -vn > 3 * TILE) p.ring(this);
        if (e.state === 'flung' && -vn > TUNING.prop.door.smashSpeed && p.kind === 'door') { p.smash(this, -nx, -ny); continue; }
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
  flungHits(f, other, nx, ny) {
    if (f.thrown && other.kind !== 'butcher') { other.die(this, 'splat', nx, ny); f.vx *= 0.55; f.vy *= 0.55; }
    else if (other.kind === 'butcher') { other.state = 'stagger'; other.timer = 0.3; f.vx *= -0.3; f.vy *= -0.3; }
    else {
      other.state = 'floored'; other.timer = TUNING.bearer.flooredTime; other.aware = true;
      other.vx = f.vx * 0.5; other.vy = f.vy * 0.5; f.vx *= 0.5; f.vy *= 0.5;
      other.x += nx * 4; other.y += ny * 4;
      this.audio.sfxThud();
    }
  }
  touchingBrazier(e) {
    for (const p of this.props) if (p.kind === 'brazier' && !p.broken && Math.hypot(p.x - e.x, p.y - e.y) < p.r + e.r + 3) return true;
    return false;
  }

  // ---------- helpers used by entities ----------
  fireBullet(shooter, dx, dy) {
    const s = TUNING.hunter.bulletSpeed;
    this.bullets.push(new Bullet(shooter.x + dx * (shooter.r + 16), shooter.y + dy * (shooter.r + 16), dx * s, dy * s));
    this.audio.sfxGunshot(); this.world.emitNoise(shooter.x, shooter.y, TUNING.noise.gunshot);
    this.particles(shooter.x + dx * (shooter.r + 16), shooter.y + dy * (shooter.r + 16), 4, PALETTE.fireHi, 120); this.shake(1.5);
  }
  meleeHit(att, reach, arc, damage, knock, skipGoat) {
    const g = this.goat;
    const inArc = (o) => { const dx = o.x - att.x, dy = o.y - att.y, d = Math.hypot(dx, dy); return d < reach + o.r && Math.abs(angleDiff(att.facing, Math.atan2(dy, dx))) < arc / 2; };
    const dirx = Math.cos(att.facing), diry = Math.sin(att.facing);
    if (!g.dead && !skipGoat) {
      if (g.holding && !g.holding.item && inArc(g.holding)) { const h = g.holding; this.floatText(h.x, h.y - 26, 'SHIELD', PALETTE.bone); h.die(this, 'club', dirx, diry); }
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
