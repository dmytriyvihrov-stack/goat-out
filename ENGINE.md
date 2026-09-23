# Engine notes — for the port, later

Written 23 Sep 2026. **Nothing here is scheduled.** The JavaScript build is the game and stays the design
truth until the design stops moving; this file is so whoever starts the port does not start from zero.
It has three parts: which engine (and whether to port at all), the working rules for Godot, and how
Goat Out's own systems map onto it. Part 2 opens with a list of tips the user collected, kept in full
and corrected where the research or this project disagrees.

Checked against: Godot **4.7** (stable since 18 Jun 2026, 4.7.2 maintenance release 18 Aug 2026).
Re-check version-specific lines before acting on them — Godot 3 → 4 renamed so much that most old
tutorials quietly produce broken code, and that is the single biggest trap for anyone learning it.

---

## Part 1 — which engine, and whether to port at all

### The recommendation

1. **Do not port while the design is still moving.** Every system in `CLAUDE.md` changed within the last
   month. A port freezes the design in a slower-to-change medium. Port when playtests stop producing
   `system` entries in `BACKLOG.md` and only `number` and `feel` ones are left.
2. **The cheapest way to reach Steam is not a port.** The current build is Canvas 2D with no
   dependencies. Wrapped in Electron with `steamworks.js`, it is a Steam game (overlay, achievements,
   cloud saves) in days. Vampire Survivors shipped this way (Phaser + Electron) and only moved engine
   (to Unity, v1.6, Aug 2023) after it was a hit, for performance and consoles. That order is the
   lesson: sell first, port the thing that sold. Tauri is the tempting lighter wrapper, but it uses the
   system WebView (WebKit on macOS/Linux, Steam Deck included), which is slower at canvas graphics than
   Chromium. Use Electron or NW.js.
3. **When a real port is due: Godot 4.** It is MIT-licensed with no fees or royalties, its 2D renderer is
   a separate path in the engine and not 3D squashed flat, GDScript is close to the way this codebase
   is already written, and `js/juice.js` already carries a Godot 4 recipe for every effect.

### Why each alternative loses here

| Engine | For | Against, for this game |
|---|---|---|
| **Stay in JS + Electron** | Zero rewrite. The web playtest link keeps working. Proven on Steam. | Canvas 2D is the ceiling. `render.js` is already half the code and the perf pass of 23 Sep was needed. No console route. |
| **Godot 4** | Free, 2D-first, fast to iterate, GDScript ≈ this JS. Typed, profiler, headless mode for `balance.js`-style checks. | A full rewrite. The web build gets far heavier (see Part 3). Consoles only through third-party porters (W4 Games and others), not out of the box. |
| **GameMaker** | Genre's home: Hotline Miami, Nuclear Throne and Katana ZERO were made in it. $99.99 one-time for commercial desktop. | GML is useful nowhere else. Consoles need the Enterprise tier ($79.99/month). Our generator, rules and tools would all be rewritten in a closed language. |
| **Defold** | Very light builds, strong web export, Lua, free console support (Switch, PS4). | Small community, fewer 2D tools, and a bigger jump from this codebase than GDScript. |
| **Unity** | Most console porters know it; biggest asset store. | Heavy for a 2D game this size, and 2023's runtime-fee episode is still how many indies judge the company. |
| **Bevy, LÖVE, raw SDL** | Full control. | No editor, and a one-person team would build tools instead of the game. |

---

## Part 2 — working rules for Godot

### 2.1 Tips the user collected, annotated

1. **Do not copy tutorials blindly.** A tutorial's answer is often fine for a jam and does not scale.
   Understand why it works. *Also check which Godot version it is for.* Anything with `KinematicBody2D`,
   `yield`, `export var` or `TileMap` (not `TileMapLayer`) is Godot 3 or pre-4.3.
2. **`Sprite2D.position` vs `offset`.** `position` moves the node *and its children* (collision, hitboxes,
   attack points). `offset` only moves the picture.
3. **So visual correction of an animation goes through `offset`**, never `position`, so collision and
   everything hung off the node stay put. *Goat Out:* this is also how to port the goat's breathing
   (`TUNING.goat.breathe`, a stretch from the hooves). Scale the `Sprite2D`, never the body.
