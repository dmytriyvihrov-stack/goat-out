// THE PASTURE ABOVE (29 Sep 2026): where a dead goat goes between one try at a floor and the next,
// the way Hades has its House ("between deaths you land in a hub in the sky; a goat god on a big
// cloud, all light, the way God is usually drawn; empty seats that the gods of the animals you save
// will sit in; a blind man who combs you if you go up to him and press grab; the god talks the way
// Hades does, grand and silly, 'bah-bah, I send you back, I cannot make you new, but you will be
// there from that moment'; something nice to do up there; a mirror, or something like it, that buys
// upgrades that stay"). Two rooms: the god's, and the edge, "you walk up to the edge and you see the
// earth, and a long way down the cult's rooms, and you jump, and the run starts again in the pen".
//
// A death's card now leads here (`Heaven.enter`) and the edge leads back (`Heaven.leave`, which is the
// old `restartLevel`: the same floor, a new layout, the middle gate if he had reached it), so nothing
// about what a death costs has changed; heaven is the walk between. Backspace here jumps at once.
//
// What does carry across deaths and runs lives in `Heaven.meta`, this browser's, under its own key,
// and nothing that starts or ends a run touches it: the SACRIFICES (every man the compound loses to
// the goat, `TUNING.heaven.pay`) and what the mirror has bought with them (`MIRROR`, js/tuning.js),
// which `Game.applyBoons` lays under every run. The seats remember which animals ever came out.
//
// Pillar 1 holds: nothing here is a new button. GRAB talks, combs and looks into the mirror; the
// horns ring the bells, knock the supper off the table and butt the goat in the glass; BAAH gets an
// answer. Rule 6 holds: heaven is laid by hand and the same every visit, and nothing in it is a
// layout a floor is played on.
const HEAVEN_KEY = 'goatout.heaven.v1';

const HEAVEN_LEVEL = {
  name: 'THE PASTURE ABOVE', sub: 'Heaven', heaven: true, rooms: 2,
  canon: { id: 'heaven', name: 'HEAVEN', idea: 'Between one life and the next.' },
  souls: 0, heals: 0, gates: [], arenas: [], hint: null, hintKey: null,
  fog: '#bcd5f3', floor: '#e8eefb', floorAlt: '#dde6f8', wall: '#f4f8ff', wallTop: '#ffffff',
};

// Who sits on which seat once its bargain has been kept (`Beast.bank`, `Heaven.saved`). Listened
// to (GRAB), a seat says its `sound` and its `line` once the animal has been saved; saved twice or
// more, `more` as well (30 Sep 2026: "after the first, the sound and a line; after two, one more").
const HEAVEN_SEATS = [
  { kind: 'tortoise', name: 'THE TORTOISE', sound: '...', line: 'SLOWLY. EVERYTHING, SLOWLY. ESPECIALLY DYING.', more: 'YOU CARRIED ME TWICE NOW. MY SHELL REMEMBERS YOUR TEETH.' },
  { kind: 'goose', name: 'THE GOOSE', sound: 'HONK!', line: 'I LED YOU. YOU ARE WELCOME.', more: 'AGAIN I TOLD THEM ALL WHERE YOU WERE. AGAIN YOU LIVED. WE MAKE A TEAM.' },
  { kind: 'chicken', name: 'THE HEN', sound: 'BUK. BUK-BUK.', line: 'SHE IS PROUD OF YOU.', more: 'SHE HAS STOPPED COUNTING THE MEN SHE FLEW AT. SHE HAS NOT STOPPED BEING PROUD.' },
  { kind: 'crow', name: 'THE CROW', sound: 'CAW.', line: 'I ATE VERY WELL ON YOUR FLOORS. VERY WELL.', more: 'KEEP THE BODIES COMING, GOAT. I FIND YOU THE SHINY THINGS.' },
  { kind: 'horse', name: 'THE HORSE', sound: 'NEIGH!', line: 'YOU BEAT ME. ONCE. IT WILL NOT HAPPEN AGAIN.', more: 'IT HAPPENED AGAIN. I DEMAND A REMATCH. UP HERE THERE ARE NO DOORS TO KICK.' },
  { kind: 'pig', name: 'THE PIG', sound: 'OINK.', line: 'THE GRASS UP HERE IS GOLD. I HAVE EATEN SOME. I WILL EAT MORE.', more: 'YOU FED ME AGAIN. I LEFT YOU TUFTS ALL THE WAY DOWN. DID YOU FIND THEM?' },
  // 1 Oct 2026 (js/beasts-more.js): the two new ones sit at the foot of the god's room.
  { kind: 'rabbit', name: 'THE RABBIT', sound: 'THUMP.', line: 'YOU HOPPED ALL THE WAY. I DID NOT THINK A GOAT COULD.', more: 'AGAIN, ON TIED LEGS. YOU ARE HALF RABBIT NOW. THE BETTER HALF.' },
  { kind: 'husky', name: 'THE HUSKY', sound: 'AWOO!', line: 'WE SANG IN THE MIDDLE OF A FIGHT. NOBODY ELSE EVER SANG WITH ME.', more: 'SING IT AGAIN! WAF-WOOO... YOUR TURN. NO? LATER, THEN.' },
];

// ---------------------------------------------------------------- what the god says
// Grand and silly, in the cult's own capitals. `HEAVEN_TALK.intro` is the first meeting; `killer` a
// line for each thing that took his last heart, said the first time it does; the rest are dealt by
// what changed since the last visit (`Heaven.pickTalk`). `{floor}` and `{animal}` are filled in.
// A `|` inside a line cuts it into parts, each its own plate in turn (`Heaven.parts`). Edited, split
// and written back from tools/god-talk.html (the dev drawer's GOD TALK), served by tools/serve.js.
const HEAVEN_TALK = {
  // Four plates, not seven (2 Oct 2026: "the first time the god talks far too long"): who he is, the
  // gift and the quest (from the end of this talk every man he puts down leaves a white soul,
  // `js/motes.js`, and the god wants `heaven.gift.quest` of them), and the mirror before the edge.
  // 5 Oct 2026, his words: comfort first, then the turn (the sacrifice now sacrifices to him), then the quest.
  intro: [
    'DO NOT CRY, LITTLE GOAT. NOT ALL IS LOST.',
    'THEY WANTED TO SACRIFICE YOU. NOW YOU BRING SACRIFICES TO ME.',
    'FIGHT THE CULT AND BRING ME 20 SOULS. THEN WE WILL MEND MY MAGIC MIRROR, AND YOU WILL GROW STRONGER.',
    'NOW JUMP OFF THE EDGE. BUTT FIRST. BEH.',
  ],
  // For a goat who met him before the gift existed: the same gift, said on its own.
  gift: [
    'WAIT. I FORGOT SOMETHING. HOLD STILL. ...THERE. A LITTLE OF MY LIGHT, IN YOUR HORNS.',
    'NOW EVERY MAN YOU PUT DOWN LEAVES A SMALL WHITE SOUL. WALK OUT OF THE ROOM AND THEY FOLLOW YOU. BRING THEM.',
    'TWENTY. BRING ME TWENTY, AND I WILL MEND MY MIRROR FOR YOU.',
  ],
  // The twenty brought (`heaven.gift.mend`, 3 Oct 2026: "the god asks for 20, not 200, and mends the
  // broken mirror"): he calls the goat over and says this; since 5 Oct 2026 the goat mends it himself,
  // walking up to the glass and pressing GRAB (`Heaven.interact` → `Heaven.mend`).
  mend: [
    'TWENTY. I COUNTED THEM. TWICE. ONE OF THEM WAS A DUCK, BUT I WILL ALLOW IT.',
    'MY LIGHT IS IN YOUR HORNS NOW. GO TO MY MIRROR AND TOUCH IT, AND IT WILL BE WHOLE.',
    'WHOLE, IT TURNS WHAT YOU BRING ME INTO STRENGTH THAT OUTLIVES YOU. AT TWO HUNDRED IT SHOWS WHAT IT KEEPS AT THE BACK.',
  ],
  // The two hundred brought: SECOND CHANCE is on the glass from now on (`MIRROR`, `needs: 'quest'`).
  quest: [
    'TWO HUNDRED. MY HOOVES ARE TIRED FROM ALL THE COUNTING.',
    'LOOK AT THE BACK OF MY MIRROR NOW. THERE IS SOMETHING THERE FOR A GOAT WHO KEEPS DYING. IT IS NOT CHEAP. NOTHING GOOD IS.',
  ],
  // GRAB on the mirror before it is mended (`Heaven.interact`).
  broken: ['CRACKED THROUGH. BRING THE GOD TWENTY, AND IT CAN BE MENDED.', 'A HUNDRED LITTLE GOATS LOOK BACK, ALL OF THEM CROOKED.', 'BROKEN. TWENTY SOULS, AND IT CAN BE MENDED.'],
  killer: {
    bearer: ['A MAN WITH A STICK. YOU HAVE TWO HORNS AND FOUR LEGS. DO THE ARITHMETIC.'],
    brute: ['THE BUTCHER THROWS HIS HOOK WHERE YOU ARE GOING, LITTLE HORNS. TURN AFTER IT LEAVES HIS HAND.'],
    shield: ['A MAN BEHIND A DOOR. HE TURNS LIKE A DOOR, TOO. SLOWLY. GO ROUND HIM, LITTLE HORNS.'],
    butcher: ['THE OGRE. YOUR HORNS DO NOTHING TO HIM. FIRE DOES. BLADES DO.', 'YOUR HORNS DO NOTHING TO HIM. I SAY IT TWICE BECAUSE YOU FORGOT IT ONCE.'],
    seer: ['THE MAGE AND HIS PURPLE FIRE. WHEN THE FLOOR UNDER YOU GLOWS, THE FLOOR IS NOT YOUR FRIEND.'],
    hunter: ['A RIFLE. HE TAKES A MOMENT TO AIM. A GOAT TAKES A MOMENT TO LEAVE. RACE HIM.'],
    rifle: ['A RIFLE. HE TAKES A MOMENT TO AIM. A GOAT TAKES A MOMENT TO LEAVE. RACE HIM.'],
    dog: ['A HOUND. I DO NOT CARE FOR DOGS EITHER. SHOUT AT IT. IT HATES THAT.'],
    wraith: ['THE MIST. IT ONLY BECOMES A BODY BEHIND YOU. SO LOOK BEHIND YOU. CONSTANTLY. LIKE A GOAT.'],
    ratogre: ['YOU ANGERED THE MOUSE. EVERYBODY KNOWS NOT TO ANGER THE MOUSE.'],
    fire: ['YOU WALKED INTO FIRE. FIRE IS HOT. THAT IS THE WHOLE LESSON, AND YOU HAVE HAD IT.'],
    witchfire: ['PURPLE FIRE. HOTTER THAN THE ORANGE KIND, AND FAR RUDER.'],
    spike: ['THE FLOOR BIT YOU. THE FLOOR IN THAT PLACE BITES. STEP OFF IT WHILE IT THINKS ABOUT IT.'],
    spire: ['THE STONE TEETH WERE THERE BEFORE YOU AND WILL BE THERE AFTER. WALK ROUND.'],
    bomb: ['THE ROUND BLACK THING WITH THE SPARK. YOU HELD ON TO IT. WHY DID YOU HOLD ON TO IT.'],
    powder: ['BLACK POWDER ON THE FLOOR AND A FLAME NEARBY. YOU DID THE ARITHMETIC TOO LATE.'],
    chandelier: ['A CHANDELIER. YOU PULLED THE ROPE AND STOOD UNDER IT. I HAVE SEEN THAT JOKE BEFORE. IT WAS NOT FUNNY THEN EITHER.'],
    mill: ['THE WHEEL GOES ROUND. THAT IS ALL IT DOES, AND IT IS VERY GOOD AT IT.'],
    fall: ['YOU FELL. GOATS ARE SUPPOSED TO BE GOOD AT HEIGHTS. I AM DISAPPOINTED ON BEHALF OF ALL GOATS.'],
  },
  again: ['AGAIN, LITTLE HORNS?', 'BACK SO SOON?', 'BEH. HELLO AGAIN.', 'YOU AGAIN. GOOD.', 'SIT. NO. JUMP.'],
  deaths: {
    3: ['THIRD TIME. I HAVE STARTED A TALLY ON A CLOUD. IT IS A SMALL CLOUD. DO NOT MAKE ME FIND A BIGGER ONE.'],
    10: ['TEN. I HAVE HAD TO GIVE THE TALLY A NAME. HIS NAME IS GERALD.'],
    25: ['GERALD IS FULL. I HAVE STARTED ANOTHER CLOUD. SHE DOES NOT HAVE A NAME YET.'],
    50: ['FIFTY. YOU ARE THE MOST DEVOTED CORPSE I HAVE EVER HAD. I AM ALMOST TOUCHED.'],
    100: ['ONE HUNDRED. THE ANGELS HAVE STARTED BETTING ON YOU. I HAVE MONEY ON YOU. DO NOT TELL THEM.'],
  },
  further: ['{floor}. FURTHER THAN EVER. I MOVED MY SEAT NEARER THE EDGE TO WATCH.', 'YOU GOT AS FAR AS {floor}. THE CULT IS WORRIED. I CAN SMELL IT FROM HERE.'],
  saved: ['YOU WALKED {animal} OUT OF THAT PLACE. ITS SEAT UP HERE IS WARM NOW. IT WILL NOT STOP TALKING ABOUT YOU.'],
  mirror: ['YOU LOOKED INTO MY MIRROR, AND IT LOOKED BACK. IT LIKES YOU. IT DOES NOT LIKE MANY.'],
  combed: ['THE OLD MAN COMBED YOU. YOU SMELL OF CLOUDS NOW. IT IS AN IMPROVEMENT.'],
  song: ['MARY HAD A LITTLE LAMB. ON MY BELLS. IN MY HEAVEN. ...FINE. THAT ONE IS ALLOWED.'],
  any: [
    'THEY SACRIFICE GOATS TO THEIR GOD. I HAVE MET THEIR GOD. HE IS A SMALL MAN IN A LARGE HAT.',
    'WHEN YOU FALL, FALL WITH DIGNITY. OR AT LEAST FALL ON A CULTIST.',
    'A WALL IS A FRIEND WHO NEVER MOVES. INTRODUCE YOUR ENEMIES TO IT.',
    'THE CLOUDS ARE NOT FOR EATING. I KNOW. I CHECKED. EXTENSIVELY.',
    'HEADBUTT FIRST. ASK QUESTIONS NEVER. THAT IS THE WHOLE OF THE LAW.',
    'BEH. THAT IS ALL. SOMETIMES A GOD ONLY WANTS TO SAY BEH.',
    'THE ONES WITH THE STICKS SHOUT "STOP THE GOAT". NOBODY HAS EVER STOPPED A GOAT. IT IS NOT IN US.',
    'I WAS SACRIFICED TOO, ONCE. IT WAS A LONG TIME AGO. I GOT BETTER. UP HERE. EVENTUALLY.',
    'MILK HEALS. GRASS HEALS. STANDING STILL IN IT HEALS. YOU NEVER STAND STILL. THAT IS YOUR PROBLEM.',
    'THE ROLL IS FOR LEAVING. YOU ARE VERY GOOD AT ARRIVING. WORK ON THE LEAVING.',
  ],
  bye: ['GO. THE EDGE IS THAT WAY. BEH.', 'JUMP ALREADY.', 'STILL HERE? THE CULT WILL NOT BUTT ITSELF.', 'DOWN YOU GO, LITTLE HORNS.'],
  butted: ['DO NOT BUTT THE DIVINE.', 'THAT TICKLED. DO IT AGAIN AND I SEND YOU TO THE TRIP.', 'BEH!'],
  answer: ['BEH.', 'BEEEH.', 'BEH BEH.', 'BAAH, YOURSELF.'],
  // At the edge before he has ever looked in the mirror (2 Oct 2026, "the god does not let you jump
  // down the first time before you go to the mirror"): `Heaven.holdEdge`.
  notYet: ['NOT YET, LITTLE GOAT. THE MIRROR FIRST.', 'THE MIRROR. UP THERE. LOOK INTO IT, THEN JUMP.', 'NO JUMPING BEFORE THE MIRROR.'],
  // what the goat's mouth thinks of the gold grass
  munch: ['SWEET', 'HEAVENLY', 'MMM', 'TASTES OF SUNDAY', 'GOLDEN'],
};
// The shepherd cannot see him, and takes him for a little kid; the goat cannot tell him how big he
// has grown. (A ewe until 30 Sep 2026: "little ewe? the game is about a goat.")
const SHEPHERD_TALK = {
  hello: ['WHO IS THAT? A LITTLE KID. COME HERE, LET ME COMB YOU.', 'AH, THE LITTLE KID AGAIN. COME, COME.'],
  comb: ['THERE. THERE.', 'SUCH KNOTS. WHERE HAVE YOU BEEN, LITTLE GOAT?', 'YOU SMELL OF SMOKE AND MEN.', 'YOUR HORNS HAVE GROWN. NOT SO LITTLE NOW.', 'SOFT AS A CLOUD NOW. SOFTER.'],
  butted: ['OH! STILL SOME SPIRIT IN YOU.', 'GENTLY, LITTLE GOAT. GENTLY.'],
  // He cannot see the chime, only hear who is at it (`Heaven.butt`, `heaven.shepBells`).
  bells: ['WHO IS AT THE BELLS? THE LITTLE KID?', 'NOT SO HARD. THEY ARE OLDER THAN I AM.', 'THAT ONE IS FLAT. IT ALWAYS WAS.',
    'AH, I KNOW THAT ONE. HOW DOES IT GO ON?', 'MY WIFE RANG THEM LIKE THAT.', 'SOFTLY. THE GOD IS DOZING.', 'GOATS DO NOT RING BELLS. OR DO THEY NOW?'],
  // His quest (5 Oct 2026): said the first time he is asked for the comb, or a sleeping bell is butted.
  quest: 'MY BELLS HAVE GONE TO SLEEP, LITTLE KID. ONE STILL RINGS. WIN A FLOOR DOWN THERE AND ANOTHER WAKES. WAKE THEM ALL FOR ME.',
  asleep: ['THAT ONE IS ASLEEP. WIN A FLOOR, AND IT WAKES.', 'SHH. IT SLEEPS. A FLOOR WON WAKES IT.'],
  woke: ['I HEARD THAT. ANOTHER ONE IS AWAKE.', 'ANOTHER BELL. YOU WON A FLOOR DOWN THERE, DID YOU NOT?'],
  // All eight awake: his tune, then the goat's turn (`Heaven.updateSong`).
  song: { come: 'ALL OF THEM AWAKE. WAIT THERE. LET AN OLD MAN PLAY.', listen: 'LISTEN, LITTLE KID.',
    you: 'NOW YOU. WHEN THE LIGHT FALLS ON A BELL, RING IT.', again: 'AGAIN? FOLLOW THE LIGHTS, THEN.',
    good: 'HA! JUST SO. HEAR HOW THEY GO ON WITHOUT US.', fair: 'NOT BAD FOR HORNS. LISTEN, THEY GO ON BY THEMSELVES.', poor: 'NEVER MIND. THEY KNOW IT NOW. LISTEN.',
    end: 'THERE. BUTT ME AND WE PLAY IT AGAIN.' },
};
// What a floor tried again after a death says at its foot for a few seconds (1 Oct 2026, playtest:
// "after the first death on a level, show tips, who killed you, or one off a general list, made in
// the dev tools; add one or two yourself, the rest by hand"): a line off `killer[<what killed him>]`
// (the run code's token: bearer, brute, shield, butcher, seer, hunter, dog, wraith, ratogre, fire, witchfire,
// spike, spire, bomb, chandelier, mill, fall, rifle) if there is one, else off `any`. Edited and written
// back from tools/god-talk.html with the god's lines (`Codex.deathTip`).
const DEATH_TIPS = {
  killer: {},
  any: [
    'YOUR HORNS ONLY KNOCK A MAN DOWN. WHAT KILLS HIM IS THE WALL YOU AIM HIM AT.',
    'A POISONED OR STUNNED MAN DIES ON A WALL FROM A SOFTER HIT.',
    // 3 Oct 2026 playtest.
    'RIGHT M. CLICK GRABS A THING. LET GO AND YOU THROW IT.',
    'POISON SLOWS THE CULT AND BLINDS THE RIFLEMEN.',
    'FIRE MAKES SOME OF THEM PANIC AND RUN. OTHERS COME AT YOU FASTER.',
    'THE YELLOW ONES ARE CHAMPIONS: MORE HEARTS, AND HARDER TO PUSH.',
  ],
};
// Where the broken mirror's cracks run to, in sprite texels off the middle of its glass (`drawMirror`).
const HEAVEN_CRACKS = [[-9, -12], [-10, 4], [-4, 15], [6, 14], [10, -10], [-1, -16], [9, 6]];
// The five bells of the chime, and the one tune the god knows the words to (E D C D E E E).
const HEAVEN_SONG = [2, 1, 0, 1, 2, 2, 2];
// The two tables of the feast, laid the same every visit (js/scatter.js throws it about): what stands
// on each and where, px off the table's middle, as `Scatter.foodOf` would lay it.
const HEAVEN_FEAST = [
  [{ id: 'grapes', x: -4, y: -9 }, { id: 'milk', x: 14, y: -7 }, { id: 'gapple', x: -14, y: -5 }, { id: 'bread', x: 5, y: -3 }],
  [{ id: 'cheese', x: -3, y: -9 }, { id: 'goblet', x: 14, y: -8 }, { id: 'honey', x: -13, y: -5 }, { id: 'gapple', x: 6, y: -3 }],
  // 29 Sep 2026: "more food in this room", the empty floor right of the two became two more tables.
  [{ id: 'bread', x: -12, y: -8 }, { id: 'pear', x: 2, y: -9 }, { id: 'grapes', x: 14, y: -6 }, { id: 'milk', x: -4, y: -3 }, { id: 'gapple', x: 9, y: -2 }],
  [{ id: 'honey', x: -14, y: -7 }, { id: 'gapple', x: -3, y: -9 }, { id: 'goblet', x: 12, y: -8 }, { id: 'cheese', x: 3, y: -3 }, { id: 'pear', x: -10, y: -2 }],
];

