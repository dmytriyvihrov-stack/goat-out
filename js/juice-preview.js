// THE JUICE PREVIEW: a JUICE row (js/juice.js) played, looping, in a small room of its own on the
// JUICE tab, so the look can be seen and not only read about ("in JUICE I also need an option to
// actually SEE how it looks in the game"). Everything in it is the game's own code: a real `World`,
// `Goat`, `Enemy`s and `Prop`s, stepped by the real `Game.update` and drawn by a real `Renderer`,
// and each effect is set off through the call the game itself makes (a headbutt pressed, a man
// flung into stone, `goat.damage`, `Prop.explode`, `Prop.cutRope`...).
//
// Isolation. The run under the tab is never touched. The staged game is `Object.create(game)`: every
// method and every read falls through to the real game, but every write lands on the stage. Before
// anything runs, each array the real game holds is replaced on the stage with an empty one, each
// plain object with a copy, each Set / Map with its own, and everything a step reaches for, level,
// world, goat, cast, props, fx, scatter, camera, input, the dev drawer, the souls' `mods`, is built
// fresh. What would write to this browser (the save, BEST, heaven's sacrifices, the pen) is stubbed
// out on the stage, and the sound goes to a stand-in that swallows it unless SOUND is switched on.
// It is drawn by a second `Renderer` on its own offscreen canvas, so no cache of the real one moves.
// The real game is held still the whole time anyway: the tool page sets `dev.rules`, and
// `Game.update` returns at its top while it does. The one global it borrows is `TUNING`, and only
// for EFFECT OFF: the dial is turned down around the preview's own step and draw and put back in a
// `finally` before the call returns.
//
// A row that cannot be staged honestly says so (`JUICE_NOPLAY`): a camera that follows him across a
// whole floor, a sound, a screen of heaven's own. A row staged by setting one thing by hand that the
// game would reach another way is marked APPROXIMATE, with what was set.

// The room: fifteen tiles by ten, walls round thirteen by eight of floor (tile units 1..14 × 1..9).
// Layout for a dev page, not a gameplay number.
const JUICE_STAGE = { W: 15, H: 10 };

// Which staged scene plays each row. `off` is what EFFECT OFF turns down: `tune` TUNING paths set
// for the length of the preview's own step and draw, `game` the stage's methods replaced (a noop
// unless a function is given), `draw` the preview renderer's methods replaced by a noop.
const JUICE_PLAY = {
  'Hitstop': { scene: 'buttKill', off: { tune: { 'juice.stop': 0 } }, tip: 'the frame holds on the contact, try ¼×' },
  'Screen shake': { scene: 'hurt', off: { tune: { 'juice.shakeHit': 0 } } },
  'Directional kick': { scene: 'buttKill', off: { tune: { 'juice.kick': 0 } }, tip: 'a kill keeps juice.kickOther of it: a small shove' },
  'Zoom punch': { scene: 'buttKill', off: { tune: { 'juice.zoomKick': 0 } } },
  'Shake off noise, not dice': { scene: 'hurt', off: { tune: { 'juice.shakeHit': 0 } } },
  'World thud': { scene: 'bomb', off: { tune: { 'juice.shakeThud': 0 } } },
  'Shake setting': { scene: 'hurt', approx: 'the hurt shake at this browser\'s SCREEN SHAKE setting; OFF is the slider at nothing', off: { game: { shakeMul: () => 0 } } },
  'Slow motion on a kill': { scene: 'combo', off: { tune: { 'juice.comboSlow': 0, 'juice.killSlow': 0 } }, tip: 'the third kill of the streak slows time' },
  'Aiming slow motion (COLD EYE)': { scene: 'coldeye', off: { game: { coldEye: null } } },
  'Caught on the teeth': { scene: 'impale' },
  'The vault (LEAPFROG)': { scene: 'leapfrog' },
  // Measured here (30 Sep 2026): a kill's flash, 0.11 × juice.screen, is under what one step's
  // decay takes off (flashDecay × 1/60 = 0.1), and it is set and spent inside the same step, so it
  // never reaches a drawn frame. The hurt flash (0.16) is the same. The preview shows what the game does.
  'Screen flash': { scene: 'buttKill', off: { game: { flash: null } }, tip: 'at juice.screen 0.6 a kill\'s flash is spent inside the step that sets it: it never reaches a drawn frame (nor does the hurt one)' },
  'Hurt direction arc': { scene: 'hurt', off: { draw: ['drawHurt'] } },
  'Hurt vignette': { scene: 'hurt', off: { draw: ['drawHurtVignette'] } },
  'Last-heart heartbeat': { scene: 'heartbeat', off: { draw: ['drawHeartbeat'] } },
  'Hit flash (white)': { scene: 'buttKnock', off: { tune: { 'juice.hitFlash': 0 } }, tip: 'a few frames, try ¼×' },
  'Windup tint': { scene: 'club', off: { tune: { 'juice.windupTint.max': 0 } } },
  'Squash & stretch (poses)': { scene: 'buttKnock', tip: 'crouch, stretch, try ¼×' },
  'Squash spring': { scene: 'buttKnock', off: { game: { squashGoat: null } } },
  'Knockback': { scene: 'buttKnock' },
  'Knocked down, and up again': { scene: 'buttKnock', off: { tune: { 'enemyAnim.down.time': 0.0001, 'enemyAnim.down.up': 0.0001, 'enemyAnim.down.over': 0.7 } } },
  'A body in flight': { scene: 'buttKnock', off: { tune: { 'enemyAnim.flung.stretch': 0, 'enemyAnim.flung.hit': 0 } } },
  'The windup pop': { scene: 'club', off: { tune: { 'juice.windupTint.pop': 0 } } },
  'The poison pool': { scene: 'poison' },
  'Poisoned': { scene: 'poison', off: { tune: { 'status.look.tint': 0, 'status.look.goatTint': 0 } } },
  'The horns wave': { scene: 'buttKnock', tip: 'the dev drawer HORNS row steps the SHORT, BIG and LONG' },
  'Player recoil': { scene: 'hurt' },
  'Motion smear': { scene: 'runFast', off: { tune: { 'goat.trail.fastAt': 99, 'goat.trail.at': 99 } } },
  'Invulnerability blink': { scene: 'hurt' },
  'Dazed stars': { scene: 'daze' },
  'The shock mark': { scene: 'shock' },
  'The goat knocked over': { scene: 'board', approx: 'the shieldman\'s spikes are what stun him here', tip: 'a hook, a shove and the pen do the same' },
  'The big winds coil too': { scene: 'ogreSlam', tip: 'the butcher\'s hook winds up the same way' },
  'Rocked back': { scene: 'ogreSlam', approx: 'the ogre is staggered by hand, as a blast or a crate would', off: { tune: { 'enemyAnim.rocked.back': 0, 'enemyAnim.rocked.tilt': 0 } } },
  'Impact ring + sparks': { scene: 'buttKnock', off: { game: { impact: null } } },
  'Kill shockwave': { scene: 'buttKill', off: { tune: { 'juice.impact.killLife': 0.0001 } } },
  'Hoof dust': { scene: 'buttKnock', off: { game: { dust: null } } },
  'Muzzle flash': { scene: 'hunter', off: { tune: { 'juice.muzzle.life': 0.0001 } } },
  'Aim telegraph': { scene: 'hunter' },
  'Particles': { scene: 'buttKill', off: { game: { particles: null } } },
  'Gore and debris': { scene: 'charge' },
  'Permanence (blood, bodies)': { scene: 'permanence' },
  'A body that settles': { scene: 'buttKill' },
  'Pixel fire': { scene: 'fire' },
  'Pixel blast': { scene: 'bomb' },
  'Soot column': { scene: 'bomb' },
  'A barrel that rolls': { scene: 'barrel' },
  'Floating words': { scene: 'words', off: { game: { floatText: null } } },
  'Combo counter': { scene: 'combo' },
  'Barks': { scene: 'barks' },
  'Shell casings': { scene: 'hunter' },
  'Anticipation on the goat': { scene: 'buttKnock', tip: 'a pull-back over the windup, try ¼×' },
  'Idle life': { scene: 'idle' },
  'Weight in the stride': { scene: 'run' },
  'Kick-off, settle and skid': { scene: 'run' },
  'A blow that does nothing': { scene: 'ratogre' },
  'The blink': { scene: 'blink' },
  'The boomerang': { scene: 'boomerang' },
  'The ruin (CAPE OF RUIN)': { scene: 'ruin' },
  'The tuft (SHEPHERD\'S MANTLE)': { scene: 'sprout' },
  'Hound run line': { scene: 'hound' },
  'Ogre slam ring': { scene: 'ogreSlam' },
  'Talisman: parry': { scene: 'parry' },
  'Talisman: echo': { scene: 'echo' },
  'Last-heart blood trail': { scene: 'runBleed' },
  'Blood in the wool': { scene: 'wool' },
  'Ogre landing ring': { scene: 'ogreLeap' },
  'Hay about to catch': { scene: 'hay' },
  'Burning grass': { scene: 'grass' },
  'The trip wash': { scene: 'trip' },
  'Eating the mushrooms': { scene: 'shrooms' },
  'The supper scatters': { scene: 'table' },
  'Tumble and wake': { scene: 'tumble' },
  'Chandelier comes down': { scene: 'chandelier' },
  'Table goes over': { scene: 'table' },
  'A table from heaven': { scene: 'skyTable' },
  'A blast goes through the room': { scene: 'blastRoom' },
  'The board takes it': { scene: 'board' },
};

