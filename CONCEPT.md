# GOAT OUT — concept

The design as it actually stands. The original stage-one brief it replaced is in git history
(`GOAT_OUT_brief.md`); several of its calls have since been overridden.

`GENRE_RESEARCH.md` is the review research behind these pillars: what critics and players actually
praised and blamed in Hotline Miami, Ape Out and format-mates that stayed niche, boiled down into a
genre guideline. Background reading, not itself a design decision.

---

## The pitch

They were driving the goat to the altar. The truck fell off the bridge. Four men died. The goat
survived. So did his wife. They were caught, penned together, and she was taken first. Now the whole
cult wants its other sacrifice back, and the goat is loose in the building.

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
   One exception was made on purpose (18 Sep 2026): a talisman with a use of its own — the boomerang,
   the strange symbols, the straw effigy — puts it on Q, a key that does not exist until one is worn.

---

## Tone

Deadpan slapstick horror. The sacrifice is the only thing in the building that refuses to die.
Cult of the Lamb's cute-over-blood contrast, Goat Simulator's goat-as-physics-object, Ape Out's
poster-flat violence, Quasimorph's blocky pictograms.

The setting is a fictional masked cult in an unnamed place. Masks, invented glyphs, no real script and
no real nationality. The original meme is not written down anywhere any more — the opening scene plays
it out instead, and the first screen is a menu.

---

## The goat

| Input | Verb |
|---|---|
| WASD / left thumb | Move. Momentum-heavy: 0.15 s to top speed, 0.25 s to stop. Faster than a man once he has a run-up behind him; a hound is always quicker. |
| Mouse / auto-aim | Aim. On touch the aim follows your run and snaps onto men within about five tiles. |
| Left click / BUTT | Headbutt. Short committed lunge, 0.12 s windup, 0.38 s recovery, no cancel. Deliberately blunt out of the pen: short reach, little throw behind it, and long enough on the end that a second man walks in on it. A man thrown into a man standing next to him kills him, and dies with him if he arrived fast enough. |
| Hold right click / GRAB | Carry a box, a blade or a shield. **A man is a soul away** — until BY THE COLLAR is swallowed the mouth takes objects and nothing else. |
| Release | Throw. A thrown man kills what he hits and dies on the wall. Your mouth is then empty for about 1.3 s. |
| E / ROLL | A clumsy sideways tumble, brief mercy frames, a stagger you must eat, about 1.3 s before the next one. With no direction asked for it throws you away from whoever is about to hit you, never into a wall or a fire. The one verb that is whole out of the pen; **DEAD WEIGHT** is what its soul buys, and everything the tumble goes through loses its head. |
| Space / BAAH | A noise. Every man who hears it walks to the spot you made it at, which empties one end of a room and fills the other. **THE FULL THROAT** turns it into a blow that dazes everyone in earshot; **DRAGON BREATH** turns it into fire. You get one of the two. |

**Two of the four buttons start half-shut, and the souls open them.** A goat out of a pen can run, put
his head into things, get out of the way, pick up what is lying about, and shout — that is the whole
animal. What he cannot do is carry a grown man, and his voice is a voice and not a weapon. Each of
those is a soul, and the bare headbutt is blunt enough that LONG HORNS and IRON SKULL are felt rather
than noticed. The run starts weak on purpose: the power fantasy is the climb, and there is nothing to
climb from if the first room already hands you everything. The rail says which half you have —
`THINGS` before GRAB, `CALL` before BAAH — so a half-lit chip is a promise rather than a missing
feature. The keys are written under the chips; what a verb does is a sentence the pointer brings up.

Four hearts, no regeneration, one life per level. A new level puts every heart back. Blood smears the
coat as you take hits, so health reads on the character as well as in the corner.

He is drawn a quarter turn toward the camera: the head clear of the body, two tapered horns rising off
the crown and sweeping back clear of the outline, a beard off the chin and a rectangular pupil in a
visible eye. Facing left he is mirrored rather than turned over, so the horns stay on top.

**His wife** appears only in the opening scene: wool where he has a coat, a dark face, no horns, no
beard, and the same marigold collar. She bleats in a higher voice than he does.
**Cooldowns exist to stop a verb becoming a held button.** Headbutt pays with its recovery; throw and roll
pay with a beat of about a second and a third. Nothing is on a global cooldown and nothing is queued: if a
button is lit it fires, and the corner rail is where you read which ones are lit.

