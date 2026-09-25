# Asset audit: Goat out, 24 Sep 2026

- **What was measured:** the working tree at about 14:40 on HEAD `9afe0d3`. The tree is dirty and another session is editing it (see "Files under uncommitted change").
- **The shipped build:** `artifact.html` plus the 29 files in `js/`, which make up the next publish. The live artifact version `1790249047-f8c9` was also listed.
- **Baselines:**
  - HEAD `9afe0d3`
  - the live artifact
  - 1.56-1.61 `12f00b1`
  - 1.49-1.55 `c3bda62`
  - 1.47-1.48 `c3bda62^`
- **How the checks were proven:** each probe was first run on a planted case and caught it (details under "Checks and their planted cases").
- **Verdict: WITHIN BUDGET.** Every limit has a large margin. About 72% of the shipped bytes are embedded art, and 1.32 MB of that is a pack the default build loads but never draws.

Skill: `~/.claude/skills/asset-audit` (SKILL.md + census.cjs). **drawsize.js was not run** because it needs a browser, and the brief bans browser tools. Oversample figures below are data-level estimates from the atlas scale and the renderer's zoom formula, not draw-size measurements.

## Budget

| target | limit (source, confirmed 24 Sep 2026) | what is measured | measured | baseline | headroom | status |
|---|---|---|---|---|---|---|
| Claude artifact: page | 16 MB (Artifact tool description, this session) | `artifact.html` | 1,993 B (published wrapped: 2,509 B) | same | >99% | ok |
| Claude artifact: text file | 16 MB each | largest: `js/pixel-assets.js` | 2,803,924 B | same since `c3bda62` | 82% | ok |
| Claude artifact: version | 64 MB | artifact.html + 29 js | **6,471,729 B (6.47 MB, 6.17 MiB)** | live 6,429,387 B / HEAD 6,407,345 B / `c3bda62` 7,717,953 B / `c3bda62^` 12,412,894 B | 90% | ok |
| Claude artifact: files | 255 | next publish | 30 (live: 29; `js/foley.js` is new and not yet published) | 29 | 88% | ok |
| Claude artifact: binary | 15 MB each | none shipped | 0 | 0 | - | ok |
| GitHub file | warn 50 MiB, block 100 MiB (GitHub Docs, "About large files on GitHub", fetched) | largest tracked file today | 2.80 MB; largest blob ever 12.07 MB (`output/pixel-mid-goat-r3-2026-09-23.zip`, deleted) | - | 94% | ok |
| GitHub repo | "ideally less than 1 GB, less than 5 GB strongly recommended" (same page) | `.git` | 159.74 MiB packed + 2.96 MiB loose + **11.93 MiB `tmp_obj_*` garbage** | - | 84% of 1 GB | ok |
| itch.io HTML5 | 1,000 files, 500 MB extracted, 200 MB per file, 240-char paths, case-sensitive UTF-8 (itchio/itch.io `docs/creators/html5.md` on GitHub; itch.io/docs returned HTTP 403) | minimal zip: `index.html` + `js/` | 30 files, 6.47 MB extracted, about 4.08 MB zipped (deflate-9 estimate) | - | 98% | ok if zipped minimally |
| itch.io, naive zip | same | the whole folder minus `.git` | 517 files, 207.6 MB (175.3 MB of it is `tools/shots/`) | `git archive HEAD` would be 138 files, 25.9 MB | 58% | **at risk of shipping junk** |
| players, first load | **no project target** | whole ship set | 6.47 MB raw, **4.07 MB gzip** (whether the artifact host compresses is NOT MEASURED) | - | - | question |

## Embedded weight (census on the shipped set)

`node census.cjs artifact.html js --top 25 --json asset-work/census-shipped.json`

