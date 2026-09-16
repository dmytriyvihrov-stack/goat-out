# GOAT OUT

You are the sacrificial goat. They were driving you to the altar, the truck fell off the bridge, and now
the whole cult wants you back. Six levels, one life, procedurally generated every run.

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

A run is written to the browser at the head of every level and whenever a soul is taken, so CONTINUE
puts you back at the start of the furthest level you reached with the souls you had there. Starting a
new game throws it away, and so does escaping.

---

## Controls

Music gives each enemy type a recognisable rhythm, with heavier patterns for ranged and large
enemies. Traps and fire across the current room join in; nearby healing grass adds chimes.
Kills and player actions get delayed musical replies, and fires leave two bars of crackles.
Levels 5+ have a second base theme. Audition counts, combinations and events in
**DEV TOOLS → TOOLS → MUSIC**, or open `index.html#music`.
To restore the original soundtrack, turn **SETTINGS → LAYERED MUSIC** off. See [MUSIC.md](MUSIC.md)
for the arrangement and tuning notes.

Phones and tablets get on-screen controls automatically. In portrait the play view is letterboxed and
the thumbs get their own deck below it. In landscape the controls overlay the bottom corners.

| Touch | Desktop | Action |
|---|---|---|
| left thumb, anywhere on the left | WASD / arrows | run — momentum, no turning on a dime |
| aim follows your run and snaps to nearby men | mouse | aim |
| BUTT on the bars | left click on the bars | break out of the pen you start level 1 in — seven blows the first time ever, and the third and the sixth leave you on the floor. Every run after that, two |
| BUTT | left click | headbutt — into a wall, pillar, brazier or another man it kills; on open floor it only knocks down. A man thrown hard into a man standing next to him takes them both |
| hold GRAB | hold right click | carry a box, a blade or a shield. A man is a soul away: until BY THE COLLAR the mouth takes objects only |
| release GRAB | release right click | throw — a box flattens, a sword goes through, a man kills what he hits and dies on the wall |
| ROLL | E | a clumsy sideways tumble with brief mercy frames. DEAD WEIGHT makes everything it goes through lose its head |
| BAAH | space | a noise. Every man who hears it walks to the spot you made it at. THE FULL THROAT turns it into a stun, DRAGON BREATH into fire — you get one |
| hold GRAB | hold right click | carry a box, a blade or a shield — and a man too, once BY THE COLLAR is in you |
| release GRAB | release right click | throw — it kills what it hits and comes apart. Then a beat before you can grab again |
| ROLL | E | a clumsy sideways tumble with brief mercy frames, on a short cooldown. Ask for no direction and it throws you clear of whoever is about to hit you |
| BAAH | space | a noise they walk toward, until a soul makes it a stun or a cone of fire |
| tap after death | Backspace | new level |
| — | M | mute |

Dragging on the right half of the screen overrides auto-aim with a manual direction.

Four hearts, no regeneration. Death regenerates the level from a new seed in under a second. The seed is
printed in the top right.

---

## What is in

**Six levels.** THE ALTAR is Bearers, with one hound near the end of it. THE YARD adds Seers, late and
one to a room. THE ROAD adds Hunters, posted on their own as well as in crowds. THE THRESHING FLOOR takes
the walls away. THE BRIDGE mixes everything. THE OSSUARY, under the bridge, belongs to the dead. Every
level carries more hounds than the one before. Each is
a chain of hand-authored rooms stitched together differently every run, and each one hands your hearts
back.

**The wraith**, and the level that is made of them. It is not there most of the time: no body, nothing to
hit, and a wall is not a wall to it. It works its way round to your flank or your back, and only then
becomes real — and from that instant it cannot stop, and stays real well past the blow. That window is
the only time anything of yours can touch it, and the only time a scream can freeze it. Face one and it
can do nothing at all. It cannot become solid inside a wall, so a wall at your back is one arc it cannot
come from. THE OSSUARY, under the bridge, is where everything the compound ever killed was thrown.

**THE THRESHING FLOOR**, the open level: rooms half again as wide, five-tile gaps instead of doorways,
and hardly a wall to throw anybody at. Instead there is furniture — a field of stone posts, table rows
you can shove about to open or close a lane, an island of posts with clear ground all round it, braziers
down both flanks, and a ring of hay that turns into a wall the moment you light it. Nothing out there
kills for you; you have to walk them into something.

**A pen, not an altar.** The run opens on the two of you in the pen: the goat and his wife, a heart
between you, until two men come for her and one of them puts a club across your skull. You wake in the
same pen, beside the slab they meant to use, with the one that went before you opened up on the floor,
their tools laid out beside it, and another cage across the room that nobody is getting out of. Three
headbutts take the bars apart and tell the building where you are. The two rooms after it carry the
controls painted on the floor and hold nobody. Every level ends at a flight of stairs going up, and every
level after the first begins at the top of one.

