# ART_HANDOFF — status of the painted-art pass, for whoever picks it up next

## September 16 update: walls and combat effects

Build 1.26 uses `PaintedArt.wallTile` for all four facings and their 16 junction masks
on all seven levels. The earlier wall-mirroring/coping notes below are superseded.
Door art and placement remain unchanged; broken doors and crates now emit persistent
wood/metal debris through `CombatFX`. Deaths retain the victim's painted sprite;
explosions and devouring split it. Blood and scorch have a sparse detailed ground layer.
The new eight-frame fire, witchfire, explosion and blood atlas and its generation prompt
are in [assets/combat-fx/README.md](assets/combat-fx/README.md). Both HTML script lists
include `combat-assets.js` and `combat-fx.js`. Browser regression: `tools/check-art.cjs`.

## Playtest correction — same day, off one screenshot of the live build

A dying butcher/elite bearer tore into clubman gore (`CombatFX.snapshot` had its own kind map
instead of reading `PaintedArt.characterKey`), the near wall of a room read as bare rock next to
a clearly bricked far wall (the near face's 0.27 shade overlay was crushing its own coursing —
down to 0.1), and a hunter's aim tell had gone dark once his painted sprite replaced the
primitive body that alone drew it (now its own method, `drawAimTelegraph`, called for either).
All three fixed; reasoning in `CHANGELOG.md` under 1.26.

**Still open, same screenshot:** the far side of a wall — what should show through a doorway or
round a corner as the tilt looks past it — did not read as "pulled" the way the request asked.
`wallTile`'s four faces are geometrically symmetric (each anchored at its own tile's floor-facing
edge, `lip` 40 of 128), so if this persists after the shade fix above, the next lever is `lip`
itself or whether a corridor mouth needs a second wall row rendered through it — not shade. Needs
a second screenshot once the shade fix has been played against, since some of the original
complaint may have been the same near/far contrast read from a different angle.

## Playtest correction — same day, after the first look at v2 in motion

