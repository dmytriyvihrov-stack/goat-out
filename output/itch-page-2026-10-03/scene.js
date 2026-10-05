// Loaded into the running game page (served): lays the itch header's scene through GOAT GRID's SCENE
// drawing, the game's own floor, walls, sprites, fire and blood, and posts it to /shot as
// tools/shots/<name>.png. node compose.cjs then puts the title on it. Touches no run state.
window.ITCH_SCENE = async function (name = 'itch-scene', opts = {}) {
  const T = TILE, S = GoatGrid.SCENE, G = GoatGrid.state(game);
  const COLS = opts.cols || 10, ROWS = opts.rows || 7;
  let size = S.sizes.findIndex(([c, r]) => c === COLS && r === ROWS);
  if (size < 0) { S.sizes.push([COLS, ROWS]); size = S.sizes.length - 1; }
  const ax = (k, label) => Math.max(0, GoatGrid.axis(k).values.findIndex((v) => v.label === label));
  G.base.horns = ax('horns', opts.horns || 'LONG + BOMB'); G.base.voice = ax('voice', opts.voice || 'VENOM SPIT');
  G.base.facing = ax('facing', opts.facing || 'E'); G.base.wounds = 0; G.base.eye = ax('eye', opts.eye || 'NONE');
  G.base.talisman = ax('talisman', opts.talisman || 'NONE');
  const at = (tool, x, y, more) => Object.assign({ tool, x: x * T, y: y * T, pose: 'idle', boss: false, face: 'goat', shout: false }, more);
  const items = opts.items ? opts.items(at) : [
    // the far wall and the title's band above the fight: furniture at the sides only
    at('pillar', 0.5, 0.5), at('pillar', 9.5, 0.5), at('brazier', 1.5, 1.5), at('brazier', 8.5, 1.5),
    at('hay', 0.5, 2.5), at('barrel', 0.5, 3.5), at('grass', 7.5, 2.5),
    // the fight: the goat's horns into one, one winding up and shouting, the butcher and the ogre coming
    at('clubman', 4.1, 4.0, { pose: 'flung' }), at('spray', 4.0, 3.9),
    at('clubman', 5.7, 6.0, { pose: 'windup', shout: true }), at('butcher', 6.5, 4.1, { pose: 'walk' }),
    at('ogre', 8.1, 5.3, { pose: 'walk', boss: true }), at('seer', 9.3, 3.4),
    at('hound', 1.0, 5.9, { pose: 'windup' }), at('rifle', 9.3, 6.4, { pose: 'windup' }),
    at('clubman', 3.5, 6.2, { pose: 'dead' }), at('pool', 3.7, 6.3), at('pool', 7.0, 6.6),
    at('fire', 6.5, 6.5), at('fire', 7.5, 6.5), at('witchfire', 1.5, 3.5), at('soul', 5.6, 3.1)];
  items.forEach((it, i) => { it.id = i + 1; });
  G.scene = { floor: opts.floor || 1, size, walls: opts.walls == null ? 1 : opts.walls, frame: 'room', zoom: 2, tool: 'clubman', pose: 'idle', boss: false, face: 'goat', shout: false,
    burst: 1, goat: Object.assign({ x: 2.6 * T, y: 4.6 * T, pose: 'swing' }, opts.goat || {}), items, seq: items.length, undo: [], stubs: new Map() };
  const sc = G.scene, b = GoatGrid.sceneBox(sc), k = opts.k || 3;
  const cv = document.createElement('canvas'); cv.width = Math.round((b.x1 - b.x0) * k); cv.height = Math.round((b.y1 - b.y0) * TILT * k);
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const r = game.renderer; if (opts.t != null) r.t = opts.t;
  GoatGrid.drawScene(r, ctx, G, sc, 0, 0, cv.width, cv.height);
  const res = await fetch('/shot?name=' + name, { method: 'POST', body: cv.toDataURL('image/png') });
  return name + ' ' + cv.width + 'x' + cv.height + ' ' + res.status;
};