const Heaven = {
  meta: null,

  // ---------------------------------------------------------------- what stays
  load() {
    let m = null;
    try { m = JSON.parse(localStorage.getItem(HEAVEN_KEY) || 'null'); } catch (e) { m = null; }
    if (!m || m.v !== 1) m = { v: 1 };
    this.meta = Object.assign({ sacrifices: 0, souls: 0, soulsEarned: 0, earned: 0, pending: 0, ranks: {}, saved: {}, visits: 0, deaths: 0,
      combed: 0, heard: {}, killers: {}, best: -1, lastBest: -1, bought: 0, sung: false, told: {}, gift: false, brought: 0 }, m);
    return this.meta;
  },
  // The god's gift (`heaven.gift`): until his first talk ends no man pays anything; `brought` is what
  // has been counted in since, toward his two hundred.
  gifted() { return !!(this.meta && this.meta.gift); },
  questDone() { return !!(this.meta && this.meta.gift && this.meta.brought >= TUNING.heaven.gift.quest); },
  // The mirror starts broken and the god mends it once his twenty are brought (`heaven.gift.mend`,
  // `mend`): until then it buys nothing and the edge does not wait on it. A goat who bought from it
  // before it could break keeps it whole.
  mended() { const M = this.meta; return !M || !!M.mended || M.bought > 0 || Object.keys(M.ranks || {}).some((k) => M.ranks[k] > 0); },
  mendReady() { return !!(this.meta && this.meta.gift && this.meta.brought >= TUNING.heaven.gift.mend); },
  // The bells that ring (5 Oct 2026, the blind shepherd's quest): the first, and one more for every
  // floor this browser has ever climbed out of (`meta.cleared`, `floorCleared`), never more than hang.
  bellsOpen() { const M = this.meta; return Math.min(TUNING.heaven.bells.length, 1 + (M && M.cleared ? Object.keys(M.cleared).length : 0)); },
  // A floor climbed out of (`Game.levelCleared`, `saveAhead`): the first time, a bell wakes up here.
  // Not in GOD MODE or THE SHOWROOM, the sacrifices' rule.
  floorCleared(game, li) {
    if (!this.meta || !(li >= 0) || (game.dev && game.dev.god) || game.showroomOn) return;
    this.meta.cleared = this.meta.cleared || {};
    if (!this.meta.cleared[li]) { this.meta.cleared[li] = 1; this.saveSoon(); }
  },
  // The death card offers RESTART only when nothing up here is new (5 Oct 2026: "after the first death
  // only ASCEND; RESTART only when nothing new opened"). `news` names everything that would be new on
  // a visit now, each as a key that changes when the news does (`dying`: the death on the card is not
  // yet counted in `meta.deaths`); `fresh` is what of it no visit has shown yet (`meta.newsSeen`,
  // written as he arrives and as he leaves), so news ignored once is not news again.
  news(game, dying) {
    const M = this.meta || this.load(), out = [];
    if (!M.told.intro) return ['first'];
    if (!M.gift) out.push('gift');
    if (this.mendReady() && !this.mended()) out.push('mend');
    if (this.questDone() && !M.told.quest0) out.push('quest');
    if (M.sung && !M.told.song0) out.push('song');
    if (M.freshSeat && !M.told['seat-' + M.freshSeat]) out.push('seat:' + M.freshSeat);
    const d = M.deaths + (dying ? 1 : 0);
    for (const n of Object.keys(HEAVEN_TALK.deaths).map(Number)) if (d >= n && !M.told['deaths' + n]) out.push('deaths' + n);
    if (M.best > M.lastBest && M.best > 0) out.push('further' + M.best);
    if (this.bellsOpen() > (M.bellsSeen || 1)) out.push('bells' + this.bellsOpen());
    if (this.mended()) for (const u of this.shelf()) {
      const r = this.rank(u.id), c = u.costs[r];
      if (c !== undefined && M.sacrifices >= c && (M.souls || 0) >= this.soulCost(u, r)) out.push('buy:' + u.id + ':' + r);
    }
    return out;
  },
  // (`first`, the god's first talk not yet heard, is always fresh: it is the whole of heaven.)
  freshNews(game, dying) { const seen = (this.meta && this.meta.newsSeen) || []; return this.news(game, dying).filter((k) => k === 'first' || seen.indexOf(k) < 0); },
  seeNews(game) { if (this.meta) { this.meta.newsSeen = this.news(game, false); this.saveSoon(); } },
  // RESTART on the death card (past heaven) is still a death to the god's tally.
  restarted() { if (this.meta) { this.meta.deaths++; this.saveSoon(); } },
  // What the god is counting toward now, for the purse (0: nothing more).
  goal() { return !this.gifted() ? 0 : !this.mended() ? TUNING.heaven.gift.mend : !this.questDone() ? TUNING.heaven.gift.quest : 0; },
  mend(game) {
    const M = this.meta; if (!M || M.mended) return;
    M.mended = true; M.mirror = false; M.told.mend = 1; this.save();   // whole now: the edge waits for one look (`mirrorKnown`)
    const m = game.props.find((p) => p.kind === 'hmirror');
    if (m) { m.wobble = 0.4; if (game.heaven) game.heaven.mirrorButt = TUNING.heaven.mirrorFlash; game.ring(m.x, m.y, 3 * TILE, '#fff4c2'); game.particles(m.x, m.y - 30, 30, '#ffffff', 200); game.floatText(m.x, m.y - 70, 'THE MIRROR IS WHOLE', '#fff4c2'); }
    game.audio.sfxChime(TUNING.heaven.bells[1]); game.audio.sfxChime(TUNING.heaven.bells[4], 0.7, 0.16); game.audio.sfxBell();
  },
  // What the mirror shows: every rank but the ones still waiting on the quest.
  shelf() { return MIRROR.filter((u) => u.needs !== 'quest' || this.questDone()); },
  // The gift lands: said at the end of the talk that gives it.
  giveGift(game) {
    const M = this.meta; if (M.gift) return;
    M.gift = true; this.save();
    const g = game.goat;
    if (g) { game.ring(g.x, g.y, 2.5 * TILE, '#fff4c2'); game.particles(g.x, g.y - 12, 26, '#ffffff', 180); game.floatText(g.x, g.y - 44, 'YOU GATHER SOULS NOW', '#fff4c2'); }
    game.audio.sfxChime(TUNING.heaven.bells[2]); game.audio.sfxChime(TUNING.heaven.bells[5], 0.6, 0.14);
  },
  save() {
    if (!this.meta) return;
    clearTimeout(this.saveT); this.saveT = null;
    try { localStorage.setItem(HEAVEN_KEY, JSON.stringify(this.meta)); } catch (e) { /* storage refused: heaven forgets */ }
  },
  // Kills land in bursts; the store is written a beat later, once.
  saveSoon() { if (!this.saveT) this.saveT = setTimeout(() => this.save(), 800); },
  rank(id) { return (this.meta && this.meta.ranks[id]) || 0; },
  // What he has tried up here at least once (3 Oct 2026 playtest: "at first I thought in heaven you
  // only eat the hay"): until a thing has been talked to, combed, looked into, rung or butted, it
  // wears a question mark over it (`drawMarks`). Kept for good, per browser, beside the rest of `meta`.
  tried(key) {
    const M = this.meta; if (!M) return;
    M.tried = M.tried || {};
    if (!M.tried[key]) { M.tried[key] = 1; this.saveSoon(); }
  },
  fresh(key) { return !!this.meta && !(this.meta.tried && this.meta.tried[key]); },
  // A sacrifice for the god: every man the compound loses while the goat lives (`Game.onKill`), and
  // `pay.floor` more for every floor he climbs out of. Not in GOD MODE (a dev walking round), not in
  // THE SHOWROOM.
  // Nothing before the god's gift (`gifted`); after it, what is paid counts toward his two hundred.
  earn(game, n) {
    if (!this.meta || !n || !this.meta.gift || (game.dev && game.dev.god) || game.showroomOn) return;
    this.meta.sacrifices += n; this.meta.earned += n; this.meta.pending += n; this.meta.brought = (this.meta.brought || 0) + n; this.saveSoon();
  },
  // A corrupted soul swallowed down there (the pickup in `Game.update`) is banked up here as well:
  // the mirror's top ranks ask for them (`MIRROR[].souls`). Same exceptions as a sacrifice.
  earnSoul(game) {
    if (!this.meta || (game.dev && game.dev.god) || game.showroomOn) return;
    this.meta.souls = (this.meta.souls || 0) + 1; this.meta.soulsEarned = (this.meta.soulsEarned || 0) + 1; this.saveSoon();
  },
  // What rank `r + 1` of `u` asks in souls (0 where it asks none).
  soulCost(u, r) { return (u.souls && u.souls[r]) || 0; },
  // The furthest floor this browser has reached (`levelIndexOf`), for the god to notice.
  reached(li) { if (this.meta && li > this.meta.best) { this.meta.best = li; this.saveSoon(); } },
  // An animal walked out of the compound (`Beast.bank`): its seat up here is taken for good.
  // `savedN` counts every time, which is how much the seat has to say (`HEAVEN_SEATS`).
  saved(kind) {
    if (!this.meta) return;
    this.meta.savedN = this.meta.savedN || {};
    this.meta.savedN[kind] = Math.max(1, (this.meta.savedN[kind] || 0)) + (this.meta.saved[kind] ? 1 : 0);
    if (this.meta.saved[kind]) { this.saveSoon(); return; }
    this.meta.saved[kind] = Date.now(); this.meta.freshSeat = kind; this.saveSoon();
  },
  // What the mirror has bought, laid into `mods` under every run (`Game.applyBoons`).
  applyMeta(m) {
    if (!this.meta) this.load();
    for (const u of MIRROR) { const r = this.rank(u.id); if (r > 0) u.apply(m, u.params, r); }
  },

  // ---------------------------------------------------------------- the place
  // Laid by hand, like THE SHOWROOM (js/showroom.js): the god's room on the left, a bridge of cloud, the
  // edge's room on the right with its south side open onto the drop.
  level() {
    const W = 60, H = 36, tiles = new Uint8Array(W * H).fill(T.WALL), at = (x, y) => y * W + x;
    const fill = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[at(x, y)] = t; };
    const px = (tx) => (tx + 0.5) * TILE;
    const rooms = [];
    const room = (x, y, w, h, name) => { fill(x + 1, y + 1, x + w - 2, y + h - 2, T.FLOOR);
      const r = { x, y, w, h, index: rooms.length, markers: [], role: 'heaven', seen: true, drawn: false, name, tpl: { name, rows: [] } };
      rooms.push(r); return r; };
    const A = room(3, 5, 26, 18, 'the throne'), B = room(33, 6, 24, 15, 'the edge');
    // the god's cloud: three rows of stone to the simulation, a great billow to the eye
    fill(12, 6, 19, 8, T.WALL);
    // the bridge between the two rooms
    fill(28, 13, 33, 16, T.FLOOR);
    // the drop: the edge room's south side is open all the way down the map
    fill(34, 20, 55, H - 1, T.PIT);
    fill(34, 19, 55, 19, T.FLOOR);
    const props = [];
    const put = (kind, x, y, o) => props.push(Object.assign({ x, y, kind, heaven: true }, o || {}));
    HEAVEN_SEATS.forEach((s, i) => put('hseat', px(i < 6 ? (i < 3 ? 6.5 : 24.5) : (i === 6 ? 10.5 : 20.5)) - 16, px([9.5, 14, 18.5, 9.5, 18.5, 14, 20.6, 20.6][i]), { seat: s.kind }));
    put('hshep', px(TUNING.heaven.shepAt[0]), px(TUNING.heaven.shepAt[1]));
    // the mirror stands at the bridge's mouth on the edge's side, so the way down walks past it
    // (3 Oct 2026: in the far corner it was missed)
    put('hmirror', px(TUNING.heaven.mirrorAt[0]), px(TUNING.heaven.mirrorAt[1]));
    for (let k = 0; k < TUNING.heaven.bells.length; k++) put('hbell', px(41.6) + k * HEAVEN_PIXELS.BELL_GAP * 1.35, px(10.2), { note: k });
    // the supper above the clouds (js/scatter.js)
    // one table a visit, as often as not; now and then two, now and then none (`heaven.tables.odds`)
    const odds = TUNING.heaven.tables.odds, roll = Math.random();
    let many = 0; for (let a = 0, k = 0; k < odds.length; k++) { a += odds[k]; if (roll < a) { many = k; break; } many = k; }
    [[40.2, 15], [44.2, 13.6], [41.8, 17.2], [50.5, 13.6]].slice(0, many).forEach(([tx, ty]) => put('table', px(tx), px(ty), { menu: 'heaven', heaven: false }));
    const start = { x: px(15.5), y: px(16.2) };
    // Gold grass here and there, to be grazed for nothing but the taste (`Heaven.update`): never on
    // the god's steps, the bridge, by the lip, or under anything that stands.
    const tufts = [], rng = new RNG(5), clearOf = (x, y) => props.every((p) => hyp(p.x - x, p.y - y) > 60 && hyp(p.x - x, p.y - 36 - y) > 60) && hyp(start.x - x, start.y - y) > 70;
    for (let a = 0; a < 400 && tufts.length < 16; a++) {
      const tx = rng.int(4, 55), ty = rng.int(6, 21);
      if (tiles[at(tx, ty)] !== T.FLOOR || tiles[at(tx, ty + 1)] === T.PIT || (tx >= 12 && tx <= 19 && ty <= 12) || (tx >= 27 && tx <= 34)) continue;
      let wallNear = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (tiles[at(tx + dx, ty + dy)] === T.WALL) wallNear = true;
      const x = px(tx) + rng.float(-8, 8), y = px(ty) + rng.float(-8, 8);
      if (wallNear || !clearOf(x, y) || tufts.some((q) => hyp(q.x - x, q.y - y) < 80)) continue;
      tufts.push({ x, y, graze: 0, eaten: false, big: rng.chance(0.3) });
    }
    return { W, H, tiles, rooms, spawns: [], props, start, tufts, exit: { x: px(45), y: px(22) }, exitTile: { x0: 45, y0: 22 },
      forkTile: null, entry: null, seed: 1, def: HEAVEN_LEVEL, hints: [], controls: [], cagePrompt: null, vault: null,
      windows: new Set(), plan: null, gates: [], sealedArenas: [], shop: null, grass: [],
      god: { x: px(15.5) + TILE / 2, y: 9 * TILE }, pool: start, edgeY: 20 * TILE };
  },

  // A death's card is clicked: up he goes. The floor he died on waits, exactly as a death leaves it
  // (`game.deaths` has counted it, the save has it); `leave` rebuilds it.
  // `opts.visit`: come up by CONTINUE, not by dying (`Game.resumeRun`), no death counted, nothing killed him.
  enter(game, opts) {
    if (!this.meta) this.load();
    game.calmFast = false;   // DOUBLE SPEED OUT OF A FIGHT is the floor's, never the pasture's
    // The rabbit's bargain and the husky's song are the floor's too: left tied, the first step up here
    // saw the rabbit missing and rebuilt `mods`, switching the souls' fire and the Q verbs back on.
    if (game.legsTied) { game.legsTied = null; game.applyBoons(); }
    game.song = null; game.shopDlg = null;
    const visit = !!(opts && opts.visit);
    const M = this.meta, L = this.level(), by = !visit && game.goat && game.goat.hurtBy;
    const kind = !by ? null : typeof by === 'string' ? by : (by.kind === 'bearer' && by.champion ? 'brute' : by.kind === 'bearer' && by.shieldman ? 'shield' : by.kind === 'bearer' && by.thrower ? 'thrower' : by.kind);
    M.visits++; if (!visit) M.deaths++;
    if (game.levelIndex !== undefined) this.reached(levelIndexOf(game.level && game.level.def) >= 0 ? levelIndexOf(game.level.def) : game.levelIndex);
    const floorName = (game.level && game.level.def && game.level.def.name) || '';
    const gate = game.checkpoint && game.checkpoint.level === game.levelIndex;
    game.heaven = { t: 0, killer: kind, floor: floorName, gate, talk: null, panel: null, jump: null, comb: null, plates: [],
      talked: false, tally: M.pending, tallyT: 0, notes: [], answerT: -1, mirrorButt: 0, near: null, rmbWas: true, godBlink: 2 };
    M.pending = 0;
    // A bell woken since the last visit (`bellsOpen` past `bellsSeen`) is shown waking `bellWake` s in.
    const open = this.bellsOpen(), seen = Math.max(1, M.bellsSeen || 1);
    if (open > seen) { game.heaven.wake = { at: TUNING.heaven.bellWake, from: seen, to: open }; }
    M.bellsSeen = open;
    // Every bell awake and the old man's tune never played: he goes to the beam a few seconds in.
    if (open >= TUNING.heaven.bells.length && !M.bellSong) game.heaven.songAt = TUNING.heaven.bellSong.after + (game.heaven.wake ? TUNING.heaven.bellWake + 1.5 : 0);
    game.level = L; game.world = new World(L);
    game.goat = new Goat(L.start.x, L.start.y); game.goat.facing = -Math.PI / 2; game.goat.invuln = 0;
    game.enemies = []; game.liveEnemies.length = 0; game.bullets = []; game.souls = []; game.globs = []; game.fallers = []; game.motes = []; game.revive = null;
    game.props = L.props.map((p) => { const o = new Prop(p.x, p.y, p.kind, p); o.heaven = !!p.heaven; if (p.menu) o.menu = p.menu;
      if (p.seat) o.seat = p.seat; if (p.note !== undefined) o.note = p.note; return o; });
    for (const p of game.props) if (p.kind === 'hseat' || p.kind === 'hshep' || p.kind === 'hmirror') p.r = TUNING.heaven.bodyR[p.kind];
    for (const p of game.props) if (p.kind === 'hbell') p.r = TUNING.heaven.bodyR.hbell;
    game.props.filter((p) => p.kind === 'table').forEach((p, i) => { p.food = (HEAVEN_FEAST[i] || []).map((f) => Object.assign({ turn: 0 }, f)); });
    // A table up here never goes over onto its side: it is there to be butted to the edge and off it.
    for (const p of game.props) if (p.kind === 'table') p.noFlip = true;
    game.heavenTables = 0;   // how many of them this visit has sent down (`Prop.fall`)
    game.hazards = []; game.sightBlockers = []; game.niches = []; game.runes = []; game.sealedRooms = []; game.soulGates = [];
    game.parts = []; game.floats = []; game.rings = []; game.puffs = []; game.flares = [];
    game.fx = new CombatFX(game); game.scatter = new Scatter(game); game.boom = { fly: null };
    game.guide = null; game.bless = null; game.intro = null; game.stairFx = null; game.dropIn = null; game.deathCam = null;
    game.hurt = null; game.hurtVignette = null; game.flashAmt = 0; game.shakeAmt = 0; game.kickX = game.kickY = 0; game.zoomKick = 0;
    game.hitstopTimer = 0; game.slowTimer = 0; game.timeScale = 1;
    // Up here BAAH is a goat's voice and nothing else, and the souls' fire and poison stay below.
    game.mods = Object.assign({}, game.mods, { breath: false, spit: false, screamStun: false, bomb: false, splash: false,
      venomRoll: false, rollStun: 0, leapfrog: null, boomerang: null, blink: null, effigy: null, venomHold: 0, brandHold: 0,
      headbuttRecovery: TUNING.heaven.buttRecovery, headbuttWindup: TUNING.heaven.buttWindup });
    game.goat.maxHp = game.goat.hp = game.mods.maxHp;
    game.cam.x = L.start.x; game.cam.y = L.start.y - 2 * TILE; game.cam.zoom = game.renderer.zoomFit;
    game.camLead.x = game.camLead.y = 0; game.camFollow = null; game.camTrack = null; game.camHold = undefined; game.camRoomMid = null; game.camFight = 0;
    game.card = null; game.state = 'heaven';
    game.audio.duck(1, 0.4); game.audio.heavenMusic = true; game.audio.sfxAscend();
    // The god's first line is over his head, not in your way: what he has to say at length waits for
    // GRAB, except the very first time, when he calls you over himself.
    game.heaven.plate = { text: this.greeting(game), life: TUNING.heaven.plate };
    // and again the visit his twenty are in, to send him to the mirror (5 Oct 2026: he mends it himself,
    // GRAB at the glass, `interact`; the god only tells him to)
    if (!M.told.intro || (this.mendReady() && !this.mended() && !M.told.mend)) game.heaven.callAt = TUNING.heaven.callAfter;
    this.seeNews(game);   // what this visit shows is no longer news to the next death card
    this.save();
    Renderer.heavenBake = null;
  },

  // Off the edge: the floor he died on, rebuilt (`Game.restartLevel`), and he drops into it.
  leave(game) {
    this.seeNews(game);   // a rank bought, a bell heard: what he saw up here is not news next time
    game.heaven = null; game.audio.heavenMusic = false;
    game.fromHeaven = true;
    game.restartLevel(true);
  },

  // The line over his head as you arrive, off what took the last heart.
  greeting(game) {
    const H = game.heaven, K = HEAVEN_TALK, M = this.meta;
    if (!M.told.intro) return 'COME HERE, LITTLE GOAT.';
    if (M.gift && this.mendReady() && !this.mended()) return M.told.mend ? 'MY MIRROR WAITS FOR YOU. GO AND MEND IT.' : 'YOU BROUGHT THEM. COME HERE.';
    if (H.killer === 'fall') return 'MIND THE EDGES. OH, WAIT.';
    return K.again[Math.floor(Math.random() * K.again.length)];
  },
  // What the god has to say this visit, most pressing first; `told` keeps a line from coming twice.
  pickTalk(game) {
    const H = game.heaven, M = this.meta, K = HEAVEN_TALK, told = M.told;
    const fresh = (key, list) => { const i = list.findIndex((l, j) => !told[key + j]); return i < 0 ? null : { key: key + i, lines: [list[i]] }; };
    if (!told.intro) return { key: 'intro', lines: K.intro };
    if (!M.gift) return { key: 'gift', lines: K.gift };
    if (this.mendReady() && !this.mended() && !told.mend) return { key: 'mend', lines: K.mend };
    if (this.questDone() && !told.quest0) return { key: 'quest0', lines: K.quest };
    if (M.sung && !told.song0) return { key: 'song0', lines: K.song };
    if (M.freshSeat) {
      const seat = HEAVEN_SEATS.find((s) => s.kind === M.freshSeat), t = { key: 'seat-' + M.freshSeat, lines: [K.saved[0].replace('{animal}', seat ? seat.name : 'AN ANIMAL')] };
      if (!told[t.key]) return t;
    }
    for (const n of Object.keys(K.deaths).map(Number).sort((a, b) => b - a)) if (M.deaths >= n && !told['deaths' + n]) return { key: 'deaths' + n, lines: K.deaths[n] };
    if (M.best > M.lastBest && M.best > 0) {
      const name = (LEVELS[M.best] && LEVELS[M.best].name) || 'THE NEXT FLOOR', list = K.further;
      return { key: 'further' + M.best, lines: [list[M.best % list.length].replace('{floor}', name)], best: M.best };
    }
    if (H.killer && K.killer[H.killer]) { const t = fresh('killer-' + H.killer + '-', K.killer[H.killer]); if (t) return t; }
    if (M.bought && !told.mirror0) return { key: 'mirror0', lines: K.mirror };
    if (M.combed && !told.combed0) return { key: 'combed0', lines: K.combed };
    const any = fresh('any', K.any); if (any) return any;
    return { key: null, lines: [K.any[Math.floor(Math.random() * K.any.length)]] };
  },

  // ---------------------------------------------------------------- the step
  update(game, dt) {
    const H = game.heaven, g = game.goat, inp = game.input, T0 = TUNING.heaven;
    H.t += dt; H.tallyT += dt;
    for (const p of H.plates) p.life -= dt;
    H.plates = H.plates.filter((p) => p.life > 0);
    if (H.plate) { H.plate.life -= dt; if (H.plate.life <= 0) H.plate = null; }
    H.godBlink -= dt; if (H.godBlink < -0.14) H.godBlink = 2 + Math.random() * 3;
    H.mirrorButt = Math.max(0, H.mirrorButt - dt);
    for (const p of game.props) if (p.kind === 'hbell') { p.swing = (p.swing || 0) * Math.exp(-T0.bellDamp * dt); p.ringT = Math.max(0, (p.ringT || 0) - dt); }
    // The god answers a BAAH with a BEH of his own.
    if (H.answerT >= 0 && (H.answerT -= dt) < 0) {
      H.plate = { text: HEAVEN_TALK.answer[Math.floor(Math.random() * HEAVEN_TALK.answer.length)], life: T0.plate * 0.6 };
      game.audio.sfxGodVoice(0.7);
    }
    if (H.talk) { this.updateTalk(game, dt); this.idle(game, dt); game.clearEdges(); return; }
    if (H.panel) { this.updatePanel(game, dt); this.idle(game, dt); game.clearEdges(); return; }
    if (H.jump) { this.updateJump(game, dt); return; }
    if (H.comb) { this.updateComb(game, dt); if (H.comb) { this.idle(game, dt); game.clearEdges(); return; } }
    H.holdT = Math.max(0, (H.holdT || 0) - dt);
    H.loiter = (H.loiter || 0) + dt;   // walking about with nothing open: the arrows' clock (`drawArrows`)
    this.updateWake(game, dt);
    this.updateSong(game, dt);
    const ox = g.x, oy = g.y;
    // The first time ever, the god calls him over and says the whole of it.
    if (H.callAt !== undefined && (H.callAt -= dt) <= 0) { H.callAt = undefined; this.talk(game); return; }
    // GRAB on something that answers it: the god, the shepherd, the mirror, a seat.
    const near = this.nearest(game); H.near = near;
    const press = inp.rmbDown && !H.rmbWas; H.rmbWas = inp.rmbDown;
    if (press && near && g.state === 'idle' && !g.holding) { inp.rmbDown = false; this.interact(game, near); game.clearEdges(); return; }
    if (inp.spacePressed && g.screamCd <= 0 && hyp(g.x - game.level.god.x, g.y - game.level.god.y) < T0.hearR * TILE) H.answerT = T0.answer;
    g.update(dt, game);
    // The horns on the god's own cloud: he has a word to say about it.
    if (g.state === 'recover' && g.lungeId !== H.lastLunge && hyp(g.x - game.level.god.x, g.y - game.level.god.y - TILE * 0.6) < TILE * 2) { H.lastLunge = g.lungeId; this.buttGod(game); }
    for (const p of game.props) p.update(dt, game);
    // A table sent sliding has been tried (its mark is `drawMarks`'): it goes off them all.
    if (this.fresh('table')) for (const p of game.props) if (p.kind === 'table' && hyp(p.vx || 0, p.vy || 0) > 20) this.tried('table');
    game.collideEntities(dt);
    game.updateEffects(dt);
    // The gold grass: stood in, still, it is eaten, for nothing but the taste of it.
    for (const q of game.level.tufts) {
      if (q.eaten) continue;
      const near = hyp(q.x - g.x, q.y - g.y) < T0.graze.r && hyp(g.vx, g.vy) < TUNING.prop.heal.grazeSpeed;
      q.graze = near ? q.graze + dt : Math.max(0, q.graze - dt * 2);
      if (q.graze < T0.graze.time) continue;
      q.eaten = true;
      game.particles(q.x, q.y - 6, 14, '#f7d774', 150); game.ring(q.x, q.y, 1.5 * TILE, '#fff4c2');
      game.floatText(q.x, q.y - 26, HEAVEN_TALK.munch[Math.floor(Math.random() * HEAVEN_TALK.munch.length)], '#fff4c2');
      game.audio.sfxBleat(320, 0.07, 0.4); game.audio.sfxChime(T0.bells[Math.floor(Math.random() * T0.bells.length)], 0.35);
    }
    // Not over the edge until he has looked in the mirror once: the god holds him back and says so.
    if (!g.dead && !this.mirrorKnown() && game.world.isPitPx(g.x, g.y + g.r)) this.holdEdge(game, ox, oy);
    // Over the edge.
    if (!g.dead && game.world.isPitPx(g.x, g.y)) { this.jump(game); return; }
    game.updateCamera(dt);
  },
  // Whether he has ever stood at the mirror (`meta.mirror`, set by `openMirror`; a rank bought before
  // the flag existed counts). Until then the edge is shut to him (`holdEdge`).
  // Broken, it holds nobody back: there is nothing yet to look at.
  mirrorKnown() { const M = this.meta; return !M || !this.mended() || M.mirror || M.bought > 0; },
  // The god will not let him go down yet: put back where he stood, a step off the lip, the god's
  // word over the screen and the mirror lit, so the way to it is plain. Said once a `holdGap`.
  holdEdge(game, ox, oy) {
    const H = game.heaven, g = game.goat, T0 = TUNING.heaven;
    g.x = ox; g.y = oy - 2; g.vx *= 0.2; g.vy = -Math.abs(g.vy) * 0.3;
    if (H.holdT > 0) return;
    H.holdT = T0.holdGap;
    // Said over the goat in the god's plate: the god himself is a room away, off the screen.
    const K = HEAVEN_TALK.notYet, n = H.holdN = (H.holdN || 0) + 1;
    H.plates.push({ x: g.x, y: g.y - 46, text: K[n === 1 ? 0 : Math.floor(Math.random() * K.length)], life: T0.plate, god: true });
    game.audio.sfxGodVoice(0.8);
    const m = game.props.find((p) => p.kind === 'hmirror');
    if (m) { game.ring(m.x, m.y, 2.2 * TILE, '#fff4c2'); game.particles(m.x, m.y - 30, 16, '#fff4c2', 140); }
  },
  // What runs under a talk, the mirror or the comb: the world breathes, the goat stands.
  idle(game, dt) { game.goat.vx *= 0.8; game.goat.vy *= 0.8; game.updateEffects(dt); game.updateCamera(dt); },

  nearest(game) {
    const g = game.goat, R = TUNING.heaven.talkR * TILE, L = game.level;
    let best = null, bd = R;
    const consider = (kind, x, y, thing) => { const d = hyp(g.x - x, g.y - y); if (d < bd) { bd = d; best = { kind, x, y, thing }; } };
    consider('god', L.god.x, L.god.y + TILE * 0.8);
    for (const p of game.props) {
      if (p.kind === 'hshep') { if (!game.heaven.song) consider('shepherd', p.x, p.y, p); }   // at the bells, he combs nobody
      else if (p.kind === 'hmirror') consider('mirror', p.x, p.y, p);
      else if (p.kind === 'hseat' && this.meta.saved[p.seat]) consider('seat', p.x, p.y, p);
    }
    return best;
  },
  interact(game, n) {
    const H = game.heaven;
    this.tried(n.kind === 'seat' ? 'seat:' + n.thing.seat : n.kind);
    if (n.kind === 'god') this.talk(game);
    else if (n.kind === 'shepherd') this.startComb(game, n.thing);
    // His twenty in, the goat mends it himself, at the glass (5 Oct 2026): GRAB, and it is whole.
    else if (n.kind === 'mirror' && !this.mended() && this.mendReady()) this.mend(game);
    else if (n.kind === 'mirror' && !this.mended()) {
      const B = HEAVEN_TALK.broken;
      H.plates.push({ x: n.x, y: n.y - 74, text: B[(H.brokenN = (H.brokenN || 0) + 1) === 1 ? 0 : Math.floor(Math.random() * B.length)], life: TUNING.heaven.plate });
      game.audio.sfxClatter('metal', 0.4);
    }
    else if (n.kind === 'mirror') this.openMirror(game);
    else if (n.kind === 'seat') {
      const s = HEAVEN_SEATS.find((q) => q.kind === n.thing.seat);
      if (s) {
        const times = (this.meta.savedN && this.meta.savedN[s.kind]) || 1, text = s.sound + ' ' + s.line + (times >= 2 ? ' ' + s.more : '');
        const lift = s.kind === 'horse' ? 76 : 46;
        H.plates.push({ x: n.x, y: n.y - lift, text, life: TUNING.heaven.plate * (times >= 2 ? 1.8 : 1.2) });
        game.audio.sfxAnimal(s.kind);
      }
    }
  },

  // The horns on something up here (`Prop.headbutt`).
  butt(game, p, ax, ay) {
    const H = game.heaven, g = game.goat, T0 = TUNING.heaven;
    if (!H) return;
    this.tried(p.kind === 'hbell' ? 'bells' : p.kind === 'hmirror' ? 'mirror' : p.kind === 'hshep' ? 'shepherd' : p.kind === 'hseat' ? 'seat:' + p.seat : p.kind);
    if (p.kind === 'hbell') {
      // One butt, one bell: the one nearest his nose, whichever others the horns reached.
      const nx = g.x + ax * 22, ny = g.y + ay * 22;
      let near = null, nd = Infinity;
      for (const b of game.props) if (b.kind === 'hbell') { const d = hyp(b.x - nx, b.y - ny); if (d < nd) { nd = d; near = b; } }
      if (near !== p) return;
      // A sleeping bell (the shepherd's quest, `bellsOpen`): a dull knock, it hardly moves, and the old
      // man says why (the first time, his whole quest).
      if (p.note >= this.bellsOpen()) {
        p.swing = (ax >= 0 ? 1 : -1) * T0.bellSwing * 0.15; game.audio.sfxClatter('metal', 0.35);
        const shep = game.props.find((q) => q.kind === 'hshep');
        if (shep && !this.meta.bellQuest) this.giveQuest(game, shep);
        else if (shep && H.t >= (H.asleepAt || 0)) { H.asleepAt = H.t + T0.shepBells.gap; H.plates.push({ x: shep.x, y: shep.y - 52, text: SHEPHERD_TALK.asleep[Math.floor(Math.random() * SHEPHERD_TALK.asleep.length)], life: T0.plate }); }
        return;
      }
      this.strike(game, p, ax >= 0 ? 1 : -1);
      // The goat's turn at the old man's tune: the butt is scored against the lights (`songHit`).
      if (H.song && H.song.phase === 'play') { this.songHit(game, p); return; }
      H.notes.push(p.note); if (H.notes.length > HEAVEN_SONG.length) H.notes.shift();
      // the blind old man hears it
      const SB = T0.shepBells, shep = game.props.find((q) => q.kind === 'hshep');
      H.rung = (H.rung || 0) + 1;
      if (shep && H.rung % SB.every === 0 && H.t >= (H.shepAt || 0) && Math.random() < SB.chance) {
        H.shepAt = H.t + SB.gap;
        H.plates.push({ x: shep.x, y: shep.y - 52, text: SHEPHERD_TALK.bells[Math.floor(Math.random() * SHEPHERD_TALK.bells.length)], life: T0.plate });
      }
      if (H.notes.join() === HEAVEN_SONG.join() && !H.sung) {
        H.sung = true; this.meta.sung = true; this.save();
        game.ring(p.x, p.y, 5 * TILE, PALETTE.fireHi); game.particles(p.x, p.y - 20, 30, '#fff4c2', 220);
        H.plate = { text: 'MARY HAD A LITTLE...? BEH!', life: T0.plate };
        game.audio.sfxGodVoice(1);
      }
      return;
    }
    if (p.kind === 'hmirror' && !this.mended()) {
      // Broken, there is nobody in it to butt back: the shards rattle in the frame.
      p.wobble = 0.3; game.audio.sfxClatter('metal', 0.7);
      game.floatText(p.x, p.y - 64, 'IT IS BROKEN ALREADY', PALETTE.bone);
      return;
    }
    if (p.kind === 'hmirror') {
      // Goats butt their own reflections. The one in the glass butts back, and is stronger.
      H.mirrorButt = T0.mirrorFlash;
      g.vx = -ax * T0.mirrorBack * TILE; g.vy = -ay * T0.mirrorBack * TILE; g.dazed = Math.max(g.dazed, T0.mirrorDaze);
      game.audio.sfxThud(); game.audio.sfxClatter('metal', 0.9); game.squashGoat(TUNING.juice.squash.hit);
      game.floatText(p.x, p.y - 64, ['THE OTHER GOAT WON', 'IT BUTTED BACK', 'HE IS STRONGER THAN YOU'][Math.floor(Math.random() * 3)], PALETTE.bone);
      return;
    }
    if (p.kind === 'hshep') {
      p.wobble = 0.3; game.audio.sfxThud();
      // Every bell awake and his tune played once: a butt asks for it again (`startSong`).
      if (H.song) return;
      if (this.bellsOpen() >= T0.bells.length && this.meta.bellSong) { this.startSong(game, true); return; }
      H.plates.push({ x: p.x, y: p.y - 52, text: SHEPHERD_TALK.butted[Math.floor(Math.random() * SHEPHERD_TALK.butted.length)], life: T0.plate });
      return;
    }
    p.wobble = 0.3; game.audio.sfxThud();
    if (p.kind === 'hseat' && this.meta.saved[p.seat]) game.audio.sfxAnimal(p.seat, true);
  },
  // The god's dais is stone to the horns: butting it gets a word from him.
  buttGod(game) {
    const H = game.heaven; if (!H || (H.buttedT || 0) > H.t) return;
    H.buttedT = H.t + 1.5; this.tried('god');
    H.plate = { text: HEAVEN_TALK.butted[Math.floor(Math.random() * HEAVEN_TALK.butted.length)], life: TUNING.heaven.plate };
    game.audio.sfxGodVoice(0.9);
  },

  // ---------------------------------------------------------------- talking
  talk(game) {
    const H = game.heaven, t = H.talked ? { key: null, lines: [HEAVEN_TALK.bye[Math.floor(Math.random() * HEAVEN_TALK.bye.length)]] } : this.pickTalk(game);
    H.talked = true; H.plate = null; this.tried('god');
    H.talk = { t: 0, lines: this.parts(t.lines), i: 0, shown: 0, key: t.key, best: t.best, out: 0 };
    game.goat.vx = game.goat.vy = 0; game.goat.state = 'idle';
    game.audio.sfxGodVoice(1); game.audio.sfxChime(TUNING.heaven.bells[4], 0.4);
  },
  updateTalk(game, dt) {
    const H = game.heaven, K = H.talk, inp = game.input, T0 = TUNING.heaven;
    K.t += dt;
    if (K.out > 0) { K.out += dt; if (K.out >= T0.talkOut) H.talk = null; return; }
    const line = K.lines[K.i];
    K.shown = Math.min(line.length, K.shown + dt * T0.type);
    const press = inp.lmbPressed || inp.spacePressed || inp.rollPressed || (inp.rmbDown && !H.rmbWas);
    H.rmbWas = inp.rmbDown;
    if (!press || K.t < T0.talkArm) return;
    if (K.shown < line.length) { K.shown = line.length; return; }
    if (K.i + 1 < K.lines.length) { K.i++; K.shown = 0; game.audio.sfxGodVoice(0.8); return; }
    // Said: never again (unless it is the last thing he has to say).
    const M = this.meta;
    if (K.key) M.told[K.key] = 1;
    if (K.best !== undefined) M.lastBest = K.best;
    if (K.key && K.key.startsWith('seat-')) M.freshSeat = null;
    if (K.key === 'intro' || K.key === 'gift') this.giveGift(game);
    this.save();
    K.out = 0.0001;
  },

  // ---------------------------------------------------------------- the comb
  startComb(game, p) {
    const H = game.heaven, g = game.goat, C = TUNING.heaven.comb;
    H.comb = { t: 0, p, said: 0 };
    g.state = 'idle'; g.vx = g.vy = 0;
    // stood at the old man's comb hand, turned away from him so the comb runs down his back
    H.comb.x = p.x - C.snap; H.comb.y = p.y + 6;
    // the first time, his quest before the comb: the bells (`bellsOpen`)
    if (!this.meta.bellQuest) this.giveQuest(game, p);
    else H.plates.push({ x: p.x, y: p.y - 52, text: SHEPHERD_TALK.hello[this.meta.combed ? 1 : 0], life: TUNING.heaven.plate });
  },
  giveQuest(game, p) {
    const H = game.heaven; this.meta.bellQuest = true; this.saveSoon();
    H.plates.push({ x: p.x, y: p.y - 52, text: SHEPHERD_TALK.quest, life: TUNING.heaven.plate * 2.2 });
  },
  updateComb(game, dt) {
    const H = game.heaven, K = H.comb, g = game.goat, C = TUNING.heaven.comb, inp = game.input;
    K.t += dt;
    // He walks up to the comb, then stands for it.
    const dx = K.x - g.x, dy = K.y - g.y, d = hyp(dx, dy);
    if (d > 3) { const s = Math.min(d, C.walk * dt); g.x += dx / d * s; g.y += dy / d * s; g.facing = Math.atan2(dy, dx); }
    else g.facing = Math.PI;
    // Any move, any verb, and he steps out from under it.
    if (K.t > 0.4 && (inp.mx || inp.my || inp.lmbPressed || inp.spacePressed || inp.rollPressed)) { this.endComb(game); return; }
    const k = Math.floor(K.t / C.stroke);
    if (k !== K.stroke && d <= 3) {
      K.stroke = k; game.audio.sfxComb();
      // a tuft of him in the air, and now and then a heart of it
      for (let i = 0; i < 3; i++) game.parts.push({ x: g.x + (Math.random() - 0.5) * 16, y: g.y - 12 - Math.random() * 10, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30,
        life: 0.6 + Math.random() * 0.5, color: Math.random() < 0.5 ? PALETTE.bone : '#ffffff', size: 2 });
      if (k % 3 === 2) H.plates.push({ x: g.x, y: g.y - 40, text: '♥', life: 0.9, heart: true, vy: -18 });
      if (k % 5 === 4) H.plates.push({ x: K.p.x, y: K.p.y - 52, text: SHEPHERD_TALK.comb[(K.said++ + this.meta.combed) % SHEPHERD_TALK.comb.length], life: TUNING.heaven.plate });
    }
    if (K.t >= C.time) this.endComb(game, true);
  },
  endComb(game, whole) {
    const H = game.heaven;
    if (whole) { this.meta.combed++; this.save(); game.audio.sfxBleat(330, 0.08, 0.5); game.floatText(game.goat.x, game.goat.y - 34, 'COMBED', '#fff4c2'); }
    H.comb = null;
  },

  // ---------------------------------------------------------------- the mirror
  openMirror(game) {
    const H = game.heaven;
    H.panel = { t: 0, i: 0, flash: -1, flashT: 0, rects: [] };
    if (!this.meta.mirror) { this.meta.mirror = true; this.save(); }   // the edge opens (`mirrorKnown`)
    game.goat.vx = game.goat.vy = 0;
    game.audio.sfxChime(TUNING.heaven.bells[0], 0.5); game.audio.sfxChime(TUNING.heaven.bells[3], 0.35, 0.12);
  },
  closeMirror(game) { if (game.heaven) game.heaven.panel = null; game.audio.sfxSwing(); },
  // A rank of `u` bought with sacrifices, if there are enough and there is a rank left.
  buy(game, i) {
    const H = game.heaven, P = H && H.panel, u = this.shelf()[i]; if (!P || !u) return;
    const r = this.rank(u.id), cost = u.costs[r];
    if (cost === undefined) { game.audio.sfxThud(); return; }
    const sc = this.soulCost(u, r);
    if (this.meta.sacrifices < cost || (this.meta.souls || 0) < sc) { P.shake = 0.35; P.shakeRow = i; game.audio.sfxThud(); return; }
    this.meta.sacrifices -= cost; this.meta.souls = (this.meta.souls || 0) - sc; this.meta.ranks[u.id] = r + 1; this.meta.bought++; this.save();
    P.flash = i; P.flashT = 0;
    game.audio.sfxChime(TUNING.heaven.bells[2]); game.audio.sfxChime(TUNING.heaven.bells[4], 0.6, 0.1); game.audio.sfxBell();
  },
  panelKey(game, code) {
    const P = game.heaven && game.heaven.panel; if (!P) return false;
    if (code === 'KeyW' || code === 'ArrowUp') { P.i = (P.i + this.shelf().length) % (this.shelf().length + 1); game.audio.sfxSwing(); }
    else if (code === 'KeyS' || code === 'ArrowDown') { P.i = (P.i + 1) % (this.shelf().length + 1); game.audio.sfxSwing(); }
    // a row is bought by holding the key (`startHold`, `updatePanel`); LOOK AWAY goes at once
    else if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter') { if (P.i >= this.shelf().length) this.closeMirror(game); else this.startHold(game, P.i, 'key'); }
    else if (code === 'Escape' || code === 'KeyE' || code === 'Backspace') this.closeMirror(game);
    return true;
  },
  panelAt(game, p) {
    const P = game.heaven && game.heaven.panel; if (!P) return -1;
    for (let i = 0; i < P.rects.length; i++) { const r = P.rects[i]; if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i; }
    return -1;
  },
  panelClick(game, p, right) {
    const P = game.heaven && game.heaven.panel; if (!P) return false;
    if (right || P.t < TUNING.heaven.panelArm || P.hold) { if (right) this.closeMirror(game); return true; }
    const i = this.panelAt(game, p);
    if (i < 0) return true;
    P.i = i;
    if (i >= this.shelf().length) this.closeMirror(game); else { P.ptrDown = true; this.startHold(game, i, 'ptr'); }
    return true;
  },

  // ---------------------------------------------------------------- the edge
  jump(game) {
    const H = game.heaven, g = game.goat, sp = hyp(g.vx, g.vy);
    H.jump = { t: 0, vx: sp > 20 ? g.vx / sp : 0, vy: sp > 20 ? g.vy / sp : 1, x0: g.x, y0: g.y, puffed: false };
    if (this.meta && !this.meta.jumped) { this.meta.jumped = true; this.saveSoon(); }   // the arrows are done (`drawArrows`)
    if (g.trail) g.trail.length = 0;   // the run's smear would hang at the lip while he falls away
    game.audio.sfxBleat(380, 0.1, 0.45);
  },
  // Off the edge (5 Oct 2026, "a prettier fall"): a crouch and a hop out over the drop with the cloud of
  // the lip kicked up behind him, then down and away, tumbling, shrinking toward the earth, shedding
  // motes of light, the white closing over him and a beat of it before the floor is built.
  updateJump(game, dt) {
    const H = game.heaven, J = H.jump, g = game.goat, T0 = TUNING.heaven.jump;
    J.t += dt;
    // on through the hop, then hardly drifting: he falls away from you, not across the screen
    const fwd = J.t < T0.hop ? 1 : 0.2;
    g.x += J.vx * T0.speed * fwd * dt; g.y += J.vy * T0.speed * fwd * dt; g.vx = g.vy = 0;
    if (!J.puffed && J.t >= T0.hop * T0.crouch) {
      J.puffed = true; game.audio.sfxLeap(); game.audio.sfxSwing();
      for (let i = 0; i < T0.puff; i++) {
        const a = Math.PI + (i / (T0.puff - 1)) * Math.PI, sp = 30 + Math.random() * 50;
        game.parts.push({ x: J.x0 + Math.cos(a) * 8, y: J.y0 - 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5 - 10, life: 0.5 + Math.random() * 0.4, color: i % 3 ? '#ffffff' : '#dfe9fb', size: 3 });
      }
    }
    if (J.t > T0.hop && Math.random() < dt * T0.motes) {
      const L = this.jumpLook(J.t);
      game.particles(g.x + (Math.random() - 0.5) * 12 * L.s, g.y + L.dy / TILT - 10 * L.s, 1, Math.random() < 0.5 ? '#fff4c2' : '#ffffff', 30);
    }
    game.updateEffects(dt);
    if (J.t >= T0.time + T0.beat) this.leave(game);
  },
  // How he is drawn off the edge, `t` s into it (`goatLook`): crouched, up in a hop, then falling away.
  jumpLook(t) {
    const J = TUNING.heaven.jump;
    if (t < J.hop) {
      const u = t / J.hop;
      if (u < J.crouch) { const c = Math.sin(u / J.crouch * Math.PI); return { dy: 0, s: 1, a: 1, spin: 0, sy: 1 - 0.2 * c }; }
      const v = (u - J.crouch) / (1 - J.crouch);
      return { dy: -Math.sin(v * Math.PI * 0.85) * J.hopH, s: 1, a: 1, spin: -0.3 * v, sy: 1 + 0.14 * Math.sin(v * Math.PI) };
    }
    const f = clamp((t - J.hop) / (J.time - J.hop), 0, 1), up = -Math.sin(0.85 * Math.PI) * J.hopH;
    return { dy: up + (J.fall - up) * f * f, s: 1 - (1 - J.small) * (1 - (1 - f) * (1 - f)), a: 1 - f * f * f,
      spin: -0.3 + f * J.turns * Math.PI * 2, sx: this.flip(f * J.flips) };
  },
  // How the goat is drawn through heaven's own moments (`PaintedArt.drawGoat`): arriving out of the
  // light, going over the edge, coming down onto the floor he was sent back to.
  goatLook(game) {
    const H = game.heaven;
    if (H) {
      const T0 = TUNING.heaven;
      if (H.jump) return this.jumpLook(H.jump.t);
      if (H.t < T0.arrive.rise) { const k = clamp(H.t / T0.arrive.rise, 0, 1), e = 1 - Math.pow(1 - k, 3); return { dy: -(1 - e) * 26, s: 0.4 + 0.6 * e, a: e, spin: 0 }; }
      return null;
    }
    const D = game.dropIn, P = TUNING.heaven.drop; if (!D) return null;
    if (D.t < 0) return { dy: -P.height, s: 0.65, a: 0, spin: 0 };   // not yet: still up there
    // Getting up: the stunned pose's lean (0.9 rad, `PaintedArt.drawGoat`) comes off him, with a wobble.
    if (D.up !== undefined) { const u = clamp(D.up / P.getup, 0, 1); return { dy: -Math.sin(u * Math.PI) * 5, s: 1, a: 1, spin: 0.9 * (1 - u) * (1 - u) + Math.sin(u * Math.PI * 3) * 0.12 * (1 - u) }; }
    if (D.ko !== undefined) return null;   // on his side: the stunned pose is the drawing
    // Falling: a steady tumble that comes round to land him on his side, where the stunned pose lies.
    // The last of the fall stretches him long down the line he drops on (`drop.stretch`), the way a
    // thing going fast looks, and the landing's squash answers it.
    const k = clamp(D.t, 0, 1), st = 1 + P.stretch * k * k * k;
    return { dy: -(1 - k * k) * P.height, s: 1 - 0.35 * (1 - k), a: 0.4 + 0.6 * k, spin: 0.9 - (1 - k) * P.turns * Math.PI * 2,
      sx: this.flip((1 - k) * P.flips), sy: st };
  },
  // His shadow coming down (`PaintedArt.drawGoat`): nothing while he is still up there, then a dot
  // that grows to his size as he nears the floor, so the eye has the landing before he does. 1 otherwise.
  dropShadow(game) {
    // off the edge: it shrinks under the hop and is gone a moment into the fall (nothing under him)
    const HJ = game.heaven && game.heaven.jump;
    if (HJ) { const J = TUNING.heaven.jump; return HJ.t < J.hop ? 1 - 0.35 * Math.sin(HJ.t / J.hop * Math.PI) : clamp(1 - (HJ.t - J.hop) / 0.25, 0, 1); }
    const D = game.dropIn; if (!D || D.ko !== undefined || D.up !== undefined) return 1;
    if (D.t < 0) return 0;
    const k = clamp(D.t, 0, 1); return 0.25 + 0.75 * k * k;
  },
  // The shaft of light he comes down in (`drop.shaft`), in his own frame at his feet, under him: two
  // hard-edged columns, faint and wide round a brighter core, that thin as he falls and go out over
  // `shaft.fade` s once he is down. Light is the one smooth thing; these are its plain rectangles.
  drawShaft(ctx, game) {
    const D = game.dropIn, P = TUNING.heaven.drop, S = P.shaft; if (!D || D.t < 0) return;
    const after = D.ko !== undefined ? D.ko : 0, a = D.ko !== undefined ? clamp(1 - after / S.fade, 0, 1) : 1;
    if (a <= 0 || D.up !== undefined) return;
    const k = clamp(D.t, 0, 1), top = P.height + S.over, w = S.w * (1 - 0.35 * k);
    ctx.save();
    ctx.fillStyle = S.color; ctx.globalAlpha *= S.alpha * a * (0.6 + 0.4 * (1 - k));
    ctx.fillRect(-w, -top, w * 2, top); ctx.globalAlpha *= 1.6; ctx.fillRect(-w * 0.45, -top, w * 0.9, top);
    // a pool of it on the floor where he lands
    ctx.globalAlpha = Math.min(1, ctx.globalAlpha); ctx.fillRect(-w * 1.3, -3, w * 2.6, 6);
    ctx.restore();
  },
  // A line with `|` in it is several plates, said one after another (tools/god-talk.html cuts them).
  parts(list) { return list.flatMap((l) => String(l).split('|').map((p) => p.trim()).filter(Boolean)); },
  // A body rolling over on its long axis, seen from above: `n` rolls in, how wide it looks (1 flat,
  // thinner edge-on, never a line).
  flip(n) { return 0.35 + 0.65 * Math.abs(Math.cos(n * Math.PI)); },
  // A floor entered from above: he falls into it out of the light, and lands.
  updateDrop(game, dt) {
    const D = game.dropIn; if (!D) return;
    const P = TUNING.heaven.drop, g = game.goat;
    // Down: he lies where he fell for `ko` s, a real stun, no verbs, then gets up.
    if (D.up !== undefined) { D.up += dt; if (D.up >= P.getup) game.dropIn = null; return; }
    if (D.ko !== undefined) {
      D.ko += dt;
      if (g.state !== 'stunned') { D.up = 0; game.squashGoat(TUNING.juice.squash.land); game.audio.sfxBleat(420, 0.08, 0.35); }
      return;
    }
    const was = D.t;
    D.t += dt / P.time;
    // motes of the light shed off him on the way down, rising where he has been
    if (D.t > 0 && Math.random() < dt * P.motes) {
      const k = clamp(D.t, 0, 1);
      game.particles(g.x + (Math.random() - 0.5) * 18, g.y - (1 - k * k) * P.height / TILT, 1, P.shaft.color, 40);
    }
    if (was < 0 && D.t >= 0) game.audio.sfxLeap();
    if (D.t >= 1) {
      D.ko = 0;
      g.state = 'stunned'; g.timer = P.ko; g.vx = g.vy = 0;
      game.dust(g.x, g.y, TUNING.juice.dust.land + 4, 0, 0); game.squashGoat(TUNING.juice.squash.land * 2.2);
      // the light hits the floor with him: a ring out from where he landed and its motes thrown up
      game.ring(g.x, g.y, P.ring, P.shaft.color, 0.5, 3);
      game.particles(g.x, g.y, P.burst, P.shaft.color, 170);
      game.audio.sfxThud(); game.thud(g.x, g.y, 6); game.hitstop(0.05);
    }
  },
};

