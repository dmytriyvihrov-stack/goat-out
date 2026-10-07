# BACKLOG, asked for, not built

`CONCEPT.md` is what the game is. This file is what the last person to play it said afterwards, kept in
his order and written out far enough that a session can take any line off it and build the thing without
asking him again. Nothing here is in the build. An item leaves this file when it ships, the reasoning
then goes to `CHANGELOG.md`, or when it is decided against, and the reason goes in its place.

Batches are dated. Tags: **bug**, something is wrong; **feel**, it works and does not read; **number**,
it works and the number is wrong; **system**, it does not exist yet; **tool**, for whoever builds it, not
the game.

## 7 October 2026, his 36 notes with screenshots, batch 1 of 2 (shipped the same day, not yet deployed)

Split in two at his word ("if needed split into two batches"): this batch is the fixes and the numbers; batch 2 is
heaven made over (the animals' stands and quests, permadeath and the extra life, the rooms up there), below.

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | feel | a companion's death must be shown clearly: an important event, the start of its road and the end | `Beast.farewell`: killed, fallen or left behind, the world slows and stops a beat, pale cells rise off it, a plate drops over the top of the screen with the animal on it (THE PIG IS DEAD / WAS LEFT BEHIND), `beast.farewell`. |
| 2 | feel | the drop's lesson: not in the cave (screenshot), in an empty room where I can try that roll the first time | `chasmLesson` moved from THE CAVE to THE YARD, and its room is emptied of men and made calm (never hung, never an introduction or a boss's room): room 2 of THE YARD on all 150 seeds tried, 0 men. |
| 3 | number | horns: BIG a bit less radius, a lunge, longer wait; LONG a forward lunge, the two horns a bit shorter, show where they hurt, middle wait; DAGGER short lunge, short wait, pushes ONE man | DAGGER `single` (the nearest man in the arc, nobody else that lunge); BIG reach 0.85 → 0.35, lunge 1.1, wait ×1.55; LONG reach 1.45 → 1.0, lunge 1.4, wait ×1.2. Where they hurt: the wave (tips bright) and the HORN TOOL's zone (7). |
| 4 | feel | CONTINUE: if you did not die, back to the level, not to heaven | `resumeRun` lays the saved floor and he is on it, no heaven. |
| 6 | feel | the title: a different tune that starts much calmer and picks up speed | `TITLE_TUNE` and `GameAudio.playTitleStep`: pad and a slow flute first, then bass, drum, gallop, kick, a plucked line, rim; tempo 74 → 118 over 80 s on the screen (`audio.title`). |
| 7 | tool | the horns' length as a picture, and in dev mode change them right in the run, a mini tool showing the skill with its axis | DEV MODE → HORN TOOL: sliders for every number of the horn he has, live, SAVE to tuning.js, COPY, ONE MAN / ALL MEN; ZONE draws the hit shape on the floor along his aim, the axis ticked per tile with its length. |
| 8 | feel | NO WAY BACK: not at random, on the floor by the shut door, if you turn back more than a room | written on the floor of the open side by the first mouth the clamp shuts (`game.clampWords`), gone for good once read (`clamp.readR`, `readFor`). |
| 9 | feel | as in Hades, extra impact when the horns land, so it is seen | `Game.hornSplash`: a slash of cells across the man, a hot streak and a ring, white for a beat, a little hitstop; LONG's tips gold and harder. |
| 10 | number | not died before the third floor: 1.5x the men there, 2x from the fourth, so you reach heaven and the gathering | `TUNING.thick`, `Game.crowdFor`: the ordinary rooms' budget and head cap ×1.5 / ×2 until his first visit to heaven. |
| 12 | bug | moving the mouse round for 5 s while he moves, the screen starts to blink | NOT REPRODUCED here; the likeliest cause fixed: the adaptive resolution resized the canvas after the frame was drawn, so the screen showed a cleared canvas each step (`game.resizeNext` now resizes before the draw), and it no longer climbs back up on the same floor. If it still blinks: which browser, a laptop on battery, SHOW FPS on? |
| 13 | feel | an even clearer animation of taking damage, so I register it | a lost heart: he is a white then a blinking red silhouette, a red slash across him along the blow, and the heart in the HUD swells, splits and falls (`juice.hurtLook`, `juice.heartBreak`). |
| 14 | feel | the light's switch (the cleat) is usually at the start of the room, so I can use it (screenshot) | `chandelier.cleatIn` 0.8: the cleat by the way in, the ring toward the way out as far as the rope reaches. |
| 15 | feel | the arrows over the edge: later, give a person time to find it themselves | `heaven.arrows.after` 25 → 75 s. |
| 16 | feel | the halo more on top of the goat god (screenshot) | the hoop floats over the tips of his horns. |
| 17 | number | a bit less heavenly grass (screenshot) | 16 tufts → 7. |
| 18 | feel | an animal starts its talk only when no enemies are left in the room | `Beast.quiet`: let out in a fight it waits and talks the moment the room is still. |
| 19 | feel | the destructibles: you have to find one, press the right button, and only then it opens | the scrap no longer opens when walked near; a GRAB on it opens it (`Prop.openScrap`). |
| 20 | feel | the first mouse: no lesson needed (screenshot, the second line struck out) | her room's floor says only WALK UP TO HER · RIGHT M. CLICK. |
| 21 | bug | make it pretty and aligned (screenshot: FOR THE GOD under the purse) | the line is flush with the purse's right edge. |
| 22 | feel | the goose's honk does not stun the enemies, at least the first version when you meet it; now it honks all the time and stuns them | `goose.balks` false: the honk is the alarm only; its texts say so. |
| 24 | feel | at death show the floor in one line too (screenshot) | `painting.death.oneRow` 14: the floor he died on is one strip. |
| 25 | feel | kills and souls gathered are two different numbers; after the floor show the souls, maybe kills apart | the clear card shows N KILLS and N SOULS GATHERED; the death card's skull is the souls gathered on the floor, the kills in words (`game.floorSouls`). |
| 27, 36 | feel | the modifiers' thing (the hitching rail, screenshot) only when there are modifiers | the rail stands only while a dare is worn, its shadow under the whole rail; the HUD's dares were already shown only when worn. |
| 28 | system | save the heaven-for-the-animals concept from his GPT talk | CONCEPT.md, *Heaven as the animals' home (direction, not a spec)*, with his first three chains. |

## 7 October 2026, his 36 notes, batch 2 of 2: heaven made over (shipped the same day, not yet deployed)

| # | tag | note | what shipped |
|---|---|---|---|
| 5 | system | the animals' stands: at the start one is mended and the rest broken; mend each to open a new animal, for souls (later ones corrupted souls too); some need finds or secrets | `Heaven.standState` (js/heaven-home.js): open (tortoise, goose), broken (the horse, 40 souls poured in), locked (the rest, a padlock); only open kinds are dealt into runs (`Beast.deal(…, allow)`). Corrupted-soul costs and finds: not yet, the stands are locked. |
| 11 | system | the bell is left on the ground after a new boss, and you really pick it up, right click | `Game.dropBell`: the boss of a floor's last room carries one until that floor's is taken; GRAB takes it (`Heaven.gotBell`, `meta.bellsGot`); floor words the first time; THE SHOWROOM has one. |
| 23 | system | the overlook starts broken too, mended for souls | broken (leaning, grey, planks at its foot) until 30 souls are poured in (`home.tower.cost`). |
| 26 | feel | mending the mirror: walk up and hold the right button, souls flow out of you into the mirror until it is mended (Cult of the Lamb) | POURING: GRAB held at anything broken spends the heap into it, a white soul a time flying into it, a chime each, kept if you let go (`meta.poured`); the mirror takes its twenty that way. |
| 29 | system | three chains first (goose, horse, tortoise), the rest locked; a talisman for each; a quick way to test them | `QUESTS`: the tortoise (no running on a floor, his stride at a fifth; free, it walks heaven very slowly), the goose (a floor with nothing but BAAH; clean in the last room, geese honk back; free, it wanders honking and flies off round the sky with its flock), the horse (mend its stable for 40, win its race to bring it up; it lives in its paddock and comes to the fence; its dare: THE CHASE on two random floors; free, it runs where it likes). Talismans: TALLOW SKIN, BELLWETHER'S BELL, BRASS SPUR, off the shelves until won. Dev: HEAVEN tab rows (STAND, SAVED, DARE, WIN DARE, FREE, RESET). |
| 30 | system | permadeath: if you die you die; heaven's progress and unlocks stay | `TUNING.permadeath`: a death ends the run, heaven's edge and RUN AGAIN start a new one from THE ALTAR (`Game.beginRun`); not LEVELS practice or THE SHOWROOM. |
| 31 | system | one extra life by default, like Hades, back on the spot; given after the first heaven visit, taken away later | `heaven.extraLife`: a run begun after a visit carries one (`game.extraLives`), spent the way SECOND CHANCE is, back up with half his hearts; a white soul by the hearts. |
| 32 | system | after the mirror is mended the god asks you to mend an animal's stand, promising the horse in runs | `HEAVEN_TALK.animal` rewritten, `animalAsk` until the horse's stand is whole. |
| 33 | system | the blind shepherd asks you to beat bosses and take their bells, so he can play something | his quest and lines rewritten; the bells on his beam are the ones brought up (`bellsOpen`). |
| 34 | system | as an option: a small room with the god where you come back, then the animals, then the room as now: story, side tasks, your strength and the run's start | three rooms (`HEAVEN_MAP`): THE THRONE (god, shepherd, bells), THE STALLS (stands, paddock, dares' rail), THE EDGE (mirror, overlook, horns, feast, the jump). |
| 35 | system | lay the horns out before the jump (small, long, wide) so you can choose | three pairs on clouds by the lip (`hhorn`); GRAB one and it is yours, the itch build too (`HORN_KEY`). |

