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
    headbutt: { windup: 0.12, active: 0.15, recovery: 0.35, lunge: 26 * TILE, impulse: 30 * TILE, reach: 1.7 * TILE },
    // A throw is a commitment now: you let him go, and your mouth is empty for a beat.
    grab: { reach: 1.6 * TILE, speedMul: 0.7, holdTime: 3.0, throwImpulse: 34 * TILE, holdDist: 22, cooldown: 1.35 },
    // BAAH no longer calls them in. It takes the sense out of everyone who hears it, briefly.
    scream: { duration: 0.3, cooldown: 4.0, radius: 12, stun: 0.9 },
    // A clumsy sideways tumble: fast, brief mercy frames, then a stagger you have to eat.
    roll: { speed: 16.5 * TILE, duration: 0.32, invuln: 0.24, recover: 0.26, cooldown: 1.35, threatRange: 7 },
    breath: { range: 5.2 * TILE, halfAngle: 0.52, fireTime: 2.2, cooldown: 5.0 },
    devour: { time: 1.15, healChance: 0.45 },
    bomb: { fuse: 0.34, radius: 2.6 * TILE, impulse: 24 * TILE },
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
    keepMin: 5, keepMax: 8, backoffDist: 4, aimTime: 0.8, reload: 1.35,
    bulletSpeed: 25 * TILE, damage: 1,
  },
  // The hound. As quick as the goat, impossible to get hold of, and it will not stand still to be
  // hit: a share of every headbutt it is simply not there for any more. One thing it cannot do is
  // think its way through a BAAH — a screamed pack is a dead pack, and that is the point of it.
  dog: {
    radius: 9, speed: 0.98 * 8.2 * TILE, sight: 12, cone: Math.PI * 0.9,
    reach: 0.95 * TILE, windup: 0.3, swing: 0.12, recover: 0.3, damage: 1, knock: 0.8 * TILE,
    flooredTime: 0.7,
    dodge: 0.38, dodgeCd: 1.2, dodgeSpeed: 15 * TILE, dodgeTime: 0.2,
    circle: 2.6, circleFlip: 0.9, lungeCd: 1.5, dartTime: 0.9, retreat: 0.45,
    dazeMul: 2.6,       // the scream is the answer to a pack, and it has to read as the answer
    flingMul: 1.3,      // light enough that a headbutt really throws it
    trapSense: 0.95,    // a hound reads the room better than the men do
  },
  // The Seer never closes. He paints a rune where you are standing and blinks away when you get near.
  // Two hits, like the Butcher — but unlike him he can still be grabbed, carried and thrown.
  seer: {
    radius: 11, speed: 0.55 * 8.2 * TILE, sight: 11, cone: Math.PI * 0.62,
    keepMin: 5, keepMax: 9, damage: 1, hp: 2,
    castWind: 1.15, castCooldown: 2.5, runeRadius: 1.4, runeFire: 2.0,
    blinkRange: 3.2, blinkDist: 5.5, blinkCooldown: 3.0,
  },
  butcher: {
    radius: 20, speed: 0.6 * 8.2 * TILE, sight: 9, cone: Math.PI * 0.7,
    hp: 3, reach: 1.9 * TILE, windup: 0.88, swing: 0.2, recover: 0.62, arc: Math.PI * 2 / 3, damage: 1,
    chargeMin: 4, chargeWind: 0.6, chargeSpeed: 14 * TILE, chargeTime: 1.1, chargeCooldown: 2.5, stun: 1.5, stagger: 0.4,
    burnTick: 1.0, burnHearts: 1,   // he comes out of a fire scorched and one heart down, not dead
  },
  // What a man makes of the room he is running through. Trap sense is rolled per man, so one of them
  // in a crowd reads the Mill wrong and rides it into a wall while the rest step round.
  ai: { senseMin: 0.5, senseMax: 0.95, blindFor: 0.9, rollGap: 0.7, millLead: 0.6 },
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
    door: { r: 29, openPressure: 0.9, smashSpeed: 6 * TILE },
    table: { r: 21, drag: 4.5, killSpeed: 5 * TILE, pushSpeed: 2.2 * TILE },
    lamp: { r: 9, poolRadius: 1.2 },
    heal: { r: 12, pickupR: 22 },
    // The pen. Bars sit close enough together that a goat cannot slip between two of them.
    cage: { r: 10, halfW: 2.1, halfH: 1.6, spacing: 26, height: 30, hits: 3 },
  },
  // The Mill: a ritual grinding wheel with two sweeping arms. It does not care whose side you are on.
  // The Mill: a ritual grinding wheel with two sweeping arms. It does not care whose side you are on.
  // Slow enough to read and to time, and its room leaves a lane past it at the top and the bottom.
  mill: {
    hubR: 26, armLen: 4.1 * TILE, armHalfWidth: 0.2, innerR: 20,
    speed: 0.82, impulse: 30 * TILE, damage: 1, hitCooldown: 1.15, goatKnock: 0.3,
  },
  elite: { hp: 3 },
  noise: {
    footstep: 2, headbutt: 5, splat: 8, pot: 8, gunshot: 14, scream: 12, bell: 30, swing: 4, door: 10, table: 9, breath: 10, boom: 16, cast: 7, rune: 11, cage: 13,
  },
  juice: {
    hitstop: 0.07, shakeKill: 9, shakeHit: 6, shakeDecay: 12, deathSlow: 1.6, killSlow: 0.22,
    kick: 7, kickDecay: 11, kickMax: 15, // directional camera punch, thrown away from the impact
    zoomKick: 0.05, zoomDecay: 7,       // the lens shoves in on a kill and settles back
    flashDecay: 6,                      // additive screen flash
    comboWindow: 2.4, comboSlow: 0.26,  // kills inside the window stack, and stretch time
  },
  // How long the goat stands in the pen before the floor tells it which button opens it.
  cagePrompt: { delay: 5, fade: 1.1 },
  // Barks: one man at a time, and never the same man twice in a hurry.
  bark: { life: 1.9, gap: 0.42, perEnemy: 4.5, nearDist: 7.5, nearChance: 0.22 },
  audio: { master: 0.92, drums: 1.0, sfx: 1.05, music: 0.85 },
  camera: { lead: 2.4 * TILE, lerp: 7, zoomRest: 1.0, zoomFast: 0.88, zoomLerp: 2.2 },
  held: { bulletsAbsorbed: 2 },
  tome: { r: 13, pickupR: 22 },
};

