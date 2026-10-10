# The villain (working name: THE WARDEN of the meat cult)

Concept notes, 10 Oct 2026. Nothing here is built. `concepts.cjs` renders `sheet.png`: five looks, each as the
man and again with a corrupted soul in him (drawn at x1.6, not scaled), and a strip at world size beside the goat,
a clubman and the ogre. Concept art only: nothing in js/ loads this.

## The brief (the user's, 10 Oct 2026)

- A villain is needed: a hard follower of the meat cult, Lord Humungus (Mad Max 2) as the reference: iron hockey
  mask, a leather harness over a bare chest, bald, built.
- He is the one who took the ewe (the opening scene's wife), to sacrifice her. The goat goes to hell after her, and
  in the finale fights the goat god for her.
- After a corrupted soul he is bigger than a man.

## The five

1. THE WARDEN: Humungus as he is. Iron mask with slits and breathing holes, strapped to a bald skull, the X harness
   with studs, iron bracers, the cult's red loincloth. Corrupted: the soul lit through his chest, veins violet, the
   mask cracked by what is behind it, two horn stubs through the skull.
2. THE ABBOT: the high priest. A goat's skull worn whole as a helm with a crown of horns, a bone apron of sewn ribs
   over a red robe, hooks on chains off the belt, a cleaver the size of a door resting on the floor. Corrupted:
   the crown doubles, skulls hang off the belt, the sockets go violet.
3. THE FLAYED: he took his own skin off for the god. Muscle and sinew, lidless eyes, teeth with no lips, an iron cage
   bolted round the head, the harness stitched into the meat. Corrupted: the sinew lights violet.
4. THE WOLF SHEPHERD: a wolf's pelt over his head and shoulders, a leather muzzle over his own face, a shepherd's
   crook ending in the butcher's iron hook, and the blind shepherd's stolen bells on his harness (the ones heaven
   says the cult took). Corrupted: the pelt's eyes light and the fur grows down over his chest, claws on his hands.
5. THE GLUTTON: he eats what is sacrificed. A belly, a stained apron, a hog's iron mask with a snout plate and a
   grille, a chain of sausages across the chest, a small cleaver. Corrupted: the swallowed souls glow through the
   belly, faces pressing out of it.

Sizes on the strip: the man at ~46 world px to the crown (the butcher's 44), corrupted ~73 (the ogre's ~70).

## Second pass (10 Oct 2026): the user picked THE WARDEN for phase one and THE FLAYED, corrupted, for phase two

`phases.cjs` renders `phases.png`: three options each.

**Phase one, the man (THE WARDEN):** A · IRON (as drawn, the sawn-off in his belt), B · BONE (a sawn goat skull for
the mask with the sign painted on the brow, red leather, the shieldman's skull board on his arm, the gun slung),
C · WAR (a full helm with a red crest, a spiked shoulder, a bandolier of shells, chains, a hook, the gun holstered).

**Phase two, the monster (THE FLAYED, x1.6):** A · CAGE (as drawn), B · MASK (the man's own iron mask still on, too
small, sunk into the meat; the sign carved in his chest, runes down the arms, witchfire in his hands), C · HIDE
(his own skin hung off his back as a cape, its scalp a hood over his red face, the old face slack under his chin,
hooks through the shoulders, the ribs opened like doors on the soul).

## Proposals (not built, not decided)

**Where she changes hands.** The user: on floor two the mage hands the ewe to the Warden at the end of the floor
and he leaves. Better than a second actor in the pen: the opening already is the mage taking her; the handoff at
the end of THE YARD sets the Warden above the mage, at the moment the player has every verb; THE YARD's way out is
already a soul gate (`exitGate`), so he walks through it with her and it shuts behind him, and the first gate's
`watchBless` scene (held at the door, the mage with her under his arm, the goat sees which way she went) is the
machinery, nearly unchanged. Seen three times before he is fought: the handoff (floor 2), a glimpse across the
chasm in THE ROAD's empty lesson room (floor 4: he stands on the far side with her and walks off, nothing can
cross), the fight.

**Where he is fought.** Phase one at the end of THE RAFTERS (7), once both halves of him, the shieldman (6) and the
thrower (7), have been met alone (the generator's own rule); beaten, he swallows the soul in front of the goat and
goes down the stairs with her. Phase two at the end of THE OSSUARY (8), the ewe tied at a sacrifice altar in the
room. (The cheaper cut: one fight on 8 with two phases.)

**Phase one, by distance** (the user's shape: shieldman + thrower, a gun at range). Everything below is a part the
game has, with its own tell:
- Far, a clear line: THE SAWN-OFF out of his belt. The hunter's cock and aim line, two barrels, a fan of pellets,
  then a long reload with the gun broken open: the window to close in. Loud, every man hears it.
- Mid: he lifts and throws what the room holds, the thrower's states as they are: crates, barrels (a lit one rolls
  and goes up), bombs, his own men, the goat. Butted while a thing is overhead he drops it on himself.
- Close: the board on his arm, the shieldman's rules: spikes on a butt from the front, the bash, the butcher's
  shove reflex. Walked round, a butt sends him into the wall (the butcher's flingMul: shoved, never lifted).
- He knows the room: he flips tables between himself and the goat, kicks a brazier over onto a line of barrels,
  cuts the chandelier's cleat when the goat is under it. The goat's own toolbox turned on him (pillar 3 both ways).
- Hurting him: three hearts as a champion. Floored, he drops the gun; GRAB and throw it out of reach and he has no
  far game left. The board is down while he aims and while he lifts. The wall, the chandelier, a bomb thrown back.

**Phase two, the monster.** Nothing lifts or throws him and the horns alone do nothing (the ogre's rule), the soul
in his open chest is the only thing a butt can hurt, and only while he is staggered by geometry (fire, a blade, a
bomb, a flung body, the altar): the ribs stand open a few seconds, white like a windup. His magic, every piece
built:
- THE PULL: the soul calls the goat toward him (the shaman's `called`, the key over the goat's head), onto what
  is between them: a puddle, fire, the altar.
- Rings of witchfire off every stomp and a band off the slam (`Waves`, the corrupted ogre's).
- He tears a piece of himself and throws it: a puddle of poison where it lands (`Status.spatter`), the floor
  shrinking round the goat as the fight runs on.
- Every heart he loses lets a swallowed soul out as a wraith: the room fills as he empties.
- THE SACRIFICE ALTAR in the middle of his room (`js/sacrifice.js`): anything standing on it pays a heart a tick,
  him too. BAAH lures him onto it, his own pull drags the goat over it. The sacrificer sacrificed.
