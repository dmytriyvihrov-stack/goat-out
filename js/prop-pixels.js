// Pixel sprites for the props that were still painted (ART_HANDOFF.md, "Still to be drawn in pixel"):
// doors and what they leave, the arms and their stand, the wheel, the pen, the altar, banner, gong,
// lantern, soul wisp, healing grass, the grating. Each is a small grid of palette colours built by a few
// drawing calls and given a dark outline, the recipe of the crate, barrel and goat of Pixel 2.5.
const PROP_PIXELS = (() => {
  const P = {
    ol: '#22150e',
    w0: '#452a1a', w1: '#633d25', w2: '#82552f', w3: '#a06d3f', w4: '#bf8c58',
    i0: '#1f1e24', i1: '#34333b', i2: '#51505a', i3: '#76757f', i4: '#a4a3ab',
    s0: '#4b453d', s1: '#6b645a', s2: '#8b8374', s3: '#aaa18f', s4: '#c9c0aa',
    d0: '#17151b', d1: '#27242d', d2: '#38343f', d3: '#4c4754',
    b0: '#4a3113', b1: '#76521d', b2: '#a0752d', b3: '#c49843', b4: '#e0bf6c',
    v0: '#2a1244', v1: '#512683', v2: '#7c44c4', v3: '#ae82ec', v4: '#e6d6ff',
    g0: '#18301a', g1: '#2c5222', g2: '#46802c', g3: '#6cae3a', g4: '#a2d85c',
    r0: '#3b1512', r1: '#5e231c', r2: '#7f3326', r3: '#9c4630',
    c0: '#a8997a', c1: '#d6c9a6', c2: '#f1e9d3',
    f0: '#b43e1a', f1: '#e27826', f2: '#f5b43a', f3: '#fde58a',
    lt: '#2e1c14', bl: '#4a1c18',
  };

  // A tiny deterministic generator so every build draws the same grain and the same debris.
  const rng = seed => () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  class Grid {
    constructor(w, h) { this.w = w; this.h = h; this.p = new Array(w * h).fill(null); }
    get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.p[y * this.w + x]; }
    set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.p[y * this.w + x] = c; return this; }
    // `only`: paint only over pixels already drawn (shading inside a silhouette)
    rect(x, y, w, h, c, only) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!only || this.get(i, j)) this.set(i, j, c); return this; }
    hl(x, y, n, c, only) { return this.rect(x, y, n, 1, c, only); }
    vl(x, y, n, c, only) { return this.rect(x, y, 1, n, c, only); }
    line(x0, y0, x1, y1, c, only) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
      for (;;) { if (!only || this.get(x0, y0)) this.set(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
      return this;
    }
    ell(cx, cy, rx, ry, c, only) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1 && (!only || this.get(x, y))) this.set(x, y, c);
      }
      return this;
    }
    ring(cx, cy, rx, ry, t, c, only) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const dx = (x + 0.5 - cx), dy = (y + 0.5 - cy), o = (dx / rx) ** 2 + (dy / ry) ** 2, i = (dx / (rx - t)) ** 2 + (dy / (ry - t)) ** 2;
        if (o <= 1 && i > 1 && (!only || this.get(x, y))) this.set(x, y, c);
      }
      return this;
    }
    poly(pts, c) {
      const ys = pts.map(p => p[1]);
      for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) for (let x = 0; x < this.w; x++) {
        let inside = false; const px = x + 0.5, py = y + 0.5;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.set(x, y, c);
      }
      return this;
    }
    // A thick stroke: the body of a shard or a beam at any angle, lit along its upper edge.
    bar(x0, y0, x1, y1, t, c, lit, dark) {
      const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a), h = t / 2;
      this.poly([[x0 + nx * h, y0 + ny * h], [x1 + nx * h, y1 + ny * h], [x1 - nx * h, y1 - ny * h], [x0 - nx * h, y0 - ny * h]], c);
      const up = ny > 0 ? -1 : 1;
      if (lit) this.line(x0 + nx * h * up * 0.6, y0 + ny * h * up * 0.6, x1 + nx * h * up * 0.6, y1 + ny * h * up * 0.6, lit, true);
      if (dark) this.line(x0 - nx * h * up * 0.6, y0 - ny * h * up * 0.6, x1 - nx * h * up * 0.6, y1 - ny * h * up * 0.6, dark, true);
      return this;
    }
    // Swaps any pixel of the given colours for another where `test(x, y)` holds: the one shading pass.
    tone(test, c, from) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const v = this.get(x, y); if (v && (!from || from.includes(v)) && test(x, y)) this.set(x, y, c); } return this; }
    outline(c = P.ol, diag = false) {
      const add = [];
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        const n = this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1) ||
          (diag && (this.get(x - 1, y - 1) || this.get(x + 1, y - 1) || this.get(x - 1, y + 1) || this.get(x + 1, y + 1)));
        if (n) add.push([x, y]);
      }
      for (const [x, y] of add) this.set(x, y, c);
      return this;
    }
    // Orphan outline pixels at a corner read as a jagged staircase: drop the ones touching one pixel.
    clean(c = P.ol) {
      const drop = [];
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== c) continue;
        const n = [this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)].filter(v => v && v !== c).length;
        const m = [this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)].filter(Boolean).length;
        if (n === 0 && m <= 1) drop.push([x, y]);
      }
      for (const [x, y] of drop) this.set(x, y, null);
      return this;
    }
    speckle(r, n, c, from) { for (let k = 0; k < n; k++) { const x = Math.floor(r() * this.w), y = Math.floor(r() * this.h), v = this.get(x, y); if (v && (!from || from.includes(v))) this.set(x, y, c); } return this; }
    // Cuts the grid to what is drawn, so a sprite's size is its silhouette and nothing else.
    trim() {
      let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.get(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const g = new Grid(x1 - x0 + 1, y1 - y0 + 1);
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) g.p[y * g.w + x] = this.get(x0 + x, y0 + y);
      return g;
    }
    blit(g, dx, dy) { for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const v = g.get(x, y); if (v) this.set(dx + x, dy + y, v); } return this; }
  }

  // ---------------------------------------------------------------- doors: 9 x 42, vertical slabs
  // The game draws a closed door as a 13 x 58 slab across a two-tile doorway and turns it for a
  // horizontal one, so the light is a bevel (top-left lit, bottom-right shaded), which reads either way.
  function planks(g, x0, x1, y0, y1, base, lit, dark, seam, r) {
    g.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, base);
    const mid = Math.floor((x0 + x1) / 2);
    g.vl(mid, y0, y1 - y0 + 1, seam);
    g.vl(x0, y0, y1 - y0 + 1, lit); g.vl(mid + 1, y0, y1 - y0 + 1, lit);
    g.vl(mid - 1, y0, y1 - y0 + 1, dark); g.vl(x1, y0, y1 - y0 + 1, dark);
    // grain: short dark runs along each plank, and a butt joint where two lengths meet
    for (let k = 0; k < 7; k++) { const x = r() < 0.5 ? x0 + 1 : mid + 2, y = y0 + 2 + Math.floor(r() * (y1 - y0 - 6)); if (x < x1) g.vl(x, y, 2 + Math.floor(r() * 3), dark); }
    g.hl(x0, y0 + Math.floor((y1 - y0) * 0.38), mid - x0, seam);
    g.hl(mid + 1, y0 + Math.floor((y1 - y0) * 0.7), x1 - mid, seam);
  }
  function brace(g, y, x0, x1, base, lit, dark, nail) {
    g.hl(x0, y, x1 - x0 + 1, lit); g.rect(x0, y + 1, x1 - x0 + 1, 1, base); g.hl(x0, y + 2, x1 - x0 + 1, dark);
    if (nail) { g.set(x0 + 1, y + 1, nail); g.set(x1 - 1, y + 1, nail); }
  }
  function doorWood() {
    const g = new Grid(9, 42), r = rng(11);
    planks(g, 1, 7, 1, 40, P.w2, P.w3, P.w1, P.w0, r);
    brace(g, 6, 1, 7, P.w2, P.w4, P.w0, P.i3); brace(g, 33, 1, 7, P.w2, P.w4, P.w0, P.i3);
    g.hl(1, 1, 7, P.w4); g.hl(1, 40, 7, P.w0);
    return g.outline();
  }
  function ironBand(g, y, x0, x1) {
    g.hl(x0, y, x1 - x0 + 1, P.i3); g.hl(x0, y + 1, x1 - x0 + 1, P.i1);
    g.set(x0 + 1, y, P.i4); g.set(x1 - 1, y, P.i4);
  }
  function doorIron() {
    const g = new Grid(9, 42), r = rng(23);
    planks(g, 1, 7, 1, 40, P.w1, P.w2, P.w0, P.ol, r);
    g.vl(1, 1, 40, P.i2); g.vl(7, 1, 40, P.i1);
    for (const y of [3, 12, 20, 28, 37]) ironBand(g, y, 1, 7);
    g.hl(1, 1, 7, P.i3); g.hl(1, 40, 7, P.i0);
    return g.outline();
  }
  function sigil(g, cx, cy, on) {
    // the soul's mark: a small horned diamond
    const a = on ? P.v2 : P.v1, b = on ? P.v4 : P.v2, e = on ? P.v3 : P.v1;
    g.set(cx, cy - 3, a); g.rect(cx - 1, cy - 2, 3, 1, a); g.rect(cx - 2, cy - 1, 5, 3, a); g.rect(cx - 1, cy + 2, 3, 1, a); g.set(cx, cy + 3, a);
    g.rect(cx - 1, cy - 1, 3, 3, e); g.set(cx, cy, b);
    g.set(cx - 2, cy - 3, a); g.set(cx + 2, cy - 3, a);
  }
  function doorVault() {
    const g = new Grid(9, 42), r = rng(37);
    g.rect(1, 1, 7, 40, P.i1);
    planks(g, 2, 6, 3, 38, P.w0, P.w1, P.ol, P.ol, r);
    for (const y of [2, 11, 29, 38]) { g.hl(1, y, 7, P.i2); g.set(2, y, P.i4); g.set(6, y, P.i4); }
    g.vl(1, 1, 40, P.i2); g.vl(7, 1, 40, P.i0); g.hl(1, 1, 7, P.i3); g.hl(1, 40, 7, P.i0);
    g.rect(2, 15, 5, 11, P.i1); g.hl(2, 15, 5, P.i2); g.hl(2, 25, 5, P.i0);
    sigil(g, 4, 20, true);
    return g.outline();
  }
  function doorSoul() {
    const g = new Grid(9, 42), r = rng(41);
    g.rect(1, 1, 7, 40, P.d2);
    // coursed dark stone: every seam leaks the violet behind it
    for (let y = 1, row = 0; y < 41; y += 5, row++) {
      g.hl(1, y, 7, P.d3); if (y > 1) g.hl(1, y - 1, 7, P.v1);
      const sx = row % 2 ? 3 : 5; g.vl(sx, y, 4, P.v1);
      if (r() < 0.8) g.set(sx, y - 1, P.v2);
      g.hl(1, Math.min(40, y + 3), 7, P.d1);
    }
    g.speckle(r, 10, P.d1, [P.d2]);
    g.rect(2, 16, 5, 9, P.d1);
    sigil(g, 4, 20, true);
    g.vl(1, 1, 40, P.d3, true); g.vl(7, 1, 40, P.d0, true);
    return g.outline(P.d0);
  }

  // ---------------------------------------------------------------- broken doors: 44 x 44 debris
  // What a broken door leaves lies where it stood: a strip along the doorway, not a spray across the
  // corridor, the way the painted one did. 24 x 44, turned with the door like the slab is.
  function debris(kind) {
    const g = new Grid(24, 44), r = rng({ wood: 5, iron: 6, vault: 7, soul: 8 }[kind]);
    const shards = (n, lo, hi, t, base, lit, dark) => {
      for (let k = 0; k < n; k++) {
        const cx = 5 + r() * 14, cy = 5 + r() * 34, a = Math.PI / 2 + (r() - 0.5) * 2.2, l = lo + r() * (hi - lo);
        g.bar(cx - Math.cos(a) * l / 2, cy - Math.sin(a) * l / 2, cx + Math.cos(a) * l / 2, cy + Math.sin(a) * l / 2, t, base, lit, dark);
      }
    };
    if (kind === 'wood' || kind === 'iron') {
      const base = kind === 'wood' ? P.w2 : P.w1, lit = kind === 'wood' ? P.w3 : P.w2, dark = kind === 'wood' ? P.w1 : P.w0;
      g.bar(8, 3, 13, 21, 4, base, lit, dark); g.bar(15, 22, 11, 40, 4, base, lit, dark);
      shards(5, 3, 8, 2, base, lit, null);
      // the splintered ends: a few loose teeth past each break
      for (const [x, y] of [[13, 22], [14, 23], [15, 21], [11, 21], [16, 20]]) g.set(x, y, lit);
      if (kind === 'iron') {
        g.bar(4, 10, 9, 14, 2, P.i2, P.i3); g.bar(9, 14, 14, 11, 2, P.i2, P.i3);
        g.bar(9, 31, 15, 34, 2, P.i2, P.i3); g.bar(15, 34, 20, 31, 2, P.i2, P.i3);
        for (const [x, y] of [[6, 12], [12, 12], [12, 33], [18, 32]]) g.set(x, y, P.i4);
      } else for (const [x, y] of [[10, 8], [13, 33], [11, 17]]) g.set(x, y, P.i3);
    } else if (kind === 'vault') {
      g.poly([[4, 3], [17, 2], [18, 13], [5, 14]], P.w0); g.poly([[6, 16], [19, 15], [20, 26], [4, 27]], P.i1);
      g.poly([[5, 29], [18, 28], [19, 41], [7, 41]], P.w0);
      g.tone((x, y) => g.get(x, y - 1) === null, P.i2); g.tone((x, y) => g.get(x + 1, y) === null || g.get(x, y + 1) === null, P.i0);
      for (const [x, y] of [[6, 5], [15, 4], [7, 18], [17, 24], [8, 38]]) g.set(x, y, P.i3);
      // the mark, split across the break
      g.rect(10, 12, 3, 2, P.v1); g.set(11, 12, P.v2); g.rect(11, 17, 3, 3, P.v1); g.set(12, 18, P.v2);
      shards(4, 2, 5, 1.5, P.i1, P.i2, null);
    } else {
      g.poly([[4, 3], [16, 2], [18, 12], [6, 13]], P.d2); g.poly([[8, 15], [19, 16], [18, 27], [5, 26]], P.d2);
      g.poly([[4, 29], [15, 29], [18, 41], [6, 40]], P.d2);
      g.tone((x, y) => g.get(x, y - 1) === null, P.d3); g.tone((x, y) => g.get(x + 1, y) === null || g.get(x, y + 1) === null, P.d1);
      shards(5, 2, 5, 2, P.d2, P.d3, null);
      g.line(7, 5, 13, 9, P.v1, true); g.line(10, 18, 15, 23, P.v1, true); g.line(8, 31, 12, 37, P.v1, true);
    }
    g.outline();
    if (kind === 'soul') for (const [x, y, c] of [[20, 14, P.v2], [3, 21, P.v1], [21, 30, P.v3], [2, 36, P.v1], [12, 43, P.v2]]) g.set(x, y, c);
    return g;
  }

  // ---------------------------------------------------------------- arms
  function sword() {
    const g = new Grid(19, 7);
    g.rect(1, 2, 2, 3, P.b2); g.set(1, 2, P.b3); g.set(2, 4, P.b1);           // pommel
    g.hl(3, 3, 3, P.lt); g.set(4, 3, P.w1);                                     // grip
    g.vl(6, 1, 5, P.b2); g.set(6, 1, P.b3); g.set(6, 5, P.b1);                  // crossguard
    g.hl(7, 2, 9, P.i4); g.hl(7, 3, 9, P.i3); g.hl(7, 4, 9, P.i2);              // blade
    g.set(16, 3, P.i3); g.set(17, 3, P.i4);                                     // point
    return g.outline();
  }
  // The same sword stood on its point, hilt up: the stand holds it this way.
  function swordUp() {
    const h = sword(), g = new Grid(h.h, h.w);
    for (let y = 0; y < h.h; y++) for (let x = 0; x < h.w; x++) g.p[x * g.w + y] = h.get(x, y);
    return g;
  }
  function shield() {
    const g = new Grid(19, 19), c = 9;
    g.ell(c, c, 8.5, 8.5, P.i2);
    g.ell(c, c, 7, 7, P.w2);
    for (const x of [5, 9, 13]) g.vl(x, 2, 15, P.w0, true);
    for (const x of [2, 6, 10, 14]) g.vl(x, 2, 15, P.w3, true);
    g.tone((x, y) => (x - c) + (y - c) > 7, P.w1, [P.w2, P.w3]);
    // the painted band the old shield carried, dulled to the cult's red
    g.rect(10, 1, 3, 17, P.r2, true); g.tone((x, y) => x === 12, P.r1, [P.r2]);
    g.ring(c, c, 8.5, 8.5, 1.3, P.i2); g.tone((x, y) => (x - c) + (y - c) < -8, P.i3, [P.i2]); g.tone((x, y) => (x - c) + (y - c) > 8, P.i1, [P.i2]);
    for (const [x, y] of [[9, 1], [2, 9], [16, 9], [9, 17], [4, 4], [14, 4], [4, 14], [14, 14]]) g.set(x, y, P.i4);
    g.ell(c + 0.5, c + 0.5, 2.6, 2.6, P.i2); g.set(8, 8, P.i4); g.set(9, 8, P.i3); g.set(8, 9, P.i3); g.set(10, 10, P.i1); g.set(9, 10, P.i1); g.set(10, 9, P.i1);
    return g.outline();
  }
  // The stand of arms in two layers on one 24 x 24 frame, the arm drawn between them: the uprights
  // and the bar it leans on behind it, the base over its foot. A sword stands point down in the
  // base's slot with its hilt up over the bar, a shield stands on its rim with the base over its lower edge.
  function rackBack() {
    const g = new Grid(24, 24);
    for (const x of [2, 19]) {
      g.rect(x, 5, 3, 14, P.w2); g.vl(x, 5, 14, P.w3); g.vl(x + 2, 5, 14, P.w1);
      g.hl(x, 4, 3, P.w4); g.set(x + 1, 4, P.w3);
    }
    g.rect(5, 8, 14, 2, P.w1); g.hl(5, 8, 14, P.w2);                                 // the bar
    for (const x of [5, 18]) g.set(x, 8, P.i3);
    return g.outline();
  }
  function rackBase() {
    const g = new Grid(24, 24);
    g.rect(1, 16, 22, 2, P.w2); g.hl(1, 16, 22, P.w3);                                // top
    g.rect(10, 16, 5, 1, P.ol);                                                        // the slot
    g.rect(1, 18, 22, 3, P.w1); g.hl(1, 18, 22, P.w2); g.hl(1, 20, 22, P.w0);         // front
    for (const x of [1, 20]) g.rect(x, 21, 3, 1, P.w0);
    g.set(3, 19, P.i3); g.set(20, 19, P.i3);
    return g.outline();
  }
  // The shell only: the fuse is drawn by the game, as long as the time it has left.
  function bomb() {
    const g = new Grid(15, 15);
    g.ell(7, 8, 6, 6, P.i1);
    g.tone((x, y) => (x - 7) + (y - 8) > 3, P.i0, [P.i1]);
    g.set(4, 5, P.i3); g.set(5, 5, P.i2); g.set(4, 6, P.i2); g.set(5, 4, P.i2);
    g.rect(6, 1, 3, 2, P.i2); g.hl(6, 1, 3, P.i3);
    return g.outline();
  }

  // ---------------------------------------------------------------- the wheel
  function millHub() {
    const g = new Grid(41, 41), c = 20.5, r = rng(51);
    g.ell(c, c, 19.5, 19.5, P.w2);
    // end grain: growth rings and a split, the old hub's millstone look turned into a cut log
    g.ring(c, c, 15, 15, 1, P.w1, true); g.ring(c, c, 10.5, 10.5, 1, P.w1, true); g.ring(c, c, 6.5, 6.5, 1, P.w3, true);
    g.speckle(r, 60, P.w1, [P.w2]); g.speckle(r, 40, P.w3, [P.w2]);
    g.line(22, 24, 31, 34, P.w0, true);
    g.ring(c, c, 19.5, 19.5, 3, P.i2);
    g.tone((x, y) => (x - c) + (y - c) < -14, P.i3, [P.i2]); g.tone((x, y) => (x - c) + (y - c) > 14, P.i1, [P.i2]);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.39; g.set(c - 0.5 + Math.cos(a) * 18, c - 0.5 + Math.sin(a) * 18, P.i4); }
    g.ell(c, c, 4.5, 4.5, P.i1); g.ell(c, c, 2.2, 2.2, P.i0); g.set(18, 18, P.i3); g.set(19, 17, P.i3);
    return g.outline();
  }
  function millArm() {
    // horizontal beam, the hub end on the left and the iron head on the right, 41 x 17
    const g = new Grid(41, 17), r = rng(52);
    g.rect(1, 4, 32, 9, P.w2); g.hl(1, 4, 32, P.w3); g.hl(1, 5, 32, P.w3); g.hl(1, 11, 32, P.w1); g.hl(1, 12, 32, P.w0);
    for (let k = 0; k < 14; k++) { const x = 2 + Math.floor(r() * 28), y = 6 + Math.floor(r() * 4); g.hl(x, y, 2 + Math.floor(r() * 4), P.w1); }
    for (const x of [9, 21]) { g.rect(x, 3, 2, 11, P.i2); g.vl(x, 3, 11, P.i3); g.set(x, 3, P.i4); g.set(x + 1, 13, P.i1); g.set(x, 8, P.i4); }
    g.set(15, 4, null); g.set(16, 4, null);                                              // wear
    // the head: a block of iron, lit on top, dark and bloody on the face that meets them
    g.rect(31, 1, 9, 15, P.i2); g.hl(31, 1, 9, P.i4); g.hl(31, 2, 9, P.i3); g.vl(31, 1, 15, P.i3); g.vl(39, 1, 15, P.i1); g.hl(31, 15, 9, P.i0);
    g.rect(33, 4, 5, 7, P.i1); g.hl(33, 4, 5, P.i0); g.set(34, 6, P.i3);
    g.rect(31, 11, 9, 4, P.r1); g.hl(31, 11, 9, P.r2); g.set(33, 10, P.r2); g.set(37, 10, P.r1); g.set(35, 15, P.bl); g.set(38, 15, P.bl);
    return g.outline();
  }

  // ---------------------------------------------------------------- the pen
  function cagePost() {
    const g = new Grid(5, 22);
    g.rect(1, 1, 3, 20, P.w2); g.vl(1, 1, 20, P.w3); g.vl(3, 1, 20, P.w1);
    g.hl(1, 1, 3, P.w4); g.set(2, 1, P.w3);                                          // the cut top
    for (const y of [7, 13, 16]) g.set(2, y, P.w1);
    g.hl(1, 4, 3, P.c1); g.hl(1, 5, 3, P.c0); g.set(2, 4, P.c2);                      // lashing
    g.hl(1, 20, 3, P.w0);
    return g.outline();
  }
  function cageBroken() {
    const g = new Grid(18, 7);
    g.rect(1, 2, 8, 3, P.w2); g.hl(1, 2, 8, P.w3); g.hl(1, 4, 8, P.w1); g.vl(1, 2, 3, P.w4);
    g.set(9, 2, P.w3); g.set(9, 3, P.w2); g.set(10, 3, P.w3);                         // splinter
    g.bar(11, 4, 16, 3, 3, P.w2, P.w3, P.w1); g.set(16, 2, P.w4);
    g.hl(4, 2, 2, P.c1);
    return g.outline();
  }

  // ---------------------------------------------------------------- the altar, 78 x 44
  // Pale limestone on two blocks, the cult's red runner down the middle with the skull of the last
  // goat on it, candles at both ends and old stains. Same subject as the painted one, cut in stone so
  // it never reads as the plain wooden table every other room has.
  function altar() {
    const g = new Grid(78, 46), r = rng(61);
    // legs: front faces of two blocks under the slab
    for (const x of [7, 57]) { g.rect(x, 28, 14, 13, P.s1); g.vl(x, 28, 13, P.s2); g.vl(x + 13, 28, 13, P.s0); g.hl(x, 40, 14, P.s0); g.rect(x + 3, 31, 8, 6, P.s0); g.rect(x + 4, 32, 6, 4, P.s1); }
    // slab top
    g.rect(1, 3, 76, 20, P.s3);
    g.speckle(r, 140, P.s2, [P.s3]); g.speckle(r, 50, P.s4, [P.s3]);
    g.hl(1, 3, 76, P.s4); g.vl(1, 3, 20, P.s4);
    g.rect(3, 5, 72, 16, P.s2, true); g.rect(4, 6, 70, 14, P.s3, true); g.speckle(r, 70, P.s2, [P.s3]);  // carved border
    // slab front face with a frieze of cuts
    g.rect(1, 23, 76, 5, P.s1); g.hl(1, 23, 76, P.s2); g.hl(1, 27, 76, P.s0);
    for (let x = 4; x < 75; x += 5) { g.vl(x, 24, 3, P.s0); g.set(x + 1, 24, P.s2); }
    // stains soaked into the stone
    for (const [x, y, rx, ry] of [[18, 17, 4, 2], [60, 18, 3, 1.6], [52, 9, 2.5, 1.4], [25, 7, 2, 1.2]]) { g.ell(x, y, rx, ry, P.bl, true); g.set(x - 1, y - 1, P.r1); }
    g.vl(19, 23, 3, P.bl); g.vl(59, 23, 4, P.bl);
    // the runner, hanging well down the front between the legs
    g.rect(32, 2, 15, 36, P.r2); g.vl(32, 2, 36, P.r3); g.vl(46, 2, 36, P.r1);
    g.hl(32, 22, 15, P.r1); g.rect(32, 23, 15, 15, P.r1); g.vl(32, 23, 15, P.r2);
    for (const [x, h] of [[32, 1], [33, 2], [35, 1], [37, 3], [38, 1], [40, 2], [42, 1], [43, 3], [45, 1], [46, 2]]) g.vl(x, 38, h, x === 32 ? P.r2 : P.r1);
    // the mark stitched on its hanging end: horns over a narrow face
    for (const [x, y] of [[35, 27], [43, 27], [36, 28], [42, 28], [37, 29], [38, 29], [39, 29], [40, 29], [41, 29], [38, 30], [40, 30], [39, 31], [39, 32], [39, 33]]) g.set(x, y, P.c0);
    // the skull of the last goat, horns swept up and out past the cloth
    const SK = [
      'hh...............hh',
      'hhh.............hhh',
      '.hhhh.........hhhh.',
      '...hhhSSSSSSShhh...',
      '.....SSSSSSSSS.....',
      '.....SDDSSSDDS.....',
      '.....SDDSSSDDS.....',
      '......SSSSSSS......',
      '.......SSSSS.......',
      '.......SnSnS.......',
      '........SSS........',
      '........SSS........',
      '.........S.........',
    ];
    SK.forEach((row, j) => [...row].forEach((ch, i) => {
      const x = 30 + i, y = 4 + j;
      if (ch === 'h') g.set(x, y, j === 0 || (j === 1 && (i === 0 || i === 18)) ? P.c0 : P.c1);
      else if (ch === 'D') g.set(x, y, P.ol);
      else if (ch === 'n') g.set(x, y, P.s0);
      else if (ch === 'S') g.set(x, y, i > 12 || j > 9 ? P.c0 : j === 3 || i < 7 ? P.c2 : P.c1);
    }));
    // candles: a thick stub in an iron dish, a wick, a little flame
    const candle = (x, y, h) => {
      g.rect(x - 2, y + h, 8, 2, P.i1); g.hl(x - 2, y + h, 8, P.i3); g.set(x - 2, y + h + 1, P.i0);
      g.rect(x, y, 4, h, P.c1); g.vl(x, y, h, P.c2); g.vl(x + 3, y, h, P.c0); g.hl(x, y, 4, P.c2); g.set(x + 3, y + 1, P.c1);
      g.set(x + 1, y - 1, P.ol); g.set(x + 1, y - 2, P.f2); g.set(x + 1, y - 3, P.f3); g.set(x + 2, y - 2, P.f1); g.set(x + 1, y - 4, P.f2);
    };
    candle(6, 9, 7); candle(15, 11, 5); candle(24, 13, 3); candle(62, 8, 8); candle(70, 12, 5);
    // a bowl
    g.ell(54, 14, 4, 2.6, P.w1); g.ell(54, 13.6, 2.8, 1.5, P.bl); g.hl(51, 12, 6, P.w2, true);
    return g.outline();
  }

  // ---------------------------------------------------------------- banner, 11 x 16, on a wall face
  function banner() {
    const g = new Grid(11, 16);
    g.rect(2, 2, 7, 11, P.r2); g.vl(2, 2, 11, P.r3); g.vl(8, 2, 11, P.r1);
    for (const [x, h] of [[2, 1], [3, 2], [4, 1], [5, 0], [6, 1], [7, 2], [8, 1]]) g.vl(x, 13, h, x === 2 ? P.r3 : x === 8 ? P.r1 : P.r2);
    // the cult mark: a horned skull, five pixels tall
    for (const [x, y] of [[2, 4], [8, 4], [3, 5], [7, 5], [4, 6], [5, 6], [6, 6], [4, 7], [6, 7], [5, 8], [5, 9]]) g.set(x, y, P.c1);
    g.set(2, 4, P.c0); g.set(8, 4, P.c0); g.set(5, 9, P.c0);
    g.hl(0, 1, 11, P.w2); g.hl(1, 1, 9, P.w3); g.set(0, 1, P.w1); g.set(10, 1, P.w1);
    return g.outline();
  }

  // ---------------------------------------------------------------- gong, 29 x 30
  function gong() {
    const g = new Grid(29, 30);
    for (const x of [2, 23]) {
      g.rect(x - 1, 25, 6, 4, P.w1); g.hl(x - 1, 25, 6, P.w3); g.hl(x - 1, 28, 6, P.w0);     // feet blocks
      g.rect(x, 4, 4, 22, P.w2); g.vl(x, 4, 22, P.w3); g.vl(x + 3, 4, 22, P.w1);
    }
    g.rect(1, 2, 27, 4, P.w2); g.hl(1, 2, 27, P.w4); g.hl(1, 3, 27, P.w3); g.hl(1, 5, 27, P.w0);  // crossbar
    g.set(3, 4, P.i3); g.set(25, 4, P.i3);
    g.vl(9, 6, 3, P.c0); g.vl(19, 6, 3, P.c0);                                                   // cords
    g.ell(14.5, 17, 9, 8.5, P.b2);
    g.tone((x, y) => (x - 14.5) + (y - 17) > 4, P.b1, [P.b2]);
    g.tone((x, y) => (x - 14.5) + (y - 17) < -8, P.b3, [P.b2]);
    g.ring(14.5, 17, 9, 8.5, 1, P.b1); g.ring(14.5, 17, 6, 5.6, 1, P.b1, true);
    g.tone((x, y) => (x - 14.5) + (y - 17) < -8, P.b3, [P.b1]);
    g.ell(14.5, 17, 2.6, 2.4, P.b3); g.set(13, 15, P.b4); g.set(14, 15, P.b4); g.set(13, 16, P.b4); g.set(16, 18, P.b1);
    g.set(9, 12, P.b4); g.set(10, 11, P.b4); g.set(11, 11, P.b4);
    return g.outline();
  }

  // ---------------------------------------------------------------- lantern, 8 frames, 15 x 27
  function lantern(k) {
    const g = new Grid(15, 27);
    g.rect(5, 19, 5, 2, P.w1); g.hl(5, 19, 5, P.w2);                                   // base
    g.rect(6, 11, 3, 9, P.w2); g.vl(6, 11, 9, P.w3); g.vl(8, 11, 9, P.w1);             // post
    g.hl(5, 3, 5, P.i2); g.hl(6, 2, 3, P.i2); g.set(7, 1, P.i3); g.set(6, 0, P.i2); g.set(8, 0, P.i2); g.set(7, 0, null); // roof, ring
    g.hl(4, 4, 7, P.i3);
    g.rect(4, 5, 7, 6, P.i1);                                                          // cage
    const glow = [P.b1, P.b2, P.b2, P.b1, P.b1, P.b2, P.b3, P.b2][k];
    g.rect(5, 5, 5, 5, glow); g.vl(7, 5, 5, P.i1);
    g.hl(4, 10, 7, P.i2); g.hl(4, 11, 7, P.i1);
    // the flame: a short loop that leans and stretches inside the glass
    const H = [3, 4, 4, 3, 2, 3, 4, 3][k], sway = [0, 0, 1, 1, 0, -1, -1, 0][k];
    g.set(7, 9, P.f1); g.set(6, 9, P.f0); g.set(8, 9, P.f0);
    for (let j = 1; j < H; j++) g.set(7 + (j > 1 ? sway : 0), 9 - j, j === H - 1 ? P.f2 : P.f3);
    if (H > 2) g.set(7 + (sway > 0 ? -1 : 1), 8, P.f2);
    g.vl(4, 5, 6, P.i2); g.vl(10, 5, 6, P.i1);
    return g.outline();
  }

  // ---------------------------------------------------------------- sconce, 8 frames, 13 x 17 / 9 x 17
  // THE DARK's lantern on the wall by a doorway: a small cage lantern on iron. `side` hangs it off a
  // wall to its left on an arm with a hooked end (the drawing flips it for a wall to the right);
  // otherwise it is fixed to the wall behind it by a plate and a short rod over its roof.
  function sconce(k, side) {
    const g = new Grid(side ? 13 : 9, 17), ox = side ? 5 : 2, y0 = 6;
    if (side) {
      g.rect(0, 1, 2, 6, P.i1); g.vl(0, 1, 6, P.i2);                                  // wall plate
      g.hl(2, 3, 5, P.i2); g.set(2, 2, P.i3); g.set(7, 2, P.i2); g.set(8, 3, P.i2); g.vl(8, 4, 2, P.i3);  // arm, hook
    } else {
      g.rect(3, 0, 3, 3, P.i1); g.hl(3, 0, 3, P.i2); g.vl(4, 3, 3, P.i2);             // plate, rod
    }
    g.hl(ox + 1, y0, 3, P.i2); g.hl(ox, y0 + 1, 5, P.i3);                             // roof
    g.rect(ox, y0 + 2, 5, 6, P.i1);                                                   // cage
    g.rect(ox + 1, y0 + 2, 3, 5, [P.b2, P.b3, P.b3, P.b2, P.b2, P.b3, P.b4, P.b3][k]); // glass, lit from inside
    const H = [2, 3, 3, 2, 2, 3, 3, 2][k], sway = [0, 0, 1, 0, 0, -1, 0, 0][k];
    g.set(ox + 2, y0 + 6, P.f1);
    for (let j = 1; j <= H; j++) g.set(ox + 2 + (j > 1 ? sway : 0), y0 + 6 - j, j === H ? P.f2 : P.f3);
    g.hl(ox, y0 + 8, 5, P.i2); g.set(ox + 2, y0 + 9, P.i2);                           // base, knob
    return g.outline();
  }

  // ---------------------------------------------------------------- soul wisp, 17 x 22
  function soulWisp() {
    const g = new Grid(17, 22);
    g.ell(8.5, 14.5, 6, 6, P.v1);
    // the tongue: a curl of fire leaning off the top
    const rows = [[2, 9, 1], [3, 9, 2], [4, 8, 2], [5, 8, 3], [6, 7, 4], [7, 6, 5], [8, 5, 7]];
    for (const [y, x, w] of rows) g.hl(x, y, w, P.v1);
    g.set(11, 4, P.v1); g.set(12, 3, P.v1); g.set(4, 7, P.v1); g.set(3, 6, P.v1);
    g.ell(8.5, 14.5, 4.6, 4.8, P.v2, true); for (const [y, x, w] of rows.slice(3)) g.hl(x + 1, y, Math.max(1, w - 2), P.v2);
    g.ell(8.5, 14, 2.8, 3.2, P.v3, true); g.hl(8, 9, 2, P.v3); g.set(8, 8, P.v3);
    g.rect(8, 13, 2, 3, P.v4);
    // the two eyes the painted wisp had, as a darker pair in the light
    g.set(7, 13, P.v1); g.set(10, 13, P.v1);
    g.tone((x, y) => y > 18, P.v0, [P.v1]);
    return g.outline(P.v0);
  }

  // ---------------------------------------------------------------- healing grass
  // `gold` is the art pass's (`ART_PASS`): the same blades, their tips ripened to gold and a few more
  // flowers in them, so the grass that heals stops being the same green as the grass that hides you,
  // the moss and the poison. The silhouette is the plain one's, pixel for pixel.
  function grass(big, gold) {
    const W = big ? 33 : 19, H = big ? 26 : 16, g = new Grid(W, H), r = rng(big ? 71 : 72), n = big ? 30 : 12;
    const tip = gold ? '#ecd873' : P.g4, upper = gold ? '#a9c43e' : P.g3;
    const blades = [];
    for (let k = 0; k < n; k++) {
      const bx = W / 2 + (r() - 0.5) * (W - 8), depth = r(), len = (big ? 9 : 6) + r() * (big ? 12 : 7) * (1 - Math.abs(bx - W / 2) / W);
      blades.push({ bx, by: H - 2 - depth * (big ? 5 : 3), len, lean: (bx - W / 2) * 0.35 + (r() - 0.5) * 4, depth });
    }
    blades.sort((a, b) => a.by - b.by);
    for (const b of blades) {
      const tx = b.bx + b.lean, ty = b.by - b.len;
      const steps = Math.ceil(b.len);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps, x = b.bx + (tx - b.bx) * t * t, y = b.by + (ty - b.by) * t;
        const c = t > 0.8 ? tip : t > 0.45 ? upper : t > 0.15 ? P.g2 : P.g1;
        g.set(x, y, c); if (t < 0.35) g.set(x + 1, y, P.g1);
      }
    }
    if (big) for (const [x, y] of [[9, 9], [21, 6], [26, 12], [14, 5]]) { g.set(x, y, P.c2); g.set(x + 1, y, P.c1); g.set(x, y + 1, P.c1); }
    // More flowers, only ever on a blade already drawn, so the outline cannot grow.
    if (gold) for (const [x, y] of big ? [[6, 14], [17, 10], [23, 15], [12, 12]] : [[6, 7], [11, 5], [14, 9]]) if (g.get(x, y)) { g.set(x, y, '#fff6c8'); if (g.get(x + 1, y)) g.set(x + 1, y, P.c1); }
    return g.outline(P.g0);
  }

  // ---------------------------------------------------------------- milk pail, 19 x 27
  function pail() {
    const g = new Grid(19, 27);
    g.poly([[2, 6], [17, 6], [15.5, 25], [3.5, 25]], P.w2);
    for (const x of [5, 8, 11, 14]) g.vl(x, 6, 19, P.w1, true);
    g.tone((x, y) => x < 5, P.w3, [P.w2]); g.tone((x, y) => x > 14, P.w1, [P.w2]);
    for (const y of [10, 20]) { g.hl(0, y, 19, P.i2, true); g.hl(0, y + 1, 19, P.i1, true); g.set(4, y, P.i3); }
    g.hl(0, 24, 19, P.w0, true);
    g.ell(9.5, 6, 8, 3.4, P.w3); g.ell(9.5, 6.2, 6.6, 2.3, P.c2); g.hl(5, 5, 9, P.c1, true); g.set(12, 6, P.c1);
    g.ring(9.5, 6, 8, 3.4, 1, P.w1); g.tone((x, y) => y < 5, P.w3, [P.w1]);
    return g.outline();
  }

  // ---------------------------------------------------------------- spike grating, 24 x 22
  function grating(state) {
    // a floor plate with four long slots; the spikes come up out of the slots, two to a slot
    const g = new Grid(24, 23), slots = [3, 8, 13, 18], arming = state === 'arming';
    g.rect(1, 4, 22, 18, P.i1);
    g.hl(1, 4, 22, P.i3); g.vl(1, 4, 18, P.i2); g.hl(1, 21, 22, P.i0); g.vl(22, 4, 18, P.i0);
    for (const [x, y] of [[2, 5], [21, 5], [2, 20], [21, 20]]) g.set(x, y, arming ? P.f3 : P.i4);
    // armed, the slots light up from below: the one colour on the floor that means "not yet — now"
    for (const x of slots) { g.rect(x, 7, 3, 12, arming ? '#5c3a08' : P.d0); g.hl(x, 19, 3, P.i2); g.vl(x + 3, 7, 12, P.i2); }
    g.outline();
    if (arming) for (const x of slots) {
      g.vl(x, 7, 12, '#7a4e0c'); g.hl(x, 7, 3, P.f1);
      for (const y of [11, 17]) { g.set(x + 1, y - 1, P.f3); g.set(x + 1, y, P.f3); g.set(x, y, P.f2); g.set(x + 2, y, P.f1); }
    }
    if (state === 'up') {
      // bright steel, a hard dark rim round every tooth, and old blood on a few of the points
      const T = new Grid(24, 23), tooth = ['.a.', '.a.', '.ab', 'cab', 'cad', 'cad'], C = { a: '#e8e8ee', b: P.i2, c: P.i4, d: P.i1 };
      let k = 0;
      for (const by of [12, 19]) for (const x of slots) {
        tooth.forEach((row, j) => [...row].forEach((ch, i) => { if (C[ch]) T.set(x + i, by - 6 + j, C[ch]); }));
        if (k++ % 3 === 1) { T.set(x + 1, by - 6, P.r2); T.set(x + 1, by - 5, P.r1); }
      }
      T.outline(); g.blit(T, 0, 0);
    }
    return g;
  }

  // ---------------------------------------------------------------- the coop, in two layers
  // Dark inside, then whatever is in it (drawn by the game), then the slats over it. 38 x 25.
  function coopBack() {
    const g = new Grid(38, 25), r = rng(81);
    g.rect(1, 2, 36, 21, '#2b1d14'); g.rect(1, 2, 36, 3, '#1c130d');
    for (let k = 0; k < 18; k++) g.set(2 + Math.floor(r() * 34), 17 + Math.floor(r() * 5), r() < 0.5 ? '#6e5a2c' : '#8a7236');
    return g.outline();
  }
  function coopFront(cracked) {
    const g = new Grid(38, 25);
    for (let x = 1; x < 37; x += 6) { g.rect(x, 2, 2, 21, P.w2); g.vl(x, 2, 21, P.w3); }
    g.rect(1, 1, 36, 3, P.w2); g.hl(1, 1, 36, P.w4); g.hl(1, 3, 36, P.w1);
    g.rect(1, 20, 36, 3, P.w1); g.hl(1, 20, 36, P.w2); g.hl(1, 22, 36, P.w0);
    g.rect(0, 1, 2, 22, P.w1); g.vl(0, 1, 22, P.w3); g.rect(36, 1, 2, 22, P.w1); g.vl(37, 1, 22, P.w0);
    g.rect(33, 10, 3, 4, P.i2); g.hl(33, 10, 3, P.i3); g.set(34, 12, P.i4);            // the latch
    for (const x of [1, 36]) { g.set(x, 2, P.i3); g.set(x, 21, P.i3); }
    if (cracked) {
      // one blow in: a slat split and the frame starting to go, so the second is worth trying
      for (const [x, y] of [[13, 4], [13, 5], [14, 6], [13, 7], [14, 8], [14, 9]]) g.set(x, y, null);
      g.line(10, 4, 16, 20, P.w0); g.set(12, 21, P.w0); g.set(11, 20, P.w0);
    }
    return g.outline();
  }

  // ---------------------------------------------------------------- the horse's stall, in two layers
  // Three tiles by two (`TUNING.prop.stall`), drawn upright on its near edge: a back wall of boards
  // and a hay rack, straw on a dark floor, then the horse (drawn by the game), then the heavy front
  // rails on three posts and the side rails over it. 72 x 60; row 59 is the near edge.
  function stallBack() {
    const g = new Grid(72, 60), r = rng(83);
    g.rect(3, 12, 66, 46, '#2b1d14');                                             // the dark inside
    for (let k = 0; k < 120; k++) {                                               // straw, thicker to the front
      const y = 22 + Math.floor(Math.pow(r(), 0.6) * 35), x = 4 + Math.floor(r() * 64);
      g.set(x, y, r() < 0.5 ? '#6e5a2c' : '#8a7236'); if (r() < 0.4) g.set(x + 1, y, '#a08642');
    }
    for (let y = 1; y < 15; y += 4) { g.rect(2, y, 68, 4, P.w2); g.hl(2, y, 68, P.w3); g.hl(2, y + 3, 68, P.w1); }   // the back boards
    g.rect(2, 15, 68, 2, P.w0);                                                   // its foot, in shadow
    for (const x of [2, 35, 66]) { g.rect(x, 0, 4, 17, P.w1); g.vl(x, 0, 17, P.w3); g.hl(x, 0, 4, P.w4); }
    // the hay rack on the back wall, hay spilling out of its bars
    g.rect(44, 5, 16, 7, '#b89a4a'); for (let x = 44; x < 60; x += 3) g.vl(x, 5, 7, P.w0); g.hl(43, 4, 18, P.w1); g.hl(43, 12, 18, P.w1);
    for (let k = 0; k < 10; k++) g.set(44 + Math.floor(r() * 16), 13 + Math.floor(r() * 3), '#b89a4a');
    // the side walls: boards seen along their tops, running from the back posts to the front ones
    for (const x of [1, 67]) { g.rect(x, 12, 4, 34, P.w1); g.vl(x + 1, 12, 34, P.w2); g.vl(x + 3, 12, 34, P.w0); }
    return g.outline();
  }
  function stallFront(cracked) {
    const g = new Grid(72, 60);
    // two heavy rails, lit on top, dark under, iron-banded where they meet the posts
    for (const [y, h] of [[36, 5], [49, 6]]) { g.rect(1, y, 70, h, P.w2); g.hl(1, y, 70, P.w4); g.hl(1, y + 1, 70, P.w3); g.hl(1, y + h - 1, 70, P.w0); }
    for (const x of [0, 34, 67]) {
      g.rect(x, 31, 5, 29, P.w1); g.vl(x + 1, 31, 29, P.w3); g.vl(x + 4, 31, 29, P.w0); g.rect(x, 31, 5, 2, P.w4);   // a post, capped
      for (const y of [37, 51]) { g.hl(x, y, 5, P.i2); g.hl(x, y + 2, 5, P.i1); g.set(x + 2, y + 1, P.i4); }
    }
    g.rect(43, 42, 6, 6, P.i2); g.hl(43, 42, 6, P.i3); g.set(46, 45, P.i4); g.vl(45, 48, 2, P.i1);   // the latch, a bolt through both rails
    if (cracked) {
      // one blow in: the top rail split across and sagging, the post beside it knocked out of true
      for (const [x, y] of [[20, 36], [21, 37], [21, 38], [22, 39], [22, 40]]) g.set(x, y, null);
      g.line(14, 37, 20, 41, P.w0); g.line(23, 36, 29, 39, P.w0);
      g.rect(15, 41, 5, 1, P.w1); g.set(24, 41, P.w1);
      g.line(35, 32, 36, 36, P.w0);
    }
    return g.outline();
  }

  // ---------------------------------------------------------------- the shop
  // The mouse's hole at the foot of the wall: a black mouth in a rim of dug-out dirt, bedding in it.
  function burrow() {
    const g = new Grid(26, 15), r = rng(91);
    g.ell(13, 7.5, 12.5, 7, P.w1); g.speckle(r, 60, P.w0, [P.w1]); g.speckle(r, 30, P.w2, [P.w1]);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.ell(13 + Math.cos(a) * 11, 7.5 + Math.sin(a) * 6, 1.6, 1.2, k % 2 ? P.w2 : P.w3); }
    g.ell(13, 7.5, 9, 4.6, '#0b0810'); g.ell(13, 8.5, 7, 3, '#050407');
    g.hl(6, 5, 3, '#221a14');
    for (const [x, y] of [[17, 11], [18, 10], [19, 11], [20, 10], [16, 12], [8, 11]]) g.set(x, y, P.c0);
    g.set(18, 11, '#8a7236'); g.set(9, 12, '#8a7236');
    return g.outline();
  }
  function stool() {
    const g = new Grid(14, 11);
    g.rect(1, 1, 12, 4, P.w2); g.hl(1, 1, 12, P.w4); g.hl(1, 2, 12, P.w3); g.hl(1, 4, 12, P.w0);
    g.rect(1, 5, 12, 1, P.w1);
    for (const x of [2, 10]) { g.rect(x, 6, 2, 4, P.w1); g.vl(x, 6, 4, P.w2); }
    g.rect(6, 6, 2, 3, P.w0);
    return g.outline();
  }

  // ---------------------------------------------------------------- the roast
  // A fire in a ring of stones (back half, front half: the flames stand between), two forked sticks,
  // and the crocodile on the spit, which the game turns.
  function roastRing(front) {
    const g = new Grid(40, 16);
    if (!front) { g.ell(20, 9, 15, 5, '#2a1a12'); g.ell(20, 9, 11, 3.4, '#4a2412'); g.speckle(rng(93), 40, P.f0, ['#4a2412']); g.speckle(rng(94), 14, P.f1, ['#4a2412']); }
    for (let k = 0; k < 10; k++) {
      const a = k / 10 * Math.PI * 2, x = 20 + Math.cos(a) * 16, y = 9 + Math.sin(a) * 5.5;
      if ((Math.sin(a) > 0.05) !== front) continue;
      g.ell(x, y, 2.6, 2, P.s1); g.set(Math.round(x - 1), Math.round(y - 1), P.s3); g.set(Math.round(x), Math.round(y - 1), P.s2);
    }
    return g.outline();
  }
  function roastSticks() {
    const g = new Grid(80, 36);
    for (const [x, d] of [[5, -1], [74, 1]]) {
      g.bar(x + d * 2, 34, x, 7, 3, P.w1, P.w2, P.w0);
      g.bar(x, 9, x - d * 4, 2, 2, P.w1, P.w2);
      g.bar(x + d, 18, x + d * 3, 14, 2, P.w1, P.w2);
    }
    return g.outline();
  }
  function croc() {
    // tail tip on the left, snout on the right; the spit runs through him on row 7
    const W = 70, g = new Grid(W, 16), r = rng(95);
    const top = x => x < 26 ? 7 - (x / 26) * 3 : x < 48 ? 4 - Math.sin((x - 26) / 22 * Math.PI) * 1.2 : x < 55 ? 4 : 5 + (x - 55) * 0.08;
    const bot = x => x < 26 ? 8 + (x / 26) * 2 : x < 48 ? 10 + Math.sin((x - 26) / 22 * Math.PI) * 1.5 : x < 55 ? 10 : 9 - (x - 55) * 0.12;
    const hide = ['#2c3018', '#434a26', '#5a6232', '#77683c', '#8f7c4a'];
    for (let x = 1; x < W - 1; x++) {
      const t = Math.round(top(x)), b = Math.round(bot(x));
      for (let y = t; y <= b; y++) g.set(x, y, y === t ? hide[0] : y < t + 2 ? hide[2] : y > b - 2 ? hide[4] : hide[3]);
      if (x < 26 && x % 3 === 0) g.set(x, t - 1, hide[0]);                       // the crest on the tail
      if (x > 26 && x < 48) g.set(x, t + 1 + (x % 2), hide[1]);                    // armour rows
    }
    for (const lx of [30, 43]) { g.vl(lx, 11, 3, hide[1]); g.set(lx + 1, 13, hide[1]); g.vl(lx - 2, 11, 2, hide[2]); }
    g.speckle(r, 70, '#1e1a10', hide.slice(1, 4));                                 // char
    g.hl(55, 8, 13, '#151208'); for (const x of [58, 61, 64]) g.set(x, 9, P.c1);   // jaw and teeth
    g.set(51, 5, '#1c1a10'); g.set(52, 5, '#9a9468');                              // the eye
    for (let x = 0; x < W; x++) if (!g.get(x, 7)) g.set(x, 7, '#d9c078');         // the spit, either side of him
    return g.outline();
  }

  // ---------------------------------------------------------------- the cave's teeth
  // Three stone teeth standing out of old blood: the back two lower, the front one tall, every point
  // the brightest thing on it. The blood round the foot is what says the rock kills. 22 x 24.
  function spire() {
    const pool = new Grid(22, 24), r = rng(101);
    pool.ell(11, 20.5, 10.5, 3.2, P.bl); pool.speckle(r, 26, P.r1, [P.bl]); pool.speckle(r, 8, P.r2, [P.bl]);
    pool.ell(4, 22.5, 2.4, 1.2, P.bl); pool.set(19, 22, P.r1);
    const tooth = (g, x0, x1, tx, ty, by) => {
      g.poly([[x0, by], [tx + 0.5, ty], [x1, by]], P.s2);
      g.tone((x, y) => x + 0.5 > tx + 0.5 + (y - ty) * 0.12, P.s1, [P.s2]);        // the far side in shade
      g.tone((x, y) => x < tx - 1 + (y - ty) * -0.25 + 1, P.s3, [P.s2]);            // the lit edge
      for (let y = ty; y < ty + 3; y++) g.set(tx, y, y === ty ? '#f2efe6' : P.s4);   // the point
      for (let x = Math.ceil(x0); x < x1; x++) if (r() < 0.45) g.set(x, by - 1, P.r1); // blood up the foot
    };
    const back = new Grid(22, 24), front = new Grid(22, 24);
    tooth(back, 1.5, 8.5, 5, 7, 19); tooth(back, 13.5, 20.5, 16, 8, 19); back.outline();
    tooth(front, 6.5, 15.5, 11, 2, 21); front.outline();
    return pool.blit(back, 0, 0).blit(front, 0, 0);
  }

  // ---------------------------------------------------------------- the powder barrel
  // Enter the Gungeon's red barrel (29 Sep 2026: "I like the barrels as in Enter the Gungeon"): red
  // staves lit from the upper left round the cylinder, iron hoops curving toward you the way the
  // lid's near edge does, a pale wooden head in an iron rim with a heap of black powder on it (the
  // 26 Sep sign that it goes up), and the skull on the front that says it in one glance.
  const BR = ['#3d0f0e', '#6e1a17', '#9c2720', '#c63a2d', '#e4584a', '#ff9d85'];
  const BH = { s: '#f4e6d4', sh: '#cdb7a0', e: '#26100e' }, SKULL7 = ['.#####.', '#######', '#ee#ee#', '#ee#ee#', '###e###', '.#####.', '.#.#.#.'];
  const within = (v, lo, hi) => Math.max(lo, Math.min(hi, v));   // node has no rng.js to lend clamp
  const barrelShade = (b) => (b > 0.995 ? 5 : b > 0.86 ? 4 : b > 0.42 ? 3 : b > 0.05 ? 2 : 1);
  const IRN = [P.i0, P.i1, P.i2, P.i3, P.i4];
  function barrelStand() {
    const W = 20, H = 27, g = new Grid(W, H), cx = 10, lidY = 4, top = 4, bot = 21;
    const hwOf = (y) => y < top ? 7 : 7 + Math.round(3 * Math.sin(Math.PI * within((y - top) / (bot - top), 0, 1))) / 2;
    const sh = (u) => barrelShade(Math.cos(Math.asin(within(u, -1, 1)) + 0.75));
    for (let y = top; y <= bot + 3; y++) {
      const hw = hwOf(Math.min(y, bot));
      for (let x = 0; x < W; x++) {
        const u = (x + 0.5 - cx) / hw; if (Math.abs(u) > 1) continue;
        if (y > bot) { const v = (y + 0.5 - bot) / 3; if (u * u + v * v > 1) continue; }
        g.set(x, y, BR[sh(u)]);
      }
    }
    // the seams between the staves, a shade darker every sixth of the way round
    for (const th of [-1.0, -0.5, 0, 0.5, 1.0]) for (let y = top + 3; y <= bot + 1; y++) {
      const x = Math.round(cx - 0.5 + Math.sin(th) * hwOf(Math.min(y, bot))), i = BR.indexOf(g.get(x, y));
      if (i > 0) g.set(x, y, BR[Math.max(1, i - 1)]);
    }
    const hoop = (y0) => { for (let x = 0; x < W; x++) {
      const u = (x + 0.5 - cx) / hwOf(y0 + 2); if (Math.abs(u) > 1) continue;
      const y = Math.round(y0 + 2.4 * Math.sqrt(1 - u * u)), k = sh(u);
      g.set(x, y, IRN[Math.min(4, k)]); g.set(x, y + 1, IRN[Math.max(1, k - 2)]);
    } };
    hoop(5); hoop(16.5);
    g.ell(cx, lidY, 7.2, 3.1, P.i2); g.ell(cx, lidY + 0.3, 5.8, 2.2, P.w4);
    for (let y = 0; y < 8; y++) for (let x = 0; x < W; x++) {
      const c = g.get(x, y);
      if (c === P.i2) g.set(x, y, y < lidY ? P.i4 : x > cx + 3 ? P.i1 : P.i3);
      else if (c === P.w4) g.set(x, y, x + y < cx - 1 ? '#e2c07f' : x > cx + 3 ? P.w3 : P.w4);
    }
    g.hl(6, 4, 9, P.w3, true); g.set(8, 4, P.w4); g.set(12, 4, P.w4);
    for (const [x, y, c] of [[10, 2, '#5d5460'], [9, 3, '#5d5460'], [10, 3, '#2a2328'], [11, 3, '#2a2328'], [8, 4, '#2a2328'], [9, 4, '#2a2328'], [10, 4, '#2a2328'], [11, 4, '#2a2328'], [12, 4, '#2a2328']]) g.set(x, y, c);
    SKULL7.forEach((row, j) => [...row].forEach((ch, i) => { const x = 6 + i, y = 9 + j;
      if (ch === '#') g.set(x, y, i >= 5 || j >= 5 ? BH.sh : BH.s); else if (ch === 'e') g.set(x, y, BH.e); }));
    return g.outline();
  }
  // On its side, the axis across the picture and the near head at the right. `phase` 0..7 is how far
  // round it has rolled (45° a step): the seams slide over it and the skull comes over the top and
  // goes under, cut off by the barrel's own outline.
  function barrelLie(phase) {
    const W = 27, H = 18, g = new Grid(W, H), cy = 8.5, x0 = 2, x1 = 22, a = phase * Math.PI / 4;
    const hhOf = (x) => 6 + Math.round(3 * Math.sin(Math.PI * within((x - x0) / (x1 - x0), 0, 1))) / 2;
    const sh = (v) => barrelShade(Math.cos(Math.asin(within(v, -1, 1)) + 0.6));
    for (let x = x0 - 1; x <= x1; x++) {
      const hh = hhOf(Math.max(x0, x));
      for (let y = 0; y < H; y++) {
        const v = (y + 0.5 - cy) / hh; if (Math.abs(v) > 1) continue;
        if (x < x0) { const u = (x0 - x - 0.5) / 2; if (u * u + v * v > 1) continue; }
        g.set(x, y, BR[sh(v)]);
      }
    }
    for (let k = -6; k <= 6; k++) {
      const th = k * Math.PI / 6 + a; if (Math.cos(th) < 0.15) continue;
      for (let x = x0 + 1; x < x1; x++) { const y = Math.round(cy - 0.5 + Math.sin(th) * hhOf(x)), i = BR.indexOf(g.get(x, y)); if (i > 0) g.set(x, y, BR[Math.max(1, i - 1)]); }
    }
    if (Math.cos(a) > 0.3) SKULL7.forEach((row, j) => [...row].forEach((ch, i) => {
      const x = 9 + i, y = Math.round(cy - 3.5 + Math.sin(a) * 6.5 + j); if (BR.indexOf(g.get(x, y)) < 0) return;
      if (ch === '#') g.set(x, y, i >= 5 || j >= 5 ? BH.sh : BH.s); else if (ch === 'e') g.set(x, y, BH.e);
    }));
    for (const hx of [x0 + 3, x1 - 4]) for (let y = 0; y < H; y++) {
      const v = (y + 0.5 - cy) / hhOf(hx); if (Math.abs(v) > 1) continue;
      const k = sh(v), x = Math.round(hx + 1.2 * Math.sqrt(1 - v * v));
      g.set(x, y, IRN[Math.min(4, k)]); g.set(x + 1, y, IRN[Math.max(1, k - 2)]);
    }
    g.ell(x1 + 0.2, cy, 3, hhOf(x1) + 0.2, P.i2); g.ell(x1 + 0.6, cy, 2, hhOf(x1) - 1.2, P.w4);
    for (let y = 0; y < H; y++) for (let x = x1 - 4; x < W; x++) {
      const c = g.get(x, y);
      if (c === P.i2) g.set(x, y, y < cy - 3 ? P.i4 : y > cy + 3 ? P.i1 : P.i3);
      else if (c === P.w4) g.set(x, y, y < cy - 1 ? '#e2c07f' : y > cy + 2 ? P.w3 : P.w4);
    }
    g.vl(x1 + 1, Math.round(cy - 3), 6, P.w3, true);
    return g.outline();
  }
  // The same barrel lying the other way (its axis down the picture), mirrored across the diagonal so
  // the light still comes from the left and the near head is at the bottom, facing you.
  const transpose = (h) => { const g = new Grid(h.h, h.w); for (let y = 0; y < h.h; y++) for (let x = 0; x < h.w; x++) g.p[x * g.w + y] = h.get(x, y); return g; };


  // ---------------------------------------------------------------- a table on its side
  // Knocked over (29 Sep 2026, Enter the Gungeon's flipped tables): its top stood up toward where it
  // went. Three views: the top toward the camera with the legs' ends showing over it ('s'), the
  // underside toward the camera with the near legs coming at you ('n'), and edge-on with the legs
  // out to one side ('e'; 'w' is its mirror). Boards run the long way, lit from the upper left.
  function tableTop() {
    const W = 46, g = new Grid(W, 26);
    for (const x of [5, 38]) { g.rect(x, 0, 3, 7, P.w1); g.vl(x, 0, 7, P.w2); }            // far legs, pointing away
    g.rect(1, 6, W - 2, 3, P.w3); g.hl(1, 6, W - 2, P.w4);                                  // the edge, seen from above
    g.rect(1, 9, W - 2, 15, P.w2);                                                          // the top, standing
    for (let y = 9; y < 24; y += 5) { g.hl(1, y, W - 2, P.w3); g.hl(1, y + 4, W - 2, P.w1); }
    for (const [x, y] of [[9, 11], [30, 16], [17, 21], [40, 12]]) g.hl(x, y, 3, P.w1);       // grain
    g.vl(1, 9, 15, P.w4); g.hl(1, 23, W - 2, P.w0);
    for (const x of [4, 41]) { g.set(x, 11, P.i2); g.set(x, 20, P.i2); }                    // nails
    return g.outline();
  }
  function tableUnder() {
    const W = 46, g = new Grid(W, 26);
    g.rect(1, 0, W - 2, 15, P.w1); g.hl(1, 0, W - 2, P.w3);                                 // the underside
    g.rect(3, 2, W - 6, 11, P.w2, true); g.rect(5, 4, W - 10, 7, P.w1, true);               // the apron round it
    g.line(6, 5, W - 7, 10, P.w0); g.line(6, 10, W - 7, 5, P.w0);                           // a cross brace
    for (const x of [4, 38]) {                                                              // the near legs, coming at you
      g.rect(x, 12, 4, 13, P.w3); g.vl(x, 12, 13, P.w4); g.vl(x + 3, 12, 13, P.w1); g.hl(x, 24, 4, P.w0);
    }
    return g.outline();
  }
  function tableSide() {
    const H = 36, g = new Grid(28, H);
    for (const y of [4, 28]) { g.rect(3, y, 17, 3, P.w2); g.hl(3, y, 17, P.w3); g.hl(3, y + 2, 17, P.w1); }   // legs, out to the west
    g.rect(1, 3, 3, 3, P.w1); g.rect(1, 27, 3, 3, P.w1);                                     // their feet
    g.rect(19, 0, 7, H, P.w2); g.vl(19, 0, H, P.w3); g.vl(20, 0, H, P.w4);                  // the top, edge-on
    g.vl(25, 0, H, P.w1); g.hl(19, H - 1, 7, P.w0);
    for (let y = 5; y < H; y += 9) g.hl(21, y, 3, P.w1);
    return g.outline();
  }
  const mirror = (h) => { const g = new Grid(h.w, h.h); for (let y = 0; y < h.h; y++) for (let x = 0; x < h.w; x++) g.p[y * g.w + (h.w - 1 - x)] = h.get(x, y); return g; };


  // ---------------------------------------------------------------- the chandelier, 34 x 30
  // Enter the Gungeon's (29 Sep 2026): a brass ring of candles on three chains from a hub, hung over
  // a room; `k` is which of two flickers the flames are in. Down, it lies bent on the floor with its
  // candles out and scattered. Its rope is tied off at a cleat on the far wall.
  const CANDLES = [0.12, 0.5, 0.88, 1.3, 1.7].map((t) => t * Math.PI);
  function chandelier(k) {
    const g = new Grid(34, 31), cx = 17, cy = 23, rx = 13, ry = 5;
    for (const [x, y] of [[4, cy], [30, cy], [cx, cy - ry]]) { g.line(cx, 3, x, y, P.i2); for (let i = 2; i < 12; i += 3) g.set(Math.round(cx + (x - cx) * i / 12), Math.round(3 + (y - 3) * i / 12), P.i4); }
    g.rect(cx - 1, 1, 3, 3, P.b2); g.set(cx - 1, 1, P.b4); g.set(cx, 0, P.b3);                    // the hub
    g.ring(cx, cy, rx + 0.5, ry + 0.5, 2, P.b2);                                                    // the ring
    g.tone((x, y) => y < cy - 1, P.b4, [P.b2]); g.tone((x, y) => y > cy + 2, P.b1, [P.b2]);
    const stand = CANDLES.map((a) => ({ x: Math.round(cx + (rx - 0.5) * Math.cos(a)), y: Math.round(cy + (ry - 0.5) * Math.sin(a)) })).sort((a, b) => a.y - b.y);
    stand.forEach((c, i) => {
      g.rect(c.x, c.y - 6, 2, 6, P.c1); g.vl(c.x, c.y - 6, 6, P.c2); g.set(c.x + 1, c.y - 2, P.c0);   // the candle, a drip down it
      const f = (k + i) % 2;                                                                         // its flame, in one of two leans
      g.rect(c.x, c.y - 8, 2, 2, P.f2); g.set(c.x + f, c.y - 8, P.f3); g.set(c.x + f, c.y - 9, P.f2); g.set(c.x + 1 - f, c.y - 10, P.f1);
    });
    return g.outline();
  }
  function chandelierDown() {
    const g = new Grid(38, 16), r = rng(29), cx = 19, cy = 9;
    g.ring(cx, cy, 15, 5, 2, P.b2); g.tone((x, y) => y < cy - 1, P.b3, [P.b2]); g.tone((x, y) => y > cy + 1, P.b1, [P.b2]);
    g.rect(cx + 7, cy + 3, 5, 2, null);                                                             // bent where it hit
    for (const [x, y, w] of [[3, 3, 5], [26, 1, 4], [30, 12, 5], [9, 13, 4], [18, 4, 3]]) { g.rect(x, y, w, 2, P.c1); g.hl(x, y, w, P.c2); }
    for (let i = 0; i < 7; i++) g.set(Math.floor(r() * 36) + 1, Math.floor(r() * 14) + 1, P.c0);   // wax on the floor
    g.set(cx, 2, P.b3); g.set(cx + 1, 2, P.b2); g.set(cx - 1, 1, P.i3);                             // the hub and a link of chain
    return g.outline();
  }
  // The cleat the rope is tied off at, on the far wall; `cut` the rope is gone, a frayed end left.
  function cleat(cut) {
    const g = new Grid(10, 15);
    g.rect(2, 3, 6, 10, P.i1); g.vl(2, 3, 10, P.i2); g.vl(7, 3, 10, P.d1);
    for (const [x, y] of [[3, 4], [6, 4], [3, 11], [6, 11]]) g.set(x, y, P.i3);
    g.rect(1, 7, 8, 2, P.i3); g.hl(1, 7, 8, P.i4);                                                  // the horn of it
    if (!cut) { g.ell(5, 8, 3.2, 2.4, P.b2); g.hl(2, 8, 6, P.b1); g.hl(3, 7, 4, P.b3); g.vl(4, 0, 6, P.b3); g.vl(5, 0, 6, P.b2); }
    else { g.set(3, 9, P.b2); g.set(2, 10, P.b3); g.set(4, 10, P.b2); }
    return g.outline();
  }

  // ---------------------------------------------------------------- what lies on a table
  // The feast the cult sat down to, a thing a texel a colour off a letter grid (29 Sep 2026: "put
  // food on the tables that scatters when you hit them"). The golden apple, the milk and the
  // honeycomb are the table above the clouds (js/heaven.js).
  const art = (rows, pal) => { const g = new Grid(rows[0].length + 2, rows.length + 2);
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (pal[ch]) g.set(i + 1, j + 1, pal[ch]); })); return g.outline(); };
  const FOOD = {
    apple: art(['..gl.', '.rRr.', 'rRWrr', 'rRrrd', 'rrrdd', '.ddd.'], { g: P.b0, l: P.g3, r: '#c63a2d', R: '#e4584a', W: '#ffc2b0', d: '#7e211c' }),
    gapple: art(['..gl.', '.aAa.', 'aAWaa', 'aAaab', 'aaabb', '.bbb.'], { g: P.b0, l: P.g4, a: '#e0b040', A: '#f5d46a', W: '#fff6c8', b: P.b2 }),
    pear: art(['..g..', '..pp.', '.pPp.', 'pPWpp', 'pppqq', '.qqq.'], { g: P.b0, p: '#a8bd4c', P: '#c8d86c', W: '#f0f6b0', q: '#6f8a30' }),
    bread: art(['..bbbbb..', '.bBcBcBb.', 'bBBBBBBBb', 'bbbbbbbbd', '.ddddddd.'], { b: '#c08a48', B: '#dcaa60', c: '#f0d090', d: '#8a5a2a' }),
    cheese: art(['....yy.', '..yyYy.', 'yyYYyoy', 'yoyyyyk', 'kkkkkkk'], { y: '#e8c23a', Y: '#f6de70', o: '#b8901c', k: '#a8801e' }),
    jug: art(['.nn...', '.nN.h.', 'cCccch', 'cWccch', 'ccccc.', '.kkk..'], { n: '#b0643a', N: '#d08450', c: '#b0643a', C: '#d08450', W: '#f0b080', h: '#8a4a28', k: '#6a3620' }),
    milk: art(['.nn...', '.nN.h.', 'wWwwwh', 'wMwwwh', 'wwwws.', '.sss..'], { n: '#d8d0c0', N: '#fffaf0', w: '#e6e0d2', W: '#fffaf0', M: '#ffffff', h: '#b8b0a0', s: '#a8a090' }),
    goblet: art(['gGGgg', '.gGg.', '..g..', '..g..', '.ggg.'], { g: P.b2, G: P.b4 }),
    fish: art(['.bbbb..t', 'bBBeBbtt', 'bbbbbbtt', '.ssss..t'], { b: '#4e7ab0', B: '#86b0dc', e: P.ol, t: '#3a5a88', s: '#2c4a70' }),
    leg: art(['.mmm...', 'mMMmm..', 'mMmmmwW', 'mmmmm.W', '.ddd...'], { m: '#9a5a2a', M: '#c07a3a', d: '#6a3a1a', w: '#e8dcc0', W: '#f8f0e0' }),
    grapes: art(['..g..', '.vVv.', 'vVvVv', '.vvvq', '..vq.'], { g: P.b0, v: '#6a3a8a', V: '#9a6ac0', q: '#48245e' }),
    honey: art(['.hHh.', 'hHhHh', 'HhHhH', 'hHhHd', '.ddd.'], { h: '#e0a020', H: '#f8cc50', d: '#a86a10' }),
    plate: art(['.eeeee.', 'eEEEEEe', '.eeeee.'], { e: '#d6cfbc', E: '#f4efe2' }),
  };

  const sprites = {
    'door-wood': doorWood(), 'door-iron': doorIron(), 'door-vault': doorVault(), 'door-soul': doorSoul(),
    'broken-wood': debris('wood'), 'broken-iron': debris('iron'), 'broken-vault': debris('vault'), 'broken-soul': debris('soul'),
    sword: sword(), shield: shield(), bomb: bomb(),
    'mill-hub': millHub(), 'mill-arm': millArm(), 'cage-post': cagePost(), 'cage-broken': cageBroken(),
    altar: altar(), banner: banner(), gong: gong(),
    'soul-wisp': soulWisp(), 'healing-grass': grass(true), 'grass-small': grass(false), pail: pail(),
    'healing-grass@pass': grass(true, true), 'grass-small@pass': grass(false, true),
    'spikes-idle': grating('idle'), 'spikes-arming': grating('arming'), 'spikes-up': grating('up'),
    'sword-up': swordUp(), 'rack-back': rackBack(), 'rack-base': rackBase(),
    'coop-back': coopBack(), 'coop-front': coopFront(false), 'coop-cracked': coopFront(true),
    'stall-back': stallBack(), 'stall-front': stallFront(false), 'stall-cracked': stallFront(true),
    burrow: burrow(), stool: stool(), spire: spire(), 'roast-back': roastRing(false), 'roast-front': roastRing(true), 'roast-sticks': roastSticks(), 'roast-croc': croc(),
  };
  for (let k = 0; k < 8; k++) sprites['lantern-' + k] = lantern(k);
  for (let k = 0; k < 8; k++) { sprites['sconce-s' + k] = sconce(k, true); sprites['sconce-f' + k] = sconce(k, false); }
  sprites.barrel = barrelStand();
  for (let k = 0; k < 8; k++) { const lie = barrelLie(k); sprites['barrel-lie' + k] = lie; sprites['barrel-up' + k] = transpose(lie); }
  for (const k in FOOD) sprites['food-' + k] = FOOD[k];
  sprites['chand0'] = chandelier(0); sprites['chand1'] = chandelier(1); sprites['chand-down'] = chandelierDown();
  sprites.cleat = cleat(false); sprites['cleat-cut'] = cleat(true);
  sprites['table-s'] = tableTop(); sprites['table-n'] = tableUnder(); sprites['table-e'] = tableSide(); sprites['table-w'] = mirror(sprites['table-e']);
  // A layered sprite keeps its whole frame so its layers line up; everything else is cut to its silhouette.
  for (const k in sprites) if (!/^(rack|coop|stall|roast)-/.test(k)) sprites[k] = sprites[k].trim();
  return { P, Grid, sprites, rng };
})();
if (typeof module !== 'undefined') module.exports = PROP_PIXELS;

