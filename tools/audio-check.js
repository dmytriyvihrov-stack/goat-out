// Room score regression checks, without a browser: node tools/audio-check.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ctx = vm.createContext({ console, window: { addEventListener() {} } });
for (const file of ['tuning', 'rng', 'rules', 'audio', 'game']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file + '.js'), 'utf8'), ctx);
}
const { GameAudio, Game, roomMusicScene, roomMusicHit, TILE, SETTINGS, emptyMusicScene } = vm.runInContext(
  '({ GameAudio, Game, roomMusicScene, roomMusicHit, TILE, SETTINGS, emptyMusicScene })', ctx);
const plain = (x) => JSON.parse(JSON.stringify(x));
const empty = plain(emptyMusicScene());
const enemy = (kind, extra = {}) => ({ kind, x: 5 * TILE, y: 5 * TILE, aware: false, state: 'idle', ...extra });
function scene() {
  return { state: 'play', levelIndex: 0, dev: {}, goat: { x: 5 * TILE, y: 5 * TILE },
    level: { rooms: [{ index: 0, x: 0, y: 0, w: 10, h: 10 }, { index: 1, x: 10, y: 0, w: 10, h: 10 }] },
    enemies: [], props: [], world: { W: 20, H: 10, fire: new Float32Array(200) }, sees: () => true };
}
let g = scene();
assert.deepEqual(plain(roomMusicScene(g)), empty);
g.enemies = [enemy('bearer'), enemy('dog'), enemy('bearer', { champion: true }), enemy('butcher'),
  enemy('hunter'), enemy('seer', { elite: true }), enemy('wraith', { ghosted: true }), enemy('bearer', { dead: true })];
assert.deepEqual(plain(roomMusicScene(g)), { ...empty, small: 2, ranged: 2, large: 2, mystical: 1 });
for (let n = 0; n <= 12; n++) {
  g.enemies = ['bearer', 'hunter', 'butcher', 'wraith'].flatMap((kind) => Array.from({ length: n }, () => enemy(kind)));
  for (const key of ['small', 'ranged', 'large', 'mystical']) assert.equal(roomMusicScene(g)[key], Math.min(n, 6));
}
g = scene(); g.enemies = [enemy('bearer', { x: 11 * TILE, room: 0 })];
assert.equal(roomMusicScene(g).small, 0, 'spawn-room cannot leak the next room into the score');
Object.assign(g.enemies[0], { aware: true, state: 'chase' });
assert.equal(roomMusicScene(g).small, 1, 'a nearby visible pursuer stays in the score');
assert.equal(roomMusicScene(g).combat, true);
g.sees = () => false;
assert.equal(roomMusicScene(g).small, 0, 'unseen adjacent enemies do not fill the room score');
g.enemies[0].x = 5 * TILE;
assert.equal(roomMusicScene(g).small, 1, 'the current room counts behind furniture too');
g.enemies = [enemy('wraith', { aware: true, state: 'drift', ghosted: true })];
assert.equal(roomMusicScene(g).combat, true, 'ghost phase must not toggle combat off');
for (const kind of ['brazier', 'lamp']) {
  g = scene(); g.props = [{ kind, x: 9 * TILE, y: 5 * TILE }];
  assert.equal(roomMusicScene(g).fire, true);
  g.props[0].x += 0.01; assert.equal(roomMusicScene(g).fire, false);
  g.props[0].x -= 0.01; g.props[0].broken = true; assert.equal(roomMusicScene(g).fire, false);
}
g = scene(); g.world.fire[5 * 20 + 9] = 2;
assert.equal(roomMusicScene(g).fire, true, 'a tile edge exactly four tiles away counts');
g.goat.x -= 0.01; assert.equal(roomMusicScene(g).fire, false);
g = scene(); g.world.fire[5 * 20] = 2;
assert.equal(roomMusicScene(g).fire, true, 'the left tile edge has the same inclusive radius');
g.goat.x += 0.01; assert.equal(roomMusicScene(g).fire, false);
g = scene(); g.world.fire[5] = 2;
assert.equal(roomMusicScene(g).fire, true, 'the upper tile edge has the same inclusive radius');
g.goat.y += 0.01; assert.equal(roomMusicScene(g).fire, false);
g = scene(); g.world.fire[9 * 20 + 9] = 2;
assert.equal(roomMusicScene(g).fire, false, 'diagonal outside the circle must not count');
g = scene(); g.enemies = [enemy('bearer', { burning: 1 })];
assert.equal(roomMusicScene(g).fire, true);
g.enemies[0].dead = true; assert.equal(roomMusicScene(g).fire, false);
g.goat.onFire = true; assert.equal(roomMusicScene(g).fire, true);
for (const state of ['title', 'intro', 'dead', 'climb', 'boon', 'clear', 'card', 'win']) {
  g.state = state; assert.deepEqual(plain(roomMusicScene(g)), empty, state);
}
g.state = 'play'; g.goat.dead = true; assert.deepEqual(plain(roomMusicScene(g)), empty);
g.goat.dead = false; g.dev.rules = true; assert.deepEqual(plain(roomMusicScene(g)), empty);

