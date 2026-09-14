# Changelog

All versions published to the same artifact URL:
https://claude.ai/code/artifact/098e742b-e742-4ce7-8499-a303fa5db021

---

## 1.10 — every level is about one thing, and a page that says so

**One sitting, about the shape of a level.** Asked for as a tab in the dev tool — the level
generation rules, per room and per level, lit up — and, under it, the rule the tab is there to keep:
every level has its own idea, most of its rooms are that idea, and the rest is a mix of what the run
already knows.

- **Every level has a canon.** `levelDef.canon` names it and `ROOM_TEMPLATES` entries carry it:
  STONE on THE ALTAR (pillars, corners, stub walls — the wall is the weapon), FIRE on THE YARD (coals
  and straw in every room before the mage brings his own), THE LINE on THE ROAD (colonnades, trenches
  of cover, the strip a rifle cannot see), OPEN GROUND on THE THRESHING FLOOR, THE FUNNEL on THE BRIDGE
  (a gate, a throat, an hourglass, weirs, a chute: seven men are one man in a doorway), THE DROP on
  THE RAFTERS, and THE NICHE on THE OSSUARY (a crypt, cells, alcoves, a catacomb, a charnel comb —
  stone to put your back to, because a body cannot form inside it). THE THRESHING FLOOR and THE
  RAFTERS already had pools of their own; the other five got them, three existing rooms each plus new
  ones, so every canon is five rooms.
- **At least half of a level's ordinary rooms are its canon**, on an even spread that always starts
  with the first one, so a level says what it is about on the first floor you fight on. The rest are
  the mix: the plain rooms and the canons of every earlier level, never an idea the run has not
  reached — level one's mix is four plain rooms, level seven's is thirty-four. THE THRESHING FLOOR and
  THE RAFTERS used to be their pool and nothing else; now they are half it, which is what was asked
  for, and the back half of a run is everything it has taught you, shuffled.
- **A width budget in the generator.** The mix holds the yard's thirty-tile rooms from level five
  on, and a sixteen-room level could draw enough of them to seal itself short of its last door. A
  room now takes no more than its fair share of the width that is left, the set pieces still ahead
  subtracted, and a template that does not fit is passed over for the next one that does.
- **A level that asks for a vault gets one.** About one seed in two hundred put the vault's room
  against the top or the bottom of the world with no rock to cut into, and the level went out a tome
  short and said nothing about it. It is regenerated now. The RULES page found it.
- **RULES, in the dev drawer.** A page over the whole screen with the simulation held: every rule the
  generator keeps down the left, lit by whether this level keeps it — fire for holds, blood for does
  not with the reason under it, ash for does not apply — and down the right the level: its canon and
  idea, its definition read out of `LEVELS` so nothing can drift, its canon, mix and trap pools by
  name, and the rooms it actually built with role, template, men and threat, the canon rows lit. One
  tab per level; the level in play is checked as it stands and any other tab is a sample the page
  generates and can reroll, so all seven can be read without playing up to them.
- **The rules are written once.** `js/rules.js` holds the list — every kind met alone, the run
  opening on one man, threat rising, every level harder, the caps, the canon share, the mix never
  ahead of the run, a canon at least four rooms, set pieces teaching nothing, the Mill's room, rifles
  posted only after they are met, milk on a rhythm, nothing beside the pen, arms held back, trap rooms
  placed right, the vault — and `tools/balance.js` runs the same list over many seeds instead of its
  own copy, so a rule cannot hold in the report and fail on the page.

---

## 1.9 — a run that gets stronger, a fourth button to find, and no more plates

**One sitting, about progression.** The complaint was that the first levels were already hard and the
difficulty did not climb evenly, and that nothing carried forward — you learned something, died, and
were handed the same goat back. Every change here is that: what the run keeps, what it is given, and
how steeply the ground rises under it.

- **A death no longer takes a tome.** It took the newest one, which meant that dying on a level you
  had just been rewarded on cost you the reward, and a bad run only ever got worse. You now come back
  with **everything you walked into the level carrying**. What a death still takes is the tome you
  found *inside* the level that killed you — the room is generated again and it is back where it was,
  guarded by whoever was guarding it — so dying is not a way to farm one. The death card says
  `N TOMES KEPT` instead of naming a loss.
- **A level gives up an authored number of tomes.** It used to be however many bosses the level
  happened to hold, plus the vault: two on level one, four on level six, twenty-four across a run that
  never died — far more than there are tomes in the game. `tomes` is now a number on each level
  definition. **One on level one, two on every level after**, which is thirteen across a run and
  exactly the number of tomes that exist. The vault takes the first of a level's two (breaking an iron
  door for a pail of milk is a swindle) and the LAST boss of the level takes the other, so the fight
  you finish on always pays. **Every other boss now drops milk** — nothing you had to break through is
  worth nothing. The level card says what is in the level: *2 tomes in here*.
- **The roll is a tome, not a birthright.** The fourth chip on the rail starts dark and says LOCKED,
  and the E key does nothing until **TUCK AND ROLL** is picked up. It is the game's clearest promise:
  there is a verb you have not been given yet. The run's first tome always has it on the table — you
  still spend the tome on it rather than on fire breath, but a fourth button withheld by a shuffle is
  not a decision. LOOSE JOINTS and DEAD WEIGHT are held out of the deck until there is a roll to
  sharpen, which is what the new `needs` field on a boon is for.
- **The difficulty climbs evenly now.** It went 27 → 50 → **115** → 123 → 167 → 181 → 199: a wall at
  level three and a plateau after it. Per room, which is what a player actually feels, that is
  +1.9, **+4.0**, +0.6, +1.7, +0.8, +1.1. It now runs 27 → 53 → 97 → 118 → 157 → 179 → 199, or per
  room +2.1, +2.5, +1.5, +1.4, +1.4, +1.2 — the same finale, the same first two levels, and no wall
  in the middle. Level three's Great Hall was the single worst offender at 26 threat in one room when
  the level's own rooms averaged 8; the first Hall you ever walk into is a smaller one now (11), and
  the bridge's is still the wall of bodies it was meant to be.
- **Iron doors between rooms.** Every door in a corridor was planks and went on the first blow, so a
  corridor was never a decision. About **two a level** from level two on are iron: nobody shoulders one
  open, it takes **three blows**, and the noise of the first one is already bringing whatever is in the
  next room. Level one has none — it is still teaching that a door goes at all. `levelDef.ironDoors`
  is the chance, rolled on top of `doorChance`.
