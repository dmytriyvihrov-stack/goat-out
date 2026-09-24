# PLAYTEST — the first round, 30 September to 6 October 2026

The plan agreed on 23 September (`tools/backlog-questions.html:142-164`, summarised at `BACKLOG.md:38-40`)
turned into something a person can run: what we are asking, what build, what the testers fill in, what the
facilitator writes down, how the three numbers are counted, and whether the build is ready. The plan's
wording is kept; where it says nothing, the line is marked *(proposal)* and is the user's to take or
strike.

Prepared with `playtest-report` (kit) and `launch-checklist` (scoped to an itch.io **restricted** page, not
a public launch). Read-only on the project. Snapshot: working tree at about 19:00 on 24 Sep, HEAD
`9afe0d3` (1.64), `BUILD` `'1.65'` uncommitted (another session is mid-edit on 22 files and 6 new ones).
Probes: `output/audit-2026-09-24/playtest/probe.js`, output `probe-wt3.txt` (identical to the 14:57 run `probe-wt2.txt`)
and `probe-head.txt`. Sibling audits cited, not redone: `scope-check.md`, `design-drift.md`,
`content-audit.md`, `asset-audit.md`.

---

## 1. The goal and the three questions

```
Round:  the first playtest, 30 Sep – 6 Oct 2026 (the plan's week 2); triage 7–13 Oct (week 3)
Goal:   learn, from people who have never played, whether an evening with the game hooks them,
        teaches them that the wall is the weapon, and carries them forward, before any more is built.
Q1 Hook      After their first death, how many start again?
Q2 Teaching  How many kill a man against a wall, by their own doing, within their first ten minutes?
Q3 Curve     Which floor does an evening reach, and where do people stop?
Side         From one picture, before playing: what do they think this is, and what is it like?
Not asking:  THE DARK and THE FORK (floor 4 on, past most evenings), boon and talisman balance, the
             late floors, music, the market route and gore. Anything said about them is logged, not
             counted.
```

The three questions are the plan's three numbers (`plan-metrics`): the first says whether there is a
hook, the second whether the teaching works, the third whether the difficulty curve holds. The side
question is the plan's positioning test (`plan-hook`): if the answer is "Ape Out with a goat", the
positioning is not working yet (`MARKET.md` §4, §8.1).

"A second run" in the plan is read as **another attempt after the first death**: a death here regenerates
the floor, it does not end the run (pillar 4). *(proposal: that reading)*

---

## 2. The build

```
Build:    whatever `BUILD` says after 1.65 lands and the go/no-go below passes   Commit: <hash>
Where:    one itch.io page, Restricted, with a password                        URL: <itch link>
Frozen:   from upload until the form closes (6 Oct). A fix found mid-round goes to the next round's
          build; the upload is not replaced. Two builds in one round are compared, never merged.
Copy back: the RUN CODE, off the last death card (it goes to the clipboard on the click that leaves the
          card) or the win card. It is also printed at the foot of every card.
```

- **What freezes.** `scope-check.md` §7 names the smallest set: land 1.65, decide the two numbers (the
  soul a cleared room pays, `TUNING.soul.roomChance` 0.35 at `tuning.js:1212`; THE TRIP on floors 2–3,
  a tuft on THE YARD in 13 of 25 seeds), run the clean-build pass, then stop. The freeze was agreed on
  23 Sep and has not held since (six additions shipped or in flight); it is written nowhere a session
  reads first. *(proposal: one line at the top of `CLAUDE.md` when the build is cut)*
- **The version string.** `BUILD` is on screen bottom-left (`render.js:5752`) and first in the code. It
  must never contain a space: the code is split on whitespace (`game.js:1617`). *(proposal: bump it
  when the frozen build is cut, so every code in the form names it)*
