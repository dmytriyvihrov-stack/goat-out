# ART_HANDOFF — what the game is drawn with, and how to add to it

The game is on **Pixel 2.5**. Everything in this file is the state as of 23 Sep 2026. The painted
pass that came before it (painted sheets, per-level painted tile sets, `assets/painted*`) is gone
from the tree and lives in git history; read `VISUAL_REFERENCE.md` for why the pixel density is
what it is before starting a fresh pass.

---

## Three layers, in order of preference

| Layer | Where | Draws |
|---|---|---|
| **Pixel units** | `js/pixel-assets.js` (generated), drawn by `PIXEL_ART` in `js/pixel-art.js` | The goat (8 idle + 8×4 walk, horns recoloured off the atlas by `PIXEL_ART.horns`), clubman, brute, mage, hound, hunter, butcher, wraith, hen, rat ogre, the pet sheep (the intro's ewe) — 8 facings each — and the four one-view allies: mouse, goose, raven, tortoise. |
| **Pixel environment** | `js/pixel-env-assets.js` (generated), drawn by `PIXEL_ENV` in `js/pixel-art.js` | Floor swatches for every level (rooms: `PIXEL_ROOMS`; cave and trip: `PIXEL_FLOORS`), the brick face and stone cap of every wall, crate, barrel, hay, table, pillar, brazier, floor litter, boulders, stalagmites, shrooms, crystals. |
| **Painted props (frozen)** | `js/painted-assets.js`, drawn by `PaintedArt` in `js/painted-art.js` | Only what has no pixel sprite yet: the ritual altar, wall banner, gong, lantern loop, the props atlas (sword, shield, weapon stand, spike grating states, big healing grass, soul wisp, mill hub and arm), cage posts, door slabs. |

Anything with none of the three falls through to the canvas primitives in `js/render.js`
(`Renderer.drawProp` and friends). Combat effects — flame loops, blood, gore — are `js/combat-fx.js`
over `js/combat-assets.js` (source `assets/combat-fx/effects.png`, packed by `tools/pack-combat-art.cjs`).

`PaintedArt` is still the class every character goes through (`PaintedArt.character`): it owns the
lean of a windup, the tilt of a man on the floor, the wraith's fade, the goat's collar and wounds.
The sprite itself always comes from `PIXEL_ART.draw`.

---

## Still to be drawn in pixel

These are the painted or primitive leftovers, most visible first. `ART_TODO_GPT.md` turns them into
ready image-generation briefs, six sheets in priority order:

- **Doors** — wood, iron, vault, soul gate: painted slabs today (`PaintedArt.doorSlab`, `brokenDoor`).
- **Weapons and the stand of arms** — sword, shield, rack (props atlas).
- **Spike grating** — idle / arming / up (props atlas).
- **The wheel** — hub and arm (props atlas).
- **Soul wisp** and the **big healing grass** (props atlas); the ordinary sprout is primitive.
- **Gong, lantern, altar, wall banner** — painted.
- **Cage bars** — painted posts; the broken post is painted too.
- **The mouse's burrow** (`Renderer.drawBurrow`) and **the ware stool** (`Renderer.drawWare`) — primitive.
- **Bomb** — primitive on purpose so far (a dark shell and a burning fuse).
- **Ominous decals** — `output/pixel-ominous-decals-2026-09-23` holds three floor pictograms and a
  wall sign, generated and measured but **not integrated**. The cult pictograms on the decal canvas
  (`world.js`) are the natural place for them.

---

## The pipeline

1. A hand-off lands in `output/<pack>-<date>/` with `source/*.png`, a `manifest.json` of measured
   rects, and a `HANDOFF_CLAUDE.md`. Read the hand-off; the rects are measured, never the equal grid.
2. Pack it with the PowerShell packer (Windows PowerShell 5.1, System.Drawing, no node image library):
   - units: `powershell -ExecutionPolicy Bypass -File tools/pack-pixel.ps1` → `js/pixel-assets.js`
   - environment: `powershell -ExecutionPolicy Bypass -File tools/pack-pixel-env.ps1` → `js/pixel-env-assets.js`
   Never edit the generated files by hand.
3. Wire it in:
   - a new unit: its world-px size in `PIXEL_EXTENT`, the slot it fills in `PIXEL_UNIT`, and
     `PaintedArt.characterKey` returning that slot for the enemy kind;
   - a new environment item: a name in `PIXEL_ENV_ID`, then `PIXEL_ENV.draw(ctx, name, x, y, w, ay)`
     at the prop's draw site, keeping the old draw as the fallback;
   - a new floor look for a level: an entry in `PIXEL_ROOMS` keyed by the level's `canon.id`.
4. Check it in the running game at the real camera (see *Testing* in `CLAUDE.md`), on a dark level
   and a light one: swatches are multiplied by the level's own colours, so a swatch that reads on
   THE YARD can vanish on THE BRIDGE.

Sizes: a unit's whole `sourceExtent` is `PIXEL_ASSETS.target` px in the atlas and `PIXEL_EXTENT`
world px on screen; the foot point sits at the origin, where the caller has already put the shadow.
Units draw with smoothing off; environment items and swatches with smoothing on (they are two to
three texels a screen pixel and crawl when point-sampled).