- **The soul door says what is behind it.** With iron in the corridors, the vault's door — the only
  door in a level that is not on the way anywhere — was suddenly indistinguishable from a speed bump.
  It now carries the tome's own halo, the book painted small on its face, and the same floating `TOME`
  the tome on the floor carries. It is still four blows, one more than the iron you passed two rooms
  back, and that difference is now something you can see before you spend them.
- **There is a landscape under the holes.** A drop was a flat black square, and from directly above a
  flat black square is also what a pillar looks like — which is exactly what people were mixing up.
  You can see the hall a long way down through them now: roof ridges with lit upper edges, rubble, the
  odd torch still burning. It is painted at a fraction of the camera's own movement, so it **slides
  against the lip of the hole as you run past** — parallax is the only thing that says *down* on a flat
  top-down picture, and the scenery is only there to give it something to move. The rim is a gradient
  instead of a hard band, which was reading as a border drawn round a black tile.
- **Windows exist now.** THE RAFTERS' own design note has promised "windows out into the night" since
  the level was written and the generator had never made a single one: the renderer had known how to
  draw a window the whole time and the test for one — stone above and below — never once answered yes.
  They are cut properly now, three to five tiles through the wall along the top of a room, with the
  night and the stars behind them, and the generator writes down which tiles they are instead of the
  renderer guessing. A window is a drop like any other: shove a man out of one.
- **You watch a man go down.** He used to stop existing in the frame he crossed the lip, which reads
  as a bug and not as a drop. He turns over, shrinks into the dark and fades, and the sound of him
  keeps falling after he is gone. Nothing about it is simulated — he is dead the moment he is over the
  hole, exactly as before — it is only that the fall is now something you see happen.
- **Running builds speed.** Four seconds of running without a break is worth **+50% top speed**, and it
  drains three times as fast as it built the moment you stop. A club takes the whole of it at once. It
  is the only speed in the game you earn instead of pick up, and everything that stops you costs it —
  a fight, a door, a man in your way — so it pays for the thing the game is named after. The smear
  behind him is where it shows: the ghosts lengthen as he winds up, the same way SURE HOOVES does it.
- **No more plates.** The pot was drawn as an ochre disc, and a disc on a floor of boards reads as a
  plate or a puddle rather than as a thing you lift. Every one of them is a **crate** now, and the
  crate is smaller and plainer than it was: an outline, a face, a lit top edge, one band. Four shapes
  instead of nine. A box has to say *pick me up* from across a room and nothing else.

---

## 1.8 — the man in the doorway, and what is behind the iron

**The same sitting, carried on.** Where 1.7 was about the game not saying what a thing *is*, this one
is about the game not making you do anything with it: a first man you could walk round, a trap nobody
noticed underfoot, a door that took three blows whatever it was made of.

- **The first man of the run stands in the only way out.** He used to hold a post a few tiles inside
  the room, which everybody walked round. The generator now takes the corridor leaving his room down to
  a single tile, deletes whatever door was in it, and stands him in the gap — and he cannot be
  shouldered along it either, the way the Butcher cannot. The room opens when he goes down. Nothing
  else is in there: no milk, no crate, no grating. One man and one verb.
- **The hound is not a level-one animal.** Level one is a small clubman, a big one, and the block at
  the end of it. An animal that darts and dodges is a different lesson from a man who winds up and
  swings, and meeting both inside ten minutes is why neither was landing. The hound is now the first
  new thing level two has, before the mage.
- **The teeth are a stretch of floor.** The trap was a plate flush with the boards, then briefly a
  crate, and neither said what it was — one was invisible and the other looked like something you
  could pick up. It is iron grating now, sunk into the boards with dark slots you can see the empty
  sockets through, and it goes down **nine to fifteen tiles at a time** as a band that bends across a
  room. One grate is stepped over without being noticed; a stretch of them is a piece of ground you
  have to decide about. Everything about how it works is unchanged: only the goat trips it.
- **Crates are for throwing.** One tile, planks and two iron bands, and nothing to explain: pick it
  up, throw it, it comes apart on a man and leaves him on his back for longer than a pot does. They
  are scattered through every level from the first.
- **A plank door goes in one blow.** All doors took three, which is two too many for a thing standing
  between you and a corridor. Wood is one now.
- **Iron doors take four, and are never in the way.** The only iron door in a level is the vault's: a
  sealed five-by-five chamber cut into the rock off one room in the middle of the level, with a tome in
  it and nothing else. You can see it through the doorway from the floor of the room. Four blows and
  the noise of four blows is the whole price, and none of it is on the way to the stairs — it is the
  one thing in a level you go out of your way for, and the reason to is that you come out stronger.

---

## 1.7 — his own voice, and a box on the floor

**A second sitting, on the same day.** Seven notes, all of them about the game not saying what it is:
a hint that names a verb and not the button, a trap nobody could identify, a scream that sounded like a
synthesiser, a line of help text longer than anybody reads.

- **The goat has a voice.** BAAH was a sawtooth with vibrato on it — a siren, not an animal. It is now
  a real bleat: a buzzy throat put through two vowel formants, shaken twenty-six times a second and
  falling away at the end, with the mouth opening over the call so it travels from a *bèh* to a
  *baaah*. Two of them a fifth apart, so there is weight behind it. Every sheep in the game and every
  small frightened noise the goat makes now comes out of the same throat (`bleatVoice`), which is the
  first thing in the build that sounds like the thing making it.
- **The plates are crates.** The floor trap was a plate lying flush in the boards, and a seam in a
  floor is not something anybody can read at a run — nobody knew what they were looking at. It is a
  small banded crate now: the goat's weight trips the catch, the lid knocks against it while it arms,
  and then the lid goes over backwards and the iron in it stands up. Same trigger, same bite, same
  heart it costs you, same everything the AI asks of it — what changed is that you can see it coming.
- **A hint says which button it is about.** The line painted across the first room of a level names a
  verb — *hold a man, he stops bullets* — and never said what to press. Each one now carries the key
  under it, keyboard or touch, from a `hintKey` on the level definition.
- **And it fits the room it is painted in.** The longest of them ran off both ends of the floor and off
  both ends of the screen. They break over two lines at the full stop they already have and shrink to
  what is left of the room, so the widest hint in the game now sits inside its own walls.
