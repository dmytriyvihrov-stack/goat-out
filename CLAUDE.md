# Working on Goat Out

Instructions for any session picking this project up. Read this first, then `CONCEPT.md` for what the
game is trying to be. `README.md` is for a player, this file is for whoever is building it.
`MARKET.md` is the commercial picture: comparables, the 2026 storefront and the open positioning decisions.
`BACKLOG.md` is what playtesting has asked for and has not got yet — read it before inventing work.
`ART_HANDOFF.md` is for whoever is generating and packing art (painted sprites and tiles): what is
already painted and wired in, what is still the placeholder shapes, and how the pipeline works.

---

## What this is

A playable prototype of a top-down, one-life, procedurally generated escape game. You are a sacrificial
goat running out of a cult's compound. Vanilla JavaScript, Canvas 2D, WebAudio. No build step, no
dependencies, no framework. Opening `index.html` runs the game.

`GENRE_RESEARCH.md` collects what reviews of reference games (Hotline Miami, Ape Out, and format-mates
that stayed niche) actually praise and blame, as a genre guideline. Background reading, not a spec.
`GENERATION_RESEARCH.md` is the companion piece specifically about level/world *generation* — how
Spelunky, Isaac, Gungeon, Dead Cells, Ape Out and others actually build a level, and what laws hold
across most of them. Also background reading, not a spec.

The published build lives at **https://claude.ai/code/artifact/098e742b-e742-4ce7-8499-a303fa5db021**.
Always update that same URL rather than publishing a new artifact (see *Publishing* below).

---

## Ground rules

1. **Never add a new input.** The whole design rests on a small verb set: move, headbutt, grab/throw,
   roll, scream. Upgrades bend the numbers behind those verbs or change what a button does. They never
   add a seventh button. If a feature seems to need a new key, find a way to fold it into an existing one.
2. **All numbers live in `js/tuning.js`.** Nothing gameplay-relevant should be a literal anywhere else.
   If you find yourself typing `0.35` into `enemies.js`, it belongs in `TUNING`.
3. **Kills come from geometry.** A headbutt on its own only knocks a man down. Walls, pillars, fire,
   the mill and other bodies are what kill. Preserve that: it is the reason the game reads as Ape Out
   rather than a brawler.
4. **Both sides are clunky.** Every attack has a windup you can read and a recovery you must eat. Do not
   add cancels, combos, or i-frames beyond the roll's.
5. **Comment the why, not the what.** The code is dense; a one-line comment above a non-obvious block
   that explains the intent is worth more than a paragraph.
6. **Nothing may reward remembering a layout.** The game is in the regeneration camp — Ape Out,
   Spelunky, Isaac — and not the memorization camp Hotline Miami and Katana Zero are in: the level is
   never the same twice, so nothing in it can be worth *learning by heart*. What a level **is** —
   its canon, that it has a wheel, that a vault is cut off the middle of it — is knowledge and is
   meant to be had. Where a particular thing **stands** is not, and no reward may depend on it. The
   test: if a feature gets better the tenth time somebody plays that level, it belongs to a different
   game. See `GENERATION_RESEARCH.md` for why the two camps are the line they are.
7. **A room is bought on two axes, and neither of them is "more of the cheapest man".** `THREAT` buys
   the crowd; `groundOf` (`rooms.js`) buys the floor under it — how little of the room is available
   as a weapon — and `gen.js` deals a level's rooms out along both, tight and quiet first. Pillar 3
   is the reason there are two: if the wall is what kills, then taking the wall away is a way of
   making a room harder that a body count can never say. And `ENCOUNTER.cheap` is the floor under
   the whole thing — the clubman has a cap that *tightens* as a room gets richer, because a late
   room that is an early room with four more of him in it is not a late room.
8. **A promise the generator makes is written down as a rule.** Every one of them lives in
   `GEN_RULES` (`js/rules.js`) with a `check(level)`, so `node tools/balance.js` can hold it against
   many seeds of every level and the dev drawer's RULES page can paint it live. Add a behaviour to
   `gen.js`, add its rule in the same sitting — a promise nothing checks is a promise that has
   already quietly broken on some seed nobody has played. If one seed genuinely cannot answer it
   (`rises`, `ground`), the per-seed check says so by returning `true` or `null` and never blood, and
   the averaged version lives in the report.

---

## File map

| File | Holds |
|---|---|
| `js/tuning.js` | `TILE`, `TILT`, `PALETTE`, `TUNING`, `BOON_BASE`, `BOONS`, `BARKS`, `SETTINGS`, `MENU`, `LEVELS`. Every tunable number, every line the cult shouts, the rows of the title screen and the seven level definitions. |
| `js/rng.js` | Seeded RNG (mulberry32) plus `clamp` / `lerp` / `len` / `angleDiff`. |
| `js/rooms.js` | Hand-authored room templates as character grids, with a legend at the top (`'w'` is a stand of arms, `'O'` a drop). Also the start room, the arena, the Mill room, the Great Hall and the Gallery. Templates carrying a `tag` belong to one level's pool. |
| `js/gen.js` | Level generation: chains rooms, carves corridors, places props, spawns, heals, validates reachability. Defines the tile enum `T`. |
| `js/audio.js` | WebAudio. Buses, the drum machine, the music bed (`MUSIC`) and every one-shot effect. |
| `js/world.js` | Tile grid, collision, line of sight, flow field, fire (ordinary and witchfire), noise events, the persistent decal canvas, cult pictograms, the ritual start room. |
| `js/input.js` | `TouchUI` (on-screen controls) and `autoAim`. |
| `js/entities.js` | `Goat`, `Prop` (every world object), `Bullet`. |
| `js/enemies.js` | `Enemy` — one class, behaviour branches on `kind`. |
| `js/render.js` | Everything drawn. Roughly half the codebase. |
| `js/rules.js` | `GEN_RULES`, the generator's promises with a `check(level)` each; `checkRules`, `roomsOf`, `levelFacts`. Read by the dev drawer's RULES page and by `tools/balance.js`, so a rule is written once. |
| `js/game.js` | State machine, fixed-step loop, input plumbing, entity-vs-entity collision, boons, dev drawer. |
| `index.html` | Local build. |
| `artifact.html` | Published build. Same scripts, artifact-shaped head. **Keep the two script lists in sync.** |
| `tools/serve.js` | Dev server. Also accepts `POST /shot?name=x` with a data URL and writes a PNG to `tools/shots/`. |
| `tools/harness.js` | Console test harness. See *Testing*. |
| `tools/balance.js` | Prints the difficulty curve and the canon/mix split of every level, runs every rule in `js/rules.js` over many seeds, and fails on a broken one. |
| `tools/check-sync.js` | Checks the working tree, `origin/main` and the published artifact are one build. See *Publishing*. |
| `BACKLOG.md` | Playtest notes, dated and tagged bug / feel / number / system. Requests, not decisions. |
| `ART_HANDOFF.md` | What is painted and wired in vs. still placeholder shapes, and how to paint the next thing. |

---

## Architecture notes

**Coordinates.** Simulation is flat top-down world space. Rendering squashes Y by `TILT` (0.86) so the
camera reads as slightly tilted. Sprites counter-squash with `ctx.scale(1, 1 / TILT)` so they stand
upright on a tilted floor. Anything drawn in world space that should not look squashed — floating text,
the `?` marks, the soul label — needs that same counter-scale with its `y` multiplied by `TILT`.
The mouse-to-world conversion in `readMoveInput` divides by `zoom * TILT` on the Y axis. If you add a
new screen-to-world conversion, do the same.

**The decal canvas.** `world.decal` is a persistent offscreen canvas at `DECAL_SCALE` (0.34) holding
blood, bodies, scorch marks, the cult pictograms and the start-room scene. It is never cleared during a
level. Pixel pictograms snap to whole decal pixels in `pixelGlyph`, otherwise the upscale turns them to
mush. Raising `DECAL_SCALE` costs memory fast: the world is 420x78 tiles.

**Two hits.** Anything with `hp > 1` — an arena elite, or any Seer — absorbs a killing blow in `die()`:
it goes down floored, loses one, gets up, and a Seer blinks clear. Fire counts, so a mage has to be lit
twice. Only `devour` skips it — there is nothing left to get up. A bomb charge used to skip it as well
and killed a two-heart target outright regardless of his own hearts; it is an ordinary hit now, so
`explode()` floors him down to his last heart and it takes a second charge (or any other blow) landed
while he is already there to actually finish him. `entities.js`'s headbutt hands out a fresh fuse on
every hit and resets `exploded` with it, which is what lets a second charge go off at all.

