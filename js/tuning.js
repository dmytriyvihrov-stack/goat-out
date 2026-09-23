// GOAT OUT — all tuning values in one place. Units: px, seconds. 1 tile = TILE px.
const TILE = 32;
// The version tag shown under the seed in the corner of the screen, and nothing else — bump it
// by hand alongside a CHANGELOG entry so a bug report can name the build it happened on.
const BUILD = '1.61';

// The world is drawn squashed a little on Y, so the camera reads as tilted off straight-down
// and the creatures show a bit of their side. Collision and AI stay in flat world space.
const TILT = 0.86;

const PALETTE = {
  ink: '#1a1016',
  plum: '#3b2233',
  ochre: '#b9873a',
  bone: '#efe6d0',
  blood: '#c0392b',
  bloodDark: '#7a1f18',
  cult: '#5b4a8a',
  witch: '#7d5cff',
  witchHi: '#bfe6ff',
  fire: '#f2a233',
  fireHi: '#ffe08a',
  ash: '#5a5250',
  // Ash for words: a refusal said quietly (TOO QUICK, NOTCHED, NO ROOM). Plain `ash` on the floor
  // is under 2:1 and those lines are the only place the player learns why a verb did nothing.
  ashHi: '#b3aaa2',
  hay: '#d9a548',
  hayDark: '#a5732a',
  // Poison: the one sour green in a compound of plum, timber and fire, so a puddle reads as
  // neither grass nor witchfire.
  venom: '#8fb33a',
  venomHi: '#d6f07a',
  venomDark: '#3d5a1c',
  grass: '#7c8f52',
  grassHi: '#a8bd6c',
  brazier: '#4a3b2f',
  wood: '#6b4a2c',
  woodHi: '#8a6238',
  dirt: '#463524',
  dirtHi: '#5a4530',
  // The bird. Bone-white body so she reads against the compound's plum and timber at a glance, with
  // the comb and the beak the one warm note on her — she has to be findable across a room.
  hen: '#e8ddc8',
  henShade: '#bfb49f',
  comb: '#c0392b',
  beak: '#d9a548',
  altar: {
    outline: '#19131c', mortar: '#3b3437', stones: ['#665c54', '#625951', '#6b6057', '#605750'],
    stoneLight: '#786c60', stoneEdge: '#71665d', stoneShade: '#564e49', stoneFleck: '#6d6259', crack: '#494143',
    wallBody: '#352a34', wallFaces: ['#51404c', '#594650', '#4c3c48'], wallLight: '#75606a',
    wallShade: '#2c222c', wallWear: '#67545e', shadow: 'rgba(15,10,18,0.23)', deepShadow: 'rgba(15,10,18,0.34)',
    woodDark: '#382825', wood: '#76543b', woodHi: '#a27b50', woodLight: '#84644b', woodGrain: '#5d4334',
    boards: ['#654d3d', '#705440', '#604737', '#6b503c'], iron: '#45404a', ironHi: '#8a7b79',
    clothDark: '#48252d', cloth: '#743c3b', clothHi: '#93534a', glyph: '#b49476',
    straw: ['#8a673d', '#ab8349', '#715333'], ash: '#4b4345', coal: '#28202a', ember: '#bb4d2c',
    bronzeDark: '#694a32', bronze: '#a87843', bronzeHi: '#d0a66b',
  },
};

// The two paces every creature in the game is written against. `PACE` is the yardstick — it is what
// the goat's top speed used to be, and every man's speed is still quoted as a fraction of it. They
// are two numbers now because the two were turned by different amounts: the goat lost a fifth of his
// stride (and earns it back over a run-up, see `momentum`), and the cult lost a tenth of theirs.
const PACE = 8.2 * TILE;
const CULT_PACE = 0.9 * PACE;

