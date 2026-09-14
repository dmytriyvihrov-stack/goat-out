# Changelog

All versions published to the same artifact URL:
https://claude.ai/code/artifact/098e742b-e742-4ce7-8499-a303fa5db021

---

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
