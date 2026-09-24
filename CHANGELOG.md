# Changelog

All versions published to the same artifact URL:
https://claude.ai/code/artifact/098e742b-e742-4ce7-8499-a303fa5db021

---

## 1.64 — the cave's teeth and the stairs in pixels

- **The cave's teeth.** A spire was the environment pack's stalagmites standing on two smooth blood
  ellipses. It is one pixel sprite now: three stone teeth, the back two lower, every point the
  brightest thing on it and catching the light now and then (`cave.spikes.glint`), standing in a pool
  of old blood drawn in cells.
- **The stairs.** A flight was a per-step gradient. Each tile is four stone steps on the pixel grain
  now — a dark riser, a lit nosing, a speckled tread, the slabs' joints staggered step to step — baked
  once per level colour. Up a flight the treads pale toward the light at the top (the warm pulse is
  kept); THE FORK's cold flight goes into black with a cold rim on every nosing and no pulse; the way
  down darkens as before. Both are `js/prop-pixels.js` wraps of `Renderer.drawSpire` / `drawStairs`.
- **The cult's signs are in blood** ("пиктограммы красные только"). Every floor pictogram, the sign
  under the pen and the hook on the title are `PALETTE.blood` now (a touch stronger on the floor,
  0.1–0.2, since red is darker than the ochre was). The hung carcass is gone ("не надо"); five signs:
  skull, cleaver (its blade a little taller), hook, ribs, crossed bones.

---

## 1.63 — every prop in pixels, and what he carries in his teeth

- **The last painted props are pixels** (`js/prop-pixels.js`, new). Doors (wood, iron, vault, soul
  gate) and what each leaves on the floor, sword, shield, the stand of arms, the wheel's hub and arms,
  the cage posts, the altar, the wall banner, the gong, the lantern's eight frames, the soul wisp, the
  big healing grass — all hand-placed pixel sprites on the grain of the crate and barrel, fitted into
  the painted ones' measured boxes, so nothing's size or footprint moved. `#paintedprops` shows the old
  art for a side-by-side.
- **The primitives went too:** the small sprout, the bomb (its fuse is cells, as long as the time left),
  the mouse's pail and the pail on her shelf, her burrow, the ware stools, the coop (slats over a dark
  inside, split after one blow), the roast (a ring of stones, the game's own pixel flames, forked sticks,
  a crocodile on the spit). The wheel's arms carry their own iron heads; level one's millstone is the
  pixel hub now.
- **The stand of arms holds its arm** ("предмет должен быть прямо в ней"): uprights and a bar behind, the
  base in front — a sword stands point down in the slot with its hilt up, a shield stands on its rim.
- **The grating reads.** Raised, its teeth are bright steel with a hard rim and blood on some points;
  arming, its slots light up amber and the tips yellow ("подготовка к удару — желтой").
- **The cult is a butcher's cult on the floor too.** The six pictograms are a goat skull, a cleaver, a
  meat hook, a rack of ribs, a carcass hung by its hind legs and crossed bones (`CULT_GLYPHS`).
- **What he carries sits in his teeth** ("чтобы он появлялся четко перед козлом"). A crate, blade, bomb,
  hen or tortoise was drawn at the hold point, 22 px out along the aim, circling him smoothly while his
  sprite turned in eighths — a thing floating near him. It is drawn at the mouth of the facing the sprite
  shows (`PIXEL_FACE`), a little ahead of the muzzle, turned with his head (a sword by its grip), behind
  him when he faces away; the hold charge ring goes with it. Render only (`TUNING.goat.carry`): the hold
  point and every throw are unchanged. A held prop is no longer drawn a second time at the hold point.
- **Clean cutouts.** The unit atlas had every edge pixel half transparent from the packer's downscale;
  point-sampled, the rim came and went frame to frame and the goat and the cult looked cut out with blunt
  scissors. `PIXEL_ART.init` hardens the alpha once on load.

---

## 1.62 — THE FORK, and fewer mushrooms

- **THE FORK.** THE ROAD (the fourth floor) now ends on two flights of stairs in its far wall, each
  behind its own iron door. The floor in front of one says THE LAMPS ARE LIT; in front of the other,
  drawn going up into black, THE LAMPS ARE OUT — FEWER OF THEM. NO LIGHT. That one climbs to THE
  THRESHING FLOOR with the lamps out (79% of the lit floor's threat, no rifles; a death there keeps it
  dark, CONTINUE remembers it). `TUNING.dark.fork`, `GEN_RULES.fork`, and `balance.js` holds the dark
  floor under its lit twin and above `fork.band` (0.7) of it.
- **THE CAVE is no longer dark in every run** (`dark.runAt` is -1): the dark is the fork's choice now.
  The knob is still there to force a floor dark again.
- **LEVELS: THE DARK has its own switch.** THE TRIP and THE DARK were one row that walked off → TRIP →
  DARK, so the dark took a second press nobody made. They are two rows now, each ON/OFF, one turning the
  other off; THE ROAD's row says it ends on the fork. The sheet also fits a 760 px screen again.
- **A third fewer mushrooms and crystals.** THE TRIP: glowing mushrooms on 62% of the rock's edge
  instead of 88%, clumps on 7% of the floor instead of 10%, crystal seams 7% instead of 10%. THE CAVE:
  crystal seams 11% of the face instead of 16%. Nothing else about either floor's look changed — a
  pass that redrew both caves on the pixel grid and toned the trip's glow and colours down was tried
  and thrown out the same day ("верни свечение… они были прекрасны"). The shares are `TUNING.cave.look`.
- **THE TRIP's floor mushrooms are the rock's mushrooms.** The little clumps on the floor were the
  same painted magenta sprite as the big mushroom you break, so the floor was full of small copies of
  the one thing on it that matters. They are the glowing caps from the rock now — same colours, sizes
  and glow, one to three a tile — and the magenta clump is only ever the breakable one.
- **Small crystals on THE TRIP's rock.** On 30% of the rock's edges, among the mushrooms: a faceted
  stone in the crystal seam's colours, often with a smaller one leaning on it, with a little glow of
  its own and the seam's glint (`look.trip.gems`; the plain cave's `gems` is 0).
- **Fix: the bell's thread pointed at nothing.** BELLWETHER'S BELL's edge mark toward the stairs read
  `exitTile.x`, which does not exist.

---

## 1.61 — THE DARK, barrels, three souls, the picture of the floor

