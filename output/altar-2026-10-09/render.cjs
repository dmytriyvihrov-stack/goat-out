// node render.cjs -> sheet.png: four takes on THE SACRIFICE ALTAR (9 Oct 2026 playtest, item 20: a floor pictogram in
// the middle of floor 3, six cells round it, one filled for every second a living thing stands on it and pays a heart;
// Nuclear Throne's and Spelunky's altars). Each take at 0, 3 and 6 of six filled. Hand-placed pixels on the game's own
// `Grid` and palette (js/prop-pixels.js), seen from above as the floor is. A sketch for choosing, not wired in.
const fs = require('fs'), { Img, text } = require('../pixel-claude-2026-09-24/png.cjs'), { P, Grid } = require('../../js/prop-pixels.js');

const N = 48, C = 24, at = (k, r) => { const a = -Math.PI / 2 + k * Math.PI / 3; return [C + Math.cos(a) * r, C + Math.sin(a) * r]; };

// A: THE WHEEL OF SIX. A carved stone disc, six sockets round a goat's skull; a filled socket is a pool of blood and
// its groove runs red to the middle; full, the skull's eyes light.
function wheel(n) {
  const g = new Grid(N, N);
  g.ell(C, C, 22, 22, P.s1).ring(C, C, 22, 22, 2, P.s0).ring(C, C, 13, 13, 1, P.s0);
  g.tone((x, y) => (x + y * 3) % 7 === 0, P.s2, [P.s1]);
  for (let k = 0; k < 6; k++) {
    const [x, y] = at(k, 17), [ix, iy] = at(k, 12.5), on = k < n;
    g.line(x, y, ix, iy, on ? P.h1 : P.s0);
    g.ell(x, y, 3.2, 3.2, on ? P.h1 : P.d1); if (on) { g.ell(x, y, 2.2, 2.2, P.h2); g.set(x - 1, y - 1, P.h3); }
  }
  // the skull in the middle
  g.ell(C, C + 1, 5, 4.5, P.n2).ell(C, C + 4, 3, 2, P.n1);
  g.line(C - 4, C - 2, C - 8, C - 9, P.n1).line(C - 3, C - 2, C - 7, C - 9, P.n2).line(C + 4, C - 2, C + 8, C - 9, P.n1).line(C + 3, C - 2, C + 7, C - 9, P.n2);
  const eye = n >= 6 ? P.h3 : P.d0; g.rect(C - 3, C, 2, 2, eye).rect(C + 2, C, 2, 2, eye);
  return g.outline();
}

// B: THE BLOOD BASIN. An iron grate over a bowl, six channels running in to it; each one filled runs red, and the
// bowl in the middle fills a sixth at a time.
function basin(n) {
  const g = new Grid(N, N);
  g.ell(C, C, 22, 22, P.i1).ring(C, C, 22, 22, 2, P.i0);
  for (let k = 0; k < 6; k++) {
    const [x0, y0] = at(k, 9), [x1, y1] = at(k, 20), on = k < n;
    g.bar(x0, y0, x1, y1, 3.4, on ? P.h1 : P.d2, on ? P.h3 : P.i2, on ? P.h0 : P.d1);
    const [sx, sy] = at(k, 20); g.rect(Math.round(sx) - 1, Math.round(sy) - 1, 3, 3, on ? P.h2 : P.i3);
  }
  // the grate's bars between the channels
  for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k + 0.5) * Math.PI / 3; for (let r = 11; r < 20; r += 3) g.set(C + Math.cos(a) * r, C + Math.sin(a) * r, P.i0); }
  g.ell(C, C, 8, 8, P.i0).ell(C, C, 7, 7, P.d1);
  if (n) g.ell(C, C, 1 + 6 * n / 6, 1 + 6 * n / 6, P.h1).ell(C - 1, C - 1, Math.max(1, 4 * n / 6), Math.max(1, 4 * n / 6), P.h2);
  if (n >= 6) g.rect(C - 3, C - 3, 2, 1, P.h3);
  return g.outline();
}