// ================================================================ the picture
// Everything up here is baked once into pixels `K` world px across (chunkier than the units, the way
// a cloud is a big soft shape): the islands (cloud floor, banks, the lip over the drop), the sea of
// cloud below them and the earth a long way under the drop. What moves, light, motes, the god, the
// bells, the goat, is drawn over them every frame. Light is the one smooth thing, as below.
const HEAVEN_ART = {
  K: 2,
  // the floor he walks on: warm white, the faintest wisps, blue where a bank's foot shades it
  floor: ['#f4f1ea', '#ece9e1', '#e2e2e8', '#d2d8e8', '#bfcae4'],
  // a billow of cloud: lit crescent, body, shade, deep shade, and its soft outline
  puff: ['#ffffff', '#f2f6fd', '#d8e2f4', '#b9c9e8', '#8fa4d4'],
  // the far clouds drifting in the sky under the islands, paler and bluer, as far things are
  far: ['#f7faff', '#e4edfa', '#cfdcf2', '#bdcdeb', '#a9bde2'],
  // the sky, top of the picture to its foot
  sky: ['#5f9fe6', '#6eaaea', '#7eb5ee', '#8ec0f1', '#9ecaf4', '#b0d4f6'],
  gold: ['#fff6d2', '#ffe9a0', '#f7d774', '#e0ac3e'],
};

