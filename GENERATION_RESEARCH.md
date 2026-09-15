# Generation research — how the genre's landmark procedural generators actually build a level

Reference-game research done 2026-09-15, for whoever is tuning `js/gen.js`, `js/rules.js` or `LEVELS` in
`tuning.js` and wants to know what the genre's landmark procedural generators actually do, not what they
are assumed to do. Companion to `GENRE_RESEARCH.md`, which is about what reviews praise and blame about
*feel*; this one is about *generation* specifically — how a level comes to exist, not how it plays once it
does. Not a spec — nothing here overrides `CONCEPT.md` or the promises already written into `GEN_RULES`.
Twelve games were researched, each fact checked against a primary developer source where one exists (a
talk, an interview, a dev blog) and marked plainly where it doesn't — several things below are stated as
"not publicly documented" rather than guessed at, because guessing at another studio's algorithm and
writing it down as fact is worse than admitting the gap. Sources are linked at the bottom.

---

## The games looked at

| Game | What its generator actually does, in one line |
|---|---|
| **Spelunky** (2008/2012/2020) | 4×4 grid of rooms; the critical path is carved first and room type is *forced* by the path's own direction, so an unsolvable join can't be produced. |
| **The Binding of Isaac** (Rebirth) | Constrained flood-fill from a centre cell over a fixed 9×8 grid; hand-authored room templates guarantee every door lines up. |
| **Enter the Gungeon** | A hand-authored abstract graph ("flow") is chosen first, transformed, then laid out spatially — topology decided before position. |
| **Dead Cells** | Fixed hand-built macro-map of biomes; each biome's hand-authored "concept graph" is filled by retrying random hand-built room tiles until one fits. |
| **Nuclear Throne** | No rooms at all — a single random walk carves the whole floor as one tunnel; occasional stamped blobs break the monotony. |
| **Risk of Rain 2** (and, ambiguously, 1) | Terrain is *not* procedural — one hand-built map per stage; only spawns and loot are generated, by a credit-spending "Director." |
| **Hades** | Hand-built chambers on a branching route map, FTL-style; the reward and the path choice are the same door. |
| **Ape Out** | Regenerated every playthrough, 4 chapters × 8 levels — the actual algorithm is not publicly documented anywhere. |
| **Streets of Rogue** | A grid of premade "chunks" in three sizes, typed by open connector count, explicitly modelled on Spelunky's generator; buildings are hand-built and scattered on top. |
| **Downwell** | Procedurally generated vertical shaft in three-level stages; the chunk/text-based mechanism itself is a real, named, unconfirmed lead. |
| **Hotline Miami / Katana Zero** | Not procedural at all — fixed, hand-authored levels built for memorization and mastery replay. |

---

## Per-game breakdown

### Spelunky — the reference algorithm

The one generator here with a fully public, verified mechanism, and the one nearly everything below either
names as an influence or converges on independently. A level is a 4×4 grid of 10×8-tile rooms. The
**solution path is carved first, before anything else exists**: a weighted random walk starting on the top
row (roll 1–5: 1–2 moves left, 3–4 right, 5 drops down a row), and the room's *type* is never rolled
separately — it is *forced* by which direction the path took through it, so a room the path drops through
becomes a floor-opening room and the room directly below it is forced to receive that drop. Because room
type is a consequence of the path decision rather than an independent roll that could contradict it, an
unsolvable transition is structurally impossible rather than something the generator has to check for and
reject after the fact. Only once that guaranteed-connected skeleton exists does the generator fill the
un-visited cells and dress every room from hand-authored ASCII-template layouts, then place enemies, items
and traps in a separate pass on top of the finished layout. The Daily Challenge — one seed a day, identical
for every player, exactly one attempt, no retry on death — is one of the format's first popularizations of
what is now a genre-standard daily-seed structure.

### The Binding of Isaac (Rebirth) — grid growth with a template contract