// C: THE HORNED STAR. No stone at all: a six-pointed star chalked on the floor in a ring, an unlit candle on each
// point; a filled point lights its candle and bleeds into the chalk. Full, the eye drawn in the middle opens red.
function star(n) {
  const g = new Grid(N, N);
  g.ring(C, C, 21, 21, 1, P.c0);
  const pts = [0, 1, 2, 3, 4, 5].map((k) => at(k, 18));
  for (const tri of [[0, 2, 4], [1, 3, 5]]) for (let i = 0; i < 3; i++) { const a = pts[tri[i]], b = pts[tri[(i + 1) % 3]]; g.line(a[0], a[1], b[0], b[1], P.c1); }
  for (let k = 0; k < 6; k++) {
    const [x, y] = pts[k], on = k < n, X = Math.round(x), Y = Math.round(y);
    if (on) g.ell(x, y + 1, 3, 2, P.h1);
    g.rect(X - 1, Y - 3, 2, 4, on ? P.c2 : P.c0).set(X, Y - 4, P.d0);
    if (on) { g.set(X, Y - 5, P.f2).set(X, Y - 6, P.f3).set(X - 1, Y - 5, P.f1); }
  }
  g.ell(C, C, 5, 3, P.c1).ell(C, C, 2, 2, n >= 6 ? P.h3 : P.d1);
  if (n >= 6) g.set(C, C - 1, P.h2).set(C, C + 1, P.h2);
  return g.outline(P.d0);
}

// D: THE MAW. A mouth in the floor: a stone lip, six fangs round a black throat. A filled fang is blood to its root;
// full, an eye opens down in the throat.
function maw(n) {
  const g = new Grid(N, N);
  g.ell(C, C, 21, 21, P.s1).ring(C, C, 21, 21, 2, P.s0).ell(C, C, 17, 17, P.r1).ell(C, C, 14, 14, P.r0).ell(C, C, 11, 11, P.d0);
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + k * Math.PI / 3, on = k < n, w = 0.2;
    const b1 = [C + Math.cos(a - w) * 16.5, C + Math.sin(a - w) * 16.5], b2 = [C + Math.cos(a + w) * 16.5, C + Math.sin(a + w) * 16.5], tip = at(k, 9.5);
    g.poly([b1, b2, tip], on ? P.h2 : P.n2);
    g.line(b1[0], b1[1], tip[0], tip[1], on ? P.h3 : P.n4);
    g.line(b2[0], b2[1], tip[0], tip[1], on ? P.h1 : P.n1);
    if (on) { const d = at(k, 8); g.set(d[0], d[1], P.h1); }
  }
  if (n >= 6) g.ell(C, C, 3.5, 2.5, P.h2).rect(C, C - 2, 1, 5, P.d0).set(C - 2, C - 1, P.h3);
  return g.outline();
}

const takes = [['A  THE WHEEL OF SIX', wheel], ['B  THE BLOOD BASIN', basin], ['C  THE HORNED STAR', star], ['D  THE MAW', maw]];
const Z = 6, cell = N * Z, pad = 26, labelH = 26, W = pad + 3 * (cell + pad), H = pad + takes.length * (cell + labelH + pad);
const img = new Img(W, H, '#2b2622');
const toImg = (g) => { const im = new Img(g.w, g.h); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(x, y); if (c) im.fill(x, y, 1, 1, c); } return im; };
takes.forEach(([name, f], row) => {
  const y = pad + row * (cell + labelH + pad);
  text(img, name, pad, y, '#e6d6b0', 2);
  [0, 3, 6].forEach((n, col) => {
    const x = pad + col * (cell + pad), g = f(n);
    img.fill(x, y + labelH, cell, cell, '#3b2a33');   // a stretch of THE CAVE's floor tone under it
    img.blit(toImg(g), 0, 0, g.w, g.h, x, y + labelH, cell, cell);
    text(img, n + ' / 6', x + 4, y + labelH + 4, '#a89a80', 1);
  });
});
fs.writeFileSync(__dirname + '/sheet.png', img.png());
console.log('sheet.png', W, H);