- **DEAD WEIGHT.** A new tome on the roll: everything the tumble goes through loses its head for a
  moment. Surrounded by six men it catches all six, which is what the roll is for — it is the way out
  of a crowd, and now it costs the crowd something. Nothing changes without the tome: the base roll
  goes through a man without touching him, and the chip in the rail grows three stars when it lands.
- **The mage minds his own fire, and still burns in it.** Witchfire takes the Seer exactly as it takes
  anybody — that was never in question and has not changed. What he was not doing was avoiding it: he
  would blink out of a fight and land in his own rune. He now reads flame from twice the distance a
  clubman does, all but never fails his trap roll, and will not blink onto ground that is alight.
  Across a wall of his own fire eight times he caught none; a clubman caught two.
- **The help line is shorter.** And the one thing on it nobody could parse — `SPACE BAAH` — now says
  what it does: *scream — BAAH stuns every man in earshot*. The floor lesson in the pen rooms says the
  same word.

---

## 1.6 — the first ten minutes

**Watching somebody play it for the first time.** He read two rooms of writing about a headbutt,
walked past the first clubman without trying it, met the man with three hearts as the second enemy
of his life, and found the hearts and the cooldowns in the corner of the screen somewhere after the
level had ended. None of that is a bug. All of it is the first ten minutes not doing its job.

- **The first man of the run stands still.** He is posted a few tiles inside the mouth of the room
  with his back to the door, he is the only man in it, and he does not walk: he turns to face you, he
  swings if you come inside his arm, and he waits. A man charging you is not a man you can try a new
  button on. He is there to be walked round, hit, knocked over, hit into a wall — and the floor under
  him says **BUTT HIM** and what the button is, because two rooms of words about a headbutt with
  nothing to use it on turned out not to add up to *the men can be hit*.
- **The brute comes later.** He used to be the second enemy on the level and the room before his own
  arena, which is no time at all in which to have learned what a headbutt is for. Level one is twelve
  rooms now instead of ten, and the order is: a clubman on his own, a room of clubmen, the wheel, a
  hound, a room of both, and *then* the man who takes more than one hit, four rooms of ordinary work
  after the first one.
- **Nobody sees through a shut door any more.** A door is a wall with hinges, and a man on the far
  side of one could see straight through it and come round for you — which from where you were
  standing was being seen through stone. Sight now stops at a shut door, at the gong and at the hub of
  the wheel, the same way a blow does. Everything else in a room — a table, a lamp post, a bowl of
  coals, the bars of a pen — you can still see past, and so can he. He can still *hear* you through a
  wall, and running is still loud: that is the part of it that is meant to be there.
- **The cleaver is a cleaver, not a room.** The Butcher's swing reached two and a half tiles out from
  a body already twice the size of a man's, through a hundred and twenty degrees, so you were hit by
  a blow that plainly finished nowhere near you. Two tiles and ninety-nine degrees now — half the
  ground, to the square foot. He still out-reaches a clubman, which is the only thing that number was
  ever for, and he still has the charge for everything further out than that.
- **Rooms that are about the floor.** Four new room shapes where the trap is the point rather than
  the furniture: hay and coals with lanes between them, a straw wall with one gap in it and a bowl of
  coals at each lip, two banks of teeth with a clear run between them, and three lanes of which two
  bite. A level asks for a count of them and they land in its ordinary rooms — never the pen, never a
  set piece, and never the room that introduces a kind, because a hound and a floor full of teeth in
  the same room means meeting neither.
- **The corner of the screen is bigger.** The hearts, the skill rail, the count and the clock are up
  by a third. They were sized to stay out of the way and managed it too well.

The scream's radius is unchanged: it was already cut from twelve tiles to eight and a half back in
1.2, and cutting it twice for the same report would take the answer to a pack away from it.

---

## 1.5 — the room answers

**Everything that flies through a room now meets the room.** Until now only a man did: a pot went
through a shut door, a blade went through a brazier, a body thrown at a lamp post died on it as if it
were stone, and a Butcher's charge slid off furniture like a man walking. The rule is one rule now —
whatever is moving at speed hits what is standing there, and what is standing there does what it does.

- **Coals.** A headbutt on a brazier knocks a spill of coals out of the far side of it: a tile of fire
  a beat long, a line you draw across a doorway, and the bowl needs three seconds to build its heat
  back — the flame drops and climbs so you can read when it is ready. A body thrown into a brazier
  does the same, so a man thrown into one lights the floor beyond it as well as himself. The brazier
  was the one thing in the room you could only use by putting a man in it; now it is a thing you use
  with your head, and EMBER COAT walks through what it makes.
- **A lamp post is not a pillar.** A body arriving at speed takes it over and the oil goes down where
  the body is about to land, so a man headbutted into a lamp is a man headbutted into a fire. A pot or
  a thrown blade does the same to it, which is how you start a fire across a room without crossing it.
  And fire that reaches a lamp post — hay burning up to one — takes the lamp with it.
- **Nothing flies through a shut door.** A pot breaks on it, a blade snaps on it the way it snaps on
  stone, a shield rings off it, and a table sliding at speed takes it off its hinges. A gong hit by any
  of them rings.
- **The Butcher's charge is a thing the room answers.** A door comes off its hinges and he keeps
  going; a table goes ahead of him at speed, into whoever was standing behind it; a lamp goes over and
  he runs into his own oil; a brazier lights him; and the gong, the hub of the Mill or a bar of the pen
  stops him the way a wall does, for the same free hit.
- **A man in your mouth is in the room.** Walk him into a brazier and he lights and comes out of it.
  Hold him into the arm of the Mill and the wheel takes him out of your mouth and throws him for you.
  Stand him over a plate as the teeth come and they take him. Fire already did not care that he was
  being carried; now nothing in the room does.
- **The drop takes what lands on it.** A pot, a blade, a shield or a table that comes to rest over a
  hole goes down it — no shards, nothing on the floor — the way a man does. `CONCEPT.md` already said
  anything thrown through one was gone; only the men were.
- **The panic roll never ends in a hole.** It already refused walls, fire, braziers and the wheel; a
  drop is worse than a wall, because a wall stops the tumble and a hole charges a heart for it. A
  plate lying flat no longer counts as a place it must not end, either — flat, it is floor.

---

## 1.4 — a seventh level, a floor that opens, and a shield that is a shield

**THE RAFTERS, and the floor stops being a promise.**

