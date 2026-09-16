# BACKLOG — asked for, not built

`CONCEPT.md` is what the game is. This file is what the last person to play it said afterwards, kept in
his order and written out far enough that a session can take any line off it and build the thing without
asking him again. Nothing here is in the build. An item leaves this file when it ships — the reasoning
then goes to `CHANGELOG.md` — or when it is decided against, and the reason goes in its place.

Batches are dated. Tags: **bug**, something is wrong; **feel**, it works and does not read; **number**,
it works and the number is wrong; **system**, it does not exist yet.

## 16 September 2026, later still — six screenshots, sent in small bursts

All of it shipped same sitting, once the first pass at two of these turned out to be a real look
rather than a full build; the reasoning behind each is in `CHANGELOG.md` under 1.27.

- ~~**The ambush room's floor text is too long to read at a glance.**~~ **feel.** `RIGHT CLICK,
  GRAB OBJECT` / `RELEASE OR LEFT CLICK, THROW` cut to `RIGHT CLICK - GRAB` / `RELEASE - THROW`
  (and the touch line to match, `RELEASE, THROW`): drop the redundant "OBJECT" and the second way
  to let go, which the ambush room does not need to teach at once.
- ~~**The skill-rail captions (LMB/RMB/E/SPC) sit flush under their icons, crowding `N SACRIFICED`
  right under them.**~~ **feel.** Both nudged down 4px worth (`drawSkills` in `render.js`).
- ~~**The Mill lesson's nearer bearer sees the goat and takes the wheel too fast to read as cause
  and effect.**~~ **feel.** `Enemy.noticeFor`, set only on the room's own two men: a beat to plant
  and face the goat before either one moves, so the one about to take the wheel in the chest reads
  as the room deciding rather than a coin flip landed before the door was even open.
- ~~**That same room, three tiles shorter, height fixed rather than left to the row count.**~~
  **number.** `MILL_LESSON_TEMPLATE` in `rooms.js` cut from ten rows to seven. Checked against
  `mill.armLen` rather than by eye first: the hub now sits one row off the top wall (inside the
  arm's own reach, so it hits that wall outright) with three rows below it, of which only the
  last sits outside that reach — exactly the one lane of clear floor the room was always meant to
  leave. `node tools/balance.js` and the generator sweep both hold across every level and seed.
- ~~**A patrolling man can end up facing a wall for no reason.**~~ **feel.** `idleWander` now
  resamples a chosen facing up to five times against a look-ahead probe (`TUNING.ai.wanderClear`)
  before committing to it, the same kind of check `avoidHazard`'s own `walkable()` already does.
- ~~**The bomb explosion is too big and too slow on screen; it hides the fight behind it.**~~
  **feel.** The real blast radius (what it flings and damages) is untouched; `TUNING.goat.bomb`
  grew a separate `fxScale` and `fxLife` that only shrink and shorten the burst graphic itself.
- ~~**A goat-head cursor.**~~ **system.** Asked before (ninth sitting, 15 Sep 2026) and parked as
  an art-pipeline item; an inline SVG wrapping the 🐐 emoji turned out to need no art pipeline at
  all — `CURSOR_GOAT` in `game.js`, `encodeURIComponent`-built rather than hand-escaped.
- ~~**The spike-grate band is hard to read where it runs into the unlit part of a room.**~~
  **feel.** The grate's metal rail and slot highlight are a shade brighter now, so a band still
  reads as iron rather than floor shadow under the fog's own shading pass.
- ~~**Bomb Charge should cost a real hit, not skip the two-hit rule.**~~ **number/system.**
  `die()`'s absorb no longer excludes `'boom'`: a multi-hit target takes one off and goes down
  floored on a first charge, and only a second charge (or any other blow) landed while he is
  already at his last heart actually finishes him. `CLAUDE.md`'s "Two hits" note updated with it —
  this was a documented rule changed on purpose, not a bug quietly patched.
- **feel — patrolling (not yet aware) men should never die to a trap they are only walking past.**
  Confirmed already true rather than changed: `avoidHazard` in `enemies.js` only ever rolls the
  trap-blunder chance `if (this.aware && ...)` — an idle patrol steers clear of a hazard every
  time, on purpose. If this comes back, ask which room: it is probably the Mill lesson's own
  scripted `trapSense: 0`, not a hole in ordinary patrol behaviour.
- ~~**Freeze whatever is at least a room away from the goat.**~~ **system.** The enemy update loop
  now skips anyone whose home room is two or more rooms off by index from wherever the goat is
  standing — never the room he is in or its immediate neighbour, which stays wider than any noise
  radius in the game, so "a man still hears you through stone" is never something this quietly
  breaks. See the new note on it in `CLAUDE.md`, right after the patrol leash.

## 16 September 2026, night — one screenshot and a second pass at the deck

A screenshot of the live 1.26 build with three things marked on it, plus a chunk of talking
through the boon system again. The three marked bugs are fixed same sitting (reasoning in
`CHANGELOG.md` and `ART_HANDOFF.md` under 1.26); everything else here is unbuilt.

- ~~**bug — a dying butcher/elite bearer tore into plain clubman gore.**~~ `CombatFX.snapshot`
  kept its own kind map instead of `PaintedArt.characterKey`; one map now.
- ~~**feel — the near wall of a room read as bare rock, no bricks.**~~ Its face-shade overlay
  (0.27) was crushing its own coursing next to the far wall's (0) — down to 0.1.
- ~~**feel — a hunter's aim tell had gone dark.**~~ It only ever lived inside the primitive
  fallback body; once his painted sprite took over it silently stopped drawing. Its own method
  now, called for either body.
- **feel — the far side of a wall did not read as "pulled" for the tilt.** Open. `wallTile`'s four
  faces are geometrically symmetric, so this is a different complaint from the one above and not
  fixed by the shade change — see the note in `ART_HANDOFF.md` for where to look next (`lip`, or a
  second wall row through a corridor mouth) once it has been played against the fix that did ship.
- **system — a rare pickable bomb, mostly found in secrets.** One to two a level, an item like a
  crate or a weapon (grab, carry, thrown by the same button that throws anything else). Explodes
  in a 4×4 area; the goat takes damage from his own blast too if he is in it. Two hearts at the
  centre, tapering to one at the outer edge of the area — a radius-scored hit rather than a flat
  cost, the same shape `flungHits`' two speed thresholds already use for a body. Rare enough that
  it reads as a find, not a tool: the number to hold it to is per-level count, not per-room chance.
- **feel — return the hunter's shot to being readable before it lands, further than the tell
  above.** Distinct from the aim-tell bug: that one is about the tell existing at all; this is
  about how far ahead of the shot it gives you, and was asked for as "how it read in a build
  before this one" rather than as a fresh idea. Needs which build, or a description of what read
  better about it — realism is explicitly not the ask ("we'll work on realism later").

### system — the deck at 36, restated with new candidates

This is the already-parked **"the deck at 36, dealt in turns"** further down this file (16 Sep,
daytime sitting): two actives a verb (three eventually), two passives a verb (three eventually),
eight general passives, dealt active/passive/active/passive until every verb has one, then one
active-as-replacement plus two passives. Two pieces of that plan were re-described tonight,
word for word, without having been shown the file — worth treating as confirmation rather than
as a new ask: the replacement card names what it gives up (`replaces`, "instead of DRAGON
BREATH" on the card itself, not just a rail icon changing after the fact), and once every verb is
full the deal shifts to one active plus two passives instead of the usual alternation.

New tonight, to fold into the same system rather than build alongside it:

- **A card can be refused.** A fourth option under the three — RELEASE THE SOUL, or similar — that
  spends nothing and takes nothing. `openBoonChoice` has no such exit today; a soul taken is a
  card taken.
- **Three candidate passives**, as concrete examples for the twelve-general-passives count: a
  three-second bubble of invulnerability after taking a hit (distinct from `goat.invuln`'s
  half-second flinch, above); holding an object or a man slows time for two seconds so a throw can
  actually be aimed (reads as the grab-and-throw verb's own passive, not a general one); grass
  heals two hearts instead of one but the run's own max is one heart lower (a trade, not a
  straight upgrade — the kind of passive that argues with itself, which the file's shop item
  section already flags as the interesting kind).
- **Two candidate actives:** the roll becomes a pounce — jump onto the man in front of you and
  land behind him — at double the cooldown; and a headbutt active that throws the struck man's
  own knock-on into whoever is standing behind him, so one blow can end two men in a line. That
  second one is offered with a flag on it, not a decision: the headbutt is pillar 3 in `CLAUDE.md`
  by itself, so what an "active" version of it should mean was asked as an open question rather
  than settled — a headbutt with more teeth risks arguing with "a headbutt only ever knocks a man
  down; walls kill."
- **A `synergy` / `addition` mark on a boon, visible in the dev tool wherever the list of them is
  read.** `addition`: this boon makes another one modestly better in passing. `synergy`: this boon
  is built to be read together with a named other one. Nothing today lists `BOONS` anywhere in the
  dev drawer for a mark like this to attach to — closest is the skill rail's own hover note, which
  is player-facing and per-card, not a design-time table. Wants a page or a tab before it wants
  the mark itself.

## 16 September 2026, evening — a design sitting, not a playtest

No screenshots this time: an hour of talking about why the game has no pressure in it, why a
run is over in an hour and a half, and what an act two and a secret ending would have to be.
Nothing below is built, and most of it is **parked on purpose** (marked *parked* in its title):
the same evening he decided the next stretch is level generation, enemy balance and getting
more people to play, and that lives, the hunt, hell, heaven and hearts-by-level are things to
think about, not to build, until the playtests say what is actually missing. What is live off
this batch is the two cheap and telling ones: the invulnerability number and the power column
in the balance tool. Also settles one of the open questions in `CLAUDE.md`: *one life* is
meant to mean one life per **run**, with hearts staying the budget of a level.

The diagnosis, so the items below make sense together: the game has three separate problems
that felt like one. **Pressure** lives only in the score, and the clock is hidden on purpose, so
nobody feels it. **Length** in the regeneration camp is run length times runs-to-win, and
runs-to-win is currently one because a level restarts for free. **Power** by level five feels
too high, but nothing measures it: `tools/balance.js` knows threat and ground and has no idea
what the goat is carrying by then.

### number — a hit should buy more than half a second

`TUNING.goat.invuln` is 0.5 s. Three men take four hearts in two seconds, so a death reads as one
bad moment rather than four decisions. Spelunky and Isaac give about a second and knock the
player back. Try 0.8 to 1.0 before touching the heart count at all.

How to know which number is wrong: count in the dev drawer the deaths where the last two hearts
went inside 1.5 s ("burst deaths") against the ones that bled out a heart at a time across rooms.
Mostly bursts: the invulnerability is the lever. Mostly attrition: hearts are.

### number — hearts that grow with the run, by level and not by card — *parked, 16 Sep 2026*

Four hearts is the genre's number (Spelunky four, Isaac three, Ape Out two or three) and they are
already the budget of a **level**: `startLevel` fills them. Growing to six or seven by the end is
right, but THICK HIDE is one card in sixteen against thirteen souls, so today it is a lottery.
Put it where the threat curve is: a `hearts` field on each `LEVELS` entry (4 on levels one and
two, 5 on three and four, 6 from five), read by `applyBoons` under `mods.maxHp` the way `EASY`
is, with the new heart arriving full as THICK HIDE's does. THICK HIDE on top makes seven, EASY
MODE still adds two. `drawUI` has to fit nine hearts on the band without shrinking the rail.
Hell (below) takes them back to four, which is the "reset for your crimes" in numbers.

### tool — a third column in the balance: what the goat is by then

The curve that has to hold is threat over power, and only the numerator is measured. Give every
boon in `BOONS` a rough `power` weight (and hearts a weight per heart), compute the expected
loadout at the head of each level from the souls dealt before it (the same sum `startAtLevel`
already uses), and print threat, power and the ratio per level in `tools/balance.js` and on the
BALANCE tab. Add a `GEN_RULES`-style averaged check that the ratio never falls from one level to
the next. Until this exists "overpowered by level five" is a feeling and cannot be tuned.

### system — one life per run — *parked, 16 Sep 2026*

Three lives on the run (`TUNING.run.lives`, and in `saveRun`). Losing one restarts the level
exactly as a death does now, boons kept. Losing the last one ends the run: back to the title,
board updated, save cleared. Hearts stay per-level and refill on the stairs, so "four hearts gone
in one room" still costs a level and not the run; what the run pays is that it can only happen
three times. Show the count on the level card and next to the hearts, not as a number in the
corner. LEVELS on the title (`startAtLevel`) starts with full lives. If hell ships, entering it
writes a save and refills lives: dying in hell restarts hell, never the compound.

Why this and not a run timer: a twenty-minute clock on the run argues with grazing (standing
still), the vault (a detour), the secret wall (two blows on a hunch) and the soul cards (a
pause); and a death late in a timed run is a certain loss, which sends the player to the menu
instead of the retry. Lives make death cost more without touching any of that.

### system — the hunt: pressure from behind, once a level runs past par — *parked, 16 Sep 2026*

The generalisation of the closing door. Par is `rooms * score.perRoom`; once the level has run
`TUNING.hunt.after` times par (try 1.5), the compound wakes: every `hunt.every` seconds a man
walks in from the level's own entry and comes down the flow field to the goat, the kind drawn
off the level's own curve, count uncapped. Not a death, a rising cost of standing still, and it
is read in the world rather than in the corner: the drums are already tied to the count of men
awake and near (`TUNING.audio.crowd`), so the music says it; one bark once a run says it in
words (`game.huntTold`, "HE IS IN THE EAST WING" or the like, in `BARKS`). Off on level one
like the clock doors; off during the cards and the climb. Fighting still pays kills and still
costs time, and time now costs men, who die on the same walls, so run-or-fight stays a choice
with a price on each side. A `GEN_RULES` line cannot check a timer, but `balance.js` can print
the par it will run against per level so a level whose par is wrong is caught there.

### system — act two, hell: a second run inside the run — *parked, 16 Sep 2026*

Longer levels, more souls, harder men, more hazards, and the boons taken back. This works only
as a **second curve with a second deck**, not as the compound's curve continued: a goat with no
souls put on the fifth level's threat is the "much worse game" `CLAUDE.md` already names.

- `act` on each `LEVELS` entry. `met` and `known` reset at the act boundary so hell's own new
  kinds get their intro rooms; the two teaching rooms of level one are **not** repeated (he
  knows men can be hit). Threat starts near level one's and rises again; the "harder than the
  last" rule and the power ratio are checked **within** an act, and `balance.js` prints two
  curves.
- The deck is different or the build is the same twice with a longer walk to it. Base goat in
  hell is not the pen goat either: the two half-shut buttons are tutorial, and re-teaching them
  is dead time. Open: what is withheld instead. One candidate: hell's deck bends the **world**
  rather than the goat (walls kill at a lower speed, fire passes further, bodies fly differently),
  so Power in act two reads as "the room is worse for them" and not "I am stronger". The other
  half of the answer is that hell should be built from the things the compound's boons do not
  answer, and the precedents exist: witchfire ignores `fireImmune`, mist cannot be grabbed, the
  arm goes over a shield. Wraiths, seers, drops, witchfire are the pool.
- Hearts back to four at the boundary (see the hearts item), lives refilled, a save written at
  the door: death in hell restarts hell.
- Cost, honestly: every level needs a canon and `CANON.minRooms` templates. Three levels with
  three ideas beat five with the same floor twice.
- How it is entered is open. Two candidates: in order, after the seventh stairs (his current
  read: you are sent down for what you did); or earned, Spelunky-style, by carrying something
  through the run, and the vault is the ready-made hook: a soul behind four blows off the way to
  the stairs on every level, currently worth nothing but the soul. Earned scales the length of
  the game with skill and makes the vault matter.

### system — heaven, the secret: a run that swallowed no soul — *parked, 16 Sep 2026*

Beat all seven levels without taking a single soul and go up instead of down. Nothing to teach,
readable from the world, and the one run where *run, don't fight* is literal. Pillar 6 is
safe: the condition is about what you did, not where anything stood.

It is **impossible today by construction**: the level-one soul gate (`levelDef.soulGate`) opens
only from the soul pickup, and the pickup is the swallow. The fix that stays inside the five
buttons: a soul on the floor is also `item`, so grab picks it up like a crate and either button
throws it, and the gate accepts one **thrown at it**. Given to the door, not eaten. It is also
the first place a player learns a soul can be refused, so the secret has a door into it that is
not a wiki. Check that no arena forces the pickup on contact (they lie on the floor, so it is
enough not to step on them) and that the vault is skippable, which it is. Keep the gate's
wording so the first player still eats the first soul: this is a hard mode and a trap for a
newcomer. What heaven is once reached is unwritten and is not this item.

---

### system — the deck at 36, dealt in turns — *parked, 16 Sep 2026*

Thirteen souls against seventeen cards is three quarters of the deck every run, so two runs are
one build in a different order. The shape he wants: every verb a **slot with three mutually
exclusive actives** (FULL THROAT against DRAGON BREATH is the pattern, already in the game),
three passives per verb that only mean something with that verb's active on, and six to eight
general passives (twelve was the ask; passives are what stacks, and stacking is where level five
gets overpowered). Dealing alternates, **active, passive, active, passive**, so a triple is always
one kind and the choice is inside it; the first soul of a run is an active and opens one of the
two half-shut buttons, which retires the 0.75 weight in `openBoonChoice`. An active triple is
one variant for each of three *empty* verbs while there are three; once all four are filled
every deal is **one active as a replacement plus two passives**, the replacement card saying
what it gives up (`replaces`) and not paying its `heal` again. Passives deal only onto verbs
whose active is on, which is one rule in place of the three `needs`. Parity is the length of
`game.boons`, so the save needs nothing new. An active is only an active if the icon and the
note change and pillars 3 and 4 hold; write the twelve as one line each and cut what fails
before counting. Twelve actives first (six exist), then play, then passives.

### system — the shop: a mouse, a rat ogre, souls of the killed, a talisman — *parked, 16 Sep 2026*

Items, bought with **souls of the killed** (`game.kills`, the count already on the HUD; this is
the 14 Sep "souls resource" with an answer to what they buy). Two currencies, two counters, no
competition with the cards. What an item is: a **rule of the world** bent, not a number behind
a button. His examples: a fire amulet (a lit man lights the one he touches; note this is
KINDLING, already a card, so the split is: cards are about the goat, items about the compound,
and KINDLING and THE ORACLE move across). A clover (better odds of a secret, a rack or grass in
the next room; goes through `mods` into `generateLevel` like `taught`, and `balance.js` runs
the rules with and without it).

- **The mouse** lives in a two-tile hole in a room's wall (`carveSecret` already cuts these),
  one a level from some level on, never in a teaching room, a sealed arena or the wheel's room;
  a `GEN_RULES` line. Grab is buy; if the count is short she shows how short. Headbutt her once
  and she asks you not to (`say`, once); twice and she is a **rat ogre**: `hp` two or three,
  `elite`/`boss`, its own `kind`, killed by walls like anybody, first met alone through
  `taught`. He comes out into the room because the hole cannot hold him. Kill him and the
  stock is free (the Spelunky deal, honest only if the fight is dear). He drops no corrupted
  soul, or he is the best boss in the game. He is **not on the curve**: the mouse is optional,
  so `THREAT` and the report ignore her.
- **Slots by act:** one in the compound, two in hell. With one slot a late item costs the early
  one; buying onto a full slot puts the old item back on the mouse's shelf, and the ogre drops
  that too.
- **Tiers, three at most, and a tier is how far the rule bends, not a bigger number.** Which
  tier a mouse stocks is `minLevel` on the item, like a card. Price comes off the curve rather
  than a table: a fraction of the men in the mouse's own level (a third for tier one, a level
  and a half for tier three), one number a tier in `TUNING.shop`.
- **Death takes the level's kills back** or dying is a farm: the men stand up again on the
  regenerated level. `totalKills` is already written at the head of a level.
- **The item is drawn on the goat**, a talisman between the horns (act two: neck and head, two
  drawings), each tier its own drawing; the same law as `skillIcon`. A layer over every walk
  frame, so a line in `ART_HANDOFF.md` when it comes.
- Heaven stays about corrupted souls: killing is allowed, swallowing is not.

Why the shop and not items on the floor: the depth is in the decision in front of the item
(pay, or hit and fight), and in spend-early-or-save, not in the item itself.

---

## 16 September 2026 — the tenth sitting

Twenty lines, sent one and two at a time rather than in a single note, with screenshots on most
of them. Nineteen shipped in 1.25 and one is open; the reasoning behind each shipped line is in
`CHANGELOG.md`.

- ~~**WASD — TO MOVE showed before the cage broke.**~~ **bug.** It now waits on `game.cageOpen`
  and takes over the exact spot the headbutt prompt was painting.
- ~~**An idle man wandered into the next room and picked a fight he wasn't placed for.**~~ **bug.**
  `Enemy.home` plus a leash on `idleWander` — see the new note in `CLAUDE.md`.
- ~~**Wall tiles: flip the brick to face into the room.**~~ **feel.** Left and right walls mirror
  the same stamp across their own centre now.
- ~~**The bottom of that same wall crop wasn't bricked.**~~ Turned out to be the secret wall's own
  mismatched art, not an ordinary wall — see the next line.
- ~~**The crack reads as being in the floor, not the wall.**~~ **bug.** Same cause: the secret
  prop drew a different, flatter stone-block texture tinted to the room's colour instead of the
  room's actual brick stamp. It draws the real one now.
- ~~**Patrolling guards should stay in their own room until they've noticed you.**~~ **system.**
  The same leash as the idle-wander bug above; one fix covers both complaints.
- ~~**Delete the BAAH line from the ambush room's floor text.**~~ Two lines now, not three.
- ~~**Weapons should only come into his mouth on a deliberate right-click, not by walking over
  them.**~~ **system.** The auto-sweep pickup is gone; a rack now takes the identical press-and-
  reach a crate already used.
- ~~**Hard rule: no em dashes anywhere a player (or the dev tool) can read text.**~~ Swept every
  string literal in the game, not the prose comments around them.
- ~~**A crate thrown into a brazier should catch fire too, not just break.**~~ **bug.** It bursts
  now, the same as one landing on ground already alight.
- **The room with the brazier should be shorter still.** Open. Nothing in the level's own rooms is
  named after a brazier specifically, and the screenshot's own room (the wheel, going by what was
  in it) didn't point at an obvious height to cut that the Mill's own lesson room doesn't already
  enforce (`MILL_LESSON_TEMPLATE` is already the narrow one-lane room the wheel's arm needs). Needs
  which room, by name or by what's standing in it, rather than a guess against one screenshot.
- ~~**In the ambush room, rack two swords together near the door and keep the far men from
  walking toward the player while on patrol.**~~ Both: `AMBUSH_TEMPLATE` racks two now, and the
  patrol leash keeps them at the far end until the goat is actually seen or heard.
- ~~**Same thing in the first trap room: let them wait at the far end.**~~ Same leash fix.
- ~~**The lesson room's far wall is a walk away rather than a step — a headbutt doesn't reliably
  kill the first man.**~~ **number.** Ten tiles of width cut to nine. **Watch on the next play:**
  a headbutt thrown dead straight down the room's own exit corridor still doesn't kill — nothing
  stands in that direction for a body to hit, since the corridor is the only way through and has
  to stay open. Approaching from anywhere off that exact line lands the kill; a player rarely
  walks it dead straight (the room's own entrance sits a tile off that line already), but a seed
  where it lines up more than that is worth a second look before calling this fully closed.
- ~~**A burning man lighting the next one should be a soul, not something every run already
  has.**~~ **system.** Shipped as KINDLING; `passFire` now returns at once without it.
- ~~**The painted figures float visibly clear of their own shadows.**~~ **bug.** Measured the
  actual foot position in each sprite sheet rather than guessing; two different anchors for the
  walk-cycle art and the newer static "Facing" art, and a leftover manual nudge removed.
- ~~**A touch less camera shake on an explosion.**~~ BOMB CHARGE's `explode()` 13 → 9.
- ~~**Remove the acquired-boons list under SACRIFICED.**~~ A chip's own hover note already says
  the same thing.
- ~~**Delete "THE SOUL OFFERS A BLESSING" / "Choose one. It dies with you." from the boon-choice
  screen.**~~ The cards say what they do without a caption over them.
- ~~**The boon cards should show something when the pointer is actually over one.**~~ A bright
  ring outside the card's own border, plus a slightly lighter fill, on whichever of the three the
  pointer is on.

---

## 15 September 2026, later — the ninth sitting

Twenty-seven lines in one long voice note. Most of it shipped; a handful were already true and are
noted rather than touched, and four are open.

- ~~**Shield down to two before it snaps, and it should ring off a wall or a man rather than just
  stopping.**~~ `uses.shield` 3→2, and a wall bounce keeps 60% of its speed instead of losing 70%.
- ~~**Melee reach on the cult, down a fifth.**~~ Bearer, hound, Butcher and wraith together — a club
  or a bite landing from most of a body-length off read as the wall behind him not mattering.
- ~~**A weapon on its stand should be the same size as one in his mouth.**~~ It drew bigger racked
  than anywhere else it is ever seen; one size now.
- ~~**Throw distance, down a fifth.**~~ `throwImpulse` 34 → 27.2 tiles' worth.
- **A rifle should be able to kill his own man.** Already true — `Bullet.update` hits whoever it
  reaches first, ally or not, and says FRIENDLY FIRE when it does. Nothing changed here.
- ~~**Coop in one blow, and the hen goes in the mouth like a crate too.**~~ Grab-then-throw now runs
  through the same kick-and-seek she already had off a headbutt, rather than a straight throw.
- **The Butcher should not be liftable.** Already true — `tryGrab` excludes him by kind, the same as
  the hound and the wraith. Nothing changed here.
- ~~**Delete the floor line on THE THRESHING FLOOR.**~~ `hint: null`.
- **THE THRESHING FLOOR reads too sparse at this density; make it smaller, or only for the
  run-through rooms.** Open. The level's own note already says the wide corridors are load-bearing
  (`corridorW: 5`, "reads as one yard"), so the fix is a number on `encounters.from`/`to` or the room
  count rather than a line of code, and it wants a second playtest before either is touched.
- ~~**A different cursor: headbutt by default, something else once he is carrying something.**~~
  `crosshair` / `grabbing` — the OS cursor rather than a drawn one. A custom goat-head cursor is an
  art asset, not code, and belongs with the next `ART_HANDOFF.md` pass.
- **"What is this — delete the bird."** Not reproduced. Nothing in the hen's own code path draws a
  `?` or any other stray mark over her; that belongs to `investigate` state on an `Enemy`, which she
  is not. Needs the screenshot again, or which build it was on.
- ~~**Build number under the seed.**~~ `BUILD` in `tuning.js`, bumped by hand alongside a CHANGELOG
  entry from here on.
- ~~**Scream stun radius, down a fifth.**~~ `goat.scream.radius` 8.5 → 6.8 tiles.
- ~~**Strange spikes near the Mill — remove them.**~~ The per-room grate scatter could land in the
  Mill's own room (and the arena, the Hall, the Gallery, the killbox), stacking one hazard system on
  top of another that was already built narrow on purpose. Excluded now.
- ~~**Idle men should shift around the room a little, if they are not scripted.**~~ `idleWander` only
  ever turned on the spot; about half of every wander beat is now a few slow steps.
- **A spinner drawn over the traps.** Not reproduced — the screenshot didn't say which overlay it
  was. Needs a name for the element (the trap-sense mark, a hazard's bark bubble, something else) or
  the screenshot again.
- ~~**Traps sometimes in front of the soul door.**~~ On a level that already has spikes, half the
  time the last stretch of floor before the vault's own door grows them too.
- ~~**A big room like THE THRESHING FLOOR's should get an iron door right on its own exit.**~~
  `BIG_ROOM`: 20-plus tiles of width forces the roll, so running a wide room the length of it is no
  longer free.
- **Enemies react to noise, especially a fight or an explosion, and walking should be quieter than
  fighting.** Already true — `TUNING.noise` gives every event its own radius (`footstep` 2, `headbutt`
  5, `boom` 16, and so on) and every man checks `world.noises` for one in range. Nothing changed here;
  see the new HEARING toggle below if it needs to be seen rather than taken on faith.
- ~~**A dev-tool toggle for a man's sight cone, and one for what the goat's own noise reaches.**~~
  VISION and HEARING, next to GOD in the drawer — a cone per man, two rings on the goat for a
  footstep and a fight.
- ~~**"Too quick" for a hound shouldn't repeat a thousand times.**~~ It fired every single frame the
  button was held down; gated to once every 0.8s.
- **Enemies should go round pits even while retreating — a mage blinking included.** Already true for
  ordinary movement and for a blink's own landing spot (`hazardAt`/`isPitPx` both refuse one). Nothing
  changed here.
- **A level's hint should say what new hazard is on this floor.** Partly open. THE RAFTERS already
  does this for the drop (*"THE FLOOR ENDS. THEY FALL FURTHER THAN YOU."*); THE ROAD, where the grate
  first appears, did not — it does now: *"...WATCH YOUR STEP."* Level one's Mill and pen are taught
  in-room rather than on the floor and were left alone.
- ~~**Minimal camera shake and slowdown on a multi-kill — it breaks the pace right now.**~~
  `comboSlow` 0.26 → 0.12s, and the extra hitstop a streak buys came down by more than half.
- ~~**A mage should never blink into a room you have already cleared, if the fight is in the next
  one.**~~ `blink` used to only mind a sealed room's own walls; it now keeps every blink inside
  whichever room the goat is currently standing in.
- **I'm in the first room and something says a kill has already happened.** Not reproduced.
  `game.kills` resets to 0 at the top of every `startLevel`, and the intro's scripted men are removed
  rather than killed, so nothing touches it before the first real blow. Needs the number that was
  actually on screen, or whether LEVELS (which deals a run's boons up front) was how the level was
  reached.
- ~~**Wraiths close a third faster, and drift toward you during the windup rather than standing
  still.**~~ `wraith.speed` ×1.3; the windup now pulls a little toward wherever the goat actually is.

---

## 15 September 2026 — the eighth sitting

Twenty lines against 1.20, sent in five bursts with screenshots. Everything here shipped in 1.21
except the two notes at the end; the reasoning is in `CHANGELOG.md`.

- ~~**Softlocked on level two behind shut doors.**~~ **bug.** The sealed Seer arena: he blinks, and
  a blink asked the tiles and the flow field about its landing spot and nothing about a door, so the
  mage could leave a room whose doors only open when it is empty.
- ~~**Put a tuft of hay in the starting pen.**~~ Two tiles of it, inside the bars.
- ~~**`WASD — TO MOVE` on the first screen, where you break the cage, with the headbutt line under
  it — and then the second room can go, it has no controls left.**~~ Both empty rooms went; level one
  is ten rooms.
- ~~**On the screen with the man, keep only the top of the text.**~~ One line: `LEFT CLICK —
  HEADBUTT`. **The wall line and `BUTT HIM` are gone with it** — see the note below.
- ~~**And for the look of that room: barrels down the sides or a small crate in the corner. Hay
  makes it hard to read.**~~ Two crates on the near half.
- ~~**In that corridor, less distance to the wall, so the man definitely hits it.**~~ Four tiles of
  floor rather than six.
- ~~**The teaching elements should be clear and well scripted, without too many options, so the
  player definitely learns — and random generation should not break it.**~~ `GEN_RULES.lessons`,
  checked over every seed by `tools/balance.js` and live on the RULES page.
- ~~**The wheel in a narrower room with one way through, and two men: one runs at you and is thrown
  by it, the other walks round it safely and comes on.**~~ `millLesson`, and the two men's
  `trapSense` pinned to the two ends of the roll.
- ~~**The throwing room: add the grab instruction, a sword rather than a shield, narrower and lower
  — a three-tile corridor — crates not in the way, and the grass only in the far corner.**~~
- ~~**And the men always on the far side of that room, not like this.**~~ `noFlipX`.
- ~~**The crack in the wall should be a crack, not who-knows-what.**~~ One shared `wallCrack`.
- ~~**In the walls that tile should face outward — except the bottom wall, where it should not be
  visible at all.**~~ `wallTop` is skipped where the room is above.
- ~~**What is going on with the lamp and its shadow? They should be next to each other.**~~
- ~~**In the first boss's room: one mini-boss and one helper.**~~ `escorts: 1`.
- ~~**If that is hay on level two, make it look like hay.**~~ The painted bale draws on every level
  now; only levels 2–7's floors and walls are still the procedural fallback (see `ART_HANDOFF.md`).
- ~~**The men should talk a little less often.**~~
- ~~**At the start of level three, this can go.**~~ The `HOLD RIGHT CLICK — CARRY` line under the
  hint.
- ~~**If you are holding a crate and it is between you and an enemy's blow, the crate breaks like a
  shield and the damage does not reach you.**~~
- ~~**Objects should stand closer to their shadows — the distance is large right now.**~~ The
  lantern and the brazier; every other prop was already within a pixel or two of its own feet.
- ~~**Enemies trigger the spike traps when they cross them (except the ghosts).**~~
- ~~**When you are holding an object, both mouse buttons let go of it.**~~

**Two lines from this batch are still open.**

- **Which single line belongs on the floor at the first man.** It is `LEFT CLICK — HEADBUTT` now,
  which is what the screenshot boxed — but the pen says exactly that two rooms earlier, so the line
  at the man repeats rather than adds. The alternative is `INTO A WALL KILLS`, which is the whole of
  level one's canon and the thing players did not work out on their own. One word settles it.
- **Barrels.** The ask was "barrels down the sides or a small crate in the corner" and it shipped as
  crates, because there is no barrel `Prop` — only a painted barrel in the ritual room's decal
  layer. A real barrel kind (blocks, burns, is not liftable) is a small piece of work and would give
  the storage rooms something to read that is not a crate.

---

## 14 September 2026, late — the seventh sitting

Twelve lines off an annotated screenshot, plus four sent after it, plus the rule under all of them:
*"and take into account in the new balance — the new division of powers — that you start underpowered."*
All of it shipped in 1.12; the reasoning is in `CHANGELOG.md`.

- ~~**Fog behind a partition, from the place it is seen from.**~~ A shadowcast from the goat's own tile
  every step, painted over the world last. Asked as *"да, можно чтобы было скрыто за перегородкой"*,
  which settled it: hidden, not dimmed.
- ~~**Delete everything struck through in red.**~~ The level's name over the hearts, and the strip of
  controls along the bottom of the page.
- ~~**The caption under each button becomes the control; the long caption is a hover.**~~ LMB / RMB /
  E / SPC under the chips, and `drawSkillNote` while the pointer is on one.
- ~~**Less intense music in a fight with a lot of men.**~~ The steps are at three and seven now, and
  the top of the kit is thinner.
- ~~**Smaller SACRIFICED.**~~ 15px → 11px, and dimmer.
- ~~**DEV as a short phrase rather than a button, slightly smaller.**~~ A word in the corner.
- ~~**Level select in the menu.**~~ LEVELS, with the souls a run would have banked getting there.
- ~~**The roll available by default; its soul gives a stun instead.**~~ DEAD WEIGHT is the roll's soul
  and it is an active now.
- ~~**Restarting level one after you have played: the pen gives on the second blow.**~~ `PEN_KEY`.
- ~~**A crate thrown into a fire goes up bigger than the fire that lit it.**~~ `Prop.burst`.
- ~~**Give the headbutt a bit of its strength back (not all of it), and men thrown into men die.**~~
  A third of the 1.11 cut back, and `flungHits` kills at speed.

**Watch on the next play.** Two of these are worth a second opinion rather than a number:
- The shadow is at `TUNING.fog.shade` (0.8) with `fog.res` (2) deciding how hard its edge is. A man
  standing behind a partition is now very nearly invisible while he can still hear you perfectly — if
  that reads as unfair rather than as tense, the alpha is the dial, not the shadowcast.
- Two men who stand together now die together to one headbutt, which is a real jump in what the bare
  head is worth. `physics.bodyKillSpeed` is the bar for the man who is struck and `physics.splatSpeed`
  the bar for the man who was thrown; raising the second one makes it one death instead of two.

---

## 14 September 2026, night — the sixth sitting

Nine lines in one message, plus the rule under them: *"I want to build a power fantasy where you start
weak."* All of it shipped in 1.11; the reasoning is in `CHANGELOG.md`.

- ~~**Less text in the dev tool where possible.**~~ Every rule is one line and the facts read as
  `name value`.
- ~~**Where the tool generates a random seed, show the enemy count and the room design.**~~ The room
  list is a strip of floor plans now, drawn off the generated level, with `×N` over each.
- ~~**Level one: a door at the first mini-boss that only opens once he is beaten and his soul taken.**~~
  Shipped as `levelDef.soulGate`.
- ~~**A boss carrying a soul has red eyes and a light yellow glow, so he reads.**~~ Shipped.
- ~~**An iron door in front of the stairs on every level.**~~ Shipped as `stair: true`.
- ~~**Tome → corrupted soul, with a picture. A goat cannot read.**~~ Shipped, code and art.
- ~~**Hide the timer unless it is switched on in settings; show it at the end.**~~ Shipped with a
  SETTINGS page on the title screen.
- ~~**Nerf the base headbutt a little more.**~~ Recovery 0.35 → 0.44, impulse 30 → 25, reach 1.7 → 1.55.
- ~~**Base grab takes objects only; carrying a man is a skill.**~~ Shipped as BY THE COLLAR.
- ~~**Base BAAH is only a noise that lures; upgrades make it a stun or fire.**~~ Shipped as
  THE FULL THROAT and DRAGON BREATH.
- ~~**You only see a room when you open its door.**~~ Shipped as `room.seen`.
- ~~**Put the rules tool and the balance tool together, with tabs to switch between them.**~~
  Shipped: one page, and `#rules` / `#balance` as addresses for it.
