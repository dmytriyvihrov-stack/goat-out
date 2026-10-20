# godot-export / sprites (session s01)

Run `node tools/godot-export/sprites.js` (props, heaven, decals, atlases; then serves port 8795), open
`http://localhost:8795/tools/godot-export/bake.html` for the units (about 2 minutes; keep the pane visible),
output in `output/godot-export/sprites/`. The page posts to this script's own `/put`, not to tools/serve.js.

- `units/<name>.png|json`: sheet + frames (rect, foot, dir 0 S,1 SW,2 W,3 NW,4 N,5 NE,6 E,7 SE, anim, flip already applied). `tables.json`: PIXEL_EXTENT, NECK, FACE, gait, hornModel.
- Atlas units: native 112 px frames as `draw` puts them (goat also bare_ and marked_, with hornRoots and headShift), world px = png px * worldPerPx.
- Hand-built units: 4 px per texel, world px = png px / zoom. Walk lean/bob in draw() is code, not baked.
- Factory machines and capes: default pose only, trimmed, zoom 3 / 4 (live, state-driven poses are code).
- `props*.png|json`, `heaven*`: Grid sprites 1 texel = 1 px. `decals/`, `env-atlas`, `factory-atlas`, `unit-atlas-source`: decoded from js/*.
- `compare.png` / `compare.json`: game draw (left) vs file (right) per direction.