- **A new sixth level, up in the roof of the hall.** Holes in the boards and windows in the walls,
  and the same drop under both. THE OSSUARY moves to seven and stays the finale — it was built as the
  last ground and a level behind it would have taken that off it.
- **A man who goes over an edge is gone.** No body, no blood, nothing on the floor: he is simply not
  in the room any more. It counts as a kill, because it was one.
- **The goat is only rented to the drop.** You come back up on the last boards you stood on, one
  heart lighter — the same price the Mill charges. That price is the whole design of it: free, and
  the level is a shortcut; fatal, and nobody goes near the interesting half of a room.
- **Nobody walks into a hole on purpose.** The flow field treats a drop as stone and men read the lip
  the way they read the wheel, so they take the long way round — except the one in a crowd who fails
  his trap check, which is the man you can lead over the edge.
- **Five hand-authored rooms for it**, narrow on purpose: a gantry over two shafts, a ledge with the
  whole far side missing, joists with the boards off between them, a well, and a wall of windows.

**Spike floors, from the third level on.**

- **The teeth come up where you have already been.** Crossing a plate arms it and it bites a beat
  later, so what it takes is the ground you have just left — which is the ground whoever is chasing
  you is standing on. A man dies on them; the goat pays a heart.
- **Men read a plate the way they read the Mill**, and the one who fails his roll walks onto it. The
  plates are the first thing in the building that kills for you without being a wall.

**A score, and somewhere to keep it.**

- **Every level now ends on its own score**, out of the time it took and the bodies in it. Pace
  against the level's par is the whole of it and kills only multiply, so running is never the wrong
  answer and the best run is a fast one with bodies in it, not a slow one that cleared every room.
- **The run ends on the sum of them**, in place of the old count of kills and deaths.
- **BEST, on the first screen.** A third thing on the menu holding the best score and the best time
  for every level, and the best whole run. NEW GAME wipes the run and never the board.

**A death costs a tome, not the run.**

- You come back with what you walked into the level carrying, **minus the newest thing you had
  learned** — and the card names it, because losing IRON SKULL is a different feeling from losing a
  number. A run can be survived badly now instead of only perfectly.

**Fixed, and most of it was the room not being real.**

- **A thrown man no longer ends up inside the wall.** The fault was the hold, not the throw: the man
  was placed a fixed distance in front of the face with nothing asking whether that point was floor,
  so from hard against a wall he was already standing in the stone before you let go. The hold point
  is walked back to floor now, and a throw into a wall pays out the way it always should have.
- **A door takes three blows.** It is the one thing in a corridor that can hold you still, and two
  more beats of being held still — with whatever heard the first blow already coming — is worth more
  than the shortcut was.
- **A carried shield actually stops things.** It was a disc the size of the shield, so almost
  everything aimed at the goat went past its edge and hit him anyway. It is an arc across his front
  now: rounds and clubs arriving anywhere he is facing are turned, each one spends a charge, and the
  man who swung into it stands there holding the shock of it. His back is still his back.
- **Blows no longer come through walls and furniture.** A club, a bite or a pair of horns needs a way
  to the thing it is swinging at; stone, a pillar, a table, a shut door or the hub of the Mill takes
  it instead. Both sides are held to it.
- **A man has a front and nothing else.** Inside two and a half tiles he used to see you wherever you
  stood, which took away the one thing his cone was for. Walk up behind him now and he does not know
  — what gives you away back there is noise, and how much of it you make is yours to decide. Bumping
  into him still counts.
- **The mage in your mouth paints the ground where he started, and it stays there.** The mark used to
  be dragged along under him, which meant the fire came up under the goat wherever the goat had run
  to: carrying a mage was a death sentence rather than a thing to be handled. Keep moving now and you
  are leaving a trail of it behind you.
- **And a man in your mouth burns like anybody else.** Fire does not care that he is being carried,
  a mage standing in his own is no exception, and whatever catches comes straight out of the mouth.
- **Fire goes from a man to the first man he blunders into, and stops there.** The one who was handed
  it never hands it on, so a brazier costs a room two men rather than the room.
- **The camera stopped throwing the picture across the screen.** The lead was read straight off the
  aim, so crossing the pointer over the goat moved the whole view to the other side of him in one
  frame. It is carried now, and a turn on the spot barely moves it at all.
- **The hound's bite is slower than its dart.** At three-tenths of a second the bite landed before
  the eye had the tell, and the dart was doing work it could not be read doing.
- **The second cage in the first room opens.** Three blows, nothing taken out of him for them, and no
  prompt asking for it: the pen teaches the verb the hard way and this is what having learned it is
  worth. What it is worth is the one line the room ever says about the sheep in it.
- **SURE HOOVES is visible.** The smear behind the goat now lengthens with the tome that makes him
  faster — sixteen ghosts over a third of a second instead of seven over a fifth. It was the best
  passive in the game and nothing on screen answered it.
- **The last two levels are harder**, because a level went in in front of the finale and the finale
  has to stay the finale. `node tools/balance.js` agrees.

**Not fixed**

- **The endless roll against a wall.** Pressed against a wall with the key mashed, the cooldown holds:
  three rolls in three seconds, exactly as everywhere else. Not reproduced, so not touched.

---

## 1.3 — a shorter goat, a gong worth hitting, and a mage you should think twice about picking up

**The goat moves less, and everything he waits for is now a real wait.**

- **The headbutt lunge is 30% shorter.** It is a step into a man, not a charge across the room. Reach
  is untouched — closing the gap is the part you are paid for now.
- **The roll is 40% shorter.** Same duration, same mercy frames, a good deal less ground. It is a
  panic button rather than a second way of travelling.
- **A man stays in your mouth seven to nine seconds** instead of three, and the exact beat he works
  loose is rolled fresh every grab, so you never learn it. STRONG JAW takes it to thirteen.

**Three of them are weaker in your hands, one is worse.**

- **A rifle in your mouth has two or three rounds in it and no more.** He fires them into his own
  room and then he is a man being carried — and he is out for good, so letting go and grabbing him
  again is not a way of reloading him.
- **A rifle takes 10% longer to line you up.**
- **A mage goes on painting the ground while you carry him, and the ground he can reach is the ground
  under his own feet — which is the ground under yours.** The circle appears under him, says STILL
  CASTING, and eight-tenths of a second later you are both standing in witchfire. Throwing him breaks
  the cast. That is the whole answer, and it is the only one.
- **The mage's circle lands 30% sooner** everywhere else, too: less time to walk off the mark.

**Everything on fire has stopped steering.**

