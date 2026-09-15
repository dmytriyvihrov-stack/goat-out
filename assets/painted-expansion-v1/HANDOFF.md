# Goat Out — asset expansion 01

Prepared 2026-09-15. **Asset delivery only. Claude handles integration.**

## Contents

| Set | Delivered | Files |
| --- | --- | --- |
| Sheep, clubman, mage, hound | 8 drawn directions × 4 walk frames each = 128 frames | `units/<name>-walk.png`, individual `units/<name>/<direction>-<frame>.png` |
| Idle poses | Column 1 of each walk row, 8 poses per unit | `units/<name>-idle.png` |
| Brazier, torch, lantern | 8-frame fire loop each = 24 frames | `effects/<name>-fire.png`, individual numbered frames |
| Wood, iron, vault, soul doors | Closed / opening / open / broken = 16 states | `doors/<name>.png`, individual named states |
| Level-one props | 16 sprites | `objects/atlas.png` and individual PNGs |

Every delivered frame is **128 × 128 RGBA PNG with real alpha**, including transparent padding. Source sheets are retained at generation resolution. `source/` is archival input; some source backgrounds are magenta/checkerboard. Use the exported PNGs, not the raw sources.

Open `preview.html` directly: it works offline, animates every facing, switches dark/light/grass backgrounds, and exposes door states and origins. `preview.gif` is a compact animated contact sheet, with all walk cycles synchronized at 8 fps for inspection. Game recommendations differ below.

## Character sheets

All walk sheets are **512 × 1024**, 4 columns × 8 rows, no gutters. Zero-based frames 0–3 loop. Idle sheet is 128 × 1024, one frame per direction, derived from walk column 1 (second frame); it is a static pose, not a new idle animation.

| Row | Direction | Screen heading |
| --- | --- | --- |
| 0 | S | down |
| 1 | SW | down-left |
| 2 | W | left |
| 3 | NW | up-left |
| 4 | N | up |
| 5 | NE | up-right |
| 6 | E | right |
| 7 | SE | down-right |

For `angle = Math.atan2(dy, dx)` with screen Y increasing down:

```js
const row = (Math.round(angle / (Math.PI / 4)) + 14) % 8;
const frame = Math.floor(walkTimeSeconds * fps) % 4;
// Fixed padded frame; origin is a suggested visual ground root, not a collider.
ctx.drawImage(sheet, frame * 128, row * 128, 128, 128,
  x - 64 * scale, y - 104 * scale, 128 * scale, 128 * scale);
```

Suggested walk rates: sheep 8 fps, clubman 8, mage 7, hound 10. Advance walk time only while moving; retain last direction when stopping. The sheep has alternating leg poses and a short wagging tail, most visible from N/NW/NE and profiles. S and SE keep the original face/body silhouette where the tail is occluded.

Each direction is drawn, with no whole-sprite rotation used to fake facings. Generated batches were normalized using one scale per four-frame row, keeping the frame canvas fixed. These are four-frame painted cycles: small cloth/fur/staff silhouette changes remain between frames and directions. They are not a bone-rig export. Use the preview to tune display scale, origin and cadence in the actual renderer.

## Fire

`effects/brazier-fire.png`, `torch-fire.png`, `lantern-fire.png`: **1024 × 128**, 8 columns, 10 fps suggested, loop. Each frame contains the whole fixture plus animated flame/light; do not draw an additional old static fixture underneath. Ground origin `[64,112]`. The torch can instead be placed from a wall socket chosen by the renderer. There is no baked floor glow or shadow.

## Doors

Four separate **512 × 128** sheets: wood, iron, vault, soul. Columns: closed, opening, open, broken. Suggested placement origin `[16,112]`, near the lower hinge; this is a layout origin rather than a precision rotation pivot. Art depicts front-facing door leaves with depth, matching the north-wall reference. A shared surrounding wall/door frame should be drawn by the level renderer.

Switch the first three images for opening/closing. The fourth is destroyed debris, **not** the last frame of a looping animation. The opening angles are illustrative. These are not four wall orientations; side-wall door variants remain a separate future art task.

## Props

`objects/atlas.png`: **512 × 512**, four columns × four rows, order:

| Row | Col 0 | Col 1 | Col 2 | Col 3 |
| --- | --- | --- | --- | --- |
| 0 | cage-bars | cage-broken | mill-hub | mill-arm |
| 1 | spikes-idle | spikes-arming | spikes-up | weapon-stand |
| 2 | sword | shield | healing-grass | soul-wisp |
| 3 | secret-wall | crate-debris | brazier-unlit | worktable |

Individual PNGs use the same names. Suggested bottom origin `[64,112]`; floor decals, mill parts and items can instead use their visible-content center. `secret-wall` is an isolated masonry patch with transparent padding, not an edge-to-edge repeatable tile. `mill-hub` and `mill-arm` are separate parts for assembly. Spikes are three static states, the wisp is a static sprite. The plain worktable is separate from the existing ritual altar.

## Files for integration

- `manifest.json`: frame sizes, row order, fps, origins, states and exact source crops.
- `source/crop-map.json`: source dimensions and crop coordinates for reproducible packing.
- `pack.cjs`: offline Node + sharp packaging/export. Writes only inside this package, never game code.
- `prompts.json` + `prompts-additional.json`: complete prompt set including final corrections; generated with the built-in `image_gen` tool. Export used Node sharp for matte removal, cropping, resizing, atlas packing and GIF encoding.
- `validation.json`: export checks for nonempty frames, transparent canvas edges and distinct walk frames.

The game renderer, balance, live `assets/painted/` and embedded `js/painted-assets.js` were not changed in this delivery. Hunter/Wraith/Butcher, attacks/hurt/death/roll, and levels 2–7 are outside this batch.
