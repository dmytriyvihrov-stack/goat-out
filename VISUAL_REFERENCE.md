# Visual reference — pixel density and genre-fit research

> Written while the art was still painted. The pixel pass it argued for has shipped (units 1.55, effects 1.58,
> every prop 1.63–1.64); the density and genre findings still hold, the pipeline notes are history.

Research done 22–23 Sep 2026, for whoever picks the painted-art pass up next. Two separate questions
sit in this file and they do not have the same answer: how detailed should a pixel look, and which
games is Goat Out actually a genre neighbor of. `ART_HANDOFF.md` is the pipeline and what is painted
today; this file is what to point the pipeline at. Nothing here is a decision — it is evidence, the
way `MARKET.md` is evidence for the commercial questions.

---

## Part 1 — how big should a pixel be

### The numbers that decide it, not taste

`TILE = 32` screen px, `zoomRest: 1.0` (`js/tuning.js`). A man is drawn at width **42px**
(`render.js:2060`, `Renderer.painted.character`), the goat at 40, the Butcher at 58 — off a 128×128
source cell (`js/painted-art.js`), so the art is generated three times more detailed than anyone ever
sees it rendered.

**Middle density is the answer, and it is arithmetic, not preference: tile 32px ÷ 2 = 16 art-px a
tile, a man 42px ÷ 2 = 21 art-px tall.** Push it to 24 by drawing the man at 48px and the ratio holds.

Why not a bigger pixel (Nuclear Throne / Hotline Miami territory, ~12–16px characters): the world is
420×78 tiles and the fog is deliberately the width of a doorway (`CLAUDE.md`, *The fog, and its two
halves*) — a room has to be read whole from the threshold, which rules out the camera pull-in that
usually buys a bigger, chunkier pixel its readability. Silhouette alone has to carry a rack, a raised
club and a lit fuse at that scale, and it will not.

Why not a bigger, more detailed pixel (Katana Zero / Hyper Light Drifter territory, ~48–80px): eight
painted facings (`PaintedArt` / `sheepFacing`) times idle/walk/windup/swing/recover/floored/burning/
dazed times eight-plus enemy kinds is the real cost multiplier, not pixel size on its own — the
reference photo at the top of this research (twelve portrait characters, one facing each, weapon
angled out for readability) is cheap for exactly the reason it will never be what Goat Out needs:
one pose is not eight.

### Do not lower the render resolution — pixelize the asset

`TILT = 0.86`, `ctx.scale(1, 1/TILT)` counter-squash, `zoomPunch`, `game.kick()`, the mill's rotating
arm — none of these land on a pixel grid, so a genuinely low-res *canvas* will shimmer and crawl on
every camera move. The fix is nearest-neighbour downsampling **in the asset pipeline**
(`assets/painted-expansion-v2/pack.cjs`, 128px → 24–32px) plus a colour snap into `PALETTE`, with the
frame itself staying full resolution. This is exactly Dead Cells' own pipeline — 3D model → rendered →
pixelized in post — and the closest thing on the list below to what Goat Out already does by
generating painted sheets and packing them into an atlas.

(A separate in-progress experiment along these lines already exists, untracked, at
`output/pixel-mid-2026-09-23/` — check there before starting a fresh pass.)

### Pixel-density comparables, with copies sold and price

Steam sales are not published raw; "official" below means the developer or publisher announced it,
"estimate" means a third-party tracker (SteamSpy ownership range, Gamalytic). Prices are the regular
Steam price in the account's region (EUR), not a live sale price.

**Chunk (12–16px characters) — for contrast below the target band**

