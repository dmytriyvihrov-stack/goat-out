# The improvement loop, 2 Oct 2026

He said "run a continuous improvement loop, I'm leaving". One small, safe thing an iteration; Edit-only (other
sessions share the tree); no commit, push or publish. Dev server: `goat-out-loop`, port 8894.

## Iteration 1

- Baseline: `node --check` over js/ and tools/ clean; `doc-numbers.js` 56 of 56; `balance.js` every rule holds.
- BACKLOG: every dated item is shipped or waits on his word. The one loose end was "the shieldman review did not
  finish". Checked live on THE THRESHING FLOOR: the horns into his board cost a heart, the board is not worn
  (`spikes.wear` 0), he goes `braced`; from behind he is flung. No bug found.
- `Game.meleeHit` had four gameplay literals (knock × 4, 0.7 chance a neighbour is floored, 0.6 s, an ogre's arm
  at 14 tiles/s). Moved to `TUNING.club`, same values. Checked in the page: a clubman's blow still lands, no errors.

## Iteration 2

- Audits: generator 120 fresh seeds a floor, 0 failures; smoke bot over THE ALTAR, THE CAVE, THE THRESHING FLOOR,
  THE RAFTERS, THE DARK and a trip (seed 47): 6 of 6 OK, no throw, no NaN. Its draw spikes on THE THRESHING FLOOR
  (40-80 ms) were the hidden pane piling up GPU work: `PERF.frames('L4', 47, 200)` reads 2.48 ms avg, p95 4.5.
- No em dash in anything shipped (only two gitignored files in tools/shots). Every prop kind is in THE SHOWROOM and
  every man has a SPAWN row (rule 9).
- Fixed: a shieldman killed face first against stone dropped his board inside the wall (`dropShield` placed it
  `r` ahead of him). Now `game.freeSpot`. Checked in the page: died facing a west wall, the board lies on floor.

## Iteration 3

- No new backlog batch. Swept enemies/game/entities for gameplay literals (rule 2): the ogre's stagger after
  being rocked was six different numbers at six sites. Now `TUNING.butcher.rocked` { blast, door, crate, shield,
  table, body }, same values. Checked in the page: a body short of killing speed rocks him 0.3 s, a slow crate
  0.45 s; no errors. `balance.js`: every rule holds.
- Left for later (bigger, touch more call sites): a man dropped out of the goat's mouth is floored 0.5 or 0.6 s
  depending on the site (game.js and entities.js), and a man hit by a broken-off pillar is floored 0.75 s
  (enemies.js); worth one `TUNING` key each.

## Iteration 4

- The "left for later" from iteration 3: a man dropped out of the goat's mouth was floored by five literals (0.5 on
  a roll, a blink, the pen's stun; 0.6 working loose and at the stairs) in entities.js, game.js, shop.js. Now
  `TUNING.goat.grab.letGo` / `loose`, same values. Checked in the page: the stun drops him for 0.5 s; no errors.
  `balance.js`: every rule holds. Still literal: the 0.75 s a two-hit man lies after a blow he absorbed (enemies.js).

## Iteration 5

- The last literal noted in iteration 4: a man with a heart to spare lies 0.75 s after a killing blow he absorbed
  (`Enemy.die`). Now `TUNING.boss.downFor`. Checked in the page: a butcher at 3 hearts, one wall splat, floored
  0.75 s at 2 hearts; no errors. `balance.js`: every rule holds.
- The backlog has nothing open that is not his decision, and the rule-2 sweep has reached the small stuff. Next
  iterations look at the screens (the 12 px text rule) rather than more literals.

## Between iterations: his ask, the music

"Improve music: bigger difference between fight and peace, and a bit longer melody itself."
- Melody: `THEME_BED` phrases 4 → 8 bars (`bars: 8`, `pos = s % (bars * 16)`), each theme an answering second half
  over the same roots. Lead notes a phrase: early 23 → 51, late 24 → 52, first 18 → 36.
- Contrast: by count on the fight side (the 1 Oct rule: never slower, never merely quieter). `layers.fight`: kick on
  [4,6,12,14] over the bed's 0 and 8 (was [6,14]), a low tom on 10, rim 0.07 → 0.09, hat 0.07 → 0.09, chase gets a
  kick on [4,12] at 0.2. Counted over 8 bars with the audio-check recorder: idle = pad 8, bass 16, lead 51; chase
  adds kick 32, rim 32, hat 64, pluck 48; combat kick 48, tomHi 32, tomLo 8, hat 64, pluck 64.