- ~~**See the actual rooms and the men in them on both tabs. Understand size on the balance tab, and
  go deeper by zooming in. Put the general rules on a tab of their own and the particular ones
  inside each level, so a level has more room to show its space.**~~ Shipped as three tabs — RULES
  as a rule-by-level matrix, LEVEL as one level on the whole screen, BALANCE with a bar per room at
  its real width and place in the world — and a room sheet both of the last two open.

---

## 14 September 2026, evening — the fifth sitting

Asked for in one message and built in the same sitting; kept here so the file stays a record of what
was asked. The reasoning is in `CHANGELOG.md` under 1.10.

- ~~**A tab in the dev tool — the level generation rules — with the rules per room and the enemies
  per level lit up; the general rules apart from each level's own.**~~ Shipped as RULES in the dev
  drawer, with `js/rules.js` as the one list the drawer and `tools/balance.js` both read.
- ~~**Every level gets a sub-idea of its own, a canon, with many rooms written for it: at least half
  of the fighting rooms on the canon, the rest a mix of what you already know.**~~ Shipped as
  `levelDef.canon`, five rooms per canon, and the canon/mix split in `gen.js`.

---

## 14 September 2026 — the fourth sitting, with 1.8

**Where this batch went: everything but the last line shipped in 1.9.** The rule under this batch is
*let the run get stronger*: he was dying, losing what he had just earned, and meeting a wall at level
three, so nothing about the game read as progress.

