# Working on Goat Out

Instructions for any session picking this project up. Read this first, then `CONCEPT.md` for what the
game is trying to be (it is the design truth). `README.md` is for a player, this file is for whoever is
building it. `MARKET.md` is the commercial picture: comparables, the 2026 storefront and the open
positioning decisions. `BACKLOG.md` is what playtesting has asked for and has not got yet, read it
before inventing work. `ART_HANDOFF.md` is for whoever is generating and packing art: what is already
drawn and wired in, what is still a placeholder, and how the pipeline works. `VISUAL_REFERENCE.md` is
the research behind the art style, how big a pixel should read at this camera and TILE size, and which
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
`GENERATION_RESEARCH.md` is the companion piece about level/world *generation*, how Spelunky, Isaac,
Gungeon, Dead Cells, Ape Out and others build a level, and what laws hold across most of them. Also
background reading, not a spec.

The published build lives at **https://claude.ai/code/artifact/098e742b-e742-4ce7-8499-a303fa5db021**.
Always update that same URL rather than publishing a new artifact (see *Publishing* below).

---

## Ground rules

1. **Never add a new input.** The whole design rests on a small verb set: move, headbutt, grab/throw,
   roll, scream. Upgrades bend the numbers behind those verbs or change what a button does. They never
   add a seventh button. If a feature seems to need a new key, find a way to fold it into an existing one.
   One exception, made on purpose (18 Sep 2026, written in 26 Sep 2026): a talisman with a use of its own
   (BOOMERANG, STRANGE SYMBOLS, STRAW EFFIGY) puts it on **Q**, a key that does not exist until one is
   worn. Nothing else earns a key that way.
2. **All numbers live in `js/tuning.js`.** Nothing gameplay-relevant should be a literal anywhere else.
   If you find yourself typing `0.35` into `enemies.js`, it belongs in `TUNING`.
3. **Kills come from geometry.** A headbutt on its own only knocks a man down. Walls, pillars, fire,
   the mill and other bodies are what kill. Preserve that: it is the reason the game reads as Ape Out
   rather than a brawler.
4. **Both sides are clunky.** Every attack has a windup you can read and a recovery you must eat. Do not
   add cancels, combos, or i-frames beyond the roll's. One exception, on purpose (26 Sep 2026): on
   THE TRIP half the blows on the goat never land (`shroom.phase`), because its controls are scrambled.
   Another, the user's (3 Oct 2026): the butcher's and a soul-bearer's shove (`champion.shove`) comes with
   no windup, because it costs the goat no heart; it is what stops a corner being clicked to death.
5. **Comment the why, not the what.** The code is dense; a one-line comment above a non-obvious block
   that explains the intent is worth more than a paragraph.
6. **Nothing may reward remembering a layout.** The game is in the regeneration camp, Ape Out,
   Spelunky, Isaac, and not the memorization camp Hotline Miami and Katana Zero are in: the level is
   never the same twice, so nothing in it can be worth *learning by heart*. What a level **is**,
   its canon, that it has a wheel, that a vault is cut off the middle of it, is knowledge and is
   meant to be had. Where a particular thing **stands** is not, and no reward may depend on it. The
   test: if a feature gets better the tenth time somebody plays that level, it belongs to a different
   game. See `GENERATION_RESEARCH.md` for why the two camps are the line they are.
7. **A room is bought on two axes, and neither of them is "more of the cheapest man".** `THREAT` buys
   the crowd; `groundOf` (`rooms.js`) buys the floor under it, how little of the room is available
   as a weapon, and `gen.js` deals a level's rooms out along both, tight and quiet first. Pillar 3
   is the reason there are two: if the wall is what kills, then taking the wall away is a way of
   making a room harder that a body count can never say. And `ENCOUNTER.cheap` is the floor under
   the whole thing, the clubman has a cap that *tightens* as a room gets richer, because a late
   room that is an early room with four more of him in it is not a late room.
8. **A promise the generator makes is written down as a rule.** Every one of them lives in
   `GEN_RULES` (`js/rules.js`) with a `check(level)`, so `node tools/balance.js` can hold it against
   many seeds of every level and the dev drawer's RULES page can paint it live. Add a behaviour to
   `gen.js`, add its rule in the same sitting, a promise nothing checks is a promise that has
   already quietly broken on some seed nobody has played. If one seed genuinely cannot answer it
   (`rises`, `ground`), the per-seed check says so by returning `true` or `null` and never blood, and
   the averaged version lives in the report.
