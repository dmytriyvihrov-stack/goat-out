# DOOMED GOAT

You are the sacrificial goat. They were driving you to the altar, the truck fell off the bridge, and now
the whole cult wants you back. Eight floors, one life on each, procedurally generated every run.

(The repository and its docs call it *Goat Out*; the title screen says DOOMED GOAT.)

**Play it:** https://claude.ai/code/artifact/098e742b-e742-4ce7-8499-a303fa5db021

Works on desktop with keyboard and mouse, and on phones with on-screen controls.

---

## Run it locally

Open `index.html` in a browser. No build, no dependencies.

Or run the dev server, which also accepts saved canvas frames from the test harness:

```bash
node tools/serve.js 8766
```

Then open http://127.0.0.1:8766. The first screen is NEW GAME; CONTINUE, which stays dark until there
is a run to come back to; LEVELS, which puts you on any floor of the game with the souls a run would
have banked getting there; and BEST and SETTINGS. Audio unlocks on that first input.

A run is written to the browser at the head of every floor, so CONTINUE puts you back at the start of
the furthest floor you reached with what you had when you walked onto it. Quitting a floor half played
counts as a death, the way dying does: you come back to a new layout. Starting a new game throws the
run away, and so does escaping; a floor started from LEVELS is practice and never touches it.

---

## Controls

Five verbs and nothing else. Souls change what a button does; they never add one.

| Touch | Desktop | Action |
|---|---|---|
| left thumb, anywhere on the left | WASD / arrows | run — momentum, no turning on a dime |
| aim follows your run and snaps to nearby men | mouse | aim |
| BUTT on the bars | left click on the bars | break out of the pen you start the run in — seven blows the first time ever, and the third and the sixth leave you on the floor. Every run after that, two |
| BUTT | left click | headbutt — it knocks a man down. Into a wall, a pillar, a brazier or another man, he stays down for good |
| hold GRAB | hold right click | carry a box, a blade, a shield, a bomb. A man is a soul away: until BY THE COLLAR the mouth takes objects only |
| release GRAB | release right click | throw — a box flattens, a sword goes through, a thrown man kills what he hits |
| ROLL | E | a clumsy sideways tumble with brief mercy frames, on a short cooldown. Ask for no direction and it throws you clear of whoever is about to hit you |
| BAAH | space | a noise every man who hears it walks toward, and a committed blow inside it falters. A soul makes it a stun or a cone of fire |
| — | Q | only with a talisman that has a use of its own (the boomerang, the strange symbols, the straw effigy) |
| tap after death | Backspace | the floor again, from a new seed |
| — | Esc | pause |
| — | M | mute |

Phones and tablets get on-screen controls automatically. In portrait the play view is letterboxed and
the thumbs get their own deck below it. In landscape the controls overlay the bottom corners. Dragging
on the right half of the screen overrides auto-aim with a manual direction.

Four hearts, no regeneration (six on EASY MODE). A death costs the souls you took on that floor and
builds the floor again from a new seed in under a second. From the second floor on, the floor's middle
gate holds your place: take what it offers, die past it, and you start again at that gate of the new
layout with everything you had there. The seed is printed in the bottom-left corner,
and the death card carries a RUN CODE that rebuilds the floor you died on.

---

## What is in

**Eight floors, each built round one idea.** THE ALTAR (the wall is the weapon), THE YARD (coals and
straw), THE CAVE (no wall runs straight; grass that hides you and them), THE ROAD (rifles and the cover
between them), THE THRESHING FLOOR (almost no wall: herd them into the furniture), THE BRIDGE (seven men
are one man in a doorway), THE RAFTERS (holes in the floor, windows in the walls) and THE OSSUARY (the dead
come from behind). Each is a chain of hand-authored rooms dealt in a new order every run: the floor's own
rooms first, then rooms from every idea the run has already taught you.

**THE DARK**, the other way up. THE ROAD ends on two flights of stairs: one climbs to THE THRESHING
FLOOR, the other to the cellars under it, where nothing is lit but what burns. Every room has a standing
lamp or two — it shows them to you and you to them, and a headbutt puts it on the floor, burning, and
then the room is black — and a lantern on the wall by every door that nothing puts out. Out of the light
they see you only close and hunt by what they hear; you hear them before you see them, and see the eyes
of the hounds and the mages across a room. Fewer of them, no rifles. LEVELS has a row for it.

**THE TRIP.** Some floors have a tuft of pale mushrooms on them. Eat it and the next floor is a glowing
cave where every key is the other way round — the stick reversed, the horns and the teeth swapped, the
tumble and the voice swapped — and the men are the first floor's.

**A pen, not an altar.** The run opens on the two of you in the pen: the goat and his wife, a heart
between you, until two men come for her and one of them puts a club across your skull. You wake in the
same pen, beside the slab they meant to use, and butt the bars until they give. The controls are painted
on the floor where you first need them: moving in the pen, the headbutt under the first man, grab where
the first blade stands. Every floor ends at a flight of stairs going up, and every floor after the first
begins at the top of one.

