// Touch controls: a floating move stick on the left, action buttons on the right,
// plus a drag-anywhere-on-the-right manual aim. Sizes are in CSS pixels, scaled by the backing-store ratio.
// The gamepad (`PadInput`) is at the bottom of the file.
class TouchUI {
  constructor() {
    this.active = false;          // true once any touch/pen input is seen
    this.stick = null;            // {id, ox, oy, x, y}
    this.aimDrag = null;          // {id, ox, oy, x, y}
    this.buttons = {
      butt:   { r: 46, label: 'BUTT',  key: 'butt' },
      grab:   { r: 36, label: 'GRAB',  key: 'grab' },
      scream: { r: 29, label: 'BAAH',  key: 'scream' },
      roll:   { r: 29, label: 'ROLL',  key: 'roll' },
      // The fifth button: whichever verb artifact hangs at his neck. It has a position from the
      // first layout, same as the other four, but `itemReady` (set each step off `game.mods`) is
      // what keeps it out of `hitButton` and undrawn until there is something to put on it.
      item:   { r: 27, label: 'ITEM',  key: 'item' },
    };
    this.pressed = {};            // key -> pointerId
    this.buttPressed = false;     // edge: consumed by the game each step
    this.screamPressed = false;
    this.rollPressed = false;
    this.itemPressed = false;
    this.itemReady = false;       // a fifth key that does not exist until the shop puts something on it
    this.grabDown = false;
    this.stickRadius = 62;
  }

  // Positions depend on the canvas size, so they are recomputed every layout.
  // `vh` is the bottom of the play view: anything below it is the portrait control deck.
  layout(w, h, s, vh) {
    this.s = s; this.w = w; this.h = h; this.vh = vh === undefined ? h : vh;
    const b = this.buttons;
    for (const k in b) b[k].rr = b[k].r * s;
    const band = h - this.vh;
    if (band > 0) {
      b.butt.x = w - 80 * s; b.butt.y = this.vh + band * 0.56;
      b.grab.x = w - 186 * s; b.grab.y = this.vh + band * 0.62;
      b.scream.x = w - 62 * s; b.scream.y = this.vh + band * 0.17;
      b.roll.x = w - 168 * s; b.roll.y = this.vh + band * 0.2;
      b.item.x = w - 246 * s; b.item.y = this.vh + band * 0.42;
      this.stickHome = { x: 98 * s, y: this.vh + band * 0.52 };
    } else {
      const bottom = h - 52 * s;   // leaves the very corner free for the dev chip
      b.butt.x = w - 76 * s; b.butt.y = bottom - 54 * s;
      b.grab.x = w - 168 * s; b.grab.y = bottom - 42 * s;
      b.scream.x = w - 68 * s; b.scream.y = bottom - 152 * s;
      b.roll.x = w - 160 * s; b.roll.y = bottom - 140 * s;
      b.item.x = w - 232 * s; b.item.y = bottom - 96 * s;
      this.stickHome = { x: 96 * s, y: h - 96 * s };
    }
    this.stickR = this.stickRadius * s;
    this.splitX = w * 0.44;
  }

  // The nearest button whose ring the finger is in: on a short landscape screen BUTT's and GRAB's
  // rings overlap, and the first match made the edge of GRAB a headbutt.
  hitButton(x, y) {
    let best = null, bestD = Infinity;
    for (const k in this.buttons) {
      if (k === 'item' && !this.itemReady) continue;
      const b = this.buttons[k], d = hyp(x - b.x, y - b.y);
      if (d <= b.rr * 1.18 && d < bestD) { best = b; bestD = d; }
    }
    return best;
  }

  down(id, x, y, game) {
    this.active = true;
    const b = this.hitButton(x, y);
    if (b) {
      this.pressed[b.key] = id;
      if (b.key === 'butt') this.buttPressed = true;
      else if (b.key === 'scream') this.screamPressed = true;
      else if (b.key === 'roll') this.rollPressed = true;
      else if (b.key === 'item') this.itemPressed = true;
      else if (b.key === 'grab') this.grabDown = true;
      if (navigator.vibrate) navigator.vibrate(8);
      return;
    }
    if (x < this.splitX) { if (!this.stick) this.stick = { id, ox: x, oy: y, x, y }; return; }
    if (!this.aimDrag) this.aimDrag = { id, ox: x, oy: y, x, y };
  }

