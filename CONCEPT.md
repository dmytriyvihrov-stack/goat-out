# GOAT OUT — concept

The design as it actually stands, v0.6. Where this disagrees with `GOAT_OUT_brief.md`, this file wins;
the brief is the original stage-one document and several of its calls have since been overridden.

---

## The pitch

They were driving the goat to the altar. The truck fell off the bridge. Four men died. The goat
survived. Now the whole cult wants its sacrifice back.

A top-down, one-life, procedurally generated escape. You do not fight. You run. People happen to be in
the way.

---

## Pillars

1. **Run, don't fight.** The objective is always the exit. Kills are a side effect of moving through
   people. Skipping a room is valid and sometimes correct.
2. **Geometry kills.** A headbutt alone floors a man. Walls, pillars, braziers, fire, the mill and other
   bodies are what finish him. The room is the weapon.
3. **Clunky on both sides.** Every attack telegraphs and every attack has recovery. Your defence is
   movement, geometry, a held man, and one clumsy roll.
4. **One life, new level.** Death regenerates the level from a new seed in under a second. Nothing is
   memorised, everything is improvised.
5. **Noise is a system.** Every loud thing has a radius and pulls men toward it: bells, pots, gunshots,
   a door coming off its hinges. The scream is the exception — it is the one loud thing that makes no
   noise at all.
6. **Six verbs, forever.** Upgrades bend numbers or change what a button does. They never add a button.

---

## Tone

Deadpan slapstick horror. The sacrifice is the only thing in the building that refuses to die.
Cult of the Lamb's cute-over-blood contrast, Goat Simulator's goat-as-physics-object, Ape Out's
poster-flat violence, Quasimorph's blocky pictograms.

The setting is a fictional masked cult in an unnamed place. Masks, invented glyphs, no real script and
no real nationality. The original meme survives only as the prologue card.

---

## The goat

| Input | Verb |
|---|---|
| WASD / left thumb | Move. Momentum-heavy: 0.15 s to top speed, 0.25 s to stop. Faster than any cultist. |
| Mouse / auto-aim | Aim. On touch the aim follows your run and snaps onto men within about five tiles. |
| Left click / BUTT | Headbutt. Short committed lunge, 0.12 s windup, 0.35 s recovery, no cancel. |
| Hold right click / GRAB | Carry a man in front as a shield. He stops two bullets and any swing. Breaks free after 3 s. |
| Release | Throw. A thrown man kills what he hits and dies on the wall. Your mouth is then empty for about 1.3 s. |
| E / ROLL | Clumsy sideways tumble. Brief mercy frames, then a stagger you must eat, then about 1.3 s before the next one. With no direction asked for it throws you away from whoever is about to hit you, never into a wall or a fire. |
| Space / BAAH | Scream. Everyone in earshot is dazed for about a second, whatever he was doing. It calls nobody. |

Four hearts, no regeneration, one life per level. A new level puts every heart back. Blood smears the
coat as you take hits, so health reads on the character as well as in the corner.

**Cooldowns exist to stop a verb becoming a held button.** Headbutt pays with its recovery; throw and roll
pay with a beat of about a second and a third. Nothing is on a global cooldown and nothing is queued: if a
button is lit it fires, and the corner rail is where you read which ones are lit.

**The skill rail** in the top-right corner is the goat's sheet: four icons for four verbs, each showing
whether it is ready, how long until it is, and what the tomes have done to it. A boon has to change its
icon — Long Horns lengthens the horns there and on the goat, Dragon Breath turns the mouth into a cone of
fire — so a build reads as a shape rather than as a list of names.

He is drawn a quarter turn toward the camera: the head clear of the body, horns sweeping back and out
past the outline, a beard off the chin and a rectangular pupil in a visible eye.

---

## Enemies