The build tag in the corner said 1.53 through 1.56–1.60; it says 1.61 now. This build also carries
the cloud session's 1.56 (below, after the local 1.56): the run code on every death, clear and win
card (on the clear screen it sits under the picture's score), one death instead of two off a
headbutt, the lighter fog shade, a fuller THE THRESHING FLOOR, the new hints, the burst/bleed counter
and the synergy marks — all but its barrel, which the rolling one replaces.

- **A floor with the lamps out** (`darkLevel`, `TUNING.dark`, `js/dark.js`). Any level can also be played
  dark from LEVELS (the top toggle now walks off → THE TRIP → THE DARK) or `#dark`. Only what burns
  lights a room — braziers, lamps, fire on the floor, a burning man, a soul-bearer, souls, the stairs,
  a blast, a muzzle flash — cast through the tiles, so no flame lights the far side of a wall.
- **You hear before you see.** Within `dark.near` (4.5 tiles) of the goat the floor comes up a little
  and whatever stands on it is a black silhouette with a cold rim: a shape, never a face. The goat has
  a small patch of his own so you can read which way he faces.
- **Eyes.** Seers, hounds and wraiths show two points of light from up to 24 tiles, in your line of
  sight, never from behind, shut while they are down, blinking.
- **Still fair.** Every windup, the rifle's line, a hound's run, a rune, and what hangs over a man's
  head (his bark, his notches) is laid back over the dark.
- **Gentler, fewer traps.** The dark floor's curve is cut (×0.8 → ×0.72) and so is the head count a
  room may hold (×0.7), trap rooms and grating are halved, and there is no killbox: 80–90% of the
  threat of the floor it darkens (`node tools/balance.js`, new "the dark, of" block).
- **Lamps, and rooms with none.** Rooms with no flame get one to three lamps against their walls, and
  about a third of them are left black on purpose. A lamp tips to a headbutt like any other: the oil
  burns a while and then that room is black too. `GEN_RULES.dark`.
- **The cult is in the dark too.** Out of the light a man sees the goat 3.5 tiles and no further, a
  hound 5; standing in firelight you are seen as before. A trail goes cold in 1.2 s, after which he
  hunts by what he hears, and every noise moves where he goes. No rifles on a dark floor.
- **The seer casts by ear.** A noise he cannot see the maker of, up to 9 tiles off, is where he paints
  his rune — never one a man of his own is standing in. Whatever is there when it goes off, burns.
- **In the run.** THE CAVE is played dark in every run (`dark.runAt`): the floor near the fourth with
  no rifle to introduce, only hounds and seers, and it still sits between THE YARD and THE ROAD on the
  threat ladder (53 against 43 and 97).
- **Fix: a gallery could break its own cap.** Three rifle posts plus a full crowd went over
  `caps.men + 2`; the crowd is trimmed to fit.

### The picture of the floor

A cleared floor is a painting of the run (CONCEPT.md, "blood is paint"; MARKET.md calls it the one
marketing asset the systems make by themselves), and now the game shows it (`js/painting.js`).

- **The clear screen's last card is the floor, whole.** Baked once at the stairs: the floor plan in the
  level's own colours, the decal canvas's blood, bodies and scorch laid over it texel for texel, the
  line he ran, a skull where each man went down and his horned head where he got out. A level six to
  ten times wider than tall is cut into up to four rows, always between rooms, whichever count comes
  out nearest a screen's shape. A room he never opened sinks back into the rock; a niche nobody broke
  into stays wall. The rows wipe in over a ghost of themselves in the order the run went, the score
  sits under it where the old score card said it, and the press that leaves waits a beat so the
  click that climbed the stairs cannot skip it.
- **SAVE THE PICTURE** hands it over as a PNG, twice its own pixels, with the floor's name, the score,
  the kills and time, and the seed that deals the same floors in a band underneath. On the published
  page it goes through the viewer's download prompt (the artifact now declares `downloads`);
  locally, an ordinary download.

### A second polish pass

Three readers over everything changed since 1.55, and the bot through every floor with an error
counter on (THE ALTAR to THE ROAD and THE BRIDGE stair to stair, THE CAVE dark, the rest in part, a
trip), drawing every third step. Nothing threw; what follows is what was quietly wrong.

- **The picture's card on a phone held sideways.** At 390 px tall the line under the score sat on
  "tap to go on" and under SAVE THE PICTURE. The picture now shrinks to leave room for both; on a
  phone held upright, where there is no room beside the words, SAVE stands centred above them, and
  it no longer sits on the dev drawer's word in the corner.

- **The words on a dark floor were under the dark.** THE LAMPS ARE OUT. YOU HEAR THEM BEFORE YOU SEE
  THEM sat in 98% black wherever no brazier reached it — the one line that says what the floor is.
  On a dark floor the floor words go down over the dark now, as the comment always said they did.
- **A seer who cast by ear knew where you were.** A rune painted at a sound from an idle seer sent
  him into the chase afterwards, and the chase walks the flow field straight to the goat. He goes to
  see what he burned now, unless he was already hunting you.
- **A man whose trail went cold went to look at his own feet** about one time in twenty: his last
  chase shout was still in the air the step he stopped hunting. A man never investigates a cult
  noise inside a tile of himself (`ai.ownNoise`).
- **Of two hounds, only one circled away from the other.** The first to run each step looked for a
  packmate in a list that was still being built and never found the second.
- **A lit barrel was walked round like a brazier**, at the edge of its 2.6-tile burst, instead of
  out of it. Straight out, as from the wheel. And on a dark floor it was drawn as a light the cult
  could not see you by: standing by burning oil you are seen as in firelight now.
- **The picture showed every secret niche** as a one-tile notch in the wall: its tile in the wall row
  is floor in the grid, covered in play only by the crack. It stays wall until broken.
- **Cornered, the rifle and the seer pushed into the wall** they were backing into. With nowhere open
  behind them they hold still, which is what the comment above it promised.
- **DRAGON BREATH coughed** a handful of steam puffs (or twenty flame cells) out of one nostril in the
  frame he came out of a roll, a fall or the stairs. It starts again from that frame.
- **GOAT GRID's sixteen goats shared the real goat's plume** through the painter they were copied
  from, and aged it sixteen times as fast. Each cell has its own.
- **Latent, closed.** A LEAPFROG vault drawn higher than 26 px would have handed the shadow a negative
  radius (and lost the rest of every frame of the vault); a throw in the middle of a glance fidget
  would have left the simulation's goat turned 45°; the dark's mask buffer did not keep the larger of
  its old and new sizes as it meant to.
- **Numbers into `tuning.js`** (ground rule 2): the barrel's Butcher stagger, rebound and sideways
  bowl, the moment LEAPFROG's hooves come down (`over`), the Butcher's lane give-up, how fresh a
  sound a seer paints at and how near his own men it may be, how near the goat a noise is walked to
  down the route, and how far a man leans out of a brazier's heat stepping round it.

### A polish pass

A bot run through every floor (lit, THE CAVE dark, a trip) with an error counter on, and frames
pulled from a staged fight at each step of a headbutt. Nothing threw; what follows is what read wrong.

- **A man in front of the goat stands in front of him.** The goat was always drawn last, so a man a
  step south of him — in front, at this camera — had the goat's body over his hood, and every body
  covered the bark of whoever stood behind it. Standing men and the goat are drawn in order of their
  feet now (the goat over everyone while he is in the air over a man's back); what a man lays on the
  floor — a windup's strip, the rifle's line, a soul's haze — goes down under all of them first, and
  what hangs over a head (his bark, the search mark, his notches) goes on after all of them. Two men
  a step apart shouting at once no longer print their words over each other: the plate further from
  the camera steps up clear of the nearer one.
- **A press a beat early is kept** (`goat.buffer`, 0.12 s; on the JUICE backlog). A headbutt pressed
  while he is still recovering, or a roll pressed a moment before it is back, goes the frame he is
  free instead of being dropped. It is not a cancel: the recovery is eaten whole, and a press made
  earlier than the last 0.12 s of it is still lost. Butting the bars of the pen no longer asks for
  the rhythm to be hit exactly.
- **The room going quiet has a sound** (JUICE backlog: room-clear sting). When the last man of a
  room goes down, the score answers the kill's accent with three notes up the scale to the octave.
- **Spent cases** (JUICE backlog). A rifle throws a brass case out of the side of the breech, toward
  the camera; it bounces once and stays on the floor.
- **A rolling barrel knocks on the stone** every other turn of its staves, slower and quieter as it
  slows (`staveEvery`, `sfxStave`).
- **Words you can read.** TOO QUICK, TOO BIG, THE SOUL HOLDS HIM, NOTCHED, SNAPPED, NO ROOM, CLICK,
  N HEARD IT and the rat ogre's STUN HIM FIRST were written in `ash`, under 2:1 against the floor —
  and they are the only place the game says why a verb did nothing. A lighter ash now (`ashHi`).
  The door's countdown and IT TAKES IT went from timber brown to ochre; WITCHFIRE from the cult's
  dark violet to the witch's.
- **The floor's control lines agree with each other.** `WASD, TO MOVE` stood over three lines
  written `LEFT CLICK - HEADBUTT`; it is `WASD - MOVE` now, and the touch lines match.
- **The title screen.** LEVELS says the floor can be played straight, as its trip, or dark (it said
  only "or its trip"); BEST said "best run 0" until a run was finished, and now counts the levels on
  the board instead.

### Words that say what a thing does

A playtest note: the soul cards read well and said nothing — DEAD WEIGHT was "everything it goes
through loses its head", with no number anywhere. Every description in the game was read against
the code that it describes.

- **Every soul card has its numbers.** Under the one plain sentence of what the soul is, a line in
  the fire colour says how much: DEAD WEIGHT dazes everyone within 1.6 tiles of your path for 0.7 s;
  IRON SKULL takes recovery from 0.38 s to 0.19 s; LOOSE JOINTS rolls 2.53 → 3.42 tiles and comes
  back in 0.61 s, not 1.35. The line is built off the soul's own params when it is drawn
  (`BOONS[].stat`), so an edit in the BOONS tab changes it too. The card grows to fit.
- **Two cards were wrong.** RAW THROAT said "half again as far"; it is 6.8 → 13 tiles, and only for
  THE FULL THROAT — the call, the breath and the spit keep their own reach. It says so now. SURE
  HOOVES said "faster than anything in the building"; it is +13%.
- **Fix: RAW THROAT taken before a voice was lost.** THE FULL THROAT, DRAGON BREATH and VENOM SPIT set
  the cooldown outright, so a RAW THROAT picked up first had its halving thrown away (DRAGON BREATH
  stayed at 5 s instead of 2.5). Actives are applied before passives now, whatever the order taken.
- **The rail's notes have numbers too**, as they stand with every soul counted: reach and recovery on
  the horns, how many bullets a held man stops and how long before he works loose, roll distance and
  cooldown, what the voice reaches. BOMB CHARGE's note said a man "blows up a moment later" — he only
  does if he dies against a wall or another man inside the fuse, and it says that. THE FULL THROAT
  now says it no longer calls the room.
- **A talisman tier stands on its own.** Tiers II and III were written as a diff on tier I, but the
  second mouse sells only tier II and the third only tier III, so BUTCHER'S GREASE III never said men
  slip on it and MASON'S MARK III never said a crate counts as stone. Each talisman now has one
  `say(p)` that states any tier whole off its params; the typed lines are gone. MIRROR SHARD II no
  longer promises a daze it never did (a parried man is thrown back), and CARPENTER'S AWL III no
  longer sells "a thrown crate breaks on a wall", which every crate always did.
- **Smaller.** The worn talisman's chip says what it is before its numbers. The empty slot no longer
  says the mouse sells for the level's dead — she takes nothing. The crow's card says what it found
  (a tier III talisman). PILGRIM'S SANDAL is for men on your heels, not men in the room. LIVING
  SHIELD's swing and reload and the big grass's two hearts moved into `tuning.js`. The TALISMANS tab
  shows three lines a tier.

### A pass over THE DARK, 1.59 and 1.60

A read of the new code against a bot run through every floor, lit and dark. No errors thrown
anywhere; what was wrong was quieter.

- **Hunting by ear followed the cult's own noise.** A man who lost the goat in the dark moved his
  "last heard" to every noise in range, his own chase shouts (three a second, six tiles) included,
  so when the trail went cold he went and investigated his own feet. The cult's shouts, swings and
  casts are tagged `'cult'` now and only what the goat makes moves the hunt. Measured on THE ROAD
  dark: of 19 men sent to investigate, none at his own spot; all within four tiles of the goat.
- **The dark no longer drops a blow in mid-swing.** The 1.2 s cold trail applied in every state, so
  a Butcher who lost sight during a charge was snapped out of the run before it could earn its wall
  stun. It cools a hunt (`chase`, `noticed`, `investigate`) now, never a windup, swing or charge.
- **CONTINUE kept the lights on.** A floor picked dark in LEVELS was saved without the dark and came
  back lit, at the full curve, rifles and all. `darkAt` is in the save.
- **A dark THE ALTAR had no altar.** Two checks asked `def === LEVELS[0]`; they ask `levelIndexOf`
  now, and so does the `first` rule, which a dark first floor had skipped.
- **Tall grass stopped lamplight.** Grass joins the sight block only beyond 1.5 tiles of the goat,
  so a lamp's pool changed shape as he walked and could draw him black where the men (`litAt`) saw
  him lit. Grass hides from eyes, not from a flame.
- **MOTH hid you twice as fast.** The fidget clock (1.60) shared `goat.stillT` with MOTH and doubled
  it; MOTH III hid a still goat after 0.6 s instead of 1.2, and never while he held anything. The
  fidget has its own clock (`idleT`).
- **`turnGrip` braked more than his run.** Pulling back during a recovery or a knockback braked the
  drift 1.6 times faster, trimming a recovery that is meant to be eaten. Only his own run now.
- **An escort in the corridor was "left behind" on the goat's side of the wall.** The clamp asked
  which room an animal was nearest, and one half-way down the corridor out of the room counted as
  behind. It asks the tiles now: a fill from the goat after the mouth is stoned (about 2 ms, once
  a clamp).
- **Smaller.** An escort far behind laid its route again every step (its two wants threw each
  other's cached waypoint away); each want keeps its own. The dark's mask buffers are no longer
  reallocated each time the camera crosses a tile. The escorts' shy and stray numbers moved into
  `TUNING.beast`.

### Barrels

Asked for on 15 Sep 2026 ("barrels down the sides") and shipped then as crates, because there was no
barrel to put there. There is now, and it is not a crate.

- **A barrel of lamp oil** (`kind === 'barrel'`, `TUNING.prop.barrel`). Too heavy to lift. A headbutt
  tips it onto its side and it rolls the way it was hit, 16 tiles a second and slowing gently: about
  a room's length.
- **It bowls; it does not kill.** Every man it meets goes along its line, a little to his own side,
  at 1.35× its speed, and sees stars for 1.8 s; it keeps 80% of its speed for the next. A man near a
  wall dies on the wall; a row goes down together and is the goat's to finish. The Butcher staggers
  and it comes back off him; the rat ogre is not moved.
- **Anything can send it.** A body thrown into a standing barrel at 5 tiles/s sets it rolling at 80%
  of the body's speed (and still dies on it at splatting speed); a barrel rolled into another hands
  the roll on; a charging Butcher sends it ahead of him. Square on a wall above 6 tiles/s the staves
  go; slower, it lies there and can be butted again.
- **Oil.** Flame under it or a burning man against it lights it: OIL, one flame on it, 1.6 s, then it
  goes up 2.6 tiles wide for 7 s wherever it has rolled to — wider and longer than a crate. Into a
  brazier it goes up at once; witchfire lights it violet. Lit, it is a hazard to the cult's trap
  sense: a man who reads it keeps out of its reach, and a man who fails the roll walks in. On a dark
  floor a lit barrel is a light, as bright as a man alight.
- **Where.** One or two, in about a room in three, from THE YARD on (never the altar or the cave):
  where a boulder may stand, floor all round and clear of the way in, never in a teaching, rest or
  trap room or a narrow set piece; arenas are allowed. Rolled off a stream of their own so the rest
  of a level's rolls stay where they were. 1.7–3.8 a level. `GEN_RULES.barrels`; the generator sweep
  has 0 fails and `node tools/balance.js` holds.
- Drawn from the barrel already in the environment atlas (it was only ever scenery in the ritual
  room): standing as painted, lying in whole quarter turns. In the FIXTURES tab and the JUICE list.

### Three souls off the backlog

The deck candidates asked for on 16 Sep 2026 ("the deck at 36, restated"), built as ordinary cards
in the deal as it stands. The fourth candidate — three seconds of invulnerability after a hit — was
left out: ground rule 4 allows no i-frames beyond the roll's.

- **LEAPFROG** (roll, active). Rolled at a man in front of you — up to 3 tiles, within 34° of where
  you are running, or pointing when you stand still — the tumble becomes a vault: 0.36 s in the air
  over his back, landing a tile past him, and he reels for 0.9 s (a windup under way is lost). It
  never kills; what kills is the wall he was facing when you came down behind him. A vault costs
  twice the roll's cooldown; with nobody in front, or no floor behind him (stone, a hole, fire,
  furniture, another man, a trap about to bite), it is the ordinary roll at the ordinary price. In
  the air he touches no man and no hole takes him. Drawn as a lift off his shadow, stretched, not
  spun; the rail's chip becomes an arc over a man and its drain shows what the last roll cost.
  (`Goat.leapTarget`, `leapLands`, `goat.leap`.)
- **COLD EYE** (grab, passive, no BY THE COLLAR needed). Anything into his mouth slows the world to
  35% for up to 2 s of real time, so a throw can be aimed; the throw ends it at once, and it comes
  back once every 5 s. The grab chip drains while it lasts. (`game.coldEye`, `game.aimSlow`.) Until
  now the grab had no passive a goat without the collar could be dealt.
- **FOUR STOMACHS** (body, passive). Grass is worth a heart more — +2, and the big patch +3 — and
  he has one heart less. A card that argues with itself. The mouse's pail is milk and is unchanged.
- `BOON_POWER` weighs them 1.1, 0.9 and 0.5; `node tools/balance.js` holds. Two JUICE rows.

## 1.60 — weight in the stride, a goat who fidgets, bodies that lie down

- **The stride has weight** (`goat.feel`). He leans into a change of pace and a touch forward at a
  full run, and hops a pixel on each hoof-fall in step with the walk frames. Setting off stretches
  him with a puff behind; letting go at speed settles him. Asking back against your own run grips
  `turnGrip` (1.6) times harder, squashes him and sprays dirt ahead. That is the one simulation change:
  the braking half of a full reversal is 1.6 times quicker, about 0.30 s → 0.24 s end to end at top
  speed. Everything else is drawn.
- **Standing still is not a statue** (`goat.idle`). After 1.4 s, every few seconds, one fidget: a
  glance one facing aside, a little pronk, a shake of the head, or a hoof pawing the floor with a puff
  of dirt. All drawn only. The facing is lent to the drawing and handed back, so a butt still goes
  where you aim.
- **Anticipation**: the headbutt windup draws him back `feel.pull` px off the aim before the lunge
  (this was on the JUICE backlog).
- **A dead man lies down** (`effects.corpse`, `CombatFX.corpseSprite / updateGround / pool`). He keeps
  a third of the speed he died with, lands, skids a little leaving a smear, and rolls onto his side at
  an exact quarter turn, where his pixels stay square instead of stair-stepping. He twitches twice, and
  a dark pool seeps out from under him over 2.6 s, then goes into the stains. He is solid now; at 0.88
  alpha the floor showed through and he read as a ghost. He is a shade duller than the living and lies
  on his own silhouette for a shadow. A burnt man leaves no pool.
- **Fix: blood with no direction came out square.** `World.splat` with a zero direction measured every
  cell as the centre, so a bomb (size 30), the goat's own death, the hen, a talisman and every landing
  piece of gore painted a hard red box. It is a round, lobed pool now, with its drops scattered round it.

## 1.59 — the escorts find their way, and you can see one you left behind

Measured first, with a bot (`tools/escorts.js`) that breaks a level's coop, runs the goat to the
stairs round the furniture and stands two seconds over every man on the way, and asks whether the
animal came. Before, on seven levels by three seeds: the hen 21 of 21; the goose 14 of 21, standing
somewhere for good in ten of them; the crow **none** of 21, eighty tiles back and walking into a wall.

- **Animals take the men's routes** (`Beast.way`): down the field laid round the furniture, pulled
  tight to the furthest point they can reach in a straight line, the 1.57 `pickWaypoint` in a smaller
  body. The goose's beak stayed against the first lamp on its tile; the hen and the tortoise did the
  same against tables. The way out (`Beast.exit`) is laid round the furniture too, again every second,
  since furniture moves. Past the ninety tiles the goat's field reaches, a straggler heads down the
  way out instead of into the nearest wall.
- **The goose leads.** It was slower than the goat it led (150 against 168, 210 run up). Now 200, and
  1.35 times that while he is ahead of it (`goose.hurry`). Waiting, it looks back at him.
- **The crow eats and moves on** (`crow.feedFor`, 2.5 s a body). It sat on each until the body aged
  out, fourteen seconds a man. It still falls behind a goat who does not fight — that is its rule — but
  it comes: standing at the stairs, the longest wait measured was thirteen seconds.
- **The hen and the crow keep out of reach** (`Beast.shy`, `beast.shyR`): a man awake and on his feet
  within 2.4 tiles sends them round to the far side of the goat, out of the arc of a club aimed at him.
  The cult still does not go for them; a swing can still find one.
- **One left behind is not a surprise at the stairs.** Out of the picture, its own sprite on a pip at
  the edge of the screen points at it (`Renderer.drawStrays`); past eleven tiles it calls every few
  seconds. One room from being walled in, the pip goes red and it calls twice as often. Walled in it is
  lost — that is the price of not keeping its pace — and the goat is told: THE CROW WAS LEFT BEHIND
  (`Beast.lost`). It used to stay alive in the dark with nothing to say it had happened.
- **Smaller things.** A tortoise or a hen down a hole says THE TORTOISE FELL. A coop the goat walked
  past says IT BROKE OUT for anything but the hen. The goose, the crow and the tortoise stop facing
  right when they stop moving.

- **A step over a drop slides along the lip** (`Beast.step`) instead of being refused whole, and the
  crow only flies at a body it has a straight run to over floor: on THE RAFTERS it stood at the edge of
  a hole for good, trying to walk to a body on the far side.

After, same bot and seeds: the goose never stuck, under a tile off the lead on average, and at the
stairs every time the bot itself got there (19 of 21; the other two are the bot lost on THE OSSUARY);
the hen 21 of 21. The crow, with a goat who never once waits for it: 3 there on arrival, 9 walled in —
which is the rule — and in 12 of the 21 it reached him within 13 seconds of standing at the stairs.

## 1.58 — fire and blasts in the game's own pixels

The playtest note was "explosions and fire look like they are from another universe", and they were:
every flame, blast and blood spray was a frame off a painted sheet (`effects.png`, generated at 2048 px
and shrunk with smoothing on, a red fringe round every flame) laid over a world that went Pixel 2.5.

- **Everything that burns or goes off is baked pixel art.** `CombatFX.flameFrames` and
  `CombatFX.burstFrames` build their frames at start, one texel a world pixel (`TUNING.effects.pixel`,
  the units' grain), out of five flat colour bands, and draw with smoothing off. A flame is a
  teardrop eaten from the top by noise scrolling up through it, sparks baked on the same loop. A blast
  is a white flash and a star of rays, then a fireball of puffs cooling band by band into soot lit from
  above, rising and ordered-dithered away. Dust (doors, crates, a man burnt out) is the same cloud
  with no fire in it; a kill's spray is drops with tails that break off, not a painted ink splash.
- **Flames come in whole-pixel sizes.** The sin wobble on a floor fire's, a brazier's and a lamp's size
  was taken out: with baked sets it would have flicked between shapes every frame. The loop is the
  motion now, and every burning tile starts its loop at a different frame.
- **A blast weighs something without shaking the picture** (shakes stay the goat's alone): embers
  streaking out past the cloud, the room lit for an instant (`blast.light`), a pixel shock ring on the
  floor, a screen flash and a lens punch under `juice.screen`, and a darker soot column that starts
  a beat late and goes on rising after the fireball (`blast.soot`, `sootAfter`, `sootLife`).
- **The rest of the effects moved onto the grid with it.** Rings (`game.ring`: the scream, impacts,
  kills, bells) are cells, not stroked arcs (`CombatFX.pixelRing`). Particles snap to world pixels and
  sparks are runs of cells. The muzzle flash is a tongue of cells. Flying blood drops and splinters are
  cells. Burning grass wears small baked flames. On the floor, a blood splat is a lobed pool of cells
  with a darker rim and a wet glint, drops are cell discs (`CombatFX.cellDisc`), and scorch is soot
  dithered out to nothing instead of an airbrushed blot.
- **Cheap to carry.** Frames build lazily, one the first time it is shown, and `CombatFX.warm` bakes
  every size a level asks for one frame a tick after load, so the first bomb of a run does not pay for
  its own frames. Noise is sampled once per size and read shifted per frame.
- **`js/combat-assets.js` is gone** (1.2 MB): both HTML files lost its script tag. At the next deploy
  pass `"js/combat-assets.js": null` in the publish `files` map. The sheet and its packer stay in
  `assets/combat-fx/` and `tools/` for history.

## 1.57 — the cult finds its way: routes for the Butcher and the hound

Measured first, with a harness that drops a goat and one man in random spots of every room of every
level and counts who never gets to him. Before: the Butcher never arrived one time in seven (six in
forty on THE CAVE), a hound or a clubman now and then, always the same way — pushing at something.

- **Routes are pulled tight and walk round the furniture.** `Enemy.pathDir` walks the field
  `ai.path.ahead` tiles forward and heads for the furthest point of it his body reaches in a straight
  line (`bodyClear`: his middle and both shoulders against stone and holes, his whole width against
  furniture). The field it walks, `World.route`, steps round the tiles standing furniture is in
  (`World.setFurniture`); `flow`, which everything else asks, is untouched. No more zigzag down the
  tile grid, no more nose into a lamp standing in the middle of his tile.
- **A body wider than a tile has its own field.** `World.routeW` is laid on the corners of the grid:
  a corner with four open tiles round it is a spot the Butcher (and the rat ogre) can stand, and the
  step between two such corners is one he fits through. The tile-based version still took him at the
  pinch between two offset stubs of wall, 32 px for a 40 px body. Only filled while such a body is awake.
- **Pinned is noticed.** `Enemy.unstuck`: half a second of chase with under a third of a tile covered
  and he steps off along the most open heading that still points at the goat. Not while he is leaning
  on a shut door — that is how a door is opened, and a route that stopped short of the door left a
  Butcher standing two tiles off it.
- **Heat is walked round, not bounced off.** Inside a brazier's berth a man used to be sent straight
  out and walked straight back in, rocking there with a body's width of floor to pass by. He slides
  round anything that stays put now; the wheel's arms still send him straight out.
- **Noise is followed round corners.** A noise near the goat on the far side of a wall is walked by the
  route instead of in a straight line into the wall.
- **The Butcher leads his charge** (`butcher.chargeLead`, `leadMax`): aimed at where you are going,
  and the strip on the floor swings with it through the windup. Running on across his line is running
  into it; breaking off after he leaves his feet is the answer.
- **The Butcher steps round furniture to get a charge** (`findLane`, `laneLook`, `laneTime`): with a
  pillar or table between him and a clear run, he walks a tile or three aside to a spot with a line on
  you first. A spot he is not closing on is dropped.
- **The hound goes round a wall, not along it.** A goat near him on the far side of stone had him
  circling on the wrong side of it; he takes the route until there is a line. From well outside the
  ring (`dog.ringIn`) he runs the route in rather than a straight lean across a room of pillars.
- **The hound stops shivering in corridors** (`dog.flipGap`): the ring's turn-round could fire every
  frame with both sides walled. **A pack spreads round you**: with another hound near, he circles away
  from it. **Backing off runs round what is behind him**, for the hound, the rifle and the mage; a rifle
  or a mage with nowhere to go but toward you holds his ground instead of pushing into the corner.
- **The hound gives up a run when the floor under him arms.** He used to crouch a whole second on a
  grating plate he had just tripped. Four hound deaths to the grating in fifty on THE RAFTERS, one now.

Result on the same harness, all eight levels: every Butcher, hound and clubman that can physically
reach the goat does. The step on a late floor with fourteen men chasing is 3.2 ms.

## 1.56 — antlers, and the souls you can see on his face

- **LONG HORNS is an active on the headbutt.** As a passive it sat beside BOMB CHARGE or SPLASH and
  was too much to have for free; now it takes the butt's one active slot. Same numbers. He wears it
  as a stag's antlers, built off each horn in the sprite's own pixels (`PIXEL_ART.antlerOf`), and the
  BUTT chip grows tines.
- **The scream souls show.** THE FULL THROAT draws his mouth out into a horn's bell, a size up while
  he shouts. VENOM SPIT: froth at the lips and now and then a drop off the chin onto the floor.
  DRAGON BREATH: steam off the nostrils nearly all the time, and every few seconds a lick of flame.
- **THE ORACLE opens a third eye** between his two; it blinks on its own.
- **He breathes** standing still.
- All of it is hand-drawn pixels on the goat's grid (`PIXEL_FACE_ART`, `TUNING.goat.face`).
## 1.56 (cloud) — the questionnaire's answers: a run code for playtests, barrels, one death not two

Built in a cloud session on the same day as the local 1.56 above, from the same 1.55, and merged into
1.61. Everything here is in 1.61 except its barrel: two barrels had been built for one ask, and the
rolling one (1.61, "Barrels") is the one kept. Its synergy marks lost the pairs one button cannot
hold together (one active a button; LONG HORNS is an active since the local 1.56).

Built off the open-questions page (`tools/backlog-questions.html`), where every open backlog line was
marked. Everything marked "do" is here; the rest stays in `BACKLOG.md` with its answer written in.

- **A run code on every death, clear and win card.** One line at the foot of the card: build, level
  (T for the trip), run seed, the death count the level was cut with, room, kills, time, souls, what
  took the last heart, the gap between the last two hearts, and the level's first body with its cause
  and second. The click that leaves a death or the win card also copies it. `game.replayCode(code)`
  stands a dev on the same floor. This is what a playtest form asks for, and what the "a kill before I
  touched anyone" report never had.
- **Barrels.** A new prop, asked for on 15 Sep: stood against a wall, never in a room's way, too heavy
  to lift, stops a man and a bullet, two blows or a body at `knockHitSpeed` stave it in, and fire opens
  it into a pool of burning oil wider and longer than a crate's (`TUNING.prop.barrel`,
  `levelDef.barrels` from THE YARD on, not in the cave). `GEN_RULES.barrels` holds where they stand.
- **One death, not two.** A man off the horns used to die with the man he landed on at `splatSpeed`, a
  tile a second over the speed that kills the other one, so nearly every body-on-body headbutt was a
  double kill. He dies too only past `physics.bodyBothSpeed` (32 tiles/s), over the bare headbutt: LONG
  HORNS and a run-up still reach it.
- **The shadow is lighter** (`fog.shade` 0.9 → 0.8): a man behind a partition read as invisible while he
  could still hear you. Unopened rooms are still hidden by `drawUnseen`, not by this.
- **THE THRESHING FLOOR is fuller**: curve 9→19 to 10→21 and an eighth man allowed a room, so the width
  is filled rather than cut. 98.9 → 109.1 threat, still well under THE BRIDGE.
- **Every floor names what is new on it.** THE CAVE's hint adds the rock teeth; THE BRIDGE's says to
  meet them in the doorway.
- **Burst or bleed, counted.** The dev drawer counts deaths whose last two hearts went inside
  `TUNING.dev.burstGap` (1.5 s) against the ones that bled out; the run code carries the gap. This is
  the measurement the 16 Sep note asked for before touching hearts or `goat.invuln` again.
- **Synergy and addition marks on the boons**, shown on the BOONS tab: who a boon is read with (both
  ways round) and who it quietly helps. Marks only; the game reads neither.
- `ART_TODO_GPT.md`: every painted or primitive leftover as an image-generation brief.

## 1.55 — all pixel, and a lighter build

- **Every floor and wall is pixel art.** The square-walled levels were still painted tile sets, one per
  level. They are built from the pixel pass's swatches now (`PIXEL_ROOMS`: a floor per canon — slabs
  on THE ALTAR, cobble in THE YARD and on THE ROAD, dirt and straw on THE THRESHING FLOOR, slate on
  THE BRIDGE, boards in THE RAFTERS — plus a brick face and stone cap for every wall), each multiplied
  by the level's own colours and baked once (`PaintedArt.swatch`). THE OSSUARY, which
  never had a painted set, get the same treatment instead of flat colour.
- **Every body is pixel art.** The ART switch is gone from the dev drawer; the painted character sheets
  are gone with it. The intro's ewe is the pixel pet sheep, and a man going down a hole falls as his
  own sprite rather than as the old primitive figure.
- **Smaller blood in the wool**, and smaller still facing the camera (`goat.wounds.front`), where the
  blots sat on his face and chest.
- **The build is half the size.** `painted-assets-v1.js` and `-v2.js` are deleted and
  `painted-assets.js` keeps only the painted props with no pixel sprite yet (altar, banner, gong,
  lantern, weapons, grating, wisp, wheel, cage, doors): 15 MB of scripts down to 7.5 MB.
- **The folder is cleaned.** The painted sources (`assets/painted*`), old concept art, the painted pack
  tools, the zip duplicates of the pixel hand-offs, their legacy frames and `GOAT_OUT_brief.md` are
  gone (all but the untracked zips live on in git history). `CLAUDE.md` is condensed and
  `ART_HANDOFF.md` rewritten for the pixel pipeline.

## 1.54 — the boss can be hurt again, a cave painted once, and a crow with opinions

- **A heavy man dies to a wall again.** A brute carrying a soul was thrown 0.55 × 0.6 as far, which
  put a headbutt at nine tiles a second against a wall that asks eleven: the level-one boss could not
  be hurt at all. `Enemy.splatLimit` asks a heavy man the same share less of the wall.
- **Men no longer freeze in doorways.** A man in a corridor counted as still being in the room he was
  spawned in, so one who had chased you out of a room two back stopped dead beside you. A corridor is
  now whichever room is nearest (`game.nearestRoomIdx`).
- **Poison + stun is SHOCK, not a kill.** Both run long (`status.sting`: 4 s frozen, 6 s blind) and one
  turning green-and-gold spiral over his head says so. A poisoned crate in the face no longer kills.
- **THE TRIP runs.** The cave's ground — floor, litter, mushrooms, rock and what grows on it — is
  baked into bitmaps eight tiles a side and blitted (`Renderer.drawCaveBaked`); only the glows are
  live, and not at all pulled far back. A frame of the trip went from ~25–60 ms to ~6–10 ms here.
- **On the trip half the blows never land**: "OH, I WAS ACTUALLY OVER HERE" and he is 2.6 tiles away
  (`shroom.phase`). The banner is in English, and the floor says YOU ATE THE MUSHROOMS.
- **The crow flies to any body it can see**, fast (`crow.flySpeed`), takes the one nearer the stairs,
  and says what it thinks of it: FRESHLY COOKED, TASTY, STILL WARM, MINE.
- **The first wraith that hides does it in an empty room** — relief, and then the box that was never a
  box (`game.stageFirstHide`).
- **The mouse's shelf**: only the nearest ware writes its note (two were drawn over each other), she
  turns to watch the goat, and the floor says RIGHT BUTTON - CHOOSE THE ARTIFACT.
- **Fewer rifles**: two a room at most on every level, and a lone post only goes where no rifle is.
- **Things stand on their shadows.** `Renderer.shadow` hung every shadow half its height below the
  feet, so every figure hovered; it sits under them now. The brazier and the lamp stand on the middle
  of their tile (`PROP_FOOT`) rather than on its bottom and top edges.
- **The dirty floor tile is rare** — about one in twenty-odd instead of one in four.

## 1.53 — animals in coops, a veil instead of a plate, side walls with brick

- **Every animal starts shut in a coop** — the tortoise, the goose and the crow as well as the hen —
  and one animal a floor, in its first third (`levelDef.beasts` now lists `chicken` too; the per-room
  `coops` scatter is gone). A coop **calls out** when the goat is within `beast.callR` tiles
  (`Audio.sfxAnimal`: cluck, honk, caw, or a tortoise knocking on the slats) so nobody walks past one.
- **Animals can die.** A blow from the cult that finds one, or a touch of fire, is a wound;
  `beast.hp` (3) of them and it is dead. The tortoise's shell turns every blow — only fire hurts it.
- **The tortoise is ammunition too**: thrown into a man it floors him for `crate.stun`, like a crate,
  and lands where it hit.
- **The goose does not wait.** It runs for the stairs on its own down a distance field grown out of
  the exit (`Beast.onward`), through S-bent corridors, and stops only at something shut.
- **Everyone brought out is shown** as a row of animal emoji under the hearts (`Renderer.drawSaved`).
- **Mushrooms are grazed like milk**: stand still over the tuft for `shroom.eatTime` while a violet
  ring fills. Walking across them no longer eats them.
- **A room left behind goes dark** instead of being plated: the mouth is a veil of breathing black
  with violet threads, and the whole room behind it is blacked out (`Renderer.drawVeil`).
- **Side walls show a narrow band of brick** on the side that faces the room — the right of a left
  wall, the left of a right wall, the right of a wall with floor on both sides.
- **The cursor is a pair of horns.** **The dev drawer is two columns**, switches and SPAWN.

## 1.52 — pixel furniture, a pixel cave, and the trip says so

- **Rooms are furnished in the pixel style** (`output/pixel-environment-2026-09-23`, packed by
  `tools/pack-pixel-env.ps1` into `js/pixel-env-assets.js`, drawn by `PIXEL_ENV` in `js/pixel-art.js`
  on the same ART switch as the characters): crate, hay bale, table, brazier (its flame still drops
  when the coals are spilled), and a lone `P` pillar is a column rather than a cube of wall. A few
  tiles in a hundred carry flat litter — planks, stone crumbs, straw, a worn rug.
- **The cave** has stone floor swatches multiplied by the level's own floor colour (untinted they were
  the rock's grey and the rock stopped reading as rock), pixel boulders, the stone teeth as
  stalagmites, crystals on the rock face, and pebbles, moss, puddles and cracks on the floor. The rock
  decoration keeps its drawn spires, so nothing that is not the hazard wears the hazard's sprite.
- **THE TRIP** is on mushroom soil, its giant mushrooms and floor caps are the painted violet ones
  under the same glow, and it opens with ВОООООУУУУ, ТЫ ПОДДДД ГРИБАМИ.... across the screen
  (`TUNING.shroom.banner`).
- **Fire is slower on the trip**: `TUNING.shroom.burnDelay` adds a second to the goat's fire tick,
  since scrambled hands take longer to get out of a flame.

## 1.51 — walls with one face, a charge that ends past you, a lighter trip

- **Walls read from the camera.** Only the far wall of a room and the front of a pillar show brick
  now — a cap on top and a tall face under it. The near wall and the side walls are just the cap
  with a dark rim. Every exposed side used to get a band of brick, so the near wall showed its back.
- **The Butcher stops a couple of tiles past where you stood** and skids out, instead of running a
  fixed fifteen tiles into whatever was behind you. The floor strip shows the real run. He still
  stuns himself on the wall if your back is to it.
- **The ambush room is two clubmen**, never the brute's introduction.
- **The roll's floor text is `E - ROLL`**, one line.
- **THE TRIP is cheaper to draw.** Each mushroom's glow is a cached sprite, stamped in one additive
  pass rather than a new gradient and two blend-mode switches apiece, and the fur on the rock is
  a little sparser.

## 1.50 — Three escorts, the cave moved to the third floor, and the frame cost cut five-fold

**Three animals that do not follow you.** `js/beasts.js`. One a floor from the second on, standing
loose in an ordinary room inside the first third of it, and worth something for the whole rest of the
run if it is still with you at the stairs. They are plain `Prop`s with their own kinds, so nothing
else in the game had to be taught a new noun, and none of them adds a key. The rule they are built to
is that none of them simply trots after you:

- **TORTOISE** — slower than a walk. You advance it by picking it up and throwing it, one room at a
  time. Where it lands it pulls its head in for four seconds and is a shell: solid, rounds stop on
  it, and it cannot be picked up again until it comes out — so the throw is a decision about cover.
  At the stairs: one more blow on every shield in the compound, for the run.
- **GOOSE** — it leads rather than follows, walking at the mouth of the next room and waiting when
  you fall behind, and it honks at every man it can see. The honk is a noise, so the room turns and
  comes for YOU — and it breaks a blow a man has already committed to, at any range at all, which is
  the only parry in the game with no range on it. Nothing in the cult ever goes for the goose. At the
  stairs: the voice carries 20% further and comes back 20% sooner.
- **CROW** — it follows corpses, not you: every room with nothing dead in it, it falls behind. The one
  escort that argues with *run, don't fight*, and that is the price of what it carries out — at the
  stairs it leaves a **tier III talisman** standing on the next floor's own stairs, free, taken the
  way one of the mouse's is.

Each gets a card on the clear, a once-a-run line the first time you meet one, a row on the tool's
FIXTURES tab and a button in the dev drawer. `GEN_RULES.beasts` holds the placement.

**THE CAVE is the third floor.** It was the eighth. A level whose whole idea is the *shape* of a room
reads best before the run is deep in men, and the last floor of anything is where the least of what
you built gets looked at; third, it lands right after the fire and right before the rifle — the last
floor still about the ground rather than about what is standing on it. Everything that made it late
went with it: the rifles, the grating (THE ROAD's own new thing, one floor later — the cave keeps the
rock's own teeth), the trap room, the third ring and two rooms of length. Everything below shifted up
and the whole ladder was re-cut, since both the per-level rule and the report hold each floor above
the last: 23.6 / 42.8 / 65.7 / 98.2 / 100.6 / 144.1 / 155.6 / 164. Five levels now draw cave rooms
into their mix, so `GEN_RULES.grass` widened from "the cave and nowhere else" to "the cave and any
floor after it" — grass *before* the cave is still a failure.

**A cave stops showing the whole hill.** It used to be painted everywhere the camera could reach, so
a room read as a small dark hole in a great pale field of stone nobody can walk into. `caveNear` is
rock within `TUNING.cave.band` (2) tiles of open floor and nothing else is marched — the same rule
the square-walled floors have always kept, with a cave's thickness.

**The stalactites are dripstone.** The spires along the top wall used to be an even row of
needle-pointed triangles, which reads as a mouth. Curved sides, an arc for a tip, a lean, lengths
squared so most are stubs, shading along the column instead of a band across the top of it, and
fewer of them. The stone teeth on the bottom wall stay sharp: the contrast is the point.

**A late floor costs a fifth of what it did.** Measured at ~18 ms a frame and now ~3.5 ms in the same
hidden pane. Three things, each of them a rule for anything written here next:

- `game.liveEnemies` — the men who actually ran this step. Everything that asks "is anybody standing
  near here" reads that instead of the level's whole cast: a man frozen two rooms away is not walking
  onto a grate and nothing is walking onto him. The grating alone was asking all eighty men of a late
  floor, nineteen times, three times a step.
- `collideEntities` builds its entity list once rather than once per piece of furniture, rejects on a
  box before any distance maths, and compares squared distances. It was the top of the profile; it is
  off it.
- The cave's rock is marched once and kept (`Renderer.caveRockPath`, `World.caveDirty`) instead of
  two thousand `lineTo`s a frame.
- And a **thrown exception inside `draw` costs the whole rest of the frame**: `drawRunes` measured a
  Seer's cast against the raw `castWind` while the timer was set to `castWind * mods.enemySlow`, so
  the progress ran negative for the first tenth of every rune (four tenths on EASY) and
  `arc(0, 0, R * p)` threw. The floor, the men, the goat and the HUD all stopped being drawn for those
  frames. It has been throwing since EASY MODE landed.

Also: a corridor no longer un-freezes the entire level. `roomAt` answers nothing between two rooms,
and the two-rooms-away skip read that as "no idea, simulate everyone" — so every man on the floor woke
up for as long as the goat stood in a doorway. It falls back to the last room he was in.

---

## 1.49 — The far door, the screen stops shaking, stone teeth, a pail of milk, and plain words

From the 22 Sep 2026 playtest notes. Nine of them, and most are about being told less and shown more.

**The way out is at the far end of the room.** `pickDoorY` / `pickDoorX` (`js/gen.js`) now take the
row or column the goat walks IN by and throw away every candidate that does not make `DOORS.far`
(0.7) of the greatest distance available from it before the dice are rolled. A corridor used to leave
by whichever row the dice picked, which now and then put the exit a tile from the entrance: you came
in at the top of the room and left at the top of it, and the room's men, its pillars and its wheel
were something you ran past rather than something between you and the door. The clamping a wide
corridor does (`fit`) is applied to the candidates BEFORE the choice rather than to the row after it,
or THE THRESHING FLOOR's five-wide corridors threw the whole thing away on every room.
`GEN_RULES.farexit` holds it against what the generator recorded it could have done (`room.exitFar`).

**The screen only shakes when you lose a heart.** `game.shake(a, hurt)` — every one of the sixty call
sites is still there at the amount it always had, but anything that is not the goat being hit is
multiplied by `TUNING.juice.shakeOther`, which is 0. The directional kick keeps `kickOther` (0.35) of
itself, because one push in one direction reads as weight rather than as an earthquake. A shake is
information; when a kill, a crate, a door, a gong and a bomb all shake the picture, the one event the
player has to feel without looking at the hearts is the one that gets lost in them.

**The cave's spires rise.** They used to hang: triangles pointing down out of the rock's face onto the
floor, which from directly above reads as teeth stuck to a wall. They are rooted on the floor at the
foot of the cliff now and go up over the face and past the top of the rock. And the seams of gems are
on the visible face only — the top of a rock is the part of the cave you are looking over rather than
at, so a seam drawn there was paint nobody ever saw.

**And one of them is real.** `kind === 'spire'`, `TUNING.cave.spikes`: stone teeth standing at the
foot of a cave wall, in `chance` (0.3) of its ordinary rooms and one to a room. Not blocking — a thing
you cannot walk into cannot hurt you — so it is floor to the flow field and a hazard to everything
with eyes (`Enemy.hazardAt`). It never arms and never rests: a man dies on it the way he dies on the
grating, the goat pays a heart (KILLED BY THE ROCK), and the cult steers round it, so it is a thing to
throw men into, on the wall that was already the weapon. Old blood round its foot is what says so from
across a room. Never in a trap room, a set piece, a teaching room, a doorway or on the trip, and never
on grass. `GEN_RULES.spikes`.

**THE TRIP is fought at the first level's strength, whatever floor it replaces.** `TUNING.shroom` now
carries the curve (`threatMul` of LEVELS[0]'s), the cap (`men`: 1) and the roster (`kinds`: the
clubman and the mage; nothing that shoots). With the stick reversed and the buttons swapped a rifle is
not a harder clubman, it is a death you cannot answer with hands that no longer do what you tell them;
a rune is a place on the floor, and walking out of a place is the one thing scrambled controls still
let you do badly but do. Its rings are level one's — one brute, one man at his back. The controls are
the difficulty of that level and nothing else is asked to be. The lens breathes and leans with it
(`TUNING.shroom.cam`, in `Renderer.worldTransform`) — never a shake, which means one thing only.

**The mouse's third offer is a bucket.** One pail of milk as tall as the goat, holding
`TUNING.shop.heals` hearts and drunk a heart at a time where it stands (`prop.pail`), in place of three
bowls scattered round the room under the words THREE BOWLS OF MILK. A thing that size full of that
needs no caption, and a goat who takes it at full health now has something to come back to instead of
two thirds of an offer poured away.

**Every talisman says what it does, in numbers.** All sixty-three tiers in `ARTIFACTS` rewritten from
prose to the literal thing: `Q: 6 TILES OUT AND BACK. 1 MAN, DAZED 1.2s. 10s COOLDOWN.` rather than
"the first man it meets loses his head for a moment, and it comes back to you". The tiers under one
talisman read as a diff — I states the whole thing, II and III state only what changed. `drawWare`'s
note is wider for it and hangs high enough to clear the pail between the stools.

**Fixed:** a boulder formation could grow a cell shoulder to shoulder with a loose boulder already
scattered into the same room — the seed is kept three tiles off one but the formation grows up to six
cells from that seed, and the tiles stay floor under a boulder so nothing else caught it.
`placeRockCluster`'s perimeter check now counts them.

---

## 1.48 — Boulder formations, thirty-two more rooms, deeper grass, the trip off the menu

**THE CAVE breaks bigger.** `levelDef.rockClusters` is a second, separate per-room chance of a whole
formation — three to six boulders grown together by `placeRockCluster` (`js/gen.js`) into one big
thing to break rather than a handful of loose stones. Every cell is still an ordinary `rock` prop,
its own crack and its own two hits; only `cluster`, an id shared by every cell of one formation, marks
them apart, which is what lets `GEN_RULES.rocks` allow a formation's own cells to stand shoulder to
shoulder while still refusing that of any two boulders that do not share an id. `clusterKeepsRoomOpen`
checks the room's floor stays one connected piece with the whole formation blocked, so it can reshape
a room but never wall off a pocket of it. THE CAVE is the only level that asks for one.

**Thirty-two new room templates, four to a canon.** Every canon in the game — STONE, FIRE, THE LINE,
OPEN GROUND, THE FUNNEL, THE DROP, THE NICHE, THE HOLLOW — goes from five hand-authored templates to
nine: `buttress`, `quad`, `ambry`, `plinth` (stone); `smokehouse`, `tallow`, `cinderyard`, `brand`
(fire); `gallery2`, `rowhouse`, `sightline`, `barracks` (the line); `drover`, `paddock`, `commons`,
`stockyard` (open ground); `sluice`, `needle`, `sconce`, `vise` (the funnel); `catwalk`, `trestle`,
`skylight`, `overhang` (the drop); `sepulcher`, `reliquary`, `bonewall`, `undercroft` (the niche); and
`sinkhole`, `warren`, `crag`, `deepcut` (the hollow, THE CAVE's own canon, so these carry `g`/`k`).
Nothing about the pools, the width budget or the ground-ordering `tryGenerate` already did had to
change — a template is just one more entry each canon's pool draws from.

**The grass hides a little tighter.** `TUNING.grass.hideR` came down from 2.6 tiles to 2.15.
`hideR` is the *exposed* radius, not a stealth one — how close a man has to stand before his cone can
find you at all, past which grass hides you outright whatever he is facing — so a smaller number is
more hiding, not less: it shrinks the ring you can still be spotted in and grows the one past it where
you never can be.

**THE TRIP off a menu row, not just the address bar.** The LEVELS sheet's own top row is now a toggle,
🍄 THE TRIP, that does not leave the sheet when picked — the same way a SETTINGS row does not — and
with it on, choosing any floor but the first plays that level's trip in its place, exactly what
`#trip` off the address already did for CONTINUE and NEW GAME. The first floor has no trip of its own,
since nothing has found any shrooms yet, so the toggle does nothing to that one row.

---

## 1.47 — Talismans: seventeen more on the mouse's shelves

The mouse's shelf goes from four talismans to twenty-one, built from `ARTIFACTS_TZ.md`. Each has
three tiers that bend its rule, and all of their machinery is one new file, `js/talismans.js`.

- **The wall kills more:** MASON'S MARK (a man breaks on stone at lower speed; crates, racks and at
  III other men count as stone), DOMINO BONE (a thrown man hands the throw on), GRAVEDIGGER'S SPADE
  (bodies stay, trip the living, and from II can be thrown), BUTCHER'S GREASE (a wall kill leaves a
  slick), CARPENTER'S AWL (a crate throws splinters), ECHO HORN (a ghost of the headbutt lands again).
- **Their heads against them:** HORNED MASK (witnesses of a death run), STRAW EFFIGY on Q (a straw
  goat they go for instead; rifles waste rounds on it).
- **Running:** BRASS SPUR, MOTH WOOL, BELLWETHER'S BELL (a thread to the stairs and the vault, then
  the shapes of men through stone), PILGRIM'S SANDAL (into a new room with them on your heels: a
  burst of speed, then cooldowns back, then they lose you in the doorway).
