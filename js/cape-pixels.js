// THE CAPES ON HIM (6 Oct 2026), and the talismans' charms on his collar: hand-placed pixels on the goat
// sprite's own grid (`TUNING.goat.face.cell` world px a cell, the grid `PIXEL_ART.face` draws on), never a
// smooth shape. One cloth shape per view of him, drawn by hand cell by cell, and each cape's own cloth,
// trim, clasp and pattern laid over it. Cells are counted from his feet (the frame's foot point), the
// way `PIXEL_ART.sprite` counts them; a view to the left is its right-hand twin mirrored, as his frames are.
//   front (S)        BEHIND him: its edges past his flanks and its hem between his legs; the clasp at
//                    his throat, over the collar (`clasp`).
//   diag (SW / SE)   OVER the far half of his back, the clasp at its front corner.
//   side (W / E)     OVER him: the drape from the shoulders down the flank, the hem lower toward the rump.
//   backdiag (NW/NE) OVER him, from the nape down.
//   back (N)         OVER him, the whole cloak.
// Letters: `a` the cloth's shadow, `b` its body, `c` where the light is, `h` the hem (its trim), `k` / `K`
// the clasp and its glint; `.` nothing. A cape's own pattern goes on `b` and `c` cells (`pat`). On the
// run the lower rows swing a cell (`sway`, stepped with his own stride). Render only: nothing reads it.
const CAPE_PIXELS = (() => {
  // Symmetric views are drawn as their left half and mirrored, so they cannot come out lopsided.
  const mirror = (rows) => rows.map((r) => r + r.split('').reverse().join(''));
  // A cape, not a blanket (6 Oct 2026, his look, the fourth drawing: "it must not cover the rump, only part
  // of the back"): tied in a bow at the throat, over the shoulders and the front half of the back, hanging a
  // little down the side, its back edge stopping before the hips, so the rump, the belly and the legs show.
  const VIEWS = {
    front: { layer: 'behind', at: [-10, -20], sway: 5, rows: mirror([
      '......abbb',
      '.....abbbb',
      '....abbbbb',
      '...abbbbbb',
      '..abbbbbbb',
      '.abbbbbbbb',
      'abbbbbbbbb',
      'hhhbbbbbbb',
      '...hhhhhhh']) },
    // From behind (his redraw, "from the back it looks strangest"): cloth, not a block. The bow under the
    // collar, narrow at the nape, two folds down it, a pointed hem; two cells of flank show each side.
    back: { layer: 'over', at: [-6, -22], sway: 6, rows: mirror([
      '....kK',
      '...akk',
      '...abc',
      '..abcc',
      '..abca',
      '.abbca',
      '.abcca',
      '.abcab',
      'abbcab',
      'abccab',
      'hhbcab',
      '..hhhb',
      '....hh']) },
    // Facing left; the right-hand views are these mirrored.
    side: { layer: 'over', at: [-4, -24], sway: 6, knot: 2, rows: [
      '.kKk...........',
      'kKKKk..........',
      '.akkbbaa.......',
      '.abbcccbbaa....',
      '..abcccccbbba..',
      '..abccccccccbba',
      '...abccccaccbba',
      '...abbcccaccbba',
      '....abbccacccba',
      '....abbbcaccbba',
      '.....hhbbabbbba',
      '.......hhbbbbba',
      '.........hhhhh.'] },
    diag: { layer: 'over', at: [-3, -24], sway: 5, knot: 2, rows: [
      '.kKk........',
      'kKKKk.......',
      '.akkbbaa....',
      '.abccccbba..',
      '..abcccccbba',
      '..abccacccba',
      '...abcaccbba',
      '...hhbacbbba',
      '.....hhbbbba',
      '.......hhhh.'] },
    backdiag: { layer: 'over', at: [-6, -23], sway: 6, knot: 5, rows: [
      '....aKKa......',
      '...abkkba.....',
      '..abbccbbaa...',
      '.abbccccbbba..',
      '.abcccccccbba.',
      '.abbcccaccbbba',
      '..abbccaccbbba',
      '..abbcacccbbba',
      '...habbacbbbba',
      '....hhbbbbbbba',
      '......hhhhbbba',
      '..........hhh.'] },
  };
  // His eight facings onto the five views (the left-hand ones mirrored), the order `PIXEL_ART.draw` uses.
  const VIEW_OF = [['front', false], ['diag', false], ['side', false], ['backdiag', false], ['back', false], ['backdiag', true], ['side', true], ['diag', true]];
  // The wind (6 Oct 2026, his asks: "more in the wind", "it should billow up more", `TUNING.cape.wind`): no
  // fixed frames, the cloth's cells moved whole cells off the run (`k`, his speed over his stride) and the clock.
  // From the side the rows below `from` stream back and ripple, and every column lifts the further it is from
  // the knot (`knot`, the view's neck column), so the end rises over his back like a flag; from the front and
  // behind it billows out to both sides and the hem lifts. Standing, it only stirs. Always on the sprite's grid.
  const WIND = { from: 0.25, trail: 3, rise: 4, riseWave: 1.2, idleRise: 0.8, spread: 2, lift: 1, wave: 1.4, freq: 11, phase: 0.9, idle: 0.6, idleFreq: 2.4 };
  const h = (u, v) => { const x = Math.sin(u * 127.1 + v * 311.7) * 43758.5453; return x - Math.floor(x); };
  // Each cape: its cloth (a b c), trim (h), clasp (k K), outline (edge), and pattern (`pat(u, v, n)`: the
  // cell `u` across from the middle and `v` down from the top of `n` rows, a colour or null).
  const LOOKS = {
    // CLOAK OF SIGNS: a worn indigo, small violet sigils on it, a violet trim, a pale stone at the throat.
    symbols: { a: '#1b1836', b: '#2b2758', c: '#3e3a78', h: '#7d5cff', k: '#bfa6ff', K: '#f6efff', edge: '#0d0b1c',
      pat: (u, v) => { const m = ((u % 5) + 5) % 5, r = v % 5; return r === 1 && m === 1 ? '#a46cff' : r === 2 && (m === 0 || m === 2) ? '#7d5cff' : null; } },
    // SHEPHERD'S MANTLE: straw-green wool, tufts of grass stitched along the hem, a wooden toggle.
    meadow: { a: '#3a4620', b: '#56662e', c: '#74883f', h: '#c9a24e', k: '#8a6238', K: '#c29a44', edge: '#1b220e',
      pat: (u, v, n) => { const m = ((u % 3) + 3) % 3; return m !== 1 ? null : v === n - 2 || v === n - 3 ? '#9fd84a' : v === n - 4 && h(u, 3) < 0.6 ? '#d4f59a' : null; } },
    // CAPE OF RUIN: scorched black and blood red, embers smouldering in its ragged hem, an iron hook.
    ruin: { a: '#120809', b: '#2a0f13', c: '#46181b', h: '#7a2318', k: '#3a3036', K: '#8d8a85', edge: '#050203',
      pat: (u, v, n) => { const q = h(u, v); return v >= n - 3 && q < 0.22 ? '#ff7a2a' : v >= n - 4 && q < 0.4 ? '#c0392b' : v > 0 && q < 0.06 ? '#c0392b' : null; } },
    // BONE MANTLE: bone-white felt, ochre chevrons down it, a toggle of bone.
    boomerang: { a: '#978a6f', b: '#cbbd9c', c: '#e6dabd', h: '#a57949', k: '#efe6d0', K: '#ffffff', edge: '#3b2f22',
      pat: (u, v) => v > 1 && (v + Math.abs(u)) % 4 === 0 ? '#b9873a' : null },
    // SCARECROW'S CAPE: straw-gold, light straws down it, a fringe of twine, a twist of rope at the throat.
    effigy: { a: '#7a5a26', b: '#a8823c', c: '#c9a24e', h: '#5a3e22', k: '#6b4a2c', K: '#c29a44', edge: '#2a1c0e', fray: true,
      pat: (u, v) => (((u % 3) + 3) % 3 === 0 && v > 0 ? '#e2c27a' : null) },
  };
  // The cape folded, for the HUD chip, the shelf, the floor of a niche and the book: one picture of each.
  const FOLDED = [
    '....kKk....',
    '..aabkbaa..',
    '.abbcccbba.',
    'abccccccbba',
    'abccccccbba',
    'aaaaaaaaaaa',
    'abbbbbbbbba',
    'hhhhhhhhhhh'];
  // The talismans as charms on the collar: a few cells each, its own shape and colour, ringed in `edge`.
  const EDGE = '#24160e';
  const CHARMS = {
    firecharm: { rows: ['.o.', 'ofo', '.o.'], o: '#b9873a', f: '#f2a233' },
    clover: { rows: ['.g.', 'gGg', '.g.'], g: '#7c8f52', G: '#b6c98a' },
    mason: { rows: ['ss', 'sd'], s: '#8d8a85', d: '#4a4642' },
    domino: { rows: ['w', 'd', 'w'], w: '#efe6d0', d: '#1a1416' },
    echo: { rows: ['w.', '.w', 'w.'], w: '#efe6d0' },
    spade: { rows: ['.t.', 'sss', '.s.'], t: '#6b4a2c', s: '#a09c95' },
    grease: { rows: ['.r', 'rr', 'rR'], r: '#c0392b', R: '#ffb0a0' },
    awl: { rows: ['t', 't', 's', 's'], t: '#6b4a2c', s: '#c8c4bc' },
    mask: { rows: ['w.w', 'www', 'dwd'], w: '#efe6d0', d: '#1a1416' },
    spur: { rows: ['.g.', 'gdg', '.g.'], g: '#e0b24e', d: '#6b4a2c' },
    moth: { rows: ['m.m', 'mdm'], m: '#b8ad97', d: '#5a5250' },
    bell: { rows: ['.g.', 'ggg', 'gdg'], g: '#c29a44', d: '#3a2a1a' },
    sandal: { rows: ['b', 'B', 'b'], b: '#8a6238', B: '#3b2a1a' },
    scapegoat: { rows: ['w.w', 'www', 'd.d'], w: '#e8e0cc', d: '#1a1416' },
    tallow: { rows: ['f', 'c', 'c'], f: '#f2a233', c: '#e8dcb0' },
    mirror: { rows: ['.b.', 'bWb', '.b.'], b: '#8fc8e8', W: '#ffffff' },
    cup: { rows: ['rrr', '.g.'], r: '#c0392b', g: '#8d8a85' },
    knuckle: { rows: ['w.w', 'www', 'w.w'], w: '#e8dcc0' },
    magnet: { rows: ['r.r', 'rrr'], r: '#c0392b' },
    tally: { rows: ['t', 'n', 't'], t: '#a57949', n: '#3b2a1a' },
    nosebag: { rows: ['g.g', 'bbb', 'bbb'], g: '#9fd84a', b: '#8a6238' },
  };
  const cellSize = () => (typeof TUNING !== 'undefined' ? TUNING.goat.face.cell : 34 / 112 * 3);
  // One grid at cell (i0, j0) from the foot, cell size `C`, mirrored with `flip`, ringed in `edge`.
  // `col(ch, i, j)` gives a cell's colour or null.
  const paint = (ctx, rows, i0, j0, C, flip, edge, col, ox = 0, oy = 0) => {
    const w = rows[0].length, H = rows.length;
    const at = (i, j) => (i < 0 || j < 0 || i >= w || j >= H || rows[j][i] === '.' ? null : col(rows[j][i], i, j));
    for (let j = -1; j <= H; j++) for (let i = -1; i <= w; i++) {
      const c = at(i, j) || (edge && (at(i + 1, j) || at(i - 1, j) || at(i, j + 1) || at(i, j - 1)) ? edge : null);
      if (!c) continue;
      const ci = i0 + i, x = flip ? -(ci + 1) * C : ci * C;
      ctx.fillStyle = c; ctx.fillRect(ox + x, oy + (j0 + j) * C, C, C);
    }
  };
  // The cloth's colour for one letter at (i, j) of a grid of `n` rows: its pattern over `b` and `c`.
  const cloth = (L, w, n) => (ch, i, j) => {
    if ((ch === 'b' || ch === 'c') && L.pat) { const p = L.pat(i - Math.floor(w / 2), j, n); if (p) return p; }
    if (ch === 'h' && L.fray && i % 2) return L.a;
    return L[ch] || null;
  };

  const api = {
    VIEWS, VIEW_OF, LOOKS, CHARMS, FOLDED,
    // His facing index for a heading, the one `PIXEL_ART.draw` picks his frame by (0 S, 2 W, 4 N, 6 E).
    view(angle) { return (Math.round(angle / (Math.PI / 4)) % 8 + 14) % 8; },
    // `layer` 'behind' (before his frame) or 'over' (after it), at his feet, in the frame `PIXEL_ART.draw`
    // put him in. `step` is his stride's step (-1 standing).
    draw(ctx, id, layer, angle, step, wind) {
      const L = LOOKS[id]; if (!L) return;
      const d = api.view(angle), [name, flip] = VIEW_OF[d], V = VIEWS[name];
      if (V.layer !== layer) return;
      const W = Object.assign({}, WIND, typeof TUNING !== 'undefined' && TUNING.cape && TUNING.cape.wind);
      // `wind` { t, k }; an old caller passing only the stride's step gets the step as its clock.
      const t = wind ? wind.t : Math.max(0, step) * 0.25, k = wind ? Math.max(0, Math.min(1, wind.k)) : step < 0 ? 0 : 1;
      const run = k > 0.05, side = name === 'side' || name === 'diag' || name === 'backdiag';
      const dots = (m) => Array(Math.max(0, m)).fill('.');
      // Coloured first, on the cloth as drawn, so its pattern travels with it when the cells move.
      const col0 = cloth(L, V.rows[0].length, V.rows.length);
      let rows = V.rows.map((r, j) => [...r].map((ch, i) => (ch === '.' ? '.' : col0(ch, i, j) || '.')));
      const n = rows.length, start = Math.round(n * W.from);
      const depthOf = (j) => (j < start ? 0 : (j - start + 1) / (n - start));
      const waveOf = (j) => Math.sin(t * (run ? W.freq : W.idleFreq) - j * W.phase);
      const flapOf = (j) => (run ? W.wave * (0.4 + 0.6 * k) : W.idle) * depthOf(j) * waveOf(j);
      let x0 = V.at[0], y0 = V.at[1];
      if (side) {
        // From the side: the rows stream back toward the hem and ripple...
        const offs = rows.map((r, j) => Math.round(W.trail * k * depthOf(j) + flapOf(j)));
        const pad = Math.max(0, ...offs.map(Math.abs));
        if (pad) { rows = rows.map((r, j) => dots(pad + offs[j]).concat(r, dots(pad - offs[j]))); x0 -= pad; }
        // ...and the cloth billows up, the more the further it is from the knot: each column lifted whole cells
        // (`rise` on the run, a wave through it, a little even standing). The neck's column never moves.
        const w = rows[0].length, knot = (V.knot || 1) + pad, far = name === 'backdiag' ? 0.6 : 1;
        const up = rows[0].map((c, i) => {
          const f = Math.max(0, Math.min(1, (i - knot) / Math.max(1, w - 1 - knot))) ** 1.2;
          const lift = run ? W.rise * k + W.riseWave * (0.4 + 0.6 * k) * Math.sin(t * W.freq * 0.8 - i * 0.55)
            : W.idleRise * (0.5 + 0.5 * Math.sin(t * W.idleFreq - i * 0.4));
          return Math.max(0, Math.round(lift * f * far));
        });
        const top = Math.max(0, ...up);
        if (top) {
          const H = rows.length + top, out = Array.from({ length: H }, () => dots(w));
          rows.forEach((r, j) => r.forEach((c, i) => { if (c !== '.') out[j + top - up[i]][i] = c; }));
          rows = out; y0 -= top;
        }
      } else {
        // From the front and from behind it billows out to both sides: each row below `from` stretched wider by
        // whole cells, nearest-cell, about its middle (it stays even), a wave through it; the hem lifts at speed.
        // Behind him the wind lifts it more than it spreads it (a blob as wide as him read worst of all).
        const back = name === 'back', lift = run ? Math.round(W.lift * k * (back ? 2 : 1) * (0.75 + 0.25 * Math.sin(t * W.freq * 0.5))) : 0;
        if (lift > 0) { const at = Math.max(start, n - 3 - lift); rows = rows.filter((r, j) => j < at || j >= at + lift); }
        const w = rows[0].length, spread = back ? 0.5 : 1;
        const sp = rows.map((r, j) => Math.max(0, Math.round(spread * (W.spread * k * depthOf(j) + Math.abs(flapOf(j))))));
        const pad = Math.max(0, ...sp);
        if (pad) {
          rows = rows.map((r, j) => {
            const nw = w + 2 * sp[j], row = Array.from({ length: nw }, (_, i) => r[Math.min(w - 1, Math.floor(i * w / nw))]);
            return dots(pad - sp[j]).concat(row, dots(pad - sp[j]));
          });
          x0 -= pad;
        }
      }
      paint(ctx, rows, x0, y0, cellSize(), flip, L.edge, (c) => c);
    },
    // The clasp at his throat on the straight front view, over the collar: the other views carry theirs in
    // the cloth (`k`), and the back views show none.
    clasp(ctx, id, angle, neck) {
      const L = LOOKS[id]; if (!L) return;
      if (api.view(angle) !== 0) return;
      const C = cellSize(), rows = ['k.k', '.K.', 'k.k'];
      paint(ctx, rows, Math.floor(neck[0] / C) - 1, Math.floor(neck[1] / C) - 2, C, false, L.edge, (ch) => L[ch]);
    },
    // The folded cape, centred at (x, y), about `h` half-size: baked once a cape at a pixel a cell.
    icon(ctx, id, x, y, h) {
      const L = LOOKS[id]; if (!L) return;
      api.baked ||= {};
      let c = api.baked[id];
      if (!c && typeof document !== 'undefined') {
        c = document.createElement('canvas'); c.width = FOLDED[0].length + 2; c.height = FOLDED.length + 2;
        paint(c.getContext('2d'), FOLDED, 1, 1, 1, false, L.edge, cloth(L, FOLDED[0].length, FOLDED.length + 3));
        api.baked[id] = c;
      }
      if (!c) {   // no canvas to bake into (node, the preview sheet): cell by cell
        const k = (h * 2.2) / (FOLDED[0].length + 2);
        paint(ctx, FOLDED, 0, 0, k, false, L.edge, cloth(L, FOLDED[0].length, FOLDED.length + 3), x - k * FOLDED[0].length / 2, y - k * FOLDED.length / 2);
        return;
      }
      const k = (h * 2.2) / c.width, sm = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(c, x - c.width * k / 2, y - c.height * k / 2, c.width * k, c.height * k);
      ctx.imageSmoothingEnabled = sm;
    },
    // The collar round his neck on facing `d` (`PaintedArt.collar`, `TUNING.goat.collar`): a ring seen from
    // the camera, an ellipse whose short axis lies along the way he faces, its near half (0..π) drawn. `neck`
    // is his throat on that facing (`PIXEL_NECK`). A diagonal frame shows the head nearly side-on, so the
    // ring turns further toward a side view than the world angle says (`C.flat`); on the two front
    // diagonals it rises toward the nape, behind the jaw, and dips at the throat under the chin.
    ring(d, neck, C) {
      const fa = (d + 2) * (Math.PI / 4);
      let vx = Math.cos(fa), vy = Math.sin(fa) * (Math.abs(Math.cos(fa)) > 0.1 ? C.flat : 1);
      const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
      if (vy < -0.1) { vx = -vx; vy = -vy; }
      if (d === 1 || d === 7) vx = -vx;
      const R = C.r, r = C.r * C.depth * Math.abs(vy) + C.thin;
      return { cx: neck[0] - vx * r, cy: neck[1] - vy * r, R, r, rot: Math.atan2(-vx, vy), back: d >= 3 && d <= 5 };
    },
    // The point `t` (0 one end, 1 the other) along the ring's near half.
    ringAt(q, t) {
      const th = t * Math.PI, ex = q.R * Math.cos(th), ey = q.r * Math.sin(th), c = Math.cos(q.rot), s = Math.sin(q.rot);
      return { x: q.cx + ex * c - ey * s, y: q.cy + ex * s + ey * c };
    },
    // One talisman's charm hanging from (x, y) world px on the collar, on the sprite's grid.
    charm(ctx, id, x, y) {
      const S = CHARMS[id]; if (!S) return;
      const C = cellSize(), w = S.rows[0].length;
      paint(ctx, S.rows, Math.floor(x / C) - Math.floor(w / 2), Math.floor(y / C), C, false, EDGE, (ch) => S[ch] || null);
    },
  };
  return api;
})();
if (typeof module !== 'undefined') module.exports = CAPE_PIXELS;