  move(id, x, y) {
    if (this.stick && this.stick.id === id) { this.stick.x = x; this.stick.y = y; }
    if (this.aimDrag && this.aimDrag.id === id) { this.aimDrag.x = x; this.aimDrag.y = y; }
    for (const k in this.pressed) {
      if (this.pressed[k] !== id) continue;
      const b = this.buttons[k];
      // Dragging off a held button steers the aim (standard mobile shooter pattern).
      if (k === 'grab') { const dx = x - b.x, dy = y - b.y; if (hyp(dx, dy) > b.rr * 0.6) this.buttonAim = { x: dx, y: dy }; }
    }
  }

  up(id) {
    if (this.stick && this.stick.id === id) this.stick = null;
    if (this.aimDrag && this.aimDrag.id === id) this.aimDrag = null;
    for (const k in this.pressed) {
      if (this.pressed[k] !== id) continue;
      delete this.pressed[k];
      if (k === 'grab') { this.grabDown = false; this.buttonAim = null; }
    }
  }

  clear() { this.stick = null; this.aimDrag = null; this.pressed = {}; this.grabDown = false; this.buttonAim = null; }

  // Movement vector in [-1, 1].
  moveVector() {
    if (!this.stick) return { x: 0, y: 0 };
    let dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy;
    const d = hyp(dx, dy);
    if (d < 6 * this.s) return { x: 0, y: 0 };
    const m = Math.min(1, d / this.stickR);
    return { x: (dx / d) * m, y: (dy / d) * m };
  }

  // Manual aim from the right-side drag or from dragging off the grab button; null means "use auto-aim".
  aimVector() {
    if (this.aimDrag) {
      const dx = this.aimDrag.x - this.aimDrag.ox, dy = this.aimDrag.y - this.aimDrag.oy;
      const d = hyp(dx, dy);
      if (d > 14 * this.s) return { x: dx / d, y: dy / d };
    }
    if (this.buttonAim) {
      const d = hyp(this.buttonAim.x, this.buttonAim.y) || 1;
      return { x: this.buttonAim.x / d, y: this.buttonAim.y / d };
    }
    return null;
  }

  consumeButt() { const v = this.buttPressed; this.buttPressed = false; return v; }
  consumeScream() { const v = this.screamPressed; this.screamPressed = false; return v; }
  consumeRoll() { const v = this.rollPressed; this.rollPressed = false; return v; }
  consumeItem() { const v = this.itemPressed; this.itemPressed = false; return v; }
}

// Snaps an aim direction onto a nearby enemy so thumbs don't have to be precise.
// `coneRad` and `reach` default to the thumb's; a pad's right stick passes its own, narrower pair.
function autoAim(game, dirx, diry, coneRad, reach) {
  const g = game.goat;
  const maxDist = (reach || TUNING.touchAim.reach) * TILE, cone = Math.cos(coneRad || TUNING.touchAim.cone);
  let best = null, bestScore = -Infinity;
  for (const e of game.enemies) {
    // Only a man the goat could mean: not mist, not a box or bowl of milk, not one out of sight
    // (behind a wall or a shut door, or in the fog), which turned the blow away from the real one.
    if (e.dead || e.held || e === g.holding || e.ghosted || e.state === 'hidden') continue;
    const dx = e.x - g.x, dy = e.y - g.y, d = hyp(dx, dy);
    if (d > maxDist || d < 1) continue;
    const dot = (dx * dirx + dy * diry) / d;
    if (dot < cone) continue;
    if (game.hidden(e.x, e.y) || !game.sees(g.x, g.y, e.x, e.y)) continue;
    const score = dot * 2 - d / maxDist;
    if (score > bestScore) { bestScore = score; best = { x: dx / d, y: dy / d }; }
  }
  return best || { x: dirx, y: diry };
}