- ~~**Nothing is taken away on a restart.**~~ Shipped. A death used to take the newest tome.
- ~~**A ticket of tomes per level: one, one, then two.**~~ Shipped as `levelDef.tomes` — one on level
  one, two after, thirteen across a run, the vault holding one of each level's two and the level's last
  boss the other. Every other boss drops milk. Asked for as "меж левелами зберігаються".
- ~~**Difficulty should rise evenly.**~~ Shipped. It went 27 → 50 → **115** → 123 → 167 → 181 → 199 and
  now goes 27 → 53 → 97 → 118 → 157 → 179 → 199.
- ~~**The roll behind a skill.**~~ Shipped as TUCK AND ROLL. The chip on the rail reads LOCKED until it
  is picked up, and the run's first tome always offers it.
- ~~**No more plates. Boxes instead, smaller and simpler.**~~ Shipped: the pot kind is gone, every one
  of them is a crate, and the crate is four shapes at `r` 10 instead of nine at 14.
- ~~**Iron doors between rooms sometimes, three hits, so it is harder to just run through.**~~ Shipped
  as `levelDef.ironDoors`, about two a level from level two.
- ~~**The soul door should be clearer.**~~ Shipped: the tome's halo, the book painted on the face, and
  the word TOME over it.

- ~~**Pits and windows should read as holes, not as pillars. Put a distant landscape under them.**~~
  Shipped, and it turned up a real bug on the way: windows had never generated once. The renderer had
  drawn them since the drop landed and the test for one could not be satisfied by anything the
  generator made.