Object.assign(Heaven, {
  // Value noise that repeats every `p` lattice cells, so a sheet tiles without a seam.
  pnoise(x, y, p, s) {
    const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
    const H = (i, j) => CombatFX.hash(((i % p) + p) % p, ((j % p) + p) % p, s);
    const h00 = H(xi, yi), h10 = H(xi + 1, yi), h01 = H(xi, yi + 1), h11 = H(xi + 1, yi + 1);
    return h00 + (h10 - h00) * a + (h01 - h00) * b + (h00 - h10 - h01 + h11) * a * b;
  },
  // Chamfer distance (1, √2) from every cell where `seed` is true, capped at `cap`.
  distance(w, h, seed, cap) {
    const d = new Float32Array(w * h).fill(cap), D = Math.SQRT2;
    for (let i = 0; i < w * h; i++) if (seed(i)) d[i] = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) { v = Math.min(v, d[i - w] + 1); if (x > 0) v = Math.min(v, d[i - w - 1] + D); if (x < w - 1) v = Math.min(v, d[i - w + 1] + D); }
      d[i] = v;
    }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x; let v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < h - 1) { v = Math.min(v, d[i + w] + 1); if (x < w - 1) v = Math.min(v, d[i + w + 1] + D); if (x > 0) v = Math.min(v, d[i + w - 1] + D); }
      d[i] = v;
    }
    return d;
  },
  hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; },
  // One billow into an RGBA buffer: a disc of cells lit from the upper left, a bright crescent, the
  // body, shade toward the lower right, a soft outline on the rim away from the light. `dark` steps
  // it one shade down (a billow lower down the bank). Laid back to front, they stack into a cloud.
  puffInto(px, w, h, p, pal, dark) {
    const bayer = CombatFX.bayer, cols = pal.map((c) => this.hex(c)), r = p.r;
    for (let y = Math.floor(p.y - r); y <= Math.ceil(p.y + r); y++) {
      if (y < 0 || y >= h) continue;
      for (let x = Math.floor(p.x - r); x <= Math.ceil(p.x + r); x++) {
        if (x < 0 || x >= w) continue;
        const dx = (x + 0.5 - p.x) / r, dy = (y + 0.5 - p.y) / r, d = dx * dx + dy * dy;
        if (d > 1) continue;
        const lit = -(dx * 0.55 + dy * 0.83) + (bayer(x, y) - 0.5) * 0.16;
        let k = lit > 0.45 ? 0 : lit > -0.2 ? 1 : lit > -0.58 ? 2 : 3;
        if (dark) k = k === 0 ? 1 : Math.min(3, k + 1);
        const c = cols[k], i = (y * w + x) * 4;
        px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
      }
    }
  },

  // The islands: the floor of cloud he walks on, and round every edge of it billows of cloud, half
  // over the floor and half out, with a lower ring beyond them; small ones hanging over the drop;
  // the rim of cloud round the hole the drop is; and the god's cloud, a heap of the biggest.
  bakeIsland(L) {
    const A = HEAVEN_ART, K = A.K, n = TILE / K, w = L.W * n, h = L.H * n, bayer = CombatFX.bayer;
    const kind = new Uint8Array(w * h);   // 0 stone, 1 floor, 2 drop
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = L.tiles[Math.floor(y / n) * L.W + Math.floor(x / n)];
      kind[y * w + x] = t === T.PIT ? 2 : t === T.WALL ? 0 : 1;
    }
    const dEdge = this.distance(w, h, (i) => kind[i] !== 1, 12);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), img = g.createImageData(w, h), px = img.data;
    const cache = {}, put = (i, col) => { const v = cache[col] || (cache[col] = this.hex(col)); px[i * 4] = v[0]; px[i * 4 + 1] = v[1]; px[i * 4 + 2] = v[2]; px[i * 4 + 3] = 255; };
    const noise = (x, y, f, s) => CombatFX.noise(x * f, y * f, s);
    const S = { x0: 13 * n, x1: 19 * n, y0: 9 * n, y1: 12 * n };   // the god's steps
    // The floor's wisps are broad: their noise is read once for each two-by-two of cells.
    const hw2 = (w >> 1) + 1, wisp = new Float32Array(hw2 * ((h >> 1) + 1)).fill(-1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (kind[i] !== 1) continue;
      const q = (y >> 1) * hw2 + (x >> 1);
      if (wisp[q] < 0) wisp[q] = noise(x, y, 0.018, 1) * 0.65 + noise(x, y, 0.06, 2) * 0.35;
      const b = bayer(x, y), nn = wisp[q];
      let lv = nn > 0.6 + b * 0.05 ? 0 : nn > 0.24 + b * 0.04 ? 1 : 2;
      if (dEdge[i] < 3) lv = 4; else if (dEdge[i] < 6 + b * 3) lv = 3;
      let col = A.floor[lv];
      // the steps: a slab each, a gold edge to its nose, its riser in the blue of the shade
      if (x >= S.x0 && x < S.x1 && y >= S.y0 && y < S.y1) { const st = (y - S.y0) % n; col = st === 0 ? '#f0cf7a' : st < 3 ? '#ffffff' : st > n - 2 ? '#b8c3de' : st > n - 6 ? '#d6dcea' : (x * 3 + y) % 13 === 0 ? '#fff4d0' : '#fbfaf7'; }
      put(i, col);
    }
    // The billows. The edge is sampled a few cells apart (`step`, one billow a cell a side) so they
    // overlap without piling up. Plain index sums, not closures: this walks half a million cells.
    const puffs = [], step = 5, cw = Math.ceil(w / step), taken = new Uint8Array(cw * Math.ceil(h / step) * 2);
    const DX = [1, -1, 0, 0, 1, -1, 1, -1], DY = [0, 0, 1, -1, 1, 1, -1, -1];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x, k = kind[i];
      if (k === 2) continue;
      // Quick reject: a cell with only its own kind round it is no edge.
      const kl = kind[i - 1], kr = kind[i + 1], ku = kind[i - w], kd = kind[i + w];
      if (k === 1 ? kl === 1 && kr === 1 && ku === 1 && kd === 1 && kind[i - w - 1] === 1 && kind[i - w + 1] === 1 && kind[i + w - 1] === 1 && kind[i + w + 1] === 1
        : kl !== 2 && kr !== 2 && ku !== 2 && kd !== 2) continue;
      const slot = ((Math.floor(y / step) * cw + Math.floor(x / step)) << 1) | k;
      if (taken[slot]) continue;
      let wx = 0, wy = 0, wn = 0, qx = 0, qy = 0, qn = 0;
      for (let d = 0; d < 8; d++) { const o = kind[i + DY[d] * w + DX[d]]; if (o === 0) { wx += DX[d]; wy += DY[d]; wn++; } else if (o === 2) { qx += DX[d]; qy += DY[d]; qn++; } }
      const hs = CombatFX.hash(x, y, 5);
      if (k === 1) {
        if (!wn && !qn) continue;
        taken[slot] = 1;
        const ax = wn ? wx : qx, ay = wn ? wy : qy, l = hyp(ax, ay) || 1, nx = ax / l, ny = ay / l;
        if (wn) {
          const r = 7 + 8 * noise(x, y, 0.09, 3) + 3 * hs, r2 = r * (1.05 + 0.4 * hs);
          puffs.push({ x: x + nx * (r + r2 * 0.55), y: y + ny * (r + r2 * 0.55), r: r2, dark: true });
          puffs.push({ x: x + nx * r * 0.4, y: y + ny * r * 0.4, r });
        } else puffs.push({ x: x + nx * 2, y: y + ny * 2, r: 3 + 4 * noise(x, y, 0.15, 4) + 2 * hs, lip: true });
      } else {
        // stone next to the drop: the rim of the hole in the clouds
        if (!qn) continue;
        taken[slot] = 1;
        const l = hyp(qx, qy) || 1;
        puffs.push({ x: x + qx / l * 2, y: y + qy / l * 2, r: 5 + 6 * noise(x, y, 0.1, 6) + 2 * hs, dark: true });
      }
    }
    // the god's cloud, and small billows either side of his steps
    const rng = new RNG(31);
    for (let k = 0; k < 26; k++) puffs.push({ x: rng.float(12.2, 19.8) * n, y: rng.float(6.2, 8.9) * n, r: rng.float(10, 19), god: true });
    for (let y = S.y0 + 4; y < S.y1; y += 7) for (const x of [S.x0 - 5, S.x1 + 5]) puffs.push({ x: x + rng.float(-2, 2), y, r: rng.float(6, 9) });
    puffs.sort((a, b) => (a.y + (a.dark ? -6 : 0)) - (b.y + (b.dark ? -6 : 0)));
    for (const p of puffs) this.puffInto(px, w, h, p, A.puff, p.dark);
    this.outlineInto(px, w, h, this.hex(A.puff[4]));
    g.putImageData(img, 0, 0);
    return { canvas: c, K };
  },
  // A soft outline round the whole of what is drawn, never inside it: every clear cell touching a
  // drawn one. Round each billow it drew stray arcs inside the cloud where one sat behind another.
  outlineInto(px, w, h, col) {
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3]) continue;
      if ((x > 0 && px[(y * w + x - 1) * 4 + 3]) || (x < w - 1 && px[(y * w + x + 1) * 4 + 3]) || (y > 0 && px[((y - 1) * w + x) * 4 + 3]) || (y < h - 1 && px[((y + 1) * w + x) * 4 + 3])) add.push(y * w + x);
    }
    for (const i of add) { px[i * 4] = col[0]; px[i * 4 + 1] = col[1]; px[i * 4 + 2] = col[2]; px[i * 4 + 3] = 255; }
  },

  // The sky under the islands: far clouds drifting on it, a sheet that tiles, drawn slower than the
  // floor (`seaDepth`) over the sky's own bands (`drawSky`), so they read as a long way below.
  bakeSea() {
    const A = HEAVEN_ART, N = 256, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), img = g.createImageData(N, N), px = img.data, rng = new RNG(9), puffs = [];
    for (let k = 0; k < 6; k++) {
      const cx = rng.float(0, N), cy = rng.float(0, N), m = rng.int(5, 9), R = rng.float(11, 20);
      for (let j = 0; j < m; j++) puffs.push({ x: cx + rng.float(-R * 1.7, R * 1.7), y: cy + rng.float(-R * 0.45, R * 0.45), r: rng.float(R * 0.45, R) });
    }
    puffs.sort((a, b) => a.y - b.y);
    for (const p of puffs) for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) this.puffInto(px, N, N, { x: p.x + ox, y: p.y + oy, r: p.r }, A.far);
    g.putImageData(img, 0, 0);
    return c;
  },
  // A few small clouds of their own, for passing over the drop between him and the ground.
  bakeWisps() {
    const A = HEAVEN_ART, rng = new RNG(13), out = [];
    for (let k = 0; k < 3; k++) {
      const W = 64 + k * 14, Hh = 26, c = document.createElement('canvas'); c.width = W; c.height = Hh;
      const g = c.getContext('2d'), img = g.createImageData(W, Hh), px = img.data, puffs = [];
      for (let j = 0; j < 5 + k; j++) puffs.push({ x: rng.float(12, W - 12), y: rng.float(10, Hh - 8), r: rng.float(6, 11) });
      puffs.sort((a, b) => a.y - b.y);
      for (const p of puffs) this.puffInto(px, W, Hh, p, A.far);
      g.putImageData(img, 0, 0); out.push(c);
    }
    return out;
  },
  // The sky's bands, dithered one into the next: a column that is stretched over the picture.
  bakeSky() {
    const A = HEAVEN_ART, W = 4, H = 96, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), img = g.createImageData(W, H), px = img.data, cols = A.sky.map((s) => this.hex(s));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = y / (H - 1) * (cols.length - 1) + (CombatFX.bayer(x, y) - 0.5) * 0.9, col = cols[clamp(Math.round(v), 0, cols.length - 1)], i = (y * W + x) * 4;
      px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  },
});

