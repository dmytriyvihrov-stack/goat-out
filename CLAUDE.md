# Working on Goat Out

Instructions for any session picking this project up. Read this first, then `CONCEPT.md` for what the
game is trying to be. `README.md` is for a player, this file is for whoever is building it.

---

## What this is

A playable prototype of a top-down, one-life, procedurally generated escape game. You are a sacrificial
goat running out of a cult's compound. Vanilla JavaScript, Canvas 2D, WebAudio. No build step, no
dependencies, no framework. Opening `index.html` runs the game.

The published build lives at **https://claude.ai/code/artifact/098e742b-e742-4ce7-8499-a303fa5db021**.
Always update that same URL rather than publishing a new artifact (see *Publishing* below).

---

## Ground rules

1. **Never add a new input.** The whole design rests on a small verb set: move, headbutt, grab/throw,
   roll, scream. Upgrades bend the numbers behind those verbs or change what a button does. They never
   add a seventh button. If a feature seems to need a new key, find a way to fold it into an existing one.
2. **All numbers live in `js/tuning.js`.** Nothing gameplay-relevant should be a literal anywhere else.
   If you find yourself typing `0.35` into `enemies.js`, it belongs in `TUNING`.
3. **Kills come from geometry.** A headbutt on its own only knocks a man down. Walls, pillars, fire,
   the mill and other bodies are what kill. Preserve that: it is the reason the game reads as Ape Out
   rather than a brawler.
4. **Both sides are clunky.** Every attack has a windup you can read and a recovery you must eat. Do not
   add cancels, combos, or i-frames beyond the roll's.
5. **Comment the why, not the what.** The code is dense; a one-line comment above a non-obvious block
   that explains the intent is worth more than a paragraph.

---

## File map

| File | Holds |
|---|---|
| `js/tuning.js` | `TILE`, `TILT`, `PALETTE`, `TUNING`, `BOON_BASE`, `BOONS`, `BARKS`, `LEVELS`. Every tunable number, every line the cult shouts, and the three level definitions. |
| `js/rng.js` | Seeded RNG (mulberry32) plus `clamp` / `lerp` / `len` / `angleDiff`. |
| `js/rooms.js` | Hand-authored room templates as character grids, with a legend at the top. Also the start room, the arena, the Mill room, the Great Hall and the Gallery. |
| `js/gen.js` | Level generation: chains rooms, carves corridors, places props, spawns, heals, validates reachability. Defines the tile enum `T`. |
| `js/audio.js` | WebAudio. Buses, the drum machine, the music bed (`MUSIC`) and every one-shot effect. |
| `js/world.js` | Tile grid, collision, line of sight, flow field, fire (ordinary and witchfire), noise events, the persistent decal canvas, cult pictograms, the ritual start room. |
| `js/input.js` | `TouchUI` (on-screen controls) and `autoAim`. |
| `js/entities.js` | `Goat`, `Prop` (every world object), `Bullet`. |
| `js/enemies.js` | `Enemy` — one class, behaviour branches on `kind`. |
| `js/render.js` | Everything drawn. Roughly half the codebase. |
| `js/game.js` | State machine, fixed-step loop, input plumbing, entity-vs-entity collision, boons, dev drawer. |
| `index.html` | Local build. |
| `artifact.html` | Published build. Same scripts, artifact-shaped head. **Keep the two script lists in sync.** |
| `tools/serve.js` | Dev server. Also accepts `POST /shot?name=x` with a data URL and writes a PNG to `tools/shots/`. |
| `tools/harness.js` | Console test harness. See *Testing*. |

---

## Architecture notes

**Coordinates.** Simulation is flat top-down world space. Rendering squashes Y by `TILT` (0.86) so the
camera reads as slightly tilted. Sprites counter-squash with `ctx.scale(1, 1 / TILT)` so they stand
upright on a tilted floor. Anything drawn in world space that should not look squashed — floating text,
the `?` marks, the tome label — needs that same counter-scale with its `y` multiplied by `TILT`.
The mouse-to-world conversion in `readMoveInput` divides by `zoom * TILT` on the Y axis. If you add a
new screen-to-world conversion, do the same.

**The decal canvas.** `world.decal` is a persistent offscreen canvas at `DECAL_SCALE` (0.34) holding
blood, bodies, scorch marks, the cult pictograms and the start-room scene. It is never cleared during a
level. Pixel pictograms snap to whole decal pixels in `pixelGlyph`, otherwise the upscale turns them to
mush. Raising `DECAL_SCALE` costs memory fast: the world is 420x78 tiles.

**Two hits.** Anything with `hp > 1` — an arena elite, or any Seer — absorbs a killing blow in `die()`:
it goes down floored, loses one, gets up, and a Seer blinks clear. Fire counts, so a mage has to be lit
twice. Only `devour` and `boom` skip it.

**Dazed.** `enemy.daze(game, seconds)` is the scream's whole effect: the man freezes, whatever he was
winding up is cancelled, and stars orbit his head. It is a timer, not a state, so the flung / floored /
burning machinery underneath is untouched.