- **Defence that is paid for:** SCAPEGOAT (one death undone, then it is gone), TALLOW SKIN (one blow
  taken, regrown over 5 / 4 / 3 new rooms, or at once by a soul from II), MIRROR SHARD (start a
  headbutt as a blow arrives and it goes back — rounds and bites, then clubs, then everything).
- **Counters:** BLOOD CUP (wall kills fill it; full, a heart; two a level at most), TALLY STICK
  (every fourth or third blow that lands throws twice as hard).

A shelf never holds two of the same sort (`tag`). The tool has a **TALISMANS** tab: all of them
as a table, every param editable and saved back to tuning.js, and a button to wear any tier.

---

## 1.46 — THE TRIP

**A tuft of mushrooms, and a level in place of the next one.** On some levels (`TUNING.shroom.chance`,
from THE YARD, never the last) three small pale caps lie on the floor of an ordinary room, meant to be
walked past. Standing over them eats them (`game.eatShrooms`), and the next level is THE TRIP
(`tripLevel` in `tuning.js`) instead of itself: same length, same soul budget, same gates, vault and
arena places, so it sits in the run where that level would have. A death takes the tuft back like
anything else found inside a level; the run save carries `tripAt`. `#trip` in the address plays
whatever floor LEVELS starts as the trip.