- ~~**A different fall animation for a man who goes over.**~~ Shipped as `game.fallers`.
- ~~**Running without stopping builds up to +50% speed.**~~ Shipped as `goat.momentum`: four seconds
  to the whole of it, three times as fast to lose it, and all of it gone on a hit.

### system — a souls resource, one soul per man

**Asked as a question, not built.** "А что если мы добавим ресурс душ? Но тут 1 душа = 1 человек. И его
потом можно будет тратить." The counting half is free — `game.kills` is already exactly this number and
`levelCleared` already carries it across levels as `totalKills`. The whole question is what a soul
*buys*, and there is one rule it must not break: `scoreFor` deliberately makes pace the axis and kills
only a multiplier, so *run, don't fight* survives. A soul price that rewards clearing a room turns the
game into a brawler, which is the one thing pillar 3 in `CLAUDE.md` exists to prevent.

Three shapes that do not break it, cheapest first:

1. **The soul door opens for souls.** The vault's door already reads as a soul door and already costs
   four blows. Give it a price in souls as well — say eight — shown on the face the way the blows are.
   You pay it with men you were going to have to kill anyway on the way there, and skipping every fight
   in the level means the tome behind it stays shut. Nothing else in the game changes, and the resource
   has exactly one sink, which is the version worth trying first.