**The skill rail** in the bottom-right corner (the top right on a touch screen) is the goat's sheet: four icons for four verbs, each showing
whether it is ready, how long until it is, and what the souls have done to it. A boon has to change its
icon — Long Horns lengthens the horns there and on the goat, Dragon Breath turns the mouth into a cone of
fire — so a build reads as a shape rather than as a list of names.

---

## Enemies

| | Behaviour |
|---|---|
| **Bearer** | Melee. About half a second of windup with a visible swing arc. Dies to any wall, throw, fire or friendly fire. |
| **Brute** | A clubman built twice over: three killing blows, four when he is the one in the arena. A big shape in a bone apron with a bull's skull for a mask and a cleaver (since 1.66 — the Butcher's old body), and notches over his head counting down. Seen from three tiles or more with a clear run, he plants, roars and charges where you are going; a charge into a wall stuns him for a free hit. He is how level 1 says "some of them take more than one" without spending a boss on it, and he is unmistakable across a room — which is the point of him. |
| **Seer** | The cult mage. Never closes. Paints a rune under your feet that erupts into witchfire after about a second, and blinks five tiles clear if you get within three. Takes two of anything — two hits, two lightings, two throws — and unlike the Butcher he can still be grabbed, carried and thrown. Arrives late and never two to a room. |
| **Hunter** | Rifle. Keeps five to eight tiles away, aims for most of a second with a visible line, bullets travel. Friendly fire is on and he does not care. |
| **Hound** | The cult's dog, and the one enemy that is not a man. As quick as the goat. Cannot be grabbed, and is not there for roughly a third of the headbutts aimed at it. Circles out past your horns, commits to a run — flattened, streaking, eyes lit, which is the one tell you get — bites once and gets out. A pack sends one in at a time, so three hounds are hard rather than unreadable. One hit kills it — but the scream takes it apart for well over twice as long as it takes a man, and a dazed hound cannot dodge. It is the enemy that exists to make BAAH worth pressing. |
| **Ogre** | Heavy: the cult's ogre (1.66, once the Butcher) — a hunched two-legged half-beast in the cult's red hood and mantle, not the rat ogre. Nothing knocks him back. Four hits, and fire only ever costs him one of them however long he burns. He has no swing. Out of reach he crouches with a ring drawn on the floor where you stand and leaps onto it, over men and holes; close in he brings both fists down on the floor, a ring round him on every side. Both leave him on his knees long enough to be hit, and his own men inside a ring are left standing. A scream breaks the crouch, never the leap. Deals one heart. |

| **Wraith** | THE OSSUARY's, and the one thing in the game that is not there most of the time: mist, nothing to hit, and walls are not walls to it. It works round to the side you are not facing and only there becomes a body — committed, swinging, and solid for most of a second after. A wraith can also lie in a room disguised as a box or a tuft of grass. See THE OSSUARY below. |

**Arena bosses** carry an elite flag: a Seer or a wraith in the ring absorbs three hits, going down and
getting back up (a Seer blinks clear each time); a brute in the ring takes four, and the ogre his own
four. A boss who carries one of the level's souls glows, and pays it out when he goes down.

**They talk.** Short barks over their heads: on first sight of you, when you are close and they have not
seen you yet, when a scream pulls them somewhere, when they commit to a swing, when a man goes down in
front of them, and when they run into fire. One man speaks at a time so a crowd reads as a cult rather
than as noise.

**They have a front and nothing else.** A man sees what is inside his cone and nothing outside it,
however close you are standing — walk up behind one and he does not know. What gives you away back
there is noise: running makes it, the gong makes it, a door coming off its hinges makes it, and a man
who hears something turns to face it and goes to look. Bumping into him counts as being seen, a rifle
posted to watch a door has no blind side worth walking round, and the dead do not need eyes at all.
Stealth is never the plan, but it is always available, and how loud you are is the whole of it.

**They read the room.** Flame, a lit brazier, a rune about to erupt, a spike plate about to come up,
the lip of a drop and the arms of the Mill all make a
man steer round rather than through — and for the Mill he checks where the arms will be by the time he
arrives, not where they are now. Hemmed in, he stops at the edge or gives ground. A man already alight has
nothing to dodge and spreads it.

