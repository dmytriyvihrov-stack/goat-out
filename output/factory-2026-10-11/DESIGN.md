# THE FACTORY (working name): a floor of machines, the cult's rendering works

Concept notes, 11 Oct 2026. Nothing here is built. The brief (the user's, same day): a floor "factory / mechanisms", its
theme the processing of animals; one of its traps the squeezing walls, a press; more design options and traps than one;
and a thought on a mechanical enemy that fire and poison do nothing to. Shown first, decided after.

Four sheets, each rendered by its script on the game's own `Grid` (js/prop-pixels.js) at one texel = 4/3 world px, so a
machine on the props sheet is the same picture laid in a room diagram, and the goat and a clubman stand in every room at
world size (off the atlas, as the villain sheet did):

| sheet | script | what |
|---|---|---|
| `rooms.png` | `rooms.cjs` | three looks for the canon, a dressed 14 x 9 room each, and under it the floor tile, the wall cap and the wall face |
| `machines.png` | `machines.cjs` | every machine and fitting, the moving ones in two or three frames |
| `traps.png` | `traps.cjs` | twelve traps and mechanisms as 9 x 6 room diagrams: the tell in amber cells, the kill in red, the motion as arrows |
| `enemy.png` | `enemy.cjs` | the mechanical man, four looks, each in two states, and a strip at world size beside the goat, a clubman and the ogre |

`lib.cjs` holds the palette (rust, brass, copper gone green, glazed tile, concrete, meat, fat, steam), the shaded-volume
drawer and the three looks' tile painters. `node <sheet>.cjs [zoom]` renders any of them again.

## Why this floor, and where

The game's canons so far are about the room's STONE (what you throw a man into) and about the FLOOR (what is under him).
A factory adds the third thing a room can be: MOVING. The wall that kills comes to the man, the floor carries him, the
hook takes him off it. Pillar 3 holds the same way it does for the wheel: the machine is the killer, the goat only puts a
man where it is, and every machine has a place a man can be put. Canon idea, for `LEVELS[].canon`:

> THE WORKS: Nothing here stands still. The floor carries, the walls come in, the hooks go round, and the lever that
> starts it is as much yours as theirs.

Where in the ladder is his call; two shapes fit:

- **A ninth floor after THE OSSUARY** would move THE LAST SUPPER and THE WARDEN off the last floor, which they own.
  No.
- **Floor seven, THE RAFTERS' place, with THE RAFTERS pushed to eight and THE OSSUARY to nine**, is the one that fits the
  teaching order: the thrower is met alone on THE RAFTERS and the shieldman on THE BRIDGE, and the factory wants both met
  (its machines are what you feed them to). Its own men are the mechanical kind below, met alone in its first rooms. The
  ladder (`GEN_RULES.harder`, `balance.js`) would be re-held.
- **Cheaper first cut**: THE WORKS as a canon only, four to six `canon: 'works'` templates dealt into THE BRIDGE's and
  THE RAFTERS' mix the way a canon's `known` rooms are, no new floor, no new ladder entry. It proves the machines before
  a floor is cut round them.

## The three looks (`rooms.png`)

- **A · THE KILLING FLOOR.** Glazed white tile under everything, in a grid of grout, so blood reads on it like nowhere
  else in the game; gutters cut across the floor to a central drain (render data like the carpets, never a tile); walls
  of riveted iron plate over black brick; the hook rail across the room with sides of meat and the cult's own goats hung
  by the heels; cages of what is waiting; the tally board. Cold, bright, the one floor that is not dark. It costs the
  least: tile, gutter and drain are one swatch and two decals.
- **B · THE RENDERING HOUSE.** Rusted iron plate with rivets, and sections of grating over the dark (offal pits: a
  hazard to look into, not a drop; `T.PIT` would make men avoid it and the floor needs them walking); black brick with
  copper pipes gone green along the walls, a boiler in the corner with its own fire door, vats steaming, the belt along
  one wall into the grinder. Warm rust and green against steam white. The most "machine" of the three.
- **C · THE BONE MILL.** Concrete slabs under bone dust, runs of duckboards, timber walls with iron bands, gears on the
  wall, the press across a lane, the hammer, the hatch, the bone pile with a goat's skull on top. Pale and dusty, brass
  the only colour: the one the press reads best on.

Put to him: one look for the whole floor, or A for its first third, B for the middle, C for the end (the floor darkens as
the goat goes deeper, the way THE CAVE does)? The swatches under each room are what a `PIXEL_ROOMS[canon].sheet` would be.

## The machines (`machines.png`)

Twenty-one sprites. Each is a `Prop` kind, blocking unless said, with its `headbutt()` branch; the moving ones animate
by frame the way the barrel does (`barrel-lie0..7`), never by size.

THE BELT, THE HOOK RAIL (empty, a side, a goat), THE GRINDER, THE PRESS (open, closing, shut), THE SAW, THE STEAM MAIN and
its valve, THE RENDERING VAT, THE HATCH (shut, open), THE FLYWHEEL, THE FURNACE (shut, open), THE HAMMER (up, down), THE
WHISTLE; and the fittings: the stacked cages, the drain, the tally board, the lever (up, thrown), the offal barrow, the
bone pile, the winch, the sorting gate (shut, swung), the scale.

## The traps and mechanisms (`traps.png`)

The rule for all twelve: the machine kills, by the rules a wall or the wheel already kill by (`splatLimit`, `die(…, how)`
with a token of its own for RUN STATS and the death card), and the goat is hurt by it the way he is hurt by fire or the
wheel (a heart, `Goat.damage` with a source), never a new kind of harm. Every one is a hazard to `hazardAt` so the cult
reads it as it reads the wheel (`trapSense`, the one who fails his roll walks into it). Nothing adds a key (rule 1): a
lever is a headbutt, a valve is a headbutt, a gate is a headbutt. Every number goes to `TUNING.works`.

1. **THE PRESS LANE** (his press). Two iron slabs on rams either side of a two-tile lane, a lever at the lane's mouth.
   Thrown, the slabs close over `press.time` s (amber cells along their faces, the game's windup tell) and open again
   after `press.hold`. Whoever is between them when they meet is paste, man or goat; the roll carries him through a
   closing press, a walk does not. The cult runs the lane after him: the lever is the lure. `GEN_RULES.press`: the lane
   is never the only way through a room with the lever on the far side of it.
2. **THE CLOSING ROOM** (his squeezing walls, the whole-room form). A room whose two long walls are slabs on rams: once
   the goat is `closing.inset` tiles in, both grind inward a tile every `closing.step` s and stop at a `closing.min`-tile
   lane down the middle. A man against a wall as it moves dies on it (the wall's own kill), and so does the goat; the way
   out is at the far end. The room is never a trap in the planner's sense (it holds its men), and the walls open again
   when the room is cleared, so a clamp never shuts him in a two-tile corridor. The louder cousin of THE FUNNEL's canon.
3. **THE BELT INTO THE GRINDER.** A belt lane across the room, `belt.speed` tiles a second toward the grinder's mouth.
   Anything standing or lying on it is carried: a man floored onto it (a headbutt, a shove, DEAD WEIGHT) rides to the
   mouth and goes in whole (mince out of the spout, `motes.per` of him as ever); the goat rides too unless he steps off
   (no harm, a free fast lane the other way round). A crate on it is ammo delivered. The cult reads the belt as the wheel.
4. **THE SAW LANE.** A slot across the floor, a blade on a carriage going up and down it at `saw.speed` tiles a second;
   the cells ahead of it are the tell (`drawTelegraphCells`' band, as the hound's dash). On the slot when it passes: a man
   is cut (a blade kill, token `saw`), the goat loses a heart. It never stops, so the room is a rhythm, THE MILL's cousin.
5. **THE STEAM MAIN.** The pipe runs along the far wall with a valve wheel on it. A headbutt on the wheel opens it for
   `steam.for` s: a jet `steam.reach` tiles down the lane (white cells), a heart and `steam.daze` to a man in it. Steam
   puts out any ordinary fire it meets (the one thing in the game that does): a coals room and a steam room are two
   different fights, and the mechanical men below are what it is really for.
6. **THE HOOK LINE.** Hooks going round the room on an overhead rail, a tile a second. A body flung into one is caught
   and carried (the chandelier's air pass over everybody, `drawChandelierAir`) to the vat at the rail's end and dropped
   in. Under a hook standing up, a man is lifted off his feet too (hooked, as the butcher hooks the goat, `goat.hooked`
   machinery); the roll ducks it. A room's hooks are its clock: every lane is safe for a while, then not.
7. **THE HATCH.** A two-leaf iron trap over the chute, a lever a few tiles off. Thrown, the leaves drop for `hatch.open`
   s: a `T.PIT` that is there and then not (`World.caveDirty`, the flow fields rebuilt, as a clamp does). Whoever stands
   on it falls (`'fall'`, no absorb). The cult avoids it only while it is open, so a man chased across a shut hatch is a
   man standing on it when the lever is thrown.
8. **THE HAMMER.** A stamp on a rhythm over a two-tile plate in the one way through a room (THE FUNNEL's narrow part).
   Its shadow grows for `hammer.wind` s, then it comes down: a man under it is flat (`'splat'`, the chandelier's kill), the
   goat loses a heart and is stunned. Cross between the beats; a man shoved onto the plate at the wrong beat is dead.
9. **THE FURNACE DOOR.** An iron door in the wall. Butted open it breathes a tongue of fire `furnace.reach` tiles into
   the room for `furnace.breath` s (`World.ignite`, ordinary fire) and lights the coal dust lying on the floor round it
   (the powder's rule, `game.powder`). A body flung into the open door burns outright. The FIRE canon's machine.
10. **THE VAT TIPPED.** A tub of boiling fat on a trestle. A body flung in is gone in a burst of steam (a kill, token
    `vat`). A headbutt tips it (`Prop.flipTable`'s cousin): a spill of scald `vat.spill` tiles across, a heart and the
    poison's slow to anyone in it for `vat.hot` s, then a slick that stays (the slow only). Steam off it puts out fire.
11. **THE SORTING GATES.** Stockyard gates on pivots make the room a pen of lanes. A headbutt swings one (`Prop.doorSwing`
    on a bar that is not a door): shut a lane on a man's face (dazed, as the horse bowls), cut the pack in two, open a way
    the cult has not got. No lever, no clock: the one mechanism that is only geometry, and the cheapest to build.
12. **THE WHISTLE.** A steam whistle in every room on the far wall. A headbutt on its cord, or the room's own clock
    (`whistle.every`): a shriek for `whistle.for` s that deafens the room: no footstep is heard, and every man turns to
    it (`Enemy.investigate` to its tile, `noise.cult` so it is not his). Stealth from the second floor, bought by a blow.

Combinations the generator could deal as `combos` (the existing `COMBOS` machinery): THE BELT AND THE THROWER (he lifts
what the belt brings him), THE HOOK LINE AND THE RIFLE (cover that moves), THE PRESS AND THE SHIELDMAN (his bash into a
closing press), THE WHISTLE AND THE SHAMAN (his call drowned).

## The mechanical man (`enemy.png`)

The brief: an enemy with protection from fire and poison. In the code that is two flags: `TUNING.<kind>.immune.fire`
(the wraith's, `Enemy.ignite` refuses ordinary flame; `immune.witch` the rat ogre's, refuses the god's fire too) and a
new `immune.poison`, which `Status.poison` does not have yet (a puddle's onset would skip him, the spit glob bead off).
The reasons are the picture: no flesh, so nothing burns (fire FEEDS the furnace kinds, see A); no blood, so nothing
poisons (VENOM JAW's drip runs off him in beads, a puddle under him is just wet iron). What he is NOT immune to is the
point of the floor: **water and steam** put his fire out (the vat's spill, the steam main, the tipped vat: he stops dead
and dies the way a wall kills), **stone** cracks the boiler (a headbutt only rocks him, like the ogre: `fling` refuses him,
`hornsHurt` false; the wall, the press, the hammer, the grinder kill), and **witchfire** melts what ordinary fire cannot
(`immune.witch` false): the seer's rune is worth something again on a floor where fire is nothing. Blades notch iron
(a heart, as the ogre). All four are `unliftable`.

- **A · THE STOKER.** A furnace on legs: boiler body, firebox belly with the grate glowing, a stovepipe head with a
  pressure gauge for a face, a shovel in one hand and tongs in the other. Slow, three hearts, the clubman's swing with
  the shovel. **Fire feeds him**: walked through flame (his own men's braziers, the goat's DRAGON BREATH, a burning
  tile) he is STOKED for `stoker.stoke` s: faster, the gauge red, fire out of the stack, and every blow he takes lights
  the floor under him. The tell before his heavier blow is the gauge needle going round. Hurt, he vents: a ring of scald
  the ogre's quake size, steam not stone. The fire set's player (KINDLING, EMBER) meets the one man his build makes
  stronger, and the steam main is right there.
- **B · THE WOUND MAN.** A clockwork butcher: brass bones, a glass skull with the works turning in it, an iron apron,
  a cleaver, the key in his back. He runs `wound.run` s on a wind, then **stops dead where he stands** (a statue; cover
  that stops rounds) until a tender, a plain clubman marked with a key on his belt, comes and winds him `wound.rewind` s
  from behind. A headbutt on the key from behind over-winds him: `wound.amok` s at double speed swinging at whoever is
  nearest, his own men included, then he springs apart into brass pieces (`Scatter.breakUp`). Stopped, he is an `item`:
  carried and thrown like a crate, and a brass body kills on a wall. Kill the tender and wait him out, or wind him up
  into his own pack. Fire anneals the spring (his wind runs out ×2 faster), poison runs off.
- **C · THE MAW.** The grinder on legs: a hopper for a face with two toothed rollers in it, two lamps for eyes, a boiler
  belly, a chimney, piston legs on iron hooves. It eats: its blow is the thrower's grab from the front, the goat caught
  loses a heart and is spat out stunned (the shove's rule, never swallowed), and a body lying on the floor is eaten in
  `maw.eat` s, after which it is FED: faster for `maw.fed` s, the chimney smoking. A reason not to leave bodies. What
  kills it is **jamming**: a crate, a shield, the shieldman's board or a bomb thrown into the hopper (a bomb: it bursts);
  a burning crate jams AND burns inside it (dazed long, flames out of the chimney); a poison barrel thrown in jams it
  and it spews venom round itself for `maw.spew` s, a fountain of puddles. A lunge into stone jams its teeth on its own.
- **D · THE IRON HOUND.** A boiler on four pistons, a hinged brass jaw, a whistle on the brow, a stack for a tail, a
  leather collar (the one thing a goat's teeth could take, BY THE COLLAR's TOO QUICK answered with TOO HOT). The hound's
  ring and dart, but it must **build steam** to dart: a longer windup than the hound's (the gauge filling, steam off the
  joints, the amber band), a longer dart, and a cloud of steam off it at the end of the run that hides it a beat. Stone
  ends the dart the way it ends the hound's (pillar 3), and it bursts. THE FULL THROAT's stun stops the pistons.

If one kind only: **A · THE STOKER** is the floor's own man (the furnace is the floor's picture, his immunity is read
off his belly at a glance, and the steam main is the answer the room already holds); **C · THE MAW** is the boss (it
is the grinder every room has been feeding, and its kill is a thing the goat already throws). B and D are the extras a
later floor could deal into its pool: B is the cheapest to build (a clubman with a clock and an item state), D a hound
with a longer windup and `immune` flags.

A corrupted version of any of them (a soul in the works, the gauge violet) needs no new drawing: the boss outline and
`SOUL_HAZE` do what they do for every kind.

## What it costs, roughly

Three looks' swatches: a `FLOOR_SHEET` and a wall pair each, the gutter and drain as decals. Twenty-one props at
`PROP_PIXELS` size, the moving ones in frames. Twelve mechanisms: four of them are old machinery with a new picture (THE
HATCH is a clamp's tile change, THE HAMMER is the chandelier's fall on a clock, THE FURNACE DOOR is a brazier's spill with
reach, THE SORTING GATES are doors that are not doors), four are the wheel's family (THE BELT, THE SAW, THE HOOK LINE, THE
PRESS: a hazard that moves and a kill on contact), THE CLOSING ROOM is the one real new system (walls that move: the
tiles change under men, `World.caveDirty` and the fields every step of the way, the clamp's rules about who is shut in),
THE STEAM MAIN and THE VAT are fire's counter (a new `World.quench`), THE WHISTLE is a noise. One kind of mechanical man
is a clubman with `immune` flags and a stoke clock; the others each have one mechanic of their own.
