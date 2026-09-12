# GOAT OUT
## Concept and prototype brief, v0.1 (stage 1)

Working title: **Goat Out** (alternative: *Scapegoat*).
Date: 12 Sep 2026. Status: pre-production. Next step: stage 2, build the prototype defined in sections 11 and 12.

---

## 0. The pitch

You are the goat. They were driving you to the altar. The truck fell off the bridge. Four men died. You survived. Now the whole cult wants its sacrifice back.

A top-down, one-life, procedurally generated escape in the spirit of Ape Out. You do not fight. You run. People happen to be in the way.

Level-clear card: *"Will there be sacrifices?"* ... *"There will be sacrifices."*

---

## 1. Fantasy and tone

- **Deadpan slapstick horror.** Cult of the Lamb's cute-over-blood contrast, Goat Simulator's "the goat is an unstoppable physics object", Ape Out's poster-art violence.
- **The joke:** the sacrifice is the only thing in the building that refuses to die. Cultists die in comedic quantities. The goat never chooses violence, it chooses the exit.
- **The goat never talks.** It screams. Goats scream like people, and in this game that is a mechanic.
- **Setting:** a fictional masked cult in an unnamed hot country. Not a real religion or nationality (see section 10). The meme survives as the prologue title card.

---

## 2. Design pillars