// Every added voice adds distinct hits. Even 24 enemies never trigger two family voices
// together; the fire and bed are deliberately the only allowed overlaps.
const occupied = new Set();
for (const key of ['small', 'ranged', 'large', 'mystical']) {
  for (let voice = 0; voice < 6; voice++) {
    let hits = 0;
    for (let step = 0; step < 256; step++) {
      if (!roomMusicHit(key, voice, step)) continue;
      assert(!occupied.has(step), 'enemy layers must interlock'); occupied.add(step); hits++;
      assert.equal(roomMusicHit(key, voice, step + 256), true, 'phrase loops exactly');
    }
    assert.equal(hits, 8, 'each enemy contributes throughout the 16-bar phrase');
  }
}

const a = new GameAudio(), notes = [];
a.tone = (...args) => notes.push(args); a.noise = () => {};
a.scene = { ...empty, small: 6, ranged: 6, large: 6, mystical: 6, fire: true, combat: true };
for (let s = 0; s < 32; s++) { a.playBed = () => {}; a.playStep(s, s / 8, 0.125); }
assert(a.combatMix > 0.99);
a.scene = { ...empty };
for (let s = 32; s < 64; s++) a.playStep(s, s / 8, 0.125);
assert(a.combatMix < 0.001 && a.fireMix < 0.001);
for (const voices of Object.values(a.voices)) assert(voices.every((v) => v < 0.001));
assert(notes.every((n) => Number.isFinite(n[0]) && Number.isFinite(n[3].gain)));
a.muted = true; const before = notes.length; a.playStep(0, 0, 0.125); assert.equal(notes.length, before);

// Returning to a throttled background tab must not queue its entire missed soundtrack.
let scheduled = 0; a.muted = false; a.playStep = () => scheduled++;
a.ctx = { currentTime: 300, state: 'running' }; a.nextTime = 0; a.schedule();
assert(scheduled <= 2 && a.nextTime >= 300);
a.ctx.state = 'suspended'; const count = scheduled; a.schedule(); assert.equal(scheduled, count);

let selected = -1;
a.playStep = GameAudio.prototype.playStep; a.setLayered(false);
a.playLegacyStep = (s) => { selected = s; }; a.playStep(130, 0, 0.125); assert.equal(selected, 2);
let saves = 0;
const settingsGame = { settings: { layeredMusic: true }, audio: { setLayered: (v) => { selected = v; }, sfxSwing() {} }, saveSettings: () => saves++ };
Game.prototype.toggleSetting.call(settingsGame, 'layeredMusic'); assert.equal(selected, false); assert.equal(saves, 1);
assert(SETTINGS.some((s) => s.key === 'layeredMusic'));
assert.equal(Game.prototype.loadSettings.call({}).layeredMusic, true, 'new and old saves default to layered music');

// The level numbers in the menu are one-based: 1-4 use the original bed, 5+ the new one.
g = scene();
for (let index = 0; index < 7; index++) {
  g.levelIndex = index; assert.equal(roomMusicScene(g).late, index >= 4);
}
g.state = 'dead'; assert.equal(roomMusicScene(g).late, true, 'death must not change the level harmony');
g.state = 'title'; assert.equal(roomMusicScene(g).late, false);

g = scene(); g.props = [{ kind: 'brazier', x: g.goat.x, y: g.goat.y }];
assert.equal(roomMusicScene(g).blaze, 0, 'standing coals have one tick, no blaze');
for (const [tiles, expected] of [[1, 1], [3, 1], [4, 2], [9, 2], [10, 3], [15, 3]]) {
  g.world.fire.fill(0);
  for (let i = 0; i < tiles; i++) g.world.fire[(4 + Math.floor(i / 5)) * 20 + 3 + i % 5] = 2;
  assert.equal(roomMusicScene(g).blaze, expected, 'burning area must change crackle density even beside a brazier');
}
g = scene(); g.props = [{ kind: 'heal', x: 9 * TILE, y: 5 * TILE }];
assert.equal(roomMusicScene(g).grass, 1);
g.props[0].x += 0.01; assert.equal(roomMusicScene(g).grass, 0);
g.props[0].x -= 0.01; g.props[0].broken = true; assert.equal(roomMusicScene(g).grass, 0, 'eaten grass stops contributing');
g.props = Array.from({ length: 10 }, () => ({ kind: 'heal', x: 5 * TILE, y: 5 * TILE }));
assert.equal(roomMusicScene(g).grass, 3);

