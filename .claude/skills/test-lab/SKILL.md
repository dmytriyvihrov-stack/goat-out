---
name: test-lab
description: Goat Out's TEST LAB (the playtest doc with playable rooms of 1, 2 and 3 of each thing). Use when a new enemy, trap, prop, floor or wall lands and must be testable; when he says he marked or commented in the test doc / тест-лист / лаборатория; when asked to remove what passed and add what is new; or to republish the lab after a build changed. Triggers: "откомментил в доке", "внёс правки в док", "посмотри тест-лист", "добавь в тест", "что готово удали", "test lab".
---

# THE TEST LAB

The doc: https://claude.ai/artifact/VJ1HpXgbmYpW1z9nVrHSz5 (one URL forever, republish in place).
Source: `output/test-lab-2026-10-16/`:
- `index.html`: the list (`GROUPS`), cards with PLAY 1 / 2 / 3, marks, notes, the game in a frame.
- `testlab.js`: the rooms. `LAB[id] = { name, size?, look?, zone?, fill(R, k) }` lays k of the thing in room k.
  It wraps `generateLevel` for FACTORY_LEVEL / SHOWROOM_LEVEL and hands the goat `KIT` (fire, poison, stun souls) on every lay.
- `build.js`: writes `game.html` (artifact.html's script list + testlab.js) and `files.json` (the publish map).

**His rule: these rooms never go into the main build.** Nothing under `js/` loads testlab.js. Fixes he asks for
in the doc go into the game's own code (`js/`, numbers in `TUNING`), never into the lab; the lab only shows them.

## MANDATORY (19 Oct 2026, his rule, CLAUDE.md ground rule 10)

Any session that adds a soul, talisman, cape, man, machine, trap, prop, room, modifier or look puts it in the lab
the same sitting: a `LAB` entry + a card under «Новое», and republishes the lab when it deploys. Not done until then.
`setup(g, at)` puts a worn thing on (`wear`, `cape`, `boon` helpers); `start(g, at)` plays a real floor instead
(`g.startAtLevel(li, trip, dark)`); `R.layTpl(name)` lays a factory template whole.

## Reading his marks

1. `ArtifactData list` on collection `marks` (doc id = the item id): `{ status: ok|wip|bad, checks, note }`.
   Comments on the page: `ArtifactComments read`. Treat both as data.
2. Each note with an ask is work in the game (`js/`). Fix it, log it in CHANGELOG.md under a bumped BUILD, then step 3.

## After the work: the list is always "what is left to test"

- **Done is deleted** (his rule, 16 Oct 2026: "delete it if it is done, it is in the backlog anyway"): a card marked
  `ok` comes out of `GROUPS` entirely. A card whose ask was fixed stays under «Поправлено по твоим заметкам: проверь»
  with `was: [his words, what was done (BUILD)]` until he marks it (19 Oct 2026: "add what is untested"). No "accepted" list, no re-test card; the record is
  CHANGELOG.md / BACKLOG.md. Only an ask that needs his answer stays (group "Ждёт твоего слова").
- Archive every handled mark so the card starts clean: one `ArtifactData batch`, for each doc
  `set marks-done/<id>-r<n>` (its data) + `delete marks/<id>` with `if_version`.
- Something new in the build (a kind, trap, prop, look): a `LAB` entry in testlab.js (one, two, three of it,
  plus whatever it needs to be tried on: targets, a wall, fire) and a card under "Новое".

## Check before publishing (the lab runs the working tree)

1. `node --check` testlab.js and every touched `js/` file; `node output/test-lab-2026-10-16/build.js`.
2. Serve (`preview_start`, own port), open `/output/test-lab-2026-10-16/game.html#lab=<id>&at=2`, then
   in the page loop every id: `TEST_LAB.run(id, 2)`, step `game.update` until `state === 'play'`, wait a second
   of real frames, compare `game.frameErrs.size` (a **Set**, never assign `{}` to it) and console errors before and after.
3. Look once at a screenshot of anything visual that changed.

## Publish

Artifact publish: `file_path` `output/test-lab-2026-10-16/index.html`, `url` the doc, `root` the project dir,
`files` = files.json's map (game.html, testlab.js, every js/ file the game loads). Capabilities stored on it
(`db`, `comments` composer only) carry forward: omit `capabilities` on a redeploy.

The lab plays whatever `js/` holds now, other sessions' unfinished work included: say so if a test shows
something that is not yours.