// A gamepad on the browser's standard mapping. It adds no verb (ground rule 1): every button is one
// the keyboard or the mouse already has, and the game reads it through the same `game.input` flags,
// so THE TRIP's swap (`tripInput`) scrambles a pad exactly as it scrambles a mouse. Polled once a
// frame (`Game.pollPad`); `active` says the pad has the controls, switched the way `touch.active` is.
const PAD_BTN = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, back: 8, start: 9, up: 12, down: 13, left: 14, right: 15 };
class PadInput {
  constructor() {
    this.active = false;          // the pad was the last thing touched
    this.pad = null;              // the Gamepad read this frame
    this.now = [];                // held, per button index
    this.was = [];
    this.ls = { x: 0, y: 0 };     // left stick after its dead zone, length 0..1
    this.rs = { x: 0, y: 0 };     // right stick raw
    this.nav = null;              // the menu direction held, and its repeat clock
    this.navT = 0;
    this.step = null;             // a menu step this frame: 'up' | 'down' | 'left' | 'right' | null
    this.touched = false;         // anything pressed or pushed this frame
  }

  // The first connected pad. False when there is none, so the frame can skip the rest.
  poll(dt) {
    let list = null;
    try { list = navigator.getGamepads ? navigator.getGamepads() : null; } catch (e) { list = null; }
    let p = null;
    // The first pad of the standard mapping; any other only if there is none (its axes are a guess).
    if (list) for (const g of list) if (g && g.connected !== false && (!p || (g.mapping === 'standard' && p.mapping !== 'standard'))) p = g;
    this.pad = p; this.was = this.now; this.step = null; this.touched = false;
    if (!p) { this.now = []; this.ls = { x: 0, y: 0 }; this.rs = { x: 0, y: 0 }; this.nav = null; return false; }
    const P = TUNING.pad;
    // A trigger is an axis on some pads and a half-pressed button on others: past `trigger` it is down.
    this.now = Array.from(p.buttons || [], (b) => !!b && (b.pressed || (b.value || 0) > P.trigger));
    const ax = (i) => (p.axes && Number.isFinite(p.axes[i]) ? p.axes[i] : 0);
    // A radial dead zone, then rescaled so the throw past it still runs 0..1: a walk, not a jump.
    const lx = ax(0), ly = ax(1), ll = hyp(lx, ly);
    if (ll <= P.dead) this.ls = { x: 0, y: 0 };
    else { const k = Math.min(1, (ll - P.dead) / (1 - P.dead)) / ll; this.ls = { x: lx * k, y: ly * k }; }
    this.rs = { x: ax(2), y: ax(3) };
    // A resting pad on the desk drifts a little; only a real push takes the controls off the keyboard.
    // A push is a stick past `wake` that is moving (`wakeMove`): an axis parked at the end of its
    // travel is not a thumb, and it used to take the controls back every frame they were given up.
    const was = this.raw || [lx, ly, this.rs.x, this.rs.y], raw = [lx, ly, this.rs.x, this.rs.y];
    const moving = raw.some((v, i) => Math.abs(v - was[i]) > P.wakeMove);
    this.raw = raw;
    // A device without the standard mapping (a wheel, a tablet, a HID gadget) whose axes jitter took
    // the aim and the grab off the mouse for good (3 Oct 2026); its sticks never wake it, only a button.
    const sticks = p.mapping === 'standard' && moving && (ll > P.wake || hyp(this.rs.x, this.rs.y) > P.wake);
    this.touched = this.any() || sticks;
    // The menu direction: the d-pad, or the left stick pushed well over. One step on the push, then
    // a repeat while it is held, the way a held arrow key walks a list.
    const d = this.held(PAD_BTN.up) || ly < -P.navAt ? 'up' : this.held(PAD_BTN.down) || ly > P.navAt ? 'down'
      : this.held(PAD_BTN.left) || lx < -P.navAt ? 'left' : this.held(PAD_BTN.right) || lx > P.navAt ? 'right' : null;
    if (d !== this.nav) { this.nav = d; this.navT = P.repeatAfter; this.step = d; }
    else if (d) { this.navT -= dt; if (this.navT <= 0) { this.navT = P.repeatEvery; this.step = d; } }
    return true;
  }

  held(i) { return !!this.now[i]; }
  pressed(i) { return !!this.now[i] && !this.was[i]; }
  any() { return this.now.some((v, i) => v && !this.was[i]); }

