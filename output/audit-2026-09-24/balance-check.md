## Balance check: Goat out, threat/power curve + boons + talismans + enemy kinds + easy mode + score. Build 1.65 working tree (HEAD 9afe0d3), 24 Sep 2026

Skill: `~/.claude/skills/balance-check/SKILL.md` + `heuristics.md`. Read-only on the project. Retry of a run cut off
by a rate limit: every saved pass was reused (`balance-base.txt`, `balance-wt.txt`, `balance-varA.txt`,
`balance-varB.txt`, `sim/deal-*.txt`, `sim/idle-*.txt`); nothing that takes 2.5 minutes was re-run.

**Sources:** CLAUDE.md (ground rules 1-8, *Souls, shop, talismans, escorts*, open questions), CONCEPT.md (pillars
23-38, *Corrupted souls*, *Score* 376-380), BACKLOG.md (23 Sep batch, 16 Sep power-column batch 330-385),
`js/tuning.js` (TUNING.score 1204, soul 1212, EASY 1290, THREAT 1326, ENCOUNTER 1328, BOON_BASE 1399, BOON_SLOTS 1457,
BOON_POWER 1464, BOONS, ARTIFACTS, LEVELS 1897+), `js/game.js` (scoreFor 1492, noteBest 1505, applyBoons 151),
`js/enemies.js` (enemySlow sites, wraith 1344-1385, butcher 771), `js/beasts.js` 477-486, `tools/balance.js` 140-162.
Sibling audits cited, not redone: `content-audit.md` (souls 13 authored, ~18.6 dealt, 14-card cap; vault and
boss souls never paid), `scope-check.md` (THE TRIP on floor 3 in 13/25 seeds; `soul.roomChance` 0.35 vs pillar 1).

**Ran** (all vm-loaded from the build, probes in `output/audit-2026-09-24/sim/`, outputs beside them):

| probe | what | n |
|---|---|---|
| `tools/balance.js` (saved) | HEAD copy `base/`, working-tree copy `wt/`, what-ifs `varA/`, `varB/` | 25 seeds a level |
| `sim/totals.js` | level threat totals, seeds 1-25 vs 26-50 (sample noise) | 50 seeds |
| `sim/curve.js` | per ordinary room: threat the curve asks vs threat bought, ceiling under caps | 25 seeds, wt/varA/varB |
| `sim/deal.js`, `deal2.js` | real `startLevel` + `openBoonChoice` + `takeBoon` over whole runs: power at each level's head | 40 runs x 2 pick seeds; what-ifs in memory |
| `sim/score.js`, `score-whatif.js` | the real `scoreFor`: when do bodies beat seconds | 25 seeds for men counts |
| `sim/idle.js` | real game headless, n men of one kind vs a still or circling goat that never fights back | 12 seeds x 2 goat seeds |
| `sim/howl.js`, `howl-floor.js` | FULL THROAT pressed when ready, with RAW THROAT and saved geese; what-if cooldown floor | 8 seeds, 30 s |
| `sim/timings.js`, `talis.js`, `talis-tiers.js`, `slots.js` | windup/recovery table, talisman params vs `say`/code, max build | registry reads |

**Baseline:** HEAD vs working tree: every level's threat identical (`diff balance-base.txt balance-wt.txt` changes
only THE DARK's block), so the other session's uncommitted edits do not move the curve. The live tree moved again
after the `wt/` snapshot (14:39): `tuning.js` only BUILD and `eyes.cell/glow`; `game.js` `scoreFor` gained a
`played` def for THE DARK, formula unchanged. For the curve, the baseline is level N-1 against level N.

**Self-noise:** balance totals, seed set 1-25 vs 26-50: at most 0.8 (0.8%) a level. Deal power, pick seed 99 vs 7:
at most 0.07; a what-if that shifts the RNG stream moves early levels up to 0.15 (under 2%). Idle/circle damage
rates, goat seed A vs B: 15-35% a row. Howl: about 0.6 hearts a row at n=8.