// Why a row has no preview. Anything not listed falls back on its category or status.
const JUICE_NOPLAY = {
  'A blow as a body': 'SPAWN a BEARER in the dev drawer and stand by him',
  'The swing seen': 'SPAWN a BEARER in the dev drawer and stand by him',
  'Rifle recoil': 'SPAWN a HUNTER in the dev drawer',
  'The horns land': 'any headbutt on a man: SPAWN a BEARER in the dev drawer and butt him',
  'A heart taken, on him': 'any blow taken with GOD off',
  'A heart breaks': 'any blow taken with GOD off: the heart row, top left',
  'Souls poured in': "heaven: the dev drawer's HEAVEN, then hold GRAB at the broken mirror, the overlook or the horse's stand",
  'An escort dies': 'SPAWN a PIG (or any animal) and let a man club it, or walk two rooms on without it',
  'White souls': 'a run past the god’s gift: kill a man and walk out of his room',
  'The soul goes up': 'the goat dying on a floor, die on any floor',
  'Second chance': 'SECOND CHANCE bought in the mirror (dev drawer HEAVEN) and a death on a floor',
  'Helldive': 'HELLDIVE R1 or R2 in the dev drawer HEAVEN, +1 LIFE, and a death on a floor with men near',
  'Armour flies apart': 'a suit of armour hangs on a far wall, THE SHOWROOM has one: throw a man at it',
  'Blades and shields fall apart': 'a sword off a stand thrown at a wall, THE SHOWROOM has the stand',
  'A blade stays in him': 'a sword thrown at a man with a heart to spare: spawn a butcher from the dev drawer',
  'Hung on the antlers': 'a stag’s head hangs on a far wall, THE SHOWROOM has one: throw a man at it',
  'Butcher hook line': 'a butcher a few tiles off with a clear line to the goat, play THE ALTAR or spawn one from the dev drawer',
  'Camera lead': 'a camera following him across a floor, play a floor',
  'Deadzone camera': 'a camera following him across a floor, play a floor',
  'Frame the fight': 'a boss in a room too big for the screen, play a floor',
  'Leash at speed': 'a camera following him across a floor, play a floor',
  'Room change damping': 'walking from room to room, play a floor',
  'Rumble': 'a phone buzzing: nothing to see',
  'Fire that grows on him': 'the goat standing in flame, walk into a burning tile on THE YARD, or a lit bowl in THE SHOWROOM',
  'Input buffer': 'nothing visible: a press remembered',
  'Door-hit forgiveness': 'a reach, not a look',
  'The rat ogre comes out': 'needs the mouse\'s wall and her shop',
  'Taking from the mouse': 'needs the mouse\'s shop',
  'The veil': 'needs rooms behind him to close',
  'Soul fanfare': 'the soul\'s card screen',
  'Soul into the goat': 'the soul\'s card screen',
  'Death-map skulls': 'the death screen',
  'Rising into the pasture': 'heaven\'s own screen',
  'The god speaks': 'heaven\'s own screen',
  'The god’s light': 'heaven\'s own screen',
  'Off the edge': 'heaven\'s own screen',
};

