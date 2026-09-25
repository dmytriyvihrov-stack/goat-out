# Content audit, 2026-09-24, scope all (Goat out, working tree at 9afe0d3 + uncommitted edits)

```
Promised 31  Built 37  Reachable, verified 32  Leads 9  Label mismatches 15  Not assessed 0
38 rows: UNREACHABLE 2 · LABEL LIES 15 · MISSING 1 · LEAD 9 · NOT ASSESSED 0 · EXTRA 4 · OK 7
```

Read-only on the project. Everything below was derived by loading the game's own scripts into a node
`vm` (the `tools/balance.js` pattern) and asking the live registries and generator; no browser. Probes
and raw output are in `output/audit-2026-09-24/content-audit/` (`probe.js` + `probe-200.txt`, `soulspots.js`,
`setpieces.js`, `canondraw.js`, `mixcomp.js`, `lastfloor.js`, `firetest.js`, `head/` = `git archive HEAD js`).

**Uncommitted state.** Another session is editing. The 8 `LEVELS` rows' `souls`, `gates`, `beasts`,
`arenas`, `TUNING.shop` and `TUNING.soul` are unchanged against HEAD (`git diff js/tuning.js`), so every
soul, shop, escort and boss row below holds for HEAD too. `DARK_LEVEL`, the five `canon: 'lamp'` rooms
(`rooms.js`), the fork labels in `render.js:1234-1250` and the README paragraph on THE DARK are
uncommitted and mid-edit; rows that rest on them say so. README.md and CHANGELOG.md changed while this
audit ran; README line numbers are as of 14:55.

**Probe proved to fire** (`firetest.js`): a fake boon needing a mod nothing sets is reported unopenable
with no setter, and a fake room template with an unknown canon is reported never drawn, while a real
canon room is drawn.

## The known lead: thirteen or fourteen souls a run

Neither. Summed the way `game.startLevel` spends them (`js/game.js:1231-1262`):

| source | per run | how |
|---|---|---|
| `LEVELS[].souls` | 16 | 2 on each of 8 floors (level one is 2, not 1, since 1.41) |
| less the mouse | -3 | `if (this.level.shop ...) soulsHere - 1` on THE YARD, THE ROAD, THE BRIDGE (`shop.levels [1,3,5]`) |
| **authored** | **13** | placed 13.00 in 200/200 seeds of every floor, never short of a spot |
| seeded surprise, a boss lit (`soul.bossChance` 0.4) | +3.1 | 77/200 per floor |
| seeded surprise, a room gives one up (`soul.roomChance` 0.35) | +2.6 | 64/200 per floor |
| **dealt, on average** | **18.6** | range 13..29; about 99% of full runs deal 15 or more (binomial over 8 floors) |
| **most one build can hold** | **14** | `BOON_SLOTS` {active 1, passive 2 per verb, general 4} + the BY THE COLLAR key |

- `js/tuning.js:1895-1896` "Two a level, less the three the mouse stands in for, is fourteen": the
  arithmetic in the sentence gives 13. It was written that way in 209e91b (1.39-1.43), the same commit
  that raised level one from 1 soul to 2, added THE CAVE and brought the mouse; the sentence before it
  (HEAD^) said thirteen for 1 + 2x6.
- `CONCEPT.md:325-326` "one on level one, two on every level after, thirteen across a run against
  sixteen boons": both terms of the formula are stale (level one gives 2; there are 8 floors, and the
  mouse takes 3). The total matches the authored 13 by coincidence. It counts no surprises and the deck is
  25, not 16.
- `README.md:136` "one on the first, two after"; `js/game.js:550` "there are only thirteen of these".
- Consequence nobody wrote down: a run deals about 18.6 souls into a build that holds 14. Simulating
  `openBoonChoice` over 2000 runs of 19 souls, every run ends with 5 souls that open no card and give
  +1 heart silently (`js/game.js:556`, no card, no float text).

## Rows, most urgent first

