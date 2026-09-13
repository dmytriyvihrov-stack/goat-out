# GOAT OUT

You are the sacrificial goat. They were driving you to the altar, the truck fell off the bridge, and now
the whole cult wants you back. Four levels, one life, procedurally generated every run.

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
| BUTT on the bars | left click on the bars | break out of the pen you start level 1 in |
| BUTT | left click | headbutt — into a wall, pillar, brazier or another man it kills; on open floor it only knocks down |
| hold GRAB | hold right click | carry a man in front as a shield — he stops two bullets and any swing |
| release GRAB | release right click | throw — he kills what he hits and dies on the wall. Then a beat before you can grab again |
| ROLL | E | clumsy sideways tumble with brief mercy frames, on a short cooldown. Ask for no direction and it throws you clear of whoever is about to hit you |
| BAAH | space | scream — everyone in earshot is dazed for a second, whatever he was doing. It calls nobody. |
| tap after death | Backspace | new level |
| — | M | mute |

Dragging on the right half of the screen overrides auto-aim with a manual direction.

Four hearts, no regeneration. Death regenerates the level from a new seed in under a second. The seed is
printed in the top right.

---

## What is in

**Four levels.** THE ALTAR is Bearers, with one hound near the end of it. THE YARD adds Seers, late and
one to a room. THE ROAD adds Hunters, posted on their own as well as in crowds. THE BRIDGE mixes all five.
Every level carries more hounds than the one before. Each is a chain of hand-authored rooms stitched
together differently every run, and each one hands your hearts back.

**A pen, not an altar.** Level 1 starts you caged beside the slab they meant to use, with the goat that
went before you opened up on the floor and their tools laid out beside it. Three headbutts take the bars
apart and tell the building where you are. The two rooms after it carry the controls painted on the floor
and hold nobody.

**The Great Hall.** Late on THE ROAD and again on THE BRIDGE: one room 38 by 22 tiles with two Mills,
pillar rows, hay, tables, braziers, lamps, a bell and fifteen men between you and the far door. The
**Gallery** on those levels is the opposite problem — pillar cover and rifles posted well apart.

**Five enemy types.** Club-swinging Bearers, blinking Seers whose runes erupt into violet witchfire that
no boon protects you from, Hunters whose bullets travel and hit their own, the Butcher who takes three
hits and cannot be interrupted mid-swing, and the hounds. They shout short lines when they see you, hear
you, swing at you or watch one of their own come apart — and they read the room: fire, lit braziers, a
rune about to go off and the sweeping arms of the Mill. Not all of them read it correctly.

**The hounds.** As quick as you are, and the only thing in the compound you cannot get hold of. A hound
circles out past your horns, picks a moment, runs in for one bite and gets out again — and it is not
there for a good share of the headbutts you aim at it. One hit kills it. The answer to a pack is the
scream: a hound loses far longer to BAAH than a man does, and a dazed hound cannot dodge at all.

**Two bosses per level**, each dropping a tome. A tome offers three actives or three passives. Dragon
Breath turns the scream into a cone of fire, Bomb Charge detonates whoever you headbutt, Devour lets you
tear a held man open for a chance to heal. Boons last the run and die with you.

**A room that fights back.** Braziers, spreading hay fire, breakable pots, a bell that calls the level,
doors you smash through, tables that slide and crush, oil lamps that spill fire, and the Mill — a
ritual grinding wheel whose arms fling cultists to their deaths and take a heart off you.

**Two milk bowls per level** restore a heart.

**The skill rail**, top right: your four verbs as icons, whether each is ready, the cooldown on throw,
roll and scream, and what your tomes have done to each of them. Long Horns lengthens the horns on the
icon and on the goat; Dragon Breath turns the scream into a cone of fire.

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