const TUNING = {
  effects: {
    maxAir: 220, maxGround: 180, maxBursts: 24,
    stainTile: 256, maxStainTiles: 96,
    gravity: 460, drag: 2.8, lift: 145, fragmentSpeed: 145, bloodSpeed: 210,
    maxFlight: 2, burstLife: 0.7, bloodLife: 0.32, fireFps: 12, doorPieces: 15, cratePieces: 11,
    // A dead man (`CombatFX.death`, a whole body, not torn): he keeps `carry` of the speed he died
    // with, lands and slides `keep` of what is left against `friction` px/s², leaving a smear dot
    // every `smear` px, and turns over onto his side in `settle` s — a quarter turn, `lie` rad off
    // it (0: square to the grid, where the sprite's pixels stay crisp instead of stair-stepping).
    // He goes `dark` duller than the living, sits on a silhouette shadow `shade` strong, twitches
    // `twitches` times inside `twitchBy` s, and a pool seeps out from under him after `delay` s over
    // `time` s to `pool` px (`big` for a Butcher), darker than a fresh splash so the body still reads
    // on it. A burnt one leaves no pool.
    corpse: { carry: 0.35, keep: 0.6, friction: 320, smear: 3, lie: 0, settle: 0.22, dark: 0.3, shade: 0.5,
      twitches: 2, twitchBy: 1.3, pool: 9, big: 13, delay: 0.3, time: 2.6, colors: ['#2e0a08', '#471210', PALETTE.bloodDark] },
    // Fire, blasts, smoke and spray are baked pixel frames (`CombatFX.flameFrames` / `burstFrames`),
    // `pixel` world px a texel — the grain the units are drawn at. `flame`: a flame of `size` is
    // `size * scale` texels, `wide` × that across and `tall` × that high, looping over `frames`
    // with `sparks` cells climbing off it. `blast`: a bomb's cloud is `scale` × its radius, dust
    // `dustScale`; the fire burns out and the smoke dithers away from `fade` of its life; the floor is
    // lit `light` × the radius for the first `lightFor`, and the shock ring runs out to `ringOut` ×
    // the radius over the first `ringFor`.
    pixel: 1,
    flame: { scale: 1, wide: 1.5, tall: 2.3, frames: 8, sparks: 3 },
    // A rifle's spent case: `w` × `h` world px of brass thrown `speed` px/s out of the side of the
    // breech and `back` of that behind it, `lift` px/s up; it bounces once and stays on the floor.
    shell: { w: 2, h: 4, speed: 150, back: 0.3, lift: 120 },
    blast: { scale: 0.85, dustScale: 0.8, frames: 12, bloodFrames: 6, fade: 0.55, dustAlpha: 0.85,
      light: 3.2, lightFor: 0.28, ringOut: 1.1, ringFor: 0.3,
      // Its weight, with no shake in it: `embers` streaks (for a 40 px blast), a screen `flash` and
      // a lens `punch` (both under `juice.screen`), and a column of smoke `soot` × the radius that
      // starts `sootAfter` s in and rises for `sootLife` s.
      embers: 16, flash: 0.28, punch: 1.3, soot: 0.75, sootAfter: 0.3, sootLife: 1.3 },
    // How big a kill's blood is: the burst, the droplets thrown and the stain left. It was a shade
    // loud — a clubman going down painted a patch the size of a room corner.
    bloodScale: 0.6,
  },
  goat: {
    radius: 12,
    // A fifth off the stride he walks about with, and then another fifth off that. The run-up is
    // what gives it back: four seconds of running flat out and he is closer to the old top speed
    // again, so the speed he used to have for free is now the speed he has for not stopping.
    speed: 0.8 * 0.8 * PACE,
    accel: 0.15,            // s to top speed
    decel: 0.25,            // s to stop
    hp: 4,
    // The lunge carries him a short way and no further: a headbutt is a step into a man, not a
    // charge across the room, and closing the distance yourself is the part you are paid for.
    // The bare head is deliberately blunt. It is the verb you have on the first screen and the one
    // every soul sharpens, so what it does out of the pen has to leave those souls something to do:
    // a shorter reach, less throw behind it, and a recovery long enough that a second man gets to
    // walk in on the end of the first swing. LONG HORNS and IRON SKULL put back what was taken.
    // It was cut too far. A bare head that neither reached nor threw made the first hour a game
    // about walking backwards, so a third of the cut is given back — not the whole of it: the goat
    // still starts underpowered, and what he has out of the pen is a shove with a body behind it.
    // `lunge` is a speed, not a distance, but at `active` seconds it used to carry him close to three
    // tiles on a single press — noticeably further than the reach a headbutt reads as. Cut to land
    // close to two.
    headbutt: { windup: 0.12, active: 0.15, recovery: 0.38, lunge: 13.3 * TILE, impulse: 28 * TILE, reach: 1.64 * TILE },
    // A headbutt or a roll pressed while he is still busy is kept `buffer` s and goes the frame he is
    // free, instead of being dropped for being early. Not a cancel: what he was doing still runs
    // its whole length (pillar 4). Only a press made while busy is kept.
    buffer: 0.12,
    // A throw is a commitment now: you let him go, and your mouth is empty for a beat.
    // He is in your mouth a long time, and he works himself loose somewhere in `holdVary` either
    // side of it, so you never learn the exact beat he goes: carrying one is a gamble, not a timer.
    // `manThrow` is what a goat can actually do with a grown man: the same throw as a crate takes
    // off two thirds of the way across a room, which is a gorilla. A man goes a short way and lands.
    // Two weights and two prices for carrying. A man in your mouth is `speedMul` — most of your
    // stride, because he is most of your size. A blade or a shield is `itemSpeedMul` and barely
    // anything, which is what makes an arm worth taking in passing rather than a thing you commit to.
    // `throwImpulse` is a fifth less than it was: a throw that crossed most of a room made the
    // grab-and-launch loop the answer to everything a headbutt was supposed to be for.
    grab: { reach: 1.6 * TILE, speedMul: 0.7, itemSpeedMul: 0.94, holdTime: 8.0, holdVary: 0.125,
      throwImpulse: 27.2 * TILE, manThrow: 0.7, holdDist: 22, cooldown: 1.35 },
    // BAAH out of the pen is what a goat's voice actually is: a noise. It calls every man who hears
    // it to the spot you shouted from, which is a tool — you throw your voice at one end of a room
    // and leave by the other — and a way to get killed. What it is NOT is a weapon: taking the sense
    // out of a crowd is THE FULL THROAT, and setting fire to one is DRAGON BREATH, and the goat
    // picks one of the two. `call` is how far the noise carries; `radius` is what the two tomes
    // reach, deliberately short of what the screen shows, so a stun is for the men on top of you.
    // `balk` and `balkStun` are what the BARE voice does to a man already swinging at you: inside
    // `balk` tiles — arm's length, near enough that he is the one about to land a blow — a shout in
    // his face breaks whatever he had committed to and costs him `balkStun` before he can start it
    // again. It is not THE FULL THROAT: it reaches two bodies rather than a room, it does not stack,
    // and a man it interrupts is walking at you again a blink later. What it buys is the one thing
    // the bare voice never had — an answer to being caught, rather than only a way of moving a crowd
    // about. The lure is untouched and still goes out to `call` tiles: one button, both jobs.
    // `radius` came in a fifth: a stun that reached across most of a room answered a crowd rather
    // than the handful of men on top of you, which is what THE FULL THROAT is supposed to cost for.
    // `balk` came down a further fifth, to a plain two tiles: even arm's length read as a little more
    // reach than the bare voice should have, and the lure is what still carries the room at `call`.
    scream: { duration: 0.3, cooldown: 4.0, radius: 6.8, stun: 0.9, call: 13, callCooldown: 3.0,
      balk: 2, balkStun: 0.3 },
    // A clumsy sideways tumble: fast, brief mercy frames, then a stagger you have to eat. It is a
    // fifth shorter than it was — the same beat of mercy, a fifth less ground — because a dodge that
    // clears the whole room is a second way of running rather than a way of not being hit.
    // `stun` and `stunR` are DEAD WEIGHT's, and nothing else reads them: the roll on its own
    // goes through a man without touching him.
    roll: { speed: 7.92 * TILE, duration: 0.32, invuln: 0.24, recover: 0.26, cooldown: 1.35, threatRange: 7,
      stun: 0.7, stunR: 1.6 * TILE },
    // The smear behind him is the only thing on screen that says he is faster than he was, so the
    // tome that makes him faster lengthens it: at `fastAt` times his own speed it is `fast*` all
    // through, and anywhere between the two it is mixed.
    trail: { at: 0.55, gap: 0.028, keep: 7, life: 0.18, fastGap: 0.014, fastKeep: 16, fastLife: 0.34, fastAt: 1.18 },
    breath: { range: 5.2 * TILE, halfAngle: 0.52, fireTime: 2.2, cooldown: 5.0 },
    devour: { time: 1.15, healChance: 0.45 },
    // `radius` is the real blast — what it flings and damages — and stays untouched by the two
    // numbers under it: `fxScale` and `fxLife` only shrink and shorten the burst graphic itself, so
    // the explosion reads without eating a third of the screen or the fight happening behind it.
    bomb: { fuse: 0.9, radius: 2.6 * TILE, impulse: 24 * TILE, fxScale: 0.55, fxLife: 0.4 },
    // The run-up. A goat that has been running flat out for a while is going faster than one that
    // just set off: `time` seconds of asking for at least `atLeast` of a stride buys the whole of
    // `max`, and it drains at `lose` times real time the moment he stops — or all at once when he is
    // hit. It is the only speed in the game you earn rather than pick up, and it is worth having
    // because everything that stops you costs it: a fight costs it, a door costs it, a club costs it.
    // `max` is exactly the fifth that came off `speed`: a goat at the end of a run-up is doing what
    // he used to do standing still, so the old top speed is still in the game — it is just the
    // reward for not stopping now, and a single club takes it off you again.
    momentum: { max: 0.25, time: 4.0, lose: 3.0, atLeast: 0.6 },
    turn: 9,                // rad/s he swings his head round to where you are pointing, standing still
    fireDamageInterval: 0.7,
    // On his last heart he leaves a drop now and then behind him — not a stripe on every tile.
    bleed: { gap: 0.4, jitter: 0.35, minSpeed: 60, size: 2 },
    // A blot in his wool per lost heart (`PaintedArt.wounds`): world px from the foot, the first
    // spots on the flank and the later ones spreading, each a little bigger than the last. `front`
    // is how much of that size is left facing the camera: from the front the whole blot sits on his
    // face and chest and read as twice the wound it is from the side.
    // What the butt souls do to the pixel goat's horns (`PIXEL_ART.horns`): LONG HORNS turns each
    // one into a stag's antler (`antler`, below); BOMB CHARGE and SPLASH skin them in lava and in
    // venom — `ramp` dark root to lit tip, a `glow` of `blur` px round them, and a venom drop off
    // each tip every `drip` seconds.
    // `antler` is built off the horn it replaces, in atlas px on a grid of `cell` (the art's own
    // pixel): a beam `len` times the horn's length, `w0` thick at the root and `w1` at the tip,
    // bending `bend` of the way outward, with a tine at each fraction of `tines` along it, `tineLen`
    // of the beam long, turned `tineTurn` rad off it toward the sky.
    hornLooks: {
      antler: { cell: 3, len: 2.3, w0: 9, w1: 5, bend: 0.5, tines: [0.28, 0.52, 0.76], tineLen: [0.36, 0.34, 0.26],
        tineW: 5, tineTurn: 0.95, fork: 0.22, outline: '#1e130c',
        ramp: ['#2c1a10', '#4f3220', '#7a5636', '#b08a62', '#e6d3b0'] },
      lava: { ramp: ['#3a0d06', '#8f1e0a', '#e0521a', '#ffb43a', '#fff0a0'], glow: 'rgba(255,110,30,0.9)', blur: 5 },
      venom: { ramp: ['#12260e', '#2f5a1c', '#5c9a2a', '#9fd84a', '#e4ffa0'], glow: 'rgba(140,220,70,0.9)', blur: 4, drip: 1.6 } },
    // The collar a talisman hangs from on the pixel goat (`PaintedArt.collar`): half-width of the
    // ring, how far it opens toward the camera from the front, its least depth on a side view, the
    // strap's width and colours, and where the pendant hangs below the throat and how big.
    collar: { r: 3.6, depth: 0.3, flat: 2, thin: 0.9, w: 1.3, edge: '#24160e', leather: '#6e4326', drop: 3.8, icon: 3 },
    // What the scream souls and THE ORACLE do to his face, the way the butt souls do his horns
    // (`PIXEL_ART.face` on him, `PaintedArt.goatFx` for what leaves him), world px off `PIXEL_FACE`.
    // All of it is hand-drawn pixels (`PIXEL_FACE_ART`) on the sprite's own grid, `cell` world px a
    // side (three atlas texels); these are its colours and clocks. `throat` (THE FULL THROAT): the
    // horn's bell his mouth is drawn out into. `foam` (VENOM SPIT): froth at his lips, `rate` frames
    // a second, and a drop off his chin every `drip` (+ up to `dripVary`) seconds that falls at
    // `fall` px/s² and leaves a `splat` on the floor for `splatLife`. `steam` (DRAGON BREATH): a puff
    // off a nostril every `gap` s that lives `life` s, rising `rise` px/s and drifting `drift` px/s
    // the way he faces and growing from one pixel to a cross of five; every `fire` (+ `fireVary`) s the puffs are flame for
    // `fireTime` s, a spark every `fireGap`. `eye` (THE ORACLE): the third eye,
    // shut for a moment every `blink` s.
    face: {
      cell: 34 / 112 * 3,
      throat: { tube: '#9a918a', rim: '#efe4cc', inside: '#1a0b09', edge: '#24160e' },
      foam: { rate: 3, color: '#d4f59a', dark: '#5c9a2a', drip: 2.6, dripVary: 1.8, fall: 160, splat: 1.6, splatLife: 1.6 },
      steam: { gap: 0.3, life: 0.95, rise: 10, drift: 8, color: '232,229,222', alpha: 0.5,
        fire: 3.6, fireVary: 2.6, fireTime: 0.4, fireGap: 0.035, fireSpeed: 34, fireLife: 0.32 },
      eye: { iris: '#a46cff', pupil: '#16091f', white: '#f6efff', edge: '#24160e', blink: 4.2 },
    },
    // Standing still he breathes: the sprite stretches `amp` tall and `wide` narrower once every
    // `period` seconds, from the feet, so the hooves stay planted and only the back and head rise.
    breathe: { period: 2.8, amp: 0.03, wide: 0.012 },
    // How his running feels. Only `turnGrip` touches the simulation: a reversal (asking against
    // where he is already going, `skid.dot` or less) bites that many times harder, so a dodge back
    // the other way answers the hand instead of drifting a body-length first. The rest is drawn:
    // `lean` rad into a change of pace across the screen (smoothed at `leanRate`) plus `run` rad
    // forward at full stride; `bob` px of hop per hoof-fall, in step with the walk frames. `kick` is
    // setting off from under `from` of his stride (a stretch and a puff behind), `stop` letting go
    // above `at` (a settle), `skid` a reversal above `at` (a squash and a spray of dirt ahead).
    // `pull` px is how far he draws back off the aim over a headbutt's windup, so the lunge has
    // somewhere to come from.
    feel: { turnGrip: 1.6, lean: 0.14, leanRate: 14, run: 0.05, bob: 1.3, pull: 3,
      kick: { from: 0.25, squash: -0.07, dust: 2 }, stop: { at: 0.7, squash: 0.06 },
      skid: { dot: -0.3, at: 0.55, squash: 0.09, dust: 3, gap: 0.35 } },
    // What he does standing still once he has stood `after` s: every `gap` s (a roll between the
    // two) one fidget, picked by `weights` — glances one facing aside (`look` s), a little pronk
    // (`hop`: `h` px up over `time` s), a shake of the head (`shake`: `amp` rad at `freq` rad/s),
    // or paws the floor (`paw`: `scrapes` scrapes, a puff of dirt each). Drawn only; the aim and
    // the facing a butt goes along are never touched.
    idle: { after: 1.4, gap: [2.6, 5.2], weights: { look: 3, hop: 1, shake: 2, paw: 2 }, look: 1.1,
      hop: { time: 0.42, h: 5 }, shake: { time: 0.45, amp: 0.09, freq: 44 }, paw: { time: 0.8, scrapes: 2, dist: 1.5 } },
    wounds: { r: 1.9, grow: 0.15, front: 0.65, alpha: 0.8, spots: [[-4, -10], [5, -9], [-1, -14], [-7, -7], [7, -13], [2, -6]] },
    invuln: 0.9,            // s of invulnerability after a hit
  },
  bearer: {
    radius: 11, speed: 0.85 * CULT_PACE, sight: 8, cone: Math.PI / 2,
    // Reach came in a fifth: a club that landed from most of a body-length off read as the room's
    // geometry not mattering, when the wall behind him is supposed to be doing the killing.
    // And in again, with a quicker arm to pay for it: a short club that comes round fast is a man you
    // have to be right on top of to be hit by, and right on top of him is where the wall is.
    reach: 0.8 * TILE, windup: 0.46, swing: 0.12, recover: 0.55, damage: 1, knock: 1 * TILE,
    flooredTime: 0.8,
  },
  hunter: {
    radius: 11, speed: 0.8 * CULT_PACE, sight: 10, cone: Math.PI / 2,
    keepMin: 5, keepMax: 8, backoffDist: 4, aimTime: 0.88, reload: 1.35,
    // What he has left once you have him by the collar. He empties it into the room and then he is
    // only a man being carried: a rifle is worth holding, but not for the whole level.
    heldShots: [2, 3],
    // A rifle posted to watch a door sees this much further than one wandering a room, and he does
    // not leave the post: he tracks you across the floor and fires the moment he has the shot.
    watchSight: 8,
    // A shade slower than it was, so a round crossing a room is a thing you can see and step off.
    bulletSpeed: 19 * TILE, damage: 1,
    // Point blank a rifle is the wrong tool. Inside `wildNear` tiles half his shots go somewhere
    // else entirely — `wildSpread` radians is the least he is off by, and it can be twice that —
    // so walking into his face is a gamble rather than suicide, and a rifle is a thing you close on.
    wildNear: 2, wildChance: 0.5, wildSpread: 0.7,
    // He works the bolt the moment he starts to aim, and that is the one tell he gives: `cockHear`
    // is how many tiles off the click still reaches the goat, and it fades to nothing at that range.
    cockHear: 16,
    // One of his own this close in front of the muzzle and he does not fire: he steps sideways off
    // the line for `stepOff` seconds and looks again. Further than this he never checks.
    friendClear: 2, stepOff: 0.45,
  },
  // The hound. As quick as the goat, impossible to get hold of, and it will not stand still to be
  // hit: a share of every headbutt it is simply not there for any more. One thing it cannot do is
  // think its way through a BAAH — a screamed pack is a dead pack, and that is the point of it.
  dog: {
    radius: 10, speed: 0.98 * CULT_PACE, sight: 12, cone: Math.PI * 0.9,
    // The run. Inside `dashRange` tiles he stops and charges for `windup` seconds with the line he is
    // about to run drawn on the floor in red; then he runs it at `dashSpeed` for up to `dashTime`,
    // barking, turning onto the goat at `dashTurn` rad/s, and bites whatever is in front of him. The
    // line starts `dashSkew` radians off the straight one on the side he was circling, so it bends.
    reach: 0.76 * TILE, windup: 1.0, swing: 0.12, recover: 0.4, damage: 1, knock: 0.8 * TILE,
    // It was 13 tiles a second for 0.6 — gone before the eye had it, which read as a special move
    // rather than as a dog running. Now it is a sprint: `dashStart` of top speed off the crouch,
    // full speed after `dashRamp` seconds, about seven tiles in all. `dashLook` and `orbitLook` are
    // the tiles of floor his whisker wants ahead of him before he commits to a heading.
    dashRange: 4.5, dashSpeed: 9 * TILE, dashTime: 0.82, dashTurn: 2.6, dashSkew: 0.45,
    dashStart: 0.45, dashRamp: 0.16, dashLook: 0.9, orbitLook: 1.1,
    flooredTime: 0.7,
    dodge: 0.38, dodgeCd: 1.2, dodgeSpeed: 15 * TILE, dodgeTime: 0.2,
    circle: 2.6, circleFlip: 0.9, lungeCd: 1.8, retreat: 0.45,
    flipGap: 0.4,       // s after the ring turns him round before a wall may turn him round again
    ringIn: 1.5,        // times `circle`: further out than this he runs the route in, not the ring
    packGap: 7, packWait: 0.55,   // one hound runs in at a time; the rest hold the ring
    dazeMul: 2.6,       // the scream is the answer to a pack, and it has to read as the answer
    flingMul: 1.3,      // light enough that a headbutt really throws it
    trapSense: 0.95,    // a hound reads the room better than the men do
    // Reached for once BY THE COLLAR is swallowed: it springs back `hop` tiles out of the mouth over
    // `hopTime` seconds and the grab is spent the same as a throw, so a hound is still never held.
    hop: 1, hopTime: 0.18,
    // A hound running on reflex keeps running on reflex even alight: it still darts, orbits and
    // bites, and only the burn itself takes it down. See `TUNING.butcher.immune` for the same flag.
    immune: { blunder: true },
  },
  // The Seer never closes. He paints a rune where you are standing and blinks away when you get near.
  // Two hits, like the Butcher — but unlike him he can still be grabbed, carried and thrown.
  seer: {
    radius: 11, speed: 0.55 * CULT_PACE, sight: 11, cone: Math.PI * 0.62,
    keepMin: 5, keepMax: 9, damage: 1, hp: 2,
    castWind: 0.8, castCooldown: 2.5, runeRadius: 1.4, runeFire: 2.0,
    // A third fewer blinks than he used to get (3.0 → 4.3, which is 0.7 of the old rate). A mage who
    // re-sited himself every three seconds was a fight you could not close on: every approach you
    // committed to was answered before it arrived, so the counter-play was to wait rather than to
    // move. The longer gap is the window — he still leaves when you get near, he just cannot do it
    // twice in the time it takes you to cross the room after him.
    blinkRange: 3.2, blinkDist: 5.5, blinkCooldown: 4.3,
    // His own fire burns him like anybody's — he is simply better than anybody at not standing in
    // it. `fireCare` is how much further than a clubman he reads flame from, `trapSense` the floor
    // under his trap roll, and he will not blink onto ground that is alight or about to be.
    fireCare: 2.2, trapSense: 0.97,
  },
  // The wraith. It is not there most of the time: no body, no collision, nothing to hit, and walls
  // are not walls to it. It becomes real only once it has worked its way onto your flank or your back
  // and started to swing — and from that moment it cannot stop, so the window it opens to hurt you is
  // the same window you get to unmake it in. Face it and it can do nothing. Turn away and it arrives.
  wraith: {
    radius: 12, speed: 0.806 * CULT_PACE, sight: 17, cone: Math.PI * 2,
    reach: 1.08 * TILE, windup: 0.52, swing: 0.14, damage: 1, knock: 1.2 * TILE,
    hp: 1, flooredTime: 0.6,
    // It closes a third faster than it used to, and it does not stand still even once it has
    // committed: a beat of windup that does not follow a goat stepping back read as it having
    // aimed at where he used to be rather than at him.
    windupPull: 26,
    standoff: 1.15,     // tiles behind you it wants to be before it commits
    behind: 1.15,       // radians off your facing: inside this cone in front of you it cannot manifest
    flank: 0.2,         // margin past that cone for the line it drifts in on, so its approach is
                        // never one it cannot finish. Each one rolls its own angle, left or right,
                        // anywhere from your shoulder to your back — a pack arrives from every side
    lurk: 0.24,         // it has to hold your blind side this long before it commits, so sweeping
                        // past the back of your head is not the same thing as getting behind you
    manifest: 0.26,     // becoming real: the one beat of warning you get
    solidAfter: 0.8,    // how long it stays real once the blow has landed — the punish window
    fadeCd: 1.5,        // and how long before it can line another one up
    bossFade: 2.2,      // a boss that loses a heart goes straight back to mist for this long
    driftWobble: 0.7,   // how much it wanders while it closes, so a drift does not read as a missile
    trapSense: 1,       // nothing in the room can touch it while it is mist, so nothing in it matters
    // A dead thing does not catch an ordinary flame, does not lose its head to a scream (`daze`
    // freezing it mid-manifest was a workaround for not having this at all), and BY THE COLLAR
    // already had nothing to close on. Witchfire still burns it — that is a Seer's doing, not a
    // hearth's. Toggled from the ENEMIES tab; `Enemy.ignite` / `daze` / `Goat.tryGrab` read it live.
    immune: { fire: true, stun: true, grab: true },
    // Hiding. A wraith can lie in the room as something else — a box, a bowl of milk — before you
    // have ever seen it. `start` is the chance it begins that way, `again` the chance it goes back to
    // it after a blow once the goat is `minDist` tiles off. Headbutting or reaching for anything
    // within `springR` tiles of it, or stepping within `touchR` of it, and it is on you at once from
    // whatever side you are on: `springWind` of windup and the swing.
    hide: { start: 0.4, again: 0.35, minDist: 5, springR: 2.6, touchR: 0.9, springWind: 0.3, milk: 0.4 },
  },
  // The cleaver used to cover half a room: two and a half tiles out from a body already twice the
  // size of a man's, through a hundred and twenty degrees, which is a swing that hits you where it
  // plainly is not. Two tiles and ninety-nine degrees now — half the ground, to the square foot —
  // and he still out-reaches a clubman, which was the only thing that number was ever for.
  butcher: {
    radius: 20, speed: 0.6 * CULT_PACE, sight: 9, cone: Math.PI * 0.7,
    // A third heart (playtest read three as a clubman with a bigger frame) and a longer arm: his reach
    // used to sit even with a clubman's, which a body twice the width should never have to share.
    hp: 4, reach: 1.35 * TILE, windup: 0.88, swing: 0.2, recover: 0.62, arc: Math.PI * 0.55, damage: 1,
    // The charge itself was the read on him — too rare, too far off, too slow between them. He asks
    // for less ground to build one on and gets back to full speed on it sooner.
    chargeMin: 3, chargeWind: 0.6, chargeSpeed: 14 * TILE, chargeTime: 1.1, chargeCooldown: 1.7, stun: 1.5, stagger: 0.4,
    // The charge is aimed at where the goat stood, not at the far wall: it runs `chargeOver` tiles
    // past that spot and skids out over the last `chargeSkid` seconds. Run the whole `chargeTime`
    // every time and a sidestep sent him fifteen tiles into whatever was behind you — he read as a
    // man bouncing off every wall in the room. Only a goat with his back to the stone gets him stunned.
    chargeOver: 2, chargeSkid: 0.18,
    // He aims the charge at where you are going, not where you stood: `chargeLead` of the way there
    // at your present speed, never more than `leadMax` tiles ahead of you. The strip on the floor
    // swings with it through the windup, so the lead is read, not guessed.
    chargeLead: 0.6, leadMax: 2.2,
    // With furniture between him and a clear run, he looks (every `laneLook` s) for a spot up to three
    // tiles to the side with a line on you, and gives walking there `laneTime` s before he gives up.
    // `laneStill` s without closing on the spot and he drops it; within `laneAt` tiles he is on it.
    laneLook: 0.6, laneTime: 1.4, laneStill: 0.35, laneAt: 0.35,
    burnTick: 1.0, burnHearts: 1,   // he comes out of a fire scorched and one heart down, not dead
    // Alight he does not run from it — he comes at you: `speed` times his stride, and every windup,
    // swing and recovery runs at `tempo` times the clock.
    rage: { speed: 1.5, tempo: 1.5 },
    // He still catches and still bleeds hearts for it — what he does not do is lose the room to it.
    // Fire that takes his head along with his hide read as the flame doing the fight's own work.
    immune: { blunder: true },
  },
  // The rat ogre: what the mouse in the wall turns into on the third blow. He is not on the curve —
  // nobody meets him who did not go and make him — and he is built to be dear rather than to be
  // beaten: the horns do nothing to him standing, he is never flung, no wall ever kills him, he
  // does not catch, and a scream only breaks the swing he was winding up. What hurts him is a hit
  // landed while he is DOWN (a crate or a shield in the face floors him — that is the window), a
  // blade thrown or carried, a bullet, a body thrown into him at killing speed, the wheel, and the
  // bomb. `hp` six of those. `stagger` is the beat he takes a hit standing; `emerge` the beat he
  // spends coming out of the hole. He walks round the wheel and the grating every time (`trapSense`
  // 1) and never blunders in fire because he is never in fire. He also swings at the cult — whoever
  // is nearest him and in his sight, the goat or a man — so the way to spend him is to walk him
  // into a room that is already full.
  ratogre: {
    radius: 22, speed: 0.78 * CULT_PACE, sight: 14, cone: Math.PI * 2,
    hp: 6, reach: 1.4 * TILE, windup: 0.72, swing: 0.18, recover: 0.5, arc: Math.PI * 0.6, damage: 1, knock: 1.5 * TILE,
    stagger: 0.35, emerge: 0.7, trapSense: 1,
    immune: { fire: true, witch: true, stun: true, grab: true, blunder: true },
    // A man off his arm is hurt as well as thrown: a heart off him, and he goes across the room as a
    // thrown body at `flingSpeed` — whoever he lands on goes down with him, and a man with nothing
    // left in him who lands on nothing dies where he stops.
    flingSpeed: 14 * TILE,
    // He does not walk, he bounds: `dist` tiles a leap, a crouch of `wind` you can read, `air` seconds
    // off the ground and `land` of getting up again. Where he comes down, everything inside `radius`
    // tiles is hit the way his arm hits — the goat for `damage` and thrown out by `knock`, a man hurt
    // and flung. The spot is drawn on the floor from the moment he crouches.
    // `minHop`: a leap shorter than this (tiles) toward his prey counts as pinned, and he bounds
    // sideways round whatever pinned him instead (`Enemy.hopSpot`).
    hop: { dist: 3, wind: 0.34, air: 0.42, land: 0.36, radius: 1.35, damage: 1, knock: 1.4 * TILE, lift: 26, minHop: 1 },
  },
  // What a man makes of the room he is running through. Trap sense is rolled per man, so one of them
  // in a crowd reads the Mill wrong and rides it into a wall while the rest step round.
  ai: { senseMin: 0.5, senseMax: 0.95, blindFor: 0.9, rollGap: 0.7,
    leash: 3.5,        // tiles an idle man drifts from where he was put before he is walked home
    millLead: 0.6,     // s of arm sweep he looks ahead before deciding a spot is taken
    millClear: 15,     // px of berth he wants round the arms: stepping to the very edge is not enough
    trapLook: 30,      // px past his own radius he checks for a wheel or a brazier (flame he reads later)
    feel: 5,           // px past the two bodies where being walked into counts as being seen
    wake: 0.5,         // tiles past the edge of the screen a man has to come before he starts to live
    wanderSpeed: 0.28, // fraction of his own speed a man not yet aware of you moves at, idling
    wanderClear: 1.4,  // tiles ahead an idle turn is checked for wall before he commits to facing it
    millNotice: 0.35,  // s the Mill lesson's two men plant and face you before either one moves
    noticeNear: 3,     // tiles: spotted this close, there is no doubt, and he closes at once
    noticeFar: 12,      // tiles: spotted this far or further, the doubt is at its longest
    noticeMin: 0.35,   // s of doubt at noticeNear
    noticeMax: 1.3,     // s of doubt at noticeFar and beyond
    chaseNoise: 3,     // chance a second of noise off a man in full pursuit — the herd is not quiet
    ownNoise: 1,       // tiles: a cult noise this close to a man is his own shout or swing, and he never goes to see it
    routeNoise: 3,     // tiles: a noise this near the goat is investigated down the route, not in a straight line
    roundOut: 0.45,    // how much a man stepping round a brazier also leans out of its heat, of his own heading
    // The route (`Enemy.pathDir`). The flow field is tile to tile and knows nothing about a body's
    // width or the furniture: he walks it `ahead` tiles forward and heads for the furthest point of it
    // a body `bodyMul` of his own width reaches in a straight line, and looks again every `every` s
    // or when he is within `reach` tiles of it. `stuckCheck` s with less than `stuckMove` tiles of
    // ground covered and he is pinned: he steps off along the most open heading for `unstick` s.
    // `wideR` px and wider, a body walks the second field, the one with no one-tile gaps in it.
    path: { ahead: 7, bodyMul: 0.9, every: 0.22, reach: 0.45, stuckCheck: 0.5, stuckMove: 0.3, unstick: 0.45, wideR: 17 } },
  physics: {
    splatSpeed: 11 * TILE,
    flungDrag: 3.5,
    flungFloorSpeed: 3.5 * TILE,
    knockHitSpeed: 7 * TILE,
    // A body arriving on another body this fast kills it, the way a wall does. Two men standing
    // together used to be the safest place in the room — the first one bowled the second over and
    // both got up — which read as the game saying that men are not part of the geometry. They are.
    bodyKillSpeed: 10 * TILE,
  },
  fire: {
    spread: 0.48, burn: 3.0, pool: 4.5, burnRunTime: 2.0, burnRunSpeed: 6 * TILE,   // spread was 0.4; a burning tile catching its neighbour that fast read as too eager
    witch: 3.6,        // the Seer's fire: colder to look at, and no coat turns it away
    avoidLook: 18,     // px past his own radius a man checks before walking into flame
    // Hay (or grass) about to catch from the tile beside it (`Renderer.drawCatching`): up to
    // `embers` cells of `cell` px wake in it as the neighbour's spread fills, rising `rise` px and
    // looping `flicker` times a second, never dimmer than `glow`; under them a smouldering band of
    // cells along the foot of the tile, up to `base` alpha. A playtest death went from three
    // hearts to none down a hay line nobody could see was about to go.
    catch: { embers: 10, cell: 3, rise: 26, flicker: 1.2, glow: 0.8, base: 1 },
  },
  // Three things can be wrong with a man at once — poisoned, stunned (the stars: `daze`), alight —
  // and where two of them meet they react. Every number of it is here, and the STATUS tab of the
  // tool draws and edits this block as it stands. `js/status.js` is the only code that reads it.
  status: {
    // Poison blinds and slows. Blind is the ranged half of him gone: no rifle, no rune. Slow is his
    // stride (`moveMul`) and his own clock (`tempo`: windup, swing, recovery, reload all run at it).
    poison: { time: 4.5, moveMul: 0.55, tempo: 0.6, pool: 5.0 },
    // POISON meets FIRE: it goes off. `hitR` tiles is a hit on everybody inside it (a heart off a
    // big man, the end of an ordinary one); out to `radius` it only throws, and the wall finishes it.
    blast: { radius: 2.2, hitR: 1.1, impulse: 11 * TILE, goatPush: 300 },
    // POISON meets STUN: SHOCK. No hit — it used to be one, and a poisoned crate in the face killed
    // a man outright, which is a win button in a game where kills come from geometry. Now both
    // statuses are stretched to `stun` / `poison` seconds and he stands there in total shock, frozen
    // and blind, one mark over his head for the pair: the window to put him into a wall.
    sting: { stun: 4.0, poison: 6.0 },
    // STUN meets FIRE: the fire does `damage` hits rather than one. The stun is spent.
    scald: { damage: 2 },
    // The goat's own poison. SPLASH reaches `range` tiles and only behind him (`back` is the cosine
    // past which a man counts as behind). A puddle's `half` is tiles either side of the centre one,
    // so 1 is three by three.
    splash: { range: 1.5, back: -0.2 },
    jaw: { half: 1 },
    tumble: { half: 1 },
    spit: { speed: 12 * TILE, range: 7.5, half: 1 },
    // A charged throw goes off like a small bomb where it lands.
    charge: { radius: 2.2, hitR: 1.1, impulse: 12 * TILE, goatPush: 320 },
  },
  prop: {
    // A door is the one thing in a corridor that can hold you still, and holding you still in a
    // corridor is worth more than the shortcut was: three blows, and the first two only splinter it.
    // Two kinds. A plank door in a corridor is one blow and gone — it is a thing to run through,
    // not a wall to stand at. Iron is the other answer: it takes `ironHits` and it is never on the
    // way out of a room, only on the way into somewhere you did not have to go.
    // Three kinds of door and three prices. Planks go on the first blow — a door in a corridor is a
    // thing you run through, not a wall you stand at. Iron does not go, and that is the whole of its
    // value: it cannot be shouldered open by anybody, so the only way past is three blows and the
    // noise of three blows, with whatever heard the first already coming. The soul door — the vault's,
    // the one with a tome behind it — is four, because it is the only door in a level that is not on
    // the way anywhere: you go to it on purpose or you never see what is in it.
    // `stairHits` is the door at the top of every level. It is iron, so nobody opens it for you and
    // nothing shoulders it: the last thing you do on a level is stand still and break it, with
    // whatever is left of the level walking toward the noise.
    // `clockFor` is the fourth kind, and it is the only door in the game that is on your side to
    // begin with: a heavy iron one already swinging shut under its own weight, which stands OPEN
    // when you first see the room in front of it and is an ordinary three-blow slab once it seats.
    // Beat it and you paid nothing and it falls shut between you and whatever was chasing you; miss
    // it and you pay the three blows and the noise of them, standing still in the open — the price
    // every other iron door charges anyway. It is the one place in the world (rather than in the
    // score) that says *run, don't fight*, which is why the count matches `score.perRoom`: the door
    // becomes a wall at one room's par, so beating par is what buys the free way through.
    // It closes on a curve rather than evenly — `clockEase` under 1 holds it near-open for most of
    // the count and slams it at the end, which is the tell, since a door creeping shut at a steady
    // eight degrees a second is a door nobody notices is moving.
    // `r` is the door's own half-span across the gap it hangs in (see `collideEntities`'s rectangle
    // test) — it has to cover close to the full two-tile opening or a diagonal run slips past a
    // corner. `thick` is what it is along the other axis: the slab itself is 13px in the painted
    // art, so a goat walking straight at its face used to be stopped a whole extra tile short of it
    // by a plain circle of radius `r` in every direction at once — the "why can't I get near the
    // door" gap.
    // `reachSlack`: extra px a headbutt reaches for a door beyond what it reaches for anything else.
    // A door hung flush in a wall (the vault's, the stairs') holds the goat's nose exactly at the
    // bare reach, so the blow landed or missed on float rounding.
    door: { r: 29, thick: 16, reachSlack: 12, openPressure: 0.9, smashSpeed: 6 * TILE, hits: 1, ironHits: 3, vaultHits: 4, stairHits: 3,
      clockFor: 12, clockEase: 0.5 },
    table: { r: 21, drag: 4.5, killSpeed: 5 * TILE, pushSpeed: 2.2 * TILE },
    // A lamp post is not a pillar: a body arriving at `knock` goes through it and it goes over,
    // and it pours its oil where the body is about to land.
    lamp: { r: 9, poolRadius: 1.2, knock: 4 * TILE },
    // The brazier is a thing you can use without a man in it. A headbutt knocks a spill of coals
    // out of the far side of it — `spillAt` tiles beyond the bowl, `spill` tiles across, alight for
    // `spillTime` — and the bowl needs `spillCd` to build the heat back. Short, so it is a line you
    // draw across a doorway for a beat, not a fire you keep pressing for.
    // `roast` is the chance each brazier is a campfire with a crocodile turning on a spit over it
    // instead of a bowl, capped at one a level: at 0.02 about one level in four has one, so it is a
    // thing you come across rather than furniture. Nothing but the drawing changes: it lights,
    // spills and burns exactly as a bowl of coals does. Picked off the tile, not the generator's rng.
    brazier: { r: 13, spillAt: 1.1, spill: 1.05, spillTime: 1.7, spillCd: 3.0, roast: 0.02, roastTurn: 0.8 },
    // A patch of sprouted grass is not a lucky find. `every` is how many rooms a level may go
    // without offering one; the level's own `heals` is a floor under that, and the generator spaces
    // them rather than scattering them, so a run never opens six doors in a row on nothing.
    // It is grazed, not grabbed: `grazeTime` is how long the goat has to stand in it, near enough
    // and slow enough (under `grazeSpeed`), before it pays out, so running through on the way past
    // does nothing — the whole point is that it costs a beat of standing still in the open.
    // `gapMax` is a hard cap rather than an average, and only bites from level 4 on: the forced
    // rooms a late level carries — two or three arenas, the mill, the vault, a killbox — crowd
    // together and can push a band's nearest eligible room well past what `every` promises on
    // its own, so a run into the back half of the game could go six or seven rooms on nothing.
    // `bigGain` is the hearts in the big grass a secret wall gives up (`big: true`); milk is one.
    heal: { r: 12, pickupR: 22, every: 4.5, gapMax: 4, grazeTime: 1.4, grazeSpeed: 30, bigGain: 2 },
    // The cave's stone teeth (`TUNING.cave.spikes` is where and how hard). Not blocking — a thing
    // you cannot walk into cannot hurt you, and the whole point of it is that it does — so it is
    // floor to the flow field and a hazard to anything with eyes. `r` is what a body has to touch;
    // it is deliberately under a half tile, because a wall's foot is a thin place to stand.
    spire: { r: 11 },
    // The gong. It was noise and nothing else, which made it the one thing in a room you could not
    // read. Now it pays: a stretch of speed and quick hands, bought by telling the whole floor where
    // you are. In an empty room that is a terrible trade. In a full one it is the best one you get.
    bell: { r: 14, buff: 8, speedMul: 1.5, cooldownMul: 1.5 },
    // The crate, and the only thing in the game you pick up off the floor and throw. There used to
    // be a pot as well, drawn as a circle, and a circle on a floor of squares reads as a plate or a
    // puddle rather than as a thing to lift: every one of them is a crate now. Small — a box you can
    // carry in your teeth is not a crate a man packs — and plain, because everything it has to say
    // is *pick me up*. A thrown one does not trip a man, it takes his legs and his head with them,
    // and he lies there seeing stars long enough that you can do something about him.
    // And what a box of dry boards does when it is thrown into a fire: it goes up. Wider than the
    // flame that lit it and burning longer, so a brazier plus a crate is a room you have closed.
    crate: { r: 10, stun: 2.8, burst: 2.1, burstTime: 6.5 },
    // THE BARREL. Too heavy to lift and too round to stay put: a horn tips it over and it rolls the
    // way it was hit at `roll`, losing `drag` of its speed a second, until something stops it. Every
    // man it meets above `knockSpeed` is bowled along its line at `fling` of its speed, seeing stars
    // for `daze` s once he lands, and it keeps `keep` of that speed for the next one. The barrel kills
    // nobody; the wall he lands on does, and the dazed row is the goat's to finish. A
    // body thrown into a standing one at `knock` sets it rolling at `pass` of the body's speed, and a
    // barrel rolled into another hands it on the same way. Past `breakSpeed` it comes apart on
    // whatever stops it; slower, it lies there and can be butted again. It is lamp oil: a flame
    // under it, or a burning man against it, lights it, and `fuse` s later it goes up `burst` tiles
    // wide for `burstTime` wherever it has rolled to. Into a brazier it goes up at once.
    // `fuseDraw` is the flame on its lid, in world px, one size for the whole fuse (a flame's size
    // picks its baked frames and must not be animated). `spinEvery` is the tiles of travel per
    // quarter turn in its drawing, and `draw` its width in world px. Rolling, it knocks on the stone
    // once every `staveEvery` of those turns (`sfxStave`). A Butcher it meets staggers `stagger` s
    // and it comes back off him at `rebound` of its speed; `side` is how far to his own side a bowled
    // man goes, against the barrel's line.
    barrel: { r: 12, roll: 16 * TILE, drag: 0.55, fling: 1.35, keep: 0.8, knockSpeed: 3 * TILE,
      breakSpeed: 6 * TILE, stopSpeed: 0.6 * TILE, knock: 5 * TILE, pass: 0.8, daze: 1.8, fuse: 1.6, burst: 2.6,
      burstTime: 7, fuseDraw: 8, spinEvery: 0.55, staveEvery: 2, draw: 26, stagger: 0.3, rebound: 0.2, side: 0.35 },
    // A rare find rather than a tool: grabbed and thrown exactly like a crate, but armed the moment
    // it leaves the goat's mouth (`Prop.fling`) rather than breaking on the first thing it hits, so
    // it comes to rest wherever it lands and counts down from there. `nearR` is the two-heart
    // half — the goat pays the same falloff his own blast does, `TUNING.goat.bomb` — everything out
    // to `blastR` is the one-heart ring, and anyone that far out who is not killed outright is flung
    // rather than hurt directly, same as a headbutted man's own charge.
    // `chance` used to be rolled against a secret niche, which meant the rare find that could hurt
    // a room most sat tucked behind a wall with nothing but the goat standing near it when it went
    // off. It is placed on its own now, in whichever ordinary room of the level scores the most
    // threat, so the one bomb a level carries lands where a room is actually worth throwing it into.
    // A boulder on the cave floor (level eight). Not a thing you lift: it stands where it fell,
    // stops a body, a bullet and a thrown crate like a wall does, and a man knocked into it at
    // killing speed dies on it the way he dies on stone. Unlike stone it gives — `hits` blows and it
    // is rubble — so a boulder between you and a room is a choice rather than a detour you have to
    // take. It is never in the way of the only way through: the generator only sets one down on
    // open floor with a clear tile all round it (`GEN_RULES.rocks`).
    rock: { r: 14, hits: 2 },
    bomb: { r: 11, fuse: 1.6, blastR: 1.5 * TILE, nearR: 0.56 * TILE, dmgNear: 2, dmgFar: 1, impulse: 20 * TILE, chance: 0.45 },
    // A stand of arms. Grab what is in it, carry it, let go to throw it. The sword goes through
    // the first man it finds; the shield knocks a row of them flat and turns bullets while carried.
    weapon: {
      r: 11, standR: 13, throwMul: 1.35, drag: 1.4, restSpeed: 3 * TILE,
      stickImpact: 6 * TILE,  // a scrape along a wall does not end a throw; a proper hit does
      // How much of its speed a thrown shield keeps off a wall or a prop it did not stick in. A
      // sword snaps there; a shield rings off and keeps going, which is the whole of why it is worth
      // throwing at a room rather than at one man — it can still reach a second wall, or a second man.
      shieldBounce: 0.6,
      swordStun: 1.6,        // what a sword does to a Butcher, who does not go down to one
      shieldStun: 2.8,       // how long a man the shield bowls over stays down, dazed the same way a
                              // scream leaves him
      // What one is worth before it is scrap, so neither can be dragged through a level. A blade is
      // one throw: it goes into whatever it finds and snaps there. A shield came down to two men or
      // two bullets — three read as a thing you carried through half a level rather than a thing
      // spent on a room.
      // A sword is two now as well: two men, or a man and a wall. It cuts whoever the blade touches
      // while it is still in his teeth (`cutGap` seconds between two cuts), so it is the strongest
      // thing in a room and `swordShare` is what keeps it rare — the share of a random stand that
      // is a blade rather than a shield.
      uses: { sword: 2, shield: 2 }, cutGap: 0.35, swordShare: 0.3,
      // The shield is drawn this much bigger than it was, on the rack and in the mouth alike.
      shieldScale: 1.45,
      // What a carried shield covers. It was a circle the size of the shield itself, which meant
      // almost everything aimed at the goat went past the edge of it and hit him anyway — a shield
      // that does not stop the shot is a shield that reads as broken. It is an arc across his front
      // now: anything arriving inside `coverArc` of where he is pointing is turned, and every turn
      // spends a charge. `parry` is what the man who swung into it has to stand there and eat.
      // Grew with the picture of it: a bigger shield that covered the same arc read as a lie.
      coverR: 38, coverArc: 3.0, parry: 0.45,
    },
    // The pen. Bars sit close enough together that a goat cannot slip between two of them.
    // Seven blows, and the third and the sixth take his feet out from under him. It is meant to
    // read as work: the first thing the goat does in the run is the hardest thing a goat can do.
    // The second time is not the first time. Once a browser has broken the pen once, `againHits` is
    // what it takes and nothing is taken out of him for it: the pen is a lesson, and a lesson you
    // have had is a toll. Everything after the first run of a player starts on the second blow.
    cage: { r: 10, halfW: 2.1, halfH: 1.6, spacing: 26, height: 30,
      hits: 7, stunAt: [3, 6], stun: 1.0,
      strain: ['NNGH', 'IT HOLDS', 'MMMAAAH', 'IT BENDS', 'NNNGH', 'BAAAAH', 'OUT'],
      againHits: 2, againStrain: ['NNGH', 'OUT'] },
    // The other cage in the first room. It gives in quicker than the pen and takes nothing out of
    // him: the pen teaches the verb the hard way, and this is what having learned it is worth. What
    // is inside stopped waiting a long time ago, which is what the last line is for.
    deadCage: { halfW: 1.15, halfH: 0.9, dx: 3.7, dy: -2.5, hits: 3,
      strain: ['NNGH', 'IT GIVES', 'OPEN'], done: 'TOO LATE' },
    // Spike floor, from the third level on. The teeth come up where you have already been: crossing
    // a plate arms it and they follow a moment later, so the trap is the ground you just left. Men
    // read it the way they read the wheel — `lead` is how far ahead of the teeth `hazardAt` calls the
    // tile taken — and the man who fails his trap check is the one you can walk onto it.
    // The teeth. Not a thing standing in the room — a stretch of floor that is not floor: a grating
    // of iron slots the boards were laid over, and what comes up comes up through the gaps. They go
    // down in a patch rather than one at a time, because one grate is a curiosity and a stretch of
    // eight across the middle of a room is a piece of ground you have to decide about.
    spike: { r: 16, trigger: 1.3, arm: 0.5, up: 0.95, down: 0.4, rest: 1.7, lead: 0.3, damage: 1,
      run: [9, 15] },
    // A patch of wall that gives like the pen does: two blows rather than one so it never breaks by
    // accident, and nothing else about it — its size, what it blocks, what it hides — is its own.
    secret: { hits: 2 },
    // The coop: two tiles of slatted crate with a bird in it, standing about in the compound's
    // stores. One blow — two read as a second cage to break before the one ally in the game gets
    // to do anything, and the coop is not the lesson here, she is.
    coop: { r: 26, hits: 1 },
    // The mouse: a trader in a three-tile hole in the wall of a level's middle gate room, on the
    // levels in `shop.levels`. Her language is the game's own — grab is take, a headbutt is rude — and
    // rudeness costs: `lines` are what she says on the first two blows, and the third is the rat
    // ogre; `thanks` is what she says when a talisman is taken and her gate lifts. `r` is small
    // because she is; she blocks nothing and nothing thrown breaks on her. `bob` is her idle.
    mouse: { r: 9, lines: ['PLEASE. NOT THAT.', 'ONCE MORE AND YOU WILL SEE.'], thanks: 'GO ON, THEN. THE DOOR IS OPEN.', squeakPitch: 1400,
      lookUp: 0.34 },   // radians she leans back to look at a goat standing above her
    // A ware on her shelf: an artifact on a stool, one of two, taken for nothing. It is reached for the way
    // a crate is (`Goat.tryGrab`), and reaching for it is the whole of buying it.
    // `readR` is how close he has to be before what a ware does is written over it — the same
    // courtesy a hazard's tell already gets, and the one that matters here: nobody reads a HUD
    // tooltip while running, but a line hanging over the thing itself is read on the way past.
    ware: { r: 10, readR: 2.2 * TILE },
    // The bird. Loose, she trots after the goat at `followSpeed`, hanging back `followAt` tiles and
    // only closing when he gets further than `followFar`; she is a thing that walks with you, not a
    // thing stuck to your heel.
    //
    // A horn under her is the whole of the mechanic (`headbutt` in entities.js — a kick, not a
    // throw, so no new button and no arm in the mouth). She leaves at `launchSpeed`, picks the man
    // nearest the line she was kicked along inside `seekArc`, and from then on steers at `turn`
    // radians a second toward whoever she has. `seekRange` is how far she will look. She loses very
    // little speed in the air (`drag`) because a bird that is aimed and then peters out reads as a
    // dropped ball rather than as a shot.
    //
    // She kills what she reaches and comes apart doing it. A wall is not a man: she tumbles, lands,
    // and is loose again after `stunned` seconds — a miss costs you the walk back to her and the
    // setup, which is price enough for something you had to find and let out in the first place.
    chicken: {
      r: 11, followSpeed: 210, followAt: 1.6, followFar: 3.2, wander: 0.5,
      launchSpeed: 760, drag: 0.35, turn: 7.5, seekRange: 15, seekArc: Math.PI * 0.75,
      stunned: 0.9, life: 4.0,
      // She walks the same flow field the men chase on and steps round anything `hazardAt` calls a
      // hazard, looking `look` tiles ahead. A coop the goat walks past gives on its own once it is
      // `breakOut` of the half-screen behind the middle of the picture, going off its left edge. A hen still with
      // him — inside `saveR` tiles — when he reaches the stairs is worth `saveHearts` for the rest of
      // the run, once a level however many he brings.
      look: 0.9, detourFor: 0.5, breakOut: 0.8, saveR: 8, saveHearts: 1,
    },
    // ---- THE ESCORTS ----
    // Three animals built on the hen's frame and nothing else: found in the first third of a floor,
    // walked to the stairs, and worth something for the rest of the run if they get there
    // (`js/beasts.js`). None of them adds a key — every one is met with the four verbs the goat
    // already has, and the whole difficulty of each is that it does NOT simply follow you.
    //
    // The tortoise is slower than a walk and never catches up: the only ally you advance by picking
    // it up and throwing it forward, one room at a time. Where it lands it pulls in and is a shell
    // — solid, and rounds stop on it — so a thrown tortoise is also the cover you did not have.
    // `cool`: a shell that has taken a round or a blow is on its back for that long — no cover,
    // and nothing to pick up — before it rights itself. One block, then a wait (js/beasts.js).
    tortoise: { r: 13, speed: 42, followAt: 1.4, throwSpeed: 520, drag: 2.6, tuck: 4.0, cool: 6, guardR: 6,
      // What it is worth at the stairs: one more use on every shield in the compound, for the run.
      saveR: 8, saveShield: 1 },
    // The goose does not follow, it leads: it runs down a field grown out of the stairs at its own
    // pace and does not wait for him — it stops only where something shut stands in its way. It honks at any man it can
    // see inside `seeR` — which is a noise, so the room turns and comes for the GOAT, and which also
    // breaks a blow a man has already committed to at any range at all (`balkStun`). A permanent
    // alarm you have to live with, and the one thing in the game that parries across a room. Nothing
    // in the cult ever goes for the goose: it is not a man and it is not the sacrifice.
    // `lead` is how many tiles of the way out it will get ahead of him before it stands and waits:
    // a goose that ran a room ahead raised that room and then stood at its shut door without him.
    // `speed` is above the goat's walk and `hurry` its multiple while he is ahead of it: a leader
    // slower than the goat it leads ended every level twenty-odd tiles behind him.
    goose: { r: 12, speed: 200, hurry: 1.35, seeR: 9, honkGap: 2.2, balkStun: 0.5, lead: 6,
      // At the stairs: the voice carries further and comes back sooner, for the rest of the run.
      saveR: 8, saveScreamRange: 1.2, saveScreamCd: 0.8 },
    // The crow follows corpses, not you. Every room with nothing dead in it, it falls behind — which
    // is the one escort that argues with *run, don't fight*, and it is meant to: it is the price of
    // what it carries out. `markFor` is how long a body still draws it, `perch` how close it settles.
    crow: { r: 11, speed: 230, slack: 0.55, followAt: 2.6, perch: 1.1, markFor: 14, markR: 13, hopGap: 1.4,
      // A body it can SEE it flies to at `flySpeed`, the moment it sees it, and of two in sight it
      // takes the one nearer the stairs — the crow pulls you on into the next room rather than back.
      // Landing on one it says so, once a body.
      // `feedFor` is how long it eats at one before it is done with it and goes on down the road.
      flySpeed: 560, feedFor: 2.5, lines: ['FRESHLY COOKED', 'TASTY', 'STILL WARM', 'MINE'],
      // At the stairs: it has found something. A tier III talisman stands at the head of the NEXT
      // floor's stairs, free, taken the way one of the mouse's is.
      saveR: 8, giftTier: 3 },
  },
  // Where an escort comes from, and how many. `levelDef.beasts` is which of them a floor may hold;
  // the generator picks one at random and puts it in an ordinary room inside the first `third` of
  // the level, clear of the furniture and well in from the way in — first third, because the whole
  // point of one is the walk from there to the stairs. One a level, never in the pen, a rest room,
  // a teaching room or a set piece. `GEN_RULES.beasts` holds all of it.
  // `hp` is how many blows (or touches of fire) an animal takes before it dies, `hurtCd` the beat
  // after one in which nothing else lands. `callR` / `callGap`: a caged one calls out when he is that
  // many tiles off, every few seconds, so nobody walks past a coop without hearing it.
  // `shyR`: a man awake and on his feet this many tiles from the hen or the crow sends it round to
  // the far side of the goat, `shyBack` tiles behind him (`Beast.shy`) — out of the arc of a club
  // aimed at him. `exitEvery`: how often the way out is laid again round furniture that has moved.
  beast: { third: 0.36, clear: 1.2, tellFor: 3.4, pactFor: 3.2, hp: 3, hurtCd: 0.6, callR: 6, callGap: 2.6,
    shyR: 2.4, shyBack: 1.3, exitEvery: 1.0,
    // Getting out of reach: the hen runs `shySpeed` × her follow speed and the crow flies `shyFly` ×
    // its flight speed; within `shyArrive` tiles of the spot it stops; a goat further than `shyFar` ×
    // `shyR` is no cover and it simply backs off from the man.
    shySpeed: 1.2, shyFly: 0.5, shyArrive: 0.4, shyFar: 2,
    // Left behind: past `strayR` tiles it calls every `strayGap` s until it is out of hearing at
    // `strayFar`, and while it is out of the picture a pip `strayEdge` tiles in from the edge of the
    // screen points at it, a size `strayPip` (`Renderer.drawStrays`).
    // `strayJitter` spreads the calls so two strays never call in step; one room from being walled
    // in it calls `strayUrgent` × as often.
    strayR: 11, strayFar: 60, strayGap: 5.5, strayJitter: 0.2, strayUrgent: 0.5, strayEdge: 1.0, strayPip: 0.8 },
  // Going over an edge. A man who goes down a hole is gone; the goat is only rented — he comes back
  // up on the last boards he stood on, one heart lighter, which is the same price the wheel charges.
  // Make it free and the level is a shortcut; make it fatal and nobody goes near the interesting half
  // of the room.
  // `showFor` is how long a man who went over an edge is still on screen turning over. He is dead the
  // frame he crossed the lip — nothing about the fall is simulated — but a body that simply stops
  // existing reads as a bug, and the one death in the game with nothing left at the end of it is the
  // one that most needs to be watched happening.
  // `setback` is how far back in his own last few steps the goat lands, rather than on the exact
  // board his hoof was leaving when the floor gave: coming back flush with the lip meant the same
  // step that dropped him could drop him again, or hand him straight back to whatever was on his
  // heels. `invuln` is longer than an ordinary hit's — coming back up a floor short is not a fight
  // he was ready for, and he is entitled to a couple of seconds to notice that before anything else
  // is allowed to touch him.
  fall: { time: 0.5, back: 0.3, damage: 1, showFor: 0.75, setback: 0.35, invuln: 1.5 },
  // The Mill: a ritual grinding wheel with two sweeping arms. It does not care whose side you are on.
  // Slow enough to read and to time, and its room leaves a lane past it at the top and the bottom.
  // `armLen` is half what it was: a shorter reach asks for a tighter room around it rather than the
  // same floor with a smaller danger in the middle of it, so MILL_TEMPLATE shrank to match.
  mill: {
    hubR: 26, armLen: 2.05 * TILE, armHalfWidth: 0.2, innerR: 20,
    speed: 0.82, impulse: 30 * TILE, damage: 1, hitCooldown: 1.15, goatKnock: 0.3,
  },
  elite: { hp: 3 },
  // The brute: a clubman built twice over. Three separate killing blows before he stops getting up,
  // four when he is the one in the arena. He is how the game says "some of them take more than one"
  // without spending a boss on it, so he has to be unmistakable at a glance — bigger frame, spiked
  // shoulders, a spiked mask, a studded club — and the notches over his head count it down.
  champion: { hp: 3, bossHp: 4, scale: 1.34, spikes: 5,
    // His own arm, not the clubman's: the clubman's got shorter and quicker, the brute's did not.
    reach: 1.0 * TILE, windup: 0.62, swing: 0.16, recover: 0.6,
    // Heavy: a headbutt moves him this much of what it moves a clubman, and he is never carried.
    flingMul: 0.55,
    // The ground slam. Close in (`near` tiles) and off cooldown, `chance` of his attacks are the club
    // brought down on the floor instead: `wind` seconds with the ring on the ground, then everything
    // inside `range` tiles of him takes `damage` and is thrown out `knock`. His own men go over too.
    slam: { near: 1.7, range: 1.9, chance: 0.45, cd: 3.2, wind: 0.8, damage: 1, knock: 1.3 * TILE, recover: 0.8 },
    // Alight, he comes on like the Butcher does rather than blundering (`TUNING.butcher.rage`).
    rage: { speed: 1.4, tempo: 1.4 },
    immune: { blunder: true } },
  // A man carrying a soul is a small boss of his own: `hp` more hearts, a headbutt moves him
  // `flingMul` of what it would, and nothing carries him out of the room. Edited on ENEMIES.
  soulBearer: { hp: 1, flingMul: 0.6 },
  noise: {
    // A coin flip every frame (`Math.random() < dt * 4`) could go a half-second without landing,
    // which is what let a run right up on somebody's back read as silent. `footstepGap` is a timer
    // instead, the same shape as the goat's own hoofprint clock, so running for any stretch always
    // says so; `footstep` came up a tile so the warning is not only heard once you are already close
    // enough to touch him.
    footstep: 3, footstepGap: 0.16,
    chase: 6, headbutt: 5, splat: 8, smash: 8, gunshot: 14, scream: 12, bell: 30, swing: 4, door: 10, table: 9, breath: 10, boom: 16, cast: 7, rune: 11, cage: 13, steel: 9, embers: 6,
  },
  juice: {
    // The master dials, over every call site at once: `screen` multiplies every shake, kick, lens
    // punch and flash, `stop` every hitstop. 1.37 stacked a hit flash, a ring, sparks, dust and a
    // squash on top of a shake and a kick that were already there, and a fight read as the camera
    // having one — the 18 Sep 2026 note was "a bit too much". Turn these before touching the sixty
    // literal amounts in the code.
    screen: 0.6, stop: 0.7,
    // Which shakes are allowed at all. The 22 Sep 2026 note was "do not shake the screen on
    // effects — a little shake, only when you took damage", and it is right: a kill, a crate, a
    // door, a bomb and a gong all shook the picture, so the one shake that is information — you
    // have just lost a heart — was lost in the sixty that were decoration. `shakeOther` is the
    // multiplier on every shake that is NOT the goat being hurt (`game.shake(a, true)`), and it is
    // zero: the call sites all stay where they are, they simply do nothing until somebody turns
    // this back up. `kickOther` is the same idea for the directional shove, which reads as weight
    // rather than as an earthquake and so keeps a third of itself.
    shakeOther: 0, kickOther: 0.35,
    hitstop: 0.07, shakeKill: 9, shakeHit: 6, shakeDecay: 12, deathSlow: 1.6, killSlow: 0.22,
    kick: 7, kickDecay: 11, kickMax: 15, // directional camera punch, thrown away from the impact
    zoomKick: 0.05, zoomDecay: 7,       // the lens shoves in on a kill and settles back
    flashDecay: 6,                      // additive screen flash
    // Kills inside the window stack, and used to stretch time and shake the camera harder with
    // every one of them — which read as the game stumbling over its own feet at the exact moment
    // a run through a room was going well. `comboSlow` and the hitstop bonus below are both cut
    // by more than half: a multi-kill still says so, it no longer breaks stride to do it.
    comboWindow: 2.4, comboSlow: 0.12,
    comboHitstopMul: 0.004, comboHitstopCap: 0.025,
    // The shake and the kick were never cut for a combo kill the way hitstop and comboSlow were: at
    // full value on every kill of a streak, and each one re-triggers before the last has decayed, so
    // a five-kill run felt like it never stopped shaking. `comboShakeMul` is what the second kill of
    // a streak and every one after it actually gets.
    comboShakeMul: 0.35,
    // The plain, non-directional half of a hit taken: the corners of the screen redden and fade
    // over `life` seconds. `alpha` is how dark it gets at its darkest corner.
    hurtVignette: { life: 1.0, alpha: 0.32 },
    // The JUICE tab's own additions (see js/juice.js for where each one comes from).
    // `hitFlash`: seconds a man the horns land on is painted solid white — the frame that says
    // "that connected" before the fling has moved him a pixel.
    hitFlash: 0.07,
    // `impact`: a quick ring and a star of sparks where a blow lands. `ring` is tiles across at its
    // widest, `life` seconds; `killRing` the same for a kill, wider and slower.
    impact: { ring: 0.7, life: 0.16, sparks: 3, killRing: 1.2, killLife: 0.26 },
    // `dust`: soft puffs off the hooves, counts per event. Only a lunge, a roll and a landing raise
    // it: puffs trailing an ordinary run read as fog following him about rather than as a kick.
    dust: { lunge: 3, roll: 4, land: 5, life: 0.4, size: 3.5, grow: 7, speed: 45 },
    // `squash`: a spring on the goat's own scale, on top of the fixed pose per state. `hit` is how
    // hard a landed headbutt squashes him, `hurt` a blow taken, `land` the end of a roll; `freq` is
    // how fast it wobbles and `decay` how fast it settles.
    squash: { hit: 0.09, hurt: 0.18, land: 0.07, freq: 30, decay: 12 },
    // `muzzle`: the one frame of light a rifle shot makes, `life` seconds and `size` px long.
    muzzle: { life: 0.07, size: 18 },
    // `heartbeat`: on the last heart the screen's edge pulses red at `bpm`, up to `alpha`, and the
    // last heart on the HUD throbs by `throb` of its size.
    heartbeat: { hp: 1, bpm: 78, alpha: 0.2, throb: 0.18 },
  },
  // The corner of the screen that says what you have and what your buttons are doing. It was sized
  // to stay out of the way and succeeded too well: a first-time player found the hearts and the rail
  // after the level rather than during it. `scale` multiplies the whole top band — hearts, rail,
  // count, clock — and nothing else: the cards, the menu and the floor text keep their own size.
  hud: { scale: 1.05 },
  // THE FOG. A room is opened by walking into it and never closes again — that is `room.seen`. This
  // is the other half: what a partition hides from where he is standing right now. `shade` is how
  // far down anything out of his line of sight goes, and `radius` how far the line is cast at all
  // (past it the room is drawn as it always was, so a big hall does not end in a black wall).
  // `res` is how many pixels of the mask one tile gets before it is blown up over the world, which
  // is the whole of how soft the edge of a shadow is: at 1 a shadow fades over a tile and reads as
  // a smudge, and at 2 it fades over half of one and reads as an edge.
  // `shade` was 0.8: dark enough to hide a man standing still, not dark enough to hide one moving —
  // a red hood or a rifle's silhouette read through it from across a room that had not been opened,
  // which gave away what was coming before the door did. Raised to keep the room's contents a
  // shape you cannot name rather than one you can. 0.94 read as a hard black edge anywhere a forced-
  // lit patch (a secret niche) sat next to ordinary shadowcast, so backed off a step to 0.9 — still
  // much darker than the original.
  // `oracle` is THE ORACLE's reach through stone, in tiles. Past it the ordinary cast still decides,
  // so the far corners of a room stay the dark they always were.
  fog: { shade: 0.9, radius: 26, res: 2, oracle: 11 },
  // THE DARK (`darkLevel`, drawn by `js/dark.js`): a floor with the lamps out. Only what burns lights
  // the room; the rest is `alpha` of `color` laid over it. `lights` are [radius in tiles, strength]
  // per source, cast through the tiles so no flame lights the far side of a wall. `near` is how far
  // the goat hears, in tiles: inside it the floor comes up to `floor` and whatever stands on it is a
  // silhouette (`sil`, `body`, a `rim` of cold light round it one world pixel wide) — a shape, never a
  // colour or a face. `self` is the patch round the goat himself, [radius, strength], because the
  // player has to be able to read which way he is facing. `eyes` are the kinds whose eyes catch
  // what little light there is and can be seen across a room: `range` tiles, in his line of sight,
  // never from behind. Per kind [core, glow, height above the foot, forward on a side view, half
  // the gap on a front one], sprite px. `lamps` is what the generator adds so the level is pockets
  // of light and not one black room: a room with nothing alight gets one lamp per `per` floor tiles,
  // `min`..`max`, against a wall, `apart` from any other flame and `door` from any doorway — except
  // `unlit` of those rooms, which are left black on purpose. A lamp is a lamp: a headbutt tips it, the
  // oil burns a while, and then that room is black too.
  // `soften` is the other half of the deal: a floor you cannot see is a harder floor, so the curve
  // is cut (`from`, `to`, `ease` pulled toward a straight line, and the head count a room may hold,
  // `men` — late floors sit on that cap, so the curve alone moved nothing), trap rooms and grating are
  // `traps` / `spikes` of what the level had, the killbox goes, and so do the rifles: a hunter
  // in the dark is a gun you cannot answer. The cult is in the same dark (`ai`, `Enemy.canSeeGoat`):
  // out of the light a man sees the goat `sight` tiles and no further (a hound a little more), and a
  // lost trail goes cold in `lose` s, after which he hunts by ear. `lit` is how much of a flame's
  // reach counts as standing in it (`game.litAt`). The seer paints his rune at what he hears, up to
  // `earCast` tiles (`Enemy.hearForRune`), never one inside `earOwn` tiles of himself or of a man of
  // his, and only while it is `earFresh` s old. `runAt` is the floor of every run played dark (index,
  // -1 for none): THE CAVE for now, the one floor near the fourth with no rifle to introduce.
  dark: {
    alpha: 0.98, color: [5, 4, 10], res: 3, flicker: 0.08, maxFires: 140,
    near: 4.5, floor: 0.3, sil: 0.94, body: '#07060c', rim: 'rgba(150,158,210,0.55)',
    self: [1.3, 0.62],
    lights: { brazier: [4.8, 1], lamp: [4.2, 0.95], fire: [2.4, 0.8], burning: [2.8, 0.9], soul: [1.8, 0.55],
      bearer: [2.4, 0.6], exit: [3.4, 0.85], blast: [6, 1], muzzle: [3.4, 0.9], rune: [2.2, 0.55] },
    eyes: { range: 24, blinkGap: [2.2, 5.5], blinkTime: 0.13, cell: 1.2,
      kinds: { seer: ['#efe6ff', '#7d5cff', 27, 5, 2.4], dog: ['#fff2a8', '#f2a233', 16, 13, 2.6], wraith: ['#e6fbff', '#6fc3e8', 28, 4, 2.8] } },
    lamps: { per: 45, min: 1, max: 3, apart: 4.5, door: 2.5, unlit: 0.35 },
    soften: { from: 0.8, to: 0.72, ease: 1, men: 0.7, traps: 0.5, spikes: 0.5 },
    ai: { sight: { all: 3.5, dog: 5 }, lit: 0.75, lose: 1.2, earCast: 9, earOwn: 1.5, earFresh: 0.3 },
    runAt: 2,
  },
  // A worn patch of wall, once or twice a level: `chance2` is the odds of a second one once the
  // first has found a room, so most levels get one and some get two rather than every level getting
  // a guaranteed pair. `carveSecret` in gen.js does the finding; this is only ever the odds.
  // `healChance` is separate from finding the wall at all: most secrets are just the rack, and only
  // sometimes also the rarer, bigger patch of grass — a niche is not a guaranteed heart on top of
  // whatever it already hands over.
  secret: { chance2: 0.35, healChance: 0.4 },
  // THE CAVE (level eight). `roundR` is how round the rock is, in px: every outside corner of a wall
  // tile is a quarter circle of it and every inside corner of the floor is filled in by one, in the
  // collision (`World.collideCircle`) exactly as it is drawn (`Renderer.drawCaveTiles`), so a body
  // slides round a bend in the rock instead of catching on the step of a tile. Half a tile is the
  // most it can be: a lone pillar is then a round boulder of stone, and a diagonal run of steps is a
  // smooth wave rather than a staircase. `erode` is how many tiles of each corner of an ordinary
  // room are filled back in with rock (a diagonal of that many), and `bump` the chance a stretch of
  // straight wall grows a bulge into the room.
  // `shape` is how the rock's edge is cut. 'round' is the first cave: the edge on the tile grid with
  // every corner rounded to `roundR`. 'mid' marches the edge through a field (`World.buildCaveField`)
  // so in places it runs through the middle of a tile — diamonds for lone stones, long slants where
  // the tiles step, and bulges into the floor wherever a slow noise of `midScale` tiles rises past
  // `midFrom`; `midMax` (under one half) is how far into a floor tile it may reach at most.
  // `band` is how many tiles of rock are drawn out from the open floor. Past it the cave is fog,
  // the same way a square-walled level draws one tile of wall and leaves the rest of the hill dark:
  // a cave filled to the edges of the screen showed a great deal of level nobody can go into and
  // cost more to draw than everything standing on the floor put together.
  cave: { band: 2, roundR: 16, erode: [2, 3], bump: 0.12, shape: 'mid', midScale: 4, midFrom: 0.15, midMax: 0.44,
    // THE SPIKES. Most of what grows on the rock is paint — see `Renderer.drawCaveDecor` — but a
    // few of the spires are real: stone teeth standing at the foot of a wall, which is the one
    // thing in a cave that looks as though it ought to hurt and so had better. `chance` is the odds
    // an ordinary room gets one at all (rarely, on purpose: a hazard you meet in every room is
    // furniture), `perRoom` the most it may ever get, `glint` how strongly the wet tips catch the
    // light so they are read before they are walked into, and `damage` the hearts the goat pays.
    // A man does not pay hearts: he dies on them, the way he dies on the grating.
    spikes: { chance: 0.3, perRoom: 1, glint: 0.5, damage: 1 } },
  // Tall grass (level eight), Cult of the Lamb's: it stands over whatever is in it, so a body in it
  // shows from the waist up, and the goat's own eye stops at it — `seeInto` tiles of it are lit from
  // where he stands and the rest of the patch, and what is behind it, is shade. It hides him the same
  // way: a man further than `hideR` tiles off does not see a goat standing in grass, whatever his cone
  // says. A headbutt cuts what is in front of it (`cutR`), fire burns it off, and `lurk` of the men
  // put in a room with a patch in it are put down in the patch instead, still and half-hidden.
  // `patch` is how many patches an ordinary room gets when it gets any, `size` the tiles in one.
  // `burn` is how long a tile of it stands alight before it is ash, `spread` how soon it hands the
  // fire to the grass beside it (hay is `fire.spread`) — a patch goes up as a front, not all at once.
  // `hideR` is the exposed ring, not a stealth one: smaller hides more, since it shrinks how close a
  // man has to stand before his cone can find you at all and grows the ring past it where he never can.
  grass: { seeInto: 1.5, hideR: 2.15, cutR: 1.3, lurk: 0.3, lurkAlpha: 0.55, patch: [1, 3], size: [5, 12], sway: 1.6,
    burn: 2.6, spread: 0.3 },
  // THE SHOP. The mouse does not take the dead any more, and she is not on every level: she turns
  // up on the levels in `levels` (indices — THE YARD, THE THRESHING FLOOR, THE RAFTERS) and stands
  // in the level's MIDDLE soul gate in place of the soul that room would have held (see `gates` on
  // `LEVELS`). Her offer is free and it is a choice: `wares` talismans on her stools, one of them
  // yours, the other packed away the moment you reach for one — and taking it is what lifts the
  // gate out of her room. Each visit stocks the next tier (the first of `levels` is tier one, the
  // second tier two...), so the third mouse of a run is selling the room rewritten. Her third offer is a pail
  // of milk holding `heals` hearts, drunk a heart at a time where it stands. `strikes` is the blows
  // she takes before she turns; the rat ogre's shelf is free once he is down, and still one choice.
  // `spread` is tiles between the milk and each talisman in the row she lays out in front of herself.
  // The mushrooms. `chance` a level (from level index `from`, never the last) that a tuft of them
  // lies somewhere on an ordinary room's floor, plain enough to walk past; standing within `eatR`
  // tiles of it eats it, and the next level is THE TRIP (`tripLevel`).
  //
  // What stands in it does not scale with the floor it replaced. Whichever level the mushrooms are
  // eaten on, the trip is fought at the FIRST level's curve — `threatMul` of it — with `men` to a
  // room and nothing in `kinds` that shoots: with the stick reversed and the buttons swapped, a
  // rifle is not a harder version of a clubman, it is a death you cannot answer with hands that no
  // longer do what you tell them. Mages are allowed, because a rune is a place on the floor and
  // walking out of a place is the one thing the scrambled controls still let you do badly but do.
  // The 22 Sep 2026 note was "very hard with the controls", and this is the answer to it: the
  // controls are the difficulty of the level and nothing else is asked to be.
  shroom: { chance: 0.45, from: 1, eatR: 0.75, eatTime: 1.6, threatMul: 1, men: 1, kinds: ['bearer', 'seer'],
    // The lens on the trip, on top of `drawTrip`'s own warp: how far the picture breathes in and out
    // (`zoom`, a share of the zoom) and how fast, and how far it leans (`sway` px). It is the camera
    // and not the screen — nothing here is a shake, which the goat only ever gets for a lost heart.
    cam: { zoom: 0.055, rate: 0.55, sway: 7, swayRate: 0.31 },
    // Seconds added to the goat's fire tick on the trip: with the hands scrambled, getting out of a
    // flame takes longer, and the flame waits for him.
    burnDelay: 1,
    // On the trip half the blows that land on him never did: he was standing somewhere else all
    // along. `chance` of a hit is undone and he is `dist` tiles away from where it came from, with a
    // line to say so. Never a fall — the hole is real.
    phase: { chance: 0.5, dist: 2.6, text: 'OH, I WAS ACTUALLY OVER HERE' },
    // Across the screen as the trip begins, so the player knows the wrongness is the floor and not the game.
    banner: { time: 4.5, fade: 0.8, text: 'WHOOOOAAA, YOU ARE ON MUSHROOOOMS....' } },
  shop: { levels: [1, 3, 5], wares: 2, heals: 3, strikes: 3, spread: 1.5,
    // The boomerang in flight: its speed, its size against a man, and how long the way back may
    // take before it simply arrives (it curves home through anything; this is the belt to that).
    boomerang: { speed: 11 * TILE, r: 8, homeMax: 3.0 } },
  // THE CLAMP. A room two behind the goat, with nobody alive left in it, is shut for good: its way
  // out goes back to stone under a veil of dark and the room goes black (`game.updateClamps`). The
  // room he has just come out of stays open — that is the one you can still step back into. `slam`
  // is a third of how long the dark takes to come down, `hear` how many tiles off it is heard.
  clamp: { slam: 0.35, hear: 14 },
  // How long the goat stands in the pen before the floor tells it which button opens it.
  cagePrompt: { delay: 5, fade: 1.1 },
  // A beat of thought the moment the pen gives: not a caption, a small comic-panel bubble over his
  // head with her in it, gone before the room needs looking at. `cageThought` counts it down.
  cageThought: 2.4,
  // The scene that opens a run. Seconds per beat, and every one of them slower than it reads on
  // paper: this is the only place in the game where nothing is chasing you, and it is worth the time
  // it takes. The camera comes in over `push` and a little further as they take her; `arrive` is the
  // beat he stands at the gate before he kicks it, `lunge` the beat the club is already up before
  // the goat moves, and `stars` how long the goat sees them after it wakes.
  intro: {
    zoom: 1.4, zoomPush: 1.58, huddle: 6.4, gate: 0.8, gateHold: 0.45, fade: 3.4, black: 2.9, wake: 2.2,
    walk: 98, run: 148, shiver: 0.7, fear: 1.5, bleatEvery: 1.25, stars: 3.2, skipAfter: 0.8, duck: 0.12,
    push: 12, arrive: 1.4, lunge: 0.45,
    club: { knock: 7 * TILE, slow: 0.8, hitstop: 0.12 },
    // Three screens before the pen, so the pen is the end of something rather than the start of
    // nothing: a meadow, the back of a truck, and the dark. Seconds each, and `cloth` is the beat
    // the sacking comes off them in the pen. The bleats are the through-line — `bleat` is the
    // gap between them in each screen, and it closes as the run goes on, so what was two animals
    // calling to each other across a field is by the last screen two animals calling into
    // nothing. `roadSpeed` is how fast the road goes past; `bounce` how much the truck jolts.
    // The meadow has two halves. Until `meet` they are at opposite ends of the field, each on a
    // loop of his own and calling to nobody; over `close` seconds they come together, the heart
    // comes up between them, and from there they run one loop and answer each other — `answer` is
    // how quickly the second bleat follows the first once they have met. People care about the
    // pen because they saw the field, and they care about the field because they saw it start.
    prologue: {
      meadow: 11.0, meet: 4.2, close: 2.2, answer: 0.5, road: 7.0, dark: 3.4, cloth: 1.0,
      bleat: { meadow: 2.4, road: 1.4, dark: 0.62 },
      roadSpeed: 420, bounce: 2.2, zoom: 1.35,
      // A black screen and three words before the field fades up — nothing else in the game opens
      // on black, so this is the one place a player has to be told what kind of scene they are
      // looking at. Held, then the meadow bleeds through it over the second half.
      titleCard: 2.6,
    },
  },
  // The way out is a flight of stairs. The goat climbs them for a moment before the cards, and on
  // the next level it comes up another flight into the first room.
  stairs: { climb: 0.85, climbSpeed: 2.2 * TILE, rise: 16, arrive: 1.1 },
  // Barks: one man at a time, and never the same man twice in a hurry. Quieter than it was — the
  // gap between any two lines is twice what it used to be and a man waits half again as long for
  // his own next one, because a room that shouts on every event stops being read at all and the
  // lines that matter (a rifle calling the line, a man seeing the goat) were lost in the chatter.
  bark: { life: 1.9, gap: 0.9, perEnemy: 7, nearDist: 7.5, nearChance: 0.13, witnessDist: 7 },
  // `crowd` is how many men who know where you are it takes for the score to climb a step: up to
  // `warm` it is the motif and the toms, up to `hot` the kick and the hats, and past it the whole
  // kit. It used to go to the top on five, which is an ordinary room on level three, so the loudest
  // music in the game played through most of the game. It takes a proper crowd now.
  // `hunterCue` is the hiss that says a rifle has you. It is a tell and it has to stay one, but it
  // was a bright noise burst every other bar at most of the kit's volume, sitting right on top of
  // the hats — with a rifle awake anywhere on the level it was the loudest thing in the mix and the
  // music underneath it stopped being audible at all. A third of the gain and half as often: still
  // the one dry tick in the bar that nothing else makes, now under the drums rather than over them.
  // `sfx` came down a fifth from 1.05: the swings, thuds and hits of an ordinary fight were louder
  // than the drums under them, which is backwards for a bus that fires on every blow rather than
  // once a bar.
  audio: { master: 0.92, drums: 1.0, sfx: 0.85, music: 0.85, crowd: { warm: 3, hot: 6 },
    hunterCue: { gain: 0.04, everyBars: 4 },
    layers: { maxPerFamily: 6, pursuitRadius: 8 * TILE,
      sampleSeconds: 0.1, fadeSeconds: 0.30, gain: 0.75, exploreMix: 0.6,
      fullGainVoices: 12, fireGain: 0.11,
      hitBudgets: { small: [0,1,2,3,4,5,6], ranged: [0,2,4,5,6,7,8],
        large: [0,3,5,7,9,11,13], mill: [0,3,6] },
      maxMills: 2, spottedBars: 2, combatHoldBars: 2, calmBars: 1,
      heavyBodyGain: 0.12, heavyEdgeGain: 0.045,
      eventDelaySteps: 8, eventGridSteps: 8, eventQueueCap: 12, eventStackCap: 3,
      killGain: 0.12, actionGain: 0.09, clearGain: 0.1,
      lateFromLevel: 5, blazeThresholds: [1, 4, 10], blazeTailBars: 2,
      grassRadius: 4 * TILE, grassVoices: 3, grassTailBars: 1, grassGain: 0.085 } },
  // The lead point is carried rather than read: on a mouse the aim flips the instant the pointer
  // crosses the goat, and a lead that flips with it throws the whole picture across the screen.
  // `leadLerp` is how fast the camera agrees to the new side, `leadStill` how much of the lead a
  // goat who is not running gets at all.
  // `deadzone` is the window round the follow point the goat can move inside before the camera
  // bothers to react at all — without it every step, however small, re-centres the whole picture,
  // which is what reads as a shiver rather than a pan. `fitMargin` is the room a small room keeps
  // round its walls when it is held centred instead of tracked; see `updateCamera`.
  camera: { lead: 2.4 * TILE, lerp: 7, leadLerp: 3.4, leadStill: 0.3, zoomRest: 1.0, zoomFast: 0.88, zoomLerp: 2.2,
    deadzone: 0.55 * TILE, fitMargin: 2 * TILE },
  // A score is time first and bodies second, so that running is never the wrong answer: pace against
  // par is the whole of it and kills only multiply. Par for a level is its rooms times `perRoom`.
  score: { perRoom: 9, timePoints: 1000, fastCap: 2, killMul: 0.06, killCap: 2.5 },
  held: { bulletsAbsorbed: 2 },
  // A corrupted soul: what a boss leaves, and what the goat swallows to get stronger. It was a tome,
  // which asked the player to believe that a goat reads.
  // `bossChance` and `roomChance` are the level's two surprises on top of its authored count: the
  // odds that one of its bosses carries a soul of his own (he is lit like any man with one, and the
  // card counts it), and the odds that one ordinary fight room gives one up when its last man goes
  // down (nothing says which — it is found by winning). At most one of each a level.
  soul: { r: 13, pickupR: 22, bossChance: 0.4, roomChance: 0.35,
    // Butting a soul gate lays a running trail on the floor from the goat to what opens it (the
    // soul lying in that room, or the mouse's shelf): `time` seconds, a chevron every `gap` px
    // flowing at `speed` px/s. The gate says what it wants; the trail says where it is.
    guide: { time: 3.2, gap: 20, speed: 70, size: 5 } },
  // How long a soul's three cards refuse every input after they appear, so the click that killed the
  // boss cannot also spend what he dropped.
  boonArm: 0.4,
  // The death screen's pull-back. `delay` holds the camera where it died for a beat — the shake and
  // the toll are still landing — before `zoomTime` seconds of easing out to the whole level, margin
  // clear on every side. `sampleGap` is how often a dot goes on the trail `game.pathTrail` draws as
  // a line once the pull-back gets there; `lineWidth` is in screen pixels, not world ones, so the
  // line reads the same thickness at any zoom. `fogAlpha` is how dark a room nobody opened stays
  // once the pull-back reaches it: `Renderer.drawUnseen` reads it in place of full black, so a room
  // that was never walked into still reads as a room on the recap rather than as a hole in the map.
  // `skull` is the screen-pixel size of the mark left on the map where each man went down.
  deathCam: { delay: 0.5, zoomTime: 2.2, margin: 0.88, sampleGap: 0.2, lineWidth: 2.4, fogAlpha: 0.16, skull: 9 },
  // The picture of a cleared floor (`js/painting.js`). `px` is painting pixels a tile — the decal's
  // own 10.9, rounded, so the paint lands a texel for a texel. The level is cut into up to `maxRows`
  // rows (at a column no room stands across, looked for within `cutLook` of a row's width of the
  // even cut) so the whole comes out nearest `aspect`, width over height: a level is six to ten
  // times wider than tall and one strip is a thread on any screen. `gap` and `pad` are tiles of dark
  // between and round the rows. `floorAlt` is the percent of floor tiles in the level's second
  // floor colour, `grass` how green tall grass paints, `unseen` how far a room he never opened sinks
  // back into the rock. The trail is `w` pixels wide on a darker rim; `glyphCell` is a skull's cell.
  // On screen: `reveal` s for the rows to wipe in over a `ghost` of themselves, `arm` s before a
  // press leaves (so the click that climbed cannot skip it), and the box it fits in (`fit`, of the
  // screen, `top` its upper edge). `export` is the saved PNG's pixels a painting pixel; `band` sizes
  // its caption as a share of its width.
  painting: {
    px: 11, maxRows: 4, cutLook: 0.25, aspect: 1.75, gap: 3, pad: 3,
    floorAlt: 35, grass: 0.55, unseen: 0.6, trail: { w: 2, alpha: 0.85 }, glyphCell: 2,
    reveal: 1.6, ghost: 0.16, arm: 1.2, fit: { w: 0.9, h: 0.6, top: 0.17 },
    export: 2, band: { big: 0.03, small: 0.015 },
  },
};