| # | item | promised where | built | reachable (how verified) | verdict / note |
|---|---|---|---|---|---|
| 1 | A soul in the vault; a soul on a boss paid from the budget (the lit soul-bearer) | CONCEPT.md:108 "Every boss drops a soul", :327 "the gated arena is paid first, then the vault, then the last bosses", :328-330 lit bearer; README.md:136 "the boss carrying one glows"; CLAUDE.md *Souls are a budget* | game.js:1238-1250 (gates, vault, last bosses) | **seeds: vault 0/450, authored boss 0/450** (`soulspots.js`, 50 seeds x 8 floors + THE DARK). Two gates a floor take the whole budget (2, or 1 on a mouse floor) every time; the vault always holds big grass. A lit boss happens only via the 40% surprise (77/200) | **UNREACHABLE (verified)**. Dead since 1.41 (CHANGELOG.md:1029-1034). Question for the user below |
| 2 | Room template `sluice` (funnel) | CHANGELOG 1.48 "four to a canon" | rooms.js:717 | **seeds: 0/200 THE BRIDGE (canon), 0/200 THE RAFTERS, 0/200 THE OSSUARY (mix); 0/100 at HEAD** (`probe.js`, `canondraw.js`) | **UNREACHABLE (verified)**, not caused by the uncommitted edits. Cause: `draw` (gen.js:252-266) aims at `((i-1)/(n-2)) x (pool.length-1)` along the ground-sorted pool; sluice has the highest ground of its canon (0.56) and the target only reaches the top in the last room, which is always an arena. See row 21 |
| 3 | What an escort on the last floor pays | BEAST_CARD tuning.js:2212-2214, player-facing on the clear card: crow "IT WILL BE ON THE NEXT STAIRS, FREE", tortoise "FOR THE REST OF THE RUN" | THE OSSUARY `beasts: ['crow','tortoise']` | **seeds: coop 200/200 (crow 94, tortoise 106); driven: `Game.prototype.nextCard` on each floor with a crow banked** (`lastfloor.js`): floors 1-7 reach `startLevel` (where `Beast.placeGift` runs, game.js:1171); THE OSSUARY goes to `state win` with `crowGift` still true | **LABEL LIES (player-facing)**. The card promises a talisman on stairs that do not exist, and a reward for a run that has ended |
| 4 | THE BRIDGE hint "EVERYTHING THEY HAVE LEFT IS HERE" | tuning.js:2144, the floor text of level 6 | | written in 8ec9056 (0.7/0.8) when THE BRIDGE was the last of four floors; now 6th of 8, and the wraith is first dealt two floors later (THE OSSUARY 28.2 a seed, 0 before) | **LABEL LIES (player-facing)** |
| 5 | How many floors | README.md:4 "Six levels"; README.md:77 "Eight levels" then describes seven (no THE RAFTERS) | `LEVELS.length` 8, plus THE DARK in place of the 5th (uncommitted) and THE TRIP in place of any | all 8 generate 200/200 | **LABEL LIES (README, the player's file)** |
| 6 | "THE ALTAR is Bearers, with one hound near the end of it" | README.md:77 | ALTAR `kinds: ['bearer','champion']`; the hound moved to THE YARD (tuning.js:1901-1904) | **seeds: 0 hounds on THE ALTAR in 200/200** | **LABEL LIES (README)** |
| 7 | "Every level carries more hounds than the one before" | README.md:81 | | **seeds, hounds a floor (200 each): 0, 4.8, 11.2, 7.0, 9.6, 14.0, 19.1, 8.4**. Falls at THE ROAD and THE OSSUARY | **LABEL LIES (README)** |
| 8 | The Great Hall's "fifteen men" | README.md:115; CONCEPT.md:215 "fifteen men or more" | GREAT_HALL_TEMPLATE 38x22, two Mills (verified) | **seeds (60): THE ROAD 5..9 men (avg 6.8), THE BRIDGE 15..18** | **LABEL LIES** on THE ROAD, whose hall is bought with `hallThreat: 11` (tuning.js:2053) on purpose |
| 9 | "Two milk bowls per level" | README.md:156 | milk rhythm `max(heals, ceil((rooms-1)/every))` | **seeds (200): heal props 3.0 (ALTAR) to 5.5 (BRIDGE) a floor**, plus the vault's big grass on 7 of 8 floors | **LABEL LIES (README)** |
| 10 | Souls a run | tuning.js:1896 (14), CONCEPT.md:325-326 (13 from 1 + 2 a floor), README.md:136, game.js:550 (13) | see the table above | authored 13 placed 200/200; dealt 18.6 on average (surprise rates measured over 200 seeds) | **LABEL LIES (docs and comments)**; the design side is row 19 |
| 11 | Which floors the mouse is on | GEN_RULES.shop `text`, rules.js:556, shown on the dev drawer's RULES page: "THE YARD, THE THRESHING FLOOR and THE RAFTERS"; comment tuning.js:1063 | `shop.levels [1,3,5]` = THE YARD, THE ROAD, THE BRIDGE (the cave moved to third in 1.50) | **seeds: shop gate 200/200 on YARD, ROAD, BRIDGE, 0/200 elsewhere**. The rule's `check` reads `TUNING.shop.levels` and is right; only its words are stale | **LABEL LIES (dev-facing)** |
| 12 | "sixteen boons" and the named list | CONCEPT.md:326, :333-345 (6 actives, 10 passives) | BOONS 25 (13 actives, 12 passives), tuning.js:1493-1620 | all 25 offered (sim, 2000 runs) | **LABEL LIES (docs)**. Also LONG HORNS and DEAD WEIGHT are actives in the code, passives in CONCEPT |
| 13 | "The first soul of a run always offers the roll" | CONCEPT.md:331-332; also :350 "none of the three buttons" against :64 "two of the four" | game.js:548-568 deals actives first; the roll is whole from the start (`BOON_BASE.roll: true`) | read off the function and simulated | **LABEL LIES (docs)** |
| 14 | "The soul gate, on level one only" | CONCEPT.md:347 | two gates on every floor (`gates`, GEN_RULES.soulgate) | **seeds: 2 gates in 200/200 of every floor** | **LABEL LIES (docs)** |
| 15 | "Seven levels" and the level table | CONCEPT.md:154, :179-186 | 8 floors; rooms 10/12/13/14/13/15/15/15 against the table's 12/12/14/14/16/16/16/15; THE CAVE row sits last, lists three bosses and "Everything" | THE CAVE is third, two arenas (butcher, brute), no rifles or wraiths (seeds: 0 hunters, 0 wraiths in 200) | **LABEL LIES (docs)**. The other seven boss rows match |
| 16 | "The killbox, late on the four levels that have rifles" | CONCEPT.md:170 | `killboxAt` on 5 floors | **seeds (60): killbox on THE ROAD, THRESHING FLOOR, BRIDGE, RAFTERS, OSSUARY, 60/60 each**; THE BRIDGE's is room 6 of 15 | **LABEL LIES (docs)** |
| 17 | CONCEPT's own lists | CONCEPT.md:158-164 canon paragraph (7, no THE HOLLOW); :98-106 enemy table (6 rows, no wraith) | 8 canons; 7 kinds | all dealt (rows 34-35) | **LABEL LIES (docs)**, gaps rather than wrong numbers |
| 18 | TUCK AND ROLL | CONCEPT.md:339 | not in BOONS | cut on purpose when the roll became innate (CHANGELOG.md:2262) | **MISSING**, the line should go |
| 19 | Souls against the build's 14 slots | nowhere (the docs imply "no run gets everything" and 13 souls) | BOON_SLOTS tuning.js:1457, fallback game.js:556 | **sim: 19 souls a run, 2000 runs: 14 held, 5 souls a run give a silent +1 heart, in 100% of runs** | **LEAD** (design). Question below |
| 20 | "The other half of a level's rooms is the mix ... the back half of the game is everything it has taught you, shuffled" | CONCEPT.md:165-167 | `known`, `pickCanonRooms` | **seeds (80): mix rooms a floor 1, 2, 3, 0, 1, 0, 2, 1**; THE ROAD and THE BRIDGE deal none (set pieces and traps take every non-canon slot); THE OSSUARY's one is stone 54%, drop 41%, and never hollow, open or funnel | **LEAD** (design). Question below |
| 21 | The top-ground end of each canon | CHANGELOG 1.48 | rooms.js | **seeds (200 per floor that can draw them): windowrow 12, vise 17, gallery2 18, flanks 22**, against 100-500 for their neighbours | **LEAD**, same cause as row 2 |
| 22 | THE DARK when the run also ate the mushrooms on THE ROAD | the fork's floor says THE DARK in front of the cold flight (render.js:1245, uncommitted) | game.js:1124 `index === this.tripAt ? tripLevel(index) : index === this.darkAt ... ? darkLevel()` (same precedence at HEAD) | mushrooms on THE ROAD in 76/200 seeds; the precedence is static only | **LEAD, static only**. Eat the tuft on THE ROAD, take the dark flight, and THE TRIP is played, not THE DARK |
| 23 | Two Q-verb talismans on one shelf | stockFor gen.js:1269-1271 "never two of one sort on a shelf"; ARTIFACTS_TZ.md "one Q verb" | BOOMERANG and STRANGE SYMBOLS have no `tag`, STRAW EFFIGY is `tag: 'q'` | **rolled: 1.5% of 12000 shelves offer two of the three** | **LEAD** (small): tag the two old ones `'q'` |
| 24 | Duplicate template name `store` | | rooms.js:122 (plain) and rooms.js:1110 (lamp, uncommitted) | both drawn; nothing looks a template up by name, but the balance report and RULES page print it | **LEAD**, uncommitted mid-edit |
| 25 | Souls the tools assume | title LEVELS row "N souls" (render.js, `startAtLevel` game.js:1448-1461); `tools/balance.js:150-160` threat over power | both count 2 a floor | ignores the 3 mice, the ~0.7 surprise a floor and the 14 cap; the row deals exactly what it says, so it is consistent with itself | **LEAD** (tool) |
| 26 | Rat ogre | KILLED_BY, Shop.spawnOgre | shop.js; `shop.strikes` 3 | only by headbutting the mouse three times | **LEAD, static only**; promised in neither CONCEPT nor README |
| 27 | The hidden wraith (box or milk) | CLAUDE.md *Wraith* | `game.stageFirstHide`, `Enemy.hide` | runtime staging, not reachable from the generator | **LEAD, static only** |
| 28 | Ten boons CONCEPT never names | | splash, venomjaw, charge, venomroll, leapfrog, spit, stomachs, coldeye, kindling, oracle | all offered (sim) | **EXTRA** (fine; CHANGELOG documents them) |
| 29 | THE DARK | README.md:98-104 (uncommitted) | DARK_LEVEL tuning.js:2285-2305 (uncommitted), canon THE LAMP, 5 rooms | **seeds: fork 200/200 on THE ROAD, THE DARK generates 200/200**; "FEWER OF THEM" holds (41.5 men a seed against 54.8 on THE THRESHING FLOOR); no Mill (CONCEPT.md:154 says every level has one) | **EXTRA** (uncommitted) |
| 30 | THE TRIP | CLAUDE.md, CHANGELOG 1.46 | tripLevel tuning.js | **seeds: tuft on YARD 89, CAVE 85, ROAD 76, THRESHING 96, BRIDGE 99, RAFTERS 78 of 200; never ALTAR or OSSUARY; each trip floor generates 60/60**. A trip floor has no mouse and no coop (0/60): a trip on THE ROAD or THE BRIDGE skips that mouse, and its soul budget goes back to 2 | **EXTRA** |
| 31 | The mouse, 21 talismans, 4 escorts | CLAUDE.md, ARTIFACTS_TZ.md, CHANGELOG; none in CONCEPT or README | | dealt (rows 32-33) | **EXTRA** against the design truth: CONCEPT names none of them |
| 32 | Talismans: 17 from ARTIFACTS_TZ.md, 21 in all, 3 tiers | CLAUDE.md:89, :691; ARTIFACTS_TZ.md:1 | ARTIFACTS tuning.js:1652-1812: 17/17 TZ ids + firecharm, clover, boomerang, symbols | **rolled `stockFor` 4000 times per mouse floor: every id shelved, 8.6-10.4% of shelves each**; tier I THE YARD, II THE ROAD, III THE BRIDGE and the crow's gift. Every `mods` key an `apply` writes is named in another js file | **OK** |
| 33 | Escorts: tortoise, goose, crow, hen; one a floor, none on level one | CLAUDE.md *Escorts* | Beast.KINDS + chicken, `levelDef.beasts` | **seeds: one coop in 200/200 of floors 2-8 and THE DARK, 0/200 THE ALTAR**; hen on YARD/ROAD, goose YARD/ROAD/THRESHING/RAFTERS, tortoise CAVE/ROAD/BRIDGE/OSSUARY, crow THRESHING/BRIDGE/RAFTERS/OSSUARY | **OK** (except row 3) |
| 34 | Seven enemy types | README.md:124 | THREAT 7 keys | **seeds: every kind dealt** (bearer, brute, hound from THE YARD, Seer from THE YARD, rifle from THE ROAD, Butcher, wraith on THE OSSUARY only) | **OK** |
| 35 | Canons: 8 (+ THE LAMP) | CLAUDE.md *Canons* | 9 templates each, THE LAMP 5 (`CANON.minRooms` 4) | balance run of today: canon share 50% or more on the worst seed of every floor | **OK** |
| 36 | Set pieces: Great Hall on ROAD and BRIDGE, Gallery on the same two, a Mill every floor | CONCEPT.md:154, :213-220 | | **seeds: hall and gallery 60/60 on both; one Mill on every floor, three on the two hall floors** | **OK** (except the ROAD hall's head count, row 8) |
| 37 | Every boon can be dealt | CONCEPT "no run gets everything" | BOONS, `boonOpen` | **sim, 2000 runs each at 13, 19, 25 souls: never-offered list empty**; DEVOUR is the rarest, offered in 26-29% of runs (needs BY THE COLLAR and shares the one grab active with VENOM JAW and CHARGED). No `minLevel` set; each `needs` (grabMen) is set by BY THE COLLAR | **OK** |
| 38 | Bosses per floor | CONCEPT.md:179-185 | `arenas` | **seeds: every floor's arena bosses as listed**, 7 of 8 rows | **OK** (THE CAVE row is row 15) |

## Numbers outside this skill (hand to `design-drift` / `balance-check`)

Mechanic numbers the docs quote that the code no longer pays, found on the way and not audited here:
the pen takes 7 blows (`prop.cage.hits`, 2 after the first run) against README.md:109-110 "Three
headbutts"; `TUNING.butcher.hp` 4 against "three hits" (CONCEPT.md:105, README.md:126); CONCEPT.md:151
caps "seven men" against per-floor `cap.men` 8 and 9 (and 10 in one room seen on THE RAFTERS and THE
OSSUARY); CLAUDE.md's threat ladder "23.6 / 42.8 / 65.7 / 98.2 / 100.6 / 144.1 / 155.6 / 164" against
today's 24.7 / 42.8 / 65.7 / 96.5 / 109.1 / 141.9 / 153.3 / 163.8; tuning.js:710 "Spike floor, from the
third level on" (it starts on THE ROAD, the fourth).

## Not verified

Nothing was driven in the page (the Browser pane is shared, and forbidden by the brief), so the
harness, `tools/escorts.js` and the bot were not used. Rows 22, 26 and 27 are static only. Every other
"reachable" is a seed sweep of the real generator or a call of the build's own function in a vm.
BACKLOG.md:364, :465 and :838 say thirteen souls and sixteen or seventeen cards too, but they are dated
history and are left as written.