**Verdict: CONCERNS.** Nothing broken in the generator (all GEN_RULES hold), but the tool's power column is not the
goat the game deals, the score contradicts its own pillar, and one boon stack is a lock.

### Findings, ranked by severity x how often a player meets it

| # | finding | evidence | baseline -> now | measured / inferred |
|---|---|---|---|---|
| 1 | **balance.js power column is not the deal.** It adds 2 souls a floor forever (`LEVELS[li].souls`, balance.js:156-160): no mouse (-1 on YARD, ROAD, BRIDGE), no `bossChance`/`roomChance` surprises (+0.6-0.8 a floor), no 14-card cap. The real deal: power at head 4.0 / 6.94 / 8.92 / 11.74 / 13.31 / 15.75 / 16.92 / 17.85; by RAFTERS 1.63 and OSSUARY 2.42 souls a run open no card | deal.js random, 40 runs, 2 pick seeds; content-audit rows 19, 25 | tool ratio flags THRESHING -6%, RAFTERS -6%, OSSUARY -5%; real ratio: YARD -0.2%, THRESHING -0.2%, RAFTERS +0.6%, OSSUARY +1.3% | measured |
| 2 | **THE THRESHING FLOOR is flat against THE ROAD in every power model** (tool -6%, real deal -0.2%, greedy-by-BOON_POWER -0.8%, seed set 26-50 -2%). This is BACKLOG.md:374-376's "overpowered by level five". Cause: 13 rooms, 4 of its 11 fight rooms fixed-price (3 ARENA + KILLBOX), and `cap.men 8` starves 43% of its rooms (10% of the budget lost) | balance-wt, curve.js, totals.js | ROAD 96.5 -> THRESHING 109.1 threat (+13%) against +13% power | measured |
| 3 | **Kills beat pace.** `killCap` 2.5 > `fastCap` 2 (tuning.js:1204). At par a run with 25+ kills scores 2500, the fastest possible zero-kill run (half par) 2000; a full clear ties that pacifist at 1.25x par and beats a zero-kill run at par up to 2.5x par (THE CAVE on). One kill is worth 5.4-8.1 s. Contradicts tuning.js:1198-1199, game.js:1489-1491, CONCEPT.md:377-379 ("the best run is a fast one with bodies in it rather than a slow one that cleared every room") and CLAUDE.md:962 | score.js on the real `scoreFor` | n/a (pillar) | measured |
| 4 | **FULL THROAT + RAW THROAT + geese is a total lock.** Geese multiply the scream cooldown by 0.8 each with no floor (beasts.js:484, `saveScreamCd` tuning.js:791): howl+throat = 2.0 s; +2 geese 1.28 s / 18.7 tiles; +4 geese 0.82 s, shorter than the 0.99 s daze, radius 27 tiles | howl.js: goat stands, screams when ready, 30 s, 3 men | vs 3 clubmen: no voice 4 hearts lost, 8/8 dead; +2 geese 0.38, 0/8, 63% of time all dazed; +4 geese 0, 0/8, 98% | measured |
| 5 | **Hounds are locked by two cards.** Daze 0.9 x 1.1 x `dazeMul` 2.6 = 2.57 s > RAW THROAT's 2.0 s cooldown | howl.js, 3 hounds | FULL THROAT alone 48% dazed, 5/8 dead -> + RAW THROAT 94% dazed, 0.25 hearts, 0/8 | measured; the dazeMul comment (tuning.js:342) says the scream should be "the answer to a pack", so a question, not a bug |
| 6 | **The late curves ask for threat their caps cannot buy.** OSSUARY asks 34.4 a room and buys 18.8 (45% lost, 83% of rooms starved); RAFTERS 25% lost, 57% of rooms at the 17.9 ceiling; THE DARK 29%. The ramp reaches the cap by room 3-5 of 15, so each late floor's back half is flat (RAFTERS rooms 5, 8, 9, 11 all exactly 17.9) | curve.js, balance-wt | `to` 34 / 52 / 22 vs ceilings 17.9 / 22.9 / 11.4 | measured |
| 7 | **The room soul's cut re-opens the late dip.** With `roomChance` 0 (scope-check's proposal) the cap stops absorbing the surplus: power keeps rising into the last floor | deal2.js RC=0 | OSSUARY ratio 9.89 -> 9.44 (-4.6%), RAFTERS -0.4% | measured (what-if in memory) |
| 8 | **THREAT prices durability, not what a kind takes off a runner.** Lone man vs a circling goat, hearts a minute (mean of 2 goat seeds): clubman 16.1 (THREAT 1), hound 18.4 (1.7), rifle 14.9 (2.4), butcher 15.5 (5), champion 12.9 (3.2), wraith 8.6 (2.6), seer 5.2 (2.8). Per unit of THREAT the clubman costs 5x a butcher and 9x a seer. The cheap cap swaps clubmen for dearer kinds as rooms get richer, so late threat likely overstates a late room's cost to a goat who runs | idle.js circle, 12 seeds x 2 | n/a | measured one side (their TTK on him); his TTK on them NOT MEASURED; crowd effects (3 clubmen 24.6/min, not 48) and seer runes herding not captured |
| 9 | **EASY MODE is mostly two hearts.** EASY.enemySlow 1.4 against a normal 1.1 (BOON_BASE, tuning.js:1403) is 1.27x, not the 1.4x the comment implies ("a normal run is untouched (enemySlow: 1)", tuning.js:1289, wrong). Still goat: damage rates fall 6-23% (clubman 30.7 -> 28.9 a minute); circling goat, same goat seed: -6% to -24% for clubman, hound, rifle, and within noise (+8% to +14%) for butcher, wraith, seer; a lone clubman's median kill 8.9 s -> 17.5 s, mostly the two hearts. Not scaled: the wraith's punish window `solidAfter` (enemies.js:1378) and the butcher's wall stun (enemies.js:883). EASY scores share the BEST board (`noteBest` keys on the level only, game.js:1505) | idle-normal/-easy; code read | normal -> easy, still goat: hearts 4 -> 6, clubman death 5.1 s -> 9.7 s | measured + static (the scaling sites) |
| 10 | **A literal in enemies.js.** The butcher's retaliation swing: windup `x 0.55` inside `reach x 1.6` (enemies.js:771, HEAD:745): a 0.53 s tell against his normal 0.97 s. Ground rule 2 | code read | n/a | static (a code fact) |
| 11 | **BOON_POWER cannot price a synergy.** FULL THROAT is 1.5 and RAW THROAT 0.8 (the pair "2.3"), but FULL THROAT alone does nothing for a still goat against 3 clubmen (4 hearts lost, same as no voice) and with RAW THROAT it holds 3 hounds 94% of the time. 11 of 25 boons carry the default 1, including 7 of 13 actives | howl.js; BOON_POWER tuning.js:1464 | n/a | measured (one pair) |