**And they get it wrong.** Every man rolls his own trap sense when he spawns, and rolls against it once
per encounter rather than continuously — a man who re-checks the same wheel forever eventually walks into
it however careful he is. Fail the roll and he is blind to what he is walking into for about a second,
which is why roughly one man in seven crossing the Mill still rides it into a wall while the rest go round. Avoidance that never fails turns a trap into a fence; the point
is that the room is dangerous to both sides, and the cult is only mostly careful. Hounds read a room
better than any of them.

**Anything that takes more than one hit shows it.** The ogre, the brute, the Seer and arena elites carry health notches
over their heads, so what is left of a man reads off the man.

---

## Levels

**Difficulty is a curve, and the curve is data.** Two rules run it. First, every kind is met on its own:
the room that first shows you a clubman, a brute, a hound, a mage or a rifle holds that one enemy and
nothing else, and a boss you have never seen stands in his arena alone. A set piece counts as a kind:
the Mill's room never introduces a man and holds nobody at all on the level that first shows you the
wheel, and a kind with an arena waiting for it is met in the open before it is met in the ring. Second,
rooms are bought with
threat rather than with bodies — a rifle costs more than a clubman, a mage more than a rifle — off a
curve that runs from the level's first fighting room to its last. So a later room is both fuller and
nastier, and a later level is harder than the one before it. Caps keep any single room readable: one
mage, one champion, two rifles, seven men — raised floor by floor where a floor is built to be crowded
(eight or nine on the late ones). `node tools/balance.js` prints what the numbers produce and fails when a
rule breaks.

Eight floors, and two more that stand in for one of them (THE DARK and THE TRIP, below). Every floor holds
arena bosses, one Mill room near the middle, and a tuft of grass every few rooms that gives a heart back.
The later ones add a Gallery of posted rifles, a Great Hall, a killbox, grating that bites, one floor built
the other way round — almost no walls, and furniture instead — and one whose floor is not all there.

**Every level is about one thing.** Each has a canon — one idea — and at least half of its ordinary
rooms are built round it: STONE on THE ALTAR (pillars and corners; the wall is the weapon), FIRE on
THE YARD (coals and straw in every room, before the mage brings his own), THE HOLLOW on THE CAVE (no
wall runs straight, so a man thrown along the rock slides), THE LINE on THE ROAD (long
sightlines and hard cover, and the strip a rifle cannot see), OPEN GROUND on THE THRESHING FLOOR, THE
FUNNEL on THE BRIDGE (every room narrows somewhere, and seven men are one man in a doorway), THE DROP
on THE RAFTERS, and THE NICHE on THE OSSUARY (a body cannot form inside stone, so the rooms are stone to
put your back to with open floor between); THE LAMP is THE DARK's. The rest of a level's ordinary rooms
are the mix: the plain rooms and the canons of every level before it, never an idea the run has not
reached. On the floors crowded with set pieces (THE ROAD, THE BRIDGE) the canon takes every ordinary room
there is and no mix is left. Within a pool a floor walks from its tightest rooms to its most open ones,
so a level opens up as it goes. The dev drawer's RULES page shows the split for any level, room by room.

**The killbox**, late on the five floors that have rifles. A wide room with almost nothing in it and two
rifles posted on the far side of it, watching the door you have to come in by. A posted man sees a good
deal further than one wandering a room and he does not leave his post: he turns on the spot and fires
whenever he has the shot. There is a shield on a stand beside the door, two of their own on your side of
the room to pick up and carry in front of you, two bits of cover halfway across, and the corridor behind
you. The room asks which of those you trust.

In run order (read off `LEVELS` in `js/tuning.js`; a room count includes the first room, the arenas and
the rest rooms):

| | Rooms | Canon | Regular enemies | Bosses |
|---|---|---|---|---|
| **THE ALTAR** | 12 | Stone | Bearers, brutes | Brute, ogre |
| **THE YARD** | 12 | Fire | Bearers, brutes, hounds, Seers | Ogre, elite Seer (sealed in) |
| **THE CAVE** | 13 | The hollow | Bearers, brutes, hounds heavy, Seers | Ogre, brute |
| **THE ROAD** | 14 | The line | All five, rifles new | Two ogres |
| **THE THRESHING FLOOR** | 13 | Open ground | All five | Elite Seer, ogre, brute |
| *or* **THE DARK** | 12 | The lamp | Bearers, brutes, hounds and Seers heavy; never a rifle | Elite Seer, ogre, brute |
| **THE BRIDGE** | 15 | The funnel | All five | Ogre, elite Seer, ogre |
| **THE RAFTERS** | 15 | The drop | All five | Elite Seer, ogre, brute |
| **THE OSSUARY** | 15 | The niche | Wraiths, and a garrison | Ogre, elite wraith, elite Seer |