// The first screen, top to bottom. The renderer draws a row per id and `menuPick` acts on one, so
// the order of the menu lives here and in one place. LEVELS is a way onto any floor of the game
// without playing up to it: it is a prototype, and the fifth level is worth looking at on a Tuesday.
const MENU = ['new', 'continue', 'levels', 'best', 'settings'];

// Escape, mid-level, used to drop straight back to the title — which threw away the room exactly as
// it stood and handed CONTINUE a freshly generated level from its own head, so checking a setting or
// an accidental Escape cost the same as dying. This is the actual pause: `game.state` holds at
// `'paused'` rather than tearing anything down, so RESUME is the goat standing exactly where Escape
// caught him, the room exactly as it was. `game.pause` (`index`, `rects`) is its own small menu,
// separate from the title's `game.menu`, though the two share `game.menu.panel === 'settings'` —
// opening the sliders from here draws the identical panel `drawSettings` already knows how to draw.
const PAUSE_MENU = [
  { id: 'resume', name: 'RESUME' },
  { id: 'settings', name: 'SETTINGS' },
  { id: 'quit', name: 'QUIT TO TITLE' },
];

// The switches on the title screen, in the order they are drawn. `key` is the field in
// `game.settings` and nothing else reads them, so adding one is a line here and a line at the use
// site. Both of them are things the game is better off not doing by default.
// `type: 'slider'` rows carry a 0..1 value instead of a boolean — `game.setSliderAt` and
// `game.adjustSlider` are the only things that write them, a drag or a left/right press where a
// toggle would take Space. 0.5 is the middle both start at, which reproduces today's tuned mix
// exactly (`game.applyVolumeSettings` scales each bus by `value / 0.5`), so a browser that never
// touches the row sounds exactly as it always has.
const SETTINGS = [
  { key: 'timer', name: 'SHOW THE CLOCK', note: 'A time counting up in the corner. The level card tells you at the end either way.' },
  { key: 'sound', name: 'SOUND', note: 'Everything at once. M does the same thing mid-run.' },
  { key: 'musicVolume', name: 'MUSIC VOLUME', note: 'The room score and its drums.', type: 'slider' },
  { key: 'sfxVolume', name: 'EFFECT VOLUME', note: 'Swings, hits, voices — the noise of a fight.', type: 'slider' },
  { key: 'layeredMusic', name: 'LAYERED MUSIC', note: 'Switch off to restore the original score.' },
  { key: 'easy', name: 'EASY MODE', note: 'Six hearts to start instead of four, and every blow in the compound takes 40% longer to land.' },
];