Still open from batch 2:
- **system**: the other stands (hen, crow, pig, rabbit, husky, fish): their cost (corrupted souls + souls), finds and secrets, and chains of their own (the concept's pond, nest, flock).
- **feel**: the free animals' lives are a first sketch (wander, honk, a flock round the sky, grazing): the concept's scenes between them are not built.
- **system**: the goose's dare asks for a floor with nothing but BAAH, and the way out is a soul gate the last boss's soul lifts: likely only by fire, traps and the floor's own geometry. Is that the dare he meant, or should the voice be allowed the kill too?
- **number**: the horse's stable 40, the overlook 30, the pour rate 14 a second, the extra life's half of the hearts: first guesses.

## 7 October 2026, the horns (dagger, BIG, LONG) and THE FLANK (shipped, not yet deployed), and the 6 Oct review

Shipped: DEV MODE → HORNS steps DAGGER (the horn as it was) / BIG (a deeper, wider arc, slower to swing) / LONG (two straight strips, the tips throw 1.4x, the shafts shove at half), `TUNING.goat.horns`, with a small wave of cells on the floor for each (`Renderer.drawHornWave`). THE FLANK: trench rooms (`ditchcut`, `ditchtee`, `ditchisland`) from THE CAVE on. The review's bugs B1 to B5 and the horse's NaN are fixed, the design suggestions I1 to I8 are tasks in `output/review-2026-10-06/TASKS_UK.md`. Not built, in his words and ours:
- **system**: how a player gets BIG or LONG (the itch build is always the dagger): rolled per run, a soul or talisman that changes the shape, or opened in heaven. His call.
- **system**: a later soul that changes the verb itself, "whip horns" (a lash, more reach and a curve); souls that pay off per horn (LONG: pierce, BIG: sweep).
- **feel**: a picture per horn on the goat (only the long-horns look exists) and a windup preview of the shape.
- **number**: BIG and LONG are a first guess (reach, windup, `tipMul`, `shaftMul`); the trench's chance (0.6 a floor) wants a playtest.
- **system**: more FLANK layouts (a trench round an arena's men, a trench with a bridge), and a quest or a combo that uses one.

## 6 October 2026, late, nine notes with screenshots (shipped the same day, not yet deployed)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | feel | the iron cage says "cost 1 key, right mouse click": not the headbutt, it must be a decision | a key is spent by GRAB (`Goat.tryGrab`, `Prop.unlockIron`); a headbutt only rings the cage (`Prop.ringIron`, says GRAB IT TO USE THE KEY or IT NEEDS A KEY). The floor words: RIGHT M. CLICK: COST 1 KEY. |
| 2 | feel | the mouse: I must really walk up to her and press the right button | her offer opens on a grab pressed within `shop.dlg.r`, no longer on standing there (`Codex.watchShop`); the floor words say WALK UP TO HER · RIGHT M. CLICK. |
| 3 | feel | the food on the tables a little more appetizing | `scatter.dim` back toward the painted colours (k 0.72 to 0.86, grey 0.35 to 0.12). Still a shade down, so it does not read as a pickup. |
| 4 | bug | two doors (screenshot): cannot be in the rules | a plain corridor door within `DOOR_APART` (7) tiles of a soul gate or a seal is taken down (it was 160 of 960 floors); `GEN_RULES.doors`. |
| 5 | feel | the ogre by the trap is smarter: hurt once, he does not leap a second time (screenshot) | read as the rat ogre: with a heart gone he no longer leaps onto a landing in the wheel's sweep or a fire, he stands and looks (`Enemy.updateOgre`). |
| 6 | number | the ogre alight is angry and attacks much faster | `butcher.rage` 1.5 / 1.5 to speed 1.8, tempo 2.4. |
| 7 | feel | the animal's yes / no buttons more in the game's style | pixel-notched plates in the box's own face, a notched key cap (`Beast.drawTalk`). |
| 8 | feel | draw the halo better | `Heaven.halo`: a flat gold hoop in cells, lit on its upper lip, shaded under, a glint going round, a glow; god and seats. |
| 9 | bug | walking through a door looks strange (screenshot) | NOT FIXED, not reproduced: a door is passable from half its swing (`open` 0.5) while it is still drawn sweeping through him. Which door was it, and who opened it? |

## 6 October 2026, night, the cape, the paper, the purse (shipped the same day, not yet deployed)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | feel | the cape should look like the inspiration (a pony with a hero's cape tied at the neck); now it covers the whole body, it should cover only a little | every view of every cape redrawn in `CAPE_PIXELS.VIEWS`, four times (too big, then "even smaller", then "it must not cover the rump, only part of the back"): tied in a bow at the throat, over the shoulders and the front half of the back, hanging a little down the side; rump, belly and legs show. Sheet: `output/capes-2026-10-06/sheet.png` |
| 2 | feel | it still shows his sides, and when he moves it moves a little in the wind; then "more in the wind" | real flapping (`TUNING.cape.wind`): off his speed and the clock, the lower rows stream back and ripple, and ("billow up more") the end rises up to four cells over his back like a flag; from behind it lifts its hem and ripples instead of swelling; standing it stirs. The back view redrawn as cloth ("from the back it looks strangest"): a bow under the collar, folds, a pointed hem, flanks showing. `walk.png` |
| 3 | feel | the cape chip a bit bigger and down and left, like Enter the Gungeon, so the cooldown is easier to see | `Renderer.drawCapeCorner`: a plate in the bottom-left corner over the dev word (`TUNING.hud.cape`), Q in its corner, the wait as a veil drawn down off the icon plus a bar up its right edge; ready, the rim lights gold. Touch keeps the old chip by the hearts (the corners are thumbs there) |
| 4 | system | destructibles: a scrap of paper on the floor that unfolds into a drawing when found; butt it to tear it; it goes in the finds and never lies on a map again; the first under the big table in the first room | the posters are scraps now (`kind: 'poster'`): folded on the floor (gen.js, half of them under a room's table), opening within `readR` tiles with nothing on it, its name said, marked found in `Unlocks` OBJECTS on the spot; a butt, a body or a blast tears it once it is open. `Game.layScraps` lays the breeds chart under THE ALTAR's ritual table and only drawings this browser has not found. `GEN_RULES.posters` rewritten for the floor |
| 5 | tool | tools/god-talk.html: did not understand how it works | it needs the dev server; opened as a file the browser will not let it read the game's code, so it showed nothing. It now says so in a box with the command and the address, and opens with one line on what it is for |
| 6 | feel | the key icon top right a bit smaller; the souls only shown while collected and in the book, not standing, they are meta | the key and its count a size down (`hud.keyScale`), it holds the corner; heaven's skull and wisp come up beside it for `hud.purse.show` s when either count moves and fade; always in heaven and at the foot of his page in the book (I) |

Open: the decal of the ritual scene stays where the altar stood, so the opened drawing reads as lying on a stone slab. Is that fine, or should the scrap lie beside it?

## 6 October 2026, evening, his twelve notes with screenshots (shipped the same day, not yet deployed)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | feel | the room shut behind him looks bad (a black box over the walls); show the fog of war behind that door; the first time, say there is no way back | a shut room goes under the floor's own soft fog (it thickens inside its walls, then `drawMemFog` takes it whole, the walls facing him left out); the veil in its mouth is cells now; the first clamp in a browser says NO WAY BACK / THE ROOMS BEHIND YOU CLOSE over him |
| 2 | feel | some rooms have an open way through, more on later floors; count them as rooms anyway | read as the fog: a corridor too wide for a door (THE THRESHING FLOOR's five) is fogged until seen like a room's floor. The clamp already shut every room, door or none |
| 3 | tool | stats: let me pick the dates to look at | FROM / TO / ALL DATES in tools/stats.html, kept in that browser; every chart, table and the funnel follow it |
| 4 | tool | the data game analytics use: which room of which floor he died in, the path | every life's report keeps each floor's rooms walked into (`rm`: index, role, seconds, hearts, kills, men) and the path; stats.html shows deaths by floor x room, where along the floor lives end, seconds per room, rooms by kind |
| 5 | tool | the strategy per room: fight, stealth, run | each room is judged as he leaves it: fight (half its men dead or more), stealth (none ever aware of him), run (left men who knew him alive), empty; the mix per floor in stats.html |
| 6 | feel | of the bells only the smallest is open for now, the rest come as bosses and floors are won; they should not even be there yet | the smallest bell rings first and they come back toward the great one, one a floor ever climbed out of; one not won yet does not hang (an empty hook), and one won since the last visit drops onto its hook. The shepherd's lines say so |
| 7 | feel | the overlook: a view of a beautiful landscape, the castle and its towers, not every floor apart; a simple wooden watchtower into the cloud, not a lighthouse | see CLAUDE.md's THE OVERLOOK paragraph: one pixel landscape of the cult's castle from the top of a wooden watchtower whose top is lost in a cloud |
| 8 | system | the horse in heaven gives a quest, a run modifier: your floors get THE CHASE; it shows top right | GRAB its seat: the dare (the red after him on his next three floors); GRAB again within 6 s: a bet. Every floor past the first is chased until three are climbed out of (15 sacrifices each, 40 for the last); top right under the purse, the gold horse and THE RED · N LEFT |
| 9 | system | something by the jump where such modifiers are let go | a hitching rail by the lip, a ribbon tied on for each dare worn; GRAB it and they are all let go, each animal saying so |
| 10 | system | the rabbit's quest: in any run, clear one floor wholly unseen, all but the last room | GRAB its seat twice: worn until a floor is climbed out of with no man outside its last room ever aware of him (60 sacrifices); while it is worn the stealth test is on (ALT to creep), the corner says UNSEEN SO FAR or SEEN THIS FLOOR, and the first man to see him says so |
| 11 | feel | no question mark over the table in heaven | gone |
| 12 | feel | GRASS HEALS again by a room's grass; it is only for the first time, in the corridor, so you cannot walk past it | only THE ALTAR's corridor grass says it now |
| 13 | feel | a clearer sound when a man dies | the death is five layers: a bright bone crack, a muffled struck-log mark identical every time (so the ear learns it), a short gasp through the throat, the wet, a heavier body drop; a heavy take for the butcher, ogre, thrower, shieldman; 2.4 dB louder and the rest of the mix ducks a little deeper and longer |

Still open, to ask him: the horse's three floors and both rewards are guesses (the note's number of floors was lost in dictation); the rabbit's dare turns ALT on for a player who has it, a new key while it is worn (rule 1), say if that is wrong; bosses do not wake bells, only floors (a floor's end is its last boss); the stats worker has optional shape checks for the new fields that need a redeploy to apply (it accepts them already).

## 6 October 2026, ten notes from his uncle (shipped the same day, not yet deployed)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | system | a small drop with spikes between the two sides of a room, on level 3; you roll over it, and the floor says E rolls over a drop too | THE CHASM: `carveChasm` cuts a band of drop one tile across a room, wall to wall, between its way in and its way out (a hole's stakes under it); THE CAVE (`chasmLesson`) always has one in its first room that takes it, with `E - ROLL / IT CARRIES YOU OVER A DROP` on the near side (`CONTROL_LINES` part 5, follows the key bindings). The roll carries him over a hole while it lasts (a roll that ends over it drops him), and asked straight across a drop he can clear, the roll goes exactly there |
| 2 | system | the same as a room pattern, especially with rifles or the butcher on the far side | from floor index `chasm.from` (2) a floor cuts one more at `chance` (0.45), rooms with a rifle or the butcher first, and stands those men on the far side (the line and the hook reach over it; nobody in the cult crosses). Our animals hop it (`Beast.hopGap`). `GEN_RULES.chasm` |
| 3 | system | a fish in an aquarium: only gurgles in the box; heavy, only carried; thrown it flies a couple of tiles and stops, hits something on the way and it breaks and the fish dies | THE FISH (js/beasts-more.js): a tank on the floor, no coop; BLUB / BLUB BLUB / ...BLUB? and no question; carried at 60% of his stride; thrown 2.2 tiles and set down; stone, a door, furniture or a man on the way breaks it (shards, the fish on the floor, THE FISH IS DEAD), fire does nothing to it. Up the stairs: the first fire on him each floor only steams. On THE YARD, THE ROAD, THE BRIDGE and THE RAFTERS' lists; a seat in heaven; in THE SHOWROOM |
| 4 | system | poisoned enemies are no exception, they fall into traps and the hole more often | a poisoned man's trap sense is × `status.poison.trapMul` (0.35), rolled every 0.9 s whether or not he has seen the goat, and he misreads a drop too (`pitSense` 0.6) and walks off it |
| 5 | system | an overlook in the sky, like Hades: climb it and see your road from above, the levels in pixel art | THE OVERLOOK: a tower of cloud-stone in heaven's edge room; GRAB, CLIMB AND LOOK DOWN: the run's floors as their paintings (the clear card's own pixel pictures, kept at every clear and at the death), one large in a gold frame, the road of floors under it, the one he fell on with a skull |
| 6 | system | poison the horse to slow it: it says you cheated but admits you won; poison and stun on the following animals too, lasting longer on them; they still walk round traps | `Beast.dope`: a puddle (the spit, VENOM JAW's drip, SOUR TUMBLE, a burst) poisons one for 9 s at 45% pace; a headbutt, DEAD WEIGHT's tumble or THE FULL THROAT dazes one 2.6 s; their steering round fire and drops is unchanged. Beaten after that, the horse says YOU POISONED ME! CHEAT! CHEAT! and still hands over its legs |
| 7 | system | health over the companions; the horse has a lot, the hen less; the tortoise's like a shield's, spent by nothing but fire | `Beast.drawHealth`: a pip a heart over each animal near him, hurt or doped (green poisoned, three cells wheeling dazed); the horse 5 → 9 hearts (the hen keeps her 5); the tortoise's pips are iron and only fire takes them, as before |
| 8 | system | in the book and the menu a tab of unlocks: skills, companions, talismans, items; question marks for now | UNLOCKS (`Unlocks`, js/codex.js, kept per browser): the book's second tab (Tab or Enter turns it) and a title row; souls dealt / taken, animals met / brought out, talismans seen / worn, ten things had (crate, bomb, sword, shield, halberd, both grasses, key, barrel, mushrooms); what is not met is a question mark |
| 9 | system | with the fire throw, the thrown one catches fire too | FIREBRAND: a man thrown from a charged mouth goes out alight (`Status.markThrow`) |
| 10 | system | the ghost can be a door, rarely, surprise | on a fifth of the floors with a wraith, once the first hidden one has been met, one waits in a plank door into or out of its room; butted, reached at or stepped up to, the planks burst and it comes out of them (THE DOOR WAS IT); the planks breathe now and then while he is near. WRAITH DOOR in the drawer's SPAWN column |

Still open, to ask him: the fish's reward (wet fleece) and the horse's nine hearts are guesses; the chasm's 45% of later floors may be too many; the overlook keeps its pictures only for the life of the page.

## 5 October 2026, his own 48 notes with screenshots (shipped the same day, not yet deployed)

Worked in five parallel parts (heaven, stealth, the thrower and the shieldman, the generator, fog and THE DARK) plus the rest.

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | bug | why is the game held at 30 FPS, 60 was agreed | the game has no cap: 11.8 ms of its own work fits 60. A steady 30 with ~34 ms gaps is the browser presenting every other vsync (Chrome's Energy Saver on battery). SHOW FPS now says so on its line |
| 2 | tool | a SPAWN row for Bane (the thrower) | THROWER (BANE) in the dev drawer's SPAWN column |
| 3 | system | the shieldman has no plain attack; his dropped shield has 1 use; a plain shieldman's spikes should not cost a heart | he rams the board close up (`shieldman.strike`, the board pulled in and thrust out); a dropped board always has `shieldman.drop` (3) uses; a plain one throws the goat off at 14 tiles/s with a 0.9 s stun and no heart (`spikes.plain`), a boss or a soul-bearer still costs one |
| 4 | tool | GOD MODE runs x3 | `dev.godSpeed` 3 |
| 5 | bug | two caged animals with a key on one floor, iron | there was only ever one coop: the second was the iron cage of grass drawn with the same sprite. His answer after: the choice between the two is right, only in one room, and it must read. The iron coop and the cage of big grass now stand in the same room `keys.iron.pair` (2.2-5.5) tiles apart, together never cutting it, and while both are shut the floor under each says BIG GRASS / TWO HEARTS or THE GOOSE / IT COMES WITH YOU (`drawIronPair`); `GEN_RULES.iron` holds the pair |
| 6 | bug | running up-right, the horns' animation is broken | the packed back-left run had the horns standing up on two of its four steps (mirrored for up-right): `PIXEL_ART.hornFix` bakes those steps with the middle steps' horns on their own roots |
| 7 | system | Bane throws his dead | he lifts a body lying in his room (or a Gravedigger's), the dead man's own sprite over his head, thrown like a crate; landed it lies as a body again |
| 8 | bug | the grates never answer the men, only a man knocked or carried onto them | the goat's foot sets a patch off and it rests 1.7 s; the man chasing him crossed inside that rest every time. A man's foot now wakes a resting grate after `spike.restMan` (0.25 s); the goat still waits out the rest |
| 8b | system | Bane's throw stuns the goat | anything he throws that lands (a heart, as before) stuns `thrower.stun` (0.6 s); no stun through mercy frames |
| 9 | system | Bane's thing through fire catches | it already did (the crate's own rule); a burning one landing on the goat also lights his tile |
| 10 | bug | Bane with something in his fist walks into traps and the void | fetching or carrying, he steps round every grate, flat ones too, and never fails the roll; never goes for a thing in fire, at a drop or on a grate |
| 11 | system | combos of a man and a room or of men, in the generator and the dev tool | `TUNING.combos`: THE THROWER IN THE ARMORY, THE HOOK OVER THE DROP, WITCHFIRE AND THE HOOK, THE SMALL RING (a mage in an ogre's ring); `dealCombo` (own stream, only men already met, never a teaching/rest/trap room), `room.combo`, `GEN_RULES.combos`; a COMBOS tab (`#combos`) with PLAY, the name on the LEVEL tab |
| 12 | bug | 19 FPS, 44 ms of the game's work in a busy room, unplugged | `Game.adaptRes` (`TUNING.perf.adapt`): while the frame's work stays over 15 ms in play, fewer canvas pixels a step at a time (down to 55%, upscaled pixelated so the art stays hard); back up with room; a drop that did not help is undone. On this desktop the late floors are 5-6.5 ms a frame |
| 13 | number | the bare BAAH's swing break, a much smaller radius | `scream.balk` 2 → 1.25 tiles |
| 14 | system | heaven: one bell at the start, one more for each new floor's boss; the shepherd gives the quest and still combs | `Heaven.bellsOpen` off `meta.cleared` (`floorCleared` at a floor's first clear); sleeping bells chained and padlocked, a dull knock; `SHEPHERD_TALK.quest`; a bell that woke rings on the next visit |
| 15 | system | a door that shut in front of the men, they can open it | a clock door that has seated is leaned open from behind like plank (`openPressure`) |
| 16 | system | Bane dead: a splash of acid, 3 cells | `thrower.acid` 3 poison tiles (not into a drop) |
| 17 | bug | a carpet under the floor words | `floorWords(level)` boxes every floor text (hints, lessons over their slide, the mouse's room, THE FORK, the pen); `carpetFits` keeps off them; `GEN_RULES.carpets` (42 → 0 in 480 floors) |
| 18 | bug | things stand by the wheel; one in its sweep should fly | nothing laid within the arm + `mill.clear` (350 → 0 in 480 floors, `GEN_RULES.millclear`); in play the arm knocks anything it reaches as a headbutt would (`mill.knockCd`) |
| 19 | feel | RESTART first, ASCEND after; after the first death only ASCEND; RESTART only when nothing new opened | RESTART at 0.5 s, ASCEND after the pull-back; while `game.deathNews` (`Heaven.freshNews`: first death, an untold god line, a new seat, bell or affordable rank, a milestone) only ASCEND and Backspace does nothing; news shown once stops counting |
| 20 | feel | arrows to the edge if he dawdles in heaven | pixel arrows over the lip after `heaven.arrows.after` (25 s) until he has jumped once |
| 21 | bug | the mirror's plate written over its RMB prompt; any hover text must read | heaven's plates stack and never overlap, the prompt goes above them (or below) |
| 22 | feel | no hard room cut-offs, an organic fog of war | `Renderer.drawMemFog`: a pixel a tile, blurred up like the cave's fog, over everything standing; the caves share it |
| 23 | feel | do not show a room's layout before he has seen it | `world.mem` (every cast of his sight remembered, `World.remember` / `lightTile`); a room shows only what he has had in sight; corridors as before |
| 24 | system | stealth: Alt is a switch, and sneaking makes no noise like a run | `Game.toggleSneak`; checked: a man 2.5 tiles off turns to a run, stays idle to a sneak |
| 25 | feel | the music answers the sneak | `audio.layers.hush`: no tune, the bass a note a bar, no toms; the drone stays (parts, never tempo) |
| 26 | system | a fight drops him out of stealth and it is shut a while | `Game.breakSneak` on being seen past the beat of doubt, a heart lost, a butt on a man who knew; SPOTTED, `stealth.deny` (6 s), an amber ring of cells draining at his feet |
| 27 | bug | a man stuck against a boulder | a man walking to a noise gave his line to stone only: he gives up after `ai.investStuck` (2.5 s); walking home he steps off along the openest heading (`Enemy.freeHeading`); an idle man's facing no longer grows without end |
| 28 | system | in stealth crates and stones block sight | `Enemy.screenAt` / `coverNear` (`stealth.cover`): crates, boulders, barrels, for `canSeeGoat` and the drawn cells alike |
| 29 | system | in grass much less sight | in stealth a goat in grass is seen within `stealth.grass` (1.5 tiles), and grass blocks the view past it |
| 30 | feel | the pictograms less bright | `effects.omens.alpha` [0.55, 0.75] → [0.3, 0.42], `wallAlpha` 0.8 → 0.5 |
| 31 | feel | the souls sway gently; two for the big men, three for the ogre, a champion +1 | `motes.bob` / `sway`; `motes.per`: butcher, seer, rifleman, shieldman, thrower 2, ogre and rat ogre 3, any boss +1 |
| 32 | system | the mirror mends only when he walks up and presses | GRAB at the glass once 20 are brought (MEND IT, a `?` over it); the god only tells him to |
| 33 | feel | nothing written at heaven's edge | THE EDGE / WALK OFF IT gone |
| 34 | feel | a prettier fall off heaven's edge | a crouch and a hop, a puff off the lip, a tumble shrinking toward the earth shedding motes, a white beat |
| 35 | system | in stealth the men turn slower | unaware men (not hounds) turn at `stealth.turn` (1.6 rad/s) while he sneaks |
| 36 | system | before giving up, the men come to the sound and look about | at a noise, `stealth.search.looks` (3) looks round `every` 1.1 s, then home |
| 37 | feel | the crocodile's turn over, a little better | thins only to `roastThin` (0.45) and briefly side on (no sliver and snap); fat drips while his belly is down |
| 38 | feel | in THE DARK a little more sight round the goat on the move | `dark.self`, `floor` up; `dark.run` eases in with his speed (the ring round him +29% running) |
| 39 | bug | the shieldman looks different in the build and in the world | the ENEMIES tab's preview set his board but not his body: a clubman holding a board. Now the fat Spartan; GOAT GRID got him and Bane |
| 40 | system | all bells: the blind one plays a tune, then a Guitar Hero turn, then the bells play on a minute | `startSong` / `songHit`: he plays the opening, the goat answers on lights falling to each bell (±0.24 s), then three loops on their own; butting him later plays it again. NOT "Du Hast" (a licence for a commercial game): an original stomping march in `TUNING.heaven.bellSong`, swappable |
| 41 | bug | in THE DARK the floor words are drawn over the goat | `drawHints` inside `Dark.draw` under the silhouettes, `Dark.goatOver` lays him back over a line near him |
| 42 | system | in THE DARK the men see little and hear more; a small cone in stealth | `Enemy.sightRange`: unlit and sneaking `dark.ai.sight` × `stealth.dark.sight`, ears × `stealth.dark.ear`; the cells drawn over the dark for men he can hear or who are lit |
| 43 | bug | a floor where rooms and floor are one colour | THE BRIDGE's wall top was the floor's own colour (OKLab ΔE 0.011): wall tops lighter and faces darker on THE BRIDGE (0.079), THE OSSUARY, THE DARK; floors unchanged |
| 44 | feel | hold to buy in the mirror, with tension, and a bought rank lit | `heaven.buy.hold` 0.85 s: the row fills in cells, a climbing chime, a growing shake; let go and nothing is spent; bought, a glint and sparks |
| 45 | bug | the purse twice in the mirror's corner | heaven's corner purse is not drawn under the open panel |
| 46 | feel | drop "what the sacrifices buy, for good" | gone |
| 47 | bug | the hanging armour: one halberd, they are weapons now | `prop.armor.halberds` 1: drawn with one, a grab takes one |
| 47b | bug | never a stag's head on a wall any more | it was there but rare (armour rolled first, 40% of floors): one roll a room, the kind the floor has fewer of first, `trophy.chance` 0.4; 68% of floors |
| 48 | system | a blade charged with fire stuck in a man keeps burning him | a FIREBRAND blade left in him lights him again `stick.fire.gap` s after his fire goes out, for `for` (6) s (`Enemy.stuckFire`) |

Asked after, his "+" to both: THE TRIP takes the soft fog too (its glow and colours untouched); in THE DARK a crate or a man
behind the goat is no longer flattened over him (`Dark.silhouettes` lays what is behind his feet, cuts his shape out, then
what is in front).

His answers: grass in stealth hiding the goat in it AND blocking the view past it is right; a sneaking roll's noise is
fine; the iron pair in one room (row 5).

For the level rebalance (later, his word): THE HOOK OVER THE DROP is rare in a natural run (few rooms have 8+ drops and fit
the budget; `combos` `pits` 6 would raise it).

Open: the sleeping bells and the song are heaven's own, not in THE SHOWROOM; adaptive resolution is a guess at his laptop
(the cost may be script, not pixels: then it switches itself off for the session).

## 5 October 2026, three testers' answers (Petro, Silver, a friend with the bot), his picks (shipped the same day, not yet deployed)

The common thread was onboarding: what a thing is the first time it is met, heaven, hard English. He picked these:

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | feel | the first grass in a corridor you have to walk, nothing else near it | THE ALTAR (`firstGrass`) lays one more bowl in the straight run of the first corridor past the sentry's room that nothing narrows, nothing within `heal.firstClear` (2.4) tiles; `GEN_RULES.firstgrass` |
| 2 | number | after butting the ogre, a longer stun, so it reads as a mistake | `butcher.rebound.daze` 0.35 → 0.9 s |
| 3 | system | no iron cage until the player has picked up a key, the first time | `game.learned` (`LEARN_KEY`, per browser: `key`, `iron`, `graze`); until `key`, `startLevel` passes `noIron` and the generator shuts nothing in iron (0 iron over 360 floors with it, 372 cages without) |
| 4 | feel | short words on the floor by the key and the grass | `Renderer.drawFirstWords`: GRASS HEALS / STAND ON IT WHEN HURT, A KEY / WALK OVER IT. IT OPENS IRON, IRON / HEADBUTT IT WITH A KEY; each gone for good once done once |
| 5 | feel | "RIGHT M. CLICK" everywhere instead of RMB | every key label (rail caps, two lines under a chip; the card's key box; heaven's prompts; the mirror and the mouse's offer; floor lessons; a death tip) |
| 6 | feel | the god's first words: do not cry, they sacrificed you and now you sacrifice to me, bring 20 souls and we mend the mirror | `HEAVEN_TALK.intro` is his three lines plus NOW JUMP OFF THE EDGE (Petro thought the game was played in heaven) |
| 7 | feel | simplify every description to B1-B2 | 77 strings: soul cards, talisman tiers, the mirror, keyword tips, animals' rewards, rail notes, death tips |
| 8 | system | key rebinding in SETTINGS | SETTINGS → CONTROLS (`KeyBind`, js/input.js): nine verbs (four moves, headbutt, grab, roll, BAAH, the talisman) on any key or mouse button, side buttons too; swaps on a clash; reserved keys refused; saved in the settings; every label follows (`bindLay`) |

Not taken now: agency between runs (the skill structure changes next time), the sheep's picture between runs (a big task of
its own), the rest of the three reports (in the Google doc). Open: the ALTAR bowl is one more heart on floor 1, on top of
the rhythm; say if it should replace the first band's bowl instead.

## 5 October 2026, a polish pass over 1.98-1.99, worked alone (shipped the same day, not yet deployed)

Not a playtest: three code reviews and the running build. Everything found is in `CHANGELOG.md` (14 fixes: the
iron cage that could cut a room in two, the thrower's held men and carried goat, GET OFF into a drop, the pointer
rewritten every frame, the title on a phone). Left as it is, small: heaven's question marks build a few small arrays
a frame (`Heaven.drawMarks`); NOSEBAG swapped away and bought again later brings its old tufts back.

## 3 October 2026, the title, a soul behind its gate, a friend's bot (shipped the same day, not yet deployed)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | feel | the title's horns are the horns his run picked, if a horn active is in it | pixel horns like his own (browns, rings, outline), and in the saved run's look: LONG HORNS antlers, BOMB CHARGE lava, SPLASH venom |
| 2 | feel | drop the small line under SETTINGS | gone |
| 3 | feel | NEW GAME says the progress is kept in the browser ("a frequent question") | `(your progress saves itself in this browser)` |
| 4 | bug | a video: the gate's soul lay on the far side of its own gate, three labels stacked on it | a gate's soul is pulled back into its own room (`dropSoul` → `spotInRoom`); the butt's float that repeated A SOUL OPENS IT is gone |
| 5 | tool | a friend's autoplay bot, fun to watch: keep it, use it for active testing now and then | `tools/autoplay-bot.js`, as sent, with a header; see below |
| 6 | number | GET OFF is too harsh, it should fire sometimes, not always; the first soul-bearer is really hard to kill | two butts always land, then 25%, then 50%, inside 1.8 s; a shove starts the count over |
| 7 | feel | the horns in pixel art, and a better font for the game's name | pixel horns (one ramp step a cell) and the name in Jacquard 24, pixel blackletter, one texel size with the horns |

**The bot, later** (his words): a base for collecting playtest numbers, its strength turned up or down (how often
it uses the skills, how it reads the room, how it reacts to being hit), and then for balance and for judging
levels. Nothing of that is built: today it is kept and runnable. It learns per browser (`doomedgoatbot.v1`).

## 3 October 2026, the pointer, the keys, the broken mirror (shipped the same day, not yet deployed)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | feel | a more visible pointer, rather white, the headbutt icon: people do not tie the mouse to the actions | the pointer is the rail's headbutt chip, near white with a pale halo, 60 px |
| 2 | feel | check and improve the keyboard-only controls | J K L / Z X C take the aim with no setting, Z X C beside the arrows, a wider snap standing still, a brighter aim mark |
| 3 | system | the god asks for 20, not 200, and mends his broken mirror; that opens growing between deaths | the mirror starts broken and buys nothing; twenty brought, he calls the goat over and mends it; 200 still unlocks SECOND CHANCE |
| 4 | feel | the mirror nearer the edge, on the way out of the first room | at the bridge's mouth on the edge's side |

## 3 October 2026, the tortoise, the music's level and heaven's question marks (shipped the same day, not yet deployed)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | system | the tortoise, once a level, lets you wear armour, if you brought it | its reward is no longer a use on every shield: brought to the stairs, every floor after starts with the goat in iron (`mods.armour`, `goat.armour`, a restart puts it on again) that takes one blow whole and comes off in goat-sized pieces (THE ARMOUR TOOK IT). Drawn as riveted plates over his body, kept a texel inside his outline, head and ears bare; an iron heart after the hearts. Its card, terms, HUD note and the ANIMALS tab say so |
| 2 | number | turn the music down by default, players at the playtests turned it well down | the MUSIC VOLUME slider starts at 0.35 (was 0.5, about 3 dB quieter, `audio.musicDefault`); a saved setting still on the old untouched 0.5 is moved to it once |
| 3 | feel | the fire's sound a little less dense, more space between the crackles | the fire loop has a third of the ticks (14 a second, was 45) and fewer pops, each in its own slot so two never land together, over a longer take, the hiss a touch lower |
| 4 | feel | "at first I thought in heaven you only eat the hay": mark everything you can interact with up there, the first time | a bobbing gold question mark in cells over the god, the old man, the mirror, each filled seat, the bells and the tables until each has been tried once (talked to, combed, looked into, rung, butted, a table pushed), kept per browser (`meta.tried`); over whatever GRAB answers now the prompt says it instead |

Open: note 1 is read as "starts each floor in it"; say if it should be a thing put on (a suit found on the floor, say) instead.

## 3 October 2026, his notes on swords, the butcher and grass (shipped the same day, not yet deployed)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | system | a talisman that lets you take the grass with you | THE NOSEBAG (`nosebag`, tag `heal`): milk grass grazed at full hearts goes in the bag (big grass two; 1/2/3/4 tufts by tier) and is carried from floor to floor; hurt, standing still with nothing in the teeth, he eats one (+1 heart, FOUR STOMACHS too) after a graze's time (×0.7 / ×0.5 at tiers III/IV). Green pips under the chip; on THE SHOWROOM's shelf with the rest |
| 2 | feel | in the sentry room, under LEFT CLICK - HEADBUTT: "he dies when hit on something"; people did not get how men die | a second floor line, HE DIES WHEN HE HITS SOMETHING, in all four wordings (keys, touch, pad, keyboard only) |
| 3 | feel | the butcher (and a corrupted clubman) spammed in a corner: he should shove you off, a very short stun, almost instant, no damage, so there is no click-lock | `champion.shove`: butts landed within 2.4 s are counted; the 2nd is answered at 50%, the 3rd always (and after a shove the next is a coin again). He is up at once if he was down, shoves the goat off (13 tiles/s, stunned 0.28 s, no heart), leans into it, barks. Clubmen only: the butcher and any bearer with a soul |
| 4 | system | a sword thrown at a wall can ricochet into an enemy, as an extra level | RICOCHET, a grab passive soul: a blade meeting stone turns off it at the nearest man in front of that wall it can see within 6 tiles (85% of its speed, at least 14 tiles/s), once a throw, no use spent; without one it breaks on the wall as before. A mark on the grab chip |
| 5 | feel | a sword thrown at a big enemy sticks in him and he walks about with it, breaking when he dies; and the shield should fall apart, not vanish | a blade spent in a man with a heart to spare stays in him (up to 3, fanned, turning with him, under him when it went in through his back) and breaks out into pieces when he dies. Every sword, halberd and shield that snaps, the shieldman's board when it breaks (or a blast kills him), and a magnet orbiter now fall apart into pieces cut off their own sprite (hilt and point, three planks, four skulls) that clatter and stay on the floor |

Open: note 3 counts any soul-carrying clubman (keepers, the soul bosses), not the yellow champions; say if those should shove too. Note 4 is a soul card, not a talisman tier; say if "extra level" meant a talisman.

## 3 October 2026, two testers' notes (shipped the same day, not yet deployed)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | bug | the keyboard sometimes stops working, two testers, a reload cures it | the canvas takes focus (`tabIndex`) and every press on it takes the keyboard back to the page (`takeKeys` in `bindInput`): on itch the game is a frame, and a click outside it or an alt-tab left the keys going to itch's page while the mouse still played. Also a non-standard "gamepad" (wheel, tablet, HID gadget) no longer wakes on jittering axes, only a button (`PadInput.poll`) |
| 2 | feel | the food on tables is too bright, it reads as something to use | drawn from a dulled copy of each sprite (`food-<id>@dim`, `scatter.dim` k 0.72, grey 0.35), on the table and scattered; heaven's feast stays bright |
| 3 | system | the halberd on a suit of armour should be throwable, grab beside it | grab beside a suit (wall: two halberds, stand: one) pulls one off as a thrown blade (`p.halberds`, `p.halberd`, sprite `halberd`; one use, breaks on stone like the sword); the suit is drawn without it |
| 4 | system | tips after a death: grab and throw, poison, fire panic vs rage, yellow champions | four lines added to `DEATH_TIPS.any` |
| 5 | feel | headbutting the ogre: the goat should bounce off himself and be dazed briefly | `butcher.rebound`: thrown back at 14 tiles/s (about a tile and a half), `stunned` 0.35 s, no heart |
| 6 | number | fire set too strong: immunity only from the third, 0.5 s, and 1 s more at four | `BOON_SETS.fire.step` 0, 0, 0.5, 1 (1.5 s at four), `immune: false`: no immunity; the fourth keeps the double burn |
| 7 | feel | the cave's teeth should read as hurting | bloodied red points instead of white; within `warnR` (2.2 tiles) a beating ring of amber cells round the foot (`drawSpire`) |
| 8 | system | teach the teeth: you walk in and a man walks onto them and dies, the first time | `Game.updateSpireLesson`: the first room this browser enters with a tooth the goat can see and a plain clubman with a walked way to it (`lesson.reach` 14 tiles) sends him onto it at `walk` 130; once ever (`SPIRE_KEY`), never THE TRIP |

Open: note 4 said "E grabs and throws", but grab is the right mouse button (E is the roll); the tip says RIGHT CLICK. Ask whether he meant a rebinding.

## 2 October 2026, late, his notes on the book, the souls and the first two floors (shipped the same night)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | number | DRAGON BREATH, a bit more fire | cone wider (`halfAngle` 0.52 → 0.64), floor burns longer (`fireTime` 3.4 → 4.4), more flame out of the mouth (`parts` 40); reach unchanged |
| 2 | feel | the soul card's "HOW HE WILL LOOK" line is not needed | gone; the picture shows it |
| 3 | feel | the book: the read-out at the foot only while pointing at something | shown only for the tile under the pointer (or one picked by keys, pad or a tap); nothing when nothing is picked |
| 4 | feel | the book: no "point at a picture / I or ESC closes" line | gone; the × closes |
| 5 | feel | the book: the level higher, not under the goat | LEVEL n · NAME under THE GOAT head, the goat below it |
| 6 | number | a corrupted clubman, three hearts | `soulKeeper.hp` 1 → 2 (keepers), and THE ALTAR's last boss is set to 3 (`arenas[].hp`) |
| 7 | feel | the book: names either all on top or all under (on top) | every name sits just over its own row with clear floor above it (`rowGap`) |
| 8 | feel | the book: WHAT HE CARRIES and SOULS are useless | both gone |
| 9 | feel | a high, frequent crackle near an enemy, gets on the nerves | the hats on every off-eighth of the chase and fight music are out (`layers.fight.hat`, `chaseHat` 0; and the legacy kit's). If it was something else (a fire's crackle?) say so |
| 10 | feel | E - ROLL at the entrance of the first butcher's room | `hints.rollInset` 3.5 → 2.2: its first letter at the doorway |
| 11 | feel | dead and floored look alike | a dead body is greyed toward ash (`effects.corpse.grey` 0.8) |
| 12 | feel | a soul should be seen rising off them | the white soul rises off every dead man; before the god's gift (and in GOD or THE SHOWROOM) it rises and goes out over him (`ghost`) |
| 13 | number | the corrupted butcher is too hard on level 1: to level 2, a heart less, one man | THE ALTAR ends on a soul clubman with two men; THE YARD's room 4 is the butcher's ring, 4 hearts (was 5), one man, no soul (the floor's two stay the mouse's and the ogre's) |
| 14 | feel | after a death, no "LAST TIME: X", a tip instead, up top | the floor tip lost its LAST TIME line and is written where the level's hint was |
| 15 | feel | the soul leaves the body at once and flies in too fast | out a beat after the death (`motes.delay` 0.55), up slowly (`riseT` 1.3), hangs (`wait` 1.5), comes only from right by it (`near` 1 tile) or once he leaves the room |
| 16 | system | the cleat and the chandelier in different places, near a way in or out | the cleat on the far wall within 2 columns of a door, the ring within 5 of one, the rope across the room, `reach` 9 columns at most (`GEN_RULES.chandeliers` holds it) |

The second half of the same night:

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | feel | the vault's ambush springs after the grass is eaten, not on the step in | `updateVaultTrap` waits for the vault's grass to go (`t.grass.broken`); walked in at full hearts and out, nothing happens |
| 2 | feel | don't animate the white soul, it should draw less attention | still: no twinkle, no licking tip, no bob, fainter (`motes.alpha` 0.7, halo halved) |
| 3 | feel | the cave shows too much outside the room | in a cave only what he has opened shows, with `cave.fog.margin` 1 tile of rock round it (see 8) |
| 4 | feel | yes on the right, no on the left, coloured green / red | bah. (no, red) left, BAAAH! (yes, green) right (`beast.talk.answer`) |
| 5 | system | the pig, told no, eats your grass anyway; only killing her stops it | refused, she says so and walks on ahead to every tuft she can see (`prop.pig.spite`), never full, never banked; a headbutt hurts her (four kill her) |
| 6 | note | in heaven he looks like his upgraded self, in the mirror like the real one: liked | kept as it is |
| 7 | system | after a death, a new layout (no memorising), and a new animal if the floor had one | the layout already re-rolled off the death count (the corner showed only the run's seed, which never changes: it now shows the floor's layout code too); the animal is now re-dealt off the floor's own list after a death (`Game.beastFor`), never one another floor of the run has |
| 8 | bug | black boxes cut out of the cave's rock: undiscovered should be full fog | in a cave the unopened rooms are no longer boxes: one soft fog over everything he has not opened, rock included (`Renderer.drawCaveFog`, `cave.fog`); not on THE TRIP |
| 9 | feel | the death card's run code is not needed | shown only with the dev drawer open; leaving the card still copies it |
| 10 | feel | the husky slower: each of her notes heard, my part long enough between my cooldowns | a bar is 6 s (was 4.8) and never shorter than his voice's cooldown + 1.4 s; her notes 1 s apart and louder, on the unducked bus |
| 11 | feel | the husky should say whether I made it, and how well I sang | every answer: PERFECT! / GOOD! / A BIT EARLY / A BIT LATE, OFF THE BEAT, YOU MISSED; the song's end says how it went (`husky.judge`, `grade`) |

Still open: **NEW GAME keeps the mirror and the souls in heaven.** That is how it is built (heaven outlives runs,
`HEAVEN_KEY` is never cleared by NEW GAME), so it was left. Ask: should NEW GAME wipe heaven too, or should there be
a separate "forget heaven" (in SETTINGS, or only in the dev drawer for testing)?

## 2 October 2026, evening, two words on the music (shipped the same evening)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | feel | a bigger difference between a fight and peace | the fight fills in by count: kick on every quarter and its pickups, a low tom, hats and rim up; the chase gets its own backbeat kick (`layers.fight`) |
| 2 | feel | a bit longer melody | every theme's phrase is eight bars, an answering second half over the same roots (`THEME_BED`) |

Worth his ear: the second half of each tune is new writing, if a turn in it is wrong say which bar.

## 2 October 2026, "run it again and improve" (1.97, a second pass)

Simple audits again: the generator over 250 new seeds a floor (0 failures), `balance.js` (every rule holds), the smoke
bot over every floor, THE DARK and two trips on new seeds (22 of 22 OK, no throw, no NaN), a count of gradients made
a frame, a look at every screen (play, the book, pause, death card, heaven, THE DARK, a phone), and a review of the
first pass's own code. Then the work:

| # | tag | what | done |
|---|---|---|---|
| 1 | bug | the floor's card (LEVEL 3, THE CAVE) was drawn over the open book and the pause menu | pause and book are drawn over every card |
| 2 | bug | her wares are hidden while she is there, but a headbutt still found the empty stools: three butts at bare floor woke the rat ogre | a shelved ware is skipped by the horns; the gate's violet trail leads to her, not to a hidden stool |
| 3 | bug | HUNGRY SOUL was forced into every passive deal of the first run, not only the first | offered once a run (`hungerOffered`) |
| 4 | bug | the goose honked every 0.35 s at a wraith winding up, which no honk breaks | it honks only at what `Enemy.balk` breaks |
| 5 | bug | after the rat ogre, the free shelf no longer came up as cards | walking up to a stool of a shelf she has left opens it, free |
| 6 | tool | three names in the book's tile drawing leaked out as globals (a `;` for a `,`) | fixed |
| 7 | feel | DEV TOOLS sat on the book, the god's box, the mirror and the animals' box (dev build only) | the corner word stays away while one is up |
| 8 | perf | a brazier's foot shade, a stand of arms' glow and a milk sprout's glow were a new gradient each a frame (1-3 a frame) | one made once and scaled into place (`glowDisc`); 0 a frame on THE ALTAR, THE YARD, THE RAFTERS |

The power column still reads THE THRESHING FLOOR and THE OSSUARY as easier than the floor before (9.4 after 10.0,
10.1 after 10.8): left alone, it is a question of weights, not a broken rule. CLAUDE.md's threat ladder was the 1.74
one; it now says 22.3 / 37.0 / 65.3 / 97.4 / 108.5 / 145.5 / 166.7 / 174.1, THE DARK 68.


Simple audits (the smoke bot over every floor, THE DARK and THE TRIP on new seeds with a random talisman each, the
escort bot, frame timings on every floor, every screen at four sizes), then the work:

| # | tag | what | 1.97 |
|---|---|---|---|
| 1 | bug | the soul cards, her offer and the RULES tab threw `textW is not a function` (a local shadowed the global) | renamed; smoke clean: 20 of 20 runs OK, no throw, no NaN |
| 2 | system | ECHO HORN's ghost blow ignored BULL NECK | it carries the run-up share |
| 3 | system | a wraith hiding as a crate survived the blast that broke every real crate | a blast unmasks it, solid for a beat |
| 4 | number | FIRE AMULET I was KINDLING | passes fire two men deep (was 1 / 2 / 6 / 99, now 2 / 3 / 6 / 99) |
| 5 | feel | no keyword for BAAH or milk grass; "2.86x as fast"; SANDAL III and MIRROR III ran long; P, I and Q typed QWERTY or a key on a pad | keywords, words for the times, shorter tells, `KEY_FACE` I and P, Y on a pad |
| 6 | feel | SETTINGS ran off a 960x600 screen; the book overlapped itself on a phone; ASCEND sat on the killer's box; the pause button on the rail on a phone; CONTINUE under a phone's home bar; a long ware name off its card | two columns, a stacked book, room under the picture, the button moved, lifted, squeezed |
| 7 | feel | off-screen props drawn every frame; each rug baked a rect a texel | culled (`effects.propCull`, THE ALTAR 3.18 → 2.62 ms a draw); rugs 5 → 2 ms each |

Escorts over 6 seeds: husky 9/9, rabbit 9/9, hen 4/4, goose 7/9, pig 7/9 (she leaves him for the grass on purpose).
Left: the DEV TOOLS label overlaps the book and heaven's box (dev build only); THE THRESHING FLOOR and THE OSSUARY
still read "easier than the last" in the power column, a weight question, not a failure.

## 2 October 2026, his own run on 1.96 (1.97)

Asked mid-session ("run the tests and improve"), with screenshots. All of it shipped in 1.97:

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | number | the fire set's grace is too much: one DRAGON BREATH and fire "does not take" | `BOON_SETS.fire.step` 0.5 / 1 / 2 → 0.2 / 0.3 / 0.5 s |
| 2 | bug | two souls dealt two actives; the rule is active, passive, in turn | the 75% lean toward actives while a button is half-shut is gone; the deal alternates strictly after the first soul (`openBoonChoice`) |
| 3 | system | on the first run, a passive deal should carry the third-card soul | HUNGRY SOUL is on the first passive deal of a browser's first run |
| 4 | feel | the book (I): the goat left, the build right, the same pictures as the soul card and the mouse's card, no new art, laid out like the Ammonomicon | `Codex.drawBook` rebuilt as a two-page book (cover, spine, ribbon); body souls still show their emoji, the card has no other picture for them |
| 5 | feel | say "I" on the floor of the mouse's room, so the build is looked at before buying | WALK UP TO HER / I - YOUR BUILD on her room's floor |
| 6 | feel | no "Do you want sacrifices?" at the end of a floor | the two cult cards are gone |
| 7 | feel | fruit, cheese and bread back on the tables, meat only sometimes | `scatter.menu.cult` is mostly fruit, bread, cheese and jugs again |
| 8 | feel | more idle animation | the goat stretches, sniffs and scratches; a standing man breathes and shifts his weight (`TUNING.menIdle`) |
| 9 | system | the mouse does not lay her things out; you walk up to her and talk | her wares are not on stools (`Shop.shelved`); walking up to her opens the offer |
| 10 | feel | an animal does not say what it gives when brought out; the goose's honk does not break a blow | every animal's first words hint at its reward; the goose honks at a man winding up (`blowGap`) |
| 11 | number | fire on the floor goes out too fast | hay 3 → 4.5 s, pools 4.5 → 6.5, breath 2.2 → 3.4, witchfire 3.6 → 4.8, chandelier 2.4 → 3.6 |
| 12 | feel | the husky's song: no slow time, no dialog; fire roasts her too; a bit slower; her "woo" on the beat; his breath or spit answers "beh" | no box at the win; a husky voice in `Foley`; tempo 4.2 → 4.8 s; breath and spit bleat on the song |
| 13 | feel | the animals' texts are too literal | rewritten as hints in their own voices |
| 14 | feel | the tip after a death is a box that breaks the emergence | written on the floor of the first room for the whole floor |
| 15 | feel | the white soul is one white pixel | a small wisp of cells with eyes |
| 16 | feel | the camera shakes "claustrophobic" in a cave ogre arena | the boss pull eased (`fight.follow`), smaller (`pull` 0.22, `max` 3 tiles), thuds 0.62 → 0.4 |
| 17 | feel | the soul should fly to you when you walk up to it too | within `motes.near` tiles it comes |
| 18 | feel | the death card: the purse's skull and wisp, not "11 sacrificed / 3 souls kept" | `card.tally`, the purse's pictures |
| 19 | feel | hide BEST on the title | only with the dev drawer open |
| 20 | feel | Discord's icon on its menu row | the mark in cells beside SEND FEEDBACK |
| 21 | feel | "the other way round: in some rooms the camera shakes like mad as he moves, much smoother" | softer camera, measured walking every room: acceleration 0.119 → 0.047 a frame, turn-backs 31 → 4 (`TUNING.camera`: lerp, lead, lens pump, deadzone, the hold's blend) |

From the same session: THE YARD's chandelier lesson, the chandelier drawn quieter, and the mirror before the edge
in heaven (CHANGELOG 1.97).

## 2 October 2026, six reviews of 1.93 and a slow cave (1.94)

Asked on 1 Oct 2026: "go through the game and improve it, spend whatever it takes"; mid-way, from a run on THE CAVE:
"FPS dropped (20 FPS, game 61 ms), a strange clock ticking started, and notes in the music cut off in places; either
the computer is overloaded or a glitch". Shipped in 1.94 (see `CHANGELOG.md`):

| # | tag | what | 1.94 |
|---|---|---|---|
| 1 | bug | notes cut off, the men's ticks out of time | the score is laid 0.25 s ahead (`audio.ahead`), not 0.12: a stall no longer skips the steps due in it |
| 2 | feel | 20 FPS in a cave room on fire | measured here at 3 ms update + 8 ms draw with 45 tiles alight; the machine was also running this session's checks. The rooms' idle painters, which had stopped for good early in every floor, paint again |
| 3 | bug | a blast went through shut doors, iron ones and soul gates too | `Game.blastClear` |
| 4 | bug | bomb + poison barrel took three hearts in one frame | `Status.spared`: two at most a chain |
| 5 | bug | spilt powder killed as A BOMB, lit nothing round it | its own killer and line, `blastRoom` |
| 6 | bug | the funnel counted starts that were never played, sent steps after NO, lost the run code of a quit | `Stats.played`, `no`, `showTitle` closes first |
| 7 | bug | a forged report blanked `tools/stats.html` | maps without a prototype |
| 8 | bug | THE DARK's crossing left side doorways dark | the lantern walk stops at stone; a standing lamp where no wall takes one |
| 9 | feel | key labels kept QWERTY letters inside itch's frame and for keys that print marks | learnt off keydown too |
| 10 | feel | wrong numbers and old behaviour in a dozen descriptions | fixed (see the changelog) |

Found and left, worth a word from him:

- **number**: a blast that rings the gong hands the goat its rush wherever he stands (1.93's own question, still open). It
  now rings once a chain.
- **system**: ECHO HORN's ghost blow ignores BULL NECK; a wraith hiding as a crate survives the blast that breaks every
  real crate; FIRE AMULET tier I is now the same as KINDLING. (fixed 1.97)
- **feel**: the collector (1.95 measured it, see `CHANGELOG.md`): at real speed a minor collection 2 a second at 1-4 ms
  and a full one every few seconds at 15-30 ms, one dropped frame each. The big per-call sources are fixed; what is left
  is a flat tail of boxed numbers in the engine's middle tier (no one function over about 20 KB a frame of 250-290).
  **Found and mostly fixed, 2 Oct 2026 (1.97)**: it was never the script's garbage. A `v8.gc` trace with the `cppgc`
  phases showed the pause was the browser's own heap (weak processing and sweeping), and `GCIncrementalMarkingStart`'s
  reason was "approaching global allocation limit" while the script heap sat at 11 of its 27 MB. The browser's heap was
  filling with objects the canvas API makes: `save()` a copy of the whole state (170 a frame), `getTransform()` a
  DOMMatrix (32), `measureText()` (12), gradients (9). All gone (render.js `CANVAS_STATE`, `xform`, `textW`; see
  CLAUDE.md). Two 60 s fights: 20 full collections → 5, and 18 → 10, a quarter of the time frozen (815 → 209 ms; a loaded machine).
  Ruled out on the way, measured: compacting lists and index loops (the script's garbage only moves between
  functions, it is boxed numbers), a 48 MB ballast (the trigger was not the script heap), the rooms' bake (no thrash).
  **Left**: the remaining collections come from the browser's `drawImage` (~160 a frame, a little each), font sets and
  the script heap's own promotion; minor collections stay at 1-2 a second. A frame still going over budget at one of
  them is worth a look on a real machine with DevTools' Performance panel before more surgery.
  Careful with the tooling: a sampling heap profile "without minor-GC garbage" still counts everything alive when it
  stops (the last second's allocations), so it cannot say what is promoted. The trace's GC reasons can.
- **feel**: text left as it was: BAAH and milk grass have no keyword (fixed 1.97), P and I are typed into notes (not in
  `KEY_FACE`) (fixed 1.97), the Q shelf says Q on a pad (fixed 1.97), `sayTimes` says "2.86x as fast" (fixed 1.97), PILGRIM'S SANDAL III and
  MIRROR SHARD III run long (fixed 1.97).
- **tool**: the shieldman review did not finish; nothing from it is in. (checked live 2 Oct 2026, the loop: spikes,
  brace and a butt from behind all behave; nothing to fix)

## 1 October 2026, "improve the game", worked through alone (1.93)

Asked on 1 Oct 2026, with nobody watching: "improve the game; the audits can be simple; spend whatever it takes".
Simple audits only (the smoke bot over every floor on new seeds with a random talisman each, frame timings, a
look at the menus and the rail, the build's own checks), then the work. All of it is in 1.93 (see `CHANGELOG.md`):

| # | tag | what | 1.93 |
|---|---|---|---|
| 1 | bug | FIREBRAND's flame never reached its chip on the rail | the icon asked for a mod that does not exist (`chargeHold`; it is `brandHold`) |
| 2 | system | three buttons had one passive each and a slot for two | BULL NECK (headbutt), SPRING HOCKS (roll), BIG LUNGS (BAAH): 28 souls, a build holds 17 |
| 3 | system | a rifleman's round into a barrel did nothing; a blast moved men and nothing else | a round lights the powder, a blast goes through the room: barrels in a row go up one by one |
| 4 | system | a new man for the late floors | THE SHIELDMAN: a board that takes anything from in front, slow to turn, a wall to a thrown body |
| 5 | feel | stutter whenever he started or stopped running on some screens | the floors' bake no longer flips resolution with the run's zoom; rooms paint ahead in idle time |
| 6 | system | the first floors drew their mix rooms from four templates | three more: the byre, the refectory, the larder |
| 7 | feel | on an AZERTY keyboard the floor said WASD and the caps said Q | the words follow the player's own keyboard where the browser says what is printed on it |
| 8 | feel | four SETTINGS notes were cut off mid-sentence | the chosen row's note is printed whole under the list |
| 9 | tool | the MUSIC lab's men were silent with no bed under them; `audio-check.js` failed since 1.85 | the lab hears them again; the check's idle sheet expects calm's thinner score; it passes |
| 10 | tool | the smoke bot stood at an animal's question until the clock ran out | it answers BAAAH (or bah) |
| 11 | feel | the late floors' worst frames (15 ms and up) came when a room wound up together | a swing's amber and a hound's line draw the same cells 4 to 8 times faster |
| 12 | system | THE DARK drew its canon rooms from five templates | three more: the crossing, the scriptorium, the cistern |
| 13 | feel | the shieldman's board rang like steel | it knocks like wood and splits like the pen's frame |

Decided in the build, worth asking him about:

- **system**: **the shieldman** is the one big addition nobody asked for. Met alone on THE THRESHING FLOOR (THE DARK
  in its place), three to five a floor after that, never a boss. To take him out of the game: drop `'shield'` from the
  `kinds` and `introduce` lists in `LEVELS` and `DARK_LEVEL`. His numbers are on the ENEMIES tab.
- **number**: **the floors around him**: the intro room cost THE THRESHING FLOOR a room of its curve, so its curve went
  10 → 22 to 14 → 23 (108.7 against 114 before), THE DARK's 5 → 14 to 7 → 16 (it has to stay over 60% of the lit
  floor), and THE RAFTERS' top 34 → 37 so its worst room stays over THE BRIDGE's. Every balance rule holds.
- **number**: **BIG LUNGS on THE FULL THROAT**: × 1.3 on its daze too, so FULL THROAT + RAW THROAT + BIG LUNGS dazes
  everything within 8.45 tiles (6.5 without), still well under the 13 before 30 Sep. If the halving should hold, give
  `lungs` a separate smaller share for the stun.
- **system**: **a blast opens a cracked wall outright** (two headbutts otherwise), and **rings the gong**, which hands
  the goat its rush wherever he stands. Both follow "the room answers a blast"; say if either is too generous.
- **feel**: **the shieldman's board** is drawn from three views (face, edge, back) on his off arm; the face carries the
  cult's horned sign in red. Worth a look at the sprite (`mshield-*`, js/prop-pixels.js) before it is final.

## 1 October 2026, the soul into the goat and a sixth polish pass (1.89)

The ask shipped in 1.89 (the soul hangs until a card is pointed at, then goes into him and he stays), with every
finding of the pass that was a plain bug (see `CHANGELOG.md`). Found and left for a decision, all five then shipped in
1.90 (the ogre's vault: kept off a room with nothing that hurts him):

| # | tag | note |
|---|---|---|
| 1 | bug | A heavy body (ogre, rat ogre, sentry) shoving out of an overlap can push the goat over a lip during his windup or recovery, though the lip holds him like a wall then. A `Game.nudge`-style per-axis keep for the goat in those states (`collideEntities`). |
| 2 | system | THE OGRE'S VAULT promises nothing that hurts him in the room he wakes into: the horns do nothing to him and he no longer walks into a hole. Either a rule that its room holds a brazier or a stand of swords, or keep the ogre vault off rooms without one (`vaultKindOf`, `GEN_RULES.vaultkind`). |
| 3 | feel | The camera's room hold counts a vault's mouth and a broken niche as ways out (`Game.roomMouthDist`), so walking up to them slides the picture off the room's middle. |
| 4 | tool | Literals left in the hook (`Enemy.hookStep`: flight step `/ 6`, catch slack `+4`, `+3`), the vault ogre's offset (`TILE * 0.6`) and the goat's smoulder cap (`0.6` of a tick, `Goat.burnStep`). |
| 5 | feel | Pad: the first card is lit from the start, so on a pad the soul goes into him the moment the cards can be taken. |

## 1 October 2026, the magnet, the camera, the fog, the husky's practice (1.87)

Two messages, all shipped in 1.87 (see `CHANGELOG.md`):

| # | tag | note | 1.87 |
|---|---|---|---|
| 1 | system | a talisman, the magnet: picks up a thing and spins it round you, blocking blows and breaking; middle rarity only a sword or a shield, once a room; top rarity any two, like Enter the Gungeon | THE MAGNET: I one sword/shield, II farther, III any two, IV any three; blows, bites, bullets |
| 2 | feel | the dark squares of the fog were a bit aggressive | `fog.soft` 3x3 soft mask, shade 0.72 |
| 3 | system | the husky: practise the mini-game first in a room with only her, then run to the room with people | `husky.practice` |
| 4 | feel | polish the new systems and arrivals | answer plates, the practice's words over the staves, the crow, a pass over the box, the book, the rabbit |
| 5 | bug | the camera: many complaints; between rooms it jumps from room one to room two, show the state between, a smooth follow | the room hold is a blend by distance to the doorway |
| 6 | tool | show the husky's portrait | sent from the box |
| 7 | tool | the husky is not in the dev tools; add everything there and to the showroom, a rule | SPAWN rows, the coops, a talisman shelf; ground rule 9 |
| 8 | feel | the landscape through a window with parallax is great; the stakes sharper and without movement | needles, fixed to the floor; the sky keeps its parallax |
| 9 | bug | the crow should go after the bodies, not after you | it sits with no body near; flies after only when left |
| 10 | bug | in the crow's box the text ran over the answers; the buttons bigger and nicer | the box grows; plates with key caps |

Decided in the build, worth asking him about:

- **number**: **the magnet's tier I** (not described): one sword or shield, from 5 tiles instead of 8. And
  **LEGENDARY** (the rat ogre's shelf) carries three.
- **feel**: **a blow is always taken** by the nearest thing in the orbit, wherever it is on its way round; only a
  bullet has to meet one. If blows should also have to meet it, `magnetBlock` asks the angle.
- **system**: **crates count as "any"**; a bomb, a barrel and an animal never go into the orbit.

## 1 October 2026, souls, the mirror, the mouse, the book (1.86)

Nine playtest notes in one message, all shipped in 1.86 (see `CHANGELOG.md`):

| # | tag | note | 1.86 |
|---|---|---|---|
| 1 | system | a dead man's soul rises as a small white dot and follows you out of the room, as in Enter the Gungeon | `js/motes.js`: banked into heaven's heap as each reaches him |
| 2 | system | after the first death the goat god grants the power to gather souls, his quest, and asks for 200 | his first talk gives it; FOR THE GOD n / 200 under the purse |
| 3 | system | one upgrade, SECOND CHANCE: back where you died on two hearts, 250 and 3 corrupted souls | a mirror rank shown once the 200 are brought; once a floor |
| 4 | feel | a death animation: summoned to heaven, your see-through soul flies off | a beam and his washed-white ghost rising, before the pull-back |
| 5 | feel | on a soul upgrade, the goat large at the top looking down-right; on a skill that changes him, show how | `Codex.drawBoonGoat` |
| 6 | system | the mouse's shop the same way: walking up, she shows it all as a dialog, with how he would look | `Codex.watchShop` / `drawShop` |
| 7 | system | talisman rarity and colour, common, rare, epic, legendary, and legendary only after her ogre | `RARITY`, a fourth tier on every talisman |
| 8 | system | I opens a short menu like Enter the Gungeon's: actives, passives, items, animals | the book, `Codex.drawBook`; PAUSE → INVENTORY too |
| 9 | feel | a trait or game word in a description (poison, fire, stun) explains itself on the pointer, like Slay the Spire | `KEYWORDS`, `Codex.line` |

And thirteen more in the next message, all in 1.86 too:

| # | tag | note | 1.86 |
|---|---|---|---|
| 10 | feel | effects are overloaded with words nobody needs (COALS, AAAAH, IT GOES OFF, GO ROUND over one blast) | `effects.quiet`: caption words dropped, crowded words and barks dropped |
| 11 | number | a friend saw very few animals over his runs; a deathless run should meet 3–4, odd floors too | from floor two, every one or two floors: 3–6 a run, mean 3.9 |
| 12 | system | a husky who sings: she runs ahead into a full room, you answer her WAF-WOOO with your BAAH, two staves like Guitar Hero | `js/beasts-more.js`, `game.song` |
| 13 | system | a rabbit who ties your legs: only the headbutt, skills and items, moving in jumps | `game.legsTied`, the roll as the hop |
| 14 | system | any animal: agree or refuse after its rules, BAAAH (yes) / bah (no) | `BEAST_ANSWER`, `Beast.answer` |
| 15 | system | a setting: double speed out of a fight | DOUBLE SPEED OUT OF A FIGHT |
| 16 | number | two active skills on one deal: different elements and different buttons | `openBoonChoice` `clash` |
| 17 | number | the first run's first soul always offers the fire breath | `firstRun` in `openBoonChoice` |
| 18 | bug | the acid horns should poison the man you hit too | `headbuttHits` |
| 19 | number | poisoned or stunned, a lower speed should kill on a wall | `status.weak` 0.7 |
| 20 | feel | the gong longer, STRONGER over him; after a first death on a floor, a tip (who killed you, or one off a list made in the dev tools) | `bell.buff` 12; `DEATH_TIPS`, GOD TALK · TIPS |
| 21 | bug | the little secret rooms seem gone | they were there, unreadable: a pixel crack and rubble now |
| 22 | bug | witchfire should light barrels and acid; acid on an open brazier should explode | `Prop.toxicBurst`, puddle under a brazier |

Decided in the build, worth asking him about:

- **number**: **once a floor, not once a run**, for SECOND CHANCE: a death already restarts the floor, so a
  once-a-run revive would barely be felt. If it should be once a run, `game.secondUsed` moves from `startLevel`
  to the run's start (and the save).
- **system**: **what the 200 buy.** The quest unlocks SECOND CHANCE on the glass; the souls brought are also the
  mirror's pay as before. If the god should give something on the spot, say what.
- **feel**: **a soul left in the room he dies in is lost.** Collected only by leaving (or clearing the floor);
  dying in the fight forfeits that room's. If that stings, they could rise with his own soul instead.
- **system**: **a legendary tier is the third tier pushed further** (hand-set per talisman in `ARTIFACTS`);
  THE KNUCKLEBONE's legendary is the same as its epic (a third card every soul is already the most).
- **system**: **the husky's extra men** come in through the room's way in when her song starts (`husky.extra` 2):
  "make the next room dense" done at the moment of the song rather than by the generator. And her song wants your
  BAAH of any kind, a fire breath or a spit on the beat counts.
- **feel**: **refusing an animal sends it away** for the floor; the hen and the tortoise included.
- **number**: **DOUBLE SPEED** doubles his stride, not the clock: the cult and the fire move as ever.
- **feel**: keyword tooltips are on the cards and the book only: the rail's hover note closes as the
  pointer leaves its chip, so a word in it cannot be pointed at.

## 30 September 2026, a tester's hour and a half on 1.84 (1.85)

A friend played 1.84 for an hour and a half and gave another fifteen minutes of notes with his dinner going
cold; he got out on his third or fourth run ("though for now a death starts the level, it is not a
roguelite yet"). Fourteen notes, all shipped in 1.85 (see `CHANGELOG.md`):

| # | tag | note | 1.85 |
|---|---|---|---|
| 1 | feel | the music out of a fight should be far less intense, so a fight or a chase is felt | calm thinned deeper, on level one too; the fight's drums up |
| 2 | bug | the camera shook hard in some rooms on his 1920×1200 screen, "as if it could not focus" | the fit test flipped with the zoom; asked of the lens at rest |
| 3 | bug | hounds fall into holes, even following him | nobody walks over a lip; shoves never push over one |
| 4 | bug | traps are not set off by the men walking over them | a man coming for him trips a grate in 0.1 s |
| 5 | bug | sometimes the controls went, maybe near the hover notes, not sure | one cause fixed (a parked pad axis); see below |
| 6 | feel | any animal let out should talk in the box, like the horse, so it registers as an event | hen, tortoise, goose, crow in the box |
| 7 | number | the goose should run further ahead and call the men harder | lead 10, sees 12, honk 1.5 s, heard 16 |
| 8 | feel | holes must be clearly readable, contrasting; spikes inside a building, a clear background through walls | wall face, lit edges, stakes, a brighter sky |
| 9 | system | THE BRIDGE: one or two rooms shaped like a bridge, holes at its sides and between | `bridge`, `twinspan`, `levelDef.bridges` |
| 10 | bug | a man teleported behind the fence at the end of the level | the mage's blink kept in sight and off doorways |
| 11 | system | at the end show the number of runs instead of the score | ON RUN N, deaths, times out |
| 12 | system | a trap: a huge ogre in the little room, shut behind an iron door of three blows | the ogre's vault |
| 13 | number | 15% longer between blows | headbutt recovery 0.53 s |
| 14 | feel | a simple head-down when he eats grass, the sprite just stretched a bit | `goat.grazePose` |

Still open:

- **bug**: **controls going missing** (#5). Not reproduced. 1.85 fixes the one cause found in the code: a
  second input device whose axis rests at the end of its travel (a wheel, a flight stick, some pads) took the
  aim and the grab off the mouse every frame. If it happens again, ask him: was anything else plugged in
  (a pad, a wheel, a drawing tablet)? Was the goat still, or moving but not turning to the pointer? Did it
  happen right after a box (an animal, the god) or a soul card? Did Escape bring it back? The run code off
  the next death card says which floor and room.
- **tool**: **#10 only if it was the mage.** "A man teleported behind the fence" reads as the boss mage's
  blink onto the stairs' gate, which 1.85 closes. If it was the goat himself, ask where he had come from
  (a roll, a blink talisman, a body shoved into him at the gate).

## 30 September 2026, the souls: two cards, element sets, the goat's own poison (1.82)

Asked for in one message, shipped in 1.82 (see `CHANGELOG.md`) except the line below: two cards a soul
instead of three, a third from a special perk (HUNGRY SOUL) or a special item (THE KNUCKLEBONE, a mouse
talisman: "tier I once in three choices, tier II once in two, tier III every choice"); the goat poisoned
by a puddle after a ring fills round him, slowed only; fire and poison sets that add up (½ s, 1 s, 2 s
of grace, then immunity plus the set's own bonus); the base breath a tile shorter, THE FULL THROAT's
daze at half the radius, VENOM SPIT's puddle six tiles.

- **system**: **the stun set.** Asked for with the other two: each stun soul carried buys grace against
  being stunned (½ s, 1 s, 2 s off `stunGoat`'s time, the way fire and poison do) and lengthens every stun
  he deals; all four, and a man coming out of a stun has forgotten where he last saw the goat (`lastSeen`
  cleared, `aware` dropped back to searching). Parked on purpose ("don't bother with it for now"):
  only three souls stun, THE FULL THROAT, DEAD WEIGHT, LEAPFROG, and the last two are both roll actives,
  so no build can hold more than two. It needs one or two new stun souls (a headbutt or grab passive, or
  a special perk that counts toward the set) before four is reachable.

## 29 September 2026, heaven between deaths, Gungeon's barrels, a supper that scatters (1.79)

Asked for in the session, all shipped in 1.79 (see `CHANGELOG.md`): barrels drawn the way *Enter the
Gungeon* draws them; food on the tables that scatters when the table is hit; and a hub in the sky
between deaths, *Hades*-style, the goat god in light with pompous, silly lines, empty seats for the
animal gods, a blind man who combs the goat on GRAB, something pleasant to do, and a mirror of
permanent upgrades ("in Gungeon I spent four or five hours on the first boss, the heals were too
hard"). Two rooms, one ending at an edge over the earth with the compound far below; jumping off it
restarts in the pen. Read as: the jump is the floor restart a death always was (the pen on floor one,
the middle gate past it), not a whole new run. Left open from it:

- **tool**: `balance.js`'s threat-over-power column does not weigh the mirror. A goat with every rank
  bought has two more hearts, two of light and a quicker roll; if the floors are ever tuned against a
  player who has been up there often, the power column needs a `MIRROR` row.
- **system**: the animal gods only sit and speak. What a saved animal *does* up there (a gift, a
  line that changes with the run) is unwritten.
- **feel**: how long the pasture holds a player between deaths wants a playtest: the edge is one
  room away and Backspace skips it, but nobody but the builder has walked it yet.

## 26 September 2026, answers to the second open-questions page

Every open line in this file, `PLAYTEST.md` §8–9, `CLAUDE.md` and `MARKET.md` §9 was put on one page
(artifact `claude.ai/artifact/19gtHuPqSppc2ZFijuRPKr`, answers in its db) and marked. What was marked
"do" shipped in 1.77 (see `CHANGELOG.md`). The rest, as answered:

- **Shipped in 1.77:** a soul twice a floor, in the middle and at the end ("Душа только два раза на
  уровень"); a full slot offers a swap instead of a silent heart ("выдавать, но предлагать замену
  текущих"); the vault as big grass with two trap versions, clubmen or three mages ("почти вся комната в
  огне, кайф"); a men cap that follows the room's size ("кап людей должен тоже зависеть от размера
  комнаты"); honest curves for THE OSSUARY and THE DARK, a tenth man on THE RAFTERS; THE THRESHING FLOOR
  pushed; the sign on the floor after THE TRIP; the seven unused environment sprites dropped; the Q key
  and THE TRIP written in as the two exceptions to the ground rules; CONCEPT brought up to date.
- **Dropped, do not ask again:** writing a feature freeze into `CLAUDE.md`; drafting the playtest form
  and the itch page; the phones line in the invite; the tester groups; a weak-laptop pass (no laptop).
  LEAPFROG stays an active as it is.
- **Decided against:** the chain headbutt (a struck man knocked into the one behind him); hearts that
  grow by floor.
- **No change:** THREAT stays priced as it is ("room danger rises and so does the goat's power"); the
  price-by-runner tool below is closed with it.
- **Parked, kept in plans ("позже"):** three lives on a run, gamepad (asked for and built on 30 Sep 2026), the Priest boss, the later acts, the
  hunt, hell, heaven (the secret ending; the hub between deaths was asked for and built on 29 Sep 2026),
  the second talisman slot (for the acts). Not to be built without asking.
- **Later, not today:** everything in `MARKET.md` §9 (gore, price, publisher, a GIF export).
- **Still open, unanswered:** where his wife is and what the ending does about her; the "lizards" half
  of "lizards and mirrors".

## 25 September 2026, the ogre on the teeth, a burning crate, POWDER, the rules (1.74)

Asked for in the session, all shipped in 1.74 (see `CHANGELOG.md`):

- ~~**system, the ogre stuck on a cave spire, as a mechanic.**~~ *Shipped: `cave.spikes.impale`.*
- ~~**feel, a FIREBRAND crate lights the man it hits, and a burning crate leaves a fire line.**~~ *Shipped.*
- ~~**feel, POWDER on the barrels that go up, in big letters.**~~ *Shipped (POW / DER, the game's type).*
- ~~**tool, every generator promise has its rule.**~~ *Shipped: new `seal`, `grate`; `crowd`, `caps`,
  `clock`, `shop`, `teach`, `stack`, `bomb`, `beasts`, `shrooms`, `secrets`, `vault` check what gen.js
  promises. Milk in THE ALTAR's calm room is fine (answered "okay").*
- ~~**number, THE TRIP off floors 2–3.**~~ *Shipped 26 Sep 2026: `shroom.from` 3.*
- ~~**tool, retire `js/painted-assets.js`.**~~ *Shipped 26 Sep 2026: deleted, 1.3 MB off the build.*
- ~~**feel, the ominous decals.**~~ *Wired 26 Sep 2026 (`js/decal-pixels.js`).*
- ~~**tool, JUICE sizes typed by hand.**~~ *The rat ogre's entrance and bounce read `TUNING.ratogre`;
  the ogre's slam and landing no longer claim a shake they do not make.*

## 24 September 2026, six audits, not a playtest

Nobody played this. These came out of the new personal skills in `~/.claude/skills` (adapted from
Claude-Code-Game-Studios; see *Skills* in `CLAUDE.md`), each run read-only over the working tree while
1.65 was still uncommitted in another session. Unless an item says *lead*, it was verified: the game's own
files loaded in a node `vm` and its real functions called, the way `tools/balance.js` does it. The full
reports, with every probe and its output, are in `output/audit-2026-09-24/`; the playtest itself is now
`PLAYTEST.md`. Tag **tool** is for the builder, not the game.

### Before the playtest (`PLAYTEST.md` §8 is the full go / no-go, 31 rows)

- ~~**tool, land 1.65 and cut the playtest build from a commit.**~~ *Done: HEAD is 1.74 (checked 25 Sep 2026).* 1.65 exists only in the working tree (22
  modified, 6 new files; HEAD is 1.64). Land it, bump `BUILD` (no spaces: the run code is split on
  whitespace, `game.js:1617`), record the hash, and build the itch zip from that commit, never from a tree
  another session is editing.
- ~~**tool, write the freeze where every session reads it.**~~ *Dropped, 26 Sep 2026.* The 23 Sep freeze lives only at the top of this
  file and on the questionnaire page, and was agreed in a cloud session the local one never saw. Since then
  six new systems landed or are in flight (THE DARK, its own floor, THE FORK, barrels, the saved picture,
  three cards), code outside the asset packs grew 22%, and barrels were built twice (1.56 cloud, 1.61).
  One line at the top of `CLAUDE.md` would hold it: until triage, only **bug** / **feel** / **number** on
  floors 1–3.
- ~~**bug, the dev corner is live in the build testers get.**~~ *Shipped 24 Sep, evening (the polish pass): Hidden on an itch host (itch.io, itch.zone, hwcdn.net) unless the page is opened with `#dev`; everywhere else as before. A code also says `X` for god mode.* Drawn on every screen (`render.js:229`,
  `:3048`), one click from GOD, SPAWN and skip level; `#rules`, `#seed=`, `#trip`, `#dark` work too
  (`game.js:117-131`). A god-mode or easy-mode run code is identical to a normal one, so one curious tester
  skews all three numbers without a trace. Show the corner only when served locally or with `#dev`.
- ~~**tool, the run code cannot tell THE DARK, easy, god or a LEVELS start, and the clear card never copies
  it.**~~ *Shipped 24 Sep, evening (the polish pass): `N` for THE DARK (and `replayCode` rebuilds it), a last token `E`/`X`/`J`/`-`, and leaving the picture card copies its code.* A dark floor's code equals the lit one's and `replayCode` rebuilds the lit floor. Copy happens only
  at `game.js:1876` / `:1888`. Proposed: `N` for THE DARK through `replayCode`, one flags token
  (`E`/`J`/`X`/`-`), a copy on leaving the clear card. About ten lines in `game.js`.
- ~~**number, what the first evening deals.**~~ *Done: THE TRIP from floor 4 (1.74), `roomChance` 0 (1.77).* A mushroom tuft lies on THE YARD in 13 of 25 seeds and
  `shroom.from` is 1 (`tuning.js:1084`), so THE TRIP can take a new player's third floor, inside the thirty
  minutes the plan polishes. Proposed for the playtest build: THE TRIP off floors 2–3, kept in LEVELS.
- ~~**bug, README describes a different game, and testers will read it.**~~ *Shipped 24 Sep, evening (the polish pass): README rewritten with every number read off the code; the page title is DOOMED GOAT.* "Six levels" (:4; there are 8),
  a pen of "three headbutts" (:109; 7), "one [soul] on the first" (:136; 2), "Boons ... die with you"
  (:138; a death takes that floor's only), one hound on THE ALTAR (:77; 0 in 200 seeds), "two milk bowls"
  (:156; 3–5 tufts of grass), a shield worth three (:149; 2), the Butcher at three hits (:126; 4), the seed
  "top right" (:71; bottom-left). And the page title is still `DOOMED GOAT, prototype` (`index.html:5`).
  One pass over "What is in", each number read off the code.
- ~~**tool, one pass on the uploaded page before anyone plays.**~~ *Dropped with the playtest kit, 26 Sep 2026.* Private window, restricted page: no console
  errors, no request but itch and Google Fonts, sound after the first click, CONTINUE after a reload, the
  death card's code really lands on the clipboard inside itch's iframe (a refused copy is silent,
  `game.js:1608`), the RUN CODE line readable at 960×540, the picture saves. Every floor, THE TRIP and THE
  DARK through LEVELS; one weak laptop for the new `foley.js`; a phone only if phones are invited (the
  vanishing phone buttons were never checked on one). *Lead: needs a browser.*
- ~~**tool, an itch zip that holds only the game.**~~ *Shipped 24 Sep, evening (the polish pass): `tools/itch-zip.js`: `index.html` and exactly its scripts, from a clean commit, listed back CRC-checked (3.1 MB zipped after the atlases were recompressed).* `index.html` + `js/` is 30 files, about 6.2 MiB (≈4 MB
  zipped). Zipping the folder instead is 517 files and 207 MB, 175 MB of it the gitignored `tools/shots/`.
  A script that zips the two and lists the zip back.

### What the build deals and does not

- ~~**bug, the vault and the bosses are never paid a soul.**~~ *1.77: the vault never holds one (grass, or a trap); the last boss always does.* The two gates on every floor spend the whole
  budget first, so the vault and last-boss branches (`game.js:1238-1250`) never run: 0 of 450 vaults over 50
  seeds of every floor and THE DARK. A boss only carries a soul through the 40% bonus. Give one back to the
  vault or the boss, or delete the branches and the docs that promise it.
- ~~**number, a run deals about 18.6 souls into a build that holds 14.**~~ *1.77: two a floor, no surprises, thirteen a run; a full slot deals swaps.* 13 authored (2 a floor, less the
  mouse's 3) plus about 5.6 seeded (a lit boss 77/200, a room that gives one up 64/200, per floor). Past a
  full build every one of them turns into +1 heart with no card and no word (`game.js:556`): about 5 a run
  over 2000 simulated runs. And the room one argues with pillar 1: `soul.roomChance` 0.35
  (`tuning.js:1212`) pays for clearing a fight room. Proposed: `roomChance` 0 (the 23 Sep answer was "make
  them fewer"), and stop rolling bonus souls once no card can open. ⚠ `roomChance` 0 alone drops THE
  OSSUARY's threat over power by 4.6%, because the cap stops soaking up the extras; with THE RAFTERS and
  THE OSSUARY cut to one authored soul each as well, the late floors stay flat within noise and the souls
  that open no card fall from 4.4 to 0.5 a run (measured).
- ~~**bug, `sluice` is never dealt, and the top of every canon is starved.**~~ *Shipped 24 Sep, evening (the polish pass): `draw` ranks a room among the rooms of its own pool, with a window that covers a pool larger than its draws: every template of every canon 40–150 times in 200 seeds.* `draw` (`gen.js:256`) only
  reaches a canon's most open room on the last room, which is always an arena: `sluice` (`rooms.js:717`)
  0 times in 200 seeds, windowrow 12, vise 17, gallery2 18, flanks 22, against 100–500 for their
  neighbours. The same at HEAD.
- ~~**bug, an escort on the last floor pays nothing, and the crow's card says it will.**~~ *Done before 25 Sep 2026: `Beast.deal` never deals the last floor.* THE OSSUARY has a
  coop on 200 of 200 seeds; the run ends in the win before the gift is placed, while the card says "IT WILL
  BE ON THE NEXT STAIRS, FREE" (`tuning.js:2214`). No coop on the last floor, or pay it on the win card.
- ~~**bug, THE BRIDGE's hint still thinks it is the last floor.**~~ *Shipped 24 Sep, evening (the polish pass): MORE OF THEM THAN EVER. MEET THEM IN THE DOORWAY.* "EVERYTHING THEY HAVE LEFT IS HERE"
  (`tuning.js:2144`) is from 0.8, when it was fourth of four. It is sixth of eight now.
- ~~**bug, BELLWETHER'S BELL III says MILK for a thing the player sees as grass.**~~ *Shipped 24 Sep, evening (the polish pass): GRASS, and the FIXTURES label too.* `tuning.js:1754`; the
  disguise is a `heal` prop drawn as a sprout since 1.38, and FOUR STOMACHS already calls it GRASS. The
  FIXTURES label `MILK BOWL` (`render.js:4092`) wants the same word.
- ~~**system, THE ROAD and THE BRIDGE deal no mix room at all.**~~ *CONCEPT says what the floors deal (answered: update the concept).* Mix rooms per floor over 80 seeds: 1, 2,
  3, 0, 1, 0, 2, 1, and THE OSSUARY's one never uses THE HOLLOW, OPEN GROUND or THE FUNNEL, while
  `CONCEPT.md:165-167` promises the back half is "everything it has taught you, shuffled". Question below.
- ~~**bug, eat the mushrooms on THE ROAD, then take the dark stairs, and the trip wins.**~~ *Shipped 24 Sep, evening (the polish pass): The flight climbed wins; the lit flight's floor says THE TRIP when that is where it goes.* `game.js:1124`.
  *Lead: static only.*

### Balance

- ~~**tool, `balance.js`'s power column counts souls the game does not deal.**~~ *Shipped 24 Sep, evening (the polish pass): It counts the floor's souls, the mouse's talisman and the two surprises at their odds, up to the fourteen a build holds; within 2% is "flat". Only THE THRESHING FLOOR still falls.* Two a floor forever
  (`tools/balance.js:152-160`): no mouse, no chance souls, no 14-card cap. Rebuilt from the real deal (40
  runs, two pick seeds, noise under 2%), power at each level's head is 4.0 / 6.94 / 8.92 / 11.74 / 13.31 /
  15.75 / 16.92 / 17.85, and THE RAFTERS and THE OSSUARY stop being "easier than the last": they rise.
  Report "flat within 2%" apart from "falls".
- ~~**number, THE THRESHING FLOOR is no harder for the goat than THE ROAD.**~~ *Shipped 25 Sep 2026 (1.74): `cap: { men: 9, dog: 3 }`, threat 108.4 → 113.0, every rule holds. Threat over power 7.2 → 7.5 against THE ROAD's 7.9: still flagged, and a higher `to` buys almost nothing against the caps.* Flat in every power model
  (−0.2% to −6%), and its `cap: { men: 8 }` starves 43% of its rooms. Proposed `cap: { men: 9, dog: 3 }`
  (`tuning.js:2112`): threat 109.1 → 113.0, +3.3% over THE ROAD, every rule holds (measured). The same
  direction as the 23 Sep "eighth man", and likely the "overpowered by level five" note.
- ~~**number, the score lets bodies beat pace.**~~ *Shipped 24 Sep, evening (the polish pass): `killMul` 0.02, `killCap` 1.5, as proposed.* `killCap` 2.5 is above `fastCap` 2 (`tuning.js:1204`), so
  at par a run of 25+ kills outscores the fastest run with none (2500 against 2000), against
  `CONCEPT.md:377-379`. Proposed `killMul 0.02, killCap 1.5`: a clear at par scores 1500, under the fastest
  pacifist's 2000. Measured on the real `scoreFor`.
- ~~**system, saved geese make the scream a permanent lock.**~~ *Shipped 24 Sep, evening (the polish pass): `TUNING.goat.scream.minCooldown` 2, applied after the geese in `applyBoons`.* `beasts.js:484` multiplies the cooldown by 0.8
  a goose with no floor: 0.82 s with four geese, under the 0.99 s daze. FULL THROAT + RAW THROAT + four
  geese: three men all dazed 98% of the time, no heart lost, against four hearts and eight of eight dead
  with no voice (8 seeds). Proposed `TUNING.goat.scream.minCooldown: 2`, applied after the geese: dazed
  share 31–33%.
- ~~**number, the late curves ask for threat their caps cannot buy.**~~ *1.77: honest curves, a tenth man, caps that follow the room.* THE OSSUARY asks 34.4 a room and gets
  18.8 (83% of rooms short); THE RAFTERS hits its ceiling from room 5 of 15; THE DARK loses 29%. Honest
  `to` values break two rules; caps of men 11 / hunter 3 add 6% and 13% with every rule holding, against
  the `ENCOUNTER.cap` comment "eight of anything is a wall of bodies". Question below.
- ~~**bug, easy mode's numbers are not what its comments say.**~~ *Shipped 25 Sep 2026 (1.74): easy multiplies `enemySlow` (1.4 × the base, the 40% its card says); the wall stun, the wraith's solid window and the ogre's answering slam read the enemy clock and `tuning.js`; easy and god-mode clears no longer write BEST (`game.offBoard`).* `tuning.js:1289` says a normal run has
  `enemySlow` 1; `BOON_BASE.enemySlow` is 1.1, so easy is 1.27×, not 1.4×. The wraith's `solidAfter`
  (`enemies.js:1378`) and the butcher's wall stun (`:883`) ignore it, and the butcher's retaliation swing
  uses literals 0.55 and 1.6 (`:771`), against ground rule 2. Measured: easy is almost all its two extra
  hearts (damage rates only 6–24% lower). Easy scores go on the same BEST board (`game.js:1505`).
- ~~**tool, price THREAT by what a kind takes off a goat who runs.**~~ *Closed, 26 Sep 2026: no change.* Hearts a minute, one man against a
  circling goat (±20%): clubman 16.1 (THREAT 1), hound 18.4 (1.7), rifle 14.9 (2.4), butcher 15.5 (5),
  seer 5.2 (2.8). Late rooms swap clubmen for dearer kinds, so late threat likely overstates what a late
  room costs a runner. One side only: crowds and the seer's runes are not in it.

### Docs that teach the wrong game

- ~~**bug, CONCEPT's level table and souls section describe an older build.**~~ *Shipped 24 Sep, evening (the polish pass): CONCEPT read off the code by hand, and `tools/doc-numbers.js` now holds its numbers (and README's and CLAUDE's) against the code.* "Seven levels" (8); six of
  eight room counts wrong (:179-186); THE CAVE listed last with rifles and an elite Seer (it is third, no
  hunters, a Butcher and a brute); "thirteen across a run against sixteen boons" (:325; 25 boons);
  TUCK AND ROLL (:339, cut); "the soul gate, on level one only" (two gates on every floor); killbox on
  "four" levels (5); doors "three blows" (planks 1, iron 3); spikes "from the third level" (fourth);
  bearer windup 0.58 s (0.46); hunter aim 0.8 s (0.88); "pixel art proper" still under not built (:412).
  Generate the table from `LEVELS`, the way `juice-md.js` writes `JUICE.md`.
- ~~**bug, `CLAUDE.md` teaches the dropped souls design and the old painted pack.**~~ *Shipped 24 Sep, evening (the polish pass): The open question is now the boon souls' count; the painted pack is described as the `#paintedprops` fallback.* Its open questions
  still carry the souls resource as unsettled and suggest a soul door that opens for souls; the question
  that is actually open ("whether the existing soul count should drop further") is not there. The file map
  says `painted-assets.js` holds props with "no pixel sprite yet", which its own open question contradicts.
- ~~**bug, this file's 1.40 shop item still says she sells for souls of the killed.**~~ *Shipped 24 Sep, evening (the polish pass): A note under that heading says 1.41 took the prices out.* 1.41 took the prices
  out ("No more prices in the dead"). Also: the grass passive and the pounce are "Not built" in the
  23 Sep answers (above) but shipped in 1.61, and LEAPFROG shipped as an **active** where the answer asked
  for upgrades to passives (question below).
- ~~**tool, `ART_TODO_GPT.md` would waste an image-generation round.**~~ *Shipped 24 Sep, evening (the polish pass): A DONE header; kept as the brief format. `ART_HANDOFF.md` says 1.58.* It is the state at 1.53: every sheet
  in it shipped as pixels in 1.63–1.64, it calls the deleted `js/combat-assets.js` "уже в игре", and two
  briefs contradict the 1.63 designs. A DONE header, keeping it as the brief template; the one live line is
  wiring the ominous decals. `ART_HANDOFF.md:22` says 1.56 for 1.58.
- ~~**tool, a numbers check for the docs, the way `balance.js` checks the generator.**~~ *Shipped 24 Sep, evening (the polish pass): `tools/doc-numbers.js`, 57 claims, exits 1 on a wrong one. The hand-typed sizes in `js/juice.js` went on 25 Sep 2026 (1.74).* A throwaway regex
  runner (doc sentence → the `TUNING` / `LEVELS` value it names) found 28 conflicts in 82 numbers, some
  unnoticed for eight releases, and code comments too ("a third heart" over `hp: 4`, `tuning.js:412`; "a
  shield is three" against 2). As `tools/doc-numbers.js`, exiting non-zero. `js/juice.js` also carries
  three hand-typed sizes the code no longer pays (the rumble, two shakes the code zeroes).

### Weight (the build is 6.47 MB; these take it to about 3.9)

- ~~**system, retire `js/painted-assets.js`: 1.32 MB the default build never draws.**~~ *Deleted 26 Sep 2026.* With pixel props on,
  0 of its 15 images reach the screen (21 prop and door paths driven, HEAD the same). It is still a load
  gate (`painted-art.js:206`) and the source of two aspect ratios, so: gate on `PIXEL_ENV.ready`, write in
  the altar's 237/384 and the gong's 190/192, then drop it from both script lists and pass `null` in the
  files map. Answers the open question in `CLAUDE.md`.
- ~~**tool, harden alpha and recompress in both packers: 1.15 MB.**~~ *Shipped 24 Sep, evening (the polish pass): `tools/png-harden.js`, the packers' last step; checked pixel for pixel in the browser.* `pack-pixel.ps1` leaves about 48% of
  the atlas at alpha 250–254, which `PIXEL_ART.init` snaps to 0/255 on every load anyway. Re-encoded:
  2,799,768 → 1,820,692 bytes, and the environment atlas 546,084 → 373,640. Never a lossy palette:
  `hornsOf` reads exact colours (`pixel-art.js:119`).
- ~~**system, seven environment sprites nothing draws.**~~ *Dropped from the atlas in 1.77. `floors-12` (gravel) is an eighth nobody draws since the 25 Sep art pass.* `floors-15`, `room-props-06`, `room-props-08`,
  `cave-props-03`, `-04`, `-07`, `-08`: 19.5% of the atlas area. Wire them in as litter or drop them
  from the manifest.
- ~~**tool, the dead combat-art pipeline.**~~ *Deleted 25 Sep 2026 (1.74).* `tools/pack-combat-art.cjs` writes `js/combat-assets.js`,
  deleted in `12f00b1`; running it would make a 1.6 MB script no page loads that the publish rule would
  ship. Its source `assets/combat-fx/effects.png` (1.2 MB) has no loader. Delete both, trim the README.
- ~~**tool, `audio-check.js` never loads `foley.js`.**~~ *Shipped 24 Sep, evening (the polish pass): It renders every recipe and checks every name `audio.js` asks for.* It passes while all 47 foley calls go unexercised.
  A scratch probe rendered all 43 recipes in node (no throws, no NaN, none silent) and checked every name
  `audio.js` asks for: fold it in.

### Questions only you can answer

*All answered on 26 Sep 2026 (the batch at the top of this file).*

- Is 1.65 the last feature build before the playtest? *Recommended: yes, then freeze through triage.*
- THE TRIP on floors 2–3 for a first-time tester? *Off for this round, kept in LEVELS.*
- The soul a cleared room pays (`roomChance`)? *Remove it.* And do "make them fewer" also mean the boon
  souls? *Only the extras: stop them once the build is full.*
- The vault and the boss: give one of the floor's two souls back, or delete the branches? *Delete the
  branches and fix the docs.*
- LEAPFROG as an active, against "upgrades to passives"? *Leave it for the playtest, decide at triage.*
- THE TRIP halving the hits on the goat, against ground rule 4? *Keep it and write it into rule 4 as the
  trip's exception.* And pillar 6 against the talismans' Q key? *Record the 18 Sep exception in the pillar.*
- "The back half is everything it taught you, shuffled": still the design? *Rewrite CONCEPT to what the
  floors deal, unless mix variety matters.*
- The new sound effects in the playtest build? *Only if the sfx board and a weak laptop pass this week.*
- `#paintedprops` side-by-side, and with it the painted pack? *Retire it; git keeps it.*
- A first-load weight you accept for itch players on phones? *4 MB raw or less.*
- The late floors: a plateau with honest curves, or men caps raised to 11? *Honest curves for THE
  OSSUARY and THE DARK, a cap of 10 on THE RAFTERS only.*
- RAW THROAT holds a pack of hounds 94% of the time: the "answer to a pack", or too much? *Keep it, with
  the 2 s floor so the geese cannot extend it to everyone.*
- Should THREAT price the danger to a goat who runs, or how hard a kind is to kill? *The danger to a
  runner: that is pillar 1.*

## 24 September 2026, the grab button's balance (decided, shipped in 1.65)

Asked after a read of BY THE COLLAR against the rest of the deck. Everything below **shipped in
1.65** (numbers and reasoning in `CHANGELOG.md`); it is written down here because these are the
user's decisions, and a later pass must not quietly undo them:

- **DEVOUR stays deleted.** "Сильно поломанный": a kill with no wall and a heart back nearly one time
  in two. Do not bring it back as a boon, a talisman tier or a passive without asking.
- **Lifting a man has a windup** (`grab.bite`), "because you get your teeth under him". Grabbing a man
  mid-swing is **allowed on purpose**: the windup is the price, not a rule against it.
- **The throw is weaker than the headbutt.** The headbutt is the universal verb and reaches further
  (`physics.thrownKill` vs `splatSpeed`); the collar is a choice with its own pluses and minuses (a
  shield, a throw, a slow walk), not a better headbutt. Keep the throw's lethal range under the
  headbutt's when tuning either.
- **A man costs a longer grab cooldown** than a thing (`grab.manCd`), and **the card says so**.
- **Carrying a man is 0.6 of a stride**, so a mage casting in your mouth is only just escaped.
- **The two grab-button actives are poison and fire, read differently.** VENOM JAW: floor, whoever it
  hits, a puddle where it stops. FIREBRAND (was CHARGED): a line of fire along the flight only, never
  where it lands or on who it hits, and men route round it. No explosion.
- **Open, to watch in the next playtest (number):** whether `grab.bite` 0.18 s reads as "a little
  preparation" or as lag; whether 3 s of FIREBRAND's line is long enough to split a room; whether
  BY THE COLLAR still out-picks the scream actives with `BOON_POWER` 1.3.

## 23 September 2026, answers to the open-questions page

Every open line in this file was put on one page (`tools/backlog-questions.html`) and marked. What
was marked "do" shipped in 1.56 (reasoning in `CHANGELOG.md`): the run code, barrels, one death
instead of two off a headbutt, a lighter fog shade, a fuller THE THRESHING FLOOR, hints naming the
new thing on THE CAVE and THE BRIDGE, the burst/bleed death counter, and synergy/addition marks on
the BOONS tab (the tab itself already existed). The rest, as answered:

- **Closed, "already fine":** the endless roll, "delete the bird", the spinner over the traps, the
  brazier room, the hunter's shot tell, the far wall's tilt, the lesson room's dead-straight headbutt,
  the line at the first man (stays `LEFT CLICK - HEADBUTT`), and the deck at 36 as it stands.
- **Still open, with what was said:**
  - *The Mill lesson bearer who ran past the wheel:* approached **from a stop at the door**, the same
    way the three reproduction tries did. So it is not speed; the thing left to check is the room's
    own spawn and `trapSense` pin on the seed it happened on. The run code will carry the seed.
  - *A kill already counted in the first room:* marked "do". Not reproduced: every level started on
    two seeds and left alone for five seconds counts nothing. The run code now carries the level's
    first body, its cause and its second, so the next sighting names what died and how.
  - *Later:* phone controls vanishing, whether THE TRIP's scramble carries into the next floor, the
    second talisman slot.
  - *Passives:* of the three candidates, **grass heals two but the max is a heart lower** is the one
    wanted. *Built: FOUR STOMACHS.*
  - *Actives:* the pounce and the chain headbutt are wanted **as upgrades to passives**, not as
    actives of their own. Not built.
  - *A souls resource (one per man):* **decided against for now.** "Not spending them. Make them fewer
    or take them out. We are not focusing on this; the economy only distracted." Nothing is built for
    it, so nothing is taken out; whether the existing soul count should drop further is open.
- **The plan around the playtest** (freeze features, polish the first thirty minutes, a clean build,
  itch.io, 10–15 new players, 3–5 watched, a six-question form, the positioning question, three
  numbers) was agreed as written on the page.

## 23 September 2026, first word on THE TRIP

- **feel, THE TRIP reads okay.** Needs a minute to adjust, then it is fun, like an exercise for the
  brain rather than a fight against the controls. The one thing that stuck afterward: coming back to
  the normal layout on the next floor feels strange for a beat, the same way the scramble itself did
  going in. Not a complaint, worth knowing whether that carries over into how the next floor plays,
  or fades in a room or two. First playtest word on it; wider testing not run yet.

## 22 September 2026, nine items, mostly "tell me less, show me more"

All shipped in 1.49; the reasoning is in `CHANGELOG.md`.

- ~~**feel, the cave's stalactites do not stick out of walls, they rise upward.**~~ They used to hang
  down out of the rock's face onto the floor. Rooted on the floor at the foot of the cliff now and
  drawn up over the face and past the top of the rock.
- ~~**system, if something spiky (rarely) sticks out of a wall, let it damage.**~~ `kind === 'spire'`,
  `TUNING.cave.spikes`: stone teeth at the foot of a cave wall, in three rooms in ten and one to a
  room. Not blocking, so it can be walked into; a man dies on it, the goat pays a heart, and the cult
  steers round it, so it is a thing to throw men into. Old blood at its foot is the tell.
- ~~**feel, the gem seams should only be on the cave edges you can actually see; you are not looking
  inside the rock, so do not draw it there.**~~ On the visible face band only, and fewer of them.
- ~~**number, on the mushroom level the enemies should be first-level strength whatever floor it
  replaces: nothing that shoots, mages allowed, one man a room. It is very hard with those
  controls.**~~ `TUNING.shroom` now carries the curve, the cap and the roster.
- ~~**feel, a little more camera on the mushroom level.**~~ The lens breathes and leans
  (`TUNING.shroom.cam`), out of step with itself on the two axes. Not a shake.
- ~~**system, a door or a passage should only ever be at the far end of a room, never the near end,
  so you are automatically given a reason to run there and to think about what to do with the men on
  the way.**~~ `DOORS.far` and `GEN_RULES.farexit`.
- ~~**feel, stop shaking the screen on effects. A little shake, and only when you took damage.**~~
  `game.shake(a, hurt)`; everything else is multiplied by `juice.shakeOther`, which is 0.
- ~~**feel, instead of the caption THREE BOWLS OF MILK, just make it a huge bucket of milk.**~~ One
  pail as tall as the goat, three hearts in it, drunk a heart at a time where it stands.
- ~~**feel, next to each artifact, the literal meaning of what it does. None of this smeared
  bullshit.**~~ All sixty-three tiers rewritten from prose into numbers.

## 18 September 2026, a second pass, ten items

Shipped in 1.36; the reasoning is in `CHANGELOG.md`.

- ~~**bug, enemies do not always react to footstep noise; a run right up on somebody's back
  sometimes goes unnoticed.**~~ The emission was a coin flip every frame and could go a half-second
  without landing; it is a timer now, and the hearing radius came up with it.
- ~~**number, the Butcher is weak. More HP, a bigger reach on his own swing, and charges that
  actually happen.**~~ Three hearts to four, reach up a fifth, asks for less ground to charge on and
  gets back to it sooner.
- ~~**feel, the milk prop looks wrong; bring back the earlier grass look.**~~ Reverted the ordinary
  heal's paint from a wooden bowl back to a smaller sprout of the same grass the rare, bigger patch
  already is; the reward split (`+1` vs `+2` hearts) is untouched.
- ~~**feel, the opening scene's music should have an arc: happier in the meadow, more tense through
  the truck and the dark, and most tense of all when she is taken.**~~ `roomMusicScene` returned
  empty for the whole intro, which is why nothing was moving; it now reads `game.intro.phase`.
- ~~**feel, the first screen should open on black and say something, so it reads as a flashback and
  not as the game starting somewhere strange: "Some time ago."**~~
- ~~**system, the wraith should be immune to an ordinary flame and to the scream's stun (and it
  already was to BY THE COLLAR); exposed as checkboxes in the tool.**~~
- ~~**system, the Butcher and the hound should keep coming at you while they burn instead of losing
  their AI to it; a per-kind immunity checkbox in the tool rather than a hardcoded exception.**~~

## 18 September 2026, eleven items after a death screen

All shipped in 1.34; the reasoning is in `CHANGELOG.md`.

- ~~**feel, the death card should say DIED, not THE GOAT DIED, and always name the level.**~~
- ~~**feel, the shield should be bigger, on the stand and in the mouth, so blocking is more fun.**~~
- ~~**system, a rifle inside 1–2 tiles misses half the time, wildly; in the bestiary and the tool.**~~
- ~~**system, reaching for a hound with BY THE COLLAR makes it hop back a tile and spends the grab.**~~
- ~~**bug, enemies should only come alive once they are near the screen, to stop deaths from
  nowhere.**~~
- ~~**bug, on phones the controls disappear a few seconds into play.**~~ Not reproduced on a phone:
  the fix covers the two causes found in the code (a volume-key `keydown`, and a tap reported as a
  `mouse` pointer). If it still happens, ask which browser and whether it follows a volume press.
- ~~**bug, enemies spawn inside crates and cannot move.**~~
- ~~**system, a sword has two lives like the shield, cuts on contact even in the teeth, and is
  rarer.**~~
- ~~**system, a rifle cocks audibly before it fires; in the game and the tool.**~~
- ~~**system, the hen: pathfinds after you and avoids traps; a coop you pass breaks itself at the
  edge of the screen; bringing her to the end of a level says so and is worth +1 heart.**~~
- ~~**number, THE ORACLE sees too much: a big radius, but the far corners should stay unknown.**~~

## 16 September 2026, a correction and two more, right after the eleven-item batch shipped

A look at the build the eleven-item batch produced, three lines.

- ~~**bug, the bottom-wall fix still read as wrong: a pillar or a boxed-in block showed the same
  deep brick band a straight run now gets, which is not what a "closed corner" should look
  like.**~~ `nearFaceDepth` (`painted-art.js`) now only widens for a near face that is the *only*
  thing exposed on that tile, an E or W bit still set on the same mask falls back to the plain
  `lip` it always used, so a corner or a pillar keeps its old, shallow look and a plain run of wall
  keeps the new, deep one. See the correction in `ART_HANDOFF.md`.
- ~~**feel, a room nobody opened should still show on the death screen, not read as a gap between
  corridor stubs.**~~ `drawUnseen` painted an unopened room fully opaque, in the level's own near-
  black `fog` colour, since a corridor is never hidden at all (see `CLAUDE.md`'s fog section), the
  practical effect on the death screen was corridor fragments floating in black voids where the
  actual rooms were. It now dims the same fog to 0.6 alpha whenever `game.state === 'dead'`, and
  stays fully opaque for ordinary play, the fog is there to keep a room unseen, not to be looked
  at, so nothing about how it plays changed.
- ~~**system, the rare pickable bomb (asked for 14/16 Sep, never built) genuinely does not exist
  anywhere in the game.**~~ Built: `kind === 'bomb'`, an `item` like a crate, grabbed and thrown the
  same way, armed the first time it is thrown (`Prop.fling`) and detonating wherever it comes to
  rest once its fuse runs out, two hearts inside `nearR`, one heart out to `blastR`, the goat pays
  it too if he is standing in it, and anything past `nearR` that survives is flung rather than
  killed outright. Placed by `carveSecret` in the niche a stand of arms would otherwise go
  (`TUNING.secret.bombChance`), which is what keeps it to the one-or-two-a-level the original ask
  wanted without a count of its own. No painted asset exists for it, so it draws as a plain dark
  shell with a shortening, sparking fuse. See `CLAUDE.md`'s "The bomb."

## 16 September 2026, another sitting, eleven items, one burst

Most of it shipped same sitting; the reasoning behind each is in `CHANGELOG.md` under 1.29.

- ~~**bug, the death screen's level map read as a scatter of disconnected rooms with black gaps
  between them, and did not fill the width of the screen.**~~ Both were the same bug: the death
  camera fit itself to `lvl.W`/`lvl.H`, the fixed 420×78-tile world **buffer**: rather than to
  the rooms the level actually carved into it. A ten-room level barely dents that buffer, so the
  run's own rooms rendered as a small huddle off to one side with the rest of the (unused, solid)
  buffer read as empty black gaps. `onGoatDied` now fits to the bounding box of `lvl.rooms`
  instead. Confirmed against both a short death (pen) and a long one (last room), the map now
  runs edge to edge either way.
- ~~**feel, the death screen should say how many were killed.**~~ Added as its own line on the
  card, the same wording the level-clear and run-end cards already use (`N sacrificed`).
- ~~**bug, couldn't get close to a door; a big, unexplained gap stood between the goat and it.**~~
  `Prop.r` (29, tuned to cover the door's span across a two-tile gap) was being used as a plain
  circle for the goat/enemy-vs-door push-out too, which stops anyone 29px from the door's **centre
  in every direction**: including straight at its 13px-thick face, a whole extra tile short of
  where the (much thinner) painted slab actually is. `collideEntities` now finds the closest point
  on the door's actual rectangle (`TUNING.prop.door.thick`, new) instead of treating it as a disc;
  the span (`r`) it was tuned to fully cover is untouched. A tunnelling fallback (centre landing
  inside the thin slab in one step) mirrors the one `world.js`'s wall collision already has.
- ~~**feel, a room's bottom (near) wall did not read as bricked; a flat panel where the coursing
  should be.**~~ Flagged before and apparently lost, see `ART_HANDOFF.md`'s "still open" note,
  now closed. `PaintedArt.wallTile`'s near face (`bit:1`) tied its own depth to its own presence
  bit, so it was capped at the 40px junction lip on *every* tile, corner or not, the other three
  faces get that same cap only where a perpendicular wall actually needs the room. A straight run
  of near wall (the common case) now gets a much deeper face (`nearDepth`, 76px of the 128px
  tile) since there is no corner to leave room for; a real corner still narrows the same as ever.
  Checked against both a straight run and a corner.
- ~~**feel, the skill-rail captions (LMB/RMB/E/SPC) still read as crowding `N SACRIFICED`, after
  the last 4px nudge.**~~ Nudged again, another 5px (`drawSkills`, `render.js`).
- ~~**feel, inconsistent punctuation: `LEFT CLICK, HEADBUTT` still used a comma where the ambush
  room's lines were already moved to a hyphen.**~~ Every place that exact string is drawn (the
  keyboard control line, its touch equivalent, the pen's own cage prompt, and the hint-key table)
  now reads `LEFT CLICK - HEADBUTT` / `BUTT - HEADBUTT`.
- ~~**system, secret walls (the cracked-wall niches) show up before they mean anything on level
  one; not needed until after the first miniboss.**~~ `levelDef.secretsAfterBoss` (set only on THE
  ALTAR) keeps the secret pool to rooms past `arenas[0].at`, no wall gives before the champion.
  Every other level is untouched; they already assume the mechanic is known.
- ~~**system, the roll (E) should be called out at the entrance to the first miniboss, not just
  "somewhere past the middle of the level".**~~ Block 3's room pick now prefers the ordinary room
  right before a level's first arena, when that room is itself a valid candidate (has men, isn't
  the lesson/ambush/vault/trap room); falls back to the old "closest to the middle" pick otherwise.
- ~~**system, an option to decline a soul: take none of the three cards offered.**~~ A fourth
  choice, `RELEASE THE SOUL`, on the boon-choice screen (violet, apart from the three cards rather
  than styled as a fourth one), click, tap, or `4`. There is no bank to put a released soul back
  in yet (see the open "a souls resource" question at the bottom of this file), so it is simply not
  taken; nothing is owed back for it.
- **bug, reported: the near bearer in the Mill lesson room ran past the wheel on level one without
  it touching him.** Not reproduced. Tried the room fresh three times (three seeds), goat entering
  at the room's own `enter` point each time and left standing there while the room played out in
  real time: the `trapSense: 0` bearer took the arm and died on all three. If it comes back, the
  thing worth knowing is *how* the room was approached, from a dead stop at the door like these
  tries, or moving fast/at an angle through it (a boon-heavy or mid-roll goat could reach the far
  side quickly enough that the bearer's own path to him never crosses the arm's sweep at all, which
  would be a real gap in the room rather than a re-roll of the same test).

## 16 September 2026, later still, six screenshots, sent in small bursts

All of it shipped same sitting, once the first pass at two of these turned out to be a real look
rather than a full build; the reasoning behind each is in `CHANGELOG.md` under 1.27.

- ~~**The ambush room's floor text is too long to read at a glance.**~~ **feel.** `RIGHT CLICK,
  GRAB OBJECT` / `RELEASE OR LEFT CLICK, THROW` cut to `RIGHT CLICK - GRAB` / `RELEASE - THROW`
  (and the touch line to match, `RELEASE, THROW`): drop the redundant "OBJECT" and the second way
  to let go, which the ambush room does not need to teach at once.
- ~~**The skill-rail captions (LMB/RMB/E/SPC) sit flush under their icons, crowding `N SACRIFICED`
  right under them.**~~ **feel.** Both nudged down 4px worth (`drawSkills` in `render.js`).
- ~~**The Mill lesson's nearer bearer sees the goat and takes the wheel too fast to read as cause
  and effect.**~~ **feel.** `Enemy.noticeFor`, set only on the room's own two men: a beat to plant
  and face the goat before either one moves, so the one about to take the wheel in the chest reads
  as the room deciding rather than a coin flip landed before the door was even open.
- ~~**That same room, three tiles shorter, height fixed rather than left to the row count.**~~
  **number.** `MILL_LESSON_TEMPLATE` in `rooms.js` cut from ten rows to seven. Checked against
  `mill.armLen` rather than by eye first: the hub now sits one row off the top wall (inside the
  arm's own reach, so it hits that wall outright) with three rows below it, of which only the
  last sits outside that reach, exactly the one lane of clear floor the room was always meant to
  leave. `node tools/balance.js` and the generator sweep both hold across every level and seed.
- ~~**A patrolling man can end up facing a wall for no reason.**~~ **feel.** `idleWander` now
  resamples a chosen facing up to five times against a look-ahead probe (`TUNING.ai.wanderClear`)
  before committing to it, the same kind of check `avoidHazard`'s own `walkable()` already does.
- ~~**The bomb explosion is too big and too slow on screen; it hides the fight behind it.**~~
  **feel.** The real blast radius (what it flings and damages) is untouched; `TUNING.goat.bomb`
  grew a separate `fxScale` and `fxLife` that only shrink and shorten the burst graphic itself.
- ~~**A goat-head cursor.**~~ **system.** Asked before (ninth sitting, 15 Sep 2026) and parked as
  an art-pipeline item; an inline SVG wrapping the 🐐 emoji turned out to need no art pipeline at
  all, `CURSOR_GOAT` in `game.js`, `encodeURIComponent`-built rather than hand-escaped.
- ~~**The spike-grate band is hard to read where it runs into the unlit part of a room.**~~
  **feel.** The grate's metal rail and slot highlight are a shade brighter now, so a band still
  reads as iron rather than floor shadow under the fog's own shading pass.
- ~~**Bomb Charge should cost a real hit, not skip the two-hit rule.**~~ **number/system.**
  `die()`'s absorb no longer excludes `'boom'`: a multi-hit target takes one off and goes down
  floored on a first charge, and only a second charge (or any other blow) landed while he is
  already at his last heart actually finishes him. `CLAUDE.md`'s "Two hits" note updated with it,
  this was a documented rule changed on purpose, not a bug quietly patched.
- **feel, patrolling (not yet aware) men should never die to a trap they are only walking past.**
  Confirmed already true rather than changed: `avoidHazard` in `enemies.js` only ever rolls the
  trap-blunder chance `if (this.aware && ...)`, an idle patrol steers clear of a hazard every
  time, on purpose. If this comes back, ask which room: it is probably the Mill lesson's own
  scripted `trapSense: 0`, not a hole in ordinary patrol behaviour.
- ~~**Freeze whatever is at least a room away from the goat.**~~ **system.** The enemy update loop
  now skips anyone whose home room is two or more rooms off by index from wherever the goat is
  standing, never the room he is in or its immediate neighbour, which stays wider than any noise
  radius in the game, so "a man still hears you through stone" is never something this quietly
  breaks. See the new note on it in `CLAUDE.md`, right after the patrol leash.

## 16 September 2026, night, one screenshot and a second pass at the deck

A screenshot of the live 1.26 build with three things marked on it, plus a chunk of talking
through the boon system again. The three marked bugs are fixed same sitting (reasoning in
`CHANGELOG.md` and `ART_HANDOFF.md` under 1.26); everything else here is unbuilt.

- ~~**bug, a dying butcher/elite bearer tore into plain clubman gore.**~~ `CombatFX.snapshot`
  kept its own kind map instead of `PaintedArt.characterKey`; one map now.
- ~~**feel, the near wall of a room read as bare rock, no bricks.**~~ Its face-shade overlay
  (0.27) was crushing its own coursing next to the far wall's (0), down to 0.1.
- ~~**feel, a hunter's aim tell had gone dark.**~~ It only ever lived inside the primitive
  fallback body; once his painted sprite took over it silently stopped drawing. Its own method
  now, called for either body.
- **feel, the far side of a wall did not read as "pulled" for the tilt.** Open. `wallTile`'s four
  faces are geometrically symmetric, so this is a different complaint from the one above and not
  fixed by the shade change, see the note in `ART_HANDOFF.md` for where to look next (`lip`, or a
  second wall row through a corridor mouth) once it has been played against the fix that did ship.
- **system, a rare pickable bomb, mostly found in secrets.** One to two a level, an item like a
  crate or a weapon (grab, carry, thrown by the same button that throws anything else). Explodes
  in a 4×4 area; the goat takes damage from his own blast too if he is in it. Two hearts at the
  centre, tapering to one at the outer edge of the area, a radius-scored hit rather than a flat
  cost, the same shape `flungHits`' two speed thresholds already use for a body. Rare enough that
  it reads as a find, not a tool: the number to hold it to is per-level count, not per-room chance.
- **feel, return the hunter's shot to being readable before it lands, further than the tell
  above.** Distinct from the aim-tell bug: that one is about the tell existing at all; this is
  about how far ahead of the shot it gives you, and was asked for as "how it read in a build
  before this one" rather than as a fresh idea. Needs which build, or a description of what read
  better about it, realism is explicitly not the ask ("we'll work on realism later").

### system, the deck at 36, restated with new candidates

This is the already-parked **"the deck at 36: a grid of four verbs by three archetypes, dealt in
turns"** further down this file (16 Sep, evening sitting; it was "dealt in turns" alone until the
archetype grid was added to it): two actives a verb (three eventually), two passives a verb (three eventually),
eight general passives, dealt active/passive/active/passive until every verb has one, then one
active-as-replacement plus two passives. Two pieces of that plan were re-described tonight,
word for word, without having been shown the file, worth treating as confirmation rather than
as a new ask: the replacement card names what it gives up (`replaces`, "instead of DRAGON
BREATH" on the card itself, not just a rail icon changing after the fact), and once every verb is
full the deal shifts to one active plus two passives instead of the usual alternation.

New tonight, to fold into the same system rather than build alongside it:

- **A card can be refused.** A fourth option under the three, RELEASE THE SOUL, or similar, that
  spends nothing and takes nothing. `openBoonChoice` has no such exit today; a soul taken is a
  card taken.
- *Built 23 Sep 2026 as ordinary cards (see `CHANGELOG.md`, "Three souls off the backlog"): the
  pounce is LEAPFROG, the throw's slow time is COLD EYE, the grass trade is FOUR STOMACHS. The
  invulnerability bubble was left out, ground rule 4 allows no i-frames beyond the roll's. The
  line-of-two headbutt stays an open question, for the reason given with it.*
- **Three candidate passives**, as concrete examples for the twelve-general-passives count: a
  three-second bubble of invulnerability after taking a hit (distinct from `goat.invuln`'s
  half-second flinch, above); holding an object or a man slows time for two seconds so a throw can
  actually be aimed (reads as the grab-and-throw verb's own passive, not a general one); grass
  heals two hearts instead of one but the run's own max is one heart lower (a trade, not a
  straight upgrade, the kind of passive that argues with itself, which the file's shop item
  section already flags as the interesting kind).
- **Two candidate actives:** the roll becomes a pounce, jump onto the man in front of you and
  land behind him, at double the cooldown; and a headbutt active that throws the struck man's
  own knock-on into whoever is standing behind him, so one blow can end two men in a line. That
  second one is offered with a flag on it, not a decision: the headbutt is pillar 3 in `CLAUDE.md`
  by itself, so what an "active" version of it should mean was asked as an open question rather
  than settled, a headbutt with more teeth risks arguing with "a headbutt only ever knocks a man
  down; walls kill."
- **A `synergy` / `addition` mark on a boon, visible in the dev tool wherever the list of them is
  read.** `addition`: this boon makes another one modestly better in passing. `synergy`: this boon
  is built to be read together with a named other one. Nothing today lists `BOONS` anywhere in the
  dev drawer for a mark like this to attach to, closest is the skill rail's own hover note, which
  is player-facing and per-card, not a design-time table. Wants a page or a tab before it wants
  the mark itself.

## 16 September 2026, evening, a design sitting, not a playtest

No screenshots this time: an hour of talking about why the game has no pressure in it, why a
run is over in an hour and a half, and what an act two and a secret ending would have to be.
Nothing below is built, and most of it is **parked on purpose** (marked *parked* in its title):
the same evening he decided the next stretch is level generation, enemy balance and getting
more people to play, and that lives, the hunt, hell, heaven and hearts-by-level are things to
think about, not to build, until the playtests say what is actually missing. What is live off
this batch is the two cheap and telling ones: the invulnerability number and the power column
in the balance tool. Also settles one of the open questions in `CLAUDE.md`: *one life* is
meant to mean one life per **run**, with hearts staying the budget of a level.

The diagnosis, so the items below make sense together: the game has three separate problems
that felt like one. **Pressure** lives only in the score, and the clock is hidden on purpose, so
nobody feels it. **Length** in the regeneration camp is run length times runs-to-win, and
runs-to-win is currently one because a level restarts for free. **Power** by level five feels
too high, but nothing measures it: `tools/balance.js` knows threat and ground and has no idea
what the goat is carrying by then.

### ~~number, a hit should buy more than half a second~~, done, found 22 Sep 2026

Already in the build: `TUNING.goat.invuln` is 0.9 s, inside the 0.8–1.0 range asked for below. The
burst-death counter was never added; it is only worth building if deaths still read as one bad moment.


`TUNING.goat.invuln` is 0.5 s. Three men take four hearts in two seconds, so a death reads as one
bad moment rather than four decisions. Spelunky and Isaac give about a second and knock the
player back. Try 0.8 to 1.0 before touching the heart count at all.

How to know which number is wrong: count in the dev drawer the deaths where the last two hearts
went inside 1.5 s ("burst deaths") against the ones that bled out a heart at a time across rooms.
Mostly bursts: the invulnerability is the lever. Mostly attrition: hearts are.

### ~~number, hearts that grow with the run, by level and not by card~~, *decided against, 26 Sep 2026*

Four hearts is the genre's number (Spelunky four, Isaac three, Ape Out two or three) and they are
already the budget of a **level**: `startLevel` fills them. Growing to six or seven by the end is
right, but THICK HIDE is one card in sixteen against thirteen souls, so today it is a lottery.
Put it where the threat curve is: a `hearts` field on each `LEVELS` entry (4 on levels one and
two, 5 on three and four, 6 from five), read by `applyBoons` under `mods.maxHp` the way `EASY`
is, with the new heart arriving full as THICK HIDE's does. THICK HIDE on top makes seven, EASY
MODE still adds two. `drawUI` has to fit nine hearts on the band without shrinking the rail.
Hell (below) takes them back to four, which is the "reset for your crimes" in numbers.

### ~~tool, a third column in the balance: what the goat is by then~~, shipped in 1.44

`BOON_POWER` in `tuning.js` and a `threat over power` table at the end of `node tools/balance.js`.
It reports rather than fails, because the weights are a guess. Its first reading: THE THRESHING
FLOOR, THE RAFTERS and THE OSSUARY each ask less of the goat than the level before them, which is
the "overpowered by level five" feeling in numbers. Not tuned yet: that is a design call. Not on the
BALANCE tab yet either.


The curve that has to hold is threat over power, and only the numerator is measured. Give every
boon in `BOONS` a rough `power` weight (and hearts a weight per heart), compute the expected
loadout at the head of each level from the souls dealt before it (the same sum `startAtLevel`
already uses), and print threat, power and the ratio per level in `tools/balance.js` and on the
BALANCE tab. Add a `GEN_RULES`-style averaged check that the ratio never falls from one level to
the next. Until this exists "overpowered by level five" is a feeling and cannot be tuned.

### system, one life per run, *parked, 16 Sep 2026*

Three lives on the run (`TUNING.run.lives`, and in `saveRun`). Losing one restarts the level
exactly as a death does now, boons kept. Losing the last one ends the run: back to the title,
board updated, save cleared. Hearts stay per-level and refill on the stairs, so "four hearts gone
in one room" still costs a level and not the run; what the run pays is that it can only happen
three times. Show the count on the level card and next to the hearts, not as a number in the
corner. LEVELS on the title (`startAtLevel`) starts with full lives. If hell ships, entering it
writes a save and refills lives: dying in hell restarts hell, never the compound.

Why this and not a run timer: a twenty-minute clock on the run argues with grazing (standing
still), the vault (a detour), the secret wall (two blows on a hunch) and the soul cards (a
pause); and a death late in a timed run is a certain loss, which sends the player to the menu
instead of the retry. Lives make death cost more without touching any of that.

### system, the hunt: pressure from behind, once a level runs past par, *parked, 16 Sep 2026*

The generalisation of the closing door. Par is `rooms * score.perRoom`; once the level has run
`TUNING.hunt.after` times par (try 1.5), the compound wakes: every `hunt.every` seconds a man
walks in from the level's own entry and comes down the flow field to the goat, the kind drawn
off the level's own curve, count uncapped. Not a death, a rising cost of standing still, and it
is read in the world rather than in the corner: the drums are already tied to the count of men
awake and near (`TUNING.audio.crowd`), so the music says it; one bark once a run says it in
words (`game.huntTold`, "HE IS IN THE EAST WING" or the like, in `BARKS`). Off on level one
like the clock doors; off during the cards and the climb. Fighting still pays kills and still
costs time, and time now costs men, who die on the same walls, so run-or-fight stays a choice
with a price on each side. A `GEN_RULES` line cannot check a timer, but `balance.js` can print
the par it will run against per level so a level whose par is wrong is caught there.

### system, act two, hell: a second run inside the run, *parked, 16 Sep 2026*

Longer levels, more souls, harder men, more hazards, and the boons taken back. This works only
as a **second curve with a second deck**, not as the compound's curve continued: a goat with no
souls put on the fifth level's threat is the "much worse game" `CLAUDE.md` already names.

- `act` on each `LEVELS` entry. `met` and `known` reset at the act boundary so hell's own new
  kinds get their intro rooms; the two teaching rooms of level one are **not** repeated (he
  knows men can be hit). Threat starts near level one's and rises again; the "harder than the
  last" rule and the power ratio are checked **within** an act, and `balance.js` prints two
  curves.
- The deck is different or the build is the same twice with a longer walk to it. Base goat in
  hell is not the pen goat either: the two half-shut buttons are tutorial, and re-teaching them
  is dead time. Open: what is withheld instead. One candidate: hell's deck bends the **world**
  rather than the goat (walls kill at a lower speed, fire passes further, bodies fly differently),
  so Power in act two reads as "the room is worse for them" and not "I am stronger". The other
  half of the answer is that hell should be built from the things the compound's boons do not
  answer, and the precedents exist: witchfire ignores `fireImmune`, mist cannot be grabbed, the
  arm goes over a shield. Wraiths, seers, drops, witchfire are the pool.
- Hearts back to four at the boundary (see the hearts item), lives refilled, a save written at
  the door: death in hell restarts hell.
- Cost, honestly: every level needs a canon and `CANON.minRooms` templates. Three levels with
  three ideas beat five with the same floor twice.
- How it is entered is open. Two candidates: in order, after the seventh stairs (his current
  read: you are sent down for what you did); or earned, Spelunky-style, by carrying something
  through the run, and the vault is the ready-made hook: a soul behind four blows off the way to
  the stairs on every level, currently worth nothing but the soul. Earned scales the length of
  the game with skill and makes the vault matter.

### system, heaven, the secret: a run that swallowed no soul, *parked, 16 Sep 2026*

Beat all seven levels without taking a single soul and go up instead of down. Nothing to teach,
readable from the world, and the one run where *run, don't fight* is literal. Pillar 6 is
safe: the condition is about what you did, not where anything stood.

It is **impossible today by construction**: the level-one soul gate (`levelDef.soulGate`) opens
only from the soul pickup, and the pickup is the swallow. The fix that stays inside the five
buttons: a soul on the floor is also `item`, so grab picks it up like a crate and either button
throws it, and the gate accepts one **thrown at it**. Given to the door, not eaten. It is also
the first place a player learns a soul can be refused, so the secret has a door into it that is
not a wiki. Check that no arena forces the pickup on contact (they lie on the floor, so it is
enough not to step on them) and that the vault is skippable, which it is. Keep the gate's
wording so the first player still eats the first soul: this is a hard mode and a trap for a
newcomer. What heaven is once reached is unwritten and is not this item.

---

### system, the deck at 36: a grid of four verbs by three archetypes, dealt in turns, *parked, 16 Sep 2026*

Thirteen souls against seventeen cards is three quarters of the deck every run, so two runs are
one build in a different order. The shape: every verb a **slot with three mutually exclusive
actives**, and the three are the three archetypes, so the twelve actives are a grid and not a
list. **Fire** kills (BOMB CHARGE, DRAGON BREATH exist). **Stun** stops (THE FULL THROAT, DEAD
WEIGHT exist). **Poison** makes a man err: it never kills, the wall still does; a poisoned man
is slowed and blind, his cone shut, and he swings at the nearest body (LIVING SHIELD already
has "at his own side"); it passes by touch the way `passFire` does. Poison is a **status on the
man**, a timer like `daze`, not a layer on the tiles like `world.fire`: a cloud is a second
world layer and is dear. A build is a row of the grid collected, which is what he felt "through
stun" on the tenth sitting.

The stun row's headbutt is **hold to lower the horns**: a hold on an existing button, so pillar
1 holds. It is **not** frontal invulnerability (pillar 4: no i-frames but the roll's; a free run
through the room is what *run, don't fight* costs). It is the carried shield's own rule turned
into a posture: `covers` in front, `parry` staggers the man who struck, every parry spends the
run-up, and a wall stops him the way it stops the Butcher (`chargeStopped`). No bullets: horns
are not iron.

**Crossings fall out of the world, never out of a table of pairs.** Fire ticks while you stand,
so a stunned man burns longer, and so does a cornered one and the Butcher already on `burnTick`;
it matters only for `hp > 1` (elites, bosses, the Seer), which is where it should. **Spit
burns:** a glob of poison on the floor is a pool and lights like a crate's `burst` at a brazier,
so poison spat into a doorway ahead of a crowd is a trap the first torch springs (whether a
blind burning man carrying fire to his own goes round KINDLING is open). Poison and stun need no
line at all. Three pairs, no triple. Each crossing has to be visible the moment it happens (a
stunned burning man needs his stars over the flame) or a player collects it and never knows.

Around the grid: three passives per verb that only mean something with that verb's active on,
and six to eight general passives (twelve was the ask; passives stack, and stacking is where a
late level gets overpowered). Dealing alternates, **active, passive, active, passive**, so a
triple is always one kind and the choice is inside it; the first soul of a run is an active and
opens one of the two half-shut buttons, which retires the 0.75 weight in `openBoonChoice`. An
active triple is one variant for each of three *empty* verbs while there are three; once all
four are filled every deal is **one active as a replacement plus two passives**, the
replacement card saying what it gives up (`replaces`) and not paying its `heal` again. Passives
deal only onto verbs whose active is on: one rule in place of the three `needs`. Parity is the
length of `game.boons`, so the save needs nothing new. Unbalanced is fine for a first pass;
unreadable is not: every cell changes its icon and the note under the chip, or the row a player
collected is invisible. Order: the generation batch first, this second, blind playtests after
both. `balance.js` measures none of the crossings; they are tested by hand, one at a time.

### system, the shop: a mouse, a rat ogre, souls of the killed, a talisman, *shipped in 1.40, 18 Sep 2026*

> 1.41 took the prices out ("No more prices in the dead"): she gives, one choice of three, and takes
> nothing. What follows is the 1.40 design as it was asked for, kept for the record.

Built as parked below, with these decisions made on the way: one mouse a level from THE YARD, in
the middle stretch; two wares, the second a tier cheaper; three strikes (two lines, then the ogre)
rather than a run; the ogre at six hearts, hurt only floored (a crate, a shield), by blades,
bullets, bodies at speed, the wheel and the bomb. The note's own "Q" is exactly what shipped: the
boomerang and STRANGE SYMBOLS both hang off a fifth key, made honest against ground rule 1 by not
existing at all until one of them is worn, an early pass had tried folding them into grab-on-
nothing and the roll instead, on the theory that a fifth key is a fifth key; overruled the same
day ("мои правила моя игра"), on the sounder theory that one active item earns its own button once
there is something to press it for. What is still open: the second slot for the later acts, and
the 18 Sep note's "talisman between the horns" is a collar at the neck for now.

Items, bought with **souls of the killed** (`game.kills`, the count already on the HUD; this is
the 14 Sep "souls resource" with an answer to what they buy). Two currencies, two counters, no
competition with the cards. What an item is: a **rule of the world** bent, not a number behind
a button. His examples: a fire amulet (a lit man lights the one he touches; note this is
KINDLING, already a card, so the split is: cards are about the goat, items about the compound,
and KINDLING and THE ORACLE move across). A clover (better odds of a secret, a rack or grass in
the next room; goes through `mods` into `generateLevel` like `taught`, and `balance.js` runs
the rules with and without it).

- **The mouse** lives in a two-tile hole in a room's wall (`carveSecret` already cuts these),
  one a level from some level on, never in a teaching room, a sealed arena or the wheel's room;
  a `GEN_RULES` line. Grab is buy; if the count is short she shows how short. Headbutt her once
  and she asks you not to (`say`, once); twice and she is a **rat ogre**: `hp` two or three,
  `elite`/`boss`, its own `kind`, killed by walls like anybody, first met alone through
  `taught`. He comes out into the room because the hole cannot hold him. Kill him and the
  stock is free (the Spelunky deal, honest only if the fight is dear). He drops no corrupted
  soul, or he is the best boss in the game. He is **not on the curve**: the mouse is optional,
  so `THREAT` and the report ignore her.
- **Slots by act:** one in the compound, two in hell. With one slot a late item costs the early
  one; buying onto a full slot puts the old item back on the mouse's shelf, and the ogre drops
  that too.
- **Tiers, three at most, and a tier is how far the rule bends, not a bigger number.** Which
  tier a mouse stocks is `minLevel` on the item, like a card. Price comes off the curve rather
  than a table: a fraction of the men in the mouse's own level (a third for tier one, a level
  and a half for tier three), one number a tier in `TUNING.shop`.
- **Death takes the level's kills back** or dying is a farm: the men stand up again on the
  regenerated level. `totalKills` is already written at the head of a level.
- **The item is drawn on the goat**, a talisman between the horns (act two: neck and head, two
  drawings), each tier its own drawing; the same law as `skillIcon`. A layer over every walk
  frame, so a line in `ART_HANDOFF.md` when it comes.
- Heaven stays about corrupted souls: killing is allowed, swallowing is not.

Why the shop and not items on the floor: the depth is in the decision in front of the item
(pay, or hit and fight), and in spend-early-or-save, not in the item itself.

---

## 16 September 2026, the tenth sitting

Twenty lines, sent one and two at a time rather than in a single note, with screenshots on most
of them. Nineteen shipped in 1.25 and one is open; the reasoning behind each shipped line is in
`CHANGELOG.md`.

- ~~**WASD, TO MOVE showed before the cage broke.**~~ **bug.** It now waits on `game.cageOpen`
  and takes over the exact spot the headbutt prompt was painting.
- ~~**An idle man wandered into the next room and picked a fight he wasn't placed for.**~~ **bug.**
  `Enemy.home` plus a leash on `idleWander`, see the new note in `CLAUDE.md`.
- ~~**Wall tiles: flip the brick to face into the room.**~~ **feel.** Left and right walls mirror
  the same stamp across their own centre now.
- ~~**The bottom of that same wall crop wasn't bricked.**~~ Turned out to be the secret wall's own
  mismatched art, not an ordinary wall, see the next line.
- ~~**The crack reads as being in the floor, not the wall.**~~ **bug.** Same cause: the secret
  prop drew a different, flatter stone-block texture tinted to the room's colour instead of the
  room's actual brick stamp. It draws the real one now.
- ~~**Patrolling guards should stay in their own room until they've noticed you.**~~ **system.**
  The same leash as the idle-wander bug above; one fix covers both complaints.
- ~~**Delete the BAAH line from the ambush room's floor text.**~~ Two lines now, not three.
- ~~**Weapons should only come into his mouth on a deliberate right-click, not by walking over
  them.**~~ **system.** The auto-sweep pickup is gone; a rack now takes the identical press-and-
  reach a crate already used.
- ~~**Hard rule: no em dashes anywhere a player (or the dev tool) can read text.**~~ Swept every
  string literal in the game, not the prose comments around them.
- ~~**A crate thrown into a brazier should catch fire too, not just break.**~~ **bug.** It bursts
  now, the same as one landing on ground already alight.
- **The room with the brazier should be shorter still.** Open. Nothing in the level's own rooms is
  named after a brazier specifically, and the screenshot's own room (the wheel, going by what was
  in it) didn't point at an obvious height to cut that the Mill's own lesson room doesn't already
  enforce (`MILL_LESSON_TEMPLATE` is already the narrow one-lane room the wheel's arm needs). Needs
  which room, by name or by what's standing in it, rather than a guess against one screenshot.
- ~~**In the ambush room, rack two swords together near the door and keep the far men from
  walking toward the player while on patrol.**~~ Both: `AMBUSH_TEMPLATE` racks two now, and the
  patrol leash keeps them at the far end until the goat is actually seen or heard.
- ~~**Same thing in the first trap room: let them wait at the far end.**~~ Same leash fix.
- ~~**The lesson room's far wall is a walk away rather than a step, a headbutt doesn't reliably
  kill the first man.**~~ **number.** Ten tiles of width cut to nine. **Watch on the next play:**
  a headbutt thrown dead straight down the room's own exit corridor still doesn't kill, nothing
  stands in that direction for a body to hit, since the corridor is the only way through and has
  to stay open. Approaching from anywhere off that exact line lands the kill; a player rarely
  walks it dead straight (the room's own entrance sits a tile off that line already), but a seed
  where it lines up more than that is worth a second look before calling this fully closed.
- ~~**A burning man lighting the next one should be a soul, not something every run already
  has.**~~ **system.** Shipped as KINDLING; `passFire` now returns at once without it.
- ~~**The painted figures float visibly clear of their own shadows.**~~ **bug.** Measured the
  actual foot position in each sprite sheet rather than guessing; two different anchors for the
  walk-cycle art and the newer static "Facing" art, and a leftover manual nudge removed.
- ~~**A touch less camera shake on an explosion.**~~ BOMB CHARGE's `explode()` 13 → 9.
- ~~**Remove the acquired-boons list under SACRIFICED.**~~ A chip's own hover note already says
  the same thing.
- ~~**Delete "THE SOUL OFFERS A BLESSING" / "Choose one. It dies with you." from the boon-choice
  screen.**~~ The cards say what they do without a caption over them.
- ~~**The boon cards should show something when the pointer is actually over one.**~~ A bright
  ring outside the card's own border, plus a slightly lighter fill, on whichever of the three the
  pointer is on.

---

## 15 September 2026, later, the ninth sitting

Twenty-seven lines in one long voice note. Most of it shipped; a handful were already true and are
noted rather than touched, and four are open.

- ~~**Shield down to two before it snaps, and it should ring off a wall or a man rather than just
  stopping.**~~ `uses.shield` 3→2, and a wall bounce keeps 60% of its speed instead of losing 70%.
- ~~**Melee reach on the cult, down a fifth.**~~ Bearer, hound, Butcher and wraith together, a club
  or a bite landing from most of a body-length off read as the wall behind him not mattering.
- ~~**A weapon on its stand should be the same size as one in his mouth.**~~ It drew bigger racked
  than anywhere else it is ever seen; one size now.
- ~~**Throw distance, down a fifth.**~~ `throwImpulse` 34 → 27.2 tiles' worth.
- **A rifle should be able to kill his own man.** Already true, `Bullet.update` hits whoever it
  reaches first, ally or not, and says FRIENDLY FIRE when it does. Nothing changed here.
- ~~**Coop in one blow, and the hen goes in the mouth like a crate too.**~~ Grab-then-throw now runs
  through the same kick-and-seek she already had off a headbutt, rather than a straight throw.
- **The Butcher should not be liftable.** Already true, `tryGrab` excludes him by kind, the same as
  the hound and the wraith. Nothing changed here.
- ~~**Delete the floor line on THE THRESHING FLOOR.**~~ `hint: null`.
- **THE THRESHING FLOOR reads too sparse at this density; make it smaller, or only for the
  run-through rooms.** Open. The level's own note already says the wide corridors are load-bearing
  (`corridorW: 5`, "reads as one yard"), so the fix is a number on `encounters.from`/`to` or the room
  count rather than a line of code, and it wants a second playtest before either is touched.
- ~~**A different cursor: headbutt by default, something else once he is carrying something.**~~
  `crosshair` / `grabbing`, the OS cursor rather than a drawn one. A custom goat-head cursor is an
  art asset, not code, and belongs with the next `ART_HANDOFF.md` pass.
- **"What is this, delete the bird."** Not reproduced. Nothing in the hen's own code path draws a
  `?` or any other stray mark over her; that belongs to `investigate` state on an `Enemy`, which she
  is not. Needs the screenshot again, or which build it was on.
- ~~**Build number under the seed.**~~ `BUILD` in `tuning.js`, bumped by hand alongside a CHANGELOG
  entry from here on.
- ~~**Scream stun radius, down a fifth.**~~ `goat.scream.radius` 8.5 → 6.8 tiles.
- ~~**Strange spikes near the Mill, remove them.**~~ The per-room grate scatter could land in the
  Mill's own room (and the arena, the Hall, the Gallery, the killbox), stacking one hazard system on
  top of another that was already built narrow on purpose. Excluded now.
- ~~**Idle men should shift around the room a little, if they are not scripted.**~~ `idleWander` only
  ever turned on the spot; about half of every wander beat is now a few slow steps.
- **A spinner drawn over the traps.** Not reproduced, the screenshot didn't say which overlay it
  was. Needs a name for the element (the trap-sense mark, a hazard's bark bubble, something else) or
  the screenshot again.
- ~~**Traps sometimes in front of the soul door.**~~ On a level that already has spikes, half the
  time the last stretch of floor before the vault's own door grows them too.
- ~~**A big room like THE THRESHING FLOOR's should get an iron door right on its own exit.**~~
  `BIG_ROOM`: 20-plus tiles of width forces the roll, so running a wide room the length of it is no
  longer free.
- **Enemies react to noise, especially a fight or an explosion, and walking should be quieter than
  fighting.** Already true, `TUNING.noise` gives every event its own radius (`footstep` 2, `headbutt`
  5, `boom` 16, and so on) and every man checks `world.noises` for one in range. Nothing changed here;
  see the new HEARING toggle below if it needs to be seen rather than taken on faith.
- ~~**A dev-tool toggle for a man's sight cone, and one for what the goat's own noise reaches.**~~
  VISION and HEARING, next to GOD in the drawer, a cone per man, two rings on the goat for a
  footstep and a fight.
- ~~**"Too quick" for a hound shouldn't repeat a thousand times.**~~ It fired every single frame the
  button was held down; gated to once every 0.8s.
- **Enemies should go round pits even while retreating, a mage blinking included.** Already true for
  ordinary movement and for a blink's own landing spot (`hazardAt`/`isPitPx` both refuse one). Nothing
  changed here.
- **A level's hint should say what new hazard is on this floor.** Partly open. THE RAFTERS already
  does this for the drop (*"THE FLOOR ENDS. THEY FALL FURTHER THAN YOU."*); THE ROAD, where the grate
  first appears, did not, it does now: *"...WATCH YOUR STEP."* Level one's Mill and pen are taught
  in-room rather than on the floor and were left alone.
- ~~**Minimal camera shake and slowdown on a multi-kill, it breaks the pace right now.**~~
  `comboSlow` 0.26 → 0.12s, and the extra hitstop a streak buys came down by more than half.
- ~~**A mage should never blink into a room you have already cleared, if the fight is in the next
  one.**~~ `blink` used to only mind a sealed room's own walls; it now keeps every blink inside
  whichever room the goat is currently standing in.
- **I'm in the first room and something says a kill has already happened.** Not reproduced.
  `game.kills` resets to 0 at the top of every `startLevel`, and the intro's scripted men are removed
  rather than killed, so nothing touches it before the first real blow. Needs the number that was
  actually on screen, or whether LEVELS (which deals a run's boons up front) was how the level was
  reached.
- ~~**Wraiths close a third faster, and drift toward you during the windup rather than standing
  still.**~~ `wraith.speed` ×1.3; the windup now pulls a little toward wherever the goat actually is.

---

## 15 September 2026, the eighth sitting

Twenty lines against 1.20, sent in five bursts with screenshots. Everything here shipped in 1.21
except the two notes at the end; the reasoning is in `CHANGELOG.md`.

- ~~**Softlocked on level two behind shut doors.**~~ **bug.** The sealed Seer arena: he blinks, and
  a blink asked the tiles and the flow field about its landing spot and nothing about a door, so the
  mage could leave a room whose doors only open when it is empty.
- ~~**Put a tuft of hay in the starting pen.**~~ Two tiles of it, inside the bars.
- ~~**`WASD, TO MOVE` on the first screen, where you break the cage, with the headbutt line under
  it, and then the second room can go, it has no controls left.**~~ Both empty rooms went; level one
  is ten rooms.
- ~~**On the screen with the man, keep only the top of the text.**~~ One line: `LEFT CLICK,
  HEADBUTT`. **The wall line and `BUTT HIM` are gone with it**: see the note below.
- ~~**And for the look of that room: barrels down the sides or a small crate in the corner. Hay
  makes it hard to read.**~~ Two crates on the near half.
- ~~**In that corridor, less distance to the wall, so the man definitely hits it.**~~ Four tiles of
  floor rather than six.
- ~~**The teaching elements should be clear and well scripted, without too many options, so the
  player definitely learns, and random generation should not break it.**~~ `GEN_RULES.lessons`,
  checked over every seed by `tools/balance.js` and live on the RULES page.
- ~~**The wheel in a narrower room with one way through, and two men: one runs at you and is thrown
  by it, the other walks round it safely and comes on.**~~ `millLesson`, and the two men's
  `trapSense` pinned to the two ends of the roll.
- ~~**The throwing room: add the grab instruction, a sword rather than a shield, narrower and lower
  - a three-tile corridor, crates not in the way, and the grass only in the far corner.**~~
- ~~**And the men always on the far side of that room, not like this.**~~ `noFlipX`.
- ~~**The crack in the wall should be a crack, not who-knows-what.**~~ One shared `wallCrack`.
- ~~**In the walls that tile should face outward, except the bottom wall, where it should not be
  visible at all.**~~ `wallTop` is skipped where the room is above.
- ~~**What is going on with the lamp and its shadow? They should be next to each other.**~~
- ~~**In the first boss's room: one mini-boss and one helper.**~~ `escorts: 1`.
- ~~**If that is hay on level two, make it look like hay.**~~ The painted bale draws on every level
  now; only levels 2–7's floors and walls are still the procedural fallback (see `ART_HANDOFF.md`).
- ~~**The men should talk a little less often.**~~
- ~~**At the start of level three, this can go.**~~ The `HOLD RIGHT CLICK, CARRY` line under the
  hint.
- ~~**If you are holding a crate and it is between you and an enemy's blow, the crate breaks like a
  shield and the damage does not reach you.**~~
- ~~**Objects should stand closer to their shadows, the distance is large right now.**~~ The
  lantern and the brazier; every other prop was already within a pixel or two of its own feet.
- ~~**Enemies trigger the spike traps when they cross them (except the ghosts).**~~
- ~~**When you are holding an object, both mouse buttons let go of it.**~~

**Two lines from this batch are still open.**

- **Which single line belongs on the floor at the first man.** It is `LEFT CLICK, HEADBUTT` now,
  which is what the screenshot boxed, but the pen says exactly that two rooms earlier, so the line
  at the man repeats rather than adds. The alternative is `INTO A WALL KILLS`, which is the whole of
  level one's canon and the thing players did not work out on their own. One word settles it.
- ~~**Barrels.**~~ Built after 1.60: a real `barrel` that rolls, bowls a row of men and burns (see
  `CHANGELOG.md`, "Barrels"). A second, wall-standing barrel built in parallel in the cloud 1.56
  (stave it in, fire opens it into oil) was folded into this one when the two met in 1.61. The ask was "barrels down the sides or a small crate in the corner" and it shipped as
  crates, because there is no barrel `Prop`, only a painted barrel in the ritual room's decal
  layer. A real barrel kind (blocks, burns, is not liftable) is a small piece of work and would give
  the storage rooms something to read that is not a crate.

---

## 14 September 2026, late, the seventh sitting

Twelve lines off an annotated screenshot, plus four sent after it, plus the rule under all of them:
*"and take into account in the new balance, the new division of powers, that you start underpowered."*
All of it shipped in 1.12; the reasoning is in `CHANGELOG.md`.

- ~~**Fog behind a partition, from the place it is seen from.**~~ A shadowcast from the goat's own tile
  every step, painted over the world last. Asked as *"да, можно чтобы было скрыто за перегородкой"*,
  which settled it: hidden, not dimmed.
- ~~**Delete everything struck through in red.**~~ The level's name over the hearts, and the strip of
  controls along the bottom of the page.
- ~~**The caption under each button becomes the control; the long caption is a hover.**~~ LMB / RMB /
  E / SPC under the chips, and `drawSkillNote` while the pointer is on one.
- ~~**Less intense music in a fight with a lot of men.**~~ The steps are at three and seven now, and
  the top of the kit is thinner.
- ~~**Smaller SACRIFICED.**~~ 15px → 11px, and dimmer.
- ~~**DEV as a short phrase rather than a button, slightly smaller.**~~ A word in the corner.
- ~~**Level select in the menu.**~~ LEVELS, with the souls a run would have banked getting there.
- ~~**The roll available by default; its soul gives a stun instead.**~~ DEAD WEIGHT is the roll's soul
  and it is an active now.
- ~~**Restarting level one after you have played: the pen gives on the second blow.**~~ `PEN_KEY`.
- ~~**A crate thrown into a fire goes up bigger than the fire that lit it.**~~ `Prop.burst`.
- ~~**Give the headbutt a bit of its strength back (not all of it), and men thrown into men die.**~~
  A third of the 1.11 cut back, and `flungHits` kills at speed.

**Watch on the next play.** Two of these are worth a second opinion rather than a number:
- The shadow is at `TUNING.fog.shade` (0.8) with `fog.res` (2) deciding how hard its edge is. A man
  standing behind a partition is now very nearly invisible while he can still hear you perfectly, if
  that reads as unfair rather than as tense, the alpha is the dial, not the shadowcast.
- Two men who stand together now die together to one headbutt, which is a real jump in what the bare
  head is worth. `physics.bodyKillSpeed` is the bar for the man who is struck and `physics.splatSpeed`
  the bar for the man who was thrown; raising the second one makes it one death instead of two.

---

## 14 September 2026, night, the sixth sitting

Nine lines in one message, plus the rule under them: *"I want to build a power fantasy where you start
weak."* All of it shipped in 1.11; the reasoning is in `CHANGELOG.md`.

- ~~**Less text in the dev tool where possible.**~~ Every rule is one line and the facts read as
  `name value`.
- ~~**Where the tool generates a random seed, show the enemy count and the room design.**~~ The room
  list is a strip of floor plans now, drawn off the generated level, with `×N` over each.
- ~~**Level one: a door at the first mini-boss that only opens once he is beaten and his soul taken.**~~
  Shipped as `levelDef.soulGate`.
- ~~**A boss carrying a soul has red eyes and a light yellow glow, so he reads.**~~ Shipped.
- ~~**An iron door in front of the stairs on every level.**~~ Shipped as `stair: true`.
- ~~**Tome → corrupted soul, with a picture. A goat cannot read.**~~ Shipped, code and art.
- ~~**Hide the timer unless it is switched on in settings; show it at the end.**~~ Shipped with a
  SETTINGS page on the title screen.
- ~~**Nerf the base headbutt a little more.**~~ Recovery 0.35 → 0.44, impulse 30 → 25, reach 1.7 → 1.55.
- ~~**Base grab takes objects only; carrying a man is a skill.**~~ Shipped as BY THE COLLAR.
- ~~**Base BAAH is only a noise that lures; upgrades make it a stun or fire.**~~ Shipped as
  THE FULL THROAT and DRAGON BREATH.
- ~~**You only see a room when you open its door.**~~ Shipped as `room.seen`.
- ~~**Put the rules tool and the balance tool together, with tabs to switch between them.**~~
  Shipped: one page, and `#rules` / `#balance` as addresses for it.
- ~~**See the actual rooms and the men in them on both tabs. Understand size on the balance tab, and
  go deeper by zooming in. Put the general rules on a tab of their own and the particular ones
  inside each level, so a level has more room to show its space.**~~ Shipped as three tabs, RULES
  as a rule-by-level matrix, LEVEL as one level on the whole screen, BALANCE with a bar per room at
  its real width and place in the world, and a room sheet both of the last two open.

---

## 14 September 2026, evening, the fifth sitting

Asked for in one message and built in the same sitting; kept here so the file stays a record of what
was asked. The reasoning is in `CHANGELOG.md` under 1.10.

- ~~**A tab in the dev tool, the level generation rules, with the rules per room and the enemies
  per level lit up; the general rules apart from each level's own.**~~ Shipped as RULES in the dev
  drawer, with `js/rules.js` as the one list the drawer and `tools/balance.js` both read.
- ~~**Every level gets a sub-idea of its own, a canon, with many rooms written for it: at least half
  of the fighting rooms on the canon, the rest a mix of what you already know.**~~ Shipped as
  `levelDef.canon`, five rooms per canon, and the canon/mix split in `gen.js`.

---

## 14 September 2026, the fourth sitting, with 1.8

**Where this batch went: everything but the last line shipped in 1.9.** The rule under this batch is
*let the run get stronger*: he was dying, losing what he had just earned, and meeting a wall at level
three, so nothing about the game read as progress.

- ~~**Nothing is taken away on a restart.**~~ Shipped. A death used to take the newest tome.
- ~~**A ticket of tomes per level: one, one, then two.**~~ Shipped as `levelDef.tomes`, one on level
  one, two after, thirteen across a run, the vault holding one of each level's two and the level's last
  boss the other. Every other boss drops milk. Asked for as "меж левелами зберігаються".
- ~~**Difficulty should rise evenly.**~~ Shipped. It went 27 → 50 → **115** → 123 → 167 → 181 → 199 and
  now goes 27 → 53 → 97 → 118 → 157 → 179 → 199.
- ~~**The roll behind a skill.**~~ Shipped as TUCK AND ROLL. The chip on the rail reads LOCKED until it
  is picked up, and the run's first tome always offers it.
- ~~**No more plates. Boxes instead, smaller and simpler.**~~ Shipped: the pot kind is gone, every one
  of them is a crate, and the crate is four shapes at `r` 10 instead of nine at 14.
- ~~**Iron doors between rooms sometimes, three hits, so it is harder to just run through.**~~ Shipped
  as `levelDef.ironDoors`, about two a level from level two.
- ~~**The soul door should be clearer.**~~ Shipped: the tome's halo, the book painted on the face, and
  the word TOME over it.

- ~~**Pits and windows should read as holes, not as pillars. Put a distant landscape under them.**~~
  Shipped, and it turned up a real bug on the way: windows had never generated once. The renderer had
  drawn them since the drop landed and the test for one could not be satisfied by anything the
  generator made.
- ~~**A different fall animation for a man who goes over.**~~ Shipped as `game.fallers`.
- ~~**Running without stopping builds up to +50% speed.**~~ Shipped as `goat.momentum`: four seconds
  to the whole of it, three times as fast to lose it, and all of it gone on a hit.

### ~~system, a souls resource, one soul per man~~, decided against for now, 23 Sep 2026 (see the top of this file)

**Asked as a question, not built.** "А что если мы добавим ресурс душ? Но тут 1 душа = 1 человек. И его
потом можно будет тратить." The counting half is free - `game.kills` is already exactly this number and
`levelCleared` already carries it across levels as `totalKills`. The whole question is what a soul
*buys*, and there is one rule it must not break: `scoreFor` deliberately makes pace the axis and kills
only a multiplier, so *run, don't fight* survives. A soul price that rewards clearing a room turns the
game into a brawler, which is the one thing pillar 3 in `CLAUDE.md` exists to prevent.

Three shapes that do not break it, cheapest first:

1. **The soul door opens for souls.** The vault's door already reads as a soul door and already costs
   four blows. Give it a price in souls as well, say eight, shown on the face the way the blows are.
   You pay it with men you were going to have to kill anyway on the way there, and skipping every fight
   in the level means the tome behind it stays shut. Nothing else in the game changes, and the resource
   has exactly one sink, which is the version worth trying first.
2. **A soul price on the tome cards.** A third card that costs souls and offers a boon out of the pool
   the other two did not. Same sink shape, but it touches `openBoonChoice`, which is the part of the
   game with the fewest moving parts and the most weight.
3. **Souls bank across a run and buy a head start.** The version he may actually mean by "потом" - a
   meta-currency spent on the title screen, which is a new screen, a new save key and a decision about
   whether a run is still one life. Biggest of the three by a distance, and it should not be first.

Ask him which sink before building any of it. The counter is an afternoon; the sink is the design.

---

## 14 September 2026, the third sitting, with 1.7

**Where this batch went: all of it shipped in 1.8.** Seven notes again, and the rule under this batch
is different from the last one's: it is not *say what a thing is*, it is **make me use it**.

- **A teaching room has to have no way round the lesson.** The first man was already standing still
  with the word for the button painted under him, and he was still being walked past. He is in the only
  doorway now. The general form: if the room is there to teach a verb, the room does not open until the
  verb has been used.
- **A thing that lives in the floor has to cover ground.** Two or three of anything underfoot is
  scenery. What made the grating read was laying nine to fifteen of it in a band.
- **Not every door is the same door.** One number for every door in the game meant every door was
  either a nuisance or nothing. Wood one blow, iron four, and iron only ever in front of something
  worth four blows.

---

## 14 September 2026, the second sitting, with 1.6

**Where this batch went: all of it shipped in 1.7.** Seven notes, and every one of them the same
complaint underneath: *the game is not telling me what this is*. `CHANGELOG.md` carries what each one
turned into. Two of them are worth keeping as rules rather than as fixes:

- **A trap has to look like an object.** The spike plate was drawn flush with the boards and read as
  floor decoration, so nobody could tell what it was, not what it did, *what it was*. It is a crate
  now. Anything else that lies flat in the floor will land the same way.
- **A line that names a verb has to name the button.** The floor hints were written as instructions and
  read as atmosphere. They carry the key now. The general form: **anywhere the game tells you to do
  something, the thing to press goes with it.**

---

## 14 September 2026, Max's first sitting, with 1.5

**Where this batch went: all of it shipped in 1.6 except the scream, which was already done.**
Somebody playing it for the first time, watched. `CHANGELOG.md` carries what each one turned into; the
entries stay here because what a first-time player did not work out is worth keeping.

### feel, he did not work out that the men could be hit

Read both rooms of writing on the floor, walked past the first clubman without trying anything, and got
a long way in still treating the men as terrain. Shipped as two changes at once: the first man of the run
is a sentry who holds his post so there is something safe to try it on, and the word for the button is
painted on the floor of that same room. **The general lesson: a control room with nothing in it teaches
the button and not the verb.** Anything else the game wants to teach wants a thing in the room to use it
on, in the same room as the words.

### number, the brute arrived second

Met the man with three hearts as the second enemy of the run. Level one is twelve rooms now and he comes
four ordinary rooms after the first clubman, which is the rule the introduction order was supposed to
have all along: `planEncounters` will honour any `introduce` fraction, so this is a `tuning.js` number
and not a mechanism.

### bug, seen through a wall

A shut door was see-through to a man and a wall to the goat. Fixed in 1.6. **Not fixed, and deliberately
so: a man still hears you through stone.** If that comes back as a complaint the answer is probably to
attenuate `emitNoise` by path rather than by line, but the noise system is the entire counterplay to the
sight cone, and taking it out would make walking up behind a man free.

### number, the Butcher's damage radius

Halved, to the square foot. Left alone: the charge, which is the thing that is supposed to cover ground.

### number, the scream's stun radius, already done, not cut again

Asked for with "if it was cut before, no need to cut it twice". It was: twelve tiles to eight and a half
in 1.2. Left at 8.5. If it comes back a third time the number to look at is probably the stun *duration*
(`goat.scream.stun`, 0.9s) rather than the radius, because what reads as "too big" in a room of four men
is usually how long they all stand there.

### system, rooms built round their traps

**The rest shipped in 1.44:** `ring` for THE THRESHING FLOOR (`needs: 'corridorW'`) and `chasm` for THE
RAFTERS (`needs: 'windows'`), the first trap room built round a drop. Both levels now carry `traps: 1`.
The note below is kept for the reasoning.

Shipped in 1.6 as four templates and a `traps` count per level. **What is still not there:** a trap room
on THE THRESHING FLOOR or THE RAFTERS, both of which draw from their own pool and would need trap
templates written to their shapes (wide and open; narrow and full of holes). And no trap room uses a
drop, because drops only exist in the `high` pool.

---

## 14 September 2026, a long sitting with 1.3

**Where this batch went: all of it shipped in 1.4 except two.** The soul barrier was asked for and
parked the same day (below, with the reason), and the endless roll against a wall did not reproduce,
pressed against a wall with the key mashed the cooldown holds, three rolls in three seconds, exactly as
on open floor. Everything else is in the build; `CHANGELOG.md` carries what each one turned into. The
entries stay here because the reasoning behind them is worth keeping.

### Kept, and worth protecting

**The wraith goes through the walls.** Called out unprompted as the best thing in the build. It is the
one enemy whose rule the ground does not cover, and the cost of that rule, that it can only become a
body behind you, and cannot form inside stone, is what makes it readable. Anything that later wants to
give mist a wall to respect is arguing with this line.

### bug, a thrown man ends up inside the wall

Hold a man, walk up to a wall, throw: he finishes in the stone instead of dying against it. The cause is
the hold and not the throw. `Goat.update` puts the held man at `goat + aim * (holdDist + r * 0.4)` every
frame and never asks the world whether that point is floor (`js/entities.js`, the grab/hold/throw block).
Face a wall from close and he is already standing inside it before you let go, so the throw starts inside
it. Fix at the hold: sweep the hold point back toward the goat until it is on floor, and let the throw
keep starting from wherever the man actually is. A throw that has a wall in it is supposed to be the best
throw in the game, this is the one place it silently is not.

### bug, an endless roll against a wall, not reproduced, 14 Sep 2026

Pressed up against a wall, the roll is said to come back with no cooldown. **Measured and it does not.**
Driven from the harness with `rollPressed` set every frame for three seconds, hard against a wall and
then on open floor: three rolls both times, `rollCd` 1.05 s at the end of each, against a 1.35 s
cooldown. `rollCd` is written in exactly one place and nothing clears it.

So it is something the measurement did not have: a tome (LOOSE JOINTS takes the cooldown to 0.61 s), the
gong on top of it (another ×1.5 off every cooldown as it ticks, so 0.4 s, which is fast enough to read
as endless), or a different meaning of *pressed against a wall*. Worth asking him which, before
changing a number that is behaving.

### number, the door between rooms should take three blows, not one

He called it the wooden section between levels: the door in a corridor. `Prop.smash` breaks it on the
first hit and floors whoever waited behind it. Three blows instead. The door is the one thing in a
corridor that can hold you still, and holding you still in a corridor for two more beats is worth more
than the shortcut is. The men who shoulder doors open from their side are unaffected, that is
`openPressure` and a different clock.

### number, the second cage should break too, and faster

The small shut cage across the first room is scenery: `deco` bars that wobble when hit and never open.
Make them break, fewer blows than the pen's seven, and no stun on the way. The pen teaches the verb the
hard way; a second cage that gives in quickly is the reward for having learned it, and it is the only
thing in that room the goat can do for the sheep in it. It needs its own `hits` under
`TUNING.prop.deadCage` and its own break path: `deco` also keeps those bars out of the gate and out of
the in-front-of-the-goat draw pass, so the flag stays and `breakCage` learns about a second cage rather
than losing its exclusion.

### feel, the speed tome has to look fast

SURE HOOVES multiplies top speed by 1.18 and nothing on the screen changes, so the best passive in the
game reads as nothing at all. The smear is already there and already spent: `Goat.trail` keeps seven
ghosts at one every 0.028 s while he is over 55% of top speed, and `drawGoat` draws them. Hang its count,
its rate and its opacity off `game.mods.speed`, so the tome lengthens the smear rather than only the
number. It is body work with no button, which means the trail is the whole of its feedback.

### feel, the hound's bite is too quick to read

`TUNING.dog.windup` is 0.3 s and the bite lands before the eye has the tell. Slow the windup and leave
everything else alone: the dart is what you are supposed to read, and the bite should be the beat after
it rather than part of it. Watch what it does to the pack, `packBusy` already lets one hound commit at
a time, so a longer windup makes a ring of three noticeably kinder. `tools/balance.js` will not catch
that, because it counts threat and not timing, so `THREAT.dog` may want to come down with it.

### feel, the camera swings too hard when the run changes direction

Enough of a swing to make him queasy. `updateCamera` leads the camera `camera.lead` (2.4 tiles) toward
the aim at `camera.lerp` 7. On a mouse the aim flips the instant the pointer crosses the goat, so the
lead point teleports across him and the whole picture follows it. Damp the lead itself, carry a second,
slower-lerped lead vector rather than reading `input.aim` raw, or scale the lead by run speed so a turn
on the spot moves the camera nothing. The pull-back at speed is not the problem and should survive.

### system, spike floors, from level 3

Prince of Persia: spikes that come up out of the floor, in ordinary parts of the map and in rooms that
have men in them, and specifically **where you have already walked**: the trap is behind you rather
than in front of you. Men read them and walk round them while they are up, and a man can sometimes still
be baited onto them. That last clause is the feature: it is another way for the room to do the killing.
The AI half is mostly built, `hazardAt` already answers what will kill whoever stands at a point,
`avoidHazard` already handles both walking into it and standing in it, and the once-per-encounter
`trapSense` roll already produces the one man in a crowd who blunders in anyway. A spike tile joins that
list. Open: whether they are on a cycle like the Mill, or armed by the goat's own path.

### system, a new sixth level, and the floor opens

**A new level, and it goes in at six.** It reads as being up high: windows in the walls and holes in the
floor, men thrown out through both, and the goat able to go through them too. Falling is not death, you
come back at the point you went in and it costs a heart, the same price the Mill charges. That price is
what makes a hole something you can use rather than something you edge around, and it is the first thing
in the building that kills men without touching the ground.

**THE OSSUARY moves to seven and stays the finale.** Settled 14 Sep 2026: the drop goes in ahead of it
rather than behind it, so the last ground is still the one enemy the rest of the game does not prepare
you for. The run becomes seven levels long.

What it costs to build: a `LEVELS` entry between THE BRIDGE and THE OSSUARY, its own room pool (holes
want hand-authored rooms), a tile kind the flow field and `collideCircle` treat as a wall for men and as
a fall for the goat, a throw that carries a man over the edge, and `tools/balance.js` agreeing it is
harder than THE BRIDGE and easier than what now follows it, inserting a level in the middle of the
curve is the part most likely to fail, and it fails loudly, which is the point of that script. `met` is
computed in `LEVELS` order, so the new level inherits everything the first five introduced and must
introduce nothing the Ossuary was relying on being new. `CONCEPT.md` then says seven levels, and its
table gains a row.

The level has to say plainly that the floor can open before it asks you to use that, which is a
rendering problem as much as a design one.

### system, fire jumps once between men

A man who is alight sets fire to the first man he touches, and that man sets fire to nobody. One hop,
never a chain. Burning men already blunder, fire takes the wheel and they walk through whatever is in
front of them, so the contact happens on its own; what is missing is the pass and the stop. A man lit by
a man carries a flag that `ignite` refuses to pass on again. A whole room going up in one brazier is the
thing this is deliberately not.

### ~~system, the soul barrier, from level 3~~, parked, 14 Sep 2026

Asked for: a barrier that only opens if you took 80% of the souls in the rooms behind it. **Decided
against the same day.** Gating the way out makes some levels no fun to run through, which is the same
objection pillar 1 makes, *skipping a room is valid and sometimes correct*. A gate that counts bodies
turns every run into a clearing job.

Kept here so it is not re-proposed. If something like it ever comes back, it comes back on a door that
guards something optional, a tome, a bowl, a shortcut, and never on the exit.

### system, a score at the end of every level, and a total at the end of the run

Settled: **both.** Each level ends on its own score, and the run ends on the sum of them. The level-clear
card already carries the raw material, `N sacrificed in X s`, and becomes a score card; the win card
stops being `totalKills` and deaths and becomes the run's total.

What a score is made of is time and kills, and **the weighting is the whole design of it**: a score that
pays for bodies argues with *run, don't fight*, because the best run becomes the one that clears every
room. Time has to be the axis and kills the multiplier, so that going faster is never the wrong thing and
killing on the way is what makes a fast run a good one. A proposal to argue with: time scores against a
par for the level, kills raise the multiplier, and a clean fast run beats a slow massacre.

### system, BEST, on the title screen

A third thing on the menu next to NEW GAME and CONTINUE, holding the best score and the best time for
each level. `drawTitle` refills `menu.rects` every frame and `menuAt` / `menuPick` are the only ways in,
so a third entry is cheap; the page behind it is a table of levels against two numbers, drawn by the same
hand as the title and leaving the same way.

It needs a record of its own in `localStorage` beside `SAVE_KEY`, per level, the best score and the best
time, written at `levelCleared` and wrapped like every other storage call, so a browser that refuses
storage shows a BEST with nothing in it rather than breaking the menu. A level never played shows a dash.
Deciding needed: whether NEW GAME wipes it along with the run (it should not, a record survives the
runs that set it).

---

## 14 September 2026, later, while 1.4 was being built

Sent one at a time while the work was going on. All of it shipped in 1.4.

### bug, a man in your mouth was safe from everything

Two of them, and they were the same hole: the branch that runs a held man sits above every other state
in `Enemy.update` and returned before anything else could touch him. So **a mage standing in his own
witchfire did not burn**, and neither did anyone else you carried through a fire. The branch ends with
the fire check now, and whatever catches comes straight out of the mouth, which is the counter to
carrying a mage at all.

### bug, the held mage's fire followed the goat

The rune was dragged along under him every frame, so it went off under the goat wherever the goat had
run to. It is planted where he started painting it now. Keep moving and you leave a trail of it behind
you; stand still and you are standing in it. That is the difference between a mage being a death
sentence and a mage being a thing to be handled.

### feel, enemies had no back

Inside two and a half tiles a man saw you wherever you stood, which took away the one thing his cone was
for. The cone holds at every range now, and what gives you away behind a man is noise, which the noise
system already turns him toward. Stealth is never the plan and is always available.

### bug, clubs came through walls

`meleeHit` asked only for reach and an arc. It asks `game.reaches` now: line of sight plus every
blocking prop against the segment. The goat's horns are held to it too, a man behind a table is behind
it, both ways round.

### bug, a carried shield did not stop anything (with a screenshot of it not stopping anything)

It was a disc the size of the shield, hung 26 px in front of the goat, so almost everything aimed at him
went past its edge. It is an arc across his front now, `weapon.coverR` / `coverArc`, every turn spends
a charge, and a club that lands on it staggers the man who swung. His back is still his back.

### system, a death costs one tome, not the run

Asked for as "минус один том, как было в начале уровня". `startLevel` snapshots what he walked in with
and `restartLevel` returns that list minus its newest entry, so a tome picked up in the level that
killed you goes with it. The death card names what went.

## 6 Oct 2026, playtest batch (animals in heaven, bells, feel)

| Tag | Note | Done |
|---|---|---|
| system | An animal met down there shows in heaven pale and silent (`meta.met`, `Heaven.noteMet`); brought out once it talks and gives its dare | yes |
| system | God's next ask once the mirror is whole and no animal was ever brought out (`HEAVEN_TALK.animal`, `Heaven.animalAsk`) | yes |
| bug | "IT FALLS TO THE FLOOR BELOW" float removed | yes |
| dev | ALL BELLS button in the HEAVEN tab | yes |
| bug | Horns flipped on some steps of the up-right run: stray 15 px blobs broke `hornFix` (`hornsOf` keeps real horns only) | yes |
| feel | A butt along a wall slid on; recovery drift 0.35 to 0.12 | yes |
| number | Base headbutt half a tile shorter (`headbutt.lunge` 13.3 to 10 tiles/s, 2.0 to 1.5 tiles) | yes |
| system | Grabbing an open scrap of paper opens it full screen (`Codex.openPoster`) | yes |
| bug | Two grasses in one room: the first grass skips a room that has its rhythm bowl | yes |
| feel | Clear card shows the kills and the bell that woke; SAVE THE PICTURE off (`painting.saveButton`) | yes |
| note | Rabbit "lost the option to talk": it was the rabbit's dare (stealth on), as designed; to be framed as a run modifier chosen in heaven | open |