**A patrol keeps to its own room.** `Enemy.home` is where he was put, and `idleWander` will not let him
drift more than `TUNING.ai.leash` tiles from it: past that, the next wander beat turns and walks him
home instead of picking a fresh direction. A man idling in a room used to wander freely inside it, which
in a room with a doorway meant he could wander straight through it — an escort from a crowded room
turning up alone in the empty one next door, or a room built to hold exactly one idea (the ambush's two
racks, a trap's own men) filling in from whoever wandered in from off camera. The leash is idle-only:
`chaseGoat` and `investigate` are what they always were, because a man who has heard or seen something
is answering that and not patrolling any more.

A wander beat's new facing used to be a pure random turn with nothing checking what was in that
direction, so a man could turn to face the wall behind him and simply stand there looking at it until
the next beat. It resamples now: up to five times against a look-ahead probe (`TUNING.ai.wanderClear`
tiles out), and only when he is not already walking home over the leash — a man walking home is allowed
to face the doorway he is heading through even if a wall probe would otherwise reject it.

**Nothing simulates two rooms away.** `game.frame`'s enemy loop skips `e.update()` outright for anyone
whose `e.room` (the index he was spawned into) is two or more away from whichever room the goat's own
tile is in (`roomAt`) — the room he is standing in and its immediate neighbour still patrol, chase and
swing exactly as before. Room index is a fair stand-in for distance because the generator chains rooms
in one line (see *Canons* below), so this is a straight `Math.abs` rather than a graph search. It never
touches the room the goat is in or the one next to it, which is deliberately more generous than any
noise radius in the game (`boom`, the loudest one, is 16 tiles): a man still hears you through stone
(see *A front and nothing else*, just below) and that counterplay is never this skipping something —
by the time a room is far enough away to freeze, nothing in it could have heard him anyway.

**A front and nothing else.** `canSeeGoat` is a cone and a line of sight and nothing else. There used to
be a close-range bypass — inside 2.5 tiles he saw you wherever you stood — which took away the one thing
the cone was for; what is left of it is `TUNING.ai.feel`, a couple of pixels past the two bodies where
being walked into counts as being seen. A `watchful` man (the killbox) has no cone at all and a wraith
needs no eyes. What gives the goat away behind a man is the noise system, which already turns a man to
face what he heard: running emits `noise.footstep` above a walk, and everything loud is loud on purpose.
The line itself is `game.sees`, not `world.los`: stone, plus the short list in `game.sightBlockers` — a
shut door, the gong, the hub of the wheel — each tested as a circle against the segment the way
`reaches` tests a blow. `Prop.opaque` is the getter, and the set is deliberately small: a door is a wall
with hinges and a man used to spot you straight through one, but a table, a lamp post, a bowl of coals
and the bars of a pen are all things you can see over, and making them cover would be a stealth system
rather than a fix. Both `sees` and `reaches` are `clearLine` with a different prop list and a different
getter.

**A man who does not walk.** `enemy.sentry` is the first man of a run on level one (`levelDef.sentryIntro`,
placed by `blockSpot` in the **only way out of his room**: `carveCorridor` records the band it cut out of
each room as `room.exitBand`, `blockSpot` puts every row of that band but one back to stone, deletes any
door the corridor was given, and stands him a step inside the single tile that is left. `collideEntities`
also refuses to shove him — like the Butcher, he takes the whole of the separation and gives none of it,
because bulldozing him down a one-tile corridor was a way past him. The room does not open until he is
down. Nothing else is **scattered** into that room either: `lessonIndex` keeps the milk, the random
crates and the grating out of it, so it is one man, one verb and whatever the template put there by
hand.) `chaseGoat` turns him to
face the goat and returns without moving, `idleWander` leaves his facing alone and `investigate` puts him
straight back to idle — so he is the only man in the game you get to choose the moment of the fight with.
Everything else about him is a clubman: windup, swing, recovery, two hearts of nothing, killed by geometry
like anybody. He is a teaching device and there is exactly one of him per run.

**His room is one shape, not whatever the mix pool draws.** Every other room in the level is dealt
from the canon or mix pool and could be anything the level owns; this one is forced to
`LESSON_TEMPLATE` in `rooms.js` — **four tiles of floor and no deeper**, so wherever he is standing
there is stone a tile away and every direction a headbutt can throw him ends against it. It was six
deep and packed with hay: half the swings put him down on open floor where he got back up again, which
taught the opposite of the level's one idea, and the bales were the loudest thing in a room whose whole
point is the man. What is in it now is two crates against the top and bottom wall of the **near** half —
something for the eye to measure the room by, well clear of the line from the door to him and well clear
of where `blockSpot` stands him (it refuses a spot within 1.4 tiles of a prop, so furniture at the far
end could push him off the wall). `noFlipX` keeps them out of the doorway.
`sentryRoomAt` in `gen.js`, computed before any room
exists, resolves to `ordinaryRooms(levelDef, n)[0]` — the same room `planEncounters` would have
introduced the bearer in anyway, since `introduce: [['bearer', 0]]` always resolves to the first
ordinary room — so forcing the template changes nothing about the difficulty curve or the room's
`canon`/`mix` accounting, only what stands between the entrance and him.

**A second forced room, further in: grab and throw taught by standing something in front of you.**
`AMBUSH_TEMPLATE` in `rooms.js` is **three tiles of floor and fourteen long** — a corridor rather than
a room, so a blade thrown down it cannot miss and a man walking up it cannot go round. A stand of arms
just inside the door, a crate a step past it, and the room's men standing well down the far end.
`levelDef.ambushAt` forces it in the same way `millAt`/`hallAt`/`galleryAt`/`killboxAt` already do (and
is in `fixedW` alongside them, so the width budget accounts for it); level one sets it to room 4, which
is where `racksFrom` allows the level's first stand of arms, and **block 1 of the floor text — grab and
throw — is painted here** rather than in an empty room two rooms after the pen.

Four things about it are deliberate. `noFlipX`: rooms chain left to right, so the door is always in the
left wall, and flipped, the men stood in the doorway you walked in through with the rack behind them —
the exact opposite of what the room is for. Its two stands are **always the sword** (`room.isAmbush` in
the marker loop), because a thrown shield only knocks a man flat and a lesson whose payoff is "he gets
back up" is not one anybody keeps — two of them side by side rather than one, so a missed first throw
is not the end of the room's own idea. Nothing is scattered into it — no extra crates, no grating, no
coop, never a trap room and never a canon room — so the one crate in it is the one the template put
there. And its bowl of milk, if the heal rhythm gives it one, is **placed rather than scattered**: the
spot furthest from `room.enter`, which is the far corner past the men.

Nothing about who spawns there is special-cased: it is an ordinary room and
fills off the threat curve like any other, so "they wait" is room geometry (the distance from the
door to them) rather than a passive-AI state — nothing in `Enemy` was touched for it.

**Dazed.** `enemy.daze(game, seconds)` is the scream's whole effect: the man freezes, whatever he was
winding up is cancelled, and stars orbit his head. It is a timer, not a state, so the flung / floored /
burning machinery underneath is untouched.

**Enemies.** One `Enemy` class. `kind` is `bearer`, `hunter`, `dog`, `seer` or `butcher`; `update()`
dispatches to `updateBearer` / `updateHunter` / `updateDog` / `updateSeer` / `updateButcher`. Shared
machinery (perception, being flung, burning, being held, the bomb fuse) sits above the dispatch. Arena
bosses carry `elite` and `boss` flags: elites absorb hits before dying, bosses drop a soul.

**The hound.** `kind === 'dog'` is the one enemy that is not a man: no barks (only `sfxGrowl`), no grab
(`tryGrab` skips it and says TOO QUICK), and `tryDodge` lets it slip `TUNING.dog.dodge` of the headbutts
aimed at it. Its loop is orbit → `dart` → `windup` → bite → `retreat`; the dart is the window you get,
and `drawHound` gives it the only tell it has (flattened body, streaks, lit eyes) — keep that tell if you
touch the sprite. `packBusy()` lets one hound of a pack commit at a time, which is what keeps three of
them readable. The counter is the scream: `daze()` multiplies by `cfg.dazeMul` for a dog, cancels a dart,
and a dazed dog cannot dodge. `game.houndSeen()` growls and teaches that once per run.

**The wheel is met in a room built round it.** `levelDef.millLesson` — level one, and nowhere else —
picks `MILL_LESSON_TEMPLATE` instead of `MILL_TEMPLATE` and puts exactly **two men** in it. The room is
seven tiles tall rather than ten (three tiles came off it after a playtest read the two safe rows above
the hub as a way to just walk round the whole thing): the hub now sits one row off the top wall, so the
arm's own sweep (`mill.armLen` plus a man's own radius, a shade under 2.5 tiles) reaches that wall
outright, and of the three rows left below the hub only the last one sits outside that reach — one lane
of clear floor along the bottom, so getting through is a decision about the wheel rather than a walk
round it. `noFlipX` keeps the two men on the far side of it from the door. The men are the lesson and
neither of them is scripted: `planEncounters` asks for two bearers, the generator stands them on the two
`e` markers furthest from `room.enter`, and `startLevel` pins their `trapSense` to the two ends of the
roll every man in the game makes — nought for the nearer one, who therefore never sees a hazard and
takes the arm in the chest on his way to you, and one for the other, who always does and comes round it.
Both are also given `noticeFor` (`TUNING.ai.millNotice`), which is `Enemy.noticeFor` on nobody else in
the game: the instant a man sees you he closes, and that snap is the whole point of the cone everywhere
else, but a room whose entire idea is one man walking into the wheel needs a beat where he has plainly
seen you and plainly not moved yet, or the death reads as a coin flip that landed before the door was
even open rather than as the room's own decision. One man dies to the room and one man walks through it,
in that order, while you stand and watch. It used to be `millSolo`: an empty room, which taught that the
arm hurts and nothing else. What has to be learned is that it hurts *them*, and that needs somebody in it.

**Trap sense.** `hazardAt()` answers what will kill whoever is at a point — flame, a lit brazier, a rune
mid-cast, the lip of a drop, a spike plate that is up or about to be, or the arm of the Mill about to
come round (`Prop.millThreat` predicts `TUNING.ai.millLead`
seconds ahead, with `millClear` px of berth). `avoidHazard()` checks both **where he is walking and where
he is standing**: an arm sweeps onto a man who is holding still just as happily, and before that check
existed half a crowd died waiting at the edge. Standing in it, he leaves radially; walking into it, he
steps round; with no way round he gives ground.

Every enemy rolls a `trapSense` on spawn and then rolls against it **once per encounter** — `hazardSeen`
freezes the `hazardRoll` timer while anything is still in view, so the timer only runs down once he is
clear. Re-rolling every `rollGap` instead meant sustained exposure guaranteed a blunder and the wheel ate
everybody. Fail the roll and he is blind for `TUNING.ai.blindFor`, which is the one man in a crowd who
still rides the wheel into a wall. `game.hazards` (fixed for the level) and `game.runes` (rebuilt each
step) keep all of it off the per-frame prop loop.

**The mage minds his own fire.** Witchfire burns the Seer exactly like anybody else — that is deliberate
and is not to be taken away. What he gets instead is care: `TUNING.seer.trapSense` is near-perfect,
`seer.fireCare` multiplies the distance `avoidHazard` reads flame and runes from, and `blink` refuses a
landing spot that is alight, over a drop, or inside anything `hazardAt` calls a hazard. Blinking out of a
fight and into his own rune was the one thing that read as the fire not counting for the man who lit it.

**Fire takes the wheel.** Anything alight loses its AI and blunders: `burnDir` wanders, walls turn it,
and `moveToward` is called with no `game` so it does not even dodge hazards. The Butcher is no longer
the exception — he blunders too, and what he alone gets is the far side of it: `burnHearts` comes off
over `burnTick`, and when `burning` runs out he lands in `stagger` instead of dying. A boss that walks
his line at you through a fire reads as the fire not counting, which is why nothing does it any more.
`ignite` also takes whatever it lit out of the goat's mouth.

**Props.** One `Prop` class for brazier, crate, bell, door, table, lamp, mill, heal, spike and weapon.
`blocking`, `stopsBullets` and `item` are getters, not fields. `headbutt()` dispatches per kind. `item`
is what the goat can pick up and throw — a crate or a weapon — and it is the test everywhere the code
asks whether a thing is a thing you lift. There used to be a `pot` as well, drawn by the fallback branch
of `drawPropBody` as an ochre disc; a disc on a floor of boards reads as a plate rather than as
something to pick up, so every one of them is a crate and the kind is gone. There is no fallback
branch any more: a prop kind with no branch of its own does not draw.

**The ritual altar** is a real `table` Prop, not decoration: `startLevel` spawns it directly (not
through the generator) at the same spot the painted layer has always drawn it, tagged `isAltar` so
`PaintedArt.drawProp` keeps its own art instead of falling back to the plain table every other one
gets. It shoves, it blocks, it takes a blow — everything a table already does — for free.

**Stands of arms.** A `weapon` prop is both the rack and the thing in it: `inStand` is true until it is
first taken, and the rack is only drawn while it is. `weapon` is `sword` or `shield`. It is grabbed like
a crate, thrown by releasing grab **or by pressing headbutt** — `Goat.throwHeld` is the one throw both
go through, since there is no swing to spend on a blade he cannot wield with his teeth, and the bash
button used to just drop an auto-picked one or do nothing for one he had reached for on purpose — and
flies in `updateWeapon`; `hitMan` is where a sword kills and sticks
and a shield flattens and carries on, `passed` stopping it hitting the same man twice on one throw. A
carried shield turns `prop.weapon.shieldHits` bullets in `Bullet.update` before it splinters. Nothing is
consumed: both lie where they land and are grabbable again. `'w'` in a room template places one; `racks`
on a level definition is the chance an ordinary room gets one or two more. A lying (not racked) one
also Y-sorts against the goat the way a cage bar always has, so it draws in front of him once he has
drawn level with it rather than always underneath, and draws smaller than one still standing in its
rack — closer to what it actually covers on the ground.

**One new thing to a room.** `game.taught` is a list of what the run has already been shown — enemy
kinds, `'mill'`, `'<kind> boss'`. It is passed into `generateLevel` and comes back on the level as
`taught`. Any kind not in it gets a room to itself the first time it appears (the room's other men are
dropped); a new boss gets his arena alone, and the wheel keeps the two men that teach it. `metRoom` inside the
generator also keeps the lone rifle posts from landing earlier in the level than the room that
introduces a rifle. A run that keeps its souls keeps what it has learned; a fresh run forgets.

**Corrupted souls are a budget, not a by-product.** `levelDef.souls` is how many a level gives up, all
in, and it is authored: **one on level one, two on every level after**, thirteen across a run against
sixteen boons, so no run gets everything. It used to be however many bosses the level happened to hold
plus the vault — twenty-four across a clean run — which is not a decision about how strong the goat
should be by level five, it is an accident of where the arenas are. `startLevel` spends the budget
before a blow is struck, in this order: the `soulGate` arena (its door does not open without one), then
the vault (an iron door that costs four blows must not pay milk), then the **last** bosses of the level,
so the fight you finish on always pays. `Enemy.die` calls `game.bossPrize`, which drops a soul if the
boss was given one and **milk** if he was not — nothing you had to break through is ever worth nothing.
The level card reports the count, because a progression nobody can see is not one.

It was a tome, and a tome asked the player to believe that a goat reads. A soul is a violet wisp with
two cold points in it (`Renderer.soulWisp`, used by the thing on the floor, by the cards and by the two
doors that are about one), it is `game.souls` in the code, and the goat swallows it. Violet is the
game's colour for what should not exist — witchfire, runes, the wraith — so the power curve of a run is
the goat eating the compound's own dead, which is the only part of the fantasy that needed saying.