### Curve

Threat from balance.js (wt, 25 seeds). Power two ways: the tool's, and the real deal (deal.js, random picks, 40 runs,
mean of pick seeds 99 and 7). Per-room = threat bought per ordinary room (curve.js).

| level | threat | tool power | tool ratio | real power | real ratio | change vs previous (real) | per ordinary room |
|---|---|---|---|---|---|---|---|
| THE ALTAR | 24.7 | 4.0 | 6.2 | 4.00 | 6.18 | | 2.38 |
| THE YARD | 42.8 | 6.0 | 7.1 | 6.94 | 6.17 | -0.2% (flat) | 4.31 |
| THE CAVE | 65.7 | 8.1 | 8.1 | 8.92 | 7.37 | +19% | 6.16 |
| THE ROAD | 96.5 | 10.1 | 9.5 | 11.74 | 8.22 | +12% | 8.55 |
| THE THRESHING FLOOR | 109.1 | 12.2 | 8.9 ▼ | 13.31 | 8.20 | **-0.2% (flat)** | 13.68 |
| THE BRIDGE | 141.9 | 14.2 | 10.0 | 15.75 | 9.01 | +10% | 12.43 (`from: 4`, opening valley) |
| THE RAFTERS | 153.3 | 16.3 | 9.4 ▼ | 16.92 | 9.06 | +0.6% | 15.62 |
| THE OSSUARY | 163.8 | 18.3 | 8.9 ▼ | 17.85 | 9.18 | +1.3% | 18.76 |

