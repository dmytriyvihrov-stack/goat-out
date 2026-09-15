# GOAT OUT — expansion 02

Generated with built-in image_gen and integrated locally on 2026-09-15.

## Approved character designs

| Unit | Selection | Output |
| --- | --- | --- |
| Hunter | B body and wide-brim hat, C bandaged forearms, old flintlock musket | `units/hunter-facing.png` |
| Brute | B build, rusty-red bearer hood/robe, plain club, no spikes | `units/brute-facing.png` |
| Butcher | D, bare arms, broad horned mask, ivory apron, cleaver | `units/butcher-facing.png` |
| Wraith | A, plain tattered shroud | `units/wraith-facing.png` |
| Chicken | D, scruffy cream/brown bird | `units/chicken-facing.png` |

Each sheet is **128×1024 RGBA**: one column, eight 128×128 static frames. Individual
PNG files are under `units/<name>/<direction>.png`. Ground origin is `[64,104]`.
Row order: **S, SW, W, NW, N, NE, E, SE**. The renderer selects
`(Math.round(facing / (Math.PI / 4)) + 14) % 8`, for `atan2(dy,dx)` with screen Y down.
Movement holds the same static frame; there is no generated walk cycle for these five.

The user requested right-handed weapons for the clubmen and butcher. The new brute
and butcher use reflected source views plus explicit W/NW/SE corrections. Reflection
also swaps opposite compass rows. The legacy clubman's existing 512×1024 walk sheet
is included with its handedness correction; its animation timing remains unchanged.
The renderer no longer adds procedural spikes to the brute. No new spiked enemy was added.

## Environment

- `tiles/{yard,road,threshing,bridge,rafters,ossuary}/`: eight 128px tiles per level,
  `stone0-3`, `wallTop`, `wallFace`, `boards0-1`. Intended at 32 world pixels each.
  Their six generated sources follow the palette/mood in the original ART_HANDOFF brief.
- `objects/cagePost.png`, `cageBroken.png`, `healingGrass.png`: padded 128px outputs.
  Their `-tight.png` siblings are used in game to avoid scaling mostly-empty cells.
  Posts retain the existing gameplay height and independent lean; the rail is assembled
  procedurally. Broken bars stamp a small bent-post decal before the Prop is removed.
  Grass is 23 world pixels wide, no idle bob, with the existing grazing progress arc.
- `doors/{wood,iron,vault,soul}.png`: 512×128 sheets, closed/opening/open/broken.
  Each state is also saved individually. Closed tight siblings are **26×116**, used
  at **13×58** in the actual game and rotated 90 degrees for the horizontal slab.
  Runtime opening rotates the closed slab by the existing continuously-valued `p.open`;
  it does not switch the illustrative generated intermediate states. Breaking stamps
  the fourth state on the world decal. Soul labels, pressure rings and hit marks remain.

The existing level-one wall art was retained. The tile layer now selects other level
sets independently of the level-one ritual/decor gate. Characters and props render on
every level. Wraiths retain visibly lower opacity while intangible and gather as they
manifest; new stationary frames stay fixed while moving.

## Build and inspection

- `node assets/painted-expansion-v2/pack.cjs`: mechanically extracts/normalizes generated
  sources, removes baked exterior checker matte where necessary, packs RGBA frames,
  writes `manifest.json`, `validation.json` and offline `js/painted-assets-v2.js`.
  Needs Sharp; resolves the bundled runtime on this machine if not on NODE_PATH.
- Both HTML files load the new embedded asset file immediately before `painted-art.js`.
- `preview.html`: all facings, switchable dark/light/floor backgrounds, door states,
  corrected props and all six tile atlases. Runs offline.
- `node tools/serve.js 8766`, then `node assets/painted-expansion-v2/check.cjs`:
  headless Chrome checks the actual renderer and writes browser validation + screenshots.
  Playwright uses the configured bundled runtime and installed Chrome on this machine.
- `characters-preview.png` / `characters-light.png`: final packed directions.
- `cast-in-game.png`, `cage-grass-chicken.png`, `level-1.png` through `level-7.png`,
  `door-{vertical,horizontal}-{0,0.6,1}.png`: live-renderer visual evidence.
- `prompts.json`, `prompts-corrections.json`: complete generation briefs and user corrections.
- `source/`: archival high-resolution source images, including rejected directional views.
  Use the packed files, which have clean alpha, rather than source checkerboard images.

Validation: 59 nonempty transparent-edged cells; five sets of eight directions select
the right rows and stay on column zero while moving; ghost opacity differs from solid;
broken cage decal draws; all seven floor sets exist; ordinary corridor doors fit both
orientations at closed/part-open/open; both HTML builds load 103 images with no page errors.

Completed required handoff items A/B/C/E/F. Optional crate-debris and a new wall-mounted
torch fixture are still outside this delivery. No deployment, gameplay balance, spawn
tables, collision dimensions or room generation were changed by this art integration.
