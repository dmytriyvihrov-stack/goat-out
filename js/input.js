// Touch controls: a floating move stick on the left, action buttons on the right,
// plus a drag-anywhere-on-the-right manual aim. Sizes are in CSS pixels, scaled by the backing-store ratio.
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

  hitButton(x, y) {
    for (const k in this.buttons) {
      if (k === 'item' && !this.itemReady) continue;
      const b = this.buttons[k];
      if (Math.hypot(x - b.x, y - b.y) <= b.rr * 1.18) return b;
    }
    return null;
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
      if (k === 'grab') { const dx = x - b.x, dy = y - b.y; if (Math.hypot(dx, dy) > b.rr * 0.6) this.buttonAim = { x: dx, y: dy }; }
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
    const d = Math.hypot(dx, dy);
    if (d < 6 * this.s) return { x: 0, y: 0 };
    const m = Math.min(1, d / this.stickR);
    return { x: (dx / d) * m, y: (dy / d) * m };
  }

  // Manual aim from the right-side drag or from dragging off the grab button; null means "use auto-aim".
  aimVector() {
    if (this.aimDrag) {
      const dx = this.aimDrag.x - this.aimDrag.ox, dy = this.aimDrag.y - this.aimDrag.oy;
      const d = Math.hypot(dx, dy);
      if (d > 14 * this.s) return { x: dx / d, y: dy / d };
    }
    if (this.buttonAim) {
      const d = Math.hypot(this.buttonAim.x, this.buttonAim.y) || 1;
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
function autoAim(game, dirx, diry) {
  const g = game.goat;
  const maxDist = 5.2 * TILE, cone = Math.cos(0.95);
  let best = null, bestScore = -Infinity;
  for (const e of game.enemies) {
    if (e.dead || e.held || e === g.holding) continue;
    const dx = e.x - g.x, dy = e.y - g.y, d = Math.hypot(dx, dy);
    if (d > maxDist || d < 1) continue;
    const dot = (dx * dirx + dy * diry) / d;
    if (dot < cone) continue;
    const score = dot * 2 - d / maxDist;
    if (score > bestScore) { bestScore = score; best = { x: dx / d, y: dy / d }; }
  }
  return best || { x: dirx, y: diry };
}