- **The run code, as it stands** (`game.js:1600-1607`, same at HEAD):

  `v1.65 L2 21i3v9 D1 R6 K9 241s S3 dog G0.8 bearer/splat@14 -`

  | token | means |
  |---|---|
  | `v1.65` | the build |
  | `L2` / `T3` / `N5` | the floor, `T` when THE TRIP stands in its place, `N` for THE DARK |
  | `21i3v9` | the run seed, base 36 |
  | `D1` | deaths in the run before this attempt |
  | `R6` | the room he was in |
  | `K9` | kills on this attempt |
  | `241s` | this attempt's clock |
  | `S3` | souls swallowed |
  | `dog` | what took the last heart (`-` on a win) |
  | `G0.8` | seconds between the last two hearts |
  | `bearer/splat@14` | this attempt's first body, its cause and its second. `splat` is a man driven hard into something: the wall, but also a sword, a blast (`enemies.js:749-751`, `entities.js:1792,1853`) |
  | `-` / `EJ` | how it was played: `E` easy mode, `X` god mode on, `J` started off LEVELS; `-` a plain run. A code ending in anything but `-` is not a playtest number |

  `game.replayCode('<code>')` from the console stands on the same floor, same layout (THE DARK too). Leaving
  the clear card's picture copies its code as well.

