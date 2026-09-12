// Game: state machine, fixed-step loop, pointer/keyboard/touch input, entity collisions, effects, cards.
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
    this.cam = { x: 0, y: 0, zoom: 1 }; this.shakeAmt = 0; this.shakeX = 0; this.shakeY = 0;
    this.hitstopTimer = 0; this.timeScale = 1; this.slowTimer = 0; this.hurt = null;
    this.kills = 0; this.totalKills = 0; this.timer = 0; this.deaths = 0;
    this.boons = []; this.mods = Object.assign({}, BOON_BASE); this.tomes = []; this.boonChoice = null; this.boonRects = [];
    this.dev = { open: false, god: false, rects: [], toast: null };
    this.state = 'prologue'; this.card = null; this.cardQueue = []; this.stateTimer = 0;
    this.layoutTouch();
    this.bindInput();
    this.showPrologue();
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
  dropTome(x, y) { this.tomes.push({ x, y, r: TUNING.tome.r, phase: Math.random() * 6, life: 0 }); }
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
    this.boons.push(b); this.applyBoons();
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
      this.keys.add(e.code); this.input.anyPressed = true; this.touch.active = false;
      if (e.code === 'Space') { this.input.spacePressed = true; e.preventDefault(); }
      if (e.code === 'Backspace') { e.preventDefault(); this.restartLevel(); }
      if (e.code === 'KeyM') this.audio.toggleMute();
      if (e.code === 'KeyN' && this.state === 'play') this.levelCleared();
      if (e.code === 'KeyE') this.input.rollPressed = true;
      if (this.state === 'boon') { if (e.code === 'Digit1') this.takeBoon(0); if (e.code === 'Digit2') this.takeBoon(1); if (e.code === 'Digit3') this.takeBoon(2); }
      wake();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    c.addEventListener('pointerdown', (e) => {
      wake(); e.preventDefault();
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      const p = this.canvasPos(e);
      if (this.hitDev(p)) return;
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
  startLevel(index, seed, keepBoons) {
    if (!keepBoons) { this.boons = []; }
    this.levelIndex = index;
    const def = LEVELS[index];
    this.level = generateLevel(def, seed >>> 0);
    this.world = new World(this.level);
    this.goat = new Goat(this.level.start.x, this.level.start.y);
    this.enemies = this.level.spawns.map((s) => {
      const e = new Enemy(s.x, s.y, s.kind);
      if (s.elite) { e.elite = true; e.hp = TUNING.elite.hp; }
      if (s.boss) e.boss = true;
      return e;
    });
    this.props = this.level.props.map((p) => new Prop(p.x, p.y, p.kind, p));
    this.bullets = []; this.parts = []; this.floats = []; this.rings = []; this.hurt = null;
    this.tomes = []; this.boonChoice = null; this.breathFx = null; this.applyBoons(); this.goat.hp = this.goat.maxHp;
    this.cam.x = this.goat.x; this.cam.y = this.goat.y; this.cam.zoom = this.renderer.zoomFit;
    this.kills = 0; this.timer = 0; this.timeScale = 1; this.slowTimer = 0;
    this.audio.intensity = 0; this.audio.hunterAware = false;
    this.world.computeFlow(this.goat.x, this.goat.y);
    this.state = 'card';
    this.card = { lines: [def.sub.toUpperCase(), def.name], dim: 0.6, size: 40 }; this.stateTimer = 1.3;
    this.audio.sfxCard();
  }
  restartLevel() {
    if (this.state === 'prologue') return;
    this.startLevel(this.levelIndex, (Math.random() * 1e9) | 0);
  }
  showPrologue() {
    this.state = 'prologue';
    const how = this.coarse
      ? 'Left thumb to run · BUTT to headbutt · hold GRAB, release to throw · ROLL to tumble · BAAH to scream'
      : 'WASD to run · mouse to aim · left click headbutt · hold right click to grab, release to throw · E to roll · space to scream';
    this.card = { lines: ['They were driving the goat to the altar.', 'The truck fell off the bridge.', 'Four men died.', 'The goat survived.', '', how, `${this.tapWord} TO ESCAPE`], dim: 1, size: 26, small: 5 };
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
      { lines: ['Will there be sacrifices?'], dim: 0.75, size: 34, time: 1.4 },
      { lines: ['There will be sacrifices.'], dim: 0.85, size: 40, time: 1.6, color: PALETTE.blood },
      { lines: [`${this.kills} sacrificed in ${this.timer.toFixed(1)}s`], dim: 0.9, size: 26, time: 1.4 },
    ];
    this.nextCard();
  }
  nextCard() {
    const c = this.cardQueue.shift();
    if (c) { this.card = c; this.stateTimer = c.time; if (c.color) this.audio.sfxCard(); return; }
    if (this.levelIndex + 1 < LEVELS.length) this.startLevel(this.levelIndex + 1, (Math.random() * 1e9) | 0, true);
    else {
      this.state = 'win';
      this.card = { lines: ['THE GOAT ESCAPED.', '', `${this.totalKills} sacrificed · ${this.deaths} death${this.deaths === 1 ? '' : 's'}`, `${this.tapWord.toLowerCase()} to run again`], dim: 1, size: 40, small: 2 };
    }
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
    if (this.state === 'prologue') { if (this.input.lmbPressed) this.startLevel(0, (Math.random() * 1e9) | 0); this.clearEdges(); return; }
    if (this.state === 'card') { this.stateTimer -= dt; if (this.stateTimer <= 0) { this.card = null; this.state = 'play'; } }
    if (this.state === 'dead') { this.stateTimer -= dt; this.updateEffects(dt); if (this.stateTimer <= 0 && (this.input.lmbPressed || this.input.spacePressed)) this.restartLevel(); this.clearEdges(); return; }
    if (this.state === 'clear') { this.stateTimer -= dt; this.updateEffects(dt); if (this.stateTimer <= 0) this.nextCard(); this.clearEdges(); return; }
    if (this.state === 'boon') { this.updateEffects(dt); this.clearEdges(); return; }
    if (this.state === 'win') { if (this.input.lmbPressed) { this.totalKills = 0; this.deaths = 0; this.startLevel(0, (Math.random() * 1e9) | 0); } this.clearEdges(); return; }
    if (this.state !== 'play') { this.clearEdges(); return; }

    if (this.hitstopTimer > 0) { this.hitstopTimer -= dt; this.clearEdges(); return; }
    this.timer += dt;
    const w = this.world;
    w.flowTimer -= dt;
    if (w.flowTimer <= 0) { w.flowTimer = 0.15; w.computeFlow(this.goat.x, this.goat.y); }

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
    if (!this.goat.dead && w.tileAtPx(this.goat.x, this.goat.y) === T.EXIT) { this.levelCleared(); this.clearEdges(); return; }

    // camera: follow, lead toward the aim, pull back a little at speed
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

    // music intensity from threat
    let aware = 0, hunter = false;
    for (const e of this.enemies) {
      if (e.dead || !e.aware || e.state === 'idle') continue;
      if (Math.hypot(e.x - this.goat.x, e.y - this.goat.y) > 16 * TILE) continue;
      aware++; if (e.kind === 'hunter') hunter = true;
    }
    this.audio.intensity = aware === 0 ? 0 : aware <= 2 ? 1 : aware <= 4 ? 2 : 3;
    this.audio.hunterAware = hunter;
    this.clearEdges();
  }

  updateEffects(dt) {
    this.shakeAmt = Math.max(0, this.shakeAmt - TUNING.juice.shakeDecay * dt * Math.max(1, this.shakeAmt * 0.3));
    this.shakeX = (Math.random() - 0.5) * 2 * this.shakeAmt; this.shakeY = (Math.random() - 0.5) * 2 * this.shakeAmt;
    for (const p of this.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; }
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
      const a = en[i]; if (a.dead || a.held) continue;
      for (let j = i + 1; j < en.length; j++) {
        const b = en[j]; if (b.dead || b.held) continue;
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
      if (e.dead || e.held || g.dead) continue;
      const dx = e.x - g.x, dy = e.y - g.y, d = Math.hypot(dx, dy), min = e.r + g.r;
      if (d >= min || d === 0) continue;
      const nx = dx / d, ny = dy / d, push = (min - d);
      if (e.kind === 'butcher') { g.x -= nx * push; g.y -= ny * push; }
      else { g.x -= nx * push * 0.4; g.y -= ny * push * 0.4; e.x += nx * push * 0.6; e.y += ny * push * 0.6; }
    }
    for (const p of this.props) {
      if (p.broken) continue;
      if (p.kind === 'pot') {
        if (p.flung) for (const e of en) { if (!e.dead && !e.held && e.state === 'flung' && Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) { p.shatter(this); break; } }
        continue;
      }
      if (!p.blocking) continue;
      const all = [g].concat(en);
      for (const e of all) {
        if (e.dead || e.held) continue;
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
      if (g.holding && g.holding.kind !== 'pot' && inArc(g.holding)) { const h = g.holding; this.floatText(h.x, h.y - 26, 'SHIELD', PALETTE.bone); h.die(this, 'club', dirx, diry); }
      else if (inArc(g)) g.damage(damage, this, dirx * knock * 4, diry * knock * 4);
    }
    for (const e of this.enemies) {
      if (e === att || e.dead || e.held || e.state === 'flung') continue;
      if (!inArc(e)) continue;
      if (e === g.holding) continue;
      if (att.kind === 'butcher') { e.fling(dirx * 14 * TILE, diry * 14 * TILE, false); this.floatText(e.x, e.y - 26, 'OOPS', PALETTE.bone); }
      else if (e.kind !== 'butcher' && Math.random() < 0.7) { e.state = 'floored'; e.timer = 0.6; e.aware = true; this.floatText(e.x, e.y - 26, 'OOPS', PALETTE.bone); }
    }
  }
  onKill(e, cause) {
    this.kills++;
    this.hitstop(TUNING.juice.hitstop); this.shake(e.kind === 'butcher' ? 14 : TUNING.juice.shakeKill);
    if (e.kind === 'butcher') { this.audio.sfxBell(); this.floatText(e.x, e.y - 44, 'THE BUTCHER IS DOWN', PALETTE.fireHi); this.slowTimer = TUNING.juice.killSlow; this.vibe(40); }
    else { this.audio.sfxSplat(); this.vibe(12); }
    this.world.emitNoise(e.x, e.y, TUNING.noise.splat);
    this.particles(e.x, e.y, e.kind === 'butcher' ? 26 : 14, PALETTE.blood, 220);
  }
  hitstop(t) { this.hitstopTimer = Math.max(this.hitstopTimer, t); }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  vibe(ms) { if (this.coarse && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } } }
  hurtFlash(angle) { this.hurt = { angle, life: 0.6 }; this.vibe(35); }
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
