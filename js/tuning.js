// GOAT OUT — all tuning values in one place. Units: px, seconds. 1 tile = TILE px.
const TILE = 32;

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
  brazier: '#4a3b2f',
  wood: '#6b4a2c',
  woodHi: '#8a6238',
};

const TUNING = {
  goat: {
    radius: 12,
    speed: 8.2 * TILE,      // top speed px/s (~1.3x cultist)
    accel: 0.15,            // s to top speed
    decel: 0.25,            // s to stop
    hp: 4,
    // The lunge carries him a short way and no further: a headbutt is a step into a man, not a
    // charge across the room, and closing the distance yourself is the part you are paid for.
    headbutt: { windup: 0.12, active: 0.15, recovery: 0.35, lunge: 18.2 * TILE, impulse: 30 * TILE, reach: 1.7 * TILE },
    // A throw is a commitment now: you let him go, and your mouth is empty for a beat.
    // He is in your mouth a long time, and he works himself loose somewhere in `holdVary` either
    // side of it, so you never learn the exact beat he goes: carrying one is a gamble, not a timer.
    grab: { reach: 1.6 * TILE, speedMul: 0.7, holdTime: 8.0, holdVary: 0.125, throwImpulse: 34 * TILE, holdDist: 22, cooldown: 1.35 },
    // BAAH no longer calls them in. It takes the sense out of everyone who hears it, briefly.
    // The radius is deliberately short of what the screen shows: BAAH is for the men on top of you,
    // not for the room. Anything you want stunned you have to be standing in the middle of.
    scream: { duration: 0.3, cooldown: 4.0, radius: 8.5, stun: 0.9 },
    // A clumsy sideways tumble: fast, brief mercy frames, then a stagger you have to eat.
    // `stun` and `stunR` are DEAD WEIGHT's, and nothing else reads them: the roll on its own
    // goes through a man without touching him.
    roll: { speed: 9.9 * TILE, duration: 0.32, invuln: 0.24, recover: 0.26, cooldown: 1.35, threatRange: 7,
      stun: 0.7, stunR: 1.6 * TILE },
    // The smear behind him is the only thing on screen that says he is faster than he was, so the
    // tome that makes him faster lengthens it: at `fastAt` times his own speed it is `fast*` all
    // through, and anywhere between the two it is mixed.
    trail: { at: 0.55, gap: 0.028, keep: 7, life: 0.18, fastGap: 0.014, fastKeep: 16, fastLife: 0.34, fastAt: 1.18 },
    breath: { range: 5.2 * TILE, halfAngle: 0.52, fireTime: 2.2, cooldown: 5.0 },
    devour: { time: 1.15, healChance: 0.45 },
    bomb: { fuse: 0.34, radius: 2.6 * TILE, impulse: 24 * TILE },
    turn: 9,                // rad/s he swings his head round to where you are pointing, standing still
    fireDamageInterval: 0.7,
    invuln: 0.5,            // s of invulnerability after a hit
  },
  bearer: {
    radius: 11, speed: 0.85 * 8.2 * TILE, sight: 8, cone: Math.PI / 2,
    reach: 1.2 * TILE, windup: 0.58, swing: 0.15, recover: 0.55, damage: 1, knock: 1 * TILE,
    flooredTime: 0.8,
  },
  hunter: {
    radius: 11, speed: 0.8 * 8.2 * TILE, sight: 10, cone: Math.PI / 2,
    keepMin: 5, keepMax: 8, backoffDist: 4, aimTime: 0.88, reload: 1.35,
    // What he has left once you have him by the collar. He empties it into the room and then he is
    // only a man being carried: a rifle is worth holding, but not for the whole level.
    heldShots: [2, 3],
    // A rifle posted to watch a door sees this much further than one wandering a room, and he does
    // not leave the post: he tracks you across the floor and fires the moment he has the shot.
    watchSight: 8,
    bulletSpeed: 25 * TILE, damage: 1,
  },
  // The hound. As quick as the goat, impossible to get hold of, and it will not stand still to be
  // hit: a share of every headbutt it is simply not there for any more. One thing it cannot do is
  // think its way through a BAAH — a screamed pack is a dead pack, and that is the point of it.
  dog: {
    radius: 10, speed: 0.98 * 8.2 * TILE, sight: 12, cone: Math.PI * 0.9,
    // The windup is the beat after the dart, not part of it: at 0.3 s the bite landed before the eye
    // had the tell, and the dart was doing work it could not be read doing.
    reach: 0.95 * TILE, windup: 0.44, swing: 0.12, recover: 0.3, damage: 1, knock: 0.8 * TILE,
    flooredTime: 0.7,
    dodge: 0.38, dodgeCd: 1.2, dodgeSpeed: 15 * TILE, dodgeTime: 0.2,
    circle: 2.6, circleFlip: 0.9, lungeCd: 1.5, dartTime: 0.9, retreat: 0.45,
    packGap: 7, packWait: 0.55,   // one hound runs in at a time; the rest hold the ring
    dazeMul: 2.6,       // the scream is the answer to a pack, and it has to read as the answer
    flingMul: 1.3,      // light enough that a headbutt really throws it
    trapSense: 0.95,    // a hound reads the room better than the men do
  },
  // The Seer never closes. He paints a rune where you are standing and blinks away when you get near.
  // Two hits, like the Butcher — but unlike him he can still be grabbed, carried and thrown.
  seer: {
    radius: 11, speed: 0.55 * 8.2 * TILE, sight: 11, cone: Math.PI * 0.62,
    keepMin: 5, keepMax: 9, damage: 1, hp: 2,
    castWind: 0.8, castCooldown: 2.5, runeRadius: 1.4, runeFire: 2.0,
    blinkRange: 3.2, blinkDist: 5.5, blinkCooldown: 3.0,
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
    radius: 12, speed: 0.62 * 8.2 * TILE, sight: 17, cone: Math.PI * 2,
    reach: 1.35 * TILE, windup: 0.52, swing: 0.14, damage: 1, knock: 1.2 * TILE,
    hp: 1, flooredTime: 0.6,
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
  },
  // The cleaver used to cover half a room: two and a half tiles out from a body already twice the
  // size of a man's, through a hundred and twenty degrees, which is a swing that hits you where it
  // plainly is not. Two tiles and ninety-nine degrees now — half the ground, to the square foot —
  // and he still out-reaches a clubman, which was the only thing that number was ever for.
  butcher: {
    radius: 20, speed: 0.6 * 8.2 * TILE, sight: 9, cone: Math.PI * 0.7,
    hp: 3, reach: 1.35 * TILE, windup: 0.88, swing: 0.2, recover: 0.62, arc: Math.PI * 0.55, damage: 1,
    chargeMin: 4, chargeWind: 0.6, chargeSpeed: 14 * TILE, chargeTime: 1.1, chargeCooldown: 2.5, stun: 1.5, stagger: 0.4,
    burnTick: 1.0, burnHearts: 1,   // he comes out of a fire scorched and one heart down, not dead
  },
  // What a man makes of the room he is running through. Trap sense is rolled per man, so one of them
  // in a crowd reads the Mill wrong and rides it into a wall while the rest step round.
  ai: { senseMin: 0.5, senseMax: 0.95, blindFor: 0.9, rollGap: 0.7,
    millLead: 0.6,     // s of arm sweep he looks ahead before deciding a spot is taken
    millClear: 15,     // px of berth he wants round the arms: stepping to the very edge is not enough
    trapLook: 30,      // px past his own radius he checks for a wheel or a brazier (flame he reads later)
    feel: 5 },         // px past the two bodies where being walked into counts as being seen
  physics: {
    splatSpeed: 11 * TILE,
    flungDrag: 3.5,
    flungFloorSpeed: 3.5 * TILE,
    knockHitSpeed: 7 * TILE,
  },
  fire: {
    spread: 0.4, burn: 3.0, pool: 4.5, burnRunTime: 2.0, burnRunSpeed: 6 * TILE,
    witch: 3.6,        // the Seer's fire: colder to look at, and no coat turns it away
    avoidLook: 18,     // px past his own radius a man checks before walking into flame
  },
  prop: {
    // A door is the one thing in a corridor that can hold you still, and holding you still in a
    // corridor is worth more than the shortcut was: three blows, and the first two only splinter it.
    door: { r: 29, openPressure: 0.9, smashSpeed: 6 * TILE, hits: 3 },
    table: { r: 21, drag: 4.5, killSpeed: 5 * TILE, pushSpeed: 2.2 * TILE },
    // A lamp post is not a pillar: a body arriving at `knock` goes through it and it goes over,
    // and it pours its oil where the body is about to land.
    lamp: { r: 9, poolRadius: 1.2, knock: 4 * TILE },
    // The brazier is a thing you can use without a man in it. A headbutt knocks a spill of coals
    // out of the far side of it — `spillAt` tiles beyond the bowl, `spill` tiles across, alight for
    // `spillTime` — and the bowl needs `spillCd` to build the heat back. Short, so it is a line you
    // draw across a doorway for a beat, not a fire you keep pressing for.
    brazier: { r: 13, spillAt: 1.1, spill: 1.05, spillTime: 1.7, spillCd: 3.0 },
    // A bowl of milk is not a lucky find. `every` is how many rooms a level may go without offering
    // one; the level's own `heals` is a floor under that, and the generator spaces them rather than
    // scattering them, so a run never opens six doors in a row on nothing.
    heal: { r: 12, pickupR: 22, every: 4.5 },
    // The gong. It was noise and nothing else, which made it the one thing in a room you could not
    // read. Now it pays: a stretch of speed and quick hands, bought by telling the whole floor where
    // you are. In an empty room that is a terrible trade. In a full one it is the best one you get.
    bell: { r: 14, buff: 8, speedMul: 1.5, cooldownMul: 1.5 },
    // A thrown pot no longer just trips a man over. It takes his legs and his head with them,
    // and he lies there seeing stars long enough that you can do something about him.
    pot: { r: 9, stun: 2.4 },
    // A stand of arms. Grab what is in it, carry it, let go to throw it. The sword goes through
    // the first man it finds; the shield knocks a row of them flat and turns bullets while carried.
    weapon: {
      r: 11, standR: 13, throwMul: 1.35, drag: 1.4, restSpeed: 3 * TILE,
      stickImpact: 6 * TILE,  // a scrape along a wall does not end a throw; a proper hit does
      swordStun: 1.6,        // what a sword does to a Butcher, who does not go down to one
      shieldStun: 2.8,       // how long a man the shield bowls over stays down
      // What one is worth before it is scrap, so neither can be dragged through a level. A blade is
      // one throw: it goes into whatever it finds and snaps there. A shield is three, and every man
      // it flattens and every bullet it turns spends one of them.
      uses: { sword: 1, shield: 3 },
      // What a carried shield covers. It was a circle the size of the shield itself, which meant
      // almost everything aimed at the goat went past the edge of it and hit him anyway — a shield
      // that does not stop the shot is a shield that reads as broken. It is an arc across his front
      // now: anything arriving inside `coverArc` of where he is pointing is turned, and every turn
      // spends a charge. `parry` is what the man who swung into it has to stand there and eat.
      coverR: 30, coverArc: 2.5, parry: 0.45,
    },
    // The pen. Bars sit close enough together that a goat cannot slip between two of them.
    // Seven blows, and the third and the sixth take his feet out from under him. It is meant to
    // read as work: the first thing the goat does in the run is the hardest thing a goat can do.
    cage: { r: 10, halfW: 2.1, halfH: 1.6, spacing: 26, height: 30,
      hits: 7, stunAt: [3, 6], stun: 1.0,
      strain: ['NNGH', 'IT HOLDS', 'MMMAAAH', 'IT BENDS', 'NNNGH', 'BAAAAH', 'OUT'] },
    // The other cage in the first room. It gives in quicker than the pen and takes nothing out of
    // him: the pen teaches the verb the hard way, and this is what having learned it is worth. What
    // is inside stopped waiting a long time ago, which is what the last line is for.
    deadCage: { halfW: 1.15, halfH: 0.9, dx: 3.7, dy: -2.5, hits: 3,
      strain: ['NNGH', 'IT GIVES', 'OPEN'], done: 'TOO LATE' },
    // Spike floor, from the third level on. The teeth come up where you have already been: crossing
    // a plate arms it and they follow a moment later, so the trap is the ground you just left. Men
    // read it the way they read the wheel — `lead` is how far ahead of the teeth `hazardAt` calls the
    // tile taken — and the man who fails his trap check is the one you can walk onto it.
    spike: { r: 18, trigger: 1.3, arm: 0.5, up: 0.95, down: 0.4, rest: 1.7, lead: 0.3, damage: 1 },
  },
  // Going over an edge. A man who goes down a hole is gone; the goat is only rented — he comes back
  // up on the last boards he stood on, one heart lighter, which is the same price the wheel charges.
  // Make it free and the level is a shortcut; make it fatal and nobody goes near the interesting half
  // of the room.
  fall: { time: 0.5, back: 0.3, damage: 1 },
  // The Mill: a ritual grinding wheel with two sweeping arms. It does not care whose side you are on.
  // Slow enough to read and to time, and its room leaves a lane past it at the top and the bottom.
  mill: {
    hubR: 26, armLen: 4.1 * TILE, armHalfWidth: 0.2, innerR: 20,
    speed: 0.82, impulse: 30 * TILE, damage: 1, hitCooldown: 1.15, goatKnock: 0.3,
  },
  elite: { hp: 3 },
  // The brute: a clubman built twice over. Three separate killing blows before he stops getting up,
  // four when he is the one in the arena. He is how the game says "some of them take more than one"
  // without spending a boss on it, so he has to be unmistakable at a glance — bigger frame, spiked
  // shoulders, a spiked mask, a studded club — and the notches over his head count it down.
  champion: { hp: 3, bossHp: 4, scale: 1.34, spikes: 5 },
  noise: {
    footstep: 2, headbutt: 5, splat: 8, pot: 8, gunshot: 14, scream: 12, bell: 30, swing: 4, door: 10, table: 9, breath: 10, boom: 16, cast: 7, rune: 11, cage: 13, steel: 9, embers: 6,
  },
  juice: {
    hitstop: 0.07, shakeKill: 9, shakeHit: 6, shakeDecay: 12, deathSlow: 1.6, killSlow: 0.22,
    kick: 7, kickDecay: 11, kickMax: 15, // directional camera punch, thrown away from the impact
    zoomKick: 0.05, zoomDecay: 7,       // the lens shoves in on a kill and settles back
    flashDecay: 6,                      // additive screen flash
    comboWindow: 2.4, comboSlow: 0.26,  // kills inside the window stack, and stretch time
  },
  // The corner of the screen that says what you have and what your buttons are doing. It was sized
  // to stay out of the way and succeeded too well: a first-time player found the hearts and the rail
  // after the level rather than during it. `scale` multiplies the whole top band — hearts, rail,
  // count, clock — and nothing else: the cards, the menu and the floor text keep their own size.
  hud: { scale: 1.3 },
  // How long the goat stands in the pen before the floor tells it which button opens it.
  cagePrompt: { delay: 5, fade: 1.1 },
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
  },
  // The way out is a flight of stairs. The goat climbs them for a moment before the cards, and on
  // the next level it comes up another flight into the first room.
  stairs: { climb: 0.85, climbSpeed: 2.2 * TILE, rise: 16, arrive: 1.1 },
  // Barks: one man at a time, and never the same man twice in a hurry.
  bark: { life: 1.9, gap: 0.42, perEnemy: 4.5, nearDist: 7.5, nearChance: 0.22 },
  audio: { master: 0.92, drums: 1.0, sfx: 1.05, music: 0.85 },
  // The lead point is carried rather than read: on a mouse the aim flips the instant the pointer
  // crosses the goat, and a lead that flips with it throws the whole picture across the screen.
  // `leadLerp` is how fast the camera agrees to the new side, `leadStill` how much of the lead a
  // goat who is not running gets at all.
  camera: { lead: 2.4 * TILE, lerp: 7, leadLerp: 3.4, leadStill: 0.3, zoomRest: 1.0, zoomFast: 0.88, zoomLerp: 2.2 },
  // A score is time first and bodies second, so that running is never the wrong answer: pace against
  // par is the whole of it and kills only multiply. Par for a level is its rooms times `perRoom`.
  score: { perRoom: 9, timePoints: 1000, fastCap: 2, killMul: 0.06, killCap: 2.5 },
  held: { bulletsAbsorbed: 2 },
  tome: { r: 13, pickupR: 22 },
  // How long a tome's three cards refuse every input after they appear, so the click that killed the
  // boss cannot also spend what he dropped.
  boonArm: 0.4,
};

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
};