2. **A soul price on the tome cards.** A third card that costs souls and offers a boon out of the pool
   the other two did not. Same sink shape, but it touches `openBoonChoice`, which is the part of the
   game with the fewest moving parts and the most weight.
3. **Souls bank across a run and buy a head start.** The version he may actually mean by "потом" — a
   meta-currency spent on the title screen, which is a new screen, a new save key and a decision about
   whether a run is still one life. Biggest of the three by a distance, and it should not be first.

Ask him which sink before building any of it. The counter is an afternoon; the sink is the design.

---

## 14 September 2026 — the third sitting, with 1.7

**Where this batch went: all of it shipped in 1.8.** Seven notes again, and the rule under this batch
is different from the last one's: it is not *say what a thing is*, it is **make me use it**.

- **A teaching room has to have no way round the lesson.** The first man was already standing still
  with the word for the button painted under him, and he was still being walked past. He is in the only
  doorway now. The general form: if the room is there to teach a verb, the room does not open until the
  verb has been used.
- **A thing that lives in the floor has to cover ground.** Two or three of anything underfoot is
  scenery. What made the grating read was laying nine to fifteen of it in a band.
- **Not every door is the same door.** One number for every door in the game meant every door was
  either a nuisance or nothing. Wood one blow, iron four, and iron only ever in front of something
  worth four blows.