- **A boss alight blunders like everybody else.** The Butcher used to walk his line at you through the
  flames, which read as the fire not counting for anything. Now he panics, wanders, and comes out the
  far side scorched, a heart down and staggered — still not killed by fire, but not ignoring it either.

**The gong does something.**

- **Hit it and the goat runs half again as fast and every cooldown comes back half again as quick for
  eight seconds** — and every man on the floor knows exactly where you are. A strip under the skill
  rail counts it down. In an empty room that is a terrible trade; in a room with twelve men in it,
  it is the best one on offer. So it is never placed in an empty room any more, which is where it
  used to sit reading as scenery.

**Two things the generator stopped leaving to chance.**

- **A bowl of milk every four or five rooms, guaranteed.** The level is cut into bands measured in
  doors rather than in lucky rooms, and each band gives one up. Worst gap on any level is now five
  rooms; it used to be ten. THE YARD, THE ROAD and THE BRIDGE each gained a bowl.
- **The dead now arrive from every side.** A wraith used to drift to the point directly behind you;
  every wraith did, so three of them queued up in the same place. Each one now rolls its own line in
  — anywhere from your shoulder round to your back, left or right, never your front — and keeps it.
  A pack of them surrounds you.

**Fixed**

- **Rifle rounds no longer come through walls.** The muzzle sits 27px in front of the man and that
  gap was the one stretch of a shot nothing checked: fire diagonally past a corner and the round
  simply appeared on the far side of the stone. Of every shot fired into a wall in a sweep of the
  whole map, one in twenty-four used to fly clean through it. The muzzle is walked out now and a shot
  into stone is a wasted round.
- **A tome is taken by a click on a card and nothing else.** Hovering over one, a click that starts on
  one card and ends on another, and anything at all in the first four-tenths of a second after the
  cards appear — all do nothing. The click that killed the boss can no longer spend what he dropped.
- **A dead or thrown mage stops painting.** His half-finished rune used to stay in the list the whole
  room steers around, so a patch of empty floor went on being avoided for the rest of the level.
- **Anything that catches fire leaves your mouth.**

**The opening scene**

- **It cannot be skipped the first time.** Once a browser has watched it through, CLICK TO SKIP comes
  back and works as before.
- **And it is eight and a half seconds longer**, all of it spent slowing down what was already there:
  they huddle longer, the two men walk in slower, he stands at the gate longer before he kicks it,
  the club is up longer before the goat moves, and the dark lasts longer.

## 1.2 — arms that break, the brute, a room with two rifles in it, and a first screen that is a menu

- **Nothing you pick up survives being used.** A thrown blade goes into whatever it finds and snaps
  there; thrown at a wall it is thrown away. A shield is worth three — three men flattened, three
  bullets turned, or any mix of them — and splinters on the third, with three studs above it while
  you carry it so you know what is left. Neither can be picked up again. What a stand of arms hands
  you is a moment, not a tool you drag through a level.
- **And there are far fewer of them.** An arena holds one stand rather than two, an ordinary room
  about one in six, and level 1 has none at all until the halfway mark: the first half of the run is
  the goat, his head, and whatever the room was already built out of.
- **The brute.** What used to be a slightly bigger clubman with a second heart is now a different man:
  three killing blows, four in the arena, a spiked back, a studded club and a frame a third larger.
  You can tell one across a room, which is the whole point of him.
- **The wheel is met with nobody in the room.** The Mill's room is a set piece, so it is no longer
  allowed to be the room that introduces a kind, and it carries about half a crowd — none at all on
  level 1. Meeting the Mill and your first three-hearted man in the same doorway meant meeting
  neither.
- **A kind is met in the open before it is met in the ring.** Level 1 used to hand you the arena brute
  before any ordinary one. Level 1 is ten rooms now and its order reads: one clubman, the wheel, one
  brute, the brute in the ring, one hound, a mixed room, the Butcher.
- **The killbox**, late on THE ROAD, THE THRESHING FLOOR, THE BRIDGE and THE OSSUARY. A wide room
  with almost nothing in it and two rifles posted on the far side, watching the door you have to come
  in by. They see further than a man wandering a room and they do not leave the post. There is a
  shield on a stand by the door, two of their own on your side of the room to carry in front of you,
  two bits of cover halfway across, and the corridor behind you. Pick one.
- **BAAH is a good deal shorter.** Twelve tiles to eight and a half: it is for the men on top of you,
  not for the room. RAW THROAT now takes it to thirteen rather than twenty.
- **Four new rooms in the rotation** — a bare yard, livestock pens, a pillared nave and the ovens —
  so a level repeats itself less, and so some rooms are open enough that a rifle or a mage owns them.

- **The menu replaced the wall of text.** The first screen used to be the story of the truck, the four
  men and the wife, and under it every control the game has, and under that CLICK TO ESCAPE. All of it
  is gone. What is there now is the name with a pair of horns round it, a fire somewhere below the
  frame throwing embers up through it, the cult's sign stamped nearly out behind it, and two buttons.
  Nothing is explained: the opening scene is the story — it is played, not written down — and the floor
  of level 1 is where the buttons are taught. The page's control line is hidden until a run starts.
- **NEW GAME, and CONTINUE under it.** The first needs no caption. The second carries one, in brackets:
  where the run got to and what it was carrying — *(level 3 · the road · 1 tome)*. With nothing to come
  back to it is dark, and pressing it shakes its head rather than doing nothing at all.
- **The run survives the tab.** It is written down at the head of every level and again whenever a tome
  is taken, so CONTINUE puts you at the start of the furthest level you reached with the tomes you had
  there — a fresh layout, the way a death gives you one. Starting a new game throws it away, and so
  does escaping.
- **The menu takes the keys the game already takes.** W/S or the arrows run up and down it, SPACE or
  ENTER chooses, a mouse chooses whatever it is over, a thumb taps. No new verb, no new button.

## 1.1 — THE OSSUARY, and a thing you cannot hit

- **A sixth level, and its enemy is not there.** THE OSSUARY is under the bridge, where everything the
  compound ever killed was thrown. The wraith is mist most of the time: nothing in the game can touch
  it, it can touch nothing back, and a wall is not a wall to it. It works its way round to your flank or
  your back, and only there does it become a body — and from that instant it is committed. It swings, and
  it stays a body for most of a second after the blow. That window is the only time a horn, a blade, a
  pot, a bullet, the Mill or a scream means anything to it, and the only time it means anything to you.