| file | URIs | encoded | decoded | share of file | top offenders | repeated inside file |
|---|---|---|---|---|---|---|
| `js/pixel-assets.js` | 1 | 2.67 MiB | 2.00 MiB | 100% | the unit atlas, 2048x663 | 0 |
| `js/painted-assets.js` | 15 | 1.26 MiB | 0.94 MiB | 100% | propsAtlas 512x512 (500.9 KiB); altar 384x237 (249.8 KiB); gong (100.1 KiB); lanternFire 1024x128 (97.9 KiB); four open door slabs 512x128 (about 53 KiB each) | 0 |
| `js/pixel-env-assets.js` | 1 | 0.52 MiB | 0.39 MiB | 100% | the environment atlas, 1024x348 | 0 |
| `js/game.js` | 0 base64, 1 SVG | - | - | - | the cursor | - |
| **total** | **17 PNG** | **4.45 MiB** | **3.34 MiB** | 72% of the ship set | | 0 groups |

Audio data URIs: 0. This is correct for this game, because the sound is synthesized (see Integrity).

Compressed with gzip, the three packs come to 75% of their size, so on a gzip'd link base64 costs almost nothing extra. The saving that matters is in how the PNGs themselves are encoded.

### What is inside the PNGs (`png-probe.cjs`, lossless round-trip proven on `gong`)

| image | dims | base64 now | lossless re-encode (zlib 9, adaptive filter) | + alpha hardened as the game does on load | alpha 0 / partial / 255 | colours |
|---|---|---|---|---|---|---|
| pixel-assets `src` | 2048x663 | 2,799,768 B | 2,167,788 B (-632 KB) | **1,820,692 B (-979 KB, -35%)** | 44.7% / **52.5%** / 2.8% | 243,770 |
| pixel-env `src` | 1024x348 | 546,084 B | 392,144 B | 373,640 B (-172 KB; its alpha is already hard, so only hidden RGB is zeroed) | 51.6% / 0 / 48.4% | 47,275 |
| painted, all 15 | - | 1,319,588 B | 1,089,292 B | 973,616 B | the closed slabs are 98-99% partial alpha | - |

About 48% of the unit atlas's pixels carry alpha 250-254, almost opaque but not quite (253 alone is 32%). The packer (`tools/pack-pixel.ps1`: bicubic, `System.Drawing` PNG) leaves them that way. `PIXEL_ART.init` (`js/pixel-art.js:67-83`) snaps every pixel to 0 or 255 on load anyway. Doing the same snap at pack time gives the same picture, within 1 level of premultiply rounding, and saves 979 KB.

Lossy palette PNG is not an option. The unit atlas has 130k opaque colours after hardening, and `PIXEL_ART.hornsOf` finds horns by exact colour thresholds (`r < 72 && r >= 26 && r > b + 8`, `js/pixel-art.js:119`).

## Ranked savings (proposals, nothing applied)

