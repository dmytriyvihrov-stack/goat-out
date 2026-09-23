# Working on Goat Out

Instructions for any session picking this project up. Read this first, then `CONCEPT.md` for what the
game is trying to be (it is the design truth). `README.md` is for a player, this file is for whoever is
building it. `MARKET.md` is the commercial picture: comparables, the 2026 storefront and the open
positioning decisions. `BACKLOG.md` is what playtesting has asked for and has not got yet — read it
before inventing work. `ART_HANDOFF.md` is for whoever is generating and packing art: what is already
drawn and wired in, what is still a placeholder, and how the pipeline works. `VISUAL_REFERENCE.md` is
the research behind the art style — how big a pixel should read at this camera and TILE size, and which
games are the real genre neighbors. Read it before starting a fresh art pass. `ENGINE.md` is for a
future port (Godot 4 most likely): whether to port at all, Godot working rules, and how each system here
maps onto it. Nothing in it is scheduled.

---

## What this is

A playable prototype of a top-down, one-life, procedurally generated escape game. You are a sacrificial
goat running out of a cult's compound. Vanilla JavaScript, Canvas 2D, WebAudio. No build step, no
dependencies, no framework. Opening `index.html` runs the game.

`GENRE_RESEARCH.md` collects what reviews of reference games (Hotline Miami, Ape Out, and format-mates
that stayed niche) actually praise and blame, as a genre guideline. Background reading, not a spec.
`GENERATION_RESEARCH.md` is the companion piece about level/world *generation* — how Spelunky, Isaac,
Gungeon, Dead Cells, Ape Out and others build a level, and what laws hold across most of them. Also
background reading, not a spec.

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
6. **Nothing may reward remembering a layout.** The game is in the regeneration camp — Ape Out,
   Spelunky, Isaac — and not the memorization camp Hotline Miami and Katana Zero are in: the level is
   never the same twice, so nothing in it can be worth *learning by heart*. What a level **is** —
   its canon, that it has a wheel, that a vault is cut off the middle of it — is knowledge and is
   meant to be had. Where a particular thing **stands** is not, and no reward may depend on it. The
   test: if a feature gets better the tenth time somebody plays that level, it belongs to a different
   game. See `GENERATION_RESEARCH.md` for why the two camps are the line they are.
7. **A room is bought on two axes, and neither of them is "more of the cheapest man".** `THREAT` buys
   the crowd; `groundOf` (`rooms.js`) buys the floor under it — how little of the room is available
   as a weapon — and `gen.js` deals a level's rooms out along both, tight and quiet first. Pillar 3
   is the reason there are two: if the wall is what kills, then taking the wall away is a way of
   making a room harder that a body count can never say. And `ENCOUNTER.cheap` is the floor under
   the whole thing — the clubman has a cap that *tightens* as a room gets richer, because a late
   room that is an early room with four more of him in it is not a late room.
8. **A promise the generator makes is written down as a rule.** Every one of them lives in
   `GEN_RULES` (`js/rules.js`) with a `check(level)`, so `node tools/balance.js` can hold it against
   many seeds of every level and the dev drawer's RULES page can paint it live. Add a behaviour to
   `gen.js`, add its rule in the same sitting — a promise nothing checks is a promise that has
   already quietly broken on some seed nobody has played. If one seed genuinely cannot answer it
   (`rises`, `ground`), the per-seed check says so by returning `true` or `null` and never blood, and
   the averaged version lives in the report.

---

## File map

