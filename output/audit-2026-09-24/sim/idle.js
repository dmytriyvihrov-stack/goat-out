// Their time-to-kill on a goat who does nothing: the real game, headless, one room, the goat put in
// its middle and left standing; n of one kind dropped aware round him by the dev spawner. Measures
// what each kind actually takes off a goat per second, to hold THREAT's prices against.
const { load } = require('./load.js');
const root = process.argv[2], SEEDS = +(process.argv[3] || 12), EASYMODE = process.argv[4] === 'easy', MODE = process.argv[5] || 'still';
const L = load(root, { quiet: true, seed: +(process.argv[6] || 4242) });
L.run(`window.game = new Game(document.getElementById('game'));`);
const g = L.grab('game'), TUNING = L.grab('TUNING'), THREAT = L.grab('THREAT'), TILE = L.grab('TILE');
g.frame = function () {}; g.settings.easy = EASYMODE;
function middle(r) {
  const w = g.world, cx = r.x + r.w / 2, cy = r.y + r.h / 2; let best = null, bd = 1e9;
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    let ok = !w.isPitPx((x + 0.5) * TILE, (y + 0.5) * TILE);
    for (let oy = -1; oy <= 1 && ok; oy++) for (let ox = -1; ox <= 1; ox++) if (w.isSolid(x + ox, y + oy)) ok = false;
    if (!ok) continue; const d = (x - cx) ** 2 + (y - cy) ** 2; if (d < bd) { bd = d; best = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE }; }
  }
  return best;
}
function scene(li, seed, kind, n, secs) {
  g.boons = []; g.artifact = null; g.beasts = {}; g.henHearts = 0; g.tripAt = -1; g.darkAt = -1;
  g.startLevel(li, seed, false, false);
  for (let i = 0; i < 2000 && g.state !== 'play'; i++) g.update(1 / 60);
  const rooms = g.level.rooms.filter((r) => ['canon', 'mix'].includes(r.role) && r.w >= 9 && r.h >= 8);
  const r = rooms[seed % rooms.length]; if (!r) return null; const c = middle(r); if (!c) return null;
  const G = g.goat; G.x = c.x; G.y = c.y; G.vx = 0; G.vy = 0; g.cam.x = c.x; g.cam.y = c.y;
  g.enemies.length = 0; g.souls.length = 0;
  g.props = g.props.filter((p) => !['coop', 'goose', 'tortoise', 'crow', 'chicken'].includes(p.kind));
  g.readMoveInput = function () { this.input.mx = 0; this.input.my = 0; };
  for (let i = 0; i < 12; i++) g.update(1 / 60);
  const hp0 = G.hp; let first = null, death = null;
  for (let i = 0; i < n; i++) {
    const e = g.spawnEnemy(kind === 'champion' ? 'bearer' : kind);
    if (e && kind === 'champion') { e.elite = true; e.champion = true; e.hp = TUNING.champion.hp; e.maxHp = e.hp; }
  }
  let t = 0; const R = Math.min(r.w, r.h) * 0.3 * TILE;
  for (let s = 0; s < secs * 60; s++) {
    t += 1 / 60;
    if (MODE === 'circle') { const tx = c.x + Math.cos(t * 0.9) * R, ty = c.y + Math.sin(t * 0.9) * R, dx = tx - G.x, dy = ty - G.y, l = Math.hypot(dx, dy) || 1; g.readMoveInput = function () { this.input.mx = l > 4 ? dx / l : 0; this.input.my = l > 4 ? dy / l : 0; }; }
    g.update(1 / 60);
    if (first === null && G.hp < hp0) first = t;
    if (G.hp <= 0 || G.dead || g.state === 'dead') { death = t; break; }
  }
  return { first, death, lost: hp0 - Math.max(0, G.hp), hp0 };
}
const kinds = ['bearer', 'dog', 'hunter', 'wraith', 'seer', 'champion', 'butcher'];
const rows = [];
for (const kind of kinds) for (const n of [1, 3]) {
  if (n > 1 && (kind === 'seer' || kind === 'champion' || kind === 'butcher')) continue;
  let firsts = [], deaths = 0, dT = [], lost = 0, runs = 0, hp0 = 0, expo = 0;
  for (let s = 1; s <= SEEDS; s++) {
    const res = scene(3, s * 7919, kind, n, 30); if (!res) continue;
    runs++; hp0 = res.hp0; expo += res.death !== null ? res.death : 30; lost += res.lost; if (res.first !== null) firsts.push(res.first); if (res.death !== null) { deaths++; dT.push(res.death); }
  }
  const med = (a) => a.length ? +a.sort((x, y) => x - y)[Math.floor(a.length / 2)].toFixed(1) : '-';
  rows.push({ kind, n, THREAT: THREAT[kind], runs, hearts: hp0, medFirstHeartS: med(firsts), killedIn30s: `${deaths}/${runs}`, medDeathS: med(dT),
    heartsPerMin: +(lost / expo * 60).toFixed(1) });
}
console.log(EASYMODE ? 'EASY MODE' : 'normal', `level ROAD, ${SEEDS} seeds, goat ${MODE}`);
console.table(rows);