**Every key is the other way round.** `game.tripInput` is what the goat reads for the length of the
level: the stick reversed, the headbutt on the grab button and grab on the headbutt button, the roll
on the voice and the voice on the roll. No key added, none removed; the rail's captions follow. What
it asks of the goat is cut to match: clubmen only, brutes in the rings, `threatMul` of the curve and
three men a room at most, no grating, no trap rooms, no wheel, no drop, no rifles, no hounds.

**It is a cave that is growing.** The rock is furred with glowing mushrooms, the floor has rings of
small ones that are most of the light, the boulders are caps as tall as a man (they break the same
way, in a cloud of spores), and over all of it a wash of colour walks round the hue wheel in soft
light while spores drift up the screen.

**Gems, stalactites and stalagmites in every cave.** Seams of faceted gems that catch the light,
stalactites off the rock face over the floor (dripping, now and then, in THE CAVE), stalagmites up off
the top of the rock. All on stone tiles only, so nothing on the floor looks like it is in the way.

`GEN_RULES.shrooms` and `GEN_RULES.trip` hold the tuft and the trip; `tools/balance.js` runs every rule
over the trip in place of each level it can replace, and prints its threat beside the level's own.

---

## 1.45 — a playtest round: the cave cut through its tiles, a leaping ogre, a hound that runs

**The cave can be cut through the middle of its tiles.** `TUNING.cave.shape` is `'mid'` now (`'round'` is
the 1.43 cave). The rock's edge is marched through a field sampled at tile centres (`World.marchCell`):
stone is 1, floor is 0 up to `midMax`, off a slow noise. Where the noise is low the edge sits on the grid
and a lone stone is a diamond; where it rises the rock bulges up to nearly the middle of the floor tile.
It only ever grows rock into floor, so everything else that reads tiles is unchanged. Collision
(`collideMid`) and the renderer (`drawCaveMid`) read the same march. Two-tile ways, furniture and the
start are left whole.

**A secret's niche is rock until the wall gives.** It was floor from the first frame, one row outside the
room box where the room fog never reaches, so the rack and the grass behind the wall sat under nothing
but the shade. `startLevel` turns the niche to stone in the world's own copy of the grid (`World` no
longer shares `level.tiles`), `game.hidden` hides what is in it, and `crackWall` gives it back.

**The rat ogre leaps.** Out of reach he crouches (`hopwind`), bounds `hop.dist` tiles (`hop`) and comes
down on a ring drawn on the floor from the crouch: the goat is hurt and thrown, a man is struck. A scream
breaks the crouch the way it breaks his swing. And his blow now hurts a man as well as throwing him
(`game.ogreHits`): a heart off him, then thrown as a thrown body that takes down whoever it lands on; a
man with nothing left dies where he stops. A body he threw himself never counts as one thrown at him.

**The hound runs round things.** `Enemy.clearAng` is a whisker: the orbit and the run both take the
nearest heading with floor ahead of it, and the orbit turns back when its side is walled off. The run is
a sprint rather than a blink: 9 tiles a second, from 45% off the crouch, about seven tiles long.

**A rifle does not shoot through his own man at point blank.** Inside `hunter.friendClear` (2) tiles of the
muzzle he lowers it and steps sideways off the line; further out he still never looks. The aim line comes
out of the man himself down the line the round takes, reaches the goat from the first frame and firms up.

**Knocking a man into a drop no longer takes the goat with him.** From the windup to the end of the
recovery the lip holds him like a wall.

**Holding grab and clicking throws.** A second mouse button pressed while the first is down arrives as a
`pointermove`, not a `pointerdown`; it was swallowed. Letting go of grab under the other button was too.

**Tall grass burns.** It is fuel like hay: it stands alight for `grass.burn`, hands the fire on after
`grass.spread`, and is gone once it has burnt out. Each blade chars and carries its own flame, and a patch
alight hides nothing.

---

## 1.44 — a boulder takes a body, and two trap rooms

**A man thrown into a boulder takes a blow off it.** Anything flung into one faster than
`physics.knockHitSpeed` cracks it the way a headbutt does (`crackRock`). Two bodies, or one body and
one head, and it is rubble. At killing speed the man dies on it as before.

**THE THRESHING FLOOR and THE RAFTERS get a trap room each, built to their shape.** `ring` is straw round
a bowl of coals and a lamp on floor wide enough to walk round it. `chasm` is two bands of broken boards
with a two-tile bridge between them and a lane down either wall, the first trap room built round the drop.
They are gated by `needs` (`corridorW`, `windows`) so no other level draws them.

**`tools/balance.js` has a third column: threat over power.** `BOON_POWER` weighs a soul and a heart. The
report prints what the goat is carrying at the head of each level and the ratio. It does not fail on a fall,
because the weights are a guess. Today THE THRESHING FLOOR, THE RAFTERS and THE OSSUARY each ask less of him
than the level before.

The cave's `teeth` room is `fangs` now: the trap room already had that name.

---

## 1.43 — THE CAVE

**An eighth level, under all of it, and nothing in it is square.** The rock is round: every outside
corner of a wall is a quarter circle and every inside corner is filled in by one, in the collision
exactly as it is drawn (`TUNING.cave.roundR`, `World.collideRound`, `Renderer.drawCaveTiles`). A run of
steps in the rock is a curve you slide along rather than a staircase you catch on, and a lone pillar is a
round stone. Every ordinary room has its corners filled back in with rock and a bulge or two grown out
of its walls (`erodeCave`), and five rooms are written for it (THE HOLLOW).

**Tall grass.** You see a step into a patch and no further; what is deep in it and behind it is shade.
A man more than a couple of tiles off does not see a goat standing in it, and some of the cult are lying
in it already — still, faded, only the top of them showing — until something gets them up. A headbutt
cuts it and fire burns it off.

**Boulders.** Two blows and they are rubble; until then they are stone to a body, a bullet and a thrown
crate, a man thrown into one dies on it, and the cult walk round them. Never where they could close the
way through (`GEN_RULES.rocks`).

**The curve** runs 12 → 44, heavier on hounds; `node tools/balance.js` holds it harder than THE OSSUARY.

---

## 1.42 — every kind gets a pattern of its own

**The hound runs a line you can see.** Inside `dog.dashRange` tiles it stops circling and plants for
a second (`dog.windup`) while the run it is about to make is drawn on the floor in red — bent, since
it starts off the side it was circling and turns onto you. Then it runs it at `dashSpeed`, barking
(`sfxBark`), homing at `dashTurn` rad/s, and bites whatever is in front of it. It cannot slip a
headbutt mid-run. The old dart → windup → bite is gone.

**The rifle's round is slower** — 25 → 19 tiles a second, a thing you can step off.

**The clubman's arm is shorter and quicker**: reach 0.96 → 0.8 tiles, windup 0.58 → 0.46.