4. **Build a debug God Mode first.** Flight, fast move, invulnerability, gravity off. *Goat Out:* we
   already have the list, the dev drawer (`game.dev.god`, the spawner, `#seed=`, the level tool). Port
   the drawer before the second enemy kind, not after. A top-down game has no gravity to turn off, so
   add *noclip through walls* and *teleport to room N* instead.
5. **Do not flip characters with negative `scale.x`.** Confirmed: on a physics body Godot decomposes the
   transform, so `scale.x = -1` comes back one frame later as `rotation = 180°, scale.y = -1`, and it
   keeps flipping (godot#62663, #78613). Rays, IK and child collision go wrong the same way. Flip the
   picture with `Sprite2D.flip_h`. Move collision shapes and attack points yourself, as a mirrored
   position. *Goat Out:* the atlas has its own facings, so most turns are a frame pick, not a flip at all.
6. **Be careful with `preload`.** A `preload` is a constant resolved when the script compiles. The
   resource and everything it references stays loaded while that script exists. Scenes preloading each
   other in a chain keep the whole chain in memory, and a *cycle* (A preloads B preloads A) fails to
   load. `preload` is right for small leaf resources a script always needs (the bullet scene, a
   sound). Use `load()`, an `@export var scene: PackedScene`, or `ResourceLoader.load_threaded_request`
   for big or optional things (a level's set pieces, the prologue).
7. **Wake enemies only near the screen** with `VisibleOnScreenEnabler2D` (switches the parent's
   processing off-screen) or `VisibleOnScreenNotifier2D` (only signals). *Goat Out does not do it this
   way, deliberately:* "nothing simulates two rooms away" is room-based (`roomAt`, `nearestRoomIdx`), and
   `e.woke` is set by distance to the view *or* by being held, flung or burning. Port that rule as it
   is: set `process_mode = PROCESS_MODE_DISABLED` by room distance. Use the enablers only for cosmetic
   things (torches, drips, grass sway).
8. **Pick a base resolution at the start.** For pixel art, 640×360 or 320×180 with integer scaling,
   otherwise pixels jitter and distort. *Goat Out: not 320×180, and not a low-res viewport.*
   `VISUAL_REFERENCE.md` settled that the frame stays full resolution and the *assets* are pixelized,
   because `TILT`'s counter-squash, `zoomPunch`, `game.kick()` and the mill's turning arm never land on
   a pixel grid, and a low-res canvas would crawl on every camera move. The Godot setup for that is in
   2.2.
9. **Type your GDScript** (`var health: int`, `func hit(by: Enemy) -> void`). Better autocomplete,
   earlier errors, and typed code runs faster. Enforce it: Project Settings → Debug → GDScript →
   `untyped_declaration` = **Error**. Use typed arrays (`Array[Enemy]`) and typed dictionaries
   (`Dictionary[StringName, float]`, 4.4+).
10. **Use Git and commit every working step.** Godot extras: commit the `.uid` files next to scripts and
    resources (4.4+, they are how references survive a rename). Ignore `.godot/` (the import cache).
    **Move and rename files inside the Godot FileSystem dock, never in Explorer**, or references break.
11. **Small things.** `Engine.time_scale` for slow-motion debugging. MSDF fonts (Import → Multichannel
    Signed Distance Field) for crisp text at any scale. Cap FPS (`application/run/max_fps`, or V-Sync)
    so a menu does not run at 900 fps. Favourite scenes and folders, coloured folders in the FileSystem
    dock, and a saved editor layout.

### 2.2 Project settings for this art

The art is "Pixel 2.5": 16 art-px a 32 px tile, nearest-neighbour, drawn into a full-resolution frame.

- `display/window/size/viewport_width × height`: **1280×720** base (or 640×360 if the art is authored
  at 1 art-px = 1 unit).
- `display/window/stretch/mode`: **`canvas_items`**, not `viewport`. `canvas_items` renders at window
  resolution, so rotation, tilt and zoom stay smooth while every texture stays hard-edged. `viewport` is
  the retro-crawl setup `VISUAL_REFERENCE.md` rejects.
- `display/window/stretch/scale_mode`: **`integer`**, so art-px are always whole screen pixels. Letterbox
  the remainder.
- `rendering/textures/canvas_textures/default_texture_filter`: **Nearest**.
- `rendering/2d/snap/snap_2d_transforms_to_pixel` and `snap_2d_vertices_to_pixel`: try both on, but test
  with the camera's lead and deadzone. Snapping plus a lerping camera can make it step instead of
  glide, and physics interpolation (2.3) is usually the better cure for jitter.
- Keep camera zoom at whole or clean-half steps at rest. `zoomPunch` can pass through fractions,
  because it is a kick, not a resting state.
- Import every atlas with **Filter off, Mipmaps off**. Use Lossless compression for pixel art. VRAM
  compression smears it.

### 2.3 Loop, time and physics

- **Our loop is a fixed 1/60 step, and so is Godot's physics.** All simulation goes in
  `_physics_process` with `physics_ticks_per_second = 60`. Only drawing and cosmetics go in `_process`.
  Moving things in `_process` is the most common cause of jitter.
- **Turn on physics interpolation** (Project Settings → Physics → Common, 2D since 4.3). The sim stays
  at 60 Hz and rendering interpolates between ticks, so a 144 Hz monitor stays smooth. After a
  teleport (our `cam.x/y` hard-sets, `updateFall`'s return point, `H.tp`), **set the position first,
  then call `reset_physics_interpolation()`**. The other order interpolates across the jump.
- **Hitstop and slow motion.** `Engine.time_scale` scales physics and `_process` alike, which is right for
  `timeScale`. Hitstop in `juice.stop` is short, so a game-owned scale is still fine if the dev drawer
  must keep running during a stop.
- **Decide early whether to use Godot physics at all.** Our collision is our own: circles against a tile
  grid, box rectangles for doors, custom body-vs-body in `collideEntities`, flinging with splat speeds.
  "Kills come from geometry" depends on how exactly that behaves. Two honest paths:
  - `CharacterBody2D` + `move_and_slide` for the goat and men, `Area2D` for hitboxes. This is the
    Godot way, with the most tutorial help. The fling and splat maths gets re-tuned against a solver
    that is not ours.
  - **Port the sim as plain data**: `RefCounted` classes stepping over a tile array, exactly like
    `world.js` / `entities.js` now, with nodes only for drawing. `TUNING` numbers carry over one to one
    and `balance.js` / `GEN_RULES` port without a scene tree. Recommended for Goat Out: the game feel is
    in that code, and it is already tuned.
- **Many bodies.** Dozens of men per floor is fine as nodes. Hundreds of projectiles or particles are
  not. A bullet as a whole scene (Area2D + Sprite + AnimationPlayer) is a known way to spend
  hundreds of ms a step. Draw swarms in one `_draw()` or a `MultiMeshInstance2D`, and do their hits as
  distance checks or through `PhysicsServer2D` directly. Our pixel effects (`CombatFX`) belong in one
  drawing node, not a node per spark.

### 2.4 Structure

- **Scenes are nouns, scripts are behaviour. Keep trees shallow.** A man is one scene (body, sprite,
  hitbox, shadow). The level is built by code (it is procedural) and so is not a hand-made scene.
- **Signals go up, calls go down.** A child emits (`died`, `took_hit`). The parent or a manager connects.
  No `get_node("../../..")`. Use `%UniqueName` inside a scene and `@export var target: Node2D` across
  scenes.
- **Autoloads: few, and never a god object.** `Tuning`, `Audio`, `Save`, maybe `Rules`. `game.js` today
  is a god object (state machine, loop, input, collision, boons, dev drawer). The port is the moment to
  split it, not to rebuild it as a 6000-line autoload.
- **Data as custom `Resource`s** (`class_name EnemyDef extends Resource`, saved as `.tres`, edited in the
  inspector): each `THREAT` / `ENCOUNTER` kind, `LEVELS`, `BOONS`, `ARTIFACTS`, room templates.
  **Resources are shared by reference.** Every instance that points at one `.tres` sees the same object,
  so a man writing `def.hp -= 1` writes it for every man. This is the Godot form of our own rule "never
  mutate `TUNING`, use `game.mods`". Keep defs read-only. For per-instance mutable copies, call
  `duplicate(true)`. `resource_local_to_scene` does not survive duplicating an instanced scene
  (godot#45350).
- **Freeing.** `queue_free()`, then everything that held a reference must check `is_instance_valid()`.
  An `await` resumes on a node that may be gone by then. Our "a held man is removed from
  `goat.holding` when he burns, is bitten or falls" becomes exactly this.
- **Input Map, not keys.** Five actions for the five verbs (plus pause and Q when worn). Pillar 1 ("never
  a new input") becomes a list you can see in Project Settings. Gamepad (an open question in
  `CLAUDE.md`) then costs almost nothing. 4.7 has a built-in `VirtualJoystick` node for touch, the
  obvious replacement for `TouchUI`'s stick.

### 2.5 Tools and testing

- **Headless runs**: `godot --headless --script res://tools/balance.gd` is where `balance.js` and every
  `GEN_RULES.check` go. Keep them runnable without a window, so they can gate commits the way
  `balance.js` does today.
- **Unit tests**: GUT or GdUnit4.
- **Profiler and Monitors** (Debugger panel) replace our ad-hoc timing. The 23 Sep perf pass
  (18 → 3.5 ms) is the baseline to beat on the same late floor.
- **Remote scene tree** while the game runs is the free version of half our dev drawer. Use it.
- **Editor plugins** (`@tool`, `EditorPlugin`) are where the LEVEL TOOL, RULES and BALANCE pages live
  after the port. 4.7's 2D Scene Paint Mode (B) is handy for hand-dressing set pieces (Great Hall,
  Gallery). It is not for procedural rooms.

### 2.6 Shipping

- **Steam**: the GodotSteam plugin (Steamworks as GDScript API). Steam Deck: test Linux export and
  gamepad-only play early.
- **Consoles**: not in the free engine, because the SDKs are under NDA. They go through a porting company
  (W4 Games, founded by Godot's lead developers, and others). Budget it as a contract, not a checkbox.
- **Web**: export **single-threaded** (4.3+). It needs no `SharedArrayBuffer`, so it runs on itch.io and
  Safari without special headers. Expect a download of tens of MB against today's few MB. Check it
  against the artifact's **15 MB per binary file** limit before assuming the claude.ai playtest link
  survives the port. It very likely does not in its current form. **C# projects**: Godot 4's web export
  was long GDScript-only, so check the current state before choosing C#. For this game there is no
  reason to leave GDScript.
- **Patches**: 4.6+ can export patch PCKs with delta encoding, so updates stay small.
- **Google Drive**: this project lives in a synced folder. A Godot project should not. The `.godot/`
  import cache churns thousands of files and sync conflicts corrupt it. Keep the Godot repo on a local
  disk, backed up through Git.

---

## Part 3 — Goat Out's systems, mapped

| Now (JS) | In Godot | Watch out |
|---|---|---|
| `TUNING` (one object in `tuning.js`) | An autoload `Tuning.gd` of consts, or `.tres` Resources per section | Rule 2 ("all numbers live in tuning") still holds. The TALISMANS tab's live edits become inspector edits. |
| `rng.js` mulberry32, seeds in base 36 | Port mulberry32 exactly (mask with `& 0xFFFFFFFF`, since GDScript ints are 64-bit) | Do **not** use `RandomNumberGenerator` or global `randf()` for generation, or every seed from the JS era means a different level. Keep one RNG per purpose, as now. |
| `TILT` 0.86, `ctx.scale(1, 1/TILT)` | Sim in flat coordinates. A visual node per entity at `Vector2(x, y * TILT)`. Sprites unsquashed. | Every screen→world conversion divides by `zoom * TILT`, just as `readMoveInput` does. Keep collision in flat space and never under the squash. |
| Tile grid, `drawTiles`, wall masks | `TileMapLayer` (`TileMap` is deprecated since 4.3). Terrain sets or our own mask→tile pick. | Generation fills a plain array first, then paints the layer in one pass. Painting cell by cell during generation is slow. The tile layer is for drawing, and `world.flow` / `route` / `routeW` stay our own arrays. |
| `world.decal`, persistent canvas at 0.34 scale | A `SubViewport` with `render_target_clear_mode = NEVER`, drawn once per splat, shown as a texture | Same memory arithmetic as now: 420×78 tiles × 32 px × scale. Chunk it if it grows. |
| Fog: `computeVis` shadowcast → `drawShade` | Keep the shadowcast in code. Write `vis` to an `Image` → `ImageTexture`, and shade in a `CanvasItem` shader. | Upload only the rows that changed. `Light2D` with occluders looks tempting, but it does not give the doorway-wide fog rule. |
| `CombatFX` baked pixel frames | Bake to `SpriteFrames` / atlas at load and draw in one node | The pillar still holds: cells on a grid, never smooth particles. `GPUParticles2D` is off-style unless textured and snapped. |
| WebAudio synthesis, drum machine, `MUSIC` | Render the one-shots to `.wav` once and play them via `AudioStreamPlayer` / `AudioStreamPolyphonic`. `AudioStreamGenerator` only if something must stay procedural. The buses map one to one. | The biggest single rewrite after `render.js`. The music bed may be easier recorded out of the JS build than ported. |
| `game.hidden`, rooms 2+ away frozen | `process_mode` per room group | See 2.1 tip 7: room distance, not screen visibility. |
| Save in `localStorage` | `FileAccess` to `user://save.json`, same schema and `v` field | Steam Cloud syncs `user://` if configured. |
| `GEN_RULES` + `balance.js` | `Rules.gd` + a headless `balance.gd` | Port these **before** the generator is trusted. They are how we will know the port generates the same game. |

**A port is done when** the same seed gives the same level (checked by `GEN_RULES` over the same seed
counts as `balance.js`), the threat ladder matches the one in `CLAUDE.md` *The cave is third*, and a
playtester cannot tell which build they are holding except by the frame rate.

---

## Sources

- [Godot 4.7 release page](https://godotengine.org/releases/4.7/) ·
  [4.7.2 maintenance release](https://www.opensourceforu.com/2026/08/godot-4-7-2-released/) ·
  [4.6 overview](https://digitalproduction.com/2026/01/28/godot-4-6-arrives-with-major-cg-friendly-updates/) ·
  [4.5 released](https://gamefromscratch.com/godot-4-5-released/)
- [Godot docs: best practices](https://docs.godotengine.org/en/4.4/tutorials/best_practices/index.html) ·
  [physics interpolation](https://docs.godotengine.org/en/stable/tutorials/physics/interpolation/physics_interpolation_introduction.html) ·
  [Web export in 4.3](https://godotengine.org/article/progress-report-web-export-in-4-3/)
- [GDQuest: pixel art setup in Godot 4](https://www.gdquest.com/library/pixel_art_setup_godot4/) ·
  [Shaggy Dev: configuring for pixel art](https://shaggydev.com/2021/09/21/project-setup-for-pixel-art/)
- Negative scale: [godot#62663](https://github.com/godotengine/godot/issues/62663),
  [godot#78613](https://github.com/godotengine/godot/issues/78613),
  [godot#75224](https://github.com/godotengine/godot/issues/75224)
- Resource sharing: [godot#45350](https://github.com/godotengine/godot/issues/45350) ·
  [Bugnet: resource sharing state](https://bugnet.io/blog/fix-godot-resource-sharing-unintended-state)
- Physics jitter: [Bugnet: interpolation jitter](https://bugnet.io/blog/fix-godot-physics-interpolation-jitter)
- Many bullets: [Drawing a metric ton of bullets in Godot](https://worldeater-dev.itch.io/bittersweet-birthday/devlog/210789/howto-drawing-a-metric-ton-of-bullets-in-godot)
- Beginner pitfalls: [Is Godot too hard? (2026)](https://egmatic.com/blog/godot-too-hard-for-beginners)
- Engines: [Best 2D engines 2026](https://app.cinevva.com/guides/best-2d-game-engines-2026) ·
  [GameMaker review 2026](https://egmatic.com/blog/gamemaker-studio-review-worth-it-2026)
- Web → Steam: [Phaser: publishing web games on Steam with Electron](https://phaser.io/news/2025/03/publishing-web-games-on-steam-with-electron) ·
  [steamworks.js](https://github.com/ceifa/steamworks.js/) ·
  [Web Game Dev: desktop](https://www.webgamedev.com/publishing/desktop)
- Vampire Survivors' engine move: [GamingOnLinux](https://www.gamingonlinux.com/2023/07/vampire-survivors-switching-to-new-game-engine-on-august-17/) ·
  [GamesRadar](https://www.gamesradar.com/vampire-survivors-dev-asked-if-hell-ever-use-unity-again-lol-no-thank-you/)