**A man with a soul in him is lit.** Which boss is carrying one was decided in `startLevel` and used to
be something you found out by killing him. `drawEnemy` gives him an amber haze that breathes and a thin
ring at his feet; `drawCultist` and `drawHound` turn his eyes red off the same `e.soul` flag. Neither
changes anything about the fight — it is a label, readable across a room, on the one man in it worth
crossing the room for.

**The soul gate.** `levelDef.soulGate` is a room index — one arena, on level one only. `gateSpot` in
`gen.js` narrows that room's exit to a single tile the way `blockSpot` does for the sentry and hangs a
door in it with `gate: true`. That door has no hit points: `Prop.smash` returns early and says so, and
`updateDoor` will not let anyone shoulder it. `game.openSoulGate`, called from the soul pickup, is the
only thing that opens it. It exists because the first thing a run is offered is a soul lying on the
floor of a room whose fight is already over, and the first player we watched walked straight past it
and met level two with none of the three buttons the souls open.

**The room that shuts behind you.** `{ at, boss, sealed: true }` on a level's `arenas` entry is the
other kind of locked room, and it is earned by winning rather than by a soul. `gen.js` narrows both
ends — the previous room's exit and the arena's own — with `gateSpot` and hangs a `seal: true` door in
each, recorded on the level as `sealedArenas`. `game.updateSeals` runs the three beats and is the only
thing that touches them: the doors stand **open**, they slam the moment the goat is a tile inside
(`game.inRoom`), and they break outright when the last man shut in with him is down.

Three things about it are load-bearing and every one of them was found by playing it rather than by
reading it.
The doors have to *start* open: a seal refuses `smash` and refuses `openPressure`, so a pair that is
shut on the first frame of the level is a wall, and everything past it — the arena, its soul, the
stairs — is unreachable. The level simply could not be finished. And the seal waits on `s.held`,
the men **standing in the room at the moment it shut**, not on the spawn list: an escort who chased
the goat out through the open door and stayed out there is alive, outside, in a room that can then
never be cleared from the inside. Whoever is in the room with you is who you have to beat.

And **nobody it is waiting on may leave**. The level-two arena is the Seer's, sealed, and a Seer
blinks: `blink` picks a landing spot around the goat and asks the tiles, the flow field and
`hazardAt` about it, and none of those three know anything about a door. A mage who blinked out
through the wall was alive, outside, in a room whose doors only open when it is empty, with the goat
shut in behind him — the run ended there with nothing to hit. `game.sealHolding(e)` is the question
(which shut seal is this man one of the reasons for) and `blink` now refuses any spot outside that
room. `updateSeals` has the belt to that brace: a held man more than a tile outside the room's own box
stops counting, because a door that gives too early costs a fight and this cost the whole game.

**A wall that gives.** `carveSecret` in `gen.js` takes a patch of one ordinary room's own top or
bottom wall, once or twice a level (`TUNING.secret.chance2` is the odds of the second), and cuts a
two-tile niche into the rock behind it holding a patch of milk and a stand of arms. Every tile it
touches has to still be solid rock, so it never trades on a room or a corridor. The prop is
`kind === 'secret'`: it is a wall to sight and to bullets, `Prop.crackWall` gives it
`TUNING.prop.secret.hits` (two) and a visible crack after the first, and it is drawn in the room's
own `wallColor` so nothing gives it away before that crack does. `levelDef.secretsAfterBoss` (level
one only) keeps the secret pool to rooms past the level's own first arena: a wall that gives is not
a thing to look for before a run has any reason to go out of its way for a soul.
`GEN_RULES.secrets` holds it.

`Renderer.wallCrack(x, y, hits)` is the crack itself and both draws call it — the painted branch in
`painted-art.js` and the primitive one in `drawPropBody` — so there is one crack in the game and not
two. It is a hairline that staggers as it goes, with a forking branch, a pale mortar lip a pixel over
and, once it has taken a blow, a wider gap with three chips of stone out of it. Everything about it is
derived from the tile's own position, so it is the same crack every frame. It was one four-point
zigzag straight down the middle of the tile, which reads as a bolt of lightning painted on the
stonework rather than as damage: the jitter on each point is an offset from the line rather than a step
added to the last point, because accumulated it wandered clean off the tile.

Once it is down the niche behind it **stays lit**. `carveSecret` returns the three tiles the gap
opens onto, the prop carries them as `nicheTiles`, and `revealRooms` sets them in `world.vis` every
step the wall is broken. The shadowcast is honest about a one-tile gap — from a step back it lights a
sliver of what is past it and shades the rest — which is right for a doorway and wrong here: the
whole point of the wall is what is behind it, and two blows spent finding out should buy the sight of
it rather than a dark patch you have to walk into to read.

**The way out is barred.** Every level now ends on an iron door standing in front of its stairs
(`stair: true`, `prop.door.stairHits`), placed by the generator right after it cuts the exit. Three
blows, no shouldering, and every blow is noise: the last thing a level asks is that you stand still in
the open with whatever is left of it walking toward you. Before it, the last room of a level was the
one room in it you could always simply outrun.

**Boons.** `game.mods` is recomputed from `game.boons` by `applyBoons()`. Every use site reads
`game.mods.X` rather than `TUNING` directly, so nothing mutates `TUNING` (which would leak across runs).
Adding a boon means: add it to `BOONS`, add its default to `BOON_BASE`, and read the mod at the use site.
Give it a `skill` (`butt` / `grab` / `roll` / `scream`) and it hangs off that button in the HUD rail; leave
`skill` off and it is body work, listed but attached to nothing. `needs` names a mod that has to already
be on before the card is dealt at all — the three grab boons need `grabMen`, because a card that needs
a verb you have not been given is a wasted card.

**Two of the four buttons start half-shut.** This is the whole progression and it is the one thing not
to undo. A goat out of a pen can run, put his head into things, get out of the way, pick up what is
lying about, and shout. What he cannot do is carry a grown man (`mods.grabMen`, BY THE COLLAR —
`tryGrab` simply does not consider enemies, and `game.reachedForAMan` says so once a level), and his
voice is a noise rather than a weapon (`mods.screamStun`, THE FULL THROAT, or `breath`, DRAGON BREATH —
the bare scream emits a `lure` noise, which is the one kind that walks a man to the spot rather than
only turning his head). That bare voice does one more thing at arm's length: inside `scream.balk`
tiles it **breaks a blow a man has already committed to** (`Enemy.balk`, `scream.balkStun`), which is
a great deal less than THE FULL THROAT — two bodies rather than a room, no stacking, and he is coming
at you again a blink later — but it means being caught close has an answer in it before a soul turns
up. The two things that cannot be called off once begun are the two `daze` already spares: a Butcher
mid-swing, and a wraith that has started to arrive. The lure is untouched and still goes out to
`scream.call`: one button, both jobs, at two ranges. The bare headbutt is blunt too: shorter reach, less throw, a recovery long
enough that a second man walks in on the end of it, and LONG HORNS and IRON SKULL are what put that
back. It is deliberately *blunt* rather than useless — a third of that cut was given back when the
first hour turned into a game about walking backwards. `drawSkills` reports the state of each —
`THINGS` before GRAB, `CALL` before BAAH — and `openBoonChoice` deals actives at 0.75 rather than 0.4
while either is still half of itself.

**The skill rail.** `drawSkills` (top right) is the only place the four verbs are reported: availability,
cooldown, and what the souls did to each. `skillIcon` draws each verb from `game.mods`, so an icon has to
change when a boon lands — Long Horns lengthens the horns on the icon and on the goat, Dragon Breath turns
the mouth into a cone, Loose Joints adds a second turn to the roll. Add a boon, draw its effect here.
What is written **under** a chip is the key that throws it — LMB / RMB / E / SPC — and not the name of
the verb: a caption you have read a hundred times has stopped saying anything and the key never does.
The name and the sentence live on `drawSkillNote`, the panel that comes up while the pointer is on a
chip (`renderer.skillHover`, set in `drawSkills` and drawn at the end of `drawUI` so it sits over the
column under it). Each row carries its own `note`, and the note changes with the mods: add a boon that
changes what a button does, change the sentence there.
The whole top band — the hearts, the rail, the count, the clock, the soul list — is sized
by `renderer.hs`, which is `ts` times `TUNING.hud.scale`. That is the one number to turn if the corner of
the screen is not being read; the cards, the menu and the floor text are on `ts` and stay where they are.

**Cooldowns.** Headbutt has none (its recovery is the cost). Throw does: `goat.grabCd`, set on every way a
man leaves your mouth, so grab is not a button you hold. Roll has its own. Both show on the rail and as
rings on the touch buttons; both read `game.mods`, never `TUNING`, at the use site.

**The room is real to what flies through it.** `Prop.hitProp(game, nx, ny)` is the one place a moving
prop — a thrown crate, a thrown blade or shield, a sliding table — meets the furniture: a lamp topples in
the direction it was hit, a gong rings, and anything else pushes the mover out and is as solid as stone
(a crate shatters, a sword snaps, a shield bounces, a table stops, or takes a door off if it is at
`table.killSpeed`). Bodies get the same treatment in `collideEntities`: a flung man arriving above
`lamp.knock` topples the lamp instead of dying on it, and a Butcher in state `'charge'` smashes a door
(`smash(..., by)` spares him the fling), shoves a table (`shove(..., by)` stops it turning on him),
topples a lamp, lights on a brazier, and is `chargeStopped` — the wall stun — by anything else. Anything
that comes to rest over a `T.PIT` calls `Prop.fall`, which is the silent version of `snap`.

**Coals.** `Prop.spill(game, ax, ay)` is the brazier's verb: a headbutt, a body arriving above
`physics.knockHitSpeed` (from the flung branch of `Enemy.update`) or a charge knocks a short pool —
`ignitePool` with `prop.brazier.spillTime` — out of the far side. `spillCd` gates it and `drawPropBody`
scales the flame by it, so the bowl reports its own cooldown. `game.touchingBrazier` returns the
brazier rather than a boolean; every old caller still reads it as truthy.

**A held man is in the room.** The held branch of `Enemy.update` checks `touchingBrazier` as well as
the tile; `Prop.updateMill` and `Prop.bite` no longer skip `held` and take him out of `goat.holding`
themselves, setting `grabCd` as `ignite` does. Nothing in the room may treat a carried man as absent.

**Fire is handed on once, and only once KINDLING is taken.** A burning man who touches another lights
him in `game.passFire`, called from the enemy-vs-enemy pass in `collideEntities`, but the whole method
returns at once unless `mods.firePass` is set — without that soul a brazier costs the room the one man
who found it and nobody else, which is the base case now rather than something every run already had.
With it, `ignite(game, witch, fromMan)` marks the man it lit with `litByMan`, and a man who was lit that
way never passes it on; the man who did it sets `passedFire` and cannot do it twice. So even with the
soul spent, a brazier costs a room two men rather than the whole room, which is the difference between
fire being a hazard and fire being a win button.

**Fire has two kinds.** `world.fire` holds seconds left, `world.fireKind` holds 0 for ordinary flame and
1 for the Seer's witchfire. Witchfire spreads as witchfire, draws violet, scorches violet and ignores
`mods.fireImmune`; `isWitchPx` is the test. Anything that lights a tile passes the kind through.

**The gong.** `Prop.ring` sets `goat.gong` to `TUNING.prop.bell.buff` seconds. While it runs, `Goat.update`
multiplies the three real cooldowns (`screamCd`, `grabCd`, `rollCd`) by `bell.cooldownMul` as they tick
and the top speed by `bell.speedMul`; `drawSkills` puts a draining strip under the rail. The noise it
makes is unchanged and is the price. `planEncounters` does not place it: the generator drops a `'b'`
marker unless the room's plan holds men, so it never lands in the pen — an
empty room was where it used to sit reading as scenery.