A fixed 9×8 grid of cells, generation starting at the centre and flood-filling outward: a candidate
neighbour cell is accepted or rejected — already occupied, would give an existing room a third neighbour
and start a loop, room quota already met, or a flat coin-flip. Position and topology are decided together,
unlike Gungeon's two-stage approach below. Reachability is never validated afterward because it doesn't
need to be: every hand-authored room template is built so a door sits at the centre of any edge it might be
asked to open and is walkable from all four sides — "there's no special considerations required when
choosing rooms — they will always work," in the words of the clearest technical writeup of the algorithm.
Room templates are split into easy/medium/hard pools, and difficulty is *also* a raw number carried per
room and per floor (Normal floor 1 draws 1–5, floor 2 draws 5–10; the range widens further in Hard Mode and
later chapters) — a second, independent axis of control stacked on top of the template-pool split. Special
rooms are placed at dead ends, farthest from the start first: Boss, then Super Secret, then Shop/Treasure,
then Secret; the Secret Room alone hunts for a cell touching at least three existing rooms and no dead end,
retrying up to 300 times before loosening its own criteria. Seeds reproduce an entire run exactly and
underpin the game's speedrunning scene; an official Daily Challenge (fixed seed/character, one scored
attempt, unlimited unscored replays after) shipped from Afterbirth onward.

### Enter the Gungeon — topology before position

The clearest graph-first example in this set. A hand-authored abstract "flow" — a graph of room
relationships with no coordinates yet, a handful per floor (4 for The Hollow, 8 for Gungeon Proper) — is
picked, transformed (marked nodes get randomized-length room chains, branches get randomly selected,
special-room nodes get injected), decomposed into tree and loop pieces, and only *then* laid out spatially:
trees by depth-first placement with backtracking, loops by growing outward from both ends of a line and
only accepting exit pairs that don't overlap existing geometry. Both the flow graphs and the individual
rooms are hand-designed and hand-playtested — "we quickly realized that the game was going to be more fun
and more fair if we hand designed the rooms... and structured floor layouts based on rules that we think
make good dungeon designs" (Dave Crooks, Dodge Roll) — with a stated lineage of Zelda dungeons plus D&D.
Reward rooms are gated by traversal cost, not just distance: "the majority of chests... either are at the
end of a one-way loop, or deep enough into the level to force you to fight many rooms just for that chest."
No stated numeric difficulty budget was found — floors get new enemy variety and, after the floor-1 boss, a
permanent run-wide bullet-speed increase, but nothing resembling Isaac's per-room number.

### Dead Cells — the hybrid, named as such by its own developer