// What EASY MODE bends: a bigger cushion of hearts and a slower cult. `applyBoons` adds `maxHp` to
// the goat's base and sets `mods.enemySlow`, which every windup, swing, recovery, cast and reload
// in enemies.js multiplies its own TUNING duration by — the same read-the-mod-at-the-use-site
// pattern boons use, so nothing here mutates TUNING and a normal run is untouched (enemySlow: 1).
const EASY = { maxHp: 2, enemySlow: 1.4 };

// ---------------------------------------------------------------------------------------------
// DIFFICULTY. Everything about who you meet, when, and how many of them, lives here — the generator
// only places what this says. Two rules drive it:
//
//   1. You meet every kind on its own first. The room where a kind is introduced holds that one
//      enemy and nothing else, so you get to read it before it turns up inside a crowd.
//   2. A room is bought with threat, not with bodies. Each room gets a threat budget from the level's
//      curve and is filled from whatever has been introduced, so "harder" means both more of them and
//      worse of them, and one number per level decides the whole shape.
//
// `node tools/balance.js` prints what these numbers actually produce and fails if a rule is broken.

// What one of each is worth. A rifle is not a clubman however you count heads.
// The vault. One small room off the middle of a level, sealed with an iron door, with a tome in it
// and nothing else. Four blows and the noise of them is the price, and none of it is on the way to
// the stairs: it is the one thing in a level you go out of your way for.
const VAULT = { w: 5, h: 5, gap: 1 };