**A man in your mouth.** `goat.holdLimit` is rolled in `tryGrab` from `mods.holdTime` and
`grab.holdVary`, so every grab lasts a different seven-to-nine seconds. Two kinds go on working while
held, and the branch for them is at the top of `Enemy.update` above every other state: a Hunter fires
`enemy.heldShots` rounds (rolled once per man in the constructor, never refilled — re-grabbing is not
reloading) and then is dry, and a Seer paints a rune **on the ground he is over when he starts**, which
stays where it was put. It used to be dragged along under him, so the fire came up under the goat
wherever the goat had run to and carrying a mage was simply fatal; now keeping moving leaves a trail of
it behind you and standing still is what kills you. `castRune` is the one place a rune goes off, shared
by the held mage and the standing one; `fling` clears `rune`, which is still the fastest counter.
The same branch ends with the fire check, so **a man in your mouth burns like anybody else** and comes
straight out of it when he catches.

**Barks.** `game.bark(enemy, kind, chance)` is the only way to make a man speak. It enforces a global gap
and a per-man cooldown, so a crowd never shouts at once. Lines live in `BARKS` in `tuning.js`; the bubble
is drawn in `drawEnemy`. `bark.gap` is twice what it was and `perEnemy` half again, because a room that
answers every event out loud stops being read at all and the two lines that matter — a rifle calling
the line, a man saying he has seen you — were lost in the chatter.

**His voice.** `GameAudio.bleatVoice` is the goat: a sawtooth put through two vowel formants, shaken
at `wob` Hz and falling away at the end, with the first formant opening over the call so it travels from
a *bèh* to a *baaah*. `sfxScream` is two of them a fifth apart, `sfxBleat` is one of them small and
frightened, and every sheep in the game speaks through the same throat. Before it, the scream was a
sawtooth with vibrato on it, which is a siren and not an animal. Add a new animal sound here rather than
building another one-shot from `tone`.

**A body is part of the room.** `game.flungHits` is where one body arrives on another. A man out of
your mouth kills whoever he lands on and carries on — he is the weapon. A man off your horns kills too
if he is still travelling at `physics.bodyKillSpeed` when he gets there, and at `physics.splatSpeed` —
the speed a wall kills at — the man who was thrown dies with him. Below that it is the old bowling-over:
both floored, both up again. Two men standing shoulder to shoulder used to be the safest place in the
room, which read as the game saying a man is not part of the geometry. He is.

**Room music.** The default score now uses the current room's small, ranged, large and mystical
enemy counts, capped at six per family, plus fire within four tiles. `GameAudio.updateScene` samples
the game once per frame (throttled internally); one 16-bar transport plays interlocking voices with
beat-aligned changes and smooth envelopes. See `MUSIC.md` for the mappings and extension points.
Large enemies have a two-hit bass signature. Levels 5+ use `LATE_MUSIC` with distinct idle/combat
melodies. Fire area adds crackles with a two-bar memory; nearby healing grass adds a chime with a
one-bar memory. Both clear outside play. SETTINGS → LAYERED MUSIC off selects the preserved
original `playLegacyStep` arrangement below.

**How loud the original drums get.** `game.update` counts the men who are awake, near and not mist, and
`TUNING.audio.crowd` is where the two steps are: up to `warm` it is the motif and the toms, up to `hot`
the kick and the hats, past it the whole kit. It used to go to the top on five, which is an ordinary
room from level three on, so the loudest music in the game played through most of the game and a real
crowd had nothing left to sound like.

**Juice.** `game.kick(dx, dy, amt)` shoves the whole picture (capped at `juice.kickMax`), `zoomPunch`
drives the lens, `flash(color, amt)` paints an additive overlay, and `gore` throws chunks that stain the
decal canvas when they expire. The renderer applies kick and zoom in `draw`, and everything decays in
`updateEffects`.

**Difficulty.** `THREAT`, `ENCOUNTER` and each level's `encounters` block in `tuning.js` are the whole
model; `planEncounters()` in `gen.js` turns them into a per-room plan before anything is placed, and the
generator only finds floor for what the plan says. Two rules it enforces:

1. *Met alone.* A kind's first appearance in a run is a room holding one of it and nothing else — a
   first-of-its-kind boss gets no escorts either. `levelDef.met` (computed once under `LEVELS`) carries
   what earlier levels already showed, so a kind is introduced once a run rather than once a level.
2. *Threat, not bodies.* A room's budget comes off the level's curve (`from` → `to`, bent by `ease`) and
   is spent on whatever has been introduced, capped per kind and per room. A level is harder than the
   last because its two numbers are bigger.

**Milk.** `heals` on a level definition is a floor, not the count. The generator takes
`max(levelDef.heals, ceil((rooms - 1) / TUNING.prop.heal.every))`, cuts the level into that many bands
measured **in rooms rather than in eligible rooms**, and gives each band the ordinary room nearest its
middle. A run of arenas and set pieces can no longer stretch the dry spell: the worst gap on any level
is five rooms. Only the tile inside the room is random — and it is scored rather than rolled for: clear
of the furniture, and a wide berth from a brazier or a lamp. It was the one scatter in the generator that
checked the tile and nothing else, so a bowl could be laid down on top of a brazier. A narrow room gives
up the clearance before it gives up the berth, and the last resort is the tile furthest from the nearest
flame, because the band is promised a bowl. `GEN_RULES.milk` fails a level that puts one in a fire.
It reads as sprouted grass now rather than a bowl of milk, and it is grazed rather than grabbed: the
kind is still `'heal'` throughout the generator and the rules (nothing above changed), but walking
across one no longer banks the heart on contact. `Prop.graze` is seconds spent standing in it, near
enough and under `heal.grazeSpeed`; it climbs while the goat holds still there and bleeds back down
otherwise, and only pays out — `+1 HEART`, same as before — once it clears `heal.grazeTime`. Running
through on the way past does nothing, which is the point of it.

Change any of it and run **`node tools/balance.js`**: it prints the curve room by room and exits non-zero
if a kind arrives in a crowd first, a cap breaks, threat stops rising inside a level, or a level is not
harder than the one before. Adding an enemy kind means: a `THREAT` value, an `ENCOUNTER.weight`, usually
a `cap`, and an `introduce` entry on the level that first shows it.

**The second axis: what the floor is worth.** `groundOf(tpl)` in `rooms.js` is one number per room
template — the fraction of its floor with nothing solid within a step, measured off the legend itself
(`HARD` is wall, pillar, brazier, lamp, table, drop; hay is not, because a man lands in straw and gets
up, and neither is a crate or a rack, because you pick those up, or a grate, because trap rooms are
their own pool). 0.06 is `cloister`, all pillars; 0.68 is `flanks`, a yard. It is memoised onto the
template, carried onto the generated room across the flip (a mirror cannot change it) as `tpl.ground`,
and read out by `roomsOf` for the rules, the report and the room sheet.

The curve used to buy only men, so the only thing a late room could be was a fuller one — which is
the one way of getting harder that pillar 3 says the least about. Now `draw` in `tryGenerate` sorts
both pools by ground and walks a level along it: how far into the level a room is says where in the
sorted pool to look, and it takes at random among the `GROUND.window` nearest entries that fit the
width budget and have not been spent. The window is what keeps it a tendency instead of a running
order — two seeds of a level are still two levels, and the rule that holds it is an averaged one.
Measured over forty seeds it moves the floor +18 to +25 percentage points from the first third of a
level to the last, on every level that has enough rooms for the question to mean anything.

`room.drawn` is whether the draw chose this room's shape at all. A set piece, the two teaching rooms
and a trap room are forced or dealt from a pool of their own, so none of them is the generator
keeping this promise — `GEN_RULES.ground` and the report both filter on it, and level one (six
ordinary rooms, two of them forced and one a trap) correctly has nothing to say. `pressure` is
`threat * (1 + ground * GROUND.weight)`: threat against the ground it is on, which is what a room
actually asks. On BALANCE a bar is threat and the **hollow top of it** is ground — drawn as absence
rather than as more paint, because an added pale cap was invisible on the pale bars the mix rooms
already use. THE THRESHING FLOOR's bars are visibly mostly hollow and THE ALTAR's are solid, which is
the two levels' own canons read back off the curve.

**The cheapest man is not the filler.** Every kind has a cap; the clubman never did, so he was
whatever a big budget had left once the others were full, and a room on the late curve came out as an
early room with four more of him in it (THE RAFTERS was running seven bearers in a room of nine).
`ENCOUNTER.cheap` is his own cap and it is the only one that *tightens* as the budget grows — `max`
of him under `full`, down to `min` by `none`. Never zero: a clubman is still a body to throw another
man into. It does not touch a room handed its own head count, so the Great Hall is still the wall of
bodies it is supposed to be, and an escort's budget is too small for it to reach. Threat did not drop
when it landed — it *rose*, because the budget now has to be spent on quality (RAFTERS 178 → 186,
OSSUARY 201 → 207), and the clubman share of a rich room went from roughly seven-in-nine to 21–34%.
`GEN_RULES.crowd` is what says so.

**The door that is already closing.** `prop.door.clockFor` seconds, on some of the iron corridor
doors from level three on (`levelDef.clockDoors`), and it is the only door in the game that is on
your side to begin with. It **stands open** — `open` is 1, and `blocking`/`opaque` both read `open`,
so while the count runs it is not in the room at all — and it shuts itself. Beat it and you paid
nothing and it falls shut between you and whatever was chasing you; miss it and it is an ordinary
three-blow iron door and you pay standing still in the open, which is what every other iron door
charges anyway. It is the one place in the **world** rather than in the score that says *run, don't
fight*, and the count is matched to that: it becomes a wall at 9 seconds, which is `score.perRoom`,
one room's par. Beating par is what buys the free way through.

Four things about it are load-bearing. It closes on a curve (`clockEase` under 1), holding near-open
for most of the count and slamming at the end, because a door creeping shut at eight degrees a second
is a door nobody notices is moving. It **will not shut on anybody** — a body in the gap holds it a
hair over the blocking line, so the crowd on your heels props your own way out open for a moment, and
it seats as soon as the gap is clear. It **lights itself** while the count runs, the same way a broken
secret wall lights its niche and for the same reason: the fog is the width of a doorway, and an offer
you cannot see across a dark room is not an offer — once it seats it goes back under the shade like
any other door. And `gen.js` takes the flag back off any door whose room turned out to hold fewer
than two men, or which is the room that introduces a kind or the quiet beat after one: a count running
down in an empty room is a timer with nothing to beat, and a door shutting on the one room a level
asks you to stand and look at something in is the level arguing with itself. `game.clockTold` says
IT IS CLOSING once a run. `GEN_RULES.clock` holds all of it.

**Canons.** Every level is about one thing, and `levelDef.canon` — `{ id, name, idea }` — is what: STONE
on THE ALTAR, FIRE on THE YARD, THE LINE on THE ROAD, OPEN GROUND on THE THRESHING FLOOR, THE FUNNEL on
THE BRIDGE, THE DROP on THE RAFTERS, THE NICHE on THE OSSUARY. A `ROOM_TEMPLATES` entry carrying
`canon: '<id>'` belongs to that level's pool, and `pickCanonRooms` hands at least `CANON.share` of the
level's ordinary rooms (`ordinaryRooms`: not the pen or a set piece) to it, on an even
spread that always starts with the first ordinary room — a level says what it is about on the first
floor you fight on. The rest are the mix: the untagged templates plus the canons in `levelDef.known`,
which the block under `LEVELS` fills with the canons of every earlier level, so a room never shows an
idea the run has not reached. `room.role` is the one word that records the decision — `pen`, `calm`,
`canon`, `mix`, `trap`, `arena`, `mill`, `hall`, `gallery`, `killbox` — and it is what the RULES page
and `tools/balance.js` read. `draw` in `tryGenerate` is the width budget: the mix holds the yard's
thirty-tile rooms from level five on, and a template wider than its fair share of what is left (the
set pieces still ahead subtracted) is passed over for the next one that fits, which is what keeps a
sixteen-room level inside a 420-tile world. THE RAFTERS' five rooms are still deliberately narrow — an
edge you can walk a long way round is not an edge — and THE THRESHING FLOOR's `corridorW: 5` still
widens the S-corridor so its rooms read as one yard; a wide corridor deliberately eats the room borders
it passes through, which is why that level needs furniture to keep kills coming from geometry. A canon
needs `CANON.minRooms` templates written for it or the level is the same floor twice. Adding a canon
means: `canon` on the level, `canon: id` on four or more templates, and nothing else — `known` and the
mix follow.