  // Movement: the left stick, or the d-pad for a thumb that prefers it.
  moveVector() {
    if (this.ls.x || this.ls.y) return this.ls;
    const x = (this.held(PAD_BTN.right) ? 1 : 0) - (this.held(PAD_BTN.left) ? 1 : 0);
    const y = (this.held(PAD_BTN.down) ? 1 : 0) - (this.held(PAD_BTN.up) ? 1 : 0);
    const l = hyp(x, y) || 1;
    return { x: x / l, y: y / l };
  }

  // The right stick as a direction, or null while it rests inside its dead zone.
  aimVector() {
    const d = hyp(this.rs.x, this.rs.y);
    return d > TUNING.pad.aimDead ? { x: this.rs.x / d, y: this.rs.y / d } : null;
  }

  // Where each verb lives. The two held verbs sit on the shoulders, a trigger and a bumper each, so
  // either finger has it; the headbutt is also on X for a player who keeps a thumb on the face.
  buttHeld() { return this.held(PAD_BTN.rt) || this.held(PAD_BTN.rb) || this.held(PAD_BTN.x); }
  buttPressed() { return this.pressed(PAD_BTN.rt) || this.pressed(PAD_BTN.rb) || this.pressed(PAD_BTN.x); }
  grabHeld() { return this.held(PAD_BTN.lt) || this.held(PAD_BTN.lb); }
  grabPressed() { return this.pressed(PAD_BTN.lt) || this.pressed(PAD_BTN.lb); }

  // `game.vibe` on a pad: its motors, when the browser lets us at them. Silent otherwise.
  rumble(ms) {
    const a = this.pad && this.pad.vibrationActuator, R = TUNING.pad.rumble;
    if (!a || !a.playEffect) return;
    const k = Math.max(R.min, Math.min(1, ms / R.full));
    try {
      const r = a.playEffect('dual-rumble', { startDelay: 0, duration: Math.round(ms * R.stretch), strongMagnitude: R.strong * k, weakMagnitude: R.weak * k });
      if (r && r.catch) r.catch(() => {});
    } catch (e) { /* a pad without the effect */ }
  }
}