Reading: the tool's two late ▼ are artefacts of a power column that keeps adding boons past the 14-card cap. The
real shape is a sawtooth driven by the mouse floors (YARD, ROAD, BRIDGE deal one soul less), two flat steps (YARD,
THRESHING) and a late plateau near 9.0-9.2 where both sides saturate: threat at the men caps, power at 14 cards.
THE RAFTERS is the dead-zone candidate: no new kind, rooms at the ceiling from room 5, and its souls turn into heals.

What-ifs (power in memory via deal2.js; threat from the saved varB pass; levels generate independently, so one
floor's cap change leaves the others' totals as they are):

| scenario | YARD | CAVE | ROAD | THRESH | BRIDGE | RAFTERS | OSSUARY | souls a run that open no card |
|---|---|---|---|---|---|---|---|---|
| now (real deal) | 6.17 | 7.37 | 8.22 | 8.20 | 9.01 | 9.06 | 9.18 | 4.4 |
| THRESH `cap {men 9, dog 3}` | same | same | 8.22 | **8.49 (+3.3%)** | 9.01 | 9.06 | 9.18 | 4.4 |
| `roomChance` 0 | 6.43 | 8.13 | 9.24 | 9.20 (-0.5%) | 9.93 | 9.89 (-0.4%) | **9.44 (-4.6%)** | 1.9 |
| `roomChance` 0 + RAFTERS/OSSUARY souls 1 | 6.57 | 8.25 | 9.27 | 9.25 (-0.2%) | 10.09 | 10.05 (-0.4%) | 10.01 (-0.4%) | 0.5 |
| the last + THRESH cap | 6.57 | 8.25 | 9.27 | **9.58 (+3.4%)** | 10.09 | 10.05 | 10.01 | 0.5 |
| varB caps on RAFTERS/OSSUARY (men 11, hunter 3), now's souls | | | | | 9.01 | 9.63 (+7%) | 10.40 (+8%) | 4.4 |
| varA honest `to` (THRESH 16, BRIDGE 18, RAFTERS 18, OSSUARY 23, DARK 11.5) | **2 GEN_RULES fail**: RAFTERS 130.9 not above BRIDGE 132.1, its top 18 not above BRIDGE's 18 | | | | | | | |

### Dominant, dead and degenerate

- **Degenerate, tested:** the voice lock (finding 4). Strategy run against its baseline on the same seeds: no voice,
  FULL THROAT, + RAW THROAT, + 2 and + 4 geese, against 3 clubmen and 3 hounds. How often a run can build it: RAW
  THROAT is the only scream passive and ends in 100% of runs (deal.js takenPerRun 1.0); FULL THROAT in about 35%
  (random picks); geese sit in the coop list on YARD, ROAD, THRESHING and RAFTERS, one kind drawn a floor.
- **Unbounded formula:** `m.screamCooldown *= Math.pow(saveScreamCd, geese)` and `m.screamRadius *= Math.pow(1.2, geese)`
  (beasts.js:482-484), no clamp. Nothing else multiplies past a sane range: talisman tiers all move one way
  (`talis-tiers.txt`), `grassGain` and `maxHp` are additive.
- **Dead slots:** `BOON_SLOTS` passive 2 per verb, but the butt, scream and roll verbs have one passive each (skull,
  throat, joints), so three slots can never fill and the build tops at 14 (`slots.js`). The lone passives and BY THE
  COLLAR are picked in 100% of runs: the choice there is fake by structure, not by strength.
