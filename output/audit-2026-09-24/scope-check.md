# Scope check (project), Goat out, 24 Sep 2026

Skill: `~/.claude/skills/scope-check/SKILL.md`, project mode. Read-only on the project; nothing under
`Goat out/` was created, edited or deleted. Throwaway probes are in this folder
(`scope-probe.js`, `arenas-probe.js`, `dark-probe.js`, output `scope-probe.out.json`).

```
Scope check (project), 2026-09-24, window 13 Sep (1.0, ebcecaf) to 24 Sep (1.64 HEAD + 1.65 in the working tree)
Baseline: 16 items: 6 pillars (CONCEPT.md:23-38, unchanged since 8ec9056, 13 Sep), 3 CLAUDE.md ground rules
          that are not already a pillar (6 no layout memory, 7 two axes, 8 promises as rules), 1 identity line
          (CONCEPT.md:20-21), 6 "Not built yet" items as of the window start (git show ebcecaf:CONCEPT.md)
Accumulated: 65 features (21 core, 23 support incl. 5 tools, 19 addition, 2 argues)
Net change: +62% ((19 additions - 9 parked or removed) / 16)
Backlog inflow/outflow: W1 (13-19 Sep) ~205 in / ~180 out; W2 (20-24 Sep) 13 in / ~30 out
   but 9 additions in W2 never had a backlog line (see "Unlogged inflow")
Since the freeze (23 Sep ~15:00 UTC): 17 features, 6 of them additions; code 23,396 -> 28,497 lines (+22%)
Verdict: BLOATED (net change over 25%, two `argues` open). The freeze is NOT HOLDING.
```

## 0. Sources of truth found

| source | where | state |
|---|---|---|
| overrides | `CLAUDE.md` ground rules 1-8 (lines 33-69) | read; rules 1, 3, 4 restate pillars 6, 2, 3 |
| concept | `CONCEPT.md` pillars (23-38), "Not built yet" (410-414) | pillars unchanged since 13 Sep (`git log -L`), but the rest is stale: "Not built yet" still lists "pixel art proper" (412), the levels table says "Seven levels" and puts THE CAVE last with 15 rooms (180-190); nothing on THE DARK, THE FORK, THE TRIP, barrels, escorts, the shop |
| backlog | `BACKLOG.md`, 22 dated batches, 14-23 Sep | nearly drained; top block (11-40) holds the 23 Sep answers and the playtest plan |
| the plan in full | `tools/backlog-questions.html:130-165` (group `plan`) | week 1 23-29 Sep polish "без новых систем", week 2 30 Sep-6 Oct playtest, week 3 7-13 Oct triage |
| changelog | `CHANGELOG.md`, 1.0-1.64 plus a 1.65 entry written by the other session at 14:48 today (uncommitted) | three formats: bullets (1.50+), bold paragraphs (1.34-1.49), plain prose (1.26-1.33) |
| open questions | `CLAUDE.md:933-957` | wife, one life per level or run, mirrors, souls resource, gamepad/Priest/acts |
| the freeze itself | only `BACKLOG.md:38-40` and the questionnaire artifact | **absent from CLAUDE.md** (the uncommitted Skills table names it at 797, the freeze itself is not written there) |
| git | 60 commits; working tree: 22 modified, 7 untracked (`js/foley.js`, `tools/hounds.js`, `tools/sfx-board.html`, `tools/hooks/`, `tools/script-lists.js`, `.claude/settings.json`) | another session is mid-edit; `tuning.js` and `CHANGELOG.md` were written at 14:48 |

## 1-2. Baseline and window

Six pillars: 1 Run, don't fight. 2 Geometry kills. 3 Clunky on both sides. 4 One life, new level. 5 Noise is a
system. 6 Six verbs, forever. Plus ground rules 6 (nothing may reward remembering a layout), 7 (a room is
bought on two axes), 8 (a generator promise is a rule). Identity: "a top-down, one-life, procedurally
generated escape. You do not fight. You run." Not built yet at 1.0: mirrors, pixel art proper (incl.
enemy sprites), gamepad, a Priest boss, the later acts, the wife.

