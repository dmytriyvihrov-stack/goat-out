// The sprites above the clouds (js/heaven.js), hand-placed on `PROP_PIXELS.Grid` in the recipe of the
// props: a few drawing calls a sprite, lit from the upper left, outlined. Heaven's outline is a soft
// plum and its whites are warm, so everything up here reads as lit from inside rather than as the
// compound's timber and stone (29 Sep 2026: "a goat god, like a goat but all light, the way God is
// usually shown"). Render only; node-requirable for a sheet.
const HEAVEN_PIXELS = (() => {
  const { Grid } = typeof PROP_PIXELS !== 'undefined' ? PROP_PIXELS : require('./prop-pixels.js');
  const W0 = '#ffffff', W1 = '#f6f1e6', W2 = '#e6dccb', W3 = '#cbbca5', W4 = '#a8977f';
  const G0 = '#fff4c2', G1 = '#f7d774', G2 = '#e0ac3e', G3 = '#b07a22', G4 = '#7c5214';
  const OL = '#5a4a66';
  // Catmull-Rom through the points, `n` samples a segment: the sweep of a horn.
  const spline = (pts, n = 8) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((j) => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]); return out;
  };

  // ---------------------------------------------------------------- the goat above, 76 x 80
  // Seated in his cloud, facing you: a ram's gold horns round into a curl by each ear, gold eyes with a
  // goat's bar pupil, a long white beard in strands over a warm white mantle hemmed in gold, and a gold
  // collar with a bell under the beard — the compound puts a collar on a goat to lead him to the knife;
  // up here the collar is the crown. `speak` opens his mouth, `blink` shuts his eyes.
  function god(speak, blink) {
    const W = 76, H = 80, g = new Grid(W, H), cx = 38;
    const M1 = '#f3e6c8', M2 = '#e2cfa6', M3 = '#c4ab80';
    g.poly([[cx - 12, 46], [cx + 12, 46], [cx + 26, 58], [cx + 30, 80], [cx - 30, 80], [cx - 26, 58]], M1);
    g.tone((x, y) => (x - cx) > 10 + (y - 50) * 0.2, M2, [M1]);
    g.tone((x, y) => (x - cx) > 20 + (y - 50) * 0.25, M3, [M2]);
    for (let y = 50; y < 80; y++) for (const s of [-1, 1]) { const x = Math.round(cx + s * (12 + (y - 46) * 0.62)); g.set(x, y, G2); g.set(x - s, y, G1); }
    for (const [x0, y0, x1, y1] of [[cx - 20, 60, cx - 23, 79], [cx + 19, 60, cx + 22, 79], [cx - 15, 64, cx - 16, 79], [cx + 15, 64, cx + 16, 79]]) g.line(x0, y0, x1, y1, M3, true);
    g.poly([[cx - 11, 46], [cx + 11, 46], [cx + 13, 66], [cx - 13, 66]], W1);
    for (const s of [-1, 1]) {
      g.rect(cx + s * 8 - 3, 64, 7, 12, s < 0 ? W1 : W2); g.hl(cx + s * 8 - 3, 64, 7, W0);
      g.rect(cx + s * 8 - 3, 74, 7, 4, G2); g.hl(cx + s * 8 - 3, 74, 7, G1); g.vl(cx + s * 8, 75, 3, G3);
    }
    g.poly([[cx - 8, 40], [cx + 8, 40], [cx + 11, 50], [cx + 10, 62], [cx + 6, 72], [cx + 1, 78], [cx - 1, 78], [cx - 6, 72], [cx - 10, 62], [cx - 11, 50]], W0);
    for (let k = -4; k <= 4; k++) if (k) g.line(cx + k * 2.2, 47, cx + k * 1.1, 76 - Math.abs(k) * 2.6, k % 2 ? '#dfe6f2' : '#eef2f8', true);
    g.tone((x, y) => x > cx + 5 && y > 44, '#d3dbea', [W0, '#eef2f8', '#dfe6f2']);
    g.hl(cx - 12, 45, 24, G1); g.hl(cx - 12, 46, 24, G2); g.hl(cx - 12, 47, 24, G3);
    g.ell(cx, 51, 3.8, 3.6, G1); g.set(cx - 1, 49, G0); g.set(cx - 2, 50, G0); g.hl(cx - 3, 53, 7, G3); g.set(cx, 54, G4);
    g.poly([[cx - 9, 17], [cx + 9, 17], [cx + 11, 22], [cx + 10, 30], [cx + 6, 40], [cx + 4, 44], [cx - 4, 44], [cx - 6, 40], [cx - 10, 30], [cx - 11, 22]], W1);
    g.tone((x, y) => x > cx + 5 && y > 20, W2, [W1]);
    g.tone((x, y) => x > cx + 7 && y > 28, W3, [W2]);
    g.tone((x, y) => x < cx - 6 && y < 28, W0, [W1]);
    g.hl(cx - 7, 17, 14, W0);
    for (const s of [-1, 1]) {
      g.poly([[cx + s * 10, 22], [cx + s * 20, 25], [cx + s * 24, 31], [cx + s * 21, 33], [cx + s * 11, 28]], s < 0 ? W1 : W2);
      g.line(cx + s * 13, 26, cx + s * 21, 30, '#efc2b8', true);
    }
    for (const s of [-1, 1]) {
      const path = spline([[5, 19], [8, 11], [14, 6], [21, 8], [25, 15], [23, 22], [18, 22], [17, 17]].map(([x, y]) => [cx + s * x, y]), 10);
      path.forEach(([x, y], i) => { const r = 3.4 - i / (path.length - 1) * 2.3; g.ell(x, y, r, r, Math.floor(i / 4) % 2 ? G1 : G2); });
      path.forEach(([x, y], i) => { const t = i / (path.length - 1); if (t < 0.55) g.set(x - s * 0.5, y - 2.2 + t * 1.2, G0); });
    }
    g.tone((x, y) => y > 20 && (x < cx - 12 || x > cx + 12), G3, [G2]);
    const EYE = ['.ooo.', 'oGGGo', 'o###o', 'oGGWo', '.ooo.'];
    for (const s of [-1, 1]) {
      const ex = s < 0 ? cx - 9 : cx + 4, ey = 24;
      if (blink) { g.hl(ex, ey + 2, 5, '#8a7a90'); g.hl(ex + 1, ey + 3, 3, W3); continue; }
      EYE.forEach((row, j) => [...row].forEach((ch, i) => {
        const c = { o: '#6a5a78', G: G1, '#': '#24160c', W: W0 }[ch];
        if (c) g.set(ex + (s < 0 ? i : 4 - i), ey + j, ch === '#' && (i === 0 || i === 4) ? '#6a5a78' : c);
      }));
      g.set(ex + 2, ey + 1, G0);
    }
    g.rect(cx - 3, 39, 6, 3, '#e8b8ac'); g.hl(cx - 3, 39, 6, '#f6d6cc'); g.set(cx - 2, 40, '#9a6a60'); g.set(cx + 1, 40, '#9a6a60');
    if (speak) { g.rect(cx - 2, 42, 4, 2, '#6a3a3a'); g.hl(cx - 1, 43, 2, '#b86a6a'); } else g.hl(cx - 2, 43, 4, W4);
    return g.outline(OL);
  }

  // ---------------------------------------------------------------- the blind shepherd, 34 x 44
  // An old man on a stool of cloud: a cloth over his eyes, a white beard, a robe of undyed wool, a crook
  // on his left and a wooden comb in his right. `arm` 0 at rest on his knee, 1 raised, 2 drawn down.
  function shepherd(arm) {
    const R0 = '#dde4ee', R1 = '#c3cddd', R2 = '#9eabc2', R3 = '#7a879f', S0 = '#e9b894', S1 = '#cf9674', S2 = '#a8704f';
    const B1 = '#e8e8ee', B2 = '#c8c8d2', C0 = '#f4ecd8', C1 = '#d8ccae', WD = ['#6b4a2c', '#9a7040', '#c49a5c'];
    const W = 34, H = 44, g = new Grid(W, H), cx = 16;
    const comb = (x, y, up) => {
      g.hl(x, y, 6, WD[2]); g.hl(x, y + 1, 6, WD[1]);
      for (let k = 0; k < 6; k += 2) g.set(x + k, y + 2, WD[0]);
      if (up) for (let k = 0; k < 6; k += 2) g.set(x + k, y + 3, WD[0]);
    };
    g.line(cx + 12, 8, cx + 14, 42, WD[1]); g.line(cx + 13, 8, cx + 15, 42, WD[0]);
    for (const [x, y] of [[cx + 12, 7], [cx + 11, 5], [cx + 11, 4], [cx + 12, 3], [cx + 13, 3], [cx + 14, 4], [cx + 14, 5]]) g.set(x, y, WD[1]);
    g.poly([[cx - 7, 16], [cx + 7, 16], [cx + 10, 28], [cx + 12, 40], [cx - 12, 40], [cx - 10, 28]], R1);
    g.tone((x, y) => x < cx - 4, R0, [R1]); g.tone((x, y) => x > cx + 6, R2, [R1]);
    g.line(cx, 30, cx, 40, R2, true); g.line(cx - 6, 32, cx - 7, 40, R2, true); g.line(cx + 6, 32, cx + 7, 40, R3, true);
    g.hl(cx - 10, 29, 20, R2, true);
    for (const s of [-1, 1]) { g.rect(cx + s * 5 - 2, 40, 4, 2, S1); g.hl(cx + s * 5 - 2, 41, 4, WD[0]); }
    g.hl(cx - 8, 22, 16, '#b8a47a', true); g.set(cx + 3, 23, '#b8a47a'); g.set(cx + 3, 24, '#8a7650');
    const hand = (x, y) => { g.rect(x - 1, y - 1, 3, 3, S0); g.set(x + 1, y + 1, S1); };
    g.bar(cx + 6, 18, cx + 11, 22, 3, R1, R0, R2); hand(cx + 12, 22);
    if (arm === 1) { g.bar(cx - 6, 18, cx - 12, 14, 3, R0, W0, R1); hand(cx - 13, 13); comb(cx - 18, 10, 1); }
    else if (arm === 2) { g.bar(cx - 6, 18, cx - 13, 21, 3, R0, W0, R1); hand(cx - 14, 21); comb(cx - 19, 19, 1); }
    else { g.bar(cx - 6, 18, cx - 8, 26, 3, R0, W0, R1); hand(cx - 8, 27); comb(cx - 13, 27, 0); }
    g.ell(cx, 9, 5, 5.5, S0); g.tone((x, y) => x > cx + 2, S1, [S0]); g.set(cx - 2, 5, '#f6d2b4'); g.set(cx - 3, 6, '#f6d2b4');
    for (const s of [-1, 1]) g.rect(cx + s * 5 - (s > 0 ? 0 : 1), 8, 2, 5, B1);
    g.set(cx - 6, 10, S1); g.set(cx + 6, 10, S2);
    g.hl(cx - 6, 9, 12, C0); g.hl(cx - 6, 10, 12, C1); g.set(cx + 6, 11, C1); g.set(cx + 7, 12, C0);
    g.set(cx, 12, S2);
    g.poly([[cx - 5, 12], [cx + 5, 12], [cx + 5, 18], [cx + 2, 24], [cx, 26], [cx - 2, 24], [cx - 5, 18]], W0);
    g.line(cx - 2, 15, cx - 1, 23, B1, true); g.line(cx + 2, 15, cx + 1, 23, B2, true);
    g.hl(cx - 2, 14, 4, S2); g.hl(cx - 3, 13, 6, W0);
    return g.outline('#3e3448');
  }

  // ---------------------------------------------------------------- the mirror, 30 x 48
  // A tall oval of glass in a heavy gold frame on a foot, a bell and two little horns for a crest. The
  // glass is one plain colour (`GLASS`) the game finds and paints the reflection into.
  const GLASS = '#9fc4e8';
  function mirror() {
    const W = 30, H = 48, g = new Grid(W, H), cx = 14.5, cy = 20;
    g.ell(cx, cy, 13.5, 19, G2); g.ell(cx, cy, 10.5, 16, GLASS);
    g.tone((x, y) => (x - cx) + (y - cy) * 0.6 < -14, G1, [G2]); g.tone((x, y) => (x - cx) + (y - cy) * 0.6 > 12, G3, [G2]);
    g.ring(cx, cy, 13.5, 19, 1, G3, true); g.ring(cx, cy, 11.5, 17, 1, G3, true);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.set(cx - 0.5 + Math.cos(a) * 12.4, cy - 0.5 + Math.sin(a) * 17.9, k % 2 ? G0 : G1); }
    for (const s of [-1, 1]) { g.line(cx + s * 2, 1, cx + s * 5, 0, G1); g.set(cx + s * 5, 1, G2); }
    g.ell(cx, 2, 2.2, 2, G1); g.set(cx - 1, 1, G0);
    g.rect(cx - 2, 38, 5, 5, G2); g.vl(cx - 2, 38, 5, G1); g.vl(cx + 2, 38, 5, G3);
    g.poly([[cx - 9, 47], [cx - 3, 42], [cx + 4, 42], [cx + 10, 47]], G2); g.hl(cx - 8, 46, 18, G3); g.hl(cx - 4, 43, 9, G1);
    return g.outline(OL);
  }

  // ---------------------------------------------------------------- the chime: five bells, 0 the biggest
  function bell(n) {
    const r = 7.6 - n * 0.55, W = Math.ceil(r * 2) + 4, H = Math.ceil(r * 2.2) + 5, g = new Grid(W, H), cx = W / 2 - 0.5;
    g.rect(Math.round(cx) - 1, 0, 2, 2, G3);
    g.poly([[cx - r * 0.55, 2], [cx + r * 0.55 + 1, 2], [cx + r + 1, H - 4], [cx - r, H - 4]], G1);
    g.hl(Math.round(cx - r) - 1, H - 4, Math.round(r * 2) + 3, G2); g.hl(Math.round(cx - r) - 1, H - 3, Math.round(r * 2) + 3, G3);
    g.tone((x, y) => x > cx + r * 0.25, G2, [G1]); g.tone((x, y) => x < cx - r * 0.3 && y < H - 6, G0, [G1]);
    g.set(Math.round(cx), H - 2, G4); g.set(Math.round(cx), H - 1, G3);
    return g.outline(OL);
  }
  // The beam the bells hang from: a gold rail on two posts, `n` bells `gap` texels apart. The chime
  // stands its bells `BELL_GAP` apart, far enough that one butt rings one bell (js/heaven.js).
  const BELL_GAP = 20;
  // `H` texels tall: the belfry up there is the tallest thing in heaven after the god's own cloud.
  function beam(n, gap, H = 30) {
    const W = (n - 1) * gap + 14, g = new Grid(W, H);
    for (const x of [1, W - 4]) { g.rect(x, 3, 3, H - 4, G2); g.vl(x, 3, H - 4, G1); g.vl(x + 2, 3, H - 4, G3); g.rect(x - 1, H - 3, 5, 2, G3); }
    g.rect(0, 1, W, 3, G2); g.hl(0, 1, W, G0); g.hl(0, 3, W, G3);
    for (let k = 0; k < n; k++) g.set(7 + k * gap, 4, G4);
    return g.outline(OL);
  }

  // ---------------------------------------------------------------- a seat for a saved animal, 30 x 20
  // A cushion of cloud on a little plinth of pale stone with a gold band.
  function plinth() {
    const W = 30, H = 20, g = new Grid(W, H);
    g.rect(4, 10, 22, 8, '#e8e4f0'); g.vl(4, 10, 8, '#ffffff'); g.vl(25, 10, 8, '#b8b4c8'); g.hl(4, 17, 22, '#b8b4c8');
    g.hl(4, 12, 22, G2); g.hl(4, 13, 22, G3);
    for (const [x, y, r] of [[7, 8, 4.5], [12, 6, 5], [18, 6, 5], [23, 8, 4.5], [15, 8, 5]]) g.ell(x, y, r, r * 0.8, '#f4f8ff');
    g.tone((x, y) => y > 8 && y < 11, '#dfe9fb', ['#f4f8ff']); g.tone((x, y) => y >= 10, '#b9cbee', ['#dfe9fb', '#f4f8ff']);
    g.tone((x, y) => y < 5, W0, ['#f4f8ff']);
    return g.outline('#7d8fbf');
  }

  // ---------------------------------------------------------------- gold grass, to be grazed for the taste
  // The milk grass's blades (js/prop-pixels.js `grass`), grown gold, with white flowers in them.
  function goldGrass(big) {
    const W = big ? 29 : 19, H = big ? 22 : 16, g = new Grid(W, H), seed = big ? 171 : 172;
    let s = seed; const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const n = big ? 24 : 12, blades = [];
    for (let k = 0; k < n; k++) {
      const bx = W / 2 + (r() - 0.5) * (W - 8), depth = r(), len = (big ? 8 : 6) + r() * (big ? 10 : 7) * (1 - Math.abs(bx - W / 2) / W);
      blades.push({ bx, by: H - 2 - depth * (big ? 4 : 3), len, lean: (bx - W / 2) * 0.35 + (r() - 0.5) * 4 });
    }
    blades.sort((a, b) => a.by - b.by);
    for (const b of blades) {
      const tx = b.bx + b.lean, ty = b.by - b.len, steps = Math.ceil(b.len);
      for (let q = 0; q <= steps; q++) {
        const t = q / steps, x = b.bx + (tx - b.bx) * t * t, y = b.by + (ty - b.by) * t;
        g.set(x, y, t > 0.8 ? '#fff2a8' : t > 0.45 ? '#f0c85a' : t > 0.15 ? '#c99a34' : '#9a7424');
        if (t < 0.35) g.set(x + 1, y, '#9a7424');
      }
    }
    for (const [x, y] of big ? [[8, 8], [19, 6], [23, 11], [13, 5]] : [[6, 7], [11, 5]]) if (g.get(x, y)) { g.set(x, y, W0); if (g.get(x + 1, y)) g.set(x + 1, y, '#fff6d0'); }
    return g.outline('#6a5020');
  }

  // ---------------------------------------------------------------- the sacrifice, the HUD's coin, 9 x 9
  // The barrel's skull in gold: what the god is paid in (the compound calls a kill SACRIFICED).
  function skull() {
    const g = new Grid(9, 9), S = ['.#####.', '#######', '#ee#ee#', '#ee#ee#', '###e###', '.#####.', '.#.#.#.'];
    S.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') g.set(i + 1, j + 1, j < 2 && i < 3 ? G0 : i > 4 ? G2 : G1); else if (ch === 'e') g.set(i + 1, j + 1, G4); }));
    return g.outline(OL);
  }

  const sprites = {
    god: god(false, false), 'god-speak': god(true, false), 'god-blink': god(false, true),
    'shepherd-0': shepherd(0), 'shepherd-1': shepherd(1), 'shepherd-2': shepherd(2),
    mirror: mirror(), plinth: plinth(), skull: skull(), beam: beam(8, BELL_GAP, 52), 'grass-gold': goldGrass(false), 'grass-gold-big': goldGrass(true),
  };
  for (let n = 0; n < 8; n++) sprites['bell-' + n] = bell(n);
  return { sprites, GLASS, BELL_GAP, G: [G0, G1, G2, G3, G4], W: [W0, W1, W2, W3, W4], OL };
})();
if (typeof module !== 'undefined') module.exports = HEAVEN_PIXELS;

// In the page: baked once each, `UP` px a texel, and drawn smoothed with their top-left at (x, y), `k`
// world px a texel — the props' way (js/prop-pixels.js).
if (typeof document !== 'undefined') {
  const UP = 4, baked = {};
  HEAVEN_PIXELS.canvas = (name) => {
    if (baked[name]) return baked[name];
    const g = HEAVEN_PIXELS.sprites[name], c = document.createElement('canvas'), x = c.getContext('2d');
    c.width = g.w * UP; c.height = g.h * UP;
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const v = g.get(i, j); if (v) { x.fillStyle = v; x.fillRect(i * UP, j * UP, UP, UP); } }
    return (baked[name] = c);
  };
  HEAVEN_PIXELS.draw = (ctx, name, x, y, k) => {
    const g = HEAVEN_PIXELS.sprites[name]; if (!g) return;
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(HEAVEN_PIXELS.canvas(name), x, y, g.w * k, g.h * k);
    ctx.imageSmoothingEnabled = smooth;
  };
}