// CONTROLS (SETTINGS → CONTROLS, 5 Oct 2026, playtest: "an option to rebind the keys"). No verb is added
// (pillar 1): the same nine things, each on whichever key or mouse button the player puts it on. A binding is
// a key's place (`e.code`) or `Mouse<n>` (0 left, 1 middle, 2 right, 3 / 4 the side buttons). The arrows always
// move, the menus keep their own keys, and KEYBOARD ONLY's J K L / Z X C stay where they are unless a binding
// takes one of them. `Game.keyPress` and the pointer handlers ask `acts(code)` in play and heaven only, so a card,
// a menu or the mirror never changes under a rebinding. Saved in the settings (`settings.binds`); every word that
// names a key is laid again off it (`bindLay` in render.js).
const KeyBind = {
  ACTS: [
    { id: 'up', name: 'MOVE UP' }, { id: 'down', name: 'MOVE DOWN' }, { id: 'left', name: 'MOVE LEFT' }, { id: 'right', name: 'MOVE RIGHT' },
    { id: 'butt', name: 'HEADBUTT' }, { id: 'grab', name: 'GRAB (HOLD), THROW (LET GO)' }, { id: 'roll', name: 'ROLL' },
    { id: 'scream', name: 'BAAH' }, { id: 'item', name: 'TALISMAN (WHEN IT HAS A USE)' },
  ],
  DEFAULT: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', butt: 'Mouse0', grab: 'Mouse2', roll: 'KeyE', scream: 'Space', item: 'KeyQ' },
  // Keys that already do something of their own everywhere (pause, restart, the book, mute, a photo, the
  // cards' digits, the stealth test's Alt) and the arrows, which always move: never put on a verb.
  RESERVED: /^(Escape|Backspace|Enter|NumpadEnter|Tab|KeyM|KeyI|KeyP|Digit[1-4]|F\d+|Meta|Alt|Arrow|ContextMenu|CapsLock)/,
  map: null,
  load(saved) {
    this.map = Object.assign({}, this.DEFAULT);
    if (saved && typeof saved === 'object') for (const a of this.ACTS) if (typeof saved[a.id] === 'string' && !this.RESERVED.test(saved[a.id])) this.map[a.id] = saved[a.id];
    return this.map;
  },
  code(act) { return (this.map || this.DEFAULT)[act]; },
  acts(code) { const m = this.map || this.DEFAULT, out = []; for (const a of this.ACTS) if (m[a.id] === code) out.push(a.id); return out; },
  // The `buttons` bit of a mouse button: the browser numbers the right one 2 but sets bit 2 for it, and the
  // middle one 1 but bit 4.
  mouseBit(n) { return [1, 4, 2, 8, 16][n] || 0; },
  // Is the button the act sits on held now: a key in `game.keys`, a mouse button in `game.mouseButtons`.
  held(game, act) {
    const c = this.code(act); if (!c) return false;
    if (c.startsWith('Mouse')) return !!((game.mouseButtons || 0) & this.mouseBit(+c.slice(5)));
    return game.keys.has(c);
  },
  isDefault() { const m = this.map || this.DEFAULT; return this.ACTS.every((a) => m[a.id] === this.DEFAULT[a.id]); },
  // A button pressed in play: each act sitting on it sets the very flag its default button sets, so every
  // reader downstream (the goat, heaven, THE TRIP's swap, the animals' answers) knows nothing of the rebinding.
  press(game, code) {
    const inp = game.input, acts = this.acts(code);
    for (const a of acts) {
      if (a === 'butt') inp.lmbPressed = true;
      else if (a === 'grab') { inp.rmbDown = true; inp.rmbPressed = true; }
      else if (a === 'roll') inp.rollPressed = true;
      else if (a === 'scream') inp.spacePressed = true;
      else if (a === 'item') inp.qPressed = true;
    }
    return acts.length > 0;
  },
  // What the key is called on the screen. `short` is for the caps under the rail's chips.
  name(code, short) {
    if (!code) return '?';
    const mouse = { Mouse0: 'LEFT M. CLICK', Mouse1: 'MIDDLE M. CLICK', Mouse2: 'RIGHT M. CLICK', Mouse3: 'MOUSE 4', Mouse4: 'MOUSE 5' };
    if (mouse[code]) return mouse[code];
    if (code === 'Space') return short ? 'SPC' : 'SPACE';
    const F = typeof KEY_FACE !== 'undefined' ? KEY_FACE : {};
    if (F[code]) return F[code];
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    if (/^Numpad/.test(code)) return 'NUM ' + code.slice(6).toUpperCase();
    const words = { ShiftLeft: 'SHIFT', ShiftRight: 'R. SHIFT', ControlLeft: 'CTRL', ControlRight: 'R. CTRL', Semicolon: ';', Quote: '\'', Comma: ',', Period: '.', Slash: '/', Backslash: '\\', BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`' };
    return words[code] || code.toUpperCase();
  },
  // Put `act` on `code`; whatever sat there takes the act's old button (a swap), so nothing is left unbound.
  set(game, act, code) {
    const m = this.map || this.load(), old = m[act];
    for (const a of this.ACTS) if (a.id !== act && m[a.id] === code) m[a.id] = old;
    m[act] = code;
    this.save(game);
  },
  reset(game) { this.map = Object.assign({}, this.DEFAULT); this.save(game); },
  save(game) {
    game.settings.binds = this.isDefault() ? undefined : Object.assign({}, this.map);
    game.saveSettings();
    if (typeof bindLay === 'function') bindLay();
  },

  // ---------- the panel (`menu.panel === 'controls'`, over the title or the pause) ----------
  // Rows: the nine acts, RESET, BACK. `menu.bindWait` is the row listening for a button.
  rows() { return this.ACTS.length + 2; },
  open(game) { const m = game.menu; m.panel = 'controls'; m.sub = 0; m.bindWait = -1; game.audio.sfxCard(); },
  close(game) { const m = game.menu; m.bindWait = -1; m.panel = 'settings'; m.sub = Math.max(0, SETTINGS.findIndex((r) => r.key === 'controls')); game.audio.sfxSwing(); },
  pick(game, i) {
    const m = game.menu; m.sub = i;
    if (i === this.ACTS.length) { this.reset(game); game.audio.sfxCard(); return; }
    if (i > this.ACTS.length) { this.close(game); return; }
    m.bindWait = i; m.bindNo = 0; game.audio.sfxSwing();
  },
  // The first button pressed while a row listens. Escape lets the row go unchanged; a reserved key is
  // refused with a word. Returns true when it took the press.
  listen(game, code) {
    const m = game.menu;
    if (!(m.panel === 'controls' && m.bindWait >= 0)) return false;
    if (code === 'Escape') { m.bindWait = -1; game.audio.sfxSwing(); return true; }
    if (this.RESERVED.test(code)) { m.bindNo = 1.4; return true; }
    this.set(game, this.ACTS[m.bindWait].id, code);
    m.bindWait = -1; game.audio.sfxCard();
    return true;
  },
  key(game, code) {
    const m = game.menu, n = this.rows();
    if (code === 'KeyW' || code === 'ArrowUp') { m.sub = (m.sub + n - 1) % n; game.audio.sfxSwing(); }
    else if (code === 'KeyS' || code === 'ArrowDown') { m.sub = (m.sub + 1) % n; game.audio.sfxSwing(); }
    else if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter') this.pick(game, m.sub);
    else if (code === 'Escape' || code === 'Backspace') this.close(game);
  },
  draw(R, game) {
    const ctx = R.ctx, s = R.ts, w = R.w, h = R.h, cx = w / 2, m = game.menu, n = this.rows();
    ctx.fillStyle = 'rgba(9,7,9,0.985)'; ctx.fillRect(0, 0, w, h);
    const gap = 8 * s, rowH = clamp((h * 0.82 - 70 * s) / n - gap, 30 * s, 52 * s);
    const bw = clamp(Math.min(w * 0.9, 560 * s), 260 * s, 600 * s), x0 = cx - bw / 2;
    const top = h / 2 - (n * (rowH + gap)) / 2 + 18 * s;
    ctx.textAlign = 'center'; ctx.fillStyle = PALETTE.ochre;
    ctx.font = `700 ${clamp(rowH * 0.5, 15 * s, 26 * s)}px ${FONT_SC}`;
    ctx.fillText('CONTROLS', cx, top - 26 * s);
    ctx.font = `${Math.max(11.5 * s, 12 * R.s)}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.55)';
    ctx.fillText('Click a row, then press the key or mouse button you want. ESC cancels.', cx, top - 8 * s);
    m.rects.length = 0;
    if (m.bindNo > 0) m.bindNo = Math.max(0, m.bindNo - 1 / 60);
    for (let i = 0; i < n; i++) {
      const y = top + i * (rowH + gap), sel = m.sub === i, wait = m.bindWait === i;
      m.rects.push({ x: x0, y, w: bw, h: rowH });
      ctx.fillStyle = wait ? '#5a3a1c' : sel ? '#4a2428' : '#190f16'; ctx.fillRect(x0, y, bw, rowH);
      ctx.strokeStyle = wait ? PALETTE.ochre : sel ? PALETTE.blood : 'rgba(239,230,208,0.2)'; ctx.lineWidth = 2 * s;
      ctx.strokeRect(x0, y, bw, rowH);
      const ty = y + rowH * 0.64;
      if (i >= this.ACTS.length) {
        ctx.textAlign = 'center'; ctx.fillStyle = PALETTE.bone; ctx.font = `700 ${15 * s}px ${FONT_SC}`;
        ctx.fillText(i === this.ACTS.length ? 'RESET TO DEFAULT' : 'BACK', cx, ty);
        continue;
      }
      const a = this.ACTS[i];
      ctx.textAlign = 'left'; ctx.fillStyle = PALETTE.bone; ctx.font = `700 ${14 * s}px ${FONT_SC}`;
      ctx.fillText(a.name, x0 + 14 * s, ty);
      ctx.textAlign = 'right';
      const word = wait ? (m.bindNo > 0 ? 'THAT KEY IS TAKEN' : 'PRESS A KEY...') : this.name(this.code(a.id));
      ctx.fillStyle = wait ? (m.bindNo > 0 ? PALETTE.blood : PALETTE.fireHi) : this.code(a.id) === this.DEFAULT[a.id] ? 'rgba(239,230,208,0.75)' : PALETTE.fireHi;
      ctx.font = `700 ${14 * s}px ${FONT_SC}`;
      ctx.fillText(word, x0 + bw - 14 * s, ty);
    }
    ctx.textAlign = 'left';
  },
};
