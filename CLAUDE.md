# Working on Goat Out

Instructions for any session picking this project up. Read this first, then `CONCEPT.md` for what the
game is trying to be. `README.md` is for a player, this file is for whoever is building it.
`MARKET.md` is the commercial picture: comparables, the 2026 storefront and the open positioning decisions.
`BACKLOG.md` is what playtesting has asked for and has not got yet — read it before inventing work.

---

## What this is

A playable prototype of a top-down, one-life, procedurally generated escape game. You are a sacrificial
goat running out of a cult's compound. Vanilla JavaScript, Canvas 2D, WebAudio. No build step, no
dependencies, no framework. Opening `index.html` runs the game.

`GENRE_RESEARCH.md` collects what reviews of reference games (Hotline Miami, Ape Out, and format-mates
that stayed niche) actually praise and blame, as a genre guideline. Background reading, not a spec.

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
| `js/tuning.js` | `TILE`, `TILT`, `PALETTE`, `TUNING`, `BOON_BASE`, `BOONS`, `BARKS`, `LEVELS`. Every tunable number, every line the cult shouts, and the five level definitions. |
| `js/rng.js` | Seeded RNG (mulberry32) plus `clamp` / `lerp` / `len` / `angleDiff`. |
| `js/rooms.js` | Hand-authored room templates as character grids, with a legend at the top (`'w'` is a stand of arms). Also the start room, the arena, the Mill room, the Great Hall and the Gallery. Templates carrying a `tag` belong to one level's pool. |
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
| `tools/balance.js` | Prints the difficulty curve of every level and fails on a broken balance rule. |
| `tools/check-sync.js` | Checks the working tree, `origin/main` and the published artifact are one build. See *Publishing*. |
| `BACKLOG.md` | Playtest notes, dated and tagged bug / feel / number / system. Requests, not decisions. |

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

**Fire takes the wheel.** Anything alight loses its AI and blunders: `burnDir` wanders, walls turn it,
and `moveToward` is called with no `game` so it does not even dodge hazards. The Butcher is no longer
the exception — he blunders too, and what he alone gets is the far side of it: `burnHearts` comes off
over `burnTick`, and when `burning` runs out he lands in `stagger` instead of dying. A boss that walks
his line at you through a fire reads as the fire not counting, which is why nothing does it any more.
`ignite` also takes whatever it lit out of the goat's mouth.

**Props.** One `Prop` class for brazier, pot, bell, door, table, lamp, mill, heal and weapon. `blocking`,
`stopsBullets` and `item` are getters, not fields. `headbutt()` dispatches per kind. `item` is what the
goat can pick up and throw — a pot or a weapon — and it is the test everywhere the code used to ask
`kind !== 'pot'`.

**Stands of arms.** A `weapon` prop is both the rack and the thing in it: `inStand` is true until it is
first taken, and the rack is only drawn while it is. `weapon` is `sword` or `shield`. It is grabbed like
a pot, thrown by releasing grab, and flies in `updateWeapon`; `hitMan` is where a sword kills and sticks
and a shield flattens and carries on, `passed` stopping it hitting the same man twice on one throw. A
carried shield turns `prop.weapon.shieldHits` bullets in `Bullet.update` before it splinters. Nothing is
consumed: both lie where they land and are grabbable again. `'w'` in a room template places one; `racks`
on a level definition is the chance an ordinary room gets one or two more.

**One new thing to a room.** `game.taught` is a list of what the run has already been shown — enemy
kinds, `'mill'`, `'<kind> boss'`. It is passed into `generateLevel` and comes back on the level as
`taught`. Any kind not in it gets a room to itself the first time it appears (the room's other men are
dropped); a new boss gets his arena alone, and the first Mill room keeps one man. `metRoom` inside the
generator also keeps the lone rifle posts from landing earlier in the level than the room that
introduces a rifle. A run that keeps its tomes keeps what it has learned; a fresh run forgets.

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

**The gong.** `Prop.ring` sets `goat.gong` to `TUNING.prop.bell.buff` seconds. While it runs, `Goat.update`
multiplies the three real cooldowns (`screamCd`, `grabCd`, `rollCd`) by `bell.cooldownMul` as they tick
and the top speed by `bell.speedMul`; `drawSkills` puts a draining strip under the rail. The noise it
makes is unchanged and is the price. `planEncounters` does not place it: the generator drops a `'b'`
marker unless the room's plan holds men, so it never lands in the pen or the two control rooms — an
empty room was where it used to sit reading as scenery.