// A room wide enough that simply running its length is a real option gets an iron door standing
// across its own exit more often than an ordinary corridor does: three blows and the noise of them
// is what makes stopping to fight in the open room a better trade than eating whatever is still
// coming when the door finally goes. `w` is tiles of room width; below it the roll falls back to
// the level's own `doorChance`/`ironDoors`.
const BIG_ROOM = { w: 20, doorChance: 0.85 };

// Where a room's way out is allowed to be. A corridor used to leave by whichever row of the far wall
// the dice picked, which now and then put it a tile from the one you walked in through: you came in
// at the top and left at the top, and the room — its men, its pillars, its wheel — was something you
// ran past rather than something you had to cross. `far` is the share of the greatest distance from
// the way IN that a candidate row has to make to be considered at all, so the exit is always down
// the other end of the room and the fight is always between you and it. 1 would be the single
// furthest row every time; a little under it keeps two seeds of a room two rooms.
const DOORS = { far: 0.7 };

const THREAT = { bearer: 1, dog: 1.7, hunter: 2.4, wraith: 2.6, seer: 2.8, champion: 3.2, butcher: 5 };

const ENCOUNTER = {
  // How often a kind is drawn once it is available. Clubmen stay the backbone of every crowd.
  weight: { bearer: 6, dog: 3, champion: 2, hunter: 3, seer: 2, wraith: 3 },
  // What no single room may exceed, whatever threat it was handed. Two mages in one room is a coin
  // toss, not a fight; eight of anything is a wall of bodies rather than a room you can read.
  cap: { seer: 1, champion: 1, hunter: 2, dog: 2, wraith: 3, men: 7 },
  // The set-piece rooms play by their own cap: the Great Hall is supposed to be a wall of bodies.
  hallCap: 18,
  // A boss stands with this much company — unless he is the first of his kind you have seen, and
  // then he stands alone like everybody else on their first appearance.
  escortThreat: 2.5,
  // The room after an introduction eases off: you get one quiet beat to use what you just learned.
  afterIntro: 0.65,
  // The Mill is a kind too. Its room is a set piece you have to read, so it is never the room that
  // introduces a man, and it carries about half a room's worth of crowd — none at all on the level
  // that shows you the wheel for the first time.
  millEase: 0.45,
  // The killbox: two rifles on the far side of an empty room, watching the door you come in by.
  killbox: { men: ['hunter', 'hunter'], near: ['bearer', 'bearer'] },
  // THE CHEAPEST MAN IS NOT THE FILLER. Every other kind has a cap of its own; the clubman never
  // did, so he was whatever a big budget had left over once those caps were full — and a room on
  // the late curve came out as an early room with four more of him standing in it. This is his cap
  // and it is the one that *tightens* as a room gets richer: `max` of him while the budget is under
  // `full`, down to `min` by the time it reaches `none`. Never zero — a clubman is still a body to
  // throw another man into, and a crowd with none of them in it stops reading as a compound.
  // It does not touch a room that was handed its own head count: the Great Hall is *supposed* to be
  // a wall of bodies, and an escort is too small a budget for any of this to reach.
  cheap: { kind: 'bearer', full: 8, none: 22, max: 6, min: 2 },
};

// THE SECOND AXIS. `groundOf` in `rooms.js` measures how much of a room is floor with nothing solid
// within a step — how little of the room is available as a weapon. The crowd curve buys men; this
// buys the ground they are standing on, and a level deals its rooms out along it, tight first and
// open last. Without it the curve could only ever make a late room *fuller*, which is the one way
// of getting harder that pillar 3 says the least about.
// `window` is what keeps it a tendency instead of a running order: the draw takes at random among
// the nearest few templates that fit, so two seeds of a level are still two different levels and the
// rule that holds it is an averaged one. `weight` is what the balance report multiplies threat by to
// get *pressure* — what a room actually asks of you, men and floor together.
const GROUND = { window: 3, weight: 0.5 };

// THE CANON. Every level is about one thing — stone, fire, the line, open ground, the funnel, the
// drop, the niche — and the rooms are how it says so. A room template carries `canon: '<id>'`, a
// level carries `canon: { id, name, idea }`, and the generator builds at least `share` of the level's
// ordinary rooms (everything that is not the pen, a control room or a set piece) out of that pool.
// The rest are the mix: the untagged rooms plus the canons of every level before this one, which is
// "what you already know" and nothing you have not been shown. `minRooms` is how many templates a
// canon has to have written for it before it counts as one; a level whose canon has fewer would be
// the same two rooms over and over. The dev drawer's RULES page and `node tools/balance.js` both
// hold the level to this.
const CANON = { share: 0.5, minRooms: 4 };

// STACKED ROOMS. The chain used to run one way only — every door in the right wall, every next room
// further right — so a level was always "run for the other side of the screen". A level's `stack` is
// the chance a room is hung above or below the one before it instead, reached through a shaft cut
// out of that room's top or bottom wall, and the chain carries on right from there. `gap` is the
// rock between the two, in tiles; `minOverlap` how much of the lower room's width the upper one has
// to share, so the shaft is short. `run` is how many in a row may do it — one, so it reads as a turn
// in the road rather than a tower. Set pieces, the teaching rooms and anything a gate has to narrow
// never stack: they are built for a door in their left or right wall.
const STACK = { gap: [3, 5], minOverlap: 6, run: 1 };

// Boons bend numbers and verbs the goat already has. Actives change what a button does;
// passives change how well everything works. A boss leaves a corrupted soul: three of one kind.
// `skill` is the button a boon hangs off in the HUD rail; the ones without one are body work.
//
// Two of the four buttons start half-shut, and the souls are what open them. A goat out of a pen
// can run, put his head into things, get out of the way, pick up what is lying about, and shout —
// and that is the whole animal. What he cannot do is carry a grown man in his teeth, and his voice
// is a voice rather than a weapon. Each of those is a soul, which is what makes them worth more than
// a number: a half-lit chip is a promise, and the two of them are the shape of the first hour.
const BOON_BASE = {
  // 1.1 rather than 1: every windup, swing, recovery, cast and reload in enemies.js multiplies its
  // own TUNING duration by this, so a tenth added here is a tenth off every kind's attack speed at
  // once, without touching a single per-kind number. EASY MODE still overwrites it outright (1.4).
  maxHp: 4, speed: 1, butcherDamage: 1, fireResist: 1, enemySlow: 1.1,
  // Nothing between him and what is coming, as far as the fog would otherwise let him see. Off by
  // default because the fog is the game reading a room to you at the pace you cross it — this soul
  // is the one that reads it for you all at once.
  oracle: false,
  headbuttReach: 1, headbuttImpulse: 1, headbuttRecovery: 1, antlers: false,
  shieldBullets: 2, holdTime: 8.0, livingShield: false, grabCooldown: 1,
  // LIVING SHIELD's: how often a held man swings at his own side, and what a held rifle's reload
  // is multiplied by. Read only while `livingShield` is on.
  shieldSwing: 0.5, shieldReload: 1,
  // Grab lifts objects out of the pen and nothing else. A crate, a blade, a shield: things a goat
  // could plausibly get its teeth into. A man is BY THE COLLAR, and until that soul is swallowed
  // every trick built on carrying one — the living shield, the strong jaw, devouring — is off the
  // table, because a card that needs a verb you have not got is a wasted card.
  grabMen: false,
  screamCooldown: 3.0, screamRadius: 6.8,
  // How far the bare call carries — the lure, which is the half of the voice every goat has out of
  // the pen. It was a literal off `TUNING.goat.scream.call` at three use sites; it is a mod because a
  // goose walked to the stairs lengthens it (js/beasts.js), and nothing may read TUNING at a use site.
  screamCall: 13,
  // How many more blows every shield in the compound takes. A tortoise brought out is one of these.
  shieldUses: 0,
  // What BAAH is. `call` out of the pen: a noise that pulls the room to where you shouted. `stun`
  // is THE FULL THROAT and `breath` is DRAGON BREATH — the two ways of turning a voice into a
  // weapon, and you get one of them.
  screamStun: false,
  // The roll is the one verb the goat is born with in full. It was withheld behind a soul, which
  // meant the first level was played by a goat who could not get out of the way of anything — the
  // one thing an animal that is running away has to be able to do. What the roll's soul buys now is
  // not the button but the teeth in it: DEAD WEIGHT, and everything the tumble goes through loses
  // its head. He still starts underpowered; he starts underpowered with somewhere to go.
  roll: true, rollDistance: 1, rollCooldown: 1, rollStun: 0,
  // LEAPFROG's and COLD EYE's params, copied in whole by their `apply` (null is off), and what a
  // tuft of grass gives on top of its own heart (FOUR STOMACHS). The pail is milk, not grass.
  leapfrog: null, coldEye: null, grassGain: 0,
  breath: false, bomb: false, devour: false,
  // Off by default: a burning man stops with the man he caught fire from, unless this soul is spent.
  // A depth, not a flag: how many men a fire may be handed down through. KINDLING is 1; the FIRE
  // AMULET's tiers go deeper (`ARTIFACTS`).
  firePass: 0,
  // The talisman at his neck (`game.artifact`, bought from the mouse). Each one bends a rule of the
  // compound rather than a number behind a button: `luck` is read by the generator for the NEXT
  // floor, `boomerang` is what a press of grab on nothing throws, `blink` is what the roll turns
  // into. Null until one hangs there.
  luck: null, boomerang: null, blink: null,
  // The poison actives, one per button, and the charge. `venomHold` / `chargeHold` are seconds a
  // thing has to be in his mouth before the throw carries it; 0 is off.
  splash: false, venomHold: 0, chargeHold: 0, venomRoll: false, spit: false,
};

// How many souls a build can hold, so no one button gets pumped: one active on each of the four
// verbs and two passives under it, and four passives that belong to no button — the body work,
// shown in their own square left of the rail. A `key` boon (BY THE COLLAR) opens half a verb rather
// than bending it, and counts against nothing.
const BOON_SLOTS = { active: 1, passive: 2, general: 4 };

// What a soul is worth to the goat, roughly, for `tools/balance.js`'s third column: threat is the
// numerator of the curve and this is the denominator. A heart is the unit. Anything not named is 1.
// The key that opens half a verb (BY THE COLLAR) and the two actives that turn the voice into a
// weapon are worth more; the passives that only shift a number at the edge of a fight, less.
// Nothing in the game reads it — it is a guess to be argued with, not a rule.
const BOON_POWER = { heart: 1, collar: 1.6, howl: 1.5, breath: 1.5, bomb: 1.3, devour: 1.2, hide: 1.2,
  oracle: 0.6, ember: 0.6, kindling: 0.8, throat: 0.8, leapfrog: 1.1, coldeye: 0.9, stomachs: 0.5 };