// Boons bend numbers and verbs the goat already has. Actives change what a button does;
// passives change how well everything works. The Butcher drops a tome: three of one kind.
// `skill` is the button a boon hangs off in the HUD rail; the three without one are body work.
const BOON_BASE = {
  maxHp: 4, speed: 1, butcherDamage: 1, fireImmune: false,
  headbuttReach: 1, headbuttImpulse: 1, headbuttRecovery: 1,
  shieldBullets: 2, holdTime: 3.0, livingShield: false, grabCooldown: 1,
  screamCooldown: 4.0, screamRadius: 12,
  rollDistance: 1, rollCooldown: 1,
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
  { id: 'jaw', skill: 'grab', name: 'STRONG JAW', desc: 'A held man stops four bullets, struggles longer, and you reach for the next one sooner.', apply: (m) => { m.shieldBullets = 4; m.holdTime = 5.5; m.grabCooldown *= 0.6; } },
  { id: 'shield', skill: 'grab', name: 'LIVING SHIELD', desc: 'A held man keeps swinging and firing. At his own.', apply: (m) => { m.livingShield = true; } },
  { id: 'throat', skill: 'scream', name: 'RAW THROAT', desc: 'Scream twice as often, and twice as far.', apply: (m) => { m.screamCooldown *= 0.5; m.screamRadius = 20; } },
  { id: 'hooves', name: 'SURE HOOVES', desc: 'Run faster than anything in the building.', apply: (m) => { m.speed *= 1.18; } },
  { id: 'joints', skill: 'roll', name: 'LOOSE JOINTS', desc: 'Roll further, and far more often.', apply: (m) => { m.rollDistance *= 1.35; m.rollCooldown *= 0.45; } },
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
  // the Mill, a lit brazier, a rune about to go off: everything else in the room that kills
  trap: ['THE WHEEL!', 'MIND THE ARMS', 'NOT THAT WAY', 'GO ROUND IT', 'STEP BACK'],
  // a hound has the goat and the men know what that is worth
  hound: ['THE HOUNDS HAVE IT', 'LET THEM WORK', 'GOOD DOG', 'HOLD IT, DOG'],
};