**A man in your mouth.** `goat.holdLimit` is rolled in `tryGrab` from `mods.holdTime` and
`grab.holdVary`, so every grab lasts a different seven-to-nine seconds. Two kinds go on working while
held, and the branch for them is at the top of `Enemy.update` above every other state: a Hunter fires
`enemy.heldShots` rounds (rolled once per man in the constructor, never refilled — re-grabbing is not
reloading) and then is dry, and a Seer paints a rune **on himself**, which is to say on you.
`castRune` is the one place a rune goes off, shared by the held mage and the standing one; `fling`
clears `rune`, which is the only counter to a mage in your mouth.

**Barks.** `game.bark(enemy, kind, chance)` is the only way to make a man speak. It enforces a global gap
and a per-man cooldown, so a crowd never shouts at once. Lines live in `BARKS` in `tuning.js`; the bubble
is drawn in `drawEnemy`.

**Juice.** `game.kick(dx, dy, amt)` shoves the whole picture (capped at `juice.kickMax`), `zoomPunch`
drives the lens, `flash(color, amt)` paints an additive overlay, and `gore` throws chunks that stain the
decal canvas when they expire. The renderer applies kick and zoom in `draw`, and everything decays in
`updateEffects`.

**Difficulty.** `THREAT`, `ENCOUNTER` and each level's `encounters` block in `tuning.js` are the whole
model; `planEncounters()` in `gen.js` turns them into a per-room plan before anything is placed, and the
generator only finds floor for what the plan says. Two rules it enforces:

1. *Met alone.* A kind's first appearance in a run is a room holding one of it and nothing else — a
   first-of-its-kind boss gets no escorts either. `levelDef.met` (computed once under `LEVELS`) carries
   what earlier levels already showed, so a kind is introduced once a run rather than once a level.
2. *Threat, not bodies.* A room's budget comes off the level's curve (`from` → `to`, bent by `ease`) and
   is spent on whatever has been introduced, capped per kind and per room. A level is harder than the
   last because its two numbers are bigger.

**Milk.** `heals` on a level definition is a floor, not the count. The generator takes
`max(levelDef.heals, ceil((rooms - 1) / TUNING.prop.heal.every))`, cuts the level into that many bands
measured **in rooms rather than in eligible rooms**, and gives each band the ordinary room nearest its
middle. A run of arenas and set pieces can no longer stretch the dry spell: the worst gap on any level
is five rooms. Only the tile inside the room is random.

Change any of it and run **`node tools/balance.js`**: it prints the curve room by room and exits non-zero
if a kind arrives in a crowd first, a cap breaks, threat stops rising inside a level, or a level is not
harder than the one before. Adding an enemy kind means: a `THREAT` value, an `ENCOUNTER.weight`, usually
a `cap`, and an `introduce` entry on the level that first shows it.

**Room pools.** `ROOM_TEMPLATES` entries with a `tag` are drawn only by a level whose `pool` matches;
untagged ones are the default set everything else uses. THE THRESHING FLOOR is `pool: 'open'`, and its
`corridorW: 5` widens the S-corridor so the rooms read as one yard. A wide corridor deliberately eats
the room borders it passes through — that is the mechanism behind "fewer walls", and it is why the level
needs furniture (posts, tables, braziers, hay) to keep kills coming from geometry.

**The pen.** Cage bars are ordinary `Prop`s of kind `cage`, built by `buildCage` in `gen.js` and exempt
from the three-tile prop clearance around the start. It takes `prop.cage.hits` blows — seven — and one
headbutt can reach two or three bars at once, so `breakCage` counts blows and not bars by gating on
`game.cageLunge === goat.lungeId`. Each blow bleats a line from `prop.cage.strain`; on the blows in
`prop.cage.stunAt` the goat is put on the floor by `game.stunGoat`. The last blow breaks every bar and
sets `game.cageOpen`, which is what hides the floor prompt. Only levels with `startCage` get one.

**Which side the dead come from.** Every wraith rolls `enemy.approach` once in the constructor: a signed
angle between `wraith.behind + wraith.flank` and π, so it drifts to a point on your shoulder, your
flank or your back, left or right, but never your front. `updateWraith` uses `look + this.approach`
rather than `look + π`, and the drift wobble is clamped to `|approach| - behind` so a shoulder approach
can never wander into the cone it is not allowed to manifest from. Three of them no longer queue up in
the same place behind you — they surround you.

**The wraith, and what "not there" means.** `Enemy.ghosted` is `kind === 'wraith' && !solid`, and it is
the question every single thing that reaches for an enemy has to ask: headbutt, breath, grab, thrown pot,
thrown blade, bullet, Mill arm, door, table, bomb, scream, fire, entity collision, friendly fire, the
roll's threat sense, the music's threat count and the health notches. Mist also skips `collideCircle`,
which is how it crosses walls. `updateWraith` drifts it to a point `wraith.standoff` tiles behind the
goat's *facing* and calls `manifest` only when it is past `wraith.behind` radians off that facing, within
reach, off cooldown, and **not standing in a wall** — a body cannot form inside stone, which is the one
thing the ground still does for you there. From `manifest` it runs `manifest → windup → swing → solid`
on timers and cannot be interrupted: `daze` on a wraith freezes it where it stands instead of cancelling
it (the shared dazed check stops the timers, so a scream lengthens the window rather than ending it).
`unmanifest` puts it back to mist with `fadeCd`. It dies to anything that lands in that window, its
`die` leaves no blood, body or scorch, and a boss with hearts left goes straight back to mist instead of
lying floored. `game.mistTold` is the only tutorial it gets.