Window: the pillars last changed in 8ec9056 (13 Sep, 0.7/0.8), the same day as 1.0, so the window is
1.0 to now, split at the freeze. The concept is a living document ("The design as it actually stands")
that has been rewritten to describe what shipped, so "a system the concept does not have" was judged
against the concept **as of the window start**, not today's.

## 3-4. Accumulated features, classified

Fixes and feel tweaks to shipped things are left out. Grouped by feature, not by paragraph.

### Before the plan (1.0-1.55, 13-23 Sep)

| # | feature | class | pillar | evidence | recommend |
|---|---|---|---|---|---|
| 1 | THE OSSUARY and the wraith | core | 2 ("a body cannot form inside stone") | CHANGELOG 1.1 | keep |
| 2 | the brute | core | 3 | 1.2 | keep |
| 3 | the killbox | core | 2, 3 | 1.2 | keep |
| 4 | menu, NEW GAME / CONTINUE, run survives the tab | support | | 1.2 | keep |
| 5 | the gong does something | core | 5 | 1.3 | keep |
| 6 | THE RAFTERS: holes, windows, the drop | core | 2 | 1.4, 1.9 | keep |
| 7 | spike floors, the teeth | core | 2 | 1.4, 1.8 | keep |
| 8 | score per level, BEST | support | | 1.4 | keep |
| 9 | coals, lamp posts, the room answers | core | 2 | 1.5 | keep |
| 10 | the goat's voice | core | 5 | 1.7, 1.16 | keep |
| 11 | crates for throwing | core | 2 | 1.7, 1.8 | keep |
| 12 | iron doors, soul door, the vault | addition | | 1.8, 1.9 | keep (shipped, played) |
| 13 | tomes to souls, the roll as a find, buttons start half-shut | core | 6 | 1.9, 1.11 | keep |
| 14 | a canon per level, RULES, promises as rules | core | rule 8 | 1.10 | keep |
| 15 | room fog, corners you cannot see round | support | | 1.11, 1.12 | keep |
| 16 | LEVELS on the title | support | | 1.12 | keep |
| 17 | EASY MODE | support | | 1.14 | keep |
| 18 | sealed arenas (1 in the game, THE YARD) | core | | 1.15; `arenas-probe.js` | keep |
| 19 | a wall that gives (secret niches) | addition | | 1.15 | keep |
| 20 | the hen | addition | | 1.16 | keep |
| 21 | opening scene: meadow, road, dark, an arc | support | | 1.17, 1.36 | keep |
| 22 | teaching floor, ambush, lesson rules | core | first 30 min | 1.19-1.21, 1.27 | keep |
| 23 | threat on two axes, one seed a run | support | rule 7 | 1.23 | keep |
| 24 | the clock door | core | 1 (pace) | 1.23 | keep |
| 25 | dev tabs: ENEMIES, BOONS, STATUS, JUICE, MUSIC | support (tool) | | 1.24-1.37 | keep |
| 26 | death screen shows the level and the killer | support | | 1.28, 1.29, 1.38 | keep |
| 27 | the bomb pickup | addition | | 1.30 | keep |
| 28 | procedural room music, detect/chase/combat, FL Studio export | support | | 1.31-1.33 | keep |
| 29 | pause, volume sliders | support | | 1.32 | keep |
| 30 | poison and status reactions | addition | | 1.35 | keep |
| 31 | build slots, active / passive | addition | | 1.35 | keep |
| 32 | the roast, the crocodile | addition | | 1.37, 1.38 | keep |
| 33 | the shop: mouse, talismans, rat ogre | addition | | 1.40; parked 16 Sep (BACKLOG.md:506), shipped 18 Sep | keep |
| 34 | soul gates, two a level | addition | | 1.41 | keep |
| 35 | **a fight room that pays a soul when its last man dies**; a boss carrying one | **argues** | **1**: "Kills are a side effect ... Skipping a room is valid and sometimes correct" (CONCEPT.md:25-26) against "nothing says which, it is found by winning" (tuning.js:1208-1212) | `TUNING.soul.roomChance` 0.35 (tuning.js:1212, live value read in node), game.js:1262, 2867 | **cut for the playtest: roomChance 0** (verified) |
| 36 | rooms behind you are clamped | core | 1 | 1.41 | keep |
| 37 | a pattern per kind, soul-carrier mini-boss, the wraith hides | core | 3 | 1.42 | keep |
| 38 | rooms above and below | core | 4 | 1.39 | keep |
| 39 | THE CAVE: round rock, tall grass that hides, boulders; floor 3 since 1.50 | addition | serves 2 | 1.43-1.45, 1.48, 1.50 | keep |
| 40 | trap rooms for THE THRESHING FLOOR and THE RAFTERS | core | 2 | 1.44 | keep |
| 41 | THE TRIP: a tuft of mushrooms, every key reversed | addition | 6 holds (keys swapped, none added) | 1.46, 1.48, 1.52, 1.54 | keep, **out of the first 30 min for the playtest** |
| 42 | **THE TRIP's phase: half the blows that land never did** | **argues** | **3** and ground rule 4 "no i-frames beyond the roll's" (CLAUDE.md:44); 1.61 refused a 3 s invulnerability card on exactly this rule (CHANGELOG.md:375-376 today) | `shroom.phase.chance` 0.5 (tuning.js:1095; HEAD:1070) | ask |
| 43 | talismans 4 to 21 | addition | | 1.47; the user picked 17 of 25 (ARTIFACTS_TZ.md:3-5) | keep |
| 44 | 32 room templates | core | canons | 1.48 | keep |
| 45 | the far door | core | 1 | 1.49 | keep |
| 46 | stone teeth (spires) | core | 2 | 1.49 | keep |
| 47 | escorts: tortoise, goose, crow; coops; animals die | addition | | 1.50, 1.53, 1.59 | keep |
| 48 | all pixel art | support | concept "Not built yet: pixel art proper" | 1.49-1.55 | keep |

