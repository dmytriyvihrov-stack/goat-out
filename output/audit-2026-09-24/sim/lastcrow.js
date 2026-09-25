// The last floor's escorts: bring the crow (and the tortoise) to the stairs of THE OSSUARY with the
// real Beast.saved / beginClimb / levelCleared / nextCard, and see what the cards promise and what is paid.
const { load } = require('./load.js');
const L = load(process.argv[2], { quiet: true, seed: 5 });
L.run(`window.game = new Game(document.getElementById('game'));`);
const g = L.grab('game'), LEVELS = L.grab('LEVELS'), TILE = L.grab('TILE'), Prop = L.grab('Prop');
g.frame = function () {};
const li = LEVELS.length - 1;
console.log('last level', LEVELS[li].name, 'beasts', JSON.stringify(LEVELS[li].beasts));
for (const kind of ['crow', 'tortoise']) {
  g.tripAt = -1; g.darkAt = -1; g.boons = []; g.beasts = {}; g.crowGift = false; g.henHearts = 0;
  g.startLevel(li, 4242, true, false);
  for (let i = 0; i < 2000 && g.state !== 'play'; i++) g.update(1 / 60);
  // Stand the goat on the stairs and put a freed animal of this kind at his side.
  const ex = g.level.exit || g.level.stairs || g.level.end;
  if (ex) { g.goat.x = ex.x; g.goat.y = ex.y; }
  const b = new Prop(g.goat.x + TILE, g.goat.y, kind, {}); g.props.push(b);
  g.beginClimb();
  const savedList = JSON.stringify(g.beastSaved), shieldUses = g.mods.shieldUses;
  g.levelCleared();
  const cards = g.cardQueue.map((c) => (c.lines || []).join(' / ')).filter(Boolean);
  let guard = 0; while (g.state !== 'win' && guard++ < 20) g.nextCard();
  console.log(kind, '| saved', savedList, '| cards:', JSON.stringify(cards.filter((c) => /CAME WITH YOU/.test(c))), '| state after cards', g.state, '| crowGift left unpaid', g.crowGift, '| shieldUses', shieldUses);
}