**Goat stun.** `goat.state === 'stunned'` is a real state, not a render pose: `Goat.update` returns early
while it lasts, so there are no verbs, no aim and no momentum, and `goat.dazed` draws the stars over it.
`game.stunGoat(seconds)` is the only way in, and the pen is the only thing that uses it.

**The first screen.** State `title`, drawn entirely by `drawTitle` and holding two buttons and nothing
else: the opening scene tells the story and the floor of level 1 teaches the buttons, so the menu
explains neither. `game.menu` is `{ index, rects, t, shake }`; `drawTitle` refills `rects` every frame
and `menuAt` / `menuPick` are the only ways in, from a pointer (hit-tested in `pointerdown` like the
tome cards) or from the keys the game already uses (`menuKey`: W/S or the arrows to move, SPACE or
ENTER to choose). NEW GAME wipes the save and plays the opening scene; CONTINUE is dark and shakes
its head until there is a run to come back to. `drawTitle` paints the whole canvas, vignette and empty
thumb deck included, so nothing from the play view shows through.

**The tome cards.** `takeBoon` is reachable from three places and all three are explicit: Digit1/2/3,
and a pointer that goes **down and up on the same card** (`boonDown` holds the index it went down on,
`boonAt` hit-tests `boonRects`). `boonArm` (`TUNING.boonArm`) makes the cards refuse everything for a
beat after they appear, so the click that killed the boss cannot spend what he dropped. Nothing
selects on hover, and nothing selects on a press alone.

**The saved run.** `saveRun` writes `{ v, level, boons: [id], totalKills, deaths, at }` to
`localStorage` under `SAVE_KEY` at the head of every level and again whenever a tome is taken; `loadRun`
refuses anything of another version or off the end of `LEVELS`, and every call is wrapped, so a browser
that refuses storage simply never offers CONTINUE. Winning clears it. CONTINUE re-enters the head of
that level with those tomes and a fresh seed — the layout is generated again, as it is after a death.
Boons are stored by `id`, so renaming one in `BOONS` silently drops it from old saves.

**The opening scene.** It cannot be skipped until a browser has watched it through once: `SEEN_KEY` in
`localStorage` gates both the skip in `updateIntro` and the CLICK TO SKIP line in `drawIntroOverlay`,
and `endIntro` is what writes it. `skipIntro(true)` is unconditional so the harness still works.
Every beat is in `TUNING.intro` — `huddle`, `arrive`, `gate`, `gateHold`, `lunge`, `fade`, `black`,
`wake`, and the `walk`/`run` speeds the two men move at, with `push` the camera creep. Nothing in
`updateIntro` carries a literal duration any more.

`game.beginIntro()` runs in the real level 1 with the real pen, in state `intro`,
driven by `updateIntro` and one method per beat (`introHuddle`, `introApproach`, `introGate`,
`introGrab`, `introClub`, `introFade`, `introBlack`, `introWake`). Everything it owns lives in
`game.intro`: the sheep, the heart, the two men, the gate bars. The men are ordinary `Enemy` objects
with `scripted` set (their `update` returns at once, so anything that ages on them, such as a bark, is
aged by `updateIntro`) and `knife` on the one who carries the knife; they are moved with `followPath`
and speak with `say`, which bypasses the crowd rules of `bark`. The gate is the three `v`-axis bars on
the right of the pen; `prop.gate` (0..1) lays a bar flat in `drawPropBody`. The goat is moved by hand
too; `goat.state = 'ko'` is a render pose only, `goat.dazed` draws the stars, `goat.jitter` the tremble.
`skipIntro()` jumps to the dark, `skipIntro(true)` straight to play, and `endIntro` resets the goat and
removes the men. Only `startLevel(..., withIntro)` from the title or the win screen plays it; the
`ritual` flag on a level definition is what makes the first room the ritual room at all.

**Stairs.** `T.EXIT` and `T.ENTRY` are both drawn by `drawStairs`; `level.exitTile` and `level.entry`
say where each flight starts. Stepping onto the exit enters state `climb` (`beginClimb`, `updateClimb`)
for `stairs.climb` seconds before `levelCleared`. `game.stairFx = { t, dir }` is what `drawGoat` reads
to lift, shrink and fade him: `dir` 1 going up and out, -1 arriving, which `startLevel` sets on any level
with an `entry`. Levels without `ritual` start at the top of the entry flight rather than the room centre.