| # | action | files / keys | bytes saved | how estimated | risk / rule it touches | verify by |
|---|---|---|---|---|---|---|
| 1 | Retire the painted pack. Swap its load gate and the `naturalWidth` gates for `PIXEL_ENV.ready`, write in the altar's and gong's aspect ratios, then delete the file from both script lists and the files map (`null`) | `js/painted-assets.js`; gates at `js/painted-art.js:206,277,293,313,345,360,420,426,432`, `js/prop-pixels.js:726`, `js/render.js:1880` | **1,321,047 B (20% of the ship set)**, plus 15 image decodes at load | measured: it is the whole file | Loses `#paintedprops` (an open question in CLAUDE.md). If the file is simply deleted, 12 prop kinds silently fall back to the old level-one primitives (probe). Without the altar aspect written in, the altar moves up about 4 px | `painted-probe.cjs <dir> on` shows no painted image drawn; `empty` after the change should match `on` |
| 2 | Harden alpha at pack time in `pack-pixel.ps1`, the way `pack-pixel-env.ps1` already does with `EnvClean.Clean`, and recompress | `js/pixel-assets.js` | **979,076 B** (632 KB of it from recompression alone) | measured: in-memory re-encode of the embedded pixels | Generated file: change the packer and re-pack, never edit by hand. `PIXEL_ART.init` hardening becomes a no-op | re-pack, then census plus a pixel diff against the hardened runtime canvas |
| 3 | Recompress the environment atlas (zlib 9 plus adaptive filters as a post-step to both packers; `System.Drawing` exposes no PNG compression level) | `js/pixel-env-assets.js` | 172,444 B | measured, re-encoded | Generated file, same as #2 | census |
| 4 | Decide on the 7 environment atlas items no code names: `floors-15` dark stone, `room-props-06` wall piece, `-08` pot and shards, `cave-props-03` mossy stone, `-04` stone slab, `-07` cave grass, `-08` roots | `js/pixel-env-assets.js` | 69,530 B (67.9 KiB) after #3; more when the atlas repacks shorter | measured: rects blanked and re-encoded | A design call: wire them in as litter or drop them from the manifest | `env-orphans.cjs` |
| 5 | If #1 is refused but the pack stays for `#paintedprops`: drop the 6 atlas cells nothing names (`cage-bars`, `cage-broken`, `secret-wall`, `crate-debris`, `brazier-unlit`, `worktable`) and the 3 unused cells of each open slab (`brokenDoor` reads only x 384-512) | `js/painted-assets.js` | about 290 KB (163 KB + 4 x 32 KB) | measured by blanking | The pack is frozen ("never edit by hand", sources deleted), so this needs a generator nobody has. Question for the user | `blank-probe.cjs` |
| 6 | Pack the small units at their own scale. Chicken and raven are 5.09 atlas px per world px against the goat's 3.29 | `js/pixel-assets.js` | about 50-80 KB (chicken is 6.7% of atlas area) | **static estimate, drawsize not run** | Low value | drawsize.js in the browser |
| 7 | Remove the retired combat sheet and its packer | `assets/combat-fx/effects.png`, `tools/pack-combat-art.cjs` | 0 shipped; 1.2 MB on disk and in any folder zip | measured | None: it is in git history | `git grep` |
| - | **Total, if 1-4 land** | next publish | 6,471,729 B down to about **3.93 MB (61%)** | measured parts added up | | |

## Integrity

**Orphans**
- **Painted pack: verified with a driven probe (vm, not the browser).** I loaded every `index.html` script into a node vm with a canvas that records each `drawImage`, then drove 21 prop and door paths.
  - Default (`PROP_PIXELS.on`): **0 of 15 painted images reach the screen.** Every one is a prop-pixels canvas or the environment atlas. Same result on HEAD.
  - `#paintedprops`: every image is reachable.
  - `PAINTED_ASSETS = {}`: `painted.ready` stays false. Altar, lamp, bell, cage, crate, table and brazier fall back to `AltarArt.drawProp`, the old level-one primitives. Lying weapons, big grass, spikes and barrels return false and draw primitives. Door slabs and broken posts draw nothing.
  - So the pack is load-bearing as a load gate and as two aspect ratios, not as pixels.
- **7 environment atlas items: verified with a driven probe.** The live registries (`PIXEL_ENV_ID`, `PIXEL_FLOORS`, `PIXEL_ROOMS`, `PIXEL_LITTER`, GOAT GRID decor) plus every literal `PIXEL_ENV.draw` name leave them unnamed. They are 19.5% of the atlas's item area. No dynamic `props-`/`floors-` keys were found.
- **6 painted propsAtlas cells:** named in `ATLAS_CELL` only (`js/painted-art.js:5-10`) and passed to no `atlas()` call. Static, but every `atlas()` caller was read.
- **`assets/combat-fx/effects.png` (1,198,588 B): lead confirmed.** Nothing loads it:
  - shipped code has no path loader at all (no image path in any `.src`, no `fetch` of media; the only `fetch` is the dev `/tuning-edit` POST)
  - the published listing has no `assets/` path
  - its own `README.md` says "Retired 23 Sep 2026 (1.56)"
- **`output/`, 17.5 MB, all tracked, none shipped.** Files the packers never read:
  - `pixel-mid-2026-09-23/references/style-2.png` (1,175,988 B) and `style-3.png` (1,112,739 B): image-gen references that no manifest names
  - `pixel-environment-2026-09-23/atlas-packed.png` (409,563 B): a byproduct of `pack-pixel-env.ps1`, byte-identical to the embedded env atlas
  - `pixel-ominous-decals-2026-09-23/` (2.1 MB): "not integrated" per `ART_HANDOFF.md`
  - four byte-identical duplicate pairs (`floors-v2.png`, the env `manifest.json`, `HANDOFF_CLAUDE.md` = `HANDOFF_GOAT_ALLIES.md`, `inspect-sources.ps1`). Git stores each once; they cost only on disk and in a folder zip.