### After the plan (23 Sep ~15:00 UTC onward)

| # | feature | class | pillar | evidence | recommend |
|---|---|---|---|---|---|
| 49 | run code on every card | support | plan item (plan-runcode) | 1.56 cloud | keep |
| 50 | burst/bleed counter, synergy marks | support (tool) | | 1.56 cloud | keep |
| 51 | barrels, then rolling barrels (built twice, once per session) | addition | serves 2 | 1.56 cloud, 1.61; marked "do" on the same page as the freeze | keep, **watch on floor 2** (3.28 a level on THE YARD, probe) |
| 52 | LONG HORNS as an active, souls on his face, he breathes | support | | 1.56 | keep |
| 53 | routes for the Butcher and the hound, escorts' routes | support | | 1.57, 1.59 | keep |
| 54 | fire and blasts in pixels, weight in the stride, bodies lie down | support | | 1.58, 1.60 | keep |
| 55 | THE DARK (any floor with the lamps out) | addition | designed not to argue: "the dark hides the men, not the room" | 1.61 | park further work |
| 56 | the picture of the floor, SAVE THE PICTURE | addition | | 1.61; the plan put photo mode / GIF *after* the Steam page (backlog-questions.html:165) | keep as is, no GIF work until triage |
| 57 | GOAT GRID dev tab | support (tool) | | 1.61 | freeze (no playtest use) |
| 58 | LEAPFROG, COLD EYE, FOUR STOMACHS | addition | 6 holds | 1.61; LEAPFROG `active: true` (tuning.js:1545) against the 23 Sep answer "as upgrades to passives, not as actives of their own" (BACKLOG.md:33-34) | ask (a decision, not a pillar) |
| 59 | THE FORK: two flights at the end of THE ROAD | addition | | 1.62, `TUNING.dark.fork.at` 3 | keep, park follow-ups |
| 60 | every prop, the cave's teeth, the stairs and the signs in pixels; what he carries sits in his teeth | support | plan-first30 names "doors, weapons, soul, altar" | 1.63, 1.64; user quotes in CHANGELOG | keep (this is the plan) |
| 61 | hounds with legs: heading, circling, a lunge through you | support | 3 (a readable tell) | 1.65 WT (CHANGELOG.md:10-37): reversals 3-10/s to 0, measured with `tools/hounds.js`; user quote "как собака так планирует движение" | **keep, land first** (floor 2 enemy) |
| 62 | THE DARK as a floor of its own: canon THE LAMP, 5 templates, lamps, sconces, the wall rim | addition | | 1.65 WT; `DARK_LEVEL` (tuning.js:2284), 5 `canon: 'lamp'` templates (rooms.js, 0 in HEAD); user quotes "1-2 торшера в комнате", "подсветить глаза" | land with 1.65, then park |
| 63 | foley: every effect as a physical model, one stone room, positional barks | support | | WT: `js/foley.js` (658 lines, new), audio.js -434 lines rewritten; no changelog line yet, no user quote found | ask: ship only after a weak-laptop check |
| 64 | hooks: `guard.js`, `compact.js`, `script-lists.js` | support (tool) | serves plan-stable | WT, CLAUDE.md diff (Publishing) | keep |
| 65 | `sfx-board.html`, `tools/hounds.js` | support (tool) | | WT | keep |

