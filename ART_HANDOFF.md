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
| **Pixel props** (1.63) | `js/prop-pixels.js`: sprites built in code (`Grid` + palette `P`), no generated file | Doors and their debris, sword, shield, the stand of arms (layered), the wheel's hub and arms, cage posts, altar, banner, gong, lantern (8 frames), soul wisp, both healing grasses, the pail, spike grating (idle / arming / up), bomb, coop, burrow, ware stool, the roast. |
| **Painted props (fallback)** | `js/painted-assets.js`, drawn by `PaintedArt` in `js/painted-art.js` | Nothing by default: only shown with `#paintedprops` (or `PROP_PIXELS.on = false`), for a side-by-side. |

Anything with none of the three falls through to the canvas primitives in `js/render.js`
(`Renderer.drawProp` and friends). Combat effects — flame loops, blasts, smoke, blood — are `js/combat-fx.js`,
baked procedurally at start into pixel frames on the units' grain (`TUNING.effects.pixel`, `.flame`, `.blast`).
The painted sheet they used to be drawn from (`assets/combat-fx/effects.png`) was retired in 1.56: a smoothed
painting read as a different game next to Pixel 2.5.

`PaintedArt` is still the class every character goes through (`PaintedArt.character`): it owns the
lean of a windup, the tilt of a man on the floor, the wraith's fade, the goat's collar and wounds.
The sprite itself always comes from `PIXEL_ART.draw`.

---

## Still to be drawn in pixel

Every prop is pixel art since 1.63 (`js/prop-pixels.js`). What is still not:

- **Ominous decals** — `output/pixel-ominous-decals-2026-09-23` holds three floor pictograms and a
  wall sign, generated and measured but **not integrated**. The cult's own floor pictograms
  (`CULT_GLYPHS`, `world.js`) were redrawn as a butcher's marks in 1.63 instead.
- **The stairs** are still a gradient per tile (`Renderer.drawStairs`).
- **The cave spires** draw the `stalagmites` pixel prop over two smooth blood ellipses.

**Adding a prop sprite by hand** (the 1.63 way, no image generation): write a function in
`js/prop-pixels.js` that fills a `Grid` with `rect` / `ell` / `line` / `poly` / `bar` in palette colours,
shade it with `tone`, and `outline()` it; register it in `sprites`. Render it big with
`node output/pixel-claude-2026-09-24/render.cjs 6 <name>` and look before wiring it. A layered sprite
(`rack-`, `coop-`, `roast-` names) keeps its frame so the layers line up; everything else is trimmed.
About 1.35 world px a texel (`TX`) is the grain of the crate and barrel.


