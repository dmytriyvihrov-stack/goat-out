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

### 9 Oct 2026, sixth batch (his 18 notes and screenshots)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | feel | the cult says one line at a time, two only for a boss | `Game.bark`: no man starts a line while another's is up (`bark.cap` 1); a boss may talk over one (`bossCap` 2). |
| 2 | tool | the dev drawer runs off the screen | Long rows shortened (OGRE · SOUL 1 / 2 RINGS / 3 BAND); wider than the screen, the whole drawer is drawn smaller, its buttons mapped with it. |
| 3 | tool | the TALK page did not load | It had a syntax error (a quote inside a quote, from the companions' talk work): fixed. Opened as a file it now reads the game's scripts as scripts, so every line is there to read, edit and COPY; SAVE still needs `node tools/serve.js`. |
| 4 | ? | "from the skills:" with nothing after it | Ask him what he meant to write. |
| 5 | feel | LONG's tip zone small, red, and it damages | The tips are the last 20% of the reach (was 38%), drawn red as before, and a man met there loses a heart (`horns.long.tipHurt`): a clubman dies on the tips. Pillar 3's exception, his. |
| 6 | art | the horn pictures change while he moves | BIG and LONG are grown once a facing off the standing frame and carried on each step's roots; the packed horns are taken off the frame under them (`PIXEL_ART.bare`). |
| 7 | system | ABANDON RUN in the menu, back to heaven | PAUSE → ABANDON RUN (press twice): a death where he stands, killer GIVING UP, straight up to heaven (`Game.abandonRun`). |
| 8 | feel | the chandelier's switch by the way in | Every cleat now by the way in (`chandelier.cleatIn` 1): 206 of 213 over 280 floors, the rest a fallback when nothing by the door fits. |
| 9 | tool | the drawer still does not fit | Same as 2. |
| 10 | bug | "it glitched here" (the hook) | Read as the rope's end left hanging tiles behind him while he was dragged: the end now rides on him every step. Ask him if it was something else (a freeze?). |
| 11 | feel | a small icon instead of HOOKED | A hook in cells hangs over his head while the rope has him (`Renderer.drawHookMark`); no word. |
| 12 | feel | the iron cages' words overlap, and RIGHT M. CLICK is the action | Each cage's name and gift stand over it, lifted clear of the other; RIGHT M. CLICK: OPEN WITH 1 KEY said once over both; the horns on iron say NOT THE HORNS: RIGHT M. CLICK. |
| 13 | feel | a thrown thing passes a man without touching | Every thing he throws meets a man `prop.throwHit` (9) px further out: crate, bomb, blade, shield, the hen. |
| 14 | feel | no HALBERD word when taken | Gone, and SWORD / SHIELD off a stand with it. |
| 15 | bug | BIG horns broke the secret wall, not the sword behind it | With BIG or LONG the blow that opens a niche goes on into it (`headbuttHits`). |
| 16 | feel | the empty stand falls or breaks too | A butt on a bare suit stand breaks it into wood (`Prop.breakStand`, `stand-bit*`). |
| 17 | bug | a door hard locked that does not look it | A sealed arena (THE YARD, the mage's): shut, each door now wears a padlock of cells and UNTIL THEY FALL · n LEFT (`Renderer.drawSealWords`). |
| 18 | perf | 1 FPS, a 2.3 s stall, game 35-40 ms | The 2.3 s was outside the game's own work (its counter said 40 ms): the browser or the machine. Taken off the frame: the ONE MORE LIFE portrait is baked (≈1 ms a frame), the animals' kind test is a Set; a room's sound loop (0.25 s to render here) is no longer rendered ahead mid-fight. DIP LOG on and SAVE DIPS next time it happens. |

### 9 Oct 2026, fifth batch (his 20 notes and screenshots)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | feel | top-left order: horns, then the dare, then the talismans | Done (`hornRowW`, `dareRowW`). |
| 2 | bug | a body got behind a shut soul gate | A body is kept on the side of a shut door it was on (`collideEntities`, `_cx`). If it is seen again, the run code please. |
| 3 | bug | the death card's playtest line stuck to the buttons | Placed under the buttons' own height. |
| 4 | feel | LONG horns: show the damage zone in red at the end | The tips' cells red, held `tipHold` past the wave. |
| 5 | art | LONG like a gazelle's, BIG like a moose's | `hornShapeOf`: a ringed lyre, a palm with points; the glyphs follow. First take, open to his eye. |
| 6 | bug | the last room's souls sometimes skipped | They come once the last room is cleared (`lastDone`). Ask him: was it the white souls, or the soul gate opening without the soul? |
| 7 | polish | the clear card's pictures as the mirror's | Gold skull and violet wisp (`drawTally`). |
| 8 | bug | speed not back after THE TORTOISE'S PACE | Not reproduced: `paceMul` asks the floor every step, nothing lingers. Heaven runs ×1.5 (`heaven.speed`), which makes the floor after feel slow. Ask him: lower `heaven.speed`? |
| 9 | bug | the book's icons shake | One `Prop` a tile, kept (`iconProps`). |
| 10 | tool | pick any soul from a visual menu | PICK A SOUL in the drawer. |
| 11 | feel | the mage's rings: like fire, slower, roll through, one heart | Witchfire flames on them, 3.5 tiles/s, one heart a volley. |
| 12 | number | floors 1-3: small secret rooms only | No niche behind a niche before THE ROAD (`deep.chance` 0). Ask him if he also meant fewer, or the vault. |
| 13 | feel | the magnet's circling sword cuts | `updateMagnet`, `cutR` / `cutCd`, a use a cut. |
| 14 | bug | 11 FPS in the cave | Measured THE CAVE with his build (antlers, magnet): ~18 ms draw, ~3.5 update. Not reproduced; DIP LOG on and SAVE DIPS next time, or the run code. Other sessions' heavy runs on the same machine at that moment are the first suspect. |
| 15 | number | poison / fire charge of a held thing 30% faster | `holdFor` 1.5 → 1.05. |
| 16 | system | a mini boss's room shuts the way back | `updateBossShut`: any outlined boss or keeper, shut once he is inside, open when the boss falls. |
| 17 | bug | a poisoned sword hit the ogre, poisoned him, did no harm | The blade reaches as far as the poison (`jaw.touch`). |
| 18 | art | the animal small inside the stand's sign | `inRing`. |
| 19 | bug | no hover on the horn picture | It was cleared by the rail; set after it now. |
| 20 | system | THE SACRIFICE ALTAR (Nuclear Throne, Spelunky): six cells, a heart a second, any living thing on it, then THE DARK and a secret floor | Built on his answers: look A, THE CAVE only, the goat's last heart is a death, a companion pays its own, cells never empty, six take him into THE DARK (the existing floor) in THE CAVE's place. Not asked back: a man pays as the goat does (a plain one dies on it), read off his first note. |

### 9 Oct 2026, fourth batch (his 9 notes and a screenshot)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | system | first meeting with any animal in the middle of a floor | Already in 2.05 (`beast.mid` [0.3, 0.6]). |
| 2 | tooling | run less heavy stuff so parallel sessions are lighter | Already in 2.05 (CLAUDE.md *Work light*). |
| 3 | tooling | Defender exclusions for the Claude Code projects | A security setting: the command is given to him to run himself (admin PowerShell). |
| 4 | polish | check and polish the rest | Syntax, rules (`balance.js --seeds 6`) and a browser pass over this batch: clean. |
| 5 | feel | animals more careful with fire and things that hurt (pig by witchfire) | They look 2 tiles ahead (was 1.5) and half a step too, count a flame at the body's edge, and one standing in harm's way steps out first (`Beast.hotAt`, `Beast.flee`, `beast.flee`). |
| 6 | feel | the horn size in the top-left of the screen | The horn picture moved from over the hearts into the top-left row after the talismans, its name and note on the pointer; the dares' marks follow it. |
| 7 | feel | a dead companion: show its body, so you see what killed it | It lies on its side where it fell for the rest of the floor, over blood, or darkened over soot if fire took it (`Beast.drawBodies`, `game.beastBodies`); the plate's second line says KILLED BY FIRE / A CLUBMAN... |
| 8 | number | THE TORTOISE'S PACE at 40%, not 30% | `quests.tortoise.speed` 0.2 → 0.4. |
| 9 | system | iron cages vanished as a choice; animal or grass is fine | With only the tortoise's stand open a run deals one animal, and iron then came on 60% of those floors (and never before a key is held). Now always where it fits (`keys.iron.chance` 1, about 85-100% of animal floors). |

### 9 Oct 2026, third batch (his 19 notes and screenshots, and one more mid-work)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | feel | an animal's dare done: show it glad, and the dare's mark turns to a smiley | The clear card of the floor that won it shows the animal hopping under pixel hearts at the right of the tally (`Painting.drawHappy`); the dare's ? in the corner becomes a green smile until the animal has thanked him up there (`marks.smile`). |
| 2 | feel | the first ogre: the mage runs off with the ewe again and gives the ogre power; he finishes the carcass, roars, throws, leaps; more time, more of a film | First meeting only (`endBoss.ogre.long`, `EndBoss.stepOgreLong`): the opening's mage by him with her under his arm says EAT, BROTHER, pours a stream of violet into him, runs out through the way out; three CRUNCH bites, he rises and roars, throws the bone, leaps. About 7 s, skippable once seen. |
| 3 | system | the ogre landing on spikes is hurt | A leap that comes down with a spire within 10 px past touching, or on a grate (his weight drives its teeth up), costs him a heart and pins him (`Enemy.landOnTeeth`). Before, the spire only caught him on the goat's exact spot. |
| 4 | bug | the chase started at random on the 4th | THE ROAD no longer lays THE CHASE itself: it is the horse's dare and the dev row only. One line (`mods: ['chase']`) brings it back. Tell me if you meant something else. |
| 5 | system | the shaman's first room: many drops with stakes, so his skill is felt | His first room is one drops can be cut across, and two are cut, him beyond both (`chasm.shaman`); his call pulls the goat toward the fall. About 3 seeds in 4; the rest keep the old stone tooth. |
| 6 | feel | the chase does not back off when I walk at it | The red keeps 4 tiles of floor between it and him (was 1.5) and eases back as he comes (`chase.look.clear`, `back`). |
| 7 | feel | E - ROLL on the floor, not on the wall, brighter and blinking: critical | THE ROAD's chasm words stand on a row of clear floor by the lip (never slid onto a stub wall), and E - ROLL (both places it is written) is gold and pulses. |
| 8 | bug | the rifleman could not aim across the drop | He stood just past his sight trying to walk round. Cut off by a drop, he sees down a clear line 1.5× as far, shoots from the lip and holds it (`hunter.gapReach`, `Enemy.cutOffByGap`). |
| 9 | system | 4th: the rifleman and the chasms first; 5th the shaman; 6th the shieldman | THE ROAD: rifle and the taught drop (shaman out of its pool). THE THRESHING FLOOR: the shaman (shieldman out). THE BRIDGE: the shieldman. The thrower moved on to THE RAFTERS (two first meetings on THE BRIDGE broke its curve, `balance.js`); THE DARK has no shieldman now (curve 6→14 → 4→11 to stay under THE CAVE). Balance passes. |
| 10 | feel | the dots by the talisman are not needed | The rarity pips under the chips are gone (the rarity is on the pointer). |
| 11 | system | the god's first talk, his five lines | Word for word, plus a sixth: ONE MORE LIFE given "on faith" (see 17), and the jump. |
| 12 | tool | SETTINGS and small on the death card: (playtest) restart on the same floor | SETTINGS: PLAYTEST: RESTART ON THE SAME FLOOR (a death lays that floor again, as before permadeath). The death card: a small (FOR A PLAYTEST: RESTART ON THIS FLOOR) under the buttons, once. |
| 13 | system | the 50 souls for the horns asked after the mirror, as you walk to the edge: "forgot to tell you..." | Said at the lip, once the mirror is whole and looked into (`heaven.hornsEdge`), no longer on his cloud. |
| 14 | feel | stands in heaven: a white heavenly pictogram and the animal's silhouette; not broken, dim and inactive | A sign of white cells on the cloud and the animal's shape on it, white in a blue rim when open, grey-blue and still when not (padlock and count kept), the animal in gold once brought up. |
| 15 | system | TURTLEIZE: on E, a shell, blows charge it, let go or 5 s and a wave throws them off; a much longer roll wait; a magic shell; after the tortoise's quest | `js/shell.js`. Mid-work note: a corrupted soul's card, the plain roll untouched until taken, and winning the tortoise's dare puts it in the deal (`unlock`). Held up to 5 s, every blow but a fall lands on the crystal (no heart), the wave grows with what it took, then the roll waits ×4. A violet crystal carapace with three shards, its seams lit by the charge, the wave's reach ringed in cells. |
| 16 | system | first save: it thanks you and is in heaven; talked to, it asks to be saved again and its cage is at the very start of a floor; then the dare; then the skill | As written: `thanks` / `again` lines, its cage the first room that takes it (`opts.beastAtStart`), the dare only after the second save, TURTLEIZE after the tortoise's dare. |
| 17 | system | the first life before the mirror, as reward and promise ("faith") | ONE MORE LIFE from the first visit again, said in the god's first talk (half a day ago it waited for the mirror). |
| 18 | feel | run far from the tortoise and it shouts BRING ME WITH YOU | Once he is a room on (or far), its plate says it, at most every 9 s, kept in the picture. |
| 19 | system | mushrooms on the 4th after the 3rd run there | Only on THE ROAD, and only once this browser has walked onto it in 3 runs (`shroom.upTo`, `runs`, `Heaven.arrived`). |
| + | feel | UNLOCKS: open, not found (?), locked until a condition (the shell) | A third state: a padlock, and under the page what opens it (TURTLEIZE, the talismans a dare pays for; `Unlocks.lockOf`). |

Checked: syntax on every file, the generator sweep (0 failures), `balance.js` (passes), `doc-numbers.js`; in the browser: the shell
(4 blows taken, no heart lost, both men thrown, 7 s wait), the death card's line, heaven's stands, the clear card, THE ROAD's E - ROLL,
the shaman's room, UNLOCKS, the long ogre scene (mage, run, bites, roar, throw, leap: ~6.5 s) and the god's talk at the lip.

### 9 Oct 2026, second batch (his 22 notes and screenshots)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | bug | an animal hurt gets a short window too; the tortoise died in a mage's fire in seconds | After a burn the window is 2 s (`beast.hurtFire`), after a blow 1 s (was 0.6 for both), and the animal blinks through it. |
| 2 | system | the second secret scrap on THE DARK | The generator lays a scrap only on a floor with `scraps` (THE DARK); the first stays under THE ALTAR's table. `GEN_RULES.posters` follows. |
| 3 | feel | the lives should not move and be much smaller | No bob; 15 px instead of 28 (`hud.life`). |
| 4 | feel | the butcher's shove clearer, and no spamming it | Never twice in 4 s (`champion.shove.cd`); an amber ring off him and a smaller one on the goat, a deeper and longer lean, more hitstop. |
| 5 | feel | RUN AGAIN only after (the other button) on the first 3-4 runs, then together | RUN AGAIN no longer comes up before ASCEND: with it, and on a browser's first 4 runs 1.4 s after it (`painting.death.late`, `lateRuns`). Backspace waits for the button too. |
| 6 | system | THE YARD's last room: a crack, behind it a way down to THE DARK; half the runs, never the first | `dark.fork.at` 3 в†’ 1: a wall that gives (`kind: 'secret'`, `fork`) in the last room's far wall, the flight hidden behind it until it breaks, A WAY DOWN, INTO THE DARK. `chance` 0.5 off the run seed, never while the browser has run under twice (`Game.forkRun`). THE DARK is played in THE CAVE's place (Level 3), its curve 7в†’16 в†’ 6в†’14 so it stays under THE CAVE (62.2 vs 63). The flights' floor words wait for the crack. README, CONCEPT updated. |
| 7 | system | padlocks on the tower and the stands until the mirror is repaired | The tower and the broken stands (goose, horse) carry a padlock and pour nothing until it is (`Heaven.padlocked`); a GRAB says LOCKED. THE MIRROR FIRST. Souls poured into them before (his 11 in the tower) are given back once. |
| 8 | feel | locked, no HOLD prompt | The prompt says LOCKED. |
| 9 | feel | the post not needed until modifiers | It stands only while a dare is worn (the 7 Oct way), so it can be let go. |
| 10 | feel | the purse plate too wide | As wide as its widest line. |
| 11 | bug | heaven's progress lost on a reload, NEW GAME offered | The pour wrote on a timer a reload could cut, and the tower had taken the souls the mirror needed (see 7, 15). A death ending the run is the permadeath rule, so NEW GAME after a reload in heaven is right; what he carries up there is meta and stays. |
| 12 | bug | objects collided strangely (the crocodile's spit over the straw) | A roast only on a fire with plain floor a tile either side and a row above. |
| 13 | system | 20 souls в†’ talk to the god в†’ he sends you to the mirror в†’ repair it в†’ the first life is his gift | The mirror pours only after the god's word (`Heaven.mendSent`), and ONE MORE LIFE comes with the repaired mirror, not the first visit (`extraLivesFor`), said in a plate as it is whole. |
| 14 | number | 2 hearts between floors by default | `goat.floorHeal` 1 в†’ 2. |
| 15 | bug | a mess between the count and the quest (FOR THE GOD 20/20 over a mirror at 16/20) | Sent to the mirror, the purse says FOR THE MIRROR and what is poured into it. |
| 16 | number | ONE MORE LIFE 150 souls and 2 corrupted | 300 / 4 в†’ 150 / 2. |
| 17 | number | 0-1 tables in heaven | odds 0.4 / 0.6, never two. |
| 18 | system | at the post, RIGHT M. CLICK: a small popup to choose modifiers; a little further right, nearer the god | Not built (no modifiers yet): *Open*, below. |
| 19 | feel | the ? smaller and in the top-left corner | 2 px cells (was 3), in the talismans' row after their chips. |
| 20 | feel | on THE ALTAR, no instructions after a death | THE ALTAR's control lines are not drawn once this browser has died (`Heaven.meta.deaths`). |
| 21 | feel | the route in one strip | `painting.oneRow` 7.5 в†’ 40: a cleared floor's picture is never cut into rows. |
| 22 | system | the tortoise's dare: very slow only with enemies within 7 tiles; slowness is strength, not a race | `Heaven.paceMul`: his stride Г— 0.2 while a woken man stands within 7 tiles (`quests.tortoise.near`), full otherwise. Its words say slow is a strength. |

### 9 Oct 2026 (his 20 notes and screenshots)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | feel | HELP THE GOAT: "can we anonymously send info about your run? No name, email or other personal data" | Those words (`TUNING.stats.ask`). The panel is near opaque now: the menu's rows read through it in his screenshot. |
| 2 | feel | NEW GAME: "(progress saves automatically)" | The note says exactly that. |
| 3 | feel | UNLOCKS, "don't need this" | Off the title (dev drawer only, like LEVELS and BEST); the book's UNLOCKS tab is unchanged. |
| 4 | feel | the discord row: "Join the discord / send your feedback, bugs and ideas"; the small menu bigger | JOIN THE DISCORD, "Send your feedback, bugs and ideas". Every row taller (56 px), the names 22 px, the notes 15.5 px and brighter, the rows wider. |
| 5 | feel | the paper: name on top, "headbutt to destroy" under; torn up, the same everywhere on the floor | The name is above the picture and the line under it says HEADBUTT TO DESTROY (ANY KEY TO PUT IT DOWN is gone; any key still closes it). The torn shreds already were one sprite; his answer on the last sentence: the paper opened on the floor is the same plain sheet too (the drawing is only in the full-screen view). |
| 6 | feel | the floor's instructions a bit more visible | Control lines 0.19 → 0.36, level hints 0.15 → 0.27. |
| 7 | feel | "for a new game the placement of things is bad, the first time I would ideally see (everything)" | His answer: the things stand where they can be seen from the door. A loose crate is now rolled in sight of the room's way in (no stone between, 25 rolls before any spot will do). Tables and furniture are the templates' own and not moved. |
| 8 | tool | does the bot need an AI; what to finish so it runs from the computer alone | It has no AI: plain JavaScript heuristics, no network call. `#bot` on a served page loads it (F8 on/off). What it still lacks is in *Open*. |
| 9 | feel | less blood lying about for no reason, and less bright | The old blood a room was "cleaned of" was meant to be faint (alpha 0.16) but `dot` paints into the stain tiles, which never saw that alpha: every room's five blots were full strength, in half the rooms. Now 0.3 on the stain tile, in a quarter of the rooms. Blood from real fights is untouched. |
| 10 | feel | hearts a bit bigger, an important element | 2.8 px cells, 24 px apart (`hud.heart`, was 2.1 / 18 after the 8 Oct "smaller"). |
| 11 | feel | the little arrow is not needed | The exit compass is gone. |
| 12 | bug | a sword broke beside a man and he did nothing | A blade breaking is a noise now (`noise.steel`, 9 tiles): the unaware go and look, as at a smashed crate. |
| 13 | feel | too many words over the soul | The word SOUL over a loose soul is gone; the door's "A SOUL OPENS IT" and the take prompt stay. |
| 14 | feel | this floor looks strange (black dithered blots) | Ordinary soot at 0.5 instead of 0.8 (witchfire's untouched). A guess: tell me if it was something else. |
| 15 | feel | a little too many things in the rooms, first run | Loose crates 1 to 3 a room that rolled them, was 2 to 4 (`rooms.crateWant`). |
| 16 | feel | bring an item to a door and let go, it does not destroy itself; one often wants to carry things between rooms | His answer: both break, if it is wooden. A crate let go with a plank door right in front of the mouth breaks the door and itself (`Goat.throwHeld`); iron, gates, seals, vaults and stairs do not give. |
| 17 | feel | KILLS / CORRUPTED SOULS words on hover only | The card shows the picture and the number; the word is under the pointer. |
| 18 | feel | the chandelier lesson with the rope by the entrance | The cleat is on the wall by the way in (3 columns of it at most), the rope across the room to the ring over the man (`GEN_RULES.chandlesson`). |
| 19 | bug | the mouse on her offer goes up and down | Her portrait on the card holds still (`still`). |
| 20 | number | witchfire sets you alight three times faster, "need..." (cut off) | Already one clock since 8 Oct. His answer: it should start to damage three times faster. Its FIRST bite after he steps in comes at a third of the interval (0.4 s against 1.2 s, `goat.witchOnset`); the ones after keep ordinary fire's clock. Measured: 0.47 s then 1.25 s later, against 1.26 s and 1.25 s for ordinary. |

### 8 Oct 2026, late evening (his 16 notes and screenshots)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | feel | before the god has his 20, a GRAB at the mirror should just say BROKEN | It offered HOLD: REPAIR IT 0/20 from the gift on. Now it pours only once the twenty are brought (`mendReady`); before that it says BROKEN. (`HEAVEN_TALK.broken` is that one word now.) |
| 2 | system | the other stands locked, not repairable; a good story for the three | Only the goose's (25) and the horse's (40) are broken and repairable; hen, crow, pig, rabbit, husky, fish are under a padlock (LOCKED. THE GOD WILL OPEN IT, LATER.). Each broken one says what broke it (`STAND_STORY`), and the god's ask after the mirror tells the three: the tortoise already down there, the goose and the horse to repair. |
| 3 | feel | my hit's impact whiter, yellow is the enemies' | The impact ring and sparks, the horns' splash, the wave and the charge ring are white (`PALETTE.hit`, `hitTip` a cool white for LONG's tips). |
| 4 | feel | hearts still, a bit smaller, no attention there | No throb on the last heart, no flicker on the light ones; 2.1 px cells and 18 px apart instead of 2.6 / 22 (`hud.heart`). |
| 5 | feel | the fallen chandelier less active in colour | The wreck's brass a step darker, the candles snuffed grey with a black wick, the wax dull. The ring in the air keeps its bright brass. |
| 6 | feel | the goat bigger on the mouse's screen; small I - OPEN STATS at the bottom | Portrait ~45% bigger; I · OPEN STATS under the cards, and I now opens the book over her offer (closing it leaves the offer up). |
| 7 | feel | the grass apart from the talismans, it is not one | Its own dark green card, set off by a gap with OR between. |
| 8 | feel | rarity colours: common white, rare green, epic violet | `RARITY` colours changed everywhere (card frame, the ring round the pointed card, the glow behind the icon, chips). |
| 9 | bug | a shut door on floor 2, cannot get through | The rest room before THE YARD's last ring has nobody in it, and a door out of a room nobody was ever in never swung open; iron reads as unbreakable. It opens now once he walks into that empty room. Seeds 44 and 111 showed it; both open. |
| 10 | system | two mages aim at different cells; the second throws where you are going | A rune about to go off within 2.2 tiles of him already, the next mage aims ahead along his run (velocity x the windup, at most 4 tiles), or, him standing, 2.2 tiles to the side away from the first (`seer.pair`, `Enemy.runeSpot`). |
| 11 | system | a corrupted soul taken with the right click | GRAB takes it (`Game.takeSoul`), RIGHT M. CLICK: TAKE IT shows when close; walking over it no longer swallows it. |
| 12 | feel | add the corrupted souls found to the clear card; no GATHERED | "28 SOULS", and "N CORRUPTED SOULS" in violet beside it when he swallowed any on the floor (`floorCorrupt`). |
| 13 | feel | CONTINUE breathing brighter and darker | Every gold button breathes, fill and frame, slower than a blink. |
| 14 | system | trench pits and the shaman first on the next floor, not the cave; the cave's first is the ogre boss | THE FLANK's trench rooms from THE ROAD (`ROOM_LEVELS` '0001111100'); the shaman met alone in THE ROAD's first room, with his tooth (the one stone tooth allowed off a cave). THE CAVE introduces nothing but its ogre now. |
| 15 | feel | the shaman's first room is top, just elsewhere | Kept as it was (alone, the tooth), moved to THE ROAD. |
| 16 | feel | the room with the cage easier, the fight distracted from the event | The room an animal is found in keeps at most 2 men, the weakest (`beast.calmMen`); a boss, a sentry, a first meeting and a combo's men are never cut. Every animal's room, not only the first. |

His answers the same night: the chasm lesson goes to THE ROAD ("on the fourth, where the proper chasm is"): `chasmLesson` moved, `chasm.from` 3, and a lone rifle post never stands in its empty room. #16 is the run's first animal only (`opts.firstBeast`, from the run's deal). Still open: the stands' stories and the god's three lines are first drafts.

Then, his ask to polish with the enemies' attacks first: a man's blow is a body now (`PaintedArt.attackPose`, `TUNING.enemyAnim`): the windup coils away and crouches, trembling at the end; the swing snaps out to a lunge with a stretch; the recover drifts home slumped; the swing is seen on the floor as a crescent of amber cells sweeping the wedge (`drawSwingSmear`, 0.07 ms); the rifle kicks its shooter back; the mage rises as his rune fills. The windup's pale tint went from 0.55 to 0.4 so the body still reads at its end.

### 8 Oct 2026, evening (his notes and screenshots)

| # | tag | note | what shipped |
|---|---|---|---|
| 1 | bug | grass in the corridor and again in the room on THE ALTAR, "don't repeat" | It was every seed: the first grass's corridor (out of room 2) always led into room 3, which always drew its rhythm bowl. The corridor grass now takes up the rhythm's bowl in the room it leaves and the room it leads into, and counts as the bowl of the room ahead (`counts`, gen.js; `GEN_RULES.milk` reads it). 300 seeds: 300 adjacent before, 0 after; every rule holds. |
| 2 | tool | check the earlier "what to polish" list | Shipped: 2.04 is on main, the artifact and itch (`butler status`: html5 2.04). launch.json is down to six entries. Still open: the bot walk (*tool* below), the first-kill hitch (did not reproduce today: first kill 5.2 ms against 4.0 for the second, in a hidden pane), the questions under *Ask him*, the threat-over-power flag (unchanged). |
| 3 | tool | camera distance in the dev drawer, "didn't find it" | It was a slider on the ENEMIES tab. Now also a CAMERA ×n row on the drawer's first page: each click steps 0.8 → 1.4 (`DEV_CAM_STEPS`, the same `dev.tune.camera`). |
| 4 | bug | low FPS even on the first floor (38 FPS, game 32.6 ms) | The biggest single cost was the veil in a shut room's mouth (`drawVeil`): ~1300 one-cell fills, each with a new colour string, for every shut mouth on the floor, on screen or not. Now a rect per row, a path per thread, and only near the view: 4.3 → under 0.8 ms a veil (measured in the page), nothing for one off screen. The rest of the frame is spread thin; see *Open* for what is left. |
| 5 | feel | smoother death, no red line | The red line was an off-screen rifleman's aim line left frozen over the pull-back. Every windup and aim line now fades out over `deathCam.tellFade` (0.25 s) once he is dead (`Renderer.tellFade`, THE DARK too). |
| 6 | feel | "wtf is that" (the I on the death card) | It was the count of souls lost, a struck wisp and a 1 that Alegreya draws like an I. Gone from the card. |
| 7 | feel | broken stands should look broken, "so you feel like repairing" | A broken stand is its own sprite (`plinth-broken`): split down the middle, one half slumped and tilted, a corner knocked off onto the cloud, the gold band snapped, the cushion flat and grey, stones at its foot. Its count sits on the wreck. |
| 8 | feel | "when it is empty, it is empty" | The pale halo waiting over an empty open stand is gone. |
| 9 | feel | not MEND but REPAIR | Every player-facing MEND / MENDED in heaven says REPAIR / REPAIRED (the prompt, the god's lines, the mirror's). |

Open from this batch: the camera at ×1.2 is his call (numbers in the reply); the rest of the FPS (below).

---

## Ask him

Read one way and built that way; his word settles it.

- (9 Oct sixth #4) "from the skills:" came with nothing after it. What was it?
- (9 Oct sixth #10) "it glitched at this moment" read as the hook's rope left hanging behind him (fixed). Was it a freeze instead?
- (9 Oct sixth #5, built) LONG's tips cost a man a heart (a clubman dies on them): is a heart the right size, and is the last 20% of the reach small enough?

- (9 Oct fifth #20, built) THE SACRIFICE ALTAR: a man on it pays a heart a second as the goat does, so a plain one dies there. Or should only a man held or thrown onto it count?
- (9 Oct second #5) "RUN AGAIN only after the [hint/ascend] appears" read as: RUN AGAIN never before ASCEND, and late by 1.4 s on the first four runs. Was it the death tip he meant?
- (9 Oct second #6) the crack can be broken before THE YARD's last boss is down, so the dark flight skips his fight (and his soul). Fine as a secret's price, or should it wait until the room is clear?
- (9 Oct second #20) the control lines go once the browser has died; the pen's headbutt prompt after 5 s stays. Right?

- (9 Oct #14) soot softened as a guess; is it the black dithered blots or something else in that room?

- (8 Oct, heaven #4) "when you brought 20 souls" breaks off there. What should happen then: the god says something, the mirror mends by itself, something shown?
- (8 Oct, #12) "if a corridor, then the barrier here" (screenshot), not built. Reading A: the soul gate's bars move from the rest room's doorway to the far end of its corridor, where it opens into the next room. Reading B: something about NO WAY BACK's stone. Which barrier, and why there?
- (8 Oct, #16) the chasm lesson (`chasmLesson`) is back on THE CAVE in an empty room, undoing the 7 Oct move to THE YARD ("not in the cave"). Was the cave's look the problem?
- (8 Oct, heaven #14, #24, and #1) read as: no captions under the stands; the showroom at x2 in place of GOD's x3 (not on top); the hitching rail by the edge always stands (not only "in the right spot").
- (7 Oct) the goose's dare: a floor with nothing but BAAH, while the way out is a soul gate the last boss's soul lifts, so only fire, traps and geometry can clear it. The dare he meant, or may the voice kill?
- (6 Oct) the horse's dare floor counts were lost in dictation; three floors, 15 sacrifices each and 40 for the last are guesses.
- (6 Oct) the rabbit's dare turned the stealth test (ALT) on while worn: a key against rule 1. The rabbit's stand is locked for now (`QUESTS` has only the tortoise, goose and horse); does the stealth dare come back as a run modifier chosen in heaven? Tied to whether stealth stays.
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
- (8 Oct) a heaven upgrade that raises the heal between floors (`goat.floorHeal`, 2 since 9 Oct): "a tree upgrade later".
- (7 Oct) the other stands (hen, crow, pig, rabbit, husky, fish) have plain costs; still to build: corrupted-soul costs, finds and secrets as conditions, and chains of their own (the concept's pond, nest, flock).
- (7 Oct) a later soul that changes the verb itself, "whip horns" (a lash, more reach and a curve), and souls that pay off per horn (LONG: pierce, BIG: sweep).
- (7 Oct) more FLANK layouts (a trench round an arena's men, a trench with a bridge), and a quest or combo that uses one.
- (9 Oct) the hitching post becomes the modifiers' picker once modifiers exist: RIGHT M. CLICK by it opens a small popup to choose them; it stands a little further right, nearer the god. Not built.
- (7 Oct) ONE MORE LIFE (since 9 Oct the repaired mirror's gift) is "to be taken away later".
- (1 Oct) **stun, the third element set** (parked, "don't bother for now"): each stun soul buys grace off `stunGoat` (½, 1, 2 s) and lengthens the stuns he deals; all four make a stunned man forget the goat (`lastSeen` cleared). Only three souls stun (THE FULL THROAT, DEAD WEIGHT, LEAPFROG), two of them roll actives, so it needs one or two new stun souls first. Its unbuilt headbutt idea: hold to lower the horns, a frontal parry (a parry staggers the striker and spends his run-up, a wall stops him like the butcher); never frontal i-frames (rule 4), never bullets ("horns are not iron").

### feel
- (7 Oct) the free animals' lives in heaven are a first sketch (wander, honk, a flock round the sky, grazing). Since 2.07 they talk to each other when he is near (`HEAVEN_BANTER`, three exchanges a pair); the concept's bigger scenes (the pond, the nest, the flock) are not built.
- (9 Oct, 2.07) the companions' road lines (`BEAST_CHAT`) are first drafts in voices I gave them (the hen a mother, the tortoise dry, the goose a brawler, the crow a gourmet of the dead, the horse vain, the pig hungry, the rabbit scared, the husky a performer); his edits on the TALK page. How often they speak (`beast.chat`) is a guess.
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
- The adaptive resolution (`perf.adapt`) is a guess at his laptop; unverified there. It gives up for good on a floor once a drop in pixels does not cut the script's time, which is his case (38 FPS with `game` 32.6 ms is script, not pixels).
- (8 Oct) the frame after the veil fix: ~12 ms of draw script on THE ALTAR in a hidden pane, no single call over ~1.5 ms (`drawHints`, `drawSkills`, `drawUI`, the room bake, props). Next candidates: the floor words baked to canvases instead of `fillText` each frame, the HUD rail cached until it changes. Wants a run of `tools/perf.js` with the pane visible.
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