- **So the fight is about where you are looking.** Face one and it can do nothing at all. It cannot form
  inside stone, either, so a wall at your back is one arc it cannot arrive from — the only thing the
  ground does for you on that level. With three of them in a room you cannot watch every side, which is
  the point: let one commit, then turn and unmake it.
- **BAAH matters again, differently.** A scream passes straight through mist and does not even count it
  in the tally. A scream on one that has committed freezes it solid where it stands without cancelling
  the swing — so it lengthens the window rather than ending the threat.
- **The boss of the dead.** An elite wraith takes three separate catches: each one tears it apart and it
  puts itself back together somewhere else, so you cannot stand over it and finish it off.
- **They leave nothing.** No blood, no body on the floor, no scorch, no wet noise — a cold ring, a pale
  burst, and it is gone. The men standing near one have things to say about their own dead getting up.
- **The first room of the level is one wraith and nothing else,** and the first few horns that close on
  nothing say so where it happened. The threat curve made the rest of the level: it is the hardest
  ground in the game, and `node tools/balance.js` says by how much.

## 1.0 — the opening scene, the way out, stands of arms, and a pen that fights back

Two lines of work on this game ran side by side for a while: one added the hounds, the threat curve and
THE THRESHING FLOOR (0.9 to 0.11 below), the other the opening scene, the stairs and the stands of arms.
This is both of them in one build. Where they did the same thing twice — both grew a rule that a new
kind of enemy is met on its own — the threat curve's version won, because it is checked by a tool.

- **The pen takes seven blows.** Getting out of it was two headbutts and a shrug; now it is the hardest
  thing the goat does all run. Each blow bends the bars further and he roars through it — NNGH, IT HOLDS,
  MMMAAAH, IT BENDS, NNNGH, BAAAAH, OUT — and the third and the sixth knock him off his own feet: a
  second on the floor with stars turning, no verbs, before he can go again. A headbutt used to count
  once per bar it happened to reach, so three bars meant three hits; the pen counts blows now.
- **Stands of arms.** A wooden rack with a sword or a shield in it. Grab what is in it and throw it, or
  headbutt the stand and send it across the room. A thrown sword goes through the first man it finds and
  stays in him; a thrown shield flattens everyone in its path and keeps going. Carried, a shield turns
  three bullets before it splinters — the first answer to a rifle that does not involve holding a man.
  Both lie where they land and can be picked up again. Sometimes one or two to a room, always two in a
  boss room, and one in the room where the controls are painted on the floor.
- **More milk.** Level 1 carries three bowls and THE BRIDGE four. The crowd itself is the threat
  curve's business, and `node tools/balance.js` says what it produces.
- **A thrown pot is a real stun.** It used to trip a man for eight tenths of a second. It now puts him
  down for nearly two and a half, seeing stars, with the frame held and the camera kicked. There are
  about a third fewer pots on the floor to make up for it.
- **BAAH is explained as what it is.** The floor, the prologue and the meter all said the scream calls
  them in, which it has not done since 0.8. They now say it stuns.

### also in 1.0, from the other line of work

- **The run opens on the two of them.** The goat and his wife in the pen, pressed together and
  trembling, a heart beating between them. Two men come in: one carrying the boning knife from beside
  the altar, one with a club. The gate goes over, the knife man walks round the goat and takes her; the
  goat goes for him and meets the club instead. The picture goes dark with the stars still turning, she
  bleats once from a long way off, the level card comes up in the dark, and the light comes back on the
  pen. He is lying where he fell, the gate is up again, and the level is exactly the one you would have
  got. Any button after the first moment skips to the dark. Only a run started from the title gets the
  scene; a death drops you straight back into the pen.
- **The title card has one more line.** "The goat survived. So did his wife."
- **The way out is a flight of stairs.** The exit is cut into the wall as steps climbing into light, and
  the goat takes them for a moment, rising and thinning out, before the cards. Every later level is
  entered up another flight cut into the left wall of its first room; the goat comes up it under the
  level card.
- **Only level 1 has the ritual room.** The altar, the tools and the remains belong to THE ALTAR. Every
  later level starts in a bare room at the top of the stairs, with the level's hint across its middle.
- **A second cage in the first room**, shut for good, with a sheep in it that stopped waiting a while
  ago. It rings when headbutted and never opens. The room is two tiles wider to make room for it.
- **The remains are your own size now**, and their horns are horns: short, thick at the root, curving
  back off the crown, instead of two long arcs over the ribs.
- **The goat's horns rise off the crown and clear the outline**, as tapered crescents with growth ridges
  rather than strokes lying along the back. Facing left, the sprite is mirrored rather than turned over,
  so the head stays a head and the horns stay on top. (0.9 below rebuilt the head again on top of this.)

## 0.11 — a difficulty curve you can read, and a hound you can see

- **You meet every kind on its own.** The room that first shows you a clubman, a champion, a hound, a
  mage or a rifle holds that one enemy and nothing else — and a boss you have never seen stands in his
  arena without escorts. Level 1 now opens with a single clubman in an empty room, and only then a
  Mill, a champion, a hound, and the two of them together.
- **The champion.** A clubman with a second heart and a bigger frame, with the notches over his head to
  say so. He exists to teach "some of them take more than one" on level 1 without spending a boss on it.
- **Rooms are bought with threat, not with bodies.** Every level has a curve — `from` and `to` — and
  each room spends that budget on whatever you have already been introduced to. A rifle costs more than
  a clubman, a mage more than a rifle. So "harder" means both more of them and worse of them, and one
  pair of numbers per level sets the whole shape. Per-room caps keep a room readable: one mage, one
  champion, two rifles, seven men — the Bridge is the one ground allowed to break that.
- **Every level is harder than the one before, and it is checked.** `node tools/balance.js` prints what
  the numbers actually produce, room by room, and fails if a kind arrives in a crowd before it has
  arrived alone, if a cap is broken, if threat stops rising inside a level, or if a level is not harder
  than its predecessor. The rules are the tool; the tool is the test.
- **THE THRESHING FLOOR grew to 14 rooms** and a third arena, because the tool said it was easier than
  THE ROAD and the tool was right.
- **The hound was almost invisible.** It was drawn near-black on floors that run from near-black plum to
  pale sand. It is now a mid-tone grey-violet with a dark edge, a lit spine, a pale blaze down the
  snout and a bone collar — the one combination that reads on every floor in the game — and slightly
  larger, so what you are looking at and what you can hit are the same size.

