# goat-stats, the RUN STATS receiver

A Cloudflare Worker over a D1 database. The game (`js/stats.js`) posts one report a life to
`/report` and the funnel's steps (opened, started, died, played again, cleared floor 1, reached 4 and 8,
escaped; each player's first time, kept once) to `/steps`; `tools/stats.html` (SERVER) reads both back
from `/reports` and `/steps` with the `READ_KEY` secret.
Free plan: 100 000 requests and 100 000 rows written a day, 5 GB stored. No card needed.

## Deploy, once

From this folder (`tools/stats-worker`), with Node installed:

1. Make a free account on cloudflare.com and turn on two-factor sign-in.
2. `npx wrangler login`, opens the browser to allow it.
3. `npx wrangler d1 create goat-stats`, prints a `database_id`; paste it into `wrangler.toml`.
4. `npx wrangler d1 execute goat-stats --remote --file=schema.sql`, makes the tables.
5. `npx wrangler secret put READ_KEY`, type a long random password. It is what `stats.html` asks
   for; it is never in the game or in git.
6. `npx wrangler secret put SALT`, any other random string (hashes the senders' addresses for the
   rate limit).
7. `npx wrangler deploy`, prints the address, `https://goat-stats.<you>.workers.dev`.
8. Put that address in `TUNING.stats.url` (js/tuning.js). Only the address: never the key.

Deployed 1 Oct 2026 at https://goat-stats.dimache.workers.dev (account subdomain `dimache`); the READ_KEY is in `.read-key` beside this file, gitignored. Opening the address in a browser should say `goat stats: alive`.

## Changing it

Reports come back newest first, 5 000 a page: `/reports?before=<got>` is the next page (`X-Oldest-Got` names it). Ids must be the game's own shape (`p-`/`r-` and base 36).

Edit `worker.js`, then `npx wrangler deploy` again. A new column: add it to `schema.sql` as an
`ALTER TABLE` and run step 4's command with that file. Look at the data directly with
`npx wrangler d1 execute goat-stats --remote --command "SELECT end_floor, killer, COUNT(*) FROM reports GROUP BY 1, 2"`,
or the funnel: `--command "SELECT step, COUNT(*) FROM steps WHERE release = 1 GROUP BY 1"`. The `steps` table went in on
1 Oct 2026 (schema.sql run again: every statement in it is `IF NOT EXISTS`).