**The level tool.** `LEVEL TOOL` in the dev drawer opens a page over the whole screen — `dev.rules`
holds the simulation (`update` returns at once) and `hitDev` swallows every click and key under it.
It has three tabs (`dev.tab`, drawn by `drawTool`), and the split is general / particular / whole
game, so that nothing is said twice and each tab gets the screen:

- **RULES** (`drawRuleTab`) — every rule against every level as a matrix, one row a rule and one
  column a level, off `game.ruleMatrix` (one sample per level, `game.levelSample`). A rule is a
  promise about the generator rather than about a level, so what you want is the row: six levels
  keeping it and one not. The first level that breaks one says why, under it.
- **LEVEL** (`drawLevelTab`) — one level on the whole screen: its canon, its numbers out of
  `levelFacts`, the rules that have something to say about *it* as a line of marks, and every room
  it built as a floor plan. It used to share the page with the rules, which took half of it to say
  things that are true everywhere.
- **BALANCE** (`drawBalance`) — what `node tools/balance.js` prints, computed by
  `game.balanceReport`: every level over `dev.balanceSeeds` seeds (SEEDS cycles 4 / 8 / 16 / 30),
  as a row of bars. A bar is a room **at its real width and its real place in the world**, so the x
  axis is the level's ground and the size of a level and of its rooms is the shape of the row; the
  height is its averaged threat and the count of men rides on it. Beside each row, the two numbers
  that decide whether a level is in the right place in the run — its total and its worst *ordinary*
  room. It runs `checkRules` on every seed on the way past, and the two averaged rules (threat
  rising, each level harder than the last) are checked here and in the report and nowhere else.

**Going deeper.** A room tile on LEVEL and a bar on BALANCE are the same button: both push
`dev.room` and open `drawRoomSheet`, the plan at whatever size the screen allows with a grid over
the tiles, a name against every man, and a column saying what the floor is made of, who is standing
on it and what is standing in it. Both halves read `game.levelSample`, so the room the curve opens
is the room the level page was showing.

The page has its own address: **`#rules` and `#balance`** open the game straight onto that tab, so
the tool can be linked to — `http://localhost:8766/#balance` against `node tools/serve.js 8766`.

`js/rules.js`
is the page's whole content and it is written once for two readers: `GEN_RULES` is every promise the
generator makes, each with a `check(level)` that answers true, a string (why not) or null (nothing to
say about this level); `checkRules` runs the list; `roomsOf` reduces a level to rooms with roles, men
and threat; `levelFacts` reads a `LEVELS` entry out as lines, so the page cannot drift from the
numbers. `tools/balance.js` runs the same `checkRules` over many seeds, which is why a rule lives
there and nowhere else. The page shows the level in play as it stands; any other tab is a sample the
page generates from `dev.sampleSeed` (`game.rulesPage`) and REROLL reseeds it, so every level can be
inspected without playing up to it. `drawRules` in `render.js` paints it: fire for a rule that holds,
blood for one that does not with its reason under it, ash for one that does not apply.

A level is shown as pictures rather than as words. Every room is a tile carrying its floor plan
(`roomPlan`, drawn off the **generated** level rather than off the template, so corridors, grates and
the vault's door are in it), with its index and role above, `×N` for the men in it, its size and
template under it, and the canon tiles lit. Names are the last resort and the prose is one line per
rule: the page is a thing you scan while a level is paused behind it, so a shape beats a sentence and
`levelFacts` reads out as `name value` and not as English.

**Trap rooms.** `tag: 'trap'` is a pool of its own, drawn *into* a level's ordinary rooms rather than
instead of them: `levelDef.traps` is a count, `pickTrapRooms` chooses the indices (never the pen, a
set piece, the ambush room, or the first two ordinary rooms, which are where kinds get introduced) and
the room carries `isTrap`. `planEncounters` still buys its men off the curve but never introduces a kind
in one — `plain` is `ordinary` minus the trap rooms — and the random spike scatter skips them, because a
shape on the floor plus three plates thrown on top of it is not a shape any more. A template may declare
`needs: 'spikes'`, and is then only drawn by a level whose `levelDef.spikes` is set, so no floor grows
teeth on a level whose floor does not. `'S'` in a template is a plate, the way `'B'` is a bowl of coals.

**The pen.** Cage bars are ordinary `Prop`s of kind `cage`, built by `buildCage` in `gen.js` and exempt
from the three-tile prop clearance around the start. It takes `prop.cage.hits` blows — seven — the
**first time a browser ever does it**, and `prop.cage.againHits` — two, with no fall and a two-line
`againStrain` — every time after: `game.penBroken` is the flag, written to `PEN_KEY` by
`game.notePenBroken` on the blow that opens it, and the pen is a lesson rather than a toll paid again
on every restart of level one. One
headbutt can reach two or three bars at once, so `breakCage` counts blows and not bars by gating on
`game.cageLunge === goat.lungeId`. Each blow bleats a line from `prop.cage.strain`; on the blows in
`prop.cage.stunAt` the goat is put on the floor by `game.stunGoat`. The last blow breaks every bar and
sets `game.cageOpen`, which is what hides the floor prompt. Only levels with `startCage` get one.

Two tiles of it are bedding. `START_TEMPLATE` carries `hh` on row four, which `buildCage`'s
`cage.halfW`/`halfH` around the middle of that room puts **inside the bars** — and on row four
because the template is flipped vertically as freely as any other and four and six are the same
distance from the middle. A pen with straw in it is somewhere animals were kept; a pen with nothing in
it is a rectangle of iron. It has to be tiles rather than props, because `cleanProps` throws out
everything but doors and bars within three tiles of the start.

**Which side the dead come from.** Every wraith rolls `enemy.approach` once in the constructor: a signed
angle between `wraith.behind + wraith.flank` and π, so it drifts to a point on your shoulder, your
flank or your back, left or right, but never your front. `updateWraith` uses `look + this.approach`
rather than `look + π`, and the drift wobble is clamped to `|approach| - behind` so a shoulder approach
can never wander into the cone it is not allowed to manifest from. Three of them no longer queue up in
the same place behind you — they surround you.

**The wraith, and what "not there" means.** `Enemy.ghosted` is `kind === 'wraith' && !solid`, and it is
the question every single thing that reaches for an enemy has to ask: headbutt, breath, grab, thrown crate,
thrown blade, bullet, Mill arm, door, table, bomb, scream, fire, entity collision, friendly fire, the
roll's threat sense, the music's threat count and the health notches. Mist also skips `collideCircle`,
which is how it crosses walls. `updateWraith` drifts it to a point `wraith.standoff` tiles behind the
goat's *facing* and calls `manifest` only when it is past `wraith.behind` radians off that facing, within
reach, off cooldown, and **not standing in a wall** — a body cannot form inside stone, which is the one
thing the ground still does for you there. From `manifest` it runs `manifest → windup → swing → solid`
on timers and cannot be interrupted: `daze` on a wraith freezes it where it stands instead of cancelling
it (the shared dazed check stops the timers, so a scream lengthens the window rather than ending it).
`unmanifest` puts it back to mist with `fadeCd`. It dies to anything that lands in that window, its
`die` leaves no blood, body or scorch, and a boss with hearts left goes straight back to mist instead of
lying floored. `game.mistTold` is the only tutorial it gets.

**Goat stun.** `goat.state === 'stunned'` is a real state, not a render pose: `Goat.update` returns early
while it lasts, so there are no verbs, no aim and no momentum, and `goat.dazed` draws the stars over it.
`game.stunGoat(seconds)` is the only way in, and the pen is the only thing that uses it.

**Words on the floor.** `CONTROL_LINES` in `render.js` holds four blocks and `level.controls` says where
each goes. **Every block lies in the room that hands you the thing it is about, and none of them lies
in an empty one** — there are no empty rooms any more. There used to be two, immediately after the pen,
one saying `WASD` and one saying `GRAB`, and they were read, nodded at and connected to nothing: the
first player we watched got all the way to the wheel without working out that the men could be hit.
Level one is ten rooms rather than twelve because both of those rooms are gone, and the count of
*ordinary* rooms — and so the whole difficulty curve — is exactly what it was.

- **Block 0** — `WASD — TO MOVE`, in the pen, a tile under the bars and just above `cagePrompt`, the
  prompt that says which button opens them. Moving means moving inside a cage, which is where
  everybody starts pressing keys anyway.
- **Block 1** — grab and throw, in the ambush room: a blade inside the door, a crate a step past it,
  the men down the far end.
- **Block 2** — the headbutt, on the floor the first man of the run is standing on (`lessonRoom` in
  `gen.js`). **One line.** It carried the wall line and `BUTT HIM` as well and was three lines stacked
  in a room five tiles deep; what a wall does to a man is the whole of level one and it is learned by
  doing it there, not by reading it.
- **Block 3** — the roll, plus the point-blank scream parry (`CLOSE UP IT BREAKS THEIR SWING`):
  neither lives with its own verb's room, because a line about dodging or about a parry means nothing
  painted on a floor with nothing on it to dodge or parry. `gen.js` takes the room closest to the
  level's own middle that already holds a small crowd (`rollCandidates`, next to where `controls` is
  built), skipping the lesson room, the vault's room, a trap room and the ambush room — that last one
  because block 1 is already painted there and a three-tile corridor will not carry six lines. With no
  crowded room left it falls back to the fullest room that has anybody in it at all, because an
  unpainted line is worse than a line with one man under it.

Each block has a keyboard and a touch wording; add a line to one and add it to both. `GEN_RULES.lessons`
holds all of it to the promise: four blocks, the sentry in a `lesson` room on his own, the ambush room
built from `AMBUSH_TEMPLATE` with a sword and a crate in it and nobody on the near side. The teaching
floor is the one place the generator may not surprise anybody, and that rule is what says so.

A level's own `hint` is the other half of it: `gen.js` paints it across the middle of the first room
carrying that room's width, `drawHints` breaks it over two lines (`wrapFloor`, at the full stop it
already has, or at the space nearest the middle) and shrinks it to fit (`fitFloorText`), so a long line
no longer runs off both ends of the room it is lying in. A `hintKey` on the level definition — one of
the four skill ids — paints the button under it from `HINT_KEYS`, keyboard or touch. A hint that names
a verb should carry the key for it; one that names the ground should not.

**The first screen.** State `title`, drawn entirely by `drawTitle` and holding the rows of `MENU`
(`tuning.js`, which is where the order of this screen lives) and nothing else: the opening scene tells
the story and the floor of level 1 teaches the buttons, so the menu explains neither. `game.menu` is `{ index, rects, t, shake, panel, sub }`; `drawTitle` refills `rects`
every frame and `menuAt` / `menuPick` are the only ways in, from a pointer (hit-tested in `pointerdown`
like the soul cards) or from the keys the game already uses (`menuKey`: W/S or the arrows to move,
SPACE or ENTER to choose). NEW GAME wipes the save and plays the opening scene; CONTINUE is dark and
shakes its head until there is a run to come back to; LEVELS, BEST and SETTINGS raise `menu.panel`, and
while a panel is up it owns `menu.rects` entirely, so nothing behind it is clickable. LEVELS
(`drawLevelPick`, `game.startAtLevel`) is a way straight onto any floor of the game: it deals the souls
a run would have banked getting there — the sum of `def.souls` before it, drawn at random and honouring
`needs` — because a goat who is still the goat out of the pen on level five is a different and much
worse game. It touches neither the saved run nor the board. The board is put away by
anything at all; the switches are not — a click on a row throws that row and only BACK leaves, which is
why the hover lands on `menu.sub` rather than on the menu underneath. `drawTitle` paints the whole
canvas, vignette and empty thumb deck included, so nothing from the play view shows through.

**Settings.** `SETTINGS` in `tuning.js` is the list, `game.settings` the values, `SET_KEY` the
`localStorage` slot, and every read and write is wrapped like the rest of them. Two switches, both
things the game is better off not doing by default: **SHOW THE CLOCK** (off — a number climbing in the
corner of a game about running turns the run into the number, and the level card reports the time
either way) and **SOUND**, which is the same switch `M` throws. Adding one is a line in `SETTINGS` and
a line at the use site; nothing else reads them.

