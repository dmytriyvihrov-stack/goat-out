'use strict';
// The skill rail's icons as hand-placed pixels (24 Sep 2026). A chip used to be a few vector strokes
// that a soul nudged — a tine here, a green drop in the corner — and a player could not tell at a
// glance what his headbutt had become. Here each verb is a small picture of the goat doing it, and
// the ACTIVE soul on that button redraws the picture: SPLASH is big green horns dripping, BOMB
// CHARGE is horns of lava, LONG HORNS is a stag's antlers. Passives lay a small mark over it.
//
// An icon is a stack of layers, each a character grid (`.` is empty) on one 16-cell square. A layer
// with `half` is the left eight columns of a symmetric picture, mirrored. A layer with `ramp` uses the
// digits 1..4 (dark → light) and is coloured by the named ramp, so one horn shape serves bone, venom
// and lava. The stack is merged, ringed in `SKILL_EDGE` where a filled cell (of a layer that is not
// `bare`) meets an empty one, baked once into a canvas one pixel a cell, and drawn scaled with
// smoothing off. `Renderer.skillIcon` asks `SKILL_ICONS.draw` first and falls back to its own
// strokes for anything drawn here as `null`.
const SKILL_EDGE = '#1a1016';
const SKILL_PAL = {
  o: '#1a1016',                                                    // ink: a line inside a picture
  W: '#f6efdd', w: '#e2d6ba', s: '#b3a383', S: '#7d6f58',          // fur, light → deep
  y: '#d9a53a', k: '#7a3a34', m: '#3a1414',                        // eye, nose, the inside of a mouth
  C: '#c29a5a', M: '#8a6238', N: '#5a3e22',                        // a crate's planks
  u: '#e0ad84', U: '#8a5a3c', t: '#9a3c2e', T: '#5e2220',          // a man: skin, robe
  B: '#c0392b', q: '#7a1f18',                                      // blood
  l: '#e4ffa0', g: '#9fd84a', G: '#5c9a2a', v: '#2f5a1c',          // venom (TUNING.goat.hornLooks.venom)
  F: '#ffe08a', f: '#f2a233', x: '#c0392b', X: '#fff6c8',          // fire, light → the red at its edge
  i: '#d4d8dc', I: '#8a9096', j: '#50565c',                        // iron
  e: '#9a918a', E: '#6a625c',                                      // the horn's bell (TUNING.goat.face.throat)
  z: '#a39c90', Z: '#6a645a',                                      // stone
};
// Ramps for the digit layers, dark → light, off the goat's own horn looks.
const SKILL_RAMPS = {
  horn: ['#6b4e30', '#a88a5e', '#d8c29a', '#f0e2c0'],
  antler: ['#4f3220', '#7a5636', '#b08a62', '#e6d3b0'],
  venom: ['#2f5a1c', '#5c9a2a', '#9fd84a', '#e4ffa0'],
  lava: ['#8f1e0a', '#e0521a', '#ffb43a', '#fff0a0'],
};