- `tools/audio-check.js` passes all four sections. MUSIC.md updated. Nothing deployed.

## Iteration 6

- The 12 px text rule, measured: a `fillText` hook on the prototype (an own `font` property on the context is
  deleted every frame by `drawDev`'s floor, so the first try saw one frame of the title and nothing else) reading
  `ctx.font` / `renderer.s` on every draw of the title, play, pause, the book, settings and the death card.
  1280×800: 9086 draws, none under 12 CSS px. 960×600: 8583, none. 375×812 (touch): four spots, all sized off
  `ts` (the UI scale, under 1 on a phone) with no floor: the road's floor name on the death card (`Painting.drawRoute`,
  10.6), MOVE / ROLL / CALL on the touch controls (`drawTouchUI`, 10), the title rows' notes (`drawTitle`, 9.8),
  RUN STATS' question (`Stats.drawConsent`, 10.2). Floored at `TUNING.hud.minText` (12) × `renderer.s`.
  Rerun on the phone: 7653 draws, none under 12, no errors.

## Iteration 7

- A new backlog batch from another session (his late notes: the book, the souls, the first two floors), all shipped
  there; the one open line (NEW GAME wiping heaven or not) is his to decide. Its item 9 turned the off-eighth hats
  off (`layers.fight.hat` / `chaseHat` 0) over my music pass, which had nudged them up: the code is consistent (the
  other session kept the beat lists and guarded the hat calls); my changelog bullet, MUSIC.md and the counts above
  said "hats up / hats 64" and are corrected. The fight's contrast now rests on the kick, the toms, the rim and the riff.
- Script lists: index.html == artifact.html, every js/ file loaded, nothing loaded that is not on disk.

## Iteration 8 (3 Oct, after midnight)

- After the other session's floor-plan change (THE ALTAR ends on a soul clubman, the butcher's ring is THE YARD's
  room 4, keepers at three hearts): `doc-numbers.js` 56 of 56, `balance.js` every rule holds (the same two
  "easier than the last" power notes as before), generator 250 fresh seeds a floor 0 failures, smoke bot THE ALTAR
  and THE YARD on seeds 31 and 32: 4 of 4 OK, no throw, no NaN. CLAUDE.md's ramp paragraph was already updated there.
- The bot's `souls 0` on every line is the bot, not the game: checked by hand on THE ALTAR seed 31, the last boss
  (3 hearts, `soul`) dies on the wall, drops the exit gate's soul, and walking onto it opens two cards. The first
  gate's man is `blessing` (the mage makes him keeper). The bot teleports when stuck and a three-heart keeper no
  longer falls to its incidental kills, so it reaches the stairs with no card taken. Worth one look at smoke.js
  some day (count souls dropped, not cards taken).
- The bot's one 423 ms update stall (THE ALTAR seed 31, room 1 at 13 s) sent me to the profiler, and the profiler
  is not to be trusted tonight: `PERF.frames` on a warmed page read THE ALTAR 1.94 ms update / 11.7 draw and THE
  THRESHING FLOOR 3.48 / 10.5, against 0.95 / 2.48 on the same THRESHING FLOOR seed this morning. The machine is
  at 57% CPU with Boosteroid (a cloud-gaming client, 3085 CPU s) and four Claude sessions running, and the pane is
  hidden. Not called a regression. Tonight's render-side changes (white souls rising off every dead man, greyed
  corpses, the cave's fog) are the suspects if a quiet-machine re-measure still reads high: `PERF.top('L4', 47, 200)`
  would name the method.

## Iteration 9

- The tree: the other session committed everything in 1411e85 and 5ae6aca ("the loop's later iterations"), my
  edits included; only this log is uncommitted. Machine still at 77% with Boosteroid up: no profiling.
- `tools/smoke.js`: the report's `souls` was cards taken, which could not tell a bot that walked past a soul from a
  floor that dropped none. Now `souls taken/dropped` (every soul that ever lay in `game.souls`), and a soul lying
  within `opts.soulR` (8) tiles is walked onto, so a dropped soul's pickup and cards are exercised, and a gate's
  soul opens the gate instead of being teleported past. THE ALTAR seed 31: `souls 0/0`, honest: the bot's
  incidental butts never finish a three-heart keeper or boss, so nothing drops; the cards were proved by hand in
  iteration 8. Tool only; no game code touched.