Object.assign(Heaven, {
  // The earth, a long way down: fields and hedges, a river with the broken bridge the truck went off
  // (the prologue's), a road to the compound, and the compound itself, dark roofs round a yard with
  // the altar with the ewe bound on it and the empty pen. Hazed toward the sky, as far things are. The
  // torches and the rite round the altar, men, candles, fire, their light, are drawn over it live
  // (`drawEarth`, `drawRite`).
  bakeEarth() {
    const W = 820, H = 560, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), img = g.createImageData(W, H), px = img.data, rng = new RNG(77);
    const cache = {}, hx = (col) => cache[col] || (cache[col] = this.hex(col));
    const set = (x, y, col) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const v = hx(col), i = (y * W + x) * 4; px[i] = v[0]; px[i + 1] = v[1]; px[i + 2] = v[2]; px[i + 3] = 255; };
    const rect = (x, y, w, h, col) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, col); };
    const noise = (x, y, f, s) => CombatFX.noise(x * f, y * f, s);
    // Fields: the nearest of a scatter of seeds, each a crop of its own colour with furrows at its
    // own angle, hedged where two meet; woods where the noise says so.
    const CROPS = [['#7f9a4c', '#72894a'], ['#8fa65a', '#83984f'], ['#a8a95f', '#9a9a55'], ['#6f8a48', '#647d41'], ['#b3a76a', '#a4985e'], ['#879c50', '#7a8e48'], ['#9aa65c', '#8c984f']];
    const G = 40, seeds = [];
    // A grid of seeds, `cols` to a row (see the owner pass), each jittered inside its own cell.
    for (let gy = -1; gy <= Math.ceil(H / (G * 0.8)) + 1; gy++) for (let gx = -1; gx < Math.floor(W / G) + 2; gx++) {
      const a = rng.float(0, Math.PI);
      seeds.push({ x: (gx + rng.float(0.1, 0.9)) * G, y: (gy + rng.float(0.1, 0.9)) * G * 0.8, c: CROPS[rng.int(0, CROPS.length - 1)], cos: Math.cos(a), sin: Math.sin(a) });
    }
    // Which seed owns each two-by-two of cells (a field's edge a cell either way is no loss far down).
    const cols = Math.floor(W / G) + 3, OW = W >> 1, OH = H >> 1, owner = new Int32Array(OW * OH);
    for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
      const X = x * 2 + 1, Y = y * 2 + 1, gx = Math.floor(X / G) + 1, gy = Math.floor(Y / (G * 0.8)) + 1;
      let best = 0, bd = 1e12;
      for (let j = gy - 2; j <= gy + 2; j++) for (let i = gx - 2; i <= gx + 2; i++) {
        if (i < 0 || i >= cols) continue;
        const s = seeds[j * cols + i]; if (!s) continue;
        const dx = s.x - X, dy = s.y - Y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = j * cols + i; }
      }
      owner[y * OW + x] = best;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const s = seeds[owner[Math.min(OH - 1, y >> 1) * OW + Math.min(OW - 1, x >> 1)]] || seeds[0];
      const v = hx(s.c[Math.floor((x * s.cos + y * s.sin) / 2) & 1]), i = (y * W + x) * 4;
      px[i] = v[0]; px[i + 1] = v[1]; px[i + 2] = v[2]; px[i + 3] = 255;
    }
    for (let y = 1; y < OH - 1; y++) for (let x = 1; x < OW - 1; x++) {
      const o = owner[y * OW + x];
      if (o !== owner[y * OW + x + 1] || o !== owner[(y + 1) * OW + x]) { rect(x * 2, y * 2, 2, 2, '#4a6436'); if (CombatFX.hash(x, y, 3) < 0.1) { rect(x * 2 - 1, y * 2 - 1, 3, 3, '#3b5530'); set(x * 2 - 1, y * 2 - 1, '#5d7d45'); } }
    }
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      if (noise(x, y, 0.012, 8) < 0.72) continue;
      rect(x, y, 2, 2, (x + y) % 4 ? '#3c5832' : '#4b6a3c');
      if (CombatFX.hash(x, y, 9) < 0.18) { rect(x - 1, y - 2, 3, 3, '#2f4a2a'); set(x, y - 2, '#5f8048'); }
    }
    // The river, across the top third, and the road from its broken bridge down to the compound gate.
    const rY = (x) => 150 + Math.sin(x / 70) * 24 + Math.sin(x / 27) * 7;
    for (let x = 0; x < W; x++) { const y = rY(x); for (let k = -8; k <= 8; k++) set(x, y + k, Math.abs(k) > 6 ? '#5f6d3f' : Math.abs(k) > 5 ? '#3f6aa0' : (x * 5 + k * 3) % 23 === 0 ? '#9cc6ee' : '#4f7fb8'); }
    const cx = 410, cy = 360, bx = 300, by = rY(bx);
    for (let y = Math.round(by) + 8; y < cy - 64; y++) { const x = bx + (cx - bx) * ((y - by) / (cy - 64 - by)) + Math.sin(y / 18) * 4; rect(x - 3, y, 7, 1, '#a18a66'); set(x - 3, y, '#8a7556'); }
    for (let x = 0; x < bx - 20; x++) rect(x, 60 + Math.sin(x / 50) * 8, 1, 6, '#a18a66');
    rect(bx - 8, by - 16, 16, 9, '#8a847c'); rect(bx - 8, by + 7, 16, 9, '#8a847c'); rect(bx - 8, by - 16, 16, 1, '#b8b2a8'); rect(bx - 8, by + 7, 16, 1, '#b8b2a8');
    rect(bx - 16, by - 3, 12, 6, '#7a3a2a'); rect(bx - 15, by - 3, 10, 1, '#b0654a'); rect(bx - 17, by + 1, 3, 3, '#1a1016'); rect(bx - 6, by + 1, 3, 3, '#1a1016');
    // The compound: a curtain wall with a tower at each corner, pitched roofs round a yard.
    const ow = 200, oh = 128, x0 = cx - ow / 2, y0 = cy - oh / 2;
    rect(x0 - 3, y0 - 3, ow + 6, oh + 6, '#2c2430'); rect(x0, y0, ow, oh, '#554a58');
    for (let x = x0; x < x0 + ow; x += 4) rect(x, y0 - 3, 2, 2, '#6f6272');
    for (const [tx, ty] of [[x0 - 6, y0 - 6], [x0 + ow - 8, y0 - 6], [x0 - 6, y0 + oh - 8], [x0 + ow - 8, y0 + oh - 8]]) { rect(tx, ty, 14, 14, '#3a3140'); rect(tx + 1, ty + 1, 12, 5, '#6a5e70'); rect(tx + 1, ty + 6, 12, 7, '#4a4050'); }
    const roof = (x, y, w, h, ridgeAcross) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const half = ridgeAcross ? (i < w / 2) : (j < h / 2);
        set(x + i, y + j, (ridgeAcross ? i : j) % 3 === 0 ? (half ? '#5a4c60' : '#3c3244') : half ? '#6a5a70' : '#463b4e');
      }
      if (ridgeAcross) rect(x + Math.floor(w / 2), y, 1, h, '#8a7a90'); else rect(x, y + Math.floor(h / 2), w, 1, '#8a7a90');
    };
    for (const [x, y, w, h, a] of [[4, 4, 70, 34, false], [78, 4, 56, 28, true], [138, 4, 58, 40, false], [4, 42, 42, 80, true], [150, 48, 46, 76, true], [50, 96, 96, 28, false]]) roof(x0 + x, y0 + y, w, h, a);
    const yard = { x: x0 + 52, y: y0 + 38, w: 94, h: 54 };
    rect(yard.x, yard.y, yard.w, yard.h, '#857364');
    for (let k = 0; k < 90; k++) set(yard.x + rng.int(0, yard.w - 1), yard.y + rng.int(0, yard.h - 1), '#77665a');
    // The rite (`TUNING.heaven.ritual`): left of the pen, the path the men wear walking round, the red
    // ring the candles stand on, a scorch where the fire burns at the altar's foot, the yard gone to
    // dusk so the light reads, and on it the altar with her bound on it. Only what stands still is
    // baked; the men, the flames and their light are `drawRite`'s.
    const Q = TUNING.heaven.ritual, rc = { x: yard.x + Q.at[0], y: yard.y + Q.at[1] }, bay = CombatFX.bayer;
    for (let k = 0; k < 900; k++) { const a = k / 450 * Math.PI; for (const w of [-0.5, 0.5]) set(rc.x + Math.cos(a) * (Q.ring[0] + w), rc.y + Math.sin(a) * (Q.ring[1] + w * 0.7), '#6a5a50'); }
    for (let k = 0; k < 600; k++) { const a = k / 300 * Math.PI; set(rc.x + Math.cos(a) * Q.candleRing[0], rc.y + Math.sin(a) * Q.candleRing[1], '#8a2a22'); }
    const fire = { x: rc.x, y: rc.y + Q.fireAt };
    for (let y = -3; y <= 3; y++) for (let x = -5; x <= 5; x++) { const d = (x / 5.5) ** 2 + (y / 3.2) ** 2; if (d < 1 && bay(x + 8, y + 8) < 1.3 - d) set(fire.x + x, fire.y + y, d < 0.45 && bay(x, y) < 0.3 ? '#6a605a' : '#2e2426'); }
    { const d = hx('#241c2c'); for (let y = yard.y; y < yard.y + yard.h; y++) for (let x = yard.x; x < yard.x + yard.w; x++) { const i = (y * W + x) * 4; for (let c = 0; c < 3; c++) px[i + c] += (d[c] - px[i + c]) * Q.dusk; } }
    rect(fire.x - 3, fire.y, 7, 1, '#3a2618'); set(fire.x - 2, fire.y - 1, '#4a3020'); set(fire.x + 2, fire.y - 1, '#4a3020');   // the logs
    // The altar: a slab, its top and its face (the yard is seen from above and a little to the south,
    // as the floors are), outlined; a red cloth down the middle of the face.
    const ax0 = rc.x - 6, ay0 = rc.y - 3;
    rect(ax0 - 1, ay0 - 1, 15, 9, '#1c1620'); rect(ax0, ay0, 13, 4, '#6a625c'); rect(ax0, ay0, 13, 1, '#827a72');
    rect(ax0, ay0 + 4, 13, 3, '#443e3c'); rect(ax0, ay0 + 6, 13, 1, '#332e2e'); for (const j of [3, 9]) set(ax0 + j, ay0 + 5, '#383232');
    rect(rc.x - 2, ay0 + 3, 5, 4, '#7e2420'); rect(rc.x - 2, ay0 + 3, 5, 1, '#9c3028'); for (const j of [-2, 0, 2]) set(rc.x + j, ay0 + 7, '#5a1a18');
    // Her, on it, on her side and bound: the one pale thing down there, head to the left.
    const EWE = ['..WWWW...', 'hhwwwwwll', '.hsssssr.'], EC = { W: '#fbf7ec', w: '#eee7d8', s: '#cfc4ae', h: '#c4b092', l: '#b8aa94', r: '#7a3222' };
    // Outlined as the game's sprites are, or she melted into the lit stone under her.
    const eweAt = (i, j) => !!EC[(EWE[j] || '')[i]];
    EWE.forEach((row, j) => [...row].forEach((ch, i) => { if (!EC[ch]) return; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!eweAt(i + di, j + dj)) set(rc.x - 4 + i + di, ay0 - 1 + j + dj, '#2a2026'); }));
    EWE.forEach((row, j) => [...row].forEach((ch, i) => { if (EC[ch]) set(rc.x - 4 + i, ay0 - 1 + j, EC[ch]); }));
    // The candles: on the red ring, round both sides of the altar, none at its head or foot; and a fat
    // one at each far corner of the slab. Sticks baked, flames lit in `drawRite`.
    const candles = [], side = Math.floor(Q.candles / 2), span = Math.PI - 2 * Q.candleGap;
    for (let s = 0; s < 2; s++) for (let k = 0; k < (s ? Q.candles - side : side); k++) {
      const a = -Math.PI / 2 + Q.candleGap + (k + 0.5) / (s ? Q.candles - side : side) * span + s * Math.PI;
      candles.push([Math.round(rc.x + Math.cos(a) * Q.candleRing[0]), Math.round(rc.y + Math.sin(a) * Q.candleRing[1])]);
    }
    for (const [x, y] of candles) { set(x, y, '#efe6cc'); set(x, y + 1, '#b3a88f'); }
    for (const x of [ax0, ax0 + 12]) { rect(x, ay0, 1, 2, '#efe6cc'); candles.push([x, ay0, true]); }   // no glow: it washed her out
    const pen = { x: yard.x + 52, y: yard.y + 22, s: 12 };                                                                                              // the pen, empty
    for (let k = 0; k <= pen.s; k += 2) rect(pen.x + k, pen.y, 1, pen.s + 1, '#2a2024');
    rect(pen.x, pen.y, pen.s + 1, 1, '#2a2024'); rect(pen.x, pen.y + pen.s, pen.s + 1, 1, '#2a2024');
    rect(cx - 9, y0 + oh - 1, 18, 5, '#2c2430');                                                                                                         // the gate
    // The air between here and there: everything toward the sky's pale blue.
    const haze = hx('#d6e6f8');
    for (let i = 0; i < W * H; i++) if (px[i * 4 + 3]) { px[i * 4] += (haze[0] - px[i * 4]) * 0.26; px[i * 4 + 1] += (haze[1] - px[i * 4 + 1]) * 0.26; px[i * 4 + 2] += (haze[2] - px[i * 4 + 2]) * 0.26; }
    g.putImageData(img, 0, 0);
    const t = (x, y) => [x, y];
    // The rite's men as tiny sprites, a pixel of the earth each and hazed as the earth is, so they
    // sit in it: dark robes and hoods, silhouettes against the fire. The mage in the seer's violet
    // with a pale mask. Feet on the bottom row, drawn centred on the middle column.
    const hz = (col) => { const v = hx(col); return `rgb(${[0, 1, 2].map((i) => Math.round(v[i] + (haze[i] - v[i]) * 0.26)).join(',')})`; };
    const MP = { h: hz('#160e12'), r: hz('#4a1a20'), s: hz('#2e1016'), m: hz('#3e2458'), n: hz('#28163c'), k: hz('#e8dcc0') };
    const sprite = (rows) => { const s = document.createElement('canvas'); s.width = rows[0].length; s.height = rows.length; const q = s.getContext('2d');
      rows.forEach((row, y) => [...row].forEach((ch, x) => { if (MP[ch]) { q.fillStyle = MP[ch]; q.fillRect(x, y, 1, 1); } })); return s; };
    // Tall and narrow, a hood over a robe to the ground: at three pixels wide the shape is the figure.
    const men = {
      stand: sprite(['..h..', '.hhh.', '.rrs.', '.rrs.', '.rrs.', '.rrs.']),
      step: sprite(['..h..', '.hhh.', '.rrs.', '.rrs.', '.rrs.', '.r.s.']),
      bow: sprite(['.....', '..h..', '.hhh.', '.rrs.', '.rrs.', '.rrs.']),
      low: sprite(['.....', '.....', '.....', '.hhs.', 'hrrrs', '.rrrs']),
      raise: sprite(['r...r', 'r.h.r', '.rhr.', '.rrs.', '.rrs.', '.rrs.']),
      mageUp: sprite(['m...m', 'm.h.m', '.mkm.', '.mmn.', '.mmn.', '.mmn.', '.mmn.', 'mmmnn']),
      mageWide: sprite(['.....', '..h..', 'mmkmm', '.mmn.', '.mmn.', '.mmn.', '.mmn.', 'mmmnn']),
    };
    // Their light: soft, the one smooth thing (as a blast's flash is), baked once and laid additively.
    const glow = (r, col) => { const s = document.createElement('canvas'); s.width = s.height = r * 2; const q = s.getContext('2d'), gr = q.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(0.45, `rgba(${col},0.45)`); gr.addColorStop(1, `rgba(${col},0)`); q.fillStyle = gr; q.fillRect(0, 0, r * 2, r * 2); return s; };
    const rite = { x: rc.x, y: rc.y, fire, candles, men, glow: glow(Q.glowR, '255,150,60'), candleGlow: glow(Q.candleR, '255,196,110') };
    return { canvas: c, W, H, yard, pen, rite, K: 1,
      torches: [t(yard.x + 1, yard.y + 1), t(yard.x + yard.w - 3, yard.y + 1), t(yard.x + 1, yard.y + yard.h - 3), t(yard.x + yard.w - 3, yard.y + yard.h - 3), t(cx - 12, y0 + oh + 3), t(cx + 10, y0 + oh + 3)] };
  },

  // Baked ahead, one piece an idle moment, from a few seconds after the page opens: the first death
  // must not wait on a picture of heaven being painted (`art` bakes whatever this has not).
  warm() {
    const B = Heaven.baked || (Heaven.baked = {}), L = this.level();
    const jobs = [() => B.sky || (B.sky = this.bakeSky()), () => B.sea || (B.sea = this.bakeSea()), () => B.wisps || (B.wisps = this.bakeWisps()),
      () => B.earth || (B.earth = this.bakeEarth()), () => B.island || (B.island = this.bakeIsland(L))];
    const next = () => { const j = jobs.shift(); if (!j) return; try { j(); } catch (e) { /* baked on the way in instead */ }
      if (jobs.length) (typeof requestIdleCallback === 'function' ? requestIdleCallback(next, { timeout: 2000 }) : setTimeout(next, 200)); };
    (typeof requestIdleCallback === 'function' ? requestIdleCallback(next, { timeout: 2000 }) : setTimeout(next, 200));
  },
  // Everything baked, once a page (the island is laid the same every visit).
  art(L) {
    const B = Heaven.baked || (Heaven.baked = {});
    if (!B.island) B.island = this.bakeIsland(L);
    if (!B.sea) B.sea = this.bakeSea();
    if (!B.sky) B.sky = this.bakeSky();
    if (!B.wisps) B.wisps = this.bakeWisps();
    if (!B.earth) B.earth = this.bakeEarth();
    return B;
  },

  // ---------------------------------------------------------------- the frame
  draw(R, game, dt) {
    const ctx = R.ctx, cam = game.cam, H = game.heaven, L = game.level, g = game.goat, B = this.art(L), K = HEAVEN_ART.K;
    if (!H) return;
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    // the sky, in bands, over the whole picture
    ctx.drawImage(B.sky, 0, 0, R.w, R.vh);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, R.vw, R.vh); ctx.clip();
    R.worldTransform(game);
    const v = R.view(cam), x0 = cam.x - v.w / 2 - TILE, y0 = cam.y - v.h / 2 - TILE, x1 = cam.x + v.w / 2 + TILE, y1 = cam.y + v.h / 2 + TILE;
    ctx.imageSmoothingEnabled = false;
    // far clouds on it, a long way below the islands, so they slide behind them; and drifting
    {
      const k = TUNING.heaven.seaDepth, s = B.sea.width * K, ox = cam.x * (1 - k) + R.t * TUNING.heaven.seaDrift, oy = cam.y * (1 - k);
      ctx.globalAlpha = 0.9;
      for (let yy = Math.floor((y0 - oy) / s) * s + oy; yy < y1; yy += s) for (let xx = Math.floor((x0 - ox) / s) * s + ox; xx < x1; xx += s) ctx.drawImage(B.sea, Math.round(xx), Math.round(yy), s, s);
      ctx.globalAlpha = 1;
    }
    this.drawEarth(R, game, B);
    // the islands, one picture
    ctx.drawImage(B.island.canvas, 0, 0, L.W * TILE, L.H * TILE);
    ctx.imageSmoothingEnabled = smooth;
    R.drawDecals(game, cam);
    R.drawFallers(game);   // a table butted off the edge, going down
    game.fx.drawGround(R, game); game.scatter.drawGround(R);
    this.drawFloor(R, game);
    this.drawGodLight(R, game);
    // Everything standing, by where its feet are.
    const list = [{ y: L.god.y, f: () => this.drawGod(R, game) }];
    let beam = false;
    for (const p of game.props) {
      if (p.broken) continue;
      if (p.kind === 'hseat') list.push({ y: p.y, f: () => this.drawSeat(R, game, p) });
      else if (p.kind === 'hshep') list.push({ y: p.y, f: () => this.drawShepherd(R, game, p) });
      else if (p.kind === 'hmirror') list.push({ y: p.y, f: () => this.drawMirror(R, game, p) });
      else if (p.kind === 'hbell') { if (!beam) { beam = true; list.push({ y: p.y - 2, f: () => this.drawChime(R, game) }); } }
      else if (p.kind === 'table') list.push({ y: p.y, f: () => R.drawProp(p) });
    }
    if (!g.dead) list.push({ y: g.y, f: () => R.drawGoat(g, game) });
    list.sort((a, b) => a.y - b.y);
    R.shadeColor = 'rgba(70,90,150,0.26)';
    try { for (const o of list) o.f(); } finally { R.shadeColor = null; }
    R.drawPuffs(game); R.drawRings(game); R.drawParticles(game);
    game.fx.draw(R, game); game.scatter.drawAir(R);
    this.drawMotes(R, game);
    this.drawMarks(R, game);
    this.drawArrows(R, game);       // the way down, for a dawdler who never jumped
    this.drawSongLights(R, game);   // the old man's tune, the goat's turn
    this.drawPlates(R, game);
    R.drawFloatTexts(game);
    ctx.restore();
    this.drawScreen(R, game);
  },

  // The drop: the earth through it, slid by far less than the floor is, the air over it, and clouds
  // passing between.
  drawEarth(R, game, B) {
    const ctx = R.ctx, L = game.level, cam = game.cam, E = B.earth, K = E.K, k = TUNING.heaven.earthDepth, t = R.t;
    const px0 = 34 * TILE, py0 = 20 * TILE, px1 = 56 * TILE, py1 = L.H * TILE;
    ctx.save(); ctx.beginPath(); ctx.rect(px0, py0, px1 - px0, py1 - py0); ctx.clip();
    ctx.fillStyle = '#9fbde6'; ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
    // The empty pen sits in the middle of what the drop shows while he stands at its lip (the camera
    // at `ref`), and slides with the camera by all but `earthDepth` of its move, so it is far below.
    const ax = (px0 + px1) / 2, ay = py0 + 4.5 * TILE, refX = ax, refY = py0 - 0.5 * TILE;
    const ox = ax + (cam.x - refX) * (1 - k) - (E.pen.x + E.pen.s / 2) * K, oy = ay + (cam.y - refY) * (1 - k) - (E.pen.y + E.pen.s / 2) * K;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(E.canvas, Math.round(ox), Math.round(oy), E.W * K, E.H * K);
    // torches in the yard, flickering; the cult at its rite round the altar
    for (const [i, [tx, ty]] of E.torches.entries()) {
      ctx.fillStyle = Math.sin(t * (9 + i) + i * 2) > 0 ? '#ffe08a' : '#f2a233'; ctx.fillRect(Math.round(ox + tx * K), Math.round(oy + ty * K), 2 * K, 2 * K);
      ctx.fillStyle = 'rgba(242,162,51,0.25)'; ctx.fillRect(Math.round(ox + (tx - 2) * K), Math.round(oy + (ty - 2) * K), 6 * K, 6 * K);
    }
    this.drawRite(ctx, E, ox, oy, K, t);
    // a shaft of light from here down onto the empty pen: where the edge sends him
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const lx = Math.round(ox + (E.pen.x + E.pen.s / 2) * K), ly = Math.round(oy + (E.pen.y + E.pen.s / 2) * K), pulse = 0.75 + 0.25 * Math.sin(t * 1.8);
    const sh = ctx.createLinearGradient(0, py0, 0, ly);
    sh.addColorStop(0, `rgba(255,240,180,${0.05 * pulse})`); sh.addColorStop(1, `rgba(255,240,180,${0.3 * pulse})`);
    ctx.fillStyle = sh; ctx.beginPath(); ctx.moveTo(lx - 34, py0); ctx.lineTo(lx + 34, py0); ctx.lineTo(lx + 11, ly); ctx.lineTo(lx - 11, ly); ctx.fill();
    const gl = ctx.createRadialGradient(lx, ly, 0, lx, ly, 30); gl.addColorStop(0, `rgba(255,236,170,${0.45 * pulse})`); gl.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = gl; ctx.fillRect(lx - 30, ly - 30, 60, 60);
    ctx.restore();
    // clouds between here and there, on a layer of their own (nearer than the ground), drifting
    const ck = TUNING.heaven.wispDepth, span = (px1 - px0) + 400;
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 7; i++) {
      const img = B.wisps[i % B.wisps.length], s = HEAVEN_ART.K;
      const wx = px0 - 200 + (((i * 263 + t * (6 + (i % 3) * 3)) % span) + span) % span + (cam.x - (px0 + px1) / 2) * (1 - ck) * 0.5;
      const wy = py0 + 40 + ((i * 149) % 360) + (cam.y - py0) * (1 - ck) * 0.5;
      ctx.drawImage(img, Math.round(wx - img.width * s / 2), Math.round(wy - img.height * s / 2), img.width * s, img.height * s);
    }
    ctx.globalAlpha = 1;
    // the drop's top: the air thickening toward the lip, so the ground reads as far below it
    const fog = ctx.createLinearGradient(0, py0, 0, py0 + 64);
    fog.addColorStop(0, 'rgba(206,226,248,0.6)'); fog.addColorStop(1, 'rgba(206,226,248,0)');
    ctx.fillStyle = fog; ctx.fillRect(px0, py0, px1 - px0, 64);
    ctx.restore();
  },
  // The rite, live, over the baked altar (`TUNING.heaven.ritual`): the light first, laid on the
  // ground under everyone; then the flames; then the men round the ring and the mage at the altar's
  // head, by their feet. All of it steps by whole earth pixels and whole frames, the flicker is a
  // roll per frame, never a size eased per frame, and nothing is repainted: a dozen small draws.
  drawRite(ctx, E, ox, oy, K, t) {
    const Q = TUNING.heaven.ritual, R = E.rite, S = R.men, at = (x, y) => [Math.round(ox + x * K), Math.round(oy + y * K)];
    const put = (img, x, y) => { const [X, Y] = at(x - (img.width >> 1), y - img.height + 1); ctx.drawImage(img, X, Y, img.width * K, img.height * K); };
    const hash = CombatFX.hash, ff = Math.floor(t * Q.flickerFps), cf = t * Q.candleFps;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Q.glow[0] + Q.glow[1] * hash(ff, 1, 41);
    put(R.glow, R.fire.x, R.fire.y - 3 + Q.glowR);
    R.candles.forEach(([x, y, dim], j) => { if (dim) return; ctx.globalAlpha =Q.candleGlow * (0.7 + 0.3 * hash(j, Math.floor(cf + j * 0.37), 43)); put(R.candleGlow, x, y - 1 + Q.candleR); });
    ctx.restore();
    // candle flames: a cell, and a tip over it most frames, leaning now and then
    R.candles.forEach(([x, y], j) => {
      const f = Math.floor(cf + j * 0.37), h = hash(j, f, 43), l = hash(j, f, 47);
      ctx.fillStyle = h < 0.3 ? '#f2a233' : '#ffe08a'; ctx.fillRect(...at(x, y - 1), K, K);
      if (h > 0.3) { ctx.fillStyle = h > 0.8 ? '#fff8e2' : '#ffe08a'; ctx.fillRect(...at(x + (l < 0.15 ? -1 : l > 0.85 ? 1 : 0), y - 2), K, K); }
    });
    // the fire: the game's own flame, the size a brazier's is in the room below, a pixel of earth a texel
    const F = CombatFX.flameFrames(Q.fireSize, false), fi = Math.floor(t * TUNING.effects.fireFps) % F.frames.length;
    put(F.frames[fi], R.fire.x, R.fire.y);
    // The men: they walk the ring `walk` s, stop and bow round it one after another, raise their arms
    // together and sway; then walk on. Where each stands is the ground walked so far, so the ring
    // never jumps between rounds.
    const cyc = Q.walk + Q.bow + Q.raise, n = Math.floor(t / cyc), u = t - n * cyc, walked = n * Q.walk + Math.min(u, Q.walk);
    const list = [];
    for (let i = 0; i < Q.men; i++) {
      const a = -Math.PI / 2 + (i + 0.5) / Q.men * Math.PI * 2 + walked * Q.pace;
      let x = R.x + Math.cos(a) * Q.ring[0], y = R.y + Math.sin(a) * Q.ring[1], img;
      if (u < Q.walk) img = (Math.floor(t * Q.step + i * 0.5) & 1) ? S.step : S.stand;
      else if (u < Q.walk + Q.bow) {
        const v = u - Q.walk - i * Q.wave;
        img = v < 0 || v > Q.bowFor ? S.stand : v < 0.3 || v > Q.bowFor - 0.3 ? S.bow : S.low;
      } else { img = S.raise; x += Math.round(Math.sin((t * Q.sway + i * 0.25) * Math.PI * 2)); }
      list.push({ img, x: Math.round(x), y: Math.round(y) });
    }
    const mage = u < Q.walk ? (Math.floor(t / Q.mageBeat) & 1 ? S.mageUp : S.mageWide) : u < Q.walk + Q.bow ? S.mageWide : S.mageUp;
    list.push({ img: mage, x: R.x, y: R.y - Q.mageAt });
    list.sort((p, q) => p.y - q.y);
    for (const p of list) put(p.img, p.x, p.y);
  },
  // A soft blob of cloud as cells: stacked squares, no curve.
  puff(ctx, x, y, r, col, K) {
    ctx.fillStyle = col;
    for (let j = -r; j <= r; j += K) { const w = Math.round(Math.sqrt(Math.max(0, r * r - j * j)) * 1.6 / K) * K; ctx.fillRect(x - w, y + j * 0.55, w * 2, K); }
  },

  // On the floor: the pool of light he came up in, the words by the edge, the seats' names.
  drawFloor(R, game) {
    const ctx = R.ctx, L = game.level, H = game.heaven, t = R.t, P = L.pool;
    // the pool: rings of cells in gold and white, turning
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, 60);
    gl.addColorStop(0, `rgba(255,236,170,${0.32 + 0.08 * Math.sin(t * 2)})`); gl.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = gl; ctx.fillRect(P.x - 60, P.y - 60, 120, 120); ctx.restore();
    for (let k = 0; k < 3; k++) CombatFX.pixelRing(ctx, P.x, P.y, 22 + k * 12 + Math.sin(t * 1.5 + k) * 2, 2, k === 1 ? 'rgba(255,233,160,0.55)' : 'rgba(255,255,255,0.45)');
    // the gold grass, swaying, and the ring of a graze under way
    for (const q of L.tufts) {
      if (q.eaten) continue;
      const name = q.big ? 'grass-gold-big' : 'grass-gold', S = HEAVEN_PIXELS.sprites[name];
      const k = 1.3, sway = Math.round(Math.sin(t * 1.7 + q.x * 0.05) * 1);
      ctx.save(); ctx.translate(q.x, q.y); ctx.scale(1, 1 / TILT);
      R.shadow(0, 2, S.w * k * 0.32, 3);
      HEAVEN_PIXELS.draw(ctx, name, -S.w * k / 2 + sway, 4 - S.h * k, k);
      ctx.restore();
      if (q.graze > 0) CombatFX.pixelRing(ctx, q.x, q.y, 16, 2, 'rgba(247,215,116,0.35)');
      if (q.graze > 0) { ctx.strokeStyle = 'rgba(247,215,116,0.9)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(q.x, q.y, 16, -Math.PI / 2, -Math.PI / 2 + clamp(q.graze / TUNING.heaven.graze.time, 0, 1) * Math.PI * 2); ctx.stroke(); }
    }
    // (THE EDGE and its line were lettered by the lip until 5 Oct 2026, "write nothing there": the
    // arrows a dawdler gets, `drawArrows`, say it instead. THE SEATS OF THE SAVED went 29 Sep 2026.)
  },

  // Behind the god: his light, in rays that turn slowly, and a glow on the floor at his feet.
  drawGodLight(R, game) {
    const ctx = R.ctx, L = game.level, t = R.t, x = L.god.x, y = L.god.y - 70;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const n = 9, reach = 420;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + t * 0.045, wA = 0.035 + 0.015 * Math.sin(t * 0.7 + i * 1.7);
      const gl = ctx.createRadialGradient(x, y, 30, x, y, reach);
      const al = 0.07 + 0.04 * Math.sin(t * 0.9 + i);
      gl.addColorStop(0, `rgba(255,236,170,${al})`); gl.addColorStop(1, 'rgba(255,236,170,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a - wA) * reach, y + Math.sin(a - wA) * reach * TILT); ctx.lineTo(x + Math.cos(a + wA) * reach, y + Math.sin(a + wA) * reach * TILT); ctx.closePath(); ctx.fill();
    }
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 170);
    glow.addColorStop(0, 'rgba(255,232,160,0.32)'); glow.addColorStop(0.5, 'rgba(255,226,150,0.1)'); glow.addColorStop(1, 'rgba(255,226,150,0)');
    ctx.fillStyle = glow; ctx.fillRect(x - 170, y - 170, 340, 340);
    ctx.restore();
  },

  // The god on his cloud: the halo behind his head, himself, the front of the billow over his knees.
  drawGod(R, game) {
    const ctx = R.ctx, L = game.level, H = game.heaven, t = R.t, k = TUNING.heaven.godTexel, S = HEAVEN_PIXELS.sprites.god;
    const x = L.god.x, foot = L.god.y + 4, w = S.w * k, h = S.h * k;
    ctx.save(); ctx.translate(x, foot); ctx.scale(1, 1 / TILT);
    const breathe = 1 + 0.012 * Math.sin(t * 1.4), top = -h * breathe - 10;
    // the halo: a ring of gold cells behind his horns, breathing light
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const hg = ctx.createRadialGradient(0, top + 26 * k, 0, 0, top + 26 * k, 70);
    hg.addColorStop(0, 'rgba(255,238,170,0.5)'); hg.addColorStop(1, 'rgba(255,238,170,0)'); ctx.fillStyle = hg; ctx.fillRect(-70, top + 26 * k - 70, 140, 140);
    ctx.restore();
    CombatFX.pixelRing(ctx, 0, top + 24 * k, 40 + Math.sin(t * 2) * 1, 3, '#f7d774');
    CombatFX.pixelRing(ctx, 0, top + 24 * k, 36 + Math.sin(t * 2) * 1, 1, 'rgba(255,246,210,0.8)');
    const talking = H.talk && H.talk.shown < H.talk.lines[H.talk.i].length && Math.floor(t * 10) % 2 === 0;
    const name = talking ? 'god-speak' : H.godBlink < 0 ? 'god-blink' : 'god';
    ctx.save(); ctx.scale(1, breathe);
    HEAVEN_PIXELS.draw(ctx, name, -w / 2, -h - 10 / breathe, k);
    ctx.restore();
    // the billow he sits in, in front of his knees
    for (const [dx, dy, r] of [[-38, -6, 16], [-18, 0, 18], [4, 2, 19], [26, -1, 17], [44, -7, 14], [-54, -12, 11], [58, -14, 11]]) this.puff(ctx, dx, dy, r, '#ffffff', 2);
    for (const [dx, dy, r] of [[-30, 4, 12], [-6, 8, 13], [18, 7, 12], [38, 3, 10]]) this.puff(ctx, dx, dy, r, '#e3ebfb', 2);
    ctx.restore();
    // a mark that he has something new to say
    if (!H.talked && !H.talk && H.t > 0.8) {
      const b = Math.round(Math.sin(t * 4) * 2), mx = x + 30, my = (foot - h - 4) ;
      ctx.save(); ctx.translate(mx, my); ctx.scale(1, 1 / TILT);
      ctx.fillStyle = '#5a4a66'; ctx.fillRect(-4, -18 + b, 8, 14); ctx.fillRect(-4, -2 + b, 8, 6);
      ctx.fillStyle = '#ffe9a0'; ctx.fillRect(-2, -16 + b, 4, 10); ctx.fillRect(-2, 0 + b, 4, 3);
      ctx.restore();
    }
  },

  // A seat: its cloud, and on it, if it ever came out of the compound, the animal as a god, its own
  // sprite all light, with a halo; if not, nothing, and a halo waiting unlit over the empty cushion.
  drawSeat(R, game, p) {
    const ctx = R.ctx, t = R.t, k = 1.4, S = HEAVEN_PIXELS.sprites.plinth, saved = this.meta.saved[p.seat];
    ctx.save(); ctx.translate(p.x, p.y + 6); ctx.scale(1, 1 / TILT);
    R.shadow(0, 0, 20, 6);
    HEAVEN_PIXELS.draw(ctx, 'plinth', -S.w * k / 2, -S.h * k, k);
    const top = -S.h * k + 8;
    if (saved) {
      const img = this.animalGod(R, p.seat), bob = Math.round(Math.sin(t * 1.6 + p.x) * 1.5);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gl = ctx.createRadialGradient(0, top - 14, 0, 0, top - 14, 40); gl.addColorStop(0, 'rgba(255,238,170,0.4)'); gl.addColorStop(1, 'rgba(255,238,170,0)');
      ctx.fillStyle = gl; ctx.fillRect(-40, top - 54, 80, 80); ctx.restore();
      const y0 = img ? top - img.height + 10 + bob : top - 46 + bob;
      if (img) { const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(img, -img.width / 2, y0); ctx.imageSmoothingEnabled = sm; }
      // the halo over its own head, whatever height that is
      CombatFX.pixelRing(ctx, 0, y0 + (img && img.headY !== undefined ? img.headY : 30) - 8, 8, 2, '#f7d774');
    } else {
      ctx.globalAlpha = 0.35; CombatFX.pixelRing(ctx, 0, top - 22, 8, 2, '#b8b4c8'); ctx.globalAlpha = 1;
    }
    ctx.restore();
  },
  // An animal's own drawing, lit from inside and outlined in gold: baked once a kind.
  animalGod(R, kind) {
    const cache = this.gods || (this.gods = {});
    if (cache[kind] !== undefined) return cache[kind];
    // At its own size down there (30 Sep 2026: "the animal in heaven at its real size"): the horse
    // and the pig are the sprites the floor draws, unscaled, so the canvas is as big as the horse.
    const CW = 96, CH = 80;
    const c = document.createElement('canvas'); c.width = CW; c.height = CH;
    const x = c.getContext('2d'), keep = R.ctx;
    try {
      R.ctx = x; x.translate(CW / 2, CH - 12);
      if (kind === 'chicken') R.painted.character(R, { facing: Math.PI / 4 }, 'chicken', 28);
      else if (kind === 'horse') R.horseSprite(x, Math.PI / 4, false, 'idle');
      else if (kind === 'pig') R.pigSprite(x, Math.PI / 4, false, 'idle');
      else if (kind === 'rabbit' || kind === 'husky') Beast.drawMore(R, { x: 0, y: 0, kind, face: 1, bob: 0, vx: 0, vy: 0, r: TUNING.prop[kind].r });
      else {
        const pet = { x: 0, y: 0, kind, r: TUNING.prop[kind].r, vx: 12, vy: 4, bob: 0, phase: 0, tuckT: 0, honkT: 0 };
        x.scale(1, 1 / TILT);
        if (kind === 'tortoise') R.drawTortoise(pet); else if (kind === 'goose') R.drawGoose(pet); else if (kind === 'crow') R.drawCrow(pet);
      }
    } catch (e) { R.ctx = keep; return (cache[kind] = null); }
    R.ctx = keep;
    // light: its own shapes, washed toward warm white; then a rim of gold round it
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(255,244,214,0.34)'; x.fillRect(0, 0, CW, CH);
    // a rim of gold two pixels out, pale gold one pixel in: lit from inside and outlined in light
    const rim = document.createElement('canvas'); rim.width = CW; rim.height = CH;
    const r = rim.getContext('2d');
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]]) r.drawImage(c, dx, dy);
    r.globalCompositeOperation = 'source-in'; r.fillStyle = '#f7d774'; r.fillRect(0, 0, CW, CH);
    r.globalCompositeOperation = 'source-over';
    const inner = document.createElement('canvas'); inner.width = CW; inner.height = CH; const ig = inner.getContext('2d');
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ig.drawImage(c, dx, dy);
    ig.globalCompositeOperation = 'source-in'; ig.fillStyle = '#b07a22'; ig.fillRect(0, 0, CW, CH);
    r.drawImage(inner, 0, 0); r.drawImage(c, 0, 0);
    // its topmost lit row, where the halo goes
    const a = r.getImageData(0, 0, CW, CH).data; rim.headY = 0;
    for (let yy = 0, hit = false; yy < CH && !hit; yy++) for (let xx = 0; xx < CW; xx++) if (a[(yy * CW + xx) * 4 + 3] > 40) { rim.headY = yy; hit = true; break; }
    return (cache[kind] = rim);
  },

  drawShepherd(R, game, p) {
    const ctx = R.ctx, H = game.heaven, k = 1.35, t = R.t, C = H.comb;
    // his comb hand, or his crook up at a bell while he plays (`updateSong`'s `arm`)
    const Sg = H.song, arm = Sg && Sg.arm > 0 ? 2 : Sg ? 1 : C && C.stroke !== undefined ? 1 + (C.stroke % 2) : 0, name = 'shepherd-' + arm, S = HEAVEN_PIXELS.sprites[name];
    ctx.save(); ctx.translate(p.x, p.y + 8); ctx.scale(1, 1 / TILT);
    R.shadow(0, 0, 18, 6);
    this.puff(ctx, 0, -2, 12, '#f4f8ff', 2); this.puff(ctx, 0, 1, 9, '#dfe9fb', 2);   // his stool of cloud
    const sway = p.wobble > 0 ? Math.sin(t * 40) * 2 : 0, nod = Math.round(Math.sin(t * 0.8) * 0.6);
    HEAVEN_PIXELS.draw(ctx, name, -S.w * k / 2 + 3 + sway, -S.h * k + 4 + nod, k);
    ctx.restore();
  },

  // The mirror, and in its glass the goat, him turned toward you, or a flash when he has butted it.
  drawMirror(R, game, p) {
    const ctx = R.ctx, H = game.heaven, g = game.goat, k = 1.5, S = HEAVEN_PIXELS.sprites.mirror, t = R.t;
    ctx.save(); ctx.translate(p.x, p.y + 10); ctx.scale(1, 1 / TILT);
    R.shadow(0, 0, 18, 5);
    const x0 = -S.w * k / 2, y0 = -S.h * k;
    HEAVEN_PIXELS.draw(ctx, 'mirror', x0, y0, k);
    // the glass: an oval clip, the sky in it, and him if he is in front of it
    const gx = x0 + 14.5 * k, gy = y0 + 20 * k;
    ctx.save(); ctx.beginPath(); ctx.ellipse(gx, gy, 10.5 * k, 16 * k, 0, 0, Math.PI * 2); ctx.clip();
    const sky = ctx.createLinearGradient(0, gy - 16 * k, 0, gy + 16 * k);
    sky.addColorStop(0, '#cfe3f8'); sky.addColorStop(1, '#9fc4e8'); ctx.fillStyle = sky; ctx.fillRect(gx - 20 * k, gy - 20 * k, 40 * k, 40 * k);
    const dx = g.x - p.x, dy = g.y - p.y, whole = Heaven.mended();
    if (!whole) {
      // Broken (`Heaven.mended`): the glass gone dull, a shard out of it, cracks run from the blow in
      // cells of the sprite's own grid, and nobody in it.
      ctx.fillStyle = '#8fa6bf'; ctx.fillRect(gx - 20 * k, gy - 20 * k, 40 * k, 40 * k);
      ctx.fillStyle = '#4e5d70'; ctx.beginPath(); ctx.moveTo(gx + 2 * k, gy - 3 * k); ctx.lineTo(gx + 10 * k, gy - 9 * k); ctx.lineTo(gx + 11 * k, gy + 2 * k); ctx.fill();
      ctx.fillStyle = '#2e3644';
      const hit = [gx + 2 * k, gy - 3 * k];
      for (const [ex, ey] of HEAVEN_CRACKS) {
        const tx = gx + ex * k, ty = gy + ey * k, n = Math.ceil(hyp(tx - hit[0], ty - hit[1]) / k);
        for (let i = 0; i <= n; i++) ctx.fillRect(Math.round((hit[0] + (tx - hit[0]) * i / n) / k) * k, Math.round((hit[1] + (ty - hit[1]) * i / n) / k) * k, k, k);
      }
    } else if (Math.abs(dx) < 90 && dy > -10 && dy < 150) {
      ctx.save(); ctx.translate(gx - dx * 0.25, gy + 16 * k - 4); ctx.scale(0.9, 0.9);
      R.painted.character(R, { facing: -(g.facing || 0), vx: g.vx, vy: -g.vy, state: g.state }, 'sheep', 40);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.moveTo(gx - 8 * k, gy - 10 * k); ctx.lineTo(gx - 3 * k, gy - 15 * k); ctx.lineTo(gx + 1 * k, gy - 13 * k); ctx.lineTo(gx - 5 * k, gy - 7 * k); ctx.fill();
    if (whole && H.mirrorButt > 0) { ctx.fillStyle = `rgba(255,255,255,${H.mirrorButt / TUNING.heaven.mirrorFlash})`; ctx.fillRect(gx - 20 * k, gy - 20 * k, 40 * k, 40 * k); }
    ctx.restore();
    // a slow shimmer down the frame
    const sh = (t * 0.4) % 1; ctx.fillStyle = 'rgba(255,250,220,0.5)'; ctx.fillRect(Math.round(x0 + 2 * k + sh * 26 * k), Math.round(y0 + 3 * k), k, k);
    ctx.restore();
  },

  // The chime: a gold beam on two posts, five bells swinging from it (`Heaven.butt` rings one).
  drawChime(R, game) {
    const ctx = R.ctx, k = 1.35, bells = game.props.filter((p) => p.kind === 'hbell'), S = HEAVEN_PIXELS.sprites.beam;
    if (!bells.length) return;
    // A taller beam (`beam`'s 52 texels, the old one 30) stands on the same ground: its top, and the
    // bells with it, go up by the difference.
    const b0 = bells[0], x0 = b0.x - 7 * k, y0 = b0.y - 26 - (S.h - 30) * k * TILT, open = this.bellsOpen();
    game.heaven.chimeAt = { x0, y0, k };   // the old man's lights fall in this frame (`drawSongLights`)
    ctx.save(); ctx.translate(x0, y0); ctx.scale(1, 1 / TILT);
    R.shadow(S.w * k / 2, S.h * TILT, S.w * k * 0.5, 5);
    HEAVEN_PIXELS.draw(ctx, 'beam', 0, -6, k);
    for (const p of bells) {
      const n = p.note, B = HEAVEN_PIXELS.sprites['bell-' + n], hx = (p.x - x0), sw = p.swing || 0;
      ctx.save(); ctx.translate(hx, -1); ctx.rotate(sw);
      if (p.ringT > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const gl = ctx.createRadialGradient(0, 14, 0, 0, 14, 22); gl.addColorStop(0, `rgba(255,236,170,${0.6 * p.ringT / TUNING.heaven.bellGlow})`); gl.addColorStop(1, 'rgba(255,236,170,0)');
        ctx.fillStyle = gl; ctx.fillRect(-22, -8, 44, 44); ctx.restore();
      }
      // asleep (`bellsOpen`): grey and chained; waking (`updateWake`), the grey thins off the gold
      if (n >= open) HEAVEN_PIXELS.draw(ctx, 'bell-asleep-' + n, -B.w * k / 2, 0, k);
      else {
        HEAVEN_PIXELS.draw(ctx, 'bell-' + n, -B.w * k / 2, 0, k);
        if (p.waking > 0) { ctx.save(); ctx.globalAlpha *= Math.round(p.waking / 1.2 * 4) / 4; HEAVEN_PIXELS.draw(ctx, 'bell-asleep-' + n, -B.w * k / 2, 0, k); ctx.restore(); }
      }
      ctx.restore();
    }
    ctx.restore();
  },

  // Light going up: gold and white cells rising round the god and the pool, slowly, forever.
  drawMotes(R, game) {
    const ctx = R.ctx, L = game.level, t = R.t;
    for (let i = 0; i < 46; i++) {
      const h = farHash(i * 3 + 1, 7), h2 = farHash(i, 13), src = i % 3 ? L.god : L.pool;
      const life = 5 + h * 4, u = ((t + h2 * life) % life) / life;
      const x = src.x + (h - 0.5) * 260 + Math.sin(t * 0.8 + i) * 8, y = src.y - u * 170 + (h2 - 0.5) * 60;
      ctx.globalAlpha = Math.sin(u * Math.PI) * 0.8;
      ctx.fillStyle = i % 4 ? '#fff6d2' : '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y), i % 5 ? 2 : 3, i % 5 ? 2 : 3);
    }
    ctx.globalAlpha = 1;
  },

  // A question mark in cells over everything up here he has never tried (`fresh`): the god, the old
  // man, the mirror, a filled seat, the bells, the tables. Gone from a thing the first time it is
  // tried, and over whatever GRAB would answer now the prompt says it instead.
  drawMarks(R, game) {
    const H = game.heaven, L = game.level, M = TUNING.heaven.marks;
    if (H.talk || H.panel || H.comb || H.jump) return;
    const at = [];
    if (this.fresh('god') && !(H.near && H.near.kind === 'god')) at.push([L.god.x, L.god.y - M.lift.god]);
    const bells = [];
    for (const p of game.props) {
      if (p.broken) continue;
      if (H.near && H.near.thing === p) continue;
      if (p.kind === 'hshep' && this.fresh('shepherd') && !H.song) at.push([p.x, p.y - M.lift.shepherd]);
      // and again over the broken glass once his twenty are in: it is the goat who mends it (`interact`)
      else if (p.kind === 'hmirror' && (this.fresh('mirror') || (this.mendReady() && !this.mended()))) at.push([p.x, p.y - M.lift.mirror]);
      else if (p.kind === 'hseat' && this.meta.saved[p.seat] && this.fresh('seat:' + p.seat)) at.push([p.x, p.y - (p.seat === 'horse' ? M.lift.horse : M.lift.seat)]);
      else if (p.kind === 'table' && this.fresh('table')) at.push([p.x, p.y - M.lift.table]);
      else if (p.kind === 'hbell') bells.push(p);
    }
    if (bells.length && this.fresh('bells')) at.push([bells.reduce((s, b) => s + b.x, 0) / bells.length, Math.min(...bells.map((b) => b.y)) - M.lift.bells]);
    if (!at.length) return;
    const ctx = R.ctx, c = M.cell, G = M.glyph, w = G[0].length * c, h = G.length * c;
    ctx.save(); ctx.scale(1, 1 / TILT);
    at.forEach(([x, y], i) => {
      const ox = Math.round(x - w / 2), oy = Math.round(y * TILT - h + Math.sin(R.t * M.bob.rate + i * 1.7) * M.bob.amp);
      // a plum rim a cell round every cell, then the gold, lit along its top cells
      ctx.fillStyle = M.rim;
      for (let r = 0; r < G.length; r++) for (let q = 0; q < G[r].length; q++) if (G[r][q] === '#') ctx.fillRect(ox + (q - 1) * c, oy + (r - 1) * c, c * 3, c * 3);
      for (let r = 0; r < G.length; r++) for (let q = 0; q < G[r].length; q++) if (G[r][q] === '#') {
        ctx.fillStyle = r === 0 || (r > 0 && G[r - 1][q] !== '#') ? M.lit : M.fill;
        ctx.fillRect(ox + q * c, oy + r * c, c, c);
      }
    });
    ctx.restore();
  },

  // What is said over a head: the god's line over him, the shepherd's, a seat's. A plate of the
  // heaven's plum under warm white words, kept on the picture (`keepInView`).
  drawPlates(R, game) {
    const ctx = R.ctx, H = game.heaven, L = game.level;
    const plates = H.plates.slice();
    if (H.plate && !H.talk) plates.push({ x: L.god.x, y: L.god.y - 118, text: H.plate.text, life: H.plate.life, god: true });
    // Never one word over another (5 Oct 2026, "any hover text must always be readable"): a plate that
    // would lie on one already laid this frame steps up above it, and where each lands on the screen is
    // kept (`plateRects`) so the GRAB prompt can step clear of them too (`drawPrompt`).
    const placed = []; H.plateRects = [];
    if (!plates.length) return;
    ctx.save(); ctx.scale(1, 1 / TILT); ctx.textAlign = 'center';
    const m0 = xform(ctx), M = { a: m0.a, b: m0.b, c: m0.c, d: m0.d, e: m0.e, f: m0.f };
    for (const p of plates) {
      if (p.heart) {
        const y = (p.y + (p.vy || 0) * (0.9 - p.life)) * TILT;
        ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = '#ff9db0';
        for (const [i, row] of HEART_GLYPH.entries()) for (let q = 0; q < row.length; q++) if (row[q] === '#') ctx.fillRect(Math.round(p.x - 7 + q * 2), Math.round(y - 12 + i * 2), 2, 2);
        continue;
      }
      ctx.font = FONT_PICK.font('say', p.god ? 15 : 13);
      const lines = this.wrap(ctx, String(p.text).replace(/\s*\|\s*/g, ' '), p.god ? 250 : 200), lh = p.god ? 18 : 16;
      const w = Math.max(...lines.map((l) => textW(ctx, l))) + 16, h = lines.length * lh + 8;
      const box = R.keepInView(p.x - w / 2, p.y * TILT - h, w, h, p.x, p.y * TILT);
      for (let pass = 0; pass < 8; pass++) {
        const hit = placed.find((q) => box.x < q.x + q.w && box.x + w > q.x && box.y < q.y + q.h && box.y + h > q.y);
        if (!hit) break; box.y = hit.y - h - 3;
      }
      placed.push({ x: box.x, y: box.y, w, h });
      H.plateRects.push({ x: M.a * box.x + M.c * box.y + M.e, y: M.b * box.x + M.d * box.y + M.f, w: w * M.a, h: h * M.d });
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = 'rgba(58,44,78,0.84)'; ctx.fillRect(Math.round(box.x), Math.round(box.y), Math.round(w), Math.round(h));
      ctx.fillStyle = p.god ? '#f7d774' : 'rgba(255,246,210,0.6)'; ctx.fillRect(Math.round(box.x), Math.round(box.y), Math.round(w), 2);
      ctx.fillStyle = p.god ? '#fff4c2' : '#f4efe2';
      lines.forEach((l, i) => ctx.fillText(l, box.x + w / 2, box.y + 4 + (i + 1) * lh - 4));
    }
    ctx.globalAlpha = 1; ctx.restore();
  },
  wrap(ctx, text, maxW) {
    const out = []; let line = '';
    for (const word of String(text).split(' ')) { const t2 = line ? line + ' ' + word : word; if (textW(ctx, t2) > maxW && line) { out.push(line); line = word; } else line = t2; }
    if (line) out.push(line); return out;
  },
});

