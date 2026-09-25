// Drive the real Game.prototype.nextCard / Beast.placeGift with a stub game: what does a crow saved
// on each floor pay? The stub stands in for the canvas game; the functions are the build's own.
const { load } = require('./load.js');
const vm = require('vm');
const L = load(['js/shop.js', 'js/talismans.js', 'js/beasts.js', 'js/game.js']);
if (L.failed.length) console.log('failed', L.failed);
const g = L.grab, Game = g('Game'), LEVELS = g('LEVELS'), BEAST_CARD = g('BEAST_CARD');
for (let li = 0; li < LEVELS.length; li++) {
  const calls = [];
  const stub = { cardQueue: [], climbDark: false, levelIndex: li, crowGift: true, beasts: { crow: 1 },
    startLevel: (i) => calls.push('startLevel ' + i), levelSeed: () => 1, clearRun() {}, noteRunBest: () => false,
    runCode: () => 'code', best: { run: 0 }, totalScore: 0, totalKills: 0, deaths: 0, tapWord: 'CLICK',
    audio: { sfxCard() {} } };
  Game.prototype.nextCard.call(stub);
  // startLevel is where Beast.placeGift(this) runs (game.js); no startLevel, no gift.
  console.log(`${LEVELS[li].name.padEnd(20)} crow saved -> ${calls.length ? calls.join(',') + ' (placeGift runs there)' : 'state ' + stub.state + ', crowGift still ' + stub.crowGift + ' — the gift is never placed'}`);
}
console.log('card the player reads:', BEAST_CARD.crow.join(' / '));
console.log('tortoise card:', BEAST_CARD.tortoise.join(' / '));
// the fire test: the same stub on a floor with a next one must reach startLevel