- **Dead souls:** 4.4 souls a run open no card (RAFTERS 1.63, OSSUARY 2.42, BRIDGE 0.3, THRESH 0.05) and pay a
  silent heal. See content-audit row 19 for the count; the power consequence is findings 1 and 7.
- **Dominant / never picked boons:** NOT MEASURED. No bot picks by outcome; the "power" strategy in deal.js only
  replays BOON_POWER (circular). Every boon is offered (content-audit row 37); DEVOUR least (0.57 offers a run).
- **Talismans:** 21, three tiers, every param monotonic in the goat's favour and read by code; two constant params
  unsaid (`spade.r` 12, `mirror.throw` 0.8, harmless). No power scale exists for them (BOON_POWER has none), so the
  talisman held from THE YARD on, the tortoise's shield, the hen's hearts and the crow's gift are all outside every
  power number above. SCAPEGOAT's "1.5s UNTOUCHABLE" and BLOOD CUP's "every 12 men killed by the room give 1 heart"
  are the two talismans that lean on pillars 3 and 1; noted, not measured.
- **Feedback loops:** positive: kills -> score (finding 3), kills -> BLOOD CUP hearts, cleared room -> soul
  (`roomChance`, scope-check). Negative/rubber band: none (hearts refill every level, which the design intends).

### Enemy kinds: tell and recovery (normal run, x1.1 enemySlow)

| kind | hp | tell (s) | recovery (s) | note |
|---|---|---|---|---|
| clubman | 1 | windup 0.51 | 0.61 | |
| champion | 3 (boss 4) | 0.68; slam 0.88 | 0.66; slam 0.88 | |
| hound | | 1.10 | **0.44** | shortest recovery; daze x2.6 |
| rifle | | aim 0.97 | reload 1.49 | |
| seer | 2 | cast 0.88 | cooldown 2.75 | blinks away when closed on |
| wraith | 1 | manifest 0.26 + windup 0.57 | solidAfter 0.8 (unscaled) | |
| butcher | 4 | 0.97 (retaliation **0.53**, literal) | 0.68; wall stun 1.5 (unscaled) | |
| goat headbutt | | 0.12 | 0.38 | roll: 0.24 invuln, 0.26 recover, 1.35 cd |

Every enemy attack has a tell and a recovery (pillar 3 holds). Time to kill both ways: theirs on a still goat is 4-12 s
for one man (idle-normal.txt), on a circling goat 8-19 s; his on them comes from geometry and is NOT MEASURED here.

### Proposed numbers (NOT applied)

| where | now | proposed | predicted effect (sim, n) | verify by |
|---|---|---|---|---|
| tuning.js:2112 THRESHING `cap` | `{ men: 8 }` | `{ men: 9, dog: 3 }` | threat 109.1 -> 113.0, worst ordinary room 16.2 -> 17.9, starved rooms 43% -> 30%; real ratio 8.20 -> 8.49 (+3.3% over ROAD, above the 2% noise); all GEN_RULES hold (balance-varB.txt, 25 seeds) | `node tools/balance.js`, then play floor 5 |
| tuning.js:1204 `score` | `killMul 0.06, killCap 2.5` | `killMul 0.02, killCap 1.5` | 25 kills still reach the cap; a full clear at par 1500 < fastest pacifist 2000; clear beats a zero-kill run at par only up to 1.5x par (was 2.5x); a kill worth 1.8-2.7 s (was 5.4-8.1) (score-whatif, real scoreFor). Stricter: `0.01 / 1.25` | score.js; BEST board after one run |
| new `TUNING.goat.scream.minCooldown` (read after geese in `applyBoons`) | none | `2` | howl + throat + 2/4 geese vs 3 clubmen: all-dazed 63%/98% -> 31%/33%, hearts lost 0.38/0 -> 4/4 (howl-floor.js, 8 seeds); hounds unchanged (still 94%) | howl-floor.js with the real key |
| tuning.js RAFTERS / OSSUARY `souls` (only if `roomChance` goes to 0) | 2 / 2 | 1 / 1 | late ratio flat within noise (10.09 / 10.05 / 10.01) instead of OSSUARY -4.6%; souls that open no card 4.4 -> 0.5 a run (deal2.js, 40 runs) | deal.js; balance.js once finding 1's tool fix lands |
| tuning.js:1289 comment | "(enemySlow: 1)" | "(enemySlow: 1.1, BOON_BASE)" | none, text | read |
| enemies.js:771 literals | `0.55`, `1.6` | `TUNING.butcher.retaliate: { windupMul: 0.55, reachMul: 1.6 }` | none, same numbers | grep |