**You meet everything alone first.** The room that introduces a clubman, a brute, a hound, a mage, a
rifle or a wraith holds that one enemy and nothing else, and a boss you have never seen stands in his
arena without company. After that they arrive mixed, and the mix gets worse as the floor goes on and
worse again on the floor after.

**Seven enemy types.** Club-swinging Bearers; Brutes in bone aprons and bull-skull masks, who take three
killing blows and charge you from across a room; blinking Seers whose runes erupt into violet witchfire
that no boon protects you from; Hunters whose bullets travel and hit their own; the ogre, the cult's
half-beast, who takes four, is never knocked back, leaps onto where you stand and brings his fists down
on the floor all round him; the hounds; and the wraiths. They shout short lines when they see you, hear
you, swing at you or watch one of their own come apart — and they read the room: fire, lit braziers, a
rune about to go off and the sweeping arms of the Mill. Not all of them read it correctly.

**The hounds.** As quick as you are, and the only thing in the compound you cannot simply get hold of. A
hound circles out past your horns, plants, runs in through you for one bite and breaks away round the
ring again. One hit kills it; landing that hit is the whole problem.

**The wraith.** Most of the time it is not there: no body, nothing to hit, and a wall is not a wall to
it. It works its way round to your flank or your back and only then becomes real — and from that instant
it cannot stop. That window is the only time anything of yours can touch it. It cannot become solid
inside a wall, so a wall at your back is one arc it cannot come from.

**Souls.** Two on every floor, most of them lying in front of a gate that only the soul opens, and a boss
who glows carries one now and then. A soul offers three cards — an active that changes what a button does, or a passive
that bends its numbers — and the build holds one active and two passives per button. Dragon Breath turns
the scream into a cone of fire, Bomb Charge detonates whoever you headbutt, Long Horns grows antlers,
Firebrand leaves a line of fire behind anything you throw.

**The mouse in the wall.** On THE YARD, THE ROAD and THE BRIDGE one gate is her room instead: a
talisman, another talisman or a pail of milk, and you take one. She takes nothing for it. Headbutting
her stall is rude, and what comes out of the wall after the third time is not a mouse.

**Talismans.** Twenty-one of them in three tiers, worn one at a time on a collar, each stated in plain
numbers where it stands: a mirror shard that turns a blow back, a spade that leaves bodies lying to trip
over, a boomerang on Q, and so on.

**Animals.** From the second floor a coop holds an animal — a hen, a goose, a crow, a tortoise, a
horse. Break it open and get the animal to the stairs alive, and it pays you for the rest of the run.

**A room that fights back.** Braziers that spill coals when you headbutt them, spreading hay fire,
barrels that roll and burst, doors you smash through, tables that slide and crush, oil lamps that go
over, grating that bites whoever is on it when it comes up, drops that nobody comes back from, and
the Mill — a ritual grinding wheel whose arms fling cultists to their deaths and take a heart off you.
Everything that flies through a room meets the room: nothing goes through a shut door, and a man in your
mouth burns, gets thrown by the wheel and bitten by the grating like anybody else.

**Stands of arms**, rare and worth a trip. Grab the sword or the shield out of the rack and throw it: a
sword goes through the first man it finds, a shield flattens a row of them. Carried, a shield turns
blows and bullets for a while and then splinters.

**Grass** grows on every floor, a tuft every few rooms: stand over it and graze for a heart back. A big
tuft behind a wall that gives is worth two.

**The killbox**, late on the floors with rifles: an empty room, two posted rifles on the far side
watching the door, a shield by that door, and the corridor behind you if you would rather not.

**The picture.** Every cleared floor is kept as a painting — the floor plan, the blood, the line you
ran and a skull for every body — and SAVE THE PICTURE on the clear card saves it as a PNG.

**The skill rail**, bottom right: your verbs as pixel pictures, whether each is ready, the cooldowns,
and what your souls have done to each of them. Hover a chip for its numbers.

**Sound.** No audio files: every effect is a small physical model rendered on the spot — struck wood
and iron, a throat through formants, shaped noise — and the score is a synthesised bone flute, bass
gallop and drums that follow the room from idle to chase. See [MUSIC.md](MUSIC.md);
`tools/sfx-board.html` plays every effect.

---

## Dev drawer

Bottom-left corner, works with mouse or finger. God mode, spawn any enemy, drop a soul, heal, clear the
room, new level, skip level, and LEVEL TOOL: the generator's rules, the balance report and every room
of the current floor.

---

## Project files

| | |
|---|---|
| `CONCEPT.md` | What the game is and why. The current design truth. |
| `CLAUDE.md` | How to work on it: architecture, conventions, testing traps, publishing. |
| `CHANGELOG.md` | Version history and the reasoning behind each change. |
| `ART_HANDOFF.md` | What the game is drawn with (Pixel 2.5) and how to add art. |
| `js/tuning.js` | Every tunable number and the eight level definitions. Start here to change feel. |
| `js/rooms.js` | Room templates as character grids. |
| `tools/harness.js` | Console test harness. |