**The brute has his own arm and a slam.** `TUNING.champion` carries his reach and timings (the
clubman's cut did not touch him), a headbutt moves him `flingMul` 0.55 as far, and close in
`slam.chance` of his blows are the club on the floor: a red ring fills round him and everything in
it is hit and thrown straight out — his own men go over too.

**On fire, the Butcher and the brute come at you.** No running from it: `rage.speed` on the stride and
`rage.tempo` on every windup, swing and recovery while they burn.

**A man with a soul in him is a small boss.** `TUNING.soulBearer`: a heart more than he had, never
carried (THE SOUL HOLDS HIM), and a headbutt moves him 0.6 as far. A row of its own on ENEMIES.

**The wraith can hide.** It may lie in a room as a box or a bowl of milk before you have ever seen
it (`wraith.hide`); headbutt or reach for anything near it, or step onto it, and it comes up and
strikes at once from whatever side you are on.

**The mouse's hole is a hole, not a tunnel.** Nothing is cut into the wall any more: the burrow is a
mark at its foot, she sits on the boards in front of it, and her three offers lie in a row before her.

**Smaller things:** no dust off an ordinary run — only a headbutt, a roll or a landing raise it; the
blood trail only on the last heart and a drop every so often (`goat.bleed`); a kill's blood a shade
smaller (`effects.bloodScale`); and the death screen's map puts a small skull wherever a man went down.

---

## 1.41 — two hard stops a level, a mouse who gives, and rooms that shut behind you

**Every level stops you twice.** `gates` on each level names two rooms — one in the middle, one before
the end — and each is a **rest room**: nobody in it, straw in the corners, the fight was the room
before. Its way on is narrowed to a single tile and barred by a door no blow opens; the bar is the soul
lying in the middle of the floor, and swallowing it lifts that gate and no other. Level one went from one soul to two; every
level now gives two, spent on the gates first, then the vault, then the last bosses. A vault with none
left to give holds the big patch of grass. `GEN_RULES.soulgate`, `budget`.

**The mouse gives instead of sells.** She is on THE YARD, THE THRESHING FLOOR and THE RAFTERS only,
and she stands in the middle gate in place of its soul. Three offers, one to take: two talismans, both
the tier of this visit — tier one, two, three across the run — or three bowls of milk. Reach for one
and it is yours, the rest go back into the wall, and her gate gives; a talisman taken onto a full slot
leaves the old one on the stool to swap back. THE THRESHING FLOOR's curve went up a step (5→12 to 6→13)
to stay ahead of THE ROAD with two quiet rooms. No more prices in the dead. Fourteen souls a run against sixteen boons. `GEN_RULES.shop`.

**And sometimes a fight pays anyway.** On top of the two a level owes you, now and then one of its
bosses is carrying a soul of his own (lit, and on the card), and now and then an ordinary fight room
gives one up when its last man goes down — nothing says which until you have won it
(`soul.bossChance`, `soul.roomChance`).

**Rooms behind you are clamped.** A room two back from the one you are standing in, with nobody alive
left in it, is shut for good: its way out goes back to stone and an iron plate is bolted over the
mouth. The room you just came out of stays open; a room with anybody alive in it stays open until it
is empty. `game.updateClamps`, `GEN_RULES.clamp`.

**Four generator leaks, found by the clamp's rule.** Narrowing a gate room's exit walled up the turn
of its corridor as well, which cut a corridor that turned downward and quietly cost a seed — with two
gates a level, some seeds ran out entirely. A secret's niche could be cut flush against a shaft, a
vault could open onto whatever ran behind it, and THE THRESHING FLOOR's five-wide corridors could turn
down through the next room's wall — each a second way into a room that no gate or seal knew about.

## 1.40 — the mouse in the wall, four talismans, and the rat ogre

**A shop, and it speaks the game's own language.** From THE YARD on, one room in the middle stretch
of every level has a three-tile hole cut into its top or bottom wall (`carveHole`, the secret's cut
with the wall left out) with a mouse sat in it and a ware on a stool either side of her — a real
low burrow with a dirt rim, not a doorway, and she sits a step to the side of it rather than
blocking her own hole. Walk up to a ware and it says what it does, over the thing itself, before
you spend anything on it. Grab is buy: reach for a ware with enough of the level's dead behind you
(`game.kills`, less what you have already spent) and it hangs at his neck at once; short, and she
says how many more. A headbutt is rude: the first blow she asks you not to, the second she warns
you, and the third she is the **rat ogre** — coming through the wall itself, not the hole, because
a body that size never fit through what she left behind — and the shelf locks until he is down;
kill him and it is free. Prices are a share of the level's own head count per tier
(`TUNING.shop.priceShare`), and the second ware is a tier under the first, so there is always
something cheaper beside the thing worth saving for. The kills that pay for it are reset with the
level, so a death takes back what it bought inside the level along with the level (`levelArtifact`,
the same rule the souls keep). `GEN_RULES.shop`.

**Four talismans, one slot, three tiers each, drawn on him.** `ARTIFACTS` in `tuning.js`; the slot
is right of the hearts and the thing itself hangs on a cord at the goat's neck on every facing
(`PaintedArt.collar`). A tier is how far the rule bends, not a bigger number. Two of the four are
body work and touch no button: FIRE AMULET (a burning man lights the next, KINDLING's own rule —
then the next lights one more — then the room) and LUCKY CLOVER (the NEXT floor hides more:
secrets, racks, grass, and at the higher tiers extra milk, through `generateLevel`'s new
`opts.luck`). The other two are a verb, and rather than reskin grab or the roll they share a fifth
key that plainly does not exist until one of them is worn: **Q**. BOOMERANG throws on Q, the men it
meets reel, it comes home; more men, further, sooner up the tiers. STRANGE SYMBOLS is a step
through nowhere on Q, three tiles then four and a half then six, and the top tier leaves whoever
stood where you left reeling. `firePass` in `mods` is a depth now rather than a flag, and KINDLING
sets it to one.

**The rat ogre is dear on purpose.** Six hearts, and the horns do nothing to him standing: he is
never flung, so no wall ever kills him, he does not burn (witchfire included), and a scream, the
boomerang or a tumble only break the swing he was winding up. What lands is a blow while he is
DOWN — a crate or a shield in the face floors him, and every horn in that window is a heart — a
blade thrown or carried, a bullet, a body thrown into him at killing speed, the wheel and the bomb.
He takes each hit standing (a beat of stagger, never floored by it), so one crate is one heart and
not six. He swings at whoever is nearest him that he can see, the goat or a man of the cult, and
the cult goes for you and not him: the way to spend him is to walk him into a full room. He walks
round every trap. He is not on the curve and drops no soul. KILLED BY THE RAT OGRE.

---

## 1.39 — rooms above and below, a crowd that does not stand on itself, less juice, and seven bugs

**Not every door is in the right-hand wall.** From level two on, a room is now and then hung above or
below the one before it and reached by a shaft out of its top or bottom wall (`levelDef.stack`, 22%
on THE YARD up to 35% from THE BRIDGE on; one in a row at most). A level used to be "run for the right
edge of the screen" every time. The chain's drift is pulled toward the middle of the world so it no
longer runs flat along the top edge. `GEN_RULES.stack` holds it.

**A late room's crowd was thrown on the floor.** Levels four to seven buy up to nine men into rooms
whose templates mark about four places to stand, and the rest went on the first floor tile the dice
hit: about three pairs of men on one spot per level, men inside crates, and 18% of all men within four
tiles of the door you walk in by. The spare men are placed by score now — clear of each other, of the
furniture and of the door. Overlaps went from ~3 a level to none, and men at the door from 18% to 11%
(what is left is the templates' own marks). `GEN_RULES.spacing` holds it.

**Less juice.** Two master dials, `juice.screen` 0.6 on every shake, kick, lens punch and flash, and
`juice.stop` 0.7 on every hitstop; the ring, sparks, dust and squash that 1.37 added are all smaller.

**Bugs.**
- Most noises were never heard: the list was cleared at the end of the step, after the crate, the
  bomb, the grating, the mill and every man's own shot had emitted theirs. A bomb going off in a room
  of idle men turned nobody's head.
- A two-heart man knocked down while in your mouth stayed in it and got his AI back — a mage painting
  at your feet, a clubman swinging at you point-blank.
- Backspace restarted on the same seed, so a level could be scouted and replayed; from the clear card
  it banked the level's kills and score a second time. It counts as a death now and only works in play.
- Escape on the clear card went to the title and lost the level just won.
- N cleared the level in the published build. It is a dev key now.
- Falling with a crate, a hen or a bomb in your mouth played the steel sound and said SPLINTERED.
- The hound and hen lines repeated every level; the clock-door and mist lines only came once a page
  load. All four are once a run now.

---

## 1.38 — a rarer, real crocodile, two souls cut down, a brute too big to carry, and what killed you

**The roast is a find.** At most one a level, and about one level in four has one (`brazier.roast`
0.3 → 0.02, capped in `gen.js`). The crocodile is drawn as the animal now — dark olive hide, rows of
armour, a long flat snout with its teeth showing, legs hanging and the belly charred — rather than a
bright green patch with a white border, which read as a shirt logo.

**LONG HORNS and SURE HOOVES, 30% off the bonus.** Reach 1.55 → 1.38, throw 1.35 → 1.25, speed
1.18 → 1.13. Both were the pick every run.

**The brute cannot be taken in the teeth.** Like the Butcher, he is put down by the room; reaching for
either with BY THE COLLAR says TOO BIG.

**The death card names what did it.** `Goat.damage` carries a source, and the last line of the card
reads KILLED BY A CLUBMAN / THE BUTCHER / FIRE / THE WHEEL / THE DROP… where it used to say click
to try again.

---

## 1.37 — juice, a JUICE tab, a door that gives from the side, and a roast

**The door by the wall.** A headbutt thrown with the goat's nose already against stone bonked and
ended the lunge on its first frame, before the hit check ever ran — so the vault's iron door, hung in a
one-tile gap in a wall, only took a blow from dead centre and nothing from beside its ends. The blow
now lands before the bonk, and a door reaches a little further (`door.reachSlack`) from a wider cone.

**New juice.** A white silhouette hit flash on every man a headbutt lands on; an impact ring and spark
streaks at the point of contact; a pale shockwave off every kill; hoof dust on the lunge, the roll, the
landing and a full run-up; a squash spring on the goat when a blow lands, when he is hit and when a
roll ends; a muzzle flash on every rifle shot; and on the last heart the edge of the screen beats and
the heart on the HUD throbs with it. All of it under `TUNING.juice`.

**The JUICE tab.** A new tab in the level tool (`#juice`): 41 effects — in game, new, and backlog —
each with its trigger, how it looks, its size and time read live off TUNING, where it lives in the
code, where the idea comes from (Vlambeer's *Art of Screenshake*, *Juice it or lose it*, Swink, GMTK)
and how to build it in Godot 4. EXPORT downloads it as Markdown; `node tools/juice-md.js` writes
`JUICE.md`.

**The roast.** About a third of the braziers are now a campfire with a crocodile turning on a spit,
drawn in the style of an embroidered patch. It is a brazier in every way that plays.

---

## 1.36 — a heavier Butcher, a wraith the world cannot touch, and an opening scene with an arc

**Footstep noise was a coin flip, not a clock.** `Math.random() < dt * 4` could go a half-second
without landing, which let a run right up on somebody's back read as luck rather than as noise; it is
a timer now (`Goat.stepNoiseTimer`, `TUNING.noise.footstepGap`), the same shape as the goat's own
hoofprint clock, so running for any real stretch always says so. `noise.footstep`'s own radius came
up a tile (2 → 3) with it, so the warning is not only heard once you are already close enough to touch him.

**The Butcher was reading as a bigger clubman rather than as a heavier one.** A fourth heart, a reach
up a fifth (1.08 → 1.35 tiles, so he finally out-reaches the man he is twice the width of), and a
charge that asks for less ground (`chargeMin` 4 → 3 tiles) and comes back sooner (`chargeCooldown`
2.5s → 1.7s) — the read on him was that the charge almost never happened, and when it did the room
was over before he could line up a second one.

**Immunity is a checkbox now, per kind, on the ENEMIES tab.** `TUNING.<kind>.immune` holds whichever
of `fire` / `stun` / `grab` / `blunder` a kind does not answer to, read live by `Enemy.ignite`, `daze`
and `Goat.tryGrab`'s BY THE COLLAR filter — the same write-through every other dial in the tool
already has. The wraith carries all three of the first: a dead thing does not catch from an ordinary
hearth (witchfire still finds it — that is a Seer's doing), does not lose its head to a scream (`daze`
used to freeze its manifest sequence in place, which was a workaround for not having this at all), and
BY THE COLLAR already had nothing to close on. The Butcher and the hound carry `blunder`: fire used to
take every kind's AI and send it wandering at random for the length of the burn (`ignite` forced
`state = 'burning'`, which the per-kind `update` has no branch for), and a boss who lost the fight to
his own bad footing while alight read as the flame doing the room's work rather than the goat. Marked
immune to it, `ignite` leaves `state` alone, so the per-kind `update` keeps dispatching normally — he
still bleeds hearts for the fire, he just does not lose the fight to it.

**Milk went back to being grass.** The ordinary heal a level hands out on its own rhythm was a plain
wooden bowl for a few versions; a bowl standing on a floor of boards read as furniture rather than as
a thing that heals. `Renderer.drawProp` paints it as a smaller sprout of the same grass the rarer,
bigger secret-wall patch already is — size and a patch of dirt are what tell the two apart now, not
the plant. The `+1` / `+2` heart split behind a secret wall is unchanged.

**The opening scene has a mood now.** `roomMusicScene` returns empty the instant `game.state !== 'play'`,
which left the whole prologue and the pen scene sitting on flat `idle` from the first frame to the
last — nothing built. `INTRO_STAGE` (`js/audio.js`) reads `game.intro.phase` onto the same
idle/spotted/chase/combat ladder a run's own encounters climb: the meadow stays idle and is the one
phase that borrows the ordinary theme instead of the frightened `FIRST_MUSIC` (nothing has gone wrong
yet), the truck is spotted, the dark is chase, and the men closing in through the moment she is taken
climb to combat on the blow itself. See `MUSIC.md`.

**The meadow opens on black.** `TUNING.intro.prologue.titleCard` seconds of SOME TIME AGO over a
fading veil, so the one screen in the game that opens on nothing reads as a memory starting rather
than as the game itself starting somewhere strange.

---

## 1.35 — poison, three reactions between statuses, and a build with slots

**Poison** is a new status (`js/status.js`, numbers in `TUNING.status`). A poisoned man is **blind** —
a rifle cannot aim and a mage cannot paint, held or standing — and **slow**: his stride is `moveMul`
and his own clock (windup, swing, recovery, reload) runs at `tempo`. It shows as a green film over
his eyes and bubbles coming off him. The goat is never poisoned: every source of it is his.

**Where two statuses meet, they react**, in either order:
- POISON + FIRE — **it goes off**: a small green blast, a hit inside `blast.hitR`, a throw out to
  `blast.radius`, the goat shoved and never hurt. A flame reaching a puddle does the same.
- POISON + STUN — **sting**: one hit, and both statuses are spent.
- STUN + FIRE — **scald**: the fire does two hits instead of one (a Seer lit while dazed stays down).

**Five new actives**, one on each button plus a second on grab:
- 💦 SPLASH (butt) — lowering the head poisons whoever is right behind the goat.
- 🐍 VENOM JAW (grab) — held two seconds, a man or a thing leaves the mouth dripping: poison all the
  way down its flight and a 3×3 puddle where it stops.
- ⚡ CHARGED (grab) — held two seconds, it is charged and goes off where it lands.
- 🦠 SOUR TUMBLE (roll) — every roll ends in a 3×3 puddle.
- 🫧 VENOM SPIT (scream) — a glob along the pointer that bursts into a 3×3 puddle.

A ring closes round whatever is in his mouth while the two seconds run.

**A build has slots now** (`BOON_SLOTS`): one active a button, two passives under it, and four body
passives that belong to no button. No card is dealt for a full slot. BY THE COLLAR is a `key` — it
opens half a verb rather than bending it — and counts against nothing, so DEVOUR is still reachable.

**The body passives have a place on the HUD**: a square of four cells left of the skill rail, empty
cells drawn so the cap reads. The pointer on one brings up its note. A body card says BODY where a
verb's card shows its key.

**The tool has a STATUS tab** (`#status`): the three statuses, the reaction matrix and where poison
comes from, every number editable.

---

## 1.34 — eleven playtest fixes: a sword that cuts, a hen that follows, men who wait for the screen

The death card says **DIED** rather than THE GOAT DIED, and names the level (`LEVEL 2 · THE YARD`):
a death is where somebody puts the game down, and the next time they pick it up the one thing they
will not remember is how far in they were.

**The shield is bigger** — `prop.weapon.shieldScale` draws it 1.45× on the rack and in the mouth,
painted or primitive — and it covers more to match (`coverR` 30 → 38, `coverArc` 2.5 → 3.0). A bigger
shield that stopped the same arc would have been a lie.

**The sword is two lives now**, like the shield: two men, or a man and a wall. A thrown blade that
hits stone drops there NOTCHED rather than snapping outright. And it **cuts while it is still in the
teeth** — `Goat.cutWith` kills whoever the blade touches, spending a life each time, `cutGap` apart.
That makes it the strongest thing in a room, so it is rarer: a loose or secret stand is a sword
`swordShare` (30%) of the time, and a lone template stand is the shield. The ambush room still
always hands you the sword.

**A rifle cocks before he fires.** `sfxCock` — two dry clicks — plays the moment a hunter starts to
aim, loud up close and gone at `hunter.cockHear` tiles, never from a room the fog is hiding. It is
the one tell a rifle gives and it is given by ear. The bestiary row has a HEAR COCK button.
**Point blank he flinches**: inside `hunter.wildNear` (2) tiles, `wildChance` (half) of his shots go
off by `wildSpread` to twice that. Both are in the bestiary note and editable there.

**A hound reached for BY THE COLLAR springs back a tile** (`dog.hop` over `dog.hopTime`) and the
grab is spent as if something had been thrown. It used to close on nothing.

**Men wake when they reach the screen.** An enemy is `woke` the first frame he stands within
`ai.wake` tiles of the edge of the view, and until then he is not simulated at all — no hearing, no
walking, no shooting. Once woke he lives normally, so a chase that runs off the side of the picture
keeps running. A throw, a fire or a mouth also wakes him. Before, a man in a room wider than the
screen could hear, close and shoot from somewhere the player had never seen him.

**The touch controls no longer vanish.** Any `keydown` switched the game to keyboard mode, and a
phone's volume rocker is a keydown — turning the sound down a few seconds in took the controls away
for good. Only real playing keys (`KEYBOARD_KEY`) do that now. On a touch-first device (`coarse`)
every pointer is treated as a finger too, because some phone browsers report a tap as `mouse`.

**Nobody spawns inside a crate.** A spawn marker and a crate scattered later could share a tile, and
the man stood wedged in the box the whole level. The generator now walks any such spawn out to the
nearest clear floor of his room (`inFurniture`), and `GEN_RULES.furniture` holds it.

**The hen** walks the flow field the men chase on instead of a straight line, so she follows through
doorways and round walls rather than stopping at the first one; she steers round anything
`hazardAt` calls a hazard, and keeps a chosen detour for `detourFor` so she does not dither on the lip
of a fire. **A coop you walk past breaks on its own** as it slides off the trailing edge of the screen
— SHE BROKE OUT. And **a hen that reaches the stairs with you** (inside `saveR` tiles, or in your
mouth) is a card — THE HEN CAME WITH YOU — and `saveHearts` extra max heart for the rest of the run,
once a level. It is `game.henHearts`, saved with the run.

**THE ORACLE no longer sees everything.** It lit the whole 26-tile fog radius through stone; now it
lights `fog.oracle` (11) tiles through walls and the ordinary shadowcast decides past that, so the far
corners of the screen stay dark.

---

## 1.33 — detection, chase and combat music, and a second round of playtest fixes

Level 1 gains a frightened, uncertain variation with its own idle/spotted/chase/combat motifs.
Level completion gets a two-bar rising phrase, death a three-bar descending lament, and collecting
a soul a two-bar luminous chime. All three briefly take over the score and have audition buttons,
named score tracks and exported note data in MUSIC. Their lifecycle follows the actual game events.

Both level groups now move from idle through a two-bar detection phrase into chase or active combat.
Running/rolling keeps the chase; headbutts, throws and screams bring in the harder combat arrangement.
The score relaxes as attacks and threats subside. Heavy enemies retain their sub bass and gain
octave harmonics that reach smaller speakers. Mills are counted as 0–2 with three/six accents.

MUSIC now auditions all four states. Repeated mixed action taps get separate rhythmic slots and a
visible queue. MIX shows register notes and MIDI numbers; SCORE shows the complete sixteen-bar
arrangement with per-track/per-bar notes and instruments. EXPORT provides its exact note/synth data
as JSON for transcription in FL Studio. Existing volume settings and the legacy score are preserved.

A chaser could cross several rooms with the goat and go stiff mid-stride: the two-room freeze and
the fog's own room-reveal freeze both asked `e.room`, wherever a man was *spawned*, rather than
wherever he actually stood, and a chase is explicitly let off that leash. Both now ask `roomAt` of
his real position every step; `e.room` itself is untouched; the sealed-room and soul-gate bookkeeping
still needs it to mean "who he was put with."

Being spotted at range no longer closes the distance in the same frame it happens: past
`ai.noticeNear` tiles a man plants for a beat that grows with distance (`ai.noticeMin` up close,
out to `ai.noticeMax`) before he moves — a shape far off is a beat of doubt, not an instant snap,
except right on top of him, where there is none to have. The Mill lesson's own fixed stare
(`noticeFor`) still wins outright where it is set. Chasing men are noisier now too: `ai.chaseNoise`
makes them audible on the move, the same as running is, so a bystander who never saw the chase can
still hear it go by and join in.

The pickable bomb's fuse now starts the moment it is in the goat's mouth, not the moment it leaves
it — high risk, high reward, since carrying one no longer buys free time to find a target. Its blast
comes down from a 4×4 patch to 3×3.

Milk splits in two. The ordinary bowl a level hands out on its own rhythm is milk again — a plain
wooden bowl, drawn as one — and worth the same heart it always was. The rarer, bigger patch of grass
now lives only behind a secret wall, and only `secret.healChance` of the time a secret is found at
all; it is worth two hearts instead of one, since going out of the way for a wall that gives is what
pays for the extra.

A headbutt aimed at a door away from its exact centre used to miss the door entirely: the hit test
still measured against the door's centre point as a plain circle, the same one `collideEntities` was
fixed to stop doing for the goat simply walking into it. It now measures against the same rectangle,
so a swing anywhere along a door's actual span connects.

The dodge-and-parry floor text is a hard preference now rather than a tiebreaker: it walks back from
the level's own first arena looking for anywhere to land — a small crowd first, a single man second
— and only falls back to "closest to the level's middle" once there is truly nothing populated left
between the pen and that door. It used to lose to that fallback outright the moment the one room
right before the arena happened to hold nobody, which could land the line on the far side of the
level's first real fight instead of before it.

## 1.32 — a pause that holds the room, individual rhythms, and a round of playtest fixes

Escape mid-level now pauses in place instead of dropping to the title: RESUME is the goat standing
exactly where Escape caught him, the room exactly as it was, not a freshly generated level from its
own head. QUIT TO TITLE is the old behaviour for anyone who actually means to leave. SETTINGS gained
two sliders, MUSIC VOLUME and EFFECT VOLUME, both starting at the mix already tuned and adjustable
either side of it; combat's own base volume also came down a fifth.

A room the goat has not opened yet no longer goes on patrolling behind the fog: an enemy freezes
until the room he is standing in is actually seen, so nothing dies to a pit or the Mill before the
door to it has even been touched. A flung body — and a charging Butcher — that hits a door refusing
to break (the soul gate, a sealed arena, an iron door still short of its count) now stops on it
instead of clipping straight through; the same charge no longer commits to a line a pillar was
always going to break it on, and it shatters a crate in its way rather than walking through or into
it. The bomb moves out of the secret niche it usually had nothing near it in and into whichever
ordinary room of the level scored the most threat. Milk from level 4 on caps its worst dry spell at
four rooms rather than five. The bare bleat's point-blank interrupt comes down to a flat two tiles.

A kill combo shakes the camera a third as hard from the second kill on, and taking a hit reddens the
corners of the screen for a beat on top of the arc that already points back at what hit you. The
Hunter and the Seer each get a guaranteed line — NOT ME, WHO DID IT? — when their own shot or their
own fire catches one of their own, rather than leaving it to `panic`'s ordinary roll.

Bearers/hounds and Hunters/Seers now share registers but have different rhythms and envelopes.
Hit budgets for 1/2/3 enemies are 1/2/3 for small enemies, 2/4/5 for ranged and 3/5/7 for heavies.
Spike plates and Mills add a distinct trap instrument. Fire is sensed across the current room,
with stronger crackles, two bars of memory and an intensity lift for a broad blaze.

Kills and actual player actions retain immediate effects and also queue a separate musical reply
about 1-2 seconds later on a half-bar boundary. Event stacking and queue length are bounded.
TOOLS > MUSIC (also #music) auditions all types at counts 0-6, solo/mixed with either base,
both level themes, fire/grass and event echoes. It pauses gameplay and cancels preview notes on exit.
See MUSIC.md and the audio checks for pattern, sensing, timing, headroom and UI validation.

## 1.31 — music made from the room, and a fire that was too eager to catch

Follow-up after listening: each heavy now plays a two-hit bass signature, with a quieter eighth-note
reply. Levels 1–4 retain the first bed; levels 5+ have a new progression and distinct idle/combat
melodies, with the enemy voices following their harmony. Standing coals/lamps give one tick per bar;
actual burning area adds denser crackles and keeps a two-bar memory after it disappears. Nearby
healing grass adds soft harmonic chimes and a one-bar tail. Checks count the actual emitted notes
for every enemy family at 1–6 enemies, so density changes are verified in the audible score.

Exploration and combat keep the old harmonic bed, with a simpler combat rhythm making room for
four additive enemy families: small, ranged, large and mystical. Each enemy enables another
interlocking synth voice, capped at six per family; nearby fire adds one quiet texture. The parts
share a 16-bar phrase, react on the beat and fade instead of restarting when the room changes.
Dense rooms reduce layer gain to leave headroom for the original game sounds.

The original arrangement is preserved as a working fallback: turn SETTINGS → LAYERED MUSIC off.
The browser remembers the choice. `MUSIC.md` records the design, mappings and extension points;
`tools/audio-check.js` and the optional browser check cover the new behaviour and fallback.

`TUNING.fire.spread` — how long a burning tile sits before it catches the hay next to it — is 0.48s
now rather than 0.4s, a fifth slower: a room catching alight read as too eager to finish itself off.

## 1.30 — a corner that stopped pretending to be a straight wall, and the bomb that was only ever talked about

A look at what 1.29 shipped, three lines.

The near-wall fix from 1.29 went too far: it widened the brick band on *every* tile the near face
draws on, so a pillar or a boxed-in corner — a wall that is meant to read as a closed block, not a
run — picked up the same deep coursing a plain stretch of wall now gets, which is what "you still
did the walls wrong" was about. `nearFaceDepth` (`painted-art.js`) now checks the tile's own E/W
bits first: widen only where the near face is the one thing exposed there, and fall back to the
old, shallow `lip` the moment a corner is sharing the tile.

The death screen's unopened rooms used to paint fully opaque, in the level's own near-black fog —
since a corridor between two rooms is never hidden (unlike a room, which only opens once you have
stood in or seen it), the practical result was corridor stubs floating in black gaps where the
actual, larger rooms were, which is a second reading of "the map flew apart" 1.29 did not catch.
`drawUnseen` dims to 0.6 alpha instead, but only when `game.state === 'dead'` — ordinary play is
untouched, since the fog there is doing a real job and not just being looked at.

And the rare pickable bomb — asked for on the 14th, described down to its falloff, never actually
built — exists now. `kind === 'bomb'`: grabbed and thrown exactly like a crate, armed the moment it
first leaves the goat's mouth rather than breaking on the first thing it hits, and going off
wherever its fuse runs out with the same two-heart/one-heart falloff the goat's own headbutted-bomb
charge already uses. It lives in a secret's own niche, in the slot a stand of arms would otherwise
take, which is what keeps it to about one or two a level without a count of its own — and since it
has no painted asset, it draws as a plain dark shell with a fuse that shortens and sparks faster as
it runs out.

## 1.29 — the death screen fit to the level rather than the world, and a door you can walk up to

Eleven lines from a playtest, one burst.

The death screen's level map used to fit itself to the world **buffer** (`lvl.W`/`H`, a fixed
420×78 tiles regardless of the level) rather than to the rooms actually carved into it — a
ten-room run barely dents that buffer, so it read as a huddle of disconnected rooms adrift in a
lot of unexplained black. `onGoatDied` now fits the death camera to the bounding box of
`lvl.rooms` instead, and the card names how many were killed alongside what was kept.

A door could not be walked up to: `Prop.r` (29, tuned to cover its span across the two-tile gap
it hangs in) was being used as a plain circle for the goat/enemy push-out as well, which stops
anyone 29px from the door's *centre* in every direction — including straight at its 13px-thick
face, a whole extra tile short of the actual slab. `collideEntities` finds the closest point on
the door's real rectangle now (`TUNING.prop.door.thick`, new); the span it was already tuned to
cover is untouched, and a fast body landing dead centre in the thin slab in one step gets the same
axis-of-least-penetration rescue `world.js`'s wall collision already has.

A room's near (bottom) wall read as a flat panel rather than brick: `PaintedArt.wallTile`'s near
face tied its own visible depth to its own presence bit, capping it at the 40px junction lip meant
for corners on *every* tile, straight run or not. It gets a much deeper face now when there is no
corner to leave room for; a real corner still narrows exactly as before.

Level one's secret walls wait until after the first arena now (`levelDef.secretsAfterBoss`) — a
wall that gives was showing up before a run had any reason to go looking for one. The roll's own
floor text prefers the room right outside a level's first arena, when that room qualifies, over
"closest to the level's middle". A fourth choice, RELEASE THE SOUL, sits apart from the three boon
cards for whenever none of them are worth the soul. `LEFT CLICK, HEADBUTT` is `LEFT CLICK -
HEADBUTT` everywhere it is drawn, matching the hyphen the ambush room's lines already use. The
skill rail's captions moved another 5px clear of the kill count under them.

A report that the Mill lesson's nearer bearer ran past the wheel untouched was not reproduced —
three fresh seeds, goat left standing at the room's own door, the `trapSense: 0` bearer took the
arm and died every time. Left open in `BACKLOG.md` with what would narrow it down.

## 1.28 — a softer fourth level, a quieter cult, and a death screen that shows you the level

Playtest feedback, six lines.

Every enemy kind takes a tenth longer over every windup, swing, recovery, cast and reload:
`BOON_BASE.enemySlow` (read at every one of those use sites in `enemies.js`, the same dial EASY MODE
already turns to 1.4) moves from 1 to 1.1 for an ordinary run, so the whole cult is a tenth slower to
land a blow without a single per-kind number changing.

THE THRESHING FLOOR (level four) is a room shorter (14 → 13, the room nothing pointed at) and its
threat curve gives up a step on both ends — `from` 6 → 5, `to` 13.2 → 12 — after a playtest flagged
it as the hardest floor in the run for what is only level four; it also picks up a fourth bowl of
milk. THE BRIDGE, THE RAFTERS and THE OSSUARY are each a room shorter too (16 → 15), the one room at
the tail of each that no arena, mill, hall, gallery, killbox or vault index ever pointed at, so every
set piece in all four levels sits at exactly the room index it always did. `node tools/balance.js`
holds on every level after the cut.

Dying no longer just freezes on the spot: the camera holds where he went down for half a second and
then pulls back over `deathCam.zoomTime` seconds to the whole level, margin clear on every side —
bloodied rooms he opened lit the way they always are, rooms he never reached still under
`drawUnseen`'s fog, since `drawShade`'s own per-tile vision froze with him and would otherwise have
dragged his last few tiles of sight out across a level-wide view. `game.pathTrail`, a dot on a clock
rather than every step, draws as a plain line under it once the pull-back gets there — a dot where
the run began, a cross where it ended. `restartLevel` already regenerated the level on every death
(`deaths` has been in the seed hash since the sixth sitting); this only gives you something to look
at while that promise is being kept.

## 1.27 — the Mill lesson rebuilt, a bomb charge that respects a second heart, and a goat for a cursor

Nine lines from a playtest, screenshots on most of them, all shipped same sitting.

The Mill lesson room (level one) is three tiles shorter: the hub now sits one row off the top wall
instead of three, so the arm's own sweep reaches that wall outright rather than leaving a second safe
lane nobody needed, and of the three rows left below the hub only the last one sits outside its reach —
exactly one lane of clear floor, which is what the room was always supposed to leave. Its two men also
get a short, scoped beat (`Enemy.noticeFor`, set only on them) to plant and face the goat before either
one moves, so the one who is about to take the wheel in the chest reads as the room deciding rather than
a coin flip landed before the door was even open. Nobody else in the game gets this — every other man
still closes the instant he sees you.

Bomb Charge no longer skips the two-hit rule: `die()`'s absorb used to exclude `'boom'` outright, so the
explosion killed a two-heart target regardless of his own hearts. It is an ordinary hit now — a first
charge floors a multi-hit target down to his last heart, and a second charge (or any other blow) landed
while he is already there is what actually finishes him. The headbutt that lights a fresh fuse also
resets `exploded`, which is what lets a second charge go off at all. The burst itself is smaller and
quicker too — a separate visual scale and duration on top of the same real blast radius, so the AOE and
the damage are untouched and only the graphic covering the fight behind it shrank.

An idle patrol's random turn used to have nothing checking what was in that direction, so a man could
end up facing a wall and simply standing there looking at it. `idleWander` now resamples the facing
against a short look-ahead probe before committing to it.

Nothing simulates two rooms away from the goat any more: the enemy update loop skips anyone whose home
room is two or more rooms off by index, using room order as a cheap stand-in for distance since the
generator already chains rooms in one line. It never touches the room the goat is in or its immediate
neighbour, which stays comfortably wider than any noise radius in the game — so "a man still hears you
through stone" is never something this quietly breaks.

The OS cursor is the goat's own head now (an inline SVG data URI) rather than a plain crosshair,
everywhere except while he is holding something, which stays the native `grabbing` hand. A spike grate's
metal rail and slot highlight are a shade brighter, so a band of them still reads as iron rather than
floor shadow by the time it runs off into the part of a room the fog hasn't lit yet. And the ambush
room's floor text is shorter — `RIGHT CLICK - GRAB` / `RELEASE - THROW` in place of the old two-line,
two-clause version — with the skill rail's own key captions nudged a few pixels further from their
icons so they stop crowding the kill count under them.

## 1.26 — four wall facings and combat effects (local build)

Every level now assembles walls from exposed north/east/south/west faces, with 16
cached junction variants per palette. Side walls, lower walls, corners, pillars and
secret panels share the same assembly. Door placement and opening behavior are unchanged.

Ordinary deaths leave a falling painted body; devouring and explosions scatter pieces
of the victim's sprite. Burning leaves a charred body, wraiths disperse, and falls leave
no corpse or blood. Fragments rotate, bounce off stone and settle on the floor.
Wooden doors and crates shed splinters; iron doors shed metal. Ground debris persists.

An eight-frame painted atlas supplies ordinary fire, witchfire, explosions and blood
bursts. Blood and scorch marks use bounded, sparse full-resolution canvases rather than
the low-resolution ritual-decal layer. Effect pools reset per level and have hard caps.
Both HTML entry points include the embedded atlas and effects code.

Validation: `tools/check-art.cjs` renders all seven palettes and all 16 masks, exercises
real death/break/explosion hooks, checks settling, clean falls, caps and level resets,
and saves screenshots under `tools/shots/`.

**Three corrections from the first look at it live**, all still inside 1.26 since it had not
shipped: a dying butcher or elite bearer tore into plain clubman gore, because `CombatFX.snapshot`
kept its own shorter kind-to-sprite map instead of `PaintedArt.characterKey` — one map now, read
from the one place. The near wall of a room (the one facing the camera) read as bare rock while
the far wall showed clean brick coursing; both faces were geometrically the same, but the near
face's own shading overlay (0.27 alpha, against the far face's zero) was dark enough to crush the
coursing into flat shadow — brought down to 0.1 (and the side faces eased to match) so it reads
as the same wall. And a hunter's aim tell — the dashed line that grows across his windup before
he fires — used to live only inside the primitive fallback body (`drawCultist`); once the painted
sprite took over hunters it silently stopped drawing, so a rifle read as a hitscan. It is its own
method now, called for either body.

## 1.25 — a patrol that stays in its own room, and a wall that finally looks like one

Twenty notes off one long playtest, most of them small and several of them the same complaint
from a different angle: the level was showing things it did not mean to.

**A patrol keeps to its own room.** `Enemy.home` is where he was put, and idling now leashes him
to `TUNING.ai.leash` tiles of it — past that the next wander beat walks him home instead of
picking a new direction. He used to wander freely inside whatever room he was in, which in a
room with a door meant wandering out of it: an escort from a crowded room turning up alone next
door, or the two men the ambush and the first trap room stand deliberately at the far end
drifting toward the goat before he had done anything to earn it. Chasing and investigating are
untouched — a man answering a sound or a sighting was never the problem.

**The secret wall matched its own room until you looked closely.** The crackable wall used a
dedicated stone-block art tinted to the room's colour, which read as a different, flatter
material next to the actual brick course either side of it — so the crack drawn over it looked
like it was sitting on bare floor rather than in a wall. It now draws the exact same wall stamp
an ordinary tile there gets (coping band included, on a wall carved from the top of its room),
so nothing gives it away before the crack does. A room's own side walls also mirror that stamp
across their own centre now, so the brick reads as facing into the room from both sides instead
of the same unmirrored tile pointing one way everywhere it is stamped.

**Every character stood noticeably clear of his own shadow.** Measured off the actual sprite
sheets rather than guessed: the walk-cycle art (goat, clubman, hound, mage) sits close to the
full height of its cell, feet near the very bottom edge, while the newer static "Facing" sheets
(brute, butcher, hunter, wraith, chicken) sit smaller and more centred in the same cell. One
shared anchor number was tuned for neither, and a leftover manual nudge on top of it pushed the
walk-cycle cast higher still. Both are gone in favour of two measured anchors, and everyone's
feet now sit where the shadow actually is.

**A blade or a shield now takes a deliberate press to pick up.** It used to come into his mouth
by itself the moment he walked near one, no button pressed — which read as arming him whether he
meant to or not, especially the moment a headbutt sent him stumbling past a rack. Grab already
picks up a crate or a man this way; a weapon now goes through the identical press-and-reach, and
lets go the identical way, release or another press of grab.

**The lesson room's far wall was a walk away rather than a step.** Ten tiles of floor between
the door and the far wall meant the first man of a run did not always die to the one headbutt he
is there to teach; nine tiles closes that gap without touching the room's depth. The ambush room
now racks two swords side by side rather than one, so a missed first throw is not the end of the
room's idea, and lost the line about BAAH from its own floor text — a throwing lesson does not
need a third verb painted across it.

**A burning man no longer lights the next one for free.** `passFire` used to run for anyone
already alight; it now waits on a new passive, KINDLING, so a brazier costs a room the one man
who found it until that soul is spent. A thrown crate that lands square on a brazier now bursts
into flame the way one landing in an already-burning tile always did, rather than just breaking
against it like any other piece of furniture.

**Smaller things in the same batch:** the WASD hint now waits for the cage to break, taking over
the exact spot the headbutt prompt was painting rather than sitting on screen the whole time;
BOMB CHARGE's explosion shakes the camera a little less; the boon-choice screen lost its two
lines of caption (the cards say what they do on their own) and gained a highlight on whichever
card the pointer is actually over; the acquired-boons list under SACRIFICED is gone, since
hovering a chip on the rail already says the same thing; and every line of prose an em dash was
holding together, in every piece of text a player (or the dev tool) can actually read, now reads
some other way — a comma, a colon, a full stop, or nothing at all.

---

## 1.24 — a bestiary and an upgrades editor, and a patrol that stopped shrugging at spikes

**A patrol is not a chase.** `avoidHazard`'s trap-check roll — the one that lets a man in a
crowd occasionally misread the Mill and ride it into a wall — used to run for anybody near a
hazard, wandering or chasing alike. A man merely pacing a room has nothing rattling him into
misreading his own floor, and re-rolling every `rollGap` while he paced past the same grate for
a full minute meant he found it eventually no matter how good his own trap sense was, which
read as broken rather than as a mistake. The roll is now gated on `aware`: a chasing, rattled
man can still blunder exactly as before, a patrolling one always routes clean around it.

**Every boon carries its own glyph now**, on the pick-one-of-three cards (bigger, beside the
name), in the rail's hover note and acquired-boons list, and as a small in-place icon on the
skill rail itself — 💣 for BOMB CHARGE, 🔥 for DRAGON BREATH, 📢 for THE FULL THROAT, and one
each for the rest of the sixteen.

**The dev tool grows two tabs, ENEMIES and BOONS**, alongside RULES/LEVEL/BALANCE (`#enemies`
and `#boons` link straight to them, same as the others). ENEMIES is a live bestiary: one row a
kind, its portrait drawn by the exact same `drawEnemy` call the game itself makes every frame
(nothing separately rendered or pre-baked), speed/hp/damage/attack-cycle read straight off
`TUNING`, which levels it appears on read off `LEVELS`, and a line on how it actually behaves —
plus the goat's own numbers underneath, for scale. BOONS is the upgrades table, and it edits:
every numeric knob a boon's `apply` reads is now named in its own `params` rather than buried
as a literal in that function body, so the tab can list and change any of them, plus a new
`minLevel` gate (0/ANY by default) for holding a card back until a level the dev tool names.
Click a number to change it — it takes effect at once, and is also written into `js/tuning.js`
itself through a new `POST /tuning-edit` on `tools/serve.js` (`tools/tuning-patch.js` finds the
right literal by walking the file's own object literals, so nothing about the file's comments
or formatting moves) — the published artifact and a bare `index.html` have nowhere to send that
write, so the edit simply stays session-only there.

## 1.23 — the floor gets meaner too, and a door already closing

A pass over the generator taken straight off `GENERATION_RESEARCH.md`, which is new in this
sitting: what Spelunky, Isaac, Gungeon, Dead Cells, Nuclear Throne, Risk of Rain, Hades, Ape
Out, Streets of Rogue and Downwell actually do to build a level, and which of their laws this
game was already keeping. Three it was not are now kept, and each one is written down as a
rule the report can fail on.

**A room is bought on two axes now, not one.** `groundOf` in `rooms.js` measures how much of a
room is floor with nothing solid within a step of it — how little of it is available as a
weapon — and it reads true off the existing rooms without anything being re-authored: the
pillared `cloister` is 0.06, the yard `flanks` is 0.68, and a canon's average lines up with
what the level says it is about (STONE 0.17, OPEN GROUND 0.51). `draw` in `tryGenerate` now
deals both pools out along it, tight first, so the ground a fight happens on gets worse across
a level and not only the number of men standing on it. Measured over forty seeds that is +18
to +25 percentage points from a level's first third to its last. It picks at random among the
nearest few templates that fit rather than the single nearest, so two seeds of a level are
still two levels — which is also why `GEN_RULES.ground` is an averaged rule and never paints
one seed's noise as a broken promise.

The reason it matters is pillar 3: if the wall is what kills, then taking the wall away is a
way of making a room harder that a body count can never say, and until now the curve could
only ever make a late room *fuller*.

**And the clubman stopped being what a big budget gets spent on.** Every kind had a cap except
him, so he was whatever was left once the others filled — THE RAFTERS was running seven
bearers in a room of nine, which is a late room that is an early room with four more clubmen
in it. `ENCOUNTER.cheap` is his own cap and the only one that tightens as a room gets richer.
Threat did not drop when it landed, it rose, because the budget now has to be spent on quality:
RAFTERS 178 → 186, OSSUARY 201 → 207, and the clubman share of a rich room went from roughly
seven-in-nine to 21–34%. The Great Hall is untouched — it is handed its own head count and is
supposed to be a wall of bodies.

**A door that is already closing.** Some of the iron corridor doors from level three on stand
**open** and shut themselves. Beat one and you paid nothing and it falls shut between you and
whatever was chasing you; miss it and it is the ordinary three blows in the open that every
iron door charges anyway. It is the first thing in the world rather than in the score that says
*run, don't fight*, and the count is matched to that — it becomes a wall at 9 seconds, which is
`score.perRoom`, one room's par. It closes on a curve so the last stretch slams (a door
creeping shut at eight degrees a second is one nobody notices is moving), it will not shut on
anybody standing in the gap, and it **lights itself** while the count runs the same way a
broken secret wall lights its niche — the fog is the width of a doorway, and a race you cannot
see across a dark room is not a race. The generator takes the flag back off any door whose room
turned out to hold fewer than two men, or that stands on the room introducing a kind or the
quiet beat after one.

