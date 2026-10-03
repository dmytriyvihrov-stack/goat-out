# The Thrower (working name)

Design notes, 3 Oct 2026. Nothing here is built yet. Art: `thrower.cjs` renders `thrower.png` and
`thrower.html`. The earlier passes (`concepts.cjs`, `bane.cjs`, `goatbane.cjs`) are kept for the record.

## The look (settled with the user, 3 Oct 2026)

- A one-armed "Bane" of the cult: a goat's skull **worn as a mask** over his own head (his chin, stubble,
  mouth and ears show under and beside it, leather straps and rivets hold it, buckled at the back),
  the skull's sockets lit green.
- One arm huge (Popeye's forearm, a block of a fist), fed by a hose from a glass tank of green on his
  back through an iron port screwed into the shoulder. The veins pulse: a wave runs from the tank down
  the hose and the arm to the knuckles, the arm swells on the beat, the shadows go green toward the
  fist. Green is the game's poison (`TUNING` venom ramp), so it reads as "poisoned strength".
- The other arm is **really puny**: a thin, wasted stick, bound at the wrist.
- **The butcher's size**, a bit smaller than the ogre: ~41 world px to the crown, ~48 with the horns
  (`TX` 0.84), against the butcher's ~44 and the ogre's ~70.
- The cult's red: a ragged mantle round the neck, a strip down the front, its mark burnt into his chest.
- The big arm is his right and must stay his right: draw **all eight facings**, do not mirror
  three of them as the ogre and the shieldman do.

## What he does (the user's words, 3 Oct 2026)

- **Three hearts** to start (the butcher's `champion.hp`); the boss and soul rules add to it as for any kind.
- **He looks for things and throws them.** In his room he goes to something liftable, lifts it
  overhead (the windup, readable) and throws it at the goat. Things: crates, barrels, bombs, and men
  of his own (the melee ones first). Thrown men are bodies, so a wall kills them (friendly fire).
- **Close up he can also just hit**: a blow straight in front of him (fist drawn back, then out).
- **He can grab the goat and throw it** too (from the first brief: "objects, men, maybe even the goat").
- **A headbutt moves him like the butcher**: knocked back, not carried (`champion.flingMul`, never lifted).
- **He likes rooms with drops and things to throw** (first brief).

## Settled and built (3 Oct 2026)

The user: "appears on the bridge; yes, it hurts when he throws the goat into something; he throws clubmen, hounds
and the animal companions". Built in `js/thrower.js` (behaviour), `js/thrower-pixels.js` (body, four views, no
mirror), `TUNING.thrower`, `GEN_RULES.thrower`; see CLAUDE.md *Enemy kinds* and CHANGELOG.md. `ingame.cjs` here
renders every view and pose of the game's sprite to `ingame.png`. The proposals below were all taken as written,
with the animals narrowed to the ones he can lift (not the horse, not the crow).

## Proposals to settle before building

1. **The thrown goat takes damage only from what it meets** (a wall hit hard, a drop, fire, a grate),
   never from the throw itself. That is pillar 3 turned on the goat, and it is why rooms with drops
   are his. The roll slips the grab, as it slips the butcher's hook.
2. **The pulse is the tell.** Before a grab or a blow the heart beats faster and the wave runs quicker;
   the lift overhead is the throw's windup. Every attack still has a windup and a recovery (pillar 4).
3. **Breaking the lift:** a headbutt while he holds something overhead makes him drop it on himself
   (floored, a crate breaks, a lit bomb goes off in his hands).
4. **Generation:** introduced alone (`met`), placed only in a room with at least two throwables, and
   that promise written as a `GEN_RULES` entry in the same sitting (rule 8). A SPAWN row and a place
   in THE SHOWROOM the day he is added (rule 9).