- **What the code does not carry** (probe D, verified in node on both HEAD and the working tree):
  - **THE DARK.** A death there gives the same code as the lit floor it replaces, and the replay builds
    the lit floor. The card says `THE DARK`; the code does not.
  - **EASY MODE, GOD, the dev drawer, a start from LEVELS.** An easy-mode, god-mode code equals a
    normal one. Each of them changes all three numbers without a trace.
  - **A cleared floor.** The picture card shows a code but does not copy it (`copyCode` only at
    `game.js:1876, 1888`), so somebody who clears a floor and then closes the tab mid-level pastes an
    older code and undercounts Q3.

  *(proposal, a tool change the freeze allows: `N` for THE DARK in the floor letter, passed through
  `replayCode`; one trailing flags token, `E` easy, `J` began from LEVELS, `X` dev drawer opened this run,
  `-` for none; copy on leaving the picture card too. About ten lines in `game.js`, which is under
  another session's edit)*

---

## 3. The form

Google Forms (the plan: "Google Forms хватит"). One form, two sections. Nothing required; no email
field. The testers are mostly Russian speakers and the game is in English, so every question carries both.
*(proposal: bilingual, tag instead of name, no required fields)*

**Section A — before you press play** (the plan's "ещё до игры" line and the positioning test)

| # | English | Русский |
|---|---|---|
| A0 | A name or tag you are happy to be called in the notes. | Имя или ник, под которым тебя можно упоминать в заметках. |
| A1 | Which two or three games have you loved lately? | Какие две-три игры тебе в последнее время очень понравились? |
| A2 | *(the picture)* What kind of game is this, and what does it remind you of? | *(картинка)* Что это за игра и на что она похожа? |
| A3 | What will you play on? computer and mouse / laptop touchpad / phone / tablet | На чём будешь играть? компьютер и мышь / тачпад ноутбука / телефон / планшет |

A3 is *(proposal)*: the plan is silent, and a phone run is a different test (§8, B12).

**Section B — after you stop** (the plan's six, in its order)

| # | English | Русский |
|---|---|---|
| B1 | Paste your RUN CODE. It is copied when you click away a death card, and printed at the foot of every card. | Вставь КОД ЗАБЕГА. Он копируется, когда щёлкаешь по карточке смерти, и написан внизу каждой карточки. |
| B2 | Where did you stop, and why? | Где ты остановился и почему? |
| B3 | How do the men die in this game? When did you work that out? | Отчего в этой игре умирают люди? В какой момент ты это понял? |
| B4 | One thing that stuck with you. | Одна вещь, которая запомнилась. |
| B5 | One thing that annoyed you. | Одна вещь, которая бесила. |
| B6 | How much do you want another run right now? **1** not at all … **5** I'm going back in. Why? — And if it were on Steam: no / at $8 / at $15 | Насколько хочется ещё забег прямо сейчас? **1** совсем нет … **5** уже иду обратно. Почему? — А если бы она была в Steam: нет / за $8 / за $15 |

- B1 comes first on purpose: the code is on the clipboard until something else is copied.
- B3 departs from the page's wording ("В какой момент понял, что убивают стены"), which gives the answer
  away and so cannot measure Q2. It asks the same thing without naming the wall. *(proposal: the rewording;
  revert it if the literal question is wanted)*
- B6 is the one 1–5 score. The price line is the plan's; "no" comes first so it is not the odd one out.

---

## 4. What to watch, and the observation sheet

For the 3–5 watched sessions. Silent, all of it; tied to the question it answers.

| watch for | Q |
|---|---|
| the first thing they try on the title and in the pen, with no instruction | teaching |
| how long the pen takes (seven blows the first time ever; the third and the sixth put him down) and what they say while it does | teaching |
| the lesson room: the first headbutt, where it points, whether the man dies and on what | Q2 |
| **the first kill against a wall, by their own blow: mm:ss from the first input after NEW GAME** | Q2 |
| **the first death: mm:ss, what killed him as it happened, and what they say killed him** | Q1 |
| **what they do on the death card: read it, click on at once, hesitate, stop** | Q1 |
| whether they ever grab, throw, roll or bleat, and when | teaching |
| the first soul: do they read the three cards or take the first | curve |
| THE YARD: the first barrel and the first hound (both new since anyone new played, `scope-check.md` §5); the mushroom tuft, and whether they eat it | curve |
| a hesitation over ten seconds, and where; a click that did nothing | confusion |
| laughing, swearing, leaning in | delight / friction |
| **the moment they would stop, and what is on screen** | Q3 |

```
Tester: <tag>   Games loved: <A1>   Genre: none / some / veteran   Device + input: <>
Build: <>   Run code(s): <>   Watched by: <>   Recording: yes, with consent / no
Before play — A2 verbatim: "<>"

Q1  first death at __:__ of ____ · played on after it: yes / no
Q2  first wall kill by his own blow at __:__ · before 10:00: yes / no · any intervention before it: yes / no
Q3  furthest floor: __ · stopped at __:__ on <floor, room> · their words: "<>"

| mm:ss | what they did | what they said (verbatim) | floor / room | tag |
|-------|---------------|---------------------------|--------------|-----|
|       |               |                           |              | confused / died / stuck / delight / bug / quit / INTERVENTION |
```

---

## 5. The three numbers, and how to collect them

Count testers, not mentions. Watched and unwatched in separate columns; a count is always "k of n".

| number | what counts | watched (observed) | unwatched |
|---|---|---|---|
| **1 Hook** | of those who died at least once, how many started again after the first death | the sheet's Q1 line | **yes** if any code shows `D1` or more, or B2 says they played on; **no** if the code is a first death (`D0` and a killer) and B2 says they stopped there; otherwise **unknown**, reported as its own count |
| **2 Teaching** | a man killed against a wall by the tester's own blow, within ten minutes of the first input after NEW GAME, with no intervention before it | the sheet's Q2 line | not measurable from the code (its first body is per attempt, its clock per floor, and `splat` is not only the wall). B3 is reported beside it as **self-report**, never added to the watched count |
| **3 Curve** | the furthest floor reached | the sheet's Q3 line | the floor in B1's code (`T3` is floor 3); a code carrying a LEVELS start, once the flag exists, is left out |

- Report number 3 as the median and the mean *(proposal: the plan says "в среднем"; with n near 15 the
  median is the honest one)* and the spread, floor by floor, beside "where people stopped" from B2.
- The side number: how many A2 answers name Ape Out or read as "X with a goat", out of how many answered,
  with every answer verbatim.
- The silence number: invited, played (the plan: itch shows the number of plays), answered. Silence is data.
- Set the bar before the round opens, so the numbers cannot be read to suit. *(proposal: hook 2 in 3 play
  on; teaching 3 of the watched by ten minutes; curve a median of THE CAVE)*

---

## 6. Running it

**Before anyone plays** *(proposal: dates; the plan fixes only the weeks)*

- by **Tue 29 Sep**: the go/no-go below passes; the zip is uploaded; the form and the picture exist.
- The bot first. Goat out has no AI personas; `tools/playtest.js` is a console bot that plays the real
  run (`PT.start()`, `PT.play(20)`, `PT.retry()`). Run the frozen build locally (`node tools/serve.js 8766`)
  through floors 1–3 on a few seeds, then every floor, THE TRIP and THE DARK by hand through LEVELS, the
  console open. A blocker it hits is fixed before any person spends an evening on it. It is a smoke test,
  not a tester, and never counts in §5.

**Who** (`plan-who`): 10–15 people who have never played. Max and the user are out: they already know the
wall kills. The page offered a mix: 5 genre fans (Ape Out, Hotline Miami, Hades, Isaac), 5 casuals, 2–3
game developers, and communities (r/playmygame, indie Discords). Which of those were ticked is not in the
repo. *(proposal: the three groups of people as listed, 12–13 in all; communities only if fewer than ten
say yes)*

**Watched, 3 to 5** (`plan-watched`): Discord or Zoom, the tester shares the screen and thinks aloud, the
facilitator says nothing for 30–40 minutes, the recording is kept.
- Say once: "Think aloud. I won't help; if you get stuck, that's what I'm here to see. Stop whenever you
  would stop at home." Then quiet.
- Section A of the form first, read aloud by the tester, the picture shown before the game is.
- The same itch page as everybody else, in a **private window**. The game remembers a broken pen and a
  seen opening per browser (`PEN_KEY`, `SEEN_KEY`, `game.js:107-108`): a second play gets a two-blow pen
  and a skippable scene, which is not a first evening.
- Intervene only after two minutes of a stall *(proposal: the limit)*, and write it down as `INTERVENTION`
  with what was said. Q2 does not count past an intervention.
- Section B after, filled in by the tester, not paraphrased.
- The session report the same evening (§7).

**Unwatched, 10 to 15**, on the itch page (`plan-host`: a closed page with a password):
- One link, one password, the form linked at the top of the page, a deadline and one reminder.
  *(proposal: links out Wed 30 Sep, reminder Sat 3 Oct, form closes Mon 5 Oct at midnight, export on 6 Oct)*
- Page settings *(proposal; check the edit page for the exact names on the day)*: Kind of project HTML;
  the zip "played in the browser"; embed 960×540 with the fullscreen button; click to play on (the first
  click is what starts the audio anyway); **mobile friendly off** until the phone check passes; visibility
  **Restricted** with a password. itch's own docs (GitHub source, fetched 24 Sep): a restricted page is
  "not indexed by external search engines" and not in browse or search; on a phone itch launches the game
  in fullscreen whatever the embed settings say.
- **No screenshots, cover text or tagline on the page.** Anything that describes the game before A2 is
  answered spoils the positioning test. *(proposal)*
- The zip is `index.html` plus `js/` and nothing else: 30 files, 6.17 MiB, about 4 MB zipped
  (`asset-audit.md`). The folder as it is would be 517 files and 207.6 MB, mostly `tools/shots/`.

**The page text** *(proposal)*:

```
GOAT OUT — playtest build <BUILD>

Before you press play: open the form <link>, answer the first part, and keep the tab open.
Then play here, on a computer with a mouse, the way you would at home. Stop when you would stop.
When you stop, paste your RUN CODE into the form (clicking a death card copies it; it is also
written at the foot of every card) and answer the six questions. Five minutes.

WASD — run · mouse — aim · left click — headbutt · hold right click — grab, let go — throw
E — roll · Space — bleat · Esc — pause · M — mute

Your run is kept in this browser. Nothing is collected here; the page loads one font from Google.
```

**The invite** *(proposal)*:

```
Нужен один вечер, минут 30–40, на мою игру: <ссылка>, пароль <пароль>.
Сначала открой форму (она наверху страницы) и ответь на первые вопросы, потом играй, как играл бы дома,
и бросай, когда захочется бросить. В конце — код забега и шесть вопросов. До понедельника, 5 октября.
```

The password stays out of the repo.

---

## 7. How results come back into BACKLOG.md

1. **Each watched session, the same evening:** `playtest-report report` on the sheet, the recording notes
   and the form row. One report per tester: what they did, what they said verbatim (Russian stays Russian,
   a translation beside it), what we think it means, each finding tagged and marked observed or inferred.
   Kept out of git, tags only in anything committed. *(proposal: a local folder, not committed)*
2. **The form, when it closes:** exported as CSV.
3. **7 Oct:** `playtest-report aggregate` over the watched reports and the form export. Humans only; the
   bot's run is a separate line and never raises a count. Patterns ranked by testers hit × severity. The
   three numbers and the side number computed as in §5.
4. **Into `BACKLOG.md`**, one batch at the top, in its own voice:

   ```
   ## 7 October 2026 — the first playtest, <N> new players on <BUILD>

   <one paragraph: the three numbers with their denominators, the positioning count, how many answered>

   - **feel — <the ask, in the testers' words>.** <what was seen, k of N, observed or self-report,
     the run codes it came from>
   ```

   Tags as the file has them: **bug**, **feel**, **number**, **system** (and **tool**). The batch keeps
   the aggregate's rank, not the order things arrived in. *(proposal)*
5. **Before anything is called a bug** it is stood on again with its code (`game.replayCode(code)` on the
   same build; for a THE DARK death, open `#dark` first until the `N` letter exists). A bug that will not
   come back is written "not reproduced", never dropped.
6. **Number findings go to `balance-check`** (`tools/balance.js`), not into `tuning.js` off one complaint.
7. **Then the plan's week 3** (`plan-triage`): fix the three biggest problems, not thirty. The positioning
   count and the $8 / $15 answers go beside route and price in `MARKET.md` §9; design rulings into the
   open questions at the end of `CLAUDE.md`.

---

## 8. Go / no-go for the itch.io playtest build

```
Release: itch.io restricted playtest page, BUILD 1.65 (uncommitted) on HEAD 9afe0d3 (1.64), checked 24 Sep 2026
Overall: NO-GO today — expected five days before the freeze date.
Blocking: fail 6 (B1 B1a F4 F5 F6 F7), not assessed 3 (B3 B5 B13). B4, B9, F2, G4 passed on 24 Sep (evening). Conditional: B12, F8.
```

Status is **pass**, **fail**, **?** (not assessed here: the input to the check was absent, mostly a
browser, which this audit could not use), or **later** (a public-launch row, not a playtest row). Owner:
**user** or **Claude**. Rows that sit in a file with uncommitted changes say so.

| # | check | how to verify | status | evidence | owner | blocks |
|---|---|---|---|---|---|---|
| B1 | Built from a clean tree at a known commit | `git status --short` empty; record `git rev-parse --short HEAD` | **fail** | 22 modified, 6 untracked; 1.65 exists only in the working tree | user | yes |
| B1a | The freeze is decided and written where sessions read | 1.65 landed or stashed; the two numbers decided; one line in `CLAUDE.md` | **fail** | `scope-check.md`: "The freeze is NOT HOLDING"; absent from `CLAUDE.md` | user | yes |
| B2 | Version on screen = top of CHANGELOG | `BUILD` against the first `## ` in `CHANGELOG.md`, in the cut build | pass | `tuning.js:5` `'1.65'`, `CHANGELOG.md:8` "## 1.65" (both uncommitted); HEAD 1.64 / 1.64 | Claude | yes |
| B3 | Loads clean in a fresh profile: no console error, no 404, nothing but the host and the font | private window on the itch page, console and network open | **?** | static: the only third-party request is Google Fonts (`index.html:10-11`); the one `fetch` in shipped code is the dev `/tuning-edit` (`game.js:624`) | Claude | yes |
| B4 | No dev tools live | the corner word, the hashes, `KeyN`; grep the shipped files | pass | the polish session (24 Sep, evening): on an itch host (itch.io, itch.zone, hwcdn.net) the corner is not drawn and the tool hashes do nothing unless the page is opened with `#dev` (`dev.hidden`, `game.js` constructor); `#seed=` still works. A code also says `X` when god mode was on | Claude | yes |
| B5 | Audio audible | `AudioContext.state === 'running'` after the first click inside the iframe; one SFX heard | **?** | 43 foley recipes render, none silent (probe E); `audio-check.js` does not load `foley.js` (`asset-audit.md`); `foley.js` is new and uncommitted | Claude | yes |
| B6 | Save and continue, inside the iframe | play, reload, CONTINUE on the itch page | **?** | static pass: every storage call is wrapped (`game.js:107-108, 1521-1535`), a refused store only hides CONTINUE; save schema `v: 1` unchanged 1.64→1.65 | Claude | no |
| B7 | Script lists in sync | every `<script src>` exists, every `js/` file loaded, both HTML lists equal | pass | 29 scripts, identical lists, none missing, no case mismatch (probe B). `check-sync.js` not run: it fetches and refuses a dirty tree | Claude | yes |
| B8 | Within itch's limits | files, extracted size, largest file | pass | 30 files, 6.17 MiB, largest `js/pixel-assets.js` 2.67 MiB (probe B); itch: 1,000 files, 500 MB, 200 MB a file, 240-char paths, case-sensitive (itch `docs/creators/html5.md`, fetched 24 Sep) | Claude | yes |
| B9 | Zip layout | `index.html` at the zip root, relative paths, only `index.html` + `js/`; list the zip back | pass | `node tools/itch-zip.js`: `index.html` + exactly the scripts it loads, refuses a dirty tree, lists the zip back CRC-checked; 33 files, 5.17 MiB unpacked, 3.10 MiB zipped (after `tools/png-harden.js`); opens with Windows Expand-Archive and `unzip -t` | Claude | yes |
| B10 | Encoding | charset meta; the file is UTF-8 | pass | `<meta charset="utf-8">` (`index.html:4`); valid UTF-8, no BOM (node) | Claude | no |
| B11 | Reads at the embed size | the RUN CODE line and the HUD at 960×540 and in fullscreen | **?** | type scale `clamp(min(w,h)/460, 0.62, 1.2)` (`render.js:94`): the code line is about 13 CSS px at 42% alpha at 960×540 (`render.js:6593-6594`) | Claude | no |
| B12 | Phone and touch (claimed: `README.md:8`) | one phone, the plan's own step | **?** | touch UI in `js/input.js`; "buttons vanish on a phone" fixed in code, never checked on a phone (`BACKLOG.md:29`) | user | only if phones are invited |
| B13 | Holds up over 20 minutes on a weak laptop | the plan's weak laptop, frame rate and memory | **?** | foley is a 658-line rewrite of every effect, days before the build (`scope-check.md` #63) | user | yes |
| G1 | Every file parses | `node --check` over `js/` and `tools/` | pass | 42 files, 0 fails (probe A) | Claude | yes |
| G2 | Generator sweep | every floor on many seeds, THE TRIP in each place, THE DARK | pass | 8 floors × 250, THE TRIP × 60 in each of 2–8, THE DARK × 120: 0 fails (probe C) | Claude | yes |
| G3 | Every generator promise holds | `node tools/balance.js` on the cut tree | pass | "all balance rules hold" (`balance-wt.txt:196`, working tree at 14:39); re-run on the cut build | Claude | yes |
| G4 | Every floor, THE TRIP and THE DARK played through LEVELS with the console open | the plan's step (it says "all 7 levels"; there are 8 and THE DARK) | pass (bot) | `tools/smoke.js`: every floor, THE DARK and THE TRIP on two seeds walked to the stairs with the cult alive and a frame drawn every few steps: 0 throws, 0 NaN, all OK. Still worth one human pass with the console open | Claude | yes |
| G5 | What the first evening deals is decided | THE TRIP on floor 3, the cleared-room soul | **?** | a tuft on THE YARD in 13 of 25 seeds; `shroom.from` 1; `roomChance` 0.35 (`scope-check.md` Q2, Q3) | user | no |
| F1 | Run code on every death and win card, copied on the click | code path | pass | `game.js:1590, 1600-1613, 1876, 1888`; printed on the card (`render.js:6592-6595`) | Claude | yes |
| F2 | The run code reproduces the floor and says how it was played | codes for lit, dark, easy, god in node; replay a dark code | pass | `N` for THE DARK, replayed through `replayCode`; last token `E`/`X`/`J` or `-`; the picture card copies its code on the click that leaves it | Claude | yes |
| F3 | The clipboard copy works inside itch's iframe | die, click, paste, on the restricted page | **?** | itch's docs say nothing about the iframe's permissions; a refused copy is silent by design (`game.js:1608-1613`); the printed line is the fallback | Claude | no |
| F4 | The form exists | six questions, section A, the code, the 1–5 score | **fail** | not made (§3 has the wording) | user | yes |
| F5 | The picture for the positioning question | one screenshot or a 10 s clip, the goat in front, from the frozen build | **fail** | none chosen | user | yes |
| F6 | The restricted page exists | password, page text, form link, no screenshots | **fail** | not created (§6 has the text) | user | yes |
| F7 | 10–15 new testers asked, 3–5 watched sessions booked | a list, dates | **fail** | nothing in the repo | user | yes |
| F8 | Anything a tester might read is true | `README.md` against the build | pass | README.md rewritten on 24 Sep (evening) with every number read off the code: eight floors, the pen, souls, the mouse, talismans, animals, THE DARK, THE TRIP | Claude | only if README is linked |
| F9 | The game's name is one name | `<title>` and the canvas label against README and MARKET | pass | `DOOMED GOAT` in both page titles, the canvas label, the title screen and README (which says the repository calls it Goat Out) | Claude | no |
| L1 | Fonts licensed; the one outbound call named | `@font-face` list | pass | Alegreya and Alegreya SC (OFL) from Google Fonts, `CLAUDE.md` Conventions; one line on the page | Claude | no |
| L2 | Audio assets licensed | files shipped | pass | 0 audio files; all of it synthesised (`asset-audit.md`) | — | no |
| L3 | SAVE THE PICTURE works in the iframe | save once on the itch page | **?** | off claude.ai it saves through a plain link (`painting.js:22-29`); a sandboxed frame may refuse downloads. Not part of the plan | Claude | no |
| — | Cover, screenshots, GIF, tags, genre, price, public visibility, AI-art disclosure, privacy policy, credits page, press kit, devlog, trailer, Steam | — | later | a restricted playtest page needs none of them; the positioning test needs the page bare | user | no |

---

## 9. For the user

- Is 1.65 the last feature build before the playtest? *Recommend: yes; land it, write the freeze into
  `CLAUDE.md`, freeze through 13 Oct.*
- THE TRIP on floor 3 and the soul a cleared room pays? *Recommend: THE TRIP off floors 2–3 for this
  round (still on LEVELS); `roomChance` 0* (`scope-check.md`).
- The dev drawer: hide it, or leave it and stamp the code? *Recommend: hide the corner word unless the
  page is served locally or has `#dev`, and stamp the code anyway.*
- Phones this round? *Recommend: "on a computer with a mouse" in the invite; phones are welcome and
  tagged by A3; tick "mobile friendly" only after the one-phone check.*
- B3 reworded so it does not give the answer? *Recommend: yes.*
- Which of the page's tester groups were ticked? *Recommend: fans, casuals and developers as listed.*