An explicit six-step pipeline, documented first-person by Motion Twin co-founder Sébastien "deepnight"
Benard: (1) the macro layout — which biomes connect to which — is entirely fixed, never randomized;
(2) designers hand-build modular room "tiles," each bound to one biome and one gameplay purpose
(combat/treasure/merchant); (3) each biome carries a hand-authored "concept graph" encoding pacing
instructions per node — length, special-tile density, spacing; (4) for each node, the algorithm tries a
random candidate tile and **retries until one satisfies that node's requirements** — connectivity enforced
at insertion time, not validated afterward; (5) enemy density is a spent budget measured in "tiles" (a
cited example: a dangerous monster costs 10 tiles' worth); (6) loot placement is deliberately undisclosed
by the developer. Benard is explicit this is a *rejection* of pure procedural generation — full PCG "took a
great big hit" on consistency, the stated reason for the fixed-macro-plus-hand-tile hybrid. The pacing
philosophy is stated outright: building "around dramatic peaks and relaxing breaks," citing Spelunky, FTL
and Left 4 Dead as influences. An official Daily Run (same level and loadout for everyone, unlimited
attempts, best score posted) runs off the Challenger Rune.

### Nuclear Throne — no rooms at all

The one pure outlier here: no room graph, no hand-authored template pool. A single walker starts at the
level's centre, picks a direction, and carves floor tile by tile — 50% chance each step to keep going
straight, otherwise re-roll a new direction — for roughly three-quarters of the level's total tile budget.
Reachability needs no validation because the entire floor is, by construction, one continuous carved path.
The only "authored" content is small parametric stamps that occasionally drop a 2×2 or 3×3 blob instead of
a single tile, which is what keeps a pure corridor from reading as nothing but a corridor. Difficulty is
not a per-level curve at all — it is a single persistent counter that increments every time the player
enters *any* portal, including bonus ones, governing both enemy density and weapon-tier drops uniformly;
post-victory loops stack flat HP/damage multipliers on top. (Sourced to independent reimplementations of a
since-deleted 2013 Vlambeer dev-blog post describing the prototype the released game extended from — treat
the specific numbers as prototype-documented rather than confirmed against the final shipped game.)

### Risk of Rain 2 — the one that surprises: it isn't procedural terrain at all

Despite the genre-adjacent reputation, Hopoo Games has said outright that they tried and abandoned
procedural 3D terrain: "the level of difficulty needed to make interesting/memorable procedural maps in 3D
was too much for our team size." Every stage is a single hand-built 3D map; what's procedural is entirely
what populates it — a three-tier "Director" system spending a credit budget on monsters and interactables,
credits accruing over real time played (scaled by player count and a rising global difficulty coefficient)
and spent all at once per spawn event on whichever enemy tier the current budget can afford. A "too cheap"
floor stops the Director wasting a now-large budget on trivial enemies, which is the actual mechanism by
which weak early mobs phase out of a long run. Reward gating here is *temporal*, not spatial: nothing stops
you walking to any chest, but exploring costs time, and time is exactly what drives the difficulty
coefficient — a full-clear playstyle is punished by the same system that rewards it. Risk of Rain 1's
status is genuinely unresolved in the public record: its 2014 IGF Best Student Game citation credited
"procedural generation systems that created dynamic, replayable levels," but a later Hopoo retrospective
describes *all* the games' terrain, original included, as hand-crafted with only spawns and loot
randomized — the two accounts disagree and nothing found resolves them.

### Hades — the route map, not a floor

Structurally closer to an FTL-style branching route than an explorable floor: at a choice point you're
shown several doors, each carrying an icon that previews the reward behind it before you commit, so path
choice and reward choice are the same decision. Chambers themselves are hand-built, not algorithmically
shaped, each biome carrying its own stated design principle — Tartarus is "almost always completely walled
in," deliberately forgiving for a player still learning the kit; Asphodel's lava-archipelago terrain forces
enemies toward hop/float/dash movement the earlier biome never needed. This is, notably, the *only* one of
the twelve games researched with a clearly sourced, deliberate "safe first encounter" design — and it
operates at the scale of an entire biome, not a single isolated room. Infernal/Chaos Gates follow an
explicit hard spacing rule: never in a boss room, never in the room immediately after one, never within 8
chambers of another Gate. Reachability is a non-issue by construction, since every door leads to one
specific hand-built chamber. Seeds exist and are used competitively, though — unlike Isaac, Dead Cells and
Spelunky — there's no evidence of an official daily-seed mode for the original game.

### Ape Out — the project's own reference, and the one nobody has documented

Structurally the closest thing on this list to Goat Out — top-down, near-one-hit-kill, run through chained
rooms rather than an open floor or a persistent hub — and its actual generation algorithm is **not publicly
documented anywhere**, despite a real GDC 2019 postmortem existing under the title "Vibe-First Design"
(confirmed real via Devolver Digital's own promotion of it) whose content could not be recovered from any
transcript, slide deck or recap. What is confirmed, first-person, from creator Gabe Cuzzillo: the choice to
regenerate every playthrough was deliberate and philosophical, not a budget shortcut — "much more about
reacting on the fly," explicitly contrasted against games "about memorizing a level and honing a route
through it"; player state was kept to almost nothing on purpose ("the only state I thought was okay was
health"); the campaign is structured as 4 chapters ("discs") of 8 levels each, mirroring the jazz-album
framing. Reviewers across many outlets converge on a level being reshuffled on every attempt while its
broad shape stays recognizable — but that's a qualitative read from repeated play, not a stated design
rule, and nothing anywhere specifies room-graph-vs-tile-carving, a solvability guarantee, or a numeric
difficulty curve. Treat that as a real, checked gap, not a missed search.

### Streets of Rogue — chunks, explicitly modelled on Spelunky

Solo developer Matt Dabrowski (published by tinyBuild, not Cellar Door Games) answered this directly on the
game's own Steam forum, and the quote is worth taking close to verbatim: "Everything you see is a premade
'chunk.' There are three sizes of chunk... I don't actually use any sort of noise. It actually does work a
lot like Spelunky, that was the original example I followed... I designate some chunks as having a
particular number of 'sides'... if a chunk has two open ends, the game looks in my chunk database for an
alley chunk and sticks that into position." So: a grid of premade 1-square, 2-square and 4-square chunks,
typed by open connector count, grown outward from what already exists and matched against a chunk database
to close gaps — the same lineage as Spelunky's generator, but without a single linear critical path, since
Streets of Rogue's blocks are "wide-open" rather than a corridor chain. Whole building interiors are
separately hand-built and scattered onto that street grid under a light per-level duplicate cap —
Dabrowski's own words: "there's not as much rhyme or reason to it as you might think," a useful, honest
contrast against a curve as deliberately authored as Goat Out's `THREAT`/`ENCOUNTER`. No developer statement
on solvability validation was found; progression is grouped into six three-floor themed stages rather than
a continuous per-room curve, and mission objectives are deliberately layout-agnostic — a "steal documents"
mission is solvable by force, stealth, or freeing a building's captives to wreck it so the documents turn up
in the rubble — which sidesteps needing the generator to guarantee any particular room exists for any
particular mission.

### Downwell — confirmed shape, undocumented mechanism

The well is procedurally generated in three-level stages, each with its own enemy roster and environmental
gimmick. Creator Ojiro Fumoto gave a real GDC 2016 talk ("Polishing the Boots") and a longer Fantastic
Arcade 2016 interview that reportedly gets into "text-based random level generation" with code on screen
around the 34–36 minute mark — but neither transcript was recoverable, so the actual chunk mechanism (sizes,
pool size) is a real, named, but unconfirmed lead rather than a documented fact. What is sourced, from
Fumoto's own GDC talk: the generator originally produced tight, enclosed layouts, and he deliberately opened
them up once the core gun-boots mechanic existed — "I changed things up drastically so there was a lot more
space... way less platforms and way more floating enemies. It encouraged more motion from the player in
general" — an explicit case of a generator's *output shape* being redesigned around what one verb needed,
not the other way round. Independent design analysis (not developer-confirmed) adds: new enemy types are
seeded at low density one stage before they become common, new mechanics arrive with new floor ranges, and
the player's landing spot at the start of every level is always guaranteed enemy-free.

### Hotline Miami and Katana Zero — the other pole: no generation at all

Worth stating plainly, since both are named alongside Ape Out as `GENRE_RESEARCH.md`'s reference games for
*feel*: neither uses procedural level generation. Hotline Miami's levels are fixed and hand-placed floor by
floor; the clearest indirect confirmation is structural — the sequel's level editor exposes exactly the same
kind of object the campaign's own levels already are (hand-placed enemies, weapons, furniture), and two
academic papers exist specifically proposing PCG systems *for* Hotline Miami, which is only a publishable
contribution because the shipped game doesn't have one. Katana Zero is the same: Justin Stander has
described building levels "pillar by pillar" around scripted, cinematic beats, with one stand-out level (the
minecart chase) taking over a month of dedicated hand-crafting. Both exist for mastery through repetition of
an exact, memorizable arrangement — the opposite design goal from everything else in this document.

---

## Two camps, and which one Goat Out is in

Every game above sorts into exactly two camps, and it's worth being explicit about it, because
`GENRE_RESEARCH.md` cites Hotline Miami and Ape Out side by side as the genre's two reference points — true
for *feel*, but they sit on opposite sides of a much sharper line for *generation*:

- **Regenerate every run** — Ape Out, Spelunky, Isaac, Gungeon, Dead Cells, Nuclear Throne, Streets of
  Rogue, Downwell, Hades (chamber selection, if not chamber content), Risk of Rain 2 (spawns and loot, if
  not terrain). The level is never memorized because it is never the same twice; replay value comes from
  mastering a *system*, not a *layout*.
- **Fixed, hand-authored, built for mastery** — Hotline Miami, Katana Zero. The level is memorized on
  purpose; replay value comes from executing a known layout faster or cleaner.

Goat Out's whole `js/gen.js` — regenerated on every level, every death, every CONTINUE — puts it
unambiguously in the first camp. So when the list below says "the genre," the load-bearing precedent is
Spelunky/Isaac/Gungeon/Dead Cells/Ape Out's camp, not Hotline Miami's: Hotline Miami is a genre-mate for
combat feel and camera discipline (already covered in `GENRE_RESEARCH.md`), not for how a level comes to
exist.

---

## The laws, pulled together

1. **The generator arranges hand-authored content; it does not author content.** Every game surveyed except
   Nuclear Throne builds levels from hand-built rooms, tiles or chunks recombined algorithmically — nobody
   in this genre generates room *contents* from noise. *(Goat Out's `rooms.js` templates are exactly this —
   `gen.js` chains and dresses them, it doesn't draw them.)*
2. **Solvability is either impossible to violate by construction, or enforced by retrying until it's true —
   never left to chance.** Spelunky forces room type from path direction so an unsolvable join literally
   cannot be produced; Isaac's template contract guarantees every door meets a matching door; Dead Cells
   retries a candidate tile until it satisfies its graph node. Nobody surveyed ships a roll-the-dice-and-hope.
3. **Difficulty is an authored, explicit budget — usually numeric — not an emergent side effect of what got
   placed.** Isaac's per-room/per-floor difficulty ranges, Dead Cells' tile-cost budget, and Risk of Rain
   2's Director credit economy are three independent implementations of the same idea. *(This is precisely
   what Goat Out's `THREAT`/`ENCOUNTER` tables and `planEncounters` already are.)*
4. **A new threat is usually introduced by an unlock threshold, not a dedicated safe room — Hades is the
   one clean exception.** Isaac, Gungeon, Nuclear Throne and Risk of Rain 2 all just gate a new enemy
   behind a stage/floor/loop number and drop it into the normal spawn pool once crossed; nobody isolates
   its *first* appearance spatially except Hades, and even there the isolation happens at the scale of a
   whole biome, not a single room. *(Goat Out's `game.taught` / "met alone" rule — one enemy, alone, the
   first time — is stricter than nearly the entire genre on this specific point, not a convention it's
   merely following.)*
5. **Optional or reward content sits off the critical path, but the genre uses at least four different
   currencies to gate it.** Distance/detour cost (Isaac, Gungeon); player performance — a timer or a
   no-hit streak (Dead Cells); time spent, which feeds the difficulty system directly (Risk of Rain 2); and
   explicit up-front choice with the reward shown before you commit (Hades). *(Goat Out's vault — four
   extra blows, off the route to the stairs, for a soul — is the distance/cost camp; the soul gate is
   closer to Hades' shown-cost-before-you-commit idea.)*
6. **Seeded, reproducible RNG is a genre expectation, not a nice-to-have.** Isaac, Spelunky, Dead Cells and
   Hades all expose seeds, and three of the four built an official daily-challenge mode on top of it.
   *(`js/rng.js`'s mulberry32 already gives Goat Out this for free.)*
7. **Themed areas carry their own template pool and roster, and later areas inherit what earlier ones
   taught.** Isaac's chapters, Dead Cells' biomes, Gungeon's floors, Hades' biomes, Streets of Rogue's
   three-floor stages — universal. Isaac's per-chapter knowledge accumulation is the closest direct
   precedent for Goat Out's own `known` canon pool. *(Goat Out's Canons — STONE, FIRE, THE LINE and so on
   — are this same idea with an actual idea attached to each area, rather than just a tile skin.)*
8. **The macro shape is often not procedural at all — only the population is.** Risk of Rain 2's terrain is
   one fixed hand-built map per stage; Hades' biome order and every chamber's content is fixed; Dead
   Cells' biome-to-biome connections never randomize. "Procedural" in this genre usually means *procedural
   population of a mostly-fixed skeleton*, not *everything randomized*. *(Goat Out's room-template-plus-
   corridor-chaining approach sits further toward the procedural end of this spectrum than half the games
   surveyed — its skeleton, not just its population, is regenerated every time.)*
9. **Pacing is explicitly about peaks and valleys, not a flat climb.** Dead Cells' developer states this
   outright — "dramatic peaks and relaxing breaks" — citing Spelunky, FTL and Left 4 Dead. *(Goat Out's
   milk rhythm — never more than `heal.every` rooms dry — is the same shape as a rule, arrived at
   independently rather than as a stated philosophy.)*
10. **Most of the genre pushes forward; almost none of it asks you to backtrack across a whole level.**
    Spelunky and Ape Out don't allow it at all; Isaac and Gungeon allow backtracking within a floor but
    never across floors. *(Goat Out's corridor-chained, one-way level sits at the tightest end of this,
    alongside Spelunky and Ape Out rather than the room-graph games that allow some doubling back.)*
11. **A generator that's actually well-documented by its own creators is the exception, not the rule.** Of
    the twelve games researched, only Spelunky, Isaac, Gungeon and Dead Cells have a genuinely traceable,
    developer-confirmed algorithm; Ape Out and Downwell — arguably the two closest to Goat Out in scale and
    ambition — have essentially none, despite real talks existing under real titles. Almost nobody in this
    genre has actually explained their own generator well; that gap is itself worth knowing about.

---

## Sources

- [Spelunky Generator Lessons — Darius Kazemi (interactive breakdown of Derek Yu's algorithm)](http://tinysubversions.com/spelunkyGen/)
- [The understated genius of the Spelunky Daily Challenge — Game Developer](https://www.gamedeveloper.com/design/the-understated-genius-of-the-i-spelunky-i-daily-challenge)
- [Spelunky 2's first area might get patched so it's easier — PC Gamer](https://www.pcgamer.com/spelunky-2s-first-area-might-get-patched-so-its-easier/)
- [Spelunky, indie life, and finding success with Derek Yu — GDC Podcast ep. 22](https://gdconf.com/article/spelunky-indie-life-and-finding-success-with-derek-yu-gdc-podcast-ep-22/)
- [How Spelunky got its procedural "hook" & actually got finished — GameDiscover](https://newsletter.gamediscover.co/p/how-spelunky-got-its-procedural-hook)
- [*Spelunky* — Derek Yu, Boss Fight Books #11 (2016)](https://bossfightbooks.com/products/spelunky-by-derek-yu)
- [Dungeon Generation in Binding of Isaac — BorisTheBrave.com](https://www.boristhebrave.com/2020/09/12/dungeon-generation-in-binding-of-isaac/)
- [Level Generation — Binding of Isaac: Rebirth Wiki](https://bindingofisaacrebirth.wiki.gg/wiki/Level_Generation)
- [Daily Challenges — Binding of Isaac Fandom](https://bindingofisaacrebirth.fandom.com/wiki/Daily_Challenges)
- [Curse of the Labyrinth — IsaacGuru](https://isaacguru.com/wiki/isaac_repentance/crs2)
- [Dungeon Generation in Enter The Gungeon — BorisTheBrave.com](https://www.boristhebrave.com/2019/07/28/dungeon-generation-in-enter-the-gungeon/)
- [Q&A: The guns and dungeons of Enter the Gungeon — Game Developer](https://www.gamedeveloper.com/design/q-a-the-guns-and-dungeons-of-i-enter-the-gungeon-i-)
- [Studying Dungeon Generation in Enter The Gungeon — 80.lv](https://80.lv/articles/studying-dungeon-generation-in-enter-the-gungeon)
- [Resourceful Rat's Lair — Gungeon Wiki](https://enterthegungeon.wiki.gg/wiki/Resourceful_Rat's_Lair)
- [The Level Design of Dead Cells: A Hybrid Approach — Deepnight Games (Sébastien Benard)](https://deepnight.net/tutorial/the-level-design-of-dead-cells-a-hybrid-approach/)
- ['Dead Cells': What the F*n!? — GDC Vault](https://www.gdcvault.com/play/1025788/-Dead-Cells-What-the)
- [Daily Challenge — Dead Cells Wiki](https://deadcells.fandom.com/wiki/Daily_Challenge)
- [Random level generation in Nuclear Throne — indienova (citing the archived Vlambeer dev blog)](https://indienova.com/u/root/blogread/1766)
- [DanielBV/Nuclear-Throne-Map-Generator — GitHub reimplementation](https://github.com/DanielBV/Nuclear-Throne-Map-Generator)
- [Areas — Nuclear Throne Wiki](https://nuclear-throne.fandom.com/wiki/Areas)
- [Directors — Risk of Rain 2 Wiki](https://riskofrain2.wiki.gg/wiki/Directors)
- [How moving from 2D to 3D shaped the design of Risk of Rain 2 — Game Developer](https://www.gamedeveloper.com/design/how-moving-from-2d-to-3d-shaped-the-design-of-i-risk-of-rain-2-i-)
- [Why Risk of Rain Returns is taking the series back to 2D — Game Developer](https://www.gamedeveloper.com/design/risk-of-rain-interview)
- [2014 Finalists & Winners — Independent Games Festival](https://igf.com/archive-2014/)
- [Hades' Level Design Is Less Random Than It Seems — Kotaku](https://kotaku.com/hades-level-design-is-less-random-than-it-seems-1845254545)
- [Hand-Crafted Variance: Designing Hades' Underworld — Ed Gorinstein, Konsoll 2021](https://konsoll.org/talks/hand-crafted-variance-designing-hades-underworld/)
- [Chambers and Encounters — Hades Wiki](https://hades.fandom.com/wiki/Chambers_and_Encounters)
- [Roguelikes and narrative design with Hades creative director Greg Kasavin — GDC Podcast](https://gdconf.com/article/roguelikes-and-narrative-design-with-hades-creative-director-greg-kasavin-gdc-podcast-ep-16/)
- [Ape Out creator Gabe Cuzzillo: "I'm just out here trying to make games and not get a real job" — PC Games Insider](https://www.pcgamesinsider.biz/indie-interview/68706/ape-out-creator-gabe-cuzzilo-im-just-out-here-trying-to-make-games-and-not-get-a-real-job/)
- [Devolver Digital, on Gabe Cuzzillo's GDC "Vibe-First Design" postmortem](https://x.com/devolverdigital/status/1218994177754783749)
- [Ape Out — Wikipedia](https://en.wikipedia.org/wiki/Ape_Out)
- [When We Made... Ape Out — MCV/DEVELOP](https://mcvuk.com/development-news/when-we-made-ape-out/)
- [Road to the Student IGF: Gabe Cuzzillo's Ape Out — Game Developer](https://www.gamedeveloper.com/design/road-to-the-student-igf-gabe-cuzzillo-s-i-ape-out-i-)
- [The Circle Interview: Gabe Cuzzillo on Ape Out's 5 years of development — NY Game Critics](https://nygamecritics.com/2019/04/16/the-circle-interview-creator-gabe-cuzzillo-on-how-ape-out-changed-during-5-years-of-development/)
- [Question to the Dev — City Generation — Streets of Rogue Steam Community (Matt Dabrowski)](https://steamcommunity.com/app/512900/discussions/0/135511379836828224/)
- [A Conversation With "Streets of Rogue" Developer Matt Dabrowski — SXU Student Media](https://sxustudentmedia.com/a-conversation-with-streets-of-rogue-developer-matt-dabrowski/)
- [Streets of Rogue — Wikipedia](https://en.wikipedia.org/wiki/Streets_of_Rogue)
- [Downwell — Wikipedia](https://en.wikipedia.org/wiki/Downwell)
- [Polishing the Boots — Designing "Downwell" Around One Key Mechanic — GDC 2016 (Ojiro Fumoto)](https://gdcvault.com/play/1023533/Polishing-the-Boots-Designing-Downwell)
- [Fantastic Arcade 2016: DOWNWELL & NIUM Creator Moppin — Juegos Rancheros](https://www.youtube.com/watch?v=iAJ-tyiUVag)
- [How Hotline Miami Changed Indie Gaming: 10th Anniversary Interview — GameMaker.io](https://gamemaker.io/en/blog/hotline-miami-interview)
- [Procedural Content Generation of Level Layouts for Hotline Miami — Brown & Lutfullin, *Computers*](https://www.researchgate.net/publication/319351318_Procedural_Content_Generation_of_Level_Layouts_for_Hotline_Miami)
- [Levels for Hotline Miami 2: Wrong Number Using Procedural Content Generation — Brown & Lutfullin](https://www.researchgate.net/publication/324208835_Levels_for_Hotline_Miami_2_Wrong_Number_Using_Procedural_Content_Generations)
- [Indie Interview - Katana ZERO — TechRaptor](https://techraptor.net/gaming/interview/indie-interview-katana-zero)
- [Katana Zero developer describes how he made a tight, punishing action game — GameRevolution](https://www.gamerevolution.com/originals/520685-katana-zero-interview)
- [Katana Zero: Game developer Justin Stander interview — Red Bull](https://www.redbull.com/us-en/katana-zero-developer-justin-stander-interview)
