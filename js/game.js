// Game: state machine, fixed-step loop, pointer/keyboard/touch input, entity collisions, effects, cards.
// Where a run is left for CONTINUE. Bump the version and old saves are simply ignored.
const SAVE_KEY = 'goatout.run.v1';
// The board. It is deliberately not part of the run: NEW GAME wipes the run and never the record.
const BEST_KEY = 'goatout.best.v1';
const DEATH_KEY = 'goatout.deaths.v1';   // dev: burst deaths against bleeds, this browser
// Whether this browser has watched the opening scene through once. The first time is not skippable:
// everything the run means is in it, and a key pressed to start the game should not also end it.
const SEEN_KEY = 'goatout.intro.v1';
// The same for the mage at the first gate (`TUNING.bless`): watched once, a press gets you past it.
const BLESS_KEY = 'goatout.bless.v1';
// What the player turned on. Two switches, and the game runs the same without either of them.
const SET_KEY = 'goatout.settings.v1';
// Whether this browser has ever got out of the pen. Seven blows and two falls is the hardest thing
// the goat does all run and it is worth doing once; every run after it opens on the second blow.
const PEN_KEY = 'goatout.pen.v1';
// The stone teeth have been shown killing a man once in this browser (`updateSpireLesson`).
const SPIRE_KEY = 'goatout.spire.v1';
// What this browser has done once (5 Oct 2026 playtest, "show what a thing is the first time"): `key` picked one up,
// `iron` opened iron, `graze` healed off grass. Until it has, the floor says it beside the thing (`Renderer.drawFirstWords`),
// and no floor shuts anything in iron before the first key (`noIron` to the generator).
const LEARN_KEY = 'goatout.learned.v1';
// The ENEMIES tab's six dev sliders (`game.dev.tune`): multipliers on the cult's and the goat's pace,
// attack timings and cooldowns, for trying combinations by hand. A dev tool's range, not a game
// number. Remembered by this browser; at 1 each is an exact no-op, and none of them writes TUNING.
const TUNE_KEY = 'goatout.devtune.v1';
// RULES tab: the rules this browser has taken off the page (30 Sep 2026: "an option to delete something
// from this"). Only the page forgets them; the rule itself still runs in `tools/balance.js`.
const RULE_HIDE_KEY = 'goatout.rulehide.v1';
// The dev drawer's STEALTH test (`TUNING.stealth`), kept on through a reload in this browser only.
const STEALTH_KEY = 'goatout.stealth.v1';
const HORN_KEY = 'goatout.horns.v1';   // the dev test's horn size (`TUNING.horns`), this browser only
const DEV_TUNE = [
  ['enemySpeed', 'ENEMY SPEED', 'every gait'], ['enemyAttack', 'ENEMY ATTACK', '×2 = twice as fast'],
  ['enemyCd', 'ENEMY COOLDOWN', '×2 = twice as long'], ['goatSpeed', 'GOAT SPEED', 'walk, run-up, roll'],
  ['goatAttack', 'GOAT ATTACK', '×2 = twice as fast'], ['goatCd', 'GOAT COOLDOWN', '×2 = twice as long'],
];
const DEV_TUNE_RANGE = [0.3, 5];
// The pointer, drawn as the animal rather than as a plain OS crosshair. It used to be the 🐐 emoji
// glyph, which every OS draws facing its own way (several draw it left, aiming nowhere near where a
// click actually lands) and which is a whole standing goat when the one part of him that matters to
// aim is the head, headbutt is the verb the cursor exists to aim. Then it was a drawn head, which
// at 32px read as a blob. It is a pair of horns now, symmetrical so it has no facing to get wrong,
// with the hotspot on the red point between them.
// `encodeURIComponent` rather than hand-escaping the quotes, since a cursor string that is wrong is
// silently wrong, the browser just falls back to `crosshair` with nothing in the console about it.
const CURSOR_GOAT = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'>"
  // two ridged horns sweeping up and out from a brow, the verb the pointer aims
  + "<path d='M14,20 Q6,19 4.5,11 Q4,5 9,4 Q6.5,8 8.5,12 Q10.5,15.5 15,16 Z' fill='#d9c49a' stroke='#1a1016' stroke-width='1.4' stroke-linejoin='round'/>"
  + "<path d='M18,20 Q26,19 27.5,11 Q28,5 23,4 Q25.5,8 23.5,12 Q21.5,15.5 17,16 Z' fill='#d9c49a' stroke='#1a1016' stroke-width='1.4' stroke-linejoin='round'/>"
  + "<path d='M6,14 L9,13 M5.5,10.5 L8.3,10.2 M26,14 L23,13 M26.5,10.5 L23.7,10.2' stroke='#8a6a3a' stroke-width='1.1' stroke-linecap='round'/>"
  + "<circle cx='16' cy='18' r='2' fill='#c0392b' stroke='#1a1016' stroke-width='1'/>"
  + "</svg>"
)}") 16 18, crosshair`;
// 3 Oct 2026 playtest ("people do not tie the mouse to what the goat does; the pointer was not seen
// enough"): the pointer is the headbutt's own chip off the skill rail (`SKILL_ICONS`, head and horns),
// near white, `TUNING.cursor.cell` px a cell and ringed in a pale halo outside its ink, so what the hand
// moves and what the left button does are one picture on any floor. Baked once; the drawn horns above
// stay behind it in the list for a browser that cannot take it.
let BUTT_CURSOR = null;
function buttCursor() {
  if (BUTT_CURSOR !== null) return BUTT_CURSOR || CURSOR_GOAT;
  BUTT_CURSOR = '';
  try {
    const C = TUNING.cursor, src = SKILL_ICONS.cells(['head', 'horns:bone']), n = src.length, W = n + 2;
    const at = (i, j) => (i >= 1 && j >= 1 && i <= n && j <= n ? src[j - 1][i - 1] : null);
    let x0 = W, y0 = W, x1 = -1, y1 = -1;
    const grid = [];
    for (let j = 0; j < W; j++) {
      const row = [];
      for (let i = 0; i < W; i++) {
        let col = at(i, j);
        if (!col) for (let b = -1; b <= 1 && !col; b++) for (let a = -1; a <= 1; a++) if (at(i + a, j + b) === SKILL_EDGE) { col = C.halo; break; }
        row.push(col);
        if (col) { x0 = Math.min(x0, i); y0 = Math.min(y0, j); x1 = Math.max(x1, i); y1 = Math.max(y1, j); }
      }
      grid.push(row);
    }
    const k = C.cell, cv = document.createElement('canvas'); cv.width = (x1 - x0 + 1) * k; cv.height = (y1 - y0 + 1) * k;
    const cx = cv.getContext('2d');
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) if (grid[j][i]) { cx.fillStyle = grid[j][i]; cx.fillRect((i - x0) * k, (j - y0) * k, k, k); }
    // the hot spot is the brow between the horns: the head's top row (row 8 of the chip), its middle
    const hx = Math.round(cv.width / 2), hy = Math.min(cv.height - 1, (8 + 2 - y0) * k);
    BUTT_CURSOR = `url(${cv.toDataURL('image/png')}) ${hx} ${hy}, ${CURSOR_GOAT}`;
  } catch (e) { BUTT_CURSOR = ''; }
  return BUTT_CURSOR || CURSOR_GOAT;
}
// The codes that mean somebody is playing on a keyboard. Anything else, a volume rocker, a media key,
// a phone's own `Unidentified`, is not a reason to take the thumb controls off the screen.
const KEYBOARD_KEY = /^(Key[A-Z]|Digit\d|Arrow|Space|Enter|Escape|Backspace|Tab|Shift|Control)/;

class Game {
  // What `keepIf` keeps of a list each step (one function each, made once, never one a frame).
  static falling = (f) => f.t < f.life;
  static untaken = (tm) => !tm.taken;
  constructor(canvas) {
    this.canvas = canvas; this.renderer = new Renderer(canvas); this.audio = new GameAudio();
    this.fx = new CombatFX(this);
    this.touch = new TouchUI();
    this.coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches);
    this.touch.active = this.coarse;
    this.pad = new PadInput();
    this.padAim = { x: 1, y: 0 };
    this.input = { mx: 0, my: 0, aim: { x: 1, y: 0 }, lmbPressed: false, rmbDown: false, spacePressed: false, rollPressed: false, qPressed: false, mouse: { x: 0, y: 0 }, anyPressed: false };
    this.breathFx = null;
    this.keys = new Set();
    this.touchAim = { x: 1, y: 0 };
    this.levelIndex = 0; this.world = null; this.level = null; this.goat = null;
    this.enemies = []; this.props = []; this.bullets = []; this.parts = []; this.floats = []; this.rings = []; this.puffs = []; this.flares = [];
    // What the men have to read in the room: standing fire and the Mill (fixed for the level), and
    // whatever rune is being painted right now (rebuilt each step).
    this.hazards = []; this.wallArt = []; this.sightBlockers = []; this.runes = []; this.houndTold = false; this.henTold = false;
    // Who actually ran this step. Everything that asks "is anybody standing here", a grate's
    // trigger, the wheel's arm, a stone tooth, a body arriving on a body, used to walk the level's
    // whole cast, and a late floor carries eighty men; nineteen grates asking all of them three
    // times a step was the single most expensive thing in the simulation. A man two rooms off is
    // frozen (see the note in `update`), so he cannot walk onto anything and nothing can walk onto
    // him: the short list is the only one worth asking.
    this.liveEnemies = [];
    this.clockTold = false;   // the first door that shuts itself says so, once a run
    this.cam = { x: 0, y: 0, zoom: 1 }; this.camLead = { x: 0, y: 0 };
    this.shakeAmt = 0; this.shakeX = 0; this.shakeY = 0;
    // juice: a directional camera punch, a lens shove, a screen flash and a kill counter
    this.kickX = 0; this.kickY = 0; this.zoomKick = 0; this.flashAmt = 0; this.flashColor = PALETTE.bone;
    this.combo = 0; this.comboTimer = 0; this.barkCd = 0; this.cageOpen = false; this.cageLunge = -1;
    this.cageThought = 0;   // a beat of "her" over his head the moment the pen gives, comic-panel style
    this.hitstopTimer = 0; this.timeScale = 1; this.slowTimer = 0; this.hurt = null; this.hurtVignette = null;
    this.kills = 0; this.totalKills = 0; this.timer = 0; this.deaths = 0; this.totalScore = 0; this.henHearts = 0;
    this.beasts = {}; this.crowGift = false;   // the escorts walked to the stairs (js/beasts.js)
    this.runKeys = 0; this.keyFlash = 0;   // the run's keys (`TUNING.keys`), carried from floor to floor
    this.best = this.loadBest();
    this.boons = []; this.mods = Object.assign({}, BOON_BASE); this.souls = []; this.boonChoice = null; this.boonRects = [];
    this.lastBoonActive = false;   // which kind the last soul offered, so the next one alternates
    this.soulsHere = 0;   // how many the level being played gives up, all in. Reported on its card.
    this.globs = [];      // VENOM SPIT in the air (js/status.js)
    // The talisman at his neck, `{ id, tier }` out of `ARTIFACTS`, one slot, and `boom`, the
    // boomerang's flight; its wait is `Goat.itemCd`, the same clock STRANGE SYMBOLS uses. See js/shop.js.
    this.artifact = null; this.boom = { fly: null };
    this.ogreTold = false; this.shopTold = false;   // the two once-a-run lines the shop has
    this.fallers = [];    // men on their way down a hole: a picture, with nothing simulated in it
    // A soul is spent by a click that starts and ends on the same card. `boonDown` is the card the
    // pointer went down on; `boonArm` is the beat the cards ignore everything after they appear.
    this.boonDown = -1; this.boonArm = 0;
    // `rules` is the drawer's RULES page: the whole screen, the simulation held, `page` the level it
    // is looking at and `sample` a level generated for a page that is not the one in play.
    // `rules` is the drawer's tool page: the whole screen, the simulation held. `tab` is which half
    // of it you are looking at, the generation rules held against one level, or the difficulty
    // curve of all seven, and `page` the level the first half is looking at.
    // `rules` is the drawer's tool page: the whole screen, the simulation held. `tab` is which of
    // the three it is showing, the rules that hold everywhere, one level in full, or the curve of
    // all seven, `page` the level the middle one is looking at, and `room` the one room the page
    // has been asked to open, which is reachable from either of the other two.
    // HORN SIZES test: never in the itch build, which is always the wide horn it has always had.
    this.hornKind = 'wide';
    try { const hk = !RELEASE.on && localStorage.getItem(HORN_KEY); if (hk && TUNING.horns[hk]) this.hornKind = hk; } catch (e) { /* storage refused */ }
    this.dev = { open: false, god: false, dips: false, rects: [], toast: null, rules: false, tab: 'rules',
      page: 0, sample: null, sampleSeed: 1, samples: {}, matrix: null,
      ruleHide: (() => { try { return new Set(JSON.parse(localStorage.getItem(RULE_HIDE_KEY) || '[]')); } catch (e) { return new Set(); } })(),
      ruleShowHidden: false,
      balance: null, balanceSeeds: 8, room: null,
      // Two read-only overlays: a man's sight (cone plus range) and how far the goat's own noise
      // carries (a walk against a fight), both drawn in world space by `Renderer.drawDevOverlay`.
      vision: false, hearing: false,
      // STEALTH: ALT switches a sneak, the cult's sight and ears on the floor, a blow from unseen throws further
      // (`TUNING.stealth`). Never in the itch build, which has no drawer to turn it off with.
      stealth: (() => { try { return !RELEASE.on && localStorage.getItem(STEALTH_KEY) === '1'; } catch (e) { return false; } })(),
      // THE DARK's picture over whatever floor is up, without its gentler curve or its lamps.
      dark: false,
      // The ENEMIES tab's sliders (`DEV_TUNE`), and the one being dragged.
      tune: this.loadDevTune(), slide: null };
    this.intro = null;      // the opening scene while it plays; see beginIntro
    this.stairFx = null;    // the goat on a flight of stairs: { t, dir } with dir 1 going up and out, -1 arriving
    this.state = 'title'; this.card = null; this.cardQueue = []; this.stateTimer = 0;
    // The first screen: two ways in, and whatever run the browser still remembers behind the second.
    this.menu = { index: 0, rects: [], t: 0, shake: 0, sliderDrag: null }; this.save = null;
    this.pause = { index: 0, rects: [] };
    this.introSeen = false; this.penBroken = false;
    try { this.introSeen = localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { /* storage refused */ }
    this.bless = null; this.blessSeen = false;   // the mage at the first gate; see `watchBless`
    try { this.blessSeen = localStorage.getItem(BLESS_KEY) === '1'; } catch (e) { /* storage refused */ }
    try { this.penBroken = localStorage.getItem(PEN_KEY) === '1'; } catch (e) { /* storage refused */ }
    this.learned = {}; try { this.learned = JSON.parse(localStorage.getItem(LEARN_KEY) || '{}') || {}; } catch (e) { /* storage refused */ }
    this.settings = this.loadSettings();
    KeyBind.load(this.settings.binds); bindLay();   // SETTINGS → CONTROLS, and every word that names a key
    Heaven.load();   // what stays across deaths and runs: the sacrifices, the mirror, the seats (js/heaven.js)
    this.dev.god = !!this.settings.god;   // GOD MODE, thrown in SETTINGS or the drawer, outlives a reload
    this.audio.setLayered(this.settings.layeredMusic);
    if (!this.settings.sound) this.audio.toggleMute();
    this.applyVolumeSettings();
    // The tool has its own address: `#rules` and `#balance` open it on that tab at load, so the
    // page can be linked to and bookmarked rather than found through the drawer every time.
    this.runSeed = 0; this.askedSeed = 0;
    try {
      const h = (location.hash || '').replace('#', '');
      // On itch the dev corner is not drawn and the tool's addresses do nothing, unless the page was
      // opened with `#dev`: one curious tester in GOD mode skews every number the playtest collects.
      // Everywhere else, locally, the published artifact, it is there as it always was.
      // The itch build itself (`RELEASE.on`, the dev drawer's ITCH BUILD) has no dev corner at all,
      // `#dev` or not, and none of the tool's addresses below: its GOD MODE is a switch in SETTINGS.
      this.dev.hidden = RELEASE.on || (/(^|\.)(itch\.io|itch\.zone|hwcdn\.net)$/i.test(location.hostname || '') && h !== 'dev');
      if (!this.dev.hidden && (h === 'rules' || h === 'balance' || h === 'levels' || h === 'enemies' || h === 'boons' || h === 'mirror' || h === 'roomlist' || h === 'status' || h === 'props' || h === 'music' || h === 'juice' || h === 'goats' || h === 'animals' || h === 'combos')) {
        this.dev.open = true; this.dev.rules = true; this.dev.tab = h;
      }
      // `#seed=k3j9a` is the whole of sharing a run: NEW GAME takes it instead of rolling one, so a
      // link is the way a seed is typed in. There is no text field anywhere in the game and this is
      // why there does not need to be one.
      const m = h.match(/^seed=([0-9a-z]+)$/i);
      if (m) this.askedSeed = parseInt(m[1], 36) >>> 0;
      // `#trip` is the way to look at THE TRIP without finding the mushrooms first: whatever floor
      // LEVELS starts is played as the trip in its place.
      this.askedTrip = h === 'trip' && !this.dev.hidden;
      // `#dark` the same for THE DARK: whatever floor LEVELS starts is played with the lamps out.
      this.askedDark = h === 'dark' && !this.dev.hidden;
      // `#showroom`: NEW GAME opens THE SHOWROOM (js/showroom.js) instead of the pen.
      this.askedShowroom = h === 'showroom';
    } catch (e) { /* no location worth reading */ }
    this.layoutTouch();
    this.bindInput();
    this.showTitle();
    // The floor NEW GAME or CONTINUE opens on, its sheets baked while the title is up (`warmFloor`).
    this.warmFloor(LEVELS[this.save && LEVELS[this.save.level] ? this.save.level : 0], 1200);
    setTimeout(() => Heaven.warm(), 4000);   // heaven's picture, before the first death needs it
    this.last = performance.now(); this.acc = 0; this.lastRaf = this.last;
    // The next frame is asked for before this one runs, and a throw inside one is logged and eaten:
    // one bad frame used to end the rAF chain for good, and the rest of the session limped on the
    // 16 ms interval below. Logged once per distinct message, so a throw every frame is one line.
    this.frameErrs = new Set();
    const safeFrame = (t) => {
      try { this.frame(t); } catch (e) {
        // Keyed on where it threw, not the message: a canvas error quotes its bad value, so a throw
        // every frame with a different radius was a new key (and a new line) every frame.
        const k = String(e && e.name) + '@' + String(e && e.stack || e).split('\n')[1];
        if (!this.frameErrs.has(k) && this.frameErrs.size < 200) { this.frameErrs.add(k); console.error(e); }
        // Unwind the canvas: a throw between a save() and its restore() left that frame's clip, alpha
        // or filter at the bottom of the stack, and every frame after drew through it until a reload.
        const c = this.renderer && this.renderer.ctx;
        if (c && !this.renderer.baking) { if (c.reset) c.reset(); else c.canvas.width = c.canvas.width; c.imageSmoothingEnabled = false; }
      }
    };
    const raf = (t) => { this.lastRaf = t; requestAnimationFrame(raf); safeFrame(t); };
    requestAnimationFrame(raf);
    // Fallback driver: keeps the simulation running when rAF stalls (hidden pane / background tab).
    setInterval(() => { const now = performance.now(); if (now - this.lastRaf > 120) safeFrame(now); }, 16);
  }

  // Boons only ever bend numbers the goat already uses, so the two-button scheme never grows.
  applyBoons() {
    this.mods = Object.assign({}, BOON_BASE);
    // Actives before passives, whatever order they were taken in: an active that turns the voice
    // into something sets its cooldown outright, and RAW THROAT's halving taken before it was
    // silently thrown away. A passive bends what the active set; it never comes first.
    for (const b of this.boons) if (b.active) b.apply(this.mods, b.params || {});
    for (const b of this.boons) if (!b.active) b.apply(this.mods, b.params || {});
    if (this.artifact) Shop.applyArtifact(this.mods, this.artifact);
    Heaven.applyMeta(this.mods);   // what THE MIRROR has bought, under every run (js/heaven.js)
    this.applySets(this.mods);
    if (this.world) this.world.burnMul = this.mods.burnMul;
    // HORN SIZES (`TUNING.horns`): under the souls, so LONG HORNS bends the size he has instead of replacing it.
    const HN = TUNING.horns[this.hornKind] || TUNING.horns.wide;
    this.mods.horn = HN;
    this.mods.headbuttReach *= 1 + HN.reach;
    this.mods.headbuttWindup = (this.mods.headbuttWindup || 1) * HN.windup;
    this.mods.headbuttRecovery *= HN.recovery;
    if (this.settings.easy) { this.mods.maxHp += EASY.maxHp; this.mods.enemySlow *= EASY.enemySlow; }
    this.mods.maxHp += this.henHearts || 0;   // the hens he brought out with him, one heart a level
    Beast.applyRewards(this, this.mods);      // and the escorts he walked to the stairs (js/beasts.js)
    this.mods.screamCooldown = Math.max(this.mods.screamCooldown, TUNING.goat.scream.minCooldown);
    // The dev sliders (ENEMIES tab) that ride on mods: his stride and roll, his recovery, and every
    // cult windup / swing / recovery / cast / reload through `enemySlow`. × 1 and / 1 change nothing.
    const DT = this.dev && this.dev.tune;
    if (DT) {
      this.mods.speed *= DT.goatSpeed; this.mods.rollDistance *= DT.goatSpeed;
      this.mods.headbuttRecovery /= DT.goatAttack; this.mods.enemySlow /= DT.enemyAttack;
    }
    if (this.goat) { this.goat.maxHp = this.mods.maxHp; this.goat.hp = Math.min(this.goat.hp, this.goat.maxHp); }
  }
  // The element sets (`BOON_SETS`): how many souls of each he carries, and what that many buy. A
  // swap that trades a fire soul away takes its share with it, since this is counted afresh each time.
  setCount(el, boons) { return (boons || this.boons).filter((b) => b.element === el).length; }
  applySets(m) {
    const grace = (S, n) => S.step.slice(0, n).reduce((a, b) => a + b, 0);
    const F = BOON_SETS.fire, nf = this.setCount('fire');
    m.fireGuard = grace(F, nf);
    if (nf >= F.all) { m.fireImmune = F.immune !== false; m.burnMul = F.burnMul; }
    const P = BOON_SETS.poison, np = this.setCount('poison');
    m.poisonGuard = grace(P, np);
    if (np >= P.all) { m.poisonImmune = true; m.poisonHurts = true; }
  }
  // COLD EYE: something just came into his mouth. The world slows (`frame`) until it leaves it or
  // `time` runs out, and not again for `every` seconds, both counted in real time.
  coldEye() {
    const E = this.mods.coldEye;
    if (!E || this.aimSlowCd > 0) return;
    this.aimSlow = E.time; this.aimSlowCd = E.every; this.audio.sfxSlow();
  }
  // A boss can fall against a wall, and a prize inside one is a prize nobody can reach: walk out in
  // rings until the ground is floor the flow field says can be stood on.
  freeSpot(x, y) {
    const w = this.world;
    const ok = (ax, ay) => w.tileAtPx(ax, ay) !== T.WALL && w.flowDist(ax, ay) >= 0;
    if (!w || ok(x, y)) return { x, y };
    for (let ring = 1; ring <= 7; ring++) {
      for (let a = 0; a < 16; a++) {
        const ang = a / 16 * Math.PI * 2;
        const nx = x + Math.cos(ang) * ring * TILE * 0.7, ny = y + Math.sin(ang) * ring * TILE * 0.7;
        if (ok(nx, ny)) return { x: nx, y: ny };
      }
    }
    return { x: this.goat.x, y: this.goat.y };
  }
  // A gate's soul must land on the goat's side of that gate: the keeper flung through the bars died
  // in the next room, and `freeSpot` (the flow field walks under a shut door) left his soul behind
  // the only door it opens (3 Oct 2026, a playtest video). So it is pulled back into its own room.
  dropSoul(x, y, gate) {
    let p = this.freeSpot(x, y);
    if (gate >= 0 && !this.inRoom(p, gate, 0.5)) p = this.spotInRoom(gate, x, y) || p;
    this.placeSoul(p.x, p.y, gate);
  }
  // The floor tile of a room nearest (x, y), clear of stone and furniture, or null.
  spotInRoom(index, x, y) {
    const r = this.level.rooms[index], w = this.world;
    if (!r || !w) return null;
    let best = null, bd = Infinity;
    for (let ty = r.y + 1; ty < r.y + r.h - 1; ty++) for (let tx = r.x + 1; tx < r.x + r.w - 1; tx++) {
      const px = (tx + 0.5) * TILE, py = (ty + 0.5) * TILE;
      const t = w.tileAtPx(px, py);
      if ((t !== T.FLOOR && t !== T.HAY && t !== T.ASH) || w.furn[ty * w.W + tx]) continue;
      const d = (px - x) ** 2 + (py - y) ** 2;
      if (d < bd) { bd = d; best = { x: px, y: py }; }
    }
    return best;
  }
  // What a boss leaves when the level has no soul left to give. A wall you had to break through is
  // never worth nothing, and milk is the one other thing in the game worth walking back for.
  dropMilk(x, y) {
    const p = this.freeSpot(x, y);
    this.props.push(new Prop(p.x, p.y, 'heal'));
  }
  // Every boss leaves something. Which one leaves the soul was decided in `startLevel` off the
  // level's own count, so a level gives up exactly what it was authored to give up. A boss's soul is
  // the bar of no gate, the gates' souls lie on the floors of their rest rooms.
  // A gate's keeper (`soulGate`) is the one man who is not a boss and still pays: his soul is his
  // gate's bar, and swallowing it lifts that gate like the one that used to lie on the floor.
  // Something done once in this browser (`LEARN_KEY`): its floor words go for good.
  learn(what) {
    if (this.learned[what]) return;
    this.learned[what] = true;
    try { localStorage.setItem(LEARN_KEY, JSON.stringify(this.learned)); } catch (e) { /* it lasts the tab */ }
  }
  bossPrize(e) {
    if (e.soul) this.dropSoul(e.x, e.y, e.soulGate >= 0 ? e.soulGate : undefined); else this.dropMilk(e.x, e.y);
    // A champion (a boss with no soul in him) sometimes carries a key too (`TUNING.keys.drop`).
    if (e.boss && !e.soul && !e.keeper && !(this.level && this.level.def && this.level.def.heaven) && Math.random() < TUNING.keys.drop) this.dropKey(e.x, e.y);
  }
  // A key on the floor beside where he fell, on ground the goat can walk to.
  dropKey(x, y) {
    const s = this.freeSpot ? this.freeSpot(x + TILE * 0.6, y) : { x, y };
    const k = new Prop(s.x, s.y, 'key'); k.phase = Math.random() * 6;
    this.props.push(k);
    this.floatText(s.x, s.y - 30, 'HE CARRIED A KEY', PALETTE.fireHi);
  }
  // A man on his way down. The kill is instant and happens at the top of `Enemy.update`, so nothing
  // here is simulated: it is the picture of a fall, held for `fall.showFor` and then gone, and it
  // exists because a body that simply stops existing reads as a bug rather than as a drop.
  spawnFaller(e) {
    this.fallers.push({ e, x: e.x, y: e.y, t: 0, life: TUNING.fall.showFor,
      spin: (Math.random() < 0.5 ? -1 : 1) * (2.2 + Math.random() * 2.4),
      dx: e.vx * 0.14, dy: e.vy * 0.14 });
  }
  // A soul on ground that is known to be good, with none of the rescue above. The vault's is laid
  // down with the level: `dropSoul` asks the flow field whether a spot can be reached, the flow field
  // only reaches ninety tiles from wherever it was last computed, and a vault in the back half of a
  // level is further away than that, so the rescue would fetch it back and drop it at the goat's feet.
  placeSoul(x, y, gate) {
    this.souls.push({ x, y, r: TUNING.soul.r, phase: Math.random() * 6, life: 0, gate: gate === undefined ? -1 : gate });
  }
  // The two hard stops of a level. A gate's door has no hit points and no handle: the soul carried
  // by whoever in that room was worth most is the bar, and swallowing it lifts that room's gate and
  // no other, or, in the mouse's room, taking one of her talismans does (`Shop.buy`). Everything
  // else in the game opens by being hit, which is exactly why this does not.
  // The trail to what opens a soul gate, laid when the goat puts his head into one (`Prop.smash`).
  guideTo(door) {
    const tgt = this.souls.find((t) => t.gate === door.gateRoom && !t.taken)
      || (door.shopGate ? this.props.find((p) => p.kind === 'mouse' && !p.broken && p.shopId === door.gateRoom)
        || this.props.find((p) => p.kind === 'ware' && !p.broken && !p.locked && p.shopId === door.gateRoom) : null);
    if (tgt) this.guide = { ref: tgt, t: TUNING.soul.guide.time };
  }
  openSoulGate(room) {
    const sg = (this.soulGates || []).find((g) => g.room === room);
    if (!sg || !sg.prop || sg.prop.broken) return;
    sg.prop.broken = true; sg.prop.dead = true;
    // The way out may have two doors (THE FORK's flights): one soul lifts both.
    if (sg.exit) for (const q of this.props) if (q.exitGate && !q.broken) { q.broken = true; q.dead = true; }
    // The middle gate holds his place (`holdGate`) from `soul.hold.from` on, once what opened it
    // is settled: the soul's card taken, the rat ogre she turned into down.
    if (TUNING.soul.hold.on && sg === this.soulGates[0] && this.levelIndex >= TUNING.soul.hold.from && !this.checkpoint) this.holdAt = room;
    this.audio.sfxSteel(); this.audio.sfxBell(); this.shake(6); this.flash(PALETTE.witchHi, 0.18);
    this.ring(sg.prop.x, sg.prop.y, 3.4 * TILE, PALETTE.witch);
    this.particles(sg.prop.x, sg.prop.y, 22, PALETTE.witch, 230);
    this.floatText(sg.prop.x, sg.prop.y - 30, 'THE GATE GIVES', PALETTE.witchHi);
  }
  // THE MIDDLE GATE. From the second floor, the soul or the talisman taken in a floor's first gate
  // marks the place a death on that floor comes back to (playtest, 25 Sep 2026: a death near the
  // stairs sent him back through the whole floor). What is kept is what he had on him at the gate,
  // the soul it gave included, and how far he had got; never the layout (`enterAtGate`).
  holdGate() {
    const g = this.goat;
    // Not in the middle of a fight with the rat ogre; but one left alive behind him (run past, not
    // killed) no longer costs the whole floor its checkpoint.
    const near = (e) => { const r = roomAt(this.level, e.x, e.y); return Math.abs((r ? r.index : this.nearestRoomIdx(e.x, e.y, this.goatRoom || 0)) - (this.goatRoom || 0)) <= 1; };
    // Held off that long, the gate is no longer where he is: a snapshot taken rooms later carried
    // souls and kills from past it (the last boss's soul, dealt again on the rebuilt floor). A fight
    // with her ogre that runs on past the next room costs the floor its checkpoint instead.
    if ((this.goatRoom || 0) > this.holdAt + 1) { this.holdAt = -1; return; }
    if (g.dead || this.enemies.some((e) => e.kind === 'ratogre' && !e.dead && near(e))) return;
    // The animal with him, in his mouth, at his side, or ahead of him, comes back with him.
    // Never the crow's gift bird (`Beast.placeGift`): kept as the pet, it came back a real crow and
    // was banked again at the stairs, and the floor's own escort was deleted for it.
    const pet = this.props.find((p) => Beast.animal(p) && !p.gift && (p.held || (p.behind || 0) < 2));
    this.checkpoint = { level: this.levelIndex, room: this.holdAt, boons: this.boons.slice(),
      artifact: this.artifact ? { id: this.artifact.id, tier: this.artifact.tier } : null,
      talRun: this.talRun ? Object.assign({}, this.talRun) : null, crowGift: !!this.crowGift, tripAt: this.tripAt,
      kills: this.kills, time: this.timer, firstKill: this.firstKill, pet: pet ? pet.kind : null, keys: this.runKeys | 0,
      // The horse's race is half run by the gate: a soul room already beaten to it is kept.
      petWon: pet && pet.kind === 'horse' ? pet.won || 0 : 0, petFed: pet && pet.kind === 'pig' ? pet.fed || 0 : 0 };
    this.holdAt = -1;
    this.floatText(g.x, g.y - 44, 'A DEATH COMES BACK HERE', PALETTE.witchHi);
    this.saveRun();
  }
  // Back at the middle gate. The floor is cut again off the new death count like any death's (rule 6:
  // nothing in it is the layout he died in), and he stands in this layout's own first gate: its door
  // open, its soul or her shelf already spent, every room before it behind him with nobody left in
  // it and the clamp already down, and the animal he had at the gate beside him.
  enterAtGate(cp) {
    const L = this.level, gate = (L.gates || [])[0], g = this.goat;
    if (!gate) return;
    const at = gate.room, sg = this.soulGates[0];
    if (sg && sg.prop) { sg.prop.broken = true; sg.prop.dead = true; }
    const before = (x, y) => { const r = roomAt(L, x, y); return (r ? r.index : this.nearestRoomIdx(x, y, at)) < at; };
    this.enemies = this.enemies.filter((e) => !(e.room >= 0 ? e.room < at : before(e.x, e.y)));
    this.souls = this.souls.filter((s) => s.gate !== at && !before(s.x, s.y));
    for (const p of this.props) {
      // An animal he already has at his side (`cp.pet`) is the floor's one: its coop goes wherever it stands.
      const shelf = (p.kind === 'ware' || p.kind === 'mouse') && p.shopId === at;
      const pen = p.kind === 'coop' && (cp.pet || before(p.x, p.y));
      if (shelf || pen || (Beast.animal(p) && before(p.x, p.y))) { p.broken = true; p.dead = true; }
    }
    g.x = gate.soul.x; g.y = gate.soul.y; g.safeX = g.x; g.safeY = g.y; g.safeTrail = [];
    // The skulls and the line he ran are not brought back: they lie on the layout he died in, and
    // this one is cut again. The run code's first body is only a fact, and is.
    this.kills = cp.kills; this.timer = cp.time; this.goatRoom = at; if (cp.firstKill) this.firstKill = cp.firstKill;
    this.updateClamps(true);
    this.world.computeFlow(g.x, g.y);
    this.world.computeVis(g.x, g.y, TUNING.fog.radius, this.mods.oracle ? TUNING.fog.oracle : 0);
    // It says its terms again, the ones it said out of the coop: a death is a gap, and what it will
    // and will not do is what he has to be reminded of coming back (25 Sep 2026).
    if (cp.pet) { const s = this.freeSpot(g.x + TILE, g.y), pet = new Prop(s.x, s.y, cp.pet); pet.won = cp.petWon || 0; pet.fed = cp.petFed || 0; this.props.push(pet); if (Beast.PACT[cp.pet]) Beast.speak(this, pet, Beast.PACT[cp.pet]); }
    this.cam.x = g.x; this.cam.y = g.y; this.pathTrail = [{ x: g.x, y: g.y }]; this.stairFx = null;
  }

  // The clamp. Every room two or more behind the room the goat is standing in, with nobody alive
  // left in it, is shut for good: the tiles of its own wall the corridor out of it cut through go
  // back to stone and an iron plate is bolted over the mouth. The room he has just come out of is
  // left open, one step back is still his, and a room with anybody alive in it is left open too,
  // because whoever is in there is still coming. The world is mutated live, the way the rat ogre's
  // breach is: collision, the flow field and the shadowcast all read `tiles` fresh every step.
  // Every tile a body could walk to from (x, y), stone the only wall. A clamp is rare enough for a
  // whole-world fill rather than a field kept up to date.
  floodFrom(x, y) {
    const w = this.world, W = w.W, H = w.H, seen = new Uint8Array(W * H);
    const s0 = Math.floor(y / TILE) * W + Math.floor(x / TILE), stack = [s0];
    seen[s0] = 1;
    while (stack.length) {
      const i = stack.pop(), tx = i % W, ty = (i / W) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = tx + (d === 0 ? 1 : d === 1 ? -1 : 0), ny = ty + (d === 2 ? 1 : d === 3 ? -1 : 0), j = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[j] || w.isSolid(nx, ny)) continue;
        seen[j] = 1; stack.push(j);
      }
    }
    return seen;
  }
  // `quiet`: shut at once and without a sound, the rooms behind the middle gate he comes back to.
  updateClamps(quiet) {
    const L = this.level, w = this.world, g = this.goat;
    const here = roomAt(L, g.x, g.y);
    if (here) this.goatRoom = here.index;
    const upTo = (this.goatRoom || 0) - 2;
    // What a gate still waits on, its soul on the floor, or the keeper (or the mage's man) carrying
    // it, keeps every mouth between it and the goat open. Chased back two rooms and dropped there,
    // the keeper's soul was walled in behind the clamp and his gate could never open.
    const idxOf = (x, y) => { const r = roomAt(L, x, y); return r ? r.index : this.nearestRoomIdx(x, y, this.goatRoom || 0); };
    let owed = Infinity;
    for (const s of this.souls) if (s.gate >= 0) owed = Math.min(owed, idxOf(s.x, s.y));
    for (const e of this.enemies) if (!e.dead && (e.soulGate >= 0 || e.blessing)) owed = Math.min(owed, idxOf(e.x, e.y));
    let pets = null;
    for (let k = 0; k <= upTo; k++) {
      const room = L.rooms[k];
      if (!room || room.clamped || !room.exitMouth || k >= owed) continue;
      if (this.enemies.some((e) => !e.dead && !e.scripted && roomAt(L, e.x, e.y) === room)) continue;
      const m = room.exitMouth;
      const onMouth = (x, y, r) => m.tiles.some((i) => {
        const cx = (i % w.W + 0.5) * TILE, cy = (((i / w.W) | 0) + 0.5) * TILE;
        return Math.abs(x - cx) < TILE / 2 + r && Math.abs(y - cy) < TILE / 2 + r;
      });
      if (onMouth(g.x, g.y, g.r) || this.enemies.some((e) => !e.dead && onMouth(e.x, e.y, e.r))) continue;
      room.clamped = true;
      // An animal of ours still this side of the mouth, in the room or one before it, is walled in
      // with it, and that is meant: an escort left behind is the price of not keeping its pace. What
      // is not meant is finding out at the stairs. It used to stay alive in the dark with nothing on
      // screen to say so; it is lost now, and the goat is told where he stands (`Beast.lost`).
      // Which side of the new stone it is on is asked of the tiles, not the room list: a corridor
      // belongs to no room, and one half-way down the corridor out of the room he stands in counted
      // as behind the wall and was lost on his side of it.
      // A coop still shut counts: an animal never let out is walled in with its room like one left
      // behind (25 Sep 2026: it no longer breaks out after him).
      pets = pets || this.props.filter((p) => (Beast.animal(p) && !p.held && !p.gift) || (p.kind === 'coop' && !p.broken));
      const walled = pets.filter((p) => !p.broken && onMouth(p.x, p.y, 0));
      for (const i of m.tiles) w.tiles[i] = T.WALL;
      const open = pets.some((p) => !p.broken) ? this.floodFrom(g.x, g.y) : null;
      for (const p of pets) {
        if (p.broken) continue;
        if (walled.includes(p) || !open[Math.floor(p.y / TILE) * w.W + Math.floor(p.x / TILE)]) Beast.lost(p, this);
      }
      w.caveDirty();
      // Whatever was lying in the mouth goes into the stone with it, and a door hung there, a gate
      // long since opened, a seal, is part of the wall now rather than a slab drawn inside one.
      for (const p of this.props) if (!p.dead && p.kind !== 'clamp' && onMouth(p.x, p.y, 0)) { p.broken = true; p.dead = true; if (g.holding === p) g.holding = null; }
      // What shuts it is a veil, not a plate: the mouth goes dark and the whole room behind it goes
      // with it (`hidden`, `Renderer.drawUnseen`). An iron plate bolted over a doorway read as a wall
      // somebody built, and left the room behind it lit and readable; a room you are done with is
      // gone, and nothing about it is worth another look. `clampAt` times the veil coming down.
      room.clampAt = quiet ? -Infinity : this.timer;
      if (quiet) continue;
      if (hyp(m.x - g.x, m.y - g.y) < TUNING.clamp.hear * TILE) this.audio.sfxVeil();
      this.particles(m.x, m.y, 12, PALETTE.witch, 90);
    }
  }

  // Sealed arenas, in three beats: the doors stand open, they slam once he is inside, and they give
  // when the last man in the room is down. `sealedRooms` was built once at `startLevel`.
  //
  // The doors MUST start open. They used to stand shut from the first frame of the level, and since
  // a seal refuses to be smashed and refuses to be shouldered, that made every room behind one,
  // the arena, its soul, and the stairs out, unreachable: the level could not be finished at all.
  // A seal is a door that closes behind you, and a door that closes behind you has to be open first.
  // A room you have beaten lets you out. Once every man the level put in a room is dead, the door
  // out of it, a corridor door, or the one barring the stairs, gives on its own: three blows of
  // standing in the open are a price for running past a room, not for having emptied it. Only a
  // room that had anybody in it, and only once it has been seen; a soul gate, a seal and the vault
  // are not on this list and keep their own rules.
  updateClearDoors() {
    const L = this.level; if (!L) return;
    // The way-out gate must never outlive its bar: with no soul on the floor for it and nobody alive
    // carrying one (a boss that fell down a hole, a soul swept off), it lifts rather than shut the floor.
    const xg = (this.soulGates || []).find((s) => s.exit);
    if (xg && xg.prop && !xg.prop.broken && this.state === 'play'
      && !this.souls.some((t) => t.gate === xg.room && !t.taken) && !this.enemies.some((e) => !e.dead && e.soulGate === xg.room)) this.openSoulGate(xg.room);
    for (const d of this.props) {
      if (d.kind !== 'door' || d.broken || d.fromRoom < 0 || d.gate || d.seal || d.vault) continue;
      // A plank door stays shut for the goat to break (26 Sep 2026: "it's fun to smash them"); only
      // iron and stair doors, and a clock door that has to stop counting, swing open by themselves.
      if (!d.iron && !d.stair && !d.clockFor) continue;
      const room = L.rooms[d.fromRoom]; if (!room || !room.seen) continue;
      if (room.wasEmpty === undefined) room.wasEmpty = !this.enemies.some((e) => e.room === d.fromRoom && !e.scripted);
      if (room.wasEmpty) continue;   // nobody was ever in it: nothing was beaten
      if (this.enemies.some((e) => e.room === d.fromRoom && !e.dead && !e.scripted)) continue;
      // It swings open on its hinge rather than vanishing (playtest, 25 Sep 2026: "the doors should
      // open, not disappear by magic"). `open` above 0 is eased to 1 by `updateDoor`, and from 0.5 on
      // it neither blocks, nor stops a round, nor an eye. A clock door stops counting; the hits it
      // took are forgotten so the notches do not ride on an open leaf.
      d.fromRoom = -1; d.timed = false; d.hits = 0; d.pressure = 0;
      if (d.open <= 0) d.open = 0.01;
      this.audio.sfxSwing(); if (d.iron) this.audio.sfxSteel();
      this.particles(d.x, d.y, 6, PALETTE.ash, 90);
      this.floatText(d.x, d.y - 28, 'THE WAY IS OPEN', PALETTE.fireHi);
    }
  }
  updateSeals() {
    const g = this.goat;
    for (const s of this.sealedRooms) {
      if (s.open) continue;
      // Who the door is waiting on. Before it slams that is whoever was PUT in the room; after, it
      // is whoever was actually standing in it at the moment it shut. The two differ whenever an
      // escort followed the goat out through the open door and he then stepped back in, and the
      // spawn list alone would have left that man alive, outside, with the room he belongs to
      // impossible to clear from the inside. Whoever is in the room with you is who you have to beat.
      // Whoever it is waiting on has to still be IN the room. Nothing that plays by the rules can
      // leave one once both doors are shut, but a mage blinking through a wall could, and a man
      // alive on the far side of a door that only opens when he dies is a run that cannot be
      // finished. A door that gives too early costs a fight; this cost the whole game.
      const alive = (s.held || this.enemies.filter((e) => e.room === s.room))
        .some((e) => !e.dead && !e.ghosted && (!s.armed || this.inRoom(e, s.room, -1)));
      // Nobody left to fight: give, whether or not it ever slammed. A room he cleared by luring it
      // out through the open door is a room he cleared.
      if (!alive) {
        s.open = true;
        for (const d of s.doors) {
          if (d.broken) continue;
          d.seal = false; d.broken = true; d.dead = true;
          this.audio.sfxSteel(); this.shake(4); this.flash(PALETTE.fireHi, 0.1);
          this.particles(d.x, d.y, 14, PALETTE.ash, 220);
          this.floatText(d.x, d.y - 28, 'THE ROOM IS CLEAR', PALETTE.fireHi);
        }
        continue;
      }
      // Still open, and he is properly inside, a tile clear of the doorway itself, so neither door
      // can come down on the goat standing in it. Both slam at once and the fight starts.
      if (!s.armed && this.inRoom(g, s.room, 1)) {
        s.armed = true;
        // Everyone shut in with him, wherever they were spawned, including anyone who chased him
        // through the door on his way in. From here the door reads this list and nothing else.
        s.held = this.enemies.filter((e) => !e.dead && this.inRoom(e, s.room, 0));
        for (const d of s.doors) d.open = 0;
        this.audio.sfxSteel(); this.shake(5); this.vibe(24);
        this.flash(PALETTE.bone, 0.12);
        for (const d of s.doors) this.particles(d.x, d.y, 10, PALETTE.ash, 200);
        this.floatText(g.x, g.y - 40, 'SEALED IN', PALETTE.bone);
      }
    }
  }

  // Which shut seal, if any, this man is one of the reasons for. The mage asks before he blinks: a
  // body that leaves a room whose doors only open when it is empty is a run that ends there.
  sealHolding(e) {
    for (const s of this.sealedRooms) if (s.armed && !s.open && s.held && s.held.indexOf(e) >= 0) return s;
    const t = this.vaultTrap;
    if (t && t.armed && !t.done && t.held && t.held.indexOf(e) >= 0) return { box: t.box };
    return null;
  }
  // Inside the seal `sealHolding` gave, a tile clear of its walls: a room, or the vault's box.
  inSeal(p, seal) { return seal.box ? this.inBox(p, seal.box, 0) : this.inRoom(p, seal.room, 1); }
  inBox(e, b, inset) {
    const tx = e.x / TILE, ty = e.y / TILE, m = inset || 0;
    return tx >= b.x + m && tx < b.x + b.w - m && ty >= b.y + m && ty < b.y + b.h - m;
  }

  // The vault that is a trap (`TUNING.vault`): its door stands open on the grass; once he is inside
  // it slams, and the men come out of the walls and down from above. It opens when nobody it shut in
  // is left standing in the chamber, the sealed arena's rule, so a mage who got out anyway (he may
  // not: `sealHolding`) cannot lock the goat in for good.
  updateVaultTrap() {
    const t = this.vaultTrap, g = this.goat;
    if (!t || t.done) return;
    if (!t.armed) {
      // It springs on the mouthful, not the step in (2 Oct 2026 playtest: "the ambush after you ate the
      // grass, not before"): walked in at full hearts and out again, nothing happens.
      if (g.dead || !this.inBox(g, t.box, TUNING.vault.shutIn) || (t.grass && !t.grass.broken)) return;
      // Broken open beforehand (a body or a table sent through it) there is nothing to slam: no trap. And never
      // shut on a body standing in the doorway, it waits a step for him to come in or go.
      if (t.door.broken) { t.done = true; return; }
      const R = TUNING.prop.door.r;
      if (this.liveEnemies.some((e) => !e.dead && !e.held && hyp(e.x - t.door.x, e.y - t.door.y) < R + e.r)) return;
      t.armed = true; t.door.open = 0; t.door.seal = true;
      this.audio.sfxSteel(); this.shake(5); this.vibe(24); this.flash(PALETTE.bone, 0.12);
      this.particles(t.door.x, t.door.y, 10, PALETTE.ash, 200);
      this.floatText(g.x, g.y - 40, 'A TRAP', PALETTE.bone);
      t.held = this.vaultAmbush(t);
      return;
    }
    if (t.held.some((e) => !e.dead && this.inBox(e, t.box, -1))) return;
    t.done = true; t.door.seal = false; t.door.open = 0.01;
    this.audio.sfxSwing(); this.audio.sfxSteel();
    this.particles(t.door.x, t.door.y, 6, PALETTE.ash, 90);
    this.floatText(t.door.x, t.door.y - 28, 'THE WAY IS OPEN', PALETTE.fireHi);
  }
  // The stone teeth taught (3 Oct 2026 playtest: "a man walks onto the spikes and dies, the first time
  // you do it"). The first room this browser walks into with a tooth in it and a plain clubman who can
  // walk straight to it within `cave.spikes.lesson.reach` tiles: he is taken by hand (`scripted`) onto the
  // tooth at `walk` and dies there, in view. Once, ever (`SPIRE_KEY`); never on THE TRIP.
  updateSpireLesson(dt) {
    const L = this.spireLesson, S = TUNING.cave.spikes.lesson, g = this.goat;
    if (L && L.e) {
      const e = L.e;
      if (e.dead || e.held || e.state === 'flung') { e.scripted = false; this.spireLesson = { done: true }; return; }
      if (this.followPath(e, S.walk, dt)) {
        e.scripted = false; e.spireAt = this.timer;
        this.floatText(L.p.x, L.p.y - 34, 'STONE TEETH', PALETTE.blood);
        e.die(this, 'spire');
        this.spireLesson = { done: true };
      }
      return;
    }
    if (L && L.done) return;
    if (!this.level || this.level.def.shroom || !g || g.dead) return;
    // Looked for `every` s, not every step: the walked way is a search per clubman, and until a
    // browser has seen the lesson a cave room with a tooth ran it sixty times a second.
    if ((this.spireLookT = (this.spireLookT || 0) - dt) > 0) return;
    this.spireLookT = S.every;
    let told = false; try { told = localStorage.getItem(SPIRE_KEY) === '1'; } catch (err) { told = false; }
    if (told) { this.spireLesson = { done: true }; return; }
    const room = roomAt(this.level, g.x, g.y); if (!room) return;
    const inBox = (x, y) => roomAt(this.level, x, y) === room;
    for (const p of this.props) {
      if (p.kind !== 'spire' || p.broken || !inBox(p.x, p.y)) continue;
      // The goat must see the tooth he dies on; the man's way there is walked tile by tile (a cave
      // room's rock stands between them as often as not), at most `reach` tiles of it.
      if (!this.sees(g.x, g.y, p.x, p.y)) continue;
      let best = null, bestWay = null;
      for (const e of this.liveEnemies) {
        if (e.dead || e.held || e.kind !== 'bearer' || e.champion || e.boss || e.soul || e.shield || e.sentry || e.state === 'flung' || !inBox(e.x, e.y)) continue;
        const way = this.tileWay(e.x, e.y, p.x, p.y, S.reach);
        if (way && (!bestWay || way.length < bestWay.length)) { best = e; bestWay = way; }
      }
      if (!best) continue;
      best.scripted = true; best.path = bestWay; best.aware = true;
      this.spireLesson = { e: best, p };
      try { localStorage.setItem(SPIRE_KEY, '1'); } catch (err) { /* storage refused: it may be shown again */ }
      return;
    }
  }
  // A walked way from (x0, y0) to (x1, y1), tile centres through floor (no stone, no hole), at most
  // `max` tiles; null when there is none. The last point is (x1, y1) itself.
  tileWay(x0, y0, x1, y1, max) {
    const w = this.world, sx = Math.floor(x0 / TILE), sy = Math.floor(y0 / TILE), ex = Math.floor(x1 / TILE), ey = Math.floor(y1 / TILE);
    const key = (x, y) => x + ',' + y, from = new Map([[key(sx, sy), null]]);
    let front = [[sx, sy]];
    for (let step = 0; step < max && front.length; step++) {
      const next = [];
      for (const [x, y] of front) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (from.has(k) || !w.walkableAt(nx, ny)) continue;
        from.set(k, [x, y]);
        if (nx === ex && ny === ey) {
          const out = [{ x: x1, y: y1 }];
          for (let c = [x, y]; c && !(c[0] === sx && c[1] === sy); c = from.get(key(c[0], c[1]))) out.unshift({ x: (c[0] + 0.5) * TILE, y: (c[1] + 0.5) * TILE });
          return out;
        }
        next.push([nx, ny]);
      }
      front = next;
    }
    return null;
  }
  // The ogre's vault's one tell: while the goat is near its door, something heavy leans on it from
  // inside now and then, the door shivers, a thud, a groan. The grass vault's door never does.
  updateVaultOgre(dt) {
    const o = this.vaultOgre, O = TUNING.vault.ogre, g = this.goat;
    if (!o || o.door.broken || o.e.dead || g.dead) return;
    if (hyp(g.x - o.door.x, g.y - o.door.y) > O.tellR * TILE) return;
    if ((o.t -= dt) > 0) return;
    o.t = O.tellGap * (1 - O.tellVary + Math.random() * 2 * O.tellVary);
    // heard from the door: without `where` the groan played at full on the bus kept for deaths, every tell
    o.door.wobble = 0.35; this.audio.sfxThud(); this.audio.sfxGroan && this.audio.sfxGroan('butcher', this.audio.heard(o.door.x - g.x, o.door.y - g.y));
    this.particles(o.door.x, o.door.y, 4, PALETTE.ash, 90);
  }
  // The men of a vault trap, put down on the chamber's floor away from the door and off the goat.
  // One standing against a wall has come through it (stone flying off that wall); the others dropped
  // from above and land dazed for a beat, which is also the goat's beat to read the room.
  vaultAmbush(t) {
    const V = TUNING.vault, cfg = V[t.kind], b = t.box, g = this.goat, w = this.world;
    const dtx = Math.floor(t.door.x / TILE), dty = Math.floor(t.door.y / TILE);
    const spots = [];
    for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) {
      const x = (tx + 0.5) * TILE, y = (ty + 0.5) * TILE;
      if (w.tileAtPx(x, y) !== T.FLOOR || Math.abs(tx - dtx) + Math.abs(ty - dty) < 3) continue;
      if (hyp(x - g.x, y - g.y) < TILE * 1.5) continue;
      const edge = tx === b.x || tx === b.x + b.w - 1 || ty === b.y || ty === b.y + b.h - 1;
      spots.push({ x, y, tx, ty, edge, far: hyp(x - g.x, y - g.y) });
    }
    // Spread round the goat: the furthest spots first, then no two men on one tile or beside it.
    spots.sort((a, c) => c.far - a.far);
    const chosen = [];
    for (const s of spots) {
      if (chosen.length >= cfg.men) break;
      if (chosen.every((c) => Math.abs(c.tx - s.tx) + Math.abs(c.ty - s.ty) >= 2)) chosen.push(s);
    }
    const men = [];
    chosen.forEach((s, k) => {
      const e = new Enemy(s.x, s.y, cfg.kind);
      e.aware = true; e.woke = true; e.state = 'chase'; e.room = -1; e.vaultMan = true;
      e.facing = Math.atan2(g.y - s.y, g.x - s.x);
      this.enemies.push(e); men.push(e);
      if (s.edge && k % 2 === 0) {
        // Through the wall behind him: the stone of the chamber's own side bursts inward.
        const ox = s.tx === b.x ? -1 : s.tx === b.x + b.w - 1 ? 1 : 0, oy = ox ? 0 : s.ty === b.y ? -1 : 1;
        this.particles(s.x + ox * TILE * 0.5, s.y + oy * TILE * 0.5, 16, PALETTE.ash, 220);
        this.audio.sfxCrack();
      } else {
        e.daze(this, V.land);
        this.particles(s.x, s.y, 10, PALETTE.bone, 160); this.ring(s.x, s.y, TILE, PALETTE.ash);
        this.audio.sfxThud();
      }
    });
    return men;
  }

  // Is this body inside that room's box, `inset` tiles clear of its walls? Only the seals ask.
  inRoom(e, index, inset) {
    const r = this.level.rooms[index];
    if (!r) return false;
    const tx = e.x / TILE, ty = e.y / TILE, m = inset || 0;
    return tx >= r.x + m && tx < r.x + r.w - m && ty >= r.y + m && ty < r.y + r.h - m;
  }

  // ---------- the fog ----------
  // A room is dark until the goat has been in it. Nothing is hidden by distance and nothing is ever
  // re-hidden: what you have seen stays seen, and what you have not is a black rectangle with a
  // doorway in it. The point is the doorway, a corridor used to end in a room you had already read
  // from twenty tiles away, so the only thing left to do with it was run in, and every room in the
  // game was the same length of warning. Now the warning is the width of a door.
  // The test is the goat's own tile inside the room's box, widened by one so that standing in the
  // mouth of the corridor counts: you see the room as you come through the wall, not after it.
  // The fog has two halves and this does both. A room is opened by walking into it and is never
  // hidden again; what a partition inside an opened room keeps from him is dark until he steps
  // round to where it can be seen from, and that half moves with him. `computeVis` is the second
  // half, the renderer paints down everything outside it, and nothing else reads it: a man behind
  // a pillar is still in the room, still hears you, and still comes.
  revealRooms() {
    const g = this.goat, w = this.world, tx = g.x / TILE, ty = g.y / TILE;
    for (const r of this.level.rooms) {
      if (r.seen) continue;
      if (tx < r.x - 1 || tx > r.x + r.w || ty < r.y - 1 || ty > r.y + r.h) continue;
      r.seen = true;
    }
    // A shut door is a wall with hinges to his own eye as well as to theirs. It was already a wall
    // to `sees`, which is what the cult looks down; the goat's own line went straight through one.
    // Every tile the thing actually covers, not the one its centre is in: a door hangs across both
    // lanes of a two-tile corridor, and blocking half of it left a clear line down the other half.
    // Two lists taken in turn, never a new one a step: `setVisBlocks` keeps the list it is handed until the next.
    // Own, not inherited: the JUICE preview's stage is Object.create(game), and a shared buffer would be refilled under the real world's feet.
    const bufs = Object.hasOwn(this, 'visBufs') ? this.visBufs : (this.visBufs = [[], []]), blocks = bufs[this.visFlip = 1 - (this.visFlip || 0)];
    blocks.length = 0;
    for (const p of this.sightBlockers) {
      if (!p.opaque) continue;
      const rr = p.r * 0.8;
      const x0 = Math.floor((p.x - rr) / TILE), x1 = Math.floor((p.x + rr) / TILE);
      const y0 = Math.floor((p.y - rr) / TILE), y1 = Math.floor((p.y + rr) / TILE);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
        if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) continue;
        if (hyp((tx + 0.5) * TILE - p.x, (ty + 0.5) * TILE - p.y) < rr) blocks.push(ty * w.W + tx);
      }
    }
    // Tall grass is lit a step into it and no further: the tiles of it more than `seeInto` off him
    // stop the cast like a wall does, so what is deep in a patch and what is behind it is shade.
    const G = TUNING.grass, gr = Math.ceil(TUNING.fog.radius);
    if (this.level.grass && this.level.grass.length) {
      const gx = Math.floor(tx), gy = Math.floor(ty);
      for (let y = Math.max(0, gy - gr); y <= Math.min(w.H - 1, gy + gr); y++) for (let x = Math.max(0, gx - gr); x <= Math.min(w.W - 1, gx + gr); x++) {
        const i = y * w.W + x;
        if (w.grass[i] && !w.fire[i] && hyp(x + 0.5 - tx, y + 0.5 - ty) > G.seeInto) blocks.push(i);   // a patch alight hides nothing
      }
    }
    w.setVisBlocks(blocks);
    w.computeVis(g.x, g.y, TUNING.fog.radius, this.mods.oracle ? TUNING.fog.oracle : 0);
    // And a room opens when he can see into it, not only once he is standing in it. It is still the
    // width of the door: what he cannot see from where he stands is painted down by the shade, so a
    // look through a doorway hands him the sliver of the room the doorway shows and nothing more.
    for (const r of this.level.rooms) if (!r.seen && w.anyFloorSeen(r)) r.seen = true;
    // A niche you have opened stays open. The shadowcast is honest about a one-tile gap, from a
    // step back it lights a sliver of what is past it and shades the rest, which is right for a
    // doorway and wrong for this: the whole point of the wall is what is behind it, and a player who
    // has spent two blows finding out has earned the sight of it rather than a dark patch he has to
    // walk into. Three tiles, and only once the wall is actually down. The ring a tile out from each
    // of those is lit too, at `fog.shade` raised, the seam between a forced-bright niche tile (no
    // shadowcast, no falloff) and its ordinary shadowcast-lit neighbour one step into the room read
    // as a hard black edge rather than as a wall.
    // The mouse's hole is lit the same way, from the moment her room is open: an offer you cannot
    // see across a dark room is not an offer. The wares stay lit after she has turned, too.
    const lit = this.litNiches || (this.litNiches = []); lit.length = 0;
    for (const p of this.sightBlockers) if (p.kind === 'secret' && p.broken && p.nicheTiles) lit.push(p);
    for (const p of this.props) if (p.kind === 'mouse' && p.nicheTiles) { const r = this.level.rooms[p.shopId]; if (r && r.seen) lit.push(p); }
    for (const p of lit) {
      for (const i of p.nicheTiles) {
        w.lightTile(i);
        const tx = i % w.W, ty = Math.floor(i / w.W);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = tx + dx, ny = ty + dy;
          if (nx < 0 || ny < 0 || nx >= w.W || ny >= w.H) continue;
          if (!w.isSolid(nx, ny)) w.lightTile(ny * w.W + nx);
        }
      }
    }
    // A door on a clock lights itself, for exactly the same reason and by the same means. The fog is
    // the width of a doorway, and this door is at the far end of a room you have only just walked
    // into: the offer it makes, cross before it seats and pay nothing, is not an offer at all if
    // the thing you are racing is in the dark until you are standing at it. It is lit only while the
    // count runs; once it seats it is an ordinary iron door and goes back under the shade like one.
    for (const p of this.props) {
      if (p.kind !== 'door' || !p.timed || p.broken) continue;
      const room = this.level.rooms[p.clockRoom];
      if (!room || !room.seen) continue;
      const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = tx + dx, ny = ty + dy;
          if (nx < 0 || ny < 0 || nx >= w.W || ny >= w.H) continue;
          if (!w.isSolid(nx, ny)) w.lightTile(ny * w.W + nx);
        }
      }
      // Once a run, in the room it first happens in, because a door that is open when you look at it
      // and shut when you get there explains itself only after it has already cost you something.
      if (!this.clockTold && this.inRoom(this.goat, p.clockRoom, -1)) {
        this.clockTold = true;
        this.floatText(p.x, p.y - 34, 'IT IS CLOSING', PALETTE.fireHi);
      }
    }
  }
  // Is this point inside a room nobody has walked into? Everything the world draws and everything
  // that would give a room away, a man, a crate, a body on its way down a hole, asks this.
  // Whether the goat can see a man right now: his feet or his head on a tile inside the goat's
  // own line of sight (`world.vis`). A man in the shaded part of a seen room used to be drawn under
  // the shade and read through it (25 Sep 2026: "an enemy in the fog I should not see at all").
  // Render only; a dead goat's frozen sight shows everyone, as the recap wants.
  inSight(e) {
    const w = this.world;
    if (!w || !w.vis || this.state === 'dead' || this.state === 'intro' || e.held) return true;
    const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
    return w.seesTile(tx, ty) || w.seesTile(tx, Math.floor((e.y - TILE * 0.6) / TILE));
  }
  // A table butted off the edge above (`Prop.fall` in heaven) comes down here on a man the goat can
  // see, at the worst moment: more than `crowd` men up in his room and `hurt` hearts gone in this room
  // and the last. Its shadow finds one and follows him until it is `lock` s from landing, so a man who
  // moves in that last beat walks out from under it. Whoever is under it then is crushed; the goat
  // never. It lands on its side and stays, a table like any other (`TUNING.heaven.tables`).
  updateSkyTables(dt) {
    const S = this.skyTables, C = TUNING.heaven.tables, roll = (r) => r[0] + Math.random() * (r[1] - r[0]);
    for (const d of S.drops) {
      d.vz += C.grav * dt; d.z -= d.vz * dt;
      const lockZ = d.vz * C.lock + 0.5 * C.grav * C.lock * C.lock;
      if (d.z > lockZ && d.e && !d.e.dead && !d.e.held) { d.x = d.e.x; d.y = d.e.y; }
      if (d.z > 0) continue;
      d.done = true;
      for (const e of this.enemies) {
        if (e.dead || e.held || e.ghosted || e.state === 'hop' || e.state === 'hidden') continue;
        if (hyp(e.x - d.x, e.y - d.y) <= C.killR + e.r * 0.5) e.die(this, 'splat', 0, 1, 'chandelier');
      }
      const t = new Prop(d.x, d.y, 'table'); this.props.push(t); t.flipTable(this, Math.cos(d.spin), Math.sin(d.spin));
      this.thud(d.x, d.y, 6); this.audio.sfxThud(); this.audio.sfxCrack();
      this.dust(d.x, d.y, 8, 0, 0); this.particles(d.x, d.y, 16, PALETTE.wood, 190);
      this.world.emitNoise(d.x, d.y, TUNING.noise.smash);
    }
    S.drops = S.drops.filter((d) => !d.done);
    if (S.n <= 0) { if (!S.drops.length) this.skyTables = null; return; }
    if ((S.t -= dt) > 0) return;
    const g = this.goat, v = this.renderer.view(this.cam), here = this.goatRoom || 0;
    const hurt = (this.hurtRooms || []).filter((r) => r === here || r === here - 1).length;
    if (hurt < C.hurt) return;
    const inRoom = (e) => { const r = roomAt(this.level, e.x, e.y); return r && r.index === here; };
    const up = (e) => !e.dead && !e.held && !e.ghosted && !e.scripted && e.state !== 'hidden' && e.state !== 'hop';
    if (this.liveEnemies.filter((e) => up(e) && inRoom(e)).length <= C.crowd) return;
    const pool = this.liveEnemies.filter((e) => up(e) && inRoom(e)
      && Math.abs(e.x - this.cam.x) < v.w / 2 && Math.abs(e.y - this.cam.y) < v.h / 2 && !this.hidden(e.x, e.y) && this.sees(g.x, g.y, e.x, e.y));
    if (!pool.length) return;
    const e = pool[Math.floor(Math.random() * pool.length)];
    S.drops.push({ e, x: e.x, y: e.y, z: C.z, vz: 0, spin: Math.random() * Math.PI * 2, table: new Prop(e.x, e.y, 'table') });
    S.n--; S.t = roll(C.gap);
    this.audio.sfxSwing();
  }
  // A barrel broken without going up leaves its powder on `powder.tiles` tiles: its own first, then the
  // floor round it. Nothing happens until fire finds it (`updatePowder`).
  spillPowder(x, y) {
    const P = TUNING.prop.powder, w = this.world, W = w.W, tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    const near = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    let laid = 0;
    for (const [dx, dy] of near) {
      if (laid >= P.tiles) break;
      const i = (ty + dy) * W + tx + dx;
      if (!w.walkableAt(tx + dx, ty + dy) || w.tiles[i] === T.PIT || this.powder.has(i)) continue;
      this.powder.set(i, { lit: -1, seed: (i * 2654435761) >>> 0 }); laid++;
    }
  }
  // Fire on a powder tile, or a man alight standing on one, lights it; it spits for `fuse` s and
  // blows, and the blast lights the powder next door, so a trail goes off down its length.
  updatePowder(dt) {
    const P = TUNING.prop.powder, w = this.world, W = w.W, R = P.r * TILE;
    const lit = (i) => { const q = this.powder.get(i); if (q && q.lit < 0) q.lit = P.fuse; };
    for (const e of this.liveEnemies) if (!e.dead && e.burning > 0) lit(Math.floor(e.y / TILE) * W + Math.floor(e.x / TILE));
    for (const [i, q] of this.powder) {
      const x = (i % W + 0.5) * TILE, y = (Math.floor(i / W) + 0.5) * TILE;
      if (q.lit < 0) { if (w.isBurningPx(x, y)) q.lit = P.fuse; continue; }
      if ((q.lit -= dt) > 0) continue;
      this.powder.delete(i);
      this.fx.explosion(x, y, R, false); w.scorch(x, y, R * 0.6); w.ignitePool(x, y, 0.6);
      if (this.scatter) this.scatter.burst(x, y, R);   // armour and suppers go over, as in every other blast
      this.audio.sfxBoom(); this.thud(x, y, 5); this.ring(x, y, R, PALETTE.fireHi); this.particles(x, y, 12, PALETTE.fire, 220);
      w.emitNoise(x, y, TUNING.noise.boom);
      for (const e of this.enemies) {
        if (e.dead || e.held || e.ghosted) continue;
        const d = hyp(e.x - x, e.y - y);
        if (d <= R + e.r * 0.5 && this.blastClear(x, y, e.x, e.y)) e.die(this, 'splat', (e.x - x) / (d || 1), (e.y - y) / (d || 1), 'powder');
      }
      const g = this.goat, gd = hyp(g.x - x, g.y - y);
      // its own killer (`KILLED_BY.powder`): the card said A BOMB and the god asked why he held on to it
      if (!g.dead && gd <= R + g.r * 0.5 && this.blastClear(x, y, g.x, g.y)) g.damage(P.damage, this, (g.x - x) / (gd || 1) * 220, (g.y - y) / (gd || 1) * 220, false, 'powder');
      Prop.blastRoom(this, x, y, R, false);   // the crates, lamps and barrels round it, as every other blast
      for (const n of [i + 1, i - 1, i + W, i - W]) { const o = this.powder.get(n); if (o && o.lit < 0) o.lit = P.chain; }
    }
  }
  hidden(x, y) {
    if (!this.level) return false;
    if (this.niches) {
      const i = Math.floor(y / TILE) * this.world.W + Math.floor(x / TILE);
      for (const p of this.niches) if (!p.broken && p.nicheTiles.indexOf(i) > 0) return true;
    }
    for (const r of this.level.rooms) {
      if (r.seen && !r.clamped) continue;
      if (x >= r.x * TILE && x < (r.x + r.w) * TILE && y >= r.y * TILE && y < (r.y + r.h) * TILE) return true;
    }
    return false;
  }

  // ---------- settings ----------
  // Two switches and a browser that may refuse to remember either of them. The clock is off by
  // default: a number counting up in the corner of a game about running is a game about the number,
  // and the run is timed either way, the card at the end of a level is where the time belongs.
  loadSettings() {
    const d = { timer: false, sound: true, easy: false, god: false, layeredMusic: true, musicVolume: TUNING.audio.musicDefault, sfxVolume: 0.5, shake: 1, fps: false, photoKey: false, photoAuto: false, fastCalm: false, stats: false, statsAsked: false, keysOnly: false, musicLow: true };
    try {
      const saved = JSON.parse(localStorage.getItem(SET_KEY) || '{}');
      // The music starts quieter (3 Oct 2026: playtesters turned it well down). A store written before
      // that and still on the old default of 0.5 was never touched by hand, so it gets the new one too.
      if (!saved.musicLow && saved.musicVolume === 0.5) saved.musicVolume = TUNING.audio.musicDefault;
      saved.musicLow = true;
      return Object.assign(d, saved);
    } catch (err) { return d; }
  }
  saveSettings() {
    try { localStorage.setItem(SET_KEY, JSON.stringify(this.settings)); } catch (err) { /* private mode: it lasts the tab */ }
  }
  toggleSetting(key) {
    this.settings[key] = !this.settings[key];
    if (key === 'sound' && this.audio.muted === this.settings.sound) this.audio.toggleMute();
    if (key === 'layeredMusic') this.audio.setLayered(this.settings.layeredMusic);
    // GOD MODE is the dev drawer's GOD, kept: one switch however it is thrown (`dev.god` is what
    // `Goat.damage`, the board and the run code read).
    if (key === 'god') this.dev.god = this.settings.god;
    if (key === 'god' || key === 'easy') Stats.mark(this);   // the open life keeps the letter (js/stats.js)
    // Thrown here, the title's question is answered too (js/stats.js).
    if (key === 'stats') { this.settings.statsAsked = true; if (this.settings.stats) Stats.flush(this); }
    this.saveSettings(); this.audio.sfxSwing();
  }
  // The two sliders read straight off `this.settings` and write straight back to it, nothing else
  // carries its own copy of the value, so a drag, an arrow key and a reload all agree.
  applyVolumeSettings() { this.audio.setVolumes(this.settings.musicVolume, this.settings.sfxVolume); }
  adjustSlider(i, delta) {
    const it = SETTINGS[i]; if (!it || it.type !== 'slider') return;
    const v = clamp(Math.round(((this.settings[it.key] ?? 0.5) + delta) * 20) / 20, 0, 1);
    this.settings[it.key] = v; this.applyVolumeSettings(); this.saveSettings();
  }
  // A click or a drag sets the value directly off where the pointer landed on the bar; `menu.rects[i]`
  // carries the bar's own bounds (`sliderX`/`sliderW`), stamped on by `Renderer.drawSettings`, the
  // row rect used for hover and hit-testing is wider than the bar itself.
  setSliderAt(i, x) {
    const it = SETTINGS[i]; if (!it || it.type !== 'slider') return;
    const rect = this.menu.rects[i]; if (!rect || rect.sliderW === undefined) return;
    const v = clamp(Math.round(clamp((x - rect.sliderX) / rect.sliderW, 0, 1) * 20) / 20, 0, 1);
    this.settings[it.key] = v; this.applyVolumeSettings(); this.saveSettings();
  }

  // Reaching for a man with a mouth that only takes objects. Said once per level and then never
  // again: it is a missing verb, not a mistake, and repeating it every time would read as a fault.
  // The pen has been out of once. Everything after this run starts on the second blow instead of
  // the seventh: the first time is the lesson and a lesson you have had is only a toll.
  notePenBroken() {
    if (this.penBroken) return;
    this.penBroken = true;
    try { localStorage.setItem(PEN_KEY, '1'); } catch (e) { /* storage refused: it lasts the tab */ }
  }
  reachedForAMan(goat) {
    if (this.toldGrab) return;
    this.toldGrab = true;
    this.floatText(goat.x, goat.y - 34, 'TOO BIG TO CARRY', PALETTE.ashHi);
  }

  // A soul offers `BOON_CARDS` (two) of one kind: actives change what a button does, passives sharpen
  // everything. The first soul always offers actives, so every run picks a skill before it picks
  // numbers. A third card is not the rule since 30 Sep 2026 ("two choices instead of three"): HUNGRY
  // SOUL or THE KNUCKLEBONE deal one every `mods.thirdEvery`-th soul, counted in `talRun.third`.
  openBoonChoice() {
    // `needs` is a mod that has to be on before the soul is worth anything: LOOSE JOINTS on a goat
    // who cannot roll yet is a card that does nothing, and a run is only dealt thirteen or so.
    // `minLevel` is the dev tool's own knob, a card too strong for an early run is held back until
    // the level index it names, off (0) for every boon until somebody sets one.
    const open = (b) => this.boonOpen(b, this.levelIndex);
    const actives = BOONS.filter((b) => b.active && open(b));
    const passives = BOONS.filter((b) => !b.active && open(b));
    const swaps = this.boonSwaps(this.levelIndex);
    if (!actives.length && !passives.length && !swaps.length) { this.goat.hp = Math.min(this.goat.maxHp, this.goat.hp + 1); return; }
    const every = this.mods.thirdEvery || 0, R = Talisman.run(this);
    let n = BOON_CARDS, third = null;
    if (every > 0) {
      R.third = (R.third || 0) + 1;
      if (R.third >= every) {
        n = BOON_CARDS + 1;   // the count is spent below, only once a third card is really dealt
        // Whose third card it is, said on it: the perk if he has it and it deals this often, else the bone.
        const perk = this.boons.find((b) => b.id === 'hunger');
        third = perk && perk.params.every <= every ? perk.name : this.artifact ? ARTIFACTS.find((a) => a.id === this.artifact.id).name : perk ? perk.name : null;
      }
    }
    // While a button is still half-shut the cards lean hard toward the actives. Two of the four verbs
    // are half of themselves out of the pen, and a run that spends its first souls on percentages is
    // a run that never got to play the game, so until every button is whole, a skill is the likely draw.
    const shut = !this.mods.grabMen || !(this.mods.screamStun || this.mods.breath || this.mods.spit);
    const hasActive = this.boons.some((b) => b.active);
    let pool, other;
    // The offer alternates rather than rolling for it: a soul that dealt a skill hands the next one
    // out of the numbers, and back again. A coin flip could hand the same kind out three souls
    // running, which reads as the other kind not existing; and the 75% lean while a button was still
    // half-shut dealt two skills in a row on the second soul (2 Oct 2026 playtest), so `shut` only
    // says the first soul is a skill now.
    if (actives.length && (!hasActive || !this.lastBoonActive || (shut && !passives.length))) {
      pool = actives.slice(); other = passives.slice(); this.lastBoonActive = true;
    } else if (passives.length) { pool = passives.slice(); other = actives.slice(); this.lastBoonActive = false; }
    else { pool = actives.slice(); other = []; this.lastBoonActive = true; }
    const pick = [];
    // Two skills on offer are a choice of build (1 Oct 2026, playtest): never two on one button, never two
    // of one element (`BOON_SETS`: fire, poison). A card that would break it is passed over while there is another.
    const clash = (b) => b.active && pick.some((o) => o.active && (o.skill === b.skill || (o.element && o.element === b.element)));
    // The first soul of a run (nothing taken yet) always carries one active off each `BOON_FIRST`
    // button, a headbutt skill and a voice skill, and a third card, if one is dealt, comes the usual way. Drawn
    // out of `actives`, so `needs` and `BOON_SLOTS` still say which of them may be dealt at all.
    // On the first run this browser has begun, the voice card is DRAGON BREATH (1 Oct 2026, playtest:
    // "on the first run, the first soul always offers the dragon breath").
    if (!this.boons.length) {
      const firstRun = ((this.best || (this.best = this.loadBest())).runs || 0) <= 1 && !this.runJumped;
      for (const skill of firstRun ? ['scream'].concat(BOON_FIRST.filter((k) => k !== 'scream')) : BOON_FIRST) {
        const all = actives.filter((b) => b.skill === skill && !pick.includes(b)), fair = all.filter((b) => !clash(b)), on = fair.length ? fair : all;
        if (!on.length) continue;
        const breath = firstRun && skill === 'scream' && on.find((b) => b.id === 'breath');
        const b = breath || on[(Math.random() * on.length) | 0];
        pick.push(b);
        const k = pool.indexOf(b); if (k >= 0) pool.splice(k, 1);
        const j = other.indexOf(b); if (j >= 0) other.splice(j, 1);
      }
      if (pick.length) this.lastBoonActive = true;
      // A third card (if one is dealt) off another button where there is one: a second voice skill
      // beside the first is a card for a slot the other already fills.
      const elsewhere = pool.filter((b) => !BOON_FIRST.includes(b.skill));
      if (elsewhere.length) pool = elsewhere;
    }
    // The first run this browser plays, the first passive deal carries HUNGRY SOUL (2 Oct 2026 playtest:
    // "on the first run give the passive that adds a card to the choice"), so the third card is met early.
    const firstRunNow = ((this.best || (this.best = this.loadBest())).runs || 0) <= 1 && !this.runJumped;
    // Once: passed over, it is an ordinary card again, not one forced into every passive deal of the run.
    const hunger = !this.lastBoonActive && firstRunNow && !this.hungerOffered && pool.find((b) => b.id === 'hunger');
    if (hunger && pick.length < n) { pick.push(hunger); pool.splice(pool.indexOf(hunger), 1); this.hungerOffered = true; }
    const take = (list) => { const ok = list.filter((b) => !clash(b)); if (!ok.length) return false; const b = ok[(Math.random() * ok.length) | 0]; list.splice(list.indexOf(b), 1); pick.push(b); return true; };
    while (pick.length < n && take(pool));
    while (pick.length < n && take(other));
    while (pick.length < n && pool.length) pick.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    while (pick.length < n && other.length) pick.push(other.splice((Math.random() * other.length) | 0, 1)[0]);
    // What the open slots could not fill is dealt as swaps, the deal's own kind first.
    const replace = pick.map(() => null);
    const sw = swaps.filter((s) => !pick.includes(s.b)).sort((a, c) => (!!c.b.active === this.lastBoonActive) - (!!a.b.active === this.lastBoonActive));
    while (pick.length < n && sw.length) {
      const kind = !!sw[0].b.active, same = sw.filter((s) => !!s.b.active === kind);
      const s = same[(Math.random() * same.length) | 0];
      sw.splice(sw.indexOf(s), 1); pick.push(s.b); replace.push(s.old);
    }
    // A deal of swaps alone alternates off the kind it actually dealt, not the empty pool's guess.
    if (pick.length && replace.every(Boolean)) this.lastBoonActive = !!pick[0].active;
    this.boonChoice = pick; this.boonReplace = replace;
    this.boonThird = pick.length > BOON_CARDS ? third : null;
    // An earned third card the pools could not fill stays earned, for the next soul.
    if (n > BOON_CARDS && pick.length > BOON_CARDS) R.third = 0;
    Stats.offer(this, pick, replace, this.boonThird);
    // The party (`TUNING.fanfare`): the cards land after the soul does, and only then take a click.
    const F = TUNING.fanfare;
    this.boonDown = -1; this.boonArm = TUNING.boonArm + F.intro + F.stagger * (pick.length - 1) + F.pop; this.boonT = 0;
    this.boonPad = 0;   // the card a pad has lit: the first, every time
    this.boonPadMoved = false;   // lit is not chosen: the soul waits for the stick to walk the cards
    this.boonMorph = null;   // the `boonT` the soul began going into him (`watchBoonMorph`)
    this.state = 'boon'; this.card = null; this.audio.sfxCard(); this.vibe(30);
  }
  // Whether a card may be dealt at all: not already taken, its `needs` met, past its `minLevel`,
  // and a slot free for it (`BOON_SLOTS`). One active a button, two passives under it, four for the
  // body, a build is spread over the animal rather than piled on one verb. A `key` is never capped.
  boonOpen(b, li) {
    if (this.boons.includes(b) || (b.needs && !this.mods[b.needs]) || li < (b.minLevel || 0)) return false;
    if (b.key) return true;
    const cap = !b.skill ? BOON_SLOTS.general : b.active ? BOON_SLOTS.active : BOON_SLOTS.passive;
    return this.boons.filter((o) => !o.key && o.skill === b.skill && !!o.active === !!b.active).length < cap;
  }
  // A full slot no longer turns a soul into a silent heart (26 Sep 2026: "give it, but offer to swap
  // what he has"): every card shut out only by its slot being full comes with one boon already in that
  // slot it would replace. `openBoonChoice` deals these where the open cards run short, and the card
  // says INSTEAD OF what.
  boonSwaps(li) {
    const out = [];
    for (const b of BOONS) {
      if (b.key || this.boons.includes(b) || (b.needs && !this.mods[b.needs]) || li < (b.minLevel || 0) || this.boonOpen(b, li)) continue;
      const held = this.boons.filter((o) => !o.key && o.skill === b.skill && !!o.active === !!b.active);
      if (held.length) out.push({ b, old: held[(Math.random() * held.length) | 0] });
    }
    return out;
  }
  // The soul waits over the cards, where he will stand, until the player reaches for one (1 Oct 2026:
  // "the corrupted soul turns into the goat when you hover a card, and the goat stays"): the first card
  // pointed at once they can be taken (the mouse over it, a finger down on it, a pad's lit card) starts
  // it going into him, and it never turns back (`TUNING.fanfare.morph`, drawn by `drawSoulFanfare` and
  // `Codex.drawBoonGoat`). Keys 1-3 take a card without it; the screen is gone then anyway.
  watchBoonMorph() {
    // Stacked cards on a narrow screen draw no goat, so there is nothing for the breath and the bell to go with.
    if (this.boonMorph != null || this.boonArm > 0 || !this.boonChoice || this.renderer.boonStack) return;
    const n = this.boonChoice.length;
    const i = padOn(this) ? (this.boonPadMoved ? this.boonPad : -1) : this.boonDown >= 0 ? this.boonDown : this.touch.active ? -1 : this.boonAt(this.input.mouse);
    if (i < 0 || i >= n) return;
    this.boonMorph = this.boonT; this.audio.sfxAbsorb(); this.vibe(20);
  }
  // Which card a point is on, or -1. The rects are refilled by the renderer every frame.
  boonAt(p) {
    for (let i = 0; i < this.boonRects.length; i++) {
      const r = this.boonRects[i];
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i;
    }
    return -1;
  }
  takeBoon(i) {
    const b = this.boonChoice && this.boonChoice[i];
    if (!b || this.boonArm > 0) return;
    // A swap gives the old one up first. A boon's own `heal` (THICK HIDE: "it comes full") is paid
    // either way, since the card promises it; the silent heart for an empty deal is not a swap.
    const old = this.boonReplace && this.boonReplace[i];
    if (old) { const k = this.boons.indexOf(old); if (k >= 0) this.boons.splice(k, 1); }
    this.boons.push(b); this.applyBoons(); this.saveRun(); Stats.took(this, b.id);
    if (b.heal) this.goat.hp = Math.min(this.goat.maxHp, this.goat.hp + b.heal);
    this.boonChoice = null; this.boonReplace = null; this.boonThird = null; this.state = 'play';
    this.audio.sfxBell(); this.floatText(this.goat.x, this.goat.y - 34, b.name, PALETTE.fireHi);
    // A soul that completes a set says so: the fourth of an element is the one that changes the rules.
    if (b.element) {
      const S = BOON_SETS[b.element], k = this.setCount(b.element);
      if (S && k >= S.all) this.floatText(this.goat.x, this.goat.y - 52, S.whole, b.element === 'fire' ? PALETTE.fireHi : PALETTE.venomHi);
    }
  }
  // The last choice: none of the cards. A soul spent this way buys nothing and costs nothing more
  // than itself, there is no bank to put it back in, so it is simply not taken.
  skipBoon() {
    if (!this.boonChoice || this.boonArm > 0) return;
    this.boonChoice = null; this.boonReplace = null; this.boonThird = null; this.state = 'play';
    this.audio.sfxCard(); this.floatText(this.goat.x, this.goat.y - 34, 'SOUL RELEASED', PALETTE.witch); Stats.took(this, null);
  }

  // ---------- dev mode ----------
  hitDev(p) {
    for (const r of this.dev.rects) {
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        // A slider is taken hold of, not clicked: the press sets it where it landed and the drag
        // (pointermove) carries on from there. Twice quickly on one puts it back to 1.
        if (r.tune) {
          const now = performance.now(), last = this.dev.slideLast;
          if (last && last.key === r.tune && now - last.at < 350) { this.setDevTune(r.tune, 1); this.dev.slideLast = null; return true; }
          this.dev.slideLast = { key: r.tune, at: now };
          this.dev.slide = { tune: r.tune, x: r.x, w: r.w }; this.devSlide(this.dev.slide, p.x); return true;
        }
        this.devAction(r.id); return true;
      }
    }
    return this.dev.rules;   // the RULES page takes the whole screen: nothing under it is clickable
  }
  devToast(text, life = 1.6) { this.dev.toast = { text, life }; }
  // The six sliders of the ENEMIES tab (`DEV_TUNE`), read from this browser and written back on
  // every change. Whatever rides on `mods` takes effect through `applyBoons`; the rest (enemy step,
  // enemy and goat cooldown clocks, the headbutt's windup and lunge) is read live each step.
  loadDevTune() {
    const t = {};
    for (const [k] of DEV_TUNE) t[k] = 1;
    try {
      const s = JSON.parse(localStorage.getItem(TUNE_KEY) || '{}');
      for (const [k] of DEV_TUNE) if (Number.isFinite(s[k])) t[k] = clamp(s[k], DEV_TUNE_RANGE[0], DEV_TUNE_RANGE[1]);
    } catch (e) { /* storage refused */ }
    return t;
  }
  setDevTune(key, v) {
    if (this.dev.tune[key] === v) return;
    this.dev.tune[key] = v;
    try { localStorage.setItem(TUNE_KEY, JSON.stringify(this.dev.tune)); } catch (e) { /* storage refused */ }
    this.applyBoons();
  }
  // Log across the track, so 0.3..1 gets as much room as 1..3; snaps to 1 near it.
  devSlide(r, px) {
    const [lo, hi] = DEV_TUNE_RANGE, t = clamp((px - r.x) / r.w, 0, 1);
    const v = lo * Math.pow(hi / lo, t);
    this.setDevTune(r.tune, Math.abs(v - 1) < 0.04 ? 1 : Math.round(v * 100) / 100);
  }
  // ENEMY COOLDOWN: each clock between two attacks is caught before and after a man's step and the
  // tick it took scaled by 1 / enemyCd, whichever branch of `Enemy.update` did the ticking. The two
  // set through `enemySlow` (hook, cast) also undo ENEMY ATTACK folded into it, so that slider
  // moves blows only and this one moves the waits only.
  devCdBefore(e) {
    const T = this.dev.tune;
    if (T.enemyCd === 1 && T.enemyAttack === 1) return null;
    return [e.hookCd, e.castCd, e.blinkCd, e.lungeCd, e.slamCd, e.fadeCd, e.dodgeCd];
  }
  devCdAfter(e, cd0) {
    const T = this.dev.tune, r = 1 / T.enemyCd, rs = r / T.enemyAttack;
    ['hookCd', 'castCd', 'blinkCd', 'lungeCd', 'slamCd', 'fadeCd', 'dodgeCd'].forEach((f, i) => {
      const was = cd0[i], now = e[f];
      // Only a clock that ran down this step: one set afresh in it starts where it was set.
      if (!(was > 0) || !(now < was)) return;
      e[f] = Math.max(0, was - (was - now) * (i < 2 ? rs : r));
    });
  }
  // Best-effort write-through to js/tuning.js via the local dev server (tools/serve.js). The edit
  // has already taken effect in memory by the time this is called; off the dev server (the
  // published artifact, or index.html opened as a bare file) there is nothing to write to and the
  // fetch simply fails quietly rather than leaving a broken promise on screen.
  persistTuningEdit(edit) {
    try {
      fetch('/tuning-edit', { method: 'POST', body: JSON.stringify(edit) })
        .then((r) => r.json())
        .then((res) => this.devToast(res.ok ? 'SAVED TO tuning.js' : 'NOT SAVED: ' + res.error))
        .catch(() => this.devToast('NOT SAVED (no dev server)'));
    } catch (e) { /* fetch unavailable */ }
  }
  devAction(id) {
    if (id.startsWith('music-')) { this.audio.labAction(id.slice(6), this); return; }
    if (id === 'toggle') { this.dev.open = !this.dev.open; return; }
    if (id === 'god') { this.toggleSetting('god'); this.devToast(this.dev.god ? 'GOD MODE ON' : 'GOD MODE OFF'); return; }
    if (id === 'itch') { RELEASE.build(this); return; }
    if (id === 'dips') { this.dev.dips = !this.dev.dips; this.devToast(this.dev.dips ? `DIP LOG ON: A FRAME OVER ${TUNING.photo.dip.ms} MS IS WRITTEN DOWN` : 'DIP LOG OFF'); return; }
    if (id === 'dipsave') { Photo.saveDips(this); return; }
    if (id === 'statsave') { Stats.save(this); return; }
    if (id === 'statview') { window.open('tools/stats.html', '_blank'); return; }
    if (id === 'font-say' || id === 'font-text') { const r = id.slice(5); FONT_PICK.next(r); this.devToast(`${r === 'say' ? 'SPEECH' : 'TEXT'}: ${FONT_PICK.nameOf(r)}`); return; }
    if (id === 'tune-reset') { for (const [k] of DEV_TUNE) this.setDevTune(k, 1); this.devToast('SLIDERS AT 1'); return; }
    if (id === 'vision') { this.dev.vision = !this.dev.vision; return; }
    if (id === 'hearing') { this.dev.hearing = !this.dev.hearing; return; }
    if (id === 'stealth') {
      this.dev.stealth = !this.dev.stealth;
      try { localStorage.setItem(STEALTH_KEY, this.dev.stealth ? '1' : '0'); } catch (e) { /* storage refused */ }
      this.devToast(this.dev.stealth ? 'STEALTH ON: ALT TO SNEAK' : 'STEALTH OFF'); return;
    }
    if (id === 'horns') {   // HORNS in the DEV MODE drawer: short, wide, long
      const O = TUNING.horns.order;
      this.hornKind = O[(O.indexOf(this.hornKind) + 1) % O.length];
      try { localStorage.setItem(HORN_KEY, this.hornKind); } catch (e) { /* storage refused */ }
      this.applyBoons(); this.devToast('HORNS: ' + TUNING.horns[this.hornKind].name + ' · ' + TUNING.horns[this.hornKind].note); return;
    }
    if (id === 'dark') { this.dev.dark = !this.dev.dark; return; }
    if (id === 'showroom') { this.dev.open = false; this.startShowroom(); return; }
    // PREV / NEXT LEVEL: straight onto the floor before or after this one, as LEVELS on the title does
    // (`startAtLevel`: the souls a run would have banked dealt out, no save touched). SKIP LEVEL is the
    // other one: it climbs the stairs of the run he is in.
    if (id === 'lvl-prev' || id === 'lvl-next') {
      if (!this.level || this.level.def.heaven || !this.goat || (this.state !== 'play' && this.state !== 'paused')) return;
      const at = this.level.def.showroom ? 0 : this.levelIndex || 0, li = Math.max(0, Math.min(LEVELS.length - 1, at + (id === 'lvl-next' ? 1 : -1)));
      this.dev.open = false; this.dev.rules = false; this.startAtLevel(li);
      this.devToast('LEVEL ' + (li + 1) + ' · ' + LEVELS[li].name);
      return;
    }
    // COMBOS tab: PLAY lays that pairing (`TUNING.combos`, gen.js `dealCombo` through `opts.combo`) on this
    // floor if it may stand here, else on its own first floor, cutting the floor again off the next seeds
    // until one is laid, then stands the goat a step inside that room's door with the men before it gone.
    if (id.startsWith('combo=')) {
      const C = TUNING.combos.list.find((c) => c.id === id.slice(6));
      if (!C || !this.level || this.level.def.heaven || !this.goat) return;
      const cur = this.level.def.showroom || this.level.def.shroom ? -1 : this.levelIndex || 0;
      const li = cur >= C.from && LEVELS[cur] ? cur : Math.min(C.from, LEVELS.length - 1);
      this.dev.open = false; this.dev.rules = false; this.dev.forceCombo = C.id;
      const laid = () => this.level && this.level.combo && this.level.combo.id === C.id;
      try {
        this.startAtLevel(li);
        for (let k = 1; k < 40 && !laid(); k++) this.startLevel(li, (this.levelSeed(li) + k * 7919) >>> 0, true);
      } finally { this.dev.forceCombo = null; }
      if (!laid()) { this.devToast(`NO ROOM FOR ${C.name} ON ${LEVELS[li].name}`); return; }
      const L = this.level, at = L.combo.room, room = L.rooms[at], g = this.goat;
      this.enemies = this.enemies.filter((e) => !(e.room >= 0 && e.room < at));
      const ent = room.enter || { x: (room.x + 1.5) * TILE, y: (room.y + room.h / 2) * TILE };
      const cx = (room.x + room.w / 2) * TILE, cy = (room.y + room.h / 2) * TILE, l = Math.hypot(cx - ent.x, cy - ent.y) || 1;
      // Not `freeSpot`: it asks the flow field, which still runs from the start behind the gates.
      let spot = { x: ent.x + (cx - ent.x) / l * 1.2 * TILE, y: ent.y + (cy - ent.y) / l * 1.2 * TILE };
      for (let k = 1.2; k < l / TILE && [T.WALL, T.PIT].includes(this.world.tileAtPx(spot.x, spot.y)); k += 0.5) spot = { x: ent.x + (cx - ent.x) / l * k * TILE, y: ent.y + (cy - ent.y) / l * k * TILE };
      g.x = spot.x; g.y = spot.y; g.safeX = g.x; g.safeY = g.y; g.safeTrail = [];
      this.cageOpen = true; this.goatRoom = at;
      this.cam.x = g.x; this.cam.y = g.y; this.camFollow = null; this.camTrack = null; this.camHold = undefined; this.camRoomMid = null; this.pathTrail = [{ x: g.x, y: g.y }];
      this.world.computeFlow(g.x, g.y);
      this.world.computeVis(g.x, g.y, TUNING.fog.radius, this.mods.oracle ? TUNING.fog.oracle : 0);
      this.devToast(`${C.name} · ${LEVELS[li].name} ROOM ${at}`);
      return;
    }
    // Straight up to heaven from a floor under way, as a death would send him (js/heaven.js), and a
    // heap of sacrifices to try the mirror with.
    if (id === 'textedit') { this.devToast(TextEdit.toggle(this) ? 'TEXT EDIT ON: CLICK A TEXT' : 'TEXT EDIT OFF'); return; }
    if (id === 'godtalk') { try { window.open('tools/god-talk.html', '_blank'); } catch (e) { /* no window */ } return; }
    if (id === 'heaven') { if (this.level && !this.level.def.heaven && this.goat && (this.state === 'play' || this.state === 'paused')) { this.dev.open = false; this.deaths++; this.saveRun(); Heaven.enter(this); } return; }
    // ROOMS tab: a tick toggles where a template may be dealt (`ROOM_LEVELS`); the row's string is
    // written whole, starting from the generator's own habit the first time (`roomDefault`).
    if (id.startsWith('room-lvl=')) {
      const [name, k] = id.slice(9).split('|'), t = [ARMORY_TEMPLATE, ...ROOM_TEMPLATES].find((q) => q.name === name);
      if (!t) return;
      const defs = [...LEVELS, darkLevel(), tripLevel(2)];
      const cur = ROOM_LEVELS[name] || defs.map((def) => (roomDefault(t, def) ? '1' : '0')).join('');
      const bits = cur.padEnd(defs.length, '1').split(''); bits[+k] = bits[+k] === '1' ? '0' : '1';
      ROOM_LEVELS[name] = bits.join('');
      this.persistTuningEdit({ root: 'ROOM_LEVELS', path: [name], value: ROOM_LEVELS[name] });
      return;
    }
    if (id.startsWith('rule-hide=') || id.startsWith('rule-back=')) {
      const rid = id.slice(10), H = this.dev.ruleHide;
      if (id.startsWith('rule-hide=')) H.add(rid); else H.delete(rid);
      try { localStorage.setItem(RULE_HIDE_KEY, JSON.stringify([...H])); } catch (e) { /* storage refused: it lasts the tab */ }
      return;
    }
    if (id === 'rules-hidden') { this.dev.ruleShowHidden = !this.dev.ruleShowHidden; return; }
    if (id.startsWith('room-lvl-reset=')) {
      const name = id.slice(15); delete ROOM_LEVELS[name];
      this.persistTuningEdit({ root: 'ROOM_LEVELS', path: [name], value: null, drop: true });
      return;
    }
    // HEAVEN tab: set a mirror rank outright (`drawMirrorTab`), or all of them back to nothing.
    if (id.startsWith('mirror-rank=')) {
      const [u, r] = id.slice(12).split('.'), M = Heaven.meta || Heaven.load();
      M.ranks = M.ranks || {}; if (+r > 0) M.ranks[u] = +r; else delete M.ranks[u];
      Heaven.save(); this.applyBoons(); this.devToast(`${u.toUpperCase()} RANK ${r}`); return;
    }
    if (id === 'mirror-reset') { const M = Heaven.meta || Heaven.load(); M.ranks = {}; Heaven.save(); this.applyBoons(); this.devToast('MIRROR RANKS CLEARED'); return; }
    // HEAVEN tab: wake one more bell (a floor counted as won), or put them all back to sleep but the first.
    if (id === 'bells-add') { const M = Heaven.meta || Heaven.load(); M.cleared = M.cleared || {}; for (let k = 0; k < 64; k++) if (!M.cleared['dev' + k]) { M.cleared['dev' + k] = 1; break; } Heaven.save(); this.devToast(`${Heaven.bellsOpen()} BELLS AWAKE`); return; }
    if (id === 'bells-reset') { const M = Heaven.meta || Heaven.load(); M.cleared = {}; M.bellsSeen = 1; M.bellSong = 0; M.bellQuest = false; Heaven.save(); this.devToast('ONE BELL AWAKE'); return; }
    if (id === 'addkey') { this.runKeys = (this.runKeys | 0) + 1; this.keyFlash = 0.5; this.devToast(`${this.runKeys} KEYS`); return; }
    if (id === 'sacrifices') { Heaven.meta.sacrifices += 100; Heaven.meta.souls = (Heaven.meta.souls || 0) + 5; Heaven.save(); this.devToast(`${Heaven.meta.sacrifices} SACRIFICES · ${Heaven.meta.souls} SOULS`); return; }
    if (id === 'rules') { this.dev.rules = !this.dev.rules; if (this.dev.rules) { this.dev.page = this.level ? this.levelIndex : 0; this.dev.room = null; } return; }
    if (id.startsWith('rules-L')) { this.dev.page = Number(id.slice(7)); this.dev.room = null; return; }
    if (id === 'rules-roll') { this.dev.sampleSeed = (Math.random() * 1e9) | 0; this.dev.samples = {}; this.dev.matrix = null; this.dev.room = null; return; }
    // PLAY LEVEL, on the LEVEL tab: close the tool and drop the goat into the level it is looking
    // at, for real, walking it rather than only reading the plan. `startAtLevel` is the same door
    // LEVELS on the title screen already opens (souls dealt out for the levels skipped), so this is
    // not a second way into a level, only a second place to reach the first one from.
    if (id === 'rules-play') {
      this.dev.rules = false; this.dev.open = false;
      this.startAtLevel(this.dev.page);
      return;
    }
    if (id.startsWith('tab-')) { this.dev.tab = id.slice(4); this.dev.room = null; return; }
    if (id.startsWith('tal-') && Talisman.devAction(this, id)) return;   // the TALISMANS tab
    if (id.startsWith('grid-') && GoatGrid.devAction(this, id)) return;  // the GOAT GRID tab
    // The JUICE tab: a filter, a page, a row opened out, and the table handed over as Markdown.
    if (id.startsWith('juice-filter=')) { this.dev.juiceFilter = id.slice(13); this.dev.juicePage = 0; return; }
    if (id.startsWith('juice-page=')) { this.dev.juicePage = (this.dev.juicePage || 0) + Number(id.slice(11)); return; }
    // The live preview (js/juice-preview.js): ▶ PLAY on a row, and the chips of its box. With the box
    // open, a click on another row plays that one in it too.
    if (id.startsWith('juice-play=') || id.startsWith('juice-pv=')) { JuicePreview.action(this, id); return; }
    if (id.startsWith('juice-row=')) { const n = id.slice(10); this.dev.juiceSel = this.dev.juiceSel === n ? null : n;
      if (JuicePreview.row && JuicePreview.kind(n) && JuicePreview.row !== n) JuicePreview.open(this, n); return; }
    // The ART tab: a per-session tick, never saved, the checklist is worked through once per art
    // pass, not tracked as a record.
    if (id.startsWith('art-check=')) { this.dev.artChecked = this.dev.artChecked || {}; const k = id.slice(10); this.dev.artChecked[k] = !this.dev.artChecked[k]; return; }
    if (id === 'art-reset') { this.dev.artChecked = {}; return; }
    // The looks under comparison (`ART_PASS`). The cave's rock is baked in chunks off its colour, so a
    // switch of the pass asks for them again.
    if (id === 'art-pass') { ART_PASS.set(!ART_PASS.on); if (this.world && this.world.caveDirty) this.world.caveDirty(); this.renderer.bake = null; return; }
    if (id === 'art-hunter') { ART_PASS.hunter = (ART_PASS.hunter + 1) % PIXEL_STUDY.hunter.length; return; }
    if (id === 'art-floors') { ART_PASS.floors = !ART_PASS.floors; return; }
    if (id === 'art-shield') { ART_PASS.shield = ((ART_PASS.shield || 0) + 1) % PROP_PIXELS.SHIELD_LOOKS.length; return; }
    // the second pass's switches; the baked rooms and cave key themselves on hay and the cave's floor
    if (id === 'art-shadows' || id === 'art-tells' || id === 'art-hay' || id === 'art-cave') { const k = id.slice(4); ART_PASS[k] = !ART_PASS[k]; return; }
    if (id === 'art-clubman') { ART_PASS.clubman = (ART_PASS.clubman + 1) % PIXEL_STUDY.clubman.length; return; }
    if (id === 'juice-export') {
      try {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([juiceMarkdown()], { type: 'text/markdown' }));
        a.download = 'goat-out-juice.md'; document.body.appendChild(a); a.click(); a.remove();
        this.devToast('JUICE EXPORTED');
      } catch (e) { this.devToast('EXPORT FAILED'); }
      return;
    }
    // The BOONS tab: click a number to change it. It takes effect at once (`applyBoons` re-reads
    // every `params` off the live BOONS entries) and is also asked to land in js/tuning.js itself,
    // through the dev server started for this session, see tools/tuning-patch.js. Off the dev
    // server (the published artifact, or index.html opened as a bare file) the write simply has
    // nowhere to land and the edit stays session-only, which is why the fetch is best-effort.
    // BOONS tab, HAVE: give the goat that one upgrade now, or take it back, no card, no slot rule,
    // and the head of the floor with it, so a death keeps what was set here (29 Sep 2026, "let me
    // edit single upgrades in the dev tools").
    if (id.startsWith('boon-have=')) {
      const b = BOONS.find((x) => x.id === id.slice(10));
      if (!b || !this.goat || !this.boons) return;
      const k = this.boons.indexOf(b);
      if (k >= 0) this.boons.splice(k, 1); else this.boons.push(b);
      this.levelBoons = this.boons.slice();
      this.applyBoons();
      if (this.goat.hp > this.goat.maxHp) this.goat.hp = this.goat.maxHp;
      this.devToast((k >= 0 ? 'TAKEN: ' : 'GIVEN: ') + b.name);
      return;
    }
    if (id.startsWith('boon-edit=')) {
      const [boonId, ...pathParts] = id.slice(10).split('.');
      const b = BOONS.find((x) => x.id === boonId);
      if (!b) return;
      const isLevel = pathParts[0] === 'minLevel';
      const current = isLevel ? (b.minLevel || 0) : b.params[pathParts[1]];
      const raw = window.prompt(`${b.name}, ${pathParts[pathParts.length - 1]}`, String(current));
      if (raw === null) return;
      const value = Number(raw);
      if (!Number.isFinite(value)) return;
      if (isLevel) b.minLevel = value; else b.params[pathParts[1]] = value;
      this.applyBoons();
      this.persistTuningEdit({ root: 'BOONS', id: boonId, path: isLevel ? ['minLevel'] : ['params', pathParts[1]], value });
      return;
    }
    // The ENEMIES tab (and THE GOAT underneath it): click a number to change it. `id` is a dotted
    // path straight into TUNING, `bearer.speed`, `boss.hp`, `goat.headbutt.recovery`, since
    // every kind and the goat himself are read live off TUNING already; there is nothing here to look
    // up by id the way a BOONS entry or a LEVELS entry is, only a path to walk. Same write-through as
    // a boon: takes effect at once, and `persistTuningEdit` best-effort lands it in tuning.js itself.
    if (id === 'enemy-sound=cock') { this.audio.init(); this.audio.resume(); this.audio.sfxCock(1); return; }
    if (id.startsWith('enemy-edit=')) {
      const path = id.slice('enemy-edit='.length).split('.');
      let obj = TUNING;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      const key = path[path.length - 1];
      const current = obj[key];
      // The default text in the prompt, rounded the same way the chip's own label is: a speed built
      // off CULT_PACE prints as 190.344960000000001 raw, which nobody typed and nobody wants back.
      const shown = typeof current === 'number' && !Number.isInteger(current) ? Math.round(current * 100) / 100 : current;
      const raw = window.prompt(path.join('.'), String(shown));
      if (raw === null) return;
      const value = Number(raw);
      if (!Number.isFinite(value)) return;
      obj[key] = value;
      this.persistTuningEdit({ root: 'TUNING', path, value });
      return;
    }
    // A kind's immunity checkboxes, next to its stats: `TUNING.<kind>.immune.<flag>`, fire, stun,
    // grab, blunder, is read live by `Enemy.ignite` / `daze` / the burning branch of `update` /
    // `Goat.tryGrab`, so flipping one here is the same edit typing it into tuning.js would be. No
    // prompt: a checkbox just flips.
    // The ENEMIES tab's SOUL under a kind: the row shows (and SPAWN makes) that man with a soul in him.
    if (id.startsWith('enemy-soul=')) { const v = this.dev.soulView || (this.dev.soulView = {}), t = id.slice(11); v[t] = !v[t]; return; }
    if (id.startsWith('enemy-trait=')) {
      const [t, trait] = id.slice(12).split('.'), list = TUNING.soulBearer.traits[t], i = list.indexOf(trait);
      if (i >= 0) list.splice(i, 1); else list.push(trait);
      this.devToast(`${t.toUpperCase()} SOUL: ${list.join(', ') || 'NO TRAITS'}`);
      return;
    }
    if (id.startsWith('enemy-flag=')) {
      const path = id.slice('enemy-flag='.length).split('.');
      let obj = TUNING;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      const key = path[path.length - 1];
      const value = !obj[key];
      obj[key] = value;
      this.persistTuningEdit({ root: 'TUNING', path, value });
      return;
    }
    // The LEVEL tab's HINT / THEME / DECOR lines: free text on a LEVELS entry, found by `name`
    // since a level carries no `id` of its own. Clearing the prompt writes `null` back rather than
    // an empty string, which is how `hint` already spells "nothing painted here".
    if (id.startsWith('level-edit=')) {
      const rest = id.slice('level-edit='.length);
      const dot = rest.lastIndexOf('.');
      const name = rest.slice(0, dot), field = rest.slice(dot + 1);
      const lv = LEVELS.find((l) => l.name === name);
      if (!lv) return;
      const raw = window.prompt(`${lv.name}, ${field.toUpperCase()}`, lv[field] || '');
      if (raw === null) return;
      const value = raw.trim() === '' ? null : raw.trim();
      lv[field] = value;
      this.persistTuningEdit({ root: 'LEVELS', id: lv.name, path: [field], value });
      return;
    }
    // The ANIMALS tab: an animal's bargain as if kept (`+ BONUS`) or one taken back (`TAKE`).
    if (id.startsWith('beast-give=') || id.startsWith('beast-take=')) { this.devBeast(id.slice(11), id.startsWith('beast-give=')); return; }
    if (id === 'room-close') { this.dev.room = null; return; }
    // Opening one room: reachable from the level page and from a bar on the curve. Both of them
    // draw the same sample of the same level, so a room is a level index and a room index and the
    // page does not care which half of the tool asked for it.
    if (id.startsWith('room=')) {
      const [li, idx] = id.slice(5).split(',').map(Number);
      this.dev.room = { li, index: idx };
      return;
    }
    if (id === 'bal-seeds') {
      const steps = [4, 8, 16, 30];
      this.dev.balanceSeeds = steps[(steps.indexOf(this.dev.balanceSeeds) + 1) % steps.length];
      this.dev.balance = null; return;
    }
    if (this.state !== 'play' || !this.world) return;
    if (id === 'heal') { this.goat.hp = this.goat.maxHp; this.devToast('HEALED'); return; }
    if (id === 'soul') { this.dropSoul(this.goat.x + 28, this.goat.y); this.devToast('SOUL DROPPED'); return; }
    // The ENEMIES tab's SPAWN under a kind: that man, with a soul in him when the row's SOUL is on.
    if (id.startsWith('enemy-spawn=')) {
      const tag = id.slice(12), e = this.spawnEnemy(tag === 'champion' || tag === 'boss' || tag === 'shield' || tag === 'thrower' ? 'bearer' : tag);
      if (!e) return;
      if (tag === 'champion') { e.champion = true; e.hp = e.maxHp = TUNING.champion.hp; }
      if (tag === 'shield') e.giveShield();
      if (tag === 'thrower') Thrower.give(e);
      if (tag === 'boss') { e.boss = true; e.elite = true; e.hp = e.maxHp = e.hp + TUNING.boss.champHp; }
      if (this.dev.soulView && this.dev.soulView[tag]) { this.ensoul(e); this.devToast('+ ' + tag.toUpperCase() + ' WITH A SOUL'); }
      return;
    }
    if (id === 'mouse') { this.spawnShop(); return; }
    // The escorts and the hen's coop, dropped at his feet: the generator puts exactly one a floor
    // in the first third of it, which is no way to look at one twice while tuning it.
    if (id === 'coop' || Beast.is(id)) {
      // Spawned again it says its terms again: the box is how its bargain is tried (`Beast.met`).
      if (this.beastTold) delete this.beastTold[id];
      const s = this.freeSpot(this.goat.x + 40, this.goat.y);
      this.props.push(new Prop(s.x, s.y, id));
      this.particles(s.x, s.y, 8, PALETTE.hen, 130);
      this.devToast('+ ' + id.toUpperCase());
      return;
    }
    if (id === 'artifact') { this.devArtifact(); return; }
    if (id === 'next') { this.levelCleared(); return; }
    if (id === 'restart') { this.restartLevel(); return; }
    if (id === 'clear') {
      let n = 0;
      for (const e of this.enemies) {
        if (e.dead || hyp(e.x - this.goat.x, e.y - this.goat.y) > 14 * TILE) continue;
        e.die(this, 'splat', 0, 0, 'dev'); n++;
      }
      this.devToast(`CLEARED ${n}`); return;
    }
    this.spawnEnemy(id);
  }
  spawnEnemy(kind) {
    const w = this.world, g = this.goat;
    for (let k = 0; k < 60; k++) {
      const a = Math.random() * Math.PI * 2, r = (3 + Math.random() * 3) * TILE;
      const x = g.x + Math.cos(a) * r, y = g.y + Math.sin(a) * r;
      if (w.tileAtPx(x, y) === T.WALL || w.flowDist(x, y) < 0) continue;
      const e = new Enemy(x, y, kind);
      e.aware = true; e.state = 'chase';
      this.enemies.push(e);
      this.particles(x, y, 10, PALETTE.cult, 160);
      this.devToast('+ ' + kind.toUpperCase());
      return e;
    }
    this.devToast('NO ROOM');
    return null;
  }
  // The dev drawer's own shop: a mouse and two wares dropped near the goat rather than dug
  // into a wall, so the buy/provoke/ogre loop can be poked at without walking to wherever the level
  // put the real one. `stockFor` is gen.js's own, the same roll a level makes,
  // against the level actually in play. A negative `shopId` never collides with a generated one.
  spawnShop() {
    const g = this.goat;
    const base = this.freeSpot(g.x + 60, g.y);
    const left = this.freeSpot(base.x - 32, base.y);
    const right = this.freeSpot(base.x + 32, base.y);
    const shopId = -1 - ((Math.random() * 1e6) | 0);
    const def = this.level ? this.level.def : LEVELS[Math.max(TUNING.shop.levels[0], this.levelIndex || 0)];
    const stock = stockFor(def, new RNG((Math.random() * 1e9) | 0));
    this.props.push(new Prop(base.x, base.y, 'mouse', { shopId, gap: { x: base.x, y: base.y - 18 }, wallSide: 'up' }));
    this.props.push(new Prop(left.x, left.y, 'ware', { shopId, ware: stock[0] }));
    this.props.push(new Prop(right.x, right.y, 'ware', { shopId, ware: stock[1] }));
    this.particles(base.x, base.y, 10, PALETTE.ash, 140);
    this.devToast('+ MOUSE');
  }
  // The dev drawer's own artifact picker: a prompt naming every id, then a prompt for its tier,
  // and it hangs at his neck at once, no shelf, no price, the same door the BOONS tab already
  // opens for a card.
  devArtifact() {
    const raw = window.prompt(`ARTIFACT, ${ARTIFACTS.map((a) => a.id).join(' / ')}`, this.artifact ? this.artifact.id : ARTIFACTS[0].id);
    if (raw === null) return;
    const def = ARTIFACTS.find((a) => a.id === raw.trim().toLowerCase());
    if (!def) { this.devToast('NO SUCH ARTIFACT'); return; }
    const tierRaw = window.prompt('TIER (1-4)', String(this.artifact && this.artifact.id === def.id ? this.artifact.tier : 1));
    if (tierRaw === null) return;
    const tier = Math.max(1, Math.min(def.tiers.length, Number(tierRaw) | 0 || 1));
    this.artifact = { id: def.id, tier };
    this.applyBoons(); this.saveRun();
    this.devToast(`${def.name} ${'I'.repeat(tier)}`);
  }

  // What the RULES page is looking at: the level in play, as it stands, or a sample of any other
  // level generated for the page from `dev.sampleSeed` and kept until the page or the seed changes.
  // A sample costs a few milliseconds and is what lets every level's rules be checked without
  // playing up to it.
  rulesPage() {
    const d = this.dev, i = clamp(d.page, 0, LEVELS.length - 1), def = LEVELS[i];
    if (this.level && this.levelIndex === i) return { index: i, def, level: this.level, live: true, seed: this.level.seed };
    return { index: i, def, level: this.levelSample(i), live: false, seed: d.sampleSeed };
  }

  // One generated level per level index, off `dev.sampleSeed`, kept until the seed changes. It is
  // what every part of the tool looks at when it is not looking at the level in play, so a room
  // opened from the curve is the same room the level page was showing.
  levelSample(li) {
    const d = this.dev;
    if (this.level && this.levelIndex === li) return this.level;
    const key = li + ':' + d.sampleSeed;
    if (!d.samples[key]) d.samples[key] = generateLevel(LEVELS[li], d.sampleSeed >>> 0);
    return d.samples[key];
  }

  // Every rule against every level, one sample each: the rules tab is the whole list at once rather
  // than one level's answer to it, because a rule that holds on six levels and not on the seventh is
  // a thing you want to see as a row.
  ruleMatrix() {
    const d = this.dev;
    if (d.matrix && d.matrix.seed === d.sampleSeed) return d.matrix;
    const per = LEVELS.map((def, li) => checkRules(this.levelSample(li)));
    const rows = GEN_RULES.map((rule, ri) => ({ rule, cells: per.map((r) => r[ri]) }));
    d.matrix = { seed: d.sampleSeed, rows };
    return d.matrix;
  }

  // The balance half of the tool: what `node tools/balance.js` prints, computed in the page so the
  // curve can be looked at without leaving the game. Every level is walked over `dev.balanceSeeds`
  // seeds and reduced to the same three numbers the report uses, the threat of each room averaged,
  // the level's total, and the worst ORDINARY room, which is the one that says how hard a level
  // really is (a Great Hall is a set piece, not a baseline). Every rule in `js/rules.js` is run on
  // every seed on the way past, so the page fails the same way the report does.
  // It is cached on `dev.balance` because it is a few dozen level generations and the page is still.
  balanceReport() {
    const seeds = this.dev.balanceSeeds;
    if (this.dev.balance && this.dev.balance.seeds === seeds && this.dev.balance.seed === this.dev.sampleSeed) return this.dev.balance;
    const ordinary = new Set(['canon', 'mix', 'trap']);
    const fails = [], seen = new Set();
    const levels = LEVELS.map((def, li) => {
      const runs = [];
      let gEarly = 0, gLate = 0, gSeeds = 0;
      for (let s = 1; s <= seeds; s++) {
        const L = generateLevel(def, s * 7717);
        runs.push(roomsOf(L));
        // The floor's own curve, seed by seed and over the rooms the DRAW chose: a set piece, the
        // teaching rooms and a trap room are forced or dealt from a pool of their own, so none of
        // them is the generator keeping this promise.
        const drawn = runs[runs.length - 1].filter((r) => ordinary.has(r.role) && r.drawn);
        if (drawn.length >= 4) {
          const t = Math.floor(drawn.length / 3) || 1;
          gEarly += drawn.slice(0, t).reduce((a, r) => a + r.ground, 0) / t;
          gLate += drawn.slice(-t).reduce((a, r) => a + r.ground, 0) / t;
          gSeeds++;
        }
        for (const r of checkRules(L)) {
          // `ground` joins `rises` as a rule no single seed can answer, the draw picks at random
          // inside a window of the pool, so both are judged on the average, below and in the report.
          if (r.ok !== false || r.rule.id === 'rises' || r.rule.id === 'ground') continue;
          const msg = `${def.name}: ${r.rule.id}, ${r.why}`;
          if (!seen.has(msg)) { seen.add(msg); fails.push(msg); }
        }
      }
      const width = Math.max(...runs.map((r) => r.length));
      const rooms = [];
      for (let i = 0; i < width; i++) {
        const cells = runs.map((r) => r[i]).filter(Boolean);
        rooms.push({ index: i, role: cells[0].role,
          threat: cells.reduce((a, c) => a + c.threat, 0) / cells.length,
          men: cells.reduce((a, c) => a + c.men.length, 0) / cells.length,
          // The floor's own half of the curve, and the two together. A bar is drawn as threat with
          // the ground riding on top of it, so the axis the level walks is visible beside the crowd.
          ground: cells.reduce((a, c) => a + c.ground, 0) / cells.length,
          pressure: cells.reduce((a, c) => a + c.pressure, 0) / cells.length });
      }
      const plain = rooms.filter((c) => ordinary.has(c.role));
      // The numbers are averaged over the seeds; the geometry is one sample, the same one the level
      // page and the room sheet use, so a bar on the curve is a room you can open and walk through.
      const sample = roomsOf(this.levelSample(li));
      rooms.forEach((r, i) => { r.sample = sample[i] || null; });
      const ground = gSeeds ? { early: gEarly / gSeeds, late: gLate / gSeeds } : null;
      if (ground && ground.late <= ground.early) {
        fails.push(`${def.name}: the floor does not open up (${ground.early.toFixed(2)} → ${ground.late.toFixed(2)})`);
      }
      return { def, li, rooms, sample, ground,
        total: rooms.reduce((a, c) => a + c.threat, 0),
        peak: Math.max(0, ...rooms.map((c) => c.threat)),
        plainPeak: Math.max(0, ...plain.map((c) => c.threat)) };
    });
    // The two rules a single level cannot be held to on its own, which is why the report exists.
    for (let i = 1; i < levels.length; i++) {
      const a = levels[i - 1], b = levels[i];
      if (b.total <= a.total) fails.push(`${b.def.name} (${b.total.toFixed(0)}) is not harder than ${a.def.name} (${a.total.toFixed(0)})`);
      if (b.plainPeak < a.plainPeak) fails.push(`${b.def.name}'s worst ordinary room is easier than ${a.def.name}'s`);
    }
    this.dev.balance = { seeds, seed: this.dev.sampleSeed, levels, fails,
      max: Math.max(...levels.map((l) => l.total)) };
    return this.dev.balance;
  }

  layoutTouch() { this.touch.layout(this.renderer.w, this.renderer.h, this.renderer.s, this.renderer.vh); }

  // ---------- input ----------
  canvasPos(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * this.canvas.width / r.width, y: (e.clientY - r.top) * this.canvas.height / r.height };
  }

  // What a key does, whoever pressed it: the keyboard, or a pad button standing in for one on a screen
  // the keys already walk (`pollPad`: the menus, the pause, the mirror, Escape, Backspace). `e` is the
  // key event when there is one, so its default can be stopped.
  keyPress(code, e) {
    const stop = () => { if (e) e.preventDefault(); };
    // anyPressed skips the opening scene; muting should not
    if (code !== 'KeyM') this.input.anyPressed = true;
    // A row of SETTINGS → CONTROLS listening for its new button takes the very next key, whatever it is.
    if (KeyBind.listen(this, code)) { stop(); return; }
    // In play and heaven the verbs are wherever the player put them (`KeyBind`); everywhere else (the
    // cards, the menus) Space is still the key that goes on.
    const verbs = (this.state === 'play' || this.state === 'heaven') && !(this.heaven && this.heaven.panel);
    if (code === 'Space') { if (!verbs) this.input.spacePressed = true; stop(); }
    // Her offer up (js/codex.js) takes the keys: a card, the arrows, looking away.
    if (this.state === 'play' && this.shopDlg && Codex.shopKey(this, code)) { stop(); this.wakeAudio(); return; }
    // I: the book of what he carries (js/codex.js), a page like the pause and no verb (pillar 1).
    if (code === 'KeyI') {
      if (this.state === 'paused' && this.menu.panel === 'book') { Codex.close(this); stop(); return; }
      if (Codex.open(this)) { stop(); return; }
    }
    // The mirror, open, takes its own keys (js/heaven.js): its rows, a buy, looking away.
    if (this.state === 'heaven' && this.heaven && this.heaven.panel && Heaven.panelKey(this, code)) { stop(); this.wakeAudio(); return; }
    // Backspace up in heaven is the jump, at once: a death is still a restart under a second away.
    // A page open over the pause (the book, SETTINGS) takes Backspace as "close" in `menuKey`; here it restarted the floor.
    if (code === 'Backspace' && !(this.state === 'paused' && this.menu.panel)) { stop(); if ((this.state === 'heaven' || (this.state === 'paused' && this.pauseFrom === 'heaven')) && this.heaven) Heaven.leave(this); else this.restartLevel(); }
    // Escape out of actual play pauses in place rather than dropping to the title, the room
    // stays exactly as it is and RESUME is the only way this function runs again. Escape out of
    // the pause overlay's own settings panel backs out one step, the way it always has from the
    // title; out of the bare pause overlay it resumes. Everywhere else it still goes to the
    // title, since those screens (dead, win, a boon) are not a thing "resume" means anything for.
    // Fully self-contained: the state === 'paused' dispatch below skips Escape on purpose so the
    // same keypress cannot pause and immediately unpause itself in one event.
    if (code === 'Escape' && !this.dev.rules) {
      stop();
      if (this.state === 'play' || this.state === 'heaven') { this.pauseFrom = this.state; this.state = 'paused'; this.pause.index = 0; this.menu.panel = null; this.audio.sfxCard(); }
      else if (this.state === 'paused') {
        if (this.menu.panel === 'book') Codex.close(this);
        else if (this.menu.panel === 'controls') KeyBind.close(this);
        else if (this.menu.panel) { this.menu.panel = null; this.audio.sfxSwing(); }
        else { this.state = this.pausedIn(); this.audio.sfxSwing(); }
      }
      // Not off the clear card or the climb: the run is only saved at the head of the next level,
      // so leaving there went back to the head of the one just won.
      // Nor off a boon card: an Escape meant as a pause in the frame a boss fell landed here and
      // threw the floor away as a death, soul and all.
      else if (this.state !== 'title' && this.state !== 'clear' && this.state !== 'climb' && this.state !== 'boon') this.quitToTitle();
    }
    // The SOUND switch itself, so the settings row says what M did and the mute is kept.
    if (code === 'KeyM') this.toggleSetting('sound');
    Photo.onKey(this, code);
    if (code === 'KeyN' && this.state === 'play' && this.dev.open) this.levelCleared();
    if (verbs) KeyBind.press(this, code);
    else if (code === 'KeyE') this.input.rollPressed = true;
    // KEYBOARD ONLY (SETTINGS `keysOnly`): J is the left button, L the roll, K the grab (held, read in
    // `readMoveInput`); only in play and heaven, so J on a card never lands on a button under a resting pointer.
    // Z X C are the same three beside the arrows (3 Oct 2026, "if a man has only a keyboard"). Pressed
    // with the setting off they take the aim anyway (`kbLive`), as a pad's stick does: nobody has to find
    // KEYBOARD ONLY in SETTINGS to play without a mouse. A mouse that clicks or really moves takes it back.
    const kbVerb = { KeyJ: 'butt', KeyZ: 'butt', KeyK: 'grab', KeyX: 'grab', KeyL: 'roll', KeyC: 'roll' }[code];
    if (kbVerb && (this.state === 'play' || this.state === 'heaven') && !KeyBind.acts(code).length) {
      if (!this.settings.keysOnly && !this.kbLive) { this.kbLive = true; this.kbAim = { x: this.input.aim.x, y: this.input.aim.y }; }
      this.kbMouse = 0;
      kbUse(code === 'KeyZ' || code === 'KeyX' || code === 'KeyC' ? 'zxc' : 'jkl');
      if (kbVerb === 'butt') this.input.lmbPressed = true;
      if (kbVerb === 'roll') this.input.rollPressed = true;
      if (kbVerb === 'grab') this.input.rmbPressed = true;
    }
    // A fifth key that does nothing until the shop puts something on it: Q throws the boomerang
    // or steps through STRANGE SYMBOLS, whichever is at his neck.
    if (code === 'KeyQ' && !verbs) this.input.qPressed = true;
    if (this.state === 'boon') {
      if (code === 'Digit1') this.takeBoon(0); if (code === 'Digit2') this.takeBoon(1); if (code === 'Digit3') this.takeBoon(2);
      if (code === 'Digit4') this.skipBoon();
    }
    if (this.state === 'title' && code !== 'KeyM') this.menuKey(code);
    else if (this.state === 'paused' && code !== 'Escape' && code !== 'KeyM') { if (this.menu.panel) this.menuKey(code); else this.pauseKey(code); }
    this.wakeAudio();
  }
  wakeAudio() { this.audio.init(); this.audio.resume(); }

  // ---------- the pad ----------
  // Once a frame, before the steps. The pad sets the very flags the mouse and keys set, so every
  // system downstream (the goat, heaven, THE TRIP's swap, the cards) reads it without knowing it is
  // there. On a screen the keys walk, a button is handed to `keyPress` as the key it stands for.
  pollPad(dt) {
    const P = this.pad;
    if (!P.poll(dt)) { if (P.active) { P.active = false; } return; }
    if (P.touched && !P.active) { P.active = true; this.touch.active = false; this.touch.clear(); }
    if (!P.active || this.dev.rules) return;
    const B = PAD_BTN, inp = this.input, st = this.state;
    if (P.any()) { inp.anyPressed = true; this.wakeAudio(); }
    // A screen the keys walk as a list: the title and its panels, the pause, the mirror up in heaven.
    const mirror = st === 'heaven' && this.heaven && this.heaven.panel;
    const arrows = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
    if (st === 'title' || st === 'paused' || mirror) {
      if (P.step) this.keyPress(arrows[P.step]);
      if (P.pressed(B.a)) this.keyPress('Enter');
      // B backs out: a panel shut, the pause resumed, the mirror looked away from.
      if (P.pressed(B.b)) this.keyPress('Escape');
      // START is the pause's own button both ways; on the title it picks, the way Enter does.
      if (P.pressed(B.start)) this.keyPress(st === 'title' ? 'Enter' : 'Escape');
      if (P.pressed(B.back) && st === 'paused') this.keyPress('Backspace');
      return;
    }
    // The cards and the one after them (release): the stick walks them (`boonPad`, drawn lit), A takes one.
    if (st === 'boon') {
      const n = this.boonChoice ? this.boonChoice.length : 0;
      if (P.step) this.boonPadMoved = true;
      if (P.step === 'left' || P.step === 'up') { this.boonPad = (this.boonPad + n) % (n + 1); this.audio.sfxSwing(); }
      if (P.step === 'right' || P.step === 'down') { this.boonPad = (this.boonPad + 1) % (n + 1); this.audio.sfxSwing(); }
      if (P.pressed(B.a)) { if (this.boonPad >= n) this.skipBoon(); else this.takeBoon(this.boonPad); }
      return;
    }
    // Play, and walking about up in heaven: the verbs, on the flags the mouse and keys use.
    const walking = st === 'play' || st === 'heaven';
    if (walking) {
      if (P.buttPressed()) inp.lmbPressed = true;
      if (P.grabPressed()) { inp.rmbDown = true; inp.rmbPressed = true; }
      if (P.pressed(B.a)) inp.rollPressed = true;
      if (P.pressed(B.b)) inp.spacePressed = true;
      if (P.pressed(B.y)) inp.qPressed = true;
      // The mage's scene says PRESS A TO SKIP; A is otherwise the roll, which it does not read.
      if (P.pressed(B.a) && this.bless && this.bless.on) inp.spacePressed = true;
      if (P.pressed(B.start)) this.keyPress('Escape');
      if (P.pressed(B.back)) this.keyPress('Backspace');
      return;
    }
    // Every other card (the death card's ASCEND, the clear card, the win) goes on with A or START,
    // as Space does. BACK on the death card is Backspace's restart.
    if (P.pressed(B.a) || P.pressed(B.start)) inp.spacePressed = true;
    if (P.pressed(B.back) && st === 'dead') this.keyPress('Backspace');
  }
  // What the floor's words and the prompts call a press, for whatever is in his hands.
  get tapWord() { return this.pad && this.pad.active ? 'PRESS A' : this.coarse ? 'TAP' : 'CLICK'; }
  // `game.vibe` asks for a buzz of `ms`: a phone's motor, or the pad's.
  vibe(ms) {
    if (this.pad && this.pad.active) { this.pad.rumble(ms); return; }
    if (this.coarse && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } }
  }

  bindInput() {
    const c = this.canvas;
    // TEXT EDIT's click goes first, so a click on a text it holds never reaches the game (js/text-edit.js).
    TextEdit.hook(this);
    // Every press on the canvas takes the keyboard back to this page. On itch the game is a frame in
    // their page: a click outside it (their fullscreen button, the scrollbar) or an alt-tab left the
    // focus out there, the mouse still played and every key went to their page, so the goat stood
    // still until a reload. Two testers hit it (3 Oct 2026). The canvas holds focus itself (tabIndex).
    c.tabIndex = 0; c.style.outline = 'none';
    const takeKeys = () => { try { if (document.activeElement !== c) c.focus({ preventScroll: true }); window.focus(); } catch (err) { /* not fatal */ } };
    takeKeys();
    const wake = () => { takeKeys(); this.audio.init(); this.audio.resume(); };

    window.addEventListener('keydown', (e) => {
      // Before the repeat check: a held arrow or Space repeats, and every repeat scrolled the page
      // under the game (the itch frame) until this was the first thing done with it.
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      // ALT is the STEALTH test's sneak: on its own it takes the page's focus to the browser's menu.
      // Held with a key it is worse: Alt+D is the address bar, Alt+E the browser's menu, so sneaking
      // while moving threw the focus out of the game. With the test on, no Alt chord reaches the browser.
      if ((e.altKey || e.code === 'AltLeft' || e.code === 'AltRight') && this.dev && this.dev.stealth) e.preventDefault();
      if (e.repeat) return;
      // The RULES page has no keys: Backspace under it would regenerate the level it is describing.
      if (this.dev.rules) { e.preventDefault(); return; }
      this.keys.add(e.code);
      // STEALTH (dev test): ALT is a switch, a press on and a press off (5 Oct 2026 playtest: "not hold").
      if ((e.code === 'AltLeft' || e.code === 'AltRight') && this.dev.stealth) this.toggleSneak();
      // Only a key that plays the game hands it to the keyboard. A phone's volume rocker is a keydown
      // too, and it used to put the touch controls away for good a few seconds into the first level,
      // whenever somebody turned the sound down. A real key takes the controls off a pad the same way.
      // What the key prints, for the words that quote it (`keyFaceSet`): a shifted mark is not the key's face.
      if (!e.altKey && !e.ctrlKey && !e.metaKey && !(e.shiftKey && !/^[a-z]$/i.test(e.key))) keyFaceSet(e.code, e.key);
      if (KEYBOARD_KEY.test(e.code)) {
        this.touch.active = false;
        // A trigger held as the keyboard took over must not leave the grab clamped shut.
        if (this.pad.active) { this.pad.active = false; this.input.rmbDown = false; }
      }
      this.keyPress(e.code, e);
    });
    window.addEventListener('keyup', (e) => { if ((e.code === 'AltLeft' || e.code === 'AltRight') && this.dev && this.dev.stealth) e.preventDefault(); this.keys.delete(e.code); });

    // What a pointer is, for the controls: on a device whose main pointer is a finger, all of them are
    // fingers. Some phone browsers and in-app views report a tap as a `mouse` pointer, and a single
    // one of those used to switch the whole game to mouse mode and take the thumb controls away.
    const isMouse = (e) => e.pointerType === 'mouse' && !this.coarse;
    c.addEventListener('pointerdown', (e) => {
      wake(); e.preventDefault();
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      this.pad.active = false;   // a click or a finger takes the controls back off the pad
      const p = this.canvasPos(e);
      // Every mouse press is counted, whatever screen it lands on: the click on RESUME came back as
      // a fresh left button on the next move in play, and headbutted.
      if (isMouse(e)) this.mouseButtons = e.buttons;
      if (this.hitDev(p)) return;
      // A row of SETTINGS → CONTROLS listening: this button is its new one (the click that opened it was the last).
      if (isMouse(e) && KeyBind.listen(this, 'Mouse' + e.button)) return;
      if (this.state === 'clear') this.input.mouse = p;   // a finger on SAVE is where the press was, too
      if (this.state === 'title') {
        this.touch.active = !isMouse(e); this.input.mouse = p;
        // A finger's press is not a gesture a browser opens a tab for (only its lift is), so on a
        // phone the Discord row did nothing at all: it is taken on the lift instead, below.
        if (e.pointerType !== 'mouse' && !this.menu.panel && this.menuItems()[this.menuAt(p)] === 'discord') { this.discordPointer = e.pointerId; return; }
        this.menuPanelClick(p);
        return;
      }
      if (this.state === 'paused') {
        this.touch.active = !isMouse(e); this.input.mouse = p;
        if (this.menu.panel) this.menuPanelClick(p);
        else { const i = this.pauseAt(p); if (i >= 0) this.pausePick(i); }
        return;
      }
      if (this.state === 'boon') {
        if (!isMouse(e)) this.touch.active = true;
        // YOUR BUILD under the cards opens the book over them (`Codex.open`; I does the same).
        const bb = this.boonBookRect;
        if (bb && this.boonDown < 0 && p.x >= bb.x && p.x <= bb.x + bb.w && p.y >= bb.y && p.y <= bb.y + bb.h) { Codex.open(this); return; }
        if (this.boonDown >= 0 && e.pointerId !== this.boonPointer) return;   // one card pressed at a time
        this.boonDown = this.boonArm > 0 ? -1 : this.boonAt(p); this.boonPointer = e.pointerId;
        return;
      }
      // The mirror, open (js/heaven.js): a row is a buy, the right button looks away.
      if (this.state === 'heaven' && this.heaven && this.heaven.panel) {
        this.touch.active = !isMouse(e); this.input.mouse = p;
        Heaven.panelClick(this, p, isMouse(e) && e.button === 2); return;
      }
      if (isMouse(e)) {
        this.touch.active = false; this.input.anyPressed = true; this.input.mouse = p;
        this.kbLive = false;   // a click is the mouse taking the aim back off the keys
        // Whatever the player put on this button (SETTINGS → CONTROLS; left headbutts, right grabs by default).
        KeyBind.press(this, 'Mouse' + e.button);
        this.mouseButtons = e.buttons;
        return;
      }
      this.touch.active = true; this.input.anyPressed = true;
      // The mage's scene at the first gate says TAP TO SKIP and runs in `play`: a tap is the skip,
      // not a thumb on the stick that walks him off the moment it ends.
      // The pause chip is still drawn over it, and is still the pause: it used to be a skip tap.
      const pr = this.touch.pauseRect, onPause = pr && p.x >= pr.x && p.x <= pr.x + pr.w && p.y >= pr.y && p.y <= pr.y + pr.h;
      if (this.state === 'play' && this.bless && this.bless.on && !onPause) { this.input.lmbPressed = true; return; }
      // the point too: the last page is answered by a tap on BAAAH! or bah, tested against `input.mouse`
      if (this.state === 'play' && this.beastTalk && !onPause) { this.input.mouse = p; this.input.lmbPressed = true; return; }
      // Her offer (js/codex.js): a tap is on a card or on NOT NOW.
      if (this.state === 'play' && this.shopDlg && !onPause) { this.input.mouse = p; this.input.lmbPressed = true; return; }
      // Up in heaven the thumbs play as below, but a tap turns the god's page.
      const walking = this.state === 'play' || (this.state === 'heaven' && this.heaven && !this.heaven.talk);
      if (!walking) {
        this.input.lmbPressed = true;
        if (this.state === 'dead') this.input.mouse = p;   // the death card has two buttons: which one was tapped

        // A thumb put down under the level card, the climb or the scene is on the stick when play
        // starts; before, the goat stood still until it was lifted and put down again.
        if (this.state === 'card' || this.state === 'climb' || this.state === 'intro') this.touch.down(e.pointerId, p.x, p.y, this);
        return;
      }
      if (onPause) {
        this.pauseFrom = this.state; this.state = 'paused'; this.pause.index = 0; this.menu.panel = null; this.audio.sfxCard(); return;
      }
      this.touch.down(e.pointerId, p.x, p.y, this);
    }, { passive: false });

    c.addEventListener('pointermove', (e) => {
      const p = this.canvasPos(e);
      if (this.dev.slide) { this.devSlide(this.dev.slide, p.x); return; }   // a dev slider held
      if (isMouse(e)) {
        this.input.mouse = p; if (this.touch.active) this.touch.active = false;
        // Only a mouse that really moved takes the aim back from a pad: a browser also sends a
        // move when the page shifts under a resting cursor.
        if (this.pad.active && (e.movementX || e.movementY)) { this.pad.active = false; this.input.rmbDown = false; }
        // The keys' aim (`kbLive`) is let go only after a real stretch of mouse travel: a palm on a
        // laptop's touchpad is not a player reaching for the mouse. One stretch: travel is counted only
        // inside a burst of moves (`mouseGap` s between them), or a palm's twitches added up over a
        // whole fight and let go of the aim in the middle of it.
        const nowM = performance.now();
        if (nowM - (this.kbMouseAt || 0) > TUNING.kbAim.mouseGap * 1000) this.kbMouse = 0;
        this.kbMouseAt = nowM;
        if (this.kbLive && (this.kbMouse = (this.kbMouse || 0) + Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0)) > TUNING.kbAim.mouseBack) this.kbLive = false;
        // A second button pressed while the first is still down is not a pointerdown, the browser
        // reports it as a move with a changed `buttons`. Holding grab and clicking to throw is exactly
        // that chord, and it used to be swallowed whole; so did letting go of grab while the other
        // button was held, which left him clamped onto whatever he had.
        const was = this.mouseButtons || 0, now = e.buttons;
        if (now !== was && (this.state === 'play' || this.state === 'heaven')) {
          for (let b = 0; b < 5; b++) { const bit = KeyBind.mouseBit(b); if ((now & bit) && !(was & bit)) KeyBind.press(this, 'Mouse' + b); }
        }
        this.mouseButtons = now; this.mouseMoved = true;
        if (this.state === 'play' || this.state === 'heaven') this.input.rmbDown = KeyBind.held(this, 'grab') || (kbOn(this) && (this.keys.has('KeyK') || this.keys.has('KeyX')));
        if ((this.state === 'title' || this.state === 'paused') && this.menu.sliderDrag != null) this.setSliderAt(this.menu.sliderDrag, p.x);
        return;
      }
      e.preventDefault(); this.touch.move(e.pointerId, p.x, p.y);
      // A finger drags a volume slider too: only the mouse branch ever read `sliderDrag`.
      if ((this.state === 'title' || this.state === 'paused') && this.menu.sliderDrag != null) this.setSliderAt(this.menu.sliderDrag, p.x);
    }, { passive: false });

    const up = (e) => {
      this.menu.sliderDrag = null; this.dev.slide = null;
      if (this.discordPointer === e.pointerId) {
        this.discordPointer = undefined;
        if (e.type === 'pointerup' && this.state === 'title' && !this.menu.panel && this.menuItems()[this.menuAt(this.canvasPos(e))] === 'discord') this.menuPick(this.menuAt(this.canvasPos(e)));
      }
      if (e.pointerType === 'mouse') { this.mouseButtons = e.buttons; if (KeyBind.code('grab') === 'Mouse' + e.button) this.input.rmbDown = false; }
      // A card is taken here and nowhere else: the pointer has to leave the same card it arrived on.
      if (this.state === 'boon') {
        // A finger lifted while the card is up is still let go of: the card always opens under a thumb
        // on the stick, and kept, that dead finger ran the goat on in its direction after the pick.
        if (!isMouse(e)) this.touch.up(e.pointerId);
        // And only the pointer that pressed a card can take it: another finger lifting is not a pick.
        if (this.boonPointer !== undefined && e.pointerId !== this.boonPointer) return;
        const i = this.boonDown; this.boonDown = -1;
        if (i >= 0 && this.boonAt(this.canvasPos(e)) === i) {
          if (this.boonChoice && i === this.boonChoice.length) this.skipBoon();
          else this.takeBoon(i);
        }
        return;
      }
      if (isMouse(e)) return;
      this.touch.up(e.pointerId);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    // Only the finger that pressed a card lets it go: a thumb lifted off the stick first threw away
    // the pick another finger was making.
    window.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') { this.mouseButtons = e.buttons; if (KeyBind.code('grab') === 'Mouse' + e.button) this.input.rmbDown = false; } if (e.pointerId === this.boonPointer) this.boonDown = -1; this.menu.sliderDrag = null;
      // the mirror's rows are bought by holding (js/heaven.js `updatePanel`): a lifted pointer lets go
      if (this.state === 'heaven' && this.heaven && this.heaven.panel) Heaven.panelRelease(this); });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    // A mouse's side buttons (a verb may sit on them, SETTINGS → CONTROLS) are the browser's back and forward.
    c.addEventListener('mouseup', (e) => { if (e.button === 3 || e.button === 4) e.preventDefault(); });
    // The dev tool's pages scroll on the wheel (`Renderer.drawTool` clamps and draws it).
    c.addEventListener('wheel', (e) => {
      if (this.state === 'paused' && this.menu.panel === 'photos') { e.preventDefault(); Photo.wheel(this, e.deltaY); return; }
      const d = this.dev; if (!d.rules || d.room) return;
      e.preventDefault();
      const px = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? this.renderer.h : 1;
      const k = c.width / Math.max(1, c.clientWidth);
      d.scroll = d.scroll || {};
      d.scroll[d.tab] = clamp((d.scroll[d.tab] || 0) + e.deltaY * px * k, 0, d.scrollMax || 0);
    }, { passive: false });
    // Losing the window mid-fight pauses it, the way Escape does: alt-tab or a phone call used to
    // leave the goat standing in the room on the fallback clock. `autoPause` is off for the bots.
    // Lost during a level card or the opening scene, it is remembered (`awayNow`) and the fight
    // starts paused instead (`cardDone`): it used to start on the fallback clock with nobody there.
    const away = () => { this.awayNow = true; if (this.autoPause !== false && this.state === 'play') { this.state = 'paused'; this.pause.index = 0; this.menu.panel = null; } };
    window.addEventListener('blur', () => { this.keys.clear(); this.input.rmbDown = false; this.touch.clear(); away(); });
    window.addEventListener('focus', () => { this.awayNow = false; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) away(); else if (document.hasFocus()) this.awayNow = false; });
    // Rule 6: a reload or a closed tab mid-floor is a quit to the title, a death. Without it the save
    // kept the floor's death count and CONTINUE rebuilt the very layout he had just walked through.
    // Not a page only put aside in the back/forward cache (`persisted`): it comes back as it was.
    window.addEventListener('pagehide', (e) => {
      if (e.persisted || this.showroomOn) return;
      Stats.close(this, 'closed');
      // The stairs and the clear card are not a death: the floor is behind him (`saveAhead`).
      if (this.level && !this.level.def.heaven && ['play', 'paused', 'boon'].includes(this.state)) { this.deaths++; this.saveRun(); }
      else if (this.level && !this.level.def.heaven && ['climb', 'clear'].includes(this.state)) this.saveAhead();
    });
    window.addEventListener('resize', () => { this.renderer.resize(); this.layoutTouch(); });
    window.addEventListener('orientationchange', () => setTimeout(() => { this.renderer.resize(); this.layoutTouch(); }, 200));
  }

  // STEALTH (dev test, 5 Oct 2026): how long the sneak stays shut after a fight found him (`stealth.deny`
  // s after the last `breakSneak`); 0 when it is free. A timestamp, so a level's fresh clock frees it.
  sneakDenied() {
    const d = this.timer - (this.sneakDenyAt ?? -1e9);
    return d >= 0 && d < TUNING.stealth.deny ? TUNING.stealth.deny - d : 0;
  }
  toggleSneak() {
    if (this.state !== 'play' || !this.goat || this.goat.dead) return;
    // Shut while a fight is on him: the press is answered by the ring round his feet, not by a crouch.
    if (!this.sneakOn && this.sneakDenied() > 0) { this.sneakRefusedAt = this.timer; return; }
    this.sneakOn = !this.sneakOn;
  }
  // A fight found him (an aware man sees him, a heart lost): the sneak ends and is shut for `stealth.deny`
  // s, counted again from every such moment, so it opens only once the fight has let him go.
  breakSneak() {
    if (!this.dev.stealth) return;
    if (this.sneakOn && this.goat) this.floatText(this.goat.x, this.goat.y - 30, TUNING.stealth.spotted, PALETTE.blood);
    this.sneakOn = false; this.sneak = false; this.sneakDenyAt = this.timer;
  }

  readMoveInput() {
    const k = this.keys;
    // The four the player put the run on (SETTINGS → CONTROLS, WASD by default); the arrows always run.
    const H = (a) => KeyBind.held(this, a);
    let mx = (H('right') || k.has('ArrowRight') ? 1 : 0) - (H('left') || k.has('ArrowLeft') ? 1 : 0);
    let my = (H('down') || k.has('ArrowDown') ? 1 : 0) - (H('up') || k.has('ArrowUp') ? 1 : 0);
    const touching = this.touch.active, padding = this.pad.active;
    if (touching) { const mv = this.touch.moveVector(); if (mv.x || mv.y) { mx = mv.x; my = mv.y; } }
    if (padding) { const mv = this.pad.moveVector(); if (mv.x || mv.y) { mx = mv.x; my = mv.y; } }
    const l = hyp(mx, my); if (l > 1) { mx /= l; my /= l; }
    this.input.mx = mx; this.input.my = my;
    // STEALTH (dev test): ALT switches the sneak (`toggleSneak`), keys and mouse only for now (`TUNING.stealth`).
    if (!this.dev.stealth || !this.goat || this.goat.dead) this.sneakOn = false;
    this.sneak = !!(this.dev.stealth && this.sneakOn && !touching && !padding);
    if (!this.goat) return;

    if (padding) {
      // The right stick aims, with a light snap onto the man it is nearly pointed at. Let go of it
      // and the aim is the thumb's: where he runs (or where the stick was last), snapped the way
      // `autoAim` snaps a thumb. Every system that reads the aim reads `input.aim` (→ `goat.aim`):
      // the headbutt, the throw, the shield's cover, his head turned while he carries.
      const A = TUNING.pad.assist, manual = this.pad.aimVector();
      if (manual) { this.padAim = manual; this.input.aim = autoAim(this, manual.x, manual.y, A.cone, A.reach); }
      else {
        if (mx || my) { const d = hyp(mx, my); this.padAim = { x: mx / d, y: my / d }; }
        this.input.aim = autoAim(this, this.padAim.x, this.padAim.y);
      }
      // Grab is a held button, as the right mouse button is.
      this.input.rmbDown = this.pad.grabHeld();
      return;
    }

    if (touching) {
      // Thumb aiming: a manual drag wins, otherwise aim where you run, with a snap onto nearby men.
      const manual = this.touch.aimVector();
      if (manual) { this.touchAim = manual; this.input.aim = manual; }
      else {
        if (mx || my) { const d = hyp(mx, my); this.touchAim = { x: mx / d, y: my / d }; }
        this.input.aim = autoAim(this, this.touchAim.x, this.touchAim.y);
      }
      if (this.touch.consumeButt()) this.input.lmbPressed = true;
      if (this.touch.consumeScream()) this.input.spacePressed = true;
      if (this.touch.consumeRoll()) this.input.rollPressed = true;
      // The fifth button exists to be hit-tested only once something is at his neck to throw or
      // step through with it, before that it is not drawn and this flag keeps it from being felt.
      this.touch.itemReady = !!(this.mods.boomerang || this.mods.blink || this.mods.effigy);
      if (this.touch.consumeItem()) this.input.qPressed = true;
      this.input.rmbDown = this.touch.grabDown;
      return;
    }
    if (this.settings.keysOnly || this.kbLive) {
      // KEYBOARD ONLY: the run is the aim, as a thumb's is (`autoAim`'s snap onto the man nearly in
      // front), and standing still he keeps the last way he ran, snapped wider and nearer
      // (`TUNING.kbAim.still`): eight ways to run is no aim at a man a step off the diagonal.
      // K (or X) held is the grab, a right button too.
      if (mx || my) { const d = hyp(mx, my); this.kbAim = { x: mx / d, y: my / d }; }
      const a = this.kbAim || { x: 1, y: 0 }, KA = TUNING.kbAim;
      this.input.aim = mx || my ? autoAim(this, a.x, a.y, KA.cone, KA.reach) : autoAim(this, a.x, a.y, KA.still.cone, KA.still.reach);
      this.input.rmbDown = this.keys.has('KeyK') || this.keys.has('KeyX') || KeyBind.held(this, 'grab');
      return;
    }
    // Undo the tilt when turning the cursor back into a world point.
    const wx = this.cam.x + (this.input.mouse.x - this.renderer.vcx) / this.cam.zoom;
    const wy = this.cam.y + (this.input.mouse.y - this.renderer.vcy) / (this.cam.zoom * TILT);
    const dx = wx - this.goat.x, dy = wy - this.goat.y, d = hyp(dx, dy);
    if (d > 4) this.input.aim = { x: dx / d, y: dy / d };
    // Grab is held on whatever it was put on: a key let go is never a pointer event (SETTINGS → CONTROLS).
    if (KeyBind.code('grab') !== 'Mouse2') this.input.rmbDown = KeyBind.held(this, 'grab');
  }
  clearEdges() { this.input.rmbPressed = false; this.input.lmbPressed = false; this.input.spacePressed = false; this.input.rollPressed = false; this.input.qPressed = false; this.input.anyPressed = false; }

  // ---------- levels ----------
  // `withIntro` plays the opening scene in the pen instead of the level card. Only a run started
  // from the title gets it; a death drops you straight back in.
  // `cp` is the middle gate a death on this floor comes back to (`holdGate`, `enterAtGate`).
  startLevel(index, seed, keepBoons, withIntro, cp) {
    if (!keepBoons) { this.boons = []; this.lastBoonActive = false; this.artifact = null; this.talRun = null; }
    // Back at the gate, he carries what he had there; the head of the floor is still what the save
    // and the death card know the floor by. Anywhere else the gate is forgotten.
    const head = cp ? { boons: this.boons.slice(), artifact: this.artifact, talRun: this.talRun, crowGift: this.crowGift } : null;
    if (cp) { this.boons = cp.boons.slice(); this.artifact = cp.artifact; this.talRun = cp.talRun ? Object.assign({}, cp.talRun) : null; this.crowGift = cp.crowGift; }
    else this.checkpoint = null;
    this.holdAt = -1;
    // The build is applied before the floor is generated, because what he carries reaches it (the
    // clover's luck, the tortoise's shield uses): on a CONTINUE after a reload `mods` was still the
    // bare goat's, and a restart after a swap at the mouse was built with the swapped talisman's luck.
    this.applyBoons();
    // The crow's gift is spent on this floor's stairs below; a death on this floor puts it back.
    this.levelCrowGift = !!(head ? head.crowGift : this.crowGift);
    // The keys he walked onto this floor with: a death on it gives back exactly these.
    this.levelRunKeys = this.runKeys | 0;
    // Back at the middle gate he has the keys he had there: one spent on iron before it stays spent,
    // or a death refunded it while keeping the animal it let out (`cp.pet`).
    if (cp && cp.keys !== undefined) this.runKeys = Math.max(0, cp.keys | 0);
    this.levelIndex = index;
    // The level he ate the mushrooms before is played as THE TRIP, in the place of this one.
    if (this.tripAt === undefined) this.tripAt = -1;
    // THE DARK is a floor of its own (`darkLevel`), played in the place of the floor after THE FORK
    // when the run took the fork's dark flight, and only there: its place is its own (`darkOf`).
    if (this.darkAt === undefined) this.darkAt = -1;
    this.climbDark = false;
    const def = this.showroomOn ? SHOWROOM_LEVEL : index === this.tripAt ? tripLevel(index) : index === this.darkAt && index === DARK_LEVEL.darkOf ? darkLevel() : LEVELS[index];
    this.levelTripAt = this.tripAt;
    if (cp) this.tripAt = cp.tripAt;   // a tuft eaten before the gate stays eaten
    this.tripBanner = def.shroom ? TUNING.shroom.banner.time : 0;
    // The floor after THE TRIP says the controls are his again (`shroom.back`).
    this.tripBack = !def.shroom && this.tripAt >= 0 && index === this.tripAt + 1 && !cp ? TUNING.shroom.back.time : 0;
    // The clover at his neck reaches the generator and nothing else he carries does: it is the
    // one artifact about the floor rather than about him.
    // And which animal, if any, this floor holds is the run's deal (`Beast.deal`), so no kind comes
    // twice in a run; off the run seed, so a death on this floor deals it the same one again.
    // A seed the generator gives up on (forty tries) used to throw out of here every time it was
    // asked again, and the death or clear card retried it forever. A second seed, derived, so a run
    // code still rebuilds the same floor.
    // A full pig (`Beast.saved`) knows where the grass grows: a tuft or two more on every floor after
    // hers, handed to the generator as the clover's `heals` (a roll off the floor's own seed).
    const pigs = (this.beasts && this.beasts.pig) || 0, PH = TUNING.prop.pig.saveHeals;
    const luck = pigs ? Object.assign({ secret: 1, racks: 1, grass: 1, heals: 0 }, this.mods.luck || {}) : this.mods.luck;
    if (pigs) luck.heals = (luck.heals || 0) + pigs * (PH[0] + ((seed >>> 5) % (PH[1] - PH[0] + 1)));
    // No iron before this browser has held a key (5 Oct 2026 playtest: a cage that wants a key nobody has met reads as a wall).
    const genOpts = { luck, beast: this.beastFor(index), noIron: !this.learned.key };
    if (this.dev && this.dev.forceCombo) genOpts.combo = this.dev.forceCombo;   // the COMBOS tab's PLAY (`dealCombo`)
    try { this.level = generateLevel(def, seed >>> 0, genOpts); }
    catch (err) { console.error(err); this.level = generateLevel(def, (seed ^ 0x5bd1e995) >>> 0, genOpts); }
    this.world = new World(this.level);
    this.goat = new Goat(this.level.start.x, this.level.start.y);
    this.enemies = this.level.spawns.map((s) => {
      const e = new Enemy(s.x, s.y, s.kind);
      // Which room he was put in. Nothing but a sealed arena reads this, it is how `updateSeals`
      // knows the fight behind a pair of doors is actually over.
      e.room = s.roomIndex === undefined ? -1 : s.roomIndex;
      // The butcher (`champion`): the old Butcher's body, a hook on a rope, and `champion.hp` hearts, the
      // one kind that is heavy without being a boss (25 Sep 2026: "the ordinary butcher, 3 hearts").
      if (s.champion) { e.champion = true; e.hp = e.maxHp = TUNING.champion.hp; }
      // The shieldman (`TUNING.shieldman`): a clubman with a board, slower for carrying it.
      if (s.shield) e.giveShield();
      // The thrower (`TUNING.thrower`, js/thrower.js): three hearts, heavy, his big arm.
      if (s.thrower) Thrower.give(e);
      // A boss wears the outline and stands bigger. Without a soul he is a champion, yellow, his kind's
      // own hearts plus `boss.champHp` and nothing else; `ensoul` below makes the strong one. The ogre,
      // boss-only, keeps his `butcher.hp`.
      if (s.boss) { e.elite = s.kind !== 'butcher'; e.hp = s.kind === 'butcher' ? e.cfg.hp : e.hp + TUNING.boss.champHp; e.maxHp = e.hp; }
      // A rifle posted to watch a door has no blind side worth walking round.
      if (s.alert) e.watchful = true;
      // The wheel's two men: one who never reads a hazard and one who always does. It is the same
      // roll every man in the game makes, pinned to its two ends, see `millLesson` in `gen.js`.
      // Both also get a beat to plant and face you before either moves, so the one about to walk
      // into the arm reads as the room deciding rather than as a coin flip landed off-screen.
      // `millLesson` makes them see the goat the moment he is in their room (they were 10 tiles off
      // with an 8-tile eye, facing wherever they were rolled, and stood there while he walked in), and
      // the careless one's first run is AT the arm (`Enemy.runAtWheel`), not at the goat: walking to
      // him he crossed the sweep between two passes of the arm more often than not.
      if (s.sense !== undefined) { e.trapSense = s.sense; e.noticeFor = TUNING.ai.millNotice; e.millLesson = true; e.millRun = s.sense === 0; }
      // The first man of a run holds his ground: he turns, he swings, he never walks. You get to
      // choose when the first fight of your life starts, which is the only way it teaches anything.
      if (s.sentry) { e.sentry = true; e.facing = s.facing || 0; }
      // THE YARD's chandelier lesson (`post`): the sentry's feet, under the ring, in the notch.
      if (s.post) { e.sentry = true; e.facing = s.facing || 0; }
      if (s.boss) e.boss = true;
      // A gate's keeper (`levelDef.gateKeeper`) is made one further down (`keepGate`), with his soul.
      // Lying in the grass (THE CAVE): he is put down still and facing any way at all, and what
      // shows of him is the top of him. Nothing else about him is different.
      if (s.lurk) { e.lurk = true; e.facing = Math.random() * Math.PI * 2; }
      return e;
    });
    // `soulPlan` names men by their place in the spawn list, and `stageFirstHide` may take men out
    // of `this.enemies`: read the plan against the list as it was spawned.
    const bySpawn = this.enemies.slice();
    this.stageFirstHide();
    this.props = this.level.props.map((p) => new Prop(p.x, p.y, p.kind, p));
    // A table laid by hand (THE SHOWROOM's SUPPER row) brings its own dishes; every other one is rolled off its tile.
    this.level.props.forEach((p, i) => { if (p.dishes) { const t = this.props[i]; t.food = Scatter.lay(p.dishes, (k) => farHash(i * 13 + k * 7, k * 3)); } });
    // A hidden grate knows what stands on it (the crate, barrel or stand set down on its tile).
    for (const g of this.props) if (g.kind === 'spike' && g.hidden) g.cover = this.props.find((q) => q !== g && (q.kind === 'crate' || q.kind === 'barrel' || q.kind === 'weapon') && hyp(q.x - g.x, q.y - g.y) < 4) || null;
    // Each chandelier and the cleat its rope is tied off at (`cid`, js/gen.js).
    for (const c of this.props) if (c.kind === 'cleat') { const ring = this.props.find((q) => q.kind === 'chandelier' && q.cid === c.cid); if (ring) { c.hangs = ring; ring.cleat = c; } }
    // The ritual altar: real furniture rather than scenery, so it blocks the way and takes a blow
    // like any other table. Its position matches where the decal layer has always drawn it.
    if (levelIndexOf(this.level.def) === 0) {   // the dark altar is still the altar
      const S = this.level.start;
      this.props.push(new Prop(S.x - 4 * TILE, S.y - 0.2 * TILE, 'table', { altar: true }));
      // The store in the far corner: a barrel and a spill of straw standing on the floor against the
      // wall. They used to be painted into the wall band itself (`drawRitual`) so nothing would stand
      // in the way, and read as stuck in the stone (playtest, 25 Sep 2026). Real ones instead, added
      // here beside the altar so the generator's rules (no barrels on level one) are not asked about
      // a room it did not furnish: a barrel in the corner, which a blow only drives into the stone,
      // and straw tiles a step along the wall, clear of the bowl of coals below them.
      const R = this.level.rooms[0], W = this.world.W;
      this.props.push(new Prop((R.x + 1.5) * TILE, (R.y + 1.5) * TILE, 'barrel'));
      for (const x of [R.x + 3, R.x + 4]) if (this.world.tiles[(R.y + 1) * W + x] === T.FLOOR) this.world.tiles[(R.y + 1) * W + x] = T.HAY;
    }
    // A boulder is stone to the flow field until it breaks (`Prop.crackRock` clears it).
    for (const p of this.props) if (p.kind === 'rock') this.world.block[Math.floor(p.y / TILE) * this.world.W + Math.floor(p.x / TILE)] = 1;
    this.hazards = this.props.filter((p) => p.kind === 'brazier' || p.kind === 'mill' || p.kind === 'spike' || p.kind === 'spire' || p.kind === 'barrel');
    // The wall's dressing a flung body asks about every step (`Enemy.wallDressing`): kept off the prop loop.
    this.wallArt = this.props.filter((p) => p.kind === 'armor' || p.kind === 'trophy' || p.kind === 'suit');
    this.sightBlockers = this.props.filter((p) => p.kind === 'door' || p.kind === 'bell' || p.kind === 'mill' || p.kind === 'secret');
    // A niche is rock until its wall gives. It was floor from the first frame, lying one row outside
    // the room's own box where the room fog never reaches, so the rack and the grass in it sat there
    // under nothing but the shade for anybody to read through the wall. `crackWall` gives it back.
    this.niches = this.props.filter((p) => p.kind === 'secret' && p.nicheTiles);
    for (const p of this.niches) for (const i of p.nicheTiles.slice(1)) if (this.world.tiles[i] === T.FLOOR) this.world.tiles[i] = T.WALL;
    this.world.caveDirty();
    // The cave cut through the middle of its tiles, when that is the shape asked for. Laid once the
    // furniture is down, since nothing that was put somewhere may end up grown over.
    if (this.world.round && TUNING.cave.shape === 'mid') this.world.buildCaveField(this.props, this.level.start);
    // Sealed arenas: which pair of doors belongs to which room, whether they have slammed behind him
    // yet, and whether that room has already been paid for. `updateSeals` runs all three beats. The
    // doors stand OPEN until he is inside, a seal is a door that shuts behind you, and one that
    // starts shut is a wall, since nothing on either side of it may smash or shoulder one.
    this.sealedRooms = (this.level.sealedArenas || []).map((at) => {
      const doors = this.props.filter((p) => p.seal && p.sealRoom === at);
      for (const d of doors) d.open = 1;
      // `held` is filled at the moment the doors slam: who is shut in, which is what the seal waits
      // on from then on. Null until then, when the spawn list is the best answer there is.
      return { room: at, doors, armed: false, open: false, held: null };
    });
    this.runes = []; this.henSaved = false; this.beastSaved = [];
    this.bullets = []; this.parts = []; this.floats = []; this.rings = []; this.puffs = []; this.flares = []; this.hurt = null; this.hurtVignette = null; this.fallers = []; this.globs = []; this.tossed = [];
    this.guide = null;   // a trail to a soul or a ware of the last layout pointed at nothing in this one
    this.fx = new CombatFX(this); this.scatter = new Scatter(this);
    this.souls = []; this.boonChoice = null; this.breathFx = null; this.bless = null; this.beastTalk = null; this.beastsHere = {};
    // Before applyBoons: tied legs lend the roll their numbers, and they must not outlive the floor.
    this.legsTied = null; this.song = null; this.calmFast = false; this.applyBoons(); this.goat.hp = this.goat.maxHp;
    // THE MIRROR's HALO: hearts of light over his own at the head of every floor, and GOOD GRAZER's
    // first bowl, not yet drunk.
    this.goat.light = this.mods.lightHearts || 0; this.milkFullUsed = false;
    // The tortoise's iron (js/beasts.js): put on again at the head of every floor, a restart included.
    this.goat.armour = this.mods.armour || 0;
    // What he walked in with. A death rolls him back to exactly this list, and to the talisman he
    // walked in wearing: one taken inside the level goes back on the shelf with the level.
    this.levelBoons = this.boons.slice(); this.levelArtifact = this.artifact;
    this.levelTalRun = this.talRun ? Object.assign({}, this.talRun) : null;   // the tallow, the cup, the tally
    if (head) { this.levelBoons = head.boons; this.levelArtifact = head.artifact; this.levelTalRun = head.talRun ? Object.assign({}, head.talRun) : null; }
    this.boom = { fly: null };
    this.cam.x = this.goat.x; this.cam.y = this.goat.y; this.cam.zoom = this.renderer.zoomFit;
    this.camLead.x = 0; this.camLead.y = 0; this.camFollow = null; this.camTrack = null; this.camHold = undefined; this.camRoomMid = null; this.camFight = 0; this.camBoss = null;
    // A thin trail of where he actually walked, sampled on a clock rather than every step so a long
    // level does not grow an enormous array. It is what the death screen's pull-back draws as a line.
    this.pathTrail = [{ x: this.goat.x, y: this.goat.y }]; this.pathTimer = 0; this.deathCam = null; this.painting = null;
    this.heartLog = [];   // the clock at every heart lost this level: the last two say burst or bleed
    this.hurtRooms = [];  // the room of every heart lost this level (`updateSkyTables`)
    this.powder = new Map();   // spilt powder by tile: { lit: fuse s left, or -1 } (`spillPowder`)
    this.seedDeaths = this.deaths || 0;   // the death count this level's seed was cut with, for the run code
    this.firstKill = null;   // the level's first body, for the run code: a kill nobody saw has a cause on it
    this.killMarks = [];   // where each man of this level went down, skulls on the death screen's map
    this.motes = []; this.revive = null; this.secondUsed = false;   // the white souls, SECOND CHANCE (js/motes.js)
    // The floor again after a death on it: a tip at its foot (`DEATH_TIPS`, `Codex.deathTip`).
    this.tip = this.tipNext && this.tipNext.level === index && !withIntro ? Codex.deathTip(this.tipNext) : null; this.tipNext = null;
    this.shopDlg = null; this.shopShut = {};   // the mouse's offer (js/codex.js)
    this.legsTied = null; this.song = null;   // the rabbit's bargain, the husky's song (js/beasts-more.js)
    this.crowMarks = [];   // the same bodies, for the crow, a level's dead do not call it to the next one
    this.kills = 0; this.timer = 0; this.timeScale = 1; this.slowTimer = 0; this.aimSlow = 0; this.aimSlowCd = 0;
    this.kickX = 0; this.kickY = 0; this.zoomKick = 0; this.flashAmt = 0;
    // A death in the frame of a kill kept the hitstop and the shake into the next floor's first frames.
    this.hitstopTimer = 0; this.shakeAmt = 0; this.shakeX = 0; this.shakeY = 0; this.tripGrabWas = false;
    this.combo = 0; this.comboTimer = 0; this.barkCd = 0; this.cageOpen = false; this.cageLunge = -1; this.deadCageLunge = -1;
    this.cageThought = 0;   // a beat of "her" over his head the moment the pen gives, comic-panel style
    this.toldGrab = false;
    this.audio.intensity = 0; this.audio.hunterAware = false;
    this.world.computeFlow(this.goat.x, this.goat.y);
    this.world.computeVis(this.goat.x, this.goat.y, TUNING.fog.radius, this.mods.oracle ? TUNING.fog.oracle : 0);
    // And what the crow found on the last floor is standing on this one's stairs. After the flow
    // field: `freeSpot` asks it, and asked before it existed it put the gift on the goat every time.
    Beast.placeGift(this);
    // The level's souls, handed out before a blow is struck. `def.souls` is the whole count (see the
    // note over `LEVELS`) and it is spent in this order: the two gates first, each a rest room with
    // its soul lying in the middle of the floor; the mouse's gate takes none, then the vault, then
    // the LAST bosses of the level, so the fight you finish on pays. A boss left over drops milk; a
    // vault left over holds grass. Everything is laid down with `placeSoul` rather than dropped:
    // `dropSoul` asks the flow field whether a spot can be reached, the field only reaches ninety
    // tiles from the start, and asked about a room further than that it walks the soul back to the goat.
    // Where they go, and the two seeded surprises on top (never within `soul.apart` rooms of another
    // soul), is `soulPlan` in gen.js, which `GEN_RULES.souls` holds to the same answer. The mouse
    // stands in for one of the two: a shop floor used to hand out three.
    const plan = soulPlan(this.level);
    this.soulsHere = plan.count;
    this.soulGates = (this.level.gates || []).map((g) => ({ room: g.room, shop: g.shop,
      prop: this.props.find((p) => p.gate && p.gateRoom === g.room && !p.exitGate) || null }));
    // The way out (`level.exitGate`): last in the list, so `soulGates[0]` stays the middle gate. Its bar
    // is the soul the last boss carries, tagged below.
    const EG = this.level.exitGate;
    if (EG) this.soulGates.push({ room: EG.room, exit: true, shop: false, prop: this.props.find((p) => p.exitGate) || null });
    for (const { gate: g, keeper } of plan.gates) {
      const e = keeper >= 0 ? bySpawn[keeper] : null;
      // Swallowed at the gate he comes back to, and its keeper, if it had one, with it.
      if (cp && g === this.level.gates[0]) { if (e) e.gone = true; continue; }
      // A keeper's gate (`levelDef.gateKeeper`): the soul is in him and comes out where he goes
      // down (`bossPrize`), tagged with his gate so swallowing it lifts that gate. On a `blessGate`
      // floor the first gate's man is only promised it: the mage gives it to him in front of the
      // goat (`watchBless`), and until then he is a plain clubman holding his mark.
      if (e && def.blessGate && g === this.level.gates[0] && !cp) { e.blessing = { room: g.room }; this.bless = { keeper: e, room: g.room, on: false }; }
      else if (e) this.keepGate(e, g.room);
      else this.placeSoul(g.soul.x, g.soul.y, g.room);
    }
    // The vault is big grass behind a plain iron door, never a soul (26 Sep 2026). An `ambush` or
    // `mages` vault stands that door open and shuts it behind him (`updateVaultTrap`).
    this.vaultTrap = null; this.vaultOgre = null; this.spireLesson = null;
    const V = this.level.vault;
    if (V) {
      const grass = new Prop(V.x, V.y, 'heal', { big: true });
      this.props.push(grass);
      const door = this.props.find((d) => d.kind === 'door' && d.vault);
      if (door) door.vaultEmpty = true;
      if (door && V.box && (V.kind === 'ambush' || V.kind === 'mages')) {
        door.open = 1;
        this.vaultTrap = { kind: V.kind, box: V.box, door, grass, armed: false, done: false, held: null };
      }
      // The ogre's vault (`TUNING.vault.ogre`): the door shut, three blows of iron, and him on the
      // grass behind it, a boss off the curve and carrying nothing, held until the door gives.
      if (door && V.box && V.kind === 'ogre') {
        door.needHits = TUNING.vault.ogre.hits;
        const b = V.box, cx = (b.x + b.w / 2) * TILE, cy = (b.y + b.h / 2) * TILE, away = cy > door.y ? 1 : -1;
        const e = new Enemy(cx, cy + away * TILE * TUNING.vault.ogre.back, 'butcher');
        e.boss = true; e.hp = e.maxHp = e.cfg.hp; e.room = -1; e.vaultMan = true; e.caged = door;
        e.facing = Math.atan2(door.y - e.y, door.x - e.x);
        this.enemies.push(e);
        this.vaultOgre = { e, door, t: TUNING.vault.ogre.tellGap };
      }
    }
    for (const i of plan.ensoul) if (bySpawn[i]) this.ensoul(bySpawn[i]);
    // An arena that names its boss's hearts (`arenas[].hp`, 2 Oct 2026) has the last word on them, soul or not.
    this.level.spawns.forEach((s, i) => { if (s.hp && bySpawn[i]) bySpawn[i].hp = bySpawn[i].maxHp = s.hp; });
    // His soul is the bar of the door in front of the stairs (`bossPrize` tags it with the gate).
    if (EG) for (const i of plan.ensoul) if (bySpawn[i] && this.level.spawns[i].roomIndex === EG.room) bySpawn[i].soulGate = EG.room;
    // The surprises: a boss lit with a soul the budget did not give him (counted on the card), and
    // a fight room that gives one up once its last man is down (`onKill`; nothing says which).
    if (plan.bonusBoss >= 0 && bySpawn[plan.bonusBoss]) this.ensoul(bySpawn[plan.bonusBoss]);
    this.bonusRoom = plan.bonusRoom;
    if (cp) this.enemies = this.enemies.filter((e) => !e.gone);
    this.goatRoom = 0;
    // Arriving up the stairs: the goat rises into the room under the card.
    if (this.intro) this.audio.duck(1, 0.3);   // Backspace out of the scene must not leave the sound down
    // Sent down from heaven (`Heaven.leave`), he falls into the floor out of the light instead of
    // coming up its stairs, into the pen, on the first floor.
    this.dropIn = this.fromHeaven ? { t: 0 } : null;   // held back below, until the card is nearly gone
    // Tables he butted off heaven's edge come down on this floor, and only this one (`updateSkyTables`).
    { const C = TUNING.heaven.tables, n = this.fromHeaven ? this.heavenTables || 0 : 0;
      this.skyTables = n > 0 ? { n, t: 0, drops: [] } : null;
      this.heavenTables = 0; }
    this.intro = null; this.stairFx = this.level.entry && !this.fromHeaven ? { t: -0.45, dir: -1 } : null;
    if (this.fromHeaven) this.flash('#fffcf0', 0.9);
    // Not back into the pen (29 Sep 2026: "you don't fall into the cage, you wake up after the blow"):
    // on a floor that has one, he comes down a step past its bars, and it stands open behind him.
    if (this.fromHeaven && def.startCage && !cp) {
      const s0 = this.level.start, at = this.freeSpot(s0.x + (TUNING.prop.cage.halfW + TUNING.heaven.drop.besidePen) * TILE, s0.y);
      this.goat.x = at.x; this.goat.y = at.y; this.cageOpen = true;
      this.cam.x = at.x; this.cam.y = at.y; this.pathTrail = [{ x: at.x, y: at.y }];
    }
    this.fromHeaven = false;
    if (cp) this.enterAtGate(cp);
    // Every level starts by writing the run down: that head is what CONTINUE comes back to.
    this.saveRun();
    // Once watched, a new run (NEW GAME, RUN AGAIN) goes straight to the pen (30 Sep 2026: "don't
    // show the opening again if he has seen it"); `withIntro === 'force'` plays it anyway (tests).
    Stats.enter(this);   // a new life's report, or the next floor of this one (js/stats.js); before the opening scene's return
    if (withIntro && def.ritual && def.startCage && (!this.introSeen || withIntro === 'force')) { this.beginIntro(); return; }
    this.state = 'card';
    // A new level puts every heart back. The card is where the goat finds that out.
    const lines = [def.sub.toUpperCase(), def.name];
    // Hearts back, and what the level is holding. The count is on the card because a progression
    // nobody can see is not one: you should walk in knowing what there is to walk out with.
    const tail = [];
    if (cp) tail.push('back at the middle gate');
    if (index > 0 || keepBoons) tail.push(this.goat.maxHp + ' hearts again');
    if (this.soulsHere && !cp) tail.push(this.soulsHere === 1 ? '1 soul in here' : this.soulsHere + ' souls in here');
    if (this.level.shop && !cp) tail.push('a mouse in the wall');
    if (tail.length) lines.push('', tail.join(' \u00b7 '));
    this.card = { lines, dim: 0.6, size: 40, small: 2 }; this.stateTimer = 1.3;
    // Down from heaven, he lands as the card clears: the fall starts `drop.lead` s before it goes.
    if (this.dropIn) this.dropIn.t = -Math.max(0, this.stateTimer - TUNING.heaven.drop.lead) / TUNING.heaven.drop.time;
    this.audio.sfxCard();
  }
  // A death costs the level, not the learning. You come back with everything you walked in carrying
  // and nothing less: the goat gets stronger every level and stays stronger, which is the only way
  // seven levels of one life read as a run rather than seven separate walls. What a death still
  // takes is the soul you found INSIDE the level, the room is generated again and it is back where
  // it was, guarded by whoever was guarding it, so dying is never a way to farm one.
  // `fromHeaven`: off the edge above (`Heaven.leave`), where the death that sent him up is already
  // counted.
  restartLevel(fromHeaven) {
    // Only out of a level being played or lost. From the clear card or the climb it replayed a
    // level whose kills and score were already banked, and banked them a second time.
    if (!fromHeaven && this.state !== 'play' && this.state !== 'paused' && this.state !== 'dead') return;
    // Off the death card while heaven has something new (`deathNews`), only ASCEND goes on: no restart.
    if (!fromHeaven && this.state === 'dead' && this.deathNews && this.deathNews.length && !this.showroomOn) return;
    // RESTART on the death card skips heaven, but the god still counts the death (`Heaven.restarted`).
    if (!fromHeaven && this.state === 'dead' && !this.showroomOn) Heaven.restarted();
    // A restart you ask for is a death you chose, and it counts as one: `deaths` is in the seed, and
    // without this Backspace brought back the very layout you had just walked through.
    // ...and ends the life's report as a death does, or the next floor entry was written into the same life.
    // The last card's code is not this life's: a Backspace mid-floor has no card, and its report carried the one before.
    if (this.state !== 'dead' && !fromHeaven) { this.deaths++; this.lastCode = null; Stats.close(this, 'death'); }
    this.boons = (this.levelBoons || []).slice(); this.artifact = this.levelArtifact || null;
    this.crowGift = !!this.levelCrowGift; this.talRun = this.levelTalRun ? Object.assign({}, this.levelTalRun) : null;
    this.runKeys = this.levelRunKeys | 0;
    // Mushrooms eaten on a level you then died on go back on the floor with everything else in it.
    this.tripAt = this.levelTripAt === undefined ? -1 : this.levelTripAt;
    // `deaths` has already gone up by the time this runs, and it is in the mix, so the level comes
    // back generated again, the same promise it always made, now made by arithmetic. Past the
    // middle gate, it comes back to that gate (`enterAtGate`).
    const cp = TUNING.soul.hold.on && this.checkpoint && this.checkpoint.level === this.levelIndex ? this.checkpoint : null;
    this.startLevel(this.levelIndex, this.levelSeed(this.levelIndex), true, false, cp);
  }

  // ---------- the first screen ----------
  // Two buttons and the name of the game. Nothing is explained here: the opening scene carries the
  // story and the floor of level 1 carries the controls, so the menu only has to be a way in.
  showTitle() {
    // A life still open (a quit, heaven's edge left by the title) is closed while the floor is still here to
    // write its run code from: closed after the level was let go, every quit's report carried none.
    Stats.close(this, 'quit');
    this.state = 'title'; this.card = null; this.level = null; this.world = null; this.goat = null;
    this.guide = null; this.heaven = null; this.dropIn = null; this.audio.heavenMusic = false;
    // Escape out of the opening scene lands here with the scene still set: its overlay then drew
    // stars round a goat that no longer exists, threw every frame, and the title never drew (nor
    // came back up out of the scene's duck).
    if (this.intro) this.audio.duck(1, 0.3);
    this.intro = null; this.stairFx = null;
    this.enemies = []; this.props = []; this.bullets = []; this.souls = []; this.sightBlockers = []; this.niches = []; this.fallers = []; this.globs = [];
    this.save = this.loadRun();
    this.best = this.loadBest();
    // A run waiting to be picked up is the likelier intent, so the keyboard starts on it.
    // `panel` is whatever is laid over the menu, the record sheet, or the two switches. The board
    // is put away by anything at all; the switches are not, because a click on one is meant to
    // throw it rather than to leave.
    this.menu = { index: this.save ? 1 : 0, rects: [], t: 0, shake: 0, panel: null, sub: 0, sliderDrag: null, tripPick: false };
    // The funnel's first step; the question, once; and whatever did not go out last time goes now (js/stats.js).
    Stats.step(this, 'open'); Stats.ask(this); Stats.flush(this);
  }
  updateTitle(dt) {
    this.menu.t += dt; this.menu.shake = Math.max(0, this.menu.shake - dt);
    // The mouse chooses what it is over; the keyboard chooses what it was left on. While a panel is
    // up its rows are what `menu.rects` holds, so the hover lands on `sub` rather than on the menu
    // behind it, otherwise reading the settings would silently move what NEW GAME is.
    // Only a mouse that moved: the resting cursor used to take the row back from W/S every step, and
    // Enter then picked what the pointer happened to rest on (NEW GAME, wiping the run).
    if (!this.touch.active && this.mouseMoved) {
      this.mouseMoved = false;
      const i = this.menuAt(this.input.mouse);
      if (i >= 0) {
        if (this.menu.panel === 'settings' || this.menu.panel === 'levels' || this.menu.panel === 'consent' || this.menu.panel === 'controls') { if (!(this.menu.bindWait >= 0)) this.menu.sub = i; }
        else if (!this.menu.panel) this.menu.index = i;
      }
    }
  }
  // The title's rows. LEVELS (a floor picked out of order) is a tool, not a way to play: it is on the
  // menu only while the dev drawer is open (30 Sep 2026: "moving between levels from the menu, only in
  // dev mode"), and never in the itch build, which has no drawer.
  // LEVELS, and BEST (2 Oct 2026 playtest: "hide it for now, it is not about the score"), only with the dev drawer open.
  menuItems() { return MENU.filter((id) => (id !== 'levels' && id !== 'best') || (this.dev && this.dev.open && !this.dev.hidden)); }
  menuAt(p) {
    const r = this.menu.rects;
    for (let i = 0; i < r.length; i++) if (p.x >= r[i].x && p.x <= r[i].x + r[i].w && p.y >= r[i].y && p.y <= r[i].y + r[i].h) return i;
    return -1;
  }
  // The menu answers the keys the game already uses: run up and down it, headbutt to choose.
  menuKey(code) {
    const m = this.menu;
    if (m.panel === 'photos') { Photo.key(this, code); return; }
    if (m.panel === 'consent') { Stats.consentKey(this, code); return; }
    if (m.panel === 'book') { Codex.bookKey(this, code); return; }
    if (m.panel === 'controls') { KeyBind.key(this, code); return; }
    if (m.panel === 'best') { m.panel = null; this.audio.sfxSwing(); return; }
    if (m.panel === 'settings' || m.panel === 'levels') {
      // the rows of whatever is up, and the way out at the bottom of them. LEVELS carries two rows
      // more than its floors: the trip and the dark toggles at the top, which do not leave when picked.
      const n = m.panel === 'settings' ? SETTINGS.length + 1 : LEVELS.length + LEVEL_TOGGLES + 1;
      const row = m.panel === 'settings' ? SETTINGS[m.sub] : null;
      if (code === 'KeyW' || code === 'ArrowUp') { m.sub = (m.sub + n - 1) % n; this.audio.sfxSwing(); }
      else if (code === 'KeyS' || code === 'ArrowDown') { m.sub = (m.sub + 1) % n; this.audio.sfxSwing(); }
      else if (row && row.type === 'slider' && (code === 'ArrowLeft' || code === 'KeyA')) this.adjustSlider(m.sub, -0.05);
      else if (row && row.type === 'slider' && (code === 'ArrowRight' || code === 'KeyD')) this.adjustSlider(m.sub, 0.05);
      else if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter') this.menuPick(m.sub);
      // Only a way-out key closes it: Left on a switch row, or a stray Shift, used to shut the panel.
      else if (code === 'Escape' || code === 'Backspace') { m.panel = null; this.audio.sfxSwing(); }
      return;
    }
    const n = this.menuItems().length;
    if (m.index >= n) m.index = n - 1;
    if (code === 'KeyW' || code === 'ArrowUp') { m.index = (m.index + n - 1) % n; this.audio.sfxSwing(); }
    else if (code === 'KeyS' || code === 'ArrowDown') { m.index = (m.index + 1) % n; this.audio.sfxSwing(); }
    else if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter') this.menuPick(m.index);
  }
  menuPick(i) {
    const m = this.menu;
    // While the board is up it is the only thing the menu does, and anything closes it.
    if (m.panel === 'best') { m.panel = null; this.audio.sfxSwing(); return; }
    if (m.panel === 'consent') { Stats.answer(this, i === 0); return; }
    // The switches stay up while they are being thrown. Only the last row leaves.
    if (m.panel === 'settings') {
      m.sub = i;
      if (i >= SETTINGS.length) { m.panel = null; this.audio.sfxCard(); return; }
      // A slider takes a drag or the left/right keys, both handled before this is ever reached; a
      // press on the row itself, Enter, or a tap that was not a drag, does nothing to it.
      if (SETTINGS[i].type === 'slider') return;
      if (SETTINGS[i].type === 'panel') { KeyBind.open(this); return; }
      this.toggleSetting(SETTINGS[i].key);
      return;
    }
    // The level sheet. Row 0 is the mushroom toggle and does not leave; row 1 is THE DARK, a floor
    // of its own, played in its place in the run; a row after them is a floor of the game, played
    // straight or as the trip; the last row is the way back.
    if (m.panel === 'levels') {
      m.sub = i;
      if (i === 0) { m.tripPick = !m.tripPick; this.audio.sfxCard(); return; }
      if (i >= LEVELS.length + LEVEL_TOGGLES) { m.panel = null; this.audio.sfxCard(); return; }
      this.audio.sfxCard();
      if (i === 1) this.startAtLevel(DARK_LEVEL.darkOf, false, true);
      else this.startAtLevel(i - LEVEL_TOGGLES, m.tripPick, false);
      return;
    }
    m.index = i;
    // A row index left over from a longer list (the dev drawer shut under it) picks nothing, never NEW GAME.
    const items = this.menuItems(); if (!(i >= 0 && i < items.length)) return;
    const id = items[i];
    // Nothing to come back to: the button shakes its head and stays where it is.
    if (id === 'continue' && !this.save) { m.shake = 0.35; this.audio.sfxThud(); return; }
    this.audio.sfxCard();
    if (id === 'levels') { m.panel = 'levels'; m.sub = 0; m.tripPick = false; return; }
    if (id === 'best') { m.panel = 'best'; return; }
    if (id === 'settings') { m.panel = 'settings'; m.sub = 0; return; }
    if (id === 'continue') { this.resumeRun(); return; }
    if (id === 'discord') { this.openDiscord(); return; }
    if (this.askedShowroom && !this.dev.hidden) { this.startShowroom(); return; }
    this.clearRun(); this.boons = []; this.lastBoonActive = false; this.totalKills = 0; this.deaths = 0; this.totalScore = 0; this.henHearts = 0;
    this.beasts = {}; this.crowGift = false; this.runKeys = TUNING.keys.start;
    this.forgetLessons(); this.noteRunStart();
    this.runSeed = this.askedSeed || ((Math.random() * 1e9) | 0);
    this.askedSeed = 0;   // a seed off the address is spent on the run it was asked for and no other
    this.startLevel(0, this.levelSeed(0), false, true);
  }
  // A new tab, never this one: the run on the title stays where it was. Framed as the artifact a
  // popup can be refused, so a plain link click is the fallback.
  openDiscord() {
    let w = null;
    // no 'noopener' feature: with it window.open returns null even when the tab opened
    try { w = window.open(DISCORD_URL, '_blank'); } catch (e) { w = null; }
    if (w) { try { w.opener = null; } catch (e) { /* cross-origin already */ } return; }
    try { const a = document.createElement('a'); a.href = DISCORD_URL; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { /* nothing else to try */ }
  }
  // The pause overlay's own three rows, RESUME, SETTINGS, QUIT TO TITLE, kept apart from the
  // title's own `menu` so pausing mid-level can never disturb what row the title was last left on.
  pauseAt(p) {
    const r = this.pause.rects;
    for (let i = 0; i < r.length; i++) if (p.x >= r[i].x && p.x <= r[i].x + r[i].w && p.y >= r[i].y && p.y <= r[i].y + r[i].h) return i;
    return -1;
  }
  pauseKey(code) {
    const n = PAUSE_MENU.length;
    if (code === 'KeyW' || code === 'ArrowUp') { this.pause.index = (this.pause.index + n - 1) % n; this.audio.sfxSwing(); }
    else if (code === 'KeyS' || code === 'ArrowDown') { this.pause.index = (this.pause.index + 1) % n; this.audio.sfxSwing(); }
    else if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter') this.pausePick(this.pause.index);
  }
  // What RESUME goes back to: heaven, if that is where the pause was taken and he is still up there
  // (`pauseFrom` is only ever set by a pause taken there), else the floor.
  pausedIn() { return this.pauseFrom === 'heaven' && this.heaven ? 'heaven' : this.pauseFrom === 'boon' && this.boonChoice ? 'boon' : 'play'; }
  pausePick(i) {
    this.pause.index = i;
    const id = (PAUSE_MENU[i] || PAUSE_MENU[0]).id;
    // The Space that picked RESUME is not a scream on the first step back.
    if (id === 'resume') { this.state = this.pausedIn(); this.clearEdges(); this.audio.sfxSwing(); return; }
    if (id === 'settings') { this.menu.panel = 'settings'; this.menu.sub = 0; this.audio.sfxCard(); return; }
    if (id === 'photos') { this.menu.panel = 'photos'; Photo.open(); this.audio.sfxCard(); return; }
    if (id === 'book') { this.menu.panel = 'book'; this.bookFromKey = false; this.book = { i: 0, mx: -1, my: -1 }; this.audio.sfxCard(); return; }
    // QUIT TO TITLE is the old Escape behaviour: abandon the room rather than resume it.
    this.quitToTitle();
  }
  // Leaving a floor half played is a restart he chose, the way Backspace is, and it counts as a
  // death: CONTINUE then deals him another layout and never the one he just walked through with a
  // heart left (ground rule 6). The level card and the opening scene are not half played.
  quitToTitle() {
    this.showroomOn = false;
    // Up in heaven the death that sent him there is already counted and saved: leaving is not another.
    if (this.level && !this.level.def.heaven && (this.state === 'play' || this.state === 'paused' || this.state === 'boon')) { this.deaths++; this.saveRun(); }
    this.showTitle();
  }
  // Shared by the title menu and the pause overlay's own settings panel: a slider takes the click
  // position, anything else is an ordinary row pick.
  menuPanelClick(p) {
    if (this.menu.panel === 'book') { Codex.bookClick(this, p); return; }
    if (this.menu.panel === 'photos') { Photo.click(this, p); return; }
    if (this.menu.panel === 'controls') { const i = this.menuAt(p); if (i >= 0) KeyBind.pick(this, i); return; }
    const i = this.menuAt(p); if (i < 0) return;
    const row = this.menu.panel === 'settings' ? SETTINGS[i] : null;
    if (row && row.type === 'slider') { this.setSliderAt(i, p.x); this.menu.sliderDrag = i; }
    else this.menuPick(i);
  }
  // ONE SEED A RUN. The corner has shown the level's own seed for a while, which is enough to report
  // a bad room and no use at all for handing somebody your run: every level of it was a fresh
  // `Math.random`, so nothing but that one floor could ever be got back. A run has a seed of its own
  // now and a level's is derived from it, which is what makes `#seed=` below mean anything.
  // `deaths` is in the mix on purpose: dying still regenerates the level, so a death is not a way to
  // learn a layout, it is a way to be handed another one, exactly as it was before this existed.
  levelSeed(index) {
    let h = (this.runSeed ^ 0x9e3779b9) >>> 0;
    for (const v of [index + 1, (this.deaths || 0) + 1]) {
      h = Math.imul(h ^ v, 0x85ebca6b) >>> 0;
      h = ((h << 13) | (h >>> 19)) >>> 0;
    }
    return h >>> 0;
  }
  // Straight onto one floor of the game. A run that starts on level five with the goat it had out of
  // the pen is not that level, it is a different and much worse game, so the souls the run would
  // have banked on the way are dealt out here, at random, because the point of the row is to put
  // you on that floor and not to reproduce somebody's build. Level one is the ordinary opening,
  // scene and all. Nothing about it touches the saved run or the board.
  startAtLevel(li, trip, dark, showroom) {
    this.showroomOn = !!showroom;
    // THE DARK (the row, or `#dark` on any row) is started at its own place in the run.
    if (dark || this.askedDark) { li = DARK_LEVEL.darkOf; trip = false; }
    // Not `clearRun`: the run waiting under CONTINUE is still there when he comes back from practice.
    this.artifact = null; this.levelArtifact = null; this.talRun = null;
    this.boons = []; this.lastBoonActive = false; this.totalKills = 0; this.deaths = 0; this.totalScore = 0; this.henHearts = 0;
    this.beasts = {}; this.crowGift = false; this.runKeys = TUNING.keys.start;
    this.forgetLessons();
    this.runJumped = true;   // a run started off LEVELS: its codes say so (`runCode`)
    let budget = 0;
    for (let i = 0; i < li; i++) budget += LEVELS[i].souls || 0;
    for (let n = 0; n < budget; n++) {
      this.applyBoons();
      const open = BOONS.filter((b) => this.boonOpen(b, li));
      if (!open.length) break;
      this.boons.push(open[(Math.random() * open.length) | 0]);
    }
    this.applyBoons();
    this.runSeed = this.askedSeed || ((Math.random() * 1e9) | 0);
    this.askedSeed = 0;
    // The row's own toggle picks a trip the same way `#trip` off the address does, a level has no
    // trip of its own on the first floor, since nothing has found any shrooms yet.
    this.tripAt = (trip || (this.askedTrip && !dark && !this.askedDark)) && li > 0 ? li : -1;
    if (dark || this.askedDark) this.darkAt = li;
    this.startLevel(li, this.levelSeed(li), true, li === 0 && this.tripAt !== li && this.darkAt !== li);
  }
  // THE SHOWROOM (js/showroom.js): every object and every floor's stone on one dev floor, walked with
  // GOD on. Held by `showroomOn` through a death or NEW LEVEL; its stairs, the title and any other way
  // into a floor let it go.
  startShowroom() {
    this.dev.god = true;
    this.startAtLevel(0, false, false, true);
  }
  // CONTINUE is the head of the furthest level the run reached, with the souls it was carrying there.
  resumeRun() {
    const s = this.save; if (!s) return;
    // The once-a-run lessons start over: a LEVELS practice earlier in this page taught them, and
    // CONTINUE kept that (the first hidden wraith no longer staged alone). tripAt / darkAt are set below.
    this.forgetLessons();
    // A real run, whatever LEVELS practice came before it in this page (a jumped run never saves),
    // and none of another run's talisman state: the tallow and the cup are not in the save.
    this.runJumped = false; this.talRun = null;
    // ...except the third card's count (HUNGRY SOUL, THE KNUCKLEBONE): a death keeps it, so a quit and CONTINUE must too.
    if (s.third > 0) Talisman.run(this).third = s.third | 0;
    // ...and what is in THE NOSEBAG, which a death keeps as well.
    if (s.bag > 0) Talisman.run(this).bag = Math.min(9, s.bag | 0);
    this.boons = (s.boons || []).map((id) => BOONS.find((b) => b.id === id)).filter(Boolean);
    this.totalKills = s.totalKills || 0; this.deaths = s.deaths || 0; this.totalScore = s.score || 0;
    this.henHearts = s.henHearts || 0;
    this.beasts = s.beasts || {}; this.crowGift = !!s.crowGift; this.runKeys = Math.max(0, s.keys | 0);
    // The talisman comes back with the run, if the artifact it names still exists.
    this.artifact = s.artifact && ARTIFACTS.some((a) => a.id === s.artifact.id) ? { id: s.artifact.id, tier: Math.max(1, Math.min(RARITY.length, s.artifact.tier | 0)) } : null;
    // A run picked up where it was left off is the same run, so it keeps its seed. One saved before
    // seeds existed has none, and gets a fresh one rather than nothing.
    this.runSeed = s.runSeed || ((Math.random() * 1e9) | 0);
    this.beastEarly = !!s.beastEarly; this.beastEarlyFor = this.runSeed; this.beastPlan = null;
    this.tripAt = s.tripAt === undefined ? -1 : s.tripAt;
    this.darkAt = s.darkAt === undefined ? -1 : s.darkAt;
    const li = clamp(s.level | 0, 0, LEVELS.length - 1);
    // Saved past the middle gate: back at it, with what he had there (the tallow and the cup are
    // not in the save, as they are not for the head of the floor).
    const G = TUNING.soul.hold.on && s.gate && s.gate.level === li ? s.gate : null;
    const cp = G ? { level: li, room: G.room, boons: (G.boons || []).map((id) => BOONS.find((b) => b.id === id)).filter(Boolean),
      artifact: G.artifact && ARTIFACTS.some((a) => a.id === G.artifact.id) ? { id: G.artifact.id, tier: Math.max(1, Math.min(RARITY.length, G.artifact.tier | 0)) } : null,
      talRun: null, crowGift: !!G.crowGift, tripAt: G.tripAt === undefined ? this.tripAt : G.tripAt,
      kills: G.kills || 0, time: G.time || 0, pet: Beast.is(G.pet) || G.pet === 'chicken' ? G.pet : null,
      keys: G.keys === undefined ? undefined : Math.max(0, G.keys | 0) } : null;
    this.checkpoint = cp;
    // This floor is only laid to be dropped into from heaven: the death's tip is kept for that drop
    // (`restartLevel` from the edge), not spent here where nobody sees it.
    const tip = this.tipNext;
    this.startLevel(li, this.levelSeed(li), true, false, cp);
    this.tipNext = tip;
    // A run picked up again starts above the clouds (30 Sep 2026: "CONTINUE can land you in heaven
    // too, it is a real level, a block of the game"): the floor is laid, and the edge drops him
    // into it as a death's visit does. Not a death, and nothing is counted up there for it.
    Heaven.enter(this, { visit: true });
  }
  // Time first, bodies second. Pace against the level's par is the whole of a score and kills only
  // multiply it, so running is never the wrong answer and the best run is a fast one with bodies in
  // it rather than a slow one that cleared every room. Par is the level's rooms times `perRoom`.
  scoreFor(kills, time, levelIndex, played) {
    const S = TUNING.score, def = (played && played.dark ? played : LEVELS[levelIndex]) || LEVELS[0];
    const pace = clamp((def.rooms * S.perRoom) / Math.max(time, 1), 0, S.fastCap);
    return Math.round(S.timePoints * pace * Math.min(1 + kills * S.killMul, S.killCap));
  }
  loadBest() {
    try {
      const b = JSON.parse(localStorage.getItem(BEST_KEY) || 'null');
      if (b && b.v === 1 && b.levels) return b;
    } catch (err) { /* storage refused: the board is empty and stays empty */ }
    return { v: 1, levels: {}, run: 0 };
  }
  // What a cleared level is worth, written down. A record outlives the run that set it.
  // The run's animals (`Beast.deal`), dealt once per run seed. Whether the first may come on level
  // two is fixed when the run is dealt, has this browser cleared level two before, and saved with
  // the run, so clearing it mid-run does not deal the rest of the run again.
  // The animal this floor deals now: the run's plan, and after a death a different one off the floor's own
  // list (2 Oct 2026 playtest: "after a death, a new layout, and change the animal if there was one"),
  // stepped round by the death count, never a kind the plan gives another floor.
  beastFor(index) {
    const plan = this.beastPlanFor(), k = plan[index] || null, def = LEVELS[index];
    if (!k || !this.deaths || !def) return k;
    const others = new Set(plan.filter((x, i) => x && i !== index));
    const pool = (def.beasts || []).filter((x) => !others.has(x));
    if (pool.length < 2) return k;
    return pool[(Math.max(0, pool.indexOf(k)) + this.deaths) % pool.length];
  }
  beastPlanFor() {
    if (!this.beastPlan || this.beastPlan.seed !== this.runSeed) {
      if (this.beastEarlyFor !== this.runSeed) {
        const b = this.best || (this.best = this.loadBest());
        this.beastEarly = !!(b && b.levels && b.levels[TUNING.beast.deal.known]); this.beastEarlyFor = this.runSeed;
      }
      this.beastPlan = { seed: this.runSeed, plan: Beast.deal(this.runSeed, this.beastEarly) };
    }
    return this.beastPlan.plan;
  }
  // A run the BEST board does not count: easy mode, or god mode from the dev drawer.
  offBoard() { return !!(this.settings.easy || (this.dev && this.dev.god)); }
  noteBest(index, score, time) {
    const b = this.best || (this.best = this.loadBest());
    const cur = b.levels[index];
    const better = !cur || score > cur.score;
    b.levels[index] = { score: Math.max(score, cur ? cur.score : 0), time: cur ? Math.min(time, cur.time) : time };
    try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (err) { /* nothing to be done */ }
    return better;
  }
  // How many runs this browser has begun (NEW GAME, RUN AGAIN; never a LEVELS start) and how many of
  // them got out, kept with the BEST board so no NEW GAME clears it. The win card says the run it
  // took rather than a score (30 Sep 2026 playtest: "at the end show the number of runs").
  noteRunStart() {
    const b = this.best || (this.best = this.loadBest());
    b.runs = (b.runs || 0) + 1;
    try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (err) { /* nothing to be done */ }
  }
  noteEscape() {
    const b = this.best || (this.best = this.loadBest());
    b.escapes = (b.escapes || 0) + 1; b.runs = Math.max(b.runs || 0, 1);
    try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (err) { /* nothing to be done */ }
    return b;
  }
  noteRunBest(total) {
    const b = this.best || (this.best = this.loadBest());
    if (total <= (b.run || 0)) return false;
    b.run = total;
    try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (err) { /* nothing to be done */ }
    return true;
  }
  // The run in localStorage, best-effort: a browser that refuses storage simply never offers CONTINUE.
  loadRun() {
    try {
      const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || s.v !== 1 || !(s.level >= 0) || s.level >= LEVELS.length) return null;
      return s;
    } catch (err) { return null; }
  }
  saveRun() {
    // A run started off LEVELS is practice on one floor: it never touches the run under CONTINUE.
    if (this.runJumped) return;
    // CONTINUE comes back to the head of the floor, so the head is what is written, whenever the run
    // is written: a soul, a talisman or a tuft of mushrooms taken on this floor lies on it again when
    // the floor is rebuilt off the same seed, and writing them too let one soul be taken over and
    // over through the title. `deaths` is the live count (a death is saved the moment it happens).
    const boons = this.levelBoons || this.boons, art = this.levelArtifact === undefined ? this.artifact : this.levelArtifact;
    const trip = this.levelTripAt === undefined ? this.tripAt : this.levelTripAt;
    this.save = { v: 1, level: this.levelIndex, boons: boons.map((b) => b.id), totalKills: this.totalKills,
      deaths: this.deaths, score: this.totalScore, runSeed: this.runSeed, beastEarly: !!this.beastEarly, henHearts: this.henHearts || 0, tripAt: trip === undefined ? -1 : trip,
      darkAt: this.darkAt === undefined ? -1 : this.darkAt,
      beasts: this.beasts || {}, crowGift: this.levelCrowGift === undefined ? !!this.crowGift : !!this.levelCrowGift,
      artifact: art ? { id: art.id, tier: art.tier } : null, third: (this.levelTalRun && this.levelTalRun.third) || 0,
      bag: (this.levelTalRun && this.levelTalRun.bag) || 0,
      keys: this.levelRunKeys === undefined ? this.runKeys | 0 : this.levelRunKeys | 0, at: Date.now() };
    // And the middle gate, if this floor has held his place at it: CONTINUE comes back there.
    const cp = this.checkpoint;
    if (cp) this.save.gate = { level: cp.level, room: cp.room, boons: cp.boons.map((b) => b.id), artifact: cp.artifact,
      crowGift: cp.crowGift, tripAt: cp.tripAt, kills: cp.kills, time: cp.time, pet: cp.pet, keys: cp.keys };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch (err) { /* private mode: the run dies with the tab */ }
  }
  // The tab closed on the stairs or the clear card. The floor is behind him, so what it pays is paid
  // once (on the climb `levelCleared` has not run yet) and the save is the head of the NEXT floor, as
  // `nextCard` would have started it. Saving this floor again (with a death) rebuilt it under CONTINUE
  // and paid its kills, score, animals and heaven a second time.
  saveAhead() {
    if (this.runJumped) return;
    if (this.state === 'climb') {
      Motes.flush(this); Heaven.earn(this, TUNING.heaven.pay.floor); Heaven.reached(levelIndexOf(this.level.def) + 1); Heaven.floorCleared(this, this.levelIndex);
      this.totalKills += this.kills; this.totalScore += this.scoreFor(this.kills, this.timer, this.levelIndex, this.level.def);
    }
    const ni = this.levelIndex + 1;
    if (ni >= LEVELS.length) { this.clearRun(); if (!this.offBoard()) this.noteRunBest(this.totalScore); this.noteEscape(); return; }
    if (this.climbDark) { this.darkAt = ni; if (this.tripAt === ni) this.tripAt = -1; }
    this.levelIndex = ni; this.levelBoons = null; this.levelArtifact = undefined; this.levelTripAt = undefined; this.levelCrowGift = undefined; this.levelRunKeys = undefined;
    this.levelTalRun = this.talRun ? Object.assign({}, this.talRun) : null; this.checkpoint = null;
    this.saveRun();
  }
  clearRun() {
    this.save = null;
    try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* nothing to be done about it */ }
  }
  // The page's control line belongs to the game, not to the menu.
  onGoatDied() {
    const DC = TUNING.deathCam;
    // Burst or bleed: the gap between the last two hearts, kept per browser for the dev drawer.
    const hl = this.heartLog || [];
    this.lastGap = hl.length >= 2 ? hl[hl.length - 1] - hl[hl.length - 2] : null;
    if (this.lastGap !== null) {
      const st = this.deathStats(), burst = this.lastGap <= TUNING.dev.burstGap;
      st[burst ? 'burst' : 'bleed']++;
      try { localStorage.setItem(DEATH_KEY, JSON.stringify(st)); } catch (e) {}
    }
    this.deaths++; this.state = 'dead'; this.slowTimer = 1.4; Painting.quickRect = null;
    // What heaven has that is new (js/heaven.js `freshNews`): while there is any, the card offers only ASCEND.
    this.deathNews = this.showroomOn ? [] : Heaven.freshNews(this, true);
    { const by = this.goat.hurtBy; this.tipNext = { level: this.levelIndex, kind: !by ? null : typeof by === 'string' ? by : (by.kind === 'bearer' && by.champion ? 'brute' : by.kind === 'bearer' && by.shieldman ? 'shield' : by.kind === 'bearer' && by.thrower ? 'thrower' : by.kind), name: this.killedBy(by) }; }
    // Written now, not at the next floor's head: a death quit to the title from its own card left the
    // old count in the save, and CONTINUE rebuilt the very layout he had just died in.
    this.saveRun();
    // The pull-back owns the wait now: input stays locked for the whole of it, so the level behind
    // the card is what is on screen when TRY AGAIN finally means something.
    this.stateTimer = DC.delay + DC.zoomTime;
    this.audio.intensity = 0; this.audio.hunterAware = false; this.audio.sfxToll();
    this.audio.startMusicCue('death', this.levelIndex);
    // How far he got, in bloodied rooms behind him and rooms he never opened ahead, the whole level,
    // at whatever zoom fits it on screen, with his own line drawn across it. `drawShade`'s per-tile
    // vision freezes with him and would otherwise blot out everything he isn't standing on; it skips
    // itself for the rest of `state === 'dead'` and leaves the per-room fog (`drawUnseen`) to do the
    // job, which is exactly the seen/unseen split this screen is supposed to be showing.
    const r = this.renderer, lvl = this.level;
    this.pathTrail.push({ x: this.goat.x, y: this.goat.y });
    // The world buffer is a fixed 420x78 tiles regardless of how much of it a level actually used,
    // fitting this camera to that whole buffer fit it to rock that was never carved, which is why
    // the rooms he actually ran through used to read as a small, disconnected huddle off to one
    // side rather than as the run. Fit to the rooms themselves instead.
    const rx0 = Math.min(...lvl.rooms.map((rm) => rm.x)), rx1 = Math.max(...lvl.rooms.map((rm) => rm.x + rm.w));
    const ry0 = Math.min(...lvl.rooms.map((rm) => rm.y)), ry1 = Math.max(...lvl.rooms.map((rm) => rm.y + rm.h));
    this.deathCam = {
      t: 0,
      fromX: this.cam.x, fromY: this.cam.y, fromZoom: this.cam.zoom,
      toX: (rx0 + rx1) / 2 * TILE, toY: (ry0 + ry1) / 2 * TILE,
      toZoom: Math.min(r.vw / ((rx1 - rx0) * TILE), r.vh / ((ry1 - ry0) * TILE * TILT)) * DC.margin,
    };
    // What a death does NOT take is named, because a card that says you keep everything is the only
    // way the player finds out that he does. Anything found inside this level goes back in the room.
    // And what it does take, too: a soul spent on this floor goes back into it, and a card that
    // said NOTHING LOST over a pair of antlers that had just vanished was lying to him.
    // Past the middle gate, what he keeps is what he had at it (`holdGate`), and the button says where he goes.
    const gate = this.checkpoint && this.checkpoint.level === this.levelIndex ? this.checkpoint : null;
    const held = gate ? gate.boons : this.levelBoons || [], lost = Math.max(0, (this.boons || []).length - held.length);
    const souls = (k) => `${k} SOUL${k > 1 ? 'S' : ''}`;
    const kept = [held.length ? `${souls(held.length)} KEPT` : '', lost ? `${souls(lost)} LOST` : ''].filter(Boolean).join(' · ') || 'NOTHING LOST';
    // The level is on the card because a death is where somebody puts the game down, and the next
    // time they pick it up the one thing they will not remember is how far in they were.
    const lv = this.level.def || {};
    // What took the last heart goes where the try-again line was: a death you cannot name is one
    // you cannot learn from, and every player already knows a click starts the level again.
    const by = this.killedBy(this.goat.hurtBy);
    this.lastCode = this.runCode(this.goat.hurtBy);
    Stats.close(this, 'death');   // the game's loop: a life ends here, and its report goes out
    // The bodies and the souls kept are the purse's own pictures on the painted card (`tally`,
    // `Painting.drawDeath`, 2 Oct 2026 playtest); the words name only what was lost and who did it.
    const said = [lost ? `${souls(lost)} LOST` : '', by ? `KILLED BY ${by}` : ''].filter(Boolean).join(' · ');
    this.card = { code: this.lastCode, lines: ['DIED', `${this.kills} sacrificed`, `LEVEL ${this.levelIndex + 1} · ${lv.name || ''}`,
      by ? `${kept} · KILLED BY ${by}` : kept], tally: { kills: this.kills, kept: held.length, said }, dim: 0.55, size: 40, small: 2, color: PALETTE.blood,
      // who (or what) it was, drawn over that line, and the button that starts the level again
      killer: by ? this.goat.hurtBy : null, go: this.showroomOn ? 'TRY AGAIN' : 'ASCEND', map: true };
    // The floor as far as he got, painted like the clear card's (`Painting.drawDeath`); with no
    // picture the card is the old words over the pull-back.
    this.deathPainting = null;
    try { this.deathPainting = Painting.bake(this); } catch (err) { console.error(err); }
    this.shake(12, true); this.vibe(70);
  }
  // One line a playtester can paste into a form: enough to stand on the same floor again
  // (`replayCode`) and to say what happened on it, with no server behind it. Build, level (T for the
  // trip), run seed, deaths (both are in `levelSeed`), room, kills, time, souls, what took the last
  // heart and the gap before it (G, seconds), and the level's first body with its cause and second, the "a kill before I touched
  // anyone" report had nothing to go on but a number. The level letter is N for THE DARK, and the last
  // token is how the run was played, E easy, X god mode on, J started off LEVELS, `-` none of those,
  // because a run code that cannot tell a god-mode run from a real one skews every number it is in.
  runCode(by) {
    const d = this.level.def || {}, fk = this.firstKill;
    // The butcher's token stays `brute` (his name until 1.72): `butcher` is the ogre's kind, and a
    // code that said it for both could not tell the ogre from the man with the cleaver.
    const who = !by ? '-' : typeof by === 'string' ? by : (by.kind === 'bearer' && by.champion ? 'brute' : by.kind === 'bearer' && by.shieldman ? 'shield' : by.kind === 'bearer' && by.thrower ? 'thrower' : by.kind);
    const gap = by && this.lastGap !== null && this.lastGap !== undefined ? 'G' + this.lastGap.toFixed(1) : '-';
    const flags = (this.settings && this.settings.easy ? 'E' : '') + (this.dev && this.dev.god ? 'X' : '') + (this.runJumped ? 'J' : '');
    return ['v' + BUILD, (d.shroom ? 'T' : d.dark ? 'N' : 'L') + (this.levelIndex + 1), (this.runSeed >>> 0).toString(36), 'D' + (this.seedDeaths || 0),
      'R' + (this.goatRoom || 0), 'K' + this.kills, Math.round(this.timer) + 's', 'S' + this.boons.length, who, gap,
      fk ? `${fk.kind}/${fk.cause}@${Math.round(fk.t)}` : '-', flags || '-'].join(' ');
  }
  // The click that leaves a death or the win card also puts its code on the clipboard, so the form
  // asks for a paste rather than a transcription. Refused (no activation, a locked frame) is silent.
  copyCode() {
    if (!this.lastCode) return;
    try { navigator.clipboard.writeText(this.lastCode).catch(() => {}); } catch (e) {}
  }
  // Dev: stand on the floor a run code names. Same seed, level and death count, so the same layout;
  // the souls are dealt afresh, as LEVELS deals them.
  replayCode(code) {
    const t = String(code).trim().split(/\s+/);
    // A code cut short or mistyped is refused, not half-read into `LEVELS[NaN]`.
    const li = t[1] ? parseInt(t[1].slice(1), 10) - 1 : NaN, deaths = t[3] ? parseInt(t[3].slice(1), 10) || 0 : 0;
    if (!(li >= 0 && li < LEVELS.length) || !t[2]) { console.warn('replayCode: not a run code', code); return false; }
    this.askedSeed = parseInt(t[2], 36) >>> 0;
    this.startAtLevel(li, t[1][0] === 'T', t[1][0] === 'N');
    if (deaths) { this.deaths = deaths; this.startLevel(li, this.levelSeed(li), true, false); }
  }
  deathStats() {
    try { const v = JSON.parse(localStorage.getItem(DEATH_KEY) || 'null'); if (v && typeof v.burst === 'number') return v; } catch (e) {}
    return { burst: 0, bleed: 0 };
  }
  // The name on the death card for whatever the goat's last heart went to: a man, or the room.
  killedBy(by) {
    if (!by) return null;
    if (typeof by === 'string') return KILLED_BY[by] || null;
    const name = by.kind === 'bearer' ? (by.champion ? 'BUTCHER' : by.shieldman ? 'SHIELDMAN' : by.thrower ? 'THROWER' : 'CLUBMAN') : KILLED_BY[by.kind];
    if (!name) return null;
    return (by.boss || by.kind === 'butcher' || by.kind === 'ratogre' ? 'THE ' : /^[AEIOU]/.test(name) ? 'AN ' : 'A ') + name;
  }
  levelCleared() {
    if (!this.showroomOn) { Motes.flush(this); Heaven.earn(this, TUNING.heaven.pay.floor); Heaven.reached(levelIndexOf(this.level.def) + 1); Heaven.floorCleared(this, this.levelIndex); }
    this.showroomOn = false;
    Stats.cleared(this);
    this.state = 'clear'; this.totalKills += this.kills;
    const score = this.scoreFor(this.kills, this.timer, this.levelIndex, this.level.def);
    this.totalScore += score;
    // THE DARK keeps its own best, beside the floor whose place it takes (LEVELS reads `dark`).
    // Not a LEVELS run (practice, souls dealt at random: "nothing about it touches the board") and
    // not THE TRIP, which is an easier floor standing in this one's place and wrote this one's record.
    // Nor an easy or god-mode clear (their run codes carry E / X): six hearts and a slower cult, or
    // no death at all, is a different board.
    const def = this.level.def, key = def.shroom ? null : def.dark ? 'dark' : this.levelIndex;
    const best = key === null || this.runJumped || this.offBoard() ? false : this.noteBest(key, score, this.timer);
    this.audio.intensity = 0; this.audio.hunterAware = false; this.audio.sfxCard();
    this.audio.startMusicCue('clear', this.levelIndex);
    this.cardQueue = [
      // The cult's two cards ("Do you want sacrifices?") are gone (2 Oct 2026 playtest: not at the end of a floor).
      ...(this.henSaved ? [{ lines: ['THE HEN CAME WITH YOU', '', `+${TUNING.prop.chicken.saveHearts} HEART FOR THE REST OF THE RUN`],
        dim: 0.8, size: 34, small: 2, time: 1.8, color: PALETTE.hen }] : []),
      // And each escort that walked out with him (js/beasts.js). One card each, because what one is
      // worth is the only place the player ever finds out that nursing it across the floor paid.
      // A kind with no card of its own is skipped, never read off undefined: a throw here costs the
      // whole clear card, the painting included.
      ...((this.beastSaved || []).filter((k) => BEAST_CARD[k]).map((k) => ({
        lines: [BEAST_CARD[k][0], '', BEAST_CARD[k][1]],
        dim: 0.8, size: 34, small: 2, time: 1.8, color: PALETTE.hen,
      }))),
      // The level's own score, under the picture of the floor it was earned on (`js/painting.js`):
      // what the time was worth, what the bodies did to it, and the paint they left. This one card
      // waits for a press, because it is the one worth a second look and SAVE is on it.
      { painting: true, code: this.runCode(null), lines: [], score, best, run: this.totalScore, time: TUNING.painting.arm, color: best ? PALETTE.fireHi : null },
    ];
    this.pathTrail.push({ x: this.goat.x, y: this.goat.y });
    Painting.status = null;
    try { this.painting = Painting.bake(this); } catch (err) { console.error(err); this.painting = null; }
    if (!this.painting) this.cardQueue.pop();   // no picture, no card for it: the run goes on
    this.nextCard();
    // The next floor's sheets, baked behind the first card rather than on the next floor's first
    // frame, the flight he climbed decides it the way `nextCard` will.
    const ni = this.levelIndex + 1;
    if (ni < LEVELS.length) this.warmFloor(this.climbDark ? darkLevel() : this.tripAt === ni ? tripLevel(ni) : LEVELS[ni], 250);
  }
  // A floor's sheets painted `delay` ms from now (`PaintedArt.warmLevel`), tried again a few times
  // while the atlas is still loading. Only ever early: `prepare` bakes whatever this has not.
  warmFloor(def, delay, tries = 8) {
    setTimeout(() => {
      try { if (!this.renderer.painted.warmLevel(def) && tries > 0) this.warmFloor(def, 400, tries - 1); } catch (err) { /* baked on its first frame */ }
    }, delay);
  }
  nextCard() {
    // Leaving the picture copies the floor's code, the way leaving a death card does.
    if (this.card && this.card.painting && this.card.code) { this.lastCode = this.card.code; this.copyCode(); }
    const c = this.cardQueue.shift();
    if (c) { this.card = c; this.stateTimer = c.time; if (c.color) this.audio.sfxCard(); return; }
    // The dark flight of THE FORK climbs to THE DARK, in the next floor's place; saved with the run.
    // The flight he climbed is the later choice, so it beats a tuft of mushrooms eaten on the way: the
    // trip was the lit floor's, and down in the dark it is spent (`startLevel` asks the trip first).
    if (this.climbDark && this.levelIndex + 1 < LEVELS.length) {
      this.darkAt = this.levelIndex + 1;
      if (this.tripAt === this.darkAt) this.tripAt = -1;
    }
    if (this.levelIndex + 1 < LEVELS.length) this.startLevel(this.levelIndex + 1, this.levelSeed(this.levelIndex + 1), true);
    else {
      // `stateTimer`: a beat before the card takes a press, as the death card waits, the second half
      // of a double click on the picture's CONTINUE started a new run before this was ever read.
      this.state = 'win'; this.stateTimer = 0.8; if (!this.runJumped) this.clearRun();
      if (!this.runJumped && !this.offBoard()) this.noteRunBest(this.totalScore);
      const b = this.runJumped ? (this.best || this.loadBest()) : this.noteEscape();
      this.lastCode = this.runCode(null);
      Stats.close(this, 'win');
      // The run it took, not a score (playtest, 30 Sep 2026): the score is still kept on the board.
      const runs = Math.max(1, b.runs || 1), esc = b.escapes || 0;
      this.card = { code: this.lastCode, lines: ['THE GOAT ESCAPED.', this.runJumped ? 'A PRACTICE RUN' : `ON RUN ${runs}`,
        `${this.deaths} death${this.deaths === 1 ? '' : 's'} on the way · ${this.totalKills} sacrificed`,
        this.runJumped ? '' : esc <= 1 ? 'THE FIRST TIME OUT' : `OUT ${esc} TIMES`], dim: 1, size: 40, small: 2, go: this.runJumped ? 'BACK TO THE TITLE' : 'RUN AGAIN' };
    }
  }

  // ---------- the opening scene ----------
  // The goat and his wife in the pen, the two who come for her, the mage who takes her and the
  // clubman who puts the goat down (26 Sep 2026: the same mage is met again at the first gate,
  // `watchBless`), and the club. It runs in the real first room with the real pen; the two are
  // ordinary enemies moved by hand, she and the heart belong to `this.intro` alone. Nothing here touches the simulation: when the light comes back the
  // goat is lying where he fell, the gate is up, and the level is exactly the one you would have got.
  beginIntro() {
    const I = TUNING.intro, lv = this.level, S = lv.start, room = lv.rooms[0];
    const hw = TUNING.prop.cage.halfW * TILE;
    // the corridor leaves through the right wall: the first open tile in it is where they come from
    const col = room.x + room.w - 1; let doorTy = room.y + (room.h >> 1);
    for (let ty = room.y + 1; ty < room.y + room.h - 1; ty++) if (lv.tiles[ty * lv.W + col] !== T.WALL) { doorTy = ty; break; }
    const door = { x: (col + 1.5) * TILE, y: (doorTy + 1) * TILE };
    // They came in this way: a plank door hung in the pen's corridor stands open behind them, rather
    // than shut with the mage, her and the clubman walked through it (1 seed in 15 put one there).
    for (const p of this.props) if (p.kind === 'door' && !p.gate && !p.seal && !p.stair && !p.vault
      && p.x > col * TILE && p.x < door.x + 6 * TILE && Math.abs(p.y - door.y) < 2 * TILE) p.open = 1;
    const man = (x, y, kind) => {
      // One heart each, so the mage (two as a kind) wears no notches in a scene.
      const e = new Enemy(x, y, kind); e.scripted = true; e.aware = true; e.state = 'chase'; e.facing = Math.PI; e.hp = e.maxHp = 1;
      this.enemies.push(e); return e;
    };
    const g = this.goat;
    g.x = S.x - 24; g.y = S.y + 4; g.facing = 0; g.vx = 0; g.vy = 0; g.state = 'idle';
    this.intro = {
      t: 0, phase: 'huddle', timer: 0, fade: 0, starsA: 0, echo: 0, cardA: 0, bleat: 0.7, turn: 0, S, hw, door,
      sheep: { x: S.x + 24, y: S.y + 4, facing: Math.PI, held: null, kick: 0, gone: false, bleating: 0, jitter: null, vx: 0, vy: 0 },
      heart: { x: S.x, y: S.y - 26, pulse: 1, broken: 0 },
      mage: man(door.x + TILE, door.y, 'seer'), club: man(door.x + 2.4 * TILE, door.y + 10, 'bearer'),
      gate: this.props.filter((p) => p.kind === 'cage' && !p.deco && p.axis === 'v' && p.x > S.x),
      // where they stand at the gate, the corner they round to keep clear of the other cage, the way
      // round the goat to her, and where they take hold of her
      stand: { x: S.x + hw + 26, y: S.y + 6 }, stand2: { x: S.x + hw + 58, y: S.y + 26 }, bend: { x: S.x + hw + 90, y: S.y + 24 },
      way: [{ x: S.x + 30, y: S.y - 30 }, { x: S.x - 8, y: S.y - 36 }], grabAt: { x: S.x - 26, y: S.y - 16 },
      hit: false,
    };
    this.cam.x = S.x + 12; this.cam.y = S.y; this.cam.zoom = this.renderer.zoomFit * I.zoom;
    this.state = 'intro'; this.card = null;
    // The three screens before the pen. They have their own clock, so `it.t`, which paces the
    // camera creep and the skip prompt once the pen is on screen, does not start until the pen
    // is. The two of them are lightweight stand-ins for the sprites: the renderer draws them with
    // the same `drawGoat` / `drawSheep` the pen uses, so they are the same animals.
    const actor = (x, y, facing) => ({ x, y, facing, vx: 0, vy: 0, state: 'idle', trail: [], jitter: null,
      dazed: 0, invuln: 0, hp: 4, maxHp: 4, onFire: false, witchFire: false, timer: 0, rollSpin: 0, kick: 0, bleating: 0 });
    const R = I.prologue.roam;
    this.intro.pro = { t: 0, sceneT: 0, bleat: 1.2, turn: 0, engine: 0, goat: actor(R.goat[0], R.goat[1], 0), ewe: actor(R.ewe[0], R.ewe[1], Math.PI) };
    this.introPhase('meadow');
  }

  // Which phases are the prologue: the pen's own clock and camera stay frozen through them.
  inPrologue() { const p = this.intro && this.intro.phase; return p === 'meadow' || p === 'road' || p === 'dark' || p === 'cloth'; }

  // Moves anything with a `path` of points along it at `speed`; true once the path is used up.
  followPath(e, speed, dt) {
    if (!e.path || !e.path.length) { e.vx = 0; e.vy = 0; return true; }
    const t = e.path[0], dx = t.x - e.x, dy = t.y - e.y, d = hyp(dx, dy), step = speed * dt;
    if (d <= step) { e.x = t.x; e.y = t.y; e.path.shift(); if (!e.path.length) { e.vx = 0; e.vy = 0; return true; } return false; }
    e.x += dx / d * step; e.y += dy / d * step; e.facing = Math.atan2(dy, dx); e.vx = dx / d * speed; e.vy = dy / d * speed;
    return false;
  }
  // A scripted line, outside the crowd rules that `bark` enforces.
  say(e, text) { e.say = { text, life: 2.2, max: 2.2 }; }

  introPhase(name) {
    const it = this.intro, I = TUNING.intro; it.phase = name; it.timer = 0;
    if (name === 'approach') { it.mage.path = [it.bend, it.stand]; it.club.path = [{ x: it.bend.x, y: it.bend.y + 8 }, it.stand2]; }
    else if (name === 'grab') it.mage.path = [it.way[0], it.way[1], it.grabAt];
    else if (name === 'fade') this.audio.duck(I.duck, I.fade);
    else if (name === 'wake') this.audio.duck(1, I.wake * 0.8);
    if (it.pro) it.pro.sceneT = 0;
  }

  // ---------- the prologue: a meadow, a truck, the dark, and the sacking coming off ----------
  // Three screens with nothing in them but the two of them and the sound they make. What changes
  // from one to the next is how often they call and how frightened it sounds, and that is the
  // whole of the storytelling: the pen scene that follows is the same two animals a minute later.
  updatePrologue(dt) {
    const I = TUNING.intro, P = I.prologue, it = this.intro, pr = it.pro, ph = it.phase;
    pr.t += dt; pr.sceneT += dt;
    const gt = pr.goat, ew = pr.ewe;
    if (ph === 'meadow') {
      // Two halves. First each of them grazes his own end of the field: a walk in a straight line
      // to a spot, a stop, another spot. From `meet` both walk to the middle, turn to each other,
      // and the heart comes up between them. Nothing in this screen is in a hurry, but a walk is
      // always at the pace the sprites step at, so nothing slides.
      const R = P.roam, together = pr.sceneT >= P.meet;
      const walk = (o, home, spot) => {
        const w = o.walk || (o.walk = { x: o.x, y: o.y, wait: Math.random() * P.graze[1] });
        if (spot && !w.spot) { w.spot = true; w.x = spot.x; w.y = spot.y; w.wait = 0; }
        o.kick = 0;
        if (w.wait > 0) { w.wait -= dt; o.vx = o.vy = 0; return false; }
        const dx = w.x - o.x, dy = w.y - o.y, d = hyp(dx, dy), step = P.walk * dt;
        if (d > step) {
          o.vx = dx / d * P.walk; o.vy = dy / d * P.walk; o.x += dx / d * step; o.y += dy / d * step;
          o.facing = Math.atan2(dy, dx); return false;
        }
        o.x = w.x; o.y = w.y; o.vx = o.vy = 0;
        if (w.spot) { o.facing = spot.face; return true; }
        // the next spot: somewhere else in his end, far enough off to be a walk and not a shuffle
        w.wait = lerp(P.graze[0], P.graze[1], Math.random());
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2, r = 0.35 + Math.random() * 0.65;
          w.x = home[0] + Math.cos(a) * R.rx * r; w.y = home[1] + Math.sin(a) * R.ry * r;
          if (hyp(w.x - o.x, w.y - o.y) > R.rx * 0.6) break;
        }
        return false;
      };
      const mid = (R.goat[1] + R.ewe[1]) / 2;
      const gIn = walk(gt, R.goat, together && { x: -P.meetAt, y: mid, face: 0 });
      const eIn = walk(ew, R.ewe, together && { x: P.meetAt, y: mid - 2, face: Math.PI });
      pr.met = pr.met || (gIn && eIn);
      // the heart, once they stand together: the same heart the pen has
      if (pr.met) {
        pr.heartA = Math.min(1, (pr.heartA || 0) + dt / P.heartIn);
        const b = (pr.t * 1.15) % 1, beat = (o) => Math.pow(Math.max(0, Math.sin(b * Math.PI * 2 - o)), 3);
        pr.heart = { x: (gt.x + ew.x) / 2, y: Math.min(gt.y, ew.y) - 40 + Math.sin(pr.t * 2) * 1.5,
          pulse: 1 + 0.16 * beat(0) + 0.1 * beat(1.3), broken: 0, a: pr.heartA };
      }
      if (pr.sceneT >= P.meadow) this.introPhase('road');
    } else if (ph === 'road') {
      // In the cage on the flatbed. The truck jolts and they jolt with it, and they are turned to
      // each other now rather than off on their own lines.
      const j = Math.sin(pr.t * 9.3) * P.bounce + Math.sin(pr.t * 23.7) * P.bounce * 0.35;
      pr.jolt = j;
      // They stand on the bed, so they ride its jolt (the renderer lifts the whole truck by it) and
      // add none of their own: a bounce of their own twice the truck's, and a shiver on top of it,
      // had them floating off the boards.
      gt.x = -16; gt.y = 6; gt.facing = 0.15; gt.vx = 0; gt.vy = 0; gt.kick = 0; gt.jitter = null;
      ew.x = 18; ew.y = 2; ew.facing = Math.PI - 0.15; ew.vx = 0; ew.vy = 0; ew.kick = 0; ew.jitter = null;
      pr.engine -= dt;
      if (pr.engine <= 0) { pr.engine = 0.5; this.audio.sfxEngine(); }
      if (pr.sceneT >= P.road) this.introPhase('dark');
    } else if (ph === 'dark') {
      // Nothing to see. The bleats are all there is, and they are close together now.
      gt.jitter = null; ew.jitter = null;
      if (pr.sceneT >= P.dark) this.introPhase('cloth');
    } else if (ph === 'cloth') {
      // The pen, and the sacking coming off it. The pen's actors take over from here.
      if (pr.sceneT >= P.cloth) { it.pro = null; this.introPhase('huddle'); return; }
    }
    // The through-line. Softer and further apart in the field, closer and louder on the road, and
    // in the dark it is one animal answering the other with nothing between them.
    if (ph !== 'cloth') {
      const gap = P.bleat[ph], loud = ph === 'dark' ? 2 : ph === 'road' ? 1 : 0;
      pr.bleat -= dt;
      if (pr.bleat <= 0) {
        pr.turn ^= 1;
        // Apart, each calls on his own clock and nobody answers. Once they have met, a call gets
        // its answer `answer` seconds later, and then the pair of them wait, so what the ear hears
        // change across the screen is not the volume but that the second voice has started to
        // come back for the first.
        const answering = (pr.met || ph !== 'meadow') && pr.turn === 0;
        pr.bleat = answering ? P.answer : gap * (0.7 + Math.random() * 0.6);
        const word = pr.turn ? ['baah', 'b-baah', 'BAAH!'][loud] : ['beeh', 'b-beeh', 'BEEH!'][loud];
        const who = pr.turn ? gt : ew;
        pr.last = { who: pr.turn ? 'goat' : 'ewe', word, life: 1.2, x: who.x, y: who.y };
        if (pr.turn) this.audio.sfxBleat(300, [0.07, 0.1, 0.16][loud], [0.34, 0.3, 0.28][loud]);
        else { this.audio.sfxBleat(470, [0.06, 0.09, 0.14][loud], [0.3, 0.27, 0.25][loud]); ew.bleating = 0.3; }
      }
    }
    if (pr.last) { pr.last.life -= dt; if (pr.last.life <= 0) pr.last = null; }
    ew.bleating = Math.max(0, ew.bleating - dt);
  }

  // ---------- loop ----------
  frame(t) {
    const work0 = performance.now(), gap = (t - this.last) / 1000;
    const dtReal = Math.min(0.1, gap); this.last = t;
    // SHOW FPS (`settings.fps`): counted over half a second, frames, the longest gap between two,
    // and the most the game's own update and draw took (`this.fps`, drawn by `Renderer.drawFps`).
    const F = this.fpsCount || (this.fpsCount = { n: 0, t: 0, worst: 0, work: 0 });
    F.n++; F.t += gap; F.worst = Math.max(F.worst, gap);
    if (F.t >= 0.5) { this.fps = { rate: F.n / F.t, worst: F.worst * 1000, work: F.work }; F.n = 0; F.t = 0; F.worst = 0; F.work = 0; }
    this.slowTimer = Math.max(0, this.slowTimer - dtReal);
    const wantSlow = this.slowTimer > 0 || this.state === 'dead';
    // COLD EYE: real seconds, so the moment to aim is the same length however slow it makes the
    // world. It lives only while something is still in his mouth, the throw is what ends it.
    const eye = this.mods && this.mods.coldEye;
    this.aimSlowCd = Math.max(0, (this.aimSlowCd || 0) - dtReal);
    if (this.aimSlow > 0) this.aimSlow = eye && this.state === 'play' && this.goat && this.goat.holding ? Math.max(0, this.aimSlow - dtReal) : 0;
    this.timeScale += ((wantSlow ? 0.32 : this.aimSlow > 0 ? eye.scale : 1) - this.timeScale) * (1 - Math.exp(-7 * dtReal));
    this.acc += dtReal * this.timeScale;
    const step = 1 / 60;
    // The pad has no events: it is read here, once, and what it pressed waits in `input` for the
    // next step the way a key's press does.
    this.pollPad(dtReal);
    let n = 0;
    const t1 = performance.now();
    while (this.acc >= step && n < 5) { this.update(step); this.acc -= step; n++; }
    if (n === 5) this.acc = 0;
    const t2 = performance.now();
    this.audio.updateScene(this, dtReal);
    this.renderer.configure(this.touch.active);
    this.layoutTouch();
    TextEdit.begin();
    this.renderer.draw(this, dtReal);
    TextEdit.end(this.renderer.ctx);
    const t3 = performance.now();
    F.work = Math.max(F.work, t3 - work0);
    this.adaptRes(t3 - work0, dtReal);
    // Straight after the picture: photo mode reads the canvas, the dip log writes down a long frame (js/photo.js).
    Photo.after(this, dtReal);
    Photo.dipCheck(this, gap * 1000, t3 - work0, t2 - t1, t3 - t2, dtReal);
    if (this.hurt) this.hurt.life -= dtReal;
    if (this.hurtVignette) this.hurtVignette.life -= dtReal;
    this.updateCursor();
  }
  // Adaptive resolution (`TUNING.perf.adapt`): fewer canvas pixels while the frame's own work stays over
  // budget in play, a step back once it has room. A drop is checked: if the work did not fall by `gain`
  // the pixels were not the cost (a slow script, not the raster) and it is undone for good.
  adaptRes(work, dt) {
    const Q = TUNING.perf.adapt, r = this.renderer;
    if (!Q.on || this.state !== 'play' || !r) return;
    // Not off the fallback interval (a hidden pane, a background tab) nor in a floor's first seconds.
    if ((typeof document !== 'undefined' && document.hidden) || performance.now() - this.lastRaf > 100 || (this.timer || 0) < Q.settle) return;
    const a = this.perfAdapt || (this.perfAdapt = { work, hold: 0, before: 0, off: false });
    a.work += (work - a.work) * Math.min(1, dt); a.hold += dt;
    if (a.off) return;
    const q = r.quality || 1;
    // Judged `wait` s after a drop: the work before it is in `before`.
    if (a.before && a.hold > Q.wait) {
      if (a.work > a.before * (1 - Q.gain)) { r.quality = Math.min(1, q + Q.step); r.resize(); a.off = true; }
      a.before = 0; a.hold = 0; return;
    }
    // A drop straight after a step back means the room it had was the lower setting's: stay there.
    if (a.work > Q.slow && a.hold > Q.wait && q > Q.min) { if (a.raised) a.noUp = true; a.raised = false; a.before = a.work; r.quality = Math.max(Q.min, q - Q.step); r.resize(); a.hold = 0; }
    else if (!a.noUp && a.work < Q.fast && a.hold > Q.waitUp && q < 1) { a.raised = true; r.quality = Math.min(1, q + Q.step); r.resize(); a.hold = 0; }
  }
  // The OS pointer rather than a drawn one: the goat's own head, aimed at something to hit, and a
  // closed hand once there is something in his mouth to let go of instead of a wall to put his
  // skull into. A plain `crosshair` was the one cursor in the whole game regardless of what he was
  // carrying; `CURSOR_GOAT` still falls back to it if the browser can't render the inline SVG.
  updateCursor() {
    // With a pad in hand the pointer means nothing and would sit wherever the mouse was left.
    // So does it while the keys hold the aim (`kbLive`, KEYBOARD ONLY): the run is the aim then.
    const keys = kbOn(this) && (this.state === 'play' || this.state === 'heaven');
    const want = this.pad.active || keys ? 'none' : this.state === 'play' && this.goat && this.goat.holding ? 'grabbing' : buttCursor();
    // Compared against what we last wrote, never read back: the browser hands `url(...)` back quoted,
    // so the read never matched and a few KB of data URL were written over again every frame.
    if (this.cursorSet !== want) { this.cursorSet = want; this.canvas.style.cursor = want; }
  }

  update(dt) {
    // The RULES page holds everything where it is: a dev reading a table should not be clubbed.
    if (this.dev.rules) { this.clearEdges(); return; }
    // Nothing ages: no goat, no enemy, no timer, no camera. RESUME is not a second `startLevel`, it
    // is simply letting this function run again from the exact frame Escape stopped it on. The
    // mouse still gets to choose what it is hovering, the same courtesy the title menu gives it.
    if (this.state === 'paused') {
      if (!this.touch.active) {
        if (!this.mouseMoved) { /* the keys have the row until the mouse moves (see `updateTitle`) */ }
        else if (this.menu.panel === 'settings' || (this.menu.panel === 'controls' && !(this.menu.bindWait >= 0))) { const i = this.menuAt(this.input.mouse); if (i >= 0) this.menu.sub = i; }
        else if (this.menu.panel !== 'book') { const i = this.pauseAt(this.input.mouse); if (i >= 0) this.pause.index = i; }
        this.mouseMoved = false;
      }
      this.clearEdges(); return;
    }
    this.readMoveInput();
    // legs tied (the rabbit's bargain, js/beasts-more.js): no stride, only the hop, the horns and the rest
    // The rabbit gone (dead, walled in), the bargain can no longer pay: the legs come free.
    if (this.legsTied && (this.legsTied.p.broken || this.legsTied.p.dead || !this.props.includes(this.legsTied.p))) { this.legsTied = null; this.applyBoons(); }
    if (this.legsTied && this.state === 'play') { this.input.mx = 0; this.input.my = 0; }
    if (this.state === 'title') { this.updateTitle(dt); this.clearEdges(); return; }
    if (this.state === 'intro') { this.updateIntro(dt); this.clearEdges(); return; }
    if (this.state === 'heaven') { Heaven.update(this, dt); this.clearEdges(); return; }   // js/heaven.js
    if (this.state === 'climb') { this.updateClimb(dt); this.clearEdges(); return; }
    if (this.state === 'card') { this.stateTimer -= dt; this.updateEffects(dt); if (this.stateTimer <= 0) { this.card = null; this.state = this.awayNow && this.autoPause !== false ? 'paused' : 'play'; if (this.state === 'paused') { this.pause.index = 0; this.menu.panel = null; } } }
    if (this.state === 'dead') {
      this.stateTimer -= dt; this.updateEffects(dt);
      if (this.deathCam) this.updateDeathCam(dt);
      // RESTART on the card (`Painting.drawDeath`): the floor again at once, heaven skipped; Backspace is the same.
      if (this.input.lmbPressed && Painting.onQuick(this.input.mouse)) { Painting.quickRect = null; this.copyCode(); this.restartLevel(); this.clearEdges(); return; }
      // Up to the pasture above (js/heaven.js); its edge is the way back down. THE SHOWROOM, a dev
      // floor, goes straight round again.
      if (this.stateTimer <= 0 && (this.input.lmbPressed || this.input.spacePressed)) { this.copyCode(); if (this.showroomOn) this.restartLevel(); else Heaven.enter(this); }
      this.clearEdges(); return;
    }
    if (this.state === 'clear') {
      this.stateTimer -= dt; this.updateEffects(dt);
      if (!(this.card && this.card.painting)) { if (this.stateTimer <= 0) this.nextCard(); }
      else if (this.stateTimer <= 0 && (this.input.lmbPressed || this.input.spacePressed)) {
        if (this.input.lmbPressed && Painting.onSave(this.input.mouse)) Painting.save(this); else this.nextCard();
      }
      this.clearEdges(); return;
    }
    if (this.state === 'boon') { this.boonArm = Math.max(0, this.boonArm - dt); this.boonT = (this.boonT || 0) + dt; this.watchBoonMorph(); this.updateEffects(dt); this.clearEdges(); return; }
    // A LEVELS practice win goes back to the title: RUN AGAIN from it started a real run whose first
    // save wrote over the run waiting under CONTINUE (LEVELS promises to touch no save).
    if (this.state === 'win') { this.stateTimer -= dt; if (this.stateTimer <= 0 && (this.input.lmbPressed || this.input.spacePressed) && this.runJumped) { this.copyCode(); this.showTitle(); }
    else if (this.stateTimer <= 0 && (this.input.lmbPressed || this.input.spacePressed)) { this.copyCode(); this.forgetLessons(); this.noteRunStart(); this.totalKills = 0; this.deaths = 0; this.totalScore = 0; this.henHearts = 0; this.beasts = {}; this.crowGift = false; this.runKeys = TUNING.keys.start; this.runSeed = (Math.random() * 1e9) | 0; this.startLevel(0, this.levelSeed(0), false, true); } this.clearEdges(); return; }
    if (this.state !== 'play') { this.clearEdges(); return; }

    // The edges are kept through the freeze, not cleared: a headbutt or a roll pressed in the beat a
    // kill holds the frame is what `goat.buffer` exists for, and clearing them here threw it away.
    if (this.hitstopTimer > 0) { this.hitstopTimer -= dt; return; }
    // The mage at the first gate (`watchBless`): while he is on, nothing else moves, the clock included.
    if (this.bless && (this.bless.on || this.watchBless())) { this.updateBless(dt); this.clearEdges(); return; }
    // An animal saying its terms in a box (`Beast.talk`): the floor waits for the page to be turned.
    if (this.beastTalk) { Beast.updateTalk(this, dt); this.clearEdges(); return; }
    // SECOND CHANCE: his soul up and back down into him, the floor held (js/motes.js).
    if (this.revive) { Motes.updateRevive(this, dt); this.clearEdges(); return; }
    // The mouse's offer as cards (js/codex.js): the floor waits while it is up.
    if (this.shopDlg) { Codex.updateShop(this, dt); this.clearEdges(); return; }
    if (Codex.watchShop(this)) { this.clearEdges(); return; }
    this.timer += dt;
    if (this.tip) this.tip.t += dt;   // written on the floor for the whole floor (`Renderer.drawHints`)
    Motes.update(this, dt);
    Beast.updateSong(this, dt);
    // DOUBLE SPEED OUT OF A FIGHT (SETTINGS): nobody awake and after him near (`TUNING.calmRun`).
    if (this.settings.fastCalm) {
      const R2 = (TUNING.calmRun.r * TILE) ** 2, g0 = this.goat;
      this.calmFast = !this.enemies.some((e) => !e.dead && !e.scripted && e.aware && e.woke && (e.x - g0.x) ** 2 + (e.y - g0.y) ** 2 < R2);
    } else this.calmFast = false;
    const w = this.world;
    w.flowTimer -= dt;
    if (w.flowTimer <= 0) {
      w.flowTimer = 0.15;
      // The route fields walk round the furniture where it stands now; the wide one only costs
      // anything while there is somebody awake who needs it.
      const wideR = TUNING.ai.path.wideR;
      w.wideWanted = this.enemies.some((e) => e.woke && !e.dead && e.r >= wideR);
      w.setFurniture(this.props);
      w.computeFlow(this.goat.x, this.goat.y);
    }

    this.revealRooms();
    this.runes.length = 0;
    // A dead mage paints nothing: leaving his last rune in the list left a patch of floor the whole
    // room went on stepping round for the rest of the level.
    for (const e of this.enemies) if (e.rune && !e.dead) this.runes.push(e.rune);
    if (this.level.def.shroom) {
      const real = this.input; this.input = this.tripInput(real);
      this.goat.update(dt, this);
      this.input = real;
    } else this.goat.update(dt, this);
    // A dot on the trail every `sampleGap` seconds rather than every step, so an hours-long level
    // does not grow this without bound. It is only ever read once, by the death screen's pull-back.
    this.pathTimer -= dt;
    if (this.pathTimer <= 0) { this.pathTimer = TUNING.deathCam.sampleGap; this.pathTrail.push({ x: this.goat.x, y: this.goat.y }); }
    // The floor stopped under him. Everything else waits while he goes down it.
    if (this.goat.state === 'falling') { this.updateFall(dt); this.updateEffects(dt); this.updateCamera(dt); this.clearEdges(); return; }
    // A goat in the air over a man (LEAPFROG) is over the hole too; he lands on floor or not at all.
    if (!this.goat.dead && !this.goat.leap && this.goat.state !== 'carried' && w.isPitPx(this.goat.x, this.goat.y)) { this.goatFalls(); this.clearEdges(); return; }
    // Nothing simulates two rooms away or further: the room he is in and the one next door still
    // patrol, chase and swing exactly as before, but a man past that has nobody to hear or see him
    // and nothing he does costs a frame. Room index is a fair proxy for distance because the
    // generator chains rooms in one line; this never touches the room the goat is actually in or
    // its immediate neighbour, so a man heard through a wall (see the note on that in CLAUDE.md)
    // is never one of the ones this skips.
    //
    // The room asked about here is wherever he is standing NOW, not `e.room` (where he was spawned):
    // a chase is explicitly let off the idle leash and can cross several rooms with the goat, and a
    // man who has done that is nowhere near his own spawn index any more. Checking `e.room` against
    // it froze him mid-stride the moment the run got far enough from wherever he started, a chaser
    // stopping dead on screen, and separately let him keep answering noise from a room that had
    // gone dark behind the fog, because his spawn room could still read as seen after he had walked
    // out of it. `e.room` itself is untouched: the sealed-room and soul-gate bookkeeping key off who
    // a man was PUT with, and that has to survive him stepping outside the doorway.
    // A corridor answers `roomAt` with nothing, and a -1 here used to switch the whole skip off:
    // every man on the floor woke up for as long as the goat stood between two rooms, which is both
    // a hitch you can feel and the opposite of what the rule says. The last room he was actually in
    // is what a corridor means, so that is what it falls back to.
    const curRoom = roomAt(this.level, this.goat.x, this.goat.y);
    const curIdx = curRoom ? curRoom.index : (this.goatRoom === undefined ? -1 : this.goatRoom);
    // A man lives once he has been on the screen, and not before: he is `woke` the first frame he
    // stands within `ai.wake` tiles of its edge, and from then on he is simulated like anybody else,
    // so a chase that runs off the side of the picture keeps running. Before this, a man in a room
    // big enough to run past the edge of the view heard, closed and shot from somewhere the player
    // had never seen him, which is a death with nothing to read in it. Something done TO him, a
    // throw, a fire, a mouth, wakes him too, because that only ever happens where he can be seen.
    const view = this.renderer.view(this.cam), wm = TUNING.ai.wake * TILE;
    const vx0 = this.cam.x - view.w / 2 - wm, vx1 = this.cam.x + view.w / 2 + wm;
    const vy0 = this.cam.y - view.h / 2 - wm, vy1 = this.cam.y + view.h / 2 + wm;
    // Noises live for one pass of the men. Everything emitted before this loop is heard now and
    // dropped at the end of the step; everything emitted from here on, a man's own shot, a crate
    // breaking, a bomb, the grating, a table through a door, is carried into the next step, because
    // clearing the whole list at the end of this one threw all of those away before anybody heard them.
    const heardUpTo = w.noises.length;
    // THE DARK: whether the goat is standing where a flame shows him, asked once for every man.
    this.goatLit = !this.inDark || this.litAt(this.goat.x, this.goat.y);
    const live = this.liveEnemies; live.length = 0;
    for (const e of this.enemies) {
      e.live = false;
      if (!e.woke) {
        if ((e.x >= vx0 && e.x <= vx1 && e.y >= vy0 && e.y <= vy1) || e.held || e.state === 'flung' || e.burning > 0) e.woke = true;
        else continue;
      }
      // In a corridor he is in whichever room is nearest him, not the one he was put in: a man who
      // chased the goat out of a room two back and is now in the corridor right beside him used to
      // count as two rooms away and stop dead there, stuck in the doorway (playtest, 23 Sep 2026).
      const eroom = roomAt(this.level, e.x, e.y);
      const eIdx = eroom ? eroom.index : this.nearestRoomIdx(e.x, e.y, e.room);
      if (curIdx >= 0 && eIdx >= 0 && Math.abs(eIdx - curIdx) >= 2) continue;
      // A room the goat has not opened yet, no floor of it seen, not walked into, used to go on
      // patrolling anyway once it was only the immediate neighbour of his own room, which let a man
      // wander into the wheel or over a drop and die to it before the door that room sits behind
      // was ever touched: a kill with nothing the player did behind it. Frozen until `revealRooms`
      // marks the room seen, the same as its floor plan is frozen behind the fog. The cost is
      // narrow, a man mid-chase who ducks round a blind corner into a room with no sightline into
      // it yet stops answering noise for the few frames before he is seen, rather than the whole
      // room past it, which is what the distance skip above already accepts losing. A corridor
      // answers `roomAt` with nothing, so a man caught mid-corridor is never frozen by this half.
      if (eroom && !eroom.seen) continue;
      e.live = true;
      const cd0 = this.devCdBefore(e);
      e.update(dt, this);
      if (cd0) this.devCdAfter(e, cd0);
      // Listed after his own update, not before it: a wraith that manifested in it is a body now.
      // A man in the goat's mouth is listed too: the wheel, the grating and the rock teeth each have
      // a branch for taking him out of it, and none of them could run while he was left off this
      // list. Every other reader skips `held` itself.
      if (!e.dead && !e.ghosted) live.push(e);
    }
    for (const b of this.bullets) b.update(dt, this);
    for (const p of this.props) p.update(dt, this);
    Thrower.fly(dt, this);   // the animals the thrower threw (js/thrower.js)
    Shop.updateBoomerang(this, dt);
    this.collideEntities(dt);
    this.updateSeals();
    this.updateVaultTrap(); this.updateVaultOgre(dt); this.updateSpireLesson(dt);
    this.updateClearDoors();
    this.updateClamps();
    if (this.holdAt >= 0) this.holdGate();
    if (this.skyTables) this.updateSkyTables(dt);
    if (this.powder && this.powder.size) this.updatePowder(dt);
    w.updateFire(dt);
    Status.update(this, dt);
    Talisman.update(this, dt);   // the mouse's talismans (js/talismans.js)
    w.noises.splice(0, heardUpTo);
    keepIf(this.bullets, notDead);
    this.updateEffects(dt);

    for (const tm of this.souls) {
      tm.life += dt;
      if (this.goat.dead || tm.taken) continue;
      if (hyp(tm.x - this.goat.x, tm.y - this.goat.y) < TUNING.soul.pickupR + this.goat.r) {
        tm.taken = true; this.particles(tm.x, tm.y, 18, PALETTE.witchHi, 180); this.ring(tm.x, tm.y, 3 * TILE, PALETTE.witch);
        this.openSoulGate(tm.gate); Talisman.onSoul(this); Heaven.earnSoul(this);
        this.audio.startMusicCue('soul', this.levelIndex);
        this.openBoonChoice(); this.clearEdges(); return;
      }
    }
    keepIf(this.souls, Game.untaken);
    for (const p of this.props) {
      if (p.kind !== 'heal' || p.broken) continue;
      const H = TUNING.prop.heal;
      if (this.goat.dead) { p.graze = 0; continue; }
      const near = hyp(p.x - this.goat.x, p.y - this.goat.y) <= H.pickupR + this.goat.r
        && hyp(this.goat.vx, this.goat.vy) < H.grazeSpeed;
      if (this.goat.hp >= this.goat.maxHp) {
        // THE NOSEBAG: with every heart full the tuft goes in the bag instead (js/talismans.js).
        if (Talisman.bagGraze(this, p, near, dt)) { p.fullTold = false; continue; }
        p.graze = 0;
        // Standing in it with a full heart already used to do nothing at all, which reads as the
        // grass being broken rather than as the goat having nothing left to gain from it.
        if (near && !p.fullTold) { p.fullTold = true; this.floatText(p.x, p.y - 24, 'FULL', PALETTE.bone); }
        else if (!near) p.fullTold = false;
        continue;
      }
      p.fullTold = false;
      if (near) this.goat.grazeAt = this.timer;   // his head goes down (`PaintedArt.drawGoat`)
      // Standing in it is the whole cost: running through does nothing, and stepping off, or simply
      // moving, bleeds the count back down rather than snapping it to zero, so a stray jostle from
      // a passing man does not cost the whole graze.
      p.graze = near ? p.graze + dt : Math.max(0, p.graze - dt * 2);
      if (p.graze < H.grazeTime * this.mods.grazeMul) continue;   // GOOD GRAZER (THE MIRROR) shortens it
      // The mouse's pail holds several hearts and pays them out a drink at a time, so it stays where
      // it is until it is empty: a goat who took it at full health has something to come back to
      // while he is still in her room rather than three quarters of an offer poured away.
      if (p.pail > 1) { p.pail--; p.graze = 0; } else { p.broken = true; p.dead = true; }
      // A patch of real grass rather than a bowl of milk: rarer, tucked behind a wall a secret gave
      // up, and worth twice what the milk does, the risk of going looking for it is what pays for
      // the extra heart, not the room it happens to be standing in.
      // FOUR STOMACHS: grass is worth more to him; the pail (`p.pail`, still >= 1 on its last drink) is milk.
      let gain = (p.big ? TUNING.prop.heal.bigGain : 1) + (p.pail > 0 ? 0 : this.mods.grassGain);
      // GOOD GRAZER's second rank: the first bowl of a floor fills him up.
      if (this.mods.milkFull && !this.milkFullUsed && !(p.pail > 0)) { this.milkFullUsed = true; gain = Math.max(gain, this.goat.maxHp - this.goat.hp); }
      this.goat.hp = Math.min(this.goat.maxHp, this.goat.hp + gain); this.learn('graze');
      this.particles(p.x, p.y, 18, PALETTE.bone, 170); this.ring(p.x, p.y, 2 * TILE, PALETTE.bone);
      this.floatText(p.x, p.y - 24, gain > 1 ? `+${gain} HEARTS` : '+1 HEART', PALETTE.bone); this.audio.sfxBell(); this.vibe(20);
    }
    if (!this.goat.dead && this.goat.state !== 'carried' && this.goat.state !== 'tossed' && w.tileAtPx(this.goat.x, this.goat.y) === T.EXIT) { this.beginClimb(); this.clearEdges(); return; }

    this.updateCamera(dt);

    // music intensity from threat
    let aware = 0, hunter = false;
    for (const e of this.enemies) {
      if (e.dead || !e.aware || e.state === 'idle' || e.ghosted) continue;
      if (hyp(e.x - this.goat.x, e.y - this.goat.y) > 16 * TILE) continue;
      aware++; if (e.kind === 'hunter') hunter = true;
    }
    // What it takes to make the drums climb. It used to be five men for the whole kit, which is an
    // ordinary room from level three on, so the loudest music in the game played through most of it
    // and a real crowd had nothing left to sound like. `crowd` is where the two steps are now.
    const C = TUNING.audio.crowd;
    this.audio.intensity = aware === 0 ? 0 : aware <= C.warm ? 1 : aware <= C.hot ? 2 : 3;
    this.audio.hunterAware = hunter;
    this.clearEdges();
  }

  // ---------- the opening scene, beat by beat ----------
  updateIntro(dt) {
    const I = TUNING.intro, it = this.intro, g = this.goat, s = it.sheep, S = it.S, ph = it.phase;
    if (this.hitstopTimer > 0) { this.hitstopTimer -= dt; return; }
    // The three screens before the pen run on their own clock, and nothing of the pen's, the
    // camera creep, the tremble, the heart, starts until they are done.
    if (this.inPrologue()) {
      if (this.introSeen && this.input.anyPressed && it.pro.t > I.skipAfter) { this.skipIntro(); return; }
      this.updatePrologue(dt);
      if (this.intro) this.updateEffects(dt);
      return;
    }
    it.t += dt; it.timer += dt;
    if (this.introSeen && this.input.anyPressed && it.t > I.skipAfter && ph !== 'black' && ph !== 'wake') { this.skipIntro(); return; }

    // the camera creeps in the whole time they are in the room
    const push = clamp(it.t / I.push, 0, 1);
    this.cam.zoom = this.renderer.zoomFit * lerp(I.zoom, I.zoomPush, push * push);
    this.cam.x = S.x + 12; this.cam.y = S.y;

    // fear: a tremble on both of them that grows as the men come, and the bleats that go with it
    const fear = ph === 'huddle' ? I.shiver : (ph === 'approach' || ph === 'gate' || ph === 'grab') ? I.fear : 0;
    const tremble = (seed) => fear ? { x: (Math.sin(it.t * 37 + seed) * 0.6 + Math.sin(it.t * 53 + seed * 2) * 0.4) * fear, y: Math.cos(it.t * 41 + seed) * fear * 0.35 } : null;
    g.jitter = g.state === 'ko' ? null : tremble(0);
    s.jitter = s.held ? null : tremble(3);
    s.bleating = Math.max(0, s.bleating - dt);
    if (fear && !s.held) {
      it.bleat -= dt;
      if (it.bleat <= 0) {
        it.bleat = I.bleatEvery * (fear > 1 ? 0.55 : 1) * (0.7 + Math.random() * 0.6);
        it.turn ^= 1;
        if (it.turn) { this.floatText(g.x, g.y - 30, fear > 1 ? 'BAAH!' : 'b-baah', PALETTE.bone); this.audio.sfxBleat(300, fear > 1 ? 0.16 : 0.09, 0.3); }
        else { this.floatText(s.x, s.y - 30, fear > 1 ? 'BEEH!' : 'b-beeh', PALETTE.bone); this.audio.sfxBleat(470, fear > 1 ? 0.14 : 0.08, 0.26); s.bleating = 0.3; }
      }
    }
    // the heart beats between them for as long as they are together
    const h = it.heart;
    if (!h.broken) {
      const b = (it.t * 1.15) % 1, beat = (o) => Math.pow(Math.max(0, Math.sin(b * Math.PI * 2 - o)), 3);
      h.pulse = 1 + 0.16 * beat(0) + 0.1 * beat(1.3);
      h.x = (g.x + s.x) / 2; h.y = Math.min(g.y, s.y) - 30 + Math.sin(it.t * 2) * 1.5;
    } else h.broken = Math.min(1, h.broken + dt * 1.1);
    // carried: under his arm, sideways, legs going
    if (s.held) {
      this.underArm(s, s.held, it.t);
      s.bleatT = (s.bleatT || 0) - dt;
      if (s.bleatT <= 0) {
        s.bleatT = 0.55 + Math.random() * 0.3; s.bleating = 0.25;
        this.floatText(s.x, s.y - 28, it.fade > 0.4 ? 'beeh!' : 'BEEH!', PALETTE.bone); this.audio.sfxBleat(540, 0.12 * (1 - it.fade), 0.25);
      }
    }

    if (ph === 'huddle') this.introHuddle(dt);
    else if (ph === 'approach') this.introApproach(dt);
    else if (ph === 'gate') this.introGate(dt);
    else if (ph === 'grab') this.introGrab(dt);
    else if (ph === 'fade') this.introFade(dt);
    else if (ph === 'black') this.introBlack(dt);
    else if (ph === 'wake') this.introWake(dt);
    if (!this.intro) return;
    // the two of them never run their own update, so their lines have to age here
    for (const e of this.enemies) if (e.scripted && e.say) { e.say.life -= dt; if (e.say.life <= 0) e.say = null; }
    this.updateEffects(dt);
    for (const p of this.props) p.update(dt, this);
  }

  // Pressed together in the pen, leaning into each other and back.
  introHuddle(dt) {
    const it = this.intro, g = this.goat, s = it.sheep, S = it.S, k = Math.sin(it.t * 1.7);
    g.x = S.x - 24 + k * 3; g.facing = -0.1 + k * 0.08;
    s.x = S.x + 24 - k * 3; s.facing = Math.PI + 0.1 - k * 0.08;
    if (it.timer >= TUNING.intro.huddle) this.introPhase('approach');
  }

  // The mage and the clubman come round the other cage and up to the gate. He gets between her and them.
  introApproach(dt) {
    const it = this.intro, I = TUNING.intro, g = this.goat, s = it.sheep, S = it.S, k = it.mage;
    const there = this.followPath(k, I.walk, dt); this.followPath(it.club, I.walk, dt);
    if (hyp(k.x - S.x, k.y - S.y) < 7 * TILE) {
      if (!g.path && !it.retreated) { it.retreated = true; g.path = [{ x: S.x - 16, y: S.y + 6 }]; s.path = [{ x: S.x - 46, y: S.y - 2 }]; }
      this.followPath(g, 90, dt); this.followPath(s, 120, dt);
      if (!g.path.length) g.facing = Math.atan2(k.y - g.y, k.x - g.x);
      if (!s.path.length) s.facing = Math.atan2(k.y - s.y, k.x - s.x);
    }
    if (there) {
      k.facing = Math.atan2(S.y - k.y, S.x - k.x); it.club.facing = k.facing;
      if (!it.arrived) { it.arrived = it.timer; this.say(k, BARKS.intro.ewe); }
      else if (it.timer - it.arrived > I.arrive) this.introPhase('gate');
    }
  }

  // The mage leans into the bars and they go over in a spray of his violet.
  introGate(dt) {
    const it = this.intro, I = TUNING.intro, p = clamp(it.timer / I.gate, 0, 1);
    for (const b of it.gate) b.gate = p;
    it.mage.x = it.stand.x - Math.sin(p * Math.PI) * 9;
    if (!it.clank && p > 0.5) { it.clank = true; this.audio.sfxCageHit(); this.audio.sfxCast(); this.shake(3); for (const b of it.gate) this.particles(b.x, b.y, 3, PALETTE.witchHi, 90); }
    if (it.timer >= I.gate + I.gateHold) this.introPhase('grab');
  }

  // The boss the camera frames: awake, seen, standing in the goat's room and within `near` of him.
  fightFocus(room, near) {
    if (!room) return null;
    let best = null, bd = near;
    for (const e of this.liveEnemies) {
      if (e.dead || e.held || !e.woke || !(e.boss || e.kind === 'ratogre') || this.hidden(e.x, e.y)) continue;
      if (roomAt(this.level, e.x, e.y) !== room) continue;
      const d = hyp(e.x - this.goat.x, e.y - this.goat.y); if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // camera: follow, lead toward the aim, pull back a little at speed
  updateCamera(dt) {
    const w = this.world, C = TUNING.camera;
    const spd = hyp(this.goat.vx, this.goat.vy) / TUNING.goat.speed;
    // The lead is carried, not read. Reading it straight off the aim meant that crossing the pointer
    // over the goat threw the whole picture to the other side of him in one frame, which is what
    // made turning around on the spot feel like being shaken. Standing still, he barely leads at all.
    const lead = C.lead * (this.touch.active ? 0.7 : 1) * lerp(C.leadStill, 1, clamp(spd, 0, 1));
    const lk = 1 - Math.exp(-C.leadLerp * dt);
    this.camLead.x += (this.input.aim.x * lead - this.camLead.x) * lk;
    this.camLead.y += (this.input.aim.y * lead - this.camLead.y) * lk;
    let tx = this.goat.x + this.camLead.x, ty = this.goat.y + this.camLead.y;

    // A room that already fits the screen whole is held dead centre rather than tracked, there is
    // nothing off-screen to pan toward, so tracking it only shivers the picture with every step he
    // takes across it. `roomAt` is the same lookup the rule checker uses.
    // Whether it fits is asked of the lens at rest, never the live one: the run and the fight both
    // back the lens out, and a room a little too tall for the resting lens then fit, dropped the
    // fight, zoomed back in, stopped fitting, the picture jumped between the room's middle and the
    // boss several times a second on a 16:10 screen (playtest, 30 Sep 2026).
    const v = this.renderer.view({ zoom: this.renderer.zoomFit * C.zoomRest });
    const room = this.level && roomAt(this.level, this.goat.x, this.goat.y);
    const fits = room && room.w * TILE <= v.w - C.fitMargin && room.h * TILE <= v.h - C.fitMargin;
    // Held is a blend, not a switch (1 Oct 2026, the playtests' camera note: "between two rooms it
    // throws itself from room one to room two, show the state in between, a smooth follow"). How
    // far he is in from the room's edge, over `blend` tiles, is how much of the room's middle the
    // camera wants; in a doorway that is none, so it is on him exactly as it is in the corridor, and
    // walking in slides it over to the middle. Room → corridor → room is one continuous move.
    // "In from the edge" is measured to the room's ways out, the open tiles of its border, and not to
    // its walls, so walking along a side wall keeps the room held; only heading for a door lets go.
    let hold = 0;
    if (fits) {
      const g = this.goat, depth = this.roomMouthDist(room, g.x, g.y);
      const q = clamp((depth - C.blendIn) / (C.blend * TILE), 0, 1);
      hold = q * q * (3 - 2 * q);
    }

    // Framing the fight: in a room too big to hold, an awake boss near the goat pulls the picture
    // part way toward himself and backs the lens out, so the wall that will kill him is in view.
    const F = C.fight, boss = fits ? null : this.fightFocus(room, F.near);
    this.camFight = (this.camFight || 0) + ((boss ? 1 : 0) - (this.camFight || 0)) * (1 - Math.exp(-F.ease * dt));
    // Where the boss is, eased (`fight.follow`/s): an ogre leaping over the goat threw the pull from one
    // side of him to the other in a frame, and in a cave arena the picture shook (2 Oct 2026 playtest).
    if (boss) {
      if (!this.camBoss) this.camBoss = { x: boss.x, y: boss.y };
      const bk = 1 - Math.exp(-F.follow * dt);
      this.camBoss.x += (boss.x - this.camBoss.x) * bk; this.camBoss.y += (boss.y - this.camBoss.y) * bk;
    } else if (this.camFight < 0.001) this.camBoss = null;
    // Eased out through a room that fits as well: cut there, the pull dropped up to `fight.max` in one frame.
    if (this.camFight > 0.001 && this.camBoss) {
      let px = (this.camBoss.x - this.goat.x) * F.pull, py = (this.camBoss.y - this.goat.y) * F.pull;
      const pl = hyp(px, py); if (pl > F.max) { px *= F.max / pl; py *= F.max / pl; }
      tx += px * this.camFight; ty += py * this.camFight;
    }

    // The deadzone: the follow point only moves once the target has stepped past a small window
    // round it, so a shiver of motion at a standstill never nudges the whole picture, only real
    // travel does. It always tracks him; the room's hold is laid over it.
    if (!this.camTrack) this.camTrack = { x: tx, y: ty };
    const fdx = tx - this.camTrack.x, fdy = ty - this.camTrack.y, dz = C.deadzone;
    if (fdx > dz) this.camTrack.x = tx - dz; else if (fdx < -dz) this.camTrack.x = tx + dz;
    if (fdy > dz) this.camTrack.y = ty - dz; else if (fdy < -dz) this.camTrack.y = ty + dz;
    // The hold itself is eased, so a room entered through a wide mouth (no corridor: the threshing
    // floor's, a stacked room's shaft) still slides rather than steps.
    this.camHold = (this.camHold === undefined ? hold : this.camHold) + (hold - (this.camHold === undefined ? hold : this.camHold)) * (1 - Math.exp(-C.holdLerp * dt));
    // The middle it holds is eased too: two rooms that touch with no corridor between hand over
    // from one middle to the other without a step.
    if (fits) {
      const mx = (room.x + room.w / 2) * TILE, my = (room.y + room.h / 2) * TILE, hk = 1 - Math.exp(-C.holdLerp * dt);
      if (!this.camRoomMid || this.camHold < 0.02) this.camRoomMid = { x: mx, y: my };
      else { this.camRoomMid.x += (mx - this.camRoomMid.x) * hk; this.camRoomMid.y += (my - this.camRoomMid.y) * hk; }
    }
    const mid = this.camRoomMid || this.camTrack;
    if (!this.camFollow) this.camFollow = { x: tx, y: ty };
    this.camFollow.x = lerp(this.camTrack.x, mid.x, this.camHold);
    this.camFollow.y = lerp(this.camTrack.y, mid.y, this.camHold);
    const k = 1 - Math.exp(-C.lerp * dt);
    this.cam.x += (this.camFollow.x - this.cam.x) * k; this.cam.y += (this.camFollow.y - this.cam.y) * k;
    const targetZoom = this.renderer.zoomFit * lerp(C.zoomRest, C.zoomFast, clamp(spd, 0, 1)) * lerp(1, F.zoom, this.camFight);
    this.cam.zoom += (targetZoom - this.cam.zoom) * (1 - Math.exp(-C.zoomLerp * dt));
    const v2 = this.renderer.view(this.cam);
    // The leash: a roll or a blast can outrun the lerp; the goat is not let near the edge. It pulls
    // hard (`leashLerp`), never snaps, and stands aside while a room change is easing the camera over
    // - clamped outright it yanked the picture off a room's middle the frame he walked out of it.
    if (this.camHold < 0.98) {
      const lx = v2.w / 2 * C.leash, ly = v2.h / 2 * C.leash, g = this.goat, lk2 = (1 - Math.exp(-C.leashLerp * dt)) * (1 - this.camHold);
      this.cam.x += (clamp(this.cam.x, g.x - lx, g.x + lx) - this.cam.x) * lk2;
      this.cam.y += (clamp(this.cam.y, g.y - ly, g.y + ly) - this.cam.y) * lk2;
    }
    this.cam.x = clamp(this.cam.x, v2.w / 2, w.W * TILE - v2.w / 2);
    this.cam.y = clamp(this.cam.y, v2.h / 2, w.H * TILE - v2.h / 2);
  }

  // How far (px) a point is from the nearest way out of a room: an open tile of its border, neither
  // stone nor a drop. A room with none (a clamp walled it) answers far, and is held whole.
  // A vault's door and a niche's broken wall lead nowhere, so they are not ways out: counted, walking
  // up to one slid the picture off the room's middle (1.89 backlog).
  roomMouthDist(room, x, y) {
    const w = this.world, W = w.W;
    if (this.blindMouthsOf !== this.level) {
      const S = this.blindMouths = new Set(); this.blindMouthsOf = this.level;
      const V = this.level.vault; if (V && V.doorTile) S.add(V.doorTile.ty * W + V.doorTile.tx);
      for (const p of this.props) if (p.nicheTiles) for (const i of p.nicheTiles) S.add(i);
    }
    let best = Infinity;
    const at = (tx, ty) => {
      const t = w.tiles[ty * W + tx]; if (t === T.WALL || t === T.PIT || this.blindMouths.has(ty * W + tx)) return;
      const d = hyp((tx + 0.5) * TILE - x, (ty + 0.5) * TILE - y) - TILE / 2;
      if (d < best) best = d;
    };
    const x1 = room.x + room.w - 1, y1 = room.y + room.h - 1;
    for (let tx = room.x; tx <= x1; tx++) { at(tx, room.y); at(tx, y1); }
    for (let ty = room.y + 1; ty < y1; ty++) { at(room.x, ty); at(x1, ty); }
    return Math.max(0, best);
  }

  // The death screen's own camera move: held where he died for `delay`, then eased the rest of the
  // way out to the whole level over `zoomTime`. Nothing here reads `camFollow` or the deadzone,
  // this is the one camera move in the game that is not chasing the goat.
  updateDeathCam(dt) {
    const dc = this.deathCam, DC = TUNING.deathCam;
    dc.t += dt;
    const p = clamp((dc.t - DC.delay) / DC.zoomTime, 0, 1);
    const e = 1 - Math.pow(1 - p, 3);   // ease out: slows to a stop, reads as a move rather than a cut
    this.cam.x = lerp(dc.fromX, dc.toX, e);
    this.cam.y = lerp(dc.fromY, dc.toY, e);
    this.cam.zoom = lerp(dc.fromZoom, dc.toZoom, e);
  }

  // The mage walks round the goat to her, takes her, and heads for the gate. The goat goes for him
  // and meets the clubman's club instead.
  introGrab(dt) {
    const it = this.intro, I = TUNING.intro, g = this.goat, s = it.sheep, k = it.mage, c = it.club, S = it.S;
    if (g.state !== 'windup' && g.state !== 'lunge') g.facing = Math.atan2(k.y - g.y, k.x - g.x);
    if (!s.held) {
      s.facing = Math.atan2(k.y - s.y, k.x - s.x);
      if (this.followPath(k, I.walk, dt)) {
        s.held = k; s.path = null; s.jitter = null; it.heart.broken = 0.001;
        this.audio.sfxCrack(); this.audio.sfxBleat(560, 0.2, 0.4); this.floatText(s.x, s.y - 34, 'BEEEH!', PALETTE.fireHi); s.bleating = 0.5;
        this.particles(it.heart.x, it.heart.y, 8, PALETTE.blood, 70);
        this.say(k, BARKS.intro.take);
        k.path = [it.way[1], { x: S.x + 44, y: S.y - 30 }, { x: S.x + it.hw + 4, y: S.y - 8 }, it.stand, it.bend, it.door];
        c.path = [{ x: S.x + it.hw - 22, y: S.y + 16 }];   // the other one steps in through the gate
      }
      return;
    }
    this.followPath(k, I.walk, dt); this.followPath(c, I.run, dt);
    if (!it.exitAt && k.x > S.x + 20) it.exitAt = it.timer;
    const since = it.exitAt ? it.timer - it.exitAt : -1;
    // the club comes up before the goat moves, so the arc is on the floor in front of him first
    if (since >= 0 && !it.clubWind) { it.clubWind = true; c.state = 'windup'; c.timer = TUNING.bearer.windup; c.path = []; }
    if (c.state === 'windup') { c.timer = Math.max(0.01, c.timer - dt); c.facing = Math.atan2(g.y - c.y, g.x - c.x); }
    if (since > I.lunge && !it.lunged) {
      it.lunged = true; g.state = 'windup'; g.timer = TUNING.goat.headbutt.windup; g.path = null;
      this.floatText(g.x, g.y - 30, 'BAAAH!', PALETTE.bone); this.audio.sfxBleat(280, 0.22, 0.4);
    }
    if (g.state === 'windup') {
      g.timer -= dt; g.facing = Math.atan2(k.y - g.y, k.x - g.x);
      if (g.timer <= 0) {
        g.state = 'lunge'; g.timer = TUNING.goat.headbutt.active;
        const dx = k.x - g.x, dy = k.y - g.y, d = hyp(dx, dy) || 1;
        g.vx = dx / d * TUNING.goat.headbutt.lunge; g.vy = dy / d * TUNING.goat.headbutt.lunge;
        // and the club man is standing in the way
        c.x = g.x + dx / d * 52; c.y = g.y + dy / d * 52; c.facing = Math.atan2(-dy, -dx);
        this.audio.sfxHeadbutt();
      }
    } else if (g.state === 'lunge') {
      g.timer -= dt; g.x += g.vx * dt; g.y += g.vy * dt;
      if (hyp(c.x - g.x, c.y - g.y) < g.r + c.r + 6 || g.timer <= 0) this.introClub();
    }
  }

  introClub() {
    const it = this.intro, I = TUNING.intro, g = this.goat, c = it.club;
    it.hit = true; c.state = 'swing'; c.timer = TUNING.bearer.swing; this.audio.sfxSwing();
    const d = hyp(g.vx, g.vy) || 1, nx = g.vx / d, ny = g.vy / d;
    g.state = 'ko'; g.vx = -nx * I.club.knock; g.vy = -ny * I.club.knock; g.dazed = 99; g.jitter = null;
    this.hitstop(I.club.hitstop); this.shake(16, true); this.kick(-nx, -ny, TUNING.juice.kickMax, true); this.zoomPunch(2.2);
    this.flash(PALETTE.blood, 0.4); this.hurtFlash(Math.atan2(ny, nx)); this.slowTimer = I.club.slow;
    this.audio.sfxClub(); this.vibe(80);
    this.particles(g.x + nx * 10, g.y + ny * 10, 12, PALETTE.bone, 260);
    this.world.splat(g.x, g.y, -nx, -ny, 7);
    // the bleat he was in the middle of stops where the club lands
    this.floats = this.floats.filter((f) => f.text !== 'BAAAH!');
    this.floatText(g.x, g.y - 30, 'BAA-', PALETTE.bone);
    this.introPhase('fade');
  }

  // The picture goes. He is dragged to a stop; she is carried off still calling; the clubman has a
  // word for him, puts the gate back up and follows.
  introFade(dt) {
    const it = this.intro, I = TUNING.intro, g = this.goat, k = it.mage, c = it.club, S = it.S;
    const p = clamp(it.timer / I.fade, 0, 1); it.fade = p * p; it.starsA = 1;
    g.x += g.vx * dt; g.y += g.vy * dt; const drag = Math.exp(-6 * dt); g.vx *= drag; g.vy *= drag;
    this.world.collideCircle(g);
    this.followPath(k, I.walk, dt);
    if (c.state === 'swing') { c.timer -= dt; if (c.timer <= 0) { c.state = 'recover'; c.timer = TUNING.bearer.recover; } }
    else if (c.state === 'recover') {
      c.timer -= dt; c.facing = Math.atan2(g.y - c.y, g.x - c.x);
      if (c.timer <= 0) { c.state = 'chase'; this.say(c, BARKS.intro.turn); c.path = [{ x: S.x + it.hw + 24, y: S.y + 6 }]; it.closeAt = it.timer + 0.8; }
    } else {
      const done = this.followPath(c, I.walk, dt);
      if (it.closeAt && it.timer > it.closeAt) {
        const q = clamp((it.timer - it.closeAt) / I.gate, 0, 1);
        for (const b of it.gate) b.gate = 1 - q;
        if (!it.clank2 && q > 0.5) { it.clank2 = true; this.audio.sfxCageHit(); }
        if (q >= 1 && done && !c.leaving) { c.leaving = true; c.path = [it.stand2, it.bend, it.door]; }
      } else if (done) c.facing = Math.atan2(g.y - c.y, g.x - c.x);
    }
    if (it.timer >= I.fade) this.introPhase('black');
  }

  // Dark. The stars go out, something bleats a long way off, and the level card comes up.
  introBlack(dt) {
    const it = this.intro, I = TUNING.intro;
    it.fade = 1;
    if (!it.cleared) {
      it.cleared = true; this.enemies = this.enemies.filter((e) => !e.scripted);
      it.sheep.gone = true; it.sheep.held = null; it.heart.broken = 1;
      for (const b of it.gate) b.gate = 0;
    }
    it.starsA = Math.max(0, 1 - it.timer / 0.7);
    if (!it.echoed && it.timer > 0.55) { it.echoed = true; it.echo = 1.6; this.audio.sfxBleat(600, 0.05, 0.35); }
    it.echo = Math.max(0, it.echo - dt);
    it.cardA = clamp((it.timer - 0.8) / 0.5, 0, 1);
    this.card = { lines: [this.level.def.sub.toUpperCase(), this.level.def.name], dim: 0, size: 40, alpha: it.cardA };
    if (it.timer >= I.black) this.introPhase('wake');
  }

  // The light comes back on the pen. He gets up with the stars still going round.
  introWake(dt) {
    const it = this.intro, I = TUNING.intro, g = this.goat, p = clamp(it.timer / I.wake, 0, 1);
    it.fade = 1 - p; it.starsA = 0;
    it.cardA = clamp(1 - it.timer / 0.5, 0, 1);
    if (this.card) this.card.alpha = it.cardA;
    if (it.cardA <= 0) this.card = null;
    if (p > 0.4 && g.state === 'ko') { g.state = 'idle'; g.dazed = I.stars; this.particles(g.x, g.y + 6, 8, PALETTE.ash, 120); }
    if (p >= 1) this.endIntro();
  }

  // Any button after the first moment: straight to the dark. `toPlay` drops the dark as well (tests).
  skipIntro(toPlay) {
    const it = this.intro; if (!it) return;
    if (toPlay) { this.endIntro(); return; }
    if (it.phase === 'black' || it.phase === 'wake') return;
    const g = this.goat; g.state = 'ko'; g.vx = 0; g.vy = 0; g.dazed = 99; g.jitter = null; g.path = null;
    this.slowTimer = 0; this.hitstopTimer = 0; this.audio.duck(TUNING.intro.duck, 0.2);
    it.pro = null;                       // skipped from the prologue: the dark is the same dark
    this.introPhase('black'); it.timer = 0.5;
  }
  endIntro() {
    const g = this.goat;
    // It has been watched. From here on a key gets you past it.
    this.introSeen = true;
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* storage refused */ }
    this.enemies = this.enemies.filter((e) => !e.scripted);
    for (const p of this.props) if (p.kind === 'cage') p.gate = 0;
    g.state = 'idle'; g.timer = 0; g.vx = 0; g.vy = 0; g.jitter = null; g.path = null; g.hp = g.maxHp;
    if (g.dazed > 50) g.dazed = TUNING.intro.stars;
    this.intro = null; this.card = null; this.timer = 0; this.slowTimer = 0; this.state = 'play';
    this.audio.duck(1, 0.5); this.world.computeFlow(g.x, g.y);
  }
  // Her under his arm, sideways, legs going: the opening scene's carry and the first gate's.
  underArm(s, k, t) {
    const fx = Math.cos(k.facing), fy = Math.sin(k.facing);
    s.x = k.x + fx * 13 - fy * 9; s.y = k.y + fy * 13 + fx * 9;
    s.facing = k.facing + 1.25; s.kick = Math.sin(t * 32) * 4.5;
  }

  // ---------- the mage at the first gate ----------
  // `LEVELS[0].blessGate` (asked for on 26 Sep 2026). The man in the first gate's rest room stands
  // promised (`e.blessing`: a plain clubman holding his mark) until the goat is in the doorway. Then
  // the mage who carried her off in the opening scene is in the room with her under his arm, gives
  // that man the gate's soul (`blessNow`, which is what makes him its keeper) and runs on through the
  // gate, which shuts behind him: the soul is what made the man stronger, and she is past that door.
  // Nothing else in the level moves while it plays, so it can cost the goat nothing.
  watchBless() {
    const b = this.bless, e = b.keeper, g = this.goat, T = TUNING.bless, w = this.world;
    // Touched before he was given it, a throw through the doorway, a fire, a blow, and he has it
    // now, with no scene: the soul that lifts the gate has to come out of somebody.
    if (!e.blessing || e.dead || e.state !== 'idle' || e.burning > 0 || e.held) { this.blessNow(e); this.bless = null; return false; }
    const room = this.level.rooms[b.room], sg = (this.soulGates || []).find((s) => s.room === b.room);
    if (g.dead || roomAt(this.level, g.x, g.y) !== room) return false;
    const door = sg && sg.prop;
    if (!door || door.broken) { this.blessNow(e); this.bless = null; return false; }
    // He stands a step off his man toward the gate, turned to it: caught on his way out.
    const dir = Math.sign(door.x - e.x) || 1;
    const spot = [[dir, 0], [dir, -0.5], [dir, 0.5], [-dir, 0]].map(([sx, sy]) => ({ x: e.x + sx * T.side * TILE, y: e.y + sy * TILE }))
      .find((p) => w.walkableAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE))) || { x: e.x + dir * TILE, y: e.y };
    // One heart, so no notches hang over him: he is not a man to be fought here.
    const m = new Enemy(spot.x, spot.y, 'seer'); m.scripted = true; m.aware = true; m.hp = m.maxHp = 1;
    m.facing = Math.atan2(door.y - m.y, door.x - m.x);
    this.enemies.push(m);
    const s = { x: m.x, y: m.y, facing: 0, kick: 0, bleating: 0, jitter: null, vx: 0, vy: 0, gone: false };
    this.underArm(s, m, 0);
    // The goat stops where he is and is walked a step in off the doorway; whatever he was doing ends.
    g.state = 'idle'; g.timer = 0; g.vx = 0; g.vy = 0; g.leap = null; g.runT = 0; g.buttBuf = 0; g.rollBuf = 0;
    const inX = (room.x + 0.5 + T.walkIn) * TILE;
    g.path = g.x < inX && w.walkableAt(Math.floor(inX / TILE), Math.floor(g.y / TILE)) ? [{ x: inX, y: g.y }] : null;
    Object.assign(b, { on: true, t: 0, phase: 'see', timer: 0, mage: m, ewe: s, door, wisp: null, bars: 0, bleat: 0.5, flags: {} });
    // She sees him first.
    this.floatText(s.x, s.y - 30, 'BEEH!', PALETTE.bone); this.audio.sfxBleat(540, 0.14, 0.26); s.bleating = 0.35;
    return true;
  }

  updateBless(dt) {
    const T = TUNING.bless, b = this.bless, g = this.goat, m = b.mage, e = b.keeper, s = b.ewe, door = b.door;
    b.t += dt; b.timer += dt;
    // A click or Space once it has been watched through; a new direction key is walking, not asking.
    const skip = this.blessSeen && b.t > T.skipAfter && (this.input.lmbPressed || this.input.spacePressed);
    if (skip || b.t > T.cap) { this.endBless(); return; }
    b.bars = b.phase === 'after' ? Math.min(b.bars, 1 - b.timer / T.after) : Math.min(1, b.t / T.barsIn);
    // His step in off the doorway, then his eyes on her while she is in the room, on the man after.
    if (this.followPath(g, TUNING.intro.walk, dt)) g.path = null;
    if (!g.path) { const o = s.gone ? e : m; g.facing = Math.atan2(o.y - g.y, o.x - g.x); }
    if (!s.gone) { this.underArm(s, m, b.t); s.bleating = Math.max(0, s.bleating - dt); }
    const ph = b.phase;
    if (ph === 'see') {
      // The mage turns at her call, and the goat answers it.
      if (!b.flags.turn && b.timer > T.see * 0.35) { b.flags.turn = true; m.facing = Math.atan2(g.y - m.y, g.x - m.x); }
      if (!b.flags.answer && b.timer > T.see * 0.6) { b.flags.answer = true; this.floatText(g.x, g.y - 30, 'BAAH!', PALETTE.bone); this.audio.sfxBleat(300, 0.16, 0.3); }
      if (b.timer >= T.see) this.blessPhase('hold');
    } else if (ph === 'hold') {
      if (b.timer >= T.hold) this.blessPhase('fly');
    } else if (ph === 'fly') {
      // The soul goes over in an arc from his staff to the man's chest, shedding sparks.
      const W = b.wisp, p = clamp(b.timer / T.fly, 0, 1), q = p * p * (3 - 2 * p);
      W.x = lerp(W.x0, W.x1, q); W.y = lerp(W.y0, W.y1, q) - Math.sin(Math.PI * q) * 1.1 * TILE;
      if (Math.random() < dt * 30) this.particles(W.x, W.y, 1, PALETTE.witch, 40);
      if (b.timer >= T.fly) this.blessPhase('go');
    } else if (ph === 'go') {
      if (b.timer >= T.go) this.blessPhase('run');
    } else if (ph === 'run' || ph === 'shut') {
      const done = this.followPath(m, T.run, dt), far = hyp(m.x - door.x, m.y - door.y);
      // She calls back over his shoulder all the way out.
      b.bleat -= dt;
      if (b.bleat <= 0) { b.bleat = 0.5 + Math.random() * 0.25; s.bleating = 0.25; this.floatText(s.x, s.y - 28, 'BEEH!', PALETTE.bone); this.audio.sfxBleat(540, 0.12, 0.25); }
      if (ph === 'run') {
        // The gate swings for him as he reaches it, and he is through it before it starts back.
        if (far < 1.3 * TILE) b.flags.open = true;
        if (b.flags.open) door.open = Math.min(1, door.open + dt / T.open);
        if (far < 0.4 * TILE) b.flags.through = true;
        if ((b.flags.through && far >= T.past * TILE) || done) this.blessPhase('shut');
      } else {
        door.open = Math.max(0, 1 - b.timer / T.shut);
        if (door.open <= 0) this.blessPhase('after');
      }
    } else if (ph === 'after') {
      if (!b.flags.keep && b.timer > T.after * 0.3) { b.flags.keep = true; this.say(e, BARKS.bless.keep); }
      if (b.timer >= T.after) { this.endBless(); return; }
    }
    // Nobody here runs his own update, so their lines and the keeper's flare age here.
    for (const o of [m, e]) if (o.say) { o.say.life -= dt; if (o.say.life <= 0) o.say = null; }
    e.flash = Math.max(0, e.flash - dt);
    this.revealRooms();
    this.updateEffects(dt);
    // The camera comes in on them: between the goat and whoever the scene is about, a little closer.
    // Afterwards `updateCamera` eases it back out from wherever this left it.
    const o = s.gone ? e : m, C = TUNING.camera, k = 1 - Math.exp(-C.lerp * dt);
    this.cam.x += ((g.x + o.x) / 2 - this.cam.x) * k; this.cam.y += ((g.y + o.y) / 2 - this.cam.y) * k;
    this.cam.zoom += (this.renderer.zoomFit * T.zoom - this.cam.zoom) * (1 - Math.exp(-C.zoomLerp * dt));
  }

  blessPhase(name) {
    const b = this.bless, m = b.mage, e = b.keeper, g = this.goat;
    b.phase = name; b.timer = 0;
    if (name === 'hold') {
      // To his man, not to the goat.
      m.facing = Math.atan2(e.y - m.y, e.x - m.x); e.facing = Math.atan2(m.y - e.y, m.x - e.x);
      this.say(m, BARKS.bless.hold);
    } else if (name === 'fly') {
      this.say(m, BARKS.bless.give); this.audio.sfxCast();
      const x0 = m.x + Math.cos(m.facing) * 12, y0 = m.y - 18;
      b.wisp = { x0, y0, x1: e.x, y1: e.y - 14, x: x0, y: y0 };
      this.particles(x0, y0, 10, PALETTE.witchHi, 120);
    } else if (name === 'go') {
      b.wisp = null; this.blessNow(e);
      e.facing = Math.atan2(g.y - e.y, g.x - e.x);
      m.facing = Math.atan2(b.door.y - m.y, b.door.x - m.x);
    } else if (name === 'run') {
      m.path = this.blessWay(m, b.door);
    } else if (name === 'after') {
      // The gate seats. She is on the far side of it, and he calls into it.
      b.door.open = 0; this.audio.sfxThud(); this.audio.sfxSteel();
      this.enemies = this.enemies.filter((o) => o !== m); b.ewe.gone = true;
      this.floatText(g.x, g.y - 30, 'BAAH!', PALETTE.bone); this.audio.sfxBleat(290, 0.18, 0.4);
    }
  }

  // The mage's way out: to the gate, through it, and a few tiles on down whatever corridor is past
  // it, straight on where it runs straight, round its first turn where it does not.
  blessWay(m, door) {
    const w = this.world, room = this.level.rooms[this.bless.room], dir = Math.sign(door.x - m.x) || 1;
    const way = [{ x: door.x - dir * TILE, y: door.y }, { x: door.x, y: door.y }];
    const inRoom = (x, y) => x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h;
    let cx = Math.floor(door.x / TILE), cy = Math.floor(door.y / TILE);
    const been = new Set([cx + ',' + cy]);
    for (let k = 0; k < 3; k++) {
      const next = [[dir, 0], [0, -1], [0, 1]].map(([dx, dy]) => [cx + dx, cy + dy])
        .find(([x, y]) => w.walkableAt(x, y) && !inRoom(x, y) && !been.has(x + ',' + y));
      if (!next) break;
      [cx, cy] = next; been.add(cx + ',' + cy); way.push({ x: (cx + 0.5) * TILE, y: (cy + 0.5) * TILE });
    }
    return way;
  }

  // The scene over, played out or skipped: the soul is in him whatever beat it was cut at, the mage
  // and the gate are as the end of it leaves them, and the room is his, he knows where the goat is.
  endBless() {
    const b = this.bless, e = b.keeper, g = this.goat;
    this.blessNow(e);
    this.enemies = this.enemies.filter((o) => o !== b.mage);
    if (!b.door.broken) b.door.open = 0;
    g.path = null; g.vx = 0; g.vy = 0;
    if (!e.dead) { e.aware = true; e.state = 'chase'; e.lastSeen = { x: g.x, y: g.y }; e.lostTimer = 0; }
    this.bless = null;
    if (!this.blessSeen) { this.blessSeen = true; try { localStorage.setItem(BLESS_KEY, '1'); } catch (err) { /* storage refused */ } }
  }

  // The soul goes into the mage's man and he is the keeper from here on (`keepGate`): lit, outlined,
  // a heart heavier. Also what a blow does that lands on him before the scene has given it (`die`).
  blessNow(e) {
    if (!e || !e.blessing) return;
    const room = e.blessing.room; e.blessing = null;
    this.keepGate(e, room);
    e.flash = 0.3;
    this.ring(e.x, e.y, 2.6 * TILE, PALETTE.witch); this.particles(e.x, e.y - 10, 24, PALETTE.witchHi, 210);
    this.flash(PALETTE.witchHi, 0.14); this.audio.sfxToll();
  }

  // ---------- the stairs out ----------
  // The exit is a flight up. The goat takes it for a moment, into the light, before the cards.
  // The floor stops. He goes down it, and comes back up on the last boards he stood on a heart
  // lighter, the same price the wheel charges. A hole takes a man out of the room for good and only
  // rents the goat, which is what makes an edge something to fight beside rather than away from.
  goatFalls() {
    const g = this.goat, F = TUNING.fall;
    if (g.dead || g.state === 'falling') return;
    g.state = 'falling'; g.timer = F.time + F.back; g.vx *= 0.3; g.vy *= 0.3; g.landed = false;
    // Land somewhere with room behind it. `safeX/safeY` is the exact board his hoof was leaving,
    // which is also the board the same step can drop him off of again; the trail holds a few seconds
    // of where he already was, so he comes back a little further from the lip than he fell off it.
    // Every candidate is checked against the floor before it is taken. The trail only ever records
    // ground he was standing on, so in ordinary play the first one answers, but if the whole of it
    // is somehow unusable (a trail emptied by a level change, a hole opened under a remembered
    // board), putting him back over a drop means he falls again from the spot he was returned to,
    // and again, for as long as he has hearts. `groundNear` is the last resort that cannot fail.
    const tr = g.safeTrail, safe = (p) => p && !this.world.isPitPx(p.x, p.y);
    let land = null;
    for (let i = tr.length - 1; i >= 0; i--) {
      if (!safe(tr[i])) continue;
      land = tr[i];
      if (tr[i].t >= F.setback) break;   // far enough back; anything older is only a fallback
    }
    if (!land && safe({ x: g.safeX, y: g.safeY })) land = { x: g.safeX, y: g.safeY };
    if (!land) land = this.groundNear(g.x, g.y);
    g.safeX = land.x; g.safeY = land.y;
    // Whatever was in his mouth goes down with him.
    if (g.holding) {
      const h = g.holding; g.holding = null; h.held = false;
      if (h.item) h.fall(this); else h.die(this, 'fall');
      g.spendGrab(this, !h.item);
    }
    this.audio.sfxSwing(); this.shake(7); this.vibe(45); this.zoomPunch(0.7);
    this.floatText(g.x, g.y - 26, 'THE FLOOR ENDS', PALETTE.blood);
  }
  // The nearest tile centre that is floor and is not a hole, spiralling out from a point. Only the
  // fall asks, and only when the trail behind the goat has nothing usable left in it, but it has to
  // answer, because the alternative is putting him back over the drop he just went down.
  groundNear(x, y) {
    const w = this.world, cx = Math.floor(x / TILE), cy = Math.floor(y / TILE);
    for (let r = 1; r < 24; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;   // the ring at this radius only
          const tx = cx + dx, ty = cy + dy;
          if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) continue;
          if (w.isSolid(tx, ty) || w.tiles[ty * w.W + tx] === T.PIT) continue;
          return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
        }
      }
    }
    return { x: this.level.start.x, y: this.level.start.y };   // the room he came in by, if all else fails
  }
  updateFall(dt) {
    const g = this.goat, F = TUNING.fall;
    if (g.timer > F.back) return;                      // still going down
    // Exactly once per fall. This used to test his position against the spot he was headed for,
    // which silently did nothing on the fall where the two already matched, no damage, no move,
    // and he was left standing in the hole.
    if (!g.landed) {
      g.landed = true;
      g.x = g.safeX; g.y = g.safeY; g.vx = 0; g.vy = 0;
      this.cam.x = g.x; this.cam.y = g.y; this.camLead.x = 0; this.camLead.y = 0; this.camFollow = null; this.camTrack = null; this.camHold = undefined; this.camRoomMid = null;
      this.world.computeFlow(g.x, g.y);
      g.damage(F.damage, this, 0, 0, true, 'fall');
      this.audio.sfxThud(); this.shake(5);
      if (!g.dead) this.floatText(g.x, g.y - 34, 'BACK UP', PALETTE.bone);
    }
    if (g.timer <= 0 && !g.dead) { g.state = 'idle'; g.invuln = Math.max(g.invuln, F.invuln); }
  }
  // Dev only (the ANIMALS tab): bank one animal's reward for this run as the stairs would, and seat
  // it in heaven; `give` false takes one back off the run (heaven keeps its seat).
  devBeast(k, give) {
    this.beasts = this.beasts || {};
    if (give) {
      Beast.bank(this, [k]); Heaven.saved(k);
      if (k === 'chicken') this.henHearts = (this.henHearts || 0) + TUNING.prop.chicken.saveHearts;
      if (k === 'crow') this.crowGift = true;
    } else if (this.beasts[k] > 0) {
      this.beasts[k]--;
      if (k === 'chicken') this.henHearts = Math.max(0, (this.henHearts || 0) - TUNING.prop.chicken.saveHearts);
    }
    this.applyBoons();
    this.flash(PALETTE.hen, 0.15);
  }
  beginClimb() {
    this.state = 'climb'; this.stateTimer = TUNING.stairs.climb; this.stairFx = { t: 0, dir: 1 };
    // Out of a vault too: `Goat.update` does not run on the stairs, and he climbed frozen in mid-air.
    const g = this.goat; g.state = 'idle'; g.facing = 0; g.leap = null;
    // THE FORK: which of the two flights he took. The second climbs into the dark (`nextCard`).
    const f = this.level.forkTile, ty = Math.floor(g.y / TILE);
    this.climbDark = !!(f && ty >= f.y0 && ty <= f.y0 + 1);
    // A hen still at his heels, or in his mouth, when he reaches the stairs came out with him, and
    // that is worth a heart for the rest of the run. Once a level, however many he brings.
    const C = TUNING.prop.chicken;
    this.henSaved = this.props.some((p) => p.kind === 'chicken' && Beast.cameWith(p, this));
    if (this.henSaved) this.henHearts += C.saveHearts;
    // The three escorts of js/beasts.js ask the same question at the same door. A crow's reward is
    // not a number, so it is remembered and stood on the next floor's own stairs instead.
    this.beastSaved = Beast.saved(this);
    // what the floor had already paid (`Beast.prize`) is in the bank now, not on top of it
    this.beastsHere = {};
    Beast.bank(this, this.beastSaved);
    // and each one takes its seat in heaven for good (js/heaven.js)
    for (const k of this.beastSaved) Heaven.saved(k);
    if (this.henSaved) Heaven.saved('chicken');
    // The hen's reward is her own (`henHearts`), but she is counted with the rest so the corner that
    // lists everyone brought out (`Renderer.drawSaved`) lists her too.
    if (this.henSaved) Beast.bank(this, ['chicken']);
    for (const k of this.beastSaved.concat(this.henSaved ? ['chicken'] : [])) Stats.beast(this, k, 'saved');
    if (this.beastSaved.indexOf('crow') >= 0) this.crowGift = true;
    this.applyBoons();
    if (g.holding) { const h = g.holding; h.held = false; g.holding = null; if (!h.item) { h.state = 'floored'; h.timer = TUNING.goat.grab.loose; } }
  }
  updateClimb(dt) {
    const C = TUNING.stairs, g = this.goat; this.stateTimer -= dt;
    g.vx = C.climbSpeed; g.vy = 0; g.x += C.climbSpeed * dt; g.facing = 0;
    this.stairFx.t = clamp(1 - this.stateTimer / C.climb, 0, 1);
    this.updateEffects(dt); this.updateCamera(dt);
    if (this.stateTimer <= 0) { this.stairFx = null; this.flash(PALETTE.bone, 0.4); this.levelCleared(); }
  }

  updateEffects(dt) {
    this.fx.update(dt);
    if (this.purseFlash > 0) this.purseFlash -= dt;
    if (this.keyFlash > 0) this.keyFlash -= dt;
    if (this.scatter) this.scatter.update(dt);
    if (this.guide) { const G = this.guide, r = G.ref; G.t -= dt;
      // A soul is gone when it leaves the list; a ware (a Prop, whose `gate` is always set, false) when it is taken.
      if (G.t <= 0 || r.taken || r.broken || r.chosen || (!(r instanceof Prop) && !this.souls.includes(r))) this.guide = null; }
    const J = TUNING.juice;
    if (this.stairFx && this.stairFx.dir < 0) { this.stairFx.t += dt / TUNING.stairs.arrive; if (this.stairFx.t >= 1) this.stairFx = null; }
    if (this.dropIn) Heaven.updateDrop(this, dt);   // down out of heaven onto the floor (js/heaven.js)
    this.shakeAmt = Math.max(0, this.shakeAmt - J.shakeDecay * dt * Math.max(1, this.shakeAmt * 0.3));
    // Smooth noise, not dice: a fresh random spot every frame read as a rattle. And trauma², so the
    // biggest shake is what it always was and a smaller one is smaller still (`shakeRef`).
    // Noise alone peaks wherever its phase happens to be (half as hard on a bad draw), so each new
    // shake is a swing along a random line (`shakeDir`) with the noise laid over it: it always lands.
    const ref = J.shakeRef * J.screen, amp = this.shakeAmt * Math.min(1, this.shakeAmt / ref);
    const sw = Math.cos((this.shakeAge || 0) * Math.PI * J.shakeFreq) * 0.9, dir = this.shakeDir || 0;
    this.shakeX = (Math.cos(dir) * sw + Game.shakeNoise(this.shakeT || 0, 0) * 0.3) * amp;
    this.shakeY = (Math.sin(dir) * sw + Game.shakeNoise(this.shakeT || 0, 1) * 0.3) * amp;
    this.shakeT = (this.shakeT || 0) + dt * J.shakeFreq; this.shakeAge = (this.shakeAge || 0) + dt;
    const kd = Math.exp(-J.kickDecay * dt);
    this.kickX *= kd; this.kickY *= kd;
    this.zoomKick *= Math.exp(-J.zoomDecay * dt);
    this.flashAmt = Math.max(0, this.flashAmt - J.flashDecay * dt * Math.max(1, this.flashAmt * 4));
    this.barkCd = Math.max(0, this.barkCd - dt);
    this.cageThought = Math.max(0, this.cageThought - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0) this.combo = 0;
    for (const p of this.parts) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92;
      // A chunk that comes to rest marks the floor for the rest of the level.
      if (p.chunk && p.life <= 0 && this.world) this.world.dot(p.x, p.y, 1.6 + Math.random() * 2.4, PALETTE.bloodDark);
    }
    keepIf(this.parts, alive);
    for (const f of this.floats) f.life -= dt;
    keepIf(this.floats, alive);
    if (this.tripBanner > 0) this.tripBanner = Math.max(0, this.tripBanner - dt);
    if (this.tripBack > 0) this.tripBack = Math.max(0, this.tripBack - dt);
    for (const p of this.puffs) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; }
    keepIf(this.puffs, alive);
    for (const f of this.flares) f.life -= dt;
    keepIf(this.flares, alive);
    if (this.goat && this.goat.sq) {
      const Q = TUNING.juice.squash; this.goat.sqT += dt;
      this.goat.sqLeft = this.goat.sq * Math.exp(-Q.decay * this.goat.sqT);
      if (Math.abs(this.goat.sqLeft) < 0.004) { this.goat.sq = 0; this.goat.sqLeft = 0; }
    }
    for (const r of this.rings) r.life -= dt;
    keepIf(this.rings, alive);
    for (const f of this.fallers) f.t += dt;
    keepIf(this.fallers, Game.falling);
    if (this.breathFx) { this.breathFx.life -= dt; if (this.breathFx.life <= 0) this.breathFx = null; }
    if (this.dev.toast) { this.dev.toast.life -= dt; if (this.dev.toast.life <= 0) this.dev.toast = null; }
  }

  // ---------- collisions between circles ----------
  // A shove between two bodies never puts a man over a drop, that takes a blow or a throw. A hound
  // shouldered off the goat at the lip of a hole went in (playtest, 30 Sep 2026).
  nudge(e, dx, dy) {
    const w = this.world, x = e.x + dx, y = e.y + dy;
    if (e.state !== 'flung' && w.isPitPx(x, y) && !w.isPitPx(e.x, e.y)) {
      if (!w.isPitPx(x, e.y)) e.x = x; else if (!w.isPitPx(e.x, y)) e.y = y;
      return;
    }
    e.x = x; e.y = y;
  }

  collideEntities(dt) {
    const g = this.goat, en = this.enemies, ph = TUNING.physics;
    // Only the men who actually ran this step (`liveEnemies`): a frozen man cannot have moved into
    // anybody, and nobody can have moved into him, so the pair loop is over ten bodies on a late
    // floor rather than over eighty. The squared compare before the root is the same saving again,
    // this is the innermost loop in the game.
    const act = this.liveEnemies;
    for (let i = 0; i < act.length; i++) {
      const a = act[i]; if (a.dead || a.held || a.ghosted || a.state === 'hop') continue;
      for (let j = i + 1; j < act.length; j++) {
        const b = act[j]; if (b.dead || b.held || b.ghosted || b.state === 'hop') continue;
        const dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r;
        if (dx * dx + dy * dy >= min * min) continue;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d === 0) continue;
        const nx = dx / d, ny = dy / d;
        const aFl = a.state === 'flung' && hyp(a.vx, a.vy) > ph.knockHitSpeed;
        const bFl = b.state === 'flung' && hyp(b.vx, b.vy) > ph.knockHitSpeed;
        if (aFl && !bFl) this.flungHits(a, b, nx, ny);
        else if (bFl && !aFl) this.flungHits(b, a, -nx, -ny);
        else { const push = (min - d) / 2; this.nudge(a, -nx * push, -ny * push); this.nudge(b, nx * push, ny * push); }
        if (a.burning > 0 || b.burning > 0) this.passFire(a, b);
      }
    }
    for (const e of act) {
      // Over a man's back (LEAPFROG) he touches nobody until he lands; nor does an ogre in the air.
      if (e.dead || e.held || e.ghosted || g.dead || g.leap || e.state === 'hop') continue;
      const dx = e.x - g.x, dy = e.y - g.y, min = e.r + g.r;
      if (dx * dx + dy * dy >= min * min) continue;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d === 0) continue;
      const nx = dx / d, ny = dy / d, push = (min - d);
      // The thrower's (js/thrower.js): over his head the goat touches nobody; thrown, he bowls men over on
      // the way; and a man the thrower threw at him lands on him.
      if (g.state === 'carried') continue;
      if (g.state === 'tossed') Thrower.goatIntoMan(this, g, e, nx, ny);
      else if (e.tossBy && e.state === 'flung' && hyp(e.vx, e.vy) > ph.knockHitSpeed) Thrower.manHitsGoat(this, e, g);
      // The big man does not move for you, and neither does a man holding a post: the first man of
      // the run is standing in a one-tile doorway on purpose, and shouldering him down the corridor
      // ahead of you is not a way past him. Everybody else gives ground.
      // From windup to recovery the lip holds him like a wall (`Goat.update`), against a shove too.
      const gs = g.state === 'windup' || g.state === 'lunge' || g.state === 'recover', heavy = e.kind === 'butcher' || e.kind === 'ratogre' || e.sentry;
      const gp = heavy ? 1 : 0.4;
      if (gs) this.nudge(g, -nx * push * gp, -ny * push * gp); else { g.x -= nx * push * gp; g.y -= ny * push * gp; }
      if (!heavy) this.nudge(e, nx * push * 0.6, ny * push * 0.6);
    }
    // The goat and whoever is awake, built once rather than once per prop: `[g].concat(en)` inside
    // the loop was a fresh eighty-element array for every piece of furniture in the level, every step.
    const all = this.collideList || (this.collideList = []);
    // A goat over the thrower's head is in the air: furniture under the fist does not shove him about.
    all.length = 0; if (g.state !== 'carried') all.push(g);
    for (const e of act) all.push(e);
    // The two escorts that walk on the ground are held by a shut door like anybody: a goose that
    // ghosted through a gate ran a whole room ahead of him. The hen and the crow are birds. The
    // horse is held too, which is what it kicks at (`Beast.doorAhead`).
    for (const p of this.props) if ((p.kind === 'goose' || p.kind === 'horse' || p.kind === 'pig' || p.kind === 'rabbit' || p.kind === 'husky' || (p.kind === 'tortoise' && !p.flying)) && !p.broken && !p.held) all.push(p);
    for (const p of this.props) {
      if (p.broken) continue;
      if (p.item) {
        if (p.kind === 'crate' && p.flung) for (const e of act) { if (!e.dead && !e.held && e.state === 'flung' && hyp(e.x - p.x, e.y - p.y) < e.r + p.r) { p.shatter(this); break; } }
        continue;
      }
      // A suit of armour hangs on the wall and blocks nobody (a flung body finds it in
      // `Enemy.wallDressing`). The butcher's charge used to bring it down too; he hooks now.
      if (p.kind === 'armor') continue;
      if (!p.blocking) continue;
      for (const e of all) {
        if (e === p || e.dead || e.held || e.ghosted) continue;
        // Nothing within reach of this prop: the cheapest rejection there is, ahead of the slab and
        // disc maths below. `far` is a generous box, the door's own half-span plus a body.
        if (Math.abs(e.x - p.x) > e.r + p.r + TILE || Math.abs(e.y - p.y) > e.r + p.r + TILE) continue;
        // A door is a slab, not a disc: a plain circle of radius `r` (tuned for the span it has to
        // cover across the gap) stopped anyone walking straight at its face a whole extra tile
        // short of it. Closest point on its actual rectangle instead, `r` still the half-span and
        // `thick` the other side of it, so the span the door was tuned to cover is untouched.
        let d, min, nx, ny;
        if (p.kind === 'door') {
          const hx = p.vertical ? TUNING.prop.door.thick / 2 : TUNING.prop.door.r;
          const hy = p.vertical ? TUNING.prop.door.r : TUNING.prop.door.thick / 2;
          const cx = clamp(e.x, p.x - hx, p.x + hx), cy = clamp(e.y, p.y - hy, p.y + hy);
          const dx = e.x - cx, dy = e.y - cy; d = hyp(dx, dy); min = e.r;
          if (d < 0.001) {
            // Centre inside the slab, a fast body can tunnel a 16px-thick one in a single step,
            // out along its own thin axis, the same rescue `world.js`'s wall collision gives a body
            // landing dead centre in a tile.
            if (p.vertical) { nx = e.x >= p.x ? 1 : -1; ny = 0; } else { nx = 0; ny = e.y >= p.y ? 1 : -1; }
            d = 0;
          } else { nx = dx / d; ny = dy / d; }
        } else if (p.box) {
          // The horse's stall is a box three tiles long: as a disc it stood a body off its long
          // sides by half a tile of air, and let him walk into its corners.
          const o = p.boxPush(e.x, e.y); d = o.d; nx = o.nx; ny = o.ny; min = e.r;
        } else {
          const dx = e.x - p.x, dy = e.y - p.y; d = hyp(dx, dy); min = e.r + p.r;
          if (d === 0) continue;
          nx = dx / d; ny = dy / d;
        }
        if (d >= min) continue;
        const vn = e.vx * nx + e.vy * ny;
        // The goat the thrower threw, into furniture or a shut door as hard as into stone (js/thrower.js).
        if (e === g && g.state === 'tossed' && -vn > TUNING.thrower.grab.hurt) Thrower.goatHits(this, g, p.kind);
        // (The butcher's charge used to be answered here, doors off their hinges, tables shoved,
        // lamps over, braziers lit, a wall's stun. It went on 30 Sep 2026 for the hook.)
        if (e.state === 'flung' && p.kind === 'bell' && -vn > 3 * TILE) p.ring(this);
        // A gate or a sealed door that refuses to break is not an open doorway for a flung body: it
        // used to let a body a headbutt sent flying pass straight
        // through it, reported as a man knocked clean through a story door that stood there after.
        // Left unbroken, nothing here `continue`s, so it falls to the ordinary solid-prop stop below.
        // And a shut door is geometry like a wall (pillar 3, 26 Sep 2026: "he dies on the door"): a body
        // arriving as hard as a wall would kill him at dies on it, `splatLimit`, or for a thrown one
        // the wall's own rule (a man out of the mouth at `thrownKill`, anything else on touch), and
        // the door takes the blow as well, so a plank one comes off its hinges under him. Before, the
        // plank broke and the man flew on through the doorway alive.
        if (e.state === 'flung' && p.kind === 'door') {
          const kill = e !== g && (-vn > e.splatLimit(this) || (e.thrown && e.kind !== 'butcher'
            && -vn > (e.fromMouth ? ph.thrownKill * Talisman.splatMul(this) * e.weakMul() : 0)));
          if (kill || -vn > TUNING.prop.door.smashSpeed) p.smash(this, -nx, -ny);
          if (kill) e.die(this, 'splat', -nx, -ny, 'door');
          if (e.dead || p.broken) continue;
          // Floored on it (a man with hearts to spare), he stops at the door as at a wall: `die` has
          // already zeroed his speed, so the bounce line below would push him a tile back off it.
          if (kill) { e.x += nx * (min - d); e.y += ny * (min - d); continue; }
        }
        // A lamp post is not a pillar. A body arriving at speed takes it over, and the oil goes
        // down where the body is about to land.
        if (e.state === 'flung' && -vn > TUNING.prop.lamp.knock && p.kind === 'lamp') { p.topple(this, -nx, -ny); e.vx *= 0.6; e.vy *= 0.6; continue; }
        // A boulder takes a body the way a head takes it: one blow's worth off it, and a man thrown
        // into one twice has broken it. Whatever the speed, the rock pays; at killing speed he does too.
        if (e.state === 'flung' && e !== g && p.kind === 'rock' && -vn > ph.knockHitSpeed) p.crackRock(this);
        // A body thrown into a barrel sends it on rolling, and still meets it as hard as a wall.
        if (e.state === 'flung' && e !== g && p.kind === 'barrel' && -vn > TUNING.prop.barrel.knock) p.roll(this, -nx, -ny, -vn * TUNING.prop.barrel.pass, e);
        // A body landing on a table knocks the supper off it (js/scatter.js).
        if (e.state === 'flung' && p.kind === 'table' && -vn > ph.knockHitSpeed && this.scatter) this.scatter.fromTable(p, -nx, -ny, 0.8);
        if (e.state === 'flung' && e !== g && -vn > e.splatLimit(this)) { e.die(this, 'splat', -nx, -ny, p.kind); continue; }
        if (e === g && p.kind === 'table' && !p.flung && !p.flipped) {
          // the goat can shoulder a table along slowly
          const shove = Math.min(min - d, TUNING.prop.table.pushSpeed * dt);
          p.x -= nx * shove; p.y -= ny * shove; this.world.collideCircle(p);
        } else if (e === g && p.kind === 'table' && p.flipped && !p.flung && !p.isAltar) {
          // Leaning on it he keeps the table's creep as his own pace into it (`keep`), rather than
          // being stopped dead each step and walking up to it again from nothing.
          const moved = this.creepTable(p, nx, ny, min - d, dt), keep = moved / dt;
          if (vn < -keep) { e.vx -= (vn + keep) * nx; e.vy -= (vn + keep) * ny; }
          e.x += nx * (min - d - moved); e.y += ny * (min - d - moved);
          continue;
        }
        if (vn < 0) { e.vx -= vn * nx; e.vy -= vn * ny; }
        e.x += nx * (min - d); e.y += ny * (min - d);
      }
    }
  }
  // A table on its side, leaned on by the goat (30 Sep 2026: "when the table is flipped over and I'm
  // next to it, I can move it, when I walk into it, in that direction, very slowly"). It creeps away
  // from him at `table.flip.push`, and the collision that follows holds him to that pace. It stops on
  // stone and on anything else solid; a move that would sink it further into one is taken back. Over a
  // drop it goes down it (`updateTable`). Only the goat: `collideEntities` calls this for him alone.
  // Returns how far it went (px), which is all of his step into it that he is let keep.
  creepTable(p, nx, ny, pen, dt) {
    const step = Math.min(pen, TUNING.prop.table.flip.push * dt);
    if (step <= 0) return 0;
    const sink = () => {
      let worst = 0;
      for (const q of this.props) {
        if (q === p || q.broken || !q.blocking) continue;
        if (Math.abs(q.x - p.x) > q.r + p.r + TILE * 2 || Math.abs(q.y - p.y) > q.r + p.r + TILE * 2) continue;
        const o = q.box ? q.boxPush(p.x, p.y) : null;
        worst = Math.max(worst, o ? p.r - o.d : q.r + p.r - hyp(p.x - q.x, p.y - q.y));
      }
      return worst;
    };
    const ox = p.x, oy = p.y, before = sink();
    p.x -= nx * step; p.y -= ny * step;
    this.world.collideCircle(p);
    if (sink() > Math.max(0, before) + 0.01) { p.x = ox; p.y = oy; return 0; }
    // A scrape of dust now and then, so it reads as a weight dragged, not a thing floating.
    if (Math.random() < dt * 4) this.dust(p.x + nx * p.r, p.y + ny * p.r, 1, -nx, -ny);
    return clamp((ox - p.x) * nx + (oy - p.y) * ny, 0, step);   // less where stone took some of it
  }
  // A man alight blunders into another and hands it over, once. The man he hands it to is the end
  // of the line and passes it to nobody, so a brazier costs a room two men rather than the room.
  // Off until KINDLING is taken: without it a brazier costs the room the one man who found it.
  // `firePass` is a depth now rather than a flag, how many men down the line a fire may go.
  // KINDLING is one; the FIRE AMULET's tiers go two, three, six deep and then the whole room. `fireDepth` is
  // how far down the line the lit man already is, set to 0 by the ground and +1 per handing.
  passFire(a, b) {
    const depth = this.mods.firePass | 0;
    if (!depth) return;
    const lit = a.burning > 0 ? a : b, cold = a.burning > 0 ? b : a;
    if (cold.burning > 0 || cold.dead || cold.ghosted || lit.passedFire || (lit.fireDepth || 0) >= depth) return;
    cold.ignite(this, lit.witchBurn, true);
    // What does not catch (the rat ogre, a solid wraith against ordinary flame) spends no hand-off.
    if (!(cold.burning > 0)) return;
    lit.passedFire = true;
    cold.fireDepth = (lit.fireDepth || 0) + 1;
    this.floatText(cold.x, cold.y - 30, 'IT SPREADS', lit.witchBurn ? PALETTE.witch : PALETTE.fire);
  }
  // A body arriving on a body. A man out of your mouth kills whoever he lands on and carries on,
  // he is the weapon. A man off your horns kills too, if he is still travelling at `bodyKillSpeed`
  // when he gets there: two men standing shoulder to shoulder used to be the safe place in the room,
  // because the first one bowled the second over and both stood up, and that read as the game saying
  // a man is not part of the room. He is. And at the speed a wall kills at, the one who was thrown
  // is as dead as the one he was thrown at.
  flungHits(f, other, nx, ny) {
    const ph = TUNING.physics, spd = hyp(f.vx, f.vy);
    // Does he arrive hard enough to kill? A thrown body always does, unless the goat threw him out
    // of his mouth, and then only at `thrownKill` (1.65: the throw sits behind the headbutt, not
    // ahead of it). Anything else only at `bodyKillSpeed`. `bm` is MASON'S MARK's share of both.
    const kills = (bm) => f.thrown ? !f.fromMouth || spd > ph.thrownKill * bm : spd > ph.bodyKillSpeed * bm;
    // A shieldman's board met from in front is a wall to a body, not a man (`TUNING.shieldman`): the body
    // dies on it by the wall's own rule (`Enemy.update`'s flung branch), the board spends a use, and the
    // man behind it is only rocked back. Throwing his own men at him is a way of breaking it.
    if (other.shield && other.shieldCovers(f.x, f.y)) {
      const wall = spd > f.splatLimit(this) || (f.thrown && (!f.fromMouth || spd > ph.thrownKill * Talisman.splatMul(this) * f.weakMul()));
      other.shieldTakes(this, nx, ny);
      if (wall) { if (f.bombFuse > 0 && !f.exploded) { f.explode(this); return; } f.die(this, 'splat', -nx, -ny, 'wall'); return; }
      f.vx *= -0.3; f.vy *= -0.3; return;
    }
    // A body into the rat ogre at killing speed is a heart off him and the end of the body: he is
    // a wall to it, and a wall is what a thrown man dies on. Slower, he is barely moved.
    if (other.kind === 'ratogre') {
      if (f.flungBy === other) { const push = f.r + other.r; f.x = other.x - nx * push; f.y = other.y - ny * push; return; }
      // A fused man goes off on him instead, as on anyone (below): the body and then his blast took two.
      if (kills(1)) { if (f.bombFuse > 0 && !f.exploded) { f.explode(this); return; } other.die(this, 'splat', nx, ny, 'body'); f.die(this, 'splat', -nx, -ny, 'body'); }
      else { f.vx *= -0.3; f.vy *= -0.3; }
      return;
    }
    // The ogre the same way: a body at killing speed is one of the answers to him (`TUNING.butcher`),
    // a heart off him and the body spent on him; slower, it only rocks him.
    if (other.kind === 'butcher') {
      if (kills(Talisman.bodyMul(this))) { if (f.bombFuse > 0 && !f.exploded) { f.explode(this); return; } other.die(this, 'splat', nx, ny, 'body'); f.die(this, 'splat', -nx, -ny, 'body'); return; }
      if (other.state !== 'hop') { other.state = 'stagger'; other.timer = TUNING.butcher.rocked.body; }
      f.vx *= -0.3; f.vy *= -0.3; return;
    }
    // MASON'S MARK III lowers both lines at once: another man is stone to a body arriving fast.
    const bm = Talisman.bodyMul(this);
    if (kills(bm)) {
      // A fused man who arrives on somebody hard enough to kill him goes off on him instead of
      // just killing him, he is the bomb, not the delivery.
      if (f.bombFuse > 0) { f.explode(this); return; }
      other.die(this, 'splat', nx, ny, 'body');
      if (!f.thrown && spd > ph.bodyBothSpeed * bm && !f.dead) { f.die(this, 'splat', -nx, -ny, 'body'); return; }
      f.vx *= f.thrown ? 0.55 : 0.45; f.vy *= f.thrown ? 0.55 : 0.45;
      return;
    }
    if (Talisman.domino(this, f, other)) return;   // DOMINO BONE: he hands the throw on
    other.state = 'floored'; other.timer = TUNING.bearer.flooredTime; other.aware = true;
    other.vx = f.vx * 0.5; other.vy = f.vy * 0.5; f.vx *= 0.5; f.vy *= 0.5;
    other.x += nx * 4; other.y += ny * 4;
    this.audio.sfxThud();
  }
  // The brazier something is up against, or null. Truthy, so the old boolean callers still read.
  touchingBrazier(e) {
    for (const p of this.props) if (p.kind === 'brazier' && !p.broken && hyp(p.x - e.x, p.y - e.y) < p.r + e.r + 3) return p;
    return null;
  }

  // ---------- helpers used by entities ----------
  // The muzzle sits a way out in front of him, and that gap used to be the one stretch of the shot
  // nothing checked: fire diagonally past a corner and the bullet simply appeared on the far side of
  // the stone. Walk it out instead, and stop at whatever it meets.
  fireBullet(shooter, dx, dy) {
    // Same rule as a club: a rifle inside a room nobody has opened is a shot out of the black, and
    // the bullet is painted out along with the man who fired it. He holds his shot until he is seen.
    if (this.hidden(shooter.x, shooter.y)) return;
    const s = TUNING.hunter.bulletSpeed, w = this.world, out = shooter.r + 16;
    let mx = shooter.x, my = shooter.y, blocked = false;
    for (let t = 4; t <= out; t += 4) {
      const px = shooter.x + dx * t, py = shooter.y + dy * t;
      if (w.isSolid(Math.floor(px / TILE), Math.floor(py / TILE))) { blocked = true; break; }
      mx = px; my = py;
    }
    this.audio.sfxGunshot(); this.world.emitNoise(shooter.x, shooter.y, TUNING.noise.gunshot);
    this.particles(mx, my, 4, PALETTE.fireHi, 120); this.shake(1.5);
    this.flares.push({ x: mx, y: my, a: Math.atan2(dy, dx), life: TUNING.juice.muzzle.life });
    // The spent case out of the side of the breech, left lying where it lands (JUICE: shell casings).
    // Out of the side toward the camera: thrown the other way it lands behind him and is never seen.
    const C = TUNING.effects.shell, flip = dx < 0 ? -1 : 1, ex = -dy * flip - dx * C.back, ey = dx * flip - dy * C.back;
    this.fx.fragment(shooter.x + dx * shooter.r, shooter.y + dy * shooter.r, null, null, C.w, C.h, ex, ey, 'brass',
      { color: PALETTE.hayDark, vx: ex * C.speed * (0.8 + Math.random() * 0.4), vy: ey * C.speed * (0.8 + Math.random() * 0.4), vz: C.lift });
    // Firing into the wall he is standing against is a wasted round, not a shot through it.
    if (blocked) { w.dot(mx, my, 2, '#2a2020'); return; }
    this.bullets.push(new Bullet(mx, my, dx * s, dy * s, shooter));
  }
  // A swing has to have a way to what it is swinging at. Stone, a pillar, a table, a shut door, the
  // hub of the Mill: whatever is in the way takes the blow instead, and both sides are held to it,
  // a club that comes through a wall reads as the room not being real.
  // Line of sight plus a set of props, each as a circle against the segment. `reaches` asks it of
  // everything that blocks a blow; `sees` asks it of the few things you cannot see over.
  // `moverR` is the width of whatever is asking, on top of the prop's own radius: a blow only needs
  // a thin ray past a pillar (the `0.8` fudge below); something with a width of its own down the
  // same line, the butcher's hook, `Enemy.hookLine`, needs the prop's whole radius plus that width.
  clearLine(ax, ay, bx, by, props, stops, moverR) {
    if (!this.world.los(ax, ay, bx, by)) return false;
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    for (const p of props) {
      if (!p[stops]) continue;
      // How far the prop's centre is off the line, clamped to the segment itself.
      const t = len2 ? clamp(((p.x - ax) * dx + (p.y - ay) * dy) / len2, 0, 1) : 0;
      const px = ax + dx * t - p.x, py = ay + dy * t - p.y;
      if (hyp(px, py) < (moverR === undefined ? p.r * 0.8 : p.r + moverR)) return false;
    }
    return true;
  }
  reaches(ax, ay, bx, by) { return this.clearLine(ax, ay, bx, by, this.props, 'blocking'); }
  // A shut door is a wall until somebody opens it, and nobody sees through a wall. `sightBlockers`
  // is the short list of props that could ever be one, so this stays off the per-frame prop loop.
  sees(ax, ay, bx, by) { return this.clearLine(ax, ay, bx, by, this.sightBlockers, 'opaque'); }
  // What a blast reaches (the bomb, BOMB CHARGE, the poison blast, spilt powder, `Prop.blastRoom`): stone
  // and a shut door stop it. Asked of the doors alone (`Prop.blastStop`): the gong and the wheel's hub take
  // a blast, they do not shelter what is behind them. A bomb on one side of an iron door used to light the
  // barrels and crack the wall on the other (2 Oct 2026).
  blastClear(ax, ay, bx, by) { return this.clearLine(ax, ay, bx, by, this.sightBlockers || [], 'blastStop'); }
  // Whether the cult is in the dark: THE DARK, or any floor the dev drawer's DARK has painted black.
  // The paint alone used to leave them seeing by daylight, and a rifle drew its line across a room
  // nobody could see into.
  get inDark() { return !!(this.level && (this.level.def.dark || this.dev.dark)); }
  // THE DARK, as the cult sees it: is this point inside `dark.ai.lit` of the reach of a flame with a
  // clear line to it, a brazier, a lamp, a burning man or goat, fire on the floor. The same flames
  // `Dark.sources` draws, less the ones that only glow (souls, the stairs), asked of one point.
  litAt(x, y) {
    const L = TUNING.dark.lights, k = TUNING.dark.ai.lit, w = this.world;
    const lit = (sx, sy, l) => hyp(sx - x, sy - y) < l[0] * k * TILE && this.sees(sx, sy, x, y);
    if (this.goat.onFire) return true;
    for (const p of this.props) {
      if (p.broken) continue;
      if ((p.kind === 'brazier' && lit(p.x, p.y, L.brazier)) || (p.kind === 'lamp' && lit(p.x, p.y, L.lamp))
        || (p.kind === 'sconce' && lit(p.x, p.y, L.sconce))) return true;
      // Lit oil is drawn as a light (`Dark.sources`), so it is one to the cult as well.
      if (p.kind === 'barrel' && p.oilT >= 0 && lit(p.x, p.y, L.burning)) return true;
    }
    for (const e of this.enemies) if (!e.dead && e.burning > 0 && lit(e.x, e.y, L.burning)) return true;
    const r = Math.ceil(L.fire[0] * k), cx = Math.floor(x / TILE), cy = Math.floor(y / TILE);
    for (let ty = Math.max(0, cy - r); ty <= Math.min(w.H - 1, cy + r); ty++) for (let tx = Math.max(0, cx - r); tx <= Math.min(w.W - 1, cx + r); tx++) {
      if (w.fire[ty * w.W + tx] > 0 && lit((tx + 0.5) * TILE, (ty + 0.5) * TILE, L.fire)) return true;
    }
    return false;
  }
  meleeHit(att, reach, arc, damage, knock, skipGoat) {
    const g = this.goat;
    // Nothing that is not on the screen lands a blow. A man inside a room the goat has not opened
    // is not drawn at all, the fog paints his whole room out, and he could still reach out of the
    // black and club you. He may walk, he may shout, he may come and find you. He may not hit you
    // from a place the game is refusing to show you.
    if (this.hidden(att.x, att.y)) return;
    const inArc = (o) => { const dx = o.x - att.x, dy = o.y - att.y, d = hyp(dx, dy);
      return d < reach + o.r && Math.abs(angleDiff(att.facing, Math.atan2(dy, dx))) < arc / 2
        && this.reaches(att.x, att.y, o.x, o.y); };
    const dirx = Math.cos(att.facing), diry = Math.sin(att.facing);
    // MIRROR SHARD: caught inside the parry window, the blow goes back where it came from.
    if (!g.dead && !skipGoat && inArc(g) && Talisman.parry(this, att, att.kind === 'dog' ? 'bite' : 'melee')) skipGoat = true;
    // THE MAGNET: a thing circling him takes the blow and breaks.
    if (!g.dead && !skipGoat && inArc(g) && Talisman.magnetBlock(this, att)) skipGoat = true;
    // A tortoise standing between the blow and the goat takes it on the shell, once (`Beast.guards`).
    // Asked without `reaches`, because a tucked shell is itself what `reaches` would stop at.
    if (!g.dead && !skipGoat) {
      const dx = g.x - att.x, dy = g.y - att.y;
      if (hyp(dx, dy) < reach + g.r && Math.abs(angleDiff(att.facing, Math.atan2(dy, dx))) < arc / 2 && this.world.los(att.x, att.y, g.x, g.y)) {
        const sh = Beast.guards(this, att, g);
        if (sh && Beast.shellTakes(sh, this)) skipGoat = true;
      }
    }
    if (!g.dead && !skipGoat) {
      if (g.holding && !g.holding.item && inArc(g.holding)) { const h = g.holding; this.floatText(h.x, h.y - 26, 'SHIELD', PALETTE.bone); h.die(this, 'club', dirx, diry); }
      // A club into a carried shield is a club into a shield. He spends a charge, the man who swung
      // it stands there holding the shock of it, and the goat takes nothing.
      // Asked of the side he swung from (`Goat.blockBlow`), no longer of the shield's own disc: a
      // man with a long arm used to club past it.
      else if (inArc(g) && g.blockBlow(this, att)) { /* the shield took it */ }
      // A crate held in the way is cover for exactly one blow: it comes apart and the goat takes
      // nothing. No parry with it, the man who swung is left standing there, and the goat is left
      // holding nothing.
      else if (inArc(g) && g.crated(att.x, att.y)) {
        const box = g.holding;
        this.floatText(box.x, box.y - 28, 'IT TAKES IT', PALETTE.ochre);
        this.shake(4); this.hitstop(0.04); this.vibe(18);
        box.shatter(this);
      }
      else if (inArc(g)) g.damage(damage, this, dirx * knock * TUNING.club.knockMul, diry * knock * TUNING.club.knockMul, false, att);
    }
    // The animals on our side are in the room too: a club that finds one hurts it (`Beast.hurt`).
    // Not a LIVING SHIELD's flail: the man in his mouth swings at what is in front of the goat, and
    // his own hen or goose walking beside him lost a heart every half second of it.
    if (!att.held) for (const p of this.props) if (Beast.animal(p) && !p.held && p.birdState !== 'flying' && inArc(p)) Beast.hurt(p, this, 'blow');
    // A hound bites what it was sent for. It does not floor its own handlers on the way past, a pack
    // of them doing that filled half the screen with OOPS.
    if (att.kind === 'dog') return;
    for (const e of this.enemies) {
      if (e === att || e.dead || e.held || e.ghosted || e.state === 'flung') continue;
      if (!inArc(e)) continue;
      if (e === g.holding) continue;
      if (att.kind === 'butcher') { e.fling(dirx * TUNING.club.ogreFling, diry * TUNING.club.ogreFling, false); }
      // The rat ogre swings at the cult on purpose, and a man off his arm goes the way a man off
      // the Butcher's does: across the room, into whatever is there. The walls do his killing too.
      else if (att.kind === 'ratogre') this.ogreHits(e, dirx, diry, att);
      // A club (a man in the goat's mouth swinging for him, LIVING SHIELD) meets a shieldman's board from in front.
      else if (e.shield && e.shieldCovers(att.x, att.y)) e.shieldTakes(this, dirx, diry);
      else if (e.kind !== 'butcher' && e.kind !== 'ratogre' && Math.random() < TUNING.club.floorChance) { e.state = 'floored'; e.timer = TUNING.club.floorFor; e.aware = true; }
    }
  }
  // The rat ogre's blow on a man of the cult: it hurts him, and then it throws him, as a thrown
  // body, so whoever he is thrown into goes down under him. It used to only throw, which made the
  // ogre a way of moving the cult about the room rather than a thing that was killing it.
  ogreHits(e, dirx, diry, by) {
    const S = TUNING.ratogre.flingSpeed;
    // The ogre is never thrown (`fling` refuses him), so the doomed-in-flight path below left him
    // unkillable by it: the blow is a plain heart off him instead.
    if (e.kind === 'butcher') { e.die(this, 'club', dirx, diry); this.world.splat(e.x, e.y, dirx, diry, 10); this.audio.sfxThud(); return; }
    if (e.hp > 1) {
      e.hp -= 1; e.flash = 0.3;
    } else e.doomed = true;
    this.world.splat(e.x, e.y, dirx, diry, 10);
    this.audio.sfxThud();
    e.fling(dirx * S, diry * S, true); e.aware = true;
    e.flungBy = by;   // a body he threw himself is not a body thrown at him
  }
  // A man with a soul in him is a small boss of his own (`TUNING.soulBearer`): hearts on top of what
  // he had, and heavier, `knockMul` and `unliftable` read the flag, so the rest is automatic.
  // A gate's keeper (`levelDef.gateKeeper`): quicker, his club leaving witchfire behind
  // (`Enemy.keeperFire`) that he is no more careful of than anybody (26 Sep 2026), and carrying his
  // gate's soul, with his kind's own hearts plus `soulKeeper.hp` (25 Sep 2026: "the base unit's health +1").
  keepGate(e, room) {
    const K = TUNING.soulKeeper;
    e.keeper = true; e.speed *= K.speed;
    const base = e.hp; this.ensoul(e); e.hp = e.maxHp = base + K.hp; e.soulGate = room;
  }
  ensoul(e) {
    e.soul = true;
    // A boss with a soul is the strong one (violet): `boss.hp`, or his own if more, under the soul's
    // heart. The champion's bare +1 (`boss.champHp`) is for a boss carrying nothing. Not the ogre.
    if (e.boss && e.kind !== 'butcher') e.hp = Math.max(TUNING.boss.hp, e.hp);
    e.hp += TUNING.soulBearer.hp; e.maxHp = Math.max(e.maxHp, e.hp);
    // And what the soul lends his kind besides (`soulBearer.traits`, the ENEMIES tab's row tag).
    const S = TUNING.soulBearer, traits = S.traits[e.champion ? 'champion' : e.kind] || [];
    if (traits.includes('swift')) e.speed *= S.swift;
  }
  onKill(e, cause) {
    Talisman.onKill(this, e, cause);
    Stats.kill(this, e, cause);
    // Where he fell, for the skulls on the death screen's map.
    if (this.killMarks) this.killMarks.push({ x: e.x, y: e.y });
    if (!this.firstKill) this.firstKill = { kind: e.kind, cause: cause || '?', t: this.timer };
    // And for the crow, which follows the dead and not the goat (js/beasts.js). A mark ages out of
    // the list after `crow.markFor` seconds, so a room cleared long ago stops calling it back.
    this.crowMarks = this.crowMarks || [];
    this.crowMarks.push({ x: e.x, y: e.y, t: this.timer });
    if (this.state === 'play' && !this.goat.dead) this.audio.musicEvent('kill');
    // The last man of the room he was put in: the score says the room is done.
    if (this.state === 'play' && !this.goat.dead && e.room >= 0 && !e.scripted &&
      !this.enemies.some((o) => o !== e && !o.dead && !o.scripted && o.room === e.room)) this.audio.musicEvent('cleared');
    this.kills++;
    Motes.spawn(this, e);   // a white soul over him, the god's once it reaches the goat (js/motes.js)
    const J = TUNING.juice, big = e.kind === 'butcher' || e.kind === 'ratogre';
    if (e.kind === 'ratogre') Shop.ogreDown(this, e);
    // The room that was holding a soul back gives it up with its last man.
    if (this.bonusRoom >= 0 && e.room === this.bonusRoom && !this.enemies.some((o) => !o.dead && o.room === this.bonusRoom)) {
      this.bonusRoom = -1; this.dropSoul(e.x, e.y);
      this.floatText(e.x, e.y - 48, 'THE ROOM GIVES UP A SOUL', PALETTE.witchHi);
    }
    // Kills inside the window stack: each one hits harder and holds the frame longer.
    this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
    this.comboTimer = J.comboWindow;
    const dx = e.x - this.goat.x, dy = e.y - this.goat.y;
    this.hitstop(J.hitstop + Math.min(J.comboHitstopCap, this.combo * J.comboHitstopMul));
    const comboMul = this.combo >= 2 ? J.comboShakeMul : 1;
    this.shake((big ? 14 : J.shakeKill) * comboMul);
    this.kick(dx, dy, J.kick * (big ? 1.7 : 1) * comboMul);
    this.zoomPunch(big ? 2 : 1);
    const cold = e.kind === 'wraith';
    this.flash(cold ? PALETTE.witchHi : PALETTE.blood, big ? 0.24 : cold ? 0.16 : 0.11);
    const direction = hyp(e.vx,e.vy) > 20 ? Math.atan2(e.vy,e.vx) : Math.atan2(dy,dx);
    this.fx.death(e,cause,Math.cos(direction),Math.sin(direction));
    if (cause !== 'fall') this.ring(e.x, e.y, J.impact.killRing * TILE, cold ? PALETTE.witchHi : PALETTE.bone, J.impact.killLife, 5);
    // A death is heard over everything (`GameAudio.sfxDeath`): its own sound on the bus nothing ducks,
    // the rest stepping back round it, deeper for a big man or a chain. Over an edge his fall is the
    // sound, and the wraith's undoing is its own; both still get the room's silence round them.
    const SL = TUNING.audio.spotlight, loud = (big ? SL.big : 1) * (this.combo >= 2 ? SL.chain : 1), heard = this.audio.heard(dx, dy);
    if (cause === 'fall' || cold) this.audio.spotlight(loud * SL.quiet);
    else this.audio.sfxDeath(heard, loud);
    if (big) { this.audio.sfxBell(true); this.floatText(e.x, e.y - 44, e.kind === 'ratogre' ? 'THE RAT OGRE IS DOWN' : 'THE OGRE IS DOWN', PALETTE.fireHi); this.slowTimer = J.killSlow; this.vibe(40); }
    else this.vibe(12);
    if (this.combo >= 2) {
      this.floatText(e.x, e.y - 40, 'x' + this.combo, PALETTE.fireHi);
      this.audio.sfxKill(this.combo);
      if (this.combo >= 3) { this.slowTimer = Math.max(this.slowTimer, J.comboSlow); this.flash(PALETTE.fireHi, 0.15); }
    }
    // Whoever was watching him says something about it.
    for (const o of this.enemies) {
      if (o === e || o.dead || o.held || !o.aware) continue;
      if (hyp(o.x - e.x, o.y - e.y) > 7 * TILE) continue;
      if (!this.world.los(o.x, o.y, e.x, e.y)) continue;
      this.bark(o, 'panic', 0.5); break;
    }
    if (!cold) {
      this.world.emitNoise(e.x, e.y, TUNING.noise.splat);
      if (cause !== 'fall' && cause !== 'burn') this.particles(e.x, e.y, big ? 12 : 6, PALETTE.blood, 160);
    }
  }
  // Off his feet: no verbs until it passes. The pen is the only thing that does it to him.
  stunGoat(t) {
    const g = this.goat;
    if (g.dead) return;
    if (g.holding) { const h = g.holding; g.holding = null; h.held = false; if (!h.item) { h.state = 'floored'; h.timer = TUNING.goat.grab.letGo; } }
    g.state = 'stunned'; g.timer = t; g.dazed = Math.max(g.dazed, t + 0.6);
    this.shake(10, true); this.kick(0, 1, TUNING.juice.kick, true); this.hitstop(0.06);
    this.slowTimer = Math.max(this.slowTimer, 0.3); this.vibe(60);
    this.audio.sfxClub();
  }
  // Every call site passes its own amount; `juice.stop` and `juice.screen` scale them all at once.
  hitstop(t) { this.hitstopTimer = Math.max(this.hitstopTimer, t * TUNING.juice.stop); }
  // A shake of the whole picture. `hurt` is the second argument and it is the whole of the policy:
  // only a blow the GOAT took is allowed to move the screen (`TUNING.juice.shakeOther` is zero for
  // everything else). A kill, a crate, a gong, a door, a bomb, the wheel and the pen all still call
  // it, at the amounts they always did, they simply do nothing until somebody turns that dial back
  // up. The reason is that a shake is information: if everything shakes the picture, nothing does,
  // and the one event the player has to feel without looking at the hearts is the one that gets lost.
  // Value noise in -1..1, smoothstepped between hashed lattice points; `ch` picks an unrelated stream.
  static shakeNoise(t, ch) {
    const h = (i) => { let x = Math.imul(i ^ (ch * 0x9e3779b9), 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 2147483648 - 1; };
    const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f);
    return h(i) + (h(i + 1) - h(i)) * u;
  }
  // SCREEN SHAKE in the settings: one multiplier on every shove of the picture (shake, kick, lens).
  shakeMul() { const v = this.settings && this.settings.shake; return v === undefined ? 1 : clamp(v, 0, 1); }
  // A heavy thing in the world (a landing, a blast): a small shake that fades with its distance.
  thud(x, y, a) {
    const J = TUNING.juice, d = hyp(x - this.goat.x, y - this.goat.y) / TILE;
    const f = clamp((J.thudFar - d) / (J.thudFar - J.thudNear), 0, 1);
    if (f > 0) this.raiseShake(a * J.screen * this.shakeMul() * J.shakeThud * f);
  }
  shake(a, hurt) { this.raiseShake(a * TUNING.juice.screen * this.shakeMul() * (hurt ? 1 : TUNING.juice.shakeOther)); }
  // A shake that takes over starts a fresh swing along a new line.
  raiseShake(amt) { if (amt <= this.shakeAmt || amt <= 0) return; this.shakeAmt = amt; this.shakeAge = 0; this.shakeDir = Math.random() * Math.PI * 2; }
  // A shove of the whole picture away from the impact, on top of the random shake. Not a shake, it
  // is one push in one direction and it reads as weight, so it keeps `kickOther` of itself rather
  // than none of it when what caused it was not the goat being hit.
  kick(dx, dy, amt, hurt) {
    const d = hyp(dx, dy) || 1;
    amt *= TUNING.juice.screen * this.shakeMul() * (hurt ? 1 : TUNING.juice.kickOther);
    this.kickX += dx / d * amt; this.kickY += dy / d * amt;
    const m = hyp(this.kickX, this.kickY), max = TUNING.juice.kickMax;
    if (m > max) { this.kickX *= max / m; this.kickY *= max / m; }
  }
  zoomPunch(mul) { this.zoomKick = Math.max(this.zoomKick, TUNING.juice.zoomKick * TUNING.juice.screen * this.shakeMul() * (mul === undefined ? 1 : mul)); }
  flash(color, amt) { amt *= TUNING.juice.screen; if (amt > this.flashAmt) { this.flashAmt = amt; this.flashColor = color; } }
  // Wet chunks that fly off a kill and stain the floor where they land.
  gore(x, y, n, dirx, diry) {
    const d = hyp(dirx, diry) || 1;
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(diry / d, dirx / d) + (Math.random() - 0.5) * 2.4, sp = 120 + Math.random() * 380;
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.25 + Math.random() * 0.45,
        color: Math.random() < 0.3 ? PALETTE.bloodDark : PALETTE.blood, size: 2.5 + Math.random() * 4, chunk: true });
    }
  }
  // Horns closing on nothing. It is said where it happened, a few times, and then the run is
  // expected to have understood: you cannot hit what has not arrived yet.
  // The one-line lessons the run gives once and not again: the hound's growl, the hen, the door that
  // shuts itself, the mist. They used to be reset on every level (the hound and the hen) or never at
  // all (the clock and the mist, once a page load), where each of them promises once a run.
  // THE TRIP's hands. Everything the goat reads is read through this for the length of the level:
  // the stick the other way round, the horns on the grab button and the grab on the horns, the
  // tumble on the voice and the voice on the tumble. No key is added and none is taken away; the
  // same four verbs, each on a button the hand does not expect. Grab is a button that is held, so
  // it goes to the physical button that is held (`mouseButtons`, or the butt pad under a thumb),
  // and the headbutt is a press, so it takes the press edge of the grab button.
  tripInput(real) {
    const t = Object.assign({}, real);
    t.mx = -real.mx; t.my = -real.my;
    t.rollPressed = real.spacePressed; t.spacePressed = real.rollPressed;
    const buttHeld = this.touch.active ? this.touch.pressed.butt !== undefined
      : this.pad.active ? this.pad.buttHeld() : KeyBind.held(this, 'butt') || (kbOn(this) && (this.keys.has('KeyJ') || this.keys.has('KeyZ')));
    // A press latched by the pointer (`rmbPressed`) counts even if the button was up again by now:
    // a quick tap inside a kill's hitstop was lost, the one edge the frozen frames did not keep.
    const grabEdge = (real.rmbDown && !this.tripGrabWas) || !!real.rmbPressed;
    this.tripGrabWas = real.rmbDown;
    t.lmbPressed = grabEdge; t.rmbDown = buttHeld;
    return t;
  }
  // A tuft of mushrooms, gone down in one: the next level is THE TRIP.
  eatShrooms(p) {
    p.broken = true; p.dead = true;
    this.tripAt = this.levelIndex + 1;
    this.floatText(p.x, p.y - 30, 'YOU ATE SOMETHING', PALETTE.witchHi);
    this.floatText(p.x, p.y - 50, 'THE NEXT FLOOR WILL BE WRONG', PALETTE.witch);
    this.particles(p.x, p.y, 16, PALETTE.witchHi, 140);
    this.ring(p.x, p.y, 2 * TILE, PALETTE.witch);
    this.flash(PALETTE.witch, 0.25); this.zoomPunch(1.2);
    this.audio.sfxBleat(380, 0.2, 0.6);
  }
  // The room whose box is closest to a point that is in none of them, a corridor's two ends.
  nearestRoomIdx(x, y, fallback) {
    let best = fallback, bd = Infinity;
    for (const r of this.level.rooms) {
      const dx = Math.max(r.x * TILE - x, 0, x - (r.x + r.w) * TILE), dy = Math.max(r.y * TILE - y, 0, y - (r.y + r.h) * TILE);
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = r.index; }
    }
    return best;
  }
  // The first wraith of a run that lies in wait as a box or a bowl does it in a room with nobody
  // else in it. Met in the thick of a fight it was one more thing going on; met in an empty room
  // it is the breath of relief and then the thing that was never a box (playtest, 23 Sep 2026).
  // Every hidden one before that room comes out as mist instead, and whoever else was put in the
  // room is taken out of it before the level starts. `hideTaught` is set when it springs.
  stageFirstHide() {
    if (this.hideTaught) return;
    const wr = this.enemies.filter((e) => e.kind === 'wraith' && e.room > 0).sort((a, b) => a.room - b.room);
    if (!wr.length) return;
    const alone = (e) => this.enemies.every((o) => o.room !== e.room || o.kind === 'wraith');
    const pick = wr.find((e) => e.state === 'hidden' && alone(e)) || wr.find(alone) || wr.find((e) => e.state === 'hidden');
    if (!pick) return;
    for (const e of wr) if (e !== pick && e.room <= pick.room && e.state === 'hidden') { e.state = 'idle'; e.disguise = null; }
    this.enemies = this.enemies.filter((o) => o === pick || o.room !== pick.room || o.boss || o.kind === 'wraith');
    if (pick.state !== 'hidden') pick.hide();
    pick.firstHide = true;
  }

  forgetLessons() { this.runJumped = false; this.hideTaught = false; this.tripAt = -1; this.darkAt = -1; this.houndTold = false; this.henTold = false; this.clockTold = false; this.mistSaid = 0; this.ogreTold = false; this.shopTold = false; this.gooseTold = false; this.beastTold = {}; this.boardTold = false; this.hungerOffered = false; }

  mistTold(e) {
    if (this.mistSaid === undefined) this.mistSaid = 0;
    if (this.mistSaid >= 3) return;
    this.mistSaid++;
    this.floatText(e.x, e.y - 26, this.mistSaid === 1 ? 'NOT HERE YET' : 'NOTHING TO HIT', PALETTE.witchHi);
    this.audio.sfxSwing();
  }

  // A hound has nothing to say. It growls, and the first one of a run says what answers it.
  houndSeen(dog) {
    this.audio.sfxGrowl();
    if (this.houndTold) return;
    this.houndTold = true;
    this.floatText(dog.x, dog.y - 34, this.mods.breath ? 'BURN THE HOUNDS' : 'BAAH BREAKS A HOUND', PALETTE.fireHi);
  }
  // The one thing in the compound that is not trying to kill him. The first coop of a run says what
  // she is for, because a bird walking after you explains nothing on its own, and a player who
  // does not know she is ammunition simply leaves her in the room she was let out of.
  henFreed(hen) {
    if (this.henTold) return;
    this.henTold = true;
    // In the box, like every animal let out since 30 Sep 2026: read, not glimpsed.
    Beast.talk(this, hen, BEAST_HELLO.chicken, true);
  }
  // One man speaks at a time: a crowd all shouting at once reads as noise, not as a cult.
  bark(e, kind, chance) {
    if (!e || e.dead || e.held || e.kind === 'dog' || this.state !== 'play') return;
    // The dead and the mouse's ogre have no words: they used to fall back on the clubman's, and a
    // wraith said BLESSED MEAT and the rat ogre begged MERCY over a man he had just killed.
    if (e.kind === 'wraith' || e.kind === 'ratogre') return;
    if (chance !== undefined && Math.random() > chance) return;
    if (this.barkCd > 0 || e.barkCd > 0) return;
    if (this.wordNear(e.x, e.y)) return;   // the same test a floating word is held to (`quiet.dy`)
    const pool = BARKS[kind]; if (!pool) return;
    const list = Array.isArray(pool) ? pool : (pool[e.kind] || pool.bearer);
    e.say = { text: list[(Math.random() * list.length) | 0], life: TUNING.bark.life, max: TUNING.bark.life };
    this.barkCd = TUNING.bark.gap; e.barkCd = TUNING.bark.perEnemy;
  }
  // `hurt` is the arc pointing back at what just hit you; `hurtVignette` is a plainer, non-directional
  // cue on top of it, the corners of the screen going red for a beat, because an arc on one edge of
  // the screen is easy to miss at a glance and a hit landing is the one thing a player must never be
  // unsure happened. It carries no direction and no angle, only that a heart just went.
  hurtFlash(angle) {
    this.hurt = { angle, life: 0.6 }; this.hurtVignette = { life: TUNING.juice.hurtVignette.life };
    this.vibe(35); this.flash(PALETTE.blood, 0.16);
  }
  ring(x, y, r, color, life = 0.6, width = 3) { this.rings.push({ x, y, r, color, life, max: life, width }); }
  // Where a blow lands: a quick tight ring and a star of sparks thrown along the blow. The ring
  // says "here", the sparks say "that way", and neither outlives the hitstop by much.
  impact(x, y, dx, dy) {
    const I = TUNING.juice.impact;
    this.ring(x, y, I.ring * TILE, PALETTE.fireHi, I.life, 4);
    const base = Math.atan2(dy, dx);
    for (let i = 0; i < I.sparks; i++) {
      const a = base + (Math.random() - 0.5) * 1.6, sp = 260 + Math.random() * 220;
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.12 + Math.random() * 0.1, color: PALETTE.fireHi, size: 2, streak: true });
    }
  }
  // Soft puffs off the hooves, pushed back along (dx, dy), the opposite of where he is going.
  dust(x, y, n, dx, dy) {
    const D = TUNING.juice.dust;
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * (dx || dy ? 1.8 : 6.3), sp = D.speed * (0.4 + Math.random());
      this.puffs.push({ x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: D.life * (0.7 + Math.random() * 0.5), max: D.life * 1.2, r: D.size * (0.7 + Math.random() * 0.6) });
    }
  }
  // A spring on the goat's scale: the renderer reads `goat.sqLeft` and `goat.sqT` and wobbles it out.
  squashGoat(amt) { const g = this.goat; if (!g) return; if (Math.abs(amt) >= Math.abs(g.sqLeft || 0)) { g.sq = amt; g.sqT = 0; g.sqLeft = amt; } }
  particles(x, y, n, color, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random());
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.5, color, size: 2 + Math.random() * 3 });
    }
  }
  // Not every word: what only captions the picture (`effects.quiet.words`) is never written, and one
  // landing on top of another just written is dropped (1 Oct 2026: "overloaded with text").
  floatText(x, y, text, color) {
    const Q = TUNING.effects.quiet;
    if (Q.words.includes(text) || this.wordNear(x, y)) return;
    this.floats.push({ x, y, text, color, life: TUNING.effects.floatLife });
  }
  wordNear(x, y) {
    const Q = TUNING.effects.quiet;
    if (this.state !== 'play' || this.intro) return false;   // the opening's call and answer is two words side by side on purpose
    return this.floats.some((f) => !f.on && f.life > TUNING.effects.floatLife - Q.gap && Math.abs(f.x - x) < Q.r && Math.abs(f.y - y) < Q.dy);
  }
}

window.addEventListener('load', () => { window.game = new Game(document.getElementById('game')); });