**Missing**
- Every unit key the code asks for exists (`PIXEL_EXTENT`, `PIXEL_UNIT`, the literal icon ids).
- Every environment id the registries name exists.
- Every literal Foley recipe `audio.js` asks for exists: 41, plus the dynamic `goose` and `crow`.

**Generated files and their generators**

| output | generator | source | hand-edited? | stale? |
|---|---|---|---|---|
| `js/pixel-assets.js` | `tools/pack-pixel.ps1` | `output/pixel-mid-2026-09-23` | no: one commit (`c3bda62`), working tree = HEAD | **no**: replaying the packer's shelf-pack arithmetic from the current manifest gives all 124 frame rects and the 663 px height exactly (`pack-replay.cjs`) |
| `js/pixel-env-assets.js` | `tools/pack-pixel-env.ps1` | `output/pixel-environment-2026-09-23` | no | **no**: the embedded PNG is byte-identical to that run's `atlas-packed.png`, and the 40 items match the manifest |
| `js/painted-assets.js` | none (frozen, sources deleted) | git history | no (2 commits) | n/a |
| `js/combat-assets.js` (deleted in `12f00b1`) | `tools/pack-combat-art.cjs` | `assets/combat-fx/effects.png` | - | **stale pipeline, lead confirmed** (below) |

About the stale combat pipeline: running `pack-combat-art.cjs` would write a 1.6 MB `js/combat-assets.js` that no HTML loads. `check-sync.js` would then fail on it, and CLAUDE.md's publish recipe ("`files`: every file in `js/`") would ship it. None of the three packers takes an output path, and `pack-pixel-env.ps1` also writes into `output/`, so none was run.

**Audio in the shipped build**
- 0 audio files; the sound is synthesized. `js/foley.js` is in both script lists (uncommitted) and not yet in the live version, and the guard enforces the files map.
- `node tools/audio-check.js`: PASS (3 PASS lines, exit 0). **But it loads `tuning, rng, rules, audio, game` and not `foley.js`**, so it passes without exercising any sound effect.
- My `foley-probe.cjs` rendered all 43 recipes in node: none threw, none were NaN or silent, 36.3 s of audio in total.

**Leads from the earlier pass**
- `pack-combat-art.cjs` writes a file that no longer exists: **confirmed**.
- `ART_TODO_GPT.md:140` calls `combat-assets.js` "уже в игре": **confirmed stale**. The whole document is the state at build 1.53: sheets A-F were all drawn in code in 1.63-1.64, and line 138 (stairs drawn as a gradient) is stale since 1.64.
- `effects.png` orphan: **confirmed**.
- New: `combat-assets.js` is **not** in the live artifact, so CHANGELOG 1.58's "pass null at the next deploy" was done. Refuted as a live-weight problem.

**Stale doc lines** (leads for `design-drift`, not asset weight)
- CLAUDE.md file map, `painted-assets.js` row: "only the painted props with no pixel sprite yet". This contradicts its own open question (line 940) and the probe.
- The same wording appears in the `js/painted-assets.js` header comment and `js/pixel-art.js:3`.
- `assets/combat-fx/README.md:11-13` still tells you to regenerate with the packer, under its own "Retired" line.

**Git weight**
- 160 MiB of history, mostly deleted painted sources and hand-off zips (19.1 MiB of zips, 85.5 MiB under `assets/`). No file is near 50 MiB.
- 11.93 MiB of `tmp_obj_*` garbage in `.git/objects` (interrupted writes, likely Drive sync or concurrent sessions). Not shipped; a `git gc`/`prune` for the user, not for this audit.