**The fog, and its two halves.** The first half never moves: `room.seen` starts false on every room but
the first, `game.revealRooms` sets it when the goat's own tile is inside the room's box widened by one —
so a room opens as you come through its wall, not after it — **or** when he can see into it, which is
`World.anyFloorSeen(room)`: any *floor* tile of it lit by this step's shadowcast, the wall tiles not
counting, because seeing the outside of a room's wall is not seeing the room. It is never re-hidden. `drawUnseen`
paints the unopened rooms out in `def.fog` after the floor, the blood, the holes and the firelight and
before anything that stands on them, and the draw order filters props, men and bullets through
`game.hidden`. Corridors are never hidden: they are two tiles wide and what you can see down one is a
doorway. The point is that a room used to be readable from twenty tiles away, so every room in the game
gave the same length of warning; now the warning is the width of a door.

The second half moves with him. `World.computeVis` is a symmetric recursive shadowcast (`castVis`, the
eight octants of `VIS_OCTANTS`) run every step from the goat's own tile out to `TUNING.fog.radius`, and
it fills `world.vis`, one byte a tile. `Renderer.drawShade` builds a mask of that at `fog.res` pixels a
tile on a small offscreen canvas and blows it up over the world with smoothing on — so the edge of a
partition's shadow is a gradient rather than a staircase of squares — at `fog.shade` alpha, **last of
everything in world space**. So a pillar, a stub wall or the corner of a room hides what is behind it
until he steps round to where it can be seen from, and a man standing back there is not culled, he is
simply not lit. Nothing else in the game reads `vis`: the cult's eyes, ears and flow field are
untouched, and a man in the dark still hears you and still comes. It costs about 0.01 ms a step.
`startLevel` primes it next to `computeFlow`, and it is skipped during the opening scene. What the cast
stops at is stone **plus** `world.visBlock`, a tile mask `revealRooms` rebuilds each step from the opaque
half of `game.sightBlockers` — every tile the thing actually covers, not the one its centre is in, because
a door hangs across both lanes of a two-tile corridor and blocking half of it leaves a clear line down the
other half. A shut door was a wall to the cult's eye (`game.sees`) and see-through to the goat's; it is a
wall to both now.

**Nothing that is not on the screen lands a blow.** `game.meleeHit` and `game.fireBullet` both return
early on `game.hidden(attacker)`. A man inside a room nobody has opened is not drawn at all — the fog
paints his whole room out — and he could still reach out of the black and club you, or shoot you out of
it. He may walk, he may shout, he may come and find you. He may not hit you from a place the game is
refusing to draw. Reveal-on-sight makes it rare; the gate is what makes it impossible.

**Score, and the board.** `scoreFor(kills, time, levelIndex)` is the only place a score is computed:
pace against par (`rooms * score.perRoom`, capped at `fastCap`) times a kill multiplier (`killMul`,
capped at `killCap`). Time is the axis and kills only multiply, so nothing about the score argues with
*run, don't fight*. `levelCleared` scores the level, adds it to `game.totalScore` and offers it to
`noteBest`; the win card reports the sum and offers it to `noteRunBest`. The board lives under
`BEST_KEY`, separate from the run on purpose — `clearRun` never touches it, so a record outlives the
run that set it. Every read and write is wrapped: a browser that refuses storage shows an empty BEST
rather than breaking the menu.

**The soul cards.** `takeBoon` is reachable from three places and all three are explicit: Digit1/2/3,
and a pointer that goes **down and up on the same card** (`boonDown` holds the index it went down on,
`boonAt` hit-tests `boonRects`). `boonArm` (`TUNING.boonArm`) makes the cards refuse everything for a
beat after they appear, so the click that killed the boss cannot spend what he dropped. Nothing
selects on hover, and nothing selects on a press alone.

**What a death costs.** The level, not the learning. `startLevel` snapshots `game.levelBoons` from
`game.boons` and `restartLevel` comes back with **exactly** that list, so everything the goat walked in
carrying stays. It used to come back one short, which meant dying on the level that had just rewarded
you cost you the reward and a bad run only got worse. What a death still takes is a soul found *inside*
the level: the layout is generated again and it is back where it was, guarded by whoever was guarding
it — which is also why a death is not a way to farm one. `onGoatDied` names what was kept rather than
what was lost, because a card is the only place the player finds out that he keeps it. Nothing else may
reset `boons` on a death: `restartLevel` passes `keepBoons`.

**One seed a run.** `game.runSeed` is the run, and `game.levelSeed(i)` derives every level's out of it
(`runSeed`, the level index and `deaths` through a small integer hash). The corner has shown the
level's own seed for a while, which is enough to report a bad room and no use at all for handing
somebody your run: every level of it used to be a fresh `Math.random`, so nothing but that one floor
could ever be got back. What the corner shows now is the run's, in base 36 — five characters, because
a player has to be able to pass it on — and **`#seed=k3j9a` is how it is typed back in**: NEW GAME and
LEVELS take `askedSeed` off the address instead of rolling one, which is why there is no text field
anywhere in the game and does not need to be. `deaths` is in the hash on purpose: a death still
regenerates the level, so it is not a way to learn a layout, and that promise is now kept by
arithmetic rather than by a fresh roll. `saveRun` carries `runSeed`, so CONTINUE is the same run; a
save written before any of this existed has none and gets a fresh one rather than nothing.

**The saved run.** `saveRun` writes `{ v, level, boons: [id], totalKills, deaths, score, runSeed, at }` to
`localStorage` under `SAVE_KEY` at the head of every level and again whenever a soul is taken; `loadRun`
refuses anything of another version or off the end of `LEVELS`, and every call is wrapped, so a browser
that refuses storage simply never offers CONTINUE. Winning clears it. CONTINUE re-enters the head of
that level with those souls and a fresh seed — the layout is generated again, as it is after a death.
Boons are stored by `id`, so renaming one in `BOONS` silently drops it from old saves.

**Before the pen: the prologue.** Three flat screens run ahead of the pen scene so the pen is the end
of something rather than the start of nothing — a meadow, the back of a truck, and the dark — and
then the sacking comes off. They are intro phases like the rest (`meadow`, `road`, `dark`, `cloth`,
then `huddle`), `game.inPrologue()` says which, and everything they own sits in `intro.pro`: its own
clock (`pro.t` / `pro.sceneT` — `it.t`, which paces the pen's camera creep and skip prompt, does not
start until the pen is on screen), two lightweight stand-ins for the sprites that `drawGoat` /
`drawSheep` draw as themselves, the heart, and the last word said. `updatePrologue` drives positions
and bleats; `Renderer.drawPrologue` paints the screens in screen space inside a transform squashed
by `TILT`, so the sprites' own counter-squash stands them up. Every number is in
`TUNING.intro.prologue`.

The meadow has two halves and the halves are the point: until `meet` they are at opposite ends of
the field on a loop each, calling to nobody; over `close` seconds the two loops become one with her
a little ahead on it, the heart comes up between them, and from there a call gets its `answer`. The
through-line of all three screens is the bleats — `bleat.meadow / road / dark` is the gap between
them, and it closes as the run goes on, so what was two animals calling across a field is by the
dark two animals calling into nothing. `skipIntro` from any prologue phase goes to the same `black`
the pen's skip does, and nulls `pro` on the way. It is the first version, drawn to be replaced: a
fence is two rails and some posts, a truck is three boxes and two circles.

**The opening scene.** It cannot be skipped until a browser has watched it through once: `SEEN_KEY` in
`localStorage` gates both the skip in `updateIntro` and the CLICK TO SKIP line in `drawIntroOverlay`,
and `endIntro` is what writes it. `skipIntro(true)` is unconditional so the harness still works.
Every beat is in `TUNING.intro` — `huddle`, `arrive`, `gate`, `gateHold`, `lunge`, `fade`, `black`,
`wake`, and the `walk`/`run` speeds the two men move at, with `push` the camera creep. Nothing in
`updateIntro` carries a literal duration any more.

`game.beginIntro()` runs in the real level 1 with the real pen, in state `intro`,
driven by `updateIntro` and one method per beat (`introHuddle`, `introApproach`, `introGate`,
`introGrab`, `introClub`, `introFade`, `introBlack`, `introWake`). Everything it owns lives in
`game.intro`: the sheep, the heart, the two men, the gate bars. The men are ordinary `Enemy` objects
with `scripted` set (their `update` returns at once, so anything that ages on them, such as a bark, is
aged by `updateIntro`) and `knife` on the one who carries the knife; they are moved with `followPath`
and speak with `say`, which bypasses the crowd rules of `bark`. The gate is the three `v`-axis bars on
the right of the pen; `prop.gate` (0..1) lays a bar flat in `drawPropBody`. The goat is moved by hand
too; `goat.state = 'ko'` is a render pose only, `goat.dazed` draws the stars, `goat.jitter` the tremble.
`skipIntro()` jumps to the dark, `skipIntro(true)` straight to play, and `endIntro` resets the goat and
removes the men. Only `startLevel(..., withIntro)` from the title or the win screen plays it; the
`ritual` flag on a level definition is what makes the first room the ritual room at all.

**The drop.** `T.PIT` is the one tile that is neither floor nor wall. `isSolid` is false for it — the
goat has to be able to walk in — so everything that must not walk in is kept out somewhere else:
`World.walkable` keeps the flow field out of it (and `walkableAt` stops a man cutting the corner of
one), and `hazardAt` reports it as a trap so a man steers round the lip the way he steers round the
wheel, failing his `trapSense` roll now and then and going over. `Enemy.update` kills anything standing
over one at the top of the method, before any state branch, so a flung body is as gone as a walking
man; cause `'fall'` skips the two-hit absorb and leaves no body, no blood and no scorch. The goat gets
`goatFalls` / `updateFall` and the `'falling'` state (a real state: `Goat.update` returns early in it),
and pays `TUNING.fall.damage`. Nothing burns over a hole and the renderer draws pits in `drawPits`
**after** the decals, so blood never lies across one.

Where he comes back is `goat.safeTrail`, a few seconds of the non-pit points he stood on: `goatFalls`
reaches back `fall.setback` (0.35s) into it so he lands with room behind him rather than flush with the
lip that just took a heart, and `fall.invuln` (1.5s) gives him a moment to notice. **Every candidate is
tested against the floor before it is taken**, with `Game.groundNear` — nearest non-pit, non-solid tile
centre — as a last resort that cannot fail. Handing him back a point that is itself over a drop makes
him fall again from where he was returned to, and again, until his hearts run out; the trail only ever
records safe ground, so in ordinary play the first candidate answers, but the check is what makes that
a guarantee rather than an assumption. For the same reason the landing is latched on `goat.landed`
rather than on his position differing from the one he is headed for: on the fall where those two
already matched, the old test silently skipped the whole block — no damage, no move, and the goat left
standing in the hole.

**What is under a hole.** A hole used to be a flat black square, and from directly above a flat black
square is also what a pillar looks like — people were reading one as the other. There is a landscape
under them now: `throughHoles` clips every visible hole of a kind into one path and paints the ground
a long way down through all of them at once, laid out in a space shifted by the part of the camera the
far layer does **not** follow (`DEPTH.below` / `DEPTH.night`), so it slides against the lip as you run
past. Parallax is the only cue that says *down* on a flat top-down picture and it is doing all the work
here; the roofs, the rubble and the torches are only there to have something for it to move. `farHash`
keeps the landscape the same landscape every frame. The rim is a gradient (`rimShade`) rather than a
hard band, because a hard band reads as a border drawn round a black tile.

**Windows.** `levelDef.windows` is the chance a room gets one, and only THE RAFTERS has it: a hole in a
wall is a drop, and the drop is that level's one new thing. `carveWindow` cuts a run of three to five
tiles through the wall band along the top of a room — wall above it, the room's own floor below it, so
it can be seen and walked into from inside — turns them to `T.PIT` and records them in `level.windows`,
which is the **only** way `drawPits` tells a window from a hole. It used to guess from the tiles around
it, and that guess never once answered yes: the renderer had known how to draw a window since the drop
landed and the generator had never made one, so the level's own note promising "windows out into the
night" was describing something that did not exist. A window is a drop like any other — walk into it,
or be shoved into it, and you go out of it.