**One seed a run.** The corner showed the level's seed, which is enough to report a bad room
and no use for handing somebody your run. It shows the run's now, in base 36 — five characters
— and `#seed=k3j9a` takes it back on NEW GAME or LEVELS, so a link is how a seed is typed in
and the game still has no text field in it. `deaths` is in the derivation, so a death still
regenerates the level and is still not a way to learn a layout.

**The tool got the second axis.** On BALANCE a bar is threat and the hollow top of it is open
ground, drawn as absence rather than as more paint; THE THRESHING FLOOR's bars are visibly
mostly hollow and THE ALTAR's are solid, which is those two levels' canons read back off the
curve. Each level carries its own `ground early→late`, blood when it runs the wrong way. The
room sheet reports a room's open ground, its pressure (threat against the ground it is on) and
whether the draw chose its shape at all. Three new rules — `ground`, `crowd`, `clock` — are on
the RULES page and in `node tools/balance.js` like every other one.

Three pillars were added to `CLAUDE.md` alongside them: nothing may reward remembering a
layout (the game is in the regeneration camp, and that kills a whole class of future ideas), a
room is bought on two axes and neither is more of the cheapest man, and a promise the generator
makes is written down as a rule in the same sitting it is made.

---

## 1.21 — the teaching floor rebuilt, and a softlock that ended runs