Object.assign(Heaven, {
  // ---------------------------------------------------------------- over the picture
  drawScreen(R, game) {
    const ctx = R.ctx, H = game.heaven, A = TUNING.heaven.arrive, s = R.ts, W = R.vw, Hh = R.vh;
    // a warm light from above, and the corners going gold
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const top = ctx.createLinearGradient(0, 0, 0, Hh * 0.5); top.addColorStop(0, 'rgba(255,246,214,0.1)'); top.addColorStop(1, 'rgba(255,246,214,0)');
    ctx.fillStyle = top; ctx.fillRect(0, 0, W, Hh * 0.5); ctx.restore();
    const vg = ctx.createRadialGradient(W / 2, Hh / 2, Math.min(W, Hh) * 0.45, W / 2, Hh / 2, Math.max(W, Hh) * 0.75);
    vg.addColorStop(0, 'rgba(210,180,120,0)'); vg.addColorStop(1, 'rgba(150,120,90,0.22)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, Hh);
    // the prompt over whatever GRAB would answer
    if (!H.talk && !H.panel && !H.comb && !H.jump && H.near) this.drawPrompt(R, game, H.near);
    // arriving: out of white, and the name of the place, Hades-fashion, over the top of it
    if (H.t < A.flash) { ctx.fillStyle = `rgba(255,252,240,${1 - H.t / A.flash})`; ctx.fillRect(0, 0, W, Hh); }
    if (H.t < A.title) {
      const k = H.t < 0.5 ? H.t / 0.5 : H.t > A.title - 0.8 ? (A.title - H.t) / 0.8 : 1;
      ctx.save(); ctx.globalAlpha = clamp(k, 0, 1); ctx.textAlign = 'center';
      const y = Hh * 0.2;
      ctx.font = `700 ${34 * s}px ${FONT_SC}`; ctx.fillStyle = 'rgba(90,70,110,0.35)'; ctx.fillText('THE PASTURE ABOVE', W / 2 + 2 * s, y + 2 * s);
      ctx.fillStyle = '#b07a22'; ctx.fillText('THE PASTURE ABOVE', W / 2, y);
      const lw = Math.min(W * 0.36, 240 * s); ctx.fillStyle = '#e0ac3e';
      ctx.fillRect(W / 2 - lw, y + 12 * s, lw * 2, 2 * s); ctx.fillRect(W / 2 - 4 * s, y + 9 * s, 8 * s, 8 * s);
      ctx.font = `${14 * s}px ${FONT}`; ctx.fillStyle = '#7a5a2a'; ctx.fillText('between one life and the next', W / 2, y + 34 * s);
      ctx.restore();
    }
    // the sacrifices of the last life, counted into the heap
    if (H.tally > 0 && H.tallyT < A.tallyAfter + A.tallyTime + 1.2 && H.tallyT > A.tallyAfter) {
      const k = clamp((H.tallyT - A.tallyAfter) / A.tallyTime, 0, 1), fade = clamp(A.tallyAfter + A.tallyTime + 1.2 - H.tallyT, 0, 1);
      ctx.save(); ctx.globalAlpha = fade; ctx.textAlign = 'center'; ctx.font = `700 ${18 * s}px ${FONT_SC}`;
      ctx.fillStyle = '#b07a22'; ctx.fillText(`+${H.tally} ${H.tally === 1 ? 'SACRIFICE' : 'SACRIFICES'} FOR THE GOD`, W / 2, Hh * 0.2 + 60 * s);
      ctx.restore();
    }
    if (H.talk) this.drawTalk(R, game);
    if (H.panel) this.drawMirrorPanel(R, game);
    if (H.jump) { const k = clamp((H.jump.t - TUNING.heaven.jump.time * (1 - TUNING.heaven.jump.fade)) / (TUNING.heaven.jump.time * TUNING.heaven.jump.fade), 0, 1); ctx.fillStyle = `rgba(255,252,240,${k})`; ctx.fillRect(0, 0, W, Hh); }
  },

  // The key and the word over a thing GRAB answers: `[RMB] TALK`, `GRAB · BE COMBED` on a phone.
  drawPrompt(R, game, n) {
    const ctx = R.ctx, s = R.ts, cam = game.cam, z = cam.zoom;
    const word = { god: 'TALK', shepherd: 'BE COMBED', mirror: this.mended() ? 'LOOK INTO IT' : this.mendReady() ? 'MEND IT' : 'LOOK AT IT', seat: 'LISTEN' }[n.kind];
    const lift = { god: 150, shepherd: 70, mirror: 90, seat: 80 }[n.kind];
    const x = R.vcx + (n.x - cam.x) * z, y = R.vcy + (n.y - cam.y) * z * TILT - lift * z;
    const key = game.touch && game.touch.active ? 'GRAB' : keysOf(game).grab;
    ctx.save(); ctx.font = `700 ${12 * s}px ${FONT_SC}`; ctx.textAlign = 'left';
    const kw = textW(ctx, key) + 10 * s, ww = textW(ctx, word), w = kw + ww + 18 * s, h = 22 * s;
    const bx = Math.round(clamp(x - w / 2, 8, R.vw - w - 8));
    let by = Math.round(clamp(y - h, 8, R.vh - h - 8));
    // Stacked with whatever is said over the same thing (`plateRects`), never on top of it: above the
    // plate, or under it where above would leave the screen.
    const rects = (game.heaven && game.heaven.plateRects) || [], gap = 4 * s;
    for (let pass = 0; pass < 8; pass++) {
      const hit = rects.find((q) => bx < q.x + q.w && bx + w > q.x && by < q.y + q.h && by + h > q.y);
      if (!hit) break;
      by = hit.y - h - gap >= 8 ? Math.round(hit.y - h - gap) : Math.round(hit.y + hit.h + gap);
    }
    ctx.fillStyle = 'rgba(58,44,78,0.86)'; ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = '#f7d774'; ctx.fillRect(bx, by, w, 2 * s);
    ctx.strokeStyle = 'rgba(255,244,194,0.8)'; ctx.lineWidth = Math.max(1, s); ctx.strokeRect(bx + 5 * s, by + 4 * s, kw, h - 8 * s);
    ctx.fillStyle = '#fff4c2'; ctx.fillText(key, bx + 10 * s, by + 15 * s); ctx.fillText(word, bx + kw + 12 * s, by + 15 * s);
    ctx.restore();
  },

  // The god speaking, Hades-fashion: the picture dims and goes gold at the edges, he comes in on the
  // left in his own light, big, and his words type out in a box across the bottom under his name.
  drawTalk(R, game) {
    const ctx = R.ctx, H = game.heaven, K = H.talk, s = R.ts, W = R.vw, Hh = R.vh, t = R.t;
    const inK = clamp(K.t / 0.35, 0, 1), outK = K.out > 0 ? clamp(K.out / TUNING.heaven.talkOut, 0, 1) : 0, vis = (1 - Math.pow(1 - inK, 3)) * (1 - outK);
    ctx.save();
    ctx.globalAlpha = vis;
    ctx.fillStyle = 'rgba(28,18,40,0.42)'; ctx.fillRect(0, 0, W, Hh);
    // his portrait: the upper part of him, big, on a turning star of light
    // Rows 0..60 of him (the horns to the collar), standing on the box's top edge, left of its middle.
    const S = HEAVEN_PIXELS.sprites.god, ph = Math.min(Hh * 0.46, 380 * s), kx = ph / 60, pw = S.w * kx;
    const boxTop = Hh - Math.max(118 * s, Hh * 0.2) - 18 * s;
    const px = Math.max(4 * s, (W - Math.min(W - 40 * s, 820 * s)) / 2 - pw * 0.25) - (1 - vis) * pw * 0.5, py = boxTop - ph + 16 * s;
    const cx = px + pw / 2, cy = py + 26 * kx;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + t * 0.12, wA = 0.09, rr = ph * 0.95;
      const gl = ctx.createRadialGradient(cx, cy, 10, cx, cy, rr); gl.addColorStop(0, 'rgba(255,238,170,0.28)'); gl.addColorStop(1, 'rgba(255,238,170,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a - wA) * rr, cy + Math.sin(a - wA) * rr); ctx.lineTo(cx + Math.cos(a + wA) * rr, cy + Math.sin(a + wA) * rr); ctx.fill();
    }
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, ph * 0.6); glow.addColorStop(0, 'rgba(255,242,196,0.55)'); glow.addColorStop(1, 'rgba(255,242,196,0)');
    ctx.fillStyle = glow; ctx.fillRect(cx - ph, cy - ph, ph * 2, ph * 2); ctx.restore();
    CombatFX.pixelRing(ctx, cx, cy - 2 * kx, 22 * kx, Math.max(2, kx * 1.4), '#f7d774');
    const typing = K.shown < K.lines[K.i].length, name = typing && Math.floor(t * 9) % 2 ? 'god-speak' : H.godBlink < 0 ? 'god-blink' : 'god';
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(HEAVEN_PIXELS.canvas(name), 0, 0, S.w * 4, 60 * 4, Math.round(px), Math.round(py), Math.round(pw), Math.round(60 * kx));
    ctx.imageSmoothingEnabled = sm;
    // the box
    // nudged right of centre, clear of his portrait, but never past the screen's right edge (an
    // upright phone, where the box is the screen's width, lost its right side and the page mark)
    const bw = Math.min(W - 40 * s, 820 * s), bh = Math.max(118 * s, Hh * 0.2), bx = Math.round(Math.min((W - bw) / 2 + Math.min(80 * s, W * 0.06), W - bw - 20 * s)), by = Math.round(Hh - bh - 18 * s + (1 - vis) * 30 * s);
    ctx.fillStyle = 'rgba(30,20,44,0.92)'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#e0ac3e'; ctx.fillRect(bx, by, bw, 3 * s); ctx.fillRect(bx, by + bh - 2 * s, bw, 2 * s);
    ctx.strokeStyle = 'rgba(247,215,116,0.45)'; ctx.lineWidth = Math.max(1, s); ctx.strokeRect(bx + 6 * s, by + 9 * s, bw - 12 * s, bh - 17 * s);
    for (const [x, y] of [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]]) { ctx.fillStyle = '#f7d774'; ctx.fillRect(Math.round(x - 4 * s), Math.round(y - 4 * s), Math.round(8 * s), Math.round(8 * s)); }
    // the name plate
    // The epithet rides on the plate: out on heaven's pale floor, gold at 11 px, it could not be read.
    const subFont = `${Math.round(Math.max(12 * R.s, 13 * s))}px ${FONT}`;
    ctx.font = subFont; const subW = textW(ctx, 'father of horns');
    ctx.font = `700 ${17 * s}px ${FONT_SC}`; const nameW = textW(ctx, 'THE GOAT ABOVE'), nw = nameW + subW + 44 * s;
    ctx.fillStyle = 'rgba(30,20,44,0.95)'; ctx.fillRect(bx + 22 * s, by - 26 * s, nw, 28 * s);
    ctx.fillStyle = '#e0ac3e'; ctx.fillRect(bx + 22 * s, by - 26 * s, nw, 2 * s);
    ctx.fillStyle = '#f7d774'; ctx.textAlign = 'left'; ctx.fillText('THE GOAT ABOVE', bx + 37 * s, by - 6 * s);
    ctx.font = subFont; ctx.fillStyle = 'rgba(247,215,116,0.72)'; ctx.fillText('father of horns', bx + 51 * s + nameW, by - 7 * s);
    // the words, typing
    const size = Math.round(19 * s); ctx.font = FONT_PICK.font('text', size);
    const full = K.lines[K.i], shown = full.slice(0, Math.floor(K.shown));
    const lines = this.wrap(ctx, full, bw - 60 * s);
    let left = shown.length, y = by + 22 * s + size;
    ctx.fillStyle = '#fff6e0';
    for (const l of lines) { if (left <= 0) break; ctx.fillText(l.slice(0, left), bx + 30 * s, y); left -= l.length + 1; y += size * 1.4; }
    if (!typing) {
      const b = Math.round(Math.sin(t * 5) * 2 * s), c = Math.max(1, Math.round(2 * s));
      ctx.fillStyle = '#f7d774';
      for (let k = 0; k < 4; k++) ctx.fillRect(Math.round(bx + bw - 34 * s + k * c), Math.round(by + bh - 26 * s + b + k * c), Math.round((8 - 2 * k) * c), c);
    }
    ctx.font = `${Math.max(12 * R.s, 10 * s)}px ${FONT}`; ctx.fillStyle = 'rgba(247,215,116,0.45)'; ctx.textAlign = 'right';
    ctx.fillText(`${K.i + 1} / ${K.lines.length}`, bx + bw - 16 * s, by + 22 * s);
    ctx.restore();
  },

  // The mirror, opened: the goat in the glass on the left, what it offers on the right, the heap of
  // sacrifices at the top, a rank bought with a click (or W/S and Space), looked away from with RMB.
  drawMirrorPanel(R, game) {
    const ctx = R.ctx, H = game.heaven, P = H.panel, s = R.ts, W = R.vw, Hh = R.vh, t = R.t, M = this.meta;
    P.t += 1 / 60; P.flashT += 1 / 60; P.shake = Math.max(0, (P.shake || 0) - 1 / 60);
    const k = clamp(P.t / 0.3, 0, 1);
    ctx.save(); ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(16,14,34,0.82)'; ctx.fillRect(0, 0, W, Hh);
    const pw = Math.min(W - 30 * s, 980 * s), ph = Math.min(Hh - 30 * s, 560 * s), x0 = (W - pw) / 2, y0 = (Hh - ph) / 2;
    ctx.fillStyle = 'rgba(34,26,52,0.95)'; ctx.fillRect(x0, y0, pw, ph);
    ctx.fillStyle = '#e0ac3e'; ctx.fillRect(x0, y0, pw, 3 * s); ctx.fillRect(x0, y0 + ph - 3 * s, pw, 3 * s);
    ctx.textAlign = 'left'; ctx.font = `700 ${28 * s}px ${FONT_SC}`; ctx.fillStyle = '#f7d774'; ctx.fillText('THE MIRROR', x0 + 26 * s, y0 + 44 * s);
    // (its subtitle, "what the sacrifices buy, for good", went on 5 Oct 2026)
    // the heap
    ctx.textAlign = 'right'; ctx.font = `700 ${24 * s}px ${FONT_SC}`; ctx.fillStyle = '#fff4c2';
    const heap = String(M.sacrifices), hw = textW(ctx, heap);
    ctx.fillText(heap, x0 + pw - 26 * s, y0 + 44 * s);
    this.skull(ctx, x0 + pw - 34 * s - hw - 20 * s, y0 + 24 * s, 2.4 * s);
    // and the souls banked beside it
    const sl = String(M.souls || 0), sx = x0 + pw - 34 * s - hw - 44 * s;
    ctx.fillStyle = '#d9ccff'; ctx.fillText(sl, sx, y0 + 44 * s);
    this.soulIcon(R, sx - textW(ctx, sl) - 12 * s, y0 + 36 * s, 20 * s);
    ctx.font = `${Math.max(12 * R.s, 11 * s)}px ${FONT}`; ctx.fillStyle = 'rgba(247,215,116,0.6)'; ctx.fillText('souls  ·  sacrifices', x0 + pw - 26 * s, y0 + 62 * s);
    // the goat in the glass
    const gw = Math.min(pw * 0.3, 260 * s), gcx = x0 + 26 * s + gw / 2, gcy = y0 + ph * 0.56;
    const S = HEAVEN_PIXELS.sprites.mirror, mk = Math.min(gw / S.w, (ph * 0.7) / S.h);
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(HEAVEN_PIXELS.canvas('mirror'), Math.round(gcx - S.w * mk / 2), Math.round(gcy - S.h * mk / 2), Math.round(S.w * mk), Math.round(S.h * mk));
    ctx.imageSmoothingEnabled = sm;
    const ex = gcx - S.w * mk / 2 + 14.5 * mk, ey = gcy - S.h * mk / 2 + 20 * mk;
    ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, 10.5 * mk, 16 * mk, 0, 0, Math.PI * 2); ctx.clip();
    const sky = ctx.createLinearGradient(0, ey - 16 * mk, 0, ey + 16 * mk); sky.addColorStop(0, '#dcebfa'); sky.addColorStop(1, '#9fc4e8');
    ctx.fillStyle = sky; ctx.fillRect(ex - 12 * mk, ey - 17 * mk, 24 * mk, 34 * mk);
    ctx.translate(ex, ey + 9 * mk); ctx.scale(mk * 0.34, mk * 0.34);
    R.painted.character(R, { facing: Math.PI / 2 + Math.sin(t * 0.7) * 0.4, state: 'idle', x: 0, vx: 0, vy: 0 }, 'sheep', 40);
    ctx.restore();
    // what it offers
    const rx = x0 + 60 * s + gw, rw = x0 + pw - 26 * s - rx, rh = Math.min(74 * s, (ph - 150 * s) / (this.shelf().length + 0.8));
    P.rects = [];
    this.shelf().forEach((u, i) => {
      const r = this.rank(u.id), max = u.costs.length, cost = u.costs[r], y = y0 + 96 * s + i * rh;
      const over = !game.touch.active && !padOn(game) && game.input.mouse && game.input.mouse.x >= rx && game.input.mouse.x <= rx + rw && game.input.mouse.y >= y && game.input.mouse.y <= y + rh - 8 * s;
      if (over && game.mouseMoved !== false) P.i = i;
      const sc = this.soulCost(u, r), sel = P.i === i, afford = cost !== undefined && M.sacrifices >= cost && (M.souls || 0) >= sc;
      // Held (`updatePanel`): the row fills from the left in whole cells and trembles harder as it fills.
      const Bu = TUNING.heaven.buy, hk = P.hold && P.hold.i === i ? clamp(P.hold.t / Bu.hold, 0, 1) : 0, cell = Math.max(2, Math.round(4 * s));
      const shake = (P.shakeRow === i && P.shake > 0 ? Math.sin(P.shake * 60) * 6 * s * P.shake : 0) + (hk ? Math.round(Math.sin(t * 70) * Bu.shake * s * hk) : 0);
      P.rects.push({ x: rx, y, w: rw, h: rh - 8 * s });
      ctx.fillStyle = sel ? 'rgba(247,215,116,0.14)' : 'rgba(255,255,255,0.03)'; ctx.fillRect(rx + shake, y, rw, rh - 8 * s);
      if (P.drain && P.drain.i === i) { P.drain.k -= 1 / 60 / 0.25; if (P.drain.k <= 0) P.drain = null; }
      const fillK = hk || (P.drain && P.drain.i === i ? P.drain.k : 0);
      if (fillK > 0) {
        ctx.fillStyle = `rgba(247,215,116,${0.16 + 0.22 * fillK})`; ctx.fillRect(rx + shake, y, Math.round(rw * fillK / cell) * cell, rh - 8 * s);
        ctx.fillStyle = '#fff4c2'; ctx.fillRect(rx + shake + Math.round(rw * fillK / cell) * cell - cell, y, cell, rh - 8 * s);   // its bright leading edge
      }
      // Bought: a glint, a slanted band of light in cells, runs across the row; the row flashes under it.
      const gl = Bu.glint;
      if (P.flash === i && P.flashT < gl) {
        const a = P.flashT / gl, rhh = rh - 8 * s, bandX = rx - rhh + (rw + rhh * 2) * a;
        ctx.fillStyle = `rgba(255,244,194,${0.45 * (1 - a)})`; ctx.fillRect(rx, y, rw, rhh);
        ctx.save(); ctx.beginPath(); ctx.rect(rx, y, rw, rhh); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (let yy = 0; yy < rhh; yy += cell) { const xx = Math.round((bandX - yy * 0.6) / cell) * cell; ctx.fillRect(xx, y + yy, cell * 3, cell); ctx.fillRect(xx + cell * 5, y + yy, cell, cell); }
        ctx.restore();
        // and sparks of cells thrown off its corners
        ctx.fillStyle = `rgba(255,244,194,${1 - a})`;
        for (let q = 0; q < 6; q++) { const ang = q / 6 * Math.PI * 2 + 0.4, d = (10 + 30 * a) * s; ctx.fillRect(Math.round(rx + rw - 30 * s + Math.cos(ang) * d), Math.round(y + rhh / 2 + Math.sin(ang) * d * 0.6), cell, cell); }
      }
      if (sel) { ctx.fillStyle = '#f7d774'; ctx.fillRect(rx + shake, y, 3 * s, rh - 8 * s); }
      ctx.textAlign = 'left'; ctx.font = `700 ${17 * s}px ${FONT_SC}`; ctx.fillStyle = r >= max ? '#f7d774' : '#fff4c2';
      ctx.fillText(u.name, rx + 16 * s + shake, y + 22 * s);
      // the ranks as pips
      for (let q = 0; q < max; q++) { ctx.fillStyle = q < r ? '#f7d774' : 'rgba(247,215,116,0.22)'; ctx.fillRect(Math.round(rx + 16 * s + q * 14 * s), Math.round(y + 30 * s), Math.round(10 * s), Math.round(5 * s)); }
      ctx.font = FONT_PICK.font('text', Math.round(13 * s)); ctx.fillStyle = 'rgba(244,239,226,0.82)';
      ctx.fillText(u.tell(u.params, Math.min(max, r + (r >= max ? 0 : 1))), rx + 16 * s + max * 14 * s + 8 * s, y + 36 * s);
      ctx.textAlign = 'right'; ctx.font = `700 ${16 * s}px ${FONT_SC}`;
      if (cost === undefined) { ctx.fillStyle = '#f7d774'; ctx.fillText('WHOLE', rx + rw - 14 * s, y + 24 * s); }
      else { ctx.fillStyle = afford ? '#fff4c2' : 'rgba(255,244,194,0.35)'; ctx.fillText(String(cost), rx + rw - 14 * s, y + 24 * s);
        const cx2 = rx + rw - 22 * s - textW(ctx, String(cost)) - 16 * s;
        this.skull(ctx, cx2, y + 8 * s, 1.8 * s, !afford);
        // a top rank's price in souls, left of the skull
        if (sc) { ctx.fillStyle = (M.souls || 0) >= sc ? '#d9ccff' : 'rgba(217,204,255,0.35)'; ctx.fillText(String(sc), cx2 - 10 * s, y + 24 * s);
          this.soulIcon(R, cx2 - 22 * s - textW(ctx, String(sc)), y + 17 * s, 16 * s, (M.souls || 0) < sc); } }
    });
    // the way out
    const cy2 = y0 + ph - 46 * s, bw2 = 170 * s, bx2 = rx + rw - bw2;
    P.rects.push({ x: bx2, y: cy2, w: bw2, h: 30 * s });
    const selC = P.i === this.shelf().length;
    ctx.fillStyle = selC ? 'rgba(247,215,116,0.2)' : 'rgba(255,255,255,0.04)'; ctx.fillRect(bx2, cy2, bw2, 30 * s);
    ctx.strokeStyle = '#e0ac3e'; ctx.lineWidth = Math.max(1, s); ctx.strokeRect(bx2, cy2, bw2, 30 * s);
    ctx.textAlign = 'center'; ctx.font = `700 ${14 * s}px ${FONT_SC}`; ctx.fillStyle = '#fff4c2'; ctx.fillText('LOOK AWAY', bx2 + bw2 / 2, cy2 + 20 * s);
    ctx.textAlign = 'left'; ctx.font = `${Math.max(12 * R.s, 11 * s)}px ${FONT}`; ctx.fillStyle = 'rgba(247,215,116,0.5)';
    ctx.fillText(game.touch.active ? 'hold a row to buy it' : padOn(game) ? 'hold A to buy  ·  B looks away' : 'hold click or SPACE to buy  ·  RIGHT M. CLICK or ESC looks away', rx, cy2 + 20 * s);
    ctx.restore();
  },
  // The corrupted soul as a counter's mark: the wisp's own pixel body, `w` px wide, centred at (x, y).
  soulIcon(R, x, y, w, dim) {
    const ctx = R.ctx; if (!R.painted.ready) return;
    ctx.save(); if (dim) ctx.globalAlpha *= 0.4; ctx.translate(Math.round(x), Math.round(y)); R.painted.soulWispBody(ctx, w); ctx.restore();
  },
  // The gold skull a sacrifice is counted in, `c` px a texel with its top-left at (x, y).
  skull(ctx, x, y, c, dim) {
    const g = HEAVEN_PIXELS.sprites.skull, sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    if (dim) ctx.globalAlpha *= 0.4;
    ctx.drawImage(HEAVEN_PIXELS.canvas('skull'), Math.round(x), Math.round(y), Math.round(g.w * c), Math.round(g.h * c));
    if (dim) ctx.globalAlpha /= 0.4;
    ctx.imageSmoothingEnabled = sm;
  },

  // The corner up here: the heap and the souls where the play HUD keeps them, top right
  // (`Renderer.drawPurse`; 29 Sep 2026, "the resources on the right, as they were in the game"), and
  // on the left, small, the floor the edge will put him back at.
  drawHud(R, game) {
    const ctx = R.ctx, s = R.hs, H = game.heaven, M = this.meta; if (!M) return;
    const A = TUNING.heaven.arrive, counting = H && H.tally > 0 && H.tallyT > A.tallyAfter && H.tallyT < A.tallyAfter + A.tallyTime;
    const shown = counting ? M.sacrifices - Math.round(H.tally * (1 - clamp((H.tallyT - A.tallyAfter) / A.tallyTime, 0, 1))) : M.sacrifices;
    // The mirror, open, shows the heap and the souls itself: the purse is not laid twice (5 Oct 2026).
    if (!(H && H.panel)) {
    // on a dark plate: the purse's pale figures are drawn for the dark of a floor, not a sky
    ctx.save(); ctx.font = `700 ${19 * s}px ${FONT}`;
    // as wide as what `drawPurse` lays on it: the heap and its skull only once the god has given the gathering
    const heap = Heaven.gifted() || M.sacrifices > 0;
    const soulsW = textW(ctx, String(M.souls || 0));
    let pw = soulsW + 40 * s + (heap ? textW(ctx, String(shown)) + HEAVEN_PIXELS.sprites.skull.w * 1.9 * s + 22 * s : 0), ph = 28 * s;
    // and what the god is counting toward under the heap (his twenty, then two hundred), which on
    // heaven's pale sky could not be read off the plate
    if (Heaven.goal()) {
      const q = Heaven.goal();
      ctx.font = `700 ${Math.max(12 * R.s, 12 * s)}px ${FONT_SC}`;
      pw = Math.max(pw, textW(ctx, `FOR THE GOD ${q} / ${q}`) + soulsW + 44 * s); ph = 42 * s;
    }
    ctx.fillStyle = 'rgba(58,44,78,0.82)'; ctx.fillRect(R.w - 16 * s - pw, 8 * s, pw + 10 * s, ph);
    ctx.fillStyle = '#e0ac3e'; ctx.fillRect(R.w - 16 * s - pw, 8 * s, pw + 10 * s, 2 * s);
    ctx.restore();
    R.drawPurse(game, R.w - 16 * s, 12 * s, s, shown);
    }
    ctx.save(); ctx.textAlign = 'left';
    const where = H && H.floor ? 'BACK TO ' + H.floor : '';
    if (where) {
      ctx.font = `700 ${12 * s}px ${FONT_SC}`;
      ctx.fillStyle = 'rgba(58,44,78,0.5)'; ctx.fillText(where, 17 * s, 27 * s);
      ctx.fillStyle = 'rgba(58,44,78,0.9)'; ctx.fillText(where, 16 * s, 26 * s);
    }
    ctx.font = `${Math.max(12 * R.s, 9.5 * s)}px ${FONT}`; ctx.fillStyle = 'rgba(58,44,78,0.45)'; ctx.fillText(`v${BUILD}`, 14 * s, R.h - 12 * s);
    ctx.restore();
  },
});