**THE CAVE** is third: out under the compound the ground stops being built. No wall runs straight and
no corner is square, so a man thrown along a bend slides round it and dies only on what he hits square —
a boulder, the end of a bend. Tall grass hides whoever is in it, the goat included, and stone teeth at
the foot of the rock kill a man and cost the goat a heart. Nothing new walks in; the ground is the new
thing, the last floor about the ground before the rifles make it about what stands on it.

**THE FORK and THE DARK.** THE ROAD's last room has two flights of stairs. The lit one climbs to THE
THRESHING FLOOR; the cold one to THE DARK, which is played in its place: cellars where nothing is lit
but what burns. Every room with men in it stands a lamp or two, and the lamp is the choice — it shows
them to you and you to them, and a headbutt puts it on the floor alight and then the room is black. A
lantern on the wall by every door is never put out. Out of the light the cult sees you only close and
hunts by what it hears. Fewer men, no rifles, hounds and Seers oftener.

**THE TRIP.** A tuft of pale mushrooms lies on some floors. Eat it and the next floor is played as THE
TRIP: a glowing cave where every key is the other way round — the stick reversed, the horns and the
teeth swapped, the tumble and the voice swapped — with the first floor's men and the first floor's
curve, because what is asked of the hands is already the whole difficulty. Take THE FORK's dark flight
after eating them and the dark wins: the trip was the lit floor's.

**THE OSSUARY** is the last ground and the only one whose enemy cannot be fought on the terms the rest
of the game taught. A wraith is mist: nothing reaches it, it reaches nothing, and it goes through the
walls. It circles to the side of you that you are not looking at, and only there does it become a body —
at which point it is committed, it swings, and it stays a body for most of a second afterwards. That
window is the whole fight. Everything works in it and nothing works outside it, so the level is not
about reach or cover but about where you are looking and who you have let get behind you. The one thing
the ground still does for you is that a body cannot form inside a stone: put your back to a wall and you
have taken an arc away from them. The hint on the floor of its first room is the whole lesson — it
cannot stop once it starts, so let it start.

**THE THRESHING FLOOR** is the level that asks the opposite question. Its rooms are half again as wide,
the ways between them are five tiles across, and there are almost no doors — it is one open yard, and a
headbutt on open ground still only knocks a man down. What kills out there is what is standing in it: a
field of stone posts, table rows you can shove into lanes, an island of posts ringed by open floor,
braziers down the flanks, and a ring of hay that becomes a wall the moment you light it and never
becomes floor again. Rifles hold the long lines and hounds own the middle, so the level is one long
argument about which half of a room is yours.

**THE RAFTERS** is up in the roof of the hall, and it is the first ground in the compound that is not
all there. Holes in the boards, windows in the walls, and the same drop under both. A man who goes over
an edge is gone — no body, no blood, nothing left on the floor — and the goat is only rented to it: he
comes back up on the last boards he stood on a heart lighter, the same price the Mill charges. That
price is the whole design of the level. Free, and every room is a shortcut; fatal, and nobody goes near
the interesting half of one. Nobody paths into a hole, so the men take the long way round the ends —
except the one in a crowd who reads it wrong, which is the man you can lead over the edge.

**The Great Hall**, late on THE ROAD and again on THE BRIDGE: a single room 38 by 22 tiles holding two
Mills, rows of pillars, hay fields, tables, braziers, lamps, a bell and a crowd — about seven men on THE
ROAD, fifteen or more on THE BRIDGE. The exit is
on the far side of all of it.

**The Gallery**, on the same two levels: a long room of pillar cover with rifles posted apart from one
another, plus lone rifle posts scattered through ordinary rooms. A rifle on its own is a different
problem from a rifle in a pile, and both levels ask you to solve it.

**Generation.** A chain of hand-authored room templates joined by two-wide corridors (five on THE
THRESHING FLOOR), running left to right with now and then a room hung above or below the last one up a
shaft, validated by flood fill. Templates are randomly flipped on both axes. Enemy budget ramps
toward the exit. Nothing spawns within five tiles of the start. Death means a new seed; the seed is
printed in the corner.

