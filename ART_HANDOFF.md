# ART_HANDOFF — status of the painted-art pass, for whoever picks it up next

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

## Not done — what to paint next

In roughly the order a playthrough meets it:

1. **Hunter** (rifleman). No art exists. `characterKey()` returns `null` for it, so it
   still renders as the old vector shape everywhere, including on level one.
2. **Wraith** and **Butcher**. Same — no art, no `characterKey()` entry. These only
   appear from level 3 on, so lower priority than the hunter.
3. **Levels two through seven** (THE YARD, THE ROAD, THE THRESHING FLOOR, THE BRIDGE,
   THE RAFTERS, THE OSSUARY). The whole painted-tile/painted-prop system is gated to
   level one (`renderer.altar` is only set when `game.levelIndex === 0`, in `Renderer.draw`).
   Extending it to another level means new tile/wall art matching that level's canon
   (see `CLAUDE.md`'s **Canons** section for what each level is about) and pointing
   `renderer.altar` at it for that level too — the gating logic will need to widen from
   a single level check to a per-level art-set lookup.
4. **Doors, the cage/pen bars, the Mill, spike plates, the weapon stand, the heal
   (grass) patch, the soul wisp, fire, the secret-wall patch** — all still procedural.
   None of these are blocking; they read fine as placeholder shapes. Worth painting in
   roughly that order if there's appetite, since doors and the pen are what a player
   looks at longest in the opening minutes.

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