// In the page: every sprite is baked once to a canvas at `UP` texels a side and handed to PaintedArt
// in place of the painted image it asked for, inside the exact rect the painted one filled — its
// footprint, anchor and collision are untouched, and the painted art stays the fallback. The props
// that never had a painted image (coop, burrow, stool, bomb, pail, the small sprout, the roast) are
// drawn here outright at `TX` world px a texel, the grain of the crate and barrel beside them.
// There is nothing painted to fall back to any more (1.74): `PROP_PIXELS.on` is always true.
if (typeof document !== 'undefined' && typeof PaintedArt !== 'undefined') (() => {
  const UP = 4, TX = 1.35, baked = {}, S = PROP_PIXELS.sprites, rng = PROP_PIXELS.rng;
  // Always on since 1.74: the painted props they were drawn beside are gone (`#paintedprops` with them).
  PROP_PIXELS.on = true;
  // The art pass's version of a sprite where it has one (`name@pass`), else the sprite itself.
  const pick = name => typeof ART_PASS !== 'undefined' && ART_PASS.on && S[name + '@pass'] ? name + '@pass' : name;
  const canvasOf = name => {
    name = pick(name);
    if (baked[name]) return baked[name];
    const g = S[name], c = document.createElement('canvas'), x = c.getContext('2d');
    c.width = g.w * UP; c.height = g.h * UP;
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const v = g.get(i, j); if (v) { x.fillStyle = v; x.fillRect(i * UP, j * UP, UP, UP); } }
    return baked[name] = c;
  };
  // A sprite with its top-left at (x, y), `k` world px a texel.
  const put = (ctx, name, x, y, k = TX) => {
    const g = S[pick(name)], smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(canvasOf(name), x, y, g.w * k, g.h * k);
    ctx.imageSmoothingEnabled = smooth;
  };
  // `put` with its box landed on whole screen pixels. The camera eases its zoom whenever he starts
  // or stops running (`camera.zoomFast`), which slid a thin sprite's texels across the pixel grid
  // by most of a pixel a frame: the one-texel blade on a stand of arms flickered two and three
  // pixels wide as he walked up to it (24 Sep 2026: "the swords start blinking"). Snapped, its
  // columns only move as fast as the zoom itself. Upright draws only; anything turned is left alone.
  const putSnap = (ctx, name, x, y, k = TX) => {
    if (!ctx.getTransform) return put(ctx, name, x, y, k);
    const g = S[pick(name)], m = ctx.getTransform();
    if (m.b !== 0 || m.c !== 0 || m.a <= 0 || m.d <= 0) return put(ctx, name, x, y, k);
    const X0 = Math.round(m.a * x + m.e), Y0 = Math.round(m.d * y + m.f);
    const X1 = Math.round(m.a * (x + g.w * k) + m.e), Y1 = Math.round(m.d * (y + g.h * k) + m.f);
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(canvasOf(name), (X0 - m.e) / m.a, (Y0 - m.f) / m.d, (X1 - X0) / m.a, (Y1 - Y0) / m.d);
    ctx.imageSmoothingEnabled = smooth;
  };
  // A sprite with its top-left at (x, y), turned `q` quarter turns about its middle — whole turns only,
  // so its pixels stay square (the barrel's rule). What js/scatter.js throws about is drawn with it.
  PROP_PIXELS.draw = (ctx, name, x, y, k = TX, q = 0) => {
    const g = S[pick(name)]; if (!g) return;
    if (!(q & 3)) return put(ctx, name, x, y, k);
    const w = g.w * k, h = g.h * k, W = q & 1 ? h : w, H = q & 1 ? w : h;
    ctx.save(); ctx.translate(x + W / 2, y + H / 2); ctx.rotate((q & 3) * Math.PI / 2);
    put(ctx, name, -w / 2, -h / 2, k); ctx.restore();
  };
  // Where the object sits inside the 128px cell the painted atlas drew, measured off its alpha: the
  // pixel sprite is fitted into that box, not the whole cell, or it would come out a size larger.
  const CELL = {
    'mill-hub': [12, 8, 104, 108], 'spikes-idle': [8, 10, 112, 106], 'spikes-arming': [8, 10, 112, 106], 'spikes-up': [8, 10, 112, 106],
    sword: [8, 8, 112, 112], shield: [13, 8, 103, 108], 'healing-grass': [9, 8, 110, 108], 'soul-wisp': [26, 8, 77, 108],
  };
  // How each fills its box: 'bottom' stands on the box's floor, 'center' sits in it, 'fill' stretches
  // to it (the grating, squashed like the floor it is set in). `k` scales a sprite past the fit.
  const HOW = {
    'healing-grass': 'bottom', altar: 'bottom', gong: 'bottom', 'cage-post': 'bottom', banner: 'fill', 'mill-arm': 'fill',
    'spikes-idle': 'fill', 'spikes-arming': 'fill', 'spikes-up': 'fill', sword: { how: 'center', k: 1.35 }, shield: { how: 'center', k: 1.15 },
  };
  for (let k = 0; k < 8; k++) HOW['lantern-' + k] = 'bottom';
  const STAMP = {
    altar: 'altar', banner: 'banner', gong: 'gong', cagePostTight: 'cage-post', cageBrokenTight: 'cage-broken',
    slabWoodClosed: 'door-wood', slabIronClosed: 'door-iron', slabVaultClosed: 'door-vault', slabSoulClosed: 'door-soul',
  };
  const fit = (ctx, name, X, Y, W, H) => {
    const g = S[pick(name)], o = HOW[name] || 'center', how = o.how || o;
    let s = Math.min(W / g.w, H / g.h) * (o.k || 1), dw = g.w * s, dh = g.h * s;
    if (how === 'fill') { dw = W; dh = H; }
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(canvasOf(name), X + (W - dw) / 2, how === 'bottom' ? Y + H - dh : Y + (H - dh) / 2, dw, dh);
    ctx.imageSmoothingEnabled = smooth;
    return true;
  };

  const A = PaintedArt.prototype, stamp = A.stamp, atlas = A.atlas, fire = A.fire, millArm = A.millArm, brokenDoor = A.brokenDoor, drawProp = A.drawProp;
  // Asked by render.js wherever a primitive draw sits inline with no painted image to swap.
  Object.defineProperty(A, 'pixelProps', { get: () => PROP_PIXELS.on });
  A.stamp = function (ctx, key, x, y, w, h, anchor = 0.5) {
    const name = PROP_PIXELS.on && STAMP[key], sz = PAINTED_SIZE[key];
    if (!name) return stamp.call(this, ctx, key, x, y, w, h, anchor);
    if (h === undefined) h = sz ? w * sz[1] / sz[0] : w * S[name].h / S[name].w;
    fit(ctx, name, x - w / 2, y - h * anchor, w, h);
  };
  A.atlas = function (ctx, name, x, y, w, h, anchor = 0.5) {
    const box = PROP_PIXELS.on && CELL[name];
    if (!box) return atlas.call(this, ctx, name, x, y, w, h, anchor);
    if (h === undefined) h = w;
    return fit(ctx, name, x - w / 2 + box[0] * w / 128, y - h * anchor + box[1] * h / 128, box[2] * w / 128, box[3] * h / 128);
  };
  A.fire = function (renderer, key, x, y, w, anchor = 0.875) {
    if (!PROP_PIXELS.on || key !== 'lanternFire') return fire.call(this, renderer, key, x, y, w, anchor);
    return fit(renderer.ctx, 'lantern-' + (Math.floor(renderer.t * 10) % 8), x - w / 2 + 45 * w / 128, y - w * anchor + 12 * w / 128, 39 * w / 128, 104 * w / 128);
  };
  // Centred on the arm's own line and as tall as its iron head; the beam in the middle of the sprite
  // is the width that hits (`mill.armHalfWidth`), the head past it is the cap the old draw added.
  A.millArm = function (ctx, x, len) {
    if (!PROP_PIXELS.on) return millArm.call(this, ctx, x, len);
    const h = TUNING.mill.armHalfWidth * TILE * 2 * 17 / 9;
    return fit(ctx, 'mill-arm', x, -h / 2, len, h);
  };
  A.millHub = function (ctx, r) { return fit(ctx, 'mill-hub', -r * 1.1, -r * 1.1, r * 2.2, r * 2.2); };
  A.brokenDoor = function (game, p) {
    if (!PROP_PIXELS.on) return brokenDoor.call(this, game, p);
    const name = 'broken-' + (p.gate ? 'soul' : p.vault && !p.vaultEmpty ? 'vault' : p.iron ? 'iron' : 'wood'), ctx = game.world.dctx;
    ctx.save(); ctx.translate(p.x, p.y); if (!p.vertical) ctx.rotate(Math.PI / 2);
    ctx.globalAlpha = 0.85; fit(ctx, name, -12, -29, 24, 58); ctx.restore();
  };
  // The pail as an offer on her shelf (render.js `drawMilkOffer`): `r` wide each side, standing on `y`.
  A.pail = function (ctx, x, y, r) { const g = S.pail, k = r * 2 / (g.w - 2); put(ctx, 'pail', x - g.w * k / 2, y - g.h * k, k); return true; };
  // The ware's stool, under the talisman (render.js `drawWare` asks).
  A.stool = function (ctx, p) { put(ctx, 'stool', p.x - S.stool.w * TX / 2, p.y + 9 - S.stool.h * TX); return true; };
  // THE DARK's lantern on the wall (`Prop.wall`), in the prop's own upright frame (`drawProp`): off a
  // side wall on its arm, the plate on the wall's edge a quarter tile past the prop and the lantern
  // up at a man's shoulder; on the far wall, fixed to its face. There is no painted one to fall
  // back to, so it is drawn whether or not the pixel props are on.
  A.sconce = function (ctx, p, t) {
    const W = p.wall, side = W.x !== 0, k = Math.floor(t * 9 + p.phase * 3) % 8, name = (side ? 'sconce-s' : 'sconce-f') + k, g = S[name];
    if (side) {
      const ex = p.x + W.x * TILE * 0.25, y = p.y - 12 - g.h * TX;
      ctx.save(); ctx.translate(ex, 0); if (W.x > 0) ctx.scale(-1, 1);
      put(ctx, name, 0, y); ctx.restore();
    } else put(ctx, name, p.x - g.w * TX / 2, p.y - TILE * 0.25 * TILT - 6 - g.h * TX);
    return true;
  };

  // The rope's cleat on the far wall, drawn like the far-wall lantern: fixed to the face above its tile.
  // `cleatHook` is where the rope leaves it, in the prop's own upright frame (the chandelier asks).
  const cleatTop = (p) => p.y - TILE * 0.25 * TILT - 4 - S.cleat.h * TUNING.chandelier.texel;
  A.cleat = function (renderer, p) {
    const name = p.cut ? 'cleat-cut' : 'cleat', g = S[name], k = TUNING.chandelier.texel;
    put(renderer.ctx, name, p.x - g.w * k / 2, cleatTop(p)); return true;
  };
  // The chandelier, in two passes (`Renderer.drawProp` for the floor, `drawChandelierAir` over
  // everyone): on the floor its shadow, which says where it will land and darkens as it comes, or
  // the wreck once it has; in the air the ring `p.z` px up, swaying a little, and its rope to the
  // cleat — or, cut, a frayed end trailing after it. Both in the prop's own upright frame.
  A.chandelier = function (renderer, p, pass) {
    const ctx = renderer.ctx, C = TUNING.chandelier;
    if (p.drop === 'down') {
      if (pass !== 'air') { const g = S['chand-down'], k = C.texel; renderer.shadow(p.x, p.y + 3, g.w * k * 0.46, 6); put(ctx, 'chand-down', p.x - g.w * k / 2, p.y + 8 - g.h * k, k); }
      return true;
    }
    if (pass !== 'air') {
      const k = 1 - clamp(p.z / C.z, 0, 1);
      ctx.save(); ctx.globalAlpha *= 0.55 + 0.4 * k; renderer.shadow(p.x, p.y + 2, C.killR * (1 - 0.25 * k), C.killR * 0.42 * (1 - 0.25 * k)); ctx.restore();
      return true;
    }
    const sway = p.drop === 'hang' ? Math.sin(renderer.t * 1.3 + p.phase) * C.sway * 40 : 0;
    const name = 'chand' + (Math.floor(renderer.t * 7 + p.phase * 3) % 2), g = S[name], w = g.w * C.texel, h = g.h * C.texel;
    const x0 = Math.round(p.x + sway - w / 2), y0 = Math.round(p.y - p.z * TILT - h), hx = x0 + w / 2, hy = y0 + C.texel;
    // the rope, a cell at a time: up to the cleat while it holds, a frayed tail once it is cut
    const c = p.cleat, cell = Math.max(1.5, TX * 1.1), PP = PROP_PIXELS.P;
    let ex = hx, ey = hy - 14;
    if (c && !c.cut) { ex = c.x; ey = p.y + (c.y + (cleatTop(c) + C.texel - c.y) / TILT - p.y) * TILT; }
    const n = Math.max(2, Math.ceil(Math.hypot(ex - hx, ey - hy) / cell));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = Math.round(hx + (ex - hx) * t), y = Math.round(hy + (ey - hy) * t + (c && !c.cut ? Math.sin(t * Math.PI) * 6 : 0));
      ctx.fillStyle = PP.ol; ctx.fillRect(x - cell / 2 - 0.5, y - cell / 2 - 0.5, cell + 1, cell + 1);
      ctx.fillStyle = i % 3 ? PP.b2 : PP.b1; ctx.fillRect(x - cell / 2, y - cell / 2, cell, cell);
    }
    put(ctx, name, x0, y0, C.texel);
    return true;
  };

  A.drawProp = function (renderer, p) {
    if (!PROP_PIXELS.on) return drawProp.call(this, renderer, p);
    const ctx = renderer.ctx;
    // The stand of arms, with what it holds standing IN it: the uprights and base behind, the arm,
    // then the front of the base over its foot.
    if (p.kind === 'weapon' && p.inStand) {
      // Its glow is not the stand: in THE DARK's silhouette pass it came out as a black cloud.
      if (!renderer.silPass) {
        const gl = ctx.createRadialGradient(p.x, p.y - 12, 0, p.x, p.y - 12, 40), a = 0.14 + 0.05 * Math.sin(renderer.t * 2.6 + p.phase);
        gl.addColorStop(0, `rgba(239,230,208,${a})`); gl.addColorStop(1, 'rgba(239,230,208,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, p.y - 12, 40, 0, Math.PI * 2); ctx.fill();
      }
      renderer.shadow(p.x, p.y + 1, 14, 5);
      const x0 = p.x - 12 * TX, y0 = p.y + 5 - 23 * TX;
      putSnap(ctx, 'rack-back', x0, y0);
      if (p.weapon === 'sword') putSnap(ctx, 'sword-up', x0 + 9 * TX, y0);
      else putSnap(ctx, 'shield', p.x - S.shield.w * TX / 2, y0 + 19 * TX - S.shield.h * TX);
      putSnap(ctx, 'rack-base', x0, y0);
      return true;
    }
    // The bomb: the shell as drawn, and a fuse of cells as long as the time it has left, sparking
    // faster and further the closer it is to going.
    if (p.kind === 'bomb') {
      const armed = p.fuseT >= 0, pct = armed ? clamp(p.fuseT / TUNING.prop.bomb.fuse, 0, 1) : 1, g = S.bomb, k = p.r * 2 / 12;
      renderer.shadow(p.x, p.y, p.r * 0.9, p.r * 0.4);
      ctx.save(); ctx.translate(p.x, p.y - (p.held ? 6 : 0));
      if (p.flung) ctx.rotate(Math.atan2(p.vy, p.vx) * 0.3);
      const bx = -7.5 * k, by = -8.5 * k;
      put(ctx, 'bomb', bx, by, k);
      const n = 1 + Math.round(4 * pct);
      let tx = 0, ty = 0;
      for (let i = 0; i < n; i++) {
        tx = bx + (8 + (i >> 1)) * k; ty = by - i * k;
        ctx.fillStyle = i === n - 1 && armed ? PALETTE.fireHi : i % 2 ? '#82552f' : '#a06d3f';
        ctx.fillRect(Math.round(tx), Math.round(ty), Math.ceil(k), Math.ceil(k));
      }
      if (armed) {
        const c = Math.max(1, Math.round(k)), f = Math.floor(renderer.t * (18 + 30 * (1 - pct))), m = 2 + Math.round(5 * (1 - pct));
        for (let j = 0; j < m; j++) {
          const h = Math.imul(f * 31 + j, 2654435761) >>> 0, reach = 2 + (h % (3 + Math.round(6 * (1 - pct)))), an = (h >>> 8) % 628 / 100;
          ctx.fillStyle = j % 2 ? PALETTE.fire : PALETTE.fireHi;
          ctx.fillRect(Math.round(tx + Math.cos(an) * reach), Math.round(ty + Math.sin(an) * reach), c, c);
        }
      }
      ctx.restore(); return true;
    }
    // The ordinary sprout: the big patch's grass, smaller, with the same glow and graze ring.
    if (p.kind === 'heal' && !p.big && !p.pail) {
      const bob = Math.sin(renderer.t * 2.4 + p.phase) * 2, g = S['grass-small'];
      if (!renderer.silPass) {   // a glow flattened by THE DARK's silhouettes is a solid disc
        const glow = ctx.createRadialGradient(p.x, p.y + bob, 0, p.x, p.y + bob, 34);
        glow.addColorStop(0, 'rgba(168,189,108,0.22)'); glow.addColorStop(1, 'rgba(168,189,108,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y + bob, 34, 0, Math.PI * 2); ctx.fill();
      }
      renderer.shadow(p.x, p.y + 4, 11, 5);
      put(ctx, 'grass-small', p.x - g.w * TX / 2, p.y + 6 + bob - g.h * TX);
      if (p.graze > 0) {
        const frac = renderer.grazeOf(p);
        ctx.strokeStyle = 'rgba(168,189,108,0.85)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(p.x, p.y + bob, 17, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
      }
      return true;
    }
    // The horse's stall: upright on its near edge, square pixels, the horse at its own size pacing
    // behind the rails (`TUNING.prop.stall.pace` px either way), the front split after one blow.
    if (p.kind === 'coop' && p.box) {
      const b = p.box, g = S['stall-back'], k = b.hx * 2 / (g.w - 2), w = g.w * k, h = g.h * k;
      const shake = p.wobble > 0 ? Math.sin(renderer.t * 55) * p.wobble * 3 : 0;
      ctx.save(); ctx.translate(p.x + shake, p.y + b.hy);
      renderer.shadow(0, -b.hy * 0.5, b.hx * 1.05, b.hy * 0.62);
      ctx.scale(1, 1 / TILT);
      put(ctx, 'stall-back', -w / 2, -h, k);
      const bx = Math.sin(renderer.t * 0.9 + p.phase) * TUNING.prop.stall.pace;
      ctx.save(); ctx.translate(bx, -h * 0.1);   // its hooves in the straw between the two rails
      // Standing, turned the way it shifts: a gallop at a walker's pace read as a horse on a treadmill.
      renderer.horseSprite(ctx, Math.cos(renderer.t * 0.9 + p.phase) > 0 ? 0 : Math.PI, false, 'idle', p.phase);
      ctx.restore();
      put(ctx, (p.hits || 0) > 0 ? 'stall-cracked' : 'stall-front', -w / 2, -h, k);
      ctx.restore(); return true;
    }
    // The coop: its dark inside, the animal pacing in it, the slats over it (split after one blow).
    if (p.kind === 'coop') {
      const g = S['coop-back'], k = p.r * 2 / (g.w - 2), w = g.w * k, h = g.h * k;
      const shake = p.wobble > 0 ? Math.sin(renderer.t * 55) * p.wobble * 4 : 0;
      ctx.save(); ctx.translate(p.x + shake, p.y);
      renderer.shadow(0, h * 0.42, p.r * 0.95, p.r * 0.45);
      put(ctx, 'coop-back', -w / 2, -h / 2, k);
      const bx = Math.sin(renderer.t * 1.3 + p.phase) * p.r * 0.35;
      ctx.save(); ctx.beginPath(); ctx.rect(-w / 2 + 2 * k, -h / 2 + 2 * k, w - 4 * k, h - 4 * k); ctx.clip();
      if (!p.holds || p.holds === 'chicken') {
        ctx.save(); ctx.translate(bx, h * 0.28); this.character(renderer, { facing: Math.cos(renderer.t * 1.3 + p.phase) > 0 ? 0 : Math.PI }, 'chicken', 22); ctx.restore();
      } else {
        ctx.translate(bx, 2); ctx.scale(0.8, 0.8);
        const pet = { x: 0, y: 0, kind: p.holds, r: TUNING.prop[p.holds].r, vx: Math.cos(renderer.t * 1.3 + p.phase) * 20, vy: 0,
          bob: renderer.t * 2 + p.phase, phase: p.phase, tuckT: 0, honkT: 0 };
        if (p.holds === 'tortoise') renderer.drawTortoise(pet);
        else if (p.holds === 'goose') renderer.drawGoose(pet);
        else if (p.holds === 'crow') renderer.drawCrow(pet);
        else if (p.holds === 'horse') { ctx.scale(0.62, 0.62); renderer.horseSprite(ctx, Math.cos(renderer.t * 1.3 + p.phase) > 0 ? 0 : Math.PI, true, 'idle'); }
      }
      ctx.restore();
      put(ctx, (p.hits || 0) > 0 ? 'coop-cracked' : 'coop-front', -w / 2, -h / 2, k);
      ctx.restore(); return true;
    }
    // The powder barrel (29 Sep 2026, Enter the Gungeon's): standing, on its feet, shivering while a
    // lit fuse runs out or a blow still rings in it; knocked over, lying across the way it rolls, a
    // frame for every eighth of a turn of how far it has rolled (`rollD`), so the seams and the skull
    // go round with it and come back the other way when it bounces back.
    if (p.kind === 'barrel') {
      const B = TUNING.prop.barrel, lit = p.oilT >= 0, k = B.draw / S.barrel.w;
      ctx.save(); ctx.translate(p.x, p.y);
      let top;
      if (p.lying) {
        const up = p.rollAxis === 'v', step = Math.PI * B.draw * 0.85 / 8;
        const f = ((Math.floor((p.rollD || 0) / step) % 8) + 8) % 8, name = (up ? 'barrel-up' : 'barrel-lie') + f, g = S[name];
        renderer.shadow(0, p.r * 0.55, g.w * k * 0.46, 5);
        top = p.r * 0.15 - g.h * k / 2;
        put(ctx, name, -g.w * k / 2, top, k);
      } else {
        const g = S.barrel, shiver = lit ? Math.sin(renderer.t * 60) * (1 - p.oilT / B.fuse) * 1.2 : p.wobble > 0 ? Math.sin(renderer.t * 50) * p.wobble * 4 : 0;
        renderer.shadow(0, p.r * 0.6, B.draw * 0.44, 6);
        top = p.r * 0.8 - g.h * k;
        put(ctx, 'barrel', shiver - g.w * k / 2, top, k);
      }
      if (lit && !renderer.silPass && !renderer.baking) renderer.flame(0, top + 3, B.fuseDraw, p.phase * 10, p.oilWitch);
      ctx.restore(); return true;
    }
    // A table on its side (`Prop.flipTable`): its top toward where it was going, rocking while a
    // headbutt still rings in it.
    if (p.kind === 'table' && p.flipped && !p.isAltar) {
      const name = 'table-' + p.flipped, g = S[name], wob = p.wobble > 0 ? Math.sin(renderer.t * 60) * p.wobble * 5 : 0;
      ctx.save(); ctx.translate(p.x + wob, p.y);
      renderer.shadow(0, p.r * 0.35, g.w * TX * 0.52, 7);
      put(ctx, name, -g.w * TX / 2, p.r * 0.5 - g.h * TX);
      ctx.restore(); return true;
    }
    // A table, and the supper on it (js/scatter.js). The ritual altar keeps its own drawing.
    if (p.kind === 'table' && !p.isAltar) {
      const drew = drawProp.call(this, renderer, p);
      if (typeof Scatter !== 'undefined') Scatter.drawOnTable(renderer, p);
      return drew;
    }
    return drawProp.call(this, renderer, p);
  };

  const R = Renderer.prototype, drawPail = R.drawPail, drawBurrow = R.drawBurrow, drawRoast = R.drawRoast,
    drawSpire = R.drawSpire, drawStairs = R.drawStairs;
  // The cave's teeth, with their point catching the light now and then (`cave.spikes.glint`).
  R.drawSpire = function (p) {
    if (!PROP_PIXELS.on) return drawSpire.call(this, p);
    const g = S.spire, k = p.r * 2.4 / g.w, x0 = p.x - g.w * k / 2, y0 = p.y + 5 - g.h * k;
    this.shadow(p.x, p.y + 2, p.r * 0.95, p.r * 0.42);
    put(this.ctx, 'spire', x0, y0, k);
    const tw = Math.pow(Math.max(0, Math.sin(this.t * 1.6 + p.x * 0.05)), 8);
    if (tw > 0.04 && !this.baking) { this.ctx.fillStyle = `rgba(255,255,255,${tw * TUNING.cave.spikes.glint})`; this.ctx.fillRect(x0 + 10 * k, y0 + 1 * k, k * 1.5, k * 1.5); }
  };
  // A flight of stairs as stone steps on the pixel grain: each tile four steps, each step a dark riser,
  // a lit nosing and a speckled tread, the slabs' joints staggered step to step. Up a flight the treads
  // pale toward the light at the top; the fork's cold flight and the way down go into black. Baked once
  // per level colour, direction and tile of the flight.
  const hex = c => { const n = parseInt(c.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  const BONE = [239, 230, 208], BLACK = [5, 4, 8], COLD = [150, 158, 210];
  const stairTile = (def, k, up, cold, v) => {
    const key = [def.wall, def.wallTop, k, up, cold, v].join('|');
    if (baked[key]) return baked[key];
    const c = document.createElement('canvas'), x = c.getContext('2d'), N = 24, r = rng(k * 31 + v * 7 + (up ? 3 : 0));
    c.width = c.height = N * UP;
    for (let i = 0; i < 4; i++) {
      const n = k * 4 + i, f = Math.min(1, n / 11);
      let tread = hex(up ? def.wallTop : def.wall);
      if (up && cold) tread = mix(tread, BLACK, 0.3 + 0.68 * f);
      else if (up) tread = mix(tread, BONE, 0.1 + 0.68 * f * f);
      else tread = mix(mix(tread, BONE, 0.04 + 0.34 * f), BLACK, 0.85 * (1 - f) * (1 - f));
      const joint = (n * 3) % 8;
      for (let yy = 0; yy < N; yy++) for (let q = 0; q < 6; q++) {
        let col = tread;
        if (q === 0) col = mix(tread, BLACK, 0.5);
        else if (q === 1) col = up && cold ? mix(tread, COLD, 0.26 * (1 - f)) : mix(tread, BONE, 0.2);
        else if ((yy - joint + 8) % 8 === 0) col = mix(tread, BLACK, 0.3);
        else { const d = r(); if (d < 0.16) col = mix(tread, BLACK, 0.14); else if (d > 0.92) col = mix(tread, BONE, 0.1); }
        x.fillStyle = css(col); x.fillRect((i * 6 + q) * UP, yy * UP, UP, UP);
      }
    }
    return baked[key] = c;
  };
  R.drawStairs = function (px, py, k, up, def, cold) {
    if (!PROP_PIXELS.on) return drawStairs.call(this, px, py, k, up, def, cold);
    const ctx = this.ctx, smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(stairTile(def, k, up, !!cold, (py / TILE | 0) % 3), px, py, TILE, TILE);
    ctx.imageSmoothingEnabled = smooth;
    if (up && k === 2 && !cold) {
      const pulse = 0.55 + 0.25 * Math.sin(this.t * 3.4);
      ctx.fillStyle = `rgba(255,224,138,${pulse * 0.45})`; ctx.fillRect(px + TILE * 0.5, py - 8, TILE * 0.7, TILE + 16);
    }
  };
  // The mouse's pail as tall as the goat, a pip on its hoop for every heart still in it.
  R.drawPail = function (p) {
    if (!PROP_PIXELS.on) return drawPail.call(this, p);
    const ctx = this.ctx, g = S.pail, R = p.r * 1.7, k = R * 2 / (g.w - 2), y0 = p.y + 4;
    this.shadow(p.x, p.y + 4, R * 1.05, R * 0.45);
    put(ctx, 'pail', p.x - g.w * k / 2, y0 - g.h * k, k);
    ctx.fillStyle = PALETTE.bone;
    for (let q = 0; q < p.pail; q++) ctx.fillRect(Math.round(p.x - (p.pail * 5 - 2) / 2 + q * 5), Math.round(y0 - g.h * k + 8 * k), 3, 3);
    if (p.graze > 0) {
      const frac = this.grazeOf(p);
      ctx.strokeStyle = 'rgba(239,230,208,0.85)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(p.x, p.y, R * 1.05, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    }
  };
  R.drawBurrow = function (p) {
    if (!PROP_PIXELS.on) return drawBurrow.call(this, p);
    const g = S.burrow;
    put(this.ctx, 'burrow', p.gap.x - g.w * TX / 2, p.gap.y - g.h * TX / 2);
  };
  // The roast: stones behind, the fire (the game's own pixel flames), stones in front, the forked
  // sticks, and the crocodile on the spit, which turns — seen side on, the turn squashes him.
  R.drawRoast = function (p) {
    if (!PROP_PIXELS.on) return drawRoast.call(this, p);
    const ctx = this.ctx, t = this.t, B = TUNING.prop.brazier;
    const heat = p.spillCd > 0 ? 0.35 + 0.65 * (1 - p.spillCd / B.spillCd) : 1;
    ctx.save(); ctx.translate(p.x, p.y + 6);
    this.shadow(0, 4, 38, 10);
    put(ctx, 'roast-back', -20 * TX, 2 - 9 * TX);
    if (!this.silPass && !this.baking) {
      this.flame(-5, 3, 10 * heat, p.phase * 10 + 2); this.flame(5, 3, 9 * heat, p.phase * 10 + 5); this.flame(0, 4, 14 * heat, p.phase * 10);
      for (let q = 0; q < 4; q++) {
        const ph = (t * 0.9 + q * 0.27 + p.phase) % 1;
        ctx.globalAlpha = (1 - ph) * heat; ctx.fillStyle = q % 2 ? '#c8321a' : PALETTE.fire;
        ctx.fillRect(Math.round(Math.sin(q * 3.1 + t * 2) * 12), Math.round(-8 - ph * 26), 2, 2);
      }
      ctx.globalAlpha = 1;
    }
    put(ctx, 'roast-front', -20 * TX, 2 - 9 * TX);
    put(ctx, 'roast-sticks', -40 * TX, -29 - 7.5 * TX);
    const turn = Math.cos(t * B.roastTurn + p.phase);
    ctx.save(); ctx.translate(0, -29); ctx.scale(1, turn >= 0 ? Math.max(0.3, turn) : Math.min(-0.3, turn));
    put(ctx, 'roast-croc', -S['roast-croc'].w * TX / 2, -7.5 * TX);
    ctx.restore(); ctx.restore();
  };
})();
