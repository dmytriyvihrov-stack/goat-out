// GOAT OUT — all tuning values in one place. Units: px, seconds. 1 tile = TILE px.
const TILE = 32;
// The version tag shown under the seed in the corner of the screen, and nothing else — bump it
// by hand alongside a CHANGELOG entry so a bug report can name the build it happened on.
const BUILD = '1.44';

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
    dashRange: 4.5, dashSpeed: 13 * TILE, dashTime: 0.6, dashTurn: 2.6, dashSkew: 0.45,
    flooredTime: 0.7,
    dodge: 0.38, dodgeCd: 1.2, dodgeSpeed: 15 * TILE, dodgeTime: 0.2,
    circle: 2.6, circleFlip: 0.9, lungeCd: 1.8, retreat: 0.45,
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
    chaseNoise: 3 },   // chance a second of noise off a man in full pursuit — the herd is not quiet
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
    // POISON meets STUN: `damage` hits, and both statuses are spent doing it.
    sting: { damage: 1 },
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
    heal: { r: 12, pickupR: 22, every: 4.5, gapMax: 4, grazeTime: 1.4, grazeSpeed: 30 },
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
    mouse: { r: 9, lines: ['PLEASE. NOT THAT.', 'ONCE MORE AND YOU WILL SEE.'], thanks: 'GO ON, THEN. THE DOOR IS OPEN.', squeakPitch: 1400 },
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
  },
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
  cave: { roundR: 16, erode: [2, 3], bump: 0.12 },
  // Tall grass (level eight), Cult of the Lamb's: it stands over whatever is in it, so a body in it
  // shows from the waist up, and the goat's own eye stops at it — `seeInto` tiles of it are lit from
  // where he stands and the rest of the patch, and what is behind it, is shade. It hides him the same
  // way: a man further than `hideR` tiles off does not see a goat standing in grass, whatever his cone
  // says. A headbutt cuts what is in front of it (`cutR`), fire burns it off, and `lurk` of the men
  // put in a room with a patch in it are put down in the patch instead, still and half-hidden.
  // `patch` is how many patches an ordinary room gets when it gets any, `size` the tiles in one.
  grass: { seeInto: 1.5, hideR: 2.6, cutR: 1.3, lurk: 0.3, lurkAlpha: 0.55, patch: [1, 3], size: [5, 12], sway: 1.6 },
  // THE SHOP. The mouse does not take the dead any more, and she is not on every level: she turns
  // up on the levels in `levels` (indices — THE YARD, THE THRESHING FLOOR, THE RAFTERS) and stands
  // in the level's MIDDLE soul gate in place of the soul that room would have held (see `gates` on
  // `LEVELS`). Her offer is free and it is a choice: `wares` talismans on her stools, one of them
  // yours, the other packed away the moment you reach for one — and taking it is what lifts the
  // gate out of her room. Each visit stocks the next tier (the first of `levels` is tier one, the
  // second tier two...), so the third mouse of a run is selling the room rewritten. `heals` bowls
  // of milk are set down in front of her hole on top of it, taken or not. `strikes` is the blows
  // she takes before she turns; the rat ogre's shelf is free once he is down, and still one choice.
  // `spread` is tiles between the milk and each talisman in the row she lays out in front of herself.
  shop: { levels: [1, 3, 5], wares: 2, heals: 3, strikes: 3, spread: 1.5,
    // The boomerang in flight: its speed, its size against a man, and how long the way back may
    // take before it simply arrives (it curves home through anything; this is the belt to that).
    boomerang: { speed: 11 * TILE, r: 8, homeMax: 3.0 } },
  // THE CLAMP. A room two behind the goat, with nobody alive left in it, is shut for good: its way
  // out goes back to stone and an iron clamp is bolted over the mouth (`game.updateClamps`). The
  // room he has just come out of stays open — that is the one you can still step back into. `slam`
  // is the seconds the plate takes to drive home, `hear` how many tiles off the clank still carries.
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
      killGain: 0.12, actionGain: 0.09,
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
  soul: { r: 13, pickupR: 22, bossChance: 0.4, roomChance: 0.35 },
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
  headbuttReach: 1, headbuttImpulse: 1, headbuttRecovery: 1,
  shieldBullets: 2, holdTime: 8.0, livingShield: false, grabCooldown: 1,
  // Grab lifts objects out of the pen and nothing else. A crate, a blade, a shield: things a goat
  // could plausibly get its teeth into. A man is BY THE COLLAR, and until that soul is swallowed
  // every trick built on carrying one — the living shield, the strong jaw, devouring — is off the
  // table, because a card that needs a verb you have not got is a wasted card.
  grabMen: false,
  screamCooldown: 3.0, screamRadius: 6.8,
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
  oracle: 0.6, ember: 0.6, kindling: 0.8, throat: 0.8 };