**Enemies.** One `Enemy` class. `kind` is `bearer`, `hunter`, `dog`, `seer` or `butcher`; `update()`
dispatches to `updateBearer` / `updateHunter` / `updateDog` / `updateSeer` / `updateButcher`. Shared
machinery (perception, being flung, burning, being held, the bomb fuse) sits above the dispatch. Arena
bosses carry `elite` and `boss` flags: elites absorb hits before dying, bosses drop a tome.

**The hound.** `kind === 'dog'` is the one enemy that is not a man: no barks (only `sfxGrowl`), no grab
(`tryGrab` skips it and says TOO QUICK), and `tryDodge` lets it slip `TUNING.dog.dodge` of the headbutts
aimed at it. Its loop is orbit → `dart` → `windup` → bite → `retreat`; the dart is the window you get,
and `drawHound` gives it the only tell it has (flattened body, streaks, lit eyes) — keep that tell if you
touch the sprite. `packBusy()` lets one hound of a pack commit at a time, which is what keeps three of
them readable. The counter is the scream: `daze()` multiplies by `cfg.dazeMul` for a dog, cancels a dart,
and a dazed dog cannot dodge. `game.houndSeen()` growls and teaches that once per run.

**Trap sense.** `hazardAt()` answers what will kill whoever is at a point — flame, a lit brazier, a rune
mid-cast, or the arm of the Mill about to come round (`Prop.millThreat` predicts `TUNING.ai.millLead`
seconds ahead, with `millClear` px of berth). `avoidHazard()` checks both **where he is walking and where
he is standing**: an arm sweeps onto a man who is holding still just as happily, and before that check
existed half a crowd died waiting at the edge. Standing in it, he leaves radially; walking into it, he
steps round; with no way round he gives ground.

Every enemy rolls a `trapSense` on spawn and then rolls against it **once per encounter** — `hazardSeen`
freezes the `hazardRoll` timer while anything is still in view, so the timer only runs down once he is
clear. Re-rolling every `rollGap` instead meant sustained exposure guaranteed a blunder and the wheel ate
everybody. Fail the roll and he is blind for `TUNING.ai.blindFor`, which is the one man in a crowd who
still rides the wheel into a wall. `game.hazards` (fixed for the level) and `game.runes` (rebuilt each
step) keep all of it off the per-frame prop loop.

**Props.** One `Prop` class for brazier, pot, bell, door, table, lamp, mill and heal. `blocking` and
`stopsBullets` are getters, not fields. `headbutt()` dispatches per kind.

**Boons.** `game.mods` is recomputed from `game.boons` by `applyBoons()`. Every use site reads
`game.mods.X` rather than `TUNING` directly, so nothing mutates `TUNING` (which would leak across runs).
Adding a boon means: add it to `BOONS`, add its default to `BOON_BASE`, and read the mod at the use site.
Give it a `skill` (`butt` / `grab` / `roll` / `scream`) and it hangs off that button in the HUD rail; leave
`skill` off and it is body work, listed but attached to nothing.

**The skill rail.** `drawSkills` (top right) is the only place the four verbs are reported: availability,
cooldown, and what the tomes did to each. `skillIcon` draws each verb from `game.mods`, so an icon has to
change when a boon lands — Long Horns lengthens the horns on the icon and on the goat, Dragon Breath turns
the mouth into a cone, Loose Joints adds a second turn to the roll. Add a boon, draw its effect here.

**Cooldowns.** Headbutt has none (its recovery is the cost). Throw does: `goat.grabCd`, set on every way a
man leaves your mouth, so grab is not a button you hold. Roll has its own. Both show on the rail and as
rings on the touch buttons; both read `game.mods`, never `TUNING`, at the use site.

**Fire has two kinds.** `world.fire` holds seconds left, `world.fireKind` holds 0 for ordinary flame and
1 for the Seer's witchfire. Witchfire spreads as witchfire, draws violet, scorches violet and ignores
`mods.fireImmune`; `isWitchPx` is the test. Anything that lights a tile passes the kind through.

**Barks.** `game.bark(enemy, kind, chance)` is the only way to make a man speak. It enforces a global gap
and a per-man cooldown, so a crowd never shouts at once. Lines live in `BARKS` in `tuning.js`; the bubble
is drawn in `drawEnemy`.

**Juice.** `game.kick(dx, dy, amt)` shoves the whole picture (capped at `juice.kickMax`), `zoomPunch`
drives the lens, `flash(color, amt)` paints an additive overlay, and `gore` throws chunks that stain the
decal canvas when they expire. The renderer applies kick and zoom in `draw`, and everything decays in
`updateEffects`.

**The pen.** Cage bars are ordinary `Prop`s of kind `cage`, built by `buildCage` in `gen.js` and exempt
from the three-tile prop clearance around the start. A headbutt on any of them breaks all of them and
sets `game.cageOpen`, which is what hides the floor prompt. Only levels with `startCage` get one.

**The roll.** `Goat.rollDirection` scores 24 candidate angles against nearby men (weighted up if one is
mid-swing), walls and fire, and honours the stick when there is one. With no direction asked for it is a
pure escape, which is the whole reason the button exists on a phone.

