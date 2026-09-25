# Six audits, 24 September 2026

The full reports behind the `24 September 2026 — six audits` batch in `BACKLOG.md`, each written by one of
the personal skills in `~/.claude/skills` (see *Skills* in `CLAUDE.md`), run read-only over the working tree
while 1.65 was still uncommitted in another session. The playtest kit that came out of the same pass is
`PLAYTEST.md` at the root.

| report | skill | what it asked |
|---|---|---|
| `scope-check.md` | `scope-check` (project) | has the game grown past its pillars, and is the playtest freeze holding |
| `content-audit.md` | `content-audit` | what the docs promise, what the registries hold, and what a run actually deals |
| `design-drift.md` | `design-drift` (change + scan) | where docs, hints and briefs still teach the dropped souls economy and the painted art, and 82 doc numbers against the code |
| `asset-audit.md` | `asset-audit` | what the build weighs, what it ships and never draws, and what the packers waste |
| `balance-check.md` | `balance-check` | the threat over power curve rebuilt from the real soul deal, the score, the boons, easy mode |

The folders hold the throwaway probes and their raw output. They were run from scratch copies of the game
(a `git archive HEAD` and a copy of the working tree), so the paths inside them point at those copies; to
re-run one, point it at the repo or at a fresh `git archive`. Nothing here is loaded by the game.
