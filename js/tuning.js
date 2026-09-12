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
    grab: { reach: 1.6 * TILE, speedMul: 0.7, holdTime: 3.0, throwImpulse: 34 * TILE, holdDist: 22 },
    scream: { duration: 0.3, cooldown: 4.0, radius: 12 },
    // A clumsy sideways tumble: fast, brief mercy frames, then a stagger you have to eat.
    roll: { speed: 16.5 * TILE, duration: 0.32, invuln: 0.24, recover: 0.26, cooldown: 1.0 },
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
  // The Seer never closes. He paints a rune where you are standing and blinks away when you get near.
  seer: {
    radius: 11, speed: 0.55 * 8.2 * TILE, sight: 11, cone: Math.PI * 0.62,
    keepMin: 5, keepMax: 9, damage: 1,
    castWind: 1.15, castCooldown: 2.5, runeRadius: 1.4, runeFire: 2.0,
    blinkRange: 3.2, blinkDist: 5.5, blinkCooldown: 3.0,
  },
  butcher: {
    radius: 20, speed: 0.6 * 8.2 * TILE, sight: 9, cone: Math.PI * 0.7,
    hp: 2, reach: 1.9 * TILE, windup: 0.88, swing: 0.2, recover: 0.62, arc: Math.PI * 2 / 3, damage: 1,
    chargeMin: 4, chargeWind: 0.6, chargeSpeed: 14 * TILE, chargeTime: 1.1, chargeCooldown: 2.5, stun: 1.5, stagger: 0.4,
    burnTick: 1.0,
  },
  physics: {
    splatSpeed: 11 * TILE,
    flungDrag: 3.5,
    flungFloorSpeed: 3.5 * TILE,
    knockHitSpeed: 7 * TILE,
  },
  fire: {
    spread: 0.4, burn: 3.0, pool: 4.5, burnRunTime: 2.0, burnRunSpeed: 6 * TILE,
  },
  prop: {
    door: { r: 29, openPressure: 0.9, smashSpeed: 6 * TILE },
    table: { r: 21, drag: 4.5, killSpeed: 5 * TILE, pushSpeed: 2.2 * TILE },
    lamp: { r: 9, poolRadius: 1.2 },
    heal: { r: 12, pickupR: 22 },
  },
  // The Mill: a ritual grinding wheel with two sweeping arms. It does not care whose side you are on.
  mill: {
    hubR: 26, armLen: 4.1 * TILE, armHalfWidth: 0.2, innerR: 20,
    speed: 1.05, impulse: 30 * TILE, damage: 1, hitCooldown: 0.6,
  },
  elite: { hp: 3 },
  noise: {
    footstep: 2, headbutt: 5, splat: 8, pot: 8, gunshot: 14, scream: 12, bell: 30, swing: 4, door: 10, table: 9, breath: 10, boom: 16, cast: 7, rune: 11,
  },
  juice: { hitstop: 0.07, shakeKill: 9, shakeHit: 6, shakeDecay: 12, deathSlow: 1.6, killSlow: 0.22 },
  camera: { lead: 2.4 * TILE, lerp: 7, zoomRest: 1.0, zoomFast: 0.88, zoomLerp: 2.2 },
  held: { bulletsAbsorbed: 2 },
  tome: { r: 13, pickupR: 22 },
};

// Boons bend numbers and verbs the goat already has. Actives change what a button does;
// passives change how well everything works. The Butcher drops a tome: three of one kind.
const BOON_BASE = {
  maxHp: 4, speed: 1, butcherDamage: 1, fireImmune: false,
  headbuttReach: 1, headbuttImpulse: 1, headbuttRecovery: 1,
  shieldBullets: 2, holdTime: 3.0, livingShield: false,
  screamCooldown: 4.0, screamRadius: 12,
  rollDistance: 1, rollCooldown: 1,
  breath: false, bomb: false, devour: false,
};