| File | Holds |
|---|---|
| `js/tuning.js` | `TILE`, `TILT`, `PALETTE`, `TUNING`, `BOON_BASE`, `BOONS`, `BARKS`, `SETTINGS`, `MENU`, `LEVELS`, `ARTIFACTS`. Every tunable number, every line the cult shouts, the title screen rows and the level definitions. |
| `js/rng.js` | Seeded RNG (mulberry32) plus `clamp` / `lerp` / `len` / `angleDiff`. |
| `js/rooms.js` | Hand-authored room templates as character grids, legend at the top (`'w'` a stand of arms, `'O'` a drop). Also the start room, arena, Mill room, Great Hall, Gallery. Templates carrying a `tag` belong to one level's pool. `groundOf`. |
| `js/gen.js` | Level generation: chains rooms, carves corridors, places props, spawns, heals, validates reachability. Defines the tile enum `T`. |
| `js/rules.js` | `GEN_RULES`, the generator's promises with a `check(level)` each; `checkRules`, `roomsOf`, `levelFacts`. Read by the dev drawer's RULES page and by `tools/balance.js`. |
| `js/juice.js` | `JUICE`, the game-feel catalogue: every effect with trigger, look, size (read off `TUNING`), code pointer, source and a Godot 4 recipe. Read by the JUICE tab and `tools/juice-md.js`. |
| `js/audio.js` | WebAudio. Buses, the drum machine, the music bed (`MUSIC`) and every one-shot effect. |
| `js/world.js` | Tile grid, collision, line of sight, flow field, fire (ordinary and witchfire), noise events, the persistent decal canvas, cult pictograms, the ritual start room, the cave fields. |
| `js/input.js` | `TouchUI` (on-screen controls) and `autoAim`. |
| `js/entities.js` | `Goat`, `Prop` (every world object), `Bullet`. |
| `js/enemies.js` | `Enemy` — one class, behaviour branches on `kind`. |
| `js/status.js` | `Status`: poison, the three reactions between poison / stun / fire, puddles, the spit glob, thrown things that drip or are charged. |
| `js/shop.js` | `Shop`: the mouse in the wall, her offers, provoking her, the rat ogre, and the two Q-verb artifacts (boomerang flight, blink). |
| `js/talismans.js` | `Talisman`: the seventeen talismans from `ARTIFACTS_TZ.md` — every hook, their drawing, icons and the TALISMANS tab. |
| `js/beasts.js` | `Beast`: the escorts (tortoise, goose, crow; the hen is one of the choices) — one a floor, banked at the stairs for a run-long reward. |
| `js/altar-art.js` | `AltarArt`, base class of `PaintedArt`: hashing and small cached pixel canvases for level one's ornament. Never creates a Prop or consumes the simulation RNG. |
| `js/painted-assets.js` | `PAINTED_ASSETS`: a frozen, slimmed pack of only the painted props with no pixel sprite yet — altar, banner, gong, lanternFire, propsAtlas (weapons, grating, big grass, soul wisp, mill), cage posts, door slabs. Sources were deleted and live in git history. Never edit by hand. |
| `js/painted-art.js` | `PaintedArt`: the frame round every unit (shadows, leans, collar, wounds) via `character` → `PIXEL_ART.draw`; `drawTiles` / `swatch` / `wallTile` for room floors and walls; the remaining painted props (`ATLAS_CELL`, `PROP_FOOT`). |
| `js/pixel-assets.js` | Generated by `tools/pack-pixel.ps1` from `output/pixel-mid-2026-09-23`: the Pixel 2.5 unit atlas (goat, the cast, hen, rat ogre, mouse, goose, raven, turtle, `sheep-pet`) as a data URI. Never edit by hand. |
| `js/pixel-env-assets.js` | Generated by `tools/pack-pixel-env.ps1` from `output/pixel-environment-2026-09-23`: floor and wall swatches, room and cave props, floor litter. Never edit by hand. |
| `js/pixel-art.js` | `PIXEL_ART` (draws units off the atlas; sizes `PIXEL_EXTENT`, slot map `PIXEL_UNIT`, throat points `PIXEL_NECK`, `hornsOf` / `horns`) and `PIXEL_ENV` (furniture, cave props, litter; `PIXEL_ENV_ID`, `PIXEL_FLOORS`, `PIXEL_ROOMS`, `PIXEL_LITTER`). `ready` only means the atlas image has loaded. |
| `js/render.js` | Everything drawn. Roughly half the codebase. |
| `js/dark.js` | `Dark`: THE DARK's picture — light cast from every flame through the tiles, the goat's hearing as silhouettes, windups and eyes over the dark. Render only. |
| `js/combat-fx.js` | `CombatFX`: cosmetic fragments and bursts (deaths, body pieces), and every flame, blast, smoke puff and blood spray as pixel frames it bakes itself (`flameFrames`, `burstFrames`, `pixelRing`, `cellDisc`); never enters collision, damage, noise or AI. |
| `js/goat-grid.js` | `GoatGrid`: the GOAT GRID tab of the dev tool (`#goats`). The build's own goat (`PaintedArt.drawGoat` with a stub `game`) on a grid whose axes are picked from horns, voice, talisman, third eye, facing, wounds, floor (a canon's own swatches) and decor (a prop off the environment atlas); zoom, framing, pixel shadow, SAVE as PNG or JPG. Touches no run state. |
| `js/painting.js` | `Painting`: the picture of a cleared floor — floor plan, the decal canvas's paint, the line he ran, a skull per kill — baked once at the stairs (`Painting.bake`, `TUNING.painting`), shown as the clear screen's last card, saved as a PNG (through the viewer's `downloads` capability when framed as an artifact, a plain link locally). Render and export only. |
| `js/game.js` | State machine, fixed-step loop, input plumbing, entity-vs-entity collision, boons, dev drawer. |
| `index.html` | Local build. |
| `artifact.html` | Published build. Same scripts, artifact-shaped head. **Keep the two script lists in sync.** |
| `tools/serve.js` | Dev server. Also accepts `POST /shot?name=x` with a data URL and writes a PNG to `tools/shots/`. |
| `tools/harness.js` | Console test harness. See *Testing*. |
| `tools/escorts.js` | In-page bot: breaks a coop, runs the goat to the stairs, counts which animals arrive. |
| `tools/balance.js` | Prints the difficulty curve and canon/mix split of every level, runs every rule over many seeds, fails on a broken one. |
| `tools/juice-md.js` | Writes `JUICE.md` from `js/juice.js`. |
| `tools/tuning-patch.js` | Writes tool-tab edits back into `tuning.js` (steps into arrays by index). |
| `tools/check-sync.js` | Checks the working tree, `origin/main` and the published artifact are one build. See *Publishing*. |
| `BACKLOG.md` | Playtest notes, dated and tagged bug / feel / number / system. Requests, not decisions. |
| `ART_HANDOFF.md` | What art is wired in vs. placeholder, and how to make the next thing. |

---

## Architecture notes

### Space, loop and drawing

**Coordinates.** Simulation is flat top-down; rendering squashes Y by `TILT` (0.86) and sprites
counter-squash with `ctx.scale(1, 1 / TILT)`. World-space text/marks that must not squash need the same,
with `y` × `TILT`. `readMoveInput` divides mouse Y by `zoom * TILT`; any new screen-to-world conversion
must too.

**The loop.** Fixed 1/60 step, max 5 substeps, in `game.frame`; `timeScale` is slow motion. The
`setInterval` fallback drives it when `requestAnimationFrame` stalls (hidden pane). Do not remove it.

**The decal canvas.** `world.decal`, persistent at `DECAL_SCALE` (0.34), never cleared in a level: blood,
bodies, scorch, pictograms (snapped to decal pixels in `pixelGlyph`), the start-room scene. Raising the
scale costs memory fast (world is 420x78 tiles).

**The art is Pixel 2.5.** Every unit — goat, enemies, hen, rat ogre, the prologue ewe (`sheep-pet`), men
falling down holes — is `PaintedArt.character` → `PIXEL_ART.draw` off `js/pixel-assets.js`. No ART
switch, no painted character sheets; `PIXEL_ART.ready` / `PIXEL_ENV.ready` only mean the atlas loaded.
`PIXEL_UNIT`'s `sheep` slot is the goat.

**Floors and walls.** On square-walled levels `PaintedArt.drawTiles` draws pixel swatches from
`js/pixel-env-assets.js`. `PIXEL_ROOMS` maps `canon.id` → floor swatch ids (picked per tile off a hash),
a boards swatch, and a shared wall `{ top, face }`. Each swatch is multiplied by the level's
`floor`/`floorAlt`/`wallTop`/`wall` (brightened by `PIXEL_ROOMS.lift`) and baked once into a cached
canvas (`PaintedArt.swatch`) — per-frame multiply doubled floor cost. `wallTile(def, mask)` (N=1, E=2,
S=4, W=8): only a south-exposed wall (far wall, pillar front) shows a brick face (shorter on a
pillar/stub); other exposed sides are a dark rim on the cap.

**Shadows are under the feet.** `Renderer.shadow` centres just above the foot point; a prop's feet are
`PROP_FOOT` px under its tile centre.

**Who stands in front.** Standing men and the goat are drawn in order of their feet (`y`; the goat
mid-LEAPFROG last). Their floor marks go down first for everyone (`drawEnemyGround`: windup strips,
the rifle's line, a soul's haze; `renderer.groundDone` stops `drawEnemy` repeating them), and what
hangs over a head (`drawOverhead`) is collected in `renderer.overheads` and drawn after every body,
nearest the camera first, a bark plate stepping up clear of one already placed.
Props keep their fixed order (`inFront` is the exception list).

**The goat's extras.** `PIXEL_ART.hornsOf(frame)` / `PIXEL_ART.horns` redraw the horns for LONG HORNS
(an active since 1.56: `mods.antlers`, stag antlers built per horn by `antlerOf` on the art's grid),
BOMB CHARGE, SPLASH (`TUNING.goat.hornLooks`; `hornMods` shares the lean). `PIXEL_ART.face` puts the
scream souls and THE ORACLE on his face — THE FULL THROAT's bell, VENOM SPIT's froth, a third eye —
as hand-drawn pixel sprites (`PIXEL_FACE_ART`) at per-facing points (`PIXEL_FACE`); what leaves him
(the venom drip, DRAGON BREATH's steam and flame) is `PaintedArt.goatFx`, cosmetic, in world space.
**Everything added to him is pixels on the sprite's grid** (`TUNING.goat.face.cell`), never a smooth
shape. Standing still he breathes (`TUNING.goat.breathe`, a stretch from the hooves in `drawGoat`),
and after `idle.after` s fidgets (`goat.fidget`, ticked in `Goat.update`, drawn only: glance, pronk,
shake, paw; a glance lends `g.facing` to the draw and hands it back). Running, `goat.feel`: `g.lean`
and a step bob are drawn; `turnGrip` on a reversal is the only part the simulation feels. The worn talisman hangs from
one collar for every talisman, a half-ellipse round the throat (`TUNING.goat.collar`, per-facing
`PIXEL_NECK`; back facings show only the nape). Lost hearts are blots (`PaintedArt.wounds`,
`TUNING.goat.wounds`) under the collar, masked to the frame; `wounds.front` is how much blot size is left
facing the camera. `Renderer.artifactIcon` is the one artifact drawing (HUD chip, stool, collar).

**What the step is allowed to ask** (23 Sep 2026 perf pass, ~18 → ~3.5 ms on a late floor):
- `game.liveEnemies` is who ran this step. **"Anybody near here?" reads it, not `game.enemies`**
  (collision pairs, grate, spires, wheel, door pressure).
- `collideEntities` builds its body list **once**, box-rejects first, compares squared distances.
- **A thrown exception inside `draw` costs the rest of the frame.** `drawRunes` once measured against
  raw `castWind` while the timer was `castWind * mods.enemySlow`; the negative radius threw
  `IndexSizeError`. Clamp radii; measure a timer against the duration it was given.

**The camera.** `game.camLead` lerps toward `aim * camera.lead` (`leadLerp`, `leadStill`); `game.camFollow`
moves only past `camera.deadzone`, and is pinned to the centre of a room that fits the view
(`fitMargin`). Reset both wherever `cam.x/y` is hard-set (`startLevel`, `updateFall`).

**Shake only on a lost heart.** `game.shake(a, hurt)`: without `hurt` it is × `TUNING.juice.shakeOther`
(**0**). Only `Goat.damage`, `game.stunGoat` and the intro club pass `true`; `game.kick` uses `kickOther`
(0.35). New effects leave `hurt` off.

**Juice.** Master dials `TUNING.juice.screen` (shake, kick, zoomPunch, flash) and `juice.stop` (hitstop)
— turn these first. Also `gore`, `impact`, `dust` → `game.puffs` (never off an ordinary run),
`squashGoat` (`goat.sqLeft`), `game.flares`, `enemy.flash`, `drawHeartbeat`, `effects.bloodScale`,
`goat.bleed` (last heart only), `game.killMarks` on the death pull-back. The **JUICE tab**
(`drawJuiceTab`, `#juice`) is `JUICE`; add an effect, add its row; `node tools/juice-md.js` writes
`JUICE.md`.

**Effects are pixels too.** Fire, blasts, dust and blood sprays are frames `CombatFX` bakes itself
(`flameFrames`, `burstFrames`, lazily per frame, pre-warmed by `CombatFX.warm`) at `effects.pixel`
world px a texel and draws with smoothing off; rings are `CombatFX.pixelRing`, drops `cellDisc`.
A whole dead man (`CombatFX.death`) lands, skids, turns to an exact quarter turn
(`effects.corpse.lie` 0 keeps his pixels square) and bleeds a pool (`CombatFX.pool`, live in
`drawGround` until `stampPool` puts it in the stains). A flame's `size` picks a baked set, so **never animate a flame's size per frame** — it flicks between
shapes; the loop is the motion. A new effect is cells on that grid, never a smooth arc or gradient
(light is the one exception: `drawLight`, a blast's flash).

**Small things.** The smear: `TUNING.goat.trail`, mixed by `mods.speed * goat.runUp` against
`trail.fastAt` (only visible sign of SURE HOOVES). The pointer: `game.updateCursor`, horns
(`CURSOR_GOAT`) or `grabbing`; `crosshair` fallback in both HTML files. Touch: `touch.active`; only a
`keydown` matching `KEYBOARD_KEY` turns it off, and on a `coarse` device every pointer is a finger.

### Level generation

**Difficulty.** `THREAT`, `ENCOUNTER` and each level's `encounters` are the model; `planEncounters()`
plans every room before placement. *Met alone*: a kind's first appearance in a run is a room with only
it (a new boss has no escorts; `levelDef.met`, `game.taught`, `metRoom` for rifle posts). *Threat, not
bodies*: budget off the curve (`from` → `to`, `ease`), capped per kind and room. New kind: `THREAT`,
`ENCOUNTER.weight`, a `cap`, an `introduce` entry. Then `node tools/balance.js`.

**The cheapest man is not the filler.** `ENCOUNTER.cheap` caps the clubman and *tightens* as budget
grows (`max` → `min`, never zero); rooms with their own head count (Great Hall) are exempt.
`GEN_RULES.crowd`.

**The floor axis.** `groundOf(tpl)` = fraction of floor with nothing `HARD` within a step (wall, pillar,
brazier, lamp, table, drop — not hay, crate, rack, grate), carried as `tpl.ground`. `draw` in
`tryGenerate` sorts pools by ground and walks the level along it, random among the `GROUND.window`
nearest fits. Only `room.drawn` rooms count (`GEN_RULES.ground`). `pressure` =
`threat * (1 + ground * GROUND.weight)`. `draw` is also the width budget for the 420-tile world.

**Canons.** `levelDef.canon` `{ id, name, idea }`, in run order: STONE (THE ALTAR), FIRE (THE YARD), THE
HOLLOW (THE CAVE), THE LINE (THE ROAD), OPEN GROUND (THE THRESHING FLOOR), THE FUNNEL (THE BRIDGE), THE
DROP (THE RAFTERS), THE NICHE (THE OSSUARY). `pickCanonRooms` gives ≥ `CANON.share` of `ordinaryRooms` to
templates tagged `canon: '<id>'`, starting with the first; the rest is the mix (untagged + `levelDef.known`,
earlier canons). `room.role`: `pen`, `calm`, `canon`, `mix`, `trap`, `arena`, `mill`, `hall`, `gallery`,
`killbox`, `rest`, `lesson`. A canon needs `CANON.minRooms` (four) templates. THE THRESHING FLOOR's
`corridorW: 5` eats room borders, so it needs furniture.

**The cave is third.** It has no killbox, `lonePosts`, grating (`spikes: 0`) or trap room. Ladder:
23.6 / 42.8 / 65.7 / 98.2 / 100.6 / 144.1 / 155.6 / 164; `GEN_RULES.harder` and `balance.js` hold each
level above the last. Later floors draw cave rooms via `known`, so `GEN_RULES.grass` allows grass on the
cave and later floors that drew one — grass *before* the cave fails.

**Exits are at the far end.** `pickDoorY` / `pickDoorX` take `enterRow` / `enterCol`; `farthest` drops
candidates under `DOORS.far` (0.7) of the best distance *before* rolling. Wide-corridor clamping (`fit`)
applies to the **candidates**, or THE THRESHING FLOOR undoes it. `noteFar` → `room.exitFar` →
`GEN_RULES.farexit`.

**Stacked rooms.** Still one chain. `levelDef.stack` (level two on): `stackSpot` + `carveShaft`. A
stacked room never reaches left of its parent nor stops short of its right wall. `stackable` refuses set
pieces, `noFlipX`, teaching rooms, gate/seal rooms. `STACK.run` = one in a row. Corridors wider than two
tiles get no door. "Behind him" means an earlier room index, not "to the left". `GEN_RULES.stack`.

**Spawns.** `take` in `tryGenerate` keeps the best of a few dozen rolls (clear of men, props,
`room.enter`; `GEN_RULES.spacing`). Afterwards anyone `inFurniture` is walked to clear floor
(`GEN_RULES.furniture`); the sentry is exempt.

**Milk.** Count is `max(levelDef.heals, ceil((rooms - 1) / TUNING.prop.heal.every))`, one per band of
rooms (worst gap five). The tile is scored clear of furniture and flame (`GEN_RULES.milk`). Grazed, not
touched: `Prop.graze`, `heal.grazeSpeed`, `heal.grazeTime`. `kind === 'heal'` with `p.big` false is
+1 HEART; `big: true` (set only by `carveSecret`, `TUNING.secret.healChance`) is +2 HEARTS.

**Trap rooms.** `tag: 'trap'` pool; `levelDef.traps` count, `pickTrapRooms` (never pen, set piece,
ambush, first two ordinary rooms), `isTrap`; never introduces a kind; no spike scatter. `needs: 'spikes'`
templates only on `levelDef.spikes` levels. `'S'` plate, `'B'` coals.

**The level tool.** `LEVEL TOOL` in the dev drawer; `dev.rules` pauses the sim, `hitDev` swallows input.
RULES (`drawRuleTab`, `game.ruleMatrix`), LEVEL (`drawLevelTab`, `roomPlan` off the generated level),
BALANCE (`drawBalance`, `game.balanceReport` over `dev.balanceSeeds`; the averaged rules live here and in
the report only). A room tile or bar opens `drawRoomSheet` (`dev.room`). `#rules` / `#balance` open it
directly. Samples come from `dev.sampleSeed` (`game.rulesPage`, REROLL). Other tabs: ENEMIES, STATUS
(`drawStatusTab`), TALISMANS, FIXTURES, JUICE, MUSIC, GOAT GRID (`js/goat-grid.js`).

### Teaching rooms (level one)

**The sentry.** `enemy.sentry` (`levelDef.sentryIntro`): `blockSpot` stones up all of `room.exitBand` but
one tile, deletes its door, stands him a step inside. `collideEntities` never shoves him; `chaseGoat`
only turns him; `idleWander` / `investigate` leave him put. `lessonIndex` keeps scatter out. His room is
`LESSON_TEMPLATE`, **four tiles deep** so every throw ends on stone, two crates in the near half,
`noFlipX`; `sentryRoomAt` = `ordinaryRooms(levelDef, n)[0]`, so the curve is unchanged.

**The ambush room.** `AMBUSH_TEMPLATE` via `levelDef.ambushAt` (room 4; in `fixedW`): 3 x 14, `noFlipX`,
both stands **always swords** (`room.isAmbush`), nothing scattered, never trap or canon, milk placed
furthest from `room.enter`, two fixed clubmen, never introduces a kind. Block 1 of the floor text.

**The wheel lesson.** `levelDef.millLesson`: `MILL_LESSON_TEMPLATE`, seven tall, hub one row off the top
so only the bottom lane is clear; **two men** on the far `e` markers with `trapSense` pinned to 0 and 1
and `noticeFor` (`TUNING.ai.millNotice`). `noFlipX`.

**Words on the floor.** `CONTROL_LINES` (`render.js`), placed by `level.controls`, never in an empty room:
0 `WASD - MOVE` in the pen above `cagePrompt`; 1 grab/throw in the ambush; 2 the headbutt, one line,
on the sentry's floor (`lessonRoom`); 3 `E - ROLL` only, in the first eligible room walking back from the
first arena (not lesson, vault, trap or ambush), with a fallback. Keyboard and touch wordings for each.
`GEN_RULES.lessons`. A level `hint` spans its first room (`drawHints`, `wrapFloor`, `fitFloorText`);
`hintKey` adds the button from `HINT_KEYS`.

**The pen.** `cage` props from `buildCage`. `prop.cage.hits` (7) first time a browser does it, then
`againHits` (2); `game.penBroken` / `PEN_KEY` / `game.notePenBroken`. Blows counted by
`game.cageLunge === goat.lungeId`; `prop.cage.strain` lines, `stunAt` blows call `game.stunGoat`; the last
sets `game.cageOpen`. Straw inside is tiles (`hh` in `START_TEMPLATE`) because `cleanProps` clears props
near the start. `startCage` levels only. The dead cage: `buildCage(..., deco)`, `TUNING.prop.deadCage`,
contents by `paintStartRoom`. The ritual altar is a real `table` Prop with `isAltar`.

### Rooms that lock

**Soul gates.** `levelDef.gates`: two rest rooms (`REST_TEMPLATE`, role `rest`, off the curve, out of
`ordinaryRooms`), never the last room, a set piece, the vault's room or a teaching room. Soul on the floor
via `placeSoul`. `gateSpot` narrows the exit and hangs a `gate: true` door with no hit points (`smash`
returns, no shouldering). Only `game.openSoulGate(room)` opens it: the soul pickup (`soul.gate`, its own
gate only) or `Shop.buy` / `Shop.takeMilk`. `narrowExit` walls only the straight run, never the
corridor's turn (walling the turn failed seeds). `GEN_RULES.soulgate`.

**The sealed arena.** `{ at, boss, sealed: true }` on `arenas`; `seal: true` doors both ends
(`sealedArenas`). `game.updateSeals` alone: open → slam a tile inside (`game.inRoom`) → break when the
men in it are down. Load-bearing:
- **The doors must start open** — a seal refuses `smash` and `openPressure`; shut on frame one the level
  cannot be finished.
- **It waits on `s.held`**, who was in the room when it shut, not the spawn list.
- **Nobody it waits on may leave.** `game.sealHolding(e)`; `blink` refuses spots outside the room, and a
  held man more than a tile outside stops counting.

**The clamp.** `game.updateClamps`: rooms two+ behind `game.goatRoom` with nobody alive are sealed —
`room.exitMouth` back to `T.WALL`, contents gone, room dark (`room.clampAt`, `drawUnseen`, `game.hidden`,
`drawVeil`, `TUNING.clamp`). A body in the mouth only delays it. `GEN_RULES.clamp` floods round each
stoned mouth; `carveSecret`, `carveVault` and wide `carveCorridor` guard the leaks it found.

**Doors that open for you.** `fromRoom` doors break when that room's men are dead
(`game.updateClearDoors`; not gates, seals, vault). Butting a soul gate lays a violet trail to what opens
it (`game.guideTo`, `drawGuide`, `TUNING.soul.guide`). The **clock door** (`prop.door.clockFor`,
`levelDef.clockDoors`, level three on) stands open (`open` 1), shuts on `clockEase` at 9 s =
`score.perRoom`, never on a body, lights itself while counting, and `gen.js` removes it from rooms with
fewer than two men or that introduce a kind or follow one. `game.clockTold`, `GEN_RULES.clock`.

**Door kinds.** `prop.door.hits` 1 (plank), `ironHits` 3 (`prop.iron`, `levelDef.ironDoors`, none on
level one, refuses `openPressure`), `stairHits` 3 (`stair: true`, every level's exit), `vaultHits` 4;
`prop.gate` none. Collision and `Goat.headbuttHits` treat a door as a rectangle (`prop.door.r`,
`prop.door.thick`), not a circle; it reaches `prop.door.reachSlack` further, from a wider cone.

**The vault.** `levelDef.vaultAt`; `carveVault` cuts 5x5 above/below, opens **two** tiles (rock and
wall border), hangs `prop.vault` (halo, wisp, `SOUL`; the gate says `A SOUL OPENS IT`). The soul is laid
with **`placeSoul`, not `dropSoul`** — `dropSoul`'s rescue asks a flow field capped at ninety tiles and
pulled a far vault's soul to the goat's feet.

**A wall that gives.** `carveSecret`: a two-tile niche behind an ordinary room's top/bottom wall, once or
twice (`TUNING.secret.chance2`), rack plus maybe big grass, solid rock only; `levelDef.secretsAfterBoss`
on level one. Prop `kind === 'secret'`, `Prop.crackWall`, `TUNING.prop.secret.hits` (2), room
`wallColor`. **Until broken the niche is `T.WALL`** in `World.tiles` (a copy of `level.tiles`) and hidden
(`game.niches`); broken, `nicheTiles` stay lit. `Renderer.wallCrack` is the one crack. `GEN_RULES.secrets`.

### Perception and AI

**Enemies.** One `Enemy`; `kind` `bearer`, `hunter`, `dog`, `seer`, `butcher`, `wraith`, `ratogre`,
dispatched to `updateBearer` … `updateOgre`. Shared machinery above the dispatch. Bosses: `elite`, `boss`.

**Nothing simulates two rooms away.** The enemy loop skips anyone whose *current* room (`roomAt`; in a
corridor `game.nearestRoomIdx`) is two+ from the goat's. Never use `e.room` for this — it stays "who he
was put with" for seals and gates. `e.woke` is set once he is within `ai.wake` of the view (or held,
flung, burning); until then he does nothing.

**Patrols.** `idleWander` leashes to `Enemy.home` (`TUNING.ai.leash`), idle only; new facings resample
against a `TUNING.ai.wanderClear` probe.

**Routes** (`TUNING.ai.path`). `chaseGoat` walks `Enemy.pathDir`: `pickWaypoint` follows a field
`ahead` tiles and heads for the furthest point `bodyClear` passes (middle + shoulders vs stone/holes,
whole width vs blocking props; shut doors excluded, they are shouldered). Three fields, rebuilt together
every 0.15 s: `world.flow` (stone and holes only — **everything else that asks "reachable?" reads this
one; keep it that way**), `world.route` (also steps round `world.furn`, laid by `World.setFurniture`),
and `world.routeW` for bodies `>= path.wideR` (Butcher, rat ogre), numbered on **grid corners** with
four open tiles round them (`World.corner`, `Enemy.wideWaypoint`) — a tile-based wide field still took
him through offset one-tile pinches. `routeW` only fills while `world.wideWanted`. `Enemy.unstuck` is
the backstop (no progress for `stuckCheck` s → step off for `unstick` s), never while leaning on a shut
door. `investigate` routes to a noise near the goat. Measure a routing change the way 1.57 did: a man
and a goat in random spots of every room, count who never arrives (see `CHANGELOG.md`).

**Sight and noise.** `canSeeGoat` is a cone + line (`TUNING.ai.feel` at touch); `watchful` has no cone.
Running emits `noise.footstep` on `Goat.stepNoiseTimer` (`footstepGap`). **A noise lives one pass of the
men**: `game.update` drops only what predates the enemy loop and carries the rest to the next step. The
line is `game.sees` (stone + `game.sightBlockers`: shut door, gong, hub; `Prop.opaque`, kept small);
`sees` and `reaches` are both `clearLine`. Past `ai.noticeNear` a man is `noticed` for
`ai.noticeMin`–`noticeMax` (to `noticeFar`) before chasing; `noticeFor` overrides. `chaseGoat` emits
`noise.chase` at `ai.chaseNoise`.

**Nothing off-screen lands a blow.** `game.meleeHit` and `game.fireBullet` return on
`game.hidden(attacker)`. **Reach**: `game.reaches` (sight + blocking props) gates both the club and the
horns.

**Trap sense.** `hazardAt()`: flame, lit brazier, casting rune, drop lip, spike up/arming, spire, Mill arm
(`Prop.millThreat`, `ai.millLead`, `millClear`). `avoidHazard()` checks **walking and standing**. One
`trapSense` roll per encounter (`hazardSeen` freezes `hazardRoll`); a fail blinds for `ai.blindFor`.
`game.hazards`, `game.runes` keep it off the prop loop.

**Speech and daze.** `game.bark(enemy, kind, chance)` is the only way a man speaks (`bark.gap`,
`perEnemy`, `BARKS`). `enemy.daze(game, s)` freezes and cancels a windup; a timer, not a state.

**What killed you.** `Goat.damage`'s last arg is the source (a man or `'fire'`, `'witchfire'`, `'spike'`,
`'spire'`, `'bomb'`, `'mill'`, `'fall'`, `'rifle'`) → `goat.hurtBy` → `game.killedBy` / `KILLED_BY`.
New harm, pass a source.

### Enemy kinds

**Two hits.** `hp > 1` (elite, Seer, soul-bearer) absorbs a killing blow in `die()`: floored, one lost,
up again (a Seer blinks). Fire counts. `devour` and `'fall'` skip it. A bomb charge is an ordinary hit; a
headbutt gives a fresh fuse and resets `exploded`.

**Rifle.** `sfxCock` on aim (`hunter.cockHear`, not from fog). Inside `wildNear`, `wildChance` of shots
stray by `wildSpread`. `friendInLine` within `friendClear` → `stepOff`; beyond, friendly fire is intended.
`drawAimTelegraph`.

**Hound.** `kind === 'dog'`: `sfxGrowl` / `sfxBark`; TOO QUICK to grab, or with BY THE COLLAR
`Enemy.hopBack` (`dog.hop`) spends the grab. `tryDodge` (`dog.dodge`, never mid-run). orbit → `windup` →
`dart` → `recover` → `retreat`; `planDash` draws the bent run (`drawDashPaths`, `dashSkew`, `dashTurn`),
ramped from `dashStart` over `dashRamp`; walls end it; `Enemy.clearAng` whiskers. `packBusy()` = one at a
time. `daze` × `cfg.dazeMul`, cancels a dart. `game.houndSeen()`. No line to the goat, or further than
`circle * ringIn`: he runs the route, not the ring. `flipGap` damps the ring's turn-round; `ringMate`
circles him away from a packmate; a hazard under his windup cancels it; retreat runs `clearAng`.

**Seer.** Witchfire burns him (deliberate); he gets near-perfect `trapSense`, `seer.fireCare`, and
`blink` refuses burning, pit, hazard or out-of-seal spots.

**Butcher.** `chargewind` sets the run: distance + `butcher.chargeOver`, capped `chargeTime`, skidding
`chargeSkid`; the wall stun (`chargeStopped`) is earned by standing at a wall. Aimed by `leadAim`
(`chargeLead`, `leadMax`) into `e.chargeAim`, which the telegraph strip draws. No clear run: `findLane`
(`laneLook`, `laneTime`) walks him aside to one first, dropped when he stops closing on it. Charging he smashes doors,
shoves tables, topples lamps, lights on braziers.

**Brute and soul-bearers.** `Enemy.unliftable` (Butcher, champion, soul-bearer) — TOO BIG / THE SOUL
HOLDS HIM. `Enemy.atk(key)` reads `TUNING.champion` first; `knockMul()` = `cfg.flingMul` ×
`champion.flingMul` × `soulBearer.flingMul`; `Enemy.splatLimit` scales `splatSpeed` by it (or a
soul-brute is unkillable). `champion.slam.chance`: `slamwind`, `drawSlamRing`, `Enemy.slam`.
`game.ensoul(e)` is the only way to set `e.soul` (`soulBearer.hp`); he is lit (amber haze, ring, red
eyes) — a label only.

**Fire and blunder.** Alight, a man blunders (`burnDir`, `moveToward` without `game`).
`immune.blunder` (Butcher, hound) keeps his AI: `ignite` must not set `state = 'burning'` for such a kind
(no branch → frozen). `immune.fire` refuses ordinary flame (wraith, rat ogre); witchfire is exempt.
`ignite` takes a burning thing out of the mouth. `rage` blocks (`butcher.rage`, `champion.rage`) run
`dt * rage.tempo` and `rage.speed` alight (`Enemy.immunity`, `blunderProof`).

**Wraith.** `Enemy.ghosted` (`kind === 'wraith' && !solid`) must be asked by everything that reaches for
an enemy; mist skips `collideCircle`. It drifts `wraith.standoff` behind at `look + approach` (rolled
once, never the front) and `manifest`s only off-facing, in reach, off cooldown, **not in a wall**;
`manifest → windup → swing → solid` is uninterruptible, `unmanifest` → mist (`fadeCd`). No blood; a
boss with hearts returns to mist. `TUNING.wraith.immune` `{ fire, stun, grab }`; `balk` always false.
**Hidden**: `Enemy.hide` as a box or milk (`e.disguise`, never in `game.props`); first of a run in an empty
room (`game.stageFirstHide`, `hideTaught`); `Enemy.spring` on `buttTries` / `grabTries` within
`springR` or `touchR`. `game.mistTold`.

**Rat ogre.** Only `Shop.spawnOgre`; no `THREAT`, no soul. `fling` refuses him; `immune.fire`,
`immune.witch`; `daze` / `balk` = `breakSwing`. Hurt by a headbutt only while `floored` / `stunned` (crate,
thrown shield; else `Shop.ogreShrug`); the `hp > 1` branch takes a heart standing (`stagger`), never
floored. Blade, bullet, body (`flungHits`), wheel, bombs each cost a heart. `updateOgre` targets the
nearest visible goat or cultist, ignores noise; `trapSense` 1. Leaps: `hopwind` → `hop` (`hopSpot`,
`hopZ`) → `hopLand` (`hop.radius`, `drawHopMark`). `game.ogreHits`, `doomed`, `flungBy`.

**Killbox.** `levelDef.killboxAt`, `KILLBOX_TEMPLATE` (`noFlipX`), cell from `ENCOUNTER.killbox`; the first
`cell.alert` are `watchful` (`cfg.sight + cfg.watchSight`, no cone, hold post). Only once rifles are met.

### The goat's verbs

**Two buttons start half-shut** — the progression; do not undo it. No `mods.grabMen` (BY THE COLLAR):
`tryGrab` ignores men (`game.reachedForAMan`). No `mods.screamStun` / `breath`: the scream is a `lure`
to `scream.call` and inside `scream.balk` breaks a committed blow (`Enemy.balk`, `balkStun`) except a
Butcher mid-swing or a manifesting wraith. The bare headbutt is blunt until LONG HORNS / IRON SKULL.
`openBoonChoice` deals actives at 0.75 while either is half-shut.

**Boons.** `applyBoons()` rebuilds `game.mods` from `game.boons`, **actives first, then passives**
(an active that sets a cooldown outright used to wipe a passive's halving taken before it); use sites
read `game.mods`, never mutate `TUNING`. New boon: `BOONS`, `BOON_BASE`, the use site, a plain-sentence
`desc` and a `stat(p, b)` that builds the numbers off `p` / TUNING (`sayN`, `sayPct`, `sayPoison`) —
never type a number into `desc`; `skill` hangs it on a button; `needs` gates the
deal. `BOON_SLOTS` (one active + two passives per button, four body); `game.boonOpen` is the one deal
test; `key` boons count against nothing. `drawBodySouls`.

**The skill rail.** `drawSkills` is the only report of the verbs; `skillIcon` must change when a boon
lands. Chips show the key; `drawSkillNote` (`renderer.skillHover`) the name, a mod-aware `note` and a
`stat` line of the verb's numbers as `game.mods` has them now (`wrapFacts` breaks it between facts).
The card (`drawBoonChoice`) grows to fit the wordiest of the three. HUD
size: `renderer.hs` = `ts` × `TUNING.hud.scale`.

**Timing.** Headbutt has no cooldown (recovery is the cost); `goat.grabCd` on every release of a man;
roll its own. A lunge that hits stone calls `headbuttHits` before ending, or flush doors could not be hit.
`goat.state === 'stunned'` is real (`game.stunGoat` only). A headbutt pressed while busy, or a roll
pressed before it can go, is kept `goat.buffer` s (`buttBuf`, `rollBuf`) and spent the frame he is
free — the recovery is still eaten whole; a headbutt pressed while idle is never kept.

**Roll.** Born in full (`BOON_BASE.roll`); DEAD WEIGHT = `mods.rollStun`. `Goat.rollDirection` scores 24
angles. Distance is `roll.speed` × `roll.duration`; tune speed, not mercy frames. LEAPFROG
(`mods.leapfrog`): `Goat.leapTarget` / `leapLands` turn a roll at a man into a vault (`goat.leap`,
still state `roll`, the roll's own i-frames only); while `goat.leap` is set `collideEntities` skips
the goat and no hole takes him, so **anything that ends the roll must end the leap** (the guard at
the top of `Goat.update`). `goat.rollCdMax` is what the last roll cost, for the rail.

**COLD EYE and FOUR STOMACHS.** `game.coldEye()` at both pick-ups (`tryGrab`, `takeArm`) sets
`game.aimSlow` (real seconds), which `frame` turns into `timeScale` and drops the moment nothing
is in his mouth. `mods.grassGain` is added to a grass heal in the graze loop, never to the pail.

**Run-up.** `goat.runT` / `goat.runUp`: 1 → `1 + momentum.max` over `momentum.time`, drains at
`momentum.lose`, a hit takes it all. `momentum.max` is the fifth taken off `goat.speed`; keep them in step.

**Holding a man.** `goat.holdLimit` from `mods.holdTime` + `grab.holdVary`. The held branch tops
`Enemy.update`: a Hunter fires `enemy.heldShots` (never refilled); a Seer's rune stays where he started
(`castRune`; `fling` clears it). He burns, touches braziers, is hit by the Mill and `Prop.bite`, which
remove him from `goat.holding`.

**Arms.** `Goat.takeArm`, only via `tryGrab` (no walk-over pickup; `goat.autoHeld` false). Either button
throws an `item` (`Goat.throwHeld`; press also read off `pointermove`, `game.mouseButtons`). Slowdown
`grab.itemSpeedMul` / `grab.speedMul`. A `weapon` prop is rack + blade (`inStand`, `sword` / `shield`,
`updateWeapon`, `hitMan`, NOTCHED on a wall, `Goat.cutWith` / `cutGap`, `passed`); `'w'`,
`levelDef.racks`, `racksFrom`. Consumable: `prop.uses` (`weapon.uses`), `weapon.swordShare`,
`Prop.snap()` the only destroyer (clears `goat.holding`).

**Cover.** `Goat.covers(x, y)` (`weapon.coverR`, `coverArc`). `Goat.shielded`: bullets and clubs spend a
use, a club staggers (`weapon.parry`), `shieldHits`. `Goat.crated`: a club shatters the carried crate
and nothing else happens; bullets pass.

**Bodies and furniture.** `game.flungHits`: a man thrown from the mouth kills and carries on; off the
horns he kills at `physics.bodyKillSpeed`, dies too at `physics.splatSpeed`, else both floored.
`Prop.hitProp` is where a moving prop meets furniture (lamp topples, gong rings, else solid;
`table.killSpeed`); a flung man above `lamp.knock` topples a lamp; resting over `T.PIT` → `Prop.fall`.
`Prop.spill` knocks coals (`prop.brazier.spillTime`, `spillCd`); `game.touchingBrazier` returns it.

**Statuses.** Stun `Enemy.dazed`, fire `Enemy.burning`, poison `Enemy.poison` (blind + slow via
`dt * tempo`, `moveMul`); `js/status.js`, `TUNING.status`. Reactions either order: POISON+FIRE
`Status.blast`, POISON+STUN `sting` (no hit, `e.shock`), STUN+FIRE `scaldIt`. Goat never poisoned.
`world.poison` / `world.poisonOn`. Sources: SPLASH, VENOM JAW, CHARGED (`Status.markThrow`,
`updateCarried`), SOUR TUMBLE, VENOM SPIT (`game.globs`).

**Fire.** `world.fire` seconds, `world.fireKind` 0/1 (witchfire: violet, ignores `mods.fireImmune`,
`isWitchPx`); lighters pass the kind. `game.passFire` does nothing without `mods.firePass` (KINDLING); a
man lit by a man (`litByMan`) never passes it; `passedFire`; `Enemy.fireDepth`.

**Gong and voice.** `Prop.ring` → `goat.gong` (`bell.buff`, `cooldownMul`, `speedMul`); `'b'` only in
rooms with men. `GameAudio.bleatVoice` is every sheep (`sfxScream`, `sfxBleat`); add animal sounds there.

### Props and world objects

**Props.** One `Prop`; `blocking`, `stopsBullets`, `opaque`, `item` are getters; `headbutt()` per kind.
`item` = anything lifted. No fallback draw branch: an unhandled kind does not draw.

**Crates and bombs.** Crate `r` 10, floors a man `crate.stun`, bursts on fire (`Prop.burst`,
`crate.burst`, `burstTime`). Bomb: `tryGrab` arms `fuseT` (`prop.bomb.fuse`) on pickup (`Prop.fling`
backstop), re-throw keeps the fuse, `updateBomb` waits for rest, `explode()` two hearts inside `nearR`,
one to `blastR`, goat included; placed in the highest-threat room (`prop.bomb.chance`).

**Barrels.** `kind === 'barrel'` (`TUNING.prop.barrel`): not `item`, blocking, stops bullets. A headbutt,
a flung body over `knock`, a charge or another barrel (`pass`) calls `Prop.roll`; `lying` is for good.
`updateBarrel` bowls men (`e.fling` × `fling` × `knockMul`, `daze`, `keep` a man; Butcher staggers,
ogre unmoved) and breaks above `breakSpeed` (`smashBarrel`). Oil: `oilT` is the fuse, lit by a burning
tile or man; `oilBurst` is `Prop.burst` wider; a brazier bursts it at once. Lit, it is a fire hazard to
`hazardAt` (`game.hazards` holds barrels, `unHazard` drops a broken one). Placed off its own `RNG`
stream where `rockFits`, `levelDef.barrels` a room; `GEN_RULES.barrels`. Drawn in `PaintedArt.drawProp`
in whole quarter turns off `spinD`. It never kills by itself (pillar 3): the wall behind the man does.

**Grating.** `kind === 'spike'`, `updateSpike` `idle → armed → up → down → rest`; `Prop.tripped` by the
goat (`spike.trigger`) or any living unheld non-mist man; `bite`, `this.bit`, `spikeThreat()`.
`spikePatch` lays one bending band of `spike.run` (9–15 per room), never a scatter.

**Spire.** `kind === 'spire'`, `TUNING.cave.spikes`, **not blocking**, never arms; `Prop.updateSpire` kills
a man, costs the goat `cave.spikes.damage`. At a wall, clear of entrance, furniture, grass; never in trap,
set-piece, teaching, ambush rooms or the trip. `GEN_RULES.spikes`.

**Boulders.** `kind === 'rock'`: blocking, not opaque, not item; `crackRock`; `world.block` keeps it out
of the flow field; bodies die on it at `splatSpeed`, crack it past `knockHitSpeed`. `rockFits`: plain
floor all round, none within two. `levelDef.rockClusters` (cave): `placeRockCluster`, shared `cluster`
id, `clusterKeepsRoomOpen`. `GEN_RULES.rocks`.

**Tall grass.** `level.grass` / `world.grass`. Beyond `grass.seeInto` it joins `visBlock`; `canSeeGoat`
fails past `grass.hideR` (smaller = more hiding). `Goat.cutGrass`; burns (`grass.burn`, `spread`,
`drawBurningGrass`); `drawGrass`. `grass.lurk` men wait in it (`lurk`, `lurkAlpha`). `GEN_RULES.grass`.

**The drop.** `T.PIT`: not solid; `walkable` / `walkableAt` and `hazardAt` keep men off. `Enemy.update`
kills anything over one first thing (`'fall'`, no absorb, no remains; `game.spawnFaller` →
`game.fallers`, `drawFallers`, `sfxFall`). The lip holds the goat from windup to recovery end.
`goatFalls` / `updateFall` / `'falling'`, `fall.damage`. Return point from `goat.safeTrail`
(`fall.setback`, `fall.invuln`): **every candidate is tested against the floor**, `Game.groundNear` last,
and landing is latched on `goat.landed` — otherwise he fell forever or stood in the hole. `drawPits`
after decals; `throughHoles` paints a parallax landscape below (`DEPTH.below`, `farHash`, `rimShade`) so
a hole does not read as a pillar. Windows (`levelDef.windows`, RAFTERS): `carveWindow` → `level.windows`,
the only way `drawPits` knows one.

**Stairs.** `T.EXIT` / `T.ENTRY`, `drawStairs`, `level.exitTile` / `level.entry`; `beginClimb` /
`updateClimb` for `stairs.climb` then `levelCleared`; `game.stairFx = { t, dir }`.

**Mill and roast.** `kind === 'mill'` (`TUNING.mill`; `updateMill` runs even when `broken`, see
*Testing*). `prop.roast` on one brazier at most per level (`prop.brazier.roast`, tile hash).

### The cave

**Shape.** `levelDef.cave` → `world.round` (`TUNING.cave.roundR`). `TUNING.cave.shape`: `'round'`
(`World.collideRound` and `drawCaveTiles` — **one shape, change both**) or `'mid'` (default;
`World.buildCaveField`, `collideMid`, `drawCaveMid`, shared `marchCell`; only grows rock into floor).
`erodeCave` rounds corners. An unbroken secret wall is rock showing only its crack.

**Drawing it cheaply.** `World.buildCaveBand` (`caveNear`, `cave.band` 2) limits what is marched.
`Renderer.drawCaveBaked` bakes chunks (`CAVE_BAKE`, `caveBakeSig`, `CAVE_BAKE_MAX`); **anything animated
on cave ground must skip itself while `renderer.baking`**. `Renderer.caveRockPath` caches `Path2D` per
`CAVE_CHUNK` keyed on `world.caveEpoch`; **every stone↔floor tile change must call `World.caveDirty`**
(`updateClamps`, niche walling, `crackWall`, `Shop.breakWall`). Decor: `drawCaveDecor` (upward spires,
gems on the face band, mushroom fur), `Renderer.dripstone` on top walls, sharp teeth (`northOpen`)
below; floor and litter from `PIXEL_ENV` (`PIXEL_FLOORS.cave`).

**THE TRIP.** `tripLevel(i)` replaces `LEVELS[i]` (`shroom`, `cave`; no traps, wheel, drop, killbox,
teeth, posts), fought at `LEVELS[0]`'s curve × `shroom.threatMul`, `shroom.men` per room of
`shroom.kinds`. `LEVELS.indexOf(def)` is -1 — ask `this.level.def`. Entered by grazing a `shrooms` prop
(`shroom.chance`, `from`, `eatR`, `eatTime`, `game.eatShrooms` → `game.tripAt`; `levelTripAt`,
`forgetLessons`, `saveRun`). `game.tripInput(real)` reverses the stick and swaps grab/headbutt and
roll/scream — no new keys. Lens breathing in `Renderer.worldTransform` (`shroom.cam`), never a shake.
`Goat.tripPhase`. `GEN_RULES.shrooms`, `GEN_RULES.trip`.

**THE DARK.** `darkLevel(i)` is `LEVELS[i]` with the lamps out (`dark: true`, `darkOf: i`), played in
place of it: every run plays `dark.runAt` (THE CAVE, the one floor near the fourth with no rifle to
introduce) dark, via `game.darkAt` (set by `forgetLessons` / `resumeRun`); LEVELS can play any floor
dark (the row-0 toggle walks off → TRIP → DARK, `menu.darkPick`), and so can `#dark`. Unlike the trip it stays that floor to whatever asks which floor it is:
**ask `levelIndexOf(def)`, not `LEVELS.indexOf`** (mouse, milk rhythm, shrooms). `dark.soften` cuts
the curve and the room head count (late floors sit on the cap, so the curve alone moved nothing),
halves trap rooms and grating, drops the killbox and every rifle (kinds, intro, posts). **The cult
is in the dark too**: `game.goatLit` (`game.litAt`, once a step) — out of the light `canSeeGoat` stops
at `dark.ai.sight` (a hound a little further), a hunt (never a blow under way) goes cold in `ai.lose`
s and noise moves `lastSeen` — only the goat's: the cult's own shouts, swings and casts are emitted
as kind `'cult'` and skipped — and the seer paints his rune at what he hears (`Enemy.hearForRune` → `earRune`, `byEar`),
never at a noise one of his own is standing in. `balance.js` holds the run's dark floor to the ladder. `gen.js` hangs `dark.lamps` in rooms with no flame
and leaves `lamps.unlit` of them black (`room.unlit`, never an arena or rest room); a lamp is still a
lamp — a headbutt tips it and the room goes black once the oil burns out. `GEN_RULES.dark`;
`balance.js` runs every level dark. The picture is `js/dark.js` (`Dark`), render only: a light map
shadowcast from every flame (`dark.lights`), the goat's hearing (`dark.near`) as a dim floor plus
silhouettes (everything standing redrawn off-screen with `renderer.silPass` on — no shadows, halos,
windups or overhead marks — cut to the mask, flattened to `body` with a `rim`), windups and
`Renderer.drawOverhead` laid back over the dark (`Dark.readable`), and `dark.eyes` for the seer, hound
and wraith. `dev.dark` (DEV MODE) paints it over any floor.

### Souls, shop, talismans, escorts

**Souls are a budget.** `levelDef.souls` = two; the mouse replaces one (`soulsHere`). Spent in order:
gates, vault, then the **last** bosses; an empty vault holds big grass. `game.bossPrize`: soul, else milk.
Seeded surprises: `soul.bossChance`, `soul.roomChance` (`game.bonusRoom`). A soul is a violet wisp
(`Renderer.soulWisp`, `game.souls`). Cards: `takeBoon` by Digit1/2/3 or down-and-up on one card
(`boonDown`, `boonAt`, `boonRects`), `boonArm` delay; never on hover or press alone.

**The shop.** `TUNING.shop.levels` (YARD, ROAD, BRIDGE), in `gates[0]` (`shopRoomOf`). `carveHole` cuts
nothing (`gap` is a mark; no spot → reseed). Three `ware`s `shop.spread` apart: two talismans
(`stockFor`, `shop.tierAt`, no two of one `tag`) and the pail (`MILK_OFFER`, `milkSpots`,
`TUNING.shop.heals`, drunk a heart at a time via `prop.pail`). **She takes nothing; one choice**:
`Shop.buy` / `Shop.takeMilk` pack the rest and `game.openSoulGate`. Full slot → old one back on the stool
(`ware.chosen`). **Grab is take** (wares first, `rmbEdgeNow`). **Headbutt is rude**: `Shop.provoke`, at
`shop.strikes` the rat ogre, wares `locked` until `Shop.ogreDown`. Death returns the level's take
(`levelArtifact`). `drawBurrow`, `drawMouse`; `Shop.breakWall` opens three wall tiles when she turns.

**Read the ware.** `Renderer.drawWare` within `prop.ware.readR`: name, tier, `desc`, and one sentence
(`ARTIFACT_HOW`, `MILK_OFFER.how`, `wareNote`). **A tier's `desc` is a getter onto its talisman's
`say(p)`**, which states that tier whole, in numbers, off its own params — never as a diff on tier I,
because the n-th mouse sells tier n and nothing else. Shown there, on the chip hover (under the
`ARTIFACT_HOW` line) and in the TALISMANS tab; a new tier needs no text, a new param needs `say` to read it.

**Artifacts.** `ARTIFACTS`: twenty-one, three tiers, `apply(m, p)` via `applyBoons`; `game.artifact`
`{ id, tier }`, saved, `resumeRun`. FIRE AMULET: `mods.firePass` depth. LUCKY CLOVER: `mods.luck` →
`generateLevel(def, seed, { luck })` for the next floor (`balance.js` runs without). BOOMERANG, STRANGE
SYMBOLS, STRAW EFFIGY live on **Q**, which does not exist until worn (`TouchUI.itemReady`); own clock
`Goat.itemCd` / `itemCdMax`; `Shop.throwBoomerang`, `Shop.blink`.

**Talismans.** `js/talismans.js`, hooked in at: `Talisman.update`, `onKill`, `onSoul`, `parry`,
`reflectBullet`, `redirectRune`, `absorb` / `scapegoat` / `loseRunUp`, `buttImpulse`, `onButtStart` /
`onLunge`, `stepMul`, `speedMul` / `gripMul` / `runUpTime`, `splatMul` / `bodyMul` / `domino` / `dragMul`,
`visibleTo`, `splinters` / `corpseGone`, states `flee` / `decoyhit`. Params on `game.mods.<id>`;
`game.tal` per level, `game.talRun` per run. MIRROR SHARD: `goat.parryT` from windup start. SCAPEGOAT nulls
`game.artifact` **and** `game.levelArtifact`. GRAVEDIGGER'S SPADE: `crate` props with `corpse`; `e.corpsed`.
TALISMANS tab edits live via `tools/tuning-patch.js`.

**Escorts.** `js/beasts.js`, `TUNING.prop.tortoise / .goose / .crow`, `TUNING.beast`,
`GEN_RULES.beasts`. One per floor (`levelDef.beasts`, incl. `'chicken'`), in a `coop` (`holds`) in the
first `beast.third`; none on level one. Coops call (`beast.callGap`, `callR`). Banked within `saveR` at
the stairs: `beginClimb` → `Beast.bank` → `game.beasts` → `Beast.applyRewards`; `BEAST_CARD`,
`drawSaved`. **No key, and none trots after you.** `Beast.hurt` (`beast.hp`, `hurtCd`). New escort:
`Beast.KINDS`, `TUNING.prop`, update, draw, `applyRewards`, `BEAST_CARD`.
**How they walk** (1.59): `Beast.way` is the men's `pickWaypoint` for an animal — toward the goat on
`world.route`/`flow` (`Beast.toGoat`), toward the stairs on `Beast.exit` (`open` round furniture,
relaid every `beast.exitEvery`; `d` stone only). Never step an animal down a raw tile field.
`Beast.shy` (hen, crow) keeps it out of a close man's reach behind the goat. Left behind:
`Beast.tick` calls (`strayR`…`strayGap`, `p.behind`), `Renderer.drawStrays` pips it at the screen
edge; the clamp walls it in on purpose (pacing) via `Beast.lost`, which says so. Measure changes
with `tools/escorts.js` (`ESCORT.run`), the way 1.57 measured the men.
- **Tortoise** — thrown (`Beast.throwTortoise`); tucked it is cover, not `item`; blocks one blow
  (`Beast.guards`, `shellTakes`) then `tortoise.cool` on its back. Reward `mods.shieldUses`.
- **Goose** — leads down `Beast.onward` (`game.exitField`), ≤ `goose.lead` ahead, held by doors; honks
  within `seeR` (noise + `Enemy.balk`). Reward: scream range and cooldown.
- **Crow** — follows corpses (`game.crowMarks`); reward `game.crowGift` → `Beast.placeGift`, a tier III
  ware on the next stairs.
- **Hen** — `Prop.updateBird`: loose follows `flowDir` (`henSteer`, `detourFor`); kicked by headbutt
  (`launchSpeed`, `pickTarget`, `turn`); `Prop.strike` kills a man and spends her (a deliberate direct
  kill, kept rare). `game.henFreed`. Saved → `game.henHearts` (`saveHearts`).

### Level flow, UI and persistence

**Music.** Room-driven score (`GameAudio.updateScene`, `MUSIC_PARTS`, `TUNING.audio.layers`,
`encounterStage`, `STAGE_MOTIFS`, `FIRST_MUSIC`, `startMusicCue` / `MUSIC_CUES`); legacy
`playLegacyStep` with `TUNING.audio.crowd`. See `MUSIC.md`.

**The fog.** Rooms: `room.seen` via `game.revealRooms` (box + 1, or `World.anyFloorSeen`), never
re-hidden; `drawUnseen` paints the rest; everything standing filters through `game.hidden`; corridors
never hidden. Sight: `World.computeVis` shadowcast (`castVis`, `VIS_OCTANTS`, `fog.radius`) →
`world.vis` → `Renderer.drawShade` (`fog.res`, `fog.shade`), last in world space; blocked by stone +
`world.visBlock`. Only the renderer reads `vis`. THE ORACLE: `fog.oracle`.

**Death and restart.** `restartLevel` only from `play` / `paused` / `dead`, and counts as a death. It
restores **exactly** `game.levelBoons` (`keepBoons`); only in-level souls are lost. `forgetLessons` resets
once-a-run lines at run start. N needs the dev drawer.

**Seeds and saves.** `game.runSeed`; `game.levelSeed(i)` hashes it with level and `deaths`; base 36 in the
corner; **`#seed=k3j9a`** feeds `askedSeed`. `saveRun` → `{ v, level, boons: [id], totalKills, deaths,
score, runSeed, henHearts, at }` under `SAVE_KEY` (wrapped); `loadRun` validates; winning clears it.
Boons saved by `id` — renaming drops them.

**Score.** `scoreFor(kills, time, levelIndex)`: pace vs par (`score.perRoom`, `fastCap`) × `killMul`
(`killCap`). `noteBest` / `noteRunBest` under `BEST_KEY`, which `clearRun` never touches.

**Menus.** State `title`, `drawTitle`, `MENU`, `game.menu` (`menuAt`, `menuPick`, `menuKey`). A raised
`menu.panel` owns `menu.rects`. LEVELS (`drawLevelPick`, `game.startAtLevel`) deals the souls a run would
have, touches no save, and `menu.tripPick` plays `tripLevel(li)`. `SETTINGS` / `game.settings` /
`SET_KEY`: SHOW THE CLOCK (off), SOUND (`M`).

**Prologue and opening.** Prologue phases `meadow`, `road`, `dark`, `cloth` → `huddle` (`game.inPrologue`,
`intro.pro`, `updatePrologue`, `Renderer.drawPrologue`, `TUNING.intro.prologue`, `INTRO_STAGE`). The
opening scene (`game.beginIntro`, state `intro`, `updateIntro`, `TUNING.intro`) is unskippable until
watched once (`SEEN_KEY`, `endIntro`); `skipIntro(true)` always works. Its men are `scripted` `Enemy`s
(`followPath`, `say`); `goat.state = 'ko'` is render-only. Only `startLevel(..., withIntro)` plays it.

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
- A test `Prop` of kind `mill` keeps sweeping after `broken = true`: `Prop.update` dispatches to
  `updateMill` before it looks at `broken`. Splice it out of `game.props` when the scene is done, or
  the next scene's man is flung sideways by an arm nobody can see and every result downstream lies.
- Spawning a man a beat before flinging him at something. Aware, he chases the goat in that beat and
  leaves the line you put him on. Create him and fling him in the same tick.

A fourth trap: `H.startPlay()` leaves the goat in the pen on level 1. Break out first
(`H.aimAt = {x, y}` at a bar, then `H.headbutt()`) or nothing downstream can move. And the dev spawner
drops men **aware and adjacent**, so a handful of them will kill the goat during a test unless
`game.dev.god` is on — a dead goat freezes every enemy, which reads as the feature under test being broken.

**Always run `node tools/balance.js` after touching anything about who spawns where or which rooms go
where.** It runs every rule in `js/rules.js` over many seeds of every level, plus the two averaged
rules a single level cannot know about itself, and it is the only place they can fail. The same list is
on the RULES page of the dev drawer, per level and live, which is the quicker way to look at one seed.

The report ends on **threat over power**: the goat's starting hearts plus the souls dealt before each
level, weighed by `BOON_POWER` in `tuning.js`. A level whose ratio falls is flagged but does not fail.

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

The artifact is published from `artifact.html` with every script passed as supporting files, and
always to the existing URL. Republishing without the `url` creates a second artifact.

- `file_path`: `artifact.html`
- `url`: `https://claude.ai/code/artifact/098e742b-e742-4ce7-8499-a303fa5db021`
- `root`: the project directory
- `files`: every file in `js/`, mapped path-to-path
- `capabilities`: `{ downloads: true }` — SAVE THE PICTURE (`js/painting.js`) asks for it and hides
  itself without it. A non-empty declaration replaces the stored one whole; omit it on a redeploy
  that changes nothing here and the stored one carries forward.
- `label`: a short version tag, for example `0.7 whatever landed`

If you add a new file under `js/`, it must go into three places: both HTML files' script lists and the
publish `files` map. Forgetting the map means the live page breaks while the local one works. If you
delete one, remove it from all three (pass `null` for it in the `files` map).

Run **`node tools/check-sync.js`** to confirm all three copies agree: it fails on a dirty tree, a `main`
that is ahead of or behind the remote, a branch that was never folded in, script lists that have drifted
apart, and a file in `js/` that no HTML file loads. The artifact half needs the published sizes, which
only Claude can fetch — `action: "list"` with `scope: "files"` on the artifact URL — so save that listing to a file and
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
- The painted props still without a pixel sprite (altar, banner, gong, lantern, weapons, grating, big
  grass, soul wisp, mill, cage posts, door slabs) — see `ART_HANDOFF.md`.
- **A souls resource.** Asked for on 14 Sep 2026 and not yet built: one soul per man killed, banked and
  spent on something. `game.kills` already counts men and `scoreFor` already refuses to let kills beat
  pace, so the open question is what they buy, and whether buying anything with bodies argues with
  *run, don't fight*. The obvious home is the soul door: a vault that opens for souls instead of, or as
  well as, four blows. See `BACKLOG.md`.
- Gamepad support, a Priest boss, and later acts.
- The endless roll against a wall, reported in the 14 Sep 2026 playtest and **not reproduced** — see
  `BACKLOG.md` for what was measured and what to ask him. The soul barrier from the same batch was
  parked, for the reason pillar 1 gives; everything else in it shipped in 1.4.

`CONCEPT.md` is the current design truth.