## 0.10 — THE THRESHING FLOOR: a level about the space, not the corridor

- **A fifth level, and it is the open one.** THE THRESHING FLOOR sits between THE ROAD and THE BRIDGE:
  the widest ground in the compound and the least wall in it. Rooms are half again as big, the ways
  between them are five tiles across instead of two, and there are almost no doors — it reads as one
  yard rather than a chain of boxes.
- **The furniture is the level.** A headbutt on bare floor still only knocks a man down, and out here
  there is a lot of bare floor. So the rooms give you something to herd him into instead: a field of
  stone posts spread wide, table rows you can shoulder around to make or close a lane, an island of
  posts and tables with open ground on every side, braziers down both flanks — and a ring of hay that
  is not a wall at all until you light it, and cannot be taken back once you have. Nearly twice the
  furniture of any other level, on the most open ground of any level.
- **Rifles and hounds punish the middle.** Crossing the open centre is fast, and stupid: the posts are
  cover, the flanks are where anything useful stands, and a hound catches you in the open. Which half
  of a room is yours is the whole question the level asks.
- **THE BRIDGE is now Level 5** and still the finale.

## 0.9 — the hounds, a room the cult can read, and the skills in the corner

- **The hound.** A fourth kind of enemy, and the first one that is not a man. It runs as fast as you do,
  circles just outside its own reach and darts in for a single bite, then gets out again. You cannot get
  hold of one — reach for it and it is already elsewhere — and a share of every headbutt you throw it is
  simply not there for. It is meant to be unpredictable, not unkillable: one hit kills it, and it is
  light enough that the hit really throws it.
- **BAAH is the answer to a pack.** A hound loses well over twice as long to the scream as a man does,
  a scream cancels a run-in outright, and a dazed hound cannot dodge at all — so a screamed pack is a
  pack you can take apart one at a time. It is the first enemy the game builds specifically around a
  button you already had.
- **A pack sends one hound in at a time.** Three of them committing together is a coin toss you cannot
  read; three taking turns is a pack. Someone is running at you roughly three quarters of the time, but
  never two at once. And the run-in has the only tell a hound gives you: he flattens out, trails streaks
  and his eyes come up, which is the moment to put your horns through him.
- **The cult reads the room now.** Men steer around fire, lit braziers, a rune about to go off and the
  arms of the Mill — they check where the arms *will be* by the time they get there, not where they are.
  Every man rolls his own trap sense — once per encounter, not continuously, because a man who re-checks
  the same wheel forever eventually walks into it however careful he is. About one man in seven crossing
  the Mill still rides it into a wall, and that man is the reason it is a trap and not a fence. They also
  read the ground they are *standing* on, not only the step in front of them: before that, half a crowd
  would hold still at the edge of the arms and get swept anyway. Hounds read a room better than any man.
- **Throw and roll are on short cooldowns.** Letting a man go empties your mouth for a beat (1.35s) and
  a tumble costs you the same before the next one, so neither is a button you can hold down. On a phone
  the rings on GRAB and ROLL count it down; on a desktop the skill rail does.
- **The roll is a panic button and now behaves like one.** With no direction asked for it throws you away
  from whatever is about to hit you — weighted toward whoever is mid-swing — and never into a wall, a
  fire, a brazier or the wheel. With a direction asked for, that direction wins unless it runs into a man, in which case it
  slides to the nearest angle that does not.
- **The skill rail, top right.** The four verbs as icons: what each button does now, whether it is
  available, how long until it is, and what your tomes have done to it. Long Horns lengthens the horns
  on the icon *and* on the goat; Dragon Breath turns the scream into a cone of fire; Bomb Charge puts a
  charge on the headbutt; Loose Joints adds a second turn to the roll. Boon names moved to that corner
  with them; the hearts and the combo stayed on the left.
- **The Butcher takes one more hit, and fire no longer melts him.** Three hearts, and a burn costs him
  exactly one of them however long he stands in it. Anyone carrying more than one hit — Butcher, Seer,
  arena elite — now shows what is left of him over his head.
- **A better head on the goat.** Body, a short dark neck and a round skull that sits on top of it, each
  with a thin dark edge, so from straight above you can see where the goat ends and the head begins.
  Two eyes with rectangular pupils, ears to each side, and a beard that is a tuft rather than a tusk.

## 0.8 — four levels, the scream that stuns, and a goat you can recognise

- **A fourth level: THE BRIDGE.** Sixteen rooms of cold stone, three arena bosses, a Mill, a Great Hall
  and every enemy type mixed together. The bridge they were driving you over, on the way back to it.
- **BAAH stops calling them in and starts knocking the sense out of them.** Everyone in earshot is
  dazed for about a second — mid-swing, mid-aim, mid-rune — and reels with stars over his head. The
  Butcher rides out a swing he has already committed to and shakes it off faster. It makes no noise at
  all any more, so it lures nobody.
- **The Seer takes two.** Two hits, two lightings, two throws into a wall: whatever it is, the first one
  puts him down and he gets back up and blinks clear. Unlike the Butcher you can still grab, carry and
  throw him. Ember Coat still does nothing about his witchfire.
- **Mages come later, and one to a room.** Level 1 has none at all until its second boss; level 2's first
  one is five rooms in. No room ever gets two. The first arena boss on level 1 is an ordinary champion.
- **The Gallery**, on levels 3 and 4: a long room of pillar cover with rifles posted apart from each
  other. Levels 3 and 4 also scatter **lone rifle posts** in ordinary rooms, never inside a crowd.
- **The Mill room is two rows taller than the arms are long**, so there is a lane past it along the top
  and the bottom. The wheel turns slower, hits the goat softer and cannot catch you twice in a second.
  Crossing the middle still costs a heart.
- **The pen takes three headbutts.** The bars bend further with each one — IT HOLDS, IT BENDS, OUT.
- **The goat is drawn a quarter turn toward the camera**: the head lifts clear of the body, the horns
  sweep back and out past the outline, the beard hangs off the chin and the rectangular pupil sits in a
  visible eye. At a glance he now reads as a goat rather than as a white shape with legs.
- **The first room shows what they do here.** The goat that went before you is laid out bigger than you
  are, opened up, and their tools are on the floor beside the altar: a cleaver, a boning knife, a bone
  saw and a meat hook.