// Actual emitted events, not just the pattern helper: every 1..6 count must add audible hits.
function recorder() {
  const audio = new GameAudio(), events = [];
  for (const name of ['tone', 'noise', 'pad', 'bass', 'lead', 'kick', 'tomHi']) audio[name] = (...args) => events.push([name, ...args]);
  return { audio, events };
}
for (const family of ['small', 'ranged', 'large', 'mystical']) {
  let previous = new Set();
  for (let count = 1; count <= 6; count++) {
    const { audio, events } = recorder(); audio.layerBus = 'layers';
    audio.scene = { ...empty, [family]: count, combat: true };
    for (let s = 0; s < 256; s++) audio.playStep(s, s * 0.125, 0.125);
    const hits = events.filter((e) => e[0] === 'tone' && e[4].bus === 'layers');
    assert.equal(hits.length, count * (family === 'large' ? 16 : 8), family + ' count ' + count);
    const times = new Set(hits.map((e) => e[2]));
    assert.equal(times.size, hits.length, 'no two voices of one family mask each other');
    for (const time of previous) assert(times.has(time), 'additional enemies preserve previous voices');
    previous = times;
  }
}
const beds = [];
for (const late of [false, true]) for (const combat of [false, true]) {
  const { audio, events } = recorder(); audio.scene = { ...empty, late, combat }; audio.combatMix = combat ? 1 : 0;
  for (let s = 0; s < 64; s++) audio.playStep(s, s * 0.125, 0.125);
  assert.equal(events.find((e) => e[0] === 'bass')[2], late ? 49 : 55);
  beds.push(JSON.stringify(events.filter((e) => e[0] === 'lead')));
}
assert.equal(new Set(beds).size, 4, 'both level groups have distinct idle and combat arrangements');

const ambient = recorder();
g = scene(); g.world.fire[105] = 1; g.props = [{ kind: 'heal', x: g.goat.x, y: g.goat.y }];
ambient.audio.updateScene(g, 0.1);
g.world.fire.fill(0); g.props[0].broken = true;
ambient.audio.updateScene(g, 0.1);
assert.equal(ambient.audio.scene.blaze, 0);
ambient.audio.playStep(0, 0, 0.125);
assert.equal(ambient.audio.ambience.blaze.value, 1, 'a flare between beats must be remembered');
for (let s = 1; s <= 16; s++) ambient.audio.playStep(s, s * 0.125, 0.125);
assert.equal(ambient.audio.ambience.blaze.value, 1, 'crackles persist beyond one bar');
for (let s = 17; s <= 48; s++) ambient.audio.playStep(s, s * 0.125, 0.125);
assert.equal(ambient.audio.ambience.blaze.value, 0, 'blaze memory expires after two bars');
assert(ambient.audio.blazeMix < 0.01 && ambient.audio.grassMix < 0.001);
assert(ambient.events.some((e) => e[0] === 'noise' && e[1] >= 2), 'the tail must actually play after one bar');
g.world.fire[105] = 1; ambient.audio.updateScene(g, 0.1); ambient.audio.playStep(0, 8, 0.125);
g.state = 'dead'; ambient.audio.updateScene(g, 0.1);
assert.equal(ambient.audio.ambience.blaze.value, 0, 'death clears remembered fire immediately');
assert.equal(ambient.audio.ambience.blaze.pending, 0);
const mutedTail = recorder(); mutedTail.audio.scene = { ...empty, blaze: 3, fire: true };
mutedTail.audio.playStep(0, 0, 0.125);
mutedTail.audio.muted = true; mutedTail.audio.scene = { ...empty };
const audible = mutedTail.events.length;
for (let s = 1; s < 80; s++) mutedTail.audio.playStep(s, s * 0.125, 0.125);
assert.equal(mutedTail.events.length, audible);
assert.equal(mutedTail.audio.ambience.blaze.value, 0, 'muting must not pause the ambient tail');
console.log('Audio checks passed: categories/caps, audible 1-6 counts, heavy pairs, early/late idle/combat beds, fire area and two-bar tails, grass, state resets, mute, scheduler and legacy switch.');