---

## 14 September 2026 — the second sitting, with 1.6

**Where this batch went: all of it shipped in 1.7.** Seven notes, and every one of them the same
complaint underneath: *the game is not telling me what this is*. `CHANGELOG.md` carries what each one
turned into. Two of them are worth keeping as rules rather than as fixes:

- **A trap has to look like an object.** The spike plate was drawn flush with the boards and read as
  floor decoration, so nobody could tell what it was — not what it did, *what it was*. It is a crate
  now. Anything else that lies flat in the floor will land the same way.
- **A line that names a verb has to name the button.** The floor hints were written as instructions and
  read as atmosphere. They carry the key now. The general form: **anywhere the game tells you to do
  something, the thing to press goes with it.**

---

## 14 September 2026 — Max's first sitting, with 1.5

**Where this batch went: all of it shipped in 1.6 except the scream, which was already done.**
Somebody playing it for the first time, watched. `CHANGELOG.md` carries what each one turned into; the
entries stay here because what a first-time player did not work out is worth keeping.

### feel — he did not work out that the men could be hit

Read both rooms of writing on the floor, walked past the first clubman without trying anything, and got
a long way in still treating the men as terrain. Shipped as two changes at once: the first man of the run
is a sentry who holds his post so there is something safe to try it on, and the word for the button is
painted on the floor of that same room. **The general lesson: a control room with nothing in it teaches
the button and not the verb.** Anything else the game wants to teach wants a thing in the room to use it
on, in the same room as the words.