// Boons bend numbers and verbs the goat already has. Actives change what a button does;
// passives change how well everything works. The Butcher drops a tome: three of one kind.
// `skill` is the button a boon hangs off in the HUD rail; the three without one are body work.
const BOON_BASE = {
  maxHp: 4, speed: 1, butcherDamage: 1, fireImmune: false,
  headbuttReach: 1, headbuttImpulse: 1, headbuttRecovery: 1,
  shieldBullets: 2, holdTime: 8.0, livingShield: false, grabCooldown: 1,
  screamCooldown: 4.0, screamRadius: 8.5,
  rollDistance: 1, rollCooldown: 1, rollStun: 0,
  breath: false, bomb: false, devour: false,
};

const BOONS = [
  // ---- actives: they change what a button does ----
  { id: 'breath', skill: 'scream', active: true, name: 'DRAGON BREATH', desc: 'The scream becomes a cone of fire. Slower to recharge.',
    apply: (m) => { m.breath = true; m.screamCooldown = TUNING.goat.breath.cooldown; } },
  { id: 'bomb', skill: 'butt', active: true, name: 'BOMB CHARGE', desc: 'Anyone you headbutt detonates a moment later.',
    apply: (m) => { m.bomb = true; } },
  { id: 'devour', skill: 'grab', active: true, name: 'DEVOUR', desc: 'Keep holding a man and you tear him open. It may feed you.',
    apply: (m) => { m.devour = true; } },

  // ---- passives ----
  { id: 'hide', name: 'THICK HIDE', desc: 'One more heart, and it fills now.', apply: (m) => { m.maxHp += 1; }, heal: 1 },
  { id: 'horns', skill: 'butt', name: 'LONG HORNS', desc: 'Headbutt reaches further and throws harder.', apply: (m) => { m.headbuttReach *= 1.45; m.headbuttImpulse *= 1.25; } },
  { id: 'skull', skill: 'butt', name: 'IRON SKULL', desc: 'Recover from a headbutt far quicker.', apply: (m) => { m.headbuttRecovery *= 0.55; } },
  { id: 'jaw', skill: 'grab', name: 'STRONG JAW', desc: 'A held man stops four bullets, struggles longer, and you reach for the next one sooner.', apply: (m) => { m.shieldBullets = 4; m.holdTime = 13; m.grabCooldown *= 0.6; } },
  { id: 'shield', skill: 'grab', name: 'LIVING SHIELD', desc: 'A held man keeps swinging and firing. At his own.', apply: (m) => { m.livingShield = true; } },
  { id: 'throat', skill: 'scream', name: 'RAW THROAT', desc: 'Scream twice as often, and half again as far.', apply: (m) => { m.screamCooldown *= 0.5; m.screamRadius = 13; } },
  { id: 'hooves', name: 'SURE HOOVES', desc: 'Run faster than anything in the building.', apply: (m) => { m.speed *= 1.18; } },
  { id: 'joints', skill: 'roll', name: 'LOOSE JOINTS', desc: 'Roll further, and far more often.', apply: (m) => { m.rollDistance *= 1.35; m.rollCooldown *= 0.45; } },
  { id: 'weight', skill: 'roll', name: 'DEAD WEIGHT', desc: 'Everything your roll goes through loses its head for a moment.',
    apply: (m) => { m.rollStun = TUNING.goat.roll.stun; } },
  { id: 'ember', name: 'EMBER COAT', desc: 'Ordinary fire stops burning you. Witchfire does not care.', apply: (m) => { m.fireImmune = true; } },
];

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
  panic: ['IT KILLED HIM', 'NOT ME', 'THE PRIEST LIED', 'RUN', 'MERCY'],
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