## Checks and their planted cases
- `census.cjs`: a scratch JS with one 3x2 PNG twice and a WAV. It reported 1 duplicate group, dims 3x2, both keys, and 1 audio URI. It printed "repeated INSIDE one file: 0.00 MiB" for 2x118 B (see the skill notes).
- `png-probe.cjs`: `gong` decoded, re-encoded and decoded again gives identical pixels.
- `painted-probe.cjs`: `off` mode (`#paintedprops`) logs 10 painted images drawn, so the recorder sees painted draws. The other slab variants go untested only because the cases do not cover every door type.
- `env-orphans.cjs --plant`: the fake `planted-99` item is reported.
- `pack-replay.cjs --plant`: nudging one rect gives 22 mismatches.
- `foley-probe.cjs --plant`: `nosuchsound` is reported missing.

## Not measured, and what would measure it
- On-screen draw size and oversample: drawsize.js in the running build. `__drawReport(0)` would also list what is drawn; see the skill notes on "never drawn".
- Whether the artifact host serves gzip: a network capture of the live page.
- A real re-pack with #2 and #3: running the packers with an output path they do not have.
- itch zip size: estimated from deflate per file, not zipped.
- Load time on a phone.

## Files under uncommitted change (the other session)
Git status also shows, beyond what the brief listed: `js/dark.js`, `game.js`, `prop-pixels.js`, `render.js`, `artifact.html`, `index.html` (+foley.js), `tools/check-sync.js`, `balance.js`, new `tools/script-lists.js` and `tools/hooks/`.
- `painted-art.js`: its diff only adds the hound bounce (line 453); every line cited above is identical at HEAD.
- `prop-pixels.js`: adds the sconce, so cited lines are +23 against HEAD.
- The painted probe gives the same result on a HEAD copy.
- `render.js` and `game.js` changed size during the audit (render.js 429,189, then 422,790, then 423,449 B). The totals above are one snapshot.

## Notes on the skill (from applying it here)
1. **Step 0's table hard-codes a stale generator.** It lists `pack-combat-art.cjs` as a Goat out generator, but its output was deleted in 1.56.
2. **"Run `check-sync.js`" does not work in a read-only audit.** It runs `git fetch`, which writes into `.git`, and it fails on a dirty tree. Its artifact half works from `Artifact action:list scope:files`, whose line format its parser accepts. The skill should name that call as the way to measure the SHIPPED artifact.
3. **itch.io's docs site returns 403 to WebFetch.** Name the fallback source: `github.com/itchio/itch.io/blob/master/docs/creators/html5.md`.
4. **drawsize.js cannot see "loaded, never drawn".** Its report keeps only rows with oversample of 1.5 or more, and an image never drawn has no row at all. The biggest finding here, a 1.32 MB pack drawn 0 times, would have been invisible. Add a list of loaded images with 0 draws.
5. **The oversample rule assumes the canvas scales with DPR.** Goat out caps the backing store at 2.2 Mpx (`render.js:88-91`), so "a DPR 2 screen" is the wrong reference. Use the game's own device px per world px.
6. **The census cannot see waste inside a payload:** encoding, near-opaque alpha, unused atlas cells. Those were 1.3 MB of the savings here. Consider shipping `png-probe.cjs` and an atlas-region reachability step with the skill.
7. **census.cjs prints MiB to 2 decimals,** so the planted duplicate shows as "0.00 MiB" waste. Print bytes below 0.1 MiB.
8. **"Run `audio-check.js`" is not enough on its own.** It does not load `foley.js`, so it passes without touching any SFX. The rule should say to check what the audio check loads.
9. **A useful staleness proof when a generator takes no output path:** replay its layout arithmetic from the manifest (`pack-replay.cjs`). Worth adding to the generated-files row.
10. **The report's "build <id>" does not fit a dirty tree with a concurrent editor.** Sizes moved during this audit. Record a timestamped snapshot and HEAD.

Scratch tools: `output/audit-2026-09-24/asset-work/{png-probe,painted-probe,env-orphans,blank-probe,pack-replay,foley-probe,atlas-units,output-refs}.cjs`, `census-shipped.json`, `png-probe.json`, `blobs.txt`.
