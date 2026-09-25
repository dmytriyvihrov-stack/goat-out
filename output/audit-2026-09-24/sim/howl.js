// THE FULL THROAT, pressed the moment it is ready, by a goat who does nothing else. Does a stack of
// cooldown cuts (RAW THROAT, geese walked to the stairs) turn it into a lock nobody gets out of?
const { load } = require('./load.js');
const root = process.argv[2], SEEDS = +(process.argv[3] || 8);
const L = load(root, { quiet: true, seed: 31337 });
L.run(`window.game = new Game(document.getElementById('game'));`);
const g = L.grab('game'), TUNING = L.grab('TUNING'), BOONS = L.grab('BOONS'), TILE = L.grab('TILE');
g.frame = function () {};
const B = (id) => BOONS.find((b) => b.id === id);
function middle(r) {
  const w = g.world, cx = r.x + r.w / 2, cy = r.y + r.h / 2; let best = null, bd = 1e9;
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    let ok = !w.isPitPx((x + 0.5) * TILE, (y + 0.5) * TILE);
    for (let oy = -1; oy <= 1 && ok; oy++) for (let ox = -1; ox <= 1; ox++) if (w.isSolid(x + ox, y + oy)) ok = false;
    if (!ok) continue; const d = (x - cx) ** 2 + (y - cy) ** 2; if (d < bd) { bd = d; best = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE }; }
  }
  return best;
}
function scene(seed, boons, geese, kind, n, secs) {
  g.tripAt = -1; g.darkAt = -1; g.artifact = null; g.henHearts = 0;
  g.startLevel(3, seed, false, false);
  g.boons = boons.map(B); g.beasts = geese ? { goose: geese } : {}; g.applyBoons(); g.goat.hp = g.goat.maxHp;
  for (let i = 0; i < 2000 && g.state !== 'play'; i++) g.update(1 / 60);
  const rooms = g.level.rooms.filter((r) => ['canon', 'mix'].includes(r.role) && r.w >= 9 && r.h >= 8);
  const r = rooms[seed % rooms.length]; if (!r) return null; const c = middle(r); if (!c) return null;
  const G = g.goat; G.x = c.x; G.y = c.y; G.vx = 0; G.vy = 0;
  g.enemies.length = 0; g.souls.length = 0;
  g.props = g.props.filter((p) => !['coop', 'goose', 'tortoise', 'crow', 'chicken'].includes(p.kind));
  g.readMoveInput = function () { this.input.mx = 0; this.input.my = 0; this.input.spacePressed = G.screamCd <= 0; };
  for (let i = 0; i < 12; i++) g.update(1 / 60);
  const hp0 = G.hp; let screams = 0, lastCd = G.screamCd, dazedFrames = 0, frames = 0, death = null;
  for (let i = 0; i < n; i++) g.spawnEnemy(kind);
  for (let s = 0; s < secs * 60; s++) {
    g.update(1 / 60);
    if (G.screamCd > lastCd + 0.01) screams++; lastCd = G.screamCd;
    const live = g.enemies.filter((e) => !e.dead);
    if (live.length) { frames++; if (live.every((e) => e.dazed > 0)) dazedFrames++; }
    if (G.hp <= 0 || g.state === 'dead') { death = s / 60; break; }
  }
  return { lost: hp0 - Math.max(0, G.hp), screams, allDazed: frames ? dazedFrames / frames : 0, death, cd: g.mods.screamCooldown, rad: g.mods.screamRadius };
}
const combos = [[[], 0, 'no voice, idle'], [['howl'], 0, 'FULL THROAT'], [['howl', 'throat'], 0, '+ RAW THROAT'], [['howl', 'throat'], 2, '+ 2 geese'], [['howl', 'throat'], 4, '+ 4 geese']];
const rows = [];
for (const kind of ['bearer', 'dog']) for (const [boons, geese, label] of combos) {
  let lost = 0, runs = 0, dz = 0, deaths = 0, sc = 0, cd = 0, rad = 0;
  for (let s = 1; s <= SEEDS; s++) { const x = scene(s * 7919, boons, geese, kind, 3, 30); if (!x) continue; runs++; lost += x.lost; dz += x.allDazed; sc += x.screams; cd = x.cd; rad = x.rad; if (x.death !== null) deaths++; }
  rows.push({ vs: '3 ' + kind, build: label, cooldownS: +cd.toFixed(2), radiusTiles: +rad.toFixed(1), runs, heartsLostIn30s: +(lost / runs).toFixed(2), deaths: `${deaths}/${runs}`, shareAllDazed: +(dz / runs).toFixed(2), screams: +(sc / runs).toFixed(1) });
}
console.log(`scream stun ${TUNING.goat.scream.stun}s, hound dazeMul ${TUNING.dog.dazeMul}, level ROAD, ${SEEDS} seeds, 30 s, goat stands and screams when ready`);
console.table(rows);