1. **Run, don't fight.** The objective is always the exit. Kills are a side effect of moving through people. Skipping a room is a valid, sometimes correct, choice.
2. **Clunky on both sides.** Every attack has windup and recovery. No cancels, no combos, no dodge roll, no lock-on. Your defense is movement, geometry, and a human shield.
3. **Geometry kills.** A headbutt alone only knocks a man down. A headbutt into a wall, a pillar, a brazier, another man, or off a ledge kills. The room is the weapon.
4. **One life, new level.** Death regenerates the level in under a second. No memorised routes; you improvise. (This is exactly why Ape Out's creator kept procedural generation: reacting on the fly instead of memorising.)
5. **Noise is the score and the system.** Percussion swells with threat. Every loud thing (shots you provoke, pots, bells, your scream) pulls enemies toward it.

---

## 3. What we take from each reference

| Reference | Take | Leave |
|---|---|---|
| **Ape Out** | Two-button control (push and grab). Grab as human shield, throw into walls. Wall kills, not hit-point kills. Three hits of health. Procedural mazes. Drum score keyed to action, cymbal on kills. Blood as paint. | The gorilla's raw power fantasy. Jazz (we use ritual percussion). |
| **Cult of the Lamb** | Cute-versus-cruel contrast. Masked cultists. Red, black and cream ritual iconography. Braziers, altars, idols as props. Folk-horror surface. | Base building, roguelite upgrades. |
| **Goat Simulator** | Goat as absurd physics agent. Headbutt as the primary verb. Ragdolling humans. The tongue-drag idea becomes our grab. Deadpan comedy. | Sandbox aimlessness. |
| **Quasimorph** | Detailed, readable low-res pixel sprites where every unit is instantly distinguishable. Grim, high-contrast palette. Top-down camera. | Turn-based pace, inventory. |

**Fresh input from the research pass**

- **Bloodroots:** almost every object is a weapon, and it breaks after one use. Levels are small arena bursts of intensity, deliberately cut down, not endurance. Fireworks light dry grass and fire spreads to enemies. We take: pots break on use, hay burns and spreads.
- **Untitled Goose Game:** a tiny verb set (grab, pull, honk) makes physical comedy. Humans tidy up after you, so mischief is cyclical. We take: scream as our honk; later, cultists re-light braziers and re-close doors.
- **Hotline Miami:** sub-second restart, one-to-three-minute levels, the rage-restart loop.
- **The scapegoat rite:** two goats are chosen, one is killed, the other carries the sins and is driven into the wilderness and cast off a cliff. We take: an act structure ending on a cliff (the rite inverted), ritual paint on the goat's coat, "Azazel" as the final level's name.
- **GOATWRATH (Ludum Dare 43)** is the closest existing goat-plus-sacrifice roguelike and it is a small jam game. The niche is open.

---

## 4. The goat (player)

Prototype verb set. Exactly these, nothing more.

| Input | Verb | Rules and feel |
|---|---|---|
| WASD / left stick | **Move** | Fast and momentum-heavy. 0.15 s to top speed, 0.25 s to stop. Top speed about 1.3x a cultist's run. At speed the goat cannot turn on a dime, so corners matter. |
| Mouse / right stick | **Aim** | Facing direction for headbutt and throw. |
| Left mouse | **Headbutt** | Short lunge, about 1.5 body lengths. Windup 0.12 s, active 0.15 s, recovery 0.35 s, no cancel. On hit: strong impulse in the lunge direction. Man into wall, pillar or hazard: dead. Man into man: both floored 1.0 s. Man into open floor: floored 0.8 s, then gets up. Heavy: staggered 0.4 s, pushed one tile. |
| Right mouse (hold) | **Grab** | Catch the nearest man in reach by the clothes and hold him in front. While holding: 70% speed, no headbutt. He absorbs two bullets and any swing aimed at you. He struggles free after 3 s unless thrown. A grabbed Hunter keeps firing wherever he is pointed, so you can aim him. Cannot grab the Butcher (hoof slip, 0.3 s vulnerable). Can grab pots and lamps. |
| Right mouse (release) | **Throw** | Same rules as headbutt with a stronger impulse. A thrown man kills what he hits and dies on the wall. |
| Space | **Scream** | 0.3 s. Noise radius 12 tiles. Everyone who hears it turns and comes. Cooldown 4 s. (SHOULD tier.) |

**Health.** Three hits, no regeneration, no checkpoints. Melee swing 1, bullet 1, Butcher cleaver 2, standing in fire 1 per 0.7 s. Each hit leaves a blood trail and smears the goat's white coat red, so health reads on the character. A small bar is also shown in the prototype.

**Juice checklist.** Hitstop 70 ms on kills. Screen shake scaled by impulse. Blood and hay particles that persist for the whole level. Camera leads two tiles toward the aim.

---

## 5. Enemies

Level 1: Bearers (melee). Level 2: Bearers plus Hunters (ranged). Both levels: one Butcher in an arena room.

**Bearer** (melee, one hit to kill by wall, throw, fire or friendly fire; a plain headbutt only floors him)
- Speed 0.85x goat. Sees 8 tiles in a 90 degree cone. Hears per the noise system.
- Within 1.2 tiles: windup 0.4 s with the club visibly raised, swing 0.15 s, recovery 0.5 s. A hit deals 1 and knocks the goat back one tile.

**Hunter** (rifle, one hit to kill)
- Keeps 5 to 8 tiles away and backs off if you close in, slower when walking backwards.
- With line of sight: aim 0.6 s with a visible aim line, fire, reload 1.2 s.
- Bullets travel (about 25 tiles per second), so shields and lateral movement matter.
- Friendly fire is on. Bullets kill cultists and Hunters do not care. This is the main chaos engine, as in Ape Out.

**Butcher** (heavy, the "fat guy")
- Dies after three headbutts, or two plus one self-inflicted charge into a wall. Fire counts as one hit per second.
- Cleaver: windup 0.7 s, 120 degree arc, 2 damage.
- Charge: if the goat is four or more tiles away in a straight line, he charges. Fast, 1.2 s, cannot steer. Into a wall: stunned 1.5 s (free hit). Into the goat: 2 damage.
- Room: small, about 10x8 tiles, two pillars. Intended rhythm: bait the swing, step out, headbutt, run, repeat. Or bait the charge into a pillar.
- Cannot be grabbed. Can be burned.

**Later roster**
- **Priest** (boss): chants, and every chant re-summons two Bearers. Dies in one hit but hides behind a wall of Bearers.
- **Netter:** throws a net. Two seconds immobile. Instant death if a Bearer reaches you in time.
- **Drummer:** his drum doubles everyone's hearing radius. Killing him silences the room.
- **Dogs:** fast, one hit, cannot be grabbed.
- **Torchbearer:** carries fire. Knocking him down starts a fire where he falls.

---

## 6. Environment and improvisation

Three rules: everything with mass reacts to impulse; everything loud has a noise radius; fire spreads over hay and rugs and hurts everyone, goat included.

**MUST (prototype)**
- Walls and pillars: the kill surfaces.
- Braziers: static fire. A man knocked in ignites, runs for 2 s, dies, and lights any hay he crosses.
- Hay patches: fire spreads tile to tile every 0.4 s, burns 3 s, leaves ash.
- Clay pots: grab and throw. Breaks, floors one man, noise 8 tiles.

**SHOULD**
- Oil lamp on a post: headbutt the post and it falls into a 2x2 fire pool for 4 s.
- Bell or gong: headbutt it for a 30-tile noise. The whole level converges. Also the tool for pulling Hunters into corridors.
- Tables: pushable, stop bullets, flippable for cover.
- Doors: closed by default. The goat bashes through. A man standing behind the door gets floored.
- Ledges, wells, cliff edges: pushed men fall and die. So does the goat.

**LATER**
- Mirrors. Two candidate uses: a polished shrine mirror the Butcher charges when he sees "another goat"; or Hunters wasting shots on your reflection.
- Cages of chickens: free them and they become a decoy swarm.
- Chandelier on a rope: throw a man into the rope and it drops.
- Incense smoke that blocks vision cones. Rolling barrels. The truck.

> Transcription note: your message came through as "lizards and mirrors" in the environmental-puzzle part. I read it as puzzle objects and put mirrors under LATER. Tell me if you meant something else (lasers? ladders?).

---

## 7. Levels and procedural generation

**Prototype: two levels.**

- **Level 1, The Altar.** Interior: sacrificial hall, corridors, kitchens, gate. Bearers only, one Butcher arena. Props: braziers, hay, pots, tables, oil lamps. Palette: dark plum, ochre, blood.
- **Level 2, The Yard.** Courtyard, animal pens, market stalls, a well. Bearers and Hunters, optional Butcher. Props: carts, bell, fences, well. Palette: bone-white sun, dust, red.

**Full game sketch (later).** Prologue: the truck on the bridge, a 20-second playable crash aftermath as the tutorial. Act 3, The Road: trucks, roadside, cultists firing from truck beds. Act 4, The Cliff: the rite inverted, the Priest goes over.

**Generation: the room chain.**
- A level is 6 rooms (Level 1) to 8 rooms (Level 2) in a chain that always trends in one compass direction. The exit is always up-right. Zero or one short side room.
- Rooms come from a hand-authored template pool (target 12 per level, sizes from 10x8 to 16x12 tiles), randomly rotated and mirrored, with pillars and props baked in so every room has kiting loops.
- Rooms join through short corridors with a door. Corridors are the kill zones: walls on both sides.
- Enemy budget per room ramps toward the exit. Enemies never spawn within 5 tiles of your entry door. Room 1 is empty. The Butcher gets his own arena template around room 4.
- Seeded random. Death means a new seed. The seed is printed in the corner for bug reports.
- Direction cue: light and dust drift toward the exit. The exit is a bright gap in the wall with daylight behind it.
- Validation after generation: exit reachable (flood fill on the tile grid), no spawns inside walls, no fire source adjacent to the start room.

---

## 8. Sound and music

- **Score = ritual percussion driven by threat**, where threat is the number of enemies currently aware of you. Zero: a heartbeat drum. One or two: hand drums. Three or more: full drums and a low chant. Any Hunter aware: add a metallic shaker. Bell rung: a sustained drone under everything.
- **Accents.** Kill: a gong or crash hit. Death: hard cut to silence, one bell toll. Level clear: the "There will be sacrifices" card over a single deep drum hit.
- **In-world noise system** (radius in tiles): footsteps 2, headbutt 5, wall splat 8, pot 8, gunshot 14, scream 12, bell 30. Enemies inside the radius walk to the point. This is the cascade: one Hunter's shot wakes the next room.
- **Prototype implementation:** WebAudio-synthesised drum layers toggled by threat. No assets, about a day of work, large payoff in vibe.
- The goat scream is the one sampled sound worth recording early.

---

## 9. Art direction

- **Camera.** Top-down, near 90 degrees like Quasimorph. 16 px tiles at 3x to 4x zoom, about 24x14 tiles visible. The camera leads toward the aim.
- **The look in one sentence:** detailed pixel creatures on poster-flat backgrounds. Characters get Quasimorph-grade low-res detail and hard silhouettes; environments are flat bold colour blocks like Ape Out, so the action reads at speed.
- **Palette v0** (six colours plus fire): ink `#1a1016`, plum shadow `#3b2233`, ochre `#b9873a`, bone `#efe6d0`, blood `#c0392b`, cult purple `#5b4a8a`, fire `#f2a233` and `#ffe08a`. The goat is the only bone-white thing on screen.
- **Cult iconography.** Bone masks, red sashes, horn motifs, invented glyphs. No real script, no real symbols.
- **Blood as paint.** Persistent splats and hoof prints. By the end, the level is a record of the run. Screenshots are the marketing, as they were for Ape Out.
- **Prototype visuals.** Geometric placeholders in the final palette: goat = bone oval with horns, Bearer = ink circle with red sash, Hunter = the same plus a rifle line, Butcher = 1.8x circle with a cleaver. The pixel-art pass comes only after the loop is proven.

---

## 10. Sensitivity note

The meme is about a real place and a real practice. The game should read as "a cult", not "a country": masks, invented glyphs, an unnamed setting, the way Cult of the Lamb does it. The prologue keeps the joke, the enemies are cultists rather than villagers, and the art gets more freedom as a result.

---

## 11. Prototype scope (stage 2)

**MUST**
- Movement, camera, hitstop and shake.
- Headbutt and wall kills. Bearers. Death and instant regeneration.
- Room-chain generation with about 8 templates. Level 1. Exit and level-clear card.
- Grab, shield, throw. Hunters with travelling bullets and friendly fire. Level 2.
- Butcher. Braziers, hay fire, pots. Noise and hearing system.
- Three-hit health, one life, seed display.

**SHOULD**
- Scream. WebAudio drums. Bell. Oil lamps. Doors. Tables. Persistent blood. Title cards.

**LATER**
- Everything in the LATER lists above. Gamepad. Pixel art. Priest. Acts 3 and 4. Mirrors.

**Out of scope for the prototype.** Meta-progression, unlocks, saves, menus beyond a title and a death screen, story beyond title cards.

**Success criteria. The prototype must answer these.**
1. A headbutt into a wall feels good within the first ten seconds.
2. At least one grab-as-shield moment happens per Level 2 run without being told to do it.
3. The Butcher room produces the bait, hit, run rhythm without a dodge button.
4. Levels run 1.5 to 4 minutes, restart in under a second, and players restart immediately after death instead of quitting.
5. Rooms read as places. Players know where the exit is most of the time.
6. Fire creates stories, not unfair deaths. Tune spread speed until that is true.

---

## 12. Tech recommendation for stage 2

Build the prototype as a single HTML page: vanilla JavaScript, Canvas 2D, WebAudio. No engine, no build step.

- Fixed-timestep loop, circle-versus-tile collision, impulses, and a tiny physics layer of our own. The feel is the point, so we want full control of it.
- Runs by opening the file. Testable in the app's browser pane. Shareable as a link.
- Data-driven: room templates as text arrays, all tuning values in one `TUNING` object so we can iterate live.
- Why not Godot now: it needs an install and cannot be playtested inside this session as fast. Why not Phaser: a dependency that does not give us the physics feel we need.
- When the loop is proven, port to Godot 4 (GDScript). Every number in this brief carries over.

**Milestones**
- M0: feel. Move, camera, placeholder goat, shake.
- M1: headbutt, walls, Bearers, death and restart.
- M2: room chain, Level 1, exit. First playtest.
- M3: grab, shield, throw, Hunters, friendly fire, Level 2.
- M4: Butcher, fire, pots, noise system.
- M5: drums, scream, title cards, juice pass. Second playtest, then decide on the Godot port.

---

## 13. Open questions

Defaults are in bold. Stage 2 proceeds with the defaults unless you say otherwise.

1. Tech: **Canvas and JavaScript prototype now**, Godot later.
2. Setting: **fictional masked cult**, meme as the prologue card only.
3. "Lizards and mirrors": what did you mean?
4. One life means **one life per level** (Ape Out) or one life per whole run (roguelike)?
5. Title: **Goat Out** or Scapegoat?
6. Controls: **keyboard and mouse first**, gamepad later.

---

## 14. Idea backlog (unranked)

- The goat starts painted with ritual marks and garlands. Blood smears them as you take hits. Health as costume.
- Two goats: the rite uses two. A second goat as a chaotic AI companion you can free, or local co-op.
- Cultists tidy up (Goose Game): re-light braziers, drag corpses, re-close doors. Lingering becomes dangerous.
- Eating: hold a key on rope, net, scroll or fuse to chew through it. Goats eat anything. Slow, funny, risky.
- Goat-only paths: goats climb. Tables and crates are walkable for the goat but block men. A generation feature: escape routes men cannot follow.
- Score card: kills, time, men burned, pots broken, screams, closing on the goat's survival line.
- The truck level: moving vehicles, cultists firing from truck beds, the bridge as finale.
- Photo mode and GIF export: the blood-painted level is an artwork, and sharing it is marketing.

---

## Sources

- [Ape Out review, Cultured Vultures (three-hit health)](https://culturedvultures.com/ape-out-review/)
- [Ape Out review, GameSpot (push and grab, dynamic drums)](https://www.gamespot.com/reviews/ape-out-review-guerrilla-gorilla/1900-6417095/)
- [Ape Out review, Gamecritics (scoring to the beat, cymbal on kills)](https://gamecritics.com/mike-suskie/ape-out-review/)
- [Gabe Cuzzillo interview, NY Game Critics (why procgen stayed)](https://nygamecritics.com/2019/04/16/the-circle-interview-creator-gabe-cuzzillo-on-how-ape-out-changed-during-5-years-of-development/)
- [Behind the Jackie Chan-inspired combat of Bloodroots, Game Developer](https://www.gamedeveloper.com/design/behind-the-jackie-chan-inspired-combat-of-i-bloodroots-i-)
- [Bloodroots review, GameSpot (one-use weapons, fire spread)](https://www.gamespot.com/reviews/bloodroots-review/1900-6417417/)
- [Cult of the Lamb cute aesthetic interview, Game Developer](https://www.gamedeveloper.com/design/interview-corralling-the-inherent-cuteness-of-cult-of-the-lamb)
- [Cult of the Lamb art director interview, Inverse](https://www.inverse.com/gaming/cult-of-the-lamb-concept-art-interview-massive-monster/amp)
- [Behind the HONK, Untitled Goose Game Q&A, Game Developer](https://www.gamedeveloper.com/design/behind-the-honk-an-i-untitled-goose-game-i-q-a)
- [Goat Simulator wiki: Headbutt](https://goatsimulator.fandom.com/wiki/Headbutt)
- [Goat Simulator wiki: Tongue](https://goatsimulator.fandom.com/wiki/Tongue)
- [Quasimorph impressions, Turn Based Lovers (unit readability)](https://turnbasedlovers.com/review/quasimorph-impressions/)
- [The scapegoat, Jewish Encyclopedia](https://www.jewishencyclopedia.com/articles/13244-scapegoat)
- [Why the goat for Azazel was pushed off a cliff, TheTorah.com](https://www.thetorah.com/article/the-goat-for-azazel-why-was-it-really-pushed-off-a-cliff)
- [GOATWRATH, Ludum Dare 43 entry on itch.io](https://elingranath.itch.io/goatwrath)