**You see a room when you open its door.** A room is dark until the goat has walked into it, and then
it stays lit for the rest of the level. Corridors are always visible, so what you can see ahead of you
is a doorway and whatever is standing in it. Before this, a corridor ended in a room you had already
read from twenty tiles away and every room in the game gave you the same length of warning.

**The way out is barred.** Every level ends on an iron door in front of its stairs: three blows, no
shouldering it open, and every blow is noise. The last thing a level asks is that you stand still in
the open with whatever is left of it walking toward the sound.

**Stairs.** The exit is a flight of steps cut into the right wall of the last room, climbing into
light. The goat takes them for a moment, rising and thinning out, before the cards. Every level after
the first is entered up another flight cut into the left wall of its first room, and the goat comes up
it under the level card. Those later first rooms are bare: the altar, the tools and the remains belong
to level 1 alone.

**The first room** is the one you woke up in. The altar stands off to one side — strapped open, waiting,
with the knife and the remains of the one that went before you, about your own size — and you are in
the pen beside it, on a cult pictogram burned into the floor. Across the room stands a second, smaller
cage with a sheep in it that stopped waiting a while ago — three blows open that one, and what it is
worth is the one line the room ever says about her. Seven blows anywhere on your
bars take the whole pen apart and are heard across the level; the third and the sixth take your feet out
from under you. Stand in it for five seconds without working that out and the floor tells you which
button opens it.

**The opening scene** plays in that room, once, when a run starts from the title. The goat and his wife
are in the pen, pressed together and trembling, a heart beating between them. Two men come round the
other cage: one with the boning knife from beside the altar, one with a club. The knife man puts a boot
to the gate, walks round the goat, and takes her; the goat goes for him and meets the club instead. The
picture goes dark with the stars still turning, she bleats once from a long way off, the level card
comes up in the dark, and the light comes back on the pen with the goat lying where he fell and the gate
up again. Nothing in it touches the simulation: the level underneath is exactly the one you would have
got. Any button after the first moment skips to the dark. A death does not replay it.

**The controls are painted on the floor** where each verb is first needed, the way Ape Out does it: the
pen says how to move, the floor under the first man says what the headbutt does, the room that stands a
blade in front of you says GRAB, and ROLL is written in a room before the first arena. There is no line
about the mouse: a pointer on a top-down game explains itself.

---

## The world fights too

- **Walls and pillars** are the kill surfaces.
- **Braziers** set men alight; they run, scream and die, lighting whatever they cross. A headbutt on
  one — or a body arriving at speed — knocks a spill of coals out of the far side of it: a tile of fire
  a beat long, a line drawn across a doorway, and the bowl takes three seconds to build its heat back.
  The flame drops and climbs so you can read when it is ready.
- **Witchfire** is the Seer's. His rune erupts into violet flame that lights its own colour, leaves its
  own scorch and burns through Ember Coat, which turns away every ordinary fire in the building.
- **Hay** spreads fire tile to tile and burns down to ash.
- **Pots** break on use and make noise. Thrown, one breaks on the first thing it meets — a man, a shut
  door, a gong — and a pot into a lamp post takes the lamp over, which is how you start a fire across
  a room without crossing it.
- **Bells** call the entire level, and ring for anything that hits them.
- **Doors** block corridors. A plank door goes on the first blow, an iron one (from THE YARD on) takes
  three, and the goat goes through on the last and floors whoever waited behind it; cultists who pile up eventually shoulder them open from their side. Two extra beats
  of being held still in a corridor, with whatever heard the first blow already coming, is what the
  door is for. Nothing flies through a shut one: a pot breaks on it, a blade snaps on it, a shield
  rings off it. A table sliding at speed, or a brute on a charge, takes it off its hinges.
- **Grating**, from THE ROAD on. The teeth come up where you have already been: crossing a
  plate arms it and it bites a beat later, so what it takes is the ground you have just left — which is
  the ground whoever is chasing you is standing on. A man dies on them and the goat pays a heart, and
  a man held over one as the teeth come is taken out of your mouth by them.
- **Drops** — holes in the floor and windows in the walls — on the level that has them. Anything thrown
  through one is gone — a man, a pot, a blade, a shield, a table that comes to rest over it; walking
  into one costs a heart and puts you back where you stepped off. The panic roll never ends in one.