9. **Everything new is in THE SHOWROOM the day it is added** (1 Oct 2026, the user's rule: "if we add
   something new, it has to appear in the showroom"). A prop, an animal, a talisman, a door, a floor's
   furniture: `showroomLevel` (js/showroom.js) lays one of it under its name, and an animal or a man the
   dev drawer can drop also gets a SPAWN row. A feature nobody can walk up to on that floor is not done.

---

## File map

| File | Holds |
|---|---|
| `js/tuning.js` | `TILE`, `TILT`, `PALETTE`, `TUNING`, `BOON_BASE`, `BOONS`, `BARKS`, `SETTINGS`, `MENU`, `LEVELS`, `ARTIFACTS`. Every tunable number, every line the cult shouts, the title screen rows and the level definitions. |
| `js/text-edit.js` | `TextEdit`, the dev drawer's TEXT EDIT switch (2 Oct 2026): `fillText` on every canvas is wrapped, while it is on the main canvas's strings are written down with their screen boxes, a click on one opens a box to rewrite or delete it (a click on a dev button still presses it); `TEXT_EDITS` (drawn over the original in every build, the itch one too) and `TEXT_EDIT_KEY` (this browser only, off the server). Saved through POST /text-edit (`tools/text-patch.js`): a text found whole in one literal of js/*.js is rewritten there, anything built out of pieces goes into `TEXT_EDITS`. Loads right after `tuning.js`. |
| `js/rng.js` | Seeded RNG (mulberry32) plus `clamp` / `lerp` / `len` / `angleDiff`. |
| `js/rooms.js` | Hand-authored room templates as character grids, legend at the top (`'w'` a stand of arms, `'O'` a drop). Also the start room, arena, Mill room, Great Hall, Gallery. Templates carrying a `tag` belong to one level's pool. `groundOf`. |
| `js/gen.js` | Level generation: chains rooms, carves corridors, places props, spawns, heals, validates reachability. Defines the tile enum `T`. |
| `js/showroom.js` | THE SHOWROOM (dev only: SHOWROOM in the dev drawer, or `#showroom` + NEW GAME): `showroomLevel`, a laid (not rolled) floor, a hall with every prop named on the floor, a door of every kind in blind alcoves, a wall that gives, then one room per floor in its own stone and canon furniture (`level.zones` / `zoneDefs`, read per tile by `PaintedArt.drawTiles`). `game.showroomOn` holds it through a death; the stairs, the title or any other start let it go. |
| `js/rules.js` | `GEN_RULES`, the generator's promises with a `check(level)` each; `checkRules`, `roomsOf`, `levelFacts`. Read by the dev drawer's RULES page and by `tools/balance.js`. |
| `js/juice.js` | `JUICE`, the game-feel catalogue: every effect with trigger, look, size (read off `TUNING`), code pointer, source and a Godot 4 recipe. Read by the JUICE tab and `tools/juice-md.js`. |
| `js/juice-preview.js` | `JuicePreview`: the JUICE tab's live preview, `JUICE_PLAY` (row → staged scene, what EFFECT OFF turns down), `JUICE_SCENES` (a room laid by hand, what is pressed when), `JUICE_NOPLAY` (why a row has none); the stage is `Object.create(game)` stepped by `Game.update` and drawn by its own `Renderer`. Dev only; loads after `goat-grid.js`. |
| `js/foley.js` | `Foley`: every sound effect as a physical model rendered into a buffer (struck modes, a throat through formants, shaped noise), plus the short room's impulse. Pure JS, renders in node too. |
| `js/skill-icons.js` | `SKILL_ICONS`: the skill rail's chips as pixel sprites, one per verb and active soul, with passive marks; used by `Renderer.skillIcon` and the boon card. |
| `js/audio.js` | WebAudio. Buses, the room, the drum machine, the music bed (`MUSIC`), and `sfx*`: every one-shot effect as a `foley` call. |
| `js/world.js` | Tile grid, collision, line of sight, flow field, fire (ordinary and witchfire), noise events, the persistent decal canvas, cult pictograms, the ritual start room, the cave fields. |
| `js/input.js` | `TouchUI` (on-screen controls), `autoAim`, `PadInput` / `PAD_BTN` (the gamepad, polled by `Game.pollPad`), and `KeyBind` (SETTINGS → CONTROLS: the verbs on any key or mouse button, its panel `menu.panel === 'controls'`). |
| `js/entities.js` | `Goat`, `Prop` (every world object), `Bullet`. |
| `js/enemies.js` | `Enemy`, one class, behaviour branches on `kind`. |
| `js/status.js` | `Status`: poison, the three reactions between poison / stun / fire, puddles, the spit glob, thrown things that drip poison (VENOM JAW) or burn a line (FIREBRAND, `brandTrail`). |
| `js/thrower.js` | `Thrower`: the thrower's part of `Enemy.updateBearer` (looking for something to lift, the lift, the carry, the aim, the throw; his grab of the goat and the throw of him), the goat's `carried` / `tossed` states (`goatStep`), what he throws meeting the goat, and the animals he threw in the air (`game.tossed`, `fly`). Loads after `enemies.js`. |
| `js/shop.js` | `Shop`: the mouse in the wall, her offers, provoking her, the rat ogre, and the two Q-verb artifacts (boomerang flight, blink). |
| `js/talismans.js` | `Talisman`: the seventeen talismans from `ARTIFACTS_TZ.md`, every hook, their drawing, icons and the TALISMANS tab. |
| `js/beasts.js` | `Beast`: the escorts (tortoise, goose, crow, horse; the hen is one of the choices), dealt per run (`Beast.deal`, no kind twice), banked at the stairs for a run-long reward; `ABOUT` / `lines` feed the ANIMALS tab. |
| `js/horse-pixels.js` | `HORSE_PIXELS`: the horse as a hand-built pixel unit on `PROP_PIXELS.Grid` (five views mirrored to eight, a gallop, the `kick` buck); `HORSE_PIXELS.draw(ctx, angle, moving, t, pose)` at its feet, called by `Renderer.horseSprite`. Loads after `ogre-pixels.js`. `output/horse-2026-09-24/render.cjs` renders a sheet. |
| `js/altar-art.js` | `AltarArt`, base class of `PaintedArt`: hashing and small cached pixel canvases for level one's ornament. Never creates a Prop or consumes the simulation RNG. |
| `js/decal-pixels.js` | Generated by `tools/pack-decals.js` from `output/pixel-ominous-decals-2026-09-23`: `DECAL_PIXELS`, the cult's four signs (three on the floor, the watcher on a far wall) as a palette and rows of letters. Placed by `World.placeOmens`, drawn by `Renderer.drawOmens`. Never edit by hand. |
| `js/painted-art.js` | `PaintedArt`: the frame round every unit (shadows, leans, collar, wounds) via `character` → `PIXEL_ART.draw`; `drawTiles` / `swatch` / `wallTile` for room floors and walls; the remaining painted props (`ATLAS_CELL`, `PROP_FOOT`). |
| `js/ogre-pixels.js` | `OGRE_PIXELS`: the ogre (the Butcher's kind) as a hand-built pixel unit on `PROP_PIXELS.Grid`, five views, strides, the fists-up pose, and `OGRE_PIXELS.draw`, which `PaintedArt.character` calls for key `ogre`. Loads after `prop-pixels.js`. Node-requirable for a sheet. |
| `js/prop-pixels.js` | `PROP_PIXELS`: every prop as hand-placed pixel sprites (`Grid`, palette `P`), and the page hook that hands them to `PaintedArt` / `Renderer` in place of the painted and primitive props. Loads after `render.js`. Node-requirable for the sheet renderer in `output/pixel-claude-2026-09-24/`. |
| `js/pixel-assets.js` | Generated by `tools/pack-pixel.ps1` from `output/pixel-mid-2026-09-23`: the Pixel 2.5 unit atlas (goat, the cast, hen, rat ogre, mouse, goose, raven, turtle, `sheep-pet`) as a data URI, alpha hardened and recompressed by `tools/png-harden.js` (the packer's last step). Never edit by hand. |
| `js/pixel-env-assets.js` | Generated by `tools/pack-pixel-env.ps1` from `output/pixel-environment-2026-09-23`: floor and wall swatches, room and cave props, floor litter; recompressed by `tools/png-harden.js`. Never edit by hand. |
| `js/pixel-art.js` | `PIXEL_ART` (draws units off the atlas; sizes `PIXEL_EXTENT`, slot map `PIXEL_UNIT`, throat points `PIXEL_NECK`, `hornsOf` / `horns`) and `PIXEL_ENV` (furniture, cave props, litter; `PIXEL_ENV_ID`, `PIXEL_FLOORS`, `PIXEL_ROOMS`, `PIXEL_LITTER`). `ready` only means the atlas image has loaded. |
| `js/render.js` | Everything drawn. Roughly half the codebase. |
| `js/dark.js` | `Dark`: THE DARK's picture, light cast from every flame through the tiles, the goat's hearing as silhouettes, the wall faces round him, windups and eyes over the dark. Render only. |
| `js/combat-fx.js` | `CombatFX`: cosmetic fragments and bursts (deaths, body pieces), and every flame, blast, smoke puff and blood spray as pixel frames it bakes itself (`flameFrames`, `burstFrames`, `pixelRing`, `cellDisc`); never enters collision, damage, noise or AI. |
| `js/scatter.js` | `Scatter` (`game.scatter`): a suit of armour's pieces (`fromArmor`, `armor-*`), and the supper on the tables (`Scatter.foodOf`, off a hash of the table's tile; `TUNING.scatter`) and everything thrown off one, arcs, quarter turns, bounces, rolls, clay breaking into shards and a spill, left lying to be kicked. Cosmetic: never in collision, damage, noise or AI. Sprites `food-*` in `js/prop-pixels.js`. |
| `js/thrower-pixels.js` | `THROWER_PIXELS`: the thrower as a hand-built pixel unit (a goat's skull strapped over his own head, the tank, the hose into a port in his shoulder, one huge arm with the veins lit by a wave on every beat, the other a stick), four views drawn and none mirrored (the big arm is his right whichever way he faces: the left view has it on his far side), poses `idle` `walk` `up` `punchwind` `punch` `throw`, `N` frames of pulse; `draw(ctx, angle, moving, t, x, e)` off `poseOf(e)`, called by `PaintedArt.character` for key `thrower`. Loads after `spartan-pixels.js`; node-requirable (`output/thrower-2026-10-03/ingame.cjs` renders every view). |
| `js/spartan-pixels.js` | `SPARTAN_PIXELS`: the shieldman, a fat Spartan, a hand-built pixel unit in the ogre's recipe (belly out, a small helmet and crest, stubble, red cape, hairy legs, no club), five views mirrored to eight and a stride; `SPARTAN_PIXELS.draw(ctx, angle, moving, t, x)`, called by `PaintedArt.character` for key `spartan`. Loads after `ogre-pixels.js`; node-requirable. |
| `js/pig-pixels.js` | `PIG_PIXELS`: the pig as a hand-built pixel unit, the horse's recipe a size down (five views mirrored to eight, a trot, the `eat` pose head-down); `PIG_PIXELS.draw(ctx, angle, moving, t, pose)`, called by `Renderer.pigSprite`. Loads after `horse-pixels.js`. `output/pig-2026-09-30/render.cjs` renders a sheet. |
| `js/heaven-pixels.js` | `HEAVEN_PIXELS`: heaven's sprites on `PROP_PIXELS.Grid`, the god (`god`, `god-speak`, `god-blink`), the blind shepherd's three arms, the mirror (its glass one flat colour, `GLASS`), the five bells and their beam (`BELL_GAP`), a seat, gold grass, the gold skull the HUD counts sacrifices in. Loads after `horse-pixels.js`; node-requirable for a sheet. |
| `js/heaven.js` | `Heaven`: THE PASTURE ABOVE, where a death's card leads (see *Heaven* below): the store that outlives runs (`HEAVEN_KEY`, `meta`: sacrifices, `MIRROR` ranks, the seats), the hand-laid two-room level (`level`), its step (`update`: GRAB answers, the comb, the talk, the mirror panel, the bells, the edge), what the god says (`HEAVEN_TALK`, `pickTalk`) and all of its picture (`bake*`, `draw*`, `drawHud`). |
| `js/motes.js` | `Motes`: the white souls (1.86), `spawn` over a man put down once `Heaven.gifted()`, `update` (they follow him out of their room), `bank` (`Heaven.earn`), `flush` at the stairs, `draw`; his own soul: `drawAscent` on a death, `second` / `updateRevive` / `drawRevive` for SECOND CHANCE, `ghost` (his picture washed white, baked per facing). Loads after `heaven.js`. |
| `js/beasts-more.js` | The rabbit and the husky (1.86) on `Beast`: `drawMore` (their `PROP_PIXELS` sprites `rabbit-sit/-hop`, `husky-stand/-sing`), `answer` / `refuse` / `updateRefused` (BAAAH yes / bah no after every animal's terms, `BEAST_ANSWER`), `updateRabbit` and `game.legsTied`, `updateHusky` / `startSong` / `heard` / `updateSong` / `drawSong` (`game.song`). Loads after `pig-pixels.js`. |
| `js/codex.js` | `Codex` (1.86): `KEYWORDS` marked in descriptions (`line`, `lines`) and explained on the pointer (`drawTip`, last thing drawn; `R.tips`); `portrait` (the goat large, facing SE, any mods and talisman), `drawBoonGoat` over the soul cards; the book on I / PAUSE → INVENTORY (`menu.panel === 'book'`, `drawBook`, `bookKey`, `bookClick`); the mouse's offer as cards (`watchShop`, `game.shopDlg`, `updateShop`, `shopKey`, `drawShop`). Loads after `motes.js`. |
| `js/goat-grid.js` | `GoatGrid`: the GOAT GRID tab of the dev tool (`#goats`). The build's own goat (`PaintedArt.drawGoat` with a stub `game`) on a grid whose axes are picked from horns, voice, talisman, third eye, facing, wounds, floor (a canon's own swatches) and decor (a prop off the environment atlas); zoom, framing, pixel shadow, SAVE as PNG or JPG. Its SCENE mode (`drawSceneTab`, `G.scene`) composes one frame by hand: a floor's room (`sceneTiles`, `drawWall`/`floorSwatch` on its own tile grid), men as plain stubs in a pose (`manStub`, `poseMan` → `drawEnemy`), props as fresh `Prop`s, `CombatFX` fire, pools, corpses and bursts, placed by clicking the floor (`grid-at=` rects, half a tile), saved by `exportScene`. The renderer's `game` is lent a stub for the draw only. Touches no run state. |
| `js/painting.js` | `Painting`: the picture of a cleared floor, floor plan, the decal canvas's paint, the line he ran, a skull per kill, baked once at the stairs (`Painting.bake`, `TUNING.painting`), shown as the clear screen's last card, saved as a PNG (through the viewer's `downloads` capability when framed as an artifact, a plain link locally). Render and export only. |
| `js/release.js` | `RELEASE`: the itch build. `RELEASE.on` (the zip's index.html sets `window.GOAT_RELEASE` first) means no dev drawer and no tool addresses; `RELEASE.build(game)` is the dev drawer's ITCH BUILD button, the page zips itself (flagged index.html + exactly the scripts it loaded, CRC'd, deflated by `CompressionStream`) and downloads it (through `Painting.dl` when framed as an artifact). Loads just before `game.js`. |
| `js/photo.js` | `Photo`: PHOTO MODE (SETTINGS `photoKey` on P / `photoAuto` every `photo.every` s: the canvas read straight after the draw, kept in `Photo.shots`; PAUSE → PHOTOS is `menu.panel === 'photos'`, a page of thumbnails to choose from, saved through `RELEASE.hand` / `RELEASE.zip`) and the dev drawer's DIP LOG (`Photo.dipCheck`, a frame over `photo.dip.ms` written down with its room, counts and a small picture; `dipsave` writes JSON). Reads the picture; never touches a run. Loads just before `game.js`. |
| `js/stats.js` | `Stats`: RUN STATS (1 Oct 2026). One report a life (opened at `startLevel`, closed by a death, the send, an escape, a quit or a closed tab): hearts lost and to what (`Goat.damage`), every blow on the cult and what landed it (`Enemy.die`'s fifth arg `how`: wall, body, door, blade, bomb…, pass one at a new kill site), soul cards dealt and taken, the mouse's shelf, every animal's fate. **THE FUNNEL** (`Stats.step`): the first time this browser takes each step (`open` the title, `start`, `death`, `restart` a life after one, `clear1`, `reach<n>` for `TUNING.stats.reach`, `win`), never off a god/LEVELS life, sent at once to `/steps`. Kept in `STATS_KEY`; sent to our own Cloudflare Worker (`TUNING.stats.url`, `tools/stats-worker/`) only after the title's once-asked question (`menu.panel === 'consent'`, SETTINGS `stats`), only off the itch build, never god/LEVELS. A browser the autoplay bot has played in (`Stats.bot`, `d.bot`) flags its reports `B` and sends no steps. Loads just before `game.js`. |
| `js/game.js` | State machine, fixed-step loop, input plumbing, entity-vs-entity collision, boons, dev drawer. |
| `index.html` | Local build. |
| `artifact.html` | Published build. Same scripts, artifact-shaped head. **Keep the two script lists in sync.** |
| `tools/serve.js` | Dev server. Also accepts `POST /shot?name=x` with a data URL and writes a PNG to `tools/shots/`. |
| `tools/harness.js` | Console test harness. See *Testing*. |
| `tools/escorts.js` | In-page bot: breaks a coop, runs the goat to the stairs, counts which animals arrive. |
| `tools/autoplay-bot.js` | A friend's autoplay bot (3 Oct 2026), kept as sent: plays through synthetic keys and pointer only, reads `game` and never writes it, learns per browser (`doomedgoatbot.v1`); F8 on/off, F9 its panel, `bot.log`, `bot.mem.deaths`. Its lives go to RUN STATS flagged `B`, never into the funnel. For active testing when asked, not every time; later a base for playtest numbers and level judging (`BACKLOG.md`). |
| `tools/smoke.js` | In-page smoke run: a bot walks every floor (and THE DARK, THE TRIP) to the stairs with the cult alive, god mode on, drawing a frame every few steps; reports throws, non-finite positions, set-downs and ms per update and draw (`SMOKE.run`, `SMOKE.report`). |
| `tools/art-study.js` | In-page sheets for the art studies: every study on every floor with brightness contrast and OKLab distance, all eight facings, and before/after frames of a frozen scene (`ART_STUDY.stage`, `.pair`, `.all`). |
| `tools/hounds.js` | In-page measure of how hounds run: reversals, sliding, planting, circling (`HOUNDS.sweep`), who never gets onto the ring (`HOUNDS.arrive`), and a picture of the lines (`HOUNDS.draw`). |
| `tools/balance.js` | Prints the difficulty curve and canon/mix split of every level, runs every rule over many seeds, fails on a broken one. |
| `tools/juice-md.js` | Writes `JUICE.md` from `js/juice.js`. |
| `tools/doc-numbers.js` | Every number README, CONCEPT and CLAUDE state (floors, blows, hearts, hits, caps, rooms, souls, timings) held against the value the code pays; exits 1 on a wrong one, warns when a sentence it reads has moved. |
| `tools/itch-zip.js` | The itch.io upload: `dist/doomed-goat-<BUILD>-<commit>.zip` holding `index.html` (flagged as the release with `RELEASE.flag`, read off `js/release.js`) and exactly the scripts it loads; refuses a dirty tree (`--dirty` overrides), lists the zip back CRC-checked; every script minified (terser, `RELEASE.minifyOpts`; `--plain` skips it, never for itch). The dev drawer's ITCH BUILD makes the same zip from the running page. |
| `tools/itch-push.js` | The itch half of a deploy: cuts that zip and `butler push`es it to `ITCH_TARGET` (`<user>/<game>`), channel `html5`, `--userversion` BUILD; a channel holds one build, so the old one is replaced. `--dry` prints the command. butler and `butler login` are the user's, once per machine. |
| `tools/perf.js` | In-page frame profiler: `await PERF.frames(floor, seed, n)` (update/draw avg, p95, max), `PERF.top` (every method timed, hot helpers skipped), `PERF.spikes` (frames over a budget and what they spent). Each frame is its own task (`PERF.tick`): back-to-back frames pile up GPU work into fake 100–470 ms stalls. |
| `tools/pack-decals.js` | Writes `js/decal-pixels.js`: finds each generated sign's pixel grid (or cuts it to `CELLS` across), one colour a cell, a few colours a sign. |
| `tools/png-harden.js` | Both pixel packers' last step: the embedded atlas PNG hardened the way `PIXEL_ART.init` does it and re-encoded (adaptive filters, zlib 9), proved to decode to the same pixels before it is written. `--check` reports only. |
| `tools/text-patch.js` | TEXT EDIT's server half (`applyText`: the literal, else `TEXT_EDITS`) and the TALK page's (`editLine`: one spoken line rewritten or taken out of its list where it stands; a single value is emptied). |
| `tools/tuning-patch.js` | Writes tool-tab edits back into `tuning.js` (steps into arrays by index). |
| `tools/check-sync.js` | Checks the working tree, `origin/main` and the published artifact are one build. See *Publishing*. |
| `tools/script-lists.js` | The one reader of which scripts the two HTML files load. `check-sync.js` and the guard both ask it. |
| `tools/hooks/guard.js` | Claude Code hook: refuses a publish or a push that would put a broken build live. See *Publishing*. |
| `tools/hooks/compact.js` | Claude Code hooks: saves the user's own words before a context compaction and hands them back after it. |
| `tools/god-talk.html` | TALK (dev drawer's TALK · GOD, ANIMALS, TIPS): every line of `HEAVEN_TALK`, `SHEPHERD_TALK` and `DEATH_TIPS`, read out of js/heaven.js, to edit, delete and cut into parts with `|` (each part its own plate, `Heaven.parts`); SAVE writes them back through `tools/serve.js` (POST /talk-edit). Below, every animal's and the mouse's line (`BEAST_HELLO`, `BEAST_ANSWER`, `TUNING.prop.<kind>.talk / lines / thanks`, `Beast.PACT`), each saved or deleted on its own (POST /line-edit). Served only. |
| `tools/stats.html` | THE FUNNEL on top (players, not lives: opened, started, died, played again, cleared floor 1, reached 4, reached 8, escaped; the steps the game sent, filled in from the lives; the build picker keeps the players who came in on it), then the reports read back as charts: deaths, hearts lost and cult kills by floor and cause, how far lives get, soul cards and talismans offered vs taken, companions. Reads this browser (served), files (the dev drawer's SAVE STATS), or the worker (SERVER: its address and READ_KEY, kept in that browser). Also players by day, first vs came back. |
| `tools/stats-worker/` | RUN STATS' receiver: a Cloudflare Worker (`worker.js`) over D1 (`schema.sql`). POST `/report` (shape, size and the id patterns checked, a rate limit per hashed address, stored once by id) and `/steps` (the funnel, a player's step stored once), GET `/reports` (newest first, `?before=` pages back, `X-Oldest-Got`) and `/steps` with the `READ_KEY` secret. `README.md` there is how to deploy it; `wrangler.toml` holds the database id. |
| `tools/sfx-board.html` | Every sound effect on one page of buttons, through the game's own mix and room. Served, `/tools/sfx-board.html`. |
| `BACKLOG.md` | Playtest notes, dated and tagged bug / feel / number / system. Requests, not decisions. |
| `PLAYTEST.md` | The first itch.io playtest as a runnable plan: the three questions, the form, the observation sheet, how the numbers are counted, and the go / no-go for the build. |
| `PLAYTEST_QUESTIONS.md` | The eight short questions sent to a tester after playing, English and Ukrainian, ready to paste. |
| `ITCH_PAGE.md` | The itch.io page description as approved (1 Oct 2026), ready to paste, plus the tags. Every line in it is something the build does. |
| `output/audit-2026-09-24/` | The six audits behind that day's `BACKLOG.md` batch, with their probes. Reference, never loaded. |
| `tools/backlog-questions.html` | The open backlog as a questionnaire, published as its own artifact with a db (answers under `answers/<item id>`). |
| `ART_TODO_GPT.md` | The image-brief format (`asset-spec`). Every sheet in it shipped as hand-placed pixels in 1.63–1.64; the ominous decals went in in 1.74 (`js/decal-pixels.js`). |
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

**The cult's signs** (1.74) are not on it: `World.placeOmens` lists them (its own RNG off the seed, whole on floor or
 two tiles of far wall) and `Renderer.drawOmens` draws them between the floor and the decals, only in a seen, unclamped
 room (`TUNING.effects.omens`, `DECAL_PIXELS`). None on THE TRIP.

**The decal canvas.** `world.decal`, persistent at `DECAL_SCALE` (0.34), never cleared in a level: blood,
bodies, scorch, pictograms (snapped to decal pixels in `pixelGlyph`), the start-room scene. Raising the
scale costs memory fast (world is 420x78 tiles).

**The art is Pixel 2.5.** Every unit, goat, enemies, hen, rat ogre, the prologue ewe (`sheep-pet`), men
falling down holes, is `PaintedArt.character` → `PIXEL_ART.draw` off `js/pixel-assets.js`. No ART
switch, no painted character sheets; `PIXEL_ART.ready` / `PIXEL_ENV.ready` only mean the atlas loaded.
`PIXEL_UNIT`'s `sheep` slot is the goat. `PIXEL_ART.init` hardens the unit atlas's alpha on load (the
packer leaves every edge half transparent, which point-sampled into a ragged rim); `image` is a canvas.
**The art pass** (`ART_PASS`, 25 Sep 2026) is the game's look, held beside the packed one: amber
windup cells, the seer in witchfire, gold milk grass, levels' `artPass` colours (`ART_PASS.set`), the
hunter in BROWN + BAND and the clubman SLIM (`PIXEL_STUDY`, baked off the atlas by
`PIXEL_ART.studyOf`), floors and wall faces as sheets. Nothing packed is replaced: the ART tab
switches each part, `#aspacked` starts with all of them off. See `ART_HANDOFF.md`; the `art-pass`
skill is how the next pass is run. **The second pass** (2 Oct 2026, ART tab's second row): `ART_PASS.shadows`
(`Renderer.pixelShadow`, stepped shadows), `tells` (rune, slam and landing rings, rifle and hook lines,
soul trail and ring, DRAGON BREATH in cells via `floorRing` / `floorArc` / `floorLine`; every blow-to-come
amber), `hay` (`ENV_STUDY`, the straw a step under the goat), `cave` (`FLOOR_SHEET` 'rock', never the trip).
The room and cave bakes key on `hay` / `cave` (`look`); anything new they change must join that key.

**Props are pixels too** (1.63). `js/prop-pixels.js` draws every prop the painted pack or a primitive
used to: doors and their debris, sword, shield and the stand of arms (layered: the arm stands IN it),
the wheel, cage posts, altar, banner, gong, lantern, soul wisp, both grasses, the pail, grating, bomb,
coop, burrow, stool, the roast, the cave spires (1.64) and the stairs (1.64, baked per tile, `cold` honoured). Each sprite is a `Grid` built by drawing calls, outlined, baked at
`UP` and drawn smoothed; it wraps `PaintedArt.stamp` / `atlas` / `fire` / `millArm` / `brokenDoor` /
`drawProp` and `Renderer.drawPail` / `drawBurrow` / `drawRoast` / `drawSpire` / `drawStairs`, fitting each into the painted one's
measured box, so no footprint moved. render.js asks `painted.pixelProps` where a primitive sits
inline (mill caps and hub, the ware's stool, the shelf pail). The painted pack itself went in 1.74:
`PROP_PIXELS.on` is always true, and `PAINTED_SIZE` (painted-art.js) keeps the proportions its images lent.
`node output/pixel-claude-2026-09-24/render.cjs 6 [names]` renders them to a sheet.

**What he carries sits in his teeth.** `Renderer.drawCarried` draws a held *thing* at the mouth of the
facing the sprite shows (`PIXEL_FACE`), `goat.carry.lead` + `reach` × r ahead, turned with the head,
behind him on the back views; render only, `grab.holdDist` is still where a throw starts from. Held
props are skipped in both prop passes. A held man still draws at the hold point. **Carrying anything
he faces his aim**, running or standing (`goat.carry.turn` rad/s in real time, so COLD EYE does not
slow it; the movement block's own `facing = velocity` is skipped while holding), otherwise the thing
in his teeth pointed where he ran, not where the throw and the shield (`Goat.covers`, aim) go.

**Floors and walls.** On square-walled levels `PaintedArt.drawTiles` draws pixel swatches from
`js/pixel-env-assets.js`. `PIXEL_ROOMS` maps `canon.id` → floor swatch ids (picked per tile off a hash),
a boards swatch, and a shared wall `{ top, face }`. Each swatch is multiplied by the level's
`floor`/`floorAlt`/`wallTop`/`wall` (brightened by `PIXEL_ROOMS.lift`) and baked once into a cached
canvas (`PaintedArt.swatch`), per-frame multiply doubled floor cost. `wallTile(def, mask)` (N=1, E=2,
S=4, W=8): only a south-exposed wall (far wall, pillar front) shows a brick face (shorter on a
pillar/stub); other exposed sides are a dark rim on the cap.
**A floor is a sheet** (25 Sep 2026): `floorSwatch` returns a tile of `FLOOR_SHEET`, one seamless
sheet six tiles square a canon (`PIXEL_ROOMS[canon].sheet`: flags, cobble, setts, earth, slabs,
boards, paving), painted once in the swatch's own colours and laid in world space, so a pattern joins
across every tile edge and never repeats a tile. `ART_PASS.floors` false (the ART tab) is the packed
swatch stamped per tile. Cave and trip floors are `PIXEL_ENV.floor`, untouched.

**Shadows are under the feet.** `Renderer.shadow` centres just above the foot point; a prop's feet are
`PROP_FOOT` px under its tile centre.

**Who stands in front.** Standing men and the goat are drawn in order of their feet (`y`; the goat
mid-LEAPFROG last). Their floor marks go down first for everyone (`drawEnemyGround`: windup strips,
the rifle's line, a soul's haze; `renderer.groundDone` stops `drawEnemy` repeating them), and what
hangs over a head (`drawOverhead`) is collected in `renderer.overheads` and drawn after every body,
nearest the camera first, a bark plate stepping up clear of one already placed.
Props keep their fixed order (`inFront` is the exception list).

**His back-left run** (and its mirror, the back-right) was packed with the horns standing up on two of
its four steps, so they flapped every stride: `PIXEL_ART.hornFix` / `PIXEL_HORN_FIX` bakes those frames
with the middle steps' horns moved onto their own roots (5 Oct 2026); `hornsOf(f, img)` reads the fixed one.
**The goat's extras.** `PIXEL_ART.hornsOf(frame)` / `PIXEL_ART.horns` redraw the horns for LONG HORNS
(an active since 1.56: `mods.antlers`, stag antlers built per horn by `antlerOf` on the art's grid),
BOMB CHARGE, SPLASH (`TUNING.goat.hornLooks`; `hornMods` shares the lean). `PIXEL_ART.face` puts the
scream souls and THE ORACLE on his face, THE FULL THROAT's bell, VENOM SPIT's froth, a third eye,
as hand-drawn pixel sprites (`PIXEL_FACE_ART`) at per-facing points (`PIXEL_FACE`); what leaves him
(the venom drip, DRAGON BREATH's steam and flame) is `PaintedArt.goatFx`, cosmetic, in world space.
**Everything added to him is pixels on the sprite's grid** (`TUNING.goat.face.cell`), never a smooth
shape. Standing still he breathes (`TUNING.goat.breathe`, a stretch from the hooves in `drawGoat`),
and after `idle.after` s fidgets (`goat.fidget`, ticked in `Goat.update`, drawn only: glance, pronk,
shake, paw; a glance lends `g.facing` to the draw and hands it back). Grazing he bends to the tuft
(`goat.grazeAt` stamped by the milk loop and the mushrooms, eased into `goat.grazeK`; `goat.grazePose`: a
lean toward his facing, a squash from the hooves, a nibble; 1.85), and does not fidget. Running, `goat.feel`: `g.lean`
and a step bob are drawn; `turnGrip` on a reversal is the only part the simulation feels. The worn talisman hangs from
one collar for every talisman, a half-ellipse round the throat (`TUNING.goat.collar`, per-facing
`PIXEL_NECK`; back facings show only the nape). Lost hearts are blots (`PaintedArt.wounds`,
`TUNING.goat.wounds`) under the collar, masked to the frame; `wounds.front` is how much blot size is left
facing the camera. `Renderer.artifactIcon` is the one artifact drawing (HUD chip, stool, collar).

**The canvas keeps no state of its own** (1.97, 2 Oct 2026; render.js `CANVAS_STATE`). The full collection
every few seconds (a dropped frame each) was the **browser's** heap filling, not the script's: every
`ctx.save()` was a new copy of the canvas state there (~700 bytes, 170 a frame), every `getTransform()` a
DOMMatrix, every `measureText()` a TextMetrics, every `create*Gradient` an object. So, on every 2D context:
`save`/`restore` are a stack kept in JS (the transform, and each property's old value the first time it
changes in a level; `clip()` alone makes the browser's own save, undone with its level); a property set
to the value it already holds is not passed on; the transform is tracked in plain numbers. **Rules:**
read the transform with `xform(ctx)` (live: copy before changing it), never `ctx.getTransform()`; a text
width is `textW(ctx, s)`, never `ctx.measureText(s).width`; a gradient is made once and scaled into place
(`lightGrad`, `veilGrad`; a soft disc is `glowDisc(ctx, x, y, r, stops)`), never one a frame. `CANVAS_STATE.set(false)` hands it all back to the browser
between frames, for an A/B or a pixel comparison: a frame matches the browser's to within a texel
boundary or two (the browser rounds `setTransform` to 32-bit floats, so a restored matrix is ~1/1000 px
off its own). Measured in two 60 s fights: 20 full collections → 5, and 18 → 10, about a quarter of the time frozen (815 → 209 ms). How it was found
(a `v8.gc` trace with `cppgc` phases, `GCIncrementalMarkingStart`'s reason: "approaching global allocation
limit") is in `BACKLOG.md`.

**What the step is allowed to ask** (23 Sep 2026 perf pass, ~18 → ~3.5 ms on a late floor):
- `game.liveEnemies` is who ran this step, **a man in the goat's mouth included** (the wheel, the grating and
  the teeth take him out of it; every other reader skips `held`). **"Anybody near here?" reads it, not `game.enemies`**
  (collision pairs, grate, spires, wheel, door pressure).
- `collideEntities` builds its body list **once**, box-rejects first, compares squared distances.
- **What the frame is allowed to redraw** (26 Sep 2026 perf pass, ~3.0 → ~2.5 ms a frame measured
  realistically). A small offscreen canvas changed and then drawn costs an upload of it (1–2.5 ms of
  main thread) every frame it changes, so nothing is repainted unless what it shows changed: the fog
  shade (`drawShade`, keyed on its tile window and vis bits), the goat's wounds (`PaintedArt.wounds`,
  a baked canvas per frame of him, `goat.wounds.cache`), a spreading pool (`CombatFX.drawGround`,
  `p.poolAt`, per whole pixel of radius). **Every bake is paid before it is seen**: the art studies
  (`PIXEL_ART.warm`, 0.06–0.37 s each the first time a clubman, mage or rifle was drawn), every flame
  size ordinary and witch (`CombatFX.warm`), a floor's sheets (`Game.warmFloor` → `PaintedArt.warmLevel`:
  the first floor on the title, the next behind the clear cards; `prepare` froze a new floor's first
  frame 0.15–0.45 s). Measure with `tools/perf.js`, which yields between frames.
- **The rooms are baked** (30 Sep 2026, ~10.5 → ~7 ms a draw on THE ALTAR): `Renderer.drawRoomsBaked` paints
  `PaintedArt.drawTiles` once per `CAVE_BAKE` tiles into a bitmap (a tile of margin, `ROOM_BAKE_SEAM` px of lap),
  rebakes a chunk when `roomBakeSig` (its tiles, the secret walls) changes, `ROOM_BAKE_MAX` a frame, and paints
  one still waiting live. **Anything animated on the tile layer must skip itself while `renderer.baking`** and be
  laid on live (the stairs' glow, `stairGlow`). Windup cells test only the cells a row of the shape can hold
  (`drawTelegraphCells`' `span`: a charge strip was 120 000 tests, 12 ms): a swing's row is the disc's chord cut
  by the wedge, walked in from both ends and laid as one rect (`walk`; 1 Oct 2026, a clubman's windup 0.55 →
  0.1 ms), and a hound's band is stamped into a bitmap and read back a row's stretch at a time (`dashBits`,
  1–2.3 → 0.3–0.5 ms). Both draw exactly the cells they did.
- **The bake's resolution is held, and the rooms warm ahead** (1 Oct 2026): `Renderer.bakeScale` picks it off the
  zoom with `BAKE_HOLD` of slack, so the run's few-percent pull-back no longer repaints every chunk at each start and
  stop (a resting zoom of 2.08 sat on the step: 13-20 ms frames against 3); a chunk whose only fault is its
  resolution is drawn as it is and repainted in idle time, never in a frame (rooms and cave both), and
  `warmRooms` / `askRoomWarm` paint the rooms' chunks round the view ahead of him in idle time, as `warmCave` does. The idle
  painters make their own room (`trimBake` with their ring kept, 2 Oct 2026): capped below the frame's own trim, they
  stopped for good once a floor had filled the budget. A chunk let go is emptied; a bake of a world no longer drawn is dropped.
- **Fewer pixels when the frame's own work will not fit** (5 Oct 2026, 19 FPS on an unplugged laptop): `Game.adaptRes`
  lowers `renderer.quality` (the share of the 2.2 MP canvas kept, upscaled `image-rendering: pixelated`) a `perf.adapt.step`
  at a time while the work stays over `slow` ms in play, gives it back under `fast`, and undoes a drop that did not help.
- **A thrown exception inside `draw` costs the rest of the frame.** `drawRunes` once measured against
  raw `castWind` while the timer was `castWind * mods.enemySlow`; the negative radius threw
  `IndexSizeError`. Clamp radii; measure a timer against the duration it was given.

**The camera.** `game.camLead` lerps toward `aim * camera.lead` (`leadLerp`, `leadStill`); `game.camFollow`
moves only past `camera.deadzone` (`game.camTrack`), and a room that fits the view (`fitMargin`) is
**held by a blend, never a switch** (1 Oct 2026): `game.camHold` is how far he is from the room's nearest
way out (`Game.roomMouthDist`, the open tiles of its border), none within `camera.blendIn` of a doorway,
all of it `blend` tiles further in, so a doorway frames him exactly as the corridor does and walking in
slides the picture to the room's middle (`game.camRoomMid`, eased too), **fits is asked of the lens at rest** (`zoomFit * zoomRest`), never the live one: the run
and the fight zoom it out, and a room that fit only zoomed out flipped pinned/tracked several times a
second (1.85, a 16:10 playtest). Reset `camFollow`, `camTrack`, `camHold`, `camRoomMid` wherever `cam.x/y` is hard-set (`startLevel`, `updateFall`, heaven). In a room too
big to hold, an awake boss near him pulls the picture toward himself and backs the lens out
(`game.fightFocus`, `camera.fight`, eased on `game.camFight`); every arena fits a desktop view, so it
shows only when a boss follows him into a big room. `camera.leash` pulls the camera after him (`leashLerp`)
once he is past that share of the half-view, weakened by the hold (a held room keeps him in view). SCREEN SHAKE (a slider, `game.shakeMul`) scales shake, kick and lens.

**Shake on a lost heart, and a little for a thud.** `game.shake(a, hurt)`: without `hurt` it is ×
`TUNING.juice.shakeOther` (**0**). Each shake is a swing along a random line with smooth noise over it
(`raiseShake`, `Game.shakeNoise`, `juice.shakeFreq`), as trauma² against `juice.shakeRef`, never larger
than the old random rattle. The one other shake is `game.thud(x, y, a)`, an ogre or rat ogre landing,
a bomb, a barrel, a poison blast, × `juice.shakeThud`, fading from `thudNear` to nothing at `thudFar`
tiles: weight, not alarm, always under a lost heart (26 Sep 2026). Only `Goat.damage`, `game.stunGoat` and the intro club pass `true`; `game.kick` uses `kickOther`
(0.35). New effects leave `hurt` off.

**Juice.** Master dials `TUNING.juice.screen` (shake, kick, zoomPunch, flash) and `juice.stop` (hitstop)
- turn these first. Also `gore`, `impact`, `dust` → `game.puffs` (never off an ordinary run),
`squashGoat` (`goat.sqLeft`), `game.flares`, `enemy.flash`, `drawHeartbeat`, `effects.bloodScale`,
`goat.bleed` (last heart only), `game.killMarks` on the death pull-back. The **JUICE tab**
(`drawJuiceTab`, `#juice`) is `JUICE`; add an effect, add its row; `node tools/juice-md.js` writes
`JUICE.md`. ▶ PLAY on a row is the live preview (`JuicePreview`, `js/juice-preview.js`): the effect
looping in a staged room beside the table, stepped by the real `Game.update` on `Object.create(game)`
(its own lists and state, everything that saves stubbed, sound through a stand-in) and drawn by a second
`Renderer` offscreen, so the run under the tab is never touched; EFFECT OFF turns the row's dial down
round the preview's own frame only. A new row gets a scene in `JUICE_PLAY` / `JUICE_SCENES` (or a reason
in `JUICE_NOPLAY`); one staged by setting a thing by hand says `approx`.

**Effects are pixels too.** Fire, blasts, dust and blood sprays are frames `CombatFX` bakes itself
(`flameFrames`, `burstFrames`, lazily per frame, pre-warmed by `CombatFX.warm`) at `effects.pixel`
world px a texel and draws with smoothing off; rings are `CombatFX.pixelRing`, drops `cellDisc`. A man torn apart (a blast, a roll) is five pieces cut off his
own sprite, each its own small canvas whose cut is his edge pixels tinted blood (`effects.goreCut`),
never a bar across the crop box, which read as long red sticks on the floor (26 Sep 2026).
A whole dead man (`CombatFX.death`) lands, skids, turns to an exact quarter turn
(`effects.corpse.lie` 0 keeps his pixels square) and bleeds a pool (`CombatFX.pool`, live in
`drawGround` until `stampPool` puts it in the stains). A flame's `size` picks a baked set, so **never animate a flame's size per frame**: it flicks between
shapes; the loop is the motion. A new effect is cells on that grid, never a smooth arc or gradient
(light is the one exception: `drawLight`, a blast's flash).

**Small things.** The smear: `TUNING.goat.trail`, mixed by `mods.speed * goat.runUp` against
`trail.fastAt` (only visible sign of SURE HOOVES). The pointer: `game.updateCursor`, the headbutt chip near white (`buttCursor`, `TUNING.cursor`; 3 Oct 2026, "people do not tie the mouse to the actions"), hidden while the keys or a pad aim, horns
(`CURSOR_GOAT`) or `grabbing`; `crosshair` fallback in both HTML files. Touch: `touch.active`; only a
`keydown` matching `KEYBOARD_KEY` turns it off, and on a `coarse` device every pointer is a finger.

**The gamepad** (30 Sep 2026, un-parked on request). `PadInput` (js/input.js) reads the first
standard-mapping pad once a frame in `game.frame` → `Game.pollPad`; `pad.active` is who has the
controls, set by a press or a stick past `TUNING.pad.wake` **that is moving** (`pad.wakeMove`, 1.85: an axis
parked at the end of its travel, a wheel, a throttle, took the mouse's aim and grab every frame; a
standard-mapping pad is preferred over any other), cleared by a `KEYBOARD_KEY` keydown, any
pointerdown, or a mouse move with real `movementX/Y` (the pointer is hidden while it holds them). **It
adds no verb** (rule 1): in play and heaven it sets the same `input` flags the mouse and keys set,
RT / RB / X `lmbPressed`, LT / LB `rmbDown` (in `readMoveInput`, like touch), A `rollPressed`, B
`spacePressed`, Y `qPressed`, so `tripInput` swaps it like any other hand (its `buttHeld` asks
`pad.buttHeld()`). The left stick (or d-pad) is `mx/my`; the right stick past `pad.aimDead` is the aim,
snapped by `autoAim` with the narrower `pad.assist`, and at rest the aim follows the run with the thumb's
snap (`game.padAim`). On a screen the keys walk (title and its panels, pause, the mirror) a button is
handed to `game.keyPress(code)`, the keydown body, shared, as `Arrow*` (d-pad or `navAt` push,
repeating), `Enter` (A), `Escape` (B; START too, which is `Enter` on the title); START in play is
Escape, BACK is Backspace. The soul cards: `game.boonPad` (drawn as the hover), A takes or releases.
Other cards (death, clear, win) take A / START as `spacePressed`. Labels: `keysOf(game)` → `PAD_KEYS`
or `SKILL_KEYS` (the rail's caps, trip-swapped, the card's key box, the item chip, heaven's prompts),
`CONTROL_LINES.pad`, `padOn(game)` for a tool's stub `game`, `game.tapWord` (a getter: PRESS A).
`game.vibe` runs the pad's `dual-rumble` (`pad.rumble`) instead of a phone's motor.

### Level generation

**Difficulty.** `THREAT`, `ENCOUNTER` and each level's `encounters` are the model; `planEncounters()`
plans every room before placement. *Met alone*: a kind's first appearance in a run is a room with only
it (a new boss has no escorts; `levelDef.met`, `game.taught`, `metRoom` for rifle posts). *Threat, not
bodies*: budget off the curve (`from` → `to`, `ease`), capped per kind and room. New kind: `THREAT`,
`ENCOUNTER.weight`, a `cap`, an `introduce` entry. Then `node tools/balance.js`.

**The cheapest man is not the filler.** `ENCOUNTER.cheap` caps the clubman and *tightens* as budget
grows (`max` → `min`, never zero); rooms with their own head count (Great Hall) are exempt.
`GEN_RULES.crowd`. **The men cap follows the room** (26 Sep 2026): `roomMenCap` scales the level's
`cap.men` by the template's floor (`floorOf`) against `ENCOUNTER.room.ref`, between `min` and `grow` ×
the cap; `planEncounters` buys every ordinary, mill, killbox and gallery room with it (`capsOf`) and
`GEN_RULES.caps` holds the same number (arenas keep the level's cap + 2).

**The floor axis.** `groundOf(tpl)` = fraction of floor with nothing `HARD` within a step (wall, pillar,
brazier, lamp, table, drop, not hay, crate, rack, grate), carried as `tpl.ground`. `draw` in
`tryGenerate` sorts pools by ground and walks the level along it, random among the `GROUND.window`
nearest fits. Only `room.drawn` rooms count (`GEN_RULES.ground`). `pressure` =
`threat * (1 + ground * GROUND.weight)`. `draw` is also the width budget for the 420-tile world.

**Canons.** `levelDef.canon` `{ id, name, idea }`, in run order: STONE (THE ALTAR), FIRE (THE YARD), THE
HOLLOW (THE CAVE), THE LINE (THE ROAD), OPEN GROUND (THE THRESHING FLOOR), THE FUNNEL (THE BRIDGE), THE
DROP (THE RAFTERS), THE NICHE (THE OSSUARY); THE LAMP is THE DARK's (`canon: 'lamp'`). `pickCanonRooms` gives ≥ `CANON.share` of `ordinaryRooms` to
templates tagged `canon: '<id>'`, starting with the first; the rest is the mix (untagged + `levelDef.known`,
earlier canons). `room.role`: `pen`, `calm`, `canon`, `mix`, `trap`, `arena`, `mill`, `hall`, `gallery`,
`killbox`, `rest`, `lesson`. A canon needs `CANON.minRooms` (four) templates. THE THRESHING FLOOR's
`corridorW: 5` eats room borders, so it needs furniture.
**The bridge itself** (1.85): templates marked `bridge: true` (`bridge`, `twinspan`: a deck over the drop,
whole-floor landings at both ends so a door never opens onto a hole) are in no draw; `levelDef.bridges`
[lo, hi] (THE BRIDGE: 1-2) deals them to canon rooms spread down the floor (`bridgeAt` in `tryGenerate`, its
own stream, never the vault's room). `GEN_RULES.bridges`.

**The cave is third.** It has no killbox, `lonePosts`, grating (`spikes: 0`) or trap room. Ladder:
22.3 / 37.0 / 65.3 / 97.4 / 108.5 / 145.5 / 166.7 / 174.1, and THE DARK 68 beside the fifth (1.97); `GEN_RULES.harder` and `balance.js` hold each
level above the last. Later floors draw cave rooms via `known`, so `GEN_RULES.grass` allows grass on the
cave and later floors that drew one, grass *before* the cave fails.

**Exits are at the far end.** `pickDoorY` / `pickDoorX` take `enterRow` / `enterCol`; `farthest` drops
candidates under `DOORS.far` (0.7) of the best distance *before* rolling. Wide-corridor clamping (`fit`)
applies to the **candidates**, or THE THRESHING FLOOR undoes it. A side door also prefers rows with a clear tile one step in (`stepClear`, `room.mouths`, `GEN_RULES.doorstep`). `noteFar` → `room.exitFar` →
`GEN_RULES.farexit`.

**Stacked rooms.** Still one chain. `levelDef.stack` (level two on): `stackSpot` + `carveShaft`. A
stacked room never reaches left of its parent nor stops short of its right wall. `stackable` refuses the
set pieces with walls that mean something (mill, hall, gallery, killbox, ambush, calm, sentry, an
arena may stack), `noFlipX`, gate rooms and the room after one, a sealed arena and its neighbours. `STACK.run` = one in a row. Corridors wider than two
tiles get no door. "Behind him" means an earlier room index, not "to the left". `GEN_RULES.stack`.

**Tables.** `placeTables` stands one table on each 2x2 of a template's `t` block (a 1-wide row or a
single `t` is one table centred on it), never off world-tile parity, which put tables a tile off their
drawing, into braziers. `tableSqueeze` refuses a table that leaves a goat-width squeeze beside a
brazier (`table.squeeze`; a lump or a clear way is fine). `GEN_RULES.tables`.
**The supper on them** (1.79, `js/scatter.js`) is render data, never the generator's: `Scatter.foodOf(p)`
lays it off a hash of the table's tile (`TUNING.scatter.chance`, `count`, `menu`) the first time it is
asked, the ritual altar never. `Prop.shove`, a flung body landing on a table (`collideEntities`), a
barrel or a crate hitting one and a blast (`Prop.explode`, `oilBurst` → `Scatter.burst`) call
`game.scatter.fromTable`; the bits live in `game.scatter.bits` (capped at `scatter.keep`), update in
`updateEffects`, draw in the ground and air passes, and a body walking through one kicks it.
Most of the cult's menu is meat (1.96: `roast`, `ribs`, `haunch`, `sausage`, `boarhead`, `stew` beside the old `leg`);
`Scatter.lay` sets dishes side by side by their sprite's width and leaves off what does not fit, and a
table spec with `dishes` (THE SHOWROOM's SUPPER row) is laid as given in `startLevel`.

**Carpets** (1.96, `layCarpets` in gen.js, `TUNING.carpet`): rugs laid in rooms, render only, on their
own RNG stream after everything else. Wholly on plain floor inside a room with a tile of floor round
them, never over grass, a grate, a fire, the milk or a barrel (`carpetFits`, `CARPET_SKIP`), under the
tables where a room has them; none in a cave or on the trip. `level.carpets` is `{ x, y, w, h, style,
seed, blood }` in tiles; `PaintedArt.carpet(c)` paints one in pixels (`CARPET_N` texels a tile,
`CARPET_STYLES`: soft dark greens and blues, which is what he asked for, 2 Oct 2026, "much softer, less
bright"), cached per carpet, and `drawTiles` lays it after the floor, so it is inside the rooms' bake and
costs no frame. **No rug under words** (5 Oct 2026): `floorWords(level)` boxes every patch of floor text (hints,
control blocks over their whole `clearFloorRow` slide, the mouse's room, THE FORK's names, the pen prompt; a
showroom label by its letters, `CARPET_WORDS`), and `carpetFits` refuses a rug within a box's margin. `GEN_RULES.carpets`.

**Combos** (5 Oct 2026, `TUNING.combos`, gen.js `dealCombo` right after `planEncounters`): `chance` of floors
deal one room as a pairing (THE THROWER IN THE ARMORY, THE HOOK OVER THE DROP, WITCHFIRE AND THE HOOK, THE SMALL
RING: a mage in the ogre's ring), only of men met on earlier floors, from its `from` floor, never in a teaching,
resting, trap or set-piece room; its men lead the room's cell, `extra` more off the budget, no clubman. Marked
`room.combo` / `level.combo`; `comboRoomFits` / `comboMet` are shared with `GEN_RULES.combos`. The dev drawer's
COMBOS tab (`drawCombosTab`, `#combos`) lists them, and PLAY (`combo=<id>`, `opts.combo` via `dev.forceCombo`)
lays one and stands him at its door; the LEVEL tab's room tile names it.

**Spawns.** `take` in `tryGenerate` keeps the best of a few dozen rolls (clear of men, props,
`room.enter`; `GEN_RULES.spacing`). Afterwards anyone `inFurniture` is walked to clear floor
(`GEN_RULES.furniture`); the sentry is exempt. Every man, milk, crate, rack, bomb and coop, the vault door
and every wall that gives can be walked to from the start (`GEN_RULES.reach`, `vault`, `secrets`; `walkedFrom`
in rules.js): cave erosion (`erodeCave`) leaves a corner square rather than cut a cell off, and a vault
or niche opens only onto the room's own floor. Nothing that can be picked up, and no milk, stands in grass.

**The first grass** (5 Oct 2026, `levelDef.firstGrass`, THE ALTAR): one bowl more in the straight run of the first corridor
past the sentry's room that nothing narrows, nothing within `heal.firstClear` tiles (`GEN_RULES.firstgrass`).
**Milk.** Count is `max(levelDef.heals, ceil((rooms - 1) / TUNING.prop.heal.every))`, one per band of
rooms (worst gap five). The tile is scored clear of furniture and flame (`GEN_RULES.milk`). Grazed, not
touched: `Prop.graze`, `heal.grazeSpeed`, `heal.grazeTime`. `kind === 'heal'` with `p.big` false is
+1 HEART; `big: true` (set only by `carveSecret`, `TUNING.secret.healChance`) is +2 HEARTS.

**Where a room may stand** (30 Sep 2026). `ROOM_LEVELS` (tuning.js): a template's `name` → one
character a slot (LEVELS in order, then THE DARK, then THE TRIP), '1' may, '0' may not; `roomAllowed`
(gen.js) filters every pool with it (a pool emptied by it falls back to ignoring it), `roomDefault` is
the habit with no string (canon's floor and the floors that know it, untagged everywhere, traps where
traps are laid). The ROOMS tab (`drawRoomsTab`, `#roomlist`) ticks it and writes it through
`/tuning-edit`. **THE ARMORY** (`ARMORY_TEMPLATE`, `tag: 'armory'`, `TUNING.rooms.armory`): set into one
ordinary room (`armoryAt`, its own RNG) at `chance` on floors its string allows, from room `from`, a mix
room or a canon room the canon can spare; role `mix`; never THE DARK (its lamps need the walls). `GEN_RULES.armory`.
It takes at most `armory.crates` (1) loose crates on top of its own two, and a grate may lie hidden under
any of its crates or stands (`spike.hidden.armoryCrate` / `armoryStand`), only on a floor that lays grates (`levelDef.spikes`; see *Grating*).
**Things that go off** (`TUNING.prop.clutter`, `activeIn`): brazier, lamp, barrel, chandelier, bomb;
barrels, the chandelier and the bomb are only added to a room under `max`, barrels in the `edge` band.
`GEN_RULES.clutter`.
**Trap rooms.** `tag: 'trap'` pool; `levelDef.traps` count, `pickTrapRooms` (never pen, set piece,
ambush, first two ordinary rooms, the last room), `isTrap`; never introduces a kind; no spike scatter. `needs: 'spikes'`
templates only on `levelDef.spikes` levels. `'S'` plate, `'B'` coals.

**The level tool.** `LEVEL TOOL` in the dev drawer (its PREV LEVEL / NEXT LEVEL rows jump a floor, `lvl-prev` / `lvl-next` in `devAction`); `dev.rules` pauses the sim, `hitDev` swallows input.
RULES (`drawRuleTab`, `game.ruleMatrix`), LEVEL (`drawLevelTab`, `roomPlan` off the generated level),
BALANCE (`drawBalance`, `game.balanceReport` over `dev.balanceSeeds`; the averaged rules live here and in
the report only). A room tile or bar opens `drawRoomSheet` (`dev.room`). `#rules` / `#balance` open it
directly. Every tab scrolls on the wheel (`dev.scroll`, `dev.scrollMax`, in `drawTool`). RULES rows are
a fixed readable height and scroll (30 Sep 2026: squeezed onto one screen they overlapped); the × at a
row's end takes a rule off the page for this browser (`dev.ruleHide`, `RULE_HIDE_KEY`; `N TAKEN OFF`
shows them again with ↺), the rule still runs in `balance.js`. Samples come from `dev.sampleSeed` (`game.rulesPage`, REROLL). Other tabs: ENEMIES, STATUS
(`drawStatusTab`), TALISMANS, FIXTURES, JUICE, MUSIC, HEAVEN (`drawMirrorTab`, `#mirror`: every
`MIRROR` rank as a button that sets it, costs, what each rank does), GOAT GRID (`js/goat-grid.js`).

### Teaching rooms (level one)

**The sentry.** `enemy.sentry` (`levelDef.sentryIntro`): `blockSpot` stones up all of `room.exitBand` but
one tile, deletes its door, stands him a step inside. `collideEntities` never shoves him; `chaseGoat`
only turns him; `idleWander` / `investigate` leave him put. `lessonIndex` keeps scatter out. His room is
`LESSON_TEMPLATE`, **four tiles deep** so every throw ends on stone, two crates in the near half,
`noFlipX`; `sentryRoomAt` = `ordinaryRooms(levelDef, n)[0]`, so the curve is unchanged. The corridor out
of his gap turns in the first tile past the wall and never runs on along his row or one beside it
(`carveCorridor`'s `turn`, 1.72), so knocked back through the gap he meets stone within
`TUNING.sentry.wallBehind` tiles from anywhere in the room (`GEN_RULES.sentrywall`).

**The ambush room.** `AMBUSH_TEMPLATE` via `levelDef.ambushAt` (room 4; in `fixedW`): 3 x 14, `noFlipX`,
both stands **always swords** (`room.isAmbush`), nothing scattered, never trap or canon, milk placed
furthest from `room.enter`, two fixed clubmen, never introduces a kind. Block 1 of the floor text.

**The ramp** (1.66–1.67, THE ALTAR, twelve rooms since 1.80): sentry; one loose clubman; `calmAt`, `CALM_TEMPLATE`,
role `calm`, lit bowls in straw and nobody (off the curve, nothing scattered, `isCalm`; the milk's
rhythm may lay a bowl there, and that is fine); the wheel;
the ambush; the middle gate, its soul carried by a keeper (`gateKeeper`, see *Soul gates*); `trapAt` + `trapTpl` `hayloft` + `trapMen` (two clubmen in straw, the one trap
room, placed not rolled); the first butcher alone, plain, no outline (`introduce` champion at 1); three clubmen (`crowdAt`, so his two rooms are
not back to back); rest (no gate, no soul); a clubman as a boss with two clubmen at his back, who
carries the second soul, three hearts (`arenas[].hp`; 2 Oct 2026: the boss butcher who ended the floor
was "a bit hard", his ring is THE YARD's room 4 now, `hp` 4, one man, no soul; the ogre is THE YARD's
last room). `surprises: false`: THE ALTAR deals exactly those two souls.

**The wheel lesson.** `levelDef.millLesson`: `MILL_LESSON_TEMPLATE`, seven tall, hub one row off the top
so only the bottom lane is clear; **two men** on the far `e` markers with `trapSense` pinned to 0 and 1
and `noticeFor` (`TUNING.ai.millNotice`). `noFlipX`. Both hold their marks, no sight, noise or
wander, until the goat is inside the room's box (`e.millOpen`, 1.72): nobody rides the arm unwatched.

**Words on the floor.** `CONTROL_LINES` (`render.js`), placed by `level.controls`, never in an empty room:
0 `WASD - MOVE` in the pen above `cagePrompt`; 1 grab/throw in the ambush; 2 the headbutt, one line,
on the sentry's floor (`lessonRoom`); 4 `SPACE - BAAH` on THE YARD (`levelDef.teachScream`: its first
ordinary room with two men or more, `GEN_RULES.screamlesson`); 3 `E - ROLL` only: `hints.rollInset` tiles inside the door of the
room that introduces `levelDef.rollWith` (THE ALTAR: the first butcher, whose hook is the first thing
worth rolling out of; 26 Sep 2026), else the first eligible room walking back from the
first arena (not lesson, vault, trap or ambush), with a fallback. Keyboard and touch wordings for each.
`GEN_RULES.lessons` (which also holds the `rollWith` room and its door). A level `hint` spans its first room (`drawHints`, `wrapFloor`, `fitFloorText`);
The `hintKey` line under it is no longer drawn (1.72); the LEVEL tab lists every floor's hint.

**The pen.** `cage` props from `buildCage`. `prop.cage.hits` (7) first time a browser does it, then
`againHits` (2); `game.penBroken` / `PEN_KEY` / `game.notePenBroken`. Blows counted by
`game.cageLunge === goat.lungeId`; `prop.cage.strain` lines, `stunAt` blows call `game.stunGoat`; the last
sets `game.cageOpen`. Straw inside is tiles (`hh` in `START_TEMPLATE`) because `cleanProps` clears props
near the start. `startCage` levels only. The dead cage: `buildCage(..., deco)`, `TUNING.prop.deadCage`,
contents by `paintStartRoom`. The ritual altar is a real `table` Prop with `isAltar`.

### Rooms that lock

**Soul gates.** `levelDef.gates`: one rest room in the middle (`REST_TEMPLATE`, role `rest`, off the curve, out of
`ordinaryRooms`), and `levelDef.rests` one before the end with no bar and no soul (every floor since 26 Sep
2026: "a soul twice a level, in the middle and at the end", the second is the last boss's). Never the last room, a set piece, the vault's room or a teaching room. Soul on the floor
via `placeSoul`, or, on a `levelDef.gateKeeper` level (every floor since 1.73; never the mouse's gate), in a **keeper**: a `keeper` bearer
spawned on the soul's spot, ensouled with his kind's hearts + `soulKeeper.hp` (two, 2 Oct 2026: a corrupted clubman has three), `soulKeeper.speed`, his
swing lighting witchfire where it lands (`Enemy.keeperFire`) that he reads no better than a clubman reads a
brazier, no `fireCare`, his own rolled `trapSense`, so he walks into it and burns (26 Sep 2026); `bossPrize`
drops his soul tagged `e.soulGate`. Placed, off the curve; `GEN_RULES.soulgate` requires exactly him. `gateSpot` narrows the exit and hangs a `gate: true` door with no hit points (`smash`
returns, no shouldering). Only `game.openSoulGate(room)` opens it: the soul pickup (`soul.gate`, its own
gate only) or `Shop.buy` / `Shop.takeMilk`. `narrowExit` walls only the straight run, never the
corridor's turn (walling the turn failed seeds). `GEN_RULES.soulgate`. Keeping is `game.keepGate(e, room)`.

**The mage at the first gate** (1.75, `levelDef.blessGate`, THE ALTAR only; `TUNING.bless`, `BARKS.bless`).
That gate's man is only promised his soul (`e.blessing`): a plain clubman holding his mark in `Enemy.update`.
`game.watchBless` starts the scene the frame the goat is in the room's box: a `scripted` seer with her
under his arm (`underArm`, the intro's carry) turns at her bleat, speaks, sends the soul over
(`b.wisp`), `blessNow` → `keepGate` makes the man the keeper, and the mage runs `blessWay` through the
gate (its `open` driven by hand) and is removed as it seats. While `game.bless.on` the play update runs
only `updateBless` (the clock too is stopped); `endBless` is the one exit, played out, skipped (a click,
once `BLESS_KEY` is set) or capped. **The soul must come out of him whatever happens first**: touched
before the scene (`watchBless` sees his state move) he is blessed with no scene, and a killing blow
before it calls `blessNow` from the top of `Enemy.die`. Drawn by `Renderer.drawBlessWorld` / `drawBlessOverlay`.

**The way out is a soul gate** (1 Oct 2026, `TUNING.soul.exitGate`): `tryGenerate` asks `soulPlan` whether the last room holds a boss carrying a soul and then makes every stair door of the floor a `gate` (`exitGate`, `gateRoom` the last room), `level.exitGate`, and `startLevel` tags that boss's soul with it (`soulGate`), so swallowing it lifts the door (`openSoulGate` breaks every `exitGate` door). It is the last entry of `game.soulGates` (`exit: true`; the horse's race skips it). With nothing left to lift it (no soul on the floor, nobody carrying one) `updateClearDoors` lifts it. `GEN_RULES.exitgate`.

**The sealed arena.** `{ at, boss, sealed: true }` on `arenas`; `seal: true` doors both ends
(`sealedArenas`, `GEN_RULES.seal`). `game.updateSeals` alone: open → slam a tile inside (`game.inRoom`) → break when the
men in it are down. Load-bearing:
- **The doors must start open**: a seal refuses `smash` and `openPressure`; shut on frame one the level
  cannot be finished.
- **It waits on `s.held`**, who was in the room when it shut, not the spawn list.
- **Nobody it waits on may leave.** `game.sealHolding(e)`; `blink` refuses spots outside the room, and a
  held man more than a tile outside stops counting.

**The clamp.** `game.updateClamps`: rooms two+ behind `game.goatRoom` with nobody alive are sealed,
`room.exitMouth` back to `T.WALL`, contents gone, room dark (`room.clampAt`, `drawUnseen`, `game.hidden`,
`drawVeil`, `TUNING.clamp`). A body in the mouth only delays it. `GEN_RULES.clamp` floods round each
stoned mouth; `carveSecret`, `carveVault` and wide `carveCorridor` guard the leaks it found.

**Doors that open for you.** `fromRoom` iron, stair and clock doors swing open (`open`, never `broken`) when that
room's men are dead (`game.updateClearDoors`; not gates, seals, vault); a plank door stays shut to be broken (26 Sep 2026).
A clock door that has seated is leaned open by the men behind it like plank (`openPressure`, `clockRoom >= 0`; 5 Oct 2026). Butting a soul gate lays a violet trail to what opens
it (`game.guideTo`, `drawGuide`, `TUNING.soul.guide`). The **clock door** (`prop.door.clockFor`,
`levelDef.clockDoors`, level three on) stands open (`open` 1), shuts on `clockEase` at 9 s =
`score.perRoom`, never on a body, lights itself while counting, and `gen.js` removes it from rooms with
fewer than two men, that introduce a kind or follow one, or whose door is more than `clockReach` tiles'
walk from the way in (`walkTiles`). In THE DARK a counting door is a light (`Dark.sources`). `game.clockTold`, `GEN_RULES.clock`.

**Door kinds.** An open door (`open` > 0) is drawn swung on its hinge and folded along the corridor
wall (`Renderer.doorSwing`, asked of the tiles once), never turned about its middle. `prop.door.hits` 1 (plank), `ironHits` 3 (`prop.iron`, `levelDef.ironDoors`, none on
level one, refuses `openPressure`), `stairHits` 3 (`stair: true`, every level's exit), `vaultHits` 4;
`prop.gate` none. Collision and `Goat.headbuttHits` treat a door as a rectangle (`prop.door.r`,
`prop.door.thick`), not a circle; it reaches `prop.door.reachSlack` further, from a wider cone.
**A shut door kills like a wall** (26 Sep 2026, `collideEntities`): a flung body arriving as hard as a
wall would kill him at (`splatLimit`; thrown, the wall's own rule, `thrownKill` out of the mouth, any
touch otherwise) dies on it and the door takes the blow too (`smash`, so a plank one breaks under him).
Slower, it is as before: past `door.smashSpeed` a plank door breaks and he goes on through alive.

**The vault.** `levelDef.vaultAt`; `carveVault` cuts 5x5 above/below, opens **two** tiles (rock and
wall border), hangs an iron `vault` door (`vaultEmpty`: drawn plain) and returns the chamber's `box`.
**Never a soul** (26 Sep 2026): big grass, always. `vaultKindOf` (gen.js, its own RNG off the seed,
`TUNING.vault.kinds`) makes it `grass` (the door shut, `vaultHits`), `ambush`, `mages` (only once
`met` has the seer) or `ogre` (only once it has the ogre); never on THE TRIP. **The ogre's vault** (1.85,
`TUNING.vault.ogre`): the door stays shut and gives in `hits` (`door.needHits`); `startLevel` sits a boss ogre
on the grass (`e.caged` = the door: `Enemy.update` holds him until it breaks, then he wakes on the goat) and
`updateVaultOgre` leans on the door now and then while the goat is near, the one tell. A trap vault's door starts open; `game.updateVaultTrap` slams it
(`seal`) once the goat is `shutIn` tiles inside and has eaten the grass (2 Oct 2026), `vaultAmbush` puts the men down (by a wall: stone
bursts; otherwise dropped from above, dazed `land` s), and it swings open when none of `held` is left
in the box (the seal's rule). `sealHolding` answers a trap's men with `{ box }` so a mage never blinks
out (`game.inSeal`). `GEN_RULES.vaultkind`.

**A wall that gives.** `carveSecret`: a two-tile niche behind an ordinary room's top/bottom wall, once or
twice (`TUNING.secret.chance2`), rack plus maybe big grass, solid rock only; `levelDef.secretsAfter` (a room index)
on level one. Prop `kind === 'secret'`, `Prop.crackWall`, `TUNING.prop.secret.hits` (2), room
`wallColor`. **Until broken the niche is `T.WALL`** in `World.tiles` (a copy of `level.tiles`) and hidden
(`game.niches`); broken, `nicheTiles` stay lit. `Renderer.wallCrack` is the one crack. `GEN_RULES.secrets`.

### Perception and AI

**Enemies.** One `Enemy`; `kind` `bearer`, `hunter`, `dog`, `seer`, `butcher`, `wraith`, `ratogre`,
dispatched to `updateBearer` … `updateOgre`. Shared machinery above the dispatch. Bosses: `boss`
(`elite` rides along on every boss but the ogre; nothing but old tools reads it).

**Nothing simulates two rooms away.** The enemy loop skips anyone whose *current* room (`roomAt`; in a
corridor `game.nearestRoomIdx`) is two+ from the goat's. Never use `e.room` for this, it stays "who he
was put with" for seals and gates. `e.woke` is set once he is within `ai.wake` of the view (or held,
flung, burning); until then he does nothing.

**Turns.** A walking man turns wider than `ai.turn.angle` at most `ai.turn.perSec` (3) times a second
(`Enemy.limitTurn` from `moveToward`; not hounds, who have `stride`); getting out of a hazard he stands in is never held.

**Patrols.** `idleWander` leashes to `Enemy.home` (`TUNING.ai.leash`), idle only; new facings resample
against a `TUNING.ai.wanderClear` probe.

**Routes** (`TUNING.ai.path`). `chaseGoat` walks `Enemy.pathDir`: `pickWaypoint` follows a field
`ahead` tiles and heads for the furthest point `bodyClear` passes (middle + shoulders vs stone/holes,
whole width vs blocking props; shut doors excluded, they are shouldered). Three fields, rebuilt together
every 0.15 s: `world.flow` (stone and holes only, **everything else that asks "reachable?" reads this
one; keep it that way**), `world.route` (also steps round `world.furn`, laid by `World.setFurniture`),
and `world.routeW` for bodies `>= path.wideR` (Butcher, rat ogre), numbered on **grid corners** with
four open tiles round them (`World.corner`, `Enemy.wideWaypoint`), a tile-based wide field still took
him through offset one-tile pinches. `routeW` only fills while `world.wideWanted`. Wide bodies meet stone at `Enemy.wallR`
(`path.squeeze`, 15 px, every `World.collide*` reads it) so they squeeze through the one-tile way out
of a gate or seal, which `routeW` never numbers; men and the goat still meet them at `r`. `Enemy.unstuck` is
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

**Stealth, a test behind the dev drawer** (3 Oct 2026, two playtesters asked for it; `TUNING.stealth`,
STEALTH (ALT) in the drawer, `game.dev.stealth`, kept under `STEALTH_KEY`, never in the itch build). ALT
held is `game.sneak` (keys and mouse only; **a new input, against rule 1, on purpose while it is a test**:
if it stays it is folded into an existing verb or decided as an exception): `speed` of the stride, no
run-up, no footsteps, crouched (`goat.sneakK`). With the test on a running hoof carries `stealth.step` tiles,
a man who loses sight of him inside his beat of doubt (`noticed`) goes to look instead of chasing, and a
headbutt on a man who had not seen him (`!e.aware`, or `Enemy.spotT` at or after `goat.buttT`) is ×
`stealth.knock`, keeps him down × `stealth.floor` (`e.floorMul`, cleared by every `fling`), says `UNSEEN`,
and a hound cannot slip it. While he sneaks `Renderer.drawStealth` lays every unaware man's sight on the
floor in cells (`sightPoly`: the cone cut by `game.sees`, kept on the man while he stands; `drawSightCells`:
scanline fill and a rim), under the unseen rooms and THE DARK. His ears are not shown to the player ("you
are silent anyway"): HEARING puts `step` round each man, VISION draws the cells for everyone. The second
pass (same day): crouched he is seen at `stealth.sight` of a man's range (`canSeeGoat` and the cone); the
beat of doubt is `stealth.notice` (`e.noticeDur`), a `?` over the man filling amber to red, then `!` for
`stealth.alarm` s (`e.alarmAt`, `drawOverhead`); an idle man turns to look into his room (`Enemy.openFacing`)
and one with his nose to stone looks round after `idle.wake` s. A thrown crate breaking is `noise.smash`
where it lands, so it already draws every unaware man in reach to look: the distraction needs no code of
its own. With the test off nothing here runs. The third pass (5 Oct 2026 playtest): ALT is a switch
(`Game.toggleSneak`, `game.sneakOn`; `game.sneak` is what reads it), and a fight ends it: an aware man past his
doubt seeing him, a heart lost, a blow traded with a man who knew he was there all call `Game.breakSneak`
(`SPOTTED`), which shuts it for `stealth.deny` s from the last of them (`sneakDenied`, a draining amber ring of
cells round his feet). While he sneaks an unaware man turns at `stealth.turn` rad/s (`Enemy.act`, `idleAng`
keeps the heading he chose); `Enemy.sightRange` and `Enemy.screenAt` (crates, boulders, barrels, and tall
grass past `stealth.grass` tiles) are asked by both `canSeeGoat` and `sightPoly`; a man who walked to a noise
looks round (`stealth.search`, `e.searchN`) and walks home (`e.homeward`); in THE DARK his sight is
`stealth.dark.sight` of the dark's and his ears `dark.ear` ×, and the cells go over the dark (`drawStealth(game,
true)`) for men he hears or the light shows. The score hushes (`audio.layers.hush`, `GameAudio.hushMix`). Not
the test's: a man walking to a noise (`investigate`) or home in a straight line through a boulder is no longer
pinned for good (`ai.investStuck`, `freeHeading`).

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

**One rule for every kind** (1.72, `TUNING.boss`). Without the outline a man has one heart, whatever his
kind, except the butcher, `champion.hp` (3), the Seer, `seer.hp` (2, back since 26 Sep 2026), and the shieldman, `shieldman.hp` (2, 2 Oct 2026; drawn × `shieldman.scale`). A boss (`e.boss`, `Renderer.isBoss`: never the
rat ogre) comes in two (2 Oct 2026): with no soul he is a **champion**, his kind's own hearts plus
`boss.champHp` (1) and nothing else, outlined yellow (`outline.color` over `back`); with a soul in him
(`e.soul`: `game.ensoul`, every gate's keeper, the last boss whose soul is the stairs' gate) he is the
strong one, `boss.hp` or his own if more (`ensoul` raises it) plus `soulBearer.hp`, outlined violet
(`outline.soul` over `soulBack`) and lit violet (`SOUL_HAZE`), so the room before a soul door is always
violet. The ogre, boss-only, keeps his own `butcher.hp`. Drawn × `boss.scale` on top of his kind's sheet fit (`Renderer.bodyScaleOf`, which
THE DARK's eyes share); `Renderer.bossOutline` lays his own body as a flat silhouette
`outline.px` out on eight sides via a canvas shadow (one exact colour, blur 0) so it is hard pixels,
never a glow. Set in `startLevel` off the spawn's `boss`. A soul only ever goes into a boss.

**Two hits.** `hp > 1` (a boss, a soul-bearer, the rat ogre) absorbs a killing blow in `die()`: floored, one lost,
up again (a boss Seer blinks). Fire counts. `'fall'` skips it. A bomb charge is an ordinary hit; a
headbutt gives a fresh fuse and resets `exploded`.

**Rifle.** `sfxCock` on aim (`hunter.cockHear`, not from fog). Inside `wildNear`, `wildChance` of shots
stray by `wildSpread`. `friendInLine` within `friendClear` → `stepOff`; beyond, friendly fire is intended.
`drawAimTelegraph`.

**Hound.** `kind === 'dog'`: `sfxGrowl` / `sfxBark`; TOO QUICK to grab, or with BY THE COLLAR
`Enemy.hopBack` (`dog.hop`) spends the grab. `tryDodge` (never mid-run): once every `dog.dodgeCd` (10) s
a hound slips a headbutt for sure (`dog.dodge`, the chance when ready), and the slip puts `lungeCd` back to
`dodgeRest` (30 Sep 2026; it was a 38% coin with 1.2 s between). orbit → `windup` →
`dart` → `recover` (a skid, `dog.skid`) → `retreat` (a break away round the ring, `breakOut`);
`planDash` draws the bent run (`drawDashPaths`, `dashSkew`, `dashTurn`), ramped from `dashStart` over
`dashRamp`. The run and its line share `Enemy.runStep`: homing only while the goat is ahead, the
`Enemy.clearAng` whisker bent no faster than `whiskTurn`, over `overrun` tiles past him; walls end
it. **He has legs** (1.65): every `moveToward` of a hound goes through `Enemy.stride`, a heading and a
pace (`runAng`, `runSp`) turned at `dog.turn`, slowed through a sharp turn (`turnSlow`), `accel` /
`brake`, and his `facing` is his body, where he runs; `canSeeGoat` gives an aware hound no cone (eyes
on the goat). Whatever else sets his velocity (a run, a hop, a blow) is picked up the next time he
strides (`strideAt`). `lungeCd` is set at the plant and again at `dashEnd`, and `ringHold` s on the ring
come before the next plant. `packBusy()` = one at a time. `daze` × `cfg.dazeMul`, cancels a dart.
`game.houndSeen()`. **Onto the horns:** his bite reaches further than the goat's head, so in `dart` he
holds the bite while the goat is in `lunge` aimed at him (`onHorns`) and `headbuttHits` flings him the
frame they meet; a lunge early, late or wide is spent and he bites. No line to the goat, or further than `circle * ringIn` (`* ringOut` once on it,
`e.ringing`): he runs the route, not the ring. `closing` is a slope, not steps. `flipGap` damps the
ring's turn-round; `sideHold` is the least between two wheels; `ringMate` circles him away from a
packmate nearer than `mateArc`; a hazard under his windup cancels it. Measure changes with
`tools/hounds.js` (1.65: reversals 3–10/s with a pack → 0, sliding 25–40% → 0, routes unchanged).
The pixel hound has no stride: running he bobs (`dog.gait`, `dog.bob`, `PaintedArt.character`).

**Seer.** Witchfire burns him (deliberate); he gets near-perfect `trapSense`, `seer.fireCare`, and
`blink` refuses burning, pit, hazard or out-of-seal spots, anywhere within a tile and a half of a door, and
anywhere the goat cannot see (1.85: a blink onto the stairs' gate tile put him behind the bars).

**Ogre** (kind `butcher`, named OGRE in every text since 1.66). Not the rat ogre: his own body,
`js/ogre-pixels.js` (`OGRE_PIXELS`: a cult ogre on the `PROP_PIXELS` `Grid`, five views mirrored to
eight, a stride, fists `up` through `slamwind` / `hopwind` / `hop`), key `ogre` in `characterKey`,
× `butcher.scale` (1) × `boss.scale` (`Renderer.bodyScale`). `Enemy.fling` refuses him and a headbutt staggers him
where he stands: nothing throws the ogre, which is what tells him from the butcher. No swing. Seen `leap.min`..`max` tiles off, off `slamCd`: `hopwind` → `hop` → `hopland`, the rat ogre's
`hopSpot` with `leap.short` 0 (on the goat's spot) and `leap.over` (flies over drops; `Enemy.update`
spares `state === 'hop'` from the pit, `collideEntities` skips him, the horns miss him). Within
`slam.near`: `slamwind` → `recover`. Both land through `Enemy.quake` (ring: the goat hurt and
thrown out; his own men in it untouched). **The horns do nothing to him** (1.71, `butcher.hornsHurt`): a butt bounces
the goat off, no stagger; blades, fire, bombs and thrown bodies take his hearts, so every ogre arena is
`OGRE_ARENA_TEMPLATE` (two braziers, three stands all swords; the first of a run, THE YARD's last room,
the floor whose `met` has no `butcher` yet, is the wide `OGRE_FIRST_TEMPLATE`),
held by `GEN_RULES.ogre`. `daze` / `balk` break the crouch, never the leap.

**Butcher and soul-bearers.** The BUTCHER is the brute renamed (1.72), every player-facing string
says BUTCHER; the code keeps `champion` (a `bearer` with the flag, `THREAT.champion`, `TUNING.champion`)
and the run code's killer token `brute`, because kind `butcher` is the ogre (shown as OGRE). Three hearts
(`champion.hp`) off a ring, four as a boss. `Enemy.unliftable` (ogre, champion, soul-bearer), TOO BIG / THE SOUL
HOLDS HIM. `Enemy.atk(key)` reads `TUNING.champion` first; `knockMul()` = `cfg.flingMul` ×
`champion.flingMul` × `soulBearer.flingMul`; `Enemy.splatLimit` scales `splatSpeed` by it (or a
soul-butcher is unkillable). The butcher wears the old `butcher` sheet and has **the hook** (30 Sep
2026, in place of the 1.66 charge, which furniture and pillars kept stopping; `Enemy.hookStep` from
`updateBearer`, never a `sentry`; `champion.hook`): walks, swings close, and `min`..`max` tiles off with
a line clear of stone and `stopsBullets` props (`hookLine`; his own men never block it) and off
`hookCd`, he plants (`hookwind`, `wind` s; `Renderer.drawHookLine`, a thin amber dashed line to the
landing) aimed by `hookLead` into `e.hookAim`, the goat's own velocity × the flight time, whole
(`lead` 1, capped `leadMax`), so running straight is caught and only a real turn after the throw slips
it. `hookthrow`: `e.hook` flies at `speed` (thrown: no SLOW) `over` past the aim, stopped by stone and
`stopsBullets`, passing men; catches the goat within `catchR` (`Enemy.hookable`: never mid-roll, never
while `invuln`), a loose crate or bomb, or a crate held toward him (torn out of the mouth). A shield
facing him turns it (`blockBlow`, no stagger). Caught, the goat is `stunned` with `goat.hooked` =
him and `Goat.update` drags him at `pull` (`hookpull`) to `stopAt` inside club reach, `pullMax` at most,
then `daze` s more while the butcher goes straight into his ordinary `windup`. The hook does no damage
(pillar 3): the club does, and whatever the rope drags him over. A miss is reeled (`hookreel`, `reel`)
then `recover`. Anything that knocks him out of those states drops the rope (`dropHook`, checked at the
top of `Enemy.update`; `daze` and STUN+POISON call it). The rope is `Renderer.drawHooks`.
`game.ensoul(e)` is the only way to set `e.soul` (`soulBearer.hp`), and it is only ever called on a
boss, who already wears the outline; he is lit too (amber haze, ring, red eyes), a label only.
**Neither stands for being butted over and over** (3 Oct 2026, `champion.shove`, `Enemy.shoveBack`, asked by
`headbuttHits` before the throw, a clubman only: the butcher and any bearer with a soul): butts landed inside
`window` s are counted, the n-th is answered at `odds[n]` (0, 0, ¼, ½; a shove starts the count again), and he
is up at once and shoves the goat off (`speed`, `daze` s stunned, no heart; drawn leaning in for `lunge` s,
`BARKS.shove`). Rule 4's exception, on purpose: a reflex with no windup, but it costs nothing.

**Shieldman** (1 Oct 2026, `TUNING.shieldman`). A clubman behind a board: the pseudo-kind `shield` in `THREAT`,
`ENCOUNTER` (weight 1, cap 1 a room) and `LEVELS` (introduced alone on THE THRESHING FLOOR and THE DARK, then in
every later pool), spawned by `spawnKind` (gen.js; `threatKind` and rules.js `kindOf` read it back) as a bearer with
`s.shield`, and `Enemy.giveShield` (`e.shield = { uses, jolt, ang }`, `e.shieldman` for good, `speedMul`).
`Enemy.update` is now `act` plus the board's weight: whatever way a step wanted him to face, he turns there at
`turn` rad/s (× `poisonTurn`, 0.15, poisoned: that is when he is walked round), so circling, a roll or LEAPFROG
reach his back and a swing wound up one way goes that way.
`shieldUp` (not dazed, floored, staggered, stunned, flung, held or alight) and `shieldCovers(x, y)` (within `arc` of
his facing) are what every reach asks: the horns (`headbuttHits`: **the spikes**, 2 Oct 2026, `shieldman.spikes`: the
goat loses `hurt` hearts and is thrown off at `bounce`, the bone wears `wear` (0) uses), a round,
a thrown crate or arm (`hitMan`), the carried sword (`cutWith`), BY THE COLLAR's teeth (`tryGrab`, `closeBite`: GO
ROUND THE SHIELD), a LIVING SHIELD club (`meleeHit`), and a flung body (`Game.flungHits`: the board is a wall to it,
the wall's own kill rule). `shieldTakes` spends a use and rocks him back into `braced` (the board still up; it
shares the floored branch's countdown), and the last use breaks it (SHATTERED). Dead with uses left he drops it as a `weapon`
shield (`dropShield`), not off a fall, a fire or a blast. Drawn by `PaintedArt.board` inside `character` (sprites
`mshield<look>-f/-s/-b`, `BOARD_POSE` per facing, under him on the back views); down (`!shieldUp`, eased on `sh.low`)
it hangs `low` px lower at his knees a quarter turned. **He is a fat Spartan** (2 Oct 2026): his own body, `characterKey`
`spartan` → `SPARTAN_PIXELS` (js/spartan-pixels.js: belly out, a small helmet and crest, stubble, red cape, hairy
legs, no club), the board on his right arm the skulls of different beasts riveted together (`SK` in js/prop-pixels.js: goat,
bull, ram, boar, stag), one of three designs, `ART_PASS.shield` (MENAGERIE, STAG AND BULL, RIVETED; the ART tab's
SHIELD button). **His leap** (`bashStep`,
`shieldman.bash`): `bashwind` (amber strip, `drawBashLine`; `daze`/`balk` break it) → `bash` along his facing (the
goat met: `damage` and a shove through `blockBlow`; his own men bowled; stone dazes him) → `recover` with `bashPlant`
(no turning). Dead, his skulls are a `weapon` shield with `p.skulls`: carried as a shield, thrown they kill (`hitMan`). Killer token `shield`, SHIELDMAN.
Up close he rams the board (`shieldman.strike`, read by `Enemy.atk`: the clubman's wedge, his own timings; `PaintedArt.board`
draws it drawn in through the windup and out `thrust` px in the swing). His spikes cost a heart only on a boss or a soul-bearer;
an ordinary one throws the goat off stunned (`spikes.plain`, the ogre's rebound). The board he drops has `shieldman.drop` uses.
Every stub that draws him must carry `shieldman` as well as `shield` (`characterKey`), or he is a clubman holding a board.

**Thrower** (3 Oct 2026, `TUNING.thrower`, js/thrower.js, js/thrower-pixels.js). A clubman with one arm grown on the
green: the pseudo-kind `thrower` in `THREAT`, `ENCOUNTER` (weight 1, cap 1) and `LEVELS` (introduced alone on THE BRIDGE,
then THE RAFTERS and THE OSSUARY), spawned by `spawnKind` as a bearer with `s.thrower`, `Thrower.give`: `hp` 3, `flingMul`
like the butcher's (`knockMul`), `unliftable`, his fist through `atk` (`thrower.fist`). His states live in `Thrower.step`
ahead of the club in `updateBearer`: `twgo` (to the thing `find` picked in his room within `seek` tiles: a crate or a bomb,
a clubman or a hound of his own, an animal of the goat's but the horse and the crow; given up after `give` s), `twlift`
(the windup), `twcarry`, `twaim` (the amber line, `Renderer.drawThrowLine`), then `release`: a prop flies with `byCult`
(it meets the goat: `thingHitsGoat`, `hit` hearts; it never meets him), a man as a thrown body with `tossBy` (the wall
kills him; meeting the goat costs a heart, `manHitsGoat` in `collideEntities`), an animal in `game.tossed` (`Thrower.fly`,
held so its own step stays off it). What he holds is `e.carry`, kept on his fist each step (`hold`, `HOLD`); out of the
carry states or alight it comes down (`Enemy.act`, `Thrower.drop`: a crate on his head, `drop` s of daze). Close up,
`twgrab` (the wedge laid like a windup; the roll and i-frames slip it) → `twhold`, the goat `carried` over his head while
he turns to `pick`'s direction (a drop before fire before a grate before stone hit faster than `grab.hurt`) → `toss`: the
goat `tossed`, his own step (`goatStep`), and only what he meets hurts (`goatHits`: stone, a shut door or furniture past
`hurt`; the drop and fire by their own rules). Killer token `thrower`, THE THROWER. `GEN_RULES.thrower`: his room
holds `ammo` crates or bombs (gen.js tops it up on its own stream). **`held` is not "in the goat's mouth"**: a man
over the thrower's head is `held` too (`liftedBy`), so anything that takes a man out of the mouth asks
`goat.holding === e` before emptying it. The goat `carried` is in the air: grates, teeth, the wheel and furniture skip
him. A daze makes the thrower let go; a thrown animal stops at a shut door (`Thrower.doorAt`).
A body on the floor (`CombatFX` ground, its `key`) is ammo too: `Thrower.bodyProp` makes it a SPADE-style `corpse` crate
(`fromGround`, drawn by `Talisman.drawCorpse` after him, `lit` the dead man's own sprite over his head) and `corpseGone` lays it
back on the floor. Whatever he throws that lands costs a heart and `thrower.stun` s (`Thrower.hitGoat`); a crate alight lights
the goat's tile. On an errand or laden (`Enemy.laden`) he steps round every grate and never blunders; dead, `thrower.acid` tiles
of poison. SPAWN in the dev drawer: THROWER (BANE).

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
`hopZ`) → `hopLand` (`hop.radius`, `drawHopMark`). Pinned after the goat, he bounds down the flow field
first (`Enemy.flowHop`, tile centre to tile centre, the only way through a one-tile gate mouth), then
the fan of bounds round the line. `game.ogreHits`, `doomed`, `flungBy`.

**Killbox.** `levelDef.killboxAt`, `KILLBOX_TEMPLATE` (`noFlipX`), cell from `ENCOUNTER.killbox`; the first
`cell.alert` are `watchful` (`cfg.sight + cfg.watchSight`, no cone, hold post). Only once rifles are met.

### The goat's verbs

**Two buttons start half-shut**: the progression; do not undo it. No `mods.grabMen` (BY THE COLLAR):
`tryGrab` ignores men (`game.reachedForAMan`). No `mods.screamStun` / `breath`: the scream is a `lure`
to `scream.call` and inside `scream.balk` breaks a committed blow (`Enemy.balk`, `balkStun`) except a
Butcher in the air or a manifesting wraith. The bare headbutt is blunt until LONG HORNS / IRON SKULL.
`openBoonChoice` deals active and passive strictly in turn after the first soul (1.97; the 0.75 lean toward actives while a button was half-shut dealt two skills running), and a browser's first run finds HUNGRY SOUL on its first passive deal.

**Boons.** `applyBoons()` rebuilds `game.mods` from `game.boons`, **actives first, then passives**
(an active that sets a cooldown outright used to wipe a passive's halving taken before it); use sites
read `game.mods`, never mutate `TUNING`. New boon: `BOONS`, `BOON_BASE`, the use site, a `desc` of one
or two short lines of what it does for the player, no story, no timings, one number only when it is the
point ("You run 13% faster"), and then a getter over `this.params`, never typed, and a `stat(p, b)`
with the full numbers off `p` / TUNING (`sayN`, `sayPct`, `sayTimes`, `sayPoison`) for the dev drawer
only; `skill` hangs it on a button; `needs` gates the
deal. `synergy` / `addition` on a boon are marks for the BOONS tab only. `BOON_SLOTS` (one active + two passives per button, four body); `game.boonOpen` is the one deal
test; `key` boons count against nothing. The body souls are shown in the book's BODY row only (2 Oct 2026; `drawBodySouls` is no longer called). **A full slot is a swap, not a heart** (26 Sep
2026): `game.boonSwaps` pairs every card shut out only by its slot with one boon in that slot;
`openBoonChoice` deals them where the open cards run short (`game.boonReplace`, parallel to
`boonChoice`), the card says `INSTEAD OF`, and `takeBoon` drops the old one first and pays no `heal`.
The silent +1 heart is left only for a deal with nothing at all to offer.
**Two cards, a third earned** (30 Sep 2026): a soul deals `BOON_CARDS` (2). `mods.thirdEvery` (n: every
n-th soul) deals one more, HUNGRY SOUL (`hunger`, a body passive, every soul) or THE KNUCKLEBONE
(`knuckle`, a talisman: every 3rd / 2nd / every soul by tier), the more generous wins, counted in
`talRun.third` (so a death rolls it back with the rest of `levelTalRun`); `game.boonThird` names whose
it is and the card says `THIRD CARD · <name>`. The chip shows the bone's count as pips.
**Element sets** (30 Sep 2026, `BOON_SETS`): a boon's `element` (`fire`: breath, charge, kindling,
ember; `poison`: splash, venomjaw, venomroll, spit) is counted by `Game.applySets` inside `applyBoons`.
`step[0..n-1]` summed is the grace, in seconds: `mods.fireGuard` on the fire tick's interval (`Goat.update`, ordinary
fire only), `mods.poisonGuard` on the puddle ring (`Status.goat`). Fire's steps are 0, 0, ½, 1 (3 Oct 2026:
immunity at four was "a skill with no risk"), so its fourth is `burnMul` (`world.burnMul`, `World.ignite`, never
witchfire) and no `fireImmune` (`immune: false`); `poisonImmune` + `poisonHurts` (a poison's
onset is a `die(game, 'poison')`, once, `Status.poison`). The card's footnote says only what that card adds
(`gain(step)`, or `whole` for the fourth), never a count; the fourth taken floats `whole`. Stun is the parked third set (BACKLOG).

**The skill rail.** `drawSkills` is the only report of the verbs; `skillIcon` must change when a boon
lands, it draws `SKILL_ICONS` (`js/skill-icons.js`, pixel pictures per verb and active soul, a mark
per passive) and falls back to the old strokes. The rail is bottom right (`renderer.railLow`; top
right on touch), its notes open upward; the dev drawer is bottom left. Chips are `32 × TUNING.hud.rail` and
carry nothing else round them (2 Oct 2026: the small soul marks under each chip went, the picture says it; the
book lays every soul under the part of him it changes, HORNS, TEETH, LEGS, THROAT, BODY, in its slots I, II, III with the empty ones drawn, `Codex.drawBook`; I opens the book over the soul's cards too, `pausedIn` hands them back). Chips show the key; `drawSkillNote` (`renderer.skillHover`) the name and a
mod-aware `note`, plus, only while the dev drawer is open, a `stat` line of the verb's numbers as
`game.mods` has them now (`wrapFacts` breaks it between facts). The card (`drawBoonChoice`) shows the
name and `desc` (and its footnotes: the set, the third card) only, and grows to fit the wordiest card. HUD
size: `renderer.hs` = `ts` × `TUNING.hud.scale`.
The dev tool's BOONS tab (`drawBoonsTab`) is read off the same BOONS entries and nothing else: the
verb's picture with the soul applied, the slot it takes, its set, `desc` whole and `stat(p, b)`.

**Timing.** Headbutt has no cooldown (recovery is the cost); `goat.grabCd` on every release, set only
through `Goat.spendGrab(game, man)`, a man costs `grab.manCd` × a thing, however he left the mouth,
and `grabCdMax` is what the rail drains against; roll its own. A lunge that hits stone calls `headbuttHits` before ending, or flush doors could not be hit.
`goat.state === 'stunned'` is real (`game.stunGoat` only). A headbutt pressed while busy, or a roll
pressed before it can go, is kept `goat.buffer` s (`buttBuf`, `rollBuf`) and spent the frame he is
free, the recovery is still eaten whole; a headbutt pressed while idle is never kept.

**Roll.** Born in full (`BOON_BASE.roll`); DEAD WEIGHT = `mods.rollStun`. `Goat.rollDirection` scores 24
angles. Distance is `roll.speed` × `roll.duration`; tune speed, not mercy frames. The stagger after it
(`rollrecover`) is `roll.recover` s at `roll.recoverMove` of a stride, 0 since 26 Sep 2026, he lands on
his feet at `roll.land` of the tumble's speed, and landing zeroes `goat.runT`, unless SPRING HOCKS (`mods.rollKeep`,
1 Oct 2026) lands him at `keep` of it with the run-up kept. LEAPFROG
(`mods.leapfrog`): `Goat.leapTarget` / `leapLands` turn a roll at a man into a vault (`goat.leap`,
still state `roll`, the roll's own i-frames only); while `goat.leap` is set `collideEntities` skips
the goat and no hole takes him, so **anything that ends the roll must end the leap** (the guard at
the top of `Goat.update`). `goat.rollCdMax` is what the last roll cost, for the rail.

**COLD EYE and FOUR STOMACHS.** `game.coldEye()` at both pick-ups (`tryGrab`, `takeArm`) sets
`game.aimSlow` (real seconds), which `frame` turns into `timeScale` and drops the moment nothing
is in his mouth. `mods.grassGain` is added to a grass heal in the graze loop, never to the pail.

**The pace dials** (24 Sep 2026). `SLOW` (0.7, top of tuning.js) is in `PACE` and in every other
travel speed, the roll, the hound's dart and hop, a burning man, every animal,
never in what is thrown, flung or shot. `GOAT_CD` (1.2) is written into every base cooldown of the
goat's verbs (roll, grab, voice, breath, spit, the Q artifacts) so the cards quote the real number.
`BOON_BASE.enemySlow` is 1.21 (two tenths on every enemy attack timing). The dev drawer's ENEMIES
tab has live sliders over all of it (`game.dev.tune`, dev-only).

**Run-up.** `goat.runT` / `goat.runUp`: 1 → `1 + momentum.max` over `momentum.time`, drains at
`momentum.lose`, a hit takes it all. `momentum.max` is the fifth taken off `goat.speed`; keep them in step.
BULL NECK (`mods.runButt`, 1 Oct 2026) throws the share of it he had when the head went down (`goat.buttRun`, set at
the windup) into a man: × `1 + runButt × share` on the impulse, men only. BIG LUNGS (`mods.screamReach`) is one
multiplier read at every reach of the voice (the call and its balk, THE FULL THROAT, the breath's cone and its fx,
the spit's flight), never folded into `screamRadius`, which RAW THROAT sets outright.

**Holding a man.** BY THE COLLAR takes a man through a windup: `tryGrab` puts the goat in state
`'bite'` (`grab.bite`, `biteMove`) with `goat.biting`; `closeBite` takes him only if he is still
liftable and within `biteSlack` × the reach, else `biteMiss`. He keeps acting through it; a blow on the
goat cancels it (`Goat.damage`). Things are still instant (`takeHold`). Carried, `grab.speedMul` (0.6).
`goat.holdLimit` from `mods.holdTime` + `grab.holdVary`. The held branch tops
`Enemy.update`: a Hunter fires `enemy.heldShots` (never refilled); a Seer's rune stays where he started
(`castRune`; `fling` clears it). He burns, touches braziers, is hit by the Mill and `Prop.bite`, which
remove him from `goat.holding`.

**Arms.** `Goat.takeArm`, only via `tryGrab` (no walk-over pickup; `goat.autoHeld` false). Either button
throws an `item` (`Goat.throwHeld`; press also read off `pointermove`, `game.mouseButtons`). Slowdown
`grab.itemSpeedMul` / `grab.speedMul`. A `weapon` prop is rack + blade (`inStand`, `sword` / `shield`,
`updateWeapon`, `hitMan`, NOTCHED on a wall, `Goat.cutWith` / `cutGap`, `passed`); `'w'`,
`levelDef.racks`, `racksFrom`. A FIREBRAND blade left stuck in a man keeps lighting him (`Enemy.stuckFire`,
`weapon.stick.fire`). Consumable: `prop.uses` (`weapon.uses`), `weapon.swordShare`,
`Prop.snap()` the only destroyer (clears `goat.holding`). **Nothing breaks into nothing** (3 Oct 2026):
`snap` throws the thing's pieces (`Scatter.breakUp`, `Scatter.piecesOf`: sprites `sword-bit*`, `halberd-bit*`,
`shield-bit*`, `mshield<look>-bit*`, cut off the whole sprite by `brokeUp` in js/prop-pixels.js), and so do the
shieldman's board breaking (`shieldTakes`, or a blast killing him) and a magnet's orbiter (`breakOrbit`).
A blade spent in a man who gets up from it stays in him (`Prop.stickIn` → `e.stuck`, `prop.weapon.stick`:
in his flank on the side it came from, `flank`, the hilt out past his edge by `stick.out`, fanned;
`Renderer.drawStuck` draws it under or over him by its angle) and
breaks out of him into pieces when he dies (`Scatter.breakStuck` in `Enemy.die`). RICOCHET (`mods.ricochet`,
a grab passive): a blade meeting stone turns off it at the nearest man in front of that wall it can see
(`Prop.glance`, `glanced` reset by `Prop.fling`), no use spent.

**Cover.** `Goat.covers(x, y)` (`weapon.coverR`, `coverArc`). `Goat.shielded`: bullets and clubs spend a
use, a club staggers (`weapon.parry`), `shieldHits`. `Goat.crated`: a club shatters the carried crate
and nothing else happens; bullets pass.

**Bodies and furniture.** `game.flungHits`: a man thrown from the mouth (`Enemy.fromMouth`, set in
`throwHeld`, cleared by `fling`) kills a wall or a man only above `physics.thrownKill` (lethal to ~3 tiles,
short of the headbutt's ~5) and carries on; every other `thrown` body (blast, bomb, rat ogre) still
kills on any touch; off the
horns he kills at `physics.bodyKillSpeed` and dies too only past `physics.bodyBothSpeed` (over the bare
headbutt: one death, not two), else both floored.
`Prop.hitProp` is where a moving prop meets furniture (lamp topples, gong rings, else solid;
`table.killSpeed`); a flung man above `lamp.knock` topples a lamp; resting over `T.PIT` → `Prop.fall`.
`Prop.spill` knocks coals (`prop.brazier.spillTime`, `spillCd`); `game.touchingBrazier` returns it.
The men catch off a touch; **the goat burns only walking into one** (`Goat.intoBrazier`: his stick, or
his roll, within `brazier.into` of the bowl, inside `touch` px of the rims).

**Statuses.** Stun `Enemy.dazed`, fire `Enemy.burning`, poison `Enemy.poison` (blind + slow via
`dt * tempo`, `moveMul`); `js/status.js`, `TUNING.status`. Reactions either order: POISON+FIRE
`Status.blast`, POISON+STUN `sting` (no hit, `e.shock`), STUN+FIRE `scaldIt`. **The goat is poisoned
too** (30 Sep 2026, `Status.goat` from `Goat.update`): a puddle fills `g.venomFill` over
`goat.poison.build` s + `mods.poisonGuard` (draining at `drain` out of it; never in the air), full is
`g.poisoned` for `time` s at `moveMul` of his stride, topped up while he stays in it, only the slow.
`Renderer.drawGoatPoison` rings his feet in cells (`CombatFX.pixelArc`). VENOM SPIT's glob lays
`spit.tiles` (6): its own tile and five of the eight round it at random (`Status.spatter`).
`world.poison` / `world.poisonOn`. Sources: SPLASH, VENOM JAW (floor, whoever the throw meets
within `jaw.touch`, a puddle; `Status.markThrow`, `updateCarried`), SOUR TUMBLE, VENOM SPIT
(`game.globs`). FIREBRAND (id `charge`, `mods.brandHold`) is VENOM JAW's fire twin: `Status.brandTrail`
lights the tiles a throw has *left* (never the one it is over, the goat's, or within `brand.gap` of
the mouth), so the thrown man never flies into his own fire. A crate leaves the mouth alight
(`markThrow` sets `alight`): the man it meets catches and it breaks into one burning tile. Any
crate alight, branded or carried through fire, lays the same line behind it (`Prop.update` gives
it a `brand` record, witchfire kept).
 A blast costs `blast.hits` (2) hearts inside
`hitR` and then spares that man for `blast.guard` s (`e.blastAt`), so a chain is two hearts, not four.

**Fire.** `world.fire` seconds, `world.fireKind` 0/1 (witchfire: violet, ignores `mods.fireImmune`,
`isWitchPx`); lighters pass the kind. `game.passFire` does nothing without `mods.firePass` (KINDLING); a
man lit by a man (`litByMan`) never passes it; `passedFire`; `Enemy.fireDepth`. **The flame on the goat is
the tick's clock** (1.88): `Goat.update` sets `goat.fireK` (`fireTick` / the interval he is burning at) and
`Renderer.goatFlame` steps it through `goat.burnLook.sizes` on his body, rising to his back; full grown is the
heart going. Never size it per frame, only by those steps.

**Gong and voice.** `Prop.ring` → `goat.gong` (`bell.buff`, `cooldownMul`, `speedMul`); `'b'` only in
rooms with men. Every voice is `Foley`'s `voice` (a jittered buzz through formants): `bleat` is every
sheep (`sfxScream`, `sfxBleat`), and the bark, growl, hen, goose, crow and a falling man are the same throat.

### Props and world objects

**Props.** One `Prop`; `blocking`, `stopsBullets`, `opaque`, `item` are getters; `headbutt()` per kind.
`item` = anything lifted. No fallback draw branch: an unhandled kind does not draw.

**Crates and bombs.** Crate `r` 10, floors a man `crate.stun`, catches thrown through fire and breaks into one
burning tile (`alight`, `Prop.burst`, `burstTime`; the barrel is what spreads). Bomb: `tryGrab` arms `fuseT` (`prop.bomb.fuse`) on pickup (`Prop.fling`
backstop), re-throw keeps the fuse; lit and flying at `bomb.hit.speed` it goes off on stone, a man or a
solid prop (`updateBomb`; slower, or inside `hit.arm` s of the mouth, it stops dead and counts down), `explode()` two hearts inside `nearR`,
one to `blastR`, goat included; placed in the highest-threat room (`prop.bomb.chance`).

**Tables go over** (1.80, `TUNING.prop.table.flip`). A table sent sliding (`shove`) goes over onto its
side when it stops (`flip.chance`) and always when it meets stone faster than `flip.wall`
(`Prop.flipTable`): `p.flipped` is the way its top faces ('n', 's', 'e', 'w', sprites `table-<dir>`),
`r` grows to `flip.r`, the supper goes flying, and it is no longer shouldered along at `pushSpeed` or
sent sliding: the goat leaning on it creeps it at `flip.push` and is held to that pace (`Game.creepTable`,
30 Sep 2026; stops on stone and solid props, men never push it). A headbutt only rocks it (`knockFlipped`) until the `flip.hits`-th breaks it into planks
(`smashTable`). Never a wall for good.

**The chandelier** (1.80, Enter the Gungeon's; `TUNING.chandelier`, `TUNING.prop.cleat`). `gen.js` hangs
up to `perLevel` a floor (`chance` a room, its own RNG stream) over a 3x3 of floor, and ties its rope off
at a `cleat` on the far wall within `reach` columns (2 Oct 2026: the cleat within `byDoor` of a way in or
out, the ring within `nearDoor` of one, the rope across the room, so it drops behind him or ahead; `cid` joins them; `startLevel` sets `ring.cleat` /
`cleat.hangs`). Never in a cave, the trip, THE DARK, or a teaching, resting, trap, wheel, gallery or
killbox room; `GEN_RULES.chandeliers`. A headbutt on the cleat, a flung body or thrown thing arriving at
it past `cleat.hit`, or `cleat.burn` s of flame on its tile cuts the rope (`Prop.cutRope`, `cleat.cut`);
the ring falls from `z` (`updateChandelier`) and lands on everything within `killR`: a man `die`s
('splat'; the two-hit kinds lose a heart), the goat loses a heart (killer `chandelier`), a table under it
goes to planks, the candles light `fireR` tiles. The wreck stays, harmless. Neither prop blocks. Drawn in
two passes: its shadow or the wreck with the props, `Renderer.drawChandelierAir` (ring, rope to the cleat)
over everybody. **It says little until it matters** (2 Oct 2026, `chandelier.look`, "less on the screen"):
the ring at `look.ring` world px a texel, `z` 64 and `fromWall` 4 so it never covers its own cleat, thinned to
`fade` while it covers the goat or a man (`p.airFade`), the rope thin and faint; within `warnR` of the cleat
(`chandWarn`, js/prop-pixels.js) the cleat gets a beating amber frame, the rope goes amber and the landing
spot is an amber ring of cells (`drawLandCells`), which fills while it falls. A man under a chandelier is
not "in the furniture" (`inFurniture`). **THE YARD teaches it** (`levelDef.chandAt` 3, `CHAND_LESSON_TEMPLATE`,
`room.isChand`, role `mix`, `noFlipX` / `noFlipY`): bought as one clubman (`chand`), the way out narrowed to
one tile (`narrowExit`; the template's `P` pier only fixes the door's row and goes back to floor after),
the man (`post`: `e.sentry`'s feet, never walked out of furniture) holding it under a ring whose cleat is on
the far wall straight above him. Nothing else is put in that room, it is never a trap, canon, armory or
secret room, and the room after it never stacks. `GEN_RULES.chandlesson`.

**The wall's dressing** (30 Sep 2026, Enter the Gungeon's; `TUNING.prop.armor`, `TUNING.prop.trophy`).
`gen.js` `dressWall` (its own RNG stream, after the chandelier) hangs a **suit of armour** (`kind:
'armor'`: helm, pauldrons and breastplate over one halberd (`armor.halberds`, the one a grab beside it takes as a weapon), on the far wall's face `armor.foot` px
over its foot, never blocking, no floor shadow, 30 Sep 2026: standing on the floor it "read as a
figure on a plinth") or a **stag's head** (`kind: 'trophy'`), both far wall only, where a cleat would
hang, in a room that rolls `armor.chance + trophy.chance` (one roll; the kind the floor has fewer of is
tried first, 5 Oct 2026: heads had dropped to 40% of floors, now about two in three), at most one of the
two a room and `perLevel` of each a floor, never in the pen, a set piece, a teaching, resting, calm or
trap room, under a chandelier, a cave, the trip or THE DARK; THE ARMORY always tries for `armor.armory`
suits (not counted). `wallFits` (shared with `GEN_RULES.armor` / `trophies`) wants plain stone
`DRESS.run` tiles either side along the wall (never a doorway, shaft, window, vault mouth or wall that
gives) and open floor beside and in front; `dressPoint` is where each stands. Flung bodies ask
`game.wallArt` every step (`Enemy.wallDressing`, before the wall's own splat): **armour** comes apart
(`Prop.burstArmor` → `Scatter.fromArmor`, pieces `armor-*` as scatter bits glanced off the wall into
the room at `armor.out`, the halberds and bare plate `armor-stand` left, `spilled`) for any flung body into it or landing within `near`, a
thing thrown past `hit` (`hitProp`) or a blast (`Scatter.burst`, which `Enemy.explode` now calls too);
a headbutt brings it down too (1 Oct 2026); it never kills (pillar 3). **The suit on a stand** (`kind: 'suit'`, `TUNING.prop.suit`, sprites `suit` / `suit-bare`): the same iron standing on the floor of a room, blocking until it is brought down (headbutt, flung body, blast: `burstArmor`, pieces the way the blow went), then a bare stand out of the way; THE ARMORY stands `armory` of them, elsewhere one a floor on `chance`, plain floor all round (`rockFits`). `GEN_RULES.suits`. A **stag's head** takes a body flying at its
wall past `trophy.hit` within `hitR` (`Enemy.antlers`), below what the stone kills at, which is the
point: a one-heart man dies there (`e.hung`: no corpse, `Enemy.die` bakes `p.bodyImg`, and
`PaintedArt.trophy` draws him `lift` up the wall under the tines with blood dripping to the floor), a
two-hit one loses a heart and is pinned `time` s (`impaled` / `impaleOn` / `pin`, `impaledStep`'s
trophy branch; drawn lifted with `trophy-tips` over him, the goat's teeth pull him off), then tears
free. One body, then `spent` (`trophy-blood`). A fused man goes off instead; the goat never sticks.
Sprites in `js/prop-pixels.js`; one of each on THE SHOWROOM's far wall.

**Spilt powder** (30 Sep 2026, `TUNING.prop.powder`). A barrel that breaks without going up
(`shatter` without `wentUp`) lays `game.powder` on `tiles` tiles, its own first (`Game.spillPowder`);
fire on one or a man alight on it lights it, `fuse` s later it blows inside `r` tiles (a man dies, the
goat loses `damage`, its tile burns) and lights the powder next door (`chain`); `updatePowder`,
`Renderer.drawPowder` (grains in cells after the decals).
**Barrels.** `kind === 'barrel'` (`TUNING.prop.barrel`): not `item`, blocking, stops bullets. A headbutt,
a flung body over `knock` or another barrel (`pass`) calls `Prop.roll`; `lying` is for good.
`updateBarrel` bowls men (`e.fling` × `fling` × `knockMul`, `daze`, `keep` a man; Butcher staggers,
ogre unmoved) and breaks above `breakSpeed` (`smashBarrel`). Oil: `oilT` is the fuse, lit by a burning
tile or man; `oilBurst` is `Prop.burst` wider; a brazier bursts it at once. Lit, it is a fire hazard to
`hazardAt` (`game.hazards` holds barrels, `unHazard` drops a broken one). Placed off its own `RNG`
stream where `rockFits`, `levelDef.barrels` a room; `GEN_RULES.barrels`. Drawn as Enter the Gungeon's
red barrel (1.79, `js/prop-pixels.js` `barrel`): iron hoops, a wooden head with its powder heap, a skull
on the staves. On its side it lies across the way it was sent (`p.rollAxis`, set in `roll`: 'v' going
left or right) and turns a frame (`barrel-lie0..7`, `barrel-up0..7`) every eighth of its girth off the
signed `p.rollD`, so it rolls back the other way off a wall. It never kills by itself (pillar 3): the wall behind the man does.
**A round into a barrel** (1 Oct 2026, `Bullet.update`) lights its oil on the ordinary `fuse` (it says OIL), and breaks a
poison one open. **A blast goes through the room** (`Prop.blastRoom`, called by a bomb, BOMB CHARGE's man, a
barrel's `oilBurst` and `Status.blast`): within its radius and line of sight a barrel is lit `barrel.chain` short (a
poison one meets the flame: `toxicBurst`, guarded by `bursting`), a lamp topples away from it, a crate shatters, a
bomb lying there is lit `bomb.chain` short, a brazier spills, the gong rings, a cracked wall opens outright, a
boulder cracks and a cleat's rope is cut. So a row of barrels goes up one after another.
**What a blast reaches** (2 Oct 2026): stone and a shut door stop every blast (`Game.blastClear`, `Prop.blastStop`), and its
hearts are once a chain: `Status.spared` (`status.blast.guard`) is asked by the bomb, BOMB CHARGE and the poison blast.
**A barrel of poison** (30 Sep 2026, `p.toxic`, never `venom`, VENOM JAW's drip mark, `barrel.venom`): `chance` of the barrels placed, off the
same stream; green sprites (`vbarrel*`, the head wet where the red one has powder); `light` refuses it, a
brazier only smashes it, and broken it lays `tiles` (6) of poison with `Status.spatter` instead of powder.

**Grating.** `kind === 'spike'`, `updateSpike` `idle → armed → up → down → rest`; `Prop.tripped` by the
goat or any living unheld non-mist man **coming for him** (`aware`, or flung) standing on that grate's own
tile (never beside it), a man's foot arms it at `spike.armMan` (0.1 s), the goat's at `arm`; `bite`, `this.bit`, `spikeThreat()`.
A grate resting after the goat set it off wakes under a man's foot once `spike.restMan` s of the rest are gone (5 Oct
2026: the man chasing him always crossed the patch inside that rest); the goat waits out the whole `rest`.
`spikePatch` lays one bending band of `spike.run` (9–15 per room), never a scatter; its grates carry
`patch: true` so `GEN_RULES.grate` can tell them from a trap template's own `S`. **A grate with something
on it** (30 Sep 2026, `spike.hidden`, `p.hidden`): a room's patch may get a crate (or a barrel) set on one
grate (`cover`), and in THE ARMORY a grate may lie under a crate or a stand; `startLevel` gives the grate
its `cover`, and `Prop.covered()` keeps `Renderer.drawProp` from drawing it while the cover is on its tile
and the teeth are down. `GEN_RULES.hidden`.

**Spire.** `kind === 'spire'`, `TUNING.cave.spikes`, **not blocking**, never arms; `Prop.updateSpire` kills
a man, costs the goat `cave.spikes.damage`. A leaper in `state === 'hop'` is over it, not on it.
**The ogre is caught on it** (`cave.spikes.impale`, 1.74): a kind in `impale.kinds` (ogre, rat ogre)
touching one in a state in `impale.from` (landed from a leap, staggered, floored) loses a heart and is
`e.impaled` for `time` s × `enemySlow`, `Enemy.update` hands the frame to `impaledStep` and nothing
else runs, then tears off a step clear, staggered, spared the teeth for `clear` s. Walking, he is
only put round it (the old accident: every man steers off a spire, so one standing on it could not
leave and bled a heart a second). Drawn shivering with the tooth redrawn over his feet (`drawEnemy`). At a wall, clear of entrance, furniture, grass; never in trap,
set-piece, teaching, ambush rooms or the trip, except the cave ogre's own ring, which always stands
`cave.spikes.ring` of them, so he is fought among them. `GEN_RULES.spikes`.

**Boulders.** `kind === 'rock'`: blocking, not opaque, not item; `crackRock`; `world.block` keeps it out
of the flow field; bodies die on it at `splatSpeed`, crack it past `knockHitSpeed`. `rockFits`: plain
floor all round, none within two. `levelDef.rockClusters` (cave): `placeRockCluster`, shared `cluster`
id, `clusterKeepsRoomOpen`. `GEN_RULES.rocks`.

**Tall grass.** `level.grass` / `world.grass`. Beyond `grass.seeInto` it joins `visBlock`; `canSeeGoat`
fails past `grass.hideR` (smaller = more hiding). `Goat.cutGrass`; burns (`grass.burn`, `spread`,
`drawBurningGrass`); `drawGrass`. `grass.lurk` men wait in it (`lurk`, `lurkAlpha`). `GEN_RULES.grass`.

**The drop.** `T.PIT`: not solid; `walkable` / `walkableAt` and `hazardAt` keep men off, and **nothing walks
over one**: the step at the foot of `Enemy.update` slides a man's own movement along the lip (a hound's
run ends on it), `Game.nudge` keeps a shove between bodies from pushing him over (1.85). `Enemy.update`
kills anything over one first thing (`'fall'`, no absorb, no remains; `game.spawnFaller` →
`game.fallers`, `drawFallers`, `sfxFall`). The lip holds the goat from windup to recovery end.
`goatFalls` / `updateFall` / `'falling'`, `fall.damage`. Return point from `goat.safeTrail`
(`fall.setback`, `fall.invuln`): **every candidate is tested against the floor**, `Game.groundNear` last,
and landing is latched on `goat.landed`, otherwise he fell forever or stood in the hole. `drawPits`
after decals, in hard bands (`TUNING.effects.pit`): the far side's lip and wall face going down, lit board
ends on the near and side edges; `throughHoles` lays a baked sheet of stakes under a hole in a building
(`bakePitFloor`, a pattern lagging at `DEPTH.below`) and a night sky with cloud through a window, so a
hole never reads as a pillar (1.85). Windows (`levelDef.windows`, RAFTERS): `carveWindow` → `level.windows`,
the only way `drawPits` knows one.

**Stairs.** `T.EXIT` / `T.ENTRY`, `drawStairs`, `level.exitTile` / `level.entry`; `beginClimb` /
`updateClimb` for `stairs.climb` then `levelCleared`; `game.stairFx = { t, dir }`.

**THE FORK.** `TUNING.dark.fork` (`at` 3, THE ROAD): the last room of that floor has a second flight in
the same far wall, `apart` rows or more from the first, behind its own iron `stair` door (`fork: true`),
at `level.forkTile` (a reseed if no row fits). `beginClimb` sets `game.climbDark` off the row he climbs;
`nextCard` then sets `game.darkAt` to the next floor, so the dark flight climbs to THE DARK in THE
THRESHING FLOOR's place (saved with the run; a death keeps it). Drawn cold (`drawStairs(..., cold)`,
`Renderer.forkRow`); the floor in front of each flight names where it goes (`drawHints`).
`GEN_RULES.fork`; `balance.js` holds THE DARK under the lit floor and above `fork.band` of it.
Anything that reads `exitTile` still means the lit flight (compass, escorts, the bell's thread).

**Mill and roast.** `kind === 'mill'` (`TUNING.mill`; `updateMill` runs even when `broken`, see
*Testing*). Its sweep is bare (5 Oct 2026): the generator takes up anything in `MILL_CLEAR` within the arm plus
`mill.clear` tiles (`inMillSweep`, `GEN_RULES.millclear`), and in play the arm butts out whatever ends up there
(`Prop.headbutt` along its turn, a bomb flung, `mill.knockCd`). `prop.roast` on one brazier at most per level (`prop.brazier.roast`, tile hash).

### The cave

**Shape.** `levelDef.cave` → `world.round` (`TUNING.cave.roundR`). `TUNING.cave.shape`: `'round'`
(`World.collideRound` and `drawCaveTiles`, **one shape, change both**) or `'mid'` (default;
`World.buildCaveField`, `collideMid`, `drawCaveMid`, shared `marchCell`; only grows rock into floor).
`erodeCave` rounds corners. An unbroken secret wall is rock showing only its crack.

**Drawing it cheaply.** `World.buildCaveBand` (`caveNear`, `cave.band` 2) limits what is marched.
`Renderer.drawCaveBaked` bakes chunks (`CAVE_BAKE`, `caveBakeSig`, `CAVE_BAKE_MAX`); **anything animated
on cave ground must skip itself while `renderer.baking`**. A chunk's sig is its own tiles four round,
**never `caveEpoch`** (every clamp bumps it, and in the sig it rebaked the whole screen at each door);
`Renderer.warmCave` paints the view and `CAVE_AHEAD` chunks round it in idle time, nearest his heading first. `Renderer.caveRockPath` caches `Path2D` per
`CAVE_CHUNK` keyed on `world.caveEpoch`; **every stone↔floor tile change must call `World.caveDirty`**
(`updateClamps`, niche walling, `crackWall`, `Shop.breakWall`). Decor: `drawCaveDecor` (upward spires,
gems on the face band, mushroom fur), `Renderer.dripstone` on top walls, sharp teeth (`northOpen`)
below; floor and litter from `PIXEL_ENV` (`PIXEL_FLOORS.cave`). How much of each grows is
`TUNING.cave.look` (`cave` / `trip`: drips, spires, crystals, small `gems` on the rock top,
`Renderer.gem`, and the trip's `fur` and floor clumps). The trip's floor clumps are the fur's own
vector caps (`shroom`), never the painted `shrooms` sprite: that one is the breakable big mushroom.
**Counts only**: on 24 Sep 2026 mushrooms and crystals were cut by a third and a pass that also
redrew the caves on the pixel grid, narrowed the trip's colours and dimmed its glow was rejected
outright, "they were beautiful". Leave the trip's look, glow and colours alone.

**The cave's fog** (2 Oct 2026, `TUNING.cave.fog`): in a cave (THE TRIP too since 5 Oct 2026) an unopened room is not a box
painted over the rock: `Renderer.drawCaveFog` lays the floor's fog over every tile he has not opened (a seen room's
floor, the corridors flooded out of it, `margin` tiles of rock round both), a pixel a tile, blurred up `soft` ×,
rebuilt only when a room is seen or clamped. Since 5 Oct 2026 a seen room's floor opens only where it is in
`world.mem` (see *The fog*), and a growth of the memory alone rebuilds it at most every `fog.mem.every` s.

**THE TRIP.** `tripLevel(i)` replaces `LEVELS[i]` (`shroom`, `cave`; no traps, wheel, drop, killbox,
teeth, posts), fought at `LEVELS[0]`'s curve × `shroom.threatMul`, `shroom.men` per room of
`shroom.kinds`. `LEVELS.indexOf(def)` is -1, ask `this.level.def`. Entered by grazing a `shrooms` prop
(never on the last two floors: the last floor is never the trip; `shroom.chance`, `from`, `eatR`, `eatTime`, `game.eatShrooms` → `game.tripAt`; `levelTripAt`,
`forgetLessons`, `saveRun`). `game.tripInput(real)` reverses the stick and swaps grab/headbutt and
roll/scream, no new keys. Lens breathing in `Renderer.worldTransform` (`shroom.cam`), never a shake.
`Goat.tripPhase`. `GEN_RULES.shrooms`, `GEN_RULES.trip`. The floor after it says, plain and still, that the
controls are his again (`game.tripBack`, `shroom.back`, `drawTripBanner(..., sober)`).

**THE DARK.** A level of its own (`DARK_LEVEL`, `darkLevel()`; 1.65, it used to be any floor with
the lamps out and a softened copy of its curve). It is not in LEVELS: THE FORK's dark flight climbs
to it and it is played in THE THRESHING FLOOR's place (`darkOf`, via `game.darkAt`, which is only
ever that index; `startLevel` refuses any other). Unlike the trip it stays that floor to whatever asks
which floor it is: **ask `levelIndexOf(def)`, not `LEVELS.indexOf`** (mouse, milk rhythm, shrooms).
Its own canon THE LAMP (eight `canon: 'lamp'` templates: well, lampvault, cellblock, chapel, lampstore,
crossing, scriptorium, cistern; a block of stone in one is never three tiles thick, its unlit middle reads as a hole),
its own crowd (hounds and seers weighted up, no rifle ever, a cap of six), curve, doors and palette;
its own par (`scoreFor(..., def)`) and best (`noteBest('dark')`); its own LEVELS row (row 1; with
`#dark` any row starts it). **The lamps are the level** (`gen.js`, `TUNING.dark.lamps`): every room
with men, and every arena and rest room, stands `min`..`max` lamps (two past `big` floor tiles), the
template's own flames counted, against a wall and spread; a headbutt tips one, it burns where it
falls, then the room is black. **A lantern on the wall** (`kind: 'sconce'`, `Prop.wall`, not
blocking, never goes out, `lights.sconce`) hangs by each doorway in a far or side wall (straw under
it is fine; never by a wall that gives or the vault's door); drawn by `PaintedArt.sconce` (`js/prop-pixels.js`). A doorway in
the near wall gets a standing lamp beside it instead (`doorLamp`, `lamps.doorLit`), or the seed is rerolled. A pool that
lands inside stone starts from the nearest open tile (`World.ignitePool`). `GEN_RULES.dark` holds both, and
that no killbox or rifle is in it. **The cult is in the dark too**, on THE DARK and on any floor
`dev.dark` paints (`game.inDark`): `game.goatLit` (`game.litAt`, once a step), out of the light
`canSeeGoat` stops at `dark.ai.sight` (a hound a little further), a hunt (never a blow under way) goes
cold in `ai.lose` s and noise moves `lastSeen`, only the goat's: the cult's own shouts, swings and
casts are emitted as kind `'cult'` and skipped, and the seer paints his rune at what he hears
(`Enemy.hearForRune` → `earRune`, `byEar`), never at a noise one of his own is standing in.
`balance.js` studies it as a level and holds it beside the lit floor (`fork.band`). The picture is
`js/dark.js` (`Dark`), render only: a light map shadowcast from every flame (`dark.lights`), the
goat's hearing (`dark.near`) as a dim floor plus silhouettes (everything standing redrawn off-screen
with `renderer.silPass` on, no shadows, halos, windups or overhead marks, and nothing flat: a wall
crack, a lantern, a grate, cut to the mask, flattened to `body` with a `rim`), the faces where floor
meets wall inside his hearing (`Dark.walls`, `dark.edge`), windups and `Renderer.drawOverhead` laid
back over the dark (`Dark.readable`), and `dark.eyes` for the seer, hound and wraith. The floor words go on
inside `Dark.draw`, over the mask and under the silhouettes, and near a line of them (`Dark.wordsNear`) the goat is
drawn again over it in his own dark (`Dark.goatOver`), so no word is written across him (5 Oct 2026). On the move he
sees a little more round himself (`dark.run`, eased by his speed).

### Souls, shop, talismans, escorts

**Souls are a budget.** `levelDef.souls` = two; the mouse replaces one (`soulsHere`). Spent in order:
the gate, then the **last** bosses; the vault never. `game.bossPrize`: soul, else milk.
Seeded surprises (`soul.bossChance`, `soul.roomChance` 0, `game.bonusRoom`) only on a level with
`surprises: true`, none since 26 Sep 2026 ("in the middle and at the end"). All of it is `soulPlan(level)`
(gen.js, 1.72), which `startLevel` lays and `GEN_RULES.souls` checks: no two souls fewer than
`soul.apart` rooms apart, a surprise that would be is not dealt. A soul is a violet wisp
(`Renderer.soulWisp`, `game.souls`). Cards: `takeBoon` by Digit1/2/3 or down-and-up on one card
(`boonDown`, `boonAt`, `boonRects`), `boonArm` delay; never on hover or press alone. Over the cards the soul hangs where he will stand until a card is
first pointed at once they can be taken (`Game.watchBoonMorph` → `game.boonMorph`), then is swallowed into him
(`TUNING.fanfare.morph`; `drawSoulFanfare`, `Codex.drawBoonGoat` / `drawPull` / `drawMorphRing`) and he stays.

**What a thing is, the first time** (5 Oct 2026): `game.learned` (`LEARN_KEY`, per browser: `key`, `iron`, `graze`, set by
`Game.learn`); until each is done the floor beside grass, a key or iron says what it is (`Renderer.drawFirstWords`), and until
`key` `startLevel` passes `noIron` to the generator, so nothing is shut in iron before the first key is held.
**Keys and iron** (3 Oct 2026, first cut, `TUNING.keys`). A run resource he asked for (a souls resource is still
decided against; keys are a different thing, on purpose): `game.runKeys` (**never `game.keys`, the keyboard's
Set**), kept floor to floor, saved, a death gives back `levelRunKeys`. A champion drops one at `keys.drop`
(`bossPrize` → `dropKey`, a `key` prop taken by walking over it). From `iron.from`, `iron.chance` of the floors with
an animal (not the horse) shut the animal's coop in iron (`coop` + `ironCage`) and stand an `ironcage` of big grass in
the SAME room, `iron.pair` tiles from it (5 Oct 2026, his call: "the choice between two cages is right, only in one room,
and it must read, grass or animal"; the floor under each names it while both are shut, `Renderer.drawIronPair`,
`iron.readR`); no spot for the grass, no iron (gen.js, own stream; `GEN_RULES.iron`; together they may not cut the room in
two, `discKeepsRoomOpen`'s `more`, nor stand in front of a door: a floor starts with no key): no blow opens iron, a
headbutt with a key spends it (`Prop.unlockIron`), so one key is a choice between the two. **Keys are meant to run short** (his words, 3 Oct
2026: "keys should and may not be enough"; "want it all, fight"): risk and reward, wood on some floors and iron on
others; never tune them toward always having enough. HUD: `Renderer.drawKeys` beside the purse. Planned,
not built: keys saved up for a door wanting five, a secret floor behind it.

**The shop.** `TUNING.shop.levels` (YARD, ROAD, BRIDGE), in `gates[0]` (`shopRoomOf`). `carveHole` cuts
nothing (`gap` is a mark; no spot → reseed). Three `ware`s `shop.spread` apart: two talismans
(`stockFor`, `shop.tierAt`, no two of one `tag`) and the pail (`MILK_OFFER`, `milkSpots`,
`TUNING.shop.heals`, drunk a heart at a time via `prop.pail`). **She takes nothing; one choice**:
`Shop.buy` / `Shop.takeMilk` pack the rest and `game.openSoulGate`. Full slot → old one back on the stool
(`ware.chosen`). **Grab is take** (wares first, `rmbEdgeNow`). **Headbutt is rude**: `Shop.provoke`, at
`shop.strikes` the rat ogre, wares `locked` until `Shop.ogreDown`. Death returns the level's take
(`levelArtifact`). `drawBurrow`, `drawMouse`; `Shop.breakWall` opens three wall tiles when she turns.

**She keeps her wares** (1.97, `Shop.shelved`): while her mouse is there a shop's wares are neither drawn nor
grabbed; walking within `shop.dlg.r` of HER opens the offer (`Codex.watchShop`), and her room's floor says WALK UP
TO HER and the book's key. **Read the ware.** `Renderer.drawWare` within `prop.ware.readR`: name, tier and the tier's `desc`
(`wareNote` → `drawNote`, drawn after the fog and kept in the picture under the hearts by
`Renderer.keepInView`, which the animals' plates and floating words share). **A tier's `desc` is a
getter onto its talisman's `tell(p)`**: one or two plain lines, a number only where it is the point
- and `detail` onto `say(p)`, the tier in full numbers for the TALISMANS tab only. Both state the
tier whole off its own params, never as a diff on tier I, because the n-th mouse sells tier n and
nothing else. `desc` shows on the shelf and the chip hover; a new tier needs no text, a new param
needs `tell` and `say` to read it.

**Artifacts.** `ARTIFACTS`: twenty-four, three tiers, `apply(m, p)` via `applyBoons`; `game.artifact`
`{ id, tier }`, saved, `resumeRun`. FIRE AMULET: `mods.firePass` depth. LUCKY CLOVER: `mods.luck` →
`generateLevel(def, seed, { luck })` for the next floor (`balance.js` runs without). BOOMERANG, STRANGE
SYMBOLS, STRAW EFFIGY live on **Q**, which does not exist until worn (`TouchUI.itemReady`); own clock
`Goat.itemCd` / `itemCdMax`; `Shop.throwBoomerang`, `Shop.blink`. THE KNUCKLEBONE (`knuckle`, tag
`soul`, 30 Sep 2026): `mods.thirdEvery` 3 / 2 / 1, a soul's third card (see *Boons*).

**Talismans.** `js/talismans.js`, hooked in at: `Talisman.update`, `onKill`, `onSoul`, `parry`,
`reflectBullet`, `redirectRune`, `absorb` / `scapegoat` / `loseRunUp`, `buttImpulse`, `onButtStart` /
`onLunge`, `stepMul`, `speedMul` / `gripMul` / `runUpTime`, `splatMul` / `bodyMul` / `domino` / `dragMul`,
`visibleTo`, `splinters` / `corpseGone`, states `flee` / `decoyhit`. Params on `game.mods.<id>`;
`game.tal` per level, `game.talRun` per run. MIRROR SHARD: `goat.parryT` from windup start. SCAPEGOAT nulls
`game.artifact` **and** `game.levelArtifact`. GRAVEDIGGER'S SPADE: `crate` props with `corpse`; `e.corpsed`.
TALISMANS tab edits live via `tools/tuning-patch.js`.
THE MAGNET (`magnet`, `TUNING.magnet`, 1.87): once a room (`tal.magnetRooms`) up to `count` swords and shields
(`any`: crates too) within `reach` are taken OUT of `game.props` into `tal.orbit` and circle him
(`updateMagnet`, drawn in the cast by `drawOrbiter`); `meleeHit` asks `magnetBlock` (the nearest takes any
blow), a `Bullet` asks `magnetBullet` (only one it meets); either breaks it (`breakOrbit`).
THE NOSEBAG (`nosebag`, tag `heal`, 3 Oct 2026): at full hearts the milk loop asks `Talisman.bagGraze` first, and a
tuft grazed goes in `talRun.bag` (big grass two, up to `hold`; saved as `bag` like `third`); `Talisman.updateBag`
eats one standing still, hurt, teeth empty, off any grass, after `chew` × a graze (+1 heart and FOUR STOMACHS').

**Escorts.** `js/beasts.js`, `TUNING.prop.tortoise / .goose / .crow / .horse`, `TUNING.beast`,
`GEN_RULES.beasts`. **Which floor gets which is the run's** (`Beast.deal(runSeed, early)` via
`game.beastPlanFor()`, passed to the generator as `opts.beast`; null = none): the first on level
three (`beast.deal.first`), or level two once this browser has cleared it (`deal.known`,
`game.beastEarly`, saved with the run), then every one or two floors (`deal.gap`), each kind off
that floor's `levelDef.beasts` list, **never one kind twice in a run and none on the last floor**.
Without `opts.beast` (balance, dev samples) the dice pick off the list; `balance.js` holds the deal
over many run seeds. In a `coop` (`holds`) in the
first `beast.third`; none on level one. A coop left shut stays shut (1.71): the clamp walls it in and
`Beast.lost` says so. Coops call (`beast.callGap`, `callR`). Banked (`Beast.cameWith`: held, within `saveR`, or in the stairs' room; the crow a room
further back) at
the stairs: `beginClimb` → `Beast.bank` → `game.beasts` → `Beast.applyRewards`; `BEAST_CARD`,
`drawSaved`. **No key, and none trots after you.** `Beast.hurt` (`beast.hp`, `hurtCd`). New escort:
`Beast.KINDS`, `TUNING.prop`, update, draw, `applyRewards`, `BEAST_CARD`.
**How they walk** (1.59): `Beast.way` is the men's `pickWaypoint` for an animal, toward the goat on
`world.route`/`flow` (`Beast.toGoat`), toward the stairs on `Beast.exit` (`open` round furniture,
relaid every `beast.exitEvery`; `d` stone only). Never step an animal down a raw tile field.
`Beast.shy` (hen, crow) keeps it out of a close man's reach behind the goat. Left behind:
`Beast.tick` calls (`strayR`…`strayGap`, `p.behind`), `Renderer.drawStrays` pips it at the screen
edge; the clamp walls it in on purpose (pacing) via `Beast.lost`, which says so. Measure changes
with `tools/escorts.js` (`ESCORT.run`), the way 1.57 measured the men.
- **Tortoise**: carried in his teeth to the stairs (an `item` on its feet, no hold limit, nearly his
  full pace; its terms say so since 26 Sep 2026) or thrown (`Beast.throwTortoise`); tucked it is cover,
  not `item`; blocks one blow (`Beast.guards`, `shellTakes`) then `tortoise.cool` on its back. Reward
  (3 Oct 2026, was a use on every shield): `mods.armour`, set as `goat.armour` at every `startLevel`, iron
  that takes `saveArmour` blows whole in `Goat.damage` (before the halo) and comes off in `armor-*` pieces;
  drawn on him by `PaintedArt.armour` (plates masked to his sprite) and as iron hearts after the hearts.
- **Goose**: leads down `Beast.onward` (`game.exitField`), ≤ `goose.lead` ahead, held by doors; honks
  within `seeR` (a noise heard `callR` tiles off + `Enemy.balk`). Reward: scream range and cooldown.
- **Crow**: follows corpses (`game.crowMarks`), eating `feedFor` s at each, and hops after him at
  `slack` in between; `crow.late` rooms behind him (one: the next room walls it in) it drops the bodies
  and flies after him, as it does past `catchUp` tiles (26 Sep 2026: it was walled in on 4 of 6 bot
  walks and reached the stairs on none; now 5 of 6, the sixth half a second behind). Reward
  `game.crowGift` → `Beast.placeGift`, a tier III ware on the next stairs, never the one he wears;
  the bird that brings it perches by it and flies off (`Beast.updateGift`), never an escort.
- **Horse**: shut in a **stall**, not a coop (30 Sep 2026, `TUNING.prop.stall`): a `coop` with
  `holds: 'horse'` is a 3 x 2 tile box (`stallHalf` / `footGap` in gen.js, `p.box` on the Prop,
  `Prop.boxPush`), and everything that meets furniture asks the box, not `r` (`collideEntities`,
  `headbuttHits`, `hitProp`, the blade's stop, `World.setFurniture`, `Enemy.bodyClear`); `stall.hits`
  (2) blows, the front split after one (`stall-back` / `stall-front` / `stall-cracked`, drawn upright
  with the horse at its own size inside). The generator stands it only in a room **before the first
  soul gate**, on plain floor, where the room stays one piece round it (`stallKeepsRoomOpen`), off
  both mouths; a dealt horse with no such room reseeds the floor; later placements keep off it
  (`footGap`); `GEN_RULES.beasts` holds all of it. `Beast.updateHorse`: stands `ready` s saying its
  bet, then **races in legs** (`Beast.horseLegs`, `horseRace`): to each locked room with a soul ahead
  of where it was let out, a soul gate's room, the mouse's too; nothing else on a floor is both
  locked and holding a soul (the last boss's arena is open, and `soulPlan` never gives a sealed
  arena one), then the stairs. A leg is the goat's if he is in its room before the horse (a tie is
  his; "in it" = that room or any past it, `goatBest` / `horseBest`), and is paid on the spot into
  `p.won`; once both are in it the horse says who won (`lines.won` + `mine`, or `lost` + `yours`),
  waits at the bar until the gate gives, and the leg ends when it is in the room with the bar up
  (so a soul taken while it was on its way, a gate the mouse lifted, a gate he opened and ran on
  from, never leave it standing). At the stairs (`homeR`) it says who got there first and whether
  it pays (`pay` / `none`). **Two tries** (30 Sep 2026): the soul room(s), then the stairs, there
  first and it pays too. Out of the stall it says the race and the tries in the box (`Beast.talk`);
  beaten to a soul room it says so in the box (`talk.beaten`) and pays **at once** (`Beast.prize` →
  `game.beastsHere`, in `mods` now, lost with a death, banked at the stairs); winning it says the
  stairs are the last try (`lines.left`). `Beast.saved` banks it alive with `p.won > 0` or not yet
  home, wherever it is; the middle-gate checkpoint carries `petWon`. Any other shut door in its way (`Beast.doorAhead`) it rears at (`kickWind`, pose
  `kick`) and `smash`es; a seal / vault / fork door holds it; men in its way are bowled aside
  (`Beast.bowl`, `bowl` × `knockMul`, dazed, `aware` left as it was, the cult hardly minds it),
  never killed; ogre and rat ogre unmoved. Body `r` 13 so tile-wide ways take it; its own `unstuck`
  (`stuckFor`/`sideFor`). Reward `mods.speed *= saveSpeed` (1.10).
- **Pig** (30 Sep 2026), out of a coop she says what she wants in the box and ambles after him
  (`Beast.updatePig`, `TUNING.prop.pig`); any milk grass (`heal`, never the mouse's pail) she can see
  within `smell` tiles she walks to and eats in `eatTime` s (`pigEats`), his unless he grazed it
  first. `full` (3) and she thanks him in the box and eats no more. Banked at the stairs if full and
  alive, wherever she is: `saveHeals` (1–2, off the floor's seed) more milk on every later floor,
  handed to the generator as the clover's `luck.heals` in `startLevel`. Checkpoint carries `petFed`.
- **Hen**: `Prop.updateBird`: loose follows `flowDir` (`henSteer`, `detourFor`); kicked by headbutt
  (`launchSpeed`, `pickTarget`, `turn`); `Prop.strike` kills a man and spends her (a deliberate direct
  kill, kept rare). `game.henFreed`. Saved → `game.henHearts` (`saveHearts`).
- **What they say** (`Beast.speak`): floats with `on` (the animal) ride over its head on a dark
  plate for `beast.pactFor` s (`Renderer.drawFloatTexts`), so the line is read, not glimpsed. The
  ANIMALS dev tab (`drawAnimalsTab`, `#animals`) lists every escort, its floors, this run's deal,
  how it behaves, what it pays and every line; `+ BONUS` / `TAKE` bank one's reward as if its bargain
  were kept (and seat it in heaven) or take it back (`Game.devBeast`).
- **The box** (`Beast.talk` / `updateTalk` / `drawTalk`, `game.beastTalk`, `TUNING.beast.talk`): every
  animal's terms the first time a run lets one out (the horse's race, the pig's meal, and since 1.85
  `BEAST_HELLO` for the hen, tortoise, goose and crow; since 1.97 a hint at the reward in the animal's own voice, never
  a readout: the numbers are on the clear card and `Beast.GIVES`), the horse beaten and the pig full are said in the
  god's box over the paused floor (`Game.update` runs nothing else while it is up; any verb turns the
  page). `Beast.met` and `game.henFreed` open it; `Beast.portrait` draws the small ones off `drawProp` at
  `talk.size`.
- **The HUD row** (`Renderer.drawSaved`, `savedHover`): one icon per animal banked or already paid
  this floor (`Beast.counts`), and the pointer on one shows what it gives (`Beast.GIVES`).
- **Their seats in heaven** (`HEAVEN_SEATS`, drawn at the animal's own size by `Heaven.animalGod`):
  `meta.savedN` counts every save; GRAB on a seat says `sound` + `line`, and `more` once saved twice.

### Level flow, UI and persistence

**Music.** Room-driven score (`GameAudio.updateScene`, `MUSIC_PARTS`, `TUNING.audio.layers`,
`encounterStage`, `STAGE_MOTIFS`, `FIRST_MUSIC`, `startMusicCue` / `MUSIC_CUES`); legacy
`playLegacyStep` with `TUNING.audio.crowd`. See `MUSIC.md`. **The tune is the score; keep what lies
on it thin** (1.70, "it was the layers on top"): each enemy kind has its own fixed figure, one hit a
man, three a family (`hitBudgets`, `maxPerFamily`, `musicCap`). The score answers situations, never
a button (`MUSIC_EVENTS`: kill, cleared, spotted, hurt); the buttons only feed `encounterStage` its
intent. A lost heart dips the score's low-pass and the last heart holds it (`scoreTone`,
`TUNING.audio.tone`); his heart is heard in time with `Renderer.heartbeat` (`GameAudio.heartbeat`).
**Calm is quiet, a fight is loud** (1.85, "so that when a fight starts you feel it"): while nobody is after
him `layers.calm` thins the kick, toms, figure, the men's layer, the tune, the bass line and the drone (on
level one too, at `calm.first`); a chase adds hats and a fight a heavier kick, toms, rim and hats
(`layers.fight`).

**The rooms' own sound.** `GameAudio.updateAmbience` (`TUNING.audio.ambience`), on the effects slider
(`ambBus`) and off the music's clock: a looped bed per canon (`Foley.loop`: air, cave, wind), the
nearest fire (`fireNear`, one panned crackle), drips, the far drums, the milk grass when hurt. Fire
and grass live here, not in the score. Loops render at 8–24 kHz (`LOOP_RATE`): keep any new one
cheap, it is rendered on the main thread. Under a fight (`encounter.active`) all of it sinks to
`ambience.fight` on `ambCalm` and the drips stop.

**A death is heard over everything** (1.88, `TUNING.audio.spotlight`). Every bed reaches the master through
a duck of its own (`scoreDuck`, `sfxDuck`, `ambDuck`); `keyBus` goes round them. `Game.onKill` calls
`sfxDeath` (`Foley` `death`: bone, the wet, the body's drop) and `GameAudio.spotlight(k)` dips the rest for a
beat; the groan, a chain's `sfxKill` and an ogre's `sfxBell(true)` are on `keyBus` too. Keep `keyBus` for the
few moments that must win: if everything is on it, nothing is. `foley.stack` thins one key fired again within
`window` s (× `mul` a copy, none past `max`).

**The score is laid `audio.ahead` s ahead** (0.25) of the ear by a 25 ms timer on the main thread: a stall longer than
that skips the steps due in it (notes cut off). Keep it over the longest stall a weak machine has.

**Effects.** No oscillator goes straight to the speakers from an `sfx*`: each is `GameAudio.foley(recipe)`,
a `Foley` recipe (`js/foley.js`) rendered into a buffer, a struck thing as its ringing `modes`, a
voice as `voice`, air as shaped noise. A bank holds `TUNING.audio.foley.takes` takes per key; only an
empty bank renders mid-game, `GameAudio.warm` fills the rest in idle callbacks, and each play picks a
take (never the last one) nudged by `foley.pitch` / `foley.level`. Recipes render at 24 or 32 kHz
(`Foley.rateOf`) and are peak-levelled by `finish`, so the `gain` in each `sfx*` is its level in the mix
(they were set against the old effects' K-weighted loudness). Everything goes through one small,
short room (`Foley.roomImpulse`, `TUNING.audio.room`, a 0.32 s tail; `wet` sends more), the user
asked for dry, close and quiet (24 Sep 2026: "echo and depth, too loud"), so keep sends small. A sound that knows where it is passes
`GameAudio.heard(dx, dy)` (distance fade and pan, `TUNING.audio.space`), the hound's barks as it runs
(`dog.barkGap` / `barkDart`, a pack held to `foley.barkGap`). The goat's hooves are `sfxHoof` on the
footstep timer (`foley.hooves`). New effect: a recipe in `Foley`, an `sfx*` with a gain, a button in
`tools/sfx-board.html`. Render any recipe in node to look at it (`Foley.render(name, args)`).

**The fog.** Rooms: `room.seen` via `game.revealRooms` (box + 1, or `World.anyFloorSeen`), never
re-hidden; `drawUnseen` paints the rest; everything standing filters through `game.hidden`; corridors
never hidden. Sight: `World.computeVis` shadowcast (`castVis`, `VIS_OCTANTS`, `fog.radius`) →
`world.vis` → `Renderer.drawShade` (`fog.soft` a 3x3 soft mask a texel a tile, `fog.shade`), last in world space; blocked by stone +
`world.visBlock`. Only the renderer reads `vis`. THE ORACLE: `fog.oracle`.
**What he has seen is remembered a tile at a time** (5 Oct 2026, `TUNING.fog.mem`): `computeVis` ORs every cast
into `world.mem` (`World.remember`; tiles lit by hand, niches and clock doors, go through `World.lightTile`), and
on a built floor `drawUnseen` paints no room boxes any more: `Renderer.drawMemFog` lays the floor's fog over every
tile of a room's box not in `mem` (stone let out `mem.solid` steps from a seen tile), a pixel a tile blurred up
`soft` ×, over everything standing, before `drawFloatTexts` and `drawShade`; repainted only round `world.memBox`
(and a newly clamped room's box), never a frame for nothing. `room.seen` and `game.hidden` are unchanged (the
gameplay half: "nothing off-screen lands a blow"); a man on a tile never seen is already not drawn (`inSight`).
Corridors stay never hidden. THE TRIP keeps the old boxes.

**Run code.** `game.runCode(by)`: build, level (T = trip, N = THE DARK), run seed, `seedDeaths` (the count the
level's seed was cut with), room, kills, time, souls, killer, `G` gap between the last two hearts
(`heartLog`), first body (`firstKill`), and last a flags token (`E` easy, `X` god, `J` a LEVELS start,
`game.runJumped`, or `-`). On the death, clear and win cards (`card.code`); leaving a death card, the
win card or the clear card's picture copies it (`copyCode`). `game.replayCode(code)` rebuilds the floor. Burst vs bleed deaths are
counted per browser under `DEATH_KEY` (`TUNING.dev.burstGap`) and shown in the dev drawer.

**The road between floors** (1.80, `Painting.drawRoute`, `TUNING.painting.route`). The clear card is the
floor's picture with no score, seconds or code under it (leaving it still copies the code): under it a
road of a node a floor and OUT after the last, and the build's own goat trotting from this floor's node
to the next (Nuclear Throne's map between areas); THE DARK / THE TRIP name their node where the run put
them (`Painting.floorName`). The death card (`card.map`, `game.deathPainting` baked at death,
`Painting.drawDeath`) fades in over the pull-back: the floor painted the same way, the road with his skull
on this floor, the killer's plate, what he keeps, ASCEND, the run code. No DIED and no floor name
over the picture (30 Sep 2026): the node's label under the skull is `LEVEL n · NAME`.

**Death and restart.** `restartLevel` only from `play` / `paused` / `dead`, and counts as a death. The death
card's RESTART (`Painting.quickRect`, offered `painting.death.quick` s after the blow beside ASCEND; Backspace is
the same) skips heaven, but only while heaven has nothing new (`game.deathNews` = `Heaven.freshNews`: the first
death, a new god's line, a rank now affordable, a bell woken; what a visit showed is `meta.newsSeen`), and the
god still counts it (`Heaven.restarted`); a floor no wider than `painting.oneRow` × its height is painted as one strip. It
restores **exactly** `game.levelBoons` (`keepBoons`), `levelArtifact`, `levelTalRun` (the tallow, the
cup, the tally) and `levelCrowGift`; only in-level souls are lost. **THE MIDDLE GATE** (1.68,
`TUNING.soul.hold.from` = floor index 1 on; **switched off** since 29 Sep 2026 by `hold.on` false,
"for now start at the very beginning", a roguelite shape once the balance settles, so every death,
heaven included, and any old save's `gate` comes back to the head of the floor): opening a floor's first gate (`openSoulGate` on
`soulGates[0]`: its soul, a ware, the milk) arms `game.holdAt`; `holdGate` snapshots `game.checkpoint`
(boons, artifact, talRun, crowGift, tripAt, kills, time, the animal with him) once the card is taken and
no rat ogre is up. A death past it passes the checkpoint to `startLevel(..., cp)`: a **new** layout off
the death count as always (rule 6), then `enterAtGate` stands him in that layout's first gate (door
open, its soul skipped in the budget, her shelf packed), drops everyone and every coop/animal before it,
clamps those rooms at once (`updateClamps(true)`) and puts the kept animal beside him. `levelBoons` etc.
stay the head of the floor (saves, death card via `gate`); `save.gate` carries the checkpoint through
CONTINUE. Any `startLevel` without `cp` forgets it. `quitToTitle` from a floor under way
(`play`, `paused`, `boon`) is a death too (rule 6: CONTINUE never replays a layout). `forgetLessons` resets
once-a-run lines at run start. N needs the dev drawer.

**Heaven** (1.79, `js/heaven.js`, `js/heaven-pixels.js`, `TUNING.heaven`). The death card's button is
ASCEND, and its press is `Heaven.enter(game)` (THE SHOWROOM goes straight round): `game.level`, `world`,
`goat`, `props`, `fx`, `scatter` are replaced with the hand-laid two rooms (`Heaven.level`, def
`HEAVEN_LEVEL` with `heaven: true`), `game.heaven` holds the visit, `state = 'heaven'`, and
`game.mods` is a copy with the souls' fire, poison, bombs and Q verbs off. Everything about the run
(`levelIndex`, `boons`, `levelBoons`, `checkpoint`, `deaths`) is untouched, so `Heaven.leave`, the goat
walking into the drop (`T.PIT`, the edge room's south side), or Backspace, is `restartLevel(true)`
(no guard, no second death) with `game.fromHeaven` set: `startLevel` then drops him in from above
(`game.dropIn`, `Heaven.goatLook` / `updateDrop`, timed to land as the level card clears) instead of up
the stairs. In the air he tumbles at a steady rate (`jump.turns` / `drop.turns`) and rolls over on his
long axis (`flips`, `Heaven.flip`), comes down on his side into the stunned pose, lies `drop.ko` s, a
real `stunned`, no verbs, and gets up over `drop.getup` (1.80). He comes down a shaft of light
(`Heaven.drawShaft`, `drop.shaft`, in his own frame under him), his shadow growing as he nears
(`Heaven.dropShadow`), stretched long at the end (`goatLook`'s `sy`, applied before the spin), and lands in
a ring of motes (3 Oct 2026). On a `startCage` floor he never lands in
the pen: `besidePen` tiles past its bars, `game.cageOpen` set. `quitToTitle` and `pagehide` from heaven are not deaths. Escape pauses it (`pauseFrom`,
`pausedIn`). `Heaven.update` is its own step: GRAB (`rmbDown`'s edge) on `nearest`, the god (`talk`,
`pickTalk` off `meta.told`), the shepherd (`startComb`), the mirror (`openMirror`: `panelKey`,
`panelClick`, `buy`), a filled seat, then `goat.update`, props, `collideEntities`, `updateEffects`,
gold grass (`level.tufts`), the edge. Headbutts on heaven props (`p.heaven`) go to `Heaven.butt` (the
chime: one bell a butt, `HEAVEN_SONG`; the mirror butts back; the old man). `Renderer.draw` hands the
whole picture to `Heaven.draw` and `drawUI` to `Heaven.drawHud`; its bakes (`bakeIsland`, billows
`puffInto` round every floor edge, one outline `outlineInto`; `bakeSea`, `bakeSky`, `bakeWisps`,
`bakeEarth`) are cached in `Heaven.baked`, warmed in idle time from the title (`Heaven.warm`).
**Its tables** (30 Sep 2026, `TUNING.heaven.tables`): 0–2 a visit off `odds`, `noFlip` up there. One
butted into the drop is seen falling (`Prop.fall` → a prop faller, `drawFallers`) and counted in
`game.heavenTables`; `startLevel` from heaven turns that into `game.skyTables`, and `updateSkyTables`
drops each on a man the goat can see, only at the dramatic beat, more than `crowd` men up in his
room and `hurt` hearts lost in this room and the one before (`game.hurtRooms`, pushed by
`Goat.damage`), shadow tracking him until `lock` s out, crushing within `killR`, never the goat; it
lies on its side (`drawSkyTables` ground and air passes). Only that floor.
**The mirror before the edge** (2 Oct 2026): once it is mended (it stands at the bridge's mouth, `heaven.mirrorAt`, so the way down passes it), until he has once opened the mirror (`meta.mirror`, set in
`openMirror`; any rank bought counts, `Heaven.mirrorKnown`) the god will not let him jump: `holdEdge` puts
him back a step off the lip, says `HEAVEN_TALK.notYet` in the god's plate over the goat (every `holdGap` s) and
rings the mirror. Backspace still leaves. **5 Oct 2026 playtest:** nothing is lettered by the edge any more; a
goat who never jumped (`meta.jumped`) and dawdles `heaven.arrows.after` s gets pixel arrows over the lip
(`drawArrows`); the jump is a crouch, a hop, a cloud puff and a shrinking tumble with a beat of white
(`jumpLook`, `heaven.jump`). The broken mirror is mended by the goat himself, GRAB at the glass once his
twenty are in (`interact` → `mend`); the god only sends him. A rank is bought by holding (`startHold`,
`updatePanel`, `heaven.buy`; a lifted pointer is `panelRelease`), the panel hides the HUD purse. Plates
never overlap: `drawPlates` stacks them and keeps `plateRects`, which `drawPrompt` steps clear of.
**The belfry's quest**: one bell awake, one more per floor ever climbed out of (`bellsOpen`, `meta.cleared`
via `floorCleared`), sleeping ones grey and chained (`bell-asleep-n`), shown waking (`updateWake`); the
shepherd gives the quest (`giveQuest`). All eight awake, he plays `heaven.bellSong` (an original march;
`startSong` / `updateSong`), the goat plays it back on falling lights (`songHit`, `drawSongLights`), and
the bells ring on alone `auto` s; butting him replays it. The HEAVEN dev tab has BELL +1 / BELLS RESET.
**CONTINUE comes up here first** (`resumeRun` → `Heaven.enter(game, { visit: true })`: no death
counted, no killer), and the edge drops him into the saved floor. **The belfry**: eight bells
(`heaven.bells`, pentatonic, the god's tune on the first three) on a 52-texel beam; the blind shepherd
answers the chime (`heaven.shepBells`, `SHEPHERD_TALK.bells`). Heaven's harp is `heaven.music`.
**What outlives runs** is `Heaven.meta` under `HEAVEN_KEY` (never cleared by NEW GAME): `sacrifices`
(`Heaven.earn`: `heaven.pay.kill` a white soul as it reaches the goat, `js/motes.js`; a man leaves `motes.per` of them, one, two for the butcher, seer, rifleman, shieldman and thrower, three for an ogre, one more for a boss, swaying `bob` / `sway` px over the body (5 Oct 2026), nothing before the god's gift, `meta.brought` toward his twenty (`gift.mend`: the mirror starts broken, `Heaven.mended`, and the goat mends it, GRAB at the glass, once the god has the twenty, `Heaven.mend`; 5 Oct 2026) and then 200 (`gift.quest`, SECOND CHANCE), `Heaven.goal` under the purse, `pay.floor` a floor in `levelCleared`; not in GOD
MODE or THE SHOWROOM), `ranks` of `MIRROR` (`Heaven.applyMeta` in `applyBoons`: `mods.maxHp`,
`lightHearts`, `goat.light`, set in `startLevel`, spent first in `Goat.damage`, drawn after the hearts,
`grazeMul`, `milkFull`, `rollCooldown`, `invulnAdd`), `saved` (the seats: `Heaven.saved` in
`beginClimb`), and what the god has said (`told`). The dev drawer's HEAVEN goes up from a floor as a
death would; `+100 SACR · +5 SOULS` feeds the mirror.
**Corrupted souls are banked up there too** (1.80): every soul he swallows (the pickup in `Game.update`)
calls `Heaven.earnSoul` → `meta.souls`, and a `MIRROR` entry's `souls[r]` is what rank `r + 1` asks on top
of its sacrifices (`Heaven.soulCost`; only the top ranks of THICK FLEECE, HALO, GOOD GRAZER). **The
purse** (`Renderer.drawPurse`, top right under the rail's corner) is heaven's own look in the play HUD:
the gold skull and `meta.sacrifices`, the wisp and `meta.souls`; heaven's corner (`drawHud`) and the
mirror panel show the souls beside the heap.

**Seeds and saves.** `game.runSeed`; `game.levelSeed(i)` hashes it with level and `deaths`; base 36 in the
corner; **`#seed=k3j9a`** feeds `askedSeed`. `saveRun` → `{ v, level, boons: [id], totalKills, deaths,
score, runSeed, henHearts, tripAt, darkAt, beasts, crowGift, artifact, third, at }` under `SAVE_KEY` (wrapped; `third` is
the head of the floor's third-card count, the one piece of `talRun` a quit must not lose);
`loadRun` validates; winning clears it. **It always writes the head of the floor** (`levelBoons`,
`levelArtifact`, `levelTripAt`, `levelCrowGift`) whenever it is called, a soul taken mid-floor lies on
the floor again after CONTINUE, so saving it too let one soul be farmed, plus the live `deaths`
(`onGoatDied` saves at once). A LEVELS run (`runJumped`) never saves, never clears the save and never
writes BEST; THE TRIP writes no BEST either.
Boons saved by `id`, renaming drops them.

**Score.** `scoreFor(kills, time, levelIndex, def)`: pace vs par (`score.perRoom`, `fastCap`) × `killMul`
(`killCap`). `noteBest` / `noteRunBest` under `BEST_KEY`, which `clearRun` never touches. **The win card
shows the run, not the score** (1.85): `noteRunStart` (NEW GAME, RUN AGAIN; never a LEVELS start) counts
`best.runs`, `noteEscape` `best.escapes`; the card says ON RUN N, the deaths on the way and the bodies.

**Menus.** State `title`, `drawTitle`, `MENU`, `game.menu` (`menuAt`, `menuPick`, `menuKey`). The last row, JOIN THE DISCORD, opens `DISCORD_URL` (`game.openDiscord`). A raised
`menu.panel` owns `menu.rects`. The rows are `game.menuItems()`: MENU less LEVELS unless the dev drawer is
open (30 Sep 2026: "jumping between levels from the menu, dev mode only"). LEVELS (`drawLevelPick`, `game.startAtLevel`) deals the souls a run would
have, touches no save; its first `LEVEL_TOGGLES` rows come before the floors, the `menu.tripPick`
switch (plays `tripLevel(li)`) and THE DARK's own row. `SETTINGS` / `game.settings` /
`SET_KEY`: CONTROLS (5 Oct 2026, `KeyBind` in js/input.js, `settings.binds`: a panel, not a switch, `type: 'panel'`; the
nine verbs on any key or `Mouse<n>`, a clash swaps, `RESERVED` refused; `KeyBind.press` sets the default button's own input
flags in play and heaven only; `bindLay` lays `SKILL_KEYS`, `CONTROL_LINES.key`, `HINT_KEYS` off it; no player-facing
'RMB' / 'LMB', it is RIGHT / LEFT M. CLICK), KEYBOARD ONLY (`keysOnly`, 3 Oct 2026: no verb added, the mouse's two moved onto J headbutt and K
grab held, L the roll beside E; `readMoveInput` aims where he runs through `autoAim` as a thumb does, `kbOn` /
`KB_KEYS` / `CONTROL_LINES.keys` label it, `tripInput` swaps J; Z X C are the same three beside the arrows, `kbUse` names
the set last pressed; any of the six pressed in play with the setting off sets `game.kbLive`, the same mode until a
mouse click or `kbAim.mouseBack` px of mouse travel; standing still the aim snaps wider, `TUNING.kbAim.still`), SHOW THE CLOCK (off), SHOW FPS (off; `Game.frame` counts `fps`, `Renderer.drawFps`; a steady 30 with the game's work under a 60th is named as the browser's cap, Chrome's Energy Saver on battery: the game has no cap), SOUND (`M`), GOD MODE (he also runs `dev.godSpeed` × faster), the dev drawer's GOD kept as a setting
(`toggleSetting('god')` sets `dev.god`; the drawer's GOD throws the same switch), so the itch build,
which has no drawer, still has it; on, a floor writes no best and the run code carries `X`.

**The itch build** (`js/release.js`, 26 Sep 2026). The dev drawer's ITCH BUILD zips the running page
into `doomed-goat-<BUILD>-itch.zip`: index.html with `RELEASE.flag` (`window.GOAT_RELEASE = true`) ahead
of the first script, and exactly the scripts the page loaded, **minified** (1 Oct 2026: terser with
`RELEASE.minifyOpts`, no comments, local names cut, top-level names kept because the scripts share them
as globals; the button loads terser off `RELEASE.terserUrl`, the node script off a local
`npm i --no-save --no-package-lock terser`; no minifier, no zip, and `--plain` is the only way round it,
never for itch). A nuisance to anyone pulling the code, not protection. In that build `RELEASE.on` hides the dev
corner for good (`#dev` included) and ignores `#rules` and the other tool addresses, `#trip` and
`#dark`; GOD MODE is in SETTINGS and says so at the top of the screen. `node tools/itch-zip.js` makes the
same zip from a commit. The zip's page is index.html's head, fetched beside the page on the dev
server; on the artifact, whose `index.html` is artifact.html, `RELEASE.page`'s own copy, which must be
kept in step with index.html, with the script tags the running page actually loaded, never the
fetched file's own list. Where the zip goes is
`RELEASE.hand`: framed as the artifact, the viewer's `downloads` (asked for on the press; the viewer
confirms the save); served anywhere else, a plain link. Opened as a file off the disk the page may not
read its own scripts, and the button says so instead of packing.

**Prologue and opening.** Prologue phases `meadow`, `road`, `dark`, `cloth` → `huddle` (`game.inPrologue`,
`intro.pro`, `updatePrologue`, `Renderer.drawPrologue`, `TUNING.intro.prologue`, `INTRO_STAGE`). The
opening scene (`game.beginIntro`, state `intro`, `updateIntro`, `TUNING.intro`) is unskippable until
watched once (`SEEN_KEY`, `endIntro`); `skipIntro(true)` always works. Its two are `scripted` `Enemy`s,
the mage who takes her (`intro.mage`, a seer, met again at the first gate) and the clubman
(`intro.club`), one heart each so no notches show (`followPath`, `say`); `goat.state = 'ko'` is render-only. Only `startLevel(..., withIntro)` plays it.

---

## Skills

Personal skills in `~/.claude/skills` (added 24 Sep 2026, adapted from Claude-Code-Game-Studios) load by
name when the work matches. They are written for any of the user's games; this table is what each one
means here. ⚠ Personal skills do not load in cloud sessions.

| you are about to | load | here it means |
|---|---|---|
| look at a change in the running build | `web-observe` | `tools/harness.js`, the `#seed=` / `#trip` / `#dark` / dev-tab hashes, `H.shot` |
| touch who spawns where, a threat, a boon, `LEVELS` | `balance-check` | `node tools/balance.js` is the measurement; numbers only into `tuning.js` |
| ask whether `CONCEPT.md`, `README.md` and the game's text match what the build deals | `content-audit` | the registries in `tuning.js`, the pools in `rooms.js`, `GEN_RULES` |
| a design decision changed (the souls economy, 23 Sep) | `design-drift` | docs, hints, barks and backlog lines still saying the old thing |
| a session's ask keeps growing, or the backlog outgrows the pillars | `scope-check` | against `CONCEPT.md` and the playtest feature freeze |
| a playtester's notes, a friend's message, an AI persona's report | `playtest-report` | then a dated batch in `BACKLOG.md`, tagged as usual |
| prepare or run the itch.io playtest | `playtest-report`, `launch-checklist` | `PLAYTEST.md` is the kit (the 23 Sep plan made runnable); results come back as a dated `BACKLOG.md` batch |
| art weight, a newly packed atlas, a data URI | `asset-audit` | `js/*-assets.js` are generated: fix the source and re-pack |
| a new image brief, or a music or SFX brief for the composer | `asset-spec` | the `ART_TODO_GPT.md` format; `MUSIC.md` |
| add or change a hook | `project-hooks` | `tools/hooks/`, see *Publishing* |
| write the weekly itch / Discord post (Monday to Sunday) | `devlog` | `devlog/<Sunday>/` holds `itch.md`, `discord.md` and the shots; only what is on itch goes in |
| improve the art, compare colours, fix a strange floor | `art-pass` | the ART tab (checklist + `ART_PASS` switches), `tools/art-study.js`, `FLOOR_SHEET`, `PIXEL_STUDY`; originals stay on the switch |

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
`game.skipIntro(true)`, and sets `game.autoPause = false` (a blur or a hidden tab pauses a fight since the
polish pass; `tools/smoke.js` turns it off too); to watch the scene itself, call `game.menuPick(0)` on the title and wait for
`game.state === 'intro'`. `game.startLevel(0, seed, false, 'force')` replays it from anywhere (plain `true` skips it once `introSeen`). A run left
in `localStorage` by an earlier test is what CONTINUE offers, `game.clearRun()` forgets it.

**Traps that have bitten before, in this exact order:**

- Testing a hound's dodge or bite without waiting out the goat's headbutt recovery (0.53s) between
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
`game.dev.god` is on, a dead goat freezes every enemy, which reads as the feature under test being broken.

**Before calling a build playable, run the smoke bot** (`tools/smoke.js`, loaded in the page like the
harness): `SMOKE.run(['L0','L1','L2','L3','L4','L5','L6','L7','N','T2'], [11, 22], 'now')`, then
`SMOKE.report('now')`. Every floor should end `OK` with no throws and no NaN. It is off the clock and
slows to a crawl while the pane is hidden, so leave the pane open while it runs.

**When something stutters, measure it** with `tools/perf.js` (loaded like the harness): `await
PERF.frames('L3', 11, 200)`, then `PERF.spikes` for what an over-budget frame spent. Never judge a
frame from a loop that draws hundreds back to back in one task, the GPU work piles up and lands as
stalls no player gets; `PERF` yields between frames. A first-time bake (`studyOf`, `flameFrames`,
`FLOOR_SHEET.tile`) is timed alone with `performance.now()` round one call on a fresh page.

**After changing a number a doc states** (a count, a blow, a heart, a cooldown), run `node tools/doc-numbers.js`;
it reads the sentences in README, CONCEPT and CLAUDE that quote that number and says which went stale.

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
the remote is not live. Never stop at the feature branch and never leave `main` behind, if a session
was developing on `claude/<something>`, merge that branch into `main` and push `main` as part of the
deploy, then publish. Opening a pull request instead is only right when the user asks for one.
**Fourth: the itch page** (1 Oct 2026, https://dimache.itch.io/doomed-goat, `dimache/doomed-goat` is the
default of the script; butler lives in `C:\Users\USER\butler` and is on his user PATH, logged in): `node tools/itch-push.js`
**from a clean checkout of the pushed commit**: the minified zip replaces the build on the page; its visibility
is the page's. Another session usually has the shared tree dirty, and the script refuses that, so cut it from a
`git worktree` at the pushed commit (symlink or copy `node_modules` for terser) rather than `--dirty`, which would
ship someone's half-done files to testers. If butler is missing or logged out, say so and leave the login to him;
never handle the itch key.

The artifact is published from `artifact.html` with every script passed as supporting files, and
always to the existing URL. Republishing without the `url` creates a second artifact.

- `file_path`: `artifact.html`
- `url`: `https://claude.ai/code/artifact/098e742b-e742-4ce7-8499-a303fa5db021`
- `root`: the project directory
- `files`: every file in `js/`, mapped path-to-path (never `index.html`: in an artifact that path is the page itself)
- `capabilities`: `{ downloads: true }`, SAVE THE PICTURE (`js/painting.js`) asks for it and hides
  itself without it. A non-empty declaration replaces the stored one whole; omit it on a redeploy
  that changes nothing here and the stored one carries forward.
- `label`: a short version tag, for example `0.7 whatever landed`

If you add a new file under `js/`, it must go into three places: both HTML files' script lists and the
publish `files` map. Forgetting the map means the live page breaks while the local one works. If you
delete one, remove it from all three (pass `null` for it in the `files` map).

Run **`node tools/check-sync.js`** to confirm all three copies agree: it fails on a dirty tree, a `main`
that is ahead of or behind the remote, a branch that was never folded in, script lists that have drifted
apart, and a file in `js/` that no HTML file loads. The artifact half needs the published sizes, which
only Claude can fetch, `action: "list"` with `scope: "files"` on the artifact URL, so save that listing to a file and
pass it as `--artifact <file>`; without it the script prints the local byte counts to compare by eye.

**Two of these are enforced, not remembered** (`.claude/settings.json`, since 24 Sep 2026).
`tools/hooks/guard.js` runs before every Artifact call and every Bash command that pushes, and refuses
(the reason comes back as the tool's error) a publish of `artifact.html` without the game's `url`, with
a `files` map that leaves out any script it loads, or with `capabilities` that drop `downloads`; and a
publish or push while a file in `js/` or `tools/` does not parse or the script lists have drifted. A push
that carries changes to `gen.js`, `rooms.js`, `rules.js` or `tuning.js` gets a reminder to run
`tools/balance.js`, not a refusal. If a push is refused over another session's unfinished file that is
not part of it, say so in the command: `git push # prepush-ok: <why>`. `tools/hooks/compact.js` keeps the
user's messages verbatim across a context compaction (in `.claude/session-state/`, gitignored).
Hooks load when a session starts.

---

## Conventions

- Two-space indent, semicolons, single quotes. Dense one-liners are fine where they read cleanly.
- **No em dash, anywhere** (1 Oct 2026, the user's rule): not in game text, code, comments, docs, commit
  messages or replies. A comma, a colon, a full stop or parentheses; every one in the repo was replaced that day.
- All prose in the game and in the code is English. The user writes in Russian and English; reply in
  whichever they used.
- Palette colours come from `PALETTE`, never as literals, except for one-off shading tints inside a
  single sprite.
- Fonts are `FONT` and `FONT_SC` constants in `render.js` (Alegreya and Alegreya SC from Google Fonts); the title's
  name alone is `FONT_LOGO` (Jacquard 24, pixel blackletter, mixed case: `LOGO_TEXT`).
  Spoken lines (barks, floats, animals, prologue) and description text (boon card, shelf note, skill
  note) go through `FONT_PICK.font('say' | 'text', px)` instead, which the dev drawer's SPEECH / TEXT
  rows cycle through five families (kept in `localStorage`; the itch build always reads entry 0).
  A new family goes into `FONT_PICK.list` and the Google Fonts link in both HTML files and `RELEASE.page`.
- Version history and the reasoning behind each change live in `CHANGELOG.md`.
- **Text must be readable** (30 Sep 2026: "the dev tools' fonts are tiny everywhere, make it readable,
  make it a rule"). Screen-space text is never under 12 CSS px (canvas px = CSS px × `renderer.s`):
  size fonts off `renderer.hs` / `ts` with that floor in mind. The dev drawer enforces it itself,
  `Renderer.drawDev` draws at `dev.uiScale` × and floors every `ctx.font` it is handed at
  `dev.minText`, so a new tool tab gets it for free; world-space text (floor words, barks) is exempt,
  it scales with the camera.

---

## Open questions the user has not settled

- Mirrors as an environmental puzzle. The original voice note said "lizards and mirrors"; the mirror
  half was interpreted as a puzzle object and parked. The other half is still unresolved.
- Where his wife is. The opening scene's mage carries her off, and the first gate (`game.bless`, 1.75)
  shows him taking her on through it; nothing after that refers to her: no room, no ending.
- **Parked, not open** (26 Sep 2026, "later"): three lives on a run (one life stays per level until
  then), a Priest boss, the later acts, the hunt, hell, heaven as a secret ending (a
  run that swallowed no soul; the pasture between deaths is built, 1.79), and the second talisman
  slot (for the acts). Kept in plans, not to be built without asking. Decided against:
  hearts that grow by floor, the chain headbutt. Settled: two souls a floor, in the middle and at
  the end; a full slot deals swaps. A souls *resource* stays decided against (23 Sep 2026).
- Market and positioning (gore, price, publisher, a GIF export; `MARKET.md` §9): "later", not today.
- The endless roll against a wall, reported in the 14 Sep 2026 playtest and **not reproduced**: see
  `BACKLOG.md` for what was measured and what to ask him. The soul barrier from the same batch was
  parked, for the reason pillar 1 gives; everything else in it shipped in 1.4.

`CONCEPT.md` is the current design truth.