// Every boon's tunable numbers live in its own `params`, not buried in `apply`'s body, so the
// BOONS tab of the dev tool can list, show and edit them generically — `apply(m, p)` always
// reads its multipliers off `p` rather than off a literal, the same read-the-mod-at-the-use-site
// discipline `TUNING`/`mods` already follow. A boon with nothing numeric to turn (it only flips a
// flag) simply has no `params`. `emoji` is the one glyph that stands for the boon everywhere it is
// named at a glance — the rail, the hover note, the pick-one-of-three cards. `minLevel` is the
// level index (0 = THE ALTAR) below which the card is never dealt — off by default, so the dev
// tool is the only thing that ever needs to set one.
const BOONS = [
  // ---- actives: they change what a button does ----
  { id: 'collar', skill: 'grab', active: true, key: true, emoji: '⛓️', minLevel: 0, name: 'BY THE COLLAR',
    desc: 'Take a man in your teeth the way you take a box. He stops bullets, and he throws.',
    apply: (m) => { m.grabMen = true; } },
  { id: 'howl', skill: 'scream', active: true, emoji: '📢', minLevel: 0, name: 'THE FULL THROAT',
    desc: 'BAAH stops being a noise. Everyone who hears it loses a moment, and that moment is yours.',
    params: { cooldown: TUNING.goat.scream.cooldown },
    apply: (m, p) => { m.screamStun = true; m.screamCooldown = p.cooldown; } },
  { id: 'breath', skill: 'scream', active: true, emoji: '🔥', minLevel: 0, name: 'DRAGON BREATH', desc: 'The scream becomes a cone of fire. Slower to recharge.',
    params: { cooldown: TUNING.goat.breath.cooldown },
    apply: (m, p) => { m.breath = true; m.screamCooldown = p.cooldown; } },
  { id: 'bomb', skill: 'butt', active: true, emoji: '💣', minLevel: 0, name: 'BOMB CHARGE', desc: 'Anyone you headbutt goes off if he lands on a wall or another man.',
    apply: (m) => { m.bomb = true; } },
  { id: 'devour', skill: 'grab', active: true, needs: 'grabMen', emoji: '🍖', minLevel: 0, name: 'DEVOUR', desc: 'Keep holding a man and you tear him open. It may feed you.',
    apply: (m) => { m.devour = true; } },
  { id: 'weight', skill: 'roll', active: true, emoji: '🪨', minLevel: 0, name: 'DEAD WEIGHT', desc: 'The tumble stops being an escape. Everything it goes through loses its head for a moment.',
    params: { stun: TUNING.goat.roll.stun },
    apply: (m, p) => { m.rollStun = p.stun; } },
  // Poison, one on each button, and a second grab active that is a bomb you make yourself.
  { id: 'splash', skill: 'butt', active: true, emoji: '💦', minLevel: 0, name: 'SPLASH',
    desc: 'The moment you lower your head, whoever is right behind you is poisoned.',
    apply: (m) => { m.splash = true; } },
  { id: 'venomjaw', skill: 'grab', active: true, emoji: '🐍', minLevel: 0, name: 'VENOM JAW',
    desc: 'Hold anything two seconds and it leaves your mouth dripping: it sprays poison all the way down.',
    params: { holdFor: 2 },
    apply: (m, p) => { m.venomHold = p.holdFor; } },
  { id: 'charge', skill: 'grab', active: true, emoji: '⚡', minLevel: 0, name: 'CHARGED',
    desc: 'Hold anything two seconds and it is charged. Thrown, it goes off where it lands.',
    params: { holdFor: 2 },
    apply: (m, p) => { m.chargeHold = p.holdFor; } },
  { id: 'venomroll', skill: 'roll', active: true, emoji: '🦠', minLevel: 0, name: 'SOUR TUMBLE',
    desc: 'Every roll ends in a spray of poison where you get up.',
    apply: (m) => { m.venomRoll = true; } },
  { id: 'spit', skill: 'scream', active: true, emoji: '🫧', minLevel: 0, name: 'VENOM SPIT',
    desc: 'The scream becomes a glob of poison. Where it bursts, three tiles by three of it.',
    params: { cooldown: 4.5 },
    apply: (m, p) => { m.spit = true; m.screamCooldown = p.cooldown; } },

  // ---- passives ----
  { id: 'hide', emoji: '❤️', minLevel: 0, name: 'THICK HIDE', desc: 'One more heart, and it fills now.',
    params: { heartsAdd: 1 },
    apply: (m, p) => { m.maxHp += p.heartsAdd; }, heal: 1 },
  { id: 'horns', skill: 'butt', emoji: '🐏', minLevel: 0, name: 'LONG HORNS', desc: 'Headbutt reaches further and throws harder.',
    params: { reachMul: 1.38, impulseMul: 1.25 },
    apply: (m, p) => { m.headbuttReach *= p.reachMul; m.headbuttImpulse *= p.impulseMul; } },
  { id: 'skull', skill: 'butt', emoji: '💀', minLevel: 0, name: 'IRON SKULL', desc: 'Recover from a headbutt far quicker.',
    params: { recoveryMul: 0.5 },
    apply: (m, p) => { m.headbuttRecovery *= p.recoveryMul; } },
  { id: 'jaw', skill: 'grab', needs: 'grabMen', emoji: '🦷', minLevel: 0, name: 'STRONG JAW', desc: 'A held man stops four bullets, struggles longer, and you reach for the next one sooner.',
    params: { shieldBullets: 4, holdTime: 13, cooldownMul: 0.6 },
    apply: (m, p) => { m.shieldBullets = p.shieldBullets; m.holdTime = p.holdTime; m.grabCooldown *= p.cooldownMul; } },
  { id: 'shield', skill: 'grab', needs: 'grabMen', emoji: '🛡️', minLevel: 0, name: 'LIVING SHIELD', desc: 'A held man keeps swinging and firing, at his own side, not you.',
    apply: (m) => { m.livingShield = true; } },
  { id: 'kindling', emoji: '🪵', minLevel: 0, name: 'KINDLING', desc: 'A man on fire lights the next one he touches.',
    apply: (m) => { m.firePass = Math.max(m.firePass, 1); } },
  { id: 'throat', skill: 'scream', emoji: '🗣️', minLevel: 0, name: 'RAW THROAT', desc: 'Scream twice as often, and half again as far.',
    params: { cooldownMul: 0.5, radius: 13 },
    apply: (m, p) => { m.screamCooldown *= p.cooldownMul; m.screamRadius = p.radius; } },
  { id: 'hooves', emoji: '💨', minLevel: 0, name: 'SURE HOOVES', desc: 'Run faster than anything in the building.',
    params: { speedMul: 1.13 },
    apply: (m, p) => { m.speed *= p.speedMul; } },
  { id: 'joints', skill: 'roll', emoji: '🤸', minLevel: 0, name: 'LOOSE JOINTS', desc: 'Roll further, and far more often.',
    params: { distanceMul: 1.35, cooldownMul: 0.45 },
    apply: (m, p) => { m.rollDistance *= p.distanceMul; m.rollCooldown *= p.cooldownMul; } },
  { id: 'ember', emoji: '🧯', minLevel: 0, name: 'EMBER COAT', desc: 'Ordinary fire takes three times as long to start hurting you. Witchfire never cared.',
    params: { fireResist: 3 },
    apply: (m, p) => { m.fireResist = p.fireResist; } },
  { id: 'oracle', emoji: '👁️', minLevel: 0, name: 'THE ORACLE', desc: 'You see through the walls close about you. The far corners stay dark.',
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
const ARTIFACTS = [
  { id: 'firecharm', name: 'FIRE AMULET', color: '#f2a233',
    tiers: [
      { desc: 'A burning man lights the next one he touches. That one lights nobody.', params: { pass: 1 } },
      { desc: 'A burning man lights the next, and the next one lights one more.', params: { pass: 2 } },
      { desc: 'Fire runs the room: every burning man lights whoever he touches.', params: { pass: 6 } }],
    apply: (m, p) => { m.firePass = Math.max(m.firePass, p.pass); } },
  { id: 'clover', name: 'LUCKY CLOVER', color: '#7c8f52',
    tiers: [
      { desc: 'The next floor hides more: better odds of a wall that gives, a rack, and grass behind it.', params: { secret: 1.6, racks: 1.5, grass: 1.5, heals: 0 } },
      { desc: 'The next floor is kinder still: two walls that give, more racks, and one more bowl of milk.', params: { secret: 2.4, racks: 2, grass: 1.9, heals: 1 } },
      { desc: 'The next floor is yours: a wall that gives in most rooms, arms everywhere, milk one room sooner.', params: { secret: 3, racks: 2.8, grass: 2.4, heals: 2 } }],
    apply: (m, p) => { m.luck = p; } },
  { id: 'boomerang', name: 'BOOMERANG', color: '#efe6d0',
    tiers: [
      { desc: 'Press Q to throw it. The first man it meets loses his head for a moment, and it comes back to you.', params: { stun: 1.2, cooldown: 10, range: 6, pierce: 1 } },
      { desc: 'Two men, further out, and Q is ready sooner.', params: { stun: 1.8, cooldown: 7, range: 7.5, pierce: 2 } },
      { desc: 'Everything on its way out and everything on its way back, and Q is barely ever waiting.', params: { stun: 2.4, cooldown: 5, range: 9, pierce: 99 } }],
    apply: (m, p) => { m.boomerang = p; } },
  { id: 'symbols', name: 'STRANGE SYMBOLS', color: '#7d5cff',
    tiers: [
      { desc: 'Press Q: a step through nowhere, three tiles the way you are going, at once and with no tumble.', params: { dist: 3, cooldown: 6, stun: 0 } },
      { desc: 'Four tiles and a half, and Q is ready sooner.', params: { dist: 4.5, cooldown: 4, stun: 0 } },
      { desc: 'Six tiles, barely any wait, and whoever stood where you left loses his head.', params: { dist: 6, cooldown: 2.2, stun: 0.9 } }],
    apply: (m, p) => { m.blink = p; } },
];

// The mouse's third offer, beside her two talismans: no talisman at all, three bowls of milk set down
// in front of her hole. Shaped like an `ARTIFACTS` entry so the shelf can draw and read it out the same
// way; `Shop.buy` is what knows it is not one.
const MILK_OFFER = { id: 'milk', name: 'THREE BOWLS OF MILK', color: '#efe6d0',
  tiers: [{ desc: 'No talisman. Three bowls set down in front of her: stand in one to drink, a heart a bowl.' }] };

// What the death card says took the last heart: a kind of man (a clubman is split into the
// ordinary one and the brute in `game.killedBy`), or the word a hazard passes to `Goat.damage`.
const KILLED_BY = {
  hunter: 'RIFLEMAN', dog: 'HOUND', seer: 'MAGE', butcher: 'BUTCHER', wraith: 'WRAITH', ratogre: 'RAT OGRE',
  fire: 'FIRE', witchfire: 'WITCHFIRE', spike: 'THE GRATING', bomb: 'A BOMB', mill: 'THE WHEEL',
  fall: 'THE DROP', rifle: 'A STRAY BULLET',
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
    // The first mouse of the run stands in the middle gate; the late gate's soul and the vault's are
    // the level's two. The seer is sealed in all the same: both doors of his room go iron the moment
    // the goat is inside, and neither gives until he does.
    arenas: [{ at: 4, boss: 'butcher' }, { at: 9, boss: 'seer', sealed: true }],
    gates: [5, 10],
    millAt: 7, heals: 2, souls: 2, racks: 0.16, traps: 1, crates: 0.3, vaultAt: 6, coops: 0.1,
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
    // The rifle arrives early, alone, and then never stops being the reason you keep moving.
    name: 'THE ROAD', sub: 'Level 3', rooms: 14,
    // A rifle owns everything it can see. The rooms are colonnades, long naves and lines of stub
    // cover: the level is about the strip of floor a rifle cannot see and how you get to it.
    canon: { id: 'line', name: 'THE LINE', idea: 'Long sightlines and hard cover. A rifle owns whatever it can see, so the room is about what it cannot, and about crossing the rest.' },
    theme: 'The processional road out of the compound, watched the whole way by rifles.',
    decor: 'Colonnades, long naves, stub cover, a killbox, grating underfoot, the Great Hall.',
    arenas: [{ at: 5, boss: 'butcher' }, { at: 11, boss: 'butcher' }],
    gates: [7, 12],
    millAt: 8, heals: 2, souls: 2, hallAt: 9, hallThreat: 11, galleryAt: 6, killboxAt: 10, lonePosts: 3, racks: 0.14, traps: 2, coops: 0.08,
    // The floor starts answering back here: a stretch of grating you cross and whoever is on your
    // heels crosses a beat later, when it is no longer floor.
    spikes: 0.3, crates: 0.35, vaultAt: 4,
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter'],
      introduce: [['hunter', 0.2]],
      from: 3, to: 9, ease: 1.25,
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
    name: 'THE THRESHING FLOOR', sub: 'Level 4', rooms: 13, corridorW: 5,
    canon: { id: 'open', name: 'OPEN GROUND', idea: 'Almost no wall. What kills is what is standing in the room: posts, tables, braziers, a ring of hay, and which half of it you decide is yours.' },
    theme: 'An open threshing floor, swept for grain and now for bodies.',
    decor: 'Wide yards, posts, tables, braziers, rings of hay, almost no wall at all.',
    arenas: [{ at: 3, boss: 'seer' }, { at: 8, boss: 'butcher' }, { at: 12, boss: 'champion' }],
    gates: [5, 11],
    millAt: 6, heals: 4, souls: 2, killboxAt: 10, lonePosts: 4, racks: 0.18, spikes: 0.35, crates: 0.4, vaultAt: 7, traps: 1,
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
      from: 6, to: 13, ease: 1.2,
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
    name: 'THE BRIDGE', sub: 'Level 5', rooms: 15,
    // The most men of any level so far, and the rooms are built so that they cannot all reach you
    // at once: a gate of pillars, a throat of tables, a pinch in the middle. Seven men are one man
    // in a doorway, and the doorway is what every room here has.
    canon: { id: 'funnel', name: 'THE FUNNEL', idea: 'Seven men are one man in a doorway. Every room narrows somewhere, and the fight is at the narrow part, on whichever side of it you chose.' },
    theme: 'The bridge that carries the compound’s stores across the ravine.',
    decor: 'Pillar gates, table throats, hunters and hounds crowding every narrow doorway.',
    arenas: [{ at: 4, boss: 'butcher' }, { at: 9, boss: 'seer' }, { at: 14, boss: 'butcher' }],
    gates: [8, 13],
    millAt: 7, heals: 3, souls: 2, hallAt: 12, hallThreat: 24, galleryAt: 2, killboxAt: 6, lonePosts: 4, racks: 0.16, spikes: 0.35, crates: 0.35, traps: 2, vaultAt: 5,
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter'],
      introduce: [],
      from: 5, to: 15, ease: 1.15,
      // The bridge is the only ground allowed a room this crowded, and a third rifle on it.
      cap: { men: 9, hunter: 3, dog: 3 },
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
    name: 'THE RAFTERS', sub: 'Level 6', rooms: 15,
    canon: { id: 'drop', name: 'THE DROP', idea: 'The floor is not all there. Holes in the boards and windows in the walls, the same fall under both, and nobody who goes over comes back.' },
    theme: 'The rafters over the great hall, where the roof itself has started to give.',
    decor: 'Holes in the boards, windows in the walls, narrow catwalks, the same fall under both.',
    arenas: [{ at: 4, boss: 'seer' }, { at: 10, boss: 'butcher' }, { at: 14, boss: 'champion' }],
    gates: [6, 13],
    // Windows are this level's and nobody else's: a hole in a wall is a drop, and the drop is the
    // one new thing THE RAFTERS has. Every other level's walls are the inside of a compound.
    millAt: 7, heals: 4, souls: 2, killboxAt: 12, lonePosts: 3, racks: 0.16, spikes: 0.4, crates: 0.3, vaultAt: 8, windows: 0.55, traps: 1,
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter'],
      introduce: [],
      from: 8, to: 23.5, ease: 1.15,
      cap: { men: 9, hunter: 3, dog: 3 },
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
    name: 'THE OSSUARY', sub: 'Level 7', rooms: 15,
    // The dead come from behind, and a body cannot form inside stone. So the rooms are niches and
    // lanes — stone to put your back to — with open floor between them that you have to cross with
    // nothing at your back at all. The level is about where you are looking, and the rooms are
    // about how often you have to stop looking.
    canon: { id: 'niche', name: 'THE NICHE', idea: 'A body cannot form inside stone. Niches and lanes take arcs away from the dead; the open floor between them gives every arc back.' },
    theme: 'The ossuary beneath the bridge, where nothing the compound ever killed stayed put.',
    decor: 'Stone niches and lanes, open floor between them, wraiths arriving from behind.',
    arenas: [{ at: 4, boss: 'butcher' }, { at: 9, boss: 'wraith' }, { at: 13, boss: 'seer' }],
    gates: [8, 12],
    millAt: 6, heals: 4, souls: 2, killboxAt: 11, lonePosts: 2, racks: 0.2, spikes: 0.35, crates: 0.35, traps: 2, vaultAt: 7,
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter', 'wraith'],
      // The first room of the level is the wraith on its own, because nothing else in the game
      // teaches you that you cannot hit it.
      introduce: [['wraith', 0]],
      from: 11, to: 34, ease: 1.12,
      // The dead outnumber the garrison here, and a room may hold three of them.
      weight: { wraith: 9, bearer: 4, dog: 2, champion: 1, hunter: 2, seer: 1 },
      cap: { wraith: 4, men: 9 },
    },
    floor: '#22242b', floorAlt: '#282a33', wall: '#3a3730', wallTop: '#565044',
    fog: '#05060a', doorChance: 0.22, ironDoors: 0.65, clockDoors: 0.6, stack: 0.35,
    hint: 'IT CANNOT STOP ONCE IT STARTS. LET IT START.', hintKey: 'butt',
  },
  {
    // Out under the compound, the ground stops being built. Nothing in the cave was laid by a hand:
    // no wall runs straight, no corner is square, and the room is whatever the rock left. What that
    // does to the one idea the whole game rests on — the wall kills — is make it a curve: a man
    // thrown along a bend in the rock slides round it instead of stopping dead on a corner, so the
    // stone that kills here is the stone he hits square. And the floor is not bare: tall grass that
    // you cannot see into or past, with a man lying in some of it, and boulders you break or go round.
    // Nothing new walks in. The cave itself is the new thing, the way the drop was.
    name: 'THE CAVE', sub: 'Level 8', rooms: 15,
    canon: { id: 'hollow', name: 'THE HOLLOW', idea: 'No wall runs straight. The rock curves, so a man thrown along it slides; he dies on what he hits square — a boulder, the end of a bend. The grass hides whoever is in it, and that includes you.' },
    theme: 'The caves the compound was dug out of, where nobody bothered to square the walls.',
    decor: 'Round rock, tall grass that hides, boulders that break, hounds and a garrison in the dark.',
    // `cave` rounds the rock (`TUNING.cave`) and erodes the corners of every ordinary room; `grass`
    // and `rocks` are the per-room chances of a patch of tall grass and a scatter of boulders, on top
    // of whatever the room's own template already put down.
    cave: true, grass: 0.8, rocks: 0.7, grassColor: '#3d5a2a', grassHi: '#6f8f45', grassDark: '#223618',
    arenas: [{ at: 4, boss: 'butcher' }, { at: 9, boss: 'champion' }, { at: 14, boss: 'seer' }],
    gates: [8, 13],
    millAt: 6, heals: 4, souls: 2, killboxAt: 11, lonePosts: 2, racks: 0.18, spikes: 0.2, crates: 0.25, traps: 1, vaultAt: 7,
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter', 'wraith'],
      introduce: [],
      from: 12, to: 44, ease: 1.1,
      // Hounds are what a cave is kept with, and the grass is where they wait.
      weight: { bearer: 3, dog: 4, hunter: 2, seer: 2, champion: 2, wraith: 4 },
      cap: { men: 10, dog: 4, wraith: 3 },
    },
    floor: '#2b2821', floorAlt: '#302c24', wall: '#3b3731', wallTop: '#5f584b',
    fog: '#040405', doorChance: 0.15, ironDoors: 0.6, clockDoors: 0.5, stack: 0.3,
    hint: 'THE GRASS HIDES YOU. IT HIDES THEM TOO.', hintKey: null,
  },
];

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