const BOONS = [
  // ---- actives: they change what a button does ----
  { id: 'breath', active: true, name: 'DRAGON BREATH', desc: 'The scream becomes a cone of fire. Slower to recharge.',
    apply: (m) => { m.breath = true; m.screamCooldown = TUNING.goat.breath.cooldown; } },
  { id: 'bomb', active: true, name: 'BOMB CHARGE', desc: 'Anyone you headbutt detonates a moment later.',
    apply: (m) => { m.bomb = true; } },
  { id: 'devour', active: true, name: 'DEVOUR', desc: 'Keep holding a man and you tear him open. It may feed you.',
    apply: (m) => { m.devour = true; } },

  // ---- passives ----
  { id: 'hide', name: 'THICK HIDE', desc: 'One more heart, and it fills now.', apply: (m) => { m.maxHp += 1; }, heal: 1 },
  { id: 'horns', name: 'LONG HORNS', desc: 'Headbutt reaches further and throws harder.', apply: (m) => { m.headbuttReach *= 1.45; m.headbuttImpulse *= 1.25; } },
  { id: 'skull', name: 'IRON SKULL', desc: 'Recover from a headbutt far quicker.', apply: (m) => { m.headbuttRecovery *= 0.55; } },
  { id: 'jaw', name: 'STRONG JAW', desc: 'A held man stops four bullets and struggles longer.', apply: (m) => { m.shieldBullets = 4; m.holdTime = 5.5; } },
  { id: 'shield', name: 'LIVING SHIELD', desc: 'A held man keeps swinging and firing. At his own.', apply: (m) => { m.livingShield = true; } },
  { id: 'throat', name: 'RAW THROAT', desc: 'Scream twice as often, and twice as far.', apply: (m) => { m.screamCooldown *= 0.5; m.screamRadius = 20; } },
  { id: 'hooves', name: 'SURE HOOVES', desc: 'Run faster than anything in the building.', apply: (m) => { m.speed *= 1.18; } },
  { id: 'joints', name: 'LOOSE JOINTS', desc: 'Roll further, and far more often.', apply: (m) => { m.rollDistance *= 1.35; m.rollCooldown *= 0.45; } },
  { id: 'ember', name: 'EMBER COAT', desc: 'Fire no longer burns you. It still burns them.', apply: (m) => { m.fireImmune = true; } },
];

const LEVELS = [
  {
    name: 'THE ALTAR', sub: 'Level 1', rooms: 9, showControls: true,
    arenas: [{ at: 3, boss: 'seer' }, { at: 7, boss: 'seer' }],
    millAt: 5, heals: 2, ranged: 'none', seerShare: 0,
    floor: '#2b1a26', floorAlt: '#31202c', wall: '#7c5a36', wallTop: '#9c7446',
    fog: '#0d0a0c', doorChance: 0.5,
    hint: null,
    budget: (i) => (i === 0 ? 0 : Math.min(4, 1 + Math.floor(i * 0.32))),
  },
  {
    name: 'THE YARD', sub: 'Level 2', rooms: 12,
    arenas: [{ at: 4, boss: 'butcher' }, { at: 9, boss: 'seer' }],
    millAt: 7, heals: 2, ranged: 'seer', seerShare: 0.55,
    floor: '#8a7554', floorAlt: '#907b5a', wall: '#3b2233', wallTop: '#55344a',
    fog: '#120d12', doorChance: 0.42,
    hint: 'THE SEER BURNS THE GROUND YOU STAND ON',
    budget: (i) => (i === 0 ? 0 : Math.min(5, 1 + Math.floor(i * 0.38))),
  },
  {
    name: 'THE ROAD', sub: 'Level 3', rooms: 14,
    arenas: [{ at: 5, boss: 'butcher' }, { at: 11, boss: 'butcher' }],
    millAt: 8, heals: 2, ranged: 'both', seerShare: 0.4,
    floor: '#4a3a2e', floorAlt: '#524032', wall: '#2a2430', wallTop: '#3e3346',
    fog: '#0b0a0d', doorChance: 0.35,
    hint: 'HOLD A MAN. HE STOPS BULLETS.',
    budget: (i) => (i === 0 ? 0 : Math.min(6, 2 + Math.floor(i * 0.36))),
  },
];