- **Tables** slide when headbutted and carry men into the wall behind. At speed one takes a shut door
  off its hinges, and stops on anything a man would: a brazier, the wheel, another table.
- **Oil lamps** topple into a pool of fire, and a lamp post is not a pillar: a body thrown into one
  takes it over and the oil goes down where the body is about to land. So does a pot, a thrown blade,
  a brute on a charge, or fire that has burned its way up to the post.
- **Stands of arms** hold a sword or a shield, and they are rare: one to an arena, about one ordinary
  room in six, and nothing at all on level 1 until halfway in. Nothing you take off one survives being
  used up. A thrown blade goes into whatever it finds, and a blade thrown at a wall is a blade thrown
  away. A shield is worth a few — men flattened, bullets turned, or any mix — and then splinters. A carried shield covers an arc across the goat's front: rounds and clubs
  arriving anywhere he is facing are turned, each turn spends a charge, and the man who swung into it
  stands there holding the shock of it. His back is still his back. Neither blade nor shield is picked
  up twice, so a stand is a moment the room offers you rather than a tool you carry through the level.
- **The Mill** is a ritual grinding wheel with two sweeping arms. It flings cultists to their deaths and
  takes a heart off you. It does not care whose side anyone is on — a man held out in front of you is a
  man held into the arm, and the wheel takes him out of your mouth and throws him for you. Its room is
  deliberately taller than the arms are long: there is a lane along the top and the bottom, so the room
  is crossed by reading it.
- **The brute's charge** is answered by all of it. A door comes off its hinges and he keeps going; a
  table goes ahead of him at speed, into whoever was behind it; a lamp goes over and he runs into his
  own oil; a brazier lights him; and the gong, the hub of the wheel or a bar of the pen stops him the way
  a wall does, for the same free hit.
- **The pen** in the first room takes seven blows, and two of them put the goat on the floor.

---

## Corrupted souls

What a boss leaves, and what the goat swallows to get stronger. It is a violet wisp with two cold
points in it — the compound's own dead, kept in a man — and it is violet because violet is this game's
colour for what should not exist: witchfire, the Seer's runes, the wraith. It was a tome, which asked
the player to believe that a goat reads.

**A level gives up an authored number of them**: two on every floor, less the one the mouse stands in for
on THE YARD, THE ROAD and THE BRIDGE — thirteen across a run, and now and then a boss who is lit or a
room that gives one up adds another — against twenty-five boons and a build that holds fourteen, so no
run gets everything and no two runs are the same goat. The level's two gates are paid first; the
vault holds grass and every boss leaves milk, unless a soul was left over for them. **A man carrying one is lit** — an amber haze that breathes, a ring at his feet, and red eyes —
so the one man in a room worth crossing the room for says so from across it.

A soul offers **three of one kind**: either three actives or three passives. The first soul of a run
always offers actives, and while any button is still shut the cards lean hard toward them. A build
holds one active and two passives per button. Boons carry across levels; a death takes back only the
ones swallowed on the floor it happened on.

**Actives** change what a button does (`BOONS` in `js/tuning.js` is the list; the BOONS tab of the dev
drawer shows every one with its numbers).

- **By the Collar** lets you take a man in your teeth at all.
- **The Full Throat** turns BAAH from a noise into a blow; **Dragon Breath** into a cone of fire;
  **Venom Spit** into a glob that poisons.
- **Long Horns**, **Bomb Charge** and **Splash** change what the horns do: antlers, a man who explodes
  if he dies in the next moment, poison on whoever stands behind you.
- **Devour**, **Venom Jaw** and **Charged** change what the mouth does to what it holds: tear a man open,
  drip poison along a throw, or throw something that explodes where it stops.
- **Dead Weight**, **Sour Tumble** and **Leapfrog** change the roll: everything it goes through loses its
  head, leaves poison behind, or vaults a man instead of going round him.

**Passives** sharpen what you already have: Thick Hide, Four Stomachs, Iron Skull, Strong Jaw, Living
Shield, Cold Eye, Kindling, Raw Throat, Sure Hooves, Loose Joints, Ember Coat, The Oracle.

**The gates.** Every floor stops you twice: a quiet room after a fight, its way on barred by a door no
blow opens, and the soul lying on its floor is the bar. It is there because a soul lying on the floor of
a room whose fight is already over is very easy to walk past, and a goat who walks past them meets the
late floors with his buttons still shut. On the mouse's floors one of the two is her room instead.

