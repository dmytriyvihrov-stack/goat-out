// GOAT OUT, all tuning values in one place. Units: px, seconds. 1 tile = TILE px.
const TILE = 32;
// The version tag shown under the seed in the corner of the screen, and nothing else, bump it
// by hand alongside a CHANGELOG entry so a bug report can name the build it happened on.
const BUILD = '2.01';

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
  // The shaman's (js/shaman.js): his eyes and the ring round him while he casts, a cooler green than the
  // poison so the two never read as one.
  spirit: '#3cd47a',
  spiritHi: '#b8ffd0',
  grass: '#7c8f52',
  grassHi: '#a8bd6c',
  brazier: '#4a3b2f',
  wood: '#6b4a2c',
  woodHi: '#8a6238',
  dirt: '#463524',
  dirtHi: '#5a4530',
  // The bird. Bone-white body so she reads against the compound's plum and timber at a glance, with
  // the comb and the beak the one warm note on her, she has to be findable across a room.
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

// The two paces every creature in the game is written against. `PACE` is the yardstick, it is what
// the goat's top speed used to be, and every man's speed is still quoted as a fraction of it. They
// are two numbers now because the two were turned by different amounts: the goat lost a fifth of his
// stride (and earns it back over a run-up, see `momentum`), and the cult lost a tenth of theirs.
// `SLOW` is the pace of the whole compound on top of that (24 Sep 2026: "everybody 30% slower"):
// every creature's travel, the goat's walk, run-up and roll, every man's walk, the hound's run and
// dart and hop aside, a burning man's run, every animal, is multiplied by it,
// so it is the one dial for how fast the game moves. What is thrown, flung or shot is not travel
// and is not in it: the physics of a kill (a body into a wall) does not change with the pace.
const SLOW = 0.7;
// And every clock the goat's own verbs wait on, the roll, the grab, the voice, whatever Q throws,
// is this much longer (the same day: "cooldowns +20%"). Written into each base number rather than
// run at the use site, so every card, chip and ware that quotes a cooldown quotes the real one.
const GOAT_CD = 1.2;
const PACE = 8.2 * TILE * SLOW;
// The cult's walk took a twentieth back on 26 Sep 2026 ("enemies 5% faster").
const CULT_PACE = 0.9 * 1.05 * PACE;

const TUNING = {
  effects: {
    // A prop further than this many tiles past a fifth more than the view is not drawn (`Renderer.draw`).
    propCull: 6,
    // Words over the play (1 Oct 2026, playtest: "many effects are overloaded with text that is not
    // needed", an explosion read COALS, AAAAH, IT GOES OFF and GO ROUND at once). `quiet.words` only
    // caption what the picture already shows and are not written at all (`Game.floatText`); a word
    // within `r` px across and `dy` px up or down of one written less than `gap` s ago is dropped, and so
    // is a man's bark there (`Game.bark`).
    floatLife: 1.2,   // seconds a floating word lives (`floatText`; `wordNear` measures its gap against it)
    quiet: { r: 70, dy: 16, gap: 0.6, words: ['AAAAH', 'COALS', 'IT GOES OFF', 'POISONED', 'SHOCK', 'SCALDED', 'BURNING', 'LIT', 'CLANG',
      'BONNNG', 'OIL', 'IT GOES UP', 'POISON', 'GROUND', 'IT SPREADS', 'WITCHFIRE', 'FLATTENED', 'NOTCHED', 'CLICK', 'RRAF', 'HNNGH', 'RRAAGH', 'MISS', 'STUCK'] },
    // A hole in the floor and a window in a wall (`Renderer.drawPits`, `throughHoles`, 30 Sep 2026:
    // "holes must read, contrasting"). `lip` px of the far edge's top, `face` px of its wall going
    // down in three steps darker; `rim` px of lit board end on the near side, in `edge`. Under a hole
    // in a building a baked sheet (`sheet` px square) of stakes every `spikeGap` px, `spikeSkip` of
    // them missing, `spikeH` px tall and up to four more; through a window `sky` and `cloud`.
    // The stakes under a hole (1 Oct 2026, "sharper, and without movement"): `stakeW` px at the foot,
    // narrowing by `stakeTaper` (over 1: a needle sooner), a lit `stakeTip`, laid fixed to the floor,
    // only the sky through a window lags behind the lip now (`DEPTH.night`).
    pit: { lip: 4, face: 12, rim: 4, edge: 'rgba(236,214,170,0.55)', sheet: 144, spikeGap: 12, spikeSkip: 0.22, spikeH: 12,
      stakeW: 4, stakeTaper: 1.7, stakeTip: '#f4ead2',
      dirt: '#1a1512', stake: '#cdbd9c', stakeShade: '#6f604c', blood: '#6e1414', sky: '#1d3160', cloud: 'rgba(150,170,214,0.3)' },
    maxAir: 220, maxGround: 180, maxBursts: 24, spareCanvases: 48,
    stainTile: 256, maxStainTiles: 96,
    gravity: 460, drag: 2.8, lift: 145, fragmentSpeed: 145, bloodSpeed: 210,
    maxFlight: 2, burstLife: 0.7, bloodLife: 0.32, fireFps: 12, doorPieces: 15, cratePieces: 11,
    // A dead man (`CombatFX.death`, a whole body, not torn): he keeps `carry` of the speed he died
    // with, lands and slides `keep` of what is left against `friction` px/s², leaving a smear dot
    // every `smear` px, and turns over onto his side in `settle` s, a quarter turn, `lie` rad off
    // it (0: square to the grid, where the sprite's pixels stay crisp instead of stair-stepping).
    // He goes `dark` duller than the living, sits on a silhouette shadow `shade` strong, twitches
    // `twitches` times inside `twitchBy` s, and a pool seeps out from under him after `delay` s over
    // `time` s to `pool` px (`big` for a Butcher), darker than a fresh splash so the body still reads
    // on it. A burnt one leaves no pool.
    corpse: { carry: 0.35, keep: 0.6, friction: 320, smear: 3, lie: 0, settle: 0.22, dark: 0.3, grey: 0.8, shade: 0.5,
      twitches: 2, twitchBy: 1.3, pool: 14, big: 19, delay: 0.3, time: 2.6, colors: ['#2e0a08', '#471210', PALETTE.bloodDark] },
    // A man torn apart (a blast, a roll): each piece's cut is his own pixels along the piece's edges
    // tinted blood, `goreCut` world px deep, never a bar across the empty part of the piece.
    goreCut: 2,
    // Fire, blasts, smoke and spray are baked pixel frames (`CombatFX.flameFrames` / `burstFrames`),
    // `pixel` world px a texel, the grain the units are drawn at. `flame`: a flame of `size` is
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
    // loud, a clubman going down painted a patch the size of a room corner.
    bloodScale: 0.6,
    // The cult's signs (`js/decal-pixels.js`, placed by `World.placeOmens`, drawn by
    // `Renderer.drawOmens`), 26 Sep 2026 in place of the old block glyphs, which read as floor tiles
    // of another colour. A floor sign (small or medium) lies in `chance` of rooms; an arena lays the
    // torn ritual circle instead in `large` of them; a far wall carries the watcher in `wall` of
    // rooms that have a stretch of it. `texel`: world px a sign's pixel, per sign. Paint soaks into
    // the floor at `alpha`; the wall sign is `wallAlpha`. None in THE TRIP.
    // 5 Oct 2026 playtest ("the pictograms are too bright"): alpha [0.55, 0.75] → [0.3, 0.42] and the
    // wall's 0.8 → 0.5, so the red sits in the floor instead of on it.
    omens: { chance: 0.4, large: 0.6, wall: 0.25, alpha: [0.3, 0.42], wallAlpha: 0.5,
      texel: { 'floor-small': 0.8, 'floor-medium': 0.95, 'floor-large': 1.9, 'wall-watcher': 0.8 } },
  },
  // What lies on a table and how it leaves it (js/scatter.js, 29 Sep 2026: "food on the tables that
  // scatters beautifully when hit"). `chance` of tables are laid, `count` things each off `menu`, set
  // along the top inside `top` (px off the table's middle; `jitter` px either way of its place) and
  // drawn `texel` world px a pixel. A blow throws them from `height` px up at `speed` px/s along it,
  // `spread` rad either side and `lift` px/s up, under `gravity`; a landing faster than `bounceMin`
  // gives back `bounce` of it (× the thing's own `bouncy`, `KINDS`) and keeps `skid` of its run, a clay
  // thing landing past `breakAt` breaks into `shards` and a `spill` px patch, and each bounce squashes
  // it for `squash` s (`breakAt` is a range: somewhere in it, rolled each landing). On the floor a
  // round thing rolls down at `roll` /s, anything else slides at
  // `slide`, and under `still` px/s it lies still, square to the floor. A wall gives back `wall` of
  // it. A hoof or a boot through one (`kick`): inside `r` px of the body it goes at `keep` of his
  // speed (never under `min`) and `lift` up. A level keeps `keep` of them; the oldest go first.
  // `soundGap` s between two of their knocks.
  scatter: {
    chance: 0.75, count: [3, 4], texel: 1.45, top: { x0: -19, x1: 19, y0: -10, y1: -1, jitter: 4 },
    // The fruit, cheese and bread back as most of it (2 Oct 2026 playtest: "they were beautiful, meat only sometimes").
    menu: { cult: ['apple', 'apple', 'pear', 'bread', 'bread', 'cheese', 'cheese', 'jug', 'jug', 'goblet', 'grapes', 'grapes', 'honey', 'fish',
      'leg', 'roast', 'ribs', 'haunch', 'sausage', 'boarhead', 'stew'],
      heaven: ['gapple', 'gapple', 'grapes', 'bread', 'milk', 'honey', 'cheese', 'goblet', 'pear'] },
    height: 13, speed: [110, 250], spread: 0.95, lift: [90, 190], gravity: 560,
    bounce: 0.36, bounceMin: 50, skid: 0.62, breakAt: [170, 270], shards: 4, spill: 7, squash: 0.09, spin: 16,
    roll: 1.6, slide: 7, still: 6, wall: 0.4,
    kick: { r: 5, keep: 0.8, min: 70, lift: 70 }, keep: 160, soundGap: 0.035,
    // The supper drawn duller than it was painted (3 Oct 2026 playtest: bright, it read as a pickup).
    // 6 Oct 2026 playtest, "the food on the tables a little more appetizing": back toward its painted colours (0.72 / 0.35).
    dim: { k: 0.86, grey: 0.12 },
  },
  // Carpets (2 Oct 2026, "so the floor looks more interesting"): a room lays one at `chance` (`tables`
  // where it has a table to lay it under), at most `perLevel` a floor, `long` x `short` tiles (turned
  // across the room one time in `across`), with a tile of floor round it; `tries` spots a room, the
  // best kept. `styles`: how many weaves `PaintedArt.carpet` knows. Never in a cave or on the trip.
  carpet: { chance: 0.3, tables: 0.75, perLevel: 4, long: [3, 7], short: [2, 4], across: 0.3, tries: 40, styles: 4, blood: 0.3 },
  // THE PASTURE ABOVE (js/heaven.js), where a death's card leads. Arriving: out of `arrive.flash` s of
  // white, rising in the pool of light over `rise`, the place's name up for `title`, and the last
  // life's sacrifices counted into the heap from `tallyAfter` over `tallyTime`. `pay`: what each man
  // the compound loses is worth to the god, and a floor climbed out of on top (`floor`).
  // GRAB answers inside `talkR` tiles of the god, the shepherd, the mirror or a seat; BAAH within
  // `hearR` of the god gets his BEH back `answer` s later. The first visit, he calls you over himself
  // `callAfter` s in. His words type at `type` letters a second, ignore a press for `talkArm` s, and
  // his box leaves over `talkOut`; a line over a head stays `plate` s. The comb: `snap` px to his comb
  // hand, walked at `walk` px/s, a stroke every `stroke` s for `time` s. A tuft of gold grass is
  // grazed standing within `graze.r` px of it for `graze.time` s. The mirror flashes `mirrorFlash`
  // s when butted and the goat in it butts back at `mirrorBack` tiles/s, dazed `mirrorDaze`; the
  // panel ignores a click for `panelArm`. The bells (`bells`, Hz: a pentatonic, so any order is a
  // tune) swing `bellSwing` rad, settle at `bellDamp` /s and glow `bellGlow` s. Over the edge he falls
  // `jump.time` s at `jump.speed` px/s, the last `jump.fade` of it into white; on the floor below he
  // drops from `drop.height` px over `drop.time` s, starting `drop.lead` s before the level card
  // clears. `bodyR`: how wide each thing up here is to walk
  // into. `godTexel`: world px a pixel of the god. The sea of cloud slides `seaDepth` of the camera and
  // drifts `seaDrift` px/s, the earth under the drop `earthDepth`, the clouds between them `wispDepth`.
  heaven: {
    // The feast's tables (30 Sep 2026: "leave one table, sometimes one, sometimes two, sometimes
    // none"): how many stand on a visit, `odds` for 0, 1, 2. One butted off the edge is seen falling,
    // and on the floor below it comes down out of the sky on a man (`Game.updateSkyTables`): `first` s
    // in, the next `gap` s after, `retry` s later if nobody is in sight; from `z` px up at `grav` px/s²,
    // its shadow following him until it is `lock` s from landing; everyone within `killR` px of where
    // it lands is crushed ('splat'), the goat never.
    // It waits for the moment (30 Sep 2026, "so it is at a dramatic moment"): more than `crowd` men
    // up in his room, and `hurt` hearts lost in this room and the one before; `gap` s between two.
    tables: { odds: [0.25, 0.5, 0.25], gap: [8, 16], crowd: 2, hurt: 2, z: 700, grav: 1100, lock: 0.3, killR: 30 },
    arrive: { flash: 0.9, rise: 1.1, title: 3.4, tallyAfter: 1.3, tallyTime: 1.6 },
    pay: { kill: 1, floor: 10 },
    // The god's gift (1 Oct 2026, playtest: "after the first death the goat god gives you the power to
    // gather souls, his quest, and asks for 200"). Until his first talk is heard nothing is paid; then
    // every man the goat puts down leaves a small white soul over his body (`js/motes.js`, `game.motes`),
    // and when the goat walks out of that room they come after him (Enter the Gungeon's casings) and
    // are counted into the heap as they reach him. `quest`: what the god asks for, counted on what is
    // brought after the gift; brought, he says so and his mirror shows SECOND CHANCE.
    // A mote rises `rise` px over `riseT` s, breathes `bob` px, waits `wait` s at least, then flies at
    // `speed` px/s (`accel` px/s² on top), banked within `catchR` px; one still in the room he died in
    // is lost with him. `cell` world px a pixel of it.
    // `mend` (3 Oct 2026, "the god asks for 20, not 200: then he mends his broken mirror and you can grow
    // between deaths"): the mirror is broken until that many are brought and the god has said so
    // (`Heaven.mended`); `quest` stays the far count that puts SECOND CHANCE on it.
    gift: { mend: 20, quest: 200 },
    // 2 Oct 2026 playtest: out of the body `delay` s after the death, up over `riseT` s, hanging `wait` s
    // before it may come, and only from right by it (`near` tiles) or once he is out of its room;
    // `ghostFor`: how long one nobody is paid for (before the gift) hangs before it goes out.
    // 5 Oct 2026: "maybe the souls sway very, very gently over the bodies": `bob` px up and down at
    // `bobRate` rad/s and `sway` px side to side at half of it, slow enough to read as breathing.
    // `per`: how many souls a kind leaves (the big men two, the ogre three; a champion, a boss, one
    // more), spread `spread` px across the body. Each is paid on its own (`pay.kill`).
    motes: { near: 1, rise: 26, riseT: 1.3, bob: 2, bobRate: 1.1, sway: 1.5, alpha: 0.7, delay: 0.55, wait: 1.5, ghostFor: 2.4, speed: 120, accel: 900, max: 520, catchR: 12, cell: 2, stagger: 0.07,
      per: { champion: 2, seer: 2, hunter: 2, shield: 2, thrower: 2, butcher: 3, ratogre: 3, boss: 1 }, spread: 9 },
    // SECOND CHANCE (a mirror rank, `MIRROR`): once a floor, a killing blow lifts his soul half out
    // of him and puts it back (`Motes.revive`), `time` s of it, the world held, and he stands where he
    // fell on `hearts` hearts, untouchable `invuln` s, every man within `push` tiles thrown back at
    // `fling` tiles/s (under what stone kills at: the light shoves, it does not kill) and dazed `daze` s.
    second: { hearts: 2, invuln: 2.2, push: 3.2, daze: 1.6, fling: 6, time: 1.9 },
    // The soul leaving a dead goat (`Motes.drawAscent`): it rises `rise` px over `time` s in a beam
    // `beam` px wide, from `lift` s after the blow; `sway` px side to side.
    ascent: { time: 1.75, rise: 150, lift: 0.2, beam: 26, sway: 4 },
    // `holdGap`: s between two of the god's NOT YETs at the edge, before the mirror (`Heaven.holdEdge`).
    talkR: 2.3, hearR: 7, answer: 0.6, callAfter: 1.5, type: 44, talkArm: 0.3, talkOut: 0.28, plate: 3.2, holdGap: 2.4,
    // The question mark over a thing never tried up here (`Heaven.drawMarks`, 3 Oct 2026): `cell` world
    // px a texel, `lift` px over each thing's feet, a slow bob.
    marks: { cell: 2.5, lift: { god: 128, shepherd: 66, mirror: 84, seat: 64, horse: 84, table: 34, bells: 56, tower: 196 }, bob: { rate: 2.6, amp: 2 },
      glyph: ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'], rim: '#3a2c4e', fill: '#f7d774', lit: '#fff4c2' },
    comb: { snap: 26, walk: 110, stroke: 0.42, time: 3.6 }, graze: { r: 22, time: 1.1 },
    // (THE EDGE / THE MIRROR FIRST and WALK OFF IT were lettered by the lip until 5 Oct 2026: "write
    // nothing there".) What says where the way down is instead (`Heaven.drawArrows`): until he has once
    // walked off the edge (`meta.jumped`), after `after` s up here with nothing open, `n` arrows of
    // cells (`cell` world px a texel) bob over the lip, `bob.amp` px at `bob.rate` rad/s, in over `fade` s.
    arrows: { after: 25, n: 4, cell: 4, bob: { rate: 3.2, amp: 5 }, fade: 0.8, glyph: ['.###.', '.###.', '.###.', '#####', '.###.', '..#..'], fill: '#f7d774', lit: '#fff4c2', rim: '#3a2c4e' },
    mirrorFlash: 0.35, mirrorBack: 7, mirrorDaze: 0.7, panelArm: 0.25,
    // A rank is bought by holding (5 Oct 2026, "like Hades"): click, SPACE or A held `hold` s fills the
    // row, a rising chime every `tick` s, the row shaking up to `shake` px; let go early and nothing is
    // spent. Bought, a glint runs across the row over `glint` s.
    buy: { hold: 0.85, tick: 0.1, shake: 2.5, glint: 0.7 },
    // Eight bells since 30 Sep 2026 ("more bells, something tall up there"): C major pentatonic over an
    // octave and a third, on a taller beam; the god's tune (E D C D E E E) still lies on the first three.
    bells: [262, 294, 330, 392, 440, 523, 587, 659], bellSwing: 0.55, bellDamp: 3.5, bellGlow: 0.8,
    // Only the first bell rings at first (5 Oct 2026, the shepherd's quest): one more wakes for every
    // floor this browser ever climbs out of (`Heaven.bellsOpen`, `meta.cleared`), shown waking `wake` s
    // into the next visit. A sleeping bell is grey and chained and gives a dull knock.
    bellWake: 1.8,
    // All of them awake, the blind shepherd walks to the beam and plays (`Heaven.updateSong`), then the
    // goat plays it back, Guitar Hero fashion, then the bells ring on by themselves `auto` s.
    // An ORIGINAL heavy march on the pentatonic bells (asked for as "Du Hast"; that melody is not
    // copied here): `[beat, bell]` pairs at `bpm`. `intro` is what the shepherd plays and the goat
    // plays back (a bell change at most two bells away per beat, so it can be walked); `loop` is the
    // whole of it, `loopBeats` long, rung by the bells alone. A light falls `fall` px onto its bell
    // over `lead` s; a butt within `window` s of the beat lands. `after` s into a visit he starts,
    // walking at `walk` px/s; `count` beats of count-in.
    bellSong: { bpm: 84, after: 4, walk: 70, count: 4, lead: 1.5, fall: 64, window: 0.24, auto: 60,
      intro: [[0, 0], [1, 0], [2, 0], [3, 2], [4, 1], [5, 1], [6, 1], [7, 3], [8, 2], [9, 2], [10, 4], [11, 3], [12, 2], [13, 1], [14, 0]],
      loop: [[0, 0], [0.5, 0], [1, 0], [2, 0], [2.5, 0], [3, 2], [4, 1], [4.5, 1], [5, 1], [6, 1], [6.5, 1], [7, 3],
        [8, 2], [8.5, 2], [9, 4], [10, 3], [10.5, 2], [11, 1], [12, 0], [13, 4], [13.5, 5], [14, 4], [15, 0],
        [16, 5], [16.5, 5], [17, 5], [18, 7], [18.5, 6], [19, 5], [20, 4], [20.5, 4], [21, 4], [22, 6], [22.5, 5], [23, 4],
        [24, 3], [24.5, 3], [25, 2], [26, 1], [26.5, 0], [27, 1], [28, 0], [29, 0], [30, 0], [30.5, 0], [31, 0]],
      loopBeats: 32 },
    // 3 Oct 2026 ("in heaven take the cooldown off the headbutt"): nothing to fight up here, so the
    // horns come back at once, `buttRecovery` × the recovery, `buttWindup` × the windup: the bells play fast.
    buttRecovery: 0.05, buttWindup: 0.5,
    // The blind shepherd hears the chime: after every `every` rings, `chance` of a word, never two
    // within `gap` s (`Heaven.butt`, `SHEPHERD_TALK.bells`).
    shepBells: { every: 3, chance: 0.6, gap: 7 },
    // Heaven's harp (`GameAudio.playHeavenStep`), calmer since 30 Sep 2026: a note every `every`
    // steps, `octave` × the chord's own pitch, at `pluck` and the pad at `pad`.
    music: { every: 4, octave: 1, pluck: 0.024, pad: 0.038 },
    // In the air he tumbles (29 Sep 2026: "a more real spin in flight"): a body in the air turns at a
    // steady rate and does not speed up, `turns` whole turns over the flight, and rolls over on his
    // long axis `flips` times (the picture thins and widens). Down on a floor he lands on his side
    // (the stunned pose) and lies there `ko` s before he gets up over `getup` s, woken by the fall,
    // not dropped into the pen: on a floor with one he lands `besidePen` tiles past its bars.
    // Off the edge (5 Oct 2026, "a prettier fall"): a hop of `hopH` px over the first `hop` s (crouched
    // the first `crouch` of it), a puff of `puff` cloud cells kicked off the lip, then down `fall` px,
    // shrinking to `small` of himself, shedding `motes` a second; the white closes over the last `fade`
    // of `time`, and holds `beat` s before the floor is built.
    jump: { time: 1.5, speed: 150, fade: 0.4, turns: 1.1, flips: 1.5, hop: 0.32, hopH: 18, crouch: 0.3, fall: 150, small: 0.12, puff: 16, motes: 30, beat: 0.35 },
    // 3 Oct 2026 ("a cooler fall from the sky"): he comes down a shaft of light (`shaft`: `w` px half
    // wide, `over` px above the top of the fall, gone over `fade` s once he lands), shedding motes
    // (`motes` a second), his shadow growing under him (`Heaven.dropShadow`), stretched long at the end
    // (`stretch`), and lands in a ring `ring` px out with `burst` motes thrown up.
    drop: { time: 0.75, height: 230, lead: 0.45, turns: 1.25, flips: 2, ko: 1.3, getup: 0.35, besidePen: 1.4,
      stretch: 0.45, motes: 40, ring: 38, burst: 12,
      shaft: { w: 14, over: 260, fade: 0.6, alpha: 0.22, color: '#fff4d6' } },
    bodyR: { hseat: 16, hshep: 15, hmirror: 17, hbell: 8, htower: 18 },
    // THE OVERLOOK's tile (6 Oct 2026, `Heaven.openOverlook`): the edge room's far corner, over the drop,
    // a wooden watchtower (`HEAVEN_PIXELS` `watchtower`, its top in a cloud) drawn `towerScale` world px a texel.
    towerAt: [53.6, 9.4], towerScale: 1.4,
    // The animals' quests (6 Oct 2026 playtest, `Heaven.QUESTS`): offered at a filled seat by GRAB, taken by a second
    // GRAB within `offer` s, worn as a run modifier until won or let go at the post by the edge (`postAt` tiles,
    // `postR` px). `horse`: THE CHASE on every floor past the first he plays until `floors` of them are climbed out
    // of, `pay` sacrifices each, `done` more for the last. `rabbit`: one floor climbed out of with no man aware of him
    // outside its last room; while it is worn the stealth test (ALT) is on; `done` sacrifices.
    quests: { offer: 6, postAt: [36.6, 18.4], postR: 9, horse: { floors: 3, pay: 15, done: 40 }, rabbit: { done: 60 } },
    // The mirror's tile (`Heaven.level`): at the bridge's mouth on the edge's side, so the way down passes it.
    mirrorAt: [35.7, 12.2],
    // The shepherd's tile: down the edge room toward the lip (3 Oct 2026, "the old man somewhere about
    // here"), out from under the bells, so the comb is on the way down rather than tucked in a corner.
    shepAt: [46, 17.2],
    godTexel: 1.55, seaDepth: 0.55, seaDrift: 5, earthDepth: 0.2, wispDepth: 0.45,
    // The rite far below, through the drop (30 Sep 2026: "the cultists down there perform a strange
    // ritual with fire and your ewe"), in the earth's own pixels (`Heaven.bakeEarth` / `drawRite`).
    // `at`: the altar in the yard; `ring` (rx, ry) the path the `men` walk; `candleRing` the painted
    // ring `candles` stand on, none within `candleGap` rad of the altar's head or foot. The men walk
    // `walk` s at `pace` rad/s (a step every 1 / `step` s), stop and bow round the ring one after
    // another (`bow` s, each `wave` s after the last, down for `bowFor` s), then all raise their arms
    // (`raise` s, swaying a pixel at `sway` Hz). The mage at the head (`mageAt` px above the altar's
    // middle) changes pose every `mageBeat` s. The fire is the game's own baked flame of `fireSize`,
    // `fireAt` px below the altar's middle; its light reaches `glowR` px at `glow` [least, swing] of
    // alpha, re-rolled `flickerFps` a second; each candle's `candleR` px at `candleGlow`, its flame
    // re-rolled `candleFps` a second. `dusk` darkens the yard toward night so the light reads.
    ritual: { men: 8, at: [27, 27], ring: [20, 14], candleRing: [11, 8], candles: 10, candleGap: 0.55,
      walk: 9, pace: 0.09, step: 2.2, bow: 5, wave: 0.3, bowFor: 1.6, raise: 4, sway: 0.5, mageAt: 5, mageBeat: 1.6,
      fireSize: 3, fireAt: 9, glowR: 22, glow: [0.18, 0.1], flickerFps: 7, candleR: 4, candleGlow: 0.14, candleFps: 9, dusk: 0.75 },
  },
  goat: {
    radius: 12,
    // A fifth off the stride he walks about with, and then another fifth off that. The run-up is
    // what gives it back: four seconds of running flat out and he is closer to the old top speed
    // again, so the speed he used to have for free is now the speed he has for not stopping.
    // And a tenth back on 26 Sep 2026 ("the goat 10% faster").
    speed: 0.8 * 0.8 * 1.1 * PACE,
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
    // about walking backwards, so a third of the cut is given back, not the whole of it: the goat
    // still starts underpowered, and what he has out of the pen is a shove with a body behind it.
    // `lunge` is a speed, not a distance, but at `active` seconds it used to carry him close to three
    // tiles on a single press, noticeably further than the reach a headbutt reads as. Cut to land
    // close to two.
    // `impulse` came down from 28 (24 Sep 2026: "men should fly less from the bare head"): a
    // clubman went seven tiles off it and died on a wall five tiles away, which left LONG HORNS
    // nothing to add. Now five tiles, killing against stone within three. `propImpulse` is what a
    // crate or a blade off the stand is sent with, kept at the old number: only men were asked for.
    // `recovery` 0.38 until 25 Sep 2026: a fifth longer between two butts, asked for in play; 0.46
    // until 30 Sep 2026, when the playtest asked for 15% more between two butts again.
    headbutt: { windup: 0.12, active: 0.15, recovery: 0.53, lunge: 10 * TILE, impulse: 21 * TILE, propImpulse: 28 * TILE, reach: 1.64 * TILE },
    // THE THREE HORNS (6 Oct 2026 a dev test with a dagger, an axe and a spear; 7 Oct 2026 his word: "the ones we have
    // are the dagger horns, and two new ones on top, BIG and LONG"). Which one he has is `game.hornKind` (the DEV MODE
    // drawer's HORNS row steps them, kept under `HORN_KEY`; the itch build is always the dagger, the horns as they always
    // were). Each is a set of multipliers laid over the headbutt above: `windup` `recovery` `lunge` (his step into it)
    // `impulse` (the throw) scale those numbers, `reach` is tiles added to how far a man can be and still be hit
    // (`mods.headbuttReach`, so LONG HORNS the soul and ECHO HORN follow), `cone` is the least dot with his aim a man may
    // stand at (0.15 is nearly a half circle, below 0 more than one). Under it the blow is an ARC. With `rows` it is a
    // STRAIGHT blow instead (`Goat.hornHit`): two strips, one a horn, `rowGap` tiles either side of his aim and `rowW`
    // wide, out to the reach; a man in the last `1 - tip` of it is hit by the tips and thrown `tipMul` times as hard, one
    // on the shafts is only shoved `shaftMul` (pillar 3: nothing here kills, the wall behind the man does).
    // `wave` is the small picture of it on the floor (`Renderer.drawHornWave`): cells for `time` s, `alpha` at most.
    horns: {
      order: ['dagger', 'big', 'long'],
      dagger: { name: 'DAGGER', note: 'THE ARC, AS IT WAS', windup: 1, recovery: 1, lunge: 1, impulse: 1, reach: 0, cone: 0.15 },
      big:    { name: 'BIG',    note: 'A WIDE, DEEP ARC. SLOWER TO SWING', windup: 1.2, recovery: 1.25, lunge: 1, impulse: 1, reach: 0.85, cone: -0.3 },
      long:   { name: 'LONG',   note: 'TWO HORNS, STRAIGHT. THE TIPS HIT HARD', windup: 1.1, recovery: 1.1, lunge: 1.15, impulse: 1, reach: 1.45, cone: 0.5,
        rows: 2, rowGap: 0.4, rowW: 0.17, tip: 0.62, tipMul: 1.4, shaftMul: 0.5 },
      wave: { time: 0.34, alpha: 0.5 },
    },
    // A headbutt or a roll pressed while he is still busy is kept `buffer` s and goes the frame he is
    // free, instead of being dropped for being early. Not a cancel: what he was doing still runs
    // its whole length (pillar 4). Only a press made while busy is kept.
    buffer: 0.12,
    // A throw is a commitment now: you let him go, and your mouth is empty for a beat.
    // He is in your mouth a long time, and he works himself loose somewhere in `holdVary` either
    // side of it, so you never learn the exact beat he goes: carrying one is a gamble, not a timer.
    // `manThrow` is what a goat can actually do with a grown man: the same throw as a crate takes
    // off two thirds of the way across a room, which is a gorilla. A man goes a short way and lands.
    // Two weights and two prices for carrying. A man in your mouth is `speedMul`, most of your
    // stride, because he is most of your size. A blade or a shield is `itemSpeedMul` and barely
    // anything, which is what makes an arm worth taking in passing rather than a thing you commit to.
    // `throwImpulse` is a fifth less than it was: a throw that crossed most of a room made the
    // grab-and-launch loop the answer to everything a headbutt was supposed to be for.
    // 1.65 (24 Sep 2026: "the throw is weaker than the headbutt, it really is the less active
    // verb"): a man is not a box, and three things say so. `bite` s of getting the teeth under him
    // before he is off his feet, slowed to `biteMove` of a stride, a windup like any other, and he
    // keeps doing whatever he was doing through it; if he is gone or out of `biteSlack` × the reach
    // when it closes, the mouth closes on nothing and costs `biteMiss` s. Carried, he is `speedMul`
    // (0.6 from 0.7: under a mage's cast in your mouth you only just get clear of his own fire).
    // And a man costs the mouth `manCd` × `cooldown` before it takes again, however he left it.
    // Objects are none of this: a crate is still in your mouth the frame you ask.
    grab: { reach: 1.6 * TILE, speedMul: 0.6, itemSpeedMul: 0.94, holdTime: 8.0, holdVary: 0.125,
      throwImpulse: 27.2 * TILE, manThrow: 0.7, holdDist: 22, cooldown: 1.35 * GOAT_CD,
      bite: 0.18, biteMove: 0.4, biteSlack: 1.2, biteMiss: 0.45, manCd: 1.4,
      // A man out of his mouth without a throw lies `letGo` s when the goat drops him (a roll, a blink, the
      // pen's stun) and `loose` s when he works himself free or is left at the stairs (literals until 2 Oct 2026).
      letGo: 0.5, loose: 0.6 },
    // Where a carried THING is drawn (render only; `grab.holdDist` stays the hold point a throw starts
    // from): in his teeth, at the mouth of the facing the sprite shows (`PIXEL_FACE`), `lead` px plus
    // `reach` × its radius out ahead of the muzzle. `lift` is how far above its own y each drawer puts
    // a held thing's middle, so the middle is what lands on the mouth.
    // `turn` rad/s (real time) is how fast he swings to his aim with something in his mouth.
    carry: { lead: 2, reach: 0.7, lift: { crate: 10.5, bomb: 7, tortoise: 5, chicken: 6 }, turn: 26 },
    // BAAH out of the pen is what a goat's voice actually is: a noise. It calls every man who hears
    // it to the spot you shouted from, which is a tool, you throw your voice at one end of a room
    // and leave by the other, and a way to get killed. What it is NOT is a weapon: taking the sense
    // out of a crowd is THE FULL THROAT, and setting fire to one is DRAGON BREATH, and the goat
    // picks one of the two. `call` is how far the noise carries; `radius` is what the two tomes
    // reach, deliberately short of what the screen shows, so a stun is for the men on top of you.
    // `balk` and `balkStun` are what the BARE voice does to a man already swinging at you: inside
    // `balk` tiles, arm's length, near enough that he is the one about to land a blow, a shout in
    // his face breaks whatever he had committed to and costs him `balkStun` before he can start it
    // again. It is not THE FULL THROAT: it reaches two bodies rather than a room, it does not stack,
    // and a man it interrupts is walking at you again a blink later. What it buys is the one thing
    // the bare voice never had, an answer to being caught, rather than only a way of moving a crowd
    // about. The lure is untouched and still goes out to `call` tiles: one button, both jobs.
    // `radius` came in a fifth: a stun that reached across most of a room answered a crowd rather
    // than the handful of men on top of you, which is what THE FULL THROAT is supposed to cost for.
    // `balk` came down a further fifth, to a plain two tiles: even arm's length read as a little more
    // reach than the bare voice should have, and the lure is what still carries the room at `call`.
    // `radius` is THE FULL THROAT's daze, halved on 30 Sep 2026 (6.8 tiles; "the stun baah, half the
    // radius"). BOON_BASE.screamRadius is the same number and must stay equal to it.
    // `balk` 2 → 1.25 tiles (5 Oct 2026, "the bare baa that breaks a swing, a much smaller radius"):
    // the man whose club is over the goat's head, not the one a step behind him.
    scream: { duration: 0.3, cooldown: 4.0 * GOAT_CD, radius: 3.4, stun: 0.9, call: 13, callCooldown: 3.0 * GOAT_CD,
      balk: 1.25, balkStun: 0.3,
      // However much bends the voice's cooldown, RAW THROAT, four geese brought out, it never comes back
      // faster than this: at 0.82 s it outlasted its own daze and three men stood dazed 98% of a fight.
      minCooldown: 2 },
    // A clumsy sideways tumble: fast, brief mercy frames, then a stagger you have to eat. It is a
    // fifth shorter than it was, the same beat of mercy, a fifth less ground, because a dodge that
    // clears the whole room is a second way of running rather than a way of not being hit.
    // `stun` and `stunR` are DEAD WEIGHT's, and nothing else reads them: the roll on its own
    // goes through a man without touching him.
    // The stagger is `recover` s of getting up, walking at `recoverMove` of a stride, and it costs
    // the run-up: at 0.26 s and a third of a stride he ran straight on out of the tumble and nobody
    // could see he had paid anything for it (playtest, 25 Sep 2026). Taken out again the next day
    // ("after the roll, remove the recover altogether"): he lands on his feet; the run-up is still lost.
    // 1 Oct 2026: "the roll 20% further and 10% more cooldown", speed 7.92 → 9.5 (the same mercy
    // frames over more ground), cooldown 1.35 → 1.485.
    // `land` is the share of the tumble's speed he still has when he lands (SPRING HOCKS raises it).
    roll: { speed: 9.504 * TILE * SLOW, duration: 0.32, invuln: 0.24, recover: 0, recoverMove: 0.08, cooldown: 1.485 * GOAT_CD, threatRange: 7,
      stun: 0.7, stunR: 1.6 * TILE, land: 0.22 },
    // The smear behind him is the only thing on screen that says he is faster than he was, so the
    // tome that makes him faster lengthens it: at `fastAt` times his own speed it is `fast*` all
    // through, and anywhere between the two it is mixed.
    trail: { at: 0.55, gap: 0.028, keep: 7, life: 0.18, fastGap: 0.014, fastKeep: 16, fastLife: 0.34, fastAt: 1.18 },
    // `range` 5.2 tiles until 30 Sep 2026 ("the base breath, one tile shorter"), 4.2 until 6 Oct 2026 ("only 3 tiles").
    // 2 Oct 2026 playtest, "a bit more fire": the cone wider (`halfAngle` 0.52), the floor burning longer
    // (`fireTime` 3.4), and more flame thrown out of the mouth (`parts`, 26); the reach is left as it was.
    breath: { range: 3 * TILE, halfAngle: 0.64, fireTime: 4.4, parts: 40, cooldown: 5.0 * GOAT_CD },
    // `radius` is the real blast, what it flings and damages, and stays untouched by the two
    // numbers under it: `fxScale` and `fxLife` only shrink and shorten the burst graphic itself, so
    // the explosion reads without eating a third of the screen or the fight happening behind it.
    bomb: { fuse: 0.9, radius: 2.6 * TILE, impulse: 24 * TILE, fxScale: 0.55, fxLife: 0.4 },
    // The run-up. A goat that has been running flat out for a while is going faster than one that
    // just set off: `time` seconds of asking for at least `atLeast` of a stride buys the whole of
    // `max`, and it drains at `lose` times real time the moment he stops, or all at once when he is
    // hit. It is the only speed in the game you earn rather than pick up, and it is worth having
    // because everything that stops you costs it: a fight costs it, a door costs it, a club costs it.
    // `max` is exactly the fifth that came off `speed`: a goat at the end of a run-up is doing what
    // he used to do standing still, so the old top speed is still in the game, it is just the
    // reward for not stopping now, and a single club takes it off you again.
    momentum: { max: 0.25, time: 4.0, lose: 3.0, atLeast: 0.6 },
    turn: 9,                // rad/s he swings his head round to where you are pointing, standing still
    // A heart a tick while he stands in flame. Was 0.7 (29 Sep 2026: "when you catch fire yourself, let
    // it hurt slower"): at 0.7 a goat set alight lost two hearts before he had read that he was burning.
    fireDamageInterval: 1.2,
    // The flame on him is the clock of that tick (1 Oct 2026: "small when you have just stepped in,
    // it grows fast, and full grown is the damage"): `goat.fireK` picks one of `sizes` (baked flame
    // sizes, so it steps up and never flickers between shapes), on his back (`low` px over the middle
    // of him, never at his hooves: "on the goat itself"), its foot sinking as it grows (`high`) until it wraps him. Out of the fire the heat in him cools at `cool` s a second, and never more than `keep` of a tick stays in him.
    burnLook: { sizes: [5, 7, 9, 11, 13], low: -15, high: -6, cool: 0.4, keep: 0.6 },
    // His own poison (30 Sep 2026; `Status.goat`): standing in a puddle fills a ring round his feet in
    // `build` s (the fire's tick, the "certain time" the note asked for), which drains at `drain` a
    // second out of it; full, he runs at `moveMul` for `time` s after he leaves it. Only the slow:
    // no heart, no blindness ("only slowing down").
    poison: { build: 1.2, drain: 1, time: 3, moveMul: 0.65 },
    // On his last heart he leaves a drop now and then behind him, not a stripe on every tile.
    bleed: { gap: 0.4, jitter: 0.35, minSpeed: 60, size: 2 },
    // A blot in his wool per lost heart (`PaintedArt.wounds`): world px from the foot, the first
    // spots on the flank and the later ones spreading, each a little bigger than the last. `front`
    // is how much of that size is left facing the camera: from the front the whole blot sits on his
    // face and chest and read as twice the wound it is from the side.
    // What the butt souls do to the pixel goat's horns (`PIXEL_ART.horns`): LONG HORNS turns each
    // one into a stag's antler (`antler`, below); BOMB CHARGE and SPLASH skin them in lava and in
    // venom, `ramp` dark root to lit tip, a `glow` of `blur` px round them, and a venom drop off
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
    // The title's pair (`Renderer.titleHorns`), drawn as his own horns are: pixels on a grid `cells` square a horn,
    // the horn `span` of the name's letter height across, outlined, lit along the top. The plain one is in his
    // horn's browns (`ramp`, dark root to a paler tip; a cell takes one step of it, never a blend: pixel art,
    // 3 Oct 2026); `ring` is the spacing of its growth rings along the beam.
    titleHorn: { cells: 20, span: 1.05, ramp: ['#21160f', '#3d2b1f', '#5c4331', '#836448', '#b8986f'], outline: '#120a07', ring: 0.17 },
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
    // Eating (30 Sep 2026 playtest: "when he eats grass, a simple bend of the head, just stretch
    // the sprite a bit"): the sprite leans over his front hooves by `lean` rad toward the way he
    // faces (a side view) and squashes `squash` from the hooves up, `wide` wider, with a nibble of
    // `nibble` more `rate` times a second; in over 1/`ease` s. `PaintedArt.drawGoat`, off `goat.grazeK`.
    grazePose: { lean: 0.2, squash: 0.13, wide: 0.07, nibble: 0.35, rate: 3, ease: 6 },
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
    // two) one fidget, picked by `weights`, glances one facing aside (`look` s), a little pronk
    // (`hop`: `h` px up over `time` s), a shake of the head (`shake`: `amp` rad at `freq` rad/s),
    // or paws the floor (`paw`: `scrapes` scrapes, a puff of dirt each). Drawn only; the aim and
    // the facing a butt goes along are never touched.
    // More of them (2 Oct 2026 playtest, "add idle animations"): `stretch` (long and low, then back),
    // `sniff` (the head down to the floor in `sniffs` quick dips), `scratch` (a hind hoof at an itch:
    // a lean back and a fast small shiver).
    idle: { after: 1.4, gap: [2.2, 4.6], weights: { look: 3, hop: 1, shake: 2, paw: 2, stretch: 2, sniff: 2, scratch: 1 }, look: 1.1,
      hop: { time: 0.42, h: 5 }, shake: { time: 0.45, amp: 0.09, freq: 44 }, paw: { time: 0.8, scrapes: 2, dist: 1.5 },
      stretch: { time: 1.1, long: 0.12, low: 0.1 }, sniff: { time: 1.0, sniffs: 3, dip: 0.08, lean: 0.12 },
      scratch: { time: 0.9, lean: 0.14, amp: 0.035, freq: 70 } },
    // `cache`: how many baked frames of him with his blots on are kept (`PaintedArt.wounds`).
    wounds: { r: 1.9, grow: 0.15, front: 0.65, alpha: 0.8, spots: [[-4, -10], [5, -9], [-1, -14], [-7, -7], [7, -13], [2, -6]], cache: 96 },
    invuln: 0.9,            // s of invulnerability after a hit
  },
  // A man standing (drawn only, 2 Oct 2026): he breathes from the feet up over `period` s, by `amp`,
  // and his weight shifts side to side by `sway` rad over `swayPeriod` s, each man on his own phase.
  menIdle: { period: 2.6, amp: 0.025, wide: 0.012, sway: 0.03, swayPeriod: 5.5 },
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
    // else entirely, `wildSpread` radians is the least he is off by, and it can be twice that,
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
  // think its way through a BAAH, a screamed pack is a dead pack, and that is the point of it.
  dog: {
    radius: 10, speed: 0.98 * CULT_PACE, sight: 12, cone: Math.PI * 0.9,
    // The run. Inside `dashRange` tiles he stops and charges for `windup` seconds with the line he is
    // about to run drawn on the floor in red; then he runs it at `dashSpeed` for up to `dashTime`,
    // barking, turning onto the goat at `dashTurn` rad/s, and bites whatever is in front of him. The
    // line starts `dashSkew` radians off the straight one on the side he was circling, so it bends.
    reach: 0.76 * TILE, windup: 1.0, swing: 0.12, recover: 0.4, damage: 1, knock: 0.8 * TILE,
    // It was 13 tiles a second for 0.6, gone before the eye had it, which read as a special move
    // rather than as a dog running. Now it is a sprint: `dashStart` of top speed off the crouch,
    // full speed after `dashRamp` seconds, about seven tiles in all. `dashLook` and `orbitLook` are
    // the tiles of floor his whisker wants ahead of him before he commits to a heading.
    dashRange: 4.5, dashSpeed: 9 * TILE * SLOW, dashTime: 0.82, dashTurn: 2.6, dashSkew: 0.45,
    dashStart: 0.45, dashRamp: 0.16, dashLook: 0.9, orbitLook: 1.1,
    // The run ends `overrun` tiles past the goat (it bites him on the way, or it misses and is
    // over); it homes only while he is ahead, and the whisker bends it no faster than `whiskTurn`
    // rad/s. Before 1.65 it ran its whole time, turned back after a goat it had passed, and snapped
    // off walls, the line on the floor came out as a hook with a corner in it.
    overrun: 1.5, whiskTurn: 5,
    flooredTime: 0.7,
    // The sidestep is a skill with a clock, not a coin (30 Sep 2026: "the dog has a skill, once every
    // 10 seconds it can bounce off your headbutt, but that also refreshes its cooldown"). Was a 38%
    // chance on any headbutt with 1.2 s between. Now `dodge` (the chance once it is ready) is sure,
    // `dodgeCd` is the 10 s before the next one, and a sidestep costs him his run: `lungeCd` goes back
    // to at least `dodgeRest` s, so a hound that slipped you has to circle before it plants again.
    dodge: 1, dodgeCd: 10, dodgeRest: 1.4, dodgeSpeed: 15 * TILE * SLOW, dodgeTime: 0.2,
    // `lungeCd` counts from the end of a run, not from the plant: counted from the plant it was spent
    // on the windup and the run themselves, and a lone hound went plant, run, back off, plant, never
    // once circling (1.65, 5.5 s of every 12 standing in the windup). `ringHold` is the least he
    // circles after coming back onto the ring before he may plant again: the circling is the read.
    circle: 2.6, circleFlip: 0.9, lungeCd: 1.4, retreat: 0.55, ringHold: 0.5,
    flipGap: 0.4,       // s after the ring turns him round before a wall may turn him round again
    ringIn: 1.5,        // times `circle`: further out than this he runs the route in, not the ring
    ringOut: 1.25,      // times `ringIn`: once on the ring, only past this does he leave it for the route
    // How he runs (1.65). He is a body with a heading, not a point with a velocity: he turns at `turn`
    // rad/s (`pivot` times that standing), eases to `turnSlow` of his pace through a turn right round,
    // and gets to his pace at `accel` and off it at `brake` (paces per second). His body, the sprite,
    // points where he runs; his eyes stay on the goat. `sideHold` s is the least he keeps one way round
    // the ring before he wheels the other; `flipOdds` the coin, alone, each time `circleFlip` comes up.
    // `skid` is how fast a finished run bleeds off (per s): he slides on past, he does not stop dead.
    turn: 7, pivot: 3, turnSlow: 0.35, accel: 4, brake: 7, sideHold: 1.1, flipOdds: 0.3, skid: 5,
    // `mateArc` rad: a packmate nearer than this round the ring is bunching, and he circles away from
    // it; further round, it is not. `breakOut` is how much of the break after a run is out, against
    // one of round: he wheels off along the ring, not straight back.
    mateArc: 1.7, breakOut: 0.55,
    // Round his own (24 Sep 2026): a body, clubman or packmate, inside `look` tiles ahead of him is
    // run round, not leaned on; the whisker swings `step` rad at a time off it, never past `arc` rad
    // (further round is not going past, it is going back), and keeps the side it picked `hold` s so
    // a man square in front cannot flip him left and right. `give` s of going round and not a tile
    // nearer the goat (boxed in by a knot of them) and he leans on through for as long, as he used to.
    pass: { look: 1.3, step: 0.3, arc: 1.5, hold: 0.45, give: 1.2 },
    // A running hound bounces: `bob` px up at the top of each of `gait` strides a second.
    gait: 6.5, bob: 1.5,
    packGap: 7, packWait: 0.55,   // one hound runs in at a time; the rest hold the ring
    // He gives tongue as he runs: a bark every `barkGap` s (±40%) while he hunts, every `barkDart` s
    // on the run in. Sound only, the men answer the goat's noise, not their own dogs'.
    barkGap: 0.9, barkDart: 0.3,
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
  // Two hits again (26 Sep 2026: "the ordinary mage has 2 health"; 1.72 had made him one like any
  // man), blinking clear after the first; a boss Seer takes three. He can always be grabbed, carried and thrown.
  seer: {
    radius: 11, speed: 0.55 * CULT_PACE, sight: 11, cone: Math.PI * 0.62,
    keepMin: 5, keepMax: 9, damage: 1, hp: 2,
    castWind: 0.8, castCooldown: 2.5, runeRadius: 1.4, runeFire: 2.0,
    // A third fewer blinks than he used to get (3.0 → 4.3, which is 0.7 of the old rate). A mage who
    // re-sited himself every three seconds was a fight you could not close on: every approach you
    // committed to was answered before it arrived, so the counter-play was to wait rather than to
    // move. The longer gap is the window, he still leaves when you get near, he just cannot do it
    // twice in the time it takes you to cross the room after him.
    blinkRange: 3.2, blinkDist: 5.5, blinkCooldown: 4.3,
    // His own fire burns him like anybody's, he is simply better than anybody at not standing in
    // it. `fireCare` is how much further than a clubman he reads flame from, `trapSense` the floor
    // under his trap roll, and he will not blink onto ground that is alight or about to be.
    fireCare: 2.2, trapSense: 0.97,
  },
  // The wraith. It is not there most of the time: no body, no collision, nothing to hit, and walls
  // are not walls to it. It becomes real only once it has worked its way onto your flank or your back
  // and started to swing, and from that moment it cannot stop, so the window it opens to hurt you is
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
                        // anywhere from your shoulder to your back, a pack arrives from every side
    lurk: 0.24,         // it has to hold your blind side this long before it commits, so sweeping
                        // past the back of your head is not the same thing as getting behind you
    manifest: 0.26,     // becoming real: the one beat of warning you get
    solidAfter: 0.8,    // how long it stays real once the blow has landed, the punish window
    fadeCd: 1.5,        // and how long before it can line another one up
    bossFade: 2.2,      // a boss that loses a heart goes straight back to mist for this long
    driftWobble: 0.7,   // how much it wanders while it closes, so a drift does not read as a missile
    trapSense: 1,       // nothing in the room can touch it while it is mist, so nothing in it matters
    // A dead thing does not catch an ordinary flame, does not lose its head to a scream (`daze`
    // freezing it mid-manifest was a workaround for not having this at all), and BY THE COLLAR
    // already had nothing to close on. Witchfire still burns it, that is a Seer's doing, not a
    // hearth's. Toggled from the ENEMIES tab; `Enemy.ignite` / `daze` / `Goat.tryGrab` read it live.
    immune: { fire: true, stun: true, grab: true },
    // Hiding. A wraith can lie in the room as something else, a box, a bowl of milk, before you
    // have ever seen it. `start` is the chance it begins that way, `again` the chance it goes back to
    // it after a blow once the goat is `minDist` tiles off. Headbutting or reaching for anything
    // within `springR` tiles of it, or stepping within `touchR` of it, and it is on you at once from
    // whatever side you are on: `springWind` of windup and the swing. 0.3 until 30 Sep 2026 ("a bit
    // longer windup when it comes out of a thing, so you can still react"): now a touch over its own.
    // `door` (6 Oct 2026 playtest: "the ghost can be a door too, surprise, rarely"): on a floor with a wraith,
    // once the first hidden one has been met (`hideTaught`), that share of floors puts one in a plank door
    // into or out of its room instead (`Game.stageDoorMimic`); now and then, while he is within `doorTell`
    // tiles, the planks breathe (every `doorBreath` s or so), the one tell.
    hide: { start: 0.4, again: 0.35, minDist: 5, springR: 2.6, touchR: 0.9, springWind: 0.58, milk: 0.4, door: 0.2, doorTell: 6, doorBreath: 3.5 },
  },
  // The Butcher (1.66): the big one, and he wears the rat ogre's body a size up (`scale`). He used
  // to be a man with a cleaver and a charge; the charge went to the butcher (a hook since 30 Sep
  // 2026), and what he does now is come down on you. Seen `leap.min`..`leap.max` tiles off, he crouches (`wind`) with the spot he
  // will land on drawn on the floor, where you stood when he crouched, goes up `lift` px for
  // `air` s, over men and holes alike, and lands: everything inside `radius` tiles is hit. Close in
  // (`slam.near`) he has no swing at all, only the fists on the floor: a ring round him, every side
  // at once, which the old butcher used to own. Both end on a long getting-up (`leap.land`,
  // `slam.recover`) and that is the whole fight: read the ring, step out of it, and put your horns
  // into him while he is still on his knees. His own men inside a ring are left standing: the ring
  // is for the goat. And nothing throws him, not the horns, not a body, not a blast (`Enemy.fling`):
  // the butcher goes flying, the ogre does not, and that is the difference you read across the room.
  butcher: {
    // `scale` 1: he is only ever a boss, and `boss.scale` (1.14) is what brings him up to the size he
    // had at 1.15 before the one rule (1.72).
    radius: 22, speed: 0.55 * CULT_PACE, sight: 9, cone: Math.PI * 0.7, scale: 1,
    // Four hearts, and the bare horns take none of them (25 Sep 2026): a headbutt only rocks him
    // (`stagger`, never in a crouch or a slam). What costs him a heart is the room, a blade, fire
    // off the bowls, a bomb, a body thrown at killing speed, which is why his arena always stands
    // braziers and swords (`OGRE_ARENA_TEMPLATE`). `reach` is only what the dev tools and a decoy read.
    hp: 4, reach: 1.35 * TILE, damage: 1, stun: 1.5, stagger: 0.4, hornsHurt: false,
    // A butt on him throws the goat back off him at `speed` and leaves him seeing stars `daze` s, no
    // heart lost (3 Oct 2026 playtest: "so you see at a glance it does not work on him").
    // `daze` 0.35 → 0.9 (5 Oct 2026 playtest): a longer daze so the butt reads as a mistake, not a bounce.
    rebound: { speed: 14 * TILE, daze: 0.9 },
    // How long he reels when the room rocks him without throwing him (never out of a leap): a blast, a
    // door broken onto him, a crate or a shield thrown at him, a sliding table, a body short of killing
    // speed. Literals at each site until 2 Oct 2026.
    rocked: { blast: 0.4, door: 0.35, crate: 0.45, shield: 0.5, table: 0.3, body: 0.3 },
    // `dist`: the longest leap; `short` tiles short of the goat he aims (0: on him); `over`: he goes
    // over a drop, but never lands in one. `cd` s on the floor between leaps, so he also walks.
    // 25 Sep 2026: the crouch and the flight a tenth slower (0.62 each), so the spot can be left.
    leap: { min: 2.6, max: 7, dist: 7, short: 0, over: true, minHop: 1.5, wind: 0.68, air: 0.68, land: 1.0,
      // The cross of witchfire his landing used to leave (24 Sep 2026) was taken out the next day,
      // soul or no soul: a floor that burns wherever he lands was "a cheat" on top of the ring.
      radius: 1.6, damage: 1, knock: 1.4 * TILE, lift: 46, cd: 2.2 },
    // The fists a tenth slower to come down (0.72), and longer on his knees after (0.95): the
    // window a blade or a shove into the coals is put through.
    // `answer`: got up from a stagger with the goat inside `answerReach` × `near`, he slams at once,
    // on that share of the ordinary crouch.
    slam: { near: 1.5, range: 1.9, wind: 0.8, recover: 1.3, damage: 1, knock: 1.3 * TILE, answer: 0.6, answerReach: 1.3 },
    burnTick: 1.0, burnHearts: 1,   // he comes out of a fire scorched and one heart down, not dead
    // Alight he does not run from it, he comes at you: `speed` times his stride, and every windup,
    // swing and recovery runs at `tempo` times the clock.
    rage: { speed: 1.8, tempo: 2.4 },   // 6 Oct 2026 playtest: "alight he is angrier and attacks much faster"
    // He still catches and still bleeds hearts for it, what he does not do is lose the room to it.
    // Fire that takes his head along with his hide read as the flame doing the fight's own work.
    immune: { blunder: true },
  },
  // The rat ogre: what the mouse in the wall turns into on the third blow. He is not on the curve,
  // nobody meets him who did not go and make him, and he is built to be dear rather than to be
  // beaten: the horns do nothing to him standing, he is never flung, no wall ever kills him, he
  // does not catch, and a scream only breaks the swing he was winding up. What hurts him is a hit
  // landed while he is DOWN (a crate or a shield in the face floors him, that is the window), a
  // blade thrown or carried, a bullet, a body thrown into him at killing speed, the wheel, and the
  // bomb. `hp` six of those. `stagger` is the beat he takes a hit standing; `emerge` the beat he
  // spends coming out of the hole. He walks round the wheel and the grating every time (`trapSense`
  // 1) and never blunders in fire because he is never in fire. He also swings at the cult, whoever
  // is nearest him and in his sight, the goat or a man, so the way to spend him is to walk him
  // into a room that is already full.
  ratogre: {
    radius: 22, speed: 0.78 * CULT_PACE, sight: 14, cone: Math.PI * 2,
    hp: 6, reach: 1.4 * TILE, windup: 0.72, swing: 0.18, recover: 0.5, arc: Math.PI * 0.6, damage: 1, knock: 1.5 * TILE,
    stagger: 0.35, emerge: 0.7, trapSense: 1,
    // What his coming out of the wall does to the picture (`Shop.spawnOgre`), and how hard the goat
    // bounces off him standing (`bounce` tiles/s back along the blow).
    emergeFx: { hitstop: 0.08, slow: 0.35, zoom: 1.6 }, bounce: 4,
    immune: { fire: true, witch: true, stun: true, grab: true, blunder: true },
    // A man off his arm is hurt as well as thrown: a heart off him, and he goes across the room as a
    // thrown body at `flingSpeed`, whoever he lands on goes down with him, and a man with nothing
    // left in him who lands on nothing dies where he stops.
    flingSpeed: 14 * TILE,
    // He does not walk, he bounds: `dist` tiles a leap, a crouch of `wind` you can read, `air` seconds
    // off the ground and `land` of getting up again. Where he comes down, everything inside `radius`
    // tiles is hit the way his arm hits, the goat for `damage` and thrown out by `knock`, a man hurt
    // and flung. The spot is drawn on the floor from the moment he crouches.
    // `minHop`: a leap shorter than this (tiles) toward his prey counts as pinned, and he bounds
    // sideways round whatever pinned him instead (`Enemy.hopSpot`).
    hop: { dist: 3, wind: 0.34, air: 0.42, land: 0.36, radius: 1.35, damage: 1, knock: 1.4 * TILE, lift: 26, minHop: 1 },
  },
  // What a man makes of the room he is running through. Trap sense is rolled per man, so one of them
  // in a crowd reads the Mill wrong and rides it into a wall while the rest step round.
  // `turn`: a walking man turns wider than `angle` rad at most `perSec` times a second
  // (`Enemy.limitTurn`); after `fresh` s of not walking the next way he sets off is free.
  ai: { senseMin: 0.5, senseMax: 0.95, blindFor: 0.9, rollGap: 0.7,
    turn: { perSec: 3, angle: 0.6, fresh: 0.25 },
    leash: 3.5,        // tiles an idle man drifts from where he was put before he is walked home
    millLead: 0.6,     // s of arm sweep he looks ahead before deciding a spot is taken
    millClear: 15,     // px of berth he wants round the arms: stepping to the very edge is not enough
    trapLook: 30,      // px past his own radius he checks for a wheel or a brazier (flame he reads later)
    feel: 5,           // px past the two bodies where being walked into counts as being seen
    wake: 0.5,         // tiles past the edge of the screen a man has to come before he starts to live
    wanderSpeed: 0.28, // fraction of his own speed a man not yet aware of you moves at, idling
    wanderClear: 1.4,  // tiles ahead an idle turn is checked for wall before he commits to facing it
    millNotice: 0.35,  // s the Mill lesson's two men plant and face you before either one moves
    // The careless one's run at the arm (`Enemy.runAtWheel`): at `depth` of the arm's length out from
    // the hub, where the sweep is surest, and given up after `give` s if the arm somehow missed him.
    millRun: { depth: 0.7, give: 6, watch: 4 },   // `watch`: s the careful one waits on that run
    noticeNear: 3,     // tiles: spotted this close, there is no doubt, and he closes at once
    noticeFar: 12,      // tiles: spotted this far or further, the doubt is at its longest
    noticeMin: 0.35,   // s of doubt at noticeNear
    noticeMax: 1.3,     // s of doubt at noticeFar and beyond
    chaseNoise: 3,     // chance a second of noise off a man in full pursuit, the herd is not quiet
    ownNoise: 1,       // tiles: a cult noise this close to a man is his own shout or swing, and he never goes to see it
    routeNoise: 3,     // tiles: a noise this near the goat is investigated down the route, not in a straight line
    // s: a man walking to a noise who covers less than `path.stuckMove` tiles in this long is pinned (a
    // boulder or a crate in his straight line, which `los` does not see; 5 Oct 2026, a clubman pressed into
    // a cave rock for good): near the goat he takes the route once, otherwise he gives the noise up there.
    investStuck: 2.5,
    roundOut: 0.45,    // how much a man stepping round a brazier also leans out of its heat, of his own heading
    // The route (`Enemy.pathDir`). The flow field is tile to tile and knows nothing about a body's
    // width or the furniture: he walks it `ahead` tiles forward and heads for the furthest point of it
    // a body `bodyMul` of his own width reaches in a straight line, and looks again every `every` s
    // or when he is within `reach` tiles of it. `stuckCheck` s with less than `stuckMove` tiles of
    // ground covered and he is pinned: he steps off along the most open heading for `unstick` s.
    // `wideR` px and wider, a body walks the second field, the one with no one-tile gaps in it.
    // `squeeze` is the most of a body the stone ever pushes on: the ogre and the rat ogre are wider
    // than a tile, and a way out narrowed to one (every soul gate's, a seal's) held them at its mouth
    // pressing into the corner while the goat stood a step past it (playtest, 25 Sep 2026). They
    // squeeze through it now; men, the goat and the furniture still meet them at their full width.
    path: { ahead: 7, bodyMul: 0.9, every: 0.22, reach: 0.45, stuckCheck: 0.5, stuckMove: 0.3, unstick: 0.45, wideR: 17, squeeze: 15 } },
  physics: {
    splatSpeed: 11 * TILE,
    flungDrag: 3.5,
    flungFloorSpeed: 3.5 * TILE,
    knockHitSpeed: 7 * TILE,
    // A body arriving on another body this fast kills it, the way a wall does. Two men standing
    // together used to be the safest place in the room, the first one bowled the second over and
    // both got up, which read as the game saying that men are not part of the geometry. They are.
    bodyKillSpeed: 10 * TILE,
    // The man off the horns dies with the one he lands on only above this. It used to be
    // `splatSpeed`, a tile a second over `bodyKillSpeed`, so nearly every body-on-body headbutt was
    // two deaths and the bare head bought a double kill (23 Sep 2026 answers: one death, not two).
    // Over the bare headbutt's own impulse on purpose: LONG HORNS and a run-up can still reach it.
    bodyBothSpeed: 32 * TILE,
    // A man thrown out of the mouth (BY THE COLLAR) dies on a wall, or kills a man he lands on, only
    // arriving faster than this. It was any touch at all, glancing included, which made the throw a
    // surer kill than the headbutt it was meant to sit behind. Out of the mouth at
    // `grab.throwImpulse × manThrow` (19 tiles a second) and slowing `flungDrag` tiles a second for
    // every tile flown, this is lethal out to about three tiles; the bare headbutt against
    // `splatSpeed` is lethal to nearly five. Bombs, blasts and the rat ogre throw bodies too, and
    // they keep killing on any touch: this is the mouth's number only (`Enemy.fromMouth`).
    thrownKill: 8 * TILE,
  },
  fire: {
    // `burn` and `pool` half again as long (2 Oct 2026 playtest: "fire on the floor should hold, it goes too fast").
    spread: 0.48, burn: 4.5, pool: 6.5, burnRunTime: 2.0, burnRunSpeed: 6 * TILE * SLOW,   // spread was 0.4; a burning tile catching its neighbour that fast read as too eager
    witch: 4.8,        // the Seer's fire: colder to look at, and no coat turns it away
    avoidLook: 18,     // px past his own radius a man checks before walking into flame
    // Hay (or grass) about to catch from the tile beside it (`Renderer.drawCatching`): up to
    // `embers` cells of `cell` px wake in it as the neighbour's spread fills, rising `rise` px and
    // looping `flicker` times a second, never dimmer than `glow`; under them a smouldering band of
    // cells along the foot of the tile, up to `base` alpha. A playtest death went from three
    // hearts to none down a hay line nobody could see was about to go.
    catch: { embers: 10, cell: 3, rise: 26, flicker: 1.2, glow: 0.8, base: 1 },
  },
  // Three things can be wrong with a man at once, poisoned, stunned (the stars: `daze`), alight,
  // and where two of them meet they react. Every number of it is here, and the STATUS tab of the
  // tool draws and edits this block as it stands. `js/status.js` is the only code that reads it.
  status: {
    // A man poisoned or dazed dies against stone at this share of the usual speed (`Enemy.weakMul`).
    weak: 0.7,
    // Poison blinds and slows. Blind is the ranged half of him gone: no rifle, no rune. Slow is his
    // stride (`moveMul`) and his own clock (`tempo`: windup, swing, recovery, reload all run at it).
    // `time` 4.5 until 25 Sep 2026 ("poison lasts less").
    // A man poisoned reads the floor worse (6 Oct 2026 playtest, "poisoned enemies walk into traps and
    // drops more often"): his trap sense is × `trapMul` and his roll comes round every `trapGap` s instead of
    // `ai.rollGap`, aware of the goat or not, and a drop, which nobody blunders into sober, he misreads at
    // `pitSense` (`Enemy.avoidHazard`).
    poison: { time: 3, moveMul: 0.55, tempo: 0.6, pool: 5.0, trapMul: 0.35, trapGap: 0.9, pitSense: 0.6 },
    // POISON meets FIRE: it goes off. `hitR` tiles is a hit on everybody inside it (a heart off a
    // big man, the end of an ordinary one); out to `radius` it only throws, and the wall finishes it.
    // `hits` is what it costs whoever is inside: two hearts, and then nothing more from it for `guard`
    // s. A puddle goes off a tile a step, and a big one under the ogre took his four hearts in a
    // fifteenth of a second (playtest, 25 Sep 2026); now the whole chain is the two.
    blast: { radius: 2.2, hitR: 1.1, impulse: 11 * TILE, goatPush: 300, hits: 2, guard: 2 },
    // POISON meets STUN: SHOCK. No hit, it used to be one, and a poisoned crate in the face killed
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
    // VENOM JAW's throw poisons the floor under its flight, a `half` puddle where it stops, and
    // whoever it passes within `touch` px of (their radii and its own aside), once each a throw.
    jaw: { half: 1, touch: 4 },
    tumble: { half: 1 },
    // Where the glob bursts it poisons its own tile and `tiles - 1` of the eight round it, picked at
    // random (30 Sep 2026: six, "the point it hit and five random ones by it", it was three by three).
    spit: { speed: 12 * TILE, range: 7.5, tiles: 6 },
    // FIREBRAND (it was CHARGED, a bomb where the throw stopped, until 1.65): the floor it has
    // flown over burns for `burn` s, a straight line and nothing else, not where it lands, not
    // who it hits. Nothing within `gap` tiles of the mouth it left, so the goat is not standing in it.
    // Men read burning floor as a hazard and walk round it, which is the other half of what it is for.
    brand: { burn: 3.0, gap: 1 },
  },
  prop: {
    // A door is the one thing in a corridor that can hold you still, and holding you still in a
    // corridor is worth more than the shortcut was: three blows, and the first two only splinter it.
    // Two kinds. A plank door in a corridor is one blow and gone, it is a thing to run through,
    // not a wall to stand at. Iron is the other answer: it takes `ironHits` and it is never on the
    // way out of a room, only on the way into somewhere you did not have to go.
    // Three kinds of door and three prices. Planks go on the first blow, a door in a corridor is a
    // thing you run through, not a wall you stand at. Iron does not go, and that is the whole of its
    // value: it cannot be shouldered open by anybody, so the only way past is three blows and the
    // noise of three blows, with whatever heard the first already coming. The soul door, the vault's,
    // the one with a tome behind it, is four, because it is the only door in a level that is not on
    // the way anywhere: you go to it on purpose or you never see what is in it.
    // `stairHits` is the door at the top of every level. It is iron, so nobody opens it for you and
    // nothing shoulders it: the last thing you do on a level is stand still and break it, with
    // whatever is left of the level walking toward the noise.
    // `clockFor` is the fourth kind, and it is the only door in the game that is on your side to
    // begin with: a heavy iron one already swinging shut under its own weight, which stands OPEN
    // when you first see the room in front of it and is an ordinary three-blow slab once it seats.
    // Beat it and you paid nothing and it falls shut between you and whatever was chasing you; miss
    // it and you pay the three blows and the noise of them, standing still in the open, the price
    // every other iron door charges anyway. It is the one place in the world (rather than in the
    // score) that says *run, don't fight*, which is why the count matches `score.perRoom`: the door
    // becomes a wall at one room's par, so beating par is what buys the free way through.
    // It closes on a curve rather than evenly, `clockEase` under 1 holds it near-open for most of
    // the count and slams it at the end, which is the tell, since a door creeping shut at a steady
    // eight degrees a second is a door nobody notices is moving.
    // `r` is the door's own half-span across the gap it hangs in (see `collideEntities`'s rectangle
    // test), it has to cover close to the full two-tile opening or a diagonal run slips past a
    // corner. `thick` is what it is along the other axis: the slab itself is 13px in the painted
    // art, so a goat walking straight at its face used to be stopped a whole extra tile short of it
    // by a plain circle of radius `r` in every direction at once, the "why can't I get near the
    // door" gap.
    // `reachSlack`: extra px a headbutt reaches for a door beyond what it reaches for anything else.
    // A door hung flush in a wall (the vault's, the stairs') holds the goat's nose exactly at the
    // bare reach, so the blow landed or missed on float rounding.
    // `clockReach`: the longest walk, in tiles, from a room's way in to its clock door. Flat out the goat
    // covers about 43 tiles before the door blocks; the Great Hall's was 45–65, a race nobody could win.
    door: { r: 29, thick: 16, reachSlack: 12, openPressure: 0.9, smashSpeed: 6 * TILE, hits: 1, ironHits: 3, vaultHits: 4, stairHits: 3,
      clockFor: 12, clockEase: 0.5, clockReach: 30 },
    // `squeeze`: px either side of a goat's width that the floor between a table and a brazier may
    // not be, narrower they are one lump, wider it is a way through that never brushes the coals;
    // in between is the squeeze past the fire the generator refuses (`tableSqueeze`).
    // `flip` (29 Sep 2026: "after a blow a table can go over and become almost impassable, blocking
    // the way"): a table sent sliding goes over onto its side when it stops, `chance` of the time, and
    // always when it meets stone faster than `wall`. On its side it is `r` wide, will not be
    // shouldered or sent sliding again, and takes `hits` headbutts to
    // break into planks, never a wall for good, so no floor can be shut by one.
    // The rope's cleat on the far wall (`kind: 'cleat'`): a headbutt within reach of it, a body or a
    // thrown thing arriving at it faster than `hit`, or `burn` s of flame on its tile cuts the rope.
    cleat: { r: 9, hit: 3 * TILE, burn: 0.5 },
    // A suit of armour hung on the far wall over a halberd (30 Sep 2026, Enter the Gungeon's:
    // "armour by some walls, a guy lands next to them or into them, they fly apart"; the same day:
    // "more attached to the wall, a decoration"). It is on the stone, so it blocks nobody, and it
    // kills nobody (pillar 3): any flung body that flies into it or lands within `near` px past
    // touching it, a barrel, crate or blade arriving faster than
    // `hit`, or a blast sends the pieces off the wall (js/scatter.js; `pieces`: id, how high over the
    // floor it hung and how far off the middle, px; each leaves the wall at `out` px/s on top of the
    // blow) and the body flies on at `slow` of its speed; the halberds and the bare plate are left.
    // Placed (gen.js `dressWall`, its own RNG) on `chance` of the rooms that may take one, from room
    // `from`, never more than `perLevel` a floor outside THE ARMORY, which hangs up to `armory` of
    // them along its far wall. `foot`: px its lowest texel hangs over the foot of the wall's face.
    // `texel`: world px a pixel of its sprite.
    // `halberds`: how many hang behind it (5 Oct 2026: one, since a grab beside it takes it down as a
    // weapon, `Goat.tryGrab`; the crossed pair drew two blades and handed out two).
    armor: { r: 10, foot: 2, chance: 0.25, perLevel: 2, armory: 3, from: 1, halberds: 1, hit: 4 * TILE, near: 12, slow: 0.75, texel: 1.35, out: 70,
      pieces: [['helm', 28, 0], ['pauldron', 21, -8], ['pauldron', 21, 8], ['plate', 13, 0]] },
    // The suit that stands on the floor (1 Oct 2026: "standing armour on a stand, the kind that stands"): the
    // same iron on a wooden stand, with a halberd at its side, out in a room and not on its wall. It is
    // furniture, a post of `r` px, blocking, not a light one, until a headbutt, a flung body arriving by
    // it (`armor.near`, `armor.hit`) or a blast brings it down (`Prop.burstArmor`): the pieces go off it
    // the way the blow went, and the bare stand and its halberd are left, out of anybody's way. It kills
    // nobody (pillar 3). THE ARMORY stands `armory` of them; elsewhere `chance` of the rooms that may
    // take one, from room `from`, at most `perLevel` a floor, on plain floor all round (`rockFits`).
    // `pieces`: id, how high over the floor it stood and how far off the middle, px. `texel`: world px a pixel.
    suit: { r: 11, texel: 1.35, armory: 2, chance: 0.16, perLevel: 1, from: 2,
      pieces: [['helm', 40, 0], ['pauldron', 32, -9], ['pauldron', 32, 9], ['plate', 22, 0]] },
    // A stag's head on the far wall (30 Sep 2026: "throw a guy into the antlers and he sticks, even if
    // he did not have the force to die"). A flung body moving at the wall faster than `hit` (well under
    // what the stone kills at) that meets it within `hitR` px of the head is caught on the tines: a
    // one-heart man dies there and hangs on the wall; a two-hit kind loses a heart and is pinned `time`
    // s (× `enemySlow`), then tears free and staggers `free` s. One body and it is spent. Drawn
    // `lift` world px up the wall; blood runs `drip` px a second down the face below it. `chance` of
    // the rooms that may take one, from room `from`, at most `perLevel` a floor. The goat never sticks.
    // `chance` 0.4 since 5 Oct 2026 (was 0.25, tried only where the armour's roll missed): "I never see a
    // stag's head any more"; a head on 40% of the floors that may hang one became about two in three.
    trophy: { r: 8, chance: 0.4, perLevel: 2, from: 1, hit: 4 * TILE, hitR: 13, reach: 5, time: 2.6, free: 0.5,
      lift: 20, texel: 1.4, drip: 9 },
    // The cult's paper (6 Oct 2026: "art objects you find once and destroy, they are bad"; the same day, his
    // redesign: "a little scrap of paper on the floor; found, it unfolds into a drawing; butt it and tear it up;
    // it goes in the finds and you never find it on the map again; the first under the big table in the first
    // room"). Two drawings, the goat-breeds chart and the butcher's diagram (`looks`). A scrap lies folded on the
    // floor (gen.js, its own stream; `underTable` of them under one of the room's tables), at most `perLevel` a
    // floor, `chance` of the rooms that may take one, from room `from`; the first (`first`) under THE ALTAR's
    // ritual table. Within `readR` tiles of him with nothing standing on it, it opens out over `unfold` s and is
    // found for good (`Unlocks` OBJECTS; `Game.layScraps` lays only drawings not yet found). A headbutt, a body
    // landing within `near` px or a blast tears it (`Prop.tear`), open only; it hurts nobody. `texel` world px a
    // texel of the scrap and the shreds, × `flat` for the drawing; `bits` paper flying.
    poster: { r: 8, chance: 0.5, perLevel: 1, from: 1, near: 12, bits: 9, texel: 1.35, flat: 0.9, readR: 2, unfold: 0.45,
      underTable: 0.5, first: 'breeds', looks: ['breeds', 'cuts'] },
    table: { r: 21, drag: 4.5, killSpeed: 5 * TILE, pushSpeed: 2.2 * TILE, squeeze: 8,
      // `push`: px/s a table on its side creeps off the goat leaning on it, and so the pace he is held
      // to while he does (30 Sep 2026: "when the table is flipped and I walk into it, I can move it,
      // very slowly"). About 30% of his walk, half an upright table's `pushSpeed`. Men never push it.
      flip: { chance: 0.5, wall: 3 * TILE, r: 26, hits: 3, push: 1.2 * TILE } },
    // A lamp post is not a pillar: a body arriving at `knock` goes through it and it goes over,
    // and it pours its oil where the body is about to land.
    lamp: { r: 9, poolRadius: 1.2, knock: 4 * TILE },
    // The brazier is a thing you can use without a man in it. A headbutt knocks a spill of coals
    // out of the far side of it, `spillAt` tiles beyond the bowl, `spill` tiles across, alight for
    // `spillTime`, and the bowl needs `spillCd` to build the heat back. Short, so it is a line you
    // draw across a doorway for a beat, not a fire you keep pressing for.
    // `roast` is the chance each brazier is a campfire with a crocodile turning on a spit over it
    // instead of a bowl, capped at one a level: at 0.02 about one level in four has one, so it is a
    // thing you come across rather than furniture. Nothing but the drawing changes: it lights,
    // spills and burns exactly as a bowl of coals does (its circle is `roastR`, the ring's own size). Picked off the tile, not the generator's rng.
    // The bowl burns the goat only when he walks into it: his push (or a knock that carries him) has
    // to point at it at least `into` (the cosine), from no further than `touch` px past the two rims.
    // Brushing past one, shouldering by it in a doorway, it used to burn him every time it touched.
    brazier: { r: 13, roastR: 9, spillAt: 1.1, spill: 1.05, spillTime: 1.7, spillCd: 3.0, roast: 0.02, roastTurn: 0.8, roastThin: 0.45, into: 0.55, touch: 3 },
    // A patch of sprouted grass is not a lucky find. `every` is how many rooms a level may go
    // without offering one; the level's own `heals` is a floor under that, and the generator spaces
    // them rather than scattering them, so a run never opens six doors in a row on nothing.
    // It is grazed, not grabbed: `grazeTime` is how long the goat has to stand in it, near enough
    // and slow enough (under `grazeSpeed`), before it pays out, so running through on the way past
    // does nothing, the whole point is that it costs a beat of standing still in the open.
    // `gapMax` is a hard cap rather than an average, and only bites from level 4 on: the forced
    // rooms a late level carries, two or three arenas, the mill, the vault, a killbox, crowd
    // together and can push a band's nearest eligible room well past what `every` promises on
    // its own, so a run into the back half of the game could go six or seven rooms on nothing.
    // `bigGain` is the hearts in the big grass a secret wall gives up (`big: true`); milk is one.
    // `firstClear`: THE ALTAR's first grass (`levelDef.firstGrass`) lies in a corridor with nothing else this many tiles round it.
    heal: { r: 12, pickupR: 22, every: 4.5, gapMax: 4, grazeTime: 1.4, grazeSpeed: 30, bigGain: 2, firstClear: 2.4 },
    // The cave's stone teeth (`TUNING.cave.spikes` is where and how hard). Not blocking, a thing
    // you cannot walk into cannot hurt you, and the whole point of it is that it does, so it is
    // floor to the flow field and a hazard to anything with eyes. `r` is what a body has to touch;
    // it is deliberately under a half tile, because a wall's foot is a thin place to stand.
    spire: { r: 11 },
    // The gong. It was noise and nothing else, which made it the one thing in a room you could not
    // read. Now it pays: a stretch of speed and quick hands, bought by telling the whole floor where
    // you are. In an empty room that is a terrible trade. In a full one it is the best one you get.
    // `buff` 8 → 12 s on 1 Oct 2026 (playtest: "the gong a little longer").
    bell: { r: 14, buff: 12, speedMul: 1.5, cooldownMul: 1.5 },
    // The crate, and the only thing in the game you pick up off the floor and throw. There used to
    // be a pot as well, drawn as a circle, and a circle on a floor of squares reads as a plate or a
    // puddle rather than as a thing to lift: every one of them is a crate now. Small, a box you can
    // carry in your teeth is not a crate a man packs, and plain, because everything it has to say
    // is *pick me up*. A thrown one does not trip a man, it takes his legs and his head with them,
    // and he lies there seeing stars long enough that you can do something about him.
    // And what a box of dry boards does when it is thrown into a fire: it goes up. Wider than the
    // flame that lit it and burning longer, so a brazier plus a crate is a room you have closed.
    // `burstTime`: how long the one tile a burning crate leaves behind burns (it lit 2.1 tiles round
    // until 25 Sep 2026; now a thrown crate catches going through fire and breaks into one tile).
    // Alight, it lays the FIREBRAND line behind it as it flies (`Status.brandTrail`).
    crate: { r: 10, stun: 2.8, burstTime: 6.5 },
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
    // picks its baked frames and must not be animated). `draw` is its width in world px (the Enter the
    // Gungeon sprite of 1.79, js/prop-pixels.js, which on its side turns a frame for every eighth of its
    // girth it rolls). Rolling, it knocks on the stone once every `staveEvery` × `spinEvery` tiles
    // (`sfxStave`). A Butcher it meets staggers `stagger` s
    // and it comes back off him at `rebound` of its speed; `side` is how far to his own side a bowled
    // man goes, against the barrel's line.
    // `burst` came down from 2.6 (26 Sep 2026: "a little smaller blast radius").
    // What a barrel broken without going up leaves (30 Sep 2026: "the powder barrel spilt leaves powder
    // on four tiles by it, which can catch and blow up later"): `tiles` tiles of powder, its own and
    // the ones round it (`Game.spillPowder`). Fire on one, or a man alight on it, lights it; `fuse` s
    // later it blows inside `r` tiles, a man there dies ('splat'), the goat loses `damage`, lights
    // its tile, and lights the next powder tile over, which goes `chain` s after.
    // How much a room may hold that goes off (30 Sep 2026: "this room has too much stuff, a chandelier,
    // powder, braziers, cap the active things in a room, or push them into the corners, fire most of
    // all"): `max` things that burn or blow, brazier, lamp, barrel, chandelier, bomb, counting what
    // the template stood; a barrel or a chandelier is only added under it (`activeIn`, gen.js), and a
    // barrel stands in the band `edge` tiles in from a wall, never mid-floor. `GEN_RULES.clutter`.
    clutter: { max: 4, edge: 2 },
    powder: { tiles: 4, fuse: 0.45, chain: 0.14, r: 1.1, damage: 1, grains: 30, cell: 3 },
    barrel: { r: 12, roll: 16 * TILE, drag: 0.55, fling: 1.35, keep: 0.8, knockSpeed: 3 * TILE,
      // `chain`: the fuse a blast lights it with (`Prop.blastRoom`), short, so a row goes up one by one.
      // `wallStep`: how far in front of a thing on a wall (a cracked wall, a cleat) the blast's line is asked to, in tiles.
      wallStep: 0.6,
      breakSpeed: 6 * TILE, stopSpeed: 0.6 * TILE, knock: 5 * TILE, pass: 0.8, daze: 1.8, fuse: 1.6, chain: 0.35, burst: 2.1,
      burstTime: 7, fuseDraw: 8, spinEvery: 0.55, staveEvery: 2, draw: 26, stagger: 0.3, rebound: 0.2, side: 0.35,
      // A barrel of poison (30 Sep 2026): `chance` of the barrels a room stands is one, off the same
      // stream. No oil: fire does not light it. Broken, it spills `tiles` tiles of poison where it
      // stood (its own and the rest of the eight round it at random, `Status.spatter`) instead of
      // powder, and a puddle, as ever, goes off when a flame finds it.
      venom: { chance: 0.3, tiles: 6 } },
    // A rare find rather than a tool: grabbed and thrown exactly like a crate, but armed the moment
    // it leaves the goat's mouth (`Prop.fling`) rather than breaking on the first thing it hits, so
    // it comes to rest wherever it lands and counts down from there. `nearR` is the two-heart
    // half, the goat pays the same falloff his own blast does, `TUNING.goat.bomb`, everything out
    // to `blastR` is the one-heart ring, and anyone that far out who is not killed outright is flung
    // rather than hurt directly, same as a headbutted man's own charge.
    // `chance` used to be rolled against a secret niche, which meant the rare find that could hurt
    // a room most sat tucked behind a wall with nothing but the goat standing near it when it went
    // off. It is placed on its own now, in whichever ordinary room of the level scores the most
    // threat, so the one bomb a level carries lands where a room is actually worth throwing it into.
    // A boulder on the cave floor (level eight). Not a thing you lift: it stands where it fell,
    // stops a body, a bullet and a thrown crate like a wall does, and a man knocked into it at
    // killing speed dies on it the way he dies on stone. Unlike stone it gives, `hits` blows and it
    // is rubble, so a boulder between you and a room is a choice rather than a detour you have to
    // take. It is never in the way of the only way through: the generator only sets one down on
    // open floor with a clear tile all round it (`GEN_RULES.rocks`).
    rock: { r: 14, hits: 2 },
    // `ring`: the lit fuse drawn as the blast's own reach on the floor (`Renderer.drawBombFuse`), a
    // yellow rim closing round from the top that is a whole circle the moment it goes off (playtest,
    // 25 Sep 2026: "it explodes when the circle is complete"). `cell` is its grid in world px, `track`
    // the alpha of the unburnt part, `rim` of the burnt, `blink` how fast the shut ring flickers.
    // `fuse` was 1.6 (26 Sep 2026: "a little more time on the fuse when you pick it up").
    // `chain`: the fuse another blast lights it with, lying there (`Prop.blastRoom`).
    bomb: { r: 11, fuse: 2.1, chain: 0.3, blastR: 1.5 * TILE, nearR: 0.56 * TILE, dmgNear: 2, dmgFar: 1, impulse: 20 * TILE, chance: 0.45,
      ring: { cell: 2, track: 0.16, rim: 0.9, blink: 30 },
      // It goes off on what it hits, not only on the fuse (30 Sep 2026: "the bomb will also explode not
      // only on the timer but when it hits an object"): a lit bomb flying at `hit.speed` or more that
      // meets stone (the part of it going into the wall), a man or a solid prop blows there. Slower, it
      // stops dead and counts down as before. `hit.arm` s out of the mouth it only stops: a throw
      // point-blank into a wall must not go off in the goat's own face (the blast is 1.5 tiles).
      hit: { speed: 6 * TILE, arm: 0.06 } },
    // A stand of arms. Grab what is in it, carry it, let go to throw it. The sword goes through
    // the first man it finds; the shield knocks a row of them flat and turns bullets while carried.
    weapon: {
      r: 11, standR: 13, throwMul: 1.35, drag: 1.4, restSpeed: 3 * TILE,
      stickImpact: 6 * TILE,  // a scrape along a wall does not end a throw; a proper hit does
      // How much of its speed a thrown shield keeps off a wall or a prop it did not stick in. A
      // sword snaps there; a shield rings off and keeps going, which is the whole of why it is worth
      // throwing at a room rather than at one man, it can still reach a second wall, or a second man.
      shieldBounce: 0.6,
      swordStun: 1.6,        // what a sword does to a Butcher, who does not go down to one
      shieldStun: 2.8,       // how long a man the shield bowls over stays down, dazed the same way a
                              // scream leaves him
      // What one is worth before it is scrap, so neither can be dragged through a level. A blade is
      // one throw: it goes into whatever it finds and snaps there. A shield came down to two men or
      // two bullets, three read as a thing you carried through half a level rather than a thing
      // spent on a room.
      // A sword is two now as well: two men, or a man and a wall. It cuts whoever the blade touches
      // while it is still in his teeth (`cutGap` seconds between two cuts), so it is the strongest
      // thing in a room and `swordShare` is what keeps it rare, the share of a random stand that
      // is a blade rather than a shield.
      // Back to one (24 Sep 2026: "the sword's base durability is 1"): two cuts from a blade that
      // also cuts in the teeth made it the room's answer rather than a spend. The shield keeps two.
      uses: { sword: 1, shield: 2, halberd: 1 }, cutGap: 0.35, swordShare: 0.3,
      // The shield is drawn this much bigger than it was, on the rack and in the mouth alike.
      shieldScale: 1.45,
      // What a carried shield covers. It was a circle the size of the shield itself, which meant
      // almost everything aimed at the goat went past the edge of it and hit him anyway, a shield
      // that does not stop the shot is a shield that reads as broken. It is an arc across his front
      // now: anything arriving inside `coverArc` of where he is pointing is turned, and every turn
      // spends a charge. `parry` is what the man who swung into it has to stand there and eat.
      // Grew with the picture of it: a bigger shield that covered the same arc read as a lie.
      // `parryPush` tiles/s is the shove back he gets with it (it was a bare 3 in `meleeHit`).
      coverR: 38, coverArc: 3.0, parry: 0.45, parryPush: 3,
      // A blade spent in a man who gets up from it stays in him (3 Oct 2026 playtest: "let it stick in
      // the big one, he walks about with it, and when he dies it breaks"): `Prop.stickIn`, drawn by
      // `Renderer.drawStuck` at `k` world px a texel, in his flank on the side it came from, the hilt out
      // past his edge (`out` of his height from his middle), its point `depth` texels inside it, at `lift`
      // of his height, turned with him, fanned up to `fan` rad (3 Oct 2026: down the middle of his chest it
      // read as a badge); `max` at once (another breaks the oldest out).
      // Dead, every one breaks into its pieces (`Scatter.breakUp`), and so does any blade or shield that
      // snaps (`Prop.snap`).
      // `fire` (5 Oct 2026, "a blade charged with fire that sticks in him keeps burning him"): a FIREBRAND
      // blade left in a man lights him again `gap` s after his fire goes out, for `for` s in all.
      stick: { k: 0.9, depth: 5, lift: 0.5, max: 3, fan: 0.35, out: 0.44, fire: { for: 6, gap: 0.8 } },
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
    // Spike floor, from THE ROAD (the fourth floor) on. The teeth come up where you have already been: crossing
    // a plate arms it and they follow a moment later, so the trap is the ground you just left. Men
    // read it the way they read the wheel, `lead` is how far ahead of the teeth `hazardAt` calls the
    // tile taken, and the man who fails his trap check is the one you can walk onto it.
    // The teeth. Not a thing standing in the room, a stretch of floor that is not floor: a grating
    // of iron slots the boards were laid over, and what comes up comes up through the gaps. They go
    // down in a patch rather than one at a time, because one grate is a curiosity and a stretch of
    // eight across the middle of a room is a piece of ground you have to decide about.
    // `armMan` is the beat when a man's foot sets it off (30 Sep 2026: "traps don't go off under the
    // enemies"): at `arm` he had always walked clear before the teeth came. Only a man already coming
    // for the goat trips one (`Prop.tripped`); a patrol knows where the boards are nailed down.
    // `restMan` (5 Oct 2026, the same note again): a grate the goat has just set off rests `rest` s,
    // and the man chasing him crossed the patch inside that rest every time, so it still never went off
    // under him. A man's foot wakes a resting grate once `restMan` s of the rest have gone; the goat
    // still waits out the whole rest, or he could stand on one and have it bite on every beat.
    spike: { r: 16, arm: 0.5, armMan: 0.1, up: 0.95, down: 0.4, rest: 1.7, restMan: 0.25, lead: 0.3, damage: 1,
      run: [9, 15],
      // A grate with something standing on it (30 Sep 2026: "sometimes a crate or a barrel stands on
      // the trap, hidden"; `gen.js`, `p.hidden`): it is not drawn while its cover stands on its tile.
      // `cover` is the chance a room's laid patch has a crate on one of its grates (a barrel instead at
      // `barrel`, where barrels are stocked and it fits); in THE ARMORY a grate may lie under any crate
      // (`armoryCrate`) or stand of arms (`armoryStand`), only on a floor that lays grates (`levelDef.spikes`), never more
      // than `armoryMax` in it, it has twelve stands, and a room of hidden teeth is a minefield, not a find.
      hidden: { cover: 0.35, barrel: 0.3, armoryCrate: 0.5, armoryStand: 0.2, armoryMax: 3 } },
    // A patch of wall that gives like the pen does: two blows rather than one so it never breaks by
    // accident, and nothing else about it, its size, what it blocks, what it hides, is its own.
    secret: { hits: 2 },
    // The coop: two tiles of slatted crate with a bird in it, standing about in the compound's
    // stores. One blow, two read as a second cage to break before the one ally in the game gets
    // to do anything, and the coop is not the lesson here, she is.
    coop: { r: 26, hits: 1 },
    // The horse's own coop (30 Sep 2026: "a bigger cage for the horse"): a stall `w` x `h` tiles of
    // heavy slats, a box and not a disc (`stallHalf`, gen.js), the horse stands in it at its full
    // size. `hits` blows open it, the second the one that frees it. It stands where its room stays
    // one piece round it (`stallKeepsRoomOpen`: against a wall, never across a lane), with `clear`
    // tiles of open floor before its front, where it is butted, and `mouth` tiles off the way in and
    // the way out. `pace` is how far the horse shifts about in it, in px, either way (drawn only).
    stall: { w: 3, h: 2, hits: 2, clear: 1, mouth: 2.5, pace: 10 },
    // The mouse: a trader in a three-tile hole in the wall of a level's middle gate room, on the
    // levels in `shop.levels`. Her language is the game's own, grab is take, a headbutt is rude, and
    // rudeness costs: `lines` are what she says on the first two blows, and the third is the rat
    // ogre; `thanks` is what she says when a talisman is taken and her gate lifts. `r` is small
    // because she is; she blocks nothing and nothing thrown breaks on her. `bob` is her idle.
    mouse: { r: 9, lines: ['PLEASE. NOT THAT.', 'ONCE MORE AND YOU WILL SEE.'], thanks: 'GO ON, THEN. THE DOOR IS OPEN.', squeakPitch: 1400,
      offer: 'THREE THINGS ON MY SHELF, AND NONE OF THEM COSTS. TAKE ONE. ONLY ONE.', free: 'HE IS DOWN. THE SHELF IS YOURS. ALL OF IT, AND BETTER THAN IT WAS.',
      lookUp: 0.34 },   // radians she leans back to look at a goat standing above her
    // A ware on her shelf: an artifact on a stool, one of two, taken for nothing. It is reached for the way
    // a crate is (`Goat.tryGrab`), and reaching for it is the whole of buying it.
    // `readR` is how close he has to be before what a ware does is written over it, the same
    // courtesy a hazard's tell already gets, and the one that matters here: nobody reads a HUD
    // tooltip while running, but a line hanging over the thing itself is read on the way past.
    ware: { r: 10, readR: 2.2 * TILE },
    // The bird. Loose, she trots after the goat at `followSpeed`, hanging back `followAt` tiles and
    // only closing when he gets further than `followFar`; she is a thing that walks with you, not a
    // thing stuck to your heel.
    //
    // A horn under her is the whole of the mechanic (`headbutt` in entities.js, a kick, not a
    // throw, so no new button and no arm in the mouth). She leaves at `launchSpeed`, picks the man
    // nearest the line she was kicked along inside `seekArc`, and from then on steers at `turn`
    // radians a second toward whoever she has. `seekRange` is how far she will look. She loses very
    // little speed in the air (`drag`) because a bird that is aimed and then peters out reads as a
    // dropped ball rather than as a shot.
    //
    // She kills what she reaches and comes apart doing it. A wall is not a man: she tumbles, lands,
    // and is loose again after `stunned` seconds, a miss costs you the walk back to her and the
    // setup, which is price enough for something you had to find and let out in the first place.
    chicken: {
      r: 11, followSpeed: 210 * SLOW, followAt: 1.6, followFar: 3.2, wander: 0.5,
      launchSpeed: 760, drag: 0.35, turn: 7.5, seekRange: 15, seekArc: Math.PI * 0.75,
      stunned: 0.9, life: 4.0,
      // She walks the same flow field the men chase on and steps round anything `hazardAt` calls a
      // hazard, looking `look` tiles ahead. A coop the goat walks past stays shut, and the clamp
      // walls it in with its room (25 Sep 2026; it used to break out after him). A hen still with
      // him, inside `saveR` tiles, when he reaches the stairs is worth `saveHearts` for the rest of
      // the run, once a level however many he brings.
      look: 1.5, detourFor: 0.5, saveR: 8, saveHearts: 1,
      // Tougher and warier (29 Sep 2026, "the hen takes more damage and is more careful"): `hp` blows
      // instead of `beast.hp`; she looks `look` further for fire and grates, and keeps out of reach
      // of any man, aware of him or not, from `shyMul` × `beast.shyR` away (`Beast.shy`).
      hp: 5, shyMul: 1.5, shyAll: true,
    },
    // ---- THE ESCORTS ----
    // Three animals built on the hen's frame and nothing else: found in the first third of a floor,
    // walked to the stairs, and worth something for the rest of the run if they get there
    // (`js/beasts.js`). None of them adds a key, every one is met with the four verbs the goat
    // already has, and the whole difficulty of each is that it does NOT simply follow you.
    //
    // The tortoise is slower than a walk and never catches up: the only ally you advance by picking
    // it up and throwing it forward, one room at a time. Where it lands it pulls in and is a shell
    // - solid, and rounds stop on it, so a thrown tortoise is also the cover you did not have.
    // `cool`: a shell that has taken a round or a blow is on its back for that long, no cover,
    // and nothing to pick up, before it rights itself. One block, then a wait (js/beasts.js).
    tortoise: { r: 13, speed: 42 * SLOW, followAt: 1.4, throwSpeed: 520, drag: 2.6, tuck: 4.0, cool: 6, guardR: 6,
      // What it is worth at the stairs (3 Oct 2026, "once a level it lets you wear armour, if you brought it";
      // it was a use on every shield): every floor after, he starts in iron that takes `saveArmour` blows
      // whole, the way a halo heart does, then comes off him in pieces (`Goat.damage`). `look`: plates painted
      // over his body and cut to his own sprite (`PaintedArt.armour`), `cell` world px a texel, `band` the rows
      // of him it covers, `head` the disc round his head it leaves bare, `seam` a dark row every so many.
      saveR: 8, saveArmour: 1,
      // `plate` x `seam` cells a plate, laid like bricks; `headFront` more bare round the head facing the
      // camera; `low` px lower the coat starts seen from the front or the back.
      armour: { cell: 34 / 112 * 3, band: [-22, -6], low: 8, wide: 12, head: 5, headFront: 2.5, seam: 4, plate: 9,
        dark: '#4a5059', mid: '#78808b', lit: '#a3abb5', rim: '#1c1f24', alpha: 0.95 } },
    // The goose does not follow, it leads: it runs down a field grown out of the stairs at its own
    // pace and does not wait for him, it stops only where something shut stands in its way. It honks at any man it can
    // see inside `seeR`, which is a noise, so the room turns and comes for the GOAT, and which also
    // breaks a blow a man has already committed to at any range at all (`balkStun`). A permanent
    // alarm you have to live with, and the one thing in the game that parries across a room. Nothing
    // in the cult ever goes for the goose: it is not a man and it is not the sacrifice.
    // `lead` is how many tiles of the way out it will get ahead of him before it stands and waits:
    // a goose that ran a room ahead raised that room and then stood at its shut door without him.
    // `speed` is above the goat's walk and `hurry` its multiple while he is ahead of it: a leader
    // slower than the goat it leads ended every level twenty-odd tiles behind him.
    // 30 Sep 2026 playtest: "the goose should run further ahead and call the enemies harder", `lead`
    // 6 → 10, `seeR` 9 → 12, `honkGap` 2.2 → 1.5, and the honk is heard `callR` tiles off (it was `seeR`).
    goose: { r: 12, speed: 200 * SLOW, hurry: 1.35, seeR: 12, honkGap: 1.5, balkStun: 0.5,
      // A windup in its sight is honked at on the spot, the alarm's `honkGap` aside; `blowGap` is
      // only the breath between two such honks.
      blowGap: 0.35, lead: 10, callR: 16,
      // At the stairs: the voice carries further and comes back sooner, for the rest of the run.
      saveR: 8, saveScreamRange: 1.2, saveScreamCd: 0.8 },
    // The crow follows corpses, not you. Every room with nothing dead in it, it falls behind, which
    // is the one escort that argues with *run, don't fight*, and it is meant to: it is the price of
    // what it carries out. `markFor` is how long a body still draws it, `perch` how close it settles.
    crow: { r: 11, speed: 230 * SLOW, slack: 0.55, followAt: 2.6, perch: 1.1, markFor: 14, markR: 13, hopGap: 1.4,
      // A body it can SEE it flies to at `flySpeed`, the moment it sees it, and of two in sight it
      // takes the one nearer the stairs, the crow pulls you on into the next room rather than back.
      // Landing on one it says so, once a body.
      // `feedFor` is how long it eats at one before it is done with it and goes on down the road.
      flySpeed: 560 * SLOW, feedFor: 2.5, lines: ['FRESHLY COOKED', 'TASTY', 'STILL WARM', 'MINE'],
      // It is never walled in for its appetite (26 Sep 2026): `late` rooms behind the goat it leaves
      // the bodies and flies after him, and past `catchUp` tiles off him it flies rather than hops,
      // at `catchFly` of `flySpeed`, still well over his run.
      late: 1, catchUp: 9, catchFly: 0.8,
      // With no body in reach it sits (1 Oct 2026: it used to hop at his heels at `slack`); flying after
      // him it lands `waitAt` tiles short of him, not at his feet.
      waitAt: 5,
      // At the stairs: it has found something. A talisman at `giftTier` (RARE; COMMON for one with a
      // single tier) stands at the head of the NEXT floor's stairs, free, taken the way one of the
      // mouse's is. A bird, it counts a room further back than the rest (`saveRooms`, `Beast.cameWith`).
      saveR: 8, saveRooms: 1, giftTier: 2,
      // The bird that brought it perches by it and flies off once it is taken, or once the goat has
      // walked `giftLeave` tiles away from it (`Beast.updateGift`): rising `giftRise` px/s, gone in
      // `giftGone` s. It used to follow him the whole floor like an escort and pay nothing.
      giftLeave: 12, giftRise: 90, giftGone: 1.3 },
    // The horse (24 Sep 2026) races you. Out of its stall it says so and gallops down the goose's
    // field at `speed`, and the race is run in legs (30 Sep 2026): to each locked room with a soul
    // ahead of it (a soul gate's room, the mouse's included: `Beast.horseLegs`), where it waits
    // until the gate gives, then on to the next and at last to the stairs. A leg is his if he is in
    // its room before the horse is; win one soul room and it pays at the stairs (`won`, `Beast.saved`).
    // The stairs leg is said (`lines.won` / `lost`) and pays nothing. It stops besides only at a
    // bar no kick opens (a sealed arena, the vault, the dark flight). A shut door in
    // its way it kicks (`kickWind` s rearing, then the blow, `kickGap` s between two on iron), and
    // a man in its way it bowls aside at `bowl` px/s (× his own weight), dazed `daze` s, well under
    // `physics.splatSpeed`, so it scatters a room and never kills in it: the wall is still the only
    // killer (pillar 3). The cult hardly minds it: a man it bowls over keeps whatever he knew about
    // the goat and learns nothing new. `hp` is its own, sturdier than the birds'. `slow` is how
    // much of its pace a man in the way costs it, for `slowFor` s.
    // `r` is its body, not its picture: a tile-wide way out (every soul gate, a one-tile corridor) has
    // to take it the way it takes a goat, so it is a goose's width under a sprite twice the size.
    // `speed` 1.15 × PACE, then 1.02, until 25 Sep 2026 ("no chance to catch it").
    // `speed` was 0.88 × PACE until 29 Sep 2026 ("the horse much slower, and now and then it stops to
    // joke how slow you are"): a race it always won was no race. `taunt`: every `gap` s of galloping,
    // if it is `ahead` tiles or more nearer the stairs than he is, it stops `hold` s, turns to him and
    // says one of `lines.taunt` (on its plate for `say` s).
    // `hp` 5 until 6 Oct 2026 (playtest: "the horse has a lot of health, the hen not so much"; the hen keeps her 5).
    horse: { r: 13, speed: 0.62 * PACE, hp: 9,
      taunt: { gap: [5, 8], ahead: 5, hold: 1.8, say: 2.4 }, kickWind: 0.28, kickGap: 0.42, bowl: 7 * TILE, daze: 1.2,
      slow: 0.55, slowFor: 0.35, stuckFor: 0.8, sideFor: 0.45, ready: 1.8,
      // It has won when it stands within `homeR` tiles of the stairs; within `tellR` of it the goat
      // hears which of them got there first. At a soul room it has won the leg the moment it is in
      // the room first, and says so once they are both in it: `won` or `lost`, then `mine` (it
      // waits there for the soul) or `yours`. At the stairs the second line is whether it pays.
      homeR: 2.5, tellR: 5,
      lines: { won: 'TOO SLOW, GOAT!', lost: 'YOU CHEATED', mine: 'TAKE THE SOUL. I WAIT', yours: 'FINE. MY LEGS ARE YOURS',
        pay: 'A BET IS A BET. RUN ON MY LEGS', none: 'NOT ONE WIN. NO PAY', left: 'LAST TRY: THE STAIRS',
        taunt: ['HOW SLOW YOU ARE', 'IS THAT A GALLOP?', 'I COULD GRAZE HERE', 'KEEP UP, GOAT', 'ARE YOU WALKING?'] },
      // At the stairs, if he beat it to one soul room: he runs on its legs for the rest of the run,
      // `saveSpeed` on his stride (1.07 until 30 Sep 2026: "beat the horse and it is 10%, not 7").
      // The stairs are the last of his tries: there first, and it pays too (`Beast.horseHome`).
      saveR: 8, saveSpeed: 1.10,
      // What it says in the box (`Beast.talk`) as it comes out of the stall, and when he has won a
      // leg; `{tries}` is the soul rooms ahead of it and the stairs, counted, `{pct}` the stride.
      // In its own voice, not a manual (2 Oct 2026 playtest): "my legs" is the hint, the number is on
      // the clear card and the HUD icon.
      talk: { race: ['NEIGH! RACE YOU TO THE LOCKED DOOR WITH THE SOUL BEHIND IT.',
        "{tries}: THAT DOOR, THEN THE STAIRS. BEAT ME ONCE AND YOU CAN KEEP MY LEGS. YOU WON'T."],
        raceOne: ['NEIGH! RACE YOU TO THE STAIRS.', "ONE TRY. BEAT ME AND YOU CAN KEEP MY LEGS. YOU WON'T."],
        beaten: ['YOU OUTRAN ME. ME!', 'A BET IS A BET. MY LEGS ARE YOURS NOW, ALL THE WAY OUT.'],
        // Beaten after he poisoned or dazed it (`p.cheated`, `Beast.dope`, 6 Oct 2026): it knows, and pays.
        cheated: ['YOU POISONED ME! CHEAT! CHEAT!', 'BUT A WIN IS A WIN, I SUPPOSE. TAKE MY LEGS, YOU DIRTY GOAT.'] } },
    // The pig (30 Sep 2026: "she only wants to eat. Feed her three of your grasses if you want her
    // to thank you, and on the floors after you find a tuft or two more"). Out of her coop she
    // ambles after him (`speed`, standing within `followAt` tiles, `catchUp` × her pace past
    // `catchFar`), and any milk grass she can see within `smell` tiles she goes to and eats in
    // `eatTime` s, standing within `eatR` tiles of it, his, if he has not grazed it first. `full`
    // grasses and she thanks him; once she is full she eats no more. At the stairs a full pig pays
    // `saveHeals` grass more on every floor after this one (a roll between the two, off the floor's
    // seed; `Game.startLevel` hands it to the generator as the clover's `heals`).
    pig: { r: 12, speed: 0.55 * PACE, followAt: 1.8, faceDead: 8, catchFar: 7, catchUp: 1.6, hp: 7, smell: 6, eatR: 0.75, eatTime: 1.8, full: 3,
      saveR: 8, saveHeals: [1, 2],
      // Told no (2 Oct 2026 playtest): she eats the floor's grass anyway, walking on ahead at `speed`,
      // any tuft she can see within `smell` tiles; never full, never banked; the horns stop her (`hp`).
      spite: { speed: 0.6 * PACE, smell: 9, say: ["THEN I'LL EAT IT ANYWAY.", 'NO? FINE. ALL OF IT IS MINE, THEN.'], munch: ['MINE.', 'HA. CRUNCH.', 'TOO SLOW, GOAT.'] },
      lines: { munch: ['MMM.', 'CRUNCH', 'MORE?', 'GRASS!'], left: ['{n} MORE', 'ONLY {n} MORE'] },
      // A hint, not a manual (2 Oct 2026 playtest): a pig fed is a pig that knows where grass grows.
      talk: { hello: ['OINK.', "I'M NOT RACING ANYBODY. I'M JUST HUNGRY.", 'SPARE ME {n} OF YOUR GRASSES. A FED PIG NEVER FORGETS WHERE THE GOOD GRASS GROWS.'],
        full: ['OINK! OINK!', "THAT'S ME FULL. THANK YOU, GOAT.", "YOU GET TO THE STAIRS, AND I'LL SNIFF YOU OUT A LITTLE EXTRA ON EVERY FLOOR AHEAD."] } },
    // THE RABBIT (1 Oct 2026, playtest: "he offers to tie your legs, no running keys, only the headbutt,
    // the skills and the items, so you try it his way, in jumps"). Said yes, `game.legsTied`: no stride at
    // all, the roll goes where you point and comes back in `tied.rollCd` of the time, `tied.rollDist` as far.
    // Up the stairs with him so: the roll comes back `saveRollCd` × as soon for the run. He hops after you
    // (`hop` s a hop, `hopH` px high) at `speed`, `followAt` tiles back.
    rabbit: { r: 8, speed: 0.95 * PACE, followAt: 1.6, catchFar: 7, catchUp: 1.8, hp: 3, hop: 0.42, hopH: 6, saveR: 8, hopShare: 0.6, hopSpeed: 1.6, faceDead: 6,   // hopShare: the part of each hop it moves in; hopSpeed: its speed through it
      tied: { rollCd: 0.45, rollDist: 1.15 }, saveRollCd: 0.85 },
    // THE HUSKY (1 Oct 2026, playtest: "she runs into the next room, where the men are, and they do not
    // touch her; you follow, and she sings WAF WOOO and you have to answer BEEE, your own voice, like
    // Guitar Hero, her stave and yours; what makes it hard is the cooldown, in a fight"). Said yes, she
    // runs (`speed`) to the next room with men in it within `ahead` rooms (the fullest of them), and
    // `extra` more of the cult come in after the goat when the song starts. A cycle is `cycle` s: her two
    // notes land at `her` s, his at `you` s, hit with a BAAH within `window` s. `need` answers and she is
    // happy; the song gives up after `time` s, or `after` cycles once the room's men are all down.
    // At the stairs: the voice comes back `saveScreamCd` × as soon for the run.
    husky: { r: 11, speed: 1.45 * PACE, followAt: 2, catchFar: 7, catchUp: 1.7, hp: 4, saveR: 8, ahead: 2, extra: 2,
      leadIn: 1.2, flash: 0.5, miss: 0.6, endShow: 1.4, endLost: 2, leadEvery: 1, giveUp: 1.8,   // the song's lead-in, hit flash, miss flash, how long its verdict shows, how often she re-aims, how long she sulks after a lost song
      // 2 Oct 2026, a playtest: "a little slower, so her woo lands on the beat and you can hit it too"
      // (was cycle 4.2, her 0 / 0.55, you 1.9, lead 1.6). Her WOOO is a howl heard (`sfxHusky`) and a
      // ring `wooRing` tiles round her; whatever his voice is, answering in a song also bleats `beh`
      // ([pitch Hz, gain, length s]), so DRAGON BREATH and VENOM SPIT are a goat's BEH too.
      // 2 Oct 2026, later: slower still, each of her notes heard whole (`her` 0 / 0.65, `you` 2.2, `cycle` 4.8
      // before), and a bar never shorter than his voice's cooldown + `cdGap`. `judge`: what she says of an
      // answer, PERFECT within `perfect` s of the beat, GOOD within `good`, else EARLY / LATE in the window,
      // OFF THE BEAT within `off`, MISSED for none; `grade`: how the whole song went.
      cycle: 6, her: [0, 1.0], you: 2.8, lead: 2.3, window: 0.45, need: 2, time: 70, after: 2, saveScreamCd: 0.85, cdGap: 1.4,
      judge: { perfect: 0.12, good: 0.26, off: 1.2, words: { perfect: 'PERFECT!', good: 'GOOD!', early: 'A BIT EARLY', late: 'A BIT LATE', off: 'OFF THE BEAT', miss: 'YOU MISSED' } },
      grade: { perfect: 'AWOOOOOOO! PERFECT!', good: 'AWOOOOO! WE SANG!', rough: 'ROUGH, BUT WE SANG.', lost: 'awoo... you lost the beat.' },
      wooRing: 1.6, beh: [330, 0.22, 0.34],
      // The board at the screen's foot (`Beast.drawSong`, 3 Oct 2026, Guitar Hero's highway): two lanes `lane`
      // px wide `gap` apart, `tall` px from the far end to the strike line, the husky and the goat `icon` px
      // under the frets (the goat's portrait `goat` px tall), `foot` px off the screen's bottom.
      // Every note of hers is a howl (`sfxHusky` 'wu' short, 'woo' the last, held).
      view: { lane: 44, gap: 6, tall: 170, icon: 34, goat: 44, foot: 18 },
      // Sung, she says so over her head for `wonFor` s (never the box, which would hold the fight).
      won: ['AWOOOOOOO! WE SANG!', 'TAKE ME TO THE STAIRS', 'AND YOUR VOICE COMES BACK SOONER'], wonFor: 3.2,
      // The practice before it (1 Oct 2026): in the first room with nobody alive in it, within `near`
      // tiles of him, the same song with no cult and no way to lose; `need` answers, or `time` s, or
      // he leaves the room, or the cult comes in, then she runs for the real one.
      practice: { need: 2, near: 6, time: 40, say: 'JUST US FIRST: BAAH AS YOUR NOTE CROSSES THE LINE', good: 'YES! NOW FOR REAL. FOLLOW ME!', go: 'NO MATTER. NOW FOR REAL!' } },
    // THE FISH (6 Oct 2026, the uncle's; js/beasts-more.js `updateFish`): a tank on the floor, no coop. In his
    // teeth he walks at `carry` of his stride; thrown it flies `throwTiles` tiles at `throwSpeed` and sets down,
    // and anything it meets on the way (stone, a door, furniture, a man) breaks the glass: `hp` 1, fire does
    // nothing to it. It bubbles every `blub` s, heard within `hearR` tiles. At the stairs: `saveWet` fire a
    // floor that only steams on him (`mods.wet`, `Goat.damage`).
    fish: { r: 11, hp: 1, carry: 0.6, throwTiles: 2.2, throwSpeed: 380, blub: [2.5, 5.5], hearR: 9, saveR: 8, saveWet: 1 },
  },
  // Where an escort comes from, and how many. `levelDef.beasts` is which of them a floor may hold;
  // the generator picks one at random and puts it in an ordinary room inside the first `third` of
  // the level, clear of the furniture and well in from the way in, first third, because the whole
  // point of one is the walk from there to the stairs. One a level, never in the pen, a rest room,
  // a teaching room or a set piece. `GEN_RULES.beasts` holds all of it.
  // `hp` is how many blows (or touches of fire) an animal takes before it dies, `hurtCd` the beat
  // after one in which nothing else lands. `callR` / `callGap`: a caged one calls out when he is that
  // many tiles off, every few seconds, so nobody walks past a coop without hearing it.
  // `shyR`: a man awake and on his feet this many tiles from the hen or the crow sends it round to
  // the far side of the goat, `shyBack` tiles behind him (`Beast.shy`), out of the arc of a club
  // aimed at him. `exitEvery`: how often the way out is laid again round furniture that has moved.
  // `deal` is the run's, not the floor's (`Beast.deal`, off the run seed): the first animal is on
  // one of the floors `first` (a level index), level three at the earliest, or `known` (level two)
  // once this browser has cleared that floor before (24 Sep 2026: "the first animal from level
  // three, or from two only once you have been through it"), each after it `gap` floors on, and no kind is dealt
  // twice in a run, and none on the last floor, which has no run after it to pay into, a buff you could stack to its top on every floor is not a choice (24 Sep 2026:
  // "one animal to one or two levels, never repeated"). A floor only ever gets a kind off its own
  // `beasts` list; once every kind is spent the floors after it have none.
  // `deal` 1 Oct 2026 (playtest: "a friend saw very few animals over his runs, a run without a death should
  // meet three or four, odd floors too"): from the second floor, then every one or two.
  beast: { deal: { first: [1, 2], known: 1, gap: [1, 2], tries: 60 }, third: 0.36, refuseFor: 1.6, clear: 1.2, tellFor: 3.4, pactFor: 6.5, hp: 5, hurtCd: 0.6, callR: 6, callGap: 2.6,
    shyR: 2.4, shyBack: 1.3, exitEvery: 1.0,
    // What the goat can do to his own (6 Oct 2026 playtest: "a legit strategy, you can cheat", `Beast.dope`):
    // poisoned it walks at `poisonMove` for `poison` s (a man is poisoned 3 s), dazed it stands `stun` s.
    dope: { poison: 9, poisonMove: 0.45, stun: 2.6, poisonWord: 'POISONED', stunWord: 'DAZED' },
    // Its health over its head (6 Oct 2026 playtest, "just in case"; `Beast.drawHealth`): a pip a heart, `pip`
    // world px square, `gap` apart, `up` px over its feet (`upOf` for the tall ones), `near` tiles from the goat
    // or hurt or doped to show; the tortoise's are iron (its shell, only fire gets through).
    health: { pip: 3, gap: 1, up: 30, upOf: { horse: 52, pig: 34, husky: 34, fish: 30 }, near: 9, row: 10,
      colors: { full: '#d2443a', empty: 'rgba(40,24,28,0.75)', shell: '#a3abb5', rim: '#120c10', poison: '#9fd84a' } },
    // Getting out of reach: the hen runs `shySpeed` × her follow speed and the crow flies `shyFly` ×
    // its flight speed; within `shyArrive` tiles of the spot it stops; a goat further than `shyFar` ×
    // `shyR` is no cover and it simply backs off from the man.
    shySpeed: 1.2, shyFly: 0.5, shyArrive: 0.4, shyFar: 2,
    // Left behind: past `strayR` tiles it calls every `strayGap` s until it is out of hearing at
    // `strayFar`, and while it is out of the picture a pip `strayEdge` tiles in from the edge of the
    // screen points at it, a size `strayPip` (`Renderer.drawStrays`).
    // `strayJitter` spreads the calls so two strays never call in step; one room from being walled
    // in it calls `strayUrgent` × as often.
    strayR: 11, strayFar: 60, strayGap: 5.5, strayJitter: 0.2, strayUrgent: 0.5, strayEdge: 1.0, strayPip: 0.8,
    // An animal with terms to say says them in a box over the paused floor (`Beast.talk`, the god's
    // box, 30 Sep 2026: "a simple dialogue, so he surely sees it and understands"): `type` letters a
    // second, a press ignored for `arm` s (and the answer to a question for `askArm` s once it is all
    // written, so a pad's A turning pages never says no), and the box leaves over `out` s.
    // `size`: the small animals' portraits in the box, against the horse's and the pig's own drawings.
    // `answer`: the two plates under an animal's question, yes green, no red (2 Oct 2026 playtest).
    talk: { type: 44, arm: 0.35, askArm: 0.6, out: 0.28, size: { chicken: 1.8, crow: 1.8, goose: 1.35, tortoise: 1.05, rabbit: 2.1, husky: 1.5, fish: 1.6 },
      answer: { yes: { fill: '#24401f', hot: '#30562a', lit: 'rgba(168,214,120,0.14)', rim: '#8fcf6a', word: '#b8e88f' },
        no: { fill: '#401c1c', hot: '#562626', lit: 'rgba(230,120,110,0.1)', rim: '#c4524a', word: '#ec9a8f' } } } },
  // Going over an edge. A man who goes down a hole is gone; the goat is only rented, he comes back
  // up on the last boards he stood on, one heart lighter, which is the same price the wheel charges.
  // Make it free and the level is a shortcut; make it fatal and nobody goes near the interesting half
  // of the room.
  // `showFor` is how long a man who went over an edge is still on screen turning over. He is dead the
  // frame he crossed the lip, nothing about the fall is simulated, but a body that simply stops
  // existing reads as a bug, and the one death in the game with nothing left at the end of it is the
  // one that most needs to be watched happening.
  // `setback` is how far back in his own last few steps the goat lands, rather than on the exact
  // board his hoof was leaving when the floor gave: coming back flush with the lip meant the same
  // step that dropped him could drop him again, or hand him straight back to whatever was on his
  // heels. `invuln` is longer than an ordinary hit's, coming back up a floor short is not a fight
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
    // Nothing stands in its sweep (5 Oct 2026 playtest: a stand of arms by the hub). The generator keeps
    // every crate, stand, barrel, bomb, table and suit `clear` tiles past the arm's end (`GEN_RULES.millclear`);
    // in play, anything that ends up there is butted out by the arm as it comes round (`Prop.updateMill`),
    // once every `knockCd` s a thing.
    clear: 1.2, knockCd: 0.8,
  },
  // One rule for every kind (1.72, "a man without the yellow outline is one unit with one heart"):
  // a man without the outline dies to one killing blow, whatever he is; a boss, the man an arena
  // is built round, and the only man who ever carries a soul, wears a hard yellow pixel outline,
  // stands `scale` bigger and takes `hp` killing blows (a soul adds `soulBearer.hp`). The ogre is a
  // boss-only kind and keeps his own four (`butcher.hp`); the rat ogre is the mouse's, not a boss.
  // `outline`: `px` world px of ring round his pixels (a texel of the unit art), in `color`, with a
  // `back` line one more px out so it still reads on yellow straw.
  // Two outlines since 2 Oct 2026 ("bosses with corrupted souls violet, champions yellow, nothing but
  // +1 heart"): a boss with no soul in him is a CHAMPION, his kind's own hearts plus `champHp`, in
  // `color`; a man carrying a soul (a boss lit by `game.ensoul`, every gate's keeper, the last boss
  // whose soul lifts the stairs' gate) is in `soul` over `soulBack`, and only he gets `hp` (or his
  // own plus one where that is more) before the soul's heart goes on top. `downFor`: how long any man with
  // a heart to spare lies after a killing blow he absorbed (`Enemy.die`; the rat ogre staggers instead).
  boss: { hp: 3, champHp: 1, scale: 1.14, downFor: 0.75, outline: { px: 1, color: '#ffd23f', back: '#2a1a08', soul: '#b98cff', soulBack: '#2a1244', alpha: 0.95 } },
  // The BUTCHER (the brute until 1.72; the code's flag is still `champion`): a clubman with a
  // cleaver, a hook on a rope (a charge until 30 Sep 2026) and too much weight to carry. Out of a ring he takes three killing blows, unlike
  // anybody without the outline; in one he is a boss by the rule above. Since 1.66 he wears what
  // was the old Butcher's body (the bull's skull, the apron, the cleaver), hence the name.
  // `hp`: out of a ring he takes three killing blows, in one four (`boss.hp` or his own plus one).
  champion: { hp: 3, scale: 1.06, spikes: 5,   // on the old Butcher's sheet (48 px), not the `brute` sheet (38)
    // His own arm, not the clubman's: the clubman's got shorter and quicker, the butcher's did not.
    reach: 1.0 * TILE, windup: 0.62, swing: 0.16, recover: 0.6,
    // Heavy: a headbutt moves him this much of what it moves a clubman, and he is never carried.
    flingMul: 0.55,
    // The hook (30 Sep 2026, in place of the charge, which furniture and pillars kept stopping):
    // seen `min`..`max` tiles off with a line clear of stone and furniture (his own men do not count:
    // the hook goes past them), off `cooldown` s, he plants and swings it round (`wind` s, a thin line
    // on the floor to where it will land) and throws it at where the goat WILL be: the goat's own
    // velocity × the flight time, the whole of it (`lead` 1), never more than `leadMax` tiles ahead.
    // Running straight on, it lands; only a real change of direction after it leaves his hand fools it.
    // `speed` px/s in flight (thrown, so no SLOW); it flies `over` tiles past the aim point and is
    // stopped by stone and by anything that stops a round (`stopsBullets`). It catches the goat within
    // `catchR` px past his body. The roll tumbles through it. A carried shield facing him turns it
    // (a use spent); a carried crate facing him is torn out of the goat's mouth and pulled in instead.
    // A loose crate or bomb it meets on the way is pulled in too.
    // Caught, the goat is off his feet and dragged at `pull` px/s until he is `stopAt` px inside the
    // butcher's club reach, never longer than `pullMax` s, then lies `daze` s more while the butcher
    // winds up his ordinary swing (and is on his feet for the rest of it). No damage from the hook itself (pillar 3): what hurts is the club,
    // and whatever the rope drags him across (fire, a drop).
    // A miss is reeled back at `reel` px/s and he stands `recover` s after it (pillar 4). In the air it is
    // stepped `step` px at a time; a prop is met within `propR` px of its rim, a pulled one stops `propGap` px off him.
    hook: { dropFloor: 0.5, min: 3, max: 7, wind: 0.55, cooldown: 3.6, speed: 14 * TILE, lead: 1, leadMax: 3, over: 1.5, catchR: 7,
      pull: 9 * TILE, pullMax: 1.1, stopAt: 4, daze: 0.3, reel: 16 * TILE, recover: 0.45, step: 6, propR: 3, propGap: 4 },
    // Alight, he comes on like the Butcher does rather than blundering (`TUNING.butcher.rage`).
    rage: { speed: 1.4, tempo: 1.4 },
    // Butted again and again (3 Oct 2026 playtest: spammed in a corner, the butcher and a corrupted
    // clubman were locked there): he and any clubman carrying a soul shove back (`Enemy.shoveBack`).
    // Every butt that lands on him is counted while the last was under `window` s ago; the n-th is
    // answered instead at `odds[n]`, at once and costing him nothing: the goat is thrown off at `speed`
    // and dazed `daze` s, no heart. A reflex, not a blow (the user's: "you can hardly react, but it does
    // no damage"). `lunge` s he is drawn leaning into it. Softened the same day ("it should fire
    // sometimes, clearly not always; the first one is really hard to kill"): two butts always land, the
    // third is a quarter, every one after a half, and a shove starts the count again from nothing.
    shove: { window: 1.8, odds: [0, 0, 0.25, 0.5], speed: 13 * TILE, daze: 0.28, lunge: 0.2 },
    immune: { blunder: true } },
  // The SHIELDMAN (1 Oct 2026): a clubman behind a door-plank shield (the code's flag is `shield`, a
  // pseudo-kind in THREAT and the encounter tables, as `champion` is). Pillar 2 asked of the angle: a
  // headbutt landing inside `arc` radians of where he faces is taken by the board (one of its `uses`),
  // rocks him back `push` px/s for `brace` s (the board still up) and throws the goat off at `bounce`;
  // from the side or the back he is a clubman like any other. The board is down while he is dazed,
  // floored, staggered, flung, carried or blundering alight, and the board is heavy: he walks at
  // `speedMul` of a clubman's pace and turns no faster than `turn` rad/s, so a goat who circles, rolls
  // or LEAPFROGs round him has his back. A body thrown into the board meets it as a wall (the wall's own
  // kill rule, `Game.flungHits`), a round or a thrown thing stops on it; each spends a use, and the last
  // one splinters it. A man already winding up or swinging goes on with it. Dead with uses left, he
  // drops it, a shield to pick up.
  // `jolt` s the board shudders, drawn.
  // The spiked board (2 Oct 2026, the user's: "if you butt him from the front, you take damage"): a
  // beast's skull with its horns standing out (js/prop-pixels.js `boneShield`). The horns into its front
  // cost the goat `spikes.hurt` hearts and throw him off at `spikes.bounce` px/s, and the bone takes `spikes.wear` uses of it
  // (none: nothing head on wears it down, a thrown thing, a blade or a round still do). Poisoned, he
  // turns at `poisonTurn` of `turn`, slow enough to walk round. Down (dazed, floored, alight) the
  // board hangs at his knees, `low` px lower and `side` px out, turned a quarter, eased at `ease`/s.
  shieldman: { uses: 2, arc: 1.2, speedMul: 0.86, turn: 2.4, brace: 0.3, push: 3 * TILE, bounce: 3 * TILE, jolt: 0.2,
    // (2 Oct 2026, the user's: "a little bigger, two hearts, the dangerous one") `hp` hearts, the second
    // kind after the seer to carry two without the outline; drawn `scale` the size of a clubman.
    hp: 2, scale: 1.15,
    // `spikes.plain` (5 Oct 2026, the user's): an ordinary shieldman's spikes (no outline, no soul) cost
    // no heart; they throw the goat off at `plain.speed` px/s and leave him seeing stars `plain.daze` s,
    // the ogre's rebound with a longer daze. Only a boss's or a soul-bearer's board takes `hurt`.
    spikes: { hurt: 1, bounce: 5 * TILE, wear: 0, plain: { speed: 14 * TILE, daze: 0.9 } }, poisonTurn: 0.15, low: 9, side: 3, ease: 9,
    // His own blow up close (5 Oct 2026, the user's: "he has no plain attack, only the leap"), read by
    // `Enemy.atk` in place of the clubman's: the board rammed into whoever stands in front, `windup` s
    // drawn back (the board pulled in `thrust` / 2 px, the clubman's wedge laid amber), `swing` s out
    // `thrust` px, `recover` s after. `drop`: the uses of the board he leaves lying when he dies whole
    // (it was what he had left on it, often one).
    strike: { reach: 0.85 * TILE, windup: 0.6, swing: 0.16, recover: 0.7, damage: 1, knock: 2 * TILE, thrust: 7 }, drop: 3,
    // His leap (2 Oct 2026, the user's: "when he is close, he jumps with his shield in front"), `Enemy.bashStep`:
    // seen `min`..`max` tiles off, facing within `aim` rad of him, off `cd` s, he crouches `wind` s (the
    // strip laid amber), then goes `speed` px/s for up to `time` s. The goat within `reach` px of him loses
    // `damage` hearts, thrown `knock` px/s; a man of his own is bowled at `bowl`. Stone sits him down dazed
    // `wallDaze` s; after it, landed or not, he is planted `recover` s, unable to turn.
    bash: { min: 1.4, max: 3.4, aim: 0.6, cd: 3, wind: 0.55, speed: 13 * TILE * SLOW, time: 0.3, reach: 4,
      damage: 1, knock: 7 * TILE, bowl: 9 * TILE, wallDaze: 1.2, recover: 0.9 } },
  // THE THROWER (3 Oct 2026, the user's: "an enemy who throws things, his own men, even the goat; a
  // one-armed Bane"): a clubman of the cult with one arm grown huge on the green from the tank on his
  // back, a goat's skull strapped on for a face (js/thrower.js, js/thrower-pixels.js). `hp` hearts, a
  // headbutt moves him `flingMul` of a clubman (the butcher's), never carried, `speedMul` of a clubman's
  // pace and `scale` his size. He goes for something to throw within `seek` tiles of him in his own room
  // (`ammo` crates the generator makes sure his room has, `GEN_RULES.thrower`): a crate or a bomb, a
  // clubman or a hound of his own, an animal of the goat's; `give` s of not getting there and he lets it
  // be for `forget` s. He lifts it overhead for `lift` s (the windup: a headbutt in it drops it on him,
  // `drop`), walks with it at `carry` of his pace until the goat is `near`..`far` tiles off in a clear line,
  // plants `aim` s with the line laid amber, and throws: a thing at `thing` px/s, a man at `man`, an
  // animal at `beast` (its flight drags at `beastDrag`/s). Whatever he throws that meets the goat costs
  // `hit` hearts. After a throw he stands `recover` s, and waits `cd` s before he looks again.
  // Up close (`fist`) his blow: the club's numbers, his own arm. Or `grab` (off `grab.cd`, within
  // `grab.reach` px of his reach): `wind` s reaching (the roll slips it), `hold` s with the goat over his
  // head while he turns him toward the worst thing near (a drop, fire, a grate, stone), then he throws him
  // at `speed` px/s, dragging `drag`/s. The throw does no harm: whatever he meets does (pillar 3 turned on
  // the goat). Stone, a shut door or furniture met faster than `hurt` px/s costs `hurtN` hearts; he lands
  // `land` s off his feet. `pick` is how far the goat's pick of a direction looks, in tiles. The green in
  // his arm beats `pulse.rest` frames a second, `pulse.tell` through every windup (js/thrower-pixels.js).
  // Carrying `carryMax` s with no clear throw (the goat kept close or out of his line), he sets it down.
  // `grab.turn` rad/s he turns with the goat overhead; thrown, the goat lands once under `grab.stop`
  // px/s, keeps `grab.slam` of his speed off what he met, and through a man keeps `intoMan.goat` while
  // the man slides off at `intoMan.man` of it. `r` his body; `wake` s before his first lift or grab;
  // a look round every `look` s; `rest.lost` s stood still when what he held was taken off him,
  // `rest.put` after setting it down; a bomb under `bombOn` s of fuse goes off on him, not over him.
  // `knock` px/s the goat is pushed by what he throws; a thrown animal comes down on stone hit past
  // `beastLand` px/s, or slowing under it. Were literals in js/thrower.js until 5 Oct 2026.
  thrower: { hp: 3, carryMax: 6, pulse: { rest: 3, tell: 9 }, flingMul: 0.55, speedMul: 0.82, scale: 1, seek: 9, ammo: 3, give: 3.5, forget: 6,
    lift: 0.7, drop: 1.1, carry: 0.7, near: 1.6, far: 6.5, aim: 0.42, recover: 0.75, cd: 0.5, hit: 1,
    thing: 13 * TILE, man: 18 * TILE, beast: 12 * TILE, beastDrag: 2.6,
    fist: { reach: 0.9 * TILE, windup: 0.6, swing: 0.15, recover: 0.65, damage: 1, knock: 1.4 * TILE },
    grab: { reach: 10, cd: 5, wind: 0.5, hold: 0.5, speed: 14 * TILE, drag: 3, hurt: 4.5 * TILE, hurtN: 1, land: 0.45, pick: 6,
      turn: 7, stop: 1.5 * TILE, slam: 0.15, intoMan: { man: 0.4, goat: 0.45 } },
    r: 13, wake: { lift: 0.6, grab: 1.5 }, look: 0.5, rest: { lost: 0.3, put: 0.4 }, bombOn: 0.15, knock: 2 * TILE, beastLand: 2 * TILE,
    // (5 Oct 2026, the user's) Anything he throws that lands on the goat stuns him `stun` s on top of the
    // heart (`Thrower.hitGoat`). Dead, he leaves `acid` tiles of poison where he fell (the tank on his
    // back, `Status.spatter`). A body of the cult lying in his room is ammo too (`Thrower.find`, `body`):
    // lifted off the floor it is weighed `body.extra` tiles further than a crate, and set down whole it
    // lies `body.life` s as something to trip on before it is a body on the floor again. Over his head it is
    // the dead man drawn again with `body.dark` of the dead's shade over him, not the floor's grey.
    stun: 0.6, acid: 3, body: { extra: 0.5, life: 6, dark: 0.3 } },
  // THE SHAMAN (6 Oct 2026, the user's: "two skills: he boosts the run, the damage and +1 heart of the ordinary kind;
  // and on your goat he holds the run key down one way, toward himself, shown over you, for a while, and you can press
  // the other keys"). A man of the old cult in a pelt and a headdress of antlers, tusks or feathers (js/shaman.js,
  // js/shaman-pixels.js), a `bearer` with `e.shaman`: `hp` hearts, `speedMul` of a clubman's pace, `r` his body. He
  // keeps `keep.min`..`keep.max` tiles off the goat behind his men (backs off inside `min`, walks up past `max` or
  // out of sight) and swings his staff only when the goat is in his face. `wake` s before his first cast.
  // THE SPIRIT (`spirit`): off `cd` s, plain clubmen of his own room he can see within `reach` tiles who do not have
  // it: he shakes the rattle `wind` s (the tell: green cells running from him to each one; a scream, a daze, a blow
  // breaks it), then up to `max` of them run `speed` × as fast, hit `hurt` hearts harder and take `hp` more, for
  // `time` s or until he is down (cast again on a man who has it, it is topped up). `recover` s after it.
  // Which cast he tries first is the goat's distance: past `near` tiles the call, inside it the spirit.
  // THE CALL (`call`): off `cd` s, the goat seen `min`..`max` tiles off: he plants and holds his hand out `wind` s
  // (the tell: an amber line to the goat and a key over the goat's head ringed by cells filling round). Out of his
  // sight at any moment of it, or him poisoned (blind), and it is gone. If the goat is not mid-roll at the end, the
  // run key is held down for the goat toward him for `time` s, as one of the
  // eight a keyboard has, added to whatever the player presses: pressing away holds him still, sideways bends it,
  // every other verb is still his. The shaman down ends it. A blow that reaches the goat (6 Oct 2026, the user's:
  // "damage taken breaks the shaman's control for a while") ends it too, and no call takes him for `guard` s after.
  // `hp` 2 since the same day ("two hits too"): floored by the first, as every two-hearted man is.
  shaman: { hp: 2, speedMul: 0.9, r: 11, keep: { min: 3.5, max: 6.5 }, wake: 1.2, near: 4.5,
    spirit: { cd: 7, wind: 0.9, reach: 7, max: 3, speed: 1.3, hurt: 1, hp: 1, time: 14, recover: 0.5 },
    // `wind` 1.2 since the same day: the status over the goat fills round in it, and it must be readable.
    call: { cd: 6, wind: 1.2, min: 2.5, max: 8, time: 2.6, recover: 0.6, guard: 3 },
    // (the user's, same day) While he casts either, a big green ring of cells round him, `r` tiles, filling in
    // as the windup runs; when the cast goes off it flashes out to `burst` tiles.
    // `runes` signs round it, turning at `turn` rad/s, each blinking on its own beat (Enter the Gungeon's wizards).
    aura: { r: 2.6, burst: 3.4, runes: 9, turn: 0.35 } },
  // A man's club (`Game.meleeHit`): the goat is knocked `knockMul` × the kind's `knock`; a man of his own
  // in the arc goes down `floorChance` of the time for `floorFor` s (the clumsiness pillar 4 asks of both
  // sides); an ogre's arm throws one at `ogreFling` px/s. Were literals in the call until 2 Oct 2026.
  club: { knockMul: 4, floorChance: 0.7, floorFor: 0.6, ogreFling: 14 * TILE },
  // A soul only ever goes into a boss (`game.ensoul`), so a soul-bearer already wears the outline:
  // the soul adds `hp` more hearts and the amber haze, a headbutt moves him `flingMul` of what it
  // would, and nothing carries him out of the room. Edited on ENEMIES.
  // `traits` (26 Sep 2026: "a man with a soul: +1 heart and one or two champion traits") is what the
  // soul adds to each kind on top of the heart, by the ENEMIES tab's row tag; empty for now. The
  // traits there are: `swift`, he moves `swift` times as fast.
  // `witchProof` (29 Sep 2026): a man with a soul in him does not catch from witchfire (`Enemy.ignite`),
  // so the keeper is never undone by the fire his own club lights; ordinary flame still takes him.
  soulBearer: { hp: 1, flingMul: 0.6, swift: 1.15, witchProof: true,
    traits: { bearer: [], champion: [], boss: [], butcher: [], dog: [], seer: [], hunter: [], wraith: [] } },
  // The keeper of a gate (`levelDef.gateKeeper`, every floor's gates since 25 Sep 2026): the soul that
  // lifts that gate is not lying on the floor, it is in a clubman standing over where it would lie,
  // and it comes out of him when he goes down (`game.bossPrize`). He is a soul-bearer like any
  // other (`soulBearer.flingMul`, unliftable, lit) with `hp` hearts in all; he walks at `speed` of a
  // clubman's pace; and where his club comes down the floor goes up in witchfire, a patch
  // `fireR` tiles round the spot `fireAt` tiles in front of him, burning `fireFor` s, never the
  // tile he stands on. He does not know his own fire any better than a clubman knows a brazier (26 Sep
  // 2026: "not vulnerable to the fire he makes", he had the seer's `fireCare` and a 0.97 trap sense,
  // so he was never once seen in it): he reads it at a clubman's distance with a clubman's rolled
  // sense and walks into it when he rolls badly. Since 29 Sep 2026 it no longer takes him: the soul in
  // him is witchfire's own stuff (`soulBearer.witchProof`); ordinary flame still does.
  // `hp` is added to his kind's own hearts: a keeper is the base man plus two (2 Oct 2026 playtest:
  // "the corrupted clubman should have 3 hearts"; it was plus one).
  soulKeeper: { hp: 2, speed: 1.3, fireAt: 1.1, fireR: 1, fireFor: 2.6 },
  // The sentry's doorway (THE ALTAR's first man, `blockSpot`): the corridor out of his one-tile gap
  // bends at once, so a straight line from anywhere in his room through where he stands meets stone
  // within `wallBehind` tiles of him, the first swing ever tried ends on a wall and not down a
  // corridor (`GEN_RULES.sentrywall`). The bare head's throw kills against stone within 2.86 tiles
  // of flight (`goat.headbutt.impulse` 21 falling off at `physics.flungDrag` 3.5 to `splatSpeed` 11),
  // and a line of `wallBehind` puts his body (a third of a tile) on the wall inside that; at the four
  // tiles the first turn gave he reached the wall alive.
  sentry: { wallBehind: 3 },
  // The words on the floor. `rollInset`: tiles in from the doorway that E - ROLL is painted at in the
  // room a level names with `rollWith` (the first butcher's), so it is under the goat's feet as he
  // comes through the door and not somewhere out in the middle of the fight. 2 Oct 2026 playtest: "at
  // the entrance", 3.5 read as halfway to the butcher; at 2.2 its first letter is at the doorway.
  hints: { rollInset: 2.2 },
  noise: {
    // A coin flip every frame (`Math.random() < dt * 4`) could go a half-second without landing,
    // which is what let a run right up on somebody's back read as silent. `footstepGap` is a timer
    // instead, the same shape as the goat's own hoofprint clock, so running for any stretch always
    // says so; `footstep` came up a tile so the warning is not only heard once you are already close
    // enough to touch him.
    footstep: 3, footstepGap: 0.16,
    chase: 6, headbutt: 5, splat: 8, smash: 8, gunshot: 14, scream: 12, bell: 30, swing: 4, door: 10, table: 9, breath: 10, boom: 16, cast: 7, rune: 11, cage: 13, steel: 9, embers: 6,
  },
  // STEALTH (3 Oct 2026, a test behind the dev drawer's STEALTH, `game.dev.stealth`; nothing changes
  // with it off). ALT held is a sneak (`game.sneak`): `speed` of his stride, no run-up, no footsteps,
  // crouched (`crouch`, eased in at `ease` a second, `goat.sneakK`). With the test on a running hoof is
  // heard `step` tiles off instead of `noise.footstep`, so the quiet is worth something. A headbutt on a
  // man who has not seen him (or saw him only once the head was down: `Enemy.spotT` against
  // `goat.buttT`) throws him `knock` × as hard and keeps him down `floor` × as long, a hound does not
  // slip it, and the room is told `text`. While he sneaks, every man in sight lays on the floor where he
  // looks (`Renderer.drawStealth`: his range and cone, cut by stone and shut doors, `look.px` world px a
  // cell, a ray every `look.ray` rad, the rays kept `look.keep` s while he stays within a cell and
  // `look.turn` rad, `look.budget` men's rays cast a frame). His ears are not drawn for the player
  // (3 Oct 2026: "sneaking you are silent anyway"); the HEARING switch puts `step` round each man (`ear`).
  // Second pass (3 Oct 2026, after his first go): crouched he is seen only `sight` of a man's range
  // (`canSeeGoat`, the cone drawn the same); the beat of doubt is `notice` (as `ai.notice*`, longer and
  // only inside `noticeNear` none), a `?` over the man filling amber to red (`noticeDur`), then a `!` for
  // `alarm` s; an idle man turns to look into his room (`Enemy.openFacing`: `idle.tries` headings run out
  // to `idle.far` tiles, one within `idle.keep` of the longest), and one stood within `idle.wall` tiles of
  // stone looks round after `idle.wake` s. A crate thrown and broken is already `noise.smash` where it
  // breaks: every unaware man in reach turns to it and goes to look, which is the distraction.
  // Third pass (5 Oct 2026 playtest): ALT is a switch, not a held key (`Game.toggleSneak`, `game.sneakOn`).
  // An aware man who sees him, or a heart lost, ends the sneak and shuts it for `deny` s after the last
  // such moment (`Game.breakSneak`, the HUD's draining ring of cells round his feet, `look.deny`); the
  // room is told `spotted`. While he sneaks an unaware man turns at no more than `turn` rad/s and stops
  // walking until he faces his way (`Enemy.act`); `cover` kinds block a man's sight of him (`Enemy.covered`,
  // the cells cut the same), and in tall grass he is seen only inside `grass` tiles, nor past grass further
  // off than that. A man who came to a noise looks round `search.looks` times, `search.every` s apart, and
  // walks home (`Enemy.investigate`, `e.homeward`). In THE DARK (`game.goatLit` false) his sight is
  // `dark.sight` of `dark.ai.sight` and he hears every noise `dark.ear` × as far.
  stealth: { speed: 0.8, sight: 0.8, step: 4.5, knock: 1.5, floor: 1.5, stop: 0.06, text: 'UNSEEN', ease: 6, alarm: 0.7,
    deny: 6, spotted: 'SPOTTED', turn: 1.6, grass: 1.5,
    cover: { kinds: ['crate', 'rock', 'barrel'], grow: 2 },
    search: { looks: 3, every: 1.1 },
    dark: { sight: 0.7, ear: 1.4 },
    notice: { noticeNear: 1.2, noticeFar: 12, noticeMin: 0.7, noticeMax: 1.5 },
    idle: { tries: 12, far: 6, keep: 0.75, wall: 1, wake: 0.4 },
    crouch: { wide: 0.07, low: 0.12 },
    look: { px: 4, ray: 0.03, keep: 0.25, turn: 0.06, budget: 3, cone: 'rgba(196,48,36,0.2)', rim: 'rgba(226,70,50,0.6)',
      seen: 'rgba(238,64,42,0.34)', ear: 'rgba(214,160,72,0.4)', deny: 'rgba(226,150,60,0.7)', denyR: 20 } },
  juice: {
    // The master dials, over every call site at once: `screen` multiplies every shake, kick, lens
    // punch and flash, `stop` every hitstop. 1.37 stacked a hit flash, a ring, sparks, dust and a
    // squash on top of a shake and a kick that were already there, and a fight read as the camera
    // having one, the 18 Sep 2026 note was "a bit too much". Turn these before touching the sixty
    // literal amounts in the code.
    screen: 0.6, stop: 0.7,
    // Which shakes are allowed at all. The 22 Sep 2026 note was "do not shake the screen on
    // effects, a little shake, only when you took damage", and it is right: a kill, a crate, a
    // door, a bomb and a gong all shook the picture, so the one shake that is information, you
    // have just lost a heart, was lost in the sixty that were decoration. `shakeOther` is the
    // multiplier on every shake that is NOT the goat being hurt (`game.shake(a, true)`), and it is
    // zero: the call sites all stay where they are, they simply do nothing until somebody turns
    // this back up. `kickOther` is the same idea for the directional shove, which reads as weight
    // rather than as an earthquake and so keeps a third of itself.
    shakeOther: 0, kickOther: 0.35,
    // `hurtStop` (6 Oct 2026, "a pause of 2-3 frames when you take damage, like Hollow Knight"): the hitstop on a
    // lost heart (`Goat.damage`), × `stop` like every other, so 0.06 is about 2.5 frames at 60.
    hitstop: 0.07, hurtStop: 0.06, shakeKill: 9, shakeHit: 6, shakeDecay: 12, deathSlow: 1.6, killSlow: 0.22,
    // The shake's shape (26 Sep 2026): smooth noise at `shakeFreq` Hz instead of a fresh random
    // spot every frame (a rattle), and as trauma² against `shakeRef` px, a shake that big is as big
    // as ever, a smaller one comes out smaller still. Never larger than before: "shake knocks you off".
    shakeFreq: 16, shakeRef: 7,
    // The world's own thuds (26 Sep 2026: "a small shake when the boss lands, or a barrel goes up"):
    // an ogre or rat ogre coming down, a bomb, a barrel, a poison blast. `game.thud`, `shakeThud` of
    // the call's amount, full within `thudNear` tiles of the goat and nothing past `thudFar`, so an
    // explosion across the room is a nudge and one off-screen is nothing. Always under a lost heart.
    shakeThud: 0.4, thudNear: 4, thudFar: 14,   // was 0.62: an ogre landing every few seconds shook a cave arena "claustrophobic" (2 Oct 2026)
    kick: 7, kickDecay: 11, kickMax: 15, // directional camera punch, thrown away from the impact
    // Halved on 26 Sep 2026 ("a little less zoom on the headbutt and the run, my head starts to spin").
    zoomKick: 0.025, zoomDecay: 7,      // the lens shoves in on a kill and settles back
    flashDecay: 6,                      // additive screen flash
    // Kills inside the window stack, and used to stretch time and shake the camera harder with
    // every one of them, which read as the game stumbling over its own feet at the exact moment
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
    // `hitFlash`: seconds a man the horns land on is painted solid white, the frame that says
    // "that connected" before the fling has moved him a pixel.
    hitFlash: 0.07,
    // `windupTint`: a man winding up a blow goes lighter as it comes (Cult of the Lamb, 24 Sep 2026):
    // his own sprite again over itself as a warm pale silhouette, at `max` alpha by the end of the
    // windup, eased in by `curve` (above 1 = holds back early, flares at the last), so the moment to
    // move reads off his body and not only off the strip on the floor. `warm` pushes the white toward
    // straw (a CSS saturate after a sepia; 0 is plain white, which is the hit flash's colour).
    // `states` are the telegraphs it rides on, every kind's committed wait before the blow lands.
    windupTint: { max: 0.55, curve: 1.6, warm: 2.6,
      states: ['windup', 'hookwind', 'slamwind', 'hopwind', 'cast', 'aim'] },
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
  // after the level rather than during it. `scale` multiplies the whole top band, hearts, rail,
  // count, clock, and nothing else: the cards, the menu and the floor text keep their own size.
  // `rail` (2 Oct 2026) is the skill chips' own size on top of that: the souls' little marks round the
  // chips went (they live in the book and the chip's note now), so the pictures carry it, a size up.
  // `minText`: no screen-space text under this many CSS px (the dev drawer floors itself at `dev.minText`);
  // what a phone shrank under it on 2 Oct 2026: the road's floor name on the death card, the touch
  // controls' MOVE / ROLL / CALL, the title rows' notes and RUN STATS' question.
  // `cape` (6 Oct 2026): the worn cape's own corner bottom left (`Renderer.drawCapeCorner`), `box` px a
  // side × `hs`, its foot `lift` px off the bottom (over the dev word and the seed); touch keeps the old chip.
  // `purse`: heaven's two counts (sacrifices, souls) are meta, so off the play HUD (6 Oct 2026, his ask)
  // but for `show` s after either changes, fading over the last `fade` s; always in heaven and the book.
  hud: { scale: 1.05, rail: 1.25, minText: 12, cape: { box: 52, lift: 82 }, purse: { show: 3.5, fade: 0.8 }, keyScale: 1.25 },
  // On touch the headbutt turns toward the likeliest man ahead of the stick: within `reach` tiles and
  // `cone` radians of it, and only one the goat can see (never a mist, a disguise or a man in the fog).
  touchAim: { reach: 5.2, cone: 0.95 },
  // The keyboard's aim (KEYBOARD ONLY, or J K L / Z X C pressed: `game.kbLive`). Running, the run snapped
  // like a thumb's (`cone` rad, `reach` tiles); standing still, wider and nearer (`still`), so a man a
  // step off one of the eight ways is still the one the horns go to. `mouseBack`: px of real mouse
  // travel that hands the aim back to the mouse.
  kbAim: { reach: 5.2, cone: 0.95, still: { cone: 1.6, reach: 3.2 }, mouseBack: 90, mouseGap: 0.3 },
  // The mouse pointer (`buttCursor`, js/game.js): the headbutt chip at `cell` CSS px a cell, `halo` round its ink.
  cursor: { cell: 2, halo: 'rgba(255,255,255,0.55)' },
  // A gamepad (`PadInput`, js/input.js). `dead` is the left stick's radial dead zone, `aimDead` the
  // right stick's (inside it the aim follows the run, snapped like a thumb's by `touchAim`); `wake`
  // how far a stick must be pushed to take the controls off the keyboard (a pad on the desk drifts);
  // `trigger` how far a trigger goes down to count as pressed. A right stick that is held aims with
  // a lighter snap than the thumb's (`assist`: radians and tiles). `navAt` is a stick push that walks
  // a menu, one row on the push and then one every `repeatEvery` s after `repeatAfter`. `rumble`
  // turns `game.vibe(ms)` into the motors: magnitude `ms / full` (floored at `min`) × `strong` / `weak`,
  // lasting `ms × stretch`.
  // `wakeMove`: a stick past `wake` takes the controls only while it is moving that much a frame
  // (30 Sep 2026: "sometimes the controls went"). A device that rests an axis at the end of its
  // travel, a wheel, a throttle, a pad with triggers on axes 2 / 3, took them every frame for good:
  // the mouse's aim and grab were gone while it was plugged in. A pad of the standard mapping wins.
  pad: {
    dead: 0.2, aimDead: 0.35, wake: 0.5, wakeMove: 0.04, trigger: 0.35,
    assist: { cone: 0.3, reach: 5.2 },
    navAt: 0.6, repeatAfter: 0.36, repeatEvery: 0.12,
    rumble: { full: 80, min: 0.25, strong: 0.8, weak: 0.5, stretch: 1.6 },
  },
  // THE FOG. A room is opened by walking into it and never closes again, that is `room.seen`. This
  // is the other half: what a partition hides from where he is standing right now. `shade` is how
  // far down anything out of his line of sight goes, and `radius` how far the line is cast at all
  // (past it the room is drawn as it always was, so a big hall does not end in a black wall).
  // `res` is how many pixels of the mask one tile gets before it is blown up over the world, which
  // is the whole of how soft the edge of a shadow is: at 1 a shadow fades over a tile and reads as
  // a smudge, and at 2 it fades over half of one and reads as an edge.
  // `shade` was 0.8: dark enough to hide a man standing still, not dark enough to hide one moving,
  // a red hood or a rifle's silhouette read through it from across a room that had not been opened,
  // which gave away what was coming before the door did. Raised to keep the room's contents a
  // shape you cannot name rather than one you can. 0.94 read as a hard black edge anywhere a forced-
  // lit patch (a secret niche) sat next to ordinary shadowcast, so backed off a step to 0.9, still
  // much darker than the original.
  // `oracle` is THE ORACLE's reach through stone, in tiles. Past it the ordinary cast still decides,
  // so the far corners of a room stay the dark they always were.
  // 23 Sep 2026: 0.9 → 0.8. A man behind a partition read as invisible while he could still hear
  // you, which the questionnaire called unfair rather than tense. Rooms nobody has opened are kept
  // by `drawUnseen`, not by this, so their contents stay unreadable either way.
  // 1 Oct 2026: the shade is soft (`soft`, the weight of a tile's neighbours in the 3x3 it is
  // averaged over; 0 is the old hard tiles) and a step lighter, 0.8 → 0.72: a playtester called the
  // dark squares aggressive. A whole shadow is still dark; a lone tile or a staircase edge is not.
  // `mem` (5 Oct 2026 playtest: "no hard cut-offs of rooms", "show only what he has seen himself"): a
  // room is no longer a black box until it is opened; every tile of a room's box he has never had in
  // sight (`world.mem`) is under the floor's fog, laid a pixel a tile and blurred up `soft` x, `blur`
  // tiles (`Renderer.drawMemFog`). Stone is let out of it `solid` steps from a face he has seen, so the
  // core of a block of wall is not left a hole. In a cave the same memory narrows the cave's fog,
  // rebuilt at most every `every` s while only the memory grew. `on` false is the old boxes.
  fog: { shade: 0.72, radius: 26, soft: 0.6, oracle: 11, mem: { on: true, soft: 4, blur: 0.7, solid: 2, every: 0.25 } },
  // THE DARK (`darkLevel`, drawn by `js/dark.js`): a floor of its own where only what burns lights a
  // room; the rest is `alpha` of `color` laid over it. `lights` are [radius in tiles, strength] per
  // source, cast through the tiles so no flame lights the far side of a wall. `near` is how far the
  // goat hears, in tiles: inside it the floor comes up to `floor` and whatever stands on it is a
  // silhouette (`sil`, `body`, a `rim` of cold light round it one world pixel wide), a shape, never a
  // colour or a face. `self` is the patch round the goat himself, [radius, strength], because the
  // player has to be able to read which way he is facing. `edge` is the stone round him inside his
  // hearing: every face where floor meets wall gets a line of `rim` (`Dark.walls`), strongest at his
  // feet and gone at `near`, so what he can run into is always drawn, the dark hides the men, never
  // the room. `eyes` are the kinds whose eyes catch what little light there is and can be seen
  // across a room: `range` tiles, in his line of sight, never from behind, `cell` world px a cell and
  // `glow` how much of a halo; per kind [core, glow, height above the foot, forward on a side view,
  // half the gap on a front one], sprite px.
  // THE LAMP, the level's canon: every room with men in it has `lamps.min`..`lamps.max` standing
  // lamps (two once its floor is `big` tiles), counting any flame its template already stands in it,
  // against a wall, `apart` from each other and `door` off a doorway. A standing lamp is the choice
  // the room hands you: it shows them to you and you to them, and a headbutt tips it, the oil burns
  // where it falls, and then the room is black. `sconce` is the other light: a lantern on the wall by
  // each way in and out of a room (never the near wall, which faces away), `lights.sconce` across,
  // that nothing puts out, the doorway is always where you can see, and where you can be seen.
  // The cult is in the same dark (`ai`, `Enemy.canSeeGoat`): out of the light a man sees the goat
  // `sight` tiles and no further (a hound a little more), and a lost trail goes cold in `lose` s,
  // after which he hunts by ear. `lit` is how much of a flame's reach counts as standing in it
  // (`game.litAt`). The seer paints his rune at what he hears, up to `earCast` tiles
  // (`Enemy.hearForRune`), never one inside `earOwn` tiles of himself or of a man of his, and only
  // while it is `earFresh` s old. No rifle is ever in it: a gun in the dark is a gun you cannot answer.
  // `fork` is THE FORK: the last room of LEVELS[`at`] has two flights of stairs cut into its far
  // wall, and the second of them (drawn cold, going up into black, `level.forkTile`) climbs to THE
  // DARK, played in place of the floor after it (THE THRESHING FLOOR, which has no kind of its own to
  // introduce and loses nothing the run needs to have met). `apart` is the least gap in rows between
  // the two flights. `band` is what `balance.js` holds THE DARK to: at least that share of the lit
  // floor's threat beside it, and under it, the dark is harder to read, so it deals fewer men.
  dark: {
    alpha: 0.98, color: [5, 4, 10], res: 3, flicker: 0.08, maxFires: 140,
    near: 4.5, floor: 0.33, sil: 0.94, body: '#07060c', rim: 'rgba(150,158,210,0.55)',
    // 5 Oct 2026 playtest (the goat lost in the black of a corridor): `self` [1.3, 0.62] → [1.5, 0.66],
    // `floor` 0.3 → 0.33, and on the move `run` (`floor`, `self`) eased in by his speed over `at` px/s.
    self: [1.5, 0.66], run: { at: 90, ease: 4, floor: 0.4, self: [2.4, 0.76] },
    edge: { alpha: 0.35, from: 0.35 },   // 0.85 until 25 Sep 2026: a bright frame round every wall read as a box
    // Flames reach further since 25 Sep 2026 ("a little more light"): brazier 4.8, lamp 4.2,
    // sconce 2.3, fire on the floor 2.4, a man alight 2.8.
    lights: { brazier: [5.4, 1], lamp: [4.7, 0.95], sconce: [2.8, 0.9], fire: [2.8, 0.85], burning: [3.1, 0.9], soul: [1.8, 0.55],
      bearer: [2.4, 0.6], exit: [3.4, 0.85], blast: [6, 1], muzzle: [3.4, 0.9], rune: [2.2, 0.55] },
    eyes: { range: 24, blinkGap: [2.2, 5.5], blinkTime: 0.13, cell: 2.2, glow: 0.65,
      kinds: { seer: ['#f6f0ff', '#8f6bff', 27, 5, 2.4], dog: ['#fff6b8', '#ffab3a', 16, 13, 2.6], wraith: ['#e6fbff', '#6fc3e8', 28, 4, 2.8] } },
    // `doorLit`: tiles within which a flame already lights a doorway in the near wall; past it one stands beside it.
    lamps: { min: 1, max: 2, big: 70, apart: 4, door: 2, doorLit: 3 },
    ai: { sight: { all: 3.5, dog: 5 }, lit: 0.75, lose: 1.2, earCast: 9, earOwn: 1.5, earFresh: 0.3 },
    fork: { at: 3, apart: 4, band: 0.6 },   // band 0.7 until the dark was thinned (25 Sep 2026)
  },
  // A worn patch of wall, once or twice a level: `chance2` is the odds of a second one once the
  // first has found a room, so most levels get one and some get two rather than every level getting
  // a guaranteed pair. `carveSecret` in gen.js does the finding; this is only ever the odds.
  // `healChance` is separate from finding the wall at all: most secrets are just the rack, and only
  // sometimes also the rarer, bigger patch of grass, a niche is not a guaranteed heart on top of
  // whatever it already hands over.
  // A floor's own `secrets: [lo, hi]` (THE YARD, THE CAVE) deals that many instead, `chance2` the clover's.
  // `deep`: the secret inside the secret (6 Oct 2026): `chance` of niches (`late` from floor index
  // `lateFrom`) have a second wall that gives at their back, onto a deeper niche of big grass, and a
  // cape beside it at `cape`.
  secret: { chance2: 0.35, healChance: 0.4, deep: { chance: 0.3, late: 0.4, lateFrom: 3, cape: 0.35 } },
  // THE CHASM (6 Oct 2026 playtest: "a small drop with spikes between the sides of a room, you have to roll
  // over it, and a word that E rolls over a drop too"; "and as a pattern, especially with rifles or the
  // butcher on the far side"). A band of drop one tile across, wall to wall, between the way in and the way
  // out (`carveChasm`, gen.js): the roll carries him over it (`Goat.update`), nobody else crosses (an animal
  // hops it, `Beast.hopGap`). A floor with `chasmLesson` (THE CAVE) cuts one in its first ordinary room from
  // `minRoom` that takes it and writes the roll on its floor; from floor index `from` a floor cuts one more at
  // `chance`, a room with a rifle or the butcher in it first, and stands those men on the far side (`farKinds`).
  // `margin`: tiles kept between it and either doorway; `lane`: rows of floor two tiles out on both sides
  // where he can run up and land; `clear`: tiles nothing stands from it.
  // `hop`: an animal over it, `time` s in the air, `h` px up, landing `land` tiles from the band's middle, only
  // walking at it within `square` of straight across.
  chasm: { minRoom: 2, from: 2, chance: 0.45, margin: 3, lane: 2, clear: 1.2, farKinds: ['hunter', 'champion'],
    hop: { time: 0.42, h: 14, land: 1.25, square: 0.45 } },
  // The vault (26 Sep 2026): never a soul any more ("a soul twice a level, in the middle and at the
  // end"); always big grass. What kind of vault a floor has is rolled off its own seed (`vaultKindOf`,
  // gen.js), weighted by `kinds`: `grass` is the old shut door and the grass behind it; `ambush` and
  // `mages` stand the door OPEN, and the moment he is `shutIn` tiles inside, it slams and `men` come
  // out at him, the ones by a wall through it, the rest dropped from above (dazed `land` s as they
  // hit the floor), and it opens again when none of them is left standing in the chamber (a man more
  // than a tile outside it stops counting, the seal's rule). Three mages in a 5x5 chamber is most of
  // the floor alight, on purpose. `mages` only once the mage has been met on an earlier floor.
  // `ogre` (30 Sep 2026 playtest: "one of the trap formats, a huge ogre in that little room, shut
  // behind an iron door of three blows"): the door is shut as the grass vault's is, but it gives in
  // `hits`, and what is behind it with the grass is the ogre, a boss, waiting for it to give
  // (`Enemy.caged`). Now and then, while the goat is within `tellR` tiles, something heavy leans on
  // the door from inside (every `tellGap` s): the one tell there is. Only once the ogre has been met,
  // and only off a room holding one of `needs` (a sword is a stand of swords): the horns do nothing to
  // him, so a room with none of them was a fight nothing in it could win (`ogreArmed`, gen.js).
  vault: { kinds: { grass: 0.4, ambush: 0.35, mages: 0.25, ogre: 0.3 }, shutIn: 1, land: 0.5,
    ambush: { men: 3, kind: 'bearer' }, mages: { men: 3, kind: 'seer' }, ogre: { hits: 3, tellR: 5, tellGap: 2.6, tellVary: 0.2, back: 0.6,
      needs: ['brazier', 'lamp', 'barrel', 'bomb', 'spire', 'sword'] } },
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
  // so in places it runs through the middle of a tile, diamonds for lone stones, long slants where
  // the tiles step, and bulges into the floor wherever a slow noise of `midScale` tiles rises past
  // `midFrom`; `midMax` (under one half) is how far into a floor tile it may reach at most.
  // `band` is how many tiles of rock are drawn out from the open floor. Past it the cave is fog,
  // the same way a square-walled level draws one tile of wall and leaves the rest of the hill dark:
  // a cave filled to the edges of the screen showed a great deal of level nobody can go into and
  // cost more to draw than everything standing on the floor put together.
  // `bandSide` is the same out to the left and right (1 Oct 2026, "smaller side outlines in the cave,
  // you don't need such big ones"): above and below the rock keeps `band` for the face and its spires.
  // `fog` (2 Oct 2026 playtest): in a cave everything not yet opened is fog, the rock round it too, with
  // `margin` tiles of rock shown round what is (`Renderer.drawCaveFog`); `on` false is the old boxes.
  cave: { fog: { on: true, margin: 1, soft: 4, blur: 0.8 }, band: 2, bandSide: 1, roundR: 16, erode: [2, 3], bump: 0.12, shape: 'mid', midScale: 4, midFrom: 0.15, midMax: 0.44,
    // THE SPIKES. Most of what grows on the rock is paint, see `Renderer.drawCaveDecor`, but a
    // few of the spires are real: stone teeth standing at the foot of a wall, which is the one
    // thing in a cave that looks as though it ought to hurt and so had better. `chance` is the odds
    // an ordinary room gets one at all (rarely, on purpose: a hazard you meet in every room is
    // furniture), `perRoom` the most it may ever get, `glint` how strongly the wet tips catch the
    // light so they are read before they are walked into, and `damage` the hearts the goat pays.
    // A man does not pay hearts: he dies on them, the way he dies on the grating.
    // `again`: seconds before the same tooth takes another heart off the same man. Without it a Seer
    // standing up on it died in two frames and the two-hit rule never got its beat.
    // `impale`: a kind in `kinds` is too big to die on the teeth. Coming down on them, touching
    // one in a state in `from` (a leap landed by a tooth, a stagger backed onto one), he is
    // caught; walking he only steps round it. Caught: a heart gone, stuck `time` s
    // (× the enemy clock) where nothing he has works, then he tears himself off `free` s staggered
    // and is spared the same teeth for `clear` s so he can walk off them. The goat baits it (25 Sep
    // 2026: "let it be a fun mechanic"), stand by a tooth, leave the spot while he is in the air.
    // `ring`: how many stand at the walls of the ogre's own arena on the cave (always, not by `chance`).
    // `warnR`: tiles from a tooth at which the goat sees its ring of amber cells (`drawSpire`), `cell`
    // world px a cell. `lesson`: the once-ever man walked onto a tooth (`Game.updateSpireLesson`).
    spikes: { chance: 0.3, perRoom: 1, ring: 2, glint: 0.5, damage: 1, again: 1, warnR: 2.2, cell: 3,
      lesson: { reach: 14, walk: 130, every: 0.25 },
      impale: { kinds: ['butcher', 'ratogre'], from: ['hopland', 'stagger', 'floored', 'stunned', 'flung'], time: 3, free: 0.5, clear: 2, shiver: 1.4 } },
    // What the rock wears (`Renderer.drawCaveDecor`, `drawFloorShrooms`), as the share of the edge
    // tiles that grow each thing: `drips` stalactites on the far wall, `spires` the stone standing up
    // off the top of the rock, `crystals` a seam on the face. The trip adds `fur`, the glowing
    // mushrooms along the rock's edge, and `floor`, the share of floor tiles with a clump. 24 Sep 2026:
    // mushrooms and crystals a third fewer (fur 0.88 → 0.62, floor 0.1 → 0.07, crystals 0.16 → 0.11
    // and 0.1 → 0.07), their look, colours and glow exactly as they were - "они были прекрасны".
    // `gems` is small glowing crystals on top of the rock among the fur (asked for on the trip; the
    // plain cave has none, set it above 0 to give it some). The floor clumps are the fur's own
    // mushrooms since then, so the painted clump is only ever the big one you can break.
    look: {
      cave: { drips: 0.28, spires: 0.3, crystals: 0.11, gems: 0 },
      trip: { drips: 0.2, spires: 0.2, crystals: 0.07, fur: 0.62, floor: 0.07, gems: 0.3 },
    } },
  // Tall grass (level eight), Cult of the Lamb's: it stands over whatever is in it, so a body in it
  // shows from the waist up, and the goat's own eye stops at it, `seeInto` tiles of it are lit from
  // where he stands and the rest of the patch, and what is behind it, is shade. It hides him the same
  // way: a man further than `hideR` tiles off does not see a goat standing in grass, whatever his cone
  // says. A headbutt cuts what is in front of it (`cutR`), fire burns it off, and `lurk` of the men
  // put in a room with a patch in it are put down in the patch instead, still and half-hidden.
  // `patch` is how many patches an ordinary room gets when it gets any, `size` the tiles in one.
  // `burn` is how long a tile of it stands alight before it is ash, `spread` how soon it hands the
  // fire to the grass beside it (hay is `fire.spread`), a patch goes up as a front, not all at once.
  // `hideR` is the exposed ring, not a stealth one: smaller hides more, since it shrinks how close a
  // man has to stand before his cone can find you at all and grows the ring past it where he never can.
  grass: { seeInto: 1.5, hideR: 2.15, cutR: 1.3, lurk: 0.3, lurkAlpha: 0.55, patch: [1, 3], size: [5, 12], sway: 1.6,
    burn: 2.6, spread: 0.3 },
  // THE SHOP. The mouse does not take the dead any more, and she is not on every level: she turns
  // up on the levels in `levels` (indices, THE YARD, THE ROAD, THE BRIDGE) and stands
  // in the level's MIDDLE soul gate in place of the soul that room would have held (see `gates` on
  // `LEVELS`). Her offer is free and it is a choice: `wares` talismans on her stools, one of them
  // yours, the other packed away the moment you reach for one, and taking it is what lifts the
  // gate out of her room. Each visit stocks the next tier (the first of `levels` is tier one, the
  // second tier two...), so the third mouse of a run is selling the room rewritten. Her third offer is a pail
  // of milk holding `heals` hearts, drunk a heart at a time where it stands. `strikes` is the blows
  // she takes before she turns; the rat ogre's shelf is free once he is down, and still one choice.
  // `spread` is tiles between the milk and each talisman in the row she lays out in front of herself.
  // The mushrooms. `chance` a level (from level index `from`, never the last) that a tuft of them
  // (`from` 3 since 26 Sep 2026: THE ROAD on, so the first evening's second and third floors are
  // the game itself and never THE TRIP; LEVELS still plays it anywhere)
  // lies somewhere on an ordinary room's floor, plain enough to walk past; standing within `eatR`
  // tiles of it eats it, and the next level is THE TRIP (`tripLevel`).
  //
  // What stands in it does not scale with the floor it replaced. Whichever level the mushrooms are
  // eaten on, the trip is fought at the FIRST level's curve, `threatMul` of it, with `men` to a
  // room and nothing in `kinds` that shoots: with the stick reversed and the buttons swapped, a
  // rifle is not a harder version of a clubman, it is a death you cannot answer with hands that no
  // longer do what you tell them. Mages are allowed, because a rune is a place on the floor and
  // walking out of a place is the one thing the scrambled controls still let you do badly but do.
  // The 22 Sep 2026 note was "very hard with the controls", and this is the answer to it: the
  // controls are the difficulty of the level and nothing else is asked to be.
  // THE CHASE (6 Oct 2026, js/chase.js), the first level modifier (`LEVEL_MODS`, `levelDef.mods`): "a red
  // screen comes slowly from the left until it takes 20% of the screen, and men run out of it". A pressure
  // 0..1 a floor: it grows `1 / fill` a second (after `grace` s, × `fightMul` while one of the floor's own men
  // is after him within `fightR` tiles: fighting the room is not dawdling, and THE ROAD's rooms are fought),
  // and every tile of new best distance toward the stairs (the exit field) takes `perTile` off it. Measured
  // against THE ROAD (14 rooms, ~430 tiles from the start to the stairs, ~31 a room; the goat runs ~4 tiles
  // a second): a room fought for about 16 s and crossed at a run holds it level, quicker pays it down, and
  // standing still fills it in `fill` s. Simulated over the floor (rooms of 12 s, set pieces 25 s) it only
  // passes `spawn.from` in the set pieces, ~50 s of the floor; at 20 s / 35 s it is over it for ~300 s; a
  // runner (6 s rooms) never sees a man. `band` of the screen's width at full; `ease` how fast the drawing follows.
  chase: { grace: 4, fill: 34, fightMul: 0.55, fightR: 9, perTile: 0.016, band: 0.2, ease: 2.5,
    // Men come out of it from `from` pressure: one every `gap[0]` s there, down to `gap[1]` s at full, with at
    // most `cap[0]`..`cap[1]` of them alive at once. A tile to stand one on: inside the band on screen (else the
    // floor behind him off it), `minR` tiles from the goat or more, `minD`..`maxD` tiles' walk from him, and at
    // least `behind` tiles further from the stairs than he is, so nobody comes out of the way ahead.
    spawn: { from: 0.4, gap: [6.5, 2.2], cap: [2, 5], minR: 6, minD: 5, maxD: 30, behind: 2, slack: 2 },
    // Who: weights, only kinds the floor's own crowd has (a clubman always). The rifle and the butcher only
    // past `heavyFrom`: the price of letting it fill, never of a long fight.
    kinds: { bearer: 6, dog: 3, seer: 0.7, hunter: 0.6, champion: 0.5 }, heavy: ['hunter', 'champion'], heavyFrom: 0.75,
    // A chaser who lost him or was lured by the scream is put back on his trail after `scent` s; one left
    // `drop.d` tiles behind (or walled off) and out of the picture for `drop.t` s is let go, no body.
    scent: 2.5, drop: { d: 40, t: 4 },
    cue: { gap: 18 },   // the low toll when men first come out of it, at most every `gap` s
    banner: { time: 4.2, fade: 0.8 },   // THEY ARE COMING. KEEP RUNNING. over the top of the picture
    // The picture: square cells `cell` CSS px, an edge ragged by up to `ragged` cells and re-cut `rate` times a
    // second, the field at `alpha` (men inside it read as shapes), `motes` embers off the edge, and past
    // `tintFrom` a red over the whole frame up to `tint`; the top `hud` px (× the HUD scale) of it near black, under the hearts; never nearer the goat than `clear` tiles.
    look: { cell: 5, ragged: 3, rate: 7, alpha: 0.8, motes: 26, tint: 0.1, tintFrom: 0.6, hud: 38, clear: 1.5 },
  },
  shroom: { chance: 0.45, from: 3, eatR: 0.75, eatTime: 1.6, threatMul: 1, men: 1, kinds: ['bearer', 'seer'],
    // The lens on the trip, on top of `drawTrip`'s own warp: how far the picture breathes in and out
    // (`zoom`, a share of the zoom) and how fast, and how far it leans (`sway` px). It is the camera
    // and not the screen, nothing here is a shake, which the goat only ever gets for a lost heart.
    cam: { zoom: 0.055, rate: 0.55, sway: 7, swayRate: 0.31 },
    // Seconds added to the goat's fire tick on the trip: with the hands scrambled, getting out of a
    // flame takes longer, and the flame waits for him.
    burnDelay: 1,
    // On the trip half the blows that land on him never did: he was standing somewhere else all
    // along. `chance` of a hit is undone and he is `dist` tiles away from where it came from, with a
    // line to say so. Never a fall, the hole is real.
    phase: { chance: 0.5, dist: 2.6, text: 'OH, I WAS ACTUALLY OVER HERE' },
    // Across the screen as the trip begins, so the player knows the wrongness is the floor and not the game.
    banner: { time: 4.5, fade: 0.8, text: 'WHOOOOAAA, YOU ARE ON MUSHROOOOMS...' },
    // And on the floor after it, still and plain, so the controls coming back read as the floor
    // telling him and not as the game misbehaving (26 Sep 2026: the first seconds back felt strange).
    back: { time: 3.5, fade: 0.6, text: 'YOUR HOOVES ARE YOUR OWN AGAIN' } },
  // `dlg`: walking within `r` tiles of her or her shelf opens her offer as cards (`Codex.watchShop`,
  // 1 Oct 2026: "when you come up to her she shows it all in a dialog, like the souls"); looked away
  // from, it opens again only once he has been `out` tiles off; a press inside `arm` s is not a pick.
  // `rare[n]`: the chance that a talisman on the n-th mouse's shelf of a run is its RARE tier, where it has
  // one (`stockFor`); the first mouse sells COMMON only (6 Oct 2026, two grades in place of the n-th mouse
  // selling tier n).
  shop: { levels: [1, 3, 5], wares: 2, rare: [0, 0.45, 0.8], heals: 3, strikes: 3, spread: 1.5, dlg: { r: 2.2, out: 3.6, arm: 0.35 },
    // The boomerang in flight: its speed, its size against a man, and how long the way back may
    // take before it simply arrives (it curves home through anything; this is the belt to that).
    boomerang: { speed: 11 * TILE, r: 8, homeMax: 3.0 } },
  // The talismans worn at once (6 Oct 2026: "up to three in a run"). A fourth taken puts the oldest back
  // on the stool it came from (`Shop.take`). `charm`: each is a small pixel charm on the collar's near
  // half (`PaintedArt.collar`), at `at` of the way round it (0 one end, 1 the other), in the order taken.
  talisman: { slots: 3, charm: { at: [[0.5], [0.3, 0.7], [0.18, 0.5, 0.82]], drop: 1.2 } },
  // THE CAPES (`CAPES`, js/capes.js, js/cape-pixels.js). `shopChance`: a mouse's shelf offers one in place
  // of one talisman (`stockFor`). `sway`: the hem's swing on the run, `rate` steps a second.
  // `wind` (6 Oct 2026, "more in the wind", "billow up more"): the cloth flaps (`CAPE_PIXELS.draw`), in cells,
  // at `k` his speed over his stride. From the side, rows below `from` of its height stream back `trail` cells
  // at the hem and ripple `wave` cells in a wave `freq` rad/s travelling `phase` a row, and the end rises up
  // to `rise` cells (± `riseWave`) over his back; from the front and behind it spreads `spread` cells a side
  // and the hem lifts `lift` rows. Standing, `idle` cells of ripple and `idleRise` of lift at `idleFreq`.
  // `ruin`: the shock's look (`Cape.ruin`), a ring `ring` tiles out and `parts` cells of rubble. `sprout`:
  // where the tuft may stand, searched out to `search` tiles from the spot ahead of him.
  cape: { shopChance: 0.4, sway: { rate: 7, run: 60 },
    wind: { from: 0.25, trail: 3, rise: 4, riseWave: 1.2, idleRise: 0.8, spread: 2, lift: 1, wave: 1.4, freq: 11, phase: 0.9, idle: 0.6, idleFreq: 2.4 },
    ruin: { ring: 1, parts: 26, shake: 7, stagger: 0.6 }, sprout: { search: 2 } },
  // THE CLAMP. A room two behind the goat, with nobody alive left in it, is shut for good: its way
  // out goes back to stone under a veil of dark and the room goes black (`game.updateClamps`). The
  // room he has just come out of stays open, that is the one you can still step back into. `slam`
  // is a third of how long the dark takes to come down, `hear` how many tiles off it is heard.
  // `say`: s the first clamp's NO WAY BACK rides over him (once a browser). `cell`: world px a texel of the veil
  // in the mouth (`Renderer.drawVeil`, pixels since 6 Oct 2026).
  clamp: { slam: 0.35, hear: 14, say: 4.5, cell: 3 },
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
    // the sacking comes off them in the pen. The bleats are the through-line, `bleat` is the
    // gap between them in each screen, and it closes as the run goes on, so what was two animals
    // calling to each other across a field is by the last screen two animals calling into
    // nothing. `roadSpeed` is how fast the road goes past; `bounce` how much the truck jolts.
    // The meadow has two halves. Until `meet` they are at opposite ends of the field, each grazing an
    // end of his own and calling to nobody; then they walk to each other, the heart comes up
    // between them, and from there they stand together and answer each other, `answer` is
    // how quickly the second bleat follows the first once they have met. People care about the
    // pen because they saw the field, and they care about the field because they saw it start.
    prologue: {
      meadow: 11.0, meet: 4.2, answer: 0.5, road: 7.0, dark: 3.4, cloth: 1.0,
      bleat: { meadow: 2.4, road: 1.4, dark: 0.62 },
      roadSpeed: 420, bounce: 2.2, zoom: 1.35,
      // The field (26 Sep 2026: they used to spin on small loops too slow for the walk frames, so
      // they slid about unwalking, and the pen stood half in the sky). Each walks at `walk` px/s,
      // over the pace the sprites start stepping at, between spots of his own end of it (`roam`:
      // a centre each, `rx` / `ry` its reach), grazing `graze` s at each; from `meet` both walk to
      // `meetAt` px either side of the middle, turn to each other, and the heart comes up over
      // `heartIn` s. `wheelSpin` is the truck's wheels in rad/s: the rolling rate strobed the spokes.
      walk: 46, graze: [0.7, 1.8], roam: { goat: [-104, 8], ewe: [104, -4], rx: 40, ry: 26 }, meetAt: 20, heartIn: 0.5,
      wheelSpin: 9,
      // A black screen and three words before the field fades up, nothing else in the game opens
      // on black, so this is the one place a player has to be told what kind of scene they are
      // looking at. Held, then the meadow bleeds through it over the second half.
      titleCard: 2.6,
    },
  },
  // The first gate of the run, seen being shut on him (`LEVELS[0].blessGate`, `game.bless`, 26 Sep
  // 2026): walking into its rest room the goat finds the mage who carried her off in the opening
  // scene still in it, her under his arm, giving the man there the gate's soul, and the soul is what
  // makes that man the keeper (until then a plain clubman holding his mark). Then the mage runs on
  // through the gate and it shuts behind him. Seconds per beat from the moment the goat is in the
  // doorway: `see`, she calls, he turns; `hold`, the mage's first word; `fly`, the soul crossing
  // to the keeper after the second; `go`, the beat before the mage runs for the gate at `run` px/s.
  // The gate swings open over `open` s as he reaches it and shuts over `shut` s once he is `past`
  // tiles through; `after` is the keeper's word before the room is his. `side` is how many tiles
  // from the keeper toward the gate the mage stands, `walkIn` how far into the room the goat is
  // walked (tiles past the doorway), `cap` the most the scene may last whatever happens, and a scene
  // watched once (`BLESS_KEY`) gives way to a click after `skipAfter`. `bars` is the letterbox,
  // a share of the screen's height, in over `barsIn` s; `zoom` how far the camera comes in on them.
  bless: { side: 2.4, walkIn: 1, zoom: 1.3, see: 0.9, hold: 1.1, fly: 0.8, go: 0.5, run: 150, open: 0.18, past: 1.2,
    shut: 0.3, after: 0.9, cap: 10, skipAfter: 0.5, bars: 0.075, barsIn: 0.3 },
  // The way out is a flight of stairs. The goat climbs them for a moment before the cards, and on
  // the next level it comes up another flight into the first room.
  stairs: { climb: 0.85, climbSpeed: 2.2 * TILE, rise: 16, arrive: 1.1 },
  // Barks: one man at a time, and never the same man twice in a hurry. Quieter than it was, the
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
  // the hats, with a rifle awake anywhere on the level it was the loudest thing in the mix and the
  // music underneath it stopped being audible at all. A third of the gain and half as often: still
  // the one dry tick in the bar that nothing else makes, now under the drums rather than over them.
  // `sfx` came down a fifth from 1.05: the swings, thuds and hits of an ordinary fight were louder
  // than the drums under them, which is backwards for a bus that fires on every blow rather than
  // once a bar. 1.66 took it down again, 0.85 to 0.45 (about 6 dB): "very loud" was the playtest.
  // `musicDefault` is where the MUSIC VOLUME slider starts (0.5 is these levels as tuned): 0.35, about
  // 3 dB under, since 3 Oct 2026, playtesters turned the music well down on their own.
  audio: { master: 0.92, drums: 1.0, sfx: 0.45, music: 0.85, musicDefault: 0.35, crowd: { warm: 3, hot: 6 },
    hunterCue: { gain: 0.04, everyBars: 4 },
    // A score cut off mid-note (a death, a cue, the title) dips under the stop for `cut` s: a hard
    // stop on a sounding oscillator clicks.
    cut: 0.03,
    // How far ahead of the ear the score is laid (`GameAudio.schedule`, every 25 ms off the main thread's
    // own timer). At 0.12 s any stall longer than a tenth of a second, a busy machine or the collector,
    // skipped the steps that fell due in it: notes cut off and the men's ticks out of time (2 Oct 2026).
    // Further ahead is safer and slower to answer: a kill's accent and a cue reach the ear that much later.
    ahead: 0.25,
    // The enemies' layer over the tune (MUSIC.md). 1.70 thinned it: a man is one hit per two bars (a
    // big one two), a family stops at `maxPerFamily`, and `exploreMix` is how much of it plays while
    // nobody in the room knows he is there. It was six a family, two hits for a rifle and three for a
    // butcher, at 0.65 / 0.6, a full room was a wall of ticks laid over the melody.
    // `eventGridSteps` is where a kill's accent lands (the next eighth; it waited one to two seconds),
    // `heartSing` how much of the tune is left on the last heart.
    layers: { maxPerFamily: 3, maxSpikes: 2, maxMills: 2, pursuitRadius: 8 * TILE,
      sampleSeconds: 0.1, fadeSeconds: 0.30, gain: 0.55, exploreMix: 0.45,
      fullGainVoices: 8,
      hitBudgets: { small: [0,1,2,3], ranged: [0,1,2,3], large: [0,2,3,4], trap: [0,1,2], mill: [0,2,3] },
      spottedBars: 2, combatHoldBars: 2, calmBars: 1,
      heavyBodyGain: 0.12, heavyEdgeGain: 0.045,
      eventGridSteps: 2, eventQueueCap: 12, eventStackCap: 3,
      killGain: 0.1, clearGain: 0.1, spottedGain: 0.12, heartSing: 0.45,
      lateFromLevel: 5,
      // Out of a fight from the second floor on (26 Sep 2026: "a lot of the same sounds, it tires
      // you"): while nobody is after him the score is thinner, each is what is left of that part
      // at full calm (`stageMix.idle`): the kick, the bed's toms, the idle stage's plucked figure,
      // the men's own layer (on top of `exploreMix`) and the tune itself, kept nearly whole.
      // 30 Sep 2026 playtest: "out of a fight the music should be far less intense, so that when a
      // fight or a chase starts you really feel it". The calm is deeper (it was kick 0.45, toms 0.25,
      // motif 0.3, layers 0.45, tune 0.85), the bass line and the drone thin with it (`bass`, `pad`),
      // and level one takes `first` of it (it took none). The fight's own drums and the sting that
      // says you were seen come up to meet it (`fight`, `spottedGain` 0.07 → 0.12).
      // 1 Oct 2026: "the base music of the first three floors calmer, like the meadow", level one
      // takes the whole calm now (`first` was 0.6), as the meadow does.
      // 1 Oct 2026, later: calm is fewer parts, never the same parts quieter or slower ("simpler by
      // count, not by stretching"). Out of a fight the kick, the toms, the plucked figure and the men's
      // layer are gone (0), the tune, the drone and the bass play whole, and past `sparse` of the calm
      // the bass keeps only its notes on `bassBeats`. A chase or a fight brings every part back.
      calm: { kick: 0, toms: 0, motif: 0, layers: 0, tune: 1, bass: 1, pad: 1, sparse: 0.5, bassBeats: [0, 8], first: 1 },
      // 5 Oct 2026 playtest, the STEALTH test: the score answers a sneak with a hush, fewer parts again, never
      // slower or merely quieter. Eased in on `GameAudio.hushMix`: the tune keeps `tune` of itself, the bass
      // only its `bassBeats` (one note a bar), the bed's toms `toms`; the drone carries the held breath.
      hush: { tune: 0, toms: 0, bassBeats: [0] },
      // 2 Oct 2026, "a bigger difference between a fight and peace": peace is already down to the flute, the
      // drone and two bass notes a bar, so the gap is widened on the fight's side by count: the kick on every
      // quarter and its pickups (`kickBeats`, it was 6 and 14 over the bed's 0 and 8), a low tom (`lowBeats`),
      // and the chase gets a kick of its own on the backbeats (`chaseKickBeats`) so it sits between the two.
      // The hats are out (`hat`, `chaseHat` 0; 2 Oct 2026 playtest: "a high, frequent crackle near an enemy,
      // it gets on the nerves"): a hiss on every off-eighth was that crackle. The kick, toms and rim carry it.
      fight: { kick: 0.34, kickBeats: [4, 6, 12, 14], tom: 0.36, low: 0.3, lowBeats: [10], rim: 0.09, hat: 0,
        chaseHat: 0, chaseKick: 0.2, chaseKickBeats: [4, 12] } },
    // The score's clock: one tempo everywhere. A floor's tempo (96 on the meadow rising to 124, a fight
    // lifting it) was tried on 1 Oct 2026 and taken out the same day, "out of a fight it is just
    // stretched; it should be simpler by count, not by stretching". Calm is `layers.calm`'s job.
    bpm: 118,
    // The score's low-pass (`GameAudio.scoreTone`): `open` Hz as a rule, `heart` on the last heart (the
    // music under water; `glide` s to get there), and a dip to `hurt` Hz on every heart lost, back up
    // over `back` s. The effects are not in it: the blow itself stays sharp.
    tone: { open: 18000, heart: 900, glide: 0.35, hurt: 380, back: 0.9 },
    // The rooms' own sound (`GameAudio.updateAmbience`), on the effects slider: `gain` over all of it.
    // `beds` is each canon's loop (`air`, `cave`, `wind` from `Foley.loop`), its level and how often
    // water drips (1 is every `drip.gap` s). `fire` is the crackle of whatever burns within `radius`
    // tiles, weighed `lit` for a bowl, lamp or lantern, `tile` a burning tile and `man` a burning man.
    // `far` is the cult drumming somewhere else in the compound, every `gap` s while nothing is after
    // him; `grass` the milk grass calling within `radius` tiles when he has a heart to fill; `heart`
    // his heart on the last one (`dub` the second beat's share). `lab` is a bed's level in the lab.
    // `fight` is how much of all of it is left while anybody is after him (1 Oct 2026: "at moments
    // there is too much of the surroundings"), sunk over `fightIn` s; the drips stop under a fight.
    ambience: { gain: 0.075, every: 0.15, fade: 1.5, lab: 0.5, fight: 0.4, fightIn: 0.6,
      beds: { stone: { loop: 'air', gain: 0.5, drips: 0 }, fire: { loop: 'air', gain: 0.4, drips: 0 },
        hollow: { loop: 'cave', gain: 0.6, drips: 1 }, line: { loop: 'wind', gain: 0.35, drips: 0 },
        open: { loop: 'wind', gain: 0.3, drips: 0 }, funnel: { loop: 'wind', gain: 0.4, drips: 0 },
        drop: { loop: 'wind', gain: 0.6, drips: 0 }, niche: { loop: 'air', gain: 0.55, drips: 0.4 },
        lamp: { loop: 'air', gain: 0.4, drips: 0.5 }, trip: { loop: 'cave', gain: 0.45, drips: 0.8 },
        // THE PASTURE ABOVE (js/heaven.js): a choir breathing a chord, far off.
        heaven: { loop: 'choir', gain: 0.55, drips: 0 } },
      fire: { gain: 1.5, radius: 7, lit: 0.35, tile: 0.12, man: 0.6, glide: 0.25 },
      drip: { gap: [1.5, 5], gain: 0.7, wet: 0.25 },
      far: { gap: [40, 90], gain: 0.9, wet: 0.2 },
      grass: { radius: 4, gap: [2.5, 5], gain: 0.5 },
      heart: { gain: 0.26, dub: 0.6 } },
    // The effects (js/foley.js). `takes` recordings of each are rendered and one is picked every time,
    // nudged up to `pitch` in speed and `level` in loudness: the same blow twice running is what a
    // machine sounds like. `warmGap` s between background renders where there is no idle callback.
    // `hooves` is the goat's own step while he runs (0 is silent), `barkGap` the fewest seconds
    // between two barks from the whole pack, so three hounds are a pack and not a drum roll.
    // `hoofSide` swings every other step a hair across the speakers (`pan`) and in pitch (`rate`):
    // four feet under him, and the same foot twice in a row is a metronome. `groan` is a man's last
    // breath as he dies (`sfxGroan`, never on a knockdown): `gain` its level, `gap` the fewest
    // seconds between two (a bomb kills five, one groan says it), `delay` s after the blow so it
    // comes after the body's drop in `death` (1 Oct 2026; it was 0.05 under the splat), `dog` the hound's whine against it, `rate` the bigger throats' pitch.
    // `stack`: one sound stacked on itself inside `window` s is `mul` quieter each copy, and past
    // `max` copies is dropped (a bomb's splats, a supper landing, the clatter of a suit of armour).
    foley: { takes: 3, pitch: 0.06, level: 0.12, warmGap: 0.05, hooves: 0.075, barkGap: 0.16,
      stack: { window: 0.06, mul: 0.6, max: 3 },
      hoofSide: { pan: 0.08, rate: 0.035 },
      groan: { gain: 0.14, gap: 0.14, delay: 0.2, takes: 4, dog: 0.8, wet: 0.03, rate: { butcher: 0.74, ratogre: 0.66 } } },
    // The one room everything is heard in: `decay` s to silence, `damp` how much darker its tail
    // gets, `sfx` / `music` how much of each bus goes into it and `level` how much comes back out.
    // A small close room since 1.66 (it was 1.4 s of stone at 0.3 / 0.2 / 0.8, and every blow and the
    // whole score sat at the far end of a hall): a cell, and not much sent into it.
    room: { decay: 0.32, damp: 1.4, sfx: 0.07, music: 0.06, level: 0.6 },
    // A man's death above everything (1 Oct 2026: "the death of an enemy has to stand out";
    // `GameAudio.sfxDeath`, `spotlight`). `gain` the death's own level, `near` the least of it however
    // far off he fell, `key` the unducked bus (death, last breath, a chain's bone bar) against the
    // effects slider. Round it `duck` is what is left of the score, the other effects and the room's
    // sound, reached in `attack` s, held `hold` s and given back over `release` s; an ogre or a chain
    // of kills deepens and lengthens it: × `big` for an ogre, × `chain` for a chain, × `quiet` where the
    // fall or the wraith keeps its own sound; however deep, a bed never goes under `floor` nor a death's
    // weight past `deepest`, and the death's own level past `gainMax` of `gain`.
    // 6 Oct 2026 ("a clearer, more distinctive sound when an enemy dies"): `gain` 0.95 → 1.1, the
    // duck deeper (score 0.5 → 0.42, sfx 0.55 → 0.48) and longer (`hold` 0.14 → 0.18, `release`
    // 0.45 → 0.55); `takes` the death's bank (each its own crack, gasp and drop round the one fixed
    // mark), `heavy` the kinds that fall as `death`'s `big` take (by `Enemy` flag or `kind`).
    spotlight: { gain: 1.1, near: 0.55, key: 1.15, attack: 0.012, hold: 0.18, release: 0.55,
      big: 1.4, chain: 1.15, quiet: 0.8, floor: 0.05, deepest: 1.4, gainMax: 1.3, takes: 6,
      heavy: ['butcher', 'ratogre', 'champion', 'thrower', 'shieldman'],
      duck: { score: 0.42, sfx: 0.48, amb: 0.2 } },
    // How a sound that knows where it came from falls off, in tiles from the goat: whole inside
    // `near`, down to `floor` of itself at `far`, and all the way to one side at `pan`.
    space: { near: 4, far: 20, floor: 0.12, pan: 14 } },
  // The lead point is carried rather than read: on a mouse the aim flips the instant the pointer
  // crosses the goat, and a lead that flips with it throws the whole picture across the screen.
  // `leadLerp` is how fast the camera agrees to the new side, `leadStill` how much of the lead a
  // goat who is not running gets at all.
  // `deadzone` is the window round the follow point the goat can move inside before the camera
  // bothers to react at all, without it every step, however small, re-centres the whole picture,
  // which is what reads as a shiver rather than a pan. `fitMargin` is the room a small room keeps
  // round its walls when it is held centred instead of tracked; see `updateCamera`.
  // `zoomFast` is how far the view pulls out at a full run: 0.88 until 26 Sep 2026, when the pull and
  // the headbutt's punch together made the playtester dizzy.
  // Softer all round (2 Oct 2026 playtest: "in some rooms the camera shakes like mad as he moves, make it much
  // smoother"). Measured walking every room of THE YARD and THE CAVE end to end and back (the picture's
  // acceleration a frame, and how often it turned back on itself): 0.119 → 0.047, 31 turn-backs → 4. Was lerp 7,
  // leadLerp 3.4, zoomFast 0.94 (every start and stop pumped the lens 6%), zoomLerp 1.6, deadzone 0.55 tiles,
  // blend 3.2 (the hold let go anywhere within three tiles of a door, and a small room swam), holdLerp 4.
  camera: { lead: 2.4 * TILE, lerp: 3.5, leadLerp: 1.8, leadStill: 0.3, zoomRest: 1.0, zoomFast: 0.985, zoomLerp: 1.0,
    deadzone: 0.8 * TILE, fitMargin: 2 * TILE,
    // Framing the fight (GMTK's "How to Make a Good 2D Camera", 26 Sep 2026). In a room too big to
    // hold whole, an awake boss within `near` of the goat pulls the follow point `pull` of the way
    // toward him (never more than `max`) and backs the lens out to `zoom`, eased in and out at
    // `ease`/s, so he and the wall behind him are in the picture: the wall is the weapon.
    // `follow`: how fast the point it pulls toward follows the boss (2 Oct 2026: a leaping ogre shook it).
    fight: { pull: 0.22, max: 3 * TILE, zoom: 0.9, near: 12 * TILE, ease: 1.2, follow: 1.6 },
    // The leash: however fast he goes (a roll, a leapfrog, a blast throwing him), the goat never
    // gets much further from the middle of the picture than `leash` of the half-view: past it the
    // camera closes the gap at `leashLerp`/s. Walking never reaches it.
    leash: 0.62, leashLerp: 14,
    // A room that fits is held by a blend, not a switch (1 Oct 2026; it was `roomLerp` / `roomEase`, a
    // softened lurch each time the target jumped to a room's middle and back). The hold is how far he
    // is from the room's nearest way out: none within `blendIn` px of a doorway, all of it `blend`
    // tiles further in, smoothstepped, eased at `holdLerp`/s. So a doorway is the goat's own framing
    // on both sides of it, and walking in slides the picture to the room's middle.
    blend: 1.6, blendIn: 0.4 * TILE, holdLerp: 2.0 },
  // A score is time first and bodies second, so that running is never the wrong answer: pace against
  // par is the whole of it and kills only multiply. Par for a level is its rooms times `perRoom`.
  // Dev only. A death is a burst when its last two hearts went inside `burstGap` seconds of each
  // other, and a bleed when they went further apart: the dev drawer counts both, and the run code
  // carries the gap, to say whether `goat.invuln` or the heart count is the lever (BACKLOG, 16 Sep).
  // THE CHANDELIER (29 Sep 2026, Enter the Gungeon's): an iron ring of candles hung `z` px over the
  // floor by a rope tied off at a cleat on the far wall (`TUNING.prop.cleat`). Up to `perLevel` a
  // floor, `chance` a room that may hold one, never nearer the far wall than `fromWall` tiles. Cut, it
  // drops at `gravity` px/s² and lands on everything within `killR` px: a man is crushed (the
  // two-hit kinds lose a heart), the goat loses a heart, a table under it goes to planks, and the
  // candles light the floor `fireR` tiles round for `fireFor` s. What is left lies there, harmless.
  // `texel` is world px a pixel of its sprite (and of the cleat's): bigger than the props' own grain,
  // it is the one thing in a room that hangs over everybody.
  // THE MAGNET's orbit (`ARTIFACTS` magnet, js/talismans.js): `orbitR` px from him, `spin` rad/s, a
  // thing pulled in over `pull` s and carried `lift` px off the floor; one meets a bullet within `hitR`
  // px; the man whose blow it stopped is dazed `daze` s.
  magnet: { orbitR: 38, spin: 3.2, pull: 0.4, lift: 12, hitR: 12, daze: 0.6 },
  // `look` (2 Oct 2026, "less on the screen, clearer where it falls and what it is tied to"): the ring
  // hangs `z` 64 (was 84) at `ring` world px a texel (was the cleat's 2), at least `fromWall` 4 rows off
  // the far wall (was 3) so it never covers its own cleat; it drops to `fade` alpha while it covers the goat or a man; the rope is `rope` texels thick at `ropeA`
  // alpha, and once the goat is within `warnR` px of the cleat the rope, the cleat and an amber ring of
  // cells where it lands (`killR`) come up; while it falls that ring fills.
  // `nearDoor`: the ring within that many columns of a way in or out; `byDoor`: the cleat within that many
  // of one (2 Oct 2026 playtest, the rope runs across the room); `reach`: columns between them at most.
  chandelier: { chance: 0.3, perLevel: 2, fromWall: 4, nearDoor: 5, byDoor: 2, reach: 9, z: 64, texel: 2, gravity: 1500, killR: 34, fireR: 1, fireFor: 3.6, sway: 0.05,
    look: { ring: 1.5, fade: 0.32, rope: 0.8, ropeA: 0.4, warnR: 2.6 * TILE } },
  // The dev drawer's tool pages are drawn `uiScale` × the HUD's text scale, and no text on them is
  // smaller than `minText` CSS px (30 Sep 2026: "the fonts in the dev tools are tiny everywhere,
  // make it readable"; the rule is in CLAUDE.md, *Conventions*).
  // Rooms that stand on more than one floor, set into an ordinary room rather than drawn: THE ARMORY on
  // `chance` of the floors `ROOM_LEVELS.armory` allows, never before room `from`.
  // `crates` is the most loose crates it is given on top of its own two (30 Sep 2026: "a few fewer
  // crates in the armory"; an ordinary room gets two to four).
  // `flank` (7 Oct 2026): the trench rooms of rooms.js (ditchcut, ditchtee, ditchisland), one a floor at `chance`, from room `from`.
  rooms: { armory: { chance: 0.5, from: 2, crates: 1 }, flank: { chance: 0.6, from: 2 } },
  // `godSpeed`: GOD MODE also runs him this many times faster (5 Oct 2026, "in god mode speed x3"),
  // for crossing a floor to the thing under test.
  dev: { burstGap: 1.5, uiScale: 1.3, minText: 12, godSpeed: 3 },
  // Adaptive resolution (5 Oct 2026, 19 FPS and 44 ms of the game's own work a frame on an unplugged
  // laptop). `Game.adaptRes` keeps an average of the frame's work: over `slow` ms for `wait` s in play
  // drops `step` of the canvas's pixels (never under `min`); under `fast` ms for `waitUp` s gives a step
  // back. A drop that did not bring the work down by `gain` is undone and the dial is left alone for the
  // session: the cost was not in the pixels.
  // It counts only while the page is driven by the screen (not the hidden-pane interval) and starts
  // `settle` s into a floor, so a floor's first bakes never read as a slow machine.
  perf: { adapt: { on: true, slow: 15, fast: 9, wait: 3, waitUp: 5, step: 0.15, min: 0.55, gain: 0.1, settle: 4 } },
  // `killCap` stays under `fastCap`, or bodies beat pace: at 2.5 a clear at par with 25 kills scored
  // 2500 against the fastest run with none at 2000, the one ordering this score exists to prevent.
  // Now a clear at par with every body in it scores 1500, the fastest pacifist 2000, and the fastest
  // run with bodies in it 3000, which is the best run the concept asks for.
  score: { perRoom: 9, timePoints: 1000, fastCap: 2, killMul: 0.02, killCap: 1.5 },
  held: { bulletsAbsorbed: 2 },
  // A corrupted soul: what a boss leaves, and what the goat swallows to get stronger. It was a tome,
  // which asked the player to believe that a goat reads.
  // `bossChance` and `roomChance` are the two surprises a level with `surprises: true` rolls on top of
  // its authored count: the odds that one of its bosses carries a soul of his own, and that one
  // ordinary fight room gives one up when its last man goes down. No level asks for them since
  // 26 Sep 2026 ("a soul twice a level, in the middle and at the end"), and `roomChance` is 0 anyway:
  // a soul paid for clearing a room argued with running.
  // `apart` (1.72): no two souls of a level, gates, the vault, the bosses who carry one and either
  // surprise, are fewer than `apart` rooms from each other, so a soul is never followed by another
  // in the next room or the one after it. A surprise that would break it is not dealt
  // (`soulPlan`, `GEN_RULES.souls`). Played, two in a row was "not ok at all" (25 Sep 2026).
  // KEYS (3 Oct 2026, first cut: "just to see how it works"). A run's resource, kept from floor to
  // floor (`game.runKeys`, saved with the run, a death gives back the head of the floor's count). A
  // champion (a boss with no soul in him) drops one `drop` of the time (`Game.bossPrize`), lying
  // `r` px wide and taken by walking over it within `pickR`. From floor index `iron.from`, `iron.chance`
  // of the floors that hold an animal shut it in an iron cage (`coop` with `ironCage`) instead of
  // slats, and stand a second iron cage with big milk grass in it (`ironcage`) in another room: one
  // key, two doors, so the key is a choice. Iron gives to no blow; a headbutt with a key spends it.
  // `sayGap`: how often a cage says it wants one while he stands within `sayR` tiles.
  // THE COMBOS (5 Oct 2026 playtest: "combinations of a man and a room, or of men, that make a situation").
  // Now and then (`chance` of the floors, one at most) a room is dealt as a pairing worth meeting, only
  // where every man in it was met on an earlier floor, `from` (a LEVELS index) the first floor that may
  // deal it, never in a teaching, resting, trap or set-piece room. `men` are the room's first men and
  // up to `extra` more are bought off what is left of its budget, never a clubman; a pairing costing more than `over`
  // x the room's budget is not laid there. `room`: what the room must be, `tpl` a template's name,
  // `pits` at least that many tiles of drop inside it, `small` at most that many tiles of floor, `arena`
  // the boss whose ring it is (`men` then stand at his back). gen.js `dealCombo`, `GEN_RULES.combos`,
  // the dev drawer's COMBOS tab (a button lays one and walks him to its door).
  // `extra`: at most that many men bought round the pairing.
  combos: { chance: 0.35, over: 1.5, extra: 2, list: [
    { id: 'armory-thrower', name: 'THE THROWER IN THE ARMORY', men: ['thrower'], room: { tpl: 'armory' }, from: 6,
      why: 'a room of crates and racks is a room of things for him to throw' },
    { id: 'hook-drop', name: 'THE HOOK OVER THE DROP', men: ['champion'], room: { pits: 8 }, from: 5,
      why: 'the butcher\'s rope drags the goat across the holes' },
    { id: 'witch-hook', name: 'WITCHFIRE AND THE HOOK', men: ['seer', 'champion'], room: {}, from: 2,
      why: 'the mage will not be caught, and the hook drags the goat through his fire' },
    { id: 'ogre-seer', name: 'THE SMALL RING', men: ['seer'], room: { arena: 'butcher' }, from: 2,
      why: 'the ogre leaps where he stands, the mage burns where he runs' },
  ] },
  keys: { drop: 0.35, r: 12, pickR: 24, start: 0,
    // `animal`: since 5 Oct 2026 a floor stands ONE iron cage, never the pair; this share of them is the
    // animal's coop in iron, the rest the cage of big grass (its coop stays slats).
    iron: { from: 1, chance: 0.6, pair: [2.2, 5.5], readR: 7, sayR: 2.4, sayGap: 3.2, r: 26, apart: 1 } },
  soul: { r: 13, pickupR: 22, bossChance: 0.4, roomChance: 0, apart: 3,
    // The way out of a level is a soul gate too (1 Oct 2026): the stair door is barred until the soul the
    // last boss carries is swallowed (`level.exitGate`, gen.js `tryGenerate`, `GEN_RULES.exitgate`).
    exitGate: true,
    // Butting a soul gate lays a running trail on the floor from the goat to what opens it (the
    // soul lying in that room, or the mouse's shelf): `time` seconds, a chevron every `gap` px
    // flowing at `speed` px/s. The gate says what it wants; the trail says where it is.
    guide: { time: 3.2, gap: 20, speed: 70, size: 5 },
    // THE MIDDLE GATE (`game.holdGate`): from floor index `from` (the second floor) on, what the
    // floor's first gate gave, its soul, or one of the mouse's offers, also holds his place, and a
    // death past it comes back to that gate on a freshly cut floor, carrying what he had there.
    // `on` false (29 Sep 2026, "for now after heaven start at the very beginning of the floor, a
    // more roguelite shape once the balance settles"): no gate holds his place, a death always
    // comes back to the head of the floor, and a save made past a gate before is read the same way.
    hold: { on: false, from: 1 } },
  // PHOTO MODE (js/photo.js, 1 Oct 2026): a picture of the canvas on `key`, or every `every` s of play,
  // `keep` of them held in the page, `thumbW` px wide on the page of choosing. `dip` is the dev drawer's
  // FPS DIP LOG: a frame longer than `ms` writes down where it was (one a `cooldown` s, `keep` at most,
  // its small picture `shotW` px wide).
  photo: { key: 'KeyP', every: 3, keep: 60, thumbW: 320, dip: { ms: 40, cooldown: 2.5, keep: 30, shotW: 640 } },
  // How long a soul's cards refuse every input after they appear, so the click that killed the
  // boss cannot also spend what he dropped.
  boonArm: 0.4,
  // A soul is a party (1.66): the cards do not just appear. For `intro` s the screen flashes and the
  // soul pops in over a wheel of `rays` gold and violet rays turning at `spin` turns a second, the
  // words `A SOUL` bounce up, `sparks` cells of confetti burst out and fall; then the cards
  // spring in `stagger` s apart, each over `pop` s, and the rays settle to `settle` of their brightness. `px` is the size of a cell, in HUD px: the rays
  // and the confetti are drawn on that grid like every other effect. Nothing can be picked until the
  // last card is in (`boonArm` counts from then).
  // `morph` (1 Oct 2026, "the corrupted soul turns into the goat when you hover a card, and the goat
  // stays: absorption, said by the design"): the soul hangs where he will stand, bobbing `bob` HUD px,
  // until a card is pointed at once they can be taken; then over `time` s it shrinks into his middle
  // by `soulOut` of the way, `cells` violet cells are pulled in from `reach` × his height, he comes in
  // from `goatIn` (a violet shape first, his own colours by `clear`), springing up from `pop` of his
  // height, and a ring of cells goes out from him at `ring` of the way. Never turns back.
  fanfare: { intro: 0.45, stagger: 0.09, pop: 0.24, rays: 14, spin: 0.06, sparks: 46, px: 4, flash: 0.22, settle: 0.45,
    morph: { time: 0.85, bob: 4, soulOut: 0.45, cells: 30, reach: 1.1, goatIn: 0.3, clear: 0.95, pop: 0.82, ring: 0.42, flare: 0.7 } },
  // The death screen's pull-back. `delay` holds the camera where it died for a beat, the shake and
  // the toll are still landing, before `zoomTime` seconds of easing out to the whole level, margin
  // clear on every side. `sampleGap` is how often a dot goes on the trail `game.pathTrail` draws as
  // a line once the pull-back gets there; `lineWidth` is in screen pixels, not world ones, so the
  // line reads the same thickness at any zoom. `fogAlpha` is how dark a room nobody opened stays
  // once the pull-back reaches it: `Renderer.drawUnseen` reads it in place of full black, so a room
  // that was never walked into still reads as a room on the recap rather than as a hole in the map.
  // `skull` is the screen-pixel size of the mark left on the map where each man went down.
  deathCam: { delay: 1.9, zoomTime: 2.2, margin: 0.88, sampleGap: 0.2, lineWidth: 2.4, fogAlpha: 0.16, skull: 9 },
  // The picture of a cleared floor (`js/painting.js`). `px` is painting pixels a tile, the decal's
  // own 10.9, rounded, so the paint lands a texel for a texel. The level is cut into up to `maxRows`
  // rows (at a column no room stands across, looked for within `cutLook` of a row's width of the
  // even cut) so the whole comes out nearest `aspect`, width over height: a level is six to ten
  // times wider than tall and one strip is a thread on any screen. `gap` and `pad` are tiles of dark
  // between and round the rows; a floor whose one strip is no wider than `oneRow` × its height is never
  // cut (3 Oct 2026). `floorAlt` is the percent of floor tiles in the level's second
  // floor colour, `grass` how green tall grass paints, `unseen` how far a room he never opened sinks
  // back into the rock. The trail is `w` pixels wide on a darker rim; `glyphCell` is a skull's cell.
  // On screen: `reveal` s for the rows to wipe in over a `ghost` of themselves, `arm` s before a
  // press leaves (so the click that climbed cannot skip it), and the box it fits in (`fit`, of the
  // screen, `top` its upper edge). `export` is the saved PNG's pixels a painting pixel; `band` sizes
  // its caption as a share of its width.
  painting: {
    saveButton: false,   // 6 Oct 2026 playtest: "no need for SAVE THE PICTURE" on the clear card; the kills and the bell are shown instead
    px: 11, maxRows: 4, cutLook: 0.25, aspect: 1.75, gap: 3, pad: 3, oneRow: 7.5,
    floorAlt: 35, grass: 0.55, unseen: 0.6, trail: { w: 2, alpha: 0.85 }, glyphCell: 2,
    reveal: 1.6, ghost: 0.16, arm: 1.2, fit: { w: 0.9, h: 0.6, top: 0.17 },
    export: 2, band: { big: 0.03, small: 0.015 },
    // The road through the compound under the picture (`Painting.drawRoute`, 29 Sep 2026: "like
    // Nuclear Throne, where you are, towards the next"): a node a floor and the way OUT after the
    // last, `w` of the screen wide (at most `max` px at scale 1), in cells of `cell` px. On a clear the
    // goat's head walks from this floor to the next over `move` s, `after` s into the card.
    route: { w: 0.74, max: 780, cell: 2, move: 1.3, after: 0.9 },
    // The death card's picture of the floor (`Painting.drawDeath`) comes in over the pull-back:
    // `fade` s long, starting `at` s into the zoom. RESTART (3 Oct 2026, "a quick start after a death,
    // one button on the screen"): the floor again at once, past heaven, offered `quick` s after the blow,
    // beside ASCEND; Backspace (the pad's BACK) presses it. RESTART comes first (`quick`), ASCEND once the
    // pull-back is done; and only ASCEND while heaven has something new (`Heaven.news`, 5 Oct 2026).
    death: { at: 0.6, fade: 0.9, h: 0.56, top: 0.07, quick: 0.5 },   // top 0.2 until DIED left the top (30 Sep 2026)
  },
};

// The first screen, top to bottom. The renderer draws a row per id and `menuPick` acts on one, so
// the order of the menu lives here and in one place. LEVELS is a way onto any floor of the game
// without playing up to it: it is a prototype, and the fifth level is worth looking at on a Tuesday.
// UNLOCKS (6 Oct 2026): the book's second tab, from the title (`Codex.openUnlocks`).
const MENU = ['new', 'continue', 'levels', 'best', 'unlocks', 'settings', 'discord'];
// Where the players gather (28 Sep 2026): the DISCORD row opens it. The invite never expires.
const DISCORD_URL = 'https://discord.gg/BAFCR32mF7';
// The LEVELS sheet's switches above its floors: THE TRIP, THE DARK (`Game.menuPick`, `drawLevelPick`).
const LEVEL_TOGGLES = 2;

// Escape, mid-level, used to drop straight back to the title, which threw away the room exactly as
// it stood and handed CONTINUE a freshly generated level from its own head, so checking a setting or
// an accidental Escape cost the same as dying. This is the actual pause: `game.state` holds at
// `'paused'` rather than tearing anything down, so RESUME is the goat standing exactly where Escape
// caught him, the room exactly as it was. `game.pause` (`index`, `rects`) is its own small menu,
// separate from the title's `game.menu`, though the two share `game.menu.panel === 'settings'`,
// opening the sliders from here draws the identical panel `drawSettings` already knows how to draw.
const PAUSE_MENU = [
  { id: 'resume', name: 'RESUME' },
  { id: 'book', name: 'INVENTORY' },
  { id: 'settings', name: 'SETTINGS' },
  { id: 'photos', name: 'PHOTOS' },
  { id: 'quit', name: 'QUIT TO TITLE' },
];

// The switches on the title screen, in the order they are drawn. `key` is the field in
// `game.settings` and nothing else reads them, so adding one is a line here and a line at the use
// site. Both of them are things the game is better off not doing by default.
// `type: 'slider'` rows carry a 0..1 value instead of a boolean, `game.setSliderAt` and
// `game.adjustSlider` are the only things that write them, a drag or a left/right press where a
// toggle would take Space. 0.5 is the middle both start at, which reproduces today's tuned mix
// exactly (`game.applyVolumeSettings` scales each bus by `value / 0.5`), so a browser that never
// touches the row sounds exactly as it always has.
// WHERE A ROOM MAY STAND (30 Sep 2026: "which rooms can be on which floors is its own tick in the
// list of rooms: some are only for one block, the cave, the mushrooms, some only for the first half,
// they are easy, some only for the second, little cover and rifles at the far end"). One string a
// room template (by `name`), a character a slot: the floors of LEVELS in order, then THE DARK, then
// THE TRIP; '1' it may be dealt there, '0' it may not. A template not named here goes where the
// generator always sent it (its canon, the mix of known canons, its tag). Written from the dev
// drawer's ROOMS tab (`drawRoomsTab`); read by `roomAllowed` in gen.js for every pool.
const ROOM_LEVELS = {
  armory: '0111111100',
  // THE FLANK (7 Oct 2026): a trench with a squad on its far lip, from THE CAVE on (where the roll across a chasm is
  // taught), never THE DARK (its lamps need the walls) or THE TRIP.
  ditchcut: '0011111100', ditchtee: '0011111100', ditchisland: '0011111100',
};

const SETTINGS = [
  { key: 'timer', name: 'SHOW THE CLOCK', note: 'A time counting up in the corner. BEST keeps each floor\'s time either way.' },
  { key: 'sound', name: 'SOUND', get note() { return `Everything at once. ${typeof KEY_FACE !== 'undefined' ? KEY_FACE.KeyM : 'M'} does the same thing mid-run.`; } },
  { key: 'musicVolume', name: 'MUSIC VOLUME', note: 'The room score and its drums.', type: 'slider' },
  { key: 'sfxVolume', name: 'EFFECT VOLUME', note: 'Swings, hits, voices, the noise of a fight.', type: 'slider' },
  { key: 'layeredMusic', name: 'LAYERED MUSIC', note: 'Off: one plain score, without the drums of a fight on top.' },
  { key: 'easy', name: 'EASY MODE', get note() { const h = BOON_BASE.maxHp; return `${sayWord(h + EASY.maxHp)} hearts to start instead of ${sayWord(h)}, and every blow in the compound takes ${Math.round((EASY.enemySlow - 1) * 100)}% longer to land.`.replace(/^./, (c) => c.toUpperCase()); } },
  // The dev drawer's GOD, as a switch anybody can throw (the itch build has no drawer): nothing hurts
  // him. A floor cleared with it on writes no best and its run code carries X (`offBoard`).
  // Every camera shove at once, shake, kick, lens punch (`game.shakeMul`). Full is the game as tuned;
  // the slider only takes away.
  // 3 Oct 2026 ("another way to play, on the keys without a mouse"): no verb added (pillar 1), the
  // same five moved off the mouse; he aims where he runs, snapped as a thumb is (`Game.readMoveInput`).
  { key: 'keysOnly', name: 'KEYBOARD ONLY', get note() { const F = typeof KEY_FACE !== 'undefined' ? KEY_FACE : { KeyW: 'W', KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyJ: 'J', KeyK: 'K', KeyL: 'L', KeyZ: 'Z', KeyX: 'X', KeyC: 'C' }; return `No mouse. ${F.KeyW}${F.KeyA}${F.KeyS}${F.KeyD} run and aim, ${F.KeyJ} headbutts, hold ${F.KeyK} to grab, ${F.KeyL} rolls, SPACE is BAAH. With the arrows: ${F.KeyZ}, ${F.KeyX}, ${F.KeyC}.`; } },
  // 5 Oct 2026, playtest: a page of its own (`KeyBind`, js/input.js) where each verb is put on any key or mouse button.
  { key: 'controls', name: 'CONTROLS', type: 'panel', note: 'Choose which key or mouse button does each thing.' },
  { key: 'shake', name: 'SCREEN SHAKE', note: 'How hard the picture jolts when you are hit. Left: never.', type: 'slider' },
  { key: 'god', name: 'GOD MODE', note: 'Nothing can hurt the goat. For looking round; no best is kept while it is on.' },
  // 30 Sep 2026 ("frame rate decides the clutch moments"): frames a second over the last half second,
  // the slowest frame in it, and what the game itself spent on the frame (`Game.frame`).
  { key: 'fps', name: 'SHOW FPS', note: 'Frames a second in the top-left corner, the slowest frame and what the game spent on it.' },
  // 1 Oct 2026: pictures of the canvas at its own size, kept until PAUSE → PHOTOS lets you choose which to save.
  { key: 'photoKey', name: 'PHOTO MODE: ON A KEY', get note() { return `${typeof KEY_FACE !== 'undefined' ? KEY_FACE.KeyP : 'P'} takes a picture at the size of the screen. Choose which to keep under PAUSE, PHOTOS.`; } },
  // 1 Oct 2026, playtest: "an option, double speed outside a fight". Nobody awake and after him within
  // `TUNING.calmRun.r` tiles and he runs `calmRun.mul` × as fast (`Game.calmFast`, `Goat.update`).
  { key: 'fastCalm', name: 'DOUBLE SPEED OUT OF A FIGHT', note: 'With nobody after you, the goat runs twice as fast between the fights.' },
  // 1 Oct 2026: the question the title asks once (js/stats.js), kept as a switch.
  { key: 'stats', name: 'SEND RUN STATS', note: 'How far you got, and after each life what hurt you and what you chose. Anonymous.' },
  { key: 'photoAuto', name: 'PHOTO MODE: EVERY 3 SECONDS', note: 'A picture every three seconds of play, so you can just run. Choose which to keep under PAUSE, PHOTOS.' },
];

// What EASY MODE bends: a bigger cushion of hearts and a slower cult. `applyBoons` adds `maxHp` to
// the goat's base and multiplies `mods.enemySlow` (a normal run's is `BOON_BASE.enemySlow`), which
// every windup, swing, recovery, cast and reload in enemies.js multiplies its own TUNING duration
// by, the same read-the-mod-at-the-use-site pattern boons use, so nothing here mutates TUNING. It
// set the mod outright until 25 Sep 2026, and 1.4 over the base's 1.21 was 16% slower, not 40%.
const EASY = { maxHp: 2, enemySlow: 1.4 };
// DOUBLE SPEED OUT OF A FIGHT (a setting): × `mul` with no awake man after him within `r` tiles.
TUNING.calmRun = { mul: 2, r: 14 };
// RUN STATS (js/stats.js): where a life's report goes once the player said yes. `url` is our own
// Cloudflare Worker (tools/stats-worker; empty = nothing is sent, reports are only kept here). `keep` reports stay in this browser. `sendDev` / `askDev`: off the itch build
// too (testing the pipe). The question's words, asked once on the title.
TUNING.stats = {
  url: 'https://goat-stats.dimache.workers.dev', keep: 40, sendDev: false, askDev: true,
  // The funnel's floors (`Stats.step`): a step `reach<n>` the first time a life walks onto floor n.
  reach: [4, 8],
  // Room by room (`Stats.roomTick`, 6 Oct 2026): at most `roomCap` rooms and `pathCap` steps of the path kept a
  // floor, so a long life's report stays well under the worker's 60 KB. `fight`: the share of a room's men he
  // left dead for the room to count as fought through.
  roomCap: 40, pathCap: 80, fight: 0.5,
  title: 'HELP THE GOAT?',
  // 6 Oct 2026: "shorter: can we send info about your run?"
  ask: ['Can we send info about your run?', 'Anonymous: no name, no email.'],
  later: 'You can change this any time in SETTINGS.',
};
// SOMETHING NEW (`Novelty`, js/stats.js; 6 Oct 2026: "a metric of how long ago a player saw something new, a
// room, a companion, an enemy, tracked in the stats, and if we have given him nothing new for a while, slip
// something in"). The clock is this browser's play seconds since the last first sighting (a room template, an
// enemy kind, a floor, a soul dealt, an animal, a talisman, a cape, an object: the `Unlocks` store's sections
// plus `rooms`, `foes`, `floors`). Past `dry` seconds without one, a soul's deal puts one card he has never
// been dealt among the cards, the next floor's draw prefers room templates he has never walked into
// (`opts.fresh`, gen.js `draw`) and a vault kind he has never stood in (`vaultKindOf`), and a mouse's shelf
// with no talisman he has seen gets one (`Shop.freshen`). `near`: tiles within which a man counts as seen.
// `cap`: news kept a floor. `dry` was a first guess (6 Oct 2026): `tools/stats.html`'s DRY SPELLS section
// suggests one off the gaps players actually have.
TUNING.novelty = { dry: 240, near: 9, cap: 40, rooms: 2 };
// The tip at the foot of a floor tried again after a death (`DEATH_TIPS`): up `time` s, fading over `fade`.
TUNING.deathTip = { time: 9, fade: 0.8 };

// ---------------------------------------------------------------------------------------------
// DIFFICULTY. Everything about who you meet, when, and how many of them, lives here, the generator
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
// at the top and left at the top, and the room, its men, its pillars, its wheel, was something you
// ran past rather than something you had to cross. `far` is the share of the greatest distance from
// the way IN that a candidate row has to make to be considered at all, so the exit is always down
// the other end of the room and the fight is always between you and it. 1 would be the single
// furthest row every time; a little under it keeps two seeds of a room two rooms.
const DOORS = { far: 0.7 };

// The seer and the butcher came down in 1.72 (2.8 and 3.2) when the one rule (`TUNING.boss`) took
// every man without the outline to one heart: the mage still never closes and the butcher still
// hooks you from across the room, but one killing blow is all either of them now takes. A boss is priced × 1.6 on top.
// `shield`: a clubman behind a board (`TUNING.shieldman`), met first on THE THRESHING FLOOR and THE DARK.
// The shieldman 1.9 → 2.6 (2 Oct 2026): two hearts, the leap and the spikes made him the dangerous one.
// `thrower`: a clubman with the green in one arm (`TUNING.thrower`, 3 Oct 2026), met first on THE BRIDGE:
// three hearts, a fist, and whatever in his room he can lift and throw, the goat included.
// `shaman`: a man of the old cult (`TUNING.shaman`, 6 Oct 2026), met first on THE CAVE with the clubmen his spirit
// goes into: one heart, but every clubman near him a heart, a stride and a blow more, and his call drags the goat.
const THREAT = { bearer: 1, dog: 1.7, hunter: 2.4, wraith: 2.6, seer: 2.4, champion: 3.2, butcher: 5, shield: 2.6, thrower: 3, shaman: 2.6 };

const ENCOUNTER = {
  // How often a kind is drawn once it is available. Clubmen stay the backbone of every crowd.
  weight: { bearer: 6, dog: 3, champion: 2, hunter: 3, seer: 2, wraith: 3, shield: 1, thrower: 1, shaman: 1 },
  // What no single room may exceed, whatever threat it was handed. Two mages in one room is a coin
  // toss, not a fight; eight of anything is a wall of bodies rather than a room you can read.
  cap: { seer: 1, champion: 1, hunter: 2, dog: 2, wraith: 3, men: 7, shield: 1, thrower: 1, shaman: 1 },
  // Who stands with a kind the first time it is met (`planEncounters`), when what it does needs them: the shaman's
  // spirit goes into clubmen, and alone he would teach half of himself. Only kinds already known; `GEN_RULES.alone`
  // allows exactly these.
  introWith: { shaman: ['bearer', 'bearer'] },
  // And a room's head count follows its size (26 Sep 2026: "the cap on men should depend on the size
  // of the room"): the level's `cap.men` is what a room of `ref` floor tiles holds; a smaller room
  // holds fewer, a bigger one more, never under `min` nor over `grow` times the level's own cap
  // (`roomMenCap`, gen.js; `GEN_RULES.caps` holds the same number).
  room: { ref: 120, min: 3, grow: 1.25 },
  // The set-piece rooms play by their own cap: the Great Hall is supposed to be a wall of bodies.
  hallCap: 18,
  // A boss stands with this much company, unless he is the first of his kind you have seen, and
  // then he stands alone like everybody else on their first appearance.
  escortThreat: 2.5,
  // The room after an introduction eases off: you get one quiet beat to use what you just learned.
  afterIntro: 0.65,
  // The Mill is a kind too. Its room is a set piece you have to read, so it is never the room that
  // introduces a man, and it carries about half a room's worth of crowd, none at all on the level
  // that shows you the wheel for the first time.
  millEase: 0.45,
  // The killbox: two rifles on the far side of an empty room, watching the door you come in by.
  killbox: { men: ['hunter', 'hunter'], near: ['bearer', 'bearer'] },
  // THE CHEAPEST MAN IS NOT THE FILLER. Every other kind has a cap of its own; the clubman never
  // did, so he was whatever a big budget had left over once those caps were full, and a room on
  // the late curve came out as an early room with four more of him standing in it. This is his cap
  // and it is the one that *tightens* as a room gets richer: `max` of him while the budget is under
  // `full`, down to `min` by the time it reaches `none`. Never zero, a clubman is still a body to
  // throw another man into, and a crowd with none of them in it stops reading as a compound.
  // It does not touch a room that was handed its own head count: the Great Hall is *supposed* to be
  // a wall of bodies, and an escort is too small a budget for any of this to reach.
  cheap: { kind: 'bearer', full: 8, none: 22, max: 6, min: 2 },
};

// THE SECOND AXIS. `groundOf` in `rooms.js` measures how much of a room is floor with nothing solid
// within a step, how little of the room is available as a weapon. The crowd curve buys men; this
// buys the ground they are standing on, and a level deals its rooms out along it, tight first and
// open last. Without it the curve could only ever make a late room *fuller*, which is the one way
// of getting harder that pillar 3 says the least about.
// `window` is what keeps it a tendency instead of a running order: the draw takes at random among
// the nearest few templates that fit, so two seeds of a level are still two different levels and the
// rule that holds it is an averaged one. `weight` is what the balance report multiplies threat by to
// get *pressure*, what a room actually asks of you, men and floor together.
const GROUND = { window: 3, weight: 0.5 };

// THE CANON. Every level is about one thing, stone, fire, the line, open ground, the funnel, the
// drop, the niche, and the rooms are how it says so. A room template carries `canon: '<id>'`, a
// level carries `canon: { id, name, idea }`, and the generator builds at least `share` of the level's
// ordinary rooms (everything that is not the pen, a control room or a set piece) out of that pool.
// The rest are the mix: the untagged rooms plus the canons of every level before this one, which is
// "what you already know" and nothing you have not been shown. `minRooms` is how many templates a
// canon has to have written for it before it counts as one; a level whose canon has fewer would be
// the same two rooms over and over. The dev drawer's RULES page and `node tools/balance.js` both
// hold the level to this.
const CANON = { share: 0.5, minRooms: 4 };

// STACKED ROOMS. The chain used to run one way only, every door in the right wall, every next room
// further right, so a level was always "run for the other side of the screen". A level's `stack` is
// the chance a room is hung above or below the one before it instead, reached through a shaft cut
// out of that room's top or bottom wall, and the chain carries on right from there. `gap` is the
// rock between the two, in tiles; `minOverlap` how much of the lower room's width the upper one has
// to share, so the shaft is short. `run` is how many in a row may do it, one, so it reads as a turn
// in the road rather than a tower. Set pieces, the teaching rooms and anything a gate has to narrow
// never stack: they are built for a door in their left or right wall.
const STACK = { gap: [3, 5], minOverlap: 6, run: 1 };

// Boons bend numbers and verbs the goat already has. Actives change what a button does;
// passives change how well everything works. A boss leaves a corrupted soul: three of one kind.
// `skill` is the button a boon hangs off in the HUD rail; the ones without one are body work.
//
// Two of the four buttons start half-shut, and the souls are what open them. A goat out of a pen
// can run, put his head into things, get out of the way, pick up what is lying about, and shout,
// and that is the whole animal. What he cannot do is carry a grown man in his teeth, and his voice
// is a voice rather than a weapon. Each of those is a soul, which is what makes them worth more than
// a number: a half-lit chip is a promise, and the two of them are the shape of the first hour.
const BOON_BASE = {
  // 1.1 rather than 1: every windup, swing, recovery, cast and reload in enemies.js multiplies its
  // own TUNING duration by this, so a tenth added here is a tenth off every kind's attack speed at
  // once, without touching a single per-kind number. Another tenth on 24 Sep 2026 ("enemy blows
  // 10% slower"), to go with the compound's pace (`SLOW`). EASY MODE still overwrites it outright (1.4).
  maxHp: 4, speed: 1, butcherDamage: 1, fireResist: 1, enemySlow: 1.1 * 1.1,
  // Nothing between him and what is coming, as far as the fog would otherwise let him see. Off by
  // default because the fog is the game reading a room to you at the pace you cross it, this soul
  // is the one that reads it for you all at once.
  oracle: false,
  headbuttReach: 1, headbuttImpulse: 1, headbuttRecovery: 1, antlers: false,
  // BULL NECK: how much more a headbutt throws out of a whole run-up (0 is off); SPRING HOCKS: what share
  // of the tumble's speed he lands with, the run-up kept (0 is the ordinary landing); BIG LUNGS: how far
  // the voice carries, every form of it, as one multiplier.
  runButt: 0, rollKeep: 0, screamReach: 1,
  shieldBullets: 2, holdTime: 8.0, grabCooldown: 1,
  // STRONG JAW: what a thrown thing's impulse is multiplied by (never a man's, `Goat.throwHeld`).
  throwFar: 1,
  // Grab lifts objects out of the pen and nothing else. A crate, a blade, a shield: things a goat
  // could plausibly get its teeth into. A man is BY THE COLLAR, and until that soul is swallowed
  // every trick built on carrying one is off the table, because a card that needs a verb you have
  // not got is a wasted card.
  grabMen: false,
  screamCooldown: 3.0 * GOAT_CD, screamRadius: 3.4,
  // How far the bare call carries, the lure, which is the half of the voice every goat has out of
  // the pen. It was a literal off `TUNING.goat.scream.call` at three use sites; it is a mod because a
  // goose walked to the stairs lengthens it (js/beasts.js), and nothing may read TUNING at a use site.
  screamCall: 13,
  // How many blows the armour he starts a floor in takes (`goat.armour`). A tortoise brought out is one of these.
  armour: 0,
  // What BAAH is. `call` out of the pen: a noise that pulls the room to where you shouted. `stun`
  // is THE FULL THROAT and `breath` is DRAGON BREATH, the two ways of turning a voice into a
  // weapon, and you get one of them.
  screamStun: false,
  // The roll is the one verb the goat is born with in full. It was withheld behind a soul, which
  // meant the first level was played by a goat who could not get out of the way of anything, the
  // one thing an animal that is running away has to be able to do. What the roll's soul buys now is
  // not the button but the teeth in it: DEAD WEIGHT, and everything the tumble goes through loses
  // its head. He still starts underpowered; he starts underpowered with somewhere to go.
  roll: true, rollDistance: 1, rollCooldown: 1, rollStun: 0,
  // LEAPFROG's and COLD EYE's params, copied in whole by their `apply` (null is off), and what a
  // tuft of grass gives on top of its own heart (FOUR STOMACHS). The pail is milk, not grass.
  leapfrog: null, coldEye: null, grassGain: 0,
  // RICOCHET's params (null is off): a blade thrown at stone glances off into a man (`Prop.glance`).
  ricochet: null,
  breath: false, bomb: false,
  // Off by default: a burning man stops with the man he caught fire from, unless this soul is spent.
  // A depth, not a flag: how many men a fire may be handed down through. KINDLING is 1; the FIRE
  // AMULET's tiers go deeper (`ARTIFACTS`).
  firePass: 0,
  // The talismans at his neck (`game.artifacts`) bend a rule of the compound rather than a number
  // behind a button: `luck` is read by the generator for the NEXT floor. The cape on his back
  // (`game.cape`, `CAPES`) puts its Q verb here: `blink`, `sprout`, `ruin`, `boomerang`, `effigy`
  // (`Cape.use`). Null until one is worn.
  luck: null, boomerang: null, blink: null, effigy: null, sprout: null, ruin: null,
  // The poison actives, one per button, and the fire in the mouth. `venomHold` / `brandHold` are
  // seconds a thing has to be in his mouth before the throw carries it; 0 is off.
  splash: false, venomHold: 0, brandHold: 0, venomRoll: false, spit: false,
  // What THE MIRROR has bought (js/heaven.js, `MIRROR`): hearts of light over his own at the head of
  // a floor, grazing's time multiplied, the first bowl a floor filling him up, and seconds on the
  // mercy after a blow.
  lightHearts: 0, grazeMul: 1, milkFull: false, invulnAdd: 0,
  // What the souls of one element add up to (`BOON_SETS`, laid by `Game.applyBoons`): seconds of grace
  // before ordinary fire or a puddle gets to him, and with the whole set, nothing at all, and his
  // fire burning longer, his poison a blow.
  fireGuard: 0, fireImmune: false, burnMul: 1, poisonGuard: 0, poisonImmune: false, poisonHurts: false,
  // How often a soul deals a third card (30 Sep 2026: "two choices instead of three"). 0 is never; `n`
  // is every n-th soul, counted in `talRun.third`. HUNGRY SOUL and THE KNUCKLEBONE set it.
  thirdEvery: 0,
};

// How many souls a build can hold, so no one button gets pumped: one active on each of the four
// verbs and two passives under it, and four passives that belong to no button, the body work,
// shown in their own square left of the rail. A `key` boon (BY THE COLLAR) opens half a verb rather
// than bending it, and counts against nothing.
const BOON_SLOTS = { active: 1, passive: 2, general: 4 };
// A soul deals `BOON_CARDS` cards (two since 30 Sep 2026), and a third only when `mods.thirdEvery` says so.
const BOON_CARDS = 2;
// Souls of one element count up (30 Sep 2026: "the bonuses add up, geometrically"). A boon's `element`
// is its set; `Game.applyBoons` counts them. The n-th of a set adds `step[n - 1]` seconds of grace and
// they sum (poison: ½, then 1 more, then 2 more, 3.5 s with three) before a tick of ordinary fire lands
// (`Goat.update`) or a puddle's ring fills (`Status.goat`). The fourth (`all`) makes him proof against
// it outright (fire: not since 3 Oct 2026, `immune: false`, its fourth is one more second) and adds the set's own bonus: his fire burns `burnMul` times as long (`World.ignite`,
// ordinary fire only), his poison takes a heart as it takes a man (`Status.poison`). A card says only
// what it adds itself (`gain` / `whole`: "no counts on the card"). Stun is the parked third set (BACKLOG).
const BOON_SETS = {
  // The fire steps cut to a fifth of a second a soul (2 Oct 2026 playtest: one DRAGON BREATH and fire "did not take at all").
  // 3 Oct 2026 playtest: whole immunity at four made the fire souls "a skill with no risk". Now the
  // first two give no grace, the third half a second, the fourth one more (1.5 s), never immunity
  // (`immune: false`); the burning-myself risk is the set's price.
  fire: { name: 'FIRE', step: [0, 0, 0.5, 1], all: 4, immune: false, burnMul: 2,
    gain: (t) => `+${sayN(t)}s BEFORE FIRE HURTS YOU`, whole: '+1s BEFORE FIRE HURTS YOU · YOUR FIRE BURNS TWICE AS LONG' },
  poison: { name: 'POISON', step: [0.5, 1, 2], all: 4,
    gain: (t) => `+${sayN(t)}s BEFORE A PUDDLE SLOWS YOU`, whole: 'POISON CANNOT SLOW YOU · POISON HURTS MEN' },
};
// The first soul of a run (nothing taken yet) deals one active off each of these buttons and one
// card as usual: the headbutt's and the voice's skills are the loud ones, LONG HORNS, BOMB CHARGE,
// SPLASH; THE FULL THROAT, DRAGON BREATH, VENOM SPIT, and the first thing a run picks should be a
// thing you can see (24 Sep 2026: "something for the headbutt and something for the scream").
const BOON_FIRST = ['butt', 'scream'];

// What a soul is worth to the goat, roughly, for `tools/balance.js`'s third column: threat is the
// numerator of the curve and this is the denominator. A heart is the unit. Anything not named is 1.
// The key that opens half a verb (BY THE COLLAR) and the two actives that turn the voice into a
// weapon are worth more; the passives that only shift a number at the edge of a fight, less.
// Nothing in the game reads it, it is a guess to be argued with, not a rule. The collar came down
// from 1.6 in 1.65, when a man started to cost a windup, a slower stride and a longer wait, and
// stopped dying on any wall he brushed.
const BOON_POWER = { heart: 1, collar: 1.3, howl: 1.5, breath: 1.5, bomb: 1.3, hide: 1.2,
  oracle: 0.6, ember: 0.6, kindling: 0.8, throat: 0.8, leapfrog: 1.1, coldeye: 0.9, stomachs: 0.5,
  // The three second passives (1 Oct 2026): each pays only in a run, a roll or a voice he already uses.
  neck: 0.8, hocks: 0.6, lungs: 0.7,
  // A wider choice later, not a stronger goat now.
  hunger: 0.4,
  // Only worth anything in a room with a blade in it (3 Oct 2026).
  ricochet: 0.5 };

// Every boon's tunable numbers live in its own `params`, not buried in `apply`'s body, so the
// BOONS tab of the dev tool can list, show and edit them generically, `apply(m, p)` always
// reads its multipliers off `p` rather than off a literal, the same read-the-mod-at-the-use-site
// discipline `TUNING`/`mods` already follow. A boon with nothing numeric to turn (it only flips a
// flag) simply has no `params`. `emoji` is the one glyph that stands for the boon everywhere it is
// named at a glance, the rail, the hover note, the soul's cards. `minLevel` is the
// level index (0 = THE ALTAR) below which the card is never dealt, off by default, so the dev
// tool is the only thing that ever needs to set one.
//
// `desc` is all a player reads, on the card, on the rail's note, and it is one or two short lines
// of what the soul does for him (25 Sep 2026: "one or two lines of what it does, no story, no exact
// numbers ... windup speed, what the hell?"). One number is allowed only when it IS the soul ("You
// run 20% faster"), and then it is a getter over `this.params`, never typed: a number typed into a
// sentence goes stale the first time the BOONS tab moves the param under it.
// `stat(p)` is the soul in full numbers, tiles, seconds, before and after, kept for the BOONS tab
// and the rail's note while the dev drawer is open; the player never sees it.
// Numbers as a card prints them: two places at most, no trailing zeros; a share as a percentage.
const sayN = (v) => String(+(+v).toFixed(2));
const sayPct = (v) => Math.round(v * 100) + '%';
// Small counts and ratios as words, so a short line reads as a sentence: 2 → 'twice', 3 → 'three
// times'; 1 → 'one', 12 → '12'; 'heart' or 'hearts'.
// From two up a ratio is said the way a person says it, never '2.86x' (2 Oct 2026): within `near` of a
// whole number it is that number, about half way 'two and a half times', above it 'almost three times',
// below it 'over twice'. Under two the share is small enough that '1.3×' is the plain way to say it.
const sayTimes = (v) => {
  const n = +sayN(v), times = (k) => (k === 2 ? 'twice' : `${sayWord(k)} times`);
  if (n < 1.9) return `${sayN(n)}×`;
  const lo = Math.floor(n), f = n - lo, near = 0.08;
  if (f < near) return times(lo);
  if (f > 1 - near) return times(lo + 1);
  if (f >= 0.4 && f <= 0.6) return `${sayWord(lo)} and a half times`;
  return f > 0.6 ? `almost ${times(lo + 1)}` : `over ${times(lo)}`;
};
const sayWord = (n) => ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || String(n);
const sayHearts = (n) => (+n === 1 ? 'heart' : 'hearts');
// 2 → '2nd', 3 → '3rd', 4 → '4th'.
const sayNth = (n) => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
// The key a talisman with a use of its own sits on, as printed on this keyboard (`KEY_FACE`, js/render.js).
// On a pad it is the pad's button (Y), not a key he is not holding (1.97).
const sayQ = () => (typeof game !== 'undefined' && typeof padOn !== 'undefined' && padOn(game) ? PAD_KEYS.item : typeof KEY_FACE !== 'undefined' ? KEY_FACE.KeyQ : 'Q');
// What poison does to a man, said the same way on every card that makes it.
const sayPoison = () => `POISON: ${sayN(TUNING.status.poison.time)}s AT ${sayPct(TUNING.status.poison.moveMul)} SPEED, NO SHOT OR SPELL`;
// `synergy` names a boon this one is built to be read together with (a crossing the world makes,
// such as poison meeting fire); `addition` names one it makes modestly better in passing. Neither is
// read by the game: they are marks for the BOONS tab, so the deck can be looked at as a web rather
// than a list (asked for 16 Sep 2026, built 23 Sep).
const BOONS = [
  // ---- actives: they change what a button does ----
  // What it costs (the windup, the stride, the wait) lives in `stat`, the dev drawer's line; the
  // card says what the soul buys and nothing more (25 Sep 2026).
  { id: 'collar', skill: 'grab', active: true, key: true, emoji: '⛓️', minLevel: 0, name: 'BY THE COLLAR',
    desc: 'Grab picks up men too. Hold one as a shield, throw him as a weapon.',
    stat: () => { const G = TUNING.goat.grab, P = TUNING.physics, kill = (G.throwImpulse * G.manThrow - P.thrownKill) / P.flungDrag / TILE;
      return `LIFTING HIM ${sayN(G.bite)}s · CARRYING, ${sayPct(G.speedMul)} SPEED · HE STOPS ${BOON_BASE.shieldBullets} BULLETS · WORKS LOOSE IN ABOUT ${sayN(BOON_BASE.holdTime)}s · THROWN, A WALL WITHIN ${sayN(kill)} TILES KILLS HIM · ${sayN(G.cooldown * G.manCd)}s BEFORE THE NEXT GRAB`; },
    apply: (m) => { m.grabMen = true; } },
  { id: 'howl', skill: 'scream', active: true, emoji: '📢', minLevel: 0, name: 'THE FULL THROAT',
    desc: 'BAAH stuns men near you, even as they swing.',
    stat: (p) => `DAZES EVERYONE WITHIN ${sayN(BOON_BASE.screamRadius)} TILES FOR ${sayN(TUNING.goat.scream.stun)}s · ${sayN(p.cooldown)}s COOLDOWN`,
    params: { cooldown: TUNING.goat.scream.cooldown },
    apply: (m, p) => { m.screamStun = true; m.screamCooldown = p.cooldown; } },
  { id: 'breath', element: 'fire', synergy: ['kindling', 'ember'], skill: 'scream', active: true, emoji: '🔥', minLevel: 0, name: 'DRAGON BREATH',
    desc: 'BAAH breathes fire ahead of you: men and floor burn.',
    stat: (p) => { const B = TUNING.goat.breath; return `CONE ${sayN(B.range / TILE)} TILES LONG, ${Math.round(B.halfAngle * 360 / Math.PI)}° WIDE · FLOOR BURNS ${sayN(B.fireTime)}s · ${sayN(p.cooldown)}s COOLDOWN`; },
    params: { cooldown: TUNING.goat.breath.cooldown },
    apply: (m, p) => { m.breath = true; m.screamCooldown = p.cooldown; } },
  { id: 'bomb', skill: 'butt', active: true, emoji: '💣', minLevel: 0, name: 'BOMB CHARGE',
    desc: 'Headbutt a man. If he then dies on a wall or a man, he explodes.',
    stat: () => { const B = TUNING.goat.bomb; return `${sayN(B.fuse)}s FUSE · THROWS EVERYONE WITHIN ${sayN(B.radius / TILE)} TILES · YOU ARE ONLY SHOVED`; },
    apply: (m) => { m.bomb = true; } },
  { id: 'weight', synergy: ['breath', 'splash'], skill: 'roll', active: true, emoji: '🪨', minLevel: 0, name: 'DEAD WEIGHT',
    desc: 'Your roll stuns every man you roll through.',
    stat: (p) => `DAZES EVERYONE WITHIN ${sayN(TUNING.goat.roll.stunR / TILE)} TILES OF YOUR PATH FOR ${sayN(p.stun)}s · ONCE EACH PER ROLL`,
    params: { stun: TUNING.goat.roll.stun },
    apply: (m, p) => { m.rollStun = p.stun; } },
  // Poison, one on each button, and a second grab active that sets the floor behind a throw alight.
  // DEVOUR was a third, and was cut in 1.65: a kill with no wall in it and a heart back nearly one
  // time in two, on the most common man in the building, was the one card that broke a run.
  { id: 'splash', element: 'poison', synergy: ['breath'], skill: 'butt', active: true, emoji: '💦', minLevel: 0, name: 'SPLASH',
    desc: 'Every headbutt poisons the man you hit, and anyone right behind you.',
    stat: () => `REACHES ${sayN(TUNING.status.splash.range)} TILES BEHIND · ${sayPoison()}`,
    apply: (m) => { m.splash = true; } },
  { id: 'venomjaw', element: 'poison', synergy: ['kindling'], skill: 'grab', active: true, emoji: '🐍', minLevel: 0, name: 'VENOM JAW',
    desc: 'Hold a thing a moment, then throw it: it drops poison as it flies.',
    stat: (p) => { const s = TUNING.status.jaw.half * 2 + 1; return `HOLD ${sayN(p.holdFor)}s · POISONS WHO IT HITS · PUDDLE ${s}×${s} TILES FOR ${sayN(TUNING.status.poison.pool)}s · ${sayPoison()}`; },
    params: { holdFor: 1.5 },   // 2 until 29 Sep 2026 ("a little less time to light and poison")
    apply: (m, p) => { m.venomHold = p.holdFor; } },
  // The fire half of the mouth, against VENOM JAW's poison: poison is everywhere the throw touches
  // (floor, the man it hits, a puddle where it stops); fire is the line it flew, and a crate, which
  // leaves the mouth alight (25 Sep 2026), sets the man it meets burning and breaks into one fire.
  // It was CHARGED, a bomb where the throw stopped; the id stays `charge` so a saved run keeps it.
  { id: 'charge', element: 'fire', synergy: ['kindling', 'spit'], skill: 'grab', active: true, emoji: '☄️', minLevel: 0, name: 'FIREBRAND',
    desc: 'Hold a thing a moment, then throw: it sets the floor on fire.',
    stat: (p) => { const B = TUNING.status.brand; return `HOLD ${sayN(p.holdFor)}s · ITS PATH BURNS ${sayN(B.burn)}s, FROM ${sayN(B.gap)} TILE OUT OF YOUR MOUTH · A CRATE LIGHTS WHO IT HITS`; },
    params: { holdFor: 1.5 },   // 2 until 29 Sep 2026, with VENOM JAW
    apply: (m, p) => { m.brandHold = p.holdFor; } },
  { id: 'venomroll', element: 'poison', skill: 'roll', active: true, emoji: '🦠', minLevel: 0, name: 'SOUR TUMBLE',
    desc: 'Every roll leaves a puddle of poison where you land.',
    stat: () => { const s = TUNING.status.tumble.half * 2 + 1; return `PUDDLE ${s}×${s} TILES FOR ${sayN(TUNING.status.poison.pool)}s · ${sayPoison()}`; },
    apply: (m) => { m.venomRoll = true; } },
  // A goat is a jumper. Rolled at a man in front of him, the tumble goes over the man's back and
  // lands behind him, and the man is left reeling: a way round a doorway guard or a raised club,
  // never a kill, what kills is still the wall he was facing when you came down at his back.
  // With nobody in front it is the ordinary roll at the ordinary price.
  { id: 'leapfrog', skill: 'roll', active: true, emoji: '🐸', minLevel: 0, name: 'LEAPFROG',
    desc: 'Roll at a man to jump over him and stun him.',
    stat: (p) => `A MAN UP TO ${sayN(p.reach)} TILES AHEAD · YOU LAND ${sayN(p.behind)} TILE${+p.behind === 1 ? '' : 'S'} PAST HIM · HE REELS ${sayN(p.daze)}s · A LEAP COSTS ×${sayN(p.cooldownMul)} COOLDOWN`,
    // `cone` radians either side of where you are running (or pointing, standing still); `time` the
    // seconds in the air; `height` how high he is drawn at the top of it, in px; `over` the share of
    // the flight at which the hooves come down on the man's back.
    params: { reach: 3, cone: 0.6, behind: 1, daze: 0.9, cooldownMul: 2, time: 0.36, height: 20, over: 0.45 },
    apply: (m, p) => { m.leapfrog = Object.assign({}, p); } },
  { id: 'spit', element: 'poison', synergy: ['kindling'], skill: 'scream', active: true, emoji: '🫧', minLevel: 0, name: 'VENOM SPIT',
    desc: 'BAAH spits a ball of poison that makes a puddle.',
    stat: (p) => { const S = TUNING.status.spit; return `FLIES UP TO ${sayN(S.range)} TILES · PUDDLE OF ${S.tiles} TILES · ${sayN(p.cooldown)}s COOLDOWN · ${sayPoison()}`; },
    params: { cooldown: 4.5 * GOAT_CD },
    apply: (m, p) => { m.spit = true; m.screamCooldown = p.cooldown; } },

  // ---- passives ----
  { id: 'hide', emoji: '❤️', minLevel: 0, name: 'THICK HIDE', get desc() { const p = this.params; return `+${p.heartsAdd} max ${sayHearts(p.heartsAdd)}. It starts full.`; },
    stat: (p, b) => `+${p.heartsAdd} MAX HEART · +${b.heal} HEART NOW`,
    params: { heartsAdd: 1 },
    apply: (m, p) => { m.maxHp += p.heartsAdd; }, heal: 1 },
  // A card that argues with itself: every tuft is worth more and there is less goat to fill. Worth
  // it on a floor you mean to graze across, a mistake on one you mean to run through.
  { id: 'stomachs', emoji: '🌿', minLevel: 0, name: 'FOUR STOMACHS', get desc() { const p = this.params; return `Grass heals ${sayWord(p.gain)} more ${sayHearts(p.gain)}, but you lose ${sayWord(p.heartsLess)} max ${sayHearts(p.heartsLess)}.`; },
    stat: (p) => { const B = TUNING.prop.heal.bigGain; return `GRASS +1 → +${1 + p.gain} HEARTS · BIG GRASS +${B} → +${B + p.gain} · ${-p.heartsLess} MAX HEART · MILK UNCHANGED`; },
    params: { gain: 1, heartsLess: 1 },
    apply: (m, p) => { m.grassGain += p.gain; m.maxHp = Math.max(1, m.maxHp - p.heartsLess); } },
  // An active since 23 Sep 2026: as a passive it sat beside BOMB CHARGE or SPLASH and was simply
  // too much to have for free. Now it is what the headbutt *is*, and he wears it as a stag's antlers.
  { id: 'horns', skill: 'butt', active: true, emoji: '🦌', minLevel: 0, name: 'LONG HORNS', desc: 'Your headbutt reaches further and throws men harder.',
    stat: (p) => { const H = TUNING.goat.headbutt; return `REACH ${sayN(H.reach / TILE)} → ${sayN(H.reach * p.reachMul / TILE)} TILES · THROW +${sayPct(p.impulseMul - 1)}`; },
    // `impulseMul` 1.25 → 1.6 with the bare impulse cut to 21: the antlers throw about where they
    // did (33.6 vs 35 tiles/s) and still clear `physics.bodyBothSpeed`, so the gap they buy is bigger.
    params: { reachMul: 1.38, impulseMul: 1.6 },
    apply: (m, p) => { m.headbuttReach *= p.reachMul; m.headbuttImpulse *= p.impulseMul; m.antlers = true; } },
  { id: 'skull', addition: ['bomb', 'splash'], skill: 'butt', emoji: '💀', minLevel: 0, name: 'IRON SKULL', get desc() { const p = this.params; return `Headbutt recovery is ${sayTimes(1 / p.recoveryMul)} as fast.`; },
    stat: (p) => { const r = TUNING.goat.headbutt.recovery; return `RECOVERY ${sayN(r)}s → ${sayN(r * p.recoveryMul)}s`; },
    params: { recoveryMul: 0.5 },
    apply: (m, p) => { m.headbuttRecovery *= p.recoveryMul; } },
  // The headbutt's second passive (1 Oct 2026: every button had room for two and three had one). Pillar
  // 1 as a number: the run-up he has when the head goes down (`goat.buttRun`, 0..1 of `momentum`) is
  // thrown into the man too, so a goat who never stopped hits harder than one who stood and swung.
  // It throws, it does not kill: the wall he is thrown at still does that.
  { id: 'neck', addition: ['horns', 'bomb', 'hocks'], skill: 'butt', emoji: '🐂', minLevel: 0, name: 'BULL NECK',
    desc: 'The longer your run-up, the harder your headbutt throws.',
    stat: (p) => `A MAN THROWN UP TO ×${sayN(1 + p.bonus)} AS HARD, AFTER ${sayN(TUNING.goat.momentum.time)}s OF RUNNING · PART OF IT FOR LESS`,
    params: { bonus: 0.6 },
    apply: (m, p) => { m.runButt = p.bonus; } },
  // 6 Oct 2026: things, not men. A crate, a blade, a bomb leaves the mouth `throwMul` as hard (it flies
  // that much further against the same drag, `Goat.throwHeld`); a man is thrown as he was, so where a
  // wall kills him (`physics.thrownKill`) is BY THE COLLAR's number and nobody else's. It needs no
  // collar any more, and LIVING SHIELD, the soul it was paired with, is gone.
  { id: 'jaw', addition: ['venomjaw', 'charge', 'ricochet'], skill: 'grab', emoji: '🦷', minLevel: 0, name: 'STRONG JAW', desc: 'Things you throw fly further, and grab is ready sooner.',
    stat: (p) => { const G = TUNING.goat.grab; return `A THING THROWN ×${sayN(p.throwMul)} AS HARD, A MAN AS BEFORE · GRAB COOLDOWN ${sayN(G.cooldown)} → ${sayN(G.cooldown * p.cooldownMul)}s, AFTER A MAN ${sayN(G.cooldown * G.manCd)} → ${sayN(G.cooldown * G.manCd * p.cooldownMul)}s`; },
    params: { throwMul: 1.35, cooldownMul: 0.6 },
    apply: (m, p) => { m.throwFar *= p.throwMul; m.grabCooldown *= p.cooldownMul; } },
  // The throw is the grab's whole point and the one verb with no time to aim it: this is that time.
  // Everything slows, the goat too, so it is a moment to look, not a moment to run. It ends the
  // instant the thing leaves his mouth, and `every` keeps a pick-up-drop-pick-up from living in it.
  { id: 'coldeye', skill: 'grab', emoji: '⏳', minLevel: 0, name: 'COLD EYE',
    desc: 'Picking something up slows time until you throw it.',
    stat: (p) => `TIME AT ${sayPct(p.scale)} FOR UP TO ${sayN(p.time)}s AFTER A PICK-UP · ENDS ON THE THROW · ONCE EVERY ${sayN(p.every)}s`,
    params: { scale: 0.35, time: 2, every: 5 },
    apply: (m, p) => { m.coldEye = Object.assign({}, p); } },
  // The grab's fourth passive (3 Oct 2026 playtest: "a sword thrown at a wall can ricochet into an enemy,
  // as an extra level"). A blade meeting stone (`Prop.glance`) turns off it toward the nearest man in
  // front of that wall within `reach` tiles that it can see, at `keep` of its speed (never under `min`
  // tiles/s), `bounces` times a throw; with nobody there it is a blade thrown away, as ever. No blow is
  // spent on the bounce: the blade still has its one man in it. It does not aim the throw, the wall does.
  { id: 'ricochet', skill: 'grab', emoji: '🗡️', minLevel: 0, name: 'RICOCHET',
    desc: 'A sword you throw at a wall bounces into the nearest man.',
    stat: (p) => `OFF STONE INTO A MAN WITHIN ${sayN(p.reach)} TILES IT CAN SEE · ${p.bounces === 1 ? 'ONCE' : `UP TO ${p.bounces} TIMES`} A THROW · KEEPS ${sayPct(p.keep)} OF ITS SPEED, AT LEAST ${sayN(p.min)} TILES/s`,
    params: { reach: 6, keep: 0.85, min: 14, bounces: 1 },
    apply: (m, p) => { m.ricochet = Object.assign({}, p); } },
  { id: 'kindling', element: 'fire', emoji: '🪵', minLevel: 0, name: 'KINDLING', desc: 'A burning man sets fire to the next man he touches.',
    stat: () => 'ONE MAN DEEP: THE ONE HE LIGHTS LIGHTS NOBODY',
    apply: (m) => { m.firePass = Math.max(m.firePass, 1); } },
  // `radius` is how far THE FULL THROAT reaches and nothing else: the bare call, the breath and the
  // spit each have their own reach, so the card says so rather than promising a louder voice.
  { id: 'throat', addition: ['howl', 'breath', 'spit'], skill: 'scream', emoji: '🗣️', minLevel: 0, name: 'RAW THROAT', desc: 'BAAH is ready much sooner.',
    // No number on the card: `scream.minCooldown` clamps the halving (3.6 → 2 s bare, less with the goose).
    stat: (p) => `COOLDOWN ×${sayN(p.cooldownMul)}, NEVER UNDER ${sayN(TUNING.goat.scream.minCooldown)}s · THE FULL THROAT REACHES ${sayN(BOON_BASE.screamRadius)} → ${sayN(p.radius)} TILES`,
    params: { cooldownMul: 0.5, radius: 6.5 },   // 13 until 30 Sep 2026, halved with the bare daze
    apply: (m, p) => { m.screamCooldown *= p.cooldownMul; m.screamRadius = p.radius; } },
  // The voice's second passive: how far it carries, in every form it takes, the call and the arm's length
  // it breaks a swing at, THE FULL THROAT's daze, DRAGON BREATH's cone, VENOM SPIT's flight. One
  // multiplier read at each use site (`mods.screamReach`), never folded into `screamRadius`: RAW THROAT
  // sets that outright, and the order two passives are laid in must not decide what either is worth.
  { id: 'lungs', addition: ['howl', 'breath', 'spit', 'throat'], skill: 'scream', emoji: '🫁', minLevel: 0, name: 'BIG LUNGS',
    desc: 'Every kind of BAAH reaches further.',
    stat: (p) => `×${sayN(p.reachMul)} REACH · CALLS MEN FROM ${sayN(BOON_BASE.screamCall * p.reachMul)} TILES · THE FULL THROAT ${sayN(BOON_BASE.screamRadius * p.reachMul)} TILES · BREATH ${sayN(TUNING.goat.breath.range * p.reachMul / TILE)} TILES · SPIT ${sayN(TUNING.status.spit.range * p.reachMul)} TILES`,
    params: { reachMul: 1.3 },
    apply: (m, p) => { m.screamReach *= p.reachMul; } },
  { id: 'hooves', addition: ['joints'], emoji: '💨', minLevel: 0, name: 'SURE HOOVES', get desc() { const p = this.params; return `You run ${sayPct(p.speedMul - 1)} faster.`; },
    stat: (p) => `SPEED +${sayPct(p.speedMul - 1)}`,
    params: { speedMul: 1.2 },   // 1.13 until 6 Oct 2026 ("run 20% faster")
    apply: (m, p) => { m.speed *= p.speedMul; } },
  { id: 'joints', addition: ['weight', 'venomroll'], skill: 'roll', emoji: '🤸', minLevel: 0, name: 'LOOSE JOINTS', desc: 'Your roll goes further and is ready again sooner.',
    stat: (p) => { const R = TUNING.goat.roll, d = R.speed * R.duration / TILE; return `ROLL ${sayN(d)} → ${sayN(d * p.distanceMul)} TILES · COOLDOWN ${sayN(R.cooldown)} → ${sayN(R.cooldown * p.cooldownMul)}s`; },
    params: { distanceMul: 1.35, cooldownMul: 0.45 },
    apply: (m, p) => { m.rollDistance *= p.distanceMul; m.rollCooldown *= p.cooldownMul; } },
  // The roll's second passive. A tumble costs the stride he had built (`Goat.update`, the landing): this
  // keeps it, and `keep` of the tumble's own speed, so he lands running instead of getting up. It buys
  // nothing in the air (no mercy frames, rule 4), only what comes after the landing.
  { id: 'hocks', addition: ['hooves', 'neck', 'joints'], skill: 'roll', emoji: '🦘', minLevel: 0, name: 'SPRING HOCKS',
    desc: 'After a roll you keep running and keep your run-up.',
    stat: (p) => { const R = TUNING.goat.roll; return `LANDING SPEED ${sayPct(R.land)} → ${sayPct(p.keep)} OF THE ROLL'S · THE RUN-UP IS KEPT · ${sayN(R.speed * p.keep / TILE)} TILES/s OUT OF IT`; },
    params: { keep: 0.75 },
    apply: (m, p) => { m.rollKeep = p.keep; } },
  { id: 'ember', element: 'fire', addition: ['breath', 'kindling'], emoji: '🧯', minLevel: 0, name: 'EMBER COAT', get desc() { const p = this.params; return `Fire takes ${sayTimes(p.fireResist)} as long to hurt you. Not violet witchfire.`; },
    stat: (p) => { const t = TUNING.goat.fireDamageInterval; return `STANDING IN FIRE: 1 HEART EVERY ${sayN(t)}s → EVERY ${sayN(t * p.fireResist)}s`; },
    params: { fireResist: 3 },
    apply: (m, p) => { m.fireResist = p.fireResist; } },
  { id: 'oracle', emoji: '👁️', minLevel: 0, name: 'THE ORACLE', desc: 'You can see through walls near you.',
    stat: () => `SEE THROUGH STONE WITHIN ${sayN(TUNING.fog.oracle)} TILES`,
    apply: (m) => { m.oracle = true; } },
  // The special perk (30 Sep 2026: "the third choice comes from a special perk, or a special item"):
  // a soul spent on wider souls. It is body work, so it takes one of the four body places, and it
  // is worth most taken early, a run is dealt fifteen souls or so, and every one after it is a
  // choice of three. THE KNUCKLEBONE (ARTIFACTS) is the same thing on a cord, in tiers.
  { id: 'hunger', emoji: '🕯️', minLevel: 0, name: 'HUNGRY SOUL',
    get desc() { const p = this.params; return p.every <= 1 ? 'Every soul after this offers a third card.' : `Every ${sayNth(p.every)} soul after this offers a third card.`; },
    stat: (p) => `A THIRD CARD ON ${p.every <= 1 ? 'EVERY SOUL' : `EVERY ${sayNth(p.every).toUpperCase()} SOUL`} · WORN WITH THE KNUCKLEBONE, THE MORE GENEROUS OF THE TWO`,
    params: { every: 1 },
    apply: (m, p) => { m.thirdEvery = m.thirdEvery ? Math.min(m.thirdEvery, p.every) : p.every; } },
];
// Souls the dev drawer's BOONS tab rewrote or took out of the deal (6 Oct 2026: "delete / change text
// on the tools page"). Through the dev server a plain `name:` / `desc:` above is rewritten where it
// stands; a desc a getter builds has no literal, so its new words wait in `BOON_TEXT`. `BOON_OFF` is
// every soul never dealt (`Game.boonOpen`), kept in the deck so RESTORE is one id out of a list.
// Both written by tools/text-patch.js `editBoon`, laid on at load by `BoonEdit.apply` (js/text-edit.js).
const BOON_TEXT = {
};
const BOON_OFF = [];

// THE MIRROR (js/heaven.js, 29 Sep 2026: "a mirror, or something, that buys upgrades that stay, the
// progression grows and the skill grows with it"). What the sacrifices of every life buy, for good:
// this browser's, never the run's, under every run `Game.applyBoons` lays. Each is a number the goat
// already has, bent a little (pillar 1: no new button), in `costs.length` ranks. `tell(p, r)` is rank
// `r` whole, what the glass says; `apply(m, p, r)` lays rank `r` into `mods`. None of it is on the
// compound's own curve: `balance.js` measures the bare goat, as a first run is.
// `souls[r]` (29 Sep 2026: "the strongest upgrades up there want corrupted souls too") is what rank
// `r + 1` asks in corrupted souls on top of its sacrifices: every soul the goat swallows down there is
// banked up here (`Heaven.earnSoul`), and only the top ranks of the best three want any.
const MIRROR = [
  { id: 'fleece', name: 'THICK FLEECE', costs: [40, 120], souls: [0, 3], params: { hearts: [1, 2] },
    tell: (p, r) => `${sayWord(p.hearts[r - 1]).replace(/^./, (c) => c.toUpperCase())} more ${sayHearts(p.hearts[r - 1])} on every floor.`,
    apply: (m, p, r) => { m.maxHp += p.hearts[r - 1]; } },
  { id: 'halo', name: 'HALO', costs: [30, 90], souls: [0, 2], params: { light: [1, 2] },
    tell: (p, r) => r > 1 ? `You start every floor with ${sayWord(p.light[r - 1])} hearts of light. Each takes one hit.` : 'You start every floor with a heart of light. It takes the first hit.',
    apply: (m, p, r) => { m.lightHearts = p.light[r - 1]; } },
  { id: 'grazer', name: 'GOOD GRAZER', costs: [25, 80], souls: [0, 1], params: { graze: 0.5 },
    tell: (p, r) => `Milk grass and the pail take ${p.graze === 0.5 ? 'half' : sayPct(p.graze) + ' of'} the time to graze.${r > 1 ? ' The first milk grass of a floor heals you fully.' : ''}`,
    apply: (m, p, r) => { m.grazeMul = p.graze; if (r > 1) m.milkFull = true; } },
  { id: 'tumble', name: 'QUICK TUMBLE', costs: [20, 60], params: { cd: [0.85, 0.7] },
    tell: (p, r) => `Your roll is ready ${sayPct(1 - p.cd[r - 1])} sooner.`,
    apply: (m, p, r) => { m.rollCooldown *= p.cd[r - 1]; } },
  { id: 'mercy', name: 'LONG MERCY', costs: [15, 50], params: { add: [0.2, 0.45] },
    tell: (p, r) => r > 1 ? 'After a hit, you are safe for much longer.' : 'After a hit, you are safe a little longer.',
    apply: (m, p, r) => { m.invulnAdd = p.add[r - 1]; } },
  // 1 Oct 2026, playtest: "one upgrade, SECOND CHANCE: instead of going up to heaven, once, back where
  // you died on two hearts, 250 and three corrupted souls". On the glass only once the god's 200 are
  // brought (`needs: 'quest'`, `Heaven.questDone`). Once a floor: a death that goes up resets it.
  { id: 'second', name: 'SECOND CHANCE', costs: [250], souls: [3], needs: 'quest', params: { hearts: TUNING.heaven.second.hearts },
    tell: (p) => `Once a floor, you come back where you died, with ${sayWord(p.hearts)} hearts.`,
    apply: (m, p) => { m.secondChance = p.hearts; } },
];

// THE TALISMANS (`ARTIFACTS`). What the mouse sells, worn on the collar at his neck, up to
// `TUNING.talisman.slots` (three) a run, side by side (6 Oct 2026: "you can collect several, up to
// three"), each shown right of the hearts and as its own charm on the collar. A card bends a number
// behind a button; a talisman bends a rule of the compound: what fire does, what the next floor
// hides, what a thrown body does. None of them is a verb: the verbs are the capes (`CAPES`, below),
// and Q belongs to the cape.
// GRADES (6 Oct 2026, the user: "I don't want four grades on each, one or two makes sense; some only
// in common, with middle numbers, the pilgrim's sandal say"). A talisman has one tier (COMMON) or two
// (COMMON, RARE), never more: a ladder of four was four numbers on one rule, and nobody could tell the
// second from the third on a shelf. Where the rule has a real second step (a crate that also throws,
// a fire that goes on through a crowd) the RARE tier is that step; where it does not (the sandal, the
// bell, the knucklebone) there is one tier, set in the middle of the old ladder. The first mouse of a
// run sells COMMON only, later mice may sell RARE where it exists (`TUNING.shop.rare`, `stockFor`), the
// crow brings the top tier (`TUNING.prop.crow.giftTier`), and killing her rat ogre lifts whatever is
// left on the shelf to its top tier (`Shop.ogreDown`). `apply(m, p)` reads the tier's `params` into
// `game.mods` the way a boon's does, so the use sites read `mods` and never `ARTIFACTS`; two worn never
// share an id (`Shop.take`: taking one he already wears lifts it to its top tier instead).
// Two lines per talisman, both built off the tier's own params and stating that tier WHOLE (a shelf
// sells either tier on its own, so a tier cannot be a diff on the one before):
// - `tell(p)` is what the player reads, the shelf note, the chip hover, as a tier's `desc`: one or
//   two plain lines of what it does, a number only where it is the point (25 Sep 2026: "no story,
//   no exact numbers"). It replaced both the old `ARTIFACT_HOW` sentence and the numbers line under
//   it, which together were either a story or a pile of timings.
// - `say(p)` is the tier in full numbers, as a tier's `detail`, for the TALISMANS tab only.
// Both are getters (below the list), so the TALISMANS tab moving a param moves the words with it.
const ARTIFACTS = [
  { id: 'firecharm', name: 'FIRE AMULET', color: '#f2a233',
    tell: (p) => `A burning man lights the next man he touches${p.pass === 1 ? '' : p.pass >= 5 ? ', and so on through a crowd' : `, up to ${sayWord(p.pass)} in a row`}.`,
    say: (p) => `A BURNING MAN LIGHTS THE NEXT ONE HE TOUCHES, ${p.pass === 1 ? 'AND THAT ONE LIGHTS NOBODY' : p.pass >= 5 ? 'AND ON IT GOES THROUGH THE WHOLE CROWD' : `AND ON IT GOES: ${p.pass} MEN DEEP`}.`,
    // COMMON starts past KINDLING (pass 1): worn at 1 it was the soul card over again (2 Oct 2026).
    tiers: [
      { params: { pass: 3 } },
      { params: { pass: 99 } }],
    apply: (m, p) => { m.firePass = Math.max(m.firePass, p.pass); } },
  { id: 'clover', name: 'LUCKY CLOVER', color: '#7c8f52',
    // What `generateLevel` does with `mods.luck`, said as it does it: every floor built while it is
    // worn (not the next one only), the multiplier on the chance of a SECOND secret wall (at 3 and
    // over, most rooms that can hold one get one), and the extra heals are grass.
    tell: (p) => `Every floor you enter has ${p.secret >= 3 ? 'a secret wall in most rooms' : 'more secret walls'}, more weapons and big grass${p.heals ? ', and more grass to heal on' : ''}.`,
    say: (p) => `EVERY FLOOR BUILT WHILE WORN: ${p.secret >= 3 ? 'A SECRET WALL IN MOST ROOMS THAT CAN HOLD ONE' : `A SECOND SECRET WALL x${sayN(p.secret)} AS LIKELY`}, WEAPON RACKS x${sayN(p.racks)}, BIG GRASS (+${TUNING.prop.heal.bigGain} HEARTS) BEHIND A SECRET x${sayN(p.grass)}${p.heals ? `, +${p.heals} GRASS` : ''}.`,
    tiers: [
      { params: { secret: 2, racks: 1.8, grass: 1.7, heals: 1 } },
      { params: { secret: 3, racks: 2.8, grass: 2.4, heals: 2 } }],
    apply: (m, p) => { m.luck = p; } },
  // BOOMERANG and STRANGE SYMBOLS were talismans on Q until 6 Oct 2026; they are capes now (`CAPES`).
  // ---- the seventeen from ARTIFACTS_TZ.md. Their machinery is js/talismans.js; `tag` keeps the
  // mouse from putting two of the same sort on one shelf (`stockFor`). ----
  { id: 'mason', tag: 'geo', name: "MASON'S MARK", color: '#8d8a85',
    tell: (p) => `Men you throw die on walls from a softer throw${p.props ? '. Crates and racks count as walls' : ''}${p.bodies ? ', and so does another man' : ''}.`,
    say: (p) => `A THROWN MAN DIES ON STONE AT ${sayPct(p.splat)} OF THE USUAL SPEED${p.props ? '. A CRATE OR A RACK COUNTS AS STONE' : ''}${p.bodies ? '. A MAN THROWN INTO ANOTHER KILLS HIM AT THAT SPEED TOO' : ''}.`,
    tiers: [
      { params: { splat: 0.8, props: true, bodies: false } },
      { params: { splat: 0.75, props: true, bodies: true } }],
    apply: (m, p) => { m.mason = p; } },
  { id: 'domino', tag: 'geo', name: 'DOMINO BONE', color: '#efe6d0',
    tell: (p) => `A thrown man who hits another throws him too${p.links === 1 ? '' : `, up to ${sayTimes(p.links)}`}.`,
    say: (p) => `A THROWN MAN WHO BOWLS ANOTHER OVER PASSES THE THROW ON ${p.links === 1 ? 'ONCE' : `UP TO ${p.links} TIMES`}, KEEPING ${sayPct(p.keep)} OF ITS SPEED${p.links === 1 ? '' : ' EACH TIME'}.`,
    tiers: [
      { params: { links: 2, keep: 0.7 } },
      { params: { links: 4, keep: 0.75 } }],
    apply: (m, p) => { m.domino = p; } },
  { id: 'echo', tag: 'butt', name: 'ECHO HORN', color: '#efe6d0',
    // The blows come `delay` apart, each after the last (`Talisman.onLunge`), not all at once.
    tell: (p) => `A ${p.power < 1 ? 'weaker ' : ''}ghost headbutt follows each of yours${p.count > 1 ? `, then ${sayWord(p.count - 1)} more to the side` : ''}.`,
    say: (p) => `${sayN(p.delay)}s AFTER EVERY HEADBUTT A GHOST BLOW FOLLOWS${p.count > 1 ? `, AND ${p.count === 2 ? 'ANOTHER' : `${p.count - 1} MORE`} ${sayN(p.delay)}s AFTER THAT, ${Math.round(p.spread * 180 / Math.PI)}° ASIDE` : ''}: ${sayPct(p.reach)} OF THE REACH, ${sayPct(p.power)} OF THE THROW.`,
    tiers: [
      { params: { delay: 0.4, power: 1, count: 1, spread: 0, reach: 0.6 } },
      { params: { delay: 0.4, power: 1, count: 2, spread: 0.26, reach: 0.6 } }],
    apply: (m, p) => { m.echo = p; } },
  { id: 'spade', tag: 'geo', name: "GRAVEDIGGER'S SPADE", color: '#8d8a85',
    tell: (p) => `Bodies stay, and men fall over them${p.grab ? '. Grab one to throw it' : ''}${p.lethal ? ': it kills what it hits' : ''}.`,
    say: (p) => `BODIES STAY ${sayN(p.life)}s, UP TO ${p.cap}. A MAN WHO RUNS INTO ONE IS FLOORED ${sayN(p.trip)}s${p.grab ? '. GRAB ONE AND THROW IT LIKE A CRATE' : ''}${p.lethal ? ': IT KILLS WHAT IT HITS' : ''}.`,
    tiers: [
      { params: { life: 20, trip: 0.6, grab: true, lethal: false, r: 12, cap: 6 } },
      { params: { life: 25, trip: 0.6, grab: true, lethal: true, r: 12, cap: 6 } }],
    apply: (m, p) => { m.spade = p; } },
  { id: 'grease', tag: 'geo', name: "BUTCHER'S GREASE", color: '#c0392b',
    tell: (p) => `A wall kill leaves grease: thrown men slide ${p.drag <= 0.25 ? 'much ' : ''}further on it${p.slip ? ', running men slip' : ''}.`,
    say: (p) => `A WALL KILL GREASES ${sayN(p.r)} ${p.r === 1 ? 'TILE' : 'TILES'} ROUND IT FOR ${sayN(p.life)}s: A THROWN MAN SLIDES ON ${sayPct(p.drag)} OF THE DRAG${p.slip ? `, A MAN CHASING ACROSS SLIPS ${sayPct(p.slip)} A SECOND` : ''}, YOU KEEP ${sayPct(p.grip)} GRIP.`,
    tiers: [
      { params: { life: 15, r: 1, drag: 0.5, slip: 0.3, grip: 0.7 } },
      { params: { life: 20, r: 1.3, drag: 0.15, slip: 0.3, grip: 0.7 } }],
    apply: (m, p) => { m.grease = p; } },
  { id: 'awl', tag: 'geo', name: "CARPENTER'S AWL", color: '#a57949',
    tell: (p) => `A breaking crate ${p.fling ? 'throws' : 'knocks down'} everyone ${p.r > 1.2 ? 'near' : 'next to'} it.`,
    say: (p) => `A CRATE THAT BREAKS ${p.fling ? 'THROWS' : 'FLOORS'} EVERYONE WITHIN ${sayN(p.r)} ${p.r === 1 ? 'TILE' : 'TILES'} OF IT${p.fling ? ` CLEAR, AT ${sayN(p.fling)} TILES A SECOND` : ''}. THE BIG ONES ONLY STAGGER.`,
    tiers: [
      { params: { r: 1.2, fling: 8 } },
      { params: { r: 1.5, fling: 12 } }],
    apply: (m, p) => { m.awl = p; } },
  { id: 'mask', tag: 'ai', name: 'HORNED MASK', color: '#efe6d0',
    tell: (p) => `Men who see a death nearby panic and run${p.drop ? ', stopping their attack' : ''}${p.blind ? ', blind to what is in the way' : ''}.`,
    say: (p) => `A MAN WHO SEES ANOTHER DIE WITHIN ${sayN(p.r)} TILES PANICS AND RUNS ${sayN(p.flee)}s${p.blind ? ', BLIND TO WHAT IS IN HIS WAY' : ''}${p.drop ? ', DROPPING ANY BLOW HE WAS WINDING UP' : ''}. EACH MAN AT MOST ONCE EVERY ${sayN(p.cd)}s.`,
    tiers: [
      { params: { r: 4, flee: 1.5, drop: true, blind: false, cd: 4 } },
      { params: { r: 5, flee: 1.5, drop: true, blind: true, cd: 4 } }],
    apply: (m, p) => { m.mask = p; } },
  // STRAW EFFIGY was a talisman on Q until 6 Oct 2026; it is a cape now (`CAPES`).
  { id: 'spur', tag: 'run', name: 'BRASS SPUR', color: '#c29a44',
    tell: (p) => `You reach full speed ${sayTimes(1 / p.time)} as fast${p.keep ? ', and a hit no longer takes all of it' : ''}${p.throw > 1 ? '. At full speed your headbutt throws harder' : ''}.`,
    say: (p) => { const T = TUNING.goat.momentum.time; return `YOUR RUN-UP BUILDS IN ${sayN(T * p.time)}s, NOT ${sayN(T)}s${p.keep ? `, AND A HIT TAKES ${sayPct(1 - p.keep)} OF IT INSTEAD OF ALL` : ''}${p.throw > 1 ? `. AT A FULL RUN THE HORNS THROW x${sayN(p.throw)}` : ''}.`; },
    tiers: [
      { params: { time: 0.5, keep: 0.5, throw: 1 } },
      { params: { time: 0.5, keep: 0.5, throw: 1.6 } }],
    apply: (m, p) => { m.spur = p; } },
  { id: 'moth', tag: 'run', name: 'MOTH WOOL', color: '#b8ad97',
    tell: (p) => `Men hear your steps only from closer${p.near ? ', and not at all up close' : ''}${p.still ? '. Stand still and you are hard to spot' : ''}.`,
    say: (p) => `YOUR FOOTSTEPS CARRY ${sayPct(p.step)} AS FAR${p.near ? `, AND NOT AT ALL WITHIN ${sayN(p.near)} TILES OF A MAN WHO HAS NOT SEEN YOU` : ''}${p.still ? `. STAND STILL ${sayN(p.still)}s AND NOBODY WHO HAS NOT SEEN YOU YET CAN, PAST ${sayN(p.hide)} TILES` : ''}.`,
    tiers: [
      { params: { step: 0.5, near: 3, still: 0, hide: 4 } },
      { params: { step: 0.5, near: 3, still: 1.2, hide: 4 } }],
    apply: (m, p) => { m.moth = p; } },
  // One tier: the bell's thread is the point, a longer sight through stone is not a second rule.
  { id: 'bell', tag: 'run', name: "BELLWETHER'S BELL", color: '#c29a44',
    tell: (p) => `A mark at the screen's edge points to the stairs and the vault${p.sil ? '. You see men through walls nearby' : ''}${p.mimic ? '. Hidden wraiths shake' : ''}.`,
    say: (p) => `A MARK AT THE EDGE OF THE SCREEN POINTS TO THE STAIRS AND THE VAULT${p.sil ? `. MEN SHOW THROUGH STONE WITHIN ${sayN(p.sil)} TILES` : ''}${p.mimic ? '. A WRAITH HIDING AS A BOX OR GRASS TWITCHES' : ''}.`,
    tiers: [
      { params: { sil: 8, mimic: true } }],
    apply: (m, p) => { m.bell = p; } },
  // One tier, in the middle of the old ladder (the user's own example, 6 Oct 2026).
  { id: 'sandal', tag: 'run', name: "PILGRIM'S SANDAL", color: '#8a6238',
    tell: (p) => `Run into a new room with men behind you: extra speed.${p.reset ? ` Roll and BAAH ready${p.shake ? ', and they lose you' : ' again'}.` : ''}`,
    say: (p) => `INTO A NEW ROOM WITH A MAN ON YOUR HEELS (WITHIN ${sayN(p.range)} TILES): +${sayPct(p.speed)} SPEED FOR ${sayN(p.time)}s${p.reset ? ', AND YOUR ROLL AND VOICE ARE READY AGAIN' : ''}${p.shake ? '. THE MEN BEHIND LOSE YOU IN THE DOORWAY' : ''}.`,
    tiers: [
      { params: { speed: 0.25, time: 3, reset: true, shake: false, range: 10 } }],
    apply: (m, p) => { m.sandal = p; } },
  { id: 'scapegoat', tag: 'def', name: 'SCAPEGOAT', color: '#e8e0cc',
    tell: (p) => `Once, a killing hit leaves you with ${sayWord(p.hearts)} ${sayHearts(p.hearts)}${p.stun ? ' and stuns everyone near you' : ''}. Then it breaks.`,
    say: (p) => `ONCE: A KILLING BLOW IS CANCELLED. UP WITH ${p.hearts} ${p.hearts === 1 ? 'HEART' : 'HEARTS'} AND ${sayN(p.invuln)}s UNTOUCHABLE${p.stun ? `, AND EVERYONE WITHIN ${sayN(p.r)} TILES IS DAZED ${sayN(p.stun)}s` : ''}. THEN IT IS GONE.`,
    tiers: [
      { params: { hearts: 2, invuln: 1.5, stun: 0, r: 5 } },
      { params: { hearts: 2, invuln: 1.5, stun: 1.5, r: 5 } }],
    apply: (m, p) => { m.scapegoat = p; } },
  { id: 'tallow', tag: 'def', name: 'TALLOW SKIN', color: '#e8dcb0',
    tell: (p) => `A wax skin takes a hit for you and grows back after ${sayWord(p.rooms)} new rooms${p.soul ? ', or when you take a soul' : ''}.`,
    say: (p) => `A CRUST THAT TAKES ONE HIT FOR YOU. IT GROWS BACK AFTER ${p.rooms} NEW ROOMS${p.soul ? ', OR AT ONCE WHEN YOU TAKE A SOUL' : ''}.`,
    tiers: [
      { params: { rooms: 4, soul: true } },
      { params: { rooms: 3, soul: true } }],
    apply: (m, p) => { m.tallow = p; } },
  { id: 'mirror', tag: 'butt', name: 'MIRROR SHARD', color: '#bfe6ff',
    tell: (p) => `Headbutt as ${p.heavy ? 'a hit lands, even a big one,' : `${p.club ? 'a bullet, bite, club or blade' : 'a bullet or a bite'} lands`} to send it back. Miss and you are hit.`,
    say: (p) => `FOR ${sayN(p.window)}s FROM THE START OF A HEADBUTT: BULLETS FLY BACK, AND A BITE${p.club ? ', CLUB OR BLADE' : ''} THROWS ITS MAN BACK${p.heavy ? `. SO DO THE RAT OGRE'S ARM, A SLAM (REELING ${sayN(p.stun)}s) AND A RUNE WITHIN ${sayN(p.runeR)} TILES` : ''}. MISTIMED, YOU TAKE THE HIT.`,
    tiers: [
      { params: { window: 0.2, club: true, heavy: false, throw: 0.8, stun: 0.8, runeR: 6 } },
      { params: { window: 0.25, club: true, heavy: true, throw: 0.8, stun: 1, runeR: 6 } }],
    apply: (m, p) => { m.mirror = p; } },
  { id: 'cup', tag: 'count', name: 'BLOOD CUP', color: '#c0392b',
    tell: (p) => `Every ${p.need} men killed by a wall, wheel, grating or drop give a heart back${p.carry ? '. The count carries to the next floor' : ''}.`,
    say: (p) => `EVERY ${p.need} MEN KILLED BY THE ROOM (WALL, WHEEL, GRATING, DROP) GIVE 1 HEART, UP TO ${p.max} A FLOOR${p.carry ? '. THE COUNT CARRIES TO THE NEXT FLOOR' : ''}.`,
    tiers: [
      { params: { need: 10, carry: false, max: 2 } },
      { params: { need: 8, carry: true, max: 2 } }],
    apply: (m, p) => { m.cup = p; } },
  // The special item (30 Sep 2026): a soul deals two cards, and this is a third one. A goat's own
  // ankle bone, the oldest die there is. Its own tag: nothing else on a shelf is about the souls.
  // One tier, every second soul (6 Oct 2026): every soul is HUNGRY SOUL's, a body card, and a
  // third-card ladder on a cord was the same choice in four sizes.
  { id: 'knuckle', tag: 'soul', name: 'KNUCKLEBONE', color: '#e8dcc0',
    tell: (p) => p.every <= 1 ? 'Every soul offers a third card.' : `Every ${sayNth(p.every)} soul offers a third card.`,
    say: (p) => `A SOUL DEALS A THIRD CARD ${p.every <= 1 ? 'EVERY TIME' : `EVERY ${p.every}${p.every === 2 ? 'ND' : p.every === 3 ? 'RD' : 'TH'} SOUL`}, COUNTED FROM THE LAST THIRD CARD.`,
    tiers: [
      { params: { every: 2 } }],
    apply: (m, p) => { m.thirdEvery = m.thirdEvery ? Math.min(m.thirdEvery, p.every) : p.every; } },
  // THE MAGNET (1 Oct 2026, playtest: "it picks up an item and spins it round you, blocking the
  // enemies' attacks, and that breaks the item; middle rarity only a shield or a sword, once a room;
  // the highest rarity any two items, round you like Enter the Gungeon's, also once a room"). Once a
  // room it pulls up to `count` things lying in it within `reach` tiles into an orbit round him
  // (`TUNING.magnet`): a club, a bite or a bullet meeting one is stopped, and the thing breaks.
  { id: 'magnet', tag: 'def', name: 'THE MAGNET', color: '#c0392b',
    tell: (p) => `Once a room it pulls ${p.count === 1 ? (p.any ? 'a nearby thing' : 'a nearby sword or shield') : `${sayWord(p.count)} nearby ${p.any ? 'things' : 'swords or shields'}`} around you. ${p.count === 1 ? 'It blocks' : 'Each blocks'} one hit, then breaks.`,
    say: (p) => `ONCE A ROOM: UP TO ${p.count} ${p.any ? 'SWORDS, SHIELDS OR CRATES' : 'SWORDS OR SHIELDS'} WITHIN ${sayN(p.reach)} TILES FLY UP AND CIRCLE YOU. A CLUB, A BITE OR A BULLET MEETING ONE IS STOPPED (THE MAN DAZED ${sayN(TUNING.magnet.daze)}s) AND IT BREAKS.`,
    tiers: [
      { params: { count: 1, any: false, reach: 8 } },
      { params: { count: 2, any: true, reach: 8 } }],
    apply: (m, p) => { m.magnet = p; } },
  { id: 'tally', tag: 'butt', name: 'TALLY STICK', color: '#a57949',
    tell: (p) => `Every ${sayNth(p.every)} headbutt that hits throws ${sayTimes(p.mul)} as hard${p.stun ? ' and stuns the men next to him' : ''}.`,
    say: (p) => `EVERY ${p.every}${p.every === 2 ? 'ND' : p.every === 3 ? 'RD' : 'TH'} HEADBUTT THAT LANDS THROWS x${sayN(p.mul)}${p.stun ? ` AND DAZES EVERYONE WITHIN ${sayN(p.r)} ${p.r === 1 ? 'TILE' : 'TILES'} FOR ${sayN(p.stun)}s` : ''}.`,
    tiers: [
      { params: { every: 3, stun: 0, r: 1, mul: 2 } },
      { params: { every: 3, stun: 1, r: 1, mul: 2 } }],
    apply: (m, p) => { m.tally = p; } },
  // THE NOSEBAG (3 Oct 2026 playtest: "an item that lets you take the grass with you"). Milk grass grazed
  // with every heart full goes into the bag instead of saying FULL (`Talisman.bagGraze`), up to `hold`
  // tufts (big grass is two), and the bag is carried from floor to floor (`talRun.bag`). Hurt, standing
  // still with nothing in his teeth for `chew` of a graze, he puts his head in it and eats a tuft: a
  // heart, and FOUR STOMACHS' too (`Talisman.updateBag`). The graze verb, anywhere; no new button.
  { id: 'nosebag', tag: 'heal', name: 'NOSEBAG', color: '#8a6238',
    tell: (p) => `Grass you eat at full hearts goes in the bag${p.hold > 1 ? `, up to ${sayWord(p.hold)}` : ''}. When hurt, stand still to eat it.`,
    say: (p) => `MILK GRASS GRAZED AT FULL HEARTS IS KEPT, UP TO ${p.hold} ${p.hold === 1 ? 'TUFT' : 'TUFTS'} (BIG GRASS IS TWO), FROM FLOOR TO FLOOR. HURT, STAND STILL WITH NOTHING IN YOUR TEETH ${sayN(TUNING.prop.heal.grazeTime * p.chew)}s: A TUFT, A HEART.`,
    tiers: [
      { params: { hold: 2, chew: 1 } },
      { params: { hold: 3, chew: 0.7 } }],
    apply: (m, p) => { m.nosebag = p; } },
];
// A tier's `desc` (the player's line) is its talisman's `tell`, and `detail` (the TALISMANS tab's
// numbers) its `say`, both over the tier's own params and read when drawn.
for (const a of ARTIFACTS) for (const tier of a.tiers) {
  // `text`, when a talisman has one, is the shelf's line written by hand in the TALISMANS tab (click
  // the line), the same for both tiers; without it the line is `tell` off the tier's own params.
  Object.defineProperty(tier, 'desc', { get() { return a.text || a.tell(tier.params); }, enumerable: true });
  Object.defineProperty(tier, 'detail', { get() { return a.say(tier.params); }, enumerable: true });
}

// The mouse's third offer, beside her two talismans: no talisman at all, a pail of milk as tall as
// the goat, set down in front of her hole. It used to be three bowls scattered round the room with
// the words THREE BOWLS OF MILK written under them, an offer that had to be read. One enormous
// bucket says the same thing without a caption, which is what the 22 Sep 2026 note asked for, and it
// still holds `TUNING.shop.heals` hearts: a drink a heart, drunk where it stands.
// Shaped like an `ARTIFACTS` entry so the shelf can draw and read it out the same way; `Shop.buy` is
// what knows it is not one.
const MILK_OFFER = { id: 'milk', name: 'A PAIL OF MILK', color: '#efe6d0',
  tiers: [{ desc: `Heals ${TUNING.shop.heals} hearts, a drink at a time. Taking it means no talisman.` }] };

// A talisman's tier is its rarity, and there are two (6 Oct 2026; it was four, common to legendary,
// 1 Oct 2026). `RARITY[tier - 1]`. A cape is a rarity of its own (`CAPE_RARITY`): one grade, and
// rarer than either.
const RARITY = [
  { name: 'COMMON', color: '#c9c2b4', dim: 'rgba(201,194,180,0.55)' },
  { name: 'RARE', color: '#5aa7ff', dim: 'rgba(90,167,255,0.55)' },
];
const CAPE_RARITY = { name: 'CAPE', color: '#ff9f1c', dim: 'rgba(255,159,28,0.6)' };
const rarityOf = (tier) => RARITY[clamp((tier | 0) - 1, 0, RARITY.length - 1)];
// The crow's gift by the name the player sees on every shelf (`A RARE TALISMAN`), not a tier number.
// RARITY read directly: these lines are built as tuning.js loads, before rng.js brings `clamp`.
const crowGiftName = () => { const n = RARITY[Math.min(RARITY.length, Math.max(1, TUNING.prop.crow.giftTier)) - 1].name; return `${/^[AEIOU]/.test(n) ? 'AN' : 'A'} ${n} TALISMAN`; };

// THE CAPES (6 Oct 2026, the user: "a new item, a cape, worn on you; much rarer, and it gives an active
// skill with a big cooldown: teleport, more grass, destruction, the ones in the talismans now"). One worn
// at a time (`game.cape = { id }`), on his back, its own picture per facing (js/cape-pixels.js). Each is a
// verb on **Q**, the one key that does not exist until a cape is worn (ground rule 1's exception, which
// named the three Q talismans until they became capes): `apply(m, p)` puts its params on `game.mods`
// (`blink`, `sprout`, `ruin`, `boomerang`, `effigy`), `Cape.use` (js/capes.js) is what Q does, and
// `Goat.itemCd` is its own clock, never the grab's or the roll's. One grade each: a cape is found, not
// climbed. Where one turns up: a niche behind a niche (`carveSecret` lays a `cape` prop) and, now and
// then, on a mouse's shelf in place of a talisman (`TUNING.cape.shopChance`); nowhere else.
// `tell` / `say` as a talisman's: the player's line, and the numbers for the dev drawer.
const CAPES = [
  { id: 'symbols', name: 'CLOAK OF SIGNS', color: '#7d5cff',
    tell: (p) => `${sayQ()}: vanish and stand ${sayWord(Math.round(p.dist))} tiles ahead, through men, not walls${p.stun ? '. Men where you were are stunned' : ''}.`,
    say: (p) => `${sayQ()}: BLINK ${sayN(p.dist)} TILES AHEAD, THROUGH MEN BUT NOT WALLS.${p.stun ? ` WHOEVER STOOD WHERE YOU LEFT IS DAZED ${sayN(p.stun)}s.` : ''} ${sayN(p.cooldown)}s COOLDOWN.`,
    params: { dist: 5, cooldown: 10 * GOAT_CD, stun: 0.9 },
    apply: (m, p) => { m.blink = p; } },
  // Grass that still has to be grazed: a heart bought with standing still, never in the middle of a
  // blow. It grows `ahead` tiles in front of him on open floor (`Cape.sprout`), not in heaven.
  { id: 'meadow', name: "SHEPHERD'S MANTLE", color: '#9fbf4a',
    tell: (p) => `${sayQ()}: milk grass grows in front of you. Graze it to heal${p.big ? ' two hearts' : ''}.`,
    say: (p) => `${sayQ()}: A TUFT OF ${p.big ? 'BIG GRASS (+2)' : 'MILK GRASS (+1)'} GROWS ${sayN(p.ahead)} TILES AHEAD ON OPEN FLOOR, GRAZED AS ANY. ${sayN(p.cooldown)}s COOLDOWN.`,
    params: { cooldown: 33 * GOAT_CD, big: false, ahead: 1 },
    apply: (m, p) => { m.sprout = p; } },
  // The room comes apart round him and nothing of it touches him (`Cape.ruin`): crates, barrels, plank
  // doors, lamps, a cracked wall; men are thrown and floored, and the wall they meet is what kills (pillar 3).
  { id: 'ruin', name: 'CAPE OF RUIN', color: '#c0392b',
    tell: (p) => `${sayQ()}: a shock round you. Crates, barrels, doors and lamps break, men are thrown.`,
    say: (p) => `${sayQ()}: WITHIN ${sayN(p.r)} TILES CRATES, BARRELS AND PLANK DOORS BREAK, LAMPS GO OVER, A CRACKED WALL GIVES; MEN ARE THROWN AT ${sayN(p.fling)} TILES A SECOND AND DAZED ${sayN(p.daze)}s (THE BIG ONES ONLY STAGGER). NEVER HURTS YOU. ${sayN(p.cooldown)}s COOLDOWN.`,
    params: { cooldown: 21 * GOAT_CD, r: 2.5, fling: 15, daze: 0.8 },
    apply: (m, p) => { m.ruin = p; } },
  { id: 'boomerang', name: 'BONE MANTLE', color: '#efe6d0',
    tell: (p) => `${sayQ()}: throw a boomerang. It stuns ${p.pierce >= 99 ? 'every man' : p.pierce === 1 ? 'the first man' : `the first ${sayWord(p.pierce)} men`} it hits, both ways.`,
    say: (p) => `${sayQ()}: THROWN ${sayN(p.range)} TILES OUT AND BACK. ${p.pierce >= 99 ? 'EVERY MAN IT PASSES, BOTH WAYS, IS' : `UP TO ${p.pierce} ${p.pierce === 1 ? 'MAN EACH WAY IS' : 'MEN EACH WAY ARE'}`} DAZED ${sayN(p.stun)}s. ${sayN(p.cooldown)}s COOLDOWN.`,
    params: { stun: 1.8, cooldown: 12 * GOAT_CD, range: 7.5, pierce: 2 },
    apply: (m, p) => { m.boomerang = p; } },
  { id: 'effigy', name: "SCARECROW'S CAPE", color: '#c9a24e',
    tell: (p) => `${sayQ()}: put down a straw goat. Men near it attack it instead of you${p.shots ? ', rifles too' : ''}${p.oops ? '. A man who hits it hurts his neighbour' : ''}.`,
    say: (p) => `${sayQ()}: A STRAW GOAT STANDS ${sayN(p.life)}s. MEN WITHIN ${sayN(p.r)} TILES GO FOR IT INSTEAD OF YOU${p.shots ? ', AND RIFLES WASTE A ROUND ON IT' : ''}${p.oops ? '. A MAN WHO CLUBS IT HITS HIS NEIGHBOUR' : ''}. ${sayN(p.cooldown)}s COOLDOWN.`,
    params: { life: 6, r: 7, cooldown: 15 * GOAT_CD, shots: true, oops: true },
    apply: (m, p) => { m.effigy = p; } },
];
for (const c of CAPES) {
  Object.defineProperty(c, 'desc', { get() { return c.tell(c.params); }, enumerable: true });
  Object.defineProperty(c, 'detail', { get() { return c.say(c.params); }, enumerable: true });
}

// THE WORDS (1 Oct 2026, playtest: "when a description names a trait, poison, fire, a stun, or a word
// that is part of the game, let me point at it and read what it is, like Slay the Spire or Total War").
// Any description drawn through `Codex.rich` (the soul cards, the mouse's cards, the book on I) marks
// these words in their colour, and the pointer on one brings up `text`. `match` is the forms of the
// word it answers to, longest first; `color` a PALETTE key.
const KEYWORDS = [
  { id: 'poison', title: 'POISON', color: 'venomHi', match: ['poisoned', 'poisons', 'poison', 'venom', 'puddle', 'puddles'],
    text: "Blind and slow.\nDies on a wall from a softer hit.\n+ FIRE: a blast.\n+ STUN: he cannot move.\nA puddle slows you too." },
  { id: 'witchfire', title: 'WITCHFIRE', color: 'witchHi', match: ['witchfire', 'purple fire', 'violet fire'],
    text: "The mage's violet fire.\nNothing protects you from it." },
  { id: 'fire', title: 'FIRE', color: 'fireHi', match: ['burning', 'alight', 'burns', 'burn', 'fire', 'flames', 'flame', 'breathe fire'],
    text: "A burning man runs blind, then dies.\nSpreads over straw and grass.\nWalk into it and you burn too." },
  { id: 'stun', title: 'STUN', color: 'bone', match: ['stunned', 'stuns', 'stun', 'dazes', 'dazed', 'daze'],
    text: "He stands still and stops his attack.\nDies on a wall from a softer hit.\n+ FIRE: the fire takes two hearts.\n+ POISON: he cannot move." },
  { id: 'blast', title: 'BLAST', color: 'fireHi', match: ['blows up', 'explodes', 'explode', 'blast', 'bomb'],
    text: "Throws everyone close to it.\nIt only pushes you." },
  { id: 'wall', title: 'KILLS', color: 'ochre', match: ['a wall, a fire or another man', 'walls', 'wall', 'stone'],
    text: "Horns only knock a man down.\nWhat kills: a wall, a pillar, fire, the wheel, a drop, another body." },
  { id: 'throw', title: 'THROW', color: 'ochre', match: ['thrown', 'throws', 'throw', 'flung', 'hurls'],
    text: "Grab, then let go: it flies where you aim.\nA man thrown hard at a wall dies." },
  { id: 'soul', title: 'CORRUPTED SOUL', color: 'witchHi', match: ['corrupted souls', 'corrupted soul', 'souls', 'soul'],
    text: "A boss carries it.\nSwallow it: choose a card.\nHeaven keeps it for the mirror." },
  { id: 'runup', title: 'RUN-UP', color: 'bone', match: ['full speed', 'run-up', 'a full run'],
    get text() { return `Keep running: up to ${sayPct(TUNING.goat.momentum.max)} faster.\nA hit takes it all.`; } },
  { id: 'grating', title: 'GRATING', color: 'ashHi', match: ['grating', 'grate'],
    text: "Iron bars in the floor.\nStep on it and spikes come up, under you or a man chasing you." },
  { id: 'rune', title: 'RUNE', color: 'witchHi', match: ['runes', 'rune'],
    text: "A mage's circle on the floor.\nWhen it closes: witchfire." },
  { id: 'heart', title: 'HEARTS', color: 'blood', match: ['hearts', 'heart'],
    text: "Your life, top left.\nMilk grass and the pail give them back." },
  // 2 Oct 2026: the two words every card leans on that had no tip (BACKLOG, six reviews of 1.93).
  { id: 'baah', title: 'BAAH', color: 'bone', match: ['baah', 'your scream', 'scream'],
    text: "Your voice.\nMen come when they hear it.\nA man right next to you stops his attack." },
  { id: 'milk', title: 'MILK GRASS', color: 'bone', match: ['milk grass', 'big grass'],
    get text() { return `Stand in it and graze.\nIt gives one heart back, big grass ${sayWord(TUNING.prop.heal.bigGain)}.`; } },
  { id: 'roll', title: 'ROLL', color: 'bone', match: ['roll', 'rolls', 'tumble'],
    text: "Your dodge.\nNothing hits you mid-roll." },
  { id: 'secret', title: 'SECRET WALL', color: 'ochre', match: ['secret walls', 'secret wall', 'secret'],
    text: "A cracked wall.\nTwo headbutts open a small room: weapons, maybe big grass." },
  { id: 'q', title: 'THE Q KEY', color: 'fireHi', match: ['q:'],
    text: "A talisman with a use of its own puts it on Q." },
];

// What the death card says took the last heart: a kind of man (a clubman is split into the
// ordinary one and the butcher in `game.killedBy`), or the word a hazard passes to `Goat.damage`.
const KILLED_BY = {
  hunter: 'RIFLEMAN', dog: 'HOUND', seer: 'MAGE', butcher: 'OGRE', wraith: 'WRAITH', ratogre: 'RAT OGRE',
  fire: 'FIRE', witchfire: 'WITCHFIRE', spike: 'THE GRATING', bomb: 'A BOMB', mill: 'THE WHEEL',
  thrower: 'THE THROWER', toss: 'THE THROWER', shaman: 'THE SHAMAN',
  fall: 'THE DROP', rifle: 'A STRAY BULLET', spire: 'THE ROCK', chandelier: 'A CHANDELIER', powder: 'SPILT POWDER',
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
  // The mage at the first gate (`TUNING.bless`): to the man he leaves there, and that man's answer.
  bless: { hold: 'KEEP THE GOAT HERE.', give: 'TAKE MY STRENGTH.', keep: 'COME, GOAT.' },
  // the Mill, a lit brazier, a rune about to go off: everything else in the room that kills
  trap: ['THE WHEEL!', 'MIND THE ARMS', 'NOT THAT WAY', 'GO ROUND IT', 'STEP BACK'],
  // a shieldman whose board just took a blow (`Enemy.shieldTakes`)
  block: ['HA!', 'NOT THROUGH THIS', 'KNOCK KNOCK', 'TRY AGAIN, GOAT', 'GOOD BONE'],
  // a shieldman whose spikes just took the goat's horns
  spiked: ['HA! POINTY!', 'MIND THE HORNS', 'THAT ONE WAS MY UNCLE', 'BIG BONED!', 'TONIGHT WE DINE ON GOAT'],
  // the shieldman: going for the leap, bowling one of his own, hitting stone, butted from behind, his skulls gone
  bash: ['HUP!', 'BELLY FIRST!', 'HERE COMES PAPA', 'SQUASH!'],
  sorry: ['SORRY, BROTHER', 'MY BAD', 'YOU WERE IN THE WAY', 'NOT ME'],
  bonk: ['OW', 'WHO PUT THAT THERE', 'I MEANT THAT', 'MY HEAD'],
  back: ['NOT FAIR!', 'NOT FROM THERE!', 'MY BACK!', 'COWARD!'],
  shattered: ['MY SKULLS!', 'THAT WAS GRANDPA', 'I HAD THOSE YEARS'],
  // the butcher or a man with a soul in him, butted once too often, shoving the goat off (`Enemy.shoveBack`)
  shove: ['GET OFF', 'ENOUGH!', 'OFF ME, BEAST', 'BACK!', 'NOT AGAIN'],
  // a hound has the goat and the men know what that is worth
  hound: ['THE HOUNDS HAVE IT', 'LET THEM WORK', 'GOOD DOG', 'HOLD IT, DOG'],
  // something they buried has just become solid an arm's length away
  wraith: ['IT IS UP', 'DO NOT LOOK AT IT', 'THE DEAD WALK', 'COLD! COLD!', 'WE BURIED THAT'],
  // the thrower (`TUNING.thrower`): lifting something, throwing it, the goat over his head, a load dropped on himself
  lift: ['HEAVE!', 'UP YOU GO', 'CATCH!', 'FETCH, GOAT', 'HOLD STILL, BROTHER'],
  toss: ['FLY, LITTLE GOAT', 'OVER YOU GO', 'MIND THE HOLE', 'WHEEE', 'BACK TO THE PEN'],
  drop: ['MY BACK', 'TOO HEAVY', 'OOF', 'WHO PUSHED'],
  // the shaman (`TUNING.shaman`): the spirit going into his men, and the call on the goat
  spirit: ['RISE, BROTHERS', 'THE STAG RUNS IN YOU', 'HORNS OF THE OLD ONES', 'FEEL IT'],
  call: ['COME, LITTLE GOAT', 'TO ME', 'YOUR LEGS ARE MINE', 'COME HOME'],
};

// LEVEL MODIFIERS (6 Oct 2026): a rule laid over a whole floor, named by id in its `mods` list. Each one
// is its own file and reads its numbers off `TUNING.<id>`; `card` is added to the floor's card, `banner`
// is said over the picture once the card clears. THE CHASE (js/chase.js, `TUNING.chase`) is the first.
// Never on THE TRIP, in heaven or THE SHOWROOM. The dev drawer's CHASE row lays it over any other floor.
const LEVEL_MODS = {
  chase: { name: 'THE CHASE', card: 'they are coming', banner: 'THEY ARE COMING. KEEP RUNNING.' },
};

// Every level stops you twice. `gates` is the room index in the middle of the level, a REST room
// (`REST_TEMPLATE`): nobody in it but the keeper who carries its soul (`gateKeeper`), straw in the
// corners. Its way on is narrowed to a single tile and barred by a door no blow opens (`gen.js`,
// `gateSpot`), and what lifts the bar is that soul, or, on the levels in `TUNING.shop.levels`, the
// mouse: the middle gate is her room instead, and taking one of her three offers is the bar. `rests`
// is a second rest room before the end, with no bar and no soul. A gate is never a set piece, the
// vault's room, a teaching room or the last room. `souls` is the level's whole count and is spent
// in `startLevel` (`soulPlan`) in this order: the gate, then the level's LAST bosses; the vault
// never holds one (big grass). A boss with none left to give leaves milk. Two a level, less the three
// the mouse stands in for, is thirteen across a run against twenty-five boons and a build that
// holds fourteen: no run gets everything.
const LEVELS = [
  {
    // Level one teaches, in this order: one clubman standing in the only way out of his room, a room
    // of ordinary clubmen, the Mill, and only then the man who takes more than one hit, and the big
    // man at the end of it. Three things and nothing else: a small one, a big one, and the block.
    // The hound used to be here too and is now the first new thing level two has, because an animal
    // that darts is a different lesson from a man who swings and does not belong in the same hour.
    // Nothing here appears in a crowd before it has appeared alone.
    // `ritual` paints the altar, the remains and the tools into the first room, and is what makes the
    // opening scene possible; every later level arrives up a flight of stairs into a bare room instead.
    // Ten rooms (1.66 made it thirteen, below). It was twelve, two of which were empty floors carrying nothing but painted words,
    // the goat walked through a room that said WASD and a room that said GRAB before he had met
    // anybody to use either on. Both lines now live where the verb is: the pen teaches move and
    // headbutt on the bars themselves, and grab is painted in the room that stands a blade and a
    // crate in front of you. The rooms after the pen are rooms with men in them, and the count of
    // ordinary rooms, and so the whole difficulty curve, is exactly what it was.
    // 1.66, the ramp asked for room by room: the sentry in the doorway; one clubman loose in a room,
    // to be kicked about until it is clear what the horns are for; a room of lit bowls and straw
    // with nobody in it (`calmAt`), to butt a bowl over and watch it take; the wheel and its two men;
    // the blade and its two men; the first soul; two men stood in the straw (`trapAt`) with the fire
    // now a weapon; the first butcher, alone; three clubmen (`crowdAt`), so the butcher's two rooms are
    // not met back to back, played, that read as the same room twice, a glitch (24 Sep 2026); his
    // arena; a breather; the ogre, who carries the second and last soul. Thirteen rooms, and each
    // asks one new thing. 26 Sep 2026: the last room is the butcher again, a boss with two men at his
    // back and the second soul in him, the ogre is THE YARD's last room now, and nowhere before it.
    // 29 Sep 2026: twelve. The butcher's ring in the middle (room 10) is gone, two lit butchers on one
    // floor was "too much"; the lone one (room 8) is a plain butcher, and the only lit one is the last.
    name: 'THE ALTAR', sub: 'Level 1', rooms: 12, showControls: true, startCage: true, ritual: true,
    // The first idea and the plainest: a headbutt only ever knocks a man down, and it is the stone he
    // lands against that kills him. So the rooms here are pillars, corners and stub walls, and the
    // level is one long lesson in where to stand when you swing.
    canon: { id: 'stone', name: 'STONE', idea: 'The wall is the weapon. Pillars, corners and stub walls: a man knocked into any of them stays down. A man knocked onto open floor gets up.' },
    theme: "The cult's inner sanctum, the altar the sacrifice never reached.",
    decor: 'Bare stone: pillars, corners, stub walls, straw in the pen, one stand of arms, the Mill.',
    // The first man of the run holds his post instead of walking at you: he stands in the only way
    // out of his room, the generator narrows that corridor to a single tile for him, and the floor
    // under him says what the button does. Walking round him was the one thing everybody did, so now
    // there is nowhere to walk round to: the room does not open until he is down.
    sentryIntro: true,
    // 5 Oct 2026 playtest ("I did not know the grass heals"): one bowl in a corridor he has to walk, its words beside it.
    firstGrass: true,
    // The first boss of the game is one butcher and one man at his back, and `escorts` is what says
    // so: the arena's threat budget would otherwise buy two, and the first thing in the run with
    // more than one heart in it should be read as the butcher rather than as a crowd.
    // And the floor ends on him again, the boss butcher with two men at his back (26 Sep 2026), not
    // on the ogre: the one the horns cannot hurt is THE YARD's to show.
    // 29 Sep 2026: only that last one. The ring at room 10 made two lit butchers a floor.
    // 2 Oct 2026 playtest: "move the corrupted butcher to the second level, he is a bit hard". The floor
    // ends on a clubman with the soul in him, three hearts like the gate's keeper (`hp`), and two
    // clubmen at his back; the butcher's ring is THE YARD's now, one heart less and one man.
    arenas: [{ at: 11, boss: 'bearer', escorts: 2, hp: 3 }],
    // A wall that gives is not a thing to look for yet: none is carved before the first butcher
    // (room 8), so the one room that can hold it is the three clubmen after him. "After the first
    // arena" had left no ordinary room at all on this ramp (28 Sep 2026).
    secretsAfter: 8,
    // The one hard stop (see the note over `LEVELS`): the middle of the level. Nobody walks past the
    // first soul of the run any more, it is the bar. The breather between the butcher's two rings is
    // a rest room with no gate and no soul in it (`rests`): the second soul of the run is the last
    // boss's, carried by him and paid out when he goes down (24 Sep 2026: "the second soul after the
    // ogre"; the ogre is THE YARD's since 26 Sep), so the level ends on the fight that pays.
    // `surprises: false`: and those two are all it deals, no boss carrying one of his own, no room
    // giving one up (`soulPlan`). Played, a third soul between the two read as a mistake (26 Sep 2026).
    // `rollWith`: E - ROLL is painted at the door of the room that introduces that kind, the first
    // butcher's, whose hook (his charge until 30 Sep 2026) is the first thing in the run worth rolling out of.
    // And the first soul does not lie on the floor either (1.72, `gateKeeper`): a clubman keeps it,
    // quicker than the rest, two hearts, his club leaving witchfire where it lands, and the gate
    // opens on the soul he drops (`TUNING.soulKeeper`). The first soul of the run is fought for.
    // And he is seen to get it (`blessGate`, 26 Sep 2026): the mage from the opening scene is in the
    // room with her, gives him the soul in front of the goat and runs on through the gate, so the
    // soul is what made the man stronger, and the one who has her is somewhere past that door.
    gates: [6], rests: [10], gateKeeper: true, blessGate: true, surprises: false, rollWith: 'champion',
    // The wheel is met with nobody standing in the room, and arms are not a thing you find until
    // halfway in: the first half of the run is the goat and his head and nothing else.
    // The first stand of arms in the game is not a scatter, it is this room: a long approach, the
    // arm right inside the door, and whoever the room holds standing well down the far end of it.
    ambushAt: 5, calmAt: 3, trapAt: 7, trapTpl: 'hayloft', trapMen: ['bearer', 'bearer'],
    // Between the lone butcher (room 8) and the rest before his last ring (11): three clubmen, placed rather than rolled,
    // the one room on this floor past the two-a-room cap below, spacing is the lesson by now.
    crowdAt: 9, crowdMen: ['bearer', 'bearer', 'bearer'],
    // The wheel is met in a room built round it: a narrow one with a single lane past the arm, and
    // two men on the far side of it, one who cannot read it and rides it into the wall, one who
    // walks around it and comes on. `millLesson` is that pair, and it replaced the empty room the
    // wheel used to turn in: a hazard nobody is standing near is a thing to walk round rather than
    // a thing to use. See `millRoom` in `gen.js`.
    millAt: 4, millLesson: true, heals: 3, souls: 2, racks: 0.2, racksFrom: 0.4, traps: 1, crates: 0.3,
    // No hen yet. She is the one thing in the compound on your side, and a goat who has not been
    // shown a single fight to the finish has nothing to weigh "an ally who kills once" against.
    encounters: {
      kinds: ['bearer', 'champion'],
      introduce: [['bearer', 0], ['champion', 1]],
      from: 1, to: 4.5, ease: 1.5,
      // Two men to a room, and the arena's boss gets two rather than three at his back. Every other
      // level buys its difficulty in bodies; level one may not, because three men converging is not
      // a harder version of the lesson it is teaching, it is a different lesson, spacing, and it
      // arrives before the player has the verbs to answer it. The curve is untouched: what a room is
      // allowed to SPEND is the same, it simply has to spend it on better men rather than on more of
      // them, so the level still climbs and still ends on the butcher. The one exception is placed, not
      // bought: `crowdAt`'s three clubmen, after the first butcher, once there are verbs to answer them.
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
    // SPACE - BAAH on the floor of its first room with a crowd in it (30 Sep 2026, "write the space
    // lesson somewhere from the second floor"): the voice is the one verb THE ALTAR never names.
    teachScream: true,
    // The mage brings fire; the rooms already have it. Coals, straw and ovens, so the thing the Seer
    // does to the floor is a thing you have been doing to the floor yourself since the second room.
    canon: { id: 'fire', name: 'FIRE', idea: 'Coals and straw. Every room has something in it that burns, and by the time the mage lights the ground you have already lit it yourself.' },
    theme: 'The yard behind the sanctum, kept lit for the rendering to come.',
    decor: 'Braziers, straw, ovens, oil lamps, a hound pack, the Seer’s witchfire.',
    // The first mouse of the run stands in the middle gate and is one of the level's two upgrades;
    // the last boss's soul is the other (the ogre, since 26 Sep 2026), and the vault holds grass (`startLevel`). The seer is sealed in all the same: both doors of his room go iron the moment
    // the goat is inside, and neither gives until he does.
    // The ogre is this floor's last room and its first sight of him in the run (26 Sep 2026: "move
    // the ogre to the boss of the second level, at the end, and do not show him before"): alone, as
    // every kind is the first time, in the wide hall of bowls and swords the first ogre gets
    // (`OGRE_FIRST_TEMPLATE`), since the horns do nothing to him. Room 4, where he used to come back
    // with a man at his back, is an ordinary room of the curve again.
    // Room 4 (2 Oct 2026 playtest, moved off THE ALTAR's last room): the butcher as a boss, `hp` 4 (he
    // had five there, with the soul in him), and one man at his back; no soul, the floor's two are the
    // mouse's and the ogre's.
    arenas: [{ at: 4, boss: 'champion', escorts: 1, hp: 4 }, { at: 9, boss: 'seer', sealed: true }, { at: 11, boss: 'butcher' }],
    gates: [5], rests: [10], gateKeeper: true,
    // Room 3 is the chandelier's lesson (2 Oct 2026, `CHAND_LESSON_TEMPLATE`): the way out a one-tile
    // notch, one clubman holding it under a ring whose rope runs up the pier to a cleat. Never a trap.
    chandAt: 3,
    millAt: 7, heals: 2, souls: 2, racks: 0.16, traps: 1, crates: 0.3, barrels: 0.3, vaultAt: 6,
    // Two or three walls that give (6 Oct 2026, "more secrets on levels two and three"): the floors
    // where a run first learns a wall can be broken are where it should keep finding them.
    secrets: [2, 3],
    // The first escort of the run is the loudest one: a floor about fire and being found is the
    // right floor to be handed something that gives you away (js/beasts.js).
    beasts: ['chicken', 'goose', 'pig', 'rabbit', 'fish'],
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer'],
      // The seer at 0.4 since the chandelier's lesson took room 3 off the plain rooms (2 Oct 2026): at 0.5
      // he moved to room 8, the room before his own sealed ring.
      introduce: [['dog', 0.12], ['seer', 0.4]],
      // A softer foot (was 2, ease 1.3): the first rooms sit near where level one ended its ordinary
      // rooms, and the same top, so the far end of the level, and `GEN_RULES.harder`, are untouched.
      from: 1.5, to: 8.5, ease: 1.5,
    },
    floor: '#8a7554', floorAlt: '#907b5a', wall: '#3b2233', wallTop: '#55344a',
    // The art pass's Yard (`ART_PASS`): packed earth, not pale sand. On the sand a clubman's red and the
    // floor were the same brightness (contrast 1.0) and read apart only by hue; here 1.9, the goat
    // 3.7. The walls are lifted so they still stand off the darker floor. Its price, measured
    // (tools/art-study.js): the Road shares this swatch, and at this depth every tint of it comes out
    // the Road's brown (OKLab distance under 4 whatever the hue), the Yard would need its own swatch.
    artPass: { floor: '#3d3224', floorAlt: '#423627', wallTop: '#6e4862' },
    fog: '#120d12', doorChance: 0.42, ironDoors: 0.45, stack: 0.22,
    hint: 'THE MAGE BURNS THE GROUND YOU STAND ON', hintKey: 'roll',
  },
  {
    // Out under the compound, the ground stops being built. Nothing in the cave was laid by a hand:
    // no wall runs straight, no corner is square, and the room is whatever the rock left. What that
    // does to the one idea the whole game rests on, the wall kills, is make it a curve: a man
    // thrown along a bend in the rock slides round it instead of stopping dead on a corner, so the
    // stone that kills here is the stone he hits square. And the floor is not bare: tall grass that
    // you cannot see into or past, with a man lying in some of it, and boulders you break or go round.
    // Nothing new walks in. The cave itself is the new thing, the way the drop was.
    //
    // It was the last floor of the run and it is the third one now. It was in the wrong place twice
    // over: a level whose whole idea is the SHAPE of a room reads best before the run is deep in men,
    // and the eighth floor of anything is where the least of what you built gets looked at. Third, it
    // arrives right after the fire and right before the rifle, the last floor that is still about
    // the ground rather than about what is standing on it. Everything that made it a late level went
    // with the move: the rifles it had no business owning, the grating (which is THE ROAD's own new
    // thing, one floor later), its third ring, and two rooms of length.
    name: 'THE CAVE', sub: 'Level 3', rooms: 13,
    canon: { id: 'hollow', name: 'THE HOLLOW', idea: 'No wall runs straight. The rock curves, so a man thrown along it slides; he dies on what he hits square, a boulder, the end of a bend. The grass hides whoever is in it, and that includes you.' },
    theme: 'The caves the compound was dug out of, where nobody bothered to square the walls.',
    decor: 'Round rock, tall grass that hides, boulders that break, hounds and a garrison in the dark.',
    // `cave` rounds the rock (`TUNING.cave`) and erodes the corners of every ordinary room; `grass`
    // and `rocks` are the per-room chances of a patch of tall grass and a scatter of boulders, on top
    // of whatever the room's own template already put down. `rockClusters` is separate again: the
    // odds of a whole formation of them grown together, three to six cells, one big thing to break
    // rather than a handful of loose stones (`placeRockCluster`, `js/gen.js`).
    cave: true, grass: 0.8, rocks: 0.7, rockClusters: 0.35, grassColor: '#3d5a2a', grassHi: '#6f8f45', grassDark: '#223618',
    arenas: [{ at: 4, boss: 'butcher' }, { at: 10, boss: 'champion' }],
    gates: [6], rests: [11], gateKeeper: true,
    // No grating: the floor growing teeth is THE ROAD's own new thing and it is one floor later now.
    // What this floor has instead is the rock's own (`TUNING.cave.spikes`), which is not a trap, it
    // never arms and never rests, it is simply standing there, so the cave is not short of a hazard.
    // No trap room either, for the same reason: every template in that pool `needs: 'spikes'`.
    // `crates` 0.25 → 0.5 (29 Sep 2026, "something to throw in the caves too"): the cave has no
    // barrels, no grates and few racks, so a crate is most of what there is to pick up.
    millAt: 8, heals: 3, souls: 2, racks: 0.18, spikes: 0, crates: 0.5, traps: 0, vaultAt: 3,
    secrets: [2, 3],   // as THE YARD's
    // A floor whose one idea is the shape of the room is where a thing you throw down to make a
    // shape belongs. The hen too, as a second choice for the run's deal (`Beast.deal`).
    beasts: ['tortoise', 'chicken', 'pig', 'husky', 'rabbit'],
    // The first drop cut across a room, with the roll written on its floor (`TUNING.chasm`, 6 Oct 2026).
    chasmLesson: true,
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer'],
      // The shaman is met here, with two clubmen for his spirit to go into (`ENCOUNTER.introWith`).
      introduce: [['shaman', 0.45]],
      from: 3, to: 10, ease: 1.25,
      // Hounds are what a cave is kept with, and the grass is where they wait.
      weight: { bearer: 3, dog: 4, seer: 2, champion: 2 },
      cap: { men: 6, dog: 3 },
    },
    floor: '#2b2821', floorAlt: '#302c24', wall: '#3b3731', wallTop: '#5f584b',
    // The art pass's rock (`ART_PASS`): its top a step darker, so the stone nobody can walk on stops
    // being the brightest thing on the screen, and its face with it, so the top still stands over the
    // face and the rock keeps its height. The trip is its own palette and is not touched.
    artPass: { wall: '#302d28', wallTop: '#433e35' },
    fog: '#040405', doorChance: 0.15, ironDoors: 0.4, clockDoors: 0.35, stack: 0.28,
    // The rock teeth at the foot of the wall are new here too, and cost a heart the first time they
    // are found by walking into them: the floor names every new thing on it (23 Sep 2026).
    hint: 'THE GRASS HIDES YOU. IT HIDES THEM TOO. THE ROCK HAS TEETH.', hintKey: null,
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
    gates: [7], rests: [12], gateKeeper: true,
    // THE CHASE (`LEVEL_MODS`, js/chase.js): the processional road is the floor they come after you down.
    mods: ['chase'],
    millAt: 8, heals: 2, souls: 2, hallAt: 9, hallThreat: 11, galleryAt: 6, killboxAt: 10, lonePosts: 3, racks: 0.14, traps: 2,
    // A shell to put between you and the line, or a bird that tells the line where you are.
    // THE LINE is a road, and a horse is a thing that runs a road.
    beasts: ['tortoise', 'goose', 'chicken', 'horse', 'pig', 'husky', 'fish'],
    // The floor starts answering back here: a stretch of grating you cross and whoever is on your
    // heels crosses a beat later, when it is no longer floor.
    spikes: 0.3, crates: 0.35, barrels: 0.3, vaultAt: 4,
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter', 'shaman'],
      introduce: [['hunter', 0.2]],
      from: 5, to: 13, ease: 1.2,
    },
    floor: '#4a3a2e', floorAlt: '#524032', wall: '#2a2430', wallTop: '#3e3346',
    // Doors swinging shut more often than the cave's. Not before the cave: levels one and two are
    // still teaching that a door is a thing that goes when you hit it, and a door that is better
    // not hit at all is the wrong second lesson.
    fog: '#0b0a0d', doorChance: 0.35, ironDoors: 0.5, clockDoors: 0.5, stack: 0.28,
    // It used to read HOLD A MAN. HE STOPS BULLETS, which stopped being true out of the pen: a man
    // is BY THE COLLAR and a goat who has not swallowed that soul cannot lift one. What is true
    // either way is the sentence under both, get something solid between you and the line.
    // No key under it. A hint that names a verb should carry the button for it; this one names the
    // ground, anything solid will do, and most of what will do is furniture you never pick up.
    // The second sentence is the floor's own new teeth: this is the first level with a grate in it,
    // and a hint that only warned about the rifle said nothing about the ground growing them.
    hint: 'PUT SOMETHING SOLID BETWEEN YOU AND THE LINE. WATCH YOUR STEP.', hintKey: null,
  },
  {
    // The threshing floor: the widest ground in the compound and the least wall in it. A headbutt on
    // bare floor still only knocks a man down, so out here you have to herd him into the furniture,
    // posts, tables, braziers, a ring of hay you light yourself, and decide which half of a room is
    // yours before the rifles decide it for you. Corridors are wide enough that it reads as one yard.
    // Nothing new walks in: the room itself is the new thing.
    // A room shorter than it was (14 → 13) and a softer approach into it: every set piece below is
    // still at the room index it always was, the cut room was the one at the tail nothing points
    // at, and the curve starts a beat lower and tops out a beat lower too, off a 14 Sep 2026
    // playtest note that this floor ran hard for what is level four.
    name: 'THE THRESHING FLOOR', sub: 'Level 5', rooms: 13, corridorW: 5,
    canon: { id: 'open', name: 'OPEN GROUND', idea: 'Almost no wall. What kills is what is standing in the room: posts, tables, braziers, a ring of hay, and which half of it you decide is yours.' },
    theme: 'An open threshing floor, swept for grain and now for bodies.',
    decor: 'Wide yards, posts, tables, braziers, rings of hay, almost no wall at all.',
    arenas: [{ at: 3, boss: 'seer' }, { at: 8, boss: 'butcher' }, { at: 12, boss: 'champion' }],
    gates: [5], rests: [11], gateKeeper: true,
    millAt: 6, heals: 4, souls: 2, killboxAt: 10, lonePosts: 4, racks: 0.18, spikes: 0.35, crates: 0.4, barrels: 0.3, vaultAt: 7, traps: 1,
    // The crow is met on the widest, fullest floor in the game, because the one thing it asks for is
    // bodies and this is the floor that has them (js/beasts.js). Open ground is the horse's too.
    beasts: ['crow', 'goose', 'horse', 'pig', 'rabbit', 'husky'],
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter', 'shield', 'shaman'],
      // The shieldman (1 Oct 2026) is met here, alone, on the floor with the most room to walk round him.
      introduce: [['shield', 0.3]],
      // Nothing new walked in here until the shieldman, so the only thing that made the yard harder than the road was
      // the curve itself: the road carries a Great Hall and a gallery and this does not, and the two
      // levels were coming out level. Eased back a step on both ends after it played harder than a
      // level four should: `from` now dips the way level five's own opening does, and `to` gives up
      // a tenth of what it topped out at.
      // A step up from 5→12 when the two gate rooms went quiet: with two fewer rooms to fight in, the
      // old curve left this level barely harder than THE ROAD.
      // 23 Sep 2026: the yard still read as sparse, rooms the width of this one holding what a
      // narrower room holds. A step up on both ends and an eighth man allowed, so the width is
      // filled rather than cut: the level is otherwise barely harder than THE ROAD.
      // 25 Sep 2026: the eight-man cap starved 43% of its rooms; nine and three hounds (the 24 Sep
      // audit) buy 108.4 → 113.0. A higher `to` buys almost nothing more against these caps.
      // 26 Sep 2026, "push it": its rooms are the widest in the game, and with the cap following a
      // room's size (`ENCOUNTER.room`) a tenth man and a higher top end finally buy something.
      // 1 Oct 2026: the shieldman's room alone cost the floor a room of its curve (114 → 102); 10 → 22 became
      // 14 → 23 (the top under THE BRIDGE's 24, `GEN_RULES.harder`), 108.7 again.
      from: 14, to: 23, ease: 1.1,
      cap: { men: 10, dog: 3 },
    },
    floor: '#5f5a4a', floorAlt: '#67624f', wall: '#7b6c50', wallTop: '#9d8c69',
    // No corridor doors: a corridor wider than two tiles takes none (`carveCorridor`), and this
    // floor's are five, so the 0.12 / 0.8 / 0.55 it used to set were never dealt (28 Sep 2026).
    fog: '#0b0b0a', doorChance: 0, ironDoors: 0, clockDoors: 0, stack: 0.3,
    // Every other level says what to watch for on its own floor; this one went without because the
    // canon idea was thought to say it already. It did not, a first-time player read "open ground"
    // as relief rather than as a warning that the wall stops helping here.
    hint: 'THE WALL WON\'T KILL FOR YOU HERE. THE FURNITURE WILL.', hintKey: null,
  },
  {
    // Everything the compound has left, all at once, on the bridge they were driving you over, and one
    // new man on it: the thrower (3 Oct 2026), whose rooms the drop under the bridge makes his.
    name: 'THE BRIDGE', sub: 'Level 6', rooms: 15,
    // The most men of any level so far, and the rooms are built so that they cannot all reach you
    // at once: a gate of pillars, a throat of tables, a pinch in the middle. Seven men are one man
    // in a doorway, and the doorway is what every room here has.
    canon: { id: 'funnel', name: 'THE FUNNEL', idea: 'Seven men are one man in a doorway. Every room narrows somewhere, and the fight is at the narrow part, on whichever side of it you chose.' },
    theme: 'The bridge that carries the compound’s stores across the ravine.',
    decor: 'Pillar gates, table throats, hunters and hounds crowding every narrow doorway.',
    arenas: [{ at: 4, boss: 'butcher' }, { at: 9, boss: 'seer' }, { at: 14, boss: 'butcher' }],
    gates: [8], rests: [13], gateKeeper: true,
    millAt: 7, heals: 3, souls: 2, hallAt: 12, hallThreat: 24, galleryAt: 2, killboxAt: 6, lonePosts: 4, racks: 0.16, spikes: 0.35, crates: 0.35, barrels: 0.25, traps: 2, vaultAt: 5,
    // One or two of its canon rooms are the bridge itself, a deck over the ravine (`bridge` templates,
    // 30 Sep 2026 playtest; `GEN_RULES.bridges`).
    bridges: [1, 2],
    beasts: ['tortoise', 'crow', 'horse', 'husky', 'fish'],
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter', 'shield', 'thrower', 'shaman'],
      introduce: [['thrower', 0.3]],
      from: 4, to: 24, ease: 1.15,
      // The bridge is the only ground allowed a room this crowded, and a third rifle on it (26 Sep
      // 2026: now it has one, and a tenth man, so its worst room stays above THE THRESHING FLOOR's).
      cap: { men: 10, hunter: 3, dog: 3 },
    },
    // Wall top and face apart from the floor (5 Oct 2026 playtest: "rooms and floor are one colour"):
    // OKLab L floor/cap/face 0.237/0.226/0.202 (cap ΔE 0.011) → 0.237/0.316/0.192 (cap ΔE 0.079, face 0.049).
    floor: '#2f3640', floorAlt: '#353d48', wall: '#1a1d25', wallTop: '#535b6d',
    fog: '#06070a', doorChance: 0.3, ironDoors: 0.55, clockDoors: 0.6, stack: 0.35,
    // The thrower is the one new man and he is met alone (`met`); what the floor names is still its canon: the doorway is the weapon.
    hint: 'MORE OF THEM THAN EVER. MEET THEM IN THE DOORWAY.', hintKey: 'scream',
  },
  {
    // Up in the roof of the hall, and the first ground in the compound that is not all there. Holes
    // in the boards, windows out into the night, and the same drop under both. A man who goes over an
    // edge does not come back; the goat comes back a heart lighter at the spot he went in, which is
    // what makes an edge something to work with rather than something to keep away from. Nothing new
    // walks in, the missing floor is the new thing, and it is the only thing here that kills for you
    // without being in the room.
    name: 'THE RAFTERS', sub: 'Level 7', rooms: 15,
    canon: { id: 'drop', name: 'THE DROP', idea: 'The floor is not all there. Holes in the boards and windows in the walls, the same fall under both, and nobody who goes over comes back.' },
    theme: 'The rafters over the great hall, where the roof itself has started to give.',
    decor: 'Holes in the boards, windows in the walls, narrow catwalks, the same fall under both.',
    arenas: [{ at: 4, boss: 'seer' }, { at: 10, boss: 'butcher' }, { at: 14, boss: 'champion' }],
    gates: [6], rests: [13], gateKeeper: true,
    // Windows are this level's and nobody else's: a hole in a wall is a drop, and the drop is the
    // one new thing THE RAFTERS has. Every other level's walls are the inside of a compound.
    millAt: 7, heals: 4, souls: 2, killboxAt: 12, lonePosts: 3, racks: 0.16, spikes: 0.4, crates: 0.3, barrels: 0.3, vaultAt: 8, windows: 0.55, traps: 1,
    // Not the tortoise: a floor whose one idea is the drop is not the floor to be walking a thing
    // that has to be thrown across it.
    beasts: ['crow', 'goose', 'chicken', 'rabbit', 'fish'],
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter', 'shield', 'thrower', 'shaman'],
      introduce: [],
      // 26 Sep 2026: a tenth man and a third rifle (the 24 Sep audit: it hit its ceiling from room 5
      // of 15, and the men cap alone bought nothing past the kinds' own caps).
      // 1 Oct 2026: 34 → 37, so its worst room stays over THE BRIDGE's once shieldmen stand on both.
      from: 9, to: 37, ease: 1.15,
      cap: { men: 10, hunter: 3, dog: 3 },
    },
    floor: '#4b433a', floorAlt: '#544a40', wall: '#241d1a', wallTop: '#453629',
    fog: '#06060a', doorChance: 0.2, ironDoors: 0.7, clockDoors: 0.6, stack: 0.35,
    hint: 'THE FLOOR ENDS. THEY FALL FURTHER THAN YOU.', hintKey: 'butt',
  },
  {
    // Under the bridge is where everything the compound ever killed went, and none of it stayed put.
    // The living are a garrison here rather than the point: what the level is about is the thing that
    // is not in the room until it is behind you. Walls do not hold them, so there is nowhere to put
    // your back, the only cover on this ground is which way you are looking.
    name: 'THE OSSUARY', sub: 'Level 8', rooms: 15,
    // The dead come from behind, and a body cannot form inside stone. So the rooms are niches and
    // lanes, stone to put your back to, with open floor between them that you have to cross with
    // nothing at your back at all. The level is about where you are looking, and the rooms are
    // about how often you have to stop looking.
    canon: { id: 'niche', name: 'THE NICHE', idea: 'A body cannot form inside stone. Niches and lanes take arcs away from the dead; the open floor between them gives every arc back.' },
    theme: 'The ossuary beneath the bridge, where nothing the compound ever killed stayed put.',
    decor: 'Stone niches and lanes, open floor between them, wraiths arriving from behind.',
    // The run ends on its last boss, the one with the last soul in him (28 Sep 2026): the arena was
    // room 13 of 15, and room 14 after it, the floor's heaviest crowd, a trap one run in three,
    // was the last thing in the game, fought after the last soul had been paid out.
    arenas: [{ at: 4, boss: 'butcher' }, { at: 9, boss: 'wraith' }, { at: 14, boss: 'seer' }],
    gates: [8], rests: [13], gateKeeper: true,
    millAt: 6, heals: 4, souls: 2, killboxAt: 11, lonePosts: 2, racks: 0.2, spikes: 0.35, crates: 0.35, barrels: 0.2, traps: 2, vaultAt: 7,
    beasts: ['crow', 'tortoise', 'horse'],
    encounters: {
      kinds: ['bearer', 'champion', 'dog', 'seer', 'hunter', 'wraith', 'shield', 'thrower', 'shaman'],
      // The first room of the level is the wraith on its own, because nothing else in the game
      // teaches you that you cannot hit it.
      introduce: [['wraith', 0]],
      // 26 Sep 2026, an honest curve: it asked 34 a room and its caps bought 19. The top is now what
      // a room can hold once its cap follows its size, with a tenth man and a third rifle.
      from: 15, to: 40, ease: 1.12,
      // The dead outnumber the garrison here, and a room may hold three of them.
      weight: { wraith: 9, bearer: 4, dog: 2, champion: 1, hunter: 2, seer: 1 },
      // 6 Oct 2026: an eleventh man, so its worst room stays over THE RAFTERS's once the shaman stands on both.
      cap: { wraith: 4, men: 11, hunter: 3 },
    },
    // 5 Oct 2026, the same as THE BRIDGE: OKLab L floor/cap/face 0.268/0.292/0.274 (cap ΔE 0.029,
    // face 0.038) → 0.268/0.343/0.231 (cap ΔE 0.078, face 0.046).
    floor: '#22242b', floorAlt: '#282a33', wall: '#2c2a25', wallTop: '#706755',
    fog: '#05060a', doorChance: 0.22, ironDoors: 0.65, clockDoors: 0.6, stack: 0.35,
    hint: 'IT CANNOT STOP ONCE IT STARTS. LET IT START.', hintKey: 'butt',
  },
];

// What an escort is worth, said out loud on the clear card, the one place a player ever learns
// that nursing the thing across a floor paid for itself. The numbers are read off TUNING so a line
// here cannot drift from what js/beasts.js actually does.
const BEAST_CARD = {
  tortoise: ['THE TORTOISE CAME WITH YOU', `YOU START EVERY FLOOR AHEAD IN ARMOUR THAT TAKES ${TUNING.prop.tortoise.saveArmour === 1 ? 'ONE HIT' : TUNING.prop.tortoise.saveArmour + ' HITS'}`],
  goose: ['THE GOOSE CAME WITH YOU', `YOUR BAAH REACHES ${Math.round((TUNING.prop.goose.saveScreamRange - 1) * 100)}% FURTHER AND IS READY ${Math.round((1 - TUNING.prop.goose.saveScreamCd) * 100)}% SOONER`],
  crow: ['THE CROW CAME WITH YOU', `IT HAS FOUND ${crowGiftName()}. IT WILL BE ON THE NEXT STAIRS, FREE`],
  horse: ['YOU BEAT THE HORSE', `YOU RUN ${Math.round((TUNING.prop.horse.saveSpeed - 1) * 100)}% FASTER, FOR THE REST OF THE RUN`],
  pig: ['THE PIG IS FULL', `MORE MILK GRASS ON EVERY FLOOR AHEAD`],
  rabbit: ['YOU HOPPED IT, LIKE A RABBIT', `YOUR ROLL IS READY ${Math.round((1 - TUNING.prop.rabbit.saveRollCd) * 100)}% SOONER, FOR THE REST OF THE RUN`],
  husky: ['THE HUSKY SANG WITH YOU', `YOUR BAAH IS READY ${Math.round((1 - TUNING.prop.husky.saveScreamCd) * 100)}% SOONER, FOR THE REST OF THE RUN`],
};
// What the rest of them say in the box (`Beast.talk`) the first time a run lets one out, the way the
// horse and the pig say their bargains (30 Sep 2026 playtest: "any animal you take should talk to you
// like the horse, so a player registers it as an event and stops to read it"). Its sound, how it
// will come along, and a hint of what it pays at the stairs. The hint is in the animal's own voice
// and never a rules readout (2 Oct 2026 playtest: "the animal doesn't tell you what will happen when
// you bring it", and "they should not be so literal"): the numbers are on the clear card
// (`BEAST_CARD`) and under its HUD icon (`Beast.GIVES`). Each hint must still be TRUE of what
// `Beast.applyRewards` pays. The rabbit's and the husky's last line is the one said again on a second
// meeting (`Beast.met`), so it carries the hint and the question both.
const BEAST_HELLO = {
  chicken: ['CLUCK-CLUCK!', "I'LL FOLLOW YOU. BUTT ME AT A MAN AND I FLY AT HIM.",
    "GET ME UP THE STAIRS ALIVE AND I'LL LEND YOU A LITTLE HEART. I'VE GOT PLENTY."],
  tortoise: ['...?', 'I AM SLOW. CARRY ME IN YOUR TEETH, OR THROW ME AT THEM. MY SHELL TAKES ONE BLOW FOR YOU.',
    'BRING ME OUT, AND ON EVERY FLOOR AFTER YOU WILL WEAR A SHELL OF YOUR OWN.'],
  goose: ['HONK-HONK!', "I RUN AHEAD AND TELL THEM ALL WHERE YOU ARE. WE'RE HERE TO KICK THEIR ASS!!!",
    'AND MY HONK KNOCKS A SWING RIGHT OUT OF THEIR HANDS.',
    "GET ME UP THE STAIRS AND I'LL TEACH YOU TO SHOUT. LOUDER, AND MORE OFTEN."],
  crow: ['CAW.', 'I DO NOT FOLLOW YOU. I FOLLOW THE ROAD OF BODIES.',
    "KEEP ME FED ALL THE WAY TO THE STAIRS, AND I'LL BRING YOU SOMETHING SHINY."],
  rabbit: ['THUMP-THUMP.', 'LET ME TIE YOUR LEGS. NO RUNNING: YOUR ROLL IS YOUR HOP, WHERE YOU POINT. HORNS, VOICE AND TEETH STILL WORK.',
    'HOP UP THE STAIRS WITH ME LIKE THAT, AND EVERY ROLL AFTER WILL COME BACK TO YOU QUICKER. SHALL I TIE THEM?'],
  husky: ['AWOO!', 'I SING WAF-WOOO, YOU ANSWER WITH YOUR BAAH, ON THE BEAT. FIRST JUST US, THEN RIGHT IN THE MIDDLE OF A FIGHT.',
    "SING WITH ME AND COME UP THE STAIRS, AND YOUR THROAT WILL BE A SINGER'S: IT NEVER RESTS FOR LONG. SING?"],
  // The fish only bubbles (6 Oct 2026, the uncle's): no question, no terms; what it is worth is on the clear card.
  fish: ['BLUB.', 'BLUB BLUB.', '...BLUB?'],
};
// The answer every animal is given once it has said its terms (1 Oct 2026, playtest: "with any animal,
// after it tells the rules, you can agree or refuse, BAAAH (yes), bah (no)"). Refused, it goes its way.
const BEAST_ANSWER = { yes: 'BAAAH!', yesSay: '(yes)', no: 'bah.', noSay: '(no)', refused: ['SUIT YOURSELF.', 'FINE. BYE.', 'YOUR LOSS, GOAT.'] };

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
// places its arenas stand, so it sits in the run where the level it replaced would have, but every
// key is the other way round (`game.tripInput`: the stick reversed, the horns and the teeth swapped,
// the tumble and the voice swapped), so what is asked of the goat is far less. Clubmen only, the
// butcher in the rings, no grating, no trap rooms, no wheel, no drop, and a curve cut to `threatMul`.
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
    // Level one's own ring: one butcher, one man at his back. Not the boss of the floor it replaced.
    arenas: (base.arenas || []).map((a) => ({ at: a.at, boss: 'champion', escorts: 1 })),
    gates: base.gates, rests: base.rests, vaultAt: base.vaultAt, souls: base.souls, heals: (base.heals || 0) + 1,
    // The animal the run dealt this floor (`Beast.deal`) is still in it: without the list the coop
    // was never placed, and the kind, already spent, never came again that run.
    beasts: base.beasts,
    lonePosts: 0, racks: 0.25, spikes: 0, crates: 0.5, traps: 0, windows: 0,
    encounters: {
      kinds: S.kinds.slice(), introduce: [],
      from: E.from * S.threatMul, to: E.to * S.threatMul, ease: E.ease,
      cap: { men: S.men },
    },
    floor: '#2a2138', floorAlt: '#302541', wall: '#3b2350', wallTop: '#6a4380',
    fog: '#07040b', doorChance: 0.15, ironDoors: 0.15, clockDoors: 0, stack: 0.2,
    hint: 'YOU ATE THE MUSHROOMS. EVERYTHING IS THE OTHER WAY ROUND.', hintKey: null,
  };
  // It has met whatever the level it replaced had met, and it knows the rooms that level knew, all
  // but the drop, which with the stick reversed is not a room but a coin toss.
  def.met = new Set([...(base.met || []), ...E.kinds, 'champion']);
  def.known = new Set([...(base.known || []), ...(base.canon ? [base.canon.id] : [])].filter((c) => c !== 'drop'));
  return (TRIP_LEVELS[i] = def);
}

// THE DARK. A floor of its own, not a floor with the lights off: THE FORK's other flight climbs to
// it, and it is played in the run in place of the floor after the fork (`dark.fork`), whose place it
// keeps (`darkOf`) for everything that asks which floor of the run it is, the mouse, the milk
// rhythm, so those ask `levelIndexOf` and not `LEVELS.indexOf`. Its own canon (THE LAMP, the rooms
// tagged `canon: 'lamp'`), its own crowd and curve, its own lights (`TUNING.dark`): a standing lamp or
// two in every room with men in it, a lantern on the wall by every doorway, and nothing else lit but
// what burns. The kinds are the ones that have their own way in the dark, the hound's eyes and his
// bark, the seer's eyes and his ear, over a backbone of clubmen; never a rifle. It deals fewer men
// a room than the lit floor beside it (`balance.js` holds it under that floor and over
// `dark.fork.band` of it): a room you cannot see all of is a harder room.
const DARK_LEVEL = {
  name: 'THE DARK', sub: 'Level 5', rooms: 12,
  canon: { id: 'lamp', name: 'THE LAMP', idea: 'Every room has its lamp, and the lamp is a choice: it shows them to you and you to them. Knock it down and it burns where it falls, and then the room is black and they hunt you by ear.' },
  theme: 'The cellars under the threshing floor, where the cult keeps what it does not want seen.',
  decor: 'Low vaults and cells, a standing lamp or two to a room, a lantern on the wall by every door, and nothing else lit.',
  arenas: [{ at: 3, boss: 'seer' }, { at: 7, boss: 'butcher' }, { at: 11, boss: 'champion' }],
  gates: [5], rests: [9], gateKeeper: true,
  heals: 4, souls: 2, vaultAt: 6, racks: 0.2, spikes: 0.15, crates: 0.45, barrels: 0.45, traps: 0, lonePosts: 0,
  beasts: ['crow', 'goose', 'horse', 'pig'],
  encounters: {
    kinds: ['bearer', 'champion', 'dog', 'seer', 'shield'],
    // Played in THE THRESHING FLOOR's place, so it meets the shieldman as that floor would have: alone.
    introduce: [['shield', 0.3]],
    // The hound and the seer are the dark's own, so they come oftener than anywhere lit; the head
    // count a room may hold is lower than the lit floor's eight, because the room is not all there.
    weight: { bearer: 5, dog: 4, seer: 3, champion: 2 },
    // 25 Sep 2026, "a little fewer in the dark": 5.5 → 22 and a cap of six before.
    // 26 Sep 2026, an honest curve: its cap of five bought 7.6 of the 11.7 a room it asked for.
    // 1 Oct 2026: 5 → 14 until the shieldman's own room cost it one of its rooms; it has to stay over
    // `dark.fork.band` of the lit floor it stands in for (`balance.js`).
    from: 7, to: 16, ease: 1.2,
    cap: { men: 5 },
  },
  // 5 Oct 2026, the same as THE BRIDGE: OKLab L floor/cap/face 0.269/0.289/0.266 (cap ΔE 0.021,
  // face 0.024) → 0.269/0.329/0.234 (cap ΔE 0.061, face 0.040); in the dark it is what a lamp shows.
  floor: '#24222b', floorAlt: '#2a2731', wall: '#2c2932', wallTop: '#665e70',
  fog: '#030306', doorChance: 0.2, ironDoors: 0.5, clockDoors: 0.3, stack: 0.25,
  hint: 'A LAMP SHOWS THEM TO YOU, AND YOU TO THEM. KNOCK IT DOWN: IT BURNS, AND THEN THE ROOM IS BLACK.', hintKey: null,
  dark: true, darkOf: TUNING.dark.fork.at + 1,
};
// It has met what the floor it stands in for has met, and knows the rooms that floor knew.
DARK_LEVEL.met = new Set(LEVELS[DARK_LEVEL.darkOf].met);
DARK_LEVEL.known = new Set(LEVELS[DARK_LEVEL.darkOf].known);
// THE DARK wherever the run asks for it. There is one: the index is only ever its own place.
function darkLevel() { return DARK_LEVEL; }
// Which floor of the run a level is: its place in LEVELS, or, for THE DARK, the place of the floor
// it is played in place of. THE TRIP stays -1 on purpose (see `tripLevel`).
function levelIndexOf(def) {
  return def && def.darkOf !== undefined ? def.darkOf : LEVELS.indexOf(def);
}