// The staged scenes. `setup(S)` lays the room (called every loop unless `keep`), `at` is what
// happens when, in seconds of the loop, `again(S)` is a `keep` scene's next loop, `period` the
// loop's length. `approx` says what was set by hand rather than reached the game's way.
const JUICE_SCENES = {
  buttKnock: { period: 2.6, what: 'A headbutt on a man in open floor, nothing behind him to die on.',
    setup(S) { S.goatAt(4, 5); S.aimAt(S.man(6.3, 5)); },
    at: [[0.45, (S) => S.butt()]] },
  buttKill: { period: 2.8, what: 'A headbutt into a man with the wall two tiles behind him: the wall kills (pillar 3).',
    setup(S) { S.goatAt(9.3, 5); S.aimAt(S.man(11.4, 5)); },
    at: [[0.45, (S) => S.butt()]] },
  charge: { period: 3.2, what: 'BOMB CHARGE: a headbutt lights a man\'s fuse and the wall behind him sets it off, he comes apart, and the man beside him is thrown.',
    setup(S) { S.boon('bomb'); S.goatAt(9.3, 5); S.aimAt(S.man(11.4, 5)); S.man(12.4, 3.2); },
    at: [[0.45, (S) => S.butt()]] },
  echo: { period: 2.8, what: 'ECHO HORN worn: a headbutt on a man, and the horn lunging again after it.',
    setup(S) { S.wear('echo', 1); S.goatAt(4, 5); S.aimAt(S.man(6.3, 5)); },
    at: [[0.45, (S) => S.butt()]] },
  permanence: { period: 1.4, keep: true, what: 'One room kept loop after loop: a man thrown into its stone every time, and nothing cleaned up.',
    setup(S) { S.goatAt(7.5, 5); JUICE_SCENES.permanence.again(S); },
    again(S) {
      // A spot a few tiles off one of the four walls, flung at that wall hard enough to die on it.
      const side = S.loop % 4, k = 2 + (S.loop * 1.7) % 9;
      const [x, y, vx, vy] = side === 0 ? [k + 1.5, 3.2, 0, -1] : side === 1 ? [11.6, 2 + k * 0.55, 1, 0]
        : side === 2 ? [k + 1.5, 6.8, 0, 1] : [3.4, 2 + k * 0.55, -1, 0];
      const e = S.man(x, y); e.fling(vx * TUNING.goat.headbutt.impulse, vy * TUNING.goat.headbutt.impulse);
    } },
  hurt: { period: 2.6, hud: true, what: 'A clubman\'s blow lands on the goat (`meleeHit`, god mode off, the heart put back every loop).',
    setup(S) { S.game.dev.god = false; S.goatAt(6.2, 5); const e = S.man(7.2, 5); S.aimAt(e); S.hurtBy = e; },
    at: [[0.15, (S) => { S.hurtBy.state = 'windup'; S.hurtBy.timer = 0.05; }],
      [0.5, (S) => { const e = S.hurtBy; e.state = 'swing'; e.timer = e.cfg.swing; S.game.meleeHit(e, e.cfg.reach + 6, Math.PI / 2, e.cfg.damage || 1, e.cfg.knock); }],
      [0.8, (S) => { S.hurtBy.state = 'idle'; }]] },
  heartbeat: { period: 4, hud: true, what: 'The goat down to his last heart, standing.',
    setup(S) { S.goatAt(7.5, 5); S.game.goat.hp = 1; } },
  wool: { period: 4, hud: true, what: 'The goat with two hearts gone: a blot in his fleece for each.',
    setup(S) { S.goatAt(7.5, 5); const g = S.game.goat; g.hp = Math.max(2, g.maxHp - 2); } },
  run: { period: 3, what: 'He runs, turns back against his own run, then lets go.',
    setup(S) { S.goatAt(3, 5); },
    at: [[0.2, (S) => S.move(1, 0)], [1.15, (S) => S.move(-1, 0)], [2.05, (S) => S.move(0, 0)]] },
  runFast: { period: 3, approx: 'his stride raised a third (as SURE HOOVES and a run-up do), so the smear shows',
    what: 'He runs fast, turns back, lets go.',
    setup(S) { S.game.mods.speed *= 1.35; S.goatAt(3, 5); },
    at: [[0.2, (S) => S.move(1, 0)], [1.05, (S) => S.move(-1, 0)], [1.9, (S) => S.move(0, 0)]] },
  runBleed: { period: 3, hud: true, what: 'He runs on his last heart.',
    setup(S) { S.goatAt(3, 5); S.game.goat.hp = 1; },
    at: [[0.2, (S) => S.move(1, 0)], [1.15, (S) => S.move(-1, 0)], [2.05, (S) => S.move(0, 0)]] },
  idle: { period: 3.4, approx: 'the idle clock is started just short of `goat.idle.after`, so a fidget comes every loop',
    what: 'He stands still: breathing, then a fidget.',
    setup(S) { S.goatAt(7.5, 5); S.game.goat.idleT = TUNING.goat.idle.after - 0.3; } },
  combo: { period: 3.2, what: 'Three men die on the stone inside the combo window.',
    setup(S) { S.goatAt(5, 5); S.aimAt({ x: 11 * TILE, y: 5 * TILE }); S.men = [S.man(11.3, 3), S.man(11.8, 5), S.man(11.3, 7)]; },
    at: [0.4, 0.85, 1.3].map((t, i) => [t, (S) => { const e = S.men[i]; e.vx = 9 * TILE; e.die(S.game, 'splat', 1, 0); }]) },
  blastRoom: { period: 4.8, what: 'A bomb goes off by a row of barrels: each goes up a beat after the one before it, the lamp at the end goes over into fire, the crate breaks.',
    setup(S) { S.goatAt(2.5, 7.5); S.bomb = S.prop(4.6, 5, 'bomb'); for (const x of [5.9, 7.5, 9.1]) S.prop(x, 5, 'barrel');
      S.prop(10.6, 4.4, 'lamp'); S.prop(5.6, 6.3, 'crate'); S.man(8.3, 6.2); S.man(10.2, 6.1); },
    at: [[0.5, (S) => S.bomb.explode(S.game)]] },
  board: { period: 3.6, what: 'A headbutt on a shieldman’s board: its spikes throw the goat off seeing stars (a boss’s take a heart) and rock him back. From his side the same blow throws him.',
    setup(S) { S.goatAt(4, 5); S.sm = S.aimAt(S.man(6, 5)); S.sm.giveShield(); },
    at: [[0.45, (S) => S.butt()], [1.7, (S) => S.goatAt(S.sm.x / TILE, S.sm.y / TILE - 1.5)], [1.9, (S) => S.butt()]] },
  shock: { period: 3.2, approx: 'the poison and the stun are put on him by hand, as a puddle and BAAH would',
    what: 'POISON meets STUN on a man: he stands in total shock, one mark over his head for the pair.',
    setup(S) { S.goatAt(5, 5); S.sick = S.man(8, 5); },
    at: [[0.4, (S) => { Status.poison(S.game, S.sick); S.sick.daze(S.game, 4); Status.sting(S.game, S.sick); }]] },
  poison: { period: 4.4, what: 'A puddle laid by hand with a man in it; the goat walks through and stands in it until the ring fills.',
    setup(S) { S.goatAt(3.5, 5); S.sick = S.man(8.6, 5.6); Status.puddle(S.game, 8 * TILE, 5 * TILE, 1); Status.poison(S.game, S.sick); },
    at: [[0.3, (S) => S.move(1, 0)], [1.35, (S) => S.move(0, 0)]] },
  bomb: { period: 3.4, what: 'A bomb goes off between two men.',
    setup(S) { S.goatAt(3.5, 5); S.bomb = S.prop(8, 5, 'bomb'); S.man(7.2, 4.5); S.man(8.9, 5.6); },
    at: [[0.5, (S) => S.bomb.explode(S.game)]] },
  fire: { period: 4.2, what: 'A bowl of coals, a line of burning floor, and a man set alight who blunders about.',
    setup(S) { S.goatAt(3, 6.5); S.prop(3.5, 2.5, 'brazier'); for (const x of [6, 7, 8]) S.burn(x, 5, 5); S.lit = S.man(10.5, 4.5); },
    at: [[0.3, (S) => S.lit.ignite(S.game)]] },
  hay: { period: 5.5, what: 'A stack of straw, lit at one end.',
    tiles(S) { S.fill(5, 3, 11, 7, T.HAY); },
    setup(S) { S.goatAt(2.5, 5); },
    at: [[0.3, (S) => S.game.world.ignite(5, 5)]] },
  grass: { period: 6, what: 'Tall grass, lit at one end.',
    tiles(S) { S.grass(5, 2, 11, 7); },
    setup(S) { S.goatAt(2.5, 5); },
    at: [[0.3, (S) => S.game.world.ignite(5, 5)]] },
  barrel: { period: 4.4, what: 'He butts a barrel down the room at two men, over a burning tile that lights its oil.',
    setup(S) { S.goatAt(2.6, 5); S.aimAt(S.prop(4.1, 5, 'barrel')); S.burn(6, 5, 8); S.man(8.6, 5); S.man(11.2, 4.6); },
    at: [[0.4, (S) => S.butt()]] },
  table: { period: 3.2, what: 'He butts a laid table at the wall: its supper flies and it goes over; butted again it rocks.',
    setup(S) { S.goatAt(8.8, 5); S.aimAt(S.table = S.prop(10.5, 5, 'table', null, { food: true })); },
    at: [[0.4, (S) => S.butt()], [2.1, (S) => { if (S.table.flipped && !S.table.broken) S.table.knockFlipped(S.game, 1, 0); }]] },
  chandelier: { period: 3.2, what: 'The rope is cut at its cleat on the far wall (what a headbutt on the cleat calls): the ring comes down on two men.',
    setup(S) { S.goatAt(4, 6.5); S.ring = S.prop(8.5, 5.5, 'chandelier', { cid: 0 }); S.cleat = S.prop(8.5, 1.25, 'cleat', { cid: 0 }); S.man(8.2, 5.2); S.man(9.2, 6.1); },
    at: [[0.6, (S) => S.cleat.cutRope(S.game)]] },
  skyTable: { period: 3.4, approx: 'one table is owed to this room, as if butted off heaven\'s edge (`game.skyTables`)',
    what: 'A table from heaven finds a man the goat can see and comes down on him.',
    setup(S) { S.goatAt(4, 6); S.man(9.5, 4.8); S.game.skyTables = { n: 1, t: 0.25, drops: [] }; } },
  hunter: { period: 4.6, what: 'A rifle, left to its own head, aims at the goat (in god mode) and fires.',
    setup(S) { S.goatAt(4, 5); S.man(11.5, 5, 'hunter', { live: true }); } },
  club: { period: 3, what: 'A clubman, left to his own head, winds up on the goat (in god mode) and swings.',
    setup(S) { S.goatAt(4.2, 5); S.man(5.6, 5, 'bearer', { live: true }); } },
  hound: { period: 5.5, what: 'A hound, left to its own head, rings the goat (in god mode), plants and runs at him.',
    setup(S) { S.goatAt(6, 5); S.man(10.5, 3.5, 'dog', { live: true }); } },
  ogreSlam: { period: 4.2, what: 'The ogre, left to his own head, close to the goat (in god mode): fists up, down on the floor.',
    setup(S) { S.goatAt(4.4, 5); S.man(6, 5, 'butcher', { live: true }); } },
  ogreLeap: { period: 4.6, what: 'The ogre, left to his own head, five tiles off the goat (in god mode): he leaps.',
    setup(S) { S.goatAt(3.5, 5); S.man(9.5, 5, 'butcher', { live: true }); } },
  impale: { period: 4.6, approx: 'he is put on the tooth by hand (`Enemy.impale`), not landed on it from a leap',
    what: 'The ogre caught on a cave spire.',
    setup(S) { S.goatAt(4, 5); const p = S.prop(8.5, 5.4, 'spire'); S.ogre = S.man(8.5, 5, 'butcher'); S.ogre.hp = 3; S.tooth = p; },
    at: [[0.4, (S) => S.ogre.impale(S.game, S.tooth)]] },
  daze: { period: 3, what: 'A man dazed (`Enemy.daze`, what the pen\'s blow and a stun call).',
    setup(S) { S.goatAt(5, 5); S.dazed = S.man(8, 5); },
    at: [[0.3, (S) => S.dazed.daze(S.game, 2.2)]] },
  words: { period: 2.6, approx: 'the words are set off by hand (`game.floatText`)', what: 'Words stamped over the goat and a door.',
    setup(S) { S.goatAt(6, 5.5); },
    at: [[0.3, (S) => S.game.floatText(S.game.goat.x, S.game.goat.y - 30, 'COALS', PALETTE.fire)],
      [0.9, (S) => S.game.floatText(10 * TILE, 4 * TILE, 'x3', PALETTE.fireHi)]] },
  barks: { period: 3.4, what: 'Two men speak (`game.bark`): one seeing him, one scared.',
    setup(S) { S.goatAt(4, 5.5); S.men = [S.man(9, 4), S.man(10.5, 6.5)]; },
    at: [[0.3, (S) => { S.game.barkCd = 0; S.men[0].barkCd = 0; S.game.bark(S.men[0], 'spot'); }],
      [1.5, (S) => { S.game.barkCd = 0; S.men[1].barkCd = 0; S.game.bark(S.men[1], 'panic'); }]] },
  leapfrog: { period: 2.6, what: 'LEAPFROG: a roll at a man in front turns into a vault over his back.',
    setup(S) { S.boon('leapfrog'); S.goatAt(4, 5); S.aimAt(S.man(6.2, 5)); },
    at: [[0.4, (S) => { S.move(1, 0); S.roll(); }], [0.75, (S) => S.move(0, 0)]] },
  coldeye: { period: 3.8, what: 'COLD EYE: a crate into his mouth slows the world while he aims; the throw ends it.',
    setup(S) { S.boon('coldeye'); S.goatAt(4, 5); S.aimAt(S.prop(5, 5, 'crate')); S.target = S.man(11.5, 5); },
    at: [[0.35, (S) => { S.rmb = true; }], [0.6, (S) => S.aimAt(S.target)], [2.2, (S) => { S.rmb = false; }]] },
  boomerang: { period: 3.6, what: "The BONE MANTLE's boomerang thrown on Q past two men, and home.",
    setup(S) { S.wear('boomerang', 1); S.goatAt(4, 5); S.aimAt({ x: 12 * TILE, y: 5 * TILE }); S.man(7.2, 5); S.man(8.4, 5.3); },
    at: [[0.4, (S) => S.q()]] },
  ruin: { period: 3.2, what: 'The CAPE OF RUIN on Q: crates and a barrel break round him, two men are thrown.',
    setup(S) { S.wear('ruin'); S.goatAt(6, 5); S.prop(7.3, 5, 'crate'); S.prop(4.8, 4.4, 'barrel'); S.man(6, 6.6); S.man(7.6, 4.2); },
    at: [[0.5, (S) => S.q()]] },
  sprout: { period: 2.6, what: 'The SHEPHERD\'S MANTLE on Q: a tuft of milk grass grows in front of him.',
    setup(S) { S.wear('meadow'); S.goatAt(5, 5); S.aimAt({ x: 9 * TILE, y: 5 * TILE }); },
    at: [[0.4, (S) => S.q()]] },
  blink: { period: 2.4, what: 'The CLOAK OF SIGNS on Q: he steps through nowhere.',
    setup(S) { S.wear('symbols', 1); S.goatAt(4, 5); S.aimAt({ x: 12 * TILE, y: 5 * TILE }); },
    at: [[0.4, (S) => { S.move(1, 0); S.q(); }], [0.6, (S) => S.move(0, 0)]] },
  ratogre: { period: 2.8, what: 'The horns on the rat ogre standing: the goat bounces off him.',
    setup(S) { S.goatAt(4, 5); S.aimAt(S.man(6.1, 5, 'ratogre')); },
    at: [[0.45, (S) => S.butt()]] },
  parry: { period: 2.4, approx: 'the parry\'s own burst is called by hand (`Talisman.parryFx`) as a man\'s blow meets MIRROR SHARD\'s window',
    what: 'A blow caught inside MIRROR SHARD\'s window.',
    setup(S) { S.goatAt(6.2, 5); const e = S.man(7.2, 5); S.aimAt(e); S.hurtBy = e; },
    at: [[0.15, (S) => { S.hurtBy.state = 'windup'; S.hurtBy.timer = 0.05; }],
      [0.5, (S) => { S.hurtBy.state = 'swing'; Talisman.parryFx(S.game, S.hurtBy.x - 14, S.hurtBy.y); }],
      [0.8, (S) => { S.hurtBy.state = 'idle'; }]] },
  trip: { period: 4, approx: 'this room\'s floor with THE TRIP\'s picture on (`def.shroom`), not the trip\'s own cave',
    what: 'THE TRIP over the picture.',
    def(d) { d.shroom = true; },
    setup(S) { S.goatAt(7.5, 5); } },
  shrooms: { period: 2.8, approx: 'eaten by hand (`game.eatShrooms`) rather than grazed down',
    what: 'He eats the mushrooms.',
    setup(S) { S.goatAt(6, 5); S.tuft = S.prop(6.9, 5, 'shrooms'); },
    at: [[0.4, (S) => S.game.eatShrooms(S.tuft)]] },
  tumble: { period: 3.4, approx: 'started as a drop from heaven (`game.dropIn`) with no level card over it',
    what: 'He falls in from above, lands on his side, lies, gets up.',
    setup(S) { S.goatAt(7.5, 5.5); S.game.dropIn = { t: -0.15 }; } },
};