---

## Presentation

**Camera.** Top-down with the ground plane squashed by `TILT` so it reads as slightly tilted off
straight down, while creatures stand upright inside it. Roughly 14 tiles across on a phone in portrait,
19 in landscape, 24 on desktop. The view pulls back a little when you run.

**Art.** Pixel 2.5: hand-pixelled sprites on one grain, eight facings, hard cut-out edges
(`ART_HANDOFF.md`). Every enemy type reads differently at a glance: the Bearer a hooded man with a club,
Seer a tall pointed hood with a lit staff, Hunter a low hood with a long
rifle, the brute a big shape in a bone apron with horns on his mask, the ogre a hunched green half-beast in a red hood and mantle, the hound a long low four-legged thing
with a lit spine and two yellow eyes. The goat reads as a goat from its snout, beard, swept horns and
rectangular pupils — body, a short dark neck and a round head, each edged in dark so the pieces never
merge into one blob from straight above.

**Pictograms.** Cult signs are blocky pixel grids stamped into the floor, snapped to whole decal pixels.
The health hearts use the same language.

**Blood is paint.** Splats, bodies and scorch marks persist for the whole level on a decal canvas. By
the end the level is a record of the run.

**Juice.** Every kill kicks the camera a little away from the body, shoves the lens in, flashes the
screen and sprays chunks that stain the floor where they land. The screen shakes only when the goat
loses a heart. Kills inside 2.4 s of each other stack: the hold gets
longer, and at three the game goes briefly slow.

**Score.** Every level ends on its own: pace against the level's par, multiplied by what you killed on
the way. Time is the axis and bodies are the multiplier, so running is never the wrong answer and the
best run is a fast one with bodies in it rather than a slow one that cleared every room. The run ends on
the sum of them, and BEST on the first screen keeps the best score and the best time for each level and
the best whole run. NEW GAME wipes the run and never the board.

**Sound.** A pad and walking bass carry a quiet exploration bed. Detection introduces a two-bar
warning, then running keeps a chase rhythm while offensive actions bring in harder combat music.
Without attacks it relaxes to chase, and without threats to idle; both level themes follow this arc.
Level 1 has a more frightened, lost variation with hesitant semitone answers. Level completion
adds a short rising release, death a descending lament, and taking a soul a luminous high chime.
These phrases briefly replace the room score and are also auditionable in MUSIC.
The room adds short synthesised parts for small, ranged, large and mystical enemies, up to six
enemies per family, plus rhythms for fire and traps throughout the room. Everything shares one 16-bar phrase;
parts join on the beat and fade as the room changes. Individual enemy types share their family's
register but have different rhythms, with more accents for ranged and heavy enemies. Levels 5+
switch to a second harmony with its own melodies for these states. Standing coals tick once per bar;
active fire across the current room adds crackles that linger for two bars, and nearby healing
grass adds soft chimes. Spike plates and Mills add their own patterns; kills and player actions
get separate delayed musical replies. Large enemies have octave harmonics that reach small speakers;
one/two Mills give three/six accents. TOOLS > MUSIC allows listening to each part and combination,
tapping repeated action rhythms, and inspecting/exporting the sixteen-bar score with note and instrument data.
The original threat-driven ritual score,
including the Hunter shaker, remains selectable in SETTINGS by switching LAYERED MUSIC off.
No audio assets at all. `MUSIC.md` records both arrangements and how to extend the new one.
Every sound effect is a small physical model rendered on the spot (`js/foley.js`) — struck wood and
iron, a throat through formants, shaped noise — dry, short and quiet, through one small stone room.

**What you can see.** A room is dark until you walk into it and then it stays open for good; on top of
that, what is standing behind a pillar, a stub wall or the corner of a room is dark until you step round
to where it can be seen from. Nothing is taken out of the simulation by either — a man in the dark hears
you, comes for you, and arrives.

---

## Not built yet

Mirrors as an environmental puzzle, gamepad support, a Priest boss, and the later acts sketched in the
original brief.
The opening scene takes his wife deeper into the compound and nothing after it mentions her: whether
she is somewhere in the building to be found, and what the ending does about it, is undecided.

`BACKLOG.md` is the rest of it: what playtesting has asked for and what is wrong with what is here,
batch by batch and dated. Anything in it is a request, not a decision — the ones that would bend a
pillar say so on the line.