const LEVELS = [
  {
    name: 'THE ALTAR', sub: 'Level 1', rooms: 9, showControls: true, startCage: true,
    arenas: [{ at: 3, boss: 'bearer' }, { at: 7, boss: 'seer' }],
    millAt: 5, heals: 2, ranged: 'none', seerShare: 0, dogs: 1, dogFrom: 6,
    floor: '#2b1a26', floorAlt: '#31202c', wall: '#7c5a36', wallTop: '#9c7446',
    fog: '#0d0a0c', doorChance: 0.5,
    hint: null,
    budget: (i) => (i === 0 ? 0 : Math.min(4, 1 + Math.floor(i * 0.32))),
  },
  {
    name: 'THE YARD', sub: 'Level 2', rooms: 12,
    arenas: [{ at: 4, boss: 'butcher' }, { at: 9, boss: 'seer' }],
    millAt: 7, heals: 2, ranged: 'seer', seerShare: 0.55, seerFrom: 5, seerPerRoom: 1, dogs: 3, dogFrom: 3,
    floor: '#8a7554', floorAlt: '#907b5a', wall: '#3b2233', wallTop: '#55344a',
    fog: '#120d12', doorChance: 0.42,
    hint: 'THE SEER BURNS THE GROUND YOU STAND ON',
    budget: (i) => (i === 0 ? 0 : Math.min(5, 1 + Math.floor(i * 0.38))),
  },
  {
    name: 'THE ROAD', sub: 'Level 3', rooms: 14,
    arenas: [{ at: 5, boss: 'butcher' }, { at: 11, boss: 'butcher' }],
    millAt: 8, heals: 2, ranged: 'both', seerShare: 0.3, seerFrom: 3, seerPerRoom: 1, dogs: 5, dogFrom: 2,
    hallAt: 9, hallBudget: 15, galleryAt: 6, lonePosts: 3,
    floor: '#4a3a2e', floorAlt: '#524032', wall: '#2a2430', wallTop: '#3e3346',
    fog: '#0b0a0d', doorChance: 0.35,
    hint: 'HOLD A MAN. HE STOPS BULLETS.',
    budget: (i) => (i === 0 ? 0 : Math.min(6, 2 + Math.floor(i * 0.36))),
  },
  {
    // Everything the compound has left, all at once, on the bridge they were driving you over.
    name: 'THE BRIDGE', sub: 'Level 4', rooms: 16,
    arenas: [{ at: 4, boss: 'butcher' }, { at: 9, boss: 'seer' }, { at: 14, boss: 'butcher' }],
    millAt: 7, heals: 3, ranged: 'both', seerShare: 0.5, seerFrom: 2, seerPerRoom: 1, dogs: 7, dogFrom: 2,
    hallAt: 12, hallBudget: 18, galleryAt: 2, lonePosts: 4,
    floor: '#2f3640', floorAlt: '#353d48', wall: '#1d2028', wallTop: '#2f3440',
    fog: '#06070a', doorChance: 0.3,
    hint: 'EVERYTHING THEY HAVE LEFT IS HERE',
    budget: (i) => (i === 0 ? 0 : Math.min(7, 2 + Math.floor(i * 0.4))),
  },
];
