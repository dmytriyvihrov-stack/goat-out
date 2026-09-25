# Design drift (change + scan), Goat out, 24 Sep 2026

Skill: `~/.claude/skills/design-drift/SKILL.md`, both modes. Read-only on the project. Verification at data
level: the game's `js/tuning.js`, `rng.js`, `rooms.js`, `gen.js`, `rules.js` loaded into a node `vm` the way
`tools/balance.js` does (scripts in `output/audit-2026-09-24/dd/`). No browser used.

**Working tree note.** Another session is editing the project. `README.md` changed **during** this audit
(14:48, a new THE DARK paragraph; line numbers below are after it), and `CLAUDE.md`, `MUSIC.md`,
`JUICE.md`, `js/tuning.js`, `js/entities.js`, `js/enemies.js`, `js/render.js`, `js/game.js`,
`js/juice.js`, `tools/balance.js` have uncommitted changes. Every finding below was checked against
`git show HEAD:<file>` as well: **all of them already exist in HEAD**, none is an artifact of the
in-progress edits. `CLAUDE.md` line numbers are the working tree's as of 14:50 and will move.

---

## The two changes, one line each

1. **Souls economy.** "A souls resource (one soul per man killed, banked and spent) -> none." Decided
   23 Sep 2026: *"Not spending them. Make them fewer or take them out. We are not focusing on this; the
   economy only distracted."* (`BACKLOG.md:35-37`, `CLAUDE.md:961`). History the brief did not mention:
   it **was** built once, as the 1.40 mouse's prices in kills ("souls of the killed", `game.kills`), and
   taken out in 1.41 ("No more prices in the dead", `CHANGELOG.md` 1.41). The live code carries none of
   it (verified: no price / afford / spent-kills identifier anywhere in `js/`; the one "bank" is
   `game.js:603`, which says there is none).
2. **Art style.** "Painted sheets and painted props -> Pixel 2.5 everywhere." Units and floors 1.55,
   combat effects 1.58, every prop 1.63, cave spires and stairs 1.64.