const LEVELS = [
  {
    // Level one teaches, in this order: one clubman standing still in a doorway, a room of ordinary
    // clubmen, the Mill, a hound, a room of both, and only then the man who takes more than one hit.
    // Nothing here appears in a crowd before it has appeared alone.
    // `ritual` paints the altar, the remains and the tools into the first room, and is what makes the
    // opening scene possible; every later level arrives up a flight of stairs into a bare room instead.
    // Twelve rooms rather than ten. The brute used to be the second man you ever met, three rooms
    // after your first clubman and one room before his own arena, which is no time at all to have
    // learned what a headbutt is for: now four rooms of ordinary work stand between them.
    name: 'THE ALTAR', sub: 'Level 1', rooms: 12, showControls: true, startCage: true, ritual: true,
    // The first man of the run holds his post instead of walking at you: he stands in the mouth of
    // the room with his back to the door, and the floor under him says what the button does. He is
    // there to be tried, and a man who charges you cannot be tried.
    sentryIntro: true,
    arenas: [{ at: 9, boss: 'champion' }, { at: 11, boss: 'butcher' }],
    // The wheel is met with nobody standing in the room, and arms are not a thing you find until
    // halfway in: the first half of the run is the goat and his head and nothing else.
    millAt: 5, millSolo: true, heals: 3, racks: 0.2, racksFrom: 0.5, traps: 1,
    encounters: {
      kinds: ['bearer', 'champion', 'dog'],
      introduce: [['bearer', 0], ['dog', 0.4], ['champion', 0.8]],
      from: 1, to: 4.5, ease: 1.5,
    },
    floor: '#2b1a26', floorAlt: '#31202c', wall: '#7c5a36', wallTop: '#9c7446',
    fog: '#0d0a0c', doorChance: 0.5,
    hint: null,
  },
  {
    // The mage arrives, on his own, a third of the way in.
    name: 'THE YARD', sub: 'Level 2', rooms: 12,
    arenas: [{ at: 4, boss: 'butcher' }, { at: 9, boss: 'seer' }],
    millAt: 7, heals: 2, racks: 0.16, traps: 1,
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer'],
      introduce: [['seer', 0.35]],
      from: 2, to: 7.5, ease: 1.3,
    },
    floor: '#8a7554', floorAlt: '#907b5a', wall: '#3b2233', wallTop: '#55344a',
    fog: '#120d12', doorChance: 0.42,
    hint: 'THE SEER BURNS THE GROUND YOU STAND ON', hintKey: 'roll',
  },
  {
    // The rifle arrives early, alone, and then never stops being the reason you keep moving.
    name: 'THE ROAD', sub: 'Level 3', rooms: 14,
    arenas: [{ at: 5, boss: 'butcher' }, { at: 11, boss: 'butcher' }],
    millAt: 8, heals: 2, hallAt: 9, hallThreat: 26, galleryAt: 6, killboxAt: 10, lonePosts: 3, racks: 0.14, traps: 2,
    // The floor starts answering back here: a plate you cross arms behind you.
    spikes: 0.25,
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter'],
      introduce: [['hunter', 0.2]],
      from: 3, to: 10, ease: 1.25,
    },
    floor: '#4a3a2e', floorAlt: '#524032', wall: '#2a2430', wallTop: '#3e3346',
    fog: '#0b0a0d', doorChance: 0.35,
    hint: 'HOLD A MAN. HE STOPS BULLETS.', hintKey: 'grab',
  },
  {
    // The threshing floor: the widest ground in the compound and the least wall in it. A headbutt on
    // bare floor still only knocks a man down, so out here you have to herd him into the furniture —
    // posts, tables, braziers, a ring of hay you light yourself — and decide which half of a room is
    // yours before the rifles decide it for you. Corridors are wide enough that it reads as one yard.
    // Nothing new walks in: the room itself is the new thing.
    name: 'THE THRESHING FLOOR', sub: 'Level 4', rooms: 14, pool: 'open', corridorW: 5,
    arenas: [{ at: 3, boss: 'seer' }, { at: 8, boss: 'butcher' }, { at: 12, boss: 'champion' }],
    millAt: 6, heals: 3, killboxAt: 10, lonePosts: 4, racks: 0.18, spikes: 0.3,
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter'],
      introduce: [],
      from: 5, to: 14, ease: 1.2,
    },
    floor: '#5f5a4a', floorAlt: '#67624f', wall: '#7b6c50', wallTop: '#9d8c69',
    fog: '#0b0b0a', doorChance: 0.12,
    hint: 'NOTHING OUT HERE KILLS FOR YOU. USE WHAT IS STANDING.', hintKey: 'butt',
  },
  {
    // Everything the compound has left, all at once, on the bridge they were driving you over.
    name: 'THE BRIDGE', sub: 'Level 5', rooms: 16,
    arenas: [{ at: 4, boss: 'butcher' }, { at: 9, boss: 'seer' }, { at: 14, boss: 'butcher' }],
    millAt: 7, heals: 3, hallAt: 12, hallThreat: 32, galleryAt: 2, killboxAt: 6, lonePosts: 4, racks: 0.16, spikes: 0.3, traps: 2,
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter'],
      introduce: [],
      from: 5, to: 17, ease: 1.15,
      // The bridge is the only ground allowed a room this crowded, and a third rifle on it.
      cap: { men: 9, hunter: 3, dog: 3 },
    },
    floor: '#2f3640', floorAlt: '#353d48', wall: '#1d2028', wallTop: '#2f3440',
    fog: '#06070a', doorChance: 0.3,
    hint: 'EVERYTHING THEY HAVE LEFT IS HERE', hintKey: 'scream',
  },
  {
    // Up in the roof of the hall, and the first ground in the compound that is not all there. Holes
    // in the boards, windows out into the night, and the same drop under both. A man who goes over an
    // edge does not come back; the goat comes back a heart lighter at the spot he went in, which is
    // what makes an edge something to work with rather than something to keep away from. Nothing new
    // walks in — the missing floor is the new thing, and it is the only thing here that kills for you
    // without being in the room.
    name: 'THE RAFTERS', sub: 'Level 6', rooms: 16, pool: 'high',
    arenas: [{ at: 4, boss: 'seer' }, { at: 10, boss: 'butcher' }, { at: 14, boss: 'champion' }],
    millAt: 7, heals: 4, killboxAt: 12, lonePosts: 3, racks: 0.16, spikes: 0.35,
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter'],
      introduce: [],
      from: 8, to: 26, ease: 1.15,
      cap: { men: 9, hunter: 3, dog: 3 },
    },
    floor: '#4b433a', floorAlt: '#544a40', wall: '#241d1a', wallTop: '#453629',
    fog: '#06060a', doorChance: 0.2,
    hint: 'THE FLOOR ENDS. THEY FALL FURTHER THAN YOU.', hintKey: 'butt',
  },
  {
    // Under the bridge is where everything the compound ever killed went, and none of it stayed put.
    // The living are a garrison here rather than the point: what the level is about is the thing that
    // is not in the room until it is behind you. Walls do not hold them, so there is nowhere to put
    // your back — the only cover on this ground is which way you are looking.
    name: 'THE OSSUARY', sub: 'Level 7', rooms: 16,
    arenas: [{ at: 4, boss: 'butcher' }, { at: 9, boss: 'wraith' }, { at: 13, boss: 'seer' }],
    millAt: 6, heals: 4, killboxAt: 11, lonePosts: 2, racks: 0.2, spikes: 0.3, traps: 2,
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
    fog: '#05060a', doorChance: 0.22,
    hint: 'IT CANNOT STOP ONCE IT STARTS. LET IT START.', hintKey: 'butt',
  },
];

// What the player has already been shown by the time each level starts: every kind an earlier level
// put in front of him, bosses included. A kind is introduced on its own once a run, not once a level,
// so the second Butcher of a run arrives with company like anybody else.
(() => {
  const met = new Set();
  for (const def of LEVELS) {
    def.met = new Set(met);
    for (const k of def.encounters.kinds) met.add(k);
    for (const [k] of (def.encounters.introduce || [])) met.add(k);
    for (const a of (def.arenas || [])) met.add(a.boss);
  }
})();