const SKILL_ART = {
  // ---- headbutt: the top of his head, seen head on, and what grows out of it ----
  head: { half: true, rows: [
    '........', '........', '........', '........', '........', '........', '........', '........',
    '.....wWW',
    '....wWWW',
    'SsswwWWW',
    '.SswyoWW',
    '...swwWW',
    '....swWW',
    '....swwW',
    '.....sww'] },
  // Bare: short goat horns, close together.
  horns: { half: true, ramp: 'horn', rows: [
    '........', '........', '........',
    '..3.....',
    '..43....',
    '...32...',
    '...43...',
    '....32..',
    '....421.',
    '.....21.'] },
  // SPLASH and BOMB CHARGE: the same big horns, twice the length, recoloured.
  bigHorns: { half: true, rows: [
    '.3......',
    '.43.....',
    '.321....',
    '..421...',
    '..321...',
    '...421..',
    '...321..',
    '....421.',
    '....321.',
    '.....21.'] },
  drips: { half: true, rows: [
    '........', '........', '........',
    '.g......',
    '.G......',
    '........',
    'l.......',
    'g.......',
    '........',
    '........',
    '.G......'] },
  sparks: { half: true, bare: true, rows: [
    '...X....',
    'f.......',
    '........',
    'X.......'] },
  // LONG HORNS: a stag's antlers, the whole width of the chip.
  antlers: { half: true, ramp: 'antler', rows: [
    '.4..4...',
    '.4.4....',
    '.434....',
    '..43....',
    '..43.4..',
    '...434..',
    '...43...',
    '....43..',
    '....432.',
    '.....32.'] },
  // IRON SKULL: a plate riveted over the brow.
  skull: { half: true, rows: [
    '........', '........', '........', '........', '........', '........', '........', '........',
    '........',
    '....jIii',
    '....jioi',
    '.....jII'] },

  // ---- grab: his head in profile, and what hangs from his teeth ----
  jaw: { rows: [
    '...23332........',
    '..32...432......',
    '.31......42.....',
    '.2.......w42....',
    '.1......wWW2w...',
    '...SSs.wWWWWWw..',
    '..SsssswWWoyWWw.',
    '...SS.swWWWWWWWw',
    '.......swWWWWWWk',
    '........sswwwooo',
    '.........ss.....',
    '.........s......'], ramp: 'horn' },
  crate: { rows: [
    '', '', '', '', '', '', '', '', '', '',
    '...........CCCCC',
    '...........MCMCM',
    '...........CCCCC',
    '...........MCMCM',
    '...........CCCCC'] },
  man: { rows: [
    '', '', '', '', '', '', '', '', '', '',
    '...........uuu..',
    '...........uUu..',
    '..........tTTTt.',
    '..........tTTTt.',
    '...........T.T..',
    '...........T.T..'] },
  gore: { bare: true, rows: [
    '', '', '', '', '', '', '', '', '',
    '.............BqB',
    '............B...',
    '..........B.....',
    '............qB..',
    '...............B',
    '..........B.....',
    '..........q.....'] },
  venomJaw: { rows: [
    '', '', '', '', '', '', '', '', '',
    '.............gGl',
    '.........g......',
    '.........G......',
    '................',
    '........l.......',
    '........g.......'] },
  charged: { bare: true, rows: [
    '', '', '', '', '', '', '', '', '',
    '..........X.....',
    '........FF......',
    '.......FX.....X.',
    '......FXFF......',
    '........XF......',
    '.......F.......X',
    '......F.........'] },
  teeth: { rows: [
    '', '', '', '', '', '', '', '', '',
    '.............iIi'] },
  club: { rows: [
    '', '', '', '', '', '', '', '', '',
    '................',
    '...............3',
    '...............2',
    '...............1'], ramp: 'horn' },
  hourglass: { rows: [
    '...........hhhhh',
    '............iFi.',
    '.............F..',
    '............iFi.',
    '...........hhhhh'], map: { h: '#a88a5e' } },

  // ---- roll: the goat balled up, and what the tumble leaves ----
  ball: { rows: [
    '', '', '',
    '......wwww43....',
    '.....wwWWW.432..',
    '....wWWWWWW.43..',
    '...wwWWWWWWW.32.',
    '...wWWWWoyWWW.21',
    '...wWWWWWWWWWw.1',
    '...wWWWWWWWWWs..',
    '...wwWWWWWWWss..',
    '....wWWWWWWss...',
    '.....sswwwss....',
    '......ssSSs.....'], ramp: 'horn' },
  streaks: { bare: true, rows: [
    '', '', '', '', '', '',
    's.ss............',
    '................',
    '..sss...........',
    '................',
    '.s.ss...........'] },
  streaksLong: { bare: true, rows: [
    '', '', '', '', '', '',
    'sss.............',
    '................',
    'ssss............',
    '................',
    'sss.............'] },
  stars: { bare: true, rows: [
    '.F..........F...',
    'FXF........FXF..',
    '.F..............',
    '................', '', '', '', '', '', '', '', '', '',
    '..............F.',
    '.............FXF',
    '..............F.'] },
  puddle: { rows: [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '..gGGgGGGggGGg..',
    '...vvGGGGGGvv...'] },
  bubbles: { bare: true, rows: [
    '', '', '', '', '', '', '', '', '', '', '',
    '.l.............l',
    '..............g.',
    '.g..............'] },
  // LEAPFROG: the ball at the top of its arc over a man's head.
  leapBall: { rows: [
    '......www3......',
    '.....wWWW.2.....',
    '....wWWoyW.1....',
    '....wWWWWWs.....',
    '.....sWWWs......',
    '......sss.......'], ramp: 'horn' },
  arc: { bare: true, rows: [
    '', '',
    '...s........s...',
    '..s..........s..',
    '................',
    '.s............s.',
    '................',
    's..............s'] },
  leapMan: { rows: [
    '', '', '', '', '', '', '', '',
    '.......uu.......',
    '......uUUu......',
    '......tTTt......',
    '.....tTTTTt.....',
    '.....tTTTTt.....',
    '......tTTt......',
    '......T..T......',
    '......T..T......'] },

  // ---- scream: his head in profile, raised, mouth open, and what comes out of it ----
  mouth: { rows: [
    '23332...........',
    '1...432.........',
    '......42........',
    '......w42.......',
    '.....wWW2w......',
    'SSs.wWWWWWw.....',
    'sssswWWoyWWw....',
    'SS.swWWWWWWWk...',
    '....swWWWWmmm...',
    '.....swwWmm.....',
    '......swwWw.....',
    '.......ss.......'], ramp: 'horn' },
  // The bare call: two faint rings, no edge — a noise, not yet a blow.
  call: { bare: true, rows: [
    '', '', '', '', '',
    '..............s.',
    '...............s',
    '.............s.s',
    '..............ss',
    '..............ss',
    '.............s.s',
    '...............s',
    '..............s.'] },
  // THE FULL THROAT: the mouth drawn out into a horn's bell (as on his face), and a solid ring.
  bell: { rows: [
    '', '', '', '', '',
    '................',
    '.............W..',
    '............eW..',
    '..........eeEW..',
    '..........eEmW..',
    '............eW..',
    '.............W..'] },
  rings: { bare: true, rows: [
    '', '', '', '', '',
    '...............W',
    '...............W',
    '...............W',
    '...............W',
    '...............W',
    '...............W',
    '...............W',
    '...............W'] },
  // RAW THROAT on a stun: the ring reaches further up and down.
  ringsWide: { bare: true, rows: [
    '', '', '',
    '..............s.',
    '...............s',
    '', '', '', '', '', '', '', '',
    '...............s',
    '..............s.'] },
  // DRAGON BREATH: a cone of fire out of his mouth.
  breath: { rows: [
    '', '', '', '',
    '...............x',
    '..............xf',
    '.............xfF',
    '............xfFF',
    '...........fFXXF',
    '...........fFXXF',
    '............xfFF',
    '.............xfF',
    '..............xf',
    '...............x'] },
  // VENOM SPIT: froth at his lips and a glob on its way.
  spit: { rows: [
    '', '', '',
    '..............g.',
    '............gglg',
    '...........gllgG',
    '...........glggG',
    '............gGGv',
    '............l.v.',
    '...........g....',
    '................',
    '..........l.....'] },
};