| Game | Copies sold | Price |
|---|---|---|
| [Nuclear Throne](https://store.steampowered.com/app/242680/Nuclear_Throne/) | 500k–1M Steam owners (estimate; no official total) | 11,79 € |
| [Crawl](https://store.steampowered.com/app/293780/Crawl/) | 475k+ (official, ~10 years) | 14,79 € |
| [Death Road to Canada](https://store.steampowered.com/app/252610/Death_Road_to_Canada/) | 200k–500k Steam owners (estimate, Steam only) | 14,99 € |

**Middle (20–32px characters) — the target band**

| Game | Copies sold | Price |
|---|---|---|
| [Enter the Gungeon](https://store.steampowered.com/app/311690/Enter_the_Gungeon/) | 3M+ (official, 2020) | 14,79 € |
| [Wizard of Legend](https://store.steampowered.com/app/445980/Wizard_of_Legend/) | 500k+ (official, 2018) | 15,99 € |
| [Moonlighter](https://store.steampowered.com/app/606150/Moonlighter/) | 2M+ (official, 11 bit studios, 2022) | 19,99 € |
| [UnderMine](https://store.steampowered.com/app/656350/UnderMine/) | 500k+ (official mention, Thorium) | 16,79 € |
| [ZERO Sievert](https://store.steampowered.com/app/1782120/ZERO_Sievert/) | ~650k (estimate, 2025) | 19,99 € |
| [Streets of Rogue](https://store.steampowered.com/app/512900/Streets_of_Rogue/) | ~1M all platforms (official, tinyBuild IP sale, 2022) | 19,50 € |

**Detailed (48–80px characters) — for contrast above the target band**

| Game | Copies sold | Price |
|---|---|---|
| [Dead Cells](https://store.steampowered.com/app/588650/Dead_Cells/) | 10M+ (official, 2023) | 24,99 € |
| [Katana Zero](https://store.steampowered.com/app/460950/KATANA_ZERO/) | 500k+ first year (official); 2–5M Steam owners now (estimate) | 14,79 € |
| [Hyper Light Drifter](https://store.steampowered.com/app/257850/Hyper_Light_Drifter/) | 1M+ (official, 2022) | 14,99 € |

The commercial read: the middle band is not a compromise, it is where the genre's actual hits live
(Gungeon 3M, Moonlighter 2M). Detailed pixel only pays off at Dead Cells' scale of years and budget, or
by dropping to one facing the way a side-view game can.

---

## Part 2 — which games is this actually a genre neighbor of

Asked 23 Sep 2026: the middle-density list above (Gungeon, Wizard of Legend, Moonlighter, UnderMine,
Zero Sievert, Streets of Rogue) is almost entirely **build-craft and pattern-reading** — a run's skill
test is optimizing a loadout and reading a bullet pattern in real time. That is a genuine, separate
question from pixel size, and the honest answer is that most of that list is the wrong genre neighbor
for Goat Out, even though it is the right pixel density.

**Goat Out's actual skill test is spatial judgment, not loadout optimization or pattern-reading.**
Ground rule 3 (`CLAUDE.md`) is explicit about this: a headbutt only knocks a man down, a wall is what
kills, and pillar 6 goes further — nothing may reward memorizing a layout, because the level is never
the same twice. There is a build layer (souls, boons, the seventeen talismans), but it bends numbers
behind five verbs; it does not replace the moment-to-moment test, which is: is that man lined up with
the wall, will this throw land him on the other body, is there room to roll past the hound's charge.
That is a game about judging trajectory and timing in real time, not about assembling a synergy before
the room starts.

**[My Friend Pedro](https://store.steampowered.com/app/557340/My_Friend_Pedro/)** — DeadToast
Entertainment, published by **Devolver Digital**, same publisher and the same year (2019) as Ape Out,
which `CLAUDE.md` already names as the load-bearing reference for pillar 3. 500k+ copies (official,
Oct 2019), regular price 19,50 €. It is the closer genre neighbor: precision aiming, slow-motion
judgment of distance and timing, momentum through a level, a style/flow score — and effectively no
deckbuilding. **It is not useful as a pixel-density reference** — it is flat, vector, cel-shaded art
with no pixel grid at all (no "Pixel Graphics" tag on its own Steam page, side view). Keep the two
questions separate: Pedro settles the genre-feel question, not the art-style one.

### Closer genre neighbors — spatial judgment over loadout, ranked by how top-down and how pixel they are

| Game | Why it's closer | Pixel? | Copies sold | Price |
|---|---|---|---|---|
| [Titan Souls](https://store.steampowered.com/app/297130/Titan_Souls/) | Top-down like Goat Out, one hit kills either side, the whole game is aiming and positioning, no build at all | Yes, small/minimal | 500k–1M Steam owners (estimate) | 14,79 € |
| [Ape Out](https://store.steampowered.com/app/447150/APE_OUT/) | Already the project's own north star (pillar 3); rhythm and push/grab instead of guns, no loadout | No — flat colour blocks, no pixel grid | See `GENRE_RESEARCH.md` | — |
| [Katana Zero](https://store.steampowered.com/app/460950/KATANA_ZERO/) | Precision timing, one-hit-kill both ways, slow-mo judgment — the closest pixel-art analog to Pedro's DNA | Yes, detailed | 500k+ first year (official) | 14,79 € |
| [Broforce](https://store.steampowered.com/app/274190/Broforce/) | Chaos and destructible geometry over stats, side view | Yes, chunky | ~2.3M (estimate, Gamalytic) | 14,79 € |
| [SUPERHOT](https://store.steampowered.com/app/322500/SUPERHOT/) | Purest version of the design idea (time moves only when you do — pure spatial/timing judgment) but not a visual reference at all | No — stylized low-poly white void | 2M+ (official, 2019, base game) | 22,49 € |

Titan Souls is the strongest single match on the table: it shares Goat Out's camera (top-down), its
pixel scale (small, minimal — closer to the chunk band than the middle band above), its one-life
stakes, and a skill test that is pure aim-and-position with nothing to build. It is worth a proper look
before anything else on this list.

---

Sources for the sales and price figures above are web search results gathered 22–23 Sep 2026
(developer/publisher announcements, SteamSpy, Gamalytic, and Steam store pages checked live);
figures move over time and should be re-checked before being quoted anywhere outward-facing.

---

## Part 3 — how much of the build should show on the goat's own body

Asked 23 Sep 2026, because the project is leaning hard on the goat visibly wearing his build, and the
comparables split into two camps that disagree about how much of that is a good idea.

**The case for it.** The Binding of Isaac's transformations (three items from one of several sets
change Isaac's model outright, plus individual items retint or resize his tears and speed) are one of
the most-loved parts of the item system — Steam threads exist purely to rank favourite
appearance-changing items, people picking them for how they *look* as much as what they do
([top 25 favorite appearance changing items](https://steamcommunity.com/app/250900/discussions/0/405692224223485216/)).
Vampire Survivors' weapon evolutions pair the same idea with a wall-of-projectiles payoff — described in
reviews as satisfying specifically because the escalating visual clutter *is* the power spike.

**The case against overdoing it.** Risk of Rain 2 puts every item literally onto the character model,
and it is a live, unresolved argument in its own community, not a settled win: alongside players who
like reading a build at a glance, there is a standing complaint thread
([I kinda preferred when items didn't appear on my character](https://steamcommunity.com/app/632360/discussions/0/2968393780776044369/))
and enough demand for it that mods exist purely to hide item displays
([PartialItemDisplay](https://thunderstore.io/package/KingEnderBrine/PartialItemDisplay/)) because past a
certain item count the model stops reading as a character and starts reading as clutter — one player's
own word for the end state was "a drugged up murder hobo." Dead Cells sits at the other extreme: its
real build-shaping items (mutations) change nothing about how the character looks, only outfits
(cosmetic, unlocked separately from any run) do — and there is no comparable complaint thread wishing
mutations were visible. A game praised specifically for combat feel did not need the build to be worn to
land that feel.

**Why this matters more for Goat Out than for any of the three.** Ground rule 8 (`CLAUDE.md`) already
commits to a poster-flat silhouette that "reads at a glance" with no HUD needed to explain a threat —
that is the exact property RoR2's item pile-up erodes past a certain density, and it is a harder
constraint here than in RoR2: the camera is smaller and higher relative to the goat than RoR2's
over-the-shoulder view, run speed is high, and pillar 3 already spends the silhouette's legibility
budget on reading a man's club, a rack, a lit fuse. A goat wearing eight readable changes at once is
competing with all of that for the same few dozen pixels.

**The number, worked from what already exists.** `BOON_SLOTS` (`js/tuning.js`) is `{ active: 1,
passive: 2 }` per button, on two buttons (headbutt, grab), plus `general: 4` body slots — ten boon slots
a run, plus one talisman worn at a time (seventeen to choose from, `js/talismans.js`). Call it a dozen
things worn across a run, which is the ceiling the project is already sized to, not a new number to
invent. Isaac's own most-loved transformations are the exception, not the rule, even in Isaac — most of
its several hundred items change nothing about how Isaac looks. The read from both camps together: **a
small, fixed set of showy, deliberately-chosen changes beats trying to cover the slot count.** Something
under eight visibly-different states for the goat — realistically fewer once actives, passives and
talismans are triaged for which ones are worth a redraw — sits inside what both Isaac and Dead Cells
prove works, and stays clear of the RoR2 failure mode. This matches what is already built rather than
arguing for more of it: `PIXEL_ART.hornsOf` / `.horns` (LONG HORNS, BOMB CHARGE, SPLASH), `.face`
(THE ORACLE, THE FULL THROAT, VENOM SPIT), `goatFx` (DRAGON BREATH, venom drip) and the collar pendant
are already exactly this shortlist, not a first pass toward covering every boon — the research says stop
there in spirit, not extend it slot-for-slot.

Sources for this section: Steam Community discussion threads and Thunderstore linked inline above,
gathered 23 Sep 2026.