// Every boon's tunable numbers live in its own `params`, not buried in `apply`'s body, so the
// BOONS tab of the dev tool can list, show and edit them generically — `apply(m, p)` always
// reads its multipliers off `p` rather than off a literal, the same read-the-mod-at-the-use-site
// discipline `TUNING`/`mods` already follow. A boon with nothing numeric to turn (it only flips a
// flag) simply has no `params`. `emoji` is the one glyph that stands for the boon everywhere it is
// named at a glance — the rail, the hover note, the pick-one-of-three cards. `minLevel` is the
// level index (0 = THE ALTAR) below which the card is never dealt — off by default, so the dev
// tool is the only thing that ever needs to set one.
//
// Two lines of words per card, the way a talisman on the mouse's stool has two: `desc` is one plain
// sentence saying what the soul IS, and `stat(p)` is the literal thing in numbers — tiles, seconds,
// hearts, before and after — built off `p` and TUNING at the moment it is drawn. It used to be one
// line of prose ("everything it goes through loses its head for a moment") that read well and told
// a player choosing between three cards precisely nothing, and two of them were wrong (RAW THROAT's
// "half again as far" was nearly twice as far, and only for one of the four voices). A number
// typed into a sentence goes stale the first time the BOONS tab moves the param under it; a number
// read off the param cannot. `desc` must never carry a number of its own for the same reason.
// Numbers as a card prints them: two places at most, no trailing zeros; a share as a percentage.
const sayN = (v) => String(+(+v).toFixed(2));
const sayPct = (v) => Math.round(v * 100) + '%';
// What poison does to a man, said the same way on every card that makes it.
const sayPoison = () => `POISON: ${sayN(TUNING.status.poison.time)}s AT ${sayPct(TUNING.status.poison.moveMul)} SPEED, NO SHOT OR SPELL`;
const BOONS = [
  // ---- actives: they change what a button does ----
  { id: 'collar', skill: 'grab', active: true, key: true, emoji: '⛓️', minLevel: 0, name: 'BY THE COLLAR',
    desc: 'Grab picks up men, not just boxes. The man in your mouth is a shield, and a thing to throw.',
    stat: () => `HE STOPS ${BOON_BASE.shieldBullets} BULLETS · WORKS LOOSE IN ABOUT ${sayN(BOON_BASE.holdTime)}s · THROWN, HE KILLS WHOEVER HE LANDS ON`,
    apply: (m) => { m.grabMen = true; } },
  { id: 'howl', skill: 'scream', active: true, emoji: '📢', minLevel: 0, name: 'THE FULL THROAT',
    desc: 'BAAH becomes a stun: everyone near you stops dead, mid-swing or not. It no longer calls the room.',
    stat: (p) => `DAZES EVERYONE WITHIN ${sayN(BOON_BASE.screamRadius)} TILES FOR ${sayN(TUNING.goat.scream.stun)}s · ${sayN(p.cooldown)}s COOLDOWN`,
    params: { cooldown: TUNING.goat.scream.cooldown },
    apply: (m, p) => { m.screamStun = true; m.screamCooldown = p.cooldown; } },
  { id: 'breath', skill: 'scream', active: true, emoji: '🔥', minLevel: 0, name: 'DRAGON BREATH',
    desc: 'BAAH becomes fire: a cone the way you are running that lights the men and the floor in it.',
    stat: (p) => { const B = TUNING.goat.breath; return `CONE ${sayN(B.range / TILE)} TILES LONG, ${Math.round(B.halfAngle * 360 / Math.PI)}° WIDE · FLOOR BURNS ${sayN(B.fireTime)}s · ${sayN(p.cooldown)}s COOLDOWN`; },
    params: { cooldown: TUNING.goat.breath.cooldown },
    apply: (m, p) => { m.breath = true; m.screamCooldown = p.cooldown; } },
  { id: 'bomb', skill: 'butt', active: true, emoji: '💣', minLevel: 0, name: 'BOMB CHARGE',
    desc: 'A man you headbutt is lit for a moment: if he dies against a wall or another man in that time, he explodes.',
    stat: () => { const B = TUNING.goat.bomb; return `${sayN(B.fuse)}s FUSE · THROWS EVERYONE WITHIN ${sayN(B.radius / TILE)} TILES · YOU ARE ONLY SHOVED`; },
    apply: (m) => { m.bomb = true; } },
  { id: 'devour', skill: 'grab', active: true, needs: 'grabMen', emoji: '🍖', minLevel: 0, name: 'DEVOUR',
    desc: 'Hold on to a man instead of throwing him and you tear him open. Sometimes that heals you.',
    stat: () => { const D = TUNING.goat.devour; return `KILLS AFTER ${sayN(D.time)}s HELD · ${sayPct(D.healChance)} CHANCE OF +1 HEART`; },
    apply: (m) => { m.devour = true; } },
  { id: 'weight', skill: 'roll', active: true, emoji: '🪨', minLevel: 0, name: 'DEAD WEIGHT',
    desc: 'Your roll is a weapon now: everyone you tumble through is knocked senseless.',
    stat: (p) => `DAZES EVERYONE WITHIN ${sayN(TUNING.goat.roll.stunR / TILE)} TILES OF YOUR PATH FOR ${sayN(p.stun)}s · ONCE EACH PER ROLL`,
    params: { stun: TUNING.goat.roll.stun },
    apply: (m, p) => { m.rollStun = p.stun; } },
  // Poison, one on each button, and a second grab active that is a bomb you make yourself.
  { id: 'splash', skill: 'butt', active: true, emoji: '💦', minLevel: 0, name: 'SPLASH',
    desc: 'Every headbutt also poisons whoever is right behind you, the moment you lower your head.',
    stat: () => `REACHES ${sayN(TUNING.status.splash.range)} TILES BEHIND · ${sayPoison()}`,
    apply: (m) => { m.splash = true; } },
  { id: 'venomjaw', skill: 'grab', active: true, emoji: '🐍', minLevel: 0, name: 'VENOM JAW',
    desc: 'Hold anything long enough and it leaves your mouth dripping: poison along its flight and a puddle where it stops.',
    stat: (p) => { const s = TUNING.status.jaw.half * 2 + 1; return `HOLD ${sayN(p.holdFor)}s · PUDDLE ${s}×${s} TILES FOR ${sayN(TUNING.status.poison.pool)}s · ${sayPoison()}`; },
    params: { holdFor: 2 },
    apply: (m, p) => { m.venomHold = p.holdFor; } },
  { id: 'charge', skill: 'grab', active: true, emoji: '⚡', minLevel: 0, name: 'CHARGED',
    desc: 'Hold anything long enough and it is charged: thrown, it explodes where it stops.',
    stat: (p) => { const C = TUNING.status.charge; return `HOLD ${sayN(p.holdFor)}s · HITS ALL WITHIN ${sayN(C.hitR)} TILES, THROWS ALL TO ${sayN(C.radius)} · YOU ARE ONLY SHOVED`; },
    params: { holdFor: 2 },
    apply: (m, p) => { m.chargeHold = p.holdFor; } },
  { id: 'venomroll', skill: 'roll', active: true, emoji: '🦠', minLevel: 0, name: 'SOUR TUMBLE',
    desc: 'Every roll leaves a puddle of poison where you get up.',
    stat: () => { const s = TUNING.status.tumble.half * 2 + 1; return `PUDDLE ${s}×${s} TILES FOR ${sayN(TUNING.status.poison.pool)}s · ${sayPoison()}`; },
    apply: (m) => { m.venomRoll = true; } },
  // A goat is a jumper. Rolled at a man in front of him, the tumble goes over the man's back and
  // lands behind him, and the man is left reeling: a way round a doorway guard or a raised club,
  // never a kill — what kills is still the wall he was facing when you came down at his back.
  // With nobody in front it is the ordinary roll at the ordinary price.
  { id: 'leapfrog', skill: 'roll', active: true, emoji: '🐸', minLevel: 0, name: 'LEAPFROG',
    desc: 'Roll at a man in front of you and you go over his back instead: he is left reeling and you land behind him.',
    stat: (p) => `A MAN UP TO ${sayN(p.reach)} TILES AHEAD · YOU LAND ${sayN(p.behind)} TILE${+p.behind === 1 ? '' : 'S'} PAST HIM · HE REELS ${sayN(p.daze)}s · A LEAP COSTS ×${sayN(p.cooldownMul)} COOLDOWN`,
    // `cone` radians either side of where you are running (or pointing, standing still); `time` the
    // seconds in the air; `height` how high he is drawn at the top of it, in px; `over` the share of
    // the flight at which the hooves come down on the man's back.
    params: { reach: 3, cone: 0.6, behind: 1, daze: 0.9, cooldownMul: 2, time: 0.36, height: 20, over: 0.45 },
    apply: (m, p) => { m.leapfrog = Object.assign({}, p); } },
  { id: 'spit', skill: 'scream', active: true, emoji: '🫧', minLevel: 0, name: 'VENOM SPIT',
    desc: 'BAAH becomes a glob of poison, spat where you point. It bursts into a puddle.',
    stat: (p) => { const S = TUNING.status.spit, s = S.half * 2 + 1; return `FLIES UP TO ${sayN(S.range)} TILES · PUDDLE ${s}×${s} · ${sayN(p.cooldown)}s COOLDOWN · ${sayPoison()}`; },
    params: { cooldown: 4.5 },
    apply: (m, p) => { m.spit = true; m.screamCooldown = p.cooldown; } },

  // ---- passives ----
  { id: 'hide', emoji: '❤️', minLevel: 0, name: 'THICK HIDE', desc: 'One more heart for the rest of the run, and it comes full.',
    stat: (p, b) => `+${p.heartsAdd} MAX HEART · +${b.heal} HEART NOW`,
    params: { heartsAdd: 1 },
    apply: (m, p) => { m.maxHp += p.heartsAdd; }, heal: 1 },
  // A card that argues with itself: every tuft is worth more and there is less goat to fill. Worth
  // it on a floor you mean to graze across, a mistake on one you mean to run through.
  { id: 'stomachs', emoji: '🌿', minLevel: 0, name: 'FOUR STOMACHS', desc: 'Grass does you more good, but there is less of you to fill.',
    stat: (p) => { const B = TUNING.prop.heal.bigGain; return `GRASS +1 → +${1 + p.gain} HEARTS · BIG GRASS +${B} → +${B + p.gain} · ${-p.heartsLess} MAX HEART · MILK UNCHANGED`; },
    params: { gain: 1, heartsLess: 1 },
    apply: (m, p) => { m.grassGain += p.gain; m.maxHp = Math.max(1, m.maxHp - p.heartsLess); } },
  // An active since 23 Sep 2026: as a passive it sat beside BOMB CHARGE or SPLASH and was simply
  // too much to have for free. Now it is what the headbutt *is*, and he wears it as a stag's antlers.
  { id: 'horns', skill: 'butt', active: true, emoji: '🦌', minLevel: 0, name: 'LONG HORNS', desc: 'A stag’s antlers: your headbutt reaches further and throws a man harder.',
    stat: (p) => { const H = TUNING.goat.headbutt; return `REACH ${sayN(H.reach / TILE)} → ${sayN(H.reach * p.reachMul / TILE)} TILES · THROW +${sayPct(p.impulseMul - 1)}`; },
    params: { reachMul: 1.38, impulseMul: 1.25 },
    apply: (m, p) => { m.headbuttReach *= p.reachMul; m.headbuttImpulse *= p.impulseMul; m.antlers = true; } },
  { id: 'skull', skill: 'butt', emoji: '💀', minLevel: 0, name: 'IRON SKULL', desc: 'You get your head back after a headbutt in half the time, so a second man has less of a gap.',
    stat: (p) => { const r = TUNING.goat.headbutt.recovery; return `RECOVERY ${sayN(r)}s → ${sayN(r * p.recoveryMul)}s`; },
    params: { recoveryMul: 0.5 },
    apply: (m, p) => { m.headbuttRecovery *= p.recoveryMul; } },
  { id: 'jaw', skill: 'grab', needs: 'grabMen', emoji: '🦷', minLevel: 0, name: 'STRONG JAW', desc: 'The man in your mouth is a better shield and stays there longer, and your mouth is free again sooner.',
    stat: (p) => `STOPS ${BOON_BASE.shieldBullets} → ${p.shieldBullets} BULLETS · HELD ~${sayN(BOON_BASE.holdTime)} → ${sayN(p.holdTime)}s · GRAB COOLDOWN ${sayN(TUNING.goat.grab.cooldown)} → ${sayN(TUNING.goat.grab.cooldown * p.cooldownMul)}s`,
    params: { shieldBullets: 4, holdTime: 13, cooldownMul: 0.6 },
    apply: (m, p) => { m.shieldBullets = p.shieldBullets; m.holdTime = p.holdTime; m.grabCooldown *= p.cooldownMul; } },
  { id: 'shield', skill: 'grab', needs: 'grabMen', emoji: '🛡️', minLevel: 0, name: 'LIVING SHIELD', desc: 'The man in your mouth keeps fighting, for you: he swings at his own side, and a rifle keeps firing.',
    stat: (p) => `A HELD MAN SWINGS EVERY ${sayN(p.swing)}s · A HELD RIFLE RELOADS ${sayN(1 / p.reload)}× AS FAST`,
    params: { swing: 0.5, reload: 0.55 },
    apply: (m, p) => { m.livingShield = true; m.shieldSwing = p.swing; m.shieldReload = p.reload; } },
  // The throw is the grab's whole point and the one verb with no time to aim it: this is that time.
  // Everything slows — the goat too, so it is a moment to look, not a moment to run. It ends the
  // instant the thing leaves his mouth, and `every` keeps a pick-up-drop-pick-up from living in it.
  { id: 'coldeye', skill: 'grab', emoji: '⏳', minLevel: 0, name: 'COLD EYE',
    desc: 'Pick anything up and the world slows around you for a moment, so the throw goes where you mean it.',
    stat: (p) => `TIME AT ${sayPct(p.scale)} FOR UP TO ${sayN(p.time)}s AFTER A PICK-UP · ENDS ON THE THROW · ONCE EVERY ${sayN(p.every)}s`,
    params: { scale: 0.35, time: 2, every: 5 },
    apply: (m, p) => { m.coldEye = Object.assign({}, p); } },
  { id: 'kindling', emoji: '🪵', minLevel: 0, name: 'KINDLING', desc: 'Fire spreads from man to man: a burning man lights the next one he bumps into.',
    stat: () => 'ONE MAN DEEP: THE ONE HE LIGHTS LIGHTS NOBODY',
    apply: (m) => { m.firePass = Math.max(m.firePass, 1); } },
  // `radius` is how far THE FULL THROAT reaches and nothing else: the bare call, the breath and the
  // spit each have their own reach, so the card says so rather than promising a louder voice.
  { id: 'throat', skill: 'scream', emoji: '🗣️', minLevel: 0, name: 'RAW THROAT', desc: 'BAAH comes back twice as fast, whatever your voice has become.',
    stat: (p) => `COOLDOWN ×${sayN(p.cooldownMul)} · THE FULL THROAT REACHES ${sayN(BOON_BASE.screamRadius)} → ${sayN(p.radius)} TILES`,
    params: { cooldownMul: 0.5, radius: 13 },
    apply: (m, p) => { m.screamCooldown *= p.cooldownMul; m.screamRadius = p.radius; } },
  { id: 'hooves', emoji: '💨', minLevel: 0, name: 'SURE HOOVES', desc: 'You run faster, from a standing start and flat out alike.',
    stat: (p) => `SPEED +${sayPct(p.speedMul - 1)}`,
    params: { speedMul: 1.13 },
    apply: (m, p) => { m.speed *= p.speedMul; } },
  { id: 'joints', skill: 'roll', emoji: '🤸', minLevel: 0, name: 'LOOSE JOINTS', desc: 'Your roll carries you further and is ready again in half the time.',
    stat: (p) => { const R = TUNING.goat.roll, d = R.speed * R.duration / TILE; return `ROLL ${sayN(d)} → ${sayN(d * p.distanceMul)} TILES · COOLDOWN ${sayN(R.cooldown)} → ${sayN(R.cooldown * p.cooldownMul)}s`; },
    params: { distanceMul: 1.35, cooldownMul: 0.45 },
    apply: (m, p) => { m.rollDistance *= p.distanceMul; m.rollCooldown *= p.cooldownMul; } },
  { id: 'ember', emoji: '🧯', minLevel: 0, name: 'EMBER COAT', desc: 'Ordinary fire burns you far more slowly. Violet witchfire, the mages’ kind, does not care.',
    stat: (p) => { const t = TUNING.goat.fireDamageInterval; return `STANDING IN FIRE: 1 HEART EVERY ${sayN(t)}s → EVERY ${sayN(t * p.fireResist)}s`; },
    params: { fireResist: 3 },
    apply: (m, p) => { m.fireResist = p.fireResist; } },
  { id: 'oracle', emoji: '👁️', minLevel: 0, name: 'THE ORACLE', desc: 'You see through the walls close around you: the next room before you are in it. The far corners stay dark.',
    stat: () => `SEE THROUGH STONE WITHIN ${sayN(TUNING.fog.oracle)} TILES`,
    apply: (m) => { m.oracle = true; } },
];

