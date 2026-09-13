# GOAT OUT

You are the sacrificial goat. They were driving you to the altar, the truck fell off the bridge, and now
the whole cult wants you back. They already have your wife. Four levels, one life, procedurally generated
every run.

**Play it:** https://claude.ai/code/artifact/098e742b-e742-4ce7-8499-a303fa5db021

Works on desktop with keyboard and mouse, and on phones with on-screen controls.

---

## Run it locally

Open `index.html` in a browser. No build, no dependencies.

Or run the dev server, which also accepts saved canvas frames from the test harness:

```bash
node tools/serve.js 8766
```

Then open http://127.0.0.1:8766. Click or tap once to start; audio unlocks on that first input.

---

## Controls

Phones and tablets get on-screen controls automatically. In portrait the play view is letterboxed and
the thumbs get their own deck below it. In landscape the controls overlay the bottom corners.

| Touch | Desktop | Action |
|---|---|---|
| left thumb, anywhere on the left | WASD / arrows | run — momentum, no turning on a dime |
| aim follows your run and snaps to nearby men | mouse | aim |
| BUTT on the bars | left click on the bars | break out of the pen you start level 1 in — seven blows, and the third and the sixth leave you on the floor |
| BUTT | left click | headbutt — into a wall, pillar, brazier or another man it kills; on open floor it only knocks down |
| hold GRAB | hold right click | carry a man in front as a shield — he stops two bullets and any swing — or a pot, or what is in a stand of arms |
| release GRAB | release right click | throw — a man kills what he hits and dies on the wall, a pot flattens, a sword goes through |
| ROLL | E | clumsy sideways tumble with brief mercy frames |
| BAAH | space | scream — it is a stun, not a lure. Everyone in earshot stands there for a second, whatever he was doing. It calls nobody. |
| tap after death | Backspace | new level |
| — | M | mute |

Dragging on the right half of the screen overrides auto-aim with a manual direction.

Four hearts, no regeneration. Death regenerates the level from a new seed in under a second. The seed is
printed in the top right.

---

## What is in

**Four levels.** THE ALTAR is Bearers only. THE YARD adds Seers, late and one to a room. THE ROAD adds
Hunters, posted on their own as well as in crowds. THE BRIDGE mixes all four. Each is a chain of
hand-authored rooms stitched together differently every run, and each one hands your hearts back.

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

**Four enemy types.** Club-swinging Bearers, blinking Seers whose runes erupt into violet witchfire that
no boon protects you from, Hunters whose bullets travel and hit their own, and the Butcher who takes two
hits and cannot be interrupted mid-swing. They shout short lines when they see you, hear you, swing at
you or watch one of their own come apart — and they walk around fire rather than through it.

**Two bosses per level**, each dropping a tome. A tome offers three actives or three passives. Dragon
Breath turns the scream into a cone of fire, Bomb Charge detonates whoever you headbutt, Devour lets you
tear a held man open for a chance to heal. Boons last the run and die with you.

**A room that fights back.** Braziers, spreading hay fire, breakable pots, a bell that calls the level,
doors you smash through, tables that slide and crush, oil lamps that spill fire, and the Mill — a
ritual grinding wheel whose arms fling cultists to their deaths and take a heart off you.

**Stands of arms.** A rack with a sword or a shield in it, sometimes one or two to a room and always two
in a boss room. Grab what is in it and throw: a thrown sword goes through the first man it finds and
stays in him, a thrown shield flattens a row of them. Carried, a shield turns three bullets before it
splinters. Both lie where they land, so a stand is worth crossing the floor for twice.

**Level one teaches.** Anything the run has not met yet — the first Bearer, the first Seer, the first
rifle, the Mill, a new boss — turns up on its own, in a room with nothing else in it. By the third level
the game assumes you have seen them and stacks whatever it likes.

**Two milk bowls per level** restore a heart.

**Presentation.** A slightly tilted camera that punches on every kill, blocky cult pictograms stamped into
the floors, blood and gore that persist as paint for the whole level, a kill counter for bodies that land
on top of each other, and a synthesised score — pad, bass and a phrygian motif under ritual percussion
that escalates with how many enemies are aware of you. No audio or image assets at all.

---

## Dev drawer

Bottom-right corner, works with mouse or finger. God mode, spawn any enemy, drop a tome, heal, clear the
room, new level, skip level.

---

## Project files

| | |
|---|---|
| `CONCEPT.md` | What the game is and why. The current design truth. |
| `CLAUDE.md` | How to work on it: architecture, conventions, testing traps, publishing. |
| `CHANGELOG.md` | Version history and the reasoning behind each change. |
| `GOAT_OUT_brief.md` | The original stage-one brief. History, not spec. |
| `js/tuning.js` | Every tunable number and the three level definitions. Start here to change feel. |
| `js/rooms.js` | Room templates as character grids. |
| `tools/harness.js` | Console test harness. |