Twenty lines off the live build in one sitting, most of them screenshots. The through-line
is the first ten minutes: level one's tutorial is now four rooms that each hand you the
thing they are about, and nothing in them is left to the seed.

**A run could end behind a locked door on level two, and that is fixed first.** The Seer's
arena there is a sealed room — both doors slam behind you and lift when the room is empty
— and a Seer blinks. `blink` asks the tiles, the flow field and `hazardAt` about a landing
spot and none of those three know anything about a door, so the mage could blink out
through the wall and stand there, alive, outside a room whose doors only open when it is
empty, with the goat shut in behind him and nothing left to hit. `game.sealHolding(e)`
answers "which shut seal is this man one of the reasons for", and `blink` now refuses any
spot outside that room. `updateSeals` carries the belt to that brace: a held man more than
a tile outside the room's own box stops counting. A door that gives too early costs a
fight; this cost the whole game.

**Level one is ten rooms, and the two empty ones are gone.** They were rooms of painted
text — one saying `WASD`, one saying `GRAB` — read, nodded at, and connected to nothing.
Every block of floor text now lies in the room that hands you the verb: `WASD — TO MOVE`
in the pen under the bars, over the prompt that says which button opens them; grab and
throw in the ambush room, which stands a sword inside the door and a crate a step past it;
the headbutt on the floor the first man of the run is standing on, cut to one line from
three. The count of *ordinary* rooms is unchanged, so the difficulty curve is the curve it
was — the set pieces simply moved up two: wheel at 3, ambush at 4, the brute's ring at 7,
the Butcher at 9.

**The first man of the run stands in a room four tiles deep.** It was six and packed with
hay: half the swings put him down on open floor where he got straight back up, which
teaches the opposite of the one thing level one is about, and the bales were the loudest
thing in a room whose whole point is the man. Two crates against the walls of the near
half instead, clear of the line from the door to him.

**The wheel is met in a room built round it, with two men who teach it.** `millLesson`
replaces `millSolo`: `MILL_LESSON_TEMPLATE` is narrow enough that the arm's sweep reaches
the top wall and leaves one lane along the bottom, and the two men stand past it. Neither
is scripted — `startLevel` pins their `trapSense` to the two ends of the roll every man in
the game makes, so the nearer one never sees the arm and takes it in the chest on his way
to you, and the other always sees it and comes round. An empty room taught that the arm
hurts. What has to be learned is that it hurts *them*.

**The ambush room is a corridor now: three tiles of floor, fourteen long.** A blade thrown
down it cannot miss and a man walking up it cannot go round. `noFlipX`, because flipped,
the men stood in the doorway you came in through with the rack behind them. Its stand is
always the **sword** — a thrown shield only knocks a man flat, and a lesson whose payoff is
"he gets back up" is not one anybody keeps. Nothing is scattered into it, so the one crate
is the one the template put there, and its bowl of milk, if the rhythm gives it one, is
placed in the far corner past the men rather than rolled for.

**`GEN_RULES.lessons`** holds all of that to the promise over every seed: four blocks of
floor text, the sentry alone in a `lesson` room, the ambush room built from its own
template with a sword and a crate in it and nobody on the near side. The teaching floor is
the one place the generator may not surprise anybody.

**The first boss of the game is one brute and one man.** `escorts` on an arena is a hard
count rather than a threat budget, and level one's first ring sets it to 1.

**Either button throws what is in your mouth.** `lmbPressed` with anything `item` held is
`throwHeld`. The bash button used to launch a blade, put a swept-up crate down at his feet,
or do nothing at all depending on how the thing got there — three answers to one press.
`dropHeld` and `prop.dropped` went with it.

**A crate held in the way takes one blow for you.** `Goat.crated` is the shield's own arc
with a box in it; `meleeHit` shatters the box and the goat pays nothing. No parry, no
charges — a crate is free and lying about everywhere, so what stops it being a shield is
that it is gone on the first blow.

**Anything alive trips the grating.** It answered to the goat and nobody else, which made
it a tool with a switch on it; a man could stand on the boards over the teeth all day. The
teeth still come up a beat late, which is what keeps it behind you at a run. Mist is the
exception.

**Quieter men.** `bark.gap` doubled and `perEnemy` up half again: a room that answers every
event out loud stops being read, and the two lines that matter were lost in the chatter.

**Art, four ways.** The pen has two tiles of straw in it — a pen with bedding was somewhere
animals were kept. Hay draws as the painted bale on every level rather than only the one
with the altar in it. `wallTop` — the pale coping — is skipped on a room's bottom wall,
where what you are looking at is the inner face and the band read as a stripe painted along
the floor's edge. And the lantern's and brazier's shadows sit under their own feet: the
offsets are tuned to where the opaque pixels of the cell end, not to where the cell ends,
which is why the lamp's shadow had been sitting a body's length below the post.

**The secret wall's crack is a crack.** One shared `Renderer.wallCrack` for the painted and
primitive draws: a hairline that staggers as it goes, a fork, a pale mortar lip a pixel
over, and after the first blow a wider gap with chips of stone out of it. It was a
four-point zigzag down the middle of the tile, which reads as a bolt of lightning painted
on the stonework.

**Small.** THE ROAD's hint drops its `HOLD RIGHT CLICK — CARRY` line: the hint names the
ground, and a hint that names the ground should not carry a button.

---

## 1.20 — an ambush room, a shorter headbutt, and the tutorial split three ways

A second, faster round on top of 1.19 — fifteen short lines against the live build, most
of them screenshots.

**Level one's opening rooms are cut to one idea each.** `WASD — TO MOVE` is now the whole
of the first room; the headbutt and wall lines moved to the room that actually has
someone to try them on, next to `BUTT HIM`; and the point-blank scream parry moved with
the roll into the crowded room down the line — a line about a parry means nothing painted
on an empty floor.

**A new room teaches grab and throw the way the level already teaches everything else: by
standing something in front of you.** `AMBUSH_TEMPLATE` (`rooms.js`) is a long, narrow
room — a stand of arms just inside the door, a crate a step past it, whoever the room
holds standing well down the far end. `levelDef.ambushAt` forces it in at room 6, which
is also where `racksFrom` already puts the level's first stand of arms and where the
roll's own room lands — one room now carries all three, rather than three different
empty ones. It fills off the ordinary threat curve like any other room; nothing about
who waits there was special-cased.

**The headbutt covers two tiles, not three.** `goat.headbutt.lunge` (a speed, not a
distance) was carrying him close to three tiles in `active`'s 0.15s; cut from 18.2 to
13.3 tiles/s.

**The soul card lost its number badges.** `Press 1, 2 or 3` and the corner digit on each
card are gone — the cards are clicked, and a caption teaching a keyboard shortcut nobody
asked about was reading as instructions rather than as a page.

**The secret niche's seam is softer, and the wall now stands like one.** The tile ring
one step out from a broken niche is force-lit too, not just the niche's own three tiles —
at the raised `fog.shade` (eased back from 0.94 to 0.9 for the same reason) the boundary
between a forced-bright niche and its ordinary shadowcast-dimmed neighbour was reading as
a hard black edge. The still-cracked (not yet broken) wall itself is now stamped anchored
above the tile's centre rather than dead on it, so it reads as standing in the wall
course rather than lying flush with the floor in front of it — worth another look once
it is live.

**Lying arms are smaller again.** 32px / 28px (sword / shield) down to 24px / 22px,
closer to the 22px they actually cover on the ground.

**Another fifth off the goat's base speed**, on top of the run-up cut already in place.

**Doors, tried and reverted the same day — not this session's change, landed alongside
it.** The expansion pack's door art is a square, front-facing leaf; this game's door is
roughly a 1:4.5 slab spanning a wall gap, and stamped at any readable size the square art
either floated as a disconnected icon or squashed unrecognisably sideways. Pulled back
out to the procedural slab in `Renderer.drawPropBody`; `ART_HANDOFF.md`'s brief now
specs the redo at the game's actual proportions.

**Left for the next pass, not guessed at blind:** the lamp and brazier reading as
floating rather than grounded, and a level-two floor patch that reads as misplaced hay —
both need a closer look together against the live build rather than another inferred fix.

---

## 1.19 — the pen room teaches less at once, and a bomb only goes off on a wall

Twenty-six lines off an annotated set of screenshots. Where a line was a question about
what the game already did (the bomb, the hen), it was checked in the browser before
anything was changed rather than assumed.

**Level one's opening rooms say less, and say it once.** `WASD — RUN` is `WASD — TO
MOVE`; the roll's line is out of the first room entirely — dodging meant nothing painted
on a floor with nothing on it to dodge, so it now waits for the first room past the
lesson that already holds two men or more, picked closest to the level's own middle
(`rollRoom` in `gen.js`, part 3 of `CONTROL_LINES`). The grab room is shorter — `RIGHT
CLICK — GRAB OBJECT` / `RELEASE — THROW` in place of the old three-line version — and
carries a line it did not have before: `CLOSE UP IT BREAKS THEIR SWING`, naming the
scream's point-blank parry for the first time anywhere on the floor. The room that
finally puts a man in front of you no longer repeats the headbutt and wall lines from
two rooms back — it says `BUTT HIM` and nothing else.

**The first man's room is now one shape, not whatever the mix pool draws.** Every other
room in the game is dealt from the level's canon or mix pool and could be anything; this
one room's whole job is "try the headbutt on somebody," so it is forced to a new
`LESSON_TEMPLATE` — open floor, no pillars, nothing between the door and whichever wall
`blockSpot` stands him against. `sentryRoomAt` in `gen.js` resolves to the same room
`planEncounters` would have introduced the bearer in anyway (`ordinaryRooms(...)[0]`),
so nothing about the difficulty curve or the room's role changes — only what it looks
like when you walk in.

**Bomb Charge only goes off on a wall or a body now, not on anything.** It used to
detonate on the first touch of anything at all, however gentle, and again on a timer if
nothing was touched inside 0.9s — a headbutted man could go up in mid-air over open
floor. Both of those were the trigger; now only a lethal collision is: `Enemy.die`'s
bomb check reads `cause === 'splat'` instead of `cause !== 'fall'`, the eager touch
checks in `enemies.js` and `game.js` (furniture, body-to-body) are gone, and a fuse that
runs out with nothing to answer it simply clamps to zero and fizzles rather than forcing
`explode()`. The card's own text says so now: "Anyone you headbutt goes off if he lands
on a wall or another man." Checked in the browser: a caught two-heart man (a Butcher)
already only lost one heart to the blast, which was correct and untouched.

**A blade or a shield in his mouth answers the bash button instead of ignoring it.**
Pressing headbutt while carrying a weapon used to either drop an auto-picked one at his
feet (and start a headbutt with an empty mouth) or do nothing at all for one he had
reached for on purpose — there was no swing to spend on a weapon he cannot wield with
his teeth. Now either button launches it: `Goat.throwHeld` is the release logic pulled
out of grab's own throw, and the headbutt state machine calls it whenever what is in his
mouth is a `weapon`.

**A sword or shield on the floor draws in front of him when it is, and smaller.** Every
prop but a cage bar drew at a fixed place in the stack regardless of where it stood
against the goat, which put a large sword sprite behind him whenever he had walked past
it. The same Y-sort the pen's bars already used is now shared with a lying (not
racked) weapon prop; a dropped sword or shield also draws smaller than one still
standing in its rack (32px / 28px against 46px / 32px), closer to what it actually
covers on the ground.

**The fog hides more than it dimmed.** `TUNING.fog.shade` was 0.8 — dark enough to read
as fog, not dark enough to keep a red hood or a rifle's silhouette from being nameable
through a doorway into a room that had not been opened yet. Raised to 0.94.

**A full heart on the grass says so instead of doing nothing.** Standing in a patch of
healing grass at max hearts used to be silent — nothing on screen said whether it had
worked, which read as the patch being broken rather than as there being nothing left to
gain from it. It says `FULL` once per visit now.

**The hen waits for level two.** She used to turn up as early as level one; now
`coops` is unset there (no chance at all) and trimmed slightly on the two levels after
it (0.12 → 0.10, 0.10 → 0.08) — a level built around the goat's own head is not the
level to also be teaching an ally that kills once. `henFreed`'s own line — `SHE
FOLLOWS. BUTT HER AT A MAN` — was checked and already says how she works; the kick's
homing (`Prop.pickTarget` / `updateBird`) was checked in the browser too and already
steers onto whoever is nearest the line she was kicked along, at a wide arc and a fast
turn rate.

**The moment the pen gives, before the room needs looking at.** A small comic-panel
thought over his head, gone in a couple of seconds: two trailing dots and an oval
holding her in miniature — the same drawing `drawSheep` does for the real one, scaled
down, rather than a stand-in shape. The panel itself is a strip of grass, the same
colour the healing patches use, not the dark cloud a first pass tried — a black bubble
read as ominous rather than as a memory.

**The soul card shows what a boon hangs off, not just its name.** A skill boon (one
with `skill` set) now carries the same icon `drawSkills` draws for it on the rail, plus
the key that throws it, in the corner of its card — so a new boon and the chip it later
shows up as are recognisably the same picture instead of a name to go and look for.

---

## 1.18 — a second batch of paint, and it walks now

**The sheep, the bearer, the mage and the hound turn.** GPT delivered a second asset
package (`assets/painted-expansion-v1/`) — the same four characters redrawn across all
8 directions with 4 walk frames each, animated fire for the brazier and lamp, four
door types in four states, and 16 level-one props. `tools/pack-painted-expansion.cjs`
embeds the pack's own already-cut sheets into `js/painted-assets-v1.js`; `PaintedArt`
in `js/painted-art.js` reads it alongside the original set. The four characters now
turn to face the way they're actually moving instead of mirroring a front/back pair,
and windup/swing lean along the real facing rather than a left/right-only nudge.

**And it is no longer level one's alone.** The painted brazier, lamp, crate and bell
used to draw only when `game.levelIndex === 0`; that gate (`Renderer.drawPropBody`)
now checks `this.painted.ready` instead, so those four — plus the new animated fire,
the worktable, weapon rack, healing grass and spike plates — render on every level,
not just THE ALTAR.

**A same-day second pass finished what the first left half-done.** The mill's hub *and*
arm now draw from the atlas — the arm is stretched to `TUNING.mill.armLen` rather than
guessed, checked in-browser at gameplay zoom since it's a hazard whose readability
matters. The secret wall now uses the atlas art too, tinted to each patch's own
`p.wallColor` at draw time and cached per colour, so it still hides until it cracks
instead of giving itself away by color. The soul wisp's body is the atlas art now, with
its halo and orbiting sparks still procedural. **Cage bars went back to fully
procedural** — `cage-bars.png` turned out to be a three-post fence panel, not the
single post this game's per-bar pen model needs, so using it as delivered would have
tripled every post.

**And a third pass pulled the doors back out.** They went in with the pack's four-state
sprite for the vertical orientation, and came straight back out the same day: the
delivered art is a square, front-facing door leaf, and this game's door is a thin slab
spanning a wall gap at roughly a 1:4.5 ratio — stamped at any readable size the square
art either floated as a small icon disconnected from the gap it stood in, or had to be
squashed sideways past recognizing. `Renderer.drawPropBody`'s door branch is back to
the plain procedural slab; the halo, the pressure flash and the soul-gate wisp and text
were never touched either way. The tile and wall art itself is still level-one only —
no other level's floor has been painted yet. `ART_HANDOFF.md` now carries a full
technical brief for what's still needed: tile/wall art for levels two through seven
(with each level's exact procedural palette to match), full sheets for Hunter, Wraith
and Butcher (whose concept sheets already exist, unused, in `output/character-concepts/
remaining-characters-v1/`), the cage correction above, doors redrawn at the game's own
proportions and proven by testing in the running game rather than in isolation, and a
smaller, simpler healing-grass sprite — the delivered one reads too big and busy for a
small floor patch.

---

## 1.17 — a meadow, a road, and the dark

**Three screens before the pen.** The run used to open on two animals already in a cage; now it
opens on a field. A meadow with a rail fence and a low sun, the two of them at opposite ends of it
on a loop each, calling to nobody; then they come together, the heart comes up between them, and
they run one loop and answer each other. Then the back of a truck on a road at night — a cage on
the flatbed, the road going past, the wheels going round, a motor under it. Then nothing: a black
screen and two voices. Then the sacking comes off, and it is the pen, and the men are coming.

The bleats are the through-line. They are further apart in the field, closer on the road, and in
the dark they are all there is — so what changes from screen to screen is not the picture but how
often one of them calls and whether the other one still answers. The pen scene that follows is
untouched: it is the same two animals a minute later, and it lands harder for the minute.

It is the first version, drawn plain on purpose — a fence is two rails and some posts, a truck is
three boxes and two circles — so that the shape of the story can be looked at before the finish is
spent on it. Every beat is in `TUNING.intro.prologue`, it can be skipped like the rest once a
browser has watched it through, and `drawGoat` / `drawSheep` draw the two of them, so they are the
same animals in the field that they are in the cage.

---

## 1.16 — a hen

**There is a chicken in the compound and she is on your side.** A `coop` — two tiles of slatted
crate — stands about in the stores of the first three floors (`levelDef.coops`, about one and a
quarter a level, and a quarter of levels get none). Two blows open it and she walks out.

Loose, she follows the goat, hanging back a tile and a half and only hurrying when he has got away
from her. Put your head under her and she goes: she leaves fast, takes whoever is nearest the line
she was kicked along, and steers onto him the rest of the way. What she reaches, she kills — and she
comes apart doing it. **The kick is the headbutt.** There is no new button and nothing to pick up;
she is the one thing in the game you aim by pointing your own head at it.

It is a direct kill and that is deliberate. She is on the same footing as a thrown sword — found,
opened and spent, gone the moment she lands — and what keeps her from being a win button is that
there is about one of her a level. A wall is not a man: she tumbles, sits down for a beat, and gets
up loose again, so a miss costs the walk back to her rather than the bird. Her voice goes through
`bleatVoice` like every other animal in the game, pitched right up and cut into two clipped notes.

**The bare voice answers a man who is already swinging.** Inside a couple of tiles, BAAH now breaks a
blow he has committed to and costs him a blink before he can start it again. It is not THE FULL
THROAT — two bodies rather than a room, no stacking, and he is walking at you again almost at once —
but being caught at arm's length used to have no answer in it at all until a soul turned up. The two
things that cannot be called off once begun are the two a scream already spared: a Butcher mid-swing,
and a wraith that has started to arrive. The lure is untouched and still carries thirteen tiles, so
it is one button doing both jobs at two ranges.

**The rifles are much quieter about it.** The hiss that says a rifle has you was a bright noise burst
every other bar at most of the kit's volume, sitting straight on top of the hats — with one rifleman
awake anywhere on the level it was the loudest thing in the mix and the music under it stopped being
audible. A third of the gain and half as often (`TUNING.audio.hunterCue`): still the one dry tick in
the bar that nothing else makes, now under the drums rather than over them.

**A niche you have opened stays open.** Breaking a secret wall now lights the three tiles behind it
for good. The shadowcast is honest about a one-tile gap — from a step back it lit a sliver and shaded
the rest — which is right for a doorway and wrong for this: the whole point of the wall is what is
behind it, and the reward was a dark patch you had to walk into before you could read it.

---

## 1.15 — a room that shuts behind you, a wall that gives, and a gentler first floor

**Sealed arenas.** `{ at, boss, sealed: true }` on a level's `arenas` entry narrows both ends
of that room to a single tile and hangs a door in each. They stand **open** until the goat is
a tile inside, then slam together, and neither gives until the last man shut in with him is
down. Nothing smashes or shoulders one; `Game.updateSeals` runs all three beats. Level two's
mage arena is the first, and is the one room on that floor carrying its own soul.

Two things about it are deliberate and were found by playing it. The doors *must* start open —
shut from the first frame they were simply a wall, and since a seal refuses to be broken that
put the arena, its soul and the stairs beyond it out of reach: the level could not be finished
at all. And the seal waits on whoever is **standing in the room when it shuts**, not on whoever
was spawned there: an escort who chased the goat out through the open door and stayed out would
otherwise have kept the room uncleared for ever, from the outside, with no way to reach him.

**A wall that gives.** One or two ordinary rooms a level carry a worn patch of their own top or
bottom wall — `TUNING.prop.secret.hits`, two blows, a crack after the first — with a niche cut
into the rock behind it holding a patch of milk and a stand of arms. `carveSecret` in `gen.js`
only ever takes tiles that are still solid rock, so it never trades on a room or a corridor, and
it is drawn in the room's own wall colour: the crack is the only tell it ever gives.

**The wheel got smaller.** `mill.armLen` is half what it was and `MILL_TEMPLATE` shrank with it,
so a shorter reach reads as a tighter room rather than as the same floor with less of it
dangerous. Men no longer blunder into a **drop** on their own either — every other hazard in the
building is a wound and the trap roll lets a man walk into one now and then, but a hole is gone
for good, so he falls only when something throws him in.

**Two new things to spend a soul on.** THE ORACLE lights everything inside sight range, wall or
no wall — the one thing in the game that reads `game.mods` from inside the fog, because it is not
a sharper eye but a different sense standing in for the one the fog was built to limit. And EMBER
COAT no longer makes ordinary fire free: it multiplies how long a flame takes to bite by
`mods.fireResist` (3×). Standing in fire you could not feel made running through it a way of not
playing the level. Witchfire never cared and still does not. The offer itself alternates now once
both half-shut buttons are whole — a coin flip could hand out three actives running, which reads
as the other kind not existing.

**Level one asks for less.** `encounters.cap = { men: 2 }`: two men to a room, and the soul-gate
arena's boss gets two at his back rather than three. The curve is untouched — a room may spend
exactly what it could before, it simply has to spend it on better men rather than more of them —
so the floor still climbs and still ends on the brute. Three men converging is not a harder
version of the lesson level one is teaching, it is a different lesson, and it arrives before the
player has the verbs to answer it. Total threat 29.6 → 26.6, worst ordinary room 3.6 → 2.8.

**The mage leaves less often.** `seer.blinkCooldown` 3.0 → 4.3, a third fewer blinks. One who
re-sited himself every three seconds answered every approach before it landed, so the counter-play
was to wait rather than to move. He still goes when you get near — he just cannot do it twice in
the time it takes to cross the room after him.

**Going down a hole no longer strands you.** Two faults, both able to end a run on their own. A
fall returned the goat to a remembered point without ever checking it was still floor, so a
landing over another drop dropped him again, and again, for as long as he had hearts; every
candidate is now tested against the ground, with `Game.groundNear` as a last resort that cannot
fail. And the landing itself was gated on his position differing from the spot he was headed
for, which silently did nothing on the fall where the two already matched — no damage, no move,
and the goat left standing in the hole. It is an explicit flag now, resolved exactly once per
fall. He also comes back `fall.setback` (0.35s) further back along his own last few steps, with
`fall.invuln` (1.5s) to notice it, rather than flush with the lip that just took a heart.

**Smaller things.** Milk sits in a ring of earth rather than sprouting out of bare boards, and
has lost the floating `GRASS` label. `ART_HANDOFF.md` lists the secret-wall patch among what is
still procedural.

---

## 1.14 — the Altar in pixel art, a slower camera, and an easy mode

Level one now uses cached 32 px stone and timber tiles, plum masonry, worn cult banners,
and sparse straw and rubble at wall edges, following the approved room concept. Crates,
braziers, lamps, the gong, pen bars and the Mill have a dedicated pixel-art pass; doors
retain their opening animation, damage marks and soul seals. `js/painted-art.js` draws the
goat, the clubman, the mage and the hound from the approved hand-painted sheet
(`assets/painted/`, packed to base64 in `js/painted-assets.js` by
`tools/pack-painted-art.cjs` so `file://` and the artifact build stay dependency-free) in
place of the primitive shapes. `PaintedArt extends AltarArt`, falling back to the
procedural draw for anything not yet painted — everyone else's rendering (hunter, wraith,
butcher, and every level but the first) is untouched. The brick face shows on every
visible wall tile, top and sides alike, with the coping texture capping only a thin band
at the top of each; it used to show only on the row bordering floor to the south, so most
of a room's walls read as flat coping with no masonry at all. The pen room's two "previous
sacrifice" markers are the procedural bone piles again rather than the faded ghost sheep
a first pass tried, since the room already carries them on the layer under the altar. The
goat's stride is a quicker double-bob with a touch of shear in it now — a flat sprite
can't swing its own legs, so that is what reads as a trot rather than a still photograph
sliding across the floor.