New formula (the scream floor):
1. `screamCooldown = max(scream.minCooldown, base x throat.cooldownMul^hasThroat x goose.saveScreamCd^geese)`
2. | symbol | range | meaning |
   |---|---|---|
   | base | 3 (BAAH) or 4 (FULL THROAT) s | the voice's own cooldown |
   | throat.cooldownMul | 0.5 | RAW THROAT |
   | saveScreamCd | 0.8, geese 0-4 | saved geese |
   | minCooldown | 2 s | proposed floor |
3. Output clamped to [2, 4]: never below RAW THROAT's own value, so geese still buy range and the plain voice's speed.
4. Worked example: howl + throat + 4 geese: 4 x 0.5 x 0.8^4 = 0.82 s -> 2.0 s.

### Not measured, and what would measure it

- His time to kill each kind, and whole rooms fought or run: needs the page (`tools/harness.js` `H`, `tools/playtest.js`
  `PT`), forbidden here. Until then the THREAT prices (finding 8) are measured on one side only.
- Pick rates by outcome (dominant/dead boons): needs a bot that plays rooms with each build; deal.js only deals.
- Talisman and escort power: no weight exists; a `BOON_POWER`-style entry per talisman tier would let the tool count them.
- Easy mode with a goat that plays (dodges, fights, uses geometry): only still and circling goats were run
  (`idle-easy.txt`, `idle-circle-easy-4242.txt`).
- THE DARK's own threat/power: it replaces THRESHING via THE FORK (75% of its threat, balance-wt); its power is
  THRESHING's, so its ratio is about 6.2, a valley. Designed (the lamp floor), not flagged.

### Notes on the skill (balance-check applied to a real project)

1. **The known-simulators table oversells `balance.js`'s power column.** It says "starting hearts plus souls dealt
   before each level", but the tool counts authored souls, not dealt ones. The skill should tell the reader to check
   the power column against the deal before trusting its ▼ flags; here two of three flags were artefacts.
2. **"Run the simulator twice on the same build" does not size noise for a seeded, deterministic tool.** balance.js
   gives byte-identical output twice; the useful noise was a disjoint seed set (1-25 vs 26-50) and a second pick seed.
   Say "run twice on different seeds" for deterministic sims.
3. **Missing: the ceiling check.** Nothing in Step 3 asks whether an authored curve can be paid under its caps
   (budget asked vs bought). It was the biggest structural finding here (45% of OSSUARY's curve is fiction).
4. **Missing: interaction between proposals from sibling audits.** `roomChance` 0 (scope-check) flips the late curve.
   The skill should say: re-run the curve with every pending number proposal applied, not only your own.
5. **"Test every degenerate strategy" worked well** (the voice lock would have stayed a lead), but the skill gives no
   pattern for a headless strategy test; the idle/circle/howl probes had to be invented. A pointer to "put the goat in
   a room, spawn n of one kind, drive `readMoveInput`" would save the next run 20 minutes.
6. **Heuristic "threat vs power should not fall" needs a tolerance.** With pick noise near 2%, -0.2% is flat, not a
   fall. The tool flags any drop; the skill should say "flat within noise" is its own class.
7. **The report template has no place for pillar contradictions that are not numbers** (the score's claim, the
   comment saying enemySlow is 1). They fit "label vs payment", which the template does not have a section for.
8. The em-dash rule is Grimtoll's; Goat out's BACKLOG format uses the em dash. The skill's punctuation line reads as
   universal and should say "the project's rule".
