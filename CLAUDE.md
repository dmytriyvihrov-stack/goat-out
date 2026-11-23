# Goat Out: the archive beside the Godot game

**The JS build is gone** (23 Nov 2026, his word: "we have pumped out of it all we could"). The game is the Godot port,
`C:\Godot\projects\doomed-goat` (its own `CLAUDE.md`, `HANDOFF.md`, `PORT_STEPS.md`). This folder keeps what is still
useful to it and to the game: the design, the stats, the references and the promo work. Nothing here is a build.

## The JS code, when a Godot step needs it

The last commit with the whole JS game is the tag **`js-final`**. Read any file of it without checking anything out:

```
git -C "C:\Users\USER\Google Диск\Clod code\Goat out" show js-final:js/enemies.js
git -C "C:\Users\USER\Google Диск\Clod code\Goat out" ls-tree -r --name-only js-final js tools
```

`JS_SYSTEMS.md` is the old `CLAUDE.md` whole: a paragraph on every system of the JS game and the file it lived in.
Find the system there first, then `git show js-final:<that file>`. Its talk of running, testing and publishing the JS
build is history; the files it names are only in the tag.

## What is here

| Path | What it is |
|---|---|
| `tools/stats.html` | THE STATS page (the funnel, the surveys, the lives) for the Godot build's reports. Open it served or as a file, SERVER with the worker's address and READ_KEY. Names come from `tools/stats-names.js` (cut out of the JS tuning; add a new soul, talisman or cape by hand). |
| `tools/stats-worker/` | The Cloudflare Worker over D1 that the Godot build sends its reports and steps to, and that serves the page at `/dash`. `README.md` there is how to deploy it (wrangler, `wrangler.toml`). |
| `tools/hooks/compact.js` | Keeps his own words across a context compaction (`.claude/settings.json`). |
| `output/godot-export/` | The data and sprites the port was first built from; Godot's art files name it as their source. Read only. |
| `output/` | Everything else made along the way: art references and studies, audits of the port, promo, research. Godot docs link into it (`port-audit-2026-10-23`, `goat-horns-2026-10-26`, `rooms-2026-11-17`...). Never clean it without asking. |
| `CONCEPT.md` | What the game is trying to be. |
| `MARKET.md`, `PITCH_DEVOLVER.md` | The commercial picture and the pitch. |
| `ITCH_GUIDE.md`, `ITCH_PAGE.md` | How itch ranks a game and what to do at launch and at the Godot relaunch; the page text and tags. |
| `IDEAS.md` | References and brainstorms, never built without his pick. |
| `BACKLOG.md` | His asks from playing the JS game; most are built or carried into the Godot `BACKLOG.md`. |
| `ENGINE.md` | Why and how the port to Godot (the reasoning behind the move). |
| `ARTIFACTS_TZ.md` | The talismans' design spec. |
| `JUICE.md` | Every game-feel effect: trigger, look, size, and a Godot 4 recipe. |
| `MUSIC.md` | How the score is built and why. |
| `GENRE_RESEARCH.md`, `GENERATION_RESEARCH.md`, `VISUAL_REFERENCE.md`, `DESIGN_NOTES_COMBAT_RHYTHM.md` | Background reading. |
| `PLAYTEST.md`, `PLAYTEST_QUESTIONS.md` | The playtest kit and the questions for testers. |
| `devlog/` | The weekly posts. |

## Rules

- No game code goes here; a fix or a feature is for the Godot repo.
- No em dash, anywhere.
- The stats worker deploys with wrangler: it has its own config, `tools/stats-worker/wrangler.toml`.