Not counted as `argues`, but tested:
- **The hound's bark (1.65 WT) and pillar 5.** "Every loud thing has a radius and pulls men toward it ...
  The scream is ... the one loud thing that makes no noise" (CONCEPT.md:32-34) against "Sound only: the men
  answer the goat's noise, not their own dogs'" (tuning.js:340). Read literally it is a second exception;
  read as the pillar means (the goat's and the world's noise) it is fine. One sentence in the concept
  would settle it.
- **The seed on the saved picture and ground rule 6.** A seed that deals the same floors does not
  *reward* memory; deaths are in the derivation (1.23). Fine.

## 5. Quantify

**Net change.** (19 additions - 9 parked or removed) / 16 = **+62%**. Parked or removed in the window:
hearts that grow, one life per run, the hunt, act two, heaven, the deck at 36 (all 16 Sep, BACKLOG.md:360-463),
the soul barrier (14 Sep), a souls resource (23 Sep), prices in the dead at the shop (1.41). The shop was
itself parked on 16 Sep and shipped two days later (1.40), so it is not counted as parked.

The denominator is principles, the numerator features, so the percentage is a rough gauge. The registry
growth, measured by loading `tuning.js` / `rooms.js` / `gen.js` from each commit into node (`scope-probe.js`):

| | 1.0 (13 Sep) | 1.38 (18 Sep) | 1.55 (23 Sep, before the plan) | 1.64 HEAD | working tree |
|---|---|---|---|---|---|
| floors | 4 | 7 | 8 + THE TRIP | 8 + THE TRIP + dark variants | 8 + THE TRIP + THE DARK as its own floor |
| room templates | 9 | 43 | 82 | 82 | 87 |
| canons | 0 | 7 | 8 | 8 | 9 |
| boons (actives) | 12 (3) | 22 (11) | 22 (11) | 25 (13) | 25 (13) |
| talismans | 0 | 0 | 21 | 21 | 21 |
| escorts | 0 | hen | 4 | 4 | 4 |
| `TUNING` top-level keys | 20 | 34 | 42 | 45 | 45 |
| code lines, `js/` without `*-assets.js` | 4,836 | 16,422 | 23,396 | 27,545 | 28,497 |

**Backlog inflow / outflow**, from batch headings and strike marks (W1 counts include some sub-bullets, so
+-15%): W1 (13-19 Sep) ~205 in, ~180 closed; W2 (20-24 Sep) 13 in, ~30 closed (9 shipped in 1.49, 8 "do"
in 1.56 cloud, 9 closed "already fine", 1 decided against, 3 deck cards in 1.61). Outflow beats inflow.
The "three weeks running" test is **NOT ASSESSED**: the window is one week and five days.