**Going down.** An enemy over a hole dies at the top of `Enemy.update`, in one frame, and always did.
What is new is that you get to watch it: `game.spawnFaller` keeps a picture of him in `game.fallers`
for `fall.showFor`, turning over, shrinking and fading, drawn by `drawFallers` straight after the pits
so he is inside the hole and under everything else. Nothing in it is simulated and nothing in it can
be interacted with — he is already dead — but a body that simply stops existing reads as a bug rather
than as a drop. `sfxFall` is the sound, and it keeps falling after he is gone.

**The grating.** `kind === 'spike'`, driven by `updateSpike`, cycling `idle → armed → up → down →
rest`. **Anything alive on it trips one** — `Prop.tripped` is the goat within `spike.trigger` tiles or
any man who is not dead, not held and not mist. It used to answer to the goat and nobody else, which
made it a tool with a switch on it: a man could stand on the boards over the teeth all day, and the
grate was a thing you led him onto rather than a thing in the room. Either way the teeth come up a
beat late, which is what keeps it *behind* you at a run and under whoever is on your heels. A wraith in
mist is the exception, because nothing under the floor reaches something that is not there. `bite`
kills men and costs the goat a heart, `this.bit` stops one rise biting the same man twice, and
`spikeThreat()` is what `hazardAt` and `avoidHazard` ask — a grate at rest is floor and is skipped
entirely. It is drawn as a tile of iron grating sunk into the boards with four dark slots in it, and
that is the whole of the art direction: it has to read as *a piece of floor that is not floor*. It was
a plate flush with the boards (a seam nobody could see) and then briefly a crate (an object, which said
the wrong thing — you cannot pick it up). `spikePatch` in `gen.js` lays `spike.run` of them as one band
that walks along an axis and bends, never as a scatter: `levelDef.spikes` is the per-room chance and a
room that gets them gets nine to fifteen, because a single grate is stepped over without being noticed
and a stretch across the middle of a room is ground you have to decide about.

**The hen, and the only thing in the compound on your side.** A `coop` is two tiles of slatted crate
standing about in the stores of the early floors (`levelDef.coops`, a per-room chance, levels two and
three only — level one is unset, none at all, because a room built around the goat's own head is not
the room to also be teaching an ally that kills once). Two blows open it,
and `Prop.breakCoop` pushes a `chicken` out at your feet.

She has three states and `Prop.updateBird` runs all of them. **Loose**, she walks with the goat —
hanging back `chicken.followAt` tiles and only hurrying when he has got further than `followFar`, so
she reads as something that came along rather than something stuck to his heel. **Kicked** — and the
kick is `headbutt`, not a throw, because a seventh button is not on offer and there is nothing in
this to pick up — she leaves at `launchSpeed`, takes whoever is nearest the line she was kicked along
(`pickTarget`, inside `seekArc` and `seekRange`, refusing everything the rest of the game refuses to
hit), and from there steers onto him at `turn` radians a second. She barely slows in the air, because
a bird that is aimed and then peters out reads as a dropped ball rather than as a shot. **Struck
home**, `Prop.strike` kills the man outright and she comes apart doing it.

That last part is a direct kill and it is meant to be. Pillar 3 is about the goat's own head — a
headbutt only ever knocks a man down — and the hen is on the same footing as a thrown sword: a thing
you had to find, open and spend, gone the moment it lands. What stops her being a win button is that
there is about one of her a level and she only kills once. A wall is not a man: she tumbles, is
`stunned` for a beat and gets up loose again, so a miss costs the walk back to her rather than the
bird. `game.henFreed` says what she is for the first time a run lets one out, because a bird walking
after you explains nothing on its own and a player who does not know she is ammunition leaves her in
the room she came out of.

**Crates.** `kind === 'crate'` is the plainest object in the game: one tile of floor, planks and two
iron bands, and everything it does it does through `item` — grab it, carry it, throw it. It flies down
the thrown-item branch of `Prop.update`, breaks on doors, tables, gongs and men, and floors whoever it
catches for `crate.stun`. It is deliberately small — `r` is 10, a third under the tile it sits on — and
deliberately plain: four shapes, an outline, a face, a lit top edge and one band. It had planks, two
bands and a stud, which is detail spent saying nothing. Boxes are
what a compound is full of; the point of it is that nothing has to be explained.
A thrown crate that reaches a burning tile does not break, it **bursts**: `Prop.burst` lays
`crate.burst` tiles of flame for `crate.burstTime`, of whichever kind lit it, and then shatters. It is
the one thing the goat carries that answers a fire with more fire, and it is how a doorway is shut.

**The bomb.** `kind === 'bomb'` is a rare find rather than a tool, `item` like a crate and grabbed and
thrown the same way — there is no button for it beyond grab and release, per the ground rules. It does
not break on the first thing it hits: `updateBomb` lets it come to rest (or fall down a hole, gone like
anything else thrown over one) and only then does the thing that matters, which already started the
moment it left the goat's mouth. `Prop.fling` arms `fuseT` off `TUNING.prop.bomb.fuse` the first time
only — caught and thrown again, it keeps the fuse it already had rather than a fresh one, so re-throwing
a live bomb buys distance, not time. When it reaches zero, `explode()` falls off from the centre the
same way the goat's own headbutted-bomb charge does: two hearts inside `nearR`, one heart out to
`blastR`, and the goat pays it too if he is standing in it (`Goat.damage`, which god mode and his own
`invuln` still cover). Past `nearR`, nothing is killed outright — an enemy that far out is only flung,
the same as the headbutt charge does, because the wall is still what is supposed to finish it. Placed by
`carveSecret` in `gen.js`, in the same spot a secret's own stand of arms would otherwise go
(`TUNING.secret.bombChance`), which is what keeps it to about one or two a level without a count of its
own to hold it to — a level with no secret in it has no bomb either. There is no painted asset for it:
`PaintedArt.drawProp` draws it plainly, a dark shell with a fuse that shortens and sparks faster as
`fuseT` runs out, which is the whole of how a player who has never seen one before reads "this is about
to go off."

**Five kinds of door.** `prop.door.hits` is one — a plank door in a corridor is a thing you run
through, not a wall you stand at. `ironHits` is three, `stairHits` three (the barred way out of every
level) and `vaultHits` four; `prop.gate` is the soul gate and has no count at all. `prop.iron` is the flag and
`levelDef.ironDoors` is the chance an ordinary corridor door gets it, rolled in `gen.js` on top of
`doorChance`: about two a level from level two on, none at all on level one, which is still teaching
that a door goes. An iron door refuses `openPressure` — nobody shoulders it open, it is broken or it is
shut — so a corridor with one in it is three blows of standing still with whatever heard the first
already coming, which is the entire point of putting them there. Every blow floats what is left in it,
so the count is a count and not a wall. A door is a slab, not a disc: `game.collideEntities` finds the
closest point on its actual rectangle (`prop.door.r` the half-span across the gap, `prop.door.thick` the
13px-in-the-art other way) rather than treating the whole thing as a circle of radius `r` in every
direction — that circle used to stop anyone walking straight at its face a whole extra tile short of it.

**The soul door.** `prop.vault` is the vault's door and it is the fourth-blow one. It used to be an
iron slab like any other, which since level two now has iron slabs in its corridors would make the one
thing in a level worth going out of your way for indistinguishable from a speed bump. It carries a
halo, the wisp painted small on its face, and the floating word `SOUL` — the door says what is behind
it in the language of the thing behind it, which is the only wording nobody has to be taught. The soul
gate (`prop.gate`) is the same idea inverted: violet rather than amber, and the word on it is
`A SOUL OPENS IT`, because what it names is not what is behind it but what it costs.

**The vault.** `levelDef.vaultAt` names one ordinary room in the middle of a level. `carveVault` cuts a
five-by-five chamber into the rock above or below it, opens **two** tiles of stone — the rock and the
room's own wall border under it, which is the bug that sealed the first version in — hangs an iron door
in the room's wall and returns where the soul goes. `startLevel` lays that soul down with
`placeSoul`, **not** `dropSoul`: `dropSoul` carries a rescue for a boss who died against a wall, that
rescue asks the flow field whether a spot can be reached, `computeFlow` stops at ninety tiles from
wherever it was last computed, and a vault in the back half of a level is further away than that — so
the rescue fetched the soul back and dropped it at the goat's feet on the first frame of the level.
Nothing in the vault is on the way to the stairs: it is four blows, the noise of four blows, and a soul.

**Reach.** `game.reaches(ax, ay, bx, by)` is the single answer to "is there a way from here to there
for a blow": line of sight plus every `blocking` prop as a circle against the segment. `meleeHit`'s
`inArc` and the goat's `headbuttHits` both ask it, so a club and a pair of horns are held to the same
rule and neither comes through a wall, a pillar, a table or a shut door.

**The shield you are carrying.** `Goat.covers(x, y)` is the one test: within `weapon.coverR` of him
and inside `weapon.coverArc` of where he is pointing. It was the disc of the shield itself, which let
almost everything past the edge. `Goat.shielded` is that arc plus "what he is holding is a shield" —
`Bullet.update` and `meleeHit` both use it, each turn spends a `uses` charge, and a club that lands on
it staggers the man who swung for `weapon.parry`.

**And the crate you are carrying, once.** `Goat.crated` is the same arc with a crate in it, and
`meleeHit` answers a club into one by shattering the box and giving the goat nothing to pay: no parry,
no charges, no stagger — the man who swung is left standing there and the goat is left holding nothing.
A crate is free and lying about everywhere, so what stops it being a shield is that it is gone on the
first blow. It makes anything swept up on the way past worth holding a moment longer, which is the
point of it. Bullets are not covered: a box is not iron.

**Stairs.** `T.EXIT` and `T.ENTRY` are both drawn by `drawStairs`; `level.exitTile` and `level.entry`
say where each flight starts. Stepping onto the exit enters state `climb` (`beginClimb`, `updateClimb`)
for `stairs.climb` seconds before `levelCleared`. `game.stairFx = { t, dir }` is what `drawGoat` reads
to lift, shrink and fade him: `dir` 1 going up and out, -1 arriving, which `startLevel` sets on any level
with an `entry`. Levels without `ritual` start at the top of the entry flight rather than the room centre.

**The other cage.** Built by `buildCage(..., deco)` from `TUNING.prop.deadCage`; its bars carry `deco`,
which keeps them out of `breakCage`, out of the gate, and out of the in-front-of-the-goat draw pass.
What is in it is painted on the decal canvas by `paintStartRoom`.
**The roll.** The one verb the goat is born with in full. It was withheld behind a soul (TUCK AND ROLL,
now gone from `BOONS`), which meant the first level was played by an animal that could not get out of
the way of anything — the one thing a creature running away has to be able to do. `BOON_BASE.roll` is
true, and what the roll's soul buys now is the teeth in it: **DEAD WEIGHT** is an active, and everything
the tumble goes through loses its head (`mods.rollStun`, read by the `rollHit` list in `Goat.update`).
`Goat.rollDirection` scores 24 candidate angles against nearby men (weighted up if one is mid-swing),
walls and fire, and honours the stick when there is one. With no direction asked for it is a pure escape,
which is the whole reason the button exists on a phone. Its distance is `roll.speed` times `roll.duration`
and the ground is the half to turn: cutting the speed leaves the mercy frames where they are, which is
the difference between a dodge and a second way of running.

**An arm is picked up by reaching for it, not by walking over it.** `Goat.takeArm` is the one way one
enters the mouth, and `tryGrab` is the one way in: a rack or a lying blade is `item`, the same test a
crate goes through, so a press of grab within `grab.reach` of one takes it exactly as deliberately as
a crate does. There used to be a second way in — a sweep at the top of `Goat.update` that put a blade
or shield in his mouth the moment he walked near one, no button pressed — and it read as the opposite
of deliberate: a stand of arms in a doorway armed you whether you meant to reach for it or not. `goat.
autoHeld` is what is left of that distinction and is always false for a weapon now, so holding one
always lets go the same way everything else does — release, or a press of grab again.

