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
    // the cult's bright red: a glint in a skull's socket, the stripe on the bull's brow
    h0: '#4a0d14', h1: '#7c1620', h2: '#b02a2c', h3: '#de503c',
    // bone, white enough to stand off every floor, and horn, a step darker with ridges (the bone shields)
    n0: '#5e5240', n1: '#9a8c6c', n2: '#cbbf9e', n3: '#e6dcc0', n4: '#f8f3e2',
    k0: '#241e1a', k1: '#463c33', k2: '#6a5c4c',
    // blood on the bone shield's points, fresh and dried
    x1: '#7c1612', x2: '#b3241b',
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
  // A halberd off a suit of armour (3 Oct 2026): the suit's own, lying, the shaft long, the head
  // at the far end, spike, axe blade up, hook down. Thrown it is the sword's blade (`p.halberd`).
  function halberd() {
    const g = new Grid(31, 11), y = 5;
    g.hl(1, y, 22, P.w2); g.hl(1, y + 1, 22, P.w1); g.set(1, y, P.w3); g.set(8, y, P.w3); g.set(15, y, P.w3);   // the shaft
    g.rect(0, y, 1, 2, P.i2);                                                                       // its butt cap
    g.rect(23, y - 1, 2, 4, P.i2);                                                                  // the socket
    g.hl(25, y, 5, P.i4); g.hl(25, y + 1, 5, P.i3); g.set(30, y, P.i3);                             // the spike
    g.poly([[23, y - 1], [28, y - 1], [29, y - 5], [26, y - 5], [23, y - 3]], P.i3); g.hl(26, y - 5, 4, P.i4);   // the axe blade
    g.rect(23, y + 2, 2, 2, P.i2); g.set(25, y + 3, P.i2); g.set(26, y + 4, P.i1);                   // the hook
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
  // The shieldman's board (2 Oct 2026, the user's: "a shield of bones, of animals' heads, horns outward,
  // white so he stands out, the spikes are the horns", then "skulls of different animals, riveted
  // together"): the skulls of beasts the cult has eaten, riveted to a frame of sticks on his right arm
  // (`PaintedArt.board`). The horns stand out of it as its points, which is
  // why the horns of the goat into its front cost him a heart (`TUNING.shieldman.spikes`). Three designs
  // (`SHIELD_LOOKS`, the ART tab's SHIELD button), each in three views: the face (`f`, toward the
  // camera), edge on (`s`, the side views, its front to the right) and the back (`b`, the frame of
  // sticks and the strap, the horns still standing past it). Bone white with a red glint in the sockets.
  const HORN = [P.k0, P.k1, P.k2];
  // a horn as a run of 2-wide steps, dark ridges every other one, its point the brightest pixel
  const horn = (g, pts) => {
    pts.forEach(([x, y], i) => { const c = i % 2 ? HORN[1] : HORN[2]; g.set(x, y, c); if (i < pts.length - 3) g.set(x, y + 1, HORN[0]); });
    const [x, y] = pts[pts.length - 1]; g.set(x, y, P.c2);
  };
  // The beasts the cult has eaten (2 Oct 2026, the user's: "skulls of different animals, riveted together"),
  // each a skull drawn at (cx, cy) and size `k`, back to front: horns and tusks first, then the bone, then
  // the holes. `hornT` lays a horn, tusk or antler as a tapering run of discs along `pts`, ridged every
  // step and to a bright point, so every point the shield has is a thing that grew on an animal.
  const hornT = (g, pts, w0, w1, ramp) => {
    const R = ramp || HORN; let L = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
    let at = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.max(1, Math.ceil(seg[i - 1] * 2));
      for (let s = 0; s <= n; s++) {
        const q = s / n, x = x0 + (x1 - x0) * q, y = y0 + (y1 - y0) * q, t = (at + seg[i - 1] * q) / (L || 1), r = (w0 + (w1 - w0) * t) / 2;
        const c = t > 0.9 ? P.c2 : Math.floor((at + seg[i - 1] * q) / 1.4) % 2 ? R[1] : R[2];
        for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++)
          if ((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r + 0.2) g.set(xx, yy, (xx + 0.5 - x) + (yy + 0.5 - y) > r * 0.6 && t <= 0.9 ? R[0] : c);
        if (r < 0.75) g.set(Math.round(x - 0.5), Math.round(y - 0.5), c);
      }
      at += seg[i - 1];
    }
  };
  const TUSK = [P.n0, P.n3, P.n4];
  // bone lit from the upper left, the holes dark, `glint` a red point deep in each socket
  const sockets = (g, xs, y, s, glint) => { for (const x of xs) { g.rect(Math.round(x), Math.round(y), s, s, P.d); if (glint) g.set(Math.round(x) + s - 1, Math.round(y) + s - 1, P.h3); } };
  const boneLight = (g, x0, y0, x1, y1) => {
    for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) {
      const v = g.get(x, y); if (v !== P.n2) continue;
      const u = (x - x0) / Math.max(1, x1 - x0) + (y - y0) / Math.max(1, y1 - y0);
      g.set(x, y, u < 0.45 ? P.n3 : u > 1.45 ? P.n1 : P.n2);
    }
  };
  const SK = {
    // the goat's: a narrow face, the horns sweeping back and up
    goat(g, cx, cy, k, glint) {
      for (const m of [-1, 1]) hornT(g, [[cx + m * 2 * k, cy - 2.6 * k], [cx + m * 3.8 * k, cy - 4.2 * k], [cx + m * 4.8 * k, cy - 6.4 * k], [cx + m * 6.4 * k, cy - 7.4 * k], [cx + m * 7.6 * k, cy - 7 * k]], 2.4 * k, 0.8);
      g.ell(cx, cy - 1.2 * k, 3.4 * k, 2.6 * k, P.n2);
      g.poly([[cx - 2.4 * k, cy - 0.5 * k], [cx + 2.4 * k, cy - 0.5 * k], [cx + 1 * k, cy + 5.6 * k], [cx - 1 * k, cy + 5.6 * k]], P.n2);
      boneLight(g, cx - 3.4 * k, cy - 3.8 * k, cx + 3.4 * k, cy + 5.6 * k);
      sockets(g, [cx - 2.2 * k, cx + 2.2 * k - (k >= 1.2 ? 1 : 0)], cy - 0.9 * k, k >= 1.2 ? 2 : 1, glint);
      g.set(Math.round(cx - 1), Math.round(cy + 4.3 * k), P.n0); g.set(Math.round(cx), Math.round(cy + 4.3 * k), P.n0);
    },
    // the bull's: a wide flat brow, a long face, the horns straight out and hooked up
    bull(g, cx, cy, k, glint) {
      for (const m of [-1, 1]) hornT(g, [[cx + m * 3 * k, cy - 2 * k], [cx + m * 6 * k, cy - 2.4 * k], [cx + m * 8 * k, cy - 4.2 * k], [cx + m * 8.6 * k, cy - 6.8 * k]], 2.6 * k, 0.8);
      g.ell(cx, cy - 1.6 * k, 4 * k, 2.3 * k, P.n2);
      g.poly([[cx - 3.2 * k, cy - 1 * k], [cx + 3.2 * k, cy - 1 * k], [cx + 1.9 * k, cy + 7 * k], [cx - 1.9 * k, cy + 7 * k]], P.n2);
      boneLight(g, cx - 4 * k, cy - 3.9 * k, cx + 4 * k, cy + 7 * k);
      sockets(g, [cx - 2.6 * k, cx + 1.6 * k], cy - 0.4 * k, 2, glint);
      g.vl(Math.round(cx - 0.5), Math.round(cy + 1.5 * k), Math.round(3 * k), P.n1);
      g.set(Math.round(cx - 1.4), Math.round(cy + 5.6 * k), P.n0); g.set(Math.round(cx + 0.4), Math.round(cy + 5.6 * k), P.n0);
    },
    // the ram's: a round crown, a short face, the horns curled into a spiral either side
    ram(g, cx, cy, k, glint) {
      for (const m of [-1, 1]) {
        const ox = cx + m * 3.8 * k, oy = cy + 0.6 * k, pts = [];
        for (let i = 0; i <= 14; i++) { const a = -Math.PI / 2 + m * i * 0.48, r = (3.2 - i * 0.16) * k; pts.push([ox + Math.cos(a) * r, oy + Math.sin(a) * r]); }
        hornT(g, pts, 2.4 * k, 1);
      }
      g.ell(cx, cy - 0.6 * k, 3 * k, 2.8 * k, P.n2);
      g.poly([[cx - 2 * k, cy + 0.5 * k], [cx + 2 * k, cy + 0.5 * k], [cx + 0.9 * k, cy + 4.2 * k], [cx - 0.9 * k, cy + 4.2 * k]], P.n2);
      boneLight(g, cx - 3 * k, cy - 3.4 * k, cx + 3 * k, cy + 4.2 * k);
      sockets(g, [cx - 2 * k, cx + 2 * k - 1], cy - 0.2 * k, 1, glint);
    },
    // the boar's: a long low snout and the tusks curling up out of it, the meanest points on him
    boar(g, cx, cy, k, glint) {
      g.ell(cx, cy - 1 * k, 3 * k, 2.4 * k, P.n2);
      g.poly([[cx - 2.2 * k, cy], [cx + 2.2 * k, cy], [cx + 1.5 * k, cy + 6 * k], [cx - 1.5 * k, cy + 6 * k]], P.n2);
      boneLight(g, cx - 3 * k, cy - 3.4 * k, cx + 3 * k, cy + 6 * k);
      for (const m of [-1, 1]) hornT(g, [[cx + m * 1.4 * k, cy + 5 * k], [cx + m * 3.2 * k, cy + 4.6 * k], [cx + m * 4.4 * k, cy + 2.8 * k], [cx + m * 4.8 * k, cy + 0.2 * k], [cx + m * 4.4 * k, cy - 1.6 * k]], 2.2 * k, 0.8, TUSK);
      sockets(g, [cx - 2 * k, cx + 2 * k - 1], cy - 0.8 * k, 1, glint);
      g.hl(Math.round(cx - 1), Math.round(cy + 5.4 * k), 2, P.n0);
    },
    // the stag's: a small skull under a wide rack of antlers, a point at every tine
    stag(g, cx, cy, k, glint) {
      for (const m of [-1, 1]) {
        const b = (t) => [cx + m * (1.8 + 4.4 * t) * k, cy - (2.4 + 7.2 * t) * k];
        hornT(g, [b(0), b(0.35), b(0.7), b(1)], 1.8 * k, 0.8, TUSK);
        for (const [t, dx, dy] of [[0.3, 2.4, -0.4], [0.62, 2.2, -1.4], [0.55, -1.6, -2]]) { const [x, y] = b(t); hornT(g, [[x, y], [x + m * dx * k, y + dy * k]], 1.3 * k, 0.8, TUSK); }
      }
      g.ell(cx, cy - 0.6 * k, 2.6 * k, 2.2 * k, P.n2);
      g.poly([[cx - 1.8 * k, cy + 0.4 * k], [cx + 1.8 * k, cy + 0.4 * k], [cx + 0.8 * k, cy + 4.8 * k], [cx - 0.8 * k, cy + 4.8 * k]], P.n2);
      boneLight(g, cx - 2.6 * k, cy - 2.8 * k, cx + 2.6 * k, cy + 4.8 * k);
      sockets(g, [cx - 1.7 * k, cx + 1.7 * k - 1], cy - 0.4 * k, 1, glint);
    },
  };
  // a man's skull, among the beasts': round, the sockets big, a nose and a row of teeth
  const human = (g, cx, cy) => {
    g.ell(cx, cy - 0.6, 3, 2.7, P.n2); g.rect(Math.round(cx - 2), Math.round(cy + 1), 4, 2, P.n2);
    boneLight(g, cx - 3, cy - 3.3, cx + 3, cy + 3);
    sockets(g, [cx - 2, cx + 0.5], cy - 0.6, 2, false);
    g.set(Math.round(cx - 0.5), Math.round(cy + 1.2), P.d);
    for (let x = Math.round(cx - 2); x < Math.round(cx + 2); x++) g.set(x, Math.round(cy + 2.4), x % 2 ? P.n4 : P.n0);
  };
  // a long bone, knobbed at both ends
  const longBone = (g, x0, y0, x1, y1) => {
    g.bar(x0, y0, x1, y1, 1.7, P.n2, P.n3, P.n1);
    for (const [x, y] of [[x0, y0], [x1, y1]]) { g.ell(x, y, 1.4, 1.4, P.n3); g.set(Math.round(x - 1), Math.round(y - 1), P.n4); }
  };
  // a sharpened bone driven through the pile, standing out past it: what makes the board read as spikes
  const stake = (g, x0, y0, x1, y1) => hornT(g, [[x0, y0], [x1, y1]], 2.6, 0.9, TUSK);
  // blood: the pixel behind each point wet, a smear here and there on the bone, and drops hanging off the low points
  const bloody = (g, cells, drips) => {
    for (const [x, y, c] of cells) if (g.get(x, y)) g.set(x, y, c ? P.x1 : P.x2);
    for (const [x, y, n] of drips) for (let i = 0; i < n; i++) g.set(x, y + i, i === n - 1 ? P.x1 : P.x2);
  };
  // Each piece of the pile drawn on its own scratch grid, outlined there and laid on, back to front: the
  // dark line round every skull, bone and stake is what keeps white on white from merging into one blot.
  const piece = (g, draw, flip) => {
    const t = new Grid(g.w, g.h); draw(t); t.outline(P.ol);
    for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) { const v = t.get(x, y); if (v) g.set(x, flip ? t.h - 1 - y : y, v); }
  };
  // what holds them: iron straps with rivets through them, and twine where a strap would not sit
  const strap = (g, x0, y0, x1, y1) => {
    g.bar(x0, y0, x1, y1, 2.2, P.i2, P.i3, P.i1);
    const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(L / 4));
    for (let i = 0; i <= n; i++) g.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), P.i4);
  };
  // a square of iron where two skulls meet, a rivet at each corner
  const plate = (g, x, y) => { g.rect(x, y, 3, 3, P.i2); g.hl(x, y, 3, P.i3); for (const [i, j] of [[0, 0], [2, 0], [0, 2], [2, 2]]) g.set(x + i, y + j, P.i4); };
  const SHIELD_LOOKS = ['MENAGERIE', 'STAG AND BULL', 'RIVETED'];
  function boneFace(look) {
    const S = look === 0 ? 33 : 29, c = S / 2, g = new Grid(S, S);
    if (look === 0) {
      // MENAGERIE: a ram and a goat behind, a boar under, the bull in front of all three, iron round them
      // (2 Oct 2026, "more spikes so it reads; a man's skull and bones in the bottom corners; a little blood"):
      // bone stakes out of it every way first, so they stand behind the skulls and past them
      // (2 Oct 2026, "a few more spikes so I see it"): twelve stakes in a ring, long and short in turn, with
      // floor showing between every two, so the edge reads as a starburst of points and not a lump
      const N = 12, tips = [];
      for (let i = 0; i < N; i++) tips.push([-Math.PI / 2 + i * Math.PI * 2 / N, i % 2 ? 13 : 15.5]);
      piece(g, (t) => { for (const [a, r] of tips) stake(t, c + Math.cos(a) * 8, c + Math.sin(a) * 8, c + Math.cos(a) * r, c + Math.sin(a) * r); });
      piece(g, (t) => { longBone(t, 20, 20, 28, 27); longBone(t, 28, 20, 20, 27); });
      piece(g, (t) => human(t, 8.5, 23));
      piece(g, (t) => SK.ram(t, 10, 12, 0.95, false));
      piece(g, (t) => SK.boar(t, 23, 11.5, 0.95, false));
      piece(g, (t) => SK.bull(t, c, 16, 1.2, true));
      plate(g, 10, 17); plate(g, 20, 17); plate(g, 15, 24);
      // blood a step down from every point, and hanging off the ones that point at the floor
      const at = (a, r) => [Math.round(c - 0.5 + Math.cos(a) * r), Math.round(c - 0.5 + Math.sin(a) * r)];
      bloody(g, tips.map(([a, r], i) => [...at(a, r - 1.6), i % 2]),
        tips.filter(([a]) => Math.sin(a) > 0.4).map(([a, r], i) => { const [x, y] = at(a, r); return [x, y + 1, 1 + (i % 2)]; }));
    } else if (look === 1) {
      // STAG AND BULL: a stag's rack spread behind a bull's skull, a goat's riveted on under them
      piece(g, (t) => SK.stag(t, c, 11, 1.25, false));
      piece(g, (t) => SK.goat(t, c, 5, 0.9, false), true);
      piece(g, (t) => SK.bull(t, c, 12, 1.1, true));
      plate(g, 8, 17); plate(g, 18, 17);
    } else {
      // RIVETED: a goat the right way up and a boar upside down under it, nose to nose, a band of iron
      // riveted across where they meet; the goat's horns up and out, the boar's tusks down like fangs
      piece(g, (t) => SK.goat(t, c, 9.5, 1.2, true));
      piece(g, (t) => SK.boar(t, c, 8.5, 1.3, true), true);
      strap(g, 6, 14.5, 23, 14.5);
      for (const m of [-1, 1]) hornT(g, [[c + m * 8, 14.5], [c + m * 11.5, 14], [c + m * 13.5, 12.5]], 1.8, 0.8);
    }
    return g;
  }
  function boneShield(look, view) {
    if (view === 's') {
      // edge on: the skull's brow and face bulging toward his front, the frame behind, horns pointing on
      const g = new Grid(9, 23);
      g.rect(0, 4, 2, 15, P.w1); g.vl(0, 4, 15, P.w2);
      g.ell(3, 11.5, 3, 7.5, P.n2); g.rect(0, 4, 1, 15, P.w1);
      g.tone((x, y) => y < 7, P.n3, [P.n2]); g.tone((x, y) => y > 14, P.n1, [P.n2]); g.vl(4, 6, 3, P.n4, true);
      g.set(4, 10, P.d); g.set(4, 11, P.h3);
      const fwd = (y, n, up) => { const pts = []; for (let t = 0; t < n; t++) pts.push([5 + t, y - (up && t > 1 ? t - 1 : 0)]); horn(g, pts); };
      if (look === 0) { horn(g, [[2, 4], [3, 3], [4, 2], [5, 1], [6, 0]]); horn(g, [[2, 19], [3, 20], [4, 21], [5, 22]]); for (const y of [6, 9, 12, 15, 18]) fwd(y, 4, false); }
      if (look === 1) { horn(g, [[2, 4], [3, 3], [4, 3], [5, 3], [6, 2], [7, 1]]); fwd(9, 3, false); fwd(16, 4, false); }
      if (look === 2) { horn(g, [[2, 4], [3, 3], [4, 2], [5, 1], [6, 0]]); horn(g, [[2, 18], [3, 19], [4, 20], [5, 21], [6, 22]]); g.rect(1, 10, 4, 3, P.i2); g.set(3, 11, P.i4); fwd(11, 4, false); }
      return g.outline();
    }
    const g = boneFace(look);
    if (view === 'b') {
      // from behind: everything but the horns is the frame they are lashed to, two crossed sticks and a strap
      const keep = new Set([P.k0, P.k1, P.k2, P.c2]);
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const v = g.get(x, y); if (v && !keep.has(v)) g.set(x, y, (x + y) % 5 ? P.lt : P.n1); }
      g.line(4, 6, 18, 18, P.w2, true); g.line(18, 6, 4, 18, P.w2, true);
      g.rect(8, 10, 7, 2, P.w1); g.hl(8, 10, 7, P.w3);
    }
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
    // armed, the slots light up from below: the one colour on the floor that means "not yet, now"
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

  // ---------------------------------------------------------------- the iron cage, over the coop's dark
  // The coop's frame in iron (`TUNING.keys`): round bars, top and bottom rails with rivets, and a
  // padlock with a skull on it, which is the one thing on it that says what opens it. 38 x 25.
  function ironFront() {
    // The frame is outlined; the bars go in after, so the outline never fills the gaps between them
    // (it did: a 2-texel gap beside a bar is all outline, and the cage read as a black box).
    const g = new Grid(38, 25);
    g.rect(1, 1, 36, 3, P.i2); g.hl(1, 1, 36, P.i4); g.hl(1, 3, 36, P.i1);
    g.rect(1, 20, 36, 3, P.i1); g.hl(1, 20, 36, P.i3); g.hl(1, 22, 36, P.i0);
    g.rect(0, 1, 2, 22, P.i1); g.vl(0, 1, 22, P.i3); g.rect(36, 1, 2, 22, P.i1); g.vl(37, 1, 22, P.i0);
    for (let x = 4; x < 36; x += 8) { g.set(x, 2, P.i4); g.set(x, 21, P.i3); }
    g.outline();
    for (let x = 5; x < 35; x += 5) { g.vl(x, 4, 16, P.i3); g.vl(x + 1, 4, 16, P.i0); g.set(x, 4, P.i4); }
    // the padlock: a shackle over a body, a bone skull on its face
    const L = new Grid(38, 25);
    L.ring(18.5, 9.5, 3, 3.2, 1, P.i3); L.rect(15, 10, 8, 8, P.b2); L.hl(15, 10, 8, P.b4); L.vl(15, 10, 8, P.b3); L.hl(15, 17, 8, P.b0); L.vl(22, 10, 8, P.b1);
    L.rect(17, 12, 4, 3, P.n3); L.hl(17, 12, 4, P.n4); L.rect(18, 15, 2, 1, P.n2);
    L.set(17, 13, P.k0); L.set(20, 13, P.k0); L.set(17, 14, P.h2);
    return g.blit(L.outline(), 0, 0);
  }

  // ---------------------------------------------------------------- the key, 27 x 14
  // Enter the Gungeon's key in the cult's taste: a gold shaft and bit, and the bow a bone skull with
  // red in one socket.
  function cultKey() {
    const g = new Grid(28, 15), o = 1;
    g.rect(10 + o, 5 + o, 14, 3, P.b2); g.hl(10 + o, 5 + o, 14, P.b4); g.hl(10 + o, 7 + o, 14, P.b1);
    g.rect(19 + o, 8 + o, 2, 3, P.b2); g.vl(19 + o, 8 + o, 3, P.b3);
    g.rect(22 + o, 8 + o, 2, 4, P.b2); g.vl(22 + o, 8 + o, 4, P.b3);
    g.ell(5 + o, 5 + o, 4.6, 4.4, P.n3); g.rect(2 + o, 7 + o, 6, 3, P.n3);
    g.tone((x, y) => y >= 8 + o || x >= 7 + o, P.n2, [P.n3]); g.hl(3 + o, 1 + o, 3, P.n4);
    g.rect(2 + o, 4 + o, 2, 2, P.k0); g.rect(6 + o, 4 + o, 2, 2, P.k0); g.set(3 + o, 5 + o, P.h3);
    g.set(5 + o, 7 + o, P.k1); g.set(3 + o, 9 + o, P.k1); g.set(5 + o, 9 + o, P.k1); g.set(7 + o, 9 + o, P.k1);
    g.rect(9 + o, 4 + o, 2, 5, P.b3); g.vl(9 + o, 4 + o, 5, P.b4);
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
    // Side on, tail tip left, snout right; the spit runs through his middle on row 7 (the game turns him
    // about that row). Scutes down the back, a pale belly, four legs hanging as he turns, an open jaw
    // with teeth, a ridge over the eye, and the char and the grease of a beast that has been on the fire.
    const W = 72, g = new Grid(W, 20), r = rng(95);
    const H = ['#20240f', '#343a1a', '#4c5628', '#6a7236', '#8a9046'];      // dark scute, back, flank, lit flank, lit edge
    const B = ['#8a6a34', '#b48c48', '#d8b466', '#f0d68a'];                  // roasting belly: char, gold, fat, glint
    // one profile the whole length: tail (0..22), body (22..50), neck and head (50..70)
    const mid = x => x < 22 ? 7 + (22 - x) * 0.13 : 7;
    const half = x => x < 22 ? 0.6 + 3.7 * Math.pow(x / 22, 1.15)
      : x < 50 ? 4.3 + Math.sin((x - 22) / 28 * Math.PI) * 0.9
      : x < 56 ? 4.2 - (x - 50) * 0.18 : 3.1 - (x - 56) * 0.06;
    for (let x = 1; x < 70; x++) {
      const c = mid(x), h = half(x), t = Math.round(c - h), b = Math.round(c + h);
      for (let y = t; y <= b; y++) {
        const f = (y - t) / Math.max(1, b - t);
        g.set(x, y, f < 0.18 ? H[1] : f < 0.5 ? H[2] : f < 0.76 ? H[3] : y === b ? B[0] : x > 22 && x < 56 ? B[1] : H[4]);
      }
    }
    for (let x = 4; x < 50; x += 3) { const t = Math.round(mid(x) - half(x)); g.set(x, t - 1, H[0]); g.set(x + 1, t, H[0]); }   // scutes
    for (let x = 24; x < 48; x += 4) for (let y = 4; y < 7; y++) if (g.get(x, y)) g.set(x, y, H[1]);                         // armour plates
    // the head: a flat upper jaw, a lower one hanging open, teeth between, the eye under its ridge
    g.rect(56, 4, 13, 3, H[2]); g.hl(56, 4, 13, H[1]); g.hl(58, 6, 10, H[3]);
    g.rect(58, 9, 10, 2, H[3]); g.hl(58, 10, 10, B[1]);
    g.hl(56, 7, 12, '#1a0a08'); g.hl(57, 8, 11, '#5a1a14');
    for (let x = 58; x < 68; x += 2) { g.set(x, 7, '#f2ecd4'); g.set(x + 1, 9, '#f2ecd4'); }
    g.set(68, 3, H[3]); g.set(67, 3, H[2]);                                                                                    // the nostril bump
    g.rect(52, 3, 4, 2, H[3]); g.set(54, 4, '#e8c24a'); g.set(54, 3, H[0]);                                                    // eye and brow
    // four legs, drawn as they hang while he turns, each ending in three claws
    for (const [lx, d] of [[27, 1], [32, 0], [43, 1], [48, 0]]) {
      const base = Math.round(mid(lx) + half(lx)) - 1, col = d ? H[1] : H[2];
      for (let y = base; y < base + 5; y++) { g.set(lx + (y > base + 2 ? 1 : 0), y, col); g.set(lx + 1 + (y > base + 2 ? 1 : 0), y, d ? H[2] : H[3]); }
      g.hl(lx - 1, base + 5, 4, H[0]); g.set(lx - 1, base + 6, H[0]); g.set(lx + 2, base + 6, H[0]);
    }
    g.speckle(rng(97), 60, B[1], [H[2], H[3]]);                                                                                // the fire browning the hide
    g.speckle(r, 90, '#15130a', [H[2], H[3], B[1], B[2]]);                                                                     // char
    g.speckle(rng(96), 26, B[3], [B[1], B[2]]);                                                                                // glinting fat
    for (let x = 0; x < W; x++) if (!g.get(x, 7)) g.set(x, 7, '#d9c078');                                                     // the spit, either side of him
    g.hl(58, 7, 3, '#d9c078', true);                                                                                           // ... and through the mouth
    return g.outline();
  }

  // ---------------------------------------------------------------- the cave's teeth
  // Three stone teeth standing out of old blood: the back two lower, the front one tall, every point
  // wet red (3 Oct 2026 playtest: white points read as crystal, not as a thing that hurts). The blood
  // round the foot and on the points is what says the rock kills. 22 x 24.
  function spire() {
    const pool = new Grid(22, 24), r = rng(101);
    pool.ell(11, 20.5, 10.5, 3.2, P.bl); pool.speckle(r, 26, P.r1, [P.bl]); pool.speckle(r, 8, P.r2, [P.bl]);
    pool.ell(4, 22.5, 2.4, 1.2, P.bl); pool.set(19, 22, P.r1);
    const tooth = (g, x0, x1, tx, ty, by) => {
      g.poly([[x0, by], [tx + 0.5, ty], [x1, by]], P.s2);
      g.tone((x, y) => x + 0.5 > tx + 0.5 + (y - ty) * 0.12, P.s1, [P.s2]);        // the far side in shade
      g.tone((x, y) => x < tx - 1 + (y - ty) * -0.25 + 1, P.s3, [P.s2]);            // the lit edge
      for (let y = ty; y < ty + 3; y++) g.set(tx, y, y === ty ? '#ff6a55' : y === ty + 1 ? P.r3 : P.r2);   // the point, bloodied
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
  // The barrel of poison (30 Sep 2026): the same barrel in the venom's greens, the skull kept, and the
  // head wet with poison where the red one carries its powder.
  const BV = ['#0f2610', '#1c4719', '#2e6b22', '#4a962e', '#74c046', '#bdf08a'], VLID = ['#9be65c', '#3f8a26'];
  const BH = { s: '#f4e6d4', sh: '#cdb7a0', e: '#26100e' }, SKULL7 = ['.#####.', '#######', '#ee#ee#', '#ee#ee#', '###e###', '.#####.', '.#.#.#.'];
  const within = (v, lo, hi) => Math.max(lo, Math.min(hi, v));   // node has no rng.js to lend clamp
  const barrelShade = (b) => (b > 0.995 ? 5 : b > 0.86 ? 4 : b > 0.42 ? 3 : b > 0.05 ? 2 : 1);
  const IRN = [P.i0, P.i1, P.i2, P.i3, P.i4];
  function barrelStand(BR, lid) {
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
    const [hi, lo] = lid || ['#5d5460', '#2a2328'];   // the heap on the head: black powder, or the poison welling up
    for (const [x, y, c] of [[10, 2, hi], [9, 3, hi], [10, 3, lo], [11, 3, lo], [8, 4, lo], [9, 4, lo], [10, 4, lo], [11, 4, lo], [12, 4, lo]]) g.set(x, y, c);
    SKULL7.forEach((row, j) => [...row].forEach((ch, i) => { const x = 6 + i, y = 9 + j;
      if (ch === '#') g.set(x, y, i >= 5 || j >= 5 ? BH.sh : BH.s); else if (ch === 'e') g.set(x, y, BH.e); }));
    return g.outline();
  }
  // On its side, the axis across the picture and the near head at the right. `phase` 0..7 is how far
  // round it has rolled (45° a step): the seams slide over it and the skull comes over the top and
  // goes under, cut off by the barrel's own outline.
  function barrelLie(phase, BR) {
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

  // ---------------------------------------------------------------- a suit of armour on the wall, 28 x 29
  // Enter the Gungeon's (30 Sep 2026), hung on the far wall's face (30 Sep 2026: "more attached to the
  // wall, less detailed, a decoration that falls apart in a fun way"): a halberd (two crossed until 5 Oct 2026) on the
  // stone, an iron plate between them, and on it the helm, the pauldrons and the breastplate, no
  // stand, no legs, nothing on the floor. Three steps of steel, lit from the left, a red plume the one
  // colour. `empty` is what a body leaves: the halberds and the bare plate. The pieces that fly off
  // (`armorPiece`) are the same drawings, so what lands is plainly what hung there.
  // The suit that stands on the floor (1 Oct 2026): the wall suit's iron on a wooden stand, upright, a
  // halberd at its side. `bare` is what is left when it has been brought down: the stand, its post and
  // crossbar, and the halberd still standing. 28 x 42, its feet on the stand's last row.
  function suit(bare, gone) {
    const g = new Grid(28, 42), cx = 12;
    g.rect(3, 38, 20, 3, P.w2); g.hl(3, 38, 20, P.w3); g.hl(3, 40, 20, P.w0); g.rect(3, 41, 3, 1, P.w0); g.rect(20, 41, 3, 1, P.w0);   // the stand
    if (!gone) {
    g.vl(24, 4, 34, P.w2); g.vl(25, 4, 34, P.w3);                                                     // the halberd's shaft
    g.vl(24, 0, 4, P.i4); g.poly([[25, 3], [28, 4], [28, 10], [25, 9]], P.i3); g.vl(27, 4, 6, P.i4); g.poly([[23, 4], [20, 5], [23, 8]], P.i2);   // its head
    }
    if (bare) {
      g.vl(cx, 12, 26, P.w1); g.vl(cx + 1, 12, 26, P.w2); g.hl(cx - 6, 15, 14, P.w2); g.hl(cx - 6, 16, 14, P.w0); g.set(cx - 7, 15, P.w1); g.set(cx + 8, 15, P.w1);   // post and crossbar
      return g.outline();
    }
    g.vl(cx, 30, 8, P.w1);
    for (const [x, c] of [[8, P.i2], [14, P.i3]]) { g.rect(x, 29, 4, 8, c); g.rect(x - 1, 36, 5, 2, P.i1); g.ell(x + 1.5, 30, 2.4, 1.8, P.i4); }   // greaves, boots, knee cops
    g.rect(7, 25, 11, 5, P.i3); g.tone((x) => x >= cx, P.i2, [P.i3]); g.hl(7, 27, 11, P.i2); g.hl(7, 29, 11, P.i1);                       // the tassets
    g.rect(4, 17, 3, 8, P.i2); g.rect(17, 17, 3, 8, P.i2); g.rect(4, 25, 3, 2, P.i1); g.rect(17, 25, 3, 2, P.i1);                          // the arms and gauntlets
    g.poly([[cx - 4, 14], [cx + 4, 14], [cx + 5, 20], [cx + 3, 25], [cx - 3, 25], [cx - 5, 20]], P.i3); g.tone((x) => x >= cx, P.i2, [P.i3]);
    g.vl(cx - 1, 15, 9, P.i4); g.hl(cx - 4, 24, 8, P.i1);                                             // the breastplate, its ridge, its belt
    g.ell(cx - 7, 15.5, 3.6, 2.8, P.i3); g.ell(cx + 7, 15.5, 3.6, 2.8, P.i2); g.hl(cx - 9, 14, 3, P.i4);   // the pauldrons
    g.hl(cx - 3, 13, 6, P.i1);                                                                         // the gorget
    g.ell(cx, 8.5, 3.8, 4.6, P.i3); g.tone((x) => x >= cx, P.i2, [P.i3]); g.hl(cx - 3, 9, 6, P.d0); g.set(cx - 2, 6, P.i4);   // the helm, its slit
    g.set(cx, 3, P.r3); g.set(cx, 2, P.r3); g.set(cx - 1, 3, P.r2); g.set(cx + 1, 3, P.r2); g.set(cx, 1, P.r2);                            // its plume
    return g.outline();
  }
  // `n` is how many halberds are still on it (`p.halberds`, one since 5 Oct 2026; a grab beside it takes one).
  function armor(empty, n = 2) {
    const g = new Grid(28, 29), cx = 14, top = 5;
    for (const m of [0, 1].slice(0, n)) {                                                                      // the halberds, crossed
      const s = m ? -1 : 1, x0 = m ? 25 : 2, x1 = m ? 2 : 25, hx = x1 + (m ? 0 : 1), hy = 5;
      g.line(x0, 28, x1, 5, P.w2); g.line(x0 + s, 28, x1 + s, 5, m ? P.w1 : P.w3);
      g.vl(hx, hy - 5, 4, P.i3);                                                                   // the spike
      g.rect(hx + s, hy - 3, 1, 5, P.i3); g.rect(hx + 2 * s, hy - 3, 1, 5, P.i3); g.rect(hx + 3 * s, hy - 2, 1, 3, P.i3);
      g.vl(hx + 3 * s, hy - 2, 3, m ? P.i2 : P.i4); g.set(hx - s, hy - 1, P.i2);                    // the blade's edge, the hook
    }
    g.rect(cx - 2, top + 5, 4, 5, P.i1); g.hl(cx - 2, top + 5, 4, P.i2); g.set(cx - 1, top + 7, P.i3); g.set(cx, top + 7, P.i3);   // the plate, its rivets
    if (empty) return g.outline();
    g.ell(cx - 6, top + 11.5, 3.6, 2.6, P.i3); g.ell(cx + 6, top + 11.5, 3.6, 2.6, P.i2); g.hl(cx - 8, top + 10, 3, P.i4);   // the pauldrons
    g.poly([[cx - 4.5, top + 10], [cx + 4.5, top + 10], [cx + 4.5, top + 16], [cx + 2.5, top + 19], [cx - 2.5, top + 19], [cx - 4.5, top + 16]], P.i3);
    g.tone((x) => x >= cx, P.i2, [P.i3]); g.vl(cx - 1, top + 11, 6, P.i4);                          // the breastplate, its ridge
    g.rect(cx - 3, top + 19, 6, 2, P.i2); g.hl(cx - 3, top + 20, 6, P.i1); g.hl(cx - 2, top + 9, 4, P.i1);   // the fauld, the gorget
    g.ell(cx, top + 4.5, 3.6, 4.4, P.i3); g.tone((x) => x >= cx, P.i2, [P.i3]);                      // the helm,
    g.hl(cx - 3, top + 5, 6, P.d0); g.set(cx - 2, top + 2, P.i4);                                  // its slit,
    g.set(cx, top - 1, P.r3); g.set(cx - 1, top - 1, P.r3); g.set(cx, top - 2, P.r2);              // its plume
    return g.outline();
  }
  // What flies off it (js/scatter.js `fromArmor`): the helm, the breastplate, a pauldron.
  function armorPiece(kind) {
    const g = new Grid(12, 13);
    if (kind === 'helm') { g.ell(5, 6, 3.6, 4.4, P.i3); g.tone((x) => x >= 5, P.i2, [P.i3]); g.hl(2, 6, 6, P.d0); g.set(3, 3, P.i4); g.set(5, 1, P.r3); g.set(4, 1, P.r3); g.set(5, 0, P.r2); }
    else if (kind === 'plate') {
      g.poly([[1, 1], [10, 1], [10, 7], [8, 10], [3, 10], [1, 7]], P.i3); g.tone((x) => x >= 5.5, P.i2, [P.i3]);
      g.hl(4, 1, 3, null); g.vl(4, 2, 6, P.i4); g.rect(3, 10, 6, 2, P.i2); g.hl(3, 11, 6, P.i1);
    } else { g.ell(4, 3, 3.6, 2.6, P.i3); g.tone((x, y) => y >= 3, P.i2, [P.i3]); g.hl(2, 1, 3, P.i4); }
    return g.outline();
  }

  // ---------------------------------------------------------------- a stag's head, 24 x 23
  // Mounted on a wooden shield on the far wall (30 Sep 2026: "stuffed trophies, deer heads to begin
  // with"). The antlers are the point, so they are the palest thing on it. `blood`: its tines have
  // had a man on them. `tips`: the tines alone, drawn over a man pinned there so they come through him.
  function trophy(blood, tips) {
    const g = new Grid(24, 23), FUR = ['#5c3a22', '#8a5a34', '#b07a48'], X = (x, m) => (m ? 23 - x : x);
    if (!tips) {
      g.rect(7, 12, 10, 7, P.w1); g.hl(8, 19, 8, P.w1); g.hl(9, 20, 6, P.w1); g.hl(10, 21, 4, P.w1);   // the shield, darker than him
      g.vl(7, 12, 7, P.w2); g.hl(7, 12, 10, P.w2); g.vl(16, 13, 6, P.w0); g.set(15, 19, P.w0); g.set(14, 20, P.w0); g.set(13, 21, P.w0);
      for (const m of [0, 1]) {                                                                    // the ears, out and up
        const f = m ? FUR[0] : FUR[1];
        g.hl(X(6, m) - (m ? 2 : 0), 8, 3, f); g.hl(X(5, m) - (m ? 1 : 0), 7, 2, f); g.set(X(8, m), 9, f); g.set(X(7, m), 8, FUR[0]);
      }
      g.rect(10, 7, 4, 7, FUR[1]); g.hl(9, 9, 6, FUR[1]); g.hl(9, 10, 6, FUR[1]);                 // the head,
      g.rect(10, 14, 4, 2, FUR[1]); g.hl(11, 16, 2, FUR[1]);                                       // the long muzzle
      g.vl(10, 7, 7, FUR[2]); g.set(9, 9, FUR[2]); g.tone((x, y) => x >= 13, FUR[0], [FUR[1]]);
      g.hl(10, 15, 4, '#c2a07e'); g.hl(11, 16, 2, '#2a1a14');                                      // the pale lip, the nose
      g.set(9, 10, P.ol); g.set(14, 10, P.ol);                                                     // the eyes
    }
    for (const m of [0, 1]) {                                                                      // the antlers
      const c = m ? P.c0 : P.c1;
      g.line(X(10, m), 7, X(7, m), 4, c); g.line(X(7, m), 4, X(3, m), 2, c); g.line(X(3, m), 2, X(1, m), 0, c);
      g.line(X(7, m), 4, X(7, m), 0, c); g.line(X(5, m), 3, X(4, m), 0, c);
      g.set(X(9, m), 6, P.c2); g.set(X(7, m), 1, P.c2);
      if (blood) for (const [x, y] of [[1, 0], [7, 0], [4, 0], [7, 1]]) g.set(X(x, m), y, y ? P.bl : '#9c2a22');
    }
    return g.outline();
  }

  // ---------------------------------------------------------------- the cult's posters, 46 x 34
  // Pinned to the far wall (6 Oct 2026: "art objects you find once and destroy, because they are bad"): the
  // first two destructibles. `breeds` is the chart of which goats eat best (six, goat breeds, the layout of a
  // sheep-breed chart); `cuts` is the butcher's diagram of a goat with its joints and the meat laid round it.
  // `torn`: what a headbutt leaves, two ragged corners still pinned. Paper and ink literals are this sprite's own.
  function poster(kind) {
    const PAPER = '#dccfa6', PAPER2 = '#b9a87d', STAIN = '#cbbb8e', INK = '#3a2a20', FADE = '#7a6a4c', RED = '#b3402e';
    // 8 Oct 2026 playtest ("make them more real, in pixel art, but readable"): a bigger sheet, 46 x 34, and goats
    // drawn as goats, horns, ear, beard, four legs and a tail, a letter grid each so they read at a glance.
    const W = 46, H = 36, g = new Grid(W, H);
    if (kind === 'torn') {
      g.poly([[1, 1], [11, 1], [10, 4], [12, 7], [7, 8], [6, 12], [1, 11]], PAPER); g.vl(1, 1, 11, PAPER2);
      g.poly([[33, 1], [44, 1], [44, 10], [41, 9], [39, 6], [36, 6], [34, 3]], PAPER); g.vl(44, 1, 10, PAPER2);
      g.set(3, 2, RED); g.set(42, 2, RED); g.set(5, 5, FADE); g.set(40, 4, INK);
      return g.outline();
    }
    // the sheet: aged paper, a darker fold down the middle, two red pins, a stain
    g.rect(1, 1, W - 2, H - 2, PAPER); g.vl(W - 2, 1, H - 2, PAPER2); g.hl(1, H - 2, W - 2, PAPER2);
    g.vl(Math.floor(W / 2), 2, H - 4, STAIN); g.ell(40, 31, 2, 1, STAIN);
    g.set(3, 2, RED); g.set(W - 4, 2, RED);
    // the title, a line of heavy black lettering between two rules
    g.hl(5, 3, W - 10, FADE); g.hl(5, 8, W - 10, FADE);
    for (let x = 7, i = 0; x < W - 8; x += 3, i++) { if (i === 5) { x -= 1; continue; } g.rect(x, 4, 2, 3, INK); if (i % 3 === 1) g.set(x + 1, 5, PAPER); }
    // A goat seen from the side, facing left, off a letter grid: h horn, H head, e eye, E ear, b beard, B body,
    // S a patch, L leg, k hoof, t tail.
    const GOAT = [
      '....hh.......',
      '..hh.........',
      '.HHHE........',
      'HeHHHBBBBBBt.',
      'HHHHBBBBBBBBt',
      '.b.BBBSSBBBB.',
      '.b.L.L...L.L.',
      '...L.L...L.L.',
      '...k.k...k.k.',
    ];
    const goat = (x, y, pal, rows = GOAT) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if (pal[ch]) g.set(x + i, y + j, pal[ch]); }));
    const HORN = '#8a7a5a';
    if (kind === 'breeds') {
      // Six breeds, as a sheep-breed chart lays them: a goat, its name under it in ink.
      const breeds = [
        { B: '#f4efe2', H: '#8a4a28', S: '#f4efe2', L: '#d8d0c0' },   // white with a brown head: the meat goat
        { B: '#f4efe2', H: '#f4efe2', S: '#e2dccc', L: '#d8d0c0' },   // all white
        { B: '#b08050', H: '#7a5232', S: '#d8b888', L: '#7a5232' },   // fawn, a pale saddle
        { B: '#5a3a24', H: '#2a2020', S: '#5a3a24', L: '#2a2020' },   // brown, black at the head and legs
        { B: '#a8402c', H: '#a8402c', S: '#7a2a1c', L: '#7a2a1c' },   // red
        { B: '#2a2428', H: '#2a2428', S: '#3e383c', L: '#2a2428' },   // black
      ];
      breeds.forEach((b, i) => {
        const x = 3 + (i % 3) * 14, y = 11 + Math.floor(i / 3) * 12;
        goat(x, y, { h: HORN, H: b.H, e: INK, E: b.H === '#f4efe2' ? '#d8d0c0' : b.L, b: b.H === '#2a2428' ? '#3e383c' : '#d8d0c0', B: b.B, S: b.S, L: b.L, k: INK, t: b.B });
        for (let k = 0; k < 11; k += 2) g.set(x + 1 + k, y + 10, i === 0 ? RED : k === 4 ? FADE : INK);   // its name, in ink
      });
      // the one they like best on the spit: its name in red and a red tick over it
      g.set(13, 12, RED); g.set(14, 13, RED); g.set(15, 12, RED); g.set(16, 11, RED); g.set(17, 10, RED);
      return g.outline();
    }
    // cuts: the butcher's chart, one big goat ruled into joints, each joint its own red, and a cleaver in the corner
    const BIG = [
      '.....hh...................',
      '....h.....................',
      '..hh......................',
      '.HHHHE....................',
      'HeHHHHE...................',
      'HHHHHHNNNSSSSSRRRRRLLLLLt.',
      'HHHHHNNNNSSSSSRRRRRLLLLLLt',
      '.bHHNNNNNSSSSSRRRRRLLLLLL.',
      '.b..NNNNNSSSSSRRRRRLLLLLL.',
      '.b...NNNNSSSSSRRRRRLLLLL..',
      '......NNNSSSSSRRRRRLLLL...',
      '......FF.FF.......GG.GG...',
      '......FF.FF.......GG.GG...',
      '......F...F.......G...G...',
      '......F...F.......G...G...',
      '......k...k.......k...k...',
    ];
    goat(10, 11, { h: HORN, H: '#c9c2b5', e: INK, E: '#a9a39a', b: '#a9a39a', N: '#d9766a', S: '#c25a4a', R: '#e09080', L: '#a8443a', t: '#a8443a', F: '#a9a39a', G: '#8a857d', k: INK }, BIG);
    // the joints ruled off in ink dashes, and a number dot on each
    for (const x of [19, 24, 29]) for (let y = 16; y <= 21; y += 2) g.set(x, y, INK);
    for (const [x, y] of [[16, 18], [21, 18], [26, 18], [31, 18]]) g.set(x, y, '#f0e6d0');
    // a cleaver, top right of the chart
    g.rect(37, 11, 5, 4, '#c9c2b5'); g.hl(37, 14, 5, RED); g.set(40, 12, INK); g.rect(36, 12, 1, 2, '#4a3420'); g.rect(33, 12, 3, 2, '#4a3420');
    return g.outline();
  }

  // The same paper folded small, as it is found on the floor (6 Oct 2026: "a little scrap of paper on the floor"),
  // 12 x 9: a square folded in two, its flap turned up, the ink showing through; and `shreds`, what a butt leaves.
  function scrap(torn) {
    const PAPER = '#dccfa6', PAPER2 = '#b9a87d', INK = '#3a2a20', FADE = '#7a6a4c', RED = '#b3402e';
    if (torn) {
      const g = new Grid(16, 11);
      g.poly([[1, 1], [5, 1], [3, 4]], PAPER); g.poly([[7, 3], [11, 2], [10, 5], [8, 6]], PAPER);
      g.poly([[11, 7], [14, 6], [14, 9], [12, 9]], PAPER2); g.poly([[2, 6], [6, 7], [4, 9]], PAPER);
      g.set(3, 2, INK); g.set(9, 4, INK); g.set(10, 3, RED); g.set(4, 7, FADE); g.set(13, 8, INK);
      return g.outline();
    }
    const g = new Grid(12, 9);
    g.poly([[1, 2], [9, 1], [10, 7], [2, 7]], PAPER);
    g.poly([[7, 1], [9, 1], [10, 4]], PAPER2);                     // the flap, turned up
    g.line(5, 1, 6, 7, PAPER2);                                    // the fold
    g.set(3, 4, INK); g.set(4, 4, INK); g.set(3, 5, FADE); g.set(8, 5, INK); g.set(7, 3, RED);
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
    // The cult eats meat (2 Oct 2026, "they are meat cultists"): a joint on a pewter platter, a rack of
    // ribs on its board, a ham hock, links on a plate, a boar's head with the apple in its mouth, a bowl of stew.
    roast: art(['....mMMm.....', '..mMHHMmm....', '.mMHMMmmmmww.', '.mMMmmmmmkkwW', '..kmmmmmkk...', '.pPPPPPPPPPp.', '..ppppppppp..'],
      { m: '#9a4a22', M: '#c46a30', H: '#eaa050', k: '#5e2812', w: '#efe6d0', W: '#c4b598', p: '#76757f', P: '#a4a3ab' }),
    ribs: art(['.w.w.w.w..', 'mMmMmMmMm.', 'mHmHmHmHmk', 'kmkmkmkmkk', 'bBBBBBBBBb', '.bbbbbbbb.'],
      { m: '#8a3a1c', M: '#b85a2c', H: '#e08a48', k: '#4e200e', w: '#efe6d0', b: P.w2, B: P.w3 }),
    haunch: art(['..kmmm...', '.mMHMmm..', 'kmMMMmmww', 'kmmmmmkWw', '.kkkkk...'],
      { m: '#a0502a', M: '#c87038', H: '#eeaa60', k: '#5a2410', w: '#efe6d0', W: '#c4b598' }),
    sausage: art(['.sSSSs.sSSSs.', 'sSHSSsgsSHSSs', 'kssssk.kssssk', 'eEEEEEEEEEEEe', '.eeeeeeeeeee.'],
      { s: '#9a3a24', S: '#c25a38', H: '#ec9a6a', k: '#6a2414', g: '#5a2a14', e: '#d6cfbc', E: '#f4efe2' }),
    boarhead: art(['..ee........', '.eEe........', '.hHHHHhh....', 'hHHhhhhhhn..', 'hhhxhhhhnNaa', 'hhhhhhhwnaRa', 'khhhhhkkk.a.', '.kkkkkk.....', 'pPPPPPPPPPPp', '.pppppppppp.'],
      { h: '#b0603a', H: '#d88a5a', e: '#7a3a22', E: '#b0603a', n: '#d27a5c', N: '#7a3a28', x: P.ol, w: '#efe6d0', k: '#6a3018', a: '#c63a2d', R: '#e4584a', p: '#76757f', P: '#a4a3ab' }),
    stew: art(['.cCCCCCCc.', 'cfmffyfmfc', 'cffmfffmfc', '.cCcccccc.', '..ccccch..', '...kkkk...'],
      { f: '#3e1408', m: '#d8884c', y: '#ecd09a', c: '#a0603a', C: '#cc8a52', h: '#6a3418', k: '#4a2414' }),
  };

  const sprites = {
    'door-wood': doorWood(), 'door-iron': doorIron(), 'door-vault': doorVault(), 'door-soul': doorSoul(),
    'broken-wood': debris('wood'), 'broken-iron': debris('iron'), 'broken-vault': debris('vault'), 'broken-soul': debris('soul'),
    sword: sword(), halberd: halberd(), shield: shield(), bomb: bomb(), 
    'mill-hub': millHub(), 'mill-arm': millArm(), 'cage-post': cagePost(), 'cage-broken': cageBroken(),
    altar: altar(), banner: banner(), gong: gong(),
    'soul-wisp': soulWisp(), 'healing-grass': grass(true), 'grass-small': grass(false), pail: pail(),
    'healing-grass@pass': grass(true, true), 'grass-small@pass': grass(false, true),
    'spikes-idle': grating('idle'), 'spikes-arming': grating('arming'), 'spikes-up': grating('up'),
    'sword-up': swordUp(), 'rack-back': rackBack(), 'rack-base': rackBase(),
    'coop-back': coopBack(), 'coop-front': coopFront(false), 'coop-cracked': coopFront(true), 'coop-iron': ironFront(), key: cultKey(),
    'stall-back': stallBack(), 'stall-front': stallFront(false), 'stall-cracked': stallFront(true),
    burrow: burrow(), stool: stool(), spire: spire(), 'roast-back': roastRing(false), 'roast-front': roastRing(true), 'roast-sticks': roastSticks(), 'roast-croc': croc(),
  };
  for (let l = 0; l < SHIELD_LOOKS.length; l++) for (const v of 'fsb') sprites['mshield' + l + '-' + v] = boneShield(l, v);
  for (let k = 0; k < 8; k++) sprites['lantern-' + k] = lantern(k);
  for (let k = 0; k < 8; k++) { sprites['sconce-s' + k] = sconce(k, true); sprites['sconce-f' + k] = sconce(k, false); }
  sprites.barrel = barrelStand(BR); sprites.vbarrel = barrelStand(BV, VLID);
  for (let k = 0; k < 8; k++) { const lie = barrelLie(k, BR); sprites['barrel-lie' + k] = lie; sprites['barrel-up' + k] = transpose(lie); }
  for (let k = 0; k < 8; k++) { const lie = barrelLie(k, BV); sprites['vbarrel-lie' + k] = lie; sprites['vbarrel-up' + k] = transpose(lie); }
  for (const k in FOOD) sprites['food-' + k] = FOOD[k];
  // The supper dulled (3 Oct 2026 playtest: bright on the tables, it read as something to pick up):
  // each colour greyed by `scatter.dim.grey` and darkened to `dim.k` (`food-<id>@dim`, js/scatter.js).
  const dimHex = (c) => {
    // a sheet rendered in node without tuning.js gets the colours as painted
    const D = (typeof TUNING !== 'undefined' && TUNING.scatter.dim) || { k: 1, grey: 0 }, m = typeof c === 'string' && /^#([0-9a-f]{6})$/i.exec(c); if (!m) return c;
    const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, l = 0.3 * r + 0.59 * g + 0.11 * b;
    const f = (v) => Math.round(Math.min(255, (v + (l - v) * D.grey) * D.k)).toString(16).padStart(2, '0');
    return '#' + f(r) + f(g) + f(b);
  };
  for (const k in FOOD) { const s = FOOD[k], d = new Grid(s.w, s.h); d.p = s.p.map(dimHex); sprites['food-' + k + '@dim'] = d; }
  sprites['chand0'] = chandelier(0); sprites['chand1'] = chandelier(1); sprites['chand-down'] = chandelierDown();
  sprites.cleat = cleat(false); sprites['cleat-cut'] = cleat(true);
  // One halberd hangs behind the wall's suit (`armor.halberds`, 5 Oct 2026): what is drawn is what a grab takes down.
  const ARMOR_N = typeof TUNING !== 'undefined' && TUNING.prop.armor.halberds !== undefined ? TUNING.prop.armor.halberds : 1;
  sprites.armor = armor(false, ARMOR_N); sprites['armor-stand'] = armor(true, ARMOR_N); sprites.suit = suit(false); sprites['suit-bare'] = suit(true);
  for (const n of [0, 1, 2]) { sprites['armor-' + n] = armor(false, n); sprites['armor-stand-' + n] = armor(true, n); }
  sprites['suit-0'] = suit(false, true); sprites['suit-bare-0'] = suit(true, true);
  for (const k of ['helm', 'plate', 'pauldron']) sprites['armor-' + k] = armorPiece(k);
  sprites.trophy = trophy(false, false); sprites['trophy-blood'] = trophy(true, false); sprites['trophy-tips'] = trophy(true, true);
  sprites['poster-breeds'] = poster('breeds'); sprites['poster-cuts'] = poster('cuts'); sprites['poster-torn'] = poster('torn');
  sprites['poster-scrap'] = scrap(false); sprites['poster-shreds'] = scrap(true);
  sprites['table-s'] = tableTop(); sprites['table-n'] = tableUnder(); sprites['table-e'] = tableSide(); sprites['table-w'] = mirror(sprites['table-e']);
  // A blade or a shield broken (3 Oct 2026 playtest: "not just vanish, fall apart"; js/scatter.js
  // `breakUp`): its own pixels where `keep(x, y)` holds, outlined again only along the cut, so the
  // pieces lie together into the thing they were. The cuts step every other row, a break, not a saw.
  const brokeUp = (g, keep) => {
    const o = new Grid(g.w, g.h);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const v = g.get(x, y); if (v && keep(x, y)) o.set(x, y, v); }
    const add = [];
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
      if (o.get(x, y)) continue;
      const lit = [o.get(x - 1, y), o.get(x + 1, y), o.get(x, y - 1), o.get(x, y + 1)].some((v) => v && v !== P.ol);
      if (lit && g.get(x, y)) add.push([x, y]);
    }
    for (const [x, y] of add) o.set(x, y, P.ol);
    return o;
  };
  const jag = (n) => (n >> 1) & 1;
  { const s = sword(); sprites['sword-bit0'] = brokeUp(s, (x, y) => x < 11 + jag(y)); sprites['sword-bit1'] = brokeUp(s, (x, y) => x >= 11 + jag(y)); }
  { const h = halberd(); sprites['halberd-bit0'] = brokeUp(h, (x, y) => x < 13 + jag(y)); sprites['halberd-bit1'] = brokeUp(h, (x, y) => x >= 13 + jag(y)); }
  { const s = shield(), cut = (x, y) => (x < 6 + jag(y) ? 0 : x < 12 + jag(y + 1) ? 1 : 2);
    for (let k = 0; k < 3; k++) sprites['shield-bit' + k] = brokeUp(s, (x, y) => cut(x, y) === k); }
  for (let l = 0; l < SHIELD_LOOKS.length; l++) {
    const b = sprites['mshield' + l + '-f'], cx = Math.floor(b.w / 2), cy = Math.floor(b.h / 2);
    for (let k = 0; k < 4; k++) sprites['mshield' + l + '-bit' + k] = brokeUp(b, (x, y) => (x < cx + jag(y) ? 0 : 1) + (y < cy + jag(x) ? 0 : 2) === k);
  }
  // A layered sprite keeps its whole frame so its layers line up; everything else is cut to its silhouette.
  for (const k in sprites) if (!/^(rack|coop|stall|roast)-/.test(k)) sprites[k] = sprites[k].trim();
  return { P, Grid, sprites, rng, SHIELD_LOOKS };
})();
if (typeof module !== 'undefined') module.exports = PROP_PIXELS;