**Homonyms kept apart** (the trap the brief named): the live boon souls (`levelDef.souls`, gates, vault,
`game.bossPrize`, the death card's `N SOULS KEPT / LOST`, `RELEASE THE SOUL`, MUSIC's SOUL phrase,
`balance.js`'s "souls in"), the **soul door** (the vault's door, four blows, a soul behind it) and the
**soul gate** (a rest room's bar), the mouse's shop (gives, takes nothing), and for the art change the
live identifiers `PaintedArt`, `painted-art.js`, `#paintedprops`, `Painting` (the floor's picture),
"blood is paint", "the seer paints his rune", "controls painted on the floor".

---

## Change mode A: the souls economy

**Term set.** `soul resource|economy|currency`, `soul per man|kill`, `bank(ed)` + soul, `spend/spent`
souls, `buy|pay|price|cost|sell` + souls, `souls of the killed`, `game.kills`, `soul door`, `economy`,
`currency`, `душ`, `экономик`, `валют`.

**Count before opening** (narrow term set, hits per file): BACKLOG.md 17, tools/backlog-questions.html 7,
CLAUDE.md 8 (4 are "bank" of escorts/audio takes), ARTIFACTS_TZ.md 4, ART_TODO_GPT.md 4, CHANGELOG.md 2,
js/render.js 3, js/tuning.js 2, js/entities.js 2, CONCEPT.md 1, README.md 1, GENERATION_RESEARCH.md 1,
js/foley.js 1. Broad `soul` count for context: CHANGELOG 59, BACKLOG 50, CLAUDE 36, CONCEPT 11, README 9.

**Player-facing text (UI, hints, barks, tutorial, cards): CLEAN.** Every `SOUL` string in `js/` names
the live boon soul: `THE SOUL HOLDS HIM` (entities.js:763), `THE SOUL OPENS IT` (entities.js:1308),
`A SOUL OPENS IT` / `SOUL` over the gate and vault (render.js:2071), `SOUL RELEASED`, `SOUL DROPPED`,
`THE ROOM GIVES UP A SOUL`, `N SOULS KEPT / LOST`, `RELEASE THE SOUL`, THICK HIDE's `OR AT ONCE WHEN YOU
TAKE A SOUL`. No string prices anything in bodies. Level hints (`LEVELS[*].hint`) and `BARKS`: no hit.

| where | says now | truth (source) | class | proposed edit |
|---|---|---|---|---|
| CLAUDE.md:961-966 (Open questions the user has **not** settled) | "A souls resource. Decided against for now ... the open question is what they buy ... The obvious home is the soul door: a vault that opens for souls instead of, or as well as, four blows." | settled 23 Sep (BACKLOG.md:35) | STALE (a RECORD filed as open; re-teaches the dropped design to every session) | Replace with: "**The boon soul count.** A souls resource (one per man, banked and spent) was decided against on 23 Sep 2026 ("the economy only distracted"); its only build was the 1.40 mouse's prices in kills, removed in 1.41. Open from that answer: whether the boon souls should be fewer ("make them fewer or take them out"). A run's budget is `LEVELS[*].souls` less one per `TUNING.shop.levels` floor, plus the seeded extras `TUNING.soul.bossChance` / `roomChance`, against `BOONS`. See `BACKLOG.md`." |
| CLAUDE.md:961 | "Asked for on 14 Sep 2026 and not built" | built in 1.40 as shop prices, removed 1.41 (CHANGELOG 1.40/1.41) | STALE (history wrong) | folded into the edit above |
| BACKLOG.md:506-552 | heading "the shop: a mouse, a rat ogre, souls of the killed, a talisman — *shipped in 1.40*"; body "Items, bought with **souls of the killed** ... Two currencies, two counters ... Price comes off the curve ... Death takes the level's kills back ... spend-early-or-save" | 1.41: "The mouse gives instead of sells ... No more prices in the dead"; CLAUDE.md:698 "She takes nothing; one choice" | STALE (describes the economy as the shipped shop) | Under the heading: "*Prices came out in 1.41 ("No more prices in the dead", `CHANGELOG.md`): the mouse gives, one choice. The souls resource this answered was decided against on 23 Sep 2026 (top of this file). What follows is the 16 Sep plan as written.*" |
| BACKLOG.md:195-196 (struck, shipped) | "There is no bank to put a released soul back in yet (see the open 'a souls resource' question at the bottom of this file)" | the question is closed (BACKLOG.md:859) | STALE (pointer to an open question that is closed) | "There is no bank to put a released soul back in (the souls resource was decided against, 23 Sep 2026), so it is simply not taken" |
| BACKLOG.md:35-37 | the decision, and "whether the existing soul count should drop further is open" | | RECORD | leave; it is the one residual open question and is missing from CLAUDE.md's list (edit above) |
| BACKLOG.md:859-880 | struck heading "a souls resource ... decided against for now, 23 Sep 2026", body lists soul door for souls, soul-priced card, meta-currency | | RECORD | leave |
| tools/backlog-questions.html:224-226 | the `souls-sink` item and its options | answered in the page's db | RECORD | leave; drop the item if the page is republished for another round |
| CLAUDE.md:815 | skills table "a design decision changed (the souls economy, 23 Sep)" | | RECORD | leave |
| CHANGELOG.md (2 narrow, 59 broad) | 1.40 prices, 1.41 removal, soul doors | | HISTORY | leave |
| js/game.js:602-603 | "there is no bank to put it back in" | true | HOMONYM (RELEASE THE SOUL) | leave |
| js/entities.js:936, 1299; js/tuning.js:556; js/render.js:2006, 4230; BACKLOG.md:655, 848 | "soul door" | the live vault door | HOMONYM | leave |
| README.md:23-24, BACKLOG.md:767, js/game.js:1445, js/render.js:6406 | LEVELS "with the souls a run would have banked" | live boon souls | HOMONYM (word "banked" is the dropped design's word; a reader could confuse them) | optional: "would have been dealt" |
| CONCEPT.md:61, js/tuning.js:1431, js/render.js:6020 | "what its soul buys", "the soul bought" | a soul buys a boon card | HOMONYM | leave |
| ARTIFACTS_TZ.md:17, 24, 26, 305; ART_TODO_GPT.md:27, 49, 50 | душа / души | live soul, soul gate, vault | HOMONYM (ARTIFACTS_TZ:17 cites "правило CLAUDE.md про души", a rule CLAUDE.md no longer has: HISTORY, a shipped spec) | leave |
| GENERATION_RESEARCH.md:245, js/foley.js:42 | "credit economy", "Kellet's economy filter" | unrelated | HOMONYM | leave |
| BACKLOG.md:364 (parked), 465 (parked) | "one card in sixteen against thirteen souls"; "Thirteen souls against seventeen cards" | BOONS 25 | UNSURE (parked items; numbers true when written) | append "(16 Sep numbers; 25 boons in 1.64)" |

**Residual question (UNSURE).** "Make them fewer or take them out" can be read as covering the live boon
souls. A run's budget is 13 (16 raw, less one on each of the three mouse floors, `game.js:1235`), and on
top of it every floor rolls `TUNING.soul.bossChance` 0.4 and `roomChance` 0.35 for an unannounced extra:
up to about **six more per run on average** (static only (lead): `startLevel` was not executed, the
conditions at `game.js:1255-1262` are read, not measured), against 25 boons.

**CODE impact (homonym system, lead).** Three code paths sum the souls differently: `startLevel` nets
the mouse out (`game.js:1235`); `startAtLevel` (`game.js:1448`), the LEVELS sheet (`render.js:6464`) and
`balance.js:160`'s "souls in" add a raw 2 a floor and ignore both the mouse and the extras. Jumping to THE
OSSUARY deals 14 boons; a real run arrives with 11 budget + extras + 3 talismans.

---

## Change mode B: painted to pixel

**Term set.** `paint(ed)`, `primitive(s)`, `canvas primitive`, `painted-assets`, `combat-assets`,
`effects.png`, `seven-colour palette`, `image assets`, `bowl` (the primitive heal), `sprite sheet`.
Counts (`paint`): CHANGELOG 79, CLAUDE 29, BACKLOG 17, VISUAL_REFERENCE 7, ART_HANDOFF 6, JUICE 5,
CONCEPT 3, README 2, ENGINE 2, MARKET 1. About 85% are identifiers (`PaintedArt`, `painted-art.js`,
`#paintedprops`, `Painting`), verbs ("paints his rune", "painted on the floor") or struck shipped items:
HOMONYM / HISTORY. All BACKLOG hits are in struck items: HISTORY.

| where | says now | truth (source) | class | proposed edit |
|---|---|---|---|---|
| ART_TODO_GPT.md (whole file) | "что ещё в старом стиле", six sheets A-F to generate; stairs "рисуется градиентом"; `js/combat-assets.js` "уже в игре"; "Состояние на 23.09.2026, билд 1.53" | every sheet shipped as hand-placed pixels in `js/prop-pixels.js` (1.63, 1.64); stairs pixel 1.64; `combat-assets.js` deleted 1.58; ART_HANDOFF.md:33 "Every prop is pixel art since 1.63" | STALE (art brief: sending any sheet wastes an image-gen round) | Header: "**Сделано.** Все листы A-F нарисованы кодом в 1.63-1.64 (`js/prop-pixels.js`), лестница в 1.64; `js/combat-assets.js` удалён в 1.58. Файл оставлен как образец формата брифа (`asset-spec`). Живой пункт один: подключить `output/pixel-ominous-decals-2026-09-23`." |
| ART_TODO_GPT.md:72 (sheet B #3), 121 (sheet F #5) | an **empty** weapon rack; a brazier with a spit and a carcass | 1.63: the stand holds its arm (layered); the roast is a ring of stones, pixel flames, a crocodile on the spit | STALE (designs changed, not just drawn) | covered by the header |
| CLAUDE.md:120 (file map) | "`ART_TODO_GPT.md` — Every painted or primitive leftover as an image-generation brief" | nothing is left | STALE (every session loads it) | "The image-brief format (`asset-spec`); every sheet in it shipped as pixels in 1.63-1.64, the ominous decals are the one live line." |
| CLAUDE.md:92 (file map) | `painted-assets.js`: "only the painted props with no pixel sprite yet" | every one has a sprite since 1.63; ART_HANDOFF: "Nothing by default: only shown with `#paintedprops`"; CLAUDE.md's own open question (959) says so | STALE + DOC-DOC | "the old painted props, drawn only as the `#paintedprops` fallback since 1.63 (every one has a sprite in `js/prop-pixels.js`)" |
| CLAUDE.md:93 | `PaintedArt`: "the remaining painted props (`ATLAS_CELL`, `PROP_FOOT`)" | fallback path only | STALE (mild) | "the painted props' fallback path" |
| CLAUDE.md:646 | "never the painted `shrooms` sprite" | `shrooms` is `PIXEL_ENV` 'cave-props-05' (pixel-art.js:316, render.js:773) | STALE word | "never the environment pack's `shrooms` sprite" |
| CONCEPT.md:412-413 (Not built yet) | "pixel art proper ... Enemies are still drawn with canvas primitives rather than sprites." | Pixel 2.5 units since 1.55 | STALE | delete both phrases |
| CONCEPT.md:360-365 (Presentation, Art) | "Hard silhouettes in a seven-colour palette ... Bearer is a circle with a club ..." | Pixel 2.5 sprites; `PALETTE` has 30 entries | STALE (primitive-era description) | "**Art.** Pixel 2.5: hand-pixelled sprites on one grain, eight facings (`ART_HANDOFF.md`). Every enemy type reads differently at a glance:" then keep the silhouette sentences minus "a circle with a club" |
| CONCEPT.md:78 | "Facing left he is mirrored rather than turned over" | the atlas has eight facings; `PIXEL_ART.frame` has a `flip` (pixel-art.js:90) | UNSURE (static only (lead)) | check which facings are mirrored, then keep or drop |
| README.md:171-172 | "a synthesised score — pad, bass and a phrygian motif under ritual percussion ... No audio or image assets at all." | layered room music is the default, the ritual score is SETTINGS > LAYERED MUSIC off; the art is packed image atlases (`js/pixel-assets.js`, `pixel-env-assets.js`) | STALE (player-facing) | "... a room-driven synthesised score (see MUSIC.md). No audio files; the art is Pixel 2.5 sprite atlases packed into the scripts." |
| ART_HANDOFF.md:3 | "the state as of 23 Sep 2026" | the file covers 1.63-1.64 (24 Sep) | DOC-DOC | "as of 24 Sep 2026 (1.64)" |
| ART_HANDOFF.md:22 | painted combat sheet "retired in 1.56" | CHANGELOG 1.58 "fire and blasts in the game's own pixels" | DOC-DOC | "retired in 1.58" |
| ART_HANDOFF.md:10 | "Three layers" over a four-row table | | DOC-DOC (trivial) | "Three layers and a fallback" |
| VISUAL_REFERENCE.md:3-5, 16-17, 30, 41-44 | "for whoever picks the painted-art pass up next"; `Renderer.painted.character`, 128x128 painted cells, `assets/painted-expansion-v2/pack.cjs` | dated research (22-23 Sep); the pass shipped; those sources are deleted | HISTORY, but CLAUDE.md:8-11 sends every art session to it | one header line: "Written while the art was painted; the pixel pass it argues for shipped in 1.49-1.64 and the painted sources it cites are in git history only." |
| MARKET.md:140 | "canvas-primitive placeholders will not carry it" | dated research (12-14 Sep) | HISTORY | leave |
| JUICE.md (5 hits) | "repainted as a solid white silhouette", `painted-art drawGoat`, `PaintedArt.wounds` | verbs and live identifiers | HOMONYM | leave |

**Collateral rename found on the way (player-facing).** The ordinary heal stopped being a milk bowl in
1.38 ("a smaller sprout of the same grass", render.js:2294; BACKLOG.md:88-90) and the FOUR STOMACHS card
calls it GRASS (tuning.js:1567, using MILK for the mouse's pail). Still "milk": **BELLWETHER'S BELL tier
III, `A WRAITH HIDING AS A BOX OR MILK TWITCHES`** (tuning.js:1754; the disguise is a `heal` Prop,
enemies.js:1439), the FIXTURES label `MILK BOWL` (render.js:4092), the wraith's dev note "a bowl of milk"
(render.js:3757), comments tuning.js:399, enemies.js:1431, entities.js:974, and README.md:156 / CONCEPT.md:154
"milk bowls". Proposed: GRASS in the string and label, "a tuft of grass" in the notes. (The mechanic keeps
its code name `milk` in `GEN_RULES.milk`; that is fine.)

---

## Scan mode

**Denominator.** About 70 named entities (8 levels, 7 enemy kinds, 25 boons of which CONCEPT names 16,
door kinds, set pieces, souls, stands, shield, heal, rail, seed, dev drawer, SETTINGS rows) and **82
numbers auto-compared** (`dd/claims.js`: README 16, CONCEPT 41, CLAUDE 11, MUSIC 10, the comment over
`LEVELS` 2, JUICE 2), plus about 20 compared by hand (below). **28 automated conflicts.**

**Proof the comparison fires.** A scratch copy of the docs with README's "Four hearts" changed to "Five
hearts" (`dd/mut/`) flipped exactly one row, `README.md:70 | hearts | Five | 4 | TUNING.goat.hp`, and the
total went 28 -> 29 (`claims-live.txt` vs `claims-mut.txt`).

**JUICE.md: current, no regenerate needed.** `juiceMarkdown()` rendered into scratch is byte-identical
to the working-tree JUICE.md (73 effects, after the other session's new foley rows). Its authored
literals drift, which is a fix in `js/juice.js` then a regenerate: "Rumble 8-60 ms" (JUICE.md:20,
juice.js:83) while `vibe()` spans 6-80 ms (game.js:2272 `vibe(80)`); "shake 12" (rat ogre, juice.js:248)
and "shake 2" (juice.js:252) are non-hurt shakes that `juice.shakeOther` = 0 zeroes (game.js:2923).

### CONFLICT (doc against code), verified

| where | says | code truth (source) | proposed edit |
|---|---|---|---|
| README.md:4 | "Six levels" | 8 (`LEVELS.length`; README:77 itself says Eight) | "Eight levels" |
| README.md:109-110 | "Three headbutts take the bars apart" | 7 first time, 2 after (`prop.cage.hits`, `againHits`; README:55 correct) | "Seven headbutts (two on every run after the first)" |
| README.md:126 / CONCEPT.md:105 | Butcher "three hits" | 4 (`TUNING.butcher.hp`, since 1.36-1.38, BACKLOG.md:88); arena Butchers are not elite (gen.js:770) so keep 4 | "four hits" |
| README.md:136 / CONCEPT.md:325 | "one on the first, two after" | 2 on every floor (`LEVELS[0].souls`, since 1.41); the mouse stands in for one on THE YARD, THE ROAD, THE BRIDGE | "two a level, one of them the mouse's offer on her floors" |
| CONCEPT.md:326 / tuning.js:1895-1896 (comment over LEVELS) | "thirteen / fourteen across a run against sixteen boons" | budget 13 (16 raw less 3 mouse floors; the doc's "one on level one, two after" sum only lands on 13 by accident), plus seeded extras; `BOONS.length` 25 | derive: point at the keys ("`LEVELS[*].souls` less one per `shop.levels` floor, against `BOONS`") |
| README.md:147 | stands "always two in a boss room" | one `w` in `ARENA_TEMPLATE` (CONCEPT:297 "one to an arena" is right) | "one in a boss room" |
| README.md:149, 158 / CONCEPT.md:300 | a shield "turns three bullets", "worth three" | 2 (`prop.weapon.uses.shield`; tuning.js:676 "three read as a thing you carried through half a level") | "two" |
| README.md:156 / CONCEPT.md:154 | "Two milk bowls per level" | 3-4 a level (`max(heals, ceil((rooms-1)/heal.every))`: 3,3,3,3,4,4,4,4), drawn as grass | "Three or four tufts of grass a level restore a heart each" |
| README.md:71 | seed "printed in the top right" | bottom-left (render.js:5744) | "bottom left, the build under it" |
| README.md:77 | "THE ALTAR is Bearers, with one hound near the end of it" | ALTAR kinds `bearer`, `champion`; 0.0 hounds over 12 seeds (`dd/hounds.js`) | "Bearers and one brute; the hound is THE YARD's first new thing" |
| README.md:80-81 | "Every level carries more hounds than the one before" | per level 0, 4.5, 10.9, 8.8, 9.6, 13.6, 19.3, 8.2 (12 seeds each) | delete, or "hounds from THE YARD on, most on THE CAVE and THE RAFTERS" |
| README.md:79-80 | THE CAVE "under all of it", listed last; THE RAFTERS missing from the list | THE CAVE is the third floor (1.50); RAFTERS is `LEVELS[6]` | reorder and add THE RAFTERS |
| README.md:114-115 / CONCEPT.md:214-215 | Great Hall "fifteen men" on THE ROAD and THE BRIDGE | 6.8 men on THE ROAD, 15.7 on THE BRIDGE (balance report, 25 seeds; `hallThreat` 11 vs 24) | "a crowd on THE ROAD, fifteen men on THE BRIDGE" |
| README.md:138 | "Boons last the run and die with you" | a death restores `levelBoons`: only souls taken on that floor are lost (CLAUDE.md "Death and restart"; CONCEPT:333 "a death takes none of them") | "Boons last the run; a death takes back only the ones swallowed on that floor" |
| CONCEPT.md:100 | Bearer "0.58 s windup" | 0.46 (`TUNING.bearer.windup`) | derive or "0.46 s" |
| CONCEPT.md:103 | Hunter "aims for 0.8 s" | 0.88 (`hunter.aimTime`) | "about 0.9 s" |
| CONCEPT.md:107-108 | "Arena bosses carry an elite flag: they absorb three hits ... Every boss drops a soul." | Butcher bosses are not elite (4 hp, gen.js:770), brute bosses 4 (`champion.bossHp`); bosses past the budget leave milk (`game.bossPrize`; CONCEPT:327 says so) | "Arena Seers and wraiths are elite (three hits), brutes four, the Butcher his own four. The last bosses of a level carry its souls; the rest leave milk." |
| CONCEPT.md:154 | "Seven levels" | 8 | "Eight levels" |
| CONCEPT.md:170 | killbox "on the four levels that have rifles" | 5 (`killboxAt` on ROAD, THRESHING FLOOR, BRIDGE, RAFTERS, OSSUARY) | "five" |
| CONCEPT.md:179-186 (level table) | rooms ALTAR 12, THRESHING 14, BRIDGE 16, RAFTERS 16, OSSUARY 16, CAVE 15; CAVE last, "Everything", bosses "Butcher, brute, elite Seer" | 10, 13, 15, 15, 15, 13 (`LEVELS[*].rooms`); CAVE is `LEVELS[2]`, kinds bearer/champion/dog/seer (no rifles), arenas butcher + champion | regenerate the table from `LEVELS` (the way `juice-md.js` writes JUICE.md) |
| CONCEPT.md:280 | "Doors ... take three blows" | planks 1, iron 3, vault 4, stairs 3 (`prop.door.hits` / `ironHits` / `vaultHits` / `stairHits`) | "A plank door goes on the first blow, an iron one takes three" |
| CONCEPT.md:285 | "Spike floors, from the third level on" | from THE ROAD, the fourth (`LEVELS[3].spikes` 0.3; THE CAVE has 0) | "from THE ROAD on" |
| JUICE.md:20 | rumble "8-60 ms" | 6-80 ms | fix `js/juice.js:83`, regenerate |

### STALE NAME / DOC-DOC / INTENT / UNVERIFIABLE / UNDOCUMENTED

| where | finding | class | proposed edit / question |
|---|---|---|---|
| CONCEPT.md:339 | "**Tuck and Roll** answers the fourth button" | STALE NAME (no such boon; the roll is whole out of the pen, CONCEPT:61; DEAD WEIGHT is its active) | delete |
| CONCEPT.md:344 | Long Horns and Dead Weight listed as passives | STALE (both `active: true`; LONG HORNS since 1.56) | move to Actives |
| CONCEPT.md:336-345 | 16 boons named; SPLASH, VENOM JAW, CHARGED, SOUR TUMBLE, LEAPFROG, VENOM SPIT, FOUR STOMACHS, COLD EYE, KINDLING, THE ORACLE missing | UNDOCUMENTED | list all 25, or point at `BOONS` and the BOONS tab |
| CONCEPT.md:331-332 | "The first soul of a run always offers the roll" | CONFLICT (game.js:547 "The first soul always offers actives") | "always offers actives" |
| CONCEPT.md:347-350 | "The soul gate, on level one only: the brute's arena is shut ... the soul he is carrying is the bar" | STALE (since 1.41 every level has two gates, a soul lying in a rest room; `levelDef.soulGate` no longer exists; BACKLOG.md:451 still names it) | "**The gates.** Every level stops you twice (`levelDef.gates`) ..." |
| CONCEPT.md:327 | "The gated arena is paid first" | STALE (the two rest-room gates are paid first) | "The gates are paid first" |
| CONCEPT.md:260-262 / README.md:110-111 | "The two rooms after it carry the controls painted on the floor ... with no men in either" | STALE (comment over LEVELS: those two rooms were cut; the pen teaches move and headbutt, the arms room says GRAB; ALTAR is 10 rooms) | "The pen teaches move and headbutt on its own bars; the room that stands a blade and a crate in front of you says GRAB." |
| README.md:57-64 | GRAB, throw, ROLL and BAAH each have **two** rows, saying different things (a thrown man "dies on the wall" vs "comes apart") | DOC-DOC | keep one row each |
| README.md:32-46 | `## Controls` opens with the music paragraph | DOC-DOC (structure) | move the paragraph under Presentation |
| README.md:147-150 vs 158-159 | "a thrown sword goes through the first man ... Both lie where they land, so a stand is worth crossing the floor for twice" vs "rare and single-use. A thrown blade snaps" | DOC-DOC | keep the second; the code is 2 uses each (`uses`), so "single-use" is also off |
| CONCEPT.md:36 vs 64, CLAUDE.md ground rule 1 | "Six verbs, forever ... They never add a button" vs "the four buttons" vs "never add a seventh button"; and Q exists for BOOMERANG / STRANGE SYMBOLS / STRAW EFFIGY (BACKLOG.md:506 records the overrule, "мои правила моя игра") | INTENT | question 3 below |
| CONCEPT.md:56, 104 / README.md:131 | "Faster than any cultist"; the hound "As quick as the goat" | INTENT, static only (lead): goat 0.64 PACE base, 0.80 at full run-up (`momentum.max`); clubman 0.765, hound 0.882; per-state chase multipliers in enemies.js not traced | question 4 below |
| tuning.js:412 | "A third heart" over `hp: 4` | CONFLICT (code comment) | "A fourth heart" |
| tuning.js:676-680, entities.js:932 | "A blade is one throw" then "A sword is two now as well"; "a shield is three men or three bullets" | CONFLICT (code comments; `uses` 2 / 2) | rewrite the two comments |
| README.md (controls table) | no Q | UNDOCUMENTED (player-facing; Q exists only while a Q item is worn) | one row: "Q, once worn: the boomerang, the blink, the effigy" |
| CONCEPT / README | the seeded extra souls (`soul.bossChance`, `roomChance`) | UNDOCUMENTED | one sentence in CONCEPT's souls section |
| MUSIC.md:140, 41 | "twenty-three instrument/event tracks", "41-82 Hz" | UNVERIFIABLE here (needs the arranger run) | none |
| CONCEPT.md:131 | "roughly one man in seven crossing the Mill still rides it" | UNVERIFIABLE statically | none |

Clean against the code: all 10 MUSIC.md numbers compared (118 BPM, family cap 6, 8-tile pursuit, 0.3 s
fades, queue 12, grass 4 tiles / 3 patches, levels 5+, 2 spotted bars, 2 Mills), all 11 CLAUDE.md numbers
compared (souls 2, ARTIFACTS 21, 17 talismans, `CANON.minRooms` 4, secret 2, stairs 3, vault 4, clock 9 s,
spike run 9, `BOON_SLOTS`, three wares), and in CONCEPT the goat's timings, brute 3/4, Seer, Hunter range,
caps, stair door, pen 7, brazier 3 s, combo 2.4 s. SETTINGS' EASY MODE note ("Six hearts ... 40% longer")
matches `EASY` but is authored, not derived.

---

## Questions for the user

1. Does "make them fewer or take them out" cover the **boon souls** too (13 budget + up to about six
   seeded extras a run, against 25 boons)? Recommendation: read the 23 Sep answer as closing only the
   one-per-man resource; if "fewer" is wanted, turn down `TUNING.soul.bossChance` / `roomChance` (the
   extras nobody is told about) before touching `levelDef.souls`.
2. ART_TODO_GPT.md: a DONE header, or delete? Recommendation: header, keep it as the brief-format
   template `asset-spec` points at.
3. Pillar 6 says upgrades never add a button, and Q exists for three talismans. Recommendation: amend the
   pillar to record the 18 Sep exception ("a verb that does not exist until worn").
4. "Faster than any cultist": the goat was slowed on purpose in 1.13 and earns speed back over a run-up.
   Recommendation: reword the doc ("faster than any cultist once he has a run-up; a hound is always
   quicker") rather than move a number.

## Verdict

**DRIFT** (change: 11 stale rows across CLAUDE.md, BACKLOG.md, CONCEPT.md, README.md, ART_TODO_GPT.md,
ART_HANDOFF.md, VISUAL_REFERENCE.md, plus one player-facing rename; player-facing text is clean for the
souls economy; scan: 28 automated conflicts out of 82 compared, about 15 more by hand, 4 questions).
No edit was made; everything above is a proposal.

## Files

Scripts and outputs in `output/audit-2026-09-24/dd/`: `load.js` (vm loader), `get.js` (evaluate an
expression in the loaded context), `facts.js`, `claims.js` (82 claims), `claims-live.txt`,
`claims-mut.txt` and `mut/` (the mutation proof), `hounds.js`, `juicegen.js` and `JUICE.regen.md`.
