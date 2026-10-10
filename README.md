# DOOMED GOAT

You are the sacrificial goat. The cult took you and your wife off a meadow, penned you in its compound,
and a mage carried her off while a club put you down. Break out of the pen and go after them.
Eight floors, one life on each, procedurally generated every run.

(The repository and its docs call it *Goat Out*; the title screen says DOOMED GOAT.)

**Play it:** https://claude.ai/code/artifact/098e742b-e742-4ce7-8499-a303fa5db021

Works on desktop with keyboard and mouse or a gamepad, and on phones with on-screen controls.

---

## Run it locally

Open `index.html` in a browser. No build, no dependencies.

Or run the dev server, which also accepts saved canvas frames from the test harness:

```bash
node tools/serve.js 8766
```

Then open http://127.0.0.1:8766. The first screen is NEW GAME; CONTINUE, which stays dark until there
is a run to come back to; BEST and SETTINGS. With the dev tools open (bottom left) a LEVELS row
appears too, which puts you on any floor of the game with the souls a run would have banked getting there. Audio unlocks on that first input.

A run is written to the browser at the head of every floor, so CONTINUE puts you back at the start of
the furthest floor you reached with what you had when you walked onto it, straight onto that floor.
Quitting a floor half played (or closing the tab) puts it aside: CONTINUE brings back the same floor,
with you standing where you left it, the men you killed still dead. A death ends the run: there is one life,
and what stays is what heaven keeps (the mirror's strength, the animals, the bells). Starting a new game
throws the run away, and so does escaping; a floor started from LEVELS is practice and never touches it.

---

## Controls

Five verbs and nothing else. Souls change what a button does; they never add one.

| Touch | Desktop | Action |
|---|---|---|
| left thumb, anywhere on the left | WASD / arrows | run, momentum, no turning on a dime |
| aim follows your run and snaps to nearby men | mouse | aim |
| BUTT on the bars | left click on the bars | break out of the pen you start the run in, seven blows the first time ever, and the third and the sixth leave you on the floor. Every run after that, two |
| BUTT | left click | headbutt, it knocks a man down. Into a wall, a pillar, a brazier or another man, he stays down for good |
| hold GRAB | hold right click | carry a box, a blade, a shield, a bomb. A man is a soul away: until WHO IS THE BOSS the mouth takes objects only |
| release GRAB | release right click | throw, a box flattens, a sword goes through, a thrown man kills what he hits |
| ROLL | E | a clumsy sideways tumble with brief mercy frames, on a short cooldown. Ask for no direction and it throws you clear of whoever is about to hit you |
| BAAH | space | a noise every man who hears it walks toward, and a committed blow inside it falters. A soul makes it a stun or a cone of fire |
| - | Q | only with a cape on your back: the cape's own verb |
| tap after death | click after death | up to the pasture above; walk off its edge for a new run, from the first floor |
| - | Backspace | RUN AGAIN at once, from the first floor (from the death card, or from the pasture) |
| - | Esc | pause |
| SETTINGS | - | DOUBLE SPEED OUT OF A FIGHT: with nobody after you, the goat runs twice as fast |
| PAUSE → INVENTORY | I | the book of what you carry: your souls, the talismans and the cape, the animals, what the mirror bought, point at one to read it |
| - | M | mute |

Phones and tablets get on-screen controls automatically. In portrait the play view is letterboxed and
the thumbs get their own deck below it. In landscape the controls overlay the bottom corners. Dragging
on the right half of the screen overrides auto-aim with a manual direction.

A gamepad (Xbox layout names; any pad the browser reads with the standard mapping) takes over the
moment a stick or button is touched, and a key or the mouse takes it back:

| Gamepad | Action |
|---|---|
| left stick / d-pad | run |
| right stick | aim (let go and the aim follows your run, snapping to nearby men) |
| RT, RB or X | headbutt |
| hold LT or LB, release | carry, throw |
| A | roll |
| B | BAAH |
| Y | the cape's own verb (the Q key) |
| START | pause (INVENTORY is on it) |
| BACK | the floor again at once (as Backspace) |
| d-pad + A, B | every menu and card: A picks, B backs out; left / right chooses a soul |

Four hearts (six on EASY MODE); grass gives them back, and each new floor gives two back. A death ends the run; once you have been up to the
pasture above, every run starts with one more life, and losing your last heart there brings you back
where you fell. The seed is printed in the top-right corner,
and the death card carries a RUN CODE that rebuilds the floor you died on.

---

## What is in

**Eight floors, each built round one idea.** THE ALTAR (the wall is the weapon), THE YARD (coals and
straw), THE CAVE (no wall runs straight; grass that hides you and them), THE ROAD (rifles and the cover
between them), THE THRESHING FLOOR (almost no wall: herd them into the furniture), THE BRIDGE (seven men
are one man in a doorway), THE RAFTERS (holes in the floor, windows in the walls) and THE OSSUARY (the dead
come from behind). Each is a chain of hand-authored rooms dealt in a new order every run: the floor's own
rooms first, then rooms from every idea the run has already taught you.

**THE DARK**, the other way down. On some runs a wall of THE YARD's last room is cracked, and behind it a
flight goes down to the cellars, played in THE CAVE's place, where nothing is lit but what burns. Every room has a standing
lamp or two, it shows them to you and you to them, and a headbutt puts it on the floor, burning, and
then the room is black, and a lantern on the wall by every door that nothing puts out. Out of the light
they see you only close and hunt by what they hear; you hear them before you see them, and see the eyes
of the hounds and the mages across a room. Fewer of them, no rifles. LEVELS (dev tools) has a row for it.

**THE TRIP.** Once you have reached THE ROAD in three runs, it sometimes has a tuft of pale mushrooms on it. Eat it and the next floor is a glowing
cave where every key is the other way round, the stick reversed, the horns and the teeth swapped, the
tumble and the voice swapped, and the men are the first floor's.

**A pen, not an altar.** The run opens on the two of you in the pen: the goat and his wife, a heart
between you, until a mage and a clubman come for her: the mage carries her off and the clubman puts a
club across your skull. You wake in the same pen, beside the slab they meant to use, and butt the bars
until they give. Halfway through the first floor you catch the mage up, in the room before the first
gate, handing the man there its soul, and away through the gate with her before it shuts. The controls are painted
on the floor where you first need them: moving in the pen, the headbutt under the first man, grab where
the first blade stands. Every floor ends at a flight of stairs going up, and every floor after the first
begins at the top of one.

**You meet everything alone first.** The room that introduces a clubman, a butcher, a hound, a mage, a
rifle, a shieldman, a thrower or a wraith holds that one enemy and nothing else (the shaman too, in a room cut by drops for his call to pull you toward), and a boss you have never seen stands in his
arena without company. After that they arrive mixed, and the mix gets worse as the floor goes on and
worse again on the floor after.

**Ten enemy types.** Club-swinging Bearers; Butchers in bone aprons and bull-skull masks, too heavy
to carry, who hook you from across a room and drag you to the cleaver; Shieldmen behind a board of
door planks that takes anything from in front, a headbutt, a crate, a blade, a round, and kills a man
thrown into it like a wall, but who turn slowly and have a back; Throwers in goat-skull masks, one arm swollen
green, who lift whatever is in the room, a crate, one of their own, one of your animals, and throw it at you, and
who grab you and throw you at the nearest drop or wall; Shamans with a turtle's shell on their backs, who shake a skull on a staff to put
the old spirit into the clubmen round them (faster, harder hitting, a heart more) and hold out a hand to hold your
run key down toward themselves for a few seconds; blinking Seers whose runes erupt into violet witchfire
that nothing makes you proof against; Hunters whose bullets travel and hit their own; the ogre, the cult's
half-beast, who takes four, is never knocked back, leaps onto where you stand and brings his fists down
on the floor all round him; the hounds; and the wraiths. One rule for all of them: a man without a
outline dies to one killing blow (the Butcher takes three, the Seer two); a champion wears a yellow outline, stands a size bigger and takes one more than his kind, and a man carrying a corrupted soul wears a violet one, glows violet and takes 3 and 1 more for the soul. They shout short lines when they see you, hear
you, swing at you or watch one of their own come apart, and they read the room: fire, lit braziers, a
rune about to go off and the sweeping arms of the Mill. Not all of them read it correctly.

**The hounds.** As quick as you are, and the only thing in the compound you cannot simply get hold of. A
hound circles out past your horns, plants, runs in through you for one bite and breaks away round the
ring again. One hit kills it; landing that hit is the whole problem.

**The wraith.** Most of the time it is not there: no body, nothing to hit, and a wall is not a wall to
it. It works its way round to your flank or your back and only then becomes real, and from that instant
it cannot stop. That window is the only time anything of yours can touch it. It cannot become solid
inside a wall, so a wall at your back is one arc it cannot come from.

**Souls.** Two on every floor and no more: one in the middle, carried by the man who keeps the gate it
opens, and one at the end, in the last boss. A soul offers two cards, an active that changes what a button does, or a passive
that bends its numbers, and the build holds one active and two passives per button. Once a slot is full,
a card for it offers to swap one you have. A third card has to be earned: the Hungry Soul deals one on
every soul after it, and so does the mouse's Knucklebone. Souls of one
element add up: the third and fourth fire souls buy you longer in flame (witchfire too) before it hurts,
and all four make your fire burn twice as long; each poison soul, longer in a puddle before it slows you, and
all four make you proof against it and your poison take a heart as it takes a man. Dragon Breath turns
the scream into a cone of fire, Bomb Charge detonates whoever you headbutt, Long Horns grows antlers,
Firebrand leaves a line of fire behind anything you throw.

**The mouse in the wall.** On THE YARD, THE ROAD and THE BRIDGE one gate is her room instead: a
talisman, another talisman or three tufts of grass, and you take one. She takes nothing for it. Headbutting
her stall is rude, and what comes out of the wall after the third time is not a mouse.

**Talismans.** 18 of them, each COMMON, RARE or EPIC, up to three worn at once as charms on
a collar, each stated in plain words where it stands: a mirror shard that turns a blow back, a spade that
leaves bodies lying to trip over and kick, a knucklebone that deals a soul's third card, a magnet that spins a sword
or a crate round you to take a blow, a nosebag that keeps the grass you had no need of for later, and so on.

**Capes.** Rarer still: one lies in a niche behind a niche now and then, or on a mouse's shelf in place of a
talisman. One on your back at a time, each a verb on Q with a long wait: a blink ahead, a tuft of
grass, a shock that breaks the room round you, a boomerang, a straw goat the cult goes for instead of you.

**Animals.** From the second floor a coop holds an animal, a hen, a goose, a crow, a tortoise, a
horse. Break it open and get the animal to the stairs alive, and it pays you for the rest of the run,
and takes its seat in the pasture above for good. Let one out and it stops you to say its terms. The horse, in a stall of its own, races you to the
locked rooms with a soul and waits in each for the soul to be taken: it pays only if you beat it to one.

**The pasture above.** A death goes up before it comes back down: two rooms of cloud. In the first the
goat god sits in his light and has a great deal to say about it (GRAB to listen, BAAH to argue). Across
the bridge a blind shepherd combs you and asks for the bells the cult's big men carry: beat the last of them
on a floor, take his bell (GRAB) and hang it on the old man's beam. The animals' stands are in both rooms: only
the tortoise's is whole, every other is broken and wants 25 to 45 souls. Hold GRAB at a broken thing up there and the
souls you brought pour into it until it is whole. An animal walked out of the compound sits on its stand
and dares you; win its dare and it lives up here its own way, and a talisman comes onto the shelves.
Every man the cult loses is a sacrifice to the god, and every floor you climb out of is ten; **the
mirror** in the second room trades them for things that stay with you from run to run, more hearts,
hearts of light, quicker grazing, a quicker roll, longer mercy after a blow, one more life a run. Choose your horns there
(the SHORT, and BIG or LONG once you have given the god fifty souls), and walk off the edge for a new run.

**The altar, again.** Once you have climbed out of the first floor, it stops teaching: no guard in the doorway, no
lessons laid in order, more men to a room, and the wheel and the last fight are not where they were.

**A room that fights back.** Braziers that spill coals when you headbutt them, spreading hay fire,
barrels that roll and burst, doors you smash through, tables that slide and crush, oil lamps that go
over, grating that bites whoever is on it when it comes up, drops that nobody comes back from, and
the Mill, a ritual grinding wheel whose arms fling cultists to their deaths and take a heart off you.
Everything that flies through a room meets the room: nothing goes through a shut door, and a man in your
mouth burns, gets thrown by the wheel and bitten by the grating like anybody else.

**Stands of arms**, rare and worth a trip. Grab the sword or the shield out of the rack and throw it: a
sword goes through the first man it finds, a shield flattens a row of them. Carried, a shield turns
blows and bullets for a while and then splinters.

**Grass** grows on every floor, a tuft every few rooms: stand over it and graze for a heart back. A big
tuft behind a wall that gives is worth two.

**The killbox**, late on the floors with rifles: an empty room, two posted rifles on the far side
watching the door, a shield by that door, and the corridor behind you if you would rather not.

**The picture.** Every cleared floor is kept as a painting, the floor plan, the blood, the line you
ran and a skull for every body, and SAVE THE PICTURE on the clear card saves it as a PNG.

**The skill rail**, bottom right: your verbs as pixel pictures, whether each is ready, the cooldowns,
and what your souls have done to each of them. Hover a chip for its numbers.

**Sound.** No audio files: every effect is a small physical model rendered on the spot, struck wood
and iron, a throat through formants, shaped noise, and the score is a synthesised bone flute, bass
gallop and drums that follow the room from idle to chase. Every floor has a sound of its own under
it, still air, a cave's hollow, wind through boards, the nearest fire. See [MUSIC.md](MUSIC.md);
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