// THE ARTIFACTS. What the mouse sells, and the one thing the goat wears: a talisman at his neck,
// one slot, shown right of the hearts and drawn on him. A card bends a number behind a button; an
// artifact bends a rule of the compound — what fire does, what the next floor hides, what a fifth
// button (only once there is something to put on it) does, what the roll is. Three tiers each,
// and a tier is how far the rule bends, not a bigger number on the same thing: the first tier is
// a taste, the third is the room rewritten. Which tier a mouse stocks is decided by the level
// (`TUNING.shop.levels`: the n-th mouse of a run sells tier n). `apply(m, p)` reads the tier's `params` into `game.mods` the way a
// boon's does, so the use sites read `mods` and never `ARTIFACTS`. `desc` per tier is what the
// shelf, the chip and the world-space read-out over a ware all say.
//
// Two of the four are body work, the same as a passive soul: FIRE AMULET and LUCKY CLOVER bend a
// rule with no button at all. The other two are a verb, and they never touch grab or roll — this
// is a shop, not a seventh button on the four the goat is built from (ground rule 1): BOOMERANG
// and STRANGE SYMBOLS both hang off **Q**, a fifth key that plainly does not exist until one of
// them is at his neck, and the slot holds only one at a time, so Q is never asked to be two
// things at once. `mods.boomerang` / `mods.blink` is what Q reads; `Goat.itemCd` is its own
// cooldown, never the grab's and never the roll's, because the thing it throws or the step it
// takes is its own trick and not a reskin of a verb he already has.
// Every tier's `desc` is the literal thing, in numbers: what the tier does, how far, how long, how
// often. It used to be a line of prose a tier — "the next floor is yours", "everything on its way
// out and on its way back" — which reads well and tells a player who has three seconds and a mouse
// hovering over a stool precisely nothing. The 22 Sep 2026 note was "the literal meaning of what it
// does, next to each artifact, none of this smeared bullshit".
// It is no longer typed. Each talisman has one `say(p)` that states a tier WHOLE off that tier's own
// params, and `desc` is a getter onto it (below the list). Two reasons. The lines used to read as a
// diff — tier I the whole thing, II and III only what changed — but the n-th mouse of a run sells
// tier n and nothing else, so the player who met BUTCHER'S GREASE III was told "1.3 TILES FOR 20s,
// AND 15% DRAG" and never that men slip on it; a tier has to stand on its own. And a number typed
// into a sentence is stale the moment the TALISMANS tab moves the param under it. `Renderer.drawWare`,
// the HUD chip and the crow's gift all print `desc`, so what they print is now what the tier does.
const ARTIFACTS = [
  { id: 'firecharm', name: 'FIRE AMULET', color: '#f2a233',
    say: (p) => `A BURNING MAN LIGHTS THE NEXT ONE HE TOUCHES, ${p.pass === 1 ? 'AND THAT ONE LIGHTS NOBODY' : `AND ON IT GOES: ${p.pass} MEN DEEP`}.`,
    tiers: [
      { params: { pass: 1 } },
      { params: { pass: 2 } },
      { params: { pass: 6 } }],
    apply: (m, p) => { m.firePass = Math.max(m.firePass, p.pass); } },
  { id: 'clover', name: 'LUCKY CLOVER', color: '#7c8f52',
    say: (p) => `NEXT FLOOR ONLY: x${sayN(p.secret)} SECRET WALLS, x${sayN(p.racks)} WEAPON RACKS, x${sayN(p.grass)} BIG GRASS (+${TUNING.prop.heal.bigGain} HEARTS) BEHIND A SECRET${p.heals ? `, +${p.heals} MILK` : ''}.`,
    tiers: [
      { params: { secret: 1.6, racks: 1.5, grass: 1.5, heals: 0 } },
      { params: { secret: 2.4, racks: 2, grass: 1.9, heals: 1 } },
      { params: { secret: 3, racks: 2.8, grass: 2.4, heals: 2 } }],
    apply: (m, p) => { m.luck = p; } },
  { id: 'boomerang', name: 'BOOMERANG', color: '#efe6d0',
    say: (p) => `Q: THROWN ${sayN(p.range)} TILES OUT AND BACK. ${p.pierce >= 99 ? 'EVERY MAN IT PASSES, BOTH WAYS, IS' : `UP TO ${p.pierce} ${p.pierce === 1 ? 'MAN EACH WAY IS' : 'MEN EACH WAY ARE'}`} DAZED ${sayN(p.stun)}s. ${sayN(p.cooldown)}s COOLDOWN.`,
    tiers: [
      { params: { stun: 1.2, cooldown: 10, range: 6, pierce: 1 } },
      { params: { stun: 1.8, cooldown: 7, range: 7.5, pierce: 2 } },
      { params: { stun: 2.4, cooldown: 5, range: 9, pierce: 99 } }],
    apply: (m, p) => { m.boomerang = p; } },
  { id: 'symbols', name: 'STRANGE SYMBOLS', color: '#7d5cff',
    say: (p) => `Q: BLINK ${sayN(p.dist)} TILES AHEAD, THROUGH MEN BUT NOT WALLS. ${sayN(p.cooldown)}s COOLDOWN.${p.stun ? ` WHOEVER STOOD WHERE YOU LEFT IS DAZED ${sayN(p.stun)}s.` : ''}`,
    tiers: [
      { params: { dist: 3, cooldown: 6, stun: 0 } },
      { params: { dist: 4.5, cooldown: 4, stun: 0 } },
      { params: { dist: 6, cooldown: 2.2, stun: 0.9 } }],
    apply: (m, p) => { m.blink = p; } },
  // ---- the seventeen from ARTIFACTS_TZ.md. Their machinery is js/talismans.js; `tag` keeps the
  // mouse from putting two of the same sort on one shelf (`stockFor`). ----
  { id: 'mason', tag: 'geo', name: "MASON'S MARK", color: '#8d8a85',
    say: (p) => `A THROWN MAN DIES ON STONE AT ${sayPct(p.splat)} OF THE USUAL SPEED${p.props ? '. A CRATE OR A RACK COUNTS AS STONE' : ''}${p.bodies ? '. SO DOES ANOTHER MAN, AND BOTH DIE' : ''}.`,
    tiers: [
      { params: { splat: 0.8, props: false, bodies: false } },
      { params: { splat: 0.8, props: true, bodies: false } },
      { params: { splat: 0.75, props: true, bodies: true } }],
    apply: (m, p) => { m.mason = p; } },
  { id: 'domino', tag: 'geo', name: 'DOMINO BONE', color: '#efe6d0',
    say: (p) => `A THROWN MAN WHO BOWLS ANOTHER OVER PASSES THE THROW ON ${p.links === 1 ? 'ONCE' : `UP TO ${p.links} TIMES`}, KEEPING ${sayPct(p.keep)} OF ITS SPEED${p.links === 1 ? '' : ' EACH TIME'}.`,
    tiers: [
      { params: { links: 1, keep: 0.7 } },
      { params: { links: 2, keep: 0.7 } },
      { params: { links: 4, keep: 0.7 } }],
    apply: (m, p) => { m.domino = p; } },
  { id: 'echo', tag: 'butt', name: 'ECHO HORN', color: '#efe6d0',
    say: (p) => `${sayN(p.delay)}s AFTER EVERY HEADBUTT ${p.count === 1 ? 'A GHOST BLOW FOLLOWS' : `${p.count} GHOST BLOWS FOLLOW`}: ${sayPct(p.reach)} OF THE REACH, ${sayPct(p.power)} OF THE THROW${p.count > 1 ? `, THE SECOND ${Math.round(p.spread * 180 / Math.PI)}° ASIDE` : ''}.`,
    tiers: [
      { params: { delay: 0.4, power: 0.5, count: 1, spread: 0, reach: 0.6 } },
      { params: { delay: 0.4, power: 1, count: 1, spread: 0, reach: 0.6 } },
      { params: { delay: 0.4, power: 1, count: 2, spread: 0.26, reach: 0.6 } }],
    apply: (m, p) => { m.echo = p; } },
  { id: 'spade', tag: 'geo', name: "GRAVEDIGGER'S SPADE", color: '#8d8a85',
    say: (p) => `BODIES STAY ${sayN(p.life)}s, UP TO ${p.cap}. A MAN WHO RUNS INTO ONE IS FLOORED ${sayN(p.trip)}s${p.grab ? '. GRAB ONE AND THROW IT LIKE A CRATE' : ''}${p.lethal ? ': IT KILLS WHAT IT HITS' : ''}.`,
    tiers: [
      { params: { life: 20, trip: 0.6, grab: false, lethal: false, r: 12, cap: 6 } },
      { params: { life: 20, trip: 0.6, grab: true, lethal: false, r: 12, cap: 6 } },
      { params: { life: 25, trip: 0.6, grab: true, lethal: true, r: 12, cap: 6 } }],
    apply: (m, p) => { m.spade = p; } },
  { id: 'grease', tag: 'geo', name: "BUTCHER'S GREASE", color: '#c0392b',
    say: (p) => `A WALL KILL GREASES ${sayN(p.r)} ${p.r === 1 ? 'TILE' : 'TILES'} ROUND IT FOR ${sayN(p.life)}s: A THROWN MAN SLIDES ON ${sayPct(p.drag)} OF THE DRAG${p.slip ? `, A MAN CHASING ACROSS SLIPS ${sayPct(p.slip)} A SECOND` : ''}, YOU KEEP ${sayPct(p.grip)} GRIP.`,
    tiers: [
      { params: { life: 15, r: 1, drag: 0.5, slip: 0, grip: 0.7 } },
      { params: { life: 15, r: 1, drag: 0.5, slip: 0.3, grip: 0.7 } },
      { params: { life: 20, r: 1.3, drag: 0.15, slip: 0.3, grip: 0.7 } }],
    apply: (m, p) => { m.grease = p; } },
  { id: 'awl', tag: 'geo', name: "CARPENTER'S AWL", color: '#a57949',
    say: (p) => `A CRATE THAT BREAKS ${p.fling ? 'THROWS' : 'FLOORS'} EVERYONE WITHIN ${sayN(p.r)} ${p.r === 1 ? 'TILE' : 'TILES'} OF IT${p.fling ? ` CLEAR, AT ${sayN(p.fling)} TILES A SECOND` : ''}. THE BIG ONES ONLY STAGGER.`,
    tiers: [
      { params: { r: 1, fling: 0 } },
      { params: { r: 1.2, fling: 8 } },
      { params: { r: 1.5, fling: 12 } }],
    apply: (m, p) => { m.awl = p; } },
  { id: 'mask', tag: 'ai', name: 'HORNED MASK', color: '#efe6d0',
    say: (p) => `A MAN WHO SEES ANOTHER DIE WITHIN ${sayN(p.r)} TILES PANICS AND RUNS ${sayN(p.flee)}s${p.blind ? ', BLIND TO WHAT IS IN HIS WAY' : ''}${p.drop ? ', DROPPING ANY BLOW HE WAS WINDING UP' : ''}. EACH MAN AT MOST ONCE EVERY ${sayN(p.cd)}s.`,
    tiers: [
      { params: { r: 4, flee: 1, drop: false, blind: false, cd: 4 } },
      { params: { r: 4, flee: 1.5, drop: true, blind: false, cd: 4 } },
      { params: { r: 5, flee: 1.5, drop: true, blind: true, cd: 4 } }],
    apply: (m, p) => { m.mask = p; } },
  { id: 'effigy', tag: 'q', name: 'STRAW EFFIGY', color: '#c9a24e',
    say: (p) => `Q: A STRAW GOAT STANDS ${sayN(p.life)}s. MEN WITHIN ${sayN(p.r)} TILES GO FOR IT INSTEAD OF YOU${p.shots ? ', AND RIFLES WASTE A ROUND ON IT' : ''}${p.oops ? '. A MAN WHO CLUBS IT HITS HIS NEIGHBOUR' : ''}. ${sayN(p.cd)}s COOLDOWN.`,
    tiers: [
      { params: { life: 4, r: 6, cd: 12, shots: false, oops: false } },
      { params: { life: 4, r: 6, cd: 10, shots: true, oops: false } },
      { params: { life: 6, r: 7, cd: 8, shots: true, oops: true } }],
    apply: (m, p) => { m.effigy = p; } },
  { id: 'spur', tag: 'run', name: 'BRASS SPUR', color: '#c29a44',
    say: (p) => { const T = TUNING.goat.momentum.time; return `YOUR RUN-UP BUILDS IN ${sayN(T * p.time)}s, NOT ${sayN(T)}s${p.keep ? `, AND A HIT TAKES ${sayPct(1 - p.keep)} OF IT INSTEAD OF ALL` : ''}${p.throw > 1 ? `. AT A FULL RUN THE HORNS THROW x${sayN(p.throw)}` : ''}.`; },
    tiers: [
      { params: { time: 0.5, keep: 0, throw: 1 } },
      { params: { time: 0.5, keep: 0.5, throw: 1 } },
      { params: { time: 0.5, keep: 0.5, throw: 1.6 } }],
    apply: (m, p) => { m.spur = p; } },
  { id: 'moth', tag: 'run', name: 'MOTH WOOL', color: '#b8ad97',
    say: (p) => `YOUR FOOTSTEPS CARRY ${sayPct(p.step)} AS FAR${p.near ? `, AND NOT AT ALL WITHIN ${sayN(p.near)} TILES OF A MAN WHO HAS NOT SEEN YOU` : ''}${p.still ? `. STAND STILL ${sayN(p.still)}s AND NOBODY WHO HAS NOT SEEN YOU YET CAN, PAST ${sayN(p.hide)} TILES` : ''}.`,
    tiers: [
      { params: { step: 0.5, near: 0, still: 0, hide: 4 } },
      { params: { step: 0.5, near: 3, still: 0, hide: 4 } },
      { params: { step: 0.5, near: 3, still: 1.2, hide: 4 } }],
    apply: (m, p) => { m.moth = p; } },
  { id: 'bell', tag: 'run', name: "BELLWETHER'S BELL", color: '#c29a44',
    say: (p) => `A THREAD ON THE FLOOR POINTS TO THE STAIRS AND THE VAULT${p.sil ? `. MEN SHOW THROUGH STONE WITHIN ${sayN(p.sil)} TILES` : ''}${p.mimic ? '. A WRAITH HIDING AS A BOX OR MILK TWITCHES' : ''}.`,
    tiers: [
      { params: { sil: 0, mimic: false } },
      { params: { sil: 6, mimic: false } },
      { params: { sil: 9, mimic: true } }],
    apply: (m, p) => { m.bell = p; } },
  { id: 'sandal', tag: 'run', name: "PILGRIM'S SANDAL", color: '#8a6238',
    say: (p) => `INTO A NEW ROOM WITH A MAN ON YOUR HEELS (WITHIN ${sayN(p.range)} TILES): +${sayPct(p.speed)} SPEED FOR ${sayN(p.time)}s${p.reset ? ', AND YOUR ROLL AND VOICE ARE READY AGAIN' : ''}${p.shake ? '. THE MEN BEHIND LOSE YOU IN THE DOORWAY' : ''}.`,
    tiers: [
      { params: { speed: 0.2, time: 2.5, reset: false, shake: false, range: 10 } },
      { params: { speed: 0.2, time: 2.5, reset: true, shake: false, range: 10 } },
      { params: { speed: 0.25, time: 3, reset: true, shake: true, range: 10 } }],
    apply: (m, p) => { m.sandal = p; } },
  { id: 'scapegoat', tag: 'def', name: 'SCAPEGOAT', color: '#e8e0cc',
    say: (p) => `ONCE: A KILLING BLOW IS CANCELLED. UP WITH ${p.hearts} ${p.hearts === 1 ? 'HEART' : 'HEARTS'} AND ${sayN(p.invuln)}s UNTOUCHABLE${p.stun ? `, AND EVERYONE WITHIN ${sayN(p.r)} TILES IS DAZED ${sayN(p.stun)}s` : ''}. THEN IT IS GONE.`,
    tiers: [
      { params: { hearts: 1, invuln: 1.5, stun: 0, r: 5 } },
      { params: { hearts: 2, invuln: 1.5, stun: 0, r: 5 } },
      { params: { hearts: 2, invuln: 1.5, stun: 1.5, r: 5 } }],
    apply: (m, p) => { m.scapegoat = p; } },
  { id: 'tallow', tag: 'def', name: 'TALLOW SKIN', color: '#e8dcb0',
    say: (p) => `A CRUST THAT TAKES ONE HIT FOR YOU. IT GROWS BACK AFTER ${p.rooms} NEW ROOMS${p.soul ? ', OR AT ONCE WHEN YOU TAKE A SOUL' : ''}.`,
    tiers: [
      { params: { rooms: 5, soul: false } },
      { params: { rooms: 4, soul: true } },
      { params: { rooms: 3, soul: true } }],
    apply: (m, p) => { m.tallow = p; } },
  { id: 'mirror', tag: 'butt', name: 'MIRROR SHARD', color: '#bfe6ff',
    say: (p) => `FOR ${sayN(p.window)}s FROM THE START OF A HEADBUTT: BULLETS FLY BACK, AND A BITE${p.club ? ', CLUB OR BLADE' : ''} THROWS ITS MAN BACK${p.heavy ? `. SO DO A CLEAVER, A CHARGE, A SLAM (REELING ${sayN(p.stun)}s) AND A RUNE WITHIN ${sayN(p.runeR)} TILES` : ''}. MISTIMED, YOU TAKE THE HIT.`,
    tiers: [
      { params: { window: 0.18, club: false, heavy: false, throw: 0.8, stun: 0.8, runeR: 6 } },
      { params: { window: 0.2, club: true, heavy: false, throw: 0.8, stun: 0.8, runeR: 6 } },
      { params: { window: 0.25, club: true, heavy: true, throw: 0.8, stun: 1, runeR: 6 } }],
    apply: (m, p) => { m.mirror = p; } },
  { id: 'cup', tag: 'count', name: 'BLOOD CUP', color: '#c0392b',
    say: (p) => `EVERY ${p.need} MEN KILLED BY THE ROOM (WALL, WHEEL, GRATING, DROP) GIVE 1 HEART, UP TO ${p.max} A FLOOR${p.carry ? '. THE COUNT CARRIES TO THE NEXT FLOOR' : ''}.`,
    tiers: [
      { params: { need: 12, carry: false, max: 2 } },
      { params: { need: 10, carry: false, max: 2 } },
      { params: { need: 8, carry: true, max: 2 } }],
    apply: (m, p) => { m.cup = p; } },
  { id: 'tally', tag: 'butt', name: 'TALLY STICK', color: '#a57949',
    say: (p) => `EVERY ${p.every}${p.every === 2 ? 'ND' : p.every === 3 ? 'RD' : 'TH'} HEADBUTT THAT LANDS THROWS x${sayN(p.mul)}${p.stun ? ` AND DAZES EVERYONE WITHIN ${sayN(p.r)} ${p.r === 1 ? 'TILE' : 'TILES'} FOR ${sayN(p.stun)}s` : ''}.`,
    tiers: [
      { params: { every: 4, stun: 0, r: 1, mul: 2 } },
      { params: { every: 3, stun: 0, r: 1, mul: 2 } },
      { params: { every: 3, stun: 1, r: 1, mul: 2 } }],
    apply: (m, p) => { m.tally = p; } },
];
// A tier's `desc` is its talisman's `say` over its own params, read when it is drawn.
for (const a of ARTIFACTS) for (const tier of a.tiers) {
  Object.defineProperty(tier, 'desc', { get() { return a.say(tier.params); }, enumerable: true });
}

// The mouse's third offer, beside her two talismans: no talisman at all, a pail of milk as tall as
// the goat, set down in front of her hole. It used to be three bowls scattered round the room with
// the words THREE BOWLS OF MILK written under them — an offer that had to be read. One enormous
// bucket says the same thing without a caption, which is what the 22 Sep 2026 note asked for, and it
// still holds `TUNING.shop.heals` hearts: a drink a heart, drunk where it stands.
// Shaped like an `ARTIFACTS` entry so the shelf can draw and read it out the same way; `Shop.buy` is
// what knows it is not one.
const MILK_OFFER = { id: 'milk', name: 'A PAIL OF MILK', color: '#efe6d0',
  how: 'Heals you. Stand still in it to drink a heart; what you leave stays for later.',
  tiers: [{ desc: `+${TUNING.shop.heals} HEARTS IN ALL. TAKING IT MEANS NO TALISMAN.` }] };

// What a talisman IS, in one plain sentence, read on the shelf above the tier's numbers. A tier's
// `desc` is a diff against tier I and full of terms (window, throw, depth) that only mean something
// once you know what the thing is for; this is the line that says so. One per `ARTIFACTS` id.
const ARTIFACT_HOW = {
  firecharm: 'A man on fire sets alight whoever he bumps into.',
  clover: 'Luck for the next floor: more hidden walls, more arms, more to heal on.',
  boomerang: 'Press Q to throw it. It stuns the men it passes and comes back to you.',
  symbols: 'Press Q to vanish and reappear a few steps ahead, through men but not walls.',
  mason: 'Men you throw die against walls at a lower speed.',
  domino: 'A man you throw knocks the next man on, like skittles.',
  echo: 'Every headbutt is followed by a second, invisible one.',
  spade: 'Bodies stay on the floor, and men trip over them.',
  grease: 'Killing a man on a wall leaves a slick: thrown men slide further on it.',
  awl: 'A crate breaking knocks down everyone next to it.',
  mask: 'Men who watch another die nearby panic and run.',
  effigy: 'Press Q to set down a straw goat. Men go for it instead of you.',
  spur: 'You reach full running speed sooner.',
  moth: 'Your running is quieter: men hear you from less far.',
  bell: 'A thread on the floor shows the way to the stairs and the vault.',
  sandal: 'Get into a new room with men on your heels and you get a burst of speed.',
  scapegoat: 'Saves your life once. Then it is gone.',
  tallow: 'Takes one hit for you, then grows back as you go.',
  mirror: 'Headbutt right as a hit reaches you and it goes back at them. Mistime it and you are hit.',
  cup: 'Kill enough men and you get a heart back.',
  tally: 'Every few headbutts that land, one throws twice as hard.',
};

// What the death card says took the last heart: a kind of man (a clubman is split into the
// ordinary one and the brute in `game.killedBy`), or the word a hazard passes to `Goat.damage`.
const KILLED_BY = {
  hunter: 'RIFLEMAN', dog: 'HOUND', seer: 'MAGE', butcher: 'BUTCHER', wraith: 'WRAITH', ratogre: 'RAT OGRE',
  fire: 'FIRE', witchfire: 'WITCHFIRE', spike: 'THE GRATING', bomb: 'A BOMB', mill: 'THE WHEEL',
  fall: 'THE DROP', rifle: 'A STRAY BULLET', spire: 'THE ROCK',
};

// Short things the cult shouts. A few words each: they have to read at a glance while you run.
const BARKS = {
  // first sight of the goat
  spot: {
    bearer: ['THE GOAT!', 'IT IS AWAKE', 'THERE! THERE!', 'GET THE ROPE', 'IT IS LOOSE', 'BLESSED MEAT'],
    hunter: ['CLEAR SHOT', 'HOLD STILL', 'I SEE IT', 'IN THE OPEN'],
    seer: ['THE LAMB RUNS', 'I MARK YOU', 'THE GROUND WILL EAT IT', 'STAND THERE'],
    butcher: ['MINE', 'COME TO THE BLOCK', 'LITTLE GOAT', 'NO FURTHER'],
  },
  // something was heard, or a scream pulled him
  search: ['WHO OPENED THE PEN', 'SOMETHING MOVED', 'HOOVES', 'DID YOU HEAR IT', 'OVER THERE', 'SPREAD OUT', 'THAT WAY'],
  // the goat is close and he has not seen it yet
  near: ['SOMETHING BREATHES', 'SMELL THAT?', 'CLOSE NOW', 'QUIET'],
  // a man goes down in front of him
  panic: ['IT KILLED HIM', 'THE PRIEST LIED', 'RUN', 'MERCY'],
  // the one who is actually responsible, said by him and nobody else: a Hunter whose shot found a
  // man of his own, or a Seer whose fire spread to one. Guaranteed rather than left to `panic`'s own
  // roll, because the man who did it having nothing to say about it read as the game not noticing.
  friendlyFire: { hunter: ['NOT ME', 'WRONG MARK', 'HOLD YOUR LINE'], seer: ['WHO DID IT?', 'NOT MY FLAME', 'WATCH THE GROUND'] },
  // committing to a swing
  attack: ['HOLD IT DOWN', 'FOR THE ALTAR', 'BLEED', 'STAY STILL'],
  // walking into flame is for the goat, not for him
  fire: ['FIRE!', 'GO ROUND', 'IT BURNS', 'THE HAY!'],
  // the two who come for her in the opening scene
  intro: { ewe: 'THE EWE FIRST', take: 'COME, LITTLE ONE', turn: 'YOUR TURN COMES' },
  // the Mill, a lit brazier, a rune about to go off: everything else in the room that kills
  trap: ['THE WHEEL!', 'MIND THE ARMS', 'NOT THAT WAY', 'GO ROUND IT', 'STEP BACK'],
  // a hound has the goat and the men know what that is worth
  hound: ['THE HOUNDS HAVE IT', 'LET THEM WORK', 'GOOD DOG', 'HOLD IT, DOG'],
  // something they buried has just become solid an arm's length away
  wraith: ['IT IS UP', 'DO NOT LOOK AT IT', 'THE DEAD WALK', 'COLD! COLD!', 'WE BURIED THAT'],
};