### number — the brute arrived second

Met the man with three hearts as the second enemy of the run. Level one is twelve rooms now and he comes
four ordinary rooms after the first clubman, which is the rule the introduction order was supposed to
have all along: `planEncounters` will honour any `introduce` fraction, so this is a `tuning.js` number
and not a mechanism.

### bug — seen through a wall

A shut door was see-through to a man and a wall to the goat. Fixed in 1.6. **Not fixed, and deliberately
so: a man still hears you through stone.** If that comes back as a complaint the answer is probably to
attenuate `emitNoise` by path rather than by line — but the noise system is the entire counterplay to the
sight cone, and taking it out would make walking up behind a man free.

### number — the Butcher's damage radius

Halved, to the square foot. Left alone: the charge, which is the thing that is supposed to cover ground.

### number — the scream's stun radius — already done, not cut again

Asked for with "if it was cut before, no need to cut it twice". It was: twelve tiles to eight and a half
in 1.2. Left at 8.5. If it comes back a third time the number to look at is probably the stun *duration*
(`goat.scream.stun`, 0.9s) rather than the radius, because what reads as "too big" in a room of four men
is usually how long they all stand there.

### system — rooms built round their traps

Shipped in 1.6 as four templates and a `traps` count per level. **What is still not there:** a trap room
on THE THRESHING FLOOR or THE RAFTERS, both of which draw from their own pool and would need trap
templates written to their shapes (wide and open; narrow and full of holes). And no trap room uses a
drop, because drops only exist in the `high` pool.

---

## 14 September 2026 — a long sitting with 1.3

**Where this batch went: all of it shipped in 1.4 except two.** The soul barrier was asked for and
parked the same day (below, with the reason), and the endless roll against a wall did not reproduce —
pressed against a wall with the key mashed the cooldown holds, three rolls in three seconds, exactly as
on open floor. Everything else is in the build; `CHANGELOG.md` carries what each one turned into. The
entries stay here because the reasoning behind them is worth keeping.

### Kept, and worth protecting

**The wraith goes through the walls.** Called out unprompted as the best thing in the build. It is the
one enemy whose rule the ground does not cover, and the cost of that rule — that it can only become a
body behind you, and cannot form inside stone — is what makes it readable. Anything that later wants to
give mist a wall to respect is arguing with this line.

### bug — a thrown man ends up inside the wall

Hold a man, walk up to a wall, throw: he finishes in the stone instead of dying against it. The cause is
the hold and not the throw. `Goat.update` puts the held man at `goat + aim * (holdDist + r * 0.4)` every
frame and never asks the world whether that point is floor (`js/entities.js`, the grab/hold/throw block).
Face a wall from close and he is already standing inside it before you let go, so the throw starts inside
it. Fix at the hold: sweep the hold point back toward the goat until it is on floor, and let the throw
keep starting from wherever the man actually is. A throw that has a wall in it is supposed to be the best
throw in the game — this is the one place it silently is not.

### bug — an endless roll against a wall — not reproduced, 14 Sep 2026

Pressed up against a wall, the roll is said to come back with no cooldown. **Measured and it does not.**
Driven from the harness with `rollPressed` set every frame for three seconds, hard against a wall and
then on open floor: three rolls both times, `rollCd` 1.05 s at the end of each, against a 1.35 s
cooldown. `rollCd` is written in exactly one place and nothing clears it.

So it is something the measurement did not have: a tome (LOOSE JOINTS takes the cooldown to 0.61 s), the
gong on top of it (another ×1.5 off every cooldown as it ticks, so 0.4 s — which is fast enough to read
as endless), or a different meaning of *pressed against a wall*. Worth asking him which, before
changing a number that is behaving.

### number — the door between rooms should take three blows, not one

He called it the wooden section between levels: the door in a corridor. `Prop.smash` breaks it on the
first hit and floors whoever waited behind it. Three blows instead. The door is the one thing in a
corridor that can hold you still, and holding you still in a corridor for two more beats is worth more
than the shortcut is. The men who shoulder doors open from their side are unaffected — that is
`openPressure` and a different clock.

### number — the second cage should break too, and faster

The small shut cage across the first room is scenery: `deco` bars that wobble when hit and never open.
Make them break — fewer blows than the pen's seven, and no stun on the way. The pen teaches the verb the
hard way; a second cage that gives in quickly is the reward for having learned it, and it is the only
thing in that room the goat can do for the sheep in it. It needs its own `hits` under
`TUNING.prop.deadCage` and its own break path: `deco` also keeps those bars out of the gate and out of
the in-front-of-the-goat draw pass, so the flag stays and `breakCage` learns about a second cage rather
than losing its exclusion.

### feel — the speed tome has to look fast

SURE HOOVES multiplies top speed by 1.18 and nothing on the screen changes, so the best passive in the
game reads as nothing at all. The smear is already there and already spent: `Goat.trail` keeps seven
ghosts at one every 0.028 s while he is over 55% of top speed, and `drawGoat` draws them. Hang its count,
its rate and its opacity off `game.mods.speed`, so the tome lengthens the smear rather than only the
number. It is body work with no button, which means the trail is the whole of its feedback.