**Unlogged inflow.** The backlog is healthy because the growth went round it. In W2, 9 additions shipped
or are in flight with no earlier `BACKLOG.md` line: THE CAVE (1.43), THE TRIP (1.46), the escorts (1.50),
THE DARK (1.61), the picture (1.61; it was a market decision on the questionnaire, "Решать тебе, не
сессии"), GOAT GRID (1.61), THE FORK (1.62), THE DARK as a floor (1.65 WT), foley (WT). Where the source
is visible it is the user in-session (1.62-1.65 quote him in Russian); for THE DARK in 1.61, THE FORK
and foley no ask is recorded anywhere in the repo.

**Share of core or support.** 44 of 65 (68%) over the window. Since the freeze: 11 of 17 (65%), and 6 of
17 are additions, where the agreed rule was "никаких новых систем, врагов и артефактов" (no new systems,
enemies or artifacts; backlog-questions.html:142-143).

**Open items that touch the first thirty minutes** (THE ALTAR, THE YARD, THE CAVE; a run is about 1.5 h
over 8 floors, so floors 1-3 are the tester's evening): 6 of the 6 open backlog lines (BACKLOG.md:22-37):
the Mill bearer (repro), a kill counted in the first room (repro), phone controls vanishing, THE TRIP's
carry-over, the second talisman slot, the soul count. Plus what the build now deals there, verified over 25
seeds per floor (`scope-probe.js`, working tree and HEAD agree):

| floor | what a new tester meets that is new since the plan or unplaytested |
|---|---|
| THE ALTAR | nothing new (lamps 4.6, crates 10.3, the Mill) |
| THE YARD | barrels 3.28 a level; a coop every seed (hen 14/25, goose 11/25); the mouse every seed; a mushroom tuft on 13 of 25 seeds; hounds (introduced at 0.12 of the floor), now with 1.65's legs |
| THE CAVE | a tortoise coop every seed; stone teeth 2.0 a level; a tuft on 13 of 25 seeds; **or THE TRIP in its place** if the tuft on THE YARD was eaten (`shroom.from` 1, `eatTime` 1.6 s, grazed like milk since 1.53) |
| THE ROAD (just past 30 min) | THE FORK every seed, into THE DARK |

## 6. Verdict

**BLOATED**, on two counts: net change +62% (over 25%), and two `argues` open (#35 against pillar 1,
#42 against pillar 3 / rule 4). The inflow/outflow test would read ON TRACK, which is exactly the trap:
the backlog drains while the growth bypasses it.

**The freeze is not holding.** It was agreed on 23 Sep in the cloud line of work; the local line kept
building (1.56-1.61) and the two met in the merge at 01:41 on 24 Sep, where the plan entered
`BACKLOG.md`. THE FORK (1.62) was built after that, and 1.65 is building a ninth authored floor now. Two
barrels were built for one ask because the two lines could not see each other. What it displaced: 1.5 of
the 7 days of week 1 (23-29 Sep), and every week-1 item except the run code and the early-props art is
still open: the clean-build pass since 1.62, the itch.io page, the form.

## 7. Recommendations, best cut ratio first

1. **Cut (number, freeze-allowed): `TUNING.soul.roomChance` 0.35 to 0.** One number, removes the only
   open pillar-1 argument, and the user already said "make them fewer or take them out". Nothing to build.
2. **Cut for the playtest (number): THE TRIP off floors 2-3** (`shroom.from` 1 to 3, or `chance` 0 in the
   playtest build). One number; THE TRIP stays reachable from LEVELS. Keeps a scrambled-controls floor out
   of the first thirty minutes the plan polishes and out of the "level reached" number.
3. **Park: THE DARK and THE FORK follow-ups.** Land 1.65 as it stands (its DARK floor generated clean on
   12 seeds with no per-seed rule failure, `dark-probe.js`, 14:50 snapshot of a file mid-edit), then
   nothing more on them until triage; both sit at floor 4-5, past most testers' evening. Unpicking 1.65's
   DARK out of `tuning.js` / `gen.js` / `rooms.js` / `rules.js`, which it shares with the hound fix, would
   cost more than landing it.
4. **Keep and land first: the hounds (1.65).** A readability fix of the one new enemy on floor 2, measured.
5. **Ask: foley.** A rewrite of every effect the tester hears, days before the build. Ship only if the
   sfx-board pass and a weak-laptop check (buffers rendered in idle callbacks) pass this week; otherwise
   stash it on a branch.
6. **Keep as is, do not extend: the picture of the floor, GOAT GRID, the three cards, barrels.**
7. **Keep parked: act two, heaven, the hunt, the deck at 36, one life per run, hearts that grow, the souls
   resource, the second talisman slot.** Correctly parked; the second slot and "passives as upgrades"
   join them.

**Smallest set that makes the playtest build** (the plan's week 1, what is left of it):
1. Land 1.65 (hounds + THE DARK floor + foley if item 5 says so), then write the freeze into `CLAUDE.md`.
2. The two numbers above (soul room, THE TRIP's floors).
3. The plan's clean-build pass on the landed tree: `node tools/balance.js` (the saved 24 Sep output is of
   HEAD's `balance.js`: it prints the "the dark, of" block the working tree removed), the generator sweep,
   `node tools/check-sync.js`, every floor through LEVELS, one phone, one weak laptop.
4. The kit: a closed itch.io page, the six-question form plus "what games do you love", one screenshot or
   10 s clip with the goat in front, a sheet for the three numbers.
Nothing else is needed for the build. The doc fixes (BACKLOG.md:30-34, CONCEPT.md:412 and the levels
table) are ten minutes and optional.

## Questions for the user

1. The freeze broke on your own asks (1.62-1.65 quote you in-session). Is 1.65 the last feature build
   before the playtest? Recommend: yes, land it, freeze through triage (13 Oct).
2. THE TRIP in a first-time tester's run? Recommend: off floors 2-3 for the playtest, on in LEVELS.
3. The soul a cleared room pays: remove it? Recommend: yes (`roomChance` 0), it pays for fighting.
4. THE TRIP's 50% "I was actually over here" against ground rule 4, which 1.61 used to refuse a 3 s
   invulnerability card. Recommend: keep it as the trip's written exception to rule 4.
5. LEAPFROG shipped as an active; your 23 Sep answer asked for upgrades to passives. Recommend: leave it
   for the playtest, decide at triage.
6. Foley in the playtest build? Recommend: only after a weak-laptop check this week, else stash.
7. The picture of the floor was scheduled for after the Steam page. Recommend: keep it (testers can send
   it with the run code), no GIF export until triage.

## Proposed backlog lines (not written to BACKLOG.md)

- **tool — land 1.65, then run the clean-build pass on what testers will get.** The working tree holds 22 modified and 7 new files from another session (THE DARK as a floor, hounds with legs, foley), and the saved 24 Sep `balance.js` output is from HEAD's script (it prints the "the dark, of" block the working tree removed), so nothing has checked the build testers would get. THE DARK floor generates clean on 12 seeds with no per-seed rule failure (`dark-probe.js`, 14:50 snapshot, file mid-edit): verified at data level, full balance not run. Then the plan's plan-stable pass: `balance.js`, the generator sweep, `check-sync.js`, every floor through LEVELS, one phone, one weak laptop.
- **tool — write the freeze where every session reads it.** The 23 Sep freeze is only in BACKLOG.md:38-40 and the questionnaire artifact; CLAUDE.md never states it, and since then 6 additions shipped or are in flight (THE DARK, the picture, three cards, THE FORK, THE DARK as a floor, barrels), code went 23,396 to 28,497 lines (+22%, 1.55 to the working tree), and two sessions built two barrels for one ask (1.56 cloud, 1.61). Verified (git, line counts). One line at the top of CLAUDE.md: feature freeze until the triage (7-13 Oct); only bug / feel / number on floors 1-3; anything else goes here, parked.
- **number — THE TRIP can take a first-time tester's third floor.** A mushroom tuft lies on THE YARD in 13 of 25 seeds (`generateLevel` probe) and `TUNING.shroom.from` is 1 (tuning.js:1084), so a player who stands on it 1.6 s plays THE CAVE's place with every key reversed, inside the thirty minutes the plan polishes, and the "level reached" number and form question 2 inherit it. Presence verified; whether new players eat it is a lead (grass is grazed the same way). Suggest `from` 3 or `chance` 0 for the playtest build; THE TRIP stays on LEVELS.
- **number — a room that pays a soul for clearing it argues with pillar 1.** `TUNING.soul.roomChance` 0.35 (tuning.js:1212) picks one ordinary fight room a level that drops a soul when its last man dies, "found by winning" (game.js:1262, 2867): a hidden reward for killing the room, against "Kills are a side effect ... Skipping a room is valid" (CONCEPT.md:25-26). Verified (live value, code path). The 23 Sep answer was "make them fewer or take them out": set it to 0 for the playtest, keep `bossChance`.
- **tool — the playtest kit: itch.io page, the form, the hook shot.** Nothing for plan-host, plan-form, plan-hook or plan-metrics exists in the repo (the only "itch" is the CLAUDE.md skills table), and week 2 starts 30 Sep. A closed itch.io page with a password, the six questions plus "what games do you love", one screenshot or 10 s clip with the goat in front (MARKET.md), and a sheet for the three numbers. The run code already carries the level's death count, which stands in for "started a second run".
- **feel — barrels and the new hounds are on every tester's second floor: put them on the watch list.** THE YARD deals 3.28 barrels a level (25-seed probe) and introduces the hound at 0.12 of the floor; the rolling barrel (1.61) and the hound's legs (1.65, uncommitted) have never been played by anyone new. Verified presence; how they read is the playtest's question. In the 3-5 watched sessions, note the first barrel and the first hound: did the tester use or read them.
- **system — park THE DARK and THE FORK after 1.65.** THE FORK is the last room of THE ROAD (25 of 25 seeds), floor 4, past most testers' evening, and 1.65 turns THE DARK into its own floor (`DARK_LEVEL`, canon THE LAMP, 5 templates, 0 in HEAD). Anything further on them (more lamp rooms, dark-only kinds, the fork elsewhere) waits for the triage, and the form asks nothing about the dark.
- **bug — the backlog and the concept say the opposite of the build.** BACKLOG.md:31-34 says the grass passive and the pounce are "Not built": both shipped in 1.61, and LEAPFROG is `active: true` (tuning.js:1545) where the answer asked for "upgrades to passives, not actives of their own". CONCEPT.md:412 still lists "pixel art proper" as not built, and its levels table says "Seven levels" with THE CAVE last. Verified by grep. Question: keep LEAPFROG as an active or move it?

## Notes on the skill (scope-check, project mode)

1. **The backlog inflow/outflow test misses the creep that matters here.** The backlog drained (W2: 13 in,
   ~30 out) while 9 additions shipped with no backlog line. Add a measure: "unlogged additions: changelog
   features with no earlier backlog line", counted per week.
2. **No freeze split.** Project mode has no step for "a freeze or release plan exists: split the window at
   its date and report what came after on its own". The caller's main question ("is the freeze holding")
   had to be improvised. Suggest: any `addition` after a freeze date makes the verdict at least CREEPING,
   whatever the percentage.
3. **Net change divides features by principles.** (additions - parked) / (pillars + scope lines) mixes
   units; +62% here says "a lot" but not how much. Suggest a second, registry denominator (floors, kinds,
   cards, templates, code lines at the window start), which is also countable and less arguable.
4. **A living concept makes "addition" circular.** CONCEPT.md is rewritten to describe what shipped ("The
   design as it actually stands"), so today's concept "has" nearly everything. The skill should say:
   judge additions against `git show <window start>:CONCEPT.md`.
5. **"Three weeks running" on a short window.** It cannot be evaluated on 12 days; the skill should say to
   mark that sub-test NOT ASSESSED rather than leave it silent.
6. **Where the ask came from.** `grown` versus `drift` exists only in session mode, but project mode needs
   it too: the freeze here broke mostly on the user's own in-session asks (Russian quotes in the
   changelog), which changes the tone of the finding ("data, not a fault"). Suggest a source column
   (user, quoted / backlog line / none found) and where to look (changelog quotes, questionnaire answers).
7. **Parallel lines of work.** Step 0 should look for merges and "(cloud)" entries: the freeze was agreed
   in one line and not seen by the other, and one ask was built twice.
8. **`argues` has no weight.** "Two or more argues" makes BLOATED whether it is a core-loop reward (#35)
   or a 50% hit-undo on one optional floor (#42). Suggest: count argues with a user decision (LEAPFROG)
   separately from argues with a pillar, and let a pillar argue on an opt-in mode count half.
9. **Rework or addition?** "Fixes and feel tweaks to shipped things are not additions" does not settle
   THE DARK going from "any floor, lamps out" to "a floor of its own". Suggest: a new registry entry
   (level, kind, card, canon) is an addition even when it replaces a variant.
10. **The changelog is not one format.** Grepping headings plus bold lead-ins misses 1.26-1.33, which are
    plain prose; the skill's "grep headings" works only for the heading, not the features.
11. **No "minimum ship set" in the template.** Before a playtest the useful output is the smallest set that
    makes the build, not only cuts; the report template has no slot for it.
12. **The skill points at "Goat out's itch.io freeze"** but not at where it lives; here it is only in
    BACKLOG.md's top block and a remote questionnaire artifact, not in CLAUDE.md.