| | Behaviour |
|---|---|
| **Bearer** | Melee. 0.58 s windup with a visible swing arc. Dies to any wall, throw, fire or friendly fire. |
| **Seer** | The cult mage. Never closes. Paints a rune under your feet that erupts into witchfire after about a second, and blinks five tiles clear if you get within three. Takes two of anything — two hits, two lightings, two throws — and unlike the Butcher he can still be grabbed, carried and thrown. Arrives late and never two to a room. |
| **Hunter** | Rifle. Keeps five to eight tiles away, aims for 0.8 s with a visible line, bullets travel. Friendly fire is on and he does not care. |
| **Hound** | The cult's dog, and the one enemy that is not a man. As quick as the goat. Cannot be grabbed, and is not there for roughly a third of the headbutts aimed at it. Circles out past your horns, commits to a run, bites once and gets out. One hit kills it — but the scream takes it apart for well over twice as long as it takes a man, and a dazed hound cannot dodge. It is the enemy that exists to make BAAH worth pressing. |
| **Butcher** | Heavy. Three hits, and fire only ever costs him one of them however long he burns. Cannot be interrupted mid-swing, answers a stagger with a quick retaliation, and charges in a straight line after a visible windup. A charge into a wall stuns him for a free hit. Deals one heart. |

**Arena bosses** carry an elite flag: they absorb three hits, going down and getting back up, and a Seer
blinks clear each time. Every boss drops a tome.

**They talk.** Short barks over their heads: on first sight of you, when you are close and they have not
seen you yet, when a scream pulls them somewhere, when they commit to a swing, when a man goes down in
front of them, and when they run into fire. One man speaks at a time so a crowd reads as a cult rather
than as noise.

**They read the room.** Flame, a lit brazier, a rune about to erupt and the arms of the Mill all make a
man steer round rather than through — and for the Mill he checks where the arms will be by the time he
arrives, not where they are now. Hemmed in, he stops at the edge or gives ground. A man already alight has
nothing to dodge and spreads it.

**And they get it wrong.** Every man rolls his own trap sense when he spawns. Fail the roll and he is
blind to what he is walking into for about a second, which is why one man in a crowd still rides the wheel
into a wall while the rest step round it. Avoidance that never fails turns a trap into a fence; the point
is that the room is dangerous to both sides, and the cult is only mostly careful. Hounds read a room
better than any of them.

**Anything that takes more than one hit shows it.** Butcher, Seer and arena elites carry health notches
over their heads, so what is left of a man reads off the man.

---

## Levels

Four levels. Every level holds arena bosses, one Mill room near the middle, and milk bowls that restore
a heart. The later two add a Gallery of posted rifles and a Great Hall.

| | Rooms | Regular enemies | Bosses |
|---|---|---|---|
| **THE ALTAR** | 9 | Bearers, one hound | Two elite Seers |
| **THE YARD** | 12 | Bearers, Seers, hounds | Butcher, elite Seer |
| **THE ROAD** | 14 | Bearers, Seers, Hunters, hounds | Two Butchers |
| **THE BRIDGE** | 16 | All five, mixed | Butcher, elite Seer, Butcher |

**The Great Hall**, late on THE ROAD and again on THE BRIDGE: a single room 38 by 22 tiles holding two
Mills, rows of pillars, hay fields, tables, braziers, lamps, a bell and fifteen men or more. The exit is
on the far side of all of it.

**The Gallery**, on the same two levels: a long room of pillar cover with rifles posted apart from one
another, plus lone rifle posts scattered through ordinary rooms. A rifle on its own is a different
problem from a rifle in a pile, and both levels ask you to solve it.

**Generation.** A chain of hand-authored room templates joined by two-wide corridors, always trending
up and right, validated by flood fill. Templates are randomly flipped on both axes. Enemy budget ramps
toward the exit. Nothing spawns within five tiles of the start. Death means a new seed; the seed is
printed in the corner.