// Which layers make the icon of a verb as `mods` has it now. Priority inside a button follows the
// in-game looks (`PIXEL_ART.hornsOf`: lava before venom); a build normally carries one active a button.
const SKILL_ICONS = {
  N: 16,
  cache: {},
  layers(id, m, fire) {
    const L = [];
    if (id === 'butt') {
      L.push('head');
      if (m.bomb) L.push('bigHorns:lava', 'sparks');
      else if (m.splash) L.push('bigHorns:venom', 'drips');
      else if (m.antlers) L.push('antlers');
      else L.push('horns');
      if (m.headbuttRecovery < 1) L.push('skull');
      return L;
    }
    if (id === 'grab') {
      L.push('jaw');
      if (!m.grabMen) L.push('crate');
      else { L.push('man'); if (m.livingShield) L.push('club'); if (m.devour) L.push('gore'); }
      if (m.shieldBullets > (typeof BOON_BASE !== 'undefined' ? BOON_BASE.shieldBullets : 2)) L.push('teeth');
      if (m.venomHold > 0) L.push('venomJaw');
      if (m.chargeHold > 0) L.push('charged');
      if (m.coldEye) L.push('hourglass');
      return L;
    }
    if (id === 'roll') {
      if (m.leapfrog) return ['arc', 'leapMan', 'leapBall'].concat(m.rollCooldown < 1 ? ['streaks'] : []);
      L.push(m.rollCooldown < 1 ? 'streaksLong' : 'streaks');
      if (m.venomRoll) L.push('puddle');
      L.push('ball');
      if (m.venomRoll) L.push('bubbles');
      if (m.rollStun > 0) L.push('stars');
      return L;
    }
    if (id === 'scream') {
      L.push('mouth');
      if (m.spit) L.push('spit');
      else if (fire || m.breath) L.push('breath');
      else if (m.screamStun) { L.push('bell', 'rings'); if (m.screamRadius > (typeof BOON_BASE !== 'undefined' ? BOON_BASE.screamRadius : 1e9)) L.push('ringsWide'); }
      else L.push('call');
      return L;
    }
    return null;
  },
  // The merged grid of colours (null = empty), outline included, one cell a side of margin.
  cells(names) {
    const N = this.N, W = N + 2, grid = [], edgy = [];
    for (let j = 0; j < W; j++) { grid.push(new Array(W).fill(null)); edgy.push(new Array(W).fill(false)); }
    for (const nm of names) {
      const [key, rampName] = nm.split(':'), L = SKILL_ART[key];
      if (!L) continue;
      const ramp = SKILL_RAMPS[rampName || L.ramp] || null;
      L.rows.forEach((row, j) => {
        const full = L.half ? row + row.split('').reverse().join('') : row;
        for (let i = 0; i < full.length && i < N; i++) {
          const ch = full[i];
          if (ch === '.' || ch === ' ') continue;
          const col = (ramp && ch >= '1' && ch <= '4') ? ramp[+ch - 1] : (L.map && L.map[ch]) || SKILL_PAL[ch];
          if (!col) continue;
          grid[j + 1][i + 1] = col; edgy[j + 1][i + 1] = !L.bare;
        }
      });
    }
    const out = grid.map((r) => r.slice());
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      if (grid[j][i]) continue;
      const near = (a, b) => a >= 0 && b >= 0 && a < W && b < W && edgy[b][a];
      if (near(i - 1, j) || near(i + 1, j) || near(i, j - 1) || near(i, j + 1)) out[j][i] = SKILL_EDGE;
    }
    return out;
  },
  bake(names) {
    const key = names.join('+');
    if (this.cache[key]) return this.cache[key];
    if (typeof document === 'undefined') return null;
    const cells = this.cells(names), W = cells.length;
    const c = document.createElement('canvas'); c.width = W; c.height = W;
    const x = c.getContext('2d');
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) if (cells[j][i]) { x.fillStyle = cells[j][i]; x.fillRect(i, j, 1, 1); }
    return (this.cache[key] = c);
  },
  // Draws the verb round the origin at about the size the old strokes took for half-size `h`.
  // Whole device pixels a cell wherever that still fits the chip, so the cells stay square.
  draw(ctx, id, h, m, fire) {
    const names = this.layers(id, m, fire);
    if (!names) return false;
    const c = this.bake(names);
    if (!c) return false;
    const W = c.width, want = h * 2.6 / W;
    let cell = want >= 1.25 ? Math.round(want) : want;
    if (cell * W > h * 2.95) cell = want;
    const size = cell * W;
    const was = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, Math.round(-size / 2), Math.round(-size / 2), size, size);
    ctx.imageSmoothingEnabled = was;
    return true;
  },
};

if (typeof module !== 'undefined') module.exports = { SKILL_ICONS, SKILL_ART, SKILL_PAL };