**And either button throws it.** `inp.lmbPressed` with anything `item` in his mouth is `throwHeld`, not
a headbutt: a thing held is a thing thrown, and which hand you throw it with is not a decision worth
making. The bash button used to launch a blade, put a swept-up crate down at his feet, or do nothing at
all, depending on how the thing got there — three answers to one press. A man is not an object and is
not covered by this: he goes where he always went, on grab. `dropHeld` and `prop.dropped` are gone with
it, since nothing puts a thing down any more.
Carrying an arm costs `grab.itemSpeedMul` and carrying a man still costs
`grab.speedMul`, because auto-pickup would otherwise be a way of being slowed down by the scenery.

**Arms are consumable.** `prop.uses` counts what a weapon has left, off `TUNING.prop.weapon.uses` —
a sword 1, a shield 3. `Prop.snap()` is the single place one is destroyed: it is called by the sword
when it kills or hits a wall, by the shield when a flattened man or a turned bullet takes the last
charge, and it clears `goat.holding` itself. Nothing broken is ever picked up again, so a level's
arms budget is the count of stands in it. `levelDef.racks` is the per-room chance and
`levelDef.racksFrom` a fraction of the level before which no stand is placed at all, including the
`w` markers in a template.

**The killbox.** `levelDef.killboxAt` picks `KILLBOX_TEMPLATE`, which sets `noFlipX` because its two
rifles ARE its far wall. `planEncounters` hands that room a fixed cell from `ENCOUNTER.killbox` —
rifles first, then the men on your side — and the first `cell.alert` spawns come out with
`alert: true`, which `startLevel` turns into `enemy.watchful`. A watchful man sees
`cfg.sight + cfg.watchSight` tiles with no cone at all, and `updateHunter` keeps him on his post
instead of closing. The room is only itself once rifles are a kind the run has met; before that it
fills like any other room.

**The camera lead.** `game.camLead` is carried, not read: `updateCamera` lerps it toward
`aim * camera.lead` at `camera.leadLerp` and scales the lead by run speed (`camera.leadStill` at a
standstill). Reading the aim straight meant that crossing the pointer over the goat threw the whole
picture to the other side of him in a frame, which is what made turning around feel like being shaken.
Reset it anywhere you hard-set `cam.x/y` (`startLevel`, `updateFall`).

**The deadzone, and a room that needs no camera at all.** `game.camFollow` is a second carried point,
behind `cam.x/y` the way `camLead` is behind the aim: `updateCamera` only drags it toward the goat
once he has stepped `camera.deadzone` px past it, so the small motion of standing still — even the
walk-cycle bob — never re-centres the picture, and only real travel does. A room whose whole footprint
already fits the view (`room.w/h * TILE` under the view size less `camera.fitMargin`, on both axes) skips
tracking entirely: `camFollow` is simply held at the room's centre, because there is nothing off-screen
to pan toward and tracking it only added to the shiver. `camFollow` is reset alongside `camLead`
wherever `cam.x/y` is hard-set.

**The run-up.** `goat.runT` is seconds of asking for at least `momentum.atLeast` of a stride without a
break, and `goat.runUp` is what they are worth: 1 at a standstill, `1 + momentum.max` after
`momentum.time` of running. It multiplies into `base` alongside `mods.speed`, drains at `momentum.lose`
times real time the moment he stops, and a hit or a stun takes the whole of it at once. That last part
is the design: the reward for running is a thing everything else in the game can take off you, so it
argues for *run, don't fight* rather than against it. It has no chip on the rail — the smear is where
it is visible. `momentum.max` is exactly the fifth that came off `goat.speed`: a goat at the end of a
run-up is doing what he used to do standing still. Keep the two in step — if `speed` is turned again,
`max` is what says whether the old top speed is still reachable at all.

**The smear.** `TUNING.goat.trail` holds both ends of it and `Goat.update` mixes them by
`game.mods.speed * goat.runUp` against `trail.fastAt`, so SURE HOOVES and the run-up both lengthen the
ghosts rather than only the number. Each ghost carries its own `max` life and `drawGoat` fades it against that, so a long smear
fades over its whole length. This is the only place that boon is visible: it hangs off no button, so
the rail cannot report it.

**The loop.** Fixed 1/60 step, max 5 substeps, in `game.frame`. `timeScale` drives slow motion.
A `setInterval` fallback drives the loop when `requestAnimationFrame` stalls, which it does when the
Browser pane is hidden. Do not remove it.

**The pointer.** `game.updateCursor` sets the canvas's own OS cursor rather than drawing one, and it is
the goat's head (`CURSOR_GOAT` in `game.js`, an inline SVG data URI wrapping the 🐐 emoji, built once with
`encodeURIComponent` rather than hand-escaped) everywhere except while he is holding something, which is
still the OS `grabbing` hand. A plain `crosshair` is the CSS fallback in both HTML files and the second
half of the `cursor` value itself, for a browser that cannot render the inline SVG at all.

---

## Testing

The desktop app's Browser pane has two traps. A **hidden pane reports a zero-size viewport**, so
responsive layout collapses to its fallback, and **`requestAnimationFrame` stalls**. Work around both:

1. Call `resize_window` with an explicit width and height before testing layout. Reset it to the
   `desktop` preset when finished.
2. Save frames through the dev server rather than the screenshot tool, which times out when the app
   window is behind another window.

Start the server, then load the harness in the page:

```bash
node tools/serve.js 8766
```

```js
const s = document.createElement('script'); s.src = '/tools/harness.js'; document.body.appendChild(s);
```

`H` then gives you `startPlay()`, `tp(x, y)`, `aimAt`, `walkTo`, `headbutt()`, `freeze(except)`,
`unfreeze()`, `nearest(kind)`, `waitFor(fn, ms)`, `status()` and `shot(name)` which writes to
`tools/shots/`. `startPlay()` clicks through the title and drops the opening scene with
`game.skipIntro(true)`; to watch the scene itself, call `game.menuPick(0)` on the title and wait for
`game.state === 'intro'`. `game.startLevel(0, seed, false, true)` replays it from anywhere. A run left
in `localStorage` by an earlier test is what CONTINUE offers — `game.clearRun()` forgets it.

**Traps that have bitten before, in this exact order:**

- Testing a hound's dodge or bite without waiting out the goat's headbutt recovery (0.35s) between
  swings: the input is dropped, nothing happens, and it reads as the dodge being broken. Wait, or check
  `goat.lungeId` actually moved.
- Teleporting the goat next to a wall and then testing a mechanic that needs line of sight. `los()`
  from inside a wall fails immediately and everything downstream looks broken.
- `H.freeze()` freezing the very enemy under test. Use `H.freeze(target)` to spare one.
- Reading the console and seeing errors from *before* the last reload. The buffer is not cleared by
  navigation. Install a fresh counter and wait, rather than trusting the tail of the buffer.
- A test `Prop` of kind `mill` keeps sweeping after `broken = true`: `Prop.update` dispatches to
  `updateMill` before it looks at `broken`. Splice it out of `game.props` when the scene is done, or
  the next scene's man is flung sideways by an arm nobody can see and every result downstream lies.
- Spawning a man a beat before flinging him at something. Aware, he chases the goat in that beat and
  leaves the line you put him on. Create him and fling him in the same tick.

A fourth trap: `H.startPlay()` leaves the goat in the pen on level 1. Break out first
(`H.aimAt = {x, y}` at a bar, then `H.headbutt()`) or nothing downstream can move. And the dev spawner
drops men **aware and adjacent**, so a handful of them will kill the goat during a test unless
`game.dev.god` is on — a dead goat freezes every enemy, which reads as the feature under test being broken.

**Always run `node tools/balance.js` after touching anything about who spawns where or which rooms go
where.** It runs every rule in `js/rules.js` over many seeds of every level, plus the two averaged
rules a single level cannot know about itself, and it is the only place they can fail. The same list is
on the RULES page of the dev drawer, per level and live, which is the quicker way to look at one seed.

**Always run the generator sweep after touching `gen.js`, `rooms.js` or `LEVELS`.** It catches broken
templates and impossible layouts in seconds:

```bash
node -e 'const fs=require("fs"),vm=require("vm");const ctx={console,Math,Uint8Array,Int16Array,Int32Array,Float32Array};vm.createContext(ctx);for(const f of ["js/tuning.js","js/rng.js","js/rooms.js","js/gen.js"])vm.runInContext(fs.readFileSync(f,"utf8"),ctx,{filename:f});vm.runInContext(`let fails=0;for(let li=0;li<LEVELS.length;li++)for(let s=1;s<=250;s++){try{generateLevel(LEVELS[li],s*1337)}catch(e){fails++}}console.log("fails:",fails)`,ctx);'
```

A syntax check over every file costs nothing and catches the class of error that only shows up at
runtime, such as a canvas call with too few arguments:

```bash
for f in js/*.js tools/*.js; do node --check "$f" || echo "FAIL $f"; done
```

---

## Publishing

**"Deploy" means three things, in this order, every time: merge the work into `main`, push it, and
publish the artifact.** The user says "deploy" to mean "put it live", and a branch that only sits on
the remote is not live. Never stop at the feature branch and never leave `main` behind — if a session
was developing on `claude/<something>`, merge that branch into `main` and push `main` as part of the
deploy, then publish. Opening a pull request instead is only right when the user asks for one.

The artifact is published from `artifact.html` with all sixteen scripts passed as supporting files, and
always to the existing URL. Republishing without the `url` creates a second artifact.

- `file_path`: `artifact.html`
- `url`: `https://claude.ai/code/artifact/098e742b-e742-4ce7-8499-a303fa5db021`
- `root`: the project directory
- `files`: every file in `js/`, mapped path-to-path
- `label`: a short version tag, for example `0.7 whatever landed`

If you add a new file under `js/`, it must go into three places: both HTML files' script lists and the
publish `files` map. Forgetting the map means the live page breaks while the local one works.

Run **`node tools/check-sync.js`** to confirm all three copies agree: it fails on a dirty tree, a `main`
that is ahead of or behind the remote, a branch that was never folded in, script lists that have drifted
apart, and a file in `js/` that no HTML file loads. The artifact half needs the published sizes, which
only Claude can fetch — `action: "list_files"` on the artifact URL — so save that listing to a file and
pass it as `--artifact <file>`; without it the script prints the local byte counts to compare by eye.

---

## Conventions

- Two-space indent, semicolons, single quotes. Dense one-liners are fine where they read cleanly.
- All prose in the game and in the code is English. The user writes in Russian and English; reply in
  whichever they used.
- Palette colours come from `PALETTE`, never as literals, except for one-off shading tints inside a
  single sprite.
- Fonts are `FONT` and `FONT_SC` constants in `render.js` (Alegreya and Alegreya SC from Google Fonts).
- Version history and the reasoning behind each change live in `CHANGELOG.md`.

---

## Open questions the user has not settled

- Mirrors as an environmental puzzle. The original voice note said "lizards and mirrors"; the mirror
  half was interpreted as a puzzle object and parked. The other half is still unresolved.
- Whether one life means one life per level (current behaviour) or one per whole run.
- Where his wife is. The opening scene carries her off deeper into the compound and nothing after it
  refers to her: no room, no ending, no line from the cult.
- Pixel art proper. Everything is still drawn with canvas primitives in the final palette.
- **A souls resource.** Asked for on 14 Sep 2026 and not yet built: one soul per man killed, banked and
  spent on something. The shape it wants is already half in the game — `game.kills` counts men and
  `scoreFor` already refuses to let kills beat pace — so the open question is not how to count them but
  what they buy, and whether buying anything with bodies argues with *run, don't fight*. The obvious
  home is the soul door: a vault that opens for souls instead of, or as well as, four blows. See
  `BACKLOG.md`.
- Gamepad support, a Priest boss, and the later acts sketched in `GOAT_OUT_brief.md`.
- The endless roll against a wall, reported in the 14 Sep 2026 playtest and **not reproduced** — see
  `BACKLOG.md` for what was measured and what to ask him. The soul barrier from the same batch was
  parked, for the reason pillar 1 gives; everything else in it shipped in 1.4.

`GOAT_OUT_brief.md` is the original stage-one design brief. It is history, not spec: several of its
decisions have since been overridden. `CONCEPT.md` is the current truth.
