# BACKLOG, asked for, not built

`CONCEPT.md` is what the game is. This file is what playtesting has asked for and the build does not do yet,
plus what is waiting on his answer, and what was parked or decided against (so nobody proposes it again).
An item leaves when it ships (the reasoning goes to `CHANGELOG.md`) or is decided against (one line moves to
*Parked and decided against*, with the reason).

**Compacted 8 Oct 2026.** Every batch up to then, his notes in his order and what shipped for each, is in git:
`git show 19f4efd:BACKLOG.md` (2.04, 2219 lines). Look there for the old wording, the measurements behind a
fix, or a closed item's history. A new batch goes at the top of *Batches* below as before: dated, a table of
his notes and what shipped, the open rows also copied into the sections under it.

Tags: **bug** something is wrong; **feel** it works and does not read; **number** the number is wrong;
**system** it does not exist yet; **tool** for whoever builds it, not the game.

---

## Batches

*(none since the compaction)*

---

## Ask him

Read one way and built that way; his word settles it.

- (8 Oct, heaven #4) "when you brought 20 souls" breaks off there. What should happen then: the god says something, the mirror mends by itself, something shown?
- (8 Oct, #12) "if a corridor, then the barrier here" (screenshot), not built. Reading A: the soul gate's bars move from the rest room's doorway to the far end of its corridor, where it opens into the next room. Reading B: something about NO WAY BACK's stone. Which barrier, and why there?
- (8 Oct, #16) the chasm lesson (`chasmLesson`) is back on THE CAVE in an empty room, undoing the 7 Oct move to THE YARD ("not in the cave"). Was the cave's look the problem?
- (8 Oct, heaven #14, #24, and #1) read as: no captions under the stands; the showroom at x2 in place of GOD's x3 (not on top); the hitching rail by the edge always stands (not only "in the right spot").
- (7 Oct) the goose's dare: a floor with nothing but BAAH, while the way out is a soul gate the last boss's soul lifts, so only fire, traps and geometry can clear it. The dare he meant, or may the voice kill?
- (6 Oct) the horse's dare floor counts were lost in dictation; three floors, 15 sacrifices each and 40 for the last are guesses.
- (6 Oct) the rabbit's dare turned the stealth test (ALT) on while worn: a key against rule 1. The rabbit's stand is locked for now (`QUESTS` has only the tortoise, goose and horse); does the stealth dare come back as a run modifier chosen in heaven? Tied to whether stealth stays.
- (5 Oct) THE ALTAR's first grass (`firstGrass`) adds a heart on top of the milk rhythm. Should it replace the first band's bowl?
- (3 Oct) the tortoise's reward is read as "every floor starts in iron" (`mods.armour`). Or a thing put on, a suit found on the floor?
- (3 Oct) GET OFF (`champion.shove`) answers the butcher and soul-carrying clubmen, not the yellow champions. Should they shove too?
- (3 Oct) RICOCHET is a grab passive soul. Did "extra level" mean a talisman tier?
- (2 Oct) "a high frequent crackle near an enemy" was read as the chase and fight hats (removed). If it was a fire's crackle, say so.
- (2 Oct) the second half of each tune (`THEME_BED`, eight-bar phrases) is new writing; which bar is wrong, if any.
- (1 Oct) a blast that rings the gong gives him its rush (`bell.buff`) wherever he stands, once a chain; a blast opens a cracked wall outright (`Prop.blastRoom`). Too generous?
- (1 Oct) BIG LUNGS also stretches THE FULL THROAT's daze: with RAW THROAT it dazes everything within 8.45 tiles (6.5 without). If the 30 Sep halving should hold, give `lungs` a smaller share for the stun.
- (1 Oct) the curves moved round the shieldman's intro room (THE THRESHING FLOOR 10 → 22 to 14 → 23, THE DARK 5 → 14 to 7 → 16, THE RAFTERS' top 34 to 37) await his OK.
- (1 Oct) SECOND CHANCE is once a floor (`game.secondUsed` reset per floor). Under PERMADEATH should it be once a run (reset at run start, saved)?
- (1 Oct) white souls not yet collected in the room he dies in are lost; or should they rise with his own soul?
- (1 Oct) refusing an animal sends it away for the floor, the hen and tortoise too (`Beast.refuse`). Right?
- (1 Oct) THE MAGNET's orbit always takes a club blow with its nearest orbiter, whatever the angle; only a bullet has to meet one. Should a blow have to meet it too (`magnetBlock` asks the angle)?
- (1 Oct) the husky's two extra men (`husky.extra`) come in through the room's way in when her song starts; any BAAH form counts on the beat, breath and spit included. Right?
- (1 Oct) DOUBLE SPEED OUT OF A FIGHT (`fastCalm`) doubles his stride, not the clock.
- (7 Oct) a horn per run: BIG and LONG are now the god's (fifty souls, picked at the edge). Is that the answer, or should a run also roll or earn one?
- Story, never answered: where his wife is and what the ending does about her; the "lizards" half of "lizards and mirrors".

---

## Open

### system
- (8 Oct) **UPGRADED SKILLS** (`meta.upgraded`, the god's third ask: a hundred souls and a corrupted one): only the name exists. What it does is not built.
- (8 Oct) a heaven upgrade that raises the heal between floors (`goat.floorHeal`, 1 now): "a tree upgrade later".
- (7 Oct) the other stands (hen, crow, pig, rabbit, husky, fish) have plain costs; still to build: corrupted-soul costs, finds and secrets as conditions, and chains of their own (the concept's pond, nest, flock).
- (7 Oct) a later soul that changes the verb itself, "whip horns" (a lash, more reach and a curve), and souls that pay off per horn (LONG: pierce, BIG: sweep).
- (7 Oct) more FLANK layouts (a trench round an arena's men, a trench with a bridge), and a quest or combo that uses one.
- (7 Oct) ONE MORE LIFE after the first heaven visit is "to be taken away later".
- (6 Oct) the overlook's run state (`game.runPaintings`) lives in memory only; a reload loses which towers are gold.
- (1 Oct) **stun, the third element set** (parked, "don't bother for now"): each stun soul buys grace off `stunGoat` (½, 1, 2 s) and lengthens the stuns he deals; all four make a stunned man forget the goat (`lastSeen` cleared). Only three souls stun (THE FULL THROAT, DEAD WEIGHT, LEAPFROG), two of them roll actives, so it needs one or two new stun souls first. Its unbuilt headbutt idea: hold to lower the horns, a frontal parry (a parry staggers the striker and spends his run-up, a wall stops him like the butcher); never frontal i-frames (rule 4), never bullets ("horns are not iron").

### feel
- (7 Oct) the free animals' lives in heaven are a first sketch (wander, honk, a flock round the sky, grazing); the concept's scenes between them are not built.
- (7 Oct) a picture of each horn on the goat himself (only the LONG HORNS antlers exist; the HUD has a horn picture since 8 Oct) and a windup preview of the hit shape.
- (5 Oct) the sleeping bells and the bell song are only in heaven, not in THE SHOWROOM (rule 9).
- (1 Oct) keyword tips (`KEYWORDS`) work on the cards and the book only; the rail's note closes when the pointer leaves the chip, so a word in it cannot be pointed at.

### number, first guesses waiting on a playtest
- BIG and LONG (reach, windup, `tipMul`, `shaftMul`), retuned 7 and 8 Oct, never played by anyone else.
- Heaven: the horse's stable 40, the overlook 30 (`home.tower.cost`), the pour rate 14 a second (`home.pour.rate`), the extra life's half of the hearts.
- The trench room on 60% of floors (`rooms.flank.chance`); the chasm on 45% of floors from the third (`chasm.chance`), maybe too many.
- The fish's reward (the first fire a floor only steams) and the horse's nine hearts.
- THE HOOK OVER THE DROP is rare in a natural run; `combos` `pits` 6 would raise it (for the later level rebalance, his word).
- The grab (24 Sep): does `grab.bite` 0.18 s read as preparation or as lag; is FIREBRAND's 3 s line long enough to split a room; does BY THE COLLAR still out-pick the scream actives at `BOON_POWER` 1.3.
- Threat over power: `balance.js` says THE THRESHING FLOOR and THE OSSUARY ask less of the goat than the floor before (9.4 after 10.0, 10.1 after 10.8). A question of `BOON_POWER` weights, a design call.
- The adaptive resolution (`perf.adapt`) is a guess at his laptop; unverified there.
- How long heaven holds a player between deaths: nobody else has played it.

### bug, not reproduced (ask for the run code next time)
- (7 Oct) the screen blinks after 5 s of moving the mouse; the likeliest cause is fixed (`game.resizeNext`). If it still blinks: which browser, on battery, SHOW FPS on?
- (6 Oct) walking through a door looks strange (screenshot): a door is passable from half its swing (`open` 0.5) while still drawn sweeping through him. Which door, who opened it?
- (30 Sep) controls going missing; 1.85 fixed a parked pad axis. If again: another device plugged in? still or moving but not turning? right after a box or a soul card? did Escape bring them back? the run code.
- (30 Sep) "a man teleported behind the fence", read as the boss mage blinking onto the stairs' gate (fixed). If it was the goat: a roll, a blink, or a body shoved into him?
- (23 Sep) the wheel lesson's near man ran past the arm untouched. Speed ruled out; check that seed's spawn and the `trapSense` pin (`millLesson`).
- (15 Sep) "a kill already counted in the first room". The run code carries `firstKill` (what, how, when), so the next report names it.
- (23 Sep) phone controls vanishing: never checked on a real phone.

### small, known, left as is
- (5 Oct) `Heaven.drawMarks` builds a few small arrays every frame.
- (5 Oct) THE NOSEBAG swapped away and bought again brings its old tufts back.
- (2 Oct) garbage: most of it is fixed by `CANVAS_STATE`; left are the browser's own `drawImage` (~160 a frame), font sets and heap promotion, minor collections 1 to 2 a second. A frame over budget at one of them wants DevTools' Performance panel on a real machine before more surgery (a sampling heap profile counts everything alive at stop; the trace's GC reasons are what tell you).
- (24 Sep) `floors-12` (gravel) is packed into `js/pixel-env-assets.js` and drawn by nothing since the 25 Sep art pass: add it to `$Skip` in `tools/pack-pixel-env.ps1` and re-pack.

### tool
- (8 Oct) for the bot, still to walk: hearts between floors (die on floor 2+ in LEVELS or THE SHOWROOM and restart; quit mid-floor and CONTINUE: `levelHp` never full by mistake, never 0); E - ROLL in the corridor over many THE ALTAR seeds (on floor, not a wall top; how often it falls back inside); the bell's flight on every floor's last boss (never a pit, a shut door, stone or the stairs' gate; quit mid-flight and CONTINUE); THE ALTAR AGAIN's bell man (`e.bellMan`); the hound's first room still winnable; the chasm lesson's words never under a boulder or tall grass; the grass rustle never spams (THE CAVE, THE TRIP); the opening's music through the prologue to the title; heaven's horns after the fifty, the third ask waiting for a corrupted soul, the purse's goal 50 then 100; the posters' floor size, tearing and big view.
- (3 Oct) the friend's autoplay bot (`tools/autoplay-bot.js`) as a base for playtest numbers: its strength turned up or down (how often it uses skills, how it reads a room, how it reacts to a hit), then used for balance and judging levels. Only kept and runnable now.
- (6 Oct) the stats worker's shape checks for `rm` / `path` apply only after a worker redeploy (it already accepts them).
- (6 Oct) the review's design suggestions I1 to I8: `output/review-2026-10-06/TASKS_UK.md`.
- (29 Sep) threat over power ignores the `MIRROR` ranks (a full mirror is +2 hearts, +2 light, a quicker roll); it is printed by `balance.js` only, not on the dev drawer's BALANCE tab, and flags rather than fails.

---

## Parked and decided against

- **Parked, "later", not without asking** (26 Sep): the Priest boss, the later acts, the hunt, hell, heaven as a secret ending; `MARKET.md` §9 (gore, price, publisher, a GIF export). Notes for when they come back:
  - *Hell*: a second curve and deck, `met` / `known` reset at the act's border, hearts back to four, a death in hell restarts hell; a deck that bends the world, not the goat (witchfire, mist, drops, wraiths, seers); entry in order after the last stairs or earned Spelunky-style (the vault as the hook); a canon and four templates a level.
  - *Heaven as the secret ending*: a run with no soul swallowed. Impossible today; the way in would be a soul that is also an `item`, a gate taking one thrown at it ("killing is allowed, swallowing is not").
  - *The hunt*: past `hunt.after` × par men walk in from the entry. THE CHASE is the nearest built thing.
- **Decided against**: hearts that grow by floor (26 Sep); the chain headbutt (26 Sep); a souls resource, one soul per man (23 Sep: "the economy only distracted"; its three sinks were the vault priced in souls, a priced third card, a meta head start); the soul barrier (14 Sep: it makes every run a clearing job; if it ever returns it guards only something optional, never the exit); an invulnerability bubble after a hit (23 Sep, rule 4); the bell song as "Du Hast" (5 Oct, a licence; an original march plays).
- **Not to be undone** (24 Sep, the grab): DEVOUR stays deleted; lifting a man has a windup and a mid-swing grab is allowed; the throw's lethal range stays under the headbutt's; a man costs a longer grab wait and the card says so; carrying a man is 0.6 of a stride; VENOM JAW and FIREBRAND as they are, no explosion. LEAPFROG stays an active (26 Sep).
- **No change** (26 Sep): THREAT stays priced as it is. **Dropped, do not ask again**: a feature freeze, the phones line in the invite, tester groups, a weak-laptop pass.
- **Deliberately not fixed** (14 Sep): a man hears you through stone. Noise is the counterplay to the sight cone; if it comes back, attenuate `emitNoise` by path, not by line.
- **Not taken now** (5 Oct, testers): agency between runs (the skill structure changing the next time), the sheep's picture between runs.

---

## Kept, and worth protecting

- **The wraith goes through walls** (14 Sep): called the best thing in the build, unprompted. It becomes a body only behind you, never inside stone; never give mist a wall to respect.
- From the first sittings (14 Sep), rules: a trap has to look like an object (flat in the floor reads as decoration); a line that names a verb names the button; a lesson needs a thing in the same room to use it on, and a teaching room has no way round the lesson; a thing that lives in the floor covers ground (bands of 9 to 15, never two or three); not every door is the same door (iron only in front of something worth the blows).
- Score: time is the axis, kills only the multiplier, "a clean fast run beats a slow massacre".
- If "the scream stun is too big" comes back, the lever is the stun's duration, not its radius.