**The ritual altar is furniture, not scenery.** It is a real `table` prop now — `Prop`'s
`isAltar` flag is the only thing that tells it apart from an ordinary one, so it takes a
blow and blocks the way exactly like any other table, and the painted layer draws it as
itself rather than the plain procedural table every other one falls back to. An ordinary
table prop elsewhere in the level was never meant to wear the ritual altar's art in the
first place, so that mapping is gone too.

**Milk is a patch of sprouted grass now, and it is grazed rather than grabbed.** Walking
through one used to bank a heart on contact; now the goat has to stand in it, near enough
and slow enough, for `TUNING.prop.heal.grazeTime` (1.4s) before it pays out — a progress
ring reads the count, and stepping away or moving lets it bleed back down rather than
snapping to zero. Running past on the way to somewhere else does nothing, which was the
point: a heart is worth a beat of standing still in the open.

**The camera got a deadzone.** It used to re-centre on the goat's exact position every
frame, which read as a shiver rather than a pan — a small window around the follow point
now absorbs any motion that small, and only real travel past its edge moves the camera at
all. A room that already fits the screen whole is held dead centre instead of tracked,
since there is nothing off-screen to pan toward and tracking it only added to the shiver.
See `TUNING.camera.deadzone` / `fitMargin` and `Game.updateCamera`.

**Escape always reaches the title,** from anywhere in a run — the equivalent of closing
the tab and coming back, which is what the saved run already tolerates. The top HUD band
is a fifth smaller (`hud.scale` 1.3 → 1.05) and sits closer to the corner, and the seed
moved out of that corner entirely, down to the bottom-left, out of the way of everything
else it was competing with.

**EASY MODE**, a fourth switch on the title screen: six hearts to start instead of four,
and every enemy windup, swing, recovery, cast and reload takes 40% longer, off one number
each — `EASY.maxHp` and `EASY.enemySlow` in `tuning.js`. `applyBoons` folds both into
`game.mods` when `settings.easy` is on, so a normal run reads `mods.enemySlow` as 1 and
nothing changes; every attack timer in `enemies.js` multiplies its own `TUNING` duration
by it at the point it is set, the same read-the-mod-at-the-use-site pattern boons use.
Movement, sight and AI decisions are untouched — only how long a hit takes to land.

---

## 1.13 — a slower goat who earns it back, and arms you pick up without asking

**Thirteen lines off one playtest, and most of them are about pace.** The goat walks a fifth slower
than he did and gets the whole of it back for not stopping; the cult walks a tenth slower than it did;
the roll clears less ground; and a man thrown out of his mouth lands like a man rather than clearing
the room. What is left is the screen and four things that were simply wrong.

- **A fifth off the stride, and a run-up that is exactly that fifth.** `speed` is 0.8 of what it was
  and `momentum.max` is 0.25, so four seconds of running flat out puts him back at the old top speed
  and a single club takes it off him again. The speed he used to have for free is the speed he now
  has for not stopping.
- **A tenth off every man in the compound.** `CULT_PACE` is the second yardstick; every enemy speed is
  still written as a fraction of the old one, which is the only way the numbers stay readable.
- **The roll is a fifth shorter.** Same beat of mercy, a fifth less ground: a dodge that clears the
  whole room is a second way of running rather than a way of not being hit.
- **A goat is not a gorilla.** A man out of his mouth goes `manThrow` — seven tenths — of what a crate
  does. Still every wall in the room and every man standing by one; no longer the far side of it.
- **Blades and shields are picked up by running over them.** No button: `sweep` past the two bodies
  and it is in his mouth. A butt puts it down at his feet and lands anyway, a press of grab throws it,
  and something he put down himself stays down until he has walked off it. Carrying an arm costs
  almost nothing (`itemSpeedMul`); carrying a man still costs a third of his stride.
- **Fire goes the way he is going.** DRAGON BREATH comes out along his line of travel, not along the
  pointer. A goat running one way and breathing fire the other is a gun turret.
- **BOMB CHARGE goes off on what it hits.** Any contact — a wall at any speed, a body, a table, a door
  — detonates a fused man, and the fuse (0.34 → 0.9) is the longstop rather than the trigger. He used
  to pop in mid-air over an empty floor, which is a firework and not a man you threw at something.
- **A room opens when you can see into it.** The reveal reads the shadowcast now instead of waiting for
  him to walk in — and a shut door stops that cast, across both lanes of the corridor, exactly as it
  already stopped the cult's. What he cannot see from where he stands is still painted down, so a look
  through a doorway hands him the sliver the doorway shows.
- **Nothing that is not on the screen lands a blow.** A man inside a room nobody has opened could reach
  out of the black and club you, and a rifle in one could shoot you out of it. He may walk, shout and
  come and find you; he may not hit you from a place the game is refusing to draw.
- **Milk is never in a fire.** The bowl was the one scatter in the generator that checked the tile and
  nothing else, so it could be laid down on top of a brazier — the last heart of a level standing in
  the coals. It keeps a berth from anything alight now, and `rules.js` fails a level that does not.
- **The title screen fits on the title screen.** The button block was measured as two rows however many
  there were, so five of them ran off the bottom of the window and took SETTINGS with it. The rows are
  smaller and sized to the screen they got.
- **The skill notes are one line each.** They are read while a room walks toward you.

---

## 1.12 — a corner you cannot see round, and a goat who can already dodge

**One sitting, twelve lines off a screenshot.** Half of it is the screen: everything the HUD was saying
out of habit came off, and what is left says its piece when it is asked. The other half is the first
hour — the roll is his from the first second, the pen is a lesson rather than a toll, and a head with a
body behind it kills two men who are standing together.

- **The fog has a second half, and it moves.** A shadowcast runs from the goat's own tile every step,
  and anything a pillar, a stub wall or the corner of a room is standing in front of goes dark until he
  steps round to where it can be seen from. Nothing is culled — a man back there still hears you and
  still comes — he is simply not lit. Rooms still open by being walked into and still never close.
- **The roll is his out of the pen.** It was behind a soul, which meant the first level was played by
  an animal that could not get out of the way of anything. TUCK AND ROLL is gone; **DEAD WEIGHT** is
  the roll's soul now, and it is an active: everything the tumble goes through loses its head.
- **Some of the head came back.** Recovery 0.44 → 0.38, throw 25 → 28, reach 1.55 → 1.64: a third of
  the 1.11 cut, not the whole of it. He still starts underpowered — he starts underpowered with a
  shove that has a body behind it.
- **A body is part of the room.** Throw a man off your horns into a man standing next to him and they
  both die: the struck one at `bodyKillSpeed`, and the one who was thrown at the speed a wall kills at.
  Two men shoulder to shoulder used to be the safest place in a room.
- **A crate thrown into a fire goes up.** Wider than the flame that lit it and burning a good deal
  longer — a doorway you can shut. Witchfire lights it as witchfire.
- **The pen gives on the second blow, once you have got out of it once.** Seven blows and two falls is
  the hardest thing the goat does all run, and it is worth doing once. `goatout.pen.v1` remembers.
- **The rail says the key, and the note says the verb.** Under each chip is LMB / RMB / E / SPC; the
  name and the sentence about what it does come up while the pointer is on the chip, with the souls
  hanging off that button under them.
- **Off the screen:** the level's name over the hearts (the card has just said it), the strip of
  controls along the bottom of the page (the rail says it), and DEV's box — it is a word in the corner
  now. The kill count is smaller.
- **LEVELS on the title screen.** Any floor of the game, with the souls a run would have banked getting
  there, dealt at random. It touches neither the saved run nor the board.
- **The drums climb later.** It took five men for the whole kit, which is an ordinary room from level
  three on; it takes seven now, and the top of the kit is two toms and a chant rather than a wall.

---

## 1.11 — a goat that starts weak, and souls instead of books

**One sitting, about the climb.** The ask was a power fantasy that begins at the bottom: the verbs you
start with should be the plain version of themselves, and everything after that should be earned. Every
change here is that, plus the reading of it — what a room tells you before you are in it, and which man
in it is worth the trouble.

- **A tome is a corrupted soul.** A goat does not read. It is a violet wisp with two cold points in
  it now, drawn by one routine that the thing on the floor, the choice cards and both soul doors all
  use, and the goat swallows it to get stronger. `tomes` is `souls` everywhere in the code.
- **Three of the four buttons start half-shut.** GRAB lifts boxes, blades and shields, and a man is
  **BY THE COLLAR**. BAAH is a **noise** that walks every man who hears it to the spot you shouted
  from — a tool for emptying one end of a room, and a way to fill the other — and turning it into a
  weapon is **THE FULL THROAT** or **DRAGON BREATH**, one or the other. ROLL is still **TUCK AND
  ROLL**. The rail says which half you have: `THINGS`, `CALL`, `LOCKED`, each dimmed, each changing
  its word when the soul lands. While any button is shut the cards deal actives three times in four.
- **The bare headbutt is blunter**: shorter reach, less throw behind it, and a recovery long enough
  that a second man arrives on the end of the first swing. LONG HORNS and IRON SKULL both got stronger
  to match, so the same tomes that were numbers are now felt.
- **The gate on level one.** The brute's arena is shut behind a barred door that no blow opens; the
  soul he is carrying is the bar. Nobody walks past the first soul they are ever offered any more,
  which is what was happening — the fight was over, the thing on the floor was scenery, and the run
  met level two with every button still shut.
- **A man with a soul in him is lit**: an amber haze that breathes, a ring at his feet, red eyes. Two
  Butchers in a run used to look identical and one of them was worth a verb.
- **An iron door in front of every level's stairs.** Three blows and the noise of three blows. The
  last room of a level was the one room you could always outrun.
- **You see a room when you walk into it.** Everything you have not been in is painted out, and stays
  painted out until you are in it; corridors are always visible, so the warning you get is the width
  of a door rather than the width of the screen.
- **The clock is a setting, and it is off.** A new SETTINGS page on the title screen holds it and the
  sound switch. The level card reports the time either way, which is where a time belongs.
- **The RULES page reads faster.** Every rule is one line, the level's numbers read out as `name
  value`, and the room list is gone — in its place is every room as a **floor plan** drawn off the
  generated level, with the men on it as dots and `×N` over each. Three new rules: the stair door, the
  soul gate, and that a level has somewhere to put every soul it was authored to give.
- **The balance report moved into the page, and the tool became three tabs.** RULES is every rule
  against every level as a matrix — a rule is a promise about the generator, so what you want is the
  row: six levels keeping it and one not. LEVEL is one level on the whole screen, with the rules that
  are about *it* reduced to a line of marks. BALANCE is what `node tools/balance.js` prints, over 4
  to 30 seeds, as a row of bars a level — and a bar is a room **at its real width and its real place
  in the world**, so the row is the size and shape of the level's ground, the height is its threat
  and the count of men rides on the bar.
- **You can open a room.** A tile on LEVEL and a bar on BALANCE are the same button: both open the
  room sheet — the plan as big as the screen allows, a grid over the tiles, a name against every man,
  and a column saying what the floor is made of, who is standing on it and what is standing in it.
  The tool has an address of its own: `#rules` and `#balance` open the game straight onto that tab.

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