**The first room** is the one you woke up in. The altar stands off to one side — strapped open, waiting,
with the knife and the remains of the goat that went before you — and you are in the pen beside it, on a
cult pictogram burned into the floor. One headbutt anywhere on the bars takes the whole pen apart and is
heard across the level. Stand in it for five seconds without working that out and the floor tells you
which button opens it. Only level 1 starts caged; later levels start you loose in the same room.

**The two rooms after it** carry the controls painted on the floor, the way Ape Out does it, split over
both and with no men in either so they can be read. There is no line about the mouse: a crosshair on a
top-down game explains itself.

---

## The world fights too

- **Walls and pillars** are the kill surfaces.
- **Braziers** set men alight; they run, scream and die, lighting whatever they cross.
- **Witchfire** is the Seer's. His rune erupts into violet flame that lights its own colour, leaves its
  own scorch and burns through Ember Coat, which turns away every ordinary fire in the building.
- **Hay** spreads fire tile to tile and burns down to ash.
- **Pots** break on use and make noise.
- **Bells** call the entire level.
- **Doors** block corridors. The goat smashes through and floors whoever waited behind. Cultists who
  pile up eventually shoulder them open.
- **Tables** slide when headbutted and carry men into the wall behind.
- **Oil lamps** topple into a pool of fire.
- **The Mill** is a ritual grinding wheel with two sweeping arms. It flings cultists to their deaths and
  takes a heart off you. It does not care whose side anyone is on. Its room is deliberately taller than
  the arms are long: there is a lane along the top and the bottom, so the room is crossed by reading it.
- **The pen** in the first room takes three headbutts. The bars bend further with each one.

---

## Tomes

Each boss drops one. A tome offers **three of one kind**: either three actives or three passives. The
first tome of a run always offers actives, so every run picks a skill before it picks numbers. Boons
carry across levels and die with the goat.

**Actives** change what a button does.

- **Dragon Breath** turns the scream into a cone of fire. The gauge goes red.
- **Bomb Charge** makes anyone you headbutt detonate a moment later.
- **Devour** lets you keep holding a man until you tear him open, with a chance to feed.

**Passives** sharpen what you already have: Thick Hide, Long Horns, Iron Skull, Strong Jaw, Living
Shield, Raw Throat, Sure Hooves, Loose Joints, Ember Coat.

---

## Presentation

**Camera.** Top-down with the ground plane squashed by `TILT` so it reads as slightly tilted off
straight down, while creatures stand upright inside it. Roughly 14 tiles across on a phone in portrait,
19 in landscape, 24 on desktop. The view pulls back a little when you run.

**Art.** Hard silhouettes in a seven-colour palette. Every enemy type reads differently at a glance:
Bearer is a circle with a club, Seer a tall pointed hood with a lit staff, Hunter a low hood with a long
rifle, Butcher a big shape in a bone apron with horns on his mask, the hound a long low four-legged thing
with a lit spine and two yellow eyes. The goat reads as a goat from its snout, beard, swept horns and
rectangular pupils — body, a short dark neck and a round head, each edged in dark so the pieces never
merge into one blob from straight above.

**Pictograms.** Cult signs are blocky pixel grids stamped into the floor, snapped to whole decal pixels.
The health hearts use the same language.

**Blood is paint.** Splats, bodies and scorch marks persist for the whole level on a decal canvas. By
the end the level is a record of the run.

**Juice.** Every kill throws the camera away from the body, shoves the lens in, flashes the screen and
sprays chunks that stain the floor where they land. Kills inside 2.4 s of each other stack: the hold gets
longer, and at three the game goes briefly slow.

**Sound.** A pad, a walking bass and a phrygian motif under synthesised ritual percussion that escalates
with how many enemies are aware of you, plus a metallic shaker whenever a Hunter has you. The motif only
enters once somebody knows you are there. No audio assets at all.

---

## Not built yet

Mirrors as an environmental puzzle, pixel art proper, gamepad support, a Priest boss, and the later acts
sketched in the original brief. Enemies are still drawn with canvas primitives rather than sprites.