- **Fixed:** a tome dropped by a boss who fell against a wall could land inside it, out of reach. It now
  walks itself out to the nearest floor the goat can actually get to.

## 0.7 — the pen, the great hall, witchfire and a lot more juice

- **You start in a cage, not on the altar.** The slab stands off to one side, strapped open and waiting,
  with the knife and the goat that went before you. You are in the pen beside it. One headbutt anywhere
  on the bars brings the whole thing down — and every man in the building hears it.
- **The floor teaches one verb.** Stand in the pen for five seconds and the headbutt key fades up on the
  floor under you. Break out sooner and you never see it.
- **The cage is level 1 only.** Levels 2 and 3 start you loose in the same room.
- **The controls are split over two rooms**, and both rooms are empty of men so they can be read. Nothing
  about the mouse any more: a crosshair on a top-down game explains itself.
- **The cult talks.** Short barks over their heads when they spot you, when you are close and they have
  not seen you yet, when a scream pulls them, when they commit to a swing, when a man goes down in front
  of them, and when they meet fire. One man speaks at a time, and never the same man twice in a hurry.
- **Men walk around fire now.** A burning tile ahead makes a man steer round it, and if there is no way
  round he stops at the edge and waits it out. Already-burning men still run anywhere and spread it.
- **The Seer burns cold.** His rune erupts into witchfire: violet, its own light, its own scorch. Ember
  Coat turns away ordinary fire and does nothing at all about this.
- **The Great Hall**, late on THE ROAD. One room 38 by 22 tiles with two mills, pillar rows, hay, tables,
  braziers, lamps, a bell and fifteen men. Running straight through it is a bad idea.
- **A new level puts every heart back**, and the level card says so.
- **"Do you want sacrifices?" / "You will get sacrifices!"** on the way out of a level.
- **Juice.** A directional camera punch and a lens shove on every kill, an additive screen flash, gore
  chunks that fly and stain the floor where they land, dust off the roll, sparks off a landed headbutt,
  and a kill counter: kills inside 2.4 s stack, hold the frame longer, stretch time at three and up.
- **Louder, and there is a score now.** Master, drums and effects all up; under the drums sit a pad, a
  walking bass and a phrygian motif that only comes in once somebody knows you are there.

## 0.6 — three levels, the Mill, the ritual room

- **Three levels**, each about 1.5x the previous length. THE ALTAR (9 rooms, Bearers), THE YARD
  (12 rooms, adds Seers), THE ROAD (14 rooms, adds Hunters).
- **A mage instead of the first Butcher.** Level 1's two arena bosses are elite Seers. Elites absorb
  three hits, going down and getting back up; a Seer blinks clear each time.
- **Two bosses per level**, so at minimum two tomes per level. Any boss drops one, not just the Butcher.
- **The Mill.** A ritual grinding wheel with two sweeping arms in a dedicated room mid-level. Flings
  cultists to their deaths, costs the goat a heart and a heavy knockback.
- **Four hearts** from the start, up from three.
- **Two milk bowls per level** restore a heart.
- **The ritual start room.** A stone slab with cut straps, a large pictogram burned into the floor, the
  remains of the goat that went before you, and the knife they used.
- **Controls painted on the floor of the second room**, Ape Out style, at a readable size.
- **Pixel pictograms.** Six blocky cult glyphs drawn cell by cell and snapped to whole decal pixels so
  the upscale stays crisp. HUD hearts use the same language.
- Restart moved from **R** to **Backspace** so it cannot be hit instead of **E** for roll. The dev
  drawer gained separate NEW LEVEL and SKIP LEVEL rows.
- **Fixed:** a `quadraticCurveTo` call with two arguments in the start-room painting threw every frame.

## 0.5 — the Seer and dev mode

- **Seer**, the cult mage. Never closes in. Paints a rune under your feet that erupts into fire after
  about a second, and blinks five tiles clear when you get within three. Tall pointed hood and a staff
  whose orb brightens as he casts.
- **Dev drawer** in the bottom-right: god mode, spawn any enemy, drop a tome, heal, clear the room,
  skip the level. Works with mouse or finger; the touch cluster moved up to keep clear of it.
- Flames on the floor stopped being squashed by the tilt. Floating text and search marks stand upright.
- The prologue mentions the roll. Dead code removed from the renderer.

## 0.4 — skills, roll and telegraphs

- **Butcher down to two hits** and one heart of damage.
- **Scream became a real lure.** Everyone who hears it walks to the spot, including men already hunting
  you, and loses track of you while they go. A `?` appears over anyone searching rather than chasing.
- **Roll on E**, a clumsy sideways tumble with brief mercy frames and a stagger you must eat. Fourth
  touch button added.
- **Enemies slower and clearer.** Bearer windup 0.4 to 0.58 s, Butcher 0.7 to 0.88 s, Hunter aim 0.6 to
  0.8 s, with a red arc on the floor that fills as the swing comes.
- **Tomes now offer three of one kind**, actives or passives, with the first tome always actives.
- **Three actives:** Dragon Breath, Bomb Charge, Devour.
- **Living Shield** passive: a held man keeps swinging and firing, at his own side.
- **Camera tilt.** The ground plane squashes by `TILT` while sprites stand upright inside it.
- The goat got a snout, a beard, ears and swept horns so it reads as a goat.
- **Cult glyphs** first painted onto the floors.

## 0.3 — tomes and the lure

- The Butcher drops a tome; walking over it opens a choice of two boons.
- Boons carry across levels and are lost on death. The death card says how many you lost.
- Eight boons, all of them bending numbers behind existing verbs.

## 0.2 — touch controls and polish

- **Mobile-first controls.** Floating move stick, BUTT / GRAB / BAAH buttons, auto-aim that snaps onto
  nearby men, a letterboxed play view with a control deck in portrait and an overlay in landscape.
- **Doors, tables and oil lamps** added.
- Firelight pools, drifting dust, a vignette, slow motion on death and on the Butcher's last hit, a
  damage-direction flash, distinct silhouettes per enemy type, a marigold collar that bloodies as you
  take hits.
- Responsive canvas with zoom that adapts so sprites stay the same readable size everywhere.

## 0.1 — first playable

- Two levels, room-chain procedural generation, Bearers, Hunters and the Butcher.
- Movement with momentum, committed headbutt, grab-hold-throw, scream.
- Braziers, spreading hay fire, pots, a bell, the noise and hearing system.
- Synthesised ritual percussion driven by threat. Persistent blood decals, hitstop, screen shake.