**The other cage.** Built by `buildCage(..., deco)` from `TUNING.prop.deadCage`; its bars carry `deco`,
which keeps them out of `breakCage`, out of the gate, and out of the in-front-of-the-goat draw pass.
What is in it is painted on the decal canvas by `paintStartRoom`.
**The roll.** `Goat.rollDirection` scores 24 candidate angles against nearby men (weighted up if one is
mid-swing), walls and fire, and honours the stick when there is one. With no direction asked for it is a
pure escape, which is the whole reason the button exists on a phone.

**Arms are consumable.** `prop.uses` counts what a weapon has left, off `TUNING.prop.weapon.uses` —
a sword 1, a shield 3. `Prop.snap()` is the single place one is destroyed: it is called by the sword
when it kills or hits a wall, by the shield when a flattened man or a turned bullet takes the last
charge, and it clears `goat.holding` itself. Nothing broken is ever picked up again, so a level's
arms budget is the count of stands in it. `levelDef.racks` is the per-room chance and
`levelDef.racksFrom` a fraction of the level before which no stand is placed at all, including the
`w` markers in a template.

**The killbox.** `levelDef.killboxAt` picks `KILLBOX_TEMPLATE`, which sets `noFlipX` because its two
rifles ARE its far wall. `planEncounters` hands that room a fixed cell from `ENCOUNTER.killbox` —
rifles first, then the men on your side — and the first `cell.alert` spawns come out with
`alert: true`, which `startLevel` turns into `enemy.watchful`. A watchful man sees
`cfg.sight + cfg.watchSight` tiles with no cone at all, and `updateHunter` keeps him on his post
instead of closing. The room is only itself once rifles are a kind the run has met; before that it
fills like any other room.

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
`tools/shots/`. `startPlay()` clicks through the title and drops the opening scene with
`game.skipIntro(true)`; to watch the scene itself, call `game.menuPick(0)` on the title and wait for
`game.state === 'intro'`. `game.startLevel(0, seed, false, true)` replays it from anywhere. A run left
in `localStorage` by an earlier test is what CONTINUE offers — `game.clearRun()` forgets it.

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

**Always run `node tools/balance.js` after touching anything about who spawns where.** It is the only
place the balance rules are written down in a form that can fail.

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

**"Deploy" means three things, in this order, every time: merge the work into `main`, push it, and
publish the artifact.** The user says "deploy" to mean "put it live", and a branch that only sits on
the remote is not live. Never stop at the feature branch and never leave `main` behind — if a session
was developing on `claude/<something>`, merge that branch into `main` and push `main` as part of the
deploy, then publish. Opening a pull request instead is only right when the user asks for one.

The artifact is published from `artifact.html` with all eleven scripts passed as supporting files, and
always to the existing URL. Republishing without the `url` creates a second artifact.

- `file_path`: `artifact.html`
- `url`: `https://claude.ai/code/artifact/098e742b-e742-4ce7-8499-a303fa5db021`
- `root`: the project directory
- `files`: every file in `js/`, mapped path-to-path
- `label`: a short version tag, for example `0.7 whatever landed`

If you add a new file under `js/`, it must go into three places: both HTML files' script lists and the
publish `files` map. Forgetting the map means the live page breaks while the local one works.

Run **`node tools/check-sync.js`** to confirm all three copies agree: it fails on a dirty tree, a `main`
that is ahead of or behind the remote, a branch that was never folded in, script lists that have drifted
apart, and a file in `js/` that no HTML file loads. The artifact half needs the published sizes, which
only Claude can fetch — `action: "list_files"` on the artifact URL — so save that listing to a file and
pass it as `--artifact <file>`; without it the script prints the local byte counts to compare by eye.

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
- Where his wife is. The opening scene carries her off deeper into the compound and nothing after it
  refers to her: no room, no ending, no line from the cult.
- Pixel art proper. Everything is still drawn with canvas primitives in the final palette.
- Gamepad support, a Priest boss, and the later acts sketched in `GOAT_OUT_brief.md`.
- One thing from the 14 Sep 2026 playtest, written up in `BACKLOG.md`: how a score weighs time against
  kills without quietly turning a run into a clearing job. The soul barrier was asked for and parked the
  same day, for the same reason pillar 1 gives; the new level goes in at six and THE OSSUARY moves to
  seven, keeping the finale. Everything else in that batch is buildable as written.

`GOAT_OUT_brief.md` is the original stage-one design brief. It is history, not spec: several of its
decisions have since been overridden. `CONCEPT.md` is the current truth.
