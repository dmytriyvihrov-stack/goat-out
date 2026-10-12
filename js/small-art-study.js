// Three native-resolution studies, 12 Oct 2026. Original sprites and all gameplay bounds stay intact.
// Opt in with #smallart or the ART tab; #aspacked always wins. No raster concept is downsampled.
(() => {
  const { Grid: G, sprites: S, P } = PROP_PIXELS;
  const C = { edge: P.ol, dark: '#292831', shade: '#454958', grey: '#737f8b',
    light: '#aab5b8', cream: '#e6dcc0', white: '#f1e9d3', blue: '#78a6b5',
    water: '#34515a', waterHi: '#52747b', glass: '#aabbb4', sand: '#8b7953',
    orange: '#d98536', gold: '#efbc68', weed: '#526443', pink: '#b87d78' };
  const register = (name, g) => {
    const base = S[name];
    if (g.w !== base.w || g.h !== base.h) throw new Error('Study frame differs: ' + name);
    S[name + '@small'] = g;
  };
  const bomb = new G(S.bomb.w, S.bomb.h);
  bomb.ell(7, 8, 6, 6, C.shade).ell(6, 7, 5, 5, C.dark, true);
  bomb.ell(5, 6, 3.8, 3.6, '#383c47', true).hl(3, 5, 2, C.light).set(3, 6, C.grey);
  bomb.line(10, 9, 10, 11, C.grey, true).hl(7, 12, 3, C.grey, true);
  bomb.rect(5, 1, 4, 2, C.shade).hl(5, 1, 4, C.light).outline(C.edge);
  register('bomb', bomb);

  function husky(sing) {
    const name = 'husky-' + (sing ? 'sing' : 'stand'), g = new G(S[name].w, S[name].h);
    const d = g.h - 21, foot = g.h - 2, hy = sing ? 6 : 7;
    // Four separated feet, a quiet saddle and one continuous light chest/mask.
    g.rect(8, foot - 4, 2, 5, C.shade).rect(17, foot - 4, 2, 5, C.shade);
    g.ell(11, 12 + d, 7.5, 4.4, C.grey).ell(11, 11 + d, 6.5, 2.8, C.shade, true);
    g.ell(12, 14 + d, 5.5, 2, C.cream, true);
    g.rect(5, foot - 4, 3, 5, C.cream).rect(14, foot - 4, 3, 5, C.white);
    g.hl(5, foot, 3, C.white).hl(8, foot, 2, C.cream).hl(17, foot, 2, C.cream);
    // A single large curled tail, no fur-noise pixels.
    g.ell(4, 9 + d, 3, 3, C.grey).ell(4, 7 + d, 3, 2, C.cream);
    g.hl(3, 5 + d, 3, C.white).rect(5, 7 + d, 2, 2, C.white);
    g.ell(18, 12 + d, 3, 4, C.cream);
    g.poly([[15, hy - 1], [15, 1], [19, hy - 2]], C.shade);
    g.poly([[20, hy - 2], [23, 0], [24, hy]], C.shade);
    g.set(16, 3, C.pink).set(22, 2, C.pink);
    g.ell(20, hy, 5, 4.5, C.grey).ell(19, hy - 1.5, 4, 2.5, C.shade, true);
    g.ell(21, hy + 2, 4, 2.7, C.white, true).vl(20, hy - 3, 4, C.white);
    g.line(15, hy + 2, 17, hy + 4, C.dark);
    if (sing) {
      g.rect(23, hy - 1, 3, 3, C.white).set(25, hy - 1, C.dark);
      g.rect(23, hy + 2, 2, 2, C.dark).set(23, hy + 3, C.pink);
      g.hl(20, hy, 2, C.dark);
    } else {
      g.rect(23, hy + 1, 3, 3, C.white).set(25, hy + 1, C.dark);
      g.rect(21, hy, 2, 2, C.dark).set(21, hy, C.blue);
    }
    return g.outline(C.edge);
  }
  register('husky-stand', husky(false)); register('husky-sing', husky(true));

  function tank(fx, dir, broken) {
    const g = new G(22, 16);
    // Two-pixel side plane, broad water field and a five-pixel fish; only two glass glints.
    g.rect(1, 2, 20, 13, C.shade).rect(2, 3, 16, 10, C.water);
    g.rect(18, 3, 2, 10, '#293f48').hl(2, 3, 16, C.waterHi);
    g.rect(2, 12, 18, 2, C.sand).hl(2, 12, 16, '#aa956a');
    g.vl(4, 8, 4, C.weed).set(3, 9, C.weed).set(5, 10, C.weed);
    if (!broken) {
      g.ell(fx, 8, 2.6, 1.8, C.orange).hl(fx - 1, 8, 3, C.gold);
      const tail = fx - dir * 3;
      g.vl(tail, 6, 4, C.orange).set(fx + dir, 7, C.dark);
      g.set(13, 5, C.glass);
    } else g.rect(2, 3, 16, 9, null);
    g.hl(1, 1, 18, C.glass).hl(19, 2, 2, C.grey).vl(1, 2, 12, C.grey);
    g.vl(18, 3, 10, C.shade).hl(1, 14, 20, C.dark);
    if (!broken) g.vl(2, 4, 2, C.cream).vl(19, 8, 2, C.grey);
    else g.rect(6, 1, 5, 5, null);
    return g.outline(C.edge);
  }
  [[7, 1], [10, 1], [13, -1], [10, -1]].forEach(([x, dir], i) => register('fish-' + i, tank(x, dir, false)));
  register('fish-broken', tank(0, 1, true));
  // Broken pieces keep the same palette as the intact study.
  for (const name of ['fish-shard', 'fish-body']) {
    const g = new G(S[name].w, S[name].h);
    const map = { [BEAST_MORE.FT.g2]: C.glass, [BEAST_MORE.FT.g3]: C.cream,
      [BEAST_MORE.FT.f0]: C.orange, [BEAST_MORE.FT.f1]: C.orange, [BEAST_MORE.FT.f2]: C.gold };
    g.p = S[name].p.map(c => map[c] || c); register(name, g);
  }
  if (typeof location !== 'undefined' && !window.GOAT_RELEASE) ART_PASS.smallProps = /smallart/.test(location.hash) && !/aspacked/.test(location.hash);
})();