const JuicePreview = {
  row: null,           // the JUICE row playing, by name
  on: true,            // EFFECT: ON / OFF
  speed: 0,            // index into SPEEDS
  sound: false,        // the stage's sound stand-in lets `sfx*` through
  SPEEDS: [1, 0.5, 0.25],
  S: null, pr: null, last: 0, err: null,

  // What the table shows on a row: 'live', 'approx' or null.
  kind(name) {
    const p = JUICE_PLAY[name]; if (!p) return null;
    return p.approx || JUICE_SCENES[p.scene].approx ? 'approx' : 'live';
  },
  why(j) {
    if (JUICE_NOPLAY[j.name]) return JUICE_NOPLAY[j.name];
    if (j.status === 'backlog') return 'not built yet';
    if (j.cat === 'SOUND') return 'a sound, tools/sfx-board.html';
    return 'not staged';
  },
  open(game, name) {
    if (!JUICE_PLAY[name]) return;
    this.row = name; this.S = null; this.err = null; this.on = true;
  },
  close() { this.row = null; this.S = null; this.err = null; },
  action(game, id) {
    if (id.startsWith('juice-play=')) { const n = id.slice(11); if (this.row === n) this.close(); else this.open(game, n); return; }
    const a = id.slice(9);
    if (a === 'close') this.close();
    else if (a === 'replay') { this.S = null; this.err = null; }
    else if (a === 'off') { this.on = !this.on; this.S = null; }
    else if (a === 'speed') this.speed = (this.speed + 1) % this.SPEEDS.length;
    else if (a === 'sound') { this.sound = !this.sound; if (this.S) this.S.game.audio = this.audioFor(game); }
  },

  // ---------------------------------------------------------------- the stage
  // The staged game: the real one underneath, everything a step writes to replaced on top.
  isolate(game) {
    const pg = Object.create(game);
    for (const k of Object.keys(game)) {
      const v = game[k];
      if (Array.isArray(v)) pg[k] = [];
      else if (v instanceof Set) pg[k] = new Set(v);
      else if (v instanceof Map) pg[k] = new Map(v);
      else if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) pg[k] = Object.assign({}, v);
    }
    Object.assign(pg, {
      state: 'play', levelIndex: 1, showroomOn: true, autoPause: false, awayNow: false,
      boons: [], artifacts: [], cape: null, tal: null, talRun: null, henHearts: 0, beasts: {}, crowGift: false, levelCrowGift: false,
      input: { mx: 0, my: 0, aim: { x: 1, y: 0 }, lmbPressed: false, rmbDown: false, rmbPressed: false, spacePressed: false, rollPressed: false, qPressed: false, mouse: { x: 0, y: 0 }, anyPressed: false },
      keys: new Set(), cam: { x: 0, y: 0, zoom: 1 }, camLead: { x: 0, y: 0 }, camFollow: null, camTrack: null, camHold: undefined, camRoomMid: null, camFight: 0, camBoss: null,
      dev: { open: false, rules: false, hidden: true, god: true, rects: [], toast: null, tab: 'juice', vision: false, hearing: false, dark: false, tune: game.dev.tune, scroll: {} },
      boom: { fly: null }, kills: 0, timer: 0, acc: 0, timeScale: 1, slowTimer: 0, aimSlow: 0, aimSlowCd: 0,
      kickX: 0, kickY: 0, zoomKick: 0, flashAmt: 0, hitstopTimer: 0, shakeAmt: 0, shakeX: 0, shakeY: 0, shakeT: 0, shakeAge: 0,
      combo: 0, comboTimer: 0, barkCd: 0, cageOpen: true, cageLunge: -1, cageThought: 0, hurt: null, hurtVignette: null,
      goatRoom: 0, holdAt: -1, bonusRoom: -1, vaultTrap: null, bless: null, intro: null, heaven: null, dropIn: null, stairFx: null,
      card: null, deathCam: null, painting: null, deathPainting: null, guide: null, skyTables: null, breathFx: null, checkpoint: null,
      tripBanner: 0, tripBack: 0, tripAt: -1, darkAt: -1, climbDark: false, fromHeaven: false, heavenTables: 0, soulsHere: 0, boonChoice: null,
      pathTimer: 99, milkFullUsed: false, toldGrab: false, firstKill: null, goatLit: true, henSaved: false,
      // The run's last man and his scene (js/endboss.js) and the ogre's witchfire (js/waves.js): never the preview's.
      endBoss: null, endScene: null, waves: [], ogreMet: 0,
      // What `startLevel` lays and the title never has: named here, so a preview opened from the
      // title reads empty lists of its own rather than nothing.
      enemies: [], props: [], bullets: [], parts: [], floats: [], rings: [], puffs: [], flares: [], souls: [], globs: [], fallers: [], tossed: [],
      hazards: [], sightBlockers: [], runes: [], niches: [], sealedRooms: [], soulGates: [], liveEnemies: [], beastSaved: [], wallArt: [],
      pathTrail: [], heartLog: [], killMarks: [], crowMarks: [],
      fx: null, scatter: null, audio: this.audioFor(game),
    });
    // What would write to this browser, move the real run on, or read the real mouse: nothing, here.
    const noop = () => {};
    for (const k of ['saveRun', 'clearRun', 'onGoatDied', 'levelCleared', 'beginClimb', 'openBoonChoice', 'notePenBroken', 'copyCode',
      'noteBest', 'noteRunBest', 'holdGate', 'saveSettings', 'updateCamera', 'updateCursor', 'updateClamps', 'openSoulGate', 'vibe',
      'startLevel', 'restartLevel', 'showTitle', 'quitToTitle', 'layoutTouch']) pg[k] = noop;
    return pg;
  },
  // The sound: a stand-in over the real `GameAudio` that answers every method with nothing and
  // keeps every write, unless SOUND is on, when the one-shot effects (`sfx*`) go through.
  audioFor(game) {
    const a = game.audio, self = this;
    return new Proxy(a, {
      get(t, k) {
        const v = t[k];
        if (typeof v !== 'function') return v;
        // `heard` is arithmetic (distance to a volume and a pan) that callers read the answer of.
        if (k === 'heard') return v.bind(t);
        return self.sound && typeof k === 'string' && k.startsWith('sfx') ? v.bind(t) : () => undefined;
      },
      set() { return true; },
    });
  },
  // A room of the stage's own, laid by hand the way heaven's is (`Heaven.level`).
  level(sc, S) {
    const { W, H } = JUICE_STAGE, tiles = new Uint8Array(W * H).fill(T.WALL);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) tiles[y * W + x] = T.FLOOR;
    const def = Object.assign({}, LEVELS[1], { hint: null, hintKey: null });
    if (sc.def) sc.def(def);
    const level = { W, H, tiles, rooms: [{ x: 0, y: 0, w: W, h: H, index: 0, markers: [], role: 'canon', seen: true, drawn: false, name: 'preview', tpl: { name: 'preview', rows: [] } }],
      spawns: [], props: [], start: { x: 2 * TILE, y: (H - 2) * TILE }, exit: { x: W * TILE / 2, y: H * TILE / 2 }, exitTile: { x0: -9, y0: -9 },
      forkTile: null, entry: null, seed: 7, def, hints: [], controls: [], cagePrompt: null, vault: null,
      windows: new Set(), plan: null, gates: [], sealedArenas: [], shop: null, grass: [] };
    S.fill = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[y * W + x] = t; };
    S.grass = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) level.grass.push(y * W + x); };
    if (sc.tiles) sc.tiles(S);
    return level;
  },
  // Lay the scene. `S` is the scene's handle on the stage: where things stand, what he presses.
  stage(game, sc) {
    const pg = this.isolate(game);
    pg.renderer = this.pr || game.renderer;   // `view()` for who wakes, and what the sky table sees
    const S = { game: pg, t: 0, loop: 0, mx: 0, my: 0, rmb: false, target: null, events: [] };
    // Positions are in tiles (7.5 is the middle of tile 7); the floor is 1..14 across, 1..9 down.
    const px = (v) => v * TILE;
    S.goatAt = (x, y) => { const g = pg.goat; g.x = px(x); g.y = px(y); g.facing = 0; };
    S.aimAt = (o) => { S.target = o; return o; };
    S.move = (x, y) => { S.mx = x; S.my = y; };
    S.butt = () => { pg.input.lmbPressed = true; };
    S.roll = () => { pg.input.rollPressed = true; };
    S.q = () => { pg.input.qPressed = true; };
    S.boon = (id) => { const b = BOONS.find((o) => o.id === id); if (b) { pg.boons.push(b); pg.applyBoons(); pg.goat.hp = pg.goat.maxHp; } };
    // A cape on his back when `id` is one (`CAPES`), else that talisman at his neck.
    S.wear = (id, tier) => { if (Cape.def(id)) pg.cape = { id }; else pg.artifacts = [{ id, tier }]; pg.applyBoons(); pg.goat.hp = pg.goat.maxHp; };
    S.burn = (x, y, dur) => pg.world.ignite(x, y, true, dur);
    // A man: held on his mark (the wheel lesson's own hold, `millLesson` before `millOpen`, every
    // blow, fling, fall and flame still plays on him), or `live`, awake and after the goat.
    S.man = (x, y, kind = 'bearer', o = {}) => {
      const e = new Enemy(px(x), px(y), kind);
      e.woke = true; e.facing = Math.atan2(pg.goat.y - e.y, pg.goat.x - e.x);
      if (e.kind === 'wraith' && e.state === 'hidden') { e.state = 'idle'; e.disguise = null; }
      if (o.live) { e.room = 0; e.aware = true; e.state = 'chase'; e.lastSeen = { x: pg.goat.x, y: pg.goat.y }; }
      else { e.room = 99; e.millLesson = true; e.millOpen = false; }
      pg.enemies.push(e); return e;
    };
    S.prop = (x, y, kind, opts, o = {}) => {
      const p = new Prop(px(x), px(y), kind, opts || undefined);
      if (o.food) { const S0 = TUNING.scatter, was = S0.chance; S0.chance = 1; try { Scatter.foodOf(p); } finally { S0.chance = was; } }
      pg.props.push(p); return p;
    };
    const level = this.level(sc, S);
    pg.level = level; pg.world = new World(level);
    pg.goat = new Goat(level.start.x, level.start.y);
    pg.enemies = []; pg.props = []; pg.liveEnemies = [];
    pg.chase = null;   // THE CHASE of the run under the tab is not the stage's (js/chase.js)
    pg.fx = new CombatFX(pg); pg.scatter = new Scatter(pg);
    pg.applyBoons(); pg.goat.hp = pg.goat.maxHp; pg.goat.invuln = 0;
    // The room is framed whole, still: the preview is about the effect, not the follow.
    pg.cam.x = JUICE_STAGE.W * TILE / 2; pg.cam.y = JUICE_STAGE.H * TILE / 2;
    // He reads the scene's stick and aim, never the real mouse or keys.
    pg.readMoveInput = function () {
      const I = this.input, g = this.goat, t = S.target;
      I.mx = S.mx; I.my = S.my; I.rmbDown = S.rmb;
      if (t && g) { const dx = t.x - g.x, dy = t.y - g.y, d = Math.hypot(dx, dy); if (d > 4) I.aim = { x: dx / d, y: dy / d }; }
    };
    sc.setup(S);
    // As `startLevel` does it: the chandelier and its cleat, and the lists the men read.
    for (const c of pg.props) if (c.kind === 'cleat') { const ring = pg.props.find((q) => q.kind === 'chandelier' && q.cid === c.cid); if (ring) { c.hangs = ring; ring.cleat = c; } }
    pg.hazards = pg.props.filter((p) => p.kind === 'brazier' || p.kind === 'mill' || p.kind === 'spike' || p.kind === 'spire' || p.kind === 'barrel');
    pg.wallArt = pg.props.filter((p) => p.kind === 'armor' || p.kind === 'trophy' || p.kind === 'suit');
    pg.sightBlockers = pg.props.filter((p) => p.kind === 'door' || p.kind === 'bell' || p.kind === 'mill' || p.kind === 'secret');
    pg.world.computeFlow(pg.goat.x, pg.goat.y);
    pg.revealRooms();
    this.arm(S, sc);
    return S;
  },
  arm(S, sc) { S.t = 0; S.events = (sc.at || []).map(([at, fn]) => ({ at, fn, done: false })); },

  // One frame of the stage, `dt` real seconds × the speed: the slow motion and COLD EYE's clock as
  // `Game.frame` runs them, then its fixed steps through the real `Game.update`.
  tick(dt) {
    const S = this.S, pg = S.game, sc = JUICE_SCENES[JUICE_PLAY[this.row].scene];
    S.t += dt;
    if (S.t >= sc.period) {
      S.loop++;
      if (sc.keep && sc.again) { this.arm(S, sc); sc.again(S); }
      else { const loop = S.loop; this.S = this.stage(this.game, sc); this.S.loop = loop; return this.tick(0); }
    }
    for (const ev of S.events) if (!ev.done && S.t >= ev.at) { ev.done = true; ev.fn(S); }
    pg.slowTimer = Math.max(0, pg.slowTimer - dt);
    const eye = pg.mods && pg.mods.coldEye;
    pg.aimSlowCd = Math.max(0, (pg.aimSlowCd || 0) - dt);
    if (pg.aimSlow > 0) pg.aimSlow = eye && pg.goat.holding ? Math.max(0, pg.aimSlow - dt) : 0;
    pg.timeScale += ((pg.slowTimer > 0 ? 0.32 : pg.aimSlow > 0 ? eye.scale : 1) - pg.timeScale) * (1 - Math.exp(-7 * dt));
    pg.acc += dt * pg.timeScale;
    const step = 1 / 60;
    let n = 0;
    while (pg.acc >= step && n < 5) { pg.update(step); pg.acc -= step; n++; }
    if (n === 5) pg.acc = 0;
    if (pg.hurt) pg.hurt.life -= dt;
    if (pg.hurtVignette) pg.hurtVignette.life -= dt;
  },

  // The preview's renderer: its own canvas and caches, sized to the box it is shown in.
  renderer(r, cssW, cssH) {
    let pr = this.pr;
    if (!pr) {
      pr = this.pr = new Renderer(document.createElement('canvas'));
      // Only the world and what lies over it: no title, cards, drawer or touch deck in the box.
      for (const k of ['drawDev', 'drawTitle', 'drawCard', 'drawBoonChoice', 'drawTouchUI', 'drawPause']) pr[k] = () => {};
      pr.drawUI = function (g) { if (JuicePreview.hud) Renderer.prototype.drawUI.call(this, g); };
    }
    const s = r.s, w = Math.round(cssW * s), h = Math.round(cssH * s);
    if (pr.c.width !== w || pr.c.height !== h) { pr.c.width = w; pr.c.height = h; pr.vignette = null; }
    Object.assign(pr, { w, h, cssW, cssH, s, portrait: false, bandH: 0, vw: w, vh: h, vcx: w / 2, vcy: h / 2 });
    pr.ts = s * clamp(Math.min(cssW, cssH) / 460, 0.62, 1.2);
    pr.zoomFit = Math.min(w / (JUICE_STAGE.W * TILE), h / (JUICE_STAGE.H * TILE * TILT));
    pr.ctx.imageSmoothingEnabled = false;
    return pr;
  },

  // EFFECT OFF: the row's dials turned down around one frame of the preview, and put back after.
  withOff(pg, pr, fn) {
    const off = !this.on && JUICE_PLAY[this.row].off, undo = [];
    if (off) {
      for (const [path, v] of Object.entries(off.tune || {})) {
        const keys = path.split('.'), last = keys.pop(), o = keys.reduce((a, k) => a[k], TUNING);
        undo.push([o, last, o[last]]); o[last] = v;
      }
      for (const [k, f] of Object.entries(off.game || {})) { undo.push([pg, k, pg[k], true]); pg[k] = f || (() => {}); }
      for (const k of off.draw || []) { undo.push([pr, k, pr[k], true]); pr[k] = () => {}; }
    }
    try { fn(); } finally {
      for (const [o, k, v, own] of undo.reverse()) { if (own) delete o[k]; else o[k] = v; }
    }
  },

  // ---------------------------------------------------------------- the panel
  // The box on the JUICE tab: the row's name, the picture, the chips. Returns its height. Text is
  // never under 12 CSS px, whatever the tool's scale.
  panel(r, game, x, y, w) {
    const ctx = r.ctx, d = game.dev, s = r.ts, css = r.s, F = (n) => Math.max(12 * css, n * s);
    const play = JUICE_PLAY[this.row], sc = play && JUICE_SCENES[play.scene];
    if (!sc) { this.close(); return 0; }
    const pad = 8 * css, cw = w - pad * 2, ch = Math.round(cw * 0.58);
    const lineH = F(10) * 1.3, head = lineH * 2 + pad;
    // The words under the picture, wrapped to its width.
    ctx.font = `400 ${F(9)}px ${FONT}`;
    const approx = play.approx || sc.approx;
    // The scene texts name code in backticks for whoever reads this file; on the page, plain.
    const plain = (t) => t.replace(/`/g, '');
    const notes = r.wrap(plain(sc.what), cw);
    if (approx) notes.push(...r.wrap(plain('APPROXIMATE: ' + approx + '.'), cw));
    if (play.tip) notes.push(...r.wrap(play.tip, cw));
    const chipH = F(10) + 10 * css, h = head + ch + pad + chipH + pad + notes.length * lineH + pad;
    ctx.fillStyle = 'rgba(20,14,18,0.97)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = PALETTE.ochre; ctx.lineWidth = Math.max(1, css); ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = `700 ${F(11)}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone;
    ctx.fillText(r.clip(this.row.toUpperCase(), cw - 90 * css), x + pad, y + pad + F(11));
    ctx.font = `700 ${F(9)}px ${FONT_SC}`; ctx.fillStyle = approx ? PALETTE.ochre : PALETTE.fireHi;
    ctx.fillText(approx ? '≈ APPROXIMATE, THE GAME\'S OWN CODE, ONE THING SET BY HAND' : '▶ LIVE, THE GAME\'S OWN CODE IN A STAGED ROOM', x + pad, y + pad + F(11) + lineH);
    // The picture.
    const bx = x + pad, by = y + head;
    this.hud = !!sc.hud;
    const now = performance.now();
    try {
      if (this.err) throw this.err;
      const pr = this.renderer(r, cw / css, ch / css);
      // Away from the tab for a while: start the loop over rather than leap a long step.
      if (!this.S || now - this.last > 1000) { this.game = game; this.S = this.stage(game, sc); }
      const pg = this.S.game, dt = Math.min(0.1, (now - this.last) / 1000) * this.SPEEDS[this.speed];
      pg.cam.zoom = pr.zoomFit;
      this.withOff(pg, pr, () => { this.tick(dt); pr.draw(this.S.game, dt); });
      ctx.drawImage(pr.c, bx, by, cw, ch);
    } catch (e) {
      if (!this.err) console.error('JUICE preview', e);
      this.err = e;
      ctx.fillStyle = '#0d0a0c'; ctx.fillRect(bx, by, cw, ch);
      ctx.font = `400 ${F(9)}px ${FONT}`; ctx.fillStyle = PALETTE.blood;
      r.wrap('The preview threw: ' + (e && e.message) + ', REPLAY tries again.', cw - pad * 2).forEach((l, i) => ctx.fillText(l, bx + pad, by + pad + F(9) + i * lineH));
    }
    this.last = now;
    // The chips.
    let cx = x + pad; const cy = by + ch + pad;
    const chip = (label, id, on, at) => {
      ctx.font = `700 ${F(10)}px ${FONT_SC}`;
      const cwid = ctx.measureText(label).width + 14 * css, px = at ? at.x - cwid : cx, py = at ? at.y : cy;
      ctx.fillStyle = on ? 'rgba(185,135,58,0.55)' : 'rgba(59,34,51,0.85)'; ctx.fillRect(px, py, cwid, chipH);
      ctx.strokeStyle = on ? PALETTE.ochre : 'rgba(239,230,208,0.25)'; ctx.lineWidth = Math.max(1, css); ctx.strokeRect(px, py, cwid, chipH);
      ctx.fillStyle = on ? PALETTE.fireHi : PALETTE.bone; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, px + cwid / 2, py + chipH / 2 + css);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      d.rects.push({ x: px, y: py, w: cwid, h: chipH, id: 'juice-pv=' + id });
      if (!at) cx += cwid + 6 * css;
    };
    chip('↻ REPLAY', 'replay', false);
    if (play.off) chip(this.on ? 'EFFECT: ON' : 'EFFECT: OFF', 'off', this.on);
    chip('SPEED ' + ['1×', '½×', '¼×'][this.speed], 'speed', this.speed > 0);
    chip(this.sound ? 'SOUND: ON' : 'SOUND: OFF', 'sound', this.sound);
    // CLOSE at the top right, where the eye goes to leave.
    chip('✕ CLOSE', 'close', false, { x: x + w - pad, y: y + pad });
    ctx.font = `400 ${F(9)}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.78)';
    notes.forEach((l, i) => ctx.fillText(l, x + pad, cy + chipH + pad + F(9) + i * lineH));
    // The loop's clock, a hairline under the picture.
    if (this.S && sc.period) { ctx.fillStyle = 'rgba(242,162,51,0.5)'; ctx.fillRect(bx, by + ch - 2 * css, cw * clamp(this.S.t / sc.period, 0, 1), 2 * css); }
    return h;
  },
};