// Every level stops you twice. `gates` is two room indices — one in the middle of the level, one
// before its end — and each is a REST room (`REST_TEMPLATE`): nobody in it, straw in the corners, the
// fight was the room before. Its way on is narrowed to a single tile and barred by a door no blow
// opens (`gen.js`, `gateSpot`), and what lifts the bar is the soul lying in the middle of the floor —
// or, on the levels in `TUNING.shop.levels`, the mouse: the middle gate is her room instead, and
// taking one of her three offers is the bar. A gate is never a set piece, the vault's room, a
// teaching room or the last room. `souls` is the level's whole count and is spent in `startLevel` in
// this order: the gates, then the vault, then the level's LAST bosses. A boss with none left to give
// leaves milk, and a vault with none left holds grass. Two a level, less the three the mouse stands
// in for, is fourteen across a run against sixteen boons: no run gets everything.
const LEVELS = [
  {
    // Level one teaches, in this order: one clubman standing in the only way out of his room, a room
    // of ordinary clubmen, the Mill, and only then the man who takes more than one hit — and the big
    // man at the end of it. Three things and nothing else: a small one, a big one, and the block.
    // The hound used to be here too and is now the first new thing level two has, because an animal
    // that darts is a different lesson from a man who swings and does not belong in the same hour.
    // Nothing here appears in a crowd before it has appeared alone.
    // `ritual` paints the altar, the remains and the tools into the first room, and is what makes the
    // opening scene possible; every later level arrives up a flight of stairs into a bare room instead.
    // Ten rooms. It was twelve, two of which were empty floors carrying nothing but painted words —
    // the goat walked through a room that said WASD and a room that said GRAB before he had met
    // anybody to use either on. Both lines now live where the verb is: the pen teaches move and
    // headbutt on the bars themselves, and grab is painted in the room that stands a blade and a
    // crate in front of you. The rooms after the pen are rooms with men in them, and the count of
    // ordinary rooms — and so the whole difficulty curve — is exactly what it was.
    name: 'THE ALTAR', sub: 'Level 1', rooms: 10, showControls: true, startCage: true, ritual: true,
    // The first idea and the plainest: a headbutt only ever knocks a man down, and it is the stone he
    // lands against that kills him. So the rooms here are pillars, corners and stub walls, and the
    // level is one long lesson in where to stand when you swing.
    canon: { id: 'stone', name: 'STONE', idea: 'The wall is the weapon. Pillars, corners and stub walls: a man knocked into any of them stays down. A man knocked onto open floor gets up.' },
    theme: "The cult's inner sanctum — the altar the sacrifice never reached.",
    decor: 'Bare stone: pillars, corners, stub walls, straw in the pen, one stand of arms, the Mill.',
    // The first man of the run holds his post instead of walking at you: he stands in the only way
    // out of his room — the generator narrows that corridor to a single tile for him — and the floor
    // under him says what the button does. Walking round him was the one thing everybody did, so now
    // there is nowhere to walk round to: the room does not open until he is down.
    sentryIntro: true,
    // The first boss of the game is one brute and one man at his back, and `escorts` is what says
    // so: the arena's threat budget would otherwise buy two, and the first thing in the run with
    // more than one heart in it should be read as the brute rather than as a crowd.
    arenas: [{ at: 7, boss: 'champion', escorts: 1 }, { at: 9, boss: 'butcher' }],
    // A wall that gives is not a thing to look for yet: the first arena above is what teaches a
    // soul is worth going out of your way for, so no secret is carved before it.
    secretsAfterBoss: true,
    // The two hard stops (see the note over `LEVELS`): the middle of the level, and the breather
    // between the brute's ring and the butcher's. Nobody walks past the first soul of the run any
    // more — it is the bar.
    gates: [5, 8],
    // The wheel is met with nobody standing in the room, and arms are not a thing you find until
    // halfway in: the first half of the run is the goat and his head and nothing else.
    // The first stand of arms in the game is not a scatter, it is this room: a long approach, the
    // arm right inside the door, and whoever the room holds standing well down the far end of it.
    ambushAt: 4,
    // The wheel is met in a room built round it: a narrow one with a single lane past the arm, and
    // two men on the far side of it — one who cannot read it and rides it into the wall, one who
    // walks around it and comes on. `millLesson` is that pair, and it replaced the empty room the
    // wheel used to turn in: a hazard nobody is standing near is a thing to walk round rather than
    // a thing to use. See `millRoom` in `gen.js`.
    millAt: 3, millLesson: true, heals: 3, souls: 2, racks: 0.2, racksFrom: 0.4, traps: 1, crates: 0.3,
    // No hen yet. She is the one thing in the compound on your side, and a goat who has not been
    // shown a single fight to the finish has nothing to weigh "an ally who kills once" against.
    encounters: {
      kinds: ['bearer', 'champion'],
      introduce: [['bearer', 0], ['champion', 0.8]],
      from: 1, to: 4.5, ease: 1.5,
      // Two men to a room, and the arena's boss gets two rather than three at his back. Every other
      // level buys its difficulty in bodies; level one may not, because three men converging is not
      // a harder version of the lesson it is teaching, it is a different lesson — spacing — and it
      // arrives before the player has the verbs to answer it. The curve is untouched: what a room is
      // allowed to SPEND is the same, it simply has to spend it on better men rather than on more of
      // them, so the level still climbs and still ends on the brute.
      cap: { men: 2 },
    },
    floor: '#2b1a26', floorAlt: '#31202c', wall: '#7c5a36', wallTop: '#9c7446',
    fog: '#0d0a0c', doorChance: 0.5,
    hint: null,
  },
  {
    // Two new things and a long way between them: the hound early, on his own, and the mage a third
    // of the way in. The hound is here rather than on level one because level one is about a man
    // standing still and what a head does to him.
    name: 'THE YARD', sub: 'Level 2', rooms: 12,
    // The mage brings fire; the rooms already have it. Coals, straw and ovens, so the thing the Seer
    // does to the floor is a thing you have been doing to the floor yourself since the second room.
    canon: { id: 'fire', name: 'FIRE', idea: 'Coals and straw. Every room has something in it that burns, and by the time the mage lights the ground you have already lit it yourself.' },
    theme: 'The yard behind the sanctum, kept lit for the rendering to come.',
    decor: 'Braziers, straw, ovens, oil lamps, a hound pack, the Seer’s witchfire.',
    // The first mouse of the run stands in the middle gate and is one of the level's two upgrades;
    // the late gate's soul is the other, and the vault holds grass (`startLevel`). The seer is sealed in all the same: both doors of his room go iron the moment
    // the goat is inside, and neither gives until he does.
    arenas: [{ at: 4, boss: 'butcher' }, { at: 9, boss: 'seer', sealed: true }],
    gates: [5, 10],
    millAt: 7, heals: 2, souls: 2, racks: 0.16, traps: 1, crates: 0.3, barrels: 0.3, vaultAt: 6,
    // The first escort of the run is the loudest one: a floor about fire and being found is the
    // right floor to be handed something that gives you away (js/beasts.js).
    beasts: ['chicken', 'goose'],
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer'],
      introduce: [['dog', 0.12], ['seer', 0.5]],
      from: 2, to: 8.5, ease: 1.3,
    },
    floor: '#8a7554', floorAlt: '#907b5a', wall: '#3b2233', wallTop: '#55344a',
    fog: '#120d12', doorChance: 0.42, ironDoors: 0.45, stack: 0.22,
    hint: 'THE SEER BURNS THE GROUND YOU STAND ON', hintKey: 'roll',
  },
  {
    // Out under the compound, the ground stops being built. Nothing in the cave was laid by a hand:
    // no wall runs straight, no corner is square, and the room is whatever the rock left. What that
    // does to the one idea the whole game rests on — the wall kills — is make it a curve: a man
    // thrown along a bend in the rock slides round it instead of stopping dead on a corner, so the
    // stone that kills here is the stone he hits square. And the floor is not bare: tall grass that
    // you cannot see into or past, with a man lying in some of it, and boulders you break or go round.
    // Nothing new walks in. The cave itself is the new thing, the way the drop was.
    //
    // It was the last floor of the run and it is the third one now. It was in the wrong place twice
    // over: a level whose whole idea is the SHAPE of a room reads best before the run is deep in men,
    // and the eighth floor of anything is where the least of what you built gets looked at. Third, it
    // arrives right after the fire and right before the rifle — the last floor that is still about
    // the ground rather than about what is standing on it. Everything that made it a late level went
    // with the move: the rifles it had no business owning, the grating (which is THE ROAD's own new
    // thing, one floor later), its third ring, and two rooms of length.
    name: 'THE CAVE', sub: 'Level 3', rooms: 13,
    canon: { id: 'hollow', name: 'THE HOLLOW', idea: 'No wall runs straight. The rock curves, so a man thrown along it slides; he dies on what he hits square — a boulder, the end of a bend. The grass hides whoever is in it, and that includes you.' },
    theme: 'The caves the compound was dug out of, where nobody bothered to square the walls.',
    decor: 'Round rock, tall grass that hides, boulders that break, hounds and a garrison in the dark.',
    // `cave` rounds the rock (`TUNING.cave`) and erodes the corners of every ordinary room; `grass`
    // and `rocks` are the per-room chances of a patch of tall grass and a scatter of boulders, on top
    // of whatever the room's own template already put down. `rockClusters` is separate again: the
    // odds of a whole formation of them grown together — three to six cells, one big thing to break
    // rather than a handful of loose stones (`placeRockCluster`, `js/gen.js`).
    cave: true, grass: 0.8, rocks: 0.7, rockClusters: 0.35, grassColor: '#3d5a2a', grassHi: '#6f8f45', grassDark: '#223618',
    arenas: [{ at: 4, boss: 'butcher' }, { at: 10, boss: 'champion' }],
    gates: [6, 11],
    // No grating: the floor growing teeth is THE ROAD's own new thing and it is one floor later now.
    // What this floor has instead is the rock's own (`TUNING.cave.spikes`), which is not a trap — it
    // never arms and never rests, it is simply standing there — so the cave is not short of a hazard.
    // No trap room either, for the same reason: every template in that pool `needs: 'spikes'`.
    millAt: 8, heals: 3, souls: 2, racks: 0.18, spikes: 0, crates: 0.25, traps: 0, vaultAt: 3,
    // A floor whose one idea is the shape of the room is where a thing you throw down to make a
    // shape belongs.
    beasts: ['tortoise'],
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer'],
      introduce: [],
      from: 3, to: 10, ease: 1.25,
      // Hounds are what a cave is kept with, and the grass is where they wait.
      weight: { bearer: 3, dog: 4, seer: 2, champion: 2 },
      cap: { men: 6, dog: 3 },
    },
    floor: '#2b2821', floorAlt: '#302c24', wall: '#3b3731', wallTop: '#5f584b',
    fog: '#040405', doorChance: 0.15, ironDoors: 0.4, clockDoors: 0.35, stack: 0.28,
    hint: 'THE GRASS HIDES YOU. IT HIDES THEM TOO.', hintKey: null,
  },
  {
    // The rifle arrives early, alone, and then never stops being the reason you keep moving.
    name: 'THE ROAD', sub: 'Level 4', rooms: 14,
    // A rifle owns everything it can see. The rooms are colonnades, long naves and lines of stub
    // cover: the level is about the strip of floor a rifle cannot see and how you get to it.
    canon: { id: 'line', name: 'THE LINE', idea: 'Long sightlines and hard cover. A rifle owns whatever it can see, so the room is about what it cannot, and about crossing the rest.' },
    theme: 'The processional road out of the compound, watched the whole way by rifles.',
    decor: 'Colonnades, long naves, stub cover, a killbox, grating underfoot, the Great Hall.',
    arenas: [{ at: 5, boss: 'butcher' }, { at: 11, boss: 'butcher' }],
    gates: [7, 12],
    millAt: 8, heals: 2, souls: 2, hallAt: 9, hallThreat: 11, galleryAt: 6, killboxAt: 10, lonePosts: 3, racks: 0.14, traps: 2,
    // A shell to put between you and the line, or a bird that tells the line where you are.
    beasts: ['tortoise', 'goose', 'chicken'],
    // The floor starts answering back here: a stretch of grating you cross and whoever is on your
    // heels crosses a beat later, when it is no longer floor.
    spikes: 0.3, crates: 0.35, barrels: 0.3, vaultAt: 4,
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter'],
      introduce: [['hunter', 0.2]],
      from: 5, to: 13, ease: 1.2,
    },
    floor: '#4a3a2e', floorAlt: '#524032', wall: '#2a2430', wallTop: '#3e3346',
    // The first level with a door already swinging shut in it. Not before this one: levels one and
    // two are still teaching that a door is a thing that goes when you hit it, and a door that is
    // better not hit at all is the wrong second lesson.
    fog: '#0b0a0d', doorChance: 0.35, ironDoors: 0.5, clockDoors: 0.5, stack: 0.28,
    // It used to read HOLD A MAN. HE STOPS BULLETS, which stopped being true out of the pen: a man
    // is BY THE COLLAR and a goat who has not swallowed that soul cannot lift one. What is true
    // either way is the sentence under both — get something solid between you and the line.
    // No key under it. A hint that names a verb should carry the button for it; this one names the
    // ground — anything solid will do, and most of what will do is furniture you never pick up.
    // The second sentence is the floor's own new teeth: this is the first level with a grate in it,
    // and a hint that only warned about the rifle said nothing about the ground growing them.
    hint: 'PUT SOMETHING SOLID BETWEEN YOU AND THE LINE. WATCH YOUR STEP.', hintKey: null,
  },
  {
    // The threshing floor: the widest ground in the compound and the least wall in it. A headbutt on
    // bare floor still only knocks a man down, so out here you have to herd him into the furniture —
    // posts, tables, braziers, a ring of hay you light yourself — and decide which half of a room is
    // yours before the rifles decide it for you. Corridors are wide enough that it reads as one yard.
    // Nothing new walks in: the room itself is the new thing.
    // A room shorter than it was (14 → 13) and a softer approach into it: every set piece below is
    // still at the room index it always was — the cut room was the one at the tail nothing points
    // at — and the curve starts a beat lower and tops out a beat lower too, off a 14 Sep 2026
    // playtest note that this floor ran hard for what is level four.
    name: 'THE THRESHING FLOOR', sub: 'Level 5', rooms: 13, corridorW: 5,
    canon: { id: 'open', name: 'OPEN GROUND', idea: 'Almost no wall. What kills is what is standing in the room: posts, tables, braziers, a ring of hay, and which half of it you decide is yours.' },
    theme: 'An open threshing floor, swept for grain and now for bodies.',
    decor: 'Wide yards, posts, tables, braziers, rings of hay, almost no wall at all.',
    arenas: [{ at: 3, boss: 'seer' }, { at: 8, boss: 'butcher' }, { at: 12, boss: 'champion' }],
    gates: [5, 11],
    millAt: 6, heals: 4, souls: 2, killboxAt: 10, lonePosts: 4, racks: 0.18, spikes: 0.35, crates: 0.4, barrels: 0.3, vaultAt: 7, traps: 1,
    // The crow is met on the widest, fullest floor in the game, because the one thing it asks for is
    // bodies and this is the floor that has them (js/beasts.js).
    beasts: ['crow', 'goose'],
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter'],
      introduce: [],
      // Nothing new walks in here, so the only thing that can make the yard harder than the road is
      // the curve itself: the road carries a Great Hall and a gallery and this does not, and the two
      // levels were coming out level. Eased back a step on both ends after it played harder than a
      // level four should: `from` now dips the way level five's own opening does, and `to` gives up
      // a tenth of what it topped out at.
      // A step up from 5→12 when the two gate rooms went quiet: with two fewer rooms to fight in, the
      // old curve left this level barely harder than THE ROAD.
      from: 9, to: 19, ease: 1.2,
    },
    floor: '#5f5a4a', floorAlt: '#67624f', wall: '#7b6c50', wallTop: '#9d8c69',
    fog: '#0b0b0a', doorChance: 0.12, ironDoors: 0.8, clockDoors: 0.55, stack: 0.3,
    // Every other level says what to watch for on its own floor; this one went without because the
    // canon idea was thought to say it already. It did not — a first-time player read "open ground"
    // as relief rather than as a warning that the wall stops helping here.
    hint: 'THE WALL WON’T KILL FOR YOU HERE. THE FURNITURE WILL.', hintKey: null,
  },
  {
    // Everything the compound has left, all at once, on the bridge they were driving you over.
    name: 'THE BRIDGE', sub: 'Level 6', rooms: 15,
    // The most men of any level so far, and the rooms are built so that they cannot all reach you
    // at once: a gate of pillars, a throat of tables, a pinch in the middle. Seven men are one man
    // in a doorway, and the doorway is what every room here has.
    canon: { id: 'funnel', name: 'THE FUNNEL', idea: 'Seven men are one man in a doorway. Every room narrows somewhere, and the fight is at the narrow part, on whichever side of it you chose.' },
    theme: 'The bridge that carries the compound’s stores across the ravine.',
    decor: 'Pillar gates, table throats, hunters and hounds crowding every narrow doorway.',
    arenas: [{ at: 4, boss: 'butcher' }, { at: 9, boss: 'seer' }, { at: 14, boss: 'butcher' }],
    gates: [8, 13],
    millAt: 7, heals: 3, souls: 2, hallAt: 12, hallThreat: 24, galleryAt: 2, killboxAt: 6, lonePosts: 4, racks: 0.16, spikes: 0.35, crates: 0.35, barrels: 0.25, traps: 2, vaultAt: 5,
    beasts: ['tortoise', 'crow'],
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter'],
      introduce: [],
      from: 4, to: 24, ease: 1.15,
      // The bridge is the only ground allowed a room this crowded, and a third rifle on it.
      cap: { men: 9, hunter: 2, dog: 3 },
    },
    floor: '#2f3640', floorAlt: '#353d48', wall: '#1d2028', wallTop: '#2f3440',
    fog: '#06070a', doorChance: 0.3, ironDoors: 0.55, clockDoors: 0.6, stack: 0.35,
    hint: 'EVERYTHING THEY HAVE LEFT IS HERE', hintKey: 'scream',
  },
  {
    // Up in the roof of the hall, and the first ground in the compound that is not all there. Holes
    // in the boards, windows out into the night, and the same drop under both. A man who goes over an
    // edge does not come back; the goat comes back a heart lighter at the spot he went in, which is
    // what makes an edge something to work with rather than something to keep away from. Nothing new
    // walks in — the missing floor is the new thing, and it is the only thing here that kills for you
    // without being in the room.
    name: 'THE RAFTERS', sub: 'Level 7', rooms: 15,
    canon: { id: 'drop', name: 'THE DROP', idea: 'The floor is not all there. Holes in the boards and windows in the walls, the same fall under both, and nobody who goes over comes back.' },
    theme: 'The rafters over the great hall, where the roof itself has started to give.',
    decor: 'Holes in the boards, windows in the walls, narrow catwalks, the same fall under both.',
    arenas: [{ at: 4, boss: 'seer' }, { at: 10, boss: 'butcher' }, { at: 14, boss: 'champion' }],
    gates: [6, 13],
    // Windows are this level's and nobody else's: a hole in a wall is a drop, and the drop is the
    // one new thing THE RAFTERS has. Every other level's walls are the inside of a compound.
    millAt: 7, heals: 4, souls: 2, killboxAt: 12, lonePosts: 3, racks: 0.16, spikes: 0.4, crates: 0.3, barrels: 0.3, vaultAt: 8, windows: 0.55, traps: 1,
    // Not the tortoise: a floor whose one idea is the drop is not the floor to be walking a thing
    // that has to be thrown across it.
    beasts: ['crow', 'goose'],
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter'],
      introduce: [],
      from: 9, to: 34, ease: 1.15,
      cap: { men: 9, hunter: 2, dog: 3 },
    },
    floor: '#4b433a', floorAlt: '#544a40', wall: '#241d1a', wallTop: '#453629',
    fog: '#06060a', doorChance: 0.2, ironDoors: 0.7, clockDoors: 0.6, stack: 0.35,
    hint: 'THE FLOOR ENDS. THEY FALL FURTHER THAN YOU.', hintKey: 'butt',
  },
  {
    // Under the bridge is where everything the compound ever killed went, and none of it stayed put.
    // The living are a garrison here rather than the point: what the level is about is the thing that
    // is not in the room until it is behind you. Walls do not hold them, so there is nowhere to put
    // your back — the only cover on this ground is which way you are looking.
    name: 'THE OSSUARY', sub: 'Level 8', rooms: 15,
    // The dead come from behind, and a body cannot form inside stone. So the rooms are niches and
    // lanes — stone to put your back to — with open floor between them that you have to cross with
    // nothing at your back at all. The level is about where you are looking, and the rooms are
    // about how often you have to stop looking.
    canon: { id: 'niche', name: 'THE NICHE', idea: 'A body cannot form inside stone. Niches and lanes take arcs away from the dead; the open floor between them gives every arc back.' },
    theme: 'The ossuary beneath the bridge, where nothing the compound ever killed stayed put.',
    decor: 'Stone niches and lanes, open floor between them, wraiths arriving from behind.',
    arenas: [{ at: 4, boss: 'butcher' }, { at: 9, boss: 'wraith' }, { at: 13, boss: 'seer' }],
    gates: [8, 12],
    millAt: 6, heals: 4, souls: 2, killboxAt: 11, lonePosts: 2, racks: 0.2, spikes: 0.35, crates: 0.35, barrels: 0.2, traps: 2, vaultAt: 7,
    beasts: ['crow', 'tortoise'],
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter', 'wraith'],
      // The first room of the level is the wraith on its own, because nothing else in the game
      // teaches you that you cannot hit it.
      introduce: [['wraith', 0]],
      from: 15, to: 52, ease: 1.12,
      // The dead outnumber the garrison here, and a room may hold three of them.
      weight: { wraith: 9, bearer: 4, dog: 2, champion: 1, hunter: 2, seer: 1 },
      cap: { wraith: 4, men: 9 },
    },
    floor: '#22242b', floorAlt: '#282a33', wall: '#3a3730', wallTop: '#565044',
    fog: '#05060a', doorChance: 0.22, ironDoors: 0.65, clockDoors: 0.6, stack: 0.35,
    hint: 'IT CANNOT STOP ONCE IT STARTS. LET IT START.', hintKey: 'butt',
  },
];

// What an escort is worth, said out loud on the clear card — the one place a player ever learns
// that nursing the thing across a floor paid for itself. The numbers are read off TUNING so a line
// here cannot drift from what js/beasts.js actually does.
const BEAST_CARD = {
  tortoise: ['THE TORTOISE CAME WITH YOU', `EVERY SHIELD TAKES ${TUNING.prop.tortoise.saveShield} MORE BLOW, FOR THE REST OF THE RUN`],
  goose: ['THE GOOSE CAME WITH YOU', `YOUR VOICE REACHES ${Math.round((TUNING.prop.goose.saveScreamRange - 1) * 100)}% FURTHER AND COMES BACK ${Math.round((1 - TUNING.prop.goose.saveScreamCd) * 100)}% SOONER`],
  crow: ['THE CROW CAME WITH YOU', `IT HAS FOUND A TALISMAN, TIER ${'I'.repeat(TUNING.prop.crow.giftTier)}. IT WILL BE ON THE NEXT STAIRS, FREE`],
};

// What the player has already been shown by the time each level starts: every kind an earlier level
// put in front of him, bosses included. A kind is introduced on its own once a run, not once a level,
// so the second Butcher of a run arrives with company like anybody else.
// `known` is the same idea for rooms: the canons of every level before this one, which is what the
// mix half of a level is allowed to draw from. A room built round the drop never turns up before the
// level whose whole point is the drop.
(() => {
  const met = new Set(), known = new Set();
  for (const def of LEVELS) {
    def.met = new Set(met);
    for (const k of def.encounters.kinds) met.add(k);
    for (const [k] of (def.encounters.introduce || [])) met.add(k);
    for (const a of (def.arenas || [])) met.add(a.boss);
    def.known = new Set(known);
    if (def.canon) known.add(def.canon.id);
  }
})();

// THE TRIP. Not a level of the run but a level in place of one: a tuft of pale mushrooms lies on the
// floor of some levels (`TUNING.shroom`), and a goat who stands over it eats it and plays the NEXT
// level as this instead. It keeps that level's length, its soul budget, its gates, its vault and the
// places its arenas stand, so it sits in the run where the level it replaced would have — but every
// key is the other way round (`game.tripInput`: the stick reversed, the horns and the teeth swapped,
// the tumble and the voice swapped), so what is asked of the goat is far less. Clubmen only, the
// brute in the rings, no grating, no trap rooms, no wheel, no drop, and a curve cut to `threatMul`.
// It is a cave (`cave: true`), and the renderer grows mushrooms over all of it (`def.shroom`).
const TRIP_LEVELS = {};
function tripLevel(i) {
  if (TRIP_LEVELS[i]) return TRIP_LEVELS[i];
  // The curve is the FIRST level's, whichever floor the mushrooms were eaten on: see `TUNING.shroom`.
  const base = LEVELS[i], S = TUNING.shroom, E = LEVELS[0].encounters;
  const def = {
    name: 'THE TRIP', sub: base.sub, rooms: base.rooms, shroom: true, trip: i,
    theme: 'Something in the floor of the last level, and now the floor of this one is breathing.',
    decor: 'Mushrooms on every wall, caps as tall as a man to break, a glow off the ground; every key the other way round.',
    cave: true, grass: 0.6, rocks: 0.95,
    grassColor: '#2d6f6a', grassHi: '#86e8c8', grassDark: '#173a3c',
    // Level one's own ring: one brute, one man at his back. Not the boss of the floor it replaced.
    arenas: (base.arenas || []).map((a) => ({ at: a.at, boss: 'champion', escorts: 1 })),
    gates: base.gates, vaultAt: base.vaultAt, souls: base.souls, heals: (base.heals || 0) + 1,
    lonePosts: 0, racks: 0.25, spikes: 0, crates: 0.3, traps: 0, windows: 0,
    encounters: {
      kinds: S.kinds.slice(), introduce: [],
      from: E.from * S.threatMul, to: E.to * S.threatMul, ease: E.ease,
      cap: { men: S.men },
    },
    floor: '#2a2138', floorAlt: '#302541', wall: '#3b2350', wallTop: '#6a4380',
    fog: '#07040b', doorChance: 0.15, ironDoors: 0.15, clockDoors: 0, stack: 0.2,
    hint: 'YOU ATE THE MUSHROOMS. EVERYTHING IS THE OTHER WAY ROUND.', hintKey: null,
  };
  // It has met whatever the level it replaced had met, and it knows the rooms that level knew — all
  // but the drop, which with the stick reversed is not a room but a coin toss.
  def.met = new Set([...(base.met || []), ...E.kinds, 'champion']);
  def.known = new Set([...(base.known || []), ...(base.canon ? [base.canon.id] : [])].filter((c) => c !== 'drop'));
  return (TRIP_LEVELS[i] = def);
}

// THE DARK. The same floor with the lamps out (`TUNING.dark`): its rooms, its canon, its bosses and
// its souls, but only what burns is lit, so it is cut to a gentler curve and fewer traps
// (`dark.soften`) and the generator hangs lamps in the rooms that had no flame. Unlike the trip it
// is still that level to everything that asks which level it is — the mouse, the milk rhythm — so
// those ask `levelIndexOf` and not `LEVELS.indexOf`.
const DARK_LEVELS = {};
function darkLevel(i) {
  if (DARK_LEVELS[i]) return DARK_LEVELS[i];
  const base = LEVELS[i], D = TUNING.dark.soften, E = base.encounters;
  const def = Object.assign({}, base, {
    dark: true, darkOf: i,
    encounters: Object.assign({}, E, { from: E.from * D.from, to: E.to * D.to, ease: 1 + ((E.ease || 1) - 1) * D.ease,
      kinds: E.kinds.filter((k) => k !== 'hunter'), introduce: (E.introduce || []).filter(([k]) => k !== 'hunter'),
      weight: E.weight && Object.fromEntries(Object.entries(E.weight).filter(([k]) => k !== 'hunter')),
      cap: Object.assign({}, E.cap, { men: Math.max(3, Math.round(((E.cap && E.cap.men) || ENCOUNTER.cap.men) * D.men)) }) }),
    traps: Math.floor((base.traps || 0) * D.traps), spikes: (base.spikes || 0) * D.spikes, killboxAt: undefined, lonePosts: 0,
    hint: 'THE LAMPS ARE OUT. YOU HEAR THEM BEFORE YOU SEE THEM.', hintKey: null,
  });
  return (DARK_LEVELS[i] = def);
}
// Which floor of the run a level is: its place in LEVELS, or, played dark, the place of the level
// it is the dark of. THE TRIP stays -1 on purpose (see `tripLevel`).
function levelIndexOf(def) {
  return def && def.darkOf !== undefined ? def.darkOf : LEVELS.indexOf(def);
}