### feel — the hound's bite is too quick to read

`TUNING.dog.windup` is 0.3 s and the bite lands before the eye has the tell. Slow the windup and leave
everything else alone: the dart is what you are supposed to read, and the bite should be the beat after
it rather than part of it. Watch what it does to the pack — `packBusy` already lets one hound commit at
a time, so a longer windup makes a ring of three noticeably kinder. `tools/balance.js` will not catch
that, because it counts threat and not timing, so `THREAT.dog` may want to come down with it.

### feel — the camera swings too hard when the run changes direction

Enough of a swing to make him queasy. `updateCamera` leads the camera `camera.lead` (2.4 tiles) toward
the aim at `camera.lerp` 7. On a mouse the aim flips the instant the pointer crosses the goat, so the
lead point teleports across him and the whole picture follows it. Damp the lead itself — carry a second,
slower-lerped lead vector rather than reading `input.aim` raw — or scale the lead by run speed so a turn
on the spot moves the camera nothing. The pull-back at speed is not the problem and should survive.

### system — spike floors, from level 3

Prince of Persia: spikes that come up out of the floor, in ordinary parts of the map and in rooms that
have men in them, and specifically **where you have already walked** — the trap is behind you rather
than in front of you. Men read them and walk round them while they are up, and a man can sometimes still
be baited onto them. That last clause is the feature: it is another way for the room to do the killing.
The AI half is mostly built — `hazardAt` already answers what will kill whoever stands at a point,
`avoidHazard` already handles both walking into it and standing in it, and the once-per-encounter
`trapSense` roll already produces the one man in a crowd who blunders in anyway. A spike tile joins that
list. Open: whether they are on a cycle like the Mill, or armed by the goat's own path.

### system — a new sixth level, and the floor opens

**A new level, and it goes in at six.** It reads as being up high: windows in the walls and holes in the
floor, men thrown out through both, and the goat able to go through them too. Falling is not death — you
come back at the point you went in and it costs a heart, the same price the Mill charges. That price is
what makes a hole something you can use rather than something you edge around, and it is the first thing
in the building that kills men without touching the ground.

**THE OSSUARY moves to seven and stays the finale.** Settled 14 Sep 2026: the drop goes in ahead of it
rather than behind it, so the last ground is still the one enemy the rest of the game does not prepare
you for. The run becomes seven levels long.

What it costs to build: a `LEVELS` entry between THE BRIDGE and THE OSSUARY, its own room pool (holes
want hand-authored rooms), a tile kind the flow field and `collideCircle` treat as a wall for men and as
a fall for the goat, a throw that carries a man over the edge, and `tools/balance.js` agreeing it is
harder than THE BRIDGE and easier than what now follows it — inserting a level in the middle of the
curve is the part most likely to fail, and it fails loudly, which is the point of that script. `met` is
computed in `LEVELS` order, so the new level inherits everything the first five introduced and must
introduce nothing the Ossuary was relying on being new. `CONCEPT.md` then says seven levels, and its
table gains a row.

The level has to say plainly that the floor can open before it asks you to use that, which is a
rendering problem as much as a design one.

### system — fire jumps once between men

A man who is alight sets fire to the first man he touches, and that man sets fire to nobody. One hop,
never a chain. Burning men already blunder — fire takes the wheel and they walk through whatever is in
front of them — so the contact happens on its own; what is missing is the pass and the stop. A man lit by
a man carries a flag that `ignite` refuses to pass on again. A whole room going up in one brazier is the
thing this is deliberately not.

### ~~system — the soul barrier, from level 3~~ — parked, 14 Sep 2026

Asked for: a barrier that only opens if you took 80% of the souls in the rooms behind it. **Decided
against the same day.** Gating the way out makes some levels no fun to run through, which is the same
objection pillar 1 makes — *skipping a room is valid and sometimes correct*. A gate that counts bodies
turns every run into a clearing job.

Kept here so it is not re-proposed. If something like it ever comes back, it comes back on a door that
guards something optional — a tome, a bowl, a shortcut — and never on the exit.

### system — a score at the end of every level, and a total at the end of the run

Settled: **both.** Each level ends on its own score, and the run ends on the sum of them. The level-clear
card already carries the raw material — `N sacrificed in X s` — and becomes a score card; the win card
stops being `totalKills` and deaths and becomes the run's total.

What a score is made of is time and kills, and **the weighting is the whole design of it**: a score that
pays for bodies argues with *run, don't fight*, because the best run becomes the one that clears every
room. Time has to be the axis and kills the multiplier, so that going faster is never the wrong thing and
killing on the way is what makes a fast run a good one. A proposal to argue with: time scores against a
par for the level, kills raise the multiplier, and a clean fast run beats a slow massacre.

### system — BEST, on the title screen

A third thing on the menu next to NEW GAME and CONTINUE, holding the best score and the best time for
each level. `drawTitle` refills `menu.rects` every frame and `menuAt` / `menuPick` are the only ways in,
so a third entry is cheap; the page behind it is a table of levels against two numbers, drawn by the same
hand as the title and leaving the same way.

It needs a record of its own in `localStorage` beside `SAVE_KEY` — per level, the best score and the best
time — written at `levelCleared` and wrapped like every other storage call, so a browser that refuses
storage shows a BEST with nothing in it rather than breaking the menu. A level never played shows a dash.
Deciding needed: whether NEW GAME wipes it along with the run (it should not — a record survives the
runs that set it).

---

## 14 September 2026, later — while 1.4 was being built

Sent one at a time while the work was going on. All of it shipped in 1.4.

### bug — a man in your mouth was safe from everything

Two of them, and they were the same hole: the branch that runs a held man sits above every other state
in `Enemy.update` and returned before anything else could touch him. So **a mage standing in his own
witchfire did not burn**, and neither did anyone else you carried through a fire. The branch ends with
the fire check now, and whatever catches comes straight out of the mouth — which is the counter to
carrying a mage at all.

### bug — the held mage's fire followed the goat

The rune was dragged along under him every frame, so it went off under the goat wherever the goat had
run to. It is planted where he started painting it now. Keep moving and you leave a trail of it behind
you; stand still and you are standing in it. That is the difference between a mage being a death
sentence and a mage being a thing to be handled.

### feel — enemies had no back

Inside two and a half tiles a man saw you wherever you stood, which took away the one thing his cone was
for. The cone holds at every range now, and what gives you away behind a man is noise — which the noise
system already turns him toward. Stealth is never the plan and is always available.

### bug — clubs came through walls

`meleeHit` asked only for reach and an arc. It asks `game.reaches` now: line of sight plus every
blocking prop against the segment. The goat's horns are held to it too — a man behind a table is behind
it, both ways round.

### bug — a carried shield did not stop anything (with a screenshot of it not stopping anything)

It was a disc the size of the shield, hung 26 px in front of the goat, so almost everything aimed at him
went past its edge. It is an arc across his front now — `weapon.coverR` / `coverArc` — every turn spends
a charge, and a club that lands on it staggers the man who swung. His back is still his back.

### system — a death costs one tome, not the run

Asked for as "минус один том, как было в начале уровня". `startLevel` snapshots what he walked in with
and `restartLevel` returns that list minus its newest entry, so a tome picked up in the level that
killed you goes with it. The death card names what went.