**The Great Hall.** Late on THE ROAD and again on THE BRIDGE: one room 38 by 22 tiles with two Mills,
pillar rows, hay, tables, braziers, lamps, a bell and fifteen men between you and the far door. The
**Gallery** on those levels is the opposite problem — pillar cover and rifles posted well apart.

**You meet everything alone first.** The room that introduces a clubman, a brute, a hound, a mage or
a rifle holds that one enemy and nothing else, and a boss you have never seen stands in his arena without
company. The Mill's room counts too: it never introduces a man, and on level 1 it holds nobody at all.
After that they arrive mixed, and the mix gets worse as the level goes on and worse again on the
level after.

**Seven enemy types.** Club-swinging Bearers; Brutes, a third larger with spikes along the back, who
take three killing blows and carry notches over their heads to say so; blinking Seers whose runes erupt into violet witchfire that no boon protects you
from; Hunters whose bullets travel and hit their own; the Butcher, who takes three hits and cannot be
interrupted mid-swing; the hounds; and the wraiths. They shout short lines when they see you, hear
you, swing at you or watch one of their own come apart — and they read the room: fire, lit braziers, a
rune about to go off and the sweeping arms of the Mill. Not all of them read it correctly.

**The hounds.** As quick as you are, and the only thing in the compound you cannot get hold of. A hound
circles out past your horns, picks a moment, runs in for one bite and gets out again — and it is not
there for a good share of the headbutts you aim at it. One hit kills it. The answer to a pack is the
scream: a hound loses far longer to BAAH than a man does, and a dazed hound cannot dodge at all.

**A level gives up an authored number of souls** — one on the first, two after — and the boss carrying one glows. A soul offers three actives or three passives. Dragon
Breath turns the scream into a cone of fire, Bomb Charge detonates whoever you headbutt, Devour lets you
tear a held man open for a chance to heal. Boons last the run and die with you.

**A room that fights back.** Braziers that spill coals when you headbutt them, spreading hay fire,
breakable pots, a bell that calls the level, doors you smash through, tables that slide and crush, oil
lamps that go over — under a thrown man, a thrown pot, or a Butcher on a charge — and spill fire, and
the Mill — a ritual grinding wheel whose arms fling cultists to their deaths and take a heart off you.
Everything that flies through a room meets the room: nothing goes through a shut door, and a man in your
mouth burns, gets thrown by the wheel and bitten by the spikes like anybody else.

**Stands of arms.** A rack with a sword or a shield in it, sometimes one or two to a room and always two
in a boss room. Grab what is in it and throw: a thrown sword goes through the first man it finds and
stays in him, a thrown shield flattens a row of them. Carried, a shield turns three bullets before it
splinters. Both lie where they land, so a stand is worth crossing the floor for twice.

**Level one teaches.** Anything the run has not met yet — the first Bearer, the first Seer, the first
rifle, the Mill, a new boss — turns up on its own, in a room with nothing else in it. By the third level
the game assumes you have seen them and stacks whatever it likes.

**Two milk bowls per level** restore a heart.

**Stands of arms**, rare and single-use. A thrown blade snaps in whatever it hits; a shield is worth
three men or three bullets and then splinters. Level 1 has none until halfway in.

**The killbox**, late on the levels with rifles: an empty room, two posted rifles on the far side
watching the door, a shield by that door, two of their own to carry in front of you, and the corridor
behind you if you would rather not.

**The skill rail**, top right: your four verbs as icons, whether each is ready, the cooldown on throw,
roll and scream, and what your souls have done to each of them. Long Horns lengthens the horns on the
icon and on the goat; Dragon Breath turns the scream into a cone of fire.

**Presentation.** A slightly tilted camera that punches on every kill, blocky cult pictograms stamped into
the floors, blood and gore that persist as paint for the whole level, a kill counter for bodies that land
on top of each other, and a synthesised score — pad, bass and a phrygian motif under ritual percussion
that escalates with how many enemies are aware of you. No audio or image assets at all.

---

## Dev drawer

Bottom-right corner, works with mouse or finger. God mode, spawn any enemy, drop a soul, heal, clear the
room, new level, skip level.

---

## Project files

| | |
|---|---|
| `CONCEPT.md` | What the game is and why. The current design truth. |
| `CLAUDE.md` | How to work on it: architecture, conventions, testing traps, publishing. |
| `CHANGELOG.md` | Version history and the reasoning behind each change. |
| `GOAT_OUT_brief.md` | The original stage-one brief. History, not spec. |
| `js/tuning.js` | Every tunable number and the five level definitions. Start here to change feel. |
| `js/rooms.js` | Room templates as character grids. |
| `tools/harness.js` | Console test harness. |