// ================================================================ the bells, the old man's tune, the hold
// (5 Oct 2026 playtest.) The belfry starts with one bell awake (`bellsOpen`); every floor won below
// wakes another. With all eight awake the blind shepherd plays his tune and hands it to the goat:
// lights fall onto the bells and a butt on the beat lands (`songHit`); then the bells ring it on alone.
// Pillar 1 holds: the horns ring the bells, as they always did.
Object.assign(Heaven, {
  // A bell rung, by the horns, the old man's crook or by itself: it swings, glows and sounds.
  strike(game, p, dir, vol) {
    const T0 = TUNING.heaven;
    p.swing = dir * T0.bellSwing; p.ringT = T0.bellGlow;
    game.audio.sfxChime(T0.bells[p.note], vol === undefined ? 1 : vol);
    game.particles(p.x, p.y - 18, 6, PALETTE.fireHi, 120);
  },
  bells(game) { return game.props.filter((p) => p.kind === 'hbell').sort((a, b) => a.note - b.note); },
  // The bells woken since the last visit, shown waking: the grey flakes off (`drawChime`), they ring.
  updateWake(game, dt) {
    const H = game.heaven, W = H.wake;
    for (const p of game.props) if (p.kind === 'hbell' && p.waking > 0) p.waking = Math.max(0, p.waking - dt);
    if (!W || (W.at -= dt) > 0) return;
    H.wake = null;
    const bells = this.bells(game);
    for (const p of bells) if (p.note >= W.from && p.note < W.to) {
      p.waking = 1.2; this.strike(game, p, 1, 0.8);
      game.ring(p.x, p.y + 6, 1.6 * TILE, '#fff4c2'); game.particles(p.x, p.y - 10, 16, '#fff4c2', 160);
    }
    const b = bells[W.to - 1]; if (b) game.floatText(b.x, b.y - 46, W.to - W.from > 1 ? 'BELLS WAKE' : 'A BELL WAKES', '#fff4c2');
    const shep = game.props.find((q) => q.kind === 'hshep'), K = SHEPHERD_TALK.woke;
    if (shep) H.plates.push({ x: shep.x, y: shep.y - 52, text: K[Math.floor(Math.random() * K.length)], life: TUNING.heaven.plate });
  },

  // He walks to the beam and plays (`again`: butted for it once the first time is done).
  startSong(game, again) {
    const H = game.heaven, shep = game.props.find((q) => q.kind === 'hshep'), bells = this.bells(game);
    if (!shep || H.song || !bells.length) return;
    if (H.comb) this.endComb(game);
    shep.home = shep.home || { x: shep.x, y: shep.y };
    const b0 = bells[0];
    H.song = { phase: 'walk', t: 0, shep, spot: { x: b0.x - 46, y: b0.y + 40 }, under: b0.y + 30, i: 0, marks: null, hits: 0, arm: 0 };
    H.plates.push({ x: shep.x, y: shep.y - 52, text: again ? SHEPHERD_TALK.song.again : SHEPHERD_TALK.song.come, life: TUNING.heaven.plate });
  },
  updateSong(game, dt) {
    const H = game.heaven, T0 = TUNING.heaven, B = T0.bellSong, S = H.song;
    if (!S) { if (H.songAt !== undefined && !H.wake && (H.songAt -= dt) <= 0) { H.songAt = undefined; this.startSong(game); } return; }
    const sh = S.shep, spb = 60 / B.bpm, bells = this.bells(game), say = (text, k) => H.plates.push({ x: sh.x, y: sh.y - 52, text, life: T0.plate * (k || 1) });
    S.t += dt; S.arm = Math.max(0, S.arm - dt);
    const walkTo = (x, y, sp) => { const dx = x - sh.x, dy = y - sh.y, d = hyp(dx, dy); if (d < 2) return true; const st = Math.min(d, sp * dt); sh.x += dx / d * st; sh.y += dy / d * st; return false; };
    if (S.phase === 'walk') { if (walkTo(S.spot.x, S.spot.y, B.walk)) { S.phase = 'listen'; S.t = 0; say(SHEPHERD_TALK.song.listen); } return; }
    if (S.phase === 'listen') { if (S.t > 1.5) { S.phase = 'demo'; S.t = -0.6; S.i = 0; } return; }
    if (S.phase === 'demo') {
      // He shuffles along under the beam to the next note's bell and strikes it with his crook on the beat.
      const n = B.intro[S.i];
      if (!n) { if (walkTo(S.spot.x, S.spot.y, 160)) { S.phase = 'invite'; S.t = 0; say(SHEPHERD_TALK.song.you, 1.3); } return; }
      const bell = bells[n[1]];
      if (bell) walkTo(bell.x - 8, S.under, 300);
      if (S.t >= n[0] * spb) { if (bell) this.strike(game, bell, S.i % 2 ? 1 : -1, 0.9); S.arm = 0.2; S.i++; }
      return;
    }
    if (S.phase === 'invite') {
      if (S.t < 2.4) return;
      // The count-in is `count` beats of a dry tick; the lights are already falling through it.
      S.phase = 'play'; S.t = -B.count * spb; S.tick = -B.count;
      S.marks = B.intro.map(([beat, k]) => ({ t: beat * spb, bell: k, res: 0, at: 0 }));
      return;
    }
    if (S.phase === 'play') {
      if (S.t < 0 && S.t >= S.tick * spb) { game.audio.sfxClatter('clay', 0.5); S.tick++; S.arm = 0.15; }
      for (const m of S.marks) if (!m.res && S.t > m.t + B.window) {
        m.res = -1; m.at = S.t;
        const b = bells[m.bell]; if (b) game.particles(b.x, b.y - 4, 5, '#8e93a4', 60);
      }
      const last = S.marks[S.marks.length - 1];
      if (S.marks.every((m) => m.res) && S.t > last.t + 0.8) {
        const k = S.hits / S.marks.length, Q = SHEPHERD_TALK.song;
        say(k >= 0.75 ? Q.good : k >= 0.4 ? Q.fair : Q.poor, 1.4);
        game.floatText(sh.x, sh.y - 90, `${S.hits} / ${S.marks.length}`, '#fff4c2');
        S.phase = 'auto'; S.t = -1.2; S.ai = 0; S.loopN = 0;
      }
      return;
    }
    if (S.phase === 'auto') {
      // The bells ring it on alone, `auto` s of it, the old man gone back to his place.
      walkTo(sh.home.x, sh.home.y, B.walk);
      while (S.t >= 0) {
        const n = B.loop[S.ai], at = (S.loopN * B.loopBeats + n[0]) * spb;
        if (at > S.t) break;
        const bell = bells[n[1]]; if (bell) this.strike(game, bell, S.ai % 2 ? 1 : -1, 0.7);
        if (++S.ai >= B.loop.length) { S.ai = 0; S.loopN++; }
      }
      if (S.t > B.auto && S.ai === 0) {
        S.phase = 'home'; this.meta.bellSong = (this.meta.bellSong || 0) + 1; this.save();
        say(SHEPHERD_TALK.song.end);
      }
      return;
    }
    if (S.phase === 'home' && walkTo(sh.home.x, sh.home.y, B.walk)) H.song = null;
  },
  // A butt on an awake bell while the lights fall: the nearest light on that bell within the window lands.
  songHit(game, p) {
    const S = game.heaven.song, B = TUNING.heaven.bellSong;
    let best = null, bd = B.window;
    for (const m of S.marks) if (!m.res && m.bell === p.note) { const d = Math.abs(S.t - m.t); if (d <= bd) { bd = d; best = m; } }
    if (!best) return;
    best.res = 1; best.at = S.t; S.hits++;
    game.ring(p.x, p.y + 6, 26, '#fff4c2', 0.35, 2); game.particles(p.x, p.y - 14, 10, '#fff4c2', 150);
    game.floatText(p.x, p.y - 50, bd < B.window * 0.45 ? 'YES!' : 'GOOD', '#fff4c2');
  },

  // ---------------------------------------------------------------- the mirror, bought by holding
  // Whether a row can be bought now (a rank left, enough in the heap).
  canBuy(i) {
    const u = this.shelf()[i]; if (!u) return false;
    const r = this.rank(u.id), cost = u.costs[r];
    return cost !== undefined && this.meta.sacrifices >= cost && (this.meta.souls || 0) >= this.soulCost(u, r);
  },
  // A press on a row: the hold starts (`updatePanel` fills it); one that cannot buy is refused at once.
  startHold(game, i, src) {
    const P = game.heaven && game.heaven.panel; if (!P || P.hold || P.needRelease) return;
    if (!this.canBuy(i)) { this.buy(game, i); return; }
    P.hold = { i, src, t: 0, step: -1 };
  },
  // The pointer let go over the mirror (`Game`'s pointerup).
  panelRelease(game) { const P = game.heaven && game.heaven.panel; if (P) P.ptrDown = false; },
  keyHeld(game) { return game.keys.has('Space') || game.keys.has('Enter') || game.keys.has('NumpadEnter') || !!(game.pad && game.pad.active && game.pad.held(PAD_BTN.a)); },
  updatePanel(game, dt) {
    const P = game.heaven.panel, Bu = TUNING.heaven.buy, Hd = P.hold, keyHeld = this.keyHeld(game);
    if (P.needRelease && !keyHeld && !P.ptrDown) P.needRelease = false;
    if (!Hd) return;
    const held = Hd.src === 'ptr' ? P.ptrDown : keyHeld;
    // Let go early: nothing spent, the fill drains away.
    if (!held || P.i !== Hd.i) { P.hold = null; P.drain = { i: Hd.i, k: Hd.t / Bu.hold }; return; }
    Hd.t += dt;
    const k = Hd.t / Bu.hold, step = Math.floor(Hd.t / Bu.tick);
    // the tension: a chime a step up the bells every `tick`, louder as it fills
    if (step !== Hd.step) { Hd.step = step; const bl = TUNING.heaven.bells; game.audio.sfxChime(bl[Math.min(bl.length - 1, Math.floor(k * bl.length))], 0.3 + 0.5 * k); }
    if (Hd.t >= Bu.hold) { P.hold = null; P.needRelease = true; this.buy(game, Hd.i); }
  },

  // ---------------------------------------------------------------- the way down, shown
  // Until he has once walked off the edge (`meta.jumped`), dawdling up here (`arrows.after` s with
  // nothing open) brings up arrows of cells over the lip, bobbing, pointing down into the drop.
  drawArrows(R, game) {
    const H = game.heaven, A = TUNING.heaven.arrows, M = this.meta;
    const want = M && !M.jumped && this.mirrorKnown() && (H.loiter || 0) > A.after && !H.talk && !H.panel && !H.comb && !H.jump && !H.song;
    H.arrowK = clamp((H.arrowK || 0) + (want ? 1 : -1) / 60 / A.fade, 0, 1);
    if (H.arrowK <= 0) return;
    const ctx = R.ctx, c = A.cell, G = A.glyph, w = G[0].length * c, h = G.length * c, lip = 19.55 * TILE;
    ctx.save(); ctx.scale(1, 1 / TILT); ctx.globalAlpha = H.arrowK;
    for (let i = 0; i < A.n; i++) {
      const x = (37 + (i + 0.5) * 15 / A.n) * TILE, bob = Math.round(Math.sin(R.t * A.bob.rate + i * 0.9) * A.bob.amp / c) * c;
      const ox = Math.round(x - w / 2), oy = Math.round(lip * TILT - h + bob);
      ctx.fillStyle = A.rim;
      for (let r = 0; r < G.length; r++) for (let q = 0; q < G[r].length; q++) if (G[r][q] === '#') ctx.fillRect(ox + (q - 1) * c, oy + (r - 1) * c, c * 3, c * 3);
      for (let r = 0; r < G.length; r++) for (let q = 0; q < G[r].length; q++) if (G[r][q] === '#') {
        ctx.fillStyle = q === 0 || G[r][q - 1] !== '#' ? A.lit : A.fill; ctx.fillRect(ox + q * c, oy + r * c, c, c);
      }
    }
    ctx.restore();
  },

  // The lights of the old man's tune (`updateSong`), over everything, in the chime's own frame
  // (`H.chimeAt`, laid by `drawChime`): a gold drop of cells falling onto its bell, a ring of cells
  // round the bell as it arrives, white on a hit, grey and falling on through on a miss.
  drawSongLights(R, game) {
    const H = game.heaven, S = H.song, C = H.chimeAt, B = TUNING.heaven.bellSong;
    if (!S || !C || S.phase !== 'play' || !S.marks) return;
    const ctx = R.ctx, bells = this.bells(game), c = 3;
    ctx.save(); ctx.translate(C.x0, C.y0); ctx.scale(1, 1 / TILT);
    for (const m of S.marks) {
      const b = bells[m.bell]; if (!b) continue;
      const Bs = HEAVEN_PIXELS.sprites['bell-' + m.bell], hx = b.x - C.x0, cy = (Bs.h * C.k) * 0.55;
      const u = (S.t - (m.t - B.lead)) / B.lead;
      if (u < 0) continue;
      if (m.res === 1) {   // landed: a ring of cells opening out and gone
        const a = (S.t - m.at) / 0.35; if (a > 1) continue;
        ctx.globalAlpha = 1 - a; CombatFX.pixelRing(ctx, hx, cy, 8 + a * 14, 2, '#fff4c2'); continue;
      }
      const fallen = m.res === -1 ? (S.t - m.at) / 0.5 : 0; if (fallen > 1) continue;
      const y = cy - B.fall * (1 - Math.min(1, u)) + fallen * 18, near = clamp(1 - Math.abs(S.t - m.t) / B.window, 0, 1);
      ctx.globalAlpha = m.res === -1 ? 1 - fallen : Math.min(1, u * 3);
      // the target under it, brighter as the beat nears
      if (!m.res) { ctx.globalAlpha *= 0.5 + 0.5 * near; CombatFX.pixelRing(ctx, hx, cy, 9, 2, near > 0.2 ? '#fff4c2' : 'rgba(247,215,116,0.6)'); ctx.globalAlpha = Math.min(1, u * 3); }
      const col = m.res === -1 ? '#8e93a4' : near > 0.2 ? '#ffffff' : '#f7d774', X = Math.round(hx / c) * c, Y = Math.round(y / c) * c;
      ctx.fillStyle = '#3a2c4e'; ctx.fillRect(X - 2 * c, Y - 2 * c, 5 * c, 4 * c); ctx.fillRect(X - c, Y + 2 * c, 3 * c, c); ctx.fillRect(X - c, Y - 3 * c, 3 * c, c);
      ctx.fillStyle = col; ctx.fillRect(X - c, Y - 2 * c, 3 * c, 3 * c); ctx.fillRect(X, Y + c, c, c); ctx.fillRect(X, Y - 3 * c, c, c);
    }
    ctx.restore();
  },
});