**The loop.** Fixed 1/60 step, max 5 substeps, in `game.frame`. `timeScale` drives slow motion.
A `setInterval` fallback drives the loop when `requestAnimationFrame` stalls, which it does when the
Browser pane is hidden. Do not remove it.

---

## Testing

The desktop app's Browser pane has two traps. A **hidden pane reports a zero-size viewport**, so
responsive layout collapses to its fallback, and **`requestAnimationFrame` stalls**. Work around both:

1. Call `resize_window` with an explicit width and height before testing layout. Reset it to the
   `desktop` preset when finished.
2. Save frames through the dev server rather than the screenshot tool, which times out when the app
   window is behind another window.

Start the server, then load the harness in the page:

```bash
node tools/serve.js 8766
```

```js
const s = document.createElement('script'); s.src = '/tools/harness.js'; document.body.appendChild(s);
```

`H` then gives you `startPlay()`, `tp(x, y)`, `aimAt`, `walkTo`, `headbutt()`, `freeze(except)`,
`unfreeze()`, `nearest(kind)`, `waitFor(fn, ms)`, `status()` and `shot(name)` which writes to
`tools/shots/`.

**Traps that have bitten before, in this exact order:**

- Testing a hound's dodge or bite without waiting out the goat's headbutt recovery (0.35s) between
  swings: the input is dropped, nothing happens, and it reads as the dodge being broken. Wait, or check
  `goat.lungeId` actually moved.
- Teleporting the goat next to a wall and then testing a mechanic that needs line of sight. `los()`
  from inside a wall fails immediately and everything downstream looks broken.
- `H.freeze()` freezing the very enemy under test. Use `H.freeze(target)` to spare one.
- Reading the console and seeing errors from *before* the last reload. The buffer is not cleared by
  navigation. Install a fresh counter and wait, rather than trusting the tail of the buffer.

A fourth trap: `H.startPlay()` leaves the goat in the pen on level 1. Break out first
(`H.aimAt = {x, y}` at a bar, then `H.headbutt()`) or nothing downstream can move. And the dev spawner
drops men **aware and adjacent**, so a handful of them will kill the goat during a test unless
`game.dev.god` is on — a dead goat freezes every enemy, which reads as the feature under test being broken.

**Always run the generator sweep after touching `gen.js`, `rooms.js` or `LEVELS`.** It catches broken
templates and impossible layouts in seconds:

```bash
node -e 'const fs=require("fs"),vm=require("vm");const ctx={console,Math,Uint8Array,Int16Array,Int32Array,Float32Array};vm.createContext(ctx);for(const f of ["js/tuning.js","js/rng.js","js/rooms.js","js/gen.js"])vm.runInContext(fs.readFileSync(f,"utf8"),ctx,{filename:f});vm.runInContext(`let fails=0;for(let li=0;li<LEVELS.length;li++)for(let s=1;s<=250;s++){try{generateLevel(LEVELS[li],s*1337)}catch(e){fails++}}console.log("fails:",fails)`,ctx);'
```

A syntax check over every file costs nothing and catches the class of error that only shows up at
runtime, such as a canvas call with too few arguments:

```bash
for f in js/*.js tools/*.js; do node --check "$f" || echo "FAIL $f"; done
```

---

## Publishing

The artifact is published from `artifact.html` with all eleven scripts passed as supporting files, and
always to the existing URL. Republishing without the `url` creates a second artifact.

- `file_path`: `artifact.html`
- `url`: `https://claude.ai/code/artifact/098e742b-e742-4ce7-8499-a303fa5db021`
- `root`: the project directory
- `files`: every file in `js/`, mapped path-to-path
- `label`: a short version tag, for example `0.7 whatever landed`

If you add a new file under `js/`, it must go into three places: both HTML files' script lists and the
publish `files` map. Forgetting the map means the live page breaks while the local one works.

---

## Conventions

- Two-space indent, semicolons, single quotes. Dense one-liners are fine where they read cleanly.
- All prose in the game and in the code is English. The user writes in Russian and English; reply in
  whichever they used.
- Palette colours come from `PALETTE`, never as literals, except for one-off shading tints inside a
  single sprite.
- Fonts are `FONT` and `FONT_SC` constants in `render.js` (Alegreya and Alegreya SC from Google Fonts).
- Version history and the reasoning behind each change live in `CHANGELOG.md`.

---

## Open questions the user has not settled

- Mirrors as an environmental puzzle. The original voice note said "lizards and mirrors"; the mirror
  half was interpreted as a puzzle object and parked. The other half is still unresolved.
- Whether one life means one life per level (current behaviour) or one per whole run.
- Pixel art proper. Everything is still drawn with canvas primitives in the final palette.
- Gamepad support, a Priest boss, and the later acts sketched in `GOAT_OUT_brief.md`.

`GOAT_OUT_brief.md` is the original stage-one design brief. It is history, not spec: several of its
decisions have since been overridden. `CONCEPT.md` is the current truth.