The five new static-facing units (hunter, brute, butcher, wraith, chicken) packed short:
`assets/painted-expansion-v2/pack.cjs`'s `frame()` fit every character to `maxH: 96` out of
the 128px cell — 75% of the cell — while the existing clubman walk sheet fills closer to
80%. Nothing was actually cropped (the source art has full boots, confirmed against
`source/hunter.png`), but at the same on-screen `width` a 75%-fill character reads shorter
and squatter than an 80%-fill one standing next to it — reported as "not full height, torn
from the ground" and a size mismatch between the clubman and the new units. Raised to
`maxH: 102` (102/128 ≈ 79.7%, matching the clubman's own fill) and re-ran the packer; two
safety pixels are kept under the `baseline: 104` ceiling so a tall hat brim can't clip the
top of the canvas. Confirmed in-browser against a debug shadow marker (`Renderer.shadow`
patched to draw a crosshair at the exact `(e.x, e.y)` it's called with) that every new
unit's feet now land on its own shadow, at gameplay zoom, across several directions.

Healing grass (brief item F, below) was also reverted: shrunk to a quiet static 23px patch
per the brief, it then read as too quiet once actually played — a heal spot has to find the
eye in a moving crowd the way a lamp's firelight or the soul wisp does. Back to the original
44px `healing-grass` atlas stamp with its shadow and slow bob; `healingGrassTight` is still
packed but no longer drawn by anything.

## Current status — expansion v2 integrated locally, 2026-09-15

**Brief items A, B, C, E and F below are complete in the local build.** The earlier
status and commission text below are retained as history, not an outstanding queue.
Full delivery notes: `assets/painted-expansion-v2/HANDOFF.md`; visual inspection:
`assets/painted-expansion-v2/preview.html`; browser evidence and screenshots are in that folder.

- User chose hunter body/hat B with bandaged arms C and an old flintlock musket;
  brute B without spikes, closer to the rusty-red bearer; butcher D; wraith A;
  chicken D. All five now have **8 static facings, one frame each**, explicitly
  replacing item B's request for four walk frames. Existing other walk cycles remain.
- Clubman, brute and butcher received the user's right-hand weapon correction;
  compass rows are remapped when mirrored, with targeted brute/butcher corrections.
  The champion now uses the plain brute art; spikes are reserved for a future type,
  which this art pass does not add or rebalance.
- Six sets of eight floor/wall/board textures now render on levels 2–7. Level one's
  existing walls remain. The tile dispatch is level-agnostic, while the ritual and
  other level-one-specific decoration still use the existing `renderer.altar` gate.
- Single-post cage art keeps individual lean/wobble and the connecting procedural rail.
  Breaking either cage stamps the bent-post art onto the existing decal canvas.
- Four top-down door types now stamp a tight **26×116 source at 13×58 world pixels**,
  turned 90° for the other wall orientation. The current continuous swing, collision,
  pressure, hit counts and soul markings remain. Broken door art leaves a decal.
- Healing grass was repacked as a quiet 23px patch; reverted the same day, see the
  playtest correction above — it renders at the original 44px size again.
- `js/painted-assets-v2.js` is embedded and loaded in both `index.html` and `artifact.html`.
  The packer and manifest are in `assets/painted-expansion-v2/`; source images are retained.
- Validation passed: 59 nonempty exported cells with transparent edges, all 40 new
  compass selections, static columns while moving, ghost/materialized opacity,
  cage decals, all seven level texture sets, door orientations/open amounts, and
  both HTML builds loading 103 assets without page errors. See `browser-validation.json`.

**Optional item D remains optional:** crate debris and a new decorative wall-torch
fixture were not added. This is a local integration; no remote artifact publication
was requested or performed in this pass.

---

This is for the session that generates and packs art (currently GPT, working through
`output/character-concepts/` and `tools/pack-painted-art.cjs`). It says what is already
painted and wired into the game, and what is still the placeholder canvas shapes. Read
`CLAUDE.md` first for how the two art layers fit together — this file only tracks the
gap between "painted" and "not yet."

---

## Done and live (shipped in 1.14)

Four characters and one room's worth of scenery, level one only:

- **Characters** — `sheepFront/Back` (the goat), `clubmanFront/Back` (bearer),
  `mageFront/Back` (seer), `houndFront/Back` (dog). Wired in `PaintedArt.characterKey()`
  in `js/painted-art.js`.
- **Tiles** — `stone0-3`, `wallFace`, `wallTop`, `boards0-1`. Wired in `PaintedArt.drawTiles`.
- **Objects** — `altar`, `banner`, `barrel`, `brazier`, `crate`, `gong`, `hay`, `lamp`.
  Wired in `PaintedArt.drawProp` and `PaintedArt.drawRitual`.
- The ritual altar is a real `table` Prop now (`isAltar` flag), not decoration — it blocks
  and takes a blow like any other table. See `Game.startLevel` and `CLAUDE.md`'s Props
  section.
- Source spritesheets live in `assets/painted/source/` (`characters.png`, `objects.png`,
  `tiles.png`); `tools/pack-painted-art.cjs` cuts, trims and packs them into the individual
  PNGs in `assets/painted/` and embeds those as base64 in `js/painted-assets.js`.

Everything else — every enemy not in that list, every prop kind not in that list, and every
level but the first — still falls back to the original primitive-shape rendering in
`js/render.js` / `js/altar-art.js`. That fallback is deliberate, not broken: `PaintedArt
extends AltarArt` and only overrides what has been painted.

## Expansion pack integrated — 2026-09-15

`assets/painted-expansion-v1/HANDOFF.md` describes the separate asset package GPT
delivered: four approved units with 8 directions and 4 walk frames, sheep tail wag,
8-frame brazier/torch/lantern fire loops, four door types with four states, and 16
level-one props. Open `assets/painted-expansion-v1/preview.html` to inspect the
animations. Claude wired the pack into the runtime the same day: `tools/pack-painted-
expansion.cjs` base64-embeds the already-packed sheets (`units/*-walk.png`,
`effects/*-fire.png`, `doors/*.png`, `objects/atlas.png` — the idle sheets are not
embedded, since idle is just column 1 of the walk sheet) into `js/painted-assets-v1.js`,
loaded by both HTML files right after `js/painted-assets.js`. `js/painted-art.js` reads
both asset files into one `PaintedArt` instance.

**What changed and where it now shows:**

- **Sheep, clubman, mage, hound** (`PaintedArt.character`) draw the real 8-direction
  walk cycle instead of the old mirrored front/back pair with a shear-and-bob fake
  trot. Row picks the facing (the manifest's own `atan2(dy,dx)` convention, which is
  also this game's `facing` convention — no transform needed), column picks the walk
  frame; idle holds column 1. Windup/swing now lean along the real facing angle rather
  than a screen-space nudge that only ever worked because of the old mirror. Falls back
  to the original front/back stamp if a walk sheet fails to load. This was never gated
  to level one, so it's already live everywhere.
- **Brazier and lamp** (`PaintedArt.drawProp`) draw the animated 8-frame fire loop
  instead of a static bowl/post. Along with **crate and bell**, these are no longer
  gated to level one — `Renderer.drawPropBody`'s painted check is now
  `this.painted.ready` instead of `this.altar` (which stays level-one-only, for tiles).
  So all four now render on every level.
- **Doors — tried, then reverted; still fully procedural.** See **Still not wired**
  below and brief item **E**: the delivered door art doesn't fit this game's door shape
  and shipping it looked worse than the plain slab, so it was pulled back out the same
  day it went in.
- **Worktable, weapon stand + sword + shield, healing grass, spike plates, mill hub,
  mill arm, secret wall, soul wisp** now use the atlas art (`objects/atlas.png`),
  all level-agnostic. Spikes keep their arm/idle/arming distinction (down still shows
  teeth, since it's still retracting). The mill arm — a moving hazard whose readability
  is load-bearing, see `CLAUDE.md`'s **Trap sense** — is stretched from the atlas beam
  to the tuned `TUNING.mill.armLen`, verified in-browser at gameplay zoom rather than
  guessed; the iron tip is still a small procedural block on top, kept for the "this
  end kills" tell. The secret wall is tinted to each patch's own `p.wallColor` at draw
  time (`PaintedArt.secretWallTinted`, cached per colour) so it still hides until it
  cracks — the delivered art is one fixed stone colour and would otherwise give every
  hidden wall away by its color alone. The soul wisp keeps its procedural halo (before)
  and orbiting sparks (after) — those are what read as motion — with only the static
  teardrop body swapped for the art (`Renderer.soulWisp`).
- **Cage bars are still fully procedural, and this is a real finding, not a gap**:
  `cage-bars.png` / `cage-broken.png` turned out to be a whole three-post fence panel,
  not a single post — this game builds the pen from one `Prop` per individual bar
  (`buildCage` in `gen.js`), so stamping the panel on every bar would triple-draw posts.
  See the brief below for the correction to ask for.

**Doors reverted — the delivered art doesn't fit and shipping it looked worse than the
plain slab.** `doors/{wood,iron,vault,soul}.png` are a square, front-facing door leaf
(128×128, meant to be seen face-on, like a side-view or first-person game would draw
one). This game's door is a thin slab spanning a wall gap — `13×58` px standing in a
horizontal wall, `58×13` in a vertical one, roughly a 1:4.5 ratio — because the camera
looks down at it. Stamped at any size that reads as "a door" the square art either
floats as a small disconnected icon in the gap (see the screenshot in the brief, item
E) or has to be squashed sideways until the plank/iron banding is unrecognisable.
Reverted the same day in `Renderer.drawPropBody`'s door branch back to the fully
procedural slab; `PaintedArt`'s door-stamping code was removed rather than left dead.
See brief item **E** for the redo.

**Still not wired — no clean hook, left for a future pass or a data-model change:**

- **Crate-debris.** A shattered crate is removed outright (`Prop.shatter` in
  `entities.js`) and never re-rendered; there is no lingering Prop or decal to stamp
  the debris art onto. Would need a small addition to `shatter()` (a brief decal stamp
  on `world.decal`, the same pattern already used for blood and scorch marks) — that's
  a deliberate scope call, not a missing asset, so it's listed in the brief below rather
  than requested again.
- **Torch-fire.** No fixture to attach it to — only `brazier` and `lamp` exist as lit
  Props today; there is no decorative wall-torch object in the game.

## Historical gaps before expansion v2 (resolved above)

In roughly the order a playthrough meets it:

1. **Hunter, Wraith, Butcher.** No art exists — `characterKey()` returns `null` for all
   three, so they still render as the old vector shapes on every level. **Concept sheets
   already exist and are unused**: `output/character-concepts/remaining-characters-v1/`
   (four design options each, A–D, generated but never turned into full sheets or
   integrated — see the brief below for which option to take forward).
2. **Levels two through seven's tiles and walls** (THE YARD, THE ROAD, THE THRESHING
   FLOOR, THE BRIDGE, THE RAFTERS, THE OSSUARY). `renderer.altar` (the tile/wall/mill-
   decal layer) is still only set when `game.levelIndex === 0`, because no other
   level's floor/wall art has been drawn yet — the characters, fixtures, doors and
   props above are level-agnostic and already show everywhere, but the ground under
   them is still procedural past level one.
3. **Doors** — redrawn to the game's actual proportions, not the delivered square leaf.
   See brief item E.
4. Cage bars (single-post correction), healing grass (too big and busy at gameplay
   scale — brief item F) and, optionally, crate-debris and torch-fire — see the brief
   below.

---

## Original commission brief — technical spec, 2026-09-15 (A/B/C/E/F delivered)

Six separate asks. Each can be delivered independently; none block each other.

### A. Levels 2–7: tile and wall art, one set per level

Same deliverable shape as the level-one set already live (`assets/painted/source/tiles.png`,
packed by `tools/pack-painted-art.cjs`): **8 tiles a level** — `stone0-3` (floor variants),
`wallFace`, `wallTop`, `boards0-1` (the worked-floor variant `js/altar-art.js`'s
`prepare()` scatters through storage rooms) — same 128px-ish source-cell convention as
that pipeline, so it can be packed the same way (a new source sheet, or a row added to
one, plus the crop math in a `pack-painted-<level>.cjs` copied from the existing packer).

Match each level's **existing procedural palette** below — these are the exact colors
`js/tuning.js`'s `LEVELS` already use for the fallback floor/wall/fog, so the painted
version should read as the same room, not a different one:

| # | Canon (`js/tuning.js`) | Idea | floor / floorAlt | wall / wallTop | fog |
|---|---|---|---|---|---|
| 2 THE YARD | FIRE | "Coals and straw. Every room has something in it that burns, and by the time the mage lights the ground you have already lit it yourself." | `#8a7554` / `#907b5a` | `#3b2233` / `#55344a` | `#120d12` |
| 3 THE ROAD | THE LINE | "Long sightlines and hard cover. A rifle owns whatever it can see..." | `#4a3a2e` / `#524032` | `#2a2430` / `#3e3346` | `#0b0a0d` |
| 4 THE THRESHING FLOOR | OPEN GROUND | "Almost no wall. What kills is what is standing in the room..." | `#5f5a4a` / `#67624f` | `#7b6c50` / `#9d8c69` | `#0b0b0a` |
| 5 THE BRIDGE | THE FUNNEL | "Seven men are one man in a doorway..." | `#2f3640` / `#353d48` | `#1d2028` / `#2f3440` | `#06070a` |
| 6 THE RAFTERS | THE DROP | "The floor is not all there. Holes in the boards and windows in the walls..." | `#4b433a` / `#544a40` | `#241d1a` / `#453629` | `#06060a` |
| 7 THE OSSUARY | THE NICHE | "A body cannot form inside stone. Niches and lanes take arcs away from the dead..." | `#22242b` / `#282a33` | `#3a3730` / `#565044` | `#05060a` |

THE YARD (fire) and THE THRESHING FLOOR (open ground, warm/dusty) are the two most
distinct from THE ALTAR's cold stone and from each other — good ones to start with if
this lands in batches rather than all six at once.

Three things about the tile layer were settled while this brief was open, and a new set has
to keep to them:

- **The hay bale is already level-agnostic.** `T.HAY` stamps the painted bale on *every* level
  now — `Renderer.drawTiles` falls back to the old flat yellow square only while the art is
  still loading. So a level set does not owe a hay tile, and a painted bale has to sit happily
  on six different floors.
- **`wallTop` is a coping and it only draws where it faces out of the room.** `drawTiles` skips
  it on any wall tile whose north neighbour is floor — a room's bottom wall, where what you are
  looking at is the inner face and there is no top of it in view. Drawn there it read as a pale
  stripe painted along the edge of the floor. Paint `wallTop` as the top surface of a wall seen
  from slightly in front of it, not as a band that works anywhere.
- **A prop's shadow belongs under the sprite's own feet.** Every stamp is anchored (`0.5`
  default, `0.875` for the fire loops), and the shadow offsets in `PaintedArt.drawProp` are
  tuned to where the *opaque pixels* of the cell end, not to where the cell ends: the lantern's
  art stops twelve source pixels short of the bottom of its 128px cell, and the shadow drawn at
  the cell bottom sat a body's length below the post. If a cell's padding changes, the shadow
  offset in that branch changes with it.

### B. Hunter, Wraith, Butcher: full character sheets

Concept sheets already exist and were never taken further — `output/character-concepts/
remaining-characters-v1/{hunter,wraith,butcher}-options.png`, four options (A–D) each,
per that folder's own `prompts.json` ("design alternatives... not integrated into game").
Recommendation, each with one line of why — happy to be overridden:

- **Hunter — option B** (wide-brim hat, bandolier straps): the hat silhouette reads as
  "rifleman" fastest at gameplay zoom and distinguishes him from the hooded bearer/seer
  at a glance, which matters since he's usually seen at range.
- **Wraith — option A** (plain tattered shroud, least surface noise): the wraith has to
  read as *not a man* in the half-second it manifests; the busier options (rope sashes,
  heavy tearing) cost readability that a boss with a "you cannot hit this most of the
  time" mechanic can't spare.
- **Butcher — option D** (bare arms, wide-horned skull): bare arms read as "brute" at a
  glance and the horns give the widest, most distinct silhouette on turn — he's already
  "a clubman built twice over," and the silhouette should say so before anything else does.

Whichever is chosen, generate the **same deliverable shape as `assets/painted-expansion-
v1`**: an 8-direction, 4-frame walk sheet per character, `512×1024`, 4 columns × 8 rows,
128×128 frames, same row order (S/SW/W/NW/N/NE/E/SE) and the same ground origin `[64,104]`
— see that pack's own `manifest.json` and `HANDOFF.md` for the exact convention, so
`js/painted-art.js`'s existing `character()` code (row = facing, column = walk frame)
needs nothing new to read it. Idle is column 1, same as the other four — no separate
idle sheet needed. Hunter needs no held-weapon variant baked into the sheet; the rifle
already draws as its own thing in `js/render.js`.

### C. Cage bars — a correction, not a new ask

`assets/painted-expansion-v1/objects/{cage-bars,cage-broken}.png` are a three-post fence
panel. This game's pen (`buildCage` in `js/gen.js`) is built from one `Prop` per
individual bar, each leaning independently as it takes hits (see `CLAUDE.md`'s
**The pen**) — a panel sprite doesn't fit that model. What's needed instead: a
**single post**, 128×128 like the rest of the atlas, upright and centred, in the same
iron style as the existing panel — plus a second frame for it bent/knocked flat, for
the state after the pen's last blow (`p.broken`, `js/entities.js`'s `Prop.smash`/
`breakCage`). Two frames, not four; there's no "opening" state, a bar is up or it's down.

### D. Optional, not blocking

- **Crate-debris** (`objects/crate-debris.png`) has art already but nothing in the game
  currently leaves a lingering mark where a crate shattered — if a follow-up wants this
  used, say so explicitly, since wiring it means adding a small decal stamp to
  `Prop.shatter()` in `entities.js` (`world.decal`, the same canvas blood and scorch
  already use), not just packing the art.
- **Torch-fire** (`effects/torch-fire.png`) has no object to attach to today — only
  `brazier` and `lamp` exist as lit Props. A decorative wall-mounted torch (not a Prop,
  just a scatter in `PaintedArt.drawTiles` the way `banner` already is) is a plausible
  small addition if there's appetite, but nobody has asked for it yet.

### E. Doors — redraw to the game's actual shape, and prove it by testing in the running game

`doors/{wood,iron,vault,soul}.png` were tried and reverted the same day (see above): they're
a square, front-facing door leaf, 128×128, drawn as if seen straight-on — this game looks
down at a slight tilt (`TILT` in `js/tuning.js`) and its door is a **thin slab spanning a
wall gap**, not a leaf you see the face of. Stamped at any size that reads as "a door," the
square art either floats as a small disconnected icon inside the gap or has to be squashed
sideways until it's unrecognisable — a screenshot of exactly that problem is what prompted
this brief. What's actually needed: art drawn **at the game's own proportions from the
start** — roughly **1 wide to 4.5 tall** (a door in a north/south-running wall; the other
orientation is the same shape turned 90°), no surrounding frame baked in (the level's own
wall tiles already frame the gap — see `js/render.js`'s wall drawing), four states in one
sheet as before (closed / opening / open / broken), one sheet per door kind (wood, iron,
vault, soul). Trimmed transparent padding matters more here than in the square props: at
that aspect ratio, padding on the long axis wastes most of the resolution.

**Before calling this delivered, integrate it and look at it in the actual game** — not
just `preview.html` in isolation, which is exactly what let the square-leaf mismatch
through last time. `node tools/serve.js 8766`, walk (or `H.tp`/`H.walkTo` from the console
harness — see `CLAUDE.md`'s **Testing**) up to an ordinary corridor door, and take a
screenshot close enough to judge whether it reads as a door filling its gap rather than an
icon floating in it, the way the door in this session's screenshot did not.

### F. Healing grass — too big and busy, simplify

`objects/healing-grass.png` reads oversized and detailed for what it is on screen: it's
stamped at about 44px wide (`PaintedArt.drawProp`'s `heal` branch, `js/painted-art.js`) —
a small patch of grazing-grass on the floor, not a hero prop. The old procedural version
(`js/render.js`, the same branch's fallback) drew it as a handful of thin blades over a
small dirt ellipse, on purpose: it has to sit quietly in a room among braziers, crates and
men, not compete with them. Ask for fewer, simpler blades and a smaller footprint —
something that reads at a glance from gameplay zoom as "a patch of grass," not a bush.

## How to add a character (the pattern that already worked four times)

1. Generate front/back views at the same camera and scale as the existing four —
   `output/character-concepts/prompts-v3.txt` has the exact prompt language that got
   the accepted sheet (camera angle, palette size, outline weight, transparent
   background). Match it rather than reinventing the brief.
2. Add the new character's column to the `characters.png` source sheet (or a new source
   sheet) and extend the `columns` array and the crop math in
   `tools/pack-painted-art.cjs`'s `pack()` loop.
3. Run the packer (`node tools/pack-painted-art.cjs`, needs `sharp` on `NODE_PATH` —
   the game itself has no dependency on it) to regenerate `assets/painted/*.png` and
   `js/painted-assets.js`.
4. Add one line to `PaintedArt.characterKey()` in `js/painted-art.js` mapping the
   `Enemy.kind` to the new asset key.
5. `node tools/serve.js 8766`, load the harness, spawn one of the new kind
   (`H.freeze()` first), and check it renders, flips left/right correctly, and reads
   at gameplay zoom before calling it done.

Once a batch of new art lands, update this file: move the finished item from "Not done"
to "Done," and if the whole list empties out, this file can go — the gap it tracks will
have closed.