// In the page: every sprite is baked once to a canvas at `UP` texels a side and handed to PaintedArt
// in place of the painted image it asked for, inside the exact rect the painted one filled, its
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
    const g = S[pick(name)], m = typeof xform === 'function' ? xform(ctx) : ctx.getTransform();
    if (m.b !== 0 || m.c !== 0 || m.a <= 0 || m.d <= 0) return put(ctx, name, x, y, k);
    const X0 = Math.round(m.a * x + m.e), Y0 = Math.round(m.d * y + m.f);
    const X1 = Math.round(m.a * (x + g.w * k) + m.e), Y1 = Math.round(m.d * (y + g.h * k) + m.f);
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(canvasOf(name), (X0 - m.e) / m.a, (Y0 - m.f) / m.d, (X1 - X0) / m.a, (Y1 - Y0) / m.d);
    ctx.imageSmoothingEnabled = smooth;
  };
  // A sprite with its top-left at (x, y), turned `q` quarter turns about its middle, whole turns only,
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
    sword: [8, 8, 112, 112], halberd: [8, 8, 112, 112], shield: [13, 8, 103, 108], 'healing-grass': [9, 8, 110, 108], 'soul-wisp': [26, 8, 77, 108],
  };
  // How each fills its box: 'bottom' stands on the box's floor, 'center' sits in it, 'fill' stretches
  // to it (the grating, squashed like the floor it is set in). `k` scales a sprite past the fit.
  const HOW = {
    'healing-grass': 'bottom', altar: 'bottom', gong: 'bottom', 'cage-post': 'bottom', banner: 'fill', 'mill-arm': 'fill',
    'spikes-idle': 'fill', 'spikes-arming': 'fill', 'spikes-up': 'fill', sword: { how: 'center', k: 1.35 }, halberd: { how: 'center', k: 1.35 }, shield: { how: 'center', k: 1.15 },
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
  // How near the goat is to springing a ring, 0..1: inside `look.warnR` of its cleat, eased in over
  // the last third of it. Read by the cleat, the rope and the landing ring.
  const chandWarn = (renderer, ring) => {
    const g = renderer.game && renderer.game.goat, c = ring && ring.cleat, L = TUNING.chandelier.look;
    if (!g || !c || c.cut || renderer.silPass || ring.drop === 'down') return 0;
    return clamp((L.warnR - Math.hypot(g.x - c.x, g.y - c.y)) / (L.warnR / 3), 0, 1);
  };
  A.cleat = function (renderer, p) {
    const name = p.cut ? 'cleat-cut' : 'cleat', g = S[name], k = TUNING.chandelier.texel, x0 = Math.round(p.x - g.w * k / 2), y0 = Math.round(cleatTop(p));
    put(renderer.ctx, name, x0, y0);
    // Within reach it is the button: a frame of amber cells round it, beating.
    const w = chandWarn(renderer, p.hangs);
    if (w > 0) {
      const ctx = renderer.ctx; ctx.save();
      ctx.globalAlpha *= w * (0.45 + 0.35 * Math.sin(renderer.t * 7)); ctx.fillStyle = PALETTE.fireHi;
      const W = g.w * k, H = g.h * k;
      ctx.fillRect(x0 - k, y0 - k, W + 2 * k, k); ctx.fillRect(x0 - k, y0 + H, W + 2 * k, k);
      ctx.fillRect(x0 - k, y0, k, H); ctx.fillRect(x0 + W, y0, k, H);
      ctx.restore();
    }
    return true;
  };
  // A suit of armour hung on the far wall, fixed to its face the way the stag's head is, its foot
  // `armor.foot` px over the face's own foot, so it is the stone it is on, not the floor, rattling
  // while a headbutt still rings in it; once a body has brought it down, the halberds and the bare
  // plate (`spilled`). No shadow on the floor: nothing of it stands there. In the prop's own upright frame.
  A.armor = function (renderer, p) {
    const D = TUNING.prop.armor, k = D.texel, name = (p.spilled ? 'armor-stand' : 'armor') + '-' + Math.max(0, Math.min(2, p.halberds | 0)), g = S[name];
    const wob = p.wobble > 0 ? Math.round(Math.sin(renderer.t * 60) * p.wobble * 3) : 0;
    putSnap(renderer.ctx, name, p.x + wob - g.w * k / 2, p.y - TILE * 0.25 * TILT - D.foot - g.h * k, k);
    return true;
  };
  // The suit on its stand, upright on the floor with a shadow under it; the bare stand once it is down.
  A.suit = function (renderer, p) {
    const D = TUNING.prop.suit, k = D.texel, name = (p.spilled ? 'suit-bare' : 'suit') + (p.halberds < 1 ? '-0' : ''), g = S[name];
    if (!renderer.silPass) renderer.shadow(p.x, p.y + 6, 15, 5);
    const wob = p.wobble > 0 ? Math.round(Math.sin(renderer.t * 60) * p.wobble * 3) : 0;
    putSnap(renderer.ctx, name, p.x + wob - g.w * k / 2, p.y + 9 - g.h * k, k);
    return true;
  };
  // The stag's head on the far wall, fixed to its face the way the cleat is. A man dead on it hangs
  // under its tines (`bodyImg`, baked by `Enemy.die`, his feet `bodyFoot` - `lift` world px from the
  // prop), the tines are drawn again over him so they come through him, and his blood runs off his
  // feet down to the floor, a cell at a time (`drip` px a second). `pass` 'tips' is the tines alone,
  // for a live man pinned there (`Renderer.drawEnemy`).
  A.trophy = function (renderer, p, pass) {
    const ctx = renderer.ctx, Tr = TUNING.prop.trophy, k = Tr.texel, name = p.spent ? 'trophy-blood' : 'trophy', g = S[name];
    const x0 = p.x - g.w * k / 2, y0 = p.y - TILE * 0.25 * TILT - 2 - g.h * k;
    if (pass === 'tips') { putSnap(ctx, 'trophy-tips', x0, y0, k); return true; }
    putSnap(ctx, name, x0, y0, k);
    if (!p.body || !p.bodyImg) return true;
    const foot = Math.round(p.y + (p.bodyFoot - Tr.lift) * TILT), floor = p.y + 3;
    const run = Math.min(floor - foot + 12, p.bleedT * Tr.drip), c = 1.5;
    if (!renderer.silPass) for (const [dx, lag] of [[-3, 0], [2, 0.8], [5, 2.1]]) {
      const n = Math.floor(Math.max(0, run - lag * Tr.drip) / c);
      for (let i = 0; i < n; i++) { ctx.fillStyle = i % 4 === 3 ? PALETTE.bloodDark : PALETTE.blood; ctx.fillRect(Math.round(p.x + dx), foot - 12 + i * c, c, c); }
    }
    ctx.drawImage(p.bodyImg, Math.round(p.x - 48), foot - 64);
    putSnap(ctx, 'trophy-tips', x0, y0, k);
    return true;
  };

  // The cult's paper lying flat on the floor (`TUNING.prop.poster`), on its own middle: folded small (`scrap`)
  // until it is found, then its drawing (`look`: 'breeds' | 'cuts') opening out from the fold (`p.unfold`,
  // grown in its height), and torn, its shreds. Flat, so squashed by TILT like the floor under it.
  A.poster = function (renderer, p) {
    const D = TUNING.prop.poster, ctx = renderer.ctx;
    const open = p.torn ? 1 : p.unfold > 0 ? p.unfold : 0;
    const name = p.torn ? 'poster-shreds' : open > 0 ? 'poster-' + p.look : 'poster-scrap', g = S[name];
    const k = open > 0 && !p.torn ? D.texel * D.flat : D.texel, sy = p.torn || !open ? 1 : 0.2 + 0.8 * open;
    const wob = p.wobble > 0 ? Math.round(Math.sin(renderer.t * 60) * p.wobble * 3) : 0;
    ctx.save(); ctx.translate(p.x + wob, p.y); ctx.scale(1, TILT * sy);
    putSnap(ctx, name, -g.w * k / 2, -g.h * k / 2, k);
    ctx.restore();
    return true;
  };

  // The chandelier, in two passes (`Renderer.drawProp` for the floor, `drawChandelierAir` over
  // everyone): on the floor its shadow, which says where it will land and darkens as it comes, or
  // the wreck once it has; in the air the ring `p.z` px up, swaying a little, and its rope to the
  // cleat, or, cut, a frayed end trailing after it. Both in the prop's own upright frame.
  A.chandelier = function (renderer, p, pass) {
    const ctx = renderer.ctx, C = TUNING.chandelier, L = C.look;
    if (p.drop === 'down') {
      if (pass !== 'air') { const g = S['chand-down'], k = C.texel; renderer.shadow(p.x, p.y + 3, g.w * k * 0.46, 6); put(ctx, 'chand-down', p.x - g.w * k / 2, p.y + 8 - g.h * k, k); }
      return true;
    }
    const warn = chandWarn(renderer, p);
    if (pass !== 'air') {
      // On the floor: a small shadow while it hangs, the whole of where it lands only when it matters,
      // an amber ring of cells (the tells' own) as the goat comes to the cleat, filling while it falls.
      const k = 1 - clamp(p.z / C.z, 0, 1), falling = p.drop !== 'hang';
      ctx.save(); ctx.globalAlpha *= falling ? 0.45 + 0.45 * k : 0.35; renderer.shadow(p.x, p.y + 2, C.killR * (falling ? 0.9 : 0.55), C.killR * (falling ? 0.38 : 0.24)); ctx.restore();
      if (!renderer.silPass && (falling || warn > 0)) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, TILT); ctx.translate(-p.x, -p.y);   // back onto the floor's own squash
        if (falling) renderer.drawLandCells(p.x, p.y, C.killR, Math.max(k, 0.3));
        else { ctx.globalAlpha *= warn; renderer.drawLandCells(p.x, p.y, C.killR, 0); }
        ctx.restore();
      }
      return true;
    }
    const sway = p.drop === 'hang' ? Math.sin(renderer.t * 1.3 + p.phase) * C.sway * 40 : 0;
    const name = 'chand' + (Math.floor(renderer.t * 7 + p.phase * 3) % 2), g = S[name], k = L.ring, w = g.w * k, h = g.h * k;
    const x0 = Math.round(p.x + sway - w / 2), y0 = Math.round(p.y - p.z * TILT - h), hx = x0 + w / 2, hy = y0 + k;
    // It hangs over everybody, so where it covers the goat or a man it thins (`look.fade`), eased.
    // A world point's feet are at p.y + (y - p.y) * TILT in this upright frame, the body ~44 px over them.
    const game = renderer.game, covers = (u) => u && Math.abs(u.x - hx) < w / 2 + 8 && (() => { const fy = p.y + (u.y - p.y) * TILT; return fy > y0 && fy - 44 < y0 + h; })();
    let under = !renderer.silPass && game && (covers(game.goat) || (game.enemies || []).some((e) => !e.dead && Math.abs(e.x - hx) < w && covers(e)));
    p.airFade = lerp(p.airFade === undefined ? 1 : p.airFade, under ? L.fade : 1, 0.2);
    // the rope, a cell at a time: thin and faint up to the cleat while it holds, full as the goat
    // comes to the cleat; a frayed tail once it is cut
    const c = p.cleat, cell = Math.max(1, TX * L.rope), PP = PROP_PIXELS.P;
    let ex = hx, ey = hy - 14;
    if (c && !c.cut) { ex = c.x; ey = p.y + (c.y + (cleatTop(c) + C.texel - c.y) / TILT - p.y) * TILT; }
    const n = Math.max(2, Math.ceil(Math.hypot(ex - hx, ey - hy) / cell));
    ctx.save(); ctx.globalAlpha *= (c && !c.cut ? L.ropeA + (1 - L.ropeA) * warn : 1) * Math.max(p.airFade, 0.6);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = Math.round(hx + (ex - hx) * t), y = Math.round(hy + (ey - hy) * t + (c && !c.cut ? Math.sin(t * Math.PI) * 4 : 0));
      ctx.fillStyle = warn > 0.5 && i % 3 === 0 ? PALETTE.fireHi : i % 3 ? PP.b2 : PP.b1; ctx.fillRect(x - cell / 2, y - cell / 2, cell, cell);
    }
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= p.airFade; put(ctx, name, x0, y0, k); ctx.restore();
    return true;
  };

  // The stand of arms' breathing glow and the milk sprout's, for `glowDisc` (js/render.js).
  const STAND_GLOW = [[0, 'rgba(239,230,208,1)'], [1, 'rgba(239,230,208,0)']];
  const SPROUT_GLOW = [[0, 'rgba(168,189,108,0.22)'], [1, 'rgba(168,189,108,0)']];
  A.drawProp = function (renderer, p) {
    if (!PROP_PIXELS.on) return drawProp.call(this, renderer, p);
    const ctx = renderer.ctx;
    // The stand of arms, with what it holds standing IN it: the uprights and base behind, the arm,
    // then the front of the base over its foot.
    if (p.kind === 'weapon' && p.inStand) {
      // Its glow is not the stand: in THE DARK's silhouette pass it came out as a black cloud.
      if (!renderer.silPass) {
        glowDisc(ctx, p.x, p.y - 12, 40, STAND_GLOW, 0.14 + 0.05 * Math.sin(renderer.t * 2.6 + p.phase));
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
        glowDisc(ctx, p.x, p.y + bob, 34, SPROUT_GLOW);
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
    // A boss's bell on the floor (`Game.dropBell`): heaven's own bell sprite, standing on its lip, swaying a little, with a
    // ring of gold cells breathing round it so it reads as a thing to take, not a gong to ring.
    if (p.kind === 'lostbell' && typeof HEAVEN_PIXELS !== 'undefined') {
      const name = 'bell-' + (p.note | 0), g = HEAVEN_PIXELS.sprites[name]; if (!g) return false;
      const k = 1.6, sway = Math.sin(renderer.t * 2.2 + p.phase) * 0.12, glow = 0.5 + 0.5 * Math.sin(renderer.t * 3 + p.phase);
      ctx.save(); ctx.translate(p.x, p.y);
      renderer.shadow(0, 6, g.w * k * 0.4, 4);
      if (!p.fly) { ctx.globalAlpha = 0.35 + 0.35 * glow; CombatFX.pixelRing(ctx, 0, 2, 14 + glow * 3, 2, '#f7d774'); ctx.globalAlpha = 1; }
      ctx.translate(0, -Math.round((p.z || 0) * TILT));   // in the air on its way out of his hands (`p.fly`)
      ctx.scale(1, 1 / TILT); ctx.rotate(p.fly ? p.fly.t * Math.PI * 2 : sway);
      HEAVEN_PIXELS.draw(ctx, name, -g.w * k / 2, -g.h * k, k);
      ctx.restore(); return true;
    }
    // A key on the floor, bobbing and glinting (`TUNING.keys`).
    if (p.kind === 'key') {
      const g = S.key, k = 1.1, bob = Math.sin(renderer.t * 3 + p.phase) * 2;
      ctx.save(); ctx.translate(p.x, p.y);
      renderer.shadow(0, 6, g.w * k * 0.38, 4);
      put(ctx, 'key', -g.w * k / 2, -g.h * k - 2 + bob, k);
      if (Math.sin(renderer.t * 2.2 + p.phase) > 0.94) { ctx.fillStyle = '#fff6c8'; ctx.fillRect(4, -g.h * k + 1 + bob, 2, 2); }
      ctx.restore(); return true;
    }
    // The cage of iron with big milk grass in it: the coop's dark, the grass, the bars.
    if (p.kind === 'ironcage') {
      const g = S['coop-back'], k = p.r * 2 / (g.w - 2), w = g.w * k, h = g.h * k;
      const shake = p.wobble > 0 ? Math.sin(renderer.t * 55) * p.wobble * 3 : 0;
      ctx.save(); ctx.translate(p.x + shake, p.y);
      renderer.shadow(0, h * 0.42, p.r * 0.95, p.r * 0.45);
      put(ctx, 'coop-back', -w / 2, -h / 2, k);
      const gr = S['healing-grass'], gk = Math.min(1, (w - 6 * k) / gr.w);
      put(ctx, 'healing-grass', -gr.w * gk / 2, h / 2 - 3 * k - gr.h * gk, gk);
      put(ctx, 'coop-iron', -w / 2, -h / 2, k);
      ctx.restore(); return true;
    }
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
        else if (p.holds === 'pig') { ctx.translate(0, 7); ctx.scale(0.85, 0.85); renderer.pigSprite(ctx, Math.cos(renderer.t * 1.3 + p.phase) > 0 ? 0 : Math.PI, true, 'idle', p.phase); }
      }
      ctx.restore();
      put(ctx, p.ironCage ? 'coop-iron' : (p.hits || 0) > 0 ? 'coop-cracked' : 'coop-front', -w / 2, -h / 2, k);
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
        const f = ((Math.floor((p.rollD || 0) / step) % 8) + 8) % 8, name = (p.toxic ? 'v' : '') + (up ? 'barrel-up' : 'barrel-lie') + f, g = S[name];
        renderer.shadow(0, p.r * 0.55, g.w * k * 0.46, 5);
        top = p.r * 0.15 - g.h * k / 2;
        put(ctx, name, -g.w * k / 2, top, k);
      } else {
        const g = S.barrel, shiver = lit ? Math.sin(renderer.t * 60) * (1 - p.oilT / B.fuse) * 1.2 : p.wobble > 0 ? Math.sin(renderer.t * 50) * p.wobble * 4 : 0;
        renderer.shadow(0, p.r * 0.6, B.draw * 0.44, 6);
        top = p.r * 0.8 - g.h * k;
        put(ctx, p.toxic ? 'vbarrel' : 'barrel', shiver - g.w * k / 2, top, k);
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
    // The goat within `warnR`: a ring of amber cells round its foot, the colour every blow to come
    // wears, beating faster the nearer he is. Live only, never into the rooms' bake.
    const C = TUNING.cave.spikes, gt = this.game && this.game.goat;
    if (gt && !this.baking && !this.silPass) {
      const d = hyp(gt.x - p.x, gt.y - p.y) / TILE;
      if (d < C.warnR) {
        const near = 1 - d / C.warnR, a = (0.35 + 0.45 * near) * (0.6 + 0.4 * Math.sin(this.t * (5 + 7 * near)));
        const ctx = this.ctx; ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1); ctx.fillStyle = PALETTE.fireHi;
        ctx.beginPath(); this.floorRing(p.x, p.y + 2, p.r + 2 * C.cell, p.r + C.cell, C.cell); ctx.fill(); ctx.restore();
      }
    }
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
    if (up && k === 2 && !cold && !this.baking) this.stairGlow(px, py);
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
  // sticks, and the crocodile on the spit, which turns, seen side on, the turn squashes him.
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
    // The turn (5 Oct 2026, "a little better at the moment he goes over"): squashed to a sliver and
    // snapped over, he read as a flat thing flipping. A body on a spit keeps most of its depth the whole
    // way round, so he only thins to `roastThin` at the side-on moment, and that moment is brief (the
    // cosine is bent toward its ends), and while his belly hangs over the coals the fat drips into them.
    const c = Math.cos(t * B.roastTurn + p.phase), turn = Math.sign(c) * Math.pow(Math.abs(c), 0.45);
    const thin = B.roastThin + (1 - B.roastThin) * Math.abs(turn);
    ctx.save(); ctx.translate(0, -29); ctx.scale(1, turn >= 0 ? thin : -thin);
    put(ctx, 'roast-croc', -S['roast-croc'].w * TX / 2, -7.5 * TX);
    ctx.restore();
    if (turn > 0.6 && !this.silPass && !this.baking) {
      for (let q = 0; q < 3; q++) {
        const ph = (t * 1.3 + q * 0.37 + p.phase * 2) % 1;
        ctx.globalAlpha = 0.85 * (1 - ph); ctx.fillStyle = q === 1 ? '#f0d68a' : '#d8b466';
        ctx.fillRect(Math.round((q - 1) * 9 + Math.sin(q * 5.3) * 4), Math.round(-24 + ph * 22), 1, 2);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };
})();
